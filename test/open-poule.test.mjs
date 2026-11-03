// De open poule voor wie nog alleen in zijn eigen poule zit (Danny, 3 november).
//
// "Ik wil dat ze vaker de app openen." In productie hadden zes van de negen
// poules maar één speler: niemand om te verslaan, dus geen stand, geen podium
// en geen plek in de uitslagmelding. In het blok "nog alleen jij" staat nu
// naast "deel de code" een tweede keuze: doe ook mee in de open poule (de code
// van de site, 80C98C). Wat hier vastligt:
//   1. Alleen in je poule: het blok noemt de open poule, met een knop.
//   2. De knop brengt je naar "Wie ben jij?" van de open poule. Daar doe je mee
//      met je naam, en dan sta je in de open poule, met de anderen.
//   3. Je eigen poule blijft staan, bij je andere poules. Terug in je eigen
//      poule staat de knop er niet meer (je zit er op dit toestel al in); de
//      code delen kan nog wel.
//   4. Met medespelers geen blok, en in de open poule zelf geen knop naar
//      zichzelf. Ook niet in een browser die niets mag onthouden: daar is het
//      lijstje met je poules leeg, en kijkt de app naar de poule zelf.
//   5. In het Engels.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, startPagina, meedoen, naarLijst, naDeClaim, wortel } from './hulp.mjs';
import { OPEN_POULE } from '../site/teksten.mjs';

const { check, afronden } = maakControle('de open poule voor wie alleen speelt');
const OPEN = '80C98C';

// De app heeft de code van de open poule zelf (OPEN_POULE in app/index.html);
// de site ook (site/teksten.mjs). Een andere open poule op de site en niet in
// de app, en de knop stuurt solospelers naar de oude.
const inApp = readFileSync(join(wortel, 'app', 'index.html'), 'utf8').match(/^const OPEN_POULE = (null|'([A-Z0-9]{6})');$/m);
check('de app en de site noemen dezelfde open poule', !!inApp && (inApp[2] ?? null) === OPEN_POULE && OPEN_POULE === OPEN,
  `app ${inApp?.[1]}, site ${OPEN_POULE}`);

// Danny alleen in de Vrijdagmiddagpoule; de open poule met twee spelers.
const zet = (page, { medespeler = false } = {}) => page.evaluate(({ OPEN, medespeler }) => {
  const db = globalThis.__db;
  db.pool_members = db.pool_members.filter((m) => m.member_id === 'lid-1');
  if (medespeler) db.pool_members.push({ member_id: 'lid-m1', pool_id: 'pool-1', display_name: 'Bram', user_id: 'm1' });
  db.pools.push({ id: 'pool-open', name: 'De open poule', join_code: OPEN, season: 2026, is_public: true });
  db.pool_members.push(
    { member_id: 'lid-o1', pool_id: 'pool-open', display_name: 'Ayrton', user_id: 'o1' },
    { member_id: 'lid-o2', pool_id: 'pool-open', display_name: 'Niki', user_id: 'o2' });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, { OPEN, medespeler });

const blok = (page) => page.evaluate(() => {
  const b = document.querySelector('[data-lege-poule]');
  return b ? {
    uitleg: b.querySelector('[data-open-poule]')?.textContent.replace(/\s+/g, ' ').trim() ?? null,
    knop: b.querySelector('#naarOpenPoule')?.textContent.trim() ?? null,
    delen: !!b.querySelector('#deelcode'),
  } : null;
});
const poule = (page) => page.evaluate(() => document.querySelector('#app')?.textContent.replace(/\s+/g, ' ') ?? '');

{
  const { page, jsFouten, stoppen } = await startPagina();
  await meedoen(page);
  await zet(page, { medespeler: true });
  await page.reload();
  await naarLijst(page);
  check('met een medespeler geen blok, en dus ook geen knop naar de open poule',
    (await page.$('[data-lege-poule]')) === null && (await page.$('#naarOpenPoule')) === null);

  await zet(page);
  await page.reload();
  await naarLijst(page);
  await page.waitForSelector('[data-lege-poule]');
  const alleen = await blok(page);
  check('alleen in je poule: het blok noemt de open poule, met een knop',
    alleen?.uitleg === 'Of speel nu al tegen anderen: doe ook mee in de open poule. Je eigen poule blijft gewoon staan.'
      && alleen.knop === 'Doe mee in de open poule' && alleen.delen, JSON.stringify(alleen));

  await page.click('#naarOpenPoule');
  const daar = await page.waitForSelector('#naam', { timeout: 8000 }).then(() => true, () => false);
  const kies = await page.evaluate(() => ({
    code: document.querySelector('.merk .code')?.textContent.trim(),
    namen: [...document.querySelectorAll('[data-lid] .nm')].map((x) => x.textContent.trim()),
    tekst: document.querySelector('#app')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 200),
  }));
  check('de knop brengt je naar "Wie ben jij?" van de open poule, met de spelers die er al in zitten',
    daar && kies.code === OPEN && kies.namen.join() === 'Ayrton,Niki', JSON.stringify(kies));
  if (!daar) { await stoppen(); process.exit(afronden() ? 0 : 1); }

  await page.fill('#naam', 'Danny');
  await page.click('#maak');
  await naDeClaim(page);
  const leden = await page.evaluate(() => globalThis.__db.pool_members
    .filter((m) => m.pool_id === 'pool-open').map((m) => m.display_name).sort().join());
  check('met je naam doe je mee: dan sta je in de open poule, met de anderen',
    leden === 'Ayrton,Danny,Niki' && (await page.$('[data-lege-poule]')) === null, leden);

  // Je eigen poule staat bij je andere poules, en daar is de knop weg.
  await page.click('[data-weergave="poule"]');
  await page.waitForSelector('[data-naar-poule]');
  const andere = await page.evaluate(() => [...document.querySelectorAll('[data-naar-poule] .nm')].map((x) => x.textContent.trim()));
  check('je eigen poule blijft staan, bij je andere poules', andere.includes('Vrijdagmiddagpoule'), JSON.stringify(andere));
  await page.click('[data-naar-poule]:has(.nm:text-is("Vrijdagmiddagpoule"))');
  await page.waitForSelector('[data-lege-poule]');
  const terug = await blok(page);
  check('terug in je eigen poule: de code delen kan nog, de knop naar de open poule is weg (je zit er al in)',
    terug?.delen && terug.knop === null && terug.uitleg === null, JSON.stringify(terug));
  check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

{
  // In de open poule zelf, als enige: geen knop naar zichzelf.
  const { page, jsFouten, stoppen } = await startPagina();
  await meedoen(page);
  await page.evaluate((OPEN) => {
    const db = globalThis.__db;
    db.pools[0].join_code = OPEN;
    db.pool_members = db.pool_members.filter((m) => m.member_id === 'lid-1');
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  }, OPEN);
  await page.reload();
  await naarLijst(page);
  await page.waitForSelector('[data-lege-poule]');
  const zelf = await blok(page);
  check('alleen in de open poule zelf: geen knop naar de open poule', zelf?.delen && zelf.knop === null, JSON.stringify(zelf));
  check('geen javascriptfouten in de open poule', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

{
  // Een browser die niets mag onthouden (privévenster, opslag dicht): het
  // lijstje met je poules blijft leeg. Dan houdt de poule zelf de knop weg.
  // Alleen de sleutels van de app gaan dicht; de nagebootste sessie blijft.
  const dicht = (p) => p.addInitScript(() => {
    const zet = Storage.prototype.setItem, weg = Storage.prototype.removeItem;
    const vanApp = (s, k) => s === window.localStorage && String(k).startsWith('poule:');
    Storage.prototype.setItem = function (k, v) {
      if (vanApp(this, k)) throw new DOMException('geen opslag', 'SecurityError');
      return zet.call(this, k, v);
    };
    Storage.prototype.removeItem = function (k) {
      if (vanApp(this, k)) throw new DOMException('geen opslag', 'SecurityError');
      return weg.call(this, k);
    };
  });
  const { page, jsFouten, stoppen, url } = await startPagina({ voorafAan: dicht });
  await page.waitForSelector('#code');
  await page.evaluate((OPEN) => {
    const db = globalThis.__db;
    db.pools[0].join_code = OPEN;
    db.pool_members = db.pool_members.filter((m) => m.member_id === 'lid-1');
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  }, OPEN);
  await page.goto(`${url}?code=${OPEN}`);
  await page.waitForSelector('[data-lid]');
  await page.click('[data-lid]');
  await naDeClaim(page);
  await page.waitForSelector('[data-lege-poule]');
  const zonder = await page.evaluate(() => ({
    geel: document.querySelector('#app')?.textContent.includes('mag niets onthouden'),
    knop: !!document.querySelector('#naarOpenPoule'),
  }));
  check('ook in een browser die niets mag onthouden: in de open poule zelf geen knop naar zichzelf',
    zonder.geel && !zonder.knop, JSON.stringify(zonder));
  check('geen javascriptfouten zonder opslag', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

{
  const { page, jsFouten, stoppen } = await startPagina({ taal: 'en' });
  await meedoen(page);
  await zet(page);
  await page.reload();
  await naarLijst(page);
  await page.waitForSelector('[data-lege-poule]');
  const en = await blok(page);
  check('in het Engels', en?.uitleg === 'Or play against others right away: join the open league too. Your own league stays as it is.'
    && en.knop === 'Join the open league', JSON.stringify(en));
  check('geen javascriptfouten in het Engels', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
