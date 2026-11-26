// Dates are local calendar days written as "YYYY-MM-DD". They compare correctly as plain text.
// The sums are done in UTC so that summer time can never add or drop a day.

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86400000;

const pad = (n, size = 2) => String(n).padStart(size, '0');

/** Year, month (1-12) and day of a date text. */
export function split(date) {
  const [, y, m, d] = PATTERN.exec(date);
  return { y: Number(y), m: Number(m), d: Number(d) };
}

export function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function isDate(value) {
  if (typeof value !== 'string' || !PATTERN.test(value)) return false;
  const { y, m, d } = split(value);
  return y >= 1900 && m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

export function makeDate(y, m, d) {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

/** The calendar day on this phone for a JavaScript Date. */
export function localDate(now) {
  return makeDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

const toDays = (date) => {
  const { y, m, d } = split(date);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};
const fromDays = (days) => new Date(days * DAY_MS).toISOString().slice(0, 10);

export function addDays(date, count) {
  return fromDays(toDays(date) + count);
}

export function daysBetween(from, to) {
  return toDays(to) - toDays(from);
}

/** 0 = Monday ... 6 = Sunday. */
export function weekday(date) {
  const { y, m, d } = split(date);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** The Monday of the week this date is in. */
export function startOfWeek(date) {
  return addDays(date, -weekday(date));
}

/** Months counted from year 0, so that adding months is plain adding. */
export function monthIndex(date) {
  const { y, m } = split(date);
  return y * 12 + (m - 1);
}

/** Day `day` of the month with this index; a 31st becomes the last day of a shorter month. */
export function dayInMonth(index, day) {
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return makeDate(y, m, Math.min(day, daysInMonth(y, m)));
}

/** "2026-06-15" -> "2026-06" */
export function monthKey(date) {
  return date.slice(0, 7);
}

export function firstOfMonth(key) {
  return `${key}-01`;
}

export function lastOfMonth(key) {
  return dayInMonth(monthIndex(`${key}-01`), 31);
}

/** Whole months that have passed from `from` to `to`. */
export function wholeMonthsBetween(from, to) {
  let months = monthIndex(to) - monthIndex(from);
  if (months > 0 && to < dayInMonth(monthIndex(to), split(from).d)) months -= 1;
  return Math.max(months, 0);
}
