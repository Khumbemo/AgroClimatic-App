import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ChevronRight, Calendar, Plus, AlertTriangle } from 'lucide-react';
import { useBatchIndex, useCollection } from '../../data/hooks';
import type { Batch } from '../../data/schema';

const statusChip: Record<Batch['status'], string> = {
  sown: 'bg-amber-50 text-amber-800 border-amber-200',
  germinating: 'bg-green-50 text-green-700 border-green-200',
  growing: 'bg-green-100 text-green-800 border-green-300',
  hardening: 'bg-blue-50 text-blue-700 border-blue-200',
  ready: 'bg-green-100 text-green-900 border-green-400',
  outplanted: 'bg-gray-100 text-gray-600 border-gray-200',
};

const BatchListPage: React.FC = () => {
  const { batches, speciesName } = useBatchIndex();
  const { ready } = useCollection('batches');
  const sorted = [...batches].sort((a, b) => (b.sowingDate ?? '').localeCompare(a.sowingDate ?? '') || b.batchNumber.localeCompare(a.batchNumber));
  const toReview = sorted.filter(b => b.needsReview).length;

  return (
    <div className="space-y-5 pb-8 animate-page-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nursery batches</h1>
          <p className="text-sm text-gray-500 mt-1">{ready ? `${sorted.length} batch${sorted.length === 1 ? '' : 'es'}` : 'Loading…'}</p>
        </div>
        <Link to="/nursery/new" aria-label="New batch" className="bg-green-700 hover:bg-green-800 text-white p-3 rounded-lg transition-colors">
          <Plus className="w-5 h-5" />
        </Link>
      </div>

      {toReview > 0 && (
        <p className="flex gap-2 items-start text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {toReview} batch{toReview === 1 ? ' was' : 'es were'} created from your earlier records. Open {toReview === 1 ? 'it' : 'each'} to add the species, sowing date and seeds sown.
        </p>
      )}

      {ready && sorted.length === 0 ? (
        <div className="bento-card p-10 text-center border-dashed">
          <Sprout className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-sm text-gray-700">No batches yet</p>
          <p className="text-xs text-gray-500 mt-1">Add a sowing with the + button. Germination, growth and treatment records link to batches.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
          {sorted.map(batch => (
            <Link key={batch.id} to={`/nursery/batch/${batch.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors group">
              <div className="w-9 h-9 rounded-md bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
                <Sprout className="w-[18px] h-[18px] text-green-700" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-medium text-gray-900 font-mono-sci">{batch.batchNumber}</h3>
                  <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${statusChip[batch.status]}`}>{batch.status}</span>
                  {batch.needsReview && <span className="px-1.5 py-0.5 rounded border text-[10px] font-medium bg-amber-50 text-amber-800 border-amber-200">Needs review</span>}
                  {batch.isExample && <span className="px-1.5 py-0.5 rounded border text-[10px] font-medium bg-gray-100 text-gray-600 border-gray-200">Example</span>}
                </div>
                <p className="text-xs text-gray-500 italic truncate">{(batch.speciesId && speciesName.get(batch.speciesId)) || 'Species not set'}</p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 font-mono-sci">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {batch.sowingDate ?? 'No sowing date'}</span>
                  <span>{batch.seedsSown != null ? `${batch.seedsSown} seeds` : 'Seeds not set'}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-700" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
export default BatchListPage;
