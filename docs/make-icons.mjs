// Makes the phone icons (PNG) from the kitten drawing and the app's colours.
// It uses Microsoft Edge, which is part of Windows, without a window and with a throwaway profile.
// Run again after changing the kitten:  node docs/make-icons.mjs

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { themeVariables } from '../js/theme.js';

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);
if (!EDGE) throw new Error('Microsoft Edge was not found.');

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const drawing = read('../assets/kitten.svg').replace(/<!--[\s\S]*?-->\s*/, '').trim();
const kittenCss = read('../assets/kitten.css');
const variables = themeVariables().map(([name, value]) => `${name}:${value};`).join('');

// What part of the drawing (200 x 200) each icon shows.
// "close": head and collar, filling the square. iPhones round the corners themselves.
// "maskable": Android may cut the icon to a circle, so everything that matters stays inside a circle
// of 80% of the width.
const CLOSE = [24, 8, 152];
const MASKABLE = [5, -12, 190];

const ICONS = [
  { file: 'apple-touch-icon.png', size: 180, view: CLOSE },
  { file: 'icon-192.png', size: 192, view: CLOSE },
  { file: 'icon-512.png', size: 512, view: CLOSE },
  { file: 'icon-maskable-512.png', size: 512, view: MASKABLE },
];

function page({ size, view: [x, y, width] }) {
  const background = `<rect x="${x}" y="${y}" width="${width}" height="${width}" fill="var(--color-accent-soft)"/>`;
  const svg = drawing
    .replace('viewBox="0 0 200 200"', `viewBox="${x} ${y} ${width} ${width}" width="${size}" height="${size}"`)
    .replace(/(<svg[^>]*>)/, `$1${background}`);
  // The picture is the sitting kitten without cushion and tail, standing still.
  return `<!doctype html><html><head><meta charset="utf-8"><style>
:root{${variables}}
${kittenCss}
html,body{margin:0;padding:0;overflow:hidden}
.kitten{width:${size}px;height:${size}px;overflow:hidden}
.kitten *{animation:none !important}
.kitten .cushion,.kitten .cushion-seam,.kitten .tail{display:none}
</style></head><body>${svg}</body></html>`;
}

/**
 * Edge hands back control before the picture is saved, so wait for a complete PNG file (it ends with
 * the "IEND" mark). Returns the width and height written in the file.
 */
async function waitForPng(path) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (existsSync(path)) {
      const bytes = readFileSync(path);
      if (bytes.length > 24 && bytes.subarray(-8, -4).toString() === 'IEND') {
        return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
      }
    }
    await sleep(250);
  }
  throw new Error(`Edge did not make ${path} within a minute.`);
}

const out = fileURLToPath(new URL('../assets/icons/', import.meta.url));
mkdirSync(out, { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'spaarpoes-icons-'));
try {
  for (const icon of ICONS) {
    const html = join(work, `${icon.file}.html`);
    const target = join(out, icon.file);
    writeFileSync(html, page(icon));
    rmSync(target, { force: true }); // so an old picture can never pass for a new one
    execFileSync(EDGE, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', '--force-device-scale-factor=1',
      `--user-data-dir=${join(work, `profile-${icon.file}`)}`, `--window-size=${icon.size},${icon.size}`,
      `--screenshot=${target}`, pathToFileURL(html).href,
    ], { stdio: 'ignore', timeout: 60000 });
    const [width, height] = await waitForPng(target);
    if (width !== icon.size || height !== icon.size) {
      throw new Error(`${icon.file} came out ${width}x${height} instead of ${icon.size}x${icon.size}`);
    }
    console.log(`assets/icons/${icon.file}  ${width}x${height}`);
  }
} finally {
  await removeWorkFolder();
}

/** Edge keeps its throwaway profile locked for a while after closing, so removing it is retried. */
async function removeWorkFolder() {
  for (let attempt = 1; ; attempt += 1) {
    try {
      rmSync(work, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 60) {
        console.log(`The icons are fine, but this temporary folder could not be removed yet: ${work} (${error.code})`);
        return;
      }
      await sleep(500);
    }
  }
}
