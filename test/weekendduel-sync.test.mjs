// Het weekendduel in de sync: het seintje en de mail op woensdag (14 november).
// Zonder browser.
//
// Wat hier vastligt:
//   1. Het schema in scripts/weekendduel.mjs is hetzelfde als duelParen() in
//      de app. Anders zegt de mail "tegen Sanne" en de app "tegen Joe".
//   2. Het moment: tussen drieënhalve dag en één dag voor het weekend begint,
//      en alleen overdag in de tijdzone van de ontvanger.
//   3. Wie het krijgt: wie een tegenstander heeft. Niet wie vrij is, niet wie
//      alleen in zijn poule zit, niet wie er na het begin van het weekend bij
//      kwam, niet wie de trainingsmeldingen uit heeft staan.
//   4. Eén keer per weekend, en niet meer nadat de melding van vrijdag over
//      hetzelfde weekend al ging.
//   5. De mail: één per account, met een regel per poule, de afmeldlink erin,
//      en nooit een mailadres.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { duelParen, duelNieuws, overdag, tegenstanders, wieKrijgtEenDuel, duelMails,
  DUEL_VROEGST, DUEL_LAATST } from '../scripts/weekendduel.mjs';
import { maakControle, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('het weekendduel in de sync');
const UUR = 3600e3;

// ---- 1. hetzelfde schema als de app ---------------------------------------------
const bron = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
const stuk = bron.match(/function duelParen\(ids, ronde\) \{[\s\S]*?\n\}\n/);
check('duelParen() staat in de app', !!stuk);
const vanDeApp = new Function(`${stuk[0]}; return duelParen;`)();
let verschil = null;
for (let n = 0; n <= 9 && !verschil; n++) {
  const ids = Array.from({ length: n }, (_, i) => `lid-${i + 1}`);
  for (let ronde = 1; ronde <= 30; ronde++) {
    const a = JSON.stringify(duelParen(ids, ronde)), b = JSON.stringify(vanDeApp(ids, ronde));
    if (a !== b) { verschil = `${n} spelers, ronde ${ronde}: ${a} tegen ${b}`; break; }
  }
}
check('het schema van de sync is dat van de app, voor 0 tot 9 spelers en 30 rondes', !verschil, verschil ?? '');
{
  const ids = ['a', 'b', 'c', 'd', 'e'];
  const gezien = new Set();
  let dubbel = false, vrij = new Set();
  for (let ronde = 1; ronde <= 5; ronde++) {
    const inRonde = new Set();
    for (const [x, y] of duelParen(ids, ronde)) {
      for (const z of [x, y]) { if (z !== null) { if (inRonde.has(z)) dubbel = true; inRonde.add(z); } }
      if (x === null || y === null) vrij.add(x ?? y); else gezien.add([x, y].sort().join());
    }
    if (inRonde.size !== 5) dubbel = true;
  }
  check('met vijf spelers speelt in vijf rondes iedereen één keer tegen iedereen, en is iedereen één keer vrij',
    !dubbel && gezien.size === 10 && vrij.size === 5, `${gezien.size} paren, ${vrij.size} vrij`);
}

// ---- 2. het moment ---------------------------------------------------------------
const START = Date.parse('2026-11-21T04:00:00Z');       // de kwalificatie in Las Vegas
const race = { id: 23, season: 2026, round: 23, name: 'Las Vegas',
  deadline_quali: new Date(START).toISOString(), deadline_race: new Date(START + 24 * UUR).toISOString() };
const voor = (ms) => START - ms;
check('vier dagen vooraf is het nog te vroeg', duelNieuws({ races: [race], nu: voor(96 * UUR) }) === null);
check('drie dagen vooraf kan het', duelNieuws({ races: [race], nu: voor(72 * UUR) })?.tag === 'duel:23');
check('op de grens van drieënhalve dag ook', duelNieuws({ races: [race], nu: voor(DUEL_VROEGST) })?.tag === 'duel:23');
check('een dag vooraf niet meer: dan is het geen woensdagbericht', duelNieuws({ races: [race], nu: voor(DUEL_LAATST) }) === null);
check('een afgelast weekend heeft geen duelbericht',
  duelNieuws({ races: [{ ...race, afgelast: true }], nu: voor(72 * UUR) }) === null);
check('een sprintweekend telt vanaf de sprintkwalificatie',
  duelNieuws({ races: [{ ...race, deadline_sprint: new Date(START - 20 * UUR).toISOString() }], nu: voor(72 * UUR) })?.start === START - 20 * UUR);

const MIDDAG = Date.parse('2026-11-18T12:00:00Z'), NACHT = Date.parse('2026-11-18T02:00:00Z');
check('overdag in Amsterdam is om 12 uur UTC', overdag('Europe/Amsterdam', MIDDAG));
check('om 2 uur UTC is het in Amsterdam nacht', !overdag('Europe/Amsterdam', NACHT));
check('maar in Tokio is het dan ochtend', overdag('Asia/Tokyo', NACHT));
check('zonder tijdzone telt UTC, en een onzinnige tijdzone ook', overdag(null, MIDDAG) && !overdag(null, NACHT) && overdag('Nergens/Niet', MIDDAG));

// ---- 3 en 4. wie de melding krijgt ------------------------------------------------
const lid = (n, pool = 'p1', extra = {}) => ({ member_id: `lid-${n}`, pool_id: pool, display_name: ['Danny', 'Sanne', 'Joe', 'Pipo', 'Nelis'][n - 1],
  user_id: `u${n}`, created_at: new Date(Date.parse('2026-03-01T10:00:00Z') + n * 60e3).toISOString(), ...extra });
const vier = [1, 2, 3, 4].map((n) => lid(n));
const ab = (n, extra = {}) => ({ endpoint: `https://push.example/${n}`, member_id: `lid-${n}`, pool_id: 'p1',
  taal: 'nl', tijdzone: 'Europe/Amsterdam', meld_training: true, training_laatst: null, ...extra });
const NU = MIDDAG;      // woensdagmiddag, 64 uur voor de kwalificatie
const krijg = (a) => wieKrijgtEenDuel({ races: [race], abonnementen: a.abonnementen ?? [ab(1)], leden: a.leden ?? vier, nu: a.nu ?? NU });

// Ronde 23 met vier spelers: k = 22 % 3 = 1, dus Danny tegen Sanne.
const tegen = tegenstanders({ race, leden: vier });
check('ronde 23 met vier spelers: Danny tegen Sanne, Joe tegen Pipo',
  tegen.get('lid-1')?.naam === 'Sanne' && tegen.get('lid-2')?.naam === 'Danny'
    && tegen.get('lid-3')?.naam === 'Pipo' && tegen.get('lid-4')?.naam === 'Joe', JSON.stringify([...tegen]));
const een = krijg({});
check('wie een tegenstander heeft krijgt één melding, met diens naam',
  een.length === 1 && een[0].bericht.titel === 'Weekendduel: jij tegen Sanne' && een[0].tag === 'duel:23',
  JSON.stringify(een.map((x) => x.bericht)));
check('de tekst noemt de race', een[0].bericht.tekst.includes('Las Vegas'));
check('in de taal van het toestel',
  krijg({ abonnementen: [ab(1, { taal: 'en' })] })[0].bericht.titel === 'Weekend duel: you against Sanne'
    && krijg({ abonnementen: [ab(1, { taal: 'de' })] })[0].bericht.titel === 'Wochenend-Duell: du gegen Sanne');
check('wie de trainingsmeldingen uit heeft staan krijgt niets', krijg({ abonnementen: [ab(1, { meld_training: false })] }).length === 0);
check('wie hem al kreeg krijgt hem niet nog eens', krijg({ abonnementen: [ab(1, { training_laatst: 'duel:23' })] }).length === 0);
check('en na de melding van vrijdag over dit weekend ook niet meer',
  krijg({ abonnementen: [ab(1, { training_laatst: 'training:23' })] }).length === 0);
check('de melding van het vorige weekend staat hem niet in de weg',
  krijg({ abonnementen: [ab(1, { training_laatst: 'training:22' })] }).length === 1);
check('midden in de nacht gaat er niets uit', krijg({ nu: NACHT }).length === 0);
check('alleen in je poule: geen duel, geen melding', krijg({ leden: [lid(1)] }).length === 0);
{
  // Drie spelers, ronde 23: n = 4, k = 22 % 3 = 1 -> [1, 3, vrij, 2]: Danny tegen Sanne, Joe vrij.
  const drie = [1, 2, 3].map((n) => lid(n));
  const t = tegenstanders({ race, leden: drie });
  const vrije = [...t].find(([, v]) => v === null)?.[0];
  check('met drie spelers is er één vrij, en die krijgt niets',
    !!vrije && krijg({ leden: drie, abonnementen: [ab(Number(vrije.split('-')[1]))] }).length === 0, `vrij: ${vrije}`);
}
{
  const laat = [...vier, lid(5, 'p1', { created_at: new Date(START + UUR).toISOString() })];
  check('wie er na het begin van het weekend bij kwam doet nog niet mee, en verandert het schema niet',
    !tegenstanders({ race, leden: laat }).has('lid-5') && tegenstanders({ race, leden: laat }).get('lid-1')?.naam === 'Sanne');
  const optijd = [...vier, lid(5)];
  check('wie er vóór het weekend bij kwam doet wel mee', tegenstanders({ race, leden: optijd }).has('lid-5'));
}
check('de volgorde van de rijen maakt niet uit: het gaat op wanneer iemand erbij kwam',
  tegenstanders({ race, leden: [...vier].reverse() }).get('lid-1')?.naam === 'Sanne');

// ---- 5. de mail ---------------------------------------------------------------------
const ontvanger = { user_id: 'u1', taal: 'nl', tijdzone: 'Europe/Amsterdam', token: 'tok-1', training_laatst: null };
const tweePoules = [...vier, lid(1, 'p2', { member_id: 'lid-1b' }), { ...lid(2, 'p2'), member_id: 'lid-x', display_name: 'Bram', user_id: 'u9' }];
const pools = [{ id: 'p1', name: 'Vrijdagmiddagpoule' }, { id: 'p2', name: 'Familie' }];
const mails = duelMails({ races: [race], ontvangers: [ontvanger], leden: tweePoules, pools, nu: NU, appUrl: 'https://predicttherace.com/app/' });
check('één mail per account', mails.length === 1 && mails[0].user_id === 'u1' && mails[0].tag === 'duel:23');
const mail = mails[0];
check('het onderwerp noemt de race en je tegenstander', /^Las Vegas: Weekendduel: jij tegen /.test(mail.onderwerp), mail.onderwerp);
check('met een regel per poule waarin je een tegenstander hebt',
  mail.tekst.includes('Vrijdagmiddagpoule: je speelt dit weekend tegen Sanne.')
    && mail.tekst.includes('Familie: je speelt dit weekend tegen Bram.'), mail.tekst);
check('en dat het aan de gewone stand niets verandert', mail.tekst.includes('Aan de gewone stand verandert het niets.'));
check('de afmeldlink staat erin, met het token', mail.afmelden === 'https://predicttherace.com/app/?afmelden=tok-1'
  && mail.tekst.includes(mail.afmelden) && mail.html.includes('afmelden=tok-1'));
check('er staat geen mailadres in', !/@/.test(mail.tekst.replace(/contact@predicttherace\.com/g, '')));
check('wie de mail al kreeg, of die van vrijdag, krijgt hem niet nog eens',
  duelMails({ races: [race], ontvangers: [{ ...ontvanger, training_laatst: 'duel:23' }], leden: tweePoules, pools, nu: NU, appUrl: 'https://predicttherace.com/app/' }).length === 0
    && duelMails({ races: [race], ontvangers: [{ ...ontvanger, training_laatst: 'training:23' }], leden: tweePoules, pools, nu: NU, appUrl: 'https://predicttherace.com/app/' }).length === 0);
check('een account zonder tegenstander krijgt geen mail',
  duelMails({ races: [race], ontvangers: [{ ...ontvanger, user_id: 'niemand' }], leden: tweePoules, pools, nu: NU, appUrl: 'https://predicttherace.com/app/' }).length === 0);
check('een poule die niet in de lijst staat (een ander seizoen) telt niet mee',
  !duelMails({ races: [race], ontvangers: [ontvanger], leden: tweePoules, pools: [pools[0]], nu: NU, appUrl: 'https://predicttherace.com/app/' })[0].tekst.includes('Familie'));
check('in het Engels', duelMails({ races: [race], ontvangers: [{ ...ontvanger, taal: 'en' }], leden: tweePoules, pools, nu: NU, appUrl: 'https://predicttherace.com/app/' })[0]
  .tekst.includes('this weekend you play against Sanne.'));
check('buiten het moment gaat er geen mail uit',
  duelMails({ races: [race], ontvangers: [ontvanger], leden: tweePoules, pools, nu: voor(100 * UUR), appUrl: 'https://predicttherace.com/app/' }).length === 0);

// ---- de sync roept het aan ------------------------------------------------------------
const sync = readFileSync(join(wortel, 'scripts', 'sync.mjs'), 'utf8');
check('de sync stuurt de duelberichten, en een fout daarin laat de run niet zakken',
  /try \{\s*await duelBerichten\(lopend\);\s*\} catch/.test(sync));
check('met hetzelfde geheugen als de vrije training', (sync.match(/kolom: 'training_laatst'/g) ?? []).length >= 2
  && sync.includes("await verstuur(lijst, 'training_laatst')"));

process.exit(afronden() ? 0 : 1);
