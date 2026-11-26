import { activePots, movePot, updateSettings } from '../../core/model.js';
import { importJson } from '../../core/backup.js';
import { formatLongDate, t } from '../../text/nl.js';
import { badge, card, errorLine, h, header, toggle } from '../dom.js';
import { ask, toast } from '../dialog.js';
import { backupNow, shareFile } from '../files.js';
import { armSound, chime } from '../sound.js';

function backupSection(ctx) {
  const { lastBackupDate } = ctx.store.state.settings;
  const error = errorLine();
  const picker = h('input', {
    type: 'file',
    hidden: true,
    onchange: async () => {
      const [file] = picker.files;
      if (!file) return;
      try {
        const content = await file.text();
        importJson(content); // refuse a bad file before asking to replace anything
        if (!(await ask(t.settings.restoreConfirm))) return;
        await ctx.store.restore(content, ctx.today());
        ctx.weekly = null; // it described the data that was just replaced
        toast(t.settings.restored);
        ctx.refresh();
      } catch (problem) {
        error.textContent = t.errorText(problem);
      } finally {
        picker.value = '';
      }
    },
  });
  const csv = async () => {
    try {
      await shareFile(ctx.store.ledgerFile(ctx.today(), t.csv));
    } catch (problem) {
      error.textContent = t.errorText(problem);
    }
  };
  return card(t.settings.backup,
    h('p', {}, lastBackupDate ? t.settings.lastBackup(formatLongDate(lastBackupDate)) : t.settings.neverBackup),
    h('p', { class: 'hint' }, t.settings.backupExplain),
    h('div', { class: 'stack' },
      h('button', { type: 'button', class: 'button', onclick: () => backupNow(ctx) }, t.settings.backupNow),
      h('button', { type: 'button', class: 'button ghost', onclick: csv }, t.settings.csv),
      h('button', { type: 'button', class: 'button ghost', onclick: () => picker.click() }, t.settings.restore),
      picker),
    error);
}

function storageSection(ctx) {
  const answer = ctx.storage;
  let line = t.settings.protectedUnknown;
  if (answer) {
    if (!answer.supported) line = t.settings.protectedUnsupported;
    else line = answer.persisted ? t.settings.protectedYes : t.settings.protectedNo;
  }
  return card(t.settings.storage,
    h('p', {}, h('strong', {}, line)),
    answer?.error ? h('p', { class: 'hint' }, `${t.errors.detail} ${answer.error}`) : null,
    h('p', { class: 'hint' }, ctx.installed ? t.settings.installedYes : t.settings.installedNo));
}

function preferences(ctx) {
  const { settings } = ctx.store.state;
  const set = async (patch) => {
    await ctx.act((state) => updateSettings(state, patch));
    ctx.refresh();
  };
  const setSound = async (on) => {
    if (on) armSound(); // still inside the tap, which phones require
    await set({ sound: on });
    if (on) chime(); // so it is clear what was switched on
  };
  return card(null,
    toggle(t.settings.sound, settings.sound, setSound),
    toggle(t.settings.reduceMotion, settings.reduceMotion, (on) => set({ reduceMotion: on })),
    h('p', { class: 'hint' }, t.settings.reduceMotionHint));
}

function orderSection(ctx) {
  const pots = activePots(ctx.store.state);
  if (pots.length < 2) return null;
  const shift = async (potId, direction) => {
    if (await ctx.act((state) => movePot(state, potId, direction))) ctx.refresh();
  };
  return card(t.settings.order,
    h('ul', { class: 'plain' }, pots.map((pot, i) => h('li', { class: 'row' },
      badge(pot),
      h('span', { class: 'grow' }, pot.name),
      h('button', {
        type: 'button', class: 'icon', disabled: i === 0, 'aria-label': t.settings.up(pot.name), onclick: () => shift(pot.id, -1),
      }, '↑'),
      h('button', {
        type: 'button', class: 'icon', disabled: i === pots.length - 1, 'aria-label': t.settings.down(pot.name), onclick: () => shift(pot.id, 1),
      }, '↓')))));
}

export function settingsScreen(ctx) {
  return h('main', { class: 'screen' },
    header(t.settings.title),
    backupSection(ctx),
    storageSection(ctx),
    preferences(ctx),
    orderSection(ctx));
}
