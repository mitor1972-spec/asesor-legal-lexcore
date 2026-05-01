-- Enforce one assignment per lead (prevents race conditions and webhook duplicates)
ALTER TABLE public.lead_assignments
  ADD CONSTRAINT lead_assignments_lead_id_unique UNIQUE (lead_id);

-- Speed up marketplace exclusion queries
CREATE INDEX IF NOT EXISTS idx_lead_assignments_lawfirm
  ON public.lead_assignments (lawfirm_id);