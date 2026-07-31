CREATE TABLE IF NOT EXISTS public.provider_application_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.provider_applications(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opinion text NOT NULL CHECK (opinion IN ('favorable', 'unfavorable')),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 10 AND 1200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, reviewer_id)
);

ALTER TABLE public.provider_application_reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.provider_application_reviews TO authenticated;

CREATE INDEX IF NOT EXISTS provider_application_reviews_application_idx
  ON public.provider_application_reviews(application_id, updated_at DESC);

CREATE POLICY "Review team reads provider opinions"
  ON public.provider_application_reviews FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'application_reviewer'::public.app_role)
  );

CREATE POLICY "Block direct provider opinion writes"
  ON public.provider_application_reviews AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "Application reviewers read applications"
  ON public.provider_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'application_reviewer'::public.app_role));

CREATE POLICY "Application reviewers read provider documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'provider-documents'
    AND public.has_role(auth.uid(), 'application_reviewer'::public.app_role)
  );

CREATE OR REPLACE FUNCTION public.submit_provider_application_opinion(
  _application_id uuid,
  _opinion text,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _status public.provider_application_status;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'application_reviewer'::app_role)
  ) THEN
    RAISE EXCEPTION 'Reviewer role required';
  END IF;

  IF _opinion NOT IN ('favorable', 'unfavorable') THEN
    RAISE EXCEPTION 'Invalid opinion';
  END IF;

  IF char_length(btrim(COALESCE(_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'A detailed reason is required';
  END IF;

  SELECT status INTO _status
  FROM provider_applications
  WHERE id = _application_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF _status <> 'pending' THEN RAISE EXCEPTION 'Application is already closed'; END IF;

  INSERT INTO provider_application_reviews (
    application_id, reviewer_id, opinion, reason
  ) VALUES (
    _application_id, auth.uid(), _opinion, btrim(_reason)
  )
  ON CONFLICT (application_id, reviewer_id) DO UPDATE SET
    opinion = EXCLUDED.opinion,
    reason = EXCLUDED.reason,
    updated_at = now();

  INSERT INTO admin_audit_log(admin_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    'provider_opinion',
    'provider_application',
    _application_id,
    jsonb_build_object('opinion', _opinion, 'reason', btrim(_reason))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_application_reviewer(_user_id uuid, _enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only full admins can manage reviewers';
  END IF;

  IF _enabled THEN
    INSERT INTO user_roles(user_id, role)
    VALUES (_user_id, 'application_reviewer'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM user_roles
    WHERE user_id = _user_id AND role = 'application_reviewer'::app_role;
  END IF;

  INSERT INTO admin_audit_log(admin_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    CASE WHEN _enabled THEN 'reviewer_grant' ELSE 'reviewer_revoke' END,
    'user',
    _user_id,
    jsonb_build_object('role', 'application_reviewer')
  );
END;
$$;

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
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only full admins can approve applications';
  END IF;

  SELECT * INTO _app FROM provider_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF _app.status <> 'pending' THEN RAISE EXCEPTION 'Application is already closed'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM provider_application_reviews WHERE application_id = _application_id
  ) THEN
    RAISE EXCEPTION 'A reviewer opinion is required';
  END IF;

  _role := CASE _app.application_type::text
    WHEN 'doctor' THEN 'doctor'::app_role
    WHEN 'pharmacist' THEN 'pharmacist'::app_role
    WHEN 'dentist' THEN 'dentist'::app_role
    WHEN 'nurse' THEN 'nurse'::app_role
    WHEN 'midwife' THEN 'midwife'::app_role
    WHEN 'lab_technician' THEN 'lab_technician'::app_role
    WHEN 'other_provider' THEN 'other_provider'::app_role
    WHEN 'structure' THEN CASE
      WHEN _app.structure_type::text = 'hospital' THEN 'hospital'::app_role
      ELSE 'clinic'::app_role
    END
    ELSE NULL
  END;

  IF _role IS NOT NULL THEN
    INSERT INTO user_roles(user_id, role)
    VALUES (_app.user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  UPDATE provider_applications
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = NULL
  WHERE id = _application_id;

  IF _app.application_type::text = 'structure' THEN
    UPDATE health_structures
    SET verified = true
    WHERE owner_user_id = _app.user_id AND name = _app.structure_name;
  END IF;

  INSERT INTO admin_audit_log(admin_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(), 'approve', 'provider_application', _application_id,
    jsonb_build_object(
      'application_type', _app.application_type,
      'applicant_user_id', _app.user_id,
      'assigned_role', _role
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_provider_application(_application_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _app provider_applications%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only full admins can reject applications';
  END IF;
  IF char_length(btrim(COALESCE(_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'A detailed rejection reason is required';
  END IF;

  SELECT * INTO _app FROM provider_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF _app.status <> 'pending' THEN RAISE EXCEPTION 'Application is already closed'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM provider_application_reviews WHERE application_id = _application_id
  ) THEN
    RAISE EXCEPTION 'A reviewer opinion is required';
  END IF;

  UPDATE provider_applications
  SET status = 'rejected', rejection_reason = btrim(_reason), reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = _application_id;

  INSERT INTO admin_audit_log(admin_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(), 'reject', 'provider_application', _application_id,
    jsonb_build_object('reason', btrim(_reason), 'applicant_user_id', _app.user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_provider_application_opinion(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_application_reviewer(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_provider_application(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_provider_application(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_provider_application_opinion(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_application_reviewer(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_provider_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_provider_application(uuid, text) TO authenticated;
