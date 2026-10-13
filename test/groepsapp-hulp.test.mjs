// Premium: de groepsapp en de stand als bestand.
//
// Wat hier vastligt:
//   1. Zonder premium is er niets van te zien, en een speler die geen
//      poulebaas is ziet het ook niet.
//   2. Herinneren: in de kaart bovenaan en onder Poule. Het bericht noemt de
//      race, de sessie, wie nog niets invulde (en niet wie al wel) en de link.
//      Met de deelknop van het toestel; zonder naar het klembord; lukt dat ook
//      niet, dan in beeld.
//   3. De samenvatting: de weekendwinnaar, de top 5 van de stand met
//      medailles, het beste team, het tussenklassement, de volgende race en de
//      link.
//   4. De stand als CSV: een BOM, puntkomma's (komma's in het Engels), een
//      kolom per race, en een naam die Excel als formule zou lezen krijgt een
//      apostrof.
//   5. Afdrukken: alleen de stand, en na het afdrukken weer weg.
//   6. In het Engels in het Engels; geen javascriptfouten.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('premium: de groepsapp en de stand als bestand');
const { page, jsFouten, stoppen } = await startPagina();
await page.setViewportSize({ width: 390, height: 844 });
await meedoen(page);

const db = (fn, arg) => page.evaluate(([f, a]) => {
  const d = globalThis.__db;
  // eslint-disable-next-line no-new-func
  new Function('d', 'a', f)(d, a);
  sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
}, [fn, arg]);
const bestaat = (sel) => page.$(sel).then(Boolean);
const naar = async (w) => {
  if (await page.isVisible('#terug')) await page.click('#terug');
  await page.click(`[data-weergave="${w}"]`);
  await page.waitForTimeout(150);
};
const herlaad = async () => { await page.reload(); await page.waitForSelector('[data-weergave="races"]'); };

// Danny is de poulebaas. Melbourne is gereden: Danny alles goed, Bram alles
// vijf plekken naast, en "=SOM(1)" (een naam die Excel als formule zou
// lezen) niets. In Shanghai staat de race nog open: Bram heeft hem ingevuld,
// =SOM(1) niet.
const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
await db(`
  const [uit] = a;
  const naast = [...uit.slice(5), ...uit.slice(0, 5)];
  d.pools[0].owner_member_id = 'lid-1';
  d.pool_members.push({ member_id: 'lid-bram', pool_id: 'pool-1', display_name: 'Bram', user_id: 'iemand-bram' },
                      { member_id: 'lid-som', pool_id: 'pool-1', display_name: '=SOM(1)', user_id: 'iemand-som' });
  const r = d.races[0];
  r.quali_result = uit; r.race_result = uit;
  r.deadline_quali = new Date(Date.now() - 3 * 864e5).toISOString(); r.deadline_race = new Date(Date.now() - 2 * 864e5).toISOString();
  for (const [m, lijst] of [['lid-1', uit], ['lid-bram', naast]]) for (const v of ['quali_top10', 'race_top10'])
    d.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: m, question_id: v, waarde: lijst });
  d.answers.push({ pool_id: 'pool-1', race_id: d.races[1].id, member_id: 'lid-bram', question_id: 'race_top10', waarde: uit });`, [UIT]);
await herlaad();

// ---- 1. zonder premium ----------------------------------------------------------------
await naar('races');
const zonder = { kaart: await bestaat('[data-herinner]'), poule: false };
await naar('poule');
zonder.poule = await bestaat('[data-samenvatting], [data-export-csv]');
check('zonder premium niets van te zien', !zonder.kaart && !zonder.poule, JSON.stringify(zonder));
check('de uitleg over premium noemt de groepsapp en de stand als bestand',
  (await page.textContent('[data-premium-uitleg]')).replace(/\s+/g, ' ').includes('herinneringen en samenvattingen voor de groepsapp, de stand als bestand'));

// ---- 2. herinneren --------------------------------------------------------------------
await db(`d.pools[0].premium_tot = new Date(Date.now() + 864e5).toISOString();`);
await herlaad();
// De deelknop van het toestel nabootsen: onthouden wat er gedeeld werd.
const metDelen = () => page.evaluate(() => {
  window.__gedeeld = [];
  navigator.share = (d) => { window.__gedeeld.push(d.text); return Promise.resolve(); };
});
const gedeeld = () => page.evaluate(() => window.__gedeeld?.at(-1) ?? null);
await naar('races');
await metDelen();
check('in de kaart bovenaan staat "Herinner ze"', (await page.textContent('.wachtop [data-herinner]'))?.trim() === 'Herinner ze');
await page.click('.wachtop [data-herinner]');
await page.waitForTimeout(150);
{
  const t = await gedeeld();
  check('het bericht noemt de race, de sessie en wanneer hij sluit', /^⏰ Shanghai: de top 10 voor de race sluit .+\./.test(t ?? ''), t);
  check('wie nog niets invulde, en niet wie al wel', t?.includes('Nog niets ingevuld: =SOM(1)') && !t.includes('Bram'), t);
  check('en de link naar de poule', t?.includes('?code=RTM026'), t);
}
await naar('poule');
await metDelen();
check('onder Poule staat het met het aantal', (await page.textContent('[data-herinner]')).trim() === 'Herinner wie nog niets invulde (1)');
// Zonder deelknop: naar het klembord.
await page.evaluate(() => {
  delete navigator.share; navigator.share = undefined;
  window.__klembord = [];
  Object.defineProperty(navigator, 'clipboard', { configurable: true,
    value: { writeText: (t) => { window.__klembord.push(t); return Promise.resolve(); } } });
});
await page.click('[data-herinner]');
await page.waitForTimeout(150);
check('zonder deelknop gaat het naar het klembord', (await page.evaluate(() => window.__klembord.at(-1)))?.startsWith('⏰ Shanghai')
  && (await page.textContent('[data-herinner]')).trim() === 'Gekopieerd');
// En als ook dat niet lukt: in beeld.
await page.evaluate(() => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('nee')) } });
  document.execCommand = () => false;
});
await page.waitForTimeout(2600);
await page.click('[data-herinner]');
await page.waitForTimeout(150);
check('lukt ook dat niet, dan staat de tekst in beeld', await page.isVisible('#groepsappveld')
  && (await page.inputValue('#groepsappveld')).startsWith('⏰ Shanghai'));

// Iedereen ingevuld: geen knop, wel de melding.
await db(`d.answers.push({ pool_id: 'pool-1', race_id: d.races[1].id, member_id: 'lid-som', question_id: 'race_top10', waarde: a[0] });`, [UIT]);
await herlaad();
await naar('poule');
check('heeft iedereen ingevuld, dan geen herinnering maar een regel', !(await bestaat('[data-herinner]'))
  && (await page.textContent('[data-iedereen]')).includes('Iedereen heeft de top 10 voor Shanghai ingevuld.'));

// ---- 3. de samenvatting ---------------------------------------------------------------
await db(`
  d.pool_teams = [{ id: 't1', pool_id: 'pool-1', naam: 'Kantoor' }, { id: 't2', pool_id: 'pool-1', naam: 'Magazijn' }];
  for (const m of d.pool_members) m.team_id = m.member_id === 'lid-1' ? 't1' : 't2';
  d.pool_periodes = [{ id: 'p1', pool_id: 'pool-1', seizoen: 2026, naam: 'Voorjaar', van_ronde: 1, tot_ronde: 2, prijs: 'Kratje bier' }];`);
await herlaad();
await naar('poule');
await metDelen();
await page.click('[data-samenvatting]');
await page.waitForTimeout(150);
{
  const t = (await gedeeld()) ?? '';
  const regels = t.split('\n');
  check('de samenvatting begint met de race en de poule', regels[0] === '🏁 Melbourne · Vrijdagmiddagpoule', regels[0]);
  check('met de weekendwinnaar', regels[1] === '🏆 Weekendwinnaar: Danny (100 punten)', regels[1]);
  check('de stand met medailles, gelijke plekken gelijk', t.includes('📊 Stand na 1 van de 3 races\n🥇 Danny  100\n🥈 =SOM(1)  0\n🥈 Bram  0'), t);
  check('het beste team', t.includes('👥 Beste team: Kantoor (100,0 per speler)'), t);
  check('het tussenklassement: wie leidt', t.includes('🎯 Voorjaar: Danny leidt'), t);
  check('de volgende race, en de link', /⏭️ Volgende: Shanghai, sluit .+\n👉 .+\?code=RTM026$/.test(t), t);
}

// ---- 4. de stand als CSV --------------------------------------------------------------
const csv = async (p = page) => {
  const [download] = await Promise.all([p.waitForEvent('download'), p.click('[data-export-csv]')]);
  const stroom = await download.createReadStream();
  const delen = [];
  for await (const d of stroom) delen.push(d);
  return { naam: download.suggestedFilename(), tekst: Buffer.concat(delen).toString('utf8') };
};
{
  const { naam, tekst } = await csv();
  const regels = tekst.replace(/^﻿/, '').trim().split('\r\n');
  check('een bestand met de naam van de poule', naam === 'predict-the-race-stand-vrijdagmiddagpoule.csv', naam);
  check('met een BOM, zodat Excel de tekens goed leest', tekst.startsWith('﻿'));
  check('puntkomma\'s, een kolom per gereden race, en het team', regels[0] === 'plek;naam;team;totaal;1. Melbourne', regels[0]);
  check('een regel per speler', regels[1] === '1;Danny;Kantoor;100;100' && regels[3] === '2;Bram;Magazijn;0;0', regels.join(' | '));
  check('een naam die Excel als formule zou lezen krijgt een apostrof', regels[2] === "2;'=SOM(1);Magazijn;0;0", regels[2]);
}

// ---- 5. afdrukken ---------------------------------------------------------------------
await page.evaluate(() => { window.__geprint = null; window.print = () => {
  const el = document.querySelector('#afdruk');
  window.__geprint = { klasse: document.body.classList.contains('afdrukken'), tekst: el?.textContent.replace(/\s+/g, ' ').trim(),
    rijen: [...(el?.querySelectorAll('tbody tr') ?? [])].map((r) => [...r.children].map((c) => c.textContent).join('|')) };
}; });
await page.click('[data-afdrukken]');
{
  const p = await page.evaluate(() => window.__geprint);
  check('afdrukken zet de stand klaar en opent het afdrukvenster', p?.klasse && p.tekst.startsWith('Vrijdagmiddagpoule Stand na 1 van de 3 races'), JSON.stringify(p));
  check('met plek, naam, team, weekendzeges en punten', p?.rijen[0] === '1|Danny|Kantoor|1|100' && p.rijen.length === 3, JSON.stringify(p?.rijen));
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  check('na het afdrukken is het weer weg', !(await bestaat('#afdruk'))
    && !(await page.evaluate(() => document.body.classList.contains('afdrukken'))));
}

// ---- een speler, en na premium -----------------------------------------------------------
await db(`d.pools[0].owner_member_id = 'lid-bram'; d.answers = d.answers.filter((x) => !(x.member_id === 'lid-som' && x.race_id === d.races[1].id));`);
await herlaad();
await naar('races');
const speler = { kaart: await bestaat('[data-herinner]'), poule: false };
await naar('poule');
speler.poule = await bestaat('[data-samenvatting], [data-export-csv], [data-herinner]');
check('een speler die geen poulebaas is ziet het niet', !speler.kaart && !speler.poule, JSON.stringify(speler));
await db(`d.pools[0].owner_member_id = 'lid-1'; d.pools[0].premium_tot = new Date(Date.now() - 864e5).toISOString();`);
await herlaad();
await naar('races');
const na = { kaart: await bestaat('[data-herinner]'), poule: false };
await naar('poule');
na.poule = await bestaat('[data-samenvatting], [data-export-csv], [data-herinner]');
check('na premium is het weg', !na.kaart && !na.poule, JSON.stringify(na));
check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();

// ---- 6. in het Engels --------------------------------------------------------------------
{
  const { page: en, jsFouten: fouten, stoppen: stop } = await startPagina({ taal: 'en' });
  await en.setViewportSize({ width: 390, height: 844 });
  await meedoen(en);
  await en.evaluate((uit) => {
    const d = globalThis.__db;
    Object.assign(d.pools[0], { owner_member_id: 'lid-1', premium_tot: new Date(Date.now() + 864e5).toISOString() });
    const r = d.races[0];
    r.quali_result = uit; r.race_result = uit;
    r.deadline_quali = new Date(Date.now() - 3 * 864e5).toISOString(); r.deadline_race = new Date(Date.now() - 2 * 864e5).toISOString();
    for (const v of ['quali_top10', 'race_top10']) d.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: 'lid-1', question_id: v, waarde: uit });
    sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
  }, UIT);
  await en.reload();
  await en.click('[data-weergave="poule"]');
  await en.waitForSelector('[data-export-csv]');
  const knoppen = (await en.textContent('.groepsapphulp')).replace(/\s+/g, ' ').trim();
  check('in het Engels: de knoppen', knoppen.includes('Summary of Melbourne') && knoppen.includes('Standings as CSV'), knoppen);
  const { tekst } = await csv(en);
  check('in het Engels komma\'s in de CSV', tekst.replace(/^﻿/, '').startsWith('place,name,total,1. Melbourne'),
    tekst.split('\r\n')[0]);
  check('geen javascriptfouten in het Engels', fouten.length === 0, fouten.join(' | '));
  await stop();
}

process.exit(afronden() ? 0 : 1);
