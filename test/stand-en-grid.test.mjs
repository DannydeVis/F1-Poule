// De Stand-tab en het invulscherm in het nieuwe ontwerp (14 november).
//
// Wat hier vastligt:
//   1. In de stand, op het podium en bij de duels heeft iedereen zijn kleur.
//   2. De seizoensvragen staan tijdens het seizoen niet meer als formulier
//      midden in de stand: het is één regel die zegt wat er nog open is, in
//      amber, met het formulier erachter. Vóór de eerste race staat het
//      formulier er gewoon.
//   3. De seizoensrecords zijn tegels, met het getal groot.
//   4. De top 10 is een startopstelling in twee rijen: P1 en P2 naast elkaar,
//      P2 een halve plek naar achteren, en half zo hoog als tien onder elkaar.
//   5. In zo'n plek staat de code en de achternaam.

import { maakControle, startPagina, meedoen, kiesVoor } from './hulp.mjs';

const { check, afronden } = maakControle('de stand en de startopstelling');
const { page, jsFouten, stoppen } = await startPagina({ pitmuur: false });
await page.setViewportSize({ width: 390, height: 844 });
const tekst = async (kies) => ((await page.textContent(kies)) ?? '').replace(/\s+/g, ' ').trim();
const LIJST = ['1', '12', '63', '16', '44', '4', '81', '10', '14', '18'];

await meedoen(page);

// --- vóór het seizoen: het formulier staat er gewoon ---------------------
await page.click('[data-weergave="stand"]');
await page.waitForSelector('.seizoenslaag');
check('vóór de eerste race staan de seizoensvragen er als formulier',
  (await page.$('[data-seizoenregel]')) === null && await page.locator('[data-seizoenvraag]').first().isVisible());

// --- tijdens het seizoen ---------------------------------------------------
await page.evaluate((LIJST) => {
  const db = globalThis.__db;
  for (const [i, naam] of ['Sanne', 'Joe'].entries()) {
    db.pool_members.push({ member_id: `lid-${i + 2}`, pool_id: 'pool-1', display_name: naam, user_id: null });
  }
  const r = db.races.find((x) => x.id === 1);
  r.deadline_quali = new Date(Date.now() - 4 * 864e5).toISOString();
  r.deadline_race = new Date(Date.now() - 3 * 864e5).toISOString();
  r.quali_result = LIJST; r.race_result = LIJST;
  const lijsten = { 'lid-1': LIJST, 'lid-2': [...LIJST].reverse(), 'lid-3': [...LIJST].reverse() };
  for (const [lid, l] of Object.entries(lijsten)) for (const q of ['quali_top10', 'race_top10']) {
    db.answers.push({ pool_id: 'pool-1', race_id: 1, member_id: lid, question_id: q, waarde: l });
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, LIJST);
await page.reload();
await page.waitForSelector('.shell');
await page.click('[data-weergave="stand"]');
await page.waitForSelector('.strij');

const kleur = (kies) => page.$$eval(kies, (n) => n.map((e) => `${e.textContent.trim()}:${getComputedStyle(e).backgroundColor}`));
// (Alleen de stand zelf: verderop staan nog lijsten in dezelfde opmaak.)
const stand = await page.$eval('.strij', (rij) => [...rij.parentElement.querySelectorAll('.strij .av')]
  .map((e) => `${e.textContent.trim()}:${getComputedStyle(e).backgroundColor}`));
check('in de stand heeft elke speler zijn rondje', stand.length === 3 && stand.every((k) => /^[A-Z]:rgb/.test(k)), stand.join(' '));
const podium = await kleur('.podium .av');
check('op het podium ook, in dezelfde kleur', podium.length === 3 && podium.every((k) => stand.includes(k)), podium.join(' '));
const duels = await kleur('.duel .av');
check('en bij de duels', duels.length === 2 && duels.every((k) => stand.includes(k)), duels.join(' '));

check('de seizoensvragen zijn nu één regel, en die is dicht',
  (await page.$$('[data-seizoenregel] details')).length === 1
    && !(await page.$eval('[data-pit="s-seizoen"]', (d) => d.open))
    && !(await page.locator('[data-seizoenvraag]').first().isVisible()));
check('de regel zegt hoeveel er nog open is',
  (await tekst('[data-pit="s-seizoen"] .pitstand')).startsWith('nog 4 in te vullen'), await tekst('[data-pit="s-seizoen"] summary'));
check('in amber, want er valt nog iets te halen',
  await page.$eval('[data-pit="s-seizoen"]', (d) => d.classList.contains('let')
    && getComputedStyle(d.querySelector('.pitstand')).color === getComputedStyle(d.querySelector('.pitlamp')).backgroundColor));
check('de regel staat tussen de stand en de duels, niet eronder',
  await page.evaluate(() => {
    const r = document.querySelector('[data-seizoenregel]'), s = document.querySelector('.strij'), d = document.querySelector('.duel');
    return !!(s.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING)
      && !!(r.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING);
  }));
await page.click('[data-pit="s-seizoen"] summary');
check('een tik opent het formulier, met de knop Opslaan',
  await page.locator('[data-seizoenvraag]').first().isVisible() && await page.locator('#seizoenOpslaan').isVisible());

const tegels = await page.$$eval('.recordtegel', (n) => n.map((e) => ({
  soort: e.dataset.record, groot: parseFloat(getComputedStyle(e.querySelector('.t')).fontSize),
  naam: parseFloat(getComputedStyle(e.querySelector('.nm')).fontSize) })));
check('de seizoensrecords zijn tegels met het getal groot',
  tegels.length >= 2 && tegels.every((t) => t.groot > t.naam * 1.5), JSON.stringify(tegels));

// --- de startopstelling ----------------------------------------------------
await page.click('[data-weergave="races"]');
await page.click('.hero [data-naar-race]');
await page.waitForSelector('.grid10');
await kiesVoor(page, '[data-plek="0"]', '1');
// (De gekozen plek rijdt een derde seconde binnen; pas daarna staat hij stil.)
await page.waitForTimeout(600);
const vak = (i) => page.$eval(`[data-plek="${i}"]`, (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
const [p1, p2, p3, p10] = [await vak(0), await vak(1), await vak(2), await vak(9)];
check('P1 en P2 staan naast elkaar', p2.x > p1.x + p1.w - 1, JSON.stringify({ p1, p2 }));
check('P2 staat een halve plek naar achteren', p2.y > p1.y + p1.h * 0.3 && p2.y < p1.y + p1.h, JSON.stringify({ p1, p2 }));
check('P3 staat onder P1', Math.abs(p3.x - p1.x) < 2 && p3.y >= p1.y + p1.h, JSON.stringify({ p1, p3 }));
check('de tien plekken zijn samen ruim de helft lager dan tien onder elkaar',
  p10.y + p10.h - p1.y < p1.h * 7, `${Math.round(p10.y + p10.h - p1.y)} tegen ${Math.round(p1.h * 10)}`);
check('in een plek staat de code en de achternaam',
  (await tekst('[data-plek="0"] .who')).replace(/\s/g, '') === 'VERVerstappen', await tekst('[data-plek="0"] .who'));
check('het label voor een schermlezer houdt de hele naam',
  (await page.getAttribute('[data-plek="0"]', 'aria-label')).includes('Max Verstappen'));
check('niets steekt buiten het scherm', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
