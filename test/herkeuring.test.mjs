// Een uitslag die achteraf verandert.
//
// "Belangrijk dat hij een dag na de race ook nog gesynchroniseerd wordt, omdat
// er wel eens achteraf wat veranderd."
//
// Dat deed de sync niet. De voorwaarde was `if (!race.race_result ...)`: één
// keer opgehaald, daarna nooit meer gekeken. Een tijdstraf na afloop verandert
// de klassering, een diskwalificatie haalt iemand er helemaal uit, en een
// geschrapte kwalificatietijd schuift de grid op. Niets daarvan kwam ooit in de
// app, terwijl het de punten van iedereen in de poule verandert.
//
// Wat hier vastligt is vooral wanneer hij zijn mond houdt: buiten de vensters
// mag hij niet opnieuw gaan vragen, en een 404 tijdens een herkeuring mag nooit
// als bewijs van een afgelaste race gelden — dat zou een allang gereden ronde
// voor de hele poule wegvagen omdat OpenF1 even hikte.

import { maakControle } from './hulp.mjs';
import { opnieuwNakijken, zelfdeWaarde, veiligeVervanging, HERCONTROLE_VENSTERS }
  from '../scripts/uitslagen.mjs';

const { check, afronden } = maakControle('een uitslag die achteraf verandert');

const START = new Date('2026-09-13T13:00:00Z').getTime();
const race = (extra) => ({ race_key: 11369, deadline_race: new Date(START).toISOString(),
                           afgelast: false, ...extra });
const na = (uren) => START + uren * 3600e3;

// ------------------------------------------------------------------
//  De vensters staan waar de beslissingen vallen
// ------------------------------------------------------------------
check('tijdens de race zelf kijken we niets na',
  opnieuwNakijken(race(), na(1)) === false);
check('twee uur na de start wel — de race is dan net uit',
  opnieuwNakijken(race(), na(2)) === true);
check('en vier uur erna ook, daar vallen de stewardsbeslissingen',
  opnieuwNakijken(race(), na(4)) === true);
check('acht uur erna is het eerste venster voorbij',
  opnieuwNakijken(race(), na(8)) === false);
check("'s nachts ertussenin dus niet",
  opnieuwNakijken(race(), na(14)) === false);

check('een dag later staat hij weer aan — dat is het punt van de vraag',
  opnieuwNakijken(race(), na(24)) === true);
check('het tweede venster begint na twintig uur',
  opnieuwNakijken(race(), na(20)) === true
    && opnieuwNakijken(race(), na(19.5)) === false);
check('en loopt tot tweeëndertig uur',
  opnieuwNakijken(race(), na(31.9)) === true
    && opnieuwNakijken(race(), na(32)) === false);
check('twee dagen later is het klaar',
  opnieuwNakijken(race(), na(48)) === false);

// De vensters zijn uren breed en niet minuten, met reden: GitHub levert een
// geplande run niet betrouwbaar af, dus een smal venster missen we gewoon.
const breedtes = HERCONTROLE_VENSTERS.map(([v, t]) => t - v);
check('elk venster is minstens zes uur breed', breedtes.every(b => b >= 6),
  JSON.stringify(HERCONTROLE_VENSTERS));

// ------------------------------------------------------------------
//  Wanneer hij hoe dan ook niets nakijkt
// ------------------------------------------------------------------
check('een afgelaste race niet', opnieuwNakijken(race({ afgelast: true }), na(4)) === false);
check('een race zonder racesleutel niet', opnieuwNakijken(race({ race_key: null }), na(4)) === false);
check('en geen race is ook niets',
  opnieuwNakijken(null, na(4)) === false && opnieuwNakijken(undefined, na(4)) === false);

// Dezelfde valkuil als bij lijktAfgelast() en deelnemersUit(): new Date(null)
// is 1 januari 1970. Dat is een keurig eindig getal, en het ligt ruim
// tweeëndertig uur terug — zonder de leegtecontrole zou elke race zonder
// geplande tijd hier voorgoed buiten de vensters vallen, of er juist in.
check('een race zonder geplande tijd wordt niet nagekeken',
  opnieuwNakijken(race({ deadline_race: null }), na(4)) === false);
check('een lege tekst ook niet',
  opnieuwNakijken(race({ deadline_race: '' }), na(4)) === false);
check('en een onleesbare datum ook niet',
  opnieuwNakijken(race({ deadline_race: 'zondagmiddag' }), na(4)) === false);

// ------------------------------------------------------------------
//  Alleen wegschrijven wat echt anders is
// ------------------------------------------------------------------
// Zonder deze controle schrijft elke herkeuring dezelfde uitslag terug, en
// meldt de log "bijgewerkt" terwijl er niets gebeurd is. Dan is die melding
// niets meer waard op het moment dat er wél iets verandert.
check('twee gelijke uitslagen zijn gelijk',
  zelfdeWaarde(['1', '2', '3'], ['1', '2', '3']) === true);
check('een andere volgorde is een andere uitslag',
  zelfdeWaarde(['1', '2', '3'], ['1', '3', '2']) === false);
check('een coureur eruit is een andere uitslag',
  zelfdeWaarde(['1', '2', '3'], ['1', '2']) === false);
check('getallen die gelijk zijn', zelfdeWaarde(3, 3) === true);
check('en getallen die dat niet zijn', zelfdeWaarde(3, 4) === false);

// Nul en false zijn echte uitslagen: nul safety cars, geen rode vlag. Die
// mogen niet als "leeg dus gelijk" of als "anders dus schrijven" gelden.
check('nul tegen nul is gelijk', zelfdeWaarde(0, 0) === true);
check('false tegen false is gelijk', zelfdeWaarde(false, false) === true);
check('nul tegen null is niet gelijk', zelfdeWaarde(0, null) === false);
check('false tegen null is niet gelijk', zelfdeWaarde(false, null) === false);
check('nul tegen één is niet gelijk', zelfdeWaarde(0, 1) === false);

// Een veld dat nog leeg is tegen een nieuwe waarde: dat is de gewone eerste
// keer ophalen, en dat moet als verandering tellen.
check('leeg tegen een uitslag is een verandering',
  zelfdeWaarde(null, ['1', '2']) === false
    && zelfdeWaarde(undefined, ['1', '2']) === false);
check('en twee keer leeg is geen verandering',
  zelfdeWaarde(null, null) === true && zelfdeWaarde(undefined, undefined) === true);

// Een tekst tegen een lijst met dezelfde inhoud is niet hetzelfde. JSON.stringify
// alleen zou hier twee verschillende dingen gelijk kunnen noemen.
check('een lijst is niet gelijk aan een los getal',
  zelfdeWaarde(['3'], '3') === false);

// ------------------------------------------------------------------
//  Het geval waar dit allemaal voor is
// ------------------------------------------------------------------
// Monza 2026: stel dat de nummer drie vier uur na afloop een tijdstraf krijgt
// en naar P5 zakt. De sync moet dat oppikken en het moet als verandering gelden.
const eerst = ['1', '81', '16', '63', '44'];
const later = ['1', '81', '63', '44', '16'];
check('vier uur na de race kijkt hij na', opnieuwNakijken(race(), na(4)) === true);
check('en de nieuwe klassering telt als verandering',
  zelfdeWaarde(eerst, later) === false);
check('terwijl een onveranderde klassering niets oplevert',
  zelfdeWaarde(eerst, [...eerst]) === true);

// ------------------------------------------------------------------
//  Een half antwoord mag een goede uitslag niet wegschrijven
// ------------------------------------------------------------------
// Dit is het gevaar dat de herkeuring zelf meebrengt. uitslag() geeft een lege
// lijst terug als OpenF1 rijen zonder positie stuurt, en leeg() vindt [] niet
// leeg — dus zonder deze controle overschrijft één storing bij OpenF1 een
// complete klassering, en klopt de stand van de hele poule niet meer.
const twintig = Array.from({ length: 20 }, (_, i) => String(i + 1));

check('een lege uitslag vervangt nooit iets',
  veiligeVervanging(twintig, []) === false
    && veiligeVervanging(twintig, null) === false
    && veiligeVervanging(twintig, undefined) === false);
check('en vervangt ook niets als er nog niets stond',
  veiligeVervanging(null, []) === false);

check('een even lange uitslag mag',
  veiligeVervanging(twintig, [...twintig].reverse()) === true);
check('eentje korter mag ook — dat is een diskwalificatie',
  veiligeVervanging(twintig, twintig.slice(0, 19)) === true);
check('twee korter nog net',
  veiligeVervanging(twintig, twintig.slice(0, 18)) === true);
check('drie korter niet, dat is een storing',
  veiligeVervanging(twintig, twintig.slice(0, 17)) === false);
check('en vijf van de twintig al helemaal niet',
  veiligeVervanging(twintig, twintig.slice(0, 5)) === false);

check('langer mag altijd — dan had OpenF1 eerst een half antwoord',
  veiligeVervanging(twintig.slice(0, 5), twintig) === true);
check('de eerste keer ophalen mag hoe dan ook',
  veiligeVervanging(null, twintig) === true
    && veiligeVervanging([], twintig) === true);

process.exit(afronden() ? 0 : 1);
