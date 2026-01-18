-- Tabla para almacenar API Keys de forma segura
CREATE TABLE public.api_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL UNIQUE,
  key_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Solo admins pueden ver/editar
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage api_settings"
  ON public.api_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_api_settings_updated_at
  BEFORE UPDATE ON public.api_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabla de configuraciones Lexcore con versionado
CREATE TABLE public.lexcore_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  config_json JSONB NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Solo admins pueden gestionar configs
ALTER TABLE public.lexcore_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lexcore_configs"
  ON public.lexcore_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Internal users can read lexcore_configs"
  ON public.lexcore_configs FOR SELECT
  USING (public.is_internal_user(auth.uid()));

-- Función para asegurar solo una config activa
CREATE OR REPLACE FUNCTION public.ensure_single_active_config()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.lexcore_configs
    SET is_active = false
    WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER ensure_single_active_config_trigger
  BEFORE INSERT OR UPDATE ON public.lexcore_configs
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.ensure_single_active_config();

-- Insertar configuración por defecto
INSERT INTO public.lexcore_configs (version_name, is_active, config_json) VALUES (
  'AL v1.0',
  true,
  '{
    "version": "1.0",
    "min_price": 5,
    "max_price": 50,
    "price_steps": [
      {"min_score": 0, "max_score": 14, "price": 5},
      {"min_score": 15, "max_score": 24, "price": 10},
      {"min_score": 25, "max_score": 34, "price": 15},
      {"min_score": 35, "max_score": 44, "price": 20},
      {"min_score": 45, "max_score": 54, "price": 25},
      {"min_score": 55, "max_score": 64, "price": 30},
      {"min_score": 65, "max_score": 74, "price": 35},
      {"min_score": 75, "max_score": 84, "price": 40},
      {"min_score": 85, "max_score": 92, "price": 45},
      {"min_score": 93, "max_score": 100, "price": 50}
    ],
    "weights_mode_a": {
      "contactability": 8,
      "intent": 22,
      "urgency": 8,
      "case_quality": 28,
      "evidence": 22,
      "clarity": 12
    },
    "weights_mode_b": {
      "contactability": 8,
      "intent": 22,
      "case_quality": 32,
      "evidence": 25,
      "clarity": 13
    },
    "patrimonial_caps": [
      {"max_amount": 299, "max_price": 10},
      {"min_amount": 300, "max_amount": 999, "max_price": 15}
    ],
    "vj_allowed_values": [10, 6, 0, -6, -10],
    "vj_max_price_step_change": 1
  }'::jsonb
);

-- Tabla de ejecuciones de scoring (auditoría)
CREATE TABLE public.lexcore_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  config_id UUID REFERENCES public.lexcore_configs(id),
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Modo usado
  mode_used TEXT CHECK (mode_used IN ('A', 'B')),
  
  -- Flags
  flags_json JSONB DEFAULT '{}',
  
  -- Scoring detallado
  raw_scores_json JSONB,
  weighted_scores_json JSONB,
  penalties_json JSONB,
  adjustments_json JSONB,
  vj_json JSONB,
  
  -- Resultados finales
  score_final INTEGER NOT NULL,
  price_lexcore INTEGER NOT NULL,
  price_after_caps INTEGER,
  potential_internal INTEGER,
  
  -- Textos generados
  conclusion_text TEXT,
  audit_table_json JSONB,
  
  -- Respuesta completa del LLM (para auditoría)
  llm_response_json JSONB,
  
  -- Usuario que ejecutó
  executed_by UUID REFERENCES public.profiles(id)
);

-- Índices
CREATE INDEX idx_lexcore_runs_lead ON public.lexcore_runs(lead_id);
CREATE INDEX idx_lexcore_runs_computed ON public.lexcore_runs(computed_at DESC);

-- RLS: Usuarios internos pueden ver runs
ALTER TABLE public.lexcore_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users can view lexcore_runs"
  ON public.lexcore_runs FOR SELECT
  USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can insert lexcore_runs"
  ON public.lexcore_runs FOR INSERT
  WITH CHECK (public.is_internal_user(auth.uid()));