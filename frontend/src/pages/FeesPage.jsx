import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeIndianRupee,
  CalendarClock,
  CircleDollarSign,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  SearchX,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import feeService from '../services/feeService';
import studentService from '../services/studentService';
import hostelService from '../services/hostelService';
import { formatCurrency, formatDate, getErrorMessage, titleCase } from '../utils/format';
import { feeStatusOptions, feeTypeOptions } from '../utils/options';
import { toDateInput } from '../utils/form';
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
import ProgressBar from '../components/ui/ProgressBar';

const nextTenDays = () => {
  const date = new Date();
  date.setDate(date.getDate() + 10);
  return toDateInput(date);
};

const academicYear = () => {
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
};

const currentPeriod = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const emptyForm = {
  student: '',
  title: 'Monthly Hostel Rent',
  type: 'hostel_rent',
  academicYear: academicYear(),
  period: currentPeriod(),
  amount: '',
  dueDate: nextTenDays(),
  description: '',
};

const emptyGenerate = {
  title: 'Monthly Hostel Rent',
  type: 'hostel_rent',
  amount: '',
  dueDate: nextTenDays(),
  period: currentPeriod(),
  academicYear: academicYear(),
  hostel: '',
};

const feeTypeLabel = (type) => feeTypeOptions.find((option) => option.value === type)?.label || titleCase(type);

const FeesPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState({ billed: 0, paid: 0, pending: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState({ sortBy: 'dueDate', order: 'desc' });
  const [filters, setFilters] = useState({ q: '', status: '', type: '' });
  const debouncedSearch = useDebounce(filters.q, 350);

  const [students, setStudents] = useState([]);
  const [hostels, setHostels] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState(emptyGenerate);
  const [generating, setGenerating] = useState(false);

  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await feeService.list({
        q: debouncedSearch || undefined,
        status: filters.status || undefined,
        type: filters.type || undefined,
        page,
        limit,
        sortBy: sort.sortBy,
        order: sort.order,
      });
      setFees(result.data || []);
      setSummary(result.summary || { billed: 0, paid: 0, pending: 0 });
      setPagination(result.pagination || { page, pages: 1, total: 0 });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.status, filters.type, page, limit, sort.sortBy, sort.order]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    studentService
      .list({ limit: 500, status: 'active', sortBy: 'rollNo', order: 'asc' })
      .then((result) => setStudents(result.data || []))
      .catch(() => setStudents([]));
    hostelService
      .list({ limit: 200 })
      .then((result) => setHostels(result.data || []))
      .catch(() => setHostels([]));
  }, [isAdmin]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.status, filters.type]);

  const handleSort = (sortBy) => {
    setSort((current) => ({
      sortBy,
      order: current.sortBy === sortBy && current.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, dueDate: nextTenDays(), academicYear: academicYear(), period: currentPeriod() });
    setModalOpen(true);
  };

  const openEdit = (fee) => {
    setEditing(fee);
    setForm({
      student: fee.student?._id || '',
      title: fee.title || '',
      type: fee.type || 'hostel_rent',
      academicYear: fee.academicYear || academicYear(),
      period: fee.period || '',
      amount: String(fee.amount ?? ''),
      dueDate: toDateInput(fee.dueDate),
      description: fee.description || '',
    });
    setModalOpen(true);
  };

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const setGenerateField = (field, value) => setGenerateForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.student || !form.title.trim() || !form.amount || !form.dueDate) {
      toast.error('Student, title, amount and due date are required.', 'Missing details');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        dueDate: form.dueDate,
      };
      if (editing) {
        delete payload.student;
        await feeService.update(editing._id, payload);
        toast.success('Fee record updated successfully.');
      } else {
        await feeService.create(payload);
        toast.success('Fee record created successfully.');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not save fee');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (!generateForm.title.trim() || !generateForm.dueDate) {
      toast.error('Title and due date are required to generate fees.', 'Missing details');
      return;
    }
    setGenerating(true);
    try {
      const result = await feeService.generate({
        ...generateForm,
        amount: generateForm.amount ? Number(generateForm.amount) : undefined,
        hostel: generateForm.hostel || undefined,
      });
      toast.success(result.message || 'Fees generated successfully.');
      setGenerateOpen(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not generate fees');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (fee) => {
    const approved = await confirm({
      title: 'Delete fee record?',
      message: `Delete "${fee.title}" for ${fee.student?.user?.name || 'this student'}? Fees with recorded payments cannot be deleted.`,
      confirmText: 'Delete fee',
      tone: 'danger',
    });
    if (!approved) return;
    try {
      await feeService.remove(fee._id);
      toast.success('Fee record deleted.');
      if (fees.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Delete failed');
    }
  };

  const openDetails = async (fee) => {
    setDetails(fee);
    setDetailsLoading(true);
    try {
      const result = await feeService.get(fee._id);
      setDetails(result.data);
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not load fee');
    } finally {
      setDetailsLoading(false);
    }
  };

  const collectionRate = summary.billed ? Math.round((summary.paid / summary.billed) * 100) : 0;

  const columns = useMemo(
    () => [
      {
        key: 'student',
        header: 'Student',
        render: (row) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.student?.user?.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[12px] font-extrabold text-ink">{row.student?.user?.name || 'Unknown student'}</p>
              <p className="truncate text-[10px] text-muted">{row.student?.rollNo} · {row.hostel?.name || 'No hostel'}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'title',
        header: 'Fee',
        sortKey: 'title',
        render: (row) => (
          <div>
            <p className="text-[12px] font-extrabold text-ink">{row.title}</p>
            <p className="text-[10px] text-muted">
              {feeTypeLabel(row.type)}
              {row.period ? ` · ${row.period}` : ''}
            </p>
          </div>
        ),
      },
      {
        key: 'amount',
        header: 'Amount',
        sortKey: 'amount',
        render: (row) => (
          <div>
            <p className="text-[12px] font-extrabold text-ink">{formatCurrency(row.amount)}</p>
            <p className="text-[10px] text-muted">Balance {formatCurrency(row.balance ?? row.amount - (row.paidAmount || 0))}</p>
          </div>
        ),
      },
      {
        key: 'dueDate',
        header: 'Due date',
        sortKey: 'dueDate',
        render: (row) => (
          <div>
            <p className={`text-[12px] font-semibold ${row.status === 'overdue' ? 'text-tomato-600' : 'text-ink'}`}>
              {formatDate(row.dueDate)}
            </p>
            <p className="text-[10px] text-muted">{row.academicYear}</p>
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
            <Button variant="ghost" size="icon" onClick={() => openDetails(row)} title="View fee">
              <Eye size={15} />
            </Button>
            {isAdmin ? (
              <>
                <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit fee">
                  <Pencil size={15} />
                </Button>
                <Button variant="ghost" size="icon" className="text-tomato-600" onClick={() => handleDelete(row)} title="Delete fee">
                  <Trash2 size={15} />
                </Button>
              </>
            ) : null}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdmin, fees.length, page]
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Finance"
        title={isStudent ? 'My fees' : 'Fees'}
        subtitle={
          isAdmin
            ? 'Create, update and generate fee records, then track outstanding balances across hostels.'
            : isStudent
              ? 'Track every hostel charge, due date and payment status on your account.'
              : 'Monitor fee billing and outstanding balances for students in your hostel.'
        }
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load} loading={loading}>
              Refresh
            </Button>
            {isAdmin ? (
              <>
                <Button variant="secondary" size="sm" icon={Sparkles} onClick={() => setGenerateOpen(true)}>
                  Generate fees
                </Button>
                <Button size="sm" icon={Plus} onClick={openCreate}>
                  Add fee
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total billed" value={formatCurrency(summary.billed, { compact: true })} icon={BadgeIndianRupee} tone="lavender" helper={`${pagination.total} fee records`} />
        <StatCard label="Collected" value={formatCurrency(summary.paid, { compact: true })} icon={Wallet} tone="emerald" helper={`${collectionRate}% collection rate`} />
        <StatCard label="Outstanding" value={formatCurrency(summary.pending, { compact: true })} icon={CircleDollarSign} tone="tomato" helper="Pending and overdue balance" />
        <StatCard label="Collection progress" value={`${collectionRate}%`} icon={CalendarClock} tone="lime" helper="Share of billed fees collected" />
      </div>

      <div className="card mt-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <SearchInput
          value={filters.q}
          onChange={(value) => setFilters((current) => ({ ...current, q: value }))}
          placeholder="Search student, title or period..."
        />
        <Select
          value={filters.type}
          onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
          placeholder="All fee types"
          options={feeTypeOptions}
          containerClassName="w-full sm:w-44"
        />
        <Select
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          placeholder="All statuses"
          options={feeStatusOptions}
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
            data={fees}
            loading={loading}
            sortBy={sort.sortBy}
            sortOrder={sort.order}
            onSort={handleSort}
            emptyIcon={SearchX}
            emptyTitle="No fee records found"
            emptyDescription={isAdmin ? 'Create a fee or generate monthly fees for active students.' : 'No fees have been billed yet.'}
            emptyAction={isAdmin ? <Button size="sm" icon={Plus} onClick={openCreate}>Add fee</Button> : null}
          />
          {!loading && fees.length > 0 ? (
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
        title={editing ? 'Edit fee record' : 'Add a fee record'}
        subtitle="Bill a student for hostel rent, mess, deposits, fines or maintenance."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Student"
              value={form.student}
              onChange={(event) => setField('student', event.target.value)}
              placeholder="Select student"
              options={students.map((student) => ({
                value: student._id,
                label: `${student.user?.name || 'Student'} (${student.rollNo})`,
              }))}
              disabled={Boolean(editing)}
              required
            />
            <Input label="Fee title" value={form.title} onChange={(event) => setField('title', event.target.value)} required />
            <Select label="Fee type" value={form.type} onChange={(event) => setField('type', event.target.value)} options={feeTypeOptions} />
            <Input label="Amount (₹)" type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setField('amount', event.target.value)} required />
            <Input label="Period" type="month" value={form.period} onChange={(event) => setField('period', event.target.value)} hint="Billing month this fee belongs to." />
            <Input label="Academic year" value={form.academicYear} onChange={(event) => setField('academicYear', event.target.value)} placeholder="2026-2027" />
            <Input label="Due date" type="date" value={form.dueDate} onChange={(event) => setField('dueDate', event.target.value)} required />
          </div>
          <Textarea label="Description" value={form.description} onChange={(event) => setField('description', event.target.value)} rows={3} placeholder="Optional notes shown on the fee record..." />
          <div className="flex justify-end gap-2 border-t border-[#F2ECF8] pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Create fee'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="Generate monthly fees"
        subtitle="Create the same fee for every active student. Duplicate periods are skipped automatically."
        size="lg"
      >
        <form onSubmit={handleGenerate} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Fee title" value={generateForm.title} onChange={(event) => setGenerateField('title', event.target.value)} required />
            <Select label="Fee type" value={generateForm.type} onChange={(event) => setGenerateField('type', event.target.value)} options={feeTypeOptions} />
            <Input
              label="Amount per student (₹)"
              type="number"
              min="0"
              step="0.01"
              value={generateForm.amount}
              onChange={(event) => setGenerateField('amount', event.target.value)}
              hint="Leave blank to use each student's room rent."
            />
            <Input label="Due date" type="date" value={generateForm.dueDate} onChange={(event) => setGenerateField('dueDate', event.target.value)} required />
            <Input label="Period" type="month" value={generateForm.period} onChange={(event) => setGenerateField('period', event.target.value)} />
            <Input label="Academic year" value={generateForm.academicYear} onChange={(event) => setGenerateField('academicYear', event.target.value)} />
            <Select
              label="Hostel scope"
              value={generateForm.hostel}
              onChange={(event) => setGenerateField('hostel', event.target.value)}
              placeholder="All hostels"
              options={hostels.map((hostel) => ({ value: hostel._id, label: hostel.name }))}
            />
          </div>
          <div className="rounded-2xl bg-lime-50 p-4 text-[11px] leading-5 text-[#4E5B12]">
            Fees are generated for active students only. Students who already have a fee with the same title, type and period are skipped.
          </div>
          <div className="flex justify-end gap-2 border-t border-[#F2ECF8] pt-4">
            <Button variant="secondary" onClick={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" loading={generating}>
              Generate fees
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(details)}
        onClose={() => setDetails(null)}
        title={details?.title || 'Fee details'}
        subtitle={details ? `${details.student?.user?.name || 'Student'} · ${details.student?.rollNo || ''}` : ''}
        size="lg"
      >
        {details ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-lavender-50/70 p-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-lavender-600">Outstanding balance</p>
                <p className="mt-1 text-2xl font-extrabold text-ink">{formatCurrency(details.balance ?? details.amount - (details.paidAmount || 0))}</p>
                <p className="mt-1 text-[11px] text-muted">
                  {formatCurrency(details.paidAmount || 0)} paid of {formatCurrency(details.amount)} billed
                </p>
              </div>
              <Badge status={details.status} dot />
            </div>
            <ProgressBar value={details.amount ? ((details.paidAmount || 0) / details.amount) * 100 : 0} color={details.status === 'paid' ? 'lime' : 'lavender'} showLabel />
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Student" value={details.student?.user?.name} />
              <DetailItem label="Roll number" value={details.student?.rollNo} />
              <DetailItem label="Fee type" value={feeTypeLabel(details.type)} />
              <DetailItem label="Period" value={details.period || '—'} />
              <DetailItem label="Academic year" value={details.academicYear} />
              <DetailItem label="Due date" value={formatDate(details.dueDate)} />
              <DetailItem label="Hostel" value={details.hostel?.name || 'Not allocated'} />
              <DetailItem label="Created" value={formatDate(details.createdAt)} />
              <DetailItem label="Description" value={details.description} className="sm:col-span-2" />
            </div>

            <div>
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">Payment history</p>
              {detailsLoading ? (
                <p className="text-xs text-muted">Loading payments...</p>
              ) : (details.payments || []).length ? (
                <div className="divide-y divide-[#F6F2F9] rounded-2xl border border-[#F0EAF6]">
                  {details.payments.map((payment) => (
                    <div key={payment._id} className="flex items-center justify-between gap-3 p-3">
                      <div>
                        <p className="text-[12px] font-bold text-ink">{payment.receiptNo}</p>
                        <p className="text-[10px] text-muted">
                          {titleCase(payment.method)} · {formatDate(payment.paidAt)}
                        </p>
                      </div>
                      <p className="text-[12px] font-extrabold text-emerald-600">{formatCurrency(payment.amount)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-[#FCFAFE] p-4 text-xs text-muted">No payments have been recorded for this fee yet.</div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default FeesPage;
