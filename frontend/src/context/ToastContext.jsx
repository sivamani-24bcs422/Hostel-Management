import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const icons = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const tones = {
  success: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  error: 'text-tomato-600 bg-tomato-50 border-tomato-100',
  info: 'text-lavender-700 bg-lavender-50 border-lavender-200',
};

const barTones = {
  success: 'bg-emerald-500',
  error: 'bg-tomato-500',
  info: 'bg-lavender-400',
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message, type = 'success', title = '') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((current) => [...current, { id, message, type, title }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      success: (message, title = 'Success') => notify(message, 'success', title),
      error: (message, title = 'Something went wrong') => notify(message, 'error', title),
      info: (message, title = 'Heads up') => notify(message, 'info', title),
      notify,
      dismiss,
    }),
    [notify, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const Icon = icons[toast.type] || Info;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto relative overflow-hidden rounded-2xl border bg-white p-4 pl-4 shadow-float animate-slide-in-right ${tones[toast.type]}`}
            >
              <div className={`absolute inset-y-0 left-0 w-1 ${barTones[toast.type]}`} />
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-xl border p-1.5 ${tones[toast.type]}`}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  {toast.title ? <p className="text-sm font-bold text-ink">{toast.title}</p> : null}
                  <p className="mt-0.5 text-[13px] leading-5 text-muted">{toast.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="rounded-lg p-1 text-muted transition hover:bg-black/5 hover:text-ink"
                  aria-label="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
};

export default ToastContext;
