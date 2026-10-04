import React, { useState } from 'react';
import { Search, ChevronRight, TreePine } from 'lucide-react';

type Storage = 'Orthodox' | 'Sub-orthodox' | 'Recalcitrant';

const species: { id: string; name: string; common: string; family: string; storage: Storage }[] = [
  { id: '1', name: 'Pinus roxburghii', common: 'Chir pine', family: 'Pinaceae', storage: 'Orthodox' },
  // Short-lived at ambient, but stores >650 days at 10 % moisture and −5 °C (sub-orthodox)
  { id: '2', name: 'Cedrus deodara', common: 'Deodar cedar', family: 'Pinaceae', storage: 'Sub-orthodox' },
  { id: '3', name: 'Abies pindrow', common: 'Pindrow fir', family: 'Pinaceae', storage: 'Orthodox' },
];

const storageChip: Record<Storage, string> = {
  Orthodox: 'text-green-800 bg-green-50 border-green-200',
  'Sub-orthodox': 'text-amber-800 bg-amber-50 border-amber-200',
  Recalcitrant: 'text-red-700 bg-red-50 border-red-200',
};

const SpeciesDBPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = species.filter(sp => !q || [sp.name, sp.common, sp.family].some(v => v.toLowerCase().includes(q)));

  return (
    <div className="space-y-5 pb-8 animate-page-in">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Species database</h1>
        <p className="text-sm text-gray-500 mt-1">Taxonomy and seed storage behaviour.</p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
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
              <h3 className="text-[15px] font-medium text-gray-900 italic">{sp.name}</h3>
              <p className="text-xs text-gray-500">{sp.common} · {sp.family}</p>
            </div>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded border shrink-0 ${storageChip[sp.storage]}`}>{sp.storage}</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        ))}
        {shown.length === 0 && <p className="px-4 py-6 text-sm text-gray-500 text-center">No species match “{query}”.</p>}
      </div>
    </div>
  );
};
export default SpeciesDBPage;
