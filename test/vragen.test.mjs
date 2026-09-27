// De vragenlijst (site/vragen.mjs) naast de vragen op de site.
//
// Zoekplan AEO fase 1: elke vraag heeft precies één plek op de site. Andere
// woorden voor dezelfde vraag zijn varianten, en die krijgen nooit een eigen
// kop. Met tien pagina's erbij lopen vragen anders door elkaar en gaan
// pagina's met elkaar concurreren.
//
// Draait zonder browser: leest de gegenereerde HTML zoals hij in de repo staat.
// test/site.test.mjs bewaakt dat die gelijk is aan wat maak-site.mjs maakt.
//
// Wat hier vastligt:
//   1. Elke vraag in de lijst is compleet: een taal, een bron, een status, en
//      een doel of, bij bewust-niet, een waarom.
//   2. Een beantwoorde vraag staat op zijn plek, letterlijk: als h2 van die
//      sectie, of als vraag in de FAQ.
//   3. Geen vraag staat twee keer in de lijst, ook niet als variant van een
//      andere.
//   4. Over alle pagina's van één taal staat geen vraag twee keer als kop of
//      als FAQ.
//   5. Een variant, een vraag die we bewust niet beantwoorden en een open
//      vraag staan nergens als kop of FAQ.
//   6. Elke vraag-kop en elke FAQ op de voorpagina en de gidsen staat in de
//      lijst, in elke taal waarin er een gids is.
//   7. Een sectie beantwoordt één vraag: geen twee vragen met hetzelfde doel,
//      behalve in een FAQ.
//
// De racepagina's (scripts/racepaginas.mjs) tellen mee voor 2 en 4, maar hun
// vragen staan niet in de lijst: dat zijn sjablonen uit site/races.mjs, één per
// race ("Hoe laat begint de Grand Prix van Singapore?"). Die bewaakt
// test/racepaginas.test.mjs.
//
// Twee vragen gelden als dezelfde als ze na het weglaten van hoofdletters,
// leestekens, streepjes en lidwoorden gelijk zijn: "How does scoring work?"
// en "How does the scoring work?" zijn één vraag.

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { maakControle, wortel, gepubliceerd } from './hulp.mjs';
import { teksten, TALEN } from '../site/teksten.mjs';
import { PRIVACY } from '../site/privacy.mjs';
import { PAGINAS } from '../site/paginas.mjs';
import { VRAGEN, GEPLANDE_PAGINAS } from '../site/vragen.mjs';
import { RACEPAGINAS } from '../scripts/racepaginas.mjs';

const { check, afronden } = maakControle('de vragenlijst');

// ---- de pagina's --------------------------------------------------------------
// Welke pagina waar staat, uit dezelfde gegevens als maak-site.mjs ze maakt.
const PAGINALIJST = [
  ...TALEN.map((taal) => ({ pad: teksten[taal].pad, pagina: 'voorpagina', taal })),
  ...Object.entries(PRIVACY).map(([taal, p]) => ({ pad: p.pad, pagina: 'privacy', taal })),
  ...PAGINAS.flatMap((pg) => Object.entries(pg.talen).map(([taal, t]) => ({ pad: t.pad, pagina: pg.id, taal }))),
  ...RACEPAGINAS.flatMap((pg) => Object.entries(pg.talen).map(([taal, t]) => ({ pad: t.pad, pagina: pg.id, taal }))),
].map((p) => ({ ...p, bestand: p.pad ? `${p.pad}/index.html` : 'index.html' }));

// Elke index.html die online komt, behalve de app en het beheer.
const gevonden = [];
const zoek = (map) => {
  for (const d of readdirSync(join(wortel, map), { withFileTypes: true })) {
    const rel = map ? `${map}/${d.name}` : d.name;
    if (d.isDirectory()) {
      if (d.name === 'node_modules' || d.name.startsWith('.') || !gepubliceerd(rel)) continue;
      zoek(rel);
    } else if (d.name === 'index.html' && gepubliceerd(rel) && !/^(app|beheer)\//.test(rel)) gevonden.push(rel);
  }
};
zoek('');
check('de lijst hieronder kent elke pagina die online komt',
  JSON.stringify(gevonden.sort()) === JSON.stringify(PAGINALIJST.map((p) => p.bestand).sort()),
  `gevonden: ${gevonden.filter((b) => !PAGINALIJST.some((p) => p.bestand === b)).join(', ') || '-'}`
    + ` · ontbreekt: ${PAGINALIJST.filter((p) => !gevonden.includes(p.bestand)).map((p) => p.bestand).join(', ') || '-'}`);

// ---- lezen ----------------------------------------------------------------------
const ontdoe = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, '\'')
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();

// Per pagina de kop van elke sectie met een id, en de vragen in een FAQ.
// Secties staan in de gegenereerde HTML nooit in elkaar.
const lees = (html) => {
  const plekken = [];
  for (const [, attr, binnen] of html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/g)) {
    const sectie = attr.match(/\bid="([^"]+)"/)?.[1];
    if (!sectie) continue;
    const kop = binnen.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/);
    if (kop) plekken.push({ sectie, soort: 'kop', tekst: ontdoe(kop[1]) });
    for (const [, vraag] of binnen.matchAll(/<summary\b[^>]*>\s*<h3\b[^>]*>([\s\S]*?)<\/h3>\s*<\/summary>/g))
      plekken.push({ sectie, soort: 'faq', tekst: ontdoe(vraag) });
  }
  return plekken;
};

for (const p of PAGINALIJST) {
  const html = readFileSync(join(wortel, ...p.bestand.split('/')), 'utf8');
  p.lang = html.match(/<html[^>]*\blang="([^"]+)"/)?.[1];
  p.plekken = lees(html);
  // Een vraag is een FAQ, of een kop die op een vraagteken eindigt.
  p.vragen = p.plekken.filter((x) => x.soort === 'faq' || x.tekst.endsWith('?'));
}

// Of het lezen werkt: evenveel secties en FAQ-vragen als in de bron.
{
  const mis = [];
  for (const p of PAGINALIJST) {
    if (p.lang !== p.taal) mis.push(`${p.bestand}: lang=${p.lang}`);
    const pg = [...PAGINAS, ...RACEPAGINAS].find((x) => x.id === p.pagina);
    if (pg) {
      const t = pg.talen[p.taal];
      const koppen = t.secties.filter((s) => p.plekken.some((x) => x.sectie === s.id && x.soort === 'kop' && x.tekst === s.vraag));
      const faq = p.plekken.filter((x) => x.soort === 'faq').map((x) => x.tekst);
      if (koppen.length !== t.secties.length) mis.push(`${p.bestand}: ${koppen.length} van ${t.secties.length} secties`);
      if (JSON.stringify(faq) !== JSON.stringify((t.faq ?? []).map(([v]) => v))) mis.push(`${p.bestand}: FAQ ${faq.length}`);
    }
    if (p.pagina === 'voorpagina') {
      const faq = p.plekken.filter((x) => x.soort === 'faq').map((x) => x.tekst);
      if (JSON.stringify(faq) !== JSON.stringify(teksten[p.taal].faq.items.map(([v]) => v))) mis.push(`${p.bestand}: FAQ ${faq.length}`);
    }
  }
  check('de pagina\'s worden goed gelezen: elke sectie en elke FAQ-vraag uit de bron is gevonden', mis.length === 0, mis.join(' | '));
}

// ---- vergelijken ----------------------------------------------------------------
const LIDWOORDEN = new Set(('de het een the a an der die das ein eine le la les un une des l el los las una '
  + 'il lo gli i o os as um uma').split(' '));
const sleutel = (s) => s.toLowerCase().replace(/[-‐‑]/g, ' ').replace(/[¿¡?!.,:;"'’‘“”()]/g, ' ')
  .split(/\s+/).filter((w) => w && !LIDWOORDEN.has(w)).join(' ');

const plekNaam = (p, x) => `${p.bestand} #${x.sectie}${x.soort === 'faq' ? ' (FAQ)' : ''}`;
// Per taal: elke vraag op de site, met waar hij staat.
const opDeSite = new Map();
for (const p of PAGINALIJST) {
  for (const x of p.vragen) {
    const k = `${p.taal}|${sleutel(x.tekst)}`;
    if (!opDeSite.has(k)) opDeSite.set(k, []);
    opDeSite.get(k).push(plekNaam(p, x));
  }
}
const waarStaat = (taal, tekst) => opDeSite.get(`${taal}|${sleutel(tekst)}`) ?? [];

// ---- 1. de lijst zelf -----------------------------------------------------------
const BRONNEN = ['hypothese', 'autocomplete', 'paa', 'reddit', 'gsc', 'bing', 'zoekresultaat'];
const STATUSSEN = ['open', 'beantwoord', 'bewust-niet'];
const BESTAAND = new Set(['voorpagina', ...PAGINAS.map((p) => p.id)]);
const naam = (v) => `${v.taal}: ${v.vraag}`;
{
  const fout = VRAGEN.filter((v) => !(typeof v.vraag === 'string' && v.vraag.trim().endsWith('?')
    && TALEN.includes(v.taal) && Array.isArray(v.varianten) && v.varianten.every((w) => typeof w === 'string' && w.trim())
    && BRONNEN.includes(v.bron) && STATUSSEN.includes(v.status)));
  check('elke vraag eindigt op een vraagteken en heeft een taal, varianten, een bron en een status',
    VRAGEN.length > 0 && fout.length === 0, fout.map(naam).join(' | '));

  const zonderWaarom = VRAGEN.filter((v) => v.status === 'bewust-niet' && (!(v.waarom ?? '').trim() || v.doel));
  check('een vraag die we bewust niet beantwoorden heeft een waarom, en geen doel',
    VRAGEN.some((v) => v.status === 'bewust-niet') && zonderWaarom.length === 0, zonderWaarom.map(naam).join(' | '));

  const zonderDoel = VRAGEN.filter((v) => v.status !== 'bewust-niet').filter((v) => {
    const [pagina, sectie, rest] = (v.doel ?? '').split('#');
    if (rest !== undefined || !pagina) return true;
    if (!BESTAAND.has(pagina) && !(v.status === 'open' && GEPLANDE_PAGINAS.includes(pagina))) return true;
    return v.status === 'beantwoord' && !sectie;
  });
  check('elke andere vraag heeft een doel: een bestaande pagina met een sectie, of voor een open vraag ook een geplande pagina',
    zonderDoel.length === 0, zonderDoel.map((v) => `${naam(v)} -> "${v.doel}"`).join(' | '));

  const alGemaakt = GEPLANDE_PAGINAS.filter((p) => BESTAAND.has(p));
  check('een geplande pagina bestaat nog niet (anders hoort hij niet meer bij GEPLANDE_PAGINAS)',
    alGemaakt.length === 0, alGemaakt.join(', '));
}

// ---- 2. een beantwoorde vraag staat letterlijk op zijn plek ----------------------
{
  const mis = [];
  for (const v of VRAGEN.filter((x) => x.status === 'beantwoord')) {
    const [pagina, sectie] = v.doel.split('#');
    const p = PAGINALIJST.find((x) => x.pagina === pagina && x.taal === v.taal);
    if (!p) { mis.push(`${naam(v)}: geen pagina ${pagina} in het ${v.taal}`); continue; }
    const daar = p.plekken.filter((x) => x.sectie === sectie);
    if (!daar.length) { mis.push(`${naam(v)}: ${p.bestand} heeft geen sectie #${sectie}`); continue; }
    if (!daar.some((x) => x.tekst === v.vraag)) mis.push(`${naam(v)}: op ${p.bestand} #${sectie} staat "${daar.map((x) => x.tekst).join('" / "')}"`);
  }
  check('elke beantwoorde vraag staat letterlijk als kop of FAQ-vraag op zijn doel', mis.length === 0, mis.join(' | '));
}

// ---- 3. geen vraag twee keer in de lijst -----------------------------------------
{
  const gezien = new Map();
  const dubbel = [];
  for (const v of VRAGEN) {
    for (const tekst of [v.vraag, ...v.varianten]) {
      const k = `${v.taal}|${sleutel(tekst)}`;
      if (gezien.has(k)) dubbel.push(`"${tekst}" (bij ${gezien.get(k)} en ${naam(v)})`);
      else gezien.set(k, naam(v));
    }
  }
  check('geen vraag staat twee keer in de lijst, ook niet als variant van een andere', dubbel.length === 0, dubbel.join(' | '));
}

// ---- 4. geen vraag twee keer op de site ------------------------------------------
{
  const dubbel = [...opDeSite.entries()].filter(([, waar]) => waar.length > 1)
    .map(([k, waar]) => `${k.split('|')[0]}: ${waar.join(' en ')}`);
  check('over alle pagina\'s van één taal staat geen vraag twee keer als kop of als FAQ',
    opDeSite.size > 0 && dubbel.length === 0, dubbel.join(' | '));
}

// ---- 5. varianten, bewust-niet en open staan nergens -----------------------------
{
  const variant = VRAGEN.flatMap((v) => v.varianten.filter((w) => waarStaat(v.taal, w).length)
    .map((w) => `"${w}" (variant van ${naam(v)}) staat op ${waarStaat(v.taal, w).join(', ')}`));
  check('een variant staat nergens als kop of FAQ: die vraag heeft al een plek', variant.length === 0, variant.join(' | '));

  const niet = VRAGEN.filter((v) => v.status !== 'beantwoord' && waarStaat(v.taal, v.vraag).length)
    .map((v) => `${naam(v)} (${v.status}) staat op ${waarStaat(v.taal, v.vraag).join(', ')}`);
  check('een open vraag of een bewust-niet-vraag staat nog nergens (staat hij er wel, zet hem dan op beantwoord)',
    niet.length === 0, niet.join(' | '));
}

// ---- 6. elke vraag op de site staat in de lijst ----------------------------------
{
  const MET_GIDS = TALEN.filter((c) => PAGINAS.some((pg) => pg.talen[c]));
  const mis = [];
  for (const p of PAGINALIJST.filter((x) => MET_GIDS.includes(x.taal) && BESTAAND.has(x.pagina))) {
    for (const x of p.vragen) {
      const doel = `${p.pagina}#${x.sectie}`;
      if (!VRAGEN.some((v) => v.status === 'beantwoord' && v.taal === p.taal && v.doel === doel && v.vraag === x.tekst))
        mis.push(`${p.taal}: "${x.tekst}" (${doel})`);
    }
  }
  check(`elke vraag-kop en FAQ op de voorpagina en de gidsen staat in de lijst (${MET_GIDS.join(', ')})`,
    MET_GIDS.length > 0 && mis.length === 0, mis.join(' | '));
}

// ---- 7. één vraag per sectie -----------------------------------------------------
{
  const per = new Map();
  for (const v of VRAGEN.filter((x) => x.status !== 'bewust-niet' && !x.doel.endsWith('#faq'))) {
    const k = `${v.taal}|${v.doel}`;
    per.set(k, [...(per.get(k) ?? []), v.vraag]);
  }
  const dubbel = [...per.entries()].filter(([, l]) => l.length > 1).map(([k, l]) => `${k}: ${l.join(' / ')}`);
  check('een sectie beantwoordt één vraag: geen twee vragen met hetzelfde doel, behalve in een FAQ',
    dubbel.length === 0, dubbel.join(' | '));
}

// Een overzicht voor wie de lijst bijhoudt.
const telling = TALEN.map((t) => {
  const v = VRAGEN.filter((x) => x.taal === t);
  return v.length ? `${t}: ${STATUSSEN.map((s) => `${v.filter((x) => x.status === s).length} ${s}`).join(', ')}` : null;
}).filter(Boolean);
console.log(`  ${VRAGEN.length} vragen · ${telling.join(' · ')}`);

process.exit(afronden() ? 0 : 1);
