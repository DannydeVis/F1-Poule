// Automatisch doorschuiven, zoals de app het laat zien.
//
// De regel staat in de database (seizoenen_doorschuiven() in schema.sql,
// getest in test/seizoensdoorschuif.test.sql): een openbare poule meteen, de
// rest 7 dagen na de laatste race. Wat hier vastligt:
//
//   1. de 7 dagen in de app (DOORSCHUIF_NA_DAGEN) zijn de 7 van de database;
//   2. wie geen poulebaas is leest op welke dag de poule vanzelf doorgaat, in
//      een openbare poule dat het gebeurt zodra de kalender er is;
//   3. de poulebaas leest dat het vanzelf gaat en dat hij het ook eerder kan,
//      op het racesoverzicht en onder Poule;
//   4. na het doorschuiven, tot de eerste race van het nieuwe seizoen, een
//      kaart met de winnaar van vorig seizoen en zijn punten, het
//      seizoensverhaal en de weg naar dat jaar; daarna niet meer;
//   5. in het Engels.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, startPagina, meedoen, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('automatisch doorschuiven in de app');
const tekst = async (page, kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
const NAAST = [...UIT.slice(5, 10), ...UIT.slice(0, 5)];

// ---- 1. dezelfde 7 dagen --------------------------------------------------------
{
  const app = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
  const schema = readFileSync(join(wortel, 'schema.sql'), 'utf8');
  const inApp = Number(/const DOORSCHUIF_NA_DAGEN = (\d+);/.exec(app)?.[1]);
  const functie = schema.slice(schema.indexOf('create or replace function public.seizoenen_doorschuiven()'));
  const inDb = Number(/wacht constant interval := interval '(\d+) days';/.exec(functie)?.[1]);
  check(`de app en de database wachten even lang (${inApp} en ${inDb} dagen)`, inApp === 7 && inDb === inApp);
}

// Alle races van 2026 gereden, de finale `finaleDagen` geleden. Danny en Bram;
// Danny heeft elke race goed, Bram alles vijf plekken naast.
async function seizoenRond(page, { eigenaar = 'lid-1', openbaar = false, finaleDagen = 2, volgendJaar = true } = {}) {
  await page.evaluate(({ uit, naast, eigenaar, openbaar, finaleDagen, volgendJaar }) => {
    const d = globalThis.__db;
    const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
    const drivers = d.races[0].drivers;
    const n = d.races.length;
    for (const [i, r] of d.races.entries()) {
      const eind = -finaleDagen * 24 - (n - 1 - i) * 14 * 24;
      Object.assign(r, { drivers, deadline_quali: u(eind - 24), deadline_race: u(eind),
        quali_result: uit, race_result: uit });
    }
    if (!d.pool_members.some((l) => l.member_id === 'lid-bram')) {
      d.pool_members.push({ member_id: 'lid-bram', pool_id: 'pool-1', display_name: 'Bram', user_id: 'iemand-bram' });
    }
    for (const r of d.races)
      for (const [m, lijst] of [['lid-1', uit.slice(0, 10)], ['lid-bram', naast]])
        for (const q of ['quali_top10', 'race_top10'])
          d.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: m, question_id: q, waarde: lijst });
    if (volgendJaar && !d.races.some((r) => r.season === 2027)) {
      d.races.push({ ...d.races[0], id: 101, season: 2027, round: 1, name: 'Melbourne',
        deadline_quali: u(24 * 90), deadline_race: u(24 * 91), quali_result: null, race_result: null });
    }
    d.pools[0].owner_member_id = eigenaar;
    d.pools[0].is_public = openbaar;
    sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
  }, { uit: UIT, naast: NAAST, eigenaar, openbaar, finaleDagen, volgendJaar });
  await page.reload();
  await page.waitForSelector('[data-weergave]');
  if (await page.isVisible('#terug')) await page.click('#terug');
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('.kalender');
}
// De datum zoals de app hem schrijft: de finale plus 7 dagen.
const datum = (page, dagen) => page.evaluate((dagen) =>
  new Date(Date.now() + dagen * 864e5).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' }), dagen);

// ---- 2. wie geen poulebaas is ---------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await meedoen(page);
  await seizoenRond(page, { eigenaar: 'iemand-anders', finaleDagen: 2 });
  const blok = await tekst(page, '[data-vanzelf]');
  const op = await datum(page, 5);
  check('een speler leest op welke dag de poule vanzelf doorgaat (de finale plus 7 dagen)',
    blok.includes(`Op ${op} gaat de poule vanzelf door naar 2027.`), blok);
  check('en niet meer dat het op de poulebaas wacht', !blok.includes('poulebaas'), blok);
  check('zonder knop om door te schuiven', (await page.$('#doorschuiven')) === null);

  await seizoenRond(page, { eigenaar: 'iemand-anders', openbaar: true });
  const open = await tekst(page, '[data-vanzelf]');
  check('in een openbare poule: vanzelf zodra de kalender er is, zonder datum',
    open.includes('De poule gaat vanzelf door naar 2027 zodra de kalender er is.') && !/Op \d/.test(open), open);
  check('geen javascriptfouten (2)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 3 en 4. de poulebaas, en na het doorschuiven ---------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await meedoen(page);
  await seizoenRond(page, { finaleDagen: 1 });
  const op = await datum(page, 6);
  const blok = await tekst(page, '[data-vanzelf]');
  check('de poulebaas leest dat het vanzelf gaat, en dat hij het eerder kan',
    blok.includes(`Op ${op} gaat de poule vanzelf door naar 2027.`) && blok.includes('Wil je eerder, schuif dan nu door.'), blok);
  check('met de knop erbij', (await page.$('#doorschuiven')) !== null);
  check('vóór het doorschuiven geen kaart met de eindstand', (await page.$('[data-vorigseizoen]')) === null);
  await page.click('[data-weergave="poule"]');
  await page.waitForSelector('#nieuwSeizoenKnop');
  const poule = await tekst(page, '.kol, #app');
  check('onder Poule hetzelfde: de datum, en dat de knop eerder kan',
    poule.includes(`Op ${op} gaat de poule vanzelf door naar 2027. Wil je eerder, gebruik dan deze knop.`), poule.slice(0, 200));

  await page.click('#nieuwSeizoenKnop');
  await page.waitForSelector('.melding');
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('[data-vorigseizoen]');
  const kaart = await tekst(page, '[data-vorigseizoen]');
  const punten = Number(/Winnaar van 2026: Danny, met (\d+) punten\./.exec(kaart)?.[1]);
  check('na het doorschuiven staat bovenaan wie 2026 won, met zijn punten', punten > 0, kaart);
  check('met "Bekijk je seizoen 2026" en de weg naar 2026',
    kaart.includes('Bekijk je seizoen 2026') && kaart.includes('Naar 2026')
      && kaart.includes('staan in de keuzelijst bovenaan'), kaart);
  check('boven de kalender van 2027',
    await page.evaluate(() => {
      const k = document.querySelector('[data-vorigseizoen]');
      const r = document.querySelector('.kalender [data-race]');
      return !!k && !!r && (k.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING) > 0;
    }));

  await page.click('[data-naarvorig]');
  await page.waitForSelector('#seizoenkeuze');
  check('"Naar 2026" zet de keuzelijst op 2026', (await page.$eval('#seizoenkeuze', (e) => e.value)) === '2026');
  await page.click('[data-weergave="stand"]');
  await page.waitForSelector('.strij');
  const top = Number(await tekst(page, '.strij .t'));
  check('en de punten op de kaart zijn die van de eindstand', top === punten, `${top} en ${punten}`);

  await page.selectOption('#seizoenkeuze', '2027');
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('[data-vorigseizoen]');
  await page.click('[data-vorigverhaal]');
  await page.waitForSelector('.verhaal');
  check('"Bekijk je seizoen 2026" speelt het verhaal van 2026',
    (await page.$eval('.verhaal', (v) => v.getAttribute('aria-label'))) === 'Jouw seizoen 2026');
  await page.click('[data-verhaal-sla]');
  await page.waitForFunction(() => !document.querySelector('.verhaal'));

  // De eerste race van 2027 is begonnen: dan hoort de kaart er niet meer.
  await page.evaluate(() => {
    const d = globalThis.__db;
    const r = d.races.find((x) => x.season === 2027);
    r.deadline_quali = new Date(Date.now() - 3600e3).toISOString();
    sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
  });
  await page.reload();
  await page.waitForSelector('[data-weergave]');
  if (await page.isVisible('#terug')) await page.click('#terug');
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('.kalender');
  if (await page.$('#seizoenkeuze')) await page.selectOption('#seizoenkeuze', '2027');
  await page.waitForSelector('.kalender [data-race]');
  check('zodra de eerste race van 2027 begonnen is, is de kaart weg', (await page.$('[data-vorigseizoen]')) === null);
  check('geen javascriptfouten (3)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 5. in het Engels ---------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina({ taal: 'en' });
  await meedoen(page);
  await seizoenRond(page, { eigenaar: 'iemand-anders', finaleDagen: 3 });
  const op = await page.evaluate(() =>
    new Date(Date.now() + 4 * 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }));
  const blok = await tekst(page, '[data-vanzelf]');
  check('in het Engels: "On {date} the pool moves on to 2027 by itself."',
    blok.includes(`On ${op} the pool moves on to 2027 by itself.`), blok);
  check('geen javascriptfouten (5)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
