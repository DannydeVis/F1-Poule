// Waar nieuwe spelers vandaan komen: de app en de site (19 november).
//
// Danny (TickTick): "Elke link die je deelt krijgt een bron (?ref=reddit,
// ?ref=producthunt). Laat de app die bewaren bij een nieuwe poule of speler en
// in het beheer per bron tellen." De database staat in test/bronnen.test.sql;
// hier ligt vast:
//   1. Wie de app opent met ?ref=reddit en een poule begint, krijgt bij zijn
//      speler de bron reddit. Ook als hij eerst nog een paar keer herlaadt.
//   2. Wie met ?ref=producthunt meedoet in een bestaande poule, ook.
//   3. Zonder ref wordt er niets bewaard; een bestaande speler aanwijzen
//      (claimen) zet ook geen bron.
//   4. De app zet de bron niet onder poule: in localStorage (dan stuurt de
//      voorpagina je door naar de app), en niet in de url van de poule.
//   5. Op de site: met ?ref=reddit krijgen de links naar de app dezelfde ref,
//      ook die met een code erin; zonder ref blijven ze zoals ze zijn, en de
//      links naar andere pagina's ook.
//   6. Het beheer laat per bron de spelers en de poules zien, met het totaal.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, startPagina, startSite, naDeClaim, meedoen, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('waar spelers vandaan komen');
const db = (page) => page.evaluate(() => globalThis.__db);
const fouten = [];

// ---- 1. een poule beginnen via reddit -----------------------------------------------
{
  const { page, url, jsFouten, stoppen } = await startPagina();
  await page.goto(`${url}?ref=reddit`);
  await page.waitForSelector('#nieuw');
  await page.reload();
  await page.waitForSelector('#nieuw');
  await page.click('#nieuw');
  await page.fill('#pnaam', 'Redditpoule');
  await page.click('#verder');
  await page.fill('#snaam', 'Anna');
  await page.click('#verder');
  await page.waitForSelector('[data-preset]');
  await page.click('#verder');
  await page.waitForSelector('#klaar');
  await page.waitForFunction(() => (globalThis.__db.speler_bronnen ?? []).length > 0, null, { timeout: 3000 }).catch(() => {});
  const d = await db(page);
  const poule = d.pools.find((p) => p.name === 'Redditpoule');
  const ik = d.pool_members.find((m) => m.display_name === 'Anna' && m.pool_id === poule?.id);
  check('een poule begonnen via ?ref=reddit: de speler krijgt de bron reddit, ook na herladen',
    (d.speler_bronnen ?? []).length === 1 && d.speler_bronnen[0].member_id === ik?.member_id
      && d.speler_bronnen[0].bron === 'reddit', JSON.stringify(d.speler_bronnen));
  const sleutels = await page.evaluate(() => Object.keys(localStorage));
  check('de bron staat niet onder poule: in localStorage, wel voor dit tabblad',
    !sleutels.some((k) => /bron|ref/i.test(k))
      && (await page.evaluate(() => sessionStorage.getItem('ptr:bron'))) === 'reddit', sleutels.join());
  check('in de link om te delen staat geen ref',
    !(await page.innerText('body')).includes('ref='), (await page.innerText('body')).match(/\S*ref=\S*/)?.[0]);
  fouten.push(...jsFouten);
  await stoppen();
}

// ---- 2. meedoen via producthunt, en 3. zonder ref of met een claim ----------------
{
  const { page, url, jsFouten, stoppen } = await startPagina();
  await page.goto(`${url}?ref=producthunt`);
  await page.waitForSelector('#code');
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
  await page.waitForSelector('#naam');
  await page.fill('#naam', 'Nieuweling');
  await page.click('#maak');
  await naDeClaim(page);
  await page.waitForFunction(() => (globalThis.__db.speler_bronnen ?? []).length > 0, null, { timeout: 3000 }).catch(() => {});
  const d = await db(page);
  const nieuw = d.pool_members.find((m) => m.display_name === 'Nieuweling');
  check('meedoen in een bestaande poule via ?ref=producthunt: die bron bij de nieuwe speler',
    (d.speler_bronnen ?? []).length === 1 && d.speler_bronnen[0].member_id === nieuw?.member_id
      && d.speler_bronnen[0].bron === 'producthunt', JSON.stringify(d.speler_bronnen));
  fouten.push(...jsFouten);
  await stoppen();
}
{
  const { page, url, jsFouten, stoppen } = await startPagina();
  await page.goto(url);
  await meedoen(page);
  await page.click('[data-weergave="poule"]').catch(() => {});
  await page.waitForTimeout(300);
  check('een bestaande speler aanwijzen zonder ref zet geen bron',
    ((await db(page)).speler_bronnen ?? []).length === 0);
  fouten.push(...jsFouten);
  await stoppen();
}
{
  const { page, url, jsFouten, stoppen } = await startPagina();
  await page.goto(`${url}?ref=reddit`);
  await meedoen(page);
  await page.waitForTimeout(300);
  check('ook met ?ref=reddit zet een bestaande speler aanwijzen geen bron: hij is niet nieuw',
    ((await db(page)).speler_bronnen ?? []).length === 0);
  fouten.push(...jsFouten);
  await stoppen();
}

// ---- 5. de site geeft de ref door aan de app -----------------------------------------
{
  const { page, url, jsFouten, stoppen } = await startSite({ taal: null });
  const links = () => page.$$eval('a[href]', (a) => a.map((x) => x.getAttribute('href')));
  await page.goto(`${url}en/premium/?ref=reddit`);
  await page.waitForLoadState('load');
  await page.waitForFunction(() => [...document.querySelectorAll('a[href]')].some((a) => /ref=reddit/.test(a.href)));
  const met = await links();
  const naarApp = met.filter((h) => /\/app\/(\?|$)/.test(new URL(h, url).pathname + new URL(h, url).search.slice(0, 1)));
  check('met ?ref=reddit krijgen alle links naar de app de ref, ook die met een code',
    naarApp.length >= 2 && naarApp.every((h) => new URL(h, url).searchParams.get('ref') === 'reddit')
      && naarApp.some((h) => new URL(h, url).searchParams.get('code') === '80C98C'), naarApp.join(' '));
  check('de links naar andere pagina\'s houden hun adres',
    met.filter((h) => !naarApp.includes(h)).every((h) => !h.includes('ref=')));
  await page.goto(`${url}en/premium/`);
  await page.waitForLoadState('load');
  check('zonder ref blijven de links naar de app zoals ze zijn',
    (await links()).every((h) => !h.includes('ref=')));
  await page.goto(`${url}en/premium/?ref=Iets%20raars`);
  await page.waitForLoadState('load');
  check('een ref die geen naam is, gaat niet mee', (await links()).every((h) => !h.includes('ref=')));
  // Van de site naar de app: de app pakt hem op.
  await page.goto(`${url}?ref=tiktok`);
  await page.waitForFunction(() => location.pathname.endsWith('/app/'), null, { timeout: 5000 }).catch(() => {});
  if (!(await page.evaluate(() => location.pathname.endsWith('/app/')))) {
    await page.click('a[href*="app/"]');
    await page.waitForFunction(() => location.pathname.endsWith('/app/'));
  }
  await page.waitForSelector('#code');
  check('wie zo in de app belandt, heeft de bron daar ook',
    (await page.evaluate(() => sessionStorage.getItem('ptr:bron'))) === 'tiktok');
  fouten.push(...jsFouten);
  await stoppen();
}

// ---- 6. het beheer --------------------------------------------------------------------
{
  const bron = readFileSync(join(wortel, 'beheer', 'index.html'), 'utf8');
  const fn = bron.match(/function bronKaart\(st\) \{[\s\S]*?\n\}\n/)?.[0];
  const getal = (n) => String(n);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  // eslint-disable-next-line no-new-func
  const bronKaart = new Function('getal', 'esc', `${fn}; return bronKaart;`)(getal, esc);
  const html = bronKaart({ bronnen: [{ bron: 'reddit', spelers: 5, poules: 2 }, { bron: 'tiktok', spelers: 1, poules: 0 }], spelers_90d: 9 });
  check('het beheer laat per bron de spelers en de poules zien',
    /data-bron="reddit"[\s\S]*2 poules begonnen[\s\S]*class="getal">5</.test(html)
      && /data-bron="tiktok"[\s\S]*0 poules begonnen[\s\S]*class="getal">1</.test(html), html.slice(0, 300));
  check('met het totaal: hoeveel nieuwe spelers, met en zonder bron',
    html.includes('9 nieuwe spelers, 6 via een link met een bron, 3 zonder'));
  check('zonder bronnen zegt het dat', bronKaart({ bronnen: [], spelers_90d: 0 }).includes('Nog niemand via een link met een bron'));
  check('het blok staat op de beheerpagina, onder de bezoeken van de site',
    /\$\{siteKaart\(st\)\}\s*\$\{bronKaart\(st\)\}/.test(bron));
}

check('geen javascriptfouten', fouten.length === 0, fouten.join(' | '));
process.exit(afronden() ? 0 : 1);
