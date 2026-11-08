// Namen en codes niet laten vertalen (8 november).
//
// Een speler met Chrome op "Engels altijd naar het Frans vertalen" mailde een
// schermafdruk van het invulscherm: NOR stond er als NI, ANT als FOURMI, VER
// als LOIN, HAD als AVAIT, HAM als JAMBON en LAW als LOI. Google Translate
// pakt de coureurscodes als woorden. Wat hier vastligt:
//   1. Op het invulscherm staat elke coureurscode en elke coureursnaam binnen
//      translate="no", ook na het kiezen (de lijst wordt dan opnieuw getekend).
//   2. In de stand en op het racescherm de namen van spelers en de poule.
//   3. Gewone teksten van de app (knoppen, uitleg) blijven vertaalbaar: de
//      browser mag de rest gewoon vertalen voor wie dat wil.

import { maakControle, startPagina, meedoen, openRace, kiesTien } from './hulp.mjs';

const { check, afronden } = maakControle('namen en codes niet vertalen');
const onbeschermd = (page, kies) => page.$$eval(kies, (els) => els
  .filter((el) => el.textContent.trim() && !el.closest('[translate="no"]'))
  .map((el) => el.textContent.trim()));
const beschermd = (page, kies) => page.$eval(kies, (el) => !!el.closest('[translate="no"]'));

const { page, jsFouten, stoppen } = await startPagina();
await meedoen(page);
await openRace(page, 'Melbourne');
await kiesTien(page);
const codes = await page.$$eval('#app .code', (els) => els.length);
check('op het invulscherm staan coureurscodes', codes >= 10, String(codes));
check('elke code staat binnen translate="no", ook na het kiezen',
  (await onbeschermd(page, '#app .code')).length === 0, (await onbeschermd(page, '#app .code')).join(', '));
check('en de namen van de coureurs ook',
  (await onbeschermd(page, '#app .who small, #app .drnaam')).length === 0,
  (await onbeschermd(page, '#app .who small, #app .drnaam')).join(', '));
const knop = await page.$('#app button:not([data-race])');
check('een gewone knop blijft vertaalbaar', !!knop && !(await knop.evaluate((el) => !!el.closest('[translate="no"]'))));

await page.click('[data-weergave="stand"]');
await page.waitForSelector('#app .nm');
check('in de stand staan de namen van spelers binnen translate="no"',
  (await onbeschermd(page, '#app .nm')).length === 0, (await onbeschermd(page, '#app .nm')).join(', '));
check('en de naam van de poule', await beschermd(page, '#app .merkpoule'));

check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
