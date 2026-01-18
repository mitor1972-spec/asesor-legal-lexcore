-- Add RLS policies for profiles table (user data protection)
-- Users can only see their own profile or profiles from their lawfirm

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view lawfirm team members" ON public.profiles;
DROP POLICY IF EXISTS "Internal users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Users can view profiles from their lawfirm (team members)
CREATE POLICY "Users can view lawfirm team members"
ON public.profiles
FOR SELECT
USING (
  lawfirm_id IS NOT NULL 
  AND lawfirm_id = (SELECT lawfirm_id FROM public.profiles WHERE id = auth.uid())
);

-- Internal users (admin/operator) can view all profiles
CREATE POLICY "Internal users can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_internal_user(auth.uid()));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Add RLS policies for lawfirms table (business data protection)
DROP POLICY IF EXISTS "Internal users can manage lawfirms" ON public.lawfirms;
DROP POLICY IF EXISTS "Lawfirm members can view own lawfirm" ON public.lawfirms;
DROP POLICY IF EXISTS "Lawfirm admins can update own lawfirm" ON public.lawfirms;

-- Internal users (admin/operator) can do everything with lawfirms
CREATE POLICY "Internal users can manage lawfirms"
ON public.lawfirms
FOR ALL
USING (public.is_internal_user(auth.uid()));

-- Lawfirm members can view their own lawfirm
CREATE POLICY "Lawfirm members can view own lawfirm"
ON public.lawfirms
FOR SELECT
USING (
  id = (SELECT lawfirm_id FROM public.profiles WHERE id = auth.uid())
);

-- Lawfirm admins can update their own lawfirm
CREATE POLICY "Lawfirm admins can update own lawfirm"
ON public.lawfirms
FOR UPDATE
USING (
  id = (SELECT lawfirm_id FROM public.profiles WHERE id = auth.uid())
  AND public.has_role(auth.uid(), 'lawfirm_admin')
);