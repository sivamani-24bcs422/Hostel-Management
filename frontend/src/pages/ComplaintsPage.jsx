import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Eye,
  MessageSquareWarning,
  Pencil,
  Plus,
  RefreshCw,
  SearchX,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import complaintService from '../services/complaintService';
import hostelService from '../services/hostelService';
import { formatDateTime, getErrorMessage, titleCase } from '../utils/format';
import {
  complaintCategoryOptions,
  complaintPriorityOptions,
  complaintStatusOptions,
} from '../utils/options';
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

const emptyCreate = {
  title: '',
  description: '',
  category: 'maintenance',
  priority: 'medium',
};

const emptyUpdate = {
  status: 'open',
  priority: 'medium',
  resolutionNote: '',
};

const categoryLabel = (category) =>
  complaintCategoryOptions.find((option) => option.value === category)?.label || titleCase(category);

const ComplaintsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';
  const canManage = isAdmin || user?.role === 'warden';

  const [complaints, setComplaints] = useState([]);
  const [summary, setSummary] = useState({ open: 0, in_progress: 0, resolved: 0, rejected: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState({ sortBy: 'createdAt', order: 'desc' });
  const [filters, setFilters] = useState({ q: '', status: '', priority: '', category: '', hostel: '' });
  const debouncedSearch = useDebounce(filters.q, 350);
  const [hostels, setHostels] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState(null);
  const [updateForm, setUpdateForm] = useState(emptyUpdate);
  const [updating, setUpdating] = useState(false);

  const [details, setDetails] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await complaintService.list({
        q: debouncedSearch || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        category: filters.category || undefined,
        hostel: filters.hostel || undefined,
        page,
        limit,
        sortBy: sort.sortBy,
        order: sort.order,
      });
      setComplaints(result.data || []);
      setSummary(result.summary || { open: 0, in_progress: 0, resolved: 0, rejected: 0 });
      setPagination(result.pagination || { page, pages: 1, total: 0 });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.status, filters.priority, filters.category, filters.hostel, page, limit, sort.sortBy, sort.order]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    hostelService
      .list({ limit: 200 })
      .then((result) => setHostels(result.data || []))
      .catch(() => setHostels([]));
  }, [isAdmin]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.status, filters.priority, filters.category, filters.hostel]);

  const handleSort = (sortBy) => {
    setSort((current) => ({
      sortBy,
      order: current.sortBy === sortBy && current.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const openCreate = () => {
    setCreateForm(emptyCreate);
    setCreateOpen(true);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (createForm.title.trim().length < 3 || createForm.description.trim().length < 10) {
      toast.error('Add a short title and a description of at least 10 characters.', 'Missing details');
      return;
    }
    setCreating(true);
    try {
      await complaintService.create(createForm);
      toast.success('Complaint submitted successfully. Your warden has been notified.');
      setCreateOpen(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not submit complaint');
    } finally {
      setCreating(false);
    }
  };

  const openUpdate = (complaint) => {
    setEditing(complaint);
    setUpdateForm({
      status: complaint.status || 'open',
      priority: complaint.priority || 'medium',
      resolutionNote: complaint.resolutionNote || '',
    });
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editing) return;
    setUpdating(true);
    try {
      await complaintService.update(editing._id, updateForm);
      toast.success('Complaint updated successfully.');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not update complaint');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (complaint) => {
    const approved = await confirm({
      title: 'Delete complaint?',
      message: `Delete "${complaint.title}"? This removes the complaint and its resolution history.`,
      confirmText: 'Delete complaint',
      tone: 'danger',
    });
    if (!approved) return;
    try {
      await complaintService.remove(complaint._id);
      toast.success('Complaint deleted.');
      if (complaints.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Delete failed');
    }
  };

  const openDetails = async (complaint) => {
    setDetails(complaint);
    try {
      const result = await complaintService.get(complaint._id);
      setDetails(result.data);
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not load complaint');
    }
  };

  const canDelete = (complaint) => {
    if (canManage) return true;
    return isStudent && complaint.status === 'open';
  };

  const columns = useMemo(
    () => [
      {
        key: 'title',
        header: 'Complaint',
        sortKey: 'title',
        render: (row) => (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lavender-50 text-lavender-600">
              <Wrench size={15} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-extrabold text-ink">{row.title}</p>
              <p className="line-clamp-1 text-[10px] text-muted">{row.description}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'student',
        header: 'Raised by',
        render: (row) => (
          <div className="flex items-center gap-2.5">
            <Avatar name={row.student?.user?.name} size="xs" />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold text-ink">{row.student?.user?.name || 'Student'}</p>
              <p className="text-[10px] text-muted">{row.hostel?.name || 'No hostel'}{row.room?.roomNumber ? ` · Room ${row.room.roomNumber}` : ''}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        render: (row) => (
          <div>
            <p className="text-[11px] font-semibold text-ink">{categoryLabel(row.category)}</p>
            <Badge status={row.priority} className="mt-1" />
          </div>
        ),
      },
      {
        key: 'createdAt',
        header: 'Raised on',
        sortKey: 'createdAt',
        render: (row) => <span className="text-[11px] text-muted">{formatDateTime(row.createdAt)}</span>,
      },
      { key: 'status', header: 'Status', sortKey: 'status', render: (row) => <Badge status={row.status} dot /> },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openDetails(row)} title="View complaint">
              <Eye size={15} />
            </Button>
            {canManage ? (
              <Button variant="ghost" size="icon" onClick={() => openUpdate(row)} title="Update complaint">
                <Pencil size={15} />
              </Button>
            ) : null}
            {canDelete(row) ? (
              <Button variant="ghost" size="icon" className="text-tomato-600" onClick={() => handleDelete(row)} title="Delete complaint">
                <Trash2 size={15} />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage, isStudent, user?._id, complaints.length, page]
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Resident support"
        title={isStudent ? 'My complaints' : 'Complaints'}
        subtitle={
          isStudent
            ? 'Raise maintenance, food, cleanliness, security or Wi-Fi issues and track their resolution.'
            : 'Review, prioritise and resolve resident issues for your hostel community.'
        }
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load} loading={loading}>
              Refresh
            </Button>
            {isStudent ? (
              <Button size="sm" icon={Plus} onClick={openCreate}>
                Raise complaint
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open" value={summary.open || 0} icon={CircleDot} tone="tomato" helper="Waiting for first response" />
        <StatCard label="In progress" value={summary.in_progress || 0} icon={Wrench} tone="amber" helper="Being worked on" />
        <StatCard label="Resolved" value={summary.resolved || 0} icon={CheckCircle2} tone="emerald" helper="Closed successfully" />
        <StatCard label="Rejected" value={summary.rejected || 0} icon={AlertCircle} tone="sky" helper="Closed without action" />
      </div>

      <div className="card mt-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <SearchInput
          value={filters.q}
          onChange={(value) => setFilters((current) => ({ ...current, q: value }))}
          placeholder="Search title, description or student..."
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
          value={filters.category}
          onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
          placeholder="All categories"
          options={complaintCategoryOptions}
          containerClassName="w-full sm:w-40"
        />
        <Select
          value={filters.priority}
          onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
          placeholder="All priorities"
          options={complaintPriorityOptions}
          containerClassName="w-full sm:w-36"
        />
        <Select
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          placeholder="All statuses"
          options={complaintStatusOptions}
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
            data={complaints}
            loading={loading}
            sortBy={sort.sortBy}
            sortOrder={sort.order}
            onSort={handleSort}
            emptyIcon={SearchX}
            emptyTitle="No complaints found"
            emptyDescription={isStudent ? 'You have not raised any complaints yet.' : 'No complaints match the current filters.'}
            emptyAction={isStudent ? <Button size="sm" icon={Plus} onClick={openCreate}>Raise complaint</Button> : null}
          />
          {!loading && complaints.length > 0 ? (
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
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Raise a complaint"
        subtitle="Your hostel warden will review this issue and keep you updated."
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <Input label="Title" value={createForm.title} onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))} placeholder="Example: Water leak in bathroom" required />
          <Textarea
            label="Description"
            value={createForm.description}
            onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))}
            rows={5}
            placeholder="Describe the issue, where it is, and when it started..."
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              value={createForm.category}
              onChange={(event) => setCreateForm((current) => ({ ...current, category: event.target.value }))}
              options={complaintCategoryOptions}
            />
            <Select
              label="Priority"
              value={createForm.priority}
              onChange={(event) => setCreateForm((current) => ({ ...current, priority: event.target.value }))}
              options={complaintPriorityOptions}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-[#F2ECF8] pt-4">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Submit complaint
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Update complaint"
        subtitle={editing ? `${editing.title} · ${editing.student?.user?.name || 'Student'}` : ''}
      >
        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Status"
              value={updateForm.status}
              onChange={(event) => setUpdateForm((current) => ({ ...current, status: event.target.value }))}
              options={complaintStatusOptions}
            />
            <Select
              label="Priority"
              value={updateForm.priority}
              onChange={(event) => setUpdateForm((current) => ({ ...current, priority: event.target.value }))}
              options={complaintPriorityOptions}
            />
          </div>
          <Textarea
            label="Resolution note"
            value={updateForm.resolutionNote}
            onChange={(event) => setUpdateForm((current) => ({ ...current, resolutionNote: event.target.value }))}
            rows={4}
            placeholder="What was done to resolve this issue?"
          />
          <div className="flex justify-end gap-2 border-t border-[#F2ECF8] pt-4">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={updating}>
              Save update
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(details)}
        onClose={() => setDetails(null)}
        title={details?.title || 'Complaint details'}
        subtitle={details ? `${details.student?.user?.name || 'Student'} · ${formatDateTime(details.createdAt)}` : ''}
        size="lg"
      >
        {details ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-lavender-50/70 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-lavender-600">
                  <MessageSquareWarning size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-lavender-600">Current status</p>
                  <p className="text-sm font-extrabold capitalize text-ink">{titleCase(details.status)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge status={details.priority} />
                <Badge status={details.status} dot />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A8FA4]">Description</p>
              <p className="mt-2 whitespace-pre-line rounded-2xl bg-[#FCFAFE] p-4 text-[13px] leading-6 text-[#4B3A5A]">{details.description}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Student" value={details.student?.user?.name} />
              <DetailItem label="Roll number" value={details.student?.rollNo} />
              <DetailItem label="Hostel" value={details.hostel?.name || 'Not allocated'} />
              <DetailItem label="Room" value={details.room?.roomNumber ? `Room ${details.room.roomNumber}` : '—'} />
              <DetailItem label="Category" value={categoryLabel(details.category)} />
              <DetailItem label="Raised on" value={formatDateTime(details.createdAt)} />
              <DetailItem label="Assigned to" value={details.assignedTo?.name || 'Unassigned'} />
              <DetailItem label="Resolved by" value={details.resolvedBy?.name || '—'} />
              <DetailItem label="Resolved on" value={details.resolvedAt ? formatDateTime(details.resolvedAt) : '—'} />
              <DetailItem label="Resolution note" value={details.resolutionNote || 'No resolution note yet.'} className="sm:col-span-2" />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default ComplaintsPage;
