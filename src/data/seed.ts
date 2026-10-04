import type { Repository } from './repository';
import type { KeyValueStorage } from './localBackend';
import type { Batch, SeedLot, Species } from './schema';

const seededKey = (scope: string) => `ac.v2.seeded.${scope}`;
const T0 = '2024-01-01T00:00:00.000Z';

/** Reference species list. Seed storage behaviour per published storage studies. */
export const REFERENCE_SPECIES: Species[] = [
  { id: 'sp-pinus-roxburghii', botanicalName: 'Pinus roxburghii', commonName: 'Chir pine', family: 'Pinaceae', storageBehaviour: 'orthodox', createdAt: T0, updatedAt: T0 },
  {
    id: 'sp-cedrus-deodara', botanicalName: 'Cedrus deodara', commonName: 'Deodar cedar', family: 'Pinaceae', storageBehaviour: 'sub-orthodox',
    notes: 'Short-lived at ambient temperature; remains viable >650 days at about 10 % moisture content and −5 °C.',
    createdAt: T0, updatedAt: T0,
  },
  { id: 'sp-abies-pindrow', botanicalName: 'Abies pindrow', commonName: 'Pindrow fir', family: 'Pinaceae', storageBehaviour: 'orthodox', createdAt: T0, updatedAt: T0 },
];

/** Example records for the demo build only, marked isExample so the UI can label them. */
const EXAMPLE_SEED_LOTS: SeedLot[] = [
  { id: 'ex-sl-001', lotNumber: 'SL-001', speciesId: 'sp-pinus-roxburghii', collectionDate: '2023-11-15', stockKg: 12.5, isExample: true, createdAt: T0, updatedAt: T0 },
  { id: 'ex-sl-002', lotNumber: 'SL-002', speciesId: 'sp-cedrus-deodara', collectionDate: '2023-12-01', stockKg: 5, isExample: true, createdAt: T0, updatedAt: T0 },
];

const EXAMPLE_BATCHES: Batch[] = [
  {
    id: 'ex-nb-2024-001', batchNumber: 'NB-2024-001', speciesId: 'sp-pinus-roxburghii', seedLotId: 'ex-sl-001', sowingDate: '2024-03-10',
    seedsSown: 1000, bedTrayNumber: 'B-01', substrateMix: 'Coir : soil (70 : 30)', areaSownM2: 2, status: 'growing', isExample: true, createdAt: T0, updatedAt: T0,
  },
  {
    id: 'ex-nb-2024-002', batchNumber: 'NB-2024-002', speciesId: 'sp-cedrus-deodara', seedLotId: 'ex-sl-002', sowingDate: '2024-03-15',
    seedsSown: 500, bedTrayNumber: 'T-15', substrateMix: 'Sand : coir', areaSownM2: 1, status: 'germinating', isExample: true, createdAt: T0, updatedAt: T0,
  },
];

/**
 * Add reference data once per scope. Example records are only added in demo mode and only
 * into an empty store, so real accounts never receive invented records.
 */
export async function seedOnce(repo: Repository, storage: KeyValueStorage | null, { examples }: { examples: boolean }) {
  const key = seededKey(repo.backend.scope);
  try {
    if (storage?.getItem(key)) return;
  } catch {
    // Storage blocked: fall through; the emptiness checks below keep seeding idempotent.
  }

  if ((await repo.list('species')).length === 0) {
    for (const s of REFERENCE_SPECIES) await repo.put('species', s);
  }
  if (examples) {
    if ((await repo.list('seedLots')).length === 0) for (const l of EXAMPLE_SEED_LOTS) await repo.put('seedLots', l);
    if ((await repo.list('batches')).length === 0) for (const b of EXAMPLE_BATCHES) await repo.put('batches', b);
  }

  try {
    storage?.setItem(key, new Date().toISOString());
  } catch {
    // Not persisted; harmless for the same reason as above.
  }
}
