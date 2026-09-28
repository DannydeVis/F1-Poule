// "Het is nu onmogelijk om een nieuwe poule aan te maken of bij een nieuwe
// poule aan te sluiten, tenzij je de link hebt."
//
// Het kon wel, maar alleen via het kleine "Wissel" in de hoek. Op het
// Poule-tabblad stond onder "jouw andere poules" niets om een poule te maken
// of met een code mee te doen, en wie maar in één poule zat zag daar helemaal
// niets. Daarbij werden de poules in dat lijstje op een breed scherm
// platgedrukt tot een randje, met de naam en de code eronder uit.
//
// Wat hier vastligt:
//   1. Ook met één poule staan op het Poule-tabblad "Nieuwe poule maken" en
//      "Meedoen met een code".
//   2. Meedoen met een code brengt je op het startscherm met de cursor in het
//      veld voor de code, en met een andere code kom je in die poule; de
//      eerste blijft in je lijstje.
//   3. Nieuwe poule maken opent het aanmaken, en Terug op de eerste stap
//      brengt je weer in de poule waar je was.
//   4. Op een breed scherm is elke poule in het lijstje hoog genoeg voor wat
//      erin staat, ook met een omschrijving.
//   5. In de demo staan de twee knoppen er niet.

import { maakControle, startPagina, meedoen, wortel } from './hulp.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const { check, afronden } = maakControle('nog een poule, vanuit de app');

const { page, jsFouten, stoppen } = await startPagina({
  aanpassen: (s) => s
    .replace("pools: [{ id:'pool-1', name:'Vrijdagmiddagpoule', join_code:'RTM026', season:2026 }],",
      `pools: [{ id:'pool-1', name:'Vrijdagmiddagpoule', join_code:'RTM026', season:2026, beschrijving:'Om de eer' },
        { id:'pool-2', name:'Werk', join_code:'WERK26', season:2026, beschrijving:'Met de collega\\'s, om de eer' }],`)
    .replace("pool_members: [{ member_id:'lid-1', pool_id:'pool-1', display_name:'Danny', user_id:null }],",
      `pool_members: [{ member_id:'lid-1', pool_id:'pool-1', display_name:'Danny', user_id:null },
        { member_id:'lid-2', pool_id:'pool-2', display_name:'Kim', user_id:null }],`),
});
const naarPouleTab = async () => {
  await page.click('[data-weergave="poule"]');
  await page.waitForSelector('#nieuwePoule');
};

await meedoen(page);

// ---- 1. met één poule --------------------------------------------------------------
await naarPouleTab();
check('met één poule staan "Nieuwe poule maken" en "Meedoen met een code" op het Poule-tabblad',
  (await page.textContent('#nieuwePoule')).trim() === 'Nieuwe poule maken'
    && (await page.textContent('#metCode')).trim() === 'Meedoen met een code'
    && !(await page.textContent('#paneel, #app')).includes('jouw andere poules'));

// ---- 2. meedoen met een code -------------------------------------------------------
await page.click('#metCode');
await page.waitForSelector('#code');
check('meedoen met een code: het startscherm, met de cursor in het veld voor de code',
  await page.evaluate(() => document.activeElement?.id === 'code'));
await page.fill('#code', 'WERK26');
await page.click('#mee');
await page.waitForSelector('#naam');
await page.fill('#naam', 'Danny');
await page.click('#maak');
await page.waitForSelector('[data-weergave="poule"]');
const lijst = await page.evaluate(() => JSON.parse(localStorage.getItem('poule:poules') ?? '[]').map((p) => p.join_code));
check('met een andere code kom je in die poule, en de eerste blijft in je lijstje',
  (await page.textContent('#app')).includes('Werk') && lijst.includes('WERK26') && lijst.includes('RTM026'), lijst.join());

// ---- 4. op een breed scherm niet platgedrukt ----------------------------------------
await page.setViewportSize({ width: 1280, height: 900 });
await naarPouleTab();
const maten = await page.$$eval('.poulekeuze', (bs) => bs.map((b) => ({ hoog: b.getBoundingClientRect().height, nodig: b.scrollHeight })));
check('op een breed scherm is elke poule in het lijstje hoog genoeg voor wat erin staat',
  maten.length === 1 && maten.every((m) => m.hoog + 1 >= m.nodig && m.hoog >= 44),
  maten.map((m) => `${Math.round(m.hoog)}/${m.nodig}`).join(' '));
await page.setViewportSize({ width: 390, height: 844 });

// ---- 3. een nieuwe poule, en terug -------------------------------------------------
await naarPouleTab();
await page.click('#nieuwePoule');
await page.waitForSelector('#pnaam');
check('nieuwe poule maken opent het aanmaken', (await page.textContent('h1')).trim() === 'Hoe heet de poule?');
await page.click('#terugstap');
await page.waitForSelector('[data-weergave="poule"]');
check('Terug op de eerste stap brengt je weer in de poule waar je was',
  (await page.textContent('#app')).includes('Werk') && (await page.$('#pnaam')) === null);

// ---- 5. de demo ---------------------------------------------------------------------
{
  const bron = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
  check('in de demo staan de twee knoppen er niet', /const erbij = DEMO \? '' :/.test(bron));
}

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
