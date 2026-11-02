import { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  Eye,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  SearchX,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import hostelService from '../services/hostelService';
import { formatCurrency, formatNumber, getErrorMessage, titleCase } from '../utils/format';
import { hostelStatusOptions, hostelTypeOptions } from '../utils/options';
import { joinFacilities, splitFacilities } from '../utils/form';
import useDebounce from '../hooks/useDebounce';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/ui/Pagination';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';

const emptyForm = {
  name: '',
  code: '',
  type: 'boys',
  address: '',
  city: '',
  totalFloors: '1',
  facilities: '',
  description: '',
  status: 'active',
};

const HostelsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const isAdmin = user?.role === 'admin';

  const [hostels, setHostels] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [filters, setFilters] = useState({ q: '', status: '', type: '' });
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
      const result = await hostelService.list({
        q: debouncedSearch || undefined,
        status: filters.status || undefined,
        type: filters.type || undefined,
        page,
        limit,
      });
      setHostels(result.data || []);
      setPagination(result.pagination || { page, pages: 1, total: 0 });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.status, filters.type, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.status, filters.type]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (hostel) => {
    setEditing(hostel);
    setForm({
      name: hostel.name || '',
      code: hostel.code || '',
      type: hostel.type || 'boys',
      address: hostel.address || '',
      city: hostel.city || '',
      totalFloors: String(hostel.totalFloors || 1),
      facilities: joinFacilities(hostel.facilities),
      description: hostel.description || '',
      status: hostel.status || 'active',
    });
    setModalOpen(true);
  };

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.code.trim() || !form.address.trim()) {
      toast.error('Name, code and address are required.', 'Missing details');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        totalFloors: Number(form.totalFloors) || 1,
        facilities: splitFacilities(form.facilities),
      };
      if (editing) {
        await hostelService.update(editing._id, payload);
        toast.success(`${form.name} was updated successfully.`);
      } else {
        await hostelService.create(payload);
        toast.success(`${form.name} was created successfully.`);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not save hostel');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (hostel) => {
    const approved = await confirm({
      title: 'Delete hostel?',
      message: `Delete ${hostel.name}? Rooms must be removed before a hostel can be deleted.`,
      confirmText: 'Delete hostel',
      tone: 'danger',
    });
    if (!approved) return;
    try {
      await hostelService.remove(hostel._id);
      toast.success('Hostel deleted successfully.');
      if (hostels.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Delete failed');
    }
  };

  const openDetails = async (hostel) => {
    setDetails(hostel);
    setDetailsLoading(true);
    try {
      const result = await hostelService.get(hostel._id);
      setDetails(result.data);
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not load hostel');
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Campus residences"
        title="Hostels"
        subtitle={isAdmin ? 'Manage hostels, facilities and live occupancy across your campus.' : 'Your assigned hostel, live occupancy and room overview.'}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load} loading={loading}>
              Refresh
            </Button>
            {isAdmin ? (
              <Button size="sm" icon={Plus} onClick={openCreate}>
                Add hostel
              </Button>
            ) : null}
          </>
        }
      />

      <div className="card mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <SearchInput value={filters.q} onChange={(value) => setFilters((current) => ({ ...current, q: value }))} placeholder="Search hostel, code or city..." />
        <Select
          value={filters.type}
          onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
          placeholder="All types"
          options={hostelTypeOptions}
          containerClassName="w-full sm:w-36"
        />
        <Select
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          placeholder="All statuses"
          options={hostelStatusOptions}
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
      ) : loading && !hostels.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-3xl bg-white/75" />
          ))}
        </div>
      ) : hostels.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={SearchX}
            title="No hostels found"
            description="Try a different search or filter, or create your first hostel."
            action={isAdmin ? <Button size="sm" icon={Plus} onClick={openCreate}>Add hostel</Button> : null}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {hostels.map((hostel) => (
            <Card key={hostel._id} hover className="overflow-hidden">
              <div className="relative overflow-hidden bg-ink p-5 text-white">
                <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-lavender-500/25 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-10 left-8 h-24 w-24 rounded-full bg-lime-400/10 blur-2xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                      <Building2 size={20} className="text-lime-300" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-extrabold leading-tight">{hostel.name}</h3>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-lavender-200">
                        {hostel.code} · {titleCase(hostel.type)}
                      </p>
                    </div>
                  </div>
                  <Badge tone={hostel.status === 'active' ? 'success' : hostel.status === 'maintenance' ? 'warning' : 'neutral'}>
                    {titleCase(hostel.status)}
                  </Badge>
                </div>
                <p className="relative mt-4 flex items-start gap-1.5 text-[10px] leading-4 text-lavender-100/60">
                  <MapPin size={12} className="mt-0.5 shrink-0" />
                  {[hostel.address, hostel.city].filter(Boolean).join(', ')}
                </p>
              </div>

              <div className="p-5">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">Bed occupancy</p>
                    <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
                      {hostel.stats?.occupiedBeds || 0}
                      <span className="text-sm font-bold text-muted"> / {hostel.stats?.totalBeds || 0}</span>
                    </p>
                  </div>
                  <span className="rounded-full bg-lime-50 px-2.5 py-1 text-[10px] font-extrabold text-lime-800">
                    {hostel.stats?.occupancyRate || 0}%
                  </span>
                </div>
                <ProgressBar value={hostel.stats?.occupancyRate} color="lime" className="mt-3" />

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-[#FCFAFE] p-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-muted">Rooms</p>
                    <p className="mt-0.5 text-sm font-extrabold text-ink">{hostel.stats?.totalRooms || 0}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-muted">Free beds</p>
                    <p className="mt-0.5 text-sm font-extrabold text-ink">{hostel.stats?.availableBeds || 0}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-muted">Floors</p>
                    <p className="mt-0.5 text-sm font-extrabold text-ink">{hostel.totalFloors || 1}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-lavender-50 text-lavender-600">
                    <ShieldCheck size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-ink">{hostel.warden?.user?.name || 'No warden assigned'}</p>
                    <p className="text-[9px] text-muted">{hostel.warden?.user?.phone || 'Assign a warden to this hostel'}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#F3EEF8] pt-3">
                  <Button variant="ghost" size="xs" icon={Eye} onClick={() => openDetails(hostel)}>
                    View hostel
                  </Button>
                  {isAdmin ? (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(hostel)} title="Edit hostel">
                        <Pencil size={15} />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-tomato-600" onClick={() => handleDelete(hostel)} title="Delete hostel">
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && hostels.length > 0 && pagination.pages > 1 ? (
        <div className="card mt-4">
          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            limit={limit}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit hostel' : 'Add a new hostel'}
        subtitle="Set the residence identity, capacity and facilities."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Hostel name" value={form.name} onChange={(event) => setField('name', event.target.value)} required />
            <Input label="Hostel code" value={form.code} onChange={(event) => setField('code', event.target.value)} required placeholder="e.g. ABH" />
            <Select label="Type" value={form.type} onChange={(event) => setField('type', event.target.value)} options={hostelTypeOptions} />
            <Input label="Total floors" type="number" min="1" value={form.totalFloors} onChange={(event) => setField('totalFloors', event.target.value)} />
            <Input label="City" value={form.city} onChange={(event) => setField('city', event.target.value)} />
            <Select label="Status" value={form.status} onChange={(event) => setField('status', event.target.value)} options={hostelStatusOptions} />
            <Input label="Address" containerClassName="sm:col-span-2" value={form.address} onChange={(event) => setField('address', event.target.value)} required />
            <Input
              label="Facilities"
              containerClassName="sm:col-span-2"
              value={form.facilities}
              onChange={(event) => setField('facilities', event.target.value)}
              placeholder="Wi-Fi, Laundry, Mess, Gym"
              hint="Separate facilities with commas."
            />
          </div>
          <Textarea label="Description" value={form.description} onChange={(event) => setField('description', event.target.value)} rows={3} />
          <div className="flex justify-end gap-2 border-t border-[#F2ECF8] pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Create hostel'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(details)}
        onClose={() => setDetails(null)}
        title={details?.name || 'Hostel details'}
        subtitle={details ? `${details.code} · ${titleCase(details.type)} hostel` : ''}
        size="lg"
      >
        {details ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { label: 'Rooms', value: details.stats?.totalRooms || 0 },
                { label: 'Beds', value: details.stats?.totalBeds || 0 },
                { label: 'Occupied', value: details.stats?.occupiedBeds || 0 },
                { label: 'Occupancy', value: `${details.stats?.occupancyRate || 0}%` },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-[#FCFAFE] p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-muted">{item.label}</p>
                  <p className="mt-1 text-lg font-extrabold text-ink">{item.value}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">Warden</p>
              <p className="mt-1 text-sm font-bold text-ink">{details.warden?.user?.name || 'No warden assigned'}</p>
              <p className="text-xs text-muted">{details.warden?.user?.email || details.warden?.user?.phone || ''}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">Facilities</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(details.facilities || []).length ? (
                  details.facilities.map((facility) => (
                    <span key={facility} className="rounded-full bg-lavender-50 px-2.5 py-1 text-[10px] font-bold text-lavender-700">
                      {facility}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-muted">No facilities listed.</p>
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">Rooms</p>
                <span className="text-[10px] font-semibold text-muted">{(details.rooms || []).length} rooms</span>
              </div>
              {detailsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner />
                </div>
              ) : (details.rooms || []).length ? (
                <div className="overflow-hidden rounded-2xl border border-[#F0EAF6]">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-[12px]">
                      <thead className="sticky top-0 bg-[#FCFAFE]">
                        <tr className="border-b border-[#F0EAF6]">
                          <th className="px-3 py-2 text-[9px] font-extrabold uppercase tracking-wide text-muted">Room</th>
                          <th className="px-3 py-2 text-[9px] font-extrabold uppercase tracking-wide text-muted">Type</th>
                          <th className="px-3 py-2 text-[9px] font-extrabold uppercase tracking-wide text-muted">Beds</th>
                          <th className="px-3 py-2 text-[9px] font-extrabold uppercase tracking-wide text-muted">Rent</th>
                          <th className="px-3 py-2 text-[9px] font-extrabold uppercase tracking-wide text-muted">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(details.rooms || []).map((room) => (
                          <tr key={room._id} className="border-b border-[#F6F2F9] last:border-0">
                            <td className="px-3 py-2 font-bold text-ink">{room.roomNumber}</td>
                            <td className="px-3 py-2 capitalize text-muted">{room.type}</td>
                            <td className="px-3 py-2 text-muted">{room.occupied}/{room.capacity}</td>
                            <td className="px-3 py-2 text-muted">{formatCurrency(room.rent)}</td>
                            <td className="px-3 py-2"><Badge status={room.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="rounded-2xl bg-[#FCFAFE] p-4 text-xs text-muted">No rooms have been added to this hostel yet.</p>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-lime-50 p-3 text-[11px] font-semibold text-lime-800">
              <Users size={15} /> {formatNumber(details.stats?.availableBeds || 0)} beds are currently available.
              <span className="ml-auto flex items-center gap-1 text-[10px] text-lime-700">
                <Building2 size={12} /> Capacity {formatNumber(details.capacity || details.stats?.totalBeds || 0)}
              </span>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default HostelsPage;
