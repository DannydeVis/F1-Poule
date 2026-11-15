// De kaart "nieuw in de app" op het racescherm (15 november).
//
// Het weekendduel, de vraag van de week en de prestaties vind je anders alleen
// als je er toevallig langs scrolt. Wat hier vastligt:
//   1. Een speler die er al was ziet één keer de kaart, met de drie nieuwe
//      dingen, bovenaan het racescherm.
//   2. "Begrepen" haalt hem weg, en hij blijft weg na herladen.
//   3. Wie er pas op of na de datum van de lijst bij kwam, krijgt hem niet.
//   4. Alleen op het racescherm: niet op Stand, Poule of Profiel.
//   5. In het Engels staat hij er in het Engels.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('nieuw in de app');
const { page, jsFouten, stoppen } = await startPagina({ nieuw: true });
await page.setViewportSize({ width: 390, height: 844 });
const tekst = async (kies) => ((await page.textContent(kies)) ?? '').replace(/\s+/g, ' ').trim();

// Sinds wanneer de speler meedoet, en opnieuw laden.
async function zet(sinds) {
  await page.evaluate((sinds) => {
    const db = globalThis.__db;
    const ik = db.pool_members.find((m) => m.member_id === 'lid-1');
    if (sinds) ik.created_at = sinds; else delete ik.created_at;
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  }, sinds);
  await page.reload();
  await page.waitForSelector('.shell');
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('.hero, [data-lopend], .kalender');
}

await meedoen(page);

await zet('2026-03-01T10:00:00Z');
check('een speler die er al was ziet de kaart op het racescherm',
  (await page.getAttribute('[data-nieuw]', 'data-nieuw')) === '2026-11-15'
    && (await tekst('[data-nieuw] .label')) === 'nieuw in de app');
const punten = await page.$$eval('[data-nieuw] li', (l) => l.map((e) => e.textContent.trim()));
check('met de drie nieuwe dingen: het weekendduel, de prestaties en het uitslagscherm',
  punten.length === 3 && punten[0].startsWith('Weekendduel:') && punten[1].startsWith('Prestaties: acht')
    && punten[2].startsWith('Uitslag:') && !punten.some((p) => /vraag van de week/i.test(p)), punten.join(' | '));
check('de kaart staat boven de kaart van de race', await page.evaluate(() => {
  const k = document.querySelector('[data-nieuw]'), r = document.querySelector('.hero, [data-lopend]');
  return !r || k.getBoundingClientRect().top < r.getBoundingClientRect().top;
}));
check('alleen op het racescherm: niet op Stand, Poule of Profiel', await (async () => {
  for (const w of ['stand', 'poule', 'profiel']) {
    await page.click(`[data-weergave="${w}"]`);
    await page.waitForTimeout(150);
    if (await page.$('[data-nieuw]')) return false;
  }
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('[data-nieuw]');
  return true;
})());
check('de knop is minstens 44 pixels hoog en de kaart past op 390 pixels', await page.evaluate(() => {
  const b = document.querySelector('#nieuwweg').getBoundingClientRect();
  return b.height >= 44 && document.documentElement.scrollWidth <= 390;
}));

await page.click('#nieuwweg');
await page.waitForFunction(() => !document.querySelector('[data-nieuw]'));
check('Begrepen haalt de kaart weg en het toestel onthoudt de datum',
  (await page.evaluate(() => localStorage.getItem('poule:nieuw'))) === '2026-11-15');
await zet('2026-03-01T10:00:00Z');
check('na herladen blijft hij weg', (await page.$('[data-nieuw]')) === null);

await page.evaluate(() => localStorage.setItem('poule:nieuw', '2026-10-01'));
await zet('2026-03-01T10:00:00Z');
check('wie een oudere lijst zag, krijgt de nieuwe wel', (await page.$('[data-nieuw]')) !== null);

await page.evaluate(() => localStorage.removeItem('poule:nieuw'));
await zet('2026-11-15T09:00:00Z');
check('wie er op de dag van de lijst bij kwam krijgt hem niet', (await page.$('[data-nieuw]')) === null);
await zet('2026-12-01T09:00:00Z');
check('en wie er later bij kwam ook niet', (await page.$('[data-nieuw]')) === null);
await zet(null);
check('een speler zonder datum (een oude rij) krijgt hem wel', (await page.$('[data-nieuw]')) !== null);

await page.addInitScript(() => { try { localStorage.setItem('poule:taal', 'en'); } catch { /* niets */ } });
await zet('2026-03-01T10:00:00Z');
check('in het Engels staat hij er in het Engels',
  (await tekst('[data-nieuw] .label')) === 'new in the app' && (await tekst('#nieuwweg')) === 'Got it'
    && (await tekst('[data-nieuw] li')).startsWith('Weekend duel:'), await tekst('[data-nieuw]'));

check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
