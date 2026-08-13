import { useCallback, useEffect, useState } from 'react';
import http from '../api/http';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../api/errors';
import Modal from '../components/Modal';
import UserForm from '../components/UserForm';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import Skeleton from '../components/Skeleton';
import DataTable from '../components/DataTable';
import styles from '../styles/adminUsers.module.css';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await http.get('/users', { params: { size: 100 } });
      setUsers(res.data.data.users || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createUser = async (payload) => {
    setBusy(true);
    try {
      await http.post('/users', payload);
      showToast('User created', 'success');
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not create user'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const updateUser = async (id, patch) => {
    try {
      await http.patch(`/users/${id}`, patch);
      showToast('User updated', 'success');
      load();
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not update user'), 'error');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'User',
      render: (row) => (
        <span className={styles.userCell}>
          <Avatar name={row.name} size="sm" />
          <span>
            <span className={styles.userName}>{row.name}</span>
            <span className={styles.userEmail}>{row.email}</span>
          </span>
        </span>
      )
    },
    {
      key: 'role',
      label: 'Role',
      render: (row) => (
        <select
          className="input input--sm"
          value={row.role}
          disabled={row._id === me._id}
          onChange={(e) => updateUser(row._id, { role: e.target.value })}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      )
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => (
        <button
          type="button"
          className={row.isActive ? 'badge badge--done badge--btn' : 'badge badge--cancelled badge--btn'}
          disabled={row._id === me._id}
          onClick={() => updateUser(row._id, { isActive: !row.isActive })}
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </button>
      )
    },
    { key: 'createdAt', label: 'Joined', render: (row) => new Date(row.createdAt).toLocaleDateString() }
  ];

  return (
    <div className={styles.page}>
      <div className="page-head">
        <h1 className="page-title">Admin Users</h1>
        <button type="button" className="btn btn--primary" onClick={() => setModalOpen(true)}>
          + New User
        </button>
      </div>

      {loading ? (
        <Skeleton rows={6} />
      ) : (
        <DataTable columns={columns} rows={users} emptyMessage="No users yet" />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New user">
        <UserForm onSubmit={createUser} onCancel={() => setModalOpen(false)} busy={busy} />
      </Modal>
    </div>
  );
}
