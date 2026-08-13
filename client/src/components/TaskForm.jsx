import { useState } from 'react';

const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');

export default function TaskForm({ initial, users = [], onSubmit, onCancel, busy }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState(() => ({
    title: initial?.title || '',
    description: initial?.description || '',
    priority: initial?.priority || 'medium',
    assigneeId: initial?.assigneeId?._id || initial?.assigneeId || '',
    dueDate: toDateInput(initial?.dueDate),
    status: initial?.status || 'todo'
  }));

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      assigneeId: form.assigneeId || undefined,
      dueDate: form.dueDate ? new Date(`${form.dueDate}T00:00:00`).toISOString() : undefined
    });
  };

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span className="field__label">Title *</span>
        <input className="input" value={form.title} onChange={set('title')} required minLength={3} maxLength={160} />
      </label>
      <label className="field">
        <span className="field__label">Description</span>
        <textarea className="input" rows={3} value={form.description} onChange={set('description')} maxLength={1000} />
      </label>
      <div className="field-row">
        <label className="field">
          <span className="field__label">Priority</span>
          <select className="input" value={form.priority} onChange={set('priority')}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="field">
          <span className="field__label">Assignee</span>
          <select className="input" value={form.assigneeId} onChange={set('assigneeId')}>
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          <span className="field__label">Due date</span>
          <input className="input" type="date" value={form.dueDate} onChange={set('dueDate')} />
        </label>
        {isEdit && (
          <label className="field">
            <span className="field__label">Status</span>
            <select className="input" value={form.status} onChange={set('status')}>
              <option value="todo">Todo</option>
              <option value="in-progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </label>
        )}
      </div>
      <div className="modal__actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
