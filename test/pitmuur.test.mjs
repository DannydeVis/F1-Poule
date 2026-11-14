// De Poule-tab: de code bovenaan, spelers met een kleur, en de instellingen
// als regels (14 november).
//
// De Poule-tab was ruim vijf telefoonschermen lang: elke instelling met drie
// tot vijf regels uitleg en een knop, allemaal onder elkaar. Wie alleen de
// code wilde delen moest erdoorheen. Wat hier vastligt:
//   1. Bovenaan de code op een kaart, met één gekleurde knop.
//   2. Elke speler heeft een kleur, en dat is na opnieuw laden dezelfde.
//   3. De instellingen zijn regels die dicht beginnen: de naam, hoe het nu
//      staat, en een lampje. De uitleg en de knop staan erachter.
//   4. Een regel die je opendoet blijft open: na een knop (de app tekent dan
//      opnieuw) en na opnieuw laden.
//   5. De regel zegt hoe het staat, ook nadat je het veranderde.
//   6. De balk onderin heeft op een telefoon een pictogram bij elk woord.

import { maakControle, startPagina, meedoen, naarLijst, PITREGELS } from './hulp.mjs';

const { check, afronden } = maakControle('de pitmuur op de Poule-tab');
const { page, jsFouten, stoppen } = await startPagina({ pitmuur: false });
await page.setViewportSize({ width: 390, height: 844 });
const tekst = async (kies) => ((await page.textContent(kies)) ?? '').replace(/\s+/g, ' ').trim();
const zichtbaar = (kies) => page.locator(kies).isVisible();

await meedoen(page);
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pool_members.push({ member_id: 'lid-2', pool_id: 'pool-1', display_name: 'Sanne', user_id: null });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('.shell');
await naarLijst(page);

check('de balk onderin heeft een pictogram bij elk woord',
  await page.$$eval('.navknop', (n) => n.length === 4 && n.every((k) => {
    const svg = k.querySelector('.navicoon svg');
    return !!svg && svg.getBoundingClientRect().width > 0 && k.textContent.trim().length > 0;
  })));

await page.click('[data-weergave="poule"]');
await page.waitForSelector('.codekaart');

check('bovenaan de code, groot, met het aantal spelers',
  (await tekst('.codekaart .code')).length >= 4 && (await tekst('.codekaart .label')).includes('2 spelers'),
  await tekst('.codekaart'));
check('en één gekleurde knop voor de uitnodiging',
  await page.$$eval('.codekaart .knop', (n) => n.length === 1 && n[0].classList.contains('primair')
    && n[0].id === 'uitnodiging'));
check('de code wordt niet vertaald door de browser',
  await page.$eval('.codekaart .code', (e) => e.closest('[translate="no"]') !== null));

const kleuren = () => page.$$eval('.speler .av', (n) => n.map((e) => `${e.textContent.trim()}:${getComputedStyle(e).backgroundColor}`));
const eerst = await kleuren();
check('elke speler heeft een rondje met zijn letter en een kleur',
  eerst.length === 2 && eerst.every((k) => /^[A-Z]:rgb/.test(k) && !k.includes('rgba(0, 0, 0, 0)')), eerst.join(' '));

const regels = await page.$$eval('details[data-pit]', (n) => n.map((d) => d.dataset.pit));
check('de instellingen zijn regels, en de testhulp kent ze allemaal',
  regels.length >= 8 && regels.every((r) => PITREGELS.includes(r)), regels.join(' '));
check('ze beginnen allemaal dicht', await page.$$eval('details[data-pit]', (n) => n.every((d) => !d.open)));
check('dus de knoppen en de uitleg zijn niet in beeld', !(await zichtbaar('#contrairKnop')) && !(await zichtbaar('#slotKnop')));
check('de regel zegt hoe het staat: contrair staat uit, zonder lampje',
  (await tekst('[data-pit="contrair"] .pitstand')) === 'staat uit'
    && !(await page.$eval('[data-pit="contrair"]', (d) => d.classList.contains('aan'))),
  await tekst('[data-pit="contrair"] summary'));
check('en de toegang is open met de code, met lampje',
  (await tekst('[data-pit="toegang"] .pitstand')) === 'open met de code'
    && await page.$eval('[data-pit="toegang"]', (d) => d.classList.contains('aan')));
check('de kop van het blok staat niet nog een keer in de regel',
  await page.$$eval('.pitinhoud > span.label:first-child', (n) => n.every((e) => getComputedStyle(e).display === 'none')));

await page.click('[data-pit="contrair"] summary');
check('een tik op de regel laat de uitleg en de knop zien', await zichtbaar('#contrairKnop'));
await page.click('#contrairKnop');
await page.waitForFunction(() => document.querySelector('[data-pit="contrair"]')?.classList.contains('aan'));
check('na de knop staat de regel nog open', await zichtbaar('#contrairKnop'));
check('en zegt hij dat het aan staat, met lampje',
  (await tekst('[data-pit="contrair"] .pitstand')) === 'staat aan', await tekst('[data-pit="contrair"] summary'));

await page.reload();
await page.waitForSelector('.codekaart');
check('na opnieuw laden staat alleen die regel open',
  (await page.$$eval('details[data-pit][open]', (n) => n.map((d) => d.dataset.pit))).join() === 'contrair');
check('en heeft iedereen dezelfde kleur', (await kleuren()).join() === eerst.join());

await page.click('[data-pit="contrair"] summary');
// (Het toggle-event komt een tel na de klik.)
await page.waitForFunction(() => !localStorage.getItem('poule:pitmuur').includes('contrair'));
await page.reload();
await page.waitForSelector('.codekaart');
check('dichtdoen onthoudt hij ook', (await page.$$('details[data-pit][open]')).length === 0);

check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
