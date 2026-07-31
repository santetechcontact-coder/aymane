DO $$
BEGIN
  CREATE TYPE public.local_payment_provider AS ENUM ('wave', 'orange_money', 'free_money', 'paydunya');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.local_payment_status AS ENUM ('pending', 'awaiting_provider', 'paid', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.local_payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'subscription',
  plan_id text,
  billing_interval text,
  order_id uuid REFERENCES public.pharmacy_orders(id) ON DELETE SET NULL,
  provider public.local_payment_provider NOT NULL,
  payer_phone text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'XOF',
  status public.local_payment_status NOT NULL DEFAULT 'pending',
  reference text NOT NULL UNIQUE DEFAULT ('AYM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (billing_interval IS NULL OR billing_interval IN ('monthly', 'yearly')),
  CHECK (channel IN ('subscription', 'pharmacy_order'))
);

ALTER TABLE public.local_payment_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_local_payment_requests_user_id
  ON public.local_payment_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_local_payment_requests_reference
  ON public.local_payment_requests(reference);

CREATE INDEX IF NOT EXISTS idx_local_payment_requests_status
  ON public.local_payment_requests(status);

DROP POLICY IF EXISTS "Users view own local payment requests" ON public.local_payment_requests;
CREATE POLICY "Users view own local payment requests"
  ON public.local_payment_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage local payment requests" ON public.local_payment_requests;
CREATE POLICY "Admins manage local payment requests"
  ON public.local_payment_requests
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_local_payment_requests_updated_at ON public.local_payment_requests;
CREATE TRIGGER trg_local_payment_requests_updated_at
  BEFORE UPDATE ON public.local_payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.create_local_payment_request(
  _plan_id text,
  _billing_interval text,
  _provider text,
  _payer_phone text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request_id uuid;
  _normalized_plan text := lower(trim(_plan_id));
  _normalized_interval text := lower(trim(_billing_interval));
  _normalized_provider text := lower(trim(_provider));
  _normalized_phone text := regexp_replace(coalesce(_payer_phone, ''), '[^0-9+]', '', 'g');
  _amount integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _normalized_provider NOT IN ('wave', 'orange_money', 'free_money', 'paydunya') THEN
    RAISE EXCEPTION 'Payment provider not supported';
  END IF;

  IF _normalized_interval NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'Billing interval not supported';
  END IF;

  IF length(_normalized_phone) < 9 OR length(_normalized_phone) > 16 THEN
    RAISE EXCEPTION 'Phone number invalid';
  END IF;

  _amount := CASE _normalized_plan
    WHEN 'essentiel' THEN CASE _normalized_interval WHEN 'monthly' THEN 3000 ELSE 30000 END
    WHEN 'premium' THEN CASE _normalized_interval WHEN 'monthly' THEN 9000 ELSE 90000 END
    WHEN 'famille' THEN CASE _normalized_interval WHEN 'monthly' THEN 15000 ELSE 150000 END
    ELSE NULL
  END;

  IF _amount IS NULL THEN
    RAISE EXCEPTION 'Plan not supported';
  END IF;

  INSERT INTO public.local_payment_requests (
    user_id,
    channel,
    plan_id,
    billing_interval,
    provider,
    payer_phone,
    amount,
    metadata
  )
  VALUES (
    auth.uid(),
    'subscription',
    _normalized_plan,
    _normalized_interval,
    _normalized_provider::public.local_payment_provider,
    _normalized_phone,
    _amount,
    jsonb_build_object('source', 'pricing')
  )
  RETURNING id INTO _request_id;

  RETURN _request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_local_payment_request(text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_local_payment_request(text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_local_payment_request_for_order(
  _order_id uuid,
  _provider text,
  _payer_phone text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request_id uuid;
  _normalized_provider text := lower(trim(_provider));
  _normalized_phone text := regexp_replace(coalesce(_payer_phone, ''), '[^0-9+]', '', 'g');
  _order public.pharmacy_orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _normalized_provider NOT IN ('wave', 'orange_money', 'free_money', 'paydunya') THEN
    RAISE EXCEPTION 'Payment provider not supported';
  END IF;

  IF length(_normalized_phone) < 9 OR length(_normalized_phone) > 16 THEN
    RAISE EXCEPTION 'Phone number invalid';
  END IF;

  SELECT *
    INTO _order
    FROM public.pharmacy_orders
   WHERE id = _order_id
     AND patient_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF _order.total <= 0 THEN
    RAISE EXCEPTION 'Order total invalid';
  END IF;

  INSERT INTO public.local_payment_requests (
    user_id,
    channel,
    order_id,
    provider,
    payer_phone,
    amount,
    metadata
  )
  VALUES (
    auth.uid(),
    'pharmacy_order',
    _order.id,
    _normalized_provider::public.local_payment_provider,
    _normalized_phone,
    ceil(_order.total)::integer,
    jsonb_build_object('source', 'pharmacy')
  )
  RETURNING id INTO _request_id;

  RETURN _request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_local_payment_request_for_order(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_local_payment_request_for_order(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_pharmacy_order_with_local_payment(
  _items jsonb,
  _provider text,
  _payer_phone text,
  _delivery_address text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id uuid;
  _request_id uuid;
BEGIN
  _order_id := public.create_pharmacy_order(_items, _delivery_address);
  _request_id := public.create_local_payment_request_for_order(_order_id, _provider, _payer_phone);

  RETURN jsonb_build_object(
    'order_id', _order_id,
    'payment_request_id', _request_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_pharmacy_order_with_local_payment(jsonb, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_pharmacy_order_with_local_payment(jsonb, text, text, text) TO authenticated;
