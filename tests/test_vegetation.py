"""Vegetation survey statistics against hand-worked values and a simulation of a known forest."""

import math

import numpy as np
import pytest
from scipy import stats

from agroclimatic.science import sampling as smp
from agroclimatic.science.vegetation import (
    SurveyError,
    analyse_pcq,
    analyse_quadrats,
    chao2,
    diversity,
    line_intercept,
    point_intercept,
    rarefaction,
    required_sample_size,
    species_area,
    stratified_mean,
)

# Four 1 × 1 m quadrats. Counts: A = 2, 0, 3, 1; B = 0, 1, 0, 0; C = 4, 4, 0, 0.
UNITS = [{"id": f"Q{i}", "kind": "quadrat", "x": 0, "y": 0, "w": 1.0, "h": 1.0} for i in range(1, 5)]
ROWS = [
    {"unit": "Q1", "species": "A", "count": 2},
    {"unit": "Q3", "species": "A", "count": 3},
    {"unit": "Q4", "species": "A", "count": 1},
    {"unit": "Q2", "species": "B", "count": 1},
    {"unit": "Q1", "species": "C", "count": 4},
    {"unit": "Q2", "species": "C", "count": 4},
]


def by_species(result):
    return {s.species: s for s in result.species}


def test_quadrat_phytosociology_hand_worked():
    r = analyse_quadrats(UNITS, ROWS)
    a, b, c = (by_species(r)[k] for k in "ABC")
    # density = N / (k · quadrat area); 6 plants in 4 m² = 15 000 ha⁻¹
    assert a.density_ha == pytest.approx(15_000) and b.density_ha == pytest.approx(2_500)
    assert c.density_ha == pytest.approx(20_000)
    assert (a.frequency_pct, b.frequency_pct, c.frequency_pct) == (75, 25, 50)
    assert (a.abundance, b.abundance, c.abundance) == (2, 1, 4)
    # A/F (Whitford 1949): 2/75 = 0.0267 random, 1/25 = 0.04 random, 4/50 = 0.08 contiguous
    assert a.af_ratio == pytest.approx(2 / 75) and a.distribution == "random"
    assert c.distribution == "contiguous"
    # RD of 15 plants; RF of Σ frequency 150
    assert a.rel_density == pytest.approx(40) and c.rel_density == pytest.approx(800 / 15)
    assert a.rel_frequency == pytest.approx(50) and b.rel_frequency == pytest.approx(100 / 6)
    assert a.ivi == pytest.approx(90) and sum(s.ivi for s in r.species) == pytest.approx(200)
    assert "of 200" in r.ivi_basis
    # variance-to-mean ratio of A: mean 1.5, variance 5/3
    assert a.dispersion_index == pytest.approx((5 / 3) / 1.5)
    # quadrat totals 6, 5, 3, 1 plants m⁻² → mean 37 500 ha⁻¹
    assert r.total_density.mean == pytest.approx(37_500)
    # E[S(m)] = Σ 1 − C(4 − h, m)/C(4, m) with h = 3, 1, 2 → m = 3: 1 + 0.75 + 1
    assert r.accumulation == pytest.approx([1.5, 7 / 3, 2.75, 3])
    assert r.chao2 == pytest.approx(3)


def test_ivi_uses_basal_area_when_given_for_every_species():
    rows = [dict(r, basal_area_cm2=v) for r, v in zip(ROWS, [10, 20, 10, 5, 25, 30], strict=True)]
    r = analyse_quadrats(UNITS, rows)
    a = by_species(r)["A"]
    # A has 40 of 100 cm² basal area in 4 m² → 0.004 m² / 4 m² = 10 m² ha⁻¹
    assert a.basal_area_m2_ha == pytest.approx(10) and a.rel_dominance == pytest.approx(40)
    assert a.ivi == pytest.approx(40 + 50 + 40)
    assert sum(s.ivi for s in r.species) == pytest.approx(300)


def test_quadrat_input_checks():
    with pytest.raises(SurveyError, match="not in the layout"):
        analyse_quadrats(UNITS, [{"unit": "Q9", "species": "A", "count": 1}])
    with pytest.raises(SurveyError, match="at least one"):
        analyse_quadrats(UNITS, [])


def test_diversity_indices_match_definitions():
    d = diversity([6, 1, 8])
    p = np.array([6, 1, 8]) / 15
    assert d.shannon == pytest.approx(stats.entropy(p))  # natural log
    assert d.simpson == pytest.approx(1 - (6 * 5 + 8 * 7) / (15 * 14))
    assert d.pielou == pytest.approx(stats.entropy(p) / math.log(3))
    assert d.margalef == pytest.approx(2 / math.log(15))
    cover = diversity([12.5, 30.0])  # non-integer abundances: Simpson from Σp²
    assert cover.simpson == pytest.approx(1 - ((12.5 / 42.5) ** 2 + (30 / 42.5) ** 2)) and cover.margalef is None


def test_rarefaction_matches_brute_force_average_over_subsets():
    from itertools import combinations

    inc = [{"a", "b"}, {"b"}, {"c"}, {"a", "d"}, set()]
    exact = rarefaction(inc)
    for m in range(1, 6):
        subsets = list(combinations(inc, m))
        brute = sum(len(set().union(*s)) for s in subsets) / len(subsets)
        assert exact[m - 1] == pytest.approx(brute)
    # Q1 = c, d (2 singletons), Q2 = a, b → 4 + (4/5)·2·1/(2·3)
    assert chao2(inc) == pytest.approx(4 + 0.8 * 2 / 6)


def test_required_sample_size_is_the_smallest_adequate_n():
    pilot = [10.0, 14.0, 6.0, 12.0, 8.0]
    n = required_sample_size(pilot, 0.10)
    m, s = np.mean(pilot), np.std(pilot, ddof=1)

    def half_width(k):
        return stats.t.ppf(0.975, k - 1) * s / math.sqrt(k)

    assert half_width(n) <= 0.10 * m < half_width(n - 1)


def test_stratified_mean():
    mean, se = stratified_mean({1: [2.0, 4.0], 2: [10.0, 14.0]}, {1: 1.0, 2: 3.0})
    assert mean == pytest.approx(0.25 * 3 + 0.75 * 12)
    assert se == pytest.approx(math.sqrt(0.25**2 * 2 / 2 + 0.75**2 * 8 / 2))


def test_species_area_is_cumulative_within_each_location():
    units = smp.nested_quadrats(50, 50, [1, 1.41, 2], 2, seed=3)
    rows = [
        {"unit": "L1-S1", "species": "A"},
        {"unit": "L1-S2", "species": "B"},
        {"unit": "L1-S3", "species": "A"},
        {"unit": "L1-S3", "species": "C"},
        {"unit": "L2-S1", "species": "A"},
        {"unit": "L2-S1", "species": "B"},
        {"unit": "L2-S3", "species": "D"},
    ]
    curve = species_area(units, rows)
    assert [a for a, _, _ in curve] == [1, 2, 4]  # nominal areas, not 1.41² = 1.99
    assert [m for _, m, _ in curve] == [1.5, 2, 3]


# ---------------------------------------------------------------------------
# Point-centred quarter
# ---------------------------------------------------------------------------


def pcq_rows(distances, species=None, dbh=None):
    rows = []
    for i, d in enumerate(distances):
        rows.append(
            {
                "unit": f"P{i // 4 + 1}",
                "quarter": i % 4 + 1,
                "distance_m": d,
                "species": species[i] if species else "X",
                "dbh_cm": dbh[i] if dbh else None,
            }
        )
    return rows


def test_pcq_density_hand_worked():
    r = analyse_pcq(pcq_rows([2.0] * 8))
    # Pollard: 4(4n − 1)/(π Σr²) = 28 / (32π) m⁻²; Cottam & Curtis: 1 / r̄² = 0.25 m⁻²
    assert r.density_ha == pytest.approx(28 / (32 * math.pi) * 1e4)
    assert r.cottam_curtis_ha == pytest.approx(2500)
    assert r.density_low_ha < r.density_ha < r.density_high_ha


def test_pcq_species_values():
    sp = ["A", "A", "B", "A", "B", "B", "A", "A"]
    dbh = [20, 20, 10, 20, 10, 10, 20, 20]
    r = analyse_pcq(pcq_rows([2.0] * 8, sp, dbh))
    a = next(s for s in r.species if s.species == "A")
    assert a.rel_density == pytest.approx(62.5) and a.density_ha == pytest.approx(0.625 * r.density_ha)
    assert a.frequency_pct == 100 and a.rel_frequency == pytest.approx(50)
    # mean BA of A = π·0.1² m²; of B = π·0.05²; dominance = mean BA × species density
    dom_a, dom_b = math.pi * 0.01 * 0.625, math.pi * 0.0025 * 0.375
    assert a.rel_dominance == pytest.approx(dom_a / (dom_a + dom_b) * 100)
    assert sum(s.ivi for s in r.species) == pytest.approx(300)


def test_pcq_requires_all_four_quarters():
    rows = pcq_rows([2.0] * 8)[:-1]
    with pytest.raises(SurveyError, match="all four quarters"):
        analyse_pcq(rows)


def test_pcq_is_unbiased_with_correct_coverage_on_a_simulated_random_forest():
    """Poisson forest of 500 trees ha⁻¹: Pollard's estimator should average 500 and its 95 % CI cover ≈ 95 %."""
    rng = np.random.default_rng(2026)
    true_ha, side, n_points, reps = 500.0, 300.0, 10, 400
    lam = true_ha / 1e4
    estimates, covered = [], 0
    for _ in range(reps):
        k = rng.poisson(lam * side * side)
        trees = rng.uniform(0, side, (k, 2))
        points = rng.uniform(100, 200, (n_points, 2))  # far from the edges
        rows = []
        for i, (px, py) in enumerate(points):
            dx, dy = trees[:, 0] - px, trees[:, 1] - py
            dist = np.hypot(dx, dy)
            for q, mask in enumerate(
                [(dx >= 0) & (dy >= 0), (dx < 0) & (dy >= 0), (dx < 0) & (dy < 0), (dx >= 0) & (dy < 0)]
            ):
                rows.append({"unit": f"P{i}", "quarter": q + 1, "species": "X", "distance_m": float(dist[mask].min())})
        r = analyse_pcq(rows)
        estimates.append(r.density_ha)
        covered += r.density_low_ha <= true_ha <= r.density_high_ha
    assert np.mean(estimates) == pytest.approx(true_ha, rel=0.03)
    assert 0.92 <= covered / reps <= 0.98


# ---------------------------------------------------------------------------
# Cover
# ---------------------------------------------------------------------------


def test_line_intercept_cover():
    lines = smp.transect_points(20, 10, 2, 5, seed=1, kind="line")
    rows = [
        {"unit": "T1", "species": "A", "intercept_m": 1.5},
        {"unit": "T1", "species": "A", "intercept_m": 0.5},
        {"unit": "T2", "species": "A", "intercept_m": 1.0},
        {"unit": "T2", "species": "B", "intercept_m": 3.0},
    ]
    cover = {c.species: c for c in line_intercept(lines, rows)}
    assert cover["A"].cover_pct == pytest.approx(15) and cover["A"].se == pytest.approx(5)
    assert cover["B"].cover_pct == pytest.approx(15) and cover["B"].transects_present == 1
    with pytest.raises(SurveyError, match="more than the line length"):
        line_intercept(lines, [{"unit": "T1", "species": "A", "intercept_m": 11}])


def test_point_intercept_cover():
    lines = smp.transect_points(20, 10, 2, 5, seed=1, kind="line")
    rows = [{"unit": "T1", "species": "A", "hits": 30}, {"unit": "T2", "species": "A", "hits": 10}]
    (a,) = point_intercept(lines, rows, 50)
    assert a.cover_pct == pytest.approx(40) and a.se == pytest.approx(20)
    with pytest.raises(SurveyError, match="more hits"):
        point_intercept(lines, [{"unit": "T1", "species": "A", "hits": 51}], 50)


# ---------------------------------------------------------------------------
# Layouts
# ---------------------------------------------------------------------------


def inside(u, w, length):
    return 0 <= u["x"] and u["x"] + u["w"] <= w + 1e-6 and 0 <= u["y"] and u["y"] + u["h"] <= length + 1e-6


def test_random_quadrats_are_reproducible_inside_and_non_overlapping():
    a = smp.random_quadrats(100, 50, 5, 30, seed=11)
    assert a == smp.random_quadrats(100, 50, 5, 30, seed=11) != smp.random_quadrats(100, 50, 5, 30, seed=12)
    assert len(a) == 30 and all(inside(u, 100, 50) for u in a)
    for i, u in enumerate(a):
        for v in a[i + 1 :]:
            assert abs(u["x"] - v["x"]) >= 5 - 0.011 or abs(u["y"] - v["y"]) >= 5 - 0.011
    with pytest.raises(smp.LayoutError, match="more than half"):
        smp.random_quadrats(10, 10, 5, 3, seed=1)


def test_systematic_grid():
    q = smp.systematic_quadrats(100, 60, 10, 20, seed=5)
    xs, ys = sorted({u["x"] for u in q}), sorted({u["y"] for u in q})
    assert all(round(b - a, 2) == 20 for a, b in zip(xs, xs[1:], strict=False))
    assert len(q) == len(xs) * len(ys) and all(inside(u, 100, 60) for u in q)


def test_stratified_quadrats_fill_every_band():
    q = smp.stratified_quadrats(50, 90, 2, 3, 4, seed=8)
    for s in (1, 2, 3):
        band = [u for u in q if u["stratum"] == s]
        assert len(band) == 4 and all((s - 1) * 30 <= u["y"] and u["y"] + 2 <= s * 30 + 1e-6 for u in band)


def test_belt_transects_and_points():
    belts = smp.belt_transects(40, 20, 2, 4, seed=2)
    assert len(belts) == 4 * 10 and all(inside(u, 40, 20) for u in belts)
    pts = smp.transect_points(40, 100, 2, 20, seed=2)
    assert {u["transect"] for u in pts} == {1, 2} and all(u["y"] <= 100 for u in pts)
    assert smp.doubling_sizes(1, 3) == [1, 1.41, 2]


def test_build_layout_reproduces_every_method_from_its_settings():
    settings = {
        "random_quadrats": {"size": 5, "n": 10},
        "systematic_quadrats": {"size": 5, "spacing": 20},
        "stratified_quadrats": {"size": 5, "strata": 3, "per_stratum": 4},
        "belt_transect": {"size": 5, "transects": 3},
        "nested_quadrats": {"smallest": 1, "count": 6, "locations": 3},
        "pcq": {"transects": 2, "interval": 25},
        "line_intercept": {"transects": 4},
        "point_intercept": {"transects": 4, "points": 50},
    }
    assert set(settings) == set(smp.METHODS)
    for method, p in settings.items():
        a = smp.build_layout(method, 100, 120, p, seed=42)
        assert a and a == smp.build_layout(method, 100, 120, p, seed=42)
        assert all(0 <= u["x"] <= 100 and 0 <= u["y"] <= 120 for u in a)


# ---------------------------------------------------------------------------
# Regression tests for the issues found in the November 2026 review
# ---------------------------------------------------------------------------


def test_site_map_scales_linearly_with_the_number_of_quadrats():
    import time

    from agroclimatic.ui import charts

    units = smp.systematic_quadrats(1000, 1000, 1, 22, seed=1)  # 2,070 quadrats
    t = time.perf_counter()
    fig = charts.site_map(units, 1000, 1000)
    assert time.perf_counter() - t < 2  # was about 90 s for 1,000 quadrats with one shape each
    assert len(fig.layout.shapes) == 1  # only the site boundary; quadrats are one trace


def test_layouts_above_the_unit_limit_are_refused_with_advice():
    with pytest.raises(smp.LayoutError, match="limit is 2,000.*wider spacing"):
        smp.build_layout("systematic_quadrats", 1000, 1000, {"size": 1, "spacing": 5}, 1)


def test_layout_messages_name_the_real_problem():
    with pytest.raises(smp.LayoutError, match="largest quadrats .* at 2 locations"):
        smp.build_layout("nested_quadrats", 10, 10, {"smallest": 2, "count": 5, "locations": 2}, 1)
    with pytest.raises(smp.LayoutError, match="^Use at least one transect.$"):
        smp.build_layout("line_intercept", 100, 100, {"transects": 0}, 1)
    with pytest.raises(smp.LayoutError, match="distance between points"):
        smp.build_layout("pcq", 100, 100, {"transects": 2, "interval": 500}, 1)


def test_species_names_ignore_spacing_and_case_variants_are_reported():
    from agroclimatic.science.vegetation import case_variants

    rows = [
        {"unit": "Q1", "species": "Pinus roxburghii", "count": 3},
        {"unit": "Q2", "species": " Pinus  roxburghii ", "count": 2},
        {"unit": "Q3", "species": "pinus roxburghii", "count": 1},
    ]
    r = analyse_quadrats(UNITS, rows)
    assert sorted(s.species for s in r.species) == ["Pinus roxburghii", "pinus roxburghii"]
    assert by_species(r)["Pinus roxburghii"].individuals == 5
    assert case_variants(x["species"] for x in rows) == [["Pinus roxburghii", "pinus roxburghii"]]


def test_counts_must_be_whole_numbers():
    from agroclimatic.data.schema import RecordInvalid, validate

    survey = {
        "id": "s",
        "createdAt": "t",
        "updatedAt": "t",
        "name": "x",
        "method": "random_quadrats",
        "widthM": 10,
        "lengthM": 10,
        "seed": 1,
        "units": UNITS,
    }
    assert (
        validate("surveys", dict(survey, observations=[{"unit": "Q1", "species": "A", "count": 3.0}]))["observations"][
            0
        ]["count"]
        == 3
    )
    with pytest.raises(RecordInvalid, match="whole number"):
        validate("surveys", dict(survey, observations=[{"unit": "Q1", "species": "A", "count": 2.5}]))


def test_bar_chart_leaves_room_for_the_longest_value_label():
    from agroclimatic.ui import charts

    fig = charts.hbar(["a", "b"], [104.5, 40], "IVI")
    assert fig.layout.xaxis.range[1] >= 104.5 * 1.15
