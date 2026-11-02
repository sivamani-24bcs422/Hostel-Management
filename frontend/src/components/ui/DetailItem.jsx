const DetailItem = ({ label, value, className = '' }) => (
  <div className={className}>
    <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A8FA4]">{label}</p>
    <div className="mt-1 text-[13px] font-semibold text-[#3D2B4F]">{value ?? '—'}</div>
  </div>
);

export default DetailItem;
