import { useEffect, useState, useRef } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import { ShieldCheck, Loader2, ClipboardCheck, PenLine } from "lucide-react";
import { format } from "date-fns";
import { summarizeChart, UNIVERSAL_TO_FDI, SITES, calcCAL, type ToothData } from "@/lib/dental";
import SignatureCanvas from "react-signature-canvas";

export default function Supervision() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<any[]>([]);
  const [reviewed, setReviewed] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [teeth, setTeeth] = useState<ToothData[]>([]);
  const [comment, setComment] = useState("");
  const [diag, setDiag] = useState("8");
  const [tech, setTech] = useState("8");
  const [docu, setDocu] = useState("8");
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: pen }, { data: rev }] = await Promise.all([
      supabase.from("periodontal_charts").select("*, patients(full_name, patient_code)").eq("status", "pending_review").order("updated_at", { ascending: false }),
      supabase.from("periodontal_charts").select("*, patients(full_name, patient_code)").eq("status", "approved").order("approved_at", { ascending: false }).limit(20),
    ]);
    setPending(pen ?? []);
    setReviewed(rev ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openChart = async (c: any) => {
    setActive(c);
    setComment(""); setDiag("8"); setTech("8"); setDocu("8");
    const { data } = await supabase.from("tooth_measurements").select("*").eq("chart_id", c.id);
    setTeeth((data ?? []) as any);
  };

  const approve = async () => {
    if (!active || !user) return;
    setSubmitting(true);

    // 1. signature image
    let sigUrl: string | null = null;
    if (sigRef.current && !sigRef.current.isEmpty()) {
      sigUrl = sigRef.current.getCanvas().toDataURL("image/png");
    }

    // 2. insert signature record
    const { error: sigErr } = await supabase.from("signatures").insert({
      chart_id: active.id, supervisor_id: user.id, comments: comment || null,
    });
    if (sigErr) { setSubmitting(false); return toast.error(sigErr.message); }

    // 3. insert grade
    await supabase.from("case_grades").insert({
      chart_id: active.id, student_id: active.created_by, supervisor_id: user.id,
      diagnosis_score: Number(diag), technique_score: Number(tech), documentation_score: Number(docu),
      comments: comment || null,
    });

    // 4. update chart to approved (this fires the trigger that notifies the student)
    const { error: updErr } = await supabase.from("periodontal_charts").update({
      status: "approved", supervisor_id: user.id, approved_at: new Date().toISOString(),
    }).eq("id", active.id);

    setSubmitting(false);
    if (updErr) return toast.error(updErr.message);
    toast.success("Case approved & signed");
    setActive(null); load();
  };

  const reject = async () => {
    if (!active || !user) return;
    if (!comment.trim()) return toast.error("Add a comment explaining what to fix");
    const { error } = await supabase.from("periodontal_charts").update({ status: "draft", supervisor_id: user.id }).eq("id", active.id);
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      user_id: active.created_by, type: "chart_rejected", title: "Case sent back for revision",
      body: comment, link: `/app/charting/${active.id}`,
    });
    toast.success("Sent back to student");
    setActive(null); load();
  };

  const summary = teeth.length > 0 ? summarizeChart(teeth) : null;

  if (loading) return (<><Topbar title="Supervisor Review" /><div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></>);

  return (
    <>
      <Topbar title="Supervisor Review" subtitle="Approve and digitally sign student cases" />
      <div className="flex-1 p-4 md:p-6">
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending <Badge variant="default" className="ml-2">{pending.length}</Badge></TabsTrigger>
            <TabsTrigger value="reviewed">Recently approved</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="p-5">
              {pending.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground"><ShieldCheck className="mx-auto mb-2 h-6 w-6" />Nothing waiting for review.</p> : (
                <ul className="divide-y divide-border">
                  {pending.map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium">{c.patients?.full_name}</p>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.patients?.patient_code} · {format(new Date(c.chart_date), "PP")}</p>
                      </div>
                      <Button size="sm" onClick={() => openChart(c)}><ClipboardCheck className="h-4 w-4" /> Review</Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="reviewed">
            <Card className="p-5">
              {reviewed.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No approved cases yet.</p> : (
                <ul className="divide-y divide-border">
                  {reviewed.map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium">{c.patients?.full_name}</p>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.patients?.patient_code} · approved {c.approved_at ? format(new Date(c.approved_at), "PPp") : "—"}</p>
                      </div>
                      <Badge variant="default">Approved</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Review · {active?.patients?.full_name}</DialogTitle></DialogHeader>
          {summary && (
            <div className="grid gap-3 md:grid-cols-4">
              <Stat label="Mean PD" value={`${summary.meanPD} mm`} />
              <Stat label="Mean CAL" value={`${summary.meanCAL} mm`} />
              <Stat label="Sites ≥4mm" value={summary.sitesGT4mm} />
              <Stat label="Present teeth" value={summary.presentTeeth} />
            </div>
          )}

          <Card className="p-3 max-h-72 overflow-auto">
            <h4 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Per-tooth (read-only)</h4>
            <table className="w-full text-[11px]">
              <thead><tr className="text-muted-foreground"><th className="text-left">Tooth</th><th>Sites PD/GM/CAL</th><th>BOP</th><th>Mob</th></tr></thead>
              <tbody>
                {teeth.filter((t) => !t.is_missing).map((t) => (
                  <tr key={t.tooth_number} className="border-t border-border">
                    <td className="py-1 font-mono">#{UNIVERSAL_TO_FDI[t.tooth_number]}</td>
                    <td className="py-1">{SITES.map((s) => {
                      const pd = (t as any)[`pd_${s}`]; const gm = (t as any)[`gm_${s}`];
                      if (pd == null) return null;
                      return <span key={s} className="mr-2">{s}:{pd}/{gm ?? 0}/{calcCAL(pd, gm)}</span>;
                    })}</td>
                    <td className="py-1">{SITES.filter((s) => (t as any)[`bop_${s}`]).length}</td>
                    <td className="py-1">{t.mobility ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="grid gap-3 md:grid-cols-3">
            <div><Label>Diagnosis /10</Label><Input type="number" min={0} max={10} value={diag} onChange={(e) => setDiag(e.target.value)} /></div>
            <div><Label>Technique /10</Label><Input type="number" min={0} max={10} value={tech} onChange={(e) => setTech(e.target.value)} /></div>
            <div><Label>Documentation /10</Label><Input type="number" min={0} max={10} value={docu} onChange={(e) => setDocu(e.target.value)} /></div>
          </div>

          <div><Label>Comment</Label><Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Optional. Required if rejecting." /></div>

          <div>
            <Label className="flex items-center gap-2"><PenLine className="h-3.5 w-3.5" /> Digital signature</Label>
            <div className="rounded-md border border-border bg-card">
              <SignatureCanvas ref={sigRef} canvasProps={{ className: "h-32 w-full" }} />
            </div>
            <div className="mt-1 flex justify-end"><Button size="sm" variant="ghost" onClick={() => sigRef.current?.clear()}>Clear</Button></div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={reject} disabled={submitting}>Send back</Button>
            <Button onClick={approve} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />}<ShieldCheck className="h-4 w-4" /> Approve & sign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({ label, value }: any) {
  return (
    <Card className="p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}
