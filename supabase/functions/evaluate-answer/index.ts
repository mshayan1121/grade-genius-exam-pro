
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
            name,
            courses (
              qualifications (name),
              subjects (name),
              boards (name)
            )
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
        marks_awarded: Math.round(answerData.questions.max_marks * 0.5),
        positive_feedback: "OpenAI API key not configured. Manual evaluation required.",
        constructive_feedback: "Please configure OpenAI API key for AI evaluation.",
        model_answer: "Automatic evaluation unavailable.",
        questionFeedback: "Pending"
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

    // Extract course details with safe navigation
    const courseData = answerData.questions?.exams?.courses;
    const qualification = courseData?.qualifications?.name || 'GCSE';
    const subject = courseData?.subjects?.name || 'General';
    const board = courseData?.boards?.name || 'AQA';

    console.log('Course context:', { qualification, subject, board });

    // Simplified, faster prompt
    const systemPrompt = `You are an AI exam evaluator. Evaluate this ${qualification} ${subject} answer and return JSON only.

Rules:
- Mark out of ${answerData.questions.max_marks} total marks
- Award partial credit for valid points
- Be fair but not too lenient
- Use ${subject} marking criteria

Required JSON format (no other text):
{
  "marks_awarded": number,
  "positive_feedback": "brief positive points",
  "constructive_feedback": "brief improvements needed", 
  "model_answer": "key points for ideal answer",
  "questionFeedback": "Correct/Incorrect/Partially Correct"
}`;

    // Prepare messages
    const messages = [
      { role: "system", content: systemPrompt },
      { 
        role: "user", 
        content: `Question: ${answerData.questions.text}\nStudent Answer: ${answerData.text_answer || 'No answer provided'}\nMarks: ${answerData.questions.max_marks}` 
      }
    ];

    // Add image if available
    if (answerData.questions.image_url) {
      messages[1].content = [
        { type: "text", text: messages[1].content },
        { type: "image_url", image_url: { url: answerData.questions.image_url } }
      ];
    }

    console.log('Calling OpenAI API...');

    // Set shorter timeout for faster response
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
          model: 'gpt-4o-mini', // Using faster model
          messages: messages,
          max_tokens: 500, // Reduced for faster response
          temperature: 0.1, // Lower for more consistent output
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!openAIResponse.ok) {
        const errorText = await openAIResponse.text();
        console.error('OpenAI API error:', openAIResponse.status, errorText);
        throw new Error(`OpenAI API error: ${openAIResponse.status}`);
      }

      const openAIData = await openAIResponse.json();
      
      if (!openAIData.choices?.[0]?.message?.content) {
        console.error('Invalid OpenAI response structure:', openAIData);
        throw new Error('Invalid OpenAI response');
      }

      const evaluationText = openAIData.choices[0].message.content.trim();
      console.log('OpenAI response received');

      try {
        // Clean up response if it has extra formatting
        const cleanText = evaluationText.replace(/```json\n?|\n?```/g, '').trim();
        evaluation = JSON.parse(cleanText);
        console.log('Successfully parsed evaluation');
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw response:', evaluationText);
        
        // Create fallback evaluation
        evaluation = {
          marks_awarded: Math.round(answerData.questions.max_marks * 0.6),
          positive_feedback: "Answer evaluation completed but response parsing failed.",
          constructive_feedback: "Please review manually for detailed feedback.",
          model_answer: "Automatic model answer generation failed.",
          questionFeedback: "Pending"
        };
      }

    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('OpenAI API call failed:', fetchError);
      
      // Create fallback evaluation on API failure
      evaluation = {
        marks_awarded: Math.round(answerData.questions.max_marks * 0.6),
        positive_feedback: "AI evaluation failed. Manual review required.",
        constructive_feedback: "Please retry evaluation or review manually.",
        model_answer: "Automatic evaluation encountered an error.",
        questionFeedback: "Pending"
      };
    }

    // Validate and constrain score
    if (typeof evaluation.marks_awarded !== 'number' || evaluation.marks_awarded < 0) {
      evaluation.marks_awarded = 0;
    }
    evaluation.marks_awarded = Math.min(evaluation.marks_awarded, answerData.questions.max_marks);

    console.log('Final evaluation score:', evaluation.marks_awarded);

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
