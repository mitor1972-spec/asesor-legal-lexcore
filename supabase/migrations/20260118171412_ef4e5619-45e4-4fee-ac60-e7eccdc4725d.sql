-- Add new columns to lawfirms table for pricing and marketplace settings
ALTER TABLE public.lawfirms 
ADD COLUMN IF NOT EXISTS price_per_area JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS auto_purchase_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_purchase_min_score INTEGER DEFAULT 70,
ADD COLUMN IF NOT EXISTS auto_purchase_max_price INTEGER DEFAULT 40,
ADD COLUMN IF NOT EXISTS auto_purchase_areas TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS leadsmarket_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS alert_email_new_leads BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS alert_email_daily_summary BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS alert_push_enabled BOOLEAN DEFAULT false;