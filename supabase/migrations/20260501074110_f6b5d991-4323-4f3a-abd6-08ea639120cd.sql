-- Áreas legales y teléfono por sucursal
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS areas_accepted text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS phone text;

-- Áreas legales y teléfono por abogado
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legal_areas text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS phone text;

-- Índices para filtros por área (GIN sobre text[])
CREATE INDEX IF NOT EXISTS idx_branches_areas_accepted ON public.branches USING GIN (areas_accepted);
CREATE INDEX IF NOT EXISTS idx_profiles_legal_areas ON public.profiles USING GIN (legal_areas);