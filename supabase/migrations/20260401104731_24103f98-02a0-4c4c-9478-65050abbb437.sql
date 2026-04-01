-- Add missing columns to master_specialties (safe, non-destructive)
ALTER TABLE public.master_specialties
  ADD COLUMN IF NOT EXISTS visible_marketplace boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allows_override boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;