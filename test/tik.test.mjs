// De tik in de app (premium, 26 oktober).
//
// Danny: "een tik functie als iemand nog niet z'n poule heeft ingevuld. Dat er
// een notificatie word gegeven aan die persoon." Premium.
//
// Wat hier vastligt (de regels zelf staan in test/tik.test.sql, het versturen
// in test/tik-versturen.test.mjs):
//   1. Alleen in een poule met premium staat op de weekendkaart een knop bij
//      elke speler die zijn top 10 nog niet invulde, niet bij jezelf, en niet
//      voor een sessie die pas over meer dan zeven dagen sluit.
//   2. Een tik vraagt de functie `tik` om een melding; daarna staat er een
//      vinkje bij die speler, ook na herladen, en zegt de app dat hij een
//      seintje krijgt.
//   3. Heeft hij geen meldingen aan, dan wordt de knop een berichtje om zelf
//      te sturen (deelmenu), met de sessie, de race, de deadline en de link.
//   4. Wat de functie weigert, in gewone taal: al aangetikt (dan ook een
//      vinkje), nog niet ingericht (dan het berichtje), net ingevuld.
//   5. In het Engels heet het nudge.
//   6. De privacyverklaring in de app zegt wat er van een tik bewaard wordt.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('de tik in de app');

const tekst = async (page, kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const melding = (page) => tekst(page, '.meldingbalk');

// Kees heeft meldingen aan, de rest niet. Joep, Mo en Sem zijn er voor de
// weigeringen hieronder.
const zetPoule = (page, { premium = true, verweg = false } = {}) => page.evaluate(({ premium, verweg }) => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  db.pools[0].premium_tot = premium ? u(24 * 365) : null;
  if (verweg) Object.assign(db.races[0], { deadline_quali: u(24 * 9), deadline_race: u(24 * 10) });
  if (!db.pool_members.some((m) => m.member_id === 'lid-2')) {
    db.pool_members.push(
      { member_id: 'lid-2', pool_id: 'pool-1', display_name: 'Kees', user_id: 'kees-account' },
      { member_id: 'lid-3', pool_id: 'pool-1', display_name: 'Pipo', user_id: null },
      { member_id: 'lid-4', pool_id: 'pool-1', display_name: 'Joep', user_id: null },
      { member_id: 'lid-5', pool_id: 'pool-1', display_name: 'Mo', user_id: null },
      { member_id: 'lid-6', pool_id: 'pool-1', display_name: 'Sem', user_id: null });
    db.push_abonnementen = [{ endpoint: 'https://push.voorbeeld/kees', member_id: 'lid-2', pool_id: 'pool-1',
      p256dh: 'p', auth: 'a', taal: 'nl' }];
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, { premium, verweg });
const herlaad = async (page) => { await page.reload(); await page.waitForSelector('[data-race]'); };

const { page, jsFouten, stoppen } = await startPagina({ voorafAan: (p) => p.addInitScript(() => {
  navigator.share = async (d) => { window.__gedeeld = d; };
}) });
await meedoen(page);

// ---- 1. alleen met premium -------------------------------------------------------
await zetPoule(page, { premium: false });
await herlaad(page);
check('zonder premium staat er geen tik-knop op de weekendkaart',
  (await page.$('[data-tikrij]')) === null && (await tekst(page, '.wachtop')).includes('Kees'));

await zetPoule(page);
await herlaad(page);
await page.waitForSelector('[data-tikrij]');
const knoppen = await page.$$eval('[data-tik]', (els) => els.map((e) => e.textContent.trim()));
check('met premium een knop bij elke speler die zijn top 10 nog niet invulde',
  ['Kees', 'Pipo', 'Joep', 'Mo', 'Sem'].every((n) => knoppen.some((k) => k.includes(n))), knoppen.join(' | '));
check('en niet bij jezelf', !knoppen.some((k) => k.includes('Danny')));
check('met een label voor een schermlezer', (await page.getAttribute('[data-tik="lid-2"]', 'aria-label')) === 'Tik Kees aan');
check('voor de eerstvolgende sessie', (await page.getAttribute('[data-tik="lid-2"]', 'data-tik-sessie')) === 'quali'
  && (await page.getAttribute('[data-tik="lid-2"]', 'data-tik-race')) === '1');

// ---- 2. Kees aantikken ---------------------------------------------------------------
await page.click('[data-tik="lid-2"]');
await page.waitForSelector('[data-getikt="lid-2"]');
const verzoek = await page.evaluate(() => globalThis.__tikVerzoeken?.at(-1));
check('een tik vraagt de functie tik om een melding, voor deze race, sessie en speler',
  verzoek?.naam === 'tik' && verzoek.body.race === 1 && verzoek.body.sessie === 'quali'
    && verzoek.body.aan === 'lid-2', JSON.stringify(verzoek));
const meldingen = await page.evaluate(() => globalThis.__db.tik_meldingen ?? []);
check('Kees krijgt de melding op zijn toestel, van Danny', meldingen.length === 1
  && meldingen[0].endpoint === 'https://push.voorbeeld/kees' && meldingen[0].van === 'Danny', JSON.stringify(meldingen));
check('de app zegt dat hij een seintje krijgt', (await melding(page)).includes('Kees krijgt een seintje.'));
check('en bij Kees staat nu een vinkje in plaats van een knop', (await page.$('[data-tik="lid-2"]')) === null
  && (await tekst(page, '[data-getikt="lid-2"]')).includes('Kees'));
await herlaad(page);
check('ook na herladen: de database weet dat hij getikt is', (await page.$('[data-getikt="lid-2"]')) !== null
  && (await page.$('[data-tik="lid-2"]')) === null);

// ---- 3. Pipo heeft geen meldingen aan ----------------------------------------------------
await page.click('[data-tik="lid-3"]');
await page.waitForSelector('[data-tik-deel="lid-3"]');
check('zonder meldingen bij Pipo zegt de app dat, en wordt de knop een berichtje',
  (await melding(page)).includes('Pipo heeft geen meldingen aan. Met ✉ stuur je zelf een berichtje.'));
await page.click('[data-tik-deel="lid-3"]');
await page.waitForFunction(() => !!window.__gedeeld);
const gedeeld = (await page.evaluate(() => window.__gedeeld?.text)) ?? '';
check('het berichtje noemt Pipo, de sessie, de race en wanneer hij sluit, met de link',
  /Pipo, de top 10 voor de kwalificatie van Melbourne sluit .+ en je hebt nog niets ingevuld\./.test(gedeeld)
    && gedeeld.includes('?code=RTM026'), gedeeld);

// ---- 4. wat de functie weigert ---------------------------------------------------------------
// Joep is intussen op een ander toestel al aangetikt.
await page.evaluate(() => {
  globalThis.__db.tikken.push({ id: 99, pool_id: 'pool-1', race_id: 1, sessie: 'quali', aan_member: 'lid-4' });
});
await page.click('[data-tik="lid-4"]');
await page.waitForSelector('[data-getikt="lid-4"]');
check('al aangetikt door een ander: dat zegt de app, en Joep krijgt een vinkje',
  (await melding(page)).includes('Joep is voor deze race al aangetikt.'));

// De meldingen zijn nog niet ingericht (geen sleutel in de Vault).
await page.evaluate(() => { globalThis.__db.tik_niet_ingericht = true; });
await page.click('[data-tik="lid-5"]');
await page.waitForSelector('[data-tik-deel="lid-5"]');
check('nog niet ingericht: de app zegt het, en biedt het berichtje aan',
  (await melding(page)).includes('Aantikken lukt nog niet. Met ✉ stuur je Mo zelf een berichtje.'));
await page.evaluate(() => { globalThis.__db.tik_niet_ingericht = false; });

// Sem vulde net zijn top 10 in.
await page.evaluate(() => {
  globalThis.__db.answers.push({ pool_id: 'pool-1', race_id: 1, member_id: 'lid-6', question_id: 'quali_top10',
    waarde: ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'] });
});
await page.click('[data-tik="lid-6"]');
await page.waitForFunction(() => document.querySelector('.meldingbalk')?.textContent.includes('net ingevuld'));
check('net ingevuld: dat zegt de app', (await melding(page)).includes('Die speler heeft de top 10 net ingevuld.'));

// De privacyverklaring onder Profiel noemt het, in een poule met premium.
await page.click('[data-weergave="profiel"]');
await page.click('#privacyopen');
await page.waitForSelector('[data-privacy-tik]');
check('onder Profiel zegt de privacyverklaring wat er van een tik bewaard wordt, en hoe lang',
  (await page.textContent('[data-privacy-tik]')).includes('Na twee maanden gaat dat weg.'));
await page.click('[data-weergave="races"]');
check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

// ---- 1b. een sessie die pas over meer dan zeven dagen sluit ------------------------------------
await zetPoule(page, { verweg: true });
await herlaad(page);
check('sluit de sessie pas over meer dan zeven dagen, dan nog geen tik-knop', (await page.$('[data-tikrij]')) === null);
await stoppen();

// ---- 5. in het Engels ---------------------------------------------------------------------------
{
  const { page, stoppen } = await startPagina({ taal: 'en' });
  await meedoen(page);
  await zetPoule(page);
  await herlaad(page);
  await page.waitForSelector('[data-tikrij]');
  check('in het Engels heet het nudge', (await tekst(page, '[data-tikrij] .label')) === 'nudge'
    && (await page.getAttribute('[data-tik="lid-2"]', 'aria-label')) === 'Nudge Kees');
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
