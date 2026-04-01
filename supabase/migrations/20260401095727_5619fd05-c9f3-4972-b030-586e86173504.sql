
-- 1. Master Legal Areas
CREATE TABLE public.master_legal_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  area_type text NOT NULL DEFAULT 'principal' CHECK (area_type IN ('principal', 'especializada')),
  is_active boolean NOT NULL DEFAULT true,
  visible_marketplace boolean NOT NULL DEFAULT true,
  priority_order integer NOT NULL DEFAULT 0,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.master_legal_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage master_legal_areas" ON public.master_legal_areas FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Auth users can view master_legal_areas" ON public.master_legal_areas FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_master_legal_areas_updated_at BEFORE UPDATE ON public.master_legal_areas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Master Specialties
CREATE TABLE public.master_specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  is_commercial_vertical boolean NOT NULL DEFAULT false,
  is_star boolean NOT NULL DEFAULT false,
  direct_purchase_allowed boolean NOT NULL DEFAULT true,
  commission_allowed boolean NOT NULL DEFAULT true,
  default_commission_percent numeric DEFAULT 20,
  suggested_fixed_price numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.master_specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage master_specialties" ON public.master_specialties FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Auth users can view master_specialties" ON public.master_specialties FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_master_specialties_updated_at BEFORE UPDATE ON public.master_specialties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Junction table
CREATE TABLE public.master_specialty_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_id uuid NOT NULL REFERENCES public.master_specialties(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.master_legal_areas(id) ON DELETE CASCADE,
  UNIQUE(specialty_id, area_id)
);
ALTER TABLE public.master_specialty_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage master_specialty_areas" ON public.master_specialty_areas FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Auth users can view master_specialty_areas" ON public.master_specialty_areas FOR SELECT TO authenticated USING (true);

-- 4. Global Rules (single row)
CREATE TABLE public.master_global_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_commission_percent numeric NOT NULL DEFAULT 20,
  min_sellable_score integer NOT NULL DEFAULT 40,
  min_sellable_price numeric NOT NULL DEFAULT 5,
  allowed_models text[] NOT NULL DEFAULT ARRAY['compra_directa', 'comision'],
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.master_global_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage master_global_rules" ON public.master_global_rules FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Auth users can view master_global_rules" ON public.master_global_rules FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_master_global_rules_updated_at BEFORE UPDATE ON public.master_global_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
INSERT INTO public.master_global_rules (default_commission_percent, min_sellable_score, min_sellable_price, allowed_models) VALUES (20, 40, 5, ARRAY['compra_directa', 'comision']);

-- 5. Case Statuses
CREATE TABLE public.master_case_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text DEFAULT '#6b7280',
  is_active boolean NOT NULL DEFAULT true,
  is_final boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.master_case_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage master_case_statuses" ON public.master_case_statuses FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Auth users can view master_case_statuses" ON public.master_case_statuses FOR SELECT TO authenticated USING (true);

-- 6. Active Provinces
CREATE TABLE public.master_active_provinces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.master_active_provinces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage master_active_provinces" ON public.master_active_provinces FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Auth users can view master_active_provinces" ON public.master_active_provinces FOR SELECT TO authenticated USING (true);

-- 7. Lawfirm Commissions
CREATE TABLE public.master_lawfirm_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawfirm_id uuid NOT NULL REFERENCES public.lawfirms(id) ON DELETE CASCADE,
  specialty_id uuid NOT NULL REFERENCES public.master_specialties(id) ON DELETE CASCADE,
  commission_percent numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.master_lawfirm_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage master_lawfirm_commissions" ON public.master_lawfirm_commissions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_master_lawfirm_commissions_updated_at BEFORE UPDATE ON public.master_lawfirm_commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Partial unique index for no duplicate active commissions
CREATE UNIQUE INDEX idx_unique_active_lawfirm_commission ON public.master_lawfirm_commissions (lawfirm_id, specialty_id) WHERE is_active = true;

-- 8. Commission History
CREATE TABLE public.master_commission_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES public.master_lawfirm_commissions(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES public.profiles(id),
  old_percent numeric,
  new_percent numeric,
  change_type text NOT NULL DEFAULT 'update',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.master_commission_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage commission history" ON public.master_commission_history FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Resolve commission function
CREATE OR REPLACE FUNCTION public.resolve_commission_percent(_lawfirm_id uuid, _specialty_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT commission_percent FROM master_lawfirm_commissions WHERE lawfirm_id = _lawfirm_id AND specialty_id = _specialty_id AND is_active = true AND start_date <= CURRENT_DATE AND (end_date IS NULL OR end_date >= CURRENT_DATE) LIMIT 1),
    (SELECT default_commission_percent FROM master_specialties WHERE id = _specialty_id AND is_active = true AND commission_allowed = true),
    (SELECT default_commission_percent FROM master_global_rules LIMIT 1),
    20
  )
$$;
