// De punten per onderdeel op het racescherm: overal dezelfde kop.
//
// Danny, bij drie schermafdrukken van Baku: "Kan je alles gelijk trekken qua
// puntentelling design. Even een totaal kopje wat je in die categorie aan
// punten behaald hebt." Bij de winnaar stond wat de vraag waard was ("25
// punten"), bij de duels wat je behaalde ("10 van 15 punten") met een vinkje
// per duel, en bij de top 10 niets.
//
// Wat hier vastligt:
//   1. Elk onderdeel heeft een kop "<onderdeel> · <behaald> van <max> punten",
//      in je eigen uitslag en in de inzending van een ander.
//   2. Die koppen tellen samen op tot het grote getal bovenaan.
//   3. De kop van de top 10 is de som van de regels eronder; bij een sprint
//      de helft, en dan zegt de kop dat erbij.
//   4. De duels tonen per regel punten, geen vinkje: wat één goed duel
//      oplevert, naar rato van het aantal gespeelde duels.
//   5. Een vraag zonder antwoord heeft dezelfde kop, met nul punten.
//   6. Met de contrair-vermenigvuldiger kan het meer zijn dan erin zat; dan
//      staat er alleen wat je kreeg, met de uitleg erachter.
//   7. Ook in de inzending van een ander staat een plus voor elk getal dat
//      punten opleverde, net als in je eigen voorspelling.
//   8. Het totaal van een onderdeel staat groot (Danny, 4 oktober: "Moet juist
//      groot zijn aangezien het daar allemaal om draait"): groter dan de punten
//      per regel, rechts naast de naam van het onderdeel, op dezelfde hoogte.
//      Paars als je alles had, groen als je iets had, grijs bij nul.
//   9. Onder het grote getal van de sessie staat wat het hele weekend oplevert.
//  10. "Punten per onderdeel" (Danny, 4 oktober, bij een voorbeeld): per
//      onderdeel een balkje en wat je behaalde van wat erin zat, dezelfde
//      getallen als de koppen eronder, met het totaal erboven gelijk aan het
//      grote getal. Alleen onderdelen met een uitslag die de poule speelt, en
//      niet bij één onderdeel. De balkjes beginnen op één lijn en op een smalle
//      telefoon valt er niets af.

import { maakControle, startPagina, meedoen, openRace } from './hulp.mjs';

const { check, afronden } = maakControle('de punten per onderdeel');
const { page, jsFouten, stoppen } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const getal = async () => Number(await tekst('.score .getal'));
// De koppen van de onderdelen, zoals ze in de broncode staan (de hoofdletters
// komen uit de css).
const koppen = () => page.$$eval('#paneel .label', (n) => n.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
const behaald = (kop) => Number(kop.match(/· (\d+) (?:van \d+ )?punten/)?.[1] ?? NaN);
const tab = async (w) => {
  await page.click(`.tabs button[data-tab="${w}"]`);
  await page.waitForSelector('#paneel .score');
};

await meedoen(page);

const QUALI = ['1', '12', '63', '16', '44', '4', '81', '10', '14', '18', '6', '43'];
const RACE  = ['12', '1', '16', '63', '44', '81', '4', '10', '18', '14', '6', '43'];
await page.evaluate(({ QUALI, RACE }) => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  Object.assign(db.races[0], { deadline_quali: u(-50), deadline_race: u(-48),
    quali_result: QUALI, race_result: RACE,
    fastest_lap: '16', fastest_pitstop: '4', safety_cars: 2, rode_vlag: false });
  db.pool_members.push({ member_id: 'lid-2', pool_id: 'pool-1', display_name: 'Casper', user_id: null });
  const zet = (lid, vraag, waarde) => db.answers.push(
    { pool_id: 'pool-1', race_id: 1, member_id: lid, question_id: vraag, waarde });
  // Danny: van alles wat, goed en fout door elkaar.
  zet('lid-1', 'quali_top10', ['12', '1', '63', '44', '16', '4', '10', '81', '18', '14']);
  zet('lid-1', 'pole', '1');                 // goed: 10
  zet('lid-1', 'race_top10', ['1', '12', '16', '44', '63', '4', '81', '14', '10', '6']);
  zet('lid-1', 'winnaar', '12');             // goed: 25
  zet('lid-1', 'snelste_ronde', '44');       // fout: 0
  zet('lid-1', 'snelste_pitstop', '4');      // goed: 10
  zet('lid-1', 'safety_cars', 3);            // één ernaast: 6 van 12
  zet('lid-1', 'rode_vlag', false);          // goed: 20
  // Vier duels, drie goed: 15 × 3/4 = 11,25, dus 11; per duel 3,75.
  zet('lid-1', 'teamgenoot_duels', ['1', '12', '44', '81']);
  // Casper: alleen een top 10 en een verkeerde winnaar.
  zet('lid-2', 'race_top10', ['4', '81', '1', '12', '63', '16', '44', '10', '14', '18']);
  zet('lid-2', 'winnaar', '1');
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, { QUALI, RACE });
await page.reload();
await openRace(page, 'Melbourne');

// ---- 1 tot 4: je eigen race ----------------------------------------
await tab('race');
{
  const k = await koppen();
  const vind = (begin) => k.find((x) => x.startsWith(begin)) ?? '';
  const regels = await page.$$eval('.voorspelkaart > .strip .pts', (n) => n.map((e) => Number(e.textContent)));
  const som = regels.reduce((a, b) => a + b, 0);
  check('de top 10 heeft een kop met wat hij opleverde, en dat is de som van de regels',
    vind('top 10') === `top 10 · ${som} van 50 punten` && regels.length === 10, `${vind('top 10')} · som ${som}`);
  check('elke losse vraag zegt wat je behaalde van wat erin zat',
    vind('winnaar') === 'winnaar · 25 van 25 punten'
      && vind('snelste ronde') === 'snelste ronde · 0 van 10 punten'
      && vind('snelste pitstop') === 'snelste pitstop · 10 van 10 punten'
      && vind('safety cars') === 'safety cars · 6 van 12 punten'
      && vind('rode vlag') === 'rode vlag · 20 van 20 punten',
    k.filter((x) => /winnaar|snelste|safety|rode/.test(x)).join(' | '));
  check('de duels ook, met hoeveel er goed waren',
    vind('teamgenoot-duels') === 'teamgenoot-duels · 11 van 15 punten · 3 van 4 goed', vind('teamgenoot-duels'));
  const onderdelen = ['top 10', 'winnaar', 'snelste ronde', 'snelste pitstop', 'safety cars', 'rode vlag', 'teamgenoot-duels']
    .map((o) => behaald(vind(o)));
  const totaal = onderdelen.reduce((a, b) => a + b, 0);
  check('samen zijn de koppen precies het grote getal bovenaan',
    totaal === (await getal()) && onderdelen.every(Number.isFinite), `${onderdelen.join(' + ')} = ${totaal} · getal ${await getal()}`);

  // De duels: per regel punten, geen vinkje.
  const duels = await page.$$eval('#paneel .strip', (lijsten) => {
    const u = lijsten.find((l) => /^[A-Z]{2,3}/.test(l.querySelector('.pos')?.textContent.trim() ?? '')
      && !/^P\d+$/.test(l.querySelector('.pos')?.textContent.trim() ?? ''));
    return [...(u?.querySelectorAll('.sr') ?? [])].map((r) => ({
      werd: r.querySelector('.werd').textContent.trim(), pts: r.querySelector('.pts').textContent.trim() }));
  });
  // 8. Groot, rechts, op één hoogte met de naam, en de kleur.
  const vorm = await page.$$eval('#paneel .okop', (koppen) => koppen.map((k) => {
    const wat = k.querySelector('.okop-wat').getBoundingClientRect();
    const som = k.querySelector('.okop-som b');
    const r = som.getBoundingClientRect();
    const kader = k.getBoundingClientRect();
    return { wat: k.querySelector('.okop-wat').textContent, noot: !!k.querySelector('.okop-extra'),
             groot: parseFloat(getComputedStyle(som).fontSize), kleur: k.querySelector('.okop-som').className,
             // De rechterkant van de tekst zelf ("van 50 punten"), niet van het vak
             // eromheen: dat vak kan de hele breedte vullen met het getal links.
             rechts: kader.right - k.querySelector('.okop-som small').getBoundingClientRect().right,
             hoogte: Math.abs((wat.top + wat.bottom) / 2 - (r.top + r.bottom) / 2) };
  }));
  const regelGroot = Math.max(...await page.$$eval('#paneel .pts', (n) => n.map((e) => parseFloat(getComputedStyle(e).fontSize))));
  check('het totaal van elk onderdeel is groter dan de punten per regel',
    vorm.length === 7 && vorm.every((v) => v.groot > regelGroot), `${vorm.map((v) => v.groot).join(',')} tegen ${regelGroot}`);
  check('en staat rechts, op dezelfde hoogte als de naam van het onderdeel (als er geen noot onder staat)',
    vorm.every((v) => v.rechts < 2) && vorm.filter((v) => !v.noot).every((v) => v.hoogte < 4),
    JSON.stringify(vorm.map((v) => [v.wat, Math.round(v.rechts), Math.round(v.hoogte)])));
  const kleur = (wat) => vorm.find((v) => v.wat === wat)?.kleur ?? '';
  check('paars bij alles (winnaar), groen bij een deel (safety cars), grijs bij nul (snelste ronde)',
    /\bv5\b/.test(kleur('winnaar')) && /\bv3\b/.test(kleur('safety cars')) && /\bv0\b/.test(kleur('snelste ronde')),
    ['winnaar', 'safety cars', 'snelste ronde'].map(kleur).join(' | '));

  check('een duel toont punten en geen vinkje: een goed duel is 15 gedeeld door vier',
    duels.length === 4 && duels.every((d) => (d.werd.startsWith('won') ? d.pts === '3,8' : d.pts === '0'))
      && !duels.some((d) => /[✓✗]/.test(d.pts)),
    JSON.stringify(duels));
}

// ---- de kwalificatie: dezelfde koppen, dezelfde som ----------------
await tab('quali');
{
  const k = await koppen();
  const vind = (begin) => k.find((x) => x.startsWith(begin)) ?? '';
  const regels = await page.$$eval('.voorspelkaart > .strip .pts', (n) => n.map((e) => Number(e.textContent)));
  const som = regels.reduce((a, b) => a + b, 0);
  check('op de kwalificatie de top 10 en de pole, en samen het grote getal',
    vind('top 10') === `top 10 · ${som} van 50 punten` && vind('pole') === 'pole · 10 van 10 punten'
      && som + 10 === (await getal()),
    `${vind('top 10')} | ${vind('pole')} | ${await getal()}`);
}

// ---- 9. wat het hele weekend oplevert ----------------------------------
{
  const quali = await getal();
  await tab('race');
  const race = await getal();
  const regel = await tekst('#paneel .score .weekendsom').catch(() => '');
  check('onder het grote getal: wat het hele weekend oplevert, kwalificatie en race samen',
    regel === `${quali + race} punten dit weekend`, `${regel} · ${quali} + ${race}`);
  await tab('quali');
  check('ook op de kwalificatie', (await tekst('#paneel .score .weekendsom').catch(() => '')) === `${quali + race} punten dit weekend`);
}

// ---- 10. punten per onderdeel ------------------------------------------
const overzicht = () => page.$$eval('.onderdelenkaart', (k) => k.map((kaart) => ({
  totaal: kaart.querySelector('.tegelkop .puntensom').textContent.replace(/\s+/g, ' ').trim(),
  rijen: [...kaart.querySelectorAll('.onderdelen li')].map((li) => ({
    wat: li.querySelector('.onaam').textContent.trim(),
    b: Number(li.querySelector('.puntensom b').textContent),
    max: Number(li.querySelector('.puntensom small').textContent.replace(/\D/g, '')),
    breedte: li.querySelector('.balkje i').style.width,
    kleur: li.querySelector('.balkje').className.replace('balkje', '').trim(),
  })),
}))[0] ?? null);
await tab('race');
{
  const o = await overzicht();
  const koppen10 = Object.fromEntries((await koppen()).filter((k) => / van \d+ punten/.test(k))
    .map((k) => [k.split(' · ')[0], behaald(k)]));
  const wat = o?.rijen.map((r) => r.wat).join(', ');
  check('op de race een overzicht van alle onderdelen, in de volgorde van de koppen eronder',
    wat === 'top 10, winnaar, snelste ronde, snelste pitstop, safety cars, rode vlag, teamgenoot-duels', wat);
  check('met per onderdeel dezelfde punten als de kop eronder, en wat erin zat',
    !!o && o.rijen.every((r) => r.b === koppen10[r.wat]) && o.rijen.map((r) => r.max).join() === '50,25,10,10,12,20,15',
    JSON.stringify(o?.rijen.map((r) => [r.wat, r.b, r.max, koppen10[r.wat]])));
  const som = o?.rijen.reduce((n, r) => n + r.b, 0);
  check('en erboven het totaal: het grote getal, van alles wat erin zat',
    o?.totaal === `${await getal()} van 142 punten` && som === (await getal()), `${o?.totaal} · som ${som}`);
  check('het balkje is wat je behaalde van wat erin zat',
    !!o && o.rijen.every((r) => r.breedte === `${Math.min(100, Math.round(100 * r.b / r.max))}%`),
    JSON.stringify(o?.rijen.map((r) => [r.wat, r.breedte])));
  const kleur = (w) => o?.rijen.find((r) => r.wat === w)?.kleur;
  check('in dezelfde kleuren: paars bij alles, groen bij een deel, grijs bij nul',
    kleur('winnaar') === 'v5' && kleur('safety cars') === 'v3' && kleur('snelste ronde') === 'v0',
    ['winnaar', 'safety cars', 'snelste ronde'].map(kleur).join(' | '));
  check('het overzicht staat tussen je punten en je voorspelling',
    await page.evaluate(() => {
      const [a, b, c] = ['.scorekaart', '.onderdelenkaart', '.voorspelkaart'].map((k) => document.querySelector(k));
      return !!(a && b && c) && (a.compareDocumentPosition(b) & 4) > 0 && (b.compareDocumentPosition(c) & 4) > 0;
    }));
  // Op een smalle telefoon: niets dat eraf valt, en de balkjes op één lijn.
  for (const breedte of [320, 390]) {
    await page.setViewportSize({ width: breedte, height: 800 });
    const vorm = await page.evaluate(() => {
      const kaart = document.querySelector('.onderdelenkaart').getBoundingClientRect();
      return { scroll: document.documentElement.scrollWidth,
        past: [...document.querySelectorAll('.onderdelen .puntensom')].every((x) => x.scrollWidth <= x.clientWidth + 1
          && x.getBoundingClientRect().right <= kaart.right - 10),
        balkjes: new Set([...document.querySelectorAll('.onderdelen .balkje')].map((b) => Math.round(b.getBoundingClientRect().left))).size };
    });
    check(`op ${breedte} pixels past alles, en de balkjes beginnen op één lijn`,
      vorm.scroll <= breedte && vorm.past && vorm.balkjes === 1, JSON.stringify(vorm));
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}
await tab('quali');
{
  const o = await overzicht();
  check('op de kwalificatie de top 10 en de pole', o?.rijen.map((r) => r.wat).join(', ') === 'top 10, pole'
    && o?.totaal === `${await getal()} van 60 punten`, JSON.stringify(o));
}

// ---- 5 en 7: de inzending van een ander ------------------------------
await tab('race');
await page.click('[data-bekijk="lid-2"]');
await page.waitForSelector('#inkijkterug');
{
  const k = await koppen();
  const vind = (begin) => k.find((x) => x.startsWith(begin)) ?? '';
  const regels = await page.$$eval('#paneel .strip:first-of-type .pts', (n) => n.map((e) => Number(e.textContent)));
  const som = regels.reduce((a, b) => a + b, 0);
  check('bij een ander dezelfde kop boven de top 10',
    vind('top 10') === `top 10 · ${som} van 50 punten`, vind('top 10'));
  check('een fout antwoord is nul van zoveel',
    vind('winnaar') === 'winnaar · 0 van 25 punten', vind('winnaar'));
  check('en een vraag zonder antwoord ook, met erbij dat er niets gekozen is',
    vind('snelste ronde') === 'snelste ronde · 0 van 10 punten · niets gekozen'
      && vind('teamgenoot-duels') === 'teamgenoot-duels · 0 van 15 punten · niets gekozen',
    `${vind('snelste ronde')} | ${vind('teamgenoot-duels')}`);
  const plus = await page.$$eval('#paneel .pts:not(.v0)', (n) => n.map((e) => getComputedStyle(e, '::before').content));
  check('met een plus voor elk getal dat punten opleverde, net als in je eigen voorspelling',
    plus.length > 0 && plus.every((c) => c === '"+ "'), plus.join(' '));
  const kop = await tekst('.inkijkkop .t');
  const onderdelen = ['top 10', 'winnaar', 'snelste ronde', 'snelste pitstop', 'safety cars', 'rode vlag', 'teamgenoot-duels']
    .map((o) => behaald(vind(o)));
  check('en ook daar tellen de koppen op tot zijn punten',
    onderdelen.reduce((a, b) => a + b, 0) === Number(kop), `${onderdelen.join(' + ')} · ${kop}`);
}
await page.click('#inkijkterug');

// ---- 3: een sprint telt half ----------------------------------------
await page.evaluate(({ QUALI }) => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  Object.assign(db.races[0], { deadline_sprint: u(-52), sprint_result: QUALI });
  db.answers.push({ pool_id: 'pool-1', race_id: 1, member_id: 'lid-1', question_id: 'sprint_top10',
    waarde: ['12', '1', '63', '44', '16', '4', '10', '81', '18', '14'] });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, { QUALI });
await page.reload();
await openRace(page, 'Melbourne');
await tab('sprint');
{
  const k = await koppen();
  const kop = k.find((x) => x.startsWith('top 10')) ?? '';
  const regels = await page.$$eval('.voorspelkaart > .strip .pts', (n) => n.map((e) => Number(e.textContent)));
  const half = Math.round(regels.reduce((a, b) => a + b, 0) / 2);
  check('bij een sprint is de kop de helft van de regels, en zegt hij waarom',
    kop === `top 10 · ${half} van 25 punten · de sprint telt half` && half === (await getal()),
    `${kop} · regels ${regels.join(',')} · getal ${await getal()}`);
}

// ---- 6: meer dan erin zat, door de contrair-vermenigvuldiger ---------
// Danny en Casper kozen elk een andere winnaar, dus Danny was de enige met
// de zijne: × 1,5. 25 × 1,5 = 37,5, afgerond 38.
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pools[0].contrair_vanaf = new Date(Date.now() - 1000 * 3600e3).toISOString();
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await openRace(page, 'Melbourne');
await tab('race');
{
  const kop = (await koppen()).find((x) => x.startsWith('winnaar')) ?? '';
  check('meer dan erin zat: alleen wat je kreeg, met de vermenigvuldiger erachter',
    kop === 'winnaar · 38 punten · ×1,5 (je was de enige)', kop);
  const o = await overzicht();
  const w = o?.rijen.find((r) => r.wat === 'winnaar');
  check('ook in het overzicht: 38 van 25, een vol balkje, en het totaal blijft het grote getal',
    w?.b === 38 && w?.max === 25 && w?.breedte === '100%' && w?.kleur === 'v5'
      && o?.totaal.startsWith(`${await getal()} van`), JSON.stringify(o));
}

// ---- 10, vervolg: wat er niet in het overzicht hoort ---------------------
// Een onderdeel zonder uitslag (de snelste pitstop komt later) telt niet mee,
// ook niet in wat erin zat. En een poule die per sessie maar één onderdeel
// speelt (Simpel) krijgt geen overzicht: de kop boven de top 10 zegt het al.
await page.evaluate(() => {
  const db = globalThis.__db;
  db.races[0].fastest_pitstop = null;
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await openRace(page, 'Melbourne');
await tab('race');
{
  const o = await overzicht();
  check('een onderdeel zonder uitslag staat er niet in, en telt niet mee in wat erin zat',
    !!o && !o.rijen.some((r) => r.wat === 'snelste pitstop') && /van 132 punten$/.test(o.totaal), JSON.stringify(o));
}
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pool_questions = [{ pool_id: 'pool-1', question_id: 'quali_top10' }, { pool_id: 'pool-1', question_id: 'race_top10' }];
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await openRace(page, 'Melbourne');
await tab('race');
check('met maar één onderdeel (Simpel) geen overzicht', (await page.$('.onderdelenkaart')) === null
  && (await page.$('.voorspelkaart')) !== null);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
