import { ValidationError, type Repository } from './repository';
import { COLLECTIONS, type CollectionName, type Entity } from './schema';

export const BACKUP_FORMAT = 'agroclimatic-backup';
export const BACKUP_VERSION = 2;

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  collections: Partial<Record<CollectionName, unknown[]>>;
};

/** Snapshot every collection into one JSON-serialisable object. */
export async function exportBackup(repo: Repository, now = new Date().toISOString()): Promise<Backup> {
  const collections: Backup['collections'] = {};
  for (const col of COLLECTIONS) collections[col] = await repo.list(col);
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now, collections };
}

export type RestoreReport = { restored: number; skipped: { collection: string; id: string; reason: string }[] };

/**
 * Restore records from a backup. Records are validated and upserted by id, so restoring the
 * same file twice does not duplicate anything and existing records not in the file are kept.
 */
export async function restoreBackup(repo: Repository, raw: unknown): Promise<RestoreReport> {
  if (!raw || typeof raw !== 'object' || (raw as Backup).format !== BACKUP_FORMAT) {
    throw new Error('This file is not an AgroClimatic backup.');
  }
  const backup = raw as Backup;
  if (typeof backup.version !== 'number' || backup.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of the app.');
  }
  const report: RestoreReport = { restored: 0, skipped: [] };
  // Reference data first so links resolve in order
  for (const col of COLLECTIONS) {
    const rows = backup.collections?.[col];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const id = String((row as { id?: unknown })?.id ?? '?');
      try {
        await repo.put(col, row as Entity<typeof col>);
        report.restored++;
      } catch (e) {
        report.skipped.push({ collection: col, id, reason: e instanceof ValidationError ? e.issues.map(i => `${i.field}: ${i.message}`).join('; ') : (e as Error).message });
      }
    }
  }
  return report;
}
