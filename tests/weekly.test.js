import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updatePot, updateSettings } from '../js/core/model.js';
import { addSpend, addExtra } from '../js/core/ledger.js';
import { recordParties } from '../js/core/alerts.js';
import { weeklySummary, markSummaryShown } from '../js/core/weekly.js';
import { kittenMood } from '../js/core/mood.js';
import { addPot } from '../js/core/model.js';
import { basicState, last } from './helpers.js';

// The week of Monday 8 to Sunday 14 June 2026.
function busyWeek() {
  const s = basicState('2026-06-01');
  let { state } = s;
  state = addPot(state, { name: 'Planten' });
  const plants = last(state.pots).id;
  state = addPot(state, { name: 'Sport' });
  const sport = last(state.pots).id;
  const spend = (potId, amount, date) => { state = addSpend(state, { potId, amount, date }); };
  spend(s.books, 500, '2026-06-07'); // the Sunday before: not counted
  spend(s.books, 1000, '2026-06-08');
  spend(s.books, 250, '2026-06-10');
  spend(s.outings, 3000, '2026-06-12');
  spend(plants, 100, '2026-06-13');
  spend(sport, 900, '2026-06-14');
  spend(s.books, 9999, '2026-06-15'); // this week: not counted
  state = updatePot(state, s.outings, { partyAmount: 5000, partyLabel: 'Dagje weg!' });
  const before = state;
  state = addExtra(state, { potId: s.outings, amount: 20000, date: '2026-06-11' });
  state = recordParties(before, state, '2026-06-11').state;
  return { ...s, state, plants, sport };
}

test('after Sunday the week is summed up: total, the three biggest pots, parties', () => {
  const { state, books, outings, sport } = busyWeek();
  const summary = weeklySummary(state, '2026-06-15');
  assert.equal(summary.weekStart, '2026-06-08');
  assert.equal(summary.weekEnd, '2026-06-14');
  assert.equal(summary.spent, 5250);
  assert.deepEqual(summary.top, [{ potId: outings, amount: 3000 }, { potId: books, amount: 1250 }, { potId: sport, amount: 900 }]);
  assert.deepEqual(summary.parties, [{ date: '2026-06-11', potId: outings, label: 'Dagje weg!', amount: 5000 }]);
});

test('it also shows when the app is first opened later in the week, and only once', () => {
  let { state } = busyWeek();
  assert.equal(weeklySummary(state, '2026-06-19').weekStart, '2026-06-08');
  state = markSummaryShown(state, weeklySummary(state, '2026-06-19'));
  assert.equal(weeklySummary(state, '2026-06-19'), null);
  assert.equal(weeklySummary(state, '2026-06-21'), null); // still Sunday of that week
  assert.equal(weeklySummary(state, '2026-06-22').weekStart, '2026-06-15'); // the next Monday
});

test('no summary for a week before the app was in use', () => {
  const { state } = basicState('2026-06-15');
  assert.equal(weeklySummary(state, '2026-06-16'), null);
  const started = basicState('2026-06-14').state; // started on that Sunday
  assert.equal(weeklySummary(started, '2026-06-15').spent, 0);
});

test('the kitten is content when all is well', () => {
  const { state } = basicState('2026-06-15');
  assert.equal(kittenMood(state, '2026-06-15'), 'content');
});

test('the kitten gets sleepy when nothing was entered for 3 days', () => {
  let { state } = basicState('2026-06-01');
  state = updateSettings(state, { lastEntryDate: '2026-06-10' });
  assert.equal(kittenMood(state, '2026-06-12'), 'content');
  assert.equal(kittenMood(state, '2026-06-13'), 'sleepy');
});

test('before anything was ever entered, the 3 days count from the first opening', () => {
  const { state } = basicState('2026-06-01');
  assert.equal(kittenMood(state, '2026-06-03'), 'content');
  assert.equal(kittenMood(state, '2026-06-04'), 'sleepy');
});

test('a pot below zero worries the kitten, even when it would be sleepy', () => {
  let { state, books } = basicState('2026-06-01');
  state = addSpend(state, { potId: books, amount: 1, date: '2026-06-01' });
  assert.equal(kittenMood(state, '2026-06-20'), 'worried');
  state = addExtra(state, { potId: books, amount: 1, date: '2026-06-02' });
  assert.equal(kittenMood(state, '2026-06-02'), 'content');
});
