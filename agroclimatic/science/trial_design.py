"""
Randomised field layouts for nursery trials. A seeded generator makes every layout
reproducible: the same seed and inputs always give the same plan (and the same plan as
layouts saved by earlier versions of the app, which used the same generator).

- CRD: every treatment × replicate is randomised over all plots.
- RCBD: each block holds every treatment once, randomised independently per block.
- Latin square: t × t grid where each row and column holds every treatment once
  (cyclic square with rows, columns and treatment labels randomly permuted).
- Split-plot: in each block, main-plot levels are randomised to main plots, then
  sub-plot levels are randomised within each main plot.
"""

from __future__ import annotations

import math
import secrets
from collections.abc import Callable, Sequence
from typing import Literal, TypeVar

DesignType = Literal["CRD", "RCBD", "Latin_Square", "Split_Plot"]
DESIGN_TYPES: tuple[DesignType, ...] = ("CRD", "RCBD", "Latin_Square", "Split_Plot")
DESIGN_LABELS: dict[str, str] = {
    "CRD": "Completely randomised design",
    "RCBD": "Randomised complete block design",
    "Latin_Square": "Latin square",
    "Split_Plot": "Split-plot design",
}

T = TypeVar("T")
_M32 = 0xFFFFFFFF


def _imul(a: int, b: int) -> int:
    """32-bit integer multiply (JavaScript Math.imul), result as unsigned."""
    return (a * b) & _M32


def seeded_random(seed: int) -> Callable[[], float]:
    """mulberry32: small, fast 32-bit PRNG returning floats in [0, 1)."""
    state = seed & _M32

    def rand() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & _M32
        t = state
        t = _imul(t ^ (t >> 15), t | 1)
        t ^= (t + _imul(t ^ (t >> 7), t | 61)) & _M32
        return ((t ^ (t >> 14)) & _M32) / 4294967296

    return rand


def shuffle(items: Sequence[T], rand: Callable[[], float]) -> list[T]:
    """Fisher–Yates shuffle with the supplied generator (does not mutate the input)."""
    a = list(items)
    for i in range(len(a) - 1, 0, -1):
        j = math.floor(rand() * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a


def _code(i: int, prefix: str = "T") -> str:
    """Blind codes: T1, T2 … for treatments; S1, S2 … for sub-plot levels."""
    return f"{prefix}{i + 1}"


def completely_randomized(treatments: Sequence[str], replicates: int, rand) -> list[dict]:
    units = [{"treatment": t, "code": _code(i)} for i, t in enumerate(treatments) for _ in range(replicates)]
    return [{"plot": k + 1, "block": 1, "position": k + 1, **u} for k, u in enumerate(shuffle(units, rand))]


def randomized_complete_block(treatments: Sequence[str], blocks: int, rand) -> list[dict]:
    plots: list[dict] = []
    for b in range(blocks):
        units = shuffle([{"treatment": t, "code": _code(i)} for i, t in enumerate(treatments)], rand)
        for p, u in enumerate(units):
            plots.append({"plot": len(plots) + 1, "block": b + 1, "position": p + 1, **u})
    return plots


def latin_square(treatments: Sequence[str], rand) -> list[dict]:
    t = len(treatments)
    rows = shuffle(range(t), rand)
    cols = shuffle(range(t), rand)
    labels = shuffle(range(t), rand)
    plots: list[dict] = []
    for r in range(t):
        for c in range(t):
            k = labels[(rows[r] + cols[c]) % t]
            plots.append(
                {
                    "plot": len(plots) + 1,
                    "block": r + 1,
                    "position": c + 1,
                    "row": r + 1,
                    "col": c + 1,
                    "treatment": treatments[k],
                    "code": _code(k),
                }
            )
    return plots


def split_plot(main_levels: Sequence[str], sub_levels: Sequence[str], blocks: int, rand) -> list[dict]:
    plots: list[dict] = []
    for b in range(blocks):
        mains = shuffle(list(enumerate(main_levels)), rand)
        for mp, (i, m) in enumerate(mains):
            subs = shuffle(list(enumerate(sub_levels)), rand)
            for sp, (j, s) in enumerate(subs):
                plots.append(
                    {
                        "plot": len(plots) + 1,
                        "block": b + 1,
                        "position": mp * len(sub_levels) + sp + 1,
                        "treatment": m,
                        "code": _code(i),
                        "subTreatment": s,
                        "subCode": _code(j, "S"),
                    }
                )
    return plots


def design_problem(
    design_type: str, treatments: Sequence[str], replicates: int, sub_treatments: Sequence[str] = ()
) -> str | None:
    """Checks a design request; returns a message for the first problem, or None."""

    def unique(xs: Sequence[str]) -> bool:
        return len({x.strip().lower() for x in xs}) == len(xs)

    if len(treatments) < 2:
        return "Add at least two treatments."
    if not unique(treatments):
        return "Treatment names must be different."
    if design_type == "Latin_Square":
        if len(treatments) < 3:
            return "A Latin square needs at least three treatments (with two there are no error degrees of freedom)."
        if len(treatments) > 12:
            return "Latin squares above 12 × 12 are impractical; use an RCBD instead."
        return None
    if not isinstance(replicates, int) or replicates < 2:
        return "Use at least two replicates." if design_type == "CRD" else "Use at least two blocks."
    if design_type == "Split_Plot":
        if len(sub_treatments) < 2:
            return "Add at least two sub-plot levels."
        if not unique(sub_treatments):
            return "Sub-plot level names must be different."
    return None


def generate_layout(
    design_type: str, treatments: Sequence[str], replicates: int, seed: int, sub_treatments: Sequence[str] = ()
) -> list[dict]:
    """Builds the randomised layout for any supported design."""
    rand = seeded_random(seed)
    if design_type == "CRD":
        return completely_randomized(treatments, replicates, rand)
    if design_type == "RCBD":
        return randomized_complete_block(treatments, replicates, rand)
    if design_type == "Latin_Square":
        return latin_square(treatments, rand)
    if design_type == "Split_Plot":
        return split_plot(treatments, sub_treatments, replicates, rand)
    raise ValueError(f"Unknown design type: {design_type}")


def new_seed() -> int:
    return secrets.randbelow(2**31)
