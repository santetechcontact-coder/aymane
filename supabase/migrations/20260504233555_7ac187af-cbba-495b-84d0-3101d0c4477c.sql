
-- 1. Pharmacy: server-side priced order RPC
CREATE OR REPLACE FUNCTION public.create_pharmacy_order(_items jsonb, _delivery_address text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id uuid;
  _total numeric := 0;
  _item jsonb;
  _med medications%ROWTYPE;
  _qty int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Empty cart'; END IF;

  INSERT INTO pharmacy_orders (patient_id, total, delivery_address)
  VALUES (auth.uid(), 0, _delivery_address)
  RETURNING id INTO _order_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    _qty := COALESCE((_item->>'quantity')::int, 0);
    IF _qty <= 0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT * INTO _med FROM medications WHERE id = (_item->>'medication_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Medication not found'; END IF;
    INSERT INTO pharmacy_order_items (order_id, medication_id, quantity, unit_price)
    VALUES (_order_id, _med.id, _qty, _med.price);
    _total := _total + (_med.price * _qty);
  END LOOP;

  UPDATE pharmacy_orders SET total = _total WHERE id = _order_id;
  RETURN _order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_pharmacy_order(jsonb, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_pharmacy_order(jsonb, text) TO authenticated;

-- 2. compute_profile_completeness guard
CREATE OR REPLACE FUNCTION public.compute_profile_completeness(_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _app provider_applications%ROWTYPE; _filled int := 0; _total int := 12;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _user_id <> auth.uid() AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
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
END; $function$;

REVOKE EXECUTE ON FUNCTION public.compute_profile_completeness(uuid) FROM anon;

-- 3. Restrict patient UPDATE on consultations to cancellation only
CREATE OR REPLACE FUNCTION public.guard_consultation_patient_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If updater is the patient (and not the doctor / admin), only allow cancelling
  IF auth.uid() = OLD.patient_id
     AND NOT has_role(auth.uid(), 'admin')
     AND (OLD.doctor_id IS NULL OR auth.uid() <> OLD.doctor_id) THEN
    IF NEW.diagnosis IS DISTINCT FROM OLD.diagnosis
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.doctor_id IS DISTINCT FROM OLD.doctor_id
       OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
       OR NEW.reason IS DISTINCT FROM OLD.reason
       OR NEW.patient_id IS DISTINCT FROM OLD.patient_id THEN
      RAISE EXCEPTION 'Patients can only cancel their consultation';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status::text <> 'cancelled' THEN
        RAISE EXCEPTION 'Patients can only set status to cancelled';
      END IF;
      IF OLD.status::text NOT IN ('pending','confirmed') THEN
        RAISE EXCEPTION 'Consultation cannot be cancelled in its current state';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_consultation_patient_update ON public.consultations;
CREATE TRIGGER trg_guard_consultation_patient_update
BEFORE UPDATE ON public.consultations
FOR EACH ROW EXECUTE FUNCTION public.guard_consultation_patient_update();

-- 4. Doctor oversharing fixes
DROP POLICY IF EXISTS "Doctor sees own consultations" ON public.consultations;
CREATE POLICY "Doctor sees own consultations" ON public.consultations
FOR SELECT USING (auth.uid() = doctor_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Doctor updates consultation" ON public.consultations;
CREATE POLICY "Doctor updates consultation" ON public.consultations
FOR UPDATE USING (auth.uid() = doctor_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Doctor sees prescriptions issued" ON public.prescriptions;
CREATE POLICY "Doctor sees prescriptions issued" ON public.prescriptions
FOR SELECT USING (auth.uid() = doctor_id OR has_role(auth.uid(), 'admin'));

-- Medical records: scope doctor access to patients with whom they have a consultation
DROP POLICY IF EXISTS "Doctors view records" ON public.medical_records;
CREATE POLICY "Doctors view records" ON public.medical_records
FOR SELECT USING (
  has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE c.patient_id = medical_records.patient_id
      AND c.doctor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Doctors update records" ON public.medical_records;
CREATE POLICY "Doctors update records" ON public.medical_records
FOR UPDATE USING (
  has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE c.patient_id = medical_records.patient_id
      AND c.doctor_id = auth.uid()
  )
);

-- 5. user_roles: explicit restrictive policies preventing self-assignment
CREATE POLICY "Block non-admin role inserts" ON public.user_roles
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Block non-admin role updates" ON public.user_roles
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Block non-admin role deletes" ON public.user_roles
AS RESTRICTIVE FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 6. provider_structures: restrict SELECT
DROP POLICY IF EXISTS "Auth users view links" ON public.provider_structures;
CREATE POLICY "Provider sees own links" ON public.provider_structures
FOR SELECT USING (
  auth.uid() = provider_user_id
  OR has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.health_structures s
    WHERE s.id = provider_structures.structure_id AND s.owner_user_id = auth.uid()
  )
);

-- 7. blood_donors: restrict to medical staff / owner
DROP POLICY IF EXISTS "Auth users view donors" ON public.blood_donors;
CREATE POLICY "Medical staff view donors" ON public.blood_donors
FOR SELECT USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'doctor')
  OR has_role(auth.uid(), 'admin')
);

-- 8. admin_audit_log: explicitly block client writes
CREATE POLICY "Block client audit writes" ON public.admin_audit_log
AS RESTRICTIVE FOR INSERT TO authenticated, anon
WITH CHECK (false);

-- 9. Revoke EXECUTE from anon on sensitive SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.approve_provider_application(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_provider_application(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
