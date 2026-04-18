import { useEffect, useState, useMemo } from "react";
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
import { CalendarDays, Plus, Loader2, Clock } from "lucide-react";
import { format, parseISO, startOfWeek, addDays, isSameDay } from "date-fns";

const STATUSES = ["scheduled", "completed", "cancelled", "no_show"];

export default function Appointments() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "week">("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));

  const [form, setForm] = useState({
    patient_id: "", scheduled_at: "", duration_minutes: "30", procedure: "", notes: "",
  });

  const load = async () => {
    setLoading(true);
    const [{ data: ps }, { data: rs }] = await Promise.all([
      supabase.from("patients").select("id, full_name, patient_code").order("full_name"),
      supabase.from("appointments").select("*").order("scheduled_at"),
    ]);
    setPatients(ps ?? []);
    setRows(rs ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!user || !form.patient_id || !form.scheduled_at) return toast.error("Patient and date required");
    const { error } = await supabase.from("appointments").insert({
      patient_id: form.patient_id, student_id: user.id,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: Number(form.duration_minutes),
      procedure: form.procedure || null, notes: form.notes || null, status: "scheduled",
    });
    if (error) return toast.error(error.message);
    toast.success("Appointment booked");
    setOpen(false); setForm({ ...form, procedure: "", notes: "", scheduled_at: "" });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  return (
    <>
      <Topbar title="Appointments" subtitle="Book and track clinic visits"
        actions={
          <div className="flex items-center gap-2">
            <Select value={view} onValueChange={(v) => setView(v as any)}>
              <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="week">Week</SelectItem><SelectItem value="list">List</SelectItem></SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Book</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New appointment</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Patient</Label>
                    <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                      <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Date & time</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
                    <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></div>
                  </div>
                  <div><Label>Procedure</Label><Input value={form.procedure} onChange={(e) => setForm({ ...form, procedure: e.target.value })} /></div>
                  <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Book</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />
      <div className="flex-1 space-y-4 p-4 md:p-6">
        {loading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : view === "week" ? (
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>← Previous</Button>
              <p className="font-display text-sm font-semibold">{format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}</p>
              <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>Next →</Button>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {days.map((d) => {
                const dayApps = rows.filter((r) => isSameDay(parseISO(r.scheduled_at), d));
                return (
                  <div key={d.toISOString()} className="rounded-md border border-border p-2 min-h-32">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{format(d, "EEE")}</p>
                    <p className="font-display text-lg font-semibold">{format(d, "d")}</p>
                    <div className="mt-1 space-y-1">
                      {dayApps.map((a) => {
                        const pt = patients.find((p) => p.id === a.patient_id);
                        return (
                          <div key={a.id} className="rounded bg-primary/10 p-1.5 text-[10px]">
                            <p className="font-medium truncate">{format(parseISO(a.scheduled_at), "HH:mm")} · {pt?.full_name}</p>
                            {a.procedure && <p className="truncate text-muted-foreground">{a.procedure}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            {rows.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground"><CalendarDays className="mx-auto mb-2 h-6 w-6" />No appointments yet.</div>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((a) => {
                  const pt = patients.find((p) => p.id === a.patient_id);
                  return (
                    <li key={a.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium">{pt?.full_name ?? "—"} <span className="text-muted-foreground">· {a.procedure ?? "Visit"}</span></p>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><Clock className="inline h-3 w-3" /> {format(parseISO(a.scheduled_at), "PPp")} · {a.duration_minutes}min</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{a.status}</Badge>
                        <Select value={a.status} onValueChange={(v) => updateStatus(a.id, v)}>
                          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize text-xs">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
