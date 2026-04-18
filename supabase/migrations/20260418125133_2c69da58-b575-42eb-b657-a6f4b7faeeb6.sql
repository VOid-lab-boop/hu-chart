-- Fix function search_path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Make avatars bucket private + authenticated read policy
UPDATE storage.buckets SET public = false WHERE id = 'avatars';

DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Authenticated read avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');