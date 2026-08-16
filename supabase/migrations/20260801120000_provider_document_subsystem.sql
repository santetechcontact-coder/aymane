-- =============================================================================
-- Sous-système documentaire des professionnels et structures de santé
-- =============================================================================
-- Jusqu'ici, les pièces déposées à l'inscription professionnelle n'existaient
-- que comme fichiers dans le bucket "provider-documents", leur chemin rangé dans
-- une colonne texte de provider_applications. Aucune métadonnée, aucun statut,
-- aucune journalisation, aucun versionnement, aucune recherche possible.
--
-- Cette migration apporte le backend complet : métadonnées, associations,
-- lecture, téléchargement tracé, archivage, versionnement, statut de traitement
-- (OCR), validation, permissions, journalisation, notifications et recherche.
--
-- La véracité d'une pièce n'est JAMAIS jugée par le système : seul un humain
-- (Administrateur Pro) accepte ou rejette le dossier. Les contrôles ci-dessous
-- portent uniquement sur la forme (poids, type, intégrité), jamais sur le fond.
-- =============================================================================

-- 1. Statut de traitement -----------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.document_processing_status AS ENUM (
    'uploaded',    -- fichier reçu, métadonnées enregistrées
    'processing',  -- extraction/OCR en cours
    'processed',   -- extraction terminée
    'failed'       -- extraction impossible (le dossier reste recevable)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Table principale ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Propriété et association
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.provider_applications(id) ON DELETE CASCADE,
  structure_id uuid REFERENCES public.health_structures(id) ON DELETE SET NULL,
  -- Rattachement générique (consultation, prescription, vaccination…)
  linked_entity_type text CHECK (linked_entity_type IS NULL OR linked_entity_type IN (
    'provider_application', 'health_structure', 'consultation',
    'prescription', 'vaccination', 'lab_request', 'other'
  )),
  linked_entity_id uuid,

  -- Nature de la pièce
  category text NOT NULL CHECK (category IN (
    'cni', 'cv', 'diploma', 'order', 'legal', 'approval', 'rccm',
    'manager_cni', 'photo', 'logo', 'complement', 'other'
  )),
  label text CHECK (label IS NULL OR char_length(btrim(label)) BETWEEN 2 AND 160),

  -- Fichier et métadonnées
  bucket_id text NOT NULL CHECK (bucket_id IN ('provider-documents', 'public-profiles')),
  file_path text NOT NULL,
  original_filename text NOT NULL CHECK (char_length(btrim(original_filename)) BETWEEN 1 AND 255),
  mime_type text NOT NULL CHECK (char_length(btrim(mime_type)) BETWEEN 3 AND 128),
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes BETWEEN 1 AND 20971520), -- 20 Mo
  checksum_sha256 text CHECK (checksum_sha256 IS NULL OR checksum_sha256 ~ '^[a-f0-9]{64}$'),

  -- Versionnement
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  parent_document_id uuid REFERENCES public.provider_documents(id) ON DELETE SET NULL,

  -- Traitement / OCR
  processing_status public.document_processing_status NOT NULL DEFAULT 'uploaded',
  processing_error text,
  extracted_text text,
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz,

  -- Traçabilité
  uploaded_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  UNIQUE (bucket_id, file_path)
);

-- 3. Journal d'accès (journalisation) ----------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_document_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.provider_documents(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('upload', 'view', 'download', 'replace', 'archive', 'process')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Index (lecture et recherche) --------------------------------------------
CREATE INDEX IF NOT EXISTS provider_documents_owner_idx
  ON public.provider_documents(owner_user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS provider_documents_application_idx
  ON public.provider_documents(application_id, category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS provider_documents_status_idx
  ON public.provider_documents(processing_status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS provider_documents_linked_idx
  ON public.provider_documents(linked_entity_type, linked_entity_id) WHERE deleted_at IS NULL;
-- Recherche plein texte : nom de fichier, libellé et texte extrait
CREATE INDEX IF NOT EXISTS provider_documents_search_idx
  ON public.provider_documents
  USING gin (to_tsvector('french',
    coalesce(original_filename, '') || ' ' || coalesce(label, '') || ' ' || coalesce(extracted_text, '')));
CREATE INDEX IF NOT EXISTS provider_document_access_logs_doc_idx
  ON public.provider_document_access_logs(document_id, created_at DESC);

-- 5. Sécurité : RLS -----------------------------------------------------------
ALTER TABLE public.provider_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_document_access_logs ENABLE ROW LEVEL SECURITY;

-- Lecture : le propriétaire, l'administrateur et l'agent dossiers.
DROP POLICY IF EXISTS "Owner reads own documents" ON public.provider_documents;
CREATE POLICY "Owner reads own documents"
  ON public.provider_documents FOR SELECT TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'application_reviewer'::public.app_role)
  );

-- Écriture : uniquement pour soi, via les fonctions ci-dessous.
DROP POLICY IF EXISTS "Owner registers own documents" ON public.provider_documents;
CREATE POLICY "Owner registers own documents"
  ON public.provider_documents FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid() AND uploaded_by = auth.uid());

-- Aucune modification directe : tout passe par les RPC (statut, archivage…).
DROP POLICY IF EXISTS "Block direct document updates" ON public.provider_documents;
CREATE POLICY "Block direct document updates"
  ON public.provider_documents AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false);

-- Aucune suppression physique : archivage uniquement (conservation légale).
DROP POLICY IF EXISTS "Block hard deletes" ON public.provider_documents;
CREATE POLICY "Block hard deletes"
  ON public.provider_documents AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- Journal : lisible par le propriétaire et l'équipe de revue, jamais écrit à la main.
DROP POLICY IF EXISTS "Read own document access log" ON public.provider_document_access_logs;
CREATE POLICY "Read own document access log"
  ON public.provider_document_access_logs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'application_reviewer'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.provider_documents d
      WHERE d.id = document_id AND d.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Block direct access log writes" ON public.provider_document_access_logs;
CREATE POLICY "Block direct access log writes"
  ON public.provider_document_access_logs AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);

REVOKE INSERT, UPDATE, DELETE ON public.provider_document_access_logs FROM authenticated, anon;
GRANT SELECT ON public.provider_document_access_logs TO authenticated;
GRANT SELECT, INSERT ON public.provider_documents TO authenticated;

CREATE TRIGGER update_provider_documents_updated_at
  BEFORE UPDATE ON public.provider_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 6. Enregistrement d'une pièce (après dépôt du fichier) ----------------------
CREATE OR REPLACE FUNCTION public.register_provider_document(
  _bucket_id text,
  _file_path text,
  _category text,
  _original_filename text,
  _mime_type text,
  _file_size_bytes bigint,
  _application_id uuid DEFAULT NULL,
  _label text DEFAULT NULL,
  _checksum_sha256 text DEFAULT NULL,
  _replaces_document_id uuid DEFAULT NULL,
  _linked_entity_type text DEFAULT NULL,
  _linked_entity_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _version integer := 1;
  _prefix text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validation de forme uniquement : le contenu relève de la revue humaine.
  IF _file_size_bytes IS NULL OR _file_size_bytes < 1 OR _file_size_bytes > 20971520 THEN
    RAISE EXCEPTION 'File size must be between 1 byte and 20 MB';
  END IF;

  -- Le fichier doit appartenir au dossier de l'utilisateur (préfixe = son uid).
  _prefix := split_part(_file_path, '/', 1);
  IF _prefix IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'File path must live under the caller own folder';
  END IF;

  -- Versionnement : un remplacement hérite du numéro suivant.
  IF _replaces_document_id IS NOT NULL THEN
    SELECT version + 1 INTO _version
    FROM provider_documents
    WHERE id = _replaces_document_id AND owner_user_id = auth.uid();
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Replaced document not found';
    END IF;

    UPDATE provider_documents
    SET deleted_at = now()
    WHERE id = _replaces_document_id AND deleted_at IS NULL;
  END IF;

  INSERT INTO provider_documents (
    owner_user_id, application_id, category, label, bucket_id, file_path,
    original_filename, mime_type, file_size_bytes, checksum_sha256,
    version, parent_document_id, linked_entity_type, linked_entity_id, uploaded_by
  ) VALUES (
    auth.uid(), _application_id, _category, _label, _bucket_id, _file_path,
    _original_filename, _mime_type, _file_size_bytes, _checksum_sha256,
    _version, _replaces_document_id,
    COALESCE(_linked_entity_type, CASE WHEN _application_id IS NOT NULL THEN 'provider_application' END),
    COALESCE(_linked_entity_id, _application_id),
    auth.uid()
  )
  RETURNING id INTO _id;

  INSERT INTO provider_document_access_logs(document_id, actor_id, action, metadata)
  VALUES (_id, auth.uid(),
          CASE WHEN _replaces_document_id IS NULL THEN 'upload' ELSE 'replace' END,
          jsonb_build_object('category', _category, 'size', _file_size_bytes, 'version', _version));

  RETURN _id;
END;
$$;

-- 7. Journalisation des consultations et téléchargements ----------------------
CREATE OR REPLACE FUNCTION public.log_provider_document_access(
  _document_id uuid,
  _action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _allowed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF _action NOT IN ('view', 'download') THEN
    RAISE EXCEPTION 'Invalid access action';
  END IF;

  SELECT (
    d.owner_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'application_reviewer'::app_role)
  ) INTO _allowed
  FROM provider_documents d WHERE d.id = _document_id;

  IF _allowed IS NOT TRUE THEN
    RAISE EXCEPTION 'Not allowed to access this document';
  END IF;

  INSERT INTO provider_document_access_logs(document_id, actor_id, action)
  VALUES (_document_id, auth.uid(), _action);
END;
$$;

-- 8. Archivage (jamais de suppression physique) -------------------------------
CREATE OR REPLACE FUNCTION public.archive_provider_document(_document_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _owner uuid; _status provider_application_status;
BEGIN
  SELECT d.owner_user_id, a.status INTO _owner, _status
  FROM provider_documents d
  LEFT JOIN provider_applications a ON a.id = d.application_id
  WHERE d.id = _document_id AND d.deleted_at IS NULL;

  IF NOT FOUND THEN RAISE EXCEPTION 'Document not found'; END IF;

  IF _owner <> auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not allowed to archive this document';
  END IF;

  -- Une pièce d'un dossier déjà tranché reste conservée telle quelle.
  IF _status IS NOT NULL AND _status <> 'pending' AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Application is already closed';
  END IF;

  UPDATE provider_documents SET deleted_at = now() WHERE id = _document_id;

  INSERT INTO provider_document_access_logs(document_id, actor_id, action)
  VALUES (_document_id, auth.uid(), 'archive');
END;
$$;

-- 9. Statut de traitement / OCR ----------------------------------------------
CREATE OR REPLACE FUNCTION public.set_provider_document_processing(
  _document_id uuid,
  _status public.document_processing_status,
  _extracted_text text DEFAULT NULL,
  _extracted_data jsonb DEFAULT NULL,
  _error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _owner uuid;
BEGIN
  -- Réservé à l'équipe (ou au service d'extraction via service_role).
  IF NOT (has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'application_reviewer'::app_role)) THEN
    RAISE EXCEPTION 'Reviewer role required';
  END IF;

  UPDATE provider_documents
  SET processing_status = _status,
      extracted_text = COALESCE(_extracted_text, extracted_text),
      extracted_data = COALESCE(_extracted_data, extracted_data),
      processing_error = _error,
      processed_at = CASE WHEN _status IN ('processed', 'failed') THEN now() ELSE processed_at END
  WHERE id = _document_id
  RETURNING owner_user_id INTO _owner;

  IF NOT FOUND THEN RAISE EXCEPTION 'Document not found'; END IF;

  INSERT INTO provider_document_access_logs(document_id, actor_id, action, metadata)
  VALUES (_document_id, auth.uid(), 'process', jsonb_build_object('status', _status));

  -- Notification : seul un échec mérite d'alerter le professionnel.
  IF _status = 'failed' THEN
    INSERT INTO notifications(user_id, category, title, body, action_url)
    VALUES (_owner, 'document',
            'Pièce illisible',
            'Une de vos pièces n''a pas pu être analysée. Vous pouvez la remplacer par une version plus nette.',
            '/dashboard/profile');
  END IF;
END;
$$;

-- 10. Recherche ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_provider_documents(
  _query text DEFAULT NULL,
  _owner_user_id uuid DEFAULT NULL,
  _application_id uuid DEFAULT NULL,
  _category text DEFAULT NULL,
  _status public.document_processing_status DEFAULT NULL,
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _limit integer DEFAULT 50
)
RETURNS SETOF public.provider_documents
LANGUAGE sql
STABLE
SECURITY INVOKER          -- la RLS ci-dessus filtre déjà ce que l'appelant peut voir
SET search_path = public
AS $$
  SELECT *
  FROM provider_documents d
  WHERE d.deleted_at IS NULL
    AND (_owner_user_id IS NULL OR d.owner_user_id = _owner_user_id)
    AND (_application_id IS NULL OR d.application_id = _application_id)
    AND (_category IS NULL OR d.category = _category)
    AND (_status IS NULL OR d.processing_status = _status)
    AND (_from IS NULL OR d.created_at >= _from)
    AND (_to IS NULL OR d.created_at < (_to + 1))
    AND (
      _query IS NULL OR btrim(_query) = '' OR
      to_tsvector('french',
        coalesce(d.original_filename, '') || ' ' ||
        coalesce(d.label, '') || ' ' ||
        coalesce(d.extracted_text, '')) @@ plainto_tsquery('french', _query)
    )
  ORDER BY d.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 50), 200);
$$;

-- 11. Rattachement au dossier -------------------------------------------------
-- Les pièces sont déposées AVANT que la candidature n'existe (le dossier n'est
-- créé qu'à la validation du formulaire). Une fois la candidature enregistrée,
-- on rattache les pièces encore orphelines de leur auteur.
CREATE OR REPLACE FUNCTION public.attach_provider_documents_to_application(
  _application_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM provider_applications
    WHERE id = _application_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  UPDATE provider_documents
  SET application_id = _application_id,
      linked_entity_type = 'provider_application',
      linked_entity_id = _application_id
  WHERE owner_user_id = auth.uid()
    AND application_id IS NULL
    AND deleted_at IS NULL;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

-- 12. Permissions d'exécution -------------------------------------------------
REVOKE ALL ON FUNCTION public.register_provider_document(text, text, text, text, text, bigint, uuid, text, text, uuid, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_provider_document_access(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.archive_provider_document(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_provider_document_processing(uuid, public.document_processing_status, text, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_provider_documents(text, uuid, uuid, text, public.document_processing_status, date, date, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.attach_provider_documents_to_application(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.register_provider_document(text, text, text, text, text, bigint, uuid, text, text, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_provider_document_access(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_provider_document(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_provider_document_processing(uuid, public.document_processing_status, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_provider_documents(text, uuid, uuid, text, public.document_processing_status, date, date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attach_provider_documents_to_application(uuid) TO authenticated;
