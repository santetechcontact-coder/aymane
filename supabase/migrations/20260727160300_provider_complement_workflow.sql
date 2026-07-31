CREATE TABLE IF NOT EXISTS public.provider_application_complement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.provider_applications(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 10 AND 1200),
  missing_items text[] NOT NULL CHECK (cardinality(missing_items) BETWEEN 1 AND 20),
  applicant_response text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_application_one_open_complement_idx
  ON public.provider_application_complement_requests(application_id)
  WHERE resolved_at IS NULL;

CREATE TABLE IF NOT EXISTS public.provider_application_complement_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.provider_application_complement_requests(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 2 AND 160),
  file_path text NOT NULL,
  mime_type text,
  file_size_bytes bigint CHECK (file_size_bytes IS NULL OR file_size_bytes BETWEEN 1 AND 10485760),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_application_complement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_application_complement_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants read own complement requests"
  ON public.provider_application_complement_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.provider_applications application
      WHERE application.id = application_id
        AND application.user_id = auth.uid()
    )
  );
CREATE POLICY "Review team reads complement requests"
  ON public.provider_application_complement_requests FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'application_reviewer'::public.app_role)
  );

CREATE POLICY "Applicants read own complement documents"
  ON public.provider_application_complement_documents FOR SELECT TO authenticated
  USING (applicant_id = auth.uid());
CREATE POLICY "Review team reads complement documents"
  ON public.provider_application_complement_documents FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'application_reviewer'::public.app_role)
  );

REVOKE INSERT, UPDATE, DELETE
  ON public.provider_application_complement_requests
  FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE
  ON public.provider_application_complement_documents
  FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.add_provider_application_complement_document(
  _request_id uuid,
  _label text,
  _file_path text,
  _mime_type text,
  _file_size_bytes bigint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _document_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF char_length(btrim(COALESCE(_label, ''))) < 2 THEN RAISE EXCEPTION 'Document label is required'; END IF;
  IF _file_size_bytes < 1 OR _file_size_bytes > 10485760 THEN RAISE EXCEPTION 'Document size is invalid'; END IF;
  IF split_part(_file_path, '/', 1) <> auth.uid()::text THEN RAISE EXCEPTION 'Document path is invalid'; END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.provider_application_complement_requests request
    JOIN public.provider_applications application ON application.id = request.application_id
    WHERE request.id = _request_id
      AND request.resolved_at IS NULL
      AND application.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Complement request access denied';
  END IF;

  INSERT INTO public.provider_application_complement_documents(
    request_id, applicant_id, label, file_path, mime_type, file_size_bytes
  ) VALUES (
    _request_id, auth.uid(), btrim(_label), _file_path, _mime_type, _file_size_bytes
  )
  RETURNING id INTO _document_id;

  RETURN _document_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_provider_application_complement(
  _application_id uuid,
  _reason text,
  _missing_items text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request_id uuid;
  _app public.provider_applications%ROWTYPE;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'application_reviewer'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Review role required';
  END IF;
  IF char_length(btrim(COALESCE(_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'A detailed reason is required';
  END IF;
  IF COALESCE(cardinality(_missing_items), 0) < 1 THEN
    RAISE EXCEPTION 'At least one missing item is required';
  END IF;

  SELECT * INTO _app
  FROM public.provider_applications
  WHERE id = _application_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF _app.status::text <> 'pending' THEN RAISE EXCEPTION 'Application is already closed'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.provider_application_complement_requests
    WHERE application_id = _application_id AND resolved_at IS NULL
  ) THEN
    RAISE EXCEPTION 'An open complement request already exists';
  END IF;

  INSERT INTO public.provider_application_complement_requests(
    application_id, requested_by, reason, missing_items
  ) VALUES (
    _application_id,
    auth.uid(),
    btrim(_reason),
    ARRAY(
      SELECT DISTINCT btrim(item)
      FROM unnest(_missing_items) item
      WHERE char_length(btrim(item)) > 0
    )
  )
  RETURNING id INTO _request_id;

  INSERT INTO public.notifications(user_id, category, title, body, action_url)
  VALUES (
    _app.user_id,
    'provider_application',
    'Complément demandé',
    btrim(_reason),
    '/dashboard/profile'
  );

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    'provider_complement_requested',
    'provider_application',
    _application_id,
    jsonb_build_object(
      'request_id', _request_id,
      'reason', btrim(_reason),
      'missing_items', _missing_items
    )
  );

  RETURN _request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_provider_application_complement(
  _request_id uuid,
  _response text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request public.provider_application_complement_requests%ROWTYPE;
  _application public.provider_applications%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF char_length(btrim(COALESCE(_response, ''))) < 3 THEN
    RAISE EXCEPTION 'A response is required';
  END IF;

  SELECT * INTO _request
  FROM public.provider_application_complement_requests
  WHERE id = _request_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Complement request not found'; END IF;
  IF _request.resolved_at IS NOT NULL THEN RAISE EXCEPTION 'Complement request is already resolved'; END IF;

  SELECT * INTO _application
  FROM public.provider_applications
  WHERE id = _request.application_id;
  IF _application.user_id <> auth.uid() THEN RAISE EXCEPTION 'Application access denied'; END IF;

  UPDATE public.provider_application_complement_requests
  SET applicant_response = btrim(_response),
      responded_at = now(),
      updated_at = now()
  WHERE id = _request_id;

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    'provider_complement_submitted',
    'provider_application',
    _application.id,
    jsonb_build_object('request_id', _request_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_provider_application_complement(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request public.provider_application_complement_requests%ROWTYPE;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'application_reviewer'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Review role required';
  END IF;

  SELECT * INTO _request
  FROM public.provider_application_complement_requests
  WHERE id = _request_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Complement request not found'; END IF;
  IF _request.responded_at IS NULL THEN RAISE EXCEPTION 'Applicant has not responded yet'; END IF;

  UPDATE public.provider_application_complement_requests
  SET resolved_at = now(), updated_at = now()
  WHERE id = _request_id;

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    'provider_complement_resolved',
    'provider_application',
    _request.application_id,
    jsonb_build_object('request_id', _request_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_provider_application_final_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _latest_complement_response timestamptz;
  _latest_review timestamptz;
BEGIN
  IF NEW.status::text IN ('approved', 'rejected')
     AND OLD.status::text = 'pending'
  THEN
    IF EXISTS (
      SELECT 1
      FROM public.provider_application_complement_requests
      WHERE application_id = NEW.id AND resolved_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Open complement request must be resolved first';
    END IF;

    SELECT max(responded_at) INTO _latest_complement_response
    FROM public.provider_application_complement_requests
    WHERE application_id = NEW.id;

    SELECT max(updated_at) INTO _latest_review
    FROM public.provider_application_reviews
    WHERE application_id = NEW.id;

    IF _latest_complement_response IS NOT NULL
       AND (_latest_review IS NULL OR _latest_review <= _latest_complement_response)
    THEN
      RAISE EXCEPTION 'A new reviewer opinion is required after the complement response';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_provider_application_final_decision
  ON public.provider_applications;
CREATE TRIGGER trg_guard_provider_application_final_decision
BEFORE UPDATE OF status ON public.provider_applications
FOR EACH ROW EXECUTE FUNCTION public.guard_provider_application_final_decision();

REVOKE ALL ON FUNCTION public.request_provider_application_complement(uuid, text, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_provider_application_complement_document(uuid, text, text, text, bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_to_provider_application_complement(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_provider_application_complement(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.guard_provider_application_final_decision() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.request_provider_application_complement(uuid, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_provider_application_complement_document(uuid, text, text, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_provider_application_complement(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_provider_application_complement(uuid) TO authenticated;
GRANT SELECT ON public.provider_application_complement_requests TO authenticated;
GRANT SELECT ON public.provider_application_complement_documents TO authenticated;

DROP TRIGGER IF EXISTS update_provider_application_complements_updated_at
  ON public.provider_application_complement_requests;
CREATE TRIGGER update_provider_application_complements_updated_at
BEFORE UPDATE ON public.provider_application_complement_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
