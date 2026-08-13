const LABELS = {
  todo: 'Todo',
  'in-progress': 'In progress',
  done: 'Done',
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  low: 'Low',
  medium: 'Medium',
  high: 'High'
};

export default function Badge({ value }) {
  return <span className={`badge badge--${value}`}>{LABELS[value] || value}</span>;
}
