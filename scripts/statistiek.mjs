#!/usr/bin/env node
/**
 * Hoe voorspelbaar was F1 in 2026? (zoekplan GEO 3.1)
 *
 * Voor elke gereden race van het seizoen: hoeveel punten een simpele
 * voorspelling van de top 10 van de race had opgeleverd, met de puntentelling
 * van de app (plekpunten: 5 voor de goede plek, 3 voor één ernaast, 1 voor
 * twee ernaast; test/statistiek.test.mjs legt het naast scoreLijst() uit de
 * app). Vier voorspellingen om tegen te meten:
 *
 *   willekeurig   een willekeurige top 10 uit de deelnemers, zoals automatisch
 *                 invullen doet. Niet gesimuleerd maar exact: elke coureur
 *                 staat met kans 1/n op elke plek, dus de verwachting is de som
 *                 van de plekpunten gedeeld door n (met 20 of meer finishers
 *                 125 gedeeld door n). Elke run dezelfde uitkomst.
 *   kwalificatie  de uitslag van de kwalificatie. Niet de startopstelling na
 *                 straffen: die staat niet in de database (zie BEPERKINGEN).
 *   stand         de WK-stand vóór de race, uit de uitslagen van de races en
 *                 sprints ervoor (25-18-15-12-10-8-6-4-2-1 en 8-7-6-5-4-3-2-1);
 *                 bij gelijke punten telt wie vaker hoger eindigde.
 *   vorige        de uitslag van de vorige gereden race.
 *
 * De uitslagen komen uit de tabel races in Supabase, waar de sync ze uit
 * OpenF1 zet (dezelfde lijsten waarmee de app de punten geeft). De tabel is
 * openbaar te lezen met de publieke sleutel uit app/index.html.
 *
 *   node scripts/statistiek.mjs          ophalen en site/data/statistiek-2026.json schrijven
 *   DROOG=1 node scripts/statistiek.mjs  alleen in de log
 *   STATISTIEK_BRON=rijen.json ...       de rijen uit een bestand (de test)
 *
 * Supabase is niet vanaf elke plek bereikbaar, vanaf een GitHub-runner wel:
 * daarom draait dit in .github/workflows/circuits.yml. Het bestand heeft geen
 * datum van de run, alleen de laatste race die erin zit; zo verandert het
 * alleen als er een race bij komt.
 *
 * De pagina zelf maakt scripts/statistiekpagina.mjs, en die staat pas online
 * als STATISTIEK_LIVE daar aan staat.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
export const STATISTIEK_JAAR = 2026;
export const BESTAND = join('site', 'data', `statistiek-${STATISTIEK_JAAR}.json`);
export const SOORTEN = ['kwalificatie', 'stand', 'vorige', 'willekeurig'];

// De plekpunten van de app: max(0, 5 - 2 × verschil). Het maximum voor een
// top 10 is dus 10 × 5.
export const plekPunten = (voorspeld, echt) => Math.max(0, 5 - 2 * Math.abs(voorspeld - echt));
export const MAX = 10 * plekPunten(0, 0);
export const RACEPUNTEN = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const SPRINTPUNTEN = [8, 7, 6, 5, 4, 3, 2, 1];

const lijst = (x) => (Array.isArray(x) ? x.map(String) : []);
const een = (x) => Math.round(x * 10) / 10;

/** Punten voor een voorspelde top 10 tegen de uitslag, zoals scoreLijst(). */
export function punten(voorspeld, uitslag) {
  const echt = lijst(uitslag);
  return lijst(voorspeld).slice(0, 10).reduce((som, nr, i) => {
    const j = echt.indexOf(nr);
    return som + (j === -1 ? 0 : plekPunten(i, j));
  }, 0);
}

/**
 * De verwachting van een willekeurige top 10 uit n deelnemers. Over de hele
 * uitslag, net als scoreLijst(): wie op P10 staat en elfde werd, krijgt 3.
 */
export function willekeurig(n, uitslag) {
  if (!n) return null;
  const k = lijst(uitslag).length;
  let som = 0;
  for (let i = 0; i < 10; i++) for (let j = 0; j < k; j++) som += plekPunten(i, j);
  return som / n;
}

/** De WK-stand uit de races ervoor: nummers, de hoogste eerst. */
export function stand(eerder) {
  const tel = new Map();
  const rij = (nr) => {
    if (!tel.has(nr)) tel.set(nr, { nr, punten: 0, plekken: Array(30).fill(0) });
    return tel.get(nr);
  };
  for (const r of eerder) {
    lijst(r.race_result).forEach((nr, i) => {
      const x = rij(nr);
      x.punten += RACEPUNTEN[i] ?? 0;
      if (i < 30) x.plekken[i] += 1;
    });
    lijst(r.sprint_result).forEach((nr, i) => { rij(nr).punten += SPRINTPUNTEN[i] ?? 0; });
  }
  const terugtellen = (a, b) => {
    for (let i = 0; i < 30; i++) if (a.plekken[i] !== b.plekken[i]) return b.plekken[i] - a.plekken[i];
    return Number(a.nr) - Number(b.nr);
  };
  return [...tel.values()].sort((a, b) => b.punten - a.punten || terugtellen(a, b)).map((x) => x.nr);
}

const gereden = (r) => !r.afgelast && lijst(r.race_result).length > 0;

/**
 * Alles voor de pagina, uit de rijen van één seizoen. Alleen gereden races;
 * de afgelaste tellen als afgelast mee.
 *
 * @param rijen  [{round, name, country, afgelast, deadline_race, drivers,
 *               quali_result, race_result, sprint_result}]
 * @param coureurs  {nr: {naam, team}}
 */
export function voorspelbaarheid(rijen, coureurs = {}, jaar = STATISTIEK_JAAR) {
  const races = [...rijen].filter((r) => r.season === undefined || r.season === jaar).sort((a, b) => a.round - b.round);
  const uit = [];
  for (const r of races.filter(gereden)) {
    const eerder = races.filter((x) => x.round < r.round && gereden(x));
    const vorige = eerder.at(-1);
    const n = lijst(r.drivers).length || lijst(r.quali_result).length;
    const q = lijst(r.quali_result);
    const winnaar = lijst(r.race_result)[0];
    uit.push({
      ronde: r.round,
      naam: r.name,
      land: r.country ?? null,
      datum: String(r.deadline_race ?? '').slice(0, 10) || null,
      winnaar: { nr: winnaar, naam: coureurs[winnaar]?.naam ?? null, team: coureurs[winnaar]?.team ?? null },
      pole: q[0] ?? null,
      punten: {
        kwalificatie: q.length ? punten(q, r.race_result) : null,
        stand: eerder.length ? punten(stand(eerder), r.race_result) : null,
        vorige: vorige ? punten(vorige.race_result, r.race_result) : null,
        willekeurig: n ? een(willekeurig(n, r.race_result)) : null,
      },
    });
  }
  const gemiddeld = Object.fromEntries(SOORTEN.map((s) => {
    const w = uit.map((x) => x.punten[s]).filter((v) => v !== null);
    return [s, w.length ? { gemiddeld: een(w.reduce((a, b) => a + b, 0) / w.length), races: w.length } : null];
  }));
  // Het voorspelbaarst: waar de kwalificatie het meest opleverde. Bij gelijk de vroegste.
  const opKwali = uit.filter((x) => x.punten.kwalificatie !== null)
    .map((x) => ({ ronde: x.ronde, naam: x.naam, punten: x.punten.kwalificatie }));
  const best = [...opKwali].sort((a, b) => b.punten - a.punten || a.ronde - b.ronde).slice(0, 3);
  const slechtst = [...opKwali].sort((a, b) => a.punten - b.punten || a.ronde - b.ronde).slice(0, 3);
  const metPole = uit.filter((x) => x.pole);
  return {
    jaar,
    bron: 'Predict the Race, op basis van OpenF1 (https://openf1.org): de uitslagen van kwalificatie, sprint en race',
    max: MAX,
    laatste: uit.at(-1) ? { ronde: uit.at(-1).ronde, naam: uit.at(-1).naam, datum: uit.at(-1).datum } : null,
    gereden: uit.length,
    afgelast: races.filter((r) => r.afgelast).map((r) => r.name),
    gemiddeld,
    best,
    slechtst,
    pole: { gewonnen: metPole.filter((x) => x.pole === x.winnaar.nr).length, races: metPole.length },
    races: uit,
  };
}

/** De CSV voor de site: per race een regel, met de punten van elke voorspelling. */
export function csv(data) {
  const kop = ['round', 'race', 'date', 'winner', 'qualifying', 'standings_before', 'previous_race', 'random_expected'];
  const veld = (v) => (v === null || v === undefined ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return `${[kop, ...data.races.map((r) => [r.ronde, r.naam, r.datum, r.winnaar.naam ?? r.winnaar.nr,
    r.punten.kwalificatie, r.punten.stand, r.punten.vorige, r.punten.willekeurig])]
    .map((rij) => rij.map(veld).join(',')).join('\n')}\n`;
}

// ---- ophalen --------------------------------------------------------------------

function sleutels() {
  const app = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
  const url = app.match(/const SUPABASE_URL = '([^']+)';/)?.[1];
  const sleutel = app.match(/const SUPABASE_ANON_KEY = '([^']+)';/)?.[1];
  if (!url || !sleutel) throw new Error('app/index.html: SUPABASE_URL of SUPABASE_ANON_KEY niet gevonden');
  return { url, sleutel };
}

export async function haalRijen(jaar = STATISTIEK_JAAR) {
  if (process.env.STATISTIEK_BRON) return JSON.parse(readFileSync(process.env.STATISTIEK_BRON, 'utf8'));
  const { url, sleutel } = sleutels();
  const velden = 'season,round,name,country,afgelast,deadline_race,drivers,quali_result,race_result,sprint_result';
  const res = await fetch(`${url}/rest/v1/races?season=eq.${jaar}&select=${velden}&order=round`,
    { headers: { apikey: sleutel, Authorization: `Bearer ${sleutel}` } });
  if (!res.ok) throw new Error(`Supabase gaf ${res.status} op races`);
  return res.json();
}

/** De rijen zoals voorspelbaarheid() ze wil, met de namen apart. */
export function splits(rijen) {
  const coureurs = {};
  const races = rijen.map((r) => {
    for (const d of Array.isArray(r.drivers) ? r.drivers : []) {
      if (d && typeof d === 'object' && d.nr) coureurs[String(d.nr)] = { naam: d.naam ?? null, team: d.team ?? null };
    }
    return { ...r, drivers: (Array.isArray(r.drivers) ? r.drivers : []).map((d) => (d && typeof d === 'object' ? d.nr : d)) };
  });
  return { races, coureurs };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { races, coureurs } = splits(await haalRijen());
  const data = voorspelbaarheid(races, coureurs);
  const tekst = `${JSON.stringify(data, null, 1)}\n`;
  console.log(`${data.gereden} races, laatste: ${data.laatste?.naam ?? 'geen'}`);
  for (const s of SOORTEN) console.log(`  ${s}: ${data.gemiddeld[s]?.gemiddeld ?? '-'} van ${MAX} (${data.gemiddeld[s]?.races ?? 0} races)`);
  for (const r of data.races) {
    console.log(`  ${String(r.ronde).padStart(2)} ${r.naam.padEnd(18)} kwali ${String(r.punten.kwalificatie).padStart(4)}  stand ${String(r.punten.stand).padStart(4)}  vorige ${String(r.punten.vorige).padStart(4)}  willekeurig ${r.punten.willekeurig}`);
  }
  if (process.env.DROOG) {
    console.log('\nDROOG: niets weggeschreven');
  } else {
    const pad = join(wortel, BESTAND);
    mkdirSync(dirname(pad), { recursive: true });
    if (!existsSync(pad) || readFileSync(pad, 'utf8') !== tekst) writeFileSync(pad, tekst);
  }
}
