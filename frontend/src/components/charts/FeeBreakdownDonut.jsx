import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency, titleCase } from '../../utils/format';
import ChartTooltip from './ChartTooltip';

const colors = ['#9561D2', '#D0F431', '#E2392B', '#C29BEA', '#F3A198', '#91B011'];

const FeeBreakdownDonut = ({ data = [], height = 220 }) => {
  const total = data.reduce((sum, item) => sum + (item.billed || 0), 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="billed" nameKey="type" innerRadius="62%" outerRadius="88%" paddingAngle={3} strokeWidth={0}>
            {data.map((entry, index) => (
              <Cell key={entry.type} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip currency />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold tracking-tight text-ink">{formatCurrency(total, { compact: true })}</span>
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Billed</span>
      </div>
      <div className="mt-1 space-y-1.5">
        {data.slice(0, 4).map((entry, index) => (
          <div key={entry.type} className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1.5 capitalize text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: colors[index % colors.length] }} />
              {titleCase(entry.type)}
            </span>
            <span className="font-bold text-ink">{formatCurrency(entry.paid)} paid</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeeBreakdownDonut;
