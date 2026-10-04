// Sprintweekenden: zes van de vierentwintig weekenden hebben er een derde
// sessie bij.
//
// De app was tot nu toe rond een tweedeling gebouwd — kwalificatie en race,
// overal als twee losse regels naast elkaar. Een derde sessie erbij is
// daarom niet "nog een tabje": het is de vraag of elke plek die over sessies
// gaat ook echt over álle sessies van dít weekend gaat, en niet over de twee
// die de programmeur toevallig uitschreef.
//
// Wat hier vastligt:
//   1. Een gewoon weekend krijgt geen sprint-tab. Dit is de belangrijkste
//      controle van het bestand: achttien van de vierentwintig weekenden
//      horen er precies zo uit te zien als voorheen.
//   2. Een sprintweekend krijgt er één, op de plek waar hij in het weekend
//      valt: de sprint gaat vóór de kwalificatie.
//   3. De sprint telt voor halve punten. Dezelfde top 10, dezelfde 5/3/1 per
//      plek, maar een sprint is een derde van een race lang.
//   4. De weekendscore telt alleen de sessies die dat weekend bestaan, dus
//      een gewoon weekend krijgt geen nul van een sprint die er niet was.
//   5. Invullen en bewaren werkt op de sprint-tab net als op de andere twee.
//   6. Automatisch aanvullen slaat de sprint bewust over.
//   7. "Maximaal per weekend" laat de sprint erbuiten en noemt hem apart.
//   8. Een poule die de sprint niet speelt (Simpel of Klassiek) krijgt op een
//      sprintweekend geen sprint-tab, geen S in de kalender en geen teller
//      naar de sprint: wat openstaat is de kwalificatie. Gezien bij Danny op
//      4 oktober, Singapore in de Vrijdagmiddagpoule.

import { maakControle, startPagina, meedoen, kiesTien } from './hulp.mjs';

const { check, afronden } = maakControle('sprintweekend');
const { page, jsFouten, stoppen } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const tabs = () => page.$$eval('.tabs button', (n) => n.map((b) => b.textContent.trim()));
const rij = (naam) => `[data-race]:has(.nm:text-is("${naam}"))`;
const openRace = async (naam) => {
  await page.waitForSelector('[data-race]');
  await page.click(rij(naam));
  await page.waitForSelector('#paneel');
};
// #terug is het mobiele pijltje en staat op deze breedte op display:none;
// de navigatieknop werkt op elke schermgrootte.
const terug = async () => {
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('[data-race]');
};

await meedoen(page);

// --- 1. een gewoon weekend is en blijft twee sessies -----------------------
await openRace('Melbourne');
check('een gewoon weekend heeft twee tabbladen',
  JSON.stringify(await tabs()) === JSON.stringify(['Kwalificatie', 'Race']),
  (await tabs()).join(' | '));
await terug();

const merktekens = (naam) => page.$$eval(`${rij(naam)} .mk i`, (n) => n.map((i) => i.textContent));
check('en twee merktekens in de kalender: Q en R',
  JSON.stringify(await merktekens('Melbourne')) === JSON.stringify(['Q', 'R']),
  (await merktekens('Melbourne')).join(''));

// --- 2. en nu is Melbourne een sprintweekend ------------------------------
// De sprint sluit vóór de kwalificatie: de sprintkwalificatie ligt op vrijdag
// en de sprint zaterdagochtend, de gewone kwalificatie zaterdagmiddag. De
// deadlines in de nabootsing staan op +24 en +48 uur, dus de sprint op +12.
const uur = (h) => new Date(Date.now() + h * 3600e3).toISOString();
await page.evaluate((iso) => {
  const r = globalThis.__db.races.find((x) => x.name === 'Melbourne');
  r.deadline_sprint = iso;
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
}, uur(12));
await page.reload();
await page.waitForSelector('[data-race]');

await openRace('Melbourne');
check('een sprintweekend heeft er een derde tabblad bij',
  JSON.stringify(await tabs()) === JSON.stringify(['Sprint', 'Kwalificatie', 'Race']),
  (await tabs()).join(' | '));
check('en de sprint staat vooraan, want die is het eerst aan de beurt',
  (await tabs())[0] === 'Sprint', (await tabs()).join(' | '));

// De tab die openstaat is de sessie die als eerste sluit. Dat is op een
// sprintweekend de sprint en niet de kwalificatie, en daar hangt de hele
// "wat moet ik nu doen"-kant van het beginscherm aan.
check('de sprint staat open als eerstvolgende sessie',
  (await page.getAttribute('.tabs button[data-tab="sprint"]', 'aria-selected')) === 'true',
  await page.$$eval('.tabs button', (n) =>
    n.map((b) => `${b.dataset.tab}=${b.getAttribute('aria-selected')}`).join(' ')));

// --- 5. invullen op de sprint-tab -----------------------------------------
check('de sprint-tab vraagt gewoon om een top 10',
  (await page.$('.grid10')) !== null,
  'er staat geen top 10 op de sprint-tab');

await kiesTien(page);
check('tien plekken invullen kan', (await tekst('.topkop .mono')) === '10/10',
  await tekst('.topkop .mono'));
await page.click('#opslaan');
await page.waitForFunction(() => !document.querySelector('#opslaan')?.disabled);

const bewaard = await page.evaluate(() => globalThis.__db.answers
  .filter((a) => a.question_id === 'sprint_top10'));
check('en komt als sprint_top10 in de database terecht',
  bewaard.length === 1 && bewaard[0].waarde.length === 10,
  JSON.stringify(bewaard.map((a) => a.question_id)));

// De andere twee tabs zijn hier niet door aangeraakt: een sprint opslaan mag
// geen lege kwalificatie wegschrijven.
const anders = await page.evaluate(() => globalThis.__db.answers
  .filter((a) => a.question_id !== 'sprint_top10').map((a) => a.question_id));
check('en raakt de kwalificatie en de race niet aan',
  anders.length === 0, anders.join(', ') || 'geen');

// --- 3 en 4. de punten -----------------------------------------------------
// Een uitslag op alle drie de sessies, en dezelfde voorspelling voor alle
// drie. Dan is het verschil tussen de sessies alleen nog de weging.
await page.evaluate(() => {
  const db = globalThis.__db;
  const r = db.races.find((x) => x.name === 'Melbourne');
  const top = r.drivers.slice(0, 10).map((d) => d.nr);
  const uit = r.drivers.map((d) => d.nr);
  r.quali_result = uit; r.race_result = uit; r.sprint_result = uit;
  db.answers = db.answers.filter((a) => String(a.race_id) !== String(r.id));
  for (const q of ['quali_top10', 'race_top10', 'sprint_top10']) {
    db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: 'lid-1',
                      question_id: q, waarde: top });
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('[data-race]');

// Een perfecte top 10 is 50 punten. De sprint hoort daar de helft van te
// scoren, dus 25 — niet omdat de vraag 25 punten waard is, maar omdat de
// lijstscore door de weging gaat.
const perSessie = async () => {
  const uit = {};
  for (const w of ['sprint', 'quali', 'race']) {
    await page.click(`.tabs button[data-tab="${w}"]`);
    await page.waitForSelector('#paneel');
    uit[w] = Number((await tekst('.score .getal')).replace(/\D/g, ''));
  }
  return uit;
};
await openRace('Melbourne');
const punten = await perSessie();
check('een perfecte kwalificatie en race leveren allebei 50 punten',
  punten.quali === 50 && punten.race === 50, JSON.stringify(punten));
check('dezelfde perfecte lijst levert op de sprint de helft op',
  punten.sprint === 25, JSON.stringify(punten));
await terug();

// De weekendscore is de som van de sessies die dít weekend bestaan.
const weekend = async (naam) =>
  Number((await tekst(`${rij(naam)} .st`)).match(/(\d+) ptn/)?.[1] ?? -1);
check('de weekendscore telt de sprint mee: 50 + 50 + 25',
  (await weekend('Melbourne')) === 125, String(await weekend('Melbourne')));
check('en de kalender toont nu drie merktekens: S, Q en R',
  JSON.stringify(await merktekens('Melbourne')) === JSON.stringify(['S', 'Q', 'R']),
  (await merktekens('Melbourne')).join(''));

// Hetzelfde weekend zonder sprint hoort gewoon 100 te zijn, en niet 100 met
// een nul erbij uit een sessie die er niet was.
await page.evaluate(() => {
  const db = globalThis.__db;
  const r = db.races.find((x) => x.name === 'Melbourne');
  r.deadline_sprint = null; r.sprint_result = null;
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('[data-race]');
check('zonder sprint telt dezelfde uitslag gewoon voor 100',
  (await weekend('Melbourne')) === 100, String(await weekend('Melbourne')));
check('en de sprint-tab is weer verdwenen',
  (await page.$$eval(`${rij('Melbourne')} .mk i`, (n) => n.length)) === 2);

// --- 6. vóór 27 september slaat automatisch aanvullen de sprint over --------
// Automatisch invullen bestond eerst alleen om een gemist weekend niet je
// seizoen te laten kosten, en een sprint hoorde daar niet bij. Sinds 27
// september (ALLES_VANAF in de app) vult hij alles aan, ook de sprint; dat
// staat in test/automatisch-invullen.test.mjs. Weekenden van daarvoor houden
// wat ze hadden. Daarom hier vaste data vóór die streep, en niet "zoveel uur
// geleden": dat laatste zou over een paar dagen vanzelf na de streep vallen.
await page.evaluate(() => {
  const db = globalThis.__db;
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
  const anders  = ['4', '1', '63', '16', '44', '81', '14', '12', '18', '10', '43', '6'];
  const drivers = db.races[0].drivers;
  // Twee gereden weekenden ervoor, met een uitslag.
  Object.assign(db.races[0], { deadline_quali: '2026-09-05T12:00:00Z', deadline_race: '2026-09-06T12:00:00Z',
    deadline_sprint: null, sprint_result: null,
    quali_result: uitslag, race_result: uitslag });
  Object.assign(db.races[1], { deadline_quali: '2026-09-12T12:00:00Z', deadline_race: '2026-09-13T12:00:00Z',
    quali_result: uitslag, race_result: uitslag });
  // En dan Suzuka als sprintweekend dat Danny helemaal gemist heeft, op 26
  // september: na de overstap naar willekeurig, vóór ALLES_VANAF.
  Object.assign(db.races[2], { drivers,
    deadline_sprint: '2026-09-26T02:00:00Z', deadline_quali: '2026-09-26T04:00:00Z',
    deadline_race: '2026-09-26T06:00:00Z',
    sprint_result: anders, quali_result: anders, race_result: anders });
  db.answers = db.answers.filter((a) => String(a.race_id) !== '3');
  db.pools[0].autofill_vanaf = '2026-09-01T00:00:00Z';
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('[data-race]');

await openRace('Suzuka');
const opTab = async (w) => {
  await page.click(`.tabs button[data-tab="${w}"]`);
  await page.waitForSelector('#paneel');
  return tekst('#paneel');
};
check('een gemiste kwalificatie wordt automatisch aangevuld',
  (await opTab('quali')).includes('automatisch ingevuld'),
  (await opTab('quali')).slice(0, 120));
check('een gemiste race ook',
  (await opTab('race')).includes('automatisch ingevuld'),
  (await opTab('race')).slice(0, 120));
check('maar de sprint niet: die blijft leeg',
  !(await opTab('sprint')).includes('automatisch ingevuld'),
  (await opTab('sprint')).slice(0, 120));
check('en zegt gewoon dat je niks inleverde',
  (await opTab('sprint')).includes('niks ingevuld'),
  (await opTab('sprint')).slice(0, 120));

// --- 8. een poule die de sprint niet speelt --------------------------------
// Klassiek: de twee top-tienen, de winnaar, de pole en de snelste ronde. Geen
// sprint, en ook geen losse vraag die aan de sprint hangt. Melbourne weer als
// sprintweekend dat nog moet komen.
await page.evaluate(({ sprint, quali, race }) => {
  const db = globalThis.__db;
  const r = db.races.find((x) => x.name === 'Melbourne');
  Object.assign(r, { deadline_sprint: sprint, deadline_quali: quali, deadline_race: race,
    sprint_result: null, quali_result: null, race_result: null });
  db.answers = db.answers.filter((a) => String(a.race_id) !== String(r.id));
  db.pool_questions = ['quali_top10', 'race_top10', 'winnaar', 'pole', 'snelste_ronde']
    .map((question_id) => ({ pool_id: 'pool-1', question_id }));
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, { sprint: uur(12), quali: uur(24), race: uur(48) });
await page.reload();
// Na het herladen staat Suzuka nog open; terug naar de lijst.
await page.waitForSelector('[data-weergave="races"]');
await terug();
check('zonder sprint in de vragenset: in de kalender alleen Q en R, ook op een sprintweekend',
  JSON.stringify(await merktekens('Melbourne')) === JSON.stringify(['Q', 'R']),
  (await merktekens('Melbourne')).join(''));
await openRace('Melbourne');
check('en op het racescherm geen sprint-tab, alleen de kwalificatie en de race',
  JSON.stringify(await tabs()) === JSON.stringify(['Kwalificatie', 'Race']), (await tabs()).join(' | '));
const deadline = (veld) => page.evaluate((v) => globalThis.__db.races.find((x) => x.name === 'Melbourne')[v], veld);
check('open staat de kwalificatie, met de top 10 om in te vullen en de teller naar de kwalificatie',
  (await page.getAttribute('.tabs button[data-tab="quali"]', 'aria-selected')) === 'true'
    && (await page.$('.grid10')) !== null
    && (await page.getAttribute('.detailkop [data-tot]', 'data-tot')) === await deadline('deadline_quali'),
  await page.$$eval('.tabs button', (n) => n.map((b) => `${b.dataset.tab}=${b.getAttribute('aria-selected')}`).join(' ')));
// Op het beginscherm: de grote teller hoort bij wat je nu kunt invullen.
await terug();
const heroTot = await page.getAttribute('.hero .klok[data-tot]', 'data-tot').catch(() => null);
check('en het beginscherm telt af naar de kwalificatie, niet naar de sprint',
  heroTot === await deadline('deadline_quali'), `${heroTot} · sprint ${await deadline('deadline_sprint')}`);

// Zet de poulebaas de sprint aan, dan is hij er weer.
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pool_questions.push({ pool_id: 'pool-1', question_id: 'sprint_top10' });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('[data-weergave="races"]');
await terug();
await openRace('Melbourne');
check('zet de poulebaas de sprint aan, dan is het sprint-tabblad er weer, vooraan',
  JSON.stringify(await tabs()) === JSON.stringify(['Sprint', 'Kwalificatie', 'Race']), (await tabs()).join(' | '));

// Een onthouden sprint-tab komt na het herladen niet terug als de poule de
// sprint niet meer speelt: dan opent de kwalificatie.
await page.click('.tabs button[data-tab="sprint"]');
const vragenset = async (ids) => {
  await page.evaluate((lijst) => {
    const db = globalThis.__db;
    db.pool_questions = lijst.map((question_id) => ({ pool_id: 'pool-1', question_id }));
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  }, ids);
  await page.reload();
  await page.waitForSelector('#paneel');
};
await vragenset(['quali_top10', 'race_top10']);
check('een onthouden sprint-tab komt niet terug in een poule zonder sprint: de kwalificatie staat open',
  JSON.stringify(await tabs()) === JSON.stringify(['Kwalificatie', 'Race'])
    && (await page.getAttribute('.tabs button[data-tab="quali"]', 'aria-selected')) === 'true',
  await page.$$eval('.tabs button', (n) => n.map((b) => `${b.dataset.tab}=${b.getAttribute('aria-selected')}`).join(' ')));

// Een losse vraag telt ook: zonder top 10 van de kwalificatie maar met de pole
// staat de kwalificatie er gewoon.
await vragenset(['race_top10', 'pole']);
check('een sessie met alleen een losse vraag (de pole) heeft wel een tabblad',
  JSON.stringify(await tabs()) === JSON.stringify(['Kwalificatie', 'Race']), (await tabs()).join(' | '));

// Speelt een poule op een weekend helemaal niets (alleen seizoensvragen), dan
// blijft het zoals het was, in plaats van een racescherm zonder tabbladen.
await vragenset(['kampioen']);
check('een poule met alleen seizoensvragen houdt alle tabbladen',
  JSON.stringify(await tabs()) === JSON.stringify(['Sprint', 'Kwalificatie', 'Race']), (await tabs()).join(' | '));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
