-- Restreindre l'exécution des nouvelles fonctions admin
REVOKE EXECUTE ON FUNCTION public.approve_provider_application(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_provider_application(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_provider_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_provider_application(uuid, text) TO authenticated;