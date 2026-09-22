// Je seizoen delen buiten de poule.
//
// Dit stond op de lijst met "bewust niet gebouwd", en het bezwaar was dat een
// publiek profiel de deur weer openzet die fase 0 dichtdeed. Daarom werkt het
// andersom: je eigen app rekent je cijfers uit en legt ze als één blokje jsonb
// op je eigen spelersrij, en de publieke pagina leest alleen dát blokje.
//
// Wat hier vastligt:
//   1. Uit staat het uit: geen code, geen pagina, niets in de database.
//   2. Aanzetten levert een link op met alleen jouw getallen erin.
//   3. Die pagina toont geen poule, geen medespelers en geen inzendingen.
//   4. Een verzonnen code geeft een nette pagina en geen kapot scherm.
//   5. Weghalen haalt hem echt weg.
//   6. En de belangrijkste: de cijfers kloppen met wat de stand zegt.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('je seizoen delen');
const { page, jsFouten, stoppen, url } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const naarProfiel = async () => {
  await page.click('[data-weergave="profiel"]');
  await page.waitForSelector('#app');
};

await meedoen(page);

// Twee gereden races. Danny had Melbourne perfect (100) en Shanghai half.
// Michael doet mee zodat "plek 1 van 2" iets betekent.
await page.evaluate(() => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
  Object.assign(db.races[0], { deadline_quali: u(-50), deadline_race: u(-49),
    quali_result: uitslag, race_result: uitslag });
  Object.assign(db.races[1], { drivers: db.races[0].drivers,
    deadline_quali: u(-30), deadline_race: u(-29),
    quali_result: uitslag, race_result: uitslag });
  db.pool_members.push({ member_id: 'lid-2', pool_id: 'pool-1',
                         display_name: 'Michael', user_id: null });
  for (const q of ['quali_top10', 'race_top10']) {
    db.answers.push({ pool_id: 'pool-1', race_id: 1, member_id: 'lid-1',
                      question_id: q, waarde: uitslag.slice(0, 10) });
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('[data-race]');

// Wat zegt de stand? Dat getal moet straks op de publieke pagina staan.
await page.click('[data-weergave="stand"]');
await page.waitForSelector('.strij');
const standPunten = Number(await tekst('.strij .t'));
check('de stand geeft Danny zijn punten', standPunten === 100, String(standPunten));

// --- 1. uit is uit --------------------------------------------------------
await naarProfiel();
check('het aanbod om te delen staat er', (await page.$('#deelAan')) !== null);
check('maar er is nog geen link', (await page.$('#deellinkveld')) === null);
check('en niets in de database',
  (await page.evaluate(() => globalThis.__db.pool_members
    .filter((m) => m.profiel_code).length)) === 0);

// --- 2. aanzetten ---------------------------------------------------------
await page.click('#deelAan');
await page.waitForSelector('#deellinkveld');
const link = await page.inputValue('#deellinkveld');
check('er staat een deelbare link', /\?profiel=[a-z2-9]{6,}$/.test(link), link);

const rij = await page.evaluate(() => globalThis.__db.pool_members
  .find((m) => m.member_id === 'lid-1'));
check('en een momentopname in de database',
  !!rij.profiel_code && !!rij.profiel, JSON.stringify(rij.profiel));

// --- 6. de cijfers kloppen met de stand -----------------------------------
check('de opgeslagen punten kloppen met de stand',
  rij.profiel.punten === standPunten, `${rij.profiel.punten} tegen ${standPunten}`);
check('en de plek en het aantal spelers ook',
  rij.profiel.plek === 1 && rij.profiel.spelers === 2, JSON.stringify(rij.profiel));
check('het beste weekend is Melbourne met 100',
  rij.profiel.beste?.naam === 'Melbourne' && rij.profiel.beste?.punten === 100,
  JSON.stringify(rij.profiel.beste));
check('twintig plekken precies goed: twee perfecte top tienen',
  rij.profiel.exact === 20, String(rij.profiel.exact));

// Wat er NIET in mag. Dit is het hele punt van deze functie.
const sleutels = Object.keys(rij.profiel).sort();
check('de momentopname bevat geen poulenaam, code of medespelers',
  !sleutels.some((k) => /poule|pool|code|leden|spelers_namen|antwoord/.test(k))
  && !JSON.stringify(rij.profiel).includes('RTM026')
  && !JSON.stringify(rij.profiel).includes('Michael'),
  sleutels.join(', '));

// --- 3. de pagina zelf ----------------------------------------------------
const code = rij.profiel_code;
await page.goto(`${url}?profiel=${code}`);
await page.waitForFunction(() => document.body.textContent.includes('punten'));
const pagina = (await page.textContent('#app')).replace(/\s+/g, ' ');
check('de pagina noemt de speler', pagina.includes('Danny'), pagina.slice(0, 140));
check('en zijn punten', pagina.includes('100'), pagina.slice(0, 200));
check('en zijn plek', /1e/.test(pagina) && pagina.includes('van 2'), pagina.slice(0, 200));
check('en het beste weekend', pagina.includes('Melbourne'), pagina.slice(0, 250));
check('maar niet de poulenaam', !pagina.includes('Vrijdagmiddagpoule'), pagina.slice(0, 250));
check('niet de poulecode', !pagina.includes('RTM026'), pagina.slice(0, 250));
check('en geen medespeler', !pagina.includes('Michael'), pagina.slice(0, 250));
check('er is geen weg vanaf hier de poule in',
  (await page.$('[data-race]')) === null && (await page.$('#code')) === null);
check('wel een uitnodiging om zelf te beginnen',
  pagina.includes('Zelf een poule beginnen'));

// --- 4. een verzonnen code ------------------------------------------------
await page.goto(`${url}?profiel=bestaatniet`);
await page.waitForFunction(() => document.body.textContent.includes('bestaat niet')
  || document.body.textContent.includes('Naar RacePicks'));
const leeg = (await page.textContent('#app')).replace(/\s+/g, ' ');
check('een code die niet bestaat geeft een nette pagina',
  leeg.includes('bestaat niet'), leeg.slice(0, 140));
check('en een weg terug naar de app', leeg.includes('Naar RacePicks'));

// Iets wat er niet eens uitziet als een code hoort gewoon het startscherm te
// geven, en niet een foutpagina over een profiel dat niemand bedoelde.
await page.goto(`${url}?profiel=NIET$EEN/CODE`);
await page.waitForSelector('#code, [data-race], [data-lid]');
check('iets wat geen code is valt terug op het gewone scherm',
  (await page.$('#app')) !== null && !(await page.textContent('#app')).includes('bestaat niet'));

// --- 5. weghalen ----------------------------------------------------------
await page.goto(url);
await page.waitForSelector('[data-race]');
await naarProfiel();
await page.waitForSelector('#deelUit');
await page.click('#deelUit');
await page.waitForSelector('#deelAan');
check('weghalen wist de code en de momentopname',
  (await page.evaluate(() => {
    const m = globalThis.__db.pool_members.find((x) => x.member_id === 'lid-1');
    return !m.profiel_code && !m.profiel;
  })));

await page.goto(`${url}?profiel=${code}`);
await page.waitForFunction(() => document.body.textContent.includes('bestaat niet'));
check('en de pagina bestaat daarna echt niet meer',
  (await page.textContent('#app')).includes('bestaat niet'));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
