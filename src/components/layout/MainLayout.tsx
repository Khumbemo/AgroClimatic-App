import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Wrench, Calculator, MessageSquare, Settings } from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';

const TopHeader = () => {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-50 bg-white/95 border-b border-gray-200">
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <GreenhouseMark />
          <div className="leading-tight">
            <span className="font-semibold text-[15px] text-gray-900 block">AgroClimatic</span>
            <span className="text-[10px] text-gray-500 font-mono-sci">Nursery research lab · v1.2</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/settings')}
          aria-label="Settings"
          className="p-2 -mr-2 text-gray-500 hover:text-green-700 hover:bg-green-50 transition-colors rounded-md"
        >
          <Settings className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>
    </header>
  );
};

// Gable-roof greenhouse with a seedling inside: the app's mark.
const GreenhouseMark = () => (
  <div className="w-9 h-9 rounded-md bg-green-700 flex items-center justify-center">
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-100" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11 12 4l9 7" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M12 20v-5" />
      <path d="M12 16c-2.2 0-3.4-1.3-3.4-3.2 2 0 3.4 1.1 3.4 3.2Z" className="fill-green-300" stroke="none" />
      <path d="M12 15c0-2 1.3-3.2 3.4-3.2 0 2-1.4 3.2-3.4 3.2Z" className="fill-green-200" stroke="none" />
    </svg>
  </div>
);

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/tools', icon: Wrench, label: 'Tools' },
  { to: '/calc', icon: Calculator, label: 'Calc' },
  { to: '/chat', icon: MessageSquare, label: 'AgroBot' },
];

const BottomNav = () => {
  const location = useLocation();

  const getIsActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto flex justify-around items-stretch h-16">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = getIsActive(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="relative flex-1 flex flex-col items-center justify-center gap-1"
            >
              <span className={cn("absolute top-0 h-0.5 w-10 rounded-b transition-colors", active ? "bg-green-700" : "bg-transparent")} />
              <Icon className={cn("w-5 h-5 transition-colors", active ? "text-green-700" : "text-gray-400")} strokeWidth={2} />
              <span className={cn("text-[11px] font-medium transition-colors", active ? "text-green-800" : "text-gray-500")}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

const MainLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [direction, setDirection] = useState(0);

  const currentIndex = navItems.findIndex(item => {
    if (item.to === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.to);
  });

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // SECURITY: Disable swiping if user is focused on an input or if we're in Chat
    const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '');
    if (isInput) return;

    const swipeThreshold = 80; // Increased threshold for intentional swipes
    if (currentIndex === -1) return;

    if (info.offset.x < -swipeThreshold && currentIndex < navItems.length - 1) {
      setDirection(1);
      navigate(navItems[currentIndex + 1].to);
    } else if (info.offset.x > swipeThreshold && currentIndex > 0) {
      setDirection(-1);
      navigate(navItems[currentIndex - 1].to);
    }
  };

  return (
    <div className="min-h-screen pb-24 flex flex-col font-sans selection:bg-green-200">
      <TopHeader />
      <main className="flex-1 max-w-md mx-auto px-4 pt-5 md:max-w-2xl lg:max-w-4xl w-full overflow-x-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={location.pathname}
            custom={direction}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.05} // Lower elasticity to prevent jumpy feeling
            onDragEnd={handleDragEnd}
            className="w-full h-full touch-pan-y"
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
