import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Wrench, Calculator, MessageSquare, Settings, ArrowLeft } from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

const TopHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const pathParts = location.pathname.split('/').filter(Boolean);
  const isSubPage = pathParts.length > 1;

  const subPageTitles: Record<string, string> = {
    'tools/environmental': 'Environmental Logs',
    'tools/germination': 'Germination Tracker',
    'tools/treatments': 'Treatment Logs',
    'tools/morphometrics': 'Morphometrics',
    'tools/spatial': 'Spatial Mapping',
    'tools/experimental': 'Experimental Design',
    'tools/substrate': 'Substrate & Nutrients',
    'tools/provenance': 'Provenance & Lineage',
    'tools/mortality': 'Mortality Diagnostics',
    'tools/audit': 'Data Quality & Audit',
    'nursery/new': 'New Batch',
    'records/seeds': 'Seed Lots',
    'settings': 'Settings',
  };

  const currentSubPath = pathParts.join('/');
  const subTitle = subPageTitles[currentSubPath];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b-0 px-4 py-3 flex justify-between items-center mx-3 mt-3 rounded-2xl">
      {isSubPage && subTitle ? (
        <>
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="p-2 -ml-1 text-gray-500 hover:text-green-600 hover:bg-green-50 transition-all rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </motion.button>
          <span className="font-black text-sm text-gray-800 tracking-tight flex-1 text-center">{subTitle}</span>
          <div className="w-9" />
        </>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <span className="text-white font-black text-[10px] tracking-widest">AC</span>
            </div>
            <div>
              <span className="font-black text-lg text-gray-800 tracking-tight leading-none block">AgroClimatic</span>
              <span className="text-[8px] text-gray-400 font-mono-sci font-bold uppercase tracking-widest">Lab v1.0</span>
            </div>
          </div>
          <motion.button
            whileHover={{ rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/settings')}
            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all rounded-xl"
          >
            <Settings className="w-5 h-5" strokeWidth={2.5} />
          </motion.button>
        </>
      )}
    </header>
  );
};

const BottomNav = () => {
  const location = useLocation();
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/tools', icon: Wrench, label: 'Tools' },
    { to: '/calc', icon: Calculator, label: 'Calc' },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
  ];

  const getIsActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <div className="fixed bottom-4 left-0 right-0 px-4 z-50 flex justify-center">
      <nav className="glass-pill flex justify-around items-center h-14 w-full max-w-md rounded-full px-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="relative flex flex-col items-center justify-center w-16 h-11"
          >
            {({ isActive }) => (
              <>
                <AnimatePresence>
                  {getIsActive(to) && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-green-50/80 rounded-2xl -z-10 shadow-sm"
                      transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
                    />
                  )}
                </AnimatePresence>
                <Icon
                  className={cn(
                    "w-5 h-5 mb-0.5 transition-colors duration-300",
                    getIsActive(to) ? "text-green-600" : "text-gray-400"
                  )}
                  strokeWidth={2.5}
                />
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-widest transition-colors duration-300",
                  getIsActive(to) ? "text-green-600" : "text-gray-400"
                )}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen pb-24 flex flex-col font-sans selection:bg-green-200">
      <TopHeader />
      <main className="flex-1 max-w-md mx-auto px-4 pt-4 md:max-w-2xl lg:max-w-4xl w-full overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
};

export default MainLayout;
