import { describe, expect, it } from 'vitest';
// Reference values generated with SciPy 1.17 (scipy.stats: norm, f, t, studentized_range,
// shapiro, levene(center='median')) by scripts/stats-reference.py.
import ref from './scipy-reference.json';
import { brownForsythe, fUpperTail, pnorm, ptukey, qnorm, qtukey, shapiroWilk, tTwoSided } from '../stats';

const close = (actual: number, expected: number, tol = 1e-6) => expect(Math.abs(actual - expected)).toBeLessThan(tol);

describe('distributions match SciPy', () => {
  it('normal CDF and quantile', () => {
    for (const [z, p] of ref.pnorm) close(pnorm(z), p, 1e-12);
    for (const [p, z] of ref.qnorm) close(qnorm(p), z, 1e-9);
  });
  it('F upper tail and two-sided t', () => {
    for (const [f, d1, d2, p] of ref.fUpper) close(fUpperTail(f, d1, d2), p, 1e-12);
    for (const [t, df, p] of ref.tTwo) close(tTwoSided(t, df), p, 1e-12);
  });
  it('studentized range CDF and 5 % critical values', () => {
    for (const [q, k, df, p] of ref.ptukey) close(ptukey(q, k, df), p, 1e-8);
    for (const [k, df, q] of ref.qtukey) close(qtukey(0.95, k, df), q, 1e-6);
  });
});

describe('assumption tests match SciPy', () => {
  it('Shapiro–Wilk W and p for n = 3 … 40, incl. Shapiro & Wilk (1965) weights example', () => {
    for (const [values, [w, p]] of Object.values(ref.shapiro) as [number[], [number, number]][]) {
      const r = shapiroWilk(values)!;
      close(r.statistic, w, 1e-8);
      close(r.p, p, 1e-7);
    }
    expect(shapiroWilk([1, 1, 1, 1])).toBeNull();
    expect(shapiroWilk([1, 2])).toBeNull();
  });
  it('Brown–Forsythe (median-centred Levene)', () => {
    const [groups, [f, p]] = ref.levene as [number[][], number[]];
    const r = brownForsythe(groups)!;
    close(r.statistic, f, 1e-10);
    close(r.p, p, 1e-10);
  });
});
