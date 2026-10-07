"""Expected values from statsmodels OLS + anova_lm and SciPy (scripts/anova_reference.py)."""

import json
from pathlib import Path

import pytest

from agroclimatic.science.anova import AnalysisError, analyse, brown_forsythe, compact_letters, shapiro_wilk, tukey_p

HERE = Path(__file__).parent
REF = json.loads((HERE / "anova-reference.json").read_text())
SCIPY = json.loads((HERE / "scipy-reference.json").read_text())


def close(actual, expected, tol=1e-8):
    assert abs(actual - expected) < tol * max(1, abs(expected))


def pair_p(comparison, a, b):
    return next(p.p for p in comparison.pairs if {p.a, p.b} == {a, b})


def test_crd_unequal_replication_tukey_kramer():
    r = analyse("CRD", REF["crd"]["obs"])
    close(r.row("Treatment").ss, REF["crd"]["ss"][0])
    close(r.row("Residual").ss, REF["crd"]["ss"][1])
    assert r.row("Residual").df == REF["crd"]["df"][1]
    close(r.row("Treatment").f, REF["crd"]["f"])
    close(r.row("Treatment").p, REF["crd"]["p"], 1e-7)
    for a, b, p in REF["crd"]["tukey"]:
        close(pair_p(r.comparisons[0], a, b), p, 1e-6)


def test_rcbd():
    r = analyse("RCBD", REF["rcbd"]["obs"])
    for i, s in enumerate(["Block", "Treatment", "Residual"]):
        close(r.row(s).ss, REF["rcbd"]["ss"][i])
    close(r.row("Block").f, REF["rcbd"]["f"][0])
    close(r.row("Treatment").f, REF["rcbd"]["f"][1])
    close(r.row("Treatment").p, REF["rcbd"]["p"][1], 1e-7)
    for a, b, p in REF["rcbd"]["tukey"]:
        close(pair_p(r.comparisons[0], a, b), p, 1e-6)


def test_latin_square():
    r = analyse("Latin_Square", REF["latin"]["obs"])
    for i, s in enumerate(["Row", "Column", "Treatment", "Residual"]):
        close(r.row(s).ss, REF["latin"]["ss"][i])
    assert r.row("Residual").df == 6
    close(r.row("Treatment").p, REF["latin"]["p"], 1e-7)
    for a, b, p in REF["latin"]["tukey"]:
        close(pair_p(r.comparisons[0], a, b), p, 1e-6)


def test_split_plot_error_terms():
    r = analyse("Split_Plot", REF["split"]["obs"])
    for i, s in enumerate(["Block", "Main plot (A)", "Error (a)", "Sub-plot (B)", "A × B", "Error (b)"]):
        close(r.row(s).ss, REF["split"]["ss"][i])
    assert r.row("Error (a)").df == 4 and r.row("Error (b)").df == 18
    for i, s in enumerate(["Main plot (A)", "Sub-plot (B)", "A × B"]):
        close(r.row(s).f, REF["split"]["f"][i])
        close(r.row(s).p, REF["split"]["p"][i], 1e-7)
    assert r.row("Main plot (A)").error_term == "Error (a)"
    for a, b, p in REF["split"]["tukeyA"]:
        close(pair_p(r.comparisons[0], a, b), p, 1e-6)
    for a, b, p in REF["split"]["tukeyB"]:
        close(pair_p(r.comparisons[1], a, b), p, 1e-6)
    assert [c[0] for c in r.cv] == ["CV (a)", "CV (b)"]


def test_means_se_and_residual_checks():
    r = analyse("RCBD", REF["rcbd"]["obs"])
    mse = r.row("Residual").ms
    for m in r.comparisons[0].means:
        assert m.n == 4
        close(m.se, (mse / 4) ** 0.5)
    assert sum(r.residuals) == pytest.approx(0, abs=1e-9)
    assert r.normality.p > 0 and r.equal_variance.p > 0


def test_input_checks():
    with pytest.raises(AnalysisError):
        analyse("RCBD", REF["rcbd"]["obs"][1:])
    with pytest.raises(AnalysisError, match="every plot"):
        analyse("Latin_Square", REF["latin"]["obs"][2:])
    with pytest.raises(AnalysisError, match="every plot"):
        analyse("Split_Plot", REF["split"]["obs"][1:])
    with pytest.raises(AnalysisError, match="more plots"):
        analyse("CRD", [{"block": 1, "treatment": "A", "value": 1}, {"block": 1, "treatment": "B", "value": 2}])


def test_compact_letters():
    sig = {("a", "c"), ("a", "d"), ("b", "d")}
    letters = compact_letters(["a", "b", "c", "d"], lambda x, y: (x, y) in sig or (y, x) in sig)
    assert letters == {"a": "a", "b": "ab", "c": "bc", "d": "c"}
    assert list(compact_letters(["x", "y", "z"], lambda *_: False).values()) == ["a", "a", "a"]


def test_studentized_range_matches_r_ptukey_reference():
    for q, k, df, p in SCIPY["ptukey"]:
        close(1 - tukey_p(q, k, df), p, 1e-8)


def test_assumption_tests():
    for values, (w, p) in SCIPY["shapiro"].values():
        r = shapiro_wilk(values)
        close(r.statistic, w, 1e-8)
        close(r.p, p, 1e-7)
    assert shapiro_wilk([1, 1, 1, 1]) is None
    assert shapiro_wilk([1, 2]) is None
    groups, (f, p) = SCIPY["levene"]
    r = brown_forsythe(groups)
    close(r.statistic, f, 1e-10)
    close(r.p, p, 1e-10)
