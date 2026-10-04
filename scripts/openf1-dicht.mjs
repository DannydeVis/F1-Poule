// OpenF1 is gratis, behalve tijdens een sessie: van een half uur voor de start
// tot een half uur na het einde mag alleen een betalend account erin, en krijgt
// de rest een 401 (https://openf1.org/auth.html). Gezien op zondag 4 oktober
// 2026, rond de race in Kuala Lumpur: de sync en de racepagina's werden rood,
// en een uur later ging alles weer gewoon.
//
// Een sessie is altijd op vrijdag, zaterdag of zondag (UTC). Een 401 op die
// dagen betekent dus: even wachten, de volgende run haalt het op. Een 401 op
// een andere dag is iets anders (OpenF1 wil voortaan altijd een sleutel?), en
// dan moet een run zakken zodat iemand het ziet.
//
// Gebruikt door scripts/sync.mjs, scripts/circuits.mjs en scripts/racedata.mjs.

export const SESSIEDAGEN = [5, 6, 0];

export const UITLEG = 'OpenF1 is tijdens een sessie alleen open voor betalende accounts; de volgende run haalt het op';

export const opSessiedag = (moment) => SESSIEDAGEN.includes(new Date(moment).getUTCDay());

// De klok. Voor de test van buiten te zetten met NU (een ISO-tijdstip).
export const nu = () => (process.env.NU ? new Date(process.env.NU) : new Date());

export class OpenF1Dicht extends Error {
  constructor(pad) {
    super(`OpenF1 gaf 401 op ${pad}`);
    this.name = 'OpenF1Dicht';
  }
}

// Mag deze fout de run groen laten eindigen?
export const vanwegeSessie = (fout, moment = nu()) => fout instanceof OpenF1Dicht && opSessiedag(moment);
