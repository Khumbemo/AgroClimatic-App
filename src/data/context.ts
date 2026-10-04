import { createContext } from 'react';
import type { Repository } from './repository';
import type { MigrationReport } from './migrateLegacy';

export type DataContextValue = {
  repo: Repository;
  /** 'preparing' while reference data and the one-off migration run. */
  status: 'preparing' | 'ready';
  migration: MigrationReport | null;
};

export const DataContext = createContext<DataContextValue | null>(null);
