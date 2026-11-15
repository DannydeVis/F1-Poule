// Het weekendduel (14 november).
//
// Elk weekend speelt iedereen tegen één poulegenoot; wie dat weekend de meeste
// punten haalt wint het duel. Het is er om doordeweeks iets te hebben om naar
// te kijken, en het raakt de gewone punten niet. Wat hier vastligt:
//   1. Het schema is vast (iedereen tegen iedereen, op het rondenummer), dus
//      op elk toestel hetzelfde. Bij een oneven aantal is er één speler vrij.
//   2. Op de kaart van de volgende race staat tegen wie je speelt.
//   3. Na de race staat op de uitslagkaart hoe het afliep.
//   4. Op de Stand-tab staat de duelstand (winst, gelijk, verlies), vanaf
//      drie spelers.
//   5. Wie er later bij komt, verandert een gereden weekend niet meer.
//   6. In je eentje is er geen duel.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('het weekendduel');
const { page, jsFouten, stoppen } = await startPagina();
await page.setViewportSize({ width: 390, height: 844 });
const tekst = async (kies) => ((await page.textContent(kies)) ?? '').replace(/\s+/g, ' ').trim();
const LIJST = ['1', '12', '63', '16', '44', '4', '81', '10', '14', '18'];
const UUR = 3600e3;

// Spelers erbij, en Melbourne op een moment ten opzichte van nu.
async function zet({ spelers, start = null, uitslag = false, nieuw = null }) {
  await page.evaluate(({ spelers, start, uitslag, nieuw, LIJST }) => {
    const db = globalThis.__db;
    db.pool_members = db.pool_members.filter((m) => m.member_id === 'lid-1');
    for (const [i, naam] of spelers.entries()) {
      db.pool_members.push({ member_id: `lid-${i + 2}`, pool_id: 'pool-1', display_name: naam, user_id: null });
    }
    if (nieuw) db.pool_members.push({ member_id: 'lid-9', pool_id: 'pool-1', display_name: nieuw,
      user_id: null, created_at: new Date().toISOString() });
    const r = db.races.find((x) => x.id === 1);
    if (start !== null) {
      r.deadline_quali = new Date(Date.now() + start - 24 * 3600e3).toISOString();
      r.deadline_race = new Date(Date.now() + start).toISOString();
    }
    r.quali_result = uitslag ? LIJST : null; r.race_result = uitslag ? LIJST : null;
    db.answers = db.answers.filter((a) => a.race_id !== 1);
    // Danny en Sanne alles goed, Pipo alles om, Joe niets.
    const lijsten = { 'lid-1': LIJST, 'lid-2': LIJST, 'lid-4': [...LIJST].reverse() };
    for (const [lid, l] of Object.entries(lijsten)) {
      if (!db.pool_members.some((m) => m.member_id === lid)) continue;
      for (const q of ['quali_top10', 'race_top10']) {
        db.answers.push({ pool_id: 'pool-1', race_id: 1, member_id: lid, question_id: q, waarde: l });
      }
    }
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  }, { spelers, start, uitslag, nieuw, LIJST });
  await page.reload();
  await page.waitForSelector('.shell');
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('.hero, [data-lopend]');
}

await meedoen(page);

// --- in je eentje ------------------------------------------------------------
check('in je eentje staat er geen duel op de racekaart', (await page.$('.hero [data-duel]')) === null);

// --- drie spelers, ronde 1: één speler is vrij ---------------------------------
await zet({ spelers: ['Sanne', 'Joe'] });
check('met drie spelers is er elk weekend één vrij; in ronde 1 ben jij dat',
  (await page.getAttribute('.hero [data-duel]', 'data-duel')) === 'vrij'
    && (await tekst('.hero [data-duel]')).includes('dit weekend ben je vrij'), await tekst('.hero [data-duel]'));

// --- vier spelers, ronde 1: Danny tegen Pipo -----------------------------------
await zet({ spelers: ['Sanne', 'Joe', 'Pipo'] });
check('met vier spelers speel je in ronde 1 tegen de vierde',
  (await page.getAttribute('.hero [data-duel]', 'data-duel')) === 'lid-4'
    && (await tekst('.hero [data-duel]')).includes('jij tegen') && (await tekst('.hero [data-duel] b')) === 'Pipo',
  await tekst('.hero [data-duel]'));
check('met zijn rondje erbij, en zijn naam niet vertaalbaar',
  (await page.$('.hero [data-duel] .av')) !== null
    && await page.$eval('.hero [data-duel] b', (b) => b.closest('[translate="no"]') !== null));

// --- de race is gereden: de afloop op de uitslagkaart ---------------------------
await zet({ spelers: ['Sanne', 'Joe', 'Pipo'], start: -3 * UUR, uitslag: true });
check('na de race staat op de uitslagkaart dat je het duel won',
  (await page.getAttribute('[data-lopend] [data-duel-afloop]', 'data-duel-afloop')) === 'winst'
    && (await tekst('[data-lopend] [data-duel-afloop]')).includes('gewonnen')
    && (await tekst('[data-lopend] [data-duel-afloop] b')) === 'Pipo', await tekst('[data-lopend] [data-duel-afloop]'));

// --- een paar dagen later: de volgende ronde en de duelstand --------------------
await zet({ spelers: ['Sanne', 'Joe', 'Pipo'], start: -72 * UUR, uitslag: true });
check('in ronde 2 speel je tegen een ander',
  (await page.getAttribute('.hero [data-duel]', 'data-duel')) === 'lid-2', await tekst('.hero [data-duel]'));
await page.click('[data-weergave="stand"]');
await page.waitForSelector('[data-duelrij]');
const rij = async (id) => ({ wgv: await tekst(`[data-duelrij="${id}"] .wgv`), punten: await tekst(`[data-duelrij="${id}"] .t`) });
check('de duelstand: jij won van Pipo, drie punten',
  JSON.stringify(await rij('lid-1')) === '{"wgv":"1-0-0","punten":"3"}', JSON.stringify(await rij('lid-1')));
check('Pipo verloor', JSON.stringify(await rij('lid-4')) === '{"wgv":"0-0-1","punten":"0"}', JSON.stringify(await rij('lid-4')));
check('Sanne won van Joe, die niets inleverde',
  (await rij('lid-2')).wgv === '1-0-0' && (await rij('lid-3')).wgv === '0-0-1',
  `${JSON.stringify(await rij('lid-2'))} ${JSON.stringify(await rij('lid-3'))}`);
check('de winnaars staan bovenaan',
  (await page.$$eval('[data-duelrij]', (n) => n.slice(0, 2).map((e) => e.dataset.duelrij).sort().join())) === 'lid-1,lid-2');
check('de gewone stand telt gewoon de punten, niet de duels',
  (await tekst('.strij .t')) === '100', await tekst('.strij'));

// --- iemand komt er later bij ----------------------------------------------------
await zet({ spelers: ['Sanne', 'Joe', 'Pipo'], start: -72 * UUR, uitslag: true, nieuw: 'Nelis' });
await page.click('[data-weergave="stand"]');
await page.waitForSelector('[data-duelrij]');
check('wie er later bij komt verandert het gereden weekend niet',
  (await rij('lid-1')).wgv === '1-0-0' && (await rij('lid-4')).wgv === '0-0-1' && (await rij('lid-9')).wgv === '0-0-0',
  `${JSON.stringify(await rij('lid-1'))} ${JSON.stringify(await rij('lid-9'))}`);
await page.click('[data-weergave="races"]');
await page.waitForSelector('.hero [data-duel]');
check('maar doet in het volgende weekend wel mee: met vijf is er weer iemand vrij of een tegenstander',
  ['vrij', 'lid-2', 'lid-3', 'lid-4', 'lid-9'].includes(await page.getAttribute('.hero [data-duel]', 'data-duel')));

// --- twee spelers ------------------------------------------------------------------
await zet({ spelers: ['Sanne'], start: -72 * UUR, uitslag: true });
check('met z\'n tweeën speel je elk weekend tegen elkaar',
  (await page.getAttribute('.hero [data-duel]', 'data-duel')) === 'lid-2');
await page.click('[data-weergave="stand"]');
await page.waitForSelector('.strij');
check('en staat er geen duelstand: dat is hetzelfde als de onderlinge duels',
  (await page.$('[data-duelrij]')) === null && (await page.$('.duel')) !== null);

check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
