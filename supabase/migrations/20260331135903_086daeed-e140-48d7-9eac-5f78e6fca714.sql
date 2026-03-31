
-- Create a security definer function to get lawfirm API key (admin only)
CREATE OR REPLACE FUNCTION public.get_lawfirm_api_key(_lawfirm_id uuid)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT openai_api_key
  FROM public.lawfirms
  WHERE id = _lawfirm_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
        AND p.lawfirm_id = _lawfirm_id
        AND ur.role IN ('admin', 'lawfirm_admin')
    )
$$;
