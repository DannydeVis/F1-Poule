// Een deelplaatje voor een WhatsApp-status (of Instagram-story).
//
// Aanleiding: "Maak een leuk deelplaatje voor whatsapp story".
//
// Het plaatje voor de groepsapp (4:5, de hele poule in een lijst) staat in
// uitslag-delen.test.mjs. Een story is staand (9:16) en gaat over jou.
//
// Wat hier vastligt:
//   1. In het deelvenster kies je tussen Bericht en Story; Bericht is de
//      eerste keer de keuze, daarna onthoudt de app wat je koos.
//   2. De story is 1080 bij 1920, met een eigen naam (…-story.png), en gaat
//      net zo via Delen of Opslaan.
//   3. Het weekend: jouw punten groot, met de joker erbij, of je het weekend
//      won, je plek, hoeveel je precies goed had, je plek in het seizoen, en
//      een podium van de eerste drie.
//   4. De stand: jouw plek groot, of je steeg, je punten en een podium.
//   5. Alle tekst staat binnen de veilige zone (WhatsApp legt bovenin je naam
//      en onderin het antwoordveld over een story), en geen tekst raakt een
//      andere, ook niet met een racenaam over twee regels.
//   6. Wie alleen speelt krijgt geen podium maar wat hij precies goed had;
//      halverwege het weekend staat er "tussenstand".
//
// Net als in uitslag-delen.test.mjs wordt de tekst bij het tekenen opgevangen
// (window.__getekend), niet uit de pixels gelezen.

import { maakControle, startPagina, meedoen, openRace } from './hulp.mjs';

const { check, afronden } = maakControle('een deelplaatje voor een story');
const VEILIG = { boven: 250, onder: 1680 };

const vangTekst = (p) => p.addInitScript(() => {
  window.__getekend = [];
  const fillText = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (t, x, y, ...rest) {
    const maat = Number(String(this.font).match(/(\d+)px/)?.[1] ?? 0);
    window.__getekend.push({ t: String(t), x, y, maat, font: this.font, uitlijnen: this.textAlign,
      breed: this.measureText(String(t)).width, doek: this.canvas.height });
    return fillText.call(this, t, x, y, ...rest);
  };
});
const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];

// Wat er op het laatst getekende storydoek (1920 hoog) staat.
const story = (page) => page.evaluate(() => window.__getekend.filter((g) => g.doek === 1920));
// Binnen de veilige zone, en geen twee teksten over elkaar. Het grote vage
// rondenummer op de achtergrond (760px) is versiering en telt niet mee.
function nagaan(getekend) {
  const tekst = getekend.filter((g) => g.maat < 700);
  const buiten = tekst.filter((g) => g.y - g.maat * 0.75 < VEILIG.boven || g.y > VEILIG.onder);
  const vak = (g) => {
    const links = g.uitlijnen === 'right' ? g.x - g.breed : g.uitlijnen === 'center' ? g.x - g.breed / 2 : g.x;
    return { l: links, r: links + g.breed, o: g.y - g.maat * 0.72, b: g.y + g.maat * 0.12 };
  };
  const botsen = [];
  for (let i = 0; i < tekst.length; i++) {
    for (let j = i + 1; j < tekst.length; j++) {
      const a = vak(tekst[i]), b = vak(tekst[j]);
      if (a.l < b.r && b.l < a.r && a.o < b.b && b.o < a.b) botsen.push(`${tekst[i].t} × ${tekst[j].t}`);
    }
  }
  return { buiten: buiten.map((g) => `${g.t}@${Math.round(g.y)}`), botsen };
}
const venster = (page) => page.evaluate(async () => {
  const img = document.querySelector('.deelvenster .deelbeeld');
  await img?.decode().catch(() => {});
  return { b: img?.naturalWidth, h: img?.naturalHeight, alt: img?.alt,
    vorm: document.querySelector('.deelvenster [data-vorm][aria-pressed="true"]')?.dataset.vorm ?? null,
    uitleg: document.querySelector('.deelvenster .deeluitleg')?.textContent.trim(),
    download: document.querySelector('.deelvenster a[download]')?.getAttribute('download') ?? null };
});
// Staat hij al op Story (onthouden), dan is de story al getekend bij het openen.
const kiesStory = async (page) => {
  if (await page.$('.deelvenster [data-vorm="story"][aria-pressed="true"]')) return;
  await page.evaluate(() => { window.__getekend = []; });
  await page.click('.deelvenster [data-vorm="story"]');
  await page.waitForFunction(() => document.querySelector('.deelvenster .deelbeeld')?.naturalHeight === 1920,
    null, { timeout: 5000 }).catch(() => {});
};

// ---- een poule van vier, Baku gereden, Danny wint met zijn joker ------------
const { page, jsFouten, stoppen } = await startPagina({ voorafAan: vangTekst });
await page.setViewportSize({ width: 390, height: 844 });
await meedoen(page);
await page.evaluate((uit) => {
  const db = globalThis.__db;
  const om = [uit[1], uit[0], ...uit.slice(2)];
  const ernaast = [...uit.slice(3), ...uit.slice(0, 3)];
  [['lid-2', 'Michael'], ['lid-3', 'Joe'], ['lid-4', 'Pipo']].forEach(([id, naam]) =>
    db.pool_members.push({ member_id: id, pool_id: 'pool-1', display_name: naam, user_id: null }));
  db.races[1].name = 'Baku';
  for (const r of db.races.slice(0, 2)) {
    Object.assign(r, { quali_result: uit, race_result: uit,
      deadline_quali: new Date(Date.now() - 6e6).toISOString(), deadline_race: new Date(Date.now() - 5e6).toISOString() });
  }
  // Melbourne: Danny ernaast, de rest wisselend. Baku: Danny alles goed.
  const lijst = { 'lid-1': uit, 'lid-2': om, 'lid-3': ernaast, 'lid-4': om };
  for (const r of db.races.slice(0, 2)) {
    for (const [lid, l] of Object.entries(lijst)) {
      for (const v of ['quali_top10', 'race_top10']) {
        db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: lid, question_id: v,
          waarde: r.round === 1 && lid === 'lid-1' ? ernaast : l });
      }
    }
  }
  db.pools[0].jokers_vanaf = new Date(Date.now() - 9e9).toISOString();
  db.jokers.push({ pool_id: 'pool-1', race_id: db.races[1].id, member_id: 'lid-1' });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, UIT);
await page.reload();
await openRace(page, 'Baku');
await page.click('[data-deel]');
await page.waitForSelector('.deelvenster .deelbeeld');

// ---- 1. de keuze -------------------------------------------------------------------
{
  const v = await venster(page);
  check('in het deelvenster staat de keuze Bericht of Story, de eerste keer op Bericht',
    v.vorm === 'bericht' && (await page.$$('.deelvenster [data-vorm]')).length === 2, JSON.stringify(v));
  check('met het plaatje voor de groepsapp: 1080 bij 1350', v.b === 1080 && v.h === 1350, `${v.b}×${v.h}`);
}
await kiesStory(page);

// ---- 2. de story ----------------------------------------------------------------------
{
  const v = await venster(page);
  check('Story geeft een staand plaatje van 1080 bij 1920', v.b === 1080 && v.h === 1920, `${v.b}×${v.h}`);
  check('met uitleg waarvoor', v.vorm === 'story' && /WhatsApp-status/.test(v.uitleg ?? ''), v.uitleg);
  check('dat een schermlezer kan voorlezen', v.alt === 'Jouw weekend in Baku: 200 punten', v.alt);
  check('en een eigen bestandsnaam', v.download === 'predict-the-race-baku-story.png', v.download);
}

// ---- 3. wat erop staat ------------------------------------------------------------------
{
  const g = await story(page);
  const t = g.map((x) => x.t);
  const host = (await page.evaluate(() => location.host)).toUpperCase();
  check('bovenaan de app, de ronde en de race, groot',
    t.includes('PREDICT THE RACE') && t.includes('RONDE 2 · 2026') && g.some((x) => x.t === 'BAKU' && x.maat >= 120),
    t.slice(0, 6).join(' | '));
  check('jouw punten, heel groot: 100 × 2 met de joker = 200',
    g.some((x) => x.t === '200' && x.maat >= 250) && t.includes('JOUW WEEKEND') && t.includes('PTN'),
    JSON.stringify(g.filter((x) => x.maat >= 200).map((x) => [x.t, x.maat])));
  check('met de joker erbij', t.includes('2× JOKER'), t.join(' | '));
  check('en dat je het weekend won', t.includes('JIJ WINT HET WEEKEND'), t.join(' | '));
  check('je plek (1e van 4), hoeveel precies goed (20) en je plek in het seizoen',
    t.includes('1e') && t.includes('VAN 4') && t.includes('20') && t.includes('PRECIES GOED') && t.includes('IN HET SEIZOEN'),
    t.join(' | '));
  const podium = ['Danny', 'Michael', 'Pipo'].every((n) => t.includes(n));
  check('een podium met de eerste drie, en de vierde niet', podium && !t.includes('Joe'), t.join(' | '));
  {
    const naam = (n) => g.find((x) => x.t === n);
    const [danny, michael, pipo] = ['Danny', 'Michael', 'Pipo'].map(naam);
    check('de winnaar staat in het midden en het hoogst, tweede links, derde rechts',
      danny?.x === 540 && michael?.x < 540 && pipo?.x > 540 && danny.y < michael.y && michael.y < pipo.y,
      JSON.stringify([danny, michael, pipo].map((x) => x && [x.t, Math.round(x.x), Math.round(x.y)])));
  }
  check('onderaan waar je meedoet, met het adres uit de adresbalk',
    t.includes(`VOORSPEL MEE OP ${host}`), t.filter((x) => /VOORSPEL/.test(x)).join());
  const { buiten, botsen } = nagaan(g);
  check('alle tekst binnen de veilige zone van een story', buiten.length === 0, buiten.join(' | '));
  check('en geen tekst raakt een andere', botsen.length === 0, botsen.join(' | '));
}

// ---- delen en opslaan ------------------------------------------------------------------
{
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('.deelvenster a[download]')]);
  check('Opslaan bewaart de story met die naam', download.suggestedFilename() === 'predict-the-race-baku-story.png',
    download.suggestedFilename());
}
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.querySelector('.deelvenster'));
await page.evaluate(() => {
  window.__gedeeld = [];
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: (d) => !!d?.files?.length });
  Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => {
    const f = d.files[0];
    const beeld = await createImageBitmap(f);
    window.__gedeeld.push({ naam: f.name, soort: f.type, b: beeld.width, h: beeld.height });
  } });
});
await page.click('[data-deel]');
await page.waitForSelector('.deelvenster [data-delen]');
{
  const v = await venster(page);
  check('de volgende keer staat hij meteen op Story', v.vorm === 'story' && v.h === 1920, JSON.stringify(v));
}
await page.click('.deelvenster [data-delen]');
await page.waitForFunction(() => window.__gedeeld.length === 1, null, { timeout: 5000 }).catch(() => {});
{
  const gedeeld = await page.evaluate(() => window.__gedeeld[0]);
  check('Delen geeft de story aan het deelmenu, als png van 1080 bij 1920',
    gedeeld?.naam === 'predict-the-race-baku-story.png' && gedeeld.soort === 'image/png'
      && gedeeld.b === 1080 && gedeeld.h === 1920, JSON.stringify(gedeeld));
}
await page.click('.deelvenster [data-vorm="bericht"]');
await page.waitForFunction(() => document.querySelector('.deelvenster .deelbeeld')?.naturalHeight === 1350,
  null, { timeout: 5000 }).catch(() => {});
await page.click('.deelvenster [data-delen]');
await page.waitForFunction(() => window.__gedeeld.length === 2, null, { timeout: 5000 }).catch(() => {});
{
  const gedeeld = await page.evaluate(() => window.__gedeeld[1]);
  check('terug naar Bericht deelt weer het gewone plaatje',
    gedeeld?.naam === 'predict-the-race-baku.png' && gedeeld.h === 1350
      && (await page.evaluate(() => localStorage.getItem('poule:deelvorm'))) === 'bericht', JSON.stringify(gedeeld));
}
await page.keyboard.press('Escape');

// ---- 4. de stand ---------------------------------------------------------------------------
await page.click('#terug').catch(() => {});
await page.click('[data-weergave="stand"]');
await page.evaluate(() => { window.__getekend = []; });
await page.click('[data-deel-stand]');
await page.waitForSelector('.deelvenster [data-vorm="story"]');
await kiesStory(page);
{
  const v = await venster(page);
  const g = await story(page);
  const t = g.map((x) => x.t);
  check('ook de stand kan als story', v.h === 1920 && v.alt === 'Jouw plek in Vrijdagmiddagpoule: 1e van 4', JSON.stringify(v));
  check('met jouw plek groot, en uit hoeveel',
    t.includes('JOUW PLEK') && g.some((x) => x.t === '1e' && x.maat >= 250) && t.includes('VAN 4'), t.join(' | '));
  check('hoeveel plekken je steeg', t.some((x) => /^▲\d+$/.test(x)), t.join(' | '));
  check('je punten en een podium',
    t.includes('PUNTEN') && ['Danny', 'Michael', 'Pipo'].every((n) => t.includes(n)), t.join(' | '));
  check('en de naam van de poule als kop', t.includes('VRIJDAGMIDDAGPOULE'), t.join(' | '));
  const { buiten, botsen } = nagaan(g);
  check('ook hier binnen de veilige zone en zonder botsingen', !buiten.length && !botsen.length,
    [...buiten, ...botsen].join(' | '));
}
await page.keyboard.press('Escape');

// ---- 5. een lange racenaam, over twee regels ---------------------------------------------
await page.evaluate(() => {
  const db = globalThis.__db;
  db.races[1].name = 'Gran Premio del Made in Italy e dell Emilia Romagna';
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.click('[data-weergave="races"]');
await openRace(page, 'Gran Premio del Made in Italy e dell Emilia Romagna');
await page.evaluate(() => { window.__getekend = []; });
await page.click('[data-deel]');
await page.waitForSelector('.deelvenster [data-vorm="story"]');
await kiesStory(page);
{
  const g = await story(page);
  const kop = g.filter((x) => x.maat >= 96 && x.maat <= 150 && x.y < 900);
  const getal = g.find((x) => x.t === '200');
  const { buiten, botsen } = nagaan(g);
  check('een lange racenaam gaat over twee regels', kop.length === 2, kop.map((x) => x.t).join(' / '));
  check('en het getal krimpt mee, zodat er niets botst en alles binnen de zone blijft',
    !!getal && getal.maat < 330 && !buiten.length && !botsen.length,
    `${getal?.maat}px · ${[...buiten, ...botsen].join(' | ')}`);
}
check('geen JavaScript-fouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();

// ---- 6. alleen spelen, en halverwege het weekend -----------------------------------------
{
  const { page: p, jsFouten: fouten, stoppen: stop } = await startPagina({ voorafAan: vangTekst });
  await p.setViewportSize({ width: 390, height: 844 });
  await meedoen(p);
  await p.evaluate((uit) => {
    const db = globalThis.__db;
    const drie = [uit[0], uit[1], uit[2], ...uit.slice(4), uit[3]];
    Object.assign(db.races[0], { quali_result: uit, race_result: null,
      deadline_quali: new Date(Date.now() - 6e6).toISOString(), deadline_race: new Date(Date.now() + 5e6).toISOString() });
    db.answers.push({ pool_id: 'pool-1', race_id: db.races[0].id, member_id: 'lid-1', question_id: 'quali_top10', waarde: drie });
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  }, UIT);
  await p.reload();
  await openRace(p, 'Melbourne');
  await p.click('[data-tab="quali"]').catch(() => {});
  await p.click('[data-deel]');
  await p.waitForSelector('.deelvenster [data-vorm="story"]');
  await kiesStory(p);
  const g = await story(p);
  const t = g.map((x) => x.t);
  check('halverwege het weekend staat er "tussenstand"', t.includes('TUSSENSTAND · NA DE KWALIFICATIE'), t.join(' | '));
  check('wie alleen speelt krijgt geen plek "van 1" en geen podium', !t.includes('VAN 1') && !t.includes('IN HET SEIZOEN'),
    t.join(' | '));
  check('maar wel wat hij precies goed had, per coureur',
    t.includes('PRECIES GOED') && ['VER', 'NOR', 'LEC'].every((c) => t.includes(c)) && t.includes('P1'), t.join(' | '));
  const { buiten, botsen } = nagaan(g);
  check('ook dan binnen de zone en zonder botsingen', !buiten.length && !botsen.length, [...buiten, ...botsen].join(' | '));
  check('geen JavaScript-fouten (alleen)', fouten.length === 0, fouten.join(' | '));
  await stop();
}

process.exit(afronden() ? 0 : 1);
