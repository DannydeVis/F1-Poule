// Bewaking: healthchecks.io, en uitslagen op tijd.
//
//   1. teLateUitslagen(): een gespeelde sessie die meer dan twee uur na het
//      einde (start plus 1 of 2 uur, plus het halfuur dat OpenF1 dicht is)
//      geen uitslag heeft en niet afgelast is; met de sessie in de tekst.
//   2. uitslagWekker(): 35 minuten na het einde, daarna elke 30 minuten tot 8
//      uur na het einde; de vroegste wint, ook naast een herinnering.
//   3. scripts/bewaking.sh: zonder secret niets, de juiste URL voor ok en
//      fail, de sleutel nooit in de uitvoer, en een mislukte ping laat de job
//      nooit falen. Met een nep-curl, zonder netwerk.
//   4. De workflows: sync pingt "sync" na elke run en "uitslagen" na een
//      geslaagde sync; de reservekopie pingt "reservekopie"; de sync zet de
//      wekker ook zonder pushabonnementen.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';
import { teLateUitslagen, teLaatTekst, uitslagWekker, vroegste, uitslagVanaf } from '../scripts/bewaking.mjs';
import { volgendeWekker } from '../scripts/herinneringen.mjs';

const { check, afronden } = maakControle('bewaking');
const NU = Date.parse('2026-12-05T18:00:00Z');
const iso = (uren) => new Date(NU + uren * 3600e3).toISOString();
const race = (extra) => ({ id: 24, season: 2026, round: 24, name: 'Abu Dhabi',
  deadline_sprint: null, deadline_quali: null, deadline_race: null,
  quali_result: null, sprint_result: null, race_result: null, ...extra });

// ---- 1. te laat -------------------------------------------------------------------
{
  // Kwalificatie om 14:00: einde 15:00, uitslag vanaf 15:30, te laat na 17:30.
  const q = race({ deadline_quali: iso(-4) });
  check('uitslag van een kwalificatie verwacht een uur na de start plus het halfuur dat OpenF1 dicht is',
    uitslagVanaf(q, 'quali') === NU - 4 * 3600e3 + 1.5 * 3600e3);
  check('een kwalificatie van vier uur geleden zonder uitslag is te laat',
    teLateUitslagen({ races: [q], nu: NU }).length === 1);
  check('maar drie uur geleden nog niet (anderhalf uur na het verwachte moment)',
    teLateUitslagen({ races: [race({ deadline_quali: iso(-3) })], nu: NU }).length === 0);
  // Race om 13:00: einde 15:00, uitslag vanaf 15:30, te laat na 17:30.
  check('een race duurt twee uur: na vier en een half uur nog niet te laat',
    teLateUitslagen({ races: [race({ deadline_race: iso(-4.4) })], nu: NU }).length === 0);
  check('na vijf uur wel', teLateUitslagen({ races: [race({ deadline_race: iso(-5) })], nu: NU }).length === 1);
  check('met een uitslag niet', teLateUitslagen({ races: [{ ...q, quali_result: ['1'] }], nu: NU }).length === 0);
  check('afgelast niet', teLateUitslagen({ races: [{ ...q, afgelast: true }], nu: NU }).length === 0);
  check('een sessie die nog moet komen niet',
    teLateUitslagen({ races: [race({ deadline_race: iso(20) })], nu: NU }).length === 0);
  const tekst = teLaatTekst(teLateUitslagen({ races: [q, race({ id: 7, round: 7, name: 'Monaco', deadline_sprint: iso(-30) })], nu: NU }));
  check('de tekst noemt de sessies bij naam, de vroegste eerst, zonder spelersdata',
    tekst === 'Monaco sprint (2026 ronde 7), uitslag verwacht vanaf 2026-12-04 13:30 UTC; '
      + 'Abu Dhabi kwalificatie (2026 ronde 24), uitslag verwacht vanaf 2026-12-05 15:30 UTC', tekst);
}

// ---- 2. de wekker voor een uitslag --------------------------------------------------
{
  // Kwalificatie start over 1 uur: einde over 2 uur, wekker 35 minuten later.
  const straks = race({ deadline_quali: iso(1) });
  check('35 minuten na het einde van de sessie een wekker',
    uitslagWekker({ races: [straks], nu: NU }) === iso(2 + 35 / 60), uitslagWekker({ races: [straks], nu: NU }));
  // Het einde was een uur geleden en de uitslag is er nog niet: over 30 minuten.
  const net = race({ deadline_quali: iso(-2) });
  check('is de uitslag er na die wekker nog niet, dan 30 minuten later opnieuw',
    uitslagWekker({ races: [net], nu: NU }) === iso(0.5));
  check('tot 8 uur na het einde', uitslagWekker({ races: [race({ deadline_quali: iso(-8.9) })], nu: NU }) === iso(0.5)
    && uitslagWekker({ races: [race({ deadline_quali: iso(-9.1) })], nu: NU }) === null);
  check('met de uitslag binnen geen wekker',
    uitslagWekker({ races: [{ ...net, quali_result: ['1'] }], nu: NU }) === null);
  check('een afgelaste race geen wekker', uitslagWekker({ races: [{ ...net, afgelast: true }], nu: NU }) === null);
  check('niets binnen twaalf uur: geen wekker', uitslagWekker({ races: [race({ deadline_race: iso(30) })], nu: NU }) === null);
  // Naast een herinnering: de vroegste wint.
  const r = race({ deadline_quali: iso(5), deadline_race: iso(26) });
  const herinnering = volgendeWekker({ races: [r], nu: NU });
  const uitslag = uitslagWekker({ races: [r], nu: NU });
  check('de vroegste wint: de herinnering voor de kwalificatie, dan pas de uitslag',
    vroegste(herinnering, uitslag) === herinnering && Date.parse(herinnering) < Date.parse(uitslag),
    `${herinnering} ${uitslag}`);
  check('en zonder herinnering de uitslag', vroegste(null, uitslag) === uitslag && vroegste(null, null) === null);
}

// ---- 3. scripts/bewaking.sh ---------------------------------------------------------
{
  const map = mkdtempSync(join(tmpdir(), 'bewaking-'));
  const log = join(map, 'curl.log');
  // Een nep-curl die zijn argumenten opschrijft, en faalt als CURL_FAALT=1.
  writeFileSync(join(map, 'curl'), `#!/usr/bin/env bash\necho "$@" >> "${log}"\n[ "$CURL_FAALT" = 1 ] && exit 7\nexit 0\n`);
  chmodSync(join(map, 'curl'), 0o755);
  const sh = (args, env = {}) => {
    writeFileSync(log, '');
    let code = 0, uit = '';
    try {
      uit = execFileSync('bash', [join(wortel, 'scripts', 'bewaking.sh'), ...args], {
        encoding: 'utf8', env: { PATH: `${map}:${process.env.PATH}`, ...env } });
    } catch (e) { code = e.status; uit = String(e.stdout ?? ''); }
    return { code, uit, curl: readFileSync(log, 'utf8') };
  };
  const SLEUTEL = 'geheimesleutel123';
  const zonder = sh(['sync', 'ok']);
  check('zonder HC_PING_KEY geen ping, en exit 0', zonder.code === 0 && zonder.curl === ''
    && zonder.uit.includes('Geen HC_PING_KEY'), zonder.uit);
  const ok = sh(['sync', 'ok'], { HC_PING_KEY: SLEUTEL });
  check('een gewone ping gaat naar hc-ping.com/<key>/sync?create=1, met een time-out en drie pogingen',
    ok.code === 0 && ok.curl.includes(`https://hc-ping.com/${SLEUTEL}/sync?create=1`)
      && /-fsS -m 10 --retry 3/.test(ok.curl), ok.curl);
  const fout = sh(['uitslagen', 'fail', 'Uitslag te laat: Abu Dhabi kwalificatie'], { HC_PING_KEY: SLEUTEL });
  check('een /fail met de reden als body',
    fout.curl.includes(`https://hc-ping.com/${SLEUTEL}/uitslagen/fail?create=1`)
      && fout.curl.includes('Uitslag te laat: Abu Dhabi kwalificatie'), fout.curl);
  check('de sleutel staat nooit in de uitvoer van het script',
    ![zonder, ok, fout].some((x) => x.uit.includes(SLEUTEL)));
  const mislukt = sh(['sync', 'ok'], { HC_PING_KEY: SLEUTEL, CURL_FAALT: '1' });
  check('een ping die mislukt laat de job niet falen', mislukt.code === 0 && mislukt.uit.includes('lukte niet'), mislukt.uit);
  const raar = sh(['../iets', 'ok'], { HC_PING_KEY: SLEUTEL });
  check('een rare slug pingt niets', raar.code === 0 && raar.curl === '');
}

// ---- 4. de workflows -------------------------------------------------------------------
{
  const sync = readFileSync(join(wortel, '.github', 'workflows', 'sync.yml'), 'utf8');
  const kopie = readFileSync(join(wortel, '.github', 'workflows', 'reservekopie.yml'), 'utf8');
  const script = readFileSync(join(wortel, 'scripts', 'sync.mjs'), 'utf8');
  check('sync.yml pingt "sync" na elke run die niet geannuleerd is, met de status van de job',
    /if: \$\{\{ !cancelled\(\) \}\}[\s\S]*?STATUS: \$\{\{ job\.status \}\}[\s\S]*?bewaking\.sh sync ok[\s\S]*?bewaking\.sh sync fail/.test(sync));
  check('en "uitslagen" alleen na een geslaagde sync, met wat er te laat is',
    /if: \$\{\{ !cancelled\(\) && steps\.sync\.outcome == 'success' \}\}[\s\S]*?uitslagen_te_laat[\s\S]*?bewaking\.sh uitslagen ok[\s\S]*?bewaking\.sh uitslagen fail/.test(sync));
  check('de sleutel komt alleen uit de secret HC_PING_KEY',
    (sync.match(/HC_PING_KEY: \$\{\{ secrets\.HC_PING_KEY \}\}/g) ?? []).length === 2
      && /HC_PING_KEY: \$\{\{ secrets\.HC_PING_KEY \}\}/.test(kopie) && !/hc-ping\.com\/[a-zA-Z0-9_-]{10,}/.test(sync + kopie));
  check('reservekopie.yml pingt "reservekopie", /fail als hij mislukt',
    /bewaking\.sh reservekopie ok[\s\S]*?bewaking\.sh reservekopie fail/.test(kopie));
  check('de sync zet de wekker ook zonder pushabonnementen (voor de uitslagen)',
    /zetWekker\(lopend, \{ herinneren: await heeftAbonnementen\(\) \}\)/.test(script)
      && !/if \(!abonnementen\?\.length\) return;\s*zetWekker/.test(script));
}

process.exit(afronden() ? 0 : 1);
