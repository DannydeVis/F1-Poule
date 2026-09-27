#!/usr/bin/env node
/**
 * De gegevens voor de racepagina's (zoekplan SEO fase 4).
 *
 * Voor elke race uit site/races.mjs: de sessies van dit jaar met hun tijden
 * (kwalificatie, sprint en race; dezelfde bron als de sync en kalender.ics),
 * de top 10 van kwalificatie en race van vorig jaar op hetzelfde circuit, en
 * zodra de sessies gereden zijn de top 10 van dit jaar. De safety cars en rode
 * vlaggen per editie staan al in site/data/circuits.json (scripts/circuits.mjs).
 *
 *   node scripts/racedata.mjs          ophalen en site/data/races-<jaar>.json schrijven
 *   DROOG=1 node scripts/racedata.mjs  alleen in de log, niets wegschrijven
 *
 * Draait in .github/workflows/circuits.yml, na de circuitcijfers: OpenF1 is
 * niet vanaf elke plek bereikbaar, vanaf een GitHub-runner wel. De generator
 * leest alleen het bestand, zodat `maak-site --controle` offline en
 * reproduceerbaar blijft. Ophalen in een script en bewaren in de repo, nooit
 * per bezoeker (de voorwaarden van OpenF1).
 *
 * De rekenkant (top10, raceRecord) staat los van het netwerk; die test
 * test/racedata.test.mjs, ook het ophalen tegen een nagebootste OpenF1.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RACE_JAAR, RACES } from '../site/races.mjs';
import { haal, wacht, PAUZE_MS } from './circuits.mjs';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BESTAND = join('site', 'data', `races-${RACE_JAAR}.json`);
// De sessies die op de pagina komen, in de volgorde van het weekend.
export const SESSIES = ['Sprint Qualifying', 'Sprint', 'Qualifying', 'Race'];
// Een sessie telt als gereden een paar uur na het einde, net als in
// scripts/circuits.mjs: dan staat de uitslag er.
const MARGE_MS = 3 * 3600e3;

const naamVan = (d) => (d?.first_name && d?.last_name ? `${d.first_name} ${d.last_name}` : d?.full_name ?? null);

/**
 * De top 10 van een sessie: session_result op plek, met naam en team uit
 * drivers. Wie geen plek heeft (niet geklasseerd), valt af, zoals in de sync.
 */
export function top10(uitslag = [], coureurs = []) {
  const wie = new Map(coureurs.map((d) => [String(d.driver_number), d]));
  return uitslag
    .filter((r) => Number.isInteger(r.position) && r.position >= 1)
    .sort((a, b) => a.position - b.position)
    .slice(0, 10)
    .map((r) => {
      const d = wie.get(String(r.driver_number));
      return { plek: r.position, nr: String(r.driver_number), code: d?.name_acronym ?? null, naam: naamVan(d), team: d?.team_name ?? null };
    });
}

/** De sessies van één weekend die op de pagina komen, op tijd gezet. */
export function sessiesVan(sessies = []) {
  return sessies
    .filter((s) => SESSIES.includes(s.session_name))
    .sort((a, b) => new Date(a.date_start) - new Date(b.date_start))
    .map((s) => ({ naam: s.session_name, sessie: s.session_key, start: s.date_start, eind: s.date_end }));
}

/** Eén race zoals hij in het bestand komt. */
export function raceRecord(race, meeting, sessies, vorige, uitslag) {
  return {
    circuit: race.circuit,
    slug: race.slug,
    naam: meeting.meeting_name,
    officieel: meeting.meeting_official_name ?? null,
    locatie: meeting.location,
    land: meeting.country_name,
    circuitNaam: meeting.circuit_short_name,
    start: meeting.date_start ?? null,
    eind: meeting.date_end ?? null,
    sessies: sessiesVan(sessies),
    vorige,
    uitslag,
  };
}

/** Het hele bestand, zonder datum van de run: alleen wat OpenF1 zegt. */
export function racedata(races, ontbreekt = []) {
  return {
    jaar: RACE_JAAR,
    bron: 'OpenF1 (https://openf1.org): meetings, sessions, session_result, drivers',
    races: [...races].sort((a, b) => String(a.start).localeCompare(String(b.start))),
    ontbreekt,
  };
}

async function lijst(pad) {
  const x = await haal(pad);
  await wacht(PAUZE_MS);
  // Een 429 na zes pogingen is ongeduld van ons, geen gat in OpenF1: dan liever
  // de hele run laten zakken dan een race half wegschrijven.
  if (!Array.isArray(x) && x.fout === '429') throw new Error(`te snel gevraagd: ${pad}`);
  return Array.isArray(x) ? x : null;
}

// De top 10 van één sessie, of null als OpenF1 hem (nog) niet heeft.
async function uitslagVan(sessie) {
  if (!sessie) return null;
  const uitslag = await lijst(`session_result?session_key=${sessie.session_key}`);
  if (!uitslag?.length) return null;
  const coureurs = (await lijst(`drivers?session_key=${sessie.session_key}`)) ?? [];
  const top = top10(uitslag, coureurs);
  return top.length ? top : null;
}

const gereden = (s, nu) => s && new Date(s.date_end ?? s.date_start).getTime() + MARGE_MS < nu;

async function ophalen({ nu = Date.now() } = {}) {
  const races = [];
  const ontbreekt = [];
  for (const race of RACES) {
    const sessies = await lijst(`sessions?year=${RACE_JAAR}&circuit_key=${race.circuit}`);
    const meetingKey = sessies?.find((s) => s.session_name === 'Race')?.meeting_key;
    if (!meetingKey) { ontbreekt.push({ slug: race.slug, reden: `geen race in ${RACE_JAAR} op circuit ${race.circuit}` }); continue; }
    const meeting = (await lijst(`meetings?meeting_key=${meetingKey}`))?.[0];
    if (!meeting) { ontbreekt.push({ slug: race.slug, reden: `meeting ${meetingKey} niet gevonden` }); continue; }
    const hier = sessies.filter((s) => s.meeting_key === meetingKey);

    // Vorig jaar op hetzelfde circuit. Zonder vorige editie geen pagina (het
    // plan), maar de race staat wel in het bestand, met vorige: null.
    const oud = await lijst(`sessions?year=${RACE_JAAR - 1}&circuit_key=${race.circuit}`) ?? [];
    const oudeRace = oud.find((s) => s.session_name === 'Race');
    const vorige = oudeRace ? {
      jaar: RACE_JAAR - 1,
      datum: String(oudeRace.date_start).slice(0, 10),
      kwalificatie: await uitslagVan(oud.find((s) => s.session_name === 'Qualifying' && s.meeting_key === oudeRace.meeting_key)),
      race: await uitslagVan(oudeRace),
    } : null;

    // Dit jaar, zodra gereden.
    const quali = hier.find((s) => s.session_name === 'Qualifying');
    const hoofd = hier.find((s) => s.session_name === 'Race');
    const uitslag = gereden(quali, nu) ? {
      kwalificatie: await uitslagVan(quali),
      race: gereden(hoofd, nu) ? await uitslagVan(hoofd) : null,
    } : null;

    races.push(raceRecord(race, meeting, hier, vorige, uitslag));
  }
  return racedata(races, ontbreekt);
}

function verslag(data) {
  for (const r of data.races) {
    console.log(`\n=== ${r.naam} (${r.locatie}, circuit ${r.circuit}) ===`);
    for (const s of r.sessies) console.log(`  ${String(s.naam).padEnd(18)} ${s.start}`);
    const regel = (top) => (top ? top.map((x) => `${x.plek}.${x.code}`).join(' ') : 'geen');
    console.log(`  vorig jaar (${r.vorige?.datum ?? '-'}): kwalificatie ${regel(r.vorige?.kwalificatie)}`);
    console.log(`  ${' '.repeat(20)}race ${regel(r.vorige?.race)}`);
    if (r.uitslag) console.log(`  dit jaar: kwalificatie ${regel(r.uitslag.kwalificatie)} · race ${regel(r.uitslag.race)}`);
  }
  for (const o of data.ontbreekt) console.log(`  ontbreekt: ${o.slug}: ${o.reden}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const data = await ophalen();
  if (!data.races.length) throw new Error('geen enkele race gevonden; niets weggeschreven');
  verslag(data);
  if (process.env.DROOG) {
    console.log('\nDROOG: niets weggeschreven');
  } else {
    // RACEDATA_UIT: voor de test een ander bestand dan het echte.
    const uit = process.env.RACEDATA_UIT ?? join(wortel, BESTAND);
    mkdirSync(dirname(uit), { recursive: true });
    writeFileSync(uit, `${JSON.stringify(data, null, 2)}\n`);
    console.log(`\n${uit} geschreven`);
  }
}
