import { z } from 'zod';

/*
  AgroClimatic data model (v2).

  Species ─< SeedLot ─< Batch ─< observations (germination, growth, treatments, mortality …)
  Greenhouse ─< bench placements ─> Batch

  Every observation links to a batch by `batchId`. Records saved before v2 used free-text
  batch labels; when a label couldn't be matched it is kept in `legacyBatchLabel`.
  Field names of the original records are kept so saved data maps across unchanged.
*/

// ---------------------------------------------------------------------------
// Shared field types
// ---------------------------------------------------------------------------

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD format')
  // Round-trip check: JS Date silently rolls 2024-02-31 over to 2024-03-02
  .refine(v => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Not a valid calendar date');

const text = (max = 500) => z.string().trim().max(max);
const requiredText = (label: string, max = 200) => z.string().trim().min(1, `${label} is required`).max(max);
const num = (label: string, min: number, max: number) =>
  z.number({ invalid_type_error: `${label} must be a number` }).finite().min(min, `${label} must be ≥ ${min}`).max(max, `${label} must be ≤ ${max}`);
const int = (label: string, min: number, max: number) => num(label, min, max).int(`${label} must be a whole number`);
const pct = (label: string) => num(label, 0, 100);

/** Reference to a batch; null means "not linked" (or "whole nursery" where allowed). */
const batchRef = z.string().min(1).nullable();
const legacyBatchLabel = text(100).optional();

const base = {
  id: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** Demo-only sample record; the UI labels these as examples. */
  isExample: z.boolean().optional(),
};

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export const STORAGE_BEHAVIOURS = ['orthodox', 'sub-orthodox', 'intermediate', 'recalcitrant', 'unknown'] as const;

export const speciesSchema = z.object({
  ...base,
  botanicalName: requiredText('Botanical name', 120),
  commonName: text(120),
  family: text(80),
  storageBehaviour: z.enum(STORAGE_BEHAVIOURS),
  notes: text(1000).optional(),
});

export const seedLotSchema = z.object({
  ...base,
  lotNumber: requiredText('Lot number', 60),
  speciesId: z.string().min(1).nullable(),
  collectionDate: isoDate.nullable(),
  stockKg: num('Stock', 0, 100000).nullable(),
  moistureContentPct: pct('Moisture content').nullable().optional(),
  viabilityPct: pct('Viability').nullable().optional(),
  thousandSeedWeightG: num('Thousand-seed weight', 0.001, 100000).nullable().optional(),
  notes: text(1000).optional(),
});

// ---------------------------------------------------------------------------
// Batches
// ---------------------------------------------------------------------------

export const BATCH_STATUSES = ['sown', 'germinating', 'growing', 'hardening', 'ready', 'outplanted'] as const;

export const batchSchema = z.object({
  ...base,
  batchNumber: requiredText('Batch number', 60),
  speciesId: z.string().min(1).nullable(),
  seedLotId: z.string().min(1).nullable(),
  sowingDate: isoDate.nullable(),
  seedsSown: int('Seeds sown', 1, 10_000_000).nullable(),
  bedTrayNumber: text(60).optional(),
  substrateMix: text(120).optional(),
  areaSownM2: num('Area sown', 0.0001, 100000).nullable().optional(),
  status: z.enum(BATCH_STATUSES),
  /** Created automatically from pre-v2 records; details need checking by the user. */
  needsReview: z.boolean().optional(),
  notes: text(1000).optional(),
});

// ---------------------------------------------------------------------------
// Observations
// ---------------------------------------------------------------------------

export const germinationCountSchema = z.object({
  ...base,
  batchId: batchRef,
  legacyBatchLabel,
  date: isoDate,
  count: int('Germinant count', 0, 10_000_000),
});

export const growthMeasurementSchema = z.object({
  ...base,
  batchId: batchRef,
  legacyBatchLabel,
  date: isoDate,
  sampleSize: int('Sample size', 1, 100000),
  avgHeightCm: num('Mean height', 0.01, 1000),
  avgRCDmm: num('Mean root-collar diameter', 0.01, 500),
  avgLeaves: num('Mean leaf count', 0, 100000).optional(),
  leafAreaIndex: num('Leaf area index', 0, 50).optional(),
  spadValue: num('SPAD', 0, 100).optional(),
  shootFreshWeight: num('Shoot fresh mass', 0.0001, 100000).optional(),
  rootFreshWeight: num('Root fresh mass', 0.0001, 100000).optional(),
  shootDryWeight: num('Shoot dry mass', 0.0001, 100000).optional(),
  rootDryWeight: num('Root dry mass', 0.0001, 100000).optional(),
});

export const climateReadingSchema = z
  .object({
    ...base,
    greenhouseId: z.string().min(1).nullable().optional(),
    date: isoDate,
    tempMin: num('Minimum temperature', -60, 70),
    tempMax: num('Maximum temperature', -60, 70),
    tempMean: num('Mean temperature', -60, 70),
    humidity: pct('Relative humidity'),
    lightIntensity: num('Light intensity', 0, 200000),
    photoperiod: num('Photoperiod', 0, 24),
    co2: num('CO₂', 0, 20000).optional(),
  })
  .refine(r => r.tempMin <= r.tempMax, { message: 'Minimum temperature is above the maximum', path: ['tempMin'] })
  .refine(r => r.tempMean >= r.tempMin && r.tempMean <= r.tempMax, { message: 'Mean temperature must lie between minimum and maximum', path: ['tempMean'] });

export const fertigationEventSchema = z.object({
  ...base,
  /** null = applied to the whole nursery */
  batchId: batchRef,
  legacyBatchLabel,
  date: isoDate,
  npkRatio: requiredText('N-P-K ratio', 40),
  dosage: num('Dose', 0, 100000),
  ph: num('pH', 0, 14).optional(),
  ec: num('EC', 0, 30).optional(),
});

export const pestObservationSchema = z.object({
  ...base,
  batchId: batchRef,
  legacyBatchLabel,
  date: isoDate,
  pestDiseaseName: requiredText('Pest or disease name', 120),
  incidencePercentage: pct('Incidence'),
  severityScale: int('Severity', 1, 5),
  treatmentChemical: text(120).optional(),
});

export const PRESOWING_TYPES = [
  'stratification_cold', 'stratification_warm', 'scarification_mechanical',
  'scarification_chemical', 'soaking', 'hormonal', 'other',
] as const;

export const preSowingTreatmentSchema = z.object({
  ...base,
  batchId: batchRef,
  legacyBatchLabel,
  date: isoDate,
  treatmentType: z.enum(PRESOWING_TYPES),
  duration: text(80),
  concentration: text(80),
  notes: text(1000),
});

export const mortalityEventSchema = z.object({
  ...base,
  batchId: batchRef,
  legacyBatchLabel,
  date: isoDate,
  /** Sowing date at the time of recording; the batch's own sowing date takes precedence. */
  sowingDate: isoDate.nullable(),
  count: int('Number of dead seedlings', 1, 10_000_000),
  causeCode: requiredText('Cause', 80),
  daysToDeath: int('Days to death', 0, 100000).nullable(),
  notes: text(1000),
});

export const IRRIGATION_METHODS = ['overhead', 'drip', 'sub-irrigation', 'mist', 'hand'] as const;

export const irrigationEventSchema = z.object({
  ...base,
  /** null = whole nursery / all benches */
  batchId: batchRef,
  legacyBatchLabel,
  date: isoDate,
  method: z.enum(IRRIGATION_METHODS),
  volumeL: num('Volume applied', 0, 1_000_000),
  durationMin: num('Duration', 0, 1440).nullable(),
  notes: text(1000),
});

export const leachateTestSchema = z.object({
  ...base,
  batchId: batchRef,
  legacyBatchLabel,
  date: isoDate,
  phIn: num('pH in', 0, 14),
  phOut: num('pH out', 0, 14).nullable(),
  ecIn: num('EC in', 0, 30),
  ecOut: num('EC out', 0, 30).nullable(),
  volumeMl: num('Leachate volume', 0, 1_000_000).nullable(),
  /** Irrigation volume applied to the same container(s), for the leaching fraction. */
  appliedMl: num('Volume applied', 0.001, 1_000_000).nullable().optional(),
});

export const substrateMixSchema = z
  .object({
    ...base,
    name: requiredText('Mix name', 120),
    components: z.array(z.object({ name: requiredText('Component name', 80), pct: pct('Component share') })).min(1, 'Add at least one component'),
    cec: num('CEC', 0, 1000).nullable(),
  })
  .refine(m => Math.abs(m.components.reduce((s, c) => s + c.pct, 0) - 100) < 0.5, { message: 'Component shares must add up to 100 %', path: ['components'] });

export const provenanceRecordSchema = z.object({
  ...base,
  seedLotId: z.string().min(1).nullable(),
  batchId: batchRef,
  legacyBatchLabel,
  collectorName: text(120),
  collectionDate: isoDate,
  lat: num('Latitude', -90, 90),
  lng: num('Longitude', -180, 180),
  elevation: num('Elevation', -500, 9000).nullable(),
  aspect: text(40),
  climateZone: text(80),
  canopyPosition: text(80),
  motherTreeCount: int('Mother trees', 1, 100000),
  genotypeMarkers: text(500),
  phenotypeTraits: text(500),
  notes: text(1000),
});

export const calibrationSchema = z.object({
  ...base,
  instrumentName: requiredText('Instrument', 120),
  instrumentType: requiredText('Instrument type', 60),
  calibrationDate: isoDate,
  nextDueDate: isoDate.nullable(),
  standardUsed: text(120),
  calibratedBy: text(120),
  notes: text(1000),
});

export const DESIGN_TYPES = ['CRD', 'RCBD', 'Latin_Square', 'Split_Plot'] as const;

export const experimentSchema = z.object({
  ...base,
  name: requiredText('Experiment name', 120),
  designType: z.enum(DESIGN_TYPES),
  blocks: int('Blocks', 1, 100),
  replicates: int('Replicates', 1, 100),
  treatments: z.array(requiredText('Treatment', 80)).min(2, 'Add at least two treatments'),
  /** Sub-plot factor levels (split-plot designs only). */
  subTreatments: z.array(requiredText('Sub-plot level', 80)).optional(),
  assignments: z.array(z.object({
    plot: z.number().int().optional(),
    block: z.number().int(),
    position: z.number().int(),
    row: z.number().int().optional(),
    col: z.number().int().optional(),
    treatment: z.string(),
    code: z.string(),
    subTreatment: z.string().optional(),
    subCode: z.string().optional(),
  })),
  blindMode: z.boolean(),
  /** Random seed of the layout, so it can be reproduced exactly. */
  seed: z.number().int().optional(),
  /** 2 = generated by the design-specific randomiser; absent = pre-fix layout (always RCBD-style). */
  layoutVersion: z.number().int().optional(),
});

export const PLACEMENT_STATUSES = ['sown', 'germinating', 'growing', 'hardening', 'ready'] as const;

export const greenhouseSchema = z.object({
  ...base,
  name: requiredText('Greenhouse name', 80),
  rows: int('Rows', 1, 50),
  cols: int('Columns', 1, 50),
  /** Occupied bench positions only (Firestore cannot store nested arrays). */
  placements: z.array(z.object({
    row: z.number().int().min(0),
    col: z.number().int().min(0),
    batchId: batchRef,
    legacyBatchLabel,
    legacySpecies: text(120).optional(),
    status: z.enum(PLACEMENT_STATUSES),
  })),
});

// ---------------------------------------------------------------------------
// Collection registry
// ---------------------------------------------------------------------------

export const schemas = {
  species: speciesSchema,
  seedLots: seedLotSchema,
  batches: batchSchema,
  germinationCounts: germinationCountSchema,
  growthMeasurements: growthMeasurementSchema,
  climateReadings: climateReadingSchema,
  fertigationEvents: fertigationEventSchema,
  pestObservations: pestObservationSchema,
  preSowingTreatments: preSowingTreatmentSchema,
  mortalityEvents: mortalityEventSchema,
  leachateTests: leachateTestSchema,
  irrigationEvents: irrigationEventSchema,
  substrateMixes: substrateMixSchema,
  provenanceRecords: provenanceRecordSchema,
  calibrations: calibrationSchema,
  experiments: experimentSchema,
  greenhouses: greenhouseSchema,
} as const;

export type CollectionName = keyof typeof schemas;
export type Entity<C extends CollectionName> = z.infer<(typeof schemas)[C]>;
/** Fields a caller supplies when creating a record (id and timestamps are set by the store). */
export type NewEntity<C extends CollectionName> = Omit<Entity<C>, 'id' | 'createdAt' | 'updatedAt'>;

export const COLLECTIONS = Object.keys(schemas) as CollectionName[];

export type Species = Entity<'species'>;
export type SeedLot = Entity<'seedLots'>;
export type Batch = Entity<'batches'>;
export type GerminationCount = Entity<'germinationCounts'>;
export type GrowthMeasurement = Entity<'growthMeasurements'>;
export type ClimateReading = Entity<'climateReadings'>;
export type FertigationEvent = Entity<'fertigationEvents'>;
export type PestObservation = Entity<'pestObservations'>;
export type PreSowingTreatment = Entity<'preSowingTreatments'>;
export type MortalityEvent = Entity<'mortalityEvents'>;
export type LeachateTest = Entity<'leachateTests'>;
export type IrrigationEvent = Entity<'irrigationEvents'>;
export type SubstrateMix = Entity<'substrateMixes'>;
export type ProvenanceRecord = Entity<'provenanceRecords'>;
export type Calibration = Entity<'calibrations'>;
export type Experiment = Entity<'experiments'>;
export type Greenhouse = Entity<'greenhouses'>;
