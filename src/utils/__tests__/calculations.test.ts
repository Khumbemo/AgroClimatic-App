import { describe, expect, it } from 'vitest';
import {
  calculateGDD, calculateRGR, calculateVPD, cumulativeGermination, dailyLightIntegral, daysAfterSowing, dewPoint,
  dicksonQualityIndex, fertilizerMassG, germinationEnergy, germinationPercent, germinationSpeedIndex, getVpdBand,
  leachingFraction, meanGerminationTime, saturationVapourPressure, sturdinessQuotient,
} from '../calculations';

describe('germination', () => {
  // 1000 seeds sown 2024-03-10; counts on days 5, 8 and 12 after sowing
  const counts = [
    { date: '2024-03-15', count: 120 },
    { date: '2024-03-18', count: 300 },
    { date: '2024-03-22', count: 180 },
  ];

  it('counts days after sowing across month ends and DST', () => {
    expect(daysAfterSowing('2024-03-15', '2024-03-10')).toBe(5);
    expect(daysAfterSowing('2024-04-01', '2024-03-30')).toBe(2);
    expect(daysAfterSowing('2024-03-31', '2024-03-30')).toBe(1); // EU DST change night
  });

  it('final germination %', () => {
    expect(germinationPercent(counts, 1000)).toBe(60);
    expect(germinationPercent(counts, 0)).toBeNull();
  });

  it('mean germination time = Σ(t·n)/Σn', () => {
    // (5·120 + 8·300 + 12·180) / 600 = 5160 / 600
    expect(meanGerminationTime(counts, '2024-03-10')).toBeCloseTo(8.6, 10);
    expect(meanGerminationTime([], '2024-03-10')).toBeNull();
  });

  it('germination speed index = Σ(n/t)', () => {
    // 120/5 + 300/8 + 180/12 = 24 + 37.5 + 15
    expect(germinationSpeedIndex(counts, '2024-03-10')).toBeCloseTo(76.5, 10);
  });

  it('germination energy counts from the sowing date, not the first count', () => {
    // Only the day-5 count falls within 7 days of sowing
    expect(germinationEnergy(counts, 1000, '2024-03-10', 7)).toBe(12);
    // The old implementation measured 7 days from the first count (day 5 → day 12), giving 60 %
    expect(germinationEnergy(counts, 1000, '2024-03-10', 12)).toBe(60);
  });

  it('cumulative germination curve', () => {
    expect(cumulativeGermination(counts, 1000)).toEqual([12, 42, 60]);
  });
});

describe('seedling quality', () => {
  it('sturdiness quotient H/D', () => {
    expect(sturdinessQuotient(5.2, 1.4)).toBeCloseTo(3.714, 3);
    expect(sturdinessQuotient(5, 0)).toBeNull();
  });

  it('Dickson quality index', () => {
    // H 20 cm, D 4 mm, shoot 3 g, root 1.5 g → 4.5 / (5 + 2) = 0.6429
    expect(dicksonQualityIndex(20, 4, 3, 1.5)).toBeCloseTo(0.642857, 6);
    expect(dicksonQualityIndex(20, 4, 3, 0)).toBeNull();
  });

  it('relative growth rate', () => {
    // doubling in 10 days → ln 2 / 10
    expect(calculateRGR(5, 10, 10)).toBeCloseTo(Math.LN2 / 10, 10);
    expect(calculateRGR(5, 10, 0)).toBe(0);
  });
});

describe('climate', () => {
  it('saturation vapour pressure matches standard table values', () => {
    expect(saturationVapourPressure(0)).toBeCloseTo(0.611, 3);
    expect(saturationVapourPressure(20)).toBeCloseTo(2.338, 2);
    expect(saturationVapourPressure(25)).toBeCloseTo(3.168, 2);
  });

  it('VPD and its guidance band', () => {
    expect(calculateVPD(25, 60)).toBeCloseTo(1.267, 3);
    expect(getVpdBand(calculateVPD(25, 60)).label).toBe('High transpiration');
    expect(getVpdBand(calculateVPD(24.6, 68)).label).toBe('Optimal vegetative');
    expect(getVpdBand(0.4).label).toBe('Propagation'); // band lower bounds are inclusive
    expect(calculateVPD(20, 100)).toBe(0);
  });

  it('dew point', () => {
    expect(dewPoint(25, 60)).toBeCloseTo(16.7, 1);
    expect(dewPoint(20, 100)).toBeCloseTo(20, 6);
    expect(dewPoint(20, 0)).toBeNull();
  });

  it('daily light integral', () => {
    // 412 µmol m⁻² s⁻¹ for 12 h = 17.80 mol m⁻² d⁻¹
    expect(dailyLightIntegral(412, 12)).toBeCloseTo(17.7984, 4);
  });

  it('growing degree days never go negative', () => {
    expect(calculateGDD(28, 12)).toBe(10);
    expect(calculateGDD(8, 2)).toBe(0);
  });
});

describe('fertigation', () => {
  it('fertiliser mass for a target ppm', () => {
    // 150 mg/L × 10 L = 1.5 g of element; at 20 % that is 7.5 g of product
    expect(fertilizerMassG(150, 10, 20)).toBe(7.5);
    expect(fertilizerMassG(150, 10, 0)).toBeNull();
  });

  it('leaching fraction', () => {
    expect(leachingFraction(250, 1000)).toBe(0.25);
    expect(leachingFraction(250, 0)).toBeNull();
  });
});
