// Wie krijgt er een seintje voor een deadline, en vooral: wie niet.
//
// Een herinnering te veel is vervelend, een herinnering te weinig maakt de
// hele functie zinloos, en allebei merk je pas op iemands telefoon. Daarom is
// de regel een losse functie zonder netwerk erin, en staat hier wat hij moet
// doen en laten.
//
// Draait zonder browser, net als test/push.test.mjs: er valt hier niets te
// klikken, alleen na te rekenen.

import { wieKrijgtEenSeintje, overTekst, VENSTER_UREN } from '../scripts/herinneringen.mjs';
import { maakControle } from './hulp.mjs';

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

process.exit(afronden() ? 0 : 1);
