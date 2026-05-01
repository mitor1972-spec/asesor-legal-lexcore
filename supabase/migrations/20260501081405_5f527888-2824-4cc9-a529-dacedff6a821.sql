-- =====================================================
-- FASE 1: Mesa de trabajo del abogado
-- =====================================================

-- 1. Estado operativo del caso en lead_assignments
ALTER TABLE public.lead_assignments
  ADD COLUMN IF NOT EXISTS operational_status text DEFAULT 'nuevo';

CREATE INDEX IF NOT EXISTS idx_lead_assignments_operational_status
  ON public.lead_assignments(operational_status);

-- =====================================================
-- 2. case_documents
-- =====================================================
CREATE TABLE IF NOT EXISTS public.case_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  lawfirm_id uuid NOT NULL,
  uploaded_by uuid,
  uploaded_by_type text NOT NULL DEFAULT 'lawyer', -- lawyer | client | admin
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_type text,
  file_size integer,
  category text DEFAULT 'otros',
  status text NOT NULL DEFAULT 'pending', -- pending | validated | rejected | needs_fix
  ai_summary text,
  ai_extracted_data jsonb DEFAULT '{}'::jsonb,
  ai_validation_status text,
  upload_link_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_documents_lead ON public.case_documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_lawfirm ON public.case_documents(lawfirm_id);

ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage case_documents"
  ON public.case_documents FOR ALL TO authenticated
  USING (is_internal_user(auth.uid()))
  WITH CHECK (is_internal_user(auth.uid()));

CREATE POLICY "Lawfirm members view their case_documents"
  ON public.case_documents FOR SELECT TO authenticated
  USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));

CREATE POLICY "Lawfirm members insert their case_documents"
  ON public.case_documents FOR INSERT TO authenticated
  WITH CHECK (lawfirm_id = get_user_lawfirm_id(auth.uid()));

CREATE POLICY "Lawfirm members update their case_documents"
  ON public.case_documents FOR UPDATE TO authenticated
  USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));

CREATE POLICY "Lawfirm members delete their case_documents"
  ON public.case_documents FOR DELETE TO authenticated
  USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));

CREATE TRIGGER trg_case_documents_updated
  BEFORE UPDATE ON public.case_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 3. case_upload_links
-- =====================================================
CREATE TABLE IF NOT EXISTS public.case_upload_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  lawfirm_id uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  max_files integer NOT NULL DEFAULT 20,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  client_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_upload_links_lead ON public.case_upload_links(lead_id);
CREATE INDEX IF NOT EXISTS idx_case_upload_links_token ON public.case_upload_links(token);

ALTER TABLE public.case_upload_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage upload links"
  ON public.case_upload_links FOR ALL TO authenticated
  USING (is_internal_user(auth.uid()))
  WITH CHECK (is_internal_user(auth.uid()));

CREATE POLICY "Lawfirm members view their upload links"
  ON public.case_upload_links FOR SELECT TO authenticated
  USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));

CREATE POLICY "Lawfirm members create upload links"
  ON public.case_upload_links FOR INSERT TO authenticated
  WITH CHECK (lawfirm_id = get_user_lawfirm_id(auth.uid()));

CREATE POLICY "Lawfirm members update their upload links"
  ON public.case_upload_links FOR UPDATE TO authenticated
  USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));

-- =====================================================
-- 4. case_ai_analyses
-- =====================================================
CREATE TABLE IF NOT EXISTS public.case_ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  lawfirm_id uuid NOT NULL,
  analysis_type text NOT NULL, -- deep_analysis | doc_validation | engagement_letter | legal_doc
  prompt_version text,
  input_snapshot jsonb,
  result_json jsonb,
  result_text text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_ai_analyses_lead ON public.case_ai_analyses(lead_id);
CREATE INDEX IF NOT EXISTS idx_case_ai_analyses_type ON public.case_ai_analyses(analysis_type);

ALTER TABLE public.case_ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage case_ai_analyses"
  ON public.case_ai_analyses FOR ALL TO authenticated
  USING (is_internal_user(auth.uid()))
  WITH CHECK (is_internal_user(auth.uid()));

CREATE POLICY "Lawfirm members view their case_ai_analyses"
  ON public.case_ai_analyses FOR SELECT TO authenticated
  USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));

CREATE POLICY "Lawfirm members insert their case_ai_analyses"
  ON public.case_ai_analyses FOR INSERT TO authenticated
  WITH CHECK (lawfirm_id = get_user_lawfirm_id(auth.uid()));

-- =====================================================
-- 5. case_tasks
-- =====================================================
CREATE TABLE IF NOT EXISTS public.case_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  lawfirm_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  assigned_to uuid,
  due_date date,
  status text NOT NULL DEFAULT 'pending', -- pending | in_progress | completed
  priority text NOT NULL DEFAULT 'medium', -- low | medium | high
  created_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_tasks_lead ON public.case_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_case_tasks_assigned ON public.case_tasks(assigned_to);

ALTER TABLE public.case_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage case_tasks"
  ON public.case_tasks FOR ALL TO authenticated
  USING (is_internal_user(auth.uid()))
  WITH CHECK (is_internal_user(auth.uid()));

CREATE POLICY "Lawfirm members manage their case_tasks"
  ON public.case_tasks FOR ALL TO authenticated
  USING (lawfirm_id = get_user_lawfirm_id(auth.uid()))
  WITH CHECK (lawfirm_id = get_user_lawfirm_id(auth.uid()));

CREATE TRIGGER trg_case_tasks_updated
  BEFORE UPDATE ON public.case_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. case_financials
-- =====================================================
CREATE TABLE IF NOT EXISTS public.case_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL UNIQUE,
  lawfirm_id uuid NOT NULL,
  fee_type text DEFAULT 'fixed', -- fixed | commission | mixed
  fixed_fee numeric,
  commission_percentage numeric,
  claimed_amount numeric,
  estimated_recovery numeric,
  provision_amount numeric,
  payment_status text DEFAULT 'pending', -- pending | partial | paid | unpaid
  paid_amount numeric,
  payment_date date,
  notes text,
  engagement_letter_doc_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.case_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage case_financials"
  ON public.case_financials FOR ALL TO authenticated
  USING (is_internal_user(auth.uid()))
  WITH CHECK (is_internal_user(auth.uid()));

CREATE POLICY "Lawfirm members manage their case_financials"
  ON public.case_financials FOR ALL TO authenticated
  USING (lawfirm_id = get_user_lawfirm_id(auth.uid()))
  WITH CHECK (lawfirm_id = get_user_lawfirm_id(auth.uid()));

CREATE TRIGGER trg_case_financials_updated
  BEFORE UPDATE ON public.case_financials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. case_timeline_events
-- =====================================================
CREATE TABLE IF NOT EXISTS public.case_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  lawfirm_id uuid NOT NULL,
  event_type text NOT NULL, -- assigned | contacted | docs_requested | docs_received | ai_analyzed | engagement_generated | engagement_signed | payment | doc_generated | closed | custom
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_timeline_lead ON public.case_timeline_events(lead_id, created_at DESC);

ALTER TABLE public.case_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage case_timeline_events"
  ON public.case_timeline_events FOR ALL TO authenticated
  USING (is_internal_user(auth.uid()))
  WITH CHECK (is_internal_user(auth.uid()));

CREATE POLICY "Lawfirm members view their case_timeline_events"
  ON public.case_timeline_events FOR SELECT TO authenticated
  USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));

CREATE POLICY "Lawfirm members insert their case_timeline_events"
  ON public.case_timeline_events FOR INSERT TO authenticated
  WITH CHECK (lawfirm_id = get_user_lawfirm_id(auth.uid()));

-- =====================================================
-- 8. Storage bucket case-documents
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-documents', 'case-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Internal users access case-documents"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'case-documents' AND is_internal_user(auth.uid()))
  WITH CHECK (bucket_id = 'case-documents' AND is_internal_user(auth.uid()));

CREATE POLICY "Lawfirm members read their case-documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND EXISTS (
      SELECT 1 FROM public.case_documents cd
      WHERE cd.storage_path = storage.objects.name
        AND cd.lawfirm_id = get_user_lawfirm_id(auth.uid())
    )
  );

CREATE POLICY "Lawfirm members upload case-documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'case-documents'
    AND get_user_lawfirm_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "Lawfirm members delete their case-documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND EXISTS (
      SELECT 1 FROM public.case_documents cd
      WHERE cd.storage_path = storage.objects.name
        AND cd.lawfirm_id = get_user_lawfirm_id(auth.uid())
    )
  );