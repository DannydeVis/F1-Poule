// Het onderlinge duel is dubbelzinnig zonder een "jij"-label bij het cijfer.
//
// Aanleiding: een speler las "JOE ... 1 – 0" en dacht dat Joe voorstond,
// terwijl híj het was die voorstond. De rij heet naar de tegenstander, dus
// het eerste cijfer lijkt bij die naam te horen — terwijl het je eigen score
// is. duels() en duelStand() zelf klopten (dat is apart getest in
// duel.test.mjs); dit was zuiver een leesbaarheidsprobleem in het scherm.
//
// Wat hier vastligt: het "jij"-label staat vast aan jouw eigen cijfer, niet
// aan dat van de tegenstander — ook als de tegenstander voorstaat.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('duelweergave: welk cijfer is van wie');
const { page, jsFouten, stoppen } = await startPagina();

await meedoen(page);

// Een tweede speler en een gescoorde race waarin alleen "ik" de winnaar goed
// heeft: dan wint "ik" dat weekend en hoort de duelstand 1-0 te zijn, met
// "jij" bij de 1.
await page.evaluate(() => {
  globalThis.__db.pool_members.push(
    { member_id: 'lid-2', pool_id: 'pool-1', display_name: 'Joey' });
  const race = globalThis.__db.races.find((r) => String(r.id) === '1');
  race.race_result = ['1', '44', '16'];
  globalThis.__db.answers.push(
    { pool_id: 'pool-1', race_id: 1, member_id: 'lid-1', question_id: 'winnaar', waarde: '1' },
    { pool_id: 'pool-1', race_id: 1, member_id: 'lid-2', question_id: 'winnaar', waarde: '44' });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await page.waitForSelector('[data-race]');
await page.click('[data-weergave="stand"]');
await page.waitForSelector('.duel');

check('de rij heet naar de tegenstander',
  (await page.textContent('.duel .nm')).trim() === 'Joey');
check('en de duelstand is 1-0 in het voordeel van "ik"',
  (await page.$eval('.duel', (el) => el.classList.contains('voor'))));

// Het scherpe punt: staat "jij" vast aan het eerste cijfer (mijn), en niet
// aan het tweede (hun)? Dat is precies waar de verwarring vandaan kwam.
const volgorde = await page.$$eval('.duelscore > *', (els) => els.map((e) => ({
  klasse: e.className, tekst: e.textContent.trim(),
})));
check('het cijfer, dan "jij", dan het streepje, dan hun cijfer',
  volgorde.length === 4
    && volgorde[0].klasse === 'mijn' && volgorde[0].tekst === '1'
    && volgorde[1].klasse === 'jij' && volgorde[1].tekst === 'jij'
    && volgorde[2].klasse === 'streep'
    && volgorde[3].klasse === 'hun' && volgorde[3].tekst === '0',
  JSON.stringify(volgorde));

// Zou de tegenstander voorstaan, dan moet "jij" nog steeds bij mijn eigen
// (nu lagere) cijfer staan — niet automatisch bij het grootste getal.
await page.evaluate(() => {
  globalThis.__db.answers = globalThis.__db.answers.filter((a) => a.race_id !== 1);
  globalThis.__db.answers.push(
    { pool_id: 'pool-1', race_id: 1, member_id: 'lid-1', question_id: 'winnaar', waarde: '44' },
    { pool_id: 'pool-1', race_id: 1, member_id: 'lid-2', question_id: 'winnaar', waarde: '1' });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await page.waitForSelector('[data-race]');
await page.click('[data-weergave="stand"]');
await page.waitForSelector('.duel');

check('nu staat de tegenstander voor',
  (await page.$eval('.duel', (el) => el.classList.contains('achter'))));
const volgordeAchter = await page.$$eval('.duelscore > *', (els) => els.map((e) => ({
  klasse: e.className, tekst: e.textContent.trim(),
})));
check('"jij" blijft bij mijn eigen cijfer staan, ook als dat nu het lagere is',
  volgordeAchter[0].klasse === 'mijn' && volgordeAchter[0].tekst === '0'
    && volgordeAchter[1].klasse === 'jij'
    && volgordeAchter[3].klasse === 'hun' && volgordeAchter[3].tekst === '1',
  JSON.stringify(volgordeAchter));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
