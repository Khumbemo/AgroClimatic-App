import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { IS_DEMO } from '../config';
import { getDb } from '../firebase/config';
import { Repository } from './repository';
import { LocalBackend, browserStorage } from './localBackend';
import { FirestoreBackend } from './firestoreBackend';
import { runMigrationOnce, type MigrationReport } from './migrateLegacy';
import { seedOnce } from './seed';
import { DataContext } from './context';

/**
 * Provides the data repository for the signed-in user: Firestore (users/{uid}/…) with
 * offline cache for real accounts, browser storage in demo mode. On first use it adds the
 * reference species list and moves any records saved by the pre-v2 tools.
 */
export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const uid = user?.uid ?? 'anonymous';

  const repo = useMemo(() => {
    const backend = IS_DEMO ? new LocalBackend(browserStorage()) : new FirestoreBackend(getDb(), uid);
    return new Repository(backend);
  }, [uid]);

  const [prepared, setPrepared] = useState<{ repo: Repository; migration: MigrationReport | null } | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const storage = browserStorage();
    (async () => {
      await seedOnce(repo, storage, { examples: IS_DEMO });
      const migration = storage ? await runMigrationOnce(repo, storage) : null;
      return migration;
    })()
      .then(migration => { if (!cancelled) setPrepared({ repo, migration }); })
      .catch(e => {
        console.error('Data preparation failed', e);
        if (!cancelled) setPrepared({ repo, migration: null });
      });
    return () => { cancelled = true; };
  }, [repo]);

  useEffect(() => repo.backend.onError(e => setWriteError(e.message)), [repo]);

  const value = useMemo(
    () => ({
      repo,
      status: prepared?.repo === repo ? ('ready' as const) : ('preparing' as const),
      migration: prepared?.repo === repo ? prepared.migration : null,
    }),
    [repo, prepared],
  );

  return (
    <DataContext.Provider value={value}>
      {children}
      {writeError && (
        <div role="alert" className="fixed left-4 right-4 bottom-20 z-[70] max-w-md mx-auto bg-red-50 border border-red-200 text-red-800 text-sm rounded-md p-3 flex gap-3 items-start">
          <span className="flex-1">{writeError}</span>
          <button onClick={() => setWriteError(null)} className="text-red-700 font-medium">Dismiss</button>
        </div>
      )}
    </DataContext.Provider>
  );
};
