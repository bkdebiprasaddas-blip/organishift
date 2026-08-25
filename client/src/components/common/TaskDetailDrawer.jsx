import { useState, useEffect } from 'react';
import {
  X, CheckSquare, Square, StickyNote, Tag, MessageSquare, Paperclip,
  Calendar, User, AlertCircle, Plus, Trash2, Send, Clock, Layers, ShieldCheck
} from 'lucide-react';
import { Chip, STATUS_CHIP, PRIORITY_TEXT } from './chips';

export default function TaskDetailDrawer({
  isOpen,
  onClose,
  item,
  onUpdate,
  users = [],
  currentUser,
  isManager,
  isAdminOrManager,
  role
}) {
  const [activeTab, setActiveTab] = useState('details'); // details | checklist | notes | comments | attachments
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [operationalNotes, setOperationalNotes] = useState('');
  const [nodeType, setNodeType] = useState('TASK');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [checklist, setChecklist] = useState([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [showAddAttachment, setShowAddAttachment] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.title || '');
      setDescription(item.description || '');
      setOperationalNotes(item.operationalNotes || '');
      setNodeType(item.nodeType || 'TASK');
      setTags(item.tags || []);
      setChecklist(item.checklist || []);
      setComments(item.comments || []);
      setAttachments(item.attachments || []);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSaveField = async (patch) => {
    if (!onUpdate) return;
    setSaving(true);
    try {
      await onUpdate(item, patch);
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const val = tagInput.trim().replace(/^#/, '');
    if (!val || tags.includes(val)) return;
    const updated = [...tags, val];
    setTags(updated);
    setTagInput('');
    handleSaveField({ tags: updated });
  };

  const removeTag = (tagToRemove) => {
    const updated = tags.filter(t => t !== tagToRemove);
    setTags(updated);
    handleSaveField({ tags: updated });
  };

  const addChecklistRow = () => {
    const val = newChecklistItem.trim();
    if (!val) return;
    const updated = [...checklist, { text: val, completed: false }];
    setChecklist(updated);
    setNewChecklistItem('');
    handleSaveField({ checklist: updated });
  };

  const toggleChecklistRow = (index) => {
    const updated = checklist.map((row, i) => i === index ? { ...row, completed: !row.completed } : row);
    setChecklist(updated);
    handleSaveField({ checklist: updated });
  };

  const removeChecklistRow = (index) => {
    const updated = checklist.filter((_, i) => i !== index);
    setChecklist(updated);
    handleSaveField({ checklist: updated });
  };

  const addCommentRow = () => {
    const val = newComment.trim();
    if (!val) return;
    const updated = [
      ...comments,
      {
        user: currentUser?._id,
        userName: currentUser?.name || 'User',
        text: val,
        createdAt: new Date().toISOString()
      }
    ];
    setComments(updated);
    setNewComment('');
    handleSaveField({ comments: updated });
  };

  const addAttachmentRow = () => {
    const name = newAttachmentName.trim();
    const url = newAttachmentUrl.trim();
    if (!name || !url) return;
    const updated = [
      ...attachments,
      { name, url, size: 1024, uploadedAt: new Date().toISOString() }
    ];
    setAttachments(updated);
    setNewAttachmentName('');
    setNewAttachmentUrl('');
    setShowAddAttachment(false);
    handleSaveField({ attachments: updated });
  };

  const completedChecklistCount = checklist.filter(c => c.completed).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity">
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-xl border-l border-slate-200 bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${nodeType === 'FOLDER' ? 'bg-indigo-100 text-indigo-700' : (nodeType === 'MILESTONE' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700')}`}>
                {nodeType}
              </span>
              <h2 className="truncate text-base font-bold text-slate-900">{item.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              aria-label="Close task details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Info & Action Bar */}
          <div className="border-b border-slate-100 bg-white px-6 py-3 space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {item.status && <Chip kind={item.status}>{item.status.replace(/_/g, ' ')}</Chip>}
              {item.priority && (
                <span className={`text-[10px] font-bold uppercase ${PRIORITY_TEXT[item.priority]}`}>
                  Priority: {item.priority}
                </span>
              )}
              {item.dueDate && (
                <span className="flex items-center gap-1 text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Due {new Date(item.dueDate).toLocaleDateString()}</span>
                </span>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold text-slate-600 pt-1">
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-2 border-b-2 transition ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent hover:text-slate-900'}`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('checklist')}
                className={`pb-2 border-b-2 flex items-center gap-1.5 transition ${activeTab === 'checklist' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent hover:text-slate-900'}`}
              >
                <span>Checklist</span>
                {checklist.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px]">
                    {completedChecklistCount}/{checklist.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-2 border-b-2 flex items-center gap-1 transition ${activeTab === 'notes' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent hover:text-slate-900'}`}
              >
                Notes
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`pb-2 border-b-2 flex items-center gap-1.5 transition ${activeTab === 'comments' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent hover:text-slate-900'}`}
              >
                <span>Comments</span>
                {comments.length > 0 && (
                  <span className="rounded-full bg-indigo-50 text-indigo-700 px-1.5 py-0.2 text-[10px]">
                    {comments.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('attachments')}
                className={`pb-2 border-b-2 flex items-center gap-1 transition ${activeTab === 'attachments' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent hover:text-slate-900'}`}
              >
                Files ({attachments.length})
              </button>
            </div>
          </div>

          {/* Drawer Body Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* TAB 1: DETAILS */}
            {activeTab === 'details' && (
              <div className="space-y-5">
                {/* Title */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Task Title</label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onBlur={() => title !== item.title && handleSaveField({ title })}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    onBlur={() => description !== item.description && handleSaveField({ description })}
                    placeholder="Add high-level task overview..."
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Assignee & Priority Controls */}
                {isManager && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Assignee</label>
                      <select
                        value={item.assigneeId?._id || item.assigneeId || ''}
                        onChange={e => handleSaveField({ assigneeId: e.target.value || null })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 bg-white"
                      >
                        <option value="">Unassigned</option>
                        {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Priority</label>
                      <select
                        value={item.priority || 'MEDIUM'}
                        onChange={e => handleSaveField({ priority: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 bg-white"
                      >
                        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* Tags Section */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 text-slate-500" />
                    <span>Tags & Labels</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {tags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
                        #{t}
                        <button type="button" onClick={() => removeTag(t)} className="text-indigo-400 hover:text-indigo-900">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTag()}
                      placeholder="Add tag (e.g. #vendor, #urgent)"
                      className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                    />
                    <button type="button" onClick={addTag} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CHECKLIST */}
            {activeTab === 'checklist' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Checklist Items</h4>
                  {checklist.length > 0 && (
                    <span className="text-xs font-semibold text-slate-500">
                      {completedChecklistCount} of {checklist.length} completed
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {checklist.map((row, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50">
                      <button
                        type="button"
                        onClick={() => toggleChecklistRow(idx)}
                        className="flex items-center gap-2 text-xs font-medium text-slate-800 text-left flex-1"
                      >
                        {row.completed ? <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" /> : <Square className="h-4 w-4 text-slate-300 shrink-0" />}
                        <span className={row.completed ? 'line-through text-slate-400' : ''}>{row.text}</span>
                      </button>
                      <button type="button" onClick={() => removeChecklistRow(idx)} className="text-slate-400 hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  {checklist.length === 0 && (
                    <p className="py-6 text-center text-xs text-slate-400 italic">No checklist items added yet.</p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <input
                    value={newChecklistItem}
                    onChange={e => setNewChecklistItem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addChecklistRow()}
                    placeholder="Add new sub-item or step..."
                    className="flex-1 rounded-lg border border-slate-300 p-2 text-xs font-medium"
                  />
                  <button type="button" onClick={addChecklistRow} className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500">
                    + Add Step
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: OPERATIONAL NOTES */}
            {activeTab === 'notes' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <StickyNote className="h-4 w-4 text-amber-500" />
                  <span>Operational Context & Guidelines</span>
                </label>
                <textarea
                  rows={8}
                  value={operationalNotes}
                  onChange={e => setOperationalNotes(e.target.value)}
                  onBlur={() => operationalNotes !== item.operationalNotes && handleSaveField({ operationalNotes })}
                  placeholder="Record operational guidelines, setup constraints, vendor specs, or emergency contacts..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none shadow-inner"
                />
              </div>
            )}

            {/* TAB 4: COMMENTS */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  {comments.map((c, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-900">{c.userName || 'Team Member'}</span>
                        <span className="text-slate-400">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-slate-700">{c.text}</p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="py-6 text-center text-xs text-slate-400 italic">No comments yet. Start a discussion below.</p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCommentRow()}
                    placeholder="Write a comment..."
                    className="flex-1 rounded-lg border border-slate-300 p-2.5 text-xs font-medium"
                  />
                  <button type="button" onClick={addCommentRow} className="rounded-lg bg-indigo-600 p-2.5 text-white hover:bg-indigo-500">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: ATTACHMENTS */}
            {activeTab === 'attachments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Attachments & Docs</h4>
                  <button type="button" onClick={() => setShowAddAttachment(!showAddAttachment)} className="text-xs font-semibold text-indigo-600 hover:underline">
                    + Link File
                  </button>
                </div>

                {showAddAttachment && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 space-y-2">
                    <input
                      value={newAttachmentName}
                      onChange={e => setNewAttachmentName(e.target.value)}
                      placeholder="File Name (e.g. Contract_v2.pdf)"
                      className="w-full rounded-md border border-slate-300 p-2 text-xs"
                    />
                    <input
                      value={newAttachmentUrl}
                      onChange={e => setNewAttachmentUrl(e.target.value)}
                      placeholder="File URL or Link"
                      className="w-full rounded-md border border-slate-300 p-2 text-xs"
                    />
                    <button type="button" onClick={addAttachmentRow} className="w-full rounded-md bg-indigo-600 py-1.5 text-xs font-semibold text-white">
                      Attach File
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-4 w-4 text-indigo-600 shrink-0" />
                        <a href={att.url} target="_blank" rel="noreferrer" className="truncate text-xs font-semibold text-slate-800 hover:text-indigo-600 underline">
                          {att.name}
                        </a>
                      </div>
                      <span className="text-[10px] text-slate-400">{new Date(att.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {attachments.length === 0 && !showAddAttachment && (
                    <p className="py-6 text-center text-xs text-slate-400 italic">No attached files.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
            <span>{saving ? 'Saving changes…' : 'All changes saved'}</span>
            <button onClick={onClose} className="rounded-lg bg-slate-200 px-4 py-1.5 font-semibold text-slate-700 hover:bg-slate-300">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
