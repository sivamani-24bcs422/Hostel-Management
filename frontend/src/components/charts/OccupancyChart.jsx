import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartTooltip from './ChartTooltip';

const OccupancyChart = ({ data = [], height = 260 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 0 }} barGap={3}>
      <CartesianGrid strokeDasharray="4 4" stroke="#F1EBF7" horizontal={false} />
      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
      <YAxis
        type="category"
        dataKey="name"
        axisLine={false}
        tickLine={false}
        width={128}
        tick={{ fontSize: 10, fontWeight: 700 }}
      />
      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(194,155,234,0.06)' }} />
      <Bar dataKey="occupied" name="Occupied" stackId="beds" fill="#AC7FE1" radius={[0, 0, 0, 0]} barSize={18} />
      <Bar dataKey="available" name="Available" stackId="beds" fill="#E9F88B" radius={[0, 6, 6, 0]} barSize={18} />
    </BarChart>
  </ResponsiveContainer>
);

export default OccupancyChart;
