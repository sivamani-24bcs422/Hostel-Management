import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ page = 1, pages = 1, total = 0, limit = 10, onPageChange, onLimitChange }) => {
  const safePages = Math.max(1, pages || 1);
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 border-t border-[#F0EBF5] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex items-center gap-3 text-xs text-muted">
        <span>
          Showing <span className="font-bold text-ink">{start}-{end}</span> of{' '}
          <span className="font-bold text-ink">{total}</span>
        </span>
        {onLimitChange ? (
          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            className="h-8 rounded-lg border border-[#E8E1F0] bg-white px-2 text-xs font-semibold text-ink outline-none focus:border-lavender-400"
            aria-label="Rows per page"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange?.(page - 1)}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8E1F0] bg-white text-muted transition hover:border-lavender-300 hover:text-lavender-700 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="px-2 text-xs font-semibold text-muted">
          Page <span className="text-ink">{page}</span> of {safePages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange?.(page + 1)}
          disabled={page >= safePages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8E1F0] bg-white text-muted transition hover:border-lavender-300 hover:text-lavender-700 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
