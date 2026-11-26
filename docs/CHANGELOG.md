# Spaarpoes - changelog

Newest first.

## 2026-11-26 - Tab change published: the owner says it feels better

The live app serves offline version `spaarpoes-918be91c8161`; the 40 app files and `sw.js` compared are
identical to the PC's, and asking for `CLAUDE.local.md` at the web address still answers "not found".
The owner's answer after the change: "Feels better".

That is a person's impression, not a measurement. It was not reported how the phone picked up the new
version, whether the light under the finger shows, or whether any lag is left. The cause of the lag is
still not established.

## 2026-11-26 - A tapped tab answers at once

**Why:** the owner reports that the app lags when switching tabs. In the code, the tapped tab only lit up
together with the new screen, so until the whole screen was built a tap showed little or nothing.

**Changed** (`js/ui/app.js`, `styles.css`):
- On a change of screen the tapped tab lights up and is drawn first; the new screen is built right after.
- The bottom menu is made once and stays; only the screen above it is replaced.
- A tab also lights up while the finger is on it.

**Checked on the PC** (windowless Edge, processor slowed 4 times, 40 taps): before the change the tab
never lit up ahead of the new screen (0 of 40); after it, the browser's own record shows a picture sent
for drawing between "tab lit" and "new screen in place" for 40 of 40 taps. All 101 tests pass (they do
not cover screen code). In the PC's preview browser every tab switch ended on the right screen with the
right tab lit, also after three quick taps; adding an expense and opening a pot and going back worked,
with no console errors.

**Not shown:** that the new screen arrives sooner. It does not look any faster in the timings, which vary
a lot from run to run. Not checked on a phone, including the light under the finger, so whether the
lag now feels better is unknown. The cause of the lag is still not established.

The preview browser first seemed to show a 0.7 second wait on every tap, also with the app's code
switched off. The preview was hidden, where a page draws slowly, so those timings do not count.

Offline version: `spaarpoes-918be91c8161`.

## 2026-11-26 - First phone test, and a look into slow tab changes (no app change)

The owner installed the app through Chrome on a phone and reports that everything worked, but changing
tabs sometimes lags. Which steps were done, and what the settings said about protected storage, was not
reported. No test on the app user's iPhone has been reported.

**Measured on the PC**, not on a phone: windowless Edge with a throwaway profile, processor slowed 4
times, phone-sized screen, example data, 8 rounds, from lifting the finger to the new screen being drawn.
Middle values: Vast 81 ms, Instellingen 79 ms, Thuis 121 ms, Cijfers 196 ms. Single visits took much
longer, mostly early in a run (up to 0.8 s for Cijfers). Timings vary a lot between runs.

- The app's own code was a small share of the processor time in a profile; most was the browser's own
  work. That profile was taken while leftover test processes were running (see below).
- **Tried and rejected:** drawing the lower parts of Cijfers only when scrolled to
  (`content-visibility`). Taking turns with the current version it made no difference: 193 against
  193 ms on repeat visits, 236 against 240 ms on a first visit.
- Removing the colour blending on the chart's tap areas showed no clear difference either, but that run
  was disturbed too.
- Found in the measuring tool itself: stopping Edge's first process left its other processes running,
  which disturbed the middle runs. They were closed, and the figures above are from a run without them.

**Result:** no cause of the phone's lag is established, so the app was not changed. Next: learn which
tab, and whether it happens on every visit or only the first one after opening.

## 2026-11-26 - Stage 6, part 2: published and checked from the PC

**Address:** https://pimcornelis.github.io/spaarpoes/ (read from GitHub's own publishing record for the
repo, state "success"; not guessed). GitHub Pages, branch `main`, folder root.

Checked against GitHub's public record and the live address:

- The repo is public. Its 62 files have the same contents as on the PC. `CLAUDE.local.md` is not in it,
  and asking for it at the web address answers "not found".
- The one commit carries GitHub's hidden (`noreply`) email address.
- All 42 files a phone needs are served, identical to the PC's, with fitting file types (the manifest as
  `application/manifest+json`).

Checked in Chrome on the PC: the offline copy installed with all 41 listed files; three test entries
were still there after a reload, and after closing the tab and opening a new one; the statistics page
drew, also for 6 months (not looked at before); no error was logged on a reload and no warning showed.

**Not checked yet:** the live app with the PC's network switched off (offline was checked with a local
web server switched off), and everything on the phones: installing, opening without a network, the
storage-protection answer, sharing a back-up, the reduced-motion setting, the chime, and a later version
replacing this one.

## 2026-11-26 - Stage 6, part 1: install files, offline, PC checks (not yet published)

The owner said to start stage 6, so the build goes on past the kitten; no verdict from the app's user is
recorded yet. The owner also approved two things: using Microsoft Edge to make the icons, and splitting
the rules file.

- `CLAUDE.md` no longer holds names, a description of the owner or folder paths. Those moved to
  `CLAUDE.local.md`, which `.gitignore` keeps out of the published repo (Claude Code loads it
  automatically: https://code.claude.com/docs/en/memory, read 2026-11-26). This replaces the build
  plan's "copy word for word". It also gained the notes on `sw.js` and the two kitten scripts. A search
  of every file that will be published found no names, paths or user names; the icons hold picture data
  only.
- Icons in `assets/icons/`, made by `docs/make-icons.mjs` with Edge without a window and with a
  throwaway profile: 180 px (iPhone), 192 and 512 px, and a 512 px "maskable" one with the head inside
  the middle 80% (https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons).
- `manifest.webmanifest`, `sw.js` and `.nojekyll` (GitHub then publishes the files as they are).
- `docs/stamp-sw.mjs` writes the offline file list and a version name made from the files' contents into
  `sw.js`. A test fails if an app file changed without it (tried once on purpose: it failed). Without a
  new version name a phone would keep the old app. A new version takes over only after the app has been
  closed completely. Old copies are removed only if their name starts with `spaarpoes-`, because other
  apps on the same web address have their own.
- In the browser (not installed) the example banner now says to put the app on the home screen before
  entering real amounts.
- `node --test`: **101 tests, 101 passed.**

PC checks, in the PC's built-in browser, served from this folder: the offline copy held all 41 files;
three entries were still there after a reload, and again after closing the tab and opening a new one.
Then the local web server was switched off (a request for a file outside the offline copy failed): the
app still opened with its look and kitten, a fourth entry was saved and survived a reload, and no
warning appeared.

**Not checked yet:** that Chrome or Safari offer to install it, the PC's network switched off at the
published address, whether a later version replaces an earlier one on a phone, and everything on the
phones.

**Gaps that stay open after build 1:** there is no home-screen widget. Whether the storage stays
protected can only be seen after a week of real use: re-check on the user's phone seven days after
installing.

## 2026-11-26 - Stage 5: the kitten, parties and the weekly card (stopped here for a verdict)

Added the kitten (`assets/kitten.svg` and `assets/kitten.css`: an original character with four moods),
the celebration, the optional chime, the weekly card, `js/core/weekly.js` and `js/core/mood.js` (tests
first), and `docs/kitten-preview.html`, built by `docs/make-kitten-preview.mjs` from the app's own
drawing, styles and colours. `node --test`: **94 tests, 94 passed.**

- Moods: a party shows in its own pop-up when it happens. Otherwise: below zero is "worried", else 3
  days without entering anything is "sleepy", else "content". Entries booked by a rule do not count as
  "entering something".
- The weekly card covers Monday to Sunday. It is marked as shown when it first appears, stays until
  "Gezien" is tapped or the app is closed, and is skipped for a week before the app was in use.
- With "Minder beweging", or the phone's own setting, the kitten changes pose without moving and the
  confetti lies still. Sound is off unless switched on. Nothing vibrates.
- Tidied: a rule of a put-away pot can no longer be opened for editing (the form would have pointed it
  at another pot).

Checked in the PC browser (served locally): all four moods, a party from a real entry, no movement with
the app's "less motion" class on, the weekly card appearing once, no console errors. For the weekly card
and the sleepy mood, dates in that test browser's saved data were changed by hand.

**Not checked:** the preview opened by double-click (checked through a local web server; the page needs no
other file), the phone's own reduced-motion setting, the chime (not listened to), and anything on a phone.

**Open before publishing (stage 6):** a search of the whole folder for personal details finds them only
in `CLAUDE.md`, which the build plan asked to copy word for word: names, a description of the owner, and
a Windows path with the user name. The repository will be public, so this needs a decision first.

## 2026-11-26 - Stage 4: statistics

Added `js/ui/charts.js` (columns, horizontal bars and a line, drawn as SVG by hand) and the page
"Cijfers": spend per pot per month, balance over time, money in against spend, recurring costs per month
and per year, and spend per weekday, for 1, 3, 6 or 12 months. Tapping a bar or point lists the bookings
behind it; every chart states its unit and has a table. `node --test`: **87 tests, 87 passed.**

Spend per pot is one small chart per pot on a shared scale (a single month: one bar per pot), so no
chart depends on telling many pastel colours apart. The two colours in "Binnen en uit" passed a
colour-blindness and contrast check.

Looked at in the PC browser at phone size (375 px): all five charts, the 1, 3 and 12 month ranges, one
tapped bar, one table; nothing wider than the screen; no console errors. The 6 month range was not
looked at separately.

## 2026-11-26 - Stage 3: the screens

Added `index.html`, `styles.css`, `js/theme.js` (all colours and fonts), `js/text/nl.js` (all Dutch
text), `js/core/sample.js` (invented example pots) and the screens in `js/ui/`: Home, Add, Pot detail,
Move money, Recurring, Settings, New pot. `node --test`: **87 tests, 87 passed.**

Clicked through in the PC's built-in browser at phone size, served from this folder: adding a spend and
an extra, reload (balances unchanged), moving money, skipping a recurring entry, a new rule with a past
start (asked first), a bad back-up file (refused with the reason), an empty amount (refused), clearing
the example data, making a pot. No errors in the browser console. This is not a phone check; the phone
checks are stage 6.

Added beyond the screen list, because the app cannot work without them:

- Making, renaming and putting away a pot (after clearing the example data there would be no way to
  create pots otherwise).
- Deleting a booking, with a question first, to undo typing mistakes.
- "Toch wel doen" to take back a skip, and an "Alles" button in Move money.

The page carries a rule (Content-Security-Policy) that stops the app loading or sending anything outside
its own files.

## 2026-11-26 - Stage 2: the store (saving the data)

`js/store.js` added; its tests were written first and failed because the file did not exist.
`node --test`: **82 tests, 82 passed.**

**Not tested here:** the phone's own database (IndexedDB) does not exist under Node. The tests use an
in-memory stand-in, so they cover the store's logic only. IndexedDB is checked on the real phones in
stage 6. The same holds for the answer to the storage-protection call.

How it works and why:

- The whole state is saved as one record, so a change is saved completely or not at all. It counts as
  done only after the database confirms the write (asked with durability "strict").
- Before every write the new state is checked with the same rules as an import, so nothing is saved
  that could not be read back. Damaged saved data stops the app with an error and is left untouched.
- A second open window cannot silently overwrite the first one: the write is refused.
- Recurring entries are booked at every opening, also when the app comes back from the background
  (an iPhone home-screen app is often paused rather than restarted).
- Storage protection (`persist()`) is asked only in the installed app, at each opening until the phone
  says yes.
- **Differs from the plan:** the back-up file is called `spaarpoes-backup-<date>.json.txt`. The content
  is the JSON file the plan asks for. Chrome on Android refuses to share a file ending in `.json`
  (Chromium's list of shareable types, source [M] under stage 0), and one way of backing up has to
  work on both phones.

## 2026-11-26 - Stage 1: the core logic, tests first

Wrote the tests, ran them (all 6 test files failed: the code did not exist yet), then wrote the code.
`node --test`: **68 tests, 68 passed, 0 failed.** The empty proof test was removed.

`js/core/` (no screen code, no browser calls): `alerts.js`, `backup.js`, `dates.js`, `errors.js`,
`ledger.js`, `model.js`, `money.js`, `rules.js`, `stats.js`.

Choices made where the build plan did not say:

- A recurring allocation is booked even when the free pot is short. The free pot then goes below zero
  and shows under "Let op". Nothing is silently skipped.
- Deleting one side of a linked pair deletes both. A deleted rule-made entry does not come back.
- A monthly rule whose day has already passed in its start month begins the month after. Weekly rules
  count in whole weeks from the start date. A yearly rule on 29 February uses 28 February otherwise.
- A new rule with a start date in the past books those past dates too (the screen asks first).
- "Not used for N months" counts from the last spend, or from the first entry for a pot never spent
  from. The free pot never gets this hint.
- "Recurring costs" in the statistics are the running recurring spends. A weekly cost counts 52 times
  a year.
- A pot can only be put away when it is empty and no running rule points at it.
- Choosing a party amount that is already reached is not a party.
- The CSV file uses `;` and a decimal comma (Dutch spreadsheet), and text that a spreadsheet would run
  as a formula gets a `'` in front.
- Import is strict: unknown fields, broken pairs or a wrong version are refused with a reason.

## 2026-11-26 - Stage 0: set-up

Created the repo folders, `CLAUDE.md` (copied from the build plan by script and compared: identical),
`.gitignore` (also keeps back-up and export files out of this public repo) and `.gitattributes`.
Added `package.json` with no dependencies: it only tells Node that the `.js` files are modern modules,
the same kind the browser loads.

Node: `v24.18.0`. `node --test` on one empty test: 1 passed, 0 failed.

### What an iPhone home-screen web app needs (ten lines)

All pages read on 2026-11-26 through Exa, which returns a stored copy, not confirmed live. Nothing here
is tested on a phone yet.

1. Manifest (`manifest.webmanifest`, linked from the page): `name`, `short_name`, `start_url`, `scope`, `display: standalone`, `icons`, colours. Android Chrome requires a name, 192 and 512 px icons, `start_url`, `display`, and no `prefer_related_applications` [A][B].
2. iOS 26 and later: every site added to the Home Screen opens as an app by default ("Open as Web App" switch on); Safari has no install requirements, but a manifest still sets name, icons and start address [C].
3. Icons: an `apple-touch-icon` link wins over the manifest icons [D]; iPhone size 180x180 px, PNG [E]; opaque and square without rounded corners (secondary source [F]).
4. HTTPS is required (or `localhost` on the PC) for installing, the service worker, the storage call and sharing [A][G][H].
5. Service worker (`sw.js`): on install it stores the app's own files in a named cache (all or nothing), on activate it deletes old caches; a new version waits until the old one is closed, so every change needs a new cache name [G][I].
6. Storage call: `navigator.storage.persist()` answers true or false; WebKit decides by rules of its own, such as "opened as a Home Screen web app"; data can be deleted under storage pressure, over quota or after long disuse unless persistent [H][J].
7. The Home Screen app keeps its own data, apart from Safari (secondary source [F]): install first, then enter real data.
8. Number entry: `inputmode="decimal"` shows digits with a comma or a dot depending on the phone's region; there may be no minus key, so the app accepts both separators and never asks for a minus [K].
9. Sharing a file: `navigator.share()` must follow a tap and `canShare()` is checked first [L]. Chrome only shares listed file types: `.txt` and `.csv` are on the list, `.json` is not [M].
10. Reduced motion: the CSS rule `prefers-reduced-motion: reduce` follows the phone's setting (iPhone: Settings, Accessibility, Motion) [N].

- [A] https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- [B] https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest
- [C] https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ (only the web-app section, as a search extract)
- [D] https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- [E] https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html (archived Apple guide)
- [F] https://progressivewebapps.com/platforms/ios-safari/ (not Apple or MDN; first part of the page read)
- [G] https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
- [H] https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist
- [I] https://developer.mozilla.org/en-US/docs/Web/API/Cache
- [J] https://webkit.org/blog/14403/updates-to-storage-policy/
- [K] https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode
- [L] https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
- [M] https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/webshare/FILE_TYPES.md
- [N] https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion

Also read for the saved-data code: https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/transaction

### Folder listing after set-up

```
.gitattributes
.gitignore
CLAUDE.md
package.json
assets/
docs/            CHANGELOG.md
js/core/
js/text/
js/ui/
tests/           runner.test.js (the empty proof test; removed in stage 1)
```
