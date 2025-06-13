
-- First, let's drop the problematic RLS policies that are causing infinite recursion
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "School admins can manage their school roles" ON public.user_roles;

-- Now let's create simpler, non-recursive policies
-- Allow users to view their own roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

-- Allow super admins to manage all roles (using the security definer function)
CREATE POLICY "Super admins can manage all roles" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Allow school admins to manage roles in their school
CREATE POLICY "School admins can manage their school roles" ON public.user_roles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'school_admin' 
    AND ur.school_id = user_roles.school_id
  )
);

-- Also, let's make sure the has_role function is working correctly
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
