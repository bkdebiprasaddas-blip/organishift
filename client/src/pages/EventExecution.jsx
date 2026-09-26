import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Folder, FolderOpen, FolderPlus, MapPin, CheckSquare, Square, Trash2
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useEventTitle } from '../context/EventTitleContext';
import { useToast } from '../components/common/Toast';
import TreeView from '../components/common/TreeView';
import { Modal, ConfirmDialog, Spinner, ErrorState, Chip, STATUS_CHIP, PRIORITY_TEXT } from '../components/common';
import TaskDetailDrawer from '../components/common/TaskDetailDrawer';
import { relativeDate, formatDateUTC, toDateInputValue, isOverdue } from '../utils/dates';

// Mirrors server/src/utils/statusTransitions.js (STATUS_TRANSITIONS) — keep
// both in sync if the state machine changes. Server is the authoritative
// enforcement; this copy only drives which options the UI offers.
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
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [addModal, setAddModal] = useState(null); // {parent}
  const [activeDrawerItem, setActiveDrawerItem] = useState(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pendingItems, setPendingItems] = useState({});
  const [patched, setPatched] = useState({});
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const dataRef = useRef(null);

  const toast = useToast();
  // Assignment / priority / due-date controls are Manager-only by design: the role
// model is "Admin owns structure, not operations" (see T-05 in the server test
// suite). Do not widen this to ADMIN without changing that test too.
const isManager = role === 'MANAGER';
  const isAdminOrManager = role === 'ADMIN' || role === 'MANAGER';

  // Depend on the stable `setTitle` only. The whole context object is NOT stable
  // across renders — `getTitle` is rebuilt whenever any title is published — so
  // including it here would change `load`'s identity after the first fetch,
  // re-fire the effect below, and request /api/events/:id a second time.
  const { setTitle: publishEventTitle } = useEventTitle();

  const load = useCallback((silent = false) => {
    if (!silent) setError('');
    return api.get(`/events/${id}`)
      .then(ev => {
        dataRef.current = ev;
        setData(ev);
        // CL-M4: publish title to context so Layout doesn't duplicate-fetch
        if (ev.event?.title) publishEventTitle(id, ev.event.title);
      })
      .catch(err => {
        // A failed background refresh must not tear down an already-rendered
        // event; only surface the error when there is nothing to show.
        if (!silent || !dataRef.current) setError(err.message || 'Failed to load event');
      });
  }, [id, publishEventTitle]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isAdminOrManager) api.get('/users').then(setUsers).catch(err => toast(err.message || 'Failed to load users', 'error'));
  }, [isAdminOrManager, toast]);

  // Optimistic overlay for in-flight field edits so controlled selects/inputs do
  // not visually snap back to the server value during the PUT + refetch.
  const updateItem = async (item, patch) => {
    setPatched(s => ({ ...s, [item._id]: { ...(s[item._id] || {}), ...patch } }));
    try {
      await api.put(`/events/items/${item._id}`, patch);
      toast('Updated');
    } catch (err) {
      toast(err.message || 'Update failed', 'error');
      throw err;
    } finally {
      // Wait for the refetch to land before dropping the overlay, otherwise the
      // row briefly renders the stale server value.
      await load(true);
      setPatched(s => {
        if (!s[item._id]) return s;
        const next = { ...s };
        delete next[item._id];
        return next;
      });
    }
  };

  const addChild = async () => {
    if (!title.trim() || adding) return;
    setAdding(true);
    try {
      await api.post(`/events/${id}/items`, { title: title.trim(), parentId: addModal.parent?._id || null });
      setAddModal(null); setTitle('');
      load();
      toast('Item added');
    } catch (err) { toast(err.message || 'Add failed', 'error'); }
    finally { setAdding(false); }
  };

  // CL-M3: compute set of node IDs the current user owns (self or ancestor assigned)
  // so child leaves in an owned branch are editable by MEMBERs.
  // Must stay ABOVE the early returns below: this is a hook, and render #1 returns
  // before `data` exists while render #2 (post-fetch) would then add a 14th hook.
  const tree = data?.tree;
  const ownedNodeIds = useMemo(() => {
    if (role !== 'MEMBER') return null;
    const owned = new Set();
    const walk = (nodes) => {
      nodes.forEach(n => {
        const isAssigned = String(n.assigneeId?._id ?? n.assigneeId) === String(user?._id);
        if (isAssigned) {
          const addSubtree = (node) => {
            owned.add(String(node._id));
            (node.children || []).forEach(addSubtree);
          };
          addSubtree(n);
        }
        walk(n.children || []);
      });
    };
    walk(tree || []);
    return owned;
  }, [tree, role, user?._id]);

  if (error) return <ErrorState message={error} onRetry={() => load()} />;
  if (!data) return <Spinner label="Loading execution…" className="py-24" />;

  const { event } = data;
  const prog = Math.round(event.progressPercent || 0);

  const statusOptionsFor = item => {
    // A MEMBER may never reopen a COMPLETED item (enforced server-side in
    // eventService.updateExecutionItem), so they get no options at all.
    if (item.status === 'COMPLETED' && !isAdminOrManager) return [];
    return TRANSITIONS[item.status] || [];
  };

  // Per-item in-flight guard: without it a double-click fires the whole
  // NOT_STARTED -> IN_PROGRESS -> COMPLETED chain twice, interleaving statuses
  // and leaving the final state non-deterministic.
  const isPending = itemId => !!pendingItems[itemId];

  const runPending = async (itemId, fn) => {
    setPendingItems(p => ({ ...p, [itemId]: true }));
    try {
      await fn();
    } finally {
      setPendingItems(p => {
        if (!p[itemId]) return p;
        const next = { ...p };
        delete next[itemId];
        return next;
      });
    }
  };

  const toggleStatus = node => {
    const nextStatus = node.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    // updateItem already toasts the failure and rethrows; swallow it here so the
    // chain never produces an unhandled rejection.
    runPending(node._id, async () => {
      if (nextStatus === 'COMPLETED' && (node.status === 'NOT_STARTED' || node.status === 'BLOCKED')) {
        await updateItem(node, { status: 'IN_PROGRESS' });
        await updateItem(node, { status: 'COMPLETED' });
      } else {
        await updateItem(node, { status: nextStatus });
      }
    }).catch(() => {});
  };

  const changeStatus = (node, status) => {
    if (!status || status === node.status) return;
    runPending(node._id, () => updateItem(node, { status })).catch(() => {});
  };

  const handleDeleteEvent = async () => {
    setDeleting(true);
    try {
      await api.delete(`/events/${id}`);
      toast(`Event "${event.title}" deleted`);
      navigate('/execution');
    } catch (err) {
      toast(err.message || 'Failed to delete event', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold tracking-tight">{event.title}</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <span>{formatDateUTC(event.startDate)}{event.endDate ? ` → ${formatDateUTC(event.endDate)}` : ''}</span>
              {event.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.venue}</span>}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Chip kind={event.status}>{event.status}</Chip>
            {role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => setConfirmDeleteEvent(true)}
                title="Delete this scheduled event"
                className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Event</span>
              </button>
            )}
          </div>
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
              const isCompleted = node.status === 'COMPLETED';
              const busyRow = isPending(node._id);
              const canToggleStatus = !hasKids && !busyRow && (
                role === 'MEMBER'
                  ? (ownedNodeIds ? ownedNodeIds.has(String(node._id)) : false) && node.status !== 'COMPLETED'
                  : true
              );

              return (
                <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                  {hasKids ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-100 text-indigo-700">
                      {isCol ? <Folder className="h-3.5 w-3.5" /> : <FolderOpen className="h-3.5 w-3.5" />}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!canToggleStatus}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canToggleStatus) toggleStatus(node);
                      }}
                      title={busyRow ? 'Updating…' : (isCompleted ? 'Mark in progress' : 'Mark completed')}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition ${canToggleStatus ? 'cursor-pointer hover:bg-emerald-50' : 'cursor-not-allowed opacity-60'}`}
                    >
                      {busyRow
                        ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" aria-hidden="true" />
                        : isCompleted ? <CheckSquare className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4 text-slate-300 hover:text-emerald-500" />}
                    </button>
                  )}

                   <button
                     type="button"
                     onClick={(e) => { e.stopPropagation(); setActiveDrawerItem(node); }}
                     title="Click to open task detail drawer"
                     className={`text-xs transition-all text-left hover:text-indigo-600 hover:underline ${hasKids ? 'font-bold text-slate-900' : (isCompleted ? 'line-through text-slate-400 font-medium' : 'font-semibold text-slate-800')}`}
                   >
                     {node.title}
                   </button>

                  <Chip kind={node.status}>{label(node.status)}</Chip>

                  {node.priority && (
                    <span className={`shrink-0 text-[10px] uppercase ${PRIORITY_TEXT[node.priority]}`}>{node.priority}</span>
                  )}

                  {node.dueDate && (() => {
                    const overdue = isOverdue(node.dueDate);
                    return (
                      <span className={`flex shrink-0 flex-wrap items-center gap-1 text-[10px] ${overdue ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>
                        <span className="hidden sm:inline">due {formatDateUTC(node.dueDate)}</span>
                        <span className="sm:hidden">{relativeDate(node.dueDate)}</span>
                        {overdue && <span className="rounded bg-rose-100 px-1 py-0.5 text-[9px] font-bold text-rose-700">OVERDUE</span>}
                      </span>
                    );
                  })()}
                </div>
              );
            }}
            renderActions={(node, { hasKids }) => {
              const options = statusOptionsFor(node);
              const busyRow = isPending(node._id);
              // Merge any in-flight optimistic edit over the server value.
              const p = patched[node._id] || {};
              const assigneeId = 'assigneeId' in p ? p.assigneeId : node.assigneeId;
              const priority = 'priority' in p ? p.priority : node.priority;
              const dueDate = 'dueDate' in p ? p.dueDate : node.dueDate;
              // CL-M3 parity: same owned-branch check as the row checkbox (canToggleStatus),
              // not just direct assignment — a MEMBER who owns an ancestor folder must get
              // the same status options here as the checkbox already grants them.
              const canEditStatus = !hasKids && !busyRow && (
                role === 'MEMBER'
                  ? (ownedNodeIds ? ownedNodeIds.has(String(node._id)) : false) && node.status !== 'COMPLETED'
                  : true
              );
              return (
                <>
                  {isManager && (
                    <select
                      value={assigneeId?._id || assigneeId || ''}
                      disabled={busyRow}
                      onChange={e => runPending(node._id, () => updateItem(node, { assigneeId: e.target.value || null })).catch(() => {})}
                      aria-label={`Assignee for ${node.title}`}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                    >
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                    </select>
                  )}
                  {!isManager && assigneeId && (
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                      {typeof assigneeId === 'object' ? assigneeId.name : 'Assigned'}
                    </span>
                  )}

                  {isManager && (
                    <select
                      value={priority}
                      disabled={busyRow}
                      onChange={e => runPending(node._id, () => updateItem(node, { priority: e.target.value })).catch(() => {})}
                      aria-label={`Priority for ${node.title}`}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                    >
                      {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p2 => <option key={p2} value={p2}>{p2}</option>)}
                    </select>
                  )}

                  {isManager && (
                    <input
                      type="date"
                      value={dueDate ? toDateInputValue(dueDate) : ''}
                      disabled={busyRow}
                      onChange={e => runPending(node._id, () => updateItem(node, { dueDate: e.target.value || null })).catch(() => {})}
                      aria-label={`Due date for ${node.title}`}
                      className="min-h-[32px] rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                    />
                  )}

                  {canEditStatus && options.length > 0 ? (
                    <select
                      value={node.status}
                      onChange={e => changeStatus(node, e.target.value)}
                      aria-label={`Status of ${node.title}`}
                      className={`rounded-md border px-2 py-1.5 text-[11px] font-bold uppercase ${STATUS_CHIP[node.status] || STATUS_CHIP.NOT_STARTED}`}
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
                      className="min-h-[32px] min-w-[32px] rounded p-1.5 text-slate-400 opacity-0 transition hover:bg-indigo-100 hover:text-indigo-700 focus:opacity-100 group-hover/row:opacity-100"
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
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => { setAddModal(null); setTitle(''); }} className="min-h-[36px] px-3 text-xs font-semibold text-slate-600">Cancel</button>
            <button onClick={addChild} disabled={!title.trim() || adding}
              className="min-h-[36px] rounded-lg bg-indigo-600 px-3.5 text-xs font-semibold text-white disabled:opacity-50">{adding ? 'Adding…' : 'Add'}</button>
          </div>
        </Modal>
      )}

      {/* Confirm Delete Event Dialog */}
      {confirmDeleteEvent && (
        <ConfirmDialog
           title={`Delete Event "${event.title}"?`}
           message="Are you sure you want to delete this scheduled event? All execution items and progress data for this event will be permanently removed."
           confirmLabel="Delete Event"
           busy={deleting}
           onConfirm={handleDeleteEvent}
           onCancel={() => setConfirmDeleteEvent(false)}
         />
      )}

      {/* Task Detail Slide-Over Side Drawer */}
      <TaskDetailDrawer
        isOpen={!!activeDrawerItem}
        onClose={() => setActiveDrawerItem(null)}
        item={activeDrawerItem}
        onUpdate={async (item, patch) => {
          // Let the rejection propagate: the drawer renders the error inline
          // from its own catch, and updateItem has already toasted it.
          await updateItem(item, patch);
          setActiveDrawerItem(prev => prev ? { ...prev, ...patch } : null);
        }}
        users={users}
        currentUser={user}
        isManager={isManager}
      />
    </div>
  );
}
