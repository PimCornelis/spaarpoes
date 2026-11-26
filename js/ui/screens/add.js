// Adding a spend or a one-off extra: amount, pot, note, date. Made for one thumb.

import { activePots, findPot, freePot, updateSettings, MAX_NOTE } from '../../core/model.js';
import { addExtra, addSpend } from '../../core/ledger.js';
import { BudgetError } from '../../core/errors.js';
import { parseAmount } from '../../core/money.js';
import { potColor } from '../../theme.js';
import { t } from '../../text/nl.js';
import { amountInput, choices, errorLine, field, h, header } from '../dom.js';
import { toast } from '../dialog.js';

export function addScreen(ctx, { query }) {
  const { state } = ctx.store;
  const today = ctx.today();
  const asked = findPot(state, query.get('pot'));
  const pots = [...activePots(state), freePot(state)];
  const back = asked ? `#/pot/${asked.id}` : '#/';

  const error = errorLine();
  const amount = amountInput({ class: 'big', 'aria-label': t.common.amount });
  const note = h('input', { type: 'text', maxlength: MAX_NOTE, placeholder: t.add.notePlaceholder, enterkeyhint: 'done' });
  const date = h('input', { type: 'date', value: today, max: today, required: true });
  const submit = h('button', { type: 'submit', class: 'button wide' }, t.add.submitSpend);
  const kind = choices({
    label: t.add.title,
    className: 'segmented',
    chosen: 'spend',
    options: [{ value: 'spend', label: t.add.spend }, { value: 'extra', label: t.add.extra }],
    onchoose: (value) => { submit.textContent = value === 'spend' ? t.add.submitSpend : t.add.submitExtra; },
  });
  const pot = choices({
    label: t.add.choosePot,
    chosen: asked?.id ?? (pots.length === 1 ? pots[0].id : null),
    options: pots.map((p) => ({ value: p.id, label: `${p.emoji} ${p.name}`, vars: { '--pot': potColor(p.colorToken) } })),
  });

  async function save(event) {
    event.preventDefault();
    const cents = parseAmount(amount.value);
    submit.disabled = true;
    const saved = await ctx.act((current) => {
      if (cents === null) throw new BudgetError('bad-amount');
      if (date.value > ctx.today()) throw new BudgetError('future-date');
      const input = { potId: pot.chosen, amount: cents, date: date.value, note: note.value };
      const changed = (kind.chosen === 'spend' ? addSpend : addExtra)(current, input);
      return updateSettings(changed, { lastEntryDate: ctx.today() });
    }, error);
    submit.disabled = false;
    if (!saved) return;
    toast(t.common.saved);
    ctx.done(back);
  }

  return h('main', { class: 'screen' },
    header(t.add.title, back),
    h('form', { class: 'stack', onsubmit: save, novalidate: true },
      kind,
      h('div', { class: 'amount-box' }, h('span', { 'aria-hidden': 'true' }, '€'), amount),
      h('span', { class: 'field-label' }, t.common.pot),
      pot,
      field(t.common.note, note, t.common.optional),
      field(t.common.date, date),
      error,
      submit));
}
