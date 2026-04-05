import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Sprout, ClipboardList, Database, Settings } from 'lucide-react';
import { cn } from '../../utils/cn';

const BottomNav = () => {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Home' },
    { to: '/nursery', icon: Sprout, label: 'Nursery' },
    { to: '/records', icon: ClipboardList, label: 'Records' },
    { to: '/species', icon: Database, label: 'Species' },
    { to: '/settings', icon: Settings, label: 'Config' },
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="max-w-md mx-auto p-4 md:max-w-2xl lg:max-w-4xl">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default MainLayout;
