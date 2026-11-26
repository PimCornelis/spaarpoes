// The whole state of the app, and the pots ("potjes").
// Every function that changes something returns a new state and leaves the old one as it was.
//
// A balance is never stored: it is always the sum of the pot's ledger entries.

import { BudgetError, check } from './errors.js';
import { isDate } from './dates.js';
import { isCents } from './money.js';

export const FREE_ID = 'free';
export const MAX_NAME = 60;
export const MAX_NOTE = 200;

export function createState({ today, freeName }) {
  return {
    nextId: 1,
    pots: [{
      id: FREE_ID, name: freeName, emoji: '🐷', colorToken: 'rose', order: 0, kind: 'free',
      partyAmount: null, partyLabel: null, archived: false,
    }],
    entries: [],
    rules: [],
    partyLog: [],
    settings: {
      sound: false,
      reduceMotion: false,
      isSample: false,
      firstUseDate: today,
      lastBackupDate: null,
      lastEntryDate: null,
      lastSummaryWeek: null,
    },
  };
}

/** Hands out ids from one counter, so they are never used twice. */
export function takeId(state, prefix) {
  return { id: `${prefix}${state.nextId}`, state: { ...state, nextId: state.nextId + 1 } };
}

export function findPot(state, potId) {
  return state.pots.find((p) => p.id === potId);
}

/** A pot that money can go into or come out of. */
export function usablePot(state, potId) {
  const pot = findPot(state, potId);
  check(pot && !pot.archived, 'unknown-pot', { potId });
  return pot;
}

export function freePot(state) {
  return findPot(state, FREE_ID);
}

/** The pots on the home screen, in the chosen order. The free pot is shown apart from these. */
export function activePots(state) {
  return state.pots.filter((p) => p.kind === 'pot' && !p.archived).sort((a, b) => a.order - b.order);
}

export function balance(state, potId, upTo) {
  let sum = 0;
  for (const entry of state.entries) {
    if (entry.potId === potId && (upTo === undefined || entry.date <= upTo)) sum += entry.amount;
  }
  return sum;
}

/** All the money in all pots together. */
export function heap(state) {
  return state.entries.reduce((sum, entry) => sum + entry.amount, 0);
}

/** Newest first: by date, and for one date the last one added first. */
export function entriesForPot(state, potId) {
  return state.entries
    .filter((e) => e.potId === potId)
    .reverse()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

const EDITABLE = ['name', 'emoji', 'colorToken', 'partyAmount', 'partyLabel'];

function cleanPotFields(fields) {
  const clean = { ...fields };
  for (const key of Object.keys(clean)) check(EDITABLE.includes(key), 'bad-field', { key });
  if ('name' in clean) {
    clean.name = String(clean.name).trim();
    check(clean.name.length > 0 && clean.name.length <= MAX_NAME, 'bad-name');
  }
  if ('emoji' in clean) clean.emoji = String(clean.emoji).trim().slice(0, 16);
  if ('partyAmount' in clean && clean.partyAmount !== null) {
    check(isCents(clean.partyAmount) && clean.partyAmount > 0, 'bad-amount');
  }
  if ('partyLabel' in clean && clean.partyLabel !== null) {
    clean.partyLabel = String(clean.partyLabel).trim().slice(0, MAX_NAME) || null;
  }
  return clean;
}

export function addPot(state, { name, emoji = '🐾', colorToken = 'rose', partyAmount = null, partyLabel = null }) {
  const fields = cleanPotFields({ name, emoji, colorToken, partyAmount, partyLabel });
  const next = takeId(state, 'p');
  const order = Math.max(0, ...state.pots.map((p) => p.order)) + 1;
  const pot = { id: next.id, ...fields, order, kind: 'pot', archived: false };
  return { ...next.state, pots: [...next.state.pots, pot] };
}

function replacePot(state, potId, change) {
  return { ...state, pots: state.pots.map((p) => (p.id === potId ? { ...p, ...change } : p)) };
}

export function updatePot(state, potId, fields) {
  usablePot(state, potId);
  return replacePot(state, potId, cleanPotFields(fields));
}

/** direction -1 moves the pot one place up, 1 one place down. */
export function movePot(state, potId, direction) {
  const list = activePots(state);
  const from = list.findIndex((p) => p.id === potId);
  check(from >= 0, 'unknown-pot', { potId });
  const other = list[from + direction];
  if (!other) return state;
  return replacePot(replacePot(state, potId, { order: other.order }), other.id, { order: list[from].order });
}

/** Puts a pot away. Only allowed when no money and no running rule would disappear with it. */
export function archivePot(state, potId, today) {
  const pot = usablePot(state, potId);
  if (pot.kind === 'free') throw new BudgetError('free-pot');
  check(balance(state, potId) === 0, 'pot-not-empty');
  const running = state.rules.some((r) => r.potId === potId && (r.endDate === null || r.endDate > today));
  check(!running, 'pot-has-rules');
  return replacePot(state, potId, { archived: true });
}

export function updateSettings(state, patch) {
  for (const [key, value] of Object.entries(patch)) {
    check(key in state.settings, 'bad-field', { key });
    if (key.endsWith('Date') || key === 'lastSummaryWeek') {
      check(value === null || isDate(value), 'bad-date', { key });
    } else {
      check(typeof value === 'boolean', 'bad-field', { key });
    }
  }
  return { ...state, settings: { ...state.settings, ...patch } };
}
