// Premium: teams binnen een poule (afdelingen, clubs of families tegen elkaar).
//
// Wie wat mag regelt de database (test/teams.test.sql); hier staat wat je ziet
// en doet. Wat hier vastligt:
//   1. Zonder premium is er niets van teams te zien, ook niet voor de
//      poulebaas.
//   2. Met premium maakt de poulebaas teams onder Poule, hernoemt ze en zet
//      spelers in een team. Een naam die al bestaat geeft uitleg.
//   3. Iedereen kiest zijn eigen team onder Profiel; een speler die geen
//      poulebaas is ziet het beheer van de teams niet.
//   4. Bij de stand staat de teamstand: gemiddeld per speler (anders wint het
//      grootste team), gelijk gemiddelde is gelijke plek, je eigen team
//      gemarkeerd, teams zonder spelers niet.
//   5. Een team weghalen haalt het uit de stand en zet zijn spelers op geen
//      team. Is premium voorbij, dan is alles weer weg.
//   6. In het Engels in het Engels; geen javascriptfouten.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('premium: teams binnen een poule');
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
const naar = async (w) => { await page.click(`[data-weergave="${w}"]`); await page.waitForTimeout(150); };
const bestaat = (sel) => page.$(sel).then(Boolean);
const tekst = (sel) => page.textContent(sel).then((t) => (t ?? '').replace(/\s+/g, ' ').trim());

// Danny is de poulebaas, Bram, Cor en Eva spelen mee. Twee gereden races, met
// de uitslag zo dat Bram, Cor en Eva alles goed hebben en Danny niets: dan is
// het gemiddelde per team uit te rekenen, en verschilt het van het totaal.
await db(`
  d.pools[0].owner_member_id = 'lid-1';
  d.pool_members.push({ member_id: 'lid-bram', pool_id: 'pool-1', display_name: 'Bram', user_id: 'iemand-bram' },
    { member_id: 'lid-cor', pool_id: 'pool-1', display_name: 'Cor', user_id: 'iemand-cor' },
    { member_id: 'lid-eva', pool_id: 'pool-1', display_name: 'Eva', user_id: 'iemand-eva' });
  const uit = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
  const mis = ['30', '31', '32', '33', '34', '35', '36', '37', '38', '39'];
  for (const r of d.races.slice(0, 2)) {
    r.quali_result = uit; r.race_result = uit;
    r.deadline_quali = new Date(Date.now() - 6e6).toISOString();
    r.deadline_race = new Date(Date.now() - 5e6).toISOString();
    for (const m of d.pool_members) for (const v of ['quali_top10', 'race_top10']) {
      d.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: m.member_id, question_id: v,
        waarde: ['lid-bram', 'lid-cor', 'lid-eva'].includes(m.member_id) ? uit : mis });
    }
  }`);
await page.reload();

// ---- 1. zonder premium -----------------------------------------------------------
await naar('poule');
const zonder = { beheer: await bestaat('#nieuwteam'), kies: false, stand: false };
await naar('profiel'); zonder.kies = await bestaat('#mijnteam');
await naar('stand'); zonder.stand = await bestaat('[data-teamstand]');
check('zonder premium geen teams: geen beheer, geen keuze, geen teamstand', !zonder.beheer && !zonder.kies && !zonder.stand,
  JSON.stringify(zonder));
await naar('poule');
check('de uitleg over premium noemt de teams', (await tekst('[data-premium-uitleg]')).includes('teams die tegen elkaar spelen'),
  await tekst('[data-premium-uitleg]'));

// ---- 2. met premium: teams maken --------------------------------------------------
await db(`d.pools[0].premium_tot = new Date(Date.now() + 864e5).toISOString();`);
await page.reload();
await naar('poule');
const nieuw = async (naam) => { await page.fill('#nieuwteam', naam); await page.click('#teamErbij'); await page.waitForTimeout(200); };
await nieuw('Sales');
await nieuw('IT');
await nieuw('Marketing');
{
  const teams = (await lees()).pool_teams ?? [];
  check('de poulebaas maakt teams, en ze staan in de database',
    teams.map((t) => t.naam).join(',') === 'Sales,IT,Marketing' && teams.every((t) => t.pool_id === 'pool-1'),
    JSON.stringify(teams));
}
await nieuw('sales');
check('een naam die al bestaat geeft uitleg', (await tekst('#teamsfout')).includes('al een team met die naam'), await tekst('#teamsfout'));
{
  const it = (await lees()).pool_teams.find((t) => t.naam === 'IT');
  await page.fill(`[data-teamregel="${it.id}"] input`, 'ICT');
  await page.click(`[data-teamregel="${it.id}"] [data-team-bewaar]`);
  await page.waitForTimeout(200);
  check('hernoemen', (await lees()).pool_teams.find((t) => t.id === it.id).naam === 'ICT');
}
// Spelers in een team zetten.
await page.selectOption('[data-team-van="lid-bram"]', { label: 'ICT' });
await page.waitForTimeout(200);
await page.selectOption('[data-team-van="lid-cor"]', { label: 'Sales' });
await page.waitForTimeout(200);
await page.selectOption('[data-team-van="lid-eva"]', { label: 'Sales' });
await page.waitForTimeout(200);
{
  const d = await lees();
  const team = (id) => d.pool_teams.find((t) => t.id === d.pool_members.find((m) => m.member_id === id).team_id)?.naam;
  check('de poulebaas zet spelers in een team', team('lid-bram') === 'ICT' && team('lid-cor') === 'Sales',
    `${team('lid-bram')} · ${team('lid-cor')}`);
}

// ---- 3. je eigen team kiezen -------------------------------------------------------
await naar('profiel');
await page.selectOption('#mijnteam', { label: 'Sales' });
await page.waitForTimeout(200);
{
  const d = await lees();
  const t = d.pool_teams.find((x) => x.id === d.pool_members.find((m) => m.member_id === 'lid-1').team_id);
  check('onder Profiel kies je je eigen team', t?.naam === 'Sales', t?.naam);
}

// ---- 4. de teamstand ----------------------------------------------------------------
await naar('stand');
{
  const rijen = await page.$$eval('[data-teamstand] [data-team]', (els) => els.map((e) => ({
    plek: e.querySelector('.p').textContent.trim(), naam: e.querySelector('.nm').textContent.trim(),
    gemiddeld: e.querySelector('.t').textContent.trim(), spelers: e.querySelector('.voor').textContent.trim(),
    zelf: e.classList.contains('zelf') })));
  const bram = (await page.$$eval('.strij', (els) => els.map((e) => [e.querySelector('.nm').textContent.trim(), e.querySelector('.t').textContent.trim()])))
    .find(([n]) => n.startsWith('Bram'))?.[1];
  // ICT: alleen Bram (B punten). Sales: Danny (0), Cor en Eva (B): samen 2B,
  // meer dan ICT, maar gemiddeld 2B/3, minder. Marketing: niemand.
  const salesGem = (2 * Number(bram) / 3).toFixed(1).replace('.', ',');
  check('de teamstand: gemiddeld per speler (niet het totaal), teams zonder spelers niet',
    rijen.length === 2 && rijen[0].naam === 'ICT' && rijen[0].gemiddeld === `${bram},0` && rijen[0].spelers === '1 speler'
      && rijen[1].naam === 'Sales' && rijen[1].gemiddeld === salesGem && rijen[1].spelers === '3 spelers'
      && rijen[0].plek === '1' && rijen[1].plek === '2',
    JSON.stringify({ rijen, bram, salesGem }));
  check('je eigen team is gemarkeerd', rijen.find((r) => r.naam === 'Sales')?.zelf === true && !rijen[0].zelf, JSON.stringify(rijen));
}
// Gelijk gemiddelde, gelijke plek: Bram in ICT, Cor en Eva in Sales, Danny
// zonder team.
await db(`
  const ict = d.pool_teams.find((t) => t.naam === 'ICT').id, sales = d.pool_teams.find((t) => t.naam === 'Sales').id;
  for (const m of d.pool_members) m.team_id = m.member_id === 'lid-bram' ? ict : m.member_id === 'lid-1' ? null : sales;`);
await page.reload();
await naar('stand');
{
  const plekken = await page.$$eval('[data-teamstand] [data-team] .p', (els) => els.map((e) => e.textContent.trim()));
  check('gelijk gemiddelde, gelijke plek', plekken.join(',') === '1,1', plekken.join(','));
}

// Een speler die geen poulebaas is: wel kiezen en de stand, niet het beheer.
await db(`d.pools[0].owner_member_id = 'lid-bram';`);
await page.reload();
await naar('poule');
const speler = { beheer: await bestaat('#nieuwteam'), kies: false, stand: false };
await naar('profiel'); speler.kies = await bestaat('#mijnteam');
await naar('stand'); speler.stand = await bestaat('[data-teamstand]');
check('een speler die geen poulebaas is kiest zijn team en ziet de teamstand, maar niet het beheer',
  !speler.beheer && speler.kies && speler.stand, JSON.stringify(speler));
await db(`d.pools[0].owner_member_id = 'lid-1';`);
await page.reload();

// ---- 5. weghalen, en premium voorbij -------------------------------------------------
await naar('poule');
{
  const ict = (await lees()).pool_teams.find((t) => t.naam === 'ICT');
  await page.click(`[data-teamregel="${ict.id}"] [data-team-weg]`);
  await page.waitForTimeout(200);
  const d = await lees();
  check('een team weghalen: weg uit de database, en zijn spelers zonder team',
    !d.pool_teams.some((t) => t.id === ict.id) && d.pool_members.find((m) => m.member_id === 'lid-bram').team_id == null,
    JSON.stringify(d.pool_teams));
  await naar('stand');
  const namen = await page.$$eval('[data-teamstand] [data-team] .nm', (els) => els.map((e) => e.textContent.trim()));
  check('en uit de teamstand', !namen.includes('ICT') && namen.includes('Sales'), namen.join(','));
}
await db(`d.pools[0].premium_tot = new Date(Date.now() - 864e5).toISOString();`);
await page.reload();
await naar('stand');
const na = { stand: await bestaat('[data-teamstand]'), beheer: false, kies: false };
await naar('poule'); na.beheer = await bestaat('#nieuwteam');
await naar('profiel'); na.kies = await bestaat('#mijnteam');
check('is premium voorbij, dan is er niets meer van te zien', !na.stand && !na.beheer && !na.kies, JSON.stringify(na));

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
    d.pool_teams = [{ id: 'team-a', pool_id: 'pool-1', naam: 'Sales' }];
    d.pool_members[0].team_id = 'team-a';
    sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
  });
  await en.reload();
  await en.click('[data-weergave="stand"]');
  await en.waitForSelector('[data-teamstand]');
  const t = (await en.textContent('[data-teamstand]')).replace(/\s+/g, ' ');
  check('in het Engels: de teamstand in het Engels', t.includes('Team standings') && t.includes('average per player'), t);
  check('geen javascriptfouten in het Engels', fouten.length === 0, fouten.join(' | '));
  await stop();
}

process.exit(afronden() ? 0 : 1);
