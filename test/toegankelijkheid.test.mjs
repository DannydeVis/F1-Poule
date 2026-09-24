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

import { maakControle, startPagina, meedoen, openRace } from './hulp.mjs';

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
  //
  // En op elk scherm, niet alleen het overzicht. Tot het derde ontwerp keek
  // dit alleen naar het racesoverzicht, terwijl juist de stand, de uitslag en
  // de poulepagina de lijsten, banners en gloed-achter-je-eigen-regel hebben.
  //
  // Een doorzichtig vlak (het groene vlak achter een vinkje, de gloed achter
  // je eigen regel) wordt opgeteld bij wat eronder ligt. Eerst telde de eerste
  // kleur die niet helemaal doorzichtig was als het vlak, en rgba(…, .12)
  // werd dan gelezen alsof het massief groen was.
  const keur = () => page.evaluate((bron) => {
    const contrast = eval(bron);
    const rgba = (s) => { const m = s.match(/[\d.]+/g).map(Number);
      return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
    const achtergrondVan = (el) => {
      const lagen = [];
      for (let n = el; n; n = n.parentElement) {
        const k = rgba(getComputedStyle(n).backgroundColor);
        if (k.a > 0) lagen.push(k);
        if (k.a >= 1) break;
      }
      let onder = lagen.length && lagen[lagen.length - 1].a >= 1
        ? lagen.pop() : rgba(getComputedStyle(document.body).backgroundColor);
      while (lagen.length) {
        const k = lagen.pop();
        onder = { r: k.r * k.a + onder.r * (1 - k.a), g: k.g * k.a + onder.g * (1 - k.a),
                  b: k.b * k.a + onder.b * (1 - k.a), a: 1 };
      }
      return `rgb(${Math.round(onder.r)}, ${Math.round(onder.g)}, ${Math.round(onder.b)})`;
    };
    const uit = [];
    for (const el of document.querySelectorAll('#app *')) {
      const eigen = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!eigen) continue;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) < 0.5) continue;
      if (!el.getBoundingClientRect().width) continue;
      // Een knop die (nog) niet werkt is volgens WCAG 1.4.3 uitgezonderd, en
      // hoort er juist uit te zien alsof hij niet werkt.
      if (el.closest('[disabled]')) continue;
      const groot = parseFloat(s.fontSize) >= 24
        || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700);
      const nodig = groot ? 3 : 4.5;
      const achter = achtergrondVan(el);
      const r = contrast(s.color, achter);
      if (r < nodig) {
        const waar = `${el.parentElement?.className || ''}>${el.className || el.tagName}`;
        uit.push(`${waar} "${el.textContent.trim().slice(0, 14)}" ${s.color} op `
          + `${achter} ${s.fontSize} ${r.toFixed(2)}<${nodig}`);
      }
    }
    return uit;
  }, CONTRAST);
  const schermen = [
    ['overzicht', async () => {}],
    ['een open race', async () => { await openRace(page, 'Melbourne'); }],
    // Shanghai opent op het racetabblad, dat nog open staat; de kwalificatie
    // is net dicht en laat de lege staat "gesloten" zien.
    ['een gesloten race', async () => {
      await openRace(page, 'Shanghai');
      await page.click('[data-tab="quali"]');
      await page.waitForSelector('#paneel .leeg');
    }],
    ['stand', async () => { await page.click('[data-weergave="stand"]'); }],
    ['poule', async () => { await page.click('[data-weergave="poule"]'); }],
    ['profiel', async () => { await page.click('[data-weergave="profiel"]'); }],
  ];
  for (const [scherm, naarToe] of schermen) {
    await naarToe();
    await page.waitForTimeout(350);
    const slecht = await keur();
    check(`${naam}: ${scherm}: alle tekst haalt de contrastdrempel`,
      slecht.length === 0, slecht.slice(0, 4).join(' | '));
  }
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('[data-race]');
  await page.waitForTimeout(350);

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
