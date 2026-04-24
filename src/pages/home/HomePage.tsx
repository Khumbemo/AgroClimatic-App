import React from 'react';
import { Activity, Droplets, ThermometerSun, Wind, ChevronRight, Microscope, Target, Fingerprint, TreePine } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="space-y-6 pb-8 animate-float" style={{ animationDuration: '10s' }}>
      
      {/* Precision Data Readouts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bento-card border-l-4 border-l-green-600 bg-white/90">
          <div className="flex items-center gap-2 mb-3">
            <TreePine className="w-4 h-4 text-green-700" />
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">Active Lots</span>
          </div>
          <div className="font-mono-sci text-3xl font-bold text-gray-900 tracking-tight">0012</div>
          <div className="text-[9px] text-gray-400 font-mono-sci mt-1">SYS_STAT: NOMINAL</div>
        </div>
        
        <div className="bento-card border-l-4 border-l-emerald-400 bg-emerald-900 text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-400/20 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-[9px] text-emerald-100/70 font-bold uppercase tracking-[0.2em]">Mean Germination</span>
          </div>
          <div className="font-mono-sci text-3xl font-bold text-emerald-400 tracking-tight relative z-10">84.2%</div>
          <div className="text-[9px] text-emerald-500 font-mono-sci mt-1 relative z-10 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> LIVE CALC
          </div>
        </div>
      </div>

      {/* Microclimate Sensor Array */}
      <div className="bento-card p-0 overflow-hidden border border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-black text-gray-800 text-[10px] uppercase tracking-[0.15em] flex items-center gap-2">
            <ThermometerSun className="w-4 h-4 text-amber-600" /> Sensor Array: GHG-01
          </h3>
          <span className="text-[9px] font-mono-sci font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded">STATUS: ON</span>
        </div>
        
        <div className="grid grid-cols-2 divide-x divide-gray-100">
          <div className="p-4 flex flex-col items-start bg-white">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><Wind className="w-3 h-3"/> VPD (kPa)</span>
            <span className="text-2xl font-mono-sci font-bold text-gray-800">1.24</span>
            <span className="text-[8px] text-amber-500 font-mono-sci mt-1">WARN: HIGH EVAP</span>
          </div>
          <div className="p-4 flex flex-col items-start bg-white">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><Droplets className="w-3 h-3"/> Soil EC (mS/cm)</span>
            <span className="text-2xl font-mono-sci font-bold text-gray-800">1.80</span>
            <span className="text-[8px] text-green-500 font-mono-sci mt-1">RANGE: OPTIMAL</span>
          </div>
        </div>
      </div>

      {/* Anomaly & Diagnostic Feed */}
      <div className="bento-card">
        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
          <h3 className="font-black text-gray-800 text-[10px] uppercase tracking-[0.15em] flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-gray-400" /> Diagnostics Log
          </h3>
        </div>
        <div className="space-y-3">
          {[
            { id: "LOG-A71", msg: "Batch #042 Substrate moisture below threshold (30%).", time: "T-02:14:00" },
            { id: "LOG-A70", msg: "PAR sensor calibration sequence completed.", time: "T-11:00:23" }
          ].map((log, i) => (
            <div key={i} className="flex gap-3 items-start border-l-2 border-amber-400 pl-3 py-1">
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <p className="font-mono-sci text-[10px] font-bold text-amber-600">{log.id}</p>
                  <p className="font-mono-sci text-[8px] text-gray-400">{log.time}</p>
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{log.msg}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Morphometric Analysis CTA */}
      <div className="relative overflow-hidden rounded-xl bg-[#1a2f23] p-6 shadow-xl border border-green-900 group cursor-pointer transition-all hover:border-green-500">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-400/20 transition-colors duration-500"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Microscope className="w-5 h-5 text-green-400" />
            <h3 className="font-black text-sm text-green-50 uppercase tracking-[0.15em]">Morphometric Review</h3>
          </div>
          
          <div className="bg-black/30 rounded border border-green-900/50 p-3 mb-4 inline-block">
            <p className="font-mono-sci text-[10px] text-green-300 flex items-center gap-2">
              <Target className="w-3 h-3" /> TARGET CALIPER: {'>'}4.0mm
            </p>
            <p className="font-mono-sci text-[10px] text-green-300 mt-1 flex items-center gap-2">
              <Target className="w-3 h-3" /> S/R RATIO: {'<'}1.5
            </p>
          </div>
          
          <p className="text-gray-300 text-xs font-medium leading-relaxed opacity-90">
            3 batches meet outplanting biometric thresholds. Validation required.
          </p>
          
          <button className="mt-5 w-full bg-green-600/20 border border-green-500/50 text-green-400 px-4 py-2.5 rounded text-[10px] font-mono-sci font-bold uppercase tracking-[0.2em] hover:bg-green-500/30 transition-all flex items-center justify-between group-hover:text-green-300">
            INITIATE REVIEW <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};

export default HomePage;
