-- Fix #1: Drop the problematic RLS policy causing infinite recursion
DROP POLICY IF EXISTS "Lawfirm users can view their team profiles" ON public.profiles;

-- Create a new function to safely get user's lawfirm_id without causing recursion
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

-- Recreate the policy using the security definer function (no recursion)
CREATE POLICY "Lawfirm users can view their team profiles" 
ON public.profiles 
FOR SELECT 
USING (
  lawfirm_id IS NOT NULL 
  AND lawfirm_id = public.get_user_lawfirm_id(auth.uid())
);

-- Fix #2: Update is_internal_user to check is_active
CREATE OR REPLACE FUNCTION public.is_internal_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role IN ('admin', 'operator')
      AND p.is_active = true
  )
$$;

-- Fix #3: Update has_role to check is_active
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND p.is_active = true
  )
$$;

-- Fix: Drop and recreate lawfirm policy that also causes recursion via profiles
DROP POLICY IF EXISTS "Lawfirm admin can update their lawfirm" ON public.lawfirms;

-- Create a function to check if user is lawfirm admin for a specific lawfirm
CREATE OR REPLACE FUNCTION public.is_lawfirm_admin_of(_user_id uuid, _lawfirm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = _user_id
      AND p.lawfirm_id = _lawfirm_id
      AND ur.role = 'lawfirm_admin'
      AND p.is_active = true
  )
$$;

-- Recreate the policy without recursion
CREATE POLICY "Lawfirm admin can update their lawfirm" 
ON public.lawfirms 
FOR UPDATE 
USING (public.is_lawfirm_admin_of(auth.uid(), id));

-- Fix lawfirm view policy
DROP POLICY IF EXISTS "Lawfirm admin can view their lawfirm" ON public.lawfirms;
CREATE POLICY "Lawfirm admin can view their lawfirm" 
ON public.lawfirms 
FOR SELECT 
USING (
  id = public.get_user_lawfirm_id(auth.uid())
);