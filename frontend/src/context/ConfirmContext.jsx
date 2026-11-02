import { createContext, useContext, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import Button from '../components/ui/Button';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const confirm = (options = {}) =>
    new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        title: options.title || 'Are you sure?',
        message: options.message || 'This action cannot be undone.',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        tone: options.tone || 'primary',
      });
    });

  const close = (result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm animate-fade-in" onClick={() => close(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-float animate-scale-in">
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
                dialog.tone === 'danger' ? 'bg-tomato-50 text-tomato-500' : 'bg-lavender-100 text-lavender-600'
              }`}
            >
              {dialog.tone === 'danger' ? <AlertTriangle size={22} /> : <HelpCircle size={22} />}
            </div>
            <h3 className="text-lg font-bold text-ink">{dialog.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{dialog.message}</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => close(false)}>
                {dialog.cancelText}
              </Button>
              <Button variant={dialog.tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)}>
                {dialog.confirmText}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used inside ConfirmProvider');
  return context;
};

export default ConfirmContext;
