// Move money between pots. The free pot is the first choice to move to.

import { activePots, balance, findPot, freePot, updateSettings, MAX_NOTE } from '../../core/model.js';
import { allocate, move } from '../../core/ledger.js';
import { BudgetError } from '../../core/errors.js';
import { formatDecimal, formatEuro, parseAmount } from '../../core/money.js';
import { t } from '../../text/nl.js';
import { amountInput, balanceClass, errorLine, field, h, header } from '../dom.js';
import { toast } from '../dialog.js';

export function moveScreen(ctx, { query }) {
  const { state } = ctx.store;
  // The free pot comes first in both lists.
  const pots = [freePot(state), ...activePots(state)];
  if (pots.length < 2) {
    return h('main', { class: 'screen' }, header(t.move.title, '#/'), h('p', {}, t.move.needTwo));
  }
  const usable = (id) => pots.find((p) => p.id === id)?.id;
  const firstFrom = usable(query.get('from'))
    ?? pots.find((p) => p.kind === 'pot' && balance(state, p.id) > 0)?.id
    ?? 'free';
  const back = usable(query.get('from')) ? `#/pot/${usable(query.get('from'))}` : '#/';

  const error = errorLine();
  const label = (p) => `${p.emoji} ${p.name} (${formatEuro(balance(state, p.id))})`;
  const from = h('select', { value: firstFrom }, pots.map((p) => h('option', { value: p.id }, label(p))));
  from.value = firstFrom;
  const to = h('select', {});
  const amount = amountInput({ class: 'big', 'aria-label': t.common.amount });
  const note = h('input', { type: 'text', maxlength: MAX_NOTE, enterkeyhint: 'done' });
  const preview = h('div', { class: 'card preview', 'aria-live': 'polite' });
  const submit = h('button', { type: 'submit', class: 'button wide' }, t.move.submit);

  function showPreview() {
    const cents = parseAmount(amount.value) ?? 0;
    const line = (id, change) => {
      const after = balance(state, id) + change;
      return h('p', { class: 'row' },
        h('span', { class: 'grow' }, findPot(state, id).name),
        h('span', { class: `pill ${balanceClass(after)}` }, formatEuro(after)));
    };
    preview.replaceChildren(h('h2', {}, t.move.after), line(from.value, -cents), line(to.value, cents));
  }

  function fillTo(wanted) {
    const options = pots.filter((p) => p.id !== from.value);
    to.replaceChildren(...options.map((p) => h('option', { value: p.id }, label(p))));
    to.value = options.some((p) => p.id === wanted) ? wanted : options[0].id;
  }

  fillTo(query.get('to'));
  showPreview();
  from.addEventListener('change', () => { fillTo(to.value); showPreview(); });
  to.addEventListener('change', showPreview);
  amount.addEventListener('input', showPreview);

  const all = h('button', {
    type: 'button',
    class: 'button ghost',
    onclick: () => {
      const there = balance(state, from.value);
      amount.value = formatDecimal(Math.max(there, 0));
      showPreview();
    },
  }, t.move.all);

  async function save(event) {
    event.preventDefault();
    const cents = parseAmount(amount.value);
    const source = from.value;
    const target = to.value;
    submit.disabled = true;
    const saved = await ctx.act((current) => {
      if (cents === null) throw new BudgetError('bad-amount');
      const input = { amount: cents, date: ctx.today(), note: note.value };
      const changed = source === 'free'
        ? allocate(current, { ...input, potId: target })
        : move(current, { ...input, fromPotId: source, toPotId: target });
      return updateSettings(changed, { lastEntryDate: ctx.today() });
    }, error);
    submit.disabled = false;
    if (!saved) return;
    const now = ctx.store.state;
    toast(t.move.done(
      findPot(now, source).name, formatEuro(balance(now, source)),
      findPot(now, target).name, formatEuro(balance(now, target)),
    ));
    ctx.done(back);
  }

  return h('main', { class: 'screen' },
    header(t.move.title, back),
    h('form', { class: 'stack', onsubmit: save, novalidate: true },
      field(t.move.from, from),
      field(t.move.to, to),
      h('div', { class: 'amount-box' }, h('span', { 'aria-hidden': 'true' }, '€'), amount, all),
      preview,
      field(t.common.note, note, t.common.optional),
      error,
      submit));
}
