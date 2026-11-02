import { formatCurrency, formatNumber } from '../../utils/format';

const ChartTooltip = ({ active, payload, label, currency = false }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[150px] rounded-2xl border border-[#EFE8F6] bg-white p-3 shadow-float">
      <p className="mb-2 text-[11px] font-extrabold text-ink">{label}</p>
      <div className="space-y-1.5">
        {payload.map((item) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-4 text-[10px]">
            <span className="flex items-center gap-1.5 capitalize text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: item.color || item.fill }} />
              {item.name}
            </span>
            <span className="font-extrabold text-ink">
              {currency ? formatCurrency(item.value) : formatNumber(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartTooltip;
