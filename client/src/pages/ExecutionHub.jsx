import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Inbox } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Chip, EmptyState, ErrorState, SkeletonCard } from '../components/common';

export default function ExecutionHub() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const load = () => {
    setLoading(true);
    setError('');
    api.get('/events')
      .then(setEvents)
      .catch(err => setError(err.message || 'Failed to load events'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'ALL' ? events : events.filter(e => e.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Execution Hub</h2>
          <p className="text-xs text-slate-500">All scheduled events — click one to open its live execution checklist</p>
        </div>
        <div className="flex items-center gap-1.5">
          {['ALL', 'PLANNED', 'ONGOING', 'DONE'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === f ? 'bg-indigo-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} className="h-44" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 shadow-card">
          <EmptyState
            icon={Inbox}
            title="No events found"
            hint={(user?.role === 'ADMIN' || user?.role === 'MANAGER')
              ? 'Schedule an event from a plan via the Calendar page.'
              : 'No events have been scheduled yet.'}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(e => {
            const prog = Math.round(e.progressPercent || 0);
            return (
              <button
                key={e._id}
                onClick={() => navigate(`/events/${e._id}`)}
                className="group cursor-pointer space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-card transition hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100 transition group-hover:bg-indigo-600 group-hover:text-white">
                    <CalendarDays className="h-6 w-6" />
                  </span>
                  <Chip kind={e.status}>{e.status}</Chip>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 transition group-hover:text-indigo-600">{e.title}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(e.startDate).toLocaleDateString()}
                    {e.venue ? ` · ${e.venue}` : ''}
                  </p>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">Progress</span>
                    <span className="font-mono text-slate-900">{prog}%</span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-valuenow={prog}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${e.title} progress ${prog}%`}
                  >
                    <div
                      className={`h-full transition-all duration-300 ${e.status === 'DONE' ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                      style={{ width: `${prog}%` }}
                    />
                  </div>
                </div>

                <p className="flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:underline">Open Execution →</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
