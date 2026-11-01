/**
 * Een seintje als de uitslag binnen is.
 *
 * Danny, 1 november: "zou ik graag een notificatie willen als de resultaten
 * bekend zijn". Wie meldingen aan heeft, krijgt naast de herinneringen voor
 * een deadline ook een melding zodra de uitslag van een sessie er is.
 *
 * Apart van sync.mjs en zonder netwerk erin, net als herinneringen.mjs: zo is
 * de regel na te rekenen (test/uitslagmeldingen.test.mjs). En niet ín
 * herinneringen.mjs, want daar staat een kopie van naast de functie `tik`
 * (supabase/functions/tik), en die hoeft hiervoor niet opnieuw uitgerold.
 *
 * De regel in één zin: per toestel hooguit één melding per sessie, over de
 * laatste sessie met een uitslag, alleen binnen een dag na het begin ervan,
 * en alleen als die poule op die sessie iets speelt. Of je zelf iets invulde
 * maakt niet uit: ook wie niets inleverde wil weten hoe de stand ervoor staat,
 * en automatisch invullen kan hem punten hebben opgeleverd.
 */

import { SESSIES, SESSIEVOLGORDE, woorden } from './herinneringen.mjs';

// Een dag na het begin van de sessie. Een uitslag komt normaal binnen een paar
// uur; een dag laat ruimte voor een OpenF1 die laat is, of een uitslag die
// de beheerder met de hand invult. Wat later komt is geen nieuws meer, en zo
// krijgt ook wie net meldingen aanzet geen seintje over een race van vorige
// week.
export const UITSLAG_VENSTER_UREN = 24;

// Waar de uitslag van een sessie staat.
const UITSLAG = { sprint: 'sprint_result', quali: 'quali_result', race: 'race_result' };

// De vragen die bij een sessie horen: de top 10 en de losse vragen met
// dezelfde deadline (COUREURVRAAG en EXTRAVRAAG in index.html). Speelt een
// poule daar niets van, dan valt er voor hem niets te melden.
export const SESSIEVRAGEN = {
  sprint: ['sprint_top10'],
  quali: ['quali_top10', 'pole'],
  race: ['race_top10', 'winnaar', 'snelste_ronde', 'snelste_pitstop',
         'safety_cars', 'rode_vlag', 'teamgenoot_duels'],
};

// De zinnen. De naam van de sessie komt uit herinneringen.mjs, zodat een
// sessie in beide meldingen hetzelfde heet. Een taal die hier niet staat
// krijgt Nederlands, net als daar.
const ZINNEN = {
  nl: { titel: (race, sessie) => `${race}: uitslag ${sessie} binnen`,
        tekst: 'Bekijk je punten en de stand.' },
  en: { titel: (race, sessie) => `${race}: ${sessie} result is in`,
        tekst: 'See your points and the standings.' },
  de: { titel: (race, sessie) => `${race}: Ergebnis ${sessie} ist da`,
        tekst: 'Sieh dir deine Punkte und die Tabelle an.' },
  fr: { titel: (race, sessie) => `${race} : résultat disponible (${sessie})`,
        tekst: 'Découvrez vos points et le classement.' },
  es: { titel: (race, sessie) => `${race}: ya está el resultado (${sessie})`,
        tekst: 'Mira tus puntos y la clasificación.' },
  it: { titel: (race, sessie) => `${race}: risultato disponibile (${sessie})`,
        tekst: 'Guarda i tuoi punti e la classifica.' },
  pt: { titel: (race, sessie) => `${race}: resultado disponível (${sessie})`,
        tekst: 'Veja seus pontos e a classificação.' },
};
export const uitslagZinnen = (taal) => ZINNEN[taal] ?? ZINNEN.nl;

/**
 * De laatste sessie met een uitslag die nog nieuws is, of null. Apart, zodat
 * de sync de abonnementen pas ophaalt als er iets te melden valt.
 */
export function laatsteUitslag({ races = [], nu = Date.now() } = {}) {
  let laatste = null;
  for (const race of races) {
    if (race.afgelast) continue;
    for (const welk of SESSIEVOLGORDE) {
      const iso = race[SESSIES[welk].deadline];
      if (!iso || !race[UITSLAG[welk]]?.length) continue;
      const begon = Date.parse(iso);
      const uren = (nu - begon) / 3600e3;
      if (!(uren >= 0) || uren > UITSLAG_VENSTER_UREN) continue;
      if (!laatste || begon > laatste.begon) laatste = { race, welk, begon };
    }
  }
  return laatste && { race: laatste.race, welk: laatste.welk,
                      tag: `uitslag:${laatste.race.id}:${laatste.welk}` };
}

/**
 * @param races        de races van dit seizoen, met hun uitslagen
 * @param abonnementen rijen uit push_abonnementen; `uitslag_laatst` zegt over
 *                     welke uitslag dat toestel al een melding kreeg
 * @param poulevragen  rijen {pool_id, question_id}; een poule zonder rijen doet alles
 * @param nu           tijdstip in ms
 */
export function wieKrijgtEenUitslag({ races = [], abonnementen = [], poulevragen = [],
                                      nu = Date.now() } = {}) {
  const nieuws = laatsteUitslag({ races, nu });
  if (!nieuws) return [];

  // Welke poule stelt welke vraag. Geen rijen = alles aan, net als in de app.
  const perPoule = new Map();
  for (const r of poulevragen) {
    if (!perPoule.has(r.pool_id)) perPoule.set(r.pool_id, new Set());
    perPoule.get(r.pool_id).add(r.question_id);
  }
  const speelt = (poolId) => {
    const set = perPoule.get(poolId);
    return !set || SESSIEVRAGEN[nieuws.welk].some((v) => set.has(v));
  };

  const uit = [];
  for (const ab of abonnementen) {
    // Uitgezet onder Profiel (1 november). Een rij zonder de kolom telt als aan.
    if (ab.meld_uitslag === false) continue;
    if (!speelt(ab.pool_id)) continue;
    // Deze had hij al. De sync komt elk kwartier langs, en de uitslag staat
    // er dan nog steeds.
    if (ab.uitslag_laatst === nieuws.tag) continue;
    const z = uitslagZinnen(ab.taal);
    uit.push({
      abonnement: ab,
      tag: nieuws.tag,
      bericht: {
        // De racenaam komt van OpenF1 en blijft zoals hij is.
        titel: z.titel(nieuws.race.name, woorden(ab.taal)[nieuws.welk]),
        tekst: z.tekst,
        tag: nieuws.tag,
      },
    });
  }
  return uit;
}
