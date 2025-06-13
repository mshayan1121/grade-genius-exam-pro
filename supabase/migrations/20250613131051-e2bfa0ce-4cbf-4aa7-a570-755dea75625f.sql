
-- Create a security definer function to get user school IDs safely
CREATE OR REPLACE FUNCTION public.get_user_school_ids(_user_id uuid, _role app_role)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function runs with elevated privileges, bypassing RLS
  RETURN ARRAY(
    SELECT school_id 
    FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role AND school_id IS NOT NULL
  );
END;
$$;

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "School admins can manage their school roles" ON public.user_roles;

-- Create a new policy using the security definer function to avoid recursion
CREATE POLICY "School admins can manage their school roles" ON public.user_roles
FOR ALL USING (
  public.check_user_role(auth.uid(), 'school_admin') 
  AND (
    school_id = ANY(public.get_user_school_ids(auth.uid(), 'school_admin'))
    OR school_id IS NULL
  )
);
