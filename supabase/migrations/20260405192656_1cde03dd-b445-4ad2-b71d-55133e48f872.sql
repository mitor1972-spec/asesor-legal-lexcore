
-- Delete dependent records first (foreign key order)
DELETE FROM lead_history WHERE created_at < '2026-03-25';
DELETE FROM chatwoot_messages WHERE received_at < '2026-03-25';
DELETE FROM chatwoot_import_logs WHERE created_at < '2026-03-25';
DELETE FROM chatwoot_conversations WHERE created_at < '2026-03-25';
DELETE FROM leads WHERE created_at < '2026-03-25';
