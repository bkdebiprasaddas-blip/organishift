// Every date field in this app (event startDate/endDate, item dueDate) is a
// CALENDAR DATE chosen in an <input type="date"> — not an instant in time. The
// server persists them as UTC midnight ("2026-01-15" -> 2026-01-15T00:00:00Z).
//
// Reading those values with the local-time getters (toLocaleDateString,
// getFullYear, new Date(y, m, d)) shifts them a day BACKWARDS for every user
// west of Greenwich, which made freshly-scheduled tasks render as OVERDUE on
// the very day they were due and dropped calendar events into the previous
// day's cell. All helpers below therefore read and compare in UTC, and render
// with a timezone-free formatter so the displayed day always matches the day
// the user picked.

const pad = n => String(n).padStart(2, '0');

/** "YYYY-MM-DD" for the UTC calendar day of `input`, or '' if unparseable. */
export function utcDateKey(input) {
  if (!input) return '';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '';
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/**
 * "YYYY-MM-DD" for the LOCAL calendar day of `input`. Use this for values the
 * browser produced (e.g. the Calendar month grid, which is built from
  `new Date(y, m, d)` local midnights) — utcDateKey() would shift those a day
 * backwards west of Greenwich.
 */
export function localDateKey(input) {
  const d = input ? new Date(input) : null;
  if (!d || isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const keyToUTC = key => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

// UTC has no DST, so whole-day arithmetic on these is exact.
const shiftKey = (key, days) => {
  const t = new Date(keyToUTC(key) + days * 86400000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};

const daysBetween = (fromKey, toKey) =>
  Math.round((keyToUTC(toKey) - keyToUTC(fromKey)) / 86400000);

/** "YYYY-MM-DD" shifted by whole days. UTC has no DST, so this is exact. */
export function shiftDateKey(key, days) {
  if (!key) return '';
  const t = new Date(keyToUTC(key) + days * 86400000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/**
 * Render a calendar date without any timezone conversion: build a local Date
 * from the UTC Y/M/D parts so toLocaleDateString echoes the intended day.
 */
export function formatDateUTC(input) {
  const key = utcDateKey(input);
  if (!key) return 'N/A';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString();
}

export function formatDateSafe(input) {
  return input ? formatDateUTC(input) : 'N/A';
}

/** Value for an <input type="date">; passes through an already date-only string. */
export function toDateInputValue(input) {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  return utcDateKey(input);
}

/** True when the due date is strictly before today (today is never overdue). */
export function isOverdue(dueDate) {
  const key = utcDateKey(dueDate);
  if (!key) return false;
  return key < utcDateKey(new Date());
}

export function relativeDate(input) {
  const key = utcDateKey(input);
  if (!key) return '';
  const todayKey = utcDateKey(new Date());
  if (key === todayKey) return 'due today';
  if (key === shiftKey(todayKey, 1)) return 'due tomorrow';
  if (key < todayKey) {
    const n = daysBetween(key, todayKey);
    return n === 1 ? '1 day late' : `${n} days late`;
  }
  const n = daysBetween(todayKey, key);
  if (n <= 7) return `in ${n} days`;
  return `due ${formatDateUTC(input)}`;
}
