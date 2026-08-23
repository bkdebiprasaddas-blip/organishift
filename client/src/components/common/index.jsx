export function Modal({ onClose, children, labelledBy, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onClose}>
      <div
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

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
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
        <button onClick={onCancel} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
        <button onClick={onConfirm} className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500">{confirmLabel}</button>
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
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
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
