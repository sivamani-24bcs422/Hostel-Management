import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartTooltip from './ChartTooltip';

const AttendanceChart = ({ data = [], height = 260, showRate = true }) => (
  <ResponsiveContainer width="100%" height={height}>
    <ComposedChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
      <CartesianGrid strokeDasharray="4 4" stroke="#F1EBF7" vertical={false} />
      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
      <YAxis yAxisId="count" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} allowDecimals={false} />
      {showRate ? (
        <YAxis
          yAxisId="rate"
          orientation="right"
          domain={[0, 100]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 9 }}
          tickFormatter={(value) => `${value}%`}
          width={34}
        />
      ) : null}
      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(194,155,234,0.06)' }} />
      <Bar yAxisId="count" dataKey="present" name="Present" stackId="attendance" fill="#D0F431" radius={[0, 0, 0, 0]} barSize={16} />
      <Bar yAxisId="count" dataKey="late" name="Late" stackId="attendance" fill="#C29BEA" barSize={16} />
      <Bar yAxisId="count" dataKey="absent" name="Absent" stackId="attendance" fill="#F3A198" barSize={16} />
      <Bar yAxisId="count" dataKey="leave" name="Leave" stackId="attendance" fill="#DFD4EA" radius={[5, 5, 0, 0]} barSize={16} />
      {showRate ? (
        <Line
          yAxisId="rate"
          type="monotone"
          dataKey="rate"
          name="Attendance rate"
          stroke="#9561D2"
          strokeWidth={2.5}
          dot={{ r: 2.5, fill: '#9561D2', strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      ) : null}
    </ComposedChart>
  </ResponsiveContainer>
);

export default AttendanceChart;
