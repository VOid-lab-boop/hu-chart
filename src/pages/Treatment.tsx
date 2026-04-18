import { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { ClipboardList, Plus, Loader2, Check, Trash2, ChevronRight } from "lucide-react";

const PHASES = [
  { key: "emergency", label: "1 · Emergency", color: "destructive" },
  { key: "hygiene", label: "2 · Hygiene (Phase I)", color: "info" },
  { key: "reevaluation", label: "3 · Re-evaluation", color: "warning" },
  { key: "corrective", label: "4 · Corrective (Phase II)", color: "default" },
  { key: "maintenance", label: "5 · Maintenance (Phase III)", color: "success" },
] as const;

const STATUSES = ["planned", "in_progress", "completed", "cancelled"] as const;
type Status = typeof STATUSES[number];

export default function Treatment() {
  const [params] = useSearchParams();
  const presetPatient = params.get("patient");
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPatient, setFilterPatient] = useState(presetPatient ?? "all");
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    patient_id: presetPatient ?? "",
    procedure: "",
    tooth_number: "",
    priority: "1",
    scheduled_date: "",
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    const [{ data: ps }, { data: rs }] = await Promise.all([
      supabase.from("patients").select("id, full_name, patient_code").order("full_name"),
      supabase.from("treatment_plans").select("*").order("priority").order("created_at"),
    ]);
    setPatients(ps ?? []);
    setRows(rs ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => filterPatient === "all" ? rows : rows.filter((r) => r.patient_id === filterPatient), [rows, filterPatient]);

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    PHASES.forEach((p) => g[p.key] = []);
    for (const r of filtered) {
      // priority maps to phase: 1=emergency, 2=hygiene, 3=reeval, 4=corrective, 5=maintenance
      const phase = PHASES[Math.min(Math.max((r.priority ?? 2) - 1, 0), PHASES.length - 1)];
      g[phase.key].push(r);
    }
    return g;
  }, [filtered]);

  const submit = async () => {
    if (!user || !form.patient_id || !form.procedure) return toast.error("Patient and procedure required");
    const { error } = await supabase.from("treatment_plans").insert({
      patient_id: form.patient_id,
      created_by: user.id,
      procedure: form.procedure,
      tooth_number: form.tooth_number ? Number(form.tooth_number) : null,
      priority: Number(form.priority),
      scheduled_date: form.scheduled_date || null,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Procedure added");
    setOpen(false);
    setForm({ ...form, procedure: "", tooth_number: "", scheduled_date: "", notes: "" });
    load();
  };

  const updateStatus = async (id: string, status: Status) => {
    const update: any = { status };
    if (status === "completed") update.completed_date = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("treatment_plans").update(update).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this procedure?")) return;
    const { error } = await supabase.from("treatment_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <>
      <Topbar title="Treatment Planning" subtitle="Phased therapy per patient"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add procedure</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New procedure</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Patient</Label>
                  <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Choose patient" /></SelectTrigger>
                    <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Procedure</Label><Input value={form.procedure} onChange={(e) => setForm({ ...form, procedure: e.target.value })} placeholder="e.g. SRP quadrant 1" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Tooth # (optional)</Label><Input type="number" min={1} max={32} value={form.tooth_number} onChange={(e) => setForm({ ...form, tooth_number: e.target.value })} /></div>
                  <div><Label>Phase</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PHASES.map((p, i) => <SelectItem key={p.key} value={String(i + 1)}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Scheduled date</Label><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Add</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <Card className="p-4 flex items-center gap-3">
          <Label className="text-xs">Patient</Label>
          <Select value={filterPatient} onValueChange={setFilterPatient}>
            <SelectTrigger className="h-9 w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All patients</SelectItem>
              {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Card>

        {loading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : (
          <div className="space-y-4">
            {PHASES.map((phase) => (
              <Card key={phase.key} className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display font-semibold flex items-center gap-2"><ChevronRight className="h-4 w-4 text-muted-foreground" />{phase.label}</h3>
                  <Badge variant="outline">{grouped[phase.key].length}</Badge>
                </div>
                {grouped[phase.key].length === 0 ? (
                  <p className="py-3 text-center text-xs text-muted-foreground">No procedures in this phase.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {grouped[phase.key].map((r) => {
                      const pt = patients.find((p) => p.id === r.patient_id);
                      return (
                        <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{r.procedure}</p>
                              {r.tooth_number && <Badge variant="secondary" className="font-mono text-[10px]">#{r.tooth_number}</Badge>}
                              <Badge variant={r.status === "completed" ? "default" : "outline"} className="capitalize text-[10px]">{r.status.replace("_", " ")}</Badge>
                            </div>
                            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                              <Link to={`/app/patients/${r.patient_id}`} className="hover:underline">{pt?.full_name}</Link>
                              {r.scheduled_date && ` · ${r.scheduled_date}`}
                              {r.completed_date && ` · done ${r.completed_date}`}
                            </p>
                            {r.notes && <p className="mt-1 text-xs text-muted-foreground">{r.notes}</p>}
                          </div>
                          <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as Status)}>
                            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize text-xs">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                          </Select>
                          <Button variant="ghost" size="sm" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
