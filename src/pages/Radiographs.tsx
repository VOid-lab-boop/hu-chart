import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ScanLine, Upload, Loader2, Trash2, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { format } from "date-fns";

type Pattern = "horizontal" | "vertical" | "mixed" | "none";

export default function Radiographs() {
  const [params] = useSearchParams();
  const presetPatient = params.get("patient");
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filterPatient, setFilterPatient] = useState<string>(presetPatient ?? "all");

  // form
  const [file, setFile] = useState<File | null>(null);
  const [patientId, setPatientId] = useState<string>(presetPatient ?? "");
  const [taken, setTaken] = useState<string>(new Date().toISOString().slice(0, 10));
  const [bone, setBone] = useState<string>("");
  const [pattern, setPattern] = useState<Pattern | "">("");
  const [crr, setCrr] = useState("");
  const [calc, setCalc] = useState("");
  const [furc, setFurc] = useState(false);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: ps }, { data: rs }] = await Promise.all([
      supabase.from("patients").select("id, full_name, patient_code").order("full_name"),
      supabase.from("radiographs").select("*").order("created_at", { ascending: false }),
    ]);
    setPatients(ps ?? []);
    // Generate signed URLs
    const withUrls = await Promise.all((rs ?? []).map(async (r: any) => {
      const path = r.image_url.replace(/^.*\/object\/(public|sign|authenticated)\/[^/]+\//, "").split("?")[0];
      const { data: signed } = await supabase.storage.from("radiographs").createSignedUrl(path || r.image_url, 3600);
      return { ...r, signed_url: signed?.signedUrl };
    }));
    setRows(withUrls);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!file || !patientId || !user) return toast.error("Pick a file and patient");
    setUploading(true);
    const path = `${user.id}/${patientId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("radiographs").upload(path, file);
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { error } = await supabase.from("radiographs").insert({
      patient_id: patientId, image_url: path, uploaded_by: user.id,
      taken_on: taken || null,
      bone_level_mm: bone ? Number(bone) : null,
      bone_loss_pattern: (pattern || null) as any,
      crown_root_ratio: crr || null,
      calculus_notes: calc || null,
      furcation_radiolucency: furc,
      notes: notes || null,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Radiograph uploaded");
    setOpen(false); setFile(null); setBone(""); setPattern(""); setCrr(""); setCalc(""); setFurc(false); setNotes("");
    load();
  };

  const removeRow = async (r: any) => {
    if (!confirm("Delete this radiograph?")) return;
    await supabase.storage.from("radiographs").remove([r.image_url]);
    await supabase.from("radiographs").delete().eq("id", r.id);
    load();
  };

  const filtered = filterPatient === "all" ? rows : rows.filter((r) => r.patient_id === filterPatient);

  return (
    <>
      <Topbar title="Radiographs" subtitle="Upload and annotate periapical & bitewing images"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Upload className="h-4 w-4" /> Upload</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Upload radiograph</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Patient</Label>
                  <Select value={patientId} onValueChange={setPatientId}>
                    <SelectTrigger><SelectValue placeholder="Choose patient" /></SelectTrigger>
                    <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name} · {p.patient_code}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Image file</Label><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Taken on</Label><Input type="date" value={taken} onChange={(e) => setTaken(e.target.value)} /></div>
                  <div><Label>Bone level (mm)</Label><Input type="number" step="0.1" value={bone} onChange={(e) => setBone(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Bone loss pattern</Label>
                    <Select value={pattern} onValueChange={(v) => setPattern(v as Pattern)}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="horizontal">Horizontal</SelectItem>
                        <SelectItem value="vertical">Vertical</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Crown:Root ratio</Label><Input value={crr} onChange={(e) => setCrr(e.target.value)} placeholder="e.g. 1:2" /></div>
                </div>
                <div><Label>Calculus notes</Label><Input value={calc} onChange={(e) => setCalc(e.target.value)} /></div>
                <div className="flex items-center gap-2"><Checkbox id="furc" checked={furc} onCheckedChange={(v) => setFurc(!!v)} /><Label htmlFor="furc">Furcation radiolucency</Label></div>
                <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit} disabled={uploading}>{uploading && <Loader2 className="h-4 w-4 animate-spin" />} Upload</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Label className="text-xs">Filter by patient</Label>
            <Select value={filterPatient} onValueChange={setFilterPatient}>
              <SelectTrigger className="h-9 w-72"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All patients</SelectItem>
                {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground"><ScanLine className="mx-auto mb-2 h-6 w-6" />No radiographs yet.</Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => {
              const pt = patients.find((p) => p.id === r.patient_id);
              return (
                <Card key={r.id} className="overflow-hidden">
                  {r.signed_url ? (
                    <a href={r.signed_url} target="_blank" rel="noreferrer" className="block aspect-video bg-muted">
                      <img src={r.signed_url} alt="Radiograph" className="h-full w-full object-cover" />
                    </a>
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-muted"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>
                  )}
                  <div className="p-4 space-y-1">
                    <p className="text-sm font-medium truncate"><Link to={`/app/patients/${r.patient_id}`} className="hover:underline">{pt?.full_name ?? "—"}</Link></p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{r.taken_on ? format(new Date(r.taken_on), "MMM d, yyyy") : "—"} · {r.bone_loss_pattern ?? "no pattern"}</p>
                    {r.bone_level_mm != null && <p className="text-xs">Bone level: {r.bone_level_mm} mm</p>}
                    {r.notes && <p className="text-xs text-muted-foreground line-clamp-2">{r.notes}</p>}
                    <div className="flex justify-end pt-2"><Button size="sm" variant="ghost" onClick={() => removeRow(r)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
