
-- Enums
DO $$ BEGIN
  CREATE TYPE public.vital_type AS ENUM (
    'glucose','insulin','blood_pressure','heart_rate','spo2',
    'temperature','respiratory_rate','weight','bmi','steps'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.alert_severity AS ENUM ('info','warning','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.device_type AS ENUM (
    'smartwatch','glucometer','oximeter','blood_pressure_monitor','scale','thermometer','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- vital_readings
CREATE TABLE IF NOT EXISTS public.vital_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  type public.vital_type NOT NULL,
  value numeric NOT NULL,
  value_secondary numeric,
  unit text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  notes text,
  measured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vital_readings_patient_time ON public.vital_readings(patient_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_vital_readings_type ON public.vital_readings(type);
ALTER TABLE public.vital_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient manages own readings" ON public.vital_readings
  FOR ALL USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Doctor of patient views readings" ON public.vital_readings
  FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.patient_id = vital_readings.patient_id AND c.doctor_id = auth.uid()
    )
  );

-- connected_devices
CREATE TABLE IF NOT EXISTS public.connected_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  name text NOT NULL,
  type public.device_type NOT NULL,
  brand text,
  identifier text,
  last_sync_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.connected_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patient manages own devices" ON public.connected_devices
  FOR ALL USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);

-- health_alerts
CREATE TABLE IF NOT EXISTS public.health_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  vital_type public.vital_type,
  severity public.alert_severity NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  message text NOT NULL,
  value numeric,
  unit text,
  read_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_health_alerts_patient ON public.health_alerts(patient_id, created_at DESC);
ALTER TABLE public.health_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patient manages own alerts" ON public.health_alerts
  FOR ALL USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Doctor of patient views alerts" ON public.health_alerts
  FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.patient_id = health_alerts.patient_id AND c.doctor_id = auth.uid()
    )
  );

-- insulin_injections
CREATE TABLE IF NOT EXISTS public.insulin_injections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  insulin_type text NOT NULL,
  dose_units numeric NOT NULL,
  injection_site text,
  injected_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_insulin_patient ON public.insulin_injections(patient_id, injected_at DESC);
ALTER TABLE public.insulin_injections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patient manages own injections" ON public.insulin_injections
  FOR ALL USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Doctor of patient views injections" ON public.insulin_injections
  FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.patient_id = insulin_injections.patient_id AND c.doctor_id = auth.uid()
    )
  );
