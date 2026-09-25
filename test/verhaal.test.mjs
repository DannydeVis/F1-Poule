// Het weekend als verhaal.
//
// Aanleiding: "Ipv dat mensen naar de pagina gaan, dat er zodra de uitslag
// bekend is een animatie is, of een scherm waar je één voor één de punten
// ziet. Zoiets als een story op Insta. Uiteraard ook te skippen om direct naar
// de uitslag te gaan."
//
// Wat hier vastligt:
//   1. Na een uitslag opent het verhaal vanzelf, één keer, op het overzicht.
//   2. De schermen: de race, je punten per sessie, je weekend, wie er won, de
//      stand, en een einde met de uitslag en delen.
//   3. Tikken rechts is verder, links terug, vasthouden pauzeert, en na een
//      paar seconden gaat hij vanzelf door.
//   4. Overslaan en Escape gaan meteen naar de uitslag.
//   5. Het onderbreekt niemand: wie in een race zit krijgt hem pas op het
//      overzicht.
//   6. Niet voor een oude race, niet als je niets inleverde, en niet als je
//      het in Profiel uitzet. Opnieuw afspelen kan altijd onder de uitslag.
//   7. Met "minder beweging" staat alles meteen stil op zijn plek.
//
// startPagina zet het verhaal in alle andere tests uit (zie hulp.mjs); hier
// staat het aan.

import { maakControle, startPagina, meedoen, naarLijst } from './hulp.mjs';

const { check, afronden } = maakControle('het weekend als verhaal');
const { page, jsFouten, stoppen } = await startPagina({ verhaal: true });
await page.setViewportSize({ width: 390, height: 844 });
await meedoen(page);

// Vier spelers. In Melbourne (acht dagen geleden) zat Danny overal naast en
// had de rest alles goed; in Shanghai (net gereden) precies andersom. Na
// Shanghai staat iedereen dus gelijk, en is Danny van vierde naar eerste
// geklommen.
const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
await page.evaluate((uit) => {
  const db = globalThis.__db;
  for (const [i, naam] of ['Joey', 'Kimberly', 'Michael'].entries())
    db.pool_members.push({ member_id: `lid-${i + 2}`, pool_id: 'pool-1', display_name: naam, user_id: `iemand-${i}` });
  const ernaast = [...uit.slice(5), ...uit.slice(0, 5)];
  db.races.slice(0, 2).forEach((r, k) => {
    r.quali_result = uit; r.race_result = uit;
    r.deadline_quali = new Date(Date.now() - (k ? 6e6 : 8 * 864e5)).toISOString();
    r.deadline_race = new Date(Date.now() - (k ? 5e6 : 8 * 864e5 - 1e5)).toISOString();
    for (const m of db.pool_members) {
      const goed = (m.member_id === 'lid-1') === (k === 1);
      for (const v of ['quali_top10', 'race_top10'])
        db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: m.member_id, question_id: v, waarde: goed ? uit : ernaast });
    }
  });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, UIT);

const dia = () => page.evaluate(() => {
  const v = document.querySelector('.verhaal');
  const d = v?.querySelector('.verhaal-dia');
  return v ? { nr: Number(v.dataset.dia), soort: d.dataset.soort, tekst: d.textContent.replace(/\s+/g, ' ').trim(),
               balkjes: v.querySelectorAll('.verhaal-balkjes span').length } : null;
});
const naar = async (soort) => {
  for (let i = 0; i < 10 && (await dia())?.soort !== soort; i++) await page.keyboard.press('ArrowRight');
  return dia();
};
// "Gezien" vergeten, maar niet de instelling zelf (poule:verhaal).
const vergeetGezien = () => page.evaluate(() => {
  for (const k of Object.keys(localStorage)) if (/^poule:.+:verhaal$/.test(k)) localStorage.removeItem(k);
});
const weg = async () => {
  await page.waitForTimeout(800);
  return !(await page.$('.verhaal'));
};

// ---- 1. vanzelf, na de uitslag ----------------------------------------------------
await page.reload();
await page.waitForSelector('.verhaal', { timeout: 8000 }).catch(() => {});
{
  const v = await page.evaluate(() => {
    const el = document.querySelector('.verhaal');
    return el && { rol: el.getAttribute('role'), modaal: el.getAttribute('aria-modal'), label: el.getAttribute('aria-label'),
                   inApp: !!el.closest('#app'), focus: document.activeElement === el };
  });
  check('na een uitslag opent het verhaal vanzelf', !!v);
  check('als dialoog, met de race in de naam', v?.rol === 'dialog' && v.modaal === 'true' && v.label === 'Shanghai: jouw weekend',
    JSON.stringify(v));
  check('los van #app, en met de focus erop', v && !v.inApp && v.focus, JSON.stringify(v));
}

// ---- 2. de schermen -----------------------------------------------------------------
{
  const d = await dia();
  check('eerst de race', d?.soort === 'start' && d.tekst.includes('Shanghai') && d.tekst.includes('ronde 2 · 2026')
    && d.tekst.includes('De uitslag is binnen'), d?.tekst);
  check('met een balkje voor elk scherm: start, kwalificatie, race, weekend, poule, stand, einde',
    d?.balkjes === 7, `${d?.balkjes} balkjes`);
}
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(1100);
{
  const d = await dia();
  const bord = await page.$$eval('.verhaal-bord li', (n) => n.map((l) => l.className.replace('vh-op', '').trim()));
  check('dan je kwalificatie: je punten groot', d?.soort === 'quali' && d.tekst.startsWith('Kwalificatie 50'), d?.tekst);
  check('en hoeveel je er exact had', d?.tekst.includes('10 van 10 exact voorspeld'), d?.tekst);
  check('met je top 10 als tijdenbord, paars voor exact', bord.length === 10 && bord.every((k) => k === 'v5'), bord.join(','));
}
await page.keyboard.press('ArrowRight');
check('dan de race', (await dia())?.soort === 'race');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(1100);
{
  const d = await dia();
  check('dan je weekend bij elkaar, met de optelling', d?.soort === 'weekend' && d.tekst.includes('100')
    && d.tekst.includes('kwalificatie 50 + race 50'), d?.tekst);
  check('en of je gewonnen hebt', d?.tekst.includes('Jij wint het weekend!'), d?.tekst);
}
await page.keyboard.press('ArrowRight');
{
  const rijen = await page.$$eval('.verhaal-lijst li', (n) => n.map((l) => ({
    naam: l.querySelector('.nm').textContent, klas: l.className })));
  check('dan wie het weekend won, met jou bovenaan',
    rijen.length === 4 && rijen[0].naam === 'Danny' && /winnaar/.test(rijen[0].klas) && /mij/.test(rijen[0].klas),
    JSON.stringify(rijen));
  // Van onder naar boven: de winnaar komt als laatste.
  const vertraging = await page.$$eval('.verhaal-lijst li', (n) => n.map((l) => parseInt(l.style.animationDelay)));
  check('die van onder naar boven binnenkomt, de winnaar als laatste',
    vertraging.every((v, i) => i === 0 || v < vertraging[i - 1]), vertraging.join(','));
}
await page.keyboard.press('ArrowRight');
{
  const d = await dia();
  const rijen = await page.$$eval('.verhaal-lijst li', (n) => n.map((l) =>
    [...l.children].map((c) => c.textContent.trim()).filter(Boolean).join(' ')));
  check('dan de stand na dit weekend', d?.soort === 'stand' && d.tekst.includes('stand na ronde 2'), d?.tekst);
  check('van vierde naar eerste: "Je klimt naar 1e"', d?.tekst.includes('Je klimt naar 1e'), d?.tekst);
  check('met het pijltje erbij', rijen.some((r) => r.startsWith('1 Danny ▲3')), rijen.join(' | '));
  // Joey, Kimberly en Michael stonden gedeeld eerste en staan dat nog steeds,
  // nu samen met Danny. Dat is geen plek gezakt.
  check('wie zijn gedeelde plek houdt krijgt geen pijltje',
    rijen.filter((r) => !r.includes('Danny')).every((r) => !/[▲▼]/.test(r)), rijen.join(' | '));
}
await page.keyboard.press('ArrowRight');
{
  const d = await dia();
  check('en tot slot: de uitslag bekijken, delen, of nog een keer',
    d?.soort === 'einde' && d.tekst.includes('Bekijk de uitslag') && d.tekst.includes('Deel de uitslag') && d.tekst.includes('Nog een keer'),
    d?.tekst);
  check('met de focus op de uitslag', await page.evaluate(() => document.activeElement?.matches('[data-verhaal-uitslag]')));
  await page.keyboard.press('ArrowRight');
  check('het laatste scherm blijft staan', (await dia())?.soort === 'einde');
}
await page.click('[data-verhaal-uitslag]');
await page.waitForSelector('#paneel');
check('"Bekijk de uitslag" sluit het verhaal en opent de race', await weg()
  && (await page.textContent('.dtitel')).trim() === 'Shanghai');
check('op het tabblad van de race',
  (await page.getAttribute('[data-tab="race"]', 'aria-selected')) === 'true');

// ---- één keer --------------------------------------------------------------------------
await naarLijst(page);
check('terug op het overzicht komt hij niet nog eens', await weg());
await page.reload();
await page.waitForSelector('[data-race]');
check('en ook niet na herladen', await weg());

// ---- 3. bladeren, pauzeren, vanzelf verder --------------------------------------------
await page.click('[data-race="2"]');
await page.waitForSelector('[data-verhaal]');
check('onder de uitslag staat "Speel het weekend af"',
  (await page.textContent('[data-verhaal]')).trim() === 'Speel het weekend af');
await page.click('[data-verhaal]');
await page.waitForSelector('.verhaal');
check('die het verhaal opnieuw afspeelt, vanaf het begin', (await dia())?.nr === 1);

const vak = await page.$eval('.verhaal-in', (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, b: r.width, h: r.height }; });
const rechts = { x: vak.x + vak.b * 0.8, y: vak.y + vak.h * 0.55 };
const links = { x: vak.x + vak.b * 0.15, y: vak.y + vak.h * 0.55 };
await page.mouse.click(rechts.x, rechts.y);
check('rechts tikken gaat verder', (await dia())?.nr === 2);
await page.mouse.click(links.x, links.y);
check('links tikken gaat terug', (await dia())?.nr === 1);

await page.mouse.click(rechts.x, rechts.y);
const balk = () => page.$eval('.verhaal-balkjes span:nth-child(2) i', (i) => parseFloat(i.style.width) || 0);
await page.mouse.move(rechts.x, rechts.y);
await page.mouse.down();
await page.waitForTimeout(500);
const bij = await balk();
await page.waitForTimeout(1500);
const later = await balk();
check('vasthouden pauzeert', Math.abs(later - bij) < 1, `${bij.toFixed(1)}% → ${later.toFixed(1)}%`);
await page.mouse.up();
check('en loslaten na vasthouden bladert niet', (await dia())?.nr === 2);
// Een sessiescherm staat 5,2 seconden.
await page.waitForFunction(() => document.querySelector('.verhaal')?.dataset.dia === '3', null, { timeout: 7000 }).catch(() => {});
check('na een paar seconden gaat hij vanzelf door', (await dia())?.nr === 3);

// ---- 4. overslaan ---------------------------------------------------------------------
await page.click('[data-verhaal-sla]');
check('Overslaan sluit het verhaal', await weg());
check('en gaat meteen naar de uitslag', await page.isVisible('#paneel'));

await page.click('[data-verhaal]');
await page.waitForSelector('.verhaal');
await page.keyboard.press('Escape');
check('Escape is ook overslaan', await weg());
check('en sluit niet de race eronder', await page.isVisible('#paneel'));

await page.click('[data-verhaal]');
await page.waitForSelector('.verhaal');
await naar('einde');
await page.click('[data-verhaal-deel]');
await page.waitForSelector('.deelvenster img');
check('delen vanaf het einde opent het deelplaatje, met de uitslag erachter',
  await weg() && await page.isVisible('#paneel'));
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.querySelector('.deelvenster'));

// ---- 5. niemand onderbreken -----------------------------------------------------------
// Een race staat open (en blijft dat na herladen). Dan wacht het verhaal.
await vergeetGezien();
await page.reload();
await page.waitForSelector('#paneel');
check('wie in een race zit wordt niet onderbroken', await weg());
await page.keyboard.press('Escape');
await page.waitForSelector('.verhaal', { timeout: 3000 }).catch(() => {});
check('het verhaal komt zodra je terug bent op het overzicht', !!(await page.$('.verhaal')));
// Vanaf het overzicht bewijst dit pas iets: daar stond nog geen race open.
await page.keyboard.press('Escape');
await page.waitForSelector('#paneel', { timeout: 3000 }).catch(() => {});
check('Escape vanaf het overzicht opent de uitslag', await weg()
  && (await page.textContent('.dtitel').catch(() => '')).trim() === 'Shanghai');
await naarLijst(page);

// ---- 6. wanneer niet ------------------------------------------------------------------
await page.click('[data-weergave="profiel"]');
await page.waitForSelector('[data-verhaalstand="uit"]');
check('in Profiel staat het aan', await page.isDisabled('[data-verhaalstand="aan"]'));
await page.click('[data-verhaalstand="uit"]');
await vergeetGezien();
// Profiel onthoudt de app niet over herladen heen: je komt op het overzicht.
await page.reload();
await page.waitForSelector('[data-race]');
check('uitgezet in Profiel speelt hij niet meer vanzelf', await weg());
await page.click('[data-weergave="profiel"]');
await page.click('[data-verhaalstand="aan"]');
check('weer aangezet: niet midden in Profiel', await weg());
await page.click('[data-weergave="races"]');
await page.waitForSelector('.verhaal', { timeout: 3000 }).catch(() => {});
check('maar wel op het overzicht', !!(await page.$('.verhaal')));
await page.click('[data-verhaal-sla]');
await page.waitForSelector('#paneel', { timeout: 3000 }).catch(() => {});
check('Overslaan vanaf het overzicht opent de uitslag', await weg()
  && (await page.textContent('.dtitel').catch(() => '')).trim() === 'Shanghai');
await naarLijst(page);

// Een uitslag van twaalf dagen oud: dat nieuws is voorbij.
await page.evaluate(() => {
  const db = globalThis.__db;
  const r = db.races[1];
  r.deadline_race = new Date(Date.now() - 12 * 864e5).toISOString();
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await vergeetGezien();
await page.reload();
await page.waitForSelector('[data-race]');
check('niet voor een race van twaalf dagen terug', await weg());

// Niets ingeleverd: het verhaal gaat over jouw punten.
await page.evaluate(() => {
  const db = globalThis.__db;
  db.races[1].deadline_race = new Date(Date.now() - 5e6).toISOString();
  db.answers = db.answers.filter((a) => !(a.member_id === 'lid-1' && String(a.race_id) === '2'));
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await vergeetGezien();
await page.reload();
await page.waitForSelector('[data-race]');
check('niet als je dat weekend niets inleverde', await weg());
await page.click('[data-race="2"]');
await page.waitForSelector('#paneel');
check('en dan ook geen knop om het af te spelen', !(await page.$('[data-verhaal]')));

// ---- 7. minder beweging, en alleen ---------------------------------------------------
await page.evaluate((uit) => {
  const db = globalThis.__db;
  db.pool_members = db.pool_members.filter((m) => m.member_id === 'lid-1');
  for (const v of ['quali_top10', 'race_top10'])
    db.answers.push({ pool_id: 'pool-1', race_id: 2, member_id: 'lid-1', question_id: v, waarde: uit });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, UIT);
// Nu weer wél ingeleverd, en nog niet gezien: dan speelt hij vanzelf, zodra
// je van de race (die na herladen nog openstaat) terug bent op het overzicht.
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.reload();
await page.waitForSelector('#terug');
await page.click('#terug');
await page.waitForSelector('.verhaal');
{
  const d = await dia();
  check('in je eentje: geen "wie won" en geen stand', d?.balkjes === 5, `${d?.balkjes} balkjes`);
  await page.keyboard.press('ArrowRight');
  const direct = await page.evaluate(() => ({
    getal: document.querySelector('.verhaal-getal').textContent,
    bewegend: document.querySelector('.verhaal').getAnimations({ subtree: true }).length,
  }));
  check('met minder beweging staat het getal er meteen', direct.getal === '50', direct.getal);
  check('en beweegt er niets', direct.bewegend === 0, `${direct.bewegend} animaties`);
}
await page.keyboard.press('Escape');

check('geen JavaScript-fouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
