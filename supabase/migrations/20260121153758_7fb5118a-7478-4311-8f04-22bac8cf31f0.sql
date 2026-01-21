-- Fix ON CONFLICT failures: replace partial unique index on leads.conversation_id
-- The webhook uses UPSERT ... ON CONFLICT (conversation_id), which cannot target a partial unique index.

DROP INDEX IF EXISTS public.leads_conversation_id_key;

-- Unique index allows multiple NULLs, so no partial predicate is needed.
CREATE UNIQUE INDEX leads_conversation_id_key ON public.leads (conversation_id);
