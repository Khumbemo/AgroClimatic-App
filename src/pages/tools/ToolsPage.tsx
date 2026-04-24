import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, ThermometerSun, Leaf, Droplets, Map, Ruler, Database } from 'lucide-react';

const ToolsPage = () => {
  const tools = [
    {
      category: 'Existing Modules',
      items: [
        { title: 'Nursery Batches', icon: Leaf, desc: 'Manage active seed batches', to: '/nursery', color: 'bg-green-50 text-green-600 border-green-200' },
        { title: 'Records & Logs', icon: Database, desc: 'View past logs and seed lots', to: '/records', color: 'bg-blue-50 text-blue-600 border-blue-200' },
        { title: 'Species Database', icon: Activity, desc: 'Manage species profiles', to: '/species', color: 'bg-purple-50 text-purple-600 border-purple-200' },
      ]
    },
    {
      category: 'Upcoming Features',
      items: [
        { title: 'Environmental Logs', icon: ThermometerSun, desc: 'Record temp, humidity, PAR', to: '#', color: 'bg-orange-50 text-orange-600 border-orange-200' },
        { title: 'Germination Tracker', icon: Activity, desc: 'Daily sprout counts & metrics', to: '#', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        { title: 'Treatment Logs', icon: Droplets, desc: 'Fertilization & pre-sowing info', to: '#', color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
        { title: 'Morphometrics', icon: Ruler, desc: 'Stem caliper, height, LAI', to: '#', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
        { title: 'Spatial Mapping', icon: Map, desc: 'Greenhouse bench layouts', to: '#', color: 'bg-rose-50 text-rose-600 border-rose-200' },
      ]
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Tools & Modules</h1>
        <p className="text-sm text-gray-500 mt-1 font-medium">Access your nursery data collection tools.</p>
      </div>

      {tools.map((section, idx) => (
        <div key={idx}>
          <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">
            {section.category}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {section.items.map((item, i) => (
              item.to !== '#' ? (
                <NavLink key={i} to={item.to} className={`p-4 rounded-2xl border flex flex-col items-start transition-all hover:scale-[1.02] active:scale-95 ${item.color}`}>
                  <div className="bg-white/60 p-2 rounded-xl mb-3 shadow-sm">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 leading-tight mb-1">{item.title}</h3>
                  <p className="text-[10px] text-gray-600 leading-snug">{item.desc}</p>
                </NavLink>
              ) : (
                <div key={i} className={`p-4 rounded-2xl border flex flex-col items-start opacity-70 grayscale-[50%] ${item.color}`}>
                  <div className="bg-white/60 p-2 rounded-xl mb-3 shadow-sm">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 leading-tight mb-1">{item.title}</h3>
                  <p className="text-[10px] text-gray-600 leading-snug mb-2">{item.desc}</p>
                  <span className="text-[8px] bg-gray-900 text-white px-2 py-0.5 rounded-full uppercase font-black tracking-widest mt-auto">Coming Soon</span>
                </div>
              )
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToolsPage;
