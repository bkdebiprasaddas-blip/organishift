export function relativeDate(input) {
  if (!input) return '';
  const d = new Date(input);
  const today = new Date();
  const startOfDay = x => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays = Math.round((startOfDay(d) - startOfDay(today)) / 86400000);
  if (diffDays === 0) return 'due today';
  if (diffDays === 1) return 'due tomorrow';
  if (diffDays === -1) return '1 day late';
  if (diffDays < 0) return `${-diffDays} days late`;
  if (diffDays <= 7) return `in ${diffDays} days`;
  return `due ${d.toLocaleDateString()}`;
}
