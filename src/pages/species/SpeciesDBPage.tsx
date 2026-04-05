import React from 'react';
import { Search, Database, ChevronRight, Map } from 'lucide-react';

const SpeciesDBPage: React.FC = () => {
  const species = [
    { id: '1', name: 'Pinus roxburghii', common: 'Chir Pine', family: 'Pinaceae', type: 'Orthodox' },
    { id: '2', name: 'Cedrus deodara', common: 'Deodar Cedar', family: 'Pinaceae', type: 'Recalcitrant' },
    { id: '3', name: 'Abies pindrow', common: 'Pindrow Fir', family: 'Pinaceae', type: 'Orthodox' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Species DB</h1>
        <button className="bg-green-600 text-white p-3 rounded-2xl shadow-lg active:scale-90 transition-all">
          <Map className="w-5 h-5" />
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-green-600 transition-colors" />
        <input type="text" placeholder="Search species database..." className="w-full bg-white border border-gray-100 rounded-3xl py-5 pl-14 pr-6 shadow-sm focus:outline-none focus:ring-4 focus:ring-green-100 transition-all text-sm font-bold placeholder:text-gray-300" />
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
        {species.map((sp) => (
          <div key={sp.id} className="p-7 flex items-center gap-5 hover:bg-gray-50/50 transition-all active:scale-[0.98]">
            <div className="bg-green-50 p-4 rounded-3xl group-active:scale-90 transition-transform">
              <Database className="w-7 h-7 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-gray-900 text-lg italic tracking-tight leading-tight">{sp.name}</h3>
              <p className="text-[11px] text-gray-400 font-bold mt-1 uppercase tracking-widest">{sp.common} • {sp.family}</p>
              <span className="inline-block mt-3 px-3 py-1.5 bg-gray-100 rounded-xl text-[9px] font-black text-gray-500 uppercase tracking-widest border border-gray-200/50">
                {sp.type}
              </span>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
};
export default SpeciesDBPage;
