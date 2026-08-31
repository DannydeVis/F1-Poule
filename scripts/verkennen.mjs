/**
 * Wat heeft OpenF1 eigenlijk voor een race?
 *
 * Draait niet mee in de sync. Dit is het gereedschap voor als een uitslag
 * niet binnenkomt: dan wil je weten of OpenF1 hem niet heeft, of dat wij
 * ernaast kijken. Het schrijft niets weg — alleen lezen en vertellen.
 *
 *   node scripts/verkennen.mjs               de laatste gereden race
 *   SESSIE=11353 node scripts/verkennen.mjs  die ene sessie
 *   ALLE=1 node scripts/verkennen.mjs        het woordenboek over alle races
 *   JAAR=2025 node scripts/verkennen.mjs     een seizoen dat al af is
 *
 * Er is geen sleutel voor nodig: OpenF1 is openbaar.
 */

const API = 'https://api.openf1.org/v1';
const JAAR = Number(process.env.JAAR ?? 2026);
const SESSIE = process.env.SESSIE ? Number(process.env.SESSIE) : null;
const ALLE = !!process.env.ALLE;

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

// Alles wat naar een safety car, een virtual safety car of een rode vlag
// ruikt. Bewust ruim: we willen zien welke woorden OpenF1 gebruikt, niet
// alleen de woorden die we al kennen.
const RUIM = /safety|vsc|red flag|suspend/i;
const raakt = (m) =>
  RUIM.test(`${m.category ?? ''} ${m.flag ?? ''} ${m.message ?? ''}`);

async function verken(sessie, wat) {
  console.log(`\n=== ${wat} (session_key ${sessie}) ===`);

  const wie = await haal(`sessions?session_key=${sessie}`);
  if (Array.isArray(wie) && wie.length) {
    const s = wie[0];
    console.log(`  dit is: ${s.session_name} — ${s.location} ${String(s.date_start).slice(0, 10)}`);
  } else {
    console.log(`  sessions gaf ${isFout(wie) ? wie.fout : 'niets'} — deze sleutel bestaat niet`);
  }
  await wacht(700);

  const uitslag = toon('session_result', await haal(`session_result?session_key=${sessie}`));
  if (uitslag?.length) console.log(`    eerste: ${JSON.stringify(uitslag[0])}`);
  await wacht(700);

  const laps = toon('laps', await haal(`laps?session_key=${sessie}`));
  if (laps?.length) {
    const met = laps.filter((l) => typeof l.lap_duration === 'number')
      .sort((a, b) => a.lap_duration - b.lap_duration);
    console.log(`    ${met.length} met lap_duration. De vijf snelste:`);
    for (const l of met.slice(0, 5)) {
      console.log(`      #${l.driver_number} ronde ${l.lap_number}: ${l.lap_duration}`
        + `${l.is_pit_out_lap ? ' (pit-out)' : ''}`);
    }
  }
  await wacht(700);

  // Gelijke tijden zijn hier het punt: pit_duration komt in hele seconden
  // terug, dus twee coureurs met dezelfde tijd is geen uitzondering.
  const pit = toon('pit', await haal(`pit?session_key=${sessie}`));
  if (pit?.length) {
    const met = pit.filter((p) => typeof p.pit_duration === 'number')
      .sort((a, b) => a.pit_duration - b.pit_duration);
    console.log(`    ${met.length} met pit_duration. De vijf snelste:`);
    for (const p of met.slice(0, 5)) {
      console.log(`      #${p.driver_number} ronde ${p.lap_number}: pit=${p.pit_duration}`
        + ` stop=${p.stop_duration} lane=${p.lane_duration}`);
    }
    const snelste = met[0]?.pit_duration;
    const gelijk = met.filter((p) => p.pit_duration === snelste);
    console.log(`    ${gelijk.length} coureur(s) met de snelste tijd ${snelste}`);
  }
  await wacht(700);

  const rc = toon('race_control', await haal(`race_control?session_key=${sessie}`));
  if (rc?.length) {
    const bijzonder = rc.filter(raakt);
    console.log(`    ${bijzonder.length} regels over safety car, VSC of rode vlag:`);
    for (const m of bijzonder) {
      console.log(`      ronde ${String(m.lap_number ?? '-').padEnd(3)}`
        + ` category=${String(m.category ?? '-').padEnd(14)} ${m.message}`);
    }
  }
}

// Het woordenboek: welke zinnen gebruikt OpenF1 over álle gereden races?
// Eén race is te weinig om een filter op te bouwen.
async function woordenboek(races) {
  const zinnen = new Map();
  console.log(`\n=== woordenboek over ${races.length} gereden races ===`);
  for (const r of races) {
    const rc = await haal(`race_control?session_key=${r.session_key}`);
    await wacht(700);
    if (isFout(rc)) { console.log(`  ${r.location}: FOUT ${rc.fout}`); continue; }
    const raak = rc.filter(raakt);
    console.log(`  ${String(r.location).padEnd(20)} ${rc.length} regels, ${raak.length} bijzonder`);
    for (const m of raak) {
      const sleutel = `${m.category ?? '-'} | ${m.message}`;
      if (!zinnen.has(sleutel)) zinnen.set(sleutel, { n: 0, races: new Set() });
      const v = zinnen.get(sleutel);
      v.n++; v.races.add(r.location);
    }
  }
  console.log(`\n  alle voorkomende zinnen, meest gebruikt eerst:`);
  for (const [zin, v] of [...zinnen].sort((a, b) => b[1].n - a[1].n)) {
    console.log(`    ${String(v.n).padStart(3)}×  in ${v.races.size} race(s)  ${zin}`);
  }
}

const races = await haal(`sessions?year=${JAAR}&session_name=Race`);
if (isFout(races)) { console.log(`sessions gaf ${races.fout}`); process.exit(1); }
const op = races.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
const geweest = op.filter((r) => new Date(r.date_start).getTime() < Date.now() - 3 * 3600e3);

if (SESSIE) {
  await verken(SESSIE, 'opgegeven sessie');
} else if (ALLE) {
  await woordenboek(geweest);
} else {
  console.log(`${op.length} races in ${JAAR}, waarvan ${geweest.length} gereden:`);
  for (const r of op) {
    console.log(`  ${String(r.session_key).padEnd(7)} ${String(r.date_start).slice(0, 10)}  ${r.location}`);
  }
  const kies = geweest[geweest.length - 1];
  if (!kies) { console.log(`\nNog geen gereden race in ${JAAR}.`); process.exit(0); }
  await verken(kies.session_key, `laatste gereden race: ${kies.location}`);
}
