// Meldingen op het goede moment vragen (26 oktober).
//
// Danny: "mensen moeten er achter komen dat er notificaties zijn. Dus met de
// onboarding vragen om notificaties", en: "als mensen hun poule niet hebben
// ingevuld en random krijgen. Dan ook een reminder. Vergeten in te vullen? Zet
// notificaties aan."
//
// Wat hier vastligt:
//   1. De rondleiding krijgt een vierde stap, meldingen, als dit toestel het nu
//      kan vragen. De knop zet ze aan (een rij voor de sync); de vraag van de
//      browser wegklikken of weigeren is overslaan; Nu niet zegt dat het onder
//      Profiel kan.
//   2. Een browser die al nee zei krijgt die stap niet (de gewone testbrowser).
//   3. Een iPhone in Safari ook niet; daar zegt de beginscherm-stap dat het in
//      de app op het beginscherm kan.
//   4. Na een gemiste race een kaart: vergeten in te vullen? Alleen als de app
//      in de laatste race een top 10 voor je invulde, alleen voor wie eerder in
//      deze poule wel zelf iets invulde, en alleen als meldingen uit staan en
//      het kan. Aanzetten schrijft een rij; Nu niet houdt hem weg tot de
//      volgende gemiste race.
//   5. In Safari op een iPhone wijst die kaart naar het beginscherm.
//   6. In de app op het beginscherm een kaart dat het daar kan, één keer weg te
//      tikken.
//
// De pushdienst kan niet in een testbrowser. Hier wordt hij nagebootst, net
// als in test/meldingen.test.mjs: de app doorloopt gewoon zijn eigen weg.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('meldingen op het goede moment vragen');

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) '
  + 'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
// Een vaste dag, ruim na de overstap naar willekeurig invullen (25 september):
// dan hangt wat de test ziet niet af van de dag waarop hij draait.
const NU = new Date('2026-10-15T12:00:00Z');

const tekst = async (page, kies = '#app') =>
  (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const stap = (page) => page.getAttribute('[data-rondleiding]', 'data-rondleiding');

// Een browser die nog niets besloot, en een pushdienst die aanmelden goedvindt.
// `antwoord` is wat de speler op de vraag van de browser zegt. Wat hij
// besluit, en of dit toestel aangemeld is, blijft staan na herladen.
function PUSH(antwoord) {
  let recht = sessionStorage.getItem('nep:recht') ?? 'default';
  Object.defineProperty(Notification, 'permission', { get: () => recht });
  Notification.requestPermission = async () => {
    recht = antwoord;
    sessionStorage.setItem('nep:recht', recht);
    return recht;
  };
  const ab = {
    endpoint: 'https://push.voorbeeld/abc',
    toJSON: () => ({ endpoint: 'https://push.voorbeeld/abc', keys: { p256dh: 'p256', auth: 'auth' } }),
    unsubscribe: async () => true,
  };
  const reg = { pushManager: {
    subscribe: async () => { sessionStorage.setItem('nep:ab', '1'); return ab; },
    getSubscription: async () => (sessionStorage.getItem('nep:ab') ? ab : null),
  } };
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true,
    get: () => ({ register: async () => reg, ready: Promise.resolve(reg), getRegistration: async () => reg }) });
}
const metPush = (antwoord = 'granted') => (p) => p.addInitScript(PUSH, antwoord);
const opDag = (...meer) => async (p) => {
  await p.clock.setFixedTime(NU);
  for (const m of meer) await m(p);
};

// Code invullen en Danny aanwijzen, tot vlak vóór de rondleiding.
async function claim(page) {
  await page.waitForSelector('#code');
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
  await page.waitForSelector('[data-lid]');
  await page.click('[data-lid]:has(.nm:text-is("Danny"))');
  await page.waitForSelector('#rondleidingweg');
}
// Door de rondleiding tot de stap `naar`, met Volgende of Nu niet.
async function doorTot(page, naar) {
  while ((await stap(page)) !== naar) {
    const verder = (await page.$('#rondverder')) ?? (await page.$('#rondnunniet'));
    const was = await stap(page);
    await verder.click();
    await page.waitForFunction((w) => document.querySelector('[data-rondleiding]')
      ?.getAttribute('data-rondleiding') !== w, was);
  }
}
const rijen = (page) => page.evaluate(() => globalThis.__db.push_abonnementen ?? []);

// ------------------------------------------------------------------
//  1. De rondleiding: de knop zet meldingen aan
// ------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina({ voorafAan: metPush('granted') });
  await claim(page);
  const t1 = await tekst(page);
  check('kan dit toestel meldingen vragen, dan heeft de rondleiding er een stap bij',
    (await page.$$('.stappen .stap')).length === 3 && t1.includes('stap 1 van 3'), t1.slice(0, 160));
  await doorTot(page, 'meldingen');
  const t3 = await tekst(page);
  check('als laatste stap: mis geen deadline, met wat je dan krijgt',
    t3.includes('Mis geen deadline') && t3.includes('Krijg een seintje als een deadline nadert')
      && t3.includes('stap 3 van 3'), t3);
  check('met een knop om ze aan te zetten, en Nu niet',
    (await page.$('#rondmelding')) !== null && (await page.$('#rondnunniet')) !== null);
  check('de browser is nog niets gevraagd: dat gebeurt pas na een tik',
    (await page.evaluate(() => Notification.permission)) === 'default');

  await page.click('#rondmelding');
  await page.waitForSelector('[data-race]');
  const r = await rijen(page);
  check('de knop zet meldingen aan: één rij voor de sync, voor deze speler en poule',
    r.length === 1 && r[0].member_id === 'lid-1' && r[0].pool_id === 'pool-1', JSON.stringify(r));
  check('en de rondleiding is klaar', (await page.$('[data-rondleiding]')) === null
    && (await page.evaluate(() => localStorage.getItem('poule:welkom'))) === 'klaar');
  const m = await tekst(page, '.meldingbalk');
  check('de melding noemt alleen wat er nog openstaat (het account), niet de meldingen',
    m.includes('Je account koppelen kan later nog, onder Profiel.') && !m.includes('meldingen'), m);
  check('en op het racesscherm staat geen kaart om ze aan te zetten',
    (await page.$('[data-meldingkaart]')) === null);
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ------------------------------------------------------------------
//  1a. Account gekoppeld en meldingen aan: dan zegt de melding dát
// ------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina({ voorafAan: metPush('granted') });
  await claim(page);
  await page.click('#rondverder');
  await page.waitForSelector('#googlekoppel');
  await page.click('#googlekoppel');
  await page.waitForTimeout(200);
  await page.goto(await page.evaluate(() => globalThis.__mail.laatsteLink()));
  await page.waitForSelector('[data-rondleiding="account"]');
  await page.click('#rondverder');
  await page.waitForSelector('[data-rondleiding="meldingen"]');
  await page.click('#rondmelding');
  await page.waitForSelector('[data-race]');
  const m = await tekst(page, '.meldingbalk');
  check('niets overgeslagen: de melding zegt dat meldingen nu aanstaan',
    m.includes('Meldingen staan aan op dit toestel.'), m);
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ------------------------------------------------------------------
//  1b. De vraag van de browser geweigerd: overgeslagen, zonder verwijt
// ------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina({ voorafAan: metPush('denied') });
  await claim(page);
  await doorTot(page, 'meldingen');
  await page.click('#rondmelding');
  await page.waitForSelector('[data-race]');
  const m = await tekst(page, '.meldingbalk');
  check('wie de vraag van de browser weigert, is gewoon door: de stap is overgeslagen',
    (await page.$('[data-rondleiding]')) === null && (await rijen(page)).length === 0);
  check('en hoort niet dat het later onder Profiel kan, want dat kan dan niet meer',
    m.includes('Je account koppelen kan later nog, onder Profiel.') && !m.includes('meldingen'), m);
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ------------------------------------------------------------------
//  1c. Nu niet: het kan later, onder Profiel
// ------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina({ voorafAan: metPush('granted') });
  await claim(page);
  await doorTot(page, 'meldingen');
  await page.click('#rondnunniet');
  await page.waitForSelector('[data-race]');
  const m = await tekst(page, '.meldingbalk');
  check('Nu niet zegt dat het account en de meldingen later nog kunnen, onder Profiel',
    m.includes('Je account koppelen en meldingen aanzetten kan later nog, onder Profiel.'), m);
  check('de browser is niets gevraagd', (await page.evaluate(() => Notification.permission)) === 'default'
    && (await rijen(page)).length === 0);
  check('zonder gemiste race en buiten de app op het beginscherm: geen kaart',
    (await page.$('[data-meldingkaart]')) === null);
  await page.click('[data-weergave="profiel"]');
  await page.waitForSelector('#meldingAan');
  check('en onder Profiel staat de knop inderdaad', true);
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ------------------------------------------------------------------
//  1d. Alles overslaan, meteen bij de eerste stap
// ------------------------------------------------------------------
{
  const { page, stoppen } = await startPagina({ voorafAan: metPush('granted') });
  await claim(page);
  await page.click('#rondleidingweg');
  await page.waitForSelector('[data-race]');
  const m = await tekst(page, '.meldingbalk');
  check('Overslaan noemt ook de meldingen die je niet zag',
    m.includes('Je account koppelen en meldingen aanzetten kan later nog, onder Profiel.'), m);
  await stoppen();
}

// ------------------------------------------------------------------
//  2. Een browser die al nee zei: geen stap
// ------------------------------------------------------------------
{
  const { page, stoppen } = await startPagina();
  await claim(page);
  check('een testbrowser zegt nee tegen meldingen, en krijgt de stap dus niet',
    (await page.$$('.stappen .stap')).length === 2
      && (await page.evaluate(() => Notification.permission)) === 'denied');
  await page.click('#rondleidingweg');
  await page.waitForSelector('[data-race]');
  const m = await tekst(page, '.meldingbalk');
  check('en Overslaan zegt er dan niets over', !m.includes('meldingen'), m);
  await stoppen();
}

// ------------------------------------------------------------------
//  3. Een iPhone in Safari: in de beginscherm-stap, niet als eigen stap
// ------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina({ userAgent: IPHONE,
    voorafAan: (p) => p.addInitScript(() => { delete window.PushManager; }) });
  await claim(page);
  const t = await tekst(page);
  check('een iPhone in Safari: drie stappen, zonder meldingen-stap',
    (await page.$$('.stappen .stap')).length === 3 && t.includes('stap 1 van 3'), t.slice(0, 120));
  await doorTot(page, 'beginscherm');
  const uitleg = await tekst(page, '[data-meldingen-later]');
  check('de beginscherm-stap zegt dat de app op je beginscherm je een seintje kan geven',
    uitleg.includes('een seintje geven als een deadline nadert')
      && uitleg.includes('Zet meldingen aan zodra je hem vanaf je beginscherm opent.'), uitleg);
  check('en het is de laatste stap', (await page.$('#rondverder'))
    && (await tekst(page, '#rondverder')) === 'Naar de poule');
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ------------------------------------------------------------------
//  4. Na een gemiste race: vergeten in te vullen?
// ------------------------------------------------------------------
// Melbourne (ronde 1) is lang geleden, Shanghai (ronde 2) twee dagen geleden,
// Suzuka (ronde 3) komt nog. Automatisch invullen staat al weken aan.
// `eerder`: Danny vulde Melbourne zelf in. `suzuka`: Suzuka is ook gereden
// (`'leeg'`) of door Danny zelf ingevuld (`'zelf'`).
const zetRaces = (page, { eerder = true, suzuka = null } = {}) => page.evaluate(({ eerder, suzuka }) => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  const lijst = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
  db.pools[0].autofill_vanaf = u(-400);
  Object.assign(db.races[0], { deadline_quali: u(-200), deadline_race: u(-199) });
  Object.assign(db.races[1], { deadline_quali: u(-50), deadline_race: u(-49) });
  Object.assign(db.races[2], { drivers: db.races[0].drivers,
    deadline_quali: suzuka ? u(-5) : u(72), deadline_race: suzuka ? u(-4) : u(96) });
  db.answers = (db.answers ?? []).filter((a) => a.member_id !== 'lid-1');
  const zelf = (race) => {
    for (const v of ['quali_top10', 'race_top10']) {
      db.answers.push({ pool_id: 'pool-1', race_id: race, member_id: 'lid-1', question_id: v, waarde: lijst });
    }
  };
  if (eerder) zelf(1);
  if (suzuka === 'zelf') zelf(3);
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, { eerder, suzuka });
const herlaad = async (page) => {
  await page.reload();
  await page.waitForSelector('[data-race]');
  // Of meldingen aanstaan vraagt de app na het tekenen aan de browser; dat
  // antwoord even afwachten voordat de afwezigheid van de kaart iets zegt.
  await page.waitForTimeout(400);
};

{
  const { page, jsFouten, stoppen } = await startPagina({ voorafAan: opDag(metPush('granted')) });
  await meedoen(page);

  await zetRaces(page, { eerder: false });
  await herlaad(page);
  check('wie in deze poule nog nooit zelf iets invulde, is niets vergeten: geen kaart',
    (await page.$('[data-meldingkaart]')) === null);

  await zetRaces(page);
  await herlaad(page);
  await page.waitForSelector('[data-meldingkaart="gemist"]');
  const t = await tekst(page, '[data-meldingkaart]');
  check('wie eerder zelf invulde en nu een race miste, krijgt de kaart: vergeten in te vullen?',
    t.includes('vergeten in te vullen?'), t);
  check('met de race erbij en wat de app deed',
    t.includes('Bij Shanghai koos de app willekeurig voor je, omdat je niets had ingevuld.'), t);
  check('en wat meldingen daaraan doen',
    t.includes('Met meldingen aan krijg je een seintje als een deadline nadert'), t);
  check('de kaart staat boven de kalender', await page.evaluate(() => {
    const kaart = document.querySelector('[data-meldingkaart]');
    const race = document.querySelector('[data-race]');
    return !!(kaart.compareDocumentPosition(race) & Node.DOCUMENT_POSITION_FOLLOWING);
  }));

  await page.click('#kaartmelding');
  await page.waitForSelector('[data-meldingkaart]', { state: 'detached' });
  const r = await rijen(page);
  check('de knop op de kaart zet meldingen aan', r.length === 1 && r[0].member_id === 'lid-1',
    JSON.stringify(r));
  check('met de melding dat ze aanstaan', (await tekst(page, '.meldingbalk'))
    .includes('Meldingen staan aan op dit toestel.'));
  await herlaad(page);
  check('daarna blijft de kaart weg, ook na herladen', (await page.$('[data-meldingkaart]')) === null);
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// Nu niet: weg tot de volgende gemiste race.
{
  const { page, jsFouten, stoppen } = await startPagina({ voorafAan: opDag(metPush('granted')) });
  await meedoen(page);
  await zetRaces(page);
  await herlaad(page);
  await page.waitForSelector('[data-meldingkaart="gemist"]');
  await page.click('#kaartmeldingweg');
  await page.waitForSelector('[data-meldingkaart]', { state: 'detached' });
  check('Nu niet haalt de kaart weg, en onthoudt voor welke race',
    (await page.evaluate(() => localStorage.getItem('poule:gemistweg'))) === '2');
  await herlaad(page);
  check('ook na herladen', (await page.$('[data-meldingkaart]')) === null);

  await zetRaces(page, { suzuka: 'zelf' });
  await herlaad(page);
  check('heb je de laatste race zelf ingevuld, dan is er niets vergeten: geen kaart',
    (await page.$('[data-meldingkaart]')) === null);

  await zetRaces(page, { suzuka: 'leeg' });
  await herlaad(page);
  await page.waitForSelector('[data-meldingkaart="gemist"]');
  check('bij de volgende gemiste race komt hij terug, over die race',
    (await tekst(page, '[data-meldingkaart]')).includes('Bij Suzuka'));
  check('er is niets weggeschreven', (await rijen(page)).length === 0);
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// Een browser die al nee zei: dan helpt de kaart niet, en staat hij er niet.
{
  const { page, stoppen } = await startPagina({ voorafAan: opDag() });
  await meedoen(page);
  await zetRaces(page);
  await herlaad(page);
  check('na een gemiste race, maar met meldingen geblokkeerd: geen kaart',
    (await page.$('[data-meldingkaart]')) === null
      && (await page.evaluate(() => Notification.permission)) === 'denied');
  await stoppen();
}

// ------------------------------------------------------------------
//  5. Een iPhone in Safari: de kaart wijst naar het beginscherm
// ------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina({ userAgent: IPHONE,
    voorafAan: opDag((p) => p.addInitScript(() => { delete window.PushManager; })) });
  await meedoen(page);
  await zetRaces(page);
  await herlaad(page);
  await page.waitForSelector('[data-meldingkaart="gemist"]');
  const t = await tekst(page, '[data-meldingkaart]');
  check('op een iPhone in Safari zegt de kaart dat het alleen vanaf het beginscherm kan',
    t.includes('Op een iPhone werkt dat alleen als Predict the Race op je beginscherm staat.'), t);
  check('zonder knop die toch niets zou doen', (await page.$('#kaartmelding')) === null);
  await page.click('#kaartbeginscherm');
  await page.waitForSelector('[data-beginscherm]');
  check('en de knop brengt je naar de stappen onder Profiel', true);
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ------------------------------------------------------------------
//  6. In de app op het beginscherm: nu kan het
// ------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina({ voorafAan: async (p) => {
    await p.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { get: () => true }); });
    await metPush('granted')(p);
  } });
  await claim(page);
  check('in de app op het beginscherm geen beginscherm-stap, wel de meldingen',
    !(await tekst(page)).includes('Zet hem op je beginscherm')
      && (await page.$$('.stappen .stap')).length === 3);
  await page.click('#rondleidingweg');
  await page.waitForSelector('[data-meldingkaart="app"]');
  const t = await tekst(page, '[data-meldingkaart]');
  check('en daarna op het racesscherm een kaart dat het hier kan',
    t.includes('Nu Predict the Race op je beginscherm staat, kan hij je een seintje geven'), t);
  await page.click('#kaartmeldingweg');
  await page.waitForSelector('[data-meldingkaart]', { state: 'detached' });
  await herlaad(page);
  check('Nu niet haalt hem voorgoed weg', (await page.$('[data-meldingkaart]')) === null
    && (await page.evaluate(() => localStorage.getItem('poule:meldingappweg'))) === 'weg');
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
