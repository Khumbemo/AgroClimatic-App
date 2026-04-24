import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Wrench, Calculator, MessageSquare, Settings } from 'lucide-react';
import { cn } from '../../utils/cn';

const TopHeader = () => {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center shadow-sm">
          <span className="text-white font-black text-sm">AC</span>
        </div>
        <span className="font-black text-gray-900 tracking-tight">AgroClimatic</span>
      </div>
      <button 
        onClick={() => navigate('/settings')}
        className="p-2 text-gray-400 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-50"
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center h-16 pb-safe z-50">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-full h-full text-[10px] font-bold uppercase tracking-tight transition-colors",
              isActive ? "text-green-600" : "text-gray-400 hover:text-green-500"
            )
          }
        >
          <Icon className="w-5 h-5 mb-1" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-20 flex flex-col">
      <TopHeader />
      <main className="flex-1 max-w-md mx-auto p-4 md:max-w-2xl lg:max-w-4xl w-full">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default MainLayout;
