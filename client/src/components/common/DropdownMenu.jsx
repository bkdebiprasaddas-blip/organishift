import { useEffect, useRef, useState } from 'react';
import { EllipsisVertical } from 'lucide-react';

/**
 * Keyboard-operable kebab dropdown (IMP-C4): outside-click + Escape close,
 * ArrowUp/Down navigation between items, focus returns to the trigger.
 * children is a render-prop receiving close().
 */
export default function DropdownMenu({ label, buttonClassName = '', children }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = e => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = e => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const els = Array.from(listRef.current?.querySelectorAll('button') || []);
        if (!els.length) return;
        e.preventDefault();
        const idx = els.indexOf(document.activeElement);
        const next =
          e.key === 'ArrowDown' ? (idx + 1) % els.length : (idx - 1 + els.length) % els.length;
        els[next === -1 ? 0 : next].focus();
      }
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector('button')?.focus();
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={btnRef}
        data-kebab
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen(o => !o)}
        className={buttonClassName}
      >
        <EllipsisVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          ref={listRef}
          role="menu"
          aria-label={label}
          className="absolute right-3 top-11 z-20 w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
        >
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}
