// Contact, feedback en bugs.
//
// Danny: "Gooi er een contact/feedback/bug ergens bij. Zodat mensen mij
// kunnen contacten". Onder Profiel drie knoppen die een mail openen naar het
// contactadres, elk met een eigen onderwerp; bij een bug staat er alvast wat
// in de mail dat het oplossen scheelt (browser, beginscherm, taal). Op het
// beginscherm één regel, voor wie nog nergens meedoet.

import { maakControle, startPagina, naDeClaim } from './hulp.mjs';

const { check, afronden } = maakControle('contact, feedback en bugs');
const ADRES = 'contact@predicttherace.com';

const ontleed = (href) => {
  const [voor, query = ''] = String(href ?? '').split('?');
  const p = new URLSearchParams(query);
  return { naar: voor.replace(/^mailto:/, ''), onderwerp: p.get('subject') ?? '', tekst: p.get('body') ?? '' };
};

// --- het beginscherm --------------------------------------------------------
const { page, jsFouten, stoppen } = await startPagina();
await page.waitForSelector('#code');
const regel = await page.$('[data-contactregel] a');
check('op het beginscherm staat een regel met het contactadres', regel !== null);
const opStart = ontleed(await regel?.getAttribute('href'));
check('die opent een mail naar het contactadres, met een onderwerp',
  opStart.naar === ADRES && opStart.onderwerp.includes('Predict the Race'), JSON.stringify(opStart));

// --- onder Profiel ----------------------------------------------------------
await page.fill('#code', 'RTM026');
await page.click('#mee');
await page.waitForSelector('[data-lid]');
await page.click('[data-lid]:has(.nm:text-is("Danny"))');
await naDeClaim(page);
await page.click('[data-weergave="profiel"]');
await page.waitForSelector('[data-contact]');

const knoppen = await page.$$eval('[data-contactmail]', (n) =>
  n.map((a) => [a.dataset.contactmail, a.getAttribute('href'), a.textContent.trim()]));
check('onder Profiel staan drie knoppen: iets werkt niet, een idee, een vraag',
  knoppen.map(([s]) => s).join() === 'bug,idee,vraag', JSON.stringify(knoppen.map(([s, , t]) => [s, t])));

const mails = Object.fromEntries(knoppen.map(([s, href]) => [s, ontleed(href)]));
check('alle drie gaan naar het contactadres',
  Object.values(mails).every((m) => m.naar === ADRES), JSON.stringify(mails));
check('elk met een eigen onderwerp',
  new Set(Object.values(mails).map((m) => m.onderwerp)).size === 3
    && mails.bug.onderwerp === 'Iets werkt niet in Predict the Race',
  Object.values(mails).map((m) => m.onderwerp).join(' | '));

// Bij een bug wil Danny weten op wat; dat weet de speler zelf vaak
// niet. Bij een idee of vraag staat er niets voorgeschreven.
const bug = mails.bug.tekst;
check('de bugmail vraagt wat er misging en wat je net deed',
  bug.includes('Wat ging er mis?') && bug.includes('Wat deed je net daarvoor?'), bug);
check('en zet erbij in welke browser, of de app op het beginscherm staat, en de taal',
  /Browser: .*Chrom/i.test(bug) && bug.includes('Taal: nl')
    && bug.includes('Op het beginscherm: nee'), bug);
check('een idee of een vraag begint met een lege mail',
  mails.idee.tekst === '' && mails.vraag.tekst === '');
check('het adres staat er ook leesbaar, voor wie geen mailprogramma heeft',
  (await page.textContent('#app')).includes(ADRES));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();

// --- in het Engels ----------------------------------------------------------
{
  const { page, stoppen } = await startPagina({ taal: 'en' });
  await page.waitForSelector('[data-contactregel] a');
  const m = ontleed(await page.getAttribute('[data-contactregel] a', 'href'));
  check('in het Engels is de regel en het onderwerp Engels',
    (await page.textContent('[data-contactregel]')).includes('A question, an idea or something broken?')
      && m.onderwerp === 'A question about Predict the Race', m.onderwerp);
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
