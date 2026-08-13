export default function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">◌</div>
      <h3 className="empty-state__title">{title}</h3>
      {message && <p className="empty-state__message">{message}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
