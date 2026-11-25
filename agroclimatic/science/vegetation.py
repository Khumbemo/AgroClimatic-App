"""
Vegetation survey statistics.

- Quadrat phytosociology (Curtis & McIntosh 1950, 1951): density, frequency, abundance,
  relative values and Importance Value Index (IVI = relative density + relative frequency +
  relative dominance, out of 300).
- Dispersion: Whitford's (1949) abundance/frequency ratio and the variance-to-mean index of
  dispersion with its chi-square test.
- Point-centred quarter (Cottam & Curtis 1956): total density by the unbiased estimator of
  Pollard (1971), λ = 4(4n − 1) / (π Σr²), with an exact chi-square confidence interval, and
  per-species density, frequency, dominance and IVI as set out by Mitchell (2007).
- Cover: line intercept (Canfield 1941) and point intercept (Levy & Madden 1933).
- Diversity: Shannon H′ (natural log), Simpson 1 − D (unbiased D), Pielou J′, Margalef d.
- Richness: exact sample-based rarefaction (species accumulation) and the bias-corrected Chao2
  estimator (Chao 1987; Colwell & Coddington 1994).
- Sample size for a target relative precision of the mean (Krebs 1999).
"""

from __future__ import annotations

import math
from collections import defaultdict
from collections.abc import Iterable, Sequence
from dataclasses import dataclass

import numpy as np
from scipy import stats

M2_PER_HA = 10_000.0


class SurveyError(ValueError):
    """The data cannot be analysed as entered; the message says what is missing."""


def basal_area_m2(dbh_cm: float) -> float:
    """Stem basal area (m²) from diameter at breast height (cm): π (d/200)²."""
    return math.pi * (dbh_cm / 200.0) ** 2


# ---------------------------------------------------------------------------
# Diversity and richness
# ---------------------------------------------------------------------------


@dataclass
class Diversity:
    richness: int
    individuals: float
    shannon: float | None
    simpson: float | None
    pielou: float | None
    margalef: float | None


def diversity(abundances: Iterable[float]) -> Diversity:
    """
    Shannon H′ = −Σ pᵢ ln pᵢ; Simpson 1 − D with D = Σ nᵢ(nᵢ − 1) / (N(N − 1)) for counts
    (Σ pᵢ² when abundances are not whole numbers, e.g. cover); Pielou J′ = H′ / ln S;
    Margalef d = (S − 1) / ln N (counts only).
    """
    a = [float(x) for x in abundances if x and x > 0]
    s, n = len(a), sum(a)
    if s == 0:
        return Diversity(0, 0.0, None, None, None, None)
    p = [x / n for x in a]
    h = -sum(pi * math.log(pi) for pi in p)
    counts = all(abs(x - round(x)) < 1e-9 for x in a)
    if counts and n > 1:
        d = sum(x * (x - 1) for x in a) / (n * (n - 1))
    else:
        d = sum(pi * pi for pi in p)
    return Diversity(
        richness=s,
        individuals=n,
        shannon=h,
        simpson=1 - d,
        pielou=h / math.log(s) if s > 1 else None,
        margalef=(s - 1) / math.log(n) if counts and n > 1 else None,
    )


def rarefaction(incidence: Sequence[set[str]]) -> list[float]:
    """
    Exact expected species richness for 1..H sampling units (sample-based rarefaction):
    E[S(m)] = Σₖ [1 − C(H − hₖ, m) / C(H, m)], hₖ = units containing species k.
    """
    h_total = len(incidence)
    occ: dict[str, int] = defaultdict(int)
    for unit in incidence:
        for sp in unit:
            occ[sp] += 1
    out = []
    for m in range(1, h_total + 1):
        denom = math.comb(h_total, m)
        out.append(sum(1 - math.comb(h_total - hk, m) / denom for hk in occ.values()))
    return out


def chao2(incidence: Sequence[set[str]]) -> float | None:
    """Bias-corrected Chao2: S_obs + ((H − 1)/H) · Q1(Q1 − 1) / (2(Q2 + 1))."""
    h_total = len(incidence)
    if h_total < 2:
        return None
    occ: dict[str, int] = defaultdict(int)
    for unit in incidence:
        for sp in unit:
            occ[sp] += 1
    q1 = sum(1 for v in occ.values() if v == 1)
    q2 = sum(1 for v in occ.values() if v == 2)
    return len(occ) + ((h_total - 1) / h_total) * q1 * (q1 - 1) / (2 * (q2 + 1))


# ---------------------------------------------------------------------------
# Means and sample size
# ---------------------------------------------------------------------------


@dataclass
class MeanCI:
    n: int
    mean: float
    sd: float
    se: float
    low: float
    high: float


def mean_ci(values: Sequence[float], level: float = 0.95) -> MeanCI | None:
    """Mean with a t-based confidence interval."""
    n = len(values)
    if n < 2:
        return None
    m = sum(values) / n
    sd = math.sqrt(sum((v - m) ** 2 for v in values) / (n - 1))
    se = sd / math.sqrt(n)
    t = stats.t.ppf(0.5 + level / 2, n - 1)
    return MeanCI(n, m, sd, se, m - t * se, m + t * se)


def required_sample_size(
    values: Sequence[float], rel_error: float, level: float = 0.95, cap: int = 10_000
) -> int | None:
    """
    Smallest number of units n for which the confidence-interval half-width t(n−1)·s/√n is at most
    `rel_error` × mean, using the pilot data's coefficient of variation (Krebs 1999).
    """
    ci = mean_ci(values, level)
    if ci is None or ci.mean <= 0:
        return None
    cv = ci.sd / ci.mean
    n = np.arange(2, cap + 1)
    ok = np.nonzero(stats.t.ppf(0.5 + level / 2, n - 1) * cv / np.sqrt(n) <= rel_error)[0]
    return int(n[ok[0]]) if len(ok) else None


def stratified_mean(strata: dict[int, Sequence[float]], weights: dict[int, float]) -> tuple[float, float] | None:
    """Stratified mean Σ W_h ȳ_h and its SE √(Σ W_h² s_h² / n_h) (Cochran 1977; no finite-population correction)."""
    total_w = sum(weights[h] for h in strata)
    if any(len(v) < 2 for v in strata.values()) or total_w <= 0:
        return None
    mean = se2 = 0.0
    for h, vals in strata.items():
        w = weights[h] / total_w
        ybar = sum(vals) / len(vals)
        s2 = sum((v - ybar) ** 2 for v in vals) / (len(vals) - 1)
        mean += w * ybar
        se2 += w * w * s2 / len(vals)
    return mean, math.sqrt(se2)


# ---------------------------------------------------------------------------
# Quadrat surveys
# ---------------------------------------------------------------------------


@dataclass
class SpeciesRow:
    species: str
    individuals: float
    quadrats_present: int
    density_ha: float
    frequency_pct: float
    abundance: float
    af_ratio: float
    distribution: str
    dispersion_index: float | None
    dispersion_pattern: str | None
    basal_area_m2_ha: float | None
    rel_density: float
    rel_frequency: float
    rel_dominance: float | None
    ivi: float


@dataclass
class QuadratResult:
    quadrats: int
    area_m2: float
    species: list[SpeciesRow]
    total_density: MeanCI | None
    diversity: Diversity
    accumulation: list[float]
    chao2: float | None
    n_for_10pct: int | None
    n_for_20pct: int | None
    ivi_basis: str
    stratified_density: tuple[float, float] | None = None


def whitford_pattern(af: float) -> str:
    """Whitford (1949): A/F < 0.025 regular, 0.025–0.05 random, > 0.05 contiguous (clumped)."""
    return "regular" if af < 0.025 else "random" if af <= 0.05 else "contiguous"


def dispersion(counts: Sequence[float]) -> tuple[float, str] | None:
    """
    Variance-to-mean ratio I = s²/x̄ with the test (n − 1)·I ~ χ²(n − 1): significantly below 1
    is regular, above 1 is clumped (two-sided α = 0.05).
    """
    n = len(counts)
    if n < 2:
        return None
    m = sum(counts) / n
    if m <= 0:
        return None
    var = sum((c - m) ** 2 for c in counts) / (n - 1)
    idx = var / m
    cdf = stats.chi2.cdf((n - 1) * idx, n - 1)
    return idx, "regular" if cdf < 0.025 else "clumped" if cdf > 0.975 else "random"


def analyse_quadrats(units: Sequence[dict], rows: Sequence[dict]) -> QuadratResult:
    """
    `units`: the survey's quadrats (with w, h in metres and optional stratum);
    `rows`: {"unit", "species", "count", optional "basal_area_cm2" (total per species in the quadrat)}.
    Quadrats with no row for a species count as zero; empty quadrats count in every mean.
    """
    quads = {u["id"]: u for u in units if u.get("kind") == "quadrat"}
    if not quads:
        raise SurveyError("This survey has no quadrats.")
    unknown = sorted({r["unit"] for r in rows} - quads.keys())
    if unknown:
        raise SurveyError(f"Rows refer to quadrats that are not in the layout: {', '.join(unknown[:5])}.")
    k = len(quads)
    area = sum(u["w"] * u["h"] for u in quads.values())
    counts: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    ba: dict[str, float] = defaultdict(float)
    ba_given: dict[str, bool] = defaultdict(bool)
    for r in rows:
        sp = str(r.get("species") or "").strip()
        c = float(r.get("count") or 0)
        if not sp or c < 0:
            continue
        counts[sp][r["unit"]] += c
        if r.get("basal_area_cm2") not in (None, ""):
            ba[sp] += float(r["basal_area_cm2"]) / 1e4
            ba_given[sp] = True
    species = [sp for sp in counts if sum(counts[sp].values()) > 0]
    if not species:
        raise SurveyError("Enter at least one species count.")
    use_ba = all(ba_given[sp] for sp in species) and sum(ba.values()) > 0
    tot_n = sum(sum(counts[sp].values()) for sp in species)
    freq = {sp: sum(1 for v in counts[sp].values() if v > 0) / k * 100 for sp in species}
    tot_f = sum(freq.values())
    tot_ba = sum(ba[sp] for sp in species) if use_ba else 0.0
    out = []
    for sp in species:
        n_sp = sum(counts[sp].values())
        present = sum(1 for v in counts[sp].values() if v > 0)
        abundance = n_sp / present
        af = abundance / freq[sp]
        disp = dispersion([counts[sp].get(q, 0.0) for q in quads])
        rd, rf = n_sp / tot_n * 100, freq[sp] / tot_f * 100
        rdo = ba[sp] / tot_ba * 100 if use_ba else None
        out.append(
            SpeciesRow(
                species=sp,
                individuals=n_sp,
                quadrats_present=present,
                density_ha=n_sp / area * M2_PER_HA,
                frequency_pct=freq[sp],
                abundance=abundance,
                af_ratio=af,
                distribution=whitford_pattern(af),
                dispersion_index=disp[0] if disp else None,
                dispersion_pattern=disp[1] if disp else None,
                basal_area_m2_ha=ba[sp] / area * M2_PER_HA if use_ba else None,
                rel_density=rd,
                rel_frequency=rf,
                rel_dominance=rdo,
                ivi=rd + rf + (rdo or 0.0),
            )
        )
    out.sort(key=lambda r: -r.ivi)
    per_unit_ha = [
        sum(counts[sp].get(q, 0.0) for sp in species) / (u["w"] * u["h"]) * M2_PER_HA for q, u in quads.items()
    ]
    incidence = [{sp for sp in species if counts[sp].get(q, 0) > 0} for q in quads]
    strat = None
    if all("stratum" in u for u in quads.values()):
        groups: dict[int, list[float]] = defaultdict(list)
        for u, d in zip(quads.values(), per_unit_ha, strict=True):
            groups[u["stratum"]].append(d)
        strat = stratified_mean(groups, {h: 1.0 for h in groups})  # equal-area bands
    return QuadratResult(
        quadrats=k,
        area_m2=area,
        species=out,
        total_density=mean_ci(per_unit_ha),
        diversity=diversity(sum(counts[sp].values()) for sp in species),
        accumulation=rarefaction(incidence),
        chao2=chao2(incidence),
        n_for_10pct=required_sample_size(per_unit_ha, 0.10),
        n_for_20pct=required_sample_size(per_unit_ha, 0.20),
        ivi_basis="RD + RF + RDo (of 300)" if use_ba else "RD + RF (of 200; add basal area for dominance)",
        stratified_density=strat,
    )


# ---------------------------------------------------------------------------
# Nested quadrats (species–area)
# ---------------------------------------------------------------------------


def species_area(units: Sequence[dict], rows: Sequence[dict]) -> list[tuple[float, float, float]]:
    """
    Mean cumulative species count at each nested quadrat size: [(area m², mean S, SD of S)].
    A species recorded in a smaller quadrat is also present in every larger one at that location.
    """
    by_loc: dict[int, list[dict]] = defaultdict(list)
    for u in units:
        by_loc[u["location"]].append(u)
    seen: dict[str, set[str]] = defaultdict(set)
    for r in rows:
        if str(r.get("species") or "").strip():
            seen[r["unit"]].add(str(r["species"]).strip())
    if not seen:
        raise SurveyError("Record the species found in each quadrat size.")
    curves: list[list[int]] = []
    areas: list[float] = []
    for _, us in sorted(by_loc.items()):
        us = sorted(us, key=lambda u: u["size"])
        areas = [u["w"] * u["h"] for u in us]
        acc: set[str] = set()
        curve = []
        for u in us:
            acc |= seen.get(u["id"], set())
            curve.append(len(acc))
        curves.append(curve)
    out = []
    for i, a in enumerate(areas):
        vals = [c[i] for c in curves]
        m = sum(vals) / len(vals)
        sd = math.sqrt(sum((v - m) ** 2 for v in vals) / (len(vals) - 1)) if len(vals) > 1 else 0.0
        out.append((a, m, sd))
    return out


# ---------------------------------------------------------------------------
# Point-centred quarter
# ---------------------------------------------------------------------------


@dataclass
class PcqSpecies:
    species: str
    trees: int
    rel_density: float
    density_ha: float
    frequency_pct: float
    rel_frequency: float
    basal_area_m2_ha: float | None
    rel_dominance: float | None
    ivi: float


@dataclass
class PcqResult:
    points: int
    mean_distance_m: float
    density_ha: float
    density_low_ha: float
    density_high_ha: float
    cottam_curtis_ha: float
    species: list[PcqSpecies]
    diversity: Diversity
    accumulation: list[float]
    chao2: float | None
    ivi_basis: str


def analyse_pcq(rows: Sequence[dict], level: float = 0.95) -> PcqResult:
    """
    `rows`: {"unit" (sampling point), "quarter" 1–4, "species", "distance_m", optional "dbh_cm"}:
    the nearest tree in each of the four quarters around every point.
    """
    pts: dict[str, dict[int, dict]] = defaultdict(dict)
    for r in rows:
        if r.get("distance_m") in (None, "") or not str(r.get("species") or "").strip():
            continue
        q = int(r["quarter"])
        if q not in (1, 2, 3, 4):
            raise SurveyError("Quarters are numbered 1 to 4.")
        if float(r["distance_m"]) <= 0:
            raise SurveyError("Distances must be greater than zero.")
        pts[r["unit"]][q] = r
    if len(pts) < 2:
        raise SurveyError("Record the four quarters at two or more points.")
    incomplete = sorted(p for p, qs in pts.items() if len(qs) != 4)
    if incomplete:
        raise SurveyError(
            "Every point needs a tree in all four quarters (vacant quarters need a correction this "
            f"tool does not apply): {', '.join(incomplete[:5])}."
        )
    n = len(pts)
    trees = [r for qs in pts.values() for r in qs.values()]
    d = [float(r["distance_m"]) for r in trees]
    sum_r2 = sum(x * x for x in d)
    lam = 4 * (4 * n - 1) / (math.pi * sum_r2)  # Pollard (1971), trees per m²
    # π λ Σr² / 4 ~ Gamma(4n) for a random (Poisson) pattern, so 2× that is χ²(8n).
    lo = 2 * stats.chi2.ppf((1 - level) / 2, 8 * n) / (math.pi * sum_r2)
    hi = 2 * stats.chi2.ppf(1 - (1 - level) / 2, 8 * n) / (math.pi * sum_r2)
    r_bar = sum(d) / len(d)
    by_sp: dict[str, list[dict]] = defaultdict(list)
    for r in trees:
        by_sp[str(r["species"]).strip()].append(r)
    use_ba = all(r.get("dbh_cm") not in (None, "") and float(r["dbh_cm"]) > 0 for r in trees)
    freq = {
        sp: sum(1 for qs in pts.values() if any(str(t["species"]).strip() == sp for t in qs.values())) / n * 100
        for sp in by_sp
    }
    tot_f = sum(freq.values())
    dens = {sp: len(ts) / len(trees) * lam * M2_PER_HA for sp, ts in by_sp.items()}
    dom = (
        {sp: sum(basal_area_m2(float(t["dbh_cm"])) for t in ts) / len(ts) * dens[sp] for sp, ts in by_sp.items()}
        if use_ba
        else {}
    )
    tot_dom = sum(dom.values())
    out = []
    for sp, ts in by_sp.items():
        rd = len(ts) / len(trees) * 100
        rf = freq[sp] / tot_f * 100
        rdo = dom[sp] / tot_dom * 100 if use_ba else None
        out.append(PcqSpecies(sp, len(ts), rd, dens[sp], freq[sp], rf, dom.get(sp), rdo, rd + rf + (rdo or 0.0)))
    out.sort(key=lambda s: -s.ivi)
    incidence = [{str(t["species"]).strip() for t in qs.values()} for qs in pts.values()]
    return PcqResult(
        points=n,
        mean_distance_m=r_bar,
        density_ha=lam * M2_PER_HA,
        density_low_ha=lo * M2_PER_HA,
        density_high_ha=hi * M2_PER_HA,
        cottam_curtis_ha=M2_PER_HA / r_bar**2,
        species=out,
        diversity=diversity(len(ts) for ts in by_sp.values()),
        accumulation=rarefaction(incidence),
        chao2=chao2(incidence),
        ivi_basis="RD + RF + RDo (of 300)" if use_ba else "RD + RF (of 200; add DBH for dominance)",
    )


# ---------------------------------------------------------------------------
# Line and point intercept
# ---------------------------------------------------------------------------


@dataclass
class CoverRow:
    species: str
    cover_pct: float
    se: float | None
    transects_present: int


def line_intercept(lines: Sequence[dict], rows: Sequence[dict]) -> list[CoverRow]:
    """
    Canfield (1941): cover = Σ intercept length / line length × 100 on each line; the result is the
    mean over lines with its SE. `rows`: {"unit" (line), "species", "intercept_m"}.
    """
    length = {u["id"]: float(u["h"]) for u in lines}
    per: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for r in rows:
        sp = str(r.get("species") or "").strip()
        if not sp or r.get("intercept_m") in (None, ""):
            continue
        if r["unit"] not in length:
            raise SurveyError(f"Unknown line {r['unit']}.")
        if float(r["intercept_m"]) < 0:
            raise SurveyError("Intercept lengths cannot be negative.")
        per[sp][r["unit"]] += float(r["intercept_m"])
    for sp, by_line in per.items():
        for line, total in by_line.items():
            if total > length[line] + 1e-9:
                raise SurveyError(f"{sp} on {line}: intercepts add up to more than the line length.")
    return _cover(per, {line: (lambda v, L=L: v / L * 100) for line, L in length.items()})


def point_intercept(lines: Sequence[dict], rows: Sequence[dict], points_per_line: int) -> list[CoverRow]:
    """
    Levy & Madden (1933): cover = points touching the species / points on the line × 100, averaged
    over lines. `rows`: {"unit" (line), "species", "hits"}.
    """
    if points_per_line < 1:
        raise SurveyError("Give the number of points read on each line.")
    ids = {u["id"] for u in lines}
    per: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for r in rows:
        sp = str(r.get("species") or "").strip()
        if not sp or r.get("hits") in (None, ""):
            continue
        if r["unit"] not in ids:
            raise SurveyError(f"Unknown line {r['unit']}.")
        per[sp][r["unit"]] += float(r["hits"])
        if per[sp][r["unit"]] > points_per_line:
            raise SurveyError(f"{sp} on {r['unit']}: more hits than points read.")
    return _cover(per, {line: (lambda v: v / points_per_line * 100) for line in ids})


def _cover(per: dict[str, dict[str, float]], to_pct: dict) -> list[CoverRow]:
    if not per:
        raise SurveyError("Enter at least one species record.")
    lines = sorted(to_pct)
    out = []
    for sp, by_line in per.items():
        vals = [to_pct[line](by_line.get(line, 0.0)) for line in lines]
        m = sum(vals) / len(vals)
        se = (
            math.sqrt(sum((v - m) ** 2 for v in vals) / (len(vals) - 1)) / math.sqrt(len(vals))
            if len(vals) > 1
            else None
        )
        out.append(CoverRow(sp, m, se, sum(1 for v in vals if v > 0)))
    return sorted(out, key=lambda r: -r.cover_pct)
