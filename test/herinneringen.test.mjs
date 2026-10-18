// Wie krijgt er een seintje voor een deadline, en vooral: wie niet.
//
// Een herinnering te veel is vervelend, een herinnering te weinig maakt de
// hele functie zinloos, en allebei merk je pas op iemands telefoon. Daarom is
// de regel een losse functie zonder netwerk erin, en staat hier wat hij moet
// doen en laten.
//
// Draait zonder browser, net als test/push.test.mjs: er valt hier niets te
// klikken, alleen na te rekenen.

import { wieKrijgtEenSeintje, overTekst, VENSTER_UREN, volgendeWekker } from '../scripts/herinneringen.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('herinneringen voor de deadline');

const NU = Date.parse('2026-05-01T12:00:00Z');
const over = (uren) => new Date(NU + uren * 3600e3).toISOString();

const race = (over_) => ({
  id: 1, name: 'Suzuka', round: 3,
  deadline_quali: over(over_), deadline_race: over(over_ + 24), deadline_sprint: null,
});
const danny = { endpoint: 'https://push/1', member_id: 'lid-1', pool_id: 'pool-1',
                p256dh: 'x', auth: 'y', laatst: null };

const roep = (opties) => wieKrijgtEenSeintje({ nu: NU, ...opties });

// ---- wanneer wél -------------------------------------------------------
const binnen = roep({ races: [race(2)], abonnementen: [danny] });
check('een deadline over twee uur levert een seintje op', binnen.length === 1,
  JSON.stringify(binnen.map((x) => x.bericht.titel)));
check('en de melding zegt welke race en welke sessie',
  binnen[0]?.bericht.titel === 'Suzuka: kwalificatie sluit over 2 uur',
  binnen[0]?.bericht.titel);
check('met een tag per sessie, zodat een tweede melding de eerste vervangt',
  binnen[0]?.tag === '1:quali', binnen[0]?.tag);

// ---- wanneer niet ------------------------------------------------------
check('een deadline die nog ver weg is nog niet',
  roep({ races: [race(VENSTER_UREN + 1)], abonnementen: [danny] }).length === 0);
check('een deadline die al voorbij is ook niet',
  roep({ races: [race(-1)], abonnementen: [danny] }).length === 0);
check('een afgelaste race nooit',
  roep({ races: [{ ...race(2), afgelast: true }], abonnementen: [danny] }).length === 0);
check('zonder abonnementen is er niemand om te bereiken',
  roep({ races: [race(2)], abonnementen: [] }).length === 0);

// Wie het al ingevuld heeft hoeft niet herinnerd te worden. Dit is het punt
// waar een herinnering van nuttig naar irritant kantelt.
check('wie de kwalificatie al invulde krijgt niets',
  roep({ races: [race(2)], abonnementen: [danny],
         antwoorden: [{ race_id: 1, member_id: 'lid-1', question_id: 'quali_top10' }] })
    .length === 0);
check('maar een antwoord van iemand anders telt niet mee',
  roep({ races: [race(2)], abonnementen: [danny],
         antwoorden: [{ race_id: 1, member_id: 'lid-2', question_id: 'quali_top10' }] })
    .length === 1);
check('en een antwoord op een andere vraag ook niet',
  roep({ races: [race(2)], abonnementen: [danny],
         antwoorden: [{ race_id: 1, member_id: 'lid-1', question_id: 'race_top10' }] })
    .length === 1);

// Een poule die de kwalificatie helemaal niet voorspelt hoort er ook geen
// herinnering over te krijgen.
check('een poule die deze vraag niet stelt krijgt er geen melding over',
  roep({ races: [race(2)], abonnementen: [danny],
         poulevragen: [{ pool_id: 'pool-1', question_id: 'race_top10' }] }).length === 0);
check('maar een poule zonder eigen keuze doet aan alles mee',
  roep({ races: [race(2)], abonnementen: [danny], poulevragen: [] }).length === 1);

// ---- niet twee keer dezelfde -------------------------------------------
check('een melding die al gestuurd is komt niet nog een keer',
  roep({ races: [race(2)], abonnementen: [{ ...danny, laatst: '1:quali' }] }).length === 0);
check('maar een andere sessie wel',
  roep({ races: [race(2)], abonnementen: [{ ...danny, laatst: '1:race' }] }).length === 1);

// ---- hooguit één per toestel per ronde ---------------------------------
// Een sprintweekend waarvan de sprint over een uur sluit en de kwalificatie
// over twee. Allebei open, maar je krijgt er één — die het eerst dichtgaat.
const sprintweekend = {
  id: 2, name: 'Austin', round: 19,
  deadline_sprint: over(1), deadline_quali: over(2), deadline_race: over(25),
};
const twee = roep({ races: [sprintweekend], abonnementen: [danny] });
check('twee openstaande sessies leveren één melding op', twee.length === 1,
  JSON.stringify(twee.map((x) => x.tag)));
check('en dat is degene die het eerst sluit', twee[0]?.tag === '2:sprint', twee[0]?.tag);

// Heb je de sprint al ingevuld maar de kwalificatie niet, dan gaat het over de
// kwalificatie.
const naSprint = roep({ races: [sprintweekend], abonnementen: [danny],
  antwoorden: [{ race_id: 2, member_id: 'lid-1', question_id: 'sprint_top10' }] });
check('wie de eerste al deed krijgt de volgende', naSprint[0]?.tag === '2:quali',
  naSprint[0]?.tag);

// ---- meer dan één toestel, meer dan één speler -------------------------
const laptop = { ...danny, endpoint: 'https://push/2' };
const michael = { ...danny, endpoint: 'https://push/3', member_id: 'lid-2' };
const allen = roep({ races: [race(2)], abonnementen: [danny, laptop, michael] });
check('elk toestel krijgt zijn eigen melding', allen.length === 3,
  allen.map((x) => x.abonnement.endpoint).join(', '));
check('en die van Michael gaat over Michael',
  allen.find((x) => x.abonnement.member_id === 'lid-2') !== undefined);

// ---- de tekst ----------------------------------------------------------
check('"zo meteen" onder een kwartier', overTekst(0.1) === 'zo meteen', overTekst(0.1));
check('"over een halfuur" rond het halfuur', overTekst(0.5) === 'over een halfuur', overTekst(0.5));
check('"over een uur" en niet "over 1 uur"', overTekst(1) === 'over een uur', overTekst(1));
check('daarna hele uren', overTekst(2.4) === 'over 2 uur', overTekst(2.4));

// ---- en dat alles ook in het Engels ------------------------------------
// De app vertaalt zichzelf in de browser, maar een push komt uit sync.mjs en
// die heeft er geen. Vandaar de kolom `taal` op het abonnement: de melding
// hoort in dezelfde taal aan te komen als het scherm waarop je hem aanzette.
const engels = { ...danny, taal: 'en' };
const uitEngels = roep({ races: [race(2)], abonnementen: [engels] });
check('een Engels abonnement krijgt een Engelse melding',
  uitEngels[0]?.bericht.titel === 'Suzuka: qualifying closes in 2 hours',
  uitEngels[0]?.bericht.titel);
check('en de tweede regel ook',
  uitEngels[0]?.bericht.tekst === 'You have not filled anything in here yet.',
  uitEngels[0]?.bericht.tekst);

// De racenaam komt van OpenF1 en hoort niet mee te vertalen.
check('de naam van de race blijft staan zoals hij is',
  uitEngels[0]?.bericht.titel.startsWith('Suzuka: '));

// De regel zelf mag niet van taal afhangen: wie een seintje krijgt en waarover
// is precies hetzelfde, alleen de zin eromheen verschilt.
check('de taal verandert niets aan wie er een seintje krijgt',
  uitEngels.length === binnen.length && uitEngels[0]?.tag === binnen[0]?.tag);

const beide = roep({ races: [race(2)],
  abonnementen: [danny, { ...danny, endpoint: 'https://push/9', taal: 'en' }] });
check('twee toestellen van dezelfde speler kunnen elk hun eigen taal hebben',
  beide[0]?.bericht.titel !== beide[1]?.bericht.titel,
  beide.map((x) => x.bericht.titel).join(' | '));

check('"any moment now" onder een kwartier',
  overTekst(0.1, 'en') === 'any moment now', overTekst(0.1, 'en'));
check('"in half an hour" rond het halfuur',
  overTekst(0.5, 'en') === 'in half an hour', overTekst(0.5, 'en'));
check('"in an hour" en niet "in 1 hours"',
  overTekst(1, 'en') === 'in an hour', overTekst(1, 'en'));
check('daarna hele uren, in het meervoud',
  overTekst(2.4, 'en') === 'in 2 hours', overTekst(2.4, 'en'));

// Een abonnement uit de tijd vóór deze kolom heeft geen taal, en een kapotte
// waarde mag niet in een lege melding eindigen. Allebei vallen ze terug op de
// brontaal.
check('zonder taal valt hij terug op Nederlands',
  roep({ races: [race(2)], abonnementen: [danny] })[0]?.bericht.tekst
    === 'Je hebt hier nog niets ingevuld.');
check('en een taal die niet bestaat ook',
  roep({ races: [race(2)], abonnementen: [{ ...danny, taal: 'xx' }] })[0]?.bericht.titel
    === 'Suzuka: kwalificatie sluit over 2 uur');

// Sinds de app ook Duits, Frans, Spaans, Italiaans en Portugees spreekt
// (app/talen/), komt een melding ook in die talen.
const inTaal = (taal) => roep({ races: [race(2)], abonnementen: [{ ...danny, taal }] })[0]?.bericht;
check('in het Duits', inTaal('de')?.titel === 'Suzuka: Qualifying schließt in 2 Stunden'
  && inTaal('de')?.tekst === 'Du hast hier noch nichts getippt.', JSON.stringify(inTaal('de')));
check('en in het Frans, Spaans, Italiaans en Portugees, elk anders',
  new Set(['fr', 'es', 'it', 'pt', 'nl', 'en', 'de'].map((t) => inTaal(t)?.titel)).size === 7,
  ['fr', 'es', 'it', 'pt'].map((t) => inTaal(t)?.titel).join(' | '));

// ---- de wekker -----------------------------------------------------------
// GitHub draait de cron van sync.yml eens per vier uur, niet elk kwartier.
// Zonder wekker valt een venster van drie uur daar vaker tussendoor dan niet.
const wek = (races, nu = NU) => volgendeWekker({ races, nu });
check('de wekker gaat tien minuten na het openen van het venster af',
  wek([race(5)]) === new Date(NU + (5 - VENSTER_UREN) * 3600e3 + 10 * 60e3).toISOString(),
  String(wek([race(5)])));
check('en kiest de vroegste sessie',
  wek([race(8), { ...race(5), id: 2 }]) === wek([race(5)]));
check('een venster dat al open is, is geen wekker meer waard (die sync draait nu)',
  wek([{ ...race(2), deadline_race: null }]) === null, String(wek([{ ...race(2), deadline_race: null }])));
check('maar de volgende sessie wel, ook als die pas morgen is: binnen twaalf uur',
  wek([{ ...race(2), deadline_race: over(14) }]) !== null);
check('en verder dan twaalf uur weg niet',
  wek([{ ...race(2), deadline_race: over(16) }]) === null);
check('een afgelaste race krijgt geen wekker', wek([{ ...race(5), afgelast: true }]) === null);
check('en zonder races ook niet', wek([]) === null);
// Als de wekker-sync draait, staat de klok op het wekmoment. Dan hoort de
// herinnering mee te gaan, anders was de hele wekker voor niets.
const wekmoment = Date.parse(wek([race(5)]));
check('op het wekmoment valt de deadline binnen het venster',
  roep({ races: [race(5)], abonnementen: [danny], nu: wekmoment }).length === 1);

// En de draad van sync naar wekker naar sync.
const yml = (f) => readFileSync(join(wortel, '.github', 'workflows', f), 'utf8');
const sync = yml('sync.yml');
const wekker = yml('wekker.yml');
check('sync.yml geeft VAPID_PRIVE en PUSH_CONTACT door',
  /VAPID_PRIVE: \$\{\{ secrets\.VAPID_PRIVE \}\}/.test(sync)
    && /PUSH_CONTACT: \$\{\{ secrets\.PUSH_CONTACT \}\}/.test(sync));
check('sync.yml start de wekker met de tijd die de sync doorgeeft',
  sync.includes('steps.sync.outputs.wekker') && /gh workflow run wekker\.yml/.test(sync)
    && /actions: write/.test(sync));
check('wekker.yml start daarna de sync, met hoogstens één wekker tegelijk',
  /gh workflow run sync\.yml/.test(wekker) && /cancel-in-progress: true/.test(wekker)
    && /workflow_dispatch/.test(wekker));
check('en slaapt nooit langer dan een job mag duren',
  /19800/.test(wekker) && /timeout-minutes: 350/.test(wekker));
check('de sync schrijft de wekker naar GITHUB_OUTPUT',
  /GITHUB_OUTPUT.*wekker=/s.test(readFileSync(join(wortel, 'scripts', 'sync.mjs'), 'utf8')));

process.exit(afronden() ? 0 : 1);
