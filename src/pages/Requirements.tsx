import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, GraduationCap } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";

export default function Requirements() {
  const { user, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [reqs, setReqs] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ procedure_name: "", target_count: "5", description: "" });

  const load = async () => {
    setLoading(true);
    const [{ data: r }, { data: s }] = await Promise.all([
      supabase.from("graduation_requirements").select("*").order("procedure_name"),
      supabase.from("user_roles").select("user_id, profiles:profiles!inner(id, full_name, university_id)").eq("role", "student"),
    ]);
    setReqs(r ?? []);
    const stArr = (s ?? []).map((x: any) => x.profiles).filter(Boolean);
    setStudents(stArr);

    const prog: Record<string, any[]> = {};
    await Promise.all(stArr.map(async (st: any) => {
      const { data } = await supabase.rpc("requirement_progress", { _student_id: st.id });
      prog[st.id] = data ?? [];
    }));
    setProgress(prog);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addReq = async () => {
    if (!form.procedure_name) return toast.error("Name required");
    const { error } = await supabase.from("graduation_requirements").insert({
      procedure_name: form.procedure_name, target_count: Number(form.target_count), description: form.description || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Requirement added");
    setOpen(false); setForm({ procedure_name: "", target_count: "5", description: "" }); load();
  };

  const removeReq = async (id: string) => {
    if (!confirm("Delete requirement?")) return;
    await supabase.from("graduation_requirements").delete().eq("id", id);
    load();
  };

  if (loading) return (<><Topbar title="Requirements" /><div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></>);

  return (
    <>
      <Topbar title="Graduation Requirements" subtitle="Track student procedural progress"
        actions={isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Add</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New requirement</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Procedure name</Label><Input value={form.procedure_name} onChange={(e) => setForm({ ...form, procedure_name: e.target.value })} placeholder="e.g. SRP" /></div>
                <div><Label>Target count</Label><Input type="number" value={form.target_count} onChange={(e) => setForm({ ...form, target_count: e.target.value })} /></div>
                <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={addReq}>Add</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />
      <div className="flex-1 p-4 md:p-6 space-y-4">
        <Card className="p-5">
          <h3 className="mb-3 font-display font-semibold">Defined requirements</h3>
          {reqs.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">None yet. {isAdmin && "Add one above."}</p> : (
            <ul className="divide-y divide-border">
              {reqs.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <div><p className="text-sm font-medium">{r.procedure_name}</p><p className="text-xs text-muted-foreground">Target: {r.target_count} {r.description && `· ${r.description}`}</p></div>
                  {isAdmin && <Button variant="ghost" size="sm" onClick={() => removeReq(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 font-display font-semibold flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Student progress</h3>
          {students.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No students enrolled yet.</p> : (
            <div className="space-y-4">
              {students.map((st: any) => {
                const sp = progress[st.id] ?? [];
                const overall = sp.length ? Math.round((sp.filter((p) => p.completed >= p.target_count).length / sp.length) * 100) : 0;
                return (
                  <div key={st.id} className="rounded-md border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div><p className="text-sm font-medium">{st.full_name}</p><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{st.university_id}</p></div>
                      <span className="text-xs">{overall}% complete</span>
                    </div>
                    <div className="space-y-2">
                      {sp.map((p: any) => {
                        const pct = Math.min(100, (p.completed / p.target_count) * 100);
                        return (
                          <div key={p.requirement_id}>
                            <div className="flex justify-between text-[11px]"><span>{p.procedure_name}</span><span className="font-mono">{p.completed}/{p.target_count}</span></div>
                            <Progress value={pct} className="h-1.5" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
