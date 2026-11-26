import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balance, archivePot } from '../js/core/model.js';
import { deleteEntry } from '../js/core/ledger.js';
import {
  addRule, updateRule, endRule, skipNext, unskip, generateDue, occurrencesBetween, nextOccurrence, upcoming,
} from '../js/core/rules.js';
import { basicState, last, hasCode } from './helpers.js';

const monthly = (potId, extra = {}) => ({
  label: 'Maandelijks', kind: 'allocate', potId, amount: 1000, every: 1, unit: 'month',
  dayOfMonth: 25, startDate: '2026-01-25', endDate: null, ...extra,
});
const datesOf = (state, ruleId) => state.entries.filter((e) => e.ruleId === ruleId && e.potId !== 'free').map((e) => e.date);

test('a monthly rule makes every occurrence up to today, once', () => {
  let { state, books } = basicState();
  state = addRule(state, monthly(books));
  const ruleId = last(state.rules).id;
  let result = generateDue(state, '2026-04-24');
  state = result.state;
  assert.deepEqual(datesOf(state, ruleId), ['2026-01-25', '2026-02-25', '2026-03-25']);
  assert.equal(result.made.length, 6); // allocate: two linked entries each
  assert.equal(last(state.rules).lastMadeUpTo, '2026-04-24');

  result = generateDue(state, '2026-04-24'); // opening again the same day
  assert.equal(result.made.length, 0);
  assert.equal(result.state.entries.length, state.entries.length);

  state = generateDue(state, '2026-04-25').state; // the day itself counts
  assert.equal(datesOf(state, ruleId).length, 4);
  assert.equal(balance(state, books), 4000);
  assert.equal(balance(state, 'free'), -4000);
});

test('a 31st means the last day of shorter months', () => {
  const { books } = basicState();
  const rule = monthly(books, { dayOfMonth: 31, startDate: '2026-01-31', skipped: [] });
  assert.deepEqual(occurrencesBetween(rule, '2026-01-01', '2026-07-31'),
    ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30', '2026-07-31']);
  // leap year
  assert.deepEqual(occurrencesBetween(rule, '2028-02-01', '2028-02-29'), ['2028-02-29']);
});

test('when the day has already passed in the start month, the rule begins next month', () => {
  const { books } = basicState();
  const rule = monthly(books, { dayOfMonth: 1, every: 3, startDate: '2026-01-15' });
  assert.deepEqual(occurrencesBetween(rule, '2026-01-01', '2026-12-31'),
    ['2026-02-01', '2026-05-01', '2026-08-01', '2026-11-01']);
});

test('weekly rules step in whole weeks from the start date', () => {
  const { books } = basicState();
  const rule = monthly(books, { unit: 'week', every: 2, dayOfMonth: null, startDate: '2026-03-27' });
  // runs across the switch to summer time without drifting
  assert.deepEqual(occurrencesBetween(rule, '2026-03-01', '2026-05-10'),
    ['2026-03-27', '2026-04-10', '2026-04-24', '2026-05-08']);
});

test('yearly rules keep their date, and 29 February moves to the 28th', () => {
  const { books } = basicState();
  const rule = monthly(books, { unit: 'year', every: 1, dayOfMonth: null, startDate: '2028-02-29' });
  assert.deepEqual(occurrencesBetween(rule, '2028-01-01', '2032-12-31'),
    ['2028-02-29', '2029-02-28', '2030-02-28', '2031-02-28', '2032-02-29']);
  const everyOther = monthly(books, { unit: 'year', every: 2, dayOfMonth: null, startDate: '2026-11-03' });
  assert.deepEqual(occurrencesBetween(everyOther, '2026-01-01', '2031-01-01'), ['2026-11-03', '2028-11-03', '2030-11-03']);
});

test('an end date stops the rule, and counts as the last possible day', () => {
  const { books } = basicState();
  const rule = monthly(books, { endDate: '2026-03-25' });
  assert.deepEqual(occurrencesBetween(rule, '2026-01-01', '2026-12-31'), ['2026-01-25', '2026-02-25', '2026-03-25']);
});

test('income rules go into the free pot, fixed costs become spends', () => {
  let { state, books } = basicState();
  state = addRule(state, monthly('free', { kind: 'income', amount: 200000, startDate: '2026-06-01', dayOfMonth: 1 }));
  state = addRule(state, monthly(books, { kind: 'spend', amount: 900, startDate: '2026-06-01', dayOfMonth: 2 }));
  state = generateDue(state, '2026-06-15').state;
  assert.deepEqual(state.entries.map((e) => [e.kind, e.potId, e.amount]),
    [['income', 'free', 200000], ['spend', books, -900]]);
});

test('on one day income is booked before allocations', () => {
  let { state, books } = basicState();
  state = addRule(state, monthly(books, { startDate: '2026-06-01', dayOfMonth: 1 }));
  state = addRule(state, monthly('free', { kind: 'income', amount: 5000, startDate: '2026-06-01', dayOfMonth: 1 }));
  state = generateDue(state, '2026-06-01').state;
  assert.deepEqual(state.entries.map((e) => e.kind), ['income', 'allocate', 'allocate']);
});

test('skipping the next occurrence leaves the money in the free pot', () => {
  let { state, books } = basicState();
  state = addRule(state, monthly(books, { startDate: '2026-05-25' }));
  const ruleId = last(state.rules).id;
  state = generateDue(state, '2026-06-15').state;
  assert.equal(balance(state, books), 1000);

  state = skipNext(state, ruleId, '2026-06-15');
  assert.deepEqual(last(state.rules).skipped, ['2026-06-25']);
  assert.equal(nextOccurrence(last(state.rules), '2026-06-15'), '2026-07-25');

  state = generateDue(state, '2026-07-26').state;
  assert.deepEqual(datesOf(state, ruleId), ['2026-05-25', '2026-07-25']);
  assert.equal(balance(state, books), 2000);
  assert.equal(balance(state, 'free'), -2000);
});

test('skipping twice skips two occurrences, and a skip can be taken back', () => {
  let { state, books } = basicState();
  state = addRule(state, monthly(books, { startDate: '2026-06-25' }));
  const ruleId = last(state.rules).id;
  state = skipNext(state, ruleId, '2026-06-15');
  state = skipNext(state, ruleId, '2026-06-15');
  assert.deepEqual(last(state.rules).skipped, ['2026-06-25', '2026-07-25']);
  state = unskip(state, ruleId, '2026-06-25', '2026-06-15');
  assert.deepEqual(last(state.rules).skipped, ['2026-07-25']);
});

test('lastMadeUpTo never goes backwards when the phone clock does', () => {
  let { state, books } = basicState();
  state = addRule(state, monthly(books));
  state = generateDue(state, '2026-03-30').state;
  const count = state.entries.length;
  state = generateDue(state, '2026-02-01').state;
  assert.equal(last(state.rules).lastMadeUpTo, '2026-03-30');
  state = generateDue(state, '2026-03-30').state;
  assert.equal(state.entries.length, count);
});

test('a deleted rule-made entry does not come back', () => {
  let { state, books } = basicState();
  state = addRule(state, monthly(books, { startDate: '2026-06-01', dayOfMonth: 1 }));
  state = generateDue(state, '2026-06-15').state;
  state = deleteEntry(state, state.entries[0].id);
  state = generateDue(state, '2026-06-16').state;
  assert.equal(state.entries.length, 0);
});

test('editing a rule changes future occurrences only', () => {
  let { state, books } = basicState();
  state = addRule(state, monthly(books));
  const ruleId = last(state.rules).id;
  // two occurrences are due but not made yet: they keep the old amount
  state = updateRule(state, ruleId, { amount: 2500 }, '2026-02-26');
  state = generateDue(state, '2026-03-26').state;
  assert.deepEqual(state.entries.filter((e) => e.potId === books).map((e) => e.amount), [1000, 1000, 2500]);
  // moving the start back does not create entries in the past
  const count = state.entries.length;
  state = updateRule(state, ruleId, { startDate: '2025-06-25' }, '2026-03-26');
  state = generateDue(state, '2026-03-26').state;
  assert.equal(state.entries.length, count);
});

test('ending a rule keeps what was made and makes nothing after', () => {
  let { state, books } = basicState();
  state = addRule(state, monthly(books));
  const ruleId = last(state.rules).id;
  state = endRule(state, ruleId, '2026-02-27');
  state = generateDue(state, '2026-08-01').state;
  assert.deepEqual(datesOf(state, ruleId), ['2026-01-25', '2026-02-25']);
  assert.equal(nextOccurrence(last(state.rules), '2026-02-27'), null);
});

test('a pot with a running rule cannot be put away, after ending the rule it can', () => {
  let { state, books } = basicState();
  state = addRule(state, monthly(books, { startDate: '2026-09-01' }));
  assert.throws(() => archivePot(state, books, '2026-06-15'), hasCode('pot-has-rules'));
  state = endRule(state, last(state.rules).id, '2026-06-15');
  assert.ok(archivePot(state, books, '2026-06-15').pots.find((p) => p.id === books).archived);
});

test('upcoming shows the next seven days, without skipped or already made ones', () => {
  let { state, books, outings } = basicState();
  state = addRule(state, monthly(books, { label: 'op dag 7', startDate: '2026-06-22', dayOfMonth: 22 }));
  state = addRule(state, monthly(books, { label: 'op dag 8', startDate: '2026-06-23', dayOfMonth: 23 }));
  state = addRule(state, monthly(outings, { label: 'vandaag', startDate: '2026-06-15', dayOfMonth: 15 }));
  state = addRule(state, monthly(outings, { label: 'wekelijks', unit: 'week', dayOfMonth: null, startDate: '2026-06-17' }));
  state = generateDue(state, '2026-06-15').state;
  assert.deepEqual(upcoming(state, '2026-06-15', 7).map((u) => [u.label, u.date]),
    [['wekelijks', '2026-06-17'], ['op dag 7', '2026-06-22']]);
  state = skipNext(state, state.rules[3].id, '2026-06-15');
  assert.deepEqual(upcoming(state, '2026-06-15', 7).map((u) => u.label), ['op dag 7']);
});

test('refuses rules that make no sense', () => {
  const { state, books } = basicState();
  const bad = [
    [{ label: '' }, 'bad-name'],
    [{ amount: 0 }, 'bad-amount'],
    [{ every: 0 }, 'bad-frequency'],
    [{ unit: 'day' }, 'bad-frequency'],
    [{ dayOfMonth: 32 }, 'bad-day'],
    [{ startDate: 'gisteren' }, 'bad-date'],
    [{ endDate: '2025-01-01' }, 'end-before-start'],
    [{ kind: 'move' }, 'bad-kind'],
    [{ potId: 'nope' }, 'unknown-pot'],
    [{ potId: 'free' }, 'same-pot'], // allocating from the free pot to itself
    [{ kind: 'income' }, 'income-needs-free-pot'],
  ];
  for (const [change, code] of bad) {
    assert.throws(() => addRule(state, monthly(books, change)), hasCode(code), code);
  }
});
