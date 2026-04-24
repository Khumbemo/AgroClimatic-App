import React, { useState } from 'react';
import { Calculator, Beaker, Zap, BarChart, ChevronRight, ArrowLeft, Plus, X } from 'lucide-react';

type CalcType = 'VPD' | 'GRI' | 'PPM' | null;

const CalcPage = () => {
  const [activeCalc, setActiveCalc] = useState<CalcType>(null);

  // VPD State
  const [vpdTemp, setVpdTemp] = useState('');
  const [vpdRH, setVpdRH] = useState('');

  // GRI State
  const [griCounts, setGriCounts] = useState<{ day: string; count: string }[]>([{ day: '1', count: '0' }]);

  // PPM State
  const [ppmTarget, setPpmTarget] = useState('');
  const [ppmVolume, setPpmVolume] = useState('');
  const [ppmElement, setPpmElement] = useState('');

  // ----------------------------------------------------------------------
  // VPD Calculation (Tetens Equation)
  // ----------------------------------------------------------------------
  const getVpd = () => {
    const t = parseFloat(vpdTemp);
    const rh = parseFloat(vpdRH);
    if (isNaN(t) || isNaN(rh)) return null;
    const svp = 0.61078 * Math.exp((17.27 * t) / (t + 237.3));
    const vpd = svp * (1 - rh / 100);
    return vpd.toFixed(2);
  };
  const vpdResult = getVpd();
  
  const getVpdStatus = (val: number) => {
    if (val < 0.4) return { text: 'DANGER: Low Transpiration', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    if (val >= 0.4 && val < 0.8) return { text: 'Low / Propagating', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    if (val >= 0.8 && val <= 1.2) return { text: 'OPTIMAL VEGETATIVE', color: 'text-green-600 bg-green-50 border-green-300' };
    if (val > 1.2 && val <= 1.6) return { text: 'High Transpiration', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    return { text: 'DANGER: Stress / Closure', color: 'text-red-600 bg-red-50 border-red-200' };
  };

  // ----------------------------------------------------------------------
  // GRI Calculation (ISTA Standard)
  // ----------------------------------------------------------------------
  const getGri = () => {
    let sum = 0;
    for (const item of griCounts) {
      const d = parseFloat(item.day);
      const c = parseFloat(item.count);
      if (!isNaN(d) && !isNaN(c) && d > 0) sum += c / d;
    }
    return sum.toFixed(2);
  };
  const addGriRow = () => {
    const nextDay = griCounts.length > 0 ? parseInt(griCounts[griCounts.length - 1].day) + 1 : 1;
    setGriCounts([...griCounts, { day: nextDay.toString(), count: '0' }]);
  };

  // ----------------------------------------------------------------------
  // Fertilizer PPM Calculation
  // ----------------------------------------------------------------------
  const getPpmMass = () => {
    const ppm = parseFloat(ppmTarget);
    const v = parseFloat(ppmVolume);
    const e = parseFloat(ppmElement);
    if (isNaN(ppm) || isNaN(v) || isNaN(e) || e <= 0) return null;
    const mass = (ppm * v) / (e * 10);
    return mass.toFixed(2);
  };
  const ppmResult = getPpmMass();

  const calculators = [
    { id: 'VPD' as const, title: 'Vapor Pressure Deficit', icon: Zap, desc: 'Calculate VPD from Temp & RH', color: 'from-purple-400 to-indigo-600', shadow: 'shadow-purple-500/20', text: 'text-purple-700' },
    { id: 'GRI' as const, title: 'Germination Rate Index', icon: BarChart, desc: 'Calculate GRI from sprout logs', color: 'from-emerald-400 to-teal-600', shadow: 'shadow-emerald-500/20', text: 'text-emerald-700' },
    { id: 'PPM' as const, title: 'Fertilizer PPM Dosing', icon: Beaker, desc: 'Mix ratios for nutrient dosing', color: 'from-blue-400 to-cyan-600', shadow: 'shadow-blue-500/20', text: 'text-blue-700' },
  ];

  if (activeCalc === 'VPD') {
    return (
      <div className="space-y-6 pb-8 animate-page-in">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setActiveCalc(null)} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
          <div><h1 className="text-xl font-black text-gray-900 tracking-tight">VPD Calculator</h1><p className="text-[10px] text-gray-500 font-mono-sci mt-0.5 uppercase">Tetens Equation (kPa)</p></div>
        </div>
        
        <div className="bento-card p-6 bg-white space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Temperature (°C)</label><input type="number" step="0.1" value={vpdTemp} onChange={e => setVpdTemp(e.target.value)} className="w-full mt-1.5 p-3.5 rounded-xl border-2 border-gray-100 font-mono-sci text-lg focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all" placeholder="25.0" /></div>
            <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Humidity (%)</label><input type="number" step="1" value={vpdRH} onChange={e => setVpdRH(e.target.value)} className="w-full mt-1.5 p-3.5 rounded-xl border-2 border-gray-100 font-mono-sci text-lg focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all" placeholder="60" /></div>
          </div>
          
          <div className="pt-4 border-t border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2 text-center">Calculated VPD</p>
            <div className="text-center font-mono-sci text-5xl font-black text-purple-700 tracking-tighter">
              {vpdResult ? vpdResult : '0.00'} <span className="text-lg text-purple-300 font-bold tracking-normal uppercase">kPa</span>
            </div>
            {vpdResult && (
              <div className="mt-4 flex justify-center">
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${getVpdStatus(parseFloat(vpdResult)).color}`}>
                  {getVpdStatus(parseFloat(vpdResult)).text}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeCalc === 'GRI') {
    return (
      <div className="space-y-6 pb-8 animate-page-in">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setActiveCalc(null)} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
          <div><h1 className="text-xl font-black text-gray-900 tracking-tight">GRI Calculator</h1><p className="text-[10px] text-gray-500 font-mono-sci mt-0.5 uppercase">ISTA Germination Rate Index</p></div>
        </div>

        <div className="bento-card p-6 bg-white border-b-4 border-b-emerald-500">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2 text-center">Calculated Index</p>
          <div className="text-center font-mono-sci text-5xl font-black text-emerald-600 tracking-tighter">
            {getGri()}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-end mb-2 px-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Daily Emergence Logs</label>
            <button onClick={addGriRow} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 hover:text-emerald-700"><Plus className="w-3 h-3" /> Add Day</button>
          </div>
          {griCounts.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
              <div className="w-20"><label className="text-[8px] font-bold text-gray-400 uppercase px-1">Day</label><input type="number" value={item.day} onChange={e => { const n = [...griCounts]; n[idx].day = e.target.value; setGriCounts(n); }} className="w-full p-2 bg-gray-50 rounded-lg font-mono-sci text-sm outline-none border border-transparent focus:border-emerald-300" /></div>
              <div className="flex-1"><label className="text-[8px] font-bold text-gray-400 uppercase px-1">New Germinants</label><input type="number" value={item.count} onChange={e => { const n = [...griCounts]; n[idx].count = e.target.value; setGriCounts(n); }} className="w-full p-2 bg-gray-50 rounded-lg font-mono-sci text-sm outline-none border border-transparent focus:border-emerald-300" /></div>
              <button onClick={() => setGriCounts(griCounts.filter((_, i) => i !== idx))} className="mt-4 p-2 text-gray-300 hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeCalc === 'PPM') {
    return (
      <div className="space-y-6 pb-8 animate-page-in">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setActiveCalc(null)} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
          <div><h1 className="text-xl font-black text-gray-900 tracking-tight">PPM Calculator</h1><p className="text-[10px] text-gray-500 font-mono-sci mt-0.5 uppercase">Dry Mass Nutrient Dosing</p></div>
        </div>
        
        <div className="bento-card p-6 bg-white space-y-4">
          <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Target Concentration (PPM)</label><input type="number" step="1" value={ppmTarget} onChange={e => setPpmTarget(e.target.value)} className="w-full mt-1 p-3.5 rounded-xl border-2 border-gray-100 font-mono-sci text-lg focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all" placeholder="150" /></div>
          
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Volume (Liters)</label><input type="number" step="0.1" value={ppmVolume} onChange={e => setPpmVolume(e.target.value)} className="w-full mt-1 p-3.5 rounded-xl border-2 border-gray-100 font-mono-sci text-lg focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all" placeholder="10" /></div>
            <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Element % (w/w)</label><input type="number" step="0.1" value={ppmElement} onChange={e => setPpmElement(e.target.value)} className="w-full mt-1 p-3.5 rounded-xl border-2 border-gray-100 font-mono-sci text-lg focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all" placeholder="20" /></div>
          </div>
          
          <div className="pt-4 border-t border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2 text-center">Required Dry Mass</p>
            <div className="text-center font-mono-sci text-5xl font-black text-blue-600 tracking-tighter">
              {ppmResult ? ppmResult : '0.00'} <span className="text-lg text-blue-300 font-bold tracking-normal uppercase">grams</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Menu View
  return (
    <div className="space-y-6 pb-8 animate-page-in">
      <div className="px-2">
        <h1 className="text-3xl font-black tracking-tight">Calculators</h1>
      </div>

      <div className="space-y-4 px-2">
        {calculators.map((calc) => (
          <div key={calc.id} onClick={() => setActiveCalc(calc.id)} className="bento-card p-5 flex items-center gap-5 bg-white/70 hover:bg-white group cursor-pointer active:scale-[0.98] transition-all">
            <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${calc.color} shadow-lg ${calc.shadow} group-hover:scale-110 transition-transform duration-300`}>
              <calc.icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className={`font-black text-sm tracking-tight ${calc.text}`}>{calc.title}</h3>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-900 group-hover:text-white transition-colors text-gray-400">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mx-2 p-8 rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center mt-8">
        <Calculator className="w-8 h-8 text-gray-300" />
      </div>
    </div>
  );
};

export default CalcPage;
