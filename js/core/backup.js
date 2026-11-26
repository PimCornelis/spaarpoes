// The back-up file (the whole app, as JSON) and the CSV export of the ledger.
// Import is strict: a file the app does not fully understand is refused, with a reason.

import { BudgetError, check } from './errors.js';
import { isDate } from './dates.js';
import { formatDecimal, isCents } from './money.js';
import { FREE_ID, MAX_NAME, MAX_NOTE, findPot } from './model.js';
import { MAX_EVERY, RULE_KINDS, UNITS } from './rules.js';

export const FILE_VERSION = 1;
const APP = 'spaarpoes';

export function exportJson(state, exportedAt) {
  const { nextId, pots, entries, rules, partyLog, settings } = state;
  const file = { app: APP, version: FILE_VERSION, exportedAt, data: { nextId, pots, entries, rules, partyLog, settings } };
  return JSON.stringify(file, null, 1);
}

// --- what every field of the file must look like ---

const text = (max) => (v) => typeof v === 'string' && v.length <= max;
const filled = (max) => (v) => text(max)(v) && v.trim().length > 0;
const oneOf = (...values) => (v) => values.includes(v);
const orNull = (test) => (v) => v === null || test(v);
const bool = (v) => typeof v === 'boolean';
const cents = (v) => isCents(v) && v !== 0;
const positive = (v) => isCents(v) && v > 0;
const whole = (min, max) => (v) => Number.isInteger(v) && v >= min && v <= max;
const dateList = (v) => Array.isArray(v) && v.every(isDate);

const POT = {
  id: filled(20), name: filled(MAX_NAME), emoji: text(16), colorToken: filled(30), order: whole(0, 1e9),
  kind: oneOf('pot', 'free'), partyAmount: orNull(positive), partyLabel: orNull(text(MAX_NAME)), archived: bool,
};
const ENTRY = {
  id: filled(20), date: isDate, potId: filled(20), amount: cents, note: text(MAX_NOTE),
  kind: oneOf('income', 'spend', 'extra', 'allocate', 'move'), groupId: orNull(filled(20)), ruleId: orNull(filled(20)),
};
const RULE = {
  id: filled(20), label: filled(MAX_NAME), kind: oneOf(...RULE_KINDS), potId: filled(20), amount: positive,
  every: whole(1, MAX_EVERY), unit: oneOf(...UNITS), dayOfMonth: orNull(whole(1, 31)), startDate: isDate,
  endDate: orNull(isDate), skipped: dateList, lastMadeUpTo: orNull(isDate),
};
const PARTY = { date: isDate, potId: filled(20), label: orNull(text(MAX_NAME)), amount: positive };
const SETTINGS = {
  sound: bool, reduceMotion: bool, isSample: bool, firstUseDate: isDate,
  lastBackupDate: orNull(isDate), lastEntryDate: orNull(isDate), lastSummaryWeek: orNull(isDate),
};

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const invalid = (problem, details = {}) => new BudgetError('import-invalid', { problem, ...details });

function checkShape(item, shape, where, index) {
  if (!isObject(item)) throw invalid('field', { where, index });
  for (const key of Object.keys(item)) {
    if (!Object.hasOwn(shape, key)) throw invalid('unknown-field', { where, index, field: key });
  }
  for (const [key, test] of Object.entries(shape)) {
    if (!Object.hasOwn(item, key) || !test(item[key])) throw invalid('field', { where, index, field: key });
  }
}

function checkList(data, where, shape) {
  if (!Array.isArray(data[where])) throw invalid('field', { where });
  data[where].forEach((item, index) => checkShape(item, shape, where, index));
}

function checkIds(lists) {
  const seen = new Set();
  for (const item of lists.flat()) {
    if (seen.has(item.id)) throw invalid('double-id', { id: item.id });
    seen.add(item.id);
  }
}

function checkPots(state) {
  const free = state.pots.filter((p) => p.kind === 'free');
  if (free.length !== 1 || free[0].id !== FREE_ID || free[0].archived) throw invalid('free-pot');
}

function checkEntries(state) {
  const ruleIds = new Set(state.rules.map((r) => r.id));
  const groups = new Map();
  state.entries.forEach((entry, index) => {
    const here = { where: 'entries', index };
    if (!findPot(state, entry.potId)) throw invalid('unknown-pot', here);
    if (entry.ruleId !== null && !ruleIds.has(entry.ruleId)) throw invalid('unknown-rule', here);
    const paired = entry.kind === 'allocate' || entry.kind === 'move';
    if (paired !== (entry.groupId !== null)) throw invalid('broken-pair', here);
    if (paired) {
      if (!groups.has(entry.groupId)) groups.set(entry.groupId, []);
      groups.get(entry.groupId).push(entry);
      return;
    }
    const goodSign = entry.kind === 'spend' ? entry.amount < 0 : entry.amount > 0;
    if (!goodSign || (entry.kind === 'income' && entry.potId !== FREE_ID)) throw invalid('sign', here);
  });
  for (const [groupId, sides] of groups) {
    const [a, b] = sides;
    const intact = sides.length === 2 && a.kind === b.kind && a.date === b.date
      && a.amount + b.amount === 0 && a.potId !== b.potId
      && (a.kind !== 'allocate' || (a.amount < 0 ? a : b).potId === FREE_ID);
    if (!intact) throw invalid('broken-pair', { id: groupId });
  }
}

function checkRules(state) {
  state.rules.forEach((rule, index) => {
    const here = { where: 'rules', index };
    if (!findPot(state, rule.potId)) throw invalid('unknown-pot', here);
    if (rule.kind === 'income' && rule.potId !== FREE_ID) throw invalid('sign', here);
    if (rule.kind === 'allocate' && rule.potId === FREE_ID) throw invalid('sign', here);
    if ((rule.unit === 'month') !== (rule.dayOfMonth !== null)) throw invalid('field', { ...here, field: 'dayOfMonth' });
  });
}

/** New ids are made from the counter, so it must be past every id already in the file. */
function checkCounter(state) {
  const used = [...state.pots, ...state.entries, ...state.rules]
    .flatMap((item) => [item.id, item.groupId])
    .map((id) => Number(/\d+$/.exec(id ?? '')?.[0] ?? 0));
  const highest = used.reduce((max, n) => Math.max(max, n), 0);
  if (!whole(1, Number.MAX_SAFE_INTEGER)(state.nextId) || state.nextId <= highest) throw invalid('counter');
}

/** Checks a state, from a file or from the phone's storage. Throws BudgetError('import-invalid'). */
export function validateState(data) {
  if (!isObject(data)) throw invalid('missing-data');
  const parts = ['nextId', 'pots', 'entries', 'rules', 'partyLog', 'settings'];
  for (const key of Object.keys(data)) if (!parts.includes(key)) throw invalid('unknown-field', { field: key });
  checkList(data, 'pots', POT);
  checkList(data, 'entries', ENTRY);
  checkList(data, 'rules', RULE);
  checkList(data, 'partyLog', PARTY);
  checkShape(data.settings, SETTINGS, 'settings');
  checkIds([data.pots, data.entries, data.rules]);
  checkPots(data);
  checkRules(data);
  checkEntries(data);
  checkCounter(data);
  return data;
}

/** Reads a back-up file and returns the state in it, or throws a BudgetError that says why not. */
export function importJson(content) {
  let file;
  try {
    file = JSON.parse(String(content).replace(/^﻿/, ''));
  } catch {
    throw new BudgetError('import-not-json');
  }
  check(isObject(file) && file.app === APP, 'import-not-spaarpoes');
  check(file.version === FILE_VERSION, 'import-version', { version: file.version });
  return validateState(file.data);
}

// --- CSV ---

function cell(value) {
  let textValue = String(value ?? '');
  // A spreadsheet runs text that starts like this as a formula. A leading ' keeps it as text.
  if (/^[=+\-@\t\r]/.test(textValue)) textValue = `'${textValue}`;
  return /[;"\r\n]/.test(textValue) ? `"${textValue.replaceAll('"', '""')}"` : textValue;
}

/**
 * The ledger as CSV, oldest first, with ";" between the columns and a comma in amounts, which is what
 * a Dutch spreadsheet expects. `labels` holds the Dutch column names and kind names.
 */
export function exportCsv(state, labels) {
  const ruleName = new Map(state.rules.map((r) => [r.id, r.label]));
  const rows = [...state.entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => [
      e.date,
      cell(findPot(state, e.potId).name),
      cell(labels.kinds[e.kind]),
      formatDecimal(e.amount), // a number, so its minus sign stays
      cell(e.note),
      cell(ruleName.get(e.ruleId)),
    ]);
  const lines = [labels.headers.map(cell), ...rows].map((row) => row.join(';'));
  // The mark in front tells Excel the file is UTF-8, so emoji and accents survive.
  return `﻿${lines.join('\r\n')}\r\n`;
}
