import { Link } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { Users, Activity, ClipboardList, ShieldCheck, ArrowUpRight, Plus } from "lucide-react";

interface Stats {
  patients: number;
  drafts: number;
  pending: number;
  approved: number;
}

export default function Dashboard() {
  const { user, roles } = useAuth();
  const [stats, setStats] = useState<Stats>({ patients: 0, drafts: 0, pending: 0, approved: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [p, d, pe, a, r] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("periodontal_charts").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("periodontal_charts").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase.from("periodontal_charts").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("patients").select("id, patient_code, full_name, created_at").order("created_at", { ascending: false }).limit(5),
      ]);
      setStats({
        patients: p.count ?? 0,
        drafts: d.count ?? 0,
        pending: pe.count ?? 0,
        approved: a.count ?? 0,
      });
      setRecent(r.data ?? []);
    })();
  }, []);

  const StatCard = ({ icon: Icon, label, value, accent }: any) => (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent ?? "text-muted-foreground"}`} />
      </div>
      <div className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</div>
    </Card>
  );

  return (
    <>
      <Topbar
        title={`Welcome${user?.email ? ", " + user.email.split("@")[0] : ""}`}
        subtitle={`${roles.join(", ") || "user"} · HU Faculty of Dentistry`}
        actions={
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/app/patients"><Plus className="h-4 w-4" /> New patient</Link>
          </Button>
        }
      />

      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Patients" value={stats.patients} accent="text-primary" />
          <StatCard icon={Activity} label="Draft cases" value={stats.drafts} accent="text-info" />
          <StatCard icon={ClipboardList} label="Pending review" value={stats.pending} accent="text-warning" />
          <StatCard icon={ShieldCheck} label="Approved" value={stats.approved} accent="text-success" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display font-semibold">Recent patients</h3>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/patients" className="gap-1">View all <ArrowUpRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </div>
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No patients yet — add your first patient to get started.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{p.full_name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{p.patient_code}</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/app/patients/${p.id}`}>Open</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5 bg-gradient-primary text-primary-foreground">
            <h3 className="font-display font-semibold">Periodontal Suite</h3>
            <p className="mt-2 text-sm opacity-90">
              Full 32-tooth charting with auto-calculated CAL, BOP, and clinical indices.
            </p>
            <Button asChild variant="secondary" className="mt-4 w-full">
              <Link to="/app/charting">Open charting →</Link>
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
