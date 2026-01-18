-- Drop the problematic RLS policy that causes infinite recursion
DROP POLICY IF EXISTS "Lawfirm users can view their team profiles" ON public.profiles;

-- Create a security definer function to check lawfirm membership
CREATE OR REPLACE FUNCTION public.get_user_lawfirm_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lawfirm_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- Create a new policy using the security definer function (no recursion)
CREATE POLICY "Lawfirm users can view their team profiles" 
ON public.profiles 
FOR SELECT 
USING (
  lawfirm_id IS NOT NULL 
  AND lawfirm_id = public.get_user_lawfirm_id(auth.uid())
);