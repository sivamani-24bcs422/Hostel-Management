import clsx from 'clsx';
import { statusTone, titleCase } from '../../utils/format';

const tones = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/10',
  danger: 'bg-tomato-50 text-tomato-700 ring-tomato-600/10',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/10',
  neutral: 'bg-[#F4F1F7] text-[#6E6179] ring-ink/5',
  purple: 'bg-lavender-50 text-lavender-700 ring-lavender-600/10',
  pink: 'bg-pink-50 text-pink-700 ring-pink-600/10',
};

const dots = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-tomato-500',
  info: 'bg-sky-500',
  neutral: 'bg-[#A79CB1]',
  purple: 'bg-lavender-400',
  pink: 'bg-pink-400',
};

const Badge = ({ children, tone, status, dot = false, className }) => {
  const resolvedTone = tone || statusTone(status) || 'neutral';
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ring-inset',
        tones[resolvedTone] || tones.neutral,
        className
      )}
    >
      {dot ? <span className={clsx('h-1.5 w-1.5 rounded-full', dots[resolvedTone] || dots.neutral)} /> : null}
      {children || titleCase(status)}
    </span>
  );
};

export default Badge;
