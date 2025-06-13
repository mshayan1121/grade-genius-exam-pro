
-- Remove all user roles for your user
DELETE FROM public.user_roles 
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'm.shayan@improvemeinstitute.com'
);
