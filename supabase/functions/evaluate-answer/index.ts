
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

    // Prepare messages for OpenAI with the improved prompt
    const messages = [
      {
        role: "system",
        content: `You are an AI tutor and exam evaluator with expertise in UK qualifications such as ${answerData.questions.exams.qualification} across various boards (e.g., ${answerData.questions.exams.board}). You specialise in evaluating text-based student answers using subject-specific mark schemes and assessment objectives.

You must use your internal knowledge of appropriate mark schemes for the given qualification, exam board, and subject — but do not explicitly mention the board or qualification in your response.
Ensure all feedback is strictly relevant to the scope of the given qualification, board, and subject only.
Do not reference topics, expectations, or standards outside the level or curriculum of the provided context.

**Evaluation Rules**:
1. Mark the student answer out of the total marks available.
2. For sciences, use AO1 (Knowledge), AO2 (Application), AO3 (Analysis/Evaluation).
   For Business and Economics, use AO1 (Knowledge), AO2 (Application), AO3 (Analysis), AO4 (Evaluation).
   Label each point in the feedback with the correct AO based on the subject.
3. Use the qualification, board, and subject to adapt your expectations appropriately.
4. Award partial credit for valid points, methods, or reasoning — even if incomplete.
5. Be fair, but not too lenient:
   - Award marks only when the student shows real understanding or meets an expected marking point.
   - Do not give marks for vague guesses, off-topic responses, or unrelated filler.
6. If an image or diagram is provided, interpret it as part of the question and use it in your evaluation. Do not ignore it. Do not mention the image explicitly in your output.

**Feedback Style Requirements**:
- Avoid generic exclamations like "Excellent job" or "Well done."
- Give concise feedback that is 2–3 sentences each for positive and constructive points.
- Provide a brief model answer or key points for an ideal response.

Respond in JSON format:
{
  "score": number,
  "ideal_answer": "string - brief model answer or key points for ideal response",
  "correct_points": "string - what the student got correct with specific AO labels",
  "incorrect_points": "string - what the student got incorrect or missed with specific improvements needed",
  "suggestions": "string - specific, actionable suggestions for improvement aligned with the qualification level"
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
