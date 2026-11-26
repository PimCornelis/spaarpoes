import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updatePot, updateSettings } from '../js/core/model.js';
import { addSpend, addExtra, move } from '../js/core/ledger.js';
import { partiesReached, recordParties, unusedMonths, attention, backupDue } from '../js/core/alerts.js';
import { basicState, TODAY } from './helpers.js';

function withParty() {
  const s = basicState();
  s.state = updatePot(s.state, s.books, { partyAmount: 5000, partyLabel: 'Nieuw boek!' });
  return s;
}

test('a party happens when the balance goes from below to at the party amount', () => {
  const { state, books } = withParty();
  const almost = addExtra(state, { potId: books, amount: 4999, date: TODAY });
  assert.deepEqual(partiesReached(state, almost), []);
  const reached = addExtra(almost, { potId: books, amount: 1, date: TODAY });
  assert.deepEqual(partiesReached(almost, reached), [{ potId: books, label: 'Nieuw boek!', amount: 5000 }]);
});

test('it happens once: more money above the amount is no new party', () => {
  const { state, books } = withParty();
  const reached = addExtra(state, { potId: books, amount: 6000, date: TODAY });
  const more = addExtra(reached, { potId: books, amount: 100, date: TODAY });
  assert.equal(partiesReached(state, reached).length, 1);
  assert.equal(partiesReached(reached, more).length, 0);
});

test('it arms again when the balance falls below', () => {
  const { state, books, outings } = withParty();
  const reached = addExtra(state, { potId: books, amount: 6000, date: TODAY });
  const spent = addSpend(reached, { potId: books, amount: 2000, date: TODAY });
  assert.equal(partiesReached(reached, spent).length, 0);
  const again = addExtra(spent, { potId: books, amount: 1000, date: TODAY });
  assert.equal(partiesReached(spent, again).length, 1);
  // a move into the pot counts too
  const funded = addExtra(spent, { potId: outings, amount: 1000, date: TODAY });
  const moved = move(funded, { fromPotId: outings, toPotId: books, amount: 1000, date: TODAY });
  assert.equal(partiesReached(funded, moved).length, 1);
});

test('setting a party amount that is already reached is no party', () => {
  const { state, books } = basicState();
  const full = addExtra(state, { potId: books, amount: 9000, date: TODAY });
  const set = updatePot(full, books, { partyAmount: 5000, partyLabel: 'Feestje' });
  assert.deepEqual(partiesReached(full, set), []);
});

test('reached parties are written in the party log', () => {
  const { state, books } = withParty();
  const after = addExtra(state, { potId: books, amount: 5000, date: TODAY });
  const result = recordParties(state, after, TODAY);
  assert.equal(result.parties.length, 1);
  assert.deepEqual(result.state.partyLog, [{ date: TODAY, potId: books, label: 'Nieuw boek!', amount: 5000 }]);
  assert.deepEqual(after.partyLog, []);
});

test('unused months count whole months since the last spend', () => {
  let { state, books } = basicState();
  state = addSpend(state, { potId: books, amount: 100, date: '2026-03-15' });
  assert.equal(unusedMonths(state, books, '2026-04-14'), 0);
  assert.equal(unusedMonths(state, books, '2026-04-15'), 1);
  assert.equal(unusedMonths(state, books, '2026-06-15'), 3);
  assert.equal(unusedMonths(state, books, '2027-06-14'), 14);
  // money coming in is not "using" the pot
  state = addExtra(state, { potId: books, amount: 100, date: '2026-06-01' });
  assert.equal(unusedMonths(state, books, '2026-06-15'), 3);
});

test('the end of a short month counts as a whole month', () => {
  let { state, books } = basicState();
  state = addSpend(state, { potId: books, amount: 100, date: '2026-01-31' });
  assert.equal(unusedMonths(state, books, '2026-02-27'), 0);
  assert.equal(unusedMonths(state, books, '2026-02-28'), 1);
});

test('a pot that was never spent from counts from its first entry, an empty pot not at all', () => {
  let { state, books, outings } = basicState();
  state = addExtra(state, { potId: books, amount: 100, date: '2026-01-10' });
  state = addExtra(state, { potId: books, amount: 100, date: '2026-05-10' });
  assert.equal(unusedMonths(state, books, '2026-06-15'), 5);
  assert.equal(unusedMonths(state, outings, '2026-06-15'), null);
});

test('"Let op" lists pots below zero and pots unused for two months or more', () => {
  let { state, books, outings } = basicState();
  assert.deepEqual(attention(state, TODAY), []);
  state = addSpend(state, { potId: books, amount: 100, date: '2026-06-10' });
  state = addExtra(state, { potId: outings, amount: 100, date: '2026-04-15' });
  assert.deepEqual(attention(state, '2026-06-14'), [{ type: 'negative', potId: books }]);
  assert.deepEqual(attention(state, '2026-06-15'), [
    { type: 'negative', potId: books },
    { type: 'unused', potId: outings, months: 2 },
  ]);
});

test('the free pot can be below zero but is never "unused"', () => {
  let { state } = basicState();
  state = addExtra(state, { potId: 'free', amount: 100, date: '2025-01-01' });
  assert.deepEqual(attention(state, TODAY), []);
  state = addSpend(state, { potId: 'free', amount: 200, date: '2025-01-02' });
  assert.deepEqual(attention(state, TODAY), [{ type: 'negative', potId: 'free' }]);
});

test('the back-up card appears after 14 days without a back-up', () => {
  let { state } = basicState('2026-06-01');
  assert.equal(backupDue(state, '2026-06-14'), false);
  assert.equal(backupDue(state, '2026-06-15'), true);
  state = updateSettings(state, { lastBackupDate: '2026-06-15' });
  assert.equal(backupDue(state, '2026-06-28'), false);
  assert.equal(backupDue(state, '2026-06-29'), true);
});

test('no back-up card while the app still holds the example data', () => {
  let { state } = basicState('2026-06-01');
  state = updateSettings(state, { isSample: true });
  assert.equal(backupDue(state, '2026-12-01'), false);
});
