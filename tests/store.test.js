// The store's logic, with a stand-in for the phone's database that keeps everything in memory.
// The real database (IndexedDB) does not exist under Node and is not tested here.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openStore, createMemoryAdapter, askForPersistence } from '../js/store.js';
import { balance, updatePot } from '../js/core/model.js';
import { addSpend, addExtra } from '../js/core/ledger.js';
import { addRule } from '../js/core/rules.js';
import { basicState, hasCode, last, TODAY } from './helpers.js';

const open = (adapter, today = TODAY) => openStore({ adapter, today, firstState: () => basicState(today).state });
const books = (state) => state.pots.find((p) => p.name === 'Boeken').id;

test('the first opening creates the state and saves it straight away', async () => {
  const adapter = createMemoryAdapter();
  const store = await open(adapter);
  assert.equal(store.state.pots.length, 3);
  assert.deepEqual((await adapter.read()).data, store.state);
});

test('a change is saved, and is still there after opening again', async () => {
  const adapter = createMemoryAdapter();
  const store = await open(adapter);
  await store.apply((s) => addExtra(s, { potId: books(s), amount: 500, date: TODAY }), TODAY);
  const again = await open(adapter);
  assert.equal(balance(again.state, books(again.state)), 500);
  assert.equal(again.state.entries.length, 1);
});

test('a change counts only once it has been saved', async () => {
  const adapter = createMemoryAdapter();
  const store = await open(adapter);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const write = adapter.write;
  adapter.write = async (...args) => { await gate; return write(...args); };
  const pending = store.apply((s) => addExtra(s, { potId: books(s), amount: 500, date: TODAY }), TODAY);
  await new Promise((resolve) => { setImmediate(resolve); });
  assert.equal(store.state.entries.length, 0);
  release();
  await pending;
  assert.equal(store.state.entries.length, 1);
});

test('when saving fails the error comes through and nothing counts as done', async () => {
  const adapter = createMemoryAdapter();
  const store = await open(adapter);
  const write = adapter.write;
  adapter.write = async () => { throw new Error('disk full'); };
  await assert.rejects(store.apply((s) => addExtra(s, { potId: books(s), amount: 500, date: TODAY }), TODAY), /disk full/);
  assert.equal(store.state.entries.length, 0);
  adapter.write = write;
  await store.apply((s) => addExtra(s, { potId: books(s), amount: 700, date: TODAY }), TODAY);
  assert.equal(store.state.entries.length, 1);
});

test('changes made quickly after each other are all kept', async () => {
  const adapter = createMemoryAdapter();
  const store = await open(adapter);
  await Promise.all([1, 2, 3, 4, 5].map((n) =>
    store.apply((s) => addExtra(s, { potId: books(s), amount: n, date: TODAY }), TODAY)));
  assert.equal(balance((await open(adapter)).state, books(store.state)), 15);
});

test('a second window cannot silently overwrite what the first one saved', async () => {
  const adapter = createMemoryAdapter();
  const first = await open(adapter);
  const second = await open(adapter);
  await first.apply((s) => addExtra(s, { potId: books(s), amount: 500, date: TODAY }), TODAY);
  await assert.rejects(
    second.apply((s) => addExtra(s, { potId: books(s), amount: 1, date: TODAY }), TODAY),
    hasCode('store-conflict'),
  );
  await second.reload();
  assert.equal(second.state.entries.length, 1);
});

test('a state that could not be read back later is never saved', async () => {
  const adapter = createMemoryAdapter();
  const store = await open(adapter);
  await assert.rejects(store.apply((s) => ({ ...s, nextId: 'x' }), TODAY), hasCode('import-invalid'));
  assert.equal((await adapter.read()).data.nextId, store.state.nextId);
});

test('damaged saved data stops the app and is left untouched', async () => {
  const damaged = { schema: 1, revision: 3, data: { nextId: 1, pots: [] } };
  const adapter = createMemoryAdapter(damaged);
  await assert.rejects(open(adapter), hasCode('import-invalid'));
  assert.deepEqual(await adapter.read(), damaged);
  await assert.rejects(open(createMemoryAdapter({ schema: 9, revision: 1, data: {} })), hasCode('store-version'));
});

test('catching up books due recurring entries and reports parties', async () => {
  const adapter = createMemoryAdapter();
  const store = await open(adapter);
  await store.apply((s) => {
    const withParty = updatePot(s, books(s), { partyAmount: 1000, partyLabel: 'Nieuw boek!' });
    return addRule(withParty, {
      label: 'Spaargeld', kind: 'allocate', potId: books(s), amount: 1000, every: 1, unit: 'month',
      dayOfMonth: 20, startDate: '2026-06-20', endDate: null,
    });
  }, TODAY);
  const nothing = await store.catchUp(TODAY);
  assert.equal(nothing.made.length, 0);
  const result = await store.catchUp('2026-06-21');
  assert.equal(result.made.length, 2);
  assert.equal(result.parties.length, 1);
  assert.equal(last(store.state.partyLog).date, '2026-06-21');
  const revision = (await adapter.read()).revision;
  await store.catchUp('2026-06-21');
  assert.equal((await adapter.read()).revision, revision); // nothing new: nothing written
});

test('an exported back-up file brings everything back on an empty phone', async () => {
  const store = await open(createMemoryAdapter());
  await store.apply((s) => addExtra(s, { potId: books(s), amount: 4200, date: TODAY, note: 'cadeau' }), TODAY);
  const file = store.backupFile(TODAY, '2026-06-15T10:00:00.000Z');
  assert.equal(file.name, 'spaarpoes-backup-2026-06-15.json.txt');
  assert.equal(file.type, 'text/plain');

  const otherAdapter = createMemoryAdapter();
  const other = await open(otherAdapter);
  await other.apply((s) => addSpend(s, { potId: books(s), amount: 1, date: TODAY }), TODAY);
  await other.restore(file.content, TODAY);
  assert.deepEqual(other.state, store.state);
  assert.deepEqual((await open(otherAdapter)).state, store.state);
});

test('a bad file is refused and the current data stays', async () => {
  const adapter = createMemoryAdapter();
  const store = await open(adapter);
  await store.apply((s) => addExtra(s, { potId: books(s), amount: 500, date: TODAY }), TODAY);
  const before = JSON.stringify(await adapter.read());
  await assert.rejects(store.restore('not a back-up', TODAY), hasCode('import-not-json'));
  await assert.rejects(store.restore('{"app":"spaarpoes","version":99,"data":{}}', TODAY), hasCode('import-version'));
  assert.equal(JSON.stringify(await adapter.read()), before);
});

test('the ledger can be exported as a CSV file', async () => {
  const store = await open(createMemoryAdapter());
  await store.apply((s) => addExtra(s, { potId: books(s), amount: 500, date: TODAY }), TODAY);
  const file = store.ledgerFile(TODAY, { headers: ['a', 'b', 'c', 'd', 'e', 'f'], kinds: { extra: 'extra' } });
  assert.equal(file.name, 'spaarpoes-boekingen-2026-06-15.csv');
  assert.equal(file.type, 'text/csv');
  assert.ok(file.content.includes(';Boeken;extra;5,00;;'));
});

const fakeStorage = ({ already = false, grants = false } = {}) => {
  const calls = [];
  let persisted = already;
  return {
    calls,
    persisted: async () => { calls.push('persisted'); return persisted; },
    persist: async () => { calls.push('persist'); persisted = grants; return grants; },
  };
};

test('storage protection is only asked for in the installed app', async () => {
  const inBrowser = fakeStorage({ grants: true });
  assert.deepEqual(await askForPersistence(inBrowser, false), { supported: true, persisted: false });
  assert.deepEqual(inBrowser.calls, ['persisted']);

  const installed = fakeStorage({ grants: true });
  assert.deepEqual(await askForPersistence(installed, true), { supported: true, persisted: true });
  assert.deepEqual(installed.calls, ['persisted', 'persist']);

  const protectedAlready = fakeStorage({ already: true });
  assert.deepEqual(await askForPersistence(protectedAlready, true), { supported: true, persisted: true });
  assert.deepEqual(protectedAlready.calls, ['persisted']);
});

test('a refusal or a missing storage call is reported as it is', async () => {
  assert.deepEqual(await askForPersistence(fakeStorage(), true), { supported: true, persisted: false });
  assert.deepEqual(await askForPersistence(undefined, true), { supported: false, persisted: false });
});
