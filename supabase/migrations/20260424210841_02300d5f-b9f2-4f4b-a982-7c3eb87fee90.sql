-- 1. Add new roles to the enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hospital';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'clinic';

-- 2. Provider application type enum
DO $$ BEGIN
  CREATE TYPE public.provider_application_type AS ENUM ('doctor', 'pharmacist', 'hospital_clinic', 'pharmacy_officine');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Applications table
CREATE TABLE IF NOT EXISTS public.provider_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  application_type public.provider_application_type NOT NULL,
  status public.provider_application_status NOT NULL DEFAULT 'pending',

  -- Common fields
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  city text,
  address text,

  -- Individual practitioner
  professional_id text,            -- n° d'ordre / agrément personnel
  speciality text,
  diploma_year integer,

  -- Structure
  structure_name text,
  rccm text,                        -- registre du commerce
  ministry_approval text,           -- agrément ministériel
  manager_name text,                -- responsable / pharmacien titulaire

  -- Document URLs (paths inside bucket "provider-documents")
  document_id_url text,             -- pièce d'identité / CNI
  document_diploma_url text,        -- diplôme
  document_order_url text,          -- carte d'ordre
  document_approval_url text,       -- agrément ministériel
  document_rccm_url text,           -- RCCM
  document_manager_id_url text,     -- CNI du responsable

  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_applications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users insert own application"
  ON public.provider_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own application"
  ON public.provider_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all applications"
  ON public.provider_applications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update applications"
  ON public.provider_applications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER update_provider_applications_updated_at
BEFORE UPDATE ON public.provider_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. Storage bucket for documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-documents', 'provider-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: user_id is the first folder segment
CREATE POLICY "Users upload own provider docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'provider-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own provider docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'provider-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins read all provider docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'provider-documents'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users delete own provider docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'provider-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );