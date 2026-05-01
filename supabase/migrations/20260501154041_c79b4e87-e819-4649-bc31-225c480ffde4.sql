-- 1. RLS estricta en lead_assignments según rol
DROP POLICY IF EXISTS "Lawfirm users can view their assignments" ON public.lead_assignments;
DROP POLICY IF EXISTS "Lawfirm users can update their assignments" ON public.lead_assignments;

CREATE POLICY "Lawfirm role-scoped view assignments"
ON public.lead_assignments
FOR SELECT
TO authenticated
USING (
  lawfirm_id = public.get_user_lawfirm_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'lawfirm_admin')
    OR public.has_role(auth.uid(), 'lawfirm_manager')
    OR (
      public.has_role(auth.uid(), 'lawfirm_lawyer')
      AND assigned_lawyer_id = auth.uid()
    )
  )
);

CREATE POLICY "Lawfirm role-scoped update assignments"
ON public.lead_assignments
FOR UPDATE
TO authenticated
USING (
  lawfirm_id = public.get_user_lawfirm_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'lawfirm_admin')
    OR public.has_role(auth.uid(), 'lawfirm_manager')
    OR (
      public.has_role(auth.uid(), 'lawfirm_lawyer')
      AND assigned_lawyer_id = auth.uid()
    )
  )
)
WITH CHECK (
  lawfirm_id = public.get_user_lawfirm_id(auth.uid())
);

-- 2. specialty_id en leads + backfill desde structured_fields
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS specialty_id uuid REFERENCES public.master_specialties(id);

CREATE INDEX IF NOT EXISTS idx_leads_specialty_id ON public.leads(specialty_id);

UPDATE public.leads l
SET specialty_id = ms.id
FROM public.master_specialties ms
WHERE l.specialty_id IS NULL
  AND l.structured_fields IS NOT NULL
  AND lower(trim(ms.name)) = lower(trim(
    COALESCE(
      l.structured_fields->>'area_legal',
      l.structured_fields->>'legal_area',
      l.structured_fields->>'specialty',
      l.structured_fields->>'especialidad',
      l.structured_fields->>'categoria'
    )
  ));