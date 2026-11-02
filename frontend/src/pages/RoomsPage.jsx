import { useCallback, useEffect, useMemo, useState } from 'react';
import { BedDouble, Eye, Pencil, Plus, RefreshCw, SearchX, Trash2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import roomService from '../services/roomService';
import hostelService from '../services/hostelService';
import { formatCurrency, formatDate, getErrorMessage } from '../utils/format';
import { roomStatusOptions, roomTypeOptions } from '../utils/options';
import { joinFacilities, splitFacilities } from '../utils/form';
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
import ProgressBar from '../components/ui/ProgressBar';
import DetailItem from '../components/ui/DetailItem';
import Avatar from '../components/ui/Avatar';

const emptyForm = {
  hostel: '',
  roomNumber: '',
  floor: '1',
  type: 'double',
  capacity: '2',
  rent: '6000',
  facilities: '',
  status: 'available',
  notes: '',
};

const RoomsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const isAdmin = user?.role === 'admin';

  const [rooms, setRooms] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState({ sortBy: 'roomNumber', order: 'asc' });
  const [filters, setFilters] = useState({ q: '', hostel: '', status: '', type: '' });
  const debouncedSearch = useDebounce(filters.q, 350);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await roomService.list({
        q: debouncedSearch || undefined,
        hostel: filters.hostel || undefined,
        status: filters.status || undefined,
        type: filters.type || undefined,
        page,
        limit,
        sortBy: sort.sortBy,
        order: sort.order,
      });
      setRooms(result.data || []);
      setPagination(result.pagination || { page, pages: 1, total: 0 });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.hostel, filters.status, filters.type, page, limit, sort.sortBy, sort.order]);

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
  }, [debouncedSearch, filters.hostel, filters.status, filters.type]);

  const handleSort = (sortBy) => {
    setSort((current) => ({
      sortBy,
      order: current.sortBy === sortBy && current.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, hostel: filters.hostel || hostels[0]?._id || '' });
    setModalOpen(true);
  };

  const openEdit = (room) => {
    setEditing(room);
    setForm({
      hostel: room.hostel?._id || '',
      roomNumber: room.roomNumber || '',
      floor: String(room.floor ?? 1),
      type: room.type || 'double',
      capacity: String(room.capacity || 2),
      rent: String(room.rent || 0),
      facilities: joinFacilities(room.facilities),
      status: room.status || 'available',
      notes: room.notes || '',
    });
    setModalOpen(true);
  };

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.hostel || !form.roomNumber.trim()) {
      toast.error('Select a hostel and enter a room number.', 'Missing details');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        floor: Number(form.floor) || 0,
        capacity: Number(form.capacity) || 1,
        rent: Number(form.rent) || 0,
        facilities: splitFacilities(form.facilities),
      };
      if (editing) {
        await roomService.update(editing._id, payload);
        toast.success(`Room ${form.roomNumber} was updated.`);
      } else {
        await roomService.create(payload);
        toast.success(`Room ${form.roomNumber} was created.`);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not save room');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (room) => {
    const approved = await confirm({
      title: 'Delete room?',
      message: `Delete room ${room.roomNumber} from ${room.hostel?.name || 'this hostel'}? Past allocations for this room will also be removed.`,
      confirmText: 'Delete room',
      tone: 'danger',
    });
    if (!approved) return;
    try {
      await roomService.remove(room._id);
      toast.success('Room deleted successfully.');
      if (rooms.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Delete failed');
    }
  };

  const openDetails = async (room) => {
    setDetails(room);
    setDetailsLoading(true);
    try {
      const result = await roomService.get(room._id);
      setDetails(result.data);
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not load room');
    } finally {
      setDetailsLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'roomNumber',
        header: 'Room',
        sortKey: 'roomNumber',
        render: (row) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lavender-50 text-lavender-600">
              <BedDouble size={16} />
            </div>
            <div>
              <p className="text-[12px] font-extrabold text-ink">Room {row.roomNumber}</p>
              <p className="text-[10px] capitalize text-muted">{row.type} · Floor {row.floor}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'hostel',
        header: 'Hostel',
        render: (row) => (
          <div>
            <p className="text-[12px] font-semibold text-ink">{row.hostel?.name}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted">{row.hostel?.code}</p>
          </div>
        ),
      },
      {
        key: 'occupancy',
        header: 'Occupancy',
        render: (row) => (
          <div className="w-32">
            <div className="flex items-center justify-between text-[10px] font-semibold text-muted">
              <span>{row.occupied} occupied</span>
              <span>{row.availableBeds} free</span>
            </div>
            <ProgressBar value={row.capacity ? (row.occupied / row.capacity) * 100 : 0} color={row.availableBeds === 0 ? 'tomato' : 'lime'} className="mt-1.5" />
          </div>
        ),
      },
      {
        key: 'capacity',
        header: 'Beds',
        render: (row) => <span className="text-[12px] font-semibold text-ink">{row.capacity}</span>,
      },
      {
        key: 'rent',
        header: 'Monthly rent',
        sortKey: 'rent',
        render: (row) => <span className="text-[12px] font-semibold text-ink">{formatCurrency(row.rent)}</span>,
      },
      { key: 'status', header: 'Status', render: (row) => <Badge status={row.status} dot /> },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openDetails(row)} title="View room">
              <Eye size={15} />
            </Button>
            {isAdmin ? (
              <>
                <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit room">
                  <Pencil size={15} />
                </Button>
                <Button variant="ghost" size="icon" className="text-tomato-600" onClick={() => handleDelete(row)} title="Delete room">
                  <Trash2 size={15} />
                </Button>
              </>
            ) : null}
          </div>
        ),
      },
    ],
    [isAdmin, page, rooms.length]
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Bed inventory"
        title="Rooms"
        subtitle={isAdmin ? 'Manage room inventory, rent and live bed availability across every hostel.' : 'View rooms and bed availability in your assigned hostel.'}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load} loading={loading}>
              Refresh
            </Button>
            {isAdmin ? (
              <Button size="sm" icon={Plus} onClick={openCreate}>
                Add room
              </Button>
            ) : null}
          </>
        }
      />

      <div className="card mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <SearchInput value={filters.q} onChange={(value) => setFilters((current) => ({ ...current, q: value }))} placeholder="Search room number..." />
        {isAdmin ? (
          <Select
            value={filters.hostel}
            onChange={(event) => setFilters((current) => ({ ...current, hostel: event.target.value }))}
            placeholder="All hostels"
            options={hostels.map((hostel) => ({ value: hostel._id, label: hostel.name }))}
            containerClassName="w-full sm:w-44"
          />
        ) : null}
        <Select
          value={filters.type}
          onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
          placeholder="All types"
          options={roomTypeOptions}
          containerClassName="w-full sm:w-36"
        />
        <Select
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          placeholder="All statuses"
          options={roomStatusOptions}
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
            data={rooms}
            loading={loading}
            sortBy={sort.sortBy}
            sortOrder={sort.order}
            onSort={handleSort}
            emptyIcon={SearchX}
            emptyTitle="No rooms found"
            emptyDescription="Adjust your filters or create a new room."
            emptyAction={isAdmin ? <Button size="sm" icon={Plus} onClick={openCreate}>Add room</Button> : null}
          />
          {!loading && rooms.length > 0 ? (
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
        title={editing ? `Edit room ${editing.roomNumber}` : 'Add a new room'}
        subtitle="Configure capacity, rent and room facilities."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Hostel"
              value={form.hostel}
              onChange={(event) => setField('hostel', event.target.value)}
              placeholder="Select hostel"
              options={hostels.map((hostel) => ({ value: hostel._id, label: `${hostel.name} (${hostel.code})` }))}
              required
            />
            <Input label="Room number" value={form.roomNumber} onChange={(event) => setField('roomNumber', event.target.value)} required />
            <Input label="Floor" type="number" min="0" value={form.floor} onChange={(event) => setField('floor', event.target.value)} />
            <Select label="Room type" value={form.type} onChange={(event) => setField('type', event.target.value)} options={roomTypeOptions} />
            <Input label="Capacity (beds)" type="number" min="1" max="8" value={form.capacity} onChange={(event) => setField('capacity', event.target.value)} required />
            <Input label="Monthly rent" type="number" min="0" value={form.rent} onChange={(event) => setField('rent', event.target.value)} />
            <Select label="Status" value={form.status} onChange={(event) => setField('status', event.target.value)} options={roomStatusOptions} />
            <Input
              label="Facilities"
              value={form.facilities}
              onChange={(event) => setField('facilities', event.target.value)}
              placeholder="Wi-Fi, Study desk, Attached bath"
              hint="Separate facilities with commas."
            />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={(event) => setField('notes', event.target.value)} rows={3} />
          <div className="flex justify-end gap-2 border-t border-[#F2ECF8] pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Create room'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(details)}
        onClose={() => setDetails(null)}
        title={details ? `Room ${details.roomNumber}` : 'Room details'}
        subtitle={details ? `${details.hostel?.name || ''} · Floor ${details.floor} · ${details.type}` : ''}
        size="lg"
      >
        {details ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Hostel" value={details.hostel?.name} />
              <DetailItem label="Room type" value={details.type} className="capitalize" />
              <DetailItem label="Capacity" value={`${details.capacity} beds`} />
              <DetailItem label="Occupied" value={`${details.occupied || 0} beds`} />
              <DetailItem label="Monthly rent" value={formatCurrency(details.rent)} />
              <DetailItem label="Status" value={<Badge status={details.status} dot />} />
              <DetailItem label="Facilities" value={(details.facilities || []).join(', ') || 'None listed'} className="sm:col-span-2" />
              <DetailItem label="Notes" value={details.notes} className="sm:col-span-2" />
            </div>
            <div>
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">Current residents</p>
              {detailsLoading ? (
                <p className="text-xs text-muted">Loading residents...</p>
              ) : (details.allocations || []).length ? (
                <div className="divide-y divide-[#F6F2F9] rounded-2xl border border-[#F0EAF6]">
                  {details.allocations.map((allocation) => (
                    <div key={allocation._id} className="flex items-center gap-3 p-3">
                      <Avatar name={allocation.student?.user?.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-bold text-ink">{allocation.student?.user?.name}</p>
                        <p className="text-[10px] text-muted">{allocation.student?.rollNo} · Bed {allocation.bedNumber}</p>
                      </div>
                      <p className="text-[10px] text-muted">Since {formatDate(allocation.allocatedAt)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-2xl bg-[#FCFAFE] p-4 text-xs text-muted">
                  <Users size={15} /> No residents are currently allocated to this room.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default RoomsPage;
