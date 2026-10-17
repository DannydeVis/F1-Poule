// Misbruik tegengaan (17 oktober): Turnstile bij het inloggen, en de meldingen
// van de sloten in de database, in de app en in het beheer.
//
// Turnstile is hier nagebootst: de echte api.js van Cloudflare komt niet van
// het net, maar een stukje dat bij elke render meteen een vers token geeft
// (ts-1-..., ts-2-...) en telt hoe vaak er gerenderd en opgeruimd is. De
// nabootsing van Supabase weigert met captcha_aan elk ontbrekend, verzonnen of
// al gebruikt token, net als Supabase.
//
// Wat hier vastligt:
//   1. Zonder site key laadt er niets van Cloudflare en werkt alles zoals het
//      deed. Zet je dan captcha aan in Supabase, dan komt niemand er meer in:
//      daarom eerst de site key, dan pas captcha aan (BEDIENING.md §7b).
//   2. Met een site key stuurt de app bij elke aanroep een vers token mee:
//      anoniem inloggen, de inlogmail (allebei de pogingen), de code en de link
//      uit de mail. Geen token twee keer, en de widget wordt na elk token opgeruimd.
//   3. Laadt Turnstile niet (een adblocker), dan zegt de app dat de
//      beveiligingscontrole niet lukte, in plaats van een technische fout.
//   4. Het beheer stuurt bij de inloglink ook een token mee.
//   5. De meldingen van de database (geen sessie, poule vol, 10 spelers per
//      toestel, 5 poules per dag, het woordfilter) staan er in gewone taal, ook
//      in het Engels en het Duits.
//   6. De app telt alleen de schermen die schema.sql telt, en de
//      privacyverklaring noemt Turnstile.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, startPagina, naDeClaim, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('misbruik tegengaan: Turnstile en de sloten in de database');
const tekst = async (page, kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const db = (page) => page.evaluate(() => globalThis.__db);
const zet = (page, fn, arg) => page.evaluate(([f, a]) => {
  // eslint-disable-next-line no-new-func
  new Function('db', 'a', f)(globalThis.__db, a);
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
}, [fn, arg]);

const TESTSLEUTEL = '1x00000000000000000000BB';
const turnstileMet = (sleutel) => readFileSync(join(wortel, 'turnstile.js'), 'utf8')
  .replace(/const SITE_KEY = '[^']*';/, `const SITE_KEY = '${sleutel}';`);
const NEP_TURNSTILE = `
  window.__ts = { renders: 0, removes: 0, opties: [] };
  window.turnstile = {
    render(doos, o) {
      const n = ++window.__ts.renders;
      window.__ts.opties.push({ sitekey: o.sitekey, appearance: o.appearance, zichtbaar: !!doos.isConnected });
      setTimeout(() => o.callback('ts-' + n + '-' + Math.random().toString(36).slice(2)), 5);
      return 'widget-' + n;
    },
    remove() { window.__ts.removes++; },
  };`;
// Een app zonder site key, zoals vóór 17 oktober.
const zonderSleutel = (p) => p.route('**/turnstile.js', (r) => r.fulfill({ contentType: 'text/javascript', body: turnstileMet('') }));
// Met site key en de nagebootste Turnstile; `cloudflare` telt de verzoeken.
const metTurnstile = (cloudflare, { laadt = true } = {}) => async (p) => {
  await p.route('**/turnstile.js', (r) => r.fulfill({ contentType: 'text/javascript', body: turnstileMet(TESTSLEUTEL) }));
  await p.route('https://challenges.cloudflare.com/**', (r) => {
    cloudflare.push(r.request().url());
    return laadt ? r.fulfill({ contentType: 'text/javascript', body: NEP_TURNSTILE }) : r.abort();
  });
};

// ---- 1. zonder site key ---------------------------------------------------------
{
  const cloudflare = [];
  const { page, jsFouten, stoppen } = await startPagina({
    voorafAan: async (p) => {
      await zonderSleutel(p);
      p.on('request', (r) => { if (r.url().includes('cloudflare')) cloudflare.push(r.url()); });
    },
  });
  await page.waitForSelector('#code');
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
  await page.waitForSelector('[data-lid]');
  await page.click('[data-lid]');
  await naDeClaim(page);
  const log = (await db(page)).captcha_log;
  check('zonder site key doe je gewoon mee, zonder token', log.length === 1 && log[0].aanroep === 'signInAnonymously'
    && log[0].token === null, JSON.stringify(log));
  check('en er komt niets van Cloudflare', cloudflare.length === 0, cloudflare.join(' | '));
  check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}
{
  // Captcha aan in Supabase terwijl de app nog geen site key heeft: dan komt
  // niemand er nieuw in. De volgorde in BEDIENING.md is dus geen detail.
  const { page, stoppen } = await startPagina({ voorafAan: zonderSleutel });
  await page.waitForSelector('#code');
  await zet(page, 'db.captcha_aan = true;');
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
  await page.waitForSelector('#naam');
  await page.fill('#naam', 'Nieuweling');
  await page.click('#maak');
  await page.waitForFunction(() => document.querySelector('#f')?.textContent.trim());
  check('captcha aan zonder site key: niemand komt er nieuw in, en de app zegt het in gewone taal',
    (await tekst(page, '#f')) === 'De app kon je niet aanmelden. Herlaad de pagina en probeer het opnieuw.'
      && !(await db(page)).pool_members.some((m) => m.display_name === 'Nieuweling'), await tekst(page, '#f'));
  await stoppen();
}

// ---- 2. met site key: een vers token bij elke aanroep ------------------------------
{
  const cloudflare = [];
  const { page, url, jsFouten, stoppen } = await startPagina({ voorafAan: metTurnstile(cloudflare) });
  await page.waitForSelector('#code');
  await zet(page, 'db.captcha_aan = true;');
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
  await page.waitForSelector('[data-lid]');
  await page.click('[data-lid]');
  await naDeClaim(page);
  let log = (await db(page)).captcha_log;
  check('met site key en captcha aan doe je mee: anoniem inloggen kreeg een token',
    log.length === 1 && log[0].aanroep === 'signInAnonymously' && /^ts-1-/.test(log[0].token ?? ''), JSON.stringify(log));
  check('Turnstile komt van Cloudflare, met render=explicit',
    cloudflare.length === 1 && cloudflare[0].startsWith('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'),
    cloudflare.join(' | '));
  const ts = await page.evaluate(() => window.__ts);
  check('onzichtbaar (alleen een vakje als Turnstile twijfelt), met de site key, en daarna opgeruimd',
    ts.opties[0]?.sitekey === TESTSLEUTEL && ts.opties[0]?.appearance === 'interaction-only'
      && ts.opties[0]?.zichtbaar && ts.removes === ts.renders && !(await page.$('.ptr-turnstile')), JSON.stringify(ts));

  // Een tweede toestel: inloggen met een nieuw adres (twee keer signInWithOtp:
  // eerst als inloggen, dan als nieuw account) en de code uit de mail.
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForSelector('#inlogopen');
  await page.click('#inlogopen');
  await page.fill('#inlogveld', 'nieuw@voorbeeld.nl');
  await page.click('#inlogstuur');
  await page.waitForSelector('#inlogcode');
  await page.fill('#inlogcode', await page.evaluate(() => globalThis.__mail.laatsteCode()));
  await page.click('#inlogcodeknop');
  await page.waitForFunction(() => document.querySelector('#app')?.textContent.includes('Je bent al ingelogd'));
  log = (await db(page)).captcha_log;
  const soorten = log.map((r) => r.aanroep).join(',');
  check('de inlogmail (twee pogingen) en de code kregen elk een token',
    soorten === 'signInAnonymously,signInWithOtp,signInWithOtp,verifyOtp', soorten);
  check('elk token is vers: geen enkel token twee keer, en allemaal van Turnstile',
    new Set(log.map((r) => r.token)).size === log.length && log.every((r) => /^ts-/.test(r.token ?? '')),
    log.map((r) => r.token).join(' | '));
  check('en je bent ingelogd', (await tekst(page, '#app')).includes('nieuw@voorbeeld.nl'));

  // Nog een toestel, en nu de link uit de mail (verifyOtp met token_hash).
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForSelector('#inlogopen');
  await page.click('#inlogopen');
  await page.fill('#inlogveld', 'nieuw@voorbeeld.nl');
  await page.click('#inlogstuur');
  await page.waitForFunction(() => !document.querySelector('#inlogveld'));
  await page.goto(await page.evaluate(() => globalThis.__mail.laatsteMaillink()));
  await page.waitForFunction(() => document.querySelector('#app')?.textContent.includes('nieuw@voorbeeld.nl'));
  log = (await db(page)).captcha_log;
  check('ook de link uit de mail stuurt een vers token mee',
    log.slice(-2).map((r) => r.aanroep).join() === 'signInWithOtp,verifyOtp'
      && new Set(log.map((r) => r.token)).size === log.length && log.every((r) => /^ts-/.test(r.token ?? '')),
    JSON.stringify(log.slice(-2)));

  // Daarna een poule aanmaken: met de sessie van zonet, zonder nieuw token.
  await page.click('#nieuw');
  await page.fill('#pnaam', 'Captchapoule');
  await page.click('#verder');
  await page.fill('#snaam', 'Nina');
  await page.click('#verder');
  await page.waitForSelector('[data-preset]');
  await page.click('#verder');
  await page.waitForSelector('#klaar');
  check('een poule aanmaken lukt, op het account van de inlogmail',
    (await db(page)).pools.some((p) => p.name === 'Captchapoule'));
  check('geen javascriptfouten met Turnstile', jsFouten.length === 0, jsFouten.join(' | '));

  // Het beheer, uitgelogd: de inloglink krijgt ook een token.
  await page.evaluate(() => localStorage.clear());
  await page.goto(url + 'beheer/');
  await page.waitForSelector('#mailform', { state: 'attached' });
  await page.click('details summary');
  await page.fill('#mail', 'nieuw@voorbeeld.nl');
  await page.click('#mailform button[type="submit"]');
  await page.waitForFunction(() => document.querySelector('#inlogbericht')?.textContent.trim());
  log = (await db(page)).captcha_log;
  check('het beheer stuurt bij de inloglink een vers token mee',
    log.at(-1).aanroep === 'signInWithOtp' && /^ts-/.test(log.at(-1).token ?? '')
      && log.filter((r) => r.token === log.at(-1).token).length === 1
      && (await tekst(page, '#inlogbericht')).startsWith('We hebben een inloglink gestuurd'),
    `${JSON.stringify(log.at(-1))} · ${await tekst(page, '#inlogbericht')}`);
  await stoppen();
}

// ---- 3. Turnstile laadt niet ------------------------------------------------------
{
  const cloudflare = [];
  const { page, url, stoppen } = await startPagina({ voorafAan: metTurnstile(cloudflare, { laadt: false }) });
  await page.waitForSelector('#inlogopen');
  await zet(page, 'db.captcha_aan = true;');
  await page.click('#inlogopen');
  await page.fill('#inlogveld', 'iemand@voorbeeld.nl');
  await page.click('#inlogstuur');
  await page.waitForFunction(() => /beveiligingscontrole/.test(document.querySelector('#app')?.textContent ?? ''));
  check('laadt Turnstile niet, dan zegt de app dat de beveiligingscontrole niet lukte',
    (await tekst(page, '#app')).includes('De beveiligingscontrole lukte niet. Probeer het opnieuw')
      && (await db(page)).captcha_log.every((r) => r.token === null), await tekst(page, '#app'));
  // En in het beheer.
  await page.goto(url + 'beheer/');
  await page.waitForSelector('#mailform', { state: 'attached' });
  await page.click('details summary');
  await page.fill('#mail', 'iemand@voorbeeld.nl');
  await page.click('#mailform button[type="submit"]');
  await page.waitForFunction(() => document.querySelector('#inlogbericht')?.textContent.trim());
  check('en het beheer ook', (await tekst(page, '#inlogbericht')).startsWith('De beveiligingscontrole lukte niet'),
    await tekst(page, '#inlogbericht'));
  await stoppen();
}

// ---- 5. de meldingen van de database ------------------------------------------------
// Elk geval vanaf een leeg toestel met een nieuwe naam; de nabootsing doet de
// sloten na zoals schema.sql (test/misbruik.test.sql legt de echte vast).
const nieuweNaam = async (taal, klaarzetten, naam) => {
  const { page, stoppen } = await startPagina({ taal });
  await page.waitForSelector('#code');
  await zet(page, klaarzetten);
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
  await page.waitForSelector('#naam');
  await page.fill('#naam', naam);
  await page.click('#maak');
  await page.waitForFunction(() => document.querySelector('#f')?.textContent.trim());
  const uit = await tekst(page, '#f');
  await stoppen();
  return uit;
};
const VOL = "db.pools[0].max_spelers = 1;";
// De eerste anonieme sessie wordt account-1; tien spelers die dat account
// eerder aanmaakte.
const TIEN = "for (let i = 0; i < 10; i++) db.pool_members.push({ member_id: 'tien-' + i, pool_id: 'pool-1', display_name: 'Vriend ' + i, user_id: null, aangemaakt_door: 'account-1' });";
const OPEN = 'db.pools[0].is_public = true;';
{
  let m = await nieuweNaam('nl', VOL, 'Chris');
  check('een volle poule zegt hoeveel er in mogen', m === 'Deze poule is vol: er mogen hoogstens 1 spelers in.', m);
  m = await nieuweNaam('en', VOL, 'Chris');
  check('ook in het Engels', m === 'This league is full: it can have at most 1 players.', m);
  m = await nieuweNaam('nl', TIEN, 'Elfde');
  check('de elfde speler vanaf één toestel krijgt uitleg',
    m === 'Vanaf dit toestel staan er al 10 spelers in deze poule. Laat de anderen zich op hun eigen telefoon aanmelden.', m);
  m = await nieuweNaam('nl', OPEN, 'Kanker Henk');
  check('een grove naam in een openbare poule krijgt uitleg', m === 'Die naam kan niet in een openbare poule. Kies een andere.', m);
  m = await nieuweNaam('de', OPEN, 'Kanker Henk');
  check('ook in het Duits', m === 'Dieser Name geht in einer öffentlichen Runde nicht. Wähle einen anderen.', m);
}
{
  // Vijf poules op een dag: de zesde krijgt uitleg op het aanmaakscherm.
  const { page, stoppen } = await startPagina();
  await page.waitForSelector('#nieuw');
  await zet(page, "for (let i = 0; i < 5; i++) db.aanmaak_log.push({ user_id: 'account-1', gemaakt: Date.now() - 1000 });");
  await page.click('#nieuw');
  await page.fill('#pnaam', 'De zesde');
  await page.click('#verder');
  await page.fill('#snaam', 'Bram');
  await page.click('#verder');
  await page.waitForSelector('[data-preset]');
  await page.click('#verder');
  await page.waitForFunction(() => /5 poules/.test(document.querySelector('#app')?.textContent ?? ''));
  check('de zesde poule op een dag krijgt uitleg',
    (await tekst(page, '#app')).includes('Je hebt vandaag al 5 poules aangemaakt. Morgen kan het weer.')
      && !(await db(page)).pools.some((p) => p.name === 'De zesde'), (await tekst(page, '#app')).slice(0, 200));
  await stoppen();
}

// ---- 6. de teller en de privacyverklaring --------------------------------------------
{
  const app = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
  const schema = readFileSync(join(wortel, 'schema.sql'), 'utf8');
  const geteld = [...new Set([...app.matchAll(/telBezoek\('([^']+)'\)/g)].map((x) => x[1]))].sort();
  const toegestaan = (schema.match(/p_pad not in \(([^)]+)\)/)?.[1] ?? '').match(/'[^']+'/g)?.map((x) => x.slice(1, -1)).sort() ?? [];
  check('de app telt precies de schermen die tel_bezoek() aanneemt',
    geteld.length > 0 && geteld.join() === toegestaan.join(), `app: ${geteld} · schema: ${toegestaan}`);
  const privacy = readFileSync(join(wortel, 'site', 'privacy.mjs'), 'utf8');
  check('de privacyverklaring noemt Turnstile en Cloudflare', /Turnstile/.test(privacy) && /Cloudflare/.test(privacy));
  for (const pagina of ['privacy/index.html', 'en/privacy/index.html']) {
    const html = readFileSync(join(wortel, pagina), 'utf8');
    check(`en ${pagina} ook (opnieuw gegenereerd)`, html.includes('Turnstile'));
  }
  const ts = readFileSync(join(wortel, 'turnstile.js'), 'utf8');
  check('turnstile.js heeft de site key van de widget voor predicttherace.com (openbaar, begint met 0x4)',
    /const SITE_KEY = '0x4[0-9A-Za-z_-]{10,}';/.test(ts), ts.match(/const SITE_KEY = '[^']*'/)?.[0]);
  const beheer = readFileSync(join(wortel, 'beheer', 'index.html'), 'utf8');
  check('de app en het beheer laden allebei hetzelfde turnstile.js',
    app.includes('<script src="../turnstile.js" defer></script>') && beheer.includes('<script src="../turnstile.js" defer></script>'));
}

process.exit(afronden() ? 0 : 1);
