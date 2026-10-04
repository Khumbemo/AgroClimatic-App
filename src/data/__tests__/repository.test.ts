import { describe, expect, it } from 'vitest';
import { Repository, ValidationError } from '../repository';
import { LocalBackend } from '../localBackend';
import { FailingStorage, MemoryStorage } from './memoryStorage';

const makeRepo = (storage = new MemoryStorage()) => ({ storage, repo: new Repository(new LocalBackend(storage)) });

const batch = {
  batchNumber: 'NB-1', speciesId: null, seedLotId: null, sowingDate: '2024-03-10', seedsSown: 100, status: 'sown' as const,
};

describe('Repository + LocalBackend', () => {
  it('adds a record with id and timestamps and persists it', async () => {
    const { repo, storage } = makeRepo();
    const b = await repo.add('batches', batch);
    expect(b.id).toBeTruthy();
    expect(b.createdAt).toBe(b.updatedAt);
    expect(JSON.parse(storage.getItem('ac.v2.batches')!)).toHaveLength(1);
    // a fresh backend on the same storage reads it back
    expect(await new Repository(new LocalBackend(storage)).list('batches')).toEqual([b]);
  });

  it('rejects out-of-range values with field-level issues', async () => {
    const { repo } = makeRepo();
    const bad = repo.add('climateReadings', { date: '2024-05-01', tempMin: 10, tempMax: 30, tempMean: 20, humidity: 120, lightIntensity: 0, photoperiod: 12 });
    await expect(bad).rejects.toBeInstanceOf(ValidationError);
    await expect(bad).rejects.toMatchObject({ issues: [{ field: 'humidity', message: 'Relative humidity must be ≤ 100' }] });
  });

  it('checks cross-field rules (min ≤ mean ≤ max)', async () => {
    const { repo } = makeRepo();
    await expect(
      repo.add('climateReadings', { date: '2024-05-01', tempMin: 25, tempMax: 20, tempMean: 22, humidity: 60, lightIntensity: 0, photoperiod: 12 }),
    ).rejects.toThrow(/Minimum temperature is above the maximum/);
  });

  it('rejects impossible calendar dates', async () => {
    const { repo } = makeRepo();
    await expect(repo.add('germinationCounts', { batchId: null, date: '2024-02-31', count: 1 })).rejects.toThrow(/valid calendar date/);
  });

  it('updates keep id and createdAt, bump updatedAt, and revalidate', async () => {
    let t = 0;
    const repo = new Repository(new LocalBackend(new MemoryStorage()), () => `2024-01-01T00:00:0${t++}.000Z`);
    const b = await repo.add('batches', batch);
    const u = await repo.update('batches', b.id, { status: 'growing' });
    expect(u).toMatchObject({ id: b.id, createdAt: b.createdAt, status: 'growing' });
    expect(u.updatedAt > b.updatedAt).toBe(true);
    await expect(repo.update('batches', b.id, { seedsSown: -5 })).rejects.toBeInstanceOf(ValidationError);
    expect((await repo.list('batches'))[0].seedsSown).toBe(100);
  });

  it('notifies subscribers and returns a stable snapshot between changes', async () => {
    const { repo } = makeRepo();
    let calls = 0;
    const unsub = repo.backend.subscribe('batches', () => calls++);
    const before = repo.backend.getSnapshot('batches');
    expect(repo.backend.getSnapshot('batches')).toBe(before);
    const b = await repo.add('batches', batch);
    await repo.remove('batches', b.id);
    expect(calls).toBe(2);
    unsub();
    await repo.add('batches', batch);
    expect(calls).toBe(2);
  });

  it('keeps working in memory when storage writes fail, and reports it', async () => {
    const backend = new LocalBackend(new FailingStorage());
    const errors: string[] = [];
    backend.onError(e => errors.push(e.message));
    const repo = new Repository(backend);
    await repo.add('batches', batch);
    expect(await repo.list('batches')).toHaveLength(1);
    expect(backend.persistent).toBe(false);
    expect(errors[0]).toMatch(/only for this session/);
  });
});
