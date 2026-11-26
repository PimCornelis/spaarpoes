// Recurring rules: salary in, money to a pot, or a fixed cost, every N weeks, months or years.
//
// Nothing runs in the background. When the app is opened, generateDue() books every occurrence after
// `lastMadeUpTo` up to today, once, and moves `lastMadeUpTo` forward.

import { check } from './errors.js';
import { addDays, dayInMonth, isDate, monthIndex, split } from './dates.js';
import { isCents } from './money.js';
import { FREE_ID, MAX_NAME, takeId, usablePot } from './model.js';
import { addIncome, addSpend, allocate } from './ledger.js';

export const RULE_KINDS = ['income', 'allocate', 'spend'];
export const UNITS = ['week', 'month', 'year'];
export const MAX_EVERY = 999;

/** Every date of the rule from its start onwards, oldest first, ignoring skips and the end date. */
function* schedule(rule) {
  const start = split(rule.startDate);
  if (rule.unit === 'week') {
    for (let k = 0; ; k += 1) yield addDays(rule.startDate, k * 7 * rule.every);
  }
  let index = monthIndex(rule.startDate);
  const day = rule.unit === 'month' ? (rule.dayOfMonth ?? start.d) : start.d;
  const step = rule.unit === 'month' ? rule.every : 12 * rule.every;
  // If that day has already passed in the start month, the first time is a month later.
  if (rule.unit === 'month' && dayInMonth(index, day) < rule.startDate) index += 1;
  for (; ; index += step) yield dayInMonth(index, day);
}

/** The scheduled dates from `from` to `to`, both included. Skipped dates are still listed. */
export function occurrencesBetween(rule, from, to) {
  const lastDay = rule.endDate !== null && rule.endDate < to ? rule.endDate : to;
  const dates = [];
  for (const date of schedule(rule)) {
    if (date > lastDay) break;
    if (date >= from) dates.push(date);
  }
  return dates;
}

/** The first date after `after` that will really be booked, or null when there is none. */
export function nextOccurrence(rule, after) {
  for (const date of schedule(rule)) {
    if (rule.endDate !== null && date > rule.endDate) return null;
    if (date > after && !rule.skipped.includes(date)) return date;
  }
  return null;
}

/** The day after which this rule still has something to book. */
export function openFrom(rule, today) {
  return rule.lastMadeUpTo !== null && rule.lastMadeUpTo > today ? rule.lastMadeUpTo : today;
}

const KIND_ORDER = { income: 0, allocate: 1, spend: 2 };

function book(state, rule, date) {
  const input = { amount: rule.amount, date, note: rule.label, ruleId: rule.id };
  if (rule.kind === 'income') return addIncome(state, input);
  if (rule.kind === 'allocate') return allocate(state, { ...input, potId: rule.potId });
  return addSpend(state, { ...input, potId: rule.potId });
}

/**
 * Books everything that has become due. Returns the new state and the entries that were made.
 * Calling it again on the same day makes nothing.
 */
export function generateDue(state, today) {
  const due = [];
  state.rules.forEach((rule, position) => {
    const from = rule.lastMadeUpTo === null ? rule.startDate : addDays(rule.lastMadeUpTo, 1);
    for (const date of occurrencesBetween(rule, from, today)) {
      if (!rule.skipped.includes(date)) due.push({ date, rule, position });
    }
  });
  // Oldest first; on one day the money comes in before it is shared out or spent.
  due.sort((a, b) => a.date.localeCompare(b.date)
    || KIND_ORDER[a.rule.kind] - KIND_ORDER[b.rule.kind]
    || a.position - b.position);

  let next = state;
  for (const { rule, date } of due) next = book(next, rule, date);
  const rules = next.rules.map((r) => ({ ...r, lastMadeUpTo: openFrom(r, today) }));
  const changed = rules.some((r, i) => r.lastMadeUpTo !== next.rules[i].lastMadeUpTo);
  if (changed) next = { ...next, rules };
  return { state: next, made: next.entries.slice(state.entries.length) };
}

const RULE_FIELDS = ['label', 'kind', 'potId', 'amount', 'every', 'unit', 'dayOfMonth', 'startDate', 'endDate'];

function cleanRule(state, input) {
  for (const key of Object.keys(input)) check(RULE_FIELDS.includes(key), 'bad-field', { key });
  const rule = { dayOfMonth: null, endDate: null, ...input };
  rule.label = String(rule.label ?? '').trim();
  check(rule.label.length > 0 && rule.label.length <= MAX_NAME, 'bad-name');
  check(RULE_KINDS.includes(rule.kind), 'bad-kind');
  usablePot(state, rule.potId);
  if (rule.kind === 'income') check(rule.potId === FREE_ID, 'income-needs-free-pot');
  if (rule.kind === 'allocate') check(rule.potId !== FREE_ID, 'same-pot');
  check(isCents(rule.amount) && rule.amount > 0, 'bad-amount');
  check(Number.isInteger(rule.every) && rule.every >= 1 && rule.every <= MAX_EVERY, 'bad-frequency');
  check(UNITS.includes(rule.unit), 'bad-frequency');
  check(isDate(rule.startDate), 'bad-date');
  check(rule.endDate === null || isDate(rule.endDate), 'bad-date');
  if (rule.unit === 'month') {
    if (rule.dayOfMonth === null) rule.dayOfMonth = split(rule.startDate).d;
    check(Number.isInteger(rule.dayOfMonth) && rule.dayOfMonth >= 1 && rule.dayOfMonth <= 31, 'bad-day');
  } else {
    rule.dayOfMonth = null;
  }
  return rule;
}

/** A new rule. The next generateDue() books everything from its start date up to that day. */
export function addRule(state, input) {
  const rule = cleanRule(state, input);
  check(rule.endDate === null || rule.endDate >= rule.startDate, 'end-before-start');
  const next = takeId(state, 'r');
  const full = { id: next.id, ...rule, skipped: [], lastMadeUpTo: null };
  return { ...next.state, rules: [...next.state.rules, full] };
}

export function findRule(state, ruleId) {
  const rule = state.rules.find((r) => r.id === ruleId);
  check(rule, 'unknown-rule', { ruleId });
  return rule;
}

function replaceRule(state, ruleId, rule) {
  return { ...state, rules: state.rules.map((r) => (r.id === ruleId ? rule : r)) };
}

/** Changes future occurrences only: whatever is due today is booked with the old values first. */
export function updateRule(state, ruleId, fields, today) {
  const settled = generateDue(state, today).state;
  const old = findRule(settled, ruleId);
  const current = Object.fromEntries(RULE_FIELDS.map((key) => [key, old[key]]));
  const rule = cleanRule(settled, { ...current, ...fields });
  if ('startDate' in fields || 'endDate' in fields) {
    check(rule.endDate === null || rule.endDate >= rule.startDate, 'end-before-start');
  }
  return replaceRule(settled, ruleId, { ...old, ...rule });
}

export function endRule(state, ruleId, today) {
  const settled = generateDue(state, today).state;
  return replaceRule(settled, ruleId, { ...findRule(settled, ruleId), endDate: today });
}

/** Skips the next occurrence. The money for it simply stays where it is. */
export function skipNext(state, ruleId, today) {
  const settled = generateDue(state, today).state;
  const rule = findRule(settled, ruleId);
  const date = nextOccurrence(rule, openFrom(rule, today));
  check(date !== null, 'nothing-to-skip');
  return replaceRule(settled, ruleId, { ...rule, skipped: [...rule.skipped, date].sort() });
}

/** Takes a skip back, as long as that day has not gone by. */
export function unskip(state, ruleId, date, today) {
  const rule = findRule(state, ruleId);
  check(date > openFrom(rule, today), 'too-late');
  return replaceRule(state, ruleId, { ...rule, skipped: rule.skipped.filter((d) => d !== date) });
}

/** What the rules will book in the coming days, tomorrow up to `days` days ahead. */
export function upcoming(state, today, days) {
  const list = [];
  for (const rule of state.rules) {
    const from = addDays(openFrom(rule, today), 1);
    for (const date of occurrencesBetween(rule, from, addDays(today, days))) {
      if (!rule.skipped.includes(date)) {
        list.push({ ruleId: rule.id, date, label: rule.label, kind: rule.kind, potId: rule.potId, amount: rule.amount });
      }
    }
  }
  return list.sort((a, b) => a.date.localeCompare(b.date));
}
