import React from 'react';
import { Calculator, Beaker, Zap, BarChart, ChevronRight } from 'lucide-react';

const CalcPage = () => {
  const calculators = [
    { title: 'Vapor Pressure Deficit (VPD)', icon: Zap, desc: 'Calculate VPD from Temp & RH', color: 'from-purple-400 to-indigo-600', shadow: 'shadow-purple-500/20', text: 'text-purple-700' },
    { title: 'Germination Rate Index', icon: BarChart, desc: 'Calculate GRI from sprout logs', color: 'from-emerald-400 to-teal-600', shadow: 'shadow-emerald-500/20', text: 'text-emerald-700' },
    { title: 'Fertilizer PPM Calculator', icon: Beaker, desc: 'Mix ratios for nutrient dosing', color: 'from-blue-400 to-cyan-600', shadow: 'shadow-blue-500/20', text: 'text-blue-700' },
  ];

  return (
    <div className="space-y-6 pb-8 animate-float" style={{ animationDuration: '14s' }}>
      <div className="px-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Calculators</h1>
        <p className="text-sm text-gray-500 mt-2 font-medium">Scientific tools for precision greenhouse studies.</p>
      </div>

      <div className="space-y-4 px-2">
        {calculators.map((calc, i) => (
          <div key={i} className="bento-card p-5 flex items-center gap-5 bg-white/70 hover:bg-white group cursor-pointer">
            <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${calc.color} shadow-lg ${calc.shadow} group-hover:scale-110 transition-transform duration-300`}>
              <calc.icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className={`font-black text-sm tracking-tight mb-0.5 ${calc.text}`}>{calc.title}</h3>
              <p className="text-[11px] text-gray-500 font-medium">{calc.desc}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-900 group-hover:text-white transition-colors text-gray-400">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      <div className="mx-2 p-8 rounded-[2rem] border-2 border-dashed border-gray-200/60 flex flex-col items-center justify-center text-center mt-8 bg-gray-50/30 backdrop-blur-sm">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
          <Calculator className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="font-black text-gray-700 text-sm tracking-tight">More modules on the way</h3>
        <p className="text-[11px] text-gray-500 mt-2 max-w-[200px] font-medium leading-relaxed">
          Specialized calculators like Root/Shoot Ratio and Degree Days are currently in development.
        </p>
      </div>
    </div>
  );
};

export default CalcPage;
