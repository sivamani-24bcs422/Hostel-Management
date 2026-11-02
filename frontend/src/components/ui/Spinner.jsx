import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const Spinner = ({ size = 20, className }) => (
  <Loader2 size={size} className={clsx('animate-spin text-lavender-500', className)} />
);

export const LoadingScreen = ({ label = 'Loading HostelHub...' }) => (
  <div className="page-bg flex min-h-screen items-center justify-center bg-surface">
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-lavender-300 to-lavender-600 shadow-glow">
        <Spinner size={24} className="text-white" />
      </div>
      <p className="text-sm font-semibold text-muted">{label}</p>
    </div>
  </div>
);

export default Spinner;
