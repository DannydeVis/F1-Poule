// Premium: eigen vragen van de poulebaas.
//
// Wie wat mag regelt de database (test/eigen-vragen.test.sql); hier staat wat
// je ziet en doet, en hoe de punten tellen. Wat hier vastligt:
//   1. Zonder premium is er niets van te zien.
//   2. Met premium zet de poulebaas op het racescherm een vraag met 2 tot 6
//      antwoorden; een vraag met één antwoord geeft uitleg.
//   3. Een speler kiest een antwoord (en kan het weer weghalen); een speler die
//      geen poulebaas is ziet het formulier en het kruisje niet.
//   4. Na de start: je ziet je eigen antwoord en hoe vaak elk antwoord gekozen
//      is; de poulebaas vult de uitkomst in. Een goed antwoord is 10 punten in
//      het weekend, dus ook in de stand, en een joker verdubbelt het.
//   5. Een vraag weghalen haalt ook de punten weg.
//   6. In het Engels in het Engels; geen javascriptfouten.

import { maakControle, startPagina, meedoen, openRace } from './hulp.mjs';

const { check, afronden } = maakControle('premium: eigen vragen van de poulebaas');
const { page, jsFouten, stoppen } = await startPagina();
await page.setViewportSize({ width: 390, height: 844 });
await meedoen(page);

const db = (fn) => page.evaluate((f) => {
  const d = globalThis.__db;
  // eslint-disable-next-line no-new-func
  new Function('d', f)(d);
  sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
}, fn);
const lees = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('nabootsing:db')));
const bestaat = (sel) => page.$(sel).then(Boolean);
const tekst = (sel) => page.textContent(sel).then((t) => (t ?? '').replace(/\s+/g, ' ').trim());

// De eerste race die nog niet begonnen is, en Bram die meespeelt.
await db(`
  d.pools[0].owner_member_id = 'lid-1';
  d.pool_members.push({ member_id: 'lid-bram', pool_id: 'pool-1', display_name: 'Bram', user_id: 'iemand-bram' });`);
const race = (await lees()).races.find((r) => Date.parse(r.deadline_race) > Date.now());
const naarRace = async () => {
  await page.reload();
  await openRace(page, race.name);
};

// ---- 1. zonder premium -----------------------------------------------------------
await naarRace();
check('zonder premium geen eigen vragen', !(await bestaat('[data-eigenvragen]')));

// ---- 2. met premium: een vraag zetten ---------------------------------------------
await db(`d.pools[0].premium_tot = new Date(Date.now() + 864e5).toISOString();`);
await naarRace();
check('met premium ziet de poulebaas het formulier op het racescherm', await bestaat('#eigenvraag'));
await page.fill('#eigenvraag', 'Regent het tijdens de race?');
await page.fill('#eigenopties', 'Ja');
await page.click('#eigenErbij');
await page.waitForTimeout(200);
check('een vraag met één antwoord geeft uitleg', (await tekst('#eigenfout')).includes('2 tot 6 antwoorden'), await tekst('#eigenfout'));
await page.fill('#eigenopties', ' Ja , Nee ');
await page.click('#eigenErbij');
await page.waitForTimeout(200);
const vraag = (await lees()).pool_eigen_vragen?.[0];
check('de vraag staat in de database, met de antwoorden zonder spaties',
  vraag?.vraag === 'Regent het tijdens de race?' && JSON.stringify(vraag?.opties) === '["Ja","Nee"]' && String(vraag?.race_id) === String(race.id),
  JSON.stringify(vraag));

// ---- 3. antwoorden -------------------------------------------------------------------
const kies = async (optie) => { await page.click(`[data-eigen-keuze="${vraag.id}"][data-optie="${optie}"]`); await page.waitForTimeout(200); };
const mijnKeuze = async (lid = 'lid-1') => ((await lees()).pool_eigen_antwoorden ?? [])
  .find((a) => a.vraag_id === vraag.id && a.member_id === lid)?.keuze ?? null;
await kies('Ja');
check('een speler kiest een antwoord', (await mijnKeuze()) === 'Ja'
  && (await page.getAttribute(`[data-eigen-keuze="${vraag.id}"][data-optie="Ja"]`, 'aria-pressed')) === 'true');
await kies('Ja');
check('nog een keer tikken haalt het weer weg', (await mijnKeuze()) === null);
await kies('Ja');

// Bram, die geen poulebaas is.
await db(`d.pools[0].owner_member_id = 'lid-bram';`);
await naarRace();
check('een speler die geen poulebaas is ziet de vraag, maar niet het formulier of het kruisje',
  (await bestaat(`[data-eigenvraag="${vraag.id}"]`)) && !(await bestaat('#eigenvraag')) && !(await bestaat('[data-eigen-weg]')));
await db(`d.pools[0].owner_member_id = 'lid-1';
  d.pool_eigen_antwoorden.push({ vraag_id: '${vraag.id}', member_id: 'lid-bram', keuze: 'Nee' });`);

// ---- 4. na de start: uitkomst en punten ----------------------------------------------
// De race is gereden, met een uitslag waar niemand een top 10 voor inleverde:
// dan is alles wat in de stand staat de eigen vraag.
await db(`
  const r = d.races.find((x) => String(x.id) === '${race.id}');
  r.deadline_quali = new Date(Date.now() - 6e6).toISOString();
  r.deadline_race = new Date(Date.now() - 5e6).toISOString();
  r.quali_result = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
  r.race_result = r.quali_result;`);
await naarRace();
{
  const blok = await tekst(`[data-eigenvraag="${vraag.id}"]`);
  check('na de start: je eigen antwoord en hoe vaak elk antwoord gekozen is', blok.includes('jij: Ja') && blok.includes('Ja 1 · Nee 1'), blok);
  check('en geen knoppen meer om te kiezen', !(await bestaat('[data-eigen-keuze]')));
}
const punten = async () => {
  if (await page.isVisible('#terug')) await page.click('#terug');
  await page.click('[data-weergave="stand"]');
  await page.waitForTimeout(150);
  return Object.fromEntries(await page.$$eval('.strij', (els) => els.map((e) =>
    [e.querySelector('.nm').textContent.trim().split(/\s/)[0], Number(e.querySelector('.t').textContent.trim())])));
};
check('zonder uitkomst nog geen punten', JSON.stringify(await punten()) === JSON.stringify({ Bram: 0, Danny: 0 }) || (await punten()).Danny === 0,
  JSON.stringify(await punten()));
await page.click('[data-weergave="races"]');
await openRace(page, race.name);
await page.selectOption(`[data-eigen-uitkomst="${vraag.id}"]`, 'Ja');
await page.waitForTimeout(200);
check('de poulebaas vult de uitkomst in', (await lees()).pool_eigen_vragen[0].uitkomst === 'Ja');
{
  const p = await punten();
  check('een goed antwoord is 10 punten in de stand, een fout antwoord 0', p.Danny === 10 && p.Bram === 0, JSON.stringify(p));
}
await db(`d.pools[0].jokers_vanaf = new Date(Date.now() - 864e5 * 400).toISOString();
  d.jokers = [...(d.jokers ?? []), { pool_id: 'pool-1', race_id: ${JSON.stringify(race.id)}, member_id: 'lid-1' }];`);
await page.reload();
{
  const p = await punten();
  check('een joker verdubbelt de punten van de eigen vraag', p.Danny === 20, JSON.stringify(p));
}

// ---- 5. weghalen ---------------------------------------------------------------------
await page.click('[data-weergave="races"]');
await openRace(page, race.name);
await page.click(`[data-eigen-weg="${vraag.id}"]`);
await page.waitForTimeout(200);
{
  const d = await lees();
  const p = await punten();
  check('een vraag weghalen haalt hem en zijn antwoorden weg, en de punten ook',
    !d.pool_eigen_vragen.length && !d.pool_eigen_antwoorden.length && p.Danny === 0, JSON.stringify(p));
}
check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();

// ---- 6. in het Engels ------------------------------------------------------------------
{
  const { page: en, jsFouten: fouten, stoppen: stop } = await startPagina({ taal: 'en' });
  await en.setViewportSize({ width: 390, height: 844 });
  await meedoen(en);
  await en.evaluate(() => {
    const d = globalThis.__db;
    Object.assign(d.pools[0], { owner_member_id: 'lid-1', premium_tot: new Date(Date.now() + 864e5).toISOString() });
    sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
  });
  await en.reload();
  await openRace(en, race.name);
  await en.waitForSelector('[data-eigenvragen]');
  const t = (await en.textContent('[data-eigenvragen]')).replace(/\s+/g, ' ');
  check('in het Engels: het blok in het Engels', t.includes('questions from the owner') && t.includes('points per right answer')
    && (await en.getAttribute('#eigenErbij', 'class')) !== null && (await en.textContent('#eigenErbij')).trim() === 'Add question', t);
  check('geen javascriptfouten in het Engels', fouten.length === 0, fouten.join(' | '));
  await stop();
}

process.exit(afronden() ? 0 : 1);
