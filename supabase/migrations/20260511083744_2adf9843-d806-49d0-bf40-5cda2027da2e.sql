-- Lab analyses catalog
CREATE TABLE public.lab_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text,
  sample_type text,
  turnaround_hours integer NOT NULL DEFAULT 24,
  price numeric NOT NULL DEFAULT 0,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view analyses" ON public.lab_analyses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lab staff manage analyses" ON public.lab_analyses FOR ALL
  USING (has_role(auth.uid(), 'lab_technician'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'lab_technician'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Lab request status enum
DO $$ BEGIN
  CREATE TYPE public.lab_request_status AS ENUM ('pending','sample_collection','processing','results_ready','delivered','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lab_priority AS ENUM ('routine','urgent','stat');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Lab requests
CREATE TABLE public.lab_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  doctor_id uuid,
  lab_user_id uuid,
  structure_id uuid,
  status lab_request_status NOT NULL DEFAULT 'pending',
  priority lab_priority NOT NULL DEFAULT 'routine',
  clinical_notes text,
  internal_notes text,
  scheduled_at timestamptz,
  collected_at timestamptz,
  completed_at timestamptz,
  delivered_at timestamptz,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_requests_patient ON public.lab_requests(patient_id);
CREATE INDEX idx_lab_requests_lab ON public.lab_requests(lab_user_id);
CREATE INDEX idx_lab_requests_status ON public.lab_requests(status);

ALTER TABLE public.lab_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient sees own lab requests" ON public.lab_requests FOR SELECT
  USING (auth.uid() = patient_id);
CREATE POLICY "Doctor sees prescribed lab requests" ON public.lab_requests FOR SELECT
  USING (auth.uid() = doctor_id);
CREATE POLICY "Lab staff sees all lab requests" ON public.lab_requests FOR SELECT
  USING (has_role(auth.uid(), 'lab_technician'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Patient creates lab request" ON public.lab_requests FOR INSERT
  WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Doctor creates lab request" ON public.lab_requests FOR INSERT
  WITH CHECK (auth.uid() = doctor_id AND has_role(auth.uid(), 'doctor'::app_role));
CREATE POLICY "Lab staff manage lab requests" ON public.lab_requests FOR ALL
  USING (has_role(auth.uid(), 'lab_technician'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'lab_technician'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Patient cancels own lab request" ON public.lab_requests FOR UPDATE
  USING (auth.uid() = patient_id);

-- Lab request items
CREATE TABLE public.lab_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.lab_requests(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.lab_analyses(id),
  unit_price numeric NOT NULL DEFAULT 0,
  result_value text,
  result_unit text,
  reference_range text,
  result_flag text,
  result_notes text,
  result_file_url text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_items_request ON public.lab_request_items(request_id);

ALTER TABLE public.lab_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View items via request" ON public.lab_request_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.lab_requests r WHERE r.id = request_id
    AND (r.patient_id = auth.uid() OR r.doctor_id = auth.uid()
      OR has_role(auth.uid(), 'lab_technician'::app_role) OR has_role(auth.uid(), 'admin'::app_role))));
CREATE POLICY "Insert items via own request" ON public.lab_request_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.lab_requests r WHERE r.id = request_id
    AND (r.patient_id = auth.uid() OR r.doctor_id = auth.uid()
      OR has_role(auth.uid(), 'lab_technician'::app_role) OR has_role(auth.uid(), 'admin'::app_role))));
CREATE POLICY "Lab staff update items" ON public.lab_request_items FOR UPDATE
  USING (has_role(auth.uid(), 'lab_technician'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Lab staff delete items" ON public.lab_request_items FOR DELETE
  USING (has_role(auth.uid(), 'lab_technician'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Triggers updated_at
CREATE TRIGGER trg_lab_analyses_updated BEFORE UPDATE ON public.lab_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_lab_requests_updated BEFORE UPDATE ON public.lab_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed catalog
INSERT INTO public.lab_analyses (code, name, category, sample_type, turnaround_hours, price, description) VALUES
('NFS','Numération formule sanguine','Hématologie','Sang (EDTA)',6,5000,'Globules rouges, blancs, plaquettes'),
('GLY','Glycémie à jeun','Biochimie','Sang',4,3000,'Dosage du glucose sanguin'),
('HBA1C','Hémoglobine glyquée','Biochimie','Sang',24,12000,'Suivi du diabète sur 3 mois'),
('CRP','Protéine C-réactive','Inflammation','Sang',6,6000,'Marqueur d''inflammation'),
('TSH','TSH ultra-sensible','Endocrinologie','Sang',24,9000,'Fonction thyroïdienne'),
('CREAT','Créatininémie','Biochimie','Sang',6,4000,'Fonction rénale'),
('CHOL','Bilan lipidique complet','Biochimie','Sang',12,8000,'Cholestérol total, HDL, LDL, triglycérides'),
('VIH','Sérologie VIH','Sérologie','Sang',24,7000,'Dépistage VIH 1 et 2'),
('PALU','Goutte épaisse / TDR Paludisme','Parasitologie','Sang',2,3500,'Diagnostic paludisme'),
('ECBU','ECBU','Bactériologie','Urines',48,7500,'Examen cytobactériologique des urines'),
('GROUPE','Groupe sanguin Rhésus','Hématologie','Sang',6,4500,'Détermination groupe ABO Rhésus'),
('TGO','Transaminases ASAT/ALAT','Biochimie','Sang',6,5500,'Bilan hépatique');