import React from 'react';
import { Plus, MapPin, Scale, Droplets } from 'lucide-react';

const SeedLotsPage: React.FC = () => {
  const seedLots = [
    { id: '1', lotNumber: 'SL-001', species: 'Pinus roxburghii', stock: 12.5, collectionDate: '2023-11-15' },
    { id: '2', lotNumber: 'SL-002', species: 'Cedrus deodara', stock: 5.0, collectionDate: '2023-12-01' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Seed Lots</h1>
        <button className="bg-green-600 text-white p-3 rounded-2xl shadow-lg active:scale-90 transition-all">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-5">
        {seedLots.map((lot) => (
          <div key={lot.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-5 group hover:border-green-200 transition-all">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-black text-gray-800 text-lg uppercase tracking-tight group-hover:text-green-700 transition-colors">{lot.lotNumber}</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1.5 leading-none">{lot.species}</p>
              </div>
              <div className="bg-green-50 px-4 py-2 rounded-2xl text-green-700 font-black text-[10px] uppercase tracking-widest border border-green-100 shadow-sm">
                {lot.stock} kg
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-gray-50 pt-5">
               <div className="flex flex-col items-center text-center">
                 <div className="p-2.5 bg-gray-50 rounded-xl mb-2"><MapPin className="w-4 h-4 text-gray-400" /></div>
                 <span className="text-[8px] text-gray-300 font-black uppercase tracking-tighter mb-1">Origin</span>
                 <span className="text-[10px] font-black text-gray-700">Uttarakhand</span>
               </div>
               <div className="flex flex-col items-center text-center">
                 <div className="p-2.5 bg-gray-50 rounded-xl mb-2"><Scale className="w-4 h-4 text-gray-400" /></div>
                 <span className="text-[8px] text-gray-300 font-black uppercase tracking-tighter mb-1">1000 Wt</span>
                 <span className="text-[10px] font-black text-gray-700">18.4g</span>
               </div>
               <div className="flex flex-col items-center text-center">
                 <div className="p-2.5 bg-gray-50 rounded-xl mb-2"><Droplets className="w-4 h-4 text-gray-400" /></div>
                 <span className="text-[8px] text-gray-300 font-black uppercase tracking-tighter mb-1">Moisture</span>
                 <span className="text-[10px] font-black text-gray-700">8.2%</span>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default SeedLotsPage;
