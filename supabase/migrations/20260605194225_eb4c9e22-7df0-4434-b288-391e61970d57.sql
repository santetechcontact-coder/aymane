
-- 1. Prescriptions: scope pharmacist view to patients with a pharmacy order
DROP POLICY IF EXISTS "Pharmacists view prescriptions" ON public.prescriptions;
CREATE POLICY "Pharmacists view prescriptions for ordering patients"
ON public.prescriptions
FOR SELECT
USING (
  has_role(auth.uid(), 'pharmacist'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.pharmacy_orders o
    WHERE o.patient_id = prescriptions.patient_id
  )
);

-- 2. Profiles: scope doctor reads to patients with an existing consultation
DROP POLICY IF EXISTS "Doctors view all profiles" ON public.profiles;
CREATE POLICY "Doctors view related patient profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'doctor'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.patient_id = profiles.id AND c.doctor_id = auth.uid()
    )
  )
);

-- 3. provider_structures: prevent providers from self-assigning to any structure
DROP POLICY IF EXISTS "Provider manages own links" ON public.provider_structures;
CREATE POLICY "Provider views own links"
ON public.provider_structures
FOR SELECT
USING (auth.uid() = provider_user_id);
CREATE POLICY "Provider deletes own links"
ON public.provider_structures
FOR DELETE
USING (auth.uid() = provider_user_id);
-- INSERT/UPDATE remain only for structure owners + admins (existing policies)

-- 4. Lab requests: restrict patient updates to cancellation only
CREATE OR REPLACE FUNCTION public.guard_lab_request_patient_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.patient_id
     AND NOT has_role(auth.uid(), 'admin')
     AND NOT has_role(auth.uid(), 'lab_technician')
     AND (OLD.doctor_id IS NULL OR auth.uid() <> OLD.doctor_id) THEN
    IF NEW.total IS DISTINCT FROM OLD.total
       OR NEW.lab_user_id IS DISTINCT FROM OLD.lab_user_id
       OR NEW.structure_id IS DISTINCT FROM OLD.structure_id
       OR NEW.doctor_id IS DISTINCT FROM OLD.doctor_id
       OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
       OR NEW.priority IS DISTINCT FROM OLD.priority
       OR NEW.clinical_notes IS DISTINCT FROM OLD.clinical_notes
       OR NEW.internal_notes IS DISTINCT FROM OLD.internal_notes
       OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
       OR NEW.collected_at IS DISTINCT FROM OLD.collected_at
       OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
       OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at THEN
      RAISE EXCEPTION 'Patients can only cancel their lab request';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status::text <> 'cancelled' THEN
        RAISE EXCEPTION 'Patients can only set status to cancelled';
      END IF;
      IF OLD.status::text NOT IN ('pending') THEN
        RAISE EXCEPTION 'Lab request cannot be cancelled in its current state';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_lab_request_patient_update_trg ON public.lab_requests;
CREATE TRIGGER guard_lab_request_patient_update_trg
BEFORE UPDATE ON public.lab_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_lab_request_patient_update();

-- 5. Revoke EXECUTE on internal trigger-only / admin-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_emergency_dispatched_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guard_consultation_patient_update() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guard_lab_request_patient_update() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_provider_application(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_provider_application(uuid, text) FROM anon, authenticated, PUBLIC;
