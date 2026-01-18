-- Create legal_services table for law firms to sell fixed-price services
CREATE TABLE public.legal_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawfirm_id UUID REFERENCES public.lawfirms(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  legal_area TEXT NOT NULL,
  short_description TEXT,
  full_description TEXT,
  
  base_price DECIMAL(10,2) NOT NULL,
  price_options JSONB DEFAULT '[]'::jsonb, -- [{"name": "Con hijos", "extra_price": 150}]
  estimated_duration TEXT,
  
  required_documents TEXT[] DEFAULT '{}',
  
  geographic_scope TEXT DEFAULT 'provinces', -- 'all_spain' or 'provinces'
  provinces TEXT[] DEFAULT '{}',
  
  status TEXT DEFAULT 'draft' CHECK (status IN ('active', 'paused', 'draft')),
  
  -- Statistics
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  avg_rating DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.legal_services ENABLE ROW LEVEL SECURITY;

-- Lawfirm admins can manage their own services
CREATE POLICY "Lawfirm users can manage their services"
  ON public.legal_services
  FOR ALL
  USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));

-- Anyone can view active services (for public marketplace)
CREATE POLICY "Anyone can view active services"
  ON public.legal_services
  FOR SELECT
  USING (status = 'active');

-- Internal users can view all services
CREATE POLICY "Internal users can view all services"
  ON public.legal_services
  FOR SELECT
  USING (is_internal_user(auth.uid()));

-- Create updated_at trigger
CREATE TRIGGER update_legal_services_updated_at
  BEFORE UPDATE ON public.legal_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_legal_services_lawfirm ON public.legal_services(lawfirm_id);
CREATE INDEX idx_legal_services_status ON public.legal_services(status);
CREATE INDEX idx_legal_services_area ON public.legal_services(legal_area);