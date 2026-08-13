export default function Spinner({ full = false, label }) {
  return (
    <div className={full ? 'spinner-wrap spinner-wrap--full' : 'spinner-wrap'}>
      <span className="spinner" aria-hidden="true" />
      {label && <span className="spinner__label">{label}</span>}
    </div>
  );
}
