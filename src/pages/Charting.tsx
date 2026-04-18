import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  UPPER_TEETH, LOWER_TEETH_ORDERED, UNIVERSAL_TO_FDI, MULTI_ROOTED,
  SITES, BUCCAL_SITES, LINGUAL_SITES, type ToothData, type Site,
  calcCAL, severityFromPD, summarizeChart,
  olearyPercentage, bleedingIndex,
} from "@/lib/dental";
import { Loader2, Save, CheckCircle2, Droplet, Activity, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

/** Empty tooth helper. */
const emptyTooth = (n: number): ToothData => ({ tooth_number: n, is_missing: false });

const SEVERITY_BG: Record<string, string> = {
  healthy: "bg-[hsl(var(--severity-healthy))]/15 text-[hsl(var(--severity-healthy))] border-[hsl(var(--severity-healthy))]/40",
  mild:    "bg-[hsl(var(--severity-mild))]/20 text-[hsl(var(--severity-mild))] border-[hsl(var(--severity-mild))]/50",
  moderate:"bg-[hsl(var(--severity-moderate))]/20 text-[hsl(var(--severity-moderate))] border-[hsl(var(--severity-moderate))]/50",
  severe:  "bg-[hsl(var(--severity-severe))]/25 text-[hsl(var(--severity-severe))] border-[hsl(var(--severity-severe))]/60",
  none:    "bg-muted/30 text-muted-foreground border-border",
};

export default function Charting() {
  const { id } = useParams();
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [chart, setChart] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [teeth, setTeeth] = useState<Record<number, ToothData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Load chart + patient + measurements
  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: c, error } = await supabase.from("periodontal_charts").select("*").eq("id", id).maybeSingle();
      if (error || !c) { toast.error(error?.message ?? "Chart not found"); setLoading(false); return; }
      setChart(c);
      const { data: p } = await supabase.from("patients").select("*").eq("id", c.patient_id).maybeSingle();
      setPatient(p);
      const { data: tm } = await supabase.from("tooth_measurements").select("*").eq("chart_id", id);
      const map: Record<number, ToothData> = {};
      for (let n = 1; n <= 32; n++) map[n] = emptyTooth(n);
      (tm ?? []).forEach((row: any) => { map[row.tooth_number] = row as ToothData; });
      setTeeth(map);
      setLoading(false);
    })();
  }, [id]);

  const list = useMemo<ToothData[]>(() => Object.values(teeth), [teeth]);
  const summary = useMemo(() => summarizeChart(list), [list]);
  const oleary = useMemo(() => olearyPercentage(list), [list]);
  const bop = useMemo(() => bleedingIndex(list), [list]);

  const updateSite = (toothNum: number, key: keyof ToothData, value: any) => {
    setTeeth(prev => ({ ...prev, [toothNum]: { ...prev[toothNum], [key]: value } }));
    setDirty(true);
  };

  const toggleMissing = (toothNum: number) => {
    setTeeth(prev => ({ ...prev, [toothNum]: { ...prev[toothNum], is_missing: !prev[toothNum].is_missing } }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const rows = list.map(t => ({ ...t, chart_id: id }));
    const { error } = await supabase.from("tooth_measurements").upsert(rows, { onConflict: "chart_id,tooth_number" } as any);
    setSaving(false);
    if (error) {
      // Fallback if no unique constraint: delete + insert
      const { error: delErr } = await supabase.from("tooth_measurements").delete().eq("chart_id", id);
      if (delErr) { toast.error(delErr.message); return; }
      const { error: insErr } = await supabase.from("tooth_measurements").insert(rows);
      if (insErr) { toast.error(insErr.message); return; }
    }
    setDirty(false);
    toast.success("Chart saved");
  };

  const submitForReview = async () => {
    if (!id) return;
    await handleSave();
    const { error } = await supabase.from("periodontal_charts").update({ status: "pending_review" }).eq("id", id);
    if (error) return toast.error(error.message);
    setChart((c: any) => ({ ...c, status: "pending_review" }));
    toast.success("Submitted for supervisor review");
  };

  const approve = async () => {
    if (!id) return;
    const { error } = await supabase.from("periodontal_charts").update({ status: "approved", supervisor_id: user?.id, approved_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    setChart((c: any) => ({ ...c, status: "approved" }));
    toast.success("Chart approved");
  };

  if (loading) return <><Topbar title="Charting" /><div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></>;
  if (!chart) return <><Topbar title="Chart not found" /><div className="p-6"><Button asChild variant="ghost"><Link to="/app/charting">Back</Link></Button></div></>;

  const isSupervisor = roles.includes("supervisor") || roles.includes("admin");

  return (
    <>
      <Topbar
        title={`Periodontal Chart · ${patient?.full_name ?? "—"}`}
        subtitle={`${patient?.patient_code ?? ""} · ${format(new Date(chart.chart_date), "MMM d, yyyy")} · ${chart.status.replace("_", " ")}`}
        actions={
          <div className="flex items-center gap-2">
            {dirty && <Badge variant="outline" className="gap-1 border-warning/40 text-[hsl(var(--warning))]"><AlertTriangle className="h-3 w-3" /> Unsaved</Badge>}
            <Button size="sm" variant="outline" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </Button>
            {chart.status === "draft" && <Button size="sm" onClick={submitForReview} className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Submit</Button>}
            {chart.status === "pending_review" && isSupervisor && <Button size="sm" onClick={approve} className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</Button>}
          </div>
        }
      />

      <div className="flex-1 space-y-4 p-4 md:p-6">
        {/* Live indices summary */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Mean PD" value={`${summary.meanPD} mm`} hint="Probing depth" />
          <StatCard label="Mean CAL" value={`${summary.meanCAL} mm`} hint="Attachment loss" />
          <StatCard label="Sites ≥ 4 mm" value={`${summary.sitesGT4mm}`} hint={`of ${summary.totalSites} sites`} severity={summary.generalized ? "moderate" : "healthy"} />
          <StatCard label="O'Leary plaque" value={`${oleary.percentage}%`} hint={`${oleary.surfacesWithPlaque}/${oleary.totalSurfaces} surfaces`} severity={oleary.percentage > 25 ? "moderate" : "healthy"} />
          <StatCard label="BOP (Ainamo & Bay)" value={`${bop.percentage}%`} hint={bop.risk} severity={bop.percentage > 30 ? "severe" : bop.percentage >= 10 ? "moderate" : "healthy"} />
        </div>

        <Tabs defaultValue="buccal" className="space-y-3">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="buccal">Buccal view</TabsTrigger>
              <TabsTrigger value="lingual">Lingual / Palatal view</TabsTrigger>
            </TabsList>
            <Legend />
          </div>

          <TabsContent value="buccal">
            <ArchGrid teeth={teeth} onUpdate={updateSite} onToggleMissing={toggleMissing} sites={BUCCAL_SITES} />
          </TabsContent>
          <TabsContent value="lingual">
            <ArchGrid teeth={teeth} onUpdate={updateSite} onToggleMissing={toggleMissing} sites={LINGUAL_SITES} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function StatCard({ label, value, hint, severity = "none" }: { label: string; value: string; hint?: string; severity?: keyof typeof SEVERITY_BG }) {
  return (
    <Card className={cn("border p-4 transition-colors", SEVERITY_BG[severity])}>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] opacity-70">{hint}</p>}
    </Card>
  );
}

function Legend() {
  return (
    <div className="hidden md:flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      <LegendDot color="healthy" label="≤3 mm" />
      <LegendDot color="mild" label="4 mm" />
      <LegendDot color="moderate" label="5 mm" />
      <LegendDot color="severe" label="≥6 mm" />
    </div>
  );
}
function LegendDot({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1"><span className={cn("inline-block h-2 w-2 rounded-full", `bg-severity-${color}`)} />{label}</span>;
}

function ArchGrid({
  teeth, onUpdate, onToggleMissing, sites,
}: {
  teeth: Record<number, ToothData>;
  onUpdate: (n: number, k: keyof ToothData, v: any) => void;
  onToggleMissing: (n: number) => void;
  sites: Site[];
}) {
  return (
    <Card className="overflow-x-auto p-3">
      <div className="min-w-[1100px] space-y-2">
        <ArchRow label="UPPER" teeth={UPPER_TEETH} data={teeth} onUpdate={onUpdate} onToggleMissing={onToggleMissing} sites={sites} isUpper />
        <div className="my-2 h-px bg-border" />
        <ArchRow label="LOWER" teeth={LOWER_TEETH_ORDERED} data={teeth} onUpdate={onUpdate} onToggleMissing={onToggleMissing} sites={sites} isUpper={false} />
      </div>
    </Card>
  );
}

function ArchRow({
  label, teeth, data, onUpdate, onToggleMissing, sites, isUpper,
}: {
  label: string;
  teeth: number[];
  data: Record<number, ToothData>;
  onUpdate: (n: number, k: keyof ToothData, v: any) => void;
  onToggleMissing: (n: number) => void;
  sites: Site[];
  isUpper: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 px-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label} arch</span>
        <span className="text-[10px] text-muted-foreground/60">FDI · Universal</span>
      </div>
      <div className="grid grid-cols-16 gap-1" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
        {teeth.map(n => (
          <ToothCell key={n} tooth={data[n]} onUpdate={onUpdate} onToggleMissing={onToggleMissing} sites={sites} isUpper={isUpper} />
        ))}
      </div>
    </div>
  );
}

function ToothCell({
  tooth, onUpdate, onToggleMissing, sites, isUpper,
}: {
  tooth: ToothData;
  onUpdate: (n: number, k: keyof ToothData, v: any) => void;
  onToggleMissing: (n: number) => void;
  sites: Site[];
  isUpper: boolean;
}) {
  const n = tooth.tooth_number;
  const fdi = UNIVERSAL_TO_FDI[n];
  const isMolar = MULTI_ROOTED.has(n);

  // For row visual order: distal-mesial-distal (DB-B-MB) on right side, etc.
  // Simpler: render 3 sites left-to-right in the order provided.
  const sitesOrdered = sites;

  // Color severity = max PD across these 3 sites
  const maxPD = Math.max(0, ...sitesOrdered.map(s => (tooth[`pd_${s}` as keyof ToothData] as number) ?? 0));
  const sev = severityFromPD(maxPD || null);

  // Top row in upper arch shows tooth, bottom row shows the probing rail.
  // We always render: header → BOP/plaque/supp toggles → PD/GM inputs → CAL → mobility/furcation
  return (
    <div className={cn("rounded border bg-card p-1.5 transition-all", tooth.is_missing && "opacity-40", "hover:border-primary/40")}>
      {/* tooth number header */}
      <div className="flex items-center justify-between px-0.5">
        <button
          onClick={() => onToggleMissing(n)}
          title={tooth.is_missing ? "Mark present" : "Mark missing"}
          className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground hover:text-primary"
        >
          {fdi}
        </button>
        <span className="font-mono text-[9px] text-muted-foreground/60">#{n}</span>
      </div>

      {/* Tooth icon row */}
      <div className={cn("relative my-1 flex h-7 items-center justify-center rounded border", `${SEVERITY_BG[sev]}`)}>
        <ToothIcon isMolar={isMolar} />
        {tooth.is_missing && <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-bold">MISS</span>}
      </div>

      {!tooth.is_missing && (
        <>
          {/* Plaque / BOP / Supp toggles per site */}
          <SiteToggles tooth={tooth} sites={sitesOrdered} onUpdate={onUpdate} />

          {/* PD inputs */}
          <SiteInputs label="PD" tooth={tooth} sites={sitesOrdered} field="pd" onUpdate={onUpdate} max={15} />
          {/* GM inputs (signed) */}
          <SiteInputs label="GM" tooth={tooth} sites={sitesOrdered} field="gm" onUpdate={onUpdate} min={-10} max={15} />
          {/* CAL display */}
          <CalRow tooth={tooth} sites={sitesOrdered} />

          {/* Mobility & Furcation */}
          <div className="mt-1 flex items-center justify-between gap-1 px-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <select
                  value={tooth.mobility ?? 0}
                  onChange={e => onUpdate(n, "mobility", Number(e.target.value))}
                  className="h-5 w-full rounded border border-border bg-background px-0.5 text-[10px] tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                  aria-label="Mobility"
                >
                  <option value={0}>M0</option>
                  <option value={1}>M1</option>
                  <option value={2}>M2</option>
                  <option value={3}>M3</option>
                </select>
              </TooltipTrigger>
              <TooltipContent>Miller mobility class</TooltipContent>
            </Tooltip>

            {isMolar && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <select
                    value={(isUpper ? tooth.furcation_buccal : tooth.furcation_lingual) ?? 0}
                    onChange={e => onUpdate(n, isUpper ? "furcation_buccal" : "furcation_lingual", Number(e.target.value))}
                    className="h-5 w-full rounded border border-border bg-background px-0.5 text-[10px] tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                    aria-label="Furcation"
                  >
                    <option value={0}>F0</option>
                    <option value={1}>F1</option>
                    <option value={2}>F2</option>
                    <option value={3}>F3</option>
                  </select>
                </TooltipTrigger>
                <TooltipContent>Furcation grade (Glickman)</TooltipContent>
              </Tooltip>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SiteToggles({ tooth, sites, onUpdate }: { tooth: ToothData; sites: Site[]; onUpdate: (n: number, k: keyof ToothData, v: any) => void }) {
  return (
    <div className="mt-1 grid grid-cols-3 gap-0.5">
      {sites.map(s => {
        const bop = tooth[`bop_${s}` as keyof ToothData] as boolean;
        const pl = tooth[`plaque_${s}` as keyof ToothData] as boolean;
        const sp = tooth[`supp_${s}` as keyof ToothData] as boolean;
        return (
          <div key={s} className="flex items-center justify-center gap-0.5 rounded bg-muted/30 px-0.5 py-0.5">
            <button
              onClick={() => onUpdate(tooth.tooth_number, `plaque_${s}` as keyof ToothData, !pl)}
              title={`Plaque ${s.toUpperCase()}`}
              className={cn("h-3 w-3 rounded-sm border", pl ? "bg-[hsl(var(--info))] border-[hsl(var(--info))]" : "border-border bg-background")}
            />
            <button
              onClick={() => onUpdate(tooth.tooth_number, `bop_${s}` as keyof ToothData, !bop)}
              title={`BOP ${s.toUpperCase()}`}
              className={cn("h-3 w-3 rounded-sm border", bop ? "bg-[hsl(var(--severity-severe))] border-[hsl(var(--severity-severe))]" : "border-border bg-background")}
            />
            <button
              onClick={() => onUpdate(tooth.tooth_number, `supp_${s}` as keyof ToothData, !sp)}
              title={`Suppuration ${s.toUpperCase()}`}
              className={cn("h-3 w-3 rounded-sm border", sp ? "bg-[hsl(var(--warning))] border-[hsl(var(--warning))]" : "border-border bg-background")}
            />
          </div>
        );
      })}
    </div>
  );
}

function SiteInputs({
  label, tooth, sites, field, onUpdate, min, max,
}: {
  label: string; tooth: ToothData; sites: Site[]; field: "pd" | "gm";
  onUpdate: (n: number, k: keyof ToothData, v: any) => void;
  min?: number; max?: number;
}) {
  return (
    <div className="mt-1 flex items-center gap-0.5">
      <span className="w-5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="grid flex-1 grid-cols-3 gap-0.5">
        {sites.map(s => {
          const key = `${field}_${s}` as keyof ToothData;
          const v = tooth[key] as number | null | undefined;
          const sev = field === "pd" ? severityFromPD(v ?? null) : "none";
          return (
            <input
              key={s}
              type="number"
              inputMode="numeric"
              min={min ?? 0}
              max={max ?? 15}
              value={v ?? ""}
              onChange={e => {
                const raw = e.target.value;
                onUpdate(tooth.tooth_number, key, raw === "" ? null : Number(raw));
              }}
              placeholder="-"
              aria-label={`${label} ${s.toUpperCase()}`}
              className={cn(
                "h-5 w-full rounded border bg-background px-0.5 text-center text-[10px] tabular-nums focus:outline-none focus:ring-1 focus:ring-primary",
                field === "pd" && SEVERITY_BG[sev]
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

function CalRow({ tooth, sites }: { tooth: ToothData; sites: Site[] }) {
  return (
    <div className="mt-0.5 flex items-center gap-0.5">
      <span className="w-5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">CAL</span>
      <div className="grid flex-1 grid-cols-3 gap-0.5">
        {sites.map(s => {
          const pd = tooth[`pd_${s}` as keyof ToothData] as number | null | undefined;
          const gm = tooth[`gm_${s}` as keyof ToothData] as number | null | undefined;
          const cal = calcCAL(pd, gm);
          return (
            <span key={s} className="flex h-4 items-center justify-center rounded bg-muted/30 text-center text-[10px] font-semibold tabular-nums text-foreground/80">
              {cal == null ? "—" : cal}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ToothIcon({ isMolar }: { isMolar: boolean }) {
  if (isMolar) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 opacity-70" fill="currentColor">
        <path d="M5 4c-1.7 0-3 1.3-3 3 0 1.5.6 2.7 1.2 3.8.3.7.5 1.4.6 2.2l.5 6c.1.8.7 1.4 1.5 1.4.7 0 1.3-.5 1.5-1.2L8 16h8l.7 3.2c.2.7.8 1.2 1.5 1.2.8 0 1.4-.6 1.5-1.4l.5-6c.1-.8.3-1.5.6-2.2C21.4 9.7 22 8.5 22 7c0-1.7-1.3-3-3-3-1.3 0-2.4.6-3.2 1.5-.8-.9-1.9-1.5-3.2-1.5-1.4 0-2.6.7-3.4 1.7C8.5 4.7 7.4 4 6 4H5z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 opacity-70" fill="currentColor">
      <path d="M12 3c-3 0-5 2-5 5 0 1.5.5 2.8 1 4 .4 1 .6 2 .7 3.1l.4 5c.1.8.7 1.4 1.5 1.4.7 0 1.3-.5 1.4-1.2L12 18l.0 0L12 18l.0 0L12.0 18l.0 0L12 18l0 .2c.1.7.7 1.2 1.4 1.2.8 0 1.4-.6 1.5-1.4l.4-5c.1-1.1.3-2.1.7-3.1.5-1.2 1-2.5 1-4 0-3-2-5-5-5z"/>
    </svg>
  );
}
