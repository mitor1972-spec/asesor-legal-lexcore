-- Drop the problematic policy causing infinite recursion
DROP POLICY IF EXISTS "Users can view lawfirm team members" ON public.profiles;

-- The existing policy "Lawfirm users can view their team profiles" already uses get_user_lawfirm_id() 
-- which is the correct approach. No need for a duplicate policy.

-- Verify the existing policies are correct (these use functions, not self-referencing queries)
-- "Lawfirm users can view their team profiles" uses: (lawfirm_id IS NOT NULL) AND (lawfirm_id = get_user_lawfirm_id(auth.uid()))
-- This is correct and doesn't cause recursion.