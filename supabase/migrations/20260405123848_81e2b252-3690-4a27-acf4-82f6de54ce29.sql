
-- Add self-service fields to providers
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS company_email text,
  ADD COLUMN IF NOT EXISTS company_phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS promo_description text,
  ADD COLUMN IF NOT EXISTS promo_discount_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS languages text[],
  ADD COLUMN IF NOT EXISTS subcategory_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS legal_area_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_orders integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);

-- Create provider_applications table for public self-registration
CREATE TABLE IF NOT EXISTS public.provider_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  cif text,
  category_id uuid REFERENCES public.provider_categories(id) NOT NULL,
  subcategory_ids uuid[] DEFAULT '{}',
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  website text,
  address text,
  city text,
  province text,
  postal_code text,
  description text,
  short_description text,
  modality text DEFAULT 'ambas',
  provinces_covered text[] DEFAULT '{}',
  languages text[] DEFAULT '{}',
  certifications text[] DEFAULT '{}',
  proposed_commission_percent numeric DEFAULT 15,
  promo_description text,
  promo_discount_percent numeric DEFAULT 0,
  legal_area_ids uuid[] DEFAULT '{}',
  accepts_terms boolean DEFAULT false,
  accepts_commission_terms boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  provider_id uuid REFERENCES public.providers(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.provider_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a provider application (public form)
CREATE POLICY "Anyone can submit provider application"
  ON public.provider_applications FOR INSERT
  TO public
  WITH CHECK (true);

-- Internal users can manage all applications
CREATE POLICY "Internal users can manage provider applications"
  ON public.provider_applications FOR ALL
  TO authenticated
  USING (public.is_internal_user(auth.uid()));

-- Applicants can view their own application by email (handled via edge function)

-- Update providers RLS: providers can manage their own record
CREATE POLICY "Providers can view own record"
  ON public.providers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Providers can update own record"
  ON public.providers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Providers can manage their own services
CREATE POLICY "Providers can manage own services"
  ON public.provider_services FOR ALL
  TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()))
  WITH CHECK (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

-- Add 'provider' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'provider';
