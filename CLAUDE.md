# Spaarpoes - rules for Claude in this repo

Spaarpoes ("saving kitten") is a budget app: an installable web app for a phone. Its user tracks the
heap of money that moves to their own bank account: budgets ("potjes"), transactions, recurring
entries, a statistics page and a pastel kitten. The real money never passes through it. This repo is
public. Names, folder paths and where the decisions are recorded are in `CLAUDE.local.md`, which stays
on the owner's PC and is never published.

## Who you work with
The owner does not debug code. Deliver working changes, explain in plain English, explain any jargon
the first time, and always say how to check that it worked. The app's users read Dutch: every screen
text is Dutch.

## Hard rules
- **No git writes.** Never commit, push, branch or reset. The owner commits in GitHub Desktop. After
  changing files, say there is something to commit. No commit messages.
- **No third-party code.** The app uses plain HTML, CSS and JavaScript only: no framework, no bundler, no
  npm package, no CDN, no web font loaded from the internet. A tool you think you need is named to the
  owner and waits for vetting (the protocol named in `CLAUDE.local.md`) and their yes.
- **No personal or financial data in this repo, ever.** Example data uses invented names and amounts.
  The user's real budgets live only on their phone. No analytics, no tracking, no network request at
  runtime except loading the app's own files.
- **No secrets in this repo.**
- **One correct path, no fallbacks.** If something fails, show the error and stop; do not add a second
  way of doing the same thing.
- **Never spend money.** Free tools only.
- **Verify before claiming.** List a directory before saying a file exists; run the tests before saying
  they pass; check on a phone before saying it installs. Fetch platform documentation now, not from memory.
- **The kitten is an original character.** Never draw or imitate an existing character or mascot.
- **Say when to stop.** At a decision only the owner or the app's user can make, stop and ask.

## How the code is laid out
- `index.html`, `manifest.webmanifest`, `sw.js` - the installable shell and the offline cache.
- `js/core/` - the logic: money in whole cents, budgets, the ledger, recurring rules, Move money,
  statistics queries, export and import. No screen code, no browser calls: it must run under Node
  unchanged, so it can be reused if the app is ever rebuilt natively.
- `js/store.js` - the only module that reads and writes saved data (IndexedDB behind a small adapter).
- `js/ui/` - screens and the SVG chart helpers.
- `js/theme.js` - the only place colours and fonts are defined (the pastel skin). The manifest repeats
  the page colour, and a test checks that the two match.
- `js/text/nl.js` - the only place Dutch screen text is written.
- `assets/` - the kitten, drawn as SVG, and the phone icons made from it.
- `tests/` - Node's built-in test runner (`node --test`).
- `docs/CHANGELOG.md` - every change, with the reason, newest first.
- `sw.js` lists the app's files for offline use. After changing any app file, run
  `node docs/stamp-sw.mjs`. `node --test` fails when that was forgotten; without it, phones keep the old
  version.
- After changing the kitten, also run `node docs/make-kitten-preview.mjs` and `node docs/make-icons.mjs`.
