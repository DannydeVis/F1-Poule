// Meldingen aanzetten op je toestel.
//
// De pushdienst zelf komt hier niet aan te pas — dat kan niet in een
// testbrowser, en het rekenwerk eromheen staat in test/push.test.mjs en
// test/herinneringen.test.mjs. Wat híér moet kloppen is het scherm: dat het
// aanbod er niet staat als het niet kan, dat een weigering uitgelegd wordt in
// plaats van stil te blijven, en dat aanzetten een rij oplevert die de sync
// kan lezen.
//
// En één ding dat niet over meldingen gaat maar er wel aan hangt: sw.js mag
// geen fetch-handler hebben. Dat is de reden dat deze app jarenlang geen
// service worker had, en het is met één regel weer stuk te maken.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, startPagina, meedoen, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('meldingen');

// ---- eerst het bestand zelf, zonder browser ------------------------------
const sw = readFileSync(join(wortel, 'sw.js'), 'utf8');
check('sw.js onderschept geen verzoeken',
  !/addEventListener\(\s*['"]fetch['"]/.test(sw),
  'er staat een fetch-handler in sw.js — die kan een oude stand tonen alsof hij klopt');
check('en cachet niets', !/caches\./.test(sw));
check('maar luistert wel naar push', /addEventListener\(\s*['"]push['"]/.test(sw));
check('en naar een tik op de melding',
  /addEventListener\(\s*['"]notificationclick['"]/.test(sw));

// ---- zonder VAPID-sleutel biedt de app het niet aan ----------------------
// Zo staat het in de repo: VAPID_PUBLIEK is leeg tot iemand een sleutelpaar
// maakt. Dan hoort er geen knop te zijn die toch niets doet.
{
  const { page, jsFouten, stoppen } = await startPagina();
  await meedoen(page);
  await page.click('[data-weergave="profiel"]');
  await page.waitForSelector('#app');
  await page.waitForTimeout(150);
  check('zonder ingestelde sleutel staat er geen aanbod voor meldingen',
    (await page.$('#meldingAan')) === null && (await page.$('#meldingUit')) === null);
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- met een sleutel, en toestemming geweigerd ---------------------------
const METSLEUTEL = (bron) => bron.replace(
  "const VAPID_PUBLIEK = '';",
  "const VAPID_PUBLIEK = 'BH5WKgOsOKGNJfEDcwTQxDETF_yim8P_gL4pfUy2MmZR3zHIcKyhp0el0BP8udhSNdt3P1N1hIxHVq2yU1V5rMM';");

{
  const bron = readFileSync(join(wortel, 'index.html'), 'utf8');
  const aangepast = METSLEUTEL(bron);
  if (aangepast === bron) throw new Error('VAPID_PUBLIEK staat niet meer leeg in index.html');
  const pad = join(process.env.TMPDIR ?? '/tmp', `poule-push-${process.pid}.html`);
  const { writeFileSync } = await import('node:fs');
  writeFileSync(pad, aangepast);

  const { page, jsFouten, stoppen } = await startPagina({ indexPad: pad });
  // Meldingen weigeren, zoals een browser dat onthoudt.
  await page.context().clearPermissions();
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'permission', { get: () => 'denied' });
  });
  await meedoen(page);
  await page.click('[data-weergave="profiel"]');
  await page.waitForFunction(() => document.body.textContent.includes('herinneringen'));
  const tekst = (await page.textContent('#app')).replace(/\s+/g, ' ');
  check('een geweigerde toestemming wordt uitgelegd',
    tekst.includes('geblokkeerd'), tekst.match(/herinneringen[^.]*\./)?.[0] ?? tekst.slice(0, 120));
  check('en er staat geen knop die toch niets zou doen',
    (await page.$('#meldingAan')) === null);
  check('met een verwijzing naar de agenda, die wél werkt zonder meldingsrecht',
    tekst.includes('agenda'));
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- met een sleutel en toestemming: de knop staat er --------------------
{
  const bron = readFileSync(join(wortel, 'index.html'), 'utf8');
  const pad = join(process.env.TMPDIR ?? '/tmp', `poule-push2-${process.pid}.html`);
  const { writeFileSync } = await import('node:fs');
  writeFileSync(pad, METSLEUTEL(bron));

  const { page, jsFouten, stoppen } = await startPagina({ indexPad: pad });
  // Een testbrowser meldt 'denied' zolang niemand ja gezegd heeft, en
  // grantPermissions verandert daar niets aan. Dus wordt hier hetzelfde
  // gedaan als hierboven, maar dan andersom: de toestand van de browser
  // wordt nagebootst, zodat de tak van de app die erop reageert getest wordt.
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
  });
  await page.reload();
  await meedoen(page);
  await page.click('[data-weergave="profiel"]');
  await page.waitForFunction(() => !!document.querySelector('#meldingAan'));
  check('met een ingestelde sleutel staat het aanbod er wel',
    (await page.$('#meldingAan')) !== null);
  const tekst = (await page.textContent('#app')).replace(/\s+/g, ' ');
  check('met de iPhone-voorwaarde erbij, want daar geldt hij echt',
    tekst.includes('beginscherm'), tekst.match(/Krijg een seintje[^.]*\.[^.]*\./)?.[0] ?? '');
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
