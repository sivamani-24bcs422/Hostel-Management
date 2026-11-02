import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-lavender-600 text-white shadow-[0_10px_24px_-12px_rgba(125,69,186,0.75)] hover:bg-lavender-700 focus-visible:ring-lavender-300',
  accent:
    'bg-lime-400 text-ink shadow-[0_10px_24px_-14px_rgba(145,176,17,0.8)] hover:bg-lime-300 focus-visible:ring-lime-300',
  secondary:
    'border border-[#E7DFF0] bg-white text-[#4B3A5A] hover:border-lavender-300 hover:bg-lavender-50 focus-visible:ring-lavender-200',
  ghost: 'text-[#6E6179] hover:bg-lavender-50 hover:text-lavender-700 focus-visible:ring-lavender-200',
  danger:
    'bg-tomato-500 text-white shadow-[0_10px_24px_-12px_rgba(226,57,43,0.7)] hover:bg-tomato-600 focus-visible:ring-tomato-300',
  'danger-soft': 'bg-tomato-50 text-tomato-700 hover:bg-tomato-100 focus-visible:ring-tomato-200',
  dark: 'bg-ink text-white hover:bg-[#3B2547] focus-visible:ring-lavender-300',
};

const sizes = {
  xs: 'h-8 rounded-lg px-2.5 text-xs gap-1.5',
  sm: 'h-9 rounded-xl px-3 text-[13px] gap-1.5',
  md: 'h-11 rounded-xl px-4 text-sm gap-2',
  lg: 'h-12 rounded-2xl px-5 text-sm gap-2',
  icon: 'h-9 w-9 rounded-xl',
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  className,
  type = 'button',
  disabled,
  ...props
}) => (
  <button
    type={type}
    disabled={disabled || loading}
    className={clsx(
      'inline-flex select-none items-center justify-center whitespace-nowrap font-bold outline-none transition-all duration-200 focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-55 active:translate-y-px',
      variants[variant],
      sizes[size],
      className
    )}
    {...props}
  >
    {loading ? <Loader2 size={16} className="animate-spin" /> : Icon ? <Icon size={16} /> : null}
    {children}
    {IconRight && !loading ? <IconRight size={16} /> : null}
  </button>
);

export default Button;
