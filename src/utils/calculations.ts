import type { GerminationLog } from '../types';

export const calculateMGT = (logs: GerminationLog[], sowingDate: string): number => {
  const start = new Date(sowingDate).getTime();
  let sumNt = 0;
  let sumN = 0;

  logs.forEach(log => {
    const t = Math.ceil((new Date(log.date).getTime() - start) / (1000 * 60 * 60 * 24));
    sumNt += log.count * t;
    sumN += log.count;
  });

  return sumN === 0 ? 0 : sumNt / sumN;
};

export const calculateGE = (logs: GerminationLog[], totalSown: number): number => {
  if (totalSown === 0) return 0;
  const sorted = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (sorted.length === 0) return 0;

  const startDate = new Date(sorted[0].date);
  const sevenDaysLater = new Date(startDate);
  sevenDaysLater.setDate(startDate.getDate() + 7);

  const sevenDayCount = logs
    .filter(log => new Date(log.date) <= sevenDaysLater)
    .reduce((acc, log) => acc + log.count, 0);

  return (sevenDayCount / totalSown) * 100;
};

export const calculateRGR = (w1: number, w2: number, days: number): number => {
  if (days === 0 || w1 <= 0 || w2 <= 0) return 0;
  return (Math.log(w2) - Math.log(w1)) / days;
};

export const calculateDQI = (
  totalDryWeight: number,
  height: number,
  rcd: number,
  shootDryWeight: number,
  rootDryWeight: number
): number => {
  if (rcd === 0 || rootDryWeight === 0) return 0;
  const sturdiness = height / rcd;
  const rootShootRatio = shootDryWeight / rootDryWeight;
  return totalDryWeight / (sturdiness + rootShootRatio);
};

export const calculateGDD = (tMax: number, tMin: number, tBase: number = 10): number => {
  const dailyMean = (tMax + tMin) / 2;
  return Math.max(0, dailyMean - tBase);
};
