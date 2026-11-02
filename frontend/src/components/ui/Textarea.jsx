import { useId } from 'react';
import clsx from 'clsx';

const Textarea = ({ label, error, hint, className, containerClassName, required, rows = 4, ...props }) => {
  const generatedId = useId();
  const id = props.id || generatedId;

  return (
    <div className={containerClassName}>
      {label ? (
        <label htmlFor={id} className="label-base">
          {label} {required ? <span className="text-tomato-500">*</span> : null}
        </label>
      ) : null}
      <textarea
        id={id}
        rows={rows}
        className={clsx(
          'input-base h-auto resize-y py-3 leading-6',
          error && 'border-tomato-300 focus:border-tomato-400 focus:ring-tomato-300/20',
          className
        )}
        {...props}
      />
      {error ? <p className="mt-1.5 text-xs font-semibold text-tomato-600">{error}</p> : null}
      {hint && !error ? <p className="mt-1.5 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
};

export default Textarea;
