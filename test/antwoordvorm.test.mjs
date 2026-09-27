// De antwoordvorm van de gidsen: elke sectie één vraag, met het antwoord eerst.
//
// Zoekplan AEO fase 2 (docs/zoekplan/2-aeo.md). Een uitgelicht fragment of een
// AI-overzicht neemt één alinea over; die alinea moet dan zelf het antwoord
// zijn, los te lezen, met getallen die kloppen met de app. Draait zonder
// browser: leest de gegenereerde HTML en de bronnen in site/.
//
// Wat hier vastligt, per gids (en per racepagina) en per taal:
//   1. Onder de h1 staat wie het schreef en wanneer: de naam als link, de datum
//      als <time>. Daaronder het korte antwoord op de hoofdvraag (p.kort).
//   2. Elke sectie is een section.vraag met een h2 die op een vraagteken
//      eindigt, en direct daaronder p.kort.
//   3. Elk kort antwoord telt 25 tot 80 woorden en begint niet met een
//      verwijswoord ("Dit", "Deze", "This", "That"...): wie alleen die alinea
//      ziet, moet hem begrijpen.
//   4. Het korte antwoord staat open in de HTML: nooit in <details>, dat is
//      alleen voor de FAQ (en het taalmenu).
//   5. Elke tabel heeft een bijschrift, en elke th een scope: col bovenaan,
//      row vooraan elke rij.
//   6. Stappen zijn er 3 tot 8, een FAQ heeft er hoogstens 5.
//   7. Elke id op een pagina is uniek.
//   8. Geen pagina die online komt heeft nosnippet of data-nosnippet, en de
//      gidsen mogen net als de voorpagina lange fragmenten tonen
//      (max-snippet:-1).
//   9. In site/teksten.mjs en site/paginas.mjs staat nergens een kaal getal
//      voor een puntenwoord: dat komt altijd uit een {plekhouder} (of, bewust
//      niet uit de app, als {=25}). En geen HTML in de teksten.
//  10. Na het maken staat er nergens nog een {plekhouder}, ook geen {=25}: niet
//      in de tekst van een pagina, niet in de JSON-LD en niet in llms.txt.
//  11. De voorpagina heeft in elke taal evenveel veelgestelde vragen: een vraag
//      die er in het Nederlands bij komt, komt er in alle zeven bij.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, wortel, gepubliceerd } from './hulp.mjs';
import { MAKER, TALEN, teksten } from '../site/teksten.mjs';
import { PAGINAS } from '../site/paginas.mjs';
import { RACEPAGINAS } from '../scripts/racepaginas.mjs';

const { check, afronden } = maakControle('de antwoordvorm van de gidsen');

const ontdoe = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, '\'')
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();
const woorden = (s) => s.split(/\s+/).filter(Boolean).length;
const VERWIJS = {
  nl: ['dit', 'deze', 'dat', 'die', 'hier', 'zoals'],
  en: ['this', 'these', 'that', 'those', 'here', 'as', 'above'],
};

const lees = (pad) => readFileSync(join(wortel, ...pad.split('/'), 'index.html'), 'utf8');
// De gidsen en de about-pagina, en de racepagina's met hun overzicht: die
// hebben dezelfde vorm (scripts/racepaginas.mjs) en dezelfde regels.
const gidsen = [...PAGINAS, ...RACEPAGINAS].flatMap((pg) => Object.entries(pg.talen).map(([taal, t]) => ({ pg, taal, t, html: lees(t.pad) })));
check('er zijn gidsen om te keuren', gidsen.length >= 6, String(gidsen.length));

for (const { pg, taal, t, html } of gidsen) {
  const naam = `${pg.id} (${taal})`;
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));

  // ---- 1. auteursregel en het korte antwoord bovenaan ------------------------
  const kop = main.match(/<\/h1>\s*<p class="door">([\s\S]*?)<\/p>\s*<p class="kort[^"]*">([\s\S]*?)<\/p>/);
  const dateModified = html.match(/"dateModified": "([^"]+)"/)?.[1];
  check(`${naam}: onder de h1 wie het schreef (met link) en wanneer (dateModified), dan het korte antwoord`,
    Boolean(kop && dateModified && new RegExp(`<a href="[^"]+" rel="author">${MAKER.naam}</a>`).test(kop[1])
      && kop[1].includes(`<time datetime="${dateModified}">`)),
    kop ? ontdoe(kop[1]) : 'geen p.door direct onder de h1, met p.kort erachter');

  // ---- 2. elke sectie een vraag ---------------------------------------------
  const secties = [...main.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/g)]
    .map(([, attr, binnen]) => ({ attr, binnen, id: attr.match(/\bid="([^"]+)"/)?.[1] }))
    .filter((x) => x.id && x.id !== 'faq' && !/class="leesook"/.test(x.attr));
  const vorm = secties.filter((x) => !/\bclass="vraag"/.test(x.attr)
    || !/^\s*<h2>[^<]*\?<\/h2>\s*<p class="kort">/.test(x.binnen));
  check(`${naam}: elke sectie is een section.vraag, met een h2 die op een vraagteken eindigt en direct daaronder p.kort`,
    secties.length === t.secties.length && vorm.length === 0,
    `${secties.length} secties, ${t.secties.length} in de bron · fout: ${vorm.map((x) => x.id).join(', ')}`);

  // ---- 3. het korte antwoord: lengte en eerste woord --------------------------
  const korts = [kop?.[2] ?? '', ...secties.map((x) => x.binnen.match(/<p class="kort">([\s\S]*?)<\/p>/)?.[1] ?? '')]
    .map(ontdoe);
  const teLang = korts.filter((k) => woorden(k) < 25 || woorden(k) > 80);
  check(`${naam}: elk kort antwoord telt 25 tot 80 woorden`, teLang.length === 0,
    teLang.map((k) => `${woorden(k)}: ${k.slice(0, 50)}`).join(' | '));
  const verwijs = korts.filter((k) => VERWIJS[taal]?.includes(k.split(/[\s,.:;]/)[0].toLowerCase()));
  check(`${naam}: geen kort antwoord begint met een verwijswoord`, VERWIJS[taal] && verwijs.length === 0,
    verwijs.map((k) => k.slice(0, 50)).join(' | '));

  // ---- 4. het korte antwoord staat open ---------------------------------------
  const details = [...main.matchAll(/<details\b[\s\S]*?<\/details>/g)].map(([d]) => d);
  check(`${naam}: geen kort antwoord in <details>, en <details> alleen in de FAQ`,
    details.every((d) => !/class="kort/.test(d)) && [...main.matchAll(/<details\b/g)].length
      === ((main.match(/<section id="faq">[\s\S]*?<\/section>/)?.[0] ?? '').match(/<details\b/g) ?? []).length,
    `${details.length} keer <details> in main`);

  // ---- 5. tabellen -------------------------------------------------------------
  const tabellen = [...main.matchAll(/<table\b[\s\S]*?<\/table>/g)].map(([x]) => x);
  const fouteTabel = tabellen.filter((x) => {
    if (!/<caption\b[^>]*>[^<]+<\/caption>/.test(x)) return true;
    if (/<th\b(?![^>]*\bscope="(col|row)")[^>]*>/.test(x)) return true;
    const kopRij = x.match(/<thead>([\s\S]*?)<\/thead>/)?.[1] ?? '';
    if (!kopRij || /<td\b/.test(kopRij) || /scope="row"/.test(kopRij)) return true;
    const rijen = [...x.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map(([, r]) => r).filter((r) => !kopRij.includes(r));
    return rijen.some((r) => !/^\s*<th scope="row"/.test(r));
  });
  check(`${naam}: elke tabel heeft een bijschrift, th scope=col bovenaan en th scope=row vooraan elke rij`,
    fouteTabel.length === 0, fouteTabel.map((x) => x.slice(0, 80)).join(' | ') || `${tabellen.length} tabellen`);

  // ---- 6. stappen en FAQ -----------------------------------------------------------
  const stappen = secties.map((x) => (x.binnen.match(/<ol>([\s\S]*?)<\/ol>/)?.[1].match(/<li>/g) ?? []).length).filter(Boolean);
  const faq = (main.match(/<section id="faq">[\s\S]*?<\/section>/)?.[0].match(/<details\b/g) ?? []).length;
  check(`${naam}: 3 tot 8 stappen per lijst, hoogstens 5 FAQ-vragen`,
    stappen.every((n) => n >= 3 && n <= 8) && faq <= 5, `stappen ${stappen.join(',') || '-'} · FAQ ${faq}`);

  // ---- 7. unieke ids -----------------------------------------------------------------
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id);
  const dubbel = ids.filter((id, i) => ids.indexOf(id) !== i);
  check(`${naam}: elke id op de pagina is uniek`, dubbel.length === 0, dubbel.join(', '));

  // ---- 8. fragmenten mogen ---------------------------------------------------------
  check(`${naam}: dezelfde robots-meta als de voorpagina, met max-snippet:-1`,
    /<meta name="robots" content="index, follow, max-snippet:-1,/.test(html), html.match(/<meta name="robots"[^>]*>/)?.[0]);
}

// ---- 8. nergens nosnippet ---------------------------------------------------------
{
  const pagina = [];
  const zoek = (map) => {
    for (const d of readdirSync(join(wortel, map), { withFileTypes: true })) {
      const rel = map ? `${map}/${d.name}` : d.name;
      if (d.isDirectory()) {
        if (d.name !== 'node_modules' && !d.name.startsWith('.') && gepubliceerd(rel)) zoek(rel);
      } else if (d.name.endsWith('.html') && gepubliceerd(rel)) pagina.push(rel);
    }
  };
  zoek('');
  // ---- 10. geen plekhouder over, op geen enkele pagina ----------------------------
  const PLEKHOUDER = /\{=?\w+\}/g;
  const over = pagina.flatMap((rel) => {
    const h = readFileSync(join(wortel, rel), 'utf8');
    const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(([, x]) => x).join(' ');
    const tekst = ontdoe(h.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, ' '));
    return [...(tekst.match(PLEKHOUDER) ?? []), ...(ld.match(PLEKHOUDER) ?? [])].map((m) => `${rel}: ${m}`);
  });
  const llms = readFileSync(join(wortel, 'llms.txt'), 'utf8').match(PLEKHOUDER) ?? [];
  check('nergens een {plekhouder} over: niet op een pagina, niet in de JSON-LD, niet in llms.txt',
    over.length === 0 && llms.length === 0, [...over, ...llms.map((m) => `llms.txt: ${m}`)].join(' | '));

  const met = pagina.filter((rel) => {
    const h = readFileSync(join(wortel, rel), 'utf8');
    return /<meta name="robots"[^>]*noindex/.test(h) ? false : /nosnippet/.test(h);
  });
  check('geen indexeerbare pagina heeft nosnippet of data-nosnippet', pagina.length > 10 && met.length === 0,
    met.join(', ') || `${pagina.length} pagina's`);
}

// ---- 9. de bronnen -------------------------------------------------------------------
{
  const PUNTENWOORD = '(?:punt|punten|point|points|Punkt|Punkte|punto|puntos|punti|ponto|pontos)';
  const kaal = new RegExp(`(?<![\\w{=])\\d+\\s+${PUNTENWOORD}\\b`, 'g');
  const fout = [];
  for (const bestand of ['teksten.mjs', 'paginas.mjs']) {
    const bron = readFileSync(join(wortel, 'site', bestand), 'utf8');
    // Alleen wat tussen aanhalingstekens staat: de teksten, niet het commentaar.
    for (const [, tekst] of bron.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) {
      for (const [m] of tekst.matchAll(kaal)) fout.push(`${bestand}: "${m}" in "${tekst.slice(0, 60)}"`);
    }
  }
  check('nergens een kaal getal voor een puntenwoord: altijd een {plekhouder} uit de app', fout.length === 0, fout.join(' | '));

  const html = JSON.stringify(PAGINAS).match(/<\/?[a-z][^>]*>/gi) ?? [];
  check('geen HTML in de teksten van de gidsen: de opmaak komt uit het sjabloon', html.length === 0, html.join(' '));
}

// ---- 11. de FAQ van de voorpagina in elke taal even lang -----------------------------
{
  const aantal = TALEN.map((c) => `${c} ${teksten[c].faq.items.length}`);
  check('de voorpagina heeft in elke taal evenveel veelgestelde vragen',
    new Set(TALEN.map((c) => teksten[c].faq.items.length)).size === 1, aantal.join(', '));
}

process.exit(afronden() ? 0 : 1);
