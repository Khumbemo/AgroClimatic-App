/*
  Randomised field layouts for nursery trials. A seeded generator makes every layout
  reproducible: the same seed and inputs always give the same plan.

  - CRD: every treatment × replicate is randomised over all plots.
  - RCBD: each block holds every treatment once, randomised independently per block.
  - Latin square: t × t grid where each row and each column holds every treatment once
    (cyclic square with rows, columns and treatment labels randomly permuted).
  - Split-plot: in each block, main-plot levels are randomised to main plots, then
    sub-plot levels are randomised within each main plot.
*/

export type DesignType = 'CRD' | 'RCBD' | 'Latin_Square' | 'Split_Plot';

export type Plot = {
  /** Plot number in field order, starting at 1. */
  plot: number;
  block: number;
  /** Position within the block (or column for Latin squares), starting at 1. */
  position: number;
  row?: number;
  col?: number;
  treatment: string;
  code: string;
  subTreatment?: string;
  subCode?: string;
};

/** mulberry32: small, fast, well-distributed 32-bit PRNG. Returns floats in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle with the supplied generator (does not mutate the input). */
export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Blind codes: T1, T2 … for treatments; S1, S2 … for sub-plot levels. */
const code = (i: number, prefix = 'T') => `${prefix}${i + 1}`;

export function completelyRandomized(treatments: readonly string[], replicates: number, rand: () => number): Plot[] {
  const units = treatments.flatMap((t, i) => Array.from({ length: replicates }, () => ({ treatment: t, code: code(i) })));
  return shuffle(units, rand).map((u, k) => ({ plot: k + 1, block: 1, position: k + 1, ...u }));
}

export function randomizedCompleteBlock(treatments: readonly string[], blocks: number, rand: () => number): Plot[] {
  const plots: Plot[] = [];
  for (let b = 0; b < blocks; b++) {
    shuffle(treatments.map((t, i) => ({ treatment: t, code: code(i) })), rand).forEach((u, p) =>
      plots.push({ plot: plots.length + 1, block: b + 1, position: p + 1, ...u }),
    );
  }
  return plots;
}

export function latinSquare(treatments: readonly string[], rand: () => number): Plot[] {
  const t = treatments.length;
  const rows = shuffle([...Array(t).keys()], rand);
  const cols = shuffle([...Array(t).keys()], rand);
  const labels = shuffle([...Array(t).keys()], rand);
  const plots: Plot[] = [];
  for (let r = 0; r < t; r++) {
    for (let c = 0; c < t; c++) {
      const k = labels[(rows[r] + cols[c]) % t];
      plots.push({ plot: plots.length + 1, block: r + 1, position: c + 1, row: r + 1, col: c + 1, treatment: treatments[k], code: code(k) });
    }
  }
  return plots;
}

export function splitPlot(mainLevels: readonly string[], subLevels: readonly string[], blocks: number, rand: () => number): Plot[] {
  const plots: Plot[] = [];
  for (let b = 0; b < blocks; b++) {
    const mains = shuffle(mainLevels.map((m, i) => ({ m, i })), rand);
    mains.forEach(({ m, i }, mp) => {
      shuffle(subLevels.map((s, j) => ({ s, j })), rand).forEach(({ s, j }, sp) =>
        plots.push({
          plot: plots.length + 1, block: b + 1, position: mp * subLevels.length + sp + 1,
          treatment: m, code: code(i), subTreatment: s, subCode: code(j, 'S'),
        }),
      );
    });
  }
  return plots;
}

export type DesignInput = {
  designType: DesignType;
  treatments: string[];
  /** Replicates (CRD) or blocks (RCBD, split-plot). Ignored for Latin squares. */
  replicates: number;
  subTreatments?: string[];
  seed: number;
};

/** Checks a design request; returns a message for the first problem, or null. */
export function designProblem({ designType, treatments, replicates, subTreatments = [] }: Omit<DesignInput, 'seed'>): string | null {
  const unique = (xs: string[]) => new Set(xs.map(x => x.trim().toLowerCase())).size === xs.length;
  if (treatments.length < 2) return 'Add at least two treatments.';
  if (!unique(treatments)) return 'Treatment names must be different.';
  if (designType === 'Latin_Square') {
    if (treatments.length < 3) return 'A Latin square needs at least three treatments (with two there are no error degrees of freedom).';
    if (treatments.length > 12) return 'Latin squares above 12 × 12 are impractical; use an RCBD instead.';
    return null;
  }
  if (!Number.isInteger(replicates) || replicates < 2) return designType === 'CRD' ? 'Use at least two replicates.' : 'Use at least two blocks.';
  if (designType === 'Split_Plot') {
    if (subTreatments.length < 2) return 'Add at least two sub-plot levels.';
    if (!unique(subTreatments)) return 'Sub-plot level names must be different.';
  }
  return null;
}

/** Builds the randomised layout for any supported design. */
export function generateLayout(input: DesignInput): Plot[] {
  const rand = seededRandom(input.seed);
  switch (input.designType) {
    case 'CRD': return completelyRandomized(input.treatments, input.replicates, rand);
    case 'RCBD': return randomizedCompleteBlock(input.treatments, input.replicates, rand);
    case 'Latin_Square': return latinSquare(input.treatments, rand);
    case 'Split_Plot': return splitPlot(input.treatments, input.subTreatments ?? [], input.replicates, rand);
  }
}

export const DESIGN_LABELS: Record<DesignType, string> = {
  CRD: 'Completely randomised design',
  RCBD: 'Randomised complete block design',
  Latin_Square: 'Latin square',
  Split_Plot: 'Split-plot design',
};

export const newSeed = () => Math.floor(Math.random() * 2 ** 31);
