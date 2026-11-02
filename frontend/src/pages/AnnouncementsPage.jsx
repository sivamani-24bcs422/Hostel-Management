import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CalendarClock,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  SearchX,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import announcementService from '../services/announcementService';
import hostelService from '../services/hostelService';
import { formatDate, formatDateTime, getErrorMessage, timeAgo, titleCase } from '../utils/format';
import { announcementAudienceOptions, announcementPriorityOptions } from '../utils/options';
import { toDateInput } from '../utils/form';
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
import EmptyState from '../components/ui/EmptyState';
import DetailItem from '../components/ui/DetailItem';
import clsx from 'clsx';

const priorityTone = {
  urgent: 'border-tomato-200 bg-tomato-50/60',
  high: 'border-amber-200 bg-amber-50/60',
  normal: 'border-[#F0EAF6] bg-white',
};

const emptyForm = {
  title: '',
  content: '',
  audience: 'all',
  hostel: '',
  priority: 'normal',
  expiresAt: '',
  isActive: true,
};

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const isAdmin = user?.role === 'admin';
  const isWarden = user?.role === 'warden';
  const canPublish = isAdmin || isWarden;

  const [announcements, setAnnouncements] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [filters, setFilters] = useState({ q: '', audience: '', priority: '' });
  const debouncedSearch = useDebounce(filters.q, 350);
  const [hostels, setHostels] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await announcementService.list({
        q: debouncedSearch || undefined,
        audience: filters.audience || undefined,
        priority: filters.priority || undefined,
        page,
        limit,
        sortBy: 'createdAt',
        order: 'desc',
      });
      setAnnouncements(result.data || []);
      setPagination(result.pagination || { page, pages: 1, total: 0 });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.audience, filters.priority, page, limit]);

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
  }, [debouncedSearch, filters.audience, filters.priority]);

  const audienceOptions = useMemo(
    () => (isWarden ? announcementAudienceOptions.filter((option) => option.value !== 'all' && option.value !== 'wardens') : announcementAudienceOptions),
    [isWarden]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, audience: isWarden ? 'students' : 'all' });
    setModalOpen(true);
  };

  const openEdit = (announcement) => {
    setEditing(announcement);
    setForm({
      title: announcement.title || '',
      content: announcement.content || '',
      audience: announcement.audience || 'all',
      hostel: announcement.hostel?._id || '',
      priority: announcement.priority || 'normal',
      expiresAt: toDateInput(announcement.expiresAt),
      isActive: announcement.isActive !== false,
    });
    setModalOpen(true);
  };

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const canManage = (announcement) => {
    if (isAdmin) return true;
    if (!isWarden) return false;
    const publisherId = announcement.publishedBy?._id || announcement.publishedBy;
    return String(publisherId) === String(user?._id);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.title.trim().length < 3 || form.content.trim().length < 5) {
      toast.error('Add a title and announcement content before publishing.', 'Missing details');
      return;
    }
    if (form.audience === 'hostel' && isAdmin && !form.hostel) {
      toast.error('Select the hostel this announcement is for.', 'Missing hostel');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        expiresAt: form.expiresAt || null,
      };
      if (editing) {
        await announcementService.update(editing._id, payload);
        toast.success('Announcement updated successfully.');
      } else {
        await announcementService.create(payload);
        toast.success('Announcement published successfully.');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not save announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (announcement) => {
    const approved = await confirm({
      title: 'Delete announcement?',
      message: `Delete "${announcement.title}"? Students and wardens will no longer see it.`,
      confirmText: 'Delete announcement',
      tone: 'danger',
    });
    if (!approved) return;
    try {
      await announcementService.remove(announcement._id);
      toast.success('Announcement deleted.');
      if (announcements.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Delete failed');
    }
  };

  const audienceLabel = (value) =>
    announcementAudienceOptions.find((option) => option.value === value)?.label || titleCase(value);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Hostel noticeboard"
        title="Announcements"
        subtitle={
          canPublish
            ? 'Publish notices for everyone, students, wardens or a specific hostel and keep the community informed.'
            : 'Important notices, updates and reminders from the hostel office and your warden.'
        }
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load} loading={loading}>
              Refresh
            </Button>
            {canPublish ? (
              <Button size="sm" icon={Plus} onClick={openCreate}>
                New announcement
              </Button>
            ) : null}
          </>
        }
      />

      <div className="card mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <SearchInput
          value={filters.q}
          onChange={(value) => setFilters((current) => ({ ...current, q: value }))}
          placeholder="Search announcements..."
        />
        <Select
          value={filters.audience}
          onChange={(event) => setFilters((current) => ({ ...current, audience: event.target.value }))}
          placeholder="All audiences"
          options={announcementAudienceOptions}
          containerClassName="w-full sm:w-40"
        />
        <Select
          value={filters.priority}
          onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
          placeholder="All priorities"
          options={announcementPriorityOptions}
          containerClassName="w-full sm:w-36"
        />
      </div>

      {error ? (
        <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
          <p className="text-sm font-semibold text-tomato-600">{error}</p>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load}>
            Try again
          </Button>
        </div>
      ) : loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-3xl bg-white/80" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Megaphone}
            title="No announcements yet"
            description={canPublish ? 'Publish your first notice to keep residents informed.' : 'Notices from your hostel team will appear here.'}
            action={canPublish ? <Button size="sm" icon={Plus} onClick={openCreate}>New announcement</Button> : null}
          />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {announcements.map((announcement) => (
            <article
              key={announcement._id}
              className={clsx(
                'group relative flex flex-col rounded-3xl border p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-float',
                priorityTone[announcement.priority] || priorityTone.normal
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lavender-50 text-lavender-600">
                    <BellRing size={16} />
                  </span>
                  <Badge status={announcement.priority} dot />
                </div>
                <span className="text-[9px] font-semibold text-[#A79CB1]">{timeAgo(announcement.createdAt)}</span>
              </div>

              <button type="button" onClick={() => setDetails(announcement)} className="mt-3 text-left">
                <h3 className="line-clamp-2 text-[14px] font-extrabold leading-5 text-ink transition group-hover:text-lavender-700">
                  {announcement.title}
                </h3>
                <p className="mt-1.5 line-clamp-3 text-[11px] leading-5 text-muted">{announcement.content}</p>
              </button>

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-black/5 pt-3 text-[9px] font-semibold text-[#978BA1]">
                <span className="inline-flex items-center gap-1">
                  <Users size={11} />
                  {announcement.audience === 'hostel' ? announcement.hostel?.name || 'Hostel' : audienceLabel(announcement.audience)}
                </span>
                <span>{announcement.publishedBy?.name || 'Hostel office'}</span>
              </div>

              {announcement.expiresAt ? (
                <p className="mt-2 inline-flex items-center gap-1 text-[9px] font-semibold text-[#A79CB1]">
                  <CalendarClock size={10} /> Expires {formatDate(announcement.expiresAt)}
                </p>
              ) : null}

              {canManage(announcement) ? (
                <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <Button variant="ghost" size="icon" className="bg-white/80" onClick={() => openEdit(announcement)} title="Edit announcement">
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="bg-white/80 text-tomato-600" onClick={() => handleDelete(announcement)} title="Delete announcement">
                    <Trash2 size={14} />
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {!loading && announcements.length > 0 ? (
        <div className="card mt-4 overflow-hidden">
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
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit announcement' : 'Publish an announcement'}
        subtitle="Choose who should see this notice and how urgently it should be highlighted."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Title" value={form.title} onChange={(event) => setField('title', event.target.value)} placeholder="Example: Water supply maintenance on Saturday" required />
          <Textarea
            label="Announcement content"
            value={form.content}
            onChange={(event) => setField('content', event.target.value)}
            rows={6}
            placeholder="Write the full notice here..."
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Audience"
              value={form.audience}
              onChange={(event) => setField('audience', event.target.value)}
              options={audienceOptions}
            />
            {isAdmin && form.audience === 'hostel' ? (
              <Select
                label="Hostel"
                value={form.hostel}
                onChange={(event) => setField('hostel', event.target.value)}
                placeholder="Select hostel"
                options={hostels.map((hostel) => ({ value: hostel._id, label: hostel.name }))}
                required
              />
            ) : (
              <Select
                label="Priority"
                value={form.priority}
                onChange={(event) => setField('priority', event.target.value)}
                options={announcementPriorityOptions}
              />
            )}
            {isAdmin && form.audience === 'hostel' ? (
              <Select
                label="Priority"
                value={form.priority}
                onChange={(event) => setField('priority', event.target.value)}
                options={announcementPriorityOptions}
              />
            ) : null}
            <Input label="Expires on (optional)" type="date" value={form.expiresAt} onChange={(event) => setField('expiresAt', event.target.value)} />
            {isAdmin ? (
              <Select
                label="Visibility"
                value={form.isActive ? 'active' : 'inactive'}
                onChange={(event) => setField('isActive', event.target.value === 'active')}
                options={[
                  { value: 'active', label: 'Published' },
                  { value: 'inactive', label: 'Hidden' },
                ]}
              />
            ) : null}
          </div>
          <div className="rounded-2xl bg-lavender-50/70 p-4 text-[11px] leading-5 text-[#5B4669]">
            {isWarden
              ? 'Wardens can publish to students or to their own hostel. Notices are visible to the selected audience immediately.'
              : 'Announcements are visible immediately. Set an expiry date to automatically hide time-sensitive notices.'}
          </div>
          <div className="flex justify-end gap-2 border-t border-[#F2ECF8] pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Publish announcement'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(details)}
        onClose={() => setDetails(null)}
        title={details?.title || 'Announcement'}
        subtitle={details ? `${details.publishedBy?.name || 'Hostel office'} · ${formatDateTime(details.createdAt)}` : ''}
        size="md"
      >
        {details ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge status={details.priority} dot />
              <Badge tone="purple">{audienceLabel(details.audience)}</Badge>
              {details.hostel ? <Badge tone="info">{details.hostel.name}</Badge> : null}
              {details.expiresAt ? <Badge tone="neutral">Expires {formatDate(details.expiresAt)}</Badge> : null}
            </div>
            <p className="whitespace-pre-line rounded-2xl bg-[#FCFAFE] p-4 text-[13px] leading-6 text-[#4B3A5A]">{details.content}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Published by" value={details.publishedBy?.name || 'Hostel office'} />
              <DetailItem label="Published on" value={formatDateTime(details.createdAt)} />
              <DetailItem label="Audience" value={details.audience === 'hostel' ? details.hostel?.name || 'Specific hostel' : audienceLabel(details.audience)} />
              <DetailItem label="Status" value={details.isActive === false ? 'Hidden' : 'Published'} />
            </div>
            {canManage(details) ? (
              <div className="flex justify-end gap-2 border-t border-[#F2ECF8] pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDetails(null);
                    openEdit(details);
                  }}
                  icon={Pencil}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  icon={Trash2}
                  onClick={() => {
                    setDetails(null);
                    handleDelete(details);
                  }}
                >
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default AnnouncementsPage;
