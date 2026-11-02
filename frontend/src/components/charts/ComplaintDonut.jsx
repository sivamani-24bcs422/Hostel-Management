import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { titleCase } from '../../utils/format';
import ChartTooltip from './ChartTooltip';

const colors = {
  open: '#E2392B',
  in_progress: '#C29BEA',
  resolved: '#91B011',
  rejected: '#D8CFDF',
};

const ComplaintDonut = ({ data = [], height = 220 }) => {
  const filtered = data.filter((entry) => entry.count > 0);
  const total = filtered.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={filtered}
            dataKey="count"
            nameKey="status"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={3}
            strokeWidth={0}
          >
            {filtered.map((entry) => (
              <Cell key={entry.status} fill={colors[entry.status] || '#DFD4EA'} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold tracking-tight text-ink">{total}</span>
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Total</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {filtered.map((entry) => (
          <span key={entry.status} className="inline-flex items-center gap-1.5 text-[10px] font-semibold capitalize text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: colors[entry.status] || '#DFD4EA' }} />
            {titleCase(entry.status)} · {entry.count}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ComplaintDonut;
