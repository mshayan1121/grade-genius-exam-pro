
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

    // Extract course details
    const qualification = answerData.questions.exams.courses.qualifications?.name || 'GCSE';
    const subject = answerData.questions.exams.courses.subjects?.name || 'General';
    const board = answerData.questions.exams.courses.boards?.name || 'AQA';

    // Prepare the comprehensive evaluation prompt
    const systemPrompt = `You are an AI tutor and exam evaluator with expertise in UK qualifications such as ${board}, and ${qualification} across various boards (e.g., ${board}). You specialise in evaluating text-based student answers using subject-specific mark schemes and assessment objectives.

You must use your internal knowledge of appropriate mark schemes for the given qualification, exam board, and subject — but do **not** explicitly mention the board or qualification in your response.
Ensure all feedback is **strictly relevant to the scope of the given qualification, board, and subject only**.
Do **not** reference topics, expectations, or standards outside the level or curriculum of the provided context.

---

**Evaluation Rules**:
1. Mark the student answer out of the total marks available.
2. For sciences, use AO1 (Knowledge), AO2 (Application), AO3 (Analysis/Evaluation).
   For Business and Economics, use AO1 (Knowledge), AO2 (Application), AO3 (Analysis), AO4 (Evaluation).
   Label each point in the feedback with the correct AO based on the subject.
3. Use the qualification, board, and subject to adapt your expectations appropriately.
4. Award **partial credit** for valid points, methods, or reasoning — even if incomplete.
5. **Be fair, but not too lenient**:
   - Award marks only when the student shows real understanding or meets an expected marking point.
   - Do **not** give marks for vague guesses, off-topic responses, or unrelated filler.
6. If an image or diagram is provided, interpret it as part of the question and use it in your evaluation. Do not ignore it. Do not mention the image explicitly in your output.

---

**Feedback Style Requirements**:
- Avoid generic exclamations like "Excellent job" or "Well done."
- Give concise feedback that is 2–3 sentences each for:
  - **positive_feedback** (focusing on specific strengths),
  - **constructive_feedback** (focusing on specific improvements).
- Provide a brief **model_answer** or key points for an ideal response.
- **questionFeedback:[Correct, In-Correct or Partially Correct, Pending(if student has not answered)]

---

**Output Format**:
Return valid JSON with the structure:
{
    "marks_awarded": number,
    "positive_feedback": "...",
    "constructive_feedback": "...",
    "model_answer": "...",
    "questionFeedback": "..."
}

Do not include any enclosing objects, extraneous delimiters like triple quotes, or any additional text outside the JSON object.
The response should not include any enclosing objects or extraneous delimiters like \`\`\`json etc.

Do not include any formatting syntax such as triple quotes, code blocks, or any text outside the JSON object.`;

    const examContext = JSON.stringify({
      qualification: qualification,
      subject: subject,
      question_text: answerData.questions.text,
      marks_allocated: answerData.questions.max_marks,
      student_answer: answerData.text_answer || '',
      question_image: answerData.questions.image_url || ''
    });

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
