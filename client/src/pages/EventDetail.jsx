import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import http from '../api/http';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../api/errors';
import ProgressBar from '../components/ProgressBar';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import ConfirmDelete from '../components/ConfirmDelete';
import EventForm from '../components/EventForm';
import TaskForm from '../components/TaskForm';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import styles from '../styles/eventDetail.module.css';

const GROUPED = [
  { status: 'todo', label: 'Todo' },
  { status: 'in-progress', label: 'In progress' },
  { status: 'done', label: 'Done' }
];

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [event, setEvent] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [eventRes, tasksRes] = await Promise.all([
        http.get(`/events/${id}`),
        http.get(`/events/${id}/tasks`)
      ]);
      setEvent(eventRes.data.data.event);
      setTasks(tasksRes.data.data.tasks || []);
    } catch {
      showToast('Could not load event', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isAdmin) {
      http.get('/users', { params: { size: 100 } }).then((res) => setUsers(res.data.data.users || [])).catch(() => {});
    }
  }, [isAdmin]);

  const canAct = (task) =>
    isAdmin || (task.assigneeId && task.assigneeId._id === user._id) || (task.createdBy && task.createdBy._id === user._id);

  const changeStatus = async (task, status) => {
    try {
      await http.patch(`/tasks/${task._id}`, { status });
      showToast('Task updated', 'success');
      load();
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not update task'), 'error');
    }
  };

  const saveEvent = async (payload) => {
    setBusy(true);
    try {
      await http.patch(`/events/${id}`, payload);
      showToast('Event updated', 'success');
      setEditOpen(false);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not save event'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveTask = async (payload) => {
    setBusy(true);
    try {
      if (editingTask) {
        await http.patch(`/tasks/${editingTask._id}`, payload);
      } else {
        await http.post(`/events/${id}/tasks`, payload);
      }
      showToast('Task saved', 'success');
      setTaskOpen(false);
      setEditingTask(null);
      load();
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not save task'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const deleteTask = async (taskId) => {
    setBusy(true);
    try {
      await http.delete(`/tasks/${taskId}`);
      showToast('Task deleted', 'success');
      load();
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not delete task'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const deleteEvent = async () => {
    setBusy(true);
    try {
      await http.delete(`/events/${id}`);
      showToast('Event deleted', 'success');
      navigate('/events');
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not delete event'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton rows={8} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className={styles.page}>
        <EmptyState title="Event not found" message="It may have been deleted." action={<Link className="btn" to="/events">Back to events</Link>} />
      </div>
    );
  }

  const statusOptions = ['todo', 'in-progress', 'done'];

  return (
    <div className={styles.page}>
      <Link to="/events" className="link">← Back to events</Link>

      <div className={styles.head}>
        <div>
          <div className={styles.titleRow}>
            <h1 className="page-title">{event.title}</h1>
            <Badge value={event.status} />
          </div>
          <p className={styles.desc}>{event.description || 'No description'}</p>
          <p className={styles.dates}>
            {event.startDate ? `Starts ${new Date(event.startDate).toLocaleDateString()}` : 'No start date'}
            {event.endDate ? ` · Ends ${new Date(event.endDate).toLocaleDateString()}` : ''}
          </p>
        </div>
        {isAdmin && (
          <div className={styles.actions}>
            <button type="button" className="btn" onClick={() => setEditOpen(true)}>Edit</button>
            <button type="button" className="btn btn--danger" onClick={() => setDeleteOpen(true)}>Delete</button>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Progress</h2>
          <span className="panel__sub">{event.progress}% · {tasks.filter((t) => t.status === 'done').length}/{tasks.length} tasks done</span>
        </div>
        <ProgressBar value={event.progress} />
      </div>

      <div className={styles.statsRow}>
        <div className="stat-card stat-card--red"><span className="stat-card__value">{tasks.length}</span><span className="stat-card__label">Total tasks</span></div>
        <div className="stat-card stat-card--amber"><span className="stat-card__value">{tasks.filter((t) => t.status === 'in-progress').length}</span><span className="stat-card__label">In progress</span></div>
        <div className="stat-card stat-card--danger"><span className="stat-card__value">{tasks.filter((t) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length}</span><span className="stat-card__label">Overdue</span></div>
        <div className="stat-card stat-card--green"><span className="stat-card__value">{tasks.filter((t) => t.status === 'done').length}</span><span className="stat-card__label">Done</span></div>
      </div>

      <div className={styles.sectionHead}>
        <h2 className="page-title page-title--sm">Tasks</h2>
        {isAdmin && (
          <button type="button" className="btn btn--primary" onClick={() => { setEditingTask(null); setTaskOpen(true); }}>
            + Add Task
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <EmptyState title="No tasks yet" message={isAdmin ? 'Break this event into tasks and assign them to people.' : 'Tasks will appear here once the organizer adds them.'} />
      ) : (
        <div className={styles.columns}>
          {GROUPED.map((group) => {
            const groupTasks = tasks.filter((t) => t.status === group.status);
            return (
              <div key={group.status} className={styles.column}>
                <h3 className={styles.columnTitle}>
                  {group.label}
                  <span className={styles.columnCount}>{groupTasks.length}</span>
                </h3>
                <div className={styles.columnBody}>
                  {groupTasks.length === 0 && <p className={styles.columnEmpty}>Nothing here</p>}
                  {groupTasks.map((task) => (
                    <div key={task._id} className={`card ${styles.taskCard}`}>
                      <div className={styles.taskTop}>
                        <h4 className={styles.taskTitle}>{task.title}</h4>
                        <Badge value={task.priority} />
                      </div>
                      {task.description && <p className={styles.taskDesc}>{task.description}</p>}
                      <div className={styles.taskMeta}>
                        <span className={styles.assignee}>
                          {task.assigneeId ? (
                            <>
                              <Avatar name={task.assigneeId.name} size="sm" />
                              {task.assigneeId.name}
                            </>
                          ) : (
                            'Unassigned'
                          )}
                        </span>
                        <span>{task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString()}` : ''}</span>
                      </div>
                      {canAct(task) && (
                        <div className={styles.taskActions}>
                          <select
                            className="input input--sm"
                            value={task.status}
                            onChange={(e) => changeStatus(task, e.target.value)}
                          >
                            {statusOptions.map((s) => (
                              <option key={s} value={s}>{s.replace('-', ' ')}</option>
                            ))}
                          </select>
                          {isAdmin && (
                            <>
                              <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setEditingTask(task); setTaskOpen(true); }}>Edit</button>
                              <button type="button" className="btn btn--ghost btn--sm btn--danger-text" onClick={() => deleteTask(task._id)}>Delete</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit event">
        <EventForm initial={event} onSubmit={saveEvent} onCancel={() => setEditOpen(false)} busy={busy} />
      </Modal>

      <Modal open={taskOpen} onClose={() => { setTaskOpen(false); setEditingTask(null); }} title={editingTask ? 'Edit task' : 'Add task'}>
        <TaskForm initial={editingTask} users={users} onSubmit={saveTask} onCancel={() => { setTaskOpen(false); setEditingTask(null); }} busy={busy} />
      </Modal>

      <ConfirmDelete
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteEvent}
        title="Delete event"
        message={`Delete "${event.title}" and all of its tasks? This cannot be undone.`}
        busy={busy}
      />
    </div>
  );
}
