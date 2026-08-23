import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Folder, FolderOpen, FileText, FolderPlus, MapPin
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import TreeView from '../components/common/TreeView';
import { Modal, Spinner, ErrorState } from '../components/common';

const STATUS_STYLES = {
  NOT_STARTED: 'bg-slate-100 text-slate-600 border-slate-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  BLOCKED: 'bg-rose-50 text-rose-700 border-rose-200'
};

const PRIORITY_STYLES = {
  LOW: 'text-slate-500',
  MEDIUM: 'text-sky-600',
  HIGH: 'font-bold text-orange-600',
  CRITICAL: 'font-bold text-rose-600'
};

const TRANSITIONS = {
  NOT_STARTED: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['COMPLETED', 'BLOCKED'],
  BLOCKED: ['IN_PROGRESS'],
  COMPLETED: ['IN_PROGRESS']
};

const label = s => s.replace(/_/g, ' ');

export default function EventExecution() {
  const { id } = useParams();
  const { user } = useAuth();
  const role = user?.role;

  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [addModal, setAddModal] = useState(null); // {parent}
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const toast = useToast();
  const isManager = role === 'MANAGER';
  const isAdminOrManager = role === 'ADMIN' || role === 'MANAGER';

  const load = useCallback(() => {
    api.get(`/events/${id}`)
      .then(setData)
      .catch(err => setError(err.message || 'Failed to load event'));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isAdminOrManager) api.get('/users').then(setUsers).catch(() => {});
  }, [isAdminOrManager]);

  const updateItem = async (item, patch) => {
    try {
      await api.put(`/events/items/${item._id}`, patch);
      load();
      toast('Updated');
    } catch (err) { toast(err.message || 'Update failed', 'error'); }
  };

  const addChild = async () => {
    if (!title.trim()) return;
    try {
      await api.post(`/events/${id}/items`, { title: title.trim(), parentId: addModal.parent?._id || null });
      setAddModal(null); setTitle('');
      load();
      toast('Item added');
    } catch (err) { toast(err.message || 'Add failed', 'error'); }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Spinner label="Loading execution…" className="py-24" />;

  const { event, tree } = data;
  const prog = Math.round(event.progressPercent || 0);

  const statusOptionsFor = item =>
    (TRANSITIONS[item.status] || []).filter(next =>
      item.status === 'COMPLETED' ? isAdminOrManager : true
    );

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold tracking-tight">{event.title}</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <span>{new Date(event.startDate).toLocaleDateString()}{event.endDate ? ` → ${new Date(event.endDate).toLocaleDateString()}` : ''}</span>
              {event.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.venue}</span>}
            </p>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[event.status] || STATUS_STYLES.PLANNED}`}>
            {event.status}
          </span>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs font-semibold">
            <span className="text-slate-600">Overall progress</span>
            <span className="font-mono text-slate-900">{prog}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full bg-gradient-to-r from-indigo-600 to-blue-500 transition-all duration-300 ${event.status === 'DONE' ? '!from-emerald-500 !to-emerald-500' : ''}`}
              style={{ width: `${prog}%` }}
              role="progressbar"
              aria-valuenow={prog}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Overall progress ${prog}%`}
            />
          </div>
        </div>
        {role === 'MEMBER' && (
          <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-800" role="note">
            Scoped view — you see only your assigned branches.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Execution Checklist</h3>
          {tree.length > 0 && (
            <button onClick={() => setCollapsed({})} className="min-h-[32px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Expand All</button>
          )}
        </div>

        {tree.length === 0 ? (
          <p className="py-12 text-center text-xs text-slate-400">No checklist items.</p>
        ) : (
          <TreeView
            nodes={tree}
            isCollapsed={n => !!collapsed[n._id]}
            onToggle={nodeId => setCollapsed(c => ({ ...c, [nodeId]: !c[nodeId] }))}
            rowClassName={(n, hasKids) => hasKids ? 'bg-slate-50 hover:bg-indigo-50/40' : 'bg-white hover:bg-slate-50'}
            renderMain={(node, { hasKids }) => {
              const isCol = !!collapsed[node._id];
              return (
                <>
                  {hasKids
                    ? (isCol ? <Folder className="h-4 w-4 shrink-0 text-slate-500" /> : <FolderOpen className="h-4 w-4 shrink-0 text-slate-500" />)
                    : <FileText className="h-4 w-4 shrink-0 text-slate-400" />}
                  <span className={`truncate text-xs ${hasKids ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>{node.title}</span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${STATUS_STYLES[node.status]}`}>
                    {label(node.status)}
                  </span>
                  {node.priority && (
                    <span className={`shrink-0 text-[10px] uppercase ${PRIORITY_STYLES[node.priority]}`}>{node.priority}</span>
                  )}
                  {node.dueDate && (
                    <span className="hidden shrink-0 items-center gap-1 text-[10px] text-slate-400 sm:inline-flex">
                      due {new Date(node.dueDate).toLocaleDateString()}
                      {new Date(node.dueDate) < new Date() && node.status !== 'COMPLETED' && (
                        <span className="rounded bg-red-100 px-1 py-0.5 text-[9px] font-bold text-red-700">OVERDUE</span>
                      )}
                    </span>
                  )}
                </>
              );
            }}
            renderActions={(node, { hasKids }) => {
              const options = statusOptionsFor(node);
              const canEditStatus = !hasKids && (
                role === 'MEMBER'
                  ? String(node.assigneeId?._id ?? node.assigneeId) === String(user._id) && node.status !== 'COMPLETED'
                  : true
              );
              return (
                <>
                  {isManager && (
                    <select
                      value={node.assigneeId?._id || ''}
                      onChange={e => updateItem(node, { assigneeId: e.target.value || null })}
                      aria-label={`Assignee for ${node.title}`}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700"
                    >
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                    </select>
                  )}
                  {!isManager && node.assigneeId && (
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                      {typeof node.assigneeId === 'object' ? node.assigneeId.name : 'Assigned'}
                    </span>
                  )}

                  {isManager && (
                    <select
                      value={node.priority}
                      onChange={e => updateItem(node, { priority: e.target.value })}
                      aria-label={`Priority for ${node.title}`}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700"
                    >
                      {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  )}

                  {isManager && (
                    <input
                      type="date"
                      value={node.dueDate ? new Date(node.dueDate).toISOString().slice(0, 10) : ''}
                      onChange={e => updateItem(node, { dueDate: e.target.value || null })}
                      aria-label={`Due date for ${node.title}`}
                      className="min-h-[32px] rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
                    />
                  )}

                  {canEditStatus && options.length > 0 ? (
                    <select
                      value={node.status}
                      onChange={e => updateItem(node, { status: e.target.value })}
                      aria-label={`Status of ${node.title}`}
                      className={`rounded-md border px-2 py-1.5 text-[11px] font-bold uppercase ${STATUS_STYLES[node.status]}`}
                    >
                      <option value={node.status}>{label(node.status)}</option>
                      {options.map(s => <option key={s} value={s}>{label(s)}</option>)}
                    </select>
                  ) : null}

                  {isAdminOrManager && (
                    <button
                      onClick={() => setAddModal({ parent: node })}
                      title="Add child item"
                      aria-label={`Add child under ${node.title}`}
                      className="min-h-[32px] min-w-[32px] rounded p-1.5 text-slate-400 opacity-0 transition hover:bg-indigo-100 hover:text-indigo-700 focus:opacity-100 group-hover:opacity-100"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              );
            }}
            renderCollapsed={node => (
              <div className="ml-[11px] pl-5">
                <button
                  onClick={() => setCollapsed(c => ({ ...c, [node._id]: false }))}
                  className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-200"
                >
                  {node.children.length} hidden — {Math.round(node.progressPercent)}%
                </button>
              </div>
            )}
          />
        )}
      </div>

      {addModal && (
        <Modal onClose={() => setAddModal(null)} labelledBy="add-child-title">
          <h3 id="add-child-title" className="mb-1 text-base font-bold text-slate-900">Add Child Item</h3>
          {addModal.parent && <p className="mb-3 text-xs text-slate-500">Under: <b>{addModal.parent.title}</b></p>}
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addChild()}
            placeholder="Item title" aria-label="Child item title"
            className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-semibold" />
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setAddModal(null)} className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-slate-600">Cancel</button>
            <button onClick={addChild} disabled={!title.trim()} className="min-h-[36px] rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50">Add</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
