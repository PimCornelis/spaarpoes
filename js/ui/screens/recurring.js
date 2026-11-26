// Recurring rules: the list (skip, stop) and the form to add or change one.

import { activePots, findPot, freePot, MAX_NAME } from '../../core/model.js';
import {
  addRule, endRule, generateDue, nextOccurrence, occurrencesBetween, openFrom, skipNext, unskip, updateRule, MAX_EVERY,
} from '../../core/rules.js';
import { addDays, split } from '../../core/dates.js';
import { BudgetError } from '../../core/errors.js';
import { formatDecimal, formatEuro, parseAmount } from '../../core/money.js';
import { formatDay, formatLongDate, t } from '../../text/nl.js';
import { amountInput, badge, errorLine, field, h, header } from '../dom.js';
import { ask, toast } from '../dialog.js';

function ruleCard(ctx, state, rule) {
  const today = ctx.today();
  const pot = findPot(state, rule.potId);
  const next = nextOccurrence(rule, openFrom(rule, today));
  const running = rule.endDate === null || next !== null;
  const run = async (change) => {
    if (await ctx.act(change)) ctx.refresh();
  };
  const skipped = rule.skipped.filter((d) => d > openFrom(rule, today));
  return h('li', { class: running ? 'card' : 'card is-ended' },
    h('div', { class: 'row' },
      badge(pot),
      h('span', { class: 'grow' },
        h('span', {}, rule.label),
        h('small', {}, `${t.recurring.kindShort[rule.kind]} · ${pot.name} · ${t.recurring.frequency(rule)}`)),
      h('strong', {}, formatEuro(rule.amount))),
    h('p', { class: 'hint' }, next === null ? t.recurring.ended : t.recurring.next(formatDay(next))),
    rule.endDate !== null && next !== null ? h('p', { class: 'hint' }, `${t.recurring.end} ${formatLongDate(rule.endDate)}`) : null,
    skipped.map((date) => h('p', { class: 'row skipped' },
      h('span', { class: 'grow' }, t.recurring.skipped(formatDay(date))),
      h('button', {
        type: 'button', class: 'button ghost small', onclick: () => run((s) => unskip(s, rule.id, date, ctx.today())),
      }, t.recurring.unskip))),
    h('div', { class: 'buttons' },
      // A rule of a put-away pot cannot be changed: the form could only point it at another pot.
      pot.archived ? null : h('a', { class: 'button ghost small', href: `#/rule/${rule.id}` }, t.recurring.edit),
      next === null ? null : h('button', {
        type: 'button',
        class: 'button ghost small',
        onclick: async () => {
          if (await ask(t.recurring.skipConfirm(rule.label, formatDay(next)))) {
            run((s) => skipNext(s, rule.id, ctx.today()));
          }
        },
      }, t.recurring.skip),
      next === null ? null : h('button', {
        type: 'button',
        class: 'button ghost small',
        onclick: async () => {
          if (await ask(t.recurring.stopConfirm(rule.label))) run((s) => endRule(s, rule.id, ctx.today()));
        },
      }, t.recurring.stop)));
}

export function recurringScreen(ctx) {
  const { state } = ctx.store;
  const today = ctx.today();
  const running = (rule) => nextOccurrence(rule, openFrom(rule, today)) !== null;
  const rules = [...state.rules.filter(running), ...state.rules.filter((r) => !running(r))];
  return h('main', { class: 'screen' },
    header(t.recurring.title),
    h('p', { class: 'hint' }, t.recurring.explain),
    h('a', { class: 'button wide', href: '#/rule/new' }, `+ ${t.recurring.add}`),
    rules.length === 0
      ? h('p', { class: 'hint' }, t.recurring.empty)
      : h('ul', { class: 'plain' }, rules.map((rule) => ruleCard(ctx, state, rule))));
}

export function ruleScreen(ctx, { id }) {
  const { state } = ctx.store;
  const today = ctx.today();
  const isNew = id === 'new';
  const old = isNew ? null : state.rules.find((r) => r.id === id);
  if (!isNew && (!old || findPot(state, old.potId).archived)) return h('main', { class: 'screen' }, header(t.recurring.gone, '#/recurring'));
  const rule = old ?? {
    label: '', kind: 'allocate', potId: activePots(state)[0]?.id ?? 'free', amount: null,
    every: 1, unit: 'month', dayOfMonth: split(today).d, startDate: today, endDate: null,
  };

  const error = errorLine();
  const label = h('input', { type: 'text', maxlength: MAX_NAME, value: rule.label, placeholder: t.recurring.labelPlaceholder });
  const kind = h('select', { value: rule.kind },
    Object.entries(t.recurring.kinds).map(([value, text]) => h('option', { value }, text)));
  const pot = h('select', {});
  const amount = amountInput({ value: rule.amount === null ? '' : formatDecimal(rule.amount) });
  const every = h('input', { type: 'number', inputmode: 'numeric', min: 1, max: MAX_EVERY, step: 1, value: rule.every });
  const unit = h('select', { value: rule.unit },
    Object.entries(t.recurring.units).map(([value, text]) => h('option', { value }, text)));
  const day = h('input', { type: 'number', inputmode: 'numeric', min: 1, max: 31, step: 1, value: rule.dayOfMonth ?? split(rule.startDate).d });
  const start = h('input', { type: 'date', value: rule.startDate });
  const end = h('input', { type: 'date', value: rule.endDate ?? '' });
  const potField = field(t.common.pot, pot);
  const dayField = field(t.recurring.dayOfMonth, day, t.recurring.dayHint);
  const submit = h('button', { type: 'submit', class: 'button wide' }, t.common.save);

  function adapt(wanted) {
    const options = kind.value === 'spend' ? [...activePots(state), freePot(state)] : activePots(state);
    pot.replaceChildren(...options.map((p) => h('option', { value: p.id }, `${p.emoji} ${p.name}`)));
    if (options.some((p) => p.id === wanted)) pot.value = wanted;
    potField.hidden = kind.value === 'income';
    dayField.hidden = unit.value !== 'month';
  }
  adapt(rule.potId);
  kind.addEventListener('change', () => adapt(pot.value));
  unit.addEventListener('change', () => adapt(pot.value));

  function read() {
    const cents = parseAmount(amount.value);
    if (cents === null) throw new BudgetError('bad-amount');
    return {
      label: label.value,
      kind: kind.value,
      potId: kind.value === 'income' ? 'free' : pot.value,
      amount: cents,
      every: Number(every.value),
      unit: unit.value,
      dayOfMonth: unit.value === 'month' ? Number(day.value) : null,
      startDate: start.value,
      endDate: end.value || null,
    };
  }

  const change = (input) => (current) => {
    const changed = isNew ? addRule(current, input) : updateRule(current, id, input, ctx.today());
    return generateDue(changed, ctx.today()).state;
  };

  async function save(event) {
    event.preventDefault();
    let input;
    try {
      input = read();
      if (isNew) {
        // A start in the past books old dates at once, so ask first.
        const preview = addRule(ctx.store.state, input).rules.at(-1);
        const past = occurrencesBetween(preview, preview.startDate, addDays(ctx.today(), -1)).length;
        if (past > 0 && !(await ask(t.recurring.backfill(past)))) return;
      }
    } catch (problem) {
      error.textContent = t.errorText(problem);
      return;
    }
    submit.disabled = true;
    const saved = await ctx.act(change(input), error);
    submit.disabled = false;
    if (!saved) return;
    toast(t.recurring.saved);
    ctx.done('#/recurring');
  }

  return h('main', { class: 'screen' },
    header(isNew ? t.recurring.newTitle : t.recurring.editTitle, '#/recurring'),
    isNew ? null : h('p', { class: 'hint' }, t.recurring.editExplain),
    h('form', { class: 'stack', onsubmit: save, novalidate: true },
      field(t.recurring.label, label),
      field(t.recurring.kind, kind),
      potField,
      field(t.common.amount, amount),
      h('div', { class: 'pair' }, field(t.recurring.every, every), field(t.recurring.unit, unit)),
      dayField,
      field(t.recurring.start, start),
      field(t.recurring.end, end, t.common.optional),
      error,
      submit));
}
