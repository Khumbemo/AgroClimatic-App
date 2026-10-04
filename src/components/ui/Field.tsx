import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export const controlCls =
  'w-full mt-1.5 px-3 py-2.5 rounded-md border border-gray-300 bg-white text-sm text-gray-900 outline-hidden transition-colors focus:border-green-600 focus:ring-2 focus:ring-green-100 placeholder:text-gray-400';

type Base = { id: string; label: string; unit?: string; hint?: string; className?: string };

export const Label = ({ htmlFor, label, unit }: { htmlFor: string; label: string; unit?: string }) => (
  <label htmlFor={htmlFor} className="sci-label">
    {label}
    {unit && <span className="ml-1 normal-case tracking-normal font-mono-sci text-gray-500">({unit})</span>}
  </label>
);

const Hint = ({ hint }: { hint?: string }) => (hint ? <p className="text-[11px] text-gray-500 mt-1">{hint}</p> : null);

type TextFieldProps = Base & {
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'number' | 'date';
  step?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  mono?: boolean;
  required?: boolean;
};

/** Labelled input; numbers are kept as strings until the record is saved. */
export const TextField = ({ id, label, unit, hint, className, value, onChange, type = 'text', step, min, max, placeholder, mono, required }: TextFieldProps) => (
  <div className={className}>
    <Label htmlFor={id} label={label} unit={unit} />
    <input
      id={id}
      type={type}
      inputMode={type === 'number' ? 'decimal' : undefined}
      step={step}
      min={min}
      max={max}
      required={required}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={cn(controlCls, (mono || type === 'number' || type === 'date') && 'font-mono-sci')}
    />
    <Hint hint={hint} />
  </div>
);

type SelectFieldProps = Base & {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
};

export const SelectField = ({ id, label, unit, hint, className, value, onChange, options, placeholder }: SelectFieldProps) => (
  <div className={className}>
    <Label htmlFor={id} label={label} unit={unit} />
    <select id={id} value={value} onChange={e => onChange(e.target.value)} className={controlCls}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <Hint hint={hint} />
  </div>
);

export const TextAreaField = ({ id, label, hint, className, value, onChange, rows = 2, placeholder }: Base & { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) => (
  <div className={className}>
    <Label htmlFor={id} label={label} />
    <textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={controlCls} />
    <Hint hint={hint} />
  </div>
);

/** Wraps a custom control (e.g. BatchSelect) with the standard label. */
export const FieldShell = ({ id, label, unit, hint, className, children }: Base & { children: ReactNode }) => (
  <div className={className}>
    <Label htmlFor={id} label={label} unit={unit} />
    {children}
    <Hint hint={hint} />
  </div>
);

/** Groups related fields under a caption, e.g. "Irrigation water" / "Leachate". */
export const FieldGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <fieldset className="border border-gray-200 rounded-md p-3 space-y-3">
    <legend className="px-1 sci-label">{title}</legend>
    {children}
  </fieldset>
);
