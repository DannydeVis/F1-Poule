/**
 * Hoe deed jij het tegen iedereen (1 november).
 *
 * Danny: "De sync rekent na elke sessie anonieme cijfers uit over alle
 * poules: de verdeling van de scores op de top 10 (die speelt elke poule),
 * welk deel van de spelers de winnaar en de pole goed had, welke coureur het
 * vaakst en het minst vaak op de goede plek stond, en de grootste verrassing
 * (de coureur die het verst onder- of overschat werd). Alleen echte
 * voorspellingen: automatisch ingevulde antwoorden tellen niet mee. Alleen na
 * de deadline, en pas vanaf 50 spelers uit minstens 5 poules per sessie;
 * daaronder niets tonen. Nooit per poule, nooit namen of id's."
 *
 * Zonder netwerk, zodat de regels na te rekenen zijn
 * (test/spelerscijfers.test.mjs). De sync haalt de antwoorden op en schrijft
 * wat hier uitkomt in de openbare tabel spelerscijfers; de database weigert
 * daar zelf ook een rij onder de drempel of van een sessie die nog open is.
 *
 * Wat "echt" is. Automatisch invullen gebeurt alleen in de app, op het
 * moment dat hij een poule toont (vulAutoAan() in app/index.html), en komt
 * nooit in de tabel answers. Wat in answers staat, heeft een speler zelf
 * opgeslagen. Een halve of kapotte lijst telt ook niet: alleen tien
 * verschillende coureurs.
 *
 * De punten zijn die van de app: scoreLijst() komt rechtstreeks uit de
 * rekenkern in app/index.html (het blok <knip primitieven>), net als bij de
 * controle van de stand. Een sprint telt half, afgerond zoals de app dat doet.
 */

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { knipUit } from './knipsel.mjs';
import { SESSIES, SESSIEVOLGORDE } from './herinneringen.mjs';
import { zelfdeRooster } from './vrijetrainingen.mjs';

export const DREMPEL = { spelers: 50, poules: 5 };
// Hoe lang na de deadline de sync een sessie nog narekent: een uitslag kan
// nog veranderen (een straf achteraf, zie opnieuwNakijken() in de sync).
// Daarna ligt alles vast: na de deadline komt er geen antwoord meer bij.
export const NAREKENEN_DAGEN = 7;
// De seizoensvragen voor de pagina "wie wordt wereldkampioen".
export const SEIZOENSCIJFERS = ['kampioen', 'constructeur'];

export const UITSLAG = { sprint: 'sprint_result', quali: 'quali_result', race: 'race_result' };
// Een sprint telt half (SESSIES.sprint.weging in app/index.html; de test houdt
// die twee gelijk).
export const WEGING = { sprint: 0.5, quali: 1, race: 1 };
// Een coureur die niet in je top 10 staat, of er niet in eindigde, staat
// voor deze cijfers op "plek 11": buiten de top 10.
const BUITEN = 11;

// Pas geladen als er echt iets te rekenen valt, en zonder await: dan kan de
// sync dit bestand altijd importeren, ook waar app/index.html niet naast
// staat (de tests draaien hem in een losse map). Lukt het laden niet, dan
// geeft scoreLijst een fout en slaat de sync de cijfers over.
let kern = null;
function laadKern() {
  if (!kern) {
    const bron = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
    const code = knipUit(bron, 'primitieven').replace(/^export (?=(?:async )?(?:function|const|let|class)\b)/gm, '');
    const plek = createContext({});
    runInContext(`${code}\n;globalThis.__kern = { scoreLijst };`, plek);
    kern = plek.__kern;
  }
  return kern;
}
export const scoreLijst = (voorspeld, werkelijk) => laadKern().scoreLijst(voorspeld, werkelijk);

/** Tien verschillende coureurs: een lijst die een speler zelf opsloeg. */
export const echteLijst = (w) => Array.isArray(w) && w.length === 10
  && w.every((x) => x !== null && x !== '' && typeof x !== 'object')
  && new Set(w.map(String)).size === 10;

const eenDecimaal = (x) => Math.round(x * 10) / 10;

/** De punten op de top 10 zoals de app ze toont (een sprint half). */
export const topPunten = (lijst, uitslag, sessie) =>
  Math.round(scoreLijst(lijst.map(String), uitslag.map(String)).totaal * (WEGING[sessie] ?? 1));

/**
 * De cijfers van één sessie, of null als ze er (nog) niet mogen zijn: voor de
 * deadline, zonder uitslag, bij een afgelaste race, of onder de drempel.
 *
 * @param race       de rij uit races
 * @param sessie     'sprint', 'quali' of 'race'
 * @param antwoorden rijen {pool_id, question_id, waarde} van deze race; andere
 *                   vragen en andere sessies worden overgeslagen
 */
export function sessieCijfers({ race, sessie, antwoorden = [], nu = Date.now() } = {}) {
  const S_ = SESSIES[sessie];
  if (!S_ || !race || race.afgelast) return null;
  const deadline = Date.parse(race[S_.deadline] ?? '');
  if (!(deadline <= nu)) return null;
  const uitslag = (race[UITSLAG[sessie]] ?? []).map(String);
  if (uitslag.length < 10) return null;

  const lijsten = antwoorden
    .filter((a) => a?.question_id === S_.vraag && echteLijst(a.waarde))
    .map((a) => ({ pool: String(a.pool_id), lijst: a.waarde.map(String) }));
  const spelers = lijsten.length;
  const poules = new Set(lijsten.map((l) => l.pool)).size;
  if (spelers < DREMPEL.spelers || poules < DREMPEL.poules) return null;

  // De verdeling van de punten: per aantal punten hoeveel spelers.
  const punten = lijsten.map((l) => topPunten(l.lijst, uitslag, sessie));
  const verdeling = {};
  for (const p of punten) verdeling[p] = (verdeling[p] ?? 0) + 1;

  // Per plek in de echte top 10: hoeveel spelers die coureur precies daar
  // hadden. De winnaar (of de pole) is plek 1.
  const goed = uitslag.slice(0, 10).map((nr, i) => ({
    nr, plek: i + 1, goed: lijsten.filter((l) => l.lijst[i] === nr).length,
  }));
  // Gelijk? Dan de hoogste plek in de uitslag: daar zit het verhaal.
  const vaakst = [...goed].sort((a, b) => b.goed - a.goed || a.plek - b.plek)[0];
  const minst = [...goed].sort((a, b) => a.goed - b.goed || a.plek - b.plek)[0];

  // De grootste verrassing: waar de spelers hem gemiddeld zetten (buiten je
  // top 10 is plek 11), tegen waar hij eindigde (buiten de top 10 ook 11).
  // Positief: beter dan verwacht (onderschat). Negatief: slechter (overschat).
  const echt = (nr) => { const i = uitslag.indexOf(nr); return i >= 0 && i < 10 ? i + 1 : BUITEN; };
  const kandidaten = new Set([...uitslag.slice(0, 10), ...lijsten.flatMap((l) => l.lijst)]);
  let verrassing = null;
  for (const nr of kandidaten) {
    let som = 0, erin = 0;
    for (const l of lijsten) {
      const i = l.lijst.indexOf(nr);
      if (i >= 0) { som += i + 1; erin++; } else som += BUITEN;
    }
    const verwacht = som / spelers;
    const verschil = verwacht - echt(nr);
    const beter = !verrassing
      || Math.abs(verschil) > Math.abs(verrassing.verschil) + 1e-9
      || (Math.abs(Math.abs(verschil) - Math.abs(verrassing.verschil)) <= 1e-9
          && (echt(nr) < echt(verrassing.nr) || (echt(nr) === echt(verrassing.nr) && Number(nr) < Number(verrassing.nr))));
    if (beter) verrassing = { nr, verschil, verwacht, erin };
  }

  return {
    spelers,
    poules,
    cijfers: {
      verdeling,
      gemiddeld: eenDecimaal(punten.reduce((a, b) => a + b, 0) / spelers),
      // Het hoogste wat er op de top 10 te halen viel: 50, op een sprint 25.
      max: Math.round(50 * (WEGING[sessie] ?? 1)),
      p1: { nr: goed[0].nr, goed: goed[0].goed },
      vaakst,
      minst,
      verrassing: verrassing && Math.abs(verrassing.verschil) >= 1 ? {
        nr: verrassing.nr,
        plek: echt(verrassing.nr) <= 10 ? echt(verrassing.nr) : null,
        verwacht: eenDecimaal(verrassing.verwacht),
        erin: verrassing.erin,
        richting: verrassing.verschil > 0 ? 'onderschat' : 'overschat',
      } : null,
    },
  };
}

/** Welke sessies de sync nu narekent: na de deadline, en hoogstens een week erna. */
export function teBerekenen(races = [], nu = Date.now()) {
  const uit = [];
  for (const race of races) {
    if (race.afgelast) continue;
    for (const sessie of SESSIEVOLGORDE) {
      const t = Date.parse(race[SESSIES[sessie].deadline] ?? '');
      if (!(t <= nu) || nu - t > NAREKENEN_DAGEN * 864e5) continue;
      if ((race[UITSLAG[sessie]] ?? []).length < 10) continue;
      uit.push({ race, sessie });
    }
  }
  return uit;
}

/**
 * Hoeveel procent van alle spelers lager scoorde: "Beter dan 73% van alle
 * spelers". Naar beneden afgerond, zodat het nooit mooier klinkt dan het is.
 * null zonder verdeling of als je niemand voorbij was.
 */
export function beterDan(verdeling, punten) {
  let lager = 0, totaal = 0;
  for (const [p, n] of Object.entries(verdeling ?? {})) {
    totaal += n;
    if (Number(p) < punten) lager += n;
  }
  if (!totaal) return null;
  const pct = Math.floor((100 * lager) / totaal);
  return pct >= 1 ? pct : null;
}

// ---- de seizoensvragen: wie wordt wereldkampioen ----------------------------

/**
 * De race waar de seizoensvragen aan hangen (de laagste ronde, net als
 * seizoenRace() in de app) en wanneer die vastgaan: bij de eerste sessie van
 * dat weekend (poule_seizoen_gestart() in schema.sql).
 */
export function seizoenStart(races = [], seizoen) {
  const eerste = races.filter((r) => r.season === seizoen)
    .reduce((a, r) => (!a || r.round < a.round ? r : a), null);
  if (!eerste) return null;
  const tijden = SESSIEVOLGORDE.map((w) => Date.parse(eerste[SESSIES[w].deadline] ?? '')).filter((t) => t > 0);
  return tijden.length ? { race: eerste, start: Math.min(...tijden) } : null;
}

/**
 * Leeft de pagina? Van 1 december van het jaar ervoor tot de eerste sessie
 * van het seizoen. Daarna rekent de sync niet meer na: wat er dan staat, zijn
 * de voorspellingen van voor het seizoen.
 */
export function seizoenVenster(races = [], seizoen, nu = Date.now()) {
  const s = seizoenStart(races, seizoen);
  if (!s) return null;
  const vanaf = Date.UTC(seizoen - 1, 11, 1);
  return nu >= vanaf && nu < s.start ? s : null;
}

/** Het seizoen waarvoor de pagina nu leeft, of null. */
export function komendSeizoen(races = [], nu = Date.now()) {
  const jaren = [...new Set(races.map((r) => r.season))].sort((a, b) => a - b);
  return jaren.find((j) => seizoenVenster(races, j, nu)) ?? null;
}

const sleutel = (w) => (typeof w === 'string' ? w.trim() : typeof w === 'number' ? String(w) : '');

/**
 * De verdeling van de seizoensvragen van één seizoen, over alle spelers
 * samen. Per vraag dezelfde drempel; een vraag eronder valt weg, en zonder
 * één vraag erboven is er niets. Hier wel vóór de deadline: daar gaat de
 * pagina over.
 *
 * @param antwoorden rijen {pool_id, question_id, waarde} van de race waar
 *                   het seizoen aan hangt
 */
export function seizoenCijfers({ antwoorden = [] } = {}) {
  const vragen = {};
  for (const vraag of SEIZOENSCIJFERS) {
    const rijen = antwoorden.filter((a) => a?.question_id === vraag && sleutel(a.waarde));
    const spelers = rijen.length;
    const poules = new Set(rijen.map((a) => String(a.pool_id))).size;
    if (spelers < DREMPEL.spelers || poules < DREMPEL.poules) continue;
    const verdeling = {};
    for (const a of rijen) verdeling[sleutel(a.waarde)] = (verdeling[sleutel(a.waarde)] ?? 0) + 1;
    vragen[vraag] = { spelers, poules, verdeling };
  }
  const kop = Object.values(vragen).sort((a, b) => b.spelers - a.spelers)[0];
  return kop ? { spelers: kop.spelers, poules: kop.poules, cijfers: vragen } : null;
}

// ---- naar de tabel en naar de site ------------------------------------------

/**
 * Dezelfde cijfers? jsonb zet de sleutels in zijn eigen volgorde, dus met
 * gesorteerde sleutels vergelijken (zoals bij het rooster van de trainingen);
 * anders schrijft de sync elke run hetzelfde weg.
 */
export const zelfdeCijfers = zelfdeRooster;

// De deelnemers van een seizoen, voor de namen bij de nummers: de race waar
// de seizoensvragen aan hangen, anders een andere race van dat seizoen met een
// lijst, anders de laatste van het seizoen ervoor (in december heeft OpenF1
// nog niemand voor het nieuwe jaar).
function deelnemers(races, jaar) {
  const start = seizoenStart(races, jaar);
  if (start?.race?.drivers?.length) return start.race.drivers;
  const met = (j) => races.filter((r) => r.season === j && r.drivers?.length).sort((a, b) => b.round - a.round);
  return met(jaar)[0]?.drivers ?? met(jaar - 1)[0]?.drivers ?? [];
}
const persoon = (drivers, nr) => {
  const d = (drivers ?? []).find((x) => String(x.nr) === String(nr));
  return { naam: d?.naam ?? null, code: d?.code ?? null, team: d?.team ?? null };
};

/**
 * Het bestand voor de site (site/data/spelers-<jaar>.json): de rijen uit de
 * tabel, met bij elke coureur zijn naam en team uit de deelnemerslijst, en
 * bij elke race de naam en de racesessie van OpenF1 (race_key), waarmee de
 * site de racepagina vindt. Zonder tijdstempel: zo verandert het bestand
 * alleen als de cijfers veranderen.
 */
export function sitebestand({ jaar, rijen = [], races = [] } = {}) {
  const vanJaar = races.filter((r) => r.season === jaar);
  const perRonde = new Map();
  const sessies = rijen.filter((r) => r.seizoen === jaar && r.sessie !== 'seizoen')
    .sort((a, b) => a.ronde - b.ronde || SESSIEVOLGORDE.indexOf(a.sessie) - SESSIEVOLGORDE.indexOf(b.sessie));
  for (const rij of sessies) {
    const race = vanJaar.find((r) => r.round === rij.ronde);
    if (!race) continue;
    const c = rij.cijfers ?? {};
    const met = (x) => (x ? { ...x, ...persoon(race.drivers, x.nr) } : null);
    if (!perRonde.has(rij.ronde)) {
      perRonde.set(rij.ronde, { ronde: rij.ronde, naam: race.name, race_key: race.race_key ?? null, sessies: {} });
    }
    perRonde.get(rij.ronde).sessies[rij.sessie] = {
      spelers: rij.spelers, poules: rij.poules, gemiddeld: c.gemiddeld ?? null, max: c.max ?? null,
      p1: met(c.p1), vaakst: met(c.vaakst), minst: met(c.minst), verrassing: met(c.verrassing),
      verdeling: c.verdeling ?? {},
    };
  }
  const s = rijen.find((r) => r.seizoen === jaar && r.sessie === 'seizoen');
  let seizoen = null;
  if (s) {
    const drivers = deelnemers(races, jaar);
    const start = seizoenStart(races, jaar);
    const op = (verdeling) => Object.entries(verdeling ?? {})
      .sort(([a, x], [b, y]) => y - x || (a < b ? -1 : a > b ? 1 : 0));
    const k = s.cijfers?.kampioen;
    const t = s.cijfers?.constructeur;
    seizoen = {
      spelers: s.spelers,
      poules: s.poules,
      // Tot wanneer er nog voorspeld wordt: de eerste sessie van het seizoen.
      tot: start ? new Date(start.start).toISOString() : null,
      kampioen: k ? { spelers: k.spelers, poules: k.poules,
        lijst: op(k.verdeling).map(([nr, aantal]) => ({ nr, ...persoon(drivers, nr), aantal })) } : null,
      constructeur: t ? { spelers: t.spelers, poules: t.poules,
        lijst: op(t.verdeling).map(([team, aantal]) => ({ team, aantal })) } : null,
    };
  }
  return { jaar, races: [...perRonde.values()], seizoen };
}
