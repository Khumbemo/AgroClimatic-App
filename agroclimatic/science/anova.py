"""
Analysis of variance for the four trial designs, with Tukey comparisons and assumption checks.

Models (fixed effects, one observation per plot):
- CRD:          y = μ + τᵢ + ε                       (unequal replication allowed; Tukey–Kramer)
- RCBD:         y = μ + βⱼ + τᵢ + ε                   (complete blocks required)
- Latin square: y = μ + ρⱼ + γₖ + τᵢ + ε             (complete square required)
- Split-plot:   y = μ + βₖ + αᵢ + (βα)ₖᵢ + γⱼ + (αγ)ᵢⱼ + ε
                main plots tested against error (a) = block × A, sub-plots against error (b)

Distributions come from SciPy (F, studentized range); normality is Shapiro–Wilk and equal
variance the Brown–Forsythe test (Levene, median-centred). Verified against statsmodels
OLS/anova_lm in tests/test_anova.py.
"""

from __future__ import annotations

import math
from collections import OrderedDict
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from typing import TypedDict

import numpy as np
from scipy import stats


class Observation(TypedDict, total=False):
    block: int
    row: int
    col: int
    treatment: str
    subTreatment: str
    value: float


@dataclass
class AnovaRow:
    source: str
    df: int
    ss: float
    ms: float | None = None
    f: float | None = None
    p: float | None = None
    error_term: str | None = None


@dataclass
class MeanRow:
    level: str
    mean: float
    n: int
    se: float
    letters: str


@dataclass
class Pair:
    a: str
    b: str
    diff: float
    p: float


@dataclass
class FactorComparison:
    factor: str
    means: list[MeanRow]
    pairs: list[Pair]
    error_df: int
    mse: float
    anova_p: float
    """ANOVA p-value of the factor; letters are only meaningful when this is < 0.05."""


@dataclass
class TestResult:
    statistic: float
    p: float


@dataclass
class AnovaResult:
    design: str
    n: int
    grand_mean: float
    table: list[AnovaRow]
    comparisons: list[FactorComparison]
    cv: list[tuple[str, float]]
    residuals: list[float]
    normality: TestResult | None = None
    equal_variance: TestResult | None = None
    groups: list[list[float]] = field(default_factory=list, repr=False)

    def row(self, source: str) -> AnovaRow:
        return next(r for r in self.table if r.source == source)


class AnalysisError(ValueError):
    """Raised with a readable message when the data cannot be analysed for the design."""


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _group(obs: Sequence[Observation], key: Callable[[Observation], object]) -> OrderedDict[object, list[Observation]]:
    groups: OrderedDict[object, list[Observation]] = OrderedDict()
    for o in obs:
        groups.setdefault(key(o), []).append(o)
    return groups


def _means(obs: Sequence[Observation], key) -> OrderedDict[object, float]:
    return OrderedDict((k, float(np.mean([o["value"] for o in g]))) for k, g in _group(obs, key).items())


def _values(groups) -> OrderedDict[str, list[float]]:
    return OrderedDict((k, [o["value"] for o in g]) for k, g in groups.items())


def _row(
    source: str,
    df: int,
    ss: float,
    err_ms: float | None = None,
    err_df: int | None = None,
    error_term: str | None = None,
) -> AnovaRow:
    ms = ss / df if df > 0 else None
    if err_ms is None or err_df is None or ms is None or err_ms <= 0:
        return AnovaRow(source, df, ss, ms)
    f = ms / err_ms
    return AnovaRow(source, df, ss, ms, f, float(stats.f.sf(f, df, err_df)), error_term)


def compact_letters(levels: Sequence[str], significant: Callable[[str, str], bool]) -> dict[str, str]:
    """
    Compact letter display by the insert-and-absorb algorithm (Piepho 2004): levels that share a
    letter are not significantly different. Letters are assigned from the first (highest-mean) level.
    """
    cols: list[set[str]] = [set(levels)]
    for i in range(len(levels)):
        for j in range(i + 1, len(levels)):
            a, b = levels[i], levels[j]
            if not significant(a, b):
                continue
            nxt: list[set[str]] = []
            for c in cols:
                if a in c and b in c:
                    nxt.append(c - {b})
                    nxt.append(c - {a})
                else:
                    nxt.append(c)
            # absorb: drop columns contained in another (keep the first of identical columns)
            cols = [
                c
                for idx, c in enumerate(nxt)
                if not any(jdx != idx and c <= d and (len(c) < len(d) or jdx < idx) for jdx, d in enumerate(nxt))
            ]
    rank = {lvl: i for i, lvl in enumerate(levels)}
    cols.sort(key=lambda c: min(rank[x] for x in c))
    letters = {lvl: "" for lvl in levels}
    for i, c in enumerate(cols):
        letter = chr(97 + i) if i < 26 else f"{chr(97 + i % 26)}{i // 26}"
        for lvl in c:
            letters[lvl] += letter
    return letters


def tukey_p(q: float, k: int, df: float) -> float:
    """Upper-tail p-value P(Q > q) of the studentized range for k means."""
    return float(stats.studentized_range.sf(q, k, df))


def _tukey(
    factor: str,
    groups: OrderedDict[str, list[float]],
    mse: float,
    error_df: int,
    anova_p: float,
    n_per_mean: int | None = None,
) -> FactorComparison:
    """Tukey HSD (Tukey–Kramer for unequal n) for one factor."""
    rows = sorted(((lvl, float(np.mean(v)), n_per_mean or len(v)) for lvl, v in groups.items()), key=lambda r: -r[1])
    k = len(rows)
    pairs: list[Pair] = []
    for i in range(k):
        for j in range(i + 1, k):
            (la, ma, na), (lb, mb, nb) = rows[i], rows[j]
            se = math.sqrt(mse / 2 * (1 / na + 1 / nb))
            diff = ma - mb
            pairs.append(Pair(la, lb, diff, tukey_p(abs(diff) / se, k, error_df) if se > 0 else 1.0))
    sig = {frozenset((p.a, p.b)): p.p < 0.05 for p in pairs}
    letters = compact_letters([r[0] for r in rows], lambda a, b: sig.get(frozenset((a, b)), False))
    means = [MeanRow(lvl, m, n, math.sqrt(mse / n), letters[lvl]) for lvl, m, n in rows]
    return FactorComparison(factor, means, pairs, error_df, mse, anova_p)


def _require_complete(obs: Sequence[Observation], expected: int, what: str) -> None:
    if len(obs) != expected:
        raise AnalysisError(
            f"This design needs a value for every plot ({what}); {len(obs)} of {expected} are filled in."
        )


def _ss_of_means(means, weight: float, gm: float) -> float:
    return weight * sum((m - gm) ** 2 for m in means.values())


# ---------------------------------------------------------------------------
# designs
# ---------------------------------------------------------------------------


def _crd(obs: list[Observation]) -> AnovaResult:
    by_t = _group(obs, lambda o: o["treatment"])
    n, t = len(obs), len(by_t)
    if t < 2:
        raise AnalysisError("At least two treatments need values.")
    if n - t < 1:
        raise AnalysisError("At least one treatment needs two or more values to estimate error.")
    gm = float(np.mean([o["value"] for o in obs]))
    t_means = {k: float(np.mean([o["value"] for o in g])) for k, g in by_t.items()}
    ss_t = sum(len(g) * (t_means[k] - gm) ** 2 for k, g in by_t.items())
    residuals = [o["value"] - t_means[o["treatment"]] for o in obs]
    ss_e = sum(r * r for r in residuals)
    df_e = n - t
    mse = ss_e / df_e
    trt = _row("Treatment", t - 1, ss_t, mse, df_e, "Residual")
    groups = _values(by_t)
    return AnovaResult(
        "CRD",
        n,
        gm,
        [trt, AnovaRow("Residual", df_e, ss_e, mse), AnovaRow("Total", n - 1, ss_t + ss_e)],
        [_tukey("Treatment", groups, mse, df_e, trt.p if trt.p is not None else 1.0)],
        [("CV", math.sqrt(mse) / gm * 100)],
        residuals,
        groups=list(groups.values()),
    )


def _rcbd(obs: list[Observation]) -> AnovaResult:
    by_t = _group(obs, lambda o: o["treatment"])
    by_b = _group(obs, lambda o: o["block"])
    t, r = len(by_t), len(by_b)
    if t < 2 or r < 2:
        raise AnalysisError("An RCBD analysis needs at least two treatments and two blocks with values.")
    _require_complete(obs, t * r, "every treatment in every block")
    if any(len({o["treatment"] for o in g}) != t for g in by_b.values()):
        raise AnalysisError("Each block must contain each treatment exactly once.")
    gm = float(np.mean([o["value"] for o in obs]))
    t_m, b_m = _means(obs, lambda o: o["treatment"]), _means(obs, lambda o: o["block"])
    ss_b, ss_t = _ss_of_means(b_m, t, gm), _ss_of_means(t_m, r, gm)
    ss_tot = sum((o["value"] - gm) ** 2 for o in obs)
    ss_e = max(0.0, ss_tot - ss_b - ss_t)
    df_e = (r - 1) * (t - 1)
    mse = ss_e / df_e
    residuals = [o["value"] - t_m[o["treatment"]] - b_m[o["block"]] + gm for o in obs]
    trt = _row("Treatment", t - 1, ss_t, mse, df_e, "Residual")
    groups = _values(by_t)
    return AnovaResult(
        "RCBD",
        len(obs),
        gm,
        [
            _row("Block", r - 1, ss_b, mse, df_e, "Residual"),
            trt,
            AnovaRow("Residual", df_e, ss_e, mse),
            AnovaRow("Total", len(obs) - 1, ss_tot),
        ],
        [_tukey("Treatment", groups, mse, df_e, trt.p if trt.p is not None else 1.0)],
        [("CV", math.sqrt(mse) / gm * 100)],
        residuals,
        groups=list(groups.values()),
    )


def _latin(obs: list[Observation]) -> AnovaResult:
    by_t = _group(obs, lambda o: o["treatment"])
    t = len(by_t)
    if t < 3:
        raise AnalysisError("A Latin square analysis needs at least three treatments.")
    _require_complete(obs, t * t, f"{t} × {t} square")
    gm = float(np.mean([o["value"] for o in obs]))
    r_m, c_m = _means(obs, lambda o: o.get("row")), _means(obs, lambda o: o.get("col"))
    t_m = _means(obs, lambda o: o["treatment"])
    if len(r_m) != t or len(c_m) != t:
        raise AnalysisError("Rows and columns must each contain every treatment once.")
    ss_r, ss_c, ss_t = _ss_of_means(r_m, t, gm), _ss_of_means(c_m, t, gm), _ss_of_means(t_m, t, gm)
    ss_tot = sum((o["value"] - gm) ** 2 for o in obs)
    ss_e = max(0.0, ss_tot - ss_r - ss_c - ss_t)
    df_e = (t - 1) * (t - 2)
    mse = ss_e / df_e
    residuals = [o["value"] - r_m[o["row"]] - c_m[o["col"]] - t_m[o["treatment"]] + 2 * gm for o in obs]
    trt = _row("Treatment", t - 1, ss_t, mse, df_e, "Residual")
    groups = _values(by_t)
    return AnovaResult(
        "Latin_Square",
        len(obs),
        gm,
        [
            _row("Row", t - 1, ss_r, mse, df_e, "Residual"),
            _row("Column", t - 1, ss_c, mse, df_e, "Residual"),
            trt,
            AnovaRow("Residual", df_e, ss_e, mse),
            AnovaRow("Total", len(obs) - 1, ss_tot),
        ],
        [_tukey("Treatment", groups, mse, df_e, trt.p if trt.p is not None else 1.0)],
        [("CV", math.sqrt(mse) / gm * 100)],
        residuals,
        groups=list(groups.values()),
    )


def _split_plot(obs: list[Observation]) -> AnovaResult:
    if any(not o.get("subTreatment") for o in obs):
        raise AnalysisError("Split-plot observations need a sub-plot level.")
    A = _group(obs, lambda o: o["treatment"])
    B = _group(obs, lambda o: o["subTreatment"])
    R = _group(obs, lambda o: o["block"])
    a, b, r = len(A), len(B), len(R)
    if a < 2 or b < 2 or r < 2:
        raise AnalysisError(
            "A split-plot analysis needs at least two main-plot levels, two sub-plot levels and two blocks."
        )
    _require_complete(obs, a * b * r, "every sub-plot level in every main plot of every block")
    gm = float(np.mean([o["value"] for o in obs]))
    m_r = _means(obs, lambda o: o["block"])
    m_a = _means(obs, lambda o: o["treatment"])
    m_b = _means(obs, lambda o: o["subTreatment"])
    m_ra = _means(obs, lambda o: (o["block"], o["treatment"]))
    m_ab = _means(obs, lambda o: (o["treatment"], o["subTreatment"]))
    if len(m_ra) != a * r or len(m_ab) != a * b:
        raise AnalysisError("Each block must contain every main-plot level, each with every sub-plot level.")
    ss_r = _ss_of_means(m_r, a * b, gm)
    ss_a = _ss_of_means(m_a, r * b, gm)
    ss_ra = _ss_of_means(m_ra, b, gm) - ss_r - ss_a  # error (a)
    ss_b = _ss_of_means(m_b, r * a, gm)
    ss_ab = _ss_of_means(m_ab, r, gm) - ss_a - ss_b
    ss_tot = sum((o["value"] - gm) ** 2 for o in obs)
    ss_eb = max(0.0, ss_tot - ss_r - ss_a - ss_ra - ss_b - ss_ab)
    df_r, df_a, df_ea = r - 1, a - 1, (r - 1) * (a - 1)
    df_b, df_ab, df_eb = b - 1, (a - 1) * (b - 1), a * (r - 1) * (b - 1)
    ms_ea, ms_eb = ss_ra / df_ea, ss_eb / df_eb
    residuals = [
        o["value"]
        - m_ra[(o["block"], o["treatment"])]
        - m_ab[(o["treatment"], o["subTreatment"])]
        + m_a[o["treatment"]]
        for o in obs
    ]
    a_row = _row("Main plot (A)", df_a, ss_a, ms_ea, df_ea, "Error (a)")
    b_row = _row("Sub-plot (B)", df_b, ss_b, ms_eb, df_eb, "Error (b)")
    ab_row = _row("A × B", df_ab, ss_ab, ms_eb, df_eb, "Error (b)")
    cells = _group(obs, lambda o: (o["treatment"], o["subTreatment"]))
    return AnovaResult(
        "Split_Plot",
        len(obs),
        gm,
        [
            _row("Block", df_r, ss_r, ms_ea, df_ea, "Error (a)"),
            a_row,
            AnovaRow("Error (a)", df_ea, ss_ra, ms_ea),
            b_row,
            ab_row,
            AnovaRow("Error (b)", df_eb, ss_eb, ms_eb),
            AnovaRow("Total", len(obs) - 1, ss_tot),
        ],
        [
            _tukey("Main plot (A)", _values(A), ms_ea, df_ea, a_row.p if a_row.p is not None else 1.0, r * b),
            _tukey("Sub-plot (B)", _values(B), ms_eb, df_eb, b_row.p if b_row.p is not None else 1.0, r * a),
        ],
        [("CV (a)", math.sqrt(ms_ea) / gm * 100), ("CV (b)", math.sqrt(ms_eb) / gm * 100)],
        residuals,
        groups=[[o["value"] for o in g] for g in cells.values()],
    )


# ---------------------------------------------------------------------------
# assumption tests
# ---------------------------------------------------------------------------


def shapiro_wilk(values: Sequence[float]) -> TestResult | None:
    """Shapiro–Wilk W test for normality (Royston 1995, via SciPy). Valid for 3 ≤ n ≤ 5000."""
    x = np.asarray([v for v in values if math.isfinite(v)], dtype=float)
    if len(x) < 3 or len(x) > 5000:
        return None
    if np.ptp(x) <= 1e-9 * max(1.0, float(np.abs(x).max())):  # all values (practically) equal
        return None
    res = stats.shapiro(x)
    return TestResult(float(res.statistic), float(res.pvalue))


def brown_forsythe(groups: Sequence[Sequence[float]]) -> TestResult | None:
    """Brown–Forsythe test (Levene with median centring) for equal group variances."""
    gs = [list(g) for g in groups if len(g) > 0]
    n = sum(len(g) for g in gs)
    if len(gs) < 2 or n - len(gs) < 1:
        return None
    dev = [abs(v - float(np.median(g))) for g in gs for v in g]
    if all(d == 0 for d in dev):
        return None
    with np.errstate(all="ignore"):
        res = stats.levene(*gs, center="median")
    if not math.isfinite(res.statistic):
        return None
    return TestResult(float(res.statistic), float(res.pvalue))


def analyse(design: str, observations: Sequence[Observation]) -> AnovaResult:
    """Run the analysis appropriate to the design. Raises AnalysisError with a readable message."""
    obs = [o for o in observations if isinstance(o.get("value"), (int, float)) and math.isfinite(o["value"])]
    if len(obs) < 3:
        raise AnalysisError("Enter values for more plots before analysing.")
    fn = {"CRD": _crd, "RCBD": _rcbd, "Latin_Square": _latin, "Split_Plot": _split_plot}.get(design)
    if fn is None:
        raise AnalysisError(f"Unknown design: {design}")
    result = fn(obs)
    result.normality = shapiro_wilk(result.residuals)
    result.equal_variance = brown_forsythe(result.groups) if all(len(g) >= 2 for g in result.groups) else None
    return result
