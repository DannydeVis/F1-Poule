// Trekken om te verversen, en vanzelf verversen als je terugkomt.
//
// Danny (12 oktober): "Maak een pull to refresh. Ik moet nu steeds de app
// opnieuw afsluiten en openen voor een refresh." In de app op het beginscherm
// trek je bovenaan naar beneden: de poule wordt opnieuw opgehaald en het
// scherm waar je was opnieuw getekend. Staat er een nieuwe versie online, dan
// herlaadt de pagina. Kom je na meer dan een minuut terug in de app, dan
// gebeurt het vanzelf.
//
// Het vegen gaat met nagemaakte TouchEvents; de "database" is de nabootsing,
// die hier in het geheugen wordt aangepast zodat te zien is of er echt
// opnieuw is opgehaald.

import { maakControle, startPagina, meedoen, openRace, naarLijst } from './hulp.mjs';

const { check, afronden } = maakControle('trekken om te verversen');
const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];

// Een vinger die bovenaan begint en `ver` pixels naar beneden gaat. Geeft wat
// de trekker zei vlak voor het loslaten.
const veeg = (page, ver = 200, kies = '#app') => page.evaluate(({ ver, kies }) => {
  const doel = document.querySelector(kies) ?? document.body;
  const vinger = (y) => new Touch({ identifier: 1, target: doel, clientX: 180, clientY: y });
  doel.dispatchEvent(new TouchEvent('touchstart', { touches: [vinger(100)], bubbles: true }));
  for (let y = 100; y <= 100 + ver; y += 10) {
    doel.dispatchEvent(new TouchEvent('touchmove', { touches: [vinger(y)], bubbles: true }));
  }
  const t = document.querySelector('#trekker');
  const ervoor = { stand: t?.dataset.stand ?? '', tekst: t?.textContent.trim() ?? '' };
  doel.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true }));
  return ervoor;
}, { ver, kies });

// Een nieuwe medespeler, alleen in de "database". Staat hij daarna in de
// stand, dan is er opnieuw opgehaald.
let nummer = 0;
const nieuweSpeler = (page) => page.evaluate((n) => {
  const naam = `Nieuwkomer${n}`;
  globalThis.__db.pool_members.push({ member_id: `lid-nieuw${n}`, pool_id: 'pool-1', display_name: naam, user_id: `n${n}` });
  return naam;
}, ++nummer);
const inStand = async (page, naam) => {
  await page.click('[data-weergave="stand"]');
  await page.waitForSelector('.strij');
  const ja = (await page.textContent('#app')).includes(naam);
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('[data-race]');
  return ja;
};
const klaar = (page) => page.waitForFunction(() => !document.querySelector('#trekker')?.dataset.stand);

// Als app op het beginscherm, en met een ETag voor de app die de test kan
// laten veranderen, alsof er een nieuwe versie online is gezet.
let versie = 'versie-1';
let kopVragen = 0;
const alsApp = async (p) => {
  await p.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { get: () => true }); });
  await p.route((u) => new URL(u).pathname === '/', (route) => {
    if (route.request().method() !== 'HEAD') return route.fallback();
    kopVragen++;
    return route.fulfill({ status: 200, headers: { etag: versie }, body: '' });
  });
};

const { page, jsFouten, stoppen } = await startPagina({ voorafAan: alsApp });
await page.setViewportSize({ width: 390, height: 844 });
await meedoen(page);
await page.evaluate(() => window.scrollTo(0, 0));

// ---- trekken op de racelijst -------------------------------------------------------
let naam = await nieuweSpeler(page);
const kort = await veeg(page, 60);
await klaar(page);
check('een klein stukje trekken laat de trekker zien, maar ververst niet',
  kort.stand === 'trekken' && kort.tekst === 'Trek om bij te werken' && !(await inStand(page, naam)), JSON.stringify(kort));

const ver = await veeg(page, 200);
check('ver genoeg: "Laat los om bij te werken"', ver.stand === 'klaar' && ver.tekst === 'Laat los om bij te werken', JSON.stringify(ver));
await klaar(page);
check('na loslaten is de poule opnieuw opgehaald: de nieuwe speler staat in de stand', await inStand(page, naam));
check('en de app vroeg of er een nieuwe versie is', kopVragen >= 2, `${kopVragen} keer`);

// ---- niet als je naar beneden gescrold bent ----------------------------------------
// De nabootsing heeft maar drie races; een lege ruimte onderaan maakt de
// pagina langer dan het scherm, zoals een echt seizoen dat doet.
naam = await nieuweSpeler(page);
await page.evaluate(() => {
  const ruimte = document.createElement('div');
  ruimte.id = 'ruimte'; ruimte.style.height = '2000px';
  document.body.append(ruimte);
  window.scrollTo(0, 300);
});
check('(de pagina is langer dan het scherm)', await page.evaluate(() => window.scrollY > 0));
const gescrold = await veeg(page, 200);
await page.evaluate(() => { document.querySelector('#ruimte').remove(); window.scrollTo(0, 0); });
check('naar beneden gescrold: vegen is gewoon scrollen, geen verversen',
  gescrold.stand === '' && !(await inStand(page, naam)), JSON.stringify(gescrold));

// ---- een open race wordt de nieuwe -------------------------------------------------
// Shanghai met alleen de kwalificatie; dan komt de race binnen. Na verversen
// hoort het open racescherm dat te weten: het podium verschijnt.
await page.evaluate((UIT) => {
  const db = globalThis.__db;
  db.pool_members.push({ member_id: 'lid-m0', pool_id: 'pool-1', display_name: 'Michael', user_id: 'u0' });
  const sh = db.races[1];
  sh.quali_result = UIT; sh.race_result = null;
  sh.deadline_quali = new Date(Date.now() - 8 * 36e5).toISOString();
  sh.deadline_race = new Date(Date.now() - 7 * 36e5).toISOString();
  for (const m of ['lid-1', 'lid-m0']) for (const v of ['quali_top10', 'race_top10']) {
    db.answers.push({ pool_id: 'pool-1', race_id: sh.id, member_id: m, question_id: v, waarde: m === 'lid-1' ? UIT : [...UIT].reverse() });
  }
}, UIT);
await veeg(page, 200);
await klaar(page);
await openRace(page, 'Shanghai');
check('(een race met alleen de kwalificatie heeft nog geen podium)', (await page.$('[data-podium]')) === null);
await page.evaluate((UIT) => { globalThis.__db.races[1].race_result = UIT; }, UIT);
await page.evaluate(() => window.scrollTo(0, 0));
await veeg(page, 200);
await klaar(page);
check('na verversen op een open race staat de nieuwe uitslag erin (het podium verschijnt)',
  (await page.$('[data-podium]')) !== null && (await page.$('#paneel')) !== null);

// ---- niet met een venster open -----------------------------------------------------
naam = await nieuweSpeler(page);
await page.click('[data-deel]');
await page.waitForSelector('.deelvenster');
// De klik scrolde de knop in beeld; terug naar boven, zodat alleen het venster
// het verschil maakt.
await page.evaluate(() => window.scrollTo(0, 0));
const metVenster = await veeg(page, 200, '.deelvenster');
check('met een venster open (het deelplaatje) gebeurt er niets', metVenster.stand === '', JSON.stringify(metVenster));
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.querySelector('.deelvenster'));

// ---- niet op het invulscherm -------------------------------------------------------
await naarLijst(page);
await openRace(page, 'Melbourne');
await page.waitForSelector('#opslaan');
await page.click('.slot.leegplek');
await page.waitForSelector('#kiesblad .kiesknop:not([disabled])');
await page.click('#kiesblad .kiesknop:not([disabled])');
await page.waitForSelector('#kiesblad', { state: 'detached' });
const gekozen = await page.$$eval('.slot:not(.leegplek)', (n) => n.length);
await page.evaluate(() => window.scrollTo(0, 0));
const invul = await veeg(page, 200);
await page.waitForTimeout(300);
check('op het invulscherm gebeurt er niets: je keuzes zijn nog niet opgeslagen',
  invul.stand === '' && gekozen === 1 && (await page.$$eval('.slot:not(.leegplek)', (n) => n.length)) === 1,
  `${JSON.stringify(invul)} · ${gekozen}`);
await naarLijst(page);

// ---- terugkomen in de app ----------------------------------------------------------
naam = await nieuweSpeler(page);
await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await page.waitForTimeout(300);
check('even weg en terug: nog niet opnieuw opgehaald', !(await inStand(page, naam)));
await page.evaluate(() => {
  const echt = Date.now;
  Date.now = () => echt() + 2 * 60 * 1000;
  document.dispatchEvent(new Event('visibilitychange'));
});
await klaar(page);
check('na meer dan een minuut weg en terug: vanzelf opnieuw opgehaald', await inStand(page, naam));

// ---- een nieuwe versie online ------------------------------------------------------
await page.evaluate(() => { window.__nogDezelfde = true; window.scrollTo(0, 0); });
versie = 'versie-2';
await Promise.all([page.waitForEvent('load'), veeg(page, 200)]);
check('staat er een nieuwe versie online, dan herlaadt de pagina',
  await page.evaluate(() => window.__nogDezelfde !== true));
await page.waitForSelector('[data-race]');
await page.evaluate(() => { window.__nogDezelfde = true; window.scrollTo(0, 0); });
await veeg(page, 200);
await klaar(page);
check('en daarna niet nog een keer: de nieuwe versie is nu de geladen versie',
  await page.evaluate(() => window.__nogDezelfde === true));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();

// ---- in de browser -----------------------------------------------------------------
// Safari en Chrome trekken zelf al. Daar doet de app niets, anders zouden er
// twee tegelijk verversen.
{
  const { page, stoppen } = await startPagina();
  await page.setViewportSize({ width: 390, height: 844 });
  await meedoen(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  const r = await veeg(page, 200);
  check('in de browser (niet als app op het beginscherm) doet trekken niets', r.stand === '', JSON.stringify(r));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
