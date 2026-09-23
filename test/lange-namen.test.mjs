// Namen die niet passen.
//
// Namen worden met een ellipsis afgekapt als ze niet passen: "Danny van der
// Meulen-Hoogen...". Dat is prima zolang je ze ergens anders kunt nalezen, en
// dat kon niet -- gemeten op alle vier de schermen, zowel voor de poulenaam
// als voor de spelersnamen. Bij vrienden met een dubbele achternaam gebeurt
// dat meteen, en dan staat er iemand in de stand van wie je niet kunt zien
// wie het is.
//
// Wat hier vastligt:
//   1. Een afgekapte naam draagt zijn volledige tekst als title.
//   2. Een naam die gewoon past draagt er géén -- een tooltip die herhaalt
//      wat je al leest is ruis.
//   3. Het "jij"-label in de stand hoort niet in die tooltip thuis.
//   4. Het volgt de breedte, niet alleen de tekst: breder maken haalt de
//      tooltip weer weg. Daarom kan dit niet bij het tekenen bepaald worden.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('namen die niet passen');

const LANG = 'Danny van der Meulen-Hoogendoorn de Vries';
const POULE = "Vrijdagmiddagpoule met de collega's van de tweede verdieping";

const { page, jsFouten, stoppen } = await startPagina({
  aanpassen: (s) => s
    .replace(/display_name:\s*'Danny'/, `display_name: '${LANG}'`)
    .replace(/name:\s*'Vrijdagmiddagpoule'/, `name: "${POULE}"`),
});

// De waarnemer zet de title ná het tekenen, dus daar even op wachten.
const rust = () => page.waitForTimeout(250);
const kijk = (kies) => page.evaluate((k) => {
  const el = document.querySelector(k);
  if (!el) return null;
  return { afgekapt: el.scrollWidth > el.clientWidth + 1,
           titel: el.getAttribute('title') };
}, kies);

await page.setViewportSize({ width: 1280, height: 900 });
await meedoen(page);
await rust();

// ---- 1: de poulenaam in de kop ------------------------------------------

{
  const p = await kijk('.ptitel');
  check('een lange poulenaam wordt afgekapt, anders bewijst de rest niets',
    p?.afgekapt === true, JSON.stringify(p));
  check('en draagt zijn volledige naam als title',
    p?.titel === POULE, JSON.stringify(p));
}

// ---- 2: een naam die past krijgt er géén --------------------------------
// De racenamen komen uit OpenF1 en zijn kort. Die horen dus niets te krijgen.

{
  const r = await page.evaluate(() => {
    const el = [...document.querySelectorAll('[data-race] .nm')]
      .find(e => e.scrollWidth <= e.clientWidth + 1);
    return el ? { tekst: el.textContent.trim(), titel: el.getAttribute('title') } : null;
  });
  check('er is een naam die gewoon past om dit mee te meten', r !== null);
  check('en die krijgt geen tooltip die herhaalt wat je al leest',
    r?.titel === null, JSON.stringify(r));
}

// ---- 3: het "jij"-label hoort niet in de tooltip -------------------------
// Op een smal scherm past de naam in de stand niet meer.

await page.setViewportSize({ width: 390, height: 844 });
await page.click('[data-weergave="stand"]');
await page.waitForSelector('[data-weergave]');
await rust();

{
  const eigen = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.nm')].find(e => e.querySelector('.jij'));
    return el ? { afgekapt: el.scrollWidth > el.clientWidth + 1,
                  tekst: el.textContent.trim(), titel: el.getAttribute('title') } : null;
  });
  check('je eigen regel in de stand wordt smal afgekapt',
    eigen?.afgekapt === true, JSON.stringify(eigen));
  check('de tooltip is precies de naam, zonder het "jij" erachter',
    eigen?.titel === LANG, JSON.stringify(eigen));
  check('terwijl er op het scherm wél "jij" achter staat',
    eigen?.tekst.endsWith('jij'), JSON.stringify(eigen));
}

// ---- 4: het volgt de breedte --------------------------------------------

await page.setViewportSize({ width: 1400, height: 900 });
await rust();

{
  const eigen = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.nm')].find(e => e.querySelector('.jij'));
    return el ? { afgekapt: el.scrollWidth > el.clientWidth + 1,
                  titel: el.getAttribute('title') } : null;
  });
  check('breder gemaakt past hij weer',
    eigen?.afgekapt === false, JSON.stringify(eigen));
  check('en dan gaat de tooltip ook weer weg',
    eigen?.titel === null, JSON.stringify(eigen));
}

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
