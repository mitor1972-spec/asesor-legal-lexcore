-- Change lead_status enum to 3 simpler states: Pendiente, Enviado, Aceptado
-- First, update existing data to new valid values
UPDATE public.leads SET status_internal = 'Pendiente' WHERE status_internal = 'Derivado';
UPDATE public.leads SET status_internal = 'Pendiente' WHERE status_internal = 'Facturado';
UPDATE public.leads SET status_internal = 'Pendiente' WHERE status_internal = 'Cerrado';

-- Recreate the enum with new values (PostgreSQL doesn't support ALTER ENUM easily)
-- We'll use a workaround: create new enum, update column, drop old enum

-- 1. Create new enum type
CREATE TYPE public.lead_status_new AS ENUM ('Pendiente', 'Enviado', 'Aceptado');

-- 2. Alter the column to use text temporarily
ALTER TABLE public.leads 
  ALTER COLUMN status_internal DROP DEFAULT,
  ALTER COLUMN status_internal TYPE text USING status_internal::text;

-- 3. Update any remaining old values
UPDATE public.leads SET status_internal = 'Pendiente' WHERE status_internal NOT IN ('Pendiente', 'Enviado', 'Aceptado');

-- 4. Convert to new enum type
ALTER TABLE public.leads 
  ALTER COLUMN status_internal TYPE public.lead_status_new USING status_internal::public.lead_status_new,
  ALTER COLUMN status_internal SET DEFAULT 'Pendiente'::public.lead_status_new;

-- 5. Drop old enum and rename new one
DROP TYPE public.lead_status;
ALTER TYPE public.lead_status_new RENAME TO lead_status;