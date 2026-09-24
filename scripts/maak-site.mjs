#!/usr/bin/env node
/**
 * Maakt de landingspagina's, de privacyverklaring, de sitemap, robots.txt,
 * llms.txt en 404.html uit site/teksten.mjs en site/privacy.mjs.
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
 *   - Anders: geen analytics en geen lettertypen van Google. De app belooft
 *     "geen trackers", en de pagina ervoor hoort dat ook te doen.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { teksten, TALEN, STANDAARD, BASIS, BIJGEWERKT, MAKER, BRON } from '../site/teksten.mjs';
import { PRIVACY, CONTACT, PRIVACY_BIJGEWERKT, privacyTaal } from '../site/privacy.mjs';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLE = process.argv.includes('--controle');

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

// ------------------------------------------------------------
//  Hulpjes
// ------------------------------------------------------------

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const vul = (tekst, vars) => String(tekst).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
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
    --accent-tekst:#bf3219;--groen:#117c3e;
    --nacht:#0b0b0c;--nacht2:#15161a;--nacht-lijn:#2b2e35;--nacht-ink:#f2f3f5;--nacht-ink2:#aab0b8;
    --sans:Barlow,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;
    --cond:"Barlow Condensed","Roboto Condensed","Arial Narrow",var(--sans);
    --mono:"Space Mono",ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  }
  @media (prefers-color-scheme:dark){:root{
    --bg:#0b0b0c;--paneel:#15161a;--paneel2:#1d1f24;--lijn:#2b2e35;
    --ink:#f2f3f5;--ink2:#a4aab2;--ink3:#8a9099;--accent:#ee4d33;--accent-ink:#0b0b0c;
    --accent-tekst:#f26a52;--groen:#34b264;
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
  .merk{display:flex;align-items:center;gap:10px;text-decoration:none;margin-right:auto;min-height:44px}
  .merk .blok{width:22px;height:22px;border-radius:4px;background:var(--accent);flex:none}
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
  .hero .binnen{display:grid;gap:44px}
  .boven{display:inline-flex;align-items:center;gap:10px;font-family:var(--mono);font-size:12px;letter-spacing:.16em;
    text-transform:uppercase;color:#7ee0a3;border:1px solid rgba(52,178,100,.45);background:rgba(52,178,100,.10);
    border-radius:999px;padding:7px 14px}
  .boven::before{content:"";width:8px;height:8px;border-radius:50%;background:#34b264}
  .hero h1{font-family:var(--cond);font-weight:700;text-transform:uppercase;font-size:clamp(46px,9vw,84px);
    line-height:.92;letter-spacing:.005em;margin:22px 0 20px}
  .hero h1 span{display:block}
  .hero h1 span+span{color:var(--accent)}
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

  .stappen{list-style:none;margin:0;padding:0;display:grid;gap:14px;counter-reset:stap}
  .stappen li{background:var(--paneel);border:1px solid var(--lijn);border-radius:16px;padding:22px 22px 22px 76px;
    position:relative;counter-increment:stap}
  .stappen li::before{content:counter(stap,decimal-leading-zero);position:absolute;left:22px;top:18px;
    font-family:var(--cond);font-weight:700;font-size:36px;line-height:1;color:var(--accent)}
  .stappen p{margin:0;color:var(--ink2);font-size:16px}

  .tabel{width:100%;border-collapse:separate;border-spacing:0;background:var(--paneel);border:1px solid var(--lijn);
    border-radius:16px;overflow:hidden;font-size:16px}
  .tabel th,.tabel td{padding:14px 18px;text-align:left;border-top:1px solid var(--lijn)}
  .tabel thead th{border-top:0;font-family:var(--mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;
    color:var(--ink2);font-weight:400;background:var(--paneel2)}
  .tabel td:last-child,.tabel th:last-child{text-align:right;width:36%}
  .tabel td:last-child{font-family:var(--cond);font-weight:700;font-size:26px;line-height:1}
  .tabel tr.top td:last-child{color:var(--accent-tekst)}
  .tabellen{display:grid;gap:18px;margin-top:18px}
  .tabellen .tabel td:last-child{font-size:22px}
  .voorbeeld{margin:18px 0 0;color:var(--ink2);font-size:16px}
  .presets{margin:22px 0 0;color:var(--ink2);font-size:16px;border-left:3px solid var(--accent);padding-left:14px}

  .functies{list-style:none;margin:0;padding:0;display:grid;gap:14px}
  .functies li{background:var(--paneel);border:1px solid var(--lijn);border-radius:16px;padding:22px}
  .functies li::before{content:"";display:block;width:26px;height:4px;border-radius:2px;background:var(--accent);margin-bottom:14px}
  .functies p{margin:0;color:var(--ink2);font-size:16px}

  .beelden{display:grid;gap:22px}
  .beelden figure{margin:0;display:grid;gap:12px;justify-items:center;text-align:center}
  .beelden .kader{width:min(260px,70vw);border-radius:26px;border:6px solid var(--paneel2);overflow:hidden;
    box-shadow:0 24px 48px -28px rgba(0,0,0,.45)}
  .beelden img{display:block;width:100%;height:auto}
  .beelden figcaption{color:var(--ink2);font-size:15px;max-width:22em}

  .duo{display:grid;gap:18px}
  .duo article{background:var(--paneel);border:1px solid var(--lijn);border-radius:18px;padding:26px}
  .duo h2{font-size:clamp(26px,3.4vw,32px);margin:0 0 10px}
  .duo p{margin:0;color:var(--ink2)}
  .duo a{color:var(--accent-tekst)}

  .faq{display:grid;gap:10px;max-width:880px}
  .faq details{background:var(--paneel);border:1px solid var(--lijn);border-radius:14px}
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
    .stappen{grid-template-columns:repeat(2,1fr)}
    .functies{grid-template-columns:repeat(2,1fr)}
    .beelden{grid-template-columns:repeat(3,1fr)}
    .duo{grid-template-columns:1fr 1fr}
    .tabellen{grid-template-columns:1fr 1fr}
    .aanbod{left:auto;right:20px;bottom:20px;max-width:460px}
  }
  @media (min-width:960px){
    .hero{padding:84px 0 92px}
    .hero .binnen{grid-template-columns:1.15fr .85fr;align-items:center}
    .stappen{grid-template-columns:repeat(4,1fr)}
    .stappen li{padding:74px 22px 22px}
    .functies{grid-template-columns:repeat(3,1fr)}
  }
`;

// ------------------------------------------------------------
//  De pagina
// ------------------------------------------------------------

const SCHERMEN = ['races', 'uitslag', 'stand'];
const beeld = (code, scherm, thema) =>
  `${voor(code)}site/beeld/${scherm}-${teksten[code].schermen}-${thema}.jpg`;

function jsonLd(code) {
  const t = teksten[code];
  const url = urlVan(code);
  const plat = (s) => vul(s, { maker: MAKER.naam, ...PRESET_PUNTEN });
  const graaf = [
    { '@type': 'WebSite', '@id': `${BASIS}/#website`, name: 'Predict the Race', url: `${BASIS}/`,
      inLanguage: TALEN, publisher: { '@id': `${BASIS}/#organisatie` } },
    { '@type': 'Organization', '@id': `${BASIS}/#organisatie`, name: 'Predict the Race', url: `${BASIS}/`,
      logo: `${BASIS}/pictogrammen/predicttherace-512.png`,
      founder: { '@type': 'Person', name: MAKER.naam, url: MAKER.url }, sameAs: [BRON] },
    { '@type': 'WebPage', '@id': `${url}#pagina`, url, name: t.titel, description: t.omschrijving,
      inLanguage: code, isPartOf: { '@id': `${BASIS}/#website` }, about: { '@id': `${BASIS}/#app` },
      dateModified: BIJGEWERKT,
      primaryImageOfPage: `${BASIS}/site/og/og-${code}.jpg`,
      speakable: { '@type': 'SpeakableSpecification', cssSelector: ['#wat p', '.faq p'] } },
    { '@type': 'WebApplication', '@id': `${BASIS}/#app`, name: 'Predict the Race',
      url: `${BASIS}/app/`, applicationCategory: 'GameApplication',
      applicationSubCategory: 'Formula 1 prediction game', operatingSystem: 'Web, iOS, Android',
      browserRequirements: 'Requires JavaScript', inLanguage: ['nl', 'en'], isAccessibleForFree: true,
      description: t.antwoord.tekst,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      featureList: t.functies.items.map(([kop]) => kop),
      screenshot: SCHERMEN.map((s) => `${BASIS}/site/beeld/${s}-${t.schermen}-donker.jpg`),
      author: { '@type': 'Person', name: MAKER.naam, url: MAKER.url } },
    { '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: code,
      mainEntity: t.faq.items.map(([vraag, antwoord]) => ({ '@type': 'Question', name: vraag,
        acceptedAnswer: { '@type': 'Answer', text: plat(antwoord) } })) },
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
//   - Een geïnstalleerde app (standalone): die is ooit met start_url "." op
//     het beginscherm gezet, en iOS werkt dat nooit meer bij.
//   - Een terugkerende speler (er staat een poule op dit toestel), maar niet
//     als hij van een eigen pagina komt: wie in de app op het logo tikt of
//     vanaf /en/ terugklikt, wil deze pagina juist zien.
const DOORSTUREN = `(function(){try{
  var l=location,naar=function(){l.replace('app/'+l.search+l.hash)};
  var sleutels=[];try{new URLSearchParams(l.search).forEach(function(v,k){sleutels.push(k)})}catch(e){}
  if(sleutels.some(function(k){return !/^(utm_|fbclid$|gclid$|msclkid$|ref$|mc_)/.test(k)}))return naar();
  if(l.hash.indexOf('=')>-1)return naar();
  if((window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone)return naar();
  var ref=document.referrer||'';if(ref&&ref.indexOf(l.origin)===0)return;
  for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i)||'';
    if(k.indexOf('poule:')===0&&k!=='poule:taal')return naar()}
}catch(e){}})();`;

function pagina(code) {
  const t = teksten[code];
  const p = voor(code);
  const url = urlVan(code);
  const app = `${p}app/`;
  const vars = { maker: MAKER.naam, ...PRESET_PUNTEN };
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
  const rij = (id) => `<tr><td>${esc(t.punten.vragen[id])}</td><td>${PUNTEN[id].punten}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="${code}">
<head>
<meta charset="utf-8">
${code === 'nl' ? `<script>${DOORSTUREN}</script>\n` : ''}<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(t.titel)}</title>
<meta name="description" content="${esc(t.omschrijving)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
<link rel="canonical" href="${url}">
${hreflang}
<meta name="theme-color" content="#0b0b0c">
<meta name="color-scheme" content="light dark">
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
${jsonLd(code)}
</script>
<style>${lettertypen(p)}${CSS}</style>
</head>
<body>
<header class="kop">
  <div class="binnen">
    <a class="merk" href="${naar(code, code)}" aria-label="Predict the Race"><span class="blok"></span><b>Predict the Race</b></a>
    <nav class="kopnav" aria-label="${esc(t.nav.hoe)}">
      <a href="#hoe">${esc(t.nav.hoe)}</a><a href="#punten">${esc(t.nav.punten)}</a><a href="#faq">${esc(t.nav.faq)}</a>
    </nav>
    <details class="taalmenu">
      <summary aria-label="${esc(t.nav.taal)}">${t.kort}</summary>
      <ul>${taalLinks}</ul>
    </details>
    <a class="knop klein" href="${app}">${esc(t.nav.app)}</a>
  </div>
</header>
<main>
<section class="hero">
  <div class="binnen">
    <div>
      <span class="boven">${esc(t.hero.boven)}</span>
      <h1>${t.hero.kop.map((r) => `<span>${esc(r)}</span>`).join('')}</h1>
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
      </div>
      <ul class="vertrouwen">${t.hero.vertrouwen.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>
    <div class="telefoon">
      <div class="achter scherm" aria-hidden="true"><img src="${beeld(code, 'stand', 'donker')}" alt="" width="390" height="844" loading="lazy" decoding="async"></div>
      <div class="scherm"><img src="${beeld(code, 'races', 'donker')}" alt="${esc(t.beelden.races[1])}" width="390" height="844" fetchpriority="high" decoding="async"></div>
    </div>
  </div>
</section>

<section class="antwoord" id="wat">
  <div class="binnen">
    <div class="kader">
      <h2>${esc(t.antwoord.kop)}</h2>
      <p>${esc(t.antwoord.tekst)}</p>
    </div>
  </div>
</section>

<section class="blok" id="hoe">
  <div class="binnen">
    <h2>${esc(t.stappen.kop)}</h2>
    <ol class="stappen">${t.stappen.items.map(([kop, tekst]) =>
      `<li><h3>${esc(kop)}</h3><p>${esc(tekst)}</p></li>`).join('')}</ol>
  </div>
</section>

<section class="blok" id="punten">
  <div class="binnen">
    <h2>${esc(t.punten.kop)}</h2>
    <p class="inleiding">${esc(t.punten.intro)}</p>
    <table class="tabel">
      <thead><tr><th scope="col">${esc(t.punten.kolommen[0])}</th><th scope="col">${esc(t.punten.kolommen[1])}</th></tr></thead>
      <tbody>${t.punten.rijen.map((r, i) => `<tr${i === 0 ? ' class="top"' : ''}><td>${esc(r)}</td><td>${PLEKPUNTEN[i] ?? 0}</td></tr>`).join('')}</tbody>
    </table>
    <p class="voorbeeld">${esc(t.punten.voorbeeld)}</p>
    <div class="tabellen">
      <table class="tabel">
        <caption class="alleenlezer">${esc(t.punten.lossKop)}</caption>
        <thead><tr><th scope="col">${esc(t.punten.lossKop)}</th><th scope="col">${esc(t.punten.kolommenVraag[1])}</th></tr></thead>
        <tbody>${LOSSE.map(rij).join('')}</tbody>
      </table>
      <table class="tabel">
        <caption class="alleenlezer">${esc(t.punten.seizoenKop)}</caption>
        <thead><tr><th scope="col">${esc(t.punten.seizoenKop)}</th><th scope="col">${esc(t.punten.kolommenVraag[1])}</th></tr></thead>
        <tbody>${SEIZOEN.map(rij).join('')}</tbody>
      </table>
    </div>
    <p class="presets">${esc(vul(t.punten.presets, vars))}</p>
  </div>
</section>

<section class="blok" id="functies">
  <div class="binnen">
    <h2>${esc(t.functies.kop)}</h2>
    <ul class="functies">${t.functies.items.map(([kop, tekst]) =>
      `<li><h3>${esc(kop)}</h3><p>${esc(tekst)}</p></li>`).join('')}</ul>
  </div>
</section>

<section class="blok" id="beelden">
  <div class="binnen">
    <h2>${esc(t.beelden.kop)}</h2>
    <div class="beelden">${SCHERMEN.map((s) => `
      <figure>
        <div class="kader">${plaatje(s, t.beelden[s][1])}</div>
        <figcaption>${esc(t.beelden[s][0])}</figcaption>
      </figure>`).join('')}
    </div>
  </div>
</section>

<section class="blok">
  <div class="binnen duo">
    <article><h2>${esc(t.privacy.kop)}</h2><p>${esc(t.privacy.tekst)} <a href="${naarPrivacy(code)}"${privacyHreflang(code)}>${esc(t.privacy.meer)}</a></p></article>
    <article><h2>${esc(t.maker.kop)}</h2><p>${esc(vul(t.maker.tekst, vars))} <a href="${BRON}" rel="noopener">github.com/DannydeVis/F1-Poule</a></p></article>
  </div>
</section>

<section class="blok" id="faq">
  <div class="binnen">
    <h2>${esc(t.faq.kop)}</h2>
    <div class="faq">${t.faq.items.map(([vraag, antwoord]) => `
      <details><summary><h3>${esc(vraag)}</h3></summary><p>${esc(vul(antwoord, vars))}</p></details>`).join('')}
    </div>
  </div>
</section>

<section class="slot">
  <div class="binnen">
    <h2>${esc(t.slot.kop)}</h2>
    <p>${esc(t.slot.tekst)}</p>
    <a class="knop" href="${app}">${esc(t.slot.knop)} <span aria-hidden="true">→</span></a>
  </div>
</section>
</main>
<footer class="voet">
  <div class="binnen">
    <div><span class="label">${esc(t.nav.taal)}</span><ul>${TALEN.map((c) =>
      `<li><a href="${naar(code, c)}" hreflang="${c}" lang="${c}" data-taal="${c}">${esc(teksten[c].naam)}</a></li>`).join('')}</ul></div>
    <ul>
      <li><a href="${app}">${esc(t.voet.app)}</a></li>
      <li><a href="${naarPrivacy(code)}"${privacyHreflang(code)}>${esc(t.voet.privacy)}</a></li>
      <li><a href="${BRON}" rel="noopener">${esc(t.voet.bron)}</a></li>
      <li><a href="https://openf1.org" rel="noopener">${esc(t.voet.data)}</a></li>
    </ul>
    <small>${esc(t.voet.disclaimer)}</small>
  </div>
</footer>
<script>${taalScript(code)}</script>
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
    <a class="merk" href="${thuis}" aria-label="Predict the Race"><span class="blok"></span><b>Predict the Race</b></a>
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
      <li><a href="${BRON}" rel="noopener">${esc(teksten[taal].voet.bron)}</a></li>
    </ul>
    <small>${esc(teksten[taal].voet.disclaimer)}</small>
  </div>
</footer>
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
    <lastmod>${BIJGEWERKT}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${c === 'nl' || c === STANDAARD ? '1.0' : '0.9'}</priority>
    <image:image><image:loc>${BASIS}/site/og/og-${c}.jpg</image:loc></image:image>
  </url>`).join('\n')}
${PRIVACY_TALEN.map((c) => `  <url>
    <loc>${privacyUrl(c)}</loc>
${[...PRIVACY_TALEN.map((a) => `    <xhtml:link rel="alternate" hreflang="${a}" href="${privacyUrl(a)}"/>`),
  `    <xhtml:link rel="alternate" hreflang="x-default" href="${privacyUrl(STANDAARD)}"/>`].join('\n')}
    <lastmod>${PRIVACY_BIJGEWERKT}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>`).join('\n')}
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

function llms() {
  const en = teksten.en;
  const vars = { maker: MAKER.naam, ...PRESET_PUNTEN };
  return `# Predict the Race

> ${en.omschrijving}

${en.antwoord.tekst}

- Website: ${BASIS}/
- App: ${BASIS}/app/
- Languages of this page: ${TALEN.map((c) => `${teksten[c].naam} (${urlVan(c)})`).join(', ')}
- App languages: English, Dutch
- Price: free, no ads, no trackers, no money involved
- Privacy: ${privacyUrl('en')} (Dutch: ${privacyUrl('nl')})
- Made by: ${MAKER.naam} (${MAKER.url}); source code: ${BRON}
- Data source for calendar and results: OpenF1 (https://openf1.org)
- Not affiliated with Formula 1, the FIA or any F1 team

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

## Features

${en.functies.items.map(([kop, tekst]) => `- ${kop}: ${tekst}`).join('\n')}

## Frequently asked questions

${en.faq.items.map(([vraag, antwoord]) => `### ${vraag}\n\n${vul(antwoord, vars)}`).join('\n\n')}
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
<title>Niet gevonden · Not found – Predict the Race</title>
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
//  Wegschrijven of nakijken
// ------------------------------------------------------------

const bestanden = new Map();
for (const code of TALEN) {
  const pad = teksten[code].pad ? join(teksten[code].pad, 'index.html') : 'index.html';
  bestanden.set(pad, pagina(code));
}
for (const taal of PRIVACY_TALEN) bestanden.set(join(PRIVACY[taal].pad, 'index.html'), privacyPagina(taal));
bestanden.set('sitemap.xml', sitemap());
bestanden.set('robots.txt', ROBOTS);
bestanden.set('llms.txt', llms());
bestanden.set('404.html', NIET_GEVONDEN);

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
