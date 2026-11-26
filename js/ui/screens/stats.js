// The statistics page: five charts over a chosen range. Tapping a bar or point lists the bookings
// behind it, and each chart has the same numbers as a table.

import { activePots, findPot, freePot } from '../../core/model.js';
import { firstOfMonth } from '../../core/dates.js';
import { formatEuro } from '../../core/money.js';
import {
  balanceOverTime, incomeAgainstSpend, rangeMonths, recurringCosts, spendPerPotPerMonth, spendPerWeekday,
} from '../../core/stats.js';
import { formatDay, formatMonth, formatShortDate, t } from '../../text/nl.js';
import { barChart, columnChart, lineChart } from '../charts.js';
import { card, choices, field, h, header } from '../dom.js';

const RANGES = [1, 3, 6, 12];
const STEP = { 1: 'day', 3: 'week', 6: 'week', 12: 'month' };
const MAX_LISTED = 60;

// Remembered while the app is open.
let chosenRange = 3;
let chosenPot = 'all';

const empty = () => h('p', { class: 'hint' }, t.stats.nothing);

/** The bookings behind a tapped bar or point. */
function behind(state) {
  const box = h('div', { class: 'behind', 'aria-live': 'polite' }, h('p', { class: 'hint' }, t.stats.tap));
  const byId = new Map(state.entries.map((e) => [e.id, e]));
  return {
    box,
    show(heading, ids) {
      const entries = ids.map((id) => byId.get(id)).sort((a, b) => b.date.localeCompare(a.date));
      box.replaceChildren(
        h('h3', {}, heading),
        entries.length === 0 ? h('p', { class: 'hint' }, t.stats.noEntries) : h('ul', { class: 'plain' },
          entries.slice(0, MAX_LISTED).map((e) => {
            const pot = findPot(state, e.potId);
            return h('li', { class: 'row' },
              h('span', { class: 'grow' },
                h('span', {}, e.note || t.kinds[e.kind]),
                h('small', {}, `${formatDay(e.date)} · ${pot.name}`)),
              h('span', { class: e.amount > 0 ? 'money-in' : 'money-out' }, formatEuro(e.amount)));
          })),
        entries.length > MAX_LISTED ? h('p', { class: 'hint' }, t.stats.more(entries.length - MAX_LISTED)) : '',
      );
    },
  };
}

/** The same numbers as a table. `rows` are lists of texts; the first column names the row. */
function table(caption, headings, rows) {
  return h('details', { class: 'as-table' },
    h('summary', {}, t.stats.asTable),
    h('div', { class: 'table-scroll' }, h('table', {},
      h('caption', {}, caption),
      h('thead', {}, h('tr', {}, headings.map((text) => h('th', { scope: 'col' }, text)))),
      h('tbody', {}, rows.map(([first, ...rest]) => h('tr', {},
        h('th', { scope: 'row' }, first), rest.map((text) => h('td', {}, text))))))));
}

function section(title, unit, ...children) {
  return card(title, h('p', { class: 'hint' }, unit), ...children);
}

function perPot(state, months) {
  const { series, totals } = spendPerPotPerMonth(state, months);
  const unit = t.stats.perPotUnit;
  if (series.length === 0) return section(t.stats.perPot, unit, empty());
  const list = behind(state);
  const name = (potId) => `${findPot(state, potId).emoji} ${findPot(state, potId).name}`;
  const pick = (one, column) => list.show(
    `${name(one.potId)}, ${formatMonth(months[column])}: ${formatEuro(one.values[column])}`, one.entryIds[column],
  );
  let charts;
  if (months.length === 1) {
    charts = barChart({
      title: t.stats.perPot,
      rows: series.map((one) => ({ label: name(one.potId), value: one.values[0] })),
      onchoose: (i) => pick(series[i], 0),
    });
  } else {
    // One small chart per pot, all on the same scale, so they can be compared.
    const max = Math.max(...series.flatMap((one) => one.values));
    charts = series.map((one) => h('div', {
      class: 'small-chart',
    },
    h('h3', {}, name(one.potId)),
    columnChart({
      title: name(one.potId),
      labels: months.map(formatMonth),
      series: [{ name: findPot(state, one.potId).name, className: 'bar', values: one.values }],
      max,
      height: 70,
      onchoose: (i) => pick(one, i),
    })));
  }
  const rows = series.map((one) => [findPot(state, one.potId).name, ...one.values.map(formatEuro)]);
  rows.push([t.stats.total, ...totals.map(formatEuro)]);
  return section(t.stats.perPot, unit, charts, list.box,
    table(unit, [t.common.pot, ...months.map(formatMonth)], rows));
}

function pointLabels(point, step) {
  if (step === 'month') {
    const month = formatMonth(point.date.slice(0, 7));
    return { label: month, short: month };
  }
  const short = formatShortDate(point.date);
  return { label: step === 'week' ? t.stats.weekUntil(short) : short, short };
}

function overTime(state, months, today) {
  const step = STEP[months.length];
  const pots = [freePot(state), ...activePots(state)];
  if (chosenPot !== 'all' && !pots.some((p) => p.id === chosenPot)) chosenPot = 'all';
  const holder = h('div', {});
  const draw = () => {
    const potId = chosenPot === 'all' ? null : chosenPot;
    const points = balanceOverTime(state, potId, firstOfMonth(months[0]), today, step)
      .map((p) => ({ ...p, ...pointLabels(p, step), value: p.balance }));
    const list = behind(state);
    holder.replaceChildren(
      lineChart({
        title: t.stats.overTime,
        points,
        onchoose: (i) => list.show(`${points[i].label}: ${formatEuro(points[i].value)}`, points[i].entryIds),
      }),
      list.box,
      table(t.stats.overTimeUnit, [t.common.date, t.stats.balance], points.map((p) => [p.label, formatEuro(p.value)])),
    );
  };
  const select = h('select', {
    value: chosenPot,
    onchange: () => { chosenPot = select.value; draw(); },
  },
  h('option', { value: 'all' }, t.stats.allPots),
  pots.map((p) => h('option', { value: p.id }, `${p.emoji} ${p.name}`)));
  draw();
  return section(t.stats.overTime, t.stats.overTimeUnit, field(t.common.pot, select), holder);
}

function inAndOut(state, months) {
  const rows = incomeAgainstSpend(state, months);
  const unit = t.stats.inOutUnit;
  if (rows.every((r) => r.incomingIds.length + r.spendIds.length === 0)) {
    return section(t.stats.inOut, unit, empty());
  }
  const list = behind(state);
  const series = [
    { name: t.stats.in, className: 'bar second', values: rows.map((r) => r.income + r.extra) },
    { name: t.stats.out, className: 'bar', values: rows.map((r) => r.spend) },
  ];
  const legend = h('p', { class: 'legend' },
    h('span', {}, h('i', { class: 'key second', 'aria-hidden': 'true' }), t.stats.inLegend),
    h('span', {}, h('i', { class: 'key', 'aria-hidden': 'true' }), t.stats.out));
  return section(t.stats.inOut, unit, legend,
    columnChart({
      title: t.stats.inOut,
      labels: months.map(formatMonth),
      series,
      onchoose: (i) => list.show(
        `${formatMonth(months[i])}: ${t.stats.in} ${formatEuro(series[0].values[i])}, ${t.stats.out} ${formatEuro(rows[i].spend)}`,
        [...rows[i].incomingIds, ...rows[i].spendIds],
      ),
    }),
    list.box,
    table(unit, [t.stats.month, t.stats.salary, t.stats.extra, t.stats.out],
      rows.map((r) => [formatMonth(r.month), formatEuro(r.income), formatEuro(r.extra), formatEuro(r.spend)])));
}

function fixedCosts(state, months, today) {
  const costs = recurringCosts(state, today);
  const unit = t.stats.fixedUnit;
  if (costs.rules.length === 0) return section(t.stats.fixed, unit, h('p', { class: 'hint' }, t.stats.noFixed));
  const list = behind(state);
  const from = firstOfMonth(months[0]);
  const tile = (label, cents) => h('div', { class: 'tile' }, h('small', {}, label), h('strong', {}, formatEuro(cents)));
  return section(t.stats.fixed, unit,
    h('div', { class: 'tiles' }, tile(t.stats.perMonth, costs.perMonth), tile(t.stats.perYear, costs.perYear)),
    barChart({
      title: t.stats.fixed,
      rows: costs.rules.map((r) => ({ label: r.label, value: r.perMonth })),
      onchoose: (i) => {
        const rule = costs.rules[i];
        const ids = state.entries
          .filter((e) => e.ruleId === rule.ruleId && e.date >= from && e.date <= today)
          .map((e) => e.id);
        list.show(t.stats.bookedBy(rule.label), ids);
      },
    }),
    list.box,
    table(unit, [t.recurring.label, t.stats.perMonth, t.stats.perYear], [
      ...costs.rules.map((r) => [r.label, formatEuro(r.perMonth), formatEuro(r.perYear)]),
      [t.stats.total, formatEuro(costs.perMonth), formatEuro(costs.perYear)],
    ]));
}

function weekdays(state, months, today) {
  const days = spendPerWeekday(state, firstOfMonth(months[0]), today);
  const unit = t.stats.weekdayUnit;
  if (days.every((d) => d.entryIds.length === 0)) return section(t.stats.weekday, unit, empty());
  const list = behind(state);
  return section(t.stats.weekday, unit,
    columnChart({
      title: t.stats.weekday,
      labels: t.stats.weekdaysShort,
      series: [{ name: t.stats.out, className: 'bar', values: days.map((d) => d.amount) }],
      onchoose: (i) => list.show(`${t.stats.weekdaysLong[i]}: ${formatEuro(days[i].amount)}`, days[i].entryIds),
    }),
    list.box,
    table(unit, [t.stats.day, t.stats.out], days.map((d, i) => [t.stats.weekdaysLong[i], formatEuro(d.amount)])));
}

export function statsScreen(ctx) {
  const { state } = ctx.store;
  const today = ctx.today();
  const charts = h('div', { class: 'stack' });
  const draw = () => {
    const months = rangeMonths(today, chosenRange);
    charts.replaceChildren(
      perPot(state, months),
      overTime(state, months, today),
      inAndOut(state, months),
      fixedCosts(state, months, today),
      weekdays(state, months, today),
    );
  };
  const range = choices({
    label: t.stats.range,
    className: 'segmented',
    chosen: chosenRange,
    options: RANGES.map((value) => ({ value, label: t.stats.ranges[value] })),
    onchoose: (value) => { chosenRange = value; draw(); },
  });
  draw();
  return h('main', { class: 'screen' }, header(t.stats.title), range, charts);
}
