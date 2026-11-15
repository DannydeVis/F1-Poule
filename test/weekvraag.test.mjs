// De vraag van de week (15 november).
//
// Elk weekend één vraag: wie van twee teamgenoten is sneller in de eerste
// vrije training? Iets om doordeweeks voor terug te komen. Danny: het telt
// niet mee in de gewone stand, het krijgt een eigen stand. Wat hier vastligt:
//   1. Zonder trainingsrooster is er geen vraag.
//   2. Welk team aan de beurt is hangt aan het rondenummer (de teams met twee
//      coureurs op naam), dus op elk toestel hetzelfde.
//   3. Zolang de eerste training niet begonnen is kies je met twee knoppen op
//      de racekaart; nog een keer tikken haalt je keuze weg. De keuze gaat via
//      weekvraag_kiezen() naar de database en staat er na herladen nog.
//   4. Begint de training, dan staat er wat je koos, zonder knoppen, ook
//      zonder dat je herlaadt.
//   5. Is de training binnen, dan staat er wie sneller was en of je gelijk had.
//      Met alleen een top 10 wint wie daarin staat.
//   6. Op de Stand-tab staat de eigen stand: goed van meegedaan.
//   7. Aan de gewone punten verandert het niets.
//   8. Weigert de database (te laat), dan staat dat erbij.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, startPagina, meedoen, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('de vraag van de week');

// De vraag van de week staat uit sinds 15 november (Danny: "ik zie de
// toegevoegde waarde niet"). Eerst: uit is ook echt uit. Daarna draait de rest
// van deze test op een kopie van de app met de schakelaar aan, zodat de code
// die er nog staat blijft werken voor als hij terugkomt.
const BRON = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
check('de schakelaar staat uit in de app', BRON.split('const WEEKVRAAG_AAN = false;').length === 2);
{
  const uit = await startPagina();
  await meedoen(uit.page);
  await uit.page.evaluate(() => {
    const db = globalThis.__db;
    const r = db.races.find((x) => x.id === 1);
    r.vrije_trainingen = [{ naam: 'Practice 1', sessie: 11, start: new Date(Date.now() + 3600e3).toISOString(),
      eind: new Date(Date.now() + 7200e3).toISOString(), top: null }];
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  });
  await uit.page.reload();
  await uit.page.waitForSelector('.shell');
  await uit.page.click('[data-weergave="races"]');
  await uit.page.waitForSelector('.hero');
  check('uit: met een rooster staat er toch geen vraag op de racekaart', (await uit.page.$('[data-weekvraag]')) === null);
  await uit.page.click('[data-weergave="stand"]');
  await uit.page.waitForTimeout(300);
  check('uit: geen stand van de vraag op de Stand-tab', (await uit.page.$('[data-weekvraagrij]')) === null);
  check('uit: geen javascriptfouten', uit.jsFouten.length === 0, uit.jsFouten.join(' | '));
  await uit.stoppen();
}
const aanPad = join(process.env.TMPDIR ?? '/tmp', `poule-weekvraag-aan-${process.pid}.html`);
writeFileSync(aanPad, BRON.replace('const WEEKVRAAG_AAN = false;', 'const WEEKVRAAG_AAN = true;'));
const { page, jsFouten, stoppen } = await startPagina({ indexPad: aanPad });
await page.setViewportSize({ width: 390, height: 844 });
const tekst = async (kies) => ((await page.textContent(kies)) ?? '').replace(/\s+/g, ' ').trim();
const LIJST = ['1', '12', '63', '16', '44', '4', '81', '10', '14', '18'];
const UUR = 3600e3;
const DAG = 24 * UUR;

// Melbourne (ronde 1) op een moment ten opzichte van nu. fp1: wanneer de
// eerste training begint (null: geen rooster). volgorde/top: wat de sync van
// die training binnenhaalde. keuzes: wat er in de database staat.
async function zet({ fp1 = null, race = 4 * DAG, volgorde = null, top = null, keuzes = null,
  uitslag = false, herlaad = true } = {}) {
  await page.evaluate(({ fp1, race, volgorde, top, keuzes, uitslag, LIJST }) => {
    const db = globalThis.__db;
    if (!db.pool_members.some((m) => m.member_id === 'lid-2')) {
      db.pool_members.push({ member_id: 'lid-2', pool_id: 'pool-1', display_name: 'Sanne', user_id: null },
        { member_id: 'lid-3', pool_id: 'pool-1', display_name: 'Joe', user_id: null });
    }
    const r = db.races.find((x) => x.id === 1);
    r.deadline_quali = new Date(Date.now() + race - 24 * 3600e3).toISOString();
    r.deadline_race = new Date(Date.now() + race).toISOString();
    r.quali_result = uitslag ? LIJST : null; r.race_result = uitslag ? LIJST : null;
    r.vrije_trainingen = fp1 === null ? null : [
      // Met opzet de tweede training eerst: de vraag gaat over de vroegste.
      { naam: 'Practice 2', sessie: 12, start: new Date(Date.now() + fp1 + 4 * 3600e3).toISOString(),
        eind: new Date(Date.now() + fp1 + 5 * 3600e3).toISOString(), top: null },
      { naam: 'Practice 1', sessie: 11, start: new Date(Date.now() + fp1).toISOString(),
        eind: new Date(Date.now() + fp1 + 3600e3).toISOString(),
        top: top ? top.map((nr, i) => ({ plek: i + 1, nr, code: null, naam: null })) : null,
        ...(volgorde ? { volgorde } : {}) },
    ];
    if (keuzes) {
      db.weekvraag_antwoorden = Object.entries(keuzes).map(([member_id, keuze]) => ({ race_id: 1, member_id, keuze }));
    }
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  }, { fp1, race, volgorde, top, keuzes, uitslag, LIJST });
  if (!herlaad) return;
  await page.reload();
  await page.waitForSelector('.shell');
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('.hero, [data-lopend]');
}
const inDb = () => page.evaluate(() => (globalThis.__db.weekvraag_antwoorden ?? [])
  .map((w) => `${w.race_id}:${w.member_id}:${w.keuze}`).sort().join(' '));
const standPunten = async () => {
  await page.click('[data-weergave="stand"]');
  await page.waitForSelector('.strij');
  const uit = await page.$$eval('.strij', (r) => r.map((e) => e.textContent.replace(/\s+/g, ' ').trim()).join(' | '));
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('.hero, [data-lopend]');
  return uit;
};

await meedoen(page);

// --- 1. zonder rooster ----------------------------------------------------------
await zet({});
check('zonder trainingsrooster staat er geen vraag op de racekaart', (await page.$('[data-weekvraag]')) === null);

// --- 2. open: twee knoppen, het team van ronde 1 ---------------------------------
await zet({ fp1: 2 * DAG });
check('met een rooster staat de vraag op de kaart van de volgende race, open',
  (await page.getAttribute('.hero [data-weekvraag]', 'data-weekvraag')) === 'open'
    && (await tekst('.hero .weekvraag .label')).startsWith('vraag van de week · sluit ')
    && (await tekst('.hero .wvvraag')) === 'Wie is sneller in de eerste training?', await tekst('.hero .weekvraag'));
const knoppen = await page.$$eval('.hero [data-weekvraag-kies]', (k) => k.map((b) => ({
  nr: b.dataset.weekvraagKies, tekst: b.textContent.replace(/\s+/g, ' ').trim(), aan: b.getAttribute('aria-pressed'),
  vast: b.querySelector('b').getAttribute('translate') })));
check('in ronde 1 is het eerste team op naam aan de beurt: de twee van Alpine, op nummer',
  knoppen.map((k) => k.nr).join() === '10,43' && knoppen[0].tekst.includes('GAS') && knoppen[0].tekst.includes('Gasly')
    && knoppen[1].tekst.includes('COL'), JSON.stringify(knoppen));
check('nog niets gekozen, en de namen zijn niet vertaalbaar',
  knoppen.every((k) => k.aan === 'false' && k.vast === 'no'), JSON.stringify(knoppen));
check('er staat bij dat het niet meetelt voor de punten',
  (await tekst('.hero .wvklein')) === 'Telt niet mee voor de punten. Er is een eigen stand onder Stand.');
const puntenVoor = await standPunten();

// --- 3. kiezen ------------------------------------------------------------------------
await page.click('.hero [data-weekvraag-kies="10"]');
await page.waitForSelector('.hero [data-weekvraag-kies="10"][aria-pressed="true"]');
check('een tik kiest: de knop staat aan en de keuze staat in de database',
  (await inDb()) === '1:lid-1:10' && (await page.getAttribute('.hero [data-weekvraag-kies="43"]', 'aria-pressed')) === 'false',
  await inDb());
await page.click('.hero [data-weekvraag-kies="43"]');
await page.waitForSelector('.hero [data-weekvraag-kies="43"][aria-pressed="true"]');
check('de ander kiezen wisselt: één rij, de nieuwe keuze', (await inDb()) === '1:lid-1:43', await inDb());
await zet({ fp1: 2 * DAG });
check('na herladen staat de keuze er nog',
  (await page.getAttribute('.hero [data-weekvraag-kies="43"]', 'aria-pressed')) === 'true');
await page.click('.hero [data-weekvraag-kies="43"]');
await page.waitForSelector('.hero [data-weekvraag-kies="43"][aria-pressed="false"]');
check('nog een keer tikken haalt je keuze weg', (await inDb()) === '', await inDb());
check('zolang er geen training binnen is staat er geen stand van de vraag op de Stand-tab', await (async () => {
  await page.click('[data-weergave="stand"]');
  await page.waitForSelector('.strij');
  const er = (await page.$('[data-weekvraagrij]')) === null;
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('.hero');
  return er;
})());

// --- 8. de database weigert ---------------------------------------------------------------
// De training begon terwijl het scherm openstond (nog voor de klok het zag).
await zet({ fp1: -UUR, herlaad: false });
await page.click('.hero [data-weekvraag-kies="10"]');
await page.waitForFunction(() => document.querySelector('.hero .wvklein .amber') !== null);
check('weigert de database omdat het te laat is, dan staat dat erbij en is er niets gekozen',
  (await tekst('.hero .wvklein')).includes('gesloten') && (await inDb()) === '', await tekst('.hero .wvklein'));

// --- 4. dicht: wat je koos, zonder knoppen ---------------------------------------------------
await zet({ fp1: -UUR, race: 2 * DAG, keuzes: { 'lid-1': '10', 'lid-2': '43' } });
check('is de training begonnen, dan staat er wat je koos en zijn de knoppen weg',
  (await page.getAttribute('.hero [data-weekvraag]', 'data-weekvraag')) === 'dicht'
    && (await tekst('.hero [data-weekvraag]')) === 'vraag van de week: jij koos GAS'
    && (await page.$('[data-weekvraag-kies]')) === null, await tekst('.hero [data-weekvraag]'));
await zet({ fp1: -UUR, race: 2 * DAG, keuzes: { 'lid-2': '43' } });
check('koos je niets, dan staat er dat je niet meedeed',
  (await tekst('.hero [data-weekvraag]')) === 'vraag van de week: niet meegedaan', await tekst('.hero [data-weekvraag]'));
await zet({ fp1: -UUR, race: 2 * DAG, keuzes: { 'lid-1': '1' } });
check('een keuze voor een coureur die niet een van de twee is, is geen keuze',
  (await tekst('.hero [data-weekvraag]')) === 'vraag van de week: niet meegedaan', await tekst('.hero [data-weekvraag]'));

// --- 5. de training is binnen ----------------------------------------------------------------
const VOLGORDE = ['4', '1', '43', '16', '81', '63', '12', '44', '14', '18', '6', '10'];
await zet({ fp1: -5 * UUR, race: 2 * DAG, volgorde: VOLGORDE, top: VOLGORDE.slice(0, 10),
  keuzes: { 'lid-1': '43', 'lid-2': '10' } });
check('is de training binnen, dan staat er wie sneller was en dat je gelijk had',
  (await page.getAttribute('.hero [data-weekvraag]', 'data-weekvraag')) === 'goed'
    && (await tekst('.hero [data-weekvraag]')) === 'vraag van de week: COL was sneller · jij had het goed',
  await tekst('.hero [data-weekvraag]'));
check('aan de gewone punten verandert de vraag niets', (await standPunten()) === puntenVoor, await standPunten());

// --- 6. de eigen stand ---------------------------------------------------------------------------
await page.click('[data-weergave="stand"]');
await page.waitForSelector('[data-weekvraagrij]');
const stand = await page.$$eval('[data-weekvraagrij]', (r) => r.map((e) =>
  `${e.dataset.weekvraagrij}:${e.querySelector('.wgv').textContent}:${e.querySelector('.t').textContent}`));
check('op de Stand-tab staat de eigen stand: goed van meegedaan, de beste bovenaan',
  stand[0] === 'lid-1:1/1:1' && stand.includes('lid-2:0/1:0') && stand.includes('lid-3:0/0:0'), stand.join(' '));
check('met jouw rij gemarkeerd',
  await page.$eval('[data-weekvraagrij="lid-1"]', (e) => e.classList.contains('winnaar') && !!e.querySelector('.jij')));

await zet({ fp1: -5 * UUR, race: 2 * DAG, volgorde: VOLGORDE, keuzes: { 'lid-1': '10' } });
check('koos je de langzaamste, dan staat er dat je het fout had',
  (await page.getAttribute('.hero [data-weekvraag]', 'data-weekvraag')) === 'fout'
    && (await tekst('.hero [data-weekvraag]')).endsWith('jij had het fout'), await tekst('.hero [data-weekvraag]'));
await zet({ fp1: -5 * UUR, race: 2 * DAG, volgorde: VOLGORDE, keuzes: {} });
check('en deed je niet mee, dan staat de uitkomst er toch',
  (await page.getAttribute('.hero [data-weekvraag]', 'data-weekvraag')) === 'gemist'
    && (await tekst('.hero [data-weekvraag]')) === 'vraag van de week: COL was sneller · niet meegedaan',
  await tekst('.hero [data-weekvraag]'));
await zet({ fp1: -5 * UUR, race: 2 * DAG, top: ['4', '1', '10', '16', '81', '63', '12', '44', '14', '18'],
  keuzes: { 'lid-1': '10' } });
check('met alleen een top 10 wint wie daarin staat',
  (await page.getAttribute('.hero [data-weekvraag]', 'data-weekvraag')) === 'goed'
    && (await tekst('.hero [data-weekvraag]')).includes('GAS was sneller'), await tekst('.hero [data-weekvraag]'));
await zet({ fp1: -5 * UUR, race: 2 * DAG, top: LIJST.filter((n) => n !== '10'), keuzes: { 'lid-1': '10' } });
check('reed geen van beiden in de top 10 en is er geen hele volgorde, dan is er nog geen uitkomst',
  (await page.getAttribute('.hero [data-weekvraag]', 'data-weekvraag')) === 'dicht');

// --- na de race: op de kaart met de uitslag ------------------------------------------------------
await zet({ fp1: -3 * DAG, race: -3 * UUR, uitslag: true, volgorde: VOLGORDE, keuzes: { 'lid-1': '43' } });
check('na de race staat de afloop ook op de kaart met de uitslag',
  (await page.getAttribute('[data-lopend="uitslag"] [data-weekvraag]', 'data-weekvraag')) === 'goed',
  await page.$eval('[data-lopend]', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => 'geen kaart'));

// --- 4b. dicht zonder herladen ------------------------------------------------------------------
await zet({ fp1: UUR, keuzes: { 'lid-1': '10' }, herlaad: false });
await page.clock.install();
await page.reload();
await page.waitForSelector('.shell');
await page.click('[data-weergave="races"]');
await page.waitForSelector('.hero [data-weekvraag="open"]');
await page.clock.fastForward(UUR + 120e3);
await page.waitForSelector('.hero [data-weekvraag="dicht"]', { timeout: 5000 }).catch(() => {});
check('begint de training terwijl het scherm openstaat, dan gaan de knoppen vanzelf weg',
  (await page.getAttribute('.hero [data-weekvraag]', 'data-weekvraag')) === 'dicht'
    && (await page.$('[data-weekvraag-kies]')) === null);

// --- smal scherm ------------------------------------------------------------------------------------
await page.setViewportSize({ width: 360, height: 760 });
await zet({ fp1: 2 * DAG, keuzes: {} });
check('op 360 pixels passen de twee knoppen naast elkaar, zonder horizontale scroll', await page.evaluate(() => {
  const k = [...document.querySelectorAll('.hero [data-weekvraag-kies]')].map((b) => b.getBoundingClientRect());
  return k.length === 2 && k[0].top === k[1].top && k[1].right <= 360 && k.every((r) => r.height >= 44)
    && document.documentElement.scrollWidth <= 360;
}));

await page.click('[data-weergave="profiel"]');
await page.waitForSelector('details[data-pit="p-prestaties"]');
check('met de schakelaar aan is er ook de negende prestatie, Kenner',
  (await page.$('[data-prestatie="kenner"]')) !== null && (await page.$$('[data-prestatie]')).length === 9);
check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
