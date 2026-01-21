-- STEP 0: Fix ON CONFLICT error - the previous migration already created the constraint
-- Just need to add is_demo to branches since the other columns were already added

-- Add is_demo to branches table (was missing in previous migration)
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;