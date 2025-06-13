
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

    if (fetchError) {
      console.error('Error fetching answer:', fetchError);
      throw new Error('Failed to fetch answer data');
    }

    console.log('Evaluating answer for student:', answerData.student_name);

    // Check if OpenAI API key is available
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.error('OpenAI API key not found');
      throw new Error('OpenAI API key not configured');
    }

    // Prepare the evaluation prompt with simplified context
    const examContext = `
Exam: ${answerData.questions.exams.name}
Maximum Marks: ${answerData.questions.max_marks}

Question: ${answerData.questions.text}

Student's Answer: ${answerData.text_answer || 'No text answer provided'}
`;

    console.log('Prepared context for evaluation');

    // Prepare messages for OpenAI
    const messages = [
      {
        role: "system",
        content: `You are an AI tutor and exam evaluator. You evaluate student answers and provide constructive feedback.

**Evaluation Rules**:
1. Mark the student answer out of the total marks available.
2. Award partial credit for valid points, methods, or reasoning — even if incomplete.
3. Be fair, but not too lenient:
   - Award marks only when the student shows real understanding or meets an expected marking point.
   - Do not give marks for vague guesses, off-topic responses, or unrelated filler.
4. If an image or diagram is provided, interpret it as part of the question and use it in your evaluation.

**Feedback Style Requirements**:
- Give concise feedback that is 2–3 sentences each for positive and constructive points.
- Provide a brief model answer or key points for an ideal response.

Respond in JSON format:
{
  "score": number,
  "ideal_answer": "string - brief model answer or key points for ideal response",
  "correct_points": "string - what the student got correct",
  "incorrect_points": "string - what the student got incorrect or missed with specific improvements needed",
  "suggestions": "string - specific, actionable suggestions for improvement"
}`
      },
      {
        role: "user",
        content: examContext
      }
    ];

    // Add images if they exist
    if (answerData.questions.image_url || answerData.image_answer_url) {
      const imageContent = [];
      
      if (answerData.questions.image_url) {
        imageContent.push({
          type: "text",
          text: "Question Image:"
        });
        imageContent.push({
          type: "image_url",
          image_url: { url: answerData.questions.image_url }
        });
      }
      
      if (answerData.image_answer_url) {
        imageContent.push({
          type: "text", 
          text: "Student's Image Answer:"
        });
        imageContent.push({
          type: "image_url",
          image_url: { url: answerData.image_answer_url }
        });
      }

      if (imageContent.length > 0) {
        messages.push({
          role: "user",
          content: imageContent
        });
      }
    }

    console.log('Calling OpenAI API...');

    // Call OpenAI API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          max_tokens: 1000,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!openAIResponse.ok) {
        const errorText = await openAIResponse.text();
        console.error('OpenAI API error:', errorText);
        throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
      }

      const openAIData = await openAIResponse.json();
      console.log('OpenAI response received');

      if (!openAIData.choices || !openAIData.choices[0] || !openAIData.choices[0].message) {
        console.error('Invalid OpenAI response structure:', openAIData);
        throw new Error('Invalid response from OpenAI');
      }

      const evaluationText = openAIData.choices[0].message.content;
      console.log('Raw OpenAI response:', evaluationText);

      // Parse the JSON response from OpenAI
      let evaluation;
      try {
        evaluation = JSON.parse(evaluationText);
        console.log('Successfully parsed evaluation JSON');
      } catch (parseError) {
        console.error('Failed to parse OpenAI response as JSON:', parseError);
        console.error('Raw response was:', evaluationText);
        
        // Fallback evaluation if JSON parsing fails
        evaluation = {
          score: Math.round(answerData.questions.max_marks * 0.5),
          ideal_answer: "Unable to generate ideal answer due to evaluation error.",
          correct_points: "Evaluation completed with parsing issues.",
          incorrect_points: "Please retry evaluation for detailed feedback.",
          suggestions: "Consider submitting the answer again for proper evaluation."
        };
      }

      // Ensure score is valid and doesn't exceed max marks
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
        throw new Error('Failed to save evaluation');
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

    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('OpenAI API request timed out');
        throw new Error('Evaluation timed out - please try again');
      }
      throw fetchError;
    }

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
