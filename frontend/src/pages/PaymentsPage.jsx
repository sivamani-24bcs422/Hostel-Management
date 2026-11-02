import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  Download,
  Eye,
  IndianRupee,
  Plus,
  ReceiptText,
  RefreshCw,
  SearchX,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import paymentService from '../services/paymentService';
import feeService from '../services/feeService';
import { downloadBlob } from '../services/api';
import { formatCurrency, formatDate, formatDateTime, getErrorMessage, titleCase } from '../utils/format';
import { paymentMethodOptions } from '../utils/options';
import { toDateTimeInput, toDateInput } from '../utils/form';
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
  fee: '',
  amount: '',
  method: 'upi',
  transactionId: '',
  paidAt: toDateTimeInput(new Date()),
  notes: '',
};

const PaymentsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ totalCollected: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState({ sortBy: 'paidAt', order: 'desc' });
  const [filters, setFilters] = useState({ q: '', method: '', from: '', to: '' });
  const debouncedSearch = useDebounce(filters.q, 350);

  const [outstandingFees, setOutstandingFees] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await paymentService.list({
        q: debouncedSearch || undefined,
        method: filters.method || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page,
        limit,
        sortBy: sort.sortBy,
        order: sort.order,
      });
      setPayments(result.data || []);
      setSummary(result.summary || { totalCollected: 0 });
      setPagination(result.pagination || { page, pages: 1, total: 0 });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.method, filters.from, filters.to, page, limit, sort.sortBy, sort.order]);

  useEffect(() => {
    load();
  }, [load]);

  const loadOutstanding = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const result = await feeService.list({ limit: 500, sortBy: 'dueDate', order: 'asc' });
      setOutstandingFees((result.data || []).filter((fee) => Number(fee.balance ?? fee.amount - (fee.paidAmount || 0)) > 0));
    } catch {
      setOutstandingFees([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadOutstanding();
  }, [loadOutstanding]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.method, filters.from, filters.to]);

  const handleSort = (sortBy) => {
    setSort((current) => ({
      sortBy,
      order: current.sortBy === sortBy && current.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const openRecord = () => {
    setForm({ ...emptyForm, paidAt: toDateTimeInput(new Date()) });
    setModalOpen(true);
    loadOutstanding();
  };

  const setField = (field, value) => {
    setForm((current) => {
      if (field === 'fee') {
        const fee = outstandingFees.find((item) => item._id === value);
        const balance = fee ? Number(fee.balance ?? fee.amount - (fee.paidAmount || 0)) : '';
        return { ...current, fee: value, amount: balance ? String(balance) : '' };
      }
      return { ...current, [field]: value };
    });
  };

  const selectedFee = outstandingFees.find((fee) => fee._id === form.fee);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.fee || !form.amount || !form.method) {
      toast.error('Select a fee, amount and payment method.', 'Missing details');
      return;
    }
    setSaving(true);
    try {
      const result = await paymentService.record({
        fee: form.fee,
        amount: Number(form.amount),
        method: form.method,
        transactionId: form.transactionId,
        paidAt: form.paidAt ? new Date(form.paidAt).toISOString() : undefined,
        notes: form.notes,
      });
      toast.success(result.message || 'Payment recorded successfully.');
      setModalOpen(false);
      await Promise.all([load(), loadOutstanding()]);
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not record payment');
    } finally {
      setSaving(false);
    }
  };

  const downloadReceipt = async (payment) => {
    setReceiptLoading(payment._id);
    try {
      const blob = await paymentService.receipt(payment._id);
      downloadBlob(blob, `${payment.receiptNo}.pdf`);
      toast.success('Receipt downloaded successfully.');
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not download receipt');
    } finally {
      setReceiptLoading('');
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'receiptNo',
        header: 'Receipt',
        sortKey: 'receiptNo',
        render: (row) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ReceiptText size={16} />
            </div>
            <div>
              <p className="text-[12px] font-extrabold text-ink">{row.receiptNo}</p>
              <p className="text-[10px] text-muted">{formatDateTime(row.paidAt)}</p>
            </div>
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
              <p className="truncate text-[10px] text-muted">{row.student?.rollNo}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'fee',
        header: 'Fee',
        render: (row) => (
          <div>
            <p className="text-[12px] font-semibold text-ink">{row.fee?.title || 'Fee payment'}</p>
            <p className="text-[10px] capitalize text-muted">{titleCase(row.method)} · {row.fee?.period || '—'}</p>
          </div>
        ),
      },
      {
        key: 'amount',
        header: 'Amount',
        sortKey: 'amount',
        render: (row) => <span className="text-[12px] font-extrabold text-emerald-600">{formatCurrency(row.amount)}</span>,
      },
      {
        key: 'transactionId',
        header: 'Reference',
        render: (row) => <span className="text-[11px] text-muted">{row.transactionId || '—'}</span>,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => setDetails(row)} title="View payment">
              <Eye size={15} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => downloadReceipt(row)}
              loading={receiptLoading === row._id}
              title="Download PDF receipt"
            >
              {receiptLoading === row._id ? null : <Download size={15} />}
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [receiptLoading]
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Finance"
        title={isStudent ? 'Payment history' : 'Payments'}
        subtitle={
          isAdmin
            ? 'Record fee payments, issue receipts and review collection history across hostels.'
            : isStudent
              ? 'Every payment you have made, with downloadable PDF receipts.'
              : 'Review payments collected from students in your assigned hostel.'
        }
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load} loading={loading}>
              Refresh
            </Button>
            {isAdmin ? (
              <Button size="sm" icon={Plus} onClick={openRecord}>
                Record payment
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={isStudent ? 'Total paid' : 'Total collected'}
          value={formatCurrency(summary.totalCollected, { compact: true })}
          icon={Wallet}
          tone="emerald"
          helper={`${pagination.total} payment records`}
        />
        <StatCard label="Receipts available" value={pagination.total} icon={ReceiptText} tone="lavender" helper="PDF receipts can be downloaded" />
        <StatCard label="Latest payment" value={payments[0] ? formatCurrency(payments[0].amount) : '—'} icon={CreditCard} tone="lime" helper={payments[0] ? formatDate(payments[0].paidAt) : 'No payments yet'} />
      </div>

      <div className="card mt-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <SearchInput
          value={filters.q}
          onChange={(value) => setFilters((current) => ({ ...current, q: value }))}
          placeholder="Search receipt, student or reference..."
        />
        <Select
          value={filters.method}
          onChange={(event) => setFilters((current) => ({ ...current, method: event.target.value }))}
          placeholder="All methods"
          options={paymentMethodOptions}
          containerClassName="w-full sm:w-40"
        />
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filters.from}
            onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
            aria-label="From date"
            className="h-9"
          />
          <span className="text-[11px] font-semibold text-muted">to</span>
          <Input
            type="date"
            value={filters.to}
            onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
            aria-label="To date"
            className="h-9"
          />
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
            data={payments}
            loading={loading}
            sortBy={sort.sortBy}
            sortOrder={sort.order}
            onSort={handleSort}
            emptyIcon={SearchX}
            emptyTitle="No payments found"
            emptyDescription={
              isAdmin ? 'Record a payment to generate the first receipt.' : 'Payments will appear here once they are recorded.'
            }
            emptyAction={isAdmin ? <Button size="sm" icon={Plus} onClick={openRecord}>Record payment</Button> : null}
          />
          {!loading && payments.length > 0 ? (
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
        title="Record a payment"
        subtitle="Apply a payment to an outstanding fee and generate a PDF receipt instantly."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select
            label="Outstanding fee"
            value={form.fee}
            onChange={(event) => setField('fee', event.target.value)}
            placeholder={outstandingFees.length ? 'Select an outstanding fee' : 'No outstanding fees'}
            options={outstandingFees.map((fee) => ({
              value: fee._id,
              label: `${fee.student?.user?.name || 'Student'} · ${fee.title} · ${formatCurrency(fee.balance ?? fee.amount - (fee.paidAmount || 0))} due`,
            }))}
            required
          />

          {selectedFee ? (
            <div className="grid gap-4 rounded-2xl bg-lavender-50/70 p-4 sm:grid-cols-3">
              <DetailItem label="Student" value={selectedFee.student?.user?.name} />
              <DetailItem label="Fee amount" value={formatCurrency(selectedFee.amount)} />
              <DetailItem label="Outstanding" value={formatCurrency(selectedFee.balance ?? selectedFee.amount - (selectedFee.paidAmount || 0))} />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Amount (₹)"
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(event) => setField('amount', event.target.value)}
              required
            />
            <Select label="Payment method" value={form.method} onChange={(event) => setField('method', event.target.value)} options={paymentMethodOptions} required />
            <Input label="Transaction reference" value={form.transactionId} onChange={(event) => setField('transactionId', event.target.value)} placeholder="UPI / bank reference (optional)" />
            <Input label="Paid at" type="datetime-local" value={form.paidAt} onChange={(event) => setField('paidAt', event.target.value)} />
          </div>

          <Textarea label="Notes" value={form.notes} onChange={(event) => setField('notes', event.target.value)} rows={3} placeholder="Optional payment note..." />

          <div className="flex justify-end gap-2 border-t border-[#F2ECF8] pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} icon={IndianRupee}>
              Record payment
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(details)}
        onClose={() => setDetails(null)}
        title="Payment details"
        subtitle={details?.receiptNo || ''}
      >
        {details ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">Amount paid</p>
                <p className="mt-1 text-2xl font-extrabold text-ink">{formatCurrency(details.amount)}</p>
              </div>
              <Badge status={details.status} dot />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Student" value={details.student?.user?.name} />
              <DetailItem label="Roll number" value={details.student?.rollNo} />
              <DetailItem label="Receipt number" value={details.receiptNo} />
              <DetailItem label="Fee" value={details.fee?.title} />
              <DetailItem label="Fee period" value={details.fee?.period || '—'} />
              <DetailItem label="Method" value={titleCase(details.method)} />
              <DetailItem label="Transaction reference" value={details.transactionId || '—'} />
              <DetailItem label="Paid at" value={formatDateTime(details.paidAt)} />
              <DetailItem label="Recorded by" value={details.recordedBy?.name || 'System'} />
              <DetailItem label="Notes" value={details.notes} />
            </div>
            <div className="flex justify-end gap-2 border-t border-[#F2ECF8] pt-4">
              <Button variant="secondary" onClick={() => setDetails(null)}>
                Close
              </Button>
              <Button
                icon={Download}
                loading={receiptLoading === details._id}
                onClick={() => downloadReceipt(details)}
              >
                Download PDF receipt
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default PaymentsPage;
