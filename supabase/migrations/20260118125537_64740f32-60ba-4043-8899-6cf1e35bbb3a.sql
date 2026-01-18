-- Table for Chatwoot settings
CREATE TABLE IF NOT EXISTS public.chatwoot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  is_active BOOLEAN DEFAULT true,
  only_resolved_conversations BOOLEAN DEFAULT true,
  auto_process_lexcore BOOLEAN DEFAULT true,
  default_source_channel TEXT DEFAULT 'Web chat',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for Chatwoot conversations to avoid duplicates
CREATE TABLE IF NOT EXISTS public.chatwoot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatwoot_conversation_id BIGINT NOT NULL UNIQUE,
  chatwoot_contact_id BIGINT,
  chatwoot_account_id BIGINT,
  lead_id UUID REFERENCES public.leads(id),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT,
  messages_count INTEGER DEFAULT 0,
  conversation_content TEXT,
  processed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table for Chatwoot import logs
CREATE TABLE IF NOT EXISTS public.chatwoot_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatwoot_conversation_id BIGINT,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  payload_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatwoot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatwoot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatwoot_import_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for chatwoot_settings (only admins)
CREATE POLICY "Admins can manage chatwoot settings"
  ON public.chatwoot_settings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for chatwoot_conversations (internal users)
CREATE POLICY "Internal users can view chatwoot conversations"
  ON public.chatwoot_conversations
  FOR SELECT
  USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can manage chatwoot conversations"
  ON public.chatwoot_conversations
  FOR ALL
  USING (public.is_internal_user(auth.uid()))
  WITH CHECK (public.is_internal_user(auth.uid()));

-- RLS policies for chatwoot_import_logs (internal users)
CREATE POLICY "Internal users can view import logs"
  ON public.chatwoot_import_logs
  FOR SELECT
  USING (public.is_internal_user(auth.uid()));

-- Insert default settings
INSERT INTO public.chatwoot_settings (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_chatwoot_conversations_chatwoot_id ON public.chatwoot_conversations(chatwoot_conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatwoot_conversations_lead_id ON public.chatwoot_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_chatwoot_import_logs_created ON public.chatwoot_import_logs(created_at DESC);