// De racepagina's vanuit de app, de vrije trainingen op het invulscherm, de
// meldingen per soort, en de teller op de site (Danny, 1 november).
//
// "Spelers komen nu alleen naar de app om in te vullen en de uitslag te zien.
// Geef ze een extra moment per weekend, en stuur de momenten die er al zijn
// via de site." Wat hier vastligt:
//   1. De map per taal in de app is die van site/races.mjs.
//   2. De deeltekst van een weekend en die van de stand eindigen met een korte
//      link naar de racepagina in de taal van de speler, met ?ref=groepsapp;
//      zonder racepagina de voorpagina in die taal.
//   3. Het uitslagscherm heeft een knop naar de racepagina (?ref=app), in een
//      nieuw venster; zonder racepagina geen knop.
//   4. Het invulscherm toont per vrije training de top 10, met bij elke
//      coureur waar jij hem nu hebt staan, ook direct na een keuze. De
//      nieuwste training staat open.
//   5. Onder Profiel per soort melding een vinkje, alle drie aan; uitzetten is
//      één tik en staat in de database; aanzetten bewaart de tijdzone, en een
//      toestel dat meldingen al aan had krijgt hem bij het openen van de app.
//   6. teller.js op elke pagina van de site; hij telt het pad en de ref, en
//      verder niets van buiten.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { maakControle, startPagina, startSite, meedoen, openRace, kiesVoor, wortel } from './hulp.mjs';
import { RACE_TEKST } from '../site/races.mjs';

const { check, afronden } = maakControle('racepagina vanuit de app, vrije trainingen, meldingen per soort, teller');

// ---- 1. de map per taal ---------------------------------------------------------------
const BRON = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
const RACEMAP = JSON.parse(BRON.match(/const RACEMAP = (\{[^}]*\});/)?.[1]
  .replace(/(\w+):/g, '"$1":').replace(/'/g, '"') ?? '{}');
check('de app kent per taal de map van de racepagina\'s uit site/races.mjs',
  Object.keys(RACE_TEKST).every((c) => RACEMAP[c] === RACE_TEKST[c].pad)
    && Object.keys(RACEMAP).length === Object.keys(RACE_TEKST).length, JSON.stringify(RACEMAP));

// ---- 2 tot 4: de app ------------------------------------------------------------------
const vangen = (page) => page.addInitScript(() => {
  // Het weekend niet vanzelf laten afspelen: dat scherm ligt over de race heen.
  try { localStorage.setItem('poule:verhaal', 'uit'); } catch { /* niets */ }
  window.__klembord = [];
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
    writeText: async (t) => { window.__klembord.push(t); }, write: async () => {} } });
  Object.defineProperty(navigator, 'share', { configurable: true, get: () => undefined });
});
const UIT = ['1', '12', '63', '16', '44', '4', '81', '14', '10', '23'];
const zet = (page, { pagina }) => page.evaluate(({ UIT, pagina }) => {
  const db = globalThis.__db;
  const [mel, sha] = db.races;
  // Shanghai gereden, met een racepagina (of niet).
  sha.quali_result = UIT; sha.race_result = UIT; sha.pagina = pagina;
  sha.deadline_quali = new Date(Date.now() - 30 * 36e5).toISOString();
  sha.deadline_race = new Date(Date.now() - 6 * 36e5).toISOString();
  db.answers = ['quali_top10', 'race_top10'].map((v) => ({ pool_id: 'pool-1', race_id: sha.id,
    member_id: db.pool_members[0].member_id, question_id: v, waarde: UIT }));
  // Melbourne nog open, met twee vrije trainingen.
  const top = (lijst) => lijst.map((nr, i) => ({ plek: i + 1, nr, code: null, naam: null }));
  mel.vrije_trainingen = [
    { naam: 'Practice 1', sessie: 1, start: null, eind: null, top: top(['1', '4', '16', '44', '63', '12', '81', '14', '10', '23']) },
    { naam: 'Practice 2', sessie: 2, start: null, eind: null, top: top(['4', '81', '1', '16', '44', '63', '12', '14', '10', '23']) },
    { naam: 'Practice 3', sessie: 3, start: null, eind: null, top: null },
  ];
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, { UIT, pagina });
const tekstVan = async (page, knop) => {
  await page.click(knop);
  await page.waitForSelector('.deelvenster [data-kopieer-tekst]');
  const voor = await page.evaluate(() => window.__klembord.length);
  await page.click('.deelvenster [data-kopieer-tekst]');
  await page.waitForFunction((n) => window.__klembord.length > n, voor);
  const t = await page.evaluate(() => window.__klembord.at(-1));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.deelvenster'));
  return t;
};

for (const taal of ['nl', 'en']) {
  const { page, jsFouten, stoppen } = await startPagina({ voorafAan: vangen, ...(taal === 'en' ? { taal } : {}) });
  await meedoen(page);
  await zet(page, { pagina: 'mexico-city' });
  await page.reload();
  const basis = new URL(page.url()).origin;
  const map = taal === 'nl' ? 'races' : 'en/races';

  await openRace(page, 'Shanghai');
  const knop = await page.$eval('[data-racepagina]', (a) => ({ href: a.href, doel: a.target, rel: a.rel,
    tekst: a.textContent.trim() })).catch(() => null);
  check(`${taal}: het uitslagscherm heeft een knop naar de racepagina, met ?ref=app, in een nieuw venster`,
    knop?.href === `${basis}/${map}/2026/mexico-city/?ref=app` && knop.doel === '_blank' && /noopener/.test(knop.rel)
      && knop.tekst === (taal === 'nl' ? 'Tijden en cijfers van deze GP' : 'Times and stats for this GP'), JSON.stringify(knop));
  const weekend = await tekstVan(page, '[data-deel]');
  check(`${taal}: de deeltekst van het weekend eindigt met de link naar de racepagina (?ref=groepsapp)`,
    weekend.split('\n').at(-1) === `${basis}/${map}/2026/mexico-city/?ref=groepsapp`
      && weekend.split('\n').at(-2) === '', weekend.split('\n').slice(-3).join(' | '));

  await page.click('[data-weergave="stand"]');
  await page.waitForSelector('[data-deel-stand]');
  const stand = await tekstVan(page, '[data-deel-stand]');
  check(`${taal}: de deeltekst van de stand ook, naar de racepagina van het laatste weekend`,
    stand.split('\n').at(-1) === `${basis}/${map}/2026/mexico-city/?ref=groepsapp`, stand.split('\n').slice(-2).join(' | '));

  // Melbourne: het invulscherm met de vrije trainingen.
  await page.click('[data-weergave="races"]');
  await openRace(page, 'Melbourne');
  await page.waitForSelector('[data-trainingen]');
  const trainingen = await page.$$eval('[data-trainingen] details', (ds) => ds.map((d) => ({
    naam: d.dataset.training, open: d.open, kop: d.querySelector('summary').textContent.trim(),
    rijen: d.querySelectorAll('[data-trainingrij]').length })));
  check(`${taal}: per vrije training met een top 10 een blok, de nieuwste open, VT3 zonder uitslag niet`,
    trainingen.map((t) => `${t.naam}:${t.open}:${t.rijen}`).join() === 'Practice 1:false:10,Practice 2:true:10'
      && trainingen[1].kop === (taal === 'nl' ? 'VT2' : 'FP2'), JSON.stringify(trainingen));
  const jij = (nr) => page.$eval(`[data-training="Practice 2"] [data-trainingrij="${nr}"] .jijplek`, (s) => s.dataset.jij);
  check(`${taal}: zonder top 10 staat er bij niemand een plek`, (await jij('4')) === '' && (await jij('81')) === '');
  await kiesVoor(page, '[data-plek="2"]', '81');
  check(`${taal}: na een keuze staat die coureur er meteen met zijn plek bij (P3)`,
    (await jij('81')) === '3' && (await jij('4')) === '', `${await jij('81')} / ${await jij('4')}`);
  check(`${taal}: geen javascriptfouten`, jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

{
  // Zonder racepagina: de link naar de voorpagina, en geen knop.
  const { page, jsFouten, stoppen } = await startPagina({ voorafAan: vangen });
  await meedoen(page);
  await zet(page, { pagina: null });
  await page.reload();
  const basis = new URL(page.url()).origin;
  await openRace(page, 'Shanghai');
  check('zonder racepagina geen knop op het uitslagscherm', !(await page.$('[data-racepagina]')));
  const weekend = await tekstVan(page, '[data-deel]');
  check('en de deeltekst wijst naar de voorpagina', weekend.split('\n').at(-1) === `${basis}/?ref=groepsapp`,
    weekend.split('\n').at(-1));
  check('geen javascriptfouten zonder racepagina', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 5. de meldingen per soort ------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
    Notification.requestPermission = async () => 'granted';
    const ab = { endpoint: 'https://push.voorbeeld/soort',
      toJSON: () => ({ endpoint: 'https://push.voorbeeld/soort', keys: { p256dh: 'p256', auth: 'auth' } }),
      unsubscribe: async () => true };
    let aangemeld = sessionStorage.getItem('test:aangemeld') ? ab : null;
    const reg = { pushManager: {
      subscribe: async () => { aangemeld = ab; sessionStorage.setItem('test:aangemeld', '1'); return ab; },
      getSubscription: async () => aangemeld } };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true,
      get: () => ({ register: async () => reg, ready: Promise.resolve(reg), getRegistration: async () => reg }) });
  });
  await page.reload();
  await meedoen(page);
  await page.click('[data-weergave="profiel"]');
  await page.waitForSelector('#meldingAan');
  await page.click('#meldingAan');
  await page.waitForSelector('[data-meldsoorten]');
  const vakjes = () => page.$$eval('[data-meldsoort]', (v) => v.map((x) => `${x.dataset.meldsoort}:${x.checked}`).join());
  check('na aanzetten drie vinkjes, alle drie aan', (await vakjes()) === 'deadline:true,uitslag:true,training:true', await vakjes());
  const rij = () => page.evaluate(() => globalThis.__db.push_abonnementen[0]);
  const tz = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  check('aanzetten bewaart de tijdzone van het toestel', (await rij())?.tijdzone === tz, JSON.stringify(await rij()));
  await page.click('[data-meldsoort="training"]');
  await page.waitForFunction(() => globalThis.__db.push_abonnementen[0]?.meld_training === false, null, { timeout: 5000 })
    .catch(() => {});
  check('één tik zet de trainingsmelding uit, in de database', (await rij())?.meld_training === false
    && (await rij())?.meld_deadline !== false, JSON.stringify(await rij()));
  await page.reload();
  await page.click('[data-weergave="profiel"]');
  await page.waitForSelector('[data-meldsoorten]');
  check('na herladen staat hij nog uit, de andere twee aan', (await vakjes()) === 'deadline:true,uitslag:true,training:false',
    await vakjes());
  // Een toestel dat meldingen aanzette voordat er een tijdzone bij kwam: bij
  // het openen van de app zet hij hem er alsnog bij. Weet dit toestel al dat
  // het deze tijdzone wegschreef, dan gaat er niets naar de database.
  await page.evaluate(() => {
    const db = globalThis.__db;
    db.push_abonnementen[0].tijdzone = null;
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  });
  await page.reload();
  await page.waitForSelector('[data-weergave="profiel"]');
  await page.waitForTimeout(800);
  check('staat dezelfde tijdzone al op dit toestel, dan schrijft openen niets',
    (await rij())?.tijdzone === null, JSON.stringify(await rij()));
  await page.evaluate(() => localStorage.removeItem('poule:tijdzone'));
  await page.reload();
  await page.waitForFunction((t) => globalThis.__db.push_abonnementen[0]?.tijdzone === t, tz, { timeout: 5000 })
    .catch(() => {});
  check('een toestel zonder tijdzone krijgt hem bij het openen van de app',
    (await rij())?.tijdzone === tz, JSON.stringify(await rij()));
  check('geen javascriptfouten bij de meldingen', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 6. de teller op de site ----------------------------------------------------------------
{
  const paginas = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: wortel, encoding: 'utf8' })
    .split('\n').filter((f) => /(^|\/)index\.html$/.test(f) && !/^(app|beheer|test|node_modules)\//.test(f));
  const zonder = paginas.filter((f) => !/<script src="(\.\.\/)*teller\.js" defer><\/script>/.test(readFileSync(join(wortel, f), 'utf8')));
  check(`teller.js staat op elke pagina van de site (${paginas.length})`, paginas.length > 60 && zonder.length === 0,
    zonder.slice(0, 4).join(' '));
  const teller = readFileSync(join(wortel, 'teller.js'), 'utf8');
  const sleutel = BRON.match(/const SUPABASE_ANON_KEY = '([^']+)';/)?.[1];
  check('teller.js praat met dezelfde database als de app, met de publieke sleutel en zonder cookie of opslag',
    teller.includes(`${BRON.match(/const SUPABASE_URL = '([^']+)';/)?.[1]}/rest/v1/rpc/tel_pagina`) && teller.includes(sleutel)
      && !/cookie|localStorage|sessionStorage|indexedDB/i.test(teller.replace(/^\/\/.*$/gm, '')), teller.slice(-300));

  const { page, url, extern, tellers, jsFouten, stoppen } = await startSite();
  await page.goto(`${url}races/2026/mexico-city/?ref=groepsapp`);
  await page.waitForFunction(() => true);
  await page.waitForTimeout(300);
  check('een racepagina via de groepsapp: het pad en de ref, verder niets',
    tellers.length === 1 && JSON.stringify(tellers[0].body) === JSON.stringify({ p_pad: '/races/2026/mexico-city/', p_ref: 'groepsapp' }),
    JSON.stringify(tellers));
  await page.goto(`${url}en/`);
  await page.waitForTimeout(300);
  check('de Engelse voorpagina zonder ref: ref leeg', JSON.stringify(tellers.at(-1)?.body) === JSON.stringify({ p_pad: '/en/', p_ref: null }),
    JSON.stringify(tellers.at(-1)));
  await page.goto(`${url}f1-poule-puntentelling/?ref=Iets%20Raars!`);
  await page.waitForTimeout(300);
  check('een ref die geen woord is, gaat niet mee', tellers.at(-1)?.body?.p_ref === null && tellers.length === 3,
    JSON.stringify(tellers.at(-1)));
  check('en verder laadt de site niets van buiten', extern.length === 0, extern.join(' '));
  check('geen javascriptfouten op de site', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
