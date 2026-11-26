// How the kitten feels. (A party is not a mood that lasts: it is shown when it happens.)

import { daysBetween } from './dates.js';
import { activePots, balance, freePot } from './model.js';

export const SLEEPY_AFTER_DAYS = 3;
export const MOODS = ['content', 'party', 'sleepy', 'worried'];

export function kittenMood(state, today) {
  if ([freePot(state), ...activePots(state)].some((pot) => balance(state, pot.id) < 0)) return 'worried';
  const lastTime = state.settings.lastEntryDate ?? state.settings.firstUseDate;
  return daysBetween(lastTime, today) >= SLEEPY_AFTER_DAYS ? 'sleepy' : 'content';
}
