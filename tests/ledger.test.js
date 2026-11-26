import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, addPot, updatePot, movePot, archivePot, activePots, balance, heap, entriesForPot } from '../js/core/model.js';
import { addIncome, addSpend, addExtra, allocate, move, deleteEntry } from '../js/core/ledger.js';
import { basicState, last, hasCode, TODAY } from './helpers.js';

test('a new state has exactly one free pot and nothing in it', () => {
  const state = createState({ today: TODAY, freeName: 'Vrij te besteden' });
  assert.equal(state.pots.length, 1);
  assert.equal(state.pots[0].kind, 'free');
  assert.equal(state.pots[0].id, 'free');
  assert.equal(heap(state), 0);
  assert.equal(state.settings.sound, false);
  assert.equal(state.settings.firstUseDate, TODAY);
});

test('a balance is the sum of the entries, the heap the sum of all balances', () => {
  let { state, books, outings } = basicState();
  state = addIncome(state, { amount: 100000, date: TODAY, note: 'loon' });
  state = allocate(state, { potId: books, amount: 3000, date: TODAY });
  state = allocate(state, { potId: outings, amount: 5000, date: TODAY });
  state = addSpend(state, { potId: books, amount: 1250, date: TODAY, note: 'pocket' });
  state = addExtra(state, { potId: outings, amount: 700, date: TODAY });
  assert.equal(balance(state, 'free'), 92000);
  assert.equal(balance(state, books), 1750);
  assert.equal(balance(state, outings), 5700);
  assert.equal(heap(state), 92000 + 1750 + 5700);
});

test('income goes into the free pot, a spend is negative, an extra positive', () => {
  let { state, books } = basicState();
  state = addIncome(state, { amount: 500, date: TODAY });
  assert.deepEqual(
    { potId: last(state.entries).potId, amount: last(state.entries).amount, kind: last(state.entries).kind },
    { potId: 'free', amount: 500, kind: 'income' },
  );
  state = addSpend(state, { potId: books, amount: 200, date: TODAY });
  assert.equal(last(state.entries).amount, -200);
  assert.equal(last(state.entries).kind, 'spend');
  state = addExtra(state, { potId: books, amount: 300, date: TODAY });
  assert.equal(last(state.entries).amount, 300);
  assert.equal(last(state.entries).kind, 'extra');
});

test('allocate makes two linked entries that cancel out', () => {
  let { state, books } = basicState();
  state = allocate(state, { potId: books, amount: 2500, date: TODAY });
  const [out, into] = state.entries.slice(-2);
  assert.equal(out.potId, 'free');
  assert.equal(out.amount, -2500);
  assert.equal(into.potId, books);
  assert.equal(into.amount, 2500);
  assert.equal(out.kind, 'allocate');
  assert.equal(into.kind, 'allocate');
  assert.ok(out.groupId);
  assert.equal(out.groupId, into.groupId);
  assert.notEqual(out.id, into.id);
});

test('move makes two linked entries between two pots and leaves the heap alone', () => {
  let { state, books, outings } = basicState();
  state = addExtra(state, { potId: books, amount: 4000, date: TODAY });
  const before = heap(state);
  state = move(state, { fromPotId: books, toPotId: outings, amount: 1500, date: TODAY });
  const [out, into] = state.entries.slice(-2);
  assert.equal(out.groupId, into.groupId);
  assert.equal(out.kind, 'move');
  assert.equal(balance(state, books), 2500);
  assert.equal(balance(state, outings), 1500);
  assert.equal(heap(state), before);
});

test('every group gets its own link id', () => {
  let { state, books } = basicState();
  state = allocate(state, { potId: books, amount: 100, date: TODAY });
  const first = last(state.entries).groupId;
  state = allocate(state, { potId: books, amount: 100, date: TODAY });
  assert.notEqual(last(state.entries).groupId, first);
  const ids = state.entries.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('deleting one side of a linked pair deletes both', () => {
  let { state, books, outings } = basicState();
  state = addSpend(state, { potId: books, amount: 100, date: TODAY });
  state = move(state, { fromPotId: books, toPotId: outings, amount: 1500, date: TODAY });
  state = deleteEntry(state, last(state.entries).id);
  assert.equal(state.entries.length, 1);
  state = deleteEntry(state, state.entries[0].id);
  assert.equal(state.entries.length, 0);
});

test('changes never alter the state that went in', () => {
  const { state, books } = basicState();
  const copy = JSON.stringify(state);
  addSpend(state, { potId: books, amount: 100, date: TODAY });
  allocate(state, { potId: books, amount: 100, date: TODAY });
  updatePot(state, books, { name: 'Lezen' });
  assert.equal(JSON.stringify(state), copy);
});

test('refuses bad ledger input', () => {
  const { state, books } = basicState();
  assert.throws(() => addSpend(state, { potId: books, amount: 0, date: TODAY }), hasCode('bad-amount'));
  assert.throws(() => addSpend(state, { potId: books, amount: -5, date: TODAY }), hasCode('bad-amount'));
  assert.throws(() => addSpend(state, { potId: books, amount: 1.5, date: TODAY }), hasCode('bad-amount'));
  assert.throws(() => addSpend(state, { potId: 'nope', amount: 5, date: TODAY }), hasCode('unknown-pot'));
  assert.throws(() => addSpend(state, { potId: books, amount: 5, date: '2026-02-30' }), hasCode('bad-date'));
  assert.throws(() => move(state, { fromPotId: books, toPotId: books, amount: 5, date: TODAY }), hasCode('same-pot'));
  assert.throws(() => allocate(state, { potId: 'free', amount: 5, date: TODAY }), hasCode('same-pot'));
  assert.throws(() => deleteEntry(state, 'nope'), hasCode('unknown-entry'));
});

test('entries of a pot come newest first', () => {
  let { state, books } = basicState();
  state = addSpend(state, { potId: books, amount: 1, date: '2026-06-01', note: 'a' });
  state = addSpend(state, { potId: books, amount: 2, date: '2026-06-10', note: 'b' });
  state = addSpend(state, { potId: books, amount: 3, date: '2026-06-05', note: 'c' });
  state = addSpend(state, { potId: books, amount: 4, date: '2026-06-10', note: 'd' });
  assert.deepEqual(entriesForPot(state, books).map((e) => e.note), ['d', 'b', 'c', 'a']);
});

test('pots keep an order that can be moved up and down', () => {
  let { state, books, outings } = basicState();
  assert.deepEqual(activePots(state).map((p) => p.id), [books, outings]);
  state = movePot(state, outings, -1);
  assert.deepEqual(activePots(state).map((p) => p.id), [outings, books]);
  state = movePot(state, outings, -1); // already on top: nothing happens
  assert.deepEqual(activePots(state).map((p) => p.id), [outings, books]);
  state = movePot(state, outings, 1);
  assert.deepEqual(activePots(state).map((p) => p.id), [books, outings]);
});

test('a pot can be renamed and given a party amount', () => {
  let { state, books } = basicState();
  state = updatePot(state, books, { name: 'Lezen', partyAmount: 5000, partyLabel: 'Nieuw boek!' });
  const pot = state.pots.find((p) => p.id === books);
  assert.equal(pot.name, 'Lezen');
  assert.equal(pot.partyAmount, 5000);
  assert.equal(pot.partyLabel, 'Nieuw boek!');
  state = updatePot(state, books, { partyAmount: null, partyLabel: null });
  assert.equal(state.pots.find((p) => p.id === books).partyAmount, null);
  assert.throws(() => updatePot(state, books, { name: '  ' }), hasCode('bad-name'));
  assert.throws(() => updatePot(state, books, { partyAmount: 0 }), hasCode('bad-amount'));
  assert.throws(() => updatePot(state, books, { kind: 'free' }), hasCode('bad-field'));
});

test('a pot can only be put away when it is empty and no rule feeds it', () => {
  let { state, books } = basicState();
  state = addExtra(state, { potId: books, amount: 100, date: TODAY });
  assert.throws(() => archivePot(state, books, TODAY), hasCode('pot-not-empty'));
  state = addSpend(state, { potId: books, amount: 100, date: TODAY });
  state = archivePot(state, books, TODAY);
  assert.ok(state.pots.find((p) => p.id === books).archived);
  assert.ok(!activePots(state).some((p) => p.id === books));
  assert.throws(() => addSpend(state, { potId: books, amount: 5, date: TODAY }), hasCode('unknown-pot'));
  assert.throws(() => archivePot(state, 'free', TODAY), hasCode('free-pot'));
});

test('a new pot goes to the bottom', () => {
  let { state } = basicState();
  state = addPot(state, { name: 'Planten', emoji: '🪴', colorToken: 'peach' });
  assert.equal(last(activePots(state)).name, 'Planten');
});
