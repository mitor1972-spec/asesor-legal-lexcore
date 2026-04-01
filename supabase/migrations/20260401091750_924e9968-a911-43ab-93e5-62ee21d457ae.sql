DROP POLICY IF EXISTS "Lawfirm users can view marketplace leads" ON public.leads;

CREATE POLICY "Lawfirm users can view marketplace leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  get_user_lawfirm_id(auth.uid()) IS NOT NULL
  AND status_internal = 'Pendiente'
  AND archived_at IS NULL
  AND discarded_at IS NULL
  AND (is_demo IS NULL OR is_demo = false)
  AND (
    structured_fields->'_incomplete' IS NULL
    OR structured_fields->>'_incomplete' = 'false'
  )
  AND (
    COALESCE(NULLIF(structured_fields->>'email', ''), '') <> ''
    OR COALESCE(NULLIF(structured_fields->>'telefono', ''), '') <> ''
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.lead_assignments la
    WHERE la.lead_id = leads.id
  )
);