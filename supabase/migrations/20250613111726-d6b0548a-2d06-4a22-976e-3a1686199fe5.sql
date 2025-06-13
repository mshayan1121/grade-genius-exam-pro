
-- Create lookup tables for course components
CREATE TABLE public.year_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classes table for teachers to group students
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    year_group_id UUID REFERENCES public.year_groups(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(name, school_id)
);

-- Create class_students junction table
CREATE TABLE public.class_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(class_id, student_id)
);

-- Create exam_assignments table to link exams to classes
CREATE TABLE public.exam_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    due_date TIMESTAMP WITH TIME ZONE,
    UNIQUE(exam_id, class_id)
);

-- Update courses table to use the new lookup tables
ALTER TABLE public.courses DROP COLUMN qualification;
ALTER TABLE public.courses DROP COLUMN board;
ALTER TABLE public.courses DROP COLUMN subject;

ALTER TABLE public.courses ADD COLUMN qualification_id UUID REFERENCES public.qualifications(id) ON DELETE CASCADE;
ALTER TABLE public.courses ADD COLUMN board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE;
ALTER TABLE public.courses ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE;
ALTER TABLE public.courses ADD COLUMN year_group_id UUID REFERENCES public.year_groups(id) ON DELETE CASCADE;

-- Enable RLS on new tables
ALTER TABLE public.year_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for lookup tables (super admin can manage, everyone can view)
CREATE POLICY "Super admins can manage year groups" ON public.year_groups
FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "All authenticated users can view year groups" ON public.year_groups
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage qualifications" ON public.qualifications
FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "All authenticated users can view qualifications" ON public.qualifications
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage boards" ON public.boards
FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "All authenticated users can view boards" ON public.boards
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage subjects" ON public.subjects
FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "All authenticated users can view subjects" ON public.subjects
FOR SELECT TO authenticated USING (true);

-- RLS policies for classes
CREATE POLICY "Teachers can manage their own classes" ON public.classes
FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "School admins can view classes in their school" ON public.classes
FOR SELECT USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'school_admin'
  )
);

CREATE POLICY "Super admins can view all classes" ON public.classes
FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS policies for class_students
CREATE POLICY "Teachers can manage students in their classes" ON public.class_students
FOR ALL USING (
  class_id IN (
    SELECT id FROM public.classes WHERE teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can view their own class memberships" ON public.class_students
FOR SELECT USING (student_id = auth.uid());

-- RLS policies for exam_assignments
CREATE POLICY "Teachers can manage exam assignments for their classes" ON public.exam_assignments
FOR ALL USING (
  class_id IN (
    SELECT id FROM public.classes WHERE teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can view assignments for their classes" ON public.exam_assignments
FOR SELECT USING (
  class_id IN (
    SELECT class_id FROM public.class_students WHERE student_id = auth.uid()
  )
);

-- Insert some default data
INSERT INTO public.year_groups (name, description) VALUES
('Year 7', 'Students aged 11-12'),
('Year 8', 'Students aged 12-13'),
('Year 9', 'Students aged 13-14'),
('Year 10', 'Students aged 14-15'),
('Year 11', 'Students aged 15-16'),
('Year 12', 'Students aged 16-17'),
('Year 13', 'Students aged 17-18');

INSERT INTO public.qualifications (name, description) VALUES
('GCSE', 'General Certificate of Secondary Education'),
('A Level', 'Advanced Level'),
('BTEC', 'Business and Technology Education Council'),
('IB', 'International Baccalaureate');

INSERT INTO public.boards (name, description) VALUES
('AQA', 'Assessment and Qualifications Alliance'),
('Edexcel', 'Edexcel (Pearson)'),
('OCR', 'Oxford Cambridge and RSA Examinations'),
('WJEC', 'Welsh Joint Education Committee'),
('CIE', 'Cambridge International Examinations');

INSERT INTO public.subjects (name, description) VALUES
('Mathematics', 'Mathematics and Statistics'),
('English Language', 'English Language and Literature'),
('English Literature', 'English Literature'),
('Science', 'General Science'),
('Biology', 'Biology'),
('Chemistry', 'Chemistry'),
('Physics', 'Physics'),
('History', 'History'),
('Geography', 'Geography'),
('Art', 'Art and Design'),
('Music', 'Music'),
('Physical Education', 'Physical Education'),
('Computing', 'Computer Science'),
('Business Studies', 'Business Studies'),
('Economics', 'Economics'),
('Psychology', 'Psychology'),
('Sociology', 'Sociology'),
('French', 'French Language'),
('Spanish', 'Spanish Language'),
('German', 'German Language');
