-- PHASE 7A: Enhanced Document Management for Leads/Cases
-- Add category field to lead_attachments for organizing documents

-- Add category enum type for document classification
DO $$ BEGIN
  CREATE TYPE attachment_category AS ENUM (
    'datos_personales',
    'notificaciones_juzgado',
    'documentacion_caso',
    'fotografias',
    'comunicaciones'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add category and AI-extracted metadata columns to lead_attachments
ALTER TABLE public.lead_attachments 
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'documentacion_caso',
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_extracted_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- PHASE 7C: Case Economics - Add economic tracking fields to lead_assignments
ALTER TABLE public.lead_assignments
  ADD COLUMN IF NOT EXISTS lead_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS client_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS success_percentage NUMERIC,
  ADD COLUMN IF NOT EXISTS claimed_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS fee_accepted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS won_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS won_percentage NUMERIC;

-- Create index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_lead_attachments_category ON public.lead_attachments (category);
CREATE INDEX IF NOT EXISTS idx_lead_attachments_lead_category ON public.lead_attachments (lead_id, category);

-- Create storage bucket for lead documents if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-documents', 'lead-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for lead-documents bucket
CREATE POLICY "Internal users can upload lead documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lead-documents' 
  AND is_internal_user(auth.uid())
);

CREATE POLICY "Internal users can view lead documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lead-documents' 
  AND is_internal_user(auth.uid())
);

CREATE POLICY "Lawfirm users can view their lead documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lead-documents' 
  AND EXISTS (
    SELECT 1 FROM lead_attachments la
    JOIN lead_assignments las ON las.lead_id = la.lead_id
    JOIN profiles p ON p.lawfirm_id = las.lawfirm_id
    WHERE la.storage_path = storage.objects.name
    AND p.id = auth.uid()
  )
);

CREATE POLICY "Internal users can delete lead documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'lead-documents' 
  AND is_internal_user(auth.uid())
);