import { useState, useEffect, useMemo } from 'react';
import {
  Folder, FolderOpen, FileText, FolderPlus,
  Pencil, FolderSymlink, Trash2, Plus, Search,
  Boxes, Layers, ListTree, Sparkles, Download, Copy, Check,
  StickyNote, CornerDownRight, FileQuestion, CheckSquare, Square
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
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState(null); // {type:'addRoot'|'addFolder'|'addItem'|'edit', node, title, description, parentId}
  const [confirm, setConfirm] = useState(null); // {node, total}
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  // CL-L4: persist checkoff state to localStorage so it survives reloads
  const [checkedItems, setCheckedItems] = useState(() => {
    try {
      const saved = localStorage.getItem('organishift_library_checked');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const toggleChecklist = (id) => {
    setCheckedItems(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('organishift_library_checked', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const toast = useToast();

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    api.get('/planning-items', { params: { scope: 'LIBRARY' } })
      .then(data => { setTree(data); })
      .catch(err => setError(err.message || 'Failed to load library'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Subtree IDs helper to prevent cycle during move
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

  const saveItem = () => runAction(async () => {
    const title = modal?.title?.trim();
    const description = modal?.description?.trim() || '';
    if (!title) return;

    try {
       if (modal.type === 'edit' || modal.type === 'detail') {
        await api.put(`/planning-items/${modal.node._id}`, { title, description });
        toast('Item updated');
      } else {
        await api.post('/planning-items', {
          title,
          description,
          scope: 'LIBRARY',
          parentId: modal.parentId || null
        });
        toast(`Added "${title}"`);
      }
      setModal(null);
      load(true);
    } catch (err) {
      toast(err.message || 'Action failed', 'error');
    }
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

   // Pre-built Quick Presets Generator
  const addPreset = (presetName, items) => runAction(async () => {
    let rootId;
    try {
      const rootRes = await api.post('/planning-items', { title: presetName, scope: 'LIBRARY', parentId: null });
      rootId = rootRes._id;
      for (const item of items) {
        await api.post('/planning-items', {
          title: typeof item === 'string' ? item : item.title,
          description: typeof item === 'string' ? '' : item.description || '',
          scope: 'LIBRARY',
          parentId: rootId
        });
      }
      setModal(null);
      load(true);
      toast(`Created preset template: "${presetName}"`);
    } catch (err) {
      // CL-L3: clean up orphan root on failure
      if (rootId) {
        try { await api.delete(`/planning-items/${rootId}`); } catch { /* ignore cleanup error */ }
      }
      toast(err.message || 'Failed to add preset', 'error');
    }
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

  // Statistics calculation
  const stats = useMemo(() => {
    const totalRoot = tree.length;
    let totalItems = 0;
    let maxDepth = 0;

    const calcDepth = (nodes, currentDepth) => {
      if (currentDepth > maxDepth) maxDepth = currentDepth;
      nodes.forEach(n => {
        totalItems++;
        if (n.children && n.children.length) calcDepth(n.children, currentDepth + 1);
      });
    };

    calcDepth(tree, tree.length > 0 ? 1 : 0);
    return { totalRoot, totalItems, maxDepth };
  }, [tree]);

  // Search filtering logic
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree;
    const q = searchQuery.toLowerCase().trim();

    const filterNodes = (nodes) => {
      return nodes.map(node => {
        const matchesSelf = node.title.toLowerCase().includes(q) || (node.description && node.description.toLowerCase().includes(q));
        const filteredChildren = filterNodes(node.children || []);
        if (matchesSelf || filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
        return null;
      }).filter(Boolean);
    };

    return filterNodes(tree);
  }, [tree, searchQuery]);

  // Export JSON functionality
  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tree, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "organishift_reusable_events.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast('Exported templates as JSON');
  };

  // Copy structure summary
  const copySummary = () => {
    let summaryText = `ORGANISHIFT REUSABLE EVENT TEMPLATES (${stats.totalItems} Items)\n\n`;
    const formatNode = (nodes, indent = '') => {
      nodes.forEach(n => {
        summaryText += `${indent}• ${n.title}${n.description ? ` (${n.description})` : ''}\n`;
        if (n.children && n.children.length) formatNode(n.children, indent + '  ');
      });
    };
    formatNode(tree);
    if (!navigator.clipboard) {
      toast('Clipboard not available', 'error');
      return;
    }
    navigator.clipboard.writeText(summaryText)
      .then(() => { setCopied(true); toast('Copied template summary to clipboard!'); setTimeout(() => setCopied(false), 2000); })
      .catch(() => toast('Failed to copy to clipboard', 'error'));
  };

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
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Reusable Event</h2>
          <p className="text-xs text-slate-500">Master blueprint templates with notes and folder organization</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <>
              <button onClick={() => setModal({ type: 'preset' })} className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
                <Sparkles className="h-3.5 w-3.5" />Presets
              </button>
              <button onClick={exportJSON} title="Export as JSON" className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Download className="h-3.5 w-3.5" />Export
              </button>
              <button onClick={copySummary} title="Copy summary to clipboard" className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>
              <button onClick={expandAll} className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Expand All</button>
              <button onClick={() => collapseAll(tree)} className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Collapse All</button>
              
              {/* Add Root Template Button */}
              <button onClick={() => setModal({ type: 'addRoot', node: null, title: '', description: '', parentId: null })} className="flex min-h-[40px] items-center gap-1 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500">
                <Plus className="h-3.5 w-3.5" />Add Root Template
              </button>
            </>
          ) : (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
              Read-only view (Admin required for edits)
            </span>
          )}
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Root Templates</p>
            <p className="text-lg font-bold text-slate-900">{stats.totalRoot}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <ListTree className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Sub-items</p>
            <p className="text-lg font-bold text-slate-900">{stats.totalItems}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Max Tree Depth</p>
            <p className="text-lg font-bold text-slate-900">{stats.maxDepth} {stats.maxDepth === 1 ? 'Level' : 'Levels'}</p>
          </div>
        </div>
      </div>

      {/* Search & Tool Bar */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search templates, tasks, or notes..."
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        {searchQuery && (
          <span className="text-xs font-semibold text-indigo-600">
            Showing matching items ({filteredTree.length})
          </span>
        )}
      </div>

      {/* Tree Content Container */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        {filteredTree.length === 0 ? (
          <EmptyState
            icon={FolderPlus}
            title={searchQuery ? "No matching templates found" : "The library is empty"}
            hint={searchQuery ? `No items match "${searchQuery}"` : (isAdmin ? 'Add your first master template item or use quick presets.' : 'No master templates defined yet.')}
            action={isAdmin && !searchQuery && (
              <button onClick={() => setModal({ type: 'addRoot', node: null, title: '', description: '', parentId: null })} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500">
                + Add Root Template
              </button>
            )}
          />
        ) : (
          <TreeView
            nodes={filteredTree}
            isCollapsed={n => !!collapsed[n._id]}
            onToggle={id => setCollapsed(c => ({ ...c, [id]: !c[id] }))}
            rowClassName={(n, hasKids) => hasKids ? 'bg-indigo-50/30 border-indigo-100/80 hover:bg-indigo-50/60' : 'bg-white border-slate-200 hover:bg-slate-50'}
            renderMain={(node, { hasKids }) => {
              const isCol = !!collapsed[node._id];
              const isChecked = !!checkedItems[node._id];
              return (
                <div
                  onClick={() => setModal({ type: 'detail', node, title: node.title, description: node.description || '' })}
                  title="Click to open item popup details"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setModal({ type: 'detail', node, title: node.title, description: node.description || '' }); } }}
                  role="button"
                  tabIndex={0}
                  className="flex flex-wrap items-center gap-2 min-w-0 flex-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                >
                  {hasKids ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-100 text-indigo-700">
                      {isCol ? <Folder className="h-3.5 w-3.5" /> : <FolderOpen className="h-3.5 w-3.5" />}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleChecklist(node._id); }}
                      title={isChecked ? "Mark unchecked" : "Mark checked"}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                    >
                      {isChecked ? <CheckSquare className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4 text-slate-300 hover:text-emerald-500" />}
                    </button>
                  )}

                   <button
                     type="button"
                     onClick={(e) => { e.stopPropagation(); setModal({ type: 'detail', node, title: node.title, description: node.description || '' }); }}
                     title="Click to open item popup details"
                     className={`text-xs transition-all text-left hover:text-indigo-600 ${hasKids ? 'font-bold text-slate-900' : (isChecked ? 'line-through text-slate-400 font-medium' : 'font-medium text-slate-800')}`}
                   >
                     {node.title}
                   </button>

                  {hasKids && isCol && (
                    <span className="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                      {node.children.length} hidden
                    </span>
                  )}

                  {/* Inline Action Toolbar - Appears inline on hover or touch */}
                  {isAdmin && (
                    <div className="ml-2 inline-flex items-center gap-1 opacity-100 sm:opacity-0 transition-opacity duration-150 group-hover/row:opacity-100 focus-within:opacity-100">
                      <button
                        type="button"
                        title="Add Folder under this item"
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'addFolder', node, title: '', description: '', parentId: node._id }); }}
                        className="flex items-center gap-1 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-indigo-500 transition cursor-pointer"
                      >
                        <FolderPlus className="h-3 w-3" />
                        <span>+ Folder</span>
                      </button>

                      <button
                        type="button"
                        title="Add Sub-item or Note"
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'addItem', node, title: '', description: '', parentId: node._id }); }}
                        className="flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-500 transition cursor-pointer"
                      >
                        <CornerDownRight className="h-3 w-3" />
                        <span>+ Task</span>
                      </button>

                      <button
                        type="button"
                        title="Edit title & notes"
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'edit', node, title: node.title, description: node.description || '' }); }}
                        className="rounded border border-slate-200 bg-white p-0.5 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>

                      <button
                        type="button"
                        title="Move item"
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'move', node, parentId: node.parentId }); }}
                        className="rounded border border-slate-200 bg-white p-0.5 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <FolderSymlink className="h-3 w-3" />
                      </button>

                      <button
                        type="button"
                        title="Delete item"
                        onClick={(e) => { e.stopPropagation(); setConfirm({ node, total: 1 + countAll(node) }); }}
                        className="rounded border border-rose-200 bg-rose-50 p-0.5 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* Notes / Description inline badge */}
                  {node.description && (
                    <div className="w-full flex items-center gap-1 text-[11px] text-slate-500 pl-7 mt-0.5">
                      <StickyNote className="h-3 w-3 shrink-0 text-amber-500" />
                      <span className="truncate italic">{node.description}</span>
                    </div>
                  )}
                </div>
              );
            }}
            renderSubRow={() => null}
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

      {/* Preset Generators Modal */}
      {modal?.type === 'preset' && (
        <Modal onClose={() => setModal(null)} labelledBy="preset-modal-title">
          <h3 id="preset-modal-title" className="mb-2 text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" /> Quick Pre-built Templates
          </h3>
          <p className="mb-4 text-xs text-slate-500">Instantly generate standard event structures into your library:</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
              <div>
                <p className="text-xs font-bold text-slate-800">Catering & Refreshments</p>
                <p className="text-[11px] text-slate-500">Includes Menu Planning, Vendor Confirm, Tasting Session, Staff Briefing</p>
              </div>
              <button
                onClick={() => addPreset('Catering & Refreshments', [
                  { title: 'Menu Planning & Tasting', description: 'Confirm dietary preferences and final headcount' },
                  { title: 'Vendor Order Confirmation', description: 'Lock in delivery timeline and payment terms' },
                  { title: 'Staff & Serving Briefing', description: 'Assign table supervisors and schedule shifts' },
                  { title: 'Waste Management Plan', description: 'Arrange eco-friendly disposal and leftover donation' }
                ])}
                disabled={busy}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                + Add
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
              <div>
                <p className="text-xs font-bold text-slate-800">Stage & AV Production</p>
                <p className="text-[11px] text-slate-500">Includes Sound Check, LED Screen Setup, Mic Allocation, Lighting Cues</p>
              </div>
              <button
                onClick={() => addPreset('Stage & AV Production', [
                  { title: 'LED Screen & Visuals Setup', description: 'Test 4K aspect ratio and presentation slides' },
                  { title: 'Microphone & Frequency Check', description: 'Check wireless mic range and battery backups' },
                  { title: 'Lighting Cue Walkthrough', description: 'Program spotlight presets for key speakers' },
                  { title: 'Backup Generator Test', description: 'Ensure auto-switch within 5 seconds of power outage' }
                ])}
                disabled={busy}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                + Add
              </button>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button onClick={() => setModal(null)} className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-slate-600">Close</button>
          </div>
        </Modal>
      )}

      {/* Item Detail / Edit Popup Modal */}
      {['addRoot', 'addFolder', 'addItem', 'edit', 'detail'].includes(modal?.type) && (
        <Modal onClose={() => setModal(null)} labelledBy="lib-modal-title">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 id="lib-modal-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
              {modal.type === 'addRoot' && 'Add Root Template'}
              {modal.type === 'addFolder' && `Add Folder under "${modal.node?.title}"`}
              {modal.type === 'addItem' && `Add Sub-Item under "${modal.node?.title}"`}
              {modal.type === 'edit' && `Edit Item Settings: "${modal.node?.title}"`}
              {modal.type === 'detail' && `Item Details & Planning: "${modal.node?.title}"`}
            </h3>
            {modal.type === 'detail' && (
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 uppercase">
                {modal.node?.children?.length > 0 ? 'Folder / Branch' : 'Task Item'}
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                autoFocus
                value={modal.title}
                onChange={e => setModal(m => ({ ...m, title: e.target.value }))}
                placeholder="e.g. Stage Setup, Sound Systems..."
                className={`w-full rounded-lg border p-2.5 text-xs font-semibold ${modal.title?.trim() ? 'border-slate-300' : 'border-rose-300'}`}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Operational Notes / Instructions</span>
                <span className="text-[10px] text-slate-400">Optional</span>
              </label>
              <textarea
                rows={3}
                value={modal.description}
                onChange={e => setModal(m => ({ ...m, description: e.target.value }))}
                placeholder="Add operational guidelines, setup notes, or vendor requirements..."
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Productive Tools Section inside Popup */}
            {modal.node && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> Item Tools & Quick Actions
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModal({ type: 'addFolder', node: modal.node, title: '', description: '', parentId: modal.node._id })}
                    className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-xs cursor-pointer"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    <span>+ Add Sub-folder</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModal({ type: 'addItem', node: modal.node, title: '', description: '', parentId: modal.node._id })}
                    className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-xs cursor-pointer"
                  >
                    <CornerDownRight className="h-3.5 w-3.5" />
                    <span>+ Add Sub-task</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const n = modal.node;
                      setModal(null);
                      setConfirm({ node: n, total: 1 + countAll(n) });
                    }}
                    className="flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition cursor-pointer ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Item</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button onClick={() => setModal(null)} className="min-h-[36px] px-3.5 py-1.5 text-xs font-semibold text-slate-600">Cancel</button>
            <button
              onClick={saveItem}
              disabled={busy || !modal.title?.trim()}
              className="min-h-[36px] rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* Move Modal */}
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

      {/* Confirm Delete Dialog */}
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
           busy={busy}
           onConfirm={remove}
           onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}


