#!/usr/bin/env node
/**
 * De plaatjes voor de premiumpagina: schermafdrukken van elk premium-onderdeel,
 * uit de app zelf.
 *
 *   node scripts/maak-premiumbeelden.mjs
 *
 * Net als maak-beelden.mjs geen onderdeel van de gewone gang van zaken: draai
 * dit als een premium-onderdeel er anders uit is gaan zien, en zet de nieuwe
 * plaatjes in de repo. Het gebruikt de nabootsing uit de tests en de
 * voorbeeldpoule, met premium aan; de namen in beeld zijn verzonnen.
 *
 *   site/beeld/premium-{onderdeel}-{nl,en}-{licht,donker}.jpg
 *
 * De onderdelen staan in ONDERDELEN hieronder; site/paginas.mjs noemt ze bij
 * naam (beeld: 'teams'), en test/premiumpagina.test.mjs kijkt of elk plaatje
 * dat de pagina noemt ook bestaat.
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startPagina, meedoen, naarLijst } from '../test/hulp.mjs';
import { vulPoule, POULENAAM } from './voorbeeldpoule.mjs';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(wortel, 'site', 'beeld'), { recursive: true });

export const PREMIUM_TALEN = ['nl', 'en'];
// De maten van elk plaatje, voor width en height op de pagina (dan verspringt
// er niets tijdens het laden). maak-site.mjs leest dit bestand.
const MATEN_PAD = join(wortel, 'site', 'premium-maten.json');
const maten = existsSync(MATEN_PAD) ? JSON.parse(readFileSync(MATEN_PAD, 'utf8')) : {};
export const ONDERDELEN = ['profiel', 'teams', 'periodes', 'vragen', 'tik', 'groepsapp'];

// Premium aan op de voorbeeldpoule, met van elk onderdeel iets erin.
const TEKST = {
  nl: { teams: ['Verkoop', 'Techniek', 'Directie'], periodes: [['Voorjaar', 'Taart van de bakker'], ['Zomer', 'Een rondje van de zaak']],
    vraag: 'Valt er een Ferrari uit?', opties: ['Ja', 'Nee'], vraag2: 'Hoeveel pitstops maakt de winnaar?', opties2: ['1', '2', '3 of meer'],
    sponsor: 'Bakkerij Jansen' },
  en: { teams: ['Sales', 'Engineering', 'Management'], periodes: [['Spring', 'Cake from the bakery'], ['Summer', 'A round on the house']],
    vraag: 'Will a Ferrari retire?', opties: ['Yes', 'No'], vraag2: 'How many pit stops for the winner?', opties2: ['1', '2', '3 or more'],
    sponsor: 'Jansen Bakery' },
};
const maakPremium = (t) => {
  const db = globalThis.__db;
  const p = db.pools[0];
  Object.assign(p, { owner_member_id: 'lid-1', premium_tot: new Date(Date.now() + 200 * 864e5).toISOString(),
    merk_kleur: '#0a7d4f', sponsor_tekst: t.sponsor, sponsor_url: 'https://example.com' });
  db.pool_teams = t.teams.map((naam, i) => ({ id: `team-${i + 1}`, pool_id: 'pool-1', naam,
    created_at: new Date(Date.now() - (9 - i) * 864e5).toISOString() }));
  const indeling = { 'lid-1': 'team-1', 'lid-2': 'team-1', 'lid-3': 'team-2', 'lid-4': 'team-2', 'lid-5': 'team-3' };
  for (const m of db.pool_members) m.team_id = indeling[m.member_id] ?? null;
  db.pool_periodes = t.periodes.map(([naam, prijs], i) => ({ id: `periode-${i + 1}`, pool_id: 'pool-1', seizoen: db.races[0].season,
    naam, van_ronde: i === 0 ? 1 : 2, tot_ronde: i === 0 ? 1 : 3, prijs }));
  db.pool_eigen_vragen = [
    { id: 'vraag-1', pool_id: 'pool-1', race_id: 2, vraag: t.vraag, opties: t.opties, uitkomst: null,
      created_at: new Date(Date.now() - 864e5).toISOString() },
    { id: 'vraag-2', pool_id: 'pool-1', race_id: 2, vraag: t.vraag2, opties: t.opties2, uitkomst: null,
      created_at: new Date(Date.now() - 86e6).toISOString() },
  ];
  db.pool_eigen_antwoorden = [{ vraag_id: 'vraag-1', member_id: 'lid-1', keuze: t.opties[0] }];
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
};

async function schermen(taal) {
  const { page, stoppen } = await startPagina({ taal, schaal: 2 });
  await page.setViewportSize({ width: 390, height: 844 });
  await meedoen(page);
  await page.evaluate(vulPoule(), POULENAAM[taal]);
  await page.evaluate(maakPremium, TEKST[taal]);
  await page.reload();
  await page.waitForSelector('[data-weergave]');
  for (const [thema, schema] of [['licht', 'light'], ['donker', 'dark']]) {
    await page.emulateMedia({ colorScheme: schema, reducedMotion: 'reduce' });
    const bewaar = (naam, buf) => writeFileSync(join(wortel, 'site', 'beeld', `premium-${naam}-${taal}-${thema}.jpg`), buf);
    // Eén onderdeel, met wat lucht eromheen in de kleur van de pagina.
    // Op een hoog scherm zonder de balk onderin, zodat het hele onderdeel in
    // beeld staat en er niets overheen valt.
    const kiek = async (naam, kies) => {
      await page.setViewportSize({ width: 390, height: 2600 });
      await page.evaluate(() => { document.querySelector('.nav').style.display = 'none'; });
      const el = page.locator(kies).first();
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      await page.mouse.move(0, 0);
      const vak = await el.boundingBox();
      const rand = 14;
      const clip = { x: Math.max(0, vak.x - rand), y: Math.max(0, vak.y - rand),
        width: Math.min(390, vak.width + 2 * rand), height: Math.round(vak.height + 2 * rand) };
      maten[`${naam}-${taal}-${thema}`] = [Math.round(clip.width), clip.height];
      bewaar(naam, await page.screenshot({ type: 'jpeg', quality: 80, clip }));
      await page.evaluate(() => { const n = document.querySelector('.nav'); if (n) n.style.display = ''; });
      await page.setViewportSize({ width: 390, height: 844 });
    };

    // Het eigen profiel: de kop met de kleur en de sponsorregel, en de kaart
    // van het weekend eronder.
    await page.click('[data-weergave="races"]');
    await page.waitForSelector('.hero');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    maten[`profiel-${taal}-${thema}`] = [390, 430];
    bewaar('profiel', await page.screenshot({ type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: 390, height: 430 } }));

    await page.click('[data-weergave="stand"]');
    await page.waitForSelector('[data-teamstand]');
    await kiek('teams', '[data-teamstand]');
    await kiek('periodes', '[data-periodes]');

    await page.click('[data-weergave="races"]');
    await naarLijst(page);
    await page.click('[data-race="2"]');
    await page.waitForSelector('[data-eigenvragen]');
    await kiek('vragen', '[data-eigenvragen]');
    await kiek('tik', '.poulekaart');
    await page.click('#terug');

    await page.click('[data-weergave="poule"]');
    await page.waitForSelector('details[data-pit="groepsapp"]');
    await kiek('groepsapp', 'details[data-pit="groepsapp"]');
  }
  await stoppen();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const taal of PREMIUM_TALEN) await schermen(taal);
  writeFileSync(MATEN_PAD, `${JSON.stringify(Object.fromEntries(Object.entries(maten).sort()), null, 1)}\n`);
  console.log(`Klaar: ${ONDERDELEN.length} onderdelen, ${PREMIUM_TALEN.length} talen, licht en donker`);
}
