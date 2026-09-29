// De vergelijkingspagina: Predict the Race naast andere F1-poule-apps.
//
// Zoekplan SEO fase 2, AEO 3.2 en GEO fase 4. Een vergelijking door de maker
// van een van de apps is alleen geloofwaardig als hij dat zegt, als elk feit
// over een ander op diens eigen site staat, en als de zwakke punten van
// Predict the Race er ook in staan. Draait zonder browser; de browserkeuring
// (contrast, 360 pixels, links) doet test/site.test.mjs voor elke pagina.
//
// Wat hier vastligt, in het Nederlands en het Engels:
//   1. De pagina staat op het pad uit het zoekplan, en direct onder de h1 staat
//      dat de maker van Predict the Race hem schreef.
//   2. De datum van de controle staat zichtbaar op de pagina, in het bijschrift
//      van de tabel en in de tekst eronder.
//   3. De tabel noemt de apps uit het zoekplan, elk met een link naar de eigen
//      site van die app. F1 Predict is het officiële spel van de Formule 1
//      (f1predict.formula1.com), geen losse app uit een store. De spreadsheet
//      linkt naar de eigen gids.
//   4. Op een smal scherm wordt elke rij een blok: elke cel draagt de naam van
//      haar kolom.
//   5. Een andere app die in de tekst genoemd wordt, staat ook in de tabel, met
//      zijn link: geen bewering over een ander zonder bron erbij.
//   6. De zwakke punten van Predict the Race: geen prijzen, geen app in de
//      stores, de app alleen in de talen die hij echt heeft (uit
//      app/index.html), en een jong project (sinds LLMS.online).
//   7. "Podium Prophets telt een top 10 standaard net zo" klopt alleen zolang
//      de app ook 5, 3 en 1 geeft (scoreLijst() in app/index.html).
//   8. Is de controle langer dan drie maanden geleden, dan waarschuwt
//      scripts/maak-site.mjs, maar het maken slaagt: een test die op datum
//      zakt, blokkeert elke andere merge. Met een vaste datum getest.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { maakControle, wortel } from './hulp.mjs';
import { LLMS } from '../site/teksten.mjs';
import { PAGINAS } from '../site/paginas.mjs';

const { check, afronden } = maakControle('de vergelijkingspagina');

const pg = PAGINAS.find((x) => x.id === 'vergelijking');
check('de vergelijking staat in site/paginas.mjs, als soort vergelijking', pg?.soort === 'vergelijking', pg?.soort);
if (!pg) process.exit(afronden() ? 0 : 1);

const ontdoe = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, '\'')
  .replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const datumTekst = (code, iso) => new Intl.DateTimeFormat(code, {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

// De eigen site van elke andere app. Een link naar een andere plek (een
// lijstje, een store, een app met dezelfde naam) telt niet als bron.
const EIGEN_SITE = {
  'F1 Predict': 'f1predict.formula1.com',
  'F1 Fantasy': 'fantasy.formula1.com',
  'GP Poule': 'gppoule.nl',
  'poules.com': 'poules.com',
  Superbru: 'superbru.com',
  GridRival: 'gridrival.com',
  Kicktipp: 'kicktipp.de',
  'Podium Prophets': 'podiumprophets.com',
};
const vanDomein = (url, domein) => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === domein || u.hostname.endsWith(`.${domein}`));
  } catch { return false; }
};
// Het zoekplan (SEO fase 2), plus F1 Predict, waar een eigen vraag over gaat.
const VERWACHT = {
  nl: ['F1 Predict', 'F1 Fantasy', 'poules.com', 'GP Poule', 'Superbru'],
  en: ['F1 Predict', 'F1 Fantasy', 'Superbru', 'GridRival', 'Kicktipp', 'Podium Prophets'],
};
const PAD = { nl: 'f1-poule-apps-vergeleken', en: 'en/f1-prediction-games-compared' };
const OPENHEID = {
  nl: 'Deze vergelijking is geschreven door de maker van Predict the Race.',
  en: 'This comparison was written by the maker of Predict the Race.',
};
// De talen waarin de app er echt is: dezelfde regel als in maak-site.mjs.
const appBron = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
const appTalen = [...appBron.match(/if \((gekozen === '[a-z]{2}'(?: \|\| gekozen === '[a-z]{2}')*)\) return gekozen;/)[1]
  .matchAll(/'([a-z]{2})'/g)].map(([, c]) => c);
const ZWAK = {
  nl: ['geen prijzen', 'App Store of Google Play', `sinds ${LLMS.online.toLowerCase()}`],
  en: ['no prizes', 'App Store or Google Play', `since ${LLMS.online}`],
};

for (const code of ['nl', 'en']) {
  const t = pg.talen[code];
  const naam = `vergelijking (${code})`;
  check(`${naam}: op het pad uit het zoekplan`, t?.pad === PAD[code], t?.pad);
  if (!t) continue;
  const html = readFileSync(join(wortel, ...t.pad.split('/'), 'index.html'), 'utf8');
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  const tekst = ontdoe(main);

  // ---- 1. wie het schreef -------------------------------------------------------
  const door = main.match(/<\/h1>\s*<p class="door">([\s\S]*?)<\/p>\s*<p class="kort/)?.[1] ?? '';
  check(`${naam}: direct onder de h1 staat dat de maker van Predict the Race dit schreef`,
    t.openheid === OPENHEID[code] && ontdoe(door).endsWith(`. ${OPENHEID[code]}`), ontdoe(door));

  // ---- 2. de datum van de controle ------------------------------------------------
  const datum = datumTekst(code, pg.gecontroleerd);
  const bijschrift = ontdoe(main.match(/<table class="tabel apps">\s*<caption>([\s\S]*?)<\/caption>/)?.[1] ?? '');
  const onder = main.match(/<\/table>\s*<p>([\s\S]*?)<\/p>/)?.[1] ?? '';
  check(`${naam}: de datum van de controle (${pg.gecontroleerd}) in het bijschrift en in de tekst onder de tabel`,
    /^\d{4}-\d{2}-\d{2}$/.test(pg.gecontroleerd) && bijschrift.endsWith(datum) && ontdoe(onder).includes(datum),
    `${bijschrift} · ${ontdoe(onder).slice(0, 80)}`);

  // ---- 3. de apps, elk met een link naar de eigen site ------------------------------
  const tabel = main.match(/<table class="tabel apps">[\s\S]*?<\/table>/)?.[0] ?? '';
  const koppen = [...(tabel.match(/<thead>([\s\S]*?)<\/thead>/)?.[1] ?? '').matchAll(/<th scope="col">([\s\S]*?)<\/th>/g)]
    .map(([, k]) => ontdoe(k));
  const rijen = [...tabel.matchAll(/<tr><th scope="row">([\s\S]*?)<\/th>([\s\S]*?)<\/tr>/g)].map(([, kop, rest]) => ({
    naam: ontdoe(kop), href: kop.match(/<a href="([^"]+)"/)?.[1] ?? null,
    cellen: [...rest.matchAll(/<td data-kop="([^"]*)">([\s\S]*?)<\/td>/g)].map(([, dk, c]) => ({ kop: ontdoe(dk), tekst: ontdoe(c) })),
  }));
  const namen = rijen.map((r) => r.naam);
  const mist = VERWACHT[code].filter((n) => !namen.includes(n));
  check(`${naam}: de tabel noemt ${VERWACHT[code].join(', ')}, met Predict the Race erbij`,
    mist.length === 0 && namen.includes('Predict the Race'), `mist: ${mist.join(', ')} · ${namen.join(', ')}`);
  const zonderBron = rijen.filter((r) => EIGEN_SITE[r.naam] && !vanDomein(r.href, EIGEN_SITE[r.naam]));
  const onbekend = rijen.filter((r) => !EIGEN_SITE[r.naam] && r.naam !== 'Predict the Race' && !r.href?.startsWith('../'));
  check(`${naam}: elke andere app linkt naar zijn eigen site (https), en een rij zonder eigen site naar een pagina van deze site`,
    zonderBron.length === 0 && onbekend.length === 0,
    [...zonderBron, ...onbekend].map((r) => `${r.naam}: ${r.href}`).join(' | '));
  const excel = PAGINAS.find((x) => x.id === 'excel').talen[code].pad;
  check(`${naam}: F1 Predict is het spel op f1predict.formula1.com, geen app uit een store; de spreadsheet linkt naar de eigen gids`,
    rijen.find((r) => r.naam === 'F1 Predict')?.href === 'https://f1predict.formula1.com/'
      && !/apps\.apple\.com|play\.google\.com/.test(main)
      && rijen.some((r) => r.href === `../${'../'.repeat(t.pad.split('/').length - 1)}${excel}/`),
    rijen.map((r) => r.href).join(' '));

  // ---- 4. op een smal scherm --------------------------------------------------------
  const fout = rijen.filter((r) => r.cellen.length !== koppen.length - 1
    || r.cellen.some((c, i) => c.kop !== koppen[i + 1] || !c.tekst));
  check(`${naam}: elke cel draagt de naam van haar kolom, en geen cel is leeg`, rijen.length > 0 && fout.length === 0,
    fout.map((r) => r.naam).join(', ') || `${rijen.length} rijen`);

  // ---- 5. geen bewering zonder bron -----------------------------------------------
  const genoemd = Object.keys(EIGEN_SITE).filter((n) => tekst.includes(n));
  const buiten = genoemd.filter((n) => !namen.includes(n));
  check(`${naam}: elke andere app die de tekst noemt, staat in de tabel met zijn link`, buiten.length === 0,
    buiten.join(', ') || genoemd.join(', '));

  // ---- 6. de zwakke punten van Predict the Race -------------------------------------
  const talen = new Intl.ListFormat(code, { type: 'disjunction' })
    .format([...appTalen].sort((a, b) => (a === code ? -1 : b === code ? 1 : 0)).map((c) => new Intl.DisplayNames(code, { type: 'language' }).of(c)));
  const mistZwak = [...ZWAK[code], talen].filter((z) => !tekst.toLowerCase().includes(z.toLowerCase()));
  check(`${naam}: de zwakke punten van Predict the Race staan erin (geen prijzen, geen store, de app in ${talen}, jong)`,
    mistZwak.length === 0, mistZwak.join(' | '));
}

// ---- 7. "net zo" als Podium Prophets -------------------------------------------------
{
  const [, max, stap] = appBron.match(/Math\.max\(0, (\d+) - (\d+) \* Math\.abs\(i - echt\)\)/) ?? [];
  const app = [0, 1, 2].map((d) => Number(max) - Number(stap) * d);
  const en = pg.talen.en.secties.flatMap((x) => x.tekst ?? []).find((x) => x.includes('the same way by default'));
  const hun = [...(en ?? '').matchAll(/\{=(\d+)\}/g)].map(([, n]) => Number(n));
  check('de tekst zegt dat Podium Prophets net zo telt als de app, en dat klopt: de app geeft 5, 3 en 1, zij ook',
    !en || (JSON.stringify(hun) === JSON.stringify([5, 3, 1]) && JSON.stringify(app) === JSON.stringify(hun)),
    `app ${app.join(', ')} · tekst ${hun.join(', ')}`);
}

// ---- 8. de waarschuwing na drie maanden ---------------------------------------------
{
  const dagen = Number(readFileSync(join(wortel, 'scripts', 'maak-site.mjs'), 'utf8').match(/const CONTROLE_DAGEN = (\d+);/)?.[1]);
  const plus = (n) => new Date(Date.parse(`${pg.gecontroleerd}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
  const maak = (vandaag) => spawnSync(process.execPath, [join(wortel, 'scripts', 'maak-site.mjs'), '--controle'],
    { encoding: 'utf8', env: { ...process.env, VANDAAG: vandaag } });
  const op = maak(plus(dagen));
  const na = maak(plus(dagen + 1));
  check(`na ${dagen} dagen nog geen waarschuwing, een dag later wel, met de pagina en de datum; het maken slaagt allebei`,
    dagen >= 28 && dagen <= 100 && op.status === 0 && !/Let op/.test(op.stderr)
      && na.status === 0 && na.stderr.includes(`Let op: de feiten op vergelijking zijn ${dagen + 1} dagen geleden gecontroleerd (${pg.gecontroleerd})`),
    `${op.status} ${op.stderr.trim()} · ${na.status} ${na.stderr.trim()}`);
}

process.exit(afronden() ? 0 : 1);
