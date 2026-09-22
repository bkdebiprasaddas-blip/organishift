/**
 * Single source of truth for status/priority chip styling (IMP-C1).
 * Used by Dashboard, ExecutionHub, EventExecution and Calendar.
 */
export const STATUS_CHIP = {
  NOT_STARTED: 'bg-slate-100 text-slate-600 border-slate-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  BLOCKED: 'bg-rose-50 text-rose-700 border-rose-200',
  PLANNED: 'bg-slate-100 text-slate-600 border-slate-200',
  ONGOING: 'bg-blue-50 text-blue-700 border-blue-200',
  DONE: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

export const PRIORITY_TEXT = {
  LOW: 'text-slate-500',
  MEDIUM: 'text-sky-700',
  HIGH: 'font-bold text-orange-600',
  CRITICAL: 'font-bold text-rose-600'
};

export function Chip({ kind, children }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
        STATUS_CHIP[kind] || STATUS_CHIP.PLANNED
      }`}
    >
      {children}
    </span>
  );
}
