// Lets the app open without a network: it keeps a copy of the app's own files on the phone.
// (This is a "service worker". It never touches the saved money data.)

// <written by docs/stamp-sw.mjs - run it after changing any app file>
const VERSION = 'spaarpoes-be713f5a36f3';
const FILES = [
  './',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'assets/kitten.css',
  'assets/kitten.svg',
  'index.html',
  'js/core/alerts.js',
  'js/core/backup.js',
  'js/core/dates.js',
  'js/core/errors.js',
  'js/core/ledger.js',
  'js/core/model.js',
  'js/core/money.js',
  'js/core/mood.js',
  'js/core/rules.js',
  'js/core/sample.js',
  'js/core/stats.js',
  'js/core/weekly.js',
  'js/store.js',
  'js/text/nl.js',
  'js/theme.js',
  'js/ui/app.js',
  'js/ui/charts.js',
  'js/ui/confetti.js',
  'js/ui/dialog.js',
  'js/ui/dom.js',
  'js/ui/files.js',
  'js/ui/kitten.js',
  'js/ui/party.js',
  'js/ui/screens/add.js',
  'js/ui/screens/home.js',
  'js/ui/screens/move.js',
  'js/ui/screens/pot.js',
  'js/ui/screens/recurring.js',
  'js/ui/screens/settings.js',
  'js/ui/screens/stats.js',
  'js/ui/sound.js',
  'manifest.webmanifest',
  'styles.css',
];
// </written>

self.addEventListener('install', (event) => {
  // All files or none: if one cannot be fetched, this version is not installed.
  // "reload" goes past the browser's ordinary cache, so no old file slips into a new version.
  event.waitUntil(caches.open(VERSION)
    .then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' })))));
});

// A new version takes over once the app has been closed completely; only then are old copies removed.
self.addEventListener('activate', (event) => {
  // Other apps on the same web address keep copies too: only older ones of this app are removed.
  event.waitUntil(caches.keys().then((names) => Promise.all(names
    .filter((name) => name.startsWith('spaarpoes-') && name !== VERSION)
    .map((name) => caches.delete(name)))));
});

// The app's own files come from the copy. Anything that is not part of the app goes to the network.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.open(VERSION)
    .then((cache) => cache.match(event.request, { ignoreSearch: true }))
    .then((kept) => kept ?? fetch(event.request)));
});
