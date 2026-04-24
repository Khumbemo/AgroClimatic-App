import React from 'react';
import { Calculator, Beaker, Zap, BarChart } from 'lucide-react';

const CalcPage = () => {
  const calculators = [
    { title: 'Vapor Pressure Deficit (VPD)', icon: Zap, desc: 'Calculate VPD from Temp & RH', color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { title: 'Germination Rate Index', icon: BarChart, desc: 'Calculate GRI from sprout logs', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { title: 'Fertilizer PPM Calculator', icon: Beaker, desc: 'Mix ratios for nutrient dosing', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Calculators</h1>
        <p className="text-sm text-gray-500 mt-1 font-medium">Scientific calculators for greenhouse studies.</p>
      </div>

      <div className="space-y-4">
        {calculators.map((calc, i) => (
          <div key={i} className={`p-5 rounded-2xl border flex items-center gap-4 ${calc.color} bg-white opacity-80`}>
            <div className={`p-3 rounded-xl bg-white shadow-sm`}>
              <calc.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 leading-tight">{calc.title}</h3>
              <p className="text-[11px] text-gray-600 mt-1">{calc.desc}</p>
            </div>
            <button className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors">
              Open
            </button>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center mt-8 bg-gray-50/50">
        <Calculator className="w-8 h-8 text-gray-300 mb-3" />
        <h3 className="font-bold text-gray-700 text-sm">More calculators coming soon</h3>
        <p className="text-[11px] text-gray-500 mt-1 max-w-[200px]">We will add specialized calculators like Root/Shoot Ratio and Degree Days here.</p>
      </div>
    </div>
  );
};

export default CalcPage;
