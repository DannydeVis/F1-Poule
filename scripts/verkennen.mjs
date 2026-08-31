/**
 * Wat heeft OpenF1 eigenlijk voor een race?
 *
 * Draait niet mee in de sync. Dit is het gereedschap voor als een uitslag
 * niet binnenkomt: dan wil je weten of OpenF1 hem niet heeft, of dat wij
 * ernaast kijken. Het schrijft niets weg — alleen lezen en vertellen.
 *
 *   node scripts/verkennen.mjs            de laatste race van dit seizoen
 *   SESSIE=9999 node scripts/verkennen.mjs   die ene sessie
 *   JAAR=2025 node scripts/verkennen.mjs     een seizoen dat al af is
 *
 * Er is geen sleutel voor nodig: OpenF1 is openbaar.
 */

const API = 'https://api.openf1.org/v1';
const JAAR = Number(process.env.JAAR ?? 2026);
const SESSIE = process.env.SESSIE ? Number(process.env.SESSIE) : null;

const wacht = (ms) => new Promise((r) => setTimeout(r, ms));

// Dezelfde bescheidenheid als in sync.mjs: OpenF1 laat drie verzoeken per
// seconde toe en zegt dat met een 429.
async function haal(pad, pogingen = 4) {
  for (let i = 0; i < pogingen; i++) {
    const res = await fetch(`${API}/${pad}`);
    if (res.ok) return res.json();
    if (res.status === 429 && i < pogingen - 1) { await wacht(2000 * (i + 1)); continue; }
    return { fout: `${res.status}` };
  }
}

const isFout = (x) => !Array.isArray(x);
const toon = (naam, x) => {
  if (isFout(x)) { console.log(`  ${naam}: FOUT ${x.fout}`); return null; }
  console.log(`  ${naam}: ${x.length} rijen`);
  if (x.length) console.log(`    velden: ${Object.keys(x[0]).join(', ')}`);
  return x;
};

async function verken(sessie, wat) {
  console.log(`\n=== ${wat} (session_key ${sessie}) ===`);

  const uitslag = toon('session_result', await haal(`session_result?session_key=${sessie}`));
  if (uitslag?.length) console.log(`    eerste: ${JSON.stringify(uitslag[0])}`);
  await wacht(700);

  const laps = toon('laps', await haal(`laps?session_key=${sessie}`));
  if (laps?.length) {
    const met = laps.filter((l) => typeof l.lap_duration === 'number');
    const snelste = met.sort((a, b) => a.lap_duration - b.lap_duration)[0];
    console.log(`    ${met.length} met lap_duration, snelste: ${JSON.stringify(snelste)}`);
  }
  await wacht(700);

  const pit = toon('pit', await haal(`pit?session_key=${sessie}`));
  if (pit?.length) {
    const met = pit.filter((p) => typeof p.pit_duration === 'number');
    const snelste = met.sort((a, b) => a.pit_duration - b.pit_duration)[0];
    console.log(`    ${met.length} met pit_duration, snelste: ${JSON.stringify(snelste)}`);
  }
  await wacht(700);

  // Hier zitten de safety cars en de rode vlag in. Welke woorden OpenF1
  // daarvoor gebruikt is precies wat we willen weten.
  const rc = toon('race_control', await haal(`race_control?session_key=${sessie}`));
  if (rc?.length) {
    const soorten = {};
    for (const m of rc) {
      const sleutel = `${m.category ?? '-'} | flag=${m.flag ?? '-'} | scope=${m.scope ?? '-'}`;
      soorten[sleutel] = (soorten[sleutel] ?? 0) + 1;
    }
    for (const [k, n] of Object.entries(soorten).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${n}×  ${k}`);
    }
    const bijzonder = rc.filter((m) =>
      /safety|red flag/i.test(`${m.category ?? ''} ${m.message ?? ''} ${m.flag ?? ''}`));
    console.log(`    ${bijzonder.length} regels over safety car of rode vlag:`);
    for (const m of bijzonder.slice(0, 12)) console.log(`      ${JSON.stringify(m)}`);
  }
}

if (SESSIE) {
  await verken(SESSIE, 'opgegeven sessie');
} else {
  const races = await haal(`sessions?year=${JAAR}&session_name=Race`);
  if (isFout(races)) { console.log(`sessions gaf ${races.fout}`); process.exit(1); }
  const op = races.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
  console.log(`${op.length} races in ${JAAR}:`);
  for (const r of op) {
    console.log(`  ${String(r.session_key).padEnd(7)} ${String(r.date_start).slice(0, 10)}  ${r.location}`);
  }
  // De laatste race die echt geweest is: daar hoort data van te zijn.
  const geweest = op.filter((r) => new Date(r.date_start).getTime() < Date.now() - 3 * 3600e3);
  const kies = geweest[geweest.length - 1];
  if (!kies) { console.log(`\nNog geen gereden race in ${JAAR}.`); process.exit(0); }
  await verken(kies.session_key, `laatste gereden race: ${kies.location}`);
}
