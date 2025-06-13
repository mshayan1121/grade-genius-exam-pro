
-- First, let's check if there are any remaining conflicting policies and remove them
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "School admins can manage their school roles" ON public.user_roles;

-- Disable RLS temporarily to clear any issues
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create the insert policy first and make it more permissive for signup
CREATE POLICY "Allow role insertion during signup" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Allow super admins full access
CREATE POLICY "Super admin full access" ON public.user_roles
FOR ALL TO authenticated
USING (public.check_user_role(auth.uid(), 'super_admin'));

-- Allow school admins to manage their school roles
CREATE POLICY "School admin school access" ON public.user_roles
FOR ALL TO authenticated
USING (
  public.check_user_role(auth.uid(), 'school_admin') 
  AND school_id = ANY(public.get_user_school_ids(auth.uid(), 'school_admin'))
);
