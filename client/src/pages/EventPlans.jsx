import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ClipboardList, ArrowLeft, ChevronRight, Folder, FolderOpen,
  FileText, FolderPlus, Trash2, Plus, DownloadCloud
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import TreeView from '../components/common/TreeView';
import DropdownMenu from '../components/common/DropdownMenu';
import { Modal, ConfirmDialog, Spinner, EmptyState, ErrorState, SkeletonCard } from '../components/common';

export default function EventPlans() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [searchParams, setSearchParams] = useSearchParams();

  // IMP-C10: open plan lives in the URL (?plan=<id>) — refresh/back/bookmark safe
  const selectedId = searchParams.get('plan');

  const [plans, setPlans] = useState([]);
  const [planTree, setPlanTree] = useState([]);
  const [libraryRoots, setLibraryRoots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plansError, setPlansError] = useState('');
  const [itemsError, setItemsError] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [modal, setModal] = useState(null);   // create-plan | add | import
  const [confirm, setConfirm] = useState(null); // delete-plan | delete-item
  const [busy, setBusy] = useState(false);

  const toast = useToast();

  const [itemsLoading, setItemsLoading] = useState(false);

  // IMP-B1: surface load errors instead of faking an empty list
  const loadPlans = () => {
    setLoading(true);
    setPlansError('');
    api.get('/event-plans')
      .then(setPlans)
      .catch(err => setPlansError(err.message || 'Failed to load plans'))
      .finally(() => setLoading(false));
  };

  const loadPlanItems = useCallback(id => {
    if (!id) {
      setPlanTree([]);
      setItemsError('');
      return;
    }
    setItemsError('');
    setItemsLoading(true);
    setPlanTree([]); // CL-M8: clear tree to avoid flash of stale plan data
    api.get('/planning-items', { params: { scope: 'PLAN', planId: id } })
      .then(setPlanTree)
      .catch(err => setItemsError(err.message || 'Failed to load plan modules'))
      .finally(() => setItemsLoading(false));
  }, []);

  useEffect(() => { loadPlans(); }, []);
  useEffect(() => { loadPlanItems(selectedId); }, [selectedId, loadPlanItems]);

  // Stale ?plan=<deleted id> -> fall back to the grid
  useEffect(() => {
    if (selectedId && !loading && !plansError && plans.length > 0 && !plans.some(p => p._id === selectedId)) {
      setSearchParams({});
    }
  }, [selectedId, loading, plansError, plans, setSearchParams]);

  const selectPlan = id => {
    setCollapsed({});
    if (id) setSearchParams({ plan: id });
    else setSearchParams({});
  };

  const runAction = async fn => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const createPlan = () => runAction(async () => {
    try {
      const created = await api.post('/event-plans', {
        title: modal.title.trim(),
        category: modal.category.trim() || 'General',
        description: modal.description.trim()
      });
      await new Promise(resolve => {
        api.get('/event-plans').then(data => { setPlans(data); resolve(); }).catch(resolve);
      });
      setModal(null);
      selectPlan(created._id);
      toast(`Created "${created.title}"`);
    } catch (err) { toast(err.message || 'Create failed', 'error'); }
  });

  const deletePlan = () => runAction(async () => {
    try {
      await api.delete(`/event-plans/${confirm.plan._id}`);
      setConfirm(null);
      selectPlan(null);
      loadPlans();
      toast('Plan deleted');
    } catch (err) { setConfirm(null); toast(err.message || 'Delete failed', 'error'); }
  });

  const addCustomItem = () => runAction(async () => {
    const title = modal?.title?.trim();
    if (!title) return;
    try {
      await api.post('/planning-items', {
        title, scope: 'PLAN', planId: selectedId, parentId: modal.node?._id || null
      });
      setModal(null); loadPlanItems(selectedId);
      toast(`Added "${title}"`);
    } catch (err) { toast(err.message || 'Add failed', 'error'); }
  });

  const deleteItem = () => runAction(async () => {
    try {
      await api.delete(`/planning-items/${confirm.item._id}`);
      setConfirm(null); loadPlanItems(selectedId);
      toast('Item deleted from blueprint');
    } catch (err) { setConfirm(null); toast(err.message || 'Delete failed', 'error'); }
  });

  const openImportDialog = async () => {
    try {
      const lib = await api.get('/planning-items', { params: { scope: 'LIBRARY' } });
      setLibraryRoots(lib);
      setModal({ type: 'import' });
    } catch (err) { toast(err.message || 'Could not load library', 'error'); }
  };

  const importModule = libRoot => runAction(async () => {
    try {
      const res = await api.post(`/event-plans/${selectedId}/items/from-library`, { libraryItemId: libRoot._id });
      setModal(null); loadPlanItems(selectedId);
      toast(res.copiedCount ? `Imported ${res.copiedCount} items` : 'Module imported');
    } catch (err) { toast(err.message || 'Import failed', 'error'); }
  });

  const countAll = n => n.children.reduce((acc, c) => acc + 1 + countAll(c), 0);

  const selectedPlan = plans.find(p => p._id === selectedId);

  // ============ BUILDER VIEW ============
  if (selectedPlan) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => selectPlan(null)} aria-label="Back to all plans"
              className="min-h-[40px] rounded-lg border border-slate-300 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-indigo-600">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-bold tracking-tight">{selectedPlan.title}</h2>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">{selectedPlan.category}</span>
              </div>
              <p className="truncate text-xs text-slate-500">{selectedPlan.description || 'No description'}</p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setConfirm({ type: 'delete-plan', plan: selectedPlan })}
                className="min-h-[36px] rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-sm hover:bg-rose-50">Delete Plan</button>
              <button onClick={() => setModal({ type: 'add', node: null, title: '' })}
                className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">+ Add Custom Module</button>
              <button onClick={openImportDialog}
                className="min-h-[36px] rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500">+ Import Library Module</button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          {itemsError ? (
            <ErrorState message={itemsError} onRetry={() => loadPlanItems(selectedId)} />
          ) : itemsLoading ? (
            <Spinner label="Loading plan structure..." className="py-12" />
          ) : (
            <>
              {planTree.length > 0 && (
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">Plan Structure</h3>
                  <div className="flex gap-1.5">
                    <button onClick={() => setCollapsed({})} className="min-h-[32px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Expand All</button>
                    <button onClick={() => {
                      const next = {};
                      const walk = nodes => nodes.forEach(n => { if (n.children.length) { next[n._id] = true; walk(n.children); } });
                      walk(planTree);
                      setCollapsed(next);
                    }} className="min-h-[32px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Collapse All</button>
                  </div>
                </div>
              )}

              {planTree.length === 0 ? (
                <EmptyState
                  icon={FolderPlus}
                  title="No modules in this plan yet"
                  hint={<span>Use <b>+ Add Custom Module</b> to build from scratch or <b>+ Import Library Module</b> to copy master templates.</span>}
                />
              ) : (
                <TreeView
                  nodes={planTree}
                  isCollapsed={n => !!collapsed[n._id]}
                  onToggle={id => setCollapsed(c => ({ ...c, [id]: !c[id] }))}
                  rowClassName={() => 'bg-slate-50 hover:bg-indigo-50/50'}
                  renderMain={(node, { hasKids }) => {
                    const isCol = !!collapsed[node._id];
                    const isLib = !!node.sourceLibraryItemId;
                    return (
                      <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                        {hasKids
                          ? (isCol ? <Folder className={`h-4 w-4 shrink-0 ${isLib ? 'text-indigo-600' : 'text-emerald-600'}`} /> : <FolderOpen className={`h-4 w-4 shrink-0 ${isLib ? 'text-indigo-600' : 'text-emerald-600'}`} />)
                          : <FileText className={`h-4 w-4 shrink-0 ${isLib ? 'text-indigo-600' : 'text-emerald-600'}`} />}
                        <span className="truncate text-xs font-semibold text-slate-800">{node.title}</span>
                        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${isLib ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                          {isLib ? 'Library' : 'Custom'}
                        </span>

                        {/* Hover Action Toolbar - Placed directly inline after the title text */}
                        {isAdmin && (
                          <div className="ml-2 inline-flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover/row:opacity-100 focus-within:opacity-100">
                            <button
                              type="button"
                              title="Add Child Sub-module"
                              onClick={(e) => { e.stopPropagation(); setModal({ type: 'add', node, title: '' }); }}
                              className="flex items-center gap-1 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-indigo-500 transition cursor-pointer"
                            >
                              <FolderPlus className="h-3 w-3" />
                              <span>+ Child</span>
                            </button>

                            <button
                              type="button"
                              title="Delete from plan"
                              onClick={(e) => { e.stopPropagation(); setConfirm({ type: 'delete-item', item: node, total: 1 + countAll(node) }); }}
                              className="rounded border border-rose-200 bg-rose-50 p-0.5 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }}
                  renderActions={() => null}
                  renderCollapsed={node => (
                    <div className="ml-[11px] pl-5">
                      <button onClick={() => setCollapsed(c => ({ ...c, [node._id]: false }))}
                        className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-200">
                        {node.children.length} hidden
                      </button>
                    </div>
                  )}
                />
              )}
            </>
          )}
        </div>

        {modal?.type === 'add' && (
          <Modal onClose={() => setModal(null)} labelledBy="plan-add-title">
            <h3 id="plan-add-title" className="mb-3 text-base font-bold text-slate-900">Add Custom Module</h3>
            <input autoFocus value={modal.title} onChange={e => setModal(m => ({ ...m, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && !busy && modal.title.trim() && addCustomItem()}
              placeholder="e.g. Security & Entrance Gate Setup" aria-label="Module title"
              aria-invalid={!modal.title.trim()}
              className={`w-full rounded-lg border p-2.5 text-xs font-semibold ${modal.title.trim() ? 'border-slate-300' : 'border-rose-300'}`} />
            {!modal.title.trim() && <p className="mt-1.5 text-[11px] font-medium text-rose-600">Title is required.</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-slate-600">Cancel</button>
              <button onClick={addCustomItem} disabled={busy || !modal.title.trim()} className="min-h-[36px] rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50">{busy ? 'Adding…' : 'Add'}</button>
            </div>
          </Modal>
        )}

        {confirm?.type === 'delete-item' && (
          <ConfirmDialog
            title={`Delete "${confirm.item.title}"?`}
            message={<>This removes <b>{confirm.total} item{confirm.total === 1 ? '' : 's'}</b> from the blueprint.</>}
            confirmLabel={`Delete ${confirm.total} item${confirm.total === 1 ? '' : 's'}`}
            onConfirm={deleteItem}
            onCancel={() => setConfirm(null)}
          />
        )}

        {confirm?.type === 'delete-plan' && (
          <ConfirmDialog
            title="Delete this plan?"
            message={<>Blueprint <b>{confirm.plan.title}</b> will be permanently removed. This does not affect the Library or scheduled events.</>}
            confirmLabel="Delete Plan"
            onConfirm={deletePlan}
            onCancel={() => setConfirm(null)}
          />
        )}

        {modal?.type === 'import' && (
          <Modal onClose={() => setModal(null)} labelledBy="import-title" wide>
            <h3 id="import-title" className="text-base font-bold text-slate-900">Import Library Module</h3>
            <p className="mb-4 mt-1 text-xs text-slate-500">Select a master module to deep-copy into this blueprint:</p>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {libraryRoots.map(root => (
                <div key={root._id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900">{root.title}</p>
                    <p className="text-[11px] text-slate-500">{countAll(root) + 1} items included</p>
                  </div>
                  <button onClick={() => importModule(root)} disabled={busy} className="min-h-[36px] shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50">Import</button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
              <button onClick={() => setModal(null)} className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-slate-600">Close</button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // ============ ICON GRID VIEW ============
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Event Plan Blueprints</h2>
          <p className="text-xs text-slate-500">Click any plan to open its planning builder</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal({ type: 'create-plan', title: '', category: '', description: '' })}
            className="min-h-[40px] rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500">
            + Create New Plan
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} className="h-48" />)}
        </div>
      ) : plansError ? (
        <ErrorState message={plansError} onRetry={loadPlans} />
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <EmptyState
            icon={ClipboardList}
            title="No event plans yet"
            hint={isAdmin ? 'Create your first plan blueprint to get started.' : 'Admin has not created any plans yet.'}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map(p => (
            <button key={p._id} onClick={() => selectPlan(p._id)}
              className="group relative cursor-pointer space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-card transition hover:border-indigo-300 hover:shadow-md">
              <div className="flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100 transition group-hover:bg-indigo-600 group-hover:text-white">
                  <ClipboardList className="h-6 w-6" />
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">{p.category}</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 transition group-hover:text-indigo-600">{p.title}</h3>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{p.description || 'No description'}</p>
              </div>
              <p className="flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:underline">Open Planning →</p>
            </button>
          ))}
        </div>
      )}

      {modal?.type === 'create-plan' && (
        <Modal onClose={() => setModal(null)} labelledBy="create-plan-title">
          <h3 id="create-plan-title" className="mb-3 text-base font-bold text-slate-900">Create New Event Plan</h3>
          <div className="space-y-3">
            <input value={modal.title} onChange={e => setModal(m => ({ ...m, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && !busy && modal.title.trim() && createPlan()}
              placeholder="Plan title (e.g. Annual Cultural Fest 2026)" aria-label="Plan title"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-semibold" />
            <input value={modal.category} onChange={e => setModal(m => ({ ...m, category: e.target.value }))}
              placeholder="Category (e.g. Cultural & Arts)" aria-label="Category"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-semibold" />
            <input value={modal.description} onChange={e => setModal(m => ({ ...m, description: e.target.value }))}
              placeholder="Description" aria-label="Description"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-semibold" />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-slate-600">Cancel</button>
            <button onClick={createPlan} disabled={busy || !modal.title.trim()} className="min-h-[36px] rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50">{busy ? 'Creating…' : 'Create Plan'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
