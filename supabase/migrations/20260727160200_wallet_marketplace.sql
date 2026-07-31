CREATE TABLE IF NOT EXISTS public.provider_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 160),
  description text,
  category text NOT NULL CHECK (category IN (
    'consultation', 'teleconsultation', 'home_care', 'diagnostic',
    'pharmacy_delivery', 'ambulance', 'maternal_care',
    'vaccination', 'other'
  )),
  delivery_mode text NOT NULL DEFAULT 'onsite' CHECK (delivery_mode IN ('onsite', 'remote', 'home')),
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 5 AND 1440),
  price_fcfa integer NOT NULL CHECK (price_fcfa BETWEEN 100 AND 5000000),
  promotion_type text CHECK (promotion_type IS NULL OR promotion_type IN ('percentage', 'fixed')),
  promotion_value integer CHECK (promotion_value IS NULL OR promotion_value > 0),
  promotion_starts_at timestamptz,
  promotion_ends_at timestamptz,
  extra_fees jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (promotion_ends_at IS NULL OR promotion_starts_at IS NULL OR promotion_ends_at > promotion_starts_at)
);

CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'XOF' CHECK (currency = 'XOF'),
  kyc_status text NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'reviewing', 'approved', 'rejected')),
  frozen boolean NOT NULL DEFAULT false,
  frozen_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  entry_type text NOT NULL CHECK (entry_type IN ('payment', 'refund', 'adjustment', 'withdrawal', 'commission')),
  amount_fcfa bigint NOT NULL CHECK (amount_fcfa <> 0),
  payment_request_id uuid REFERENCES public.local_payment_requests(id) ON DELETE SET NULL,
  provider_service_id uuid REFERENCES public.provider_services(id) ON DELETE SET NULL,
  withdrawal_id uuid,
  reference text NOT NULL UNIQUE DEFAULT ('WTX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('wave', 'orange_money', 'free_money', 'bank')),
  account_name text NOT NULL CHECK (char_length(btrim(account_name)) BETWEEN 2 AND 160),
  account_reference text NOT NULL CHECK (char_length(btrim(account_reference)) BETWEEN 6 AND 80),
  bank_name text,
  is_default boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  payout_account_id uuid NOT NULL REFERENCES public.payout_accounts(id) ON DELETE RESTRICT,
  gross_amount_fcfa bigint NOT NULL CHECK (gross_amount_fcfa >= 1000),
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.20 CHECK (commission_rate BETWEEN 0 AND 1),
  commission_amount_fcfa bigint NOT NULL CHECK (commission_amount_fcfa >= 0),
  net_amount_fcfa bigint NOT NULL CHECK (net_amount_fcfa > 0),
  status text NOT NULL DEFAULT 'under_review' CHECK (status IN ('under_review', 'approved', 'rejected', 'paid', 'cancelled')),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (gross_amount_fcfa = commission_amount_fcfa + net_amount_fcfa)
);

ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_withdrawal_id_fkey;
ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_withdrawal_id_fkey
  FOREIGN KEY (withdrawal_id) REFERENCES public.withdrawals(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_withdrawal_unique_idx
  ON public.wallet_transactions(withdrawal_id)
  WHERE withdrawal_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_payment_unique_idx
  ON public.wallet_transactions(payment_request_id)
  WHERE payment_request_id IS NOT NULL AND entry_type = 'payment';

CREATE TABLE IF NOT EXISTS public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id uuid NOT NULL UNIQUE REFERENCES public.withdrawals(id) ON DELETE RESTRICT,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  rate numeric(5,4) NOT NULL,
  gross_amount_fcfa bigint NOT NULL,
  commission_amount_fcfa bigint NOT NULL,
  net_amount_fcfa bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE DEFAULT ('FAC-' || to_char(now(), 'YYYYMM') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  provider_service_id uuid REFERENCES public.provider_services(id) ON DELETE SET NULL,
  payment_request_id uuid NOT NULL UNIQUE REFERENCES public.local_payment_requests(id) ON DELETE RESTRICT,
  amount_fcfa integer NOT NULL CHECK (amount_fcfa > 0),
  currency text NOT NULL DEFAULT 'XOF',
  issued_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('identity', 'selfie', 'professional_license', 'proof_of_address', 'other')),
  file_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kyc_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('reviewing', 'approved', 'rejected')),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 1200),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.local_payment_requests
  ADD COLUMN IF NOT EXISTS provider_service_id uuid REFERENCES public.provider_services(id) ON DELETE SET NULL;
ALTER TABLE public.local_payment_requests
  DROP CONSTRAINT IF EXISTS local_payment_requests_channel_check;
ALTER TABLE public.local_payment_requests
  ADD CONSTRAINT local_payment_requests_channel_check
  CHECK (channel IN ('subscription', 'pharmacy_order', 'provider_service'));

CREATE INDEX IF NOT EXISTS provider_services_provider_active_idx
  ON public.provider_services(provider_id, active, created_at DESC);
CREATE INDEX IF NOT EXISTS wallet_transactions_wallet_date_idx
  ON public.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS withdrawals_wallet_status_idx
  ON public.withdrawals(wallet_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS kyc_documents_provider_status_idx
  ON public.kyc_documents(provider_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS financial_audits_wallet_date_idx
  ON public.financial_audits(wallet_id, created_at DESC);

ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers manage own service catalogue"
  ON public.provider_services FOR ALL TO authenticated
  USING (
    provider_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    provider_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
CREATE POLICY "Patients browse active provider services"
  ON public.provider_services FOR SELECT
  USING (active = true);

CREATE POLICY "Providers and admins read wallets"
  ON public.wallets FOR SELECT TO authenticated
  USING (
    provider_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
CREATE POLICY "Providers and admins read wallet transactions"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wallets wallet
      WHERE wallet.id = wallet_id
        AND (
          wallet.provider_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
        )
    )
  );
CREATE POLICY "Providers manage own payout accounts"
  ON public.payout_accounts FOR ALL TO authenticated
  USING (
    provider_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    provider_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
CREATE POLICY "Providers and admins read withdrawals"
  ON public.withdrawals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wallets wallet
      WHERE wallet.id = wallet_id
        AND (
          wallet.provider_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
        )
    )
  );
CREATE POLICY "Providers and admins read commissions"
  ON public.commissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wallets wallet
      WHERE wallet.id = wallet_id
        AND (
          wallet.provider_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
        )
    )
  );
CREATE POLICY "Invoice parties and admins read invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR provider_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
CREATE POLICY "Providers manage own KYC documents"
  ON public.kyc_documents FOR ALL TO authenticated
  USING (
    provider_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'application_reviewer'::public.app_role)
  )
  WITH CHECK (provider_id = auth.uid());
CREATE POLICY "Review team reads KYC validations"
  ON public.kyc_validations FOR SELECT TO authenticated
  USING (
    provider_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'application_reviewer'::public.app_role)
  );
CREATE POLICY "Admins read financial audits"
  ON public.financial_audits FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE INSERT, UPDATE, DELETE ON public.wallets FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.wallet_transactions FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.withdrawals FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.commissions FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.invoices FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.kyc_validations FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.financial_audits FROM authenticated, anon;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('kyc-documents', 'kyc-documents', false, 10485760)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit;

CREATE POLICY "Providers upload own KYC files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Providers read own KYC files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'application_reviewer'::public.app_role)
    )
  );

CREATE OR REPLACE FUNCTION public.ensure_my_wallet()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wallet_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_current_health_provider() THEN
    RAISE EXCEPTION 'A verified provider role is required';
  END IF;

  INSERT INTO public.wallets(provider_id)
  VALUES (auth.uid())
  ON CONFLICT (provider_id) DO UPDATE SET updated_at = now()
  RETURNING id INTO _wallet_id;

  RETURN _wallet_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_wallet_snapshot(_provider_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target uuid := COALESCE(_provider_id, auth.uid());
  _wallet public.wallets%ROWTYPE;
  _balance bigint;
  _reserved bigint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _target <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Wallet access denied';
  END IF;

  SELECT * INTO _wallet
  FROM public.wallets
  WHERE provider_id = _target;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'wallet_id', NULL,
      'provider_id', _target,
      'currency', 'XOF',
      'kyc_status', 'pending',
      'frozen', false,
      'total_balance', 0,
      'available_balance', 0,
      'reserved_balance', 0
    );
  END IF;

  SELECT COALESCE(sum(amount_fcfa), 0) INTO _balance
  FROM public.wallet_transactions
  WHERE wallet_id = _wallet.id;

  SELECT COALESCE(sum(gross_amount_fcfa), 0) INTO _reserved
  FROM public.withdrawals
  WHERE wallet_id = _wallet.id AND status = 'under_review';

  RETURN jsonb_build_object(
    'wallet_id', _wallet.id,
    'provider_id', _wallet.provider_id,
    'currency', _wallet.currency,
    'kyc_status', _wallet.kyc_status,
    'frozen', _wallet.frozen,
    'frozen_reason', _wallet.frozen_reason,
    'total_balance', _balance,
    'available_balance', GREATEST(_balance - _reserved, 0),
    'reserved_balance', _reserved
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_provider_service_payment(
  _service_id uuid,
  _provider text,
  _payer_phone text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _service public.provider_services%ROWTYPE;
  _normalized_provider text := lower(btrim(_provider));
  _normalized_phone text := regexp_replace(COALESCE(_payer_phone, ''), '[^0-9+]', '', 'g');
  _amount integer;
  _request_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _normalized_provider NOT IN ('wave', 'orange_money', 'free_money', 'paydunya') THEN
    RAISE EXCEPTION 'Payment provider not supported';
  END IF;
  IF length(_normalized_phone) < 9 OR length(_normalized_phone) > 16 THEN
    RAISE EXCEPTION 'Phone number invalid';
  END IF;

  SELECT * INTO _service
  FROM public.provider_services
  WHERE id = _service_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Service is not available'; END IF;
  IF _service.provider_id = auth.uid() THEN RAISE EXCEPTION 'Providers cannot buy their own service'; END IF;

  _amount := _service.price_fcfa;
  IF _service.promotion_starts_at <= now()
     AND _service.promotion_ends_at > now()
     AND _service.promotion_value IS NOT NULL
  THEN
    _amount := CASE _service.promotion_type
      WHEN 'percentage' THEN GREATEST(100, _service.price_fcfa - ((_service.price_fcfa * _service.promotion_value) / 100))
      WHEN 'fixed' THEN GREATEST(100, _service.price_fcfa - _service.promotion_value)
      ELSE _service.price_fcfa
    END;
  END IF;

  INSERT INTO public.local_payment_requests(
    user_id, channel, provider_service_id, provider,
    payer_phone, amount, metadata
  ) VALUES (
    auth.uid(), 'provider_service', _service.id,
    _normalized_provider::public.local_payment_provider,
    _normalized_phone, _amount,
    jsonb_build_object(
      'provider_id', _service.provider_id,
      'service_title', _service.title
    )
  )
  RETURNING id INTO _request_id;

  RETURN _request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_wallet_from_service_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _service public.provider_services%ROWTYPE;
  _wallet_id uuid;
BEGIN
  IF NEW.status::text = 'paid'
     AND OLD.status::text IS DISTINCT FROM 'paid'
     AND NEW.channel = 'provider_service'
     AND NEW.provider_service_id IS NOT NULL
  THEN
    SELECT * INTO _service
    FROM public.provider_services
    WHERE id = NEW.provider_service_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Provider service not found'; END IF;

    INSERT INTO public.wallets(provider_id)
    VALUES (_service.provider_id)
    ON CONFLICT (provider_id) DO UPDATE SET updated_at = now()
    RETURNING id INTO _wallet_id;

    INSERT INTO public.wallet_transactions(
      wallet_id, entry_type, amount_fcfa,
      payment_request_id, provider_service_id,
      description, metadata
    ) VALUES (
      _wallet_id, 'payment', NEW.amount,
      NEW.id, _service.id,
      'Paiement reçu - ' || _service.title,
      jsonb_build_object('patient_id', NEW.user_id, 'payment_reference', NEW.reference)
    )
    ON CONFLICT DO NOTHING;

    INSERT INTO public.invoices(
      patient_id, provider_id, provider_service_id,
      payment_request_id, amount_fcfa,
      metadata
    ) VALUES (
      NEW.user_id, _service.provider_id, _service.id,
      NEW.id, NEW.amount,
      jsonb_build_object('payment_reference', NEW.reference, 'service_title', _service.title)
    )
    ON CONFLICT (payment_request_id) DO NOTHING;

    INSERT INTO public.notifications(user_id, category, title, body, action_url)
    VALUES
      (
        NEW.user_id, 'payment', 'Paiement confirmé',
        'Votre paiement pour ' || _service.title || ' est confirmé.',
        '/dashboard/payments'
      ),
      (
        _service.provider_id, 'wallet', 'Nouveau paiement reçu',
        NEW.amount::text || ' FCFA ont été crédités sur votre wallet.',
        '/dashboard/wallet'
      );

    INSERT INTO public.financial_audits(
      actor_id, action, wallet_id, resource_type, resource_id, metadata
    ) VALUES (
      NEW.user_id, 'wallet_credit', _wallet_id, 'local_payment_request', NEW.id,
      jsonb_build_object('amount_fcfa', NEW.amount, 'provider_service_id', _service.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_wallet_from_service_payment ON public.local_payment_requests;
CREATE TRIGGER trg_credit_wallet_from_service_payment
AFTER UPDATE OF status ON public.local_payment_requests
FOR EACH ROW EXECUTE FUNCTION public.credit_wallet_from_service_payment();

CREATE OR REPLACE FUNCTION public.request_wallet_withdrawal(
  _amount_fcfa bigint,
  _payout_account_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wallet public.wallets%ROWTYPE;
  _balance bigint;
  _reserved bigint;
  _commission bigint;
  _withdrawal_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF COALESCE(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' THEN
    RAISE EXCEPTION 'Multi-factor authentication is required';
  END IF;
  IF _amount_fcfa < 1000 THEN RAISE EXCEPTION 'Minimum withdrawal is 1000 FCFA'; END IF;

  SELECT * INTO _wallet
  FROM public.wallets
  WHERE provider_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF _wallet.frozen THEN RAISE EXCEPTION 'Wallet is frozen'; END IF;
  IF _wallet.kyc_status <> 'approved' THEN RAISE EXCEPTION 'KYC approval is required'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.payout_accounts
    WHERE id = _payout_account_id AND provider_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Payout account is invalid';
  END IF;

  SELECT COALESCE(sum(amount_fcfa), 0) INTO _balance
  FROM public.wallet_transactions
  WHERE wallet_id = _wallet.id;
  SELECT COALESCE(sum(gross_amount_fcfa), 0) INTO _reserved
  FROM public.withdrawals
  WHERE wallet_id = _wallet.id AND status = 'under_review';

  IF _amount_fcfa > (_balance - _reserved) THEN
    RAISE EXCEPTION 'Insufficient available balance';
  END IF;

  _commission := round(_amount_fcfa * 0.20);
  INSERT INTO public.withdrawals(
    wallet_id, payout_account_id, gross_amount_fcfa,
    commission_rate, commission_amount_fcfa, net_amount_fcfa,
    requested_by
  ) VALUES (
    _wallet.id, _payout_account_id, _amount_fcfa,
    0.20, _commission, _amount_fcfa - _commission,
    auth.uid()
  )
  RETURNING id INTO _withdrawal_id;

  INSERT INTO public.financial_audits(
    actor_id, action, wallet_id, resource_type, resource_id, metadata
  ) VALUES (
    auth.uid(), 'withdrawal_requested', _wallet.id, 'withdrawal', _withdrawal_id,
    jsonb_build_object(
      'gross_amount_fcfa', _amount_fcfa,
      'commission_amount_fcfa', _commission,
      'net_amount_fcfa', _amount_fcfa - _commission
    )
  );

  RETURN _withdrawal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_wallet_withdrawal(
  _withdrawal_id uuid,
  _decision text,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _withdrawal public.withdrawals%ROWTYPE;
  _provider_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Administrator role required';
  END IF;
  IF _decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  IF char_length(btrim(COALESCE(_reason, ''))) < 3 THEN RAISE EXCEPTION 'Decision reason is required'; END IF;

  SELECT * INTO _withdrawal
  FROM public.withdrawals
  WHERE id = _withdrawal_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF _withdrawal.status <> 'under_review' THEN RAISE EXCEPTION 'Withdrawal is already closed'; END IF;

  SELECT provider_id INTO _provider_id
  FROM public.wallets
  WHERE id = _withdrawal.wallet_id;

  UPDATE public.withdrawals
  SET status = _decision,
      reviewed_by = auth.uid(),
      review_reason = btrim(_reason),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = _withdrawal_id;

  IF _decision = 'approved' THEN
    INSERT INTO public.wallet_transactions(
      wallet_id, entry_type, amount_fcfa,
      withdrawal_id, description, metadata
    ) VALUES (
      _withdrawal.wallet_id, 'withdrawal', -_withdrawal.gross_amount_fcfa,
      _withdrawal.id, 'Retrait approuvé',
      jsonb_build_object('net_amount_fcfa', _withdrawal.net_amount_fcfa)
    )
    ON CONFLICT DO NOTHING;

    INSERT INTO public.commissions(
      withdrawal_id, wallet_id, rate,
      gross_amount_fcfa, commission_amount_fcfa, net_amount_fcfa
    ) VALUES (
      _withdrawal.id, _withdrawal.wallet_id, _withdrawal.commission_rate,
      _withdrawal.gross_amount_fcfa, _withdrawal.commission_amount_fcfa,
      _withdrawal.net_amount_fcfa
    )
    ON CONFLICT (withdrawal_id) DO NOTHING;
  END IF;

  INSERT INTO public.notifications(user_id, category, title, body, action_url)
  VALUES (
    _provider_id,
    'withdrawal',
    CASE WHEN _decision = 'approved' THEN 'Retrait approuvé' ELSE 'Retrait refusé' END,
    btrim(_reason),
    '/dashboard/wallet'
  );

  INSERT INTO public.financial_audits(
    actor_id, action, wallet_id, resource_type, resource_id, metadata
  ) VALUES (
    auth.uid(), 'withdrawal_' || _decision, _withdrawal.wallet_id,
    'withdrawal', _withdrawal.id,
    jsonb_build_object('reason', btrim(_reason))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.review_provider_kyc(
  _provider_id uuid,
  _status text,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wallet_id uuid;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'application_reviewer'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Review role required';
  END IF;
  IF _status NOT IN ('reviewing', 'approved', 'rejected') THEN RAISE EXCEPTION 'Invalid KYC status'; END IF;
  IF char_length(btrim(COALESCE(_reason, ''))) < 3 THEN RAISE EXCEPTION 'Review reason is required'; END IF;

  INSERT INTO public.wallets(provider_id, kyc_status)
  VALUES (_provider_id, _status)
  ON CONFLICT (provider_id) DO UPDATE SET
    kyc_status = EXCLUDED.kyc_status,
    updated_at = now()
  RETURNING id INTO _wallet_id;

  INSERT INTO public.kyc_validations(provider_id, reviewer_id, status, reason)
  VALUES (_provider_id, auth.uid(), _status, btrim(_reason));

  UPDATE public.kyc_documents
  SET status = CASE WHEN _status = 'reviewing' THEN 'pending' ELSE _status END,
      rejection_reason = CASE WHEN _status = 'rejected' THEN btrim(_reason) ELSE NULL END,
      updated_at = now()
  WHERE provider_id = _provider_id
    AND status = 'pending';

  INSERT INTO public.notifications(user_id, category, title, body, action_url)
  VALUES (
    _provider_id,
    'kyc',
    CASE _status
      WHEN 'approved' THEN 'KYC validé'
      WHEN 'rejected' THEN 'KYC à corriger'
      ELSE 'KYC en cours de vérification'
    END,
    btrim(_reason),
    '/dashboard/wallet'
  );

  INSERT INTO public.financial_audits(
    actor_id, action, wallet_id, resource_type, resource_id, metadata
  ) VALUES (
    auth.uid(), 'kyc_' || _status, _wallet_id, 'provider', _provider_id,
    jsonb_build_object('reason', btrim(_reason))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_wallet_withdrawal_paid(
  _withdrawal_id uuid,
  _payment_reference text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _withdrawal public.withdrawals%ROWTYPE;
  _provider_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Administrator role required';
  END IF;
  IF char_length(btrim(COALESCE(_payment_reference, ''))) < 4 THEN
    RAISE EXCEPTION 'Payment reference is required';
  END IF;

  SELECT * INTO _withdrawal
  FROM public.withdrawals
  WHERE id = _withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF _withdrawal.status <> 'approved' THEN
    RAISE EXCEPTION 'Only an approved withdrawal can be marked as paid';
  END IF;

  SELECT provider_id INTO _provider_id
  FROM public.wallets
  WHERE id = _withdrawal.wallet_id;

  UPDATE public.withdrawals
  SET status = 'paid',
      paid_at = now(),
      updated_at = now()
  WHERE id = _withdrawal_id;

  INSERT INTO public.notifications(user_id, category, title, body, action_url)
  VALUES (
    _provider_id,
    'withdrawal',
    'Retrait payé',
    'Votre retrait de ' || _withdrawal.net_amount_fcfa || ' FCFA a été envoyé.',
    '/dashboard/wallet'
  );

  INSERT INTO public.financial_audits(
    actor_id, action, wallet_id, resource_type, resource_id, metadata
  ) VALUES (
    auth.uid(), 'withdrawal_paid', _withdrawal.wallet_id,
    'withdrawal', _withdrawal.id,
    jsonb_build_object(
      'payment_reference', btrim(_payment_reference),
      'net_amount_fcfa', _withdrawal.net_amount_fcfa
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_my_wallet() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_wallet_snapshot(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_provider_service_payment(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.credit_wallet_from_service_payment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_wallet_withdrawal(bigint, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_wallet_withdrawal(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_provider_kyc(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_wallet_withdrawal_paid(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.ensure_my_wallet() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_wallet_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_provider_service_payment(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_wallet_withdrawal(bigint, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_wallet_withdrawal(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_provider_kyc(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_wallet_withdrawal_paid(uuid, text) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_services TO authenticated;
GRANT SELECT ON public.wallets TO authenticated;
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_accounts TO authenticated;
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT SELECT ON public.commissions TO authenticated;
GRANT SELECT ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kyc_documents TO authenticated;
GRANT SELECT ON public.kyc_validations TO authenticated;
GRANT SELECT ON public.financial_audits TO authenticated;

DROP TRIGGER IF EXISTS update_provider_services_updated_at ON public.provider_services;
CREATE TRIGGER update_provider_services_updated_at
BEFORE UPDATE ON public.provider_services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_wallets_updated_at ON public.wallets;
CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_payout_accounts_updated_at ON public.payout_accounts;
CREATE TRIGGER update_payout_accounts_updated_at
BEFORE UPDATE ON public.payout_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_withdrawals_updated_at ON public.withdrawals;
CREATE TRIGGER update_withdrawals_updated_at
BEFORE UPDATE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_kyc_documents_updated_at ON public.kyc_documents;
CREATE TRIGGER update_kyc_documents_updated_at
BEFORE UPDATE ON public.kyc_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
