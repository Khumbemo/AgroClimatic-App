# Generates src/utils/__tests__/anova-reference.json with statsmodels/SciPy.
# pip install numpy pandas scipy statsmodels; python scripts/anova-reference.py > src/utils/__tests__/anova-reference.json
import json, itertools
import numpy as np, pandas as pd
import statsmodels.formula.api as smf
from statsmodels.stats.anova import anova_lm
from statsmodels.stats.multicomp import pairwise_tukeyhsd
from scipy import stats

rng = np.random.default_rng(2026)
out = {}

def tukey_manual(means, n, mse, df):
    levels = sorted(means, key=lambda k: -means[k]); k = len(levels); res = []
    for i, j in itertools.combinations(range(k), 2):
        a, b = levels[i], levels[j]
        q = abs(means[a] - means[b]) / np.sqrt(mse / n)
        res.append([a, b, float(stats.studentized_range.sf(q, k, df))])
    return res

# CRD, unequal replication (Tukey–Kramer via statsmodels)
trt = ['A'] * 5 + ['B'] * 4 + ['C'] * 6 + ['D'] * 5
eff = {'A': 10, 'B': 12.5, 'C': 9.2, 'D': 14}
y = [round(eff[t] + rng.normal(0, 1.3), 2) for t in trt]
df = pd.DataFrame({'y': y, 't': trt})
a = anova_lm(smf.ols('y ~ C(t)', df).fit())
tk = pairwise_tukeyhsd(df.y, df.t)
out['crd'] = {
  'obs': [{'block': 1, 'treatment': t, 'value': v} for t, v in zip(trt, y)],
  'ss': [a.loc['C(t)', 'sum_sq'], a.loc['Residual', 'sum_sq']], 'df': [a.loc['C(t)', 'df'], a.loc['Residual', 'df']],
  'f': a.loc['C(t)', 'F'], 'p': a.loc['C(t)', 'PR(>F)'],
  'tukey': [[str(g1), str(g2), float(p)] for (g1, g2), p in zip(itertools.combinations(tk.groupsunique, 2), tk.pvalues)],
}

# RCBD 5 treatments x 4 blocks
rows = []
for b in range(1, 5):
  for t, e in zip(['T1', 'T2', 'T3', 'T4', 'T5'], [20, 23, 21, 26, 19]):
    rows.append({'block': b, 'treatment': t, 'value': round(e + b * 0.8 + rng.normal(0, 1.1), 2)})
df = pd.DataFrame(rows)
a = anova_lm(smf.ols('value ~ C(block) + C(treatment)', df).fit())
mse = a.loc['Residual', 'mean_sq']; dfe = a.loc['Residual', 'df']
out['rcbd'] = {'obs': rows, 'ss': [a.loc['C(block)', 'sum_sq'], a.loc['C(treatment)', 'sum_sq'], a.loc['Residual', 'sum_sq']],
  'f': [a.loc['C(block)', 'F'], a.loc['C(treatment)', 'F']], 'p': [a.loc['C(block)', 'PR(>F)'], a.loc['C(treatment)', 'PR(>F)']],
  'tukey': tukey_manual(df.groupby('treatment').value.mean().to_dict(), 4, mse, dfe)}

# Latin square 4x4 (cyclic, permuted)
tr = ['P', 'Q', 'R', 'S']; ef = {'P': 5, 'Q': 6.5, 'R': 5.2, 'S': 7.4}
rows = []
for r in range(4):
  for c in range(4):
    t = tr[(r + c) % 4]
    rows.append({'block': r + 1, 'row': r + 1, 'col': c + 1, 'treatment': t, 'value': round(ef[t] + 0.3 * r - 0.2 * c + rng.normal(0, 0.4), 3)})
df = pd.DataFrame(rows)
a = anova_lm(smf.ols('value ~ C(row) + C(col) + C(treatment)', df).fit())
out['latin'] = {'obs': rows, 'ss': [a.loc[k, 'sum_sq'] for k in ['C(row)', 'C(col)', 'C(treatment)', 'Residual']],
  'p': a.loc['C(treatment)', 'PR(>F)'],
  'tukey': tukey_manual(df.groupby('treatment').value.mean().to_dict(), 4, a.loc['Residual', 'mean_sq'], a.loc['Residual', 'df'])}

# Split-plot: 3 blocks, A (3 levels) main, B (4 levels) sub
rows = []
for k in range(1, 4):
  for ai, A in enumerate(['M1', 'M2', 'M3']):
    whole = rng.normal(0, 1.0)
    for bi, B in enumerate(['S1', 'S2', 'S3', 'S4']):
      rows.append({'block': k, 'treatment': A, 'subTreatment': B, 'value': round(30 + 2 * ai + 1.5 * bi + 0.4 * ai * bi + k + whole + rng.normal(0, 0.7), 2)})
df = pd.DataFrame(rows)
a = anova_lm(smf.ols('value ~ C(block) + C(treatment) + C(block):C(treatment) + C(subTreatment) + C(treatment):C(subTreatment)', df).fit())
ssR, ssA, ssEa, ssB, ssAB, ssEb = [a.loc[k, 'sum_sq'] for k in ['C(block)', 'C(treatment)', 'C(block):C(treatment)', 'C(subTreatment)', 'C(treatment):C(subTreatment)', 'Residual']]
dfEa, dfEb = 2 * 2, 3 * 2 * 3
msEa, msEb = ssEa / dfEa, ssEb / dfEb
fA = (ssA / 2) / msEa; fB = (ssB / 3) / msEb; fAB = (ssAB / 6) / msEb
out['split'] = {'obs': rows, 'ss': [ssR, ssA, ssEa, ssB, ssAB, ssEb],
  'f': [fA, fB, fAB], 'p': [stats.f.sf(fA, 2, dfEa), stats.f.sf(fB, 3, dfEb), stats.f.sf(fAB, 6, dfEb)],
  'tukeyA': tukey_manual(df.groupby('treatment').value.mean().to_dict(), 12, msEa, dfEa),
  'tukeyB': tukey_manual(df.groupby('subTreatment').value.mean().to_dict(), 9, msEb, dfEb)}

print(json.dumps(out, default=float))
