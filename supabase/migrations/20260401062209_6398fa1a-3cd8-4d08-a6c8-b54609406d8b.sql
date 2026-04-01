ALTER TABLE public.lawfirms 
  ADD COLUMN IF NOT EXISTS credit_line_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_line_amount numeric DEFAULT 0;