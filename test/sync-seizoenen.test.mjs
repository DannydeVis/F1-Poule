// Welke seizoenen de sync onder handen neemt, over de jaarwisseling heen.
//
// Tot nu toe stond de sync vast op 2026. Zonder deze regel was de kalender
// van 2027 nooit opgehaald, en wie na de finale op "Begin aan 2027" drukte
// kwam in een lege kalender. Hier wordt het seizoen van oktober tot januari
// nagespeeld zonder op december te wachten.
//
// Draait zonder browser, net als test/herinneringen.test.mjs.

import { seizoenPlan, agendaSeizoenen, nogWerk, lijstKanWachten, huidigSeizoen, VOORUIT_DAGEN, NAZORG_DAGEN }
  from '../scripts/seizoenen.mjs';
import { VERVERS_VENSTER_DAGEN } from '../scripts/uitslagen.mjs';
import { maakControle } from './hulp.mjs';

const { check, afronden } = maakControle('seizoenen voor de sync');

const DAG = 24 * 3600 * 1000;
const FINALE = Date.parse('2026-12-06T13:00:00Z');

// Een seizoen van vier races: de laatste is de finale. Wat er gereden is
// heeft een uitslag.
const seizoen = (jaar, laatste, { gereden = 0, afgelast = [] } = {}) =>
  [3, 2, 1, 0].map((wekenVoor, i) => {
    const start = laatste - wekenVoor * 7 * DAG;
    return {
      season: jaar, round: i + 1,
      deadline_race: new Date(start).toISOString(),
      race_result: i < gereden ? ['1', '4', '16'] : null,
      afgelast: afgelast.includes(i + 1),
    };
  });

const plan = (races, nu) => seizoenPlan(races, nu);
const txt = (p) => `uitslagen [${p.uitslagen}] kalender [${p.kalender}]`;

// ---- midden in het seizoen ------------------------------------------------
{
  const nu = FINALE - 100 * DAG;
  const p = plan(seizoen(2026, FINALE, { gereden: 1 }), nu);
  check('midden in het seizoen: alleen 2026, en nog geen kalender van 2027',
    txt(p) === 'uitslagen [2026] kalender []', txt(p));
}

// ---- de laatste twee maanden: 2027 zoeken ---------------------------------
{
  const nu = FINALE - (VOORUIT_DAGEN - 1) * DAG;
  const p = plan(seizoen(2026, FINALE, { gereden: 1 }), nu);
  check('twee maanden voor de finale gaat de sync de kalender van 2027 zoeken',
    txt(p) === 'uitslagen [2026] kalender [2027]', txt(p));
  const net = plan(seizoen(2026, FINALE, { gereden: 1 }), FINALE - (VOORUIT_DAGEN + 1) * DAG);
  check('een dag eerder nog niet', net.kalender.length === 0, txt(net));
}

// ---- de finale is gereden, 2027 is er nog niet -----------------------------
{
  const nu = FINALE + 1 * DAG;
  const p = plan(seizoen(2026, FINALE, { gereden: 4 }), nu);
  check('de dag na de finale: 2026 nog nakijken (herkeuring) en 2027 blijven zoeken',
    txt(p) === 'uitslagen [2026] kalender [2027]', txt(p));
}

// ---- OpenF1 heeft 2027 gepubliceerd -------------------------------------------
{
  const nu = FINALE + 3 * DAG;
  const races = [...seizoen(2026, FINALE, { gereden: 4 }),
                 ...seizoen(2027, Date.parse('2027-11-28T13:00:00Z'))];
  const p = plan(races, nu);
  check('met de kalender van 2027 binnen: allebei nakijken, niets meer zoeken',
    txt(p) === 'uitslagen [2026,2027] kalender []', txt(p));
  const agenda = agendaSeizoenen(races, p);
  check('en de agenda heeft ze allebei', agenda.join() === '2026,2027', agenda.join());
}

// ---- januari --------------------------------------------------------------------
{
  const nu = Date.parse('2027-01-15T12:00:00Z');
  const races = [...seizoen(2026, FINALE, { gereden: 4 }),
                 ...seizoen(2027, Date.parse('2027-11-28T13:00:00Z'))];
  const p = plan(races, nu);
  check('in januari is 2026 klaar en blijft alleen 2027 over',
    txt(p) === 'uitslagen [2027] kalender []', txt(p));
}

// ---- wat een seizoen open houdt ------------------------------------------------
{
  const nu = FINALE + 40 * DAG;
  const hangt = seizoen(2026, FINALE, { gereden: 3 });
  const p = plan(hangt, nu);
  check('een race die nooit een uitslag kreeg houdt 2026 open, want de sync moet hem nog op afgelast zetten',
    p.uitslagen.includes(2026), txt(p));
  const afgelast = plan(seizoen(2026, FINALE, { gereden: 3, afgelast: [4] }), nu);
  check('een afgelaste race houdt niets open', !afgelast.uitslagen.includes(2026), txt(afgelast));
  check('een gereden race nog wel binnen de nazorg',
    nogWerk({ race_result: ['1'], deadline_race: new Date(nu - (NAZORG_DAGEN - 1) * DAG).toISOString() }, nu));
  check('en daarna niet meer',
    !nogWerk({ race_result: ['1'], deadline_race: new Date(nu - (NAZORG_DAGEN + 1) * DAG).toISOString() }, nu));
  check('een lege uitslag is geen uitslag', nogWerk({ race_result: [], deadline_race: null }, nu));
  check('en een race zonder tijd valt niet stilletjes weg (1970-valkuil)',
    nogWerk({ race_result: null, deadline_race: null }, nu));
}

// ---- alles gereden, volgend jaar nog niet bekend -------------------------------
{
  const nu = FINALE + 60 * DAG;
  const races = seizoen(2026, FINALE, { gereden: 4 });
  const p = plan(races, nu);
  check('alles gereden en 2027 nog nergens: niets na te kijken, wel blijven zoeken',
    txt(p) === 'uitslagen [] kalender [2027]', txt(p));
  const agenda = agendaSeizoenen(races, p);
  check('en de agenda houdt 2026 in plaats van leeg te worden', agenda.join() === '2026', agenda.join());
}

// ---- een lege database --------------------------------------------------------------
{
  const p = plan([], Date.parse('2027-02-01T00:00:00Z'));
  check('een lege database begint bij het jaar van vandaag',
    txt(p) === 'uitslagen [] kalender [2027]', txt(p));
}

// ---- met de hand een seizoen opgeven ----------------------------------------------
{
  const races = seizoen(2026, FINALE, { gereden: 4 });
  const p = seizoenPlan(races, FINALE + 60 * DAG, { vast: 2026 });
  check('SEIZOEN in de omgeving doet wat het altijd deed: alleen dat seizoen',
    txt(p) === 'uitslagen [2026] kalender []', txt(p));
  const nieuw = seizoenPlan(races, FINALE, { vast: 2025 });
  check('en haalt de kalender op als dat seizoen er nog niet is',
    txt(nieuw) === 'uitslagen [2025] kalender [2025]', txt(nieuw));
}

// ---- het seizoen voor de controlescripts ---------------------------------------
{
  const beide = [...seizoen(2026, FINALE, { gereden: 4 }),
                 ...seizoen(2027, Date.parse('2027-11-28T13:00:00Z'))];
  check('de controlescripts kijken in november naar 2026',
    huidigSeizoen(seizoen(2026, FINALE, { gereden: 2 }), FINALE - 30 * DAG) === 2026);
  check('in januari naar 2027', huidigSeizoen(beide, Date.parse('2027-01-15T12:00:00Z')) === 2027);
  check('met alles gereden en niets nieuws naar het laatste seizoen',
    huidigSeizoen(seizoen(2026, FINALE, { gereden: 4 }), FINALE + 60 * DAG) === 2026);
  check('en in een lege database naar het jaar van vandaag',
    huidigSeizoen([], Date.parse('2028-03-01T00:00:00Z')) === 2028);
}

// ---- deelnemerslijsten van ver vooruit ------------------------------------------
{
  const nu = FINALE;
  const race = (dagen, drivers = null) => ({ drivers,
    deadline_quali: new Date(nu + dagen * DAG).toISOString(), deadline_race: null });
  check('een race zonder lijst die maanden weg is kan wachten op de dagelijkse ronde',
    lijstKanWachten(race(100), nu));
  check('binnen het verversvenster niet', !lijstKanWachten(race(VERVERS_VENSTER_DAGEN - 1), nu));
  check('en een race die al een lijst heeft valt er niet onder',
    !lijstKanWachten(race(100, [{ nr: '1' }]), nu));
  check('een lege lijst is geen lijst', lijstKanWachten(race(100, []), nu));
  check('en een race zonder tijd wacht niet (1970-valkuil)',
    !lijstKanWachten({ drivers: null, deadline_quali: null, deadline_race: null }, nu));
}

process.exit(afronden() ? 0 : 1);
