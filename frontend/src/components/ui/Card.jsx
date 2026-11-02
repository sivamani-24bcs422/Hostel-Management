import clsx from 'clsx';

const Card = ({ children, className, hover = false, ...props }) => (
  <div
    className={clsx(
      'card',
      hover && 'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-float',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export default Card;
