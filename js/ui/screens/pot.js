// One pot: its balance, party, history and settings. Also the form for a new pot.

import {
  addPot, archivePot, balance, entriesForPot, findPot, updatePot, MAX_NAME,
} from '../../core/model.js';
import { deleteEntry } from '../../core/ledger.js';
import { unusedMonths, UNUSED_AFTER_MONTHS } from '../../core/alerts.js';
import { BudgetError } from '../../core/errors.js';
import { formatDecimal, formatEuro, parseAmount } from '../../core/money.js';
import { formatDay, t } from '../../text/nl.js';
import { amountInput, badge, card, colorChoices, errorLine, field, h, header, pill } from '../dom.js';
import { ask, toast } from '../dialog.js';

const FIRST_ENTRIES = 30;
const EMOJI_IDEAS = ['🐾', '🎀', '💅', '💇', '👓', '🦷', '🎁', '🎡', '🏥', '📚', '☕', '👗'];

function unusedNote(state, pot, today) {
  if (pot.kind === 'free') return null;
  const months = unusedMonths(state, pot.id, today);
  if (months === null || months < UNUSED_AFTER_MONTHS) return null;
  return h('section', { class: 'card notice' },
    h('p', {}, t.pot.unused(months)),
    balance(state, pot.id) > 0
      ? h('a', { class: 'button ghost', href: `#/move?from=${pot.id}&to=free` }, t.pot.toFree)
      : null);
}

function describe(state, entry) {
  if (entry.groupId === null) return t.kinds[entry.kind];
  const other = state.entries.find((e) => e.groupId === entry.groupId && e.id !== entry.id);
  const name = findPot(state, other.potId).name;
  return entry.amount > 0 ? t.movedFrom(name) : t.movedTo(name);
}

function entryRow(ctx, state, entry) {
  const what = entry.note || t.kinds[entry.kind];
  const signed = `${entry.amount > 0 ? '+ ' : '− '}${formatEuro(Math.abs(entry.amount))}`;
  return h('li', { class: 'row entry' },
    h('span', { class: 'grow' },
      h('span', {}, what),
      // Without a note the first line already says what kind it was.
      h('small', {}, entry.note || entry.groupId !== null
        ? `${formatDay(entry.date)} · ${describe(state, entry)}`
        : formatDay(entry.date))),
    h('span', { class: entry.amount > 0 ? 'money-in' : 'money-out' }, signed),
    h('button', {
      type: 'button',
      class: 'icon',
      'aria-label': t.pot.deleteLabel(what),
      onclick: async () => {
        const question = entry.groupId === null ? t.pot.deleteConfirm : t.pot.deletePairConfirm;
        if (!(await ask(question(formatEuro(Math.abs(entry.amount)), formatDay(entry.date))))) return;
        if (await ctx.act((current) => deleteEntry(current, entry.id))) ctx.refresh();
      },
    }, '✕'));
}

function history(ctx, state, pot) {
  const entries = entriesForPot(state, pot.id);
  if (entries.length === 0) return card(t.pot.entries, h('p', { class: 'hint' }, t.pot.noEntries));
  const list = h('ul', { class: 'plain' }, entries.slice(0, FIRST_ENTRIES).map((e) => entryRow(ctx, state, e)));
  const rest = entries.slice(FIRST_ENTRIES);
  const more = rest.length === 0 ? null : h('button', {
    type: 'button',
    class: 'button ghost wide',
    onclick: (event) => {
      list.append(...rest.map((e) => entryRow(ctx, state, e)));
      event.target.remove();
    },
  }, `+ ${rest.length}`);
  return card(t.pot.entries, list, more);
}

function partyForm(ctx, pot) {
  const error = errorLine();
  const amount = amountInput({ value: pot.partyAmount === null ? '' : formatDecimal(pot.partyAmount) });
  const label = h('input', {
    type: 'text', maxlength: MAX_NAME, value: pot.partyLabel ?? '', placeholder: t.pot.partyLabelPlaceholder,
  });
  const store = async (partyAmount, partyLabel) => {
    const saved = await ctx.act((state) => {
      if (Number.isNaN(partyAmount)) throw new BudgetError('bad-amount');
      return updatePot(state, pot.id, { partyAmount, partyLabel });
    }, error);
    if (saved) {
      toast(t.common.saved);
      ctx.refresh();
    }
  };
  return card(t.pot.party,
    h('p', { class: 'hint' }, t.pot.partyExplain),
    h('form', {
      class: 'stack',
      novalidate: true,
      onsubmit: (event) => {
        event.preventDefault();
        store(parseAmount(amount.value) ?? NaN, label.value);
      },
    },
    field(t.pot.partyAmount, amount),
    field(t.pot.partyLabel, label, t.common.optional),
    error,
    h('button', { type: 'submit', class: 'button' }, t.pot.partySave),
    pot.partyAmount === null ? null
      : h('button', { type: 'button', class: 'button ghost', onclick: () => store(null, null) }, t.pot.partyRemove)));
}

function nameFields(pot) {
  const name = h('input', { type: 'text', maxlength: MAX_NAME, value: pot.name, placeholder: t.newPot.namePlaceholder });
  const emoji = h('input', { type: 'text', maxlength: 16, value: pot.emoji, class: 'emoji-input' });
  const color = colorChoices(pot.colorToken);
  const ideas = h('div', { class: 'chips ideas' }, EMOJI_IDEAS.map((idea) => h('button', {
    type: 'button', class: 'chip', onclick: () => { emoji.value = idea; emoji.dispatchEvent(new Event('input', { bubbles: true })); },
  }, idea)));
  return {
    elements: [
      field(t.pot.name, name),
      field(t.pot.emoji, emoji),
      ideas,
      h('span', { class: 'field-label' }, t.pot.color),
      color,
    ],
    read: () => ({ name: name.value, emoji: emoji.value, colorToken: color.chosen }),
  };
}

function editPot(ctx, pot) {
  const error = errorLine();
  const fields = nameFields(pot);
  const archive = pot.kind === 'free' ? null : h('button', {
    type: 'button',
    class: 'button ghost',
    onclick: async () => {
      if (!(await ask(t.pot.archiveConfirm(pot.name)))) return;
      if (await ctx.act((state) => archivePot(state, pot.id, ctx.today()), error)) {
        toast(t.pot.archived);
        ctx.done('#/');
      }
    },
  }, t.pot.archive);
  return h('details', { class: 'card' },
    h('summary', {}, t.pot.edit),
    h('form', {
      class: 'stack',
      novalidate: true,
      onsubmit: async (event) => {
        event.preventDefault();
        if (await ctx.act((state) => updatePot(state, pot.id, fields.read()), error)) {
          toast(t.common.saved);
          ctx.refresh();
        }
      },
    }, fields.elements, error, h('button', { type: 'submit', class: 'button' }, t.common.save), archive));
}

export function potScreen(ctx, { id }) {
  const { state } = ctx.store;
  const pot = findPot(state, id);
  if (!pot || pot.archived) {
    return h('main', { class: 'screen' }, header(t.pot.gone, '#/'));
  }
  return h('main', { class: 'screen' },
    header(pot.name, '#/'),
    h('div', { class: 'pot-head' }, badge(pot), pill(balance(state, pot.id))),
    h('div', { class: 'buttons' },
      h('a', { class: 'button', href: `#/add?pot=${pot.id}` }, t.pot.addButton),
      h('a', { class: 'button ghost', href: `#/move?from=${pot.id}` }, t.pot.moveButton)),
    unusedNote(state, pot, ctx.today()),
    history(ctx, state, pot),
    partyForm(ctx, pot),
    editPot(ctx, pot));
}

export function newPotScreen(ctx) {
  const error = errorLine();
  const fields = nameFields({ name: '', emoji: '🐾', colorToken: 'rose' });
  return h('main', { class: 'screen' },
    header(t.newPot.title, '#/'),
    h('form', {
      class: 'stack',
      novalidate: true,
      onsubmit: async (event) => {
        event.preventDefault();
        const button = event.submitter;
        button.disabled = true;
        const saved = await ctx.act((state) => addPot(state, fields.read()), error);
        button.disabled = false;
        if (saved) ctx.done(`#/pot/${ctx.store.state.pots.at(-1).id}`);
      },
    }, fields.elements, error, h('button', { type: 'submit', class: 'button wide' }, t.newPot.create)));
}
