// The celebration: shown when a pot reaches its party amount.

import { findPot } from '../core/model.js';
import { formatEuro } from '../core/money.js';
import { t } from '../text/nl.js';
import { h } from './dom.js';
import { confettiPieces } from './confetti.js';
import { kitten } from './kitten.js';

export function showParty(parties, state) {
  document.querySelector('dialog.party')?.remove();
  const close = () => {
    dialog.close();
    dialog.remove();
  };
  const dialog = h('dialog', { class: 'party', oncancel: (event) => { event.preventDefault(); close(); } },
    h('div', { class: 'confetti', 'aria-hidden': 'true' }, confettiPieces().map((piece) => h('i', { vars: piece }))),
    h('div', { class: 'party-content' },
      h('h2', {}, t.party.title),
      h('div', { class: 'party-kitten' }, kitten('party')),
      parties.map((party) => {
        const pot = findPot(state, party.potId);
        return h('div', {},
          party.label ? h('p', { class: 'party-label' }, party.label) : null,
          h('p', {}, t.party.reached(`${pot.emoji} ${pot.name}`, formatEuro(party.amount))));
      }),
      h('button', { type: 'button', class: 'button wide', onclick: close }, t.party.close)));
  document.body.append(dialog);
  dialog.showModal();
}
