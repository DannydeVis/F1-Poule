// OpenF1 met zijn licentie (1 november).
//
// De kalender, de deelnemers en de uitslagen komen van OpenF1, en die data valt
// onder CC BY-NC-SA 4.0: gratis voor niet-commercieel gebruik, met de bron en
// de licentie erbij, en wat je eruit afleidt onder dezelfde licentie. Danny
// liet het besluit over betalen aan Claude ("bepaal maar"); het staat in
// BEDIENING §10 en ROUTEKAART (Premium, stap 2).
//
// Wat hier vastligt:
//   1. Elke pagina van de site (de voorpagina's, de gidsen, de racepagina's,
//      de over-pagina's en de privacyverklaring) noemt in de voet OpenF1 met
//      een link, en de licentie met een link (rel="license").
//   2. llms.txt noemt de licentie, ook voor de racecijfers die de site
//      afleidt. De README zegt dat de racegegevens en wat eruit afgeleid is
//      onder die licentie vallen, niet onder "alle rechten voorbehouden".
//   3. Het besluit staat in BEDIENING en ROUTEKAART: betalen pas met
//      schriftelijke toestemming van OpenF1, de aanvraagtekst klaar, en geen
//      overstap naar een bron met dezelfde licentie.
//   4. De app noemt onder Profiel, bij "over Predict the Race", OpenF1 en de
//      licentie, met links die in een nieuw venster openen. In de browser in
//      vier talen; test/talen.test.mjs houdt de andere vertalingen heel.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { maakControle, startPagina, naDeClaim, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('OpenF1 met zijn licentie');
const lees = (pad) => readFileSync(join(wortel, pad), 'utf8');
const LICENTIE = 'https://creativecommons.org/licenses/by-nc-sa/4.0/';

// ---- 1. de voet van elke pagina -------------------------------------------------
{
  // Alle pagina's van de site: elke index.html buiten de app en het beheer.
  const paginas = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: wortel, encoding: 'utf8' })
    .split('\n').filter((f) => /(^|\/)index\.html$/.test(f) && !f.startsWith('app/') && !f.startsWith('beheer/')
      && !f.startsWith('node_modules/') && !f.startsWith('test/'));
  const voet = (html) => html.match(/<footer class="voet">[\s\S]*?<\/footer>/)?.[0] ?? '';
  const zonder = paginas.filter((f) => {
    const v = voet(lees(f));
    return !/<a href="https:\/\/openf1\.org"[^>]*>[^<]*OpenF1[^<]*<\/a>/.test(v)
      || !v.includes(`<a href="${LICENTIE}" rel="license noopener">CC BY-NC-SA 4.0</a>`);
  });
  const soorten = ['index.html', 'en/index.html', 'pt/index.html', 'over/index.html', 'en/about/index.html',
    'privacy/index.html', 'en/privacy/index.html', 'races/2026/mexico-city/index.html', 'f1-poule-puntentelling/index.html',
    'en/f1-prediction-games-compared/index.html'];
  check(`elke pagina van de site noemt in de voet OpenF1 en de licentie, met links (${paginas.length} pagina's)`,
    paginas.length > 60 && soorten.every((f) => paginas.includes(f)) && zonder.length === 0,
    zonder.slice(0, 5).join(' ') || `${paginas.length} pagina's`);
  // De racecijfers zelf: het bijschrift noemt de bron nog steeds.
  const race = lees('races/2026/mexico-city/index.html');
  check('de racepagina zegt bij de cijfers dat ze van OpenF1 komen', /\(bron: OpenF1\)/.test(race));
}

// ---- 2. llms.txt en de README -----------------------------------------------------
{
  const llms = lees('llms.txt');
  check('llms.txt noemt de licentie van OpenF1, ook voor de afgeleide racecijfers',
    new RegExp(`^- Data license: the OpenF1 data is licensed CC BY-NC-SA 4\\.0 \\(${LICENTIE.replace(/[./]/g, '\\$&')}\\); `
      + 'the race statistics on this site are derived from it and fall under the same license$', 'm').test(llms),
    llms.match(/^- Data license:.*$/m)?.[0] ?? '(geen regel)');
  const readme = lees('README.md');
  check('de README zegt dat de racegegevens van OpenF1 onder CC BY-NC-SA 4.0 vallen, ook wat eruit afgeleid is',
    /de racegegevens[\s\S]{0,200}\[OpenF1\]\(https:\/\/openf1\.org\)[\s\S]{0,80}\[CC BY-NC-SA 4\.0\]\(https:\/\/creativecommons\.org\/licenses\/by-nc-sa\/4\.0\/\)[\s\S]{0,200}site\/data`\)\s+valt onder dezelfde licentie/.test(readme));
}

// ---- 3. het besluit ------------------------------------------------------------------
{
  const bediening = lees('BEDIENING.md');
  const routekaart = lees('ROUTEKAART.md');
  check('BEDIENING: betalen pas met schriftelijke toestemming, de aanvraag via openf1.org/contact met de tekst erbij',
    bediening.includes('Betalen gaat pas aan met schriftelijke toestemming van OpenF1')
      && bediening.includes('openf1.org/contact') && /> Hello, I make Predict the Race/.test(bediening)
      && bediening.includes('Jolpica'));
  check('ROUTEKAART, Premium stap 2: hetzelfde besluit',
    routekaart.includes('betalen gaat pas aan met') && routekaart.includes('schriftelijke toestemming van OpenF1')
      && routekaart.includes('openf1.org/contact'));
}

// ---- 4. de app -----------------------------------------------------------------------
const VERWACHT = {
  nl: 'De kalender en de uitslagen komen van OpenF1, onder de licentie CC BY-NC-SA 4.0.',
  en: 'The calendar and the results come from OpenF1, under the CC BY-NC-SA 4.0 licence.',
  de: 'Kalender und Ergebnisse kommen von OpenF1, unter der Lizenz CC BY-NC-SA 4.0.',
  pt: 'O calendário e os resultados vêm do OpenF1, sob a licença CC BY-NC-SA 4.0.',
};
for (const taal of Object.keys(VERWACHT)) {
  const { page, jsFouten, stoppen } = await startPagina(taal === 'nl' ? {} : { taal });
  await page.waitForSelector('#code');
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
  await page.waitForSelector('[data-lid]');
  await page.click('[data-lid]:has(.nm:text-is("Danny"))');
  await naDeClaim(page);
  await page.click('[data-weergave="profiel"]');
  await page.waitForSelector('[data-bron]');
  const bron = await page.$eval('[data-bron]', (p) => ({
    tekst: p.textContent.replace(/\s+/g, ' ').trim(),
    links: [...p.querySelectorAll('a')].map((a) => [a.getAttribute('href'), a.getAttribute('rel'), a.getAttribute('target')]),
    naVoorpagina: !!p.previousElementSibling?.matches('#voorpagina'),
  }));
  check(`app ${taal}: onder Profiel, bij "over Predict the Race", de bron en de licentie`,
    bron.tekst === VERWACHT[taal] && bron.naVoorpagina, JSON.stringify(bron));
  check(`app ${taal}: met een link naar OpenF1 en naar de licentie, in een nieuw venster`,
    JSON.stringify(bron.links) === JSON.stringify([['https://openf1.org', 'noopener', '_blank'],
      [LICENTIE, 'license noopener', '_blank']]), JSON.stringify(bron.links));
  check(`app ${taal}: geen javascriptfouten`, jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
