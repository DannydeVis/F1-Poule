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
  const bron = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
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
  // Op #app wachten, niet op de body: daar staat ook het script van de app in,
  // met het woord "herinneringen" erin, en dan wacht dit nergens op.
  await page.waitForFunction(() => document.querySelector('#app')?.textContent.includes('herinneringen'));
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
  const bron = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
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

// ---- aanzetten levert een rij op, in de taal van dit scherm --------------
// Een echte pushManager.subscribe() kan niet in een testbrowser: daar hoort
// een pushdienst aan te pas te komen. Wat hier nagebootst wordt is dus precies
// die dienst, en niet de app — de app doorloopt gewoon zijn eigen weg.
//
// Wat er te controleren valt is wat de sync straks leest. Die draait in een
// GitHub-runner zonder browser en kan de taal nergens anders vandaan halen dan
// uit deze rij, dus als hij hier niet in staat komt elke melding in het
// Nederlands aan, ook bij wie de app in het Engels gebruikt.
{
  const bron = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
  const pad = join(process.env.TMPDIR ?? '/tmp', `poule-push3-${process.pid}.html`);
  const { writeFileSync } = await import('node:fs');
  writeFileSync(pad, METSLEUTEL(bron));

  const { page, jsFouten, stoppen } = await startPagina({ indexPad: pad });
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
    Notification.requestPermission = async () => 'granted';
    const ab = {
      endpoint: 'https://push.voorbeeld/abc',
      toJSON: () => ({ endpoint: 'https://push.voorbeeld/abc',
                       keys: { p256dh: 'p256', auth: 'auth' } }),
      unsubscribe: async () => true,
    };
    let aangemeld = null;
    const reg = {
      pushManager: {
        subscribe: async () => { aangemeld = ab; return ab; },
        getSubscription: async () => aangemeld,
      },
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      get: () => ({ register: async () => reg, ready: Promise.resolve(reg),
                    getRegistration: async () => reg }),
    });
  });
  await page.reload();
  await meedoen(page);
  await page.click('[data-weergave="profiel"]');
  await page.waitForSelector('#meldingAan');
  await page.click('#meldingAan');
  await page.waitForSelector('#meldingUit');

  const rijen = () => page.evaluate(() => globalThis.__db.push_abonnementen);
  const na = await rijen();
  check('aanzetten schrijft één abonnement weg', na.length === 1, JSON.stringify(na));
  check('met het endpoint, de sleutels en de speler erbij',
    na[0]?.endpoint === 'https://push.voorbeeld/abc' && na[0]?.p256dh === 'p256'
      && !!na[0]?.member_id && !!na[0]?.pool_id, JSON.stringify(na[0]));
  check('en met de taal van dit scherm erbij', na[0]?.taal === 'nl', na[0]?.taal);

  // Van taal wisselen terwijl de meldingen aanstaan. De sync hoort daarna de
  // nieuwe taal te lezen, anders blijft de melding in het Nederlands komen.
  await page.click('[data-taal="en"]');
  await page.waitForFunction(
    () => globalThis.__db.push_abonnementen[0]?.taal === 'en', null, { timeout: 5000 })
    .catch(() => {});
  const naWissel = await rijen();
  check('van taal wisselen werkt het abonnement bij', naWissel[0]?.taal === 'en',
    JSON.stringify(naWissel[0]));
  check('en er komt geen tweede rij bij', naWissel.length === 1);

  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
