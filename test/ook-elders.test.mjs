// "Een voorspelling ook in je andere poules zetten."
//
// Wie met het werk en met vrienden in twee poules zit, vulde elk weekend twee
// keer dezelfde top 10 in. Nu staat onder Opslaan een tweede knop: "Opslaan,
// ook in je andere poules". Drie grenzen, en die liggen hier vast:
//
//   1. Alleen de top 10: de pole of een andere losse vraag gaat niet mee.
//   2. Alleen waar je die sessie nog helemaal niet hebt ingevuld; in een
//      poule waar je voor die sessie al iets had (ook alleen de pole), blijft
//      alles zoals het was.
//   3. Nooit overschrijven, ook niet als er tussen het kijken en het schrijven
//      een top 10 bij kwam (dat zit in de database: ON CONFLICT DO NOTHING).
//
// En verder:
//   4. De knop staat er alleen met een volle top 10 en als er andere poules
//      zijn; gewoon Opslaan zet niets in een andere poule.
//   5. Overgeslagen: een poule die deze top 10 niet doet, een ander seizoen,
//      geen speler op dit toestel, een speler van een ander toestel, en een
//      poule die weg is (die gaat ook uit het lijstje). Weet dit toestel niet
//      wie je in een poule bent, of onthield het de speler van een ander
//      account, dan gaat hij naar de speler van je account.
//   6. De melding zegt per poule wat er gebeurde.
//   7. Per sessie: de race gaat ook naar de poule waar de kwalificatie al
//      ingevuld was.
//   8. In het Engels staan de knop en de uitleg er ook.

import { maakControle, startPagina, meedoen, openRace, kiesTien, kiesVoor } from './hulp.mjs';

const { check, afronden } = maakControle('je top 10 ook in je andere poules');

// De poules. Vrijdagmiddagpoule is waar je speelt; de rest staat in het
// lijstje op dit toestel.
const POULES = [
  ['pool-2', 'Werk', 2026], ['pool-3', 'Vrienden', 2026], ['pool-4', 'Familie', 2026],
  ['pool-5', 'Oud', 2025], ['pool-6', 'Buren', 2026], ['pool-7', 'Club', 2026],
  ['pool-9', 'Al gedaan', 2026], ['pool-10', 'Laat', 2026],
  ['pool-11', 'Nieuw toestel', 2026], ['pool-12', 'Gedeeld', 2026],
];
// Een top 10 die je in een andere poule al had, anders dan wat je nu kiest.
const ANDERS = ['18', '14', '10', '81', '4', '44', '16', '63', '12', '1'];
const vastePoules = POULES.map(([id, name, season]) => `{ id:'${id}', name:'${name}', join_code:'${id.replace('pool-', 'CODE')}', season:${season} }`).join(', ');

const { page, jsFouten, stoppen } = await startPagina({
  aanpassen: (s) => s
    .replace("pools: [{ id:'pool-1', name:'Vrijdagmiddagpoule', join_code:'RTM026', season:2026 }],",
      `pools: [{ id:'pool-1', name:'Vrijdagmiddagpoule', join_code:'RTM026', season:2026 }, ${vastePoules}],`)
    .replace("pool_members: [{ member_id:'lid-1', pool_id:'pool-1', display_name:'Danny', user_id:null }],",
      `pool_members: [{ member_id:'lid-1', pool_id:'pool-1', display_name:'Danny', user_id:null },
        { member_id:'lid-2', pool_id:'pool-2', display_name:'Danny', user_id:null },
        { member_id:'lid-3', pool_id:'pool-3', display_name:'Danny', user_id:null },
        { member_id:'lid-3b', pool_id:'pool-3', display_name:'Kim', user_id:null },
        { member_id:'lid-4', pool_id:'pool-4', display_name:'Danny', user_id:null },
        { member_id:'lid-5', pool_id:'pool-5', display_name:'Danny', user_id:null },
        { member_id:'lid-6', pool_id:'pool-6', display_name:'Iemand', user_id:null },
        { member_id:'lid-7', pool_id:'pool-7', display_name:'Danny', user_id:'een-ander-account' },
        { member_id:'lid-9', pool_id:'pool-9', display_name:'Danny', user_id:null },
        { member_id:'lid-10', pool_id:'pool-10', display_name:'Danny', user_id:null },
        { member_id:'lid-11', pool_id:'pool-11', display_name:'Danny', user_id:null },
        { member_id:'lid-12', pool_id:'pool-12', display_name:'Sam', user_id:'een-ander-account' },
        { member_id:'lid-12b', pool_id:'pool-12', display_name:'Danny', user_id:null }],`)
    // Familie doet de race en de winnaar, niet de top 10 van de kwalificatie.
    .replace('  pool_questions: [],', `  pool_questions: [{ pool_id:'pool-4', question_id:'race_top10' }, { pool_id:'pool-4', question_id:'winnaar' }],`)
    // Vrienden: jij had de pole al, Kim haar race-top-10. Al gedaan: jij had
    // de kwalificatie al. Laat: ook, maar die rij kwam binnen nadat de app
    // keek (poule_ophalen ziet hem niet, zie hieronder).
    .replace('  answers: [],', `  answers: [
        { pool_id:'pool-3', race_id:1, member_id:'lid-3', question_id:'pole', waarde:'16' },
        { pool_id:'pool-3', race_id:1, member_id:'lid-3b', question_id:'race_top10', waarde:${JSON.stringify(ANDERS)} },
        { pool_id:'pool-9', race_id:1, member_id:'lid-9', question_id:'quali_top10', waarde:${JSON.stringify(ANDERS)} },
        { pool_id:'pool-10', race_id:1, member_id:'lid-10', question_id:'quali_top10', waarde:${JSON.stringify(ANDERS)}, laat:true }],`)
    .replace('antwoorden: kopie((store.answers ?? []).filter((a) => gelijk(a.pool_id, poule.id))),',
      'antwoorden: kopie((store.answers ?? []).filter((a) => gelijk(a.pool_id, poule.id) && !a.laat)),'),
});

const db = () => page.evaluate(() => JSON.parse(JSON.stringify(globalThis.__db)));
const antwoord = (d, pool, race, lid, vraag) => d.answers.find((a) => a.pool_id === pool && a.race_id === race
  && a.member_id === lid && a.question_id === vraag);
const melding = async () => (await page.textContent('.melding')).replace(/\s+/g, ' ').trim();

await meedoen(page);

// ---- 4. zonder andere poules geen knop ------------------------------------------
await openRace(page, 'Melbourne');
await kiesTien(page);
check('met alleen deze ene poule staat er geen tweede knop', (await page.$('#ookelders')) === null);

// De andere poules op dit toestel, plus een poule die niet meer bestaat.
// Buren wel in het lijstje, maar zonder speler van jou. Nieuw toestel: dit
// toestel weet niet wie je daar bent, je account wel. Gedeeld: dit toestel
// onthield Sam (een ander account), je account heeft daar Danny.
await page.evaluate((poules) => {
  const lijst = JSON.parse(localStorage.getItem('poule:poules') ?? '[]');
  for (const [id, name] of poules) lijst.push({ id, name, join_code: id, beschrijving: null });
  localStorage.setItem('poule:poules', JSON.stringify(lijst));
  for (const [id] of poules) if (!['pool-6', 'pool-11'].includes(id)) localStorage.setItem(`poule:${id}:mijn_id`, id.replace('pool-', 'lid-'));
  const db = JSON.parse(sessionStorage.getItem('nabootsing:db'));
  const ik = db.pool_members.find((m) => m.member_id === 'lid-1').user_id;
  for (const m of db.pool_members) if (['lid-11', 'lid-12b'].includes(m.member_id)) m.user_id = ik;
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, [...POULES, ['pool-8', 'Weg', 2026]]);
await page.reload();
await openRace(page, 'Melbourne');

// Alleen de pole, nog geen top 10: dan ook geen knop.
await kiesVoor(page, '[data-vraagplek="pole"]', '63');
check('met alleen de pole en nog geen top 10 staat hij er niet', (await page.$('#opslaan:not([disabled])')) !== null
  && (await page.$('#ookelders')) === null);
await kiesTien(page);
check('met een volle top 10 wel, met uitleg over wat hij doet',
  (await page.$('#ookelders')) !== null
    && /alleen waar je de kwalificatie nog niet hebt ingevuld\. Wat daar al staat, blijft staan\./.test(await page.textContent('#paneel')));

await page.setViewportSize({ width: 360, height: 780 });
check('en het past op 360 pixels', (await page.evaluate(() => document.documentElement.scrollWidth)) <= 360);
await page.setViewportSize({ width: 1280, height: 900 });

await page.click('#ookelders');
await page.waitForSelector('.melding');
const d = await db();
const mijn = antwoord(d, 'pool-1', 1, 'lid-1', 'quali_top10')?.waarde;

// ---- 1. alleen de top 10, en in de eigen poule gewoon opgeslagen ------------------
check('in je eigen poule opgeslagen, top 10 en pole', mijn?.length === 10 && antwoord(d, 'pool-1', 1, 'lid-1', 'pole')?.waarde === '63',
  JSON.stringify(mijn));
check('in Werk (sessie leeg) staat nu dezelfde top 10, en niet de pole',
  JSON.stringify(antwoord(d, 'pool-2', 1, 'lid-2', 'quali_top10')?.waarde) === JSON.stringify(mijn)
    && !antwoord(d, 'pool-2', 1, 'lid-2', 'pole') && d.answers.filter((a) => a.pool_id === 'pool-2').length === 1,
  JSON.stringify(d.answers.filter((a) => a.pool_id === 'pool-2')));
check('in Nieuw toestel en Gedeeld via de speler van je account, niet via Sam',
  JSON.stringify(antwoord(d, 'pool-11', 1, 'lid-11', 'quali_top10')?.waarde) === JSON.stringify(mijn)
    && JSON.stringify(antwoord(d, 'pool-12', 1, 'lid-12b', 'quali_top10')?.waarde) === JSON.stringify(mijn)
    && !antwoord(d, 'pool-12', 1, 'lid-12', 'quali_top10'), JSON.stringify(d.answers.filter((a) => ['pool-11', 'pool-12'].includes(a.pool_id))));
check('en je speler daar hangt nu aan je account, zoals bij het openen van die poule',
  !!d.pool_members.find((m) => m.member_id === 'lid-2')?.user_id
    && d.pool_members.find((m) => m.member_id === 'lid-2').user_id === d.pool_members.find((m) => m.member_id === 'lid-1').user_id);

// ---- 2. en 3. niets overschreven --------------------------------------------------
check('in Vrienden, waar je de pole al had: geen top 10 erbij, de pole ongemoeid',
  !antwoord(d, 'pool-3', 1, 'lid-3', 'quali_top10') && antwoord(d, 'pool-3', 1, 'lid-3', 'pole')?.waarde === '16');
check('in Al gedaan, waar je de kwalificatie al had: je eigen top 10 is blijven staan',
  JSON.stringify(antwoord(d, 'pool-9', 1, 'lid-9', 'quali_top10')?.waarde) === JSON.stringify(ANDERS));
check('in Laat, waar er een bij kwam nadat de app keek: ook die is blijven staan (de database overschrijft niet)',
  JSON.stringify(antwoord(d, 'pool-10', 1, 'lid-10', 'quali_top10')?.waarde) === JSON.stringify(ANDERS));

// ---- 5. overgeslagen --------------------------------------------------------------
check('overgeslagen: Familie (doet de kwalificatie niet), Oud (2025), Buren (geen speler), Club (ander toestel)',
  ['pool-4', 'pool-5', 'pool-6', 'pool-7'].every((p) => !d.answers.some((a) => a.pool_id === p)),
  JSON.stringify(d.answers.filter((a) => ['pool-4', 'pool-5', 'pool-6', 'pool-7'].includes(a.pool_id))));
const lijstNu = await page.evaluate(() => JSON.parse(localStorage.getItem('poule:poules') ?? '[]').map((p) => p.id));
check('en de poule die niet meer bestaat, is uit het lijstje', !lijstNu.includes('pool-8') && lijstNu.includes('pool-2'), lijstNu.join());

// ---- 6. de melding ---------------------------------------------------------------
const tekst = await melding();
check('de melding zegt per poule wat er gebeurde', [
  'Voorspelling voor Melbourne opgeslagen.',
  'Je top 10 voor de kwalificatie staat nu ook in Werk, Nieuw toestel en Gedeeld.',
  'In Vrienden, Al gedaan en Laat stond voor de kwalificatie al iets; daar is niets veranderd.',
  'In Familie en Oud doet deze top 10 niet mee.',
  'In Buren speel je op dit toestel niet mee.',
  'In Club hoort je speler bij een ander toestel.',
  'In Weg lukte het niet; zet hem daar zelf.',
].every((z) => tekst.includes(z)), tekst);

// ---- 7. de race: een andere sessie ------------------------------------------------
await openRace(page, 'Melbourne');
await page.click('[data-tab="race"]');
await kiesTien(page);
await page.click('#ookelders');
await page.waitForSelector('.melding');
const d2 = await db();
const race = antwoord(d2, 'pool-1', 1, 'lid-1', 'race_top10')?.waarde;
check('de race gaat naar Werk, naar Vrienden (daar was alleen de kwalificatie begonnen), naar Familie (die doet de race wel) en naar Al gedaan en Laat (daar was de race nog leeg)',
  race?.length === 10 && ['pool-2:lid-2', 'pool-3:lid-3', 'pool-4:lid-4', 'pool-9:lid-9', 'pool-10:lid-10', 'pool-11:lid-11', 'pool-12:lid-12b'].every((x) => {
    const [p, l] = x.split(':');
    return JSON.stringify(antwoord(d2, p, 1, l, 'race_top10')?.waarde) === JSON.stringify(race);
  }), JSON.stringify(d2.answers.filter((a) => a.question_id === 'race_top10').map((a) => a.pool_id)));
check('en Kims top 10 in Vrienden is niet aangeraakt',
  JSON.stringify(antwoord(d2, 'pool-3', 1, 'lid-3b', 'race_top10')?.waarde) === JSON.stringify(ANDERS));
check('de melding over de race, en Oud blijft overgeslagen', /Je top 10 voor de race staat nu ook in Werk, Vrienden, Familie, Al gedaan, Laat, Nieuw toestel en Gedeeld\. In Oud doet deze top 10 niet mee\./.test(await melding())
  && !d2.answers.some((a) => a.pool_id === 'pool-5'), await melding());

// ---- 4. gewoon Opslaan zet niets elders -------------------------------------------
await openRace(page, 'Shanghai');
await page.click('[data-tab="race"]');
await kiesTien(page);
const voor = (await db()).answers.filter((a) => a.pool_id !== 'pool-1').length;
await page.click('#opslaan');
await page.waitForSelector('.melding');
const d3 = await db();
check('gewoon Opslaan zet hem alleen in deze poule', !!antwoord(d3, 'pool-1', 2, 'lid-1', 'race_top10')
  && d3.answers.filter((a) => a.pool_id !== 'pool-1').length === voor
  && !/staat nu ook in/.test(await melding()), await melding());

// ---- in het Engels ---------------------------------------------------------------
await page.click('[data-weergave="profiel"]');
await page.click('[data-taal="en"]');
await page.click('[data-weergave="races"]');
await openRace(page, 'Shanghai');
await page.click('[data-tab="race"]');
await page.waitForSelector('#ookelders');
check('in het Engels: de knop en de uitleg', (await page.textContent('#ookelders')).trim() === 'Save, also in your other pools'
  && /only where you have not filled in the race yet\. Whatever is already there stays\./.test(await page.textContent('#paneel')),
  (await page.textContent('#ookelders')).trim());

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
