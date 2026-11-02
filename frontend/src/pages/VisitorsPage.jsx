import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Eye,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  SearchX,
  Trash2,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import visitorService from '../services/visitorService';
import studentService from '../services/studentService';
import hostelService from '../services/hostelService';
import { formatDate, formatDateTime, getErrorMessage } from '../utils/format';
import { visitorStatusOptions } from '../utils/options';
import { toDateInput, toDateTimeInput } from '../utils/form';
import useDebounce from '../hooks/useDebounce';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import DataTable from '../components/DataTable';
import Pagination from '../components/ui/Pagination';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import DetailItem from '../components/ui/DetailItem';
import StatCard from '../components/StatCard';

const emptyForm = {
  student: '',
  visitorName: '',
  phone: '',
  relation: 'Family',
  purpose: '',
  visitDate: toDateInput(new Date()),
  checkIn: toDateTimeInput(new Date()),
  idProof: '',
  notes: '',
};

const VisitorsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const isAdmin = user?.role === 'admin';

  const [visitors, setVisitors] = useState([]);
  const [summary, setSummary] = useState({ checkedIn: 0, total: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState({ sortBy: 'visitDate', order: 'desc' });
  const [filters, setFilters] = useState({ q: '', status: '', hostel: '', from: '', to: '' });
  const debouncedSearch = useDebounce(filters.q, 350);

  const [students, setStudents] = useState([]);
  const [hostels, setHostels] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState(null);
  const [checkingOut, setCheckingOut] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await visitorService.list({
        q: debouncedSearch || undefined,
        status: filters.status || undefined,
        hostel: filters.hostel || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page,
        limit,
        sortBy: sort.sortBy,
        order: sort.order,
      });
      setVisitors(result.data || []);
      setSummary(result.summary || { checkedIn: 0, total: 0 });
      setPagination(result.pagination || { page, pages: 1, total: 0 });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.status, filters.hostel, filters.from, filters.to, page, limit, sort.sortBy, sort.order]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    studentService
      .list({ limit: 500, status: 'active', sortBy: 'rollNo', order: 'asc' })
      .then((result) => setStudents((result.data || []).filter((student) => student.hostel)))
      .catch(() => setStudents([]));
    if (isAdmin) {
      hostelService
        .list({ limit: 200 })
        .then((result) => setHostels(result.data || []))
        .catch(() => setHostels([]));
    }
  }, [isAdmin]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.status, filters.hostel, filters.from, filters.to]);

  const handleSort = (sortBy) => {
    setSort((current) => ({
      sortBy,
      order: current.sortBy === sortBy && current.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, visitDate: toDateInput(new Date()), checkIn: toDateTimeInput(new Date()) });
    setModalOpen(true);
  };

  const openEdit = (visitor) => {
    setEditing(visitor);
    setForm({
      student: visitor.student?._id || '',
      visitorName: visitor.visitorName || '',
      phone: visitor.phone || '',
      relation: visitor.relation || 'Family',
      purpose: visitor.purpose || '',
      visitDate: toDateInput(visitor.visitDate),
      checkIn: toDateTimeInput(visitor.checkIn),
      idProof: visitor.idProof || '',
      notes: visitor.notes || '',
    });
    setModalOpen(true);
  };

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.student || !form.visitorName.trim() || !form.phone.trim() || !form.purpose.trim()) {
      toast.error('Student, visitor name, phone and purpose are required.', 'Missing details');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        student: form.student,
        visitDate: form.visitDate || undefined,
        checkIn: form.checkIn ? new Date(form.checkIn).toISOString() : undefined,
      };
      if (editing) {
        delete payload.student;
        await visitorService.update(editing._id, payload);
        toast.success('Visitor record updated.');
      } else {
        await visitorService.create(payload);
        toast.success('Visitor checked in successfully.');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not save visitor');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async (visitor) => {
    const approved = await confirm({
      title: 'Check out visitor?',
      message: `Mark ${visitor.visitorName} as checked out? The check-out time will be recorded now.`,
      confirmText: 'Check out',
    });
    if (!approved) return;
    setCheckingOut(visitor._id);
    try {
      await visitorService.checkout(visitor._id);
      toast.success(`${visitor.visitorName} has checked out.`);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Checkout failed');
    } finally {
      setCheckingOut('');
    }
  };

  const handleDelete = async (visitor) => {
    const approved = await confirm({
      title: 'Delete visitor record?',
      message: `Permanently delete the visit record for ${visitor.visitorName}?`,
      confirmText: 'Delete record',
      tone: 'danger',
    });
    if (!approved) return;
    try {
      await visitorService.remove(visitor._id);
      toast.success('Visitor record deleted.');
      if (visitors.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Delete failed');
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'visitorName',
        header: 'Visitor',
        sortKey: 'visitorName',
        render: (row) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.visitorName} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[12px] font-extrabold text-ink">{row.visitorName}</p>
              <p className="truncate text-[10px] text-muted">{row.phone} · {row.relation}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'student',
        header: 'Visiting',
        render: (row) => (
          <div>
            <p className="text-[12px] font-semibold text-ink">{row.student?.user?.name || 'Student'}</p>
            <p className="text-[10px] text-muted">{row.student?.rollNo} · {row.hostel?.name || 'Hostel'}</p>
          </div>
        ),
      },
      {
        key: 'purpose',
        header: 'Purpose',
        render: (row) => <span className="text-[11px] text-muted">{row.purpose}</span>,
      },
      {
        key: 'visitDate',
        header: 'Visit',
        sortKey: 'visitDate',
        render: (row) => (
          <div>
            <p className="text-[11px] font-semibold text-ink">{formatDate(row.visitDate)}</p>
            <p className="text-[10px] text-muted">
              In {row.checkIn ? new Date(row.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
              {row.checkOut ? ` · Out ${new Date(row.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
            </p>
          </div>
        ),
      },
      { key: 'status', header: 'Status', sortKey: 'status', render: (row) => <Badge status={row.status} dot /> },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => setDetails(row)} title="View visitor">
              <Eye size={15} />
            </Button>
            {row.status === 'checked_in' ? (
              <Button
                variant="ghost"
                size="icon"
                className="text-emerald-600"
                onClick={() => handleCheckout(row)}
                loading={checkingOut === row._id}
                title="Check out visitor"
              >
                {checkingOut === row._id ? null : <LogOut size={15} />}
              </Button>
            ) : null}
            <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit visitor">
              <Pencil size={15} />
            </Button>
            {isAdmin ? (
              <Button variant="ghost" size="icon" className="text-tomato-600" onClick={() => handleDelete(row)} title="Delete visitor">
                <Trash2 size={15} />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdmin, checkingOut, visitors.length, page]
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Campus security"
        title="Visitors"
        subtitle="Register guest visits, track check-ins and maintain a complete visitor log for your hostel."
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load} loading={loading}>
              Refresh
            </Button>
            <Button size="sm" icon={Plus} onClick={openCreate}>
              Record visitor
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Currently checked in" value={summary.checkedIn || 0} icon={UserRoundCheck} tone="lime" helper="Visitors still on campus" />
        <StatCard label="Total visits" value={summary.total || 0} icon={Users} tone="lavender" helper="Visitor records in view" />
        <StatCard
          label="Latest check-in"
          value={visitors[0]?.visitorName || '—'}
          icon={Clock3}
          tone="sky"
          helper={visitors[0] ? formatDateTime(visitors[0].checkIn) : 'No visitors recorded yet'}
        />
      </div>

      <div className="card mt-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <SearchInput
          value={filters.q}
          onChange={(value) => setFilters((current) => ({ ...current, q: value }))}
          placeholder="Search visitor, phone or student..."
        />
        {isAdmin ? (
          <Select
            value={filters.hostel}
            onChange={(event) => setFilters((current) => ({ ...current, hostel: event.target.value }))}
            placeholder="All hostels"
            options={hostels.map((hostel) => ({ value: hostel._id, label: hostel.name }))}
            containerClassName="w-full sm:w-40"
          />
        ) : null}
        <Select
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          placeholder="All statuses"
          options={visitorStatusOptions}
          containerClassName="w-full sm:w-36"
        />
        <div className="flex items-center gap-2">
          <Input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} aria-label="From date" className="h-9" />
          <span className="text-[11px] font-semibold text-muted">to</span>
          <Input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} aria-label="To date" className="h-9" />
        </div>
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
            data={visitors}
            loading={loading}
            sortBy={sort.sortBy}
            sortOrder={sort.order}
            onSort={handleSort}
            emptyIcon={SearchX}
            emptyTitle="No visitor records found"
            emptyDescription="Record a visitor to start the hostel visitor log."
            emptyAction={<Button size="sm" icon={Plus} onClick={openCreate}>Record visitor</Button>}
          />
          {!loading && visitors.length > 0 ? (
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
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit visitor record' : 'Record a visitor'}
        subtitle={editing ? 'Update guest details and visit information.' : 'Log a new guest visit for a resident student.'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select
            label="Visiting student"
            value={form.student}
            onChange={(event) => setField('student', event.target.value)}
            placeholder="Select student"
            options={students.map((student) => ({
              value: student._id,
              label: `${student.user?.name || 'Student'} (${student.rollNo}) · ${student.hostel?.name || ''}`,
            }))}
            disabled={Boolean(editing)}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Visitor name" value={form.visitorName} onChange={(event) => setField('visitorName', event.target.value)} required />
            <Input label="Phone" value={form.phone} onChange={(event) => setField('phone', event.target.value)} required />
            <Input label="Relation" value={form.relation} onChange={(event) => setField('relation', event.target.value)} placeholder="Parent, sibling, friend..." />
            <Input label="ID proof" value={form.idProof} onChange={(event) => setField('idProof', event.target.value)} placeholder="Aadhaar / driving licence" />
            <Input label="Visit date" type="date" value={form.visitDate} onChange={(event) => setField('visitDate', event.target.value)} />
            <Input label="Check-in time" type="datetime-local" value={form.checkIn} onChange={(event) => setField('checkIn', event.target.value)} />
          </div>
          <Input label="Purpose of visit" value={form.purpose} onChange={(event) => setField('purpose', event.target.value)} placeholder="Example: Family visit / dropping supplies" required />
          <Textarea label="Notes" value={form.notes} onChange={(event) => setField('notes', event.target.value)} rows={3} />
          <div className="flex justify-end gap-2 border-t border-[#F2ECF8] pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Check in visitor'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(details)}
        onClose={() => setDetails(null)}
        title={details?.visitorName || 'Visitor details'}
        subtitle={details ? `Visiting ${details.student?.user?.name || 'student'} · ${details.hostel?.name || 'Hostel'}` : ''}
      >
        {details ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-lavender-50/70 p-4">
              <div className="flex items-center gap-3">
                <Avatar name={details.visitorName} size="lg" />
                <div>
                  <p className="text-base font-extrabold text-ink">{details.visitorName}</p>
                  <p className="text-xs text-muted">{details.phone} · {details.relation}</p>
                </div>
              </div>
              <Badge status={details.status} dot />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Visiting student" value={details.student?.user?.name} />
              <DetailItem label="Roll number" value={details.student?.rollNo} />
              <DetailItem label="Hostel" value={details.hostel?.name} />
              <DetailItem label="ID proof" value={details.idProof || '—'} />
              <DetailItem label="Visit date" value={formatDate(details.visitDate)} />
              <DetailItem label="Purpose" value={details.purpose} />
              <DetailItem label="Checked in" value={formatDateTime(details.checkIn)} />
              <DetailItem label="Checked out" value={details.checkOut ? formatDateTime(details.checkOut) : 'Still inside'} />
              <DetailItem label="Recorded by" value={details.recordedBy?.name || 'System'} />
              <DetailItem label="Notes" value={details.notes} className="sm:col-span-2" />
            </div>
            {details.status === 'checked_in' ? (
              <div className="flex justify-end gap-2 border-t border-[#F2ECF8] pt-4">
                <Button variant="secondary" onClick={() => setDetails(null)}>
                  Close
                </Button>
                <Button
                  icon={CheckCircle2}
                  loading={checkingOut === details._id}
                  onClick={async () => {
                    const approved = await confirm({
                      title: 'Check out visitor?',
                      message: `Mark ${details.visitorName} as checked out now?`,
                      confirmText: 'Check out',
                    });
                    if (!approved) return;
                    setCheckingOut(details._id);
                    try {
                      await visitorService.checkout(details._id);
                      toast.success(`${details.visitorName} has checked out.`);
                      setDetails(null);
                      await load();
                    } catch (err) {
                      toast.error(getErrorMessage(err), 'Checkout failed');
                    } finally {
                      setCheckingOut('');
                    }
                  }}
                >
                  Check out visitor
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default VisitorsPage;
