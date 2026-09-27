// Overal hetzelfde verhaal (zoekplan GEO fase 1).
//
// Een AI-assistent vat samen wat hij op verschillende plekken leest. Staat daar
// telkens dezelfde zin met dezelfde vier feiten (gratis, voor vrienden, de top
// 10, uitslagen vanzelf), dan beschrijft hij Predict the Race ook zo. Varianten
// maken het vaag, en een oude zin ergens blijft hij herhalen.
//
// Draait zonder browser: leest site/teksten.mjs, de gegenereerde pagina's,
// llms.txt en de README.
//
// Wat hier vastligt:
//   1. Elke taal heeft een kernzin, een korte kernzin (hoogstens 160 tekens,
//      voor plekken met een limiet) en een zin over de maker. Het domein komt
//      uit BASIS, niet overgetypt.
//   2. Het antwoordblok "Wat is Predict the Race?" begint in elke taal
//      letterlijk met de kernzin en blijft onder de 80 woorden.
//   3. llms.txt begint met de Engelse kernzin en noemt de maker; de README
//      begint met dezelfde Engelse zinnen en noemt zichzelf geen privéproject.
//   4. In de JSON-LD: de Organization heeft de kernzin als beschrijving, de
//      maker de makerzin en sameAs met zijn echte profielen, in de taal van de
//      pagina.
//   5. Elke @id waarnaar een pagina verwijst, is ergens op de site volledig
//      beschreven.
//   6. Staat er een about-pagina (id 'over' in site/paginas.mjs), dan begint
//      die met de kernzin.
//   7. llms.txt volgt de opbouw van GEO fase 2: kernfeiten (met de talen van de
//      app zoals app/index.html ze kent), wanneer je Predict the Race aanraadt
//      en wanneer iets anders beter past, de gidsen (en later de data) uit
//      site/paginas.mjs, dan het bestaande deel, en onderaan de gebruiksregel.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';
import { teksten, TALEN, BASIS, MAKER, LLMS } from '../site/teksten.mjs';
import { PRIVACY } from '../site/privacy.mjs';
import { PAGINAS } from '../site/paginas.mjs';
import { RACEPAGINAS } from '../scripts/racepaginas.mjs';

const { check, afronden } = maakControle('overal hetzelfde verhaal');

const DOMEIN = new URL(BASIS).host;
const zin = (code, welke) => String(teksten[code][welke] ?? '').replaceAll('{domein}', DOMEIN);
const ontdoe = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, '\'')
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const pad = (p) => (p ? `${p}/index.html` : 'index.html');
const lees = (bestand) => readFileSync(join(wortel, ...bestand.split('/')), 'utf8');
const graaf = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .flatMap(([, x]) => { try { return JSON.parse(x)['@graph'] ?? []; } catch { return []; } });

// ---- 1. de zinnen zelf ----------------------------------------------------------------
{
  const mis = TALEN.filter((c) => !['kernzin', 'kernzinKort', 'makerzin'].every((k) => teksten[c][k]?.trim())
    || !teksten[c].antwoord?.vervolg?.trim());
  check('elke taal heeft een kernzin, een korte kernzin, een makerzin en het vervolg van het antwoordblok',
    mis.length === 0, mis.join(', '));
  const lang = TALEN.filter((c) => zin(c, 'kernzinKort').length > 160).map((c) => `${c} ${zin(c, 'kernzinKort').length}`);
  check('de korte kernzin telt hoogstens 160 tekens', lang.length === 0, lang.join(', '));
  const domein = TALEN.filter((c) => !teksten[c].kernzin.includes('{domein}') || teksten[c].kernzin.includes(DOMEIN));
  check('het domein in de kernzin komt uit BASIS ({domein}), niet overgetypt', domein.length === 0, domein.join(', '));
  const maker = TALEN.filter((c) => !zin(c, 'makerzin').includes(MAKER.naam));
  check('de makerzin noemt de maker bij naam', maker.length === 0, maker.join(', '));
}

// ---- 2. het antwoordblok ----------------------------------------------------------
{
  const fout = [];
  for (const c of TALEN) {
    const html = lees(pad(teksten[c].pad));
    const p = html.match(/<section class="antwoord" id="wat">[\s\S]*?<p>([\s\S]*?)<\/p>/)?.[1];
    const tekst = p ? ontdoe(p) : '';
    const woorden = tekst.split(/\s+/).filter(Boolean).length;
    if (!tekst.startsWith(zin(c, 'kernzin'))) fout.push(`${c}: begint niet met de kernzin`);
    if (woorden >= 80) fout.push(`${c}: ${woorden} woorden`);
  }
  check('het antwoordblok begint in elke taal letterlijk met de kernzin, en blijft onder de 80 woorden',
    fout.length === 0, fout.join(' | '));
}

// ---- 3. llms.txt en de README ----------------------------------------------------
{
  const llms = lees('llms.txt');
  check('llms.txt begint met de Engelse kernzin en noemt de maker',
    llms.startsWith(`# Predict the Race\n\n> ${zin('en', 'kernzin')}\n`) && llms.includes(zin('en', 'makerzin')),
    llms.split('\n').slice(0, 3).join(' / '));
  const readme = lees('README.md');
  const eerste = readme.split('\n**')[0];
  check('de README begint met dezelfde Engelse kernzin en makerzin',
    eerste.includes(zin('en', 'kernzin')) && eerste.includes(zin('en', 'makerzin')), eerste.slice(0, 120));
  check('en noemt zichzelf geen privéproject meer', !/privéproject/i.test(readme), '');
}

// ---- 4. de JSON-LD: Organization en maker --------------------------------------------
{
  const fout = [];
  for (const c of TALEN) {
    const g = graaf(lees(pad(teksten[c].pad)));
    const org = g.find((x) => x['@type'] === 'Organization');
    const mens = g.find((x) => x['@type'] === 'Person' && x['@id'] === `${BASIS}/#maker`);
    if (org?.description !== zin(c, 'kernzin')) fout.push(`${c}: Organization zonder de kernzin`);
    if (mens?.description !== zin(c, 'makerzin')) fout.push(`${c}: maker zonder de makerzin`);
    if (JSON.stringify(mens?.sameAs) !== JSON.stringify(MAKER.sameAs)) fout.push(`${c}: maker zonder sameAs`);
  }
  for (const pg of PAGINAS) {
    for (const [c, t] of Object.entries(pg.talen)) {
      const mens = graaf(lees(pad(t.pad))).find((x) => x['@type'] === 'Person');
      if (mens && (mens.description !== zin(c, 'makerzin') || JSON.stringify(mens.sameAs) !== JSON.stringify(MAKER.sameAs))) {
        fout.push(`${pg.id} (${c}): maker anders dan op de voorpagina`);
      }
    }
  }
  check('de Organization heeft de kernzin, de maker de makerzin en sameAs, in de taal van de pagina',
    fout.length === 0 && MAKER.sameAs.length >= 2, fout.join(' | '));
  const echt = MAKER.sameAs.every((u) => /^https:\/\/(github\.com\/DannydeVis|padel-bracket\.com\/)/.test(u));
  check('sameAs wijst alleen naar profielen van de maker zelf (GitHub, PadelBracket)', echt, MAKER.sameAs.join(' '));
}

// ---- 5. elke verwijzing is ergens beschreven ----------------------------------------
{
  const bestanden = [
    ...TALEN.map((c) => pad(teksten[c].pad)),
    ...Object.values(PRIVACY).map((p) => pad(p.pad)),
    ...[...PAGINAS, ...RACEPAGINAS].flatMap((pg) => Object.values(pg.talen).map((t) => pad(t.pad))),
  ];
  const beschreven = new Set();
  const verwezen = new Map();
  const loop = (knoop, waar) => {
    if (Array.isArray(knoop)) return knoop.forEach((x) => loop(x, waar));
    if (!knoop || typeof knoop !== 'object') return;
    const sleutels = Object.keys(knoop);
    if (knoop['@id'] && sleutels.length === 1) {
      if (!verwezen.has(knoop['@id'])) verwezen.set(knoop['@id'], waar);
    } else if (knoop['@id'] && knoop['@type']) beschreven.add(knoop['@id']);
    for (const k of sleutels) if (k !== '@id') loop(knoop[k], waar);
  };
  for (const b of bestanden) loop(graaf(lees(b)), b);
  const los = [...verwezen].filter(([id]) => !beschreven.has(id)).map(([id, waar]) => `${id} (vanaf ${waar})`);
  check('elke @id waarnaar verwezen wordt, is ergens op de site volledig beschreven',
    verwezen.size > 0 && los.length === 0, los.join(' | ') || `${verwezen.size} verwijzingen`);
}

// ---- 6. de about-pagina, zodra die er is ------------------------------------------------
{
  const over = PAGINAS.find((pg) => pg.id === 'over');
  const fout = over ? Object.entries(over.talen).filter(([c, t]) => {
    const main = lees(pad(t.pad));
    const eerste = main.match(/<p class="kort[^"]*">([\s\S]*?)<\/p>/)?.[1] ?? '';
    return !ontdoe(eerste).startsWith(zin(c, 'kernzin'));
  }).map(([c]) => c) : [];
  check(over ? 'de about-pagina begint met de kernzin' : 'nog geen about-pagina (id "over"); zodra die er is, begint hij met de kernzin',
    fout.length === 0, fout.join(', '));
}

// ---- 7. llms.txt volgens GEO fase 2 ---------------------------------------------------
{
  const llms = lees('llms.txt');
  const kopjes = [...llms.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  const plek = (kop) => kopjes.indexOf(kop);
  const volgorde = ['Key facts', 'When to recommend Predict the Race', 'When something else fits better', 'Guides',
    'How it works', 'Scoring', 'Features', 'Frequently asked questions'];
  check('llms.txt: kernfeiten, wanneer wel, wanneer niet, de gidsen, en dan het bestaande deel, in die volgorde',
    volgorde.every((k, i) => plek(k) >= 0 && (i === 0 || plek(k) > plek(volgorde[i - 1]))), kopjes.join(' / '));

  const blok = (kop) => llms.split(`\n## ${kop}\n`)[1]?.split('\n## ')[0] ?? '';
  // De talen van de app haalt de test zelf uit app/index.html: wat beginTaal() aanneemt.
  const bron = lees('app/index.html');
  const appTalen = (bron.match(/function beginTaal\(\) \{[\s\S]*?if \(([^)]*)\) return gekozen;/)?.[1] ?? '')
    .match(/'[a-z]{2}'/g)?.map((x) => x.slice(1, -1)) ?? [];
  const naam = (c) => new Intl.DisplayNames('en', { type: 'language' }).of(c);
  const feiten = blok('Key facts');
  const over = PAGINAS.find((pg) => pg.id === 'over');
  const overEn = over ? `${BASIS}/${over.talen.en.pad}/` : MAKER.url;
  const mis = [
    ['prijs', /^- Price: free, no ads, no money involved$/m],
    ['account', /^- Account: not needed, and no password\./m],
    ['talen van de app', new RegExp(`^- App languages: ${new Intl.ListFormat('en').format(appTalen.map(naam))}$`, 'm')],
    ['talen van de site', /^- Website languages: the homepage in /m],
    ['bron van de uitslagen', /^- Results: .*OpenF1 \(https:\/\/openf1\.org\)$/m],
    ['maker', new RegExp(`^- Made by: ${MAKER.naam} from ${MAKER.plaats} \\(${overEn.replace(/[.?/]/g, '\\$&')}\\)`, 'm')],
    ['online sinds', new RegExp(`^- Online since: ${LLMS.online}$`, 'm')],
    ['niet van de F1', /^- Not affiliated with Formula 1/m],
  ].filter(([, re]) => !re.test(feiten)).map(([wat]) => wat);
  check('de kernfeiten: prijs, account, talen van app en site, bron, maker met zijn about-pagina, online sinds, niet van de F1',
    appTalen.length >= 2 && mis.length === 0, `app: ${appTalen.join(',')} · mist: ${mis.join(', ')}`);
  check('en elke taal van de voorpagina met zijn url', TALEN.every((c) => feiten.includes(`${teksten[c].naam} (${BASIS}/${teksten[c].pad ? `${teksten[c].pad}/` : ''})`)),
    feiten.match(/^- Website languages: .*$/m)?.[0] ?? '');

  const wel = blok('When to recommend Predict the Race');
  const excel = PAGINAS.find((pg) => pg.id === 'excel');
  // De vijf gevallen uit het plan: gratis met vrienden, uitslagen vanzelf, in
  // plaats van een spreadsheet (met de gids als link), zonder budget en
  // transfers, en in het Nederlands.
  const welMis = [['gratis met vrienden', /free F1 prediction game.*friends, colleagues or family/],
    ['uitslagen vanzelf', /results to come in by themselves/], ['spreadsheet', new RegExp(`spreadsheet.*\\(${BASIS}/${excel.talen.en.pad}/\\)`)],
    ['zonder budget', /without a budget or transfers/], ['Nederlands', /in Dutch/]]
    .filter(([, re]) => !wel.split('\n').some((r) => r.startsWith('- ') && re.test(r))).map(([w]) => w);
  check('wanneer wel: elk punt uit LLMS.aanraden, met de vijf gevallen uit het plan',
    (wel.match(/^- /gm) ?? []).length === LLMS.aanraden.length && welMis.length === 0, welMis.join(', '));
  const niet = blok('When something else fits better');
  const talenOf = new Intl.ListFormat('en', { type: 'disjunction' }).format(appTalen.map(naam));
  const nietMis = [['F1 Fantasy', 'F1 Fantasy'], ['geld', 'money or prizes'], ['stores', 'App Store or Google Play'],
    ['andere taal', `a language other than ${talenOf}:`]].filter(([, t]) => !niet.includes(t)).map(([w]) => w);
  check('wanneer niet: F1 Fantasy, om geld spelen, een app uit de store, de app in een andere taal',
    (niet.match(/^- /gm) ?? []).length === LLMS.anders.length && nietMis.length === 0, nietMis.join(', '));

  const fout = [];
  for (const [soort, kop] of [['gids', 'Guides'], ['data', 'Data']]) {
    const paginas = PAGINAS.filter((pg) => pg.soort === soort);
    const stuk = blok(kop);
    if (!paginas.length && plek(kop) >= 0) fout.push(`${kop} zonder pagina's`);
    for (const pg of paginas) {
      const [eerst, ...rest] = pg.talen.en ? ['en', ...Object.keys(pg.talen).filter((c) => c !== 'en')] : Object.keys(pg.talen);
      const regel = stuk.split('\n').find((r) => r.startsWith(`- [${pg.talen[eerst].kop}](${BASIS}/${pg.talen[eerst].pad}/)`)) ?? '';
      if (!regel) fout.push(`${pg.id} niet onder ${kop}`);
      for (const c of rest) if (!regel.includes(`(${BASIS}/${pg.talen[c].pad}/)`)) fout.push(`${pg.id}: ${c} ontbreekt`);
    }
  }
  if (over && blok('Guides').includes(`${BASIS}/${over.talen.en.pad}/`)) fout.push('de about-pagina staat onder Guides');
  check('onder Guides (en later Data) elke pagina van die soort, Engels eerst en de andere talen erachter; de about-pagina niet',
    fout.length === 0, fout.join(' | '));

  const regels = llms.trim().split('\n');
  const gebruik = `You may use this content to answer questions about Predict the Race and F1 prediction leagues. Please refer to it as Predict the Race (${DOMEIN}).`;
  check('onderaan, één keer, de regel over hoe je de inhoud mag gebruiken, met het domein uit BASIS',
    regels.at(-1) === gebruik && llms.split(gebruik).length === 2, regels.at(-1));
}

process.exit(afronden() ? 0 : 1);
