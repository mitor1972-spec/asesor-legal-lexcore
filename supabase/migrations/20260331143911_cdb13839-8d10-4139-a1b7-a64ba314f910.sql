
-- Add commission fields to lead_assignments
ALTER TABLE public.lead_assignments 
  ADD COLUMN IF NOT EXISTS is_commission boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS commission_percent numeric DEFAULT 20;

-- Create commission_areas configuration table
CREATE TABLE IF NOT EXISTS public.commission_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_area text NOT NULL,
  commission_percent numeric NOT NULL DEFAULT 20,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commission_areas ENABLE ROW LEVEL SECURITY;

-- Admins and internal users can manage
CREATE POLICY "Internal users can manage commission_areas"
  ON public.commission_areas FOR ALL
  TO authenticated
  USING (is_internal_user(auth.uid()));

-- Lawfirm users can view active commission areas
CREATE POLICY "Lawfirm users can view active commission areas"
  ON public.commission_areas FOR SELECT
  TO authenticated
  USING (is_active = true AND get_user_lawfirm_id(auth.uid()) IS NOT NULL);

-- Insert initial commission areas
INSERT INTO public.commission_areas (legal_area, commission_percent, is_active) VALUES
  ('Derecho Bancario', 20, true),
  ('Derecho de Consumidores', 20, true),
  ('Derecho Concursal', 20, true);
