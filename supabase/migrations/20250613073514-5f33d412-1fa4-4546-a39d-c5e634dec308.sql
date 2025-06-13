
-- Clean up existing exam data to start fresh with the new structure
DELETE FROM public.student_answers;
DELETE FROM public.questions; 
DELETE FROM public.exams;

-- Remove the default course since we're starting fresh
DELETE FROM public.courses WHERE name = 'Default Course for Existing Exams';

-- Add some sample courses for testing
INSERT INTO public.courses (qualification, board, subject, name, description) VALUES
('GCSE', 'AQA', 'Mathematics', 'GCSE Mathematics - AQA', 'General Certificate of Secondary Education Mathematics'),
('GCSE', 'AQA', 'English', 'GCSE English Language - AQA', 'General Certificate of Secondary Education English Language'),
('A-Level', 'Edexcel', 'Physics', 'A-Level Physics - Edexcel', 'Advanced Level Physics'),
('A-Level', 'OCR', 'Chemistry', 'A-Level Chemistry - OCR', 'Advanced Level Chemistry');

-- Update RLS policies to allow public access for now (until authentication is implemented)
DROP POLICY IF EXISTS "Super admins can manage all exams" ON public.exams;
DROP POLICY IF EXISTS "Teachers can manage exams for their school's courses" ON public.exams;
DROP POLICY IF EXISTS "School users can view exams for their subscribed courses" ON public.exams;

-- Temporary policies for public access
CREATE POLICY "Allow public read access on exams" ON public.exams
FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on exams" ON public.exams
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on exams" ON public.exams
FOR UPDATE USING (true);

-- Also allow public access to questions and student_answers for now
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access on questions" ON public.questions
FOR ALL USING (true);

ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access on student_answers" ON public.student_answers
FOR ALL USING (true);
