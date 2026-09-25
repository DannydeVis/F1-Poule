// De beheerpagina (beheer/).
//
// Aanleiding: "wat ik nu wil is een back end. waar ik de poules kan beheren,
// de openF1 data kan zien of het geladen is en dat ik het kan controleren,
// spelers kan beheren, statistieken kan zien ... en hij moet installeerbaar
// zijn net zoals de app."
//
// Wat hier vastligt:
//   1. Binnenkomen: zonder sessie inloggen met Google of een inloglink; een
//      anoniem account van de app wordt niet vervangen (dan raakt de speler op
//      dat toestel zijn account kwijt); een gewoon account ziet niets.
//   2. Het overzicht: de getallen, de status van de sync, en wat aandacht
//      nodig heeft (een sessie zonder uitslag), met een weg naar die race.
//   3. Poules: zoeken, bijwerken (naam, openbaar, poulebaas), en verwijderen
//      pas nadat je de naam hebt overgetikt.
//   4. Spelers: het soort account, filteren op poule, hernoemen, losmaken en
//      verwijderen (die laatste twee met twee tikken).
//   5. Data: het logboek van de sync, per race welke uitslagen er zijn, en de
//      controle bij OpenF1: gelijk, anders (met de verschillen), overnemen,
//      leegmaken, afgelast. Onbereikbaar zegt dat ook.
//   6. Statistieken: grafieken met een tooltip en een tabel eronder.
//   7. De app telt bezoeken: één keer per bezoek, niet bij elke keer tekenen.
//   8. Installeerbaar: een eigen manifest met eigen pictogrammen.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, startPagina, meedoen, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('de beheerpagina');
const { page, jsFouten, url, stoppen } = await startPagina();
await page.setViewportSize({ width: 1366, height: 900 });
const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const db = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('nabootsing:db')));
const naarBeheer = async () => { await page.goto(url + 'beheer/'); await page.waitForSelector('.toegang, .tabs'); };
// Een rij openklikken als hij nog niet open staat: nog een keer tikken klapt hem dicht.
const open = async (rij, detail) => { if (!(await page.$(detail))) await page.click(rij); await page.waitForSelector(detail); };

// ---- 7 (eerst): de app telt bezoeken -----------------------------------------
await meedoen(page);
const telling = async () => (await db()).bezoeken;
const vandaag = new Date().toISOString().slice(0, 10);
{
  const voor = (await telling())[`${vandaag}|app`] ?? 0;
  // Rondklikken tekent het scherm tientallen keren opnieuw.
  for (const w of ['stand', 'poule', 'profiel', 'races']) await page.click(`[data-weergave="${w}"]`);
  const na = (await telling())[`${vandaag}|app`] ?? 0;
  check('de app telt een bezoek, en niet elke keer dat hij tekent', voor === 1 && na === 1, `${voor} → ${na}`);
  await page.reload();
  await page.waitForSelector('[data-race]');
  check('een nieuw bezoek telt wel', (await telling())[`${vandaag}|app`] === 2, JSON.stringify(await telling()));
  check('en het beginscherm (poulecode invullen) telt apart', (await telling())[`${vandaag}|start`] === 1,
    JSON.stringify(await telling()));
  const d = await db();
  check('en het account van wie hem opende staat bij de actieven van vandaag, één keer',
    d.actief.filter((a) => a.dag === vandaag).length === 1, JSON.stringify(d.actief));
}

// ---- 1. binnenkomen ------------------------------------------------------------
// Een anoniem account van de app op dit toestel.
await naarBeheer();
{
  const t = await tekst('.toegang');
  check('met een anoniem account uit de app: eerst koppelen in de app', t.includes('zonder gekoppeld account'), t);
  check('en geen knop om hier in te loggen (dat zou de speler loskoppelen)',
    (await page.$('#google')) === null && (await page.$('a[href="../app/"]')) !== null);
  check('en geen gegevens', (await page.$('.tabs')) === null);
}

// Een ander toestel, zonder sessie: inloggen.
await page.evaluate(() => localStorage.removeItem('nabootsing:sessie'));
await naarBeheer();
check('zonder sessie: inloggen met Google of met een inloglink',
  (await page.$('#google')) !== null && (await page.$('#mailform')) !== null);
await page.fill('#mail', 'onbekend@voorbeeld.nl');
await page.click('#mailform button');
await page.waitForFunction(() => document.querySelector('#inlogbericht').textContent.trim());
check('een onbekend adres krijgt geen account (het beheer maakt er geen aan)',
  (await tekst('#inlogbericht')) === 'Bij dat adres hoort geen account.', await tekst('#inlogbericht'));

// Met Google, als iemand die geen beheerder is.
await page.evaluate(() => globalThis.__mail.googleAls('iemand@voorbeeld.nl'));
await page.click('#google');
await page.goto(await page.evaluate(() => globalThis.__mail.laatsteLink()));
await page.waitForSelector('.toegang');
{
  const t = await tekst('.toegang');
  check('een gewoon account is geen beheerder, en ziet niets', t.includes('is geen beheerder')
    && t.includes('iemand@voorbeeld.nl') && (await page.$('.tabs')) === null, t);
}
await page.click('#uit');
await page.waitForSelector('#google');

// Met Google als de beheerder.
await page.evaluate(() => globalThis.__mail.googleAls('beheer@voorbeeld.nl'));
await page.click('#google');
const link = await page.evaluate(() => globalThis.__mail.laatsteLink());
// Wie beheerder is staat in de database (in het echt: site_beheerders).
await page.evaluate(() => {
  const d = globalThis.__db;
  d.site_beheerders = [d.auth_users.find((u) => u.email === 'beheer@voorbeeld.nl').id];
  sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
});
// Wat er te beheren valt: twee poules, spelers met elk soort account, een
// gereden race met een kwalificatie maar zonder raceuitslag, en het logboek.
await page.evaluate(() => {
  const d = globalThis.__db;
  const beheerder = d.site_beheerders[0];
  d.auth_users.push({ id: 'mailaccount', is_anonymous: false, email: 'sanne@voorbeeld.nl', identities: [{ provider: 'email' }] });
  d.pools.push({ id: 'pool-2', name: 'Kantoorpoule', join_code: 'KNT123', season: 2026, is_public: false, owner_member_id: null });
  d.pool_members.push(
    { member_id: 'lid-7', pool_id: 'pool-2', display_name: 'Sanne', user_id: 'mailaccount' },
    { member_id: 'lid-8', pool_id: 'pool-2', display_name: 'Kees', user_id: null },
    { member_id: 'lid-9', pool_id: 'pool-2', display_name: 'Beheerder', user_id: beheerder });
  const r = d.races[0];
  Object.assign(r, { quali_key: 9001, race_key: 9002, country: 'Australia',
    deadline_quali: new Date(Date.now() - 30 * 36e5).toISOString(),
    deadline_race: new Date(Date.now() - 10 * 36e5).toISOString(),
    quali_result: ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'] });
  d.answers.push({ pool_id: 'pool-2', race_id: r.id, member_id: 'lid-8', question_id: 'winnaar', waarde: '1' });
  d.sync_runs = [{ gestart: new Date(Date.now() - 12 * 6e4).toISOString(), klaar: new Date(Date.now() - 11 * 6e4).toISOString(),
                   ok: true, bijgewerkt: 1, samenvatting: 'Ronde 1 Melbourne: quali_result', fouten: null }];
  sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
});
await page.goto(link);
await page.waitForSelector('.tabs');
check('de beheerder komt binnen, en ziet met welk account', (await tekst('.merk')).includes('beheer@voorbeeld.nl'),
  await tekst('.merk'));

// ---- 2. het overzicht ------------------------------------------------------------
{
  const d = await db();
  const tegels = await page.$$eval('.tegel', (els) => Object.fromEntries(els.map((e) =>
    [e.querySelector('.label').textContent.trim(), e.querySelector('.getal').textContent.trim()])));
  check('het overzicht telt de spelers en de poules',
    tegels.Spelers === String(d.pool_members.length) && tegels.Poules === '2', JSON.stringify(tegels));
  check('de sync draait: laatst 12 minuten geleden', (await tekst('#synckaart')).includes('Draait')
    && (await tekst('#synckaart')).includes('12 min geleden'), await tekst('#synckaart'));
  check('met een knop om hem met de hand te starten, in GitHub',
    (await page.getAttribute('#synckaart a', 'href')).endsWith('/actions/workflows/sync.yml'));
  const aandacht = await tekst('#aandacht');
  check('wat aandacht nodig heeft: de race van ronde 1 heeft na uren nog geen uitslag',
    /Race van ronde 1 Melbourne heeft na \d+ uur nog geen uitslag/.test(aandacht), aandacht);
  check('en de kwalificatie, die wel een uitslag heeft, staat er niet bij', !aandacht.includes('Kwalificatie van ronde 1'), aandacht);
}
await page.click('#aandacht [data-race="1"]');
await page.waitForSelector('#racedetail');
check('daarop tikken opent die race in Data', (await tekst('#racedetail h2')).includes('Melbourne')
  && (await page.getAttribute('[data-tab="data"]', 'aria-current')) === 'true');

// Een sync die misging, en een die lang niet draaide.
const syncMet = async (run) => {
  await page.evaluate((r) => { const d = globalThis.__db; d.sync_runs.push(r);
    sessionStorage.setItem('nabootsing:db', JSON.stringify(d)); }, run);
  await page.click('[data-tab="overzicht"]');
  await page.click('#vernieuw');
  await page.waitForTimeout(200);
  return tekst('#synckaart');
};
{
  const t = await syncMet({ gestart: new Date().toISOString(), ok: false, bijgewerkt: 0,
    samenvatting: 'Niks nieuws', fouten: 'Supabase gaf 500' });
  check('een mislukte sync staat er als "Mislukt", met de fout erbij', t.includes('Mislukt') && t.includes('Supabase gaf 500'), t);
  const t2 = await syncMet({ gestart: new Date(Date.now() - 9 * 36e5).toISOString(), ok: true, bijgewerkt: 0, samenvatting: 'Niks nieuws' });
  check('een sync die uren niet draaide: "Lang niet gedraaid"', t2.includes('Lang niet gedraaid'), t2);
}

// ---- 3. poules --------------------------------------------------------------------
await page.click('[data-tab="poules"]');
await page.fill('#zoekpoule', 'knt');
check('zoeken op code vindt de poule', (await page.$$eval('[data-poule]', (r) => r.length)) === 1
  && (await page.$('[data-poule="pool-2"]')) !== null);
await page.click('[data-poule="pool-2"]');
await page.waitForSelector('#pouleform');
await page.fill('#pouleform [name="name"]', 'De Kantoorpoule');
await page.check('#pouleform [name="is_public"]');
await page.selectOption('#pouleform [name="owner_member_id"]', 'lid-7');
await page.click('#pouleform button[type="submit"]');
await page.waitForSelector('.melding');
{
  const p = (await db()).pools.find((x) => x.id === 'pool-2');
  check('een poule bijwerken: naam, openbaar en poulebaas', p.name === 'De Kantoorpoule' && p.is_public === true
    && p.owner_member_id === 'lid-7', JSON.stringify(p));
  check('met een melding', (await tekst('.melding')).includes('De Kantoorpoule is bijgewerkt'), await tekst('.melding'));
}
await page.click('#pouledetail details summary');
check('verwijderen kan pas als je de naam overtikt', await page.isDisabled('#pouleweg'));
await page.fill('#bevestignaam', 'De Kantoor');
check('ook niet met de halve naam', await page.isDisabled('#pouleweg'));

// ---- 4. spelers --------------------------------------------------------------------
await page.click('[data-tab="spelers"]');
{
  const soort = (id) => tekst(`[data-speler="${id}"] td:nth-child(3) .badge`);
  check('het soort account: Google, mailadres, alleen dit toestel, geen',
    (await soort('lid-9')) === 'Google' && (await soort('lid-7')) === 'mailadres'
      && (await soort('lid-1')) === 'alleen dit toestel' && (await soort('lid-8')) === 'geen account',
    [await soort('lid-9'), await soort('lid-7'), await soort('lid-1'), await soort('lid-8')].join(', '));
}
await page.selectOption('#filterpoule', 'pool-2');
check('filteren op poule', (await page.$$eval('[data-speler]', (r) => r.length)) === 3);
await page.fill('#zoekspeler', 'sanne@');
check('zoeken op mailadres', (await page.$$eval('[data-speler]', (r) => r.map((x) => x.dataset.speler))).join() === 'lid-7');
await page.fill('#zoekspeler', '');
await page.click('[data-speler="lid-8"]');
await page.fill('#spelerform [name="naam"]', 'Kees de Vries');
await page.click('#spelerform button');
await page.waitForSelector('.melding');
check('een speler hernoemen', (await db()).pool_members.find((m) => m.member_id === 'lid-8').display_name === 'Kees de Vries');

await page.click('[data-speler="lid-7"]');
// Een tweede tik alleen als de knop er nog staat: doet de eerste het al, dan is
// hij weg en zakt de controle hierboven in plaats van dat de test vastloopt.
const nogEens = async (kies) => { if (await page.$(kies)) await page.click(kies); await page.waitForSelector('.melding'); };
await page.click('#losmaken');
check('losmaken vraagt eerst', (await page.$('#losmaken')) !== null
  && (await tekst('#losmaken')) === 'Losmaken? Tik nog een keer'
  && (await db()).pool_members.find((m) => m.member_id === 'lid-7').user_id === 'mailaccount');
await nogEens('#losmaken');
check('en maakt dan los', (await db()).pool_members.find((m) => m.member_id === 'lid-7').user_id === null);

await page.click('[data-speler="lid-8"]');
await page.click('#spelerweg');
check('verwijderen vraagt eerst', (await db()).pool_members.some((m) => m.member_id === 'lid-8'));
await nogEens('#spelerweg');
{
  const d = await db();
  check('en verwijdert dan, met zijn inzendingen', !d.pool_members.some((m) => m.member_id === 'lid-8')
    && !d.answers.some((a) => a.member_id === 'lid-8'));
}

// ---- 5. data --------------------------------------------------------------------
await page.click('[data-tab="data"]');
{
  const log = await tekst('#logboek');
  check('het logboek van de sync, met wat hij deed', log.includes('Ronde 1 Melbourne: quali_result') && log.includes('mislukt'), log);
  const rij = await tekst('#races tr[data-race="1"]');
  check('per race: de kwalificatie heeft tien plekken, de race wacht nog', /✓\s*10/.test(rij) && rij.includes('wacht'), rij);
  check('en een race zonder coureurs valt op', (await tekst('#races tr[data-race="3"] td:nth-child(3)')) === '0');
}
// OpenF1 nagebootst: de kwalificatie met twee plekken omgedraaid, de race wel.
let openf1Weg = false;
await page.route('https://api.openf1.org/**', (route) => {
  if (openf1Weg) return route.abort();
  const k = new URL(route.request().url()).searchParams.get('session_key');
  const lijst = k === '9001' ? ['1', '4', '16', '63', '81', '44', '12', '14', '18', '10']
    : k === '9002' ? ['4', '1', '16', '63', '81', '44', '12', '14', '10', '18'] : [];
  route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify(lijst.map((nr, i) => ({ driver_number: Number(nr), position: i + 1 }))) });
});
await open('#races tr[data-race="1"]', '#racedetail');
await page.click('#controleer');
await page.waitForSelector('[data-sessie="quali_result"] .status');
{
  const q = await tekst('[data-sessie="quali_result"]');
  check('de controle bij OpenF1 ziet dat de kwalificatie anders is', q.includes('Anders dan OpenF1'), q);
  const verschil = await page.$$eval('[data-sessie="quali_result"] .verschil tbody tr', (rs) =>
    rs.map((r) => [...r.cells].map((c) => c.textContent.trim()).join(' ')));
  check('en laat precies de plekken zien die verschillen: P9 en P10',
    verschil.join(' | ') === 'P9 GAS STR | P10 STR GAS', verschil.join(' | '));
  check('bij de race zonder uitslag biedt hij de uitslag van OpenF1 aan',
    (await page.$('[data-sessie="race_result"] [data-overnemen="race_result"]')) !== null);
}
await page.click('[data-overnemen="race_result"]');
await page.waitForSelector('.melding');
{
  const r = (await db()).races.find((x) => x.id === 1);
  check('overnemen zet de uitslag van OpenF1 erin, niet als "met de hand"',
    r.race_result?.join() === '4,1,16,63,81,44,12,14,10,18' && r.race_handmatig === false, JSON.stringify(r.race_result));
}
await open('#races tr[data-race="1"]', '#racedetail');
await page.click('#controleer');
await page.waitForSelector('[data-sessie="race_result"] .status');
check('en daarna is hij gelijk aan OpenF1', (await tekst('[data-sessie="race_result"]')).includes('Gelijk aan OpenF1'));

await page.click('[data-leeg="quali_result"]');
check('leegmaken vraagt eerst', (await db()).races.find((x) => x.id === 1).quali_result !== null);
await nogEens('[data-leeg="quali_result"]');
check('en maakt dan leeg, zodat de sync hem opnieuw ophaalt', (await db()).races.find((x) => x.id === 1).quali_result === null);

await open('#races tr[data-race="1"]', '#racedetail');
await page.check('#afgelast');
await page.waitForSelector('.melding');
check('een race afgelasten', (await db()).races.find((x) => x.id === 1).afgelast === true
  && (await tekst('#races tr[data-race="1"]')).includes('afgelast'));

openf1Weg = true;
await open('#races tr[data-race="1"]', '#racedetail');
await page.click('#controleer');
await page.waitForSelector('.melding.fout', { timeout: 5000 }).catch(() => {});
check('is OpenF1 niet bereikbaar, dan staat dat er',
  (await page.$('.melding.fout')) !== null && (await tekst('.melding.fout')).includes('OpenF1 is niet bereikbaar'));

// ---- 6. statistieken --------------------------------------------------------------
await page.evaluate(() => {
  const d = globalThis.__db;
  const dag = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  for (let i = 0; i < 30; i++) d.bezoeken[`${dag(i)}|app`] = 10 + i;
  sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
});
await page.click('#vernieuw');
await page.click('[data-tab="statistieken"]');
{
  const kolommen = await page.$$eval('[data-grafiek="bezoeken"] .raak', (r) => r.length);
  check('bezoeken per dag: dertig dagen', kolommen === 30, String(kolommen));
  await page.hover('[data-grafiek="bezoeken"] .raak[data-i="29"]');
  const tip = await tekst('[data-grafiek="bezoeken"] .tip');
  // Vandaag: alles wat er vandaag geteld is, ook het beginscherm.
  const n = Object.entries((await db()).bezoeken).filter(([k]) => k.startsWith(vandaag)).reduce((t, [, v]) => t + v, 0);
  check('met een tooltip die het getal en de dag noemt', await page.isVisible('[data-grafiek="bezoeken"] .tip')
    && tip.startsWith(`${n} bezoeken`) && tip.includes(new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })), tip);
  const rijen = await page.$$eval('[data-grafiek="bezoeken"] details tbody tr', (r) => r.length);
  check('en alle getallen staan ook in een tabel', rijen === 30, String(rijen));
  const assen = await page.$$eval('[data-grafiek="races"] text.as', (t) => t.map((x) => x.textContent));
  check('ingeleverd per race is een percentage, tot 100', assen.includes('100') && assen.includes('50'), assen.join(','));
  check('de accounts achter de spelers', (await page.$$eval('.balk', (b) => b.length)) >= 3);
}

// ---- 3b. een poule verwijderen ---------------------------------------------------
await page.click('[data-tab="poules"]');
await page.fill('#zoekpoule', '');
await open('[data-poule="pool-2"]', '#pouledetail');
await page.click('#pouledetail details summary');
await page.fill('#bevestignaam', 'De Kantoorpoule');
check('met de hele naam kan het wel', !(await page.isDisabled('#pouleweg')));
await page.click('#pouleweg');
await page.waitForSelector('.melding');
{
  const d = await db();
  check('een poule verwijderen neemt zijn spelers mee', !d.pools.some((p) => p.id === 'pool-2')
    && !d.pool_members.some((m) => m.pool_id === 'pool-2'));
}

// ---- 8. installeerbaar -------------------------------------------------------------
{
  const html = readFileSync(join(wortel, 'beheer', 'index.html'), 'utf8');
  const app = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
  const manifest = JSON.parse(readFileSync(join(wortel, 'beheer', 'manifest.webmanifest'), 'utf8'));
  check('het beheer heeft een eigen manifest, met een eigen scope', html.includes('<link rel="manifest" href="manifest.webmanifest">')
    && manifest.scope === './' && manifest.start_url === './' && manifest.display === 'standalone'
    && manifest.name.includes('Beheer'), JSON.stringify(manifest));
  const pictogrammen = await page.evaluate(async (lijst) => Promise.all(lijst.map(async (src) => {
    const r = await fetch(`/beheer/${src}`); return r.ok && r.headers.get('content-type') === 'image/png';
  })), [...manifest.icons.map((i) => i.src), 'pictogrammen/beheer-apple-180.png']);
  check('met eigen pictogrammen, ook voor een iPhone en een maskable voor Android',
    pictogrammen.every(Boolean) && manifest.icons.some((i) => i.purpose === 'maskable'), JSON.stringify(pictogrammen));
  check('en niet in een zoekmachine', /<meta name="robots" content="noindex/.test(html));
  const sleutel = (bron, naam) => bron.match(new RegExp(`const ${naam} = '([^']+)'`))?.[1];
  check('met dezelfde publieke sleutel als de app (en nooit een geheime)',
    sleutel(html, 'SUPABASE_URL') === sleutel(app, 'SUPABASE_URL')
      && sleutel(html, 'SUPABASE_ANON_KEY') === sleutel(app, 'SUPABASE_ANON_KEY')
      && !/service_role/.test(html.replace(/De service_role key[^\n]*\n/g, '')));
}

check('geen JavaScript-fouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
