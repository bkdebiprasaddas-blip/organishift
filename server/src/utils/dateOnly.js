/**
 * Calendar-date helpers (see client/src/utils/dates.js for the full rationale).
 *
 * `startDate` / `endDate` / `dueDate` are dates a user picked in an
 * <input type="date">, not instants. They arrive as "2026-01-15" and are
 * persisted as UTC midnight. Comparing them against a full local timestamp
 * made same-day scheduling impossible for every user east of Greenwich
 * (2026-01-15T00:00Z < now) and flagged same-day tasks overdue for every user
 * west of it (2026-01-15T00:00Z === the previous local day).
 *
 * Everything below therefore compares UTC calendar days, so "today" means the
 * same thing for the server and for every client.
 */
const pad = n => String(n).padStart(2, '0');

/** "YYYY-MM-DD" for the UTC calendar day of `input`, or '' if unparseable. */
function utcDateKey(input) {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/**
 * True when `input` is a calendar date strictly before today.
 * Today itself is never "in the past", so same-day scheduling is allowed.
 */
function isBeforeToday(input) {
  const key = utcDateKey(input);
  if (!key) return false;
  return key < utcDateKey(new Date());
}

module.exports = { utcDateKey, isBeforeToday };
