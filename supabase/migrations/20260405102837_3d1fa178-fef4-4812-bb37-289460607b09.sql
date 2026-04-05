
CREATE TABLE public.commercial_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawfirm_id UUID NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'delegate_strategy',
  strategy_mode TEXT NULL,
  provinces TEXT[] NULL,
  legal_areas TEXT[] NULL,
  specialties_suggested TEXT[] NULL,
  monthly_budget NUMERIC NULL,
  conversation_summary TEXT NULL,
  conversation_messages JSONB NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT NULL,
  contacted_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.commercial_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all commercial requests"
  ON public.commercial_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Internal users can view commercial requests"
  ON public.commercial_requests FOR SELECT
  USING (is_internal_user(auth.uid()));

CREATE POLICY "Lawfirm users can create their requests"
  ON public.commercial_requests FOR INSERT
  TO authenticated
  WITH CHECK (lawfirm_id = get_user_lawfirm_id(auth.uid()));

CREATE POLICY "Lawfirm users can view their requests"
  ON public.commercial_requests FOR SELECT
  TO authenticated
  USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));

CREATE TRIGGER update_commercial_requests_updated_at
  BEFORE UPDATE ON public.commercial_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
