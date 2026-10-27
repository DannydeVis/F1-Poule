/**
 * De kern van de functie `tik` (premium, 26 oktober): iemand die zijn top 10
 * nog niet invulde een melding sturen, op het moment dat een medespeler op
 * "tik" drukt.
 *
 * Los van index.ts, zodat het in Node te testen is zonder Deno en zonder
 * Supabase (test/tik-versturen.test.mjs): `db` is een Supabase-client met de sleutel
 * van de server, `stuur` verstuurt één melding (push-web.mjs).
 *
 * De regels staan niet hier maar in de database (tik_geven() in schema.sql):
 * premium, dezelfde poule, een open sessie, de ontvanger heeft nog niets, één
 * per ontvanger per race. Wat hier gebeurt is de volgorde:
 *
 *   1. de sleutel uit de Vault: zonder sleutel (nog niet ingericht) gebeurt er
 *      niets, ook geen tik in de tabel, zodat het later nog kan;
 *   2. de tik vastleggen (tik_geven); een fout gaat met zijn hint terug naar
 *      de app, die hem vertaalt;
 *   3. de melding naar elk toestel van de ontvanger, in de taal van dat
 *      toestel; een abonnement dat niet meer bestaat wordt opgeruimd;
 *   4. vastleggen op hoeveel toestellen hij aankwam, en dat teruggeven: nul
 *      betekent dat de app een berichtje voor de groepsapp aanbiedt.
 */

import { woorden, overTekst } from './herinneringen.mjs';

// Waar een tik op de melding je heen brengt. Vast, en niet uit het verzoek:
// anders kon wie tikt een melding naar een andere site laten wijzen.
export const APP_URL = 'https://predicttherace.com/app/';

// De melding in de taal van het toestel: "Danny tikt je aan" en "Austin:
// kwalificatie sluit over 3 uur. Je hebt hier nog niets ingevuld."
export function tikBericht(tik, taal, nu = Date.now()) {
  const w = woorden(taal);
  const uren = (Date.parse(tik.deadline) - nu) / 3600e3;
  return {
    titel: w.tik(tik.van_naam),
    tekst: `${w.titel(tik.race, w[tik.sessie], overTekst(uren, taal))}. ${w.tekst}`,
    tag: `tik:${tik.id}`,
    url: APP_URL,
  };
}

export async function verwerkTik({ verzoek, gebruiker, db, stuur, nu = Date.now() }) {
  const { race, sessie, aan } = verzoek ?? {};
  if (!race || !sessie || !aan) return { status: 400, body: { fout: 'race, sessie en aan horen erbij' } };

  const { data: sleutel } = await db.rpc('push_sleutel');
  if (!sleutel?.prive || !sleutel?.publiek) {
    return { status: 503, body: { fout: 'De meldingen zijn nog niet ingericht.', hint: 'tik_niet_ingericht' } };
  }

  const { data: tik, error } = await db.rpc('tik_geven',
    { p_van: gebruiker.id, p_race: race, p_sessie: sessie, p_aan: aan });
  if (error) return { status: 400, body: { fout: error.message, hint: error.hint ?? null } };

  const { data: toestellen } = await db.rpc('tik_ontvangers', { p_tik: tik.id });
  let verstuurd = 0;
  for (const abonnement of toestellen ?? []) {
    const uit = await stuur(abonnement, tikBericht(tik, abonnement.taal, nu),
      { onderwerp: sleutel.contact, sleutel });
    if (uit.ok) verstuurd++;
    // De telefoon is opnieuw ingesteld of de app is weg: geen fout, een rij
    // die weg kan. Net als in de sync.
    else if (uit.weg) await db.from('push_abonnementen').delete().eq('endpoint', abonnement.endpoint);
  }
  await db.from('tikken').update({ verstuurd }).eq('id', tik.id);
  return { status: 200, body: { verstuurd, aan: tik.aan_naam } };
}
