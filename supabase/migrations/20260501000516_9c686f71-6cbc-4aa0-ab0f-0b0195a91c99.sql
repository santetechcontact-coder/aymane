-- 1. Étendre l'enum app_role avec les nouvelles professions
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dentist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'nurse';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'midwife';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lab_technician';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'other_provider';

-- 2. Étendre l'enum provider_application_type
ALTER TYPE public.provider_application_type ADD VALUE IF NOT EXISTS 'dentist';
ALTER TYPE public.provider_application_type ADD VALUE IF NOT EXISTS 'nurse';
ALTER TYPE public.provider_application_type ADD VALUE IF NOT EXISTS 'midwife';
ALTER TYPE public.provider_application_type ADD VALUE IF NOT EXISTS 'lab_technician';
ALTER TYPE public.provider_application_type ADD VALUE IF NOT EXISTS 'other_provider';
ALTER TYPE public.provider_application_type ADD VALUE IF NOT EXISTS 'structure';

-- 3. Type de structure de santé
DO $$ BEGIN
  CREATE TYPE public.health_structure_type AS ENUM (
    'hospital', 'clinic', 'medical_office', 'dental_office',
    'lab', 'pharmacy', 'health_center', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. Étendre provider_applications avec les nouveaux champs
ALTER TABLE public.provider_applications
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS professional_address text,
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS document_cv_url text,
  ADD COLUMN IF NOT EXISTS document_cni_url text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS structure_type public.health_structure_type,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS phone_landline text,
  ADD COLUMN IF NOT EXISTS phone_mobile text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS document_legal_url text,
  ADD COLUMN IF NOT EXISTS linked_structure_ids uuid[];

-- 5. Table des structures de santé validées
CREATE TABLE IF NOT EXISTS public.health_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  type public.health_structure_type NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  region text,
  phone_landline text NOT NULL,
  phone_mobile text,
  email text NOT NULL,
  manager_name text NOT NULL,
  logo_url text,
  description text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.health_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users view verified structures"
  ON public.health_structures FOR SELECT TO authenticated
  USING (verified = true OR owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner manages own structure"
  ON public.health_structures FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Admin manages all structures"
  ON public.health_structures FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_health_structures_updated_at
  BEFORE UPDATE ON public.health_structures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 6. Table de liaison pro <-> structures (many-to-many)
CREATE TABLE IF NOT EXISTS public.provider_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_user_id uuid NOT NULL,
  structure_id uuid NOT NULL REFERENCES public.health_structures(id) ON DELETE CASCADE,
  role_at_structure text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_user_id, structure_id)
);

ALTER TABLE public.provider_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users view links"
  ON public.provider_structures FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Provider manages own links"
  ON public.provider_structures FOR ALL
  USING (auth.uid() = provider_user_id)
  WITH CHECK (auth.uid() = provider_user_id);

CREATE POLICY "Structure owner manages links"
  ON public.provider_structures FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.health_structures s
    WHERE s.id = provider_structures.structure_id AND s.owner_user_id = auth.uid()
  ));

CREATE POLICY "Admin manages all links"
  ON public.provider_structures FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- 7. Étendre profiles avec photo professionnelle et bio
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS professional_photo_url text,
  ADD COLUMN IF NOT EXISTS speciality text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS professional_address text;

-- 8. Storage bucket public pour photos pros et logos structures
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-profiles', 'public-profiles', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read profiles bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-profiles');

CREATE POLICY "Auth users upload own profile assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'public-profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own profile assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'public-profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own profile assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'public-profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 9. Quand admin valide une candidature, fonction qui attribue le bon rôle
CREATE OR REPLACE FUNCTION public.approve_provider_application(_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _app provider_applications%ROWTYPE;
  _role app_role;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve applications';
  END IF;

  SELECT * INTO _app FROM provider_applications WHERE id = _application_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;

  -- Map application_type -> app_role
  _role := CASE _app.application_type::text
    WHEN 'doctor' THEN 'doctor'::app_role
    WHEN 'pharmacist' THEN 'pharmacist'::app_role
    WHEN 'dentist' THEN 'dentist'::app_role
    WHEN 'nurse' THEN 'nurse'::app_role
    WHEN 'midwife' THEN 'midwife'::app_role
    WHEN 'lab_technician' THEN 'lab_technician'::app_role
    WHEN 'other_provider' THEN 'other_provider'::app_role
    ELSE NULL
  END;

  IF _role IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role) VALUES (_app.user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  UPDATE provider_applications
    SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = _application_id;

  -- Si structure, marque verified
  IF _app.application_type::text = 'structure' THEN
    UPDATE health_structures SET verified = true
      WHERE owner_user_id = _app.user_id AND name = _app.structure_name;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_provider_application(_application_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject applications';
  END IF;

  UPDATE provider_applications
    SET status = 'rejected', rejection_reason = _reason,
        reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = _application_id;
END;
$$;