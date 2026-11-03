// De logica van de functie `mail` (Supabase Edge Function, 3 november): de
// mails van de sync versturen via Resend. Hier en niet in index.ts, zodat
// test/mail-functie.test.mjs hem in Node kan draaien met een nagebootste
// database en een nagebootste Resend.
//
// Wat hier gebeurt, per mail:
//   1. Alleen de sync mag dit: de service_role key, of een JWT met die rol.
//   2. Zonder RESEND_API_KEY (een geheim van de functies in Supabase, BEDIENING
//      §11g) gaat er niets uit, en zegt het antwoord waarom.
//   3. Staat mail voor dit account nog aan? (De speler kan net op de afmeldlink
//      hebben getikt.) Heeft het nog een bevestigd adres? Anders overslaan.
//   4. Versturen, met de afmeldlink ook in de kop List-Unsubscribe.
// Het antwoord noemt welke accounts een mail kregen (hun id, voor
// training_laatst en uitslag_laatst), en hoeveel er overgeslagen werden of
// misgingen. Nooit een adres: dat blijft hier, en komt ook niet in de log.

export const RESEND = 'https://api.resend.com/emails';
export const AFZENDER = 'Predict the Race <noreply@predicttherace.com>';
export const ANTWOORDADRES = 'contact@predicttherace.com';
// Resend staat op het gratis plan twee verzoeken per seconde toe.
export const PAUZE_MS = 550;
export const MAX_PER_KEER = 100;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// De rol uit een JWT, zonder hem na te rekenen: dat doet Supabase al voordat
// de functie draait (verify_jwt aan).
export function rolVan(token) {
  try {
    // atob en TextDecoder bestaan in Deno én in Node; Buffer alleen in Node.
    const deel = String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(deel + '==='.slice((deel.length + 3) % 4)), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes))?.role ?? null;
  } catch {
    return null;
  }
}

const geldig = (m) => m && typeof m === 'object' && UUID.test(String(m.user_id ?? ''))
  && typeof m.onderwerp === 'string' && m.onderwerp.length > 0 && m.onderwerp.length <= 200
  && typeof m.tekst === 'string' && m.tekst.length <= 20000
  && typeof m.html === 'string' && m.html.length <= 200000
  && typeof m.afmelden === 'string' && /^https:\/\/[^\s<>]+$/.test(m.afmelden);

/**
 * @param verzoek  { mails: [{ user_id, onderwerp, tekst, html, afmelden }] }
 * @param token    het Bearer-token van het verzoek
 * @param service  de service_role key van dit project
 * @param resend   RESEND_API_KEY, of leeg
 * @param db       een supabase-client met de service_role key
 * @param haal     fetch
 * @param wacht    (ms) => Promise, tussen twee mails
 */
export async function verwerkMail({ verzoek, token, service, resend, db, haal = fetch,
                                    wacht = (ms) => new Promise((r) => setTimeout(r, ms)),
                                    afzender = AFZENDER } = {}) {
  if (!token || (token !== service && rolVan(token) !== 'service_role')) {
    return { status: 401, body: { fout: 'Alleen de sync mag mail versturen.', hint: 'mail_geen_sync' } };
  }
  if (!resend) {
    return { status: 503, body: { fout: 'RESEND_API_KEY ontbreekt in de geheimen van de functies.', hint: 'mail_geen_sleutel' } };
  }
  const mails = Array.isArray(verzoek?.mails) ? verzoek.mails : null;
  if (!mails || mails.length > MAX_PER_KEER || !mails.every(geldig)) {
    return { status: 400, body: { fout: `Verwacht { mails: [...] }, hoogstens ${MAX_PER_KEER}, elk met user_id, onderwerp, tekst, html en afmelden.`, hint: 'mail_verkeerd' } };
  }

  const verstuurd = [];
  let overgeslagen = 0, mislukt = 0, eerste = true;
  for (const m of mails) {
    const { data: rij } = await db.from('mail_abonnementen').select('user_id').eq('user_id', m.user_id).maybeSingle();
    if (!rij) { overgeslagen++; continue; }
    const { data: wie } = await db.auth.admin.getUserById(m.user_id);
    const adres = wie?.user?.email;
    if (!adres || !wie.user.email_confirmed_at) { overgeslagen++; continue; }

    if (!eerste) await wacht(PAUZE_MS);
    eerste = false;
    let res;
    try {
      res = await haal(RESEND, {
        method: 'POST',
        headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: afzender,
          to: [adres],
          reply_to: ANTWOORDADRES,
          subject: m.onderwerp,
          text: m.tekst,
          html: m.html,
          headers: { 'List-Unsubscribe': `<${m.afmelden}>` },
        }),
      });
    } catch {
      res = null;
    }
    if (res?.ok) verstuurd.push(m.user_id);
    else {
      mislukt++;
      // Zonder adres in de log: wat Resend terugzei, met elk adres erin eruit.
      const uitleg = res ? `${res.status} ${(await res.text().catch(() => ''))
        .replace(/[^\s@"'<>]+@[^\s@"'<>]+/g, '[adres]').slice(0, 160)}` : 'geen verbinding';
      console.error(`mail mislukt: ${uitleg}`);
    }
  }
  return { status: 200, body: { verstuurd, overgeslagen, mislukt } };
}
