// Het seizoen als verhaal (Wrapped), gratis voor iedereen.
//
// Wat hier vastligt:
//   1. Zolang het seizoen loopt is er niets van te zien.
//   2. Zit het seizoen erop, dan speelt het één keer vanzelf af op het
//      overzicht, en niet nog eens na herladen.
//   3. De schermen: het jaar, je punten, de eindstand, je beste weekend, je
//      coureur (die je het vaakst precies goed had), de cijfers, en een einde
//      met delen.
//   4. Delen opent het deelvenster op de story: staand, over jouw seizoen.
//   5. Opnieuw bekijken onder de stand en onder "seizoen rond".
//   6. Alleen spelend: geen eindstand en geen weekendzeges. Wie niets
//      inleverde krijgt geen knop. Niet vanzelf als het seizoen lang voorbij
//      is, en niet als het verhaal in Profiel uitstaat.
//   7. In het Engels in het Engels; geen javascriptfouten.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('het seizoen als verhaal');
const { page, jsFouten, stoppen } = await startPagina({ verhaal: true });
await page.setViewportSize({ width: 390, height: 844 });
await meedoen(page);

// Danny en Bram. Melbourne: Danny alles goed, Bram alles vijf plekken naast.
// Shanghai: Bram alles goed, Danny alleen P1 (Verstappen). Allebei langer
// dan tien dagen geleden, dus het weekendverhaal speelt niet meer vanzelf. Danny wordt
// kampioen met Melbourne als beste weekend, en Verstappen is zijn coureur
// (vier keer precies goed, de rest twee keer). Suzuka loopt nog.
const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
const DANNY_R2 = ['1', '12', '14', '10', '18', '4', '16', '63', '81', '44'];
const db = (fn, arg) => page.evaluate(([f, a]) => {
  const d = globalThis.__db;
  // eslint-disable-next-line no-new-func
  new Function('d', 'a', f)(d, a);
  sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
}, [fn, arg]);
await db(`
  const [uit, dannyR2] = a;
  const naast = [...uit.slice(5), ...uit.slice(0, 5)];
  d.pool_members.push({ member_id: 'lid-bram', pool_id: 'pool-1', display_name: 'Bram', user_id: 'iemand-bram' });
  d.races.slice(0, 2).forEach((r, k) => {
    r.quali_result = uit; r.race_result = uit;
    r.deadline_quali = new Date(Date.now() - (k ? 11 : 18) * 864e5).toISOString();
    r.deadline_race = new Date(Date.now() - (k ? 11 : 18) * 864e5 + 1e5).toISOString();
    for (const [m, lijst] of [['lid-1', k ? dannyR2 : uit], ['lid-bram', k ? uit : naast]])
      for (const v of ['quali_top10', 'race_top10'])
        d.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: m, question_id: v, waarde: lijst });
  });`, [UIT, DANNY_R2]);

const dia = () => page.evaluate(() => {
  const v = document.querySelector('.verhaal');
  const d = v?.querySelector('.verhaal-dia');
  return v ? { nr: Number(v.dataset.dia), soort: d.dataset.soort, tekst: d.textContent.replace(/\s+/g, ' ').trim(),
               label: v.getAttribute('aria-label'), balkjes: v.querySelectorAll('.verhaal-balkjes span').length } : null;
});
const weg = async () => { await page.waitForTimeout(800); return !(await page.$('.verhaal')); };
const naarStand = async () => {
  if (await page.isVisible('#terug')) await page.click('#terug');
  await page.click('[data-weergave="stand"]');
  await page.waitForTimeout(200);
};
// Herladen en naar het overzicht: de app onthoudt het tabblad, en het
// verhaal speelt alleen vanzelf op het overzicht.
const herlaad = async () => {
  await page.reload();
  await page.waitForSelector('[data-weergave="races"]');
  await page.click('[data-weergave="races"]');
  await page.waitForTimeout(200);
};
const tekst = async (sel) => ((await page.$(sel)) ? (await page.textContent(sel)).replace(/\s+/g, ' ').trim() : null);

// ---- 1. zolang het seizoen loopt ---------------------------------------------------
await page.reload();
await page.waitForSelector('[data-race]');
check('zolang het seizoen loopt speelt er niets vanzelf af', await weg());
await naarStand();
check('en staat er onder de stand geen knop', !(await page.$('[data-seizoenverhaal]')));
const stand = await page.evaluate(() => [...document.querySelectorAll('.strij')].map((e) =>
  [e.querySelector('.nm').textContent.trim().split(/\s/)[0], Number(e.querySelector('.t').textContent)]));
const dannyPunten = stand.find(([n]) => n === 'Danny')?.[1];

// ---- 2. het seizoen zit erop: één keer vanzelf ------------------------------------
await db(`d.races[2].afgelast = true;`);
await page.click('[data-weergave="races"]');
await page.reload();
await page.waitForSelector('.verhaal', { timeout: 8000 }).catch(() => {});
{
  const d = await dia();
  check('zit het seizoen erop, dan speelt het seizoen vanzelf af', d?.label === 'Jouw seizoen 2026', JSON.stringify(d));
  check('eerst het jaar en de poule', d?.soort === 'start' && d.tekst.includes('2026 zit erop')
    && d.tekst.includes('seizoen 2026 · Vrijdagmiddagpoule'), d?.tekst);
  check('met een balkje per scherm: start, punten, eindstand, beste weekend, coureur, cijfers, einde',
    d?.balkjes === 7, `${d?.balkjes}`);
}

// ---- 3. de schermen ------------------------------------------------------------------
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(1100);
{
  const d = await dia();
  check('dan je punten, gelijk aan de stand, uit hoeveel weekenden', d?.soort === 'punten'
    && d.tekst.startsWith(`jouw seizoen ${dannyPunten} punten, uit 2 van de 2 weekenden`), `${d?.tekst} (stand ${dannyPunten})`);
  check('en het gemiddelde per weekend, met een komma', d?.tekst.includes(`gemiddeld ${(dannyPunten / 2).toFixed(1).replace('.', ',')} per weekend`), d?.tekst);
}
await page.keyboard.press('ArrowRight');
{
  const d = await dia();
  const rijen = await page.$$eval('.verhaal-lijst li', (n) => n.map((l) => ({ naam: l.querySelector('.nm').textContent, klas: l.className })));
  check('dan de eindstand: kampioen', d?.soort === 'eindstand' && d.tekst.includes('Kampioen!'), d?.tekst);
  check('met jou bovenaan', rijen[0]?.naam === 'Danny' && /mij/.test(rijen[0].klas) && /winnaar/.test(rijen[0].klas) && rijen[1]?.naam === 'Bram',
    JSON.stringify(rijen));
}
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(1100);
{
  const d = await dia();
  check('dan je beste weekend: Melbourne, 100 punten', d?.soort === 'beste' && d.tekst.includes('100')
    && d.tekst.includes('Melbourne') && d.tekst.includes('ronde 1'), d?.tekst);
}
await page.keyboard.press('ArrowRight');
{
  const d = await dia();
  check('dan je coureur: die je het vaakst precies goed had', d?.soort === 'coureur' && d.tekst.includes('Max Verstappen')
    && d.tekst.includes('4 keer zette je deze coureur precies op de goede plek'), d?.tekst);
}
await page.keyboard.press('ArrowRight');
{
  const rijen = await page.$$eval('.verhaal-lijst li', (n) => n.map((l) => l.textContent.replace(/\s+/g, ' ').trim()));
  check('dan de cijfers: weekendzeges, precies goed, P1 goed, ingeleverd',
    JSON.stringify(rijen) === JSON.stringify(['weekenden gewonnen1', 'precies goed22', 'keer P1 goed4', 'weekenden ingeleverd2/2']),
    JSON.stringify(rijen));
}
await page.keyboard.press('ArrowRight');
{
  const d = await dia();
  check('en tot slot: delen, sluiten of nog een keer', d?.soort === 'einde' && d.tekst.includes('Tot volgend seizoen')
    && d.tekst.includes('Deel je seizoen') && d.tekst.includes('Sluiten') && d.tekst.includes('Nog een keer'), d?.tekst);
  check('met de focus op delen', await page.evaluate(() => document.activeElement?.matches('[data-verhaal-seizoendeel]')));
}

// ---- 4. delen --------------------------------------------------------------------------
await page.click('[data-verhaal-seizoendeel]');
await page.waitForFunction(() => document.querySelector('.deelvenster .deelbeeld')?.naturalHeight > 0, null, { timeout: 15000 }).catch(() => {});
{
  const v = await page.evaluate(() => {
    const img = document.querySelector('.deelvenster .deelbeeld');
    return { b: img?.naturalWidth, h: img?.naturalHeight, alt: img?.alt,
      kop: document.querySelector('.deelvenster h2, .deelvenster .label')?.textContent.trim(),
      vorm: document.querySelector('.deelvenster [data-vorm][aria-pressed="true"]')?.dataset.vorm ?? null,
      download: document.querySelector('.deelvenster a[download]')?.getAttribute('download') ?? null,
      verhaal: !!document.querySelector('.verhaal') };
  });
  check('delen sluit het verhaal en opent het deelvenster op de story', !v.verhaal && v.vorm === 'story', JSON.stringify(v));
  check('een staand plaatje van 1080 bij 1920', v.b === 1080 && v.h === 1920, JSON.stringify(v));
  check('met een beschrijving voor een schermlezer', v.alt === `Jouw seizoen 2026 in Vrijdagmiddagpoule: ${dannyPunten} punten`, v.alt);
  await page.click('.deelvenster [data-vorm="bericht"]');
  await page.waitForFunction(() => document.querySelector('.deelvenster .deelbeeld')?.naturalHeight === 1350, null, { timeout: 15000 }).catch(() => {});
  const b = await page.evaluate(() => document.querySelector('.deelvenster .deelbeeld')?.naturalHeight);
  check('Bericht is de eindstand van de poule (4:5)', b === 1350, String(b));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

// ---- één keer --------------------------------------------------------------------------
await page.evaluate(() => document.querySelector('.deelvenster')?.remove());
await page.reload();
await page.waitForSelector('[data-race]');
check('na herladen speelt het niet nog eens vanzelf', await weg());

// ---- 5. opnieuw bekijken --------------------------------------------------------------
check('op het overzicht staat onder "seizoen rond" een knop', (await tekst('[data-seizoenverhaal]')) === 'Bekijk je seizoen 2026',
  await tekst('[data-seizoenverhaal]'));
await naarStand();
check('en onder de stand ook', (await tekst('[data-seizoenverhaal]')) === 'Bekijk je seizoen 2026');
await page.click('[data-seizoenverhaal]');
await page.waitForSelector('.verhaal');
check('die het seizoen vanaf het begin afspeelt', (await dia())?.nr === 1 && (await dia())?.label === 'Jouw seizoen 2026');
await page.click('[data-verhaal-sla]');
check('Overslaan sluit het en laat je waar je was', (await weg()) && (await page.$('[data-seizoenverhaal]')) !== null);
await page.click('[data-seizoenverhaal]');
await page.waitForSelector('.verhaal');
for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
await page.click('[data-verhaal-klaar]');
check('Sluiten sluit het ook', await weg());
await page.click('[data-seizoenverhaal]');
await page.waitForSelector('.verhaal');
await page.keyboard.press('Escape');
check('en Escape', await weg());

// ---- 6. alleen, niets ingeleverd, lang geleden, uitgezet ---------------------------------
await db(`d.pool_members = d.pool_members.filter((m) => m.member_id !== 'lid-bram');`);
await herlaad();
await naarStand();
await page.click('[data-seizoenverhaal]');
await page.waitForSelector('.verhaal');
{
  const soorten = [];
  for (let i = 0; i < 8; i++) { soorten.push((await dia())?.soort); await page.keyboard.press('ArrowRight'); }
  check('alleen spelend: geen eindstand', !soorten.includes('eindstand') && soorten.includes('coureur'), [...new Set(soorten)].join(','));
  await page.keyboard.press('Escape');
  await page.click('[data-seizoenverhaal]');
  await page.waitForSelector('.verhaal');
  for (let i = 0; i < 4 && (await dia())?.soort !== 'cijfers'; i++) await page.keyboard.press('ArrowRight');
  const rijen = await page.$$eval('.verhaal-lijst li', (n) => n.map((l) => l.textContent.replace(/\s+/g, ' ').trim()));
  check('en geen weekendzeges', rijen.length === 3 && !rijen.some((r) => r.startsWith('weekenden gewonnen')), JSON.stringify(rijen));
  await page.keyboard.press('Escape');
}
await db(`d.answers = d.answers.filter((a) => a.member_id !== 'lid-1');`);
await herlaad();
await naarStand();
check('wie niets inleverde krijgt geen knop', !(await page.$('[data-seizoenverhaal]')));

// Een nieuwe Danny-ronde: alles terug, maar het seizoen 70 dagen geleden.
await db(`
  const [uit] = a;
  d.pool_members.push({ member_id: 'lid-bram', pool_id: 'pool-1', display_name: 'Bram', user_id: 'iemand-bram' });
  for (const r of d.races) { r.deadline_quali = new Date(Date.now() - 71 * 864e5).toISOString(); r.deadline_race = new Date(Date.now() - 70 * 864e5).toISOString(); }
  for (const r of d.races.slice(0, 2)) for (const v of ['quali_top10', 'race_top10'])
    d.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: 'lid-1', question_id: v, waarde: uit });`, [UIT]);
await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (/seizoenverhaal$/.test(k)) localStorage.removeItem(k); });
await herlaad();
check('niet vanzelf als het seizoen lang voorbij is', await weg());
check('maar de knop staat er wel', (await page.$('[data-seizoenverhaal]')) !== null);
await db(`for (const r of d.races) { r.deadline_quali = new Date(Date.now() - 6e6).toISOString(); r.deadline_race = new Date(Date.now() - 5e6).toISOString(); }`);
await page.evaluate(() => {
  for (const k of Object.keys(localStorage)) if (/verhaal$/.test(k)) localStorage.removeItem(k);
  localStorage.setItem('poule:verhaal', 'uit');
});
await herlaad();
check('en niet vanzelf als het verhaal in Profiel uitstaat', await weg());
check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();

// ---- 7. in het Engels --------------------------------------------------------------------
{
  const { page: en, jsFouten: fouten, stoppen: stop } = await startPagina({ taal: 'en' });
  await en.setViewportSize({ width: 390, height: 844 });
  await meedoen(en);
  await en.evaluate((uit) => {
    const d = globalThis.__db;
    d.races.slice(0, 2).forEach((r) => {
      r.quali_result = uit; r.race_result = uit;
      r.deadline_quali = new Date(Date.now() - 9 * 864e5).toISOString(); r.deadline_race = new Date(Date.now() - 9 * 864e5 + 1e5).toISOString();
      for (const v of ['quali_top10', 'race_top10'])
        d.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: 'lid-1', question_id: v, waarde: uit });
    });
    d.races[2].afgelast = true;
    sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
  }, UIT);
  await en.reload();
  await en.click('[data-weergave="stand"]');
  await en.waitForSelector('[data-seizoenverhaal]');
  const knop = (await en.textContent('[data-seizoenverhaal]')).trim();
  await en.click('[data-seizoenverhaal]');
  await en.waitForSelector('.verhaal');
  const t = (await en.textContent('.verhaal-dia')).replace(/\s+/g, ' ');
  check('in het Engels: de knop en het eerste scherm', knop === 'See your 2026 season' && t.includes('2026 is a wrap')
    && t.includes('This was your season.'), `${knop} | ${t}`);
  check('geen javascriptfouten in het Engels', fouten.length === 0, fouten.join(' | '));
  await stop();
}

process.exit(afronden() ? 0 : 1);
