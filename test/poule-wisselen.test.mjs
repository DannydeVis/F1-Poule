// "Het verwisselen naar een andere poule zit ver weg en is niet duidelijk."
//
// De knop stond eerst onderaan het Races- én het Poule-tabblad, tussen een
// stapel andere blokken — nooit op de Standpagina, en nergens zichtbaar
// zolang je een racescherm open had staan. Wie in een tweede poule speelt
// moest daar dus specifiek naar op zoek.
//
// De oplossing zit niet in een nieuwe knop maar in een nieuwe plek: dezelfde
// #anderePoule, verhuisd naar de vaste zijbalk (toonApp()), die op elk
// tabblad en in elk racescherm blijft staan. Deze test controleert dat "elk"
// ook echt "elk" is, en dat de knop nog steeds hetzelfde doet als voorheen.

import { maakControle, startPagina, meedoen, openRace } from './hulp.mjs';

const { check, afronden } = maakControle('andere poule: overal bereikbaar');
const { page, jsFouten, stoppen } = await startPagina();

await meedoen(page);

check('op het racesoverzicht staat de knop in de zijbalk',
  (await page.$('.merk #anderePoule')) !== null);

// Danny (8 oktober): "Rechtsboven staat wissel. Beetje onduidelijk." Nu is
// de poulenaam zelf de knop, met een pijltje erachter, zoals een keuzelijst.
// Op een telefoon is dat de naam bovenin; op een breed scherm een eigen
// regel met een rand.
const kop = async () => page.$eval('#anderePoule', (b) => ({
  naam: b.querySelector('.merkpoule')?.textContent.trim(),
  pijl: !!b.querySelector('svg path'),
  label: b.getAttribute('aria-label'),
  zichtbaar: b.getBoundingClientRect().width > 0 && getComputedStyle(b.querySelector('.merkpoule')).display !== 'none',
  past: b.querySelector('.merkpoule').scrollWidth <= b.querySelector('.merkpoule').clientWidth,
}));
for (const breedte of [390, 1280]) {
  await page.setViewportSize({ width: breedte, height: 800 });
  await page.waitForTimeout(80);
  const k = await kop();
  check(`op ${breedte} pixel is de poulenaam zelf de knop, met een pijltje`,
    k.naam === 'Vrijdagmiddagpoule' && k.pijl && k.zichtbaar && k.past, JSON.stringify(k));
  check(`en zegt zijn label wat hij doet (${breedte})`,
    k.label === 'Wissel van poule (nu Vrijdagmiddagpoule)', k.label);
}
await page.setViewportSize({ width: 390, height: 844 });

await page.click('[data-weergave="stand"]');
await page.waitForSelector('[data-weergave="stand"][aria-current="true"]');
check('en ook op de standpagina, die hem eerder helemaal niet had',
  (await page.$('.merk #anderePoule')) !== null);

await page.click('[data-weergave="poule"]');
await page.waitForSelector('.speler.zelf');
check('en op de poulepagina', (await page.$('.merk #anderePoule')) !== null);

await page.click('[data-weergave="races"]');
await openRace(page, 'Melbourne');
check('en zelfs middenin een racescherm', (await page.$('.merk #anderePoule')) !== null);

// --- de knop doet nog steeds wat hij deed -----------------------------------
await page.click('#anderePoule');
await page.waitForSelector('#code');
check('klikken brengt je terug naar het codescherm', (await page.$('#code')) !== null);

const bekend = await page.evaluate(() => JSON.parse(localStorage.getItem('poule:poules') ?? '[]'));
check('de poule zelf blijft in het lijstje van bekende poules staan',
  bekend.some((p) => p.join_code === 'RTM026'), JSON.stringify(bekend));

// Danny (8 oktober): "maak hier ook een kruisje zodat je kan terug gaan".
// Wie via de poulenaam op het beginscherm komt, ziet rechtsboven een kruisje
// dat terugbrengt naar de poule waar hij was.
const kruis = await page.$('#terugNaarPoule');
check('op het beginscherm staat een kruisje terug naar je poule',
  kruis !== null && (await kruis.getAttribute('aria-label')) === 'Terug naar Vrijdagmiddagpoule',
  kruis ? await kruis.getAttribute('aria-label') : '(geen kruisje)');
const maat = await kruis?.boundingBox();
check('van 44 bij 44, om met je duim te raken',
  Math.round(maat?.width) === 44 && Math.round(maat?.height) === 44, JSON.stringify(maat));
const passen = [];
for (const breedte of [390, 360]) {
  await page.setViewportSize({ width: breedte, height: 800 });
  await page.waitForTimeout(80);
  passen.push([breedte, await page.$eval('.toegang .merk .naam', (n) => n.scrollWidth <= n.clientWidth)]);
}
await page.setViewportSize({ width: 390, height: 844 });
check('"Predict the Race" past er met het kruisje nog naast, ook op 360 pixel',
  passen.every(([, ja]) => ja), JSON.stringify(passen));
await kruis?.click();
await page.waitForSelector('[data-race]');
check('tikken brengt je terug in je poule, zonder kiezen of code',
  (await page.textContent('.merk #anderePoule')).includes('Vrijdagmiddagpoule'));

// Wie de app gewoon opent, kwam nergens vandaan: dan geen kruisje.
await page.evaluate(() => localStorage.removeItem('poule:laatste'));
await page.reload();
await page.waitForSelector('#code');
check('wie de app opent zonder uit een poule te komen, ziet geen kruisje',
  (await page.$('#terugNaarPoule')) === null);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
