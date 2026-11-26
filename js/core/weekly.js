// The weekly card: shown once, the first time the app is opened after a week has ended.
// A week runs from Monday to Sunday.

import { addDays, startOfWeek } from './dates.js';
import { updateSettings } from './model.js';

const TOP_POTS = 3;

/** The summary of last week if it still has to be shown, otherwise null. */
export function weeklySummary(state, today) {
  const weekStart = addDays(startOfWeek(today), -7);
  const weekEnd = addDays(weekStart, 6);
  const { lastSummaryWeek, firstUseDate } = state.settings;
  if (lastSummaryWeek !== null && lastSummaryWeek >= weekStart) return null;
  if (firstUseDate > weekEnd) return null;

  const inWeek = (date) => date >= weekStart && date <= weekEnd;
  const perPot = new Map();
  let spent = 0;
  for (const entry of state.entries) {
    if (entry.kind !== 'spend' || !inWeek(entry.date)) continue;
    spent -= entry.amount;
    perPot.set(entry.potId, (perPot.get(entry.potId) ?? 0) - entry.amount);
  }
  const top = [...perPot]
    .map(([potId, amount]) => ({ potId, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, TOP_POTS);
  return { weekStart, weekEnd, spent, top, parties: state.partyLog.filter((party) => inWeek(party.date)) };
}

export function markSummaryShown(state, summary) {
  return updateSettings(state, { lastSummaryWeek: summary.weekStart });
}
