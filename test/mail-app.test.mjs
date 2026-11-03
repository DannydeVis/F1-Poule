// Mail als tweede kanaal in de app (Danny, 3 november), in de browser.
//
// "Ik wil dat ze vaker de app openen." Onder Profiel zet je mail aan: op
// vrijdagavond de vrije trainingen, na de race je punten en je plek. Wat hier
// vastligt:
//   1. Een account zonder mailadres (anoniem, na het claimen): het blok zegt
//      dat het kan zodra je een adres koppelt, zonder knop.
//   2. Met een gekoppeld adres (Google): het blok noemt het adres, met "Zet mail
//      aan". Aanzetten zet een rij met je taal en tijdzone; het blok zegt dan
//      dat het aanstaat, met "Zet mail uit".
//   3. Een taalwissel werkt de taal van de mail bij.
//   4. De afmeldlink uit de mail (?afmelden=token) zet het uit, zonder in te
//      loggen, en gaat uit de adresbalk. Nog een keer: "stond al uit". Een
//      kapotte link: dat hij niet klopt. Ook op een toestel zonder poule.
//   5. Uitzetten onder Profiel.
//   6. In het Engels. En een database zonder de functies: geen blok, geen fout.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('mail aanzetten in de app');
const tekst = async (page, kies) => ((await page.textContent(kies)) ?? '').replace(/\s+/g, ' ').trim();
const rijen = (page) => page.evaluate(() => globalThis.__db.mail_abonnementen);
const blok = (page) => page.evaluate(() => {
  const p = document.querySelector('[data-per-mail]');
  return p ? { stand: p.dataset.perMail, tekst: p.textContent.replace(/\s+/g, ' ').trim(),
               aan: !!document.querySelector('#perMailAan'), uit: !!document.querySelector('#perMailUit') } : null;
});
const naarProfiel = async (page) => {
  await page.click('[data-weergave="profiel"]');
  await page.waitForSelector('[data-per-mail]');
};
const melding = (page) => page.evaluate(() => document.querySelector('.meldingbalk .melding, #f')?.textContent.trim() ?? '');

{
  const { page, jsFouten, stoppen, url } = await startPagina();
  await meedoen(page);
  await naarProfiel(page);
  const anoniem = await blok(page);
  check('een account zonder mailadres: het blok zegt dat het kan zodra je er een koppelt, zonder knop',
    anoniem?.stand === 'kan-niet' && anoniem.tekst.includes('koppel er hierboven een') && !anoniem.aan && !anoniem.uit,
    JSON.stringify(anoniem));

  // Google koppelen, zoals test/google.test.mjs.
  await page.click('#googlekoppel');
  await page.waitForFunction(() => globalThis.__mail.aantalVerstuurd() === 1);
  await page.goto(await page.evaluate(() => globalThis.__mail.laatsteLink()));
  await page.waitForSelector('[data-weergave="profiel"]');
  await naarProfiel(page);
  const metAdres = await blok(page);
  check('met een gekoppeld adres: het blok noemt het adres, met "Zet mail aan"',
    metAdres?.stand === 'uit' && metAdres.tekst.includes('danny@gmail.voorbeeld') && metAdres.aan && !metAdres.uit
      && (await tekst(page, '#perMailAan')) === 'Zet mail aan', JSON.stringify(metAdres));

  await page.click('#perMailAan');
  await page.waitForSelector('#perMailUit');
  const [rij] = await rijen(page);
  const account = await page.evaluate(() => globalThis.__db.auth_users[0].id);
  check('aanzetten zet één rij voor dit account, met de taal en de tijdzone van dit toestel',
    (await rijen(page)).length === 1 && rij.user_id === account && rij.taal === 'nl'
      && rij.tijdzone === (await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone)), JSON.stringify(rij));
  const aan = await blok(page);
  check('en het blok zegt dat het aanstaat, met "Zet mail uit", en een melding', aan?.stand === 'aan'
    && aan.tekst.includes('danny@gmail.voorbeeld') && (await melding(page)) === 'Mail staat aan.', `${JSON.stringify(aan)} ${await melding(page)}`);

  // Een taalwissel: de mail gaat voortaan in het Engels.
  await page.evaluate(() => { const k = document.querySelector('[data-taal="en"]'); if (k) k.click(); });
  await page.waitForFunction(() => globalThis.__db.mail_abonnementen[0]?.taal === 'en', null, { timeout: 5000 }).catch(() => {});
  check('een taalwissel werkt de taal van de mail bij', (await rijen(page))[0]?.taal === 'en', JSON.stringify(await rijen(page)));
  await page.evaluate(() => { const k = document.querySelector('[data-taal="nl"]'); if (k) k.click(); });
  await page.waitForFunction(() => globalThis.__db.mail_abonnementen[0]?.taal === 'nl', null, { timeout: 5000 }).catch(() => {});

  // De afmeldlink uit de mail.
  const token = (await rijen(page))[0].token;
  await page.goto(`${url}?afmelden=${token}`);
  await page.waitForSelector('[data-weergave="profiel"]');
  await page.waitForFunction(() => !!document.querySelector('.meldingbalk .melding'));
  check('de afmeldlink zet mail uit, en zegt dat', (await rijen(page)).length === 0
    && (await melding(page)) === 'Je krijgt geen mail meer van Predict the Race.', await melding(page));
  check('en hij gaat uit de adresbalk', !(await page.evaluate(() => location.search.includes('afmelden'))),
    await page.evaluate(() => location.href));
  await naarProfiel(page);
  check('onder Profiel staat het dan weer uit', (await blok(page))?.stand === 'uit', JSON.stringify(await blok(page)));

  await page.goto(`${url}?afmelden=${token}`);
  await page.waitForFunction(() => !!document.querySelector('.meldingbalk .melding'));
  check('dezelfde link nog een keer: mail stond al uit', (await melding(page)) === 'Mail stond al uit. Aanzetten kan onder Profiel.',
    await melding(page));

  // Weer aan, en dan uit onder Profiel.
  await naarProfiel(page);
  await page.click('#perMailAan');
  await page.waitForSelector('#perMailUit');
  await page.click('#perMailUit');
  await page.waitForSelector('#perMailAan');
  check('uitzetten onder Profiel haalt de rij weg', (await rijen(page)).length === 0 && (await melding(page)) === 'Mail staat uit.',
    await melding(page));

  // Op een toestel zonder poule, met een kapotte link.
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${url}?afmelden=geen-token`);
  await page.waitForSelector('#code');
  check('een kapotte link op een toestel zonder poule: dat hij niet klopt',
    (await tekst(page, '#f')) === 'Deze afmeldlink klopt niet. Mail zet je uit onder Profiel.', await tekst(page, '#f'));
  check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

{
  const { page, jsFouten, stoppen } = await startPagina({ taal: 'en' });
  await meedoen(page);
  await page.click('#googlekoppel').catch(async () => {
    await page.click('[data-weergave="profiel"]');
    await page.click('#googlekoppel');
  });
  await page.waitForFunction(() => globalThis.__mail.aantalVerstuurd() === 1);
  await page.goto(await page.evaluate(() => globalThis.__mail.laatsteLink()));
  await page.waitForSelector('[data-weergave="profiel"]');
  await naarProfiel(page);
  const en = await blok(page);
  check('in het Engels', en?.tekst.startsWith('Get an email on Friday evening') && (await tekst(page, '#perMailAan')) === 'Turn on email',
    JSON.stringify(en));
  check('geen javascriptfouten in het Engels', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

{
  // Een database zonder de functies (schema.sql nog niet gedraaid).
  const zonder = (bron) => bron.replace('  mail_stand() {', '  mail_stand_weg() {');
  const { page, jsFouten, stoppen } = await startPagina({ aanpassen: zonder });
  await meedoen(page);
  await page.click('[data-weergave="profiel"]');
  await page.waitForSelector('#googlekoppel');
  await page.waitForTimeout(300);
  check('een database zonder de functies: geen blok en geen fout',
    (await page.$('[data-per-mail]')) === null && jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
