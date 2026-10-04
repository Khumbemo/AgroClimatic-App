import React, { useState } from 'react';
import { Search, ChevronRight, TreePine } from 'lucide-react';
import { useCollection } from '../../data/hooks';
import type { Species } from '../../data/schema';

const storageChip: Record<Species['storageBehaviour'], string> = {
  orthodox: 'text-green-800 bg-green-50 border-green-200',
  'sub-orthodox': 'text-amber-800 bg-amber-50 border-amber-200',
  intermediate: 'text-amber-800 bg-amber-50 border-amber-200',
  recalcitrant: 'text-red-700 bg-red-50 border-red-200',
  unknown: 'text-gray-600 bg-gray-100 border-gray-200',
};

const SpeciesDBPage: React.FC = () => {
  const { items, ready } = useCollection('species');
  const species = [...items].sort((a, b) => a.botanicalName.localeCompare(b.botanicalName));
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = species.filter(sp => !q || [sp.botanicalName, sp.commonName, sp.family].some(v => v.toLowerCase().includes(q)));

  return (
    <div className="space-y-5 pb-8 animate-page-in">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Species database</h1>
        <p className="text-sm text-gray-500 mt-1">Taxonomy and seed storage behaviour.</p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
        <label htmlFor="species-search" className="sr-only">Search species</label>
        <input
          id="species-search"
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by binomial, common name or family"
          className="w-full bg-white border border-gray-300 rounded-md py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 placeholder:text-gray-400"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {shown.map(sp => (
          <div key={sp.id} className="px-4 py-3 flex items-center gap-3 hover:bg-green-50 transition-colors">
            <div className="w-9 h-9 rounded-md bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
              <TreePine className="w-[18px] h-[18px] text-green-700" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-medium text-gray-900 italic">{sp.botanicalName}</h3>
              <p className="text-xs text-gray-500">{sp.commonName || '—'} · {sp.family || '—'}</p>
            </div>
            <span title={sp.notes} className={`text-[11px] font-medium px-2 py-0.5 rounded border shrink-0 capitalize ${storageChip[sp.storageBehaviour]}`}>{sp.storageBehaviour}</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        ))}
        {ready && shown.length === 0 && <p className="px-4 py-6 text-sm text-gray-500 text-center">No species match “{query}”.</p>}
      </div>
    </div>
  );
};
export default SpeciesDBPage;
