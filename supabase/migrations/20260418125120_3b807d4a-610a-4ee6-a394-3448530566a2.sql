-- ============= ENUMS =============
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'student');
CREATE TYPE public.case_status AS ENUM ('draft', 'pending_review', 'approved', 'completed');
CREATE TYPE public.gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE public.bone_loss_pattern AS ENUM ('horizontal', 'vertical', 'mixed', 'none');
CREATE TYPE public.treatment_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  university_id TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============= USER ROLES =============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

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

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- ============= PATIENTS =============
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_code TEXT UNIQUE NOT NULL DEFAULT ('HU-' || to_char(now(), 'YY') || '-' || lpad((floor(random()*100000))::text, 5, '0')),
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender gender_type,
  phone TEXT,
  email TEXT,
  address TEXT,
  photo_url TEXT,
  medical_history TEXT,
  medications TEXT,
  allergies TEXT,
  chief_complaint TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_patients_created_by ON public.patients(created_by);
CREATE INDEX idx_patients_name ON public.patients(full_name);

-- ============= VISITS =============
CREATE TABLE public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  supervisor_id UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- ============= PERIODONTAL CHARTS =============
CREATE TABLE public.periodontal_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
  chart_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status case_status NOT NULL DEFAULT 'draft',
  supervisor_id UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  general_notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.periodontal_charts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_charts_patient ON public.periodontal_charts(patient_id);
CREATE INDEX idx_charts_status ON public.periodontal_charts(status);

-- ============= TOOTH MEASUREMENTS =============
-- One row per tooth per chart. Tooth numbers FDI 11-48 (or universal 1-32).
CREATE TABLE public.tooth_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES public.periodontal_charts(id) ON DELETE CASCADE,
  tooth_number SMALLINT NOT NULL, -- 1..32 (universal numbering)
  is_missing BOOLEAN NOT NULL DEFAULT false,
  -- Probing depths (mm) per site
  pd_mb SMALLINT, pd_b SMALLINT, pd_db SMALLINT,
  pd_ml SMALLINT, pd_l SMALLINT, pd_dl SMALLINT,
  -- Gingival margin levels (mm; positive = recession below CEJ, negative = above CEJ)
  gm_mb SMALLINT, gm_b SMALLINT, gm_db SMALLINT,
  gm_ml SMALLINT, gm_l SMALLINT, gm_dl SMALLINT,
  -- Bleeding on probing per site
  bop_mb BOOLEAN DEFAULT false, bop_b BOOLEAN DEFAULT false, bop_db BOOLEAN DEFAULT false,
  bop_ml BOOLEAN DEFAULT false, bop_l BOOLEAN DEFAULT false, bop_dl BOOLEAN DEFAULT false,
  -- Plaque per surface
  plaque_mb BOOLEAN DEFAULT false, plaque_b BOOLEAN DEFAULT false, plaque_db BOOLEAN DEFAULT false,
  plaque_ml BOOLEAN DEFAULT false, plaque_l BOOLEAN DEFAULT false, plaque_dl BOOLEAN DEFAULT false,
  -- Suppuration per site
  supp_mb BOOLEAN DEFAULT false, supp_b BOOLEAN DEFAULT false, supp_db BOOLEAN DEFAULT false,
  supp_ml BOOLEAN DEFAULT false, supp_l BOOLEAN DEFAULT false, supp_dl BOOLEAN DEFAULT false,
  mobility SMALLINT DEFAULT 0, -- Miller 0-3
  furcation_buccal SMALLINT DEFAULT 0, -- Glickman 0-4
  furcation_lingual SMALLINT DEFAULT 0,
  furcation_mesial SMALLINT DEFAULT 0,
  furcation_distal SMALLINT DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chart_id, tooth_number)
);
ALTER TABLE public.tooth_measurements ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tm_chart ON public.tooth_measurements(chart_id);

-- ============= INDICES RECORDS =============
CREATE TABLE public.indices_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES public.periodontal_charts(id) ON DELETE CASCADE,
  plaque_index_score NUMERIC(4,2),
  plaque_index_interpretation TEXT,
  oleary_percentage NUMERIC(5,2),
  ohis_di NUMERIC(4,2),
  ohis_ci NUMERIC(4,2),
  ohis_total NUMERIC(4,2),
  gingival_index_score NUMERIC(4,2),
  gingival_index_interpretation TEXT,
  bleeding_index_percentage NUMERIC(5,2),
  bleeding_risk_level TEXT,
  raw_data JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chart_id)
);
ALTER TABLE public.indices_records ENABLE ROW LEVEL SECURITY;

-- ============= RADIOGRAPHS =============
CREATE TABLE public.radiographs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  chart_id UUID REFERENCES public.periodontal_charts(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  taken_on DATE,
  bone_level_mm NUMERIC(4,2),
  bone_loss_pattern bone_loss_pattern,
  crown_root_ratio TEXT,
  calculus_notes TEXT,
  furcation_radiolucency BOOLEAN DEFAULT false,
  notes TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.radiographs ENABLE ROW LEVEL SECURITY;

-- ============= TREATMENT PLANS =============
CREATE TABLE public.treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  chart_id UUID REFERENCES public.periodontal_charts(id) ON DELETE SET NULL,
  tooth_number SMALLINT,
  procedure TEXT NOT NULL,
  priority SMALLINT DEFAULT 2, -- 1 high, 2 med, 3 low
  status treatment_status NOT NULL DEFAULT 'planned',
  scheduled_date DATE,
  completed_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;

-- ============= APPOINTMENTS =============
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes SMALLINT DEFAULT 30,
  supervisor_id UUID REFERENCES auth.users(id),
  student_id UUID REFERENCES auth.users(id),
  procedure TEXT,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- ============= SIGNATURES =============
CREATE TABLE public.signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES public.periodontal_charts(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  comments TEXT
);
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- ============= TIMESTAMP TRIGGERS =============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_charts_updated BEFORE UPDATE ON public.periodontal_charts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_tm_updated BEFORE UPDATE ON public.tooth_measurements FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_indices_updated BEFORE UPDATE ON public.indices_records FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_treatment_updated BEFORE UPDATE ON public.treatment_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= AUTO PROFILE + DEFAULT ROLE =============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, university_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'university_id'
  );

  -- assign role from metadata, default student
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'::app_role)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============= RLS POLICIES =============

-- profiles
CREATE POLICY "View own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Supervisors view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles
CREATE POLICY "View own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- patients
CREATE POLICY "Authenticated view patients" ON public.patients FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Authenticated create patients" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owners and supervisors update patients" ON public.patients FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Admins delete patients" ON public.patients FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- visits
CREATE POLICY "View visits" ON public.visits FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR supervisor_id = auth.uid() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Create visits" ON public.visits FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Update visits" ON public.visits FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

-- periodontal_charts
CREATE POLICY "View charts" ON public.periodontal_charts FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR supervisor_id = auth.uid() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Create charts" ON public.periodontal_charts FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Update charts" ON public.periodontal_charts FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR supervisor_id = auth.uid() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete own draft charts" ON public.periodontal_charts FOR DELETE TO authenticated
  USING ((created_by = auth.uid() AND status = 'draft') OR public.has_role(auth.uid(), 'admin'));

-- tooth_measurements (inherit chart access)
CREATE POLICY "View tooth measurements" ON public.tooth_measurements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.periodontal_charts c WHERE c.id = chart_id AND (
    c.created_by = auth.uid() OR c.supervisor_id = auth.uid()
    OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Modify tooth measurements" ON public.tooth_measurements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.periodontal_charts c WHERE c.id = chart_id AND (
    c.created_by = auth.uid() OR c.supervisor_id = auth.uid()
    OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.periodontal_charts c WHERE c.id = chart_id AND (
    c.created_by = auth.uid() OR c.supervisor_id = auth.uid()
    OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'))));

-- indices_records
CREATE POLICY "View indices" ON public.indices_records FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.periodontal_charts c WHERE c.id = chart_id AND (
    c.created_by = auth.uid() OR c.supervisor_id = auth.uid()
    OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Modify indices" ON public.indices_records FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.periodontal_charts c WHERE c.id = chart_id AND (
    c.created_by = auth.uid() OR c.supervisor_id = auth.uid()
    OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.periodontal_charts c WHERE c.id = chart_id AND (
    c.created_by = auth.uid() OR c.supervisor_id = auth.uid()
    OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'))));

-- radiographs
CREATE POLICY "View radiographs" ON public.radiographs FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Create radiographs" ON public.radiographs FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Update radiographs" ON public.radiographs FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete radiographs" ON public.radiographs FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- treatment_plans
CREATE POLICY "View treatment plans" ON public.treatment_plans FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Create treatment plans" ON public.treatment_plans FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Update treatment plans" ON public.treatment_plans FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete treatment plans" ON public.treatment_plans FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- appointments
CREATE POLICY "View appointments" ON public.appointments FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR supervisor_id = auth.uid() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Create appointments" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() OR supervisor_id = auth.uid() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Update appointments" ON public.appointments FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR supervisor_id = auth.uid() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

-- signatures
CREATE POLICY "View signatures" ON public.signatures FOR SELECT TO authenticated
  USING (supervisor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.periodontal_charts c WHERE c.id = chart_id AND c.created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Supervisors create signatures" ON public.signatures FOR INSERT TO authenticated
  WITH CHECK (supervisor_id = auth.uid() AND (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin')));

-- ============= STORAGE BUCKETS =============
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-photos', 'patient-photos', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('radiographs', 'radiographs', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated read patient photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'patient-photos');
CREATE POLICY "Authenticated upload patient photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Authenticated update own patient photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'patient-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated read radiographs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'radiographs');
CREATE POLICY "Authenticated upload radiographs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'radiographs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "Auth upload avatars" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Auth update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);