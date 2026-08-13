export default function ProgressBar({ value, showLabel = true, size = 'md' }) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return (
    <div
      className={`progress ${size === 'sm' ? 'progress--sm' : ''}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div className="progress__fill" style={{ width: `${pct}%` }} />
      {showLabel && <span className="progress__label">{pct}%</span>}
    </div>
  );
}
