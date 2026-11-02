import clsx from 'clsx';

const ChartCard = ({ title, subtitle, action, children, className, bodyClassName }) => (
  <div className={clsx('card overflow-hidden', className)}>
    <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
      <div>
        <h3 className="text-sm font-extrabold tracking-tight text-ink">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-[11px] text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
    <div className={clsx('px-3 pb-4 pt-3 sm:px-4', bodyClassName)}>{children}</div>
  </div>
);

export default ChartCard;
