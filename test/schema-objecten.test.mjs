// Welke functies en tabellen schema.sql maakt, en wat de controletabel kent.
//
// De regel "functies en tabellen: alleen die uit schema.sql" in de
// controletabel meldt elke functie of tabel in public die schema.sql niet
// kent. Zo stonden er tot 20 oktober functies en tabellen van een andere app
// in de database (admin_*, is_admin, delete_my_account, account_items,
// site_admins). Die regel heeft een lijst namen, en die lijst hoort precies te
// zijn wat schema.sql met `create` maakt. Dit bestand legt de twee naast
// elkaar, zodat een nieuwe functie zonder plek in de lijst hier zakt in plaats
// van in productie "ONBEKENDE FUNCTIE" te melden.
//
// En: geen privé-mailadres meer in de repo. Tot 20 oktober stond het
// beheeradres in beheer_adres(); site_beheerders is nu de enige bron.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('functies en tabellen uit schema.sql');
const schema = readFileSync(join(wortel, 'schema.sql'), 'utf8');

const gemaakt = (re) => [...new Set([...schema.matchAll(re)].map((m) => m[1].toLowerCase()))].sort();
const functies = gemaakt(/create or replace function\s+public\.([a-z_0-9]+)/gi);
const tabellen = [...new Set([...gemaakt(/create table if not exists\s+public\.([a-z_0-9]+)/gi),
                             ...gemaakt(/create (?:or replace )?view\s+public\.([a-z_0-9]+)/gi)])].sort();

const regel = schema.slice(schema.indexOf("select 'functies en tabellen: alleen die uit schema.sql'"));
const lijst = (naam) => {
  const m = regel.match(new RegExp(`array\\[([^\\]]*)\\]\\s+as ${naam}`));
  return m ? [...m[1].matchAll(/'([a-z_0-9]+)'/g)].map((x) => x[1]).sort() : null;
};
const verschil = (a, b) => a.filter((x) => !b.includes(x));

check('de controletabel heeft de regel', regel.length > 0 && lijst('functies') && lijst('tabellen'));
check(`de lijst functies is precies wat schema.sql maakt (${functies.length})`,
  JSON.stringify(lijst('functies')) === JSON.stringify(functies),
  `ontbreekt in de lijst: ${verschil(functies, lijst('functies') ?? [])} · te veel: ${verschil(lijst('functies') ?? [], functies)}`);
check(`de lijst tabellen is precies wat schema.sql maakt (${tabellen.length}, met de view)`,
  JSON.stringify(lijst('tabellen')) === JSON.stringify(tabellen),
  `ontbreekt in de lijst: ${verschil(tabellen, lijst('tabellen') ?? [])} · te veel: ${verschil(lijst('tabellen') ?? [], tabellen)}`);

// De restanten van de andere app: schema.sql gooit ze weg, en maakt ze nergens.
const weg = ['admin_accounts', 'admin_dashboard', 'admin_gate', 'admin_day', 'admin_address',
             'is_admin', 'delete_my_account', 'account_items_cap', 'account_sync'];
check('de functies van de andere app staan in de lijst om weg te gooien',
  weg.every((f) => new RegExp(`'${f}'`).test(schema.slice(schema.indexOf('-- Restanten van een andere app (PadelBracket)')))));
check('en schema.sql maakt ze zelf nergens', weg.every((f) => !functies.includes(f)));
check('de tabellen account_items en site_admins gaan weg, en staan niet in de lijst',
  /drop table if exists public\.account_items;/.test(schema) && /drop table if exists public\.site_admins;/.test(schema)
    && !tabellen.includes('account_items') && !tabellen.includes('site_admins'));
check('beheer_adres() bestaat niet meer en gaat weg', !functies.includes('beheer_adres')
  && /drop function if exists public\.beheer_adres\(\);/.test(schema));
check('ik_ben_beheerder() kijkt alleen naar site_beheerders',
  /function public\.ik_ben_beheerder\(\)[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(schema)?.[1].replace(/\s+/g, ' ').trim()
    === 'select auth.uid() is not null and exists (select 1 from public.site_beheerders where user_id = auth.uid());');

// Geen privé-adres meer in wat er in git staat. Op delen gezet, zodat dit
// bestand zelf het adres niet bevat.
const bestanden = execFileSync('git', ['ls-files'], { cwd: wortel, encoding: 'utf8' }).split('\n').filter(Boolean);
const met = bestanden.filter((f) => {
  try { return readFileSync(join(wortel, f), 'utf8').toLowerCase().includes(['devisser.danny', 'gmail.com'].join('@')); }
  catch { return false; }
});
check('het oude beheeradres staat in geen enkel bestand in de repo', met.length === 0, met.join(', '));

process.exit(afronden() ? 0 : 1);
