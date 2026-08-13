import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import http from '../api/http';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../api/errors';
import ProgressBar from '../components/ProgressBar';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import EventForm from '../components/EventForm';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import styles from '../styles/events.module.css';

export default function Events() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (term = query) => {
    setLoading(true);
    try {
      const res = await http.get('/events', { params: { size: 100, search: term || undefined } });
      setEvents(res.data.data.events || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (event) => {
    setEditing(event);
    setModalOpen(true);
  };

  const submit = async (payload) => {
    setBusy(true);
    try {
      if (editing) {
        await http.patch(`/events/${editing._id}`, payload);
        showToast('Event updated', 'success');
      } else {
        await http.post('/events', payload);
        showToast('Event created', 'success');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not save event'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className="page-head">
        <h1 className="page-title">Events</h1>
        {isAdmin && (
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            + New Event
          </button>
        )}
      </div>

      <div className={styles.toolbar}>
        <input
          className="input"
          placeholder="Search events…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setQuery(search);
              load(search);
            }
          }}
        />
        <button type="button" className="btn" onClick={() => { setQuery(search); load(search); }}>
          Search
        </button>
        {query && (
          <button type="button" className="btn btn--ghost" onClick={() => { setSearch(''); setQuery(''); load(''); }}>
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <Skeleton rows={4} />
      ) : events.length === 0 ? (
        <EmptyState
          title={query ? 'No events match your search' : 'No events yet'}
          message={isAdmin ? 'Create the first event to get started.' : 'Check back soon — events appear here once created.'}
          action={isAdmin ? <button type="button" className="btn btn--primary" onClick={openCreate}>+ New Event</button> : undefined}
        />
      ) : (
        <div className={styles.grid}>
          {events.map((event) => (
            <Link key={event._id} to={`/events/${event._id}`} className={`card ${styles.card}`}>
              <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>{event.title}</h3>
                <Badge value={event.status} />
              </div>
              <p className={styles.cardDesc}>
                {event.description || 'No description'}
                {event.startDate && ` · ${new Date(event.startDate).toLocaleDateString()}`}
              </p>
              <ProgressBar value={event.progress} size="sm" />
              {isAdmin && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={(e) => {
                    e.preventDefault();
                    openEdit(event);
                  }}
                >
                  Edit
                </button>
              )}
            </Link>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit event' : 'New event'}>
        <EventForm initial={editing} onSubmit={submit} onCancel={() => setModalOpen(false)} busy={busy} />
      </Modal>
    </div>
  );
}
