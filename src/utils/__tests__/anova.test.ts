import { describe, expect, it } from 'vitest';
// Expected values from statsmodels OLS + anova_lm and SciPy studentized_range
// (scripts/anova-reference.py).
import ref from './anova-reference.json';
import { AnalysisError, analyse, compactLetters, type Observation } from '../anova';

const close = (a: number, e: number, tol = 1e-8) => expect(Math.abs(a - e)).toBeLessThan(tol * Math.max(1, Math.abs(e)));
const ss = (r: ReturnType<typeof analyse>, source: string) => r.table.find(t => t.source === source)!;
type Pair = [string, string, number];
const tukeyP = (pairs: { a: string; b: string; p: number }[], a: string, b: string) =>
  pairs.find(p => (p.a === a && p.b === b) || (p.a === b && p.b === a))!.p;

describe('ANOVA matches statsmodels', () => {
  it('CRD with unequal replication, Tukey–Kramer', () => {
    const r = analyse('CRD', ref.crd.obs as Observation[]);
    close(ss(r, 'Treatment').ss, ref.crd.ss[0]); close(ss(r, 'Residual').ss, ref.crd.ss[1]);
    expect(ss(r, 'Residual').df).toBe(ref.crd.df[1]);
    close(ss(r, 'Treatment').f!, ref.crd.f); close(ss(r, 'Treatment').p!, ref.crd.p, 1e-7);
    for (const [a, b, p] of ref.crd.tukey as Pair[]) close(tukeyP(r.comparisons[0].pairs, a, b), p, 1e-6);
  });

  it('RCBD', () => {
    const r = analyse('RCBD', ref.rcbd.obs as Observation[]);
    close(ss(r, 'Block').ss, ref.rcbd.ss[0]); close(ss(r, 'Treatment').ss, ref.rcbd.ss[1]); close(ss(r, 'Residual').ss, ref.rcbd.ss[2]);
    close(ss(r, 'Block').f!, ref.rcbd.f[0]); close(ss(r, 'Treatment').f!, ref.rcbd.f[1]);
    close(ss(r, 'Treatment').p!, ref.rcbd.p[1], 1e-7);
    for (const [a, b, p] of ref.rcbd.tukey as Pair[]) close(tukeyP(r.comparisons[0].pairs, a, b), p, 1e-6);
  });

  it('Latin square', () => {
    const r = analyse('Latin_Square', ref.latin.obs as Observation[]);
    ['Row', 'Column', 'Treatment', 'Residual'].forEach((s, i) => close(ss(r, s).ss, ref.latin.ss[i]));
    expect(ss(r, 'Residual').df).toBe(6);
    close(ss(r, 'Treatment').p!, ref.latin.p, 1e-7);
    for (const [a, b, p] of ref.latin.tukey as Pair[]) close(tukeyP(r.comparisons[0].pairs, a, b), p, 1e-6);
  });

  it('split-plot with separate main- and sub-plot error terms', () => {
    const r = analyse('Split_Plot', ref.split.obs as Observation[]);
    ['Block', 'Main plot (A)', 'Error (a)', 'Sub-plot (B)', 'A × B', 'Error (b)'].forEach((s, i) => close(ss(r, s).ss, ref.split.ss[i]));
    expect(ss(r, 'Error (a)').df).toBe(4); expect(ss(r, 'Error (b)').df).toBe(18);
    ['Main plot (A)', 'Sub-plot (B)', 'A × B'].forEach((s, i) => { close(ss(r, s).f!, ref.split.f[i]); close(ss(r, s).p!, ref.split.p[i], 1e-7); });
    expect(ss(r, 'Main plot (A)').errorTerm).toBe('Error (a)');
    for (const [a, b, p] of ref.split.tukeyA as Pair[]) close(tukeyP(r.comparisons[0].pairs, a, b), p, 1e-6);
    for (const [a, b, p] of ref.split.tukeyB as Pair[]) close(tukeyP(r.comparisons[1].pairs, a, b), p, 1e-6);
    expect(r.cv.map(c => c.label)).toEqual(['CV (a)', 'CV (b)']);
  });

  it('reports means, standard errors and residual checks', () => {
    const r = analyse('RCBD', ref.rcbd.obs as Observation[]);
    const mse = ss(r, 'Residual').ms!;
    for (const m of r.comparisons[0].means) { expect(m.n).toBe(4); close(m.se, Math.sqrt(mse / 4)); }
    expect(r.residuals.reduce((s, x) => s + x, 0)).toBeCloseTo(0, 9);
    expect(r.normality!.p).toBeGreaterThan(0);
    expect(r.equalVariance!.p).toBeGreaterThan(0);
  });
});

describe('input checks', () => {
  const rcbd = ref.rcbd.obs as Observation[];
  it('requires complete blocks, squares and split-plots', () => {
    expect(() => analyse('RCBD', rcbd.slice(1))).toThrow(AnalysisError);
    expect(() => analyse('Latin_Square', (ref.latin.obs as Observation[]).slice(2))).toThrow(/every plot/);
    expect(() => analyse('Split_Plot', (ref.split.obs as Observation[]).slice(1))).toThrow(/every plot/);
    expect(() => analyse('CRD', [{ block: 1, treatment: 'A', value: 1 }, { block: 1, treatment: 'B', value: 2 }])).toThrow(/more plots/);
  });
});

describe('compact letter display', () => {
  it('groups non-significant levels and splits significant ones', () => {
    // a > b > c > d by mean; only a–c, a–d and b–d differ
    const sig = new Set(['a|c', 'a|d', 'b|d']);
    const letters = compactLetters(['a', 'b', 'c', 'd'], (x, y) => sig.has(`${x}|${y}`) || sig.has(`${y}|${x}`));
    expect(Object.fromEntries(letters)).toEqual({ a: 'a', b: 'ab', c: 'bc', d: 'c' });
  });
  it('gives every level the same letter when nothing differs', () => {
    expect([...compactLetters(['x', 'y', 'z'], () => false).values()]).toEqual(['a', 'a', 'a']);
  });
});
