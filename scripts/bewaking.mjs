/**
 * Bewaking: wanneer is een uitslag te laat, en wanneer moet de sync opnieuw
 * kijken? Zonder netwerk erin, zodat test/bewaking.test.mjs het kan narekenen.
 * De pings naar healthchecks.io zelf doet scripts/bewaking.sh vanuit de
 * workflows; zie BEDIENING.md, "Bewaking".
 *
 * Het einde van een sessie staat niet in de database, alleen de start (de
 * deadline). Een kwalificatie of sprint duurt ongeveer een uur, een race twee.
 * Daarna geeft OpenF1 een gratis account nog een halfuur niets (zie
 * scripts/openf1-dicht.mjs). Pas dan is de uitslag op te halen.
 */

export const SESSIEDUUR_UREN = { quali: 1, sprint: 1, race: 2 };
export const OPENF1_DICHT_MIN = 30;
const SESSIES = {
  sprint: { deadline: 'deadline_sprint', uitslag: 'sprint_result', naam: 'sprint' },
  quali:  { deadline: 'deadline_quali',  uitslag: 'quali_result',  naam: 'kwalificatie' },
  race:   { deadline: 'deadline_race',   uitslag: 'race_result',   naam: 'race' },
};

// Wanneer de uitslag van deze sessie er hoort te zijn: de start, plus de duur,
// plus het halfuur dat OpenF1 dicht is. null als de sessie niet bestaat.
export function uitslagVanaf(race, welk) {
  const iso = race?.[SESSIES[welk].deadline];
  if (!iso) return null;
  const start = Date.parse(iso);
  if (!Number.isFinite(start)) return null;
  return start + SESSIEDUUR_UREN[welk] * 3600e3 + OPENF1_DICHT_MIN * 60e3;
}

// Elke gespeelde sessie die meer dan `marge` uur na dat moment nog geen
// uitslag heeft en niet afgelast is. Voor de check "uitslagen": die meldt dan
// /fail met deze sessies erin. Racenamen en tijden, geen spelersdata.
export const TE_LAAT_UREN = 2;
export function teLateUitslagen({ races = [], nu = Date.now(), marge = TE_LAAT_UREN } = {}) {
  const uit = [];
  for (const race of races) {
    if (race.afgelast) continue;
    for (const welk of Object.keys(SESSIES)) {
      const vanaf = uitslagVanaf(race, welk);
      if (vanaf === null || race[SESSIES[welk].uitslag]) continue;
      if (nu - vanaf > marge * 3600e3) uit.push({ race, welk, vanaf });
    }
  }
  return uit.sort((a, b) => a.vanaf - b.vanaf);
}

export const teLaatTekst = (lijst) => lijst.map(({ race, welk, vanaf }) =>
  `${race.name} ${SESSIES[welk].naam} (${race.season} ronde ${race.round}), uitslag verwacht vanaf `
  + `${new Date(vanaf).toISOString().slice(0, 16).replace('T', ' ')} UTC`).join('; ');

// De wekker voor een uitslag. In de laatste drie raceweekenden van 2026 kwam
// de eerste sync 0,1 tot 2,3 uur nadat de uitslag op te halen was, en in Kuala
// Lumpur kwam hij pas met een run met de hand. Dus: 35 minuten nadat de
// uitslag er hoort te zijn een wekker, en zolang hij er niet is, tot 8 uur na
// het einde van de sessie, elke keer 30 minuten later een nieuwe.
export const UITSLAG_WEKKER_MIN = 35;
export const UITSLAG_OPNIEUW_MIN = 30;
export const UITSLAG_TOT_UREN = 8;
export function uitslagWekker({ races = [], nu = Date.now(), horizon = 12 } = {}) {
  let vroegst = null;
  for (const race of races) {
    if (race.afgelast) continue;
    for (const welk of Object.keys(SESSIES)) {
      if (race[SESSIES[welk].uitslag]) continue;
      const vanaf = uitslagVanaf(race, welk);
      if (vanaf === null) continue;
      const einde = vanaf - OPENF1_DICHT_MIN * 60e3;
      const eerste = einde + UITSLAG_WEKKER_MIN * 60e3;
      const tot = einde + UITSLAG_TOT_UREN * 3600e3;
      let om;
      if (nu < eerste) om = eerste;
      else if (nu < tot) om = nu + UITSLAG_OPNIEUW_MIN * 60e3;
      else continue;
      if (om - nu > horizon * 3600e3) continue;
      if (vroegst === null || om < vroegst) vroegst = om;
    }
  }
  return vroegst === null ? null : new Date(vroegst).toISOString();
}

// Hoogstens één wekker tegelijk: de vroegste wint.
export function vroegste(...tijden) {
  const geldig = tijden.filter(Boolean).map((t) => Date.parse(t)).filter(Number.isFinite);
  return geldig.length ? new Date(Math.min(...geldig)).toISOString() : null;
}
