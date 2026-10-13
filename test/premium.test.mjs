// Premium, stap 1: het eigen profiel van een poule (logo, kleur, sponsorregel).
//
// Voor bedrijven en grote groepen (ROUTEKAART, premium). Danny zet premium in
// het beheer; zolang dat loopt, zet de poulebaas een logo, een kleur en een
// sponsorregel met link, en die staan in de kop van de app, op het scherm waar
// je met een uitnodiging binnenkomt en op het deelplaatje. Wie wat mag, regelt
// de database (test/premium.test.sql); hier staat wat je ziet en doet.
//
// Wat hier vastligt:
//   1. Zonder premium ziet de poulebaas wat het is en hoe je eraan komt (een
//      mail naar het contactadres), en verder niets: geen velden, geen logo.
//   2. Met premium zet de poulebaas een logo (de opslag krijgt het bestand in
//      de map van de poule), een kleur en een sponsorregel met link.
//   3. Wat niet mag, zegt de app voordat er iets gebeurt: een link zonder
//      https, een link zonder tekst, een logo boven 200 kB of in een ander
//      formaat. Er wordt dan niets opgeslagen of geüpload.
//   4. Het profiel staat in de kop: het logo, de baan in de kleur, en "mogelijk
//      gemaakt door" met een link die als sponsor gemarkeerd is en in een nieuw
//      venster opent. Ook voor een speler die geen poulebaas is, en die ziet
//      de velden niet.
//   5. Wie met de code binnenkomt, ziet bij "Wie ben jij?" het logo en de
//      sponsor.
//   6. Het deelplaatje: de schuine strepen in de kleur van de poule, en het
//      logo onderaan.
//   7. Weghalen haalt alles weg, ook het bestand. Is premium voorbij, dan is
//      het profiel nergens meer te zien.
//   8. In het Engels de uitleg in het Engels; geen javascriptfouten.

import { maakControle, startPagina, meedoen, openRace } from './hulp.mjs';

const { check, afronden } = maakControle('premium: het eigen profiel van een poule');
const { page, jsFouten, stoppen } = await startPagina();
await page.setViewportSize({ width: 1280, height: 900 });
await meedoen(page);

const db = (fn, arg) => page.evaluate(([f, a]) => {
  const d = globalThis.__db;
  // eslint-disable-next-line no-new-func
  new Function('d', 'a', f)(d, a);
  sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
}, [fn, arg]);
const lees = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('nabootsing:db')));
const naarPoule = async () => {
  await page.click('[data-weergave="poule"]');
  await page.waitForSelector('#uitnodiging');
};
// Een effen plaatje als png, gemaakt in de browser: zo is het logo op het
// deelplaatje terug te vinden aan zijn kleur.
const png = async (kleur, maat) => Buffer.from(await page.evaluate(({ kleur, maat }) => {
  const c = document.createElement('canvas'); c.width = maat; c.height = maat;
  const x = c.getContext('2d'); x.fillStyle = kleur; x.fillRect(0, 0, maat, maat);
  return c.toDataURL('image/png').split(',')[1];
}, { kleur, maat }), 'base64');

// Danny is de poulebaas van de Vrijdagmiddagpoule, Bram speelt mee.
await db(`d.pools[0].owner_member_id = 'lid-1';
  d.pool_members.push({ member_id: 'lid-bram', pool_id: 'pool-1', display_name: 'Bram', user_id: 'iemand-bram' });`);
await page.reload();
await naarPoule();

// ---- 1. zonder premium ---------------------------------------------------------------
{
  const uitleg = await page.$eval('[data-premium-uitleg]', (p) => ({ tekst: p.textContent.replace(/\s+/g, ' ').trim(),
    mail: p.querySelector('a[href^="mailto:"]')?.getAttribute('href') })).catch(() => null);
  check('zonder premium: de poulebaas leest wat het is en hoe hij eraan komt',
    uitleg?.tekst.includes('Met premium krijgt hij een eigen logo') && uitleg.mail?.startsWith('mailto:contact@predicttherace.com'),
    JSON.stringify(uitleg));
  check('en ziet geen velden, en nergens een logo of sponsorregel',
    !(await page.$('#profiellogo')) && !(await page.$('[data-poulelogo]')) && !(await page.$('[data-sponsor]')));
}

// ---- 2. met premium ------------------------------------------------------------------
await db(`d.pools[0].premium_tot = new Date(Date.now() + 30 * 864e5).toISOString();`);
await page.reload();
await naarPoule();
check('met premium staan er velden voor logo, kleur en sponsorregel, met de datum erbij',
  !!(await page.$('#profiellogo')) && !!(await page.$('#profielkleur'))
    && (await page.textContent('.kol.links')).includes('Premium tot'));

// ---- 3. wat niet mag -----------------------------------------------------------------
const bewaar = async () => { await page.click('#profielBewaren'); await page.waitForTimeout(150); };
const fout = () => page.textContent('#profielfout').then((t) => t.trim());
await page.fill('#profieltekst', 'Bakkerij Jansen');
await page.fill('#profielurl', 'http://bakkerij-jansen.example/');
await bewaar();
check('een link zonder https wordt geweigerd, met uitleg', (await fout()).includes('https://'), await fout());
await page.fill('#profieltekst', '');
await page.fill('#profielurl', 'https://bakkerij-jansen.example/');
await bewaar();
check('een link zonder tekst ook', (await fout()).includes('vul ook de tekst in'), await fout());
await page.fill('#profieltekst', 'Bakkerij Jansen');
await page.setInputFiles('#profiellogo', { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.alloc(210 * 1024, 1) });
await bewaar();
check('een logo boven 200 kB wordt geweigerd', (await fout()).includes('200 kB'), await fout());
await page.setInputFiles('#profiellogo', { name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
await bewaar();
check('en een svg ook', (await fout()).includes('png, jpg of webp'), await fout());
{
  const d = await lees();
  check('er is dan niets opgeslagen en niets geüpload',
    !d.pools[0].sponsor_tekst && !d.opslag && (await page.evaluate(() => globalThis.__opslagTeller.upload)) === 0,
    JSON.stringify({ sponsor: d.pools[0].sponsor_tekst, opslag: Object.keys(d.opslag ?? {}) }));
}

// ---- 2 (vervolg). een goed profiel ---------------------------------------------------
await page.setInputFiles('#profiellogo', { name: 'logo.png', mimeType: 'image/png', buffer: await png('#00ff00', 64) });
await page.fill('#profieltekst', 'Bakkerij Jansen');
await page.fill('#profielurl', 'https://bakkerij-jansen.example/actie');
await page.evaluate(() => { const k = document.querySelector('#profielkleur'); k.value = '#0055ff'; k.dispatchEvent(new Event('input')); });
await page.click('#profielBewaren');
await page.waitForFunction(() => document.querySelector('.melding')?.textContent.includes('opgeslagen'));
{
  const p = (await lees()).pools[0];
  const opslag = Object.keys((await lees()).opslag ?? {});
  check('opgeslagen: kleur, sponsorregel en link', p.merk_kleur === '#0055ff' && p.sponsor_tekst === 'Bakkerij Jansen'
    && p.sponsor_url === 'https://bakkerij-jansen.example/actie', JSON.stringify(p));
  check('het logo staat in de opslag, in de map van de poule, en de poule wijst ernaar',
    /^pool-1\/logo-\d+\.png$/.test(p.merk_logo ?? '') && opslag.length === 1 && opslag[0] === p.merk_logo,
    `${p.merk_logo} · ${opslag.join(', ')}`);
}

// ---- 4. in de kop --------------------------------------------------------------------
const kop = () => page.evaluate(() => {
  const a = document.querySelector('.kop [data-sponsor] a');
  return {
    logo: document.querySelector('.kop [data-poulelogo]')?.src.slice(0, 22) ?? null,
    sponsor: document.querySelector('.kop [data-sponsor]')?.textContent.replace(/\s+/g, ' ').trim() ?? null,
    href: a?.getAttribute('href'), rel: a?.getAttribute('rel'), doel: a?.getAttribute('target'),
    baan: getComputedStyle(document.querySelector('.hoofd .baan')).backgroundColor,
    velden: !!document.querySelector('#profiellogo'),
  };
});
{
  const k = await kop();
  check('in de kop het logo', k.logo?.startsWith('data:image/png'), JSON.stringify(k));
  check('en "mogelijk gemaakt door" met de sponsor', k.sponsor === 'mogelijk gemaakt door Bakkerij Jansen', k.sponsor);
  check('met een link die als sponsor gemarkeerd is en in een nieuw venster opent',
    k.href === 'https://bakkerij-jansen.example/actie' && k.rel === 'sponsored noopener' && k.doel === '_blank', JSON.stringify(k));
  check('en de baan bovenaan in de kleur van de poule', k.baan === 'rgb(0, 85, 255)', k.baan);
}

// Bram is geen poulebaas: hij ziet het profiel wel, de velden niet.
await page.evaluate(() => {
  const d = globalThis.__db;
  const ik = d.pool_members.find((m) => m.member_id === 'lid-1');
  d.pools[0].owner_member_id = 'lid-bram';
  sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
  void ik;
});
await page.reload();
await naarPoule();
{
  const k = await kop();
  check('een speler die geen poulebaas is ziet het logo en de sponsor, maar niet de velden',
    k.logo && k.sponsor && !k.velden && !(await page.$('[data-premium-uitleg]')), JSON.stringify(k));
}
await db(`d.pools[0].owner_member_id = 'lid-1';`);

// ---- 5. binnenkomen met de code -------------------------------------------------------
// Een nieuw toestel: niets onthouden, alleen de link met de code. Daarna weer
// terug naar Danny's toestel.
{
  const basis = page.url().replace(/[?#].*$/, '');
  const toestel = await page.evaluate(() => JSON.stringify(localStorage));
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${basis}?code=RTM026`);
  await page.waitForSelector('[data-lid]');
  const scherm = await page.evaluate(() => ({
    logo: !!document.querySelector('.merkkop [data-poulelogo]'),
    sponsor: document.querySelector('.merkkop [data-sponsor]')?.textContent.replace(/\s+/g, ' ').trim(),
    titel: document.querySelector('h1')?.textContent.trim() }));
  check('wie met de code binnenkomt ziet bij "Wie ben jij?" het logo en de sponsor',
    scherm.titel === 'Wie ben jij?' && scherm.logo && scherm.sponsor === 'mogelijk gemaakt door Bakkerij Jansen',
    JSON.stringify(scherm));
  await page.evaluate((t) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(JSON.parse(t))) localStorage.setItem(k, v);
  }, toestel);
  await page.goto(basis);
  await page.waitForSelector('[data-weergave="poule"]');
}

// ---- 6. het deelplaatje --------------------------------------------------------------
await page.evaluate(() => {
  const d = globalThis.__db;
  const uit = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
  for (const r of d.races.slice(0, 2)) {
    r.quali_result = uit; r.race_result = uit;
    r.deadline_quali = new Date(Date.now() - 6e6).toISOString();
    r.deadline_race = new Date(Date.now() - 5e6).toISOString();
    for (const m of d.pool_members) for (const v of ['quali_top10', 'race_top10']) {
      d.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: m.member_id, question_id: v, waarde: uit });
    }
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
});
await page.reload();
await page.click('[data-weergave="races"]');
await openRace(page, 'Shanghai');
await page.click('[data-deel]');
await page.waitForSelector('.deelvenster img');
{
  // Tel pixels: groen (het logo) in de voet links, blauw (de kleur) in de
  // strepen rechtsboven.
  const telling = await page.evaluate(async () => {
    const img = document.querySelector('.deelvenster img');
    await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const tel = (x0, y0, b, h, past) => {
      const d = x.getImageData(x0, y0, b, h).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (past(d[i], d[i + 1], d[i + 2])) n++;
      return n;
    };
    const h = c.height;
    return {
      groen: tel(0, h - 140, 400, 140, (r, g, b) => g > 200 && r < 60 && b < 60),
      blauw: tel(c.width - 260, 0, 260, 260, (r, g, b) => b > 200 && r < 60 && g > 50 && g < 120),
    };
  });
  check('op het deelplaatje het logo onderaan', telling.groen > 400, JSON.stringify(telling));
  check('en de schuine strepen in de kleur van de poule', telling.blauw > 2000, JSON.stringify(telling));
}
await page.keyboard.press('Escape');

// ---- 7. weghalen, en premium voorbij --------------------------------------------------
await naarPoule();
await page.click('#profielWeg');
await page.waitForFunction(() => document.querySelector('.melding')?.textContent.includes('weggehaald'));
{
  const d = await lees();
  const p = d.pools[0];
  check('weghalen haalt alles weg, ook het bestand in de opslag',
    !p.merk_logo && !p.merk_kleur && !p.sponsor_tekst && !p.sponsor_url && !Object.keys(d.opslag ?? {}).length,
    JSON.stringify({ p, opslag: d.opslag && Object.keys(d.opslag) }));
}
// Weer een profiel, en dan loopt premium af.
await db(`d.pools[0].merk_kleur = '#0055ff'; d.pools[0].sponsor_tekst = 'Bakkerij Jansen';
  d.pools[0].premium_tot = new Date(Date.now() - 864e5).toISOString();`);
await page.reload();
await naarPoule();
{
  const k = await kop();
  check('is premium voorbij, dan geen sponsor en geen kleur meer in de kop', !k.sponsor && k.baan !== 'rgb(0, 85, 255)', JSON.stringify(k));
  check('en leest de poulebaas weer de uitleg in plaats van de velden',
    !!(await page.$('[data-premium-uitleg]')) && !(await page.$('#profiellogo')));
}

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();

// ---- 8. in het Engels ------------------------------------------------------------------
{
  const { page: en, jsFouten: fouten, stoppen: stop } = await startPagina({ taal: 'en' });
  await meedoen(en);
  await en.evaluate(() => { const d = globalThis.__db; d.pools[0].owner_member_id = 'lid-1';
    sessionStorage.setItem('nabootsing:db', JSON.stringify(d)); });
  await en.reload();
  await en.click('[data-weergave="poule"]');
  await en.waitForSelector('[data-premium-uitleg]');
  const t = (await en.textContent('[data-premium-uitleg]')).replace(/\s+/g, ' ');
  check('in het Engels: de uitleg in het Engels', t.includes('With premium it gets its own logo'), t);
  check('geen javascriptfouten in het Engels', fouten.length === 0, fouten.join(' | '));
  await stop();
}

process.exit(afronden() ? 0 : 1);
