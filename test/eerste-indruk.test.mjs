// Wie hier voor het eerst komt, moet weten waar hij naar kijkt.
//
// Tot nu toe zag iemand die via een link in een groepsapp of een zoekresultaat
// binnenkwam alleen "vul je poulecode in" en verder niets. Geen woord over wát
// je voorspelt, hoe het scoren werkt, of dat het gratis is en zonder
// wachtwoord. Voor een app die publiek gebruikt gaat worden is dat het eerste
// wat er moet staan.
//
// Twee dingen die daarbij tegen elkaar in werken, en die hier allebei
// vastliggen: de uitleg moet er zijn voor wie hem nodig heeft, en weg voor wie
// niet — en het codeveld mag er nooit door naar beneden geduwd worden.

import { maakControle, startPagina } from './hulp.mjs';

const { check, afronden } = maakControle('de eerste indruk');
const { page, jsFouten, stoppen, url } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();

await page.waitForSelector('#code');
const uitleg = await tekst('#app');

check('een nieuwe bezoeker leest wat hij hier voorspelt',
  uitleg.includes('top 10 van de kwalificatie') && uitleg.includes('top 10 van de race'));
check('en hoe het scoren werkt',
  uitleg.includes('5 exact') || uitleg.includes('5 exact,'), uitleg.match(/Punten per plek[^.]*/)?.[0] ?? '');
check('en dat de uitslagen vanzelf binnenkomen',
  uitleg.includes('komen vanzelf binnen'));
check('en dat het gratis is en zonder wachtwoord',
  uitleg.includes('Gratis') && uitleg.includes('geen wachtwoord'));
// BEDIENING.md §10: geen geld in de app is een bewuste keuze, en het is precies
// het soort ding waar iemand naar zoekt voordat hij ergens aan begint.
check('en dat er geen geld in zit',
  uitleg.includes('geen inleg') && uitleg.includes('geen prijzen'));

// Het codeveld staat bóven de uitleg: wie wél een uitnodiging heeft moet zijn
// code meteen kunnen intikken, niet eerst langs een verkooppraatje scrollen.
const volgorde = await page.evaluate(() => {
  const veld = document.querySelector('#code');
  const kop = [...document.querySelectorAll('.label')].find(
    (e) => e.textContent.trim() === 'wat is dit?');
  if (!veld || !kop) return null;
  return veld.compareDocumentPosition(kop) & Node.DOCUMENT_POSITION_FOLLOWING ? 'onder' : 'boven';
});
check('en het codeveld staat er nog steeds bovenaan', volgorde === 'onder', String(volgorde));

// De code werkt gewoon nog.
await page.fill('#code', 'RTM026');
await page.click('#mee');
await page.waitForSelector('[data-lid]');
await page.click('[data-lid]');
await page.waitForSelector('[data-race]');
check('en meedoen werkt zoals het werkte', true);

// --- en daarna is de uitleg weg -------------------------------------------
// Wie hier al een poule heeft staan kent het spel. Die wil doorklikken, niet
// opnieuw uitgelegd krijgen wat hij al weet.
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#anderePoule');
await page.click('#anderePoule');
await page.waitForSelector('#code');
const terug = await tekst('#app');
check('wie hier al een poule heeft krijgt de uitleg niet meer',
  !terug.includes('top 10 van de kwalificatie'),
  terug.includes('top 10 van de kwalificatie') ? 'de uitleg staat er nog' : '');
check('maar zijn poule staat er wel', terug.includes('Vrijdagmiddagpoule'));

// --- het manifest en de pictogrammen --------------------------------------
// Een poule-app leeft op een telefoon, dus "zet op beginscherm" hoort een
// echte tegel te geven en geen browsersnelkoppeling.
const manifest = await page.evaluate(async () => {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return null;
  const r = await fetch(link.getAttribute('href'));
  return r.ok ? r.json() : { fout: r.status };
});
check('het manifest is er en is te laden', manifest && !manifest.fout, JSON.stringify(manifest));
check('met een naam, een startpunt en een eigen venster',
  manifest?.name === 'Poule' && !!manifest?.start_url && manifest?.display === 'standalone',
  JSON.stringify({ n: manifest?.name, s: manifest?.start_url, d: manifest?.display }));
check('en pictogrammen die Android in zijn eigen vorm mag snijden',
  (manifest?.icons ?? []).length >= 2
    && manifest.icons.every((i) => (i.purpose ?? '').includes('maskable')),
  JSON.stringify(manifest?.icons));

const plaatjes = await page.evaluate(async (icons) => {
  const uit = [];
  for (const i of icons) {
    const r = await fetch(i.src);
    uit.push(`${i.src}:${r.status}:${r.headers.get('content-type')}`);
  }
  return uit;
}, manifest?.icons ?? []);
check('en die pictogrammen bestaan ook echt',
  plaatjes.length >= 2 && plaatjes.every((p) => p.includes(':200:')),
  plaatjes.join(' | '));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
