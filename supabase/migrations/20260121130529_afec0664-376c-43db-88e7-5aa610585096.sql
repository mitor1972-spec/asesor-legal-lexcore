-- Add is_demo columns to all relevant tables (some may already exist, use IF NOT EXISTS)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE public.lawfirms ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE public.lead_assignments ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
-- branches already has is_demo from previous migration

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_leads_is_demo ON public.leads (is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_lawfirms_is_demo ON public.lawfirms (is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_lead_assignments_is_demo ON public.lead_assignments (is_demo) WHERE is_demo = true;