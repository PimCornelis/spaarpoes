// Small helpers to build the screens. Text from the user is always added as plain text, never as HTML.

import { formatEuro } from '../core/money.js';
import { potColor, POT_COLORS } from '../theme.js';
import { t } from '../text/nl.js';

const present = (child) => child !== null && child !== undefined && child !== false;

function fill(element, props, children) {
  for (const [key, value] of Object.entries(props ?? {})) {
    if (!present(value)) continue;
    if (key.startsWith('on')) element.addEventListener(key.slice(2), value);
    else if (key === 'vars') for (const [name, v] of Object.entries(value)) element.style.setProperty(name, v);
    else if (key !== 'value' && key !== 'checked') element.setAttribute(key, value === true ? '' : value);
  }
  element.append(...children.flat(Infinity).filter(present));
  // Set last: a <select> can only take its value once its options are in it.
  if (props?.value !== undefined && props.value !== null) element.value = props.value;
  if (props?.checked !== undefined) element.checked = props.checked;
  return element;
}

/** h('button', {class: 'x', onclick}, 'text', child) */
export function h(tag, props, ...children) {
  return fill(document.createElement(tag), props, children);
}

/** The same for SVG drawings. */
export function s(tag, props, ...children) {
  return fill(document.createElementNS('http://www.w3.org/2000/svg', tag), props, children);
}

export function balanceClass(cents) {
  if (cents > 0) return 'is-positive';
  return cents < 0 ? 'is-negative' : 'is-zero';
}

export function pill(cents) {
  return h('span', { class: `pill ${balanceClass(cents)}` }, formatEuro(cents));
}

export function badge(pot) {
  return h('span', { class: 'badge', 'aria-hidden': 'true', vars: { '--pot': potColor(pot.colorToken) } }, pot.emoji);
}

export function header(title, backTo) {
  return h('header', { class: 'top' },
    backTo ? h('a', { class: 'back', href: backTo }, `‹ ${t.common.back}`) : null,
    h('h1', {}, title));
}

export function card(title, ...children) {
  return h('section', { class: 'card' }, title ? h('h2', {}, title) : null, ...children);
}

export function field(label, control, hint) {
  return h('label', { class: 'field' },
    h('span', { class: 'field-label' }, label),
    control,
    hint ? h('span', { class: 'hint' }, hint) : null);
}

export function amountInput(props = {}) {
  // A text field with the number keypad: it accepts the comma, which a "number" field may refuse.
  return h('input', {
    type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: t.common.amountHint,
    enterkeyhint: 'done', ...props,
  });
}

export function errorLine() {
  return h('p', { class: 'form-error', role: 'alert' });
}

/**
 * A row of choices of which one is on. `options` are {value, label, vars}.
 * Returns the element; read `.chosen` for the value.
 */
export function choices({ label, options, chosen = null, className = 'chips', onchoose }) {
  const group = h('div', { class: className, role: 'group', 'aria-label': label });
  group.chosen = chosen;
  const buttons = options.map((option) => h('button', {
    type: 'button',
    class: 'chip',
    vars: option.vars,
    'aria-pressed': String(option.value === chosen),
    onclick: () => {
      group.chosen = option.value;
      for (const [i, button] of buttons.entries()) button.setAttribute('aria-pressed', String(options[i].value === option.value));
      onchoose?.(option.value);
      group.dispatchEvent(new Event('input', { bubbles: true }));
    },
  }, option.label));
  group.append(...buttons);
  return group;
}

export function colorChoices(chosen) {
  return choices({
    label: t.pot.color,
    chosen,
    className: 'chips swatches',
    options: Object.keys(POT_COLORS).map((token) => ({
      value: token, label: t.colors[token], vars: { '--pot': potColor(token) },
    })),
  });
}

export function toggle(label, on, onchange) {
  return h('label', { class: 'toggle' },
    h('span', {}, label),
    h('input', { type: 'checkbox', role: 'switch', checked: on, onchange: (e) => onchange(e.target.checked) }));
}
