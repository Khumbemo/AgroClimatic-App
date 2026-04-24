import React from 'react';
import { Activity, Droplets, Sun, Wind, ChevronRight } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="space-y-6 pb-8 animate-float" style={{ animationDuration: '10s' }}>
      
      {/* Hero Stats Bento Box */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bento-card bg-gradient-to-br from-white to-gray-50/50">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <Droplets className="w-5 h-5 text-blue-500" />
          </div>
          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Active Batches</span>
          <div className="text-4xl font-black mt-1 text-gray-800 tracking-tight">12</div>
        </div>
        
        <div className="bento-card bg-gradient-to-br from-white to-gray-50/50 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-400/10 rounded-full blur-2xl"></div>
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-4 relative z-10">
            <Activity className="w-5 h-5 text-green-500" />
          </div>
          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest relative z-10">Avg Germination</span>
          <div className="text-4xl font-black mt-1 text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-400 tracking-tight relative z-10">84%</div>
        </div>
      </div>

      {/* Environmental Quick Glance */}
      <div className="bento-card p-0 overflow-hidden">
        <div className="p-5 border-b border-gray-100/50 flex justify-between items-center bg-white/40">
          <h3 className="font-black text-gray-800 text-xs uppercase tracking-widest flex items-center gap-2">
            <Sun className="w-4 h-4 text-orange-400" /> Greenhouse Alpha
          </h3>
          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">Optimal</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-gray-100/50">
          <div className="p-5 flex flex-col items-center justify-center text-center bg-white/20">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Temp</span>
            <span className="text-2xl font-black text-gray-700">24°C</span>
          </div>
          <div className="p-5 flex flex-col items-center justify-center text-center bg-white/20">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Humidity</span>
            <span className="text-2xl font-black text-gray-700">65%</span>
          </div>
        </div>
      </div>

      {/* Alert Feed */}
      <div className="bento-card">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-black text-gray-800 text-xs uppercase tracking-widest">Recent Activity</h3>
          <button className="text-gray-400 hover:text-green-500 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="group relative flex gap-4 items-start p-4 bg-white/60 rounded-2xl border border-gray-100 hover:border-orange-200 transition-all cursor-pointer">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-400 rounded-r-full scale-y-0 group-hover:scale-y-100 transition-transform"></div>
              <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0 mt-1">
                <Wind className="w-4 h-4 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-gray-800 tracking-tight">Batch #042: Low Moisture</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Substrate moisture dropped below 30%. Irrigation recommended.</p>
                <p className="text-[9px] text-gray-400 font-black mt-2 uppercase tracking-widest">2 hours ago</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Premium CTA Card */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 p-8 shadow-2xl shadow-green-900/20 group cursor-pointer transition-all hover:scale-[1.02]">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center px-3 py-1 mb-4 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-black uppercase tracking-widest">
            Action Required
          </div>
          <h3 className="font-black text-2xl text-white tracking-tight mb-2">Ready for Outplanting</h3>
          <p className="text-green-50 text-sm font-medium leading-relaxed opacity-90 max-w-[200px]">
            3 batches have met the minimum height and caliper thresholds.
          </p>
          
          <button className="mt-6 bg-white text-green-700 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-black/10 hover:shadow-2xl hover:bg-gray-50 transition-all flex items-center gap-2 group-hover:pl-8">
            View Readiness <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};

export default HomePage;
