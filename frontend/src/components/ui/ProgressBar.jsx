import clsx from 'clsx';

const colors = {
  lavender: 'bg-lavender-400',
  lime: 'bg-lime-400',
  tomato: 'bg-tomato-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-400',
  sky: 'bg-sky-500',
};

const ProgressBar = ({ value = 0, color = 'lavender', className, trackClassName, showLabel = false }) => {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className={clsx('h-1.5 flex-1 overflow-hidden rounded-full bg-[#F0EAF6]', trackClassName)}>
        <div
          className={clsx('h-full rounded-full transition-all duration-700', colors[color])}
          style={{ width: `${safeValue}%` }}
        />
      </div>
      {showLabel ? <span className="w-9 text-right text-[10px] font-bold text-muted">{safeValue}%</span> : null}
    </div>
  );
};

export default ProgressBar;
