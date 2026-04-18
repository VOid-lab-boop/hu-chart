import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { Camera, Upload, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";

const VIEWS = ["intra-oral front", "right buccal", "left buccal", "upper occlusal", "lower occlusal", "smile", "other"];

export default function Photos() {
  const [params] = useSearchParams();
  const presetPatient = params.get("patient");
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filterPatient, setFilterPatient] = useState(presetPatient ?? "all");
  const [file, setFile] = useState<File | null>(null);
  const [patientId, setPatientId] = useState(presetPatient ?? "");
  const [viewType, setViewType] = useState("intra-oral front");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedPatient = patients.find((p) => p.id === patientId);

  const load = async () => {
    setLoading(true);
    const [{ data: ps }, { data: rs }] = await Promise.all([
      supabase.from("patients").select("id, full_name, patient_code").order("full_name"),
      supabase.from("clinical_photos").select("*").order("created_at", { ascending: false }),
    ]);
    setPatients(ps ?? []);
    const withUrls = await Promise.all((rs ?? []).map(async (r: any) => {
      const { data } = await supabase.storage.from("clinical-photos").createSignedUrl(r.image_url, 3600);
      return { ...r, signed_url: data?.signedUrl };
    }));
    setRows(withUrls); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!file || !patientId || !user) return toast.error("Pick a file and patient");
    setUploading(true);
    const path = `${user.id}/${patientId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("clinical-photos").upload(path, file);
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { error } = await supabase.from("clinical_photos").insert({
      patient_id: patientId, image_url: path, caption: caption || null, view_type: viewType, uploaded_by: user.id,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Photo uploaded");
    setOpen(false); setFile(null); setCaption(""); load();
  };

  const remove = async (r: any) => {
    if (!confirm("Delete photo?")) return;
    await supabase.storage.from("clinical-photos").remove([r.image_url]);
    await supabase.from("clinical_photos").delete().eq("id", r.id); load();
  };

  const filtered = filterPatient === "all" ? rows : rows.filter((r) => r.patient_id === filterPatient);

  return (
    <>
      <Topbar title="Clinical Photos" subtitle="Intra-oral and extra-oral patient photos"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Upload className="h-4 w-4" /> Upload</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload photo</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Patient</Label>
                  <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                        {selectedPatient ? `${selectedPatient.full_name} (${selectedPatient.patient_code})` : "Search patient by name..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Type a name or code..." />
                        <CommandList>
                          <CommandEmpty>No patient found.</CommandEmpty>
                          <CommandGroup>
                            {patients.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`${p.full_name} ${p.patient_code}`}
                                onSelect={() => { setPatientId(p.id); setPickerOpen(false); }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", patientId === p.id ? "opacity-100" : "opacity-0")} />
                                <span className="flex-1">{p.full_name}</span>
                                <span className="ml-2 font-mono text-xs text-muted-foreground">{p.patient_code}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div><Label>Photo file</Label><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
                <div><Label>View type</Label>
                  <Select value={viewType} onValueChange={setViewType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{VIEWS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Caption</Label><Input value={caption} onChange={(e) => setCaption(e.target.value)} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit} disabled={uploading}>{uploading && <Loader2 className="h-4 w-4 animate-spin" />} Upload</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <Card className="p-4 flex items-center gap-3">
          <Label className="text-xs">Patient</Label>
          <Select value={filterPatient} onValueChange={setFilterPatient}>
            <SelectTrigger className="h-9 w-72"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All</SelectItem>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </Card>

        {loading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> :
          filtered.length === 0 ? <Card className="p-10 text-center text-sm text-muted-foreground"><Camera className="mx-auto mb-2 h-6 w-6" />No photos yet.</Card> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((r) => {
              const pt = patients.find((p) => p.id === r.patient_id);
              return (
                <Card key={r.id} className="overflow-hidden">
                  {r.signed_url && <a href={r.signed_url} target="_blank" rel="noreferrer"><img src={r.signed_url} alt={r.caption ?? ""} className="aspect-square w-full object-cover" /></a>}
                  <div className="p-3">
                    <p className="text-xs font-medium truncate"><Link to={`/app/patients/${r.patient_id}`} className="hover:underline">{pt?.full_name}</Link></p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{r.view_type} · {format(new Date(r.created_at), "MMM d")}</p>
                    {r.caption && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.caption}</p>}
                    <div className="flex justify-end pt-1"><Button size="sm" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-3 w-3" /></Button></div>
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
