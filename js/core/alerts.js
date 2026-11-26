// Things the app points out: parties, pots that need a look, and the back-up reminder.
// None of these ever moves money.

import { daysBetween, wholeMonthsBetween } from './dates.js';
import { activePots, balance, freePot } from './model.js';

export const UNUSED_AFTER_MONTHS = 2;
export const BACKUP_AFTER_DAYS = 14;

/**
 * The pots whose balance went from below the party amount to at or above it between two states.
 * Because this compares before and after, a party happens once, and can happen again only after the
 * balance has been below the amount.
 */
export function partiesReached(before, after) {
  return after.pots
    .filter((pot) => !pot.archived && pot.partyAmount !== null
      && balance(before, pot.id) < pot.partyAmount && balance(after, pot.id) >= pot.partyAmount)
    .map((pot) => ({ potId: pot.id, label: pot.partyLabel, amount: pot.partyAmount }));
}

/** Writes reached parties into the party log, for the weekly card. */
export function recordParties(before, after, today) {
  const parties = partiesReached(before, after);
  if (parties.length === 0) return { state: after, parties };
  const log = parties.map((party) => ({ date: today, ...party }));
  return { state: { ...after, partyLog: [...after.partyLog, ...log] }, parties };
}

/**
 * Whole months since the last spend from this pot. A pot never spent from counts from its first
 * entry. Null for a pot that has never held anything.
 */
export function unusedMonths(state, potId, today) {
  let lastSpend = null;
  let first = null;
  for (const entry of state.entries) {
    if (entry.potId !== potId || entry.date > today) continue;
    if (entry.kind === 'spend' && (lastSpend === null || entry.date > lastSpend)) lastSpend = entry.date;
    if (first === null || entry.date < first) first = entry.date;
  }
  const since = lastSpend ?? first;
  return since === null ? null : wholeMonthsBetween(since, today);
}

/** The "Let op" list: first pots below zero, then pots unused for a long time. */
export function attention(state, today) {
  const negative = [freePot(state), ...activePots(state)]
    .filter((pot) => balance(state, pot.id) < 0)
    .map((pot) => ({ type: 'negative', potId: pot.id }));
  const unused = activePots(state)
    .map((pot) => ({ type: 'unused', potId: pot.id, months: unusedMonths(state, pot.id, today) }))
    .filter((item) => item.months !== null && item.months >= UNUSED_AFTER_MONTHS);
  return [...negative, ...unused];
}

export function backupDue(state, today) {
  if (state.settings.isSample) return false;
  const since = state.settings.lastBackupDate ?? state.settings.firstUseDate;
  return daysBetween(since, today) >= BACKUP_AFTER_DAYS;
}
