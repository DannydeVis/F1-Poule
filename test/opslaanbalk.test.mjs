// De balk met Opslaan op een tablet en een groot scherm.
//
// Danny, 1 november, op een iPad liggend: "Klein venster om alles te kijken,
// die knoppen staan niet goed." Opslaan, "Opslaan, ook in je andere poules"
// en Wis alles stonden onder elkaar, elk over de hele breedte, net als op een
// telefoon. Samen met de kop bleef er zo'n driehonderd pixels over om je top 10
// in te zien. En omdat daar de kolom scrolt en niet de pagina, plakte de balk
// veertig pixels boven de onderrand, met de inhoud die eronder doorschoof en
// door de doorzichtige bovenkant heen te zien was.
//
// Wat hier vastligt:
//   1. Vanaf 600 pixels naast elkaar: Wis alles links, dan "ook in je andere
//      poules" (met een rand, als knop), dan Opslaan, die de rest van de ruimte
//      vult. "Nog open" erboven over de hele breedte.
//   2. Op een iPad liggend (1000 bij 700): de balk sluit aan op de onderrand van
//      de kolom, met een dichte achtergrond, en is niet hoger dan nodig; het
//      venster tussen kop en balk is ruim 440 pixels.
//   3. In de smalle rechterkolom van een groot scherm krijgt Opslaan een eigen
//      regel over de hele breedte, als hij er niet naast past.
//   4. Op een telefoon blijft het zoals het was: onder elkaar, Opslaan bovenaan.
//   5. Op een iPad mini staand (744) één rij; op 600 pixels, waar de rij begint,
//      Opslaan op een eigen regel en geen horizontale scroll; contrast in licht
//      en donker; geen javascriptfouten.

import { maakControle, startPagina, meedoen, openRace, kiesTien, kiesVoor, CONTRAST } from './hulp.mjs';

const { check, afronden } = maakControle('de balk met Opslaan op een tablet');

// Een tweede poule op dit toestel, anders is er geen "ook in je andere poules".
const metTweePoules = {
  aanpassen: (s) => s
    .replace("pools: [{ id:'pool-1', name:'Vrijdagmiddagpoule', join_code:'RTM026', season:2026 }],",
      "pools: [{ id:'pool-1', name:'Vrijdagmiddagpoule', join_code:'RTM026', season:2026 }, { id:'pool-2', name:'Werk', join_code:'CODE2', season:2026 }],")
    .replace("pool_members: [{ member_id:'lid-1', pool_id:'pool-1', display_name:'Danny', user_id:null }],",
      "pool_members: [{ member_id:'lid-1', pool_id:'pool-1', display_name:'Danny', user_id:null }, { member_id:'lid-2', pool_id:'pool-2', display_name:'Danny', user_id:null }],"),
};

async function klaarzetten(page, { breed, hoog }) {
  await page.setViewportSize({ width: breed, height: hoog });
  await meedoen(page);
  await page.evaluate(() => {
    const lijst = JSON.parse(localStorage.getItem('poule:poules') ?? '[]');
    lijst.push({ id: 'pool-2', name: 'Werk', join_code: 'CODE2', beschrijving: null });
    localStorage.setItem('poule:poules', JSON.stringify(lijst));
    localStorage.setItem('poule:pool-2:mijn_id', 'lid-2');
  });
  await page.reload();
  await openRace(page, 'Melbourne');
  await page.click('[data-tab="race"]');
  await kiesTien(page);
  await kiesVoor(page, '[data-vraagplek="winnaar"]');
  // Halverwege de top 10, zoals op Danny's schermafdruk.
  await page.evaluate(() => document.querySelector('[data-plek="3"]').scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(300);
}

// Waar alles staat, in pixels van het scherm.
const maten = (page) => page.evaluate(() => {
  const r = (kies) => {
    const el = document.querySelector(kies);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { links: b.left, rechts: b.right, boven: b.top, onder: b.bottom, breed: b.width, hoog: b.height,
             midden: b.top + b.height / 2 };
  };
  const balk = document.querySelector('.opslaanbalk');
  const s = getComputedStyle(balk);
  const kol = balk.closest('.kol');
  const kolScrolt = kol && getComputedStyle(kol).overflowY === 'auto';
  return {
    balk: r('.opslaanbalk'), opslaan: r('#opslaan'), elders: r('#ookelders'), wis: r('#wisalles'),
    nogopen: r('#nogopen'), kop: r('.kop'), kol: kolScrolt ? r('.kol.rechts') : null,
    achtergrond: s.backgroundColor, beeld: s.backgroundImage, hoogte: innerHeight,
    // Wat er net boven de knoppen in de balk ligt: de balk zelf, of de
    // inhoud die erachter doorschuift?
    erachter: (() => {
      const b = document.querySelector('#opslaan').getBoundingClientRect();
      const el = document.elementFromPoint(b.left + 10, b.top - 4);
      return el ? (el.closest('.opslaanbalk') ? 'balk' : el.className || el.tagName) : null;
    })(),
  };
});
const zelfdeRegel = (...vakken) => vakken.every((v) => Math.abs(v.midden - vakken[0].midden) <= 2);

// ---- 1 en 2. een iPad liggend ---------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina(metTweePoules);
  await klaarzetten(page, { breed: 1000, hoog: 700 });
  const m = await maten(page);
  check('op een iPad liggend staan de drie knoppen op één rij',
    !!(m.opslaan && m.elders && m.wis) && zelfdeRegel(m.wis, m.elders, m.opslaan),
    JSON.stringify([m.wis?.midden, m.elders?.midden, m.opslaan?.midden]));
  check('Wis alles links, dan ook in je andere poules, dan Opslaan',
    m.wis.links < m.elders.links && m.elders.links < m.opslaan.links, JSON.stringify([m.wis.links, m.elders.links, m.opslaan.links]));
  const rand = await page.$eval('#ookelders', (k) => getComputedStyle(k).borderTopStyle);
  check('ook in je andere poules heeft een rand, als knop', rand === 'solid', rand);
  check('Opslaan is de breedste en loopt tot de rechterrand van de balk',
    m.opslaan.breed > m.elders.breed && m.opslaan.breed > m.wis.breed && Math.abs(m.opslaan.rechts - m.balk.rechts) <= 1,
    JSON.stringify({ opslaan: m.opslaan.breed, elders: m.elders.breed, wis: m.wis.breed }));
  check('"nog open" staat erboven, over de hele breedte',
    !!m.nogopen && m.nogopen.onder <= m.opslaan.boven && Math.abs(m.nogopen.breed - m.balk.breed) <= 1,
    JSON.stringify(m.nogopen));
  check('de balk sluit aan op de onderrand van de kolom',
    !!m.kol && Math.abs(m.balk.onder - m.kol.onder) <= 1 && Math.abs(m.kol.onder - m.hoogte) <= 1,
    JSON.stringify({ balk: m.balk.onder, kol: m.kol?.onder, scherm: m.hoogte }));
  check('met ruimte onder de knoppen, zodat ze niet tegen de rand van het scherm staan',
    m.balk.onder - m.opslaan.onder >= 12, String(m.balk.onder - m.opslaan.onder));
  check('met een dichte achtergrond, zonder verloop',
    m.beeld === 'none' && /^rgb\(/.test(m.achtergrond), `${m.achtergrond} ${m.beeld}`);
  check('dus net boven de knoppen zie je de balk, en niet de inhoud erachter', m.erachter === 'balk', m.erachter);
  check('de balk is niet hoger dan nodig', m.balk.hoog <= 140, String(m.balk.hoog));
  check('en tussen de kop en de balk blijft een venster van ruim 440 pixels',
    m.balk.boven - m.kop.onder >= 440, String(m.balk.boven - m.kop.onder));

  // Helemaal onderaan: de balk staat dan op zijn eigen plek, nog steeds tegen
  // de onderrand, en de laatste vraag staat er heel boven.
  await page.evaluate(() => { const k = document.querySelector('.kol.rechts'); k.scrollTop = k.scrollHeight; });
  await page.waitForTimeout(200);
  const onder = await page.evaluate(() => {
    const balk = document.querySelector('.opslaanbalk').getBoundingClientRect();
    const blokken = [...document.querySelectorAll('.vragentegel')].map((b) => b.getBoundingClientRect().bottom);
    return { balk: balk.top, laatste: Math.max(...blokken), onder: balk.bottom, hoogte: innerHeight };
  });
  check('helemaal onderaan staat de laatste vraag er heel boven',
    onder.laatste <= onder.balk && Math.abs(onder.onder - onder.hoogte) <= 1, JSON.stringify(onder));

  // Donker, met de muis op Opslaan.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.hover('#opslaan');
  await page.waitForTimeout(250);
  const slecht = await page.evaluate(CONTRAST);
  check('donker: alles in beeld haalt de contrastdrempel', slecht.length === 0, slecht.slice(0, 4).join(' | '));
  check('geen javascriptfouten (iPad liggend)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 3. een groot scherm: de smalle rechterkolom --------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina(metTweePoules);
  await klaarzetten(page, { breed: 1440, hoog: 900 });
  const m = await maten(page);
  check('op een groot scherm staan Wis alles en ook in je andere poules naast elkaar, Wis alles tegen de linkerkant',
    zelfdeRegel(m.wis, m.elders) && m.wis.links < m.elders.links && Math.abs(m.wis.links - m.balk.links) <= 1,
    JSON.stringify({ midden: [m.wis.midden, m.elders.midden], wis: m.wis.links, balk: m.balk.links }));
  check('en krijgt Opslaan een eigen regel eronder, over de hele breedte',
    m.opslaan.boven >= m.elders.onder && Math.abs(m.opslaan.breed - m.balk.breed) <= 1,
    JSON.stringify({ opslaan: m.opslaan, balk: m.balk.breed }));
  check('ook hier aan de onderrand, dicht', Math.abs(m.balk.onder - m.hoogte) <= 1 && m.erachter === 'balk',
    `${m.balk.onder} / ${m.hoogte} · ${m.erachter}`);
  check('geen javascriptfouten (groot scherm)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 4. een telefoon, en 600 pixels ------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina(metTweePoules);
  await klaarzetten(page, { breed: 390, hoog: 844 });
  const m = await maten(page);
  check('op een telefoon onder elkaar, met Opslaan bovenaan',
    m.opslaan.onder <= m.elders.boven && m.elders.onder <= m.wis.boven,
    JSON.stringify([m.opslaan.boven, m.elders.boven, m.wis.boven]));
  check('elk over de hele breedte',
    [m.opslaan, m.wis].every((v) => Math.abs(v.breed - m.balk.breed) <= 1),
    JSON.stringify([m.opslaan.breed, m.wis.breed, m.balk.breed]));
  check('en de balk plakt onderaan het scherm', Math.abs(m.balk.onder - m.hoogte) <= 1,
    `${m.balk.onder} / ${m.hoogte}`);

  // Een iPad mini staand: één rij.
  await page.setViewportSize({ width: 744, height: 1133 });
  await page.waitForTimeout(250);
  const mini = await maten(page);
  check('op een iPad mini staand (744 pixels) één rij',
    zelfdeRegel(mini.wis, mini.elders, mini.opslaan),
    JSON.stringify([mini.wis.midden, mini.elders.midden, mini.opslaan.midden]));
  // 600 pixels, waar de rij begint: Opslaan past er net niet naast en krijgt
  // een eigen regel, zonder dat er iets buiten het scherm valt.
  await page.setViewportSize({ width: 600, height: 900 });
  await page.waitForTimeout(250);
  const zes = await maten(page);
  const breed = await page.evaluate(() => document.documentElement.scrollWidth);
  check('op 600 pixels Wis alles en ook in je andere poules naast elkaar, Opslaan eronder, zonder horizontale scroll',
    zelfdeRegel(zes.wis, zes.elders) && zes.opslaan.boven >= zes.elders.onder
      && Math.abs(zes.opslaan.breed - zes.balk.breed) <= 1 && breed <= 600,
    JSON.stringify({ breed, wis: zes.wis.midden, elders: zes.elders.midden, opslaan: zes.opslaan.boven }));
  const slecht = await page.evaluate(CONTRAST);
  check('licht: alles in beeld haalt de contrastdrempel', slecht.length === 0, slecht.slice(0, 4).join(' | '));
  check('geen javascriptfouten (telefoon)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
