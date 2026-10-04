import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc, type Firestore, type Unsubscribe } from 'firebase/firestore';
import type { Backend } from './repository';
import type { CollectionName, Entity } from './schema';

type AnyEntity = Entity<CollectionName>;

/**
 * Stores each collection at users/{uid}/{collection} in Firestore. Firestore's persistent
 * local cache applies writes immediately and syncs when online, so writes are not awaited
 * (offline, the server acknowledgement would never arrive); failures surface via onError.
 */
export class FirestoreBackend implements Backend {
  readonly persistent = true;
  readonly scope: string;
  private readonly db: Firestore;
  private readonly uid: string;
  private readonly cache = new Map<CollectionName, readonly AnyEntity[]>();
  private readonly listeners = new Map<CollectionName, Set<() => void>>();
  private readonly live = new Map<CollectionName, Unsubscribe>();
  private readonly errorListeners = new Set<(e: Error) => void>();

  constructor(db: Firestore, uid: string) {
    this.db = db;
    this.uid = uid;
    this.scope = uid;
  }

  private ref(col: CollectionName) {
    return collection(this.db, 'users', this.uid, col);
  }

  private emitError(e: Error) {
    console.error(e);
    this.errorListeners.forEach(l => l(e));
  }

  private notify(col: CollectionName) {
    this.listeners.get(col)?.forEach(l => l());
  }

  getSnapshot(col: CollectionName) {
    return this.cache.get(col);
  }

  subscribe(col: CollectionName, onChange: () => void) {
    let set = this.listeners.get(col);
    if (!set) this.listeners.set(col, (set = new Set()));
    set.add(onChange);
    if (!this.live.has(col)) {
      const unsub = onSnapshot(
        this.ref(col),
        snap => {
          this.cache.set(col, snap.docs.map(d => ({ ...(d.data() as AnyEntity), id: d.id })));
          this.notify(col);
        },
        err => this.emitError(new Error(`Could not load ${col}: ${err.message}`)),
      );
      this.live.set(col, unsub);
    }
    return () => {
      set.delete(onChange);
      if (set.size === 0) {
        this.live.get(col)?.();
        this.live.delete(col);
      }
    };
  }

  async load(col: CollectionName) {
    const cached = this.cache.get(col);
    if (cached && this.live.has(col)) return cached;
    const snap = await getDocs(this.ref(col));
    return snap.docs.map(d => ({ ...(d.data() as AnyEntity), id: d.id }));
  }

  async put(col: CollectionName, record: AnyEntity) {
    setDoc(doc(this.ref(col), record.id), record).catch(e =>
      this.emitError(new Error(`Could not save to ${col}: ${(e as Error).message}`)),
    );
  }

  async remove(col: CollectionName, id: string) {
    deleteDoc(doc(this.ref(col), id)).catch(e =>
      this.emitError(new Error(`Could not delete from ${col}: ${(e as Error).message}`)),
    );
  }

  onError(listener: (e: Error) => void) {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }
}
