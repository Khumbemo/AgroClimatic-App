import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, ThermometerSun, Leaf, Droplets, Map, Ruler, Database } from 'lucide-react';

const ToolsPage = () => {
  const tools = [
    {
      category: 'Core Modules',
      items: [
        { title: 'Nursery Batches', icon: Leaf, desc: 'Manage active seed batches', to: '/nursery', color: 'from-green-400 to-emerald-600', shadow: 'shadow-green-500/20', text: 'text-green-700' },
        { title: 'Records & Logs', icon: Database, desc: 'View past logs and seed lots', to: '/records', color: 'from-blue-400 to-indigo-600', shadow: 'shadow-blue-500/20', text: 'text-blue-700' },
        { title: 'Species Database', icon: Activity, desc: 'Manage species profiles', to: '/species', color: 'from-purple-400 to-fuchsia-600', shadow: 'shadow-purple-500/20', text: 'text-purple-700' },
      ]
    },
    {
      category: 'Scientific Features',
      items: [
        { title: 'Environmental Logs', icon: ThermometerSun, desc: 'Record temp, humidity, PAR', to: '/tools/environmental', color: 'from-orange-400 to-amber-600', shadow: 'shadow-orange-500/20', text: 'text-orange-700' },
        { title: 'Germination Tracker', icon: Activity, desc: 'Daily sprout counts & metrics', to: '/tools/germination', color: 'from-teal-400 to-emerald-600', shadow: 'shadow-teal-500/20', text: 'text-teal-700' },
        { title: 'Treatment Logs', icon: Droplets, desc: 'Fertilization & pre-sowing info', to: '/tools/treatments', color: 'from-cyan-400 to-blue-600', shadow: 'shadow-cyan-500/20', text: 'text-cyan-700' },
        { title: 'Morphometrics', icon: Ruler, desc: 'Stem caliper, height, LAI', to: '/tools/morphometrics', color: 'from-indigo-400 to-violet-600', shadow: 'shadow-indigo-500/20', text: 'text-indigo-700' },
        { title: 'Spatial Mapping', icon: Map, desc: 'Greenhouse bench layouts', to: '/tools/spatial', color: 'from-rose-400 to-red-600', shadow: 'shadow-rose-500/20', text: 'text-rose-700' },
      ]
    }
  ];

  return (
    <div className="space-y-8 pb-8 animate-float" style={{ animationDuration: '12s' }}>
      <div className="px-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Tools & Modules</h1>
        <p className="text-sm text-gray-500 mt-2 font-medium">Access your precision nursery data collection tools.</p>
      </div>

      {tools.map((section, idx) => (
        <div key={idx} className="px-2">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">
            {section.category}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {section.items.map((item, i) => (
              <NavLink key={i} to={item.to} className="bento-card p-5 flex flex-col items-start bg-white/60 hover:bg-white transition-all group">
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 shadow-lg ${item.shadow} group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className={`font-black text-sm tracking-tight mb-1 ${item.text}`}>{item.title}</h3>
                <p className="text-[10px] text-gray-500 font-medium leading-snug">{item.desc}</p>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToolsPage;
