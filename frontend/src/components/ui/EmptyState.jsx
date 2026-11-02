import { Inbox } from 'lucide-react';

const EmptyState = ({ icon: Icon = Inbox, title = 'Nothing here yet', description, action, className = '' }) => (
  <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lavender-50 text-lavender-500">
      <Icon size={24} />
    </div>
    <h3 className="text-sm font-bold text-ink">{title}</h3>
    {description ? <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted">{description}</p> : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);

export default EmptyState;
