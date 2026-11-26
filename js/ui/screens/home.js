import { activePots, balance, findPot, heap } from '../../core/model.js';
import { attention, backupDue } from '../../core/alerts.js';
import { upcoming } from '../../core/rules.js';
import { kittenMood } from '../../core/mood.js';
import { kitten } from '../kitten.js';
import { formatEuro } from '../../core/money.js';
import { formatDay, t } from '../../text/nl.js';
import { badge, balanceClass, card, h, header, pill } from '../dom.js';
import { ask, toast } from '../dialog.js';
import { backupNow } from '../files.js';

const SOON_DAYS = 7;

function sampleBanner(ctx) {
  if (!ctx.store.state.settings.isSample) return null;
  return h('section', { class: 'card notice' },
    h('p', {}, t.home.sampleText),
    // In the browser, entries do not move along to the app on the home screen.
    ctx.installed ? null : h('p', {}, h('strong', {}, t.home.sampleInstallFirst)),
    h('button', {
      type: 'button',
      class: 'button',
      onclick: async () => {
        if (!(await ask(t.home.sampleConfirm))) return;
        try {
          await ctx.store.replace(ctx.emptyState());
          ctx.weekly = null;
          toast(t.home.sampleCleared);
          ctx.refresh();
        } catch (error) {
          toast(t.errorText(error), { problem: true });
        }
      },
    }, t.home.sampleButton));
}

function hero(state) {
  const free = balance(state, 'free');
  return h('a', { class: `hero ${balanceClass(free)}`, href: '#/pot/free' },
    h('span', { class: 'hero-label' }, t.home.free),
    h('strong', { class: 'hero-amount' }, formatEuro(free)),
    h('span', { class: 'hero-heap' }, t.home.heap(formatEuro(heap(state)))));
}

function kittenRow(state, today) {
  const mood = kittenMood(state, today);
  return h('div', { class: 'kitten-row' },
    h('div', { class: 'kitten-home' }, kitten(mood)),
    h('p', { class: 'speech' }, t.kitten.says[mood]));
}

/** Last week in short. Shown the first time the app is opened after that week. */
function weekCard(ctx, state) {
  const week = ctx.weekly;
  if (!week) return null;
  const potName = (potId) => {
    const pot = findPot(state, potId);
    return `${pot.emoji} ${pot.name}`;
  };
  return card(t.week.title,
    h('p', { class: 'hint' }, t.week.range(formatDay(week.weekStart), formatDay(week.weekEnd))),
    week.spent === 0
      ? h('p', {}, t.week.nothing)
      : [
        h('p', {}, h('strong', {}, t.week.spent(formatEuro(week.spent)))),
        h('h3', {}, t.week.top),
        h('ol', { class: 'week-top' }, week.top.map((item) => h('li', {},
          h('span', {}, potName(item.potId)), h('span', {}, formatEuro(item.amount))))),
      ],
    week.parties.length === 0 ? null : [
      h('h3', {}, t.week.parties),
      week.parties.map((party) => h('p', {}, `🎉 ${potName(party.potId)}${party.label ? `: ${party.label}` : ''}`)),
    ],
    h('button', {
      type: 'button',
      class: 'button ghost',
      onclick: () => { ctx.weekly = null; ctx.refresh(); },
    }, t.week.close));
}

/** Only there when something needs a look. */
function watchCard(state, today) {
  const items = attention(state, today);
  if (items.length === 0) return null;
  return card(t.home.watch,
    h('ul', { class: 'plain' }, items.map((item) => {
      const pot = findPot(state, item.potId);
      const sentence = item.type === 'negative'
        ? t.home.below(pot.name, formatEuro(balance(state, pot.id)))
        : t.home.unused(pot.name, item.months);
      return h('li', {}, h('a', { class: 'row', href: `#/pot/${pot.id}` }, badge(pot), h('span', { class: 'grow' }, sentence)));
    })));
}

function backupCard(ctx) {
  if (!backupDue(ctx.store.state, ctx.today())) return null;
  return h('section', { class: 'card notice' },
    h('h2', {}, t.home.backupTitle),
    h('p', {}, t.home.backupText),
    h('button', { type: 'button', class: 'button', onclick: () => backupNow(ctx) }, t.home.backupButton));
}

function potList(state) {
  const pots = activePots(state);
  return h('section', {},
    h('h2', {}, t.home.pots),
    pots.length === 0 ? h('p', { class: 'hint' }, t.home.noPots) : null,
    h('ul', { class: 'pots' }, pots.map((pot) => h('li', {},
      h('a', { class: 'row pot-row', href: `#/pot/${pot.id}` },
        badge(pot), h('span', { class: 'grow' }, pot.name), pill(balance(state, pot.id)))))),
    h('a', { class: 'button ghost wide', href: '#/new-pot' }, `+ ${t.home.newPot}`));
}

function soonCard(state, today) {
  const items = upcoming(state, today, SOON_DAYS);
  return card(t.home.soon,
    items.length === 0
      ? h('p', { class: 'hint' }, t.home.soonEmpty)
      : h('ul', { class: 'plain' }, items.map((item) => {
        const pot = findPot(state, item.potId);
        return h('li', { class: 'row' },
          badge(pot),
          h('span', { class: 'grow' }, h('span', {}, item.label), h('small', {}, `${formatDay(item.date)} · ${t.recurring.kindShort[item.kind]}`)),
          h('span', {}, formatEuro(item.amount)));
      })));
}

export function homeScreen(ctx) {
  const { state } = ctx.store;
  const today = ctx.today();
  return h('main', { class: 'screen home' },
    header(t.appName),
    sampleBanner(ctx),
    hero(state),
    kittenRow(state, today),
    weekCard(ctx, state),
    watchCard(state, today),
    backupCard(ctx),
    potList(state),
    soonCard(state, today),
    h('a', { class: 'fab', href: '#/add', 'aria-label': t.home.add }, '+'));
}
