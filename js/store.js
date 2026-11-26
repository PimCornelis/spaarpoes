// The only module that reads and writes saved data.
//
// The whole state is saved as one record, so a change is either saved completely or not at all.
// A change counts as done only after the phone's database has confirmed the write.
// The database sits behind a small "adapter" with two calls, read() and write(), so the logic here
// can be tested without a browser.

import { BudgetError, check } from './core/errors.js';
import { exportCsv, exportJson, importJson, validateState } from './core/backup.js';
import { generateDue } from './core/rules.js';
import { recordParties } from './core/alerts.js';

const SCHEMA = 1;

/**
 * Opens the saved data, or creates and saves it on the very first opening.
 * `firstState(today)` builds the state for that first time.
 */
export async function openStore({ adapter, today, firstState }) {
  let state;
  let revision;

  async function load() {
    const record = await adapter.read();
    if (record === null) return false;
    check(record.schema === SCHEMA, 'store-version', { schema: record.schema });
    state = validateState(record.data);
    revision = record.revision;
    return true;
  }

  async function save(next) {
    // Checked before writing: whatever is saved must be readable the next time.
    validateState(next);
    await adapter.write({ schema: SCHEMA, revision: revision + 1, data: next }, revision);
    revision += 1;
    state = next;
  }

  if (!(await load())) {
    revision = 0;
    await save(firstState(today));
  }

  // Writes go one at a time, each starting from the result of the one before.
  let tail = Promise.resolve();
  function inTurn(task) {
    const run = tail.then(task);
    tail = run.catch(() => {});
    return run;
  }

  /** Applies `change(state) -> newState`, saves it, and reports any party it caused. */
  function apply(change, day) {
    return inTurn(async () => {
      const next = change(state);
      if (next === state) return { parties: [] };
      const result = recordParties(state, next, day);
      await save(result.state);
      return { parties: result.parties };
    });
  }

  return {
    get state() {
      return state;
    },

    apply,

    /** Books the recurring entries that became due since the last time. */
    async catchUp(day) {
      let made = [];
      const { parties } = await apply((current) => {
        const result = generateDue(current, day);
        made = result.made;
        return result.state;
      }, day);
      return { made, parties };
    },

    /** Reads the saved data again, for when another window may have changed it. */
    reload() {
      return inTurn(async () => {
        check(await load(), 'store-empty');
      });
    },

    /** Replaces everything with fresh data, without any party. Used to clear the example data. */
    replace(next) {
      return inTurn(() => save(next));
    },

    /** Replaces everything with the contents of a back-up file. A bad file changes nothing. */
    restore(content, day) {
      return inTurn(async () => {
        const imported = importJson(content);
        await save(generateDue(imported, day).state);
      });
    },

    // A ".txt" name: Android's Chrome refuses to share ".json" files, but the content is JSON.
    backupFile(day, exportedAt) {
      return { name: `spaarpoes-backup-${day}.json.txt`, type: 'text/plain', content: exportJson(state, exportedAt) };
    },

    ledgerFile(day, labels) {
      return { name: `spaarpoes-boekingen-${day}.csv`, type: 'text/csv', content: exportCsv(state, labels) };
    },
  };
}

/**
 * Asks the browser to protect the saved data from being cleared. Only asked when the app is installed
 * on the home screen. Returns what the browser really answers.
 */
export async function askForPersistence(storage, installed) {
  if (!storage?.persisted || !storage?.persist) return { supported: false, persisted: false };
  let persisted = await storage.persisted();
  if (!persisted && installed) persisted = await storage.persist();
  return { supported: true, persisted };
}

/** Stand-in database in memory, for the tests. */
export function createMemoryAdapter(initial = null) {
  let saved = initial === null ? null : JSON.stringify(initial);
  return {
    async read() {
      return saved === null ? null : JSON.parse(saved);
    },
    async write(record, expectedRevision) {
      const current = saved === null ? 0 : JSON.parse(saved).revision;
      if (current !== expectedRevision) throw new BudgetError('store-conflict');
      saved = JSON.stringify(record);
    },
  };
}

const DATABASE = 'spaarpoes';
const TABLE = 'app';
const KEY = 'state';

/** The phone's own database, IndexedDB. */
export function createIndexedDbAdapter(factory = globalThis.indexedDB) {
  let connection = null;

  function connect() {
    connection ??= new Promise((resolve, reject) => {
      const request = factory.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(TABLE);
      request.onsuccess = () => {
        const db = request.result;
        // The phone can close the connection while the app sleeps; the next call opens a new one.
        db.onclose = () => { connection = null; };
        db.onversionchange = () => { db.close(); connection = null; };
        resolve(db);
      };
      request.onerror = () => { connection = null; reject(request.error); };
    });
    return connection;
  }

  return {
    async read() {
      const db = await connect();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(TABLE, 'readonly');
        const request = transaction.objectStore(TABLE).get(KEY);
        transaction.oncomplete = () => resolve(request.result ?? null);
        transaction.onabort = () => reject(transaction.error ?? new Error('read stopped'));
      });
    },

    async write(record, expectedRevision) {
      const db = await connect();
      return new Promise((resolve, reject) => {
        // "strict": report success only after the data is really on the phone's storage.
        const transaction = db.transaction(TABLE, 'readwrite', { durability: 'strict' });
        const table = transaction.objectStore(TABLE);
        let conflict = false;
        const current = table.get(KEY);
        current.onsuccess = () => {
          if ((current.result?.revision ?? 0) !== expectedRevision) {
            conflict = true;
            transaction.abort();
            return;
          }
          table.put(record, KEY);
        };
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(
          conflict ? new BudgetError('store-conflict') : (transaction.error ?? new Error('write stopped')),
        );
      });
    },
  };
}
