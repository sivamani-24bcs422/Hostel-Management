import { useId } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

const Select = ({ label, error, options = [], placeholder, className, containerClassName, required, children, ...props }) => {
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
        <select
          id={id}
          className={clsx(
            'input-base appearance-none pr-9',
            error && 'border-tomato-300 focus:border-tomato-400 focus:ring-tomato-300/20',
            className
          )}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {children ||
            options.map((option) => {
              const value = typeof option === 'string' ? option : option.value;
              const labelText = typeof option === 'string' ? option : option.label;
              return (
                <option key={value} value={value}>
                  {labelText}
                </option>
              );
            })}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A79CB1]" />
      </div>
      {error ? <p className="mt-1.5 text-xs font-semibold text-tomato-600">{error}</p> : null}
    </div>
  );
};

export default Select;
