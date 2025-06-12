
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
            subject,
            board,
            qualification
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

    // Prepare the evaluation prompt
    const examContext = `
Subject: ${answerData.questions.exams.subject}
Board: ${answerData.questions.exams.board}
Qualification: ${answerData.questions.exams.qualification}
Maximum Marks: ${answerData.questions.max_marks}

Question: ${answerData.questions.text}

Student's Answer: ${answerData.text_answer || 'No text answer provided'}
`;

    // Prepare messages for OpenAI
    const messages = [
      {
        role: "system",
        content: `You are an expert examiner for ${answerData.questions.exams.subject} at ${answerData.questions.exams.qualification} level under ${answerData.questions.exams.board} board. 

Evaluate the student's answer and provide:
1. A score out of the maximum marks
2. An ideal/model answer
3. What the student got correct
4. What the student got incorrect or missed
5. Specific suggestions for improvement

Be fair, constructive, and educational in your feedback. Consider partial marks for partially correct answers.

Respond in JSON format:
{
  "score": number,
  "ideal_answer": "string",
  "correct_points": "string",
  "incorrect_points": "string", 
  "suggestions": "string"
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

      messages.push({
        role: "user",
        content: imageContent
      });
    }

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const evaluationText = openAIData.choices[0].message.content;

    console.log('Raw OpenAI response:', evaluationText);

    // Parse the JSON response from OpenAI
    let evaluation;
    try {
      evaluation = JSON.parse(evaluationText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      // Fallback evaluation if JSON parsing fails
      evaluation = {
        score: Math.round(answerData.questions.max_marks * 0.5),
        ideal_answer: "Unable to generate ideal answer due to evaluation error.",
        correct_points: "Evaluation in progress...",
        incorrect_points: "Please retry evaluation.",
        suggestions: "Please retry the evaluation for detailed feedback."
      };
    }

    // Ensure score doesn't exceed max marks
    evaluation.score = Math.min(evaluation.score, answerData.questions.max_marks);

    // Update the student answer with evaluation results
    const { error: updateError } = await supabase
      .from('student_answers')
      .update({ evaluated_result: evaluation })
      .eq('id', answerId);

    if (updateError) {
      console.error('Error updating answer:', updateError);
      throw new Error('Failed to save evaluation');
    }

    console.log('Successfully evaluated answer with score:', evaluation.score);

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
