// De cijfers over alle spelers op de site (Danny, 1 november), zonder browser.
//
// "Op de site krijgt de racepagina na het weekend een blok 'Zo voorspelden de
// spelers de GP van {naam}' met die cijfers. De generator werkt de pagina bij
// (ook lastmod), en de cijfers komen in de JSON-LD en in llms.txt." En: "Een
// pagina 'Wie wordt wereldkampioen in {jaar}? Zo voorspellen de spelers': de
// verdeling van de seizoensvragen van het komende seizoen, met dezelfde
// drempels, met een knop naar de open poule."
//
// In de echte repo staan er (nog) geen cijfers: in productie haalt nog geen
// sessie de drempel. Daarom in een kopie van de repo, met een
// site/data/spelers-2026.json en -2027.json zoals de sync ze schrijft
// (scripts/spelerscijfers.mjs, sitebestand()). Wat hier vastligt:
//   1. Singapore (gereden) krijgt het blok in zeven talen: de vraag, het korte
//      antwoord met de aantallen, een tabel per sessie en de verdeling in vijf
//      banden die optellen tot het aantal spelers. Austin (gereden, geen
//      cijfers) en Mexico-Stad (cijfers van de kwalificatie, maar de race is
//      in de kopie nog niet gereden) krijgen niets.
//   2. In de JSON-LD van die pagina een Dataset over de race, met de aantallen
//      en de licentie; in llms.txt een blok "What the players predicted".
//   3. De pagina "wie wordt wereldkampioen in 2027" in zeven talen, met de
//      procenten per coureur en per team, een knop naar de open poule, in de
//      sitemap met een datum, en een Dataset. Zonder kampioen boven de drempel
//      geen pagina.
//   4. De nieuwe pagina's halen dezelfde keuring als de rest: de antwoordvorm,
//      de vragenlijst, GEO, het hoofdmenu en lastmod draaien in de kopie groen.
//   5. Een tweede keer maken verandert niets.

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';
import { banden, kampioenPagina } from '../scripts/racepaginas.mjs';
import { OPEN_POULE, TALEN } from '../site/teksten.mjs';
import { KAMPIOEN_TEKST, RACE_TEKST } from '../site/races.mjs';

const { check, afronden } = maakControle('spelerscijfers op de site');

// ---- de kopie ----------------------------------------------------------------------------
const kopie = mkdtempSync(join(tmpdir(), 'spelerscijfers-site-'));
cpSync(wortel, kopie, { recursive: true, filter: (bron) => !/[\\/](\.git|node_modules)([\\/]|$)/.test(bron.slice(wortel.length)) });
// De tests die hieronder in de kopie draaien, laden hulp.mjs; die kijkt in node_modules.
if (existsSync(join(wortel, 'node_modules'))) symlinkSync(join(wortel, 'node_modules'), join(kopie, 'node_modules'), 'dir');
const coureur = (nr, naam, team) => ({ nr, naam, code: naam.slice(0, 3).toUpperCase(), team });
const sessie = (spelers, poules, verdeling, extra = {}) => ({ spelers, poules, gemiddeld: 19.7, max: 50,
  p1: { ...coureur('63', 'George Russell', 'Mercedes'), goed: 15 },
  vaakst: { ...coureur('1', 'Max Verstappen', 'Red Bull Racing'), plek: 2, goed: 19 },
  minst: { ...coureur('87', 'Oliver Bearman', 'Haas F1 Team'), plek: 10, goed: 0 },
  verrassing: { ...coureur('81', 'Oscar Piastri', 'McLaren'), plek: null, verwacht: 4.2, erin: 58, richting: 'overschat' },
  verdeling, ...extra });
const VERDELING = { 3: 5, 9: 9, 15: 12, 21: 16, 27: 11, 35: 6, 44: 2 };
writeFileSync(join(kopie, 'site', 'data', 'spelers-2026.json'), JSON.stringify({ jaar: 2026, races: [
  { ronde: 18, naam: 'Singapore Grand Prix', race_key: 11388, sessies: {
    quali: sessie(64, 9, { 5: 4, 12: 10, 18: 14, 24: 18, 30: 12, 38: 6 }), race: sessie(61, 9, VERDELING) } },
  // Mexico-Stad: de kwalificatie heeft cijfers, maar de race is in de kopie
  // nog niet gereden (zie hieronder). Dan nog geen blok.
  { ronde: 21, naam: 'Mexico City Grand Prix', race_key: 11404, sessies: { quali: sessie(55, 6, { 20: 55 }) } },
], seizoen: null }, null, 1));
const SEIZOEN = { spelers: 120, poules: 14, tot: '2027-03-05T05:30:00.000Z',
  kampioen: { spelers: 120, poules: 14, lijst: [
    { ...coureur('1', 'Max Verstappen', 'Red Bull Racing'), aantal: 46 }, { ...coureur('4', 'Lando Norris', 'McLaren'), aantal: 38 },
    { ...coureur('81', 'Oscar Piastri', 'McLaren'), aantal: 20 }, { ...coureur('63', 'George Russell', 'Mercedes'), aantal: 16 }] },
  constructeur: { spelers: 118, poules: 14, lijst: [{ team: 'McLaren', aantal: 61 }, { team: 'Red Bull Racing', aantal: 57 }] } };
writeFileSync(join(kopie, 'site', 'data', 'spelers-2027.json'), JSON.stringify({ jaar: 2027, races: [], seizoen: SEIZOEN }, null, 1));
// In de kopie is de race in Mexico-Stad nog niet gereden: de uitslag staat
// erin zoals scripts/racedata.mjs hem tussen de kwalificatie en de race
// schrijft (de kwalificatie wel, de race null). In de echte repo is die race
// inmiddels gereden; zo hangt de test niet af van hoe ver het seizoen is.
const RACES = join(kopie, 'site', 'data', 'races-2026.json');
const racedata = JSON.parse(readFileSync(RACES, 'utf8'));
const mexico = racedata.races.find((r) => r.slug === 'mexico-city');
mexico.uitslag = { kwalificatie: mexico.uitslag?.kwalificatie ?? null, race: null };
writeFileSync(RACES, `${JSON.stringify(racedata, null, 2)}\n`);
const gereden = (slug) => racedata.races.find((r) => r.slug === slug)?.uitslag?.race?.length >= 3;
spawnSync('git', ['init', '-q'], { cwd: kopie });
spawnSync('git', ['add', '-A'], { cwd: kopie });

const maak = () => spawnSync(process.execPath, [join(kopie, 'scripts', 'maak-site.mjs')],
  { cwd: kopie, encoding: 'utf8', env: { ...process.env, VANDAAG: '2026-12-05' } });
const eerste = maak();
check('maak-site draait in de kopie', eerste.status === 0, eerste.stderr.slice(-400));
const lees = (pad) => readFileSync(join(kopie, ...pad.split('/'), 'index.html'), 'utf8');
const tekst = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, '\'').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const ld = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .flatMap(([, x]) => { try { return JSON.parse(x)['@graph'] ?? []; } catch { return []; } });
const IDS = { nl: 'spelers', en: 'players', de: 'spieler', fr: 'joueurs', es: 'jugadores', it: 'giocatori', pt: 'jogadores' };

// ---- 1. het blok op de racepagina ---------------------------------------------------------
{
  const fout = [];
  for (const code of TALEN) {
    const pad = `${RACE_TEKST[code].pad}/2026/singapore`;
    const h = lees(pad);
    const blok = h.match(new RegExp(`<section class="vraag" id="${IDS[code]}">([\\s\\S]*?)</section>`))?.[1];
    if (!blok) { fout.push(`${code}: geen blok`); continue; }
    const t = tekst(blok);
    if (!/<h2>[^<]+\?<\/h2>\s*<p class="kort">/.test(blok)) fout.push(`${code}: geen vraag met kort antwoord`);
    if (!/\b61\b/.test(t) || !/\b9\b/.test(t)) fout.push(`${code}: aantallen ontbreken`);
    if ((blok.match(/<table/g) ?? []).length !== 2 || (blok.match(/<caption>/g) ?? []).length !== 2) fout.push(`${code}: niet twee tabellen met bijschrift`);
    // De vijf banden: hun aantallen tellen op tot 61.
    const tabel = [...blok.matchAll(/<table[\s\S]*?<\/table>/g)][1]?.[0] ?? '';
    const aantallen = [...tabel.matchAll(/<tr><th scope="row">[^<]*<\/th><td>(\d+)<\/td>/g)].map(([, n]) => Number(n));
    if (aantallen.length !== 5 || aantallen.reduce((a, b) => a + b, 0) !== 61) fout.push(`${code}: banden ${aantallen}`);
  }
  check('Singapore krijgt na het weekend het blok in zeven talen: vraag, kort antwoord met de aantallen, twee tabellen, de banden tellen op tot het aantal spelers',
    fout.length === 0, fout.join(' | '));
  const nl = tekst(lees('races/2026/singapore'));
  check('in het Nederlands: "Zo voorspelden de spelers" als bijschrift, de winnaar, vaakst, minst en de verrassing',
    nl.includes('Zo voorspelden de spelers de Grand Prix van Singapore 2026') && nl.includes('25% had de winnaar goed')
      && nl.includes('Max Verstappen stond het vaakst op de goede plek: 31% had hem op P2')
      && nl.includes('Oliver Bearman stond het minst vaak op de goede plek') && nl.includes('De grootste verrassing was Oscar Piastri'),
    nl.slice(nl.indexOf('Hoe voorspelden'), nl.indexOf('Hoe voorspelden') + 400));
  check('Austin (gereden, zonder cijfers) en Mexico-Stad (cijfers, maar de race niet gereden) krijgen niets',
    gereden('singapore') && gereden('austin') && !gereden('mexico-city')
      && !lees('races/2026/austin').includes('id="spelers"') && !lees('races/2026/mexico-city').includes('id="spelers"'),
    `gereden: singapore ${gereden('singapore')}, austin ${gereden('austin')}, mexico-city ${gereden('mexico-city')}`);
  check('de banden: vijf, van 0 tot 50 (op een sprint tot 25), en alles telt mee',
    JSON.stringify(banden(VERDELING, 50).map((b) => [b.van, b.tot, b.aantal])) === '[[0,9,14],[10,19,12],[20,29,27],[30,39,6],[40,50,2]]'
      && banden({ 25: 3, 0: 1 }, 25).map((b) => `${b.van}-${b.tot}:${b.aantal}`).join() === '0-4:1,5-9:0,10-14:0,15-19:0,20-25:3');
}

// ---- 2. de JSON-LD en llms.txt -------------------------------------------------------------
{
  const graaf = ld(lees('en/races/2026/singapore'));
  const set = graaf.find((x) => x['@type'] === 'Dataset');
  const waarde = (naam) => set?.variableMeasured?.find((v) => v.name === naam)?.value;
  check('in de JSON-LD een Dataset over de race, met de aantallen en de licentie',
    set?.about?.['@id']?.endsWith('#race') && waarde('players') === 61 && waarde('pools') === 9
      && waarde('share with P1 right') === Math.round((15 / 61) * 1000) / 1000
      && /by-nc-sa\/4\.0/.test(set.license) && set['@id'].endsWith('#players') && set.isAccessibleForFree === true,
    JSON.stringify(set)?.slice(0, 400));
  const llms = readFileSync(join(kopie, 'llms.txt'), 'utf8');
  const blok = llms.split('\n## What the players predicted\n')[1]?.split('\n## ')[0] ?? '';
  check('llms.txt: een blok "What the players predicted" met Singapore en de kampioen, met de cijfers',
    blok.includes('(https://predicttherace.com/en/races/2026/singapore/#players): 61 players from 9 pools')
      && blok.includes('(https://predicttherace.com/en/who-will-be-f1-world-champion-2027/)')
      && /38% pick Max Verstappen/.test(blok) && !blok.includes('mexico-city'), blok.slice(0, 600));
}

// ---- 3. de pagina "wie wordt wereldkampioen" ------------------------------------------------
{
  const fout = [];
  for (const code of TALEN) {
    const pad = KAMPIOEN_TEKST[code].pad.replace('{jaar}', '2027');
    if (!existsSync(join(kopie, pad, 'index.html'))) { fout.push(`${code}: geen pagina op ${pad}`); continue; }
    const h = lees(pad);
    const knop = h.match(/<a class="knop" href="([^"]+)">/g)?.at(-1) ?? '';
    if (!knop.includes(`?code=${OPEN_POULE}`)) fout.push(`${code}: knop ${knop}`);
    const t = tekst(h);
    if (!/38\s?%/.test(t) || !/52\s?%/.test(t)) fout.push(`${code}: procenten ontbreken`);
    if (!ld(h).some((x) => x['@type'] === 'Dataset')) fout.push(`${code}: geen Dataset`);
  }
  check('de pagina in zeven talen, met de procenten per coureur en per team, een knop naar de open poule en een Dataset',
    fout.length === 0, fout.join(' | '));
  const nl = tekst(lees('wie-wordt-wereldkampioen-2027'));
  check('in het Nederlands de kop van Danny, de favoriet, de volgers en tot wanneer',
    nl.includes('Wie wordt wereldkampioen in 2027? Zo voorspellen de spelers')
      && nl.includes('Max Verstappen (Red Bull Racing) is de favoriet van de spelers: 38% kiest hem')
      && nl.includes('Lando Norris (32%), Oscar Piastri (17%) en George Russell (13%)') && nl.includes('5 maart 2027'),
    nl.slice(0, 600));
  const sitemap = readFileSync(join(kopie, 'sitemap.xml'), 'utf8');
  const lastmod = JSON.parse(readFileSync(join(kopie, 'site', 'lastmod.json'), 'utf8'));
  check('in de sitemap, met een datum in lastmod (de dag van het maken)',
    sitemap.includes('<loc>https://predicttherace.com/wie-wordt-wereldkampioen-2027/</loc>')
      && lastmod['https://predicttherace.com/wie-wordt-wereldkampioen-2027/']?.datum === '2026-12-05'
      && lastmod['https://predicttherace.com/races/2026/singapore/']?.datum === '2026-12-05',
    JSON.stringify(lastmod['https://predicttherace.com/wie-wordt-wereldkampioen-2027/']));
  check('zonder kampioen boven de drempel geen pagina, ook niet met alleen de constructeurs',
    kampioenPagina({ jaar: 2028, seizoen: null }) === null
      && kampioenPagina({ jaar: 2028, seizoen: { ...SEIZOEN, kampioen: null } }) === null
      && kampioenPagina({ jaar: 2027, seizoen: SEIZOEN })?.id === 'kampioen-2027');
}

// ---- 4. dezelfde keuring als de rest ---------------------------------------------------------
{
  const uit = ['antwoordvorm', 'vragen', 'geo', 'hoofdmenu', 'lastmod'].map((t) => {
    const r = spawnSync(process.execPath, [join(kopie, 'test', `${t}.test.mjs`)], { cwd: kopie, encoding: 'utf8' });
    return { t, ok: r.status === 0, regel: (r.stdout.trim().split('\n').at(-1) ?? '') + (r.status ? ` ${r.stdout.split('\n').filter((x) => /FAIL/.test(x)).slice(0, 2).join(' ')}` : '') };
  });
  check('met de nieuwe pagina\'s erbij slagen de antwoordvorm, de vragenlijst, GEO, het hoofdmenu en lastmod',
    uit.every((x) => x.ok), uit.map((x) => `${x.t}: ${x.regel}`).join(' | '));
}

// ---- 5. een tweede keer -----------------------------------------------------------------------
{
  const tweede = maak();
  check('een tweede keer maken verandert niets', tweede.status === 0 && /Niets veranderd/.test(tweede.stdout), tweede.stdout.slice(-200));
}

process.exit(afronden() ? 0 : 1);
