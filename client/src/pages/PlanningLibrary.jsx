import { useState, useEffect } from 'react';
import {
  Folder, FolderOpen, FileText, FolderPlus,
  Pencil, FolderSymlink, Trash2, Plus
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import TreeView from '../components/common/TreeView';
import DropdownMenu from '../components/common/DropdownMenu';
import { Modal, ConfirmDialog, EmptyState, ErrorState, SkeletonCard } from '../components/common';

export default function PlanningLibrary() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [modal, setModal] = useState(null); // {type:'add'|'rename'|'move', node, title, parentId}
  const [confirm, setConfirm] = useState(null); // {node, total}
  const [busy, setBusy] = useState(false);

  const toast = useToast();

  // IMP-B2: skeleton only on first paint; mutations refresh silently
  const load = (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    api.get('/planning-items', { params: { scope: 'LIBRARY' } })
      .then(data => { setTree(data); })
      .catch(err => setError(err.message || 'Failed to load library'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Collect a node's whole subtree ids (IMP-C5: never offer them as move targets)
  const subtreeIds = node => {
    const ids = [];
    const walk = n => n.children.forEach(c => { ids.push(c._id); walk(c); });
    walk(node);
    return ids;
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

  const addChild = () => runAction(async () => {
    const title = modal?.title?.trim();
    if (!title) return;
    try {
      await api.post('/planning-items', { title, scope: 'LIBRARY', parentId: modal.node?._id || null });
      setModal(null); load(true);
      toast(`Added "${title}"`);
    } catch (err) { toast(err.message || 'Failed to add', 'error'); }
  });

  const rename = () => runAction(async () => {
    const title = modal?.title?.trim();
    if (!title) return;
    try {
      await api.put(`/planning-items/${modal.node._id}`, { title });
      setModal(null); load(true);
      toast('Item renamed');
    } catch (err) { toast(err.message || 'Failed to rename', 'error'); }
  });

  const move = () => runAction(async () => {
    try {
      await api.put(`/planning-items/${modal.node._id}/move`, { newParentId: modal.parentId ?? null });
      setModal(null); load(true);
      toast('Item moved');
    } catch (err) {
      setModal(null); load(true);
      toast(err.code === 'CYCLE_DETECTED' ? 'Cannot move under its own descendant' : (err.message || 'Move failed'), 'error');
    }
  });

  const remove = () => runAction(async () => {
    try {
      await api.delete(`/planning-items/${confirm.node._id}`);
      setConfirm(null); load(true);
      toast('Item and sub-tree deleted');
    } catch (err) { setConfirm(null); toast(err.message || 'Delete failed', 'error'); }
  });

  const countAll = n => n.children.reduce((acc, c) => acc + 1 + countAll(c), 0);

  const expandAll = () => setCollapsed({});
  const collapseAll = list => {
    const next = {};
    const walk = nodes => nodes.forEach(n => { if (n.children.length) { next[n._id] = true; walk(n.children); } });
    walk(list);
    setCollapsed(next);
  };

  const flatNodes = [];
  const walkFlat = (nodes, depth) => nodes.forEach(n => { flatNodes.push({ ...n, depth }); walkFlat(n.children, depth + 1); });
  walkFlat(tree, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-64" />
      </div>
    );
  }

  if (error && tree.length === 0) {
    return <ErrorState message={error} onRetry={load} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Planning Library</h2>
          <p className="text-xs text-slate-500">Master templates used to construct event blueprints</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <>
              <button onClick={expandAll} className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Expand All</button>
              <button onClick={() => collapseAll(tree)} className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Collapse All</button>
              <button onClick={() => setModal({ type: 'add', node: null, title: '' })} className="flex min-h-[40px] items-center gap-1 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500">
                <Plus className="h-3.5 w-3.5" />New Item
              </button>
            </>
          ) : (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
              Read-only view (Admin required for edits)
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        {tree.length === 0 ? (
          <EmptyState
            icon={FolderPlus}
            title="The library is empty"
            hint={isAdmin ? 'Add your first master template item.' : 'No master templates defined yet.'}
            action={isAdmin && (
              <button onClick={() => setModal({ type: 'add', node: null, title: '' })} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500">
                + New Item
              </button>
            )}
          />
        ) : (
          <TreeView
            nodes={tree}
            isCollapsed={n => !!collapsed[n._id]}
            onToggle={id => setCollapsed(c => ({ ...c, [id]: !c[id] }))}
            rowClassName={(n, hasKids) => `bg-slate-50 ${hasKids ? 'hover:bg-indigo-50/50' : ''}`}
            renderMain={(node, { hasKids }) => {
              const isCol = !!collapsed[node._id];
              return (
                <>
                  {hasKids
                    ? (isCol ? <Folder className="h-4 w-4 shrink-0 text-indigo-600" /> : <FolderOpen className="h-4 w-4 shrink-0 text-indigo-600" />)
                    : <FileText className="h-4 w-4 shrink-0 text-indigo-600" />}
                  <span className="truncate text-sm font-semibold text-slate-800">{node.title}</span>
                  {hasKids && isCol && (
                    <span className="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                      {node.children.length} hidden
                    </span>
                  )}
                </>
              );
            }}
            renderActions={isAdmin ? (node) => (
              <DropdownMenu
                label={`Actions for ${node.title}`}
                buttonClassName="min-h-[32px] min-w-[32px] rounded p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-200 hover:text-slate-700 focus:opacity-100 group-hover:opacity-100"
              >
                {close => (
                  <>
                    <button role="menuitem" onClick={() => { close(); setModal({ type: 'add', node, title: '' }); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">
                      <FolderPlus className="h-3.5 w-3.5" />Add Child
                    </button>
                    <button role="menuitem" onClick={() => { close(); setModal({ type: 'rename', node, title: node.title }); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">
                      <Pencil className="h-3.5 w-3.5" />Rename
                    </button>
                    <button role="menuitem" onClick={() => { close(); setModal({ type: 'move', node, parentId: node.parentId }); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">
                      <FolderSymlink className="h-3.5 w-3.5" />Move
                    </button>
                    <div className="mx-2 my-1 border-t border-slate-100" />
                    <button role="menuitem" onClick={() => { close(); setConfirm({ node, total: 1 + countAll(node) }); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-3.5 w-3.5" />Delete
                    </button>
                  </>
                )}
              </DropdownMenu>
            ) : undefined}
            renderCollapsed={node => (
              <div className="ml-[11px] pl-5">
                <button
                  onClick={() => setCollapsed(c => ({ ...c, [node._id]: false }))}
                  className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-200"
                >
                  {node.children.length} hidden
                </button>
              </div>
            )}
          />
        )}
      </div>

      {(modal?.type === 'add' || modal?.type === 'rename') && (
        <Modal onClose={() => setModal(null)} labelledBy="lib-modal-title">
          <h3 id="lib-modal-title" className="mb-3 text-base font-bold text-slate-900">
            {modal.type === 'add' ? `Add ${modal.node ? 'Child' : 'Root'} Item` : 'Rename'}
          </h3>
          <input
            autoFocus
            value={modal.title}
            onChange={e => setModal(m => ({ ...m, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && !busy && modal.title.trim() && (modal.type === 'add' ? addChild() : rename())}
            placeholder="Item title"
            aria-label="Item title"
            aria-invalid={!modal.title.trim()}
            className={`w-full rounded-lg border p-2.5 text-xs font-semibold ${modal.title.trim() ? 'border-slate-300' : 'border-rose-300'}`}
          />
          {!modal.title.trim() && (
            <p className="mt-1.5 text-[11px] font-medium text-rose-600">Title is required.</p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-slate-600">Cancel</button>
            <button
              onClick={() => (modal.type === 'add' ? addChild() : rename())}
              disabled={busy || !modal.title.trim()}
              className="min-h-[36px] rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {modal?.type === 'move' && (
        <Modal onClose={() => setModal(null)} labelledBy="lib-move-title">
          <h3 id="lib-move-title" className="mb-3 text-base font-bold text-slate-900">Move "{modal.node.title}"</h3>
          <label htmlFor="lib-move-parent" className="mb-1 block text-xs font-semibold text-slate-700">New parent</label>
          <select
            id="lib-move-parent"
            value={modal.parentId ?? ''}
            onChange={e => setModal(m => ({ ...m, parentId: e.target.value || null }))}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-semibold"
          >
            <option value="">Root level</option>
            {flatNodes
              .filter(n => n._id !== modal.node._id && !subtreeIds(modal.node).includes(n._id))
              .map(n => (
                <option key={n._id} value={n._id}>{'\u00A0'.repeat(n.depth * 2)}{n.title}</option>
              ))}
          </select>
          <p className="mt-1.5 text-[11px] text-slate-400">A branch cannot be moved inside itself.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-slate-600">Cancel</button>
            <button onClick={move} disabled={busy} className="min-h-[36px] rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50">Move</button>
          </div>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title={`Delete "${confirm.node.title}"?`}
          message={
            <>
              This permanently removes <b>{confirm.total} item{confirm.total === 1 ? '' : 's'}</b> including all descendants:
              <ul className="mt-1.5 list-inside list-disc">
                {confirm.node.children.slice(0, 5).map(c => <li key={c._id}>{c.title}</li>)}
                {confirm.total > 6 && <li>…and {confirm.total - 6} more</li>}
              </ul>
            </>
          }
          confirmLabel={`Delete ${confirm.total} item${confirm.total === 1 ? '' : 's'}`}
          onConfirm={remove}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
