// Profiel in het nieuwe ontwerp: de rijderskaart, je eigen kleur, en de rest
// als regels (14 november).
//
// Profiel was een lange rij blokken met elk een paar regels uitleg en een
// grijze knop. Wat hier vastligt:
//   1. Bovenaan de rijderskaart: je naam groot, je startnummer, je cijfers.
//   2. Je kiest zelf je kleur uit acht. Die staat meteen op het scherm, gaat
//      naar de database, en is daarna ook je kleur in de spelerslijst.
//   3. Weigert de database, dan gaat de kleur terug en staat erbij waarom.
//   4. Zonder gekoppeld account staat dat bovenaan als gele vlag, met één
//      gekleurde knop.
//   5. De rest zijn regels die dicht beginnen, met hoe het nu staat.

import { maakControle, startPagina, meedoen, naarLijst } from './hulp.mjs';

const { check, afronden } = maakControle('de rijderskaart op Profiel');
const { page, jsFouten, stoppen } = await startPagina({ pitmuur: false });
await page.setViewportSize({ width: 390, height: 844 });
const tekst = async (kies) => ((await page.textContent(kies)) ?? '').replace(/\s+/g, ' ').trim();
const zichtbaar = (kies) => page.locator(kies).isVisible();
const gekozen = () => page.$$eval('[data-helm][aria-pressed="true"]', (n) => n.map((b) => b.dataset.helm).join());
const kleurVan = (kies) => page.$eval(kies, (e) => getComputedStyle(e).backgroundColor);

await meedoen(page);
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pool_members.push({ member_id: 'lid-2', pool_id: 'pool-1', display_name: 'Sanne', user_id: null });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('.shell');
await naarLijst(page);

await page.click('[data-weergave="poule"]');
await page.waitForSelector('.speler.zelf .av');
const vooraf = await kleurVan('.speler.zelf .av');

await page.click('[data-weergave="profiel"]');
await page.waitForSelector('.rijder');
check('bovenaan de rijderskaart met je naam en je startnummer',
  (await tekst('[data-rijder]')) === 'Danny' && (await tekst('.rijder .hero-kop')).includes('startnummer 01'),
  await tekst('.rijder'));
check('je naam wordt niet vertaald door de browser',
  await page.$eval('[data-rijder]', (e) => e.closest('[translate="no"]') !== null));
check('er zijn acht kleuren, en precies één is de jouwe',
  (await page.$$('[data-helm]')).length === 8 && (await gekozen()).length === 1, await gekozen());
check('dat is de kleur die je in de spelerslijst al had',
  (await kleurVan('[data-helm][aria-pressed="true"]')) === vooraf, vooraf);
check('elke kleur heeft een naam voor een schermlezer',
  await page.$$eval('[data-helm]', (n) => n.every((b) => /^kleur \d$/.test(b.getAttribute('aria-label')))));

const ander = (await gekozen()) === '1' ? '2' : '1';
await page.click(`[data-helm="${ander}"]`);
await page.waitForFunction((k) => document.querySelector(`[data-helm="${k}"]`)?.getAttribute('aria-pressed') === 'true', ander);
check('een tik kiest een andere kleur', (await gekozen()) === ander, await gekozen());
check('en die staat in de database',
  await page.evaluate((k) => globalThis.__db.pool_members.find((m) => m.member_id === 'lid-1').kleur === Number(k), ander));
const nieuw = await kleurVan(`[data-helm="${ander}"]`);

await page.click('[data-weergave="poule"]');
await page.waitForSelector('.speler.zelf .av');
check('in de spelerslijst heb je nu die kleur', (await kleurVan('.speler.zelf .av')) === nieuw && nieuw !== vooraf, nieuw);
await page.reload();
await page.waitForSelector('.speler.zelf .av');
check('ook na opnieuw laden', (await kleurVan('.speler.zelf .av')) === nieuw);

// De database weigert: de speler hangt intussen aan een ander account.
await page.click('[data-weergave="profiel"]');
await page.waitForSelector('.rijder');
await page.evaluate(() => {
  const lid = globalThis.__db.pool_members.find((m) => m.member_id === 'lid-1');
  lid.user_id = 'iemand-anders'; lid.aangemaakt_door = 'iemand-anders';
});
await page.click('[data-helm="5"]');
await page.waitForSelector('#kleurfout');
check('weigert de database, dan gaat de kleur terug', (await gekozen()) === ander, await gekozen());
check('en staat erbij waarom', (await tekst('#kleurfout')).length > 5, await tekst('#kleurfout'));

// Een verse speler, zonder gekoppeld account.
const tweede = await startPagina({ pitmuur: false });
await tweede.page.setViewportSize({ width: 390, height: 844 });
await meedoen(tweede.page);
await tweede.page.click('[data-weergave="profiel"]');
await tweede.page.waitForSelector('.rijder');
const p2 = tweede.page;
check('zonder gekoppeld account staat dat bovenaan als gele vlag',
  ((await p2.textContent('[data-accountkaart] .label')) ?? '').includes('speler niet bewaard'));
check('met één gekleurde knop',
  await p2.$$eval('[data-accountkaart] .knop.primair', (n) => n.length === 1 && n[0].id === 'googlekoppel'));
check('de rest zijn regels, en die beginnen dicht',
  await p2.$$eval('details[data-pit]', (n) => n.length >= 6 && n.every((d) => !d.open)));
check('dus de link om jezelf mee te nemen is niet in beeld', !(await p2.locator('#eigenlink').isVisible()));
check('de regel voor de taal zegt welke taal er staat',
  ((await p2.textContent('[data-pit="p-taal"] .pitstand')) ?? '').trim() === 'Nederlands');
check('een regel zonder stand heeft geen lampje',
  await p2.$eval('[data-pit="p-contact"] .pitlamp', (e) => getComputedStyle(e).display === 'none'));
await p2.click('[data-pit="p-link"] summary');
check('een tik opent de regel', await p2.locator('#eigenlink').isVisible());

check('geen javascriptfouten', jsFouten.length === 0 && tweede.jsFouten.length === 0,
  [...jsFouten, ...tweede.jsFouten].join(' | '));
await tweede.stoppen();
await stoppen();
process.exit(afronden() ? 0 : 1);
