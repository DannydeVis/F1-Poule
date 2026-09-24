/**
 * Welke seizoenen de sync deze ronde onder handen neemt.
 *
 * Dit stond vast op 2026: `SEIZOEN: '2026'` in de workflow, en zonder die
 * regel viel sync.mjs terug op 2026. Na de laatste race van dit jaar had dat
 * betekend dat de kalender van 2027 nooit werd opgehaald. De app heeft al een
 * knop "Begin aan 2027", maar wie daarop drukte kwam in een lege kalender --
 * zonder foutmelding, want er gaat niets mis, er komt alleen niets.
 *
 * Twee vragen, en ze hebben een ander antwoord:
 *
 *   uitslagen  Van welke seizoenen kijken we de races na? Elk seizoen waar
 *              nog iets te halen valt: een race die nog gereden moet worden,
 *              of die nog op zijn uitslag wacht, of die net gereden is en nog
 *              opnieuw nagekeken wordt (opnieuwNakijken in uitslagen.mjs, en
 *              afgelast na een week). Rond de jaarwisseling zijn dat er twee:
 *              de laatste herkeuringen van het oude jaar en de kalender van
 *              het nieuwe.
 *
 *   kalender   Van welk seizoen halen we de kalender op? Van het volgende,
 *              zodra de laatste race van het huidige minder dan VOORUIT_DAGEN
 *              weg is. Zo staat de kalender van 2027 klaar op het moment dat
 *              een poulebaas kan doorschuiven, en niet pas een paar uur later.
 *              Een lege database begint bij het jaar van vandaag.
 *
 * Een functie zonder netwerk, net als herinneringen.mjs: wat hij moet doen
 * staat in test/sync-seizoenen.test.mjs, en daar kan de jaarwisseling nagespeeld
 * worden zonder op december te wachten.
 */

import { VERVERS_VENSTER_DAGEN } from './uitslagen.mjs';

const DAG = 24 * 3600 * 1000;

// Twee maanden. De kalender van volgend jaar komt bij OpenF1 op een moment dat
// wij niet kennen; zolang hij er niet is kost zoeken één licht verzoek per
// ronde (sync.mjs stopt na een lege lijst races). Ruim vóór de finale beginnen
// betekent dat hij er in elk geval is als het seizoen erop zit.
export const VOORUIT_DAGEN = 60;

// Hoe lang een gereden race nog aandacht krijgt. De herkeuringen lopen tot 32
// uur na de start, en een race zonder uitslag gaat pas na zeven dagen op
// afgelast. Tien dagen is daar ruim overheen.
export const NAZORG_DAGEN = 10;

const tijd = (iso) => {
  // new Date(null) is 1 januari 1970, en dat is een keurig getal. Leeg is
  // leeg, net als overal in uitslagen.mjs.
  if (iso === null || iso === undefined || iso === '') return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
};

/** Valt er aan deze race nog iets te doen? */
export function nogWerk(race, nu = Date.now()) {
  if (race.afgelast) return false;
  if (!race.race_result?.length) return true;
  const start = tijd(race.deadline_race);
  return start !== null && nu - start < NAZORG_DAGEN * DAG;
}

/**
 * @param races  alle races uit de database (minstens season, deadline_race,
 *               race_result, afgelast)
 * @param nu     milliseconden
 * @param vast   een seizoen dat met de hand is opgegeven (SEIZOEN in de
 *               omgeving). Dan alleen dat, zoals vroeger.
 * @returns { uitslagen: number[], kalender: number[] }
 */
export function seizoenPlan(races = [], nu = Date.now(), { vast = null } = {}) {
  if (vast) {
    return { uitslagen: [vast],
             kalender: races.some((r) => r.season === vast) ? [] : [vast] };
  }
  if (!races.length) {
    return { uitslagen: [], kalender: [new Date(nu).getUTCFullYear()] };
  }

  const jaren = [...new Set(races.map((r) => r.season))].sort((a, b) => a - b);
  const uitslagen = jaren.filter((j) =>
    races.some((r) => r.season === j && nogWerk(r, nu)));

  // De finale is de laatste race met een tijd. Een seizoen waarvan geen enkele
  // race een tijd heeft kan niet zeggen wanneer het afloopt; dan zoeken we het
  // volgende gewoon alvast, want dat kost niets zolang het er niet is.
  const laatste = jaren[jaren.length - 1];
  const tijden = races.filter((r) => r.season === laatste)
    .map((r) => tijd(r.deadline_race)).filter((t) => t !== null);
  const finale = tijden.length ? Math.max(...tijden) : null;
  const kalender = finale === null || finale - nu < VOORUIT_DAGEN * DAG
    ? [laatste + 1] : [];

  return { uitslagen, kalender };
}

/**
 * Welke seizoenen er in de agenda horen. De seizoenen die nog lopen; is er
 * geen enkel meer (alles gereden, volgend jaar nog niet bekend), dan het
 * laatste, zodat een abonnee niet ineens een lege agenda krijgt.
 */
export function agendaSeizoenen(races = [], plan) {
  if (plan.uitslagen.length) return plan.uitslagen;
  const jaren = races.map((r) => r.season);
  return jaren.length ? [Math.max(...jaren)] : [];
}

/**
 * Een race zonder deelnemerslijst die nog ver weg is.
 *
 * deelnemersUit() probeert een lege lijst altijd, hoe ver de race ook weg is,
 * en binnen een seizoen is dat goed: OpenF1 zet de inschrijflijst van het
 * seizoen bij elke sessie, dus één keer vragen is genoeg. Maar de kalender van
 * volgend jaar komt nu al in het najaar binnen, en dan heeft OpenF1 voor die
 * vierentwintig races nog niemand. Zonder deze rem waren dat vierentwintig
 * verzoeken per ronde, maandenlang, die allemaal niets opleveren.
 *
 * Zo'n race wacht op de dagelijkse ronde (KALENDER=true in sync.yml). Komt hij
 * binnen het verversvenster, dan gaat hij gewoon weer elke ronde mee.
 */
export function lijstKanWachten(race, nu = Date.now()) {
  if ((race.drivers ?? []).length) return false;
  const start = tijd(race.deadline_quali) ?? tijd(race.deadline_race);
  return start !== null && start - nu > VERVERS_VENSTER_DAGEN * DAG;
}

/**
 * Het seizoen waar het nu om draait, voor de controlescripts: het eerste
 * seizoen waar nog iets te doen valt, anders het laatste dat er is, en in een
 * lege database het jaar van vandaag. Stond in elk script als `?? 2026`.
 */
export function huidigSeizoen(races = [], nu = Date.now()) {
  const plan = seizoenPlan(races, nu);
  if (plan.uitslagen.length) return plan.uitslagen[0];
  const jaren = races.map((r) => r.season);
  return jaren.length ? Math.max(...jaren) : new Date(nu).getUTCFullYear();
}
