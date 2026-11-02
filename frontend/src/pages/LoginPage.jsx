import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/format';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import clsx from 'clsx';

const demoAccounts = [
  {
    role: 'Admin',
    email: 'admin@hostelhub.com',
    password: 'Admin@123',
    icon: ShieldCheck,
    tone: 'bg-lavender-100 text-lavender-700',
    description: 'Full system control',
  },
  {
    role: 'Warden',
    email: 'warden@hostelhub.com',
    password: 'Warden@123',
    icon: UserRound,
    tone: 'bg-lime-100 text-lime-800',
    description: 'Manage assigned hostel',
  },
  {
    role: 'Student',
    email: 'student@hostelhub.com',
    password: 'Student@123',
    icon: Building2,
    tone: 'bg-tomato-50 text-tomato-600',
    description: 'Personal resident view',
  },
];

const LoginPage = () => {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState('');

  const destination = location.state?.from || '/';

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address';
    if (!form.password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const signIn = async (email, password) => {
    const result = await login(email, password);
    toast.success(`Signed in as ${result.user.name}`, 'Welcome back');
    navigate(destination, { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await signIn(form.email.trim(), form.password);
    } catch (error) {
      toast.error(getErrorMessage(error), 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (account) => {
    setDemoLoading(account.email);
    setForm({ email: account.email, password: account.password });
    setErrors({});
    try {
      await signIn(account.email, account.password);
    } catch (error) {
      toast.error(getErrorMessage(error), 'Demo login failed');
    } finally {
      setDemoLoading('');
    }
  };

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-ink p-10 lg:flex lg:flex-col xl:p-14">
        <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-lavender-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-24 h-96 w-96 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="pointer-events-none absolute right-16 top-28 h-3 w-3 rounded-full bg-lime-400 shadow-[0_0_0_10px_rgba(208,244,49,0.12)]" />
        <div className="pointer-events-none absolute bottom-36 left-24 h-2 w-2 rounded-full bg-tomato-500" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-lavender-300 to-lavender-600 shadow-float">
            <Building2 size={23} className="text-white" strokeWidth={2.3} />
          </div>
          <div>
            <p className="text-lg font-extrabold leading-none tracking-[-0.04em] text-white">HostelHub</p>
            <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.22em] text-lavender-300">Residence OS</p>
          </div>
        </div>

        <div className="relative z-10 my-auto max-w-xl py-12">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-lavender-200">
            <Sparkles size={13} className="text-lime-400" />
            Hostel management, simplified
          </div>
          <h1 className="text-balance text-[42px] font-extrabold leading-[1.08] tracking-[-0.045em] text-white xl:text-[52px]">
            One calm home for your entire{' '}
            <span className="text-lavender-300">hostel community.</span>
          </h1>
          <p className="mt-5 max-w-lg text-[14px] leading-7 text-lavender-100/70">
            Allocations, fees, attendance and student wellbeing — connected in one beautifully simple workspace built for
            modern campus teams.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Building2, title: 'Live occupancy', text: 'Bed-by-bed visibility' },
              { icon: BarChart3, title: 'Fee clarity', text: 'Receipts & reports' },
              { icon: ShieldCheck, title: 'Safe campus', text: 'Visitors & complaints' },
            ].map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3.5 backdrop-blur">
                <feature.icon size={17} className="text-lime-400" />
                <p className="mt-3 text-[12px] font-extrabold text-white">{feature.title}</p>
                <p className="mt-0.5 text-[10px] text-lavender-100/55">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-lavender-200/70">Live campus pulse</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight text-white">81 beds · 3 residences</p>
            </div>
            <span className="rounded-full bg-lime-400 px-2.5 py-1 text-[10px] font-extrabold text-ink">Real-time</span>
          </div>
          <div className="mt-4 flex h-14 items-end gap-1.5">
            {[38, 52, 46, 67, 58, 75, 63, 88, 72, 91, 84, 96].map((height, index) => (
              <div
                key={index}
                className={clsx('flex-1 rounded-t-md', index > 8 ? 'bg-lime-400' : 'bg-lavender-400/60')}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-lavender-100/55">
            <span>Occupancy trend</span>
            <span className="font-bold text-lime-300">+12.4% this term</span>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen flex-col bg-[#FCFBFE] px-5 py-6 sm:px-10 lg:min-h-0 lg:justify-center lg:px-14 xl:px-24">
        <div className="mb-10 flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-lavender-300 to-lavender-600 shadow-soft">
            <Building2 size={21} className="text-white" />
          </div>
          <div>
            <p className="text-base font-extrabold leading-none tracking-[-0.04em] text-ink">HostelHub</p>
            <p className="mt-1 text-[8px] font-extrabold uppercase tracking-[0.2em] text-lavender-500">Residence OS</p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[430px] animate-slide-up">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-lavender-600">Welcome back</p>
          <h2 className="mt-2 text-[32px] font-extrabold leading-tight tracking-[-0.04em] text-ink">Sign in to HostelHub</h2>
          <p className="mt-2 text-[13px] leading-6 text-muted">
            Use your campus account to access your personalised workspace.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <Input
              label="Email address"
              type="email"
              icon={Mail}
              placeholder="you@hostelhub.com"
              value={form.email}
              onChange={(event) => {
                setForm((current) => ({ ...current, email: event.target.value }));
                if (errors.email) setErrors((current) => ({ ...current, email: '' }));
              }}
              error={errors.email}
              autoComplete="email"
              required
            />
            <div>
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  icon={LockKeyhole}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, password: event.target.value }));
                    if (errors.password) setErrors((current) => ({ ...current, password: '' }));
                  }}
                  error={errors.password}
                  autoComplete="current-password"
                  className="pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-[35px] rounded-lg p-1.5 text-[#A79CB1] transition hover:bg-lavender-50 hover:text-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" loading={submitting} iconRight={ArrowRight} className="w-full">
              Sign in securely
            </Button>
          </form>

          <div className="my-7 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#EDE7F3]" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#A79CB1]">One-click demo access</span>
            <div className="h-px flex-1 bg-[#EDE7F3]" />
          </div>

          <div className="space-y-2">
            {demoAccounts.map((account) => {
              const Icon = account.icon;
              return (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => handleDemoLogin(account)}
                  disabled={Boolean(demoLoading)}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-[#EDE7F3] bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-lavender-300 hover:shadow-soft disabled:opacity-60"
                >
                  <div className={clsx('flex h-9 w-9 items-center justify-center rounded-xl', account.tone)}>
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-extrabold text-ink">{account.role}</p>
                      <span className="rounded bg-[#F6F2FA] px-1.5 py-0.5 text-[8px] font-bold text-muted">{account.description}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-muted">
                      {account.email} · {account.password}
                    </p>
                  </div>
                  {demoLoading === account.email ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-lavender-300 border-t-transparent" />
                  ) : (
                    <ArrowRight size={15} className="text-[#B7ACC0] transition group-hover:translate-x-0.5 group-hover:text-lavender-600" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-7 flex items-start gap-2.5 rounded-2xl border border-lime-200/70 bg-lime-50/70 p-3.5">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-lime-700" />
            <p className="text-[11px] leading-5 text-[#5D6B1E]">
              Passwords are hashed with bcrypt and every session is protected by JWT authentication. Demo accounts include
              realistic data for every module.
            </p>
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-[#A79CB1]">
            <KeyRound size={11} /> Need access? Contact your hostel administrator.
          </p>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
