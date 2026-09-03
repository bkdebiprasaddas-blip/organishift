import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarPlus } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Modal, ErrorState } from '../components/common';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS_DOT = {
  PLANNED: 'bg-slate-400',
  ONGOING: 'bg-blue-500',
  DONE: 'bg-emerald-500'
};

export default function Calendar() {
  const { user } = useAuth();
  const canSchedule = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [plans, setPlans] = useState([]);
   const [error, setError] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [cursor, setCursor] = useState(() => new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [dayPopover, setDayPopover] = useState(null); // date key with >2 events (IMP-C11)
  const [form, setForm] = useState({ title: '', planId: '', startDate: '', endDate: '', venue: '' });
  const [scheduling, setScheduling] = useState(false);

  const showToast = useToast();

  const loadEvents = () => {
    setError('');
    setLoadingEvents(true);
    api.get('/events')
      .then(setEvents)
      .catch(err => setError(err.message || 'Failed to load events'))
      .finally(() => setLoadingEvents(false));
  };

  useEffect(() => {
     loadEvents();
     if (canSchedule) api.get('/event-plans')
       .then(setPlans)
       .catch(() => showToast('Failed to load event plans', 'error'));
   }, [canSchedule, showToast]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthName = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    const totalCells = Math.ceil((first.getDay() + daysInMonth) / 7) * 7;
    return Array.from({ length: totalCells }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [year, month]);

  const dateKey = d => new Date(d).toLocaleDateString('sv');

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(e => {
      const startDate = new Date(e.startDate);
      const key = dateKey(startDate);
      (map[key] = map[key] || []).push(e);
      // multi-day span — iterate day-by-day using local date arithmetic
      if (e.endDate) {
        let cur = new Date(startDate);
        const end = new Date(e.endDate);
        while (cur < end) {
          cur.setDate(cur.getDate() + 1);
          const k = dateKey(cur);
          if (!map[k]?.includes(e)) (map[k] = map[k] || []).push(e);
        }
      }
    });
    return map;
  }, [events]);

  const schedule = async () => {
    if (!form.title.trim() || !form.planId || !form.startDate || scheduling) return;
    setScheduling(true);
    try {
      await api.post('/events', {
        title: form.title.trim(),
        planId: form.planId,
        startDate: form.startDate,
        endDate: form.endDate || null,
        venue: form.venue.trim()
      });
      const refreshed = await api.get('/events');
      setEvents(refreshed);
      setShowDialog(false);
      setForm({ title: '', planId: '', startDate: '', endDate: '', venue: '' });
      showToast('Event scheduled');
    } catch (err) { showToast(err.message || 'Scheduling failed', 'error'); }
    finally { setScheduling(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="text-lg font-bold tracking-tight">Calendar</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
            <span className="min-w-[140px] text-center text-sm font-bold">{monthName}</span>
            <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <button onClick={() => setCursor(new Date())} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Today</button>
          {canSchedule && (
            <button onClick={() => setShowDialog(true)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500">
              <CalendarPlus className="h-3.5 w-3.5" />Schedule Event
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1 text-[11px] font-semibold text-slate-500">
        <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${STATUS_DOT.PLANNED}`} />Planned</span>
        <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${STATUS_DOT.ONGOING}`} />Ongoing</span>
        <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${STATUS_DOT.DONE}`} />Done</span>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadEvents} />
      ) : loadingEvents ? (
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 shadow-card">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="bg-white p-1.5">
              <div className="h-4 w-6 rounded bg-slate-200 animate-pulse" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-12 shadow-card">
          <CalendarPlus className="h-8 w-8 text-slate-300" />
          <p className="mt-2 text-xs text-slate-400">No events scheduled for this period.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {WEEKDAYS.map(w => (
              <div key={w} className="py-2.5 text-center text-xs font-bold uppercase tracking-wide text-slate-500">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              const inMonth = d.getMonth() === month;
              const isToday = dateKey(d) === dateKey(new Date());
              const dayEvents = eventsByDate[dateKey(d)] || [];
              return (
                <div key={i} className={`min-h-[96px] border-b border-r border-slate-100 p-1.5 last:border-r-0 ${inMonth ? '' : 'bg-slate-50/60'}`}>
                  <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold ${isToday ? 'bg-indigo-600 text-white' : inMonth ? 'text-slate-700' : 'text-slate-400'}`}>
                    {d.getDate()}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 2).map(e => (
                      <button key={e._id} onClick={() => navigate(`/events/${e._id}`)}
                        className="block w-full rounded-md bg-slate-100 px-1.5 py-1 text-left transition hover:bg-indigo-50">
                        <span className="flex items-center gap-1">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[e.status] || STATUS_DOT.PLANNED}`} />
                          <span className="truncate text-[10px] font-bold text-slate-700">{e.title}</span>
                        </span>
                        <div
                          className="mt-0.5 ml-3 h-1 overflow-hidden rounded-full bg-slate-200"
                          role="progressbar"
                          aria-valuenow={Math.round(e.progressPercent || 0)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${e.title} progress ${Math.round(e.progressPercent || 0)}%`}
                        >
                          <div className="h-full bg-indigo-500" style={{ width: `${Math.round(e.progressPercent || 0)}%` }} />
                        </div>
                      </button>
                    ))}
                    {dayEvents.length > 2 && (
                      <button
                        onClick={() => setDayPopover(dateKey(d))}
                        className="ml-1 rounded px-0.5 text-[9px] font-semibold text-slate-500 underline-offset-2 hover:text-indigo-600 hover:underline"
                      >
                        +{dayEvents.length - 2} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day overflow popover (IMP-C11) */}
      {dayPopover && (
        <Modal onClose={() => setDayPopover(null)} labelledBy="day-popover-title">
          <h3 id="day-popover-title" className="mb-3 text-base font-bold text-slate-900">
            Events on {new Date(`${dayPopover}T00:00:00`).toLocaleDateString()}
          </h3>
          <div className="space-y-2">
            {(eventsByDate[dayPopover] || []).map(e => (
              <button key={e._id}
                onClick={() => { setDayPopover(null); navigate(`/events/${e._id}`); }}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:bg-indigo-50">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[e.status] || STATUS_DOT.PLANNED}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-slate-900">{e.title}</span>
                    <span className="text-[10px] text-slate-500">{Math.round(e.progressPercent || 0)}% complete</span>
                  </span>
                </span>
                <span className="shrink-0 text-xs font-bold text-indigo-600">Open →</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
            <button onClick={() => setDayPopover(null)} className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-slate-600">Close</button>
          </div>
        </Modal>
      )}

      {/* Schedule Dialog */}
      {showDialog && (
        <Modal onClose={() => !scheduling && setShowDialog(false)} labelledBy="schedule-title">
          <h3 id="schedule-title" className="mb-4 text-base font-bold text-slate-900">Schedule New Event</h3>
          <div className="space-y-3">
            <select value={form.planId} onChange={e => setForm(f => ({ ...f, planId: e.target.value }))} aria-label="Plan" className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold" disabled={plans.length === 0}>
              <option value="">Select plan...</option>
              {plans.length === 0 && (
                <option value="" disabled>No plans available — ask an Admin to create one</option>
              )}
              {plans.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
            </select>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" aria-label="Event title" className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold" />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} aria-label="Start date" className="rounded-lg border border-slate-300 p-2 text-xs font-semibold" />
              <input type="date" value={form.endDate} min={form.startDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} placeholder="End (optional)" aria-label="End date (optional)" className="rounded-lg border border-slate-300 p-2 text-xs font-semibold" />
            </div>
            <input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="Venue (optional)" aria-label="Venue (optional)" className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold" />
            <p className="text-[11px] text-slate-400">All blueprint items are copied into the event as NOT_STARTED.</p>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowDialog(false)} disabled={scheduling} className="px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50">Cancel</button>
            <button onClick={schedule} disabled={!form.planId || !form.title.trim() || !form.startDate || scheduling}
              className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50">
              {scheduling ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
