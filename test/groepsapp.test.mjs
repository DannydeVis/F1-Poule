// Het groepsapp-bericht, een poule met alleen jou, en de kleuren in de uitleg.
//
// Uit het feedbackrapport van 10 oktober, drie kleine dingen:
//   1. De tekst van "Deel de uitslag" krijgt een podium met medailles en de
//      grootste stijger in de stand. Daar gaat het gesprek in de groep over.
//   2. Wie net een poule maakte en er alleen in staat, krijgt bovenaan één
//      blok met één knop: deel de code in je groepsapp.
//   3. De 5, 3 en 1 in de puntenuitleg staan in de kleuren van het racescherm
//      (paars, groen, geel), zodat je die kleuren later herkent.

import { maakControle, startPagina, meedoen, openRace, naarLijst } from './hulp.mjs';

const { check, afronden } = maakControle('het groepsapp-bericht, een lege poule en de kleuren');
const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];

// Het klembord en het deelmenu vangen. navigator.share bestaat alleen als de
// test dat wil (window.__deelKan), want de app kijkt of hij er is.
const vangen = (p) => p.addInitScript(() => {
  window.__klembord = [];
  window.__gedeeld = [];
  window.__deelKan = false;
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
    writeText: async (t) => { window.__klembord.push(t); },
    write: async () => {},
  } });
  Object.defineProperty(navigator, 'share', { configurable: true,
    get: () => (window.__deelKan ? async (d) => { window.__gedeeld.push(d); } : undefined) });
});

// Danny en drie medespelers, Melbourne en Shanghai gereden. `fout` zegt wie
// er in Melbourne naast zat; in Shanghai is het precies andersom. Wie in
// Melbourne fout zat, klimt dus door Shanghai.
const zet = (page, fout) => page.evaluate(({ UIT, fout }) => {
  const db = globalThis.__db;
  db.pool_members = db.pool_members.filter((m) => m.member_id === 'lid-1');
  for (let i = 0; i < 3; i++) {
    db.pool_members.push({ member_id: `lid-m${i}`, pool_id: 'pool-1',
                           display_name: `Mede${i}`, user_id: `u${i}` });
  }
  const mis = [...UIT].reverse();
  db.answers = [];
  db.races.slice(0, 2).forEach((r, k) => {
    r.quali_result = UIT; r.race_result = UIT;
    r.deadline_quali = new Date(Date.now() - (8 - k) * 36e5).toISOString();
    r.deadline_race = new Date(Date.now() - (7 - k) * 36e5).toISOString();
    for (const m of db.pool_members) {
      const naast = fout.includes(m.member_id) === (k === 0);
      for (const v of ['quali_top10', 'race_top10']) {
        db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: m.member_id,
                          question_id: v, waarde: naast ? mis : UIT });
      }
    }
  });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, { UIT, fout });

const tekstVan = async (page, race) => {
  await openRace(page, race);
  await page.click('[data-deel]');
  await page.waitForSelector('.deelvenster [data-kopieer-tekst]');
  const voor = await page.evaluate(() => window.__klembord.length);
  await page.click('.deelvenster [data-kopieer-tekst]');
  await page.waitForFunction((n) => window.__klembord.length > n, voor);
  const t = await page.evaluate(() => window.__klembord.at(-1));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.deelvenster'));
  return t;
};

const { page, jsFouten, stoppen } = await startPagina({ voorafAan: vangen });

// ---- 3. de kleuren op het beginscherm ----------------------------------------------
await page.waitForSelector('#code');
const kleuren = await page.$$eval('.uitleg .pt', (n) =>
  n.map((b) => [b.className, b.textContent, getComputedStyle(b).color]));
check('in de uitleg op het beginscherm staan de 5, 3 en 1 als gekleurd blokje',
  kleuren.map(([k, t]) => `${k}:${t}`).join() === 'pt v5:5,pt v3:3,pt v1:1', JSON.stringify(kleuren));
check('in drie verschillende kleuren', new Set(kleuren.map(([, , c]) => c)).size === 3,
  kleuren.map(([, , c]) => c).join(' | '));
// Dezelfde kleuren als op het racescherm: de klassen v5, v3 en v1 zijn daar
// de punten per plek.
const zoalsRace = await page.evaluate(() => ['v5', 'v3', 'v1'].map((k) => {
  const s = document.createElement('span'); s.className = `pts ${k}`;
  document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c;
}));
check('en dat zijn de kleuren van het racescherm',
  kleuren.every(([, , c], i) => c === zoalsRace[i]), `${kleuren.map(([, , c]) => c)} / ${zoalsRace}`);

// ---- 1. het groepsapp-bericht ------------------------------------------------------
await meedoen(page);
await zet(page, ['lid-1', 'lid-m0']);
await page.reload();
const shanghai = await tekstVan(page, 'Shanghai');
const regels = shanghai.split('\n');
check('de kop noemt de race en de poule', regels[0] === '🏁 Shanghai, uitslag Vrijdagmiddagpoule', regels[0]);
// Danny en Mede0 allebei 100, de andere twee 12: gedeeld eerste is twee keer
// goud, en wie daarna komt is derde, dus brons, niet zilver.
check('het podium heeft medailles, gedeeld eerste allebei goud',
  regels.includes('🥇 Danny  100') && regels.includes('🥇 Mede0  100'), regels.slice(2, 6).join(' / '));
check('wie daarna gedeeld derde is, krijgt brons',
  regels.includes('🥉 Mede1  12') && regels.includes('🥉 Mede2  12') && !shanghai.includes('🥈'),
  regels.slice(2, 6).join(' / '));
check('de medaille staat in plaats van het plekgetal', !/^[123]\. /m.test(shanghai), shanghai);
const stijger = regels.find((r) => r.startsWith('📈')) ?? '';
check('onder het podium de grootste stijger, met van en naar welke plek; gelijk gestegen allebei',
  stijger === '📈 Grootste stijger: Danny (P3 → P1) en Mede0 (P3 → P1)', stijger);
check('en als laatste de stand van het seizoen',
  regels.at(-1) === '🏆 Seizoen: Danny 112, Mede0 112, Mede1 112, Mede2 112', regels.at(-1));

const melbourne = await tekstVan(page, 'Melbourne');
check('na het eerste weekend is er nog geen stijger: er valt niets te vergelijken',
  !melbourne.includes('📈') && melbourne.startsWith('🏁 Melbourne'), melbourne);

// Niemand stijgt: dan ook geen regel. Shanghai precies als Melbourne.
await page.evaluate(() => {
  const db = globalThis.__db;
  for (const a of db.answers) if (a.race_id === db.races[1].id) {
    a.waarde = db.answers.find((b) => b.race_id === db.races[0].id && b.member_id === a.member_id
      && b.question_id === a.question_id).waarde;
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
const stil = await tekstVan(page, 'Shanghai');
check('als niemand steeg, staat er geen stijger', !stil.includes('📈'), stil);

// ---- 2. een poule met alleen jou ---------------------------------------------------
await naarLijst(page);
check('met medespelers staat er geen blok voor een lege poule', (await page.$('[data-lege-poule]')) === null);
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pool_members = db.pool_members.filter((m) => m.member_id === 'lid-1');
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await naarLijst(page);
await page.waitForSelector('[data-lege-poule]');
const blok = await page.evaluate(() => {
  const b = document.querySelector('[data-lege-poule]');
  // Boven de weekendkaart, want daar kijkt iedereen als eerste.
  const kaart = document.querySelector('.hero[data-ronde]');
  return { tekst: b.textContent.replace(/\s+/g, ' ').trim(),
           boven: !!kaart && b.getBoundingClientRect().top < kaart.getBoundingClientRect().top,
           knop: document.querySelector('#deelcode')?.textContent.trim() };
});
check('alleen in je poule: boven de weekendkaart een blok met de code', blok.boven && blok.tekst.includes('RTM026'), blok.tekst);
check('en een knop om hem in je groepsapp te delen', blok.knop === 'Deel de code in je groepsapp', blok.knop);

await page.evaluate(() => { window.__deelKan = true; });
await page.click('#deelcode');
await page.waitForFunction(() => window.__gedeeld.length > 0);
const gedeeld = await page.evaluate(() => window.__gedeeld[0]);
check('met een deelmenu gaat de uitnodiging daarheen, met de link en de code',
  /^Doe mee met Vrijdagmiddagpoule:\nhttp.*\?code=RTM026$/.test(gedeeld?.text ?? ''), JSON.stringify(gedeeld));

await page.evaluate(() => { window.__deelKan = false; window.__klembord = []; });
await page.click('#deelcode');
await page.waitForFunction(() => window.__klembord.length > 0);
check('zonder deelmenu gaat dezelfde uitnodiging naar het klembord',
  (await page.evaluate(() => window.__klembord[0])) === gedeeld?.text);
check('en zegt de knop dat hij gekopieerd is',
  (await page.textContent('#deelcode')).includes('Gekopieerd'), await page.textContent('#deelcode'));

// Op de stand en de poulepagina staat dezelfde uitleg, ook gekleurd.
await page.click('[data-weergave="poule"]');
await page.waitForSelector('.uitleg .pt.v5');
check('ook de uitleg op de poulepagina is gekleurd', (await page.$$('.uitleg .pt')).length === 3);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();

// ---- in het Engels -----------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina({ taal: 'en', voorafAan: vangen });
  await page.waitForSelector('#code');
  check('in het Engels ook de gekleurde blokjes', (await page.$$('.uitleg .pt')).length === 3);
  await meedoen(page);
  await zet(page, ['lid-1']);
  await page.reload();
  const t = await tekstVan(page, 'Shanghai');
  const r = t.split('\n');
  check('en het bericht in het Engels',
    r[0] === '🏁 Shanghai, Vrijdagmiddagpoule results'
      && r.includes('📈 Biggest climber: Danny (P4 → P1)')
      && r.at(-1).startsWith('🏆 Season: '), t);
  check('geen javascriptfouten in het Engels', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
