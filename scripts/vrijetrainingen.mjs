/**
 * De vrije trainingen voor de app (1 november).
 *
 * Danny: "racedata.mjs haalt de top 10 van elke vrije training al op voor de
 * site, maar de app ziet die niet. Zet ze in Supabase en toon ze op het
 * invulscherm: per training de top 10, met bij elke coureur waar jij hem nu
 * hebt staan."
 *
 * racedata.mjs doet het alleen voor de races met een pagina op de site. De
 * sync ziet elke race, haalt op een raceweekend toch al alle sessies van het
 * seizoen op (weekendSessies), en stuurt de melding op vrijdagavond
 * (trainingmeldingen.mjs). Dus schrijft de sync races.vrije_trainingen, met
 * de service_role key, en deze regels zonder netwerk erin kun je narekenen
 * (test/vrijetrainingen.test.mjs).
 *
 * Per training: { naam, sessie, start, eind, top }. Het rooster staat er
 * zodra het weekend bekend is (daar rekent de wekker mee), de top 10 zodra
 * de training gereden is.
 */

export const VRIJE_TRAININGEN = ['Practice 1', 'Practice 2', 'Practice 3'];
// Een vrije training heeft geen straffen achteraf: een half uur na het einde
// staat de uitslag er (net als in racedata.mjs). Eerder is OpenF1 nog dicht.
export const TRAINING_KLAAR_MIN = 30;

/** Het rooster van dit weekend, met de top 10 die er al stond. */
export function trainingRooster(sessies = [], bestaand = []) {
  return (sessies ?? [])
    .filter((s) => VRIJE_TRAININGEN.includes(s.session_name))
    .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start))
    .map((s) => ({
      naam: s.session_name,
      sessie: s.session_key,
      start: s.date_start ?? null,
      eind: s.date_end ?? null,
      top: (bestaand ?? []).find((t) => t?.naam === s.session_name
        && String(t.sessie) === String(s.session_key))?.top ?? null,
    }));
}

/**
 * Welke trainingen nu op te halen zijn: gereden en een half uur voorbij, nog
 * zonder top 10, en het weekend nog niet gescoord. Na de race kijkt niemand
 * meer naar de trainingen; dan hoeven ze ook niet elke ronde opgehaald.
 */
export function teHalen(rooster = [], race = {}, nu = Date.now()) {
  if (race.race_result?.length || race.afgelast) return [];
  return rooster.filter((t) => !t.top?.length && t.eind
    && Date.parse(t.eind) + TRAINING_KLAAR_MIN * 60e3 < nu);
}

/**
 * De top 10 van een training: session_result op plek, met de code en de naam
 * uit de deelnemerslijst van de race. Wie geen plek heeft valt af, zoals in
 * de sync. null als er niets bruikbaars is.
 */
export function trainingTop10(uitslag = [], drivers = []) {
  const wie = new Map((drivers ?? []).map((d) => [String(d.nr), d]));
  const top = (uitslag ?? [])
    .filter((r) => Number.isInteger(r.position) && r.position >= 1)
    .sort((a, b) => a.position - b.position)
    .slice(0, 10)
    .map((r) => {
      const d = wie.get(String(r.driver_number));
      return { plek: r.position, nr: String(r.driver_number), code: d?.code ?? null, naam: d?.naam ?? null };
    });
  return top.length ? top : null;
}

/**
 * Hetzelfde rooster? jsonb zet de sleutels van een object in zijn eigen
 * volgorde (eerst de korte), dus wat de database teruggeeft is als tekst
 * anders dan wat de sync bouwde. Met gesorteerde sleutels vergelijken; anders
 * schrijft de sync elke ronde hetzelfde rooster terug.
 */
const vast = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : v));
export const zelfdeRooster = (a, b) => (a ?? null) === (b ?? null) || vast(a ?? null) === vast(b ?? null);
