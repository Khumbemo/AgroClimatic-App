import { describe, expect, it } from 'vitest';
import { Repository } from '../repository';
import { LocalBackend } from '../localBackend';
import { migrateLegacy, quarantineKey, runMigrationOnce } from '../migrateLegacy';
import { seedOnce } from '../seed';
import { MemoryStorage } from './memoryStorage';

const NOW = '2026-10-04T00:00:00.000Z';

function legacyStore(data: Record<string, unknown>) {
  const s = new MemoryStorage();
  for (const [k, v] of Object.entries(data)) s.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  return s;
}

describe('migrateLegacy', () => {
  it('moves records, links labels to existing batches and creates flagged placeholders', async () => {
    const storage = legacyStore({
      ac_germination_logs: [
        { id: 'GL-1712000000000', batchId: 'NB-2024-001', date: '2024-03-15', count: 10 },
        { id: 'GL-1712000000001', batchId: 'BATCH-001', date: '2024-03-16', count: 5 },
      ],
      ac_morpho_logs: [{ id: 'ML-1', batchId: 'batch-001 ', date: '2024-04-01', sampleSize: 30, avgHeightCm: 5, avgRCDmm: 1.2, avgLeaves: 0 }],
    });
    const repo = new Repository(new LocalBackend(storage));
    await seedOnce(repo, storage, { examples: true }); // provides NB-2024-001
    const report = await migrateLegacy(repo, storage, NOW);

    expect(report.migrated).toEqual({ germinationCounts: 2, growthMeasurements: 1 });
    expect(report.linkedToExistingBatch).toBe(1);
    expect(report.placeholderBatches).toEqual([{ id: 'legacy-batch-001', batchNumber: 'BATCH-001' }]);

    const counts = await repo.list('germinationCounts');
    expect(counts.find(c => c.id === 'GL-1712000000000')).toMatchObject({ batchId: 'ex-nb-2024-001' });
    expect(counts.find(c => c.id === 'GL-1712000000001')).toMatchObject({ batchId: 'legacy-batch-001', legacyBatchLabel: 'BATCH-001' });
    // labels match case- and whitespace-insensitively
    expect((await repo.list('growthMeasurements'))[0].batchId).toBe('legacy-batch-001');
    // creation time recovered from the legacy id
    expect(counts.find(c => c.id === 'GL-1712000000000')!.createdAt).toBe(new Date(1712000000000).toISOString());

    const ph = (await repo.list('batches')).find(b => b.id === 'legacy-batch-001')!;
    expect(ph).toMatchObject({ needsReview: true, sowingDate: null, speciesId: null });
  });

  it('never deletes legacy keys and is idempotent', async () => {
    const legacy = { ac_climate_logs: [{ id: 'CL-1', date: '2024-05-01', tempMin: 12, tempMax: 28, tempMean: 20, humidity: 70, lightIntensity: 0, photoperiod: 12 }] };
    const storage = legacyStore(legacy);
    const repo = new Repository(new LocalBackend(storage));
    const first = await runMigrationOnce(repo, storage);
    await migrateLegacy(repo, storage, NOW); // forced re-run
    expect(await repo.list('climateReadings')).toHaveLength(1);
    expect(storage.getItem('ac_climate_logs')).toBe(JSON.stringify(legacy.ac_climate_logs));
    expect(await runMigrationOnce(repo, storage)).toEqual(first); // flag short-circuits
  });

  it('quarantines invalid records with a reason instead of dropping them', async () => {
    const storage = legacyStore({
      ac_climate_logs: [
        { id: 'CL-ok', date: '2024-05-01', tempMin: 12, tempMax: 28, tempMean: 20, humidity: 70 },
        { id: 'CL-bad', date: '2024-05-02', tempMin: 12, tempMax: 28, tempMean: 20, humidity: 170 },
      ],
    });
    const repo = new Repository(new LocalBackend(storage));
    const report = await migrateLegacy(repo, storage, NOW);
    expect(report.migrated.climateReadings).toBe(1);
    expect(report.quarantined).toBe(1);
    const q = JSON.parse(storage.getItem(quarantineKey('demo'))!);
    expect(q[0]).toMatchObject({ legacyKey: 'ac_climate_logs', reason: expect.stringMatching(/humidity/), record: { id: 'CL-bad' } });
  });

  it('maps old "0 means missing" fields to null and string coordinates to numbers', async () => {
    const storage = legacyStore({
      ac_leachate: [{ id: 'LL-1', date: '2024-05-01', batchId: '', phIn: 6.5, phOut: 0, ecIn: 1.2, ecOut: 0, volumeMl: 0 }],
      ac_provenance: [{ id: 'PRV-1', batchId: '', collectorName: 'A', collectionDate: '2023-10-01', lat: '30.73', lng: '79.07', elevation: '', motherTreeCount: 5 }],
      ac_calibration: [{ id: 'CAL-1', instrumentName: 'EC-1', instrumentType: 'EC Meter', calibrationDate: '2024-01-01', nextDueDate: '' }],
    });
    const repo = new Repository(new LocalBackend(storage));
    await migrateLegacy(repo, storage, NOW);
    expect((await repo.list('leachateTests'))[0]).toMatchObject({ batchId: null, phOut: null, ecOut: null, volumeMl: null });
    expect((await repo.list('provenanceRecords'))[0]).toMatchObject({ lat: 30.73, lng: 79.07, elevation: null });
    expect((await repo.list('calibrations'))[0].nextDueDate).toBeNull();
  });

  it('copies seed totals and sowing dates only when unambiguous', async () => {
    const storage = legacyStore({
      ac_germination_logs: [{ id: 'GL-1', batchId: 'BATCH-001', date: '2024-03-15', count: 10 }],
      ac_germ_total_seeds: '250',
      ac_mortality: [
        { id: 'M-1', batchId: 'BATCH-001', date: '2024-04-01', sowingDate: '2024-03-01', count: 2, causeCode: 'Desiccation', daysToDeath: 31, notes: '' },
        { id: 'M-2', batchId: 'BATCH-002', date: '2024-04-01', sowingDate: '2024-03-01', count: 1, causeCode: 'Unknown', daysToDeath: 31, notes: '' },
        { id: 'M-3', batchId: 'BATCH-002', date: '2024-04-02', sowingDate: '2024-03-05', count: 1, causeCode: 'Unknown', daysToDeath: 28, notes: '' },
      ],
      ac_mort_total: '300',
    });
    const repo = new Repository(new LocalBackend(storage));
    const report = await migrateLegacy(repo, storage, NOW);
    const batches = await repo.list('batches');
    const b1 = batches.find(b => b.batchNumber === 'BATCH-001')!;
    const b2 = batches.find(b => b.batchNumber === 'BATCH-002')!;
    expect(b1.seedsSown).toBe(250);           // germination tool used only this label
    expect(b1.sowingDate).toBe('2024-03-01'); // single consistent sowing date
    expect(b2.seedsSown).toBeNull();          // mortality total spanned two labels
    expect(b2.sowingDate).toBeNull();         // conflicting sowing dates
    expect(report.notes.join(' ')).toMatch(/several batch labels/);
  });

  it('converts bench grids to flat placements (Firestore cannot store nested arrays)', async () => {
    const storage = legacyStore({
      ac_spatial_layouts: [{ id: 'GH-1', name: 'House A', rows: 2, cols: 2, cells: [[null, { batchId: 'B-9', species: 'Abies', status: 'growing' }], [null, null]] }],
    });
    const repo = new Repository(new LocalBackend(storage));
    await migrateLegacy(repo, storage, NOW);
    const [gh] = await repo.list('greenhouses');
    expect(gh.placements).toEqual([{ row: 0, col: 1, batchId: 'legacy-b-9', legacyBatchLabel: 'B-9', legacySpecies: 'Abies', status: 'growing' }]);
  });
});

describe('seedOnce', () => {
  it('adds reference species everywhere but examples only when asked, once', async () => {
    const storage = new MemoryStorage();
    const real = new Repository(new LocalBackend(storage, 'user-1'));
    await seedOnce(real, storage, { examples: false });
    expect(await real.list('species')).toHaveLength(3);
    expect(await real.list('batches')).toHaveLength(0);

    const demo = new Repository(new LocalBackend(new MemoryStorage()));
    await seedOnce(demo, storage, { examples: true });
    await seedOnce(demo, storage, { examples: true });
    expect(await demo.list('batches')).toHaveLength(2);
    expect((await demo.list('batches')).every(b => b.isExample)).toBe(true);
  });
});
