import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, FileText, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import SignatureCanvas from "react-signature-canvas";
import { format } from "date-fns";

const CONDITIONS = [
  "diabetes", "hypertension", "heart_disease", "asthma", "epilepsy", "hepatitis", "hiv",
  "bleeding_disorder", "kidney_disease", "thyroid", "cancer", "rheumatic_fever",
];

export default function MedicalHistory() {
  const { id: patientId } = useParams();
  const { user } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>({
    conditions: {}, current_medications: "", allergies_detail: "", smoker: false,
    cigarettes_per_day: "", alcohol_use: "", pregnancy: false, blood_pressure: "",
    pulse: "", last_dental_visit: "", brushing_frequency: "", flossing_frequency: "",
    family_history: "", notes: "",
  });

  // consent
  const [consentType, setConsentType] = useState("treatment");
  const [signedByName, setSignedByName] = useState("");
  const sigRef = useRef<SignatureCanvas | null>(null);

  const load = async () => {
    if (!patientId) return;
    setLoading(true);
    const [{ data: p }, { data: h }, { data: c }] = await Promise.all([
      supabase.from("patients").select("*").eq("id", patientId).maybeSingle(),
      supabase.from("medical_history").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("consents").select("*").eq("patient_id", patientId).order("signed_at", { ascending: false }),
    ]);
    setPatient(p); setHistory(h); setConsents(c ?? []);
    if (h) setForm({
      conditions: h.conditions ?? {}, current_medications: h.current_medications ?? "", allergies_detail: h.allergies_detail ?? "",
      smoker: h.smoker ?? false, cigarettes_per_day: h.cigarettes_per_day ?? "", alcohol_use: h.alcohol_use ?? "",
      pregnancy: h.pregnancy ?? false, blood_pressure: h.blood_pressure ?? "", pulse: h.pulse ?? "",
      last_dental_visit: h.last_dental_visit ?? "", brushing_frequency: h.brushing_frequency ?? "",
      flossing_frequency: h.flossing_frequency ?? "", family_history: h.family_history ?? "", notes: h.notes ?? "",
    });
    setLoading(false);
  };
  useEffect(() => { load(); }, [patientId]);

  const save = async () => {
    if (!user || !patientId) return;
    setSaving(true);
    const payload = {
      patient_id: patientId, recorded_by: user.id,
      ...form,
      cigarettes_per_day: form.cigarettes_per_day ? Number(form.cigarettes_per_day) : null,
      pulse: form.pulse ? Number(form.pulse) : null,
      last_dental_visit: form.last_dental_visit || null,
    };
    const { error } = history
      ? await supabase.from("medical_history").update(payload).eq("id", history.id)
      : await supabase.from("medical_history").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Medical history saved"); load();
  };

  const recordConsent = async () => {
    if (!user || !patientId) return;
    if (!signedByName.trim()) return toast.error("Patient name required");
    if (sigRef.current?.isEmpty()) return toast.error("Signature required");
    const dataUrl = sigRef.current!.getCanvas().toDataURL("image/png");
    const { error } = await supabase.from("consents").insert({
      patient_id: patientId, consent_type: consentType as any,
      signature_data_url: dataUrl, signed_by_name: signedByName, witnessed_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Consent recorded");
    sigRef.current?.clear(); setSignedByName(""); load();
  };

  if (loading) return (<><Topbar title="Medical History" /><div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></>);

  return (
    <>
      <Topbar title={`Medical History · ${patient?.full_name ?? ""}`} subtitle={patient?.patient_code} />
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2"><Link to={`/app/patients/${patientId}`}><ArrowLeft className="h-4 w-4" /> Back to patient</Link></Button>

        <Tabs defaultValue="history">
          <TabsList>
            <TabsTrigger value="history">Questionnaire</TabsTrigger>
            <TabsTrigger value="consent">Consent forms ({consents.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-3">
            <Card className="p-5 space-y-4">
              <div>
                <Label className="mb-2 block">Conditions (check all that apply)</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {CONDITIONS.map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!form.conditions[c]} onCheckedChange={(v) => setForm({ ...form, conditions: { ...form.conditions, [c]: !!v } })} />
                      <span className="capitalize">{c.replace(/_/g, " ")}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>Current medications</Label><Textarea rows={2} value={form.current_medications} onChange={(e) => setForm({ ...form, current_medications: e.target.value })} /></div>
                <div><Label>Allergies detail</Label><Textarea rows={2} value={form.allergies_detail} onChange={(e) => setForm({ ...form, allergies_detail: e.target.value })} /></div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div><Label>Blood pressure</Label><Input value={form.blood_pressure} onChange={(e) => setForm({ ...form, blood_pressure: e.target.value })} placeholder="120/80" /></div>
                <div><Label>Pulse</Label><Input type="number" value={form.pulse} onChange={(e) => setForm({ ...form, pulse: e.target.value })} /></div>
                <div><Label>Last dental visit</Label><Input type="date" value={form.last_dental_visit} onChange={(e) => setForm({ ...form, last_dental_visit: e.target.value })} /></div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-2 text-sm pt-6"><Checkbox checked={form.smoker} onCheckedChange={(v) => setForm({ ...form, smoker: !!v })} /> Smoker</label>
                <div><Label>Cigarettes/day</Label><Input type="number" disabled={!form.smoker} value={form.cigarettes_per_day} onChange={(e) => setForm({ ...form, cigarettes_per_day: e.target.value })} /></div>
                <div><Label>Alcohol use</Label><Input value={form.alcohol_use} onChange={(e) => setForm({ ...form, alcohol_use: e.target.value })} /></div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-2 text-sm pt-6"><Checkbox checked={form.pregnancy} onCheckedChange={(v) => setForm({ ...form, pregnancy: !!v })} /> Pregnancy</label>
                <div><Label>Brushing frequency</Label><Input value={form.brushing_frequency} onChange={(e) => setForm({ ...form, brushing_frequency: e.target.value })} /></div>
                <div><Label>Flossing frequency</Label><Input value={form.flossing_frequency} onChange={(e) => setForm({ ...form, flossing_frequency: e.target.value })} /></div>
              </div>

              <div><Label>Family history</Label><Textarea rows={2} value={form.family_history} onChange={(e) => setForm({ ...form, family_history: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

              <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} <Save className="h-4 w-4" /> Save</Button></div>
            </Card>
          </TabsContent>

          <TabsContent value="consent" className="space-y-3">
            <Card className="p-5 space-y-3">
              <h3 className="font-display font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Record new consent</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>Consent type</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={consentType} onChange={(e) => setConsentType(e.target.value)}>
                    <option value="treatment">Treatment</option><option value="photo">Photo</option><option value="research">Research</option><option value="radiograph">Radiograph</option>
                  </select>
                </div>
                <div><Label>Signed by (patient name)</Label><Input value={signedByName} onChange={(e) => setSignedByName(e.target.value)} /></div>
              </div>
              <div>
                <Label>Patient signature</Label>
                <div className="rounded-md border border-border bg-card"><SignatureCanvas ref={sigRef} canvasProps={{ className: "h-32 w-full" }} /></div>
                <div className="mt-1 flex justify-between"><Button size="sm" variant="ghost" onClick={() => sigRef.current?.clear()}>Clear</Button><Button size="sm" onClick={recordConsent}>Record</Button></div>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 font-display font-semibold">Recorded consents</h3>
              {consents.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">None yet.</p> : (
                <ul className="divide-y divide-border">
                  {consents.map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        {c.signature_data_url && <img src={c.signature_data_url} alt="sig" className="h-10 w-20 rounded border border-border bg-white" />}
                        <div>
                          <p className="text-sm font-medium">{c.signed_by_name} <Badge variant="outline" className="ml-2 capitalize">{c.consent_type}</Badge></p>
                          <p className="text-xs text-muted-foreground">{format(new Date(c.signed_at), "PPp")}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
