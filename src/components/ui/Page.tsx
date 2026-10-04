import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../utils/cn';

type HeaderProps = {
  title: string;
  subtitle?: ReactNode;
  /** Path to go back to, or true for browser history. */
  back?: string | true;
  actions?: ReactNode;
};

export const PageHeader = ({ title, subtitle, back, actions }: HeaderProps) => {
  const navigate = useNavigate();
  return (
    <header className="flex items-start gap-2">
      {back && (
        <button
          onClick={() => (back === true ? navigate(-1) : navigate(back))}
          aria-label="Back"
          className="p-2 -ml-2 mt-0.5 rounded-md text-gray-500 hover:bg-green-50 hover:text-green-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </header>
  );
};

/** Page body with consistent vertical rhythm. */
export const Page = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('space-y-5 pb-8 animate-page-in', className)}>{children}</div>
);

type SectionProps = { title?: string; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean };

/** A titled panel. `flush` removes inner padding for lists and tables. */
export const Section = ({ title, actions, children, className, flush }: SectionProps) => (
  <section className={cn('bg-white border border-gray-200 rounded-lg', !flush && 'p-4', className)}>
    {(title || actions) && (
      <div className={cn('flex items-center justify-between gap-2', flush ? 'px-4 pt-3 pb-2' : 'mb-3')}>
        {title && <h2 className="sci-section-title">{title}</h2>}
        {actions}
      </div>
    )}
    {children}
  </section>
);
