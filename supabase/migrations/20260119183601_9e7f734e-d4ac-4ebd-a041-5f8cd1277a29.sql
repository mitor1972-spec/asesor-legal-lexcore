ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS conversation_id bigint;

-- Backfill conversation_id from chatwoot_conversations where the conversation maps to exactly 1 lead
WITH conv_map AS (
  SELECT lead_id, chatwoot_conversation_id
  FROM public.chatwoot_conversations
  WHERE lead_id IS NOT NULL
),
unique_conversations AS (
  SELECT chatwoot_conversation_id
  FROM conv_map
  GROUP BY chatwoot_conversation_id
  HAVING COUNT(*) = 1
),
unique_map AS (
  SELECT cm.lead_id, cm.chatwoot_conversation_id
  FROM conv_map cm
  JOIN unique_conversations uc
    ON uc.chatwoot_conversation_id = cm.chatwoot_conversation_id
)
UPDATE public.leads l
SET conversation_id = um.chatwoot_conversation_id
FROM unique_map um
WHERE l.id = um.lead_id
  AND l.conversation_id IS NULL;

-- Ensure uniqueness for non-null conversation_id (needed for deterministic UPSERT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'leads_conversation_id_key'
  ) THEN
    CREATE UNIQUE INDEX leads_conversation_id_key
      ON public.leads (conversation_id)
      WHERE conversation_id IS NOT NULL;
  END IF;
END $$;
