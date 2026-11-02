const PageHeader = ({ eyebrow, title, subtitle, actions, children }) => (
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {eyebrow ? (
        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-lavender-600">{eyebrow}</p>
      ) : null}
      <h1 className="text-2xl font-extrabold tracking-[-0.035em] text-ink sm:text-[28px]">{title}</h1>
      {subtitle ? <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-muted">{subtitle}</p> : null}
      {children}
    </div>
    {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
);

export default PageHeader;
