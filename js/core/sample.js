// Example data for the very first opening, so the screens are not empty. Every name and amount is
// invented. The texts come from outside, so this file holds no screen text.

import { dayInMonth, monthIndex, addDays } from './dates.js';
import { addPot, createState, updateSettings } from './model.js';
import { addExtra, addSpend } from './ledger.js';
import { addRule, generateDue } from './rules.js';

const MONTHS_BACK = 5;

export function sampleState(today, texts, freeName) {
  let state = createState({ today, freeName });
  const ids = {};
  const pot = (key, fields) => {
    state = addPot(state, { name: texts.pots[key], ...fields });
    ids[key] = state.pots[state.pots.length - 1].id;
  };
  pot('treats', { emoji: '☕', colorToken: 'peach' });
  pot('books', { emoji: '📚', colorToken: 'lilac', partyAmount: 6000, partyLabel: texts.partyBooks });
  pot('outings', { emoji: '🎡', colorToken: 'sky', partyAmount: 25000, partyLabel: texts.partyOutings });
  pot('plants', { emoji: '🪴', colorToken: 'mint' });
  pot('swim', { emoji: '🏊', colorToken: 'lemon' });

  // The history starts on the 1st, some months before this one.
  const startDate = dayInMonth(monthIndex(today) - MONTHS_BACK, 1);
  const rule = (label, kind, potId, amount) => {
    state = addRule(state, {
      label, kind, potId, amount, every: 1, unit: 'month', dayOfMonth: 1, startDate, endDate: null,
    });
  };
  rule(texts.salary, 'income', 'free', 17500);
  rule(texts.pots.treats, 'allocate', ids.treats, 3000);
  rule(texts.pots.books, 'allocate', ids.books, 1500);
  rule(texts.pots.outings, 'allocate', ids.outings, 4000);
  rule(texts.pots.plants, 'allocate', ids.plants, 1000);
  rule(texts.pots.swim, 'allocate', ids.swim, 2500);
  rule(texts.swimFee, 'spend', ids.swim, 2200);
  state = generateDue(state, today).state;

  // Loose spends, counted back from today. They are kept inside what each pot has received.
  const ago = (days) => {
    const date = addDays(today, -days);
    return date < startDate ? startDate : date;
  };
  const spend = (key, days, amount, note) => {
    state = addSpend(state, { potId: ids[key], amount, date: ago(days), note: texts.notes[note] });
  };
  spend('treats', 96, 1140, 'cake');
  spend('treats', 61, 780, 'coffee');
  spend('treats', 33, 1325, 'cake');
  spend('treats', 12, 640, 'coffee');
  spend('treats', 6, 895, 'cake');
  spend('treats', 2, 420, 'coffee');
  spend('books', 88, 2250, 'book');
  spend('books', 40, 1599, 'book');
  spend('books', 9, 1250, 'book');
  spend('outings', 70, 3600, 'museum');
  spend('outings', 20, 2750, 'cinema');
  spend('outings', 8, 1850, 'cinema');
  // Last used long enough ago to show the "not used" hint.
  spend('plants', 95, 1495, 'plant');
  state = addExtra(state, { potId: ids.outings, amount: 2500, date: ago(4), note: texts.notes.gift });

  return updateSettings(state, { isSample: true, lastEntryDate: today });
}
