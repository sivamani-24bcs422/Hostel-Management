import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Eye,
  GraduationCap,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  SearchX,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import studentService from '../services/studentService';
import hostelService from '../services/hostelService';
import { formatDate, getErrorMessage } from '../utils/format';
import { genderOptions, studentStatusOptions } from '../utils/options';
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
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  rollNo: '',
  course: '',
  department: '',
  year: '1',
  semester: '',
  gender: 'male',
  dateOfBirth: '',
  bloodGroup: '',
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  admissionDate: toDateInput(new Date()),
  status: 'active',
  notes: '',
};

const StudentsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const isAdmin = user?.role === 'admin';

  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState({ sortBy: 'createdAt', order: 'desc' });
  const [filters, setFilters] = useState({ q: '', hostel: '', status: '', gender: '' });
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
      const result = await studentService.list({
        q: debouncedSearch || undefined,
        hostel: filters.hostel || undefined,
        status: filters.status || undefined,
        gender: filters.gender || undefined,
        page,
        limit,
        sortBy: sort.sortBy,
        order: sort.order,
      });
      setStudents(result.data || []);
      setPagination(result.pagination || { page, pages: 1, total: 0, limit });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.hostel, filters.status, filters.gender, page, limit, sort.sortBy, sort.order]);

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
  }, [debouncedSearch, filters.hostel, filters.status, filters.gender]);

  const handleSort = (sortBy) => {
    setSort((current) => ({
      sortBy,
      order: current.sortBy === sortBy && current.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, admissionDate: toDateInput(new Date()) });
    setModalOpen(true);
  };

  const openEdit = (student) => {
    setEditing(student);
    setForm({
      name: student.user?.name || '',
      email: student.user?.email || '',
      password: '',
      phone: student.user?.phone || '',
      rollNo: student.rollNo || '',
      course: student.course || '',
      department: student.department || '',
      year: String(student.year || 1),
      semester: student.semester || '',
      gender: student.gender || 'male',
      dateOfBirth: toDateInput(student.dateOfBirth),
      bloodGroup: student.bloodGroup || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      guardianEmail: student.guardianEmail || '',
      address: student.address || '',
      city: student.city || '',
      state: student.state || '',
      pincode: student.pincode || '',
      admissionDate: toDateInput(student.admissionDate),
      status: student.status || 'active',
      notes: student.notes || '',
    });
    setModalOpen(true);
  };

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.rollNo.trim() || !form.course.trim()) {
      toast.error('Name, email, roll number and course are required.', 'Missing details');
      return;
    }
    if (!form.guardianName.trim() || !form.guardianPhone.trim()) {
      toast.error('Guardian name and phone are required.', 'Missing details');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        year: Number(form.year),
        password: form.password || undefined,
        dateOfBirth: form.dateOfBirth || null,
        admissionDate: form.admissionDate || undefined,
      };
      if (editing) {
        await studentService.update(editing._id, payload);
        toast.success(`${form.name} was updated successfully.`);
      } else {
        await studentService.create(payload);
        toast.success(`${form.name} was added to the hostel register.`);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not save student');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student) => {
    const approved = await confirm({
      title: 'Delete student record?',
      message: `This will permanently remove ${student.user?.name || 'this student'} and all related fees, payments, attendance, complaints and visitor records.`,
      confirmText: 'Delete student',
      tone: 'danger',
    });
    if (!approved) return;
    try {
      await studentService.remove(student._id);
      toast.success('Student and related records were deleted.');
      if (students.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Delete failed');
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'student',
        header: 'Student',
        render: (row) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.user?.name} src={row.user?.avatar} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[12px] font-extrabold text-ink">{row.user?.name || 'Unnamed student'}</p>
              <p className="truncate text-[10px] text-muted">{row.user?.email}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'rollNo',
        header: 'Roll / Course',
        sortKey: 'rollNo',
        render: (row) => (
          <div>
            <p className="text-[12px] font-extrabold text-ink">{row.rollNo}</p>
            <p className="text-[10px] text-muted">
              {row.course} · Year {row.year}
            </p>
          </div>
        ),
      },
      {
        key: 'hostel',
        header: 'Residence',
        render: (row) => (
          <div>
            <p className="text-[12px] font-semibold text-ink">{row.hostel?.name || 'Not allocated'}</p>
            <p className="text-[10px] text-muted">{row.room?.roomNumber ? `Room ${row.room.roomNumber}` : 'No room'}</p>
          </div>
        ),
      },
      {
        key: 'guardianName',
        header: 'Guardian',
        render: (row) => (
          <div>
            <p className="text-[12px] font-semibold text-ink">{row.guardianName}</p>
            <p className="text-[10px] text-muted">{row.guardianPhone}</p>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortKey: 'status',
        render: (row) => <Badge status={row.status} dot />,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => setDetails(row)} title="View details">
              <Eye size={15} />
            </Button>
            {isAdmin ? (
              <>
                <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit student">
                  <Pencil size={15} />
                </Button>
                <Button variant="ghost" size="icon" className="text-tomato-600" onClick={() => handleDelete(row)} title="Delete student">
                  <Trash2 size={15} />
                </Button>
              </>
            ) : null}
          </div>
        ),
      },
    ],
    [isAdmin, students.length, page]
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Resident directory"
        title="Students"
        subtitle={
          isAdmin
            ? 'Manage every student record, guardian contact and residence assignment across campus.'
            : 'Browse the students living in your assigned hostel.'
        }
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load} loading={loading}>
              Refresh
            </Button>
            {isAdmin ? (
              <Button size="sm" icon={Plus} onClick={openCreate}>
                Add student
              </Button>
            ) : null}
          </>
        }
      />

      <div className="card mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <SearchInput value={filters.q} onChange={(value) => setFilters((current) => ({ ...current, q: value }))} placeholder="Search name, roll no, course..." />
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
          options={studentStatusOptions}
          containerClassName="w-full sm:w-40"
        />
        <Select
          value={filters.gender}
          onChange={(event) => setFilters((current) => ({ ...current, gender: event.target.value }))}
          placeholder="All genders"
          options={genderOptions}
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
      ) : (
        <div className="card overflow-hidden">
          <DataTable
            columns={columns}
            data={students}
            loading={loading}
            sortBy={sort.sortBy}
            sortOrder={sort.order}
            onSort={handleSort}
            emptyIcon={SearchX}
            emptyTitle="No students found"
            emptyDescription="Try a different search or filter, or add a new student."
            emptyAction={isAdmin ? <Button size="sm" icon={Plus} onClick={openCreate}>Add student</Button> : null}
          />
          {!loading && students.length > 0 ? (
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
        title={editing ? 'Edit student' : 'Add a new student'}
        subtitle={editing ? 'Update personal, academic and guardian information.' : 'Create a student login and hostel record in one step.'}
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
          </div>

          <div className="border-t border-[#F2ECF8] pt-4">
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-lavender-600">Academic details</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Roll number" value={form.rollNo} onChange={(event) => setField('rollNo', event.target.value)} required />
              <Input label="Course" value={form.course} onChange={(event) => setField('course', event.target.value)} required />
              <Input label="Department" value={form.department} onChange={(event) => setField('department', event.target.value)} />
              <Select label="Year" value={form.year} onChange={(event) => setField('year', event.target.value)} options={[1, 2, 3, 4, 5, 6].map((year) => ({ value: String(year), label: `Year ${year}` }))} />
              <Input label="Semester" value={form.semester} onChange={(event) => setField('semester', event.target.value)} placeholder="e.g. 3rd" />
              <Select label="Gender" value={form.gender} onChange={(event) => setField('gender', event.target.value)} options={genderOptions} />
              <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={(event) => setField('dateOfBirth', event.target.value)} />
              <Input label="Blood group" value={form.bloodGroup} onChange={(event) => setField('bloodGroup', event.target.value)} placeholder="e.g. O+" />
              <Input label="Admission date" type="date" value={form.admissionDate} onChange={(event) => setField('admissionDate', event.target.value)} />
            </div>
          </div>

          <div className="border-t border-[#F2ECF8] pt-4">
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-lavender-600">Guardian & contact</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Guardian name" value={form.guardianName} onChange={(event) => setField('guardianName', event.target.value)} required />
              <Input label="Guardian phone" value={form.guardianPhone} onChange={(event) => setField('guardianPhone', event.target.value)} required />
              <Input label="Guardian email" type="email" value={form.guardianEmail} onChange={(event) => setField('guardianEmail', event.target.value)} />
              <Input label="Address" containerClassName="sm:col-span-2 lg:col-span-3" value={form.address} onChange={(event) => setField('address', event.target.value)} />
              <Input label="City" value={form.city} onChange={(event) => setField('city', event.target.value)} />
              <Input label="State" value={form.state} onChange={(event) => setField('state', event.target.value)} />
              <Input label="Pincode" value={form.pincode} onChange={(event) => setField('pincode', event.target.value)} />
              <Select label="Status" value={form.status} onChange={(event) => setField('status', event.target.value)} options={studentStatusOptions} />
            </div>
          </div>

          <Textarea label="Notes" value={form.notes} onChange={(event) => setField('notes', event.target.value)} placeholder="Any additional information about this student..." rows={3} />

          <div className="flex justify-end gap-2 border-t border-[#F2ECF8] pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Create student'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(details)}
        onClose={() => setDetails(null)}
        title={details?.user?.name || 'Student details'}
        subtitle={details ? `${details.rollNo} · ${details.course}` : ''}
        size="lg"
      >
        {details ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-2xl bg-lavender-50/70 p-4">
              <Avatar name={details.user?.name} src={details.user?.avatar} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold text-ink">{details.user?.name}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <Mail size={12} /> {details.user?.email}
                </p>
                {details.user?.phone ? (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                    <Phone size={12} /> {details.user.phone}
                  </p>
                ) : null}
              </div>
              <Badge status={details.status} dot />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Roll number" value={details.rollNo} />
              <DetailItem label="Course" value={details.course} />
              <DetailItem label="Department" value={details.department} />
              <DetailItem label="Year / semester" value={`Year ${details.year}${details.semester ? ` · ${details.semester}` : ''}`} />
              <DetailItem label="Gender" value={details.gender} className="capitalize" />
              <DetailItem label="Date of birth" value={formatDate(details.dateOfBirth)} />
              <DetailItem label="Blood group" value={details.bloodGroup} />
              <DetailItem label="Hostel" value={details.hostel?.name || 'Not allocated'} />
              <DetailItem label="Room" value={details.room?.roomNumber ? `Room ${details.room.roomNumber}` : 'No room'} />
              <DetailItem label="Guardian" value={details.guardianName} />
              <DetailItem label="Guardian phone" value={details.guardianPhone} />
              <DetailItem label="Guardian email" value={details.guardianEmail} />
              <DetailItem label="Address" value={details.address} className="sm:col-span-2" />
              <DetailItem label="City / state" value={[details.city, details.state].filter(Boolean).join(', ')} />
              <DetailItem label="Pincode" value={details.pincode} />
              <DetailItem label="Admission date" value={formatDate(details.admissionDate)} />
              <DetailItem label="Notes" value={details.notes} className="sm:col-span-2 lg:col-span-3" />
            </div>
          </div>
        ) : null}
      </Modal>

      {loading && !students.length ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2">
          <span className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white shadow-float">
            <Spinner size={14} className="text-lime-400" /> Loading students
          </span>
        </div>
      ) : null}
    </div>
  );
};

export default StudentsPage;
