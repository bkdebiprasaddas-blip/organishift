import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';

const STATUS_LABEL = s => s.replace(/_/g, ' ');

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  const load = () => {
    setLoading(true);
    api.get('/dashboard/stats')
      .then(setStats)
      .catch(err => setError(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const showToast = useToast();

  const updateStatus = async (item, status) => {
    try {
      await api.put(`/events/items/${item._id}`, { status });
      showToast(`"${item.title}" → ${STATUS_LABEL(status)}`);
      load();
    } catch (err) {
      showToast(err.message || 'Update failed');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />)}
        </div>
        <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="text-sm font-semibold text-rose-800">{error}</p>
        <button onClick={load} className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500">Retry</button>
      </div>
    );
  }

  const myWork = stats.myWork || [];

  return (
    <div className="space-y-6">
      {/* Six counter cards (frozen order, T-031) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Items</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.counters.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Completed</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.counters.completed}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Pending</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{stats.counters.pending}</p>
          <p className="mt-0.5 text-[10px] font-medium text-rose-600">{stats.counters.blocked} blocked</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">In Progress</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">{stats.counters.inProgress}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-card">
          <p className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-rose-700">Overdue <span className="rounded bg-rose-200 px-1 text-[9px] text-rose-800">Overlap</span></p>
          <p className="mt-2 text-2xl font-bold text-rose-800">{stats.counters.overdue}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Overall Progress</p>
          <p className="mt-2 text-2xl font-bold text-indigo-900">{stats.counters.overallProgress}%</p>
        </div>
      </div>

      {/* My Assigned Work (T-031 / UI-SPEC §6) — inline status editing */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-slate-900">My Assigned Work ({myWork.length})</h3>
          <span className="text-xs text-slate-500">{user?.name}</span>
        </div>

        {myWork.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">
            No tasks assigned to you yet. Assigned work appears here with one-click status updates.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {myWork.map(item => (
              <div key={item._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>Event: <b className="text-slate-700">{item.eventTitle}</b></span>
                    {item.dueDate && (
                      <span>Due: <b className={item.isOverdue ? 'font-bold text-rose-600' : 'text-slate-700'}>
                        {new Date(item.dueDate).toLocaleDateString()}
                      </b></span>
                    )}
                    {item.isOverdue && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-800">Overdue</span>}
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700'
                      : item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700'
                      : item.status === 'BLOCKED' ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_LABEL(item.status)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {item.allowedTransitions.length > 0 ? (
                    <select
                      value=""
                      onChange={e => e.target.value && updateStatus(item, e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm focus:border-indigo-600 focus:outline-none"
                      aria-label={`Change status of ${item.title}`}
                    >
                      <option value="">Move to…</option>
                      {item.allowedTransitions.map(s => (
                        <option key={s} value={s}>{STATUS_LABEL(s)}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500">
                      {item.status === 'COMPLETED' ? 'Done (locked)' : 'No moves'}
                    </span>
                  )}
                  <NavLink
                    to={`/events/${item.eventId}`}
                    className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-600"
                    title="Open execution"
                  >
                    →
                  </NavLink>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Events */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="mb-4 border-b border-slate-200 pb-3 text-sm font-bold text-slate-900">Upcoming Events</h3>
        {stats.upcomingEvents.length === 0 ? (
          <p className="text-xs text-slate-500">No upcoming events.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {stats.upcomingEvents.map((ev) => (
              <div key={ev._id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{ev.title}</p>
                  <p className="text-xs text-slate-500">Starts: {new Date(ev.startDate).toLocaleDateString()} · {Math.round(ev.progressPercent || 0)}% complete</p>
                </div>
                <NavLink to={`/events/${ev._id}`} className="text-xs font-bold text-indigo-600 hover:underline">
                  View Execution
                </NavLink>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
