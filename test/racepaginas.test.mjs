// De racepagina's (zoekplan SEO fase 4) naast hun gegevens.
//
// Draait zonder browser: leest site/data/races-<jaar>.json,
// site/data/circuits.json en de gegenereerde pagina's. De keuring die elke
// artikelpagina krijgt (titel, hreflang, JSON-LD, kruimelpad, links, contrast,
// 360 pixels) doen test/site.test.mjs en test/antwoordvorm.test.mjs; hier
// staat wat alleen een racepagina heeft.
//
// Wat hier vastligt:
//   1. De drempel: geen pagina zonder race in de gegevens of zonder vorige
//      editie, en zonder racepagina's ook geen overzicht.
//   2. Voor elke race uit site/races.mjs met gegevens en een vorige editie een
//      pagina in NL en EN, op /races/<jaar>/<slug>/ en /en/races/<jaar>/<slug>/.
//   3. De tijden: elke sessie op volgorde, in UTC en (op de Nederlandse pagina)
//      in Nederlandse tijd, hier opnieuw uitgerekend; het korte antwoord noemt
//      de starttijd van de race.
//   4. De top 10 van vorig jaar, race en kwalificatie, zoals in de gegevens;
//      de uitslag van dit jaar alleen als die er is.
//   5. De safety cars per jaar zoals in site/data/circuits.json, met een link
//      naar de tabel van alle circuits in de gids over de puntentelling.
//   6. Het overzicht noemt en linkt elke racepagina op datum, en de voorpagina
//      en elke gids linken naar het overzicht (NL en EN).
//   7. Geen vraag op een racepagina staat ook in de vragenlijst: een race
//      concurreert niet met een gids.
//   8. llms.txt noemt de racepagina's.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';
import { RACE_JAAR, RACES } from '../site/races.mjs';
import { RACEPAGINAS, RACEDATA, CIRCUITDATA, bouwRacepaginas } from '../scripts/racepaginas.mjs';
import { PAGINAS } from '../site/paginas.mjs';
import { VRAGEN } from '../site/vragen.mjs';
import { teksten } from '../site/teksten.mjs';

const { check, afronden } = maakControle('de racepagina\'s');

const lees = (pad) => readFileSync(join(wortel, ...pad.split('/'), 'index.html'), 'utf8');
const ontdoe = (x) => x.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, '\'').replace(/\s+/g, ' ').trim();
const sectie = (html, id) => html.match(new RegExp(`<section class="vraag" id="${id}">([\\s\\S]*?)</section>`))?.[1] ?? '';
const tabellen = (x) => [...x.matchAll(/<table[\s\S]*?<\/table>/g)].map(([t]) => ({
  bijschrift: ontdoe(t.match(/<caption>([\s\S]*?)<\/caption>/)?.[1] ?? ''),
  rijen: [...t.matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)].flatMap(([, b]) => [...b.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map(([, r]) => [...r.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map(([, c]) => ontdoe(c)))),
}));
const tijd = (iso, zone) => new Intl.DateTimeFormat('nl', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: zone }).format(new Date(iso));

// ---- 1. de drempel, met een eigen voorbeeld ------------------------------------------
{
  const top = Array.from({ length: 10 }, (_, i) => ({ plek: i + 1, nr: String(i + 1), code: `C${i}`, naam: `Coureur ${i + 1}`, team: 'Team' }));
  const race = (slug, circuit, extra = {}) => ({ circuit, slug, naam: `${slug} Grand Prix`, locatie: slug, land: 'Land', circuitNaam: slug,
    start: '2026-10-09T09:00:00+00:00', eind: null,
    sessies: [{ naam: 'Qualifying', sessie: 1, start: '2026-10-10T13:00:00+00:00', eind: '2026-10-10T14:00:00+00:00' },
      { naam: 'Race', sessie: 2, start: '2026-10-11T12:00:00+00:00', eind: '2026-10-11T14:00:00+00:00' }],
    vorige: { jaar: 2025, datum: '2025-10-05', kwalificatie: top, race: top }, uitslag: null, ...extra });
  const [a, b, c] = RACES;
  const data = { jaar: RACE_JAAR, races: [race(a.slug, a.circuit), race(b.slug, b.circuit, { vorige: null }),
    race(c.slug, c.circuit, { sessies: [] })], ontbreekt: [] };
  const uit = bouwRacepaginas(data, null);
  check('geen pagina zonder vorige editie of zonder race, wel een overzicht als er een pagina is',
    uit.map((pg) => pg.id).join() === `race-${a.slug},races`, uit.map((pg) => pg.id).join());
  check('zonder gegevens geen pagina\'s en geen overzicht', bouwRacepaginas(null, null).length === 0
    && bouwRacepaginas({ ...data, races: [data.races[1]] }, null).length === 0);
  // Singapore (eerste in site/races.mjs) hier later dan Austin: het overzicht
  // volgt de datum, niet de volgorde van de lijst.
  const laat = (x) => ({ ...x, start: '2026-12-01T09:00:00+00:00', sessies: x.sessies.map((y) => ({ ...y, start: y.start.replace('2026-10', '2026-12') })) });
  const omgekeerd = bouwRacepaginas({ ...data, races: [laat(race(a.slug, a.circuit)), race(b.slug, b.circuit)] }, null);
  check('de racepagina\'s en het overzicht op datum, niet in de volgorde van site/races.mjs',
    omgekeerd.map((pg) => pg.id).join() === `race-${b.slug},race-${a.slug},races`
      && omgekeerd.at(-1).lijst.join() === `race-${b.slug},race-${a.slug}`, omgekeerd.map((pg) => pg.id).join());
  const metUitslag = bouwRacepaginas({ ...data, races: [race(a.slug, a.circuit, { uitslag: { kwalificatie: top, race: top } })] }, null)[0];
  check('de uitslag van dit jaar staat er zodra hij er is, direct na de tijden',
    metUitslag.talen.nl.secties.map((s) => s.id).join() === 'tijden,uitslag,vorig-jaar'
      && uit[0].talen.nl.secties.map((s) => s.id).join() === 'tijden,vorig-jaar', metUitslag.talen.nl.secties.map((s) => s.id).join());
}

// ---- 2 tot 5. de echte pagina's ---------------------------------------------------------
const paginas = RACEPAGINAS.filter((pg) => pg.soort === 'race');
if (!RACEDATA) {
  check(`site/data/races-${RACE_JAAR}.json staat er nog niet, en dus zijn er geen racepagina's`, RACEPAGINAS.length === 0);
} else {
  const verwacht = RACES.filter((cfg) => RACEDATA.races.some((r) => r.slug === cfg.slug && r.vorige?.race?.length));
  check('voor elke race met gegevens en een vorige editie een pagina, in NL en EN, op de goede plek',
    verwacht.length > 0 && verwacht.every((cfg) => {
      const pg = paginas.find((x) => x.id === `race-${cfg.slug}`);
      return pg?.talen.nl.pad === `races/${RACE_JAAR}/${cfg.slug}` && pg?.talen.en.pad === `en/races/${RACE_JAAR}/${cfg.slug}`;
    }) && paginas.length === verwacht.length, paginas.map((pg) => pg.id).join(' '));

  const fout = { tijden: [], top: [], safety: [], evenement: [] };
  for (const pg of paginas) {
    const slug = pg.id.replace('race-', '');
    const r = RACEDATA.races.find((x) => x.slug === slug);
    const race = r.sessies.find((s) => s.naam === 'Race');
    const circuit = CIRCUITDATA?.circuits.find((c) => c.circuit === r.circuit);
    if (pg.evenement.start !== (r.start ?? r.sessies[0].start) || pg.evenement.eind !== (race.eind ?? race.start)) fout.evenement.push(slug);
    for (const code of ['nl', 'en']) {
      const html = lees(pg.talen[code].pad);
      const ids = code === 'nl' ? { tijden: 'tijden', vorig: 'vorig-jaar', uitslag: 'uitslag' } : { tijden: 'times', vorig: 'last-year', uitslag: 'result' };
      // 3. de tijden
      const tijden = sectie(html, ids.tijden);
      const rijen = tabellen(tijden)[0]?.rijen ?? [];
      const verwachtRijen = r.sessies.map((s) => [tijd(s.start, 'UTC'), ...(code === 'nl' ? [tijd(s.start, 'Europe/Amsterdam')] : [])]);
      if (JSON.stringify(rijen.map((x) => x.slice(2))) !== JSON.stringify(verwachtRijen)) fout.tijden.push(`${slug} ${code}: ${JSON.stringify(rijen)}`);
      const kort = ontdoe(tijden.match(/<p class="kort">([\s\S]*?)<\/p>/)?.[1] ?? '');
      if (!kort.includes(tijd(race.start, 'UTC')) || (code === 'nl' && !kort.includes(tijd(race.start, 'Europe/Amsterdam')))) fout.tijden.push(`${slug} ${code}: kort zonder de starttijd`);
      // 4. de top 10's
      const top = (lijst) => lijst.map((x) => [String(x.plek), x.naam ?? x.code ?? `#${x.nr}`, x.team ?? '']);
      const vorig = tabellen(sectie(html, ids.vorig)).map((t) => t.rijen);
      if (JSON.stringify(vorig) !== JSON.stringify([top(r.vorige.race), ...(r.vorige.kwalificatie ? [top(r.vorige.kwalificatie)] : [])])) fout.top.push(`${slug} ${code}: vorig jaar`);
      const heeftUitslag = !!sectie(html, ids.uitslag);
      if (heeftUitslag !== !!(r.uitslag?.race?.length >= 3)) fout.top.push(`${slug} ${code}: uitslag ${heeftUitslag ? 'staat er zonder gegevens' : 'ontbreekt'}`);
      if (!kort.length || !ontdoe(sectie(html, ids.vorig)).includes(r.vorige.race[0].naam)) fout.top.push(`${slug} ${code}: winnaar niet in de tekst`);
      // 5. de safety cars
      if (circuit) {
        const s = sectie(html, 'safety-cars');
        const rijenSc = tabellen(s)[0]?.rijen ?? [];
        const ja = code === 'nl' ? 'ja' : 'yes';
        const nee = code === 'nl' ? 'nee' : 'no';
        const verwachtSc = circuit.perRace.map((x) => [String(x.jaar), String(x.safetyCars), x.rodeVlag ? ja : nee]);
        if (JSON.stringify(rijenSc) !== JSON.stringify(verwachtSc)) fout.safety.push(`${slug} ${code}: tabel`);
        const tekst = ontdoe(s);
        if (!tekst.includes(`${circuit.races} race`) || !new RegExp(`\\b${circuit.safetyCars} (keer|times)\\b`).test(tekst)) fout.safety.push(`${slug} ${code}: tekst`);
        const gids = PAGINAS.find((x) => x.id === 'puntentelling').talen[code].pad;
        if (!s.includes(`${gids}/#safety-cars"`)) fout.safety.push(`${slug} ${code}: geen link naar de tabel van alle circuits`);
      } else fout.safety.push(`${slug}: circuit ${r.circuit} niet in circuits.json`);
    }
  }
  check('de tijden: elke sessie op volgorde, in UTC en in Nederlandse tijd, en de starttijd van de race in het korte antwoord',
    fout.tijden.length === 0, fout.tijden.slice(0, 3).join(' | '));
  check('de top 10 van vorig jaar zoals in de gegevens, de winnaar in de tekst, en de uitslag van dit jaar alleen als die er is',
    fout.top.length === 0, fout.top.slice(0, 3).join(' | '));
  check('de safety cars per jaar zoals in circuits.json, met een link naar de tabel van alle circuits',
    fout.safety.length === 0, fout.safety.slice(0, 3).join(' | '));
  check('de SportsEvent loopt van de eerste sessie tot het einde van de race', fout.evenement.length === 0, fout.evenement.join(' '));

  // ---- 6. het overzicht en de links ernaartoe ----------------------------------------------
  const overzicht = RACEPAGINAS.find((pg) => pg.id === 'races');
  const opDatum = [...paginas].sort((a, b) => a.evenement.start.localeCompare(b.evenement.start)).map((pg) => pg.id);
  check('het overzicht noemt elke racepagina, op datum', JSON.stringify(overzicht?.lijst) === JSON.stringify(opDatum), overzicht?.lijst?.join(' '));
  const mis = [];
  for (const code of ['nl', 'en']) {
    const hier = overzicht.talen[code].pad;
    const html = lees(hier);
    for (const pg of paginas) if (!html.includes(`href="../${code === 'en' ? '../' : ''}${pg.talen[code].pad}/"`)) mis.push(`${code}: ${pg.id} niet gelinkt`);
    const naarOverzicht = (van) => lees(van).includes(`${hier}/"`);
    if (!naarOverzicht(teksten[code].pad || '.')) mis.push(`${code}: de voorpagina linkt niet naar het overzicht`);
    for (const pg of [...PAGINAS, ...paginas]) if (pg.talen[code] && !naarOverzicht(pg.talen[code].pad)) mis.push(`${code}: ${pg.id} linkt niet naar het overzicht`);
  }
  check('het overzicht linkt elke racepagina, en de voorpagina, de gidsen en de racepagina\'s linken naar het overzicht (NL en EN)',
    mis.length === 0, mis.slice(0, 4).join(' | '));

  // ---- 7. geen vraag uit de vragenlijst ---------------------------------------------------------
  const sleutel = (x) => x.toLowerCase().replace(/[?!.,:;'"()]/g, ' ').split(/\s+/).filter(Boolean).join(' ');
  const dubbel = RACEPAGINAS.flatMap((pg) => Object.entries(pg.talen).flatMap(([code, t]) => t.secties
    .filter((s) => VRAGEN.some((v) => v.taal === code && [v.vraag, ...v.varianten].some((w) => sleutel(w) === sleutel(s.vraag))))
    .map((s) => `${code}: ${s.vraag}`)));
  check('geen vraag op een racepagina staat ook in de vragenlijst', dubbel.length === 0, dubbel.join(' | '));

  // ---- 8. llms.txt ------------------------------------------------------------------------------
  const llms = readFileSync(join(wortel, 'llms.txt'), 'utf8');
  const blok = llms.split('\n## Race pages\n')[1]?.split('\n## ')[0] ?? '';
  check('llms.txt noemt elke racepagina onder "Race pages", Engels eerst met de Nederlandse erachter',
    paginas.every((pg) => blok.includes(`(https://predicttherace.com/${pg.talen.en.pad}/)`) && blok.includes(`(https://predicttherace.com/${pg.talen.nl.pad}/)`)),
    blok.split('\n').filter(Boolean).length + ' regels');
}

process.exit(afronden() ? 0 : 1);
