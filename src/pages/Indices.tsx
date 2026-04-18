import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, Activity } from "lucide-react";
import {
  OHIS_TEETH, plaqueIndexFromScores, gingivalIndex, ohisCalc, bleedingIndex, olearyPercentage,
  type ToothData, UNIVERSAL_TO_FDI,
} from "@/lib/dental";

interface ChartRow { id: string; patient_id: string; chart_date: string; status: string; }

export default function Indices() {
  const { chartId: paramChartId } = useParams();
  const navigate = useNavigate();
  const [charts, setCharts] = useState<(ChartRow & { patient_name?: string; patient_code?: string })[]>([]);
  const [chartId, setChartId] = useState<string | null>(paramChartId ?? null);
  const [teeth, setTeeth] = useState<ToothData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Manual scoring states
  const [plaqueScores, setPlaqueScores] = useState<Record<number, string>>({});
  const [gingivalScores, setGingivalScores] = useState<Record<number, string>>({});
  const [diScores, setDiScores] = useState<Record<number, string>>({});
  const [ciScores, setCiScores] = useState<Record<number, string>>({});

  useEffect(() => {
    (async () => {
      const { data: cs } = await supabase
        .from("periodontal_charts").select("id, patient_id, chart_date, status")
        .order("created_at", { ascending: false });
      const { data: ps } = await supabase.from("patients").select("id, full_name, patient_code");
      const map = new Map((ps ?? []).map((p) => [p.id, p]));
      setCharts((cs ?? []).map((c) => ({ ...c, patient_name: map.get(c.patient_id)?.full_name, patient_code: map.get(c.patient_id)?.patient_code })));
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!chartId) return;
    (async () => {
      const { data: tm } = await supabase.from("tooth_measurements").select("*").eq("chart_id", chartId);
      setTeeth((tm ?? []) as any);
      const { data: existing } = await supabase.from("indices_records").select("*").eq("chart_id", chartId).maybeSingle();
      if (existing?.raw_data) {
        const raw = existing.raw_data as any;
        setPlaqueScores(raw.plaque ?? {});
        setGingivalScores(raw.gingival ?? {});
        setDiScores(raw.di ?? {});
        setCiScores(raw.ci ?? {});
      }
    })();
  }, [chartId]);

  const computed = useMemo(() => {
    const plaqueArr = Object.values(plaqueScores).map(Number).filter((n) => !isNaN(n));
    const gingivalArr = Object.values(gingivalScores).map(Number).filter((n) => !isNaN(n));
    const diArr = Object.values(diScores).map(Number).filter((n) => !isNaN(n));
    const ciArr = Object.values(ciScores).map(Number).filter((n) => !isNaN(n));
    return {
      plaque: plaqueIndexFromScores(plaqueArr),
      gingival: gingivalIndex(gingivalArr),
      ohis: ohisCalc(diArr, ciArr),
      bleeding: bleedingIndex(teeth),
      oleary: olearyPercentage(teeth),
    };
  }, [plaqueScores, gingivalScores, diScores, ciScores, teeth]);

  const save = async () => {
    if (!chartId) return;
    setSaving(true);
    const payload = {
      chart_id: chartId,
      plaque_index_score: computed.plaque.mean,
      plaque_index_interpretation: computed.plaque.interpretation,
      gingival_index_score: computed.gingival.mean,
      gingival_index_interpretation: computed.gingival.interpretation,
      ohis_di: computed.ohis.di,
      ohis_ci: computed.ohis.ci,
      ohis_total: computed.ohis.total,
      bleeding_index_percentage: computed.bleeding.percentage,
      bleeding_risk_level: computed.bleeding.risk,
      oleary_percentage: computed.oleary.percentage,
      raw_data: { plaque: plaqueScores, gingival: gingivalScores, di: diScores, ci: ciScores },
    };
    const { error } = await supabase.from("indices_records").upsert(payload, { onConflict: "chart_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Indices saved");
  };

  if (loading) return (<><Topbar title="Indices" /><div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></>);

  if (!chartId) {
    return (
      <>
        <Topbar title="Periodontal Indices" subtitle="Pick a chart to score" />
        <div className="flex-1 p-4 md:p-6">
          <Card className="p-5">
            <h3 className="mb-3 font-display font-semibold">Select a chart</h3>
            {charts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No charts yet. <Link to="/app/charting" className="text-primary underline">Create one</Link>.</p>
            ) : (
              <ul className="divide-y divide-border">
                {charts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{c.patient_name ?? "—"}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.patient_code} · {c.chart_date}</p>
                    </div>
                    <Button size="sm" onClick={() => { setChartId(c.id); navigate(`/app/indices/${c.id}`, { replace: true }); }}>Score</Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </>
    );
  }

  const ScoreInput = ({ label, value, onChange, max = 3 }: any) => (
    <div className="flex items-center gap-2">
      <span className="w-12 font-mono text-[11px] text-muted-foreground">{label}</span>
      <Input type="number" inputMode="decimal" min={0} max={max} step="0.1" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="h-8 w-20" />
    </div>
  );

  return (
    <>
      <Topbar title="Periodontal Indices" subtitle={`Chart ${chartId.slice(0, 8)}`}
        actions={<Button size="sm" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</Button>}
      />
      <div className="flex-1 p-4 md:p-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <SummaryCard label="Plaque Index" value={computed.plaque.mean.toFixed(2)} note={computed.plaque.interpretation} />
          <SummaryCard label="Gingival Index" value={computed.gingival.mean.toFixed(2)} note={computed.gingival.interpretation} />
          <SummaryCard label="OHI-S" value={computed.ohis.total.toFixed(2)} note={computed.ohis.interpretation} />
          <SummaryCard label="Bleeding Index" value={`${computed.bleeding.percentage}%`} note={computed.bleeding.risk} />
          <SummaryCard label="O'Leary Plaque" value={`${computed.oleary.percentage}%`} note={`${computed.oleary.surfacesWithPlaque}/${computed.oleary.totalSurfaces} surfaces`} />
        </div>

        <Tabs defaultValue="plaque">
          <TabsList>
            <TabsTrigger value="plaque">Plaque (Silness-Löe)</TabsTrigger>
            <TabsTrigger value="gingival">Gingival</TabsTrigger>
            <TabsTrigger value="ohis">OHI-S</TabsTrigger>
            <TabsTrigger value="autobop">From Chart</TabsTrigger>
          </TabsList>

          <TabsContent value="plaque">
            <Card className="p-5">
              <p className="mb-3 text-xs text-muted-foreground">Score each tooth 0–3 (0 none · 1 film · 2 moderate · 3 abundant). Mean across scored teeth.</p>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {OHIS_TEETH.map((t) => (
                  <ScoreInput key={t} label={`#${UNIVERSAL_TO_FDI[t]}`} value={plaqueScores[t] ?? ""} onChange={(v: string) => setPlaqueScores({ ...plaqueScores, [t]: v })} />
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="gingival">
            <Card className="p-5">
              <p className="mb-3 text-xs text-muted-foreground">Score each tooth 0–3 (0 healthy · 1 mild · 2 moderate · 3 severe with bleeding).</p>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {OHIS_TEETH.map((t) => (
                  <ScoreInput key={t} label={`#${UNIVERSAL_TO_FDI[t]}`} value={gingivalScores[t] ?? ""} onChange={(v: string) => setGingivalScores({ ...gingivalScores, [t]: v })} />
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="ohis">
            <Card className="p-5">
              <p className="mb-3 text-xs text-muted-foreground">Six index teeth · Debris (DI) and Calculus (CI) each scored 0–3.</p>
              <div className="space-y-2">
                {OHIS_TEETH.map((t) => (
                  <div key={t} className="flex items-center gap-3 rounded border border-border p-2">
                    <span className="w-16 font-mono text-xs">#{UNIVERSAL_TO_FDI[t]}</span>
                    <Label className="text-xs">DI</Label>
                    <Input type="number" min={0} max={3} step="1" value={diScores[t] ?? ""} onChange={(e) => setDiScores({ ...diScores, [t]: e.target.value })} className="h-8 w-20" />
                    <Label className="text-xs">CI</Label>
                    <Input type="number" min={0} max={3} step="1" value={ciScores[t] ?? ""} onChange={(e) => setCiScores({ ...ciScores, [t]: e.target.value })} className="h-8 w-20" />
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="autobop">
            <Card className="p-5">
              <p className="mb-2 text-xs text-muted-foreground">Computed from charted BOP and plaque.</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Bleeding on Probing (Ainamo & Bay)</p>
                  <p className="mt-1 font-display text-2xl font-semibold">{computed.bleeding.percentage}%</p>
                  <p className="text-xs text-muted-foreground">{computed.bleeding.bleedingSites}/{computed.bleeding.totalSites} sites</p>
                  <Badge variant="outline" className="mt-2">{computed.bleeding.risk}</Badge>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">O'Leary Plaque Score</p>
                  <p className="mt-1 font-display text-2xl font-semibold">{computed.oleary.percentage}%</p>
                  <p className="text-xs text-muted-foreground">{computed.oleary.surfacesWithPlaque}/{computed.oleary.totalSurfaces} surfaces</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Card className="p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 truncate text-[11px] text-muted-foreground" title={note}>{note}</p>
    </Card>
  );
}
