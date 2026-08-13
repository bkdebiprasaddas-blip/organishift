import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import http from '../api/http';
import { useAuth } from '../context/AuthContext';
import ProgressBar from '../components/ProgressBar';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import DataTable from '../components/DataTable';
import styles from '../styles/dashboard.module.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myEvents, setMyEvents] = useState([]);
  const [myTasks, setMyTasks] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const eventsRes = await http.get('/events', { params: { size: 100 } });
        const events = eventsRes.data.data.events || [];
        const taskLists = await Promise.all(
          events.map((event) => http.get(`/events/${event._id}/tasks`).then((r) => r.data.data.tasks || []))
        );
        const allTasks = taskLists.flatMap((tasks, i) => tasks.map((task) => ({ ...task, event: events[i] })));
        const mine = allTasks.filter((task) => task.assigneeId && task.assigneeId._id === user._id);
        const myEventIds = new Set(mine.map((task) => String(task.eventId)));
        if (!mounted) return;
        setMyTasks(mine);
        setMyEvents(events.filter((event) => myEventIds.has(event._id)));
      } catch {
        /* toast handled by interceptor */
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user._id]);

  const stats = useMemo(() => {
    const openTasks = myTasks.filter((t) => t.status !== 'done').length;
    const overdue = myTasks.filter(
      (t) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()
    ).length;
    const doneTasks = myTasks.filter((t) => t.status === 'done').length;
    return [
      { label: 'My events', value: myEvents.length, accent: 'red' },
      { label: 'My open tasks', value: openTasks, accent: 'amber' },
      { label: 'Overdue', value: overdue, accent: 'danger' },
      { label: 'Tasks done', value: doneTasks, accent: 'green' }
    ];
  }, [myEvents, myTasks]);

  const firstName = (user?.name || 'there').split(' ')[0];

  const eventColumns = [
    { key: 'title', label: 'Event', render: (row) => <Link className="link" to={`/events/${row._id}`}>{row.title}</Link> },
    { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
    { key: 'progress', label: 'Progress', render: (row) => <ProgressBar value={row.progress} /> }
  ];

  const taskColumns = [
    { key: 'title', label: 'Task', render: (row) => <Link className="link" to={`/events/${row.eventId._id || row.eventId}`}>{row.title}</Link> },
    { key: 'event', label: 'Event', render: (row) => row.event?.title || '' },
    { key: 'priority', label: 'Priority', render: (row) => <Badge value={row.priority} /> },
    { key: 'dueDate', label: 'Due', render: (row) => (row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—') },
    { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> }
  ];

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton rows={6} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className="page-title">Welcome back, {firstName}</h1>
      <div className={styles.stats}>
        {stats.map((stat) => (
          <div key={stat.label} className={`stat-card stat-card--${stat.accent}`}>
            <span className="stat-card__value">{stat.value}</span>
            <span className="stat-card__label">{stat.label}</span>
          </div>
        ))}
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">My events</h2>
          <Link className="link" to="/events">View all</Link>
        </div>
        <DataTable columns={eventColumns} rows={myEvents} emptyMessage="You have no events yet" emptyHint="Ask an admin to create an event and assign you a task." />
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">My tasks</h2>
        </div>
        <DataTable columns={taskColumns} rows={myTasks} emptyMessage="No tasks assigned to you" />
      </section>
    </div>
  );
}
