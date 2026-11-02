import clsx from 'clsx';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import EmptyState from './ui/EmptyState';

const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your filters or create a new record.',
  emptyIcon,
  emptyAction,
  sortBy,
  sortOrder = 'desc',
  onSort,
  rowKey = '_id',
  onRowClick,
  className,
}) => {
  const getKey = (row, index) => {
    if (typeof rowKey === 'function') return rowKey(row);
    return row?.[rowKey] || index;
  };

  return (
    <div className={clsx('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#F0EBF5] bg-[#FCFAFE]">
              {columns.map((column) => {
                const isSorted = sortBy === column.sortKey;
                const SortIcon = isSorted ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th
                    key={column.key}
                    className={clsx(
                      'px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#8D8198] first:pl-5 last:pr-5',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                      column.headerClassName
                    )}
                    style={column.width ? { width: column.width } : undefined}
                  >
                    {column.sortKey && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(column.sortKey)}
                        className={clsx(
                          'inline-flex items-center gap-1 transition hover:text-lavender-700',
                          isSorted && 'text-lavender-700'
                        )}
                      >
                        {column.header}
                        <SortIcon size={12} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`} className="border-b border-[#F6F2F9]">
                    {columns.map((column, columnIndex) => (
                      <td key={column.key} className="px-4 py-4 first:pl-5 last:pr-5">
                        <div
                          className="h-4 animate-pulse rounded-md bg-[#F2ECF8]"
                          style={{ width: `${45 + ((rowIndex + columnIndex) % 4) * 12}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              : data.map((row, index) => (
                  <tr
                    key={getKey(row, index)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={clsx(
                      'border-b border-[#F6F2F9] transition-colors last:border-0 hover:bg-lavender-50/45',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {columns.map((column) => {
                      const value = column.render ? column.render(row) : row[column.key];
                      return (
                        <td
                          key={column.key}
                          className={clsx(
                            'px-4 py-3.5 align-middle text-[13px] text-[#4B3A5A] first:pl-5 last:pr-5',
                            column.align === 'right' && 'text-right',
                            column.align === 'center' && 'text-center',
                            column.className
                          )}
                        >
                          {value ?? '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {!loading && data.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : null}
    </div>
  );
};

export default DataTable;
