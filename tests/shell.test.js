// The installable shell: manifest, icons and the offline copy. These checks read the files; whether a
// phone installs the app and opens it without a network can only be checked on a phone.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appFiles, expectedVersion, readServiceWorker } from '../docs/stamp-sw.mjs';
import { colors } from '../js/theme.js';

const root = new URL('../', import.meta.url);
const text = (path) => readFileSync(new URL(path, root), 'utf8');
const manifest = () => JSON.parse(text('manifest.webmanifest'));

const pngSize = (path) => {
  const bytes = readFileSync(new URL(path, root));
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG', path);
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
};

test('the manifest has what installing needs', () => {
  const m = manifest();
  assert.equal(m.name, 'Spaarpoes');
  assert.equal(m.display, 'standalone');
  assert.ok(!('prefer_related_applications' in m));
  // relative addresses: the app lives in a sub-folder of its web address
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
  assert.ok(m.icons.every((icon) => !icon.src.startsWith('/') && !icon.src.includes('://')));
});

test('every icon exists in the size it claims, and Android gets 192, 512 and a maskable one', () => {
  const m = manifest();
  for (const icon of m.icons) assert.equal(pngSize(icon.src), icon.sizes, icon.src);
  const has = (size, purpose) => m.icons.some((i) => i.sizes === size && (i.purpose ?? 'any') === purpose);
  assert.ok(has('192x192', 'any') && has('512x512', 'any') && has('512x512', 'maskable'));
});

test('the page links the manifest and the 180 px iPhone icon', () => {
  const html = text('index.html');
  assert.ok(html.includes('<link rel="manifest" href="manifest.webmanifest">'));
  assert.ok(html.includes('<link rel="apple-touch-icon" sizes="180x180" href="assets/icons/apple-touch-icon.png">'));
  assert.equal(pngSize('assets/icons/apple-touch-icon.png'), '180x180');
});

test('the manifest colours are the theme colours', () => {
  assert.equal(manifest().theme_color, colors.bg);
  assert.equal(manifest().background_color, colors.bg);
});

test('the offline copy lists every file of the app', () => {
  const { files } = readServiceWorker();
  assert.deepEqual(files, ['./', ...appFiles()]);
  for (const needed of ['index.html', 'manifest.webmanifest', 'styles.css', 'js/ui/app.js', 'js/store.js', 'assets/kitten.svg']) {
    assert.ok(files.includes(needed), needed);
  }
  assert.ok(!files.some((f) => f.startsWith('tests/') || f.startsWith('docs/')));
});

test('everything a script imports is in the offline copy', () => {
  const files = new Set(appFiles());
  for (const file of [...files].filter((f) => f.endsWith('.js'))) {
    for (const [, target] of text(file).matchAll(/from '(\.[^']+)'/g)) {
      const path = new URL(target, new URL(file, root)).href.slice(root.href.length);
      assert.ok(files.has(path), `${file} imports ${path}`);
    }
  }
});

test('the offline copy has a new version name whenever an app file changed', () => {
  assert.equal(readServiceWorker().version, expectedVersion(),
    'An app file changed. Run:  node docs/stamp-sw.mjs');
});
