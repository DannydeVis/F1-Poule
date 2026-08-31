// Uitnodigingslink: ?code=RTM026 slaat het codescherm over.
//
// Twee dingen die makkelijk misgaan. De code moet daarna uit de adresbalk
// verdwijnen, anders trekt elke herlaadactie je terug naar die poule — ook
// nadat je met "Andere poule" bewust bent overgestapt. En een link met een
// code die niet bestaat mag je niet stilzwijgend in je eigen poule zetten,
// want dan merk je nooit dat de uitnodiging kapot was.
//
// Onderaan de eigen link (?code=...&speler=...), waarmee je jezelf meeneemt
// naar een tweede toestel in plaats van jezelf daar opnieuw aan te maken.

import { maakControle, startPagina } from './hulp.mjs';

const { check, afronden } = maakControle('uitnodigingslink');
const { page, jsFouten, url, stoppen } = await startPagina();

// --- de link brengt je meteen in de poule --------------------------------
await page.goto(url + '?code=RTM026');
await page.waitForSelector('[data-lid], [data-race], #code');
check('de link slaat het codescherm over',
  (await page.$('#code')) === null && (await page.$('[data-lid]')) !== null);

check('de code staat niet meer in de adresbalk',
  !(await page.evaluate(() => location.search)).includes('code'),
  await page.evaluate(() => location.search || '(leeg)'));

// --- kleine letters in de link werken ook --------------------------------
await page.evaluate(() => localStorage.clear());
await page.goto(url + '?code=rtm026');
await page.waitForSelector('[data-lid], #code');
check('kleine letters in de link werken ook',
  (await page.$('#code')) === null && (await page.$('[data-lid]')) !== null);

// --- een kapotte link laat dat merken ------------------------------------
// We staan na de vorige stap op het spelerscherm; jezelf aanwijzen zodat er
// straks iets is om naar terug te keren.
await page.click('[data-lid]');
await page.waitForSelector('[data-race]');
await page.goto(url + '?code=RTM027');   // één tekens ernaast
await page.waitForSelector('#code');
const melding = (await page.textContent('#f')).trim();
check('een code die niet bestaat geeft een melding',
  melding.toLowerCase().includes('bestaat niet'), melding || '(leeg)');
check('en zet die code alvast in het veld om te verbeteren',
  (await page.inputValue('#code')) === 'RTM027', await page.inputValue('#code'));

// Een poulecode is zes tekens; iets langers hoort niet in het veld te
// belanden, want maxlength knipt een waarde uit het attribuut niet af.
await page.goto(url + '?code=BESTAATNIET');
await page.waitForSelector('#code');
check('een onmogelijk lange code komt niet in het veld',
  (await page.inputValue('#code')) === '', await page.inputValue('#code') || '(leeg)');

// De code is ook hier uit de adresbalk gehaald, dus herladen brengt je terug
// in je eigen poule in plaats van opnieuw op dit foutscherm.
check('herladen na een kapotte link brengt je terug in je eigen poule', await (async () => {
  await page.reload();
  await page.waitForSelector('[data-race], #code');
  return (await page.$('[data-race]')) !== null;
})());

// --- de knop op de poulepagina zet de link klaar -------------------------
await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#uitnodiging');
await page.click('#uitnodiging');
await page.waitForTimeout(200);
const klembord = await page.evaluate(() => navigator.clipboard.readText());
check('de uitnodiging bevat de poulenaam en een link met de code',
  klembord.includes('Vrijdagmiddagpoule') && klembord.includes('?code=RTM026'),
  JSON.stringify(klembord));

// --- je eigen link -------------------------------------------------------
// Het probleem hierachter: dezelfde persoon op zijn telefoon én zijn laptop
// stond twee keer in de stand, met zijn punten over die twee verdeeld.
await page.waitForSelector('#eigenlink');
await page.click('#eigenlink');
await page.waitForTimeout(200);
const eigen = await page.evaluate(() => navigator.clipboard.readText());
const mijnId = await page.evaluate(() => globalThis.__db.pool_members[0].member_id);
check('je eigen link bevat de poulecode én wie je bent',
  eigen.includes('?code=RTM026') && eigen.includes('speler=' + mijnId), eigen);
check('en het is een kale link, geen uitnodigingstekst',
  !eigen.includes('Doe mee'), eigen);

// Een tweede toestel: alles vergeten wat deze browser wist, en dan de link
// openen. Zonder ?speler= zou je hier op "wie ben jij?" uitkomen.
await page.evaluate(() => localStorage.clear());
await page.goto(eigen);
await page.waitForSelector('[data-race], [data-lid], #code');
check('je eigen link zet je op een leeg toestel meteen als jezelf neer',
  (await page.$('[data-race]')) !== null && (await page.$('[data-lid]')) === null);
check('en dat toestel onthoudt je daarna zelf',
  (await page.evaluate(() => Object.keys(localStorage)
    .some((k) => k.endsWith(':mijn_id')))));

// Een speler die niet in deze poule zit is geen foutmelding waard: dan doet
// de link gewoon wat een gewone uitnodiging doet.
await page.evaluate(() => localStorage.clear());
await page.goto(url + '?code=RTM026&speler=bestaat-niet');
await page.waitForSelector('[data-lid], #code');
check('een onbekende speler in de link valt terug op "wie ben jij?"',
  (await page.$('[data-lid]')) !== null && (await page.$('#code')) === null);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
