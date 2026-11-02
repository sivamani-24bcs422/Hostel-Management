import clsx from 'clsx';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

const tones = {
  lavender: 'bg-lavender-100 text-lavender-700',
  lime: 'bg-lime-100 text-lime-700',
  tomato: 'bg-tomato-50 text-tomato-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  sky: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
  pink: 'bg-pink-50 text-pink-600',
};

const StatCard = ({ label, value, icon: Icon, tone = 'lavender', helper, trend, loading = false, className }) => (
  <div
    className={clsx(
      'group relative overflow-hidden rounded-3xl border border-white/80 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-float',
      className
    )}
  >
    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-lavender-100/50 to-lime-100/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    <div className="relative flex items-start justify-between gap-3">
      <div className={clsx('flex h-11 w-11 items-center justify-center rounded-2xl', tones[tone])}>
        {Icon ? <Icon size={20} strokeWidth={2.2} /> : null}
      </div>
      {trend ? (
        <span
          className={clsx(
            'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold',
            trend.positive === false ? 'bg-tomato-50 text-tomato-600' : 'bg-emerald-50 text-emerald-600'
          )}
        >
          {trend.positive === false ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
          {trend.value}
        </span>
      ) : null}
    </div>
    <div className="relative mt-4">
      <p className="text-[12px] font-semibold text-muted">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded-lg bg-[#F2ECF8]" />
      ) : (
        <p className="mt-1 text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-ink">{value}</p>
      )}
      {helper ? <p className="mt-1.5 text-[11px] text-[#978BA1]">{helper}</p> : null}
    </div>
  </div>
);

export default StatCard;
