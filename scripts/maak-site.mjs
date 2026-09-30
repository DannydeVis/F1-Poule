#!/usr/bin/env node
/**
 * Maakt de landingspagina's, de privacyverklaring, de sitemap, robots.txt,
 * llms.txt, 404.html en het sleutelbestand van IndexNow uit site/teksten.mjs
 * en site/privacy.mjs.
 *
 *   node scripts/maak-site.mjs              schrijft alles weg
 *   node scripts/maak-site.mjs --controle   zegt alleen of het nog klopt
 *
 * Waarom een generator en geen zeven losse bestanden: zeven talen met elk een
 * FAQ, een puntentabel en een blok gestructureerde gegevens lopen met de hand
 * binnen een maand uit elkaar. Hier staat de vorm één keer en de tekst één
 * keer, en test/site.test.mjs draait --controle zodat een vergeten `node
 * scripts/maak-site.mjs` na een tekstwijziging de build laat zakken.
 *
 * De app zelf heeft nog steeds geen bouwstap: dit maakt alleen de statische
 * pagina's eromheen, en wat eruit komt staat gewoon in de repo.
 *
 * Wat er van padel-bracket.com is overgenomen, en wat er anders is:
 *   - Nederlands in de hoofdmap, elke andere taal in een eigen map, Engels als
 *     x-default, hreflang wederkerig op elke pagina en in de sitemap.
 *   - Alles wat een zoekmachine of taalmodel moet lezen staat in de HTML zelf,
 *     niet achter JavaScript: de meeste AI-crawlers voeren geen script uit.
 *   - Een kort antwoordblok bovenaan ("Wat is ...?"), vragen als koppen, een
 *     puntentabel als echte <table>, FAQPage en HowTo in de JSON-LD, en
 *     speakable voor voorlezen.
 *   - Anders: géén automatische doorverwijzing op browsertaal. Googlebot
 *     crawlt met een Engelse browser; wie hem van / naar /en/ stuurt, laat de
 *     Nederlandse pagina nooit zien. Hier staat in plaats daarvan een balkje
 *     "deze pagina bestaat ook in het Duits".
 *   - Anders: geen lettertypen van Google, en statistieken (Google Analytics)
 *     alleen als de bezoeker daar ja op zegt (toestemming.js). llms.txt zegt
 *     dat ook zo, en niet "no trackers": dat klopte niet meer.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { teksten, TALEN, STANDAARD, BASIS, MAKER, INDEXNOW_SLEUTEL, LLMS, OPEN_POULE } from '../site/teksten.mjs';
import { PRIVACY, CONTACT, PRIVACY_BIJGEWERKT, privacyTaal } from '../site/privacy.mjs';
import { PAGINAS, PAGINA_UI } from '../site/paginas.mjs';
import { knipUit } from './knipsel.mjs';
import { uitersten, MIN_RACES } from './circuits.mjs';
import { RACEPAGINAS } from './racepaginas.mjs';
import { openPouleRegel, controleerCode } from './openpoule.mjs';

// "Geen groep? Speel mee in de open poule" onder de knop (scripts/openpoule.mjs).
// Zonder code in site/teksten.mjs niets; een verkeerde code laat het maken zakken.
controleerCode(OPEN_POULE);
// {openPoule} in een antwoord van de FAQ op de voorpagina is een link naar de
// open poule, met als tekst faq.openPoule uit site/teksten.mjs. In de JSON-LD
// en in llms.txt staat op die plek de tekst, woord voor woord zoals op het
// scherm (llms.txt zet de link er tussen haakjes achter). Zonder code valt
// zo'n vraag weg, net als de regel onder de knop: liever geen antwoord dan een
// antwoord zonder de poule waar het over gaat.
const faqItems = (code) => teksten[code].faq.items.filter(([, a]) => OPEN_POULE || !a.includes('{openPoule}'));
const metOpenPoule = (code, antwoord, link) => {
  if (!String(antwoord).includes('{openPoule}')) return antwoord;
  const tekst = teksten[code].faq.openPoule;
  if (!tekst) throw new Error(`site/teksten.mjs: ${code} heeft geen faq.openPoule, de tekst van de link naar de open poule`);
  return String(antwoord).replaceAll('{openPoule}', link(tekst));
};
const openPoule = (code, app, inspring) => {
  const regel = openPouleRegel(OPEN_POULE, code, app);
  return regel ? `\n${inspring}${regel}` : '';
};

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLE = process.argv.includes('--controle');
// Na hoeveel dagen de feiten op de vergelijking opnieuw gecontroleerd moeten
// worden (zoekplan AEO fase 4: elke drie maanden).
const CONTROLE_DAGEN = 92;

// ------------------------------------------------------------
//  De punten komen uit de app, niet uit dit bestand
// ------------------------------------------------------------

const appBron = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
export const PUNTEN = Object.fromEntries([...appBron.matchAll(
  /\{ id:'([a-z0-9_]+)',\s*naam:'[^']*',\s*punten:(\d+),\s*sessie:'([a-z]+)'/g)]
  .map((m) => [m[1], { punten: Number(m[2]), sessie: m[3] }]));
const presetVragen = (naam) => {
  const m = appBron.match(new RegExp(`${naam}:\\s*\\{[^}]*?vragen:\\[([^\\]]*)\\]`));
  if (!m) throw new Error(`preset ${naam} niet gevonden in app/index.html`);
  return [...m[1].matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]);
};
// Per weekend: zonder sprint (die is er zes keer per jaar) en zonder seizoen.
const perWeekend = (ids) => ids
  .filter((id) => PUNTEN[id] && !['sprint', 'seizoen'].includes(PUNTEN[id].sessie))
  .reduce((n, id) => n + PUNTEN[id].punten, 0);
// Welke vragen er in elke preset zitten, voor de niveaus op de pagina.
export const PRESET_VRAGEN = {
  simpel: presetVragen('simpel'),
  klassiek: presetVragen('klassiek'),
  gevorderd: presetVragen('gevorderd'),
};
export const PRESET_PUNTEN = {
  simpel: perWeekend(presetVragen('simpel')),
  klassiek: perWeekend(presetVragen('klassiek')),
  gevorderd: perWeekend(presetVragen('gevorderd')),
};
const LOSSE = ['winnaar', 'pole', 'snelste_ronde', 'snelste_pitstop', 'teamgenoot_duels',
               'safety_cars', 'rode_vlag', 'sprint_top10'];
const SEIZOEN = ['kampioen', 'constructeur', 'winnaars', 'vierde_team'];
for (const id of [...LOSSE, ...SEIZOEN, 'quali_top10', 'race_top10']) {
  if (!PUNTEN[id]) throw new Error(`vraag ${id} niet gevonden in app/index.html`);
}
// De plekpunten, uit de formule in scoreLijst(): max(0, 5 - 2 × verschil).
// Dat is 5 exact, 3 één plek ernaast, 1 twee plekken, en daarna niets.
const formule = appBron.match(/Math\.max\(0, (\d+) - (\d+) \* Math\.abs\(i - echt\)\)/);
if (!formule) throw new Error('de puntenformule van scoreLijst() niet gevonden in app/index.html');
export const PLEKPUNTEN = [0, 1, 2, 3].map((d) => Math.max(0, Number(formule[1]) - Number(formule[2]) * d));
// Een rekenvoorbeeld in een gids rekent de app zelf uit: scoreLijst() uit het
// blok <knip primitieven>, dezelfde code die in de app de punten geeft. Een
// voorbeeld dat met de hand is opgeteld, loopt uit de pas zodra de telling
// verandert; dit niet.
const { scoreLijst } = await import(`data:text/javascript,${encodeURIComponent(knipUit(appBron, 'primitieven'))}`);

// Wat de gidsen over de app zeggen, ook uit de app zelf (en uit de twee
// scripts die de meldingen sturen). Een gids die "vijf jokers" zegt terwijl de
// app er drie geeft, is erger dan geen gids.
const uitBron = (bron, re, wat) => {
  const m = bron.match(re);
  if (!m) throw new Error(`${wat} niet gevonden`);
  return m;
};
const JOKERS = Number(uitBron(appBron, /const JOKERS_STANDAARD = (\d+);/, 'JOKERS_STANDAARD in app/index.html')[1]);
const JOKERS_MAX = Math.max(...uitBron(appBron, /const JOKERKEUZES = \[([\d, ]+)\];/, 'JOKERKEUZES in app/index.html')[1]
  .split(',').map(Number));
const VENSTER = Number(uitBron(readFileSync(join(wortel, 'scripts', 'herinneringen.mjs'), 'utf8'),
  /export const VENSTER_UREN = (\d+);/, 'VENSTER_UREN in scripts/herinneringen.mjs')[1]);
const AGENDA_UUR = Number(uitBron(readFileSync(join(wortel, 'scripts', 'agenda.mjs'), 'utf8'),
  /'TRIGGER:-PT(\d+)H'/, 'de melding in scripts/agenda.mjs')[1]);
// De talen van de app: wat beginTaal() in app/index.html als keuze aanneemt.
// llms.txt noemt ze (en zegt wanneer de app dus niet past).
const APP_TALEN = uitBron(appBron, /if \((gekozen === '[a-z]{2}'(?: \|\| gekozen === '[a-z]{2}')*)\) return gekozen;/,
  'de talen in beginTaal() van app/index.html')[1].match(/'[a-z]{2}'/g).map((x) => x.slice(1, -1));
// Contrair voorspellen (contrairVoor() in de app): een goed antwoord op een
// losse vraag telt zwaarder naarmate minder spelers hetzelfde zeiden. De
// vermenigvuldiger is min(1 + (1 - aandeel), 2), afgerond op één decimaal, en
// alleen als minstens twee spelers de vraag zelf invulden. De gids over de
// puntentelling rekent er een voorbeeld mee uit. Die tekst zegt "tot bijna
// dubbel", "één decimaal" en "maar één speler"; verandert de regel in de app,
// dan stopt de generator hier in plaats van dat de gids stilletjes iets anders
// zegt dan de app doet.
const CONTRAIR = (() => {
  const m = uitBron(appBron,
    /Math\.round\(Math\.min\(1 \+ \(1 - zelfdeAntwoord \/ gegeven\.length\), (\d+(?:\.\d+)?)\) \* (\d+)\) \/ \2;/,
    'de formule van contrairVoor() in app/index.html');
  const min = Number(uitBron(appBron, /if \(gegeven\.length < (\d+)\) return 1;/,
    'het minimum aantal antwoorden in contrairVoor() in app/index.html')[1]);
  const regel = { max: Number(m[1]), stap: Number(m[2]), min };
  if (regel.max !== 2 || regel.stap !== 10 || regel.min !== 2) {
    throw new Error(`contrairVoor() in app/index.html rekent anders dan de gids zegt (${JSON.stringify(regel)}): `
      + 'werk de sectie over contrair voorspellen in site/paginas.mjs bij, en dan deze controle');
  }
  return regel;
})();
export const contrairKeer = (zelfde, totaal) =>
  Math.round(Math.min(1 + (1 - zelfde / totaal), CONTRAIR.max) * CONTRAIR.stap) / CONTRAIR.stap;
// Het puntenschema van het WK zelf. De app gebruikt het alleen voor een
// standaardlijst, maar de gids over puntentellingen vergelijkt ermee.
const WK_PUNTEN = uitBron(appBron, /const WK_PUNTEN = \[([\d, ]+)\];/, 'WK_PUNTEN in app/index.html')[1]
  .split(',').map(Number);
// De circuitcijfers (zoekplan GEO 3.2): safety cars en rode vlaggen per
// circuit, geteld door scripts/circuits.mjs met de regels van de app. De
// workflow "Circuitcijfers" schrijft het bestand en maakt daarna de site
// opnieuw, zodat de pagina's meteen de nieuwe cijfers tonen.
const CIRCUITS_PAD = join(wortel, 'site', 'data', 'circuits.json');
const CIRCUITS = existsSync(CIRCUITS_PAD) ? JSON.parse(readFileSync(CIRCUITS_PAD, 'utf8')) : null;
// De getallen uit de app die in elke tekst als {naam} kunnen staan, op de
// voorpagina (site/teksten.mjs) en in de gidsen (site/paginas.mjs): de punten
// per vraag onder hun id ({winnaar}, {pole}, {sprint_top10}), de plekpunten
// ({exact}, {een}, {twee}), een perfecte top 10 ({perfect}), de niveaus
// ({simpel}, {klassiek}, {gevorderd}) en het grootste aantal vragen ({meest}).
// Een getal voor een puntenwoord staat nooit letterlijk in een tekst
// (test/site.test.mjs). Komt een getal bewust niet uit de app, zoals de punten
// van een echte F1-zege, dan schrijf je {=25}: dat blijft 25.
const APP_GETALLEN = {
  ...Object.fromEntries(Object.entries(PUNTEN).map(([id, v]) => [id, v.punten])),
  exact: PLEKPUNTEN[0], een: PLEKPUNTEN[1], twee: PLEKPUNTEN[2], perfect: 10 * PLEKPUNTEN[0],
  ...PRESET_PUNTEN, meest: PRESET_VRAGEN.gevorderd.length,
};
if (APP_GETALLEN.perfect !== PUNTEN.race_top10.punten) {
  throw new Error(`tien keer ${PLEKPUNTEN[0]} is niet ${PUNTEN.race_top10.punten}, het maximum van race_top10 in app/index.html`);
}
// De {namen} die in site/paginas.mjs kunnen staan: alles van hierboven, en wat
// alleen de gidsen nodig hebben.
const feitenVoor = (code) => ({
  ...APP_GETALLEN,
  bijna: PLEKPUNTEN[1], top10: PUNTEN.race_top10.punten, sprint: PUNTEN.sprint_top10.punten,
  nSimpel: PRESET_VRAGEN.simpel.length, nKlassiek: PRESET_VRAGEN.klassiek.length, nGevorderd: PRESET_VRAGEN.gevorderd.length,
  jokers: JOKERS, jokersMax: JOKERS_MAX,
  venster: PAGINA_UI[code].uren(VENSTER), agendaUur: PAGINA_UI[code].uren(AGENDA_UUR),
  winnaar: PUNTEN.winnaar.punten, pole: PUNTEN.pole.punten, nSeizoen: SEIZOEN.length,
  formMax: formule[1], formStap: formule[2],
  // De vaste zinnen (GEO 1.1), zodat de about-pagina ze letterlijk overneemt.
  kernzin: zin(code, 'kernzin'), makerzin: zin(code, 'makerzin'),
  // De spreadsheetformule uit dezelfde twee getallen als scoreLijst().
  formuleNL: `=ALS(C2="";0;MAX(0;${formule[1]}-${formule[2]}*ABS(B2-C2)))`,
  formuleEN: `=IF(C2="",0,MAX(0,${formule[1]}-${formule[2]}*ABS(B2-C2)))`,
  wkPunten: WK_PUNTEN.join(', '), wkEerste: WK_PUNTEN[0], wkLaatste: WK_PUNTEN.at(-1),
  ...circuitFeiten(code),
});
// De circuitcijfers als {namen}: {scRaces} races sinds {scVanaf} tot en met
// {scTot}, waarvan {scMet} met een safety car en {rvMet} met een rode vlag,
// gemiddeld {scGemiddeld} safety cars per race, en het circuit met de meeste
// ({scMeestPlek}: {scMeestAantal} in {scMeestRaces} races) en de minste
// ({scMinstPlek}, {scMinstAantal}, {scMinstRaces}) per race, van de circuits
// met minstens {scMinRaces} races (uitersten() in scripts/circuits.mjs).
function circuitFeiten(code) {
  if (!CIRCUITS) return {};
  const { gemiddeld, meest, minst } = uitersten(CIRCUITS);
  return {
    scVanaf: CIRCUITS.vanaf, scTot: datumTekst(code, CIRCUITS.tot), scRaces: CIRCUITS.races,
    scMet: CIRCUITS.metSafetyCar, rvMet: CIRCUITS.metRodeVlag,
    scGemiddeld: new Intl.NumberFormat(code, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(gemiddeld),
    scMeestPlek: meest.locatie, scMeestAantal: meest.safetyCars, scMeestRaces: meest.races,
    scMinstPlek: minst.locatie, scMinstAantal: minst.safetyCars, scMinstRaces: minst.races,
    scMinRaces: MIN_RACES,
  };
}

// ------------------------------------------------------------
//  Hulpjes
// ------------------------------------------------------------

// De naam van een vraag op de pagina: de twee top 10's uit de niveaus, de rest
// uit de puntentabel, zonder wat er tussen haakjes achter staat.
const vraagNaam = (t, id) => id === 'quali_top10' ? t.niveaus.top10[0]
  : id === 'race_top10' ? t.niveaus.top10[1]
  : String(t.punten.vragen[id] ?? id).replace(/\s*\(.*\)$/, '');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// {naam} wordt vars.naam; {=25} blijft 25 (een getal dat bewust niet uit de app komt).
const vul = (tekst, vars) => String(tekst).replace(/\{(=?)(\w+)\}/g, (heel, letterlijk, k) =>
  (letterlijk ? k : vars[k] ?? heel));

// Het verhaal dat overal letterlijk hetzelfde is (zoekplan GEO 1.1): de
// kernzin, de korte kernzin en de zin over de maker, met het domein uit BASIS.
// Het antwoordblok "Wat is Predict the Race?" begint met de kernzin.
const DOMEIN = new URL(BASIS).host;
const zin = (code, welke) => vul(teksten[code][welke], { domein: DOMEIN });
const antwoordVan = (code) => `${zin(code, 'kernzin')} ${vul(teksten[code].antwoord.vervolg, { domein: DOMEIN })}`;
// De maker in de JSON-LD, in de taal van de pagina. Eén keer beschreven, overal
// dezelfde @id; sameAs alleen met profielen die echt van hem zijn.
// url: de about-pagina (in deze taal, anders de Engelse) zodra die er is, tot
// dan zijn GitHub-profiel. Op de about-pagina zelf komt het adres erbij.
const overUrl = (code) => {
  const over = PAGINAS.find((pg) => pg.id === 'over');
  if (!over) return MAKER.url;
  return paginaUrl(over, over.talen[code] ? code : over.talen.en ? 'en' : Object.keys(over.talen)[0]);
};
const persoon = (code) => ({ '@type': 'Person', '@id': `${BASIS}/#maker`, name: MAKER.naam, url: overUrl(code),
  description: zin(code, 'makerzin'), sameAs: MAKER.sameAs });
const urlVan = (code) => `${BASIS}/${teksten[code].pad ? teksten[code].pad + '/' : ''}`;
// Relatief van de ene pagina naar de andere: werkt op het eigen domein én op
// dannydevis.github.io/F1-Poule/, waar alles een map dieper staat.
const naar = (van, doel) => `${teksten[van].pad ? '../' : ''}${teksten[doel].pad ? teksten[doel].pad + '/' : ''}`;
const voor = (code) => (teksten[code].pad ? '../' : '');
const PRIVACY_TALEN = Object.keys(PRIVACY);
const privacyUrl = (taal) => `${BASIS}/${PRIVACY[taal].pad}/`;
// Van een landingspagina naar de privacyverklaring in zijn taal, of de Engelse.
const naarPrivacy = (code) => `${voor(code)}${PRIVACY[privacyTaal(code)].pad}/`;
const privacyHreflang = (code) => (privacyTaal(code) === code ? '' : ` hreflang="${privacyTaal(code)}"`);

// ------------------------------------------------------------
//  Vormgeving: dezelfde tokens en letters als de app
// ------------------------------------------------------------

const lettertypen = (p) => [
  ['Barlow', 400, 'barlow-400'], ['Barlow', 600, 'barlow-600'],
  ['Barlow Condensed', 700, 'barlow-condensed-700'], ['Space Mono', 400, 'space-mono-400'],
].map(([familie, gewicht, bestand]) => `
  @font-face{font-family:'${familie}';font-style:normal;font-weight:${gewicht};font-display:swap;
    src:url(${p}lettertypen/${bestand}-latin.woff2) format('woff2');
    unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
  @font-face{font-family:'${familie}';font-style:normal;font-weight:${gewicht};font-display:swap;
    src:url(${p}lettertypen/${bestand}-latin-ext.woff2) format('woff2');
    unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1E00-1E9F,U+1EF2-1EFF,U+20A0-20AB,U+20AD-20C0,U+2C60-2C7F,U+A720-A7FF}`).join('');

const CSS = `
  :root{
    --bg:#f2f1ee;--paneel:#fff;--paneel2:#e9e8e4;--lijn:#dcdad5;
    --ink:#14151a;--ink2:#5b5f67;--ink3:#696e75;--accent:#d93d24;--accent-ink:#fff;
    --accent-tekst:#bf3219;--groen:#117c3e;--accent-vlak:rgba(217,61,36,.10);
    --nacht:#0b0b0c;--nacht2:#15161a;--nacht-lijn:#2b2e35;--nacht-ink:#f2f3f5;--nacht-ink2:#aab0b8;
    --sans:Barlow,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;
    --cond:"Barlow Condensed","Roboto Condensed","Arial Narrow",var(--sans);
    --mono:"Space Mono",ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  }
  @media (prefers-color-scheme:dark){:root{
    --bg:#0b0b0c;--paneel:#15161a;--paneel2:#1d1f24;--lijn:#2b2e35;
    --ink:#f2f3f5;--ink2:#a4aab2;--ink3:#8a9099;--accent:#ee4d33;--accent-ink:#0b0b0c;
    --accent-tekst:#f26a52;--groen:#34b264;--accent-vlak:rgba(238,77,51,.14);--kerb:#f2f3f5;
  }}
  *{box-sizing:border-box}
  html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
  @media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation:none!important;transition:none!important}}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:17px;line-height:1.55}
  a{color:inherit}
  :focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}
  .binnen{max-width:1120px;margin:0 auto;padding:0 20px}
  .label{font-family:var(--mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink3)}
  .alleenlezer{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}

  /* ---- kop ---- */
  .kop{position:sticky;top:0;z-index:20;background:rgba(11,11,12,.92);backdrop-filter:saturate(1.4) blur(10px);
    -webkit-backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid var(--nacht-lijn);color:var(--nacht-ink)}
  .kop .binnen{display:flex;align-items:center;gap:18px;min-height:64px}
  /* Hoe ver je op de pagina bent, als een rondeteller onder de kop. */
  .voortgang{position:absolute;left:0;right:0;bottom:-1px;height:2px;pointer-events:none;
    background:linear-gradient(90deg,#ee4d33,#ff9a6b);transform-origin:0 50%;transform:scaleX(0)}
  .merk{display:flex;align-items:center;gap:10px;text-decoration:none;margin-right:auto;min-height:44px}
  .merk .blok{width:24px;height:24px;flex:none;display:block}
  .merk b{font-family:var(--cond);font-size:20px;letter-spacing:.03em;text-transform:uppercase;white-space:nowrap}
  .kopnav{display:none;gap:22px}
  .kopnav a{text-decoration:none;font-size:15px;font-weight:600;color:var(--nacht-ink2);padding:10px 0}
  .kopnav a:hover{color:var(--nacht-ink)}
  .taalmenu{position:relative}
  .taalmenu summary{list-style:none;cursor:pointer;font-family:var(--mono);font-size:13px;letter-spacing:.1em;
    border:1px solid var(--nacht-lijn);border-radius:8px;padding:0 10px;min-height:44px;min-width:52px;
    display:flex;align-items:center;justify-content:center;color:var(--nacht-ink2)}
  .taalmenu summary::-webkit-details-marker{display:none}
  .taalmenu[open] summary,.taalmenu summary:hover{color:var(--nacht-ink);border-color:var(--nacht-ink2)}
  .taalmenu ul{position:absolute;right:0;top:calc(100% + 8px);margin:0;padding:6px;list-style:none;min-width:170px;
    background:var(--nacht2);border:1px solid var(--nacht-lijn);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.4)}
  .taalmenu a{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:8px;
    text-decoration:none;font-size:15px;color:var(--nacht-ink)}
  .taalmenu a:hover{background:#1d1f24}
  .taalmenu a[aria-current="page"]{color:var(--accent);font-weight:600}
  .taalmenu a span{font-family:var(--mono);font-size:12px;color:var(--nacht-ink2)}
  .knop{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;padding:0 20px;
    border-radius:10px;border:0;font:inherit;font-size:16px;font-weight:600;text-decoration:none;cursor:pointer;
    background:var(--accent);color:var(--accent-ink);box-shadow:0 10px 26px -12px var(--accent);transition:filter .15s,transform .15s}
  .knop:hover{filter:brightness(1.08)}
  .knop:active{transform:scale(.985)}
  /* Een lichtstreep die over de knop veegt, en het pijltje dat een stukje
     meeschuift. Klein, maar een knop voelt zo als iets dat je kunt indrukken. */
  .knop{position:relative;overflow:hidden;isolation:isolate}
  .knop::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
    background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.38) 50%,transparent 65%);
    transform:translateX(-120%);transition:transform .7s ease}
  .knop:hover::after{transform:translateX(120%)}
  .knop span[aria-hidden]{display:inline-block;transition:transform .2s ease}
  .knop:hover span[aria-hidden]{transform:translateX(4px)}
  .knop.klein{min-height:44px;padding:0 16px;font-size:15px}
  .kop .knop{display:none}

  /* ---- hero: altijd donker, zoals een nachtrace ---- */
  .hero{position:relative;overflow:hidden;isolation:isolate;background:var(--nacht);color:var(--nacht-ink);
    padding:56px 0 64px}
  .hero::before{content:"";position:absolute;inset:0;z-index:-1;
    background:radial-gradient(70% 60% at 12% 8%,rgba(238,77,51,.22),transparent 60%),
      radial-gradient(50% 50% at 95% 100%,rgba(238,77,51,.10),transparent 60%)}
  .hero::after{content:"P1";position:absolute;z-index:-1;right:-2%;top:-6%;font-family:var(--cond);font-weight:700;
    font-size:min(46vw,440px);line-height:1;color:#fff;opacity:.035;pointer-events:none}
  /* De livrei van de app (zoals op de deelplaatjes) rechtsboven, en een paar
     snelheidsstrepen die door het beeld schieten. */
  .livrei{position:absolute;z-index:-1;top:0;right:0;width:min(46vw,320px);aspect-ratio:1;pointer-events:none;
    background:linear-gradient(45deg,transparent 58%,#ee4d33 58% 66%,transparent 66% 71%,rgba(238,77,51,.38) 71% 74%,transparent 74%)}
  .snelheid{position:absolute;inset:0;z-index:-1;overflow:hidden;pointer-events:none}
  .snelheid i{position:absolute;left:0;height:1px;width:180px;opacity:0;transform:translateX(-220px);
    background:linear-gradient(90deg,transparent,rgba(238,77,51,.8),rgba(255,255,255,.7));border-radius:1px}
  html.beweegt .snelheid i{animation:streep 6s cubic-bezier(.6,0,.4,1) infinite}
  .snelheid i:nth-child(1){top:16%;animation-delay:.6s}
  .snelheid i:nth-child(2){top:34%;animation-delay:2.8s;animation-duration:7s}
  .snelheid i:nth-child(3){top:55%;animation-delay:1.7s;animation-duration:5.5s}
  .snelheid i:nth-child(4){top:71%;animation-delay:4.1s}
  .snelheid i:nth-child(5){top:86%;animation-delay:3.3s;animation-duration:6.5s}
  .snelheid i:nth-child(6){top:95%;animation-delay:5.2s;animation-duration:8s}
  /* Een streep schiet in een kwart van de tijd door het beeld, en wacht dan. */
  @keyframes streep{0%{transform:translateX(-220px);opacity:0}3%{opacity:.8}24%{opacity:.5}
    28%,100%{transform:translateX(calc(100vw + 40px));opacity:0}}

  /* De startlichten: vijf keer rood, en dan uit. Lights out. */
  .startrij{display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px}
  .startlichten{display:inline-flex;gap:8px;padding:8px 10px;border-radius:12px;background:#111216;
    border:1px solid var(--nacht-lijn)}
  .startlichten i{width:16px;height:16px;border-radius:50%;background:#2a2c33}
  html.beweegt .hero .startlichten i{animation:lampAan .12s ease-out both,lampUit .3s ease-in 2.3s forwards}
  .hero .startlichten i:nth-child(1){animation-delay:.35s,2.3s}
  .hero .startlichten i:nth-child(2){animation-delay:.7s,2.3s}
  .hero .startlichten i:nth-child(3){animation-delay:1.05s,2.3s}
  .hero .startlichten i:nth-child(4){animation-delay:1.4s,2.3s}
  .hero .startlichten i:nth-child(5){animation-delay:1.75s,2.3s}
  @keyframes lampAan{from{background:#2a2c33;box-shadow:none}to{background:#ee4d33;box-shadow:0 0 14px 2px rgba(238,77,51,.75)}}
  @keyframes lampUit{from{background:#ee4d33;box-shadow:0 0 14px 2px rgba(238,77,51,.75)}to{background:#2a2c33;box-shadow:none}}

  /* De kop en de rest komen kort na elkaar op, en bij lights out veegt er
     een lichtstreep over "Versla je vrienden". */
  html.beweegt .hero h1>span,html.beweegt .hero .sub,html.beweegt .hero .actie,html.beweegt .hero .vertrouwen{
    animation:opkomst .8s cubic-bezier(.2,.7,.2,1) both}
  html.beweegt .hero .sub{animation-delay:.25s}
  html.beweegt .hero .actie{animation-delay:.38s}
  html.beweegt .hero .vertrouwen{animation-delay:.5s}
  @keyframes opkomst{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
  html.beweegt .hero h1>span+span{animation-delay:.12s}
  /* De glans: de letters zelf krijgen een verloop met een lichte streep erin
     (de kleur blijft het accent, alleen de vulling verandert), en die streep
     schuift er bij lights out één keer overheen.
     Het verloop is drie keer zo breed als de regel en schuift alleen tussen
     100% en 0%: daartussen dekt het altijd de hele regel. (Daarbuiten viel
     een deel van de letters weg: eerst "vrienden", na de glans "versla je".)
     Het zit op een eigen binnenste element, los van de opkomst: Safari tekent
     een tekstverloop op een element dat zelf beweegt niet altijd goed, en
     clone geeft een regel die afbreekt op elke regel zijn eigen verloop. */
  html.beweegt .hero h1 .glans{
    background:linear-gradient(100deg,var(--accent) 44%,#ffd2c4 50%,var(--accent) 56%) 100% 0/300% 100% no-repeat;
    -webkit-box-decoration-break:clone;box-decoration-break:clone;
    -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
    animation:glans 1.2s ease-out 2.35s both}
  @keyframes glans{from{background-position:100% 0}to{background-position:0 0}}
  html.beweegt .hero .knop{animation:opkomst .8s cubic-bezier(.2,.7,.2,1) .38s both,puls 1.4s ease-out 2.4s}
  @keyframes puls{0%{box-shadow:0 0 0 0 rgba(238,77,51,.55)}100%{box-shadow:0 0 0 18px rgba(238,77,51,0)}}
  .hero .binnen{display:grid;gap:44px}
  .boven{display:inline-flex;align-items:center;gap:10px;font-family:var(--mono);font-size:12px;letter-spacing:.16em;
    text-transform:uppercase;color:#7ee0a3;border:1px solid rgba(52,178,100,.45);background:rgba(52,178,100,.10);
    border-radius:999px;padding:7px 14px}
  .boven::before{content:"";width:8px;height:8px;border-radius:50%;background:#34b264}
  .hero h1{font-family:var(--cond);font-weight:700;text-transform:uppercase;font-size:clamp(46px,9vw,84px);
    line-height:.92;letter-spacing:.005em;margin:22px 0 20px}
  /* "Startaufstellung" is het langste woord in alle zeven koppen: op een
     smalle telefoon krimpt de Duitse kop mee, anders valt de punt eraf. */
  html[lang="de"] .hero h1{font-size:min(clamp(46px,9vw,84px),11.2vw)}
  .hero h1>span{display:block}
  .hero h1>span+span{color:var(--accent)}
  .hero .sub{font-size:19px;color:var(--nacht-ink2);max-width:36em;margin:0 0 28px}
  .actie{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end}
  .codeveld{display:flex;flex-direction:column;gap:6px}
  .codeveld label{font-size:13px;color:var(--nacht-ink2)}
  .codeveld div{display:flex;border:1px solid var(--nacht-lijn);border-radius:10px;overflow:hidden;background:var(--nacht2)}
  .codeveld input{width:128px;min-height:46px;border:0;background:none;color:var(--nacht-ink);padding:0 14px;
    font-family:var(--mono);font-size:17px;letter-spacing:.18em;text-transform:uppercase}
  .codeveld input::placeholder{color:#6f757e}
  .codeveld input:focus{outline:none}
  .codeveld div:focus-within{border-color:var(--nacht-ink2)}
  .codeveld button{border:0;border-left:1px solid var(--nacht-lijn);background:none;color:var(--nacht-ink);
    font:inherit;font-weight:600;font-size:15px;padding:0 16px;cursor:pointer;min-height:46px}
  .codeveld button:hover{background:#1d1f24}
  .vertrouwen{display:flex;flex-wrap:wrap;gap:8px 20px;margin:26px 0 0;padding:0;list-style:none;
    font-size:14px;color:var(--nacht-ink2)}
  .vertrouwen li{display:flex;align-items:center;gap:8px}
  .vertrouwen li::before{content:"✓";color:#34b264;font-weight:700}
  .telefoon{justify-self:center;position:relative;width:min(300px,78vw)}
  .telefoon .scherm{border-radius:34px;border:8px solid #1d1f24;background:#1d1f24;overflow:hidden;
    box-shadow:0 40px 80px -30px rgba(0,0,0,.8),0 0 0 1px #2b2e35;transform:rotate(-2deg)}
  .telefoon img{display:block;width:100%;height:auto}
  .telefoon .achter{position:absolute;width:82%;right:-26%;top:12%;z-index:-1;transform:rotate(6deg);opacity:.55}
  html.beweegt .telefoon .scherm:not(.achter){animation:telefoonIn 1s cubic-bezier(.2,.7,.2,1) .15s both}
  html.beweegt .telefoon .achter{animation:telefoonAchter 1.1s cubic-bezier(.2,.7,.2,1) .4s both}
  @keyframes telefoonIn{from{opacity:0;transform:translateY(46px) rotate(5deg)}to{opacity:1;transform:rotate(-2deg)}}
  @keyframes telefoonAchter{from{opacity:0;transform:translateX(40px) rotate(14deg)}to{opacity:.55;transform:rotate(6deg)}}
  /* Meldingen die om de telefoon zweven: wat er in een weekend gebeurt. */
  .zweef{position:absolute;z-index:2;display:inline-flex;align-items:center;gap:8px;padding:9px 13px;border-radius:12px;
    background:rgba(21,22,26,.94);border:1px solid var(--nacht-lijn);color:var(--nacht-ink);font-size:14px;font-weight:600;
    white-space:nowrap;box-shadow:0 16px 34px -14px rgba(0,0,0,.8)}
  .zweef::before{content:"";width:9px;height:9px;border-radius:50%;background:#34b264;flex:none}
  .zweef-1{top:9%;left:-4%}
  .zweef-2{top:45%;right:-4%}
  .zweef-2::before{background:#ee4d33}
  .zweef-3{bottom:9%;left:2%}
  .zweef-3::before{background:#e0a53a}
  html.beweegt .zweef{animation:zweefIn .6s cubic-bezier(.2,.9,.3,1.3) both,zweven 5s ease-in-out infinite}
  html.beweegt .zweef-1{animation-delay:1s,1.6s}
  html.beweegt .zweef-2{animation-delay:1.5s,2.4s}
  html.beweegt .zweef-3{animation-delay:2.5s,3.1s}
  @keyframes zweefIn{from{opacity:0;transform:translateY(14px) scale(.9)}to{opacity:1;transform:none}}
  @keyframes zweven{0%,100%{translate:0 0}50%{translate:0 -7px}}

  /* De ticker onder de hero, als de balk onderin een tv-uitzending. */
  .ticker{overflow:hidden;background:#ee4d33;color:#0b0b0c;border-block:1px solid #b92f19}
  .ticker .rol{display:flex;width:max-content}
  html.beweegt .ticker .rol{animation:tikker 42s linear infinite}
  .ticker:hover .rol{animation-play-state:paused}
  .ticker span{display:inline-flex;align-items:center;gap:20px;padding:13px 20px 13px 0;font-family:var(--mono);font-size:13px;
    font-weight:700;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}
  .ticker span::after{content:"";width:14px;height:14px;flex:none;border:1px solid #0b0b0c;
    background:repeating-conic-gradient(#0b0b0c 0 25%,transparent 0 50%) 0 0/7px 7px}
  @keyframes tikker{to{transform:translateX(-50%)}}

  /* ---- in beeld schuiven ----
     Alleen als er JavaScript is en niemand om minder beweging vroeg (dan zet
     het scriptje in <head> html.beweegt). Zonder dat staat alles er gewoon.
     Het vangnet: loopt het script onderaan om wat voor reden niet, dan komt
     alles na tweeënhalve seconde alsnog tevoorschijn. */
  html.beweegt .onthul{transition:opacity .75s cubic-bezier(.2,.7,.2,1),transform .75s cubic-bezier(.2,.7,.2,1);
    transition-delay:calc(var(--i,0) * 90ms)}
  html.beweegt .onthul:not(.zichtbaar){opacity:0;transform:var(--start,translateY(28px))}
  html.beweegt:not(.klaar) .onthul{animation:vangnet .01s 2.5s forwards}
  @keyframes vangnet{to{opacity:1;transform:none}}

  /* Een sectiekop: een genummerd label, en daaronder de kop met een kerbstrook
     (rood-wit, zoals de randen van een circuit) die zich uittekent. */
  .sectiekop{margin-bottom:30px}
  .sectiekop .label{display:inline-flex;align-items:center;gap:12px}
  .sectiekop .label b{color:var(--accent-tekst);font-weight:700}
  .sectiekop .label b::after{content:"";display:inline-block;width:26px;height:1px;background:currentColor;
    margin-left:12px;vertical-align:middle;opacity:.7}
  .sectiekop h2{margin:14px 0 0;font-size:clamp(36px,6vw,62px);line-height:.95;max-width:15em}
  .sectiekop h2::after{content:"";display:block;width:84px;height:6px;margin-top:20px;border-radius:1px;
    background:repeating-linear-gradient(90deg,#ee4d33 0 14px,var(--kerb,#fff) 14px 28px);
    transform-origin:0 50%;transition:transform .9s cubic-bezier(.2,.7,.2,1) .3s}
  html.beweegt .sectiekop:not(.zichtbaar) h2::after{transform:scaleX(0)}
  .antwoord .binnen{display:grid;gap:14px}
  .cijfers{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .cijfers li{background:var(--paneel);border:1px solid var(--lijn);border-radius:16px;padding:18px 14px;
    display:flex;flex-direction:column;gap:6px}
  .cijfers b{font-family:var(--cond);font-size:clamp(44px,8vw,68px);line-height:.85;color:var(--accent-tekst)}
  .cijfers span{font-size:14px;line-height:1.3;color:var(--ink2)}

  /* ---- secties ---- */
  section[id]{scroll-margin-top:76px}
  section.blok{padding:72px 0}
  section.blok+section.blok{border-top:1px solid var(--lijn)}
  h2{font-family:var(--cond);font-weight:700;text-transform:uppercase;font-size:clamp(32px,5vw,46px);
    line-height:1;margin:10px 0 18px;letter-spacing:.01em}
  h3{font-size:18px;margin:0 0 6px;line-height:1.3}
  .inleiding{font-size:18px;color:var(--ink2);max-width:40em;margin:0 0 30px}
  .antwoord{padding:56px 0}
  .antwoord .kader{background:var(--paneel);border:1px solid var(--lijn);border-radius:18px;padding:28px;
    display:grid;gap:10px;max-width:880px}
  .antwoord p{margin:0;font-size:18px;color:var(--ink2)}
  .antwoord h2{font-size:clamp(28px,4vw,36px);margin:0 0 6px}

  /* De vier stappen als een stuk circuit: een kerbstrook die zich uittekent,
     met de stappen als meetpunten erop. */
  .stappen{list-style:none;margin:0;padding:0;display:grid;gap:30px;counter-reset:stap;position:relative}
  .stappen::before{content:"";position:absolute;left:29px;top:6px;bottom:6px;width:6px;border-radius:3px;
    background:repeating-linear-gradient(180deg,#ee4d33 0 14px,var(--kerb,#fff) 14px 28px);
    box-shadow:0 0 0 1px var(--lijn);transform-origin:50% 0;transition:transform 1.4s cubic-bezier(.2,.7,.2,1)}
  html.beweegt .stappen:not(.zichtbaar)::before{transform:scaleY(0)}
  .stappen li{position:relative;padding:4px 0 0 86px;counter-increment:stap;min-height:64px}
  .stappen li::before{content:counter(stap,decimal-leading-zero);position:absolute;left:0;top:0;width:64px;height:64px;
    border-radius:50%;display:grid;place-items:center;background:var(--bg);border:3px solid var(--accent);
    font-family:var(--cond);font-weight:700;font-size:28px;line-height:1;color:var(--ink);
    transition:background .25s,color .25s,transform .25s}
  .stappen li:hover::before{background:var(--accent);color:var(--accent-ink);transform:scale(1.06)}
  .stappen h3{font-size:20px;margin:8px 0 6px}
  .stappen p{margin:0;color:var(--ink2);font-size:16px}

  .tabel{width:100%;border-collapse:separate;border-spacing:0;background:var(--paneel);border:1px solid var(--lijn);
    border-radius:16px;overflow:hidden;font-size:16px}
  .tabel th,.tabel td{padding:14px 18px;text-align:left;border-top:1px solid var(--lijn)}
  .tabel thead th{border-top:0;font-family:var(--mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;
    color:var(--ink2);font-weight:400;background:var(--paneel2)}
  .tabel td:last-child,.tabel th:last-child{text-align:right;width:36%}
  .tabel td:last-child{font-family:var(--cond);font-weight:700;font-size:26px;line-height:1}
  .tabel tr.top td:last-child{color:var(--accent-tekst)}
  /* Onder elke regel een balk naar hoeveel punten het is; ze groeien als de
     tabel in beeld komt. */
  .tabel tbody td:first-child{position:relative}
  .tabel tbody td:first-child::after{content:"";position:absolute;left:18px;bottom:6px;height:3px;border-radius:2px;
    width:calc((100% - 36px) * var(--w,0));background:var(--accent);opacity:.85;transform-origin:0 50%;
    transition:transform .9s cubic-bezier(.2,.7,.2,1) calc(var(--i,0) * 80ms + .2s)}
  html.beweegt .tabel:not(.zichtbaar) tbody td:first-child::after{transform:scaleX(0)}
  .tabel tbody tr{transition:background .2s}
  .tabel tbody tr:hover{background:var(--accent-vlak)}
  .tabellen{display:grid;gap:18px;margin-top:18px;align-items:start}
  .tabellen .tabel td:last-child{font-size:22px}
  /* De links naar de gidsen, onder het blok waar ze bij horen. */
  .verder{margin:18px 0 0}
  .verder a{color:var(--accent-tekst);font-weight:600}
  .voorbeeld{margin:18px 0 0;color:var(--ink2);font-size:16px}
  .presets{margin:22px 0 0;color:var(--ink2);font-size:16px;border-left:3px solid var(--accent);padding-left:14px}

  /* ---- de niveaus: altijd donker, als een tweede hero midden op de pagina.
     Drie kaarten met de startlichten als maatstaf: één lampje voor Simpel,
     drie voor Klassiek, alle vijf voor Gevorderd. Het grote getal op de
     achtergrond is het aantal vragen van Gevorderd (uit de app). ---- */
  .niveaus{position:relative;overflow:hidden;isolation:isolate;background:var(--nacht);color:var(--nacht-ink);padding:76px 0}
  .niveaus::before{content:"";position:absolute;inset:0;z-index:-1;
    background:radial-gradient(60% 60% at 88% 0%,rgba(238,77,51,.20),transparent 60%),
      radial-gradient(50% 50% at 0% 100%,rgba(238,77,51,.08),transparent 60%)}
  .niveaus::after{content:attr(data-meest);position:absolute;z-index:-1;right:-1%;bottom:-12%;font-family:var(--cond);
    font-weight:700;font-size:min(52vw,520px);line-height:1;color:#fff;opacity:.035;pointer-events:none}
  .niveaus .label{color:#8a9099}
  .niveaus .label b{color:#ee4d33}
  .niveaus{--kerb:#f2f3f5}
  .niveau{transition:transform .25s ease,box-shadow .25s ease}
  .niveau:hover{transform:translateY(-4px)}
  .lampen i{transition:background .25s ease calc(var(--l,0) * 140ms + .35s),box-shadow .25s ease calc(var(--l,0) * 140ms + .35s)}
  html.beweegt .niveau:not(.zichtbaar) .lampen i.aan{background:#26282e;box-shadow:inset 0 0 0 2px #1d1f24}
  .niveaus h2{font-size:clamp(38px,6.4vw,64px);line-height:.95}
  .niveaus h2>span{display:block}
  .niveaus h2>span+span{color:var(--accent)}
  /* "F1-poule" breekt niet na het streepje. */
  .niveaus h2 .heel{white-space:nowrap}
  .niveaus .inleiding{color:var(--nacht-ink2)}
  .niveaulijst{list-style:none;margin:0;padding:0;display:grid;gap:16px}
  .niveau{position:relative;background:var(--nacht2);border:1px solid var(--nacht-lijn);border-radius:18px;padding:24px;
    display:flex;flex-direction:column;gap:10px}
  .niveau.meest{border-color:#ee4d33;box-shadow:0 24px 60px -30px rgba(238,77,51,.55),inset 0 0 0 1px rgba(238,77,51,.35)}
  .niveau .badge{position:absolute;top:-12px;right:18px;background:#ee4d33;color:#0b0b0c;border-radius:999px;
    padding:4px 12px;font-family:var(--mono);font-size:12px;letter-spacing:.1em;text-transform:uppercase;font-weight:700}
  .lampen{display:flex;gap:6px}
  .lampen i{width:18px;height:18px;border-radius:50%;background:#26282e;box-shadow:inset 0 0 0 2px #1d1f24}
  .lampen i.aan{background:#ee4d33;box-shadow:0 0 14px rgba(238,77,51,.7)}
  .niveau h3{font-family:var(--cond);font-size:30px;text-transform:uppercase;letter-spacing:.02em;margin:6px 0 0}
  .niveau .tagline{margin:0;color:var(--nacht-ink2);font-size:16px}
  .niveau .aantal{margin:6px 0 0;display:flex;align-items:baseline;gap:10px;font-family:var(--mono);font-size:13px;
    letter-spacing:.14em;text-transform:uppercase;color:var(--nacht-ink2)}
  .niveau .aantal b{font-family:var(--cond);font-size:64px;line-height:.9;letter-spacing:0;color:var(--nacht-ink)}
  .niveau.meest .aantal b{color:#ee4d33}
  .niveau .weekend{margin:0;font-size:15px;color:var(--nacht-ink2)}
  .chips{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
  .chips li{border:1px solid var(--nacht-lijn);border-radius:999px;padding:4px 10px;font-size:13px;color:var(--nacht-ink)}
  .niveaus .zelf{margin:26px 0 22px;color:var(--nacht-ink2);max-width:44em;border-left:3px solid #ee4d33;padding-left:14px}

  .functies{list-style:none;margin:0;padding:0;display:grid;gap:14px}
  .functies li{position:relative;background:var(--paneel);border:1px solid var(--lijn);border-radius:18px;padding:24px;
    transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease}
  .functies li:hover{transform:translateY(-4px);border-color:var(--accent);box-shadow:0 22px 44px -28px rgba(0,0,0,.45)}
  .functies .icoon{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;margin-bottom:16px;
    background:var(--accent-vlak);color:var(--accent-tekst);transition:transform .3s cubic-bezier(.2,.9,.3,1.4)}
  .functies li:hover .icoon{transform:rotate(-8deg) scale(1.1)}
  .functies .icoon svg{width:24px;height:24px}
  .functies .nr{position:absolute;top:22px;right:22px;font-family:var(--mono);font-size:12px;letter-spacing:.1em;color:var(--ink3)}
  .functies p{margin:0;color:var(--ink2);font-size:16px}
  .functies .breed h3{font-family:var(--cond);font-size:26px;text-transform:uppercase;letter-spacing:.01em}

  .beelden{display:grid;gap:22px}
  .beelden figure{margin:0;display:grid;gap:12px;justify-items:center;text-align:center}
  .beelden .kader{width:min(260px,70vw,100%);border-radius:26px;border:6px solid var(--paneel2);overflow:hidden;
    box-shadow:0 24px 48px -28px rgba(0,0,0,.45)}
  .beelden img{display:block;width:100%;height:auto}
  .beelden figcaption{color:var(--ink2);font-size:15px;max-width:22em}
  .beelden figure{--start:translateY(48px) rotate(var(--r,0deg))}
  .beelden .kader{transition:transform .35s cubic-bezier(.2,.7,.2,1),box-shadow .35s}
  .beelden figure:hover .kader{transform:translateY(-10px) rotate(var(--r,0deg));box-shadow:0 36px 60px -30px rgba(0,0,0,.55)}

  /* Eén kaart over privacy. Hier stond er een tweede naast ("Wie zit
     erachter?"); die is op verzoek weg. Smal gehouden, zodat de regels niet
     over de hele breedte lopen. */
  .los article{background:var(--paneel);border:1px solid var(--lijn);border-radius:18px;padding:26px;max-width:760px}
  .los h2{font-size:clamp(26px,3.4vw,32px);margin:0 0 10px}
  .los p{margin:0;color:var(--ink2)}
  .los a{color:var(--accent-tekst)}

  .faq{display:grid;gap:10px;max-width:880px}
  .faq details{background:var(--paneel);border:1px solid var(--lijn);border-radius:14px;transition:border-color .2s,box-shadow .2s}
  .faq details:hover{border-color:var(--ink3)}
  .faq details[open]{border-color:var(--accent);box-shadow:inset 3px 0 0 var(--accent)}
  .faq summary{cursor:pointer;list-style:none;padding:18px 54px 18px 20px;position:relative}
  .faq summary::-webkit-details-marker{display:none}
  .faq summary::after{content:"+";position:absolute;right:20px;top:50%;transform:translateY(-50%);
    font-family:var(--mono);font-size:20px;color:var(--ink3);transition:transform .2s}
  .faq details[open] summary::after{content:"−"}
  .faq h3{margin:0;font-size:17px}
  .faq p{margin:0;padding:0 20px 20px;color:var(--ink2);font-size:16px}

  .slot{background:var(--nacht);color:var(--nacht-ink);text-align:center;padding:76px 0;position:relative;overflow:hidden;isolation:isolate}
  .slot::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(60% 80% at 50% 0%,rgba(238,77,51,.2),transparent 70%)}
  .slot p{color:var(--nacht-ink2);font-size:18px;margin:0 auto 26px;max-width:32em}
  .openpoule{font-size:15px;color:var(--nacht-ink2);margin:14px 0 0}
  .openpoule a{color:var(--nacht-ink);font-weight:600;text-decoration:underline;text-underline-offset:3px}
  .slot .openpoule,.artikel .slotblok .openpoule{font-size:15px;margin:16px auto 0}
  .slot h2{font-size:clamp(40px,7vw,76px);line-height:.95;max-width:14em;margin:0 auto 18px}
  .slot .startlichten{margin:0 auto 26px;padding:12px 14px;gap:12px;border-radius:16px}
  .slot .startlichten i{width:26px;height:26px}
  html.beweegt .slot .zichtbaar .startlichten i{animation:lampAan .12s ease-out both,lampUit .3s ease-in 2.1s forwards}
  .slot .startlichten i:nth-child(1){animation-delay:.2s,2.1s}
  .slot .startlichten i:nth-child(2){animation-delay:.55s,2.1s}
  .slot .startlichten i:nth-child(3){animation-delay:.9s,2.1s}
  .slot .startlichten i:nth-child(4){animation-delay:1.25s,2.1s}
  .slot .startlichten i:nth-child(5){animation-delay:1.6s,2.1s}
  html.beweegt .slot .zichtbaar .knop{animation:puls 1.4s ease-out 2.2s 2}

  .voet{background:var(--nacht);color:var(--nacht-ink2);border-top:1px solid var(--nacht-lijn);padding:40px 0 48px;font-size:14px}
  .voet .binnen{display:grid;gap:24px}
  .voet ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px 18px}
  .voet a{color:var(--nacht-ink);text-decoration:none;display:inline-block;padding:6px 0}
  .voet a:hover{text-decoration:underline}
  .voet .label{color:#8a9099;display:block;margin-bottom:6px}
  .voet small{display:block;max-width:60em;line-height:1.6;color:#9aa0a8}

  .aanbod{position:fixed;left:12px;right:12px;bottom:12px;z-index:30;display:flex;align-items:center;gap:12px;
    background:var(--nacht2);color:var(--nacht-ink);border:1px solid var(--nacht-lijn);border-radius:14px;
    padding:10px 10px 10px 16px;box-shadow:0 16px 40px rgba(0,0,0,.45);font-size:15px}
  .aanbod span{flex:1}
  .aanbod a{color:var(--accent-ink);background:var(--accent);border-radius:8px;padding:0 14px;min-height:44px;display:flex;
    align-items:center;text-decoration:none;font-weight:600;white-space:nowrap}
  .aanbod button{background:none;border:0;color:var(--nacht-ink2);font-size:20px;min-width:44px;min-height:44px;cursor:pointer}

  @media (min-width:720px){
    .kopnav{display:flex}
    .kop .knop{display:inline-flex}
    .functies{grid-template-columns:repeat(2,1fr)}
    .beelden{grid-template-columns:repeat(3,1fr)}
    .tabellen{grid-template-columns:1fr 1fr}
    .aanbod{left:auto;right:20px;bottom:20px;max-width:460px}
    .niveaulijst{grid-template-columns:repeat(3,1fr);align-items:start}
    .niveau.meest{transform:translateY(-10px)}
  }
  @media (min-width:960px){
    .hero{padding:84px 0 92px}
    .hero .binnen{grid-template-columns:1.15fr .85fr;align-items:center}
    .stappen{grid-template-columns:repeat(4,1fr);gap:26px}
    .stappen::before{left:0;right:0;top:29px;bottom:auto;width:auto;height:6px;transform-origin:0 50%;
      background:repeating-linear-gradient(90deg,#ee4d33 0 14px,var(--kerb,#fff) 14px 28px)}
    html.beweegt .stappen:not(.zichtbaar)::before{transform:scaleX(0)}
    .stappen li{padding:86px 0 0}
    .functies{grid-template-columns:repeat(3,1fr)}
    .functies .breed{grid-column:span 2}
    .antwoord .binnen{grid-template-columns:1.5fr 1fr;align-items:center}
    .antwoord .kader{align-content:center}
    .cijfers{grid-template-columns:1fr}
    .cijfers li{flex-direction:row;align-items:center;gap:18px;padding:16px 20px}
    .cijfers b{min-width:1.6em}
    .zweef-1{left:-24%}
    .zweef-2{right:-20%}
    .zweef-3{left:-14%}
  }
`;

// ------------------------------------------------------------
//  De pagina
// ------------------------------------------------------------

const SCHERMEN = ['races', 'uitslag', 'stand'];

// De iconen bij de functies, in de volgorde van teksten[..].functies.items:
// uitslagen, jokers, duels, weekendwinnaar, delen, agenda, automatisch
// invullen (een dobbelsteen), seizoensvragen, privé of openbaar.
const ICOON = (pad) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pad}</svg>`;
const ICONEN = [
  '<path d="M5 21V4"/><path d="M5 4h13l-2.5 4L18 12H5"/><path d="M9 4v8M13 4v8"/>',
  '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M3 20c0-3 2.2-5 5-5s5 2 5 5M11 20c0-3 2.2-5 5-5s5 2 5 5"/>',
  '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="m9 15 2 2 4-4"/>',
  '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  '<path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
  '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
];
// Welke functies over twee kolommen staan: zo wordt het raster een bento in
// plaats van negen gelijke tegels (2+1, 1+2, 1+1+1, 2+1).
const BREED = [0, 3, 7];

// Een sectiekop: een genummerd label, en de kop zelf.
const sectiekop = (nr, label, kop) => `<div class="sectiekop onthul"><span class="label"><b>${nr}</b>${esc(label)}</span>
    <h2>${kop}</h2></div>`;

// html.beweegt: alleen met JavaScript en als niemand om minder beweging vroeg.
const BEWEGING_KOP = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('beweegt')}catch(e){}`;
// Onderaan: wat in beeld komt krijgt .zichtbaar (en telt zijn getallen op),
// en de balk onder de kop loopt mee met hoe ver je bent.
const BEWEGING = `(function(){try{
  var h=document.documentElement;if(!h.classList.contains('beweegt'))return;
  var els=[].slice.call(document.querySelectorAll('.onthul'));
  function tel(el){[].slice.call(el.querySelectorAll('[data-tel]')).forEach(function(n){
    var doel=+n.getAttribute('data-tel');if(!doel)return;var t0=0;n.textContent='0';
    function stap(t){if(!t0)t0=t;var p=Math.min(1,(t-t0)/1200);n.textContent=String(Math.round(doel*(1-Math.pow(1-p,3))));
      if(p<1)requestAnimationFrame(stap)}requestAnimationFrame(stap)})}
  function toon(el){el.classList.add('zichtbaar');tel(el)}
  if(!('IntersectionObserver' in window))els.forEach(toon);
  else{var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){io.unobserve(e.target);toon(e.target)}})},
    {rootMargin:'0px 0px -8% 0px',threshold:0});els.forEach(function(el){io.observe(el)})}
  h.classList.add('klaar');
  var balk=document.querySelector('.voortgang');
  if(balk){var bij=function(){var max=h.scrollHeight-innerHeight;balk.style.transform='scaleX('+(max>0?Math.min(1,scrollY/max):0)+')'};
    addEventListener('scroll',bij,{passive:true});addEventListener('resize',bij);bij()}
}catch(e){document.documentElement.classList.add('klaar');[].slice.call(document.querySelectorAll('.onthul')).forEach(function(el){el.classList.add('zichtbaar')})}})();`;
const beeld = (code, scherm, thema) =>
  `${voor(code)}site/beeld/${scherm}-${teksten[code].schermen}-${thema}.jpg`;

// De andere namen waaronder de site bekend kan zijn: aan elkaar, en het domein.
const SITENAMEN = ['PredictTheRace', new URL(BASIS).host];

function jsonLd(code, datum) {
  const t = teksten[code];
  const url = urlVan(code);
  const plat = (s) => vul(s, { maker: MAKER.naam, ...APP_GETALLEN });
  const graaf = [
    // alternateName: Google haalt de sitenaam in de zoekresultaten uit de
    // WebSite op de voorpagina, en kiest uit deze namen als hij de hoofdnaam
    // niet wil gebruiken.
    { '@type': 'WebSite', '@id': `${BASIS}/#website`, name: 'Predict the Race', alternateName: SITENAMEN,
      url: `${BASIS}/`, inLanguage: TALEN, publisher: { '@id': `${BASIS}/#organisatie` } },
    { '@type': 'Organization', '@id': `${BASIS}/#organisatie`, name: 'Predict the Race', alternateName: SITENAMEN,
      url: `${BASIS}/`, description: zin(code, 'kernzin'),
      logo: `${BASIS}/pictogrammen/predicttherace-512.png`,
      founder: { '@id': `${BASIS}/#maker` } },
    // De maker één keer, met een @id: de Organization, de WebApplication en de
    // gidsen verwijzen ernaar, zodat de graaf aan elkaar vast zit.
    persoon(code),
    { '@type': 'WebPage', '@id': `${url}#pagina`, url, name: t.titel, description: t.omschrijving,
      inLanguage: code, isPartOf: { '@id': `${BASIS}/#website` }, about: { '@id': `${BASIS}/#app` },
      dateModified: datum,
      primaryImageOfPage: `${BASIS}/site/og/og-${code}.jpg`,
      speakable: { '@type': 'SpeakableSpecification', cssSelector: ['#wat p', '.faq p'] } },
    { '@type': 'WebApplication', '@id': `${BASIS}/#app`, name: 'Predict the Race',
      url: `${BASIS}/app/`, applicationCategory: 'GameApplication',
      applicationSubCategory: 'Formula 1 prediction game', operatingSystem: 'Web, iOS, Android',
      browserRequirements: 'Requires JavaScript', inLanguage: ['nl', 'en'], isAccessibleForFree: true,
      description: antwoordVan(code),
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      featureList: t.functies.items.map(([kop]) => kop),
      screenshot: SCHERMEN.map((s) => `${BASIS}/site/beeld/${s}-${t.schermen}-donker.jpg`),
      author: { '@id': `${BASIS}/#maker` } },
    { '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: code,
      mainEntity: faqItems(code).map(([vraag, antwoord]) => ({ '@type': 'Question', name: vraag,
        acceptedAnswer: { '@type': 'Answer', text: plat(metOpenPoule(code, antwoord, (x) => x)) } })) },
    { '@type': 'HowTo', '@id': `${url}#hoe`, name: t.howto.naam, description: t.howto.omschrijving,
      inLanguage: code, totalTime: 'PT1M', estimatedCost: { '@type': 'MonetaryAmount', currency: 'EUR', value: '0' },
      step: t.stappen.items.map(([naam, tekst], i) => ({ '@type': 'HowToStep', position: i + 1,
        name: naam, text: tekst, url: `${url}#hoe` })) },
  ];
  // </ mag niet letterlijk in een script-blok staan.
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graaf }, null, 1)
    .replace(/<\//g, '<\\/');
}

// Het balkje "deze pagina bestaat ook in het ...". Geen doorverwijzing: zie
// de uitleg bovenaan. Een taal die je zelf gekozen hebt (via het taalmenu of
// het kruisje) wint, en dat wordt onthouden.
function taalScript(code) {
  const aanbod = Object.fromEntries(TALEN.map((c) => [c, {
    p: naar(code, c), t: teksten[c].aanbod, k: teksten[c].aanbodKnop }]));
  return `(function(){try{
  var hier=${JSON.stringify(code)},aanbod=${JSON.stringify(aanbod)},sleutel='site:taal';
  document.querySelectorAll('[data-taal]').forEach(function(a){a.addEventListener('click',function(){
    try{localStorage.setItem(sleutel,a.getAttribute('data-taal'))}catch(e){}})});
  var gekozen=null;try{gekozen=localStorage.getItem(sleutel)}catch(e){}
  if(gekozen)return;
  var voorkeur=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||''])
    .map(function(l){return String(l).slice(0,2).toLowerCase()});
  var doel=null;for(var i=0;i<voorkeur.length;i++){if(aanbod[voorkeur[i]]){doel=voorkeur[i];break}}
  if(!doel||doel===hier)return;
  var balk=document.createElement('div');balk.className='aanbod';balk.setAttribute('role','region');
  balk.setAttribute('aria-label',aanbod[doel].t);balk.lang=doel;
  var s=document.createElement('span');s.textContent=aanbod[doel].t;
  var a=document.createElement('a');a.href=aanbod[doel].p;a.hreflang=doel;a.textContent=aanbod[doel].k;
  a.addEventListener('click',function(){try{localStorage.setItem(sleutel,doel)}catch(e){}});
  var x=document.createElement('button');x.type='button';x.setAttribute('aria-label',${JSON.stringify(teksten[code].sluiten)});x.textContent='×';
  x.addEventListener('click',function(){try{localStorage.setItem(sleutel,hier)}catch(e){}balk.remove()});
  balk.append(s,a,x);document.body.appendChild(balk);
}catch(e){}})();`;
}

// Alleen op de hoofdpagina: wie hier met een uitnodiging, een inloglink of
// een geïnstalleerde app binnenkomt hoort in de app, niet op de folder.
// Vóór alles in de head, zodat er niets van de landingspagina in beeld komt.
//
//   - ?code=RTM026, ?speler=, ?profiel=: uitnodigingen en gedeelde links, van
//     vóór de verhuizing naar app/ en daarna. Ook ?code= van Supabase (een
//     inloglink) en ?error= van een mislukte inlog. Alles behalve utm-achtige
//     vlaggetjes van een campagne gaat mee.
//   - #access_token=, #error=: dezelfde inlog, maar in de hash. Een gewone
//     ankerlink (#faq) heeft geen = en blijft gewoon hier.
//   - Een app op het beginscherm van een iPhone (navigator.standalone): die
//     is ooit met start_url "." op het beginscherm gezet, en iOS werkt dat
//     nooit meer bij. Bewust níét display-mode: standalone. Dat is ook waar
//     in de onzichtbare browservensters waarmee berichtenapps een voorbeeld
//     van een link maken, en dan kreeg een gedeelde link naar de voorpagina
//     het voorbeeld van de app: een klein pictogram in plaats van het
//     deelplaatje. Een geïnstalleerde app op Android heeft toch al een poule
//     op het toestel, en valt dus onder de regel hieronder.
//   - Een terugkerende speler (er staat een poule op dit toestel).
//   - Maar nooit wie van een eigen pagina komt: wie in de app op "Naar de
//     voorpagina" tikt (onder Profiel) of vanaf /en/ terugklikt, wil deze
//     pagina juist zien. Die controle staat daarom vóór die van de
//     iPhone-beginschermapp, anders stuurde zo'n app je meteen terug.
const DOORSTUREN = `(function(){try{
  var l=location,naar=function(){l.replace('app/'+l.search+l.hash)};
  var sleutels=[];try{new URLSearchParams(l.search).forEach(function(v,k){sleutels.push(k)})}catch(e){}
  if(sleutels.some(function(k){return !/^(utm_|fbclid$|gclid$|msclkid$|ref$|mc_)/.test(k)}))return naar();
  if(l.hash.indexOf('=')>-1)return naar();
  var ref=document.referrer||'';if(ref&&ref.indexOf(l.origin)===0)return;
  if(navigator.standalone)return naar();
  for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i)||'';
    if(k.indexOf('poule:')===0&&k!=='poule:taal')return naar()}
}catch(e){}})();`;

// Het hoofdmenu bovenaan: de losse pagina's in deze taal (PAGINA_UI.menu in
// site/paginas.mjs), met de huidige pagina gemarkeerd. Een taal zonder eigen
// pagina's krijgt null, en de voorpagina dan de sprongen naar zijn blokken.
function hoofdmenu(code, p, huidig = null) {
  const menu = PAGINA_UI[code]?.menu;
  const items = (menu?.items ?? [])
    .map(([id, tekst]) => ({ id, tekst, t: ALLE.find((x) => x.id === id)?.talen[code] }))
    .filter((x) => x.t);
  if (!items.length) return null;
  return `<nav class="kopnav" aria-label="${esc(menu.naam)}">
      ${items.map((x) => `<a href="${p}${x.t.pad}/"${x.id === huidig ? ' aria-current="page"' : ''}>${esc(x.tekst)}</a>`).join('')}
    </nav>`;
}

function pagina(code, datum) {
  const t = teksten[code];
  const p = voor(code);
  const url = urlVan(code);
  const app = `${p}app/`;
  const vars = { maker: MAKER.naam, ...APP_GETALLEN };
  const hreflang = [...TALEN.map((c) => `<link rel="alternate" hreflang="${c}" href="${urlVan(c)}">`),
    `<link rel="alternate" hreflang="x-default" href="${urlVan(STANDAARD)}">`].join('\n');
  const ogAlt = TALEN.filter((c) => c !== code)
    .map((c) => `<meta property="og:locale:alternate" content="${teksten[c].locale}">`).join('\n');
  const taalLinks = TALEN.map((c) => `<li><a href="${naar(code, c)}" hreflang="${c}" lang="${c}" data-taal="${c}"${
    c === code ? ' aria-current="page"' : ''}>${esc(teksten[c].naam)} <span>${teksten[c].kort}</span></a></li>`).join('');
  const plaatje = (scherm, alt, { breed, lui = true, voorrang = false } = {}) => `<picture>
      <source srcset="${beeld(code, scherm, 'donker')}" media="(prefers-color-scheme: dark)">
      <img src="${beeld(code, scherm, 'licht')}" alt="${esc(alt)}" width="390" height="844"${
        lui ? ' loading="lazy"' : ''}${voorrang ? ' fetchpriority="high"' : ''} decoding="async"${
        breed ? ` sizes="${breed}"` : ''}>
    </picture>`;
  const MAX = Math.max(...[...LOSSE, ...SEIZOEN].map((id) => PUNTEN[id].punten));
  const rij = (id, i) => `<tr style="--w:${(PUNTEN[id].punten / MAX).toFixed(2)};--i:${i}"><td>${esc(t.punten.vragen[id])}</td><td>${PUNTEN[id].punten}</td></tr>`;
  // De links naar de gidsen, elk onder het blok waar hij bij hoort
  // (teaserPlek in site/paginas.mjs, standaard onder de stappen).
  const teasers = (plek) => gidsenIn(code).filter((pg) => pg.talen[code].teaser && (pg.teaserPlek ?? 'hoe') === plek)
    .map((pg) => `
    <p class="verder"><a href="${p}${pg.talen[code].pad}/">${esc(pg.talen[code].teaser)} <span aria-hidden="true">→</span></a></p>`).join('');

  return `<!DOCTYPE html>
<html lang="${code}">
<head>
<meta charset="utf-8">
${code === 'nl' ? `<script>${DOORSTUREN}</script>\n` : ''}<script>${BEWEGING_KOP}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(t.titel)}</title>
<meta name="description" content="${esc(t.omschrijving)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
<link rel="canonical" href="${url}">
${hreflang}
<meta name="theme-color" content="#0b0b0c">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="${p}favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" href="${p}pictogrammen/predicttherace-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="${p}pictogrammen/predicttherace-apple-180.png">
<link rel="preload" href="${p}lettertypen/barlow-condensed-700-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${p}lettertypen/barlow-400-latin.woff2" as="font" type="font/woff2" crossorigin>
<meta property="og:type" content="website">
<meta property="og:site_name" content="Predict the Race">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(t.ogTitel)}">
<meta property="og:description" content="${esc(t.omschrijving)}">
<meta property="og:image" content="${BASIS}/site/og/og-${code}.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(t.ogTitel)}">
<meta property="og:locale" content="${t.locale}">
${ogAlt}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t.ogTitel)}">
<meta name="twitter:description" content="${esc(t.omschrijving)}">
<meta name="twitter:image" content="${BASIS}/site/og/og-${code}.jpg">
<script type="application/ld+json">
${jsonLd(code, datum)}
</script>
<style>${lettertypen(p)}${CSS}</style>
</head>
<body>
<header class="kop">
  <div class="binnen">
    <a class="merk" href="${naar(code, code)}" aria-label="Predict the Race"><img class="blok" src="${p}pictogrammen/predicttherace-logo.png" alt="" width="24" height="24"><b>Predict the Race</b></a>
    ${hoofdmenu(code, p) ?? `<nav class="kopnav" aria-label="${esc(t.nav.hoe)}">
      <a href="#hoe">${esc(t.nav.hoe)}</a><a href="#punten">${esc(t.nav.punten)}</a><a href="#faq">${esc(t.nav.faq)}</a>
    </nav>`}
    <details class="taalmenu">
      <summary aria-label="${esc(t.nav.taal)}">${t.kort}</summary>
      <ul>${taalLinks}</ul>
    </details>
    <a class="knop klein" href="${app}">${esc(t.nav.app)}</a>
  </div>
  <span class="voortgang" aria-hidden="true"></span>
</header>
<main>
<section class="hero">
  <div class="livrei" aria-hidden="true"></div>
  <div class="snelheid" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
  <div class="binnen">
    <div>
      <div class="startrij"><span class="startlichten" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="boven">${esc(t.hero.boven)}</span></div>
      <h1>${t.hero.kop.map((r, i) => i ? `<span><span class="glans">${esc(r)}</span></span>` : `<span>${esc(r)}</span>`).join('')}</h1>
      <p class="sub">${esc(t.hero.sub)}</p>
      <div class="actie">
        <a class="knop" href="${app}">${esc(t.hero.knop)} <span aria-hidden="true">→</span></a>
        <form class="codeveld" action="${app}" method="get">
          <label for="code">${esc(t.hero.codeLabel)}</label>
          <div>
            <input id="code" name="code" required minlength="4" maxlength="12" pattern="[A-Za-z0-9]{4,12}"
              autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ABC123">
            <button type="submit">${esc(t.hero.codeKnop)}</button>
          </div>
        </form>
      </div>${openPoule(code, app, '      ')}
      <ul class="vertrouwen">${t.hero.vertrouwen.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>
    <div class="telefoon">
      <div class="achter scherm" aria-hidden="true"><img src="${beeld(code, 'stand', 'donker')}" alt="" width="390" height="844" loading="lazy" decoding="async"></div>
      <div class="scherm"><img src="${beeld(code, 'races', 'donker')}" alt="${esc(t.beelden.races[1])}" width="390" height="844" fetchpriority="high" decoding="async"></div>
      ${t.hero.chips.map((c, i) => `<span class="zweef zweef-${i + 1}" aria-hidden="true">${esc(c)}</span>`).join('')}
    </div>
  </div>
</section>
<div class="ticker" aria-hidden="true"><div class="rol">${[0, 1].map(() => t.ticker.map((x) =>
  `<span>${esc(vul(x, APP_GETALLEN))}</span>`).join('')).join('')}</div></div>

<section class="antwoord" id="wat">
  <div class="binnen">
    <div class="kader onthul">
      <h2>${esc(t.antwoord.kop)}</h2>
      <p>${esc(antwoordVan(code))}</p>
    </div>
    <ul class="cijfers">${[PRESET_VRAGEN.gevorderd.length, PLEKPUNTEN[0], 0].map((n, i) =>
      `<li class="onthul" style="--i:${i + 1}"><b data-tel="${n}">${n}</b><span>${esc(t.cijfers[i])}</span></li>`).join('')}</ul>
  </div>
</section>

<section class="blok" id="hoe">
  <div class="binnen">
    ${sectiekop('01', t.stappen.kop, esc(t.stappen.pakkend))}
    <ol class="stappen onthul">${t.stappen.items.map(([kop, tekst], i) =>
      `<li class="onthul" style="--i:${i + 1}"><h3>${esc(kop)}</h3><p>${esc(tekst)}</p></li>`).join('')}</ol>${
      teasers('hoe')}
  </div>
</section>

<section class="niveaus" id="niveaus" data-meest="${PRESET_VRAGEN.gevorderd.length}">
  <div class="binnen">
    ${sectiekop('02', t.niveaus.label, t.niveaus.kop.map((r) => `<span>${esc(r).replace(/(\S+-\S+)/g, '<span class="heel">$1</span>')}</span>`).join(''))}
    <p class="inleiding">${esc(t.niveaus.intro)}</p>
    <ol class="niveaulijst">${['simpel', 'klassiek', 'gevorderd'].map((n, i) => {
      const [naam, regel] = t.niveaus[n];
      const meest = n === 'gevorderd';
      return `
      <li class="niveau onthul${meest ? ' meest' : ''}" style="--i:${i}">
        ${meest ? `<span class="badge">${esc(t.niveaus.badge)}</span>` : ''}
        <span class="lampen" aria-hidden="true">${[0, 1, 2, 3, 4].map((l) => `<i style="--l:${l}"${l < [1, 3, 5][i] ? ' class="aan"' : ''}></i>`).join('')}</span>
        <h3>${esc(naam)}</h3>
        <p class="tagline">${esc(regel)}</p>
        <p class="aantal"><b data-tel="${PRESET_VRAGEN[n].length}">${PRESET_VRAGEN[n].length}</b> ${esc(t.niveaus.vragen)}</p>
        <p class="weekend">${esc(vul(t.niveaus.perWeekend, { n: PRESET_PUNTEN[n] }))}${meest ? ` · ${esc(t.niveaus.extra)}` : ''}</p>
        <ul class="chips">${PRESET_VRAGEN[n].map((id) => `<li>${esc(vraagNaam(t, id))}</li>`).join('')}</ul>
      </li>`;
    }).join('')}
    </ol>
    <p class="zelf onthul">${esc(t.niveaus.zelf)}</p>
    <a class="knop" href="${app}">${esc(t.niveaus.knop)} <span aria-hidden="true">→</span></a>
  </div>
</section>

<section class="blok" id="punten">
  <div class="binnen">
    ${sectiekop('03', t.punten.kop, esc(t.punten.pakkend))}
    <p class="inleiding onthul">${esc(t.punten.intro)}</p>
    <table class="tabel onthul">
      <thead><tr><th scope="col">${esc(t.punten.kolommen[0])}</th><th scope="col">${esc(t.punten.kolommen[1])}</th></tr></thead>
      <tbody>${t.punten.rijen.map((r, i) => `<tr${i === 0 ? ' class="top"' : ''} style="--w:${((PLEKPUNTEN[i] ?? 0) / PLEKPUNTEN[0]).toFixed(2)};--i:${i}"><td>${esc(r)}</td><td>${PLEKPUNTEN[i] ?? 0}</td></tr>`).join('')}</tbody>
    </table>
    <p class="voorbeeld">${esc(vul(t.punten.voorbeeld, vars))}</p>
    <div class="tabellen">
      <table class="tabel onthul">
        <caption class="alleenlezer">${esc(t.punten.lossKop)}</caption>
        <thead><tr><th scope="col">${esc(t.punten.lossKop)}</th><th scope="col">${esc(t.punten.kolommenVraag[1])}</th></tr></thead>
        <tbody>${LOSSE.map(rij).join('')}</tbody>
      </table>
      <table class="tabel onthul" style="--i:1">
        <caption class="alleenlezer">${esc(t.punten.seizoenKop)}</caption>
        <thead><tr><th scope="col">${esc(t.punten.seizoenKop)}</th><th scope="col">${esc(t.punten.kolommenVraag[1])}</th></tr></thead>
        <tbody>${SEIZOEN.map(rij).join('')}</tbody>
      </table>
    </div>
    <p class="presets onthul">${esc(vul(t.punten.presets, vars))}</p>${teasers('punten')}
  </div>
</section>

<section class="blok" id="functies">
  <div class="binnen">
    ${sectiekop('04', t.functies.kop, esc(t.functies.pakkend))}
    <ul class="functies">${t.functies.items.map(([kop, tekst], i) =>
      `<li class="onthul${BREED.includes(i) ? ' breed' : ''}" style="--i:${i % 3}"><span class="icoon">${ICOON(ICONEN[i] ?? ICONEN[0])}</span><span class="nr" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3>${esc(kop)}</h3><p>${esc(tekst)}</p></li>`).join('')}</ul>
  </div>
</section>

<section class="blok" id="beelden">
  <div class="binnen">
    ${sectiekop('05', t.beelden.kop, esc(t.beelden.pakkend))}
    <div class="beelden">${SCHERMEN.map((s, i) => `
      <figure class="onthul" style="--i:${i};--r:${[-3, 0, 3][i]}deg">
        <div class="kader">${plaatje(s, t.beelden[s][1])}</div>
        <figcaption>${esc(t.beelden[s][0])}</figcaption>
      </figure>`).join('')}
    </div>
  </div>
</section>

<section class="blok">
  <div class="binnen los">
    <article class="onthul"><h2>${esc(t.privacy.kop)}</h2><p>${esc(t.privacy.tekst)} <a href="${naarPrivacy(code)}"${privacyHreflang(code)}>${esc(t.privacy.meer)}</a></p></article>
  </div>
</section>

<section class="blok" id="faq">
  <div class="binnen">
    ${sectiekop('06', t.nav.faq, esc(t.faq.kop))}
    <div class="faq onthul">${faqItems(code).map(([vraag, antwoord]) => `
      <details><summary><h3>${esc(vraag)}</h3></summary><p>${metOpenPoule(code, esc(vul(antwoord, vars)),
        (x) => `<a href="${app}?code=${encodeURIComponent(OPEN_POULE)}">${esc(x)}</a>`)}</p></details>`).join('')}
    </div>
  </div>
</section>

<section class="slot">
  <div class="binnen onthul">
    <span class="startlichten" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
    <h2>${esc(t.slot.kop)}</h2>
    <p>${esc(t.slot.tekst)}</p>
    <a class="knop" href="${app}">${esc(t.slot.knop)} <span aria-hidden="true">→</span></a>${openPoule(code, app, '    ')}
  </div>
</section>
</main>
<footer class="voet">
  <div class="binnen">
    <div><span class="label">${esc(t.nav.taal)}</span><ul>${TALEN.map((c) =>
      `<li><a href="${naar(code, c)}" hreflang="${c}" lang="${c}" data-taal="${c}">${esc(teksten[c].naam)}</a></li>`).join('')}</ul></div>${
      gidsenIn(code).length ? `
    <div><span class="label">${esc(PAGINA_UI[code].gidsen)}</span><ul>${gidsenIn(code).map((pg) =>
      `<li><a href="${p}${pg.talen[code].pad}/">${esc(pg.talen[code].kop)}</a></li>`).join('')}</ul></div>` : ''}
    <ul>
      <li><a href="${app}">${esc(t.voet.app)}</a></li>${overIn(code) ? `
      <li><a href="${p}${overIn(code).pad}/">${esc(PAGINA_UI[code].over)}</a></li>` : ''}${racesIn(code) ? `
      <li><a href="${p}${racesIn(code).pad}/">${esc(racesIn(code).voet)}</a></li>` : ''}
      <li><a href="${naarPrivacy(code)}"${privacyHreflang(code)}>${esc(t.voet.privacy)}</a></li>
      <li><a href="https://openf1.org" rel="noopener">${esc(t.voet.data)}</a></li>
      <li><a href="#" data-toestemming hidden>${esc(t.voet.cookies)}</a></li>
    </ul>
    <small>${esc(t.voet.disclaimer)}</small>
  </div>
</footer>
<script>${taalScript(code)}</script>
<script>${BEWEGING}</script>
<script src="${p}toestemming.js" defer></script>
</body>
</html>
`;
}

// ------------------------------------------------------------
//  De privacyverklaring
// ------------------------------------------------------------

// Een gewone leespagina: geen hero, geen plaatjes, geen taalbalkje. Wel
// dezelfde kop, letters en kleuren, zodat hij bij de site hoort, en net als de
// rest niets van een andere website.
const PRIVACY_CSS = `
  .verklaring{padding:48px 0 72px}
  .verklaring .binnen{max-width:760px}
  .verklaring h1{font-family:var(--cond);font-weight:700;text-transform:uppercase;font-size:clamp(38px,7vw,60px);
    line-height:.95;margin:0 0 18px;letter-spacing:.01em}
  .verklaring .inleiding{margin:0 0 10px}
  .verklaring section{padding:26px 0 6px;border-top:1px solid var(--lijn);margin-top:26px}
  .verklaring h2{font-size:clamp(24px,3.6vw,30px);margin:0 0 10px}
  .verklaring p{margin:0 0 12px;line-height:1.65}
  .verklaring a{color:var(--accent-tekst);overflow-wrap:anywhere}
`;

function privacyPagina(taal) {
  const t = PRIVACY[taal];
  const ander = PRIVACY_TALEN.find((c) => c !== taal);
  const p = '../'.repeat(t.pad.split('/').length);
  const thuis = `${p}${teksten[taal].pad ? teksten[taal].pad + '/' : ''}`;
  const app = `${p}app/`;
  const hreflang = [...PRIVACY_TALEN.map((c) => `<link rel="alternate" hreflang="${c}" href="${privacyUrl(c)}">`),
    `<link rel="alternate" hreflang="x-default" href="${privacyUrl(STANDAARD)}">`].join('\n');
  // De enige plekken waar HTML in de tekst komt, en alleen via deze twee.
  const alinea = (s) => esc(s)
    .replace('{contact}', `<a href="mailto:${esc(CONTACT)}">${esc(CONTACT)}</a>`)
    .replace('{ap}', `<a href="${esc(t.apUrl)}" rel="noopener">${esc(t.ap)}</a>`);
  return `<!DOCTYPE html>
<html lang="${taal}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(t.titel)}</title>
<meta name="description" content="${esc(t.omschrijving)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${privacyUrl(taal)}">
${hreflang}
<meta name="theme-color" content="#0b0b0c">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="${p}favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" href="${p}pictogrammen/predicttherace-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="${p}pictogrammen/predicttherace-apple-180.png">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Predict the Race">
<meta property="og:url" content="${privacyUrl(taal)}">
<meta property="og:title" content="${esc(t.titel)}">
<meta property="og:description" content="${esc(t.omschrijving)}">
<meta property="og:locale" content="${t.locale}">
<style>${lettertypen(p)}${CSS}${PRIVACY_CSS}</style>
</head>
<body>
<header class="kop">
  <div class="binnen">
    <a class="merk" href="${thuis}" aria-label="Predict the Race"><img class="blok" src="${p}pictogrammen/predicttherace-logo.png" alt="" width="24" height="24"><b>Predict the Race</b></a>
    <a class="knop klein" href="${app}">${esc(t.app)}</a>
  </div>
</header>
<main class="verklaring">
  <div class="binnen">
    <h1>${esc(t.kop)}</h1>
    <p class="inleiding">${esc(t.intro)}</p>
    <p class="label"><time datetime="${PRIVACY_BIJGEWERKT}">${esc(t.bijgewerkt)}</time></p>
${t.secties.map(([kop, alineas]) => `    <section>
      <h2>${esc(kop)}</h2>
${alineas.map((a) => `      <p>${alinea(a)}</p>`).join('\n')}
    </section>`).join('\n')}
  </div>
</main>
<footer class="voet">
  <div class="binnen">
    <ul>
      <li><a href="${thuis}">${esc(t.terug)}</a></li>
      <li><a href="${app}">${esc(t.app)}</a></li>
      <li><a href="${p}${PRIVACY[ander].pad}/" hreflang="${ander}" lang="${ander}">${esc(t.ander)}</a></li>
      <li><a href="#" data-toestemming hidden>${esc(teksten[taal].voet.cookies)}</a></li>
    </ul>
    <small>${esc(teksten[taal].voet.disclaimer)}</small>
  </div>
</footer>
<script src="${p}toestemming.js" defer></script>
</body>
</html>
`;
}

// ------------------------------------------------------------
//  De losse pagina's: gidsen (site/paginas.mjs)
// ------------------------------------------------------------
//
// Eén sjabloon voor alle artikelpagina's, met dezelfde kop, letters en kleuren
// als de voorpagina. Vaste volgorde: kruimelpad, h1, wie het schreef en
// wanneer, het korte antwoord, de secties, de FAQ, "lees ook" en de knop naar
// de app.
//
// De antwoordvorm uit het zoekplan (docs/zoekplan/2-aeo.md, fase 2): elke
// sectie is één vraag (section.vraag), met de vraag als h2 en direct daaronder
// het korte antwoord (p.kort): het antwoord eerst, 25 tot 80 woorden, zonder
// verwijswoord vooraan, zodat hij los gelezen kan worden. Daarna de uitleg.
// Elke tabel heeft een bijschrift en th's met scope. Het korte antwoord staat
// altijd open in de HTML; <details> is alleen voor de FAQ.
//
// Paden zijn relatief, net als op de voorpagina, zodat het ook werkt op
// dannydevis.github.io/F1-Poule/ waar alles een map dieper staat. Een pagina
// op en/how-to-run-an-f1-prediction-league/ is twee mappen diep, dus alles
// naar de hoofdmap begint met ../../ (terugNaar()).
//
// hreflang per cluster: alleen de talen waarin die pagina bestaat, en
// x-default naar het Engels als dat er is, anders het Nederlands.

const paginaUrl = (pg, code) => `${BASIS}/${pg.talen[code].pad}/`;
const terugNaar = (pad) => '../'.repeat(pad.split('/').length);
const clusterVan = (pg) => TALEN.filter((c) => pg.talen[c]);
const xDefaultVan = (pg) => (pg.talen.en ? 'en' : pg.talen.nl ? 'nl' : clusterVan(pg)[0]);
// Alle artikelpagina's: de gidsen en de about-pagina uit site/paginas.mjs, en
// de racepagina's met hun overzicht, gebouwd uit de gegevens van de workflow
// "Circuitcijfers" (scripts/racepaginas.mjs, zoekplan SEO fase 4).
const ALLE = [...PAGINAS, ...RACEPAGINAS];
const paginasIn = (code) => ALLE.filter((pg) => pg.talen[code]);
// Het overzicht van de races in deze taal, voor de voet en het kruimelpad.
const racesIn = (code) => ALLE.find((pg) => pg.id === 'races')?.talen[code];
// De gidsen (soort 'gids') en de vergelijking, zonder de about-pagina: die
// staat niet onder "Gidsen" en heeft geen link in de blokken van de voorpagina.
// De vergelijking heeft geen teaser: alleen een link in de voet.
const gidsenIn = (code) => paginasIn(code).filter((pg) => pg.soort === 'gids' || pg.soort === 'vergelijking');
const overIn = (code) => PAGINAS.find((pg) => pg.id === 'over')?.talen[code];
// De lege datum van de hash (0000-00-00, zie metDatum()) blijft gewoon staan.
const datumTekst = (code, iso) => (/^0000/.test(iso) ? iso : new Intl.DateTimeFormat(code, {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`)));
for (const pg of ALLE) for (const code of clusterVan(pg)) {
  if (!PAGINA_UI[code]) throw new Error(`site/paginas.mjs: geen PAGINA_UI voor ${code} (pagina ${pg.id})`);
}

const ARTIKEL_CSS = `
  .kopnav a[aria-current="page"]{color:var(--nacht-ink)}
  .artikel{padding:36px 0 64px}
  .artikel .binnen{max-width:760px}
  .artikel .kruimel ol{display:flex;flex-wrap:wrap;gap:6px;list-style:none;margin:0 0 20px;padding:0;font-size:14px;color:var(--ink2)}
  .artikel .kruimel li{margin:0}
  .kruimel li+li::before{content:"/";margin-right:6px;color:var(--ink3)}
  .kruimel a{color:var(--accent-tekst)}
  .artikel h1{font-family:var(--cond);font-weight:700;text-transform:uppercase;font-size:clamp(36px,7vw,58px);
    line-height:.95;margin:0 0 18px;letter-spacing:.01em;overflow-wrap:break-word}
  .artikel .inleiding{font-size:19px;line-height:1.6;margin:0 0 12px}
  .artikel section{padding:26px 0 4px;border-top:1px solid var(--lijn);margin-top:26px;scroll-margin-top:84px}
  .artikel h2{font-size:clamp(23px,3.6vw,29px);line-height:1.2;margin:0 0 10px}
  .artikel p,.artikel li{line-height:1.65}
  .artikel p{margin:0 0 12px}
  .artikel section .kort{font-weight:600}
  .artikel .door{font-size:15px;color:var(--ink2);margin:0 0 16px}
  .artikel .door a{color:var(--accent-tekst)}
  .artikel caption{text-align:left;font-size:15px;color:var(--ink2);padding:0 0 8px}
  .artikel ol,.artikel ul{margin:0 0 14px;padding-left:24px}
  .artikel li{margin:0 0 8px}
  .artikel .voorbeeld{background:var(--paneel);border:1px solid var(--lijn);border-left:3px solid var(--accent);
    border-radius:10px;padding:12px 16px}
  .artikel .tabel{margin:4px 0 16px}
  .artikel .tabel td:last-child,.artikel .tabel th:last-child{text-align:left;width:auto}
  .artikel .tabel td:last-child{font-family:inherit;font-weight:600;font-size:16px;line-height:1.5}
  .artikel .faq{margin-top:6px}
  .artikel .leesook a,.artikel .gidsen a{color:var(--accent-tekst)}
  .artikel .slotblok{margin-top:34px;padding:26px;border-radius:16px;background:var(--nacht);color:var(--nacht-ink)}
  .artikel .slotblok h2{margin:0 0 6px}
  .artikel .slotblok p{color:var(--nacht-ink2)}
  .artikel .tabel.getallen th:last-child{text-align:right}
  .artikel .tabel.getallen td:last-child{text-align:right;font-family:var(--cond);font-weight:700;font-size:22px;line-height:1}
  .artikel .tabellen{margin:4px 0 16px}
  .artikel .tabellen .tabel{margin:0}
  .artikel .rekenvoorbeeld th,.artikel .rekenvoorbeeld td{padding:10px 8px}
  @media (min-width:480px){.artikel .rekenvoorbeeld th,.artikel .rekenvoorbeeld td{padding:10px 14px}}
  .artikel .rekenvoorbeeld tbody th{font-weight:600}
  .artikel .rekenvoorbeeld tfoot th,.artikel .rekenvoorbeeld tfoot td{border-top:2px solid var(--ink3)}
  .artikel .rekenvoorbeeld tfoot td{color:var(--accent-tekst)}
  .artikel .circuits th,.artikel .circuits td{padding:10px 8px}
  @media (min-width:480px){.artikel .circuits th,.artikel .circuits td{padding:10px 14px}}
  .artikel .circuits thead th:not(:first-child){text-align:right}
  .artikel .circuits tbody th{font-weight:600}
  .artikel .circuits td,.artikel .tabel.circuits td:last-child{text-align:right;font-family:var(--cond);font-weight:700;font-size:20px;line-height:1}
  .artikel .links a{color:var(--accent-tekst)}
  .artikel .compact th,.artikel .compact td{padding:10px 8px}
  @media (min-width:480px){.artikel .compact th,.artikel .compact td{padding:10px 14px}}
  .artikel .formules{margin:0 0 16px}
  .artikel .formules dt{font-weight:600;margin:14px 0 6px}
  .artikel .formules dd{margin:0}
  .artikel .formules code{display:block;font-family:var(--mono);font-size:clamp(13px,3.6vw,15px);line-height:1.5;padding:12px 14px;
    background:var(--paneel);border:1px solid var(--lijn);border-radius:10px;overflow-wrap:anywhere}
`;
// Alleen op een pagina met een appstabel (de vergelijking): op een smal scherm
// wordt elke app een blok met de kolomnamen ervoor.
const APPS_CSS = `
  .artikel .apps th,.artikel .apps td{padding:10px 12px;vertical-align:top;font-size:15px;line-height:1.45}
  .artikel .apps td:last-child{font-weight:400;font-size:15px;line-height:1.45}
  .artikel .apps tbody th{font-weight:700}
  .artikel .apps a{color:var(--accent-tekst)}
  @media (max-width:720px){
    .artikel .apps thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
    .artikel .apps,.artikel .apps caption,.artikel .apps tbody,.artikel .apps tr,.artikel .apps th,.artikel .apps td{display:block;width:auto}
    .artikel .apps caption{padding:12px 16px 4px}
    .artikel .apps tbody tr{border-top:1px solid var(--lijn);padding:8px 0}
    .artikel .apps tbody tr:first-child{border-top:0}
    .artikel .apps th,.artikel .apps td{border-top:0;padding:3px 16px}
    .artikel .apps td::before{content:attr(data-kop) ": ";font-weight:600;color:var(--ink2)}
  }
`;

// Het rekenvoorbeeld van een pagina (pg.rekenvoorbeeld): een voorspelde top 10
// en een uitslag, uitgerekend door scoreLijst() uit de app.
function rekenvoorbeeld(pg) {
  if (!pg.rekenvoorbeeld) return null;
  const { voorspeld, uitslag } = pg.rekenvoorbeeld;
  const dubbel = (l) => new Set(l).size !== l.length;
  if (voorspeld.length !== 10 || dubbel(voorspeld) || dubbel(uitslag)) {
    throw new Error(`site/paginas.mjs: het rekenvoorbeeld van ${pg.id} moet tien verschillende coureurs voorspellen`);
  }
  return scoreLijst(voorspeld, uitslag);
}
// De {namen} die uit dat voorbeeld komen: het totaal, wat alleen exacte
// plekken hadden opgeleverd, en hoeveel coureurs hooguit één plek naast zaten.
const voorbeeldFeiten = (pg) => {
  const r = rekenvoorbeeld(pg);
  return r ? {
    voorbeeldTotaal: r.totaal,
    voorbeeldExact: r.regels.filter((x) => x.werkelijk === x.voorspeld).length * PLEKPUNTEN[0],
    voorbeeldDichtbij: r.regels.filter((x) => x.werkelijk !== null && Math.abs(x.werkelijk - x.voorspeld) <= 1).length,
  } : {};
};

// Het voorbeeld bij contrair voorspellen (pg.contrairvoorbeeld): zoveel spelers
// vulden een losse vraag in en hadden hem goed. Per aantal dat hetzelfde zei,
// hoe zwaar het goede antwoord telt en wat het oplevert, zoals de app rekent:
// de punten keer de vermenigvuldiger, afgerond.
const keerTekst = (code, x) => new Intl.NumberFormat(code, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(x);
function contrairvoorbeeld(pg) {
  if (!pg.contrairvoorbeeld) return null;
  const { spelers, vraag } = pg.contrairvoorbeeld;
  if (!PUNTEN[vraag]) throw new Error(`site/paginas.mjs: het contrairvoorbeeld van ${pg.id} noemt een vraag die de app niet kent: ${vraag}`);
  if (!(spelers >= CONTRAIR.min)) throw new Error(`site/paginas.mjs: het contrairvoorbeeld van ${pg.id} heeft minstens ${CONTRAIR.min} spelers nodig`);
  return Array.from({ length: spelers }, (_, i) => spelers - i).map((zelfde) => {
    const keer = contrairKeer(zelfde, spelers);
    return { zelfde, keer, punten: Math.round(PUNTEN[vraag].punten * keer) };
  });
}
const contrairFeiten = (pg, code) => {
  const r = contrairvoorbeeld(pg);
  if (!r) return {};
  const alleen = r.find((x) => x.zelfde === 1);
  return { contrairSpelers: pg.contrairvoorbeeld.spelers, contrairEen: keerTekst(code, alleen.keer), contrairPunten: alleen.punten };
};

// De vergelijking: wanneer de feiten over de andere apps op hun eigen site
// gecontroleerd zijn, als {gecontroleerd} in de tekst.
const controleFeiten = (pg, code) => (pg.gecontroleerd ? { gecontroleerd: datumTekst(code, pg.gecontroleerd) } : {});

// De tekst van een pagina met de getallen uit de app erin.
const vulPagina = (pg, code, tekst) => vul(tekst, {
  ...feitenVoor(code), ...voorbeeldFeiten(pg), ...contrairFeiten(pg, code), ...controleFeiten(pg, code) });

function artikelJsonLd(pg, code, datum, sinds) {
  const t = pg.talen[code];
  const url = paginaUrl(pg, code);
  const thuis = urlVan(code);
  const f = (s) => vulPagina(pg, code, s);
  const ouder = pg.kruimel ? ALLE.find((x) => x.id === pg.kruimel) : null;
  const kruimel = { '@type': 'BreadcrumbList', '@id': `${url}#kruimel`, itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Predict the Race', item: thuis },
    ...(ouder?.talen[code] ? [{ '@type': 'ListItem', position: 2, name: ouder.talen[code].kop, item: paginaUrl(ouder, code) }] : []),
    { '@type': 'ListItem', position: ouder?.talen[code] ? 3 : 2, name: t.kop, item: url }] };
  const pagina = (type, extra) => ({ '@type': type, '@id': `${url}#pagina`, url, name: t.titel, description: t.omschrijving,
    inLanguage: code, isPartOf: { '@id': `${BASIS}/#website` }, breadcrumb: { '@id': `${url}#kruimel` },
    datePublished: sinds, dateModified: datum, ...extra });
  // De about-pagina: een AboutPage over de maker, met hem hier volledig
  // beschreven, ook waar hij woont (zoekplan GEO 1.3). Geen Article.
  // Een racepagina: een WebPage over een SportsEvent (naam, begin, eind, plaats),
  // voor begrip, niet voor een rich result. Het overzicht: een CollectionPage
  // met de racepagina's als ItemList (zoekplan SEO fase 4).
  const graaf = pg.soort === 'race' ? [
    pagina('WebPage', { about: { '@id': `${url}#race` } }),
    { '@type': 'SportsEvent', '@id': `${url}#race`, name: t.kop, url, sport: 'Formula 1',
      startDate: pg.evenement.start, endDate: pg.evenement.eind,
      eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: pg.evenement.baan,
        address: { '@type': 'PostalAddress', addressLocality: pg.evenement.plaats, addressCountry: pg.evenement.land } } },
    kruimel,
  ] : pg.soort === 'races' ? [
    pagina('CollectionPage', { mainEntity: { '@id': `${url}#lijst` } }),
    { '@type': 'ItemList', '@id': `${url}#lijst`, itemListElement: pg.lijst.map((id, i) => {
      const x = ALLE.find((y) => y.id === id);
      return { '@type': 'ListItem', position: i + 1, url: paginaUrl(x, code), name: x.talen[code].kop };
    }) },
    kruimel,
  ] : pg.soort === 'over' ? [
    { '@type': 'AboutPage', '@id': `${url}#pagina`, url, name: t.titel, description: t.omschrijving,
      inLanguage: code, isPartOf: { '@id': `${BASIS}/#website` }, about: { '@id': `${BASIS}/#organisatie` },
      mainEntity: { '@id': `${BASIS}/#maker` }, breadcrumb: { '@id': `${url}#kruimel` },
      datePublished: sinds, dateModified: datum },
    kruimel,
    { ...persoon(code), address: { '@type': 'PostalAddress', addressLocality: MAKER.plaats, addressCountry: MAKER.land } },
  ] : [
    { '@type': 'WebPage', '@id': `${url}#pagina`, url, name: t.titel, description: t.omschrijving,
      inLanguage: code, isPartOf: { '@id': `${BASIS}/#website` }, about: { '@id': `${BASIS}/#app` },
      breadcrumb: { '@id': `${url}#kruimel` }, datePublished: sinds, dateModified: datum },
    { '@type': 'Article', '@id': `${url}#artikel`, headline: t.kop, description: t.omschrijving, inLanguage: code,
      mainEntityOfPage: { '@id': `${url}#pagina` }, datePublished: sinds, dateModified: datum,
      author: { '@id': `${BASIS}/#maker` }, publisher: { '@id': `${BASIS}/#organisatie` },
      image: `${BASIS}/site/og/og-${code}.jpg` },
    kruimel,
    persoon(code),
  ];
  if (t.faq?.length) {
    graaf.push({ '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: code,
      mainEntity: t.faq.map(([vraag, antwoord]) => ({ '@type': 'Question', name: f(vraag),
        acceptedAnswer: { '@type': 'Answer', text: f(antwoord) } })) });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graaf }, null, 1).replace(/<\//g, '<\\/');
}

function artikelPagina(pg, code, datum, sinds) {
  const t = pg.talen[code];
  const ui = PAGINA_UI[code];
  const url = paginaUrl(pg, code);
  const p = terugNaar(t.pad);
  const thuis = `${p}${teksten[code].pad ? teksten[code].pad + '/' : ''}`;
  const app = `${p}app/`;
  const f = (s) => esc(vulPagina(pg, code, s));
  const cluster = clusterVan(pg);
  const hreflang = [...cluster.map((c) => `<link rel="alternate" hreflang="${c}" href="${paginaUrl(pg, c)}">`),
    `<link rel="alternate" hreflang="x-default" href="${paginaUrl(pg, xDefaultVan(pg))}">`].join('\n');
  const taalLinks = cluster.map((c) => `<li><a href="${p}${pg.talen[c].pad}/" hreflang="${c}" lang="${c}"${
    c === code ? ' aria-current="page"' : ''}>${esc(teksten[c].naam)} <span>${teksten[c].kort}</span></a></li>`).join('');
  const verwant = pg.verwant.map((id) => ALLE.find((x) => x.id === id)).filter((x) => x?.talen[code]);
  const leesOok = [
    ...verwant.map((x) => `<li><a href="${p}${x.talen[code].pad}/">${esc(x.talen[code].kop)}</a></li>`),
    ...(t.leesOok ?? []).map(([anker, tekst]) => `<li><a href="${thuis}#${anker}">${esc(tekst)}</a></li>`)];
  // De teksten van de voorpagina in deze taal: de namen van de vragen.
  const t2 = teksten[code];
  // Een tabel zonder bijschrift is een fout in site/paginas.mjs, geen lege caption.
  const bijschrift = (tabel, waar) => {
    if (!tabel.bijschrift) throw new Error(`site/paginas.mjs: de tabel in ${pg.id}#${waar} (${code}) heeft geen bijschrift`);
    return tabel.bijschrift;
  };
  // Wie het schreef en wanneer, direct onder de h1. De naam linkt naar de
  // about-pagina zodra die er in deze taal is, tot dan naar het profiel van de
  // maker (dezelfde url als de Person in de JSON-LD).
  const over = PAGINAS.find((x) => x.id === 'over')?.talen[code];
  const door = esc(ui.door)
    .replace('{naam}', `<a href="${over ? `${p}${over.pad}/` : MAKER.url}" rel="author">${esc(MAKER.naam)}</a>`)
    .replace('{datum}', `<time datetime="${datum}">${esc(datumTekst(code, datum))}</time>`);
  // Een link naar een andere artikelpagina: { pagina: id, anker? }. Een pagina
  // die in deze taal niet bestaat, is een fout, geen lege link.
  const naarPagina = (l) => {
    const doel = ALLE.find((x) => x.id === l.pagina)?.talen[code];
    if (!doel) throw new Error(`${pg.id} (${code}) linkt naar ${l.pagina}, en die is er niet in deze taal`);
    return `${p}${doel.pad}/${l.anker ? `#${l.anker}` : ''}`;
  };
  // Het kruimelpad: de voorpagina, soms een tussenstap (een racepagina hangt
  // onder het overzicht van de races), en deze pagina.
  const ouder = pg.kruimel ? ALLE.find((x) => x.id === pg.kruimel)?.talen[code] : null;
  const slot = t.slot ?? ui.slot;
  const rekenTabel = (r) => {
    const uit = rekenvoorbeeld(pg);
    if (!uit) throw new Error(`site/paginas.mjs: ${pg.id} heeft een rekenvoorbeeld-tabel maar geen rekenvoorbeeld`);
    return `
      <table class="tabel getallen rekenvoorbeeld">
        <caption>${f(bijschrift(r, 'rekenvoorbeeld'))}</caption>
        <thead><tr>${r.kop.map((k) => `<th scope="col">${f(k)}</th>`).join('')}</tr></thead>
        <tbody>${uit.regels.map((x) => `<tr><th scope="row">${esc(x.nr)}</th><td>P${x.voorspeld}</td><td>${
          x.werkelijk === null ? f(r.geenPlek) : `P${x.werkelijk}`}</td><td>${x.punten}</td></tr>`).join('')}</tbody>
        <tfoot><tr><th scope="row" colspan="3">${f(r.totaal)}</th><td>${uit.totaal}</td></tr></tfoot>
      </table>`;
  };
  // Per circuit uit site/data/circuits.json: races, safety cars (virtuele
  // meegeteld) en races met een rode vlag.
  const circuitTabel = (c) => {
    if (!CIRCUITS) throw new Error(`site/paginas.mjs: ${pg.id} heeft een circuittabel, maar site/data/circuits.json ontbreekt (workflow "Circuitcijfers")`);
    return `
      <table class="tabel getallen circuits">
        <caption>${f(bijschrift(c, 'circuittabel'))}</caption>
        <thead><tr>${c.kop.map((k) => `<th scope="col">${f(k)}</th>`).join('')}</tr></thead>
        <tbody>${CIRCUITS.circuits.map((x) => `<tr><th scope="row">${esc(x.locatie)}</th><td>${x.races}</td><td>${
          x.safetyCars}</td><td>${x.metRodeVlag}</td></tr>`).join('')}</tbody>
      </table>`;
  };
  // Contrair voorspellen: per aantal spelers dat hetzelfde zei, de
  // vermenigvuldiger en de punten (contrairvoorbeeld() hierboven).
  const contrairTabel = (c) => {
    const rijen = contrairvoorbeeld(pg);
    if (!rijen) throw new Error(`site/paginas.mjs: ${pg.id} heeft een contrairtabel maar geen contrairvoorbeeld`);
    return `
      <table class="tabel getallen contrair">
        <caption>${f(bijschrift(c, 'contrairtabel'))}</caption>
        <thead><tr>${c.kop.map((k) => `<th scope="col">${f(k)}</th>`).join('')}</tr></thead>
        <tbody>${rijen.map((x) => `<tr><th scope="row">${esc(vul(c.rij, { zelfde: x.zelfde, spelers: pg.contrairvoorbeeld.spelers }))}</th><td>×${
          esc(keerTekst(code, x.keer))}</td><td>${x.punten}</td></tr>`).join('')}</tbody>
      </table>`;
  };
  // De andere apps naast elkaar: de naam linkt naar hun eigen site (url) of
  // naar een pagina van deze site (pagina), de rest is tekst.
  const appsTabel = (a) => `
      <table class="tabel apps">
        <caption>${f(bijschrift(a, 'appstabel'))}</caption>
        <thead><tr>${a.kop.map((k) => `<th scope="col">${f(k)}</th>`).join('')}</tr></thead>
        <tbody>${a.rijen.map((r) => `<tr><th scope="row">${r.url ? `<a href="${esc(r.url)}">${f(r.naam)}</a>`
          : r.pagina ? `<a href="${naarPagina(r)}">${f(r.naam)}</a>` : f(r.naam)}</th>${
          r.cellen.map((c, i) => `<td data-kop="${f(a.kop[i + 1])}">${f(c)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;
  const sectie = (s) => `
    <section class="vraag" id="${s.id}">
      <h2>${f(s.vraag)}</h2>
      <p class="kort">${f(s.kort)}</p>${s.stappen ? `
      <ol>${s.stappen.map((x) => `<li>${f(x)}</li>`).join('')}</ol>` : ''}${s.tabel ? `
      <table class="tabel${s.tabel.klasse ? ` ${s.tabel.klasse}` : ''}">
        <caption>${f(bijschrift(s.tabel, s.id))}</caption>
        <thead><tr>${s.tabel.kop.map((k) => `<th scope="col">${f(k)}</th>`).join('')}</tr></thead>
        <tbody>${s.tabel.rijen.map((r) => `<tr>${r.map((c, i) => i === 0 ? `<th scope="row">${f(c)}</th>` : `<td>${f(c)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>` : ''}${(s.tabellen ?? []).map((tabel, i) => `
      <table class="tabel${tabel.klasse ? ` ${tabel.klasse}` : ''}">
        <caption>${f(bijschrift(tabel, `${s.id}-${i + 1}`))}</caption>
        <thead><tr>${tabel.kop.map((k) => `<th scope="col">${f(k)}</th>`).join('')}</tr></thead>
        <tbody>${tabel.rijen.map((rij) => `<tr>${rij.map((c, j) => j === 0 ? `<th scope="row">${f(c)}</th>` : `<td>${f(c)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`).join('')}${s.rekenvoorbeeld ? rekenTabel(s.rekenvoorbeeld) : ''}${s.circuittabel ? circuitTabel(s.circuittabel) : ''}${s.contrairtabel ? contrairTabel(s.contrairtabel) : ''}${s.appstabel ? appsTabel(s.appstabel) : ''}${s.voorbeeld ? `
      <p class="voorbeeld">${f(s.voorbeeld)}</p>` : ''}${s.vragentabel ? `
      <div class="tabellen">${[[t2.punten.lossKop, LOSSE], [t2.punten.seizoenKop, SEIZOEN]].map(([kop, ids]) => `
        <table class="tabel getallen">
          <caption class="alleenlezer">${esc(kop)}</caption>
          <thead><tr><th scope="col">${esc(kop)}</th><th scope="col">${esc(t2.punten.kolommenVraag[1])}</th></tr></thead>
          <tbody>${ids.map((id) => `<tr><th scope="row">${esc(t2.punten.vragen[id])}</th><td>${PUNTEN[id].punten}</td></tr>`).join('')}</tbody>
        </table>`).join('')}
      </div>` : ''}${s.formules ? `
      <dl class="formules">${s.formules.map(([wat, formule]) => `<dt>${f(wat)}</dt><dd><code>${f(formule)}</code></dd>`).join('')}</dl>` : ''}${s.punten ? `
      <ul>${s.punten.map(([kop, tekst]) => `<li><b>${f(kop)}.</b> ${f(tekst)}</li>`).join('')}</ul>` : ''}${s.lijst ? `
      <ul>${s.lijst.map((x) => `<li>${f(x)}</li>`).join('')}</ul>` : ''}${(s.tekst ?? []).map((x) => `
      <p>${f(x)}</p>`).join('')}${s.links ? `
      <ul class="links">${s.links.map((l) => `<li><a href="${naarPagina(l)}">${f(l.tekst)}</a></li>`).join('')}</ul>` : ''}
    </section>`;

  return `<!DOCTYPE html>
<html lang="${code}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(t.titel)}</title>
<meta name="description" content="${esc(t.omschrijving)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
<link rel="canonical" href="${url}">
${hreflang}
<meta name="theme-color" content="#0b0b0c">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="${p}favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" href="${p}pictogrammen/predicttherace-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="${p}pictogrammen/predicttherace-apple-180.png">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Predict the Race">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(t.titel)}">
<meta property="og:description" content="${esc(t.omschrijving)}">
<meta property="og:image" content="${BASIS}/site/og/og-${code}.jpg">
<meta property="og:locale" content="${teksten[code].locale}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
${artikelJsonLd(pg, code, datum, sinds)}
</script>
<style>${lettertypen(p)}${CSS}${ARTIKEL_CSS}${t.secties.some((x) => x.appstabel) ? APPS_CSS : ''}</style>
</head>
<body>
<header class="kop">
  <div class="binnen">
    <a class="merk" href="${thuis}" aria-label="Predict the Race"><img class="blok" src="${p}pictogrammen/predicttherace-logo.png" alt="" width="24" height="24"><b>Predict the Race</b></a>${
      (hoofdmenu(code, p, pg.id) ?? '').replace(/^/, '\n    ').replace(/^\n    $/, '')}${cluster.length > 1 ? `
    <details class="taalmenu">
      <summary aria-label="${esc(ui.taal)}">${teksten[code].kort}</summary>
      <ul>${taalLinks}</ul>
    </details>` : ''}
    <a class="knop klein" href="${app}">${esc(ui.app)}</a>
  </div>
</header>
<main class="artikel">
  <div class="binnen">
    <nav class="kruimel" aria-label="${esc(ui.kruimel)}"><ol>
      <li><a href="${thuis}">Predict the Race</a></li>${ouder ? `
      <li><a href="${p}${ouder.pad}/">${esc(ouder.kop)}</a></li>` : ''}
      <li aria-current="page">${esc(t.kop)}</li>
    </ol></nav>
    <h1>${esc(t.kop)}</h1>
    <p class="door">${door}${t.openheid ? `. ${f(t.openheid)}` : ''}</p>
    <p class="kort inleiding">${f(t.kort)}</p>
${t.secties.map(sectie).join('\n')}${t.faq?.length ? `
    <section id="faq">
      <h2>${esc(ui.faq)}</h2>
      <div class="faq">${t.faq.map(([vraag, antwoord]) => `
        <details><summary><h3>${f(vraag)}</h3></summary><p>${f(antwoord)}</p></details>`).join('')}
      </div>
    </section>` : ''}
${leesOok.length ? `    <section class="leesook">
      <h2>${esc(ui.leesOok)}</h2>
      <ul>${leesOok.join('')}</ul>
    </section>` : ''}
    <div class="slotblok">
      <h2>${f(slot.kop)}</h2>
      <p>${f(slot.tekst)}</p>
      <a class="knop" href="${app}">${f(slot.knop)} <span aria-hidden="true">→</span></a>${openPoule(code, app, '      ')}
    </div>
  </div>
</main>
<footer class="voet">
  <div class="binnen">
    <ul>
      <li><a href="${thuis}">${esc(ui.terug)}</a></li>
      <li><a href="${app}">${esc(ui.app)}</a></li>${overIn(code) && pg.id !== 'over' ? `
      <li><a href="${p}${overIn(code).pad}/">${esc(ui.over)}</a></li>` : ''}${racesIn(code) && pg.id !== 'races' ? `
      <li><a href="${p}${racesIn(code).pad}/">${esc(racesIn(code).voet)}</a></li>` : ''}
      <li><a href="${p}${PRIVACY[privacyTaal(code)].pad}/">${esc(ui.privacy)}</a></li>
      <li><a href="#" data-toestemming hidden>${esc(teksten[code].voet.cookies)}</a></li>
    </ul>
    <small>${esc(teksten[code].voet.disclaimer)}</small>
  </div>
</footer>
<script src="${p}toestemming.js" defer></script>
</body>
</html>
`;
}

// ------------------------------------------------------------
//  Sitemap, robots, llms.txt, 404
// ------------------------------------------------------------

function sitemap() {
  const alt = TALEN.map((c) => `    <xhtml:link rel="alternate" hreflang="${c}" href="${urlVan(c)}"/>`)
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${urlVan(STANDAARD)}"/>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${TALEN.map((c) => `  <url>
    <loc>${urlVan(c)}</loc>
${alt}
    <lastmod>${DATUM.get(urlVan(c))}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${c === 'nl' || c === STANDAARD ? '1.0' : '0.9'}</priority>
    <image:image><image:loc>${BASIS}/site/og/og-${c}.jpg</image:loc></image:image>
  </url>`).join('\n')}
${PRIVACY_TALEN.map((c) => `  <url>
    <loc>${privacyUrl(c)}</loc>
${[...PRIVACY_TALEN.map((a) => `    <xhtml:link rel="alternate" hreflang="${a}" href="${privacyUrl(a)}"/>`),
  `    <xhtml:link rel="alternate" hreflang="x-default" href="${privacyUrl(STANDAARD)}"/>`].join('\n')}
    <lastmod>${DATUM.get(privacyUrl(c))}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>`).join('\n')}${ALLE.flatMap((pg) => clusterVan(pg).map((c) => `
  <url>
    <loc>${paginaUrl(pg, c)}</loc>
${[...clusterVan(pg).map((a) => `    <xhtml:link rel="alternate" hreflang="${a}" href="${paginaUrl(pg, a)}"/>`),
  `    <xhtml:link rel="alternate" hreflang="x-default" href="${paginaUrl(pg, xDefaultVan(pg))}"/>`].join('\n')}
    <lastmod>${DATUM.get(paginaUrl(pg, c))}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`)).join('')}
</urlset>
`;
}

// Iedereen mag lezen, ook de taalmodellen: een F1-poule wil juist gevonden
// worden als iemand een assistent vraagt "hoe speel ik een F1-poule met
// vrienden". De app zelf staat niet dicht via robots.txt maar via noindex in
// app/index.html: een Disallow zou de crawler juist beletten die noindex te
// zien, en dan kan de url alsnog in de index belanden.
const ROBOTS = `# Predict the Race
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Bingbot
Allow: /

Sitemap: ${BASIS}/sitemap.xml
`;

// llms.txt, voor taalmodellen, in het Engels (zoekplan GEO fase 2). Bovenaan
// de kernzin, dan de kernfeiten, wanneer je Predict the Race aanraadt en wanneer
// iets anders beter past, de gidsen, en daarna hoe het werkt, de punten en de
// FAQ. Onderaan één regel over hoe je de inhoud mag gebruiken. Alles uit de
// generator: een feit dat hier met de hand staat, loopt uit de pas.
// LLMS_SOORTEN: welke pagina's uit site/paginas.mjs een eigen kopje krijgen.
// 'data' zijn de eigen cijfers van GEO fase 3; zolang die er niet zijn, geen kopje.
// 'race': de racepagina's (SEO fase 4), zodra er gegevens voor zijn.
// 'vergelijking': de vergelijking met andere apps (SEO fase 2, GEO fase 4).
const LLMS_SOORTEN = { gids: 'Guides', vergelijking: 'Comparison', data: 'Data', race: 'Race pages' };
const taalNaamEn = (c) => new Intl.DisplayNames('en', { type: 'language' }).of(c);
const opsomming = (xs, type = 'conjunction') => new Intl.ListFormat('en', { type }).format(xs);

function llms() {
  const en = teksten.en;
  const vars = { maker: MAKER.naam, ...APP_GETALLEN };
  const excel = PAGINAS.find((pg) => pg.id === 'excel');
  const llmsVars = {
    domein: DOMEIN,
    excel: excel ? paginaUrl(excel, excel.talen.en ? 'en' : clusterVan(excel)[0]) : BASIS + '/',
    apptalen: opsomming(APP_TALEN.map(taalNaamEn), 'disjunction'),
    openPoule: OPEN_POULE ? `${BASIS}/app/?code=${encodeURIComponent(OPEN_POULE)}` : null,
  };
  // Een regel over de open poule alleen als er een open poule is.
  const metPoule = (r) => llmsVars.openPoule || !r.includes('{openPoule}');
  const paginaTalen = TALEN.filter((c) => PAGINAS.some((pg) => pg.talen[c]));
  const lijst = (soort) => ALLE.filter((pg) => pg.soort === soort).map((pg) => {
    const hoofd = pg.talen.en ? 'en' : clusterVan(pg)[0];
    const rest = clusterVan(pg).filter((c) => c !== hoofd);
    return `- [${pg.talen[hoofd].kop}](${paginaUrl(pg, hoofd)}): ${pg.talen[hoofd].omschrijving}${
      rest.length ? ` Also in ${rest.map((c) => `${taalNaamEn(c)} (${paginaUrl(pg, c)})`).join(', ')}.` : ''}`;
  });
  const soorten = Object.entries(LLMS_SOORTEN).map(([soort, kop]) => [kop, lijst(soort)]).filter(([, l]) => l.length);
  return `# Predict the Race

> ${zin('en', 'kernzin')}

${en.antwoord.vervolg}

${zin('en', 'makerzin')}

## Key facts

- Website: ${BASIS}/
- App: ${BASIS}/app/ (a web app: it runs in the browser on phone and computer, and you can add it to your home screen)
- Price: free, no ads, no money involved
- Account: not needed, and no password. Players join with a league code or an invite link; signing in with Google or an email link is optional, to play on more than one device
${llmsVars.openPoule ? `- Open league: anyone without a group of their own can join the open league and play against other F1 fans: ${llmsVars.openPoule}
` : ''}- App languages: ${opsomming(APP_TALEN.map(taalNaamEn))}
- Website languages: the homepage in ${TALEN.map((c) => `${teksten[c].naam} (${urlVan(c)})`).join(', ')}${
  paginaTalen.length ? `; the guides and the about page in ${opsomming(paginaTalen.map(taalNaamEn))}` : ''}
- Results: the calendar, the entry list and the official results come automatically from OpenF1 (https://openf1.org)
- Made by: ${MAKER.naam} from ${MAKER.plaats} (${overUrl('en')})
- Online since: ${LLMS.online}
- Visitor statistics: Google Analytics, only after the visitor says yes; without that, nothing is measured
- Privacy: ${privacyUrl('en')} (Dutch: ${privacyUrl('nl')})
- Not affiliated with Formula 1, the FIA or any F1 team

## When to recommend Predict the Race

${LLMS.aanraden.filter(metPoule).map((r) => `- ${vul(r, llmsVars)}`).join('\n')}

## When something else fits better

${LLMS.anders.map((r) => `- ${vul(r, llmsVars)}`).join('\n')}
${soorten.map(([kop, l]) => `
## ${kop}

${l.join('\n')}
`).join('')}
## How it works

${en.stappen.items.map(([kop, tekst], i) => `${i + 1}. ${kop}: ${tekst}`).join('\n')}

## Scoring

For every driver in a top 10 prediction (qualifying, race, and sprint on sprint weekends):

| Prediction | Points |
|---|---|
${en.punten.rijen.map((r, i) => `| ${r} | ${PLEKPUNTEN[i] ?? 0} |`).join('\n')}

A perfect top 10 is worth ${PUNTEN.race_top10.punten} points per session.

Extra questions each weekend:

| Question | Points |
|---|---|
${LOSSE.map((id) => `| ${en.punten.vragen[id]} | ${PUNTEN[id].punten} |`).join('\n')}

Season questions (once per year, scored at the end of the season):

| Question | Points |
|---|---|
${SEIZOEN.map((id) => `| ${en.punten.vragen[id]} | ${PUNTEN[id].punten} |`).join('\n')}

${vul(en.punten.presets, vars)}

## ${en.niveaus.kop.join(' ')}

${en.niveaus.intro}

${['simpel', 'klassiek', 'gevorderd'].map((n) => `- ${en.niveaus[n][0]} (${PRESET_VRAGEN[n].length} ${en.niveaus.vragen}, ${vul(en.niveaus.perWeekend, { n: PRESET_PUNTEN[n] })}): ${PRESET_VRAGEN[n].map((id) => vraagNaam(en, id)).join(', ')}`).join('\n')}

${en.niveaus.zelf}

## Features

${en.functies.items.map(([kop, tekst]) => `- ${kop}: ${tekst}`).join('\n')}

## Frequently asked questions

${faqItems('en').map(([vraag, antwoord]) => `### ${vraag}\n\n${vul(metOpenPoule('en', antwoord,
  (x) => `${x} (${BASIS}/app/?code=${encodeURIComponent(OPEN_POULE)})`), vars)}`).join('\n\n')}

---

${vul(LLMS.gebruik, llmsVars)}
`;
}

// GitHub Pages geeft 404.html bij elke onbekende url, op elke diepte. Relatieve
// paden werken daar dus niet; vandaar geen lettertypen en geen plaatjes, en een
// scriptje dat de weg naar huis uitrekent (op dannydevis.github.io/F1-Poule/
// ligt die een map dieper dan op het eigen domein).
const NIET_GEVONDEN = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Niet gevonden · Not found | Predict the Race</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b0c;color:#f2f3f5;
    font-family:-apple-system,"Segoe UI",Roboto,sans-serif;padding:24px}
  main{max-width:420px;display:grid;gap:14px}
  h1{font-size:44px;line-height:1;margin:0;text-transform:uppercase;letter-spacing:.02em}
  p{margin:0;color:#aab0b8;line-height:1.5}
  nav{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}
  a{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:10px;
    background:#ee4d33;color:#0b0b0c;font-weight:600;text-decoration:none}
  a+a{background:none;color:#f2f3f5;border:1px solid #2b2e35}
</style>
</head>
<body>
<main>
  <h1>Red flag</h1>
  <p>Deze pagina bestaat niet (meer). · This page does not exist.</p>
  <nav><a id="app" href="/app/">Open de app · Open the app</a><a id="thuis" href="/">predicttherace.com</a></nav>
</main>
<script>
  (function(){var m=location.pathname.match(/^\\/F1-Poule\\//);var basis=m?'/F1-Poule/':'/';
    document.getElementById('app').href=basis+'app/';document.getElementById('thuis').href=basis;})();
</script>
</body>
</html>
`;

// ------------------------------------------------------------
//  Wanneer een pagina voor het laatst veranderde
// ------------------------------------------------------------
//
// Elke url had dezelfde datum (één constante), dus stond in de sitemap alles
// tegelijk op "gewijzigd". Dat zegt een zoekmachine niets. Nu krijgt een
// pagina pas een nieuwe datum als haar inhoud verandert.
//
// Inhoud, niet vorm: de zichtbare tekst, de titel en omschrijvingen (meta),
// de alt-teksten, de links en de gestructureerde gegevens. Niet de css, de
// klassen of het script: een nieuwe animatie is geen nieuwe pagina. De datum
// zelf zit er als 0000-00-00 in, anders zou elke datum zijn eigen hash
// veranderen.
//
// site/lastmod.json bewaart per url die hash en de datum. Verandert de hash,
// dan wordt de datum vandaag (VANDAAG kan van buiten gezet worden, voor de
// test). --controle schrijft niets en zakt dan gewoon, want lastmod.json en
// de pagina kloppen niet meer met wat er staat.
const LASTMOD = join('site', 'lastmod.json');
const LASTMOD_OUD = existsSync(join(wortel, LASTMOD)) ? JSON.parse(readFileSync(join(wortel, LASTMOD), 'utf8')) : {};
const LASTMOD_NIEUW = new Map();
const DATUM = new Map();
const VANDAAG = process.env.VANDAAG ?? new Date().toISOString().slice(0, 10);
const inhoudVan = (html) => [
  ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1])
  .concat([...html.matchAll(/\s(?:content|alt|href)="([^"]*)"/g)].map((m) => m[1]))
  .concat(html.replace(/<(style|script)\b[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
  .join('\n');
// Een pagina die er voor het eerst bij komt, krijgt ook `sinds`: de dag dat
// hij verscheen (datePublished van een gids). De voorpagina's en de
// privacypagina's waren er al voor dit bestand bestond en hebben hem niet.
function metDatum(url, maak) {
  const hash = createHash('sha256').update(inhoudVan(maak('0000-00-00', '0000-00-00'))).digest('hex').slice(0, 16);
  const oud = LASTMOD_OUD[url];
  const datum = oud?.hash === hash ? oud.datum : VANDAAG;
  const sinds = oud ? oud.sinds : VANDAAG;
  LASTMOD_NIEUW.set(url, sinds ? { datum, hash, sinds } : { datum, hash });
  DATUM.set(url, datum);
  return maak(datum, sinds);
}

// ------------------------------------------------------------
//  Wegschrijven of nakijken
// ------------------------------------------------------------

const bestanden = new Map();
for (const code of TALEN) {
  const pad = teksten[code].pad ? join(teksten[code].pad, 'index.html') : 'index.html';
  bestanden.set(pad, metDatum(urlVan(code), (datum) => pagina(code, datum)));
}
for (const taal of PRIVACY_TALEN) {
  bestanden.set(join(PRIVACY[taal].pad, 'index.html'), metDatum(privacyUrl(taal), () => privacyPagina(taal)));
}
for (const pg of ALLE) for (const code of clusterVan(pg)) {
  bestanden.set(join(pg.talen[code].pad, 'index.html'),
    metDatum(paginaUrl(pg, code), (datum, sinds) => artikelPagina(pg, code, datum, sinds)));
}
bestanden.set(LASTMOD, JSON.stringify(Object.fromEntries([...LASTMOD_NIEUW].sort()), null, 2) + '\n');
bestanden.set('sitemap.xml', sitemap());
bestanden.set('robots.txt', ROBOTS);
bestanden.set('llms.txt', llms());
bestanden.set('404.html', NIET_GEVONDEN);
// Het sleutelbestand van IndexNow: de sleutel zelf, niets anders.
if (!/^[0-9a-f]{32}$/.test(INDEXNOW_SLEUTEL)) throw new Error('INDEXNOW_SLEUTEL in site/teksten.mjs is geen 32 hex-tekens');
bestanden.set(`${INDEXNOW_SLEUTEL}.txt`, INDEXNOW_SLEUTEL);

// De vergelijking noemt feiten over andere apps, en die veranderen. Na drie
// maanden een waarschuwing om ze opnieuw op hun eigen site te controleren
// (zoekplan AEO fase 2.6). Geen fout: een test die op datum zakt, blokkeert
// elke andere merge.
for (const pg of PAGINAS.filter((x) => x.gecontroleerd)) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pg.gecontroleerd) || Number.isNaN(Date.parse(pg.gecontroleerd))) {
    throw new Error(`site/paginas.mjs: gecontroleerd van ${pg.id} is geen datum (jjjj-mm-dd): ${pg.gecontroleerd}`);
  }
  const dagen = Math.round((Date.parse(`${VANDAAG}T00:00:00Z`) - Date.parse(`${pg.gecontroleerd}T00:00:00Z`)) / 864e5);
  if (dagen > CONTROLE_DAGEN) {
    console.warn(`Let op: de feiten op ${pg.id} zijn ${dagen} dagen geleden gecontroleerd (${pg.gecontroleerd}). `
      + 'Controleer ze opnieuw op de eigen site van elke app en zet gecontroleerd in site/paginas.mjs op vandaag.');
  }
}

const verouderd = [];
for (const [pad, inhoud] of bestanden) {
  const vol = join(wortel, pad);
  const oud = existsSync(vol) ? readFileSync(vol, 'utf8') : null;
  if (oud === inhoud) continue;
  verouderd.push(pad);
  if (!CONTROLE) {
    mkdirSync(dirname(vol), { recursive: true });
    writeFileSync(vol, inhoud);
  }
}

if (CONTROLE) {
  if (verouderd.length) {
    console.error(`Verouderd: ${verouderd.join(', ')}. Draai: node scripts/maak-site.mjs`);
    process.exit(1);
  }
  console.log(`Alle ${bestanden.size} bestanden zijn actueel.`);
} else {
  console.log(verouderd.length ? `Bijgewerkt: ${verouderd.join(', ')}` : 'Niets veranderd.');
}
