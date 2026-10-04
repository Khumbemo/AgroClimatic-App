import type { KeyValueStorage } from '../localBackend';

export class MemoryStorage implements KeyValueStorage {
  readonly map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
}

/** Storage whose writes always fail (quota exceeded / blocked). */
export class FailingStorage extends MemoryStorage {
  setItem(): void { throw new Error('QuotaExceededError'); }
}
