#!/usr/bin/env node
/**
 * Safety cars en rode vlaggen per circuit, sinds 2023 (zoekplan GEO 3.2).
 *
 * Een assistent citeert graag een getal met een jaartal en een bron. "Op dit
 * circuit kwam de safety car er in X van de Y races uit" staat nergens zo, en
 * wij hebben alles al: OpenF1, en de twee functies waarmee de app de vragen
 * "Aantal safety cars" en "Rode vlag" scoort. Precies die, zodat de cijfers
 * op de site dezelfde regels volgen als de punten in de app: een virtuele
 * safety car telt mee.
 *
 * Per race ook wie er op pole stond en wie won (session_result van de
 * kwalificatie en de race, de namen uit drivers), voor "hoe vaak wint de
 * polesitter hier" op de racepagina's. Heeft OpenF1 een van de twee niet, dan
 * telt die race daar niet mee.
 *
 *   node scripts/circuits.mjs          alles ophalen en site/data/circuits.json schrijven
 *   DROOG=1 node scripts/circuits.mjs  alleen de tabel in de log, niets wegschrijven
 *
 * api.openf1.org is niet vanaf elke plek bereikbaar, vanaf een GitHub-runner
 * wel. Daarom draait dit in .github/workflows/circuits.yml. De rekenkant
 * (raceCijfers, perCircuit, cijfers) staat los van het netwerk; die test
 * test/circuits.test.mjs met een klein vast voorbeeld.
 *
 * Het bestand heeft geen datum van de run, alleen die van de laatste race
 * die erin zit. Zo verandert het alleen als er echt een race bij komt, en legt
 * de workflow niet elke week een lege wijziging vast.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { telSafetyCars, hadRodeVlag } from './uitslagen.mjs';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BESTAND = join('site', 'data', 'circuits.json');
export const VANAF = 2023;
// Voor de test een nagebootste OpenF1 op localhost (test/circuits.test.mjs).
const API = process.env.OPENF1_URL ?? 'https://api.openf1.org/v1';
// OpenF1 laat drie verzoeken per seconde toe; wij blijven er ruim onder.
export const WACHT_MS = 1000;
// Tegen de nagebootste OpenF1 van de tests hoeft niemand te wachten.
export const PAUZE_MS = process.env.OPENF1_URL ? 0 : WACHT_MS;

export const wacht = (ms) => new Promise((r) => setTimeout(r, ms));

// Zoals haal() in scripts/verkennen.mjs: bij een 429 even wachten en opnieuw,
// anders de fout teruggeven in plaats van een lege lijst. Een 404 en een 429
// zijn twee heel verschillende verhalen. scripts/racedata.mjs gebruikt hem ook.
export async function haal(pad, pogingen = 6) {
  for (let i = 0; i < pogingen; i++) {
    const res = await fetch(`${API}/${pad}`);
    if (res.ok) return res.json();
    if (res.status === 429 && i < pogingen - 1) { await wacht(3000 * (i + 1)); continue; }
    return { fout: `${res.status}` };
  }
}

/** Een naam zoals je hem schrijft: voornaam en achternaam, niet de hoofdletters van full_name. */
export const naamVan = (d) => (d?.first_name && d?.last_name ? `${d.first_name} ${d.last_name}` : d?.full_name ?? null);

/**
 * Eén race: waar, wanneer, wat telSafetyCars en hadRodeVlag ervan zeggen, en
 * wie er op pole stond en wie won ({ nr, naam }, of null als OpenF1 het niet
 * heeft). Pole is de winnaar van de kwalificatie, zoals de app de vraag "Pole
 * position" scoort. poleWon is null als een van de twee ontbreekt.
 */
export function raceCijfers(sessie, berichten, { pole = null, winnaar = null } = {}) {
  return {
    circuit: sessie.circuit_key,
    naam: sessie.circuit_short_name,
    locatie: sessie.location,
    land: sessie.country_name,
    jaar: sessie.year,
    datum: String(sessie.date_start).slice(0, 10),
    sessie: sessie.session_key,
    safetyCars: telSafetyCars(berichten),
    rodeVlag: hadRodeVlag(berichten),
    pole,
    winnaar,
    poleWon: pole && winnaar ? pole.nr === winnaar.nr : null,
  };
}

/**
 * Per circuit (circuit_key van OpenF1: een baan die een andere naam krijgt,
 * blijft dezelfde), met de races op datum. Naam, plaats en land komen van de
 * laatste race daar, want zo heet hij nu.
 */
export function perCircuit(races) {
  const groepen = new Map();
  for (const r of [...races].sort((a, b) => a.datum.localeCompare(b.datum) || a.sessie - b.sessie)) {
    if (!groepen.has(r.circuit)) groepen.set(r.circuit, []);
    groepen.get(r.circuit).push(r);
  }
  return [...groepen.values()].map((rs) => {
    const laatste = rs.at(-1);
    return {
      circuit: laatste.circuit,
      naam: laatste.naam,
      locatie: laatste.locatie,
      land: laatste.land,
      races: rs.length,
      metSafetyCar: rs.filter((r) => r.safetyCars > 0).length,
      safetyCars: rs.reduce((n, r) => n + r.safetyCars, 0),
      metRodeVlag: rs.filter((r) => r.rodeVlag).length,
      // Alleen races waarvan pole en winnaar allebei bekend zijn.
      metPole: rs.filter((r) => r.poleWon !== null && r.poleWon !== undefined).length,
      poleGewonnen: rs.filter((r) => r.poleWon === true).length,
      perRace: rs.map(({ jaar, datum, sessie, safetyCars, rodeVlag, pole, winnaar, poleWon }) => ({
        jaar, datum, sessie, safetyCars, rodeVlag, pole: pole ?? null, winnaar: winnaar ?? null, poleWon: poleWon ?? null })),
    };
  }).sort((a, b) => a.locatie.localeCompare(b.locatie, 'en') || a.circuit - b.circuit);
}

/** Het hele bestand: de circuits, en welke races ontbreken en waarom. */
export function cijfers(races, ontbreekt = []) {
  const datums = races.map((r) => r.datum).sort();
  return {
    bron: 'OpenF1 (https://openf1.org): race_control, en session_result en drivers voor pole en winnaar',
    regel: 'Een virtuele safety car telt mee, net als in de app (telSafetyCars en hadRodeVlag in scripts/uitslagen.mjs).',
    vanaf: VANAF,
    tot: datums.at(-1) ?? null,
    races: races.length,
    metSafetyCar: races.filter((r) => r.safetyCars > 0).length,
    metRodeVlag: races.filter((r) => r.rodeVlag).length,
    metPole: races.filter((r) => r.poleWon !== null && r.poleWon !== undefined).length,
    poleGewonnen: races.filter((r) => r.poleWon === true).length,
    ontbreekt: [...ontbreekt].sort((a, b) => a.datum.localeCompare(b.datum)),
    circuits: perCircuit(races),
  };
}

// Het vaakst en het minst: alleen circuits met genoeg races, anders wint een
// baan met één race.
export const MIN_RACES = 3;

/**
 * Voor de tekst op de site: het gemiddelde aantal safety cars per race over
 * alles, en het circuit met de meeste en de minste per race. Bij gelijke
 * stand het circuit met de meeste races, dan op naam.
 */
export function uitersten(data, minRaces = MIN_RACES) {
  const totaal = data.circuits.reduce((n, c) => n + c.safetyCars, 0);
  const perRace = (c) => c.safetyCars / c.races;
  const genoeg = data.circuits.filter((c) => c.races >= minRaces);
  const volgorde = (richting) => [...genoeg].sort((a, b) => richting * (perRace(a) - perRace(b))
    || b.races - a.races || a.locatie.localeCompare(b.locatie, 'en'))[0] ?? null;
  return { gemiddeld: data.races ? totaal / data.races : 0, meest: volgorde(-1), minst: volgorde(1) };
}

// Een lijst van OpenF1, of null als die er niet is. Een 429 na zes pogingen
// laat de run zakken, net als bij race_control.
async function lijst(pad) {
  const x = await haal(pad);
  await wacht(PAUZE_MS);
  if (!Array.isArray(x) && x.fout === '429') throw new Error(`te snel gevraagd: ${pad}`);
  return Array.isArray(x) ? x : null;
}

// Wie er eerste werd in een sessie: het coureurnummer, of null.
async function eerste(sessie) {
  if (!sessie) return null;
  const rij = (await lijst(`session_result?session_key=${sessie.session_key}`))?.find((x) => x.position === 1);
  return rij ? String(rij.driver_number) : null;
}

// Pole en winnaar van één race, met de namen uit drivers van die race. Wat
// OpenF1 niet heeft, blijft null: die race telt dan niet mee.
async function podium(race, quali) {
  const [pole, winnaar] = [await eerste(quali), await eerste(race)];
  if (!pole && !winnaar) return {};
  const wie = new Map(((await lijst(`drivers?session_key=${race.session_key}`)) ?? []).map((d) => [String(d.driver_number), d]));
  const persoon = (nr) => (nr ? { nr, naam: naamVan(wie.get(nr)) } : null);
  return { pole: persoon(pole), winnaar: persoon(winnaar) };
}

async function ophalen({ nu = Date.now() } = {}) {
  const races = [];
  const ontbreekt = [];
  for (let jaar = VANAF; jaar <= new Date(nu).getUTCFullYear(); jaar++) {
    const sessies = await haal(`sessions?year=${jaar}&session_name=Race`);
    await wacht(PAUZE_MS);
    if (!Array.isArray(sessies)) throw new Error(`sessions voor ${jaar} gaf ${sessies.fout}`);
    // De kwalificaties van dat jaar, per meeting: daar komt de pole vandaan.
    const qualis = await haal(`sessions?year=${jaar}&session_name=Qualifying`);
    await wacht(PAUZE_MS);
    const qualiVan = new Map((Array.isArray(qualis) ? qualis : []).map((q) => [q.meeting_key, q]));
    // Alleen races die voorbij zijn, met een paar uur marge voor de
    // berichten van na de finish.
    const gereden = sessies
      .filter((s) => new Date(s.date_end ?? s.date_start).getTime() + 3 * 3600e3 < nu)
      .sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
    for (const s of gereden) {
      const berichten = await haal(`race_control?session_key=${s.session_key}`);
      await wacht(PAUZE_MS);
      const waar = { jaar, locatie: s.location, datum: String(s.date_start).slice(0, 10), sessie: s.session_key };
      // Een 429 na zes pogingen is geen gat in OpenF1 maar ongeduld van ons:
      // dan liever de hele run laten zakken dan een race stil weglaten.
      if (!Array.isArray(berichten) && berichten.fout === '429') throw new Error(`te snel gevraagd bij ${s.location} ${jaar}`);
      if (!Array.isArray(berichten) || !berichten.length) {
        ontbreekt.push({ ...waar, reden: Array.isArray(berichten) ? 'geen berichten' : `OpenF1 gaf ${berichten.fout}` });
        continue;
      }
      races.push(raceCijfers(s, berichten, await podium(s, qualiVan.get(s.meeting_key))));
    }
  }
  return { races, ontbreekt };
}

function tabel(data, races) {
  console.log(`\n=== per race (${races.length}) ===`);
  for (const r of [...races].sort((a, b) => a.datum.localeCompare(b.datum))) {
    console.log(`  ${r.datum}  ${String(r.locatie).padEnd(18)} SC ${String(r.safetyCars).padEnd(3)} rode vlag ${r.rodeVlag ? 'ja ' : 'nee'}`
      + `  pole ${r.pole?.naam ?? '-'}, winnaar ${r.winnaar?.naam ?? '-'}  (${r.sessie})`);
  }
  console.log(`\n=== per circuit (${data.circuits.length}) ===`);
  for (const c of data.circuits) {
    console.log(`  ${String(c.locatie).padEnd(18)} ${String(c.races).padStart(2)} races, SC in ${c.metSafetyCar}, `
      + `${c.safetyCars} SC totaal, rode vlag in ${c.metRodeVlag}, pole won ${c.poleGewonnen} van ${c.metPole}`);
  }
  console.log(`\n  ${data.races} races van ${data.vanaf} tot ${data.tot}: SC in ${data.metSafetyCar}, rode vlag in ${data.metRodeVlag}, pole won ${data.poleGewonnen} van ${data.metPole}`);
  for (const o of data.ontbreekt) console.log(`  ontbreekt: ${o.datum} ${o.locatie} (${o.sessie}): ${o.reden}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { races, ontbreekt } = await ophalen();
  if (!races.length) throw new Error('geen enkele race gevonden; niets weggeschreven');
  const data = cijfers(races, ontbreekt);
  tabel(data, races);
  if (process.env.DROOG) {
    console.log('\nDROOG: niets weggeschreven');
  } else {
    mkdirSync(join(wortel, dirname(BESTAND)), { recursive: true });
    writeFileSync(join(wortel, BESTAND), `${JSON.stringify(data, null, 2)}\n`);
    console.log(`\n${BESTAND} geschreven`);
  }
}
