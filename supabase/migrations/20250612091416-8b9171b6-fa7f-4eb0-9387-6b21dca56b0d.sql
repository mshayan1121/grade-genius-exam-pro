
-- Create exams table
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  board TEXT NOT NULL,
  qualification TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  image_url TEXT,
  max_marks INTEGER NOT NULL DEFAULT 0,
  question_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_answers table
CREATE TABLE public.student_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  student_name TEXT NOT NULL,
  text_answer TEXT,
  image_answer_url TEXT,
  evaluated_result JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('exam-images', 'exam-images', true);

-- Storage policies for exam images
CREATE POLICY "Allow public read access on exam images" ON storage.objects
FOR SELECT USING (bucket_id = 'exam-images');

CREATE POLICY "Allow public insert access on exam images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'exam-images');

-- Enable Row Level Security (we'll start with public access for simplicity)
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (you can restrict these later with authentication)
CREATE POLICY "Allow public read access on exams" ON public.exams FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on exams" ON public.exams FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on questions" ON public.questions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on student_answers" ON public.student_answers FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on student_answers" ON public.student_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on student_answers" ON public.student_answers FOR UPDATE USING (true);
