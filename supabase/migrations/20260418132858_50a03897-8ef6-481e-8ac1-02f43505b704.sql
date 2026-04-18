
-- ============ REQUIREMENTS & GRADING ============
CREATE TABLE public.graduation_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_name TEXT NOT NULL UNIQUE,
  target_count INT NOT NULL DEFAULT 1,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.graduation_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All view requirements" ON public.graduation_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage requirements" ON public.graduation_requirements FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.case_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES public.periodontal_charts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  supervisor_id UUID NOT NULL,
  diagnosis_score SMALLINT NOT NULL CHECK (diagnosis_score BETWEEN 0 AND 10),
  technique_score SMALLINT NOT NULL CHECK (technique_score BETWEEN 0 AND 10),
  documentation_score SMALLINT NOT NULL CHECK (documentation_score BETWEEN 0 AND 10),
  total_score NUMERIC GENERATED ALWAYS AS ((diagnosis_score + technique_score + documentation_score)::NUMERIC) STORED,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.case_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own grades" ON public.case_grades FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR supervisor_id = auth.uid() OR public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Supervisors create grades" ON public.case_grades FOR INSERT TO authenticated
  WITH CHECK (supervisor_id = auth.uid() AND (public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Supervisors update grades" ON public.case_grades FOR UPDATE TO authenticated
  USING (supervisor_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============ MEDICAL HISTORY ============
CREATE TABLE public.medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  conditions JSONB DEFAULT '{}'::jsonb,
  current_medications TEXT,
  allergies_detail TEXT,
  smoker BOOLEAN DEFAULT false,
  cigarettes_per_day SMALLINT,
  alcohol_use TEXT,
  pregnancy BOOLEAN DEFAULT false,
  blood_pressure TEXT,
  pulse SMALLINT,
  last_dental_visit DATE,
  brushing_frequency TEXT,
  flossing_frequency TEXT,
  family_history TEXT,
  notes TEXT,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View history" ON public.medical_history FOR SELECT TO authenticated
  USING (recorded_by = auth.uid() OR public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.patients p WHERE p.id = medical_history.patient_id AND p.created_by = auth.uid()));
CREATE POLICY "Insert history" ON public.medical_history FOR INSERT TO authenticated
  WITH CHECK (recorded_by = auth.uid());
CREATE POLICY "Update history" ON public.medical_history FOR UPDATE TO authenticated
  USING (recorded_by = auth.uid() OR public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER medical_history_updated BEFORE UPDATE ON public.medical_history FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ CONSENT FORMS ============
CREATE TYPE public.consent_type AS ENUM ('treatment','photo','research','radiograph');
CREATE TABLE public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consent_type public.consent_type NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature_data_url TEXT,
  signed_by_name TEXT NOT NULL,
  witnessed_by UUID NOT NULL,
  notes TEXT
);
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View consents" ON public.consents FOR SELECT TO authenticated
  USING (witnessed_by = auth.uid() OR public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.patients p WHERE p.id = consents.patient_id AND p.created_by = auth.uid()));
CREATE POLICY "Create consents" ON public.consents FOR INSERT TO authenticated
  WITH CHECK (witnessed_by = auth.uid());

-- ============ AUDIT LOG ============
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  changes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Faculty view audit" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_audit_record ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);

CREATE OR REPLACE FUNCTION public.log_audit() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log(table_name, record_id, action, actor_id, changes)
  VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, auth.uid(),
    CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER audit_charts AFTER INSERT OR UPDATE OR DELETE ON public.periodontal_charts FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_signatures AFTER INSERT OR DELETE ON public.signatures FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_treatments AFTER INSERT OR UPDATE OR DELETE ON public.treatment_plans FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_grades AFTER INSERT OR UPDATE ON public.case_grades FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Faculty create notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin') OR user_id = auth.uid());
CREATE INDEX idx_notif_user ON public.notifications(user_id, read, created_at DESC);

-- Notify student when chart status changes
CREATE OR REPLACE FUNCTION public.notify_chart_status() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (NEW.created_by, 'chart_approved', 'Case approved', 'Your periodontal chart was approved.', '/app/charting/'||NEW.id);
    ELSIF NEW.status = 'pending_review' THEN
      -- notify all supervisors/admins
      INSERT INTO public.notifications(user_id, type, title, body, link)
      SELECT ur.user_id, 'chart_pending', 'New case to review', 'A student submitted a chart for review.', '/app/supervision'
      FROM public.user_roles ur WHERE ur.role IN ('supervisor','admin');
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER chart_status_notify AFTER UPDATE ON public.periodontal_charts FOR EACH ROW EXECUTE FUNCTION public.notify_chart_status();

-- ============ CLINICAL PHOTOS ============
CREATE TABLE public.clinical_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  view_type TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clinical_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View photos" ON public.clinical_photos FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Insert photos" ON public.clinical_photos FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Delete photos" ON public.clinical_photos FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_admin(auth.uid()));

INSERT INTO storage.buckets (id, name, public) VALUES ('clinical-photos','clinical-photos',false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('consent-signatures','consent-signatures',false) ON CONFLICT DO NOTHING;

CREATE POLICY "Faculty read clinical photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='clinical-photos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Upload clinical photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='clinical-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Delete own clinical photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='clinical-photos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));

CREATE POLICY "Faculty read radiographs storage" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='radiographs' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Upload radiographs storage" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='radiographs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Delete own radiographs storage" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='radiographs' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));

-- Helper view: requirement progress per student
CREATE OR REPLACE FUNCTION public.requirement_progress(_student_id UUID)
RETURNS TABLE(requirement_id UUID, procedure_name TEXT, target_count INT, completed INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT gr.id, gr.procedure_name, gr.target_count,
    COALESCE((SELECT COUNT(*)::INT FROM public.treatment_plans tp
      WHERE tp.created_by = _student_id AND tp.status='completed'
        AND lower(tp.procedure) LIKE '%'||lower(gr.procedure_name)||'%'), 0)
  FROM public.graduation_requirements gr WHERE gr.active = true;
$$;
