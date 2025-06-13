
-- Drop ALL existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "School admins can manage their school roles" ON public.user_roles;

-- Create a policy that allows users to insert their own roles (needed for signup)
CREATE POLICY "Users can insert their own roles" ON public.user_roles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create a policy that allows super admins to manage all roles
CREATE POLICY "Super admins can manage all roles" ON public.user_roles
FOR ALL USING (public.check_user_role(auth.uid(), 'super_admin'));

-- Create a policy that allows users to view their own roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

-- Recreate the school admin policy
CREATE POLICY "School admins can manage their school roles" ON public.user_roles
FOR ALL USING (
  public.check_user_role(auth.uid(), 'school_admin') 
  AND school_id = ANY(public.get_user_school_ids(auth.uid(), 'school_admin'))
);
