// De teller van de site. Gemaakt door scripts/maak-site.mjs: niet met de hand
// bewerken. Per bezoek alleen het pad van de pagina en, als de link dat zegt,
// waar je vandaan kwam (?ref=groepsapp, ?ref=reddit). Geen cookie, niets in
// je browser bewaard, geen IP-adres in de database: tel_pagina() in
// schema.sql telt alleen paden uit de sitemap en refs uit een vaste lijst.
// Zie "Tellen" in de privacyverklaring. Met een ref krijgen de links naar de
// app dezelfde ref, zodat de app bij een nieuwe speler weet waar hij vandaan
// kwam (bron_zetten() in schema.sql).
(function () {
  try {
    var ref = new URLSearchParams(location.search).get('ref');
    if (ref && /^[a-z]{1,20}$/.test(ref)) {
      var links = document.querySelectorAll('a[href]');
      for (var i = 0; i < links.length; i++) {
        var u = new URL(links[i].getAttribute('href'), location.href);
        if (u.origin === location.origin && /\/app\/$/.test(u.pathname)) {
          u.searchParams.set('ref', ref);
          links[i].setAttribute('href', u.href);
        }
      }
    }
    fetch("https://etifamdwqxjfaeaordlr.supabase.co/rest/v1/rpc/tel_pagina", {
      method: 'POST',
      headers: { apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0aWZhbWR3cXhqZmFlYW9yZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzMzNTUsImV4cCI6MjEwMzE0OTM1NX0.dI0HMZsO0JcmhF9ibD81ivVl96UCYInoUz94r8cAqio", Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0aWZhbWR3cXhqZmFlYW9yZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzMzNTUsImV4cCI6MjEwMzE0OTM1NX0.dI0HMZsO0JcmhF9ibD81ivVl96UCYInoUz94r8cAqio",
        'Content-Type': 'application/json' },
      body: JSON.stringify({ p_pad: location.pathname, p_ref: ref && /^[a-z]{1,20}$/.test(ref) ? ref : null })
    }).catch(function () {});
  } catch (e) { /* tellen mag nooit iets breken */ }
})();
