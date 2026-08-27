// Het beheergedeelte onder Poule: welke vragen doen mee, en wat er gebeurt
// zodra de set op slot gaat.
//
// Twee dingen die hier makkelijk misgaan:
//
//   1. Een poule zonder rijen in pool_questions doet aan alles mee. Als het
//      beheerscherm dat als "niets aangevinkt" toont en je slaat op, dan zet
//      je de hele poule in één klik uit.
//   2. Zodra questions_locked aan staat mag er niets meer veranderen. Een
//      alleen-lezen lijst zonder werkende knoppen is dan het hele punt: de
//      races moeten onderling vergelijkbaar blijven.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('vragenset beheren');
const { page, jsFouten, stoppen } = await startPagina();

const naarPoule = async () => {
  await page.click('[data-weergave="poule"]');
  await page.waitForSelector('.vragenlijst, #wissel');
};
const vinkjes = () => page.$$eval('.vraagregel.aan', (n) => n.map((b) => b.dataset.vraagAan));
const inDb = () => page.evaluate(() => globalThis.__db.pool_questions.map((v) => v.question_id));

await meedoen(page);
await naarPoule();

// --- een poule zonder eigen keuze doet aan alles mee ----------------------
check('de vragenset staat onder Poule', (await page.$('.vragenlijst')) !== null);
const begin = await vinkjes();
check('zonder eigen keuze staat alles aan', begin.length === 9, `${begin.length} van 9 aan`);
check('en er staat nog niets in de database', (await inDb()).length === 0);

// --- uitvinken en bewaren --------------------------------------------------
await page.click('[data-vraag-aan="rode_vlag"]');
await page.click('[data-vraag-aan="safety_cars"]');
check('uitvinken werkt', (await vinkjes()).length === 7);

const som = await page.textContent('.somregel .getal');
check('het totaal telt mee omlaag', Number(som) === 202 - 32, som);

check('er is een ongedaan-knop zolang je niet bewaard hebt',
  (await page.$('#vragenTerug')) !== null);
await page.click('#vragenTerug');
check('ongedaan maken zet alles terug', (await vinkjes()).length === 9);

await page.click('[data-vraag-aan="rode_vlag"]');
await page.click('[data-vraag-aan="safety_cars"]');
await page.click('#vragenBewaren');
await page.waitForSelector('.melding');
check('na bewaren staat er een bevestiging',
  (await page.textContent('.melding')).includes('bijgewerkt'),
  (await page.textContent('.melding')).trim());

const bewaard = await inDb();
check('de zeven overgebleven vragen staan in de database',
  bewaard.length === 7 && !bewaard.includes('rode_vlag') && !bewaard.includes('safety_cars'),
  `${bewaard.length}: ${bewaard.join(', ')}`);

// --- nog een ronde: alleen het verschil hoort geschreven te worden --------
await naarPoule();
await page.click('[data-vraag-aan="pole"]');
await page.click('#vragenBewaren');
await page.waitForSelector('.melding');
const na = await inDb();
check('een vraag uitzetten haalt precies één rij weg',
  na.length === 6 && !na.includes('pole'), `${na.length}: ${na.join(', ')}`);

// En de vraag wordt daarna ook echt niet meer gesteld.
await page.click('[data-weergave="races"]');
await page.click('[data-race]');
await page.waitForSelector('#paneel');
check('een uitgezette vraag verdwijnt uit het racescherm',
  (await page.$('[data-vraag="pole"]')) === null);

// --- op slot ---------------------------------------------------------------
await page.evaluate(() => {
  globalThis.__db.pools[0].questions_locked = true;
  globalThis.__db.races.find((r) => String(r.id) === '1').quali_result = ['1', '4', '16'];
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await page.waitForSelector('[data-race]');
await naarPoule();

const uitleg = (await page.textContent('.kol, #paneel')).replace(/\s+/g, ' ');
check('op slot legt uit sinds wanneer, en waarom',
  uitleg.includes('ligt vast sinds Melbourne')
    && uitleg.includes('vergelijkbaar'),
  uitleg.match(/De vragenset[^.]*\.[^.]*\./)?.[0] ?? 'die uitleg staat er niet');

check('de vinkjes zijn alleen-lezen',
  await page.$$eval('.vraagregel', (n) => n.every((b) => b.disabled)));
check('en er valt niets meer te bewaren',
  (await page.$('#vragenBewaren')) === null);

const opSlot = await inDb();
await page.click('[data-vraag-aan="pole"]').catch(() => {});
check('klikken verandert dan ook niets',
  JSON.stringify(await inDb()) === JSON.stringify(opSlot),
  (await inDb()).join(', '));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
