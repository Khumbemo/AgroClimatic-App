import { useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { DataContext } from './context';
import type { Batch, CollectionName, Entity } from './schema';

const EMPTY: readonly never[] = [];

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
};

/** Live records of one collection. `ready` is false until the first load completes. */
export function useCollection<C extends CollectionName>(col: C): { items: readonly Entity<C>[]; ready: boolean } {
  const { repo } = useData();
  const backend = repo.backend;
  const subscribe = useCallback((onChange: () => void) => backend.subscribe(col, onChange), [backend, col]);
  const getSnapshot = useCallback(() => backend.getSnapshot(col), [backend, col]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  return { items: (snapshot ?? EMPTY) as readonly Entity<C>[], ready: snapshot !== undefined };
}

/** Batches by id plus a display label ("NB-2024-001 · Pinus roxburghii"). */
export function useBatchIndex() {
  const { items: batches } = useCollection('batches');
  const { items: species } = useCollection('species');
  return useMemo(() => {
    const speciesName = new Map(species.map(s => [s.id, s.botanicalName]));
    const byId = new Map<string, Batch>(batches.map(b => [b.id, b]));
    const label = (id: string | null | undefined, legacy?: string) => {
      if (!id) return legacy ? `${legacy} (unlinked)` : 'Whole nursery';
      const b = byId.get(id);
      if (!b) return legacy ?? 'Deleted batch';
      const sp = b.speciesId ? speciesName.get(b.speciesId) : undefined;
      return sp ? `${b.batchNumber} · ${sp}` : b.batchNumber;
    };
    return { batches, byId, label, speciesName };
  }, [batches, species]);
}

/** Newest first by `date` (YYYY-MM-DD), then by creation time. */
export const byDateDesc = <T extends { date: string; createdAt: string }>(a: T, b: T) =>
  b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
