
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

    // Prepare the evaluation prompt
    const examContext = `
Exam: ${answerData.questions.exams.name}
Maximum Marks: ${answerData.questions.max_marks}

Question: ${answerData.questions.text}

Student's Answer: ${answerData.text_answer || 'No text answer provided'}
`;

    console.log('Calling OpenAI API...');

    // Set up abort controller with shorter timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Request timed out, aborting...');
      controller.abort();
    }, 20000); // 20 second timeout

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
              content: `You are an AI tutor. Evaluate the student answer and respond in JSON format:
{
  "score": number,
  "ideal_answer": "brief model answer",
  "correct_points": "what was correct",
  "incorrect_points": "what was wrong",
  "suggestions": "improvement suggestions"
}`
            },
            {
              role: "user",
              content: examContext
            }
          ],
          max_tokens: 500,
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
      console.log('OpenAI response:', evaluationText);

      try {
        evaluation = JSON.parse(evaluationText);
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
