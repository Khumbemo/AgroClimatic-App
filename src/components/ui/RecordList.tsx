import { useState, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import Button from './Button';

export type RecordValue = { label: string; value: ReactNode; unit?: string };

export type RecordView = {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  values?: RecordValue[];
  note?: ReactNode;
  badges?: ReactNode;
};

type Props = {
  rows: RecordView[];
  onDelete?: (id: string) => Promise<void> | void;
  /** Accessible name for the list, e.g. "Climate readings". */
  label: string;
};

/** Records as rows with labelled values; deletion asks for confirmation in place. */
const RecordList = ({ rows, onDelete, label }: Props) => {
  const [confirming, setConfirming] = useState<string | null>(null);
  return (
    <ul aria-label={label} className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
      {rows.map(r => (
        <li key={r.id} className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900">{r.title}</span>
                {r.badges}
              </div>
              {r.meta && <p className="text-[11px] text-gray-500 font-mono-sci mt-0.5">{r.meta}</p>}
            </div>
            {onDelete && confirming !== r.id && (
              <button onClick={() => setConfirming(r.id)} aria-label="Delete record" className="p-1.5 -mr-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          {r.values && r.values.length > 0 && (
            <dl className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5">
              {r.values.map(v => (
                <div key={v.label} className="min-w-0">
                  <dt className="text-[10px] uppercase tracking-[0.08em] text-gray-500 truncate">{v.label}</dt>
                  <dd className="font-mono-sci text-sm text-gray-900">
                    {v.value ?? '—'}
                    {v.unit && v.value != null && v.value !== '—' && <span className="text-xs text-gray-500 ml-0.5">{v.unit}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {r.note && <p className="text-xs text-gray-600 mt-2">{r.note}</p>}
          {onDelete && confirming === r.id && (
            <div className="mt-3 flex items-center justify-end gap-2 bg-red-50 border border-red-200 rounded-md p-2" role="group" aria-label="Confirm delete">
              <span className="text-xs text-red-800 mr-auto">Delete this record? This can't be undone.</span>
              <Button size="sm" variant="secondary" onClick={() => setConfirming(null)}>Cancel</Button>
              <Button size="sm" variant="danger" onClick={async () => { await onDelete(r.id); setConfirming(null); }}>Delete</Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
};

export default RecordList;
