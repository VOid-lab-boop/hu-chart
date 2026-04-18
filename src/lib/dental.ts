// Clinical reference data and calculation helpers for the periodontal app.
// Formulas align with the HU "Periodontal Charting and Indices" handout (2025-2026).

export type ToothNum = number; // 1..32 universal numbering

export const UNIVERSAL_TO_FDI: Record<number, string> = {
  1: '18', 2: '17', 3: '16', 4: '15', 5: '14', 6: '13', 7: '12', 8: '11',
  9: '21', 10: '22', 11: '23', 12: '24', 13: '25', 14: '26', 15: '27', 16: '28',
  17: '38', 18: '37', 19: '36', 20: '35', 21: '34', 22: '33', 23: '32', 24: '31',
  25: '41', 26: '42', 27: '43', 28: '44', 29: '45', 30: '46', 31: '47', 32: '48',
};

export const UPPER_TEETH: ToothNum[] = Array.from({ length: 16 }, (_, i) => i + 1);   // 1..16  (UR → UL)
export const LOWER_TEETH: ToothNum[] = Array.from({ length: 16 }, (_, i) => i + 32 - i * 2); // placeholder, overridden below
// Lower row reads LL → LR visually like a real chart, but we keep universal 17..32 (LL3rd → LR3rd).
export const LOWER_TEETH_ORDERED: ToothNum[] = Array.from({ length: 16 }, (_, i) => i + 17);

export const MULTI_ROOTED = new Set([1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32]);

/** Six probing sites per tooth. Buccal trio (mb,b,db) + Lingual/Palatal trio (ml,l,dl). */
export const SITES = ['mb', 'b', 'db', 'ml', 'l', 'dl'] as const;
export type Site = typeof SITES[number];
export const BUCCAL_SITES: Site[] = ['mb', 'b', 'db'];
export const LINGUAL_SITES: Site[] = ['ml', 'l', 'dl'];

export interface ToothData {
  tooth_number: number;
  is_missing?: boolean;
  pd_mb?: number | null; pd_b?: number | null; pd_db?: number | null;
  pd_ml?: number | null; pd_l?: number | null; pd_dl?: number | null;
  /** Gingival margin (signed mm). Positive = recession (GM apical to CEJ).
      Negative = overgrowth (GM coronal to CEJ). 0 = at CEJ. */
  gm_mb?: number | null; gm_b?: number | null; gm_db?: number | null;
  gm_ml?: number | null; gm_l?: number | null; gm_dl?: number | null;
  bop_mb?: boolean; bop_b?: boolean; bop_db?: boolean;
  bop_ml?: boolean; bop_l?: boolean; bop_dl?: boolean;
  plaque_mb?: boolean; plaque_b?: boolean; plaque_db?: boolean;
  plaque_ml?: boolean; plaque_l?: boolean; plaque_dl?: boolean;
  supp_mb?: boolean; supp_b?: boolean; supp_db?: boolean;
  supp_ml?: boolean; supp_l?: boolean; supp_dl?: boolean;
  /** Miller mobility class 0..3 */
  mobility?: number;
  /** Furcation grade 0..3 (Glickman) */
  furcation_buccal?: number;
  furcation_lingual?: number;
  furcation_mesial?: number;
  furcation_distal?: number;
  notes?: string | null;
}

/**
 * Clinical Attachment Loss per the handout:
 *   GM above CEJ (overgrowth, gm < 0)  →  CAL = PD − |GM|
 *   GM at CEJ (gm == 0)               →  CAL = PD
 *   GM below CEJ (recession, gm > 0)  →  CAL = PD + GM
 * Net effect with signed GM: CAL = PD + GM (since negative GM subtracts).
 */
export function calcCAL(pd?: number | null, gm?: number | null): number | null {
  if (pd == null) return null;
  const g = gm ?? 0;
  const cal = pd + g;
  return cal < 0 ? 0 : cal;
}

export type Severity = 'healthy' | 'mild' | 'moderate' | 'severe' | 'none';

/** Per handout: Normal 1–3 mm, pathologic >4 mm. */
export function severityFromPD(pd?: number | null): Severity {
  if (pd == null) return 'none';
  if (pd <= 3) return 'healthy';
  if (pd === 4) return 'mild';
  if (pd === 5) return 'moderate';
  return 'severe';
}

export function severityColor(level: Severity): string {
  switch (level) {
    case 'healthy': return 'hsl(var(--severity-healthy))';
    case 'mild': return 'hsl(var(--severity-mild))';
    case 'moderate': return 'hsl(var(--severity-moderate))';
    case 'severe': return 'hsl(var(--severity-severe))';
    default: return 'hsl(var(--muted-foreground))';
  }
}

// Silness & Löe Plaque Index — average score per surface (0–3)
export function plaqueIndexFromScores(scores: number[]): { mean: number; interpretation: string } {
  if (scores.length === 0) return { mean: 0, interpretation: 'No data' };
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  let interpretation = 'Excellent hygiene';
  if (mean > 0 && mean < 1.0) interpretation = 'Good hygiene';
  else if (mean >= 1.0 && mean < 2.0) interpretation = 'Fair hygiene';
  else if (mean >= 2.0) interpretation = 'Poor hygiene';
  return { mean: +mean.toFixed(2), interpretation };
}

// O'Leary Plaque Score = (surfaces with plaque / total surfaces) × 100. Handout uses 4 surfaces/tooth.
export function olearyPercentage(teeth: ToothData[]): { percentage: number; surfacesWithPlaque: number; totalSurfaces: number } {
  let total = 0, withPlaque = 0;
  // Per O'Leary: 4 surfaces per tooth (M, D, B, L). We map: M = mb||ml, D = db||dl, B = b, L = l.
  for (const t of teeth) {
    if (t.is_missing) continue;
    const m = t.plaque_mb || t.plaque_ml;
    const d = t.plaque_db || t.plaque_dl;
    const b = t.plaque_b;
    const l = t.plaque_l;
    [m, d, b, l].forEach(present => { total++; if (present) withPlaque++; });
  }
  const pct = total === 0 ? 0 : +((withPlaque / total) * 100).toFixed(1);
  return { percentage: pct, surfacesWithPlaque: withPlaque, totalSurfaces: total };
}

// OHI-S — Six index teeth (Universal): 3 (16 buccal), 8 (11 labial), 14 (26 buccal),
// 19 (36 lingual), 24 (31 labial), 30 (46 lingual).
export const OHIS_TEETH = [3, 8, 14, 19, 24, 30];
export function ohisCalc(di: number[], ci: number[]): { di: number; ci: number; total: number; interpretation: string } {
  const avg = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const d = +avg(di).toFixed(2), c = +avg(ci).toFixed(2);
  const total = +(d + c).toFixed(2);
  let interpretation = 'Good';
  if (total >= 1.3 && total <= 3.0) interpretation = 'Fair';
  else if (total > 3.0) interpretation = 'Poor';
  return { di: d, ci: c, total, interpretation };
}

// Gingival Index Löe & Silness
export function gingivalIndex(scores: number[]): { mean: number; interpretation: string } {
  if (scores.length === 0) return { mean: 0, interpretation: 'No data' };
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  let interpretation = 'Healthy gingiva';
  if (mean > 0.1 && mean <= 1.0) interpretation = 'Mild gingivitis';
  else if (mean > 1.0 && mean <= 2.0) interpretation = 'Moderate gingivitis';
  else if (mean > 2.0) interpretation = 'Severe gingivitis';
  return { mean: +mean.toFixed(2), interpretation };
}

// Bleeding Index (Ainamo & Bay) = (sites with BOP / total sites) × 100
export function bleedingIndex(teeth: ToothData[]): { percentage: number; risk: string; bleedingSites: number; totalSites: number } {
  let total = 0, bleeding = 0;
  for (const t of teeth) {
    if (t.is_missing) continue;
    for (const s of SITES) {
      total++;
      if (t[`bop_${s}` as keyof ToothData]) bleeding++;
    }
  }
  const pct = total === 0 ? 0 : +((bleeding / total) * 100).toFixed(1);
  let risk = 'Low risk · Stable periodontal health';
  if (pct >= 10 && pct <= 30) risk = 'Moderate risk · Gingival inflammation';
  else if (pct > 30) risk = 'High risk · Likely progressive attachment loss';
  return { percentage: pct, risk, bleedingSites: bleeding, totalSites: total };
}

/** Whole-chart aggregate stats for the right-hand summary panel. */
export interface ChartSummary {
  meanPD: number;
  meanCAL: number;
  sitesGT4mm: number;
  sitesGT6mm: number;
  totalSites: number;
  presentTeeth: number;
  generalized: boolean; // >30 % sites with PD ≥ 4
}

export function summarizeChart(teeth: ToothData[]): ChartSummary {
  let pdSum = 0, pdCount = 0;
  let calSum = 0, calCount = 0;
  let gt4 = 0, gt6 = 0, total = 0;
  let present = 0;

  for (const t of teeth) {
    if (t.is_missing) continue;
    present++;
    for (const s of SITES) {
      const pd = t[`pd_${s}` as keyof ToothData] as number | null | undefined;
      const gm = t[`gm_${s}` as keyof ToothData] as number | null | undefined;
      total++;
      if (typeof pd === 'number') {
        pdSum += pd; pdCount++;
        if (pd >= 4) gt4++;
        if (pd >= 6) gt6++;
        const cal = calcCAL(pd, gm);
        if (cal != null) { calSum += cal; calCount++; }
      }
    }
  }

  const meanPD = pdCount ? +(pdSum / pdCount).toFixed(2) : 0;
  const meanCAL = calCount ? +(calSum / calCount).toFixed(2) : 0;
  const generalized = total > 0 && (gt4 / total) > 0.3;
  return { meanPD, meanCAL, sitesGT4mm: gt4, sitesGT6mm: gt6, totalSites: total, presentTeeth: present, generalized };
}

export function autoSuggestTreatment(t: ToothData): string[] {
  if (t.is_missing) return [];
  const suggestions = new Set<string>();
  const pds = SITES.map(s => t[`pd_${s}` as keyof ToothData] as number | null | undefined).filter((v): v is number => typeof v === 'number');
  const maxPD = Math.max(0, ...pds);
  const anyBOP = SITES.some(s => t[`bop_${s}` as keyof ToothData]);
  const anyPlaque = SITES.some(s => t[`plaque_${s}` as keyof ToothData]);
  const anySupp = SITES.some(s => t[`supp_${s}` as keyof ToothData]);

  if (anyPlaque) suggestions.add('Oral hygiene instructions');
  if (anyPlaque || anyBOP) suggestions.add('Scaling & polishing');
  if (maxPD >= 4 && maxPD <= 5) suggestions.add('Root planing (SRP)');
  if (maxPD >= 6) suggestions.add('Periodontal flap surgery referral');
  if (anySupp) suggestions.add('Antimicrobial therapy');
  if ((t.mobility ?? 0) >= 2) suggestions.add('Splinting / mobility assessment');
  const maxFurc = Math.max(t.furcation_buccal ?? 0, t.furcation_lingual ?? 0, t.furcation_mesial ?? 0, t.furcation_distal ?? 0);
  if (maxFurc >= 2) suggestions.add('Furcation management');
  return [...suggestions];
}
