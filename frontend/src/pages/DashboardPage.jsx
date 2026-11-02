import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BedDouble,
  BellRing,
  Building2,
  CalendarCheck2,
  CircleDollarSign,
  ClipboardCheck,
  DoorOpen,
  IndianRupee,
  MessageSquareWarning,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import dashboardService from '../services/dashboardService';
import { formatCurrency, formatDate, formatDateTime, formatNumber, getErrorMessage, timeAgo } from '../utils/format';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import OccupancyChart from '../components/charts/OccupancyChart';
import FeeCollectionChart from '../components/charts/FeeCollectionChart';
import AttendanceChart from '../components/charts/AttendanceChart';
import ComplaintDonut from '../components/charts/ComplaintDonut';
import FeeBreakdownDonut from '../components/charts/FeeBreakdownDonut';
import EmptyState from '../components/ui/EmptyState';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const DashboardSkeleton = () => (
  <div className="animate-fade-in space-y-5">
    <div className="h-56 animate-pulse rounded-4xl bg-white/70" />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-3xl bg-white/75" />
      ))}
    </div>
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="h-80 animate-pulse rounded-3xl bg-white/75 xl:col-span-2" />
      <div className="h-80 animate-pulse rounded-3xl bg-white/75" />
    </div>
  </div>
);

const HeroPanel = ({ role, name, profile, stats, data }) => {
  const isStudent = role === 'student';
  const occupancy = stats?.occupancyRate || 0;
  const roomNumber = profile?.room?.roomNumber || data?.allocation?.room?.roomNumber;

  return (
    <section className="relative mb-5 overflow-hidden rounded-4xl bg-ink p-5 text-white shadow-float sm:p-7">
      <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-lavender-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-8 h-72 w-72 rounded-full bg-lime-400/10 blur-3xl" />
      <div className="pointer-events-none absolute right-1/3 top-8 h-2 w-2 rounded-full bg-lime-400" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-lavender-200">
            <Sparkles size={12} className="text-lime-400" />
            {isStudent ? 'Resident dashboard' : 'Live residence overview'}
          </div>
          <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-[-0.04em] sm:text-[38px]">
            {greeting()}, {name?.split(' ')[0] || 'there'}.
          </h1>
          <p className="mt-2 max-w-xl text-[12px] leading-6 text-lavender-100/65 sm:text-[13px]">
            {isStudent
              ? roomNumber
                ? `Your room at ${profile?.hostel?.name || 'the hostel'} is all set. Here is everything you need for a smooth stay.`
                : 'Welcome to HostelHub. Your room has not been allocated yet — contact your hostel warden for assistance.'
              : "Here's a live view of students, occupancy, collections and resident wellbeing across your hostels."}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {isStudent ? (
              <>
                <Link to="/fees">
                  <Button variant="accent" size="sm" iconRight={ArrowRight}>
                    View fees
                  </Button>
                </Link>
                <Link to="/complaints">
                  <Button variant="secondary" size="sm" className="border-white/15 bg-white/10 text-white hover:border-white/25 hover:bg-white/15">
                    Raise a complaint
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to={role === 'admin' ? '/allocations' : '/attendance'}>
                  <Button variant="accent" size="sm" iconRight={ArrowRight}>
                    {role === 'admin' ? 'Allocate a room' : 'Mark attendance'}
                  </Button>
                </Link>
                <Link to={role === 'admin' ? '/reports' : '/complaints'}>
                  <Button variant="secondary" size="sm" className="border-white/15 bg-white/10 text-white hover:border-white/25 hover:bg-white/15">
                    {role === 'admin' ? 'View reports' : 'Review complaints'}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-3 backdrop-blur">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#D0F431 ${Math.max(occupancy, 2) * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
              }}
            >
              <div className="flex h-[62px] w-[62px] flex-col items-center justify-center rounded-full bg-ink">
                <span className="text-xl font-extrabold leading-none">{isStudent ? (roomNumber ? '1' : '0') : occupancy}</span>
                <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-lavender-200">
                  {isStudent ? (roomNumber ? 'room' : 'none') : '% beds'}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-lavender-200/70">
                {isStudent ? 'My residence' : 'Campus occupancy'}
              </p>
              <p className="mt-1 max-w-[150px] text-sm font-extrabold leading-tight text-white">
                {isStudent ? profile?.hostel?.name || 'Not allocated' : `${stats?.occupiedBeds || 0} of ${stats?.totalBeds || 0} beds`}
              </p>
              <p className="mt-1 text-[10px] text-lavender-100/55">
                {isStudent ? (roomNumber ? `Room ${roomNumber}` : 'Contact your warden') : `${stats?.availableBeds || 0} beds available`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!isStudent ? (
        <div className="relative mt-5 grid grid-cols-2 gap-2 border-t border-white/10 pt-4 sm:grid-cols-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-lavender-200/55">Attendance today</p>
            <p className="mt-1 text-sm font-extrabold text-white">{stats?.attendanceRate || 0}%</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-lavender-200/55">Pending fees</p>
            <p className="mt-1 text-sm font-extrabold text-lime-300">{formatCurrency(stats?.pendingFees || 0, { compact: true })}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-lavender-200/55">Open complaints</p>
            <p className="mt-1 text-sm font-extrabold text-white">{stats?.pendingComplaints || 0}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-lavender-200/55">Visitors today</p>
            <p className="mt-1 text-sm font-extrabold text-white">{stats?.visitorsToday || 0}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
};

const AnnouncementList = ({ announcements = [], compact = false }) => {
  if (!announcements.length) {
    return <EmptyState icon={BellRing} title="No announcements yet" description="New notices from your hostel team will appear here." />;
  }

  return (
    <div className={compact ? 'space-y-2' : 'grid gap-3 md:grid-cols-2 xl:grid-cols-3'}>
      {announcements.map((announcement) => (
        <Link
          key={announcement._id}
          to="/announcements"
          className="group block rounded-2xl border border-[#F0EAF6] bg-white p-4 transition hover:-translate-y-0.5 hover:border-lavender-200 hover:shadow-soft"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-lavender-50 text-lavender-600">
                <BellRing size={14} />
              </span>
              <Badge status={announcement.priority} />
            </div>
            <span className="text-[9px] font-semibold text-[#A79CB1]">{timeAgo(announcement.createdAt)}</span>
          </div>
          <p className="mt-3 line-clamp-2 text-[12px] font-extrabold leading-5 text-ink transition group-hover:text-lavender-700">
            {announcement.title}
          </p>
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted">{announcement.content}</p>
          <p className="mt-2 text-[9px] font-semibold text-[#A79CB1]">By {announcement.publishedBy?.name || 'Hostel office'}</p>
        </Link>
      ))}
    </div>
  );
};

const DashboardPage = () => {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const result = await dashboardService.get();
        setData(result.data);
      } catch (err) {
        setError(getErrorMessage(err));
        if (silent) toast.error(getErrorMessage(err), 'Could not refresh');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="card flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-tomato-50 text-tomato-600">
          <MessageSquareWarning size={24} />
        </div>
        <h2 className="mt-4 text-lg font-extrabold text-ink">Unable to load your dashboard</h2>
        <p className="mt-1 max-w-md text-sm text-muted">{error || 'Please try again.'}</p>
        <Button className="mt-5" icon={RefreshCw} onClick={() => load()}>
          Try again
        </Button>
      </div>
    );
  }

  const stats = data.stats || {};
  const charts = data.charts || {};
  const recent = data.recent || {};
  const isStudent = user?.role === 'student';

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-lavender-600">Overview</p>
          <p className="mt-0.5 text-[12px] text-muted">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCw} loading={refreshing} onClick={() => load(true)}>
          Refresh
        </Button>
      </div>

      <HeroPanel role={user?.role} name={user?.name} profile={profile} stats={stats} data={data} />

      {data.warning ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800">
          {data.warning}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isStudent ? (
          <>
            <StatCard label="My room" value={profile?.room?.roomNumber || data.allocation?.room?.roomNumber || 'Not allocated'} icon={BedDouble} tone="lavender" helper={profile?.hostel?.name || 'Awaiting allocation'} />
            <StatCard label="Pending fees" value={formatCurrency(stats.pendingFees, { compact: true })} icon={IndianRupee} tone="tomato" helper={`${formatCurrency(stats.billedFees, { compact: true })} total billed`} />
            <StatCard label="Fees paid" value={formatCurrency(stats.totalRevenue, { compact: true })} icon={Wallet} tone="emerald" helper={`${stats.collectionRate || 0}% of billed amount`} />
            <StatCard label="Attendance" value={`${stats.attendanceRate || 0}%`} icon={CalendarCheck2} tone="lime" helper={`${stats.presentDays || 0} present · ${stats.absentDays || 0} absent`} />
            <StatCard label="Open complaints" value={stats.pendingComplaints || 0} icon={MessageSquareWarning} tone="amber" helper="Being reviewed by your warden" />
            <StatCard label="Days on leave" value={stats.leaveDays || 0} icon={DoorOpen} tone="sky" helper="Approved leave days" />
          </>
        ) : (
          <>
            <StatCard label="Total students" value={formatNumber(stats.totalStudents)} icon={Users} tone="lavender" helper="Active residents on campus" />
            <StatCard label="Hostels" value={formatNumber(stats.totalHostels)} icon={Building2} tone="purple" helper={`${formatNumber(stats.totalWardens)} wardens on duty`} />
            <StatCard label="Total rooms" value={formatNumber(stats.totalRooms)} icon={DoorOpen} tone="sky" helper={`${formatNumber(stats.totalBeds)} beds across campus`} />
            <StatCard label="Available beds" value={formatNumber(stats.availableBeds)} icon={BedDouble} tone="lime" helper={`${stats.occupancyRate || 0}% occupancy rate`} />
            <StatCard label="Occupied beds" value={formatNumber(stats.occupiedBeds)} icon={Building2} tone="pink" helper="Live active allocations" />
            <StatCard label="Pending fees" value={formatCurrency(stats.pendingFees, { compact: true })} icon={IndianRupee} tone="tomato" helper={`${formatCurrency(stats.billedFees, { compact: true })} billed in total`} />
            <StatCard label="Total revenue" value={formatCurrency(stats.totalRevenue, { compact: true })} icon={CircleDollarSign} tone="emerald" helper={`${stats.collectionRate || 0}% collection rate`} />
            <StatCard label="Pending complaints" value={formatNumber(stats.pendingComplaints)} icon={MessageSquareWarning} tone="amber" helper="Open or in progress" />
          </>
        )}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <ChartCard
          title={isStudent ? 'My attendance trend' : 'Hostel occupancy'}
          subtitle={isStudent ? 'Present, late and absent days over the last 7 days' : 'Occupied versus available beds by residence'}
          className="xl:col-span-2"
          action={
            <span className="inline-flex items-center gap-1 rounded-full bg-lime-50 px-2 py-1 text-[9px] font-extrabold text-lime-800">
              <TrendingUp size={11} /> {isStudent ? `${stats.attendanceRate || 0}%` : `${stats.occupancyRate || 0}%`}
            </span>
          }
        >
          {isStudent ? (
            <AttendanceChart data={charts.attendanceTrend || []} />
          ) : (
            <OccupancyChart data={charts.occupancyByHostel || []} />
          )}
        </ChartCard>

        {isStudent ? (
          <ChartCard title="Fee breakdown" subtitle="Billed amount by fee category">
            <FeeBreakdownDonut data={charts.feeBreakdown || []} />
          </ChartCard>
        ) : (
          <ChartCard title="Complaint status" subtitle="Resident issues by current state">
            <ComplaintDonut data={charts.complaintStats || []} />
          </ChartCard>
        )}

        {!isStudent ? (
          <>
            <ChartCard title="Fee collection" subtitle="Billed, collected and pending over 6 months" className="xl:col-span-2">
              <FeeCollectionChart data={charts.feeCollection || []} />
            </ChartCard>
            <ChartCard title="Attendance overview" subtitle="Daily attendance mix over the last 7 days">
              <AttendanceChart data={charts.attendanceTrend || []} height={260} />
            </ChartCard>
          </>
        ) : (
          <>
            <ChartCard title="Fee collection" subtitle="What you were billed versus what you paid" className="xl:col-span-2">
              <FeeCollectionChart data={charts.feeCollection || []} />
            </ChartCard>
            <ChartCard title="My payment pulse" subtitle="Attendance rate and dues at a glance">
              <div className="flex h-[260px] flex-col justify-center gap-4 px-2">
                <div className="rounded-2xl bg-lavender-50 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-lavender-600">Fees cleared</p>
                  <p className="mt-1 text-2xl font-extrabold text-ink">{stats.collectionRate || 0}%</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-lavender-400" style={{ width: `${stats.collectionRate || 0}%` }} />
                  </div>
                </div>
                <div className="rounded-2xl bg-lime-50 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-lime-800">Attendance</p>
                  <p className="mt-1 text-2xl font-extrabold text-ink">{stats.attendanceRate || 0}%</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-lime-400" style={{ width: `${stats.attendanceRate || 0}%` }} />
                  </div>
                </div>
              </div>
            </ChartCard>
          </>
        )}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="card overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-[#F3EEF8] px-5 py-4">
            <div>
              <h3 className="text-sm font-extrabold text-ink">Recent payments</h3>
              <p className="mt-0.5 text-[11px] text-muted">{isStudent ? 'Your latest fee payments' : 'Latest fee collections across hostels'}</p>
            </div>
            <Link to={isStudent ? '/payments' : '/payments'} className="text-[11px] font-extrabold text-lavender-700 hover:text-lavender-800">
              View all
            </Link>
          </div>
          <div className="divide-y divide-[#F6F2F9]">
            {(recent.payments || []).length === 0 ? (
              <EmptyState title="No payments yet" description="Recorded payments will appear here." icon={Wallet} />
            ) : (
              (recent.payments || []).map((payment) => (
                <div key={payment._id} className="flex items-center gap-3 px-5 py-3.5">
                  {isStudent ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Wallet size={16} />
                    </div>
                  ) : (
                    <Avatar name={payment.student?.user?.name} size="sm" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-extrabold text-ink">
                      {isStudent ? payment.fee?.title || 'Fee payment' : payment.student?.user?.name || 'Student'}
                    </p>
                    <p className="truncate text-[10px] text-muted">
                      {payment.receiptNo} · {payment.method?.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-extrabold text-ink">{formatCurrency(payment.amount)}</p>
                    <p className="text-[9px] text-muted">{formatDate(payment.paidAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#F3EEF8] px-5 py-4">
            <div>
              <h3 className="text-sm font-extrabold text-ink">{isStudent ? 'Open complaints' : 'Recent complaints'}</h3>
              <p className="mt-0.5 text-[11px] text-muted">
                {isStudent ? 'Track your reported issues' : 'Latest resident reports'}
              </p>
            </div>
            <Link to="/complaints" className="text-[11px] font-extrabold text-lavender-700 hover:text-lavender-800">
              View all
            </Link>
          </div>
          <div className="divide-y divide-[#F6F2F9]">
            {(recent.complaints || []).length === 0 ? (
              <EmptyState icon={MessageSquareWarning} title="No complaints" description={isStudent ? 'You have no open complaints.' : 'No complaints have been raised.'} />
            ) : (
              (recent.complaints || []).slice(0, 5).map((complaint) => (
                <div key={complaint._id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-[12px] font-extrabold text-ink">{complaint.title}</p>
                    <Badge status={complaint.status} />
                  </div>
                  <p className="mt-1 text-[10px] text-muted">
                    {complaint.student?.user?.name || 'Student'} · {formatDateTime(complaint.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-ink">Latest announcements</h2>
            <p className="mt-0.5 text-[11px] text-muted">Notices published by the hostel office and wardens</p>
          </div>
          <Link to="/announcements" className="text-[11px] font-extrabold text-lavender-700 hover:text-lavender-800">
            Browse all
          </Link>
        </div>
        <AnnouncementList announcements={recent.announcements || []} />
      </div>
    </div>
  );
};

export default DashboardPage;
