-- Fase 1: Añadir columnas para gestión de leads descartados
-- discarded_at: timestamp cuando fue descartado automáticamente
-- discard_reason: razón del descarte (missing_contact, duplicate, etc.)

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS discarded_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS discard_reason TEXT DEFAULT NULL;

-- Crear índice para búsquedas eficientes de leads operativos
CREATE INDEX IF NOT EXISTS idx_leads_discarded_at ON public.leads(discarded_at);

-- Crear índice compuesto para filtros de LeadMarket
CREATE INDEX IF NOT EXISTS idx_leads_operational ON public.leads(archived_at, discarded_at) 
WHERE archived_at IS NULL AND discarded_at IS NULL;

-- Comentarios para documentación
COMMENT ON COLUMN public.leads.discarded_at IS 'Timestamp cuando el lead fue descartado automáticamente por falta de contacto válido';
COMMENT ON COLUMN public.leads.discard_reason IS 'Razón del descarte: missing_contact, duplicate, invalid_data, etc.';