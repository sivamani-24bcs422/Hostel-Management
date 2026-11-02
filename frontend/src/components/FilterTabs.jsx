import clsx from 'clsx';

const FilterTabs = ({ options = [], value, onChange, className }) => (
  <div className={clsx('no-scrollbar flex items-center gap-1.5 overflow-x-auto rounded-2xl bg-[#F7F3FB] p-1', className)}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={clsx(
          'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold transition-all',
          value === option.value
            ? 'bg-white text-lavender-700 shadow-sm'
            : 'text-[#7B6D87] hover:bg-white/60 hover:text-ink'
        )}
      >
        {option.label}
        {option.count !== undefined ? (
          <span
            className={clsx(
              'rounded-md px-1.5 py-0.5 text-[10px] font-extrabold',
              value === option.value ? 'bg-lavender-100 text-lavender-700' : 'bg-[#EEE8F5] text-[#8D8198]'
            )}
          >
            {option.count}
          </span>
        ) : null}
      </button>
    ))}
  </div>
);

export default FilterTabs;
