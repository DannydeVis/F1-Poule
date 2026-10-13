// Premium: tussenklassementen met prijzen.
//
// Wie wat mag regelt de database (test/periodes.test.sql); hier staat wat je
// ziet, en hoe de stand per periode telt. Wat hier vastligt:
//   1. Zonder premium is er niets van te zien.
//   2. Met premium zet de poulebaas onder Poule periodes (naam, eerste en
//      laatste ronde, prijs); een lege naam geeft uitleg; aanpassen en
//      weghalen.
//   3. Onder de stand per periode de weekendpunten van alleen die rondes: nog
//      niet begonnen, bezig (wie leidt, geen winnaar), afgelopen (de winnaar
//      met de prijs). Gelijk aan de top is samen winnen.
//   4. Een speler die geen poulebaas is ziet de tussenklassementen, niet het
//      beheer. Na premium is alles weg.
//   5. In het Engels in het Engels; geen javascriptfouten.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('premium: tussenklassementen met prijzen');
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
const naar = async (w) => {
  if (await page.isVisible('#terug')) await page.click('#terug');
  await page.click(`[data-weergave="${w}"]`);
  await page.waitForTimeout(150);
};

// Danny is de poulebaas, Bram speelt mee. Bram heeft in elke race alles goed,
// Danny niets.
await db(`
  d.pools[0].owner_member_id = 'lid-1';
  d.pool_members.push({ member_id: 'lid-bram', pool_id: 'pool-1', display_name: 'Bram', user_id: 'iemand-bram' });`);
const begin = await lees();
const jaar = begin.pools[0].season ?? begin.races[0].season;
const races = begin.races.filter((r) => String(r.season) === String(jaar)).sort((a, b) => a.round - b.round);
const [r1, r2, r3] = races;
const uitslag = (r, aan = true) => `
  { const r = d.races.find((x) => String(x.id) === '${r.id}');
    const uit = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
    r.deadline_quali = new Date(Date.now() - 6e6).toISOString(); r.deadline_race = new Date(Date.now() - 5e6).toISOString();
    r.quali_result = ${aan ? 'uit' : 'null'}; r.race_result = ${aan ? 'uit' : 'null'};
    for (const m of ['lid-1', 'lid-bram']) for (const v of ['quali_top10', 'race_top10'])
      d.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: m, question_id: v,
        waarde: m === 'lid-bram' ? uit : ['30', '31', '32', '33', '34', '35', '36', '37', '38', '39'] }); }`;
await db(uitslag(r1));
await page.reload();

// ---- 1. zonder premium -----------------------------------------------------------
await naar('poule');
const zonder = { beheer: await bestaat('#nieuweperiode'), stand: false };
await naar('stand'); zonder.stand = await bestaat('[data-periodes]');
check('zonder premium geen tussenklassementen', !zonder.beheer && !zonder.stand, JSON.stringify(zonder));
await naar('poule');
check('de uitleg over premium noemt de tussenklassementen', (await tekst('[data-premium-uitleg]')).includes('tussenklassementen met prijzen'),
  await tekst('[data-premium-uitleg]'));

// ---- 2. met premium: periodes zetten -------------------------------------------------
await db(`d.pools[0].premium_tot = new Date(Date.now() + 864e5).toISOString();`);
await page.reload();
await naar('poule');
const zet = async (naam, van, tot, prijs) => {
  await page.fill('#nieuweperiode [data-p-naam]', naam);
  await page.selectOption('#nieuweperiode [data-p-van]', String(van));
  await page.selectOption('#nieuweperiode [data-p-tot]', String(tot));
  await page.fill('#nieuweperiode [data-p-prijs]', prijs);
  await page.click('#nieuweperiode [data-p-bewaar]');
  await page.waitForTimeout(200);
};
await zet('', r1.round, r2.round, '');
check('een lege naam geeft uitleg', (await tekst('#periodefout')).includes('1 tot 40 tekens'), await tekst('#periodefout'));
await zet('Voorjaar', r1.round, r2.round, 'Kratje bier');
await zet('Najaar', r3.round, r3.round, '');
{
  const p = (await lees()).pool_periodes ?? [];
  check('de poulebaas zet periodes, en ze staan in de database',
    p.length === 2 && p[0].naam === 'Voorjaar' && p[0].van_ronde === r1.round && p[0].tot_ronde === r2.round
      && p[0].prijs === 'Kratje bier' && p[1].prijs === null,
    JSON.stringify(p));
}

// ---- 3. de stand per periode --------------------------------------------------------
await naar('stand');
const periode = async (naam) => {
  const id = (await lees()).pool_periodes.find((x) => x.naam === naam).id;
  return {
    kop: await tekst(`[data-periode="${id}"] .periodekop`),
    winnaar: (await page.$(`[data-periode="${id}"] [data-periodewinnaar]`)) ? await tekst(`[data-periode="${id}"] [data-periodewinnaar]`) : null,
    rijen: await page.$$eval(`[data-periode="${id}"] .strij`, (els) => els.map((e) => [e.querySelector('.nm').textContent.trim(),
      Number(e.querySelector('.t').textContent.trim())])),
  };
};
const bramNaR1 = await page.$$eval('.strij', (els) => els.map((e) => [e.querySelector('.nm').textContent.trim(), e.querySelector('.t').textContent.trim()]))
  .then((r) => Number(r.find(([n]) => n.startsWith('Bram'))?.[1]));
{
  const v = await periode('Voorjaar');
  const n = await periode('Najaar');
  check('na één race van de twee: bezig, wie leidt, geen winnaar',
    v.kop.includes('bezig') && v.winnaar === null && v.rijen[0][0] === 'Bram' && v.rijen[0][1] === bramNaR1 && v.rijen[1][1] === 0,
    JSON.stringify(v));
  check('een periode die nog niet begonnen is zegt wanneer hij begint', n.kop.includes(`begint in ronde ${r3.round}`) && !n.rijen.length,
    JSON.stringify(n));
}
await db(uitslag(r2));
await page.reload();
await naar('stand');
{
  const v = await periode('Voorjaar');
  check('afgelopen: de winnaar met de prijs, en de punten van alleen die rondes',
    v.kop.includes('afgelopen') && v.winnaar?.includes('Bram wint: Kratje bier') && v.rijen[0][1] === 2 * bramNaR1,
    JSON.stringify(v));
}
// Gelijk aan de top: samen winnen.
await db(`for (const a of d.answers) if (a.member_id === 'lid-1') a.waarde = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];`);
await page.reload();
await naar('stand');
{
  const v = await periode('Voorjaar');
  check('gelijk aan de top is samen winnen', v.winnaar?.includes('Bram, Danny wint') || v.winnaar?.includes('Danny, Bram wint'), v.winnaar);
}

// Aanpassen en weghalen.
await naar('poule');
{
  const najaar = (await lees()).pool_periodes.find((x) => x.naam === 'Najaar');
  await page.fill(`[data-periodeform="${najaar.id}"] [data-p-prijs]`, 'Vrije middag');
  await page.click(`[data-periodeform="${najaar.id}"] [data-p-bewaar]`);
  await page.waitForTimeout(200);
  check('aanpassen', (await lees()).pool_periodes.find((x) => x.id === najaar.id).prijs === 'Vrije middag');
  await page.click(`[data-periodeform="${najaar.id}"] [data-p-weg]`);
  await page.waitForTimeout(200);
  check('weghalen', !(await lees()).pool_periodes.some((x) => x.id === najaar.id));
}

// ---- 4. een speler, en na premium -----------------------------------------------------
await db(`d.pools[0].owner_member_id = 'lid-bram';`);
await page.reload();
await naar('poule');
const speler = { beheer: await bestaat('#nieuweperiode'), stand: false };
await naar('stand'); speler.stand = await bestaat('[data-periodes]');
check('een speler die geen poulebaas is ziet de tussenklassementen, niet het beheer', !speler.beheer && speler.stand, JSON.stringify(speler));
await db(`d.pools[0].owner_member_id = 'lid-1'; d.pools[0].premium_tot = new Date(Date.now() - 864e5).toISOString();`);
await page.reload();
await naar('stand');
const na = { stand: await bestaat('[data-periodes]'), beheer: false };
await naar('poule'); na.beheer = await bestaat('#nieuweperiode');
check('na premium is er niets meer van te zien', !na.stand && !na.beheer, JSON.stringify(na));
check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();

// ---- 5. in het Engels ------------------------------------------------------------------
{
  const { page: en, jsFouten: fouten, stoppen: stop } = await startPagina({ taal: 'en' });
  await en.setViewportSize({ width: 390, height: 844 });
  await meedoen(en);
  await en.evaluate((r) => {
    const d = globalThis.__db;
    Object.assign(d.pools[0], { owner_member_id: 'lid-1', premium_tot: new Date(Date.now() + 864e5).toISOString() });
    d.pool_periodes = [{ id: 'p1', pool_id: 'pool-1', seizoen: r.season, naam: 'Spring', van_ronde: r.round, tot_ronde: r.round, prijs: 'A crate of beer' }];
    sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
  }, r3);
  await en.reload();
  await en.click('[data-weergave="stand"]');
  await en.waitForSelector('[data-periodes]');
  const t = (await en.textContent('[data-periodes]')).replace(/\s+/g, ' ');
  check('in het Engels: het blok in het Engels', t.includes('interim standings') && t.includes(`starts in round ${r3.round}`)
    && t.includes('prize: A crate of beer'), t);
  check('geen javascriptfouten in het Engels', fouten.length === 0, fouten.join(' | '));
  await stop();
}

process.exit(afronden() ? 0 : 1);
