import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variants: Record<Variant, string> = {
  primary: 'bg-green-700 text-white hover:bg-green-800 border border-green-700',
  secondary: 'bg-white text-gray-800 border border-gray-300 hover:border-green-600 hover:text-green-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 border border-red-600',
  ghost: 'text-gray-600 hover:bg-gray-100 border border-transparent',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: ReactNode; size?: 'sm' | 'md'; block?: boolean };

const Button = ({ variant = 'primary', icon, size = 'md', block, className, children, type = 'button', ...rest }: Props) => (
  <button
    type={type}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
      size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
      block && 'w-full',
      variants[variant],
      className,
    )}
    {...rest}
  >
    {icon}
    {children}
  </button>
);

export default Button;
