
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit log"
  ON public.admin_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_audit_target ON public.admin_audit_log(target_type, target_id);
CREATE INDEX idx_audit_created ON public.admin_audit_log(created_at DESC);

CREATE OR REPLACE FUNCTION public.approve_provider_application(_application_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _app provider_applications%ROWTYPE; _role app_role;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can approve applications'; END IF;
  SELECT * INTO _app FROM provider_applications WHERE id = _application_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  _role := CASE _app.application_type::text
    WHEN 'doctor' THEN 'doctor'::app_role
    WHEN 'pharmacist' THEN 'pharmacist'::app_role
    WHEN 'dentist' THEN 'dentist'::app_role
    WHEN 'nurse' THEN 'nurse'::app_role
    WHEN 'midwife' THEN 'midwife'::app_role
    WHEN 'lab_technician' THEN 'lab_technician'::app_role
    WHEN 'other_provider' THEN 'other_provider'::app_role
    ELSE NULL END;
  IF _role IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role) VALUES (_app.user_id, _role) ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  UPDATE provider_applications SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid() WHERE id = _application_id;
  IF _app.application_type::text = 'structure' THEN
    UPDATE health_structures SET verified = true WHERE owner_user_id = _app.user_id AND name = _app.structure_name;
  END IF;
  INSERT INTO admin_audit_log(admin_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'approve', 'provider_application', _application_id,
    jsonb_build_object('application_type', _app.application_type, 'applicant_user_id', _app.user_id, 'email', _app.email));
END; $$;

CREATE OR REPLACE FUNCTION public.reject_provider_application(_application_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _app provider_applications%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can reject applications'; END IF;
  SELECT * INTO _app FROM provider_applications WHERE id = _application_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  UPDATE provider_applications SET status = 'rejected', rejection_reason = _reason, reviewed_at = now(), reviewed_by = auth.uid() WHERE id = _application_id;
  INSERT INTO admin_audit_log(admin_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'reject', 'provider_application', _application_id,
    jsonb_build_object('reason', _reason, 'applicant_user_id', _app.user_id, 'email', _app.email));
END; $$;

CREATE OR REPLACE FUNCTION public.compute_profile_completeness(_user_id uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _app provider_applications%ROWTYPE; _filled int := 0; _total int := 12;
BEGIN
  SELECT * INTO _app FROM provider_applications WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF _app.first_name IS NOT NULL AND length(_app.first_name) > 0 THEN _filled := _filled + 1; END IF;
  IF _app.last_name IS NOT NULL AND length(_app.last_name) > 0 THEN _filled := _filled + 1; END IF;
  IF _app.phone IS NOT NULL THEN _filled := _filled + 1; END IF;
  IF _app.city IS NOT NULL THEN _filled := _filled + 1; END IF;
  IF _app.speciality IS NOT NULL THEN _filled := _filled + 1; END IF;
  IF _app.professional_id IS NOT NULL THEN _filled := _filled + 1; END IF;
  IF _app.profile_photo_url IS NOT NULL THEN _filled := _filled + 1; END IF;
  IF _app.document_cni_url IS NOT NULL THEN _filled := _filled + 1; END IF;
  IF _app.document_cv_url IS NOT NULL THEN _filled := _filled + 1; END IF;
  IF _app.document_diploma_url IS NOT NULL THEN _filled := _filled + 1; END IF;
  IF _app.document_order_url IS NOT NULL THEN _filled := _filled + 1; END IF;
  IF _app.professional_address IS NOT NULL THEN _filled := _filled + 1; END IF;
  RETURN (_filled * 100) / _total;
END; $$;

CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_speciality ON public.profiles(speciality);
CREATE INDEX IF NOT EXISTS idx_profiles_fullname_trgm ON public.profiles USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_structures_city ON public.health_structures(city);
CREATE INDEX IF NOT EXISTS idx_structures_type ON public.health_structures(type);
CREATE INDEX IF NOT EXISTS idx_structures_name_trgm ON public.health_structures USING gin(name gin_trgm_ops);
