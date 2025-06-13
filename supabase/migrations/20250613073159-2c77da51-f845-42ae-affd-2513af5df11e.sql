
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'school_admin', 'school_teacher', 'school_student');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    school_id UUID NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role, school_id)
);

-- Create schools table
CREATE TABLE public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create courses table for qualification -> board -> subject hierarchy
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qualification TEXT NOT NULL,
    board TEXT NOT NULL,
    subject TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) NULL, -- Allow NULL for system-created courses
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (qualification, board, subject)
);

-- Create school_subscriptions table for schools subscribing to courses
CREATE TABLE public.school_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (school_id, course_id)
);

-- First create a default course for existing exams (with NULL created_by for system)
INSERT INTO public.courses (qualification, board, subject, name, description, created_by)
VALUES (
  'General', 
  'General', 
  'General', 
  'Default Course for Existing Exams',
  'Automatically created course for migrating existing exams',
  NULL
);

-- Add course_id column to exams table and update existing exams
ALTER TABLE public.exams ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

-- Update existing exams to use the default course
UPDATE public.exams 
SET course_id = (
  SELECT id FROM public.courses 
  WHERE name = 'Default Course for Existing Exams' 
  LIMIT 1
)
WHERE course_id IS NULL;

-- Now make the column NOT NULL and drop old columns
ALTER TABLE public.exams ALTER COLUMN course_id SET NOT NULL;
ALTER TABLE public.exams DROP COLUMN qualification;
ALTER TABLE public.exams DROP COLUMN board; 
ALTER TABLE public.exams DROP COLUMN subject;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role, _school_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (school_id = _school_id OR _school_id IS NULL OR school_id IS NULL)
  )
$$;

-- Enable RLS on all new tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage all roles" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "School admins can manage their school roles" ON public.user_roles
FOR ALL USING (
  public.has_role(auth.uid(), 'school_admin') AND 
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'school_admin'
  )
);

-- RLS policies for schools
CREATE POLICY "Super admins can manage all schools" ON public.schools
FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "School users can view their school" ON public.schools
FOR SELECT USING (
  id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND school_id IS NOT NULL
  )
);

-- RLS policies for courses
CREATE POLICY "Super admins can manage all courses" ON public.courses
FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "All authenticated users can view courses" ON public.courses
FOR SELECT TO authenticated USING (true);

-- RLS policies for school_subscriptions
CREATE POLICY "Super admins can manage all subscriptions" ON public.school_subscriptions
FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "School users can view their subscriptions" ON public.school_subscriptions
FOR SELECT USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND school_id IS NOT NULL
  )
);

-- Update exams RLS to work with courses
DROP POLICY IF EXISTS "Allow public read access on exams" ON public.exams;
DROP POLICY IF EXISTS "Allow public insert access on exams" ON public.exams;

CREATE POLICY "Super admins can manage all exams" ON public.exams
FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Teachers can manage exams for their school's courses" ON public.exams
FOR ALL USING (
  public.has_role(auth.uid(), 'school_teacher') AND
  course_id IN (
    SELECT sc.course_id 
    FROM public.school_subscriptions sc
    JOIN public.user_roles ur ON ur.school_id = sc.school_id
    WHERE ur.user_id = auth.uid() AND sc.is_active = true
  )
);

CREATE POLICY "School users can view exams for their subscribed courses" ON public.exams
FOR SELECT USING (
  course_id IN (
    SELECT sc.course_id 
    FROM public.school_subscriptions sc
    JOIN public.user_roles ur ON ur.school_id = sc.school_id
    WHERE ur.user_id = auth.uid() AND sc.is_active = true
  )
);
