"""
Field sampling layouts for vegetation and regeneration surveys.

Every layout is generated from a stored seed (the same mulberry32 generator as trial
randomisation), so a plan can be reproduced exactly. Coordinates are in metres from the
south-west corner of a rectangular site (x across the width, y along the length).

Sampling units are dicts: {"id", "kind": "quadrat" | "point" | "line", "x", "y", "w", "h",
optional "stratum", "transect", "location", "size"}. A quadrat spans x..x+w, y..y+h; a point
has w = h = 0; a line runs from (x, y) to (x, y + h).
"""

from __future__ import annotations

import math

from .trial_design import seeded_random

METHODS: dict[str, str] = {
    "random_quadrats": "Simple random quadrats",
    "systematic_quadrats": "Systematic quadrats (grid, random start)",
    "stratified_quadrats": "Stratified random quadrats",
    "belt_transect": "Belt transects (contiguous quadrats)",
    "nested_quadrats": "Nested quadrats (species–area)",
    "pcq": "Point-centred quarter (PCQ)",
    "line_intercept": "Line intercept",
    "point_intercept": "Point intercept",
}

QUADRAT_METHODS = {"random_quadrats", "systematic_quadrats", "stratified_quadrats", "belt_transect"}


class LayoutError(ValueError):
    """The requested layout cannot be placed in the site; the message says why."""


def _check_site(width: float, length: float) -> None:
    if not (width > 0 and length > 0):
        raise LayoutError("Site width and length must be greater than zero.")


def _quadrat(i: int, x: float, y: float, size: float, **extra) -> dict:
    return {"id": f"Q{i}", "kind": "quadrat", "x": round(x, 2), "y": round(y, 2), "w": size, "h": size, **extra}


def random_quadrats(width: float, length: float, size: float, n: int, seed: int, max_tries: int = 20000) -> list[dict]:
    """n non-overlapping square quadrats placed at random positions (rejection sampling)."""
    _check_site(width, length)
    if size <= 0 or size > min(width, length):
        raise LayoutError("The quadrat must be smaller than the site.")
    if n < 1:
        raise LayoutError("Use at least one quadrat.")
    if n * size * size > 0.5 * width * length:
        raise LayoutError("Quadrats would cover more than half the site; use fewer or smaller quadrats.")
    rand = seeded_random(seed)
    placed: list[tuple[float, float]] = []
    tries = 0
    while len(placed) < n:
        tries += 1
        if tries > max_tries:
            raise LayoutError("Could not place that many non-overlapping quadrats; use fewer or smaller ones.")
        x, y = rand() * (width - size), rand() * (length - size)
        if all(abs(x - px) >= size or abs(y - py) >= size for px, py in placed):
            placed.append((x, y))
    return [_quadrat(i + 1, x, y, size) for i, (x, y) in enumerate(placed)]


def systematic_quadrats(width: float, length: float, size: float, spacing: float, seed: int) -> list[dict]:
    """Quadrats on a square grid with one random start, so every point has the same inclusion chance."""
    _check_site(width, length)
    if size <= 0 or spacing < size:
        raise LayoutError("Grid spacing must be at least the quadrat size.")
    if size > min(width, length):
        raise LayoutError("The quadrat must be smaller than the site.")
    rand = seeded_random(seed)
    x0, y0 = rand() * min(spacing, width - size), rand() * min(spacing, length - size)
    units, i = [], 0
    y = y0
    while y + size <= length + 1e-9:
        x = x0
        while x + size <= width + 1e-9:
            i += 1
            units.append(_quadrat(i, x, y, size))
            x += spacing
        y += spacing
    if not units:
        raise LayoutError("No quadrat fits with that spacing.")
    return units


def stratified_quadrats(
    width: float, length: float, size: float, strata: int, per_stratum: int, seed: int
) -> list[dict]:
    """
    The site's length is divided into equal bands (e.g. along a slope or moisture gradient) and
    `per_stratum` quadrats are placed at random in each band.
    """
    _check_site(width, length)
    if strata < 2:
        raise LayoutError("Use at least two strata.")
    band = length / strata
    if size > min(width, band):
        raise LayoutError("The quadrat must fit inside one stratum.")
    units: list[dict] = []
    for s in range(strata):
        part = random_quadrats(width, band, size, per_stratum, seed + 7919 * s)
        for q in part:
            units.append(_quadrat(len(units) + 1, q["x"], q["y"] + s * band, size, stratum=s + 1))
    return units


def belt_transects(width: float, length: float, size: float, transects: int, seed: int) -> list[dict]:
    """
    Parallel transects across the site length, evenly spaced with one random start, each a belt
    of contiguous quadrats (useful along gradients).
    """
    _check_site(width, length)
    if transects < 1 or size > min(width, length):
        raise LayoutError("Use at least one transect and a quadrat smaller than the site.")
    spacing = width / transects
    if spacing < size:
        raise LayoutError("Transects would overlap; use fewer transects or smaller quadrats.")
    rand = seeded_random(seed)
    x0 = rand() * (spacing - size)
    units: list[dict] = []
    for t in range(transects):
        x = x0 + t * spacing
        for k in range(int(length // size)):
            units.append(_quadrat(len(units) + 1, x, k * size, size, transect=t + 1))
    return units


def nested_quadrats(width: float, length: float, sizes: list[float], locations: int, seed: int) -> list[dict]:
    """
    Series of nested square quadrats sharing a corner (each side √2 × the previous one doubles the
    area), at `locations` random positions, for species–area curves and choosing a quadrat size.
    """
    _check_site(width, length)
    sizes = sorted(s for s in sizes if s > 0)
    if len(sizes) < 3:
        raise LayoutError("Give at least three quadrat sizes.")
    big = sizes[-1]
    corners = random_quadrats(width, length, big, locations, seed)
    units = []
    for loc, c in enumerate(corners, 1):
        for k, s in enumerate(sizes, 1):
            units.append(
                {
                    "id": f"L{loc}-S{k}",
                    "kind": "quadrat",
                    "x": c["x"],
                    "y": c["y"],
                    "w": s,
                    "h": s,
                    "location": loc,
                    "size": k,
                }
            )
    return units


def doubling_sizes(smallest: float, count: int) -> list[float]:
    """Quadrat sides whose areas double: s, s√2, 2s, … (rounded to cm)."""
    return [round(smallest * math.sqrt(2) ** k, 2) for k in range(count)]


def transect_points(
    width: float, length: float, transects: int, interval: float, seed: int, kind: str = "point"
) -> list[dict]:
    """
    Points every `interval` metres along evenly spaced parallel transects with a random start
    (PCQ sampling points or point-intercept points); `kind="line"` returns the transect lines.
    """
    _check_site(width, length)
    if transects < 1 or interval <= 0 or interval > length:
        raise LayoutError("Use at least one transect and an interval shorter than the site.")
    spacing = width / transects
    rand = seeded_random(seed)
    x0 = rand() * spacing
    y0 = rand() * interval
    units: list[dict] = []
    for t in range(transects):
        x = round(x0 + t * spacing, 2)
        if kind == "line":
            units.append(
                {"id": f"T{t + 1}", "kind": "line", "x": x, "y": 0.0, "w": 0.0, "h": float(length), "transect": t + 1}
            )
            continue
        y, k = y0, 0
        while y <= length + 1e-9:
            k += 1
            units.append(
                {
                    "id": f"T{t + 1}-P{k}",
                    "kind": "point",
                    "x": x,
                    "y": round(y, 2),
                    "w": 0.0,
                    "h": 0.0,
                    "transect": t + 1,
                }
            )
            y += interval
    return units


def unit_area(unit: dict) -> float:
    return float(unit["w"]) * float(unit["h"])


def build_layout(method: str, width: float, length: float, params: dict, seed: int) -> list[dict]:
    """Generate the layout for a survey method from its stored settings (see `METHODS`)."""
    p = params
    if method == "random_quadrats":
        return random_quadrats(width, length, p["size"], int(p["n"]), seed)
    if method == "systematic_quadrats":
        return systematic_quadrats(width, length, p["size"], p["spacing"], seed)
    if method == "stratified_quadrats":
        return stratified_quadrats(width, length, p["size"], int(p["strata"]), int(p["per_stratum"]), seed)
    if method == "belt_transect":
        return belt_transects(width, length, p["size"], int(p["transects"]), seed)
    if method == "nested_quadrats":
        return nested_quadrats(width, length, doubling_sizes(p["smallest"], int(p["count"])), int(p["locations"]), seed)
    if method == "pcq":
        return transect_points(width, length, int(p["transects"]), p["interval"], seed)
    if method in ("line_intercept", "point_intercept"):
        return transect_points(width, length, int(p["transects"]), length, seed, kind="line")
    raise LayoutError(f"Unknown method: {method}")
