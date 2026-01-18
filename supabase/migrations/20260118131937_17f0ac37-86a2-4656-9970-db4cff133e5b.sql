-- Create webhook_logs table to capture ALL incoming requests
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'chatwoot',
  event_type TEXT,
  method TEXT,
  path TEXT,
  query_params JSONB,
  headers JSONB,
  payload JSONB,
  result TEXT NOT NULL DEFAULT 'pending', -- 'success', 'error', 'ignored', 'pending'
  error_message TEXT,
  processing_time_ms INTEGER
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only internal users can view logs
CREATE POLICY "Internal users can view webhook logs"
ON public.webhook_logs
FOR SELECT
USING (is_internal_user(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_source ON public.webhook_logs(source);
CREATE INDEX idx_webhook_logs_result ON public.webhook_logs(result);