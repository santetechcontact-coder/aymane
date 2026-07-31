CREATE OR REPLACE FUNCTION public.review_local_payment_request(
  _request_id uuid,
  _status text,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request public.local_payment_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Administrator role required';
  END IF;
  IF _status NOT IN ('awaiting_provider', 'paid', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'Payment status is invalid';
  END IF;
  IF char_length(btrim(COALESCE(_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'Review reason is required';
  END IF;

  SELECT * INTO _request
  FROM public.local_payment_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Payment request not found'; END IF;
  IF _request.status::text IN ('paid', 'cancelled') THEN
    RAISE EXCEPTION 'Payment request is already closed';
  END IF;
  IF _status = 'paid' AND _request.status::text NOT IN ('pending', 'awaiting_provider') THEN
    RAISE EXCEPTION 'Payment request cannot be marked as paid';
  END IF;

  UPDATE public.local_payment_requests
  SET status = _status::public.local_payment_status,
      metadata = metadata || jsonb_build_object(
        'operator_reason', btrim(_reason),
        'reviewed_by', auth.uid(),
        'reviewed_at', now()
      ),
      updated_at = now()
  WHERE id = _request_id;

  INSERT INTO public.notifications(user_id, category, title, body, action_url)
  VALUES (
    _request.user_id,
    'payment',
    CASE _status
      WHEN 'paid' THEN 'Paiement confirmé'
      WHEN 'failed' THEN 'Paiement à reprendre'
      WHEN 'cancelled' THEN 'Paiement annulé'
      ELSE 'Paiement en cours de confirmation'
    END,
    btrim(_reason),
    '/dashboard/payments'
  );

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    'local_payment_' || _status,
    'local_payment_request',
    _request_id,
    jsonb_build_object(
      'reference', _request.reference,
      'amount', _request.amount,
      'provider', _request.provider,
      'reason', btrim(_reason)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_local_payment_request(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_local_payment_request(uuid, text, text) TO authenticated;
