import { describe, expect, it } from 'vitest';
import { designProblem, generateLayout, seededRandom, shuffle, type Plot } from '../trialDesign';

const T = ['Control', 'GA3 250 ppm', 'Cold strat 30 d', 'Scarified'];
const count = <K extends keyof Plot>(plots: Plot[], key: K) =>
  plots.reduce((m, p) => m.set(p[key], (m.get(p[key]) ?? 0) + 1), new Map<Plot[K], number>());

describe('seeded randomisation', () => {
  it('is reproducible for a seed and differs between seeds', () => {
    const a = generateLayout({ designType: 'RCBD', treatments: T, replicates: 4, seed: 42 });
    const b = generateLayout({ designType: 'RCBD', treatments: T, replicates: 4, seed: 42 });
    const c = generateLayout({ designType: 'RCBD', treatments: T, replicates: 4, seed: 43 });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('shuffle is a permutation and roughly uniform', () => {
    const rand = seededRandom(1);
    const firstPositions = new Map<string, number>();
    for (let i = 0; i < 4000; i++) {
      const s = shuffle(['a', 'b', 'c', 'd'], rand);
      expect([...s].sort()).toEqual(['a', 'b', 'c', 'd']);
      firstPositions.set(s[0], (firstPositions.get(s[0]) ?? 0) + 1);
    }
    // each item should lead about 1000 times; allow ±10 %
    for (const n of firstPositions.values()) expect(Math.abs(n - 1000)).toBeLessThan(100);
  });
});

describe('CRD', () => {
  it('has t × r plots with each treatment exactly r times and no blocking', () => {
    const plots = generateLayout({ designType: 'CRD', treatments: T, replicates: 5, seed: 7 });
    expect(plots).toHaveLength(20);
    expect([...count(plots, 'treatment').values()]).toEqual([5, 5, 5, 5]);
    expect(new Set(plots.map(p => p.block))).toEqual(new Set([1]));
    expect(plots.map(p => p.plot)).toEqual([...Array(20).keys()].map(i => i + 1));
  });
});

describe('RCBD', () => {
  it('puts every treatment exactly once in every block', () => {
    const plots = generateLayout({ designType: 'RCBD', treatments: T, replicates: 6, seed: 3 });
    expect(plots).toHaveLength(24);
    for (let b = 1; b <= 6; b++) {
      expect(plots.filter(p => p.block === b).map(p => p.treatment).sort()).toEqual([...T].sort());
    }
  });

  it('randomises blocks independently (not the same order in every block)', () => {
    const plots = generateLayout({ designType: 'RCBD', treatments: T, replicates: 6, seed: 3 });
    const orders = new Set([1, 2, 3, 4, 5, 6].map(b => plots.filter(p => p.block === b).map(p => p.code).join()));
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe('Latin square', () => {
  it('has each treatment once per row and once per column', () => {
    for (const seed of [1, 2, 3, 99]) {
      const plots = generateLayout({ designType: 'Latin_Square', treatments: T, replicates: 0, seed });
      expect(plots).toHaveLength(16);
      for (let i = 1; i <= 4; i++) {
        expect(plots.filter(p => p.row === i).map(p => p.treatment).sort()).toEqual([...T].sort());
        expect(plots.filter(p => p.col === i).map(p => p.treatment).sort()).toEqual([...T].sort());
      }
    }
  });
});

describe('split-plot', () => {
  it('randomises main plots within blocks and every sub level within every main plot', () => {
    const main = ['Peat', 'Coir', 'Bark'];
    const sub = ['0 N', '50 N', '100 N', '150 N'];
    const plots = generateLayout({ designType: 'Split_Plot', treatments: main, subTreatments: sub, replicates: 3, seed: 11 });
    expect(plots).toHaveLength(3 * 3 * 4);
    for (let b = 1; b <= 3; b++) {
      const block = plots.filter(p => p.block === b);
      for (const m of main) {
        const mp = block.filter(p => p.treatment === m);
        expect(mp.map(p => p.subTreatment).sort()).toEqual([...sub].sort());
        // a main plot's sub-plots are contiguous positions
        const pos = mp.map(p => p.position).sort((x, y) => x - y);
        expect(pos[pos.length - 1] - pos[0]).toBe(sub.length - 1);
      }
    }
  });
});

describe('designProblem', () => {
  it('rejects designs that cannot be analysed', () => {
    expect(designProblem({ designType: 'RCBD', treatments: ['A'], replicates: 3 })).toMatch(/two treatments/);
    expect(designProblem({ designType: 'RCBD', treatments: ['A', 'a'], replicates: 3 })).toMatch(/different/);
    expect(designProblem({ designType: 'CRD', treatments: ['A', 'B'], replicates: 1 })).toMatch(/two replicates/);
    expect(designProblem({ designType: 'Latin_Square', treatments: ['A', 'B'], replicates: 0 })).toMatch(/three treatments/);
    expect(designProblem({ designType: 'Split_Plot', treatments: ['A', 'B'], replicates: 3, subTreatments: ['x'] })).toMatch(/sub-plot/);
    expect(designProblem({ designType: 'RCBD', treatments: ['A', 'B', 'C'], replicates: 4 })).toBeNull();
  });
});
