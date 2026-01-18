-- =============================================
-- LEADSMARKET, ALTA DE DESPACHOS Y ANUNCIOS
-- =============================================

-- 1. Añadir campos a leads para el marketplace
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_in_marketplace BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS marketplace_price DECIMAL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS marketplace_summary TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS marketplace_added_at TIMESTAMPTZ;

-- 2. Añadir campos a lawfirms para saldo y alertas
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS marketplace_balance DECIMAL DEFAULT 0;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS marketplace_alerts_enabled BOOLEAN DEFAULT true;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS alert_frequency TEXT DEFAULT 'daily' CHECK (alert_frequency IN ('instant', 'daily', 'morning', 'evening'));
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS alert_min_score INTEGER DEFAULT 0;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS alert_filter_by_areas BOOLEAN DEFAULT true;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS alert_filter_by_provinces BOOLEAN DEFAULT true;

-- 3. Tabla de configuración del marketplace
CREATE TABLE IF NOT EXISTS marketplace_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_markup_percent DECIMAL DEFAULT 30,
  morning_publish_time TIME DEFAULT '08:00',
  evening_publish_time TIME DEFAULT '18:00',
  auto_publish_enabled BOOLEAN DEFAULT true,
  send_morning_email BOOLEAN DEFAULT true,
  send_evening_email BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuración por defecto
INSERT INTO marketplace_settings (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;

-- 4. Tabla de compras de leads
CREATE TABLE IF NOT EXISTS lead_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  lawfirm_id UUID REFERENCES lawfirms(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  price_paid DECIMAL NOT NULL,
  previous_balance DECIMAL,
  new_balance DECIMAL,
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de transacciones de saldo
CREATE TABLE IF NOT EXISTS balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawfirm_id UUID REFERENCES lawfirms(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('deposit', 'purchase', 'refund', 'adjustment')),
  amount DECIMAL NOT NULL,
  description TEXT,
  reference_id UUID,
  balance_before DECIMAL,
  balance_after DECIMAL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla de solicitudes de alta de despachos
CREATE TABLE IF NOT EXISTS lawfirm_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Datos del despacho
  name TEXT NOT NULL,
  cif TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  
  -- Dirección
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  
  -- Contacto
  contact_name TEXT NOT NULL,
  contact_role TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  
  -- Preferencias
  areas_selected TEXT[],
  provinces_selected TEXT[],
  all_spain BOOLEAN DEFAULT false,
  monthly_capacity INTEGER,
  max_price_per_lead INTEGER,
  min_score INTEGER,
  
  -- Info adicional
  num_lawyers TEXT,
  has_multiple_offices BOOLEAN DEFAULT false,
  referral_source TEXT,
  comments TEXT,
  
  -- Marketing
  accepts_terms BOOLEAN DEFAULT false,
  accepts_privacy BOOLEAN DEFAULT false,
  accepts_marketing BOOLEAN DEFAULT false,
  
  -- Estado
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Referencia al despacho creado
  lawfirm_id UUID REFERENCES lawfirms(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabla de anuncios
CREATE TABLE IF NOT EXISTS advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawfirm_id UUID REFERENCES lawfirms(id) ON DELETE CASCADE,
  
  plan TEXT CHECK (plan IN ('basic', 'premium', 'featured')),
  
  areas TEXT[],
  provinces TEXT[],
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'expired', 'cancelled')),
  
  starts_at DATE NOT NULL,
  ends_at DATE NOT NULL,
  
  price_monthly DECIMAL,
  total_paid DECIMAL,
  
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RLS POLICIES
-- =============================================

-- marketplace_settings: Solo admins
ALTER TABLE marketplace_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage marketplace_settings"
ON marketplace_settings FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Internal users can view marketplace_settings"
ON marketplace_settings FOR SELECT
USING (is_internal_user(auth.uid()));

-- lead_purchases: Admins y despachos propios
ALTER TABLE lead_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users can manage lead_purchases"
ON lead_purchases FOR ALL
USING (is_internal_user(auth.uid()));

CREATE POLICY "Lawfirm users can view their purchases"
ON lead_purchases FOR SELECT
USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));

CREATE POLICY "Lawfirm users can insert purchases"
ON lead_purchases FOR INSERT
WITH CHECK (lawfirm_id = get_user_lawfirm_id(auth.uid()));

-- balance_transactions: Admins y despachos propios
ALTER TABLE balance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage balance_transactions"
ON balance_transactions FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Lawfirm users can view their transactions"
ON balance_transactions FOR SELECT
USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));

-- lawfirm_applications: Admins pueden gestionar, público puede insertar
ALTER TABLE lawfirm_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit application"
ON lawfirm_applications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage applications"
ON lawfirm_applications FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Internal users can view applications"
ON lawfirm_applications FOR SELECT
USING (is_internal_user(auth.uid()));

-- advertisements: Admins y despachos propios
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage advertisements"
ON advertisements FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Lawfirm users can view their ads"
ON advertisements FOR SELECT
USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));

CREATE POLICY "Lawfirm users can insert their ads"
ON advertisements FOR INSERT
WITH CHECK (lawfirm_id = get_user_lawfirm_id(auth.uid()));

CREATE POLICY "Lawfirm users can update their ads"
ON advertisements FOR UPDATE
USING (lawfirm_id = get_user_lawfirm_id(auth.uid()));

-- =============================================
-- INDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_leads_marketplace ON leads(is_in_marketplace) WHERE is_in_marketplace = true;
CREATE INDEX IF NOT EXISTS idx_lead_purchases_lawfirm ON lead_purchases(lawfirm_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_lawfirm ON balance_transactions(lawfirm_id);
CREATE INDEX IF NOT EXISTS idx_lawfirm_applications_status ON lawfirm_applications(status);
CREATE INDEX IF NOT EXISTS idx_advertisements_lawfirm ON advertisements(lawfirm_id);
CREATE INDEX IF NOT EXISTS idx_advertisements_status ON advertisements(status);