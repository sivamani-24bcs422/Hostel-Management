import { NavLink, useLocation } from 'react-router-dom';
import {
  BadgeIndianRupee,
  BedDouble,
  BellRing,
  Building2,
  ClipboardCheck,
  CreditCard,
  FileBarChart2,
  Home,
  LayoutDashboard,
  MessageSquareWarning,
  Users,
  UserSquare2,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';

const navByRole = {
  admin: [
    {
      label: 'Workspace',
      items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard }],
    },
    {
      label: 'Operations',
      items: [
        { label: 'Students', to: '/students', icon: Users },
        { label: 'Wardens', to: '/wardens', icon: UserSquare2 },
        { label: 'Hostels', to: '/hostels', icon: Building2 },
        { label: 'Rooms', to: '/rooms', icon: BedDouble },
        { label: 'Allocations', to: '/allocations', icon: Home },
      ],
    },
    {
      label: 'Finance',
      items: [
        { label: 'Fees', to: '/fees', icon: BadgeIndianRupee },
        { label: 'Payments', to: '/payments', icon: CreditCard },
      ],
    },
    {
      label: 'Community',
      items: [
        { label: 'Attendance', to: '/attendance', icon: ClipboardCheck },
        { label: 'Complaints', to: '/complaints', icon: MessageSquareWarning },
        { label: 'Visitors', to: '/visitors', icon: Users },
        { label: 'Announcements', to: '/announcements', icon: BellRing },
      ],
    },
    {
      label: 'Insights',
      items: [{ label: 'Reports', to: '/reports', icon: FileBarChart2 }],
    },
  ],
  warden: [
    {
      label: 'Workspace',
      items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard }],
    },
    {
      label: 'My Hostel',
      items: [
        { label: 'Students', to: '/students', icon: Users },
        { label: 'Rooms', to: '/rooms', icon: BedDouble },
        { label: 'Allocations', to: '/allocations', icon: Home },
      ],
    },
    {
      label: 'Community',
      items: [
        { label: 'Attendance', to: '/attendance', icon: ClipboardCheck },
        { label: 'Complaints', to: '/complaints', icon: MessageSquareWarning },
        { label: 'Visitors', to: '/visitors', icon: Users },
        { label: 'Announcements', to: '/announcements', icon: BellRing },
      ],
    },
  ],
  student: [
    {
      label: 'My Space',
      items: [
        { label: 'Dashboard', to: '/', icon: LayoutDashboard },
        { label: 'My Room', to: '/allocations', icon: BedDouble },
        { label: 'My Fees', to: '/fees', icon: BadgeIndianRupee },
        { label: 'Payment History', to: '/payments', icon: CreditCard },
      ],
    },
    {
      label: 'Hostel Life',
      items: [
        { label: 'My Attendance', to: '/attendance', icon: ClipboardCheck },
        { label: 'Complaints', to: '/complaints', icon: MessageSquareWarning },
        { label: 'Announcements', to: '/announcements', icon: BellRing },
      ],
    },
  ],
};

const roleLabels = {
  admin: 'Administrator',
  warden: 'Hostel Warden',
  student: 'Resident Student',
};

const Sidebar = ({ open, onClose }) => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const groups = navByRole[user?.role] || [];

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col border-r border-[#EFE9F5] bg-white/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-[#F3EEF8] px-5">
          <NavLink to="/" className="group flex items-center gap-3" onClick={onClose}>
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-lavender-300 via-lavender-400 to-lavender-600 shadow-[0_10px_24px_-12px_rgba(102,58,151,0.8)]">
              <Building2 size={21} className="text-white" strokeWidth={2.3} />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-lime-400" />
            </div>
            <div>
              <p className="text-[17px] font-extrabold leading-none tracking-[-0.04em] text-ink">HostelHub</p>
              <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.2em] text-lavender-500">Residence OS</p>
            </div>
          </NavLink>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted transition hover:bg-lavender-50 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group, groupIndex) => (
            <div key={group.label} className={groupIndex > 0 ? 'mt-5' : ''}>
              <p className="mb-1.5 px-3 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#A79CB1]">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={clsx('sidebar-link group relative', isActive && 'sidebar-link-active')}
                    >
                      {isActive ? <span className="absolute left-0 h-5 w-[3px] rounded-r-full bg-lime-400" /> : null}
                      <Icon
                        size={17}
                        strokeWidth={isActive ? 2.4 : 2}
                        className={clsx('transition-colors', isActive ? 'text-lavender-700' : 'text-[#9A8FA4] group-hover:text-lavender-600')}
                      />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-[#F3EEF8] p-3">
          <NavLink
            to="/profile"
            onClick={onClose}
            className={clsx(
              'flex items-center gap-3 rounded-2xl border border-transparent p-2.5 transition hover:border-lavender-100 hover:bg-lavender-50',
              location.pathname === '/profile' && 'border-lavender-100 bg-lavender-50'
            )}
          >
            <Avatar name={user?.name} src={user?.avatar} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-extrabold text-ink">{user?.name}</p>
              <p className="truncate text-[10px] font-semibold text-muted">{roleLabels[user?.role]}</p>
            </div>
            {profile?.hostel ? (
              <span className="rounded-md bg-lime-100 px-1.5 py-1 text-[8px] font-extrabold text-lime-800">
                {profile.hostel.code}
              </span>
            ) : null}
          </NavLink>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
