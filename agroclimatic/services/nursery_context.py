"""Facts about the user's nursery for AgroBot, built only from their records."""

from __future__ import annotations

from dataclasses import dataclass

from ..science.calculations import vpd


@dataclass
class Snapshot:
    batches: list[dict]
    species: list[dict]
    seed_lots: list[dict]
    germination: list[dict]
    growth: list[dict]
    climate: list[dict]
    mortality: list[dict]

    @classmethod
    def from_store(cls, store) -> Snapshot:
        return cls(
            store.list("batches"),
            store.list("species"),
            store.list("seedLots"),
            store.list("germinationCounts"),
            store.list("growthMeasurements"),
            store.list("climateReadings"),
            store.list("mortalityEvents"),
        )

    def species_name(self, species_id: str | None) -> str:
        return next((s["botanicalName"] for s in self.species if s["id"] == species_id), "species not set")


def _latest(rows: list[dict]) -> dict | None:
    return max(rows, key=lambda r: r["date"]) if rows else None


def _q(v, unit: str = "") -> str:
    return f"{v:g}{unit}" if isinstance(v, (int, float)) else "?"


def batch_facts(s: Snapshot, b: dict) -> str:
    """Per-batch figures computed from the records (no invented values)."""
    germinated = sum(g["count"] for g in s.germination if g.get("batchId") == b["id"])
    dead = sum(m["count"] for m in s.mortality if m.get("batchId") == b["id"])
    g = _latest([x for x in s.growth if x.get("batchId") == b["id"]])
    sown = b.get("seedsSown")
    parts = [
        f"{b['batchNumber']}: {s.species_name(b.get('speciesId'))}, stage {b['status']}",
        f"sown {b.get('sowingDate') or 'date not recorded'}",
        f"{sown} seeds sown" if sown else "seeds sown not recorded",
        f"germination {germinated / sown * 100:.1f} % ({germinated} seeds)" if sown else f"{germinated} germinated",
        f"{dead} recorded deaths",
        (
            f"latest growth {g['date']}: height {g['avgHeightCm']:g} cm, root-collar diameter {g['avgRCDmm']:g} mm "
            f"(n={g['sampleSize']})"
        )
        if g
        else "no growth measurements",
    ]
    return "; ".join(parts)


def build_context(s: Snapshot) -> str:
    """Context block for the language model."""
    lines = [
        'NURSERY RECORDS (only facts below are known; say "not in the records" otherwise)',
        f"Batches ({len(s.batches)}):",
    ]
    lines += [f"- {batch_facts(s, b)}" for b in s.batches[:40]]
    lines.append(f"Seed lots ({len(s.seed_lots)}):")
    for lot in s.seed_lots[:40]:
        lines.append(
            f"- {lot['lotNumber']}: {s.species_name(lot.get('speciesId'))}; stock {_q(lot.get('stockKg'))} kg; "
            f"moisture {_q(lot.get('moistureContentPct'))} %; viability {_q(lot.get('viabilityPct'))} %; "
            f"collected {lot.get('collectionDate') or '?'}"
        )
    c = _latest(s.climate)
    lines.append(
        f"Latest climate reading {c['date']}: T {c['tempMin']:g}–{c['tempMax']:g} °C (mean {c['tempMean']:g}), "
        f"RH {c['humidity']:g} %, VPD {vpd(c['tempMean'], c['humidity']):.2f} kPa, PAR {c['lightIntensity']:g}, "
        f"photoperiod {c['photoperiod']:g} h"
        if c
        else "No climate readings recorded."
    )
    lines.append(
        "Species reference: "
        + "; ".join(f"{x['botanicalName']} ({x.get('storageBehaviour', 'unknown')} seed storage)" for x in s.species)
    )
    return "\n".join(lines)


KNOWLEDGE = [
    (
        ("vpd", "vapour pressure", "vapor pressure"),
        "### Vapour pressure deficit (VPD)\nThe difference between how much water vapour the air could hold at its "
        "temperature and how much it holds. It drives transpiration more directly than relative humidity.\n"
        "- Calculated here with the Tetens equation: VPD = 0.61078·e^(17.27T/(T+237.3)) × (1 − RH/100) kPa.\n"
        "- Common greenhouse guidance: about 0.4–0.8 kPa for propagation and 0.8–1.2 kPa for vegetative growth.",
    ),
    (
        ("dqi", "dickson"),
        "### Dickson quality index\nDQI = total dry mass (g) / [height (cm) ÷ root-collar diameter (mm) + shoot dry "
        "mass ÷ root dry mass] (Dickson et al. 1960). Higher values indicate a sturdier, better-balanced seedling.",
    ),
    (
        ("rcbd", "randomized complete block", "randomised complete block"),
        "### Randomised complete block design (RCBD)\nGroup plots into blocks that are as uniform as possible (e.g. "
        "along a light or temperature gradient). Every treatment appears once in each block, randomised independently "
        "within each block. Analyse with two-way ANOVA (treatment + block).",
    ),
    (
        ("epigeal", "hypogeal", "germination type"),
        "### Germination types\n- Epigeal: cotyledons are lifted above the soil (e.g. *Pinus*).\n"
        "- Hypogeal: cotyledons stay below ground (e.g. *Quercus*).",
    ),
    (
        ("cedrus", "deodar"),
        "### *Cedrus deodara* (deodar)\nSeed is oily and short-lived at ambient temperature (about one season). It "
        "behaves as sub-orthodox: dried to about 10 % moisture content and stored at −5 °C it stayed viable for more "
        "than 650 days.",
    ),
    (
        ("mgt", "mean germination time"),
        "### Mean germination time\nMGT = Σ(tᵢ·nᵢ) / Σnᵢ, where nᵢ seeds germinated on day tᵢ after sowing. Lower "
        "values mean faster germination.",
    ),
]


def offline_answer(query: str, s: Snapshot) -> str:
    """Answer without a language model: the user's records first, then a small reference set."""
    q = query.lower()
    batch = next((b for b in s.batches if b["batchNumber"].lower() in q), None)
    if batch:
        facts = batch_facts(s, batch).split("; ")[1:]
        return f"### {batch['batchNumber']}\n" + "\n".join(f"- {p}" for p in facts)
    lot = next((x for x in s.seed_lots if x["lotNumber"].lower() in q), None)
    if lot:
        nr = "not recorded"
        return (
            f"### Seed lot {lot['lotNumber']}\n- *{s.species_name(lot.get('speciesId'))}*\n"
            f"- Stock: {_q(lot.get('stockKg')).replace('?', nr)} kg\n"
            f"- Moisture content: {_q(lot.get('moistureContentPct')).replace('?', nr)} %\n"
            f"- Viability: {_q(lot.get('viabilityPct')).replace('?', nr)} %\n"
            f"- Collected: {lot.get('collectionDate') or nr}"
        )
    for keys, answer in KNOWLEDGE:
        if any(k in q for k in keys):
            return answer
    return (
        "Offline mode can answer from your records (name a batch number such as NB-2024-001 or a seed lot such "
        "as SL-001) and explain VPD, mean germination time, the Dickson quality index, RCBD trials and *Cedrus "
        "deodara* seed storage. Add a Gemini API key for open questions."
    )
