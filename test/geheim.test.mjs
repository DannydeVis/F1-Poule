// Geheim tot de deadline, in de app.
//
// De database geeft de voorspellingen en jokers van je medespelers pas als
// hun sessie dicht is (test/geheim.test.sql). Van de rest komt alleen mee dát
// iemand iets inleverde. Hier: dat de app daar goed mee omgaat.
//
// Wat hier vastligt:
//   1. wat de app binnenkrijgt: van Kim alleen wat dicht is, de rest als
//      "ingeleverd" zonder waarde; rechtstreeks uit answers en jokers idem;
//   2. de vinkjes kloppen nog: "1 van 3 ingeleverd" en Kim met een vinkje,
//      bovenaan staat alleen Joey bij wie nog geen top 10 heeft, en wie dit
//      weekend alleen iets inleverde wat nog geheim is, staat bij een
//      gesloten sessie niet als "niets ingevuld";
//   3. verstrijkt de deadline terwijl de app openstaat, dan haalt hij de
//      poule opnieuw op, en is de lijst van Kim daarna te bekijken; daarna
//      houdt het ophalen weer op;
//   4. laadde de app vlak ná een deadline (een klok die voorloopt op die van
//      de database), dan haalt hij het binnen een minuut nog eens op;
//   5. een speler van vóór de accounts die de app bij het openen pas
//      claimt, was bij het laden nog van niemand; zijn eigen open lijst kwam
//      dan alleen als "ingeleverd" mee. Na de claim haalt de app het opnieuw
//      op, en staat die lijst er weer.

import { maakControle, startPagina, meedoen, openRace } from './hulp.mjs';

const { check, afronden } = maakControle('geheim tot de deadline, in de app');

const KIM = "{ member_id:'lid-2', pool_id:'pool-1', display_name:'Kim', user_id:'account-van-kim' }";
const JOEY = "{ member_id:'lid-3', pool_id:'pool-1', display_name:'Joey', user_id:'account-van-joey' }";
const lijst = JSON.stringify(['81', '4', '1', '16', '44', '63', '12', '10', '14', '18']);
const metKim = (s, melbourneQuali = 'uur(24)') => s
  .replace("pool_members: [{ member_id:'lid-1', pool_id:'pool-1', display_name:'Danny', user_id:null }],",
    `pool_members: [{ member_id:'lid-1', pool_id:'pool-1', display_name:'Danny', user_id:null }, ${KIM}, ${JOEY}],`)
  .replace("deadline_quali:uur(24), deadline_race:uur(48)", `deadline_quali:${melbourneQuali}, deadline_race:uur(48)`)
  // Kim: in Melbourne de kwalificatie en de pole (nog open), in Shanghai de
  // pole (de kwalificatie is dicht) en de race-top 10 (nog open). Joey: alleen
  // de race-top 10 van Shanghai.
  .replace('  answers: [],', `  answers: [
    { pool_id:'pool-1', race_id:1, member_id:'lid-2', question_id:'quali_top10', waarde:${lijst} },
    { pool_id:'pool-1', race_id:1, member_id:'lid-2', question_id:'pole', waarde:'81' },
    { pool_id:'pool-1', race_id:2, member_id:'lid-2', question_id:'pole', waarde:'4' },
    { pool_id:'pool-1', race_id:2, member_id:'lid-2', question_id:'race_top10', waarde:${lijst} },
    { pool_id:'pool-1', race_id:2, member_id:'lid-3', question_id:'race_top10', waarde:${lijst} },
  ],`)
  .replace('  jokers: [],', `  jokers: [
    { pool_id:'pool-1', race_id:1, member_id:'lid-2' },
    { pool_id:'pool-1', race_id:2, member_id:'lid-2' },
  ],`);

// Wat de database de app geeft, via dezelfde nagebootste client en dezelfde
// sessie: de module staat al in het geheugen van de pagina.
const vraag = (page) => page.evaluate(async () => {
  const { createClient } = await import('./nabootsing-supabase.mjs');
  const db = createClient();
  const { data } = await db.rpc('poule_ophalen', { p_id: 'pool-1' });
  const { data: rijen } = await db.from('answers').select('*');
  const { data: jokers } = await db.from('jokers').select('*');
  const kort = (a) => `${a.race_id}|${a.member_id}|${a.question_id ?? ''}`;
  return {
    antwoorden: data.antwoorden.map(kort).sort(),
    ingeleverd: data.ingeleverd.map(kort).sort(),
    sleutelsIngeleverd: [...new Set(data.ingeleverd.flatMap((a) => Object.keys(a)))].sort(),
    jokers: data.jokers.map(kort).sort(),
    rechtstreeks: rijen.map(kort).sort(),
    jokersRechtstreeks: jokers.map(kort).sort(),
  };
});
const teller = (page) => page.evaluate(() => globalThis.__rpcTeller.poule_ophalen ?? 0);

{
  const { page, jsFouten, stoppen } = await startPagina({
    aanpassen: (s) => metKim(s),
    voorafAan: (p) => p.clock.install(),
  });
  await meedoen(page);

  // ---- 1. wat de app binnenkrijgt ------------------------------------------
  const uit = await vraag(page);
  check('van Kim krijgt de app alleen wat dicht is: de pole van Shanghai',
    uit.antwoorden.join() === '2|lid-2|pole', uit.antwoorden.join());
  check('de rest komt mee als ingeleverd',
    uit.ingeleverd.join() === '1|lid-2|pole,1|lid-2|quali_top10,2|lid-2|race_top10,2|lid-3|race_top10',
    uit.ingeleverd.join());
  check('zonder waarde: alleen race, speler en vraag',
    uit.sleutelsIngeleverd.join() === 'member_id,question_id,race_id', uit.sleutelsIngeleverd.join());
  check('rechtstreeks uit answers precies hetzelfde', uit.rechtstreeks.join() === '2|lid-2|pole',
    uit.rechtstreeks.join());
  check('en van de jokers alleen die van een begonnen weekend',
    uit.jokers.join() === '2|lid-2|' && uit.jokersRechtstreeks.join() === '2|lid-2|',
    `${uit.jokers.join()} / ${uit.jokersRechtstreeks.join()}`);

  // ---- 2. de vinkjes -------------------------------------------------------
  check('bovenaan staat alleen Joey bij wie nog geen top 10 heeft, Kim niet',
    (await page.textContent('.wachtop')).trim() === 'nog geen top 10: Joey',
    await page.textContent('.wachtop'));
  await openRace(page, 'Melbourne');
  await page.waitForSelector('.poulekaart');
  const kaart = await page.textContent('.poulekaart');
  check('op het racescherm: 1 van 3 ingeleverd, en Kim heeft ingeleverd',
    kaart.includes('1 van 3 ingeleverd')
      && await page.isVisible('.poulekaart .pouleregel.klaar:has-text("Kim")'), kaart.replace(/\s+/g, ' '));
  check('en haar keuze staat nergens op het scherm: Kim is geen knop',
    !(await page.$('[data-bekijk="lid-2"]')));

  // Shanghai: de kwalificatie is dicht, de race niet. Joey leverde alleen de
  // race in, en die is nog geheim. Bij de kwalificatie staat hij dan niet als
  // "niets ingevuld": hij deed dit weekend wel mee, zoals het ook stond
  // voordat de race geheim bleef.
  await openRace(page, 'Shanghai');
  await page.click('[data-tab="quali"]');
  await page.waitForSelector('.poulekaart');
  const joey = await page.textContent('.poulekaart .pouleregel:has-text("Joey")');
  check('wie dit weekend alleen iets geheims inleverde, staat niet als niets ingevuld',
    !joey.includes('niets ingevuld'), joey.replace(/\s+/g, ' '));

  // ---- 3. de deadline verstrijkt terwijl de app openstaat --------------------
  const voor = await teller(page);
  await page.clock.fastForward('24:00:31');
  await page.waitForFunction((n) => (globalThis.__rpcTeller.poule_ophalen ?? 0) > n, voor, { timeout: 5000 })
    .catch(() => {});
  check('na de deadline haalt de app de poule opnieuw op', await teller(page) > voor,
    `${voor} → ${await teller(page)}`);
  await page.waitForTimeout(200);
  await openRace(page, 'Melbourne');
  await page.click('[data-tab="quali"]').catch(() => {});
  await page.waitForSelector('[data-bekijk="lid-2"]');
  await page.click('[data-bekijk="lid-2"]');
  await page.waitForSelector('#inkijkterug');
  check('en daarna is de kwalificatie van Kim te bekijken',
    (await page.textContent('#paneel')).includes('PIA'), (await page.textContent('#paneel')).replace(/\s+/g, ' ').slice(0, 200));

  // Na de marge houdt het op: een paar tikken verder geen nieuwe ronde.
  await page.clock.fastForward('02:00');
  const daarna = await teller(page);
  await page.clock.fastForward('05:00');
  await page.waitForTimeout(200);
  check('en een paar minuten later haalt hij niet steeds opnieuw op', await teller(page) === daarna,
    `${daarna} → ${await teller(page)}`);

  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 4. geladen vlak na een deadline -------------------------------------------
// De kwalificatie van Melbourne sloot tien seconden voor het laden. Loopt de
// klok van het toestel voor op die van de database, dan kwamen de antwoorden
// van Kim nog niet mee. Binnen de minuut erna haalt de app het nog eens op.
{
  const { page, jsFouten, stoppen } = await startPagina({
    aanpassen: (s) => metKim(s, 'uur(-10 / 3600)'),
    voorafAan: (p) => p.clock.install(),
  });
  await meedoen(page);
  const voor = await teller(page);
  await page.clock.fastForward('00:31');
  await page.waitForFunction((n) => (globalThis.__rpcTeller.poule_ophalen ?? 0) > n, voor, { timeout: 5000 })
    .catch(() => {});
  check('wie vlak na een deadline laadde, haalt het binnen de minuut nog eens op', await teller(page) > voor,
    `${voor} → ${await teller(page)}`);
  await page.clock.fastForward('03:00');
  const daarna = await teller(page);
  await page.clock.fastForward('03:00');
  await page.waitForTimeout(200);
  check('en daarna niet meer', await teller(page) === daarna, `${daarna} → ${await teller(page)}`);
  check('geen javascriptfouten in de console (tweede keer)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 5. je eigen lijst na de claim ----------------------------------------------
// Danny is een speler van vóór de accounts (user_id leeg), en dit toestel weet
// nog dat hij het is. Hij had de kwalificatie van Melbourne al ingevuld. Bij
// het openen laadt de app eerst, en dan is Danny voor de database nog van
// niemand: zijn open lijst komt alleen als "ingeleverd" mee. Daarna claimt de
// app hem, en haalt hij het opnieuw op.
{
  const eigen = JSON.stringify(['1', '4', '16', '81', '63', '12', '44', '10', '14', '18']);
  const { page, jsFouten, stoppen } = await startPagina({
    aanpassen: (s) => metKim(s).replace('  answers: [\n', `  answers: [
    { pool_id:'pool-1', race_id:1, member_id:'lid-1', question_id:'quali_top10', waarde:${eigen} },\n`),
    voorafAan: (p) => p.addInitScript(() => {
      localStorage.setItem('poule:laatste', 'pool-1');
      localStorage.setItem('poule:pool-1:mijn_id', 'lid-1');
    }),
  });
  await page.waitForSelector('[data-race]');
  await openRace(page, 'Melbourne');
  await page.click('[data-tab="quali"]');
  await page.waitForSelector('#paneel');
  const vol = await page.$$eval('.slot.vol', (n) => n.length);
  check('na de claim staat je eigen open lijst er weer, alle tien', vol === 10, `${vol}/10`);
  check('geen javascriptfouten in de console (derde keer)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
