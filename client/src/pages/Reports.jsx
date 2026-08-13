import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import http from '../api/http';
import Tabs from '../components/Tabs';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import Skeleton from '../components/Skeleton';
import styles from '../styles/reports.module.css';

const TABS = [
  { value: 'events', label: 'Event progress' },
  { value: 'workload', label: 'Workload' },
  { value: 'overdue', label: 'Overdue' }
];

export default function Reports() {
  const [active, setActive] = useState('events');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [overdue, setOverdue] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, workloadRes, overdueRes] = await Promise.all([
        http.get('/reports/events'),
        http.get('/reports/workload'),
        http.get('/reports/overdue')
      ]);
      setEvents(eventsRes.data.data.rows || []);
      setWorkload(workloadRes.data.data.rows || []);
      setOverdue(overdueRes.data.data.tasks || []);
    } catch {
      setEvents([]);
      setWorkload([]);
      setOverdue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const eventColumns = [
    { key: 'title', label: 'Event', render: (row) => <Link className="link" to={`/events/${row.eventId}`}>{row.title}</Link> },
    { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
    { key: 'doneTasks', label: 'Done / total', render: (row) => `${row.doneTasks} / ${row.totalTasks}` },
    { key: 'progress', label: 'Progress', render: (row) => <div className="progress progress--sm"><div className="progress__fill" style={{ width: `${row.progress}%` }} /></div> }
  ];

  const workloadColumns = [
    { key: 'user', label: 'Assignee', render: (row) => row.user.name },
    { key: 'totalTasks', label: 'Total' },
    { key: 'done', label: 'Done' },
    { key: 'inProgress', label: 'In progress' },
    { key: 'todo', label: 'Todo' },
    { key: 'overdue', label: 'Overdue', render: (row) => <span className={row.overdue > 0 ? 'text-danger' : ''}>{row.overdue}</span> }
  ];

  const overdueColumns = [
    { key: 'title', label: 'Task' },
    { key: 'eventId', label: 'Event', render: (row) => row.eventId?.title || '—' },
    { key: 'assigneeId', label: 'Assignee', render: (row) => row.assigneeId?.name || 'Unassigned' },
    { key: 'dueDate', label: 'Due', render: (row) => new Date(row.dueDate).toLocaleDateString() },
    { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> }
  ];

  return (
    <div className={styles.page}>
      <h1 className="page-title">Reports</h1>
      <Tabs tabs={TABS} active={active} onChange={setActive} />

      {loading ? (
        <Skeleton rows={6} />
      ) : (
        <div className={styles.body}>
          {active === 'events' && <DataTable columns={eventColumns} rows={events} emptyMessage="No events yet" />}
          {active === 'workload' && <DataTable columns={workloadColumns} rows={workload} emptyMessage="No assigned tasks" />}
          {active === 'overdue' && <DataTable columns={overdueColumns} rows={overdue} emptyMessage="Nothing overdue" />}
        </div>
      )}
    </div>
  );
}
