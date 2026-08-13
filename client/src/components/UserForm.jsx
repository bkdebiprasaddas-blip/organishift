import { useState } from 'react';

export default function UserForm({ onSubmit, onCancel, busy }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', isActive: true });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: key === 'isActive' ? e.target.checked : e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span className="field__label">Name *</span>
        <input className="input" value={form.name} onChange={set('name')} required minLength={2} maxLength={60} />
      </label>
      <label className="field">
        <span className="field__label">Email *</span>
        <input className="input" type="email" value={form.email} onChange={set('email')} required />
      </label>
      <label className="field">
        <span className="field__label">Password *</span>
        <input
          className="input"
          type="password"
          value={form.password}
          onChange={set('password')}
          required
          minLength={8}
          placeholder="8+ chars, letter and number"
        />
      </label>
      <label className="field">
        <span className="field__label">Role</span>
        <select className="input" value={form.role} onChange={set('role')}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <label className="checkbox-field">
        <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
        <span>Active account</span>
      </label>
      <div className="modal__actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create user'}
        </button>
      </div>
    </form>
  );
}
