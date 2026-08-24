import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const showToast = useCallback((message, type = 'success') => {
    const id = ++idRef.current;
    setToasts(t => [...t, { id, message, type }]);
    // Errors stay longer and can be dismissed manually (IMP-C6)
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), type === 'error' ? 8000 : 3000);
  }, []);

  const dismiss = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 space-y-2" role="status" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-lg border px-4 py-2.5 shadow-lg ${
              t.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'bg-slate-900 text-white'
            }`}
          >
            {t.type === 'error' ? (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
            )}
            <span className="text-xs font-semibold">{t.message}</span>
            {t.type === 'error' && (
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification"
                className="ml-1 rounded p-0.5 hover:bg-rose-100">
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
