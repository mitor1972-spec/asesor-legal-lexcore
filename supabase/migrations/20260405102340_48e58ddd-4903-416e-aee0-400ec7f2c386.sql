
-- Ad product categories
CREATE TABLE public.ad_product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ad_product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active categories" ON public.ad_product_categories
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.ad_product_categories
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Ad products
CREATE TABLE public.ad_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.ad_product_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  product_type text NOT NULL DEFAULT 'banner',
  base_price numeric NOT NULL DEFAULT 0,
  price_unit text DEFAULT 'mes',
  geo_pricing jsonb DEFAULT '{}',
  area_multipliers jsonb DEFAULT '[{"min":1,"max":1,"multiplier":1},{"min":2,"max":5,"multiplier":1.5},{"min":6,"max":10,"multiplier":2},{"min":11,"max":15,"multiplier":2.5},{"min":16,"max":20,"multiplier":3},{"min":21,"max":25,"multiplier":3.5},{"min":26,"max":30,"multiplier":4}]',
  keyword_multipliers jsonb DEFAULT '[{"min":1,"max":10,"multiplier":1},{"min":11,"max":100,"multiplier":1.5},{"min":101,"max":200,"multiplier":2},{"min":201,"max":300,"multiplier":2.5},{"min":301,"max":400,"multiplier":3},{"min":401,"max":500,"multiplier":3.5}]',
  discount_quarterly numeric DEFAULT 10,
  discount_semester numeric DEFAULT 15,
  discount_annual numeric DEFAULT 20,
  max_slots integer,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  badge text,
  premium_benefits text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ad_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active products" ON public.ad_products
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage products" ON public.ad_products
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Ad orders
CREATE TABLE public.ad_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawfirm_id uuid REFERENCES public.lawfirms(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.ad_products(id) NOT NULL,
  duration text NOT NULL DEFAULT 'monthly',
  geo_scope text,
  geo_target text,
  areas_selected text[],
  keywords_count integer DEFAULT 0,
  config_json jsonb DEFAULT '{}',
  base_amount numeric NOT NULL,
  multiplier_areas numeric DEFAULT 1,
  multiplier_keywords numeric DEFAULT 1,
  discount_percent numeric DEFAULT 0,
  final_amount numeric NOT NULL,
  payment_method text DEFAULT 'balance',
  stripe_payment_id text,
  stripe_invoice_id text,
  payment_status text DEFAULT 'pending',
  starts_at date,
  ends_at date,
  auto_renew boolean DEFAULT false,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ad_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all orders" ON public.ad_orders
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Lawfirm users can view their orders" ON public.ad_orders
  FOR SELECT TO authenticated USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));

CREATE POLICY "Lawfirm users can insert their orders" ON public.ad_orders
  FOR INSERT TO authenticated WITH CHECK (lawfirm_id = get_user_lawfirm_id(auth.uid()));

-- Ad invoices
CREATE TABLE public.ad_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.ad_orders(id),
  lawfirm_id uuid REFERENCES public.lawfirms(id) ON DELETE CASCADE NOT NULL,
  invoice_number text NOT NULL,
  concept text,
  amount numeric NOT NULL,
  tax_rate numeric DEFAULT 21,
  tax_amount numeric NOT NULL,
  total_amount numeric NOT NULL,
  fiscal_name text,
  fiscal_cif text,
  fiscal_address text,
  fiscal_city text,
  fiscal_province text,
  fiscal_postal_code text,
  status text DEFAULT 'pending',
  paid_at timestamptz,
  payment_method text,
  stripe_invoice_id text,
  pdf_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ad_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all invoices" ON public.ad_invoices
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Lawfirm users can view their invoices" ON public.ad_invoices
  FOR SELECT TO authenticated USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));
