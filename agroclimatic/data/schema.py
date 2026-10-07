"""
AgroClimatic data model.

Species ─< SeedLot ─< Batch ─< observations (germination, growth, treatments, mortality …)
Greenhouse ─< bench placements ─> Batch

Every observation links to a batch by `batchId`. Field names are those of the earlier app
(camelCase), so its JSON backups import unchanged.
"""

from __future__ import annotations

import math
import re
from datetime import date
from typing import Annotated, Any, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints, ValidationError, model_validator

# ---------------------------------------------------------------------------
# Shared field types
# ---------------------------------------------------------------------------

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _check_date(v: str) -> str:
    if not _DATE_RE.match(v):
        raise ValueError("Use a date in YYYY-MM-DD format")
    try:
        date.fromisoformat(v)
    except ValueError:
        raise ValueError("Not a valid calendar date") from None
    return v


IsoDate = Annotated[str, AfterValidator(_check_date)]


def Text(max_len: int = 500):  # noqa: N802 - type factory
    return Annotated[str, StringConstraints(strip_whitespace=True, max_length=max_len)]


def Required(max_len: int = 200):  # noqa: N802
    return Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=max_len)]


def Num(lo: float, hi: float):  # noqa: N802
    return Annotated[float, Field(ge=lo, le=hi, allow_inf_nan=False)]


def Int(lo: int, hi: int):  # noqa: N802
    return Annotated[int, Field(ge=lo, le=hi)]


Pct = Num(0, 100)
Ref = Annotated[str, StringConstraints(min_length=1)] | None


class Record(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    id: Annotated[str, StringConstraints(min_length=1)]
    createdAt: str
    updatedAt: str
    isExample: bool | None = None
    """Demo-only sample record; the UI labels these as examples."""


class Linked(Record):
    batchId: Ref = None
    legacyBatchLabel: Text(100) | None = None


# ---------------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------------

STORAGE_BEHAVIOURS = ("orthodox", "sub-orthodox", "intermediate", "recalcitrant", "unknown")


class Species(Record):
    botanicalName: Required(120)
    commonName: Text(120) = ""
    family: Text(80) = ""
    storageBehaviour: Literal[STORAGE_BEHAVIOURS] = "unknown"
    notes: Text(1000) | None = None


class SeedLot(Record):
    lotNumber: Required(60)
    speciesId: Ref = None
    collectionDate: IsoDate | None = None
    stockKg: Num(0, 100000) | None = None
    moistureContentPct: Pct | None = None
    viabilityPct: Pct | None = None
    thousandSeedWeightG: Num(0.001, 100000) | None = None
    notes: Text(1000) | None = None


# ---------------------------------------------------------------------------
# Batches and observations
# ---------------------------------------------------------------------------

BATCH_STATUSES = ("sown", "germinating", "growing", "hardening", "ready", "outplanted")


class Batch(Record):
    batchNumber: Required(60)
    speciesId: Ref = None
    seedLotId: Ref = None
    sowingDate: IsoDate | None = None
    seedsSown: Int(1, 10000000) | None = None
    bedTrayNumber: Text(60) | None = None
    substrateMix: Text(120) | None = None
    areaSownM2: Num(0.0001, 100000) | None = None
    status: Literal[BATCH_STATUSES] = "sown"
    needsReview: bool | None = None
    """Created automatically from older records; details need checking by the user."""
    notes: Text(1000) | None = None


class GerminationCount(Linked):
    date: IsoDate
    count: Int(0, 10_000_000)


class GrowthMeasurement(Linked):
    date: IsoDate
    sampleSize: Int(1, 100_000)
    avgHeightCm: Num(0.01, 1000)
    avgRCDmm: Num(0.01, 500)
    avgLeaves: Num(0, 100000) | None = None
    leafAreaIndex: Num(0, 50) | None = None
    spadValue: Num(0, 100) | None = None
    shootFreshWeight: Num(0.0001, 100000) | None = None
    rootFreshWeight: Num(0.0001, 100000) | None = None
    shootDryWeight: Num(0.0001, 100000) | None = None
    rootDryWeight: Num(0.0001, 100000) | None = None


class ClimateReading(Record):
    greenhouseId: Ref = None
    date: IsoDate
    tempMin: Num(-60, 70)
    tempMax: Num(-60, 70)
    tempMean: Num(-60, 70)
    humidity: Pct
    lightIntensity: Num(0, 200_000)
    photoperiod: Num(0, 24)
    co2: Num(0, 20000) | None = None

    @model_validator(mode="after")
    def _temperatures(self):
        if self.tempMin > self.tempMax:
            raise ValueError("Minimum temperature is above the maximum")
        if not self.tempMin <= self.tempMean <= self.tempMax:
            raise ValueError("Mean temperature must lie between minimum and maximum")
        return self


class FertigationEvent(Linked):
    """batchId None = applied to the whole nursery."""

    date: IsoDate
    npkRatio: Required(40)
    dosage: Num(0, 100_000)
    ph: Num(0, 14) | None = None
    ec: Num(0, 30) | None = None


class PestObservation(Linked):
    date: IsoDate
    pestDiseaseName: Required(120)
    incidencePercentage: Pct
    severityScale: Int(1, 5)
    treatmentChemical: Text(120) | None = None


PRESOWING_TYPES = (
    "stratification_cold",
    "stratification_warm",
    "scarification_mechanical",
    "scarification_chemical",
    "soaking",
    "hormonal",
    "other",
)


class PreSowingTreatment(Linked):
    date: IsoDate
    treatmentType: Literal[PRESOWING_TYPES]
    duration: Text(80) = ""
    concentration: Text(80) = ""
    notes: Text(1000) = ""


class MortalityEvent(Linked):
    date: IsoDate
    sowingDate: IsoDate | None = None
    """Sowing date at the time of recording; the batch's own sowing date takes precedence."""
    count: Int(1, 10_000_000)
    causeCode: Required(80)
    daysToDeath: Int(0, 100000) | None = None
    notes: Text(1000) = ""


IRRIGATION_METHODS = ("overhead", "drip", "sub-irrigation", "mist", "hand")


class IrrigationEvent(Linked):
    date: IsoDate
    method: Literal[IRRIGATION_METHODS]
    volumeL: Num(0, 1_000_000)
    durationMin: Num(0, 1440) | None = None
    notes: Text(1000) = ""


class LeachateTest(Linked):
    date: IsoDate
    phIn: Num(0, 14)
    phOut: Num(0, 14) | None = None
    ecIn: Num(0, 30)
    ecOut: Num(0, 30) | None = None
    volumeMl: Num(0, 1000000) | None = None
    appliedMl: Num(0.001, 1000000) | None = None
    """Irrigation volume applied to the same containers, for the leaching fraction."""


class MixComponent(BaseModel):
    name: Required(80)
    pct: Pct


class SubstrateMix(Record):
    name: Required(120)
    components: Annotated[list[MixComponent], Field(min_length=1)]
    cec: Num(0, 1000) | None = None

    @model_validator(mode="after")
    def _sum_to_100(self):
        if abs(sum(c.pct for c in self.components) - 100) >= 0.5:
            raise ValueError("Component shares must add up to 100 %")
        return self


class ProvenanceRecord(Linked):
    seedLotId: Ref = None
    collectorName: Text(120) = ""
    collectionDate: IsoDate
    lat: Num(-90, 90)
    lng: Num(-180, 180)
    elevation: Num(-500, 9000) | None = None
    aspect: Text(40) = ""
    climateZone: Text(80) = ""
    canopyPosition: Text(80) = ""
    motherTreeCount: Int(1, 100_000)
    genotypeMarkers: Text(500) = ""
    phenotypeTraits: Text(500) = ""
    notes: Text(1000) = ""


class Calibration(Record):
    instrumentName: Required(120)
    instrumentType: Required(60)
    calibrationDate: IsoDate
    nextDueDate: IsoDate | None = None
    standardUsed: Text(120) = ""
    calibratedBy: Text(120) = ""
    notes: Text(1000) = ""


DESIGN_TYPES = ("CRD", "RCBD", "Latin_Square", "Split_Plot")


class PlotAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    plot: int | None = None
    block: int
    position: int
    row: int | None = None
    col: int | None = None
    treatment: str
    code: str
    subTreatment: str | None = None
    subCode: str | None = None


class Experiment(Record):
    name: Required(120)
    designType: Literal[DESIGN_TYPES]
    blocks: Int(1, 100)
    replicates: Int(1, 100)
    treatments: Annotated[list[Required(80)], Field(min_length=2)]
    subTreatments: list[Required(80)] | None = None
    """Sub-plot factor levels (split-plot designs only)."""
    assignments: list[PlotAssignment]
    blindMode: bool = False
    seed: int | None = None
    """Random seed of the layout, so it can be reproduced exactly."""
    layoutVersion: int | None = None
    """2 = generated by the design-specific randomiser; absent = older RCBD-style layout."""


class TrialVariable(Record):
    """A measured response (e.g. height at 90 days) for every plot of an experiment."""

    experimentId: Annotated[str, StringConstraints(min_length=1)]
    name: Required(80)
    unit: Text(40) = ""
    values: dict[Annotated[str, StringConstraints(pattern=r"^\d+$")], Num(-1e12, 1e12)]
    """Plot number → measured value; plots without a value are omitted."""


PLACEMENT_STATUSES = ("sown", "germinating", "growing", "hardening", "ready")


class Placement(BaseModel):
    row: Annotated[int, Field(ge=0)]
    col: Annotated[int, Field(ge=0)]
    batchId: Ref = None
    legacyBatchLabel: Text(100) | None = None
    legacySpecies: Text(120) | None = None
    status: Literal[PLACEMENT_STATUSES]


class Greenhouse(Record):
    name: Required(80)
    rows: Int(1, 50)
    cols: Int(1, 50)
    placements: list[Placement] = []
    """Occupied bench positions only."""


# ---------------------------------------------------------------------------
# Collection registry
# ---------------------------------------------------------------------------

SCHEMAS: dict[str, type[Record]] = {
    "species": Species,
    "seedLots": SeedLot,
    "batches": Batch,
    "germinationCounts": GerminationCount,
    "growthMeasurements": GrowthMeasurement,
    "climateReadings": ClimateReading,
    "fertigationEvents": FertigationEvent,
    "pestObservations": PestObservation,
    "preSowingTreatments": PreSowingTreatment,
    "mortalityEvents": MortalityEvent,
    "leachateTests": LeachateTest,
    "irrigationEvents": IrrigationEvent,
    "substrateMixes": SubstrateMix,
    "provenanceRecords": ProvenanceRecord,
    "calibrations": Calibration,
    "experiments": Experiment,
    "trialVariables": TrialVariable,
    "greenhouses": Greenhouse,
}
COLLECTIONS = tuple(SCHEMAS)


class RecordInvalid(ValueError):
    """A record failed validation; `issues` lists (field, message) pairs for the form."""

    def __init__(self, collection: str, issues: list[tuple[str, str]]):
        self.collection = collection
        self.issues = issues
        super().__init__("; ".join(f"{f}: {m}" if f else m for f, m in issues))


_LIMIT_MESSAGES = {
    "greater_than_equal": lambda c: f"must be ≥ {_fmt(c['ge'])}",
    "less_than_equal": lambda c: f"must be ≤ {_fmt(c['le'])}",
    "string_too_short": lambda c: "is required",
    "string_too_long": lambda c: f"must be at most {c['max_length']} characters",
    "too_short": lambda c: f"needs at least {c['min_length']} item(s)",
    "missing": lambda c: "is required",
    "int_from_float": lambda c: "must be a whole number",
    "int_parsing": lambda c: "must be a whole number",
    "float_parsing": lambda c: "must be a number",
    "finite_number": lambda c: "must be a finite number",
}


def _fmt(v: Any) -> str:
    return f"{v:g}" if isinstance(v, float) else str(v)


def _issues(err: ValidationError) -> list[tuple[str, str]]:
    out = []
    for e in err.errors():
        field = ".".join(str(p) for p in e["loc"])
        make = _LIMIT_MESSAGES.get(e["type"])
        msg = make(e.get("ctx", {})) if make else str(e["msg"]).removeprefix("Value error, ")
        out.append((field, msg))
    return out


def validate(collection: str, record: dict) -> dict:
    """Validate a full record against its collection schema; returns the clean JSON dict."""
    model = SCHEMAS[collection]
    try:
        return model.model_validate(record).model_dump(mode="json", exclude_none=True)
    except ValidationError as e:
        raise RecordInvalid(collection, _issues(e)) from None


def is_finite(v: Any) -> bool:
    return isinstance(v, (int, float)) and math.isfinite(v)
