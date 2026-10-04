import { ValidationError, type Repository } from './repository';
import type { KeyValueStorage } from './localBackend';
import type { Batch, CollectionName, Entity } from './schema';

/*
  One-off move of records saved before v2 (one localStorage key per tool, free-text batch
  labels) into the linked v2 collections.

  Safety rules:
  - Legacy keys are never modified or deleted; they remain as a backup.
  - Original record ids are kept and writes are upserts, so re-running cannot duplicate.
  - Records that fail validation are quarantined with the reason, never silently dropped.
  - Free-text batch labels are linked to an existing batch with the same batch number;
    otherwise a placeholder batch is created and flagged for review. Nothing is invented:
    unknown sowing dates and seed counts stay empty.
*/

export const MIGRATION_VERSION = 2;
export const migrationFlagKey = (scope: string) => `ac.v2.migration.${scope}`;
export const quarantineKey = (scope: string) => `ac.v2.quarantine.${scope}`;

export type QuarantinedRecord = { legacyKey: string; collection: CollectionName; reason: string; record: unknown };

export type MigrationReport = {
  version: number;
  completedAt: string;
  migrated: Partial<Record<CollectionName, number>>;
  linkedToExistingBatch: number;
  placeholderBatches: { id: string; batchNumber: string }[];
  quarantined: number;
  notes: string[];
};

type Legacy = Record<string, unknown>;

// --- small coercion helpers -------------------------------------------------

const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const optNum = (v: unknown): number | undefined => {
  if (v === '' || v == null) return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
};
const nullNum = (v: unknown): number | null => optNum(v) ?? null;
/** Old forms stored "missing" as 0 for these fields (e.g. `parseFloat(x) || 0`). */
const zeroAsNull = (v: unknown): number | null => {
  const n = optNum(v);
  return n === undefined || n === 0 ? null : n;
};
const dateOrNull = (v: unknown): string | null => (/^\d{4}-\d{2}-\d{2}$/.test(str(v)) ? str(v) : null);

/** Legacy ids look like "CL-1712345678901"; use that as the creation time when present. */
const timestampFor = (r: Legacy, fallback: string): string => {
  if (typeof r.createdAt === 'string' && !Number.isNaN(Date.parse(r.createdAt))) return r.createdAt;
  const m = /-(\d{12,14})$/.exec(str(r.id));
  if (m) {
    const t = new Date(Number(m[1]));
    if (!Number.isNaN(t.getTime())) return t.toISOString();
  }
  return fallback;
};

const slug = (label: string) =>
  label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unnamed';

const readArray = (storage: KeyValueStorage, key: string): Legacy[] => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed.filter(x => x && typeof x === 'object') as Legacy[]) : [];
  } catch {
    return [];
  }
};

const readPositiveInt = (storage: KeyValueStorage, key: string): number | null => {
  try {
    const n = parseInt(storage.getItem(key) ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
};

// --- migration ----------------------------------------------------------------

export async function migrateLegacy(repo: Repository, storage: KeyValueStorage, now = new Date().toISOString()): Promise<MigrationReport> {
  const report: MigrationReport = {
    version: MIGRATION_VERSION, completedAt: now, migrated: {}, linkedToExistingBatch: 0,
    placeholderBatches: [], quarantined: 0, notes: [],
  };
  const quarantine: QuarantinedRecord[] = [];

  const legacy = {
    climate: readArray(storage, 'ac_climate_logs'),
    germination: readArray(storage, 'ac_germination_logs'),
    growth: readArray(storage, 'ac_morpho_logs'),
    fert: readArray(storage, 'ac_fert_logs'),
    pest: readArray(storage, 'ac_pest_logs'),
    presow: readArray(storage, 'ac_presow_logs'),
    mortality: readArray(storage, 'ac_mortality'),
    leachate: readArray(storage, 'ac_leachate'),
    substrates: readArray(storage, 'ac_substrates'),
    provenance: readArray(storage, 'ac_provenance'),
    calibration: readArray(storage, 'ac_calibration'),
    experiments: readArray(storage, 'ac_experiments'),
    layouts: readArray(storage, 'ac_spatial_layouts'),
  };

  // ---- 1. resolve free-text batch labels to batch ids ----
  const existing = await repo.list('batches');
  const byNumber = new Map(existing.map(b => [b.batchNumber.trim().toLowerCase(), b]));
  const placeholders = new Map<string, Batch>(); // keyed by lower-case label
  const germLabels = new Set<string>();
  const mortLabels = new Set<string>();

  const link = (rawLabel: unknown, source?: Set<string>): { batchId: string | null; legacyBatchLabel?: string } => {
    const label = str(rawLabel).trim();
    if (!label) return { batchId: null };
    const keyLabel = label.toLowerCase();
    source?.add(keyLabel);
    const match = byNumber.get(keyLabel);
    if (match) {
      report.linkedToExistingBatch++;
      return { batchId: match.id };
    }
    let ph = placeholders.get(keyLabel);
    if (!ph) {
      ph = {
        id: `legacy-${slug(label)}`, batchNumber: label, speciesId: null, seedLotId: null, sowingDate: null,
        seedsSown: null, status: 'sown', needsReview: true, createdAt: now, updatedAt: now,
        notes: 'Created from records saved before the data upgrade. Add the species, sowing date and seeds sown.',
      };
      placeholders.set(keyLabel, ph);
    }
    return { batchId: ph.id, legacyBatchLabel: label };
  };

  // ---- 2. map every legacy record to its v2 shape ----
  type Pending = { col: CollectionName; legacyKey: string; raw: Legacy; record: Record<string, unknown> };
  const pending: Pending[] = [];
  const add = (col: CollectionName, legacyKey: string, raw: Legacy, fields: Record<string, unknown>) => {
    const ts = timestampFor(raw, now);
    pending.push({ col, legacyKey, raw, record: { id: str(raw.id) || `${col}-${pending.length}`, createdAt: ts, updatedAt: ts, ...fields } });
  };

  for (const r of legacy.climate) {
    const tMin = optNum(r.tempMin), tMax = optNum(r.tempMax);
    add('climateReadings', 'ac_climate_logs', r, {
      date: str(r.date), tempMin: tMin, tempMax: tMax,
      tempMean: optNum(r.tempMean) ?? (tMin !== undefined && tMax !== undefined ? (tMin + tMax) / 2 : undefined),
      humidity: optNum(r.humidity), lightIntensity: optNum(r.lightIntensity) ?? 0, photoperiod: optNum(r.photoperiod) ?? 0,
      co2: optNum(r.co2),
    });
  }
  for (const r of legacy.germination) {
    add('germinationCounts', 'ac_germination_logs', r, { ...link(r.batchId, germLabels), date: str(r.date), count: optNum(r.count) });
  }
  for (const r of legacy.growth) {
    add('growthMeasurements', 'ac_morpho_logs', r, {
      ...link(r.batchId), date: str(r.date), sampleSize: optNum(r.sampleSize) ?? 1,
      avgHeightCm: optNum(r.avgHeightCm), avgRCDmm: optNum(r.avgRCDmm), avgLeaves: optNum(r.avgLeaves),
      leafAreaIndex: optNum(r.leafAreaIndex), shootDryWeight: optNum(r.shootDryWeight), rootDryWeight: optNum(r.rootDryWeight),
    });
  }
  for (const r of legacy.fert) {
    add('fertigationEvents', 'ac_fert_logs', r, {
      ...link(r.batchId), date: str(r.date), npkRatio: str(r.npkRatio), dosage: optNum(r.dosage), ph: optNum(r.ph), ec: optNum(r.ec),
    });
  }
  for (const r of legacy.pest) {
    add('pestObservations', 'ac_pest_logs', r, {
      ...link(r.batchId), date: str(r.date), pestDiseaseName: str(r.pestDiseaseName),
      incidencePercentage: optNum(r.incidencePercentage) ?? 0, severityScale: optNum(r.severityScale) ?? 1,
      treatmentChemical: str(r.treatmentChemical) || undefined,
    });
  }
  for (const r of legacy.presow) {
    add('preSowingTreatments', 'ac_presow_logs', r, {
      ...link(r.batchId), date: str(r.date), treatmentType: str(r.treatmentType) || 'other',
      duration: str(r.duration), concentration: str(r.concentration), notes: str(r.notes),
    });
  }
  for (const r of legacy.mortality) {
    add('mortalityEvents', 'ac_mortality', r, {
      ...link(r.batchId, mortLabels), date: str(r.date), sowingDate: dateOrNull(r.sowingDate), count: optNum(r.count),
      causeCode: str(r.causeCode) || 'Unknown', daysToDeath: nullNum(r.daysToDeath), notes: str(r.notes),
    });
  }
  for (const r of legacy.leachate) {
    add('leachateTests', 'ac_leachate', r, {
      ...link(r.batchId), date: str(r.date), phIn: optNum(r.phIn), phOut: zeroAsNull(r.phOut),
      ecIn: optNum(r.ecIn), ecOut: zeroAsNull(r.ecOut), volumeMl: zeroAsNull(r.volumeMl),
    });
  }
  for (const r of legacy.substrates) {
    const components = Array.isArray(r.components)
      ? (r.components as Legacy[]).map(c => ({ name: str(c.name), pct: optNum(c.pct) ?? 0 })).filter(c => c.pct > 0)
      : [];
    add('substrateMixes', 'ac_substrates', r, { name: str(r.name), components, cec: zeroAsNull(r.cec) });
  }
  for (const r of legacy.provenance) {
    add('provenanceRecords', 'ac_provenance', r, {
      ...link(r.batchId), seedLotId: null, collectorName: str(r.collectorName), collectionDate: str(r.collectionDate),
      lat: optNum(r.lat), lng: optNum(r.lng), elevation: nullNum(r.elevation), aspect: str(r.aspect),
      climateZone: str(r.climateZone), canopyPosition: str(r.canopyPosition), motherTreeCount: optNum(r.motherTreeCount) ?? 1,
      genotypeMarkers: str(r.genotypeMarkers), phenotypeTraits: str(r.phenotypeTraits), notes: str(r.notes),
    });
  }
  for (const r of legacy.calibration) {
    add('calibrations', 'ac_calibration', r, {
      instrumentName: str(r.instrumentName), instrumentType: str(r.instrumentType) || 'Other',
      calibrationDate: str(r.calibrationDate), nextDueDate: dateOrNull(r.nextDueDate),
      standardUsed: str(r.standardUsed), calibratedBy: str(r.calibratedBy), notes: str(r.notes),
    });
  }
  for (const r of legacy.experiments) {
    add('experiments', 'ac_experiments', r, {
      name: str(r.name), designType: str(r.designType), blocks: optNum(r.blocks), replicates: optNum(r.replicates),
      treatments: Array.isArray(r.treatments) ? r.treatments.map(str) : [],
      assignments: Array.isArray(r.assignments) ? r.assignments : [], blindMode: Boolean(r.blindMode),
    });
  }
  for (const r of legacy.layouts) {
    const placements: Record<string, unknown>[] = [];
    if (Array.isArray(r.cells)) {
      (r.cells as unknown[]).forEach((row, ri) => {
        if (!Array.isArray(row)) return;
        row.forEach((cell, ci) => {
          if (!cell || typeof cell !== 'object') return;
          const c = cell as Legacy;
          if (!c.status || c.status === 'empty') return;
          placements.push({ row: ri, col: ci, ...link(c.batchId), legacySpecies: str(c.species) || undefined, status: str(c.status) });
        });
      });
    }
    add('greenhouses', 'ac_spatial_layouts', r, { name: str(r.name), rows: optNum(r.rows), cols: optNum(r.cols), placements });
  }

  // ---- 3. fill placeholder batch details only where the old data is unambiguous ----
  const germTotal = readPositiveInt(storage, 'ac_germ_total_seeds');
  const mortTotal = readPositiveInt(storage, 'ac_mort_total');
  const onlyPlaceholder = (labels: Set<string>) => (labels.size === 1 ? placeholders.get([...labels][0]) : undefined);

  const gp = onlyPlaceholder(germLabels);
  if (gp && germTotal) gp.seedsSown = germTotal;
  const mp = onlyPlaceholder(mortLabels);
  if (mp && mortTotal) {
    if (mp.seedsSown == null) mp.seedsSown = mortTotal;
    else if (mp.seedsSown !== mortTotal) report.notes.push(`Germination and mortality tools had different seed totals for ${mp.batchNumber} (${mp.seedsSown} vs ${mortTotal}); kept ${mp.seedsSown}.`);
  }
  if ((germTotal && germLabels.size > 1) || (mortTotal && mortLabels.size > 1)) {
    report.notes.push('The old seed total applied to several batch labels, so it was not copied to any batch. Enter seeds sown on each batch.');
  }
  // A sowing date is only filled when every mortality record for that label agrees on it.
  for (const ph of placeholders.values()) {
    const dates = new Set(
      pending.filter(p => p.col === 'mortalityEvents' && p.record.batchId === ph.id && p.record.sowingDate).map(p => p.record.sowingDate as string),
    );
    if (dates.size === 1) ph.sowingDate = [...dates][0];
  }

  // ---- 4. write: placeholder batches first so every link resolves ----
  for (const ph of placeholders.values()) {
    await repo.put('batches', ph);
    report.placeholderBatches.push({ id: ph.id, batchNumber: ph.batchNumber });
  }
  for (const p of pending) {
    try {
      await repo.put(p.col, p.record as Entity<typeof p.col>);
      report.migrated[p.col] = (report.migrated[p.col] ?? 0) + 1;
    } catch (e) {
      const reason = e instanceof ValidationError ? e.issues.map(i => `${i.field}: ${i.message}`).join('; ') : (e as Error).message;
      quarantine.push({ legacyKey: p.legacyKey, collection: p.col, reason, record: p.raw });
    }
  }

  report.quarantined = quarantine.length;
  if (quarantine.length) {
    try {
      storage.setItem(quarantineKey(repo.backend.scope), JSON.stringify(quarantine));
    } catch {
      report.notes.push('Records that could not be moved remain in the original saved data.');
    }
  }
  return report;
}

/** Run the migration once per scope; later calls return the stored report. */
export async function runMigrationOnce(repo: Repository, storage: KeyValueStorage): Promise<MigrationReport | null> {
  const flag = migrationFlagKey(repo.backend.scope);
  try {
    const done = storage.getItem(flag);
    if (done) return JSON.parse(done) as MigrationReport;
  } catch {
    return null;
  }
  const report = await migrateLegacy(repo, storage);
  try {
    storage.setItem(flag, JSON.stringify(report));
  } catch {
    // Without storage the flag can't persist; re-running later is safe because writes are upserts.
  }
  return report;
}

export const hasLegacyData = (report: MigrationReport | null) =>
  !!report && (Object.values(report.migrated).some(n => (n ?? 0) > 0) || report.quarantined > 0);
