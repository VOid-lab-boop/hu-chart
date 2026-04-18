import { useEffect, useState, useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Download, FileBarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { format, parseISO, subMonths } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ profiles: [], charts: [], appointments: [], treatments: [], indices: [], grades: [], requirements: [] });

  useEffect(() => {
    (async () => {
      const [profiles, charts, appointments, treatments, indices, grades, reqs] = await Promise.all([
        supabase.from("profiles").select("id, full_name, university_id, email"),
        supabase.from("periodontal_charts").select("id, created_by, status, created_at, patient_id"),
        supabase.from("appointments").select("id, status, scheduled_at, student_id"),
        supabase.from("treatment_plans").select("id, created_by, status, procedure, completed_date"),
        supabase.from("indices_records").select("chart_id, plaque_index_score, gingival_index_score, bleeding_index_percentage, oleary_percentage, ohis_total, updated_at"),
        supabase.from("case_grades").select("student_id, total_score, created_at"),
        supabase.from("graduation_requirements").select("*").eq("active", true),
      ]);
      setData({
        profiles: profiles.data ?? [], charts: charts.data ?? [], appointments: appointments.data ?? [],
        treatments: treatments.data ?? [], indices: indices.data ?? [], grades: grades.data ?? [], requirements: reqs.data ?? [],
      });
      setLoading(false);
    })();
  }, []);

  const productivity = useMemo(() => {
    const byStudent: Record<string, any> = {};
    for (const p of data.profiles) byStudent[p.id] = { name: p.full_name, total: 0, approved: 0, pending: 0, draft: 0, grade_avg: 0, grade_count: 0 };
    for (const c of data.charts) {
      const s = byStudent[c.created_by]; if (!s) continue;
      s.total++;
      if (c.status === "approved") s.approved++;
      else if (c.status === "pending_review") s.pending++;
      else if (c.status === "draft") s.draft++;
    }
    for (const g of data.grades) {
      const s = byStudent[g.student_id]; if (!s) continue;
      s.grade_avg = (s.grade_avg * s.grade_count + Number(g.total_score)) / (s.grade_count + 1);
      s.grade_count++;
    }
    return Object.values(byStudent).filter((s: any) => s.total > 0).sort((a: any, b: any) => b.approved - a.approved);
  }, [data]);

  const throughput = useMemo(() => {
    const months: Record<string, any> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = format(d, "MMM yy");
      months[key] = { month: key, charts: 0, appointments: 0, completedTx: 0 };
    }
    for (const c of data.charts) {
      const key = format(parseISO(c.created_at), "MMM yy");
      if (months[key]) months[key].charts++;
    }
    for (const a of data.appointments) {
      const key = format(parseISO(a.scheduled_at), "MMM yy");
      if (months[key] && a.status === "completed") months[key].appointments++;
    }
    for (const t of data.treatments) {
      if (!t.completed_date) continue;
      const key = format(parseISO(t.completed_date), "MMM yy");
      if (months[key]) months[key].completedTx++;
    }
    return Object.values(months);
  }, [data]);

  const outcomes = useMemo(() => {
    return data.indices
      .filter((i: any) => i.updated_at)
      .sort((a: any, b: any) => a.updated_at.localeCompare(b.updated_at))
      .slice(-30)
      .map((i: any, idx: number) => ({
        idx: idx + 1,
        plaque: Number(i.plaque_index_score) || 0,
        gingival: Number(i.gingival_index_score) || 0,
        bleeding: Number(i.bleeding_index_percentage) || 0,
        oleary: Number(i.oleary_percentage) || 0,
      }));
  }, [data]);

  const exportPDF = (section: string) => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("HU Dentistry — Reports", 14, 18);
    doc.setFontSize(10); doc.text(`${section} · ${format(new Date(), "PPP")}`, 14, 25);
    if (section === "Productivity") {
      autoTable(doc, {
        startY: 32,
        head: [["Student", "Total", "Approved", "Pending", "Draft", "Avg Grade"]],
        body: productivity.map((s: any) => [s.name, s.total, s.approved, s.pending, s.draft, s.grade_count ? s.grade_avg.toFixed(1) : "—"]),
      });
    } else if (section === "Throughput") {
      autoTable(doc, { startY: 32, head: [["Month", "Charts", "Appointments", "Completed Tx"]], body: throughput.map((r: any) => [r.month, r.charts, r.appointments, r.completedTx]) });
    } else if (section === "Outcomes") {
      autoTable(doc, { startY: 32, head: [["#", "Plaque", "Gingival", "BOP%", "O'Leary%"]], body: outcomes.map((o: any) => [o.idx, o.plaque, o.gingival, o.bleeding, o.oleary]) });
    }
    doc.save(`HU-Report-${section}-${Date.now()}.pdf`);
    toast.success("PDF downloaded");
  };

  if (loading) return (<><Topbar title="Reports" /><div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></>);

  return (
    <>
      <Topbar title="Reports & Analytics" subtitle="Faculty-wide performance and clinical outcomes" />
      <div className="flex-1 p-4 md:p-6">
        <Tabs defaultValue="productivity">
          <TabsList>
            <TabsTrigger value="productivity">Student Productivity</TabsTrigger>
            <TabsTrigger value="throughput">Clinic Throughput</TabsTrigger>
            <TabsTrigger value="outcomes">Clinical Outcomes</TabsTrigger>
          </TabsList>

          <TabsContent value="productivity" className="space-y-4">
            <div className="flex justify-end"><Button size="sm" variant="outline" onClick={() => exportPDF("Productivity")}><Download className="h-4 w-4" /> PDF</Button></div>
            <Card className="p-5">
              <h3 className="mb-4 font-display font-semibold">Cases per student</h3>
              {productivity.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No data yet.</p> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                    <Legend />
                    <Bar dataKey="approved" stackId="a" fill="hsl(var(--primary))" name="Approved" />
                    <Bar dataKey="pending" stackId="a" fill="hsl(var(--warning))" name="Pending" />
                    <Bar dataKey="draft" stackId="a" fill="hsl(var(--muted-foreground))" name="Draft" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 font-display font-semibold">Detail</h3>
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Student</th><th>Total</th><th>Approved</th><th>Approval %</th><th>Avg grade /30</th></tr></thead>
                <tbody>{productivity.map((s: any) => (
                  <tr key={s.name} className="border-b border-border"><td className="py-2 font-medium">{s.name}</td><td>{s.total}</td><td>{s.approved}</td><td>{s.total ? Math.round((s.approved / s.total) * 100) : 0}%</td><td>{s.grade_count ? s.grade_avg.toFixed(1) : "—"}</td></tr>
                ))}</tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="throughput" className="space-y-4">
            <div className="flex justify-end"><Button size="sm" variant="outline" onClick={() => exportPDF("Throughput")}><Download className="h-4 w-4" /> PDF</Button></div>
            <Card className="p-5">
              <h3 className="mb-4 font-display font-semibold">Last 6 months</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={throughput}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Bar dataKey="charts" fill="hsl(var(--primary))" name="Charts" />
                  <Bar dataKey="appointments" fill="hsl(var(--info))" name="Appointments" />
                  <Bar dataKey="completedTx" fill="hsl(var(--success))" name="Treatments" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          <TabsContent value="outcomes" className="space-y-4">
            <div className="flex justify-end"><Button size="sm" variant="outline" onClick={() => exportPDF("Outcomes")}><Download className="h-4 w-4" /> PDF</Button></div>
            <Card className="p-5">
              <h3 className="mb-4 font-display font-semibold">Clinical indices trend (last 30 records)</h3>
              {outcomes.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No indices recorded yet.</p> : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={outcomes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="idx" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                    <Legend />
                    <Line type="monotone" dataKey="plaque" stroke="hsl(var(--primary))" name="Plaque" />
                    <Line type="monotone" dataKey="gingival" stroke="hsl(var(--warning))" name="Gingival" />
                    <Line type="monotone" dataKey="bleeding" stroke="hsl(var(--destructive))" name="BOP%" />
                    <Line type="monotone" dataKey="oleary" stroke="hsl(var(--info))" name="O'Leary%" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
