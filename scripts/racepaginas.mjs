/**
 * De racepagina's (zoekplan SEO fase 4) in dezelfde vorm als de pagina's in
 * site/paginas.mjs, zodat de generator ze met hetzelfde sjabloon maakt: de kop,
 * de auteursregel, de secties met een vraag en een kort antwoord, de voet.
 *
 * Gebouwd uit site/data/races-<jaar>.json (scripts/racedata.mjs) en
 * site/data/circuits.json (scripts/circuits.mjs), met de teksten uit
 * site/races.mjs. Geen netwerk: de workflow "Circuitcijfers" haalt de
 * gegevens op en maakt daarna de site opnieuw.
 *
 * De drempel uit het plan: geen pagina zonder tijden (een race in de
 * gegevens) en zonder vorige editie (de top 10 van vorig jaar). Liever geen
 * pagina dan een lege.
 *
 * RACEPAGINAS: de racepagina's op datum, en daarna het overzicht (id 'races'),
 * als er minstens één racepagina is. test/racepaginas.test.mjs legt ze naast de
 * gegevens.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RACE_JAAR, RACES, RACE_TEKST } from '../site/races.mjs';
import { uitersten } from './circuits.mjs';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
const lees = (pad) => (existsSync(join(wortel, pad)) ? JSON.parse(readFileSync(join(wortel, pad), 'utf8')) : null);

// Alleen de namen die hier bekend zijn; wat van de app is ({exact}), laat
// staan voor de generator.
const vul = (tekst, v) => String(tekst).replace(/\{(\w+)\}/g, (heel, k) => (k in v ? String(v[k]) : heel));

export const NL_TIJD = 'Europe/Amsterdam';
/** 14:00: uur en minuut in een tijdzone. */
export const tijd = (iso, zone) => new Intl.DateTimeFormat('nl', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: zone })
  .format(new Date(iso));
/** "zondag 11 oktober" of "Sunday, October 11", in een tijdzone. */
export const dag = (iso, code, zone) => new Intl.DateTimeFormat(code, { weekday: 'long', day: 'numeric', month: 'long', timeZone: zone })
  .format(new Date(iso));
/** "za 10 okt" of "Sat, Oct 10": voor in een tabel, die op een telefoon moet passen. */
export const dagKort = (iso, code, zone) => new Intl.DateTimeFormat(code, { weekday: 'short', day: 'numeric', month: 'short', timeZone: zone })
  .format(new Date(iso));
const getal = (code, x) => new Intl.NumberFormat(code, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(x);
const coureur = (x) => x.naam ?? x.code ?? `#${x.nr}`;

// "George Russell (Mercedes) won ... voor Max Verstappen en Lando Norris."
function winnaarZin(T, top, naam, jaar) {
  const [w, t2, t3] = top.race;
  const pole = top.kwalificatie?.[0];
  const v = { winnaar: coureur(w), team: w.team ?? '', tweede: coureur(t2), derde: coureur(t3), naam, jaar };
  if (pole && pole.nr === w.nr) return vul(T.uitslag.poleWinnaar, v);
  return vul(T.uitslag.kort, { ...v, pole: pole ? vul(T.uitslag.pole, { pole: coureur(pole) }) : '' });
}

function topTabellen(T, top, jaar) {
  const rijen = (lijst) => lijst.map((x) => [String(x.plek), coureur(x), x.team ?? '']);
  return [
    { bijschrift: vul(T.uitslag.race, { jaar }), kop: T.uitslag.kop, klasse: 'compact', rijen: rijen(top.race) },
    ...(top.kwalificatie?.length ? [{ bijschrift: vul(T.uitslag.kwali, { jaar }), kop: T.uitslag.kop, klasse: 'compact', rijen: rijen(top.kwalificatie) }] : []),
  ];
}

const IDS = {
  nl: { tijden: 'tijden', uitslag: 'uitslag', vorig: 'vorig-jaar', safety: 'safety-cars' },
  en: { tijden: 'times', uitslag: 'result', vorig: 'last-year', safety: 'safety-cars' },
};

/** Eén racepagina, of null als hij onder de drempel blijft. */
export function racePagina(cfg, r, circuits) {
  const race = r?.sessies?.find((s) => s.naam === 'Race');
  if (!race || !r.vorige?.race?.length) return null;
  const kwali = r.sessies.find((s) => s.naam === 'Qualifying');
  const sprint = r.sessies.find((s) => s.naam === 'Sprint');
  const circuit = circuits?.circuits.find((c) => c.circuit === cfg.circuit);
  const talen = {};
  for (const code of ['nl', 'en']) {
    const T = RACE_TEKST[code];
    const zone = T.tijdzone;
    const naam = code === 'nl' ? cfg.nl.naam : r.naam;
    const v = {
      naam, kort: cfg[code].kort, plaats: cfg[code].plaats, baan: cfg.baan, jaar: RACE_JAAR, vorigJaar: r.vorige.jaar,
      raceDag: dag(race.start, code, zone), raceTijd: tijd(race.start, NL_TIJD), raceUtc: tijd(race.start, 'UTC'),
      kwaliDag: kwali ? dag(kwali.start, code, zone) : '', kwaliTijd: kwali ? tijd(kwali.start, NL_TIJD) : '', kwaliUtc: kwali ? tijd(kwali.start, 'UTC') : '',
      sprintDag: sprint ? dag(sprint.start, code, zone) : '', sprintTijd: sprint ? tijd(sprint.start, NL_TIJD) : '', sprintUtc: sprint ? tijd(sprint.start, 'UTC') : '',
    };
    const ids = IDS[code];
    const secties = [{
      id: ids.tijden,
      vraag: vul(T.tijden.vraag, v),
      kort: vul(T.tijden.kort, { ...v, sprint: sprint ? vul(T.tijden.sprint, v) : '' }),
      tabel: { bijschrift: vul(T.tijden.bijschrift, v), kop: T.tijden.kop, klasse: 'compact',
        rijen: r.sessies.map((s) => [T.sessies[s.naam] ?? s.naam, dagKort(s.start, code, zone), tijd(s.start, 'UTC'),
          ...(code === 'nl' ? [tijd(s.start, NL_TIJD)] : [])]) },
      tekst: [T.tijden.tekst],
    }];
    if (r.uitslag?.race?.length >= 3) {
      secties.push({ id: ids.uitslag, vraag: vul(T.uitslag.vraag, { naam, jaar: RACE_JAAR }),
        kort: winnaarZin(T, r.uitslag, naam, RACE_JAAR), tabellen: topTabellen(T, r.uitslag, RACE_JAAR) });
    }
    if (r.vorige.race.length >= 3) {
      secties.push({ id: ids.vorig, vraag: vul(T.uitslag.vraagVorig, { naam, jaar: r.vorige.jaar }),
        kort: winnaarZin(T, r.vorige, naam, r.vorige.jaar), tabellen: topTabellen(T, r.vorige, r.vorige.jaar) });
    }
    if (circuit) {
      const s = T.safety;
      secties.push({
        id: ids.safety,
        vraag: vul(s.vraag, v),
        kort: vul(s.kort, { plaats: v.plaats, races: circuit.races, vanaf: circuits.vanaf, aantal: circuit.safetyCars,
          gemiddeld: getal(code, circuit.safetyCars / circuit.races), gemiddeldAlles: getal(code, uitersten(circuits).gemiddeld),
          rodeVlag: circuit.metRodeVlag ? vul(s.rodeVlag, { rodeVlag: circuit.metRodeVlag }) : s.geenRodeVlag }),
        tabel: { bijschrift: vul(s.bijschrift, v), kop: s.kop, klasse: 'compact',
          rijen: circuit.perRace.map((x) => [String(x.jaar), String(x.safetyCars), x.rodeVlag ? T.ja : T.nee]) },
        links: [{ tekst: s.link, pagina: 'puntentelling', anker: 'safety-cars' }],
      });
    }
    talen[code] = {
      pad: `${T.pad}/${RACE_JAAR}/${cfg.slug}`,
      titel: vul(T.titel, v),
      omschrijving: vul(T.omschrijving, v),
      kop: vul(T.kop, v),
      kort: vul(T.kort, v),
      secties,
      faq: [],
      leesOok: T.leesOok,
      slot: { kop: vul(T.slot.kop, v), tekst: T.slot.tekst, knop: vul(T.slot.knop, v) },
    };
  }
  return {
    id: `race-${cfg.slug}`,
    soort: 'race',
    kruimel: 'races',
    verwant: ['races', 'puntentelling'],
    // Voor de SportsEvent in de JSON-LD: het hele weekend, van de eerste
    // sessie (de meeting van OpenF1) tot het einde van de race.
    evenement: { start: r.start ?? r.sessies[0].start, eind: race.eind ?? race.start, baan: cfg.baan,
      plaats: cfg.en.plaats, land: r.land },
    talen,
  };
}

/** Het overzicht per seizoen: /races/ en /en/races/. */
export function overzicht(paginas, races) {
  if (!paginas.length) return null;
  const start = (pg) => races.find((r) => `race-${r.slug}` === pg.id).sessies.find((s) => s.naam === 'Race').start;
  const talen = {};
  for (const code of ['nl', 'en']) {
    const T = RACE_TEKST[code];
    const O = T.overzicht;
    const naam = (pg) => pg.talen[code].kop.replace(` ${RACE_JAAR}`, '');
    const [eerste, laatste] = [paginas[0], paginas.at(-1)];
    const v = { jaar: RACE_JAAR, aantal: paginas.length, eerste: naam(eerste), laatste: naam(laatste),
      eersteDag: dag(start(eerste), code, T.tijdzone), laatsteDag: dag(start(laatste), code, T.tijdzone) };
    talen[code] = {
      pad: T.pad,
      titel: vul(O.titel, v),
      omschrijving: vul(O.omschrijving, v),
      kop: vul(O.kop, v),
      kort: vul(O.kort, v),
      secties: [{
        id: code === 'nl' ? 'races' : 'races',
        vraag: vul(O.vraag, v),
        kort: vul(O.lijstKort, v),
        tabel: { bijschrift: vul(O.bijschrift, v), kop: O.kop2, klasse: 'compact',
          rijen: paginas.map((pg) => [naam(pg), dagKort(start(pg), code, T.tijdzone), pg.evenement.baan]) },
        links: paginas.map((pg) => ({ tekst: pg.talen[code].kop, pagina: pg.id })),
      }],
      faq: [],
      leesOok: T.leesOok,
      voet: vul(O.voet, v),
    };
  }
  return { id: 'races', soort: 'races', verwant: ['puntentelling'], lijst: paginas.map((pg) => pg.id), talen };
}

/** Alles uit de twee bestanden: de racepagina's op datum, dan het overzicht. */
export function bouwRacepaginas(data, circuits) {
  if (!data) return [];
  const paginas = RACES.map((cfg) => racePagina(cfg, data.races.find((r) => r.slug === cfg.slug && r.circuit === cfg.circuit), circuits))
    .filter(Boolean)
    .sort((a, b) => String(a.evenement.start).localeCompare(String(b.evenement.start)));
  const o = overzicht(paginas, data.races);
  return o ? [...paginas, o] : paginas;
}

export const RACEDATA = lees(join('site', 'data', `races-${RACE_JAAR}.json`));
export const CIRCUITDATA = lees(join('site', 'data', 'circuits.json'));
export const RACEPAGINAS = bouwRacepaginas(RACEDATA, CIRCUITDATA);
