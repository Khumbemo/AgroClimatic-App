import React, { Suspense } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Wrench, Calculator, MessageSquare, Settings, Sprout, ClipboardList, BookOpen } from 'lucide-react';
import { cn } from '../../utils/cn';

// Gable-roof greenhouse with a seedling inside: the app's mark.
const GreenhouseMark = () => (
  <div className="w-9 h-9 rounded-md bg-green-700 flex items-center justify-center shrink-0">
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-100" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11 12 4l9 7" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M12 20v-5" />
      <path d="M12 16c-2.2 0-3.4-1.3-3.4-3.2 2 0 3.4 1.1 3.4 3.2Z" className="fill-green-300" stroke="none" />
      <path d="M12 15c0-2 1.3-3.2 3.4-3.2 0 2-1.4 3.2-3.4 3.2Z" className="fill-green-200" stroke="none" />
    </svg>
  </div>
);

const primaryNav = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/tools', icon: Wrench, label: 'Tools' },
  { to: '/calc', icon: Calculator, label: 'Calc' },
  { to: '/chat', icon: MessageSquare, label: 'AgroBot' },
];

// Extra shortcuts shown in the desktop sidebar
const secondaryNav = [
  { to: '/nursery', icon: Sprout, label: 'Batches' },
  { to: '/records', icon: ClipboardList, label: 'Records' },
  { to: '/species', icon: BookOpen, label: 'Species' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const isActive = (pathname: string, to: string) => (to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`));

const TopHeader = () => {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-50 bg-white/95 border-b border-gray-200 lg:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="max-w-2xl mx-auto px-4 h-14 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <GreenhouseMark />
          <div className="leading-tight">
            <span className="font-semibold text-[15px] text-gray-900 block">AgroClimatic</span>
            <span className="text-[10px] text-gray-500 font-mono-sci">Nursery research lab</span>
          </div>
        </div>
        <button onClick={() => navigate('/settings')} aria-label="Settings" className="p-2 -mr-2 text-gray-500 hover:text-green-700 hover:bg-green-50 transition-colors rounded-md">
          <Settings className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>
    </header>
  );
};

const SideNav = () => {
  const { pathname } = useLocation();
  const item = ({ to, icon: Icon, label }: (typeof primaryNav)[number]) => {
    const active = isActive(pathname, to);
    return (
      <NavLink key={to} to={to} end={to === '/'} aria-current={active ? 'page' : undefined}
        className={cn('flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors', active ? 'bg-green-50 text-green-900 font-medium' : 'text-gray-700 hover:bg-gray-100')}>
        <Icon className={cn('w-[18px] h-[18px]', active ? 'text-green-700' : 'text-gray-500')} strokeWidth={1.8} />
        {label === 'Calc' ? 'Calculators' : label}
      </NavLink>
    );
  };
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-gray-200 bg-white px-3 py-4 gap-6">
      <div className="flex items-center gap-2.5 px-2">
        <GreenhouseMark />
        <div className="leading-tight">
          <span className="font-semibold text-[15px] text-gray-900 block">AgroClimatic</span>
          <span className="text-[10px] text-gray-500 font-mono-sci">Nursery research lab</span>
        </div>
      </div>
      <nav aria-label="Main" className="flex flex-col gap-1">{primaryNav.map(item)}</nav>
      <nav aria-label="Shortcuts" className="flex flex-col gap-1 border-t border-gray-100 pt-4">{secondaryNav.map(item)}</nav>
    </aside>
  );
};

const BottomNav = () => {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Main" className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="max-w-2xl mx-auto flex justify-around items-stretch h-16">
        {primaryNav.map(({ to, icon: Icon, label }) => {
          const active = isActive(pathname, to);
          return (
            <NavLink key={to} to={to} end={to === '/'} aria-current={active ? 'page' : undefined} className="relative flex-1 flex flex-col items-center justify-center gap-1">
              <span className={cn('absolute top-0 h-0.5 w-10 rounded-b transition-colors', active ? 'bg-green-700' : 'bg-transparent')} />
              <Icon className={cn('w-5 h-5 transition-colors', active ? 'text-green-700' : 'text-gray-500')} strokeWidth={2} />
              <span className={cn('text-[11px] font-medium transition-colors', active ? 'text-green-800' : 'text-gray-600')}>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

const MainLayout: React.FC = () => {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col selection:bg-green-200">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-80 focus:bg-white focus:px-3 focus:py-2 focus:rounded-md focus:border focus:border-green-700">Skip to content</a>
      <TopHeader />
      <SideNav />
      <main id="main" className="flex-1 w-full px-4 pt-5 pb-24 lg:pb-10 lg:pl-60">
        <div key={location.pathname} className="max-w-2xl mx-auto lg:max-w-4xl lg:px-8">
          <Suspense fallback={<p className="text-sm text-gray-500 py-8 text-center">Loading…</p>}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default MainLayout;
