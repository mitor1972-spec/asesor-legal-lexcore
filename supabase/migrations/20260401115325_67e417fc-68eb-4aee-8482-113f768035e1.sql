
CREATE TABLE public.lead_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id),
  lawfirm_id uuid NOT NULL REFERENCES public.lawfirms(id),
  assignment_id uuid NOT NULL REFERENCES public.lead_assignments(id),
  claim_reason text NOT NULL,
  reason_detail text,
  evidence_path text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  refund_amount numeric,
  refund_type text,
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_claims ENABLE ROW LEVEL SECURITY;

-- Lawfirm users can create claims for their firm
CREATE POLICY "Lawfirm users can insert their claims"
  ON public.lead_claims FOR INSERT TO authenticated
  WITH CHECK (lawfirm_id = get_user_lawfirm_id(auth.uid()));

-- Lawfirm users can view their own claims
CREATE POLICY "Lawfirm users can view their claims"
  ON public.lead_claims FOR SELECT TO authenticated
  USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));

-- Internal users can view all claims
CREATE POLICY "Internal users can view all claims"
  ON public.lead_claims FOR SELECT TO authenticated
  USING (is_internal_user(auth.uid()));

-- Admins can manage all claims
CREATE POLICY "Admins can manage all claims"
  ON public.lead_claims FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));
