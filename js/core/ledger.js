// The ledger: every change of money is an entry with a signed amount in cents.
//
//   income    money in, into the free pot            (+)
//   allocate  free pot -> another pot                (two linked entries)
//   spend     money out of a pot                     (-)
//   extra     one-off money in, into any pot         (+)
//   move      one pot -> another pot                 (two linked entries)

import { BudgetError, check } from './errors.js';
import { isDate } from './dates.js';
import { isCents } from './money.js';
import { FREE_ID, MAX_NOTE, takeId, usablePot } from './model.js';

function checkInput(state, { amount, date }, potIds) {
  check(isCents(amount) && amount > 0, 'bad-amount');
  check(isDate(date), 'bad-date');
  for (const potId of potIds) usablePot(state, potId);
}

function append(state, { date, potId, amount, note, kind, groupId, ruleId }) {
  const next = takeId(state, 'e');
  const entry = {
    id: next.id,
    date,
    potId,
    amount,
    note: String(note ?? '').trim().slice(0, MAX_NOTE),
    kind,
    groupId: groupId ?? null,
    ruleId: ruleId ?? null,
  };
  return { ...next.state, entries: [...next.state.entries, entry] };
}

function single(state, kind, potId, sign, input) {
  checkInput(state, input, [potId]);
  return append(state, { ...input, kind, potId, amount: sign * input.amount });
}

function pair(state, kind, fromPotId, toPotId, input) {
  checkInput(state, input, [fromPotId, toPotId]);
  check(fromPotId !== toPotId, 'same-pot');
  const group = takeId(state, 'g');
  const shared = { ...input, kind, groupId: group.id };
  const out = append(group.state, { ...shared, potId: fromPotId, amount: -input.amount });
  return append(out, { ...shared, potId: toPotId, amount: input.amount });
}

export function addIncome(state, input) {
  return single(state, 'income', FREE_ID, 1, input);
}

export function addSpend(state, { potId, ...input }) {
  return single(state, 'spend', potId, -1, input);
}

export function addExtra(state, { potId, ...input }) {
  return single(state, 'extra', potId, 1, input);
}

export function allocate(state, { potId, ...input }) {
  return pair(state, 'allocate', FREE_ID, potId, input);
}

export function move(state, { fromPotId, toPotId, ...input }) {
  return pair(state, 'move', fromPotId, toPotId, input);
}

/** Removes an entry. For a linked pair both sides go, so money cannot appear or vanish. */
export function deleteEntry(state, entryId) {
  const target = state.entries.find((e) => e.id === entryId);
  if (!target) throw new BudgetError('unknown-entry', { entryId });
  const goes = (e) => e.id === entryId || (target.groupId !== null && e.groupId === target.groupId);
  return { ...state, entries: state.entries.filter((e) => !goes(e)) };
}
