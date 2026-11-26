import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleState } from '../js/core/sample.js';
import { validateState } from '../js/core/backup.js';
import { activePots, balance, freePot } from '../js/core/model.js';
import { attention } from '../js/core/alerts.js';
import { generateDue } from '../js/core/rules.js';
import { t } from '../js/text/nl.js';

// Awkward days included: month ends, a leap day and New Year.
const days = ['2026-11-26', '2026-01-01', '2026-03-31', '2028-02-29', '2026-07-01'];

for (const today of days) {
  test(`the example data on ${today} is complete, valid and cheerful`, () => {
    const state = sampleState(today, t.sample, t.freeName);
    validateState(state);
    assert.equal(state.settings.isSample, true);
    assert.equal(activePots(state).length, 5);
    // nothing below zero on the first look, and nothing dated in the future
    for (const pot of [freePot(state), ...activePots(state)]) {
      assert.ok(balance(state, pot.id) >= 0, `${pot.name}: ${balance(state, pot.id)}`);
    }
    assert.ok(state.entries.every((e) => e.date <= today));
    // one pot shows the "not used" hint, so the "Let op" card can be seen
    assert.deepEqual(attention(state, today).map((a) => a.type), ['unused']);
    // opening again the same day books nothing twice
    assert.equal(generateDue(state, today).made.length, 0);
  });
}
