CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.is_current_health_provider()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text IN (
        'doctor', 'dentist', 'nurse', 'midwife',
        'pharmacist', 'lab_technician', 'other_provider',
        'hospital', 'clinic'
      )
  );
$$;

CREATE TABLE IF NOT EXISTS public.medical_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grantee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permissions text[] NOT NULL DEFAULT ARRAY['read']::text[],
  reason text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, grantee_id)
);

CREATE OR REPLACE FUNCTION public.can_access_patient_record(_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = _patient_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.medical_access_grants grant_row
      WHERE grant_row.patient_id = _patient_id
        AND grant_row.grantee_id = auth.uid()
        AND grant_row.revoked_at IS NULL
        AND grant_row.expires_at > now()
        AND 'read' = ANY(grant_row.permissions)
    )
    OR (
      public.is_current_health_provider()
      AND EXISTS (
        SELECT 1
        FROM public.consultations consultation
        WHERE consultation.patient_id = _patient_id
          AND consultation.doctor_id = auth.uid()
          AND consultation.status::text IN ('confirmed', 'in_progress')
      )
    );
$$;

CREATE TABLE IF NOT EXISTS public.medical_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 160),
  category text NOT NULL CHECK (category IN (
    'analysis', 'imaging', 'report', 'prescription',
    'discharge', 'vaccination', 'other'
  )),
  file_path text NOT NULL,
  mime_type text,
  file_size_bytes bigint CHECK (file_size_bytes IS NULL OR file_size_bytes BETWEEN 1 AND 15728640),
  occurred_on date,
  source_name text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  parent_document_id uuid REFERENCES public.medical_documents(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.vaccinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vaccine_name text NOT NULL CHECK (char_length(btrim(vaccine_name)) BETWEEN 2 AND 120),
  dose_label text,
  administered_on date NOT NULL,
  next_due_on date,
  provider_name text,
  batch_number text,
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hospitalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_name text NOT NULL CHECK (char_length(btrim(facility_name)) BETWEEN 2 AND 160),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 2 AND 500),
  admitted_on date NOT NULL,
  discharged_on date,
  discharge_summary text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (discharged_on IS NULL OR discharged_on >= admitted_on)
);

CREATE TABLE IF NOT EXISTS public.medication_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prescription_id uuid REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  medication_name text NOT NULL CHECK (char_length(btrim(medication_name)) BETWEEN 2 AND 160),
  dosage text NOT NULL CHECK (char_length(btrim(dosage)) BETWEEN 1 AND 120),
  route text,
  start_on date NOT NULL,
  end_on date,
  reminder_times time[] NOT NULL DEFAULT ARRAY[]::time[],
  active boolean NOT NULL DEFAULT true,
  prescriber_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_on IS NULL OR end_on >= start_on)
);

CREATE TABLE IF NOT EXISTS public.medication_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.medication_schedules(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('taken', 'missed', 'skipped')),
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, scheduled_for)
);

CREATE TABLE IF NOT EXISTS public.pregnancy_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  last_menstrual_period date NOT NULL,
  estimated_due_date date NOT NULL,
  care_provider_name text,
  blood_pressure_notes text,
  starting_weight_kg numeric(5,2),
  current_weight_kg numeric(5,2),
  risk_notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (estimated_due_date > last_menstrual_period)
);

CREATE TABLE IF NOT EXISTS public.menstrual_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_on date NOT NULL,
  ended_on date,
  flow_level text CHECK (flow_level IS NULL OR flow_level IN ('light', 'medium', 'heavy')),
  symptoms text[] NOT NULL DEFAULT ARRAY[]::text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, started_on),
  CHECK (ended_on IS NULL OR ended_on >= started_on)
);

CREATE TABLE IF NOT EXISTS public.dependents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 160),
  date_of_birth date NOT NULL,
  relationship text NOT NULL,
  gender text,
  blood_group public.blood_group,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vaccinations
  ADD COLUMN IF NOT EXISTS dependent_id uuid REFERENCES public.dependents(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.growth_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dependent_id uuid NOT NULL REFERENCES public.dependents(id) ON DELETE CASCADE,
  measured_on date NOT NULL,
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  head_circumference_cm numeric(5,2),
  milestone_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dependent_id, measured_on)
);

CREATE TABLE IF NOT EXISTS public.health_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 180),
  summary text NOT NULL CHECK (char_length(btrim(summary)) BETWEEN 10 AND 600),
  category text NOT NULL,
  audience_tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  media_url text,
  body text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  publish_at timestamptz,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medical_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  permissions text[] NOT NULL DEFAULT ARRAY['summary']::text[],
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medical_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 160),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 2 AND 800),
  action_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medical_documents_patient_date_idx
  ON public.medical_documents(patient_id, occurred_on DESC, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS vaccinations_patient_date_idx
  ON public.vaccinations(patient_id, administered_on DESC);
CREATE INDEX IF NOT EXISTS hospitalizations_patient_date_idx
  ON public.hospitalizations(patient_id, admitted_on DESC);
CREATE INDEX IF NOT EXISTS medication_schedules_patient_active_idx
  ON public.medication_schedules(patient_id, active);
CREATE INDEX IF NOT EXISTS medication_intakes_patient_date_idx
  ON public.medication_intakes(patient_id, scheduled_for DESC);
CREATE INDEX IF NOT EXISTS menstrual_cycles_patient_date_idx
  ON public.menstrual_cycles(patient_id, started_on DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE public.medical_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pregnancy_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menstrual_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage own medical grants"
  ON public.medical_access_grants FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Grantees read active grants"
  ON public.medical_access_grants FOR SELECT TO authenticated
  USING (grantee_id = auth.uid() AND revoked_at IS NULL AND expires_at > now());

CREATE POLICY "Patients manage own medical documents"
  ON public.medical_documents FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid() AND created_by = auth.uid());
CREATE POLICY "Authorized care team reads medical documents"
  ON public.medical_documents FOR SELECT TO authenticated
  USING (public.can_access_patient_record(patient_id));

CREATE POLICY "Patients manage own vaccinations"
  ON public.vaccinations FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Authorized care team reads vaccinations"
  ON public.vaccinations FOR SELECT TO authenticated
  USING (public.can_access_patient_record(patient_id));
CREATE POLICY "Authorized providers add vaccinations"
  ON public.vaccinations FOR INSERT TO authenticated
  WITH CHECK (public.is_current_health_provider() AND public.can_access_patient_record(patient_id));

CREATE POLICY "Patients manage own hospitalizations"
  ON public.hospitalizations FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Authorized care team reads hospitalizations"
  ON public.hospitalizations FOR SELECT TO authenticated
  USING (public.can_access_patient_record(patient_id));
CREATE POLICY "Authorized providers add hospitalizations"
  ON public.hospitalizations FOR INSERT TO authenticated
  WITH CHECK (public.is_current_health_provider() AND public.can_access_patient_record(patient_id));

CREATE POLICY "Patients manage own medication schedules"
  ON public.medication_schedules FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Authorized care team reads medication schedules"
  ON public.medication_schedules FOR SELECT TO authenticated
  USING (public.can_access_patient_record(patient_id));

CREATE POLICY "Patients manage own medication intakes"
  ON public.medication_intakes FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (
    patient_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.medication_schedules schedule
      WHERE schedule.id = schedule_id AND schedule.patient_id = auth.uid()
    )
  );
CREATE POLICY "Authorized care team reads medication intakes"
  ON public.medication_intakes FOR SELECT TO authenticated
  USING (public.can_access_patient_record(patient_id));

CREATE POLICY "Patients manage own pregnancy profile"
  ON public.pregnancy_profiles FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Patients manage own cycles"
  ON public.menstrual_cycles FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Guardians manage dependents"
  ON public.dependents FOR ALL TO authenticated
  USING (guardian_id = auth.uid())
  WITH CHECK (guardian_id = auth.uid());
CREATE POLICY "Guardians manage growth records"
  ON public.growth_records FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dependents dependent
      WHERE dependent.id = dependent_id AND dependent.guardian_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dependents dependent
      WHERE dependent.id = dependent_id AND dependent.guardian_id = auth.uid()
    )
  );

CREATE POLICY "Published health content is readable"
  ON public.health_contents FOR SELECT
  USING (status = 'published' AND COALESCE(publish_at, now()) <= now());
CREATE POLICY "Admins manage health content"
  ON public.health_contents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Patients manage own share links"
  ON public.medical_share_links FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Patients read own access history"
  ON public.medical_access_logs FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users mark own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.medical_access_logs FROM authenticated, anon;
REVOKE INSERT, DELETE ON public.notifications FROM authenticated, anon;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('medical-documents', 'medical-documents', false, 15728640)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit;

CREATE POLICY "Patients upload own medical documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'medical-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Patients read own medical document files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'medical-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Patients delete own medical document files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'medical-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE OR REPLACE FUNCTION public.create_medical_share_link(_duration_hours integer DEFAULT 24)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _duration_hours < 1 OR _duration_hours > 168 THEN
    RAISE EXCEPTION 'Share duration must be between 1 and 168 hours';
  END IF;

  INSERT INTO public.medical_share_links(patient_id, expires_at)
  VALUES (auth.uid(), now() + make_interval(hours => _duration_hours))
  RETURNING token INTO _token;

  INSERT INTO public.medical_access_logs(
    patient_id, actor_id, action, resource_type, reason, metadata
  ) VALUES (
    auth.uid(), auth.uid(), 'create_share_link', 'medical_record',
    'Partage temporaire créé par le patient',
    jsonb_build_object('duration_hours', _duration_hours)
  );

  RETURN _token;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_shared_medical_summary(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _patient_id uuid;
  _result jsonb;
BEGIN
  SELECT patient_id INTO _patient_id
  FROM public.medical_share_links
  WHERE token = _token
    AND revoked_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN RAISE EXCEPTION 'Share link is invalid or expired'; END IF;

  SELECT jsonb_build_object(
    'profile', (
      SELECT jsonb_build_object(
        'full_name', profile.full_name,
        'city', profile.city
      )
      FROM public.profiles profile
      WHERE profile.id = _patient_id
    ),
    'medical_record', (
      SELECT to_jsonb(record_row) - 'id' - 'patient_id' - 'created_at' - 'updated_at'
      FROM public.medical_records record_row
      WHERE record_row.patient_id = _patient_id
    ),
    'vaccinations', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'vaccine_name', vaccine_name,
          'dose_label', dose_label,
          'administered_on', administered_on,
          'next_due_on', next_due_on
        )
        ORDER BY administered_on DESC
      )
      FROM public.vaccinations
      WHERE patient_id = _patient_id
    ), '[]'::jsonb),
    'hospitalizations', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'facility_name', facility_name,
          'reason', reason,
          'admitted_on', admitted_on,
          'discharged_on', discharged_on,
          'discharge_summary', discharge_summary
        )
        ORDER BY admitted_on DESC
      )
      FROM public.hospitalizations
      WHERE patient_id = _patient_id
    ), '[]'::jsonb),
    'prescriptions', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'medication_name', medication_name,
          'dosage', dosage,
          'duration', duration,
          'instructions', instructions,
          'created_at', created_at
        )
        ORDER BY created_at DESC
      )
      FROM (
        SELECT *
        FROM public.prescriptions
        WHERE patient_id = _patient_id
        ORDER BY created_at DESC
        LIMIT 20
      ) prescription_rows
    ), '[]'::jsonb)
  ) INTO _result;

  INSERT INTO public.medical_access_logs(
    patient_id, actor_id, action, resource_type, reason, metadata
  ) VALUES (
    _patient_id, auth.uid(), 'read_shared_record', 'medical_record',
    'Consultation via lien temporaire',
    jsonb_build_object('share_token', _token)
  );

  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_medical_access(
  _patient_id uuid,
  _resource_type text,
  _resource_id uuid,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_access_patient_record(_patient_id) THEN
    RAISE EXCEPTION 'Medical record access denied';
  END IF;
  IF char_length(btrim(COALESCE(_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'Access reason is required';
  END IF;

  INSERT INTO public.medical_access_logs(
    patient_id, actor_id, action, resource_type, resource_id, reason
  ) VALUES (
    _patient_id, auth.uid(), 'read', _resource_type, _resource_id, btrim(_reason)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_current_health_provider() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_patient_record(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_medical_share_link(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_medical_access(uuid, text, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_shared_medical_summary(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_current_health_provider() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_patient_record(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_medical_share_link(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_medical_access(uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_medical_summary(uuid) TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_access_grants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vaccinations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitalizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medication_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medication_intakes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pregnancy_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menstrual_cycles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dependents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_records TO authenticated;
GRANT SELECT ON public.health_contents TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.health_contents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_share_links TO authenticated;
GRANT SELECT ON public.medical_access_logs TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

DROP TRIGGER IF EXISTS update_medical_access_grants_updated_at ON public.medical_access_grants;
CREATE TRIGGER update_medical_access_grants_updated_at
BEFORE UPDATE ON public.medical_access_grants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_medical_documents_updated_at ON public.medical_documents;
CREATE TRIGGER update_medical_documents_updated_at
BEFORE UPDATE ON public.medical_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_vaccinations_updated_at ON public.vaccinations;
CREATE TRIGGER update_vaccinations_updated_at
BEFORE UPDATE ON public.vaccinations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_hospitalizations_updated_at ON public.hospitalizations;
CREATE TRIGGER update_hospitalizations_updated_at
BEFORE UPDATE ON public.hospitalizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_medication_schedules_updated_at ON public.medication_schedules;
CREATE TRIGGER update_medication_schedules_updated_at
BEFORE UPDATE ON public.medication_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_pregnancy_profiles_updated_at ON public.pregnancy_profiles;
CREATE TRIGGER update_pregnancy_profiles_updated_at
BEFORE UPDATE ON public.pregnancy_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_menstrual_cycles_updated_at ON public.menstrual_cycles;
CREATE TRIGGER update_menstrual_cycles_updated_at
BEFORE UPDATE ON public.menstrual_cycles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_dependents_updated_at ON public.dependents;
CREATE TRIGGER update_dependents_updated_at
BEFORE UPDATE ON public.dependents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_health_contents_updated_at ON public.health_contents;
CREATE TRIGGER update_health_contents_updated_at
BEFORE UPDATE ON public.health_contents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
