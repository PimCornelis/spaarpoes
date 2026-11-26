import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updatePot } from '../js/core/model.js';
import { addIncome, addSpend, allocate } from '../js/core/ledger.js';
import { addRule, generateDue } from '../js/core/rules.js';
import { exportJson, importJson, exportCsv, FILE_VERSION } from '../js/core/backup.js';
import { basicState, hasCode, TODAY } from './helpers.js';

function fullState() {
  let { state, books } = basicState();
  state = updatePot(state, books, { partyAmount: 5000, partyLabel: 'Nieuw boek!' });
  state = addIncome(state, { amount: 100000, date: TODAY, note: 'loon' });
  state = allocate(state, { potId: books, amount: 2000, date: TODAY });
  state = addSpend(state, { potId: books, amount: 1234, date: TODAY, note: 'kaft; "rood"\nen blauw' });
  state = addRule(state, {
    label: 'Abonnement', kind: 'spend', potId: books, amount: 999, every: 1, unit: 'month',
    dayOfMonth: 1, startDate: '2026-06-01', endDate: null,
  });
  state = generateDue(state, TODAY).state;
  return { state, books };
}

test('the back-up file has a version and brings everything back', () => {
  const { state } = fullState();
  const text = exportJson(state, '2026-06-15T12:00:00.000Z');
  const file = JSON.parse(text);
  assert.equal(file.app, 'spaarpoes');
  assert.equal(file.version, FILE_VERSION);
  assert.equal(file.exportedAt, '2026-06-15T12:00:00.000Z');
  assert.deepEqual(importJson(text), state);
});

test('a byte order mark in front of the file does not matter', () => {
  const { state } = fullState();
  assert.deepEqual(importJson('﻿' + exportJson(state, TODAY)), state);
});

const broken = (change) => {
  const file = JSON.parse(exportJson(fullState().state, TODAY));
  change(file);
  return JSON.stringify(file);
};
const refuses = (text, code, problem) => assert.throws(
  () => importJson(text),
  (error) => hasCode(code)(error) && (problem === undefined || error.details.problem === problem),
  `${code} ${problem ?? ''}`,
);

test('a bad file is refused with a reason', () => {
  refuses('dit is geen bestand', 'import-not-json');
  refuses('', 'import-not-json');
  refuses('{"iets": "anders"}', 'import-not-spaarpoes');
  refuses('[1,2,3]', 'import-not-spaarpoes');
  refuses('null', 'import-not-spaarpoes');
  refuses(broken((f) => { f.version = 2; }), 'import-version');
  refuses(broken((f) => { delete f.data; }), 'import-invalid', 'missing-data');
});

test('a damaged file is refused: pots', () => {
  refuses(broken((f) => { f.data.pots = f.data.pots.filter((p) => p.kind !== 'free'); }), 'import-invalid', 'free-pot');
  refuses(broken((f) => { f.data.pots.push({ ...f.data.pots[0] }); }), 'import-invalid', 'double-id');
  refuses(broken((f) => { f.data.pots[1].name = 7; }), 'import-invalid', 'field');
  refuses(broken((f) => { f.data.pots[1].surprise = true; }), 'import-invalid', 'unknown-field');
  refuses(broken((f) => { delete f.data.pots[1].emoji; }), 'import-invalid', 'field');
});

test('a damaged file is refused: entries', () => {
  refuses(broken((f) => { f.data.entries[0].amount = 12.5; }), 'import-invalid', 'field');
  refuses(broken((f) => { f.data.entries[0].amount = '100'; }), 'import-invalid', 'field');
  refuses(broken((f) => { f.data.entries[0].date = '2026-13-01'; }), 'import-invalid', 'field');
  refuses(broken((f) => { f.data.entries[0].potId = 'p999'; }), 'import-invalid', 'unknown-pot');
  refuses(broken((f) => { f.data.entries[0].kind = 'gift'; }), 'import-invalid', 'field');
  refuses(broken((f) => { f.data.entries[3].amount = 5; }), 'import-invalid', 'sign'); // a positive spend
  refuses(broken((f) => { f.data.entries.splice(1, 1); }), 'import-invalid', 'broken-pair');
  refuses(broken((f) => { f.data.entries[1].amount = -1; }), 'import-invalid', 'broken-pair');
});

test('a damaged file is refused: rules, settings, counter', () => {
  refuses(broken((f) => { f.data.rules[0].unit = 'day'; }), 'import-invalid', 'field');
  refuses(broken((f) => { f.data.rules[0].every = 0; }), 'import-invalid', 'field');
  refuses(broken((f) => { f.data.rules[0].skipped = ['morgen']; }), 'import-invalid', 'field');
  refuses(broken((f) => { f.data.rules[0].potId = 'p999'; }), 'import-invalid', 'unknown-pot');
  refuses(broken((f) => { f.data.settings.sound = 'yes'; }), 'import-invalid', 'field');
  refuses(broken((f) => { f.data.nextId = 1; }), 'import-invalid', 'counter');
});

test('the CSV file lists the ledger for a Dutch spreadsheet', () => {
  const { state } = fullState();
  const labels = {
    headers: ['datum', 'potje', 'soort', 'bedrag', 'notitie', 'vaste regel'],
    kinds: { income: 'inkomen', spend: 'uitgave', extra: 'extra', allocate: 'verdeeld', move: 'verplaatst' },
  };
  const csv = exportCsv(state, labels);
  assert.ok(csv.startsWith('﻿datum;potje;soort;bedrag;notitie;vaste regel\r\n'));
  assert.ok(csv.includes('2026-06-15;Boeken;uitgave;-12,34;"kaft; ""rood""\nen blauw";\r\n'));
  assert.ok(csv.includes('2026-06-01;Boeken;uitgave;-9,99;Abonnement;Abonnement\r\n'));
  // oldest first
  assert.ok(csv.indexOf('2026-06-01') < csv.indexOf('2026-06-15'));
});

test('a note that looks like a spreadsheet formula is defused in the CSV', () => {
  let { state, books } = basicState();
  state = addSpend(state, { potId: books, amount: 100, date: TODAY, note: '=1+1' });
  const labels = { headers: ['a', 'b', 'c', 'd', 'e', 'f'], kinds: { spend: 'uitgave' } };
  assert.ok(exportCsv(state, labels).includes(";'=1+1;"));
});
