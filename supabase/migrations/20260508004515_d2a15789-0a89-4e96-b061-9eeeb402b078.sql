-- Add public token + dispatched_at
ALTER TABLE public.emergencies
  ADD COLUMN IF NOT EXISTS public_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS emergencies_public_token_key ON public.emergencies(public_token);

-- Auto-set dispatched_at when status transitions to 'dispatched'
CREATE OR REPLACE FUNCTION public.set_emergency_dispatched_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status::text = 'dispatched' AND (OLD.status IS DISTINCT FROM NEW.status) AND NEW.dispatched_at IS NULL THEN
    NEW.dispatched_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_emergency_dispatched_at ON public.emergencies;
CREATE TRIGGER trg_set_emergency_dispatched_at
BEFORE UPDATE ON public.emergencies
FOR EACH ROW EXECUTE FUNCTION public.set_emergency_dispatched_at();

-- Public read-only RPC by token. Returns minimal fields, no PII / no GPS.
CREATE OR REPLACE FUNCTION public.get_emergency_public_status(_token uuid)
RETURNS TABLE (
  status text,
  severity text,
  emergency_type text,
  location text,
  created_at timestamptz,
  dispatched_at timestamptz,
  resolved_at timestamptz,
  eta_minutes integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.status::text,
    e.severity::text,
    e.emergency_type,
    e.location,
    e.created_at,
    e.dispatched_at,
    e.resolved_at,
    CASE
      WHEN e.status::text = 'resolved' THEN 0
      WHEN e.status::text = 'dispatched' THEN GREATEST(0, 15 - EXTRACT(EPOCH FROM (now() - COALESCE(e.dispatched_at, e.created_at))) / 60)::int
      WHEN e.status::text = 'open' THEN 20
      ELSE NULL
    END AS eta_minutes
  FROM public.emergencies e
  WHERE e.public_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_emergency_public_status(uuid) TO anon, authenticated;