// Een sessie die even hapert, en inloggen dat je spelers meeneemt (3 november),
// in de browser.
//
// David G. speelde anoniem op zijn iPhone. Na zes dagen herkende de app hem
// niet: supabase-js kon zijn sessie niet verversen, gaf "geen sessie" terug en
// liet hem staan. De app zei "David G. hoort bij een ander toestel, log in met
// je mailadres". Dat maakte een nieuw, leeg account, en het inloggen verving
// de oude sessie: de enige sleutel van zijn speler. Wat hier vastligt:
//   1. Een sessie die er staat maar niet te verversen is: een scherm dat zegt
//      dat je account even niet te laden is. Geen "ander toestel", geen nieuw
//      account, en de sessie blijft staan.
//   2. Komt hij terug, dan gaat de app vanzelf verder, als jij. Of met
//      "Opnieuw proberen".
//   3. Zonder sessie op het toestel: gewoon het beginscherm.
//   4. Het geval van David: inloggen vanuit een venster zonder sessie maakt
//      een nieuw account, en de link uit de mail opent waar de anonieme speler
//      staat. Dan gaat die speler mee naar het nieuwe account.
//   5. Inloggen met de code, naar een account dat in een van je poules al
//      speelt: de rest gaat mee, en de melding noemt de poule waar hij bleef.
//   6. Met Google.
//   7. Hapert de sessie op het moment van inloggen: niet inloggen. De code
//      geeft een melding; een maillink blijft ongebruikt in de adresbalk staan
//      en werkt zodra de sessie terug is.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('een haperende sessie, en je spelers meenemen bij het inloggen');
const tekst = async (page, kies) => ((await page.textContent(kies)) ?? '').replace(/\s+/g, ' ').trim();
const db = (page) => page.evaluate(() => globalThis.__db);
const accounts = async (page) => (await db(page)).auth_users;
const lid = async (page, id) => (await db(page)).pool_members.find((m) => m.member_id === id);
const sessieVan = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('nabootsing:sessie') ?? 'null')?.user?.id ?? null);
const melding = (page) => page.evaluate(() =>
  (document.querySelector('.meldingbalk .melding') ?? document.querySelector('#f'))?.textContent.replace(/\s+/g, ' ').trim() ?? '');
const ANDER = 'hoort bij een ander toestel';
const MEE = 'Je speler van dit toestel is meegenomen naar je account.';

// Wie ben ik in de poule die openstaat? De speler met "zelf" onder Poule.
async function wieBenIk(page) {
  await page.click('[data-weergave="poule"]');
  await page.waitForSelector('.speler.zelf');
  return tekst(page, '.speler.zelf .nm');
}

// Naar het beginscherm, met de inlogknoppen.
async function naarBegin(page) {
  await page.click('#anderePoule');
  await page.waitForSelector('#inlogopen');
}

async function vraagInlogmail(page, adres) {
  await page.click('#inlogopen');
  await page.fill('#inlogveld', adres);
  await page.click('#inlogstuur');
  await page.waitForSelector('#inlogcode');
}

// Een account met een mailadres dat al bestaat, en een tweede poule waar dit
// toestel en dat account allebei meespelen.
const zetWerkaccountKlaar = (page) => page.evaluate(() => {
  const d = globalThis.__db;
  const ik = d.auth_users[0].id;
  d.auth_users.push({ id: 'account-werk', is_anonymous: false, email: 'danny@werk.test', new_email: null,
    user_metadata: {}, identities: [{ provider: 'email', identity_data: { email: 'danny@werk.test' } }] });
  d.pools.push({ id: 'pool-2', name: 'Kantoor', join_code: 'KANT01', season: 2026 });
  d.pool_members.push(
    { member_id: 'lid-8', pool_id: 'pool-2', display_name: 'Danny K', user_id: ik, aangemaakt_door: ik },
    { member_id: 'lid-9', pool_id: 'pool-2', display_name: 'Danny W', user_id: 'account-werk', aangemaakt_door: 'account-werk' });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
});

// ---- 1, 2 en 3. een sessie die hapert ------------------------------------------------------
{
  const { page, jsFouten, stoppen, url } = await startPagina();
  await meedoen(page);
  const [ik] = await accounts(page);
  check('vooraf: Danny hangt aan een anoniem account op dit toestel',
    (await lid(page, 'lid-1')).user_id === ik.id && ik.is_anonymous);

  await page.evaluate(() => globalThis.__sessie.hapert(true));
  await page.reload();
  await page.waitForSelector('[data-intro="kaart|account-hapert"], [data-weergave], #code');
  await page.waitForTimeout(300);
  const scherm = await tekst(page, '#app');
  check('een sessie die niet te verversen is: het scherm zegt dat je account even niet te laden is',
    scherm.includes('Je account op dit toestel kon net niet geladen worden')
      && scherm.includes('Je speler en je inzendingen staan veilig'), scherm.slice(0, 200));
  check('niet dat Danny bij een ander toestel hoort, en geen nieuw account; de sessie blijft staan',
    !scherm.includes(ANDER) && (await accounts(page)).length === 1 && (await sessieVan(page)) === ik.id);
  check('de app wacht tot de sessie terug is', (await page.evaluate(() => globalThis.__sessie.luisteraars())) >= 1);

  await Promise.all([page.waitForNavigation(), page.evaluate(() => globalThis.__sessie.terug())]);
  await page.waitForSelector('[data-weergave]');
  check('komt de sessie terug, dan gaat de app vanzelf verder, als Danny',
    (await wieBenIk(page)) === 'Danny' && !(await melding(page)).includes(ANDER), await melding(page));

  await page.evaluate(() => globalThis.__sessie.hapert(true));
  await page.reload();
  await page.waitForSelector('#opnieuw');
  await page.evaluate(() => globalThis.__sessie.hapert(false));
  await page.click('#opnieuw');
  await page.waitForSelector('[data-weergave]');
  check('of met "Opnieuw proberen"', (await wieBenIk(page)) === 'Danny' && (await accounts(page)).length === 1);

  // Gooit getSession() een fout in plaats van er een terug te geven: hetzelfde.
  await page.evaluate(() => globalThis.__sessie.hapert('gooit'));
  await page.reload();
  await page.waitForSelector('[data-intro="kaart|account-hapert"], [data-weergave], #code');
  check('ook als getSession() een fout gooit', !!(await page.$('[data-intro="kaart|account-hapert"]'))
    && (await accounts(page)).length === 1);

  await page.evaluate(() => { localStorage.clear(); globalThis.__sessie.hapert(true); });
  await page.goto(url);
  await page.waitForSelector('#code, [data-intro="kaart|account-hapert"]');
  check('zonder sessie op het toestel: gewoon het beginscherm', !!(await page.$('#code')));
  check('geen javascriptfouten bij een haperende sessie', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 4. het geval van David -----------------------------------------------------------------
{
  const { page, jsFouten, stoppen, url } = await startPagina();
  await meedoen(page);
  const anoniem = (await accounts(page))[0].id;
  const vensterA = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));

  // Een venster zonder sessie: een privétabblad, of de app die net haperde.
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForSelector('#inlogopen');
  await vraagInlogmail(page, 'david@voorbeeld.test');
  const nieuw = (await accounts(page)).find((u) => u.email === 'david@voorbeeld.test');
  check('vanuit een venster zonder sessie: een nieuw account met dat adres',
    !!nieuw && !nieuw.is_anonymous && (await accounts(page)).length === 2);

  // De link uit de mail opent in het venster waar Danny anoniem staat.
  const link = await page.evaluate(() => globalThis.__mail.laatsteMaillink());
  await page.evaluate((a) => { localStorage.clear(); for (const [k, v] of JSON.parse(a)) localStorage.setItem(k, v); }, vensterA);
  await page.goto(link);
  await page.waitForSelector('[data-weergave]');
  check('na de link hangt Danny aan het nieuwe account, en niet meer aan het anonieme',
    (await lid(page, 'lid-1')).user_id === nieuw.id && (await sessieVan(page)) === nieuw.id
      && (await db(page)).pool_members.every((m) => m.user_id !== anoniem),
    JSON.stringify(await lid(page, 'lid-1')));
  check('de melding zegt dat je speler is meegenomen', (await melding(page)) === MEE, await melding(page));
  check('en je bent gewoon Danny', (await wieBenIk(page)) === 'Danny');
  check('het kaartje is op, ook in dit tabblad', (await db(page)).account_meenemen.length === 0
    && (await page.evaluate(() => sessionStorage.getItem('poule:meenemen'))) === null);

  // Op een leeg toestel brengt hetzelfde adres je nu bij Danny. Daar is geen
  // sessie, dus ook geen kaartje (de teller begint bij elke pagina opnieuw).
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForSelector('#inlogopen');
  await vraagInlogmail(page, 'david@voorbeeld.test');
  await page.goto(await page.evaluate(() => globalThis.__mail.laatsteMaillink()));
  await page.waitForSelector('[data-weergave]');
  check('op een ander toestel brengt hetzelfde adres je bij Danny, zonder kaartje',
    (await wieBenIk(page)) === 'Danny' && (await accounts(page)).length === 2
      && (await page.evaluate(() => globalThis.__rpcTeller.meenemen_klaarzetten ?? 0)) === 0);
  check('geen javascriptfouten in het geval van David', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 5 en 7. met de code, naar een account dat al bestaat --------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await meedoen(page);
  const anoniem = (await accounts(page))[0].id;
  await zetWerkaccountKlaar(page);
  await naarBegin(page);
  await vraagInlogmail(page, 'danny@werk.test');
  const code = await page.evaluate(() => globalThis.__mail.laatsteCode());

  // Eerst hapert de sessie: dan niet inloggen.
  await page.evaluate(() => globalThis.__sessie.hapert(true));
  await page.fill('#inlogcode', code);
  await page.click('#inlogcodeknop');
  await page.waitForFunction(() => document.querySelector('#inlogfout')?.textContent.trim());
  check('hapert de sessie bij de code: een melding, en niet ingelogd',
    (await tekst(page, '#inlogfout')) === 'Je account op dit toestel is nu even niet te laden. Probeer het zo opnieuw.'
      && (await sessieVan(page)) === anoniem && (await db(page)).otp.some((o) => o.token === code),
    await tekst(page, '#inlogfout'));

  // En de link uit dezelfde mail: die blijft ongebruikt in de adresbalk staan.
  const link = await page.evaluate(() => globalThis.__mail.laatsteMaillink());
  await page.goto(link);
  await page.waitForSelector('[data-intro="kaart|account-hapert"], [data-weergave], #code');
  check('hapert de sessie bij de maillink: het scherm, de link blijft staan en is nog niet gebruikt',
    !!(await page.$('[data-intro="kaart|account-hapert"]')) && page.url().includes('token_hash=') && (await sessieVan(page)) === anoniem
      && (await db(page)).otp.some((o) => o.token === code));

  // De sessie komt terug: dan werkt de link alsnog, en gaan je spelers mee.
  await Promise.all([page.waitForNavigation(), page.evaluate(() => globalThis.__sessie.terug())]);
  await page.waitForSelector('[data-weergave], #code');
  check('komt de sessie terug, dan werkt de link alsnog', (await sessieVan(page)) === 'account-werk' && !page.url().includes('token_hash='));
  check('Danny gaat mee; Danny K blijft staan in Kantoor, waar het account al speelde',
    (await lid(page, 'lid-1')).user_id === 'account-werk' && (await lid(page, 'lid-8')).user_id === anoniem
      && (await lid(page, 'lid-9')).user_id === 'account-werk');
  check('de melding noemt wat meeging en de poule waar hij bleef',
    (await melding(page)) === `${MEE} In Kantoor speelde je account al. Daar staat je speler van dit toestel nog apart.`,
    await melding(page));
  check('geen javascriptfouten bij inloggen met de code', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// Nog een keer met de code, zonder haperen: de code zelf neemt je spelers ook mee.
{
  const { page, jsFouten, stoppen } = await startPagina();
  await meedoen(page);
  await zetWerkaccountKlaar(page);
  await naarBegin(page);
  await vraagInlogmail(page, 'danny@werk.test');
  await page.fill('#inlogcode', await page.evaluate(() => globalThis.__mail.laatsteCode()));
  await Promise.all([page.waitForNavigation(), page.click('#inlogcodeknop')]);
  await page.waitForSelector('[data-weergave], #code');
  check('met de code: Danny gaat mee naar het account',
    (await lid(page, 'lid-1')).user_id === 'account-werk' && (await sessieVan(page)) === 'account-werk');
  check('geen javascriptfouten bij de code zonder haperen', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 6. met Google --------------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await meedoen(page);
  await naarBegin(page);
  await page.evaluate(() => globalThis.__sessie.hapert('gooit'));
  await page.click('#googleinlog');
  await page.waitForFunction(() => document.querySelector('#inlogfout')?.textContent.trim());
  check('hapert de sessie: ook niet naar Google',
    (await tekst(page, '#inlogfout')) === 'Je account op dit toestel is nu even niet te laden. Probeer het zo opnieuw.'
      && (await db(page)).naar_google.length === 0, await tekst(page, '#inlogfout'));
  await page.evaluate(() => globalThis.__sessie.hapert(false));
  await page.click('#googleinlog');
  // In het echt gaat de browser nu naar Google en weer terug.
  await page.waitForFunction(() => globalThis.__db.naar_google.length > 0);
  await page.goto(await page.evaluate(() => globalThis.__mail.laatsteLink()));
  await page.waitForSelector('[data-weergave], #code');
  const google = (await accounts(page)).find((u) => (u.identities ?? []).some((i) => i.provider === 'google'));
  check('met Google: Danny gaat mee naar het Google-account',
    !!google && (await lid(page, 'lid-1')).user_id === google.id && (await sessieVan(page)) === google.id,
    JSON.stringify(await lid(page, 'lid-1')));
  check('met de melding', (await melding(page)) === MEE, await melding(page));
  check('geen javascriptfouten met Google', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
