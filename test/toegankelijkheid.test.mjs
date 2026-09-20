// Toegankelijkheid: de dingen die stil verslechteren.
//
// Dit is geen volledige audit — dat is mensenwerk met een schermlezer. Wat
// hier staat zijn de vier eigenschappen die met één regel CSS of één vergeten
// attribuut weg kunnen zijn zonder dat iemand het merkt, en die daarom een
// test verdienen in plaats van een goed voornemen.
//
// De contrastdrempel is 4.5:1 (WCAG AA voor gewone tekst). De gedempte
// tekstkleur --ink3 zat op 2.77 tegen de achtergrond in het lichte thema, en
// die kleur draagt juist de kleine labels van 10 en 11 pixels.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('toegankelijkheid');

// De WCAG-formule, letterlijk. Hoort in de test en niet in de app: de app
// hoeft hem niet te kunnen uitrekenen, hij hoort er alleen aan te voldoen.
const CONTRAST = `(() => {
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = (rgb) => {
    const [r, g, b] = rgb.match(/\\d+/g).map(Number);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  return (voor, achter) => {
    const a = lum(voor), b = lum(achter);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
})()`;

for (const donker of [false, true]) {
  const naam = donker ? 'donker' : 'licht';
  const { page, jsFouten, stoppen } = await startPagina();
  await page.emulateMedia({ colorScheme: donker ? 'dark' : 'light' });
  await meedoen(page);
  await page.waitForSelector('[data-race]');
  await page.waitForTimeout(400);

  // ---- 1. contrast van élke zichtbare tekst -----------------------
  // Niet alleen de variabelen nameten: dit loopt over wat er echt op het
  // scherm staat, inclusief de achtergrond waar het toevallig op ligt.
  const slecht = await page.evaluate((bron) => {
    const contrast = eval(bron);
    const achtergrondVan = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const kleur = getComputedStyle(n).backgroundColor;
        if (kleur && !/rgba\(0, 0, 0, 0\)|transparent/.test(kleur)) return kleur;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    const uit = [];
    for (const el of document.querySelectorAll('#app *')) {
      const eigen = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!eigen) continue;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) < 0.5) continue;
      if (!el.getBoundingClientRect().width) continue;
      const groot = parseFloat(s.fontSize) >= 24
        || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700);
      const nodig = groot ? 3 : 4.5;
      const r = contrast(s.color, achtergrondVan(el));
      if (r < nodig) {
        const waar = `${el.parentElement?.className || ''}>${el.className || el.tagName}`;
        uit.push(`${waar} "${el.textContent.trim().slice(0, 14)}" ${s.color} op `
          + `${achtergrondVan(el)} ${s.fontSize} ${r.toFixed(2)}<${nodig}`);
      }
    }
    return uit;
  }, CONTRAST);
  check(`${naam}: alle tekst haalt de contrastdrempel`,
    slecht.length === 0, slecht.slice(0, 4).join(' | '));

  // ---- 2. aanraakvlakken ------------------------------------------
  // 44 pixels is de maat die Apple en Google allebei aanhouden. Een knop
  // daaronder mis je met je duim, en dan tik je per ongeluk iets anders aan.
  const klein = await page.$$eval('#app button, #app a.knop', (els) => els
    .filter((e) => e.getBoundingClientRect().width > 0)
    .map((e) => ({ t: (e.textContent || '').trim().slice(0, 18),
                   h: Math.round(e.getBoundingClientRect().height) }))
    .filter((x) => x.h < 44));
  check(`${naam}: elke knop is minstens 44 pixels hoog`,
    klein.length === 0, JSON.stringify(klein.slice(0, 4)));

  // ---- 3. focus is te zien ----------------------------------------
  // Wie met een toetsenbord door de app gaat moet kunnen zien waar hij is.
  // Met een échte Tab en niet met .focus() vanuit script: :focus-visible slaat
  // alleen aan bij toetsenbordbediening, en dat is precies de gebruiker om wie
  // het hier gaat. Een programmatische focus zou hier onterecht falen.
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const el = document.activeElement;
    const s = getComputedStyle(el);
    return { op: el.tagName, breedte: s.outlineWidth, stijl: s.outlineStyle };
  });
  check(`${naam}: een knop met toetsenbordfocus krijgt een zichtbare rand`,
    parseFloat(focus.breedte) >= 2 && focus.stijl !== 'none', JSON.stringify(focus));

  check(`${naam}: geen javascriptfouten`, jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 4. de taal staat erin --------------------------------------
// Zonder lang-attribuut leest een schermlezer Nederlandse tekst voor met een
// Engelse uitspraak, en dan is het onverstaanbaar.
{
  const { page, stoppen } = await startPagina();
  const taal = await page.getAttribute('html', 'lang');
  check('de pagina zegt in welke taal hij staat', taal === 'nl', String(taal));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
