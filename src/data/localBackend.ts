import type { Backend } from './repository';
import type { CollectionName, Entity } from './schema';

type AnyEntity = Entity<CollectionName>;

/** Minimal Storage surface, so tests can pass an in-memory implementation. */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const LOCAL_PREFIX = 'ac.v2.';

/**
 * Keeps every collection as a JSON array in localStorage (demo mode). If storage is missing
 * or throws (private mode, sandboxed frames, quota), records stay in memory for the session
 * and `persistent` becomes false.
 */
export class LocalBackend implements Backend {
  readonly scope: string;
  private readonly storage: KeyValueStorage | null;
  private readonly cache = new Map<CollectionName, readonly AnyEntity[]>();
  private readonly listeners = new Map<CollectionName, Set<() => void>>();
  private readonly errorListeners = new Set<(e: Error) => void>();
  private storageWorks: boolean;

  constructor(storage: KeyValueStorage | null, scope = 'demo') {
    this.storage = storage;
    this.scope = scope;
    this.storageWorks = storage !== null;
  }

  get persistent() {
    return this.storageWorks;
  }

  private key(col: CollectionName) {
    return `${LOCAL_PREFIX}${col}`;
  }

  private read(col: CollectionName): readonly AnyEntity[] {
    const cached = this.cache.get(col);
    if (cached) return cached;
    let records: AnyEntity[] = [];
    try {
      const raw = this.storage?.getItem(this.key(col));
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) records = parsed as AnyEntity[];
      }
    } catch {
      this.storageWorks = false;
    }
    this.cache.set(col, records);
    return records;
  }

  private write(col: CollectionName, records: readonly AnyEntity[]) {
    this.cache.set(col, records);
    try {
      this.storage?.setItem(this.key(col), JSON.stringify(records));
    } catch (e) {
      this.storageWorks = false;
      this.emitError(new Error(`Could not save ${col} in this browser; changes last only for this session. (${(e as Error).message})`));
    }
    this.listeners.get(col)?.forEach(l => l());
  }

  private emitError(e: Error) {
    this.errorListeners.forEach(l => l(e));
  }

  getSnapshot(col: CollectionName) {
    return this.read(col);
  }

  subscribe(col: CollectionName, onChange: () => void) {
    let set = this.listeners.get(col);
    if (!set) this.listeners.set(col, (set = new Set()));
    set.add(onChange);
    return () => {
      set.delete(onChange);
    };
  }

  async load(col: CollectionName) {
    return this.read(col);
  }

  async put(col: CollectionName, record: AnyEntity) {
    const current = this.read(col);
    const i = current.findIndex(r => r.id === record.id);
    const next = i === -1 ? [...current, record] : current.map((r, j) => (j === i ? record : r));
    this.write(col, next);
  }

  async remove(col: CollectionName, id: string) {
    this.write(col, this.read(col).filter(r => r.id !== id));
  }

  onError(listener: (e: Error) => void) {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }
}

/** localStorage if it is reachable, otherwise null (memory only). */
export const browserStorage = (): KeyValueStorage | null => {
  try {
    const s = window.localStorage;
    const probe = `${LOCAL_PREFIX}probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
};
