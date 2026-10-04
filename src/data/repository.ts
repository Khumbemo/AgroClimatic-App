import type { ZodIssue } from 'zod';
import { schemas, type CollectionName, type Entity, type NewEntity } from './schema';

/**
 * Storage backend contract. Backends hold an in-memory snapshot per collection so React can
 * read it synchronously (useSyncExternalStore); writes are applied to that snapshot at once
 * and persisted in the background, which keeps the app usable offline.
 */
export interface Backend {
  /** Current records, or undefined while the collection is still loading. */
  getSnapshot(col: CollectionName): readonly Entity<CollectionName>[] | undefined;
  subscribe(col: CollectionName, onChange: () => void): () => void;
  /** Resolves with the records once the collection has loaded. */
  load(col: CollectionName): Promise<readonly Entity<CollectionName>[]>;
  /** Insert or replace a whole record by id. */
  put(col: CollectionName, record: Entity<CollectionName>): Promise<void>;
  remove(col: CollectionName, id: string): Promise<void>;
  /** Persistence failures that happen after a write was accepted locally. */
  onError(listener: (error: Error) => void): () => void;
  /** False when records can't be saved beyond this session (e.g. storage blocked). */
  readonly persistent: boolean;
  /** Scope used to key one-off jobs such as migration ('demo' or the user id). */
  readonly scope: string;
}

export type FieldIssue = { field: string; message: string };

export class ValidationError extends Error {
  readonly issues: FieldIssue[];
  constructor(collection: string, issues: ZodIssue[]) {
    const mapped = issues.map(i => ({ field: i.path.join('.') || '(record)', message: i.message }));
    super(`Invalid ${collection} record: ${mapped.map(i => `${i.field}: ${i.message}`).join('; ')}`);
    this.name = 'ValidationError';
    this.issues = mapped;
  }
}

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Validate a full record against its collection schema. Throws ValidationError. */
export const validate = <C extends CollectionName>(col: C, record: unknown): Entity<C> => {
  const result = schemas[col].safeParse(record);
  if (!result.success) throw new ValidationError(col, result.error.issues);
  return result.data as Entity<C>;
};

/** Validated create / update / delete on top of a backend. */
export class Repository {
  readonly backend: Backend;
  private readonly now: () => string;

  constructor(backend: Backend, now: () => string = () => new Date().toISOString()) {
    this.backend = backend;
    this.now = now;
  }

  async add<C extends CollectionName>(col: C, data: NewEntity<C>): Promise<Entity<C>> {
    const ts = this.now();
    const record = validate(col, { ...data, id: newId(), createdAt: ts, updatedAt: ts });
    await this.backend.put(col, record as Entity<CollectionName>);
    return record;
  }

  async update<C extends CollectionName>(col: C, id: string, patch: Partial<NewEntity<C>>): Promise<Entity<C>> {
    const existing = (await this.backend.load(col)).find(r => r.id === id);
    if (!existing) throw new Error(`No ${col} record with id ${id}`);
    const record = validate(col, { ...existing, ...patch, id, createdAt: existing.createdAt, updatedAt: this.now() });
    await this.backend.put(col, record as Entity<CollectionName>);
    return record;
  }

  /** Insert or replace a complete record, keeping its id (used by migration and seeding). */
  async put<C extends CollectionName>(col: C, record: Entity<C>): Promise<Entity<C>> {
    const valid = validate(col, record);
    await this.backend.put(col, valid as Entity<CollectionName>);
    return valid;
  }

  remove(col: CollectionName, id: string): Promise<void> {
    return this.backend.remove(col, id);
  }

  async list<C extends CollectionName>(col: C): Promise<Entity<C>[]> {
    return [...(await this.backend.load(col))] as Entity<C>[];
  }
}
