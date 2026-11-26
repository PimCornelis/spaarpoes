// Shared set-up for the tests. All names and amounts are invented.
import { createState, addPot } from '../js/core/model.js';

export const TODAY = '2026-06-15'; // a Monday

/** A state with the free pot and two pots: "Boeken" and "Uitjes". */
export function basicState(today = TODAY) {
  let state = createState({ today, freeName: 'Vrij te besteden' });
  state = addPot(state, { name: 'Boeken', emoji: '📚', colorToken: 'lilac' });
  state = addPot(state, { name: 'Uitjes', emoji: '🎡', colorToken: 'mint' });
  const [books, outings] = state.pots.filter((p) => p.kind === 'pot').map((p) => p.id);
  return { state, books, outings, free: 'free' };
}

/** The last item of a list. */
export const last = (list) => list[list.length - 1];

/** Asserts that fn throws a BudgetError with this code. */
export function hasCode(code) {
  return (error) => error.name === 'BudgetError' && error.code === code;
}
