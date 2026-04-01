
-- Table to store commission terms acceptance by lawfirm
CREATE TABLE public.commission_terms_acceptance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawfirm_id uuid NOT NULL REFERENCES public.lawfirms(id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  accepted_by_user_id uuid REFERENCES auth.users(id),
  ip_address text,
  terms_version text NOT NULL DEFAULT 'v1',
  UNIQUE(lawfirm_id, terms_version)
);

ALTER TABLE public.commission_terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Lawfirm members can view their own acceptance
CREATE POLICY "Lawfirm members can view own terms acceptance"
  ON public.commission_terms_acceptance
  FOR SELECT
  TO authenticated
  USING (lawfirm_id = public.get_user_lawfirm_id(auth.uid()) OR public.is_internal_user(auth.uid()));

-- Lawfirm admins can insert their own acceptance
CREATE POLICY "Lawfirm admins can accept terms"
  ON public.commission_terms_acceptance
  FOR INSERT
  TO authenticated
  WITH CHECK (lawfirm_id = public.get_user_lawfirm_id(auth.uid()));

-- Per-case commission confirmation timestamps on lead_assignments
ALTER TABLE public.lead_assignments
  ADD COLUMN IF NOT EXISTS commission_terms_confirmed_at timestamptz DEFAULT NULL;
