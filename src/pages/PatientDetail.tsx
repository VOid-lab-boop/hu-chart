import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Activity, ScanLine, ClipboardList } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PatientDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [charts, setCharts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const [{ data: p, error }, { data: c }] = await Promise.all([
        supabase.from("patients").select("*").eq("id", id).maybeSingle(),
        supabase.from("periodontal_charts").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
      ]);
      if (error) toast.error(error.message);
      setPatient(p);
      setCharts(c ?? []);
      setLoading(false);
    })();
  }, [id]);

  const startNewChart = async () => {
    if (!id || !user) return;
    const { data, error } = await supabase
      .from("periodontal_charts")
      .insert({ patient_id: id, created_by: user.id, status: "draft" })
      .select()
      .single();
    if (error) return toast.error(error.message);
    window.location.href = `/app/charting/${data.id}`;
  };

  if (loading) {
    return (
      <>
        <Topbar title="Patient" />
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </>
    );
  }

  if (!patient) {
    return (
      <>
        <Topbar title="Patient not found" />
        <div className="flex-1 p-6">
          <Button variant="ghost" asChild><Link to="/app/patients"><ArrowLeft className="h-4 w-4" /> Back to patients</Link></Button>
        </div>
      </>
    );
  }

  const statusVariant: Record<string, string> = {
    draft: "secondary", pending_review: "default", approved: "default", completed: "default",
  };

  return (
    <>
      <Topbar
        title={patient.full_name}
        subtitle={patient.patient_code}
        actions={<Button size="sm" onClick={startNewChart}><Activity className="h-4 w-4" /> New chart</Button>}
      />
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link to="/app/patients"><ArrowLeft className="h-4 w-4" /> Patients</Link>
        </Button>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-5">
            <h3 className="mb-4 font-display font-semibold">Patient information</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Date of birth</dt><dd>{patient.date_of_birth ? format(new Date(patient.date_of_birth), "MMM d, yyyy") : "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Gender</dt><dd className="capitalize">{patient.gender ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Phone</dt><dd>{patient.phone ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Email</dt><dd>{patient.email ?? "—"}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-muted-foreground">Chief complaint</dt><dd>{patient.chief_complaint ?? "—"}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-muted-foreground">Medical history</dt><dd>{patient.medical_history ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Medications</dt><dd>{patient.medications ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Allergies</dt><dd>{patient.allergies ?? "—"}</dd></div>
            </dl>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 font-display font-semibold">Quick actions</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2" onClick={startNewChart}><Activity className="h-4 w-4" /> Start periodontal chart</Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild><Link to={`/app/radiographs?patient=${patient.id}`}><ScanLine className="h-4 w-4" /> Upload radiograph</Link></Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild><Link to={`/app/treatment?patient=${patient.id}`}><ClipboardList className="h-4 w-4" /> View treatment plan</Link></Button>
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <h3 className="mb-3 font-display font-semibold">Periodontal charts</h3>
          {charts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No charts yet. Start one above.</p>
          ) : (
            <ul className="divide-y divide-border">
              {charts.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{format(new Date(c.chart_date), "MMM d, yyyy")}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{c.id.slice(0, 8)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusVariant[c.status] as any}>{c.status.replace("_", " ")}</Badge>
                    <Button size="sm" variant="ghost" asChild><Link to={`/app/charting/${c.id}`}>Open</Link></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
