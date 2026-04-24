import React from 'react';
import { User, LogOut, Package, FileText, Bell, Shield, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const SettingsPage: React.FC = () => {
  const { logout } = useAuth();
  const sections = [
    { label: 'Inventory', icon: Package, count: '14 items', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Reports', icon: FileText, count: 'PDF/CSV', color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Alerts', icon: Bell, count: 'Enabled', color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Security', icon: Shield, count: 'Standard', color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="space-y-7">
      <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Settings</h1>

      <div className="bg-white p-7 rounded-[40px] shadow-sm border border-gray-100 flex items-center gap-5 group hover:border-green-200 transition-all">
        <div className="bg-gray-100 p-5 rounded-[28px] group-active:scale-90 transition-transform">
          <User className="w-10 h-10 text-gray-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight leading-none">Nursery Manager</h3>
          <p className="text-xs text-gray-400 font-bold mt-2 uppercase tracking-widest">manager@forestry.org</p>
        </div>
        <ChevronRight className="w-6 h-6 text-gray-200" />
      </div>

      <div className="grid grid-cols-2 gap-5">
        {sections.map((section) => (
          <button key={section.label} className="bg-white p-7 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center gap-4 active:scale-95 transition-all group hover:border-gray-200">
            <div className={`p-4 ${section.bg} rounded-3xl group-active:scale-110 transition-transform shadow-sm`}>
              <section.icon className={`w-7 h-7 ${section.color}`} />
            </div>
            <div className="text-center">
              <p className="font-black text-gray-800 text-sm uppercase tracking-tight leading-none">{section.label}</p>
              <p className="text-[9px] text-gray-300 font-black uppercase mt-1.5 tracking-widest">{section.count}</p>
            </div>
          </button>
        ))}
      </div>

      <button onClick={logout} className="w-full flex items-center justify-center gap-3 bg-red-50 text-red-600 font-black py-6 rounded-[32px] hover:bg-red-100 transition-all active:scale-95 shadow-sm text-xs uppercase tracking-widest border border-red-100">
        <LogOut className="w-6 h-6" />
        Logout
      </button>

      <div className="text-center">
        <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.2em] mt-12">AgroClimatic Lab</p>
        <p className="text-[8px] text-gray-200 font-black uppercase mt-1 tracking-widest">Precision Forestry Solutions • v1.0.0</p>
      </div>
    </div>
  );
};
export default SettingsPage;
