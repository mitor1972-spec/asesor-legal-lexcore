-- Create table to accumulate Chatwoot messages in real-time
CREATE TABLE public.chatwoot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id INTEGER NOT NULL,
  message_id INTEGER UNIQUE,
  sender_type TEXT, -- 'contact', 'agent', 'system'
  sender_name TEXT,
  content TEXT,
  message_created_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL
);

-- Create indexes for efficient lookups
CREATE INDEX idx_chatwoot_messages_conv ON public.chatwoot_messages(conversation_id);
CREATE INDEX idx_chatwoot_messages_msg ON public.chatwoot_messages(message_id);
CREATE INDEX idx_chatwoot_messages_processed ON public.chatwoot_messages(processed);

-- Enable RLS
ALTER TABLE public.chatwoot_messages ENABLE ROW LEVEL SECURITY;

-- Create policies - only internal users can access
CREATE POLICY "Internal users can view chatwoot_messages"
ON public.chatwoot_messages
FOR SELECT
USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can manage chatwoot_messages"
ON public.chatwoot_messages
FOR ALL
USING (public.is_internal_user(auth.uid()));

-- Allow service role (edge functions) full access
CREATE POLICY "Service role has full access to chatwoot_messages"
ON public.chatwoot_messages
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');