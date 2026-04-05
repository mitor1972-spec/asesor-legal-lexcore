
-- Subcategories linked to main categories
CREATE TABLE public.provider_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.provider_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Legal areas reference table for marketplace
CREATE TABLE public.marketplace_legal_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Provider to legal areas (many-to-many)
CREATE TABLE public.provider_legal_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  legal_area_id UUID NOT NULL REFERENCES public.marketplace_legal_areas(id) ON DELETE CASCADE,
  UNIQUE(provider_id, legal_area_id)
);

-- Provider to subcategories (many-to-many)
CREATE TABLE public.provider_subcategory_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  subcategory_id UUID NOT NULL REFERENCES public.provider_subcategories(id) ON DELETE CASCADE,
  UNIQUE(provider_id, subcategory_id)
);

-- Extend providers with new fields
ALTER TABLE public.providers
  ADD COLUMN modality TEXT DEFAULT 'ambas',
  ADD COLUMN response_time TEXT,
  ADD COLUMN certifications TEXT[],
  ADD COLUMN is_featured BOOLEAN DEFAULT false,
  ADD COLUMN is_sponsored BOOLEAN DEFAULT false;

-- Add priority field to categories
ALTER TABLE public.provider_categories
  ADD COLUMN priority TEXT DEFAULT 'media';

-- RLS
ALTER TABLE public.provider_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_legal_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_legal_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_subcategory_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage subcategories" ON public.provider_subcategories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Auth view active subcategories" ON public.provider_subcategories FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins manage legal areas" ON public.marketplace_legal_areas FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Auth view active legal areas" ON public.marketplace_legal_areas FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins manage provider legal areas" ON public.provider_legal_areas FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Auth view provider legal areas" ON public.provider_legal_areas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage provider subcategory links" ON public.provider_subcategory_links FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Auth view provider subcategory links" ON public.provider_subcategory_links FOR SELECT TO authenticated USING (true);
