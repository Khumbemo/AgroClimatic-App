import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, ThermometerSun, Leaf, Droplets, Map, Ruler, Database, FlaskConical, Beaker, MapPin, Skull, ShieldCheck, Dna } from 'lucide-react';

const ToolsPage = () => {
  const tools = [
    {
      category: 'Core Modules',
      items: [
        { title: 'Nursery Batches', icon: Leaf, to: '/nursery', color: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-500/20', text: 'text-emerald-800' },
        { title: 'Records & Logs', icon: Database, to: '/records', color: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-500/20', text: 'text-emerald-800' },
        { title: 'Species Database', icon: Activity, to: '/species', color: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-500/20', text: 'text-emerald-800' },
      ]
    },
    {
      category: 'Scientific Features',
      items: [
        { title: 'Environmental Logs', icon: ThermometerSun, to: '/tools/environmental', color: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-500/20', text: 'text-emerald-800' },
        { title: 'Germination Tracker', icon: Activity, to: '/tools/germination', color: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-500/20', text: 'text-emerald-800' },
        { title: 'Treatment Logs', icon: Droplets, to: '/tools/treatments', color: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-500/20', text: 'text-emerald-800' },
        { title: 'Morphometrics', icon: Ruler, to: '/tools/morphometrics', color: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-500/20', text: 'text-emerald-800' },
        { title: 'Spatial Mapping', icon: Map, to: '/tools/spatial', color: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-500/20', text: 'text-emerald-800' },
      ]
    },
    {
      category: 'Advanced Research',
      items: [
        { title: 'Experimental Design', icon: FlaskConical, to: '/tools/experimental', color: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-500/20', text: 'text-emerald-800' },
        { title: 'Substrate & Nutrients', icon: Beaker, to: '/tools/substrate', color: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-500/20', text: 'text-emerald-800' },
        { title: 'Provenance & Lineage', icon: MapPin, to: '/tools/provenance', color: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-500/20', text: 'text-emerald-800' },
        { title: 'Mortality Diagnostics', icon: Skull, to: '/tools/mortality', color: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-500/20', text: 'text-emerald-800' },
        { title: 'Data Quality & Audit', icon: ShieldCheck, to: '/tools/audit', color: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-500/20', text: 'text-emerald-800' },
      ]
    }
  ];

  return (
    <div className="space-y-8 pb-8 animate-float" style={{ animationDuration: '12s' }}>
      <div className="px-2">
        <h1 className="text-3xl font-black tracking-tight">Tools</h1>
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
                <div className="flex-1">
                  <h3 className={`font-black text-sm tracking-tight ${item.text}`}>{item.title}</h3>
                </div>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToolsPage;
