
-- ============== ENUMS ==============
CREATE TYPE public.app_role AS ENUM ('patient', 'doctor', 'pharmacist', 'admin');
CREATE TYPE public.consultation_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE public.emergency_status AS ENUM ('open', 'dispatched', 'resolved', 'cancelled');
CREATE TYPE public.emergency_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.blood_group AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');

-- ============== PROFILES ==============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT,
  city TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============== USER ROLES ==============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============== MEDICAL RECORDS ==============
CREATE TABLE public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  blood_group blood_group,
  allergies TEXT,
  chronic_conditions TEXT,
  current_treatments TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

-- ============== CONSULTATIONS ==============
CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status consultation_status NOT NULL DEFAULT 'pending',
  diagnosis TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- ============== PRESCRIPTIONS ==============
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- ============== MEDICATIONS CATALOG ==============
CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  requires_prescription BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- ============== PHARMACY ORDERS ==============
CREATE TABLE public.pharmacy_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status order_status NOT NULL DEFAULT 'pending',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pharmacy_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pharmacy_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.pharmacy_orders(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL
);
ALTER TABLE public.pharmacy_order_items ENABLE ROW LEVEL SECURITY;

-- ============== EMERGENCIES ==============
CREATE TABLE public.emergencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emergency_type TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  severity emergency_severity NOT NULL DEFAULT 'medium',
  status emergency_status NOT NULL DEFAULT 'open',
  responder_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;

-- ============== BLOOD BANK ==============
CREATE TABLE public.blood_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_name TEXT NOT NULL,
  city TEXT NOT NULL,
  blood_group blood_group NOT NULL,
  units_available INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blood_bank ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.blood_donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blood_group blood_group NOT NULL,
  city TEXT NOT NULL,
  available BOOLEAN NOT NULL DEFAULT true,
  last_donation_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blood_donors ENABLE ROW LEVEL SECURITY;

-- ============== TIMESTAMP TRIGGER ==============
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_medrec_updated BEFORE UPDATE ON public.medical_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_consult_updated BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_meds_updated BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.pharmacy_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== AUTO-CREATE PROFILE + ROLE ON SIGNUP ==============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'patient');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============== RLS POLICIES ==============

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Doctors view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- medical_records
CREATE POLICY "Patient owns medical record" ON public.medical_records FOR ALL USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Doctors view records" ON public.medical_records FOR SELECT USING (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Doctors update records" ON public.medical_records FOR UPDATE USING (public.has_role(auth.uid(), 'doctor'));

-- consultations
CREATE POLICY "Patient sees own consultations" ON public.consultations FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Doctor sees own consultations" ON public.consultations FOR SELECT USING (auth.uid() = doctor_id OR public.has_role(auth.uid(), 'doctor'));
CREATE POLICY "Patient creates consultation" ON public.consultations FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Doctor updates consultation" ON public.consultations FOR UPDATE USING (auth.uid() = doctor_id OR public.has_role(auth.uid(), 'doctor'));
CREATE POLICY "Patient cancels own consultation" ON public.consultations FOR UPDATE USING (auth.uid() = patient_id);

-- prescriptions
CREATE POLICY "Patient sees own prescriptions" ON public.prescriptions FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Doctor sees prescriptions issued" ON public.prescriptions FOR SELECT USING (auth.uid() = doctor_id OR public.has_role(auth.uid(), 'doctor'));
CREATE POLICY "Doctor creates prescription" ON public.prescriptions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'doctor') AND auth.uid() = doctor_id);
CREATE POLICY "Pharmacists view prescriptions" ON public.prescriptions FOR SELECT USING (public.has_role(auth.uid(), 'pharmacist'));

-- medications (catalog visible to authenticated)
CREATE POLICY "Auth users view medications" ON public.medications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pharmacists manage medications" ON public.medications FOR ALL USING (public.has_role(auth.uid(), 'pharmacist') OR public.has_role(auth.uid(), 'admin'));

-- pharmacy_orders
CREATE POLICY "Patient sees own orders" ON public.pharmacy_orders FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Patient creates order" ON public.pharmacy_orders FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Patient updates own order" ON public.pharmacy_orders FOR UPDATE USING (auth.uid() = patient_id);
CREATE POLICY "Pharmacists manage orders" ON public.pharmacy_orders FOR ALL USING (public.has_role(auth.uid(), 'pharmacist') OR public.has_role(auth.uid(), 'admin'));

-- pharmacy_order_items
CREATE POLICY "View items via order" ON public.pharmacy_order_items FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.pharmacy_orders o WHERE o.id = order_id AND (o.patient_id = auth.uid() OR public.has_role(auth.uid(), 'pharmacist') OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Insert items via own order" ON public.pharmacy_order_items FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM public.pharmacy_orders o WHERE o.id = order_id AND o.patient_id = auth.uid())
);

-- emergencies
CREATE POLICY "Patient sees own emergencies" ON public.emergencies FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Patient creates emergency" ON public.emergencies FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Doctors view emergencies" ON public.emergencies FOR SELECT USING (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Doctors update emergencies" ON public.emergencies FOR UPDATE USING (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));

-- blood_bank
CREATE POLICY "Auth users view blood bank" ON public.blood_bank FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages blood bank" ON public.blood_bank FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'doctor'));

-- blood_donors
CREATE POLICY "Donor manages own profile" ON public.blood_donors FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users view donors" ON public.blood_donors FOR SELECT TO authenticated USING (true);
