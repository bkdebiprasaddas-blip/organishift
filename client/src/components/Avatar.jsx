export default function Avatar({ name = '', size = 'md' }) {
  const initials =
    name
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';

  return <span className={`avatar avatar--${size}`}>{initials}</span>;
}
