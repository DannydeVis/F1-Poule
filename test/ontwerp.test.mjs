// Het ontwerp: één vorm voor elke banner, lijsten als één kaart, en beweging
// alleen bij iets nieuws.
//
// Aanleiding: "Alles moet clean zijn. Mooie overgangen en duidelijke tekst.
// Nu is overal de tekst aangepast maar niet de banners." Er stonden vijf
// soorten meldingen op het scherm met elk een eigen jasje (een groen vlak, een
// geel vlak, een stippelrand, een grijs blok, een wit blok), elke rij in een
// lijst was een los kaartje met achttien pixels lucht eromheen, en de hele
// startgrid reed na elke gekozen coureur opnieuw binnen.
//
// Geen schermafdrukken: die zakken bij elke letterwijziging. Wat hier gemeten
// wordt zijn de eigenschappen die de indruk maken: welk soort rand, welke
// hoek, hoeveel ruimte tussen twee regels, en welke elementen er op dit
// moment echt bewegen (getAnimations(), dus wat de browser afspeelt, niet
// welke klasse er toevallig op staat).

import { maakControle, startPagina, meedoen, openRace } from './hulp.mjs';

const { check, afronden } = maakControle('ontwerp: banners, lijsten en overgangen');

// Hoeveel animaties er nu lopen op één element (zonder wat erin zit).
const beweegt = (page, sel) => page.$eval(sel, (el) =>
  el.getAnimations().filter((a) => a.playState === 'running').length);

// ---- 1. overgangen ---------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await page.setViewportSize({ width: 1280, height: 860 });
  await meedoen(page);
  await page.waitForTimeout(500);

  // Alles in één evaluate: klikken en meteen kijken, zodat een trage
  // testmachine niet het verschil maakt tussen "loopt nog" en "al klaar".
  const wissel = await page.evaluate(async () => {
    document.querySelector('[data-weergave="stand"]').click();
    await new Promise((r) => setTimeout(r, 30));
    return document.querySelector('.kol.links').getAnimations().length;
  });
  check('een ander scherm komt op', wissel > 0, `${wissel} animaties`);

  await page.waitForTimeout(500);
  const zelfde = await page.evaluate(async () => {
    const oud = document.querySelector('.kol.links');
    document.querySelector('[data-weergave="stand"]').click();
    await new Promise((r) => setTimeout(r, 30));
    const nu = document.querySelector('.kol.links');
    return { opnieuw: nu !== oud, bewegend: nu.getAnimations().length };
  });
  // Eerst vaststellen dat er echt opnieuw getekend is; anders bewijst "er
  // beweegt niets" alleen dat er niets gebeurd is.
  check('op hetzelfde scherm tikken tekent het wel opnieuw', zelfde.opnieuw);
  check('maar laat het niet nog eens opkomen', zelfde.bewegend === 0,
    `${zelfde.bewegend} animaties`);

  // De startgrid: alleen de plek die je net vulde rijdt binnen.
  await page.click('[data-weergave="races"]');
  await openRace(page, 'Melbourne');
  await page.waitForTimeout(500);
  const kies = (plek) => page.evaluate(async (plek) => {
    document.querySelector(`.slot[data-plek="${plek}"]`).click();
    document.querySelector('#kiesblad .kiesknop:not([disabled])').click();
    await new Promise((r) => setTimeout(r, 30));
    const bezig = (el) => el.getAnimations().filter((a) => a.playState === 'running').length;
    return [...document.querySelectorAll('.slot.vol')]
      .map((el) => `P${Number(el.dataset.plek) + 1}:${bezig(el)}`).join(' ');
  }, plek);
  const eerste = await kies(0);
  check('de plek die je net vulde rijdt binnen', eerste === 'P1:1', eerste);
  await page.waitForTimeout(500);
  const tweede = await kies(1);
  check('bij de volgende keuze alleen die nieuwe plek, niet de hele grid opnieuw',
    tweede === 'P1:0 P2:1', tweede);

  // Een melding komt op. De bewaarknop wacht op de database, dus hier kijkt
  // de pagina zelf elk beeld of hij er is, en meet dan meteen.
  await page.click('[data-weergave="poule"]');
  await page.fill('#pouleomschrijving', 'Om de eer');
  const melding = await page.evaluate(async () => {
    document.querySelector('#omschrijvingBewaren').click();
    for (let i = 0; i < 200; i++) {
      const m = document.querySelector('.melding');
      if (m) return m.getAnimations().length;
      await new Promise((r) => requestAnimationFrame(r));
    }
    return -1;
  });
  check('een nieuwe melding komt op', melding > 0,
    melding < 0 ? 'geen melding verschenen' : `${melding} animaties`);

  // Hoveren schuift niets meer opzij.
  await page.click('[data-weergave="races"]');
  await page.waitForTimeout(400);
  await page.hover('[data-race]');
  await page.waitForTimeout(250);
  check('een regel onder de muis blijft staan waar hij staat',
    (await page.$eval('[data-race]', (el) => getComputedStyle(el).transform)) === 'none');

  check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 2. wie liever geen beweging heeft -------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 860 });
  await meedoen(page);
  const lopend = await page.evaluate(async () => {
    document.querySelector('[data-weergave="stand"]').click();
    await new Promise((r) => setTimeout(r, 30));
    return document.getAnimations().filter((a) => a.playState === 'running').length;
  });
  check('met "minder beweging" komt een scherm er gewoon te staan', lopend === 0,
    `${lopend} animaties`);
  check('geen javascriptfouten (minder beweging)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 3. banners en lijsten --------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await page.setViewportSize({ width: 1280, height: 860 });
  await meedoen(page);
  // Een gereden race met een uitslag (voor "zo dichtbij" en de uitslagstrip),
  // een tweede speler, en een race waarvan de inzending dicht is maar de
  // uitslag er nog niet is (voor de lege staat "gesloten").
  await page.evaluate(() => {
    const db = globalThis.__db;
    const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
    const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
    Object.assign(db.races[0], { deadline_quali: u(-40), deadline_race: u(-39),
      quali_result: uitslag, race_result: uitslag });
    Object.assign(db.races[1], { deadline_quali: u(-20), deadline_race: u(-19) });
    db.pool_members.push({ member_id: 'lid-2', pool_id: 'pool-1', display_name: 'Michael', user_id: null });
    const mijn = ['4', '1', '16', '81', '63', '12', '44', '10', '14', '18'];
    for (const [lid, v] of [['lid-1', mijn], ['lid-2', uitslag.slice(0, 10)]]) {
      for (const q of ['quali_top10', 'race_top10']) {
        db.answers.push({ pool_id: 'pool-1', race_id: 1, member_id: lid, question_id: q,
          waarde: v, updated_at: u(-50) });
      }
    }
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  });
  await page.reload();
  await page.waitForSelector('[data-race]');

  const banners = [];
  const verzamel = async () => banners.push(...await page.$$eval(
    '.melding, .waarschuwing, .leeg, .uitleg, .bijna', (els) => els.map((el) => {
      const s = getComputedStyle(el);
      return {
        soort: el.className.split(' ')[0],
        rand: s.borderTopStyle, hoek: s.borderTopLeftRadius, vlak: s.backgroundColor,
        teken: getComputedStyle(el, '::before').content,
      };
    })));

  await openRace(page, 'Melbourne');
  await page.waitForSelector('.strip');
  await verzamel();
  const strip = await page.$eval('.strip', (lijst) => {
    const rijen = [...lijst.children];
    const gaten = rijen.slice(1).map((r, i) =>
      Math.round(r.getBoundingClientRect().top - rijen[i].getBoundingClientRect().bottom));
    return { rijen: rijen.length, gaten, hoek: getComputedStyle(rijen[0]).borderTopLeftRadius };
  });
  await openRace(page, 'Shanghai');
  await page.waitForSelector('#paneel .leeg');
  await verzamel();
  await page.click('[data-weergave="stand"]');
  await page.waitForSelector('.uitleg');
  await verzamel();
  const stand = await page.$eval('.strij', (rij) => {
    const lijst = rij.parentElement;
    const rijen = [...lijst.querySelectorAll(':scope > .strij')];
    const gaten = rijen.slice(1).map((r, i) =>
      Math.round(r.getBoundingClientRect().top - rijen[i].getBoundingClientRect().bottom));
    return { kaart: getComputedStyle(lijst).borderTopStyle, rijen: rijen.length, gaten };
  });
  await page.click('[data-weergave="poule"]');
  await page.fill('#pouleomschrijving', 'Om de eer');
  await page.click('#omschrijvingBewaren');
  await page.waitForSelector('.melding');
  await verzamel();

  const soorten = [...new Set(banners.map((b) => b.soort))].sort();
  // Zonder deze eerste check zou "ze zijn allemaal gelijk" ook slagen als er
  // maar één banner gevonden was.
  check('vier soorten banners gevonden om te vergelijken',
    ['bijna', 'leeg', 'melding', 'uitleg'].every((x) => soorten.includes(x)), soorten.join(', '));
  const gestippeld = banners.filter((b) => b.rand !== 'solid');
  check('geen enkele banner heeft een stippel- of streepjesrand', gestippeld.length === 0,
    JSON.stringify(gestippeld[0]));
  const vormen = new Set(banners.map((b) => `${b.hoek} ${b.vlak}`));
  check('ze hebben allemaal dezelfde hoek en hetzelfde vlak', vormen.size === 1,
    [...vormen].join(' | '));
  const zonderTeken = banners.filter((b) => !b.teken || b.teken === 'none' || b.teken === 'normal');
  check('en elk heeft een tekentje ervoor', zonderTeken.length === 0,
    zonderTeken.map((b) => b.soort).join(', '));

  check('de uitslag is één lijst waarvan de regels tegen elkaar aan liggen',
    strip.rijen >= 10 && strip.gaten.every((g) => g <= 1) && strip.hoek === '0px',
    JSON.stringify(strip));
  check('de stand ook, in een kaart met een rand',
    stand.rijen === 2 && stand.gaten.every((g) => g <= 1) && stand.kaart === 'solid',
    JSON.stringify(stand));

  check('geen javascriptfouten (banners)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
