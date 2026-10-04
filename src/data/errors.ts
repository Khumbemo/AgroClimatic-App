import { ValidationError } from './repository';

/** Human-readable message for a failed save. */
export const saveErrorMessage = (e: unknown): string =>
  e instanceof ValidationError ? e.issues.map(i => i.message).join('. ') + '.' : (e as Error)?.message || 'Could not save this record.';
