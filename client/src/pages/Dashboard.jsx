import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Chip, ErrorState, SkeletonCard } from '../components/common';
import { relativeDate } from '../utils/dates';

const STATUS_LABEL = s => s.replace(/_/g, ' ');

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // IMP-B2: skeletons only on first paint; later refreshes are silent
  const load = (silent = false) => {
    if (!silent) setLoading(true);
    api.get('/dashboard/stats')
      .then(data => { setStats(data); setError(''); })
      .catch(err => setError(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const showToast = useToast();

  const updateStatus = async (item, status) => {
    if (!status || updatingId === item._id) return;
    setUpdatingId(item._id); // IMP-B3: one in-flight change per row
    try {
      await api.put(`/events/items/${item._id}`, { status });
      showToast(`"${item.title}" → ${STATUS_LABEL(status)}`);
      await load(true);
    } catch (err) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonCard className="h-48" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => load()} />;
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
          <p className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-rose-700">Overdue <span className="rounded bg-rose-200 px-1 text-[9px] normal-case text-rose-800">past due date</span></p>
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
              <div key={item._id} className={`flex flex-wrap items-center justify-between gap-3 py-3 ${item.isOverdue ? 'bg-rose-50/40' : ''}`}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>Event: <b className="text-slate-700">{item.eventTitle}</b></span>
                    {item.dueDate && (
                      <span className={item.isOverdue ? 'font-bold text-rose-600' : 'text-slate-700'}>
                        <b>{relativeDate(item.dueDate)}</b> ({new Date(item.dueDate).toLocaleDateString()})
                      </span>
                    )}
                    {item.isOverdue && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-800">Overdue</span>}
                    <Chip kind={item.status}>{STATUS_LABEL(item.status)}</Chip>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {item.allowedTransitions.length > 0 ? (
                    <select
                      value=""
                      onChange={e => updateStatus(item, e.target.value)}
                      disabled={updatingId === item._id}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm focus:border-indigo-600 focus:outline-none disabled:opacity-50"
                      aria-label={`Change status of ${item.title}`}
                    >
                      <option value="">{updatingId === item._id ? 'Updating…' : 'Move to…'}</option>
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
                  <p className="text-xs text-slate-500">Starts: {relativeDate(ev.startDate)} · {Math.round(ev.progressPercent || 0)}% complete</p>
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
