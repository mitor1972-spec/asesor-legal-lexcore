
-- Provider categories (notarios, procuradores, peritos, etc.)
CREATE TABLE public.provider_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Providers (third-party companies)
CREATE TABLE public.providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.provider_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cif TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  provinces_covered TEXT[] DEFAULT '{}',
  commission_percent NUMERIC NOT NULL DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Services offered by providers
CREATE TABLE public.provider_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  price_type TEXT NOT NULL DEFAULT 'fixed', -- fixed, from, per_unit
  promo_price NUMERIC,
  promo_label TEXT,
  promo_ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Orders / transactions
CREATE TABLE public.provider_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.provider_services(id),
  provider_id UUID NOT NULL REFERENCES public.providers(id),
  lawfirm_id UUID NOT NULL REFERENCES public.lawfirms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  commission_percent NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  provider_payout NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.provider_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_orders ENABLE ROW LEVEL SECURITY;

-- Categories: admins manage, authenticated read active
CREATE POLICY "Admins can manage provider categories" ON public.provider_categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view active categories" ON public.provider_categories FOR SELECT TO authenticated USING (is_active = true);

-- Providers: admins manage, authenticated read active
CREATE POLICY "Admins can manage providers" ON public.providers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view active providers" ON public.providers FOR SELECT TO authenticated USING (is_active = true);

-- Services: admins manage, authenticated read active
CREATE POLICY "Admins can manage provider services" ON public.provider_services FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view active services" ON public.provider_services FOR SELECT TO authenticated USING (is_active = true);

-- Orders: admins manage all, lawfirm users manage own
CREATE POLICY "Admins can manage all orders" ON public.provider_orders FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Lawfirm users can view their orders" ON public.provider_orders FOR SELECT TO authenticated USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));
CREATE POLICY "Lawfirm users can insert their orders" ON public.provider_orders FOR INSERT TO authenticated WITH CHECK (lawfirm_id = get_user_lawfirm_id(auth.uid()));

-- Seed initial categories
INSERT INTO public.provider_categories (name, slug, description, icon, sort_order) VALUES
  ('Procuradores', 'procuradores', 'Servicios de procuraduría para representación procesal', 'Gavel', 1),
  ('Notarios', 'notarios', 'Servicios notariales y fedatarios', 'Stamp', 2),
  ('Peritos', 'peritos', 'Peritos judiciales y extrajudiciales de distintas especialidades', 'ClipboardCheck', 3);
