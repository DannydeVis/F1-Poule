// De datapagina "Hoe voorspelbaar was F1 in 2026?" als concept (19 november,
// zoekplan GEO 3.1).
//
// De pagina staat klaar maar niet online: hij gaat pas aan na de finale, als
// de laatste race erin zit en drie races met de hand zijn nagelopen. Wat hier
// vastligt:
//   1. Zolang STATISTIEK_LIVE uit staat, is er geen pagina, geen CSV en geen
//      regel in de sitemap of llms.txt.
//   2. Elk getal op de pagina komt uit de data: de gemiddelden, het maximum,
//      het aantal races, de voorspelbaarste race en de poleman. De zin met de
//      uitkomst noemt het jaar en de bron.
//   3. Nederlands en Engels, met de link naar de CSV goed vanuit elke map, en
//      zonder streepjes, emoji of {plekhouders}.
//   4. Zonder data, of zonder gemiddelde, geen pagina.
//   5. Aangezet (PTR_CONCEPT=1, in een kopie van de repo): de generator maakt
//      de twee pagina's en de CSV, zet ze in de sitemap en in llms.txt onder
//      Data, met een Dataset in de JSON-LD die naar de CSV wijst; op 360
//      pixels past alles zonder horizontale scroll.

import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync, execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { maakControle, wortel } from './hulp.mjs';
import { STATISTIEK_LIVE, STATISTIEKPAGINAS, CSV_PAD, statistiekPagina } from '../scripts/statistiekpagina.mjs';
import { voorspelbaarheid } from '../scripts/statistiek.mjs';

const { check, afronden } = maakControle('de datapagina, als concept');

// ---- 1. nog niet online ----------------------------------------------------------------
check('STATISTIEK_LIVE staat uit, en dan is er geen pagina', STATISTIEK_LIVE === false && STATISTIEKPAGINAS.length === 0);
check('geen CSV, en niets in de sitemap of llms.txt',
  !existsSync(join(wortel, CSV_PAD)) && !readFileSync(join(wortel, 'sitemap.xml'), 'utf8').includes('voorspelbaar')
    && !readFileSync(join(wortel, 'llms.txt'), 'utf8').includes('predictable-was'));

// ---- 2 tot en met 4. de pagina uit de data ------------------------------------------------
const d = Array.from({ length: 20 }, (_, i) => String(i + 1));
const schud = (zaad) => {
  const a = [...d]; let z = zaad;
  for (let i = a.length - 1; i > 0; i--) { z = (z * 16807) % 2147483647; const j = z % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const NAMEN = ['Melbourne', 'Shanghai', 'Suzuka', 'Sakhir', 'Miami Gardens', 'Spa-Francorchamps', 'Monza', 'São Paulo'];
const RIJEN = NAMEN.map((name, i) => ({ season: 2026, round: i + 1, name, afgelast: name === 'Sakhir',
  deadline_race: `2026-0${3 + Math.floor(i / 3)}-1${i}T05:00:00Z`, drivers: d,
  quali_result: name === 'Sakhir' ? null : schud(i + 11), race_result: name === 'Sakhir' ? null : i === 2 ? schud(13) : schud(i + 31) }));
const DATA = voorspelbaarheid(RIJEN, Object.fromEntries(d.map((n) => [n, { naam: `Coureur NUMMER${n}`, team: 'Team' }])));
const pg = statistiekPagina(DATA);
const tekst = (t) => JSON.stringify(t);
{
  const nl = pg.talen.nl; const en = pg.talen.en;
  const g = (s, code) => new Intl.NumberFormat(code, { maximumFractionDigits: 1 }).format(DATA.gemiddeld[s].gemiddeld);
  check('Nederlands en Engels, met hun eigen pad', nl.pad === 'f1-2026-voorspelbaarheid' && en.pad === 'en/how-predictable-was-f1-2026'
    && pg.soort === 'data');
  check('de zin met de uitkomst: de gemiddelden, het maximum, het aantal races, het jaar en de bron',
    nl.kort.includes(`gemiddeld ${g('kwalificatie', 'nl')} van de 50 punten`) && nl.kort.includes(`${DATA.gereden} races`)
      && nl.kort.includes('2026') && nl.kort.includes('Predict the Race, op basis van OpenF1')
      && nl.kort.includes(g('willekeurig', 'nl')) && en.kort.includes(`${g('kwalificatie', 'en')} of 50 points`), nl.kort);
  check('de voorspelbaarste race en de poleman komen uit de data',
    tekst(nl).includes(`${DATA.best[0].naam}: de kwalificatie leverde daar ${DATA.best[0].punten} van de 50`)
      && tekst(nl).includes(`${DATA.pole.gewonnen} van de ${DATA.pole.races} races`), DATA.best[0].naam);
  const perRace = nl.secties.find((s) => s.id === 'per-race').tabel;
  check('per race een regel, de afgelaste niet', perRace.rijen.length === DATA.gereden && !perRace.rijen.some((r) => r[0] === 'Sakhir')
    && perRace.rijen[0][2] === '-' && perRace.rijen[0][3] === '-', JSON.stringify(perRace.rijen[0]));
  check('de afgelaste race staat bij de beperkingen', tekst(nl).includes('(Sakhir)') && tekst(en).includes('(Sakhir)'));
  check('de link naar de CSV klopt vanuit elke map',
    nl.secties.at(-1).knop.href === `../${CSV_PAD}` && en.secties.at(-1).knop.href === `../../${CSV_PAD}`);
  check('geen streepjes, emoji of plekhouders', !/[–—]|\p{Extended_Pictographic}|\{[a-zA-Z]+\}/u.test(tekst(pg.talen)),
    (tekst(pg.talen).match(/.{0,20}([–—]|\{[a-zA-Z]+\}).{0,20}/u) ?? [''])[0]);
  check('de CSV hoort bij de pagina', pg.csv.pad === CSV_PAD && pg.csv.inhoud.split('\n').length === DATA.gereden + 2);
}
check('zonder data geen pagina', statistiekPagina(null) === null && statistiekPagina({ races: [] }) === null
  && statistiekPagina({ ...DATA, gemiddeld: { ...DATA.gemiddeld, willekeurig: null } }) === null);

// ---- 5. aangezet, in een kopie ------------------------------------------------------------
const kopie = mkdtempSync(join(tmpdir(), 'statistiekpagina-'));
execSync(`tar --exclude=./node_modules --exclude=./.git -cf - . | (cd "${kopie}" && tar xf -)`, { cwd: wortel, shell: '/bin/bash' });
symlinkSync(join(wortel, 'node_modules'), join(kopie, 'node_modules'));
writeFileSync(join(kopie, 'site', 'data', 'statistiek-2026.json'), JSON.stringify(DATA));
const maak = spawnSync('node', [join(kopie, 'scripts', 'maak-site.mjs')], { env: { ...process.env, PTR_CONCEPT: '1' }, encoding: 'utf8' });
check('aangezet maakt de generator de twee pagina\'s en de CSV', maak.status === 0
  && existsSync(join(kopie, 'f1-2026-voorspelbaarheid', 'index.html')) && existsSync(join(kopie, 'en', 'how-predictable-was-f1-2026', 'index.html'))
  && readFileSync(join(kopie, CSV_PAD), 'utf8') === pg.csv.inhoud, maak.stderr.slice(0, 300));
check('en zet ze in de sitemap en in llms.txt, onder Data',
  readFileSync(join(kopie, 'sitemap.xml'), 'utf8').includes('/f1-2026-voorspelbaarheid/')
    && /## Data\n[\s\S]*how-predictable-was-f1-2026/.test(readFileSync(join(kopie, 'llms.txt'), 'utf8')));
{
  const html = readFileSync(join(kopie, 'en', 'how-predictable-was-f1-2026', 'index.html'), 'utf8');
  const graaf = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1].replace(/<\\\//g, '</'))['@graph'];
  const set = graaf.find((x) => x['@type'] === 'Dataset');
  check('met een Dataset in de JSON-LD die naar de CSV wijst, voor 2026',
    set?.distribution?.[0]?.contentUrl?.endsWith(`/${CSV_PAD}`) && set.distribution[0].encodingFormat === 'text/csv'
      && set.temporalCoverage === '2026' && set.variableMeasured.some((v) => v.name === 'The qualifying result'), JSON.stringify(set)?.slice(0, 300));
}
{
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 360, height: 760 } });
  const breed = [];
  for (const pad of ['f1-2026-voorspelbaarheid', 'en/how-predictable-was-f1-2026']) {
    await page.goto(`file://${join(kopie, pad, 'index.html')}`);
    breed.push(await page.evaluate(() => Math.max(document.documentElement.scrollWidth,
      ...[...document.querySelectorAll('table')].map((t) => Math.ceil(t.getBoundingClientRect().right)))));
  }
  check('op 360 pixels past alles, ook de tabel per race', breed.every((b) => b <= 360), breed.join(', '));
  await browser.close();
}
rmSync(kopie, { recursive: true, force: true });

process.exit(afronden() ? 0 : 1);
