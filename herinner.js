// "Herinner mij voor het volgende seizoen" op de voorpagina. Gemaakt door
// scripts/maak-site.mjs: niet met de hand bewerken. Stuurt het mailadres dat
// je zelf invult naar herinnering_aanmelden() in schema.sql, en verder niets.
// Geen cookie, niets in je browser bewaard. Zie de privacyverklaring.
(function () {
  var blok = document.getElementById('herinner');
  if (!blok) return;
  if (Date.now() >= Date.parse(blok.getAttribute('data-herinner-tot'))) return;
  blok.hidden = false;
  var form = blok.querySelector('[data-herinner]');
  var veld = form.querySelector('input'), knop = form.querySelector('button');
  var status = form.querySelector('.herinnerstatus');
  var zeg = function (soort) { status.textContent = status.getAttribute('data-' + soort); status.setAttribute('data-soort', soort); };
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var adres = veld.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(adres)) { zeg('ongeldig'); veld.focus(); return; }
    knop.disabled = true;
    fetch("https://etifamdwqxjfaeaordlr.supabase.co/rest/v1/rpc/herinnering_aanmelden", {
      method: 'POST',
      headers: { apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0aWZhbWR3cXhqZmFlYW9yZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzMzNTUsImV4cCI6MjEwMzE0OTM1NX0.dI0HMZsO0JcmhF9ibD81ivVl96UCYInoUz94r8cAqio", Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0aWZhbWR3cXhqZmFlYW9yZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzMzNTUsImV4cCI6MjEwMzE0OTM1NX0.dI0HMZsO0JcmhF9ibD81ivVl96UCYInoUz94r8cAqio",
        'Content-Type': 'application/json' },
      body: JSON.stringify({ p_email: adres, p_taal: form.getAttribute('data-taal') })
    }).then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (uit) {
      if (uit === 'ok') { zeg('ok'); veld.value = ''; veld.disabled = true; }
      else { zeg(uit === 'ongeldig' ? 'ongeldig' : 'fout'); knop.disabled = false; }
    }).catch(function () { zeg('fout'); knop.disabled = false; });
  });
})();
