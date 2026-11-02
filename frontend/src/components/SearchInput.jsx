import { Search, X } from 'lucide-react';
import clsx from 'clsx';

const SearchInput = ({ value, onChange, placeholder = 'Search...', className }) => (
  <div className={clsx('relative min-w-[210px] flex-1 sm:max-w-xs', className)}>
    <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A79CB1]" />
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="input-base pl-10 pr-9"
      aria-label={placeholder}
    />
    {value ? (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#A79CB1] transition hover:bg-lavender-50 hover:text-ink"
        aria-label="Clear search"
      >
        <X size={14} />
      </button>
    ) : null}
  </div>
);

export default SearchInput;
