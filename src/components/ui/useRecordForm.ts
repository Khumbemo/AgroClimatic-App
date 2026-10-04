import { useState } from 'react';
import { saveErrorMessage } from '../../data/errors';

/**
 * State for an "add record" sheet: open/close, field values, and a submit helper that shows
 * validation messages and only closes and resets after a successful save.
 */
export function useRecordForm<T extends Record<string, unknown>>(initial: () => T) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<T>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof T>(key: K) => (value: T[K]) => setValues(v => ({ ...v, [key]: value }));

  const close = () => {
    setOpen(false);
    setError(null);
  };

  /** Run `save`; a thrown Error or ValidationError becomes the form message. */
  const submit = async (save: () => Promise<unknown>, { keep }: { keep?: (keyof T)[] } = {}) => {
    setSaving(true);
    try {
      await save();
      const fresh = initial();
      setValues(v => {
        const next = { ...fresh };
        keep?.forEach(k => { next[k] = v[k]; });
        return next;
      });
      setError(null);
      setOpen(false);
      return true;
    } catch (e) {
      setError(saveErrorMessage(e));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { open, openForm: () => setOpen(true), close, values, set, setValues, error, setError, submit, saving };
}

/** Parse optional numeric inputs kept as strings. */
export const num = (v: string): number | undefined => (v.trim() === '' ? undefined : Number(v));
export const numOrNull = (v: string): number | null => (v.trim() === '' ? null : Number(v));
/** Required number: blank becomes NaN so validation reports the field by name. */
export const req = (v: string): number => (v.trim() === '' ? Number.NaN : Number(v));
export const today = () => new Date().toISOString().slice(0, 10);
