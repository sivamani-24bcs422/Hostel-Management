import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck2,
  CalendarDays,
  CheckCheck,
  ClipboardCheck,
  RefreshCw,
  SearchX,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import attendanceService from '../services/attendanceService';
import studentService from '../services/studentService';
import hostelService from '../services/hostelService';
import { formatDate, getErrorMessage, titleCase, todayISO } from '../utils/format';
import { attendanceStatusOptions } from '../utils/options';
import useDebounce from '../hooks/useDebounce';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import DataTable from '../components/DataTable';
import Pagination from '../components/ui/Pagination';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import AttendanceChart from '../components/charts/AttendanceChart';
import EmptyState from '../components/ui/EmptyState';
import clsx from 'clsx';

const statusStyles = {
  present: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  absent: 'bg-tomato-50 text-tomato-700 ring-tomato-200',
  late: 'bg-amber-50 text-amber-700 ring-amber-200',
  leave: 'bg-sky-50 text-sky-700 ring-sky-200',
};

const AttendancePage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const canMark = user?.role === 'admin' || user?.role === 'warden';
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, leave: 0, total: 0, rate: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState({ sortBy: 'date', order: 'desc' });
  const [filters, setFilters] = useState({ q: '', status: '', month: '', hostel: '' });
  const debouncedSearch = useDebounce(filters.q, 350);
  const [trend, setTrend] = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);

  const [hostels, setHostels] = useState([]);
  const [markOpen, setMarkOpen] = useState(false);
  const [markDate, setMarkDate] = useState(todayISO());
  const [markHostel, setMarkHostel] = useState('');
  const [markStudents, setMarkStudents] = useState([]);
  const [markRecords, setMarkRecords] = useState({});
  const [markLoading, setMarkLoading] = useState(false);
  const [markSaving, setMarkSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await attendanceService.list({
        q: debouncedSearch || undefined,
        status: filters.status || undefined,
        month: filters.month || undefined,
        hostel: filters.hostel || undefined,
        page,
        limit,
        sortBy: sort.sortBy,
        order: sort.order,
      });
      setRecords(result.data || []);
      setSummary(result.summary || { present: 0, absent: 0, late: 0, leave: 0, total: 0, rate: 0 });
      setPagination(result.pagination || { page, pages: 1, total: 0 });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.status, filters.month, filters.hostel, page, limit, sort.sortBy, sort.order]);

  const loadTrend = useCallback(async () => {
    setTrendLoading(true);
    try {
      const result = await attendanceService.trend({ days: 7 });
      setTrend(
        (result.data || []).map((item) => ({
          ...item,
          label: new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        }))
      );
    } catch {
      setTrend([]);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadTrend();
  }, [loadTrend]);

  useEffect(() => {
    if (!isAdmin) return;
    hostelService
      .list({ limit: 200 })
      .then((result) => setHostels(result.data || []))
      .catch(() => setHostels([]));
  }, [isAdmin]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.status, filters.month, filters.hostel]);

  useEffect(() => {
    if (!markOpen) return;
    let active = true;
    setMarkLoading(true);
    studentService
      .list({ limit: 500, status: 'active', hostel: markHostel || undefined, sortBy: 'rollNo', order: 'asc' })
      .then((result) => {
        if (!active) return;
        const list = (result.data || []).filter((student) => student.hostel);
        setMarkStudents(list);
        setMarkRecords((current) => {
          const next = {};
          list.forEach((student) => {
            next[student._id] = current[student._id] || 'present';
          });
          return next;
        });
      })
      .catch((err) => {
        if (!active) return;
        setMarkStudents([]);
        toast.error(getErrorMessage(err), 'Could not load students');
      })
      .finally(() => {
        if (active) setMarkLoading(false);
      });
    return () => {
      active = false;
    };
  }, [markOpen, markHostel, toast]);

  const handleSort = (sortBy) => {
    setSort((current) => ({
      sortBy,
      order: current.sortBy === sortBy && current.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const openMark = () => {
    setMarkDate(todayISO());
    setMarkHostel('');
    setMarkRecords({});
    setMarkOpen(true);
  };

  const setAllStatuses = (status) => {
    setMarkRecords((current) => {
      const next = { ...current };
      markStudents.forEach((student) => {
        next[student._id] = status;
      });
      return next;
    });
  };

  const markCounts = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, leave: 0 };
    Object.values(markRecords).forEach((status) => {
      if (counts[status] !== undefined) counts[status] += 1;
    });
    return counts;
  }, [markRecords]);

  const handleMarkSubmit = async (event) => {
    event.preventDefault();
    if (!markStudents.length) {
      toast.error('There are no allocated students to mark for this selection.', 'Nothing to mark');
      return;
    }
    setMarkSaving(true);
    try {
      const payload = {
        date: markDate,
        records: markStudents.map((student) => ({
          student: student._id,
          status: markRecords[student._id] || 'present',
        })),
      };
      await attendanceService.bulkMark(payload);
      toast.success(`Attendance saved for ${payload.records.length} student(s).`);
      setMarkOpen(false);
      await Promise.all([load(), loadTrend()]);
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not save attendance');
    } finally {
      setMarkSaving(false);
    }
  };

  const handleDelete = async (record) => {
    const approved = await confirm({
      title: 'Delete attendance record?',
      message: `Remove the ${record.status} record for ${record.student?.user?.name || 'this student'} on ${formatDate(record.date)}?`,
      confirmText: 'Delete record',
      tone: 'danger',
    });
    if (!approved) return;
    try {
      await attendanceService.remove(record._id);
      toast.success('Attendance record deleted.');
      if (records.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
      await loadTrend();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Delete failed');
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'date',
        header: 'Date',
        sortKey: 'date',
        render: (row) => (
          <div>
            <p className="text-[12px] font-extrabold text-ink">{formatDate(row.date)}</p>
            <p className="text-[10px] text-muted">
              {new Date(row.date).toLocaleDateString('en-IN', { weekday: 'long' })}
            </p>
          </div>
        ),
      },
      {
        key: 'student',
        header: 'Student',
        render: (row) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.student?.user?.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[12px] font-extrabold text-ink">{row.student?.user?.name || 'Unknown student'}</p>
              <p className="truncate text-[10px] text-muted">{row.student?.rollNo} · {row.hostel?.name || 'Hostel'}</p>
            </div>
          </div>
        ),
      },
      { key: 'status', header: 'Status', sortKey: 'status', render: (row) => <Badge status={row.status} dot /> },
      { key: 'markedBy', header: 'Marked by', render: (row) => <span className="text-[11px] text-muted">{row.markedBy?.name || 'System'}</span> },
      { key: 'note', header: 'Note', render: (row) => <span className="text-[11px] text-muted">{row.note || '—'}</span> },
      ...(canMark
        ? [
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              render: (row) => (
                <Button variant="ghost" size="icon" className="text-tomato-600" onClick={() => handleDelete(row)} title="Delete record">
                  <Trash2 size={15} />
                </Button>
              ),
            },
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canMark, records.length, page]
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Resident wellbeing"
        title={isStudent ? 'My attendance' : 'Attendance'}
        subtitle={
          isStudent
            ? 'Your daily attendance record, presence rate and recent activity.'
            : 'Mark daily attendance, review presence trends and keep resident records accurate.'
        }
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => Promise.all([load(), loadTrend()])} loading={loading}>
              Refresh
            </Button>
            {canMark ? (
              <Button size="sm" icon={ClipboardCheck} onClick={openMark}>
                Mark attendance
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Attendance rate" value={`${summary.rate || 0}%`} icon={CalendarCheck2} tone="lavender" helper={`${summary.total || 0} records in view`} />
        <StatCard label="Present" value={summary.present || 0} icon={UserCheck} tone="emerald" helper="On campus and marked in" />
        <StatCard label="Absent" value={summary.absent || 0} icon={UserX} tone="tomato" helper="Marked absent" />
        <StatCard label="Late" value={summary.late || 0} icon={CalendarDays} tone="amber" helper="Late arrivals" />
        <StatCard label="On leave" value={summary.leave || 0} icon={CalendarCheck2} tone="sky" helper="Approved leave days" />
      </div>

      <div className="mt-4">
        <ChartCard title="Attendance trend" subtitle="Present, late, absent and leave over the last 7 days">
          {trendLoading ? (
            <div className="h-[260px] animate-pulse rounded-2xl bg-[#F8F4FB]" />
          ) : trend.length ? (
            <AttendanceChart data={trend} />
          ) : (
            <EmptyState icon={ClipboardCheck} title="No attendance yet" description="Marked attendance will appear here as a trend." />
          )}
        </ChartCard>
      </div>

      <div className="card mt-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <SearchInput
          value={filters.q}
          onChange={(value) => setFilters((current) => ({ ...current, q: value }))}
          placeholder="Search student or roll number..."
        />
        {isAdmin ? (
          <Select
            value={filters.hostel}
            onChange={(event) => setFilters((current) => ({ ...current, hostel: event.target.value }))}
            placeholder="All hostels"
            options={hostels.map((hostel) => ({ value: hostel._id, label: hostel.name }))}
            containerClassName="w-full sm:w-44"
          />
        ) : null}
        <Input
          type="month"
          value={filters.month}
          onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}
          aria-label="Filter by month"
          containerClassName="w-full sm:w-40"
          className="h-9"
        />
        <Select
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          placeholder="All statuses"
          options={attendanceStatusOptions}
          containerClassName="w-full sm:w-40"
        />
      </div>

      {error ? (
        <div className="card mt-4 flex flex-col items-center justify-center gap-3 p-10 text-center">
          <p className="text-sm font-semibold text-tomato-600">{error}</p>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="card mt-4 overflow-hidden">
          <DataTable
            columns={columns}
            data={records}
            loading={loading}
            sortBy={sort.sortBy}
            sortOrder={sort.order}
            onSort={handleSort}
            emptyIcon={SearchX}
            emptyTitle="No attendance records found"
            emptyDescription={canMark ? 'Mark attendance to create the first records.' : 'Attendance records will appear here once marked.'}
            emptyAction={canMark ? <Button size="sm" icon={ClipboardCheck} onClick={openMark}>Mark attendance</Button> : null}
          />
          {!loading && records.length > 0 ? (
            <Pagination
              page={pagination.page}
              pages={pagination.pages}
              total={pagination.total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(value) => {
                setLimit(value);
                setPage(1);
              }}
            />
          ) : null}
        </div>
      )}

      <Modal
        open={markOpen}
        onClose={() => setMarkOpen(false)}
        title="Mark attendance"
        subtitle="Set a status for every allocated student. Saving again updates the same date."
        size="xl"
      >
        <form onSubmit={handleMarkSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Attendance date" type="date" value={markDate} max={todayISO()} onChange={(event) => setMarkDate(event.target.value)} required />
            {isAdmin ? (
              <Select
                label="Hostel"
                value={markHostel}
                onChange={(event) => {
                  setMarkHostel(event.target.value);
                  setMarkRecords({});
                }}
                placeholder="All hostels"
                options={hostels.map((hostel) => ({ value: hostel._id, label: hostel.name }))}
              />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#FCFAFE] p-3">
            <div className="flex flex-wrap gap-2 text-[10px] font-bold">
              {attendanceStatusOptions.map((option) => (
                <span key={option.value} className={clsx('rounded-full px-2.5 py-1 ring-1 ring-inset', statusStyles[option.value])}>
                  {option.label}: {markCounts[option.value] || 0}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {attendanceStatusOptions.map((option) => (
                <Button key={option.value} type="button" size="xs" variant="secondary" onClick={() => setAllStatuses(option.value)}>
                  All {option.label.toLowerCase()}
                </Button>
              ))}
            </div>
          </div>

          {markLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-2xl bg-[#F6F2F9]" />
              ))}
            </div>
          ) : markStudents.length === 0 ? (
            <EmptyState
              icon={CheckCheck}
              title="No allocated students"
              description="Attendance can only be marked for active students with a room allocation."
            />
          ) : (
            <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
              {markStudents.map((student) => (
                <div key={student._id} className="flex flex-col gap-2 rounded-2xl border border-[#F0EAF6] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={student.user?.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-extrabold text-ink">{student.user?.name}</p>
                      <p className="truncate text-[10px] text-muted">
                        {student.rollNo} · {student.hostel?.name} · Room {student.room?.roomNumber || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {attendanceStatusOptions.map((option) => {
                      const active = (markRecords[student._id] || 'present') === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setMarkRecords((current) => ({ ...current, [student._id]: option.value }))}
                          className={clsx(
                            'rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold capitalize ring-1 ring-inset transition',
                            active ? statusStyles[option.value] : 'bg-white text-[#9A8FA4] ring-[#EDE6F3] hover:bg-lavender-50'
                          )}
                        >
                          {titleCase(option.value)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F2ECF8] pt-4">
            <p className="text-[11px] text-muted">
              {markStudents.length} student(s) · {markCounts.present} present · {markCounts.absent} absent
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setMarkOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={markSaving} disabled={!markStudents.length}>
                Save attendance
              </Button>
            </div>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default AttendancePage;
