import { useId } from 'react';
import clsx from 'clsx';

const Input = ({ label, error, hint, icon: Icon, className, containerClassName, required, ...props }) => {
  const generatedId = useId();
  const id = props.id || generatedId;

  return (
    <div className={containerClassName}>
      {label ? (
        <label htmlFor={id} className="label-base">
          {label} {required ? <span className="text-tomato-500">*</span> : null}
        </label>
      ) : null}
      <div className="relative">
        {Icon ? <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A79CB1]" /> : null}
        <input
          id={id}
          className={clsx(
            'input-base',
            Icon && 'pl-10',
            error && 'border-tomato-300 focus:border-tomato-400 focus:ring-tomato-300/20',
            className
          )}
          {...props}
        />
      </div>
      {error ? <p className="mt-1.5 text-xs font-semibold text-tomato-600">{error}</p> : null}
      {hint && !error ? <p className="mt-1.5 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
};

export default Input;
