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
    sponsor: 'Bakkerij Jansen', regel: 'Vers brood, elke ochtend sinds 1952' },
  en: { teams: ['Sales', 'Engineering', 'Management'], periodes: [['Spring', 'Cake from the bakery'], ['Summer', 'A round on the house']],
    vraag: 'Will a Ferrari retire?', opties: ['Yes', 'No'], vraag2: 'How many pit stops for the winner?', opties2: ['1', '2', '3 or more'],
    sponsor: 'Jansen Bakery', regel: 'Fresh bread every morning since 1952' },
};
// Een verzonnen logo en een verzonnen banner voor de bakker, getekend in de
// browser en als data-url in de opslag van de nabootsing gezet (zoals een
// upload daar terechtkomt).
const MERK_HTML = (soort, t) => `<!doctype html><html><head><style>
  html,body{margin:0}body{font-family:system-ui,sans-serif}
  .logo{width:256px;height:256px;border-radius:56px;background:#0a7d4f;display:flex;align-items:center;justify-content:center;
    color:#fff8e7;font:800 112px/1 Georgia,serif;letter-spacing:-4px}
  .banner{width:1500px;height:500px;position:relative;overflow:hidden;color:#fff8e7;
    background:radial-gradient(circle at 78% 40%,#e9b65c 0 170px,transparent 171px),linear-gradient(115deg,#064d31,#0a7d4f 55%,#13965f)}
  .banner .tekst{position:absolute;left:96px;top:120px}
  .banner b{display:block;font:800 120px/1 Georgia,serif;letter-spacing:-2px}
  .banner span{display:block;margin-top:26px;font:500 46px/1.2 system-ui,sans-serif;opacity:.92}
  .brood{position:absolute;right:150px;top:115px;width:330px;height:220px;border-radius:50% 50% 40% 40%;
    background:#b9742d;box-shadow:inset 0 -26px 0 #8f5520}
  .brood i{position:absolute;top:58px;width:22px;height:104px;border-radius:11px;background:#e9b65c;transform:rotate(28deg)}
</style></head><body>${soort === 'logo' ? '<div class="logo">BJ</div>'
    : `<div class="banner"><div class="tekst"><b>${t.sponsor}</b><span>${t.regel}</span></div>
       <div class="brood"><i style="left:80px"></i><i style="left:150px"></i><i style="left:220px"></i></div></div>`}</body></html>`;
async function merkBeelden(page, t) {
  const blad = await page.context().browser().newPage();
  const uit = {};
  for (const [soort, w, h] of [['logo', 256, 256], ['banner', 1500, 500]]) {
    await blad.setViewportSize({ width: w, height: h });
    await blad.setContent(MERK_HTML(soort, t));
    const buf = await blad.screenshot({ type: soort === 'logo' ? 'png' : 'jpeg', quality: soort === 'logo' ? undefined : 82 });
    uit[soort] = `data:image/${soort === 'logo' ? 'png' : 'jpeg'};base64,${buf.toString('base64')}`;
  }
  await blad.close();
  return uit;
}
const maakPremium = ([t, beelden]) => {
  const db = globalThis.__db;
  const p = db.pools[0];
  Object.assign(p, { owner_member_id: 'lid-1', premium_tot: new Date(Date.now() + 200 * 864e5).toISOString(),
    merk_kleur: '#0a7d4f', sponsor_tekst: t.sponsor, sponsor_url: 'https://example.com',
    merk_logo: `${p.id}/logo-1.png`, merk_banner: `${p.id}/banner-1.jpg` });
  db.opslag = { ...(db.opslag ?? {}), [`${p.id}/logo-1.png`]: beelden.logo, [`${p.id}/banner-1.jpg`]: beelden.banner };
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
  await page.evaluate(maakPremium, [TEKST[taal], await merkBeelden(page, TEKST[taal])]);
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

    // Het eigen profiel: de kop met het logo en de kleur, en daaronder de
    // banner met het logo groot en de sponsorregel (23 november).
    await page.click('[data-weergave="races"]');
    await page.waitForSelector('[data-merkbanner] [data-banner]');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => [...document.querySelectorAll('[data-merkbanner] img')].every((i) => i.complete && i.naturalWidth > 0));
    await page.waitForTimeout(200);
    const onder = Math.round(await page.$eval('[data-merkbanner]', (el) => el.getBoundingClientRect().bottom)) + 14;
    maten[`profiel-${taal}-${thema}`] = [390, onder];
    bewaar('profiel', await page.screenshot({ type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: 390, height: onder } }));

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
