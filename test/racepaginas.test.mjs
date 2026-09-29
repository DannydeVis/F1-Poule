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
//      in Nederlandse tijd, hier opnieuw uitgerekend. De vraag erboven is
//      wanneer het voorspellen sluit ("Wanneer sluit het voorspellen voor de GP
//      van Singapore?"), niet hoe laat de race begint; het korte antwoord
//      noemt wanneer de kwalificatie en de race op slot gaan.
//   4. De top 10 van vorig jaar, race en kwalificatie, zoals in de gegevens;
//      de uitslag van dit jaar alleen als die er is.
//   5. De safety cars per jaar zoals in site/data/circuits.json, met een link
//      naar de tabel van alle circuits in de gids over de puntentelling.
//   6. Het overzicht noemt en linkt elke racepagina op datum, en de voorpagina
//      en elke gids linken naar het overzicht (NL en EN).
//   7. Geen vraag op een racepagina staat ook in de vragenlijst: een race
//      concurreert niet met een gids.
//   8. llms.txt noemt de racepagina's.
//   9. Hoe vaak de polesitter won, per circuit tegen alle circuits, uit
//      site/data/circuits.json: alleen races met pole en winnaar, en zonder die
//      gegevens geen sectie.
//  10. De top 10 van elke vrije training, alleen tijdens het weekend: zodra er
//      een is, tot de uitslag van de race er staat.
//  11. Met gegevens die er nog niet zijn (pole, vrije trainingen), in een kopie
//      van de repo door de generator: de punten uit de app in het korte
//      antwoord, de tabellen, en in de browser leesbaar en passend op 360
//      pixels.

import { readFileSync, writeFileSync, cpSync, mkdtempSync, rmSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { maakControle, wortel, CONTRAST } from './hulp.mjs';
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
const naamVan = (x) => x.naam ?? x.code ?? `#${x.nr}`;
// Races met pole en winnaar (poleWon ja of nee), zoals de pagina ze telt.
const metPole = (perRace = []) => perRace.filter((x) => typeof x.poleWon === 'boolean');
const IDS = { nl: { training: 'vrije-trainingen', pole: 'pole', safety: 'safety-cars' }, en: { training: 'practice', pole: 'pole', safety: 'safety-cars' } };

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

  // 10. de vrije trainingen
  const ander = top.map((x, i) => ({ ...x, naam: `Snelle ${i + 1}`, team: i ? 'Team' : null }));
  const vt = [{ naam: 'Practice 1', top }, { naam: 'Practice 2', top: ander }, { naam: 'Practice 3', top: [] }];
  const bouw = (extra) => bouwRacepaginas({ ...data, races: [race(a.slug, a.circuit, extra)] }, null)[0];
  const tijdensWeekend = bouw({ vrijeTrainingen: vt, uitslag: { kwalificatie: top, race: null } });
  const nl = tijdensWeekend.talen.nl.secties.find((x) => x.id === 'vrije-trainingen');
  const en = tijdensWeekend.talen.en.secties.find((x) => x.id === 'practice');
  check('tijdens het weekend de vrije trainingen, direct na de tijden, in NL en EN',
    tijdensWeekend.talen.nl.secties.map((x) => x.id).join() === 'tijden,vrije-trainingen,vorig-jaar' && !!en,
    tijdensWeekend.talen.nl.secties.map((x) => x.id).join());
  check('per training een tabel met zijn top 10, zonder de training zonder uitslag',
    nl?.tabellen?.length === 2 && JSON.stringify(nl.tabellen.map((t) => t.rijen)) === JSON.stringify([top, ander].map((l) => l.map((x) => [String(x.plek), x.naam, x.team ?? ''])))
      && nl.tabellen.map((t) => t.bijschrift).join() === 'Vrije training 1: de top 10,Vrije training 2: de top 10'
      && en.tabellen.map((t) => t.bijschrift).join() === 'Practice 1: the top 10,Practice 2: the top 10', nl?.tabellen?.map((t) => t.bijschrift).join());
  check('het korte antwoord noemt de snelste van elke training (met team, en zonder als het team onbekend is)',
    /In de eerste vrije training was Coureur 1 \(Team\) het snelst\. In de tweede vrije training was Snelle 1 het snelst\./.test(nl?.kort)
      && /In first practice, Coureur 1 \(Team\) was fastest\. In second practice, Snelle 1 was fastest\./.test(en?.kort), nl?.kort);
  check('na de race niet meer: dan staat de uitslag er', bouw({ vrijeTrainingen: vt, uitslag: { kwalificatie: top, race: top } })
    .talen.nl.secties.map((x) => x.id).join() === 'tijden,uitslag,vorig-jaar'
      && bouw({ vrijeTrainingen: [{ naam: 'Practice 1', top: [] }] }).talen.nl.secties.map((x) => x.id).join() === 'tijden,vorig-jaar'
      && bouw({}).talen.en.secties.map((x) => x.id).join() === 'times,last-year');

  // 9. pole, met een eigen circuits.json
  const pr = (jaar, pole, winnaar) => ({ jaar, datum: `${jaar}-06-01`, sessie: jaar, safetyCars: 1, rodeVlag: false,
    pole: pole ? { nr: pole, naam: `Coureur ${pole}` } : null, winnaar: winnaar ? { nr: winnaar, naam: `Coureur ${winnaar}` } : null,
    poleWon: pole && winnaar ? pole === winnaar : null });
  const circuit = (nr, perRace) => ({ circuit: nr, naam: 'Baan', locatie: 'Plaats', land: 'Land', races: perRace.length,
    metSafetyCar: perRace.length, safetyCars: perRace.length, metRodeVlag: 0, perRace });
  const circuits = { vanaf: 2023, races: 7, circuits: [circuit(a.circuit, [pr(2023, '1', '1'), pr(2024, '4', '1'), pr(2025, null, '4')]),
    circuit(999, [pr(2023, '1', '1'), pr(2024, '1', '1'), pr(2025, '4', '16'), pr(2026, '81', '81')])] };
  const metCijfers = bouwRacepaginas({ ...data, races: [race(a.slug, a.circuit)] }, circuits)[0];
  const pnl = metCijfers.talen.nl.secties.find((x) => x.id === 'pole');
  const pen = metCijfers.talen.en.secties.find((x) => x.id === 'pole');
  check('pole direct na de safety cars, in NL en EN', metCijfers.talen.nl.secties.map((x) => x.id).join() === 'tijden,vorig-jaar,safety-cars,pole' && !!pen,
    metCijfers.talen.nl.secties.map((x) => x.id).join());
  check('alleen races met pole en winnaar: hier 1 van de 2, over alle circuits 4 van de 6',
    /won de polesitter 1 van de 2 races sinds 2023; over alle circuits was dat 4 van de 6\./.test(pnl?.kort)
      && /the polesitter won 1 of the 2 races since 2023; across all circuits it was 4 of 6\./.test(pen?.kort), pnl?.kort);
  check('de punten voor pole en winnaar laat de pagina aan de generator (uit de app)', /\{pole\} en \{winnaar\} punten/.test(pnl?.kort)
    && /\{pole\} and \{winnaar\} points/.test(pen?.kort), pnl?.kort);
  check('de tabel: per jaar pole en winnaar, zonder het jaar waarin een van de twee ontbreekt',
    JSON.stringify(pnl?.tabel?.rijen) === JSON.stringify([['2023', 'Coureur 1', 'Coureur 1'], ['2024', 'Coureur 4', 'Coureur 1']])
      && pnl.tabel.kop.join() === 'Jaar,Pole,Winnaar' && pen.tabel.kop.join() === 'Year,Pole,Winner', JSON.stringify(pnl?.tabel?.rijen));
  const oud = { ...circuits, circuits: circuits.circuits.map((c) => ({ ...c, perRace: c.perRace.map(({ jaar, datum, sessie, safetyCars, rodeVlag }) => ({ jaar, datum, sessie, safetyCars, rodeVlag })) })) };
  const zonder = bouwRacepaginas({ ...data, races: [race(a.slug, a.circuit)] }, oud)[0];
  const alleenOnbekend = bouwRacepaginas({ ...data, races: [race(a.slug, a.circuit)] },
    { ...circuits, circuits: [circuit(a.circuit, [pr(2024, null, '1'), pr(2025, '4', null)])] })[0];
  check('zonder pole-gegevens (een ouder circuits.json, of alleen races waarin er een ontbreekt) geen sectie',
    zonder.talen.nl.secties.map((x) => x.id).join() === 'tijden,vorig-jaar,safety-cars'
      && alleenOnbekend.talen.en.secties.map((x) => x.id).join() === 'times,last-year,safety-cars', zonder.talen.nl.secties.map((x) => x.id).join());
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

  const fout = { tijden: [], top: [], safety: [], evenement: [], pole: [], training: [] };
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
      const kwali = r.sessies.find((s) => s.naam === 'Qualifying');
      if (kwali && !kort.includes(tijd(kwali.start, code === 'nl' ? 'Europe/Amsterdam' : 'UTC'))) fout.tijden.push(`${slug} ${code}: kort zonder de kwalificatie`);
      const naamKort = RACES.find((x) => x.slug === slug)?.[code]?.kort;
      const vraagTijden = ontdoe(tijden.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? '');
      const vraagHoort = code === 'nl' ? `Wanneer sluit het voorspellen voor de ${naamKort}?` : `When do predictions close for the ${naamKort}?`;
      if (vraagTijden !== vraagHoort) fout.tijden.push(`${slug} ${code}: de vraag is "${vraagTijden}"`);
      if (code === 'nl' && (/een virtuele meegeteld/.test(html) || !/de virtuele safety car meegeteld/.test(html))) fout.safety.push(`${slug} nl: "een virtuele meegeteld"`);
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
      // 9. pole
      const p = sectie(html, IDS[code].pole);
      const hier = metPole(circuit?.perRace);
      if (!hier.length) { if (p) fout.pole.push(`${slug} ${code}: sectie zonder gegevens`); } else {
        const rijenPole = tabellen(p)[0]?.rijen ?? [];
        if (JSON.stringify(rijenPole) !== JSON.stringify(hier.map((x) => [String(x.jaar), naamVan(x.pole), naamVan(x.winnaar)]))) fout.pole.push(`${slug} ${code}: tabel`);
        const alles = CIRCUITDATA.circuits.flatMap((c) => metPole(c.perRace));
        const woord = code === 'nl' ? 'van de' : 'of the';
        const tekst = ontdoe(p);
        if (!tekst.includes(`${hier.filter((x) => x.poleWon).length} ${woord} ${hier.length} races`)
          || !tekst.includes(`${alles.filter((x) => x.poleWon).length} ${code === 'nl' ? 'van de' : 'of'} ${alles.length}`)) fout.pole.push(`${slug} ${code}: tekst`);
      }
      // 10. de vrije trainingen
      const t = sectie(html, IDS[code].training);
      const trainingen = (r.vrijeTrainingen ?? []).filter((x) => x.top?.length);
      const hoort = trainingen.length > 0 && !(r.uitslag?.race?.length >= 3);
      if (!!t !== hoort) fout.training.push(`${slug} ${code}: vrije trainingen ${t ? 'staan er' : 'ontbreken'}`);
      if (t && JSON.stringify(tabellen(t).map((x) => x.rijen)) !== JSON.stringify(trainingen.map((x) => top(x.top)))) fout.training.push(`${slug} ${code}: tabellen`);
    }
  }
  check('de tijden: elke sessie op volgorde, in UTC en in Nederlandse tijd, onder de vraag wanneer het voorspellen sluit, met de kwalificatie en de race in het korte antwoord',
    fout.tijden.length === 0, fout.tijden.slice(0, 3).join(' | '));
  check('de top 10 van vorig jaar zoals in de gegevens, de winnaar in de tekst, en de uitslag van dit jaar alleen als die er is',
    fout.top.length === 0, fout.top.slice(0, 3).join(' | '));
  check('de safety cars per jaar zoals in circuits.json, met een link naar de tabel van alle circuits',
    fout.safety.length === 0, fout.safety.slice(0, 3).join(' | '));
  check('de SportsEvent loopt van de eerste sessie tot het einde van de race', fout.evenement.length === 0, fout.evenement.join(' '));
  const polesitter = CIRCUITDATA?.circuits.some((c) => metPole(c.perRace).length);
  check(polesitter ? 'hoe vaak de polesitter won, zoals in circuits.json, per circuit en over alle circuits'
    : 'circuits.json heeft nog geen pole en winnaar: nergens een sectie over de polesitter', fout.pole.length === 0, fout.pole.slice(0, 3).join(' | '));
  check('de vrije trainingen alleen tijdens het weekend, met de top 10 zoals in de gegevens',
    fout.training.length === 0, fout.training.slice(0, 3).join(' | '));

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

// ---- 11. met gegevens die er nog niet zijn, in een kopie door de generator ----------------------
// Pole en de vrije trainingen komen pas in de bestanden als de workflow ze
// ophaalt. Hier alvast: de eerste racepagina met een training en met pole bij
// elke editie, door maak-site, en dan de pagina zelf.
if (RACEDATA && CIRCUITDATA && paginas.length) {
  const kopie = mkdtempSync(join(tmpdir(), 'racepaginas-'));
  cpSync(wortel, kopie, { recursive: true, filter: (bron) => !/[\\/](\.git|node_modules)([\\/]|$)/.test(bron.slice(wortel.length)) });
  const slug = paginas[0].id.replace('race-', '');
  const r = RACEDATA.races.find((x) => x.slug === slug);
  const top = r.vorige.race;
  const races = { ...RACEDATA, races: RACEDATA.races.map((x) => (x.slug === slug ? { ...x, uitslag: null,
    vrijeTrainingen: [{ naam: 'Practice 1', top }, { naam: 'Practice 2', top: [...top].reverse().map((y, i) => ({ ...y, plek: i + 1 })) }] } : x)) };
  // Pole: de winnaar van de kwalificatie van vorig jaar; winnaar: de race.
  const iemand = (x) => ({ nr: x.nr, naam: x.naam });
  const circuits = { ...CIRCUITDATA, circuits: CIRCUITDATA.circuits.map((c) => ({ ...c, perRace: c.perRace.map((x, i) => {
    const pole = iemand((i % 2 ? r.vorige.race : r.vorige.kwalificatie ?? top)[0]);
    const winnaar = iemand(top[i % 3 === 2 ? 1 : 0]);
    return { ...x, pole, winnaar, poleWon: pole.nr === winnaar.nr };
  }) })) };
  writeFileSync(join(kopie, 'site', 'data', `races-${RACE_JAAR}.json`), `${JSON.stringify(races, null, 2)}\n`);
  writeFileSync(join(kopie, 'site', 'data', 'circuits.json'), `${JSON.stringify(circuits, null, 2)}\n`);
  const maak = spawnSync(process.execPath, [join(kopie, 'scripts', 'maak-site.mjs')], { encoding: 'utf8', env: { ...process.env, VANDAAG: '2026-09-28' } });
  const app = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
  const punten = (id) => app.match(new RegExp(`\\{ id:'${id}',\\s*naam:'[^']*',\\s*punten:(\\d+)`))?.[1];
  const fout = [];
  if (maak.status !== 0) fout.push(`maak-site: ${maak.stderr.split('\n').find(Boolean)}`);
  const pad = (code) => paginas[0].talen[code].pad;
  for (const code of maak.status === 0 ? ['nl', 'en'] : []) {
    const html = readFileSync(join(kopie, ...pad(code).split('/'), 'index.html'), 'utf8');
    const p = sectie(html, IDS[code].pole);
    const kort = ontdoe(p.match(/<p class="kort">([\s\S]*?)<\/p>/)?.[1] ?? '');
    const woord = code === 'nl' ? 'punten' : 'points';
    if (!kort.includes(`${punten('pole')} ${code === 'nl' ? 'en' : 'and'} ${punten('winnaar')} ${woord}`) || /[{}]/.test(kort)) fout.push(`${code}: pole zonder de punten uit de app: ${kort}`);
    const circuit = circuits.circuits.find((c) => c.circuit === r.circuit);
    if (JSON.stringify(tabellen(p)[0]?.rijen) !== JSON.stringify(circuit.perRace.map((x) => [String(x.jaar), x.pole.naam, x.winnaar.naam]))) fout.push(`${code}: pole-tabel`);
    const t = sectie(html, IDS[code].training);
    if (tabellen(t).length !== 2 || tabellen(t)[1].rijen[0][1] !== top.at(-1).naam) fout.push(`${code}: vrije trainingen`);
    const volgorde = [...html.matchAll(/<section class="vraag" id="([^"]+)">/g)].map((m) => m[1]);
    if (volgorde.indexOf(IDS[code].training) !== 1 || volgorde.indexOf(IDS[code].pole) !== volgorde.indexOf(IDS[code].safety) + 1) fout.push(`${code}: volgorde ${volgorde.join()}`);
  }
  check('in een kopie met pole en vrije trainingen: de punten uit de app in het korte antwoord, de tabellen, op hun plek',
    fout.length === 0, fout.slice(0, 3).join(' | '));

  // In de browser: leesbaar en passend op 360 pixels.
  const breed = [];
  if (maak.status === 0) {
    const server = createServer((req, res) => {
      let bestand = join(kopie, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (existsSync(bestand) && statSync(bestand).isDirectory()) bestand = join(bestand, 'index.html');
      if (!existsSync(bestand)) { res.writeHead(404); res.end(); return; }
      const type = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', woff2: 'font/woff2', png: 'image/png',
        webp: 'image/webp', svg: 'image/svg+xml' }[bestand.split('.').pop()] ?? 'application/octet-stream';
      res.writeHead(200, { 'content-type': type });
      res.end(readFileSync(bestand));
    });
    await new Promise((klaar) => server.listen(0, '127.0.0.1', klaar));
    const browser = await chromium.launch();
    const page = await browser.newPage();
    for (const code of ['nl', 'en']) {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`http://127.0.0.1:${server.address().port}/${pad(code)}/`);
      await page.waitForLoadState('networkidle');
      for (const schema of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: schema });
        const slecht = await page.evaluate(CONTRAST);
        if (slecht.length) breed.push(`${code} ${schema}: ${slecht.slice(0, 2).join(', ')}`);
      }
      await page.setViewportSize({ width: 360, height: 780 });
      const w = await page.evaluate(() => document.documentElement.scrollWidth);
      if (w > 360) breed.push(`${code}: ${w} pixels breed`);
    }
    await browser.close();
    server.close();
  }
  check('en in de browser leesbaar in licht en donker, en passend op 360 pixels', maak.status === 0 && breed.length === 0, breed.join(' | '));
  rmSync(kopie, { recursive: true, force: true });
}

process.exit(afronden() ? 0 : 1);
