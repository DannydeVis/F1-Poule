/**
 * Eén testmelding naar de toestellen van één speler, zonder op een deadline
 * te wachten.
 *
 *     SPELER=Danny node scripts/testmelding.mjs
 *     SPELER=Danny POULE=AB12CD node scripts/testmelding.mjs
 *
 * Draait als knop in Actions (.github/workflows/testmelding.yml), met dezelfde
 * secrets als de sync: SUPABASE_URL, SUPABASE_KEY, VAPID_PRIVE en
 * PUSH_CONTACT. Zie BEDIENING.md §11c.
 *
 * Wat het doet: de speler op naam opzoeken (hoofdletters maken niet uit), de
 * toestellen pakken die bij die speler meldingen aan hebben, en daar één
 * melding naartoe sturen in de taal van dat toestel. Het raakt `laatst` niet
 * aan, dus een echte herinnering komt daarna gewoon nog.
 *
 * Twee mensen kunnen dezelfde naam hebben, in verschillende poules. Horen de
 * toestellen bij meer dan één account, dan stuurt dit niets en vraagt het om de
 * poulecode erbij. Liever een rode run dan een testmelding bij een vreemde.
 *
 * De log van een openbare repo is openbaar. Daarom staat er geen endpoint,
 * geen poulecode en geen poulenaam in, alleen hoeveel er gestuurd is en naar
 * welke pushdienst.
 */

import { stuur } from './push.mjs';

// Per taal, net als de herinneringen in herinneringen.mjs: de melding komt uit
// een runner zonder browser, dus de taal van het toestel staat in de rij.
export const TEKST = {
  nl: { titel: 'Testmelding van Predict the Race',
        tekst: 'Zo ziet een herinnering eruit. Deze kwam van een handmatige test.' },
  en: { titel: 'Test notification from Predict the Race',
        tekst: 'This is what a reminder looks like. This one came from a manual test.' },
  de: { titel: 'Testbenachrichtigung von Predict the Race',
        tekst: 'So sieht eine Erinnerung aus. Diese kam von einem manuellen Test.' },
  fr: { titel: 'Notification de test de Predict the Race',
        tekst: 'Voici à quoi ressemble un rappel. Celui-ci vient d’un test manuel.' },
  es: { titel: 'Notificación de prueba de Predict the Race',
        tekst: 'Así se ve un recordatorio. Este viene de una prueba manual.' },
  it: { titel: 'Notifica di prova di Predict the Race',
        tekst: 'Ecco come appare un promemoria. Questo arriva da una prova manuale.' },
  pt: { titel: 'Notificação de teste do Predict the Race',
        tekst: 'É assim que um lembrete aparece. Este veio de um teste manual.' },
};

const gelijk = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

// Puur, zodat de test het zonder server kan nalopen. Geeft { abonnementen }
// of { fout } terug.
export function kiesAbonnementen({ naam, code, leden, poules, abonnementen }) {
  if (!String(naam ?? '').trim()) return { fout: 'Geef de naam van een speler mee.' };
  let kandidaten = leden.filter((l) => gelijk(l.display_name, naam));
  if (code) {
    const poule = poules.find((p) => gelijk(p.join_code, code));
    if (!poule) return { fout: 'Geen poule met die code.' };
    kandidaten = kandidaten.filter((l) => l.pool_id === poule.id);
  }
  if (!kandidaten.length) {
    return { fout: code ? 'Geen speler met die naam in die poule.' : 'Geen speler met die naam.' };
  }
  const ids = new Set(kandidaten.map((l) => l.member_id));
  const gevonden = abonnementen.filter((a) => ids.has(a.member_id));
  if (!gevonden.length) {
    return { fout: 'Die speler heeft op geen enkel toestel meldingen aan. '
      + 'Tik in de app onder Profiel op "Zet meldingen aan" en probeer het opnieuw.' };
  }
  // Wie is wie: een account, of bij een speler zonder account de speler zelf.
  const wie = new Set(gevonden.map((a) => {
    const lid = kandidaten.find((l) => l.member_id === a.member_id);
    return lid.user_id ?? `lid:${lid.member_id}`;
  }));
  if (wie.size > 1) {
    return { fout: `Er zijn ${wie.size} verschillende spelers met die naam die meldingen aan `
      + 'hebben. Geef ook de poulecode mee, dan gaat de melding alleen naar die poule.' };
  }
  return { abonnementen: gevonden };
}

export function bericht(taal, url) {
  const t = TEKST[taal] ?? TEKST.en;
  return { titel: t.titel, tekst: t.tekst, tag: 'testmelding', url };
}

export async function testmelding({ env = process.env, haal = fetch, log = console.log } = {}) {
  const url = env.SUPABASE_URL?.replace(/\/+$/, '');
  const sleutel = env.SUPABASE_KEY;
  if (!url || !sleutel) throw new Error('SUPABASE_URL of SUPABASE_KEY ontbreekt.');
  if (!env.VAPID_PRIVE) {
    throw new Error('VAPID_PRIVE ontbreekt. Zet hem als repository-secret, zie BEDIENING.md §11c.');
  }
  const kop = { apikey: sleutel, Authorization: `Bearer ${sleutel}`,
                'Content-Type': 'application/json' };
  const sb = async (pad, opties = {}) => {
    const res = await haal(`${url}/rest/v1/${pad}`, { ...opties, headers: { ...kop, ...opties.headers } });
    if (!res.ok) throw new Error(`Supabase gaf ${res.status}: ${await res.text()}`);
    const tekst = await res.text();
    return tekst ? JSON.parse(tekst) : null;
  };

  const naam = String(env.SPELER ?? '').trim();
  const code = String(env.POULE ?? '').trim();
  // ilike is "gelijk, hoofdletters maken niet uit". Staat er een % of * in de
  // naam, dan wordt het een zoekpatroon en komen er meer spelers terug; dat is
  // niet erg, want kiesAbonnementen vergelijkt daarna precies.
  const patroon = encodeURIComponent(naam);
  const [leden, abonnementen, poules] = await Promise.all([
    naam ? sb(`pool_members?display_name=ilike.${patroon}&select=member_id,pool_id,user_id,display_name`) : [],
    sb('push_abonnementen?select=endpoint,member_id,p256dh,auth,taal'),
    code ? sb(`pools?join_code=eq.${encodeURIComponent(code.toUpperCase())}&select=id,join_code`) : [],
  ]);
  const keuze = kiesAbonnementen({ naam, code, leden: leden ?? [], poules: poules ?? [],
                                   abonnementen: abonnementen ?? [] });
  if (keuze.fout) throw new Error(keuze.fout);

  const appUrl = env.APP_URL ?? 'https://predicttherace.com/app/';
  const contact = env.PUSH_CONTACT || 'mailto:contact@predicttherace.com';
  let gelukt = 0;
  const mislukt = [];
  for (const ab of keuze.abonnementen) {
    const dienst = (() => { try { return new URL(ab.endpoint).host; } catch { return '?'; } })();
    const uit = await stuur(ab, bericht(ab.taal, appUrl),
      { onderwerp: contact, priveSleutel: env.VAPID_PRIVE, haal });
    if (uit.ok) { gelukt++; log(`  verstuurd via ${dienst} (${ab.taal})`); continue; }
    if (uit.weg) {
      // Hetzelfde als in de sync: dit toestel bestaat niet meer voor de
      // pushdienst, en de rij kan weg.
      await sb(`push_abonnementen?endpoint=eq.${encodeURIComponent(ab.endpoint)}`,
        { method: 'DELETE' }).catch(() => {});
      mislukt.push(`${dienst}: abonnement verlopen, opgeruimd`);
    } else {
      mislukt.push(`${dienst}: ${uit.status} ${String(uit.tekst).slice(0, 120)}`);
    }
  }
  for (const m of mislukt) log(`  niet gelukt via ${m}`);
  log(`Testmelding: ${gelukt} van ${keuze.abonnementen.length} toestel(len) verstuurd`);
  if (!gelukt) {
    throw new Error('Geen enkel toestel bereikt. Staat VAPID_PRIVE goed, en hoort hij bij '
      + 'VAPID_PUBLIEK in app/index.html?');
  }
  return { gelukt, totaal: keuze.abonnementen.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testmelding().catch((e) => { console.error(`Mislukt: ${e.message}`); process.exit(1); });
}
