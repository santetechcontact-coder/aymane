CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL CHECK (plan_id IN ('essentiel', 'premium', 'famille')),
  billing_interval text NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'paused', 'cancelled', 'expired')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  renews_at timestamptz,
  cancelled_at timestamptz,
  payment_request_id uuid UNIQUE REFERENCES public.local_payment_requests(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_email text NOT NULL,
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 160),
  relationship text NOT NULL,
  is_minor boolean NOT NULL DEFAULT false,
  medical_access_granted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'declined', 'removed')),
  invitation_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, invited_email)
);

CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx
  ON public.subscriptions(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS family_members_owner_status_idx
  ON public.family_members(owner_id, status, invited_at DESC);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
CREATE POLICY "Admins manage subscriptions"
  ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Family owners manage members"
  ON public.family_members FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Members read own family membership"
  ON public.family_members FOR SELECT TO authenticated
  USING (member_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.activate_subscription_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _renewal timestamptz;
BEGIN
  IF NEW.status::text = 'paid'
     AND OLD.status::text IS DISTINCT FROM 'paid'
     AND NEW.channel = 'subscription'
     AND NEW.plan_id IN ('essentiel', 'premium', 'famille')
  THEN
    _renewal := CASE NEW.billing_interval
      WHEN 'yearly' THEN now() + interval '1 year'
      ELSE now() + interval '1 month'
    END;

    UPDATE public.subscriptions
    SET status = 'expired', updated_at = now()
    WHERE user_id = NEW.user_id AND status = 'active';

    INSERT INTO public.subscriptions(
      user_id, plan_id, billing_interval, status,
      starts_at, renews_at, payment_request_id, metadata
    ) VALUES (
      NEW.user_id, NEW.plan_id, COALESCE(NEW.billing_interval, 'monthly'),
      'active', now(), _renewal, NEW.id,
      jsonb_build_object('payment_reference', NEW.reference)
    )
    ON CONFLICT (payment_request_id) DO UPDATE SET
      status = 'active',
      renews_at = EXCLUDED.renews_at,
      updated_at = now();

    INSERT INTO public.notifications(user_id, category, title, body, action_url)
    VALUES (
      NEW.user_id,
      'subscription',
      'Abonnement activé',
      'Votre formule ' || initcap(NEW.plan_id) || ' est maintenant active.',
      '/dashboard/subscription'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activate_subscription_from_payment ON public.local_payment_requests;
CREATE TRIGGER trg_activate_subscription_from_payment
AFTER UPDATE OF status ON public.local_payment_requests
FOR EACH ROW EXECUTE FUNCTION public.activate_subscription_from_payment();

CREATE OR REPLACE FUNCTION public.invite_family_member(
  _email text,
  _full_name text,
  _relationship text,
  _is_minor boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token uuid;
  _plan text;
  _member_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT plan_id INTO _plan
  FROM public.subscriptions
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND renews_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF _plan IS DISTINCT FROM 'famille' THEN
    RAISE EXCEPTION 'An active family subscription is required';
  END IF;

  IF _email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'Email is invalid';
  END IF;
  IF char_length(btrim(COALESCE(_full_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;
  IF char_length(btrim(COALESCE(_relationship, ''))) < 2 THEN
    RAISE EXCEPTION 'Relationship is required';
  END IF;

  SELECT count(*) INTO _member_count
  FROM public.family_members
  WHERE owner_id = auth.uid() AND status IN ('invited', 'active');

  IF _member_count >= 8 THEN
    RAISE EXCEPTION 'Family member limit reached';
  END IF;

  INSERT INTO public.family_members(
    owner_id, invited_email, full_name, relationship, is_minor
  ) VALUES (
    auth.uid(), lower(btrim(_email)), btrim(_full_name), btrim(_relationship), _is_minor
  )
  ON CONFLICT (owner_id, invited_email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    relationship = EXCLUDED.relationship,
    is_minor = EXCLUDED.is_minor,
    status = 'invited',
    invitation_token = gen_random_uuid(),
    invited_at = now(),
    accepted_at = NULL,
    member_user_id = NULL,
    updated_at = now()
  RETURNING invitation_token INTO _token;

  RETURN _token;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_family_invitation(_token uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
  _invitation public.family_members%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT lower(email) INTO _email
  FROM auth.users
  WHERE id = auth.uid();

  SELECT * INTO _invitation
  FROM public.family_members
  WHERE invitation_token = _token
    AND status = 'invited'
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation is invalid'; END IF;
  IF lower(_invitation.invited_email) <> _email THEN
    RAISE EXCEPTION 'Invitation email does not match the signed-in account';
  END IF;

  UPDATE public.family_members
  SET member_user_id = auth.uid(),
      status = 'active',
      accepted_at = now(),
      updated_at = now()
  WHERE id = _invitation.id;

  INSERT INTO public.notifications(user_id, category, title, body, action_url)
  VALUES (
    _invitation.owner_id,
    'family',
    'Invitation famille acceptée',
    _invitation.full_name || ' a rejoint votre espace Famille.',
    '/dashboard/subscription'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_subscription_from_payment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.invite_family_member(text, text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_family_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_family_member(text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_family_invitation(uuid) TO authenticated;

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_family_members_updated_at ON public.family_members;
CREATE TRIGGER update_family_members_updated_at
BEFORE UPDATE ON public.family_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
