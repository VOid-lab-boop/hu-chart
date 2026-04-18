// Clinical reference data and calculation helpers for the periodontal app.

export type ToothNum = number; // 1..32 universal numbering

export const UNIVERSAL_TO_FDI: Record<number, string> = {
  1: '18', 2: '17', 3: '16', 4: '15', 5: '14', 6: '13', 7: '12', 8: '11',
  9: '21', 10: '22', 11: '23', 12: '24', 13: '25', 14: '26', 15: '27', 16: '28',
  17: '38', 18: '37', 19: '36', 20: '35', 21: '34', 22: '33', 23: '32', 24: '31',
  25: '41', 26: '42', 27: '43', 28: '44', 29: '45', 30: '46', 31: '47', 32: '48',
};

export const UPPER_TEETH: ToothNum[] = Array.from({ length: 16 }, (_, i) => i + 1);
export const LOWER_TEETH: ToothNum[] = Array.from({ length: 16 }, (_, i) => i + 17);

export const MULTI_ROOTED = new Set([1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32]);

export const SITES = ['mb', 'b', 'db', 'ml', 'l', 'dl'] as const;
export type Site = typeof SITES[number];

export interface ToothData {
  tooth_number: number;
  is_missing?: boolean;
  pd_mb?: number | null; pd_b?: number | null; pd_db?: number | null;
  pd_ml?: number | null; pd_l?: number | null; pd_dl?: number | null;
  gm_mb?: number | null; gm_b?: number | null; gm_db?: number | null;
  gm_ml?: number | null; gm_l?: number | null; gm_dl?: number | null;
  bop_mb?: boolean; bop_b?: boolean; bop_db?: boolean;
  bop_ml?: boolean; bop_l?: boolean; bop_dl?: boolean;
  plaque_mb?: boolean; plaque_b?: boolean; plaque_db?: boolean;
  plaque_ml?: boolean; plaque_l?: boolean; plaque_dl?: boolean;
  supp_mb?: boolean; supp_b?: boolean; supp_db?: boolean;
  supp_ml?: boolean; supp_l?: boolean; supp_dl?: boolean;
  mobility?: number;
  furcation_buccal?: number;
  furcation_lingual?: number;
  furcation_mesial?: number;
  furcation_distal?: number;
  notes?: string | null;
}

/**
 * CAL = PD + GM (with sign convention: GM positive = recession below CEJ).
 * If GM is negative (margin above CEJ), CAL = PD - |GM|.
 * If GM is 0 (at CEJ), CAL = PD.
 */
export function calcCAL(pd?: number | null, gm?: number | null): number | null {
  if (pd == null) return null;
  const g = gm ?? 0;
  return pd + g;
}

export function severityFromPD(pd?: number | null): 'healthy' | 'mild' | 'moderate' | 'severe' | 'none' {
  if (pd == null) return 'none';
  if (pd <= 3) return 'healthy';
  if (pd <= 4) return 'mild';
  if (pd <= 5) return 'moderate';
  return 'severe';
}

export function severityColor(level: ReturnType<typeof severityFromPD>): string {
  switch (level) {
    case 'healthy': return 'hsl(var(--severity-healthy))';
    case 'mild': return 'hsl(var(--severity-mild))';
    case 'moderate': return 'hsl(var(--severity-moderate))';
    case 'severe': return 'hsl(var(--severity-severe))';
    default: return 'hsl(var(--muted-foreground))';
  }
}

// Silness & Löe Plaque Index — average score per surface (0-3)
export function plaqueIndexFromScores(scores: number[]): { mean: number; interpretation: string } {
  if (scores.length === 0) return { mean: 0, interpretation: 'No data' };
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  let interpretation = 'Excellent';
  if (mean >= 0.1 && mean < 1.0) interpretation = 'Good';
  else if (mean >= 1.0 && mean < 2.0) interpretation = 'Fair';
  else if (mean >= 2.0) interpretation = 'Poor';
  return { mean: +mean.toFixed(2), interpretation };
}

// O'Leary Plaque Score = (surfaces with plaque / total surfaces) × 100
export function olearyPercentage(teeth: ToothData[]): number {
  let total = 0, withPlaque = 0;
  for (const t of teeth) {
    if (t.is_missing) continue;
    for (const s of SITES) {
      total++;
      if (t[`plaque_${s}` as keyof ToothData]) withPlaque++;
    }
  }
  return total === 0 ? 0 : +((withPlaque / total) * 100).toFixed(1);
}

// OHI-S — Six index teeth (universal): 3 (16B), 8 (11Lab), 14 (26B), 19 (36L), 24 (31Lab), 30 (46L)
export const OHIS_TEETH = [3, 8, 14, 19, 24, 30];
export function ohisCalc(di: number[], ci: number[]): { di: number; ci: number; total: number } {
  const avg = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const d = +avg(di).toFixed(2), c = +avg(ci).toFixed(2);
  return { di: d, ci: c, total: +(d + c).toFixed(2) };
}

// Gingival Index Löe & Silness
export function gingivalIndex(scores: number[]): { mean: number; interpretation: string } {
  if (scores.length === 0) return { mean: 0, interpretation: 'No data' };
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  let interpretation = 'Healthy';
  if (mean >= 0.1 && mean <= 1.0) interpretation = 'Mild inflammation';
  else if (mean > 1.0 && mean <= 2.0) interpretation = 'Moderate inflammation';
  else if (mean > 2.0) interpretation = 'Severe inflammation';
  return { mean: +mean.toFixed(2), interpretation };
}

// Bleeding Index (Ainamo & Bay) = (sites with BOP / total sites) × 100
export function bleedingIndex(teeth: ToothData[]): { percentage: number; risk: string } {
  let total = 0, bleeding = 0;
  for (const t of teeth) {
    if (t.is_missing) continue;
    for (const s of SITES) {
      total++;
      if (t[`bop_${s}` as keyof ToothData]) bleeding++;
    }
  }
  const pct = total === 0 ? 0 : +((bleeding / total) * 100).toFixed(1);
  let risk = 'Low risk';
  if (pct >= 10 && pct <= 30) risk = 'Moderate risk';
  else if (pct > 30) risk = 'High risk';
  return { percentage: pct, risk };
}

export function autoSuggestTreatment(t: ToothData): string[] {
  if (t.is_missing) return [];
  const suggestions = new Set<string>();
  const pds = SITES.map(s => t[`pd_${s}` as keyof ToothData] as number | null | undefined).filter(Boolean) as number[];
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
