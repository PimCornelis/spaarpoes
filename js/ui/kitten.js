// Puts the kitten from assets/kitten.svg on the screen, in the mood asked for.

import { t } from '../text/nl.js';

let drawing = null;

/** Reads the drawing once, when the app starts. */
export async function loadKitten() {
  const response = await fetch('assets/kitten.svg');
  if (!response.ok) throw new Error(`assets/kitten.svg: ${response.status}`);
  const parsed = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
  drawing = parsed.documentElement;
}

export function kitten(mood) {
  const copy = document.importNode(drawing, true);
  copy.setAttribute('data-state', mood);
  copy.setAttribute('aria-label', t.kitten.looks[mood]);
  return copy;
}
