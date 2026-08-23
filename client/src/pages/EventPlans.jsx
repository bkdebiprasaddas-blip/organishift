import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, ArrowLeft, ChevronRight, Folder, FolderOpen,
  FileText, EllipsisVertical, FolderPlus, Trash2, Plus, DownloadCloud
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import TreeView from '../components/common/TreeView';
import { Modal, ConfirmDialog, EmptyState, Spinner } from '../components/common';

export default function EventPlans() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [planTree, setPlanTree] = useState([]);
  const [libraryRoots, setLibraryRoots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState({});
  const [kebabId, setKebabId] = useState(null);
  const [modal, setModal] = useState(null);   // create-plan | add | import
  const [confirm, setConfirm] = useState(null); // delete-plan | delete-item

  const toast = useToast();

  const loadPlans = () =>
    api.get('/event-plans').then(setPlans).catch(() => setPlans([])).finally(() => setLoading(false));

  const loadPlanItems = useCallback(id => {
    if (!id) return;
    api.get('/planning-items', { params: { scope: 'PLAN', planId: id } })
      .then(setPlanTree)
      .catch(() => setPlanTree([]));
  }, []);

  useEffect(() => { loadPlans(); }, []);
  useEffect(() => { loadPlanItems(selectedId); }, [selectedId, loadPlanItems]);

  useEffect(() => {
    const close = e => { if (!e.target.closest('[data-kebab]')) setKebabId(null); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const createPlan = async () => {
    try {
      const created = await api.post('/event-plans', {
        title: modal.title.trim(),
        category: modal.category.trim() || 'General',
        description: modal.description.trim()
      });
      await loadPlans();
      setModal(null);
      setSelectedId(created._id);
      toast(`Created "${created.title}"`);
    } catch (err) { toast(err.message || 'Create failed', 'error'); }
  };

  const deletePlan = async () => {
    try {
      await api.delete(`/event-plans/${confirm.plan._id}`);
      setConfirm(null);
      setSelectedId(null);
      await loadPlans();
      toast('Plan deleted');
    } catch (err) { setConfirm(null); toast(err.message || 'Delete failed', 'error'); }
  };

  const addCustomItem = async () => {
    const title = modal?.title?.trim();
    if (!title) return;
    try {
      await api.post('/planning-items', {
        title, scope: 'PLAN', planId: selectedId, parentId: modal.node?._id || null
      });
      setModal(null); loadPlanItems(selectedId);
      toast(`Added "${title}"`);
    } catch (err) { toast(err.message || 'Add failed', 'error'); }
  };

  const deleteItem = async () => {
    try {
      await api.delete(`/planning-items/${confirm.item._id}`);
      setConfirm(null); loadPlanItems(selectedId);
      toast('Item deleted from blueprint');
    } catch (err) { setConfirm(null); toast(err.message || 'Delete failed', 'error'); }
  };

  const openImportDialog = async () => {
    try {
      const lib = await api.get('/planning-items', { params: { scope: 'LIBRARY' } });
      setLibraryRoots(lib);
      setModal({ type: 'import' });
    } catch (err) { toast(err.message || 'Could not load library', 'error'); }
  };

  const importModule = async libRoot => {
    try {
      const res = await api.post(`/event-plans/${selectedId}/items/from-library`, { libraryItemId: libRoot._id });
      setModal(null); loadPlanItems(selectedId);
      toast(res.copiedCount ? `Imported ${res.copiedCount} items` : 'Module imported');
    } catch (err) { toast(err.message || 'Import failed', 'error'); }
  };

  const countAll = n => n.children.reduce((acc, c) => acc + 1 + countAll(c), 0);

  const selectedPlan = plans.find(p => p._id === selectedId);

  // ============ BUILDER VIEW ============
  if (selectedPlan) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setSelectedId(null)} aria-label="Back to all plans"
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
                const isLib = node.source === 'LIBRARY';
                return (
                  <>
                    {hasKids
                      ? (isCol ? <Folder className={`h-4 w-4 shrink-0 ${isLib ? 'text-indigo-600' : 'text-emerald-600'}`} /> : <FolderOpen className={`h-4 w-4 shrink-0 ${isLib ? 'text-indigo-600' : 'text-emerald-600'}`} />)
                      : <FileText className={`h-4 w-4 shrink-0 ${isLib ? 'text-indigo-600' : 'text-emerald-600'}`} />}
                    <span className="truncate text-xs font-semibold text-slate-800">{node.title}</span>
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${isLib ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                      {isLib ? 'Library' : 'Custom'}
                    </span>
                  </>
                );
              }}
              renderActions={isAdmin ? (node) => (
                <>
                  <button
                    data-kebab
                    aria-label={`Actions for ${node.title}`}
                    onClick={e => { e.stopPropagation(); setKebabId(kebabId === node._id ? null : node._id); }}
                    className={`min-h-[32px] min-w-[32px] rounded p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-200 hover:text-slate-700 focus:opacity-100 group-hover:opacity-100 ${kebabId === node._id ? '!opacity-100' : ''}`}
                  >
                    <EllipsisVertical className="h-4 w-4" />
                  </button>
                  {kebabId === node._id && (
                    <div data-kebab className="absolute right-3 top-11 z-20 w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
                      <button onClick={() => { setKebabId(null); setModal({ type: 'add', node, title: '' }); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">
                        <FolderPlus className="h-3.5 w-3.5" />Add Child
                      </button>
                      <div className="mx-2 my-1 border-t border-slate-100" />
                      <button onClick={() => { setKebabId(null); setConfirm({ type: 'delete-item', item: node, total: 1 + countAll(node) }); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                        <Trash2 className="h-3.5 w-3.5" />Delete
                      </button>
                    </div>
                  )}
                </>
              ) : undefined}
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
        </div>

        {modal?.type === 'add' && (
          <Modal onClose={() => setModal(null)} labelledBy="plan-add-title">
            <h3 id="plan-add-title" className="mb-3 text-base font-bold text-slate-900">Add Custom Module</h3>
            <input autoFocus value={modal.title} onChange={e => setModal(m => ({ ...m, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addCustomItem()}
              placeholder="e.g. Security & Entrance Gate Setup" aria-label="Module title"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-semibold" />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-slate-600">Cancel</button>
              <button onClick={addCustomItem} className="min-h-[36px] rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm">Add</button>
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
                  <button onClick={() => importModule(root)} className="min-h-[36px] shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500">Import</button>
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
          {[1, 2, 3].map(i => <div key={i} className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white" />)}
        </div>
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
            <button key={p._id} onClick={() => { setSelectedId(p._id); setCollapsed({}); }}
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
              onKeyDown={e => e.key === 'Enter' && createPlan()}
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
            <button onClick={createPlan} disabled={!modal.title.trim()} className="min-h-[36px] rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50">Create Plan</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
