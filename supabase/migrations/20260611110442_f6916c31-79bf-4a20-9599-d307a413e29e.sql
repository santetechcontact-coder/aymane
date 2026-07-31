DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
DROP FUNCTION IF EXISTS public.has_active_subscription(uuid, text);
DROP TABLE IF EXISTS public.subscriptions;