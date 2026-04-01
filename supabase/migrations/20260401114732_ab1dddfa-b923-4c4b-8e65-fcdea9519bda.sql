
ALTER TABLE public.lawfirms 
  ADD COLUMN IF NOT EXISTS firm_type text DEFAULT 'unipersonal',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS contact_role text,
  ADD COLUMN IF NOT EXISTS fiscal_name text,
  ADD COLUMN IF NOT EXISTS fiscal_email text,
  ADD COLUMN IF NOT EXISTS fiscal_address text,
  ADD COLUMN IF NOT EXISTS fiscal_city text,
  ADD COLUMN IF NOT EXISTS fiscal_province text,
  ADD COLUMN IF NOT EXISTS fiscal_postal_code text,
  ADD COLUMN IF NOT EXISTS fiscal_model text DEFAULT 'centralized',
  ADD COLUMN IF NOT EXISTS credit_line_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS credit_line_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS has_valid_card boolean DEFAULT false;

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS cif text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS responsible_name text,
  ADD COLUMN IF NOT EXISTS responsible_email text;
