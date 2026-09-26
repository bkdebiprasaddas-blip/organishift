import { useEffect, useRef } from 'react';

/**
 * Accessible modal (IMP-B4): Escape closes, focus is trapped inside and
 * returned to the trigger on close, background scroll is locked.
 */
export function Modal({ onClose, children, labelledBy, wide = false }) {
  const panelRef = useRef(null);
  // Callers pass an inline arrow (`onClose={() => setModal(null)}`), so `onClose`
  // is a new function on every render. Putting it in the effect's dependency
  // array would tear down and re-run the focus trap / key listener on every
  // parent render. Read it through a ref instead.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    if (panel) {
      const first = panel.querySelector(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
      );
      first?.focus();
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = e => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const focusables = Array.from(
        panel.querySelectorAll(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={() => onCloseRef.current?.()}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`w-full ${wide ? 'max-w-lg' : 'max-w-sm'} rounded-xl border border-slate-200 bg-white p-5 shadow-xl`}
        onMouseDown={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, busy = false }) {
  return (
    <Modal onClose={onCancel} labelledBy="confirm-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 20h16a2 2 0 0 0 1.73-2Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        </span>
        <div className="min-w-0">
          <h3 id="confirm-title" className="text-base font-bold text-slate-900">{title}</h3>
          <div className="mt-1 text-xs leading-relaxed text-slate-600">{message}</div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onCancel} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
        <button onClick={onConfirm} disabled={busy} className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-50">{busy ? `${confirmLabel}…` : confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function Spinner({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-10 text-slate-500 ${className}`} role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" aria-hidden="true" />
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}

export function SkeletonCard({ className = 'h-24' }) {
  return <div className={`animate-pulse rounded-xl border border-slate-200 bg-white ${className}`} aria-hidden="true" />;
}

export function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="py-12 text-center">
      {Icon && <Icon className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />}
      <p className="mt-3 text-sm font-semibold text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
      <p className="text-sm font-semibold text-rose-800">{message || 'Something went wrong.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500">
          Retry
        </button>
      )}
    </div>
  );
}

export function ForbiddenNote({ children }) {
  return (
    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800">
      {children || 'You do not have permission to perform this action.'}
    </p>
  );
}

export { default as DropdownMenu } from './DropdownMenu';
export { Chip, STATUS_CHIP, PRIORITY_TEXT } from './chips';
