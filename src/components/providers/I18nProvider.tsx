import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "en" | "ar";
type Dict = Record<string, string>;

const en: Dict = {
  app_title: "HU Dentistry",
  app_subtitle: "Periodontal Suite",
  dashboard: "Dashboard",
  patients: "Patients",
  charting: "Charting",
  indices: "Indices",
  radiographs: "Radiographs",
  treatment: "Treatment",
  appointments: "Appointments",
  reports: "Reports",
  supervision: "Supervision",
  users: "Users",
  settings: "Settings",
  signout: "Sign out",
  signin: "Sign in",
  signup: "Sign up",
  email: "Email",
  password: "Password",
  full_name: "Full name",
  university_id: "University ID",
  role: "Role",
  student: "Student",
  supervisor: "Supervisor",
  admin: "Admin",
  search: "Search",
  new_patient: "New patient",
  age: "Age",
  gender: "Gender",
  chief_complaint: "Chief complaint",
  medical_history: "Medical history",
  medications: "Medications",
  allergies: "Allergies",
  cancel: "Cancel",
  save: "Save",
  delete: "Delete",
  loading: "Loading…",
  no_patients: "No patients yet",
  patient_code: "Patient ID",
  created: "Created",
  visits: "Visits",
  open: "Open",
};

const ar: Dict = {
  app_title: "كلية طب الأسنان",
  app_subtitle: "مجموعة أمراض اللثة",
  dashboard: "لوحة التحكم",
  patients: "المرضى",
  charting: "المخطط السني",
  indices: "المؤشرات",
  radiographs: "الأشعة",
  treatment: "خطة العلاج",
  appointments: "المواعيد",
  reports: "التقارير",
  supervision: "الإشراف",
  users: "المستخدمون",
  settings: "الإعدادات",
  signout: "تسجيل الخروج",
  signin: "تسجيل الدخول",
  signup: "إنشاء حساب",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  full_name: "الاسم الكامل",
  university_id: "الرقم الجامعي",
  role: "الدور",
  student: "طالب",
  supervisor: "مشرف",
  admin: "مسؤول",
  search: "بحث",
  new_patient: "مريض جديد",
  age: "العمر",
  gender: "الجنس",
  chief_complaint: "الشكوى الرئيسية",
  medical_history: "التاريخ الطبي",
  medications: "الأدوية",
  allergies: "الحساسية",
  cancel: "إلغاء",
  save: "حفظ",
  delete: "حذف",
  loading: "جار التحميل…",
  no_patients: "لا يوجد مرضى",
  patient_code: "رقم المريض",
  created: "تاريخ الإنشاء",
  visits: "الزيارات",
  open: "فتح",
};

const dictionaries: Record<Lang, Dict> = { en, ar };

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof en) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nCtx | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("hu-lang") as Lang) || "en");

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("hu-lang", lang);
  }, [lang]);

  const t = (key: keyof typeof en) => dictionaries[lang][key] ?? en[key] ?? String(key);

  return (
    <I18nContext.Provider value={{ lang, setLang: setLangState, t, dir: lang === "ar" ? "rtl" : "ltr" }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
