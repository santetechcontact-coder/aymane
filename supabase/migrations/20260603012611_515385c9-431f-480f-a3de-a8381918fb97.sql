
-- 1) Move pg_trgm extension out of public schema
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- 2) Lock down SECURITY DEFINER functions: revoke broad EXECUTE, grant only where intended.
-- Trigger / internal helpers should not be callable by API roles.
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_emergency_dispatched_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_consultation_patient_update() FROM PUBLIC, anon, authenticated;

-- has_role is only used inside RLS policies (runs as definer); no need to expose via API.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;

-- RPCs intentionally callable: scope EXECUTE narrowly.
REVOKE EXECUTE ON FUNCTION public.create_pharmacy_order(jsonb, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_pharmacy_order(jsonb, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.compute_profile_completeness(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.compute_profile_completeness(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.approve_provider_application(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.approve_provider_application(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reject_provider_application(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reject_provider_application(uuid, text) TO authenticated;

-- get_emergency_public_status is intentionally public (token-based tracking link).
REVOKE EXECUTE ON FUNCTION public.get_emergency_public_status(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_emergency_public_status(uuid) TO anon, authenticated;

-- 3) Public bucket listing: replace broad SELECT policy so clients can't enumerate all files.
-- Files remain readable via public CDN URLs (getPublicUrl), which don't go through RLS.
DROP POLICY IF EXISTS "Public read profiles bucket" ON storage.objects;

CREATE POLICY "Owners read own profile assets"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'public-profiles'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
