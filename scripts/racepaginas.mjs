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

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RACE_JAAR, RACES, RACE_TEKST, KAMPIOEN_TEKST } from '../site/races.mjs';
import { TALEN } from '../site/teksten.mjs';
import { PAGINAS } from '../site/paginas.mjs';
import { uitersten } from './circuits.mjs';
import { DREMPEL } from './spelerscijfers.mjs';

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
  nl: { tijden: 'tijden', training: 'vrije-trainingen', uitslag: 'uitslag', vorig: 'vorig-jaar', safety: 'safety-cars', pole: 'pole', spelers: 'spelers' },
  en: { tijden: 'times', training: 'practice', uitslag: 'result', vorig: 'last-year', safety: 'safety-cars', pole: 'pole', spelers: 'players' },
  de: { tijden: 'zeiten', training: 'freies-training', uitslag: 'ergebnis', vorig: 'vorjahr', safety: 'safety-cars', pole: 'pole', spelers: 'spieler' },
  fr: { tijden: 'horaires', training: 'essais-libres', uitslag: 'resultat', vorig: 'annee-derniere', safety: 'safety-cars', pole: 'pole', spelers: 'joueurs' },
  es: { tijden: 'horarios', training: 'libres', uitslag: 'resultado', vorig: 'ano-pasado', safety: 'safety-cars', pole: 'pole', spelers: 'jugadores' },
  it: { tijden: 'orari', training: 'prove-libere', uitslag: 'risultato', vorig: 'anno-scorso', safety: 'safety-cars', pole: 'pole', spelers: 'giocatori' },
  pt: { tijden: 'horarios', training: 'treinos-livres', uitslag: 'resultado', vorig: 'ano-passado', safety: 'safety-cars', pole: 'pole', spelers: 'jogadores' },
};
// De link naar de tabel van alle circuits alleen in een taal waarin de gids
// over de puntentelling er is.
const puntentellingIn = (code) => !!PAGINAS.find((pg) => pg.id === 'puntentelling')?.talen[code];

// Races waarvan pole en winnaar allebei bekend zijn (poleWon ja of nee). Een
// ouder circuits.json zonder die velden geeft een lege lijst: dan geen sectie.
const metPole = (perRace = []) => perRace.filter((x) => typeof x.poleWon === 'boolean');

// ---- hoe de spelers het voorspelden (1 november) ---------------------------------
// Uit site/data/spelers-<jaar>.json (de sync schrijft dat, zie
// scripts/spelerscijfers.mjs): alle spelers samen, alleen na de deadline en
// alleen vanaf 50 spelers uit vijf poules. Een racepagina krijgt het blok pas
// na het weekend: als de uitslag van de race er is.
const procent = (code, x) => new Intl.NumberFormat(code, { style: 'percent', maximumFractionDigits: 0 }).format(x);
const SESSIENAAM = { sprint: 'Sprint', quali: 'Qualifying', race: 'Race' };
const wie = (x) => x?.naam ?? x?.code ?? `#${x?.nr}`;
// De verdeling in vijf banden: 0 tot 9, 10 tot 19 ... 40 tot 50 (op een
// sprint de helft).
export function banden(verdeling = {}, max = 50) {
  const breed = max / 5;
  return [0, 1, 2, 3, 4].map((i) => {
    const van = i * breed, tot = i === 4 ? max : (i + 1) * breed - 1;
    const aantal = Object.entries(verdeling).filter(([p]) => Number(p) >= van && Number(p) <= tot)
      .reduce((a, [, n]) => a + n, 0);
    return { van, tot, aantal };
  });
}
// De race in het bestand van de sync, op de racesessie van OpenF1.
export const spelersVan = (spelers, raceSessie) =>
  (spelers?.races ?? []).find((x) => raceSessie && String(x.race_key) === String(raceSessie)) ?? null;

function spelersSectie(code, T, v, sp) {
  const S = T.spelers;
  const volgorde = ['race', 'quali', 'sprint'].filter((w) => sp.sessies?.[w]);
  if (!volgorde.length) return null;
  const hoofd = volgorde[0];
  const c = sp.sessies[hoofd];
  const deel = (n) => procent(code, n / c.spelers);
  const x = c.verrassing;
  const verrassing = !x ? '' : x.plek
    ? vul(S.verrassing, { wie: wie(x), verwacht: getal(code, x.verwacht), plek: x.plek })
    : vul(S.verrassingBuiten, { wie: wie(x), erin: deel(x.erin) });
  return {
    id: RACE_IDS[code].spelers,
    vraag: vul(S.vraag, v),
    kort: vul(S.kort, { spelers: c.spelers, poules: c.poules, sessie: S.sessies[hoofd], gemiddeld: getal(code, c.gemiddeld),
      max: c.max, p1: deel(c.p1.goed), eerste: S.eerste[hoofd], vaakst: wie(c.vaakst), vaakstAandeel: deel(c.vaakst.goed),
      vaakstPlek: c.vaakst.plek, verrassing }).trim(),
    tabellen: [
      // Drie kolommen: met het aantal spelers erbij was hij op een telefoon van
      // 360 pixels in het Frans, Spaans en Italiaans te breed. Het aantal staat
      // in het korte antwoord.
      { bijschrift: vul(S.bijschrift, v), kop: S.kop, klasse: 'compact',
        rijen: volgorde.map((w) => { const y = sp.sessies[w]; return [T.sessies[SESSIENAAM[w]] ?? w,
          vul(S.gemiddeld, { gemiddeld: getal(code, y.gemiddeld), max: y.max }), procent(code, y.p1.goed / y.spelers)]; }) },
      { bijschrift: vul(S.verdeling, { sessie: S.sessies[hoofd] }), kop: S.kopVerdeling, klasse: 'compact',
        rijen: banden(c.verdeling, c.max).map((b) => [vul(S.band, b), String(b.aantal), procent(code, b.aantal / c.spelers)]) },
    ],
    tekst: [vul(S.minst, { minst: wie(c.minst), minstAandeel: deel(c.minst.goed), minstPlek: c.minst.plek }), S.uitleg],
    // Voor de JSON-LD (een Dataset) en llms.txt.
    cijfers: { sessie: hoofd, spelers: c.spelers, poules: c.poules, gemiddeld: c.gemiddeld, max: c.max,
      p1: c.p1.goed / c.spelers, vaakst: wie(c.vaakst), vaakstPlek: c.vaakst.plek, vaakstAandeel: c.vaakst.goed / c.spelers,
      minst: wie(c.minst), minstPlek: c.minst.plek, verrassing: x ? wie(x) : null },
  };
}

/** Eén racepagina, of null als hij onder de drempel blijft. */
export function racePagina(cfg, r, circuits, spelers = null) {
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
      // Na het weekend: hoe de spelers het voorspelden.
      const sp = spelersVan(spelers, race.sessie);
      const blok = sp && spelersSectie(code, T, v, sp);
      if (blok) secties.push(blok);
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

/** Alles uit de bestanden: de racepagina's op datum, dan het overzicht. */
export function bouwRacepaginas(data, circuits, spelers = null) {
  if (!data) return [];
  const paginas = RACES.map((cfg) => racePagina(cfg, data.races.find((r) => r.slug === cfg.slug && r.circuit === cfg.circuit), circuits, spelers))
    .filter(Boolean)
    .sort((a, b) => String(a.evenement.start).localeCompare(String(b.evenement.start)));
  const o = overzicht(paginas, data.races);
  return o ? [...paginas, o] : paginas;
}

// ---- wie wordt wereldkampioen (1 november) -----------------------------------------
// Eén pagina per seizoen met cijfers over de seizoensvragen: van december tot
// de eerste race werkt de sync hem bij, daarna blijft hij staan zoals de
// spelers het voor het seizoen voorspelden. Zonder kampioen boven de drempel
// geen pagina.
const datumLang = (iso, code) => new Intl.DateTimeFormat(code, { day: 'numeric', month: 'long', year: 'numeric',
  timeZone: RACE_TEKST[code]?.tijdzone ?? 'UTC' }).format(new Date(iso));
const opsom = (code, delen) => new Intl.ListFormat(code, { type: 'conjunction' }).format(delen);

export function kampioenPagina(data, metOverzicht = true) {
  const s = data?.seizoen;
  const k = s?.kampioen;
  if (!k?.lijst?.length || !s.tot) return null;
  const jaar = data.jaar;
  const t = s.constructeur;
  const talen = {};
  for (const code of TALEN.filter((c) => KAMPIOEN_TEKST[c])) {
    const K = KAMPIOEN_TEKST[code];
    const pk = (n) => procent(code, n / k.spelers);
    const pt = (n) => procent(code, n / t.spelers);
    const [eerste, ...rest] = k.lijst;
    const tot = datumLang(s.tot, code);
    const v = { jaar, tot, spelers: k.spelers, poules: k.poules, naam: wie(eerste), teamVan: eerste.team ?? '',
      aandeel: pk(eerste.aantal), drempel: DREMPEL.spelers, drempelPoules: DREMPEL.poules };
    const volgersK = rest.slice(0, 3).map((x) => `${wie(x)} (${pk(x.aantal)})`);
    const ids = K.ids;
    const secties = [{
      id: ids.coureur,
      vraag: vul(K.coureur.vraag, v),
      kort: vul(K.coureur.kort, { ...v, volgers: volgersK.length ? vul(K.volgers, { lijst: opsom(code, volgersK) }) : '' }),
      tabel: { bijschrift: vul(K.coureur.bijschrift, v), kop: K.coureur.kop, klasse: 'compact',
        rijen: k.lijst.map((x) => [wie(x), x.team ?? '', pk(x.aantal)]) },
    }];
    if (t?.lijst?.length) {
      const [teamEerste, ...teamRest] = t.lijst;
      const volgersT = teamRest.slice(0, 3).map((x) => `${x.team} (${pt(x.aantal)})`);
      secties.push({
        id: ids.team,
        vraag: vul(K.team.vraag, v),
        kort: vul(K.team.kort, { ...v, team: teamEerste.team, aandeel: pt(teamEerste.aantal), spelers: t.spelers, poules: t.poules,
          volgers: volgersT.length ? vul(K.volgers, { lijst: opsom(code, volgersT) }) : '' }),
        tabel: { bijschrift: vul(K.team.bijschrift, v), kop: K.team.kop, klasse: 'compact',
          rijen: t.lijst.map((x) => [x.team, pt(x.aantal)]) },
      });
    }
    secties.push({ id: ids.hoe, vraag: vul(K.hoe.vraag, v), kort: vul(K.hoe.kort, v) });
    talen[code] = {
      pad: vul(K.pad, { jaar }),
      titel: vul(K.titel, v),
      omschrijving: vul(K.omschrijving, v),
      kop: vul(K.kop, v),
      kort: vul(K.kort, { ...v, teamZin: t?.lijst?.length
        ? vul(K.teamZin, { team: t.lijst[0].team, teamAandeel: pt(t.lijst[0].aantal) }) : '' }),
      secties,
      faq: [],
      leesOok: [],
      // De knop gaat naar de open poule (OPEN_POULE in site/teksten.mjs).
      slot: { ...K.slot, kop: vul(K.slot.kop, v), tekst: vul(K.slot.tekst, v), knop: vul(K.slot.knop, v), openPoule: true },
      // Voor de JSON-LD (een Dataset) en llms.txt.
      dataset: { id: ids.coureur, naam: vul(K.coureur.bijschrift, v), omschrijving: vul(K.kort, { ...v, teamZin: '' }),
        waarden: [['spelers', k.spelers], ['poules', k.poules], ...k.lijst.slice(0, 5).map((x) => [wie(x), k.spelers ? x.aantal / k.spelers : 0])] },
    };
  }
  return {
    id: `kampioen-${jaar}`,
    soort: 'kampioen',
    kruimel: metOverzicht ? 'races' : null,
    verwant: metOverzicht ? ['races', 'puntentelling'] : ['puntentelling'],
    talen,
  };
}

// Alle seizoenen met een bestand van de sync en een kampioen erin.
export function leesSpelers() {
  let bestanden = [];
  try { bestanden = readdirSync(join(wortel, 'site', 'data')); } catch { return []; }
  return bestanden.filter((f) => /^spelers-\d{4}\.json$/.test(f)).sort()
    .map((f) => lees(join('site', 'data', f))).filter(Boolean);
}

export const RACEDATA = lees(join('site', 'data', `races-${RACE_JAAR}.json`));
export const CIRCUITDATA = lees(join('site', 'data', 'circuits.json'));
export const SPELERSDATA = lees(join('site', 'data', `spelers-${RACE_JAAR}.json`));
const RACES_EN_OVERZICHT = bouwRacepaginas(RACEDATA, CIRCUITDATA, SPELERSDATA);
// De racepagina's met hun overzicht, en de pagina's "wie wordt wereldkampioen":
// allemaal pagina's uit site/data met hetzelfde sjabloon en dezelfde keuring.
export const KAMPIOENPAGINAS = leesSpelers()
  .map((d) => kampioenPagina(d, RACES_EN_OVERZICHT.some((pg) => pg.id === 'races'))).filter(Boolean);
export const RACEPAGINAS = [...RACES_EN_OVERZICHT, ...KAMPIOENPAGINAS];
