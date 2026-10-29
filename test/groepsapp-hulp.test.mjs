// Premium: de groepsapp en de stand als bestand.
//
// Wat hier vastligt:
//   1. Zonder premium is er niets van te zien, en een speler die geen
//      poulebaas is ziet het ook niet.
//   2. Herinneren: in de kaart bovenaan en onder Poule. Het bericht noemt de
//      race, de sessie, wie nog niets invulde (en niet wie al wel) en de link.
//      Met de deelknop van het toestel; zonder naar het klembord; lukt dat ook
//      niet, dan in beeld.
//   3. De samenvatting: de weekendwinnaar, de top 5 van de stand, het beste
//      team, het tussenklassement, de volgende race en de link. Zonder emoji
//      (Danny, 27 oktober).
//   4. De stand als CSV: een BOM, puntkomma's (komma's in het Engels), een
//      kolom per race, en een naam die Excel als formule zou lezen krijgt een
//      apostrof.
//   5. De stand als PDF (sinds 29 oktober; eerst ging dat met window.print(),
//      en dat doet in een app op het beginscherm van een iPhone niets): een
//      echte PDF met plek, naam, team, weekendzeges en punten. Op een computer
//      een download, in de app op het beginscherm het deelmenu; wegtikken is
//      geen fout, lukt het deelmenu niet dan alsnog een download. Een grote
//      poule krijgt meer pagina's, een te lange naam wordt afgekapt. Sinds
//      dezelfde dag in de stijl van het deelplaatje: de letters van de site
//      en het logo zitten in het bestand, met premium de kleur, het logo en
//      de sponsor van de poule; laden de letters niet, dan dezelfde opmaak in
//      Helvetica en Courier.
//   6. In het Engels in het Engels; geen javascriptfouten.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('premium: de groepsapp en de stand als bestand');
const { page, jsFouten, stoppen } = await startPagina();
await page.setViewportSize({ width: 390, height: 844 });
await meedoen(page);

const db = (fn, arg) => page.evaluate(([f, a]) => {
  const d = globalThis.__db;
  // eslint-disable-next-line no-new-func
  new Function('d', 'a', f)(d, a);
  sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
}, [fn, arg]);
const bestaat = (sel) => page.$(sel).then(Boolean);
const naar = async (w) => {
  if (await page.isVisible('#terug')) await page.click('#terug');
  await page.click(`[data-weergave="${w}"]`);
  await page.waitForTimeout(150);
};
const herlaad = async () => { await page.reload(); await page.waitForSelector('[data-weergave="races"]'); };

// Een PDF uit de app teruglezen, zonder bibliotheek. Eerst de opbouw: bovenaan
// %PDF-1.4, elk object op de plek die de tabel achteraan (xref) noemt, /Size,
// /Count en de /Length van elke stream kloppen, en startxref wijst naar die
// tabel; anders vindt een lezer niets. Dan de tekst per pagina, per regel: wat
// op dezelfde hoogte staat, van links naar rechts, met | ertussen. In `rijen`
// dezelfde regels met per stuk tekst waar het staat, hoe groot en in welke
// letter. Verder: de letters (naam, soort, of ze erin zitten), de plaatjes en
// hun doorzichtigheid, de kleuren van de schuine strepen, en de inhoud zelf.
function pdfLezen(buf) {
  const s = buf.toString('latin1');
  const fouten = [];
  if (!s.startsWith('%PDF-1.4\n')) fouten.push('geen %PDF-1.4 bovenaan');
  const start = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(s)?.[1]);
  const xref = /^xref\n0 (\d+)\n/.exec(s.slice(start));
  if (!xref) return { fouten: [...fouten, 'startxref wijst niet naar de xref-tabel'], paginas: [], rijen: [], inhoud: [] };
  const aantal = Number(xref[1]);
  const regels = s.slice(start + xref[0].length).split('\n').slice(0, aantal);
  if (regels[0] !== '0000000000 65535 f ') fouten.push('de eerste regel van xref');
  for (let n = 1; n < aantal; n++) {
    if (!/^\d{10} 00000 n $/.test(regels[n] ?? '')) fouten.push(`regel ${n} van xref: ${regels[n]}`);
    else if (!s.startsWith(`${n} 0 obj\n`, Number(regels[n].slice(0, 10)))) fouten.push(`object ${n} staat niet waar xref zegt`);
  }
  if (!s.includes(`trailer\n<< /Size ${aantal} `)) fouten.push('/Size klopt niet');
  // Elke stream; die zonder iets anders dan /Length is de inhoud van een pagina.
  const inhoud = [];
  for (const m of s.matchAll(/<< \/Length (\d+)([^>]*)>>\nstream\n/g)) {
    const begin = m.index + m[0].length;
    if (!s.startsWith('\nendstream', begin + Number(m[1]))) fouten.push('/Length van een stream klopt niet');
    if (m[2] === ' ') inhoud.push(s.slice(begin, begin + Number(m[1])));
  }
  if (Number(/\/Count (\d+)/.exec(s)?.[1]) !== inhoud.length) fouten.push('/Count klopt niet');
  const letters = [...s.matchAll(/\/Type \/Font \/Subtype \/(\w+) \/BaseFont \/([\w-]+)(?: \/FirstChar (\d+) \/LastChar (\d+) \/Widths \[([\d ]+)\])?/g)]
    .map(([, soort, naam, eerste, laatste, breedtes]) => ({ soort, naam, eerste: Number(eerste), laatste: Number(laatste),
      breedtes: breedtes?.split(' ').map(Number) ?? [] }));
  const rijen = inhoud.map((stuk) => {
    const opHoogte = new Map();
    for (const [, letter, grootte, tc, x, y, t] of stuk.matchAll(
      /\/F(\d) ([\d.]+) Tf [\d. ]+ rg (-?[\d.]+) Tc ([\d.]+) ([\d.]+) Td \(((?:\\.|[^\\)])*)\) Tj/g)) {
      if (!opHoogte.has(y)) opHoogte.set(y, []);
      opHoogte.get(y).push({ letter: Number(letter), x: Number(x), grootte: Number(grootte), tc: Number(tc),
        tekst: t.replace(/\\(.)/g, '$1') });
    }
    return [...opHoogte.values()].map((r) => r.sort((a, b) => a.x - b.x));
  });
  return { fouten, rijen, inhoud, letters,
    paginas: rijen.map((p) => p.map((r) => r.map((c) => c.tekst).join('|'))),
    ingebed: (s.match(/\/FontFile2 \d+ 0 R/g) ?? []).length,
    plaatjes: (s.match(/\/ColorSpace \/DeviceRGB \/SMask \d+ 0 R/g) ?? []).length,
    strepen: [...(inhoud[0] ?? '').matchAll(/([\d.]+ [\d.]+ [\d.]+) rg [\d.]+ [\d.]+ m [\d.]+ [\d.]+ l [\d.]+ [\d.]+ l [\d.]+ [\d.]+ l h f/g)]
      .map((m) => m[1]) };
}
// Een kleur zoals de PDF hem schrijft, en hoe hij er half doorzichtig op wit
// uitziet (de schuine strepen).
const pdfKleur = (hex) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
const opWit = (hex, deel) => `#${[1, 3, 5].map((i) => Math.round(255 - (255 - parseInt(hex.slice(i, i + 2), 16)) * deel)
  .toString(16).padStart(2, '0')).join('')}`;
// Wachten tot de letters en het logo voor de PDF binnen zijn (de app haalt ze
// alvast op zodra de knop er staat).
const pdfKlaar = (p = page) => p.waitForSelector('[data-stand-pdf][data-klaar]', { state: 'attached' });
const pdfDownload = async (p = page) => {
  const [download] = await Promise.all([p.waitForEvent('download'), p.click('[data-stand-pdf]')]);
  const delen = [];
  for await (const d of await download.createReadStream()) delen.push(d);
  return { naam: download.suggestedFilename(), pdf: pdfLezen(Buffer.concat(delen)) };
};

// Danny is de poulebaas. Melbourne is gereden: Danny alles goed, Bram alles
// vijf plekken naast, en "=SOM(1)" (een naam die Excel als formule zou
// lezen) niets. In Shanghai staat de race nog open: Bram heeft hem ingevuld,
// =SOM(1) niet.
const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
await db(`
  const [uit] = a;
  const naast = [...uit.slice(5), ...uit.slice(0, 5)];
  d.pools[0].owner_member_id = 'lid-1';
  d.pool_members.push({ member_id: 'lid-bram', pool_id: 'pool-1', display_name: 'Bram', user_id: 'iemand-bram' },
                      { member_id: 'lid-som', pool_id: 'pool-1', display_name: '=SOM(1)', user_id: 'iemand-som' });
  const r = d.races[0];
  r.quali_result = uit; r.race_result = uit;
  r.deadline_quali = new Date(Date.now() - 3 * 864e5).toISOString(); r.deadline_race = new Date(Date.now() - 2 * 864e5).toISOString();
  for (const [m, lijst] of [['lid-1', uit], ['lid-bram', naast]]) for (const v of ['quali_top10', 'race_top10'])
    d.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: m, question_id: v, waarde: lijst });
  d.answers.push({ pool_id: 'pool-1', race_id: d.races[1].id, member_id: 'lid-bram', question_id: 'race_top10', waarde: uit });`, [UIT]);
await herlaad();

// ---- 1. zonder premium ----------------------------------------------------------------
await naar('races');
const zonder = { kaart: await bestaat('[data-herinner]'), poule: false };
await naar('poule');
zonder.poule = await bestaat('[data-samenvatting], [data-export-csv]');
check('zonder premium niets van te zien', !zonder.kaart && !zonder.poule, JSON.stringify(zonder));
check('de uitleg over premium noemt de groepsapp en de stand als bestand',
  (await page.textContent('[data-premium-uitleg]')).replace(/\s+/g, ' ').includes('herinneringen en samenvattingen voor de groepsapp, de stand als bestand'));

// ---- 2. herinneren --------------------------------------------------------------------
await db(`d.pools[0].premium_tot = new Date(Date.now() + 864e5).toISOString();`);
await herlaad();
// De deelknop van het toestel nabootsen: onthouden wat er gedeeld werd.
const metDelen = () => page.evaluate(() => {
  window.__gedeeld = [];
  navigator.share = (d) => { window.__gedeeld.push(d.text); return Promise.resolve(); };
});
const gedeeld = () => page.evaluate(() => window.__gedeeld?.at(-1) ?? null);
await naar('races');
await metDelen();
check('in de kaart bovenaan staat "Herinner ze"', (await page.textContent('.wachtop [data-herinner]'))?.trim() === 'Herinner ze');
await page.click('.wachtop [data-herinner]');
await page.waitForTimeout(150);
{
  const t = await gedeeld();
  check('het bericht noemt de race, de sessie en wanneer hij sluit', /^Shanghai: de top 10 voor de race sluit .+\./.test(t ?? ''), t);
  check('wie nog niets invulde, en niet wie al wel', t?.includes('Nog niets ingevuld: =SOM(1)') && !t.includes('Bram'), t);
  check('en de link naar de poule', t?.includes('?code=RTM026'), t);
}
await naar('poule');
await metDelen();
check('onder Poule staat het met het aantal', (await page.textContent('[data-herinner]')).trim() === 'Herinner wie nog niets invulde (1)');
// Zonder deelknop: naar het klembord.
await page.evaluate(() => {
  delete navigator.share; navigator.share = undefined;
  window.__klembord = [];
  Object.defineProperty(navigator, 'clipboard', { configurable: true,
    value: { writeText: (t) => { window.__klembord.push(t); return Promise.resolve(); } } });
});
await page.click('[data-herinner]');
await page.waitForTimeout(150);
check('zonder deelknop gaat het naar het klembord', (await page.evaluate(() => window.__klembord.at(-1)))?.startsWith('Shanghai')
  && (await page.textContent('[data-herinner]')).trim() === 'Gekopieerd');
// En als ook dat niet lukt: in beeld.
await page.evaluate(() => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('nee')) } });
  document.execCommand = () => false;
});
await page.waitForTimeout(2600);
await page.click('[data-herinner]');
await page.waitForTimeout(150);
check('lukt ook dat niet, dan staat de tekst in beeld', await page.isVisible('#groepsappveld')
  && (await page.inputValue('#groepsappveld')).startsWith('Shanghai'));

// Iedereen ingevuld: geen knop, wel de melding.
await db(`d.answers.push({ pool_id: 'pool-1', race_id: d.races[1].id, member_id: 'lid-som', question_id: 'race_top10', waarde: a[0] });`, [UIT]);
await herlaad();
await naar('poule');
check('heeft iedereen ingevuld, dan geen herinnering maar een regel', !(await bestaat('[data-herinner]'))
  && (await page.textContent('[data-iedereen]')).includes('Iedereen heeft de top 10 voor Shanghai ingevuld.'));

// ---- 3. de samenvatting ---------------------------------------------------------------
await db(`
  d.pool_teams = [{ id: 't1', pool_id: 'pool-1', naam: 'Kantoor' }, { id: 't2', pool_id: 'pool-1', naam: 'Magazijn' }];
  for (const m of d.pool_members) m.team_id = m.member_id === 'lid-1' ? 't1' : 't2';
  d.pool_periodes = [{ id: 'p1', pool_id: 'pool-1', seizoen: 2026, naam: 'Voorjaar', van_ronde: 1, tot_ronde: 2, prijs: 'Kratje bier' }];`);
await herlaad();
await naar('poule');
await metDelen();
await page.click('[data-samenvatting]');
await page.waitForTimeout(150);
{
  const t = (await gedeeld()) ?? '';
  const regels = t.split('\n');
  check('de samenvatting begint met de race en de poule', regels[0] === 'Melbourne · Vrijdagmiddagpoule', regels[0]);
  check('met de weekendwinnaar', regels[1] === 'Weekendwinnaar: Danny (100 punten)', regels[1]);
  check('de stand, gelijke plekken gelijk', t.includes('Stand na 1 van de 3 races\n1. Danny  100\n2. =SOM(1)  0\n2. Bram  0'), t);
  check('het beste team', t.includes('Beste team: Kantoor (100,0 per speler)'), t);
  check('het tussenklassement: wie leidt', t.includes('Voorjaar: Danny leidt'), t);
  check('de volgende race, en de link', /Volgende: Shanghai, sluit .+\nhttps?:\/\/.+\?code=RTM026$/.test(t), t);
  check('zonder emoji', !/[\p{Extended_Pictographic}\u{FE0F}]/u.test(t), t);
}

// ---- 4. de stand als CSV --------------------------------------------------------------
const csv = async (p = page) => {
  const [download] = await Promise.all([p.waitForEvent('download'), p.click('[data-export-csv]')]);
  const stroom = await download.createReadStream();
  const delen = [];
  for await (const d of stroom) delen.push(d);
  return { naam: download.suggestedFilename(), tekst: Buffer.concat(delen).toString('utf8') };
};
{
  const { naam, tekst } = await csv();
  const regels = tekst.replace(/^﻿/, '').trim().split('\r\n');
  check('een bestand met de naam van de poule', naam === 'predict-the-race-stand-vrijdagmiddagpoule.csv', naam);
  check('met een BOM, zodat Excel de tekens goed leest', tekst.startsWith('﻿'));
  check('puntkomma\'s, een kolom per gereden race, en het team', regels[0] === 'plek;naam;team;totaal;1. Melbourne', regels[0]);
  check('een regel per speler', regels[1] === '1;Danny;Kantoor;100;100' && regels[3] === '2;Bram;Magazijn;0;0', regels.join(' | '));
  check('een naam die Excel als formule zou lezen krijgt een apostrof', regels[2] === "2;'=SOM(1);Magazijn;0;0", regels[2]);
}

// ---- 5. de stand als PDF ---------------------------------------------------------------
// Danny, 29 oktober: "De pdf knop werkt niet." window.print() opende geen
// afdrukvenster in de app op het beginscherm van een iPhone. Nu maakt de app
// zelf een PDF.
await page.evaluate(() => { window.__geprint = 0; window.print = () => { window.__geprint += 1; }; });
await pdfKlaar();
{
  const { naam, pdf } = await pdfDownload();
  const [p = []] = pdf.paginas;
  check('op een computer een download, met de naam van de poule', naam === 'predict-the-race-stand-vrijdagmiddagpoule.pdf', naam);
  check('een echte PDF: elk object staat waar de tabel achteraan zegt, één pagina',
    pdf.fouten.length === 0 && pdf.paginas.length === 1, pdf.fouten.join(' | '));
  check('in de letters van de site, en die zitten in het bestand', pdf.letters.map((l) => `${l.soort} ${l.naam}`).join(', ')
    === 'TrueType BarlowCondensed-Bold, TrueType BarlowCondensed-SemiBold, TrueType SpaceMono-Regular, TrueType SpaceMono-Bold'
    && pdf.ingebed === 4, `${pdf.letters.map((l) => l.naam).join(', ')} · ${pdf.ingebed} ingebed`);
  // De breedtes die de PDF opgeeft, komen uit de lettertypen zelf (de app
  // leest ze uit hmtx en cmap): A in Barlow Condensed Bold is 482, i 219 en 0
  // 453 (de cijfers staan in de cmap op een andere manier dan de letters), en
  // in Space Mono is alles 612.
  const per = Object.fromEntries(pdf.letters.map((l) => [l.naam, l]));
  const breedte = (naam, teken) => per[naam]?.breedtes[teken.charCodeAt(0) - 32];
  check('met de breedtes uit de lettertypen zelf', pdf.letters.every((l) => l.eerste === 32 && l.laatste === 255
    && l.breedtes.length === 224) && breedte('BarlowCondensed-Bold', 'A') === 482 && breedte('BarlowCondensed-Bold', 'i') === 219
    && breedte('BarlowCondensed-Bold', '0') === 453
    && breedte('BarlowCondensed-SemiBold', 'W') === 665 && ['0', 'A', 'm', '\xe9'].every((t) => breedte('SpaceMono-Bold', t) === 612),
    JSON.stringify(['A', 'i', '0'].map((t) => breedte('BarlowCondensed-Bold', t))));
  check('met het logo, met zijn doorzichtigheid', pdf.plaatjes === 1 && /\/Im1 Do/.test(pdf.inhoud[0]), String(pdf.plaatjes));
  check('bovenaan als op het deelplaatje: het logo met de naam, de poule, en na hoeveel races', p[0] === 'PREDICT THE RACE'
    && p[1] === 'STAND · SEIZOEN 2026' && p[2] === 'VRIJDAGMIDDAGPOULE' && p[3]?.startsWith('NA 1 VAN DE 3 RACES · '),
    p.slice(0, 4).join(' / '));
  check('met de schuine strepen rechtsboven in het accent', pdf.strepen.join() === [pdfKleur(opWit('#d93d24', 0.9)),
    pdfKleur(opWit('#d93d24', 0.35))].join(), pdf.strepen.join(' / '));
  check('de koploper in een vlak', p[4] === 'KOPLOPER' && p[5] === 'Danny|100', p.slice(4, 6).join(' / '));
  check('met plek, naam, team, weekendzeges en punten', p[6] === '3 SPELERS|TEAM|WEEKENDZEGES|PTN'
    && p[7] === '1|Danny|Kantoor|1|100' && p[8] === '2|=SOM(1)|Magazijn|0|0' && p[9] === '2|Bram|Magazijn|0|0', p.join(' / '));
  // De rechterrand van een getal: in Space Mono is elk teken 0,612 keer zo breed als de letter groot is.
  const rand = (c) => c.x + c.tekst.length * 0.612 * c.grootte;
  const tabel = (pdf.rijen[0] ?? []).filter((r) => r.length >= 4 && /^\d+$/.test(r[0].tekst));
  check('de punten rechts uitgelijnd tegen de kantlijn, de weekendzeges ook onder elkaar', tabel.length === 3
    && tabel.every((r) => Math.abs(rand(r.at(-1)) - 551.28) < 0.02 && Math.abs(rand(r.at(-2)) - rand(tabel[0].at(-2))) < 0.02),
    tabel.map((r) => `${rand(r.at(-2)).toFixed(2)}/${rand(r.at(-1)).toFixed(2)}`).join(' '));
  const host = await page.evaluate(() => location.host);
  check('onderaan waar je meedoet, en de geblokte vlag', p.at(-1) === `VOORSPEL MEE OP ${host.toUpperCase()}`
    && (pdf.inhoud[0].match(/ 5\.50 5\.50 re f/g) ?? []).length === 6, p.at(-1));
  check('en geen afdrukvenster meer', (await page.evaluate(() => window.__geprint)) === 0);
}

// In de app op het beginscherm van een iPhone: het deelmenu, met de PDF erin.
let downloads = 0;
page.on('download', () => { downloads += 1; });
const deelmenu = (gedrag) => page.evaluate((g) => {
  window.__pdfGedeeld = [];
  Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
  navigator.canShare = (d) => !!d?.files?.length;
  navigator.share = async (d) => {
    const f = d.files[0];
    const bytes = new Uint8Array(await f.arrayBuffer());
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    window.__pdfGedeeld.push({ velden: Object.keys(d).sort().join(','), naam: f.name, soort: f.type, bytes: btoa(bin) });
    if (g === 'weg') throw new DOMException('weggetikt', 'AbortError');
    if (g === 'mis') throw new DOMException('mag niet', 'NotAllowedError');
    if (g === 'traag') await new Promise((klaar) => setTimeout(klaar, 400));
  };
}, gedrag);
await deelmenu('goed');
await page.click('[data-stand-pdf]');
await page.waitForFunction(() => window.__pdfGedeeld.length === 1);
{
  const g = await page.evaluate(() => window.__pdfGedeeld[0]);
  const pdf = pdfLezen(Buffer.from(g.bytes, 'base64'));
  check('in de app op het beginscherm van een iPhone het deelmenu, met de PDF', g.naam === 'predict-the-race-stand-vrijdagmiddagpoule.pdf'
    && g.soort === 'application/pdf' && pdf.fouten.length === 0
    && pdf.paginas[0]?.includes('1|Danny|Kantoor|1|100') && downloads === 0, JSON.stringify({ ...g, bytes: undefined, downloads }));
  // Danny, 29 oktober: met een titel erbij maakte zijn iPhone daar een los
  // item "tekst" van, en wie op het voorbeeld tikte zag alleen de poulenaam.
  check('alleen het bestand, zonder titel of tekst erbij', g.velden === 'files', g.velden);
}
await deelmenu('weg');
await page.click('[data-stand-pdf]');
await page.waitForFunction(() => window.__pdfGedeeld.length === 1);
await page.waitForTimeout(300);
check('het deelmenu wegtikken is geen fout: geen download', downloads === 0, String(downloads));
await deelmenu('mis');
await Promise.all([page.waitForEvent('download'), page.click('[data-stand-pdf]')]);
check('lukt het deelmenu niet, dan alsnog een download', downloads === 1, String(downloads));
await deelmenu('traag');
await page.click('[data-stand-pdf]');
await page.click('[data-stand-pdf]');
await page.waitForTimeout(600);
check('twee keer tikken opent het deelmenu één keer', (await page.evaluate(() => window.__pdfGedeeld.length)) === 1 && downloads === 1);
await page.evaluate(() => {
  Object.defineProperty(navigator, 'standalone', { configurable: true, value: undefined });
  navigator.share = undefined; navigator.canShare = undefined;
});

// Een grote poule: 83 spelers, waarvan één met letters die niet in de PDF
// passen, één met een naam die te lang is voor zijn kolom, en één met een los
// haakje (dat moet in een PDF een \ ervoor krijgen).
await db(`for (let i = 0; i < 80; i++) d.pool_members.push({ member_id: 'lid-x' + i, pool_id: 'pool-1', user_id: 'x' + i, team_id: 't2',
  display_name: i === 0 ? 'Łukasz Żółć' : i === 1 ? 'Een heel erg lange naam die nooit in de kolom past, echt niet'
    : i === 2 ? 'Kees :)' : 'Speler ' + String(i).padStart(2, '0') });`);
await herlaad();
await naar('poule');
await pdfKlaar();
{
  const { pdf } = await pdfDownload();
  const rijen = pdf.paginas.flat().filter((r) => /^\d+\|/.test(r));
  const namen = rijen.map((r) => r.split('|')[1]);
  check('een grote poule: vier pagina\'s, met op elke de koppen en onderaan welke het is', pdf.fouten.length === 0
    && pdf.paginas.length === 4 && pdf.paginas.every((p, n) => p.includes('83 SPELERS|TEAM|WEEKENDZEGES|PTN')
      && p.at(-1).endsWith(`|${n + 1}/4`)), `${pdf.paginas.length} · ${pdf.fouten.join(' | ')}`);
  check('de naam van de poule ook boven de volgende pagina\'s', pdf.paginas.slice(1).every((p) => p[1] === 'VRIJDAGMIDDAGPOULE'),
    pdf.paginas.map((p) => p[1]).join(' / '));
  check('iedereen staat erin, één keer', namen.length === 83 && new Set(namen).size === 83, String(namen.length));
  check('letters die niet in de PDF passen zonder accent', namen.includes('Lukasz Zólc'), namen.slice(0, 6).join(' / '));
  check('een los haakje in een naam breekt het bestand niet', namen.includes('Kees :)'), namen.slice(0, 6).join(' / '));
  check('een te lange naam afgekapt, met een weglatingsteken', namen.some((n) => n.startsWith('Een heel erg lange')
    && n.endsWith('\x85') && n.length < 50), namen.find((n) => n.startsWith('Een heel')));
}
await db(`d.pool_members = d.pool_members.filter((m) => !m.member_id.startsWith('lid-x'));`);

// Premium: de strepen in de kleur van de poule, en zijn logo en sponsor in de
// voet, net als op het deelplaatje. Het adres schuift naar rechts.
await db(`
  const doek = document.createElement('canvas'); doek.width = 160; doek.height = 80;
  const x = doek.getContext('2d'); x.fillStyle = '#1e6fd9'; x.fillRect(0, 0, 80, 80);
  d.opslag = { 'pool-1/logo.png': doek.toDataURL('image/png') };
  Object.assign(d.pools[0], { merk_kleur: '#1e6fd9', merk_logo: 'pool-1/logo.png', sponsor_tekst: 'Bakkerij Jansen' });`);
await herlaad();
await naar('poule');
await pdfKlaar();
{
  const { pdf } = await pdfDownload();
  const [p = []] = pdf.paginas;
  const host = await page.evaluate(() => location.host);
  check('met premium de strepen in de kleur van de poule', pdf.strepen.join() === [pdfKleur(opWit('#1e6fd9', 0.9)),
    pdfKleur(opWit('#1e6fd9', 0.35))].join(), pdf.strepen.join(' / '));
  check('en zijn logo en sponsor in de voet, met het adres er heel naast', pdf.plaatjes === 2 && /\/Im2 Do/.test(pdf.inhoud[0])
    && p.includes('MOGELIJK GEMAAKT DOOR') && p.includes('Bakkerij Jansen') && p.includes(`VOORSPEL MEE OP ${host.toUpperCase()}`),
    `${pdf.plaatjes} · ${p.slice(-3).join(' / ')}`);
}
await db(`delete d.opslag; Object.assign(d.pools[0], { merk_kleur: null, merk_logo: null, sponsor_tekst: null });`);

// Laden de letters van de site niet (geen verbinding, een fout op de server),
// dan dezelfde opmaak in Helvetica en Courier, die elke PDF-lezer zelf heeft.
await page.route('**/lettertypen/pdf/**', (r) => r.abort());
await herlaad();
await naar('poule');
await pdfKlaar();
{
  const { pdf } = await pdfDownload();
  const [p = []] = pdf.paginas;
  check('laden de letters niet, dan Helvetica en Courier, en verder hetzelfde', pdf.fouten.length === 0 && pdf.ingebed === 0
    && pdf.letters.map((l) => `${l.soort} ${l.naam}`).join(', ')
      === 'Type1 Helvetica-Bold, Type1 Helvetica-Bold, Type1 Courier, Type1 Courier-Bold'
    && p[2] === 'VRIJDAGMIDDAGPOULE' && p.includes('1|Danny|Kantoor|1|100') && pdf.plaatjes === 1,
    `${pdf.letters.map((l) => l.naam).join(', ')} · ${p.join(' / ')}`);
}
await page.unroute('**/lettertypen/pdf/**');
await herlaad();

// ---- een speler, en na premium -----------------------------------------------------------
await db(`d.pools[0].owner_member_id = 'lid-bram'; d.answers = d.answers.filter((x) => !(x.member_id === 'lid-som' && x.race_id === d.races[1].id));`);
await herlaad();
await naar('races');
const speler = { kaart: await bestaat('[data-herinner]'), poule: false };
await naar('poule');
speler.poule = await bestaat('[data-samenvatting], [data-export-csv], [data-herinner]');
check('een speler die geen poulebaas is ziet het niet', !speler.kaart && !speler.poule, JSON.stringify(speler));
await db(`d.pools[0].owner_member_id = 'lid-1'; d.pools[0].premium_tot = new Date(Date.now() - 864e5).toISOString();`);
await herlaad();
await naar('races');
const na = { kaart: await bestaat('[data-herinner]'), poule: false };
await naar('poule');
na.poule = await bestaat('[data-samenvatting], [data-export-csv], [data-herinner]');
check('na premium is het weg', !na.kaart && !na.poule, JSON.stringify(na));
check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();

// ---- 6. in het Engels --------------------------------------------------------------------
{
  const { page: en, jsFouten: fouten, stoppen: stop } = await startPagina({ taal: 'en' });
  await en.setViewportSize({ width: 390, height: 844 });
  await meedoen(en);
  await en.evaluate((uit) => {
    const d = globalThis.__db;
    Object.assign(d.pools[0], { owner_member_id: 'lid-1', premium_tot: new Date(Date.now() + 864e5).toISOString() });
    const r = d.races[0];
    r.quali_result = uit; r.race_result = uit;
    r.deadline_quali = new Date(Date.now() - 3 * 864e5).toISOString(); r.deadline_race = new Date(Date.now() - 2 * 864e5).toISOString();
    for (const v of ['quali_top10', 'race_top10']) d.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: 'lid-1', question_id: v, waarde: uit });
    sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
  }, UIT);
  await en.reload();
  await en.click('[data-weergave="poule"]');
  await en.waitForSelector('[data-export-csv]');
  const knoppen = (await en.textContent('.groepsapphulp')).replace(/\s+/g, ' ').trim();
  check('in het Engels: de knoppen', knoppen.includes('Summary of Melbourne') && knoppen.includes('Standings as CSV'), knoppen);
  const { tekst } = await csv(en);
  check('in het Engels komma\'s in de CSV', tekst.replace(/^﻿/, '').startsWith('place,name,total,1. Melbourne'),
    tekst.split('\r\n')[0]);
  await pdfKlaar(en);
  const { pdf } = await pdfDownload(en);
  const [p = []] = pdf.paginas;
  check('en de PDF in het Engels', p.includes('TABLE · SEASON 2026') && p.some((r) => r.startsWith('AFTER 1 OF 3 RACES · '))
    && p.includes('1 PLAYERS|WEEKEND WINS|PTS') && p.at(-1).startsWith('PREDICT ALONG AT '), p.join(' / '));
  check('geen javascriptfouten in het Engels', fouten.length === 0, fouten.join(' | '));
  await stop();
}

process.exit(afronden() ? 0 : 1);
