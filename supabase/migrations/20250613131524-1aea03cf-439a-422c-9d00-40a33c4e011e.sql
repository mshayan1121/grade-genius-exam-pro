
-- Add super admin role back to your user
INSERT INTO public.user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'm.shayan@improvemeinstitute.com'),
  'super_admin'
)
ON CONFLICT (user_id, role, school_id) DO NOTHING;
