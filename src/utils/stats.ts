/*
  Probability distributions and assumption tests for trial analysis.

  - Incomplete beta / gamma: continued fractions and series (Numerical Recipes, 3rd ed.).
  - Studentized range (Tukey): port of R's ptukey (Copenhaver & Holland 1988, as in R nmath).
  - Shapiro–Wilk: Royston (1992, 1995) approximation, as in AS R94 / R's swilk.c.
  - Brown–Forsythe (median-centred Levene) test for equal variances.

  Every function is checked against SciPy reference values in __tests__/stats.test.ts.
*/

const LN_SQRT_2PI = 0.5 * Math.log(2 * Math.PI);

/** ln Γ(x) for x > 0 (Lanczos, g = 7, n = 9). */
export function lnGamma(x: number): number {
  const g = 7;
  const c = [0.9999999999998099, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.984369578019572e-06, 1.5056327351493116e-07];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lnGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return LN_SQRT_2PI + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// ---------------------------------------------------------------------------
// Incomplete gamma → normal distribution
// ---------------------------------------------------------------------------

/** Regularised lower incomplete gamma P(a, x). */
export function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a, del = sum, ap = a;
    for (let n = 0; n < 500; n++) {
      ap += 1; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-16) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  return 1 - gammaQcf(a, x);
}

function gammaQcf(a: number, x: number): number {
  const tiny = 1e-300;
  let b = x + 1 - a, c = 1 / tiny, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/** Standard normal CDF Φ(z). */
export function pnorm(z: number): number {
  const p = gammaP(0.5, (z * z) / 2) / 2;
  return z >= 0 ? 0.5 + p : 0.5 - p;
}

/** Upper tail 1 − Φ(z), accurate far into the tail. */
export function pnormUpper(z: number): number {
  if (z < 0) return 1 - pnormUpper(-z);
  const x = (z * z) / 2;
  return (x < 1.5 ? 1 - gammaP(0.5, x) : gammaQcf(0.5, x)) / 2;
}

/** Standard normal quantile Φ⁻¹(p): rational start refined by Newton steps on pnorm. */
export function qnorm(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  // Acklam's rational approximation as a starting value
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  let x: number;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - pl) {
    const q = p - 0.5, r = q * q;
    x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  for (let i = 0; i < 3; i++) {
    const e = pnorm(x) - p;
    x -= e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  }
  return x;
}

// ---------------------------------------------------------------------------
// Incomplete beta → F and t distributions
// ---------------------------------------------------------------------------

function betacf(a: number, b: number, x: number): number {
  const tiny = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 1000; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return h;
}

/** Regularised incomplete beta I_x(a, b). */
export function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Upper-tail probability P(F > f) for an F distribution with (d1, d2) df. */
export function fUpperTail(f: number, d1: number, d2: number): number {
  if (!(f > 0)) return 1;
  return incompleteBeta(d2 / (d2 + d1 * f), d2 / 2, d1 / 2);
}

/** Two-sided p-value for Student's t with `df` degrees of freedom. */
export function tTwoSided(t: number, df: number): number {
  return incompleteBeta(df / (df + t * t), df / 2, 0.5);
}

// ---------------------------------------------------------------------------
// Studentized range distribution (Tukey HSD)
// ---------------------------------------------------------------------------

const XLEG = [0.9815606342467192, 0.9041172563704749, 0.7699026741943047, 0.5873179542866175, 0.3678314989981802, 0.1252334085114689];
const ALEG = [0.04717533638651183, 0.10693932599531843, 0.16007832854334622, 0.20316742672306592, 0.2334925365383548, 0.24914704581340277];

/** Probability integral of Hartley's form of the range for `cc` groups (R: wprob). */
function wprob(w: number, rr: number, cc: number): number {
  const nleg = 12, ihalf = 6, C1 = -30, C3 = 60, bb = 8, wlar = 3, wincr1 = 2, wincr2 = 3;
  const qsqz = w * 0.5;
  if (qsqz >= bb) return 1;
  let prW = 2 * pnorm(qsqz) - 1;
  prW = prW >= 1 ? 1 : Math.pow(prW, cc);
  const wincr = w > wlar ? wincr1 : wincr2;
  let blb = qsqz;
  const binc = (bb - qsqz) / wincr;
  let bub = blb + binc;
  let einsum = 0;
  const cc1 = cc - 1;
  for (let wi = 1; wi <= wincr; wi++) {
    let elsum = 0;
    const a = 0.5 * (bub + blb), b = 0.5 * (bub - blb);
    for (let jj = 1; jj <= nleg; jj++) {
      let j: number, xx: number;
      if (ihalf < jj) { j = nleg - jj + 1; xx = XLEG[j - 1]; } else { j = jj; xx = -XLEG[j - 1]; }
      const ac = a + b * xx;
      const qexpo = ac * ac;
      if (qexpo > C3) break;
      const pplus = 2 * pnorm(ac);
      const pminus = 2 * pnorm(ac - w);
      let rinsum = pplus * 0.5 - pminus * 0.5;
      if (rinsum >= Math.exp(C1 / cc1)) {
        rinsum = ALEG[j - 1] * Math.exp(-(0.5 * qexpo)) * Math.pow(rinsum, cc1);
        elsum += rinsum;
      }
    }
    elsum *= (2 * b * cc) / Math.sqrt(2 * Math.PI);
    einsum += elsum;
    blb = bub;
    bub += binc;
  }
  prW += einsum;
  if (prW <= Math.exp(C1 / rr)) return 0;
  prW = Math.pow(prW, rr);
  return prW >= 1 ? 1 : prW;
}

const XLEGQ = [0.9894009349916499, 0.9445750230732326, 0.8656312023878318, 0.755404408355003, 0.6178762444026438, 0.45801677765722737, 0.2816035507792589, 0.09501250983763744];
const ALEGQ = [0.027152459411754096, 0.062253523938647894, 0.09515851168249279, 0.12462897125553388, 0.14959598881657674, 0.16915651939500254, 0.18260341504492358, 0.1894506104550685];

/** P(Q ≤ q) for the studentized range of `k` means with `df` error degrees of freedom (R: ptukey, nranges = 1). */
export function ptukey(q: number, k: number, df: number): number {
  if (!(q > 0)) return 0;
  const rr = 1, cc = k;
  if (df > 25000) return wprob(q, rr, cc);
  const nlegq = 16, ihalfq = 8, eps1 = -30, eps2 = 1e-14;
  const f2 = df * 0.5;
  let f2lf = f2 * Math.log(df) - df * Math.LN2 - lnGamma(f2);
  const f21 = f2 - 1;
  const ff4 = df * 0.25;
  const ulen = df <= 100 ? 1 : df <= 800 ? 0.5 : df <= 5000 ? 0.25 : 0.125;
  f2lf += Math.log(ulen);
  let ans = 0;
  for (let i = 1; i <= 50; i++) {
    let otsum = 0;
    const twa1 = (2 * i - 1) * ulen;
    for (let jj = 1; jj <= nlegq; jj++) {
      let j: number, t1: number;
      if (ihalfq < jj) {
        j = jj - ihalfq - 1;
        t1 = f2lf + f21 * Math.log(twa1 + XLEGQ[j] * ulen) - (XLEGQ[j] * ulen + twa1) * ff4;
      } else {
        j = jj - 1;
        t1 = f2lf + f21 * Math.log(twa1 - XLEGQ[j] * ulen) + (XLEGQ[j] * ulen - twa1) * ff4;
      }
      if (t1 >= eps1) {
        const qsqz = ihalfq < jj ? q * Math.sqrt((XLEGQ[j] * ulen + twa1) * 0.5) : q * Math.sqrt((-(XLEGQ[j] * ulen) + twa1) * 0.5);
        otsum += wprob(qsqz, rr, cc) * ALEGQ[j] * Math.exp(t1);
      }
    }
    if (i * ulen >= 1 && otsum <= eps2) break;
    ans += otsum;
  }
  return Math.min(1, Math.max(0, ans));
}

/** Upper-tail p-value P(Q > q) for Tukey's test. */
export const tukeyPValue = (q: number, k: number, df: number) => 1 - ptukey(q, k, df);

/** Critical value q(α; k, df) by bisection on ptukey. */
export function qtukey(p: number, k: number, df: number): number {
  let lo = 0, hi = 50;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (ptukey(mid, k, df) < p) lo = mid; else hi = mid;
    if (hi - lo < 1e-9) break;
  }
  return (lo + hi) / 2;
}

// ---------------------------------------------------------------------------
// Assumption tests
// ---------------------------------------------------------------------------

const poly = (c: number[], x: number) => c.reduce((s, ci, i) => s + ci * Math.pow(x, i), 0);

export type TestResult = { statistic: number; p: number };

/** Shapiro–Wilk W test for normality (Royston 1995). Valid for 3 ≤ n ≤ 5000. */
export function shapiroWilk(values: readonly number[]): TestResult | null {
  const x = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  const n = x.length;
  if (n < 3 || n > 5000) return null;
  const mean = x.reduce((s, v) => s + v, 0) / n;
  const ss = x.reduce((s, v) => s + (v - mean) ** 2, 0);
  if (ss <= 1e-12 * Math.max(1, mean * mean)) return null; // all values equal

  const a = new Array<number>(n).fill(0);
  if (n === 3) {
    a[0] = -Math.SQRT1_2; a[2] = Math.SQRT1_2;
  } else {
    const m = x.map((_, i) => qnorm((i + 1 - 0.375) / (n + 0.25)));
    const mm = m.reduce((s, v) => s + v * v, 0);
    const u = 1 / Math.sqrt(n);
    const an = poly([0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056], u) + m[n - 1] / Math.sqrt(mm);
    if (n > 5) {
      const an1 = poly([0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633], u) + m[n - 2] / Math.sqrt(mm);
      const phi = (mm - 2 * m[n - 1] ** 2 - 2 * m[n - 2] ** 2) / (1 - 2 * an ** 2 - 2 * an1 ** 2);
      for (let i = 2; i < n - 2; i++) a[i] = m[i] / Math.sqrt(phi);
      a[n - 1] = an; a[0] = -an; a[n - 2] = an1; a[1] = -an1;
    } else {
      const phi = (mm - 2 * m[n - 1] ** 2) / (1 - 2 * an ** 2);
      for (let i = 1; i < n - 1; i++) a[i] = m[i] / Math.sqrt(phi);
      a[n - 1] = an; a[0] = -an;
    }
  }
  const w = Math.min(1, x.reduce((s, v, i) => s + a[i] * v, 0) ** 2 / ss);

  let p: number;
  if (n === 3) {
    p = Math.max(0, Math.min(1, (6 / Math.PI) * (Math.asin(Math.sqrt(w)) - Math.asin(Math.sqrt(0.75)))));
  } else if (n <= 11) {
    const gamma = poly([-2.273, 0.459], n);
    const mu = poly([0.544, -0.39978, 0.025054, -6.714e-4], n);
    const sigma = Math.exp(poly([1.3822, -0.77857, 0.062767, -0.0020322], n));
    const y = -Math.log(gamma - Math.log(1 - w));
    p = pnormUpper((y - mu) / sigma);
  } else {
    const ln = Math.log(n);
    const mu = poly([-1.5861, -0.31082, -0.083751, 0.0038915], ln);
    const sigma = Math.exp(poly([-0.4803, -0.082676, 0.0030302], ln));
    p = pnormUpper((Math.log(1 - w) - mu) / sigma);
  }
  return { statistic: w, p };
}

const median = (v: readonly number[]) => {
  const s = [...v].sort((a, b) => a - b);
  const h = Math.floor(s.length / 2);
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};

/** Brown–Forsythe test (Levene with median centring) for equal group variances. */
export function brownForsythe(groups: readonly (readonly number[])[]): TestResult | null {
  const gs = groups.filter(g => g.length > 0);
  const k = gs.length;
  const n = gs.reduce((s, g) => s + g.length, 0);
  if (k < 2 || n - k < 1) return null;
  const z = gs.map(g => { const md = median(g); return g.map(v => Math.abs(v - md)); });
  const zMeans = z.map(g => g.reduce((s, v) => s + v, 0) / g.length);
  const zGrand = z.flat().reduce((s, v) => s + v, 0) / n;
  const between = z.reduce((s, g, i) => s + g.length * (zMeans[i] - zGrand) ** 2, 0);
  const within = z.reduce((s, g, i) => s + g.reduce((t, v) => t + (v - zMeans[i]) ** 2, 0), 0);
  if (within <= 0) return null;
  const f = (between / (k - 1)) / (within / (n - k));
  return { statistic: f, p: fUpperTail(f, k - 1, n - k) };
}
