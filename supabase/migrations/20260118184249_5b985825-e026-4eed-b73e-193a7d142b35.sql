-- Create table for AI prompts configuration
CREATE TABLE public.ai_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_key TEXT NOT NULL UNIQUE,
  prompt_name TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- Only admins and operators can view/edit prompts
CREATE POLICY "Internal users can view AI prompts"
  ON public.ai_prompts
  FOR SELECT
  USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can update AI prompts"
  ON public.ai_prompts
  FOR UPDATE
  USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can insert AI prompts"
  ON public.ai_prompts
  FOR INSERT
  WITH CHECK (public.is_internal_user(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_ai_prompts_updated_at
  BEFORE UPDATE ON public.ai_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default prompts
INSERT INTO public.ai_prompts (prompt_key, prompt_name, prompt_text, description) VALUES
(
  'marketplace_summary',
  'Resumen para Marketplace',
  'Un párrafo de 3-5 frases que describa de qué trata este caso legal de forma clara y atractiva para abogados. Debe explicar: el tipo de problema legal, la situación del cliente, qué busca conseguir y por qué es un caso interesante. NO incluir datos personales (nombre, teléfono, email). Redactar en tercera persona.',
  'Instrucciones para generar el resumen del lead que se muestra en el marketplace de leads.'
),
(
  'scoring_conclusion',
  'Conclusión del Scoring',
  '2-4 líneas resumiendo el lead y el scoring',
  'Instrucciones para generar la conclusión breve del análisis de scoring Lexcore.'
);