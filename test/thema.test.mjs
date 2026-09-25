// Licht of donker, zelf te kiezen met de zon/maan in de kop.
//
// Aanleiding: "Zet hier een klein zonnetje dat mensen kunnen schakelen tussen
// dark en lichte modus", met een rondje naast de knop Wissel.
//
// Wat hier vastligt:
//   1. Naast Wissel staat een knop van 44 bij 44: in het donker een zon (naar
//      licht), in het licht een maan (naar donker), met een naam voor wie niet
//      kan zien welk pictogram het is.
//   2. Tikken wisselt meteen, zonder dat het scherm opnieuw laadt, en de app
//      onthoudt het: na herladen staat hij nog zo, al vóór de eerste verf.
//   3. Kies je wat het toestel toch al doet, dan vergeet de app de keuze en
//      volgt hij het toestel weer.
//   4. Zolang je niets koos volgt de knop het toestel als dat wisselt.
//   5. De vraag over Google Analytics kleurt mee.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('licht of donker');
const LICHT = 'rgb(242, 241, 238)', DONKER = 'rgb(11, 11, 12)';
const achtergrond = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const keuze = (page) => page.evaluate(() => localStorage.getItem('poule:thema'));
const knop = (page) => page.$eval('#themaknop', (b) => {
  const r = b.getBoundingClientRect();
  const wissel = document.querySelector('#anderePoule').getBoundingClientRect();
  return { naam: b.getAttribute('aria-label'), b: Math.round(r.width), h: Math.round(r.height),
           zon: !!b.querySelector('circle'), naastWissel: Math.abs(r.top - wissel.top) < 2 && r.right <= wissel.left };
}).catch(() => null);

// ---- een toestel in het donker ---------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await meedoen(page);
  const k = await knop(page);
  check('naast Wissel staat een knop van 44 bij 44', k?.b === 44 && k.h >= 44 && k.naastWissel, JSON.stringify(k));
  check('in het donker een zon, om naar licht te gaan', k?.zon && k.naam === 'Lichte modus', JSON.stringify(k));
  check('het toestel staat donker, dus de app ook', (await achtergrond(page)) === DONKER, await achtergrond(page));
  // De knop mag de poulenaam niet wegduwen: "Vrijdagmiddagpoule" paste er
  // vóór de knop op elke gangbare telefoon naast, en dat hoort zo te blijven.
  // Op een breed scherm staat hij op de tweede regel, naast de ondertitel.
  {
    const past = [];
    for (const breedte of [430, 390, 375, 360, 1280]) {
      await page.setViewportSize({ width: breedte, height: 800 });
      await page.waitForTimeout(80);
      past.push([breedte, await page.evaluate(() => {
        const n = document.querySelector(innerWidth >= 960 ? '.merknaam' : '.merkpoule');
        return n.scrollWidth <= n.clientWidth;
      })]);
    }
    check('de poulenaam (en op een breed scherm "Predict the Race") past er nog helemaal naast',
      past.every(([, ja]) => ja), JSON.stringify(past));
    await page.setViewportSize({ width: 390, height: 844 });
  }

  await page.evaluate(() => { window.__nietHerladen = true; });
  await page.click('#themaknop');
  await page.waitForTimeout(250);
  check('tikken maakt de app meteen licht', (await achtergrond(page)) === LICHT, await achtergrond(page));
  check('zonder dat het scherm opnieuw laadt', await page.evaluate(() => window.__nietHerladen === true));
  check('en de knop is nu een maan', (await knop(page))?.naam === 'Donkere modus' && !(await knop(page)).zon,
    JSON.stringify(await knop(page)));
  check('de keuze wordt onthouden', (await keuze(page)) === 'licht', String(await keuze(page)));

  // Na herladen: licht, en al in de allereerste verf (het scriptje in <head>).
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      window.__eersteThema = document.documentElement.dataset.thema ?? null;
    }, { once: true });
  });
  await page.reload();
  await page.waitForSelector('[data-race]');
  check('na herladen staat hij nog op licht', (await achtergrond(page)) === LICHT, await achtergrond(page));
  check('en dat staat er al vóór de app tekent', (await page.evaluate(() => window.__eersteThema)) === 'licht',
    String(await page.evaluate(() => window.__eersteThema)));
  check('formulieren en schuifbalken gaan mee (color-scheme)',
    (await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)) === 'light');

  // Terug naar donker, wat het toestel ook doet: dan volgt de app het toestel weer.
  await page.click('#themaknop');
  await page.waitForTimeout(250);
  check('terug naar donker', (await achtergrond(page)) === DONKER, await achtergrond(page));
  check('en omdat het toestel ook donker is, volgt de app het toestel weer',
    (await keuze(page)) === null && (await page.evaluate(() => document.documentElement.dataset.thema)) === undefined,
    String(await keuze(page)));
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForTimeout(250);
  check('dus als het toestel licht wordt, wordt de app ook licht', (await achtergrond(page)) === LICHT,
    await achtergrond(page));
  check('en de knop wordt een maan', (await knop(page))?.naam === 'Donkere modus', JSON.stringify(await knop(page)));
  check('geen JavaScript-fouten (donker toestel)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- een toestel in het licht ----------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'light' });
  await meedoen(page);
  check('in het licht een maan, om naar donker te gaan', (await knop(page))?.naam === 'Donkere modus',
    JSON.stringify(await knop(page)));
  await page.click('#themaknop');
  await page.waitForTimeout(250);
  check('tikken maakt de app donker, ook al is het toestel licht', (await achtergrond(page)) === DONKER,
    await achtergrond(page));
  check('en dat wordt onthouden', (await keuze(page)) === 'donker', String(await keuze(page)));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForTimeout(250);
  check('een eigen keuze blijft staan als het toestel wisselt', (await achtergrond(page)) === DONKER,
    await achtergrond(page));

  // De vraag over Google Analytics, in het donker dat je zelf koos.
  await page.evaluate(() => { localStorage.removeItem('ptr:analytics'); window.ptrToestemming?.vraag(); });
  await page.waitForSelector('#toestemming');
  check('de vraag over Google Analytics kleurt mee',
    (await page.$eval('#toestemming', (e) => getComputedStyle(e).backgroundColor)) === 'rgb(21, 22, 26)',
    await page.$eval('#toestemming', (e) => getComputedStyle(e).backgroundColor));
  check('geen JavaScript-fouten (licht toestel)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- in het Engels -------------------------------------------------------------
{
  const { page, stoppen } = await startPagina({ taal: 'en' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await meedoen(page).catch(() => {});
  await page.waitForSelector('#themaknop').catch(() => {});
  check('in het Engels heet hij Light mode', (await knop(page))?.naam === 'Light mode', JSON.stringify(await knop(page)));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
