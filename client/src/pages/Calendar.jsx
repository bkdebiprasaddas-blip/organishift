import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarPlus } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';

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
  const [cursor, setCursor] = useState(() => new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ title: '', planId: '', startDate: '', endDate: '', venue: '' });
  const [scheduling, setScheduling] = useState(false);


  useEffect(() => {
    api.get('/events').then(setEvents).catch(() => setEvents([]));
    if (canSchedule) api.get('/event-plans').then(setPlans).catch(() => {});
  }, [canSchedule]);

  const showToast = useToast();

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthName = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 35 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [year, month]);

  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(e => {
      const key = dateKey(new Date(e.startDate));
      (map[key] = map[key] || []).push(e);
      // multi-day span
      if (e.endDate) {
        let cur = new Date(key);
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
    } catch (err) { showToast(err.message || 'Scheduling failed'); }
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
                      <div className="mt-0.5 ml-3 h-1 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full bg-indigo-500" style={{ width: `${Math.round(e.progressPercent || 0)}%` }} />
                      </div>
                    </button>
                  ))}
                  {dayEvents.length > 2 && (
                    <p className="ml-1 text-[9px] font-semibold text-slate-400">+{dayEvents.length - 2} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={() => setShowDialog(false)}>
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl" onMouseDown={e => e.stopPropagation()}>
            <h3 className="mb-4 text-base font-bold text-slate-900">Schedule New Event</h3>
            <div className="space-y-3">
              <select value={form.planId} onChange={e => setForm(f => ({ ...f, planId: e.target.value }))} className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold">
                <option value="">Select plan…</option>
                {plans.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
              </select>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold" />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="rounded-lg border border-slate-300 p-2 text-xs font-semibold" />
                <input type="date" value={form.endDate} min={form.startDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} placeholder="End (optional)" className="rounded-lg border border-slate-300 p-2 text-xs font-semibold" />
              </div>
              <input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="Venue (optional)" className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold" />
              <p className="text-[11px] text-slate-400">All blueprint items are copied into the event as NOT_STARTED.</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowDialog(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600">Cancel</button>
              <button onClick={schedule} disabled={!form.planId || !form.title.trim() || !form.startDate || scheduling}
                className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50">
                {scheduling ? 'Scheduling…' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
