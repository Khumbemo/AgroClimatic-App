import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, X } from 'lucide-react';
import { useData } from '../../data/hooks';
import { hasLegacyData } from '../../data/migrateLegacy';

const dismissKey = (completedAt: string) => `ac.v2.migrationNoticeDismissed.${completedAt}`;

const readDismissed = (key: string) => {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
};

/** One-time summary of what the v2 data upgrade did with records saved by older versions. */
const MigrationNotice = () => {
  const { migration } = useData();
  const key = migration ? dismissKey(migration.completedAt) : '';
  const [dismissed, setDismissed] = useState(() => (key ? readDismissed(key) : false));
  if (!migration || !hasLegacyData(migration) || dismissed || readDismissed(key)) return null;

  const moved = Object.values(migration.migrated).reduce((s, n) => s + (n ?? 0), 0);
  const review = migration.placeholderBatches.length;
  const dismiss = () => {
    try { localStorage.setItem(key, '1'); } catch { /* shown again next visit; harmless */ }
    setDismissed(true);
  };

  return (
    <section className="bento-card border-green-300 bg-green-50 p-4 flex gap-3" aria-label="Data upgrade">
      <Database className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm text-green-950 space-y-1">
        <p className="font-medium">Your saved records were moved to the linked database.</p>
        <p>{moved} record{moved === 1 ? '' : 's'} moved; the originals are kept in this browser as a backup.</p>
        {review > 0 && (
          <p>
            {review} batch{review === 1 ? ' was' : 'es were'} created from batch names you typed earlier.{' '}
            <Link to="/nursery" className="font-medium underline">Review batches</Link>
          </p>
        )}
        {migration.quarantined > 0 && (
          <p className="text-amber-900">{migration.quarantined} record{migration.quarantined === 1 ? '' : 's'} had values outside valid ranges and were not moved. They remain in the original saved data.</p>
        )}
        {migration.notes.map(n => <p key={n} className="text-amber-900">{n}</p>)}
      </div>
      <button onClick={dismiss} aria-label="Dismiss" className="p-1 h-fit rounded-sm hover:bg-green-100 text-green-800"><X className="w-4 h-4" /></button>
    </section>
  );
};

export default MigrationNotice;
