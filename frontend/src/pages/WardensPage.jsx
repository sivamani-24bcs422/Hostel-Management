import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, RefreshCw, SearchX, Trash2, UserSquare2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import wardenService from '../services/wardenService';
import hostelService from '../services/hostelService';
import { formatDate, getErrorMessage } from '../utils/format';
import { genderOptions, wardenStatusOptions } from '../utils/options';
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

const emptyForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  employeeId: '',
  hostel: '',
  designation: 'Hostel Warden',
  qualification: '',
  gender: 'male',
  joiningDate: toDateInput(new Date()),
  status: 'active',
  address: '',
};

const WardensPage = () => {
  const toast = useToast();
  const confirm = useConfirm();

  const [wardens, setWardens] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({ q: '', hostel: '', status: '' });
  const debouncedSearch = useDebounce(filters.q, 350);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await wardenService.list({
        q: debouncedSearch || undefined,
        hostel: filters.hostel || undefined,
        status: filters.status || undefined,
        page,
        limit,
      });
      setWardens(result.data || []);
      setPagination(result.pagination || { page, pages: 1, total: 0 });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.hostel, filters.status, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    hostelService
      .list({ limit: 200 })
      .then((result) => setHostels(result.data || []))
      .catch(() => setHostels([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.hostel, filters.status]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, joiningDate: toDateInput(new Date()) });
    setModalOpen(true);
  };

  const openEdit = (warden) => {
    setEditing(warden);
    setForm({
      name: warden.user?.name || '',
      email: warden.user?.email || '',
      password: '',
      phone: warden.user?.phone || '',
      employeeId: warden.employeeId || '',
      hostel: warden.hostel?._id || '',
      designation: warden.designation || 'Hostel Warden',
      qualification: warden.qualification || '',
      gender: warden.gender || 'male',
      joiningDate: toDateInput(warden.joiningDate),
      status: warden.status || 'active',
      address: warden.address || '',
    });
    setModalOpen(true);
  };

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.employeeId.trim()) {
      toast.error('Name, email and employee ID are required.', 'Missing details');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        password: form.password || undefined,
        hostel: form.hostel || null,
        joiningDate: form.joiningDate || undefined,
      };
      if (editing) {
        await wardenService.update(editing._id, payload);
        toast.success(`${form.name} was updated successfully.`);
      } else {
        await wardenService.create(payload);
        toast.success(`${form.name} was added to the warden team.`);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not save warden');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (warden) => {
    const approved = await confirm({
      title: 'Delete warden?',
      message: `This will remove ${warden.user?.name || 'this warden'} and their login account. The hostel will remain available for reassignment.`,
      confirmText: 'Delete warden',
      tone: 'danger',
    });
    if (!approved) return;
    try {
      await wardenService.remove(warden._id);
      toast.success('Warden deleted successfully.');
      if (wardens.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Delete failed');
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'warden',
        header: 'Warden',
        render: (row) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.user?.name} src={row.user?.avatar} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[12px] font-extrabold text-ink">{row.user?.name}</p>
              <p className="truncate text-[10px] text-muted">{row.user?.email}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'employeeId',
        header: 'Employee ID',
        sortKey: 'employeeId',
        render: (row) => <span className="font-bold text-ink">{row.employeeId}</span>,
      },
      {
        key: 'hostel',
        header: 'Assigned hostel',
        render: (row) => (
          <div>
            <p className="text-[12px] font-semibold text-ink">{row.hostel?.name || 'Unassigned'}</p>
            <p className="text-[10px] text-muted">{row.hostel?.code || 'No hostel linked'}</p>
          </div>
        ),
      },
      {
        key: 'designation',
        header: 'Designation',
        render: (row) => (
          <div>
            <p className="text-[12px] font-semibold text-ink">{row.designation}</p>
            <p className="text-[10px] text-muted">{row.qualification || 'No qualification listed'}</p>
          </div>
        ),
      },
      {
        key: 'joiningDate',
        header: 'Joined',
        sortKey: 'joiningDate',
        render: (row) => <span className="text-[12px]">{formatDate(row.joiningDate)}</span>,
      },
      { key: 'status', header: 'Status', render: (row) => <Badge status={row.status} dot /> },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => setDetails(row)} title="View details">
              <Eye size={15} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit warden">
              <Pencil size={15} />
            </Button>
            <Button variant="ghost" size="icon" className="text-tomato-600" onClick={() => handleDelete(row)} title="Delete warden">
              <Trash2 size={15} />
            </Button>
          </div>
        ),
      },
    ],
    [page, wardens.length]
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Hostel leadership"
        title="Wardens"
        subtitle="Keep hostel leadership details, assignments and contact information up to date."
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load} loading={loading}>
              Refresh
            </Button>
            <Button size="sm" icon={Plus} onClick={openCreate}>
              Add warden
            </Button>
          </>
        }
      />

      <div className="card mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <SearchInput value={filters.q} onChange={(value) => setFilters((current) => ({ ...current, q: value }))} placeholder="Search name, employee ID..." />
        <Select
          value={filters.hostel}
          onChange={(event) => setFilters((current) => ({ ...current, hostel: event.target.value }))}
          placeholder="All hostels"
          options={hostels.map((hostel) => ({ value: hostel._id, label: hostel.name }))}
          containerClassName="w-full sm:w-44"
        />
        <Select
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          placeholder="All statuses"
          options={wardenStatusOptions}
          containerClassName="w-full sm:w-40"
        />
      </div>

      {error ? (
        <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
          <p className="text-sm font-semibold text-tomato-600">{error}</p>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <DataTable
            columns={columns}
            data={wardens}
            loading={loading}
            emptyIcon={SearchX}
            emptyTitle="No wardens found"
            emptyDescription="Add a warden to assign hostel leadership."
            emptyAction={<Button size="sm" icon={Plus} onClick={openCreate}>Add warden</Button>}
          />
          {!loading && wardens.length > 0 ? (
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
        title={editing ? 'Edit warden' : 'Add a new warden'}
        subtitle="Assign a hostel and keep the leadership directory current."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={form.name} onChange={(event) => setField('name', event.target.value)} required />
            <Input label="Email address" type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} required />
            <Input
              label={editing ? 'New password (optional)' : 'Temporary password (optional)'}
              type="password"
              value={form.password}
              onChange={(event) => setField('password', event.target.value)}
              hint={editing ? 'Leave blank to keep the current password.' : 'Defaults to Password@123 when left blank.'}
            />
            <Input label="Phone" value={form.phone} onChange={(event) => setField('phone', event.target.value)} />
            <Input label="Employee ID" value={form.employeeId} onChange={(event) => setField('employeeId', event.target.value)} required />
            <Select
              label="Assigned hostel"
              value={form.hostel}
              onChange={(event) => setField('hostel', event.target.value)}
              placeholder="Unassigned"
              options={hostels.map((hostel) => ({ value: hostel._id, label: `${hostel.name} (${hostel.code})` }))}
            />
            <Input label="Designation" value={form.designation} onChange={(event) => setField('designation', event.target.value)} />
            <Input label="Qualification" value={form.qualification} onChange={(event) => setField('qualification', event.target.value)} />
            <Select label="Gender" value={form.gender} onChange={(event) => setField('gender', event.target.value)} options={genderOptions} />
            <Input label="Joining date" type="date" value={form.joiningDate} onChange={(event) => setField('joiningDate', event.target.value)} />
            <Select label="Status" value={form.status} onChange={(event) => setField('status', event.target.value)} options={wardenStatusOptions} />
          </div>
          <Textarea label="Address" value={form.address} onChange={(event) => setField('address', event.target.value)} rows={3} />
          <div className="flex justify-end gap-2 border-t border-[#F2ECF8] pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Create warden'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(details)} onClose={() => setDetails(null)} title={details?.user?.name || 'Warden details'} subtitle={details?.designation} size="md">
        {details ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-2xl bg-lime-50 p-4">
              <Avatar name={details.user?.name} src={details.user?.avatar} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold text-ink">{details.user?.name}</p>
                <p className="text-xs text-muted">{details.user?.email}</p>
                <p className="mt-0.5 text-xs text-muted">{details.user?.phone || 'No phone added'}</p>
              </div>
              <Badge status={details.status} dot />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Employee ID" value={details.employeeId} />
              <DetailItem label="Hostel" value={details.hostel?.name || 'Unassigned'} />
              <DetailItem label="Designation" value={details.designation} />
              <DetailItem label="Qualification" value={details.qualification} />
              <DetailItem label="Gender" value={details.gender} />
              <DetailItem label="Joining date" value={formatDate(details.joiningDate)} />
              <DetailItem label="Address" value={details.address} className="sm:col-span-2" />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default WardensPage;
