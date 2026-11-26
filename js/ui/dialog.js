// A yes/no question and a short message at the bottom of the screen.

import { h } from './dom.js';
import { t } from '../text/nl.js';

export function ask(message) {
  return new Promise((resolve) => {
    let dialog = null;
    const close = (answer) => {
      dialog.close();
      dialog.remove();
      resolve(answer);
    };
    dialog = h('dialog', { class: 'ask', oncancel: (event) => { event.preventDefault(); close(false); } },
      h('p', {}, message),
      h('div', { class: 'buttons' },
        h('button', { type: 'button', class: 'button ghost', onclick: () => close(false) }, t.common.cancel),
        h('button', { type: 'button', class: 'button', onclick: () => close(true) }, t.common.ok)));
    document.body.append(dialog);
    dialog.showModal();
  });
}

let current = null;
let timer = null;

/** `problem` messages stay longer and can be tapped away. */
export function toast(message, { problem = false } = {}) {
  current?.remove();
  clearTimeout(timer);
  const box = h('button', {
    type: 'button',
    class: problem ? 'toast is-problem' : 'toast',
    role: problem ? 'alert' : 'status',
    onclick: () => box.remove(),
  }, message);
  current = box;
  document.body.append(box);
  timer = setTimeout(() => box.remove(), problem ? 12000 : 4000);
}
