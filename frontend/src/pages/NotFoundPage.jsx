import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFoundPage = () => (
  <div className="page-bg flex min-h-screen items-center justify-center bg-surface p-5">
    <div className="card max-w-lg p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-lavender-100 text-lavender-600">
        <Compass size={28} />
      </div>
      <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.2em] text-lavender-600">Error 404</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">You wandered off campus</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        The page you are looking for does not exist. Let&apos;s get you back to your dashboard.
      </p>
      <Link to="/" className="mt-6 inline-block">
        <Button icon={ArrowLeft}>Back to dashboard</Button>
      </Link>
    </div>
  </div>
);

export default NotFoundPage;
