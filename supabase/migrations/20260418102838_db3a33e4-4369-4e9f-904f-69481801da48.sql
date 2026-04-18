
-- ============================================================
-- 1) VOICE NOTES STORAGE: enforce per-user folder ownership
-- ============================================================
-- Convention: files MUST be uploaded under a folder named with the user's UUID
-- e.g. <user_id>/recording-2026-04-18.webm

DROP POLICY IF EXISTS "Users can upload their own voice notes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view voice notes they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own voice notes" ON storage.objects;

CREATE POLICY "Voice notes: users upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Voice notes: users view their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Voice notes: users delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Internal staff can manage all voice notes for support / quality control
CREATE POLICY "Voice notes: internal users full access"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'voice-notes' AND public.is_internal_user(auth.uid()))
WITH CHECK (bucket_id = 'voice-notes' AND public.is_internal_user(auth.uid()));

-- ============================================================
-- 2) LEGAL_SERVICES: restrict public catalog to authenticated users
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view active services" ON public.legal_services;

CREATE POLICY "Authenticated users can view active services"
ON public.legal_services
FOR SELECT
TO authenticated
USING (status = 'active');
