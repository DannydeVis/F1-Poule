// Een race op het hele scherm, en de uitslag als plaatje.
//
// Aanleiding: "Als ik nu op de vorige race druk met de uitslag, dan krijg ik
// een klein venster aan de zijkant. Het is natuurlijk mooier als die groot
// opent, bovenin dan een terug knop. Daarnaast is de deel knop lelijk, het
// kopiëren en plakken. Kunnen we daar niet een mooie afbeelding van maken?"
//
// Wat hier vastligt:
//   1. Op een breed scherm opent een race over de hele breedte (tot 880
//      pixels), met de pijl terug bovenin, en Escape brengt je terug.
//   2. Onder de uitslag staat "Deel de uitslag" in plaats van de kopieerknop.
//   3. Die knop maakt een plaatje van 1080 bij 1350 met de uitslag van de
//      hele poule, in de letters van de app, en het adres uit de adresbalk.
//   4. Past niet iedereen erop, dan sta jij er toch op, onderaan.
//   5. Delen gaat via het deelmenu van het toestel als dat bestanden aankan,
//      anders wordt het een download. Wegtikken is geen fout.
//   6. Escape, het kruisje en naast het venster tikken sluiten het venster,
//      en alleen het venster: de race eronder blijft open.
//   7. Op het scherm Stand deelt "Deel de stand" de hele seizoensstand op
//      dezelfde manier, met de koplopers en de pijltjes van de vorige race.
//
// Wat er op het plaatje staat wordt niet uit de pixels gelezen maar bij het
// tekenen zelf opgevangen: elke fillText() komt met zijn plek en lettertype
// in window.__getekend. Zo test dit de tekst en de volgorde, niet hoe een
// bepaalde versie van Chromium een letter rondt.

import { maakControle, startPagina, meedoen, openRace } from './hulp.mjs';

const { check, afronden } = maakControle('een race op het hele scherm, en de uitslag als plaatje');

const { page, jsFouten, stoppen } = await startPagina({
  voorafAan: (p) => p.addInitScript(() => {
    window.__getekend = [];
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t, x, y, ...rest) {
      window.__getekend.push({ t: String(t), x, y, font: this.font, uitlijnen: this.textAlign,
        breed: this.measureText(String(t)).width, geladen: document.fonts.check(this.font, String(t)) });
      return fillText.call(this, t, x, y, ...rest);
    };
    // Het klembord vangen in plaats van het echte te gebruiken: dat vraagt in
    // een testbrowser om toestemming, en het gaat hier om wat de app erop zet.
    window.__klembord = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (t) => { window.__klembord.push({ soort: 'tekst', t }); },
      write: async (items) => { window.__klembord.push({ soort: 'plaatje', types: items.flatMap(i => i.types) }); },
    } });
  }),
});
await page.setViewportSize({ width: 1366, height: 900 });
await meedoen(page);

// Twaalf medespelers plus Danny, en Melbourne en Shanghai allebei gereden.
// Zes hebben alles goed (100), zes hebben de eerste twee omgedraaid (92), en
// Danny zat overal vijf plekken naast (0). Dan staat hij onderaan, onder de
// rand van wat er op het plaatje past.
const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
const NAMEN = ['Michael', 'Łukasz', 'Kimberly', 'Sebastiaan', 'Fatima', 'Bram',
  'Lotte', 'Youssef', 'Anouk', 'Joey', 'Sanne', 'Tim'];
await page.evaluate(({ uit, namen }) => {
  const db = globalThis.__db;
  namen.forEach((naam, i) => db.pool_members.push(
    { member_id: `lid-${i + 2}`, pool_id: 'pool-1', display_name: naam, user_id: `iemand-${i}` }));
  const omgedraaid = [uit[1], uit[0], ...uit.slice(2)];
  const ernaast = [...uit.slice(5), ...uit.slice(0, 5)];
  for (const r of db.races.slice(0, 2)) {
    r.quali_result = uit; r.race_result = uit;
    r.deadline_quali = new Date(Date.now() - 6e6).toISOString();
    r.deadline_race = new Date(Date.now() - 5e6).toISOString();
    db.pool_members.forEach((m, j) => {
      const lijst = m.member_id === 'lid-1' ? ernaast : j <= 6 ? uit : omgedraaid;
      for (const v of ['quali_top10', 'race_top10'])
        db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: m.member_id, question_id: v, waarde: lijst });
    });
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, { uit: UIT, namen: NAMEN });
await page.reload();

// ---- 1. een race op het hele scherm -----------------------------------------
await openRace(page, 'Shanghai');
const breed = await page.evaluate(() => {
  const vak = (s) => document.querySelector(s)?.getBoundingClientRect();
  const zichtbaar = (s) => { const el = document.querySelector(s); return !!el && getComputedStyle(el).display !== 'none'; };
  return { links: zichtbaar('.kol.links'), terug: zichtbaar('#terug'),
           rechts: vak('.kol.rechts'), vlak: vak('.kolommen') };
});
check('op een breed scherm verdwijnt de racelijst als een race open staat',
  !breed.links, JSON.stringify(breed));
check('en krijgt de race de volle breedte, tot 880 pixels',
  Math.round(breed.rechts.width) === 880, `${Math.round(breed.rechts.width)}px`);
// In het midden van wat er naast de navigatie overblijft.
const [links, rechts] = [breed.rechts.left - breed.vlak.left, breed.vlak.right - breed.rechts.right];
check('in het midden van het scherm naast de navigatie', links > 40 && Math.abs(links - rechts) < 2,
  `${Math.round(links)} links, ${Math.round(rechts)} rechts`);
check('met de pijl terug bovenin', breed.terug);

await page.keyboard.press('Escape');
await page.waitForSelector('.kol.links [data-race]', { timeout: 3000 }).catch(() => {});
check('Escape brengt je terug naar de lijst',
  !(await page.$('#paneel')) || !(await page.isVisible('#paneel')));

// ---- 2. de knop -----------------------------------------------------------------
await openRace(page, 'Shanghai');
await page.waitForSelector('[data-deel]');
const knoppen = await page.$$eval('#paneel button', (n) => n.map((b) => b.textContent.trim()));
check('onder de uitslag staat "Deel de uitslag"',
  knoppen.includes('Deel de uitslag'), knoppen.join(' | '));
check('en niet meer de kopieerknop', !knoppen.some((t) => /groepsapp/i.test(t)), knoppen.join(' | '));

// Wat nog niet geladen is: de uitgebreide Latijnse letters, voor de Ł van
// Łukasz. Die staan in een apart bestand dat de browser pas ophaalt als er op
// het scherm zo'n letter in die letter staat -- en in de lijst met spelers
// staat Łukasz niet in Barlow Condensed. Zonder deze voorwaarde zou de
// controle op de letters hieronder niets bewijzen.
const vooraf = await page.evaluate(() => document.fonts.check('600 40px "Barlow Condensed"', 'Ł'));
check('(vooraf: de letter voor Ł is nog niet geladen)', !vooraf);

// ---- 3. het plaatje ------------------------------------------------------------------
await page.click('[data-deel]');
await page.waitForSelector('.deelvenster img');
await page.waitForTimeout(300);
const venster = await page.evaluate(async () => {
  const v = document.querySelector('.deelvenster');
  const img = v.querySelector('img');
  await img.decode();
  return { rol: v.getAttribute('role'), modaal: v.getAttribute('aria-modal'), label: v.getAttribute('aria-label'),
           b: img.naturalWidth, h: img.naturalHeight, alt: img.alt, src: img.src,
           inApp: !!document.querySelector('#app .deelvenster'), focus: document.activeElement?.textContent.trim() };
});
check('er opent een venster, als dialoog voor een schermlezer',
  venster.rol === 'dialog' && venster.modaal === 'true' && venster.label === 'Deel de uitslag', JSON.stringify(venster));
check('los van #app, zodat een nieuwe render hem niet weghaalt', !venster.inApp);
check('met een plaatje van 1080 bij 1350', venster.b === 1080 && venster.h === 1350, `${venster.b}×${venster.h}`);
check('dat een schermlezer kan voorlezen', venster.alt === 'Uitslag van Shanghai in Vrijdagmiddagpoule', venster.alt);

const getekend = await page.evaluate(() => window.__getekend);
const teksten = getekend.map((g) => g.t);
const host = await page.evaluate(() => location.host);
check('bovenaan de naam van de app en de race, groot',
  teksten.includes('PREDICT THE RACE') && getekend.some((g) => g.t === 'SHANGHAI' && /(700|bold) (\d+)px/.test(g.font)
    && Number(g.font.match(/(\d+)px/)[1]) >= 96),
  teksten.slice(0, 5).join(' | '));
check('met de ronde en het jaar', teksten.includes('RONDE 2 · 2026'), teksten.slice(0, 5).join(' | '));
check('en de naam van de poule', teksten.includes('UITSLAG POULE · VRIJDAGMIDDAGPOULE'));
check('onderaan het adres uit de adresbalk, geen vast domein', teksten.includes(host.toUpperCase()), host);
check('elke tekst in de letters van de app',
  getekend.every((g) => /Barlow Condensed|Space Mono/.test(g.font)), [...new Set(getekend.map((g) => g.font))].join(' | '));
{
  const lukasz = getekend.find((g) => g.t === 'Łukasz');
  check('en die letters waren geladen toen er getekend werd, ook de Ł',
    lukasz?.geladen === true && getekend.every((g) => g.geladen),
    JSON.stringify(getekend.filter((g) => !g.geladen).map((g) => [g.t, g.font])));
}

// De rijen: plek (links, x=94), naam, punten (rechts uitgelijnd op 1008).
const plekken = getekend.filter((g) => g.x === 94 && /^\d+$/.test(g.t)).map((g) => Number(g.t));
const punten = getekend.filter((g) => g.x === 1008 && g.uitlijnen === 'right' && /^\d+$/.test(g.t)).map((g) => Number(g.t));
check('de weekenduitslag staat van hoog naar laag',
  punten.length > 5 && punten.every((p, i) => i === 0 || p <= punten[i - 1]), punten.join(','));
check('(vooraf: er is een gelijke stand om naar te kijken)', new Set(punten).size < punten.length);
// De laatste rij is Danny, onder "en nog …": die telt hier niet mee.
check('gelijke punten, gelijke plek: 1, 1, …, 7, 7',
  plekken.length === punten.length
  && plekken.slice(0, -1).every((p, i) => p === punten.findIndex((q) => q === punten[i]) + 1),
  `${plekken.join(',')} bij ${punten.join(',')}`);

// ---- 4. jij staat erop, ook als je onderaan staat -------------------------------------
{
  const danny = getekend.findIndex((g) => g.t === 'Danny');
  const meer = getekend.find((g) => /^EN NOG \d+$/.test(g.t));
  const getoond = plekken.length;
  check('niet iedereen past: er staat "en nog …"', !!meer, teksten.filter((t) => /NOG/.test(t)).join());
  check('met het goede aantal', meer && Number(meer.t.match(/\d+/)[0]) === 13 - getoond,
    `${meer?.t}, ${getoond} rijen getoond van 13`);
  check('en Danny staat er toch op, onder die regel',
    danny > getekend.indexOf(meer) && getekend[danny + 1]?.t === 'JIJ', teksten.slice(-30).join(' | '));
  check('met zijn eigen plek: dertiende', plekken[plekken.length - 1] === 13, plekken.join(','));
}

// ---- de winnaar, en een naam die te lang is -------------------------------------------
{
  // Zes winnaars: dat past niet op één regel en wordt ingekort, zonder over
  // het getal ernaast te lopen.
  const naam = getekend.find((g) => g.t.startsWith('Bram, Fatima'));
  check('de weekendwinnaar staat erop, en zes namen worden ingekort',
    teksten.includes('WEEKENDWINNAAR') && naam?.t.endsWith('…'), naam?.t);
  check('zonder het getal te raken', naam && naam.x + naam.breed < 1008 - 36 - 140, JSON.stringify(naam));
}
check('eronder de stand van het seizoen', teksten.includes('STAND NA RONDE 2'));

// ---- 5. opslaan, of delen ------------------------------------------------------------
// Een testbrowser op een computer kan geen bestanden delen: dan is het Opslaan.
{
  const opslaan = await page.$('.deelvenster a[download]');
  check('zonder deelmenu is de hoofdknop Opslaan', !!opslaan && (await opslaan.textContent()).trim() === 'Opslaan');
  check('en had die de focus', venster.focus === 'Opslaan', venster.focus);
  const [download] = await Promise.all([page.waitForEvent('download'), opslaan.click()]);
  check('met een nette bestandsnaam', download.suggestedFilename() === 'predict-the-race-shanghai.png',
    download.suggestedFilename());
}

await page.click('.deelvenster [data-kopieer-plaatje]');
await page.click('.deelvenster [data-kopieer-tekst]');
await page.waitForFunction(() => window.__klembord.length >= 2);
{
  const klembord = await page.evaluate(() => window.__klembord);
  check('het plaatje kan ook naar het klembord, voor WhatsApp Web',
    klembord[0]?.soort === 'plaatje' && klembord[0].types.includes('image/png'), JSON.stringify(klembord[0]));
  check('en de tekst van vroeger kan nog steeds',
    klembord[1]?.soort === 'tekst' && klembord[1].t.startsWith('🏁 Shanghai, uitslag poule'), klembord[1]?.t.split('\n')[0]);
  check('ook daarin gelijke punten, gelijke plek', /\n1\. Fatima/.test(klembord[1]?.t ?? '')
    && /\n7\. Anouk/.test(klembord[1]?.t ?? ''), klembord[1]?.t.split('\n').slice(2, 4).join(' / '));
}

// ---- 6. sluiten -----------------------------------------------------------------------
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.querySelector('.deelvenster'));
check('Escape sluit het venster', true);
check('maar niet de race eronder', await page.isVisible('#paneel'));
check('en de focus gaat terug naar de knop',
  await page.evaluate(() => document.activeElement?.matches('[data-deel]')));
check('het plaatje is uit het geheugen gehaald',
  await page.evaluate((src) => fetch(src).then(() => false, () => true), venster.src));

// Nu met een toestel dat wél kan delen.
await page.evaluate(() => {
  window.__gedeeld = [];
  window.__deelAntwoord = 'ok';
  Object.defineProperty(navigator, 'canShare', { configurable: true,
    value: (d) => !!d?.files?.every((f) => f instanceof File) });
  Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => {
    window.__gedeeld.push({ n: d.files.length, naam: d.files[0].name, soort: d.files[0].type, grootte: d.files[0].size });
    if (window.__deelAntwoord !== 'ok') throw new DOMException('nee', window.__deelAntwoord);
  } });
});
await page.click('[data-deel]');
await page.waitForSelector('.deelvenster [data-delen]');
check('met een deelmenu is de hoofdknop Delen', (await page.textContent('.deelvenster [data-delen]')).trim() === 'Delen');
await page.click('.deelvenster [data-delen]');
await page.waitForFunction(() => window.__gedeeld.length === 1);
{
  const gedeeld = await page.evaluate(() => window.__gedeeld[0]);
  check('Delen geeft het plaatje als bestand aan het deelmenu',
    gedeeld.n === 1 && gedeeld.naam === 'predict-the-race-shanghai.png' && gedeeld.soort === 'image/png' && gedeeld.grootte > 20000,
    JSON.stringify(gedeeld));
}

// Wegtikken van het deelmenu: niets aan de hand, de knop blijft.
await page.evaluate(() => { window.__deelAntwoord = 'AbortError'; });
await page.click('.deelvenster [data-delen]');
await page.waitForFunction(() => window.__gedeeld.length === 2);
await page.waitForTimeout(100);
check('wegtikken laat de deelknop staan', !!(await page.$('.deelvenster [data-delen]')));

// Een echte fout: dan wordt het alsnog een download.
await page.evaluate(() => { window.__deelAntwoord = 'NotAllowedError'; });
await page.click('.deelvenster [data-delen]');
await page.waitForSelector('.deelvenster a[download]');
check('lukt delen niet, dan wordt het Opslaan', !(await page.$('.deelvenster [data-delen]')));

await page.click('.deelvenster', { position: { x: 5, y: 5 } });
await page.waitForFunction(() => !document.querySelector('.deelvenster'));
check('naast het venster tikken sluit het ook', await page.isVisible('#paneel'));
await page.click('[data-deel]');
await page.click('.deelvenster [data-sluit]');
await page.waitForFunction(() => !document.querySelector('.deelvenster'));
check('en het kruisje', true);

// ---- de stand van het seizoen ------------------------------------------------------------------
// Op het scherm Stand staat een eigen deelknop, voor de hele stand. Eerst
// iets om te laten zien: Tim had Shanghai helemaal goed en Bram zat er overal
// naast. Na Melbourne deelde Tim de zevende plek en Bram de eerste; nu is Tim
// alleen zesde (▲1) en zakt Bram naar twaalf (▼11).
await page.evaluate((uit) => {
  const db = globalThis.__db;
  const lid = (naam) => db.pool_members.find((m) => m.display_name === naam).member_id;
  const ernaast = [...uit.slice(5), ...uit.slice(0, 5)];
  for (const a of db.answers) {
    if (String(a.race_id) !== '2') continue;
    if (a.member_id === lid('Tim')) a.waarde = uit;
    if (a.member_id === lid('Bram')) a.waarde = ernaast;
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, UIT);
await page.reload();
await page.click('[data-weergave="stand"]');
await page.waitForSelector('[data-deel-stand]', { timeout: 5000 }).catch(() => {});
check('op het scherm Stand staat "Deel de stand"',
  (await page.textContent('[data-deel-stand]').catch(() => '')).trim() === 'Deel de stand');
await page.evaluate(() => { window.__getekend = []; window.__klembord = []; });
await page.click('[data-deel-stand]');
await page.waitForSelector('.deelvenster img');
{
  const v = await page.evaluate(async () => {
    const img = document.querySelector('.deelvenster img');
    await img.decode();
    return { label: document.querySelector('.deelvenster').getAttribute('aria-label'),
             b: img.naturalWidth, h: img.naturalHeight, alt: img.alt,
             naam: document.querySelector('.deelvenster a[download]')?.getAttribute('download') };
  });
  check('die opent hetzelfde venster, met een plaatje van 1080 bij 1350',
    v.label === 'Deel de stand' && v.b === 1080 && v.h === 1350, JSON.stringify(v));
  check('met een eigen omschrijving en bestandsnaam',
    v.alt === 'Stand van Vrijdagmiddagpoule na 2 races' && v.naam === 'predict-the-race-stand-vrijdagmiddagpoule.png',
    `${v.alt} / ${v.naam}`);
  const g = await page.evaluate(() => window.__getekend);
  const t = g.map((x) => x.t);
  check('bovenaan het seizoen, de poule groot, en na hoeveel races',
    t.includes('STAND · SEIZOEN 2026') && t.includes('VRIJDAGMIDDAGPOULE') && t.includes('NA 2 VAN DE 3 RACES'),
    t.slice(0, 5).join(' | '));
  const kop = g.find((x) => x.t.startsWith('Fatima, Kimberly'));
  check('met de koplopers, ingekort als het er vijf zijn', t.includes('KOPLOPER') && kop?.t.endsWith('…'), kop?.t);
  const punten = g.filter((x) => x.x === 1008 && x.uitlijnen === 'right' && /^\d+$/.test(x.t)).map((x) => Number(x.t));
  check('de lijst is de stand van het seizoen, Tim als zesde',
    punten.slice(0, 7).join() === '200,200,200,200,200,192,184', punten.join(','));
  const pijlen = t.filter((x) => /^[▲▼]\d+$/.test(x));
  check('met wie er sinds de vorige race geklommen of gezakt is, in gedeelde plekken',
    pijlen.includes('▲1') && pijlen.includes('▼11') && pijlen.length === 2, pijlen.join(' '));
  const danny = t.indexOf('Danny');
  check('en jij staat erop, ook onderaan', danny > -1 && t[danny + 1] === 'JIJ', t.slice(-12).join(' | '));
}
await page.click('.deelvenster [data-kopieer-tekst]');
await page.waitForFunction(() => window.__klembord.length >= 1);
{
  const tekst = (await page.evaluate(() => window.__klembord[0]?.t)) ?? '';
  check('de stand kan ook als tekst', tekst.startsWith('🏆 Vrijdagmiddagpoule, na 2 van de 3 races')
    && /\n6\. Tim\s+192/.test(tekst) && /\n7\. Anouk\s+184\n7\. Joey/.test(tekst),
    tekst.split('\n').slice(0, 3).join(' / '));
}
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.querySelector('.deelvenster'));

// ---- een ouder weekend ------------------------------------------------------------------------
// Melbourne was de eerste race. Het plaatje daarvan hoort de stand van toen te
// tonen, en die was er nog niet: na één race is dat dezelfde lijst nog eens.
// Niet de stand van nu (na Shanghai) onder de kop "stand na ronde 1".
await page.click('[data-weergave="races"]');
await openRace(page, 'Melbourne');
await page.evaluate(() => { window.__getekend = []; });
await page.click('[data-deel]');
await page.waitForSelector('.deelvenster img');
{
  const t = await page.evaluate(() => window.__getekend.map((g) => g.t));
  check('het plaatje van een ouder weekend toont niet de stand van nu',
    t.includes('MELBOURNE') && !t.some((x) => x.startsWith('STAND NA')), t.filter((x) => /STAND/.test(x)).join());
}
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.querySelector('.deelvenster'));

// ---- alleen de kwalificatie, en alleen jij ---------------------------------------------------
await page.keyboard.press('Escape');
await page.waitForSelector('.kol.links [data-race]');
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pool_members = db.pool_members.filter((m) => m.member_id === 'lid-1');
  db.races[1].race_result = null;
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await openRace(page, 'Shanghai');
await page.evaluate(() => { window.__getekend = []; });
await page.click('[data-deel]');
await page.waitForSelector('.deelvenster img');
{
  const t = await page.evaluate(() => window.__getekend.map((g) => g.t));
  check('na alleen de kwalificatie heet het een tussenstand',
    t.includes('TUSSENSTAND · NA DE KWALIFICATIE · VRIJDAGMIDDAGPOULE'), t.slice(0, 6).join(' | '));
  check('en in je eentje is er geen weekendwinnaar', !t.includes('WEEKENDWINNAAR'));
}

check('geen JavaScript-fouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
