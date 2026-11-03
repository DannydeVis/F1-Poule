// De functie `mail` in Supabase (supabase/functions/mail, 3 november), in Node.
//
// De sync stelt de mails samen (test/mailmomenten.test.mjs); deze functie zoekt
// het adres op en verstuurt via Resend. Wat hier vastligt, met een nagebootste
// database en een nagebootste Resend:
//   1. Alleen de sync: de service_role key, of een JWT met de rol service_role.
//      Een sessie van een speler, of niets, krijgt 401.
//   2. Zonder RESEND_API_KEY gaat er niets uit (503, met de hint).
//   3. Een verzoek dat niet klopt (geen lijst, te veel, geen https-afmeldlink,
//      geen uuid) krijgt 400, en dan gaat er niets uit.
//   4. Per mail: alleen als mail voor dat account nog aanstaat en het een
//      bevestigd adres heeft. Naar dat adres, van Predict the Race, met een
//      antwoordadres, en de afmeldlink ook in List-Unsubscribe.
//   5. Het antwoord noemt de accounts die een mail kregen, en hoeveel er
//      overgeslagen of mislukt zijn; nooit een adres, ook niet in de log.
//   6. Tussen twee mails een pauze (Resend: twee per seconde).

import { maakControle } from './hulp.mjs';
import { verwerkMail, RESEND, AFZENDER, ANTWOORDADRES, PAUZE_MS, MAX_PER_KEER, rolVan } from '../supabase/functions/mail/mail-kern.mjs';

const { check, afronden } = maakControle('de functie mail');
const SERVICE = 'service-sleutel';
const jwt = (rol) => `kop.${Buffer.from(JSON.stringify({ role: rol, iss: 'supabase' })).toString('base64url')}.handtekening`;
const ID = (n) => `a000000${n}-0000-4000-8000-00000000000${n}`;

// De database: mail_abonnementen en auth.users, zoals supabase-js ze aanbiedt.
function nepDb({ aan = [ID(1), ID(2), ID(4)], accounts = {
  [ID(1)]: { email: 'een@voorbeeld.test', email_confirmed_at: '2026-10-01T00:00:00Z' },
  [ID(2)]: { email: 'twee@voorbeeld.test', email_confirmed_at: '2026-10-01T00:00:00Z' },
  [ID(3)]: { email: 'drie@voorbeeld.test', email_confirmed_at: '2026-10-01T00:00:00Z' },
  [ID(4)]: { email: 'vier@voorbeeld.test', email_confirmed_at: null },
} } = {}) {
  return {
    from: (tabel) => ({ select: () => ({ eq: (_k, id) => ({ maybeSingle: async () => ({
      data: tabel === 'mail_abonnementen' && aan.includes(id) ? { user_id: id } : null, error: null }) }) }) }),
    auth: { admin: { getUserById: async (id) => ({ data: accounts[id] ? { user: { id, ...accounts[id] } } : { user: null }, error: null }) } },
  };
}
const mail = (n, extra = {}) => ({ user_id: ID(n), onderwerp: `Onderwerp ${n}`, tekst: `Tekst ${n}`, html: `<p>Html ${n}</p>`,
  afmelden: `https://predicttherace.com/app/?afmelden=${ID(n)}`, ...extra });
function nepResend(status = () => 200) {
  const verzonden = [];
  const haal = async (url, opties) => {
    verzonden.push({ url, opties, body: JSON.parse(opties.body) });
    const s = status(verzonden.length);
    const naar = JSON.parse(opties.body).to[0];
    return { ok: s >= 200 && s < 300, status: s,
      text: async () => (s >= 400 ? `{"message":"The to address ${naar} is invalid"}` : '{"id":"x"}') };
  };
  return { haal, verzonden };
}
const wachten = [];
const wacht = async (ms) => { wachten.push(ms); };
const doe = (extra) => verwerkMail({ service: SERVICE, resend: 're_sleutel', db: nepDb(), wacht, ...extra });

// ---- 1. wie mag ---------------------------------------------------------------------------
{
  const { haal, verzonden } = nepResend();
  const geen = await doe({ verzoek: { mails: [mail(1)] }, token: '', haal });
  const speler = await doe({ verzoek: { mails: [mail(1)] }, token: jwt('authenticated'), haal });
  const anon = await doe({ verzoek: { mails: [mail(1)] }, token: jwt('anon'), haal });
  check('zonder sleutel, met een sessie van een speler of als anon: 401, en er gaat niets uit',
    [geen, speler, anon].every((u) => u.status === 401 && u.body.hint === 'mail_geen_sync') && verzonden.length === 0);
  const met = await doe({ verzoek: { mails: [mail(1)] }, token: SERVICE, haal });
  const metJwt = await doe({ verzoek: { mails: [mail(1)] }, token: jwt('service_role'), haal });
  check('de service_role key, of een JWT met die rol: wel', met.status === 200 && metJwt.status === 200 && verzonden.length === 2);
  check('de rol uit een JWT lezen, en niets uit iets dat geen JWT is', rolVan(jwt('service_role')) === 'service_role'
    && rolVan('geen-jwt') === null && rolVan('a.b.c') === null);
}

// ---- 2 en 3. zonder sleutel, en een verzoek dat niet klopt ------------------------------
{
  const { haal, verzonden } = nepResend();
  const zonder = await doe({ verzoek: { mails: [mail(1)] }, token: SERVICE, resend: '', haal });
  check('zonder RESEND_API_KEY: 503 met de hint, en er gaat niets uit',
    zonder.status === 503 && zonder.body.hint === 'mail_geen_sleutel' && verzonden.length === 0);
  const fout = [
    {}, { mails: 'x' }, { mails: Array.from({ length: MAX_PER_KEER + 1 }, () => mail(1)) },
    { mails: [mail(1, { afmelden: 'http://predicttherace.com/app/?afmelden=x' })] },
    { mails: [mail(1, { afmelden: undefined })] },
    { mails: [mail(1, { user_id: 'u1' })] },
    { mails: [mail(1, { onderwerp: '' })] },
    { mails: [mail(1), mail(2, { html: 7 })] },
  ];
  const uit = [];
  for (const verzoek of fout) uit.push(await doe({ verzoek, token: SERVICE, haal }));
  check('een verzoek dat niet klopt: 400, en dan gaat er ook van de goede niets uit',
    uit.every((u) => u.status === 400 && u.body.hint === 'mail_verkeerd') && verzonden.length === 0, uit.map((u) => u.status).join());
}

// ---- 4, 5 en 6. versturen ------------------------------------------------------------------
{
  const { haal, verzonden } = nepResend((n) => (n === 2 ? 422 : 200));
  const log = [];
  const echt = console.error;
  console.error = (...a) => log.push(a.join(' '));
  wachten.length = 0;
  const uit = await doe({ verzoek: { mails: [mail(1), mail(2), mail(3), mail(4), mail(5)] }, token: SERVICE, haal });
  console.error = echt;
  check('alleen wie mail aan heeft en een bevestigd adres: 3 (geen mail meer aan), 4 (niet bevestigd) en 5 (geen account) niet',
    verzonden.map((v) => v.body.to.join()).join(' ') === 'een@voorbeeld.test twee@voorbeeld.test', verzonden.map((v) => v.body.to).join(' '));
  const [eerste] = verzonden;
  check('naar Resend, met de sleutel, van Predict the Race, met een antwoordadres',
    eerste.url === RESEND && eerste.opties.method === 'POST' && eerste.opties.headers.Authorization === 'Bearer re_sleutel'
      && eerste.body.from === AFZENDER && eerste.body.reply_to === ANTWOORDADRES, JSON.stringify(eerste.body).slice(0, 300));
  check('het onderwerp, de tekst en de HTML van de sync, en de afmeldlink in List-Unsubscribe',
    eerste.body.subject === 'Onderwerp 1' && eerste.body.text === 'Tekst 1' && eerste.body.html === '<p>Html 1</p>'
      && eerste.body.headers['List-Unsubscribe'] === `<https://predicttherace.com/app/?afmelden=${ID(1)}>`);
  check('het antwoord: wie een mail kreeg, en hoeveel er overgeslagen en mislukt zijn',
    uit.status === 200 && JSON.stringify(uit.body) === JSON.stringify({ verstuurd: [ID(1)], overgeslagen: 3, mislukt: 1 }),
    JSON.stringify(uit.body));
  check('geen adres in het antwoord of in de log, ook niet als Resend het in zijn fout noemt',
    !/@voorbeeld\.test/.test(JSON.stringify(uit.body) + log.join(' '))
      && /mail mislukt: 422 .*\[adres\]/.test(log.join(' ')), log.join(' | '));
  check('een pauze tussen twee mails, niet voor de eerste', wachten.length === 1 && wachten[0] === PAUZE_MS, wachten.join());
}

process.exit(afronden() ? 0 : 1);
