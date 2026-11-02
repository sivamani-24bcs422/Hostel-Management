import clsx from 'clsx';
import { getInitials } from '../../utils/format';

const sizes = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-16 w-16 text-lg',
};

const Avatar = ({ name = '', src, size = 'md', className }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={clsx('shrink-0 rounded-full object-cover ring-2 ring-white', sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lavender-300 to-lavender-600 font-extrabold text-white shadow-[0_6px_16px_-8px_rgba(102,58,151,0.8)] ring-2 ring-white',
        sizes[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
