// Starts the app, and shows the screen that belongs to the address.

import { localDate } from '../core/dates.js';
import { createState, updateSettings } from '../core/model.js';
import { sampleState } from '../core/sample.js';
import { markSummaryShown, weeklySummary } from '../core/weekly.js';
import { loadKitten } from './kitten.js';
import { showParty } from './party.js';
import { armSound, chime } from './sound.js';
import { askForPersistence, createIndexedDbAdapter, openStore } from '../store.js';
import { applyTheme } from '../theme.js';
import { t } from '../text/nl.js';
import { h } from './dom.js';
import { toast } from './dialog.js';
import { homeScreen } from './screens/home.js';
import { addScreen } from './screens/add.js';
import { potScreen, newPotScreen } from './screens/pot.js';
import { moveScreen } from './screens/move.js';
import { recurringScreen, ruleScreen } from './screens/recurring.js';
import { settingsScreen } from './screens/settings.js';
import { statsScreen } from './screens/stats.js';

const SCREENS = {
  '': homeScreen,
  add: addScreen,
  pot: potScreen,
  'new-pot': newPotScreen,
  move: moveScreen,
  recurring: recurringScreen,
  rule: ruleScreen,
  stats: statsScreen,
  settings: settingsScreen,
};

// Which tab at the bottom is lit.
const TABS = [
  { href: '#/', label: t.nav.home, icon: '🏠', screens: ['', 'add', 'pot', 'new-pot', 'move'] },
  { href: '#/recurring', label: t.nav.recurring, icon: '🔁', screens: ['recurring', 'rule'] },
  { href: '#/stats', label: t.nav.stats, icon: '📊', screens: ['stats'] },
  { href: '#/settings', label: t.nav.settings, icon: '⚙️', screens: ['settings'] },
];

const root = document.getElementById('app');
const today = () => localDate(new Date());
const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

/** sw.js keeps the app's own files on the phone, so that it opens without a network. */
async function keepForOffline() {
  await navigator.serviceWorker.register('sw.js');
}

function fatal(error) {
  root.replaceChildren(h('main', { class: 'screen' },
    h('section', { class: 'card', role: 'alert' },
      h('h1', {}, t.errors.title),
      h('p', {}, t.errors.startup),
      h('p', {}, t.errorText(error)),
      h('p', { class: 'hint' }, `${t.errors.detail} ${error?.message ?? error}`))));
}

function route() {
  const [path, search = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  const [name = '', id] = path.split('/');
  return { name: Object.hasOwn(SCREENS, name) ? name : '', id, query: new URLSearchParams(search) };
}

async function start() {
  applyTheme(document);
  await loadKitten();
  const store = await openStore({
    adapter: createIndexedDbAdapter(),
    today: today(),
    firstState: (day) => sampleState(day, t.sample, t.freeName),
  });

  let shownHash = null;
  let typing = false; // true once something is typed on the screen, so it is not redrawn under the fingers
  let shownDay = today();

  const ctx = {
    store,
    today,
    installed: isInstalled(),
    storage: null, // filled in when the phone has answered about storage protection
    weekly: null, // last week's summary while its card is on the home screen
    emptyState: () => {
      const { sound, reduceMotion } = store.state.settings;
      return updateSettings(createState({ today: today(), freeName: t.freeName }), { sound, reduceMotion });
    },
    celebrate(parties) {
      showParty(parties, store.state);
      if (store.state.settings.sound) chime();
    },

    /**
     * Saves a change. True once the phone has stored it. On a failure the message goes into
     * `errorBox` when given, otherwise it pops up at the bottom.
     */
    async act(change, errorBox) {
      try {
        const { parties } = await store.apply(change, today());
        if (errorBox) errorBox.textContent = '';
        if (parties.length > 0) ctx.celebrate(parties);
        return true;
      } catch (error) {
        if (errorBox) errorBox.textContent = t.errorText(error);
        else toast(t.errorText(error), { problem: true });
        return false;
      }
    },

    /** Goes to another screen without leaving the finished form in the history. */
    done(hash) {
      if (window.location.hash === hash) ctx.refresh();
      else window.location.replace(hash);
    },

    refresh: () => render(),
  };

  // The bottom menu is made once and stays; only the screen above it is replaced.
  const tabLinks = TABS.map((tab) => h('a', { href: tab.href },
    h('span', { 'aria-hidden': 'true' }, tab.icon),
    h('span', {}, tab.label)));
  const nav = h('nav', { class: 'tabs', 'aria-label': t.nav.label }, tabLinks);

  function lightTab(name) {
    TABS.forEach((tab, i) => {
      if (tab.screens.includes(name)) tabLinks[i].setAttribute('aria-current', 'page');
      else tabLinks[i].removeAttribute('aria-current');
    });
  }

  function render() {
    const current = route();
    const sameScreen = shownHash === window.location.hash;
    const scrolled = window.scrollY;
    const screen = SCREENS[current.name](ctx, current);
    lightTab(current.name);
    if (nav.isConnected) root.querySelector('main').replaceWith(screen);
    else root.replaceChildren(screen, nav);
    document.documentElement.classList.toggle('reduce-motion', store.state.settings.reduceMotion);
    window.scrollTo(0, sameScreen ? scrolled : 0);
    shownHash = window.location.hash;
    shownDay = today();
    typing = false;
  }

  /**
   * At the start and every time the app comes back: books recurring entries that became due, and
   * picks up last week's summary if it has not been shown yet. True when there is something new.
   */
  async function wakeUp() {
    const { made, parties } = await store.catchUp(today());
    if (parties.length > 0) ctx.celebrate(parties);
    const summary = weeklySummary(store.state, today());
    if (summary) {
      await store.apply((state) => markSummaryShown(state, summary), today());
      ctx.weekly = summary;
    }
    return made.length > 0 || summary !== null;
  }

  document.documentElement.classList.toggle('reduce-motion', store.state.settings.reduceMotion);
  // Sound may only start from a tap, and a party can come just after one.
  document.addEventListener('pointerup', () => { if (store.state.settings.sound) armSound(); });
  root.addEventListener('input', () => { typing = true; });
  // Building a screen takes a moment on a phone. So the tapped tab lights up and is drawn first, and
  // the screen is built right after that picture. (A frame callback runs just before a picture is
  // drawn, and the timer inside it just after.)
  let nextRender = 0;
  window.addEventListener('hashchange', () => {
    lightTab(route().name);
    cancelAnimationFrame(nextRender);
    nextRender = requestAnimationFrame(() => setTimeout(render));
  });
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    try {
      await store.reload();
      const booked = await wakeUp();
      if (!typing && (booked || shownDay !== today())) render();
    } catch (error) {
      toast(t.errorText(error), { problem: true });
    }
  });
  window.addEventListener('unhandledrejection', (event) => {
    toast(t.errorText(event.reason), { problem: true });
  });

  await wakeUp();
  render();
  keepForOffline().catch((error) => toast(`${t.errors.offline} ${error.message}`, { problem: true }));

  askForPersistence(navigator.storage, ctx.installed)
    .then((answer) => { ctx.storage = answer; })
    .catch((error) => { ctx.storage = { supported: false, persisted: false, error: error.message }; })
    .finally(() => { if (route().name === 'settings') render(); });
}

start().catch(fatal);
