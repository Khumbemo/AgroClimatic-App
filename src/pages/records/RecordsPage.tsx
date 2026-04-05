import React from 'react';
import { ClipboardList, Thermometer, FlaskConical, Bug, Droplets, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const RecordsPage: React.FC = () => {
  const logs = [
    { title: 'Seed Lots', icon: ClipboardList, color: 'text-green-600', bg: 'bg-green-50', to: '/records/seeds', desc: 'Provenance & stock tracking' },
    { title: 'Climate Log', icon: Thermometer, color: 'text-orange-600', bg: 'bg-orange-50', to: '/records/climate', desc: 'Temp, humidity & PAR data' },
    { title: 'Nutrition Log', icon: FlaskConical, color: 'text-purple-600', bg: 'bg-purple-50', to: '/records/nutrition', desc: 'NPK, EC & pH management' },
    { title: 'Pest & Disease', icon: Bug, color: 'text-red-600', bg: 'bg-red-50', to: '/records/pest', desc: 'Incident reporting & history' },
    { title: 'Irrigation Log', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50', to: '/records/irrigation', desc: 'Volume & scheduling' },
  ];

  return (
    <div className="space-y-7">
      <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Records</h1>

      <div className="grid gap-5">
        {logs.map((log) => (
          <Link key={log.title} to={log.to} className="bg-white p-6 rounded-[36px] shadow-sm border border-gray-100 flex items-center gap-5 hover:border-gray-300 transition-all active:scale-[0.98] group">
            <div className={`p-5 rounded-3xl ${log.bg} group-active:scale-90 transition-transform shadow-sm`}>
              <log.icon className={`w-7 h-7 ${log.color}`} />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-gray-800 text-lg tracking-tight uppercase leading-none">{log.title}</h3>
              <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-wider">{log.desc}</p>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-200" />
          </Link>
        ))}
      </div>
    </div>
  );
};
export default RecordsPage;
