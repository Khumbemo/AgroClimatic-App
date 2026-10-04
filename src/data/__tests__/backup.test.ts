import { describe, expect, it } from 'vitest';
import { Repository } from '../repository';
import { LocalBackend } from '../localBackend';
import { exportBackup, restoreBackup } from '../backup';
import { seedOnce } from '../seed';
import { MemoryStorage } from './memoryStorage';

describe('backup', () => {
  it('round-trips every collection and is idempotent', async () => {
    const src = new Repository(new LocalBackend(new MemoryStorage()));
    await seedOnce(src, null, { examples: true });
    await src.add('germinationCounts', { batchId: 'ex-nb-2024-001', date: '2024-03-15', count: 12 });
    const backup = JSON.parse(JSON.stringify(await exportBackup(src, '2026-10-04T00:00:00.000Z')));

    const dst = new Repository(new LocalBackend(new MemoryStorage()));
    const first = await restoreBackup(dst, backup);
    await restoreBackup(dst, backup);
    expect(first.skipped).toEqual([]);
    const total = Object.values(backup.collections).reduce((n: number, rows) => n + (rows as unknown[]).length, 0);
    expect(first.restored).toBe(total);
    expect(await dst.list('germinationCounts')).toEqual(await src.list('germinationCounts'));
    expect(await dst.list('batches')).toEqual(await src.list('batches'));
  });

  it('skips invalid records with a reason and rejects foreign files', async () => {
    const dst = new Repository(new LocalBackend(new MemoryStorage()));
    const report = await restoreBackup(dst, {
      format: 'agroclimatic-backup', version: 2, exportedAt: '', collections: {
        climateReadings: [{ id: 'x', createdAt: '', updatedAt: '', date: '2024-01-01', tempMin: 5, tempMax: 10, tempMean: 7, humidity: 140, lightIntensity: 0, photoperiod: 10 }],
      },
    });
    expect(report.restored).toBe(0);
    expect(report.skipped[0]).toMatchObject({ collection: 'climateReadings', id: 'x', reason: expect.stringMatching(/humidity/) });
    await expect(restoreBackup(dst, { hello: 1 })).rejects.toThrow(/not an AgroClimatic backup/);
    await expect(restoreBackup(dst, { format: 'agroclimatic-backup', version: 99, collections: {} })).rejects.toThrow(/newer version/);
  });
});
