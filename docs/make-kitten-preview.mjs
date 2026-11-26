// Makes docs/kitten-preview.html: one page that opens with a double-click and shows every mood of the
// kitten. It is built from the app's own drawing, styles and colours, so it shows what the app shows.
// Run again after changing the kitten:  node docs/make-kitten-preview.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { themeVariables } from '../js/theme.js';
import { MOODS } from '../js/core/mood.js';
import { confettiPieces } from '../js/ui/confetti.js';
import { t } from '../js/text/nl.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

const drawing = read('../assets/kitten.svg').replace(/<!--[\s\S]*?-->\s*/, '').trim();
const kittenCss = read('../assets/kitten.css');
const appCss = read('../styles.css');

const kitten = (mood) => drawing
  .replace('data-state="content"', `data-state="${mood}"`)
  .replace('role="img"', `role="img" aria-label="${t.kitten.looks[mood]}"`);

const names = { content: 'Tevreden', party: 'Feest', sleepy: 'Slaperig', worried: 'Bezorgd' };
const when = {
  content: 'Gewoon, als alles goed gaat.',
  party: 'Als een potje het feestbedrag haalt.',
  sleepy: 'Na 3 dagen zonder iets in te voeren.',
  worried: 'Als een potje onder nul staat.',
};

const confetti = confettiPieces()
  .map((piece) => `<i style="${Object.entries(piece).map(([name, value]) => `${name}:${value}`).join(';')}"></i>`)
  .join('');

const variables = themeVariables().map(([name, value]) => `  ${name}: ${value};`).join('\n');

const page = `<!doctype html>
<!-- Made by docs/make-kitten-preview.mjs. Do not edit by hand. -->
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Spaarpoes - de poes bekijken</title>
<style>
:root {
${variables}
}
${appCss}
${kittenCss}
.preview { max-width: 46rem; margin: 0 auto; padding: 1.5rem 1rem 3rem; display: flex; flex-direction: column; gap: 1rem; }
.moods { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 1rem; }
.moods figure { margin: 0; text-align: center; }
.moods .big { width: 14rem; max-width: 100%; margin: 0 auto; }
.small-row { display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: flex-end; justify-content: center; }
</style>
</head>
<body>
<main class="preview">
  <h1>De spaarpoes</h1>
  <p>Vier stemmingen. Met de knop speel je het feestje af.</p>
  <button type="button" class="button wide" id="play">Speel het feestje</button>
  <label class="toggle card"><span>${t.settings.reduceMotion} (zo ziet het eruit zonder beweging)</span><input type="checkbox" id="still"></label>
  <div class="moods">
${MOODS.map((mood) => `    <figure class="card">
      <div class="big">${kitten(mood)}</div>
      <figcaption><h2>${names[mood]}</h2><p class="hint">${when[mood]}</p></figcaption>
    </figure>`).join('\n')}
  </div>
  <section class="card">
    <h2>Zo groot staat ze op het beginscherm</h2>
    <div class="small-row">
      <div class="kitten-row"><div class="kitten-home">${kitten('content')}</div><p class="speech">${t.kitten.says.content}</p></div>
    </div>
  </section>
</main>
<dialog class="party" id="party">
  <div class="confetti" aria-hidden="true">${confetti}</div>
  <div class="party-content">
    <h2>${t.party.title}</h2>
    <div class="party-kitten">${kitten('party')}</div>
    <p class="party-label">${t.sample.partyBooks}</p>
    <p>${t.party.reached(`📚 ${t.sample.pots.books}`, '€ 60,00')}</p>
    <button type="button" class="button wide" id="close">${t.party.close}</button>
  </div>
</dialog>
<script>
  const party = document.getElementById('party');
  document.getElementById('play').addEventListener('click', () => party.showModal());
  document.getElementById('close').addEventListener('click', () => party.close());
  document.getElementById('still').addEventListener('change', (event) => {
    document.documentElement.classList.toggle('reduce-motion', event.target.checked);
  });
</script>
</body>
</html>
`;

writeFileSync(new URL('./kitten-preview.html', import.meta.url), page);
console.log('docs/kitten-preview.html written');
