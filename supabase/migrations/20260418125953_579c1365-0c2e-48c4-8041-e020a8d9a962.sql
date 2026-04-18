-- Add lookup columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_university_id_unique;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_university_id_unique UNIQUE (university_id);

CREATE INDEX IF NOT EXISTS idx_profiles_university_id ON public.profiles(university_id);

-- is_admin helper
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

-- Public lookup of email by university_id (so login form can resolve it).
-- Returns NULL if not found. Safe: it does not expose anything beyond the email tied to a known university number.
CREATE OR REPLACE FUNCTION public.email_from_university_id(_uid TEXT)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE university_id = _uid LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.email_from_university_id(TEXT) TO anon, authenticated;

-- Updated trigger: stores email; bootstraps the FIRST account ever created as admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_existing_users INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, university_id, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'university_id',
    NEW.email
  );

  SELECT COUNT(*) INTO v_existing_users FROM public.user_roles;

  IF v_existing_users = 0 THEN
    v_role := 'admin';
  ELSE
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'::app_role);
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  RETURN NEW;
END;
$$;

-- Allow admins to view all profiles (already had supervisor); add admin lookup policy redundancy via existing has_role.
-- (No additional policy needed — existing "Supervisors view all profiles" already covers admins.)

-- Allow admins to update other users' profiles (e.g. set university_id when creating an account)
DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;
CREATE POLICY "Admins update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));