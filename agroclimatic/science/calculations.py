"""
Scientific calculations used across the app. Every function is covered by
tests/test_calculations.py against hand-worked or published values.
"""

from __future__ import annotations

import math
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import date
from typing import TypedDict


class DailyCount(TypedDict):
    date: str
    count: int


# ---------------------------------------------------------------------------
# Germination (Ranal & Santana 2006 give the standard definitions)
# ---------------------------------------------------------------------------


def days_after_sowing(obs_date: str, sowing_date: str) -> int:
    """Whole days from sowing to an observation date (both YYYY-MM-DD)."""
    return (date.fromisoformat(obs_date) - date.fromisoformat(sowing_date)).days


def _day_index(obs_date: str, sowing_date: str) -> int:
    """Day index for rate formulas; a count on or before sowing is treated as day 1."""
    return max(1, days_after_sowing(obs_date, sowing_date))


def _total(counts: Iterable[DailyCount]) -> int:
    return sum(c["count"] for c in counts)


def germination_percent(counts: Sequence[DailyCount], seeds_sown: float) -> float | None:
    """Final germination percentage: Σnᵢ / N × 100."""
    return _total(counts) / seeds_sown * 100 if seeds_sown > 0 else None


def mean_germination_time(counts: Sequence[DailyCount], sowing_date: str) -> float | None:
    """Mean germination time (days): Σ(tᵢ·nᵢ) / Σnᵢ."""
    n = _total(counts)
    if n <= 0:
        return None
    return sum(_day_index(c["date"], sowing_date) * c["count"] for c in counts) / n


def germination_speed_index(counts: Sequence[DailyCount], sowing_date: str) -> float:
    """Germination speed index (Maguire 1962): Σ(nᵢ / tᵢ), seeds per day."""
    return sum(c["count"] / _day_index(c["date"], sowing_date) for c in counts)


def germination_energy(
    counts: Sequence[DailyCount], seeds_sown: float, sowing_date: str, by_day: int = 7
) -> float | None:
    """Percentage of seeds sown that germinated within `by_day` days after sowing."""
    if seeds_sown <= 0:
        return None
    early = [c for c in counts if days_after_sowing(c["date"], sowing_date) <= by_day]
    return _total(early) / seeds_sown * 100


def cumulative_germination(counts: Sequence[DailyCount], seeds_sown: float) -> list[float]:
    """Cumulative germination % after each count, in date order."""
    out, running = [], 0
    for c in sorted(counts, key=lambda c: c["date"]):
        running += c["count"]
        out.append(running / seeds_sown * 100 if seeds_sown > 0 else 0.0)
    return out


# ---------------------------------------------------------------------------
# Seedling quality and growth
# ---------------------------------------------------------------------------


def relative_growth_rate(w1: float, w2: float, days: float) -> float:
    """RGR: (ln W₂ − ln W₁) / Δt, per day. W can be dry mass or height."""
    if days == 0 or w1 <= 0 or w2 <= 0:
        return 0.0
    return (math.log(w2) - math.log(w1)) / days


def sturdiness_quotient(height_cm: float, rcd_mm: float) -> float | None:
    """Sturdiness quotient: height (cm) / root-collar diameter (mm)."""
    return height_cm / rcd_mm if rcd_mm > 0 else None


def dickson_quality_index(height_cm: float, rcd_mm: float, shoot_dry_g: float, root_dry_g: float) -> float | None:
    """Dickson, Leaf & Hosner (1960): total dry mass / (H/D + shoot dry / root dry)."""
    if rcd_mm <= 0 or root_dry_g <= 0 or shoot_dry_g <= 0:
        return None
    return (shoot_dry_g + root_dry_g) / (height_cm / rcd_mm + shoot_dry_g / root_dry_g)


# ---------------------------------------------------------------------------
# Climate
# ---------------------------------------------------------------------------


def saturation_vapour_pressure(temp_c: float) -> float:
    """Saturation vapour pressure (kPa), Tetens equation."""
    return 0.61078 * math.exp(17.27 * temp_c / (temp_c + 237.3))


def vpd(temp_c: float, rh: float) -> float:
    """Vapour pressure deficit (kPa) from air temperature (°C) and relative humidity (%)."""
    return saturation_vapour_pressure(temp_c) * (1 - rh / 100)


def dew_point(temp_c: float, rh: float) -> float | None:
    """Dew point (°C), Magnus form with the same constants as the Tetens equation."""
    if rh <= 0:
        return None
    gamma = math.log(rh / 100) + 17.27 * temp_c / (237.3 + temp_c)
    return 237.3 * gamma / (17.27 - gamma)


def daily_light_integral(par_umol: float, photoperiod_h: float) -> float:
    """Daily light integral (mol m⁻² d⁻¹) from PAR (µmol m⁻² s⁻¹) and photoperiod (h)."""
    return par_umol * photoperiod_h * 3600 / 1_000_000


def growing_degree_days(t_max: float, t_min: float, t_base: float = 10) -> float:
    """Growing degree days for one day, simple average method."""
    return max(0.0, (t_max + t_min) / 2 - t_base)


@dataclass(frozen=True)
class VpdBand:
    max: float
    label: str
    tone: str


# Common greenhouse VPD guidance bands (kPa); the last band is open-ended.
VPD_BANDS = [
    VpdBand(0.4, "Low transpiration", "water"),
    VpdBand(0.8, "Propagation", "leaf-light"),
    VpdBand(1.2, "Optimal vegetative", "leaf"),
    VpdBand(1.6, "High transpiration", "warn"),
    VpdBand(math.inf, "Stress / stomatal closure", "critical"),
]


def vpd_band(value: float) -> VpdBand:
    return next((b for b in VPD_BANDS if value < b.max), VPD_BANDS[-1])


# ---------------------------------------------------------------------------
# Fertigation and substrate
# ---------------------------------------------------------------------------


def fertilizer_mass_g(ppm: float, volume_l: float, element_pct: float) -> float | None:
    """Dry fertiliser mass (g) to reach `ppm` (mg L⁻¹) of an element present at `element_pct` % w/w."""
    return ppm * volume_l / (element_pct * 10) if element_pct > 0 else None


def leaching_fraction(drainage_ml: float, applied_ml: float) -> float | None:
    """Leaching fraction: drainage volume / applied volume."""
    return drainage_ml / applied_ml if applied_ml > 0 else None
