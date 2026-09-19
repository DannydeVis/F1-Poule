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

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
