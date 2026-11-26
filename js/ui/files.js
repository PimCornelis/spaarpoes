// Handing a file to the phone's share menu, and the back-up that uses it.

import { BudgetError } from '../core/errors.js';
import { updateSettings } from '../core/model.js';
import { t } from '../text/nl.js';
import { toast } from './dialog.js';

/**
 * Opens the share menu with one file. Must be called straight from a tap.
 * Returns false when the share menu was closed without sharing.
 */
export async function shareFile({ name, type, content }) {
  const data = { files: [new File([content], name, { type })] };
  if (!navigator.canShare?.(data)) throw new BudgetError('share-unsupported');
  try {
    await navigator.share(data);
    return true;
  } catch (error) {
    if (error.name === 'AbortError') return false;
    throw error;
  }
}

export async function backupNow(ctx) {
  try {
    const day = ctx.today();
    const shared = await shareFile(ctx.store.backupFile(day, new Date().toISOString()));
    if (shared && await ctx.act((state) => updateSettings(state, { lastBackupDate: day }))) {
      toast(t.settings.backupDone);
      ctx.refresh();
    }
  } catch (error) {
    toast(t.errorText(error), { problem: true });
  }
}
