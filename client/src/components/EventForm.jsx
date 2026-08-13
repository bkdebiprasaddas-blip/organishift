import { useState } from 'react';

const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');

export default function EventForm({ initial, onSubmit, onCancel, busy }) {
  const [form, setForm] = useState(() => ({
    title: initial?.title || '',
    description: initial?.description || '',
    startDate: toDateInput(initial?.startDate),
    endDate: toDateInput(initial?.endDate),
    status: initial?.status || 'draft'
  }));

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      startDate: form.startDate ? new Date(`${form.startDate}T00:00:00`).toISOString() : undefined,
      endDate: form.endDate ? new Date(`${form.endDate}T00:00:00`).toISOString() : undefined
    });
  };

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span className="field__label">Title *</span>
        <input className="input" value={form.title} onChange={set('title')} required minLength={3} maxLength={120} />
      </label>
      <label className="field">
        <span className="field__label">Description</span>
        <textarea className="input" rows={3} value={form.description} onChange={set('description')} maxLength={2000} />
      </label>
      <div className="field-row">
        <label className="field">
          <span className="field__label">Start date</span>
          <input className="input" type="date" value={form.startDate} onChange={set('startDate')} />
        </label>
        <label className="field">
          <span className="field__label">End date</span>
          <input className="input" type="date" value={form.endDate} onChange={set('endDate')} />
        </label>
      </div>
      <label className="field">
        <span className="field__label">Status</span>
        <select className="input" value={form.status} onChange={set('status')}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>
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
