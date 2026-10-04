// De rondleiding voor wie net meedoet.
//
// "Maak de onboarding wat beter voor nieuwe spelers. Denk aan de 1e keer
// inloggen hoe dat werkt. En het op je thuisscherm zetten. Ook de kunnen
// skippen." (4 oktober)
//
// Hiervoor stond hier test/koppel-vraag.test.mjs: één scherm, eenmalig na de
// eerste claim. Dat scherm is nu de tweede stap van hooguit drie (zo werkt
// het, je account, op je beginscherm), en wat hier vastligt is vooral
// wanneer welke stap er wél en niet staat:
//
//   - een verse claim krijgt de rondleiding, een tweede keer nooit meer;
//   - wie het oude koppelscherm al zag is geen nieuwe speler;
//   - een computer zonder installatieprompt krijgt geen beginscherm-stap,
//     een iPhone wel, met de uitleg via Deel en de waarschuwing dat de app
//     daar los van Safari onthoudt wie je bent;
//   - wie een poule aanmaakt slaat "zo werkt het" over;
//   - overslaan kan altijd, en wat je oversloeg staat daarna onder Profiel;
//   - na de omweg via Google sta je terug in de stap waar je was.
//
// Plus het inloggen met de code uit de mail, want daar hangt de
// beginscherm-stap op een iPhone aan: de app op het beginscherm heeft een
// eigen geheugen, en een link uit de mail opent altijd Safari.

import { maakControle, startPagina } from './hulp.mjs';

const { check, afronden } = maakControle('rondleiding voor een nieuwe speler');

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) '
  + 'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

const tekst = async (page, sel = '#app') =>
  (await page.textContent(sel)).replace(/\s+/g, ' ').trim();
const stap = (page) => page.getAttribute('[data-rondleiding]', 'data-rondleiding');

// Code invullen en een naam aanwijzen of aanmaken, tot vlak vóór de rondleiding.
async function claim(page, { nieuw = null } = {}) {
  await page.waitForSelector('#code');
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
  await page.waitForSelector('[data-lid]');
  if (nieuw) { await page.fill('#naam', nieuw); await page.click('#maak'); }
  else await page.click('[data-lid]:has(.nm:text-is("Danny"))');
}

// De prompt van de browser naspelen, zoals in test/beginscherm.test.mjs.
const stuurPrompt = (page, keuze = 'accepted') => page.evaluate((k) => {
  const ev = new Event('beforeinstallprompt');
  ev.prompt = () => { window.__geprompt = (window.__geprompt ?? 0) + 1; return Promise.resolve(); };
  ev.userChoice = Promise.resolve({ outcome: k });
  dispatchEvent(ev);
}, keuze);

// ------------------------------------------------------------------
//  Een verse claim op een computer: zo werkt het, dan je account
// ------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await claim(page);
  await page.waitForSelector('#rondleidingweg');

  check('na een verse claim begint de rondleiding met zo werkt het',
    (await stap(page)) === 'spel');
  const t1 = await tekst(page);
  check('met de eigen naam erin', t1.includes('Welkom,') && t1.includes('Danny'), t1.slice(0, 160));
  check('twee stappen op een computer zonder installatieprompt',
    (await page.$$('.stappen .stap')).length === 2 && t1.includes('stap 1 van 2'));
  // De Vrijdagmiddagpoule heeft geen eigen vragenset, dus doet hij aan alles
  // mee: de top-tienen, de sprint en de losse vragen.
  check('de uitleg volgt de vragen van deze poule',
    t1.includes('top 10 van de kwalificatie en van de race')
    && t1.includes('sprintweekend') && /\d+ losse vragen/.test(t1), t1);
  check('en noemt de punten per plek zoals scoreLijst() ze geeft',
    /5 punten als hij precies op jouw plek eindigt, 3 bij één plek ernaast en 1 bij twee plekken/.test(t1));
  check('en dat invullen kan tot de sessie begint', t1.includes('tot de sessie begint'));
  check('rechtsboven staat Overslaan', (await page.textContent('#rondleidingweg')).trim() === 'Overslaan');

  await page.click('#rondverder');
  await page.waitForSelector('[data-rondleiding="account"]');
  const t2 = await tekst(page);
  check('daarna je account, met de eigen naam', t2.includes('Koppel je account') && t2.includes('Danny'));
  check('Google als grote, herkenbare knop', (await page.$('#googlekoppel.google svg')) !== null);
  check('en een mailadres ernaast', (await page.$('#mailopen')) !== null);
  check('geen iPhone-uitleg op een computer', !t2.includes('los van Safari'));
  check('de laatste stap heeft geen knop Volgende maar Nu niet',
    (await page.$('#rondnunniet')) !== null && (await page.$('#rondverder')) === null);

  await page.click('#rondnunniet');
  await page.waitForSelector('[data-race]');
  const t3 = await tekst(page, '.meldingbalk');
  check('Nu niet op de laatste stap brengt je in de poule',
    (await page.$('[data-rondleiding]')) === null);
  check('met een melding waar het koppelen later staat',
    t3.includes('Je account koppelen kan later nog, onder Profiel.'), t3);

  await page.reload();
  await page.waitForSelector('[data-race]');
  check('na herladen komt de rondleiding niet terug',
    (await page.$('#rondleidingweg')) === null
    && (await page.evaluate(() => localStorage.getItem('poule:welkom'))) === 'klaar');

  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ------------------------------------------------------------------
//  Alles overslaan, meteen bij de eerste stap
// ------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina({ userAgent: IPHONE });
  await claim(page, { nieuw: 'Sanne' });
  await page.waitForSelector('#rondleidingweg');
  await page.click('#rondleidingweg');
  await page.waitForSelector('[data-race]');
  const t = await tekst(page, '.meldingbalk');
  check('Overslaan op de eerste stap gaat meteen naar de poule, en de melding noemt '
    + 'allebei wat je niet zag',
    t.includes('Je account koppelen en de app op je beginscherm zetten kan later nog, onder Profiel.'), t);

  // Daar staat het dan ook echt.
  await page.click('[data-weergave="profiel"]');
  await page.waitForSelector('[data-beginscherm]');
  const p = await tekst(page, '.kol.links');
  check('onder Profiel staat op je beginscherm, met de stappen via Deel',
    p.includes('Zet op beginscherm') && p.includes('Voeg toe')
    && (await page.$('.kol.links .rondlijst .deelicoon')) !== null);
  check('zonder Nu niet: Profiel is geen aanbieding die in de weg staat',
    (await page.$('.kol.links #installweg')) === null);
  check('en met de waarschuwing dat je eerst je account koppelt',
    p.includes('Koppel daarom eerst je account hierboven, anders ben je daar niet Sanne.'), p);

  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ------------------------------------------------------------------
//  Een iPhone: drie stappen, en de valkuil van het beginscherm
// ------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina({ userAgent: IPHONE });
  // Een lage telefoon, zodat de knop verder onder de vouw staat.
  await page.setViewportSize({ width: 375, height: 600 });
  await claim(page, { nieuw: 'Sanne' });
  await page.waitForSelector('#rondleidingweg');
  check('op een iPhone zijn het drie stappen', (await page.$$('.stappen .stap')).length === 3);

  await page.click('#rondverder');
  await page.waitForSelector('[data-rondleiding="account"]');
  check('de accountstap zegt erbij dat je het voor de beginschermapp nodig hebt',
    (await tekst(page)).includes('nodig voor de app op je beginscherm'));
  await page.click('#rondnunniet');
  await page.waitForSelector('[data-rondleiding="beginscherm"]');
  await page.waitForTimeout(150);
  check('een nieuwe stap begint bovenaan, ook als de knop onderaan stond',
    (await page.evaluate(() => scrollY)) === 0, `${await page.evaluate(() => scrollY)}px`);

  const t = await tekst(page);
  check('de beginscherm-stap legt de weg via Deel uit, in drie stappen',
    t.includes('Deel') && t.includes('Zet op beginscherm') && t.includes('Voeg toe')
    && (await page.$$('[data-rondleiding] .rondlijst li')).length === 3, t);
  check('met het deel-teken erbij', await page.isVisible('[data-rondleiding] .deelicoon'));
  check('en de tip voor een nieuwere iPhone, waar Deel achter de drie puntjes zit',
    t.includes('•••'));
  check('zonder account: de waarschuwing dat je daar niet jezelf bent',
    t.includes('Zonder gekoppeld account ben je daar niet Sanne.'), t);
  check('geen installatieknop, want die API bestaat op een iPhone niet',
    (await page.$('#installeer')) === null);

  await page.click('#rondkoppel');
  await page.waitForSelector('[data-rondleiding="account"]');
  check('"Eerst je account koppelen" gaat terug naar de accountstap',
    (await stap(page)) === 'account');

  // Koppelen met een mailadres. De bevestigingslink opent in het echt een
  // nieuw tabblad; hier in hetzelfde, en dan hoort de rondleiding daar
  // verder te gaan waar hij was.
  await page.click('#mailopen');
  await page.fill('#mailveld', 'sanne@voorbeeld.nl');
  await page.click('#mailstuur');
  await page.waitForFunction(() => !document.querySelector('#mailveld'));
  check('na het versturen kun je gewoon verder',
    (await tekst(page)).includes('Je kunt hier gewoon verder')
    && (await page.$('#rondverder')) !== null);
  const link = await page.evaluate(() => globalThis.__mail.laatsteLink());
  await page.goto(link);
  await page.waitForSelector('[data-rondleiding]');
  check('na de link uit de mail sta je terug in de accountstap, nu gekoppeld',
    (await stap(page)) === 'account' && (await tekst(page)).includes('Gekoppeld'));
  await page.click('#rondverder');
  await page.waitForSelector('[data-rondleiding="beginscherm"]');
  const t2 = await tekst(page);
  check('en met een account zegt de beginscherm-stap: log daar één keer in',
    t2.includes('log daar één keer in') && !t2.includes('Zonder gekoppeld account'), t2);

  await page.click('#rondverder');
  await page.waitForSelector('[data-race]');
  await page.waitForTimeout(150);
  check('en de poule ook: daar staat bovenin de melding, als die er is',
    (await page.evaluate(() => scrollY)) === 0, `${await page.evaluate(() => scrollY)}px`);
  check('wie alles deed krijgt geen melding over later',
    (await page.$('.meldingbalk')) === null
    || !(await tekst(page, '.meldingbalk')).includes('later nog'));

  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ------------------------------------------------------------------
//  Android: de prompt van de browser
// ------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina({ userAgent: ANDROID });
  await page.waitForSelector('#code');
  await stuurPrompt(page, 'dismissed');
  await claim(page, { nieuw: 'Joey' });
  await page.waitForSelector('#rondleidingweg');
  check('op Android zijn het drie stappen', (await page.$$('.stappen .stap')).length === 3);
  await page.click('#rondverder');
  await page.waitForSelector('#rondnunniet');
  await page.click('#rondnunniet');
  await page.waitForSelector('[data-rondleiding="beginscherm"]');
  check('de beginscherm-stap heeft dan een echte knop', await page.isVisible('#installeer'));
  await page.click('#installeer');
  await page.waitForSelector('[data-race]');
  check('die de prompt één keer aanroept', (await page.evaluate(() => window.__geprompt)) === 1);
  const t = await tekst(page, '.meldingbalk');
  check('wie de prompt wegklikt heeft de stap overgeslagen, en hoort waar hij later staat',
    t.includes('Je account koppelen en de app op je beginscherm zetten kan later nog'), t);
  // De prompt is op, maar Android kan het ook met de hand: onder Profiel
  // staat dan de weg via het menu.
  await page.click('[data-weergave="profiel"]');
  await page.waitForSelector('[data-beginscherm]');
  const p = await tekst(page, '.kol.links');
  check('onder Profiel staat dan de weg via het menu van de browser',
    p.includes('Toevoegen aan startscherm') && (await page.$('.kol.links #installeer')) === null, p);
  // En biedt de browser hem opnieuw aan, dan wordt het weer een knop.
  await stuurPrompt(page);
  await page.waitForSelector('.kol.links #installeer');
  await page.click('.kol.links #installeer');
  await page.waitForFunction(() => window.__geprompt === 2);
  check('komt de prompt terug, dan staat er onder Profiel een knop die hem aanroept',
    (await page.evaluate(() => window.__geprompt)) === 2);
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ------------------------------------------------------------------
//  Een computer zonder prompt: niets beloven
// ------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await claim(page);
  await page.waitForSelector('#rondleidingweg');
  await page.click('#rondleidingweg');
  await page.waitForSelector('[data-race]');
  await page.click('[data-weergave="profiel"]');
  await page.waitForSelector('#mailopen, #googlekoppel');
  check('een computer zonder prompt krijgt onder Profiel geen beginscherm-blok',
    (await page.$('[data-beginscherm]')) === null);
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ------------------------------------------------------------------
//  Na de omweg via Google terug in dezelfde stap (op Android, zonder prompt)
// ------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina({ userAgent: ANDROID });
  await page.waitForSelector('#code');
  await page.evaluate(() => globalThis.__mail.googleAls('danny@gmail.example'));
  await claim(page);
  await page.waitForSelector('#rondverder');
  await page.click('#rondverder');
  await page.waitForSelector('#googlekoppel');
  await page.click('#googlekoppel');
  await page.waitForTimeout(200);
  const link = await page.evaluate(() => globalThis.__mail.laatsteLink());
  await page.goto(link);
  await page.waitForSelector('[data-rondleiding]');
  const t = await tekst(page);
  check('terug van Google sta je in de accountstap, gekoppeld aan dat adres',
    (await stap(page)) === 'account' && t.includes('Gekoppeld') && t.includes('danny@gmail.example'), t);
  await page.click('#rondverder');
  await page.waitForSelector('[data-rondleiding="beginscherm"]');
  const t2 = await tekst(page);
  check('Android zonder prompt: de weg via het menu van de browser, in twee stappen',
    t2.includes('rechtsboven in je browser') && t2.includes('Toevoegen aan startscherm')
    && (await page.$$('[data-rondleiding] .rondlijst li')).length === 2, t2);
  check('zonder iPhone-waarschuwing', !t2.includes('los van Safari'));
  await page.click('#rondleidingweg');
  await page.waitForSelector('[data-race]');
  const t3 = await tekst(page, '.meldingbalk');
  check('wie gekoppeld is en alleen het beginscherm overslaat, hoort alleen dat',
    t3 === 'De app op je beginscherm zetten kan later nog, onder Profiel.', t3);
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ------------------------------------------------------------------
//  Wanneer er géén rondleiding is
// ------------------------------------------------------------------
{
  // Wie het oude koppelscherm al zag speelt al mee.
  const { page, jsFouten, stoppen } = await startPagina({
    voorafAan: (p) => p.addInitScript(() => localStorage.setItem('poule:koppelgevraagd', '1')) });
  await claim(page);
  await page.waitForSelector('[data-race], #rondleidingweg');
  check('wie het oude koppelscherm al zag krijgt geen rondleiding',
    (await page.$('#rondleidingweg')) === null);
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}
{
  // Een rondleiding van ruim een uur geleden is geen rondleiding meer.
  const { page, jsFouten, stoppen } = await startPagina();
  await claim(page);
  await page.waitForSelector('#rondleidingweg');
  await page.evaluate(() => {
    const r = JSON.parse(localStorage.getItem('poule:welkom'));
    r.sinds -= 2 * 60 * 60 * 1000;
    localStorage.setItem('poule:welkom', JSON.stringify(r));
  });
  await page.reload();
  await page.waitForSelector('[data-race], #rondleidingweg');
  check('een rondleiding die al uren openstaat gaat na herladen niet verder',
    (await page.$('#rondleidingweg')) === null
    && (await page.evaluate(() => localStorage.getItem('poule:welkom'))) === 'klaar');
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}
{
  // En binnen dat uur wél: herladen halverwege houdt je in dezelfde stap.
  const { page, jsFouten, stoppen } = await startPagina();
  await claim(page);
  await page.waitForSelector('#rondverder');
  await page.click('#rondverder');
  await page.waitForSelector('[data-rondleiding="account"]');
  await page.reload();
  await page.waitForSelector('[data-rondleiding]');
  check('herladen halverwege houdt je in dezelfde stap', (await stap(page)) === 'account');
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ------------------------------------------------------------------
//  Wie een poule aanmaakt
// ------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await page.waitForSelector('#nieuw');
  await page.click('#nieuw');
  await page.fill('#pnaam', 'Zondagpoule');
  await page.click('#verder');
  await page.fill('#snaam', 'Femke');
  await page.click('#verder');
  await page.waitForSelector('[data-preset]');
  await page.click('#verder');
  await page.waitForSelector('#klaar');
  await page.click('#klaar');
  await page.waitForSelector('[data-rondleiding]');
  check('wie net een poule maakte slaat zo werkt het over en begint bij het account',
    (await stap(page)) === 'account');
  check('en dat is dan de enige stap, zonder voortgangsbalk',
    (await page.$('.stappen')) === null);
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ------------------------------------------------------------------
//  Inloggen met de code uit de mail
// ------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina({ userAgent: IPHONE });
  // Eerst meespelen en een mailadres koppelen, zoals in Safari.
  await claim(page);
  await page.waitForSelector('#rondverder');
  await page.click('#rondverder');
  await page.click('#mailopen');
  await page.fill('#mailveld', 'danny@voorbeeld.nl');
  await page.click('#mailstuur');
  await page.waitForFunction(() => !document.querySelector('#mailveld'));
  await page.goto(await page.evaluate(() => globalThis.__mail.laatsteLink()));
  await page.waitForSelector('[data-rondleiding]');
  await page.click('#rondleidingweg');
  await page.waitForSelector('[data-race]');

  // Dan de app op het beginscherm: een eigen geheugen, dus een leeg toestel.
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#code');
  check('de beginschermapp op een leeg toestel zegt eerst: log in',
    await page.isVisible('#losvansafari'));
  check('en biedt daar geen beginscherm meer aan', (await page.$('#installweg')) === null);

  await page.click('#inlogopen');
  await page.fill('#inlogveld', 'danny@voorbeeld.nl');
  await page.click('#inlogstuur');
  await page.waitForSelector('#inlogcode');
  const t = await tekst(page);
  check('na het versturen staat er een veld voor de code',
    await page.isVisible('#inlogcode') && t.includes('code uit de mail'));
  check('en hier zegt hij dat de link Safari opent, en niet deze app',
    t.includes('De link in de mail opent Safari, en niet deze app.'), t);
  check('het veld heeft een echt label', (await page.$('label[for="inlogcode"]')) !== null);

  await page.fill('#inlogcode', '12ab');
  await page.click('#inlogcodeknop');
  check('letters worden niet verstuurd',
    (await page.textContent('#inlogfout')).includes('alleen de cijfers'));
  await page.fill('#inlogcode', '000000');
  await page.click('#inlogcodeknop');
  await page.waitForFunction(() => document.querySelector('#inlogfout')?.textContent.includes('verlopen'));
  check('een verkeerde code krijgt een melding waar je iets mee kunt',
    (await page.textContent('#inlogfout')).includes('Die code klopt niet of is verlopen.'));

  const code = await page.evaluate(() => globalThis.__mail.laatsteCode());
  await page.fill('#inlogcode', code);
  await page.click('#inlogcodeknop');
  await page.waitForSelector('[data-race]');
  check('met de goede code sta je meteen in je poule, als jezelf',
    (await page.$('[data-lid]')) === null
    && (await tekst(page, '.zijspeler')).includes('Danny'));
  check('en de vlag voor na het inloggen is opgeruimd',
    (await page.evaluate(() => sessionStorage.getItem('poule:netingelogd'))) === null);

  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}
{
  // In gewoon Safari geen tip over de beginschermapp, en de link mag gewoon.
  const { page, jsFouten, stoppen } = await startPagina({ userAgent: IPHONE });
  await page.waitForSelector('#code');
  check('in Safari staat de tip voor de beginschermapp er niet',
    (await page.$('#losvansafari')) === null);
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
