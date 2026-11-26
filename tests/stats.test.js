import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addIncome, addSpend, addExtra, allocate, move } from '../js/core/ledger.js';
import { addRule, endRule } from '../js/core/rules.js';
import {
  rangeMonths, spendPerPotPerMonth, balanceOverTime, incomeAgainstSpend, recurringCosts, spendPerWeekday,
} from '../js/core/stats.js';
import { basicState, last } from './helpers.js';

/** April to June: some of everything. */
function history() {
  const s = basicState('2026-04-01');
  let state = s.state;
  state = addIncome(state, { amount: 200000, date: '2026-04-01' });
  state = allocate(state, { potId: s.books, amount: 10000, date: '2026-04-01' });
  state = addSpend(state, { potId: s.books, amount: 1500, date: '2026-04-06' }); // Monday
  state = addSpend(state, { potId: s.books, amount: 500, date: '2026-04-30' }); // Thursday
  state = addIncome(state, { amount: 200000, date: '2026-05-01' });
  state = addSpend(state, { potId: s.outings, amount: 3000, date: '2026-05-04' }); // Monday
  state = addExtra(state, { potId: s.outings, amount: 5000, date: '2026-06-07' }); // Sunday
  state = move(state, { fromPotId: s.books, toPotId: s.outings, amount: 1000, date: '2026-06-08' });
  state = addSpend(state, { potId: s.books, amount: 700, date: '2026-06-14' }); // Sunday
  return { ...s, state };
}

test('the range choices are whole calendar months ending this month', () => {
  assert.deepEqual(rangeMonths('2026-06-15', 1), ['2026-06']);
  assert.deepEqual(rangeMonths('2026-02-15', 3), ['2025-12', '2026-01', '2026-02']);
  assert.equal(rangeMonths('2026-06-15', 12).length, 12);
  assert.equal(rangeMonths('2026-06-15', 12)[0], '2025-07');
});

test('spend per pot per month, with the entries behind each bar', () => {
  const { state, books, outings } = history();
  const result = spendPerPotPerMonth(state, ['2026-04', '2026-05', '2026-06']);
  assert.deepEqual(result.series.map((s) => [s.potId, s.values]), [[books, [2000, 0, 700]], [outings, [0, 3000, 0]]]);
  assert.deepEqual(result.totals, [2000, 3000, 700]);
  const aprilBooks = result.series[0].entryIds[0];
  assert.deepEqual(aprilBooks.map((id) => state.entries.find((e) => e.id === id).amount), [-1500, -500]);
});

test('pots without spending in the range are left out', () => {
  const { state, books } = history();
  assert.deepEqual(spendPerPotPerMonth(state, ['2026-06']).series.map((s) => s.potId), [books]);
});

test('balance of a pot over time, per month', () => {
  const { state, books } = history();
  const points = balanceOverTime(state, books, '2026-04-01', '2026-06-15', 'month');
  assert.deepEqual(points.map((p) => [p.start, p.date, p.balance]), [
    ['2026-04-01', '2026-04-30', 8000],
    ['2026-05-01', '2026-05-31', 8000],
    ['2026-06-01', '2026-06-15', 6300],
  ]);
  assert.equal(points[0].entryIds.length, 3);
  assert.equal(points[1].entryIds.length, 0);
});

test('balance over time includes what came before the range, per week and per day', () => {
  const { state, books } = history();
  const weeks = balanceOverTime(state, books, '2026-06-01', '2026-06-15', 'week');
  assert.deepEqual(weeks.map((p) => [p.start, p.date, p.balance]), [
    ['2026-06-01', '2026-06-07', 8000],
    ['2026-06-08', '2026-06-14', 6300],
    ['2026-06-15', '2026-06-15', 6300],
  ]);
  const days = balanceOverTime(state, books, '2026-06-13', '2026-06-15', 'day');
  assert.deepEqual(days.map((p) => p.balance), [7000, 6300, 6300]);
});

test('balance over time for no pot in particular is the whole heap', () => {
  const { state } = history();
  const points = balanceOverTime(state, null, '2026-04-01', '2026-04-30', 'month');
  assert.equal(points[0].balance, 198000);
});

test('income against spend per month; moving between pots is neither', () => {
  const { state } = history();
  const rows = incomeAgainstSpend(state, ['2026-04', '2026-05', '2026-06']);
  assert.deepEqual(rows.map((r) => [r.month, r.income, r.extra, r.spend]), [
    ['2026-04', 200000, 0, 2000],
    ['2026-05', 200000, 0, 3000],
    ['2026-06', 0, 5000, 700],
  ]);
  assert.equal(rows[0].incomingIds.length, 1);
  assert.equal(rows[0].spendIds.length, 2);
});

test('recurring costs per month and per year', () => {
  let { state, books, outings } = basicState();
  const base = { kind: 'spend', potId: books, every: 1, startDate: '2026-06-01', endDate: null, dayOfMonth: 1 };
  state = addRule(state, { ...base, label: 'maand', unit: 'month', amount: 1000 });
  state = addRule(state, { ...base, label: 'kwartaal', unit: 'month', every: 3, amount: 3000 });
  state = addRule(state, { ...base, label: 'week', unit: 'week', amount: 500, dayOfMonth: null });
  state = addRule(state, { ...base, label: 'twee jaar', unit: 'year', every: 2, amount: 5000, dayOfMonth: null });
  state = addRule(state, { ...base, label: 'gestopt', unit: 'month', amount: 99900 });
  state = endRule(state, last(state.rules).id, '2026-06-15');
  state = addRule(state, { ...base, label: 'geen kosten', kind: 'allocate', potId: outings, unit: 'month', amount: 77700 });
  const result = recurringCosts(state, '2026-06-15');
  assert.deepEqual(result.rules.map((r) => [r.label, r.perYear, r.perMonth]), [
    ['week', 26000, 2167],
    ['kwartaal', 12000, 1000],
    ['maand', 12000, 1000],
    ['twee jaar', 2500, 208],
  ]);
  assert.equal(result.perYear, 52500);
  assert.equal(result.perMonth, 4375);
});

test('spend per weekday, Monday first', () => {
  const { state } = history();
  const days = spendPerWeekday(state, '2026-04-01', '2026-06-15');
  assert.equal(days.length, 7);
  assert.deepEqual(days.map((d) => d.amount), [4500, 0, 0, 500, 0, 0, 700]);
  assert.equal(days[0].entryIds.length, 2);
});
