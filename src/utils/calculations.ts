/*
  Scientific calculations used across the app. Every function here is covered by
  src/utils/__tests__/calculations.test.ts against hand-worked or published values.
*/

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Germination (Ranal & Santana 2006 give the standard definitions)
// ---------------------------------------------------------------------------

export type DailyCount = { date: string; count: number };

/** Whole days from sowing to an observation date (both YYYY-MM-DD). */
export const daysAfterSowing = (date: string, sowingDate: string): number =>
  Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${sowingDate}T00:00:00Z`)) / DAY_MS);

/**
 * Day index used in rate formulas. Counts are made at least one day after sowing, so a
 * count dated on (or before) the sowing date is treated as day 1 to avoid dividing by zero.
 */
const dayIndex = (date: string, sowingDate: string) => Math.max(1, daysAfterSowing(date, sowingDate));

const total = (counts: readonly DailyCount[]) => counts.reduce((s, c) => s + c.count, 0);

/** Final germination percentage: Σnᵢ / N × 100. */
export const germinationPercent = (counts: readonly DailyCount[], seedsSown: number): number | null =>
  seedsSown > 0 ? (total(counts) / seedsSown) * 100 : null;

/** Mean germination time (days): Σ(tᵢ·nᵢ) / Σnᵢ. */
export const meanGerminationTime = (counts: readonly DailyCount[], sowingDate: string): number | null => {
  const n = total(counts);
  return n > 0 ? counts.reduce((s, c) => s + dayIndex(c.date, sowingDate) * c.count, 0) / n : null;
};

/** Germination speed index (Maguire 1962): Σ(nᵢ / tᵢ), seeds per day. */
export const germinationSpeedIndex = (counts: readonly DailyCount[], sowingDate: string): number =>
  counts.reduce((s, c) => s + c.count / dayIndex(c.date, sowingDate), 0);

/**
 * Germination energy: percentage of seeds sown that germinated within `byDay` days after
 * sowing (a fixed early count, commonly day 7). Counted from the sowing date.
 */
export const germinationEnergy = (counts: readonly DailyCount[], seedsSown: number, sowingDate: string, byDay = 7): number | null => {
  if (seedsSown <= 0) return null;
  const early = counts.filter(c => daysAfterSowing(c.date, sowingDate) <= byDay);
  return (total(early) / seedsSown) * 100;
};

/** Cumulative germination % after each count, in date order. */
export const cumulativeGermination = (counts: readonly DailyCount[], seedsSown: number): number[] => {
  const sorted = [...counts].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((_, i) => (seedsSown > 0 ? (total(sorted.slice(0, i + 1)) / seedsSown) * 100 : 0));
};

// ---------------------------------------------------------------------------
// Seedling quality and growth
// ---------------------------------------------------------------------------

/** Relative growth rate: (ln W₂ − ln W₁) / Δt, per day. W can be dry mass or height. */
export const calculateRGR = (w1: number, w2: number, days: number): number => {
  if (days === 0 || w1 <= 0 || w2 <= 0) return 0;
  return (Math.log(w2) - Math.log(w1)) / days;
};

/** Sturdiness quotient: height (cm) / root-collar diameter (mm). */
export const sturdinessQuotient = (heightCm: number, rcdMm: number): number | null => (rcdMm > 0 ? heightCm / rcdMm : null);

/**
 * Dickson quality index (Dickson, Leaf & Hosner 1960):
 * total dry mass (g) / [height (cm) / RCD (mm) + shoot dry mass / root dry mass].
 */
export const dicksonQualityIndex = (heightCm: number, rcdMm: number, shootDryG: number, rootDryG: number): number | null => {
  if (rcdMm <= 0 || rootDryG <= 0 || shootDryG <= 0) return null;
  return (shootDryG + rootDryG) / (heightCm / rcdMm + shootDryG / rootDryG);
};

// ---------------------------------------------------------------------------
// Climate
// ---------------------------------------------------------------------------

/** Saturation vapour pressure (kPa), Tetens equation. */
export const saturationVapourPressure = (tempC: number): number => 0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));

/** Vapour pressure deficit (kPa) from air temperature (°C) and relative humidity (%). */
export const calculateVPD = (tempC: number, rh: number): number => saturationVapourPressure(tempC) * (1 - rh / 100);

/** Dew point (°C), Magnus form with the same constants as the Tetens equation. */
export const dewPoint = (tempC: number, rh: number): number | null => {
  if (rh <= 0) return null;
  const gamma = Math.log(rh / 100) + (17.27 * tempC) / (237.3 + tempC);
  return (237.3 * gamma) / (17.27 - gamma);
};

/** Daily light integral (mol m⁻² d⁻¹) from PAR (µmol m⁻² s⁻¹) and photoperiod (h). */
export const dailyLightIntegral = (parUmol: number, photoperiodH: number): number => (parUmol * photoperiodH * 3600) / 1_000_000;

/** Growing degree days for one day, simple average method. */
export const calculateGDD = (tMax: number, tMin: number, tBase = 10): number => Math.max(0, (tMax + tMin) / 2 - tBase);

export type VpdBand = { max: number; label: string; tone: 'water' | 'leaf-light' | 'leaf' | 'warn' | 'critical' };

// Common greenhouse VPD guidance bands (kPa). Upper bound of the last band is open.
export const VPD_BANDS: VpdBand[] = [
  { max: 0.4, label: 'Low transpiration', tone: 'water' },
  { max: 0.8, label: 'Propagation', tone: 'leaf-light' },
  { max: 1.2, label: 'Optimal vegetative', tone: 'leaf' },
  { max: 1.6, label: 'High transpiration', tone: 'warn' },
  { max: Infinity, label: 'Stress / stomatal closure', tone: 'critical' },
];

export const getVpdBand = (vpd: number): VpdBand => VPD_BANDS.find(b => vpd < b.max) ?? VPD_BANDS[VPD_BANDS.length - 1];

// ---------------------------------------------------------------------------
// Fertigation and substrate
// ---------------------------------------------------------------------------

/** Dry fertiliser mass (g) to reach `ppm` (mg L⁻¹) of an element present at `elementPct` % w/w. */
export const fertilizerMassG = (ppm: number, volumeL: number, elementPct: number): number | null =>
  elementPct > 0 ? (ppm * volumeL) / (elementPct * 10) : null;

/** Leaching fraction: drainage volume / applied volume. */
export const leachingFraction = (drainageMl: number, appliedMl: number): number | null => (appliedMl > 0 ? drainageMl / appliedMl : null);
