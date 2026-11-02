import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, Settings, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';

const titles = {
  '/': 'Dashboard',
  '/students': 'Student Management',
  '/wardens': 'Warden Management',
  '/hostels': 'Hostel Management',
  '/rooms': 'Room Management',
  '/allocations': 'Room Allocations',
  '/fees': 'Fees & Charges',
  '/payments': 'Payments',
  '/attendance': 'Attendance',
  '/complaints': 'Complaints',
  '/visitors': 'Visitors',
  '/announcements': 'Announcements',
  '/reports': 'Reports & Analytics',
  '/profile': 'My Profile',
};

const roleLabels = { admin: 'Administrator', warden: 'Warden', student: 'Student' };

const Topbar = ({ onMenu }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#EFE9F5]/80 bg-white/75 backdrop-blur-xl">
      <div className="flex h-[76px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenu}
            className="rounded-xl border border-[#E8E1F0] bg-white p-2 text-muted transition hover:border-lavender-300 hover:text-lavender-700 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={19} />
          </button>
          <div className="min-w-0">
            <p className="hidden text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#A79CB1] sm:block">
              HostelHub / {roleLabels[user?.role]}
            </p>
            <h2 className="truncate text-[15px] font-extrabold tracking-tight text-ink sm:text-base">
              {titles[location.pathname] || 'HostelHub'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden rounded-xl border border-[#EFE9F5] bg-white px-3 py-2 md:block">
            <p className="text-[10px] font-bold text-muted">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <Link
            to="/announcements"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#EFE9F5] bg-white text-muted transition hover:border-lavender-300 hover:text-lavender-700"
            aria-label="View announcements"
            title="Announcements"
          >
            <Bell size={18} />
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-tomato-500 ring-2 ring-white" />
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="flex items-center gap-2.5 rounded-2xl border border-[#EFE9F5] bg-white py-1.5 pl-1.5 pr-2.5 transition hover:border-lavender-300"
            >
              <Avatar name={user?.name} src={user?.avatar} size="sm" />
              <div className="hidden text-left sm:block">
                <p className="max-w-[120px] truncate text-[12px] font-extrabold leading-tight text-ink">{user?.name}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted">{roleLabels[user?.role]}</p>
              </div>
              <ChevronDown size={14} className="text-muted" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-[#EFE9F5] bg-white shadow-float animate-scale-in">
                <div className="border-b border-[#F3EEF8] px-4 py-3">
                  <p className="text-sm font-extrabold text-ink">{user?.name}</p>
                  <p className="truncate text-[11px] text-muted">{user?.email}</p>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-lavender-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-lavender-700">
                    <ShieldCheck size={11} />
                    {roleLabels[user?.role]}
                  </div>
                </div>
                <div className="p-1.5">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#4B3A5A] transition hover:bg-lavender-50"
                  >
                    <Settings size={15} /> Profile & settings
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-tomato-600 transition hover:bg-tomato-50"
                  >
                    <LogOut size={15} /> Log out
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
