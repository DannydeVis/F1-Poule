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
import { TALEN } from '../site/teksten.mjs';
import { PAGINAS } from '../site/paginas.mjs';
import { uitersten } from './circuits.mjs';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
const lees = (pad) => (existsSync(join(wortel, pad)) ? JSON.parse(readFileSync(join(wortel, pad), 'utf8')) : null);

// Alleen de namen die hier bekend zijn; wat van de app is ({exact}), laat
// staan voor de generator.
const vul = (tekst, v) => String(tekst).replace(/\{(\w+)\}/g, (heel, k) => (k in v ? String(v[k]) : heel));

// De talen van de racepagina's: elke taal met teksten in site/races.mjs, in de
// volgorde van de voorpagina.
export const RACE_TALEN = TALEN.filter((c) => RACE_TEKST[c]);
// De tijd van het land naast UTC: de tijdzone van de taal, behalve als dat UTC
// zelf is (Engels).
export const lokaleZone = (code) => (RACE_TEKST[code].tijdzone === 'UTC' ? null : RACE_TEKST[code].tijdzone);
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
// "Max Verstappen (Red Bull Racing)", of alleen de naam als het team onbekend is.
const metTeam = (x) => (x.team ? `${coureur(x)} (${x.team})` : coureur(x));

// "George Russell (Mercedes) won ... voor Max Verstappen en Lando Norris."
function winnaarZin(T, top, namen, jaar) {
  const [w, t2, t3] = top.race;
  const pole = top.kwalificatie?.[0];
  const v = { ...namen, winnaar: coureur(w), team: w.team ?? '', tweede: coureur(t2), derde: coureur(t3), jaar };
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

// De ankers per taal. safety-cars en pole zijn overal hetzelfde: zo heten ze
// ook in de gids over de puntentelling.
export const RACE_IDS = {
  nl: { tijden: 'tijden', training: 'vrije-trainingen', uitslag: 'uitslag', vorig: 'vorig-jaar', safety: 'safety-cars', pole: 'pole' },
  en: { tijden: 'times', training: 'practice', uitslag: 'result', vorig: 'last-year', safety: 'safety-cars', pole: 'pole' },
  de: { tijden: 'zeiten', training: 'freies-training', uitslag: 'ergebnis', vorig: 'vorjahr', safety: 'safety-cars', pole: 'pole' },
  fr: { tijden: 'horaires', training: 'essais-libres', uitslag: 'resultat', vorig: 'annee-derniere', safety: 'safety-cars', pole: 'pole' },
  es: { tijden: 'horarios', training: 'libres', uitslag: 'resultado', vorig: 'ano-pasado', safety: 'safety-cars', pole: 'pole' },
  it: { tijden: 'orari', training: 'prove-libere', uitslag: 'risultato', vorig: 'anno-scorso', safety: 'safety-cars', pole: 'pole' },
  pt: { tijden: 'horarios', training: 'treinos-livres', uitslag: 'resultado', vorig: 'ano-passado', safety: 'safety-cars', pole: 'pole' },
};
// De link naar de tabel van alle circuits alleen in een taal waarin de gids
// over de puntentelling er is.
const puntentellingIn = (code) => !!PAGINAS.find((pg) => pg.id === 'puntentelling')?.talen[code];

// Races waarvan pole en winnaar allebei bekend zijn (poleWon ja of nee). Een
// ouder circuits.json zonder die velden geeft een lege lijst: dan geen sectie.
const metPole = (perRace = []) => perRace.filter((x) => typeof x.poleWon === 'boolean');

/** Eén racepagina, of null als hij onder de drempel blijft. */
export function racePagina(cfg, r, circuits) {
  const race = r?.sessies?.find((s) => s.naam === 'Race');
  if (!race || !r.vorige?.race?.length) return null;
  const kwali = r.sessies.find((s) => s.naam === 'Qualifying');
  const sprint = r.sessies.find((s) => s.naam === 'Sprint');
  const circuit = circuits?.circuits.find((c) => c.circuit === cfg.circuit);
  const talen = {};
  for (const code of RACE_TALEN) {
    const T = RACE_TEKST[code];
    const zone = T.tijdzone;
    const lokaal = lokaleZone(code);
    const naam = cfg[code].naam ?? r.naam;
    const v = {
      naam, kort: cfg[code].kort, plaats: cfg[code].plaats, in: cfg[code].in ?? cfg[code].plaats, baan: cfg.baan, jaar: RACE_JAAR, vorigJaar: r.vorige.jaar,
      raceDag: dag(race.start, code, zone), raceTijd: tijd(race.start, zone), raceUtc: tijd(race.start, 'UTC'),
      kwaliDag: kwali ? dag(kwali.start, code, zone) : '', kwaliTijd: kwali ? tijd(kwali.start, zone) : '', kwaliUtc: kwali ? tijd(kwali.start, 'UTC') : '',
      sprintDag: sprint ? dag(sprint.start, code, zone) : '', sprintTijd: sprint ? tijd(sprint.start, zone) : '', sprintUtc: sprint ? tijd(sprint.start, 'UTC') : '',
    };
    const ids = RACE_IDS[code];
    const secties = [{
      id: ids.tijden,
      vraag: vul(T.tijden.vraag, v),
      kort: vul(T.tijden.kort, { ...v, sprint: sprint ? vul(T.tijden.sprint, v) : '' }),
      tabel: { bijschrift: vul(T.tijden.bijschrift, v), kop: T.tijden.kop, klasse: 'compact',
        rijen: r.sessies.map((s) => [T.sessies[s.naam] ?? s.naam, dagKort(s.start, code, zone), tijd(s.start, 'UTC'),
          ...(lokaal ? [tijd(s.start, lokaal)] : [])]) },
      tekst: [T.tijden.tekst],
    }];
    // De vrije trainingen alleen tijdens het weekend: zodra er een is, tot de
    // uitslag van de race er staat.
    const trainingen = (r.vrijeTrainingen ?? []).filter((x) => x.top?.length);
    if (trainingen.length && !(r.uitslag?.race?.length >= 3)) {
      const t = T.training;
      secties.push({
        id: ids.training,
        vraag: vul(t.vraag, v),
        kort: [...trainingen.map((x) => vul(t.snelst, { welke: t.welke[x.naam] ?? x.naam, wie: metTeam(x.top[0]) })), t.slot].join(' '),
        tabellen: trainingen.map((x) => ({ bijschrift: vul(t.bijschrift, { sessie: T.sessies[x.naam] ?? x.naam }), kop: T.uitslag.kop,
          klasse: 'compact', rijen: x.top.map((y) => [String(y.plek), coureur(y), y.team ?? '']) })),
      });
    }
    if (r.uitslag?.race?.length >= 3) {
      secties.push({ id: ids.uitslag, vraag: vul(T.uitslag.vraag, { ...v, jaar: RACE_JAAR }),
        kort: winnaarZin(T, r.uitslag, v, RACE_JAAR), tabellen: topTabellen(T, r.uitslag, RACE_JAAR) });
    }
    if (r.vorige.race.length >= 3) {
      secties.push({ id: ids.vorig, vraag: vul(T.uitslag.vraagVorig, { ...v, jaar: r.vorige.jaar }),
        kort: winnaarZin(T, r.vorige, v, r.vorige.jaar), tabellen: topTabellen(T, r.vorige, r.vorige.jaar) });
    }
    if (circuit) {
      const s = T.safety;
      secties.push({
        id: ids.safety,
        vraag: vul(s.vraag, v),
        kort: vul(s.kort, { plaats: v.plaats, in: v.in, races: circuit.races, vanaf: circuits.vanaf, aantal: circuit.safetyCars,
          gemiddeld: getal(code, circuit.safetyCars / circuit.races), gemiddeldAlles: getal(code, uitersten(circuits).gemiddeld),
          rodeVlag: circuit.metRodeVlag ? vul(s.rodeVlag, { rodeVlag: circuit.metRodeVlag }) : s.geenRodeVlag }),
        tabel: { bijschrift: vul(s.bijschrift, v), kop: s.kop, klasse: 'compact',
          rijen: circuit.perRace.map((x) => [String(x.jaar), String(x.safetyCars), x.rodeVlag ? T.ja : T.nee]) },
        ...(puntentellingIn(code) ? { links: [{ tekst: s.link, pagina: 'puntentelling', anker: 'safety-cars' }] } : {}),
      });
      // Hoe vaak de polesitter hier won, tegen alle circuits samen.
      const hier = metPole(circuit.perRace);
      if (hier.length) {
        const alles = circuits.circuits.flatMap((c) => metPole(c.perRace));
        const p = T.pole;
        secties.push({
          id: ids.pole,
          vraag: vul(p.vraag, v),
          kort: vul(p.kort, { plaats: v.plaats, in: v.in, gewonnen: hier.filter((x) => x.poleWon).length, races: hier.length, vanaf: circuits.vanaf,
            gewonnenAlles: alles.filter((x) => x.poleWon).length, racesAlles: alles.length }),
          tabel: { bijschrift: vul(p.bijschrift, v), kop: p.kop, klasse: 'compact',
            rijen: hier.map((x) => [String(x.jaar), coureur(x.pole), coureur(x.winnaar)]) },
        });
      }
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

/** Het overzicht per seizoen: /races/, /en/races/, /de/rennen/ enzovoort. */
export function overzicht(paginas, races) {
  if (!paginas.length) return null;
  const start = (pg) => races.find((r) => `race-${r.slug}` === pg.id).sessies.find((s) => s.naam === 'Race').start;
  const talen = {};
  for (const code of RACE_TALEN) {
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
        id: 'races',
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
