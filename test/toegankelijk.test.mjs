// Wat een schermlezer van de app kan maken.
//
// De twee grote gaten zitten elders vastgelegd: de omroep (omroep.test.mjs) en
// de focus die een hertekening overleeft (focus.test.mjs). Dit bestand gaat
// over wat er dáárnaast nog stuk kan, en het loopt de schermen af in plaats
// van losse gevallen te noemen -- zo groeit het mee met een scherm dat er
// later bij komt.
//
// Wat hier vastligt, per scherm:
//   1. Elke knop heeft een naam. Zonder naam zegt een schermlezer "knop", en
//      dan weet je wel dát er iets is maar niet wát.
//   2. Elk invoerveld heeft een label. Een <span class="label"> erboven ziet
//      eruit als een label maar is het niet: hij moet met for= aan het veld
//      hangen. Het poulecodeveld -- het eerste wat iedereen aanraakt -- was
//      er zo eentje.
//   3. Elk scherm heeft een h1 en slaat geen koppenniveau over. Het
//      racesscherm had alleen een h2 terwijl stand, poule en profiel er alle
//      drie een h1 hadden.
//   4. Elke afbeelding heeft een alt.
//   5. De pagina zegt in welke taal hij staat.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('toegankelijkheid per scherm');
const { page, jsFouten, stoppen } = await startPagina();

const meet = () => page.evaluate(() => {
  const app = document.getElementById('app');
  const naam = (el) =>
    (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim();
  const beschrijf = (e) =>
    `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}`
    + `${e.className ? '.' + String(e.className).split(' ')[0] : ''}`;
  return {
    naamloos: [...app.querySelectorAll('button, a[href], [role="button"]')]
      .filter(e => !naam(e) && !e.querySelector('img[alt]:not([alt=""])'))
      .map(beschrijf),
    ongelabeld: [...app.querySelectorAll('input, select, textarea')]
      .filter(e => !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby')
        && !(e.id && app.querySelector(`label[for="${e.id}"]`))
        && !e.closest('label'))
      .map(beschrijf),
    zonderAlt: [...app.querySelectorAll('img')]
      .filter(e => !e.hasAttribute('alt')).map(beschrijf),
    koppen: [...app.querySelectorAll('h1,h2,h3,h4')].map(e => +e.tagName[1]),
  };
});

async function keur(waar) {
  const m = await meet();
  check(`${waar}: elke knop heeft een naam`,
    m.naamloos.length === 0, m.naamloos.join(', '));
  check(`${waar}: elk invoerveld heeft een label`,
    m.ongelabeld.length === 0, m.ongelabeld.join(', '));
  check(`${waar}: elke afbeelding heeft een alt`,
    m.zonderAlt.length === 0, m.zonderAlt.join(', '));
  check(`${waar}: er is een h1 en er wordt geen niveau overgeslagen`,
    m.koppen.length > 0 && m.koppen[0] === 1
      && !m.koppen.some((n, i, a) => i > 0 && n - a[i - 1] > 1),
    m.koppen.join(' ') || '(geen koppen)');
}

await keur('beginscherm');

check('de pagina zegt in welke taal hij staat',
  (await page.getAttribute('html', 'lang')) === 'nl',
  String(await page.getAttribute('html', 'lang')));

await meedoen(page);
await keur('races');

await page.click('[data-race]');
await page.waitForSelector('#paneel');
await keur('racescherm');

for (const w of ['stand', 'poule', 'profiel']) {
  await page.click(`[data-weergave="${w}"]`);
  await page.waitForSelector('[data-weergave]');
  await keur(w);
}

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
