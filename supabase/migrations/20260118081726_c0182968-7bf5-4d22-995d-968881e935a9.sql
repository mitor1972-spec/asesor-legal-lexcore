-- Add case_summary field to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS case_summary TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.leads.case_summary IS 'AI-generated structured case summary';