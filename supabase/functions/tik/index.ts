// De functie `tik` (Supabase Edge Function, premium): een melding naar een
// speler die zijn top 10 nog niet invulde, op het moment dat een medespeler
// tikt. De logica staat in tik-kern.mjs, het versturen in push-web.mjs; hier
// alleen het verzoek, wie het doet en het antwoord.
//
// Uitrollen: supabase functions deploy tik (of via de MCP van Supabase), met
// index.ts, tik-kern.mjs, push-web.mjs en herinneringen.mjs. verify_jwt aan:
// alleen een verzoek met een sessie van de app komt erdoor, en getUser() zegt
// daarna van wie die sessie is. De sleutel om te versturen staat in de Vault
// (push_sleutel(), gezet door de sync). Zie BEDIENING.md §19.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { verwerkTik } from './tik-kern.mjs';
import { stuur } from './push-web.mjs';

const KOPPEN = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const antwoord = (status: number, body: unknown) => new Response(JSON.stringify(body),
  { status, headers: { ...KOPPEN, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: KOPPEN });
  if (req.method !== 'POST') return antwoord(405, { fout: 'alleen POST' });
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } });
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data, error } = await db.auth.getUser(token);
    if (error || !data?.user) return antwoord(401, { fout: 'Niet aangemeld.', hint: 'geen_sessie' });
    const uit = await verwerkTik({ verzoek: await req.json(), gebruiker: data.user, db, stuur });
    return antwoord(uit.status, uit.body);
  } catch (e) {
    console.error('tik mislukt:', e instanceof Error ? e.message : String(e));
    return antwoord(500, { fout: 'Er ging iets mis bij het aantikken.' });
  }
});
