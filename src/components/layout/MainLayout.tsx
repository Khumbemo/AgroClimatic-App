import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Wrench, Calculator, MessageSquare, Settings } from 'lucide-react';
import { cn } from '../../utils/cn';

const TopHeader = () => {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-50 glass-panel border-b-0 px-5 py-4 flex justify-between items-center mx-4 mt-4 rounded-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
          <span className="text-white font-black text-sm tracking-widest">AC</span>
        </div>
        <span className="font-black text-xl text-gray-800 tracking-tight">AgroClimatic</span>
      </div>
      <button 
        onClick={() => navigate('/settings')}
        className="p-2.5 text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all rounded-full"
      >
        <Settings className="w-6 h-6" />
      </button>
    </header>
  );
};

const BottomNav = () => {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/tools', icon: Wrench, label: 'Tools' },
    { to: '/calc', icon: Calculator, label: 'Calc' },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 px-4 z-50 flex justify-center">
      <nav className="glass-pill flex justify-around items-center h-16 w-full max-w-md rounded-full px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center w-16 h-12 rounded-2xl transition-all duration-300",
                isActive 
                  ? "text-green-600 bg-green-50/80 scale-105 shadow-sm" 
                  : "text-gray-400 hover:text-green-500 hover:bg-gray-50/50"
              )
            }
          >
            <Icon className="w-5 h-5 mb-0.5" strokeWidth={2.5} />
            <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen pb-32 flex flex-col font-sans selection:bg-green-200">
      <TopHeader />
      <main className="flex-1 max-w-md mx-auto px-4 pt-6 md:max-w-2xl lg:max-w-4xl w-full">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default MainLayout;
