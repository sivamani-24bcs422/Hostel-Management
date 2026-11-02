import { useState } from 'react';
import {
  Building2,
  CalendarDays,
  GraduationCap,
  KeyRound,
  Mail,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import authService from '../services/authService';
import { formatDate, getErrorMessage, titleCase } from '../utils/format';
import PageHeader from '../components/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import DetailItem from '../components/ui/DetailItem';

const roleLabels = {
  admin: 'Administrator',
  warden: 'Hostel Warden',
  student: 'Resident Student',
};

const ProfilePage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const toast = useToast();

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  const setProfileField = (field, value) => setProfileForm((current) => ({ ...current, [field]: value }));
  const setPasswordField = (field, value) => setPasswordForm((current) => ({ ...current, [field]: value }));

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    if (profileForm.name.trim().length < 2) {
      toast.error('Enter your full name.', 'Missing details');
      return;
    }
    setSavingProfile(true);
    try {
      await authService.updateProfile({
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim(),
        avatar: profileForm.avatar.trim(),
      });
      await refreshProfile();
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Enter your current and new password.', 'Missing details');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.', 'Password too short');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match.', 'Passwords differ');
      return;
    }
    setSavingPassword(true);
    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully.');
    } catch (err) {
      toast.error(getErrorMessage(err), 'Could not change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const isStudent = user?.role === 'student';
  const isWarden = user?.role === 'warden';

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Account"
        title="My profile"
        subtitle="Manage your personal details, review your hostel profile and keep your account secure."
        actions={
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={refreshProfile}>
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="relative h-24 bg-gradient-to-r from-lavender-300 via-lavender-500 to-lavender-700">
              <div className="absolute -bottom-8 left-5">
                <Avatar name={user?.name} src={user?.avatar} size="xl" className="ring-4 ring-white" />
              </div>
            </div>
            <div className="px-5 pb-5 pt-12">
              <h2 className="text-lg font-extrabold tracking-tight text-ink">{user?.name}</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
                <Mail size={12} /> {user?.email}
              </p>
              {user?.phone ? (
                <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
                  <Phone size={12} /> {user.phone}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge status={user?.role} dot>{roleLabels[user?.role] || titleCase(user?.role)}</Badge>
                <Badge status={user?.isActive === false ? 'inactive' : 'active'} dot />
              </div>
              <div className="mt-4 border-t border-[#F2ECF8] pt-3 text-[10px] text-muted">
                Last login: {user?.lastLogin ? formatDate(user.lastLogin) : 'First session'}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-lavender-50 text-lavender-600">
                <ShieldCheck size={15} />
              </span>
              <h3 className="text-sm font-extrabold text-ink">Hostel profile</h3>
            </div>
            {profile ? (
              <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-1">
                {isStudent ? (
                  <>
                    <DetailItem label="Roll number" value={profile.rollNo} />
                    <DetailItem label="Course" value={profile.course} />
                    <DetailItem label="Year / semester" value={`Year ${profile.year}${profile.semester ? ` · ${profile.semester}` : ''}`} />
                    <DetailItem label="Hostel" value={profile.hostel?.name || 'Not allocated'} />
                    <DetailItem label="Room" value={profile.room?.roomNumber ? `Room ${profile.room.roomNumber}` : 'Not allocated'} />
                    <DetailItem label="Guardian" value={profile.guardianName} />
                    <DetailItem label="Guardian phone" value={profile.guardianPhone} />
                  </>
                ) : isWarden ? (
                  <>
                    <DetailItem label="Employee ID" value={profile.employeeId} />
                    <DetailItem label="Designation" value={profile.designation} />
                    <DetailItem label="Hostel" value={profile.hostel?.name || 'Unassigned'} />
                    <DetailItem label="Qualification" value={profile.qualification} />
                    <DetailItem label="Joining date" value={formatDate(profile.joiningDate)} />
                  </>
                ) : (
                  <p className="text-[12px] leading-6 text-muted">
                    Administrator accounts have campus-wide access to every hostel, student and finance module.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[12px] leading-6 text-muted">No additional profile details are attached to this account.</p>
            )}
          </div>
        </div>

        <div className="space-y-4 xl:col-span-2">
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-lime-100 text-lime-800">
                <UserRound size={15} />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-ink">Personal details</h3>
                <p className="text-[10px] text-muted">Update the name and contact information shown across the app.</p>
              </div>
            </div>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Full name" value={profileForm.name} onChange={(event) => setProfileField('name', event.target.value)} required />
                <Input label="Phone" value={profileForm.phone} onChange={(event) => setProfileField('phone', event.target.value)} placeholder="+91 98765 43210" />
                <Input
                  label="Avatar URL"
                  value={profileForm.avatar}
                  onChange={(event) => setProfileField('avatar', event.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  containerClassName="sm:col-span-2"
                  hint="Paste an image URL to personalise your avatar. Leave blank to use initials."
                />
                <Input label="Email address" value={user?.email || ''} disabled hint="Email changes are managed by the administrator." containerClassName="sm:col-span-2" />
              </div>
              <div className="flex justify-end border-t border-[#F2ECF8] pt-4">
                <Button type="submit" icon={Save} loading={savingProfile}>
                  Save profile
                </Button>
              </div>
            </form>
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-tomato-50 text-tomato-600">
                <KeyRound size={15} />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-ink">Change password</h3>
                <p className="text-[10px] text-muted">Use a strong password with at least 6 characters.</p>
              </div>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Current password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordField('currentPassword', event.target.value)}
                  containerClassName="sm:col-span-2"
                  required
                />
                <Input
                  label="New password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordField('newPassword', event.target.value)}
                  required
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordField('confirmPassword', event.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end border-t border-[#F2ECF8] pt-4">
                <Button type="submit" variant="dark" icon={KeyRound} loading={savingPassword}>
                  Update password
                </Button>
              </div>
            </form>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#F0EAF6] bg-[#FCFAFE] p-4">
              <GraduationCap size={18} className="text-lavender-600" />
              <p className="mt-2 text-[11px] font-extrabold text-ink">Role-based access</p>
              <p className="mt-0.5 text-[10px] leading-4 text-muted">You only see the modules and records your role permits.</p>
            </div>
            <div className="rounded-2xl border border-[#F0EAF6] bg-[#FCFAFE] p-4">
              <Building2 size={18} className="text-lavender-600" />
              <p className="mt-2 text-[11px] font-extrabold text-ink">Live hostel data</p>
              <p className="mt-0.5 text-[10px] leading-4 text-muted">Profile and dashboard data refresh directly from the hostel database.</p>
            </div>
            <div className="rounded-2xl border border-[#F0EAF6] bg-[#FCFAFE] p-4">
              <CalendarDays size={18} className="text-lavender-600" />
              <p className="mt-2 text-[11px] font-extrabold text-ink">Account secure</p>
              <p className="mt-0.5 text-[10px] leading-4 text-muted">Sessions expire automatically and passwords are hashed with bcrypt.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
