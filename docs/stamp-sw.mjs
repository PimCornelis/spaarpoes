// Writes into sw.js the list of the app's files and a version name made from their contents.
// A phone only fetches a new version when sw.js changes, so run this after changing any app file:
//     node docs/stamp-sw.mjs
// `node --test` fails when this was forgotten.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root));

const BLOCK = /(\/\/ <written by [^\n]*>\n)[\s\S]*?(\/\/ <\/written>)/;

function filesIn(folder) {
  return readdirSync(new URL(`${folder}/`, root), { withFileTypes: true }).flatMap((item) => {
    const path = `${folder}/${item.name}`;
    return item.isDirectory() ? filesIn(path) : [path];
  });
}

/** Every file the app needs to run. Tests and notes are not part of the app. */
export function appFiles() {
  return ['index.html', 'manifest.webmanifest', 'styles.css', ...filesIn('assets'), ...filesIn('js')].sort();
}

// Text files are compared with the same line endings on every computer.
const content = (path) => (path.endsWith('.png') ? read(path) : read(path).toString('utf8').replace(/\r\n/g, '\n'));

export function expectedVersion() {
  const hash = createHash('sha256');
  for (const path of appFiles()) hash.update(`${path}\0`).update(content(path)).update('\0');
  hash.update(content('sw.js').replace(BLOCK, '')); // a change in how the copy works counts too
  return `spaarpoes-${hash.digest('hex').slice(0, 12)}`;
}

/** What sw.js says now. */
export function readServiceWorker() {
  const source = content('sw.js');
  return {
    version: /const VERSION = '([^']*)';/.exec(source)[1],
    files: [.../const FILES = \[([\s\S]*?)\];/.exec(source)[1].matchAll(/'([^']*)'/g)].map((match) => match[1]),
  };
}

function stamp() {
  const lines = ['./', ...appFiles()].map((file) => `  '${file}',`).join('\n');
  const version = expectedVersion();
  const next = content('sw.js').replace(BLOCK, (_, open, close) =>
    `${open}const VERSION = '${version}';\nconst FILES = [\n${lines}\n];\n${close}`);
  writeFileSync(new URL('sw.js', root), next);
  console.log(`sw.js: ${version}, ${appFiles().length + 1} files`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) stamp();
