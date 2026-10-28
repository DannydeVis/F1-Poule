// Toegang tot een poule in de app (28 oktober): een nieuwe code, en op slot.
//
// Danny, over de code in de uitnodigingslink: "Is dit geen lek oid? Moet dat
// niet beter afgeschermd worden?" De regels staan in de database
// (test/toegang.test.sql); wat hier vastligt is wat je in de app ziet:
//   1. De poulebaas ziet onder Poule het blok "toegang", een medespeler niet.
//   2. Een nieuwe code: eerst vraagt de knop het nog een keer, dan staat de
//      nieuwe code er, zegt de app dat de oude niet meer werkt, en komt
//      iemand met de oude code er niet meer in. Met de nieuwe wel.
//   3. Op slot: de app zegt het, de uitnodigingslink is weg, openbaar maken
//      kan niet. Iemand van buiten krijgt bij de code én bij een link te
//      horen dat de poule op slot is, niet dat de code niet bestaat.
//   4. Van het slot af kan iemand met de code er weer in.
//   5. Een openbare poule op slot zetten maakt hem meteen ook niet openbaar.
//   6. In het Engels.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('toegang: een nieuwe code, en op slot');

const { page, jsFouten, stoppen, url } = await startPagina();
await meedoen(page);
const pool = () => page.evaluate(() => {
  const p = globalThis.__db.pools[0];
  return { code: p.join_code, slot: !!p.op_slot, openbaar: !!p.is_public };
});
const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const melding = () => tekst('.meldingbalk');
const naarPoule = async () => { await page.click('[data-weergave="poule"]'); await page.waitForSelector('.hero .code'); };

// Iemand van buiten: een leeg toestel (localStorage weg), dezelfde database.
// Daarna is Danny's toestel weer terug zoals het was.
const toestel = () => page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
const leegToestel = async (adres = url) => {
  await page.evaluate(() => localStorage.clear());
  await page.goto(adres);
  await page.waitForSelector('#code, #f');
};
const terugNaarDanny = async (bewaard) => {
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of JSON.parse(s)) localStorage.setItem(k, v); }, bewaard);
  await page.goto(url);
  // De app opent het scherm dat Danny het laatst open had (vaak Poule).
  await page.waitForSelector('[data-weergave]');
};
const codeIntikken = async (code) => {
  await page.fill('#code', code);
  await page.click('#mee');
};

// ---- 1. alleen voor de poulebaas -------------------------------------------------------
await naarPoule();
check('de poulebaas ziet het blok toegang, met een nieuwe code en op slot',
  !!(await page.$('#nieuweCode')) && !!(await page.$('#slotKnop')));

// ---- 2. een nieuwe code ------------------------------------------------------------------
const oud = (await pool()).code;
await page.click('#nieuweCode');
check('eerst vraagt de knop het nog een keer, en blijft de code wat hij was',
  (await tekst('#nieuweCode')) === 'Nieuwe code maken? Tik nog een keer' && (await pool()).code === oud);
await page.click('#nieuweCode');
await page.waitForFunction((o) => globalThis.__db.pools[0].join_code !== o, oud);
const nieuw = (await pool()).code;
check('dan is er een nieuwe code van zes tekens', /^[0-9A-F]{6}$/.test(nieuw) && nieuw !== oud, `${oud} → ${nieuw}`);
check('die staat op het scherm', (await tekst('.hero .code')) === nieuw);
check('en de app zegt dat de oude code en oude links niet meer werken',
  (await melding()).includes(`Nieuwe code: ${nieuw}. De oude code en oude links werken niet meer.`));
const danny = await toestel();

await leegToestel();
await codeIntikken(oud);
await page.waitForFunction(() => document.querySelector('#f')?.textContent.trim());
check('iemand met de oude code komt er niet meer in', (await tekst('#f')) === 'Die poulecode bestaat niet');
await codeIntikken(nieuw);
await page.waitForSelector('[data-lid], [data-race]', { state: 'attached' });
check('met de nieuwe wel', !!(await page.$('[data-lid], [data-race]')));
await terugNaarDanny(danny);

// ---- 3. op slot --------------------------------------------------------------------------
await naarPoule();
await page.click('#slotKnop');
await page.waitForFunction(() => !!globalThis.__db.pools[0].op_slot);
check('op slot: de app zegt het', (await melding()).includes('De poule is nu op slot.'));
check('de uitnodigingslink is weg, en er staat waarom',
  !(await page.$('#uitnodiging')) && (await tekst('[data-op-slot]')).includes('er kan niemand meer bij'));
check('openbaar maken kan niet zolang hij op slot is', !(await page.$('#openbaarKnop')));
check('de knop zegt nu "Haal van het slot"', (await tekst('#slotKnop')) === 'Haal van het slot');
const opSlot = 'Deze poule is op slot: er kan niemand meer bij. Vraag de poulebaas om hem van het slot te halen.';
const dannyOpSlot = await toestel();

await leegToestel();
await codeIntikken(nieuw);
await page.waitForFunction(() => document.querySelector('#f')?.textContent.trim());
check('iemand van buiten met de code hoort dat de poule op slot is', (await tekst('#f')) === opSlot, await tekst('#f'));
await leegToestel(`${url}?code=${nieuw}`);
await page.waitForFunction(() => document.querySelector('#f')?.textContent.trim());
check('en met de link ook', (await tekst('#f')) === opSlot, await tekst('#f'));
await terugNaarDanny(dannyOpSlot);
check('Danny zelf ziet zijn poule gewoon', !!(await page.$('.hero .code'))
  && (await tekst('.hero .code')) === nieuw);

// ---- 4. van het slot af --------------------------------------------------------------------
await naarPoule();
await page.click('#slotKnop');
await page.waitForFunction(() => !globalThis.__db.pools[0].op_slot);
check('van het slot af: de app zegt het', (await melding()).includes('De poule is weer open voor wie de code heeft.'));
check('en de uitnodigingslink is terug', !!(await page.$('#uitnodiging')));
const dannyOpen = await toestel();
await leegToestel();
await codeIntikken(nieuw);
await page.waitForSelector('[data-lid], [data-race]', { state: 'attached' });
check('iemand met de code komt er weer in', !!(await page.$('[data-lid], [data-race]')));
await terugNaarDanny(dannyOpen);

// ---- 5. een openbare poule op slot ------------------------------------------------------------
await naarPoule();
await page.click('#openbaarKnop');
await page.waitForFunction(() => !!globalThis.__db.pools[0].is_public);
await page.waitForSelector('[data-slot]');
check('bij een openbare poule zegt het blok dat hij dan uit de lijst gaat',
  (await tekst('[data-slot]')).includes('Hij staat dan ook niet meer in de lijst met openbare poules.'));
await page.click('#slotKnop');
await page.waitForFunction(() => !!globalThis.__db.pools[0].op_slot);
check('op slot zetten maakt hem meteen ook niet openbaar', (await pool()).slot && !(await pool()).openbaar,
  JSON.stringify(await pool()));
await page.click('#slotKnop');
await page.waitForFunction(() => !globalThis.__db.pools[0].op_slot);

// ---- 1b. een medespeler ziet het blok niet ---------------------------------------------------
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pool_members.push({ member_id: 'lid-baas', pool_id: 'pool-1', display_name: 'Baas', user_id: 'iemand-anders' });
  db.pools[0].owner_member_id = 'lid-baas';
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('[data-weergave]');
await naarPoule();
check('een medespeler ziet het blok toegang niet', !(await page.$('#nieuweCode')) && !(await page.$('#slotKnop')));
check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();

// ---- 6. in het Engels --------------------------------------------------------------------------
{
  const { page, stoppen } = await startPagina({ taal: 'en' });
  await meedoen(page);
  await page.click('[data-weergave="poule"]');
  await page.waitForSelector('#nieuweCode');
  check('in het Engels', (await page.textContent('#nieuweCode')).trim() === 'Make a new code'
    && (await page.textContent('#slotKnop')).trim() === 'Lock');
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
