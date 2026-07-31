
ALTER TABLE public.provider_applications
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS languages text[],
  ADD COLUMN IF NOT EXISTS services text[],
  ADD COLUMN IF NOT EXISTS role_specific jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS structure_role text;

-- Unique order numbers (case-insensitive, only when set & not rejected)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_provider_order_number
  ON public.provider_applications (lower(order_number))
  WHERE order_number IS NOT NULL AND status <> 'rejected';
