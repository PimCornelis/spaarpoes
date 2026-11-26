// The five statistics. Pure sums over the ledger; every bar or point also carries the ids of the
// entries behind it, so the screen can show them when it is tapped.

import { addDays, lastOfMonth, monthIndex, monthKey, dayInMonth, startOfWeek, weekday } from './dates.js';
import { roundDiv } from './money.js';
import { activePots, freePot } from './model.js';
import { nextOccurrence } from './rules.js';

/** The last `count` calendar months, oldest first, ending with the month of `today`. */
export function rangeMonths(today, count) {
  const end = monthIndex(today);
  return Array.from({ length: count }, (_, i) => monthKey(dayInMonth(end - count + 1 + i, 1)));
}

const emptyBuckets = (length) => ({
  values: new Array(length).fill(0),
  entryIds: Array.from({ length }, () => []),
});

/** 1. Spend per pot per month. Spends are shown as positive amounts. */
export function spendPerPotPerMonth(state, months) {
  const perPot = new Map();
  const totals = new Array(months.length).fill(0);
  for (const entry of state.entries) {
    const column = months.indexOf(monthKey(entry.date));
    if (entry.kind !== 'spend' || column < 0) continue;
    if (!perPot.has(entry.potId)) perPot.set(entry.potId, emptyBuckets(months.length));
    const row = perPot.get(entry.potId);
    row.values[column] -= entry.amount;
    row.entryIds[column].push(entry.id);
    totals[column] -= entry.amount;
  }
  const inOrder = [freePot(state), ...activePots(state), ...state.pots.filter((p) => p.archived)];
  const series = inOrder.filter((p) => perPot.has(p.id)).map((p) => ({ potId: p.id, ...perPot.get(p.id) }));
  return { months, series, totals };
}

function periodEnd(start, step) {
  if (step === 'day') return start;
  if (step === 'week') return addDays(startOfWeek(start), 6);
  return lastOfMonth(monthKey(start));
}

/**
 * 2. The balance of a pot over time (potId null: the whole heap). One point per day, week or month,
 * each with the balance at the end of that period and the entries inside it.
 */
export function balanceOverTime(state, potId, from, to, step) {
  const mine = state.entries.filter((e) => potId === null || e.potId === potId);
  const points = [];
  for (let start = from; start <= to; ) {
    const full = periodEnd(start, step);
    const date = full < to ? full : to;
    const sum = mine.reduce((total, e) => (e.date <= date ? total + e.amount : total), 0);
    const inside = mine.filter((e) => e.date >= start && e.date <= date).map((e) => e.id);
    points.push({ start, date, balance: sum, entryIds: inside });
    start = addDays(date, 1);
  }
  return points;
}

/** 3. Money in against spend per month. Moving money between pots is neither. */
export function incomeAgainstSpend(state, months) {
  return months.map((month) => {
    const row = { month, income: 0, extra: 0, spend: 0, incomingIds: [], spendIds: [] };
    for (const entry of state.entries) {
      if (monthKey(entry.date) !== month) continue;
      if (entry.kind === 'income' || entry.kind === 'extra') {
        row[entry.kind] += entry.amount;
        row.incomingIds.push(entry.id);
      } else if (entry.kind === 'spend') {
        row.spend -= entry.amount;
        row.spendIds.push(entry.id);
      }
    }
    return row;
  });
}

const WEEKS_PER_YEAR = 52;

/** 4. Fixed costs (recurring spends that are still running) per month and per year. */
export function recurringCosts(state, today) {
  const perYearTimes = { week: WEEKS_PER_YEAR, month: 12, year: 1 };
  const rules = state.rules
    .filter((r) => r.kind === 'spend' && (r.endDate === null || nextOccurrence(r, today) !== null))
    .map((r) => {
      const perYear = roundDiv(r.amount * perYearTimes[r.unit], r.every);
      return { ruleId: r.id, label: r.label, potId: r.potId, perYear, perMonth: roundDiv(perYear, 12) };
    })
    .sort((a, b) => b.perYear - a.perYear || a.label.localeCompare(b.label, 'nl'));
  const perYear = rules.reduce((sum, r) => sum + r.perYear, 0);
  return { rules, perYear, perMonth: roundDiv(perYear, 12) };
}

/** 5. Spend per weekday between two dates, Monday first. */
export function spendPerWeekday(state, from, to) {
  const days = Array.from({ length: 7 }, (_, day) => ({ weekday: day, amount: 0, entryIds: [] }));
  for (const entry of state.entries) {
    if (entry.kind !== 'spend' || entry.date < from || entry.date > to) continue;
    const bucket = days[weekday(entry.date)];
    bucket.amount -= entry.amount;
    bucket.entryIds.push(entry.id);
  }
  return days;
}
