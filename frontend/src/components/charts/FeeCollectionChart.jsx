import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartTooltip from './ChartTooltip';

const FeeCollectionChart = ({ data = [], height = 260 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={4}>
      <CartesianGrid strokeDasharray="4 4" stroke="#F1EBF7" vertical={false} />
      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fontSize: 9 }}
        tickFormatter={(value) => `₹${value >= 1000 ? `${Math.round(value / 1000)}k` : value}`}
      />
      <Tooltip content={<ChartTooltip currency />} cursor={{ fill: 'rgba(194,155,234,0.06)' }} />
      <Bar dataKey="billed" name="Billed" fill="#E5D7F5" radius={[5, 5, 0, 0]} barSize={14} />
      <Bar dataKey="collected" name="Collected" fill="#9561D2" radius={[5, 5, 0, 0]} barSize={14} />
      <Bar dataKey="pending" name="Pending" fill="#E2392B" radius={[5, 5, 0, 0]} barSize={14} />
    </BarChart>
  </ResponsiveContainer>
);

export default FeeCollectionChart;
