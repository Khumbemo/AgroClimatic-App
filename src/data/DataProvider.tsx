import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { IS_DEMO } from '../config';
import { Repository } from './repository';
import { LocalBackend, browserStorage } from './localBackend';
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

  // Demo mode stores locally and is ready at once. Real accounts load the Firestore SDK
  // (≈540 KB) on demand, so the demo and the first paint never download it.
  const demoRepo = useMemo(() => (IS_DEMO ? new Repository(new LocalBackend(browserStorage())) : null), []);
  const [cloud, setCloud] = useState<{ uid: string; repo: Repository } | null>(null);
  const repo = demoRepo ?? (cloud?.uid === uid ? cloud.repo : null);

  useEffect(() => {
    if (IS_DEMO) return;
    let cancelled = false;
    Promise.all([import('../firebase/config'), import('./firestoreBackend')])
      .then(([{ getDb }, { FirestoreBackend }]) => {
        if (!cancelled) setCloud({ uid, repo: new Repository(new FirestoreBackend(getDb(), uid)) });
      })
      .catch(e => console.error('Could not load the database', e));
    return () => { cancelled = true; };
  }, [uid]);

  const [prepared, setPrepared] = useState<{ repo: Repository; migration: MigrationReport | null } | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);

  useEffect(() => {
    if (!repo) return;
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

  useEffect(() => repo?.backend.onError(e => setWriteError(e.message)), [repo]);

  const value = useMemo(
    () =>
      repo && {
        repo,
        status: prepared?.repo === repo ? ('ready' as const) : ('preparing' as const),
        migration: prepared?.repo === repo ? prepared.migration : null,
      },
    [repo, prepared],
  );

  if (!value) return <p className="text-sm text-gray-500 py-16 text-center">Opening your records…</p>;

  return (
    <DataContext.Provider value={value}>
      {children}
      {writeError && (
        <div role="alert" className="fixed left-4 right-4 bottom-20 z-70 max-w-md mx-auto bg-red-50 border border-red-200 text-red-800 text-sm rounded-md p-3 flex gap-3 items-start">
          <span className="flex-1">{writeError}</span>
          <button onClick={() => setWriteError(null)} className="text-red-700 font-medium">Dismiss</button>
        </div>
      )}
    </DataContext.Provider>
  );
};
