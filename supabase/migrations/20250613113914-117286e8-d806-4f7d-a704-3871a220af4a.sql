
-- Create a completely new migration to fix the infinite recursion issue
-- by creating a security definer function that bypasses RLS

-- First, drop all existing policies that are causing recursion
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "School admins can manage their school roles" ON public.user_roles;

-- Create a security definer function that can check roles without RLS recursion
CREATE OR REPLACE FUNCTION public.check_user_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function runs with elevated privileges, bypassing RLS
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- Now create simple policies that don't cause recursion
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

-- For super admin access, use the security definer function
CREATE POLICY "Super admins can manage all roles" ON public.user_roles
FOR ALL USING (public.check_user_role(auth.uid(), 'super_admin'));

-- For school admin access
CREATE POLICY "School admins can manage their school roles" ON public.user_roles
FOR ALL USING (
  public.check_user_role(auth.uid(), 'school_admin') 
  AND school_id IN (
    SELECT ur.school_id FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'school_admin'
  )
);

-- Also ensure your user has the super admin role
INSERT INTO public.user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'm.shayan@improvemeinstitute.com'),
  'super_admin'
)
ON CONFLICT (user_id, role, school_id) DO NOTHING;
