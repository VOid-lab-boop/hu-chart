import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  UPPER_TEETH, LOWER_TEETH_ORDERED, UNIVERSAL_TO_FDI, MULTI_ROOTED,
  SITES, BUCCAL_SITES, LINGUAL_SITES, type ToothData, type Site,
  calcCAL, severityFromPD, summarizeChart,
  olearyPercentage, bleedingIndex, autoSuggestTreatment,
} from "@/lib/dental";
import {
  Loader2, CheckCircle2, ChevronLeft, ChevronRight,
  Printer, Save, Cloud, CloudOff, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const emptyTooth = (n: number): ToothData => ({ tooth_number: n, is_missing: false });

const SEV_BG: Record<string, string> = {
  healthy:  "bg-[hsl(var(--severity-healthy))]/15 text-[hsl(var(--severity-healthy))] border-[hsl(var(--severity-healthy))]/40",
  mild:     "bg-[hsl(var(--severity-mild))]/20 text-[hsl(var(--severity-mild))] border-[hsl(var(--severity-mild))]/50",
  moderate: "bg-[hsl(var(--severity-moderate))]/20 text-[hsl(var(--severity-moderate))] border-[hsl(var(--severity-moderate))]/50",
  severe:   "bg-[hsl(var(--severity-severe))]/25 text-[hsl(var(--severity-severe))] border-[hsl(var(--severity-severe))]/60",
  none:     "bg-muted/30 text-muted-foreground border-border",
};

const SITE_LABEL: Record<Site, string> = {
  mb: "Mesio-Buccal", b: "Buccal (mid)", db: "Disto-Buccal",
  ml: "Mesio-Lingual", l: "Lingual (mid)", dl: "Disto-Lingual",
};

export default function Charting() {
  const { id } = useParams();
  const { user, roles } = useAuth();
  const [chart, setChart] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [teeth, setTeeth] = useState<Record<number, ToothData>>({});
  const [loading, setLoading] = useState(true);
  const [activeTooth, setActiveTooth] = useState<number>(8);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<number | null>(null);

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

  const scheduleSave = (next: Record<number, ToothData>) => {
    if (!id) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = window.setTimeout(async () => {
      const rows = Object.values(next).map(t => ({ ...t, chart_id: id }));
      const { error: delErr } = await supabase.from("tooth_measurements").delete().eq("chart_id", id);
      if (delErr) { setSaveState("error"); toast.error(delErr.message); return; }
      const { error: insErr } = await supabase.from("tooth_measurements").insert(rows);
      if (insErr) { setSaveState("error"); toast.error(insErr.message); return; }
      setSaveState("saved");
      window.setTimeout(() => setSaveState(s => (s === "saved" ? "idle" : s)), 1500);
    }, 700);
  };

  const updateField = (toothNum: number, key: keyof ToothData, value: any) => {
    setTeeth(prev => {
      const next = { ...prev, [toothNum]: { ...prev[toothNum], [key]: value } };
      scheduleSave(next);
      return next;
    });
  };

  const toggleMissing = (toothNum: number) => {
    setTeeth(prev => {
      const next = { ...prev, [toothNum]: { ...prev[toothNum], is_missing: !prev[toothNum].is_missing } };
      scheduleSave(next);
      return next;
    });
  };

  const submitForReview = async () => {
    if (!id) return;
    const { error } = await supabase.from("periodontal_charts").update({ status: "pending_review" }).eq("id", id);
    if (error) return toast.error(error.message);
    setChart((c: any) => ({ ...c, status: "pending_review" }));
    toast.success("Submitted for supervisor review");
  };

  const approve = async () => {
    if (!id) return;
    const { error } = await supabase.from("periodontal_charts").update({
      status: "approved", supervisor_id: user?.id, approved_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    setChart((c: any) => ({ ...c, status: "approved" }));
    toast.success("Chart approved");
  };

  const goPrev = () => setActiveTooth(t => (t === 1 ? 32 : t - 1));
  const goNext = () => setActiveTooth(t => (t === 32 ? 1 : t + 1));

  if (loading) return <><Topbar title="Charting" /><div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></>;
  if (!chart) return <><Topbar title="Chart not found" /><div className="p-6"><Button asChild variant="ghost"><Link to="/app/charting">Back</Link></Button></div></>;

  const isSupervisor = roles.includes("supervisor") || roles.includes("admin");
  const tooth = teeth[activeTooth];

  return (
    <>
      <Topbar
        title={`Periodontal Chart · ${patient?.full_name ?? "—"}`}
        subtitle={`${patient?.patient_code ?? ""} · ${format(new Date(chart.chart_date), "MMM d, yyyy")} · ${chart.status.replace("_", " ")}`}
        actions={
          <div className="flex items-center gap-2">
            <SaveBadge state={saveState} />
            <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5">
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            {chart.status === "draft" && (
              <Button size="sm" onClick={submitForReview} className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Submit
              </Button>
            )}
            {chart.status === "pending_review" && isSupervisor && (
              <Button size="sm" onClick={approve} className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 space-y-5 p-4 md:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Mean PD" value={`${summary.meanPD} mm`} hint="Average probing depth" />
          <StatCard label="Mean CAL" value={`${summary.meanCAL} mm`} hint="Clinical attachment loss" />
          <StatCard label="Sites ≥ 4 mm" value={`${summary.sitesGT4mm}`} hint={`of ${summary.totalSites} · ${summary.generalized ? "generalized" : "localized"}`} severity={summary.generalized ? "moderate" : "healthy"} />
          <StatCard label="O'Leary plaque" value={`${oleary.percentage}%`} hint={`${oleary.surfacesWithPlaque}/${oleary.totalSurfaces} surfaces`} severity={oleary.percentage > 25 ? "moderate" : "healthy"} />
          <StatCard label="Bleeding (BOP)" value={`${bop.percentage}%`} hint={bop.risk} severity={bop.percentage > 30 ? "severe" : bop.percentage >= 10 ? "moderate" : "healthy"} />
        </div>

        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-semibold">Click a tooth to chart it</h3>
              <p className="text-xs text-muted-foreground">FDI numbering · color = worst probing depth · click a tooth to open the detail panel below.</p>
            </div>
            <Legend />
          </div>
          <ArchMap teeth={UPPER_TEETH} data={teeth} active={activeTooth} setActive={setActiveTooth} label="Upper (Maxilla)" />
          <div className="my-3 h-px bg-border" />
          <ArchMap teeth={LOWER_TEETH_ORDERED} data={teeth} active={activeTooth} setActive={setActiveTooth} label="Lower (Mandible)" />
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button size="icon" variant="outline" onClick={goPrev} aria-label="Previous tooth"><ChevronLeft className="h-4 w-4" /></Button>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Editing tooth</p>
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  FDI {UNIVERSAL_TO_FDI[activeTooth]} <span className="text-sm font-normal text-muted-foreground">· Universal #{activeTooth}</span>
                </h2>
              </div>
              <Button size="icon" variant="outline" onClick={goNext} aria-label="Next tooth"><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Button size="sm" variant={tooth.is_missing ? "default" : "outline"} onClick={() => toggleMissing(activeTooth)}>
              {tooth.is_missing ? "Marked missing" : "Mark missing"}
            </Button>
          </div>

          {tooth.is_missing ? (
            <p className="rounded-md border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              This tooth is marked missing. Toggle above to chart measurements.
            </p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
              <div className="space-y-4">
                <SiteSection title="Buccal sites" subtitle="Probe from the cheek/lip side" sites={BUCCAL_SITES} tooth={tooth} onChange={updateField} />
                <SiteSection title="Lingual / Palatal sites" subtitle="Probe from the tongue/palate side" sites={LINGUAL_SITES} tooth={tooth} onChange={updateField} />
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Mobility (Miller)</p>
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {[0, 1, 2, 3].map(v => (
                      <button
                        key={v}
                        onClick={() => updateField(activeTooth, "mobility", v)}
                        className={cn(
                          "rounded-md border px-2 py-2 text-sm font-semibold transition-colors",
                          (tooth.mobility ?? 0) === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/50"
                        )}
                      >M{v}</button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    0 normal · 1 &lt;1 mm horiz · 2 ≥1 mm horiz · 3 vertical
                  </p>
                </div>

                {MULTI_ROOTED.has(activeTooth) && (
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Furcation (Glickman)</p>
                    <div className="mt-3 space-y-2">
                      <FurcationRow label="Buccal" value={tooth.furcation_buccal ?? 0} onChange={v => updateField(activeTooth, "furcation_buccal", v)} />
                      <FurcationRow label="Lingual" value={tooth.furcation_lingual ?? 0} onChange={v => updateField(activeTooth, "furcation_lingual", v)} />
                      <FurcationRow label="Mesial" value={tooth.furcation_mesial ?? 0} onChange={v => updateField(activeTooth, "furcation_mesial", v)} />
                      <FurcationRow label="Distal" value={tooth.furcation_distal ?? 0} onChange={v => updateField(activeTooth, "furcation_distal", v)} />
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <Label htmlFor="tooth-notes" className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Notes</Label>
                  <textarea
                    id="tooth-notes"
                    value={tooth.notes ?? ""}
                    onChange={e => updateField(activeTooth, "notes", e.target.value)}
                    rows={3}
                    className="mt-1.5 w-full rounded-md border border-border bg-background p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Restorations, anomalies, observations…"
                  />
                </div>

                <SuggestionsCard tooth={tooth} />
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function SaveBadge({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "saving") return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</Badge>;
  if (state === "saved") return <Badge variant="outline" className="gap-1 border-[hsl(var(--severity-healthy))]/40 text-[hsl(var(--severity-healthy))]"><Cloud className="h-3 w-3" /> Saved</Badge>;
  if (state === "error") return <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive"><CloudOff className="h-3 w-3" /> Save failed</Badge>;
  return <Badge variant="outline" className="gap-1"><Save className="h-3 w-3" /> Auto-save on</Badge>;
}

function StatCard({ label, value, hint, severity = "none" }: { label: string; value: string; hint?: string; severity?: keyof typeof SEV_BG }) {
  return (
    <Card className={cn("border p-4 transition-colors", SEV_BG[severity])}>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] opacity-70">{hint}</p>}
    </Card>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      <LegendDot sev="healthy" label="≤3 mm" />
      <LegendDot sev="mild" label="4 mm" />
      <LegendDot sev="moderate" label="5 mm" />
      <LegendDot sev="severe" label="≥6 mm" />
    </div>
  );
}
function LegendDot({ sev, label }: { sev: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={cn("inline-block h-2.5 w-2.5 rounded-full border", SEV_BG[sev])} />{label}</span>;
}

function ArchMap({
  teeth, data, active, setActive, label,
}: {
  teeth: number[];
  data: Record<number, ToothData>;
  active: number;
  setActive: (n: number) => void;
  label: string;
}) {
  return (
    <div>
      <p className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
        {teeth.map(n => {
          const t = data[n];
          const maxPD = Math.max(0, ...SITES.map(s => (t[`pd_${s}` as keyof ToothData] as number) ?? 0));
          const sev = severityFromPD(maxPD || null);
          const isActive = n === active;
          return (
            <button
              key={n}
              onClick={() => setActive(n)}
              className={cn(
                "group flex flex-col items-center justify-center rounded-md border p-1.5 transition-all",
                t.is_missing ? "opacity-40 bg-muted/30 border-border text-muted-foreground" : SEV_BG[sev],
                isActive && "ring-2 ring-primary ring-offset-1 ring-offset-background scale-105"
              )}
              aria-label={`Tooth FDI ${UNIVERSAL_TO_FDI[n]}`}
            >
              <span className="font-mono text-[10px] font-bold tracking-wider">{UNIVERSAL_TO_FDI[n]}</span>
              <ToothIcon isMolar={MULTI_ROOTED.has(n)} />
              <span className="font-mono text-[9px] opacity-60 tabular-nums">{maxPD || "—"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SiteSection({
  title, subtitle, sites, tooth, onChange,
}: {
  title: string; subtitle: string;
  sites: Site[]; tooth: ToothData;
  onChange: (n: number, k: keyof ToothData, v: any) => void;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h4 className="font-display text-sm font-semibold">{title}</h4>
        <span className="text-[11px] text-muted-foreground">{subtitle}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {sites.map(s => {
          const pd = tooth[`pd_${s}` as keyof ToothData] as number | null | undefined;
          const gm = tooth[`gm_${s}` as keyof ToothData] as number | null | undefined;
          const cal = calcCAL(pd, gm);
          const sev = severityFromPD(pd ?? null);
          const bopOn = !!tooth[`bop_${s}` as keyof ToothData];
          const plOn = !!tooth[`plaque_${s}` as keyof ToothData];
          const spOn = !!tooth[`supp_${s}` as keyof ToothData];

          return (
            <div key={s} className={cn("rounded-md border p-3", SEV_BG[sev])}>
              <p className="mb-2 text-center font-mono text-[10px] font-semibold uppercase tracking-wider">
                {s.toUpperCase()} <span className="opacity-70">· {SITE_LABEL[s]}</span>
              </p>

              <div className="space-y-2">
                <NumberField
                  label="PD (mm)"
                  hint="Probing depth"
                  value={pd ?? ""}
                  min={0} max={15}
                  onChange={v => onChange(tooth.tooth_number, `pd_${s}` as keyof ToothData, v)}
                />
                <NumberField
                  label="GM (mm)"
                  hint="+ recession · − overgrowth"
                  value={gm ?? ""}
                  min={-10} max={15}
                  onChange={v => onChange(tooth.tooth_number, `gm_${s}` as keyof ToothData, v)}
                />
                <div className="rounded bg-background/60 px-2 py-1.5 text-center">
                  <p className="font-mono text-[9px] uppercase tracking-wider opacity-70">CAL (auto)</p>
                  <p className="font-display text-base font-semibold tabular-nums">{cal == null ? "—" : `${cal} mm`}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1">
                <ToggleChip on={bopOn} onClick={() => onChange(tooth.tooth_number, `bop_${s}` as keyof ToothData, !bopOn)} label="BOP" tone="severe" />
                <ToggleChip on={plOn} onClick={() => onChange(tooth.tooth_number, `plaque_${s}` as keyof ToothData, !plOn)} label="Plaque" tone="info" />
                <ToggleChip on={spOn} onClick={() => onChange(tooth.tooth_number, `supp_${s}` as keyof ToothData, !spOn)} label="Pus" tone="warning" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NumberField({
  label, hint, value, onChange, min, max,
}: {
  label: string; hint?: string;
  value: number | string;
  onChange: (v: number | null) => void;
  min?: number; max?: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Label className="text-[11px] font-semibold">{label}</Label>
        {hint && <span className="text-[9px] opacity-60">{hint}</span>}
      </div>
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={e => {
          const raw = e.target.value;
          onChange(raw === "" ? null : Number(raw));
        }}
        className="mt-0.5 h-9 text-center text-base font-semibold tabular-nums"
        placeholder="—"
      />
    </div>
  );
}

function ToggleChip({ on, onClick, label, tone }: { on: boolean; onClick: () => void; label: string; tone: "severe" | "info" | "warning" }) {
  const toneClass =
    tone === "severe" ? "bg-[hsl(var(--severity-severe))] border-[hsl(var(--severity-severe))] text-white" :
    tone === "info"   ? "bg-[hsl(var(--info))] border-[hsl(var(--info))] text-white" :
                        "bg-[hsl(var(--warning))] border-[hsl(var(--warning))] text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded border px-1 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
        on ? toneClass : "border-border bg-background/60 text-muted-foreground hover:border-primary/40"
      )}
    >
      {label}
    </button>
  );
}

function FurcationRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium">{label}</span>
      <div className="grid grid-cols-4 gap-1">
        {[0, 1, 2, 3].map(v => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              "h-7 w-9 rounded border text-xs font-semibold transition-colors",
              value === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/50"
            )}
          >F{v}</button>
        ))}
      </div>
    </div>
  );
}

function SuggestionsCard({ tooth }: { tooth: ToothData }) {
  const items = autoSuggestTreatment(tooth);
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Suggested treatment</p>
      </div>
      <ul className="space-y-1 text-xs">
        {items.map(s => <li key={s} className="flex gap-1.5"><span className="text-primary">•</span> {s}</li>)}
      </ul>
    </div>
  );
}

function ToothIcon({ isMolar }: { isMolar: boolean }) {
  if (isMolar) {
    return (
      <svg viewBox="0 0 24 24" className="my-0.5 h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M5 4c-1.7 0-3 1.3-3 3 0 1.5.6 2.7 1.2 3.8.3.7.5 1.4.6 2.2l.5 6c.1.8.7 1.4 1.5 1.4.7 0 1.3-.5 1.5-1.2L8 16h8l.7 3.2c.2.7.8 1.2 1.5 1.2.8 0 1.4-.6 1.5-1.4l.5-6c.1-.8.3-1.5.6-2.2C21.4 9.7 22 8.5 22 7c0-1.7-1.3-3-3-3-1.3 0-2.4.6-3.2 1.5-.8-.9-1.9-1.5-3.2-1.5-1.4 0-2.6.7-3.4 1.7C8.5 4.7 7.4 4 6 4H5z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="my-0.5 h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M12 3c-3 0-5 2-5 5 0 1.5.5 2.8 1 4 .4 1 .6 2 .7 3.1l.4 5c.1.8.7 1.4 1.5 1.4.7 0 1.3-.5 1.4-1.2L12 18l0 .2c.1.7.7 1.2 1.4 1.2.8 0 1.4-.6 1.5-1.4l.4-5c.1-1.1.3-2.1.7-3.1.5-1.2 1-2.5 1-4 0-3-2-5-5-5z"/>
    </svg>
  );
}
