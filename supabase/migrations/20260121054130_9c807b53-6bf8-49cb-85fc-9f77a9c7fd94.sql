-- Add timestamp columns for deduplication (REQUISITO #4)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMP WITH TIME ZONE;

-- Add index for deduplication lookups
CREATE INDEX IF NOT EXISTS idx_leads_conversation_timestamps 
ON public.leads (conversation_id, last_message_at, last_processed_at);

-- Add comment for documentation
COMMENT ON COLUMN public.leads.last_message_at IS 'Timestamp of the last message in the Chatwoot conversation';
COMMENT ON COLUMN public.leads.last_processed_at IS 'Timestamp when this lead was last processed by the pipeline';