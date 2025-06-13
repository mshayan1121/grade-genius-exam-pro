
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { answerId } = await req.json();
    console.log('Starting evaluation for answer ID:', answerId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the student answer with question details
    const { data: answerData, error: fetchError } = await supabase
      .from('student_answers')
      .select(`
        *,
        questions (
          text,
          image_url,
          max_marks,
          exams (
            name
          )
        )
      `)
      .eq('id', answerId)
      .single();

    if (fetchError || !answerData) {
      console.error('Error fetching answer:', fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Answer not found', 
          details: fetchError?.message || 'Answer does not exist'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Evaluating answer for student:', answerData.student_name);

    // Check if OpenAI API key is available
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.error('OpenAI API key not found');
      
      // Create a fallback evaluation
      const fallbackEvaluation = {
        score: Math.round(answerData.questions.max_marks * 0.5),
        ideal_answer: "OpenAI API key not configured. Manual evaluation required.",
        correct_points: "Automatic evaluation unavailable.",
        incorrect_points: "Please configure OpenAI API key for AI evaluation.",
        suggestions: "Contact administrator to enable AI evaluation."
      };

      const { error: updateError } = await supabase
        .from('student_answers')
        .update({ evaluated_result: fallbackEvaluation })
        .eq('id', answerId);

      if (updateError) {
        console.error('Error updating answer with fallback:', updateError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          evaluation: fallbackEvaluation,
          message: 'Fallback evaluation completed - OpenAI API key missing'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare the comprehensive evaluation prompt
    const systemPrompt = `You are an experienced teacher and examiner. Your task is to evaluate a student's answer to an exam question fairly and constructively.

Please analyze the student's response and provide a detailed evaluation in the following JSON format:

{
  "score": number (between 0 and the maximum marks available),
  "ideal_answer": "A comprehensive model answer that demonstrates what a full-marks response should include",
  "correct_points": "Detailed analysis of what the student got right, including specific concepts, facts, or reasoning that were accurate",
  "incorrect_points": "Detailed analysis of what was wrong, missing, or could be improved, with specific explanations",
  "suggestions": "Constructive advice on how the student can improve their understanding and answer quality for similar questions in the future"
}

When scoring:
- Award full marks for complete, accurate, and well-explained answers
- Give partial credit for partially correct responses
- Consider both factual accuracy and quality of explanation
- Be fair but maintain academic standards
- Provide specific, actionable feedback`;

    const examContext = `
EXAM: ${answerData.questions.exams.name}
MAXIMUM MARKS AVAILABLE: ${answerData.questions.max_marks}

QUESTION:
${answerData.questions.text}

STUDENT'S ANSWER:
${answerData.text_answer || 'No text answer provided'}

Please evaluate this answer according to the instructions above.`;

    console.log('Calling OpenAI API with comprehensive prompt...');

    // Set up abort controller with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Request timed out, aborting...');
      controller.abort();
    }, 30000); // 30 second timeout for more complex evaluation

    let evaluation;

    try {
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: examContext
            }
          ],
          max_tokens: 800,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!openAIResponse.ok) {
        throw new Error(`OpenAI API error: ${openAIResponse.status}`);
      }

      const openAIData = await openAIResponse.json();
      
      if (!openAIData.choices?.[0]?.message?.content) {
        throw new Error('Invalid OpenAI response');
      }

      const evaluationText = openAIData.choices[0].message.content;
      console.log('OpenAI response received');
      console.log('Raw OpenAI response:', evaluationText);

      try {
        evaluation = JSON.parse(evaluationText);
        console.log('Successfully parsed evaluation JSON');
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Failed to parse evaluation');
      }

    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('OpenAI API call failed:', fetchError);
      
      // Create fallback evaluation on API failure
      evaluation = {
        score: Math.round(answerData.questions.max_marks * 0.6),
        ideal_answer: "AI evaluation failed. Manual review required.",
        correct_points: "Automatic evaluation encountered an error.",
        incorrect_points: "Please retry evaluation or review manually.",
        suggestions: "Contact support if this error persists."
      };
    }

    // Validate and constrain score
    if (typeof evaluation.score !== 'number' || evaluation.score < 0) {
      evaluation.score = 0;
    }
    evaluation.score = Math.min(evaluation.score, answerData.questions.max_marks);

    console.log('Final evaluation score:', evaluation.score);

    // Update the student answer with evaluation results
    const { error: updateError } = await supabase
      .from('student_answers')
      .update({ evaluated_result: evaluation })
      .eq('id', answerId);

    if (updateError) {
      console.error('Error updating answer:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save evaluation', 
          details: updateError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Successfully saved evaluation to database');

    return new Response(
      JSON.stringify({ 
        success: true, 
        evaluation: evaluation,
        message: 'Answer evaluated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in evaluate-answer function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Evaluation failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
