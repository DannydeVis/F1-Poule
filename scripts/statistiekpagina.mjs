/**
 * De datapagina "Hoe voorspelbaar was F1 in 2026?" (zoekplan GEO 3.1), in de
 * vorm van de pagina's in site/paginas.mjs, gebouwd uit
 * site/data/statistiek-2026.json (scripts/statistiek.mjs).
 *
 * Staat als concept klaar: zolang STATISTIEK_LIVE uit staat, maakt de
 * generator er niets van, en staat hij dus ook niet in de sitemap. Aanzetten
 * na de finale (BEDIENING, "De datapagina"): de laatste run van de workflow
 * "Circuitcijfers", drie races met de hand nalopen, dan STATISTIEK_LIVE op
 * true. Met PTR_CONCEPT=1 maakt de generator hem toch, om hem te bekijken;
 * test/statistiekpagina.test.mjs doet dat in een kopie van de repo.
 *
 * Elk getal komt uit het bestand; de teksten noemen geen getal van zichzelf.
 * Een zin met de belangrijkste uitkomst staat er zo dat hij zonder de rest te
 * begrijpen is, met het getal, het jaar en de bron (zoekplan AEO).
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATISTIEK_JAAR, BESTAND, csv } from './statistiek.mjs';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
export const STATISTIEK_LIVE = false;
export const CSV_PAD = `data/voorspelbaarheid-${STATISTIEK_JAAR}.csv`;

const vul = (tekst, v) => String(tekst).replace(/\{(\w+)\}/g, (heel, k) => (k in v ? String(v[k]) : heel));
const getal = (code, x) => new Intl.NumberFormat(code, { maximumFractionDigits: 1 }).format(x);
const opsom = (code, xs) => new Intl.ListFormat(code, { type: 'conjunction' }).format(xs);
// "Max VERSTAPPEN" uit OpenF1 wordt "Max Verstappen".
const netjes = (naam) => (naam ? naam.replace(/\b([A-ZÀ-Ý])([A-ZÀ-Ý'-]+)\b/g, (_, a, b) => a + b.toLowerCase()) : naam);

const T = {
  nl: {
    pad: 'f1-{jaar}-voorspelbaarheid',
    titel: 'Hoe voorspelbaar was F1 in {jaar}? | Predict the Race',
    omschrijving: 'Hoeveel punten een simpele voorspelling in {jaar} opleverde: de kwalificatie, de WK-stand, de vorige race of een willekeurige top 10. Per race, met de data.',
    kop: 'Hoe voorspelbaar was F1 in {jaar}?',
    kort: 'Wie in {jaar} bij elke race de uitslag van de kwalificatie als voorspelling voor de top 10 invulde, scoorde gemiddeld {kwali} van de {max} punten per race (Predict the Race, op basis van OpenF1, {gereden} races). De WK-stand vóór de race leverde gemiddeld {stand} op, de uitslag van de vorige race {vorige}, en een willekeurige top 10 {willekeurig}.',
    soorten: { kwalificatie: 'De uitslag van de kwalificatie', stand: 'De WK-stand vóór de race', vorige: 'De uitslag van de vorige race', willekeurig: 'Een willekeurige top 10' },
    gemiddeldVraag: 'Welke simpele voorspelling scoorde het best in {jaar}?',
    gemiddeldKort: 'In {jaar} scoorde de uitslag van de kwalificatie het best als voorspelling voor de race: gemiddeld {kwali} van de {max} punten. Dat is {keer} keer zoveel als een willekeurige top 10, die gemiddeld {willekeurig} punten opleverde.',
    gemiddeldBijschrift: 'Gemiddelde punten per race voor de top 10, {jaar}',
    gemiddeldKop: ['Voorspelling', 'Gemiddeld', 'Races'],
    perRaceVraag: 'Hoeveel punten leverde elke voorspelling per race op?',
    perRaceKort: 'Per race van {jaar} de punten van elke voorspelling voor de top 10 van de race, van de {max}. De eerste race had nog geen WK-stand en geen vorige race.',
    perRaceBijschrift: 'Punten per race voor de top 10, {jaar}',
    perRaceKop: ['Race', 'Kwalificatie', 'WK-stand', 'Vorige race', 'Willekeurig'],
    besteVraag: 'Welke races waren het voorspelbaarst en het minst voorspelbaar?',
    besteKort: 'Het voorspelbaarst in {jaar} was {best}: de kwalificatie leverde daar {bestPunten} van de {max} punten op. Het minst voorspelbaar was {slechtst}, met {slechtstPunten} punten.',
    besteBijschrift: 'De voorspelbaarste en minst voorspelbare races van {jaar}, op de kwalificatie',
    besteKop: ['Race', 'Punten'],
    besteLijst: 'Voorspelbaarst: {lijst}.',
    slechtsteLijst: 'Minst voorspelbaar: {lijst}.',
    poleVraag: 'Hoe vaak won wie op pole stond in {jaar}?',
    poleKort: 'In {jaar} won wie op pole stond {gewonnen} van de {races} races ({deel}).',
    methodeVraag: 'Hoe is dit uitgerekend?',
    methodeKort: 'Met de puntentelling van Predict the Race voor de top 10: 5 punten voor een coureur op de goede plek, 3 als hij één plek ernaast eindigde en 1 bij twee plekken ernaast. Het maximum is {max} punten per race.',
    methodeLijst: [
      'De uitslag van de kwalificatie: de volgorde van de kwalificatie, als voorspelling voor de race.',
      'De WK-stand vóór de race: de volgorde van het kampioenschap na de races en sprints ervoor, met de gewone punten (25, 18, 15 tot en met 1 voor de race, 8 tot en met 1 voor de sprint). Bij gelijke punten staat wie vaker hoger eindigde voor.',
      'De uitslag van de vorige race: de top 10 van de race ervoor.',
      'Een willekeurige top 10, zoals automatisch invullen in de app doet: niet nagespeeld, maar exact uitgerekend. Elke coureur staat met dezelfde kans op elke plek.',
    ],
    beperkingVraag: 'Wat zit er niet in?',
    beperkingKort: 'De kwalificatie is niet de startopstelling: straffen na de kwalificatie zitten er niet in. Afgelaste races tellen niet mee{afgelast}. De uitslagen komen van OpenF1, net als de punten in de app.',
    afgelast: ' ({lijst})',
    dataVraag: 'Kan ik de data gebruiken?',
    dataKort: 'Ja. Alle cijfers per race staan in een CSV-bestand. De uitslagen komen van OpenF1 en vallen onder CC BY-NC-SA 4.0; noem bij gebruik Predict the Race en OpenF1 als bron.',
    dataKnop: 'De data als CSV',
    datasetNaam: 'Hoe voorspelbaar was F1 in {jaar}: punten per race voor vier simpele voorspellingen',
  },
  en: {
    pad: 'en/how-predictable-was-f1-{jaar}',
    titel: 'How predictable was F1 in {jaar}? | Predict the Race',
    omschrijving: 'How many points a simple prediction scored in {jaar}: qualifying, the standings, the previous race or a random top 10. Per race, with the data.',
    kop: 'How predictable was F1 in {jaar}?',
    kort: 'Anyone who entered the qualifying result as their top 10 prediction for every race in {jaar} scored {kwali} of {max} points per race on average (Predict the Race, based on OpenF1, {gereden} races). The championship standings before the race scored {stand} on average, the previous race result {vorige}, and a random top 10 {willekeurig}.',
    soorten: { kwalificatie: 'The qualifying result', stand: 'The standings before the race', vorige: 'The previous race result', willekeurig: 'A random top 10' },
    gemiddeldVraag: 'Which simple prediction scored best in {jaar}?',
    gemiddeldKort: 'In {jaar} the qualifying result was the best simple prediction for the race: {kwali} of {max} points on average. That is {keer} times as much as a random top 10, which scored {willekeurig} points on average.',
    gemiddeldBijschrift: 'Average points per race for the top 10, {jaar}',
    gemiddeldKop: ['Prediction', 'Average', 'Races'],
    perRaceVraag: 'How many points did each prediction score per race?',
    perRaceKort: 'For every race of {jaar}, the points of each prediction for the race top 10, out of {max}. The first race had no standings and no previous race yet.',
    perRaceBijschrift: 'Points per race for the top 10, {jaar}',
    perRaceKop: ['Race', 'Qualifying', 'Standings', 'Previous race', 'Random'],
    besteVraag: 'Which races were the most and the least predictable?',
    besteKort: 'The most predictable race of {jaar} was {best}: qualifying scored {bestPunten} of {max} points there. The least predictable was {slechtst}, with {slechtstPunten} points.',
    besteBijschrift: 'The most and least predictable races of {jaar}, by qualifying',
    besteKop: ['Race', 'Points'],
    besteLijst: 'Most predictable: {lijst}.',
    slechtsteLijst: 'Least predictable: {lijst}.',
    poleVraag: 'How often did the pole sitter win in {jaar}?',
    poleKort: 'In {jaar} the driver on pole won {gewonnen} of {races} races ({deel}).',
    methodeVraag: 'How was this calculated?',
    methodeKort: 'With the Predict the Race scoring for the top 10: 5 points for a driver in the right place, 3 if he finished one place off and 1 for two places off. The maximum is {max} points per race.',
    methodeLijst: [
      'The qualifying result: the qualifying order, as a prediction for the race.',
      'The standings before the race: the championship order after the races and sprints before it, with the usual points (25, 18, 15 down to 1 for the race, 8 down to 1 for the sprint). On equal points, whoever finished higher more often goes first.',
      'The previous race result: the top 10 of the race before.',
      'A random top 10, as autofill in the app does: not simulated but calculated exactly. Every driver has the same chance of every place.',
    ],
    beperkingVraag: 'What is not included?',
    beperkingKort: 'Qualifying is not the starting grid: penalties after qualifying are not included. Cancelled races do not count{afgelast}. The results come from OpenF1, the same as the points in the app.',
    afgelast: ' ({lijst})',
    dataVraag: 'Can I use the data?',
    dataKort: 'Yes. All figures per race are in a CSV file. The results come from OpenF1 and fall under CC BY-NC-SA 4.0; name Predict the Race and OpenF1 as the source when you use them.',
    dataKnop: 'The data as CSV',
    datasetNaam: 'How predictable was F1 in {jaar}: points per race for four simple predictions',
  },
};

export function leesStatistiek() {
  const pad = join(wortel, BESTAND);
  return existsSync(pad) ? JSON.parse(readFileSync(pad, 'utf8')) : null;
}

/** De pagina uit de data, of null als er niets te laten zien is. */
export function statistiekPagina(data) {
  if (!data?.races?.length || !data.gemiddeld?.kwalificatie || !data.gemiddeld?.willekeurig) return null;
  const jaar = data.jaar;
  const talen = {};
  for (const [code, K] of Object.entries(T)) {
    const g = (s) => (data.gemiddeld[s] ? getal(code, data.gemiddeld[s].gemiddeld) : '-');
    const pad = vul(K.pad, { jaar });
    const terug = '../'.repeat(pad.split('/').length);
    const naam = (r) => r.naam;
    const v = {
      jaar, max: data.max, gereden: data.gereden,
      kwali: g('kwalificatie'), stand: g('stand'), vorige: g('vorige'), willekeurig: g('willekeurig'),
      keer: getal(code, Math.round(10 * data.gemiddeld.kwalificatie.gemiddeld / data.gemiddeld.willekeurig.gemiddeld) / 10),
      best: data.best[0]?.naam, bestPunten: data.best[0]?.punten,
      slechtst: data.slechtst[0]?.naam, slechtstPunten: data.slechtst[0]?.punten,
      gewonnen: data.pole.gewonnen, races: data.pole.races,
      deel: new Intl.NumberFormat(code, { style: 'percent' }).format(data.pole.races ? data.pole.gewonnen / data.pole.races : 0),
      afgelast: data.afgelast.length ? vul(K.afgelast, { lijst: opsom(code, data.afgelast) }) : '',
    };
    const cel = (x) => (x === null || x === undefined ? '-' : getal(code, x));
    const secties = [
      {
        id: code === 'nl' ? 'beste-voorspelling' : 'best-prediction',
        vraag: vul(K.gemiddeldVraag, v),
        kort: vul(K.gemiddeldKort, v),
        tabel: { bijschrift: vul(K.gemiddeldBijschrift, v), kop: K.gemiddeldKop, klasse: 'compact',
          rijen: ['kwalificatie', 'stand', 'vorige', 'willekeurig'].filter((s) => data.gemiddeld[s])
            .map((s) => [K.soorten[s], getal(code, data.gemiddeld[s].gemiddeld), String(data.gemiddeld[s].races)]) },
      },
      {
        id: code === 'nl' ? 'per-race' : 'per-race',
        vraag: vul(K.perRaceVraag, v),
        kort: vul(K.perRaceKort, v),
        tabel: { bijschrift: vul(K.perRaceBijschrift, v), kop: K.perRaceKop, klasse: 'statistiek',
          rijen: data.races.map((r) => [naam(r),
            cel(r.punten.kwalificatie), cel(r.punten.stand), cel(r.punten.vorige), cel(r.punten.willekeurig)]) },
      },
      {
        id: code === 'nl' ? 'voorspelbaarst' : 'most-predictable',
        vraag: vul(K.besteVraag, v),
        kort: vul(K.besteKort, v),
        lijst: [vul(K.besteLijst, { lijst: opsom(code, data.best.map((x) => `${x.naam} (${x.punten})`)) }),
          vul(K.slechtsteLijst, { lijst: opsom(code, data.slechtst.map((x) => `${x.naam} (${x.punten})`)) })],
      },
      { id: 'pole', vraag: vul(K.poleVraag, v), kort: vul(K.poleKort, v) },
      { id: code === 'nl' ? 'methode' : 'method', vraag: vul(K.methodeVraag, v), kort: vul(K.methodeKort, v), lijst: K.methodeLijst },
      { id: code === 'nl' ? 'beperkingen' : 'limitations', vraag: vul(K.beperkingVraag, v), kort: vul(K.beperkingKort, v) },
      { id: 'data', vraag: vul(K.dataVraag, v), kort: vul(K.dataKort, v), knop: { tekst: K.dataKnop, href: `${terug}${CSV_PAD}` } },
    ];
    talen[code] = {
      pad,
      titel: vul(K.titel, v),
      omschrijving: vul(K.omschrijving, v),
      kop: vul(K.kop, v),
      kort: vul(K.kort, v),
      secties,
      faq: [],
      leesOok: [],
      dataset: {
        id: code === 'nl' ? 'per-race' : 'per-race',
        naam: vul(K.datasetNaam, v),
        omschrijving: vul(K.kort, v),
        waarden: [['races', data.gereden], ...['kwalificatie', 'stand', 'vorige', 'willekeurig'].filter((s) => data.gemiddeld[s])
          .map((s) => [T.en.soorten[s], data.gemiddeld[s].gemiddeld]), ['maximum', data.max]],
      },
    };
  }
  return { id: `voorspelbaarheid-${jaar}`, soort: 'data', verwant: ['puntentelling'], talen, csv: { pad: CSV_PAD, inhoud: csv(data) } };
}

const aan = STATISTIEK_LIVE || process.env.PTR_CONCEPT === '1';
const pagina = aan ? statistiekPagina(leesStatistiek()) : null;
export const STATISTIEKPAGINAS = pagina ? [pagina] : [];
