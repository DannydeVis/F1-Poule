// "Kunnen we iets moois maken met de races die al geweest zijn. Die blijven
// bovenaan staan."
//
// De kalender liep strak chronologisch, dus het seizoen duwde zichzelf naar
// beneden: in juni stonden er acht gereden races boven de race waar je
// eigenlijk iets mee moest. En eenmaal gereden zei een race alleen nog hoeveel
// punten jíj had gepakt — niet of dat goed was.
//
// Wat hier vastligt:
//   1. Wat nog komt staat boven, gereden races staan in een eigen lijst
//      eronder.
//   2. Daarbinnen staat de nieuwste bovenaan: terugkijken begint bij vorige
//      week, niet bij maart.
//   3. Bij elke gereden race staat wie dat weekend in de poule won — inclusief
//      een gedeelde winst, want die komt in een kleine poule zo voor.
//   4. Een weekend is pas gereden als de race er is geweest. "Als de
//      kwalificatie geweest is gaat de hele race naar beneden. Dat moet pas
//      na het weekend zijn." Tot dan blijft hij bij wat er nog komt, met
//      eronder wat je al pakte en een knop naar die punten; met de joker erbij.
//      Een weekend dat na de kwalificatie is afgelast is wel voorbij.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('gereden races');
const { page, jsFouten, stoppen } = await startPagina();

await meedoen(page);

// Drie gereden races en drie die nog komen. Wie de uitslag exact heeft pakt de
// punten; een lijst die drie plekken opgeschoven is levert niets op, want
// alleen twee plekken ernaast telt nog mee.
await page.evaluate(() => {
  const db = globalThis.__db;
  const uur = (n) => new Date(Date.now() + n * 3600e3).toISOString();
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
  const ernaast = [...uitslag.slice(3), ...uitslag.slice(0, 3)];

  db.pool_members.push(
    { member_id: 'lid-2', pool_id: 'pool-1', display_name: 'Michael', user_id: null },
    { member_id: 'lid-3', pool_id: 'pool-1', display_name: 'Davy', user_id: null });

  for (const [i, r] of db.races.entries()) {
    r.quali_result = uitslag;
    r.race_result = uitslag;
    r.deadline_quali = uur(-200 + i * 10);
    r.deadline_race = uur(-198 + i * 10);
  }
  for (const [i, naam] of ['Zandvoort', 'Monza', 'Baku'].entries()) {
    db.races.push({ id: 10 + i, season: 2026, round: 4 + i, name: naam,
      drivers: db.races[0].drivers,
      deadline_quali: uur(24 + i * 48), deadline_race: uur(48 + i * 48),
      quali_result: null, race_result: null, fastest_lap: null, fastest_pitstop: null,
      safety_cars: null, rode_vlag: null });
  }

  // Ronde 1 wint Danny, ronde 2 Michael, ronde 3 delen Michael en Davy hem.
  const raak = { 1: ['lid-1'], 2: ['lid-2'], 3: ['lid-2', 'lid-3'] };
  for (const r of db.races.filter((x) => x.race_result)) {
    for (const lid of ['lid-1', 'lid-2', 'lid-3']) {
      const lijst = (raak[r.round] ?? []).includes(lid) ? uitslag : ernaast;
      for (const vraag of ['quali_top10', 'race_top10']) {
        db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: lid,
          question_id: vraag, waarde: lijst });
      }
    }
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});

await page.reload();
await page.waitForSelector('[data-race]');

// --- twee lijsten, in de goede volgorde ------------------------------------
const koppen = await page.$$eval('.kol.links .label', (n) => n.map((e) => e.textContent.trim()));
check('er is een aparte lijst met gereden races',
  koppen.includes('gereden'), koppen.join(' / '));
check('en die staat ónder de kalender, niet erboven',
  koppen.indexOf('kalender') < koppen.indexOf('gereden'), koppen.join(' / '));

const rondes = await page.$$eval('[data-race] .rnd', (n) => n.map((e) => e.textContent.trim()));
check('wat nog komt staat bovenaan, gereden eronder',
  rondes.join() === '04,05,06,03,02,01', rondes.join());
check('en bij het terugkijken staat de nieuwste race eerst',
  rondes.slice(3).join() === '03,02,01', rondes.slice(3).join());

// --- en ze vertellen wie het weekend pakte ---------------------------------
const regel = async (naam) => (await page.textContent(
  `[data-race]:has(.nm:text-is("${naam}")) .st`)).replace(/\s+/g, ' ').trim();

check('een weekend dat jij won zegt dat ook',
  (await regel('Melbourne')).includes('jij won'), await regel('Melbourne'));
check('en anders staat de naam van de winnaar erbij',
  (await regel('Shanghai')).includes('Michael won'), await regel('Shanghai'));
// Op alfabet, want weekendUitslag() sorteert bij gelijke punten op naam. Dat
// is willekeurig maar wel elke keer hetzelfde, en dat is hier het punt.
check('een gedeelde winst noemt ze allebei',
  (await regel('Suzuka')).includes('Davy en Michael deelden'), await regel('Suzuka'));
check('je eigen punten blijven er gewoon bij staan',
  (await regel('Melbourne')).includes('ptn'), await regel('Melbourne'));

// Een race die nog moet komen heeft geen winnaar om te noemen.
check('bij een race die nog komt staat niets over winnen',
  !(await regel('Zandvoort')).includes('won'), await regel('Zandvoort'));

// --- 4. halverwege het weekend ------------------------------------------------
// Baku: de kwalificatie was gisteren, de race is morgen. Alle drie hadden ze
// de kwalificatie exact (50 punten); Danny en Michael hebben er een joker op.
await page.evaluate(() => {
  const db = globalThis.__db;
  const uur = (n) => new Date(Date.now() + n * 3600e3).toISOString();
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
  const baku = db.races.find((r) => r.name === 'Baku');
  Object.assign(baku, { deadline_quali: uur(-20), deadline_race: uur(20), quali_result: uitslag });
  for (const lid of ['lid-1', 'lid-2', 'lid-3']) {
    db.answers.push({ pool_id: 'pool-1', race_id: baku.id, member_id: lid,
      question_id: 'quali_top10', waarde: uitslag });
  }
  db.pools[0].jokers_vanaf = uur(-500);
  for (const lid of ['lid-1', 'lid-2']) db.jokers.push({ pool_id: 'pool-1', race_id: baku.id, member_id: lid });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('[data-race]');
const lijsten = () => page.$$eval('.kalender', (ks) => ks.map((k) =>
  [...k.querySelectorAll('.rnd')].map((e) => e.textContent.trim()).join()));

check('na de kwalificatie blijft het weekend bij wat er nog komt',
  (await lijsten()).join(' | ') === '04,05,06 | 03,02,01', (await lijsten()).join(' | '));
check('met de race gewoon open om in te vullen',
  (await regel('Baku')).startsWith('open'), await regel('Baku'));
check('en de weekendkaart noemt die punten "dit weekend", niet "vorig weekend"',
  (await page.textContent('.kaartvoet')).includes('dit weekend'), await page.textContent('.kaartvoet'));
{
  const strook = await page.$$eval('.tussenstand', (n) => n.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  check('eronder staat wat je in de kwalificatie pakte, met de joker erbij (50 × 2)',
    strook.length === 1 && strook[0].startsWith('Kwalificatie: 100 ptn'), strook.join(' | '));
  check('met een knop naar je punten', strook[0]?.includes('bekijken'), strook.join(' | '));
  check('en die strook hangt onder de rij van Baku',
    await page.$eval('.tussenstand', (e) => e.previousElementSibling?.querySelector('.nm')?.textContent.trim()) === 'Baku');
}
await page.click('.tussenstand');
await page.waitForSelector('[data-tab]');
check('die knop opent de uitslag van de kwalificatie',
  (await page.getAttribute('[data-tab="quali"]', 'aria-selected')) === 'true');
if (!(await page.$('.scorekaart'))) await page.click('[data-tab="quali"]');
await page.waitForSelector('.scorekaart');
{
  const binnen = (kies) => page.$eval(kies, (e) => e.textContent.trim()).catch(() => null);
  check('je punten staan er met de joker: 100, en hoe dat komt',
    (await binnen('.scorekaart .getal')) === '100' && (await binnen('.scorekaart .jokersom')) === '50 × 2 met je joker',
    (await page.textContent('.scorekaart')).replace(/\s+/g, ' ').trim());
}
{
  const poule = await page.$$eval('.poulekaart .pouleregel', (n) => n.map((e) => ({
    naam: e.querySelector('.nm').textContent.replace(/\s+/g, ' ').trim(), t: e.querySelector('.t')?.textContent.trim() })));
  const danny = poule.find((x) => x.naam.startsWith('Danny'));
  const michael = poule.find((x) => x.naam.startsWith('Michael'));
  const davy = poule.find((x) => x.naam.startsWith('Davy'));
  check('in de poule ernaast ook: wie een joker heeft 100 met 2×, Davy zonder joker 50',
    danny?.t === '100' && danny.naam.includes('2×') && michael?.t === '100' && michael.naam.includes('2×')
      && davy?.t === '50' && !davy.naam.includes('2×'), JSON.stringify(poule));
}
await page.click('.poulekaart [data-bekijk="lid-2"]');
await page.waitForSelector('.inkijkkop');
check('en wie je daar opent, ziet ook zijn punten met de joker',
  (await page.textContent('.inkijkkop .t')).trim() === '100', await page.textContent('.inkijkkop'));
await page.click('#inkijkterug');
await page.click('[data-weergave="races"]');
await page.click('#terug').catch(() => {});
await page.waitForSelector('.kalender');

// Het weekend is voorbij: de race is er. En Monza is na de kwalificatie
// afgelast; ook dat weekend is voorbij.
await page.evaluate(() => {
  const db = globalThis.__db;
  const uur = (n) => new Date(Date.now() + n * 3600e3).toISOString();
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
  Object.assign(db.races.find((r) => r.name === 'Baku'), { deadline_race: uur(-2), race_result: uitslag });
  Object.assign(db.races.find((r) => r.name === 'Monza'), { deadline_quali: uur(-30), deadline_race: uur(-28),
    quali_result: uitslag, afgelast: true });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('[data-race]');
check('met de race erbij gaat het weekend naar de gereden races, en na afgelasten ook',
  (await lijsten()).join(' | ') === '04 | 06,05,03,02,01', (await lijsten()).join(' | '));
check('en de strook is weg', (await page.$('.tussenstand')) === null);
check('en dan is het weer "vorig weekend"',
  (await page.textContent('.kaartvoet')).includes('vorig weekend'), await page.textContent('.kaartvoet'));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
