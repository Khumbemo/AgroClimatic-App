import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

export type Tone = 'neutral' | 'leaf' | 'water' | 'warn' | 'critical';

const chipTone: Record<Tone, string> = {
  neutral: 'bg-gray-100 text-gray-700 border-gray-200',
  leaf: 'bg-green-50 text-green-800 border-green-200',
  water: 'bg-blue-50 text-blue-700 border-blue-200',
  warn: 'bg-amber-50 text-amber-800 border-amber-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};

export const Chip = ({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) => (
  <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-sm border text-[11px] font-medium whitespace-nowrap', chipTone[tone], className)}>{children}</span>
);

const statTone: Record<Tone, string> = {
  neutral: 'text-gray-900', leaf: 'text-green-700', water: 'text-blue-700', warn: 'text-amber-700', critical: 'text-red-700',
};

/** A labelled reading with its unit; `formula` documents how it was derived. */
export const Stat = ({ label, value, unit, note, formula, tone = 'neutral' }: { label: string; value: ReactNode; unit?: string; note?: ReactNode; formula?: string; tone?: Tone }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-3.5 min-w-0">
    <p className="sci-label truncate">{label}</p>
    <p className="mt-1 flex items-baseline gap-1 flex-wrap">
      <span className={cn('font-mono-sci text-xl font-medium', statTone[tone])}>{value}</span>
      {unit && <span className="font-mono-sci text-xs text-gray-500">{unit}</span>}
    </p>
    {formula && <p className="font-mono-sci text-[10px] text-gray-500 mt-0.5 truncate" title={formula}>{formula}</p>}
    {note && <p className="text-[11px] text-gray-500 mt-0.5">{note}</p>}
  </div>
);

export const StatGrid = ({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) => (
  <div className={cn('grid gap-3', cols === 2 ? 'grid-cols-2' : cols === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4')}>{children}</div>
);

export const EmptyState = ({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: ReactNode; action?: ReactNode }) => (
  <div className="bg-white border border-dashed border-gray-300 rounded-lg p-8 text-center">
    <Icon className="w-9 h-9 text-gray-300 mx-auto mb-3" strokeWidth={1.6} />
    <p className="text-sm font-medium text-gray-800">{title}</p>
    {text && <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">{text}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export const Notice = ({ tone = 'warn', children }: { tone?: 'warn' | 'info'; children: ReactNode }) => (
  <div className={cn('flex gap-2 items-start text-sm rounded-md p-3 border', tone === 'warn' ? 'text-amber-900 bg-amber-50 border-amber-200' : 'text-blue-900 bg-blue-50 border-blue-200')}>
    {tone === 'warn' ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <Info className="w-4 h-4 shrink-0 mt-0.5" />}
    <div className="min-w-0">{children}</div>
  </div>
);

/** Fixed-height frame for a chart so canvases size predictably. */
export const ChartFrame = ({ title, children, height = 256, caption }: { title?: string; children: ReactNode; height?: number; caption?: ReactNode }) => (
  <figure className="bg-white border border-gray-200 rounded-lg p-4">
    {title && <figcaption className="sci-section-title mb-2">{title}</figcaption>}
    <div style={{ height }} className="relative">{children}</div>
    {caption && <p className="text-[11px] text-gray-500 mt-2">{caption}</p>}
  </figure>
);

export const Tabs = <T extends string>({ tabs, value, onChange, label }: { tabs: readonly { value: T; label: string; icon?: LucideIcon }[]; value: T; onChange: (v: T) => void; label: string }) => (
  <div role="tablist" aria-label={label} className="flex bg-gray-100 p-1 rounded-lg gap-1">
    {tabs.map(t => (
      <button
        key={t.value}
        role="tab"
        aria-selected={value === t.value}
        onClick={() => onChange(t.value)}
        className={cn('flex-1 py-2 px-2 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors', value === t.value ? 'bg-white text-green-800 border border-gray-200' : 'text-gray-600 hover:text-gray-900')}
      >
        {t.icon && <t.icon className="w-3.5 h-3.5" />}
        {t.label}
      </button>
    ))}
  </div>
);
