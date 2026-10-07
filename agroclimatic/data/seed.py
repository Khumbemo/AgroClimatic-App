"""Reference species for every database, plus labelled example records for a first run."""

from __future__ import annotations

from datetime import date, timedelta

from ..science.trial_design import generate_layout, seeded_random
from .store import Store

SEEDED_KEY = "seeded.v4"
T0 = "2024-01-01T00:00:00.000Z"
_STAMP = {"createdAt": T0, "updatedAt": T0}
_EX = {**_STAMP, "isExample": True}

REFERENCE_SPECIES = [
    {
        "id": "sp-pinus-roxburghii",
        "botanicalName": "Pinus roxburghii",
        "commonName": "Chir pine",
        "family": "Pinaceae",
        "storageBehaviour": "orthodox",
        **_STAMP,
    },
    {
        "id": "sp-cedrus-deodara",
        "botanicalName": "Cedrus deodara",
        "commonName": "Deodar cedar",
        "family": "Pinaceae",
        "storageBehaviour": "sub-orthodox",
        "notes": "Short-lived at ambient temperature; remains viable >650 days at about 10 % moisture content and −5 °C.",
        **_STAMP,
    },
    {
        "id": "sp-abies-pindrow",
        "botanicalName": "Abies pindrow",
        "commonName": "Pindrow fir",
        "family": "Pinaceae",
        "storageBehaviour": "orthodox",
        **_STAMP,
    },
]

EXAMPLE_SEED_LOTS = [
    {
        "id": "ex-sl-001",
        "lotNumber": "SL-001",
        "speciesId": "sp-pinus-roxburghii",
        "collectionDate": "2023-11-15",
        "stockKg": 12.5,
        **_EX,
    },
    {
        "id": "ex-sl-002",
        "lotNumber": "SL-002",
        "speciesId": "sp-cedrus-deodara",
        "collectionDate": "2023-12-01",
        "stockKg": 5,
        **_EX,
    },
]

EXAMPLE_BATCHES = [
    {
        "id": "ex-nb-2024-001",
        "batchNumber": "NB-2024-001",
        "speciesId": "sp-pinus-roxburghii",
        "seedLotId": "ex-sl-001",
        "sowingDate": "2024-03-10",
        "seedsSown": 1000,
        "bedTrayNumber": "B-01",
        "substrateMix": "Coir : soil (70 : 30)",
        "areaSownM2": 2,
        "status": "growing",
        **_EX,
    },
    {
        "id": "ex-nb-2024-002",
        "batchNumber": "NB-2024-002",
        "speciesId": "sp-cedrus-deodara",
        "seedLotId": "ex-sl-002",
        "sowingDate": "2024-03-15",
        "seedsSown": 500,
        "bedTrayNumber": "T-15",
        "substrateMix": "Sand : coir",
        "areaSownM2": 1,
        "status": "germinating",
        **_EX,
    },
]

EXAMPLE_COUNTS = [
    {"id": f"ex-gc-{i + 1}", "batchId": "ex-nb-2024-001", "date": d, "count": n, **_EX}
    for i, (d, n) in enumerate([("2024-03-15", 120), ("2024-03-18", 300), ("2024-03-22", 180), ("2024-03-26", 40)])
]

EXAMPLE_GROWTH = [
    {
        "id": "ex-gm-1",
        "batchId": "ex-nb-2024-001",
        "date": "2024-04-20",
        "sampleSize": 30,
        "avgHeightCm": 4.1,
        "avgRCDmm": 1.1,
        **_EX,
    },
    {
        "id": "ex-gm-2",
        "batchId": "ex-nb-2024-001",
        "date": "2024-05-20",
        "sampleSize": 30,
        "avgHeightCm": 7.9,
        "avgRCDmm": 1.9,
        "shootDryWeight": 0.62,
        "rootDryWeight": 0.31,
        **_EX,
    },
]


def example_climate(today: date) -> list[dict]:
    """A week of example greenhouse readings ending on `today`, so the dashboard is populated."""
    rows = [
        (14.2, 27.8, 66, 430),
        (13.8, 28.4, 64, 455),
        (15.1, 26.9, 71, 380),
        (14.6, 27.2, 68, 410),
        (13.9, 29.1, 61, 470),
        (14.8, 28.0, 65, 445),
        (15.0, 27.5, 68, 412),
    ]
    return [
        {
            "id": f"ex-cl-{i + 1}",
            "date": (today - timedelta(days=6 - i)).isoformat(),
            "tempMin": t_min,
            "tempMax": t_max,
            "tempMean": round((t_min + t_max) / 2, 1),
            "humidity": rh,
            "lightIntensity": par,
            "photoperiod": 12,
            **_EX,
        }
        for i, (t_min, t_max, rh, par) in enumerate(rows)
    ]


def example_trial() -> tuple[dict, dict]:
    """Example RCBD substrate trial with simulated heights, so the analysis can be explored."""
    treatments = ["Peat", "Coco coir", "Composted bark", "Peat + perlite"]
    effect = {"Peat": 0, "Coco coir": 1.1, "Composted bark": -1.6, "Peat + perlite": 2.3}
    seed = 2026
    assignments = generate_layout("RCBD", treatments, 4, seed)
    noise = seeded_random(7)
    values = {
        str(a["plot"]): round(14 + effect[a["treatment"]] + 0.5 * (a["block"] - 2.5) + (noise() - 0.5) * 1.6, 1)
        for a in assignments
    }
    experiment = {
        "id": "ex-exp-1",
        "name": "Substrate trial (example)",
        "designType": "RCBD",
        "treatments": treatments,
        "replicates": 4,
        "blocks": 4,
        "assignments": assignments,
        "blindMode": False,
        "seed": seed,
        "layoutVersion": 2,
        **_EX,
    }
    variable = {
        "id": "ex-tv-1",
        "experimentId": "ex-exp-1",
        "name": "Seedling height at 90 days",
        "unit": "cm",
        "values": values,
        **_EX,
    }
    return experiment, variable


def seed_once(store: Store, examples: bool, today: date | None = None) -> None:
    """Add reference species once; example records go only into an empty database."""
    if store.get_meta(SEEDED_KEY):
        return
    if store.count("species") == 0:
        for s in REFERENCE_SPECIES:
            store.put("species", s)
    if examples:
        load_examples(store, today)
    store.set_meta(SEEDED_KEY, "1")


def load_examples(store: Store, today: date | None = None) -> None:
    """Add the example records to collections that are still empty."""
    for s in REFERENCE_SPECIES:
        if store.get("species", s["id"]) is None:
            store.put("species", s)
    if store.count("seedLots") == 0:
        for r in EXAMPLE_SEED_LOTS:
            store.put("seedLots", r)
    if store.count("batches") == 0:
        for r in EXAMPLE_BATCHES:
            store.put("batches", r)
    if store.count("climateReadings") == 0:
        for r in example_climate(today or date.today()):
            store.put("climateReadings", r)
    if store.get("batches", "ex-nb-2024-001"):
        if not any(c.get("batchId") == "ex-nb-2024-001" for c in store.list("germinationCounts")):
            for r in EXAMPLE_COUNTS:
                store.put("germinationCounts", r)
        if not any(g.get("batchId") == "ex-nb-2024-001" for g in store.list("growthMeasurements")):
            for r in EXAMPLE_GROWTH:
                store.put("growthMeasurements", r)
    if store.count("experiments") == 0:
        experiment, variable = example_trial()
        store.put("experiments", experiment)
        store.put("trialVariables", variable)


def remove_examples(store: Store) -> int:
    """Delete every record marked as an example; returns how many were removed."""
    from .schema import COLLECTIONS

    removed = 0
    for col in COLLECTIONS:
        for r in store.list(col):
            if r.get("isExample"):
                store.remove(col, r["id"])
                removed += 1
    return removed
