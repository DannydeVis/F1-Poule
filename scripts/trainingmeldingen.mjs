/**
 * Een seintje op vrijdagavond: de vrije training is binnen.
 *
 * Danny, 1 november: spelers komen alleen naar de app om in te vullen en de
 * uitslag te zien, en vrijdag is de stilste dag. "Eén melding op
 * vrijdagavond: na VT2 (op een sprintweekend na VT1), 'VT2 is binnen:
 * {snelste} was het snelst. Je top 10 kan nog tot {deadline}.' Ook voor wie al
 * ingevuld heeft. Hooguit één per weekend."
 *
 * Apart van sync.mjs en zonder netwerk erin, net als uitslagmeldingen.mjs: zo
 * is de regel na te rekenen (test/trainingmeldingen.test.mjs).
 *
 * De regel in één zin: per toestel hooguit één melding per weekend, over de
 * training die het weekend opent voor de voorspellers (VT2, op een
 * sprintweekend VT1), zodra zijn top 10 in races.vrije_trainingen staat, en
 * alleen zolang er voor die poule nog een top 10 open is met minstens een uur
 * te gaan. Daarna neemt de herinnering voor de deadline het over.
 */

import { SESSIES, SESSIEVOLGORDE } from './herinneringen.mjs';

// De training waarna de melding komt. Op een sprintweekend is er maar één
// vrije training, en daarna sluit de sprint al op zaterdag.
export const sleuteltraining = (race) => (race?.deadline_sprint ? 'Practice 1' : 'Practice 2');
// Zo lang moet er nog over zijn tot de deadline. Korter dan dat en de
// herinnering (drie uur voor de deadline, voor wie nog niets invulde) komt
// er al aan, of het is te laat om nog iets te doen.
export const TRAINING_MARGE_MIN = 60;

const ZINNEN = {
  nl: {
    vt: { 'Practice 1': 'VT1', 'Practice 2': 'VT2' },
    titel: (vt, wie) => `${vt} is binnen: ${wie} was het snelst`,
    tot: (wanneer) => `Je top 10 kan nog tot ${wanneer}.`,
    totSessie: { sprint: 'Je top 10 kan nog tot de start van de sprint.',
      quali: 'Je top 10 kan nog tot de start van de kwalificatie.',
      race: 'Je top 10 kan nog tot de start van de race.' },
  },
  en: {
    vt: { 'Practice 1': 'FP1', 'Practice 2': 'FP2' },
    titel: (vt, wie) => `${vt} is in: ${wie} was fastest`,
    tot: (wanneer) => `Your top 10 is open until ${wanneer}.`,
    totSessie: { sprint: 'Your top 10 is open until the sprint starts.',
      quali: 'Your top 10 is open until qualifying starts.',
      race: 'Your top 10 is open until the race starts.' },
  },
  de: {
    vt: { 'Practice 1': 'Das 1. Training', 'Practice 2': 'Das 2. Training' },
    titel: (vt, wie) => `${vt} ist vorbei: ${wie} war am schnellsten`,
    tot: (wanneer) => `Deine Top 10 kannst du noch bis ${wanneer} ändern.`,
    totSessie: { sprint: 'Deine Top 10 kannst du noch bis zum Start des Sprints ändern.',
      quali: 'Deine Top 10 kannst du noch bis zum Start des Qualifyings ändern.',
      race: 'Deine Top 10 kannst du noch bis zum Start des Rennens ändern.' },
  },
  fr: {
    vt: { 'Practice 1': 'EL1', 'Practice 2': 'EL2' },
    titel: (vt, wie) => `${vt} terminés : ${wie} a été le plus rapide`,
    tot: (wanneer) => `Votre top 10 reste modifiable jusqu’à ${wanneer}.`,
    totSessie: { sprint: 'Votre top 10 reste modifiable jusqu’au départ du sprint.',
      quali: 'Votre top 10 reste modifiable jusqu’au début des qualifications.',
      race: 'Votre top 10 reste modifiable jusqu’au départ de la course.' },
  },
  es: {
    vt: { 'Practice 1': 'Libres 1', 'Practice 2': 'Libres 2' },
    titel: (vt, wie) => `${vt}: ${wie} fue el más rápido`,
    tot: (wanneer) => `Tu top 10 sigue abierto hasta el ${wanneer}.`,
    totSessie: { sprint: 'Tu top 10 sigue abierto hasta que empiece el sprint.',
      quali: 'Tu top 10 sigue abierto hasta que empiece la clasificación.',
      race: 'Tu top 10 sigue abierto hasta que empiece la carrera.' },
  },
  it: {
    vt: { 'Practice 1': 'PL1', 'Practice 2': 'PL2' },
    titel: (vt, wie) => `${vt}: ${wie} il più veloce`,
    tot: (wanneer) => `Puoi cambiare la tua top 10 fino a ${wanneer}.`,
    totSessie: { sprint: 'Puoi cambiare la tua top 10 fino all’inizio della sprint.',
      quali: 'Puoi cambiare la tua top 10 fino all’inizio delle qualifiche.',
      race: 'Puoi cambiare la tua top 10 fino all’inizio della gara.' },
  },
  pt: {
    vt: { 'Practice 1': 'TL1', 'Practice 2': 'TL2' },
    titel: (vt, wie) => `${vt}: ${wie} foi o mais rápido`,
    tot: (wanneer) => `Seu top 10 fica aberto até ${wanneer}.`,
    totSessie: { sprint: 'Seu top 10 fica aberto até o início da sprint.',
      quali: 'Seu top 10 fica aberto até o início da classificação.',
      race: 'Seu top 10 fica aberto até o início da corrida.' },
  },
};
export const trainingZinnen = (taal) => ZINNEN[taal] ?? ZINNEN.nl;
const LOCALE = { nl: 'nl-NL', en: 'en-GB', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', it: 'it-IT', pt: 'pt-BR' };

// "Max VERSTAPPEN" (zo geeft OpenF1 de naam) wordt "Verstappen", net als
// achternaam() in de app.
export function achternaam(naam, code = '') {
  const delen = String(naam ?? '').trim().split(/\s+/).filter(Boolean);
  const i = delen.findIndex((w) => w.length > 1 && w === w.toUpperCase() && /\p{L}/u.test(w));
  const stuk = i >= 0 ? delen.slice(i) : delen.slice(-1);
  return stuk.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || code;
}

// De deadline in de tijd van het toestel: "zaterdag 16:00". Zonder (geldige)
// tijdzone null, en dan noemt de melding de sessie.
export function deadlineTekst(iso, taal, tijdzone) {
  if (!tijdzone) return null;
  try {
    const d = new Date(iso);
    const locale = LOCALE[taal] ?? LOCALE.nl;
    const dag = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: tijdzone }).format(d);
    const tijd = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      timeZone: tijdzone }).format(d);
    return `${dag} ${tijd}`;
  } catch {
    return null;
  }
}

/**
 * Het weekend waarover er een trainingsmelding kan, of null. Apart, zodat de
 * sync de abonnementen pas ophaalt als er iets te melden valt.
 */
export function trainingNieuws({ races = [], nu = Date.now() } = {}) {
  for (const race of races) {
    if (race.afgelast) continue;
    const naam = sleuteltraining(race);
    const training = (race.vrije_trainingen ?? []).find((t) => t?.naam === naam && t.top?.length);
    if (!training) continue;
    // Er moet nog iets open zijn, met minstens een uur te gaan.
    const open = SESSIEVOLGORDE.some((welk) => {
      const iso = race[SESSIES[welk].deadline];
      return iso && Date.parse(iso) - nu > TRAINING_MARGE_MIN * 60e3;
    });
    if (!open) continue;
    return { race, training, tag: `training:${race.id}` };
  }
  return null;
}

/**
 * @param races        de races van dit seizoen, met races.vrije_trainingen
 * @param abonnementen rijen uit push_abonnementen
 * @param poulevragen  rijen {pool_id, question_id}; een poule zonder rijen doet alles
 * @param nu           tijdstip in ms
 */
export function wieKrijgtEenTraining({ races = [], abonnementen = [], poulevragen = [],
                                       nu = Date.now() } = {}) {
  const nieuws = trainingNieuws({ races, nu });
  if (!nieuws) return [];
  const { race, training, tag } = nieuws;
  const snelste = training.top.find((x) => Number(x.plek) === 1) ?? training.top[0];
  const wie = achternaam(snelste?.naam, snelste?.code);

  const perPoule = new Map();
  for (const r of poulevragen) {
    if (!perPoule.has(r.pool_id)) perPoule.set(r.pool_id, new Set());
    perPoule.get(r.pool_id).add(r.question_id);
  }
  // De eerste top 10 van dit weekend die deze poule speelt en die nog open is.
  const volgende = (poolId) => {
    const set = perPoule.get(poolId);
    for (const welk of SESSIEVOLGORDE) {
      const iso = race[SESSIES[welk].deadline];
      if (!iso || Date.parse(iso) - nu <= TRAINING_MARGE_MIN * 60e3) continue;
      if (!set || set.has(SESSIES[welk].vraag)) return { welk, iso };
    }
    return null;
  };

  const uit = [];
  for (const ab of abonnementen) {
    // Uitgezet onder Profiel. Een rij zonder de kolom (een oude database) telt als aan.
    if (ab.meld_training === false) continue;
    if (ab.training_laatst === tag) continue;
    const deadline = volgende(ab.pool_id);
    if (!deadline) continue;
    const z = trainingZinnen(ab.taal);
    const wanneer = deadlineTekst(deadline.iso, ab.taal, ab.tijdzone);
    uit.push({
      abonnement: ab,
      tag,
      bericht: {
        titel: z.titel(z.vt[training.naam], wie),
        tekst: wanneer ? z.tot(wanneer) : z.totSessie[deadline.welk],
        tag,
      },
    });
  }
  return uit;
}
