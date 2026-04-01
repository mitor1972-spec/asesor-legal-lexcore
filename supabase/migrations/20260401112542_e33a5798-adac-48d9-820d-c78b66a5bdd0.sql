
-- Add commission configuration fields to lawfirms
ALTER TABLE public.lawfirms
  ADD COLUMN IF NOT EXISTS commission_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS commission_global_percent numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS commission_progressive_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS commission_progressive_tiers jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS commission_weekly_limit integer DEFAULT NULL;

-- Add commission origin tracking to lead_assignments (immutable per case)
ALTER TABLE public.lead_assignments
  ADD COLUMN IF NOT EXISTS commission_origin text DEFAULT NULL;

-- Update the resolve_commission_percent function to include lawfirm global commission
CREATE OR REPLACE FUNCTION public.resolve_commission_percent(_lawfirm_id uuid, _specialty_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    -- 1. Lawfirm + specialty override
    (SELECT commission_percent FROM master_lawfirm_commissions WHERE lawfirm_id = _lawfirm_id AND specialty_id = _specialty_id AND is_active = true AND start_date <= CURRENT_DATE AND (end_date IS NULL OR end_date >= CURRENT_DATE) LIMIT 1),
    -- 2. Lawfirm global custom commission
    (SELECT commission_global_percent FROM lawfirms WHERE id = _lawfirm_id AND commission_global_percent IS NOT NULL),
    -- 3. Specialty default commission
    (SELECT default_commission_percent FROM master_specialties WHERE id = _specialty_id AND is_active = true AND commission_allowed = true),
    -- 4. Global default
    (SELECT default_commission_percent FROM master_global_rules LIMIT 1),
    20
  )
$$;

-- Function to resolve commission origin label
CREATE OR REPLACE FUNCTION public.resolve_commission_origin(_lawfirm_id uuid, _specialty_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM master_lawfirm_commissions WHERE lawfirm_id = _lawfirm_id AND specialty_id = _specialty_id AND is_active = true AND start_date <= CURRENT_DATE AND (end_date IS NULL OR end_date >= CURRENT_DATE))
      THEN 'lawfirm_specialty'
    WHEN EXISTS (SELECT 1 FROM lawfirms WHERE id = _lawfirm_id AND commission_global_percent IS NOT NULL)
      THEN 'lawfirm_global'
    WHEN EXISTS (SELECT 1 FROM master_specialties WHERE id = _specialty_id AND is_active = true AND commission_allowed = true AND default_commission_percent IS NOT NULL)
      THEN 'specialty_default'
    ELSE 'global_default'
  END
$$;
