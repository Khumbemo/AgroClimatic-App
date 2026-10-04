/*
  Analysis of variance for the four trial designs, with Tukey comparisons and assumption checks.

  Models (fixed effects, one observation per plot):
  - CRD:          y = μ + τᵢ + ε                       (unequal replication allowed; Tukey–Kramer)
  - RCBD:         y = μ + βⱼ + τᵢ + ε                   (complete blocks required)
  - Latin square: y = μ + ρⱼ + γₖ + τᵢ + ε             (complete square required)
  - Split-plot:   y = μ + βₖ + αᵢ + (βα)ₖᵢ + γⱼ + (αγ)ᵢⱼ + ε
                  main plots tested against error (a) = block × A, sub-plots against error (b)

  Verified against statsmodels OLS/anova_lm in __tests__/anova.test.ts.
*/
import { brownForsythe, fUpperTail, shapiroWilk, tukeyPValue, type TestResult } from './stats';
import type { DesignType } from './trialDesign';

export type Observation = {
  block: number;
  row?: number;
  col?: number;
  treatment: string;
  subTreatment?: string;
  value: number;
};

export type AnovaRow = { source: string; df: number; ss: number; ms?: number; f?: number; p?: number; errorTerm?: string };

export type MeanRow = { level: string; mean: number; n: number; se: number; letters: string };

export type FactorComparison = {
  factor: string;
  means: MeanRow[];
  /** Pairwise Tukey results; p < 0.05 is significant. */
  pairs: { a: string; b: string; diff: number; p: number }[];
  errorDf: number;
  mse: number;
  /** ANOVA p-value of the factor; letters are only meaningful when this is < 0.05. */
  anovaP: number;
};

export type AnovaResult = {
  design: DesignType;
  n: number;
  grandMean: number;
  table: AnovaRow[];
  comparisons: FactorComparison[];
  /** Coefficient(s) of variation, %. Split-plot reports CV(a) and CV(b). */
  cv: { label: string; value: number }[];
  residuals: number[];
  normality: TestResult | null;
  equalVariance: TestResult | null;
};

export class AnalysisError extends Error {}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const sum = (v: readonly number[]) => v.reduce((s, x) => s + x, 0);
const mean = (v: readonly number[]) => sum(v) / v.length;

function groupBy<T>(rows: readonly T[], key: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const g = m.get(k);
    if (g) g.push(r); else m.set(k, [r]);
  }
  return m;
}

const meanBy = <T,>(rows: readonly T[], key: (r: T) => string, val: (r: T) => number) =>
  new Map([...groupBy(rows, key)].map(([k, g]) => [k, mean(g.map(val))]));

const row = (source: string, df: number, ss: number, errMs?: number, errDf?: number, errorTerm?: string): AnovaRow => {
  const ms = df > 0 ? ss / df : undefined;
  if (errMs === undefined || errDf === undefined || ms === undefined || errMs <= 0) return { source, df, ss, ms };
  const f = ms / errMs;
  return { source, df, ss, ms, f, p: fUpperTail(f, df, errDf), errorTerm };
};

/**
 * Compact letter display by the insert-and-absorb algorithm (Piepho 2004): levels that share
 * a letter are not significantly different at α. Letters are assigned from the highest mean.
 */
export function compactLetters(levels: readonly string[], significant: (a: string, b: string) => boolean): Map<string, string> {
  let cols: Set<string>[] = [new Set(levels)];
  for (let i = 0; i < levels.length; i++) {
    for (let j = i + 1; j < levels.length; j++) {
      const a = levels[i], b = levels[j];
      if (!significant(a, b)) continue;
      const next: Set<string>[] = [];
      for (const c of cols) {
        if (c.has(a) && c.has(b)) {
          const ca = new Set(c); ca.delete(b);
          const cb = new Set(c); cb.delete(a);
          next.push(ca, cb);
        } else next.push(c);
      }
      // absorb: drop columns contained in another
      cols = next.filter((c, idx) => !next.some((d, jdx) => jdx !== idx && c.size <= d.size && [...c].every(x => d.has(x)) && (c.size < d.size || jdx < idx)));
    }
  }
  // order columns by the first (highest-mean) level they contain
  const rank = new Map(levels.map((l, i) => [l, i]));
  cols.sort((x, y) => Math.min(...[...x].map(l => rank.get(l)!)) - Math.min(...[...y].map(l => rank.get(l)!)));
  const letters = new Map(levels.map(l => [l, '']));
  cols.forEach((c, i) => {
    const letter = i < 26 ? String.fromCharCode(97 + i) : `${String.fromCharCode(97 + (i % 26))}${Math.floor(i / 26)}`;
    for (const l of c) letters.set(l, letters.get(l)! + letter);
  });
  return letters;
}

/** Tukey HSD (Tukey–Kramer for unequal n) for one factor. */
function tukey(factor: string, groups: Map<string, number[]>, mse: number, errorDf: number, anovaP: number, nPerMean?: number): FactorComparison {
  const levels = [...groups.keys()];
  const stats = levels.map(l => {
    const g = groups.get(l)!;
    const n = nPerMean ?? g.length;
    return { level: l, mean: mean(g), n };
  }).sort((a, b) => b.mean - a.mean);
  const k = stats.length;
  const pairs: FactorComparison['pairs'] = [];
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const a = stats[i], b = stats[j];
      const se = Math.sqrt((mse / 2) * (1 / a.n + 1 / b.n));
      const diff = a.mean - b.mean;
      pairs.push({ a: a.level, b: b.level, diff, p: se > 0 ? tukeyPValue(Math.abs(diff) / se, k, errorDf) : 1 });
    }
  }
  const sig = new Map(pairs.map(p => [`${p.a}\u0000${p.b}`, p.p < 0.05]));
  const letters = compactLetters(stats.map(s => s.level), (a, b) => sig.get(`${a}\u0000${b}`) ?? sig.get(`${b}\u0000${a}`) ?? false);
  return {
    factor, errorDf, mse, anovaP, pairs,
    means: stats.map(s => ({ ...s, se: Math.sqrt(mse / s.n), letters: letters.get(s.level)! })),
  };
}

function requireComplete<T>(rows: readonly T[], expected: number, what: string) {
  if (rows.length !== expected) throw new AnalysisError(`This design needs a value for every plot (${what}); ${rows.length} of ${expected} are filled in.`);
}

// ---------------------------------------------------------------------------
// designs
// ---------------------------------------------------------------------------

function crd(obs: Observation[]): Omit<AnovaResult, 'design' | 'normality' | 'equalVariance'> & { groups: number[][] } {
  const byT = groupBy(obs, o => o.treatment);
  if (byT.size < 2) throw new AnalysisError('At least two treatments need values.');
  const n = obs.length, t = byT.size;
  if (n - t < 1) throw new AnalysisError('At least one treatment needs two or more values to estimate error.');
  const gm = mean(obs.map(o => o.value));
  const tMeans = new Map([...byT].map(([k, g]) => [k, mean(g.map(o => o.value))]));
  const ssT = sum([...byT].map(([k, g]) => g.length * (tMeans.get(k)! - gm) ** 2));
  const residuals = obs.map(o => o.value - tMeans.get(o.treatment)!);
  const ssE = sum(residuals.map(r => r * r));
  const dfE = n - t, mse = ssE / dfE;
  const trtRow = row('Treatment', t - 1, ssT, mse, dfE, 'Residual');
  return {
    n, grandMean: gm, residuals,
    table: [trtRow, { source: 'Residual', df: dfE, ss: ssE, ms: mse }, { source: 'Total', df: n - 1, ss: ssT + ssE }],
    comparisons: [tukey('Treatment', new Map([...byT].map(([k, g]) => [k, g.map(o => o.value)])), mse, dfE, trtRow.p ?? 1)],
    cv: [{ label: 'CV', value: (Math.sqrt(mse) / gm) * 100 }],
    groups: [...byT.values()].map(g => g.map(o => o.value)),
  };
}

function rcbd(obs: Observation[]) {
  const byT = groupBy(obs, o => o.treatment), byB = groupBy(obs, o => String(o.block));
  const t = byT.size, r = byB.size;
  if (t < 2 || r < 2) throw new AnalysisError('An RCBD analysis needs at least two treatments and two blocks with values.');
  requireComplete(obs, t * r, 'every treatment in every block');
  for (const g of byB.values()) if (new Set(g.map(o => o.treatment)).size !== t) throw new AnalysisError('Each block must contain each treatment exactly once.');
  const gm = mean(obs.map(o => o.value));
  const tM = meanBy(obs, o => o.treatment, o => o.value), bM = meanBy(obs, o => String(o.block), o => o.value);
  const ssB = t * sum([...bM.values()].map(m => (m - gm) ** 2));
  const ssT = r * sum([...tM.values()].map(m => (m - gm) ** 2));
  const ssTot = sum(obs.map(o => (o.value - gm) ** 2));
  const ssE = Math.max(0, ssTot - ssB - ssT), dfE = (r - 1) * (t - 1), mse = ssE / dfE;
  const residuals = obs.map(o => o.value - tM.get(o.treatment)! - bM.get(String(o.block))! + gm);
  const trtRow = row('Treatment', t - 1, ssT, mse, dfE, 'Residual');
  return {
    n: obs.length, grandMean: gm, residuals,
    table: [row('Block', r - 1, ssB, mse, dfE, 'Residual'), trtRow, { source: 'Residual', df: dfE, ss: ssE, ms: mse }, { source: 'Total', df: obs.length - 1, ss: ssTot }],
    comparisons: [tukey('Treatment', new Map([...byT].map(([k, g]) => [k, g.map(o => o.value)])), mse, dfE, trtRow.p ?? 1)],
    cv: [{ label: 'CV', value: (Math.sqrt(mse) / gm) * 100 }],
    groups: [...byT.values()].map(g => g.map(o => o.value)),
  };
}

function latin(obs: Observation[]) {
  const byT = groupBy(obs, o => o.treatment);
  const t = byT.size;
  if (t < 3) throw new AnalysisError('A Latin square analysis needs at least three treatments.');
  requireComplete(obs, t * t, `${t} × ${t} square`);
  const gm = mean(obs.map(o => o.value));
  const rM = meanBy(obs, o => String(o.row), o => o.value), cM = meanBy(obs, o => String(o.col), o => o.value), tM = meanBy(obs, o => o.treatment, o => o.value);
  if (rM.size !== t || cM.size !== t) throw new AnalysisError('Rows and columns must each contain every treatment once.');
  const ssR = t * sum([...rM.values()].map(m => (m - gm) ** 2));
  const ssC = t * sum([...cM.values()].map(m => (m - gm) ** 2));
  const ssT = t * sum([...tM.values()].map(m => (m - gm) ** 2));
  const ssTot = sum(obs.map(o => (o.value - gm) ** 2));
  const ssE = Math.max(0, ssTot - ssR - ssC - ssT), dfE = (t - 1) * (t - 2), mse = ssE / dfE;
  const residuals = obs.map(o => o.value - rM.get(String(o.row))! - cM.get(String(o.col))! - tM.get(o.treatment)! + 2 * gm);
  const trtRow = row('Treatment', t - 1, ssT, mse, dfE, 'Residual');
  return {
    n: obs.length, grandMean: gm, residuals,
    table: [row('Row', t - 1, ssR, mse, dfE, 'Residual'), row('Column', t - 1, ssC, mse, dfE, 'Residual'), trtRow, { source: 'Residual', df: dfE, ss: ssE, ms: mse }, { source: 'Total', df: obs.length - 1, ss: ssTot }],
    comparisons: [tukey('Treatment', new Map([...byT].map(([k, g]) => [k, g.map(o => o.value)])), mse, dfE, trtRow.p ?? 1)],
    cv: [{ label: 'CV', value: (Math.sqrt(mse) / gm) * 100 }],
    groups: [...byT.values()].map(g => g.map(o => o.value)),
  };
}

function splitPlotAnova(obs: Observation[]) {
  if (obs.some(o => !o.subTreatment)) throw new AnalysisError('Split-plot observations need a sub-plot level.');
  const A = groupBy(obs, o => o.treatment), B = groupBy(obs, o => o.subTreatment!), R = groupBy(obs, o => String(o.block));
  const a = A.size, b = B.size, r = R.size;
  if (a < 2 || b < 2 || r < 2) throw new AnalysisError('A split-plot analysis needs at least two main-plot levels, two sub-plot levels and two blocks.');
  requireComplete(obs, a * b * r, 'every sub-plot level in every main plot of every block');
  const gm = mean(obs.map(o => o.value));
  const key = (...p: (string | number)[]) => p.join('\u0000');
  const mR = meanBy(obs, o => String(o.block), o => o.value);
  const mA = meanBy(obs, o => o.treatment, o => o.value);
  const mB = meanBy(obs, o => o.subTreatment!, o => o.value);
  const mRA = meanBy(obs, o => key(o.block, o.treatment), o => o.value);
  const mAB = meanBy(obs, o => key(o.treatment, o.subTreatment!), o => o.value);
  if (mRA.size !== a * r || mAB.size !== a * b) throw new AnalysisError('Each block must contain every main-plot level, each with every sub-plot level.');
  const ssR = a * b * sum([...mR.values()].map(m => (m - gm) ** 2));
  const ssA = r * b * sum([...mA.values()].map(m => (m - gm) ** 2));
  const ssRA = b * sum([...mRA.values()].map(m => (m - gm) ** 2)) - ssR - ssA; // error (a)
  const ssB = r * a * sum([...mB.values()].map(m => (m - gm) ** 2));
  const ssAB = r * sum([...mAB.values()].map(m => (m - gm) ** 2)) - ssA - ssB;
  const ssTot = sum(obs.map(o => (o.value - gm) ** 2));
  const ssEb = Math.max(0, ssTot - ssR - ssA - ssRA - ssB - ssAB);
  const dfR = r - 1, dfA = a - 1, dfEa = (r - 1) * (a - 1), dfB = b - 1, dfAB = (a - 1) * (b - 1), dfEb = a * (r - 1) * (b - 1);
  const msEa = ssRA / dfEa, msEb = ssEb / dfEb;
  const residuals = obs.map(o => o.value - mRA.get(key(o.block, o.treatment))! - mAB.get(key(o.treatment, o.subTreatment!))! + mA.get(o.treatment)!);
  const aRow = row('Main plot (A)', dfA, ssA, msEa, dfEa, 'Error (a)');
  const bRow = row('Sub-plot (B)', dfB, ssB, msEb, dfEb, 'Error (b)');
  const abRow = row('A × B', dfAB, ssAB, msEb, dfEb, 'Error (b)');
  return {
    n: obs.length, grandMean: gm, residuals,
    table: [
      row('Block', dfR, ssR, msEa, dfEa, 'Error (a)'), aRow, { source: 'Error (a)', df: dfEa, ss: ssRA, ms: msEa },
      bRow, abRow, { source: 'Error (b)', df: dfEb, ss: ssEb, ms: msEb }, { source: 'Total', df: obs.length - 1, ss: ssTot },
    ],
    comparisons: [
      tukey('Main plot (A)', new Map([...A].map(([k, g]) => [k, g.map(o => o.value)])), msEa, dfEa, aRow.p ?? 1, r * b),
      tukey('Sub-plot (B)', new Map([...B].map(([k, g]) => [k, g.map(o => o.value)])), msEb, dfEb, bRow.p ?? 1, r * a),
    ],
    cv: [{ label: 'CV (a)', value: (Math.sqrt(msEa) / gm) * 100 }, { label: 'CV (b)', value: (Math.sqrt(msEb) / gm) * 100 }],
    groups: [...mAB.keys()].map(k => obs.filter(o => key(o.treatment, o.subTreatment!) === k).map(o => o.value)),
  };
}

/** Run the analysis appropriate to the design. Throws AnalysisError with a readable message. */
export function analyse(design: DesignType, observations: readonly Observation[]): AnovaResult {
  const obs = observations.filter(o => Number.isFinite(o.value));
  if (obs.length < 3) throw new AnalysisError('Enter values for more plots before analysing.');
  const core = design === 'CRD' ? crd(obs) : design === 'RCBD' ? rcbd(obs) : design === 'Latin_Square' ? latin(obs) : splitPlotAnova(obs);
  const { groups, ...rest } = core;
  return {
    design, ...rest,
    normality: shapiroWilk(rest.residuals.map(r => +r.toPrecision(12))),
    equalVariance: groups.every(g => g.length >= 2) ? brownForsythe(groups) : null,
  };
}
