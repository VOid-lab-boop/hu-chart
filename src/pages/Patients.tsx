import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Loader2, User } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import { format } from "date-fns";

interface Patient {
  id: string;
  patient_code: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  chief_complaint: string | null;
  created_at: string;
}

export default function Patients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // form
  const [fName, setFName] = useState("");
  const [fDob, setFDob] = useState("");
  const [fGender, setFGender] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fChief, setFChief] = useState("");
  const [fHistory, setFHistory] = useState("");
  const [fMeds, setFMeds] = useState("");
  const [fAllergies, setFAllergies] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("patients")
      .select("id, patient_code, full_name, date_of_birth, gender, chief_complaint, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setPatients((data ?? []) as Patient[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("patients").insert({
      full_name: fName,
      date_of_birth: fDob || null,
      gender: (fGender as any) || null,
      phone: fPhone || null,
      chief_complaint: fChief || null,
      medical_history: fHistory || null,
      medications: fMeds || null,
      allergies: fAllergies || null,
      created_by: user.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Patient created");
    setOpen(false);
    setFName(""); setFDob(""); setFGender(""); setFPhone("");
    setFChief(""); setFHistory(""); setFMeds(""); setFAllergies("");
    load();
  };

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.full_name.toLowerCase().includes(q) || p.patient_code.toLowerCase().includes(q);
  });

  const computeAge = (dob: string | null) => {
    if (!dob) return "—";
    const d = new Date(dob);
    return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  };

  return (
    <>
      <Topbar
        title="Patients"
        subtitle={`${patients.length} total`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New patient</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New patient</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-3">
                <div>
                  <Label>Full name *</Label>
                  <Input required value={fName} onChange={(e) => setFName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date of birth</Label>
                    <Input type="date" value={fDob} onChange={(e) => setFDob(e.target.value)} />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select value={fGender} onValueChange={setFGender}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={fPhone} onChange={(e) => setFPhone(e.target.value)} />
                </div>
                <div>
                  <Label>Chief complaint</Label>
                  <Textarea rows={2} value={fChief} onChange={(e) => setFChief(e.target.value)} />
                </div>
                <div>
                  <Label>Medical history</Label>
                  <Textarea rows={2} value={fHistory} onChange={(e) => setFHistory(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Medications</Label>
                    <Input value={fMeds} onChange={(e) => setFMeds(e.target.value)} />
                  </div>
                  <div>
                    <Label>Allergies</Label>
                    <Input value={fAllergies} onChange={(e) => setFAllergies(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 space-y-4 p-4 md:p-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or ID…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <User className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No patients yet</p>
            <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add first patient</Button>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Patient ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Age</th>
                    <th className="px-4 py-3">Gender</th>
                    <th className="px-4 py-3">Chief complaint</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{p.patient_code}</td>
                      <td className="px-4 py-3 font-medium">{p.full_name}</td>
                      <td className="px-4 py-3 tabular-nums">{computeAge(p.date_of_birth)}</td>
                      <td className="px-4 py-3"><Badge variant="secondary" className="capitalize">{p.gender ?? "—"}</Badge></td>
                      <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">{p.chief_complaint ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy")}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" asChild><Link to={`/app/patients/${p.id}`}>Open</Link></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
