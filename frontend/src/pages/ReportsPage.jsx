import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  BadgeIndianRupee,
  BedDouble,
  Building2,
  CalendarCheck2,
  ClipboardList,
  CreditCard,
  Download,
  FileBarChart2,
  FileSpreadsheet,
  IndianRupee,
  MessageSquareWarning,
  RefreshCw,
  TrendingUp,
  UserSquare2,
  Users,
  Wallet,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import reportService from '../services/reportService';
import { formatCurrency, formatNumber, getErrorMessage, titleCase } from '../utils/format';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import ProgressBar from '../components/ui/ProgressBar';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ChartTooltip from '../components/charts/ChartTooltip';

const reportTypes = [
  { type: 'students', label: 'Students', description: 'Full resident directory with academic and guardian details.', icon: Users },
  { type: 'wardens', label: 'Wardens', description: 'Warden roster, hostel assignments and contact details.', icon: UserSquare2 },
  { type: 'hostels', label: 'Hostels', description: 'Hostel profiles, capacity, facilities and status.', icon: Building2 },
  { type: 'rooms', label: 'Rooms', description: 'Room inventory with capacity, occupancy and rent.', icon: BedDouble },
  { type: 'allocations', label: 'Allocations', description: 'Bed allocation history including vacated stays.', icon: ClipboardList },
  { type: 'fees', label: 'Fees', description: 'Billed fees, paid amounts, balances and due dates.', icon: BadgeIndianRupee },
  { type: 'payments', label: 'Payments', description: 'Receipts, payment methods and collection history.', icon: CreditCard },
  { type: 'attendance', label: 'Attendance', description: 'Daily attendance records for every student.', icon: CalendarCheck2 },
  { type: 'complaints', label: 'Complaints', description: 'Complaint log with priorities and resolutions.', icon: MessageSquareWarning },
  { type: 'visitors', label: 'Visitors', description: 'Guest visitor log with check-in and check-out times.', icon: Users },
];

const attendanceColors = {
  present: '#91B011',
  late: '#C29BEA',
  absent: '#E2392B',
  leave: '#D8CFDF',
};

const ReportsPage = () => {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloading, setDownloading] = useState('');

  const load = useCallback(async (range = {}) => {
    setLoading(true);
    setError('');
    try {
      const result = await reportService.overview({
        from: range.from || undefined,
        to: range.to || undefined,
      });
      setData(result.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const applyRange = () => {
    if (from && to && new Date(from) > new Date(to)) {
      toast.error('The start date must be before the end date.', 'Invalid range');
      return;
    }
    load({ from, to });
  };

  const resetRange = () => {
    setFrom('');
    setTo('');
    load();
  };

  const download = async (type) => {
    setDownloading(type);
    try {
      await reportService.download(type, { from: from || undefined, to: to || undefined });
      toast.success(`${titleCase(type)} report downloaded as CSV.`);
    } catch (err) {
      toast.error(getErrorMessage(err), 'Export failed');
    } finally {
      setDownloading('');
    }
  };

  const cards = data?.cards || {};
  const charts = data?.charts || {};

  const revenueData = useMemo(
    () =>
      (charts.monthlyRevenue || []).map((row) => ({
        ...row,
        label: new Date(`${row.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      })),
    [charts.monthlyRevenue]
  );

  const attendanceData = useMemo(
    () => (charts.attendance || []).filter((row) => row.count > 0),
    [charts.attendance]
  );

  const hostelColumns = useMemo(
    () => [
      {
        key: 'hostel',
        header: 'Hostel',
        render: (row) => (
          <div>
            <p className="text-[12px] font-extrabold text-ink">{row.name}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted">{row.code} · {titleCase(row.type)}</p>
          </div>
        ),
      },
      { key: 'students', header: 'Students', render: (row) => <span className="text-[12px] font-semibold text-ink">{formatNumber(row.students)}</span> },
      {
        key: 'rooms',
        header: 'Rooms / beds',
        render: (row) => (
          <span className="text-[11px] text-muted">
            {formatNumber(row.totalRooms)} rooms · {formatNumber(row.totalBeds)} beds
          </span>
        ),
      },
      {
        key: 'occupancyRate',
        header: 'Occupancy',
        render: (row) => (
          <div className="w-32">
            <div className="flex items-center justify-between text-[10px] font-semibold text-muted">
              <span>{row.occupied} occupied</span>
              <span>{row.available} free</span>
            </div>
            <ProgressBar value={row.occupancyRate} color={row.occupancyRate > 85 ? 'tomato' : 'lime'} className="mt-1.5" />
          </div>
        ),
      },
      {
        key: 'pendingFees',
        header: 'Pending fees',
        render: (row) => <span className="text-[11px] font-semibold text-tomato-600">{formatCurrency(row.pendingFees)}</span>,
      },
      {
        key: 'revenue',
        header: 'Revenue',
        render: (row) => <span className="text-[11px] font-semibold text-emerald-600">{formatCurrency(row.revenue)}</span>,
      },
    ],
    []
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Insights"
        title="Reports & analytics"
        subtitle="Analyse occupancy, fee collection, attendance and complaints — then export any dataset as CSV."
        actions={
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => load({ from, to })} loading={loading}>
            Refresh
          </Button>
        }
      />

      <div className="card mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-end">
        <Input
          label="From date"
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          containerClassName="w-full sm:w-44"
          className="h-9"
        />
        <Input
          label="To date"
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          containerClassName="w-full sm:w-44"
          className="h-9"
        />
        <Button size="sm" onClick={applyRange} loading={loading}>
          Apply range
        </Button>
        <Button size="sm" variant="secondary" onClick={resetRange}>
          Reset
        </Button>
        <p className="ml-auto text-[11px] text-muted">Date range applies to payments, fees, attendance and complaints.</p>
      </div>

      {error ? (
        <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
          <p className="text-sm font-semibold text-tomato-600">{error}</p>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => load({ from, to })}>
            Try again
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-3xl bg-white/80" />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-3xl bg-white/80" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active students" value={formatNumber(cards.totalStudents)} icon={Users} tone="lavender" helper="Residents on campus" />
            <StatCard label="Occupancy rate" value={`${cards.occupancyRate || 0}%`} icon={BedDouble} tone="lime" helper={`${formatNumber(cards.activeAllocations)} of ${formatNumber(cards.totalBeds)} beds`} />
            <StatCard label="Total billed" value={formatCurrency(cards.billed, { compact: true })} icon={BadgeIndianRupee} tone="purple" helper="Fees in selected range" />
            <StatCard label="Collected" value={formatCurrency(cards.collected, { compact: true })} icon={Wallet} tone="emerald" helper="Payments received" />
            <StatCard label="Outstanding" value={formatCurrency(cards.pending, { compact: true })} icon={IndianRupee} tone="tomato" helper="Unpaid fee balance" />
            <StatCard label="Attendance rate" value={`${cards.attendanceRate || 0}%`} icon={CalendarCheck2} tone="sky" helper="Present and late records" />
            <StatCard label="Open complaints" value={formatNumber(cards.openComplaints)} icon={AlertTriangle} tone="amber" helper="Open or in progress" />
            <StatCard label="Resolution rate" value={`${cards.resolutionRate || 0}%`} icon={MessageSquareWarning} tone="pink" helper={`${formatNumber(cards.resolvedComplaints)} resolved`} />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <ChartCard title="Revenue collected" subtitle="Monthly collections over recent months" className="xl:col-span-2">
              {revenueData.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={revenueData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#F1EBF7" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9 }}
                      tickFormatter={(value) => `₹${value >= 1000 ? `${Math.round(value / 1000)}k` : value}`}
                    />
                    <Tooltip content={<ChartTooltip currency />} cursor={{ fill: 'rgba(194,155,234,0.06)' }} />
                    <Bar dataKey="collected" name="Collected" fill="#9561D2" radius={[6, 6, 0, 0]} barSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={TrendingUp} title="No revenue recorded" description="Payment collections will appear here." />
              )}
            </ChartCard>

            <ChartCard title="Complaint mix" subtitle="Issues by current status">
              {charts.complaintStatus?.some((row) => row.count > 0) ? (
                <div className="relative">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={charts.complaintStatus.filter((row) => row.count > 0)}
                        dataKey="count"
                        nameKey="status"
                        innerRadius="62%"
                        outerRadius="88%"
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {charts.complaintStatus
                          .filter((row) => row.count > 0)
                          .map((row) => (
                            <Cell
                              key={row.status}
                              fill={
                                { open: '#E2392B', in_progress: '#C29BEA', resolved: '#91B011', rejected: '#D8CFDF' }[row.status] || '#DFD4EA'
                              }
                            />
                          ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold text-ink">{formatNumber(cards.totalComplaints)}</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Total</span>
                  </div>
                </div>
              ) : (
                <EmptyState icon={MessageSquareWarning} title="No complaints" description="No complaints were raised in this range." />
              )}
            </ChartCard>

            <ChartCard title="Attendance mix" subtitle="Records by attendance status in range">
              {attendanceData.length ? (
                <div className="space-y-4 px-2 py-3">
                  {attendanceData.map((row) => {
                    const total = attendanceData.reduce((sum, item) => sum + item.count, 0);
                    const percent = total ? Math.round((row.count / total) * 100) : 0;
                    return (
                      <div key={row.status}>
                        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
                          <span className="capitalize text-[#4B3A5A]">{titleCase(row.status)}</span>
                          <span className="text-muted">{formatNumber(row.count)} · {percent}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#F0EAF6]">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${percent}%`, background: attendanceColors[row.status] || '#C29BEA' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={CalendarCheck2} title="No attendance" description="Attendance records will appear here." />
              )}
            </ChartCard>

            <ChartCard title="Students by year" subtitle="Active residents by academic year">
              {charts.studentsByYear?.length ? (
                <div className="space-y-3 px-2 py-2">
                  {charts.studentsByYear.map((row) => {
                    const max = Math.max(...charts.studentsByYear.map((item) => item.count), 1);
                    return (
                      <div key={row.year}>
                        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
                          <span className="text-[#4B3A5A]">{row.year}</span>
                          <span className="text-muted">{formatNumber(row.count)}</span>
                        </div>
                        <ProgressBar value={(row.count / max) * 100} color="lavender" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={Users} title="No student data" description="Student distribution will appear here." />
              )}
            </ChartCard>
          </div>

          <div className="card mt-5 overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-[#F3EEF8] px-5 py-4">
              <div>
                <h3 className="text-sm font-extrabold text-ink">Hostel performance</h3>
                <p className="mt-0.5 text-[11px] text-muted">Occupancy, pending fees and revenue by residence</p>
              </div>
              <Badge tone="purple" dot>{charts.hostelPerformance?.length || 0} hostels</Badge>
            </div>
            <DataTable
              columns={hostelColumns}
              data={charts.hostelPerformance || []}
              emptyIcon={Building2}
              emptyTitle="No hostel data"
              emptyDescription="Hostel performance will appear once hostels and rooms exist."
            />
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-ink">Export centre</h2>
                <p className="mt-0.5 text-[11px] text-muted">Download a CSV snapshot of any module. Date filters apply where relevant.</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-lime-50 px-2.5 py-1 text-[9px] font-extrabold text-lime-800">
                <FileSpreadsheet size={11} /> CSV exports
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {reportTypes.map((report) => {
                const Icon = report.icon;
                return (
                  <div key={report.type} className="card flex items-start gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lavender-50 text-lavender-600">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-extrabold text-ink">{report.label}</p>
                      <p className="mt-0.5 text-[10px] leading-4 text-muted">{report.description}</p>
                      <Button
                        variant="secondary"
                        size="xs"
                        icon={Download}
                        className="mt-3"
                        loading={downloading === report.type}
                        onClick={() => download(report.type)}
                      >
                        Download CSV
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
