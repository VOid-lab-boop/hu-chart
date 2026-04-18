import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { Loader2, Activity, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Row {
  id: string;
  status: string;
  chart_date: string;
  patient_id: string;
  patient_name?: string;
  patient_code?: string;
}

export default function ChartingList() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [patients, setPatients] = useState<{ id: string; full_name: string; patient_code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [pickFilter, setPickFilter] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: charts }, { data: pts }] = await Promise.all([
        supabase.from("periodontal_charts").select("id, status, chart_date, patient_id").order("created_at", { ascending: false }),
        supabase.from("patients").select("id, full_name, patient_code").order("full_name"),
      ]);
      const map = new Map((pts ?? []).map(p => [p.id, p]));
      setRows((charts ?? []).map(c => ({ ...c, patient_name: map.get(c.patient_id)?.full_name, patient_code: map.get(c.patient_id)?.patient_code })));
      setPatients(pts ?? []);
      setLoading(false);
    })();
  }, []);

  const startChartFor = async (patientId: string) => {
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("periodontal_charts")
      .insert({ patient_id: patientId, created_by: user.id, status: "draft" })
      .select()
      .single();
    setCreating(false);
    if (error) return toast.error(error.message);
    window.location.href = `/app/charting/${data.id}`;
  };

  const filtered = rows.filter(r =>
    !filter ||
    r.patient_name?.toLowerCase().includes(filter.toLowerCase()) ||
    r.patient_code?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
      <Topbar title="Periodontal Charting" subtitle="Open an existing chart or start a new one" />
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-display font-semibold">Start a new chart</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={pickFilter} onChange={e => setPickFilter(e.target.value)} placeholder="Search patient by name…" className="h-9 pl-9" />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {patients.length === 0 && (
              <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
                No patients yet. <Link to="/app/patients" className="text-primary underline">Create one first</Link>.
              </p>
            )}
            {patients
              .filter(p => !pickFilter || p.full_name.toLowerCase().includes(pickFilter.toLowerCase()) || p.patient_code.toLowerCase().includes(pickFilter.toLowerCase()))
              .map(p => (
              <button
                key={p.id}
                disabled={creating}
                onClick={() => startChartFor(p.id)}
                className="group flex items-center justify-between rounded-md border border-border bg-card p-3 text-left transition-all hover:border-primary/50 hover:shadow-md disabled:opacity-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.full_name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{p.patient_code}</p>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-display font-semibold">All charts</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search patient or code…" className="h-9 pl-9" />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No charts found.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map(r => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.patient_name ?? "—"}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {r.patient_code} · {format(new Date(r.chart_date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={r.status === "approved" ? "default" : "secondary"} className="capitalize">
                      {r.status.replace("_", " ")}
                    </Badge>
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <Link to={`/app/charting/${r.id}`}><Activity className="h-3.5 w-3.5" /> Open</Link>
                    </Button>
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
