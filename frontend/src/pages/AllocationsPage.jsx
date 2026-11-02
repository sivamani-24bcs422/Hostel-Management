import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BedDouble,
  Building2,
  CalendarCheck2,
  DoorOpen,
  Eye,
  Home,
  LogOut,
  Plus,
  RefreshCw,
  SearchX,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import allocationService from '../services/allocationService';
import studentService from '../services/studentService';
import hostelService from '../services/hostelService';
import roomService from '../services/roomService';
import { formatDate, formatDateTime, getErrorMessage } from '../utils/format';
import { allocationStatusOptions } from '../utils/options';
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
import EmptyState from '../components/ui/EmptyState';

const emptyForm = {
  student: '',
  hostel: '',
  room: '',
  bedNumber: '',
  notes: '',
};

const AllocationsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  const [allocations, setAllocations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [counts, setCounts] = useState({ active: 0, vacated: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState({ sortBy: 'allocatedAt', order: 'desc' });
  const [filters, setFilters] = useState({ q: '', status: '', hostel: '' });
  const debouncedSearch = useDebounce(filters.q, 350);

  const [hostels, setHostels] = useState([]);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [takenBeds, setTakenBeds] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState(null);
  const [vacateTarget, setVacateTarget] = useState(null);
  const [vacateReason, setVacateReason] = useState('');
  const [vacating, setVacating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await allocationService.list({
        q: debouncedSearch || undefined,
        status: filters.status || undefined,
        hostel: filters.hostel || undefined,
        page,
        limit,
        sortBy: sort.sortBy,
        order: sort.order,
      });
      setAllocations(result.data || []);
      setPagination(result.pagination || { page, pages: 1, total: 0 });

      if (!isStudent) {
        const [activeResult, vacatedResult] = await Promise.all([
          allocationService.list({ status: 'active', limit: 1 }),
          allocationService.list({ status: 'vacated', limit: 1 }),
        ]);
        setCounts({
          active: activeResult.pagination?.total || 0,
          vacated: vacatedResult.pagination?.total || 0,
        });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.status, filters.hostel, page, limit, sort.sortBy, sort.order, isStudent]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    hostelService
      .list({ limit: 200 })
      .then((result) => setHostels(result.data || []))
      .catch(() => setHostels([]));
    studentService
      .list({ limit: 500, status: 'active', sortBy: 'rollNo', order: 'asc' })
      .then((result) => setStudents(result.data || []))
      .catch(() => setStudents([]));
  }, [isAdmin]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.status, filters.hostel]);

  useEffect(() => {
    if (!form.hostel || !modalOpen) {
      setRooms([]);
      return;
    }
    roomService
      .list({ hostel: form.hostel, limit: 200, sortBy: 'roomNumber', order: 'asc' })
      .then((result) => setRooms((result.data || []).filter((room) => room.status !== 'maintenance')))
      .catch(() => setRooms([]));
  }, [form.hostel, modalOpen]);

  useEffect(() => {
    if (!form.room || !modalOpen) {
      setTakenBeds([]);
      return;
    }
    allocationService
      .list({ room: form.room, status: 'active', limit: 100 })
      .then((result) => setTakenBeds((result.data || []).map((item) => item.bedNumber)))
      .catch(() => setTakenBeds([]));
  }, [form.room, modalOpen]);

  const handleSort = (sortBy) => {
    setSort((current) => ({
      sortBy,
      order: current.sortBy === sortBy && current.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const openCreate = () => {
    setForm({ ...emptyForm, hostel: filters.hostel || hostels[0]?._id || '' });
    setModalOpen(true);
  };

  const setField = (field, value) => {
    setForm((current) => {
      if (field === 'hostel') return { ...current, hostel: value, room: '', bedNumber: '' };
      if (field === 'room') return { ...current, room: value, bedNumber: '' };
      return { ...current, [field]: value };
    });
  };

  const selectedRoom = rooms.find((room) => room._id === form.room);
  const availableBedNumbers = selectedRoom
    ? Array.from({ length: selectedRoom.capacity || 0 }, (_, index) => index + 1).filter(
        (bed) => !takenBeds.includes(bed)
      )
    : [];

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.student || !form.room || !form.bedNumber) {
      toast.error('Select a student, room and bed before allocating.', 'Missing details');
      return;
    }
    setSaving(true);
    try {
      await allocationService.create({
        student: form.student,
        room: form.room,
        bedNumber: Number(form.bedNumber),
        notes: form.notes,
      });
      toast.success('Room allocated successfully. Bed occupancy has been updated.');
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not allocate room');
    } finally {
      setSaving(false);
    }
  };

  const handleVacate = async () => {
    if (!vacateTarget) return;
    setVacating(true);
    try {
      await allocationService.vacate(vacateTarget._id, vacateReason.trim() || 'Vacated by administrator');
      toast.success(`${vacateTarget.student?.user?.name || 'Student'} has been vacated from the room.`);
      setVacateTarget(null);
      setVacateReason('');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not vacate room');
    } finally {
      setVacating(false);
    }
  };

  const confirmDelete = async (allocation) => {
    const approved = await confirm({
      title: 'Vacate this room?',
      message: `Mark the allocation for ${allocation.student?.user?.name || 'this student'} as vacated? The bed will become available.`,
      confirmText: 'Vacate room',
      tone: 'danger',
    });
    if (!approved) return;
    setVacateTarget(allocation);
    setVacateReason('');
  };

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
              <p className="truncate text-[10px] text-muted">{row.student?.rollNo}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'room',
        header: 'Room & bed',
        render: (row) => (
          <div>
            <p className="text-[12px] font-extrabold text-ink">
              {row.hostel?.name || 'Hostel'} · {row.room?.roomNumber ? `Room ${row.room.roomNumber}` : '—'}
            </p>
            <p className="text-[10px] text-muted">Bed {row.bedNumber} · Floor {row.room?.floor ?? '—'}</p>
          </div>
        ),
      },
      {
        key: 'allocatedAt',
        header: 'Allocated',
        sortKey: 'allocatedAt',
        render: (row) => (
          <div>
            <p className="text-[12px] font-semibold text-ink">{formatDate(row.allocatedAt)}</p>
            <p className="text-[10px] text-muted">By {row.allocatedBy?.name || 'System'}</p>
          </div>
        ),
      },
      {
        key: 'vacatedAt',
        header: 'Vacated',
        render: (row) => (row.vacatedAt ? <span className="text-[11px] text-muted">{formatDate(row.vacatedAt)}</span> : <span className="text-[11px] text-[#B6ABBF]">—</span>),
      },
      { key: 'status', header: 'Status', sortKey: 'status', render: (row) => <Badge status={row.status} dot /> },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => setDetails(row)} title="View allocation">
              <Eye size={15} />
            </Button>
            {isAdmin && row.status === 'active' ? (
              <Button
                variant="ghost"
                size="icon"
                className="text-tomato-600"
                onClick={() => confirmDelete(row)}
                title="Vacate room"
              >
                <LogOut size={15} />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [isAdmin]
  );

  if (isStudent) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          eyebrow="My residence"
          title="My room"
          subtitle="View your current room allocation and complete residence history."
          actions={
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load} loading={loading}>
              Refresh
            </Button>
          }
        />

        {error ? (
          <div className="card p-10 text-center">
            <p className="text-sm font-semibold text-tomato-600">{error}</p>
            <Button variant="secondary" size="sm" icon={RefreshCw} className="mt-3" onClick={load}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Current room"
                value={allocations.find((item) => item.status === 'active')?.room?.roomNumber || 'Not allocated'}
                icon={BedDouble}
                tone="lavender"
                helper={allocations.find((item) => item.status === 'active')?.hostel?.name || 'Contact your warden'}
              />
              <StatCard
                label="Bed number"
                value={allocations.find((item) => item.status === 'active')?.bedNumber || '—'}
                icon={Home}
                tone="lime"
                helper="Your assigned bed"
              />
              <StatCard
                label="Allocation history"
                value={pagination.total}
                icon={CalendarCheck2}
                tone="sky"
                helper="Total allocations on record"
              />
            </div>

            <div className="mt-5 card overflow-hidden">
              <div className="border-b border-[#F3EEF8] px-5 py-4">
                <h3 className="text-sm font-extrabold text-ink">Allocation history</h3>
                <p className="mt-0.5 text-[11px] text-muted">Every room you have stayed in</p>
              </div>
              {loading ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-2xl bg-[#F6F2F9]" />
                  ))}
                </div>
              ) : allocations.length === 0 ? (
                <EmptyState
                  icon={BedDouble}
                  title="No allocation yet"
                  description="Your warden will allocate a room once your hostel registration is complete."
                />
              ) : (
                <div className="divide-y divide-[#F6F2F9]">
                  {allocations.map((allocation) => (
                    <div key={allocation._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lavender-50 text-lavender-600">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <p className="text-[13px] font-extrabold text-ink">
                            {allocation.hostel?.name || 'Hostel'} · Room {allocation.room?.roomNumber || '—'}
                          </p>
                          <p className="text-[11px] text-muted">
                            Bed {allocation.bedNumber} · Allocated {formatDate(allocation.allocatedAt)}
                            {allocation.vacatedAt ? ` · Vacated ${formatDate(allocation.vacatedAt)}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {allocation.status === 'vacated' ? (
                          <span className="text-[11px] text-muted">{allocation.vacateReason || 'Vacated'}</span>
                        ) : null}
                        <Badge status={allocation.status} dot />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Residence operations"
        title="Allocations"
        subtitle={
          isAdmin
            ? 'Allocate beds, prevent duplicate assignments and vacate rooms across every hostel.'
            : 'View active and past bed allocations for students in your assigned hostel.'
        }
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load} loading={loading}>
              Refresh
            </Button>
            {isAdmin ? (
              <Button size="sm" icon={Plus} onClick={openCreate}>
                Allocate room
              </Button>
            ) : null}
          </>
        }
      />

      {isAdmin ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Active allocations" value={counts.active} icon={BedDouble} tone="lavender" helper="Beds currently occupied" />
          <StatCard label="Vacated" value={counts.vacated} icon={DoorOpen} tone="sky" helper="Completed stays on record" />
          <StatCard label="Total allocations" value={counts.active + counts.vacated} icon={Users} tone="lime" helper="All allocations across hostels" />
        </div>
      ) : null}

      <div className="card mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
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
        <Select
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          placeholder="All statuses"
          options={allocationStatusOptions}
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
            data={allocations}
            loading={loading}
            sortBy={sort.sortBy}
            sortOrder={sort.order}
            onSort={handleSort}
            emptyIcon={SearchX}
            emptyTitle="No allocations found"
            emptyDescription={isAdmin ? 'Adjust your filters or allocate a student to a room.' : 'No allocations have been recorded for this hostel yet.'}
            emptyAction={isAdmin ? <Button size="sm" icon={Plus} onClick={openCreate}>Allocate room</Button> : null}
          />
          {!loading && allocations.length > 0 ? (
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
        title="Allocate a room"
        subtitle="Choose a student, hostel, room and bed. Duplicate assignments are automatically blocked."
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
                label: `${student.user?.name || 'Student'} (${student.rollNo})${student.hostel ? ` · ${student.hostel.name}` : ''}`,
              }))}
              required
            />
            <Select
              label="Hostel"
              value={form.hostel}
              onChange={(event) => setField('hostel', event.target.value)}
              placeholder="Select hostel"
              options={hostels.map((hostel) => ({ value: hostel._id, label: `${hostel.name} (${hostel.code})` }))}
              required
            />
            <Select
              label="Room"
              value={form.room}
              onChange={(event) => setField('room', event.target.value)}
              placeholder={form.hostel ? 'Select room' : 'Select a hostel first'}
              options={rooms.map((room) => ({
                value: room._id,
                label: `Room ${room.roomNumber} · ${room.capacity - (room.occupied || 0)} free`,
              }))}
              disabled={!form.hostel}
              required
            />
            <Select
              label="Bed number"
              value={form.bedNumber}
              onChange={(event) => setField('bedNumber', event.target.value)}
              placeholder={form.room ? 'Select bed' : 'Select a room first'}
              options={availableBedNumbers.map((bed) => ({ value: String(bed), label: `Bed ${bed}` }))}
              disabled={!form.room}
              required
            />
          </div>

          {selectedRoom ? (
            <div className="rounded-2xl bg-lavender-50/70 p-4 text-[11px] leading-5 text-[#5B4669]">
              <p className="font-extrabold text-ink">Room snapshot</p>
              <p className="mt-1">
                {selectedRoom.hostel?.name} · Room {selectedRoom.roomNumber} · {selectedRoom.type} · Capacity{' '}
                {selectedRoom.capacity} · {takenBeds.length} bed(s) occupied.
              </p>
            </div>
          ) : null}

          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(event) => setField('notes', event.target.value)}
            placeholder="Optional allocation note..."
            rows={2}
          />

          <div className="flex justify-end gap-2 border-t border-[#F2ECF8] pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Allocate room
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(details)}
        onClose={() => setDetails(null)}
        title="Allocation details"
        subtitle={details ? `${details.student?.user?.name || 'Student'} · ${details.student?.rollNo || ''}` : ''}
      >
        {details ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-2xl bg-lavender-50/70 p-4">
              <Avatar name={details.student?.user?.name} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold text-ink">{details.student?.user?.name}</p>
                <p className="text-xs text-muted">{details.student?.user?.email}</p>
              </div>
              <Badge status={details.status} dot />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Hostel" value={details.hostel?.name} />
              <DetailItem label="Room" value={details.room?.roomNumber} />
              <DetailItem label="Bed" value={`Bed ${details.bedNumber}`} />
              <DetailItem label="Allocated at" value={formatDateTime(details.allocatedAt)} />
              <DetailItem label="Allocated by" value={details.allocatedBy?.name} />
              <DetailItem label="Vacated at" value={details.vacatedAt ? formatDateTime(details.vacatedAt) : 'Still active'} />
              <DetailItem label="Vacate reason" value={details.vacateReason} className="sm:col-span-2" />
              <DetailItem label="Notes" value={details.notes} className="sm:col-span-2" />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(vacateTarget)}
        onClose={() => setVacateTarget(null)}
        title="Vacate room"
        subtitle={vacateTarget ? `${vacateTarget.student?.user?.name || 'Student'} · Room ${vacateTarget.room?.roomNumber || ''}` : ''}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted">
            This will end the active allocation and make the bed available again. The student will be removed from the room.
          </p>
          <Textarea
            label="Reason"
            value={vacateReason}
            onChange={(event) => setVacateReason(event.target.value)}
            placeholder="Example: Semester completed / room change"
            rows={3}
          />
          <div className="flex justify-end gap-2 border-t border-[#F2ECF8] pt-4">
            <Button variant="secondary" onClick={() => setVacateTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={vacating} onClick={handleVacate}>
              Vacate room
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AllocationsPage;
