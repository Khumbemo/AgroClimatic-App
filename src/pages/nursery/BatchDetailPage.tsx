import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Thermometer, Droplets, FlaskConical, Bug, Info, Beaker, TrendingUp } from 'lucide-react';
import { type NurseryBatch } from '../../types';
import GrowthChart from '../../components/nursery/GrowthChart';
import GerminationChart from '../../components/nursery/GerminationChart';
import { cn } from '../../utils/cn';

const BatchDetailPage: React.FC = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'info' | 'germination' | 'growth'>('info');

  const batch: NurseryBatch = {
    id: id || '1', batchNumber: 'NB-2024-001', speciesId: 'Pinus roxburghii', sowingDate: '2024-03-10', status: 'growing', seedsSown: 1000, bedTrayNumber: 'B-01', substrateMix: 'Coir:Soil (70:30)', areaSownM2: 2, seedLotId: 'SL-001', createdAt: '2024-03-10'
  };

  const germLabels = ['D1', 'D3', 'D5', 'D7', 'D9', 'D11', 'D14'];
  const dailyGerm = [0, 10, 45, 80, 120, 90, 30];
  const cumGerm = [0, 1, 5.5, 13.5, 25.5, 34.5, 37.5];

  const growthLabels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
  const heightData = [2, 3.5, 5.2, 7.8, 10.5, 13.2];
  const rcdData = [0.8, 1.2, 1.5, 2.1, 2.8, 3.4];

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link to="/nursery" className="p-3 bg-white hover:bg-gray-100 rounded-2xl transition-all shadow-sm active:scale-90">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-gray-900">{batch.batchNumber}</h1>
          <p className="text-xs text-gray-400 italic font-medium tracking-tight uppercase">{batch.speciesId}</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-gray-100 text-center shadow-sm">
          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Sown</p>
          <p className="text-lg font-black text-gray-800">{batch.seedsSown}</p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-gray-100 text-center shadow-sm">
          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Germ %</p>
          <p className="text-lg font-black text-green-600">82%</p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-gray-100 text-center shadow-sm">
          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">RGR</p>
          <p className="text-lg font-black text-blue-600">0.05</p>
        </div>
      </div>

      <div className="flex bg-gray-100/50 p-1.5 rounded-2xl">
        {(['info', 'germination', 'growth'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={cn("flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl flex items-center justify-center gap-2", activeTab === tab ? "bg-white text-green-700 shadow-sm" : "text-gray-400")}>
            {tab === 'info' && <Info className="w-3.5 h-3.5" />}
            {tab === 'germination' && <Beaker className="w-3.5 h-3.5" />}
            {tab === 'growth' && <TrendingUp className="w-3.5 h-3.5" />}
            {tab}
          </button>
        ))}
      </div>

      <div className="min-h-[350px]">
        {activeTab === 'info' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-[10px] font-black text-gray-400 uppercase mb-5 tracking-widest">Sowing Specifications</h3>
              <div className="grid grid-cols-2 gap-y-6 text-sm">
                <div><p className="text-gray-400 text-[10px] font-bold uppercase tracking-tight mb-1">Date</p><p className="font-black text-gray-800">{batch.sowingDate}</p></div>
                <div><p className="text-gray-400 text-[10px] font-bold uppercase tracking-tight mb-1">Bed #</p><p className="font-black text-gray-800">{batch.bedTrayNumber}</p></div>
                <div><p className="text-gray-400 text-[10px] font-bold uppercase tracking-tight mb-1">Substrate</p><p className="font-black text-gray-800 text-xs leading-tight">{batch.substrateMix}</p></div>
                <div><p className="text-gray-400 text-[10px] font-bold uppercase tracking-tight mb-1">Lot ID</p><p className="font-black text-gray-800">{batch.seedLotId}</p></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:border-orange-200 transition-all group active:scale-95">
                <div className="p-4 bg-orange-50 rounded-2xl mb-3 group-hover:scale-110 transition-transform"><Thermometer className="w-6 h-6 text-orange-500" /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">Climate</span>
              </button>
              <button className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:border-blue-200 transition-all group active:scale-95">
                <div className="p-4 bg-blue-50 rounded-2xl mb-3 group-hover:scale-110 transition-transform"><Droplets className="w-6 h-6 text-blue-500" /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">Irrigation</span>
              </button>
              <button className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:border-purple-200 transition-all group active:scale-95">
                <div className="p-4 bg-purple-50 rounded-2xl mb-3 group-hover:scale-110 transition-transform"><FlaskConical className="w-6 h-6 text-purple-500" /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">Nutrition</span>
              </button>
              <button className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:border-red-200 transition-all group active:scale-95">
                <div className="p-4 bg-red-50 rounded-2xl mb-3 group-hover:scale-110 transition-transform"><Bug className="w-6 h-6 text-red-500" /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">Pests</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'germination' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm h-72">
               <GerminationChart labels={germLabels} dailyCount={dailyGerm} cumulativePercent={cumGerm} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">MGT (Days)</p>
                <p className="text-xl font-black text-gray-800">8.4</p>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Energy</p>
                <p className="text-xl font-black text-green-600">42%</p>
              </div>
            </div>
            <button className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-black py-5 rounded-3xl shadow-xl shadow-green-100 active:scale-95 transition-all text-xs uppercase tracking-widest">
              <Plus className="w-5 h-5" /> Add Log Entry
            </button>
          </div>
        )}

        {activeTab === 'growth' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm h-72">
               <GrowthChart labels={growthLabels} heightData={heightData} rcdData={rcdData} />
            </div>
            <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-100">
               <div className="flex justify-between items-center mb-3">
                 <h4 className="font-black text-xs uppercase tracking-widest">Quality Index</h4>
                 <span className="bg-white/20 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter">Dickson's</span>
               </div>
               <p className="text-4xl font-black">0.48</p>
               <div className="mt-4 bg-white/10 h-2 rounded-full overflow-hidden">
                 <div className="bg-white h-full" style={{ width: '96%' }}></div>
               </div>
               <p className="text-[10px] text-blue-100 mt-2 font-bold uppercase tracking-tight opacity-80">Threshold: 0.50 (96% reach)</p>
            </div>
            <button className="w-full flex items-center justify-center gap-2 bg-white text-blue-700 font-black py-5 rounded-3xl border-2 border-blue-50 shadow-sm active:scale-95 transition-all text-xs uppercase tracking-widest">
              <Plus className="w-5 h-5" /> Measure Seedlings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default BatchDetailPage;
