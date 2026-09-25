// Teksten in gewone taal.
//
// Aanleiding, bij een schermafdruk van "Inzendingen zijn gesloten. De uitslag
// volgt zodra de sync hem bij OpenF1 heeft opgehaald; die draait elk uur.":
// "dit soort teksten is niet nodig. Een gebruiker boeit dat niet en wil alleen
// weten wanneer de uitslag bekend is. niet dat het van openF1 komt of
// supabase oid."
//
// Wat hier vastligt:
//   1. Geen enkele tekst in de app noemt OpenF1, Supabase, de sync, de
//      database, schema.sql, RLS of een tabel. Behalve de privacyverklaring:
//      die hoort te zeggen waar je gegevens staan en wie ze ziet.
//   2. Een gesloten tabblad zegt wanneer de uitslag er ongeveer is: tijdens de
//      sessie hoe laat hij afgelopen is, daarna "binnen een paar uur", en als
//      het echt lang duurt dat hij vanzelf komt.
//   3. Een race zonder coureurs zegt dat die nog komen, zonder "database".
//   4. Een fout bij het opslaan zegt in gewone woorden wat er aan de hand is:
//      een storing aan onze kant (met de foutcode erbij, voor de beheerder),
//      geen verbinding, of een race die er niet meer is. Een melding die
//      schema.sql zelf voor spelers schrijft ("De race is gesloten") blijft
//      gewoon staan.
//   5. Lukt het verwijderen van een account niet, dan krijg je te horen waar
//      je het kunt vragen, niet dat er een functie in de database mist.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, startPagina, meedoen, openRace, kiesTien, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('teksten in gewone taal');

// ---- 1. geen techniek in de teksten --------------------------------------------------------
const bron = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
const blok = bron.match(/const ENGELS = (Object\.fromEntries\(\[[\s\S]*?\n\]\));/);
const ENGELS = blok ? (0, eval)(blok[1]) : {};
const TECHNIEK = /openf1|supabase|\bsync\b|database|schema\.sql|\bsql\b|\brls\b|postgrest|policy|pool_id|member_id/i;
// De privacyverklaring noemt ze met opzet: waar je gegevens staan en wie ze ziet.
const PRIVACY = /^<b>(Wat er bewaard wordt|Waar het staat|Wat er niet gebeurt)<\/b>/;
const fout = Object.entries(ENGELS)
  .filter(([nl]) => !PRIVACY.test(nl))
  .filter(([nl, en]) => TECHNIEK.test(nl) || TECHNIEK.test(en))
  .map(([nl]) => nl.slice(0, 80));
check('de teksten zijn gevonden', Object.keys(ENGELS).length > 400, String(Object.keys(ENGELS).length));
check('geen tekst noemt OpenF1, Supabase, de sync of de database (behalve de privacyverklaring)',
  fout.length === 0, fout.join(' | '));
check('de privacyverklaring zegt wel waar je gegevens staan',
  Object.keys(ENGELS).some((nl) => PRIVACY.test(nl) && nl.includes('Supabase')));

// ---- 2. wanneer is de uitslag er? ----------------------------------------------------------
const { page, jsFouten, stoppen } = await startPagina();
await meedoen(page);
const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();

// Melbourne: de kwalificatie begon `minuten` geleden, zonder uitslag.
const gesloten = async (minuten, tab = 'quali') => {
  const start = await page.evaluate(({ minuten, tab }) => {
    const r = globalThis.__db.races[0];
    const start = new Date(Date.now() - minuten * 6e4).toISOString();
    r.deadline_quali = tab === 'quali' ? start : new Date(Date.now() - 600 * 6e4).toISOString();
    r.deadline_race = tab === 'race' ? start : new Date(Date.now() + 3e8).toISOString();
    sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
    return start;
  }, { minuten, tab });
  await page.reload();
  await openRace(page, 'Melbourne');
  await page.click(`[data-tab="${tab}"]`);
  await page.waitForSelector('#paneel .leeg');
  return { start, zin: await tekst('#paneel .leeg') };
};
// Dezelfde notatie als de app: korte dag en de tijd, in de taal van de app.
const tijd = (iso, minuten) => page.evaluate(({ iso, minuten }) =>
  new Date(Date.parse(iso) + minuten * 6e4).toLocaleString('nl-NL', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
{ iso, minuten });

{
  const { start, zin } = await gesloten(10);
  const eind = await tijd(start, 60);
  check('tijdens de kwalificatie: hij is begonnen, je voorspelling ligt vast',
    zin.includes('De kwalificatie is begonnen en je voorspelling ligt vast.'), zin);
  check('en hoe laat hij ongeveer afgelopen is, met de uitslag een paar uur later',
    zin.includes(`Rond ${eind} is het afgelopen, en een paar uur later staat de uitslag hier.`), `${zin} (verwacht ${eind})`);
  check('het blok zegt "uitslag volgt nog" en niet "gesloten"', zin.startsWith('uitslag volgt nog'), zin);
}
{
  const { zin } = await gesloten(90);
  check('na afloop: de uitslag staat hier binnen een paar uur',
    zin.includes('De kwalificatie is afgelopen. De uitslag staat hier binnen een paar uur.'), zin);
}
{
  const { zin } = await gesloten(60 * 12);
  check('duurt het veel langer, dan komt hij vanzelf en hoef je niets te doen',
    zin.includes('De uitslag laat langer op zich wachten dan normaal.') && zin.includes('je hoeft niets te doen'), zin);
}
{
  // Een race duurt twee uur: na anderhalf uur is hij nog bezig.
  const { start, zin } = await gesloten(90, 'race');
  const eind = await tijd(start, 120);
  check('een race duurt langer: na anderhalf uur is hij nog bezig',
    zin.includes('De race is begonnen') && zin.includes(`Rond ${eind}`), `${zin} (verwacht ${eind})`);
}

// ---- 3. een race zonder coureurs -----------------------------------------------------------
await openRace(page, 'Suzuka');
await page.waitForSelector('#paneel .leeg');
const leeg = await tekst('#paneel .leeg');
check('een race zonder coureurs zegt dat die nog komen',
  // De kop heeft een <br>, en textContent plakt daar de woorden aan elkaar.
  /De coureurs\s*volgen nog/.test(leeg) && leeg.includes('Wie er meerijdt is nog niet bekend'), leeg);
await page.click('#terug');
await page.waitForSelector('[data-race]');
check('en in de kalender staat "coureurs volgen"',
  (await tekst('[data-race]:has(.nm:text-is("Suzuka"))')).includes('coureurs volgen'),
  await tekst('[data-race]:has(.nm:text-is("Suzuka"))'));

// ---- 4. een fout bij het opslaan -----------------------------------------------------------
await page.evaluate(() => {
  const r = globalThis.__db.races[1];
  r.deadline_quali = new Date(Date.now() + 3e8).toISOString();
  r.deadline_race = new Date(Date.now() + 4e8).toISOString();
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await openRace(page, 'Shanghai');
await page.click('[data-tab="quali"]');
await kiesTien(page);
const opslaanMet = async (fout) => {
  await page.evaluate((f) => { globalThis.__volgendeFout = f; }, fout);
  await page.click('#opslaan');
  await page.waitForSelector('.err:not(:empty)', { timeout: 5000 }).catch(() => {});
  const zin = (await page.textContent('.err')).trim();
  await page.evaluate(() => { globalThis.__volgendeFout = null; });
  return zin;
};
{
  const zin = await opslaanMet({ code: '42703', message: 'column answers.waarde does not exist' });
  check('een fout in de database: een storing aan onze kant, met de code erbij',
    zin.includes('Dat lukte niet door een storing aan onze kant.') && zin.endsWith('(42703)'), zin);
  check('en niet de Engelse melding uit de database', !/column|answers|does not exist/.test(zin), zin);
}
{
  const zin = await opslaanMet({ code: 'PGRST301', message: 'JWT expired' });
  check('ook een fout die de app niet kent wordt geen Engelse melding',
    zin.includes('storing aan onze kant') && zin.endsWith('(PGRST301)') && !zin.includes('JWT'), zin);
}
{
  const zin = await opslaanMet({ code: '', message: 'TypeError: Failed to fetch' });
  check('geen verbinding: dat staat er gewoon', zin === 'Geen verbinding. Probeer het zo nog eens.', zin);
}
{
  const zin = await opslaanMet({ code: '23503', message: 'insert or update on table "answers" violates foreign key constraint' });
  check('een race of speler die er niet meer is', zin.startsWith('Deze race of speler bestaat niet meer.'), zin);
}
{
  const zin = await opslaanMet({ code: 'P0001', message: 'De kwalificatie van deze race is gesloten' });
  check('een melding die de database zelf voor spelers schrijft blijft staan',
    zin === 'De kwalificatie van deze race is gesloten', zin);
}
check('de top 10 is na al die pogingen nog ingevuld', (await page.$$eval('.slot.vol', (n) => n.length)) === 10);

// ---- 5. een account dat niet weg kan --------------------------------------------------------
await page.click('#opslaan');
await page.waitForSelector('[data-race]');
await page.click('[data-weergave="profiel"]');
await page.click('#privacyopen');
await page.waitForSelector('#wegaccount');
await page.click('#wegaccount');
await page.evaluate(() => {
  globalThis.__volgendeFout = { code: 'PGRST202', message: 'Could not find the function public.verwijder_mijn_account in the schema cache' };
});
await page.click('#wegaccount');
await page.waitForSelector('#wegfout:not(:empty)', { timeout: 5000 }).catch(() => {});
const weg = (await page.textContent('#wegfout').catch(() => '')).trim();
check('verwijderen lukt niet: je krijgt te horen waar je het kunt vragen',
  weg.startsWith('Verwijderen lukt nu niet. Mail naar ') && weg.includes('@'), weg);
check('en niets over functies of een database', !/schema|function|database|PGRST/i.test(weg), weg);

check('geen JavaScript-fouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
