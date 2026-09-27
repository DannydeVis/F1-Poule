# Meting: hoe Predict the Race gevonden wordt

Eén regel per maand, plus de nulmeting. De cijfers komen uit Search Console
(domeinproperty predicttherace.com), Bing Webmaster Tools, GA4 (alleen wie ja
zei, dus een ondergrens) en het beheer (nieuwe poules per week, BEDIENING §16).

Dit bestand staat niet op het domein: `_config.yml` sluit `docs/` en elk
`.md`-bestand uit, en `test/site.test.mjs` bewaakt dat.

## Nulmeting

Op de dag dat SEO fase 0 live kwam, twee dagen nadat het domein live ging
(24 september 2026). Search Console had toen nog nergens gegevens van: dat is
het beginpunt, geen fout.

| | waarde | waar vandaan |
|---|---|---|
| datum | 26 september 2026 | |
| URL's geïndexeerd (Google) | nog geen gegevens (van 9) | Search Console, Pagina's |
| URL's geïndexeerd (Bing) | nog niet nagekeken | Bing Webmaster Tools |
| vertoningen, laatste 28 dagen | 0 (nog leeg) | Search Console, Prestaties |
| klikken, laatste 28 dagen | 0 (nog leeg) | Search Console, Prestaties |
| waarvan zonder "predict the race" (niet-merk) | 0 | filter: zoekopdracht bevat niet |
| nieuwe poules, laatste 4 weken | | beheer |

Top 10 zoekopdrachten (vertoningen): nog geen.

Nagelopen op dezelfde dag:

- de interne documenten (`/ROUTEKAART.html`, `/OVERDRACHT.html`, `/schema.sql`)
  geven de 404-pagina; de voorpagina en de app werken
- `dannydevis.github.io/F1-Poule/`, `www.predicttherace.com` en
  `http://predicttherace.com` komen uit op `https://predicttherace.com/`
- in Search Console indexering aangevraagd voor `/` en `/en/`

## SEO

Per maand: geïndexeerde URL's, vertoningen en klikken, en hoeveel daarvan
niet-merk.

| maand | geïndexeerd | vertoningen | klikken | niet-merk klikken | opmerking |
|---|---|---|---|---|---|
| | | | | | |

## AEO

Per maand: verschijnt een pagina in een uitgelicht antwoord of in "Anderen
vroegen ook"? Welke vraag, welke pagina. Waar je kijkt (uit `2-aeo.md`):

| waar | wat | wanneer |
|---|---|---|
| Search Console, Prestaties, filter "Aangepast (regex)" met de regex hieronder | vertoningen en klikken op vraag-zoekopdrachten, per pagina | maandelijks |
| Search Console, rapport over AI-overzichten en AI Mode, als het er voor deze property is | vertoningen per pagina (geen klikken, geen zoekopdrachten) | maandelijks |
| Google, met de hand, in incognito | 10 kernvragen (5 NL, 5 EN) uit `site/vragen.mjs`: staat een pagina van ons in het uitgelichte fragment, onder "Mensen vragen ook" of als bron in het AI-overzicht? | elk kwartaal |
| Bing Webmaster Tools, AI Performance | bij welke zoekvragen Copilot ons aanhaalt | maandelijks |

```
^(hoe|wat|wie|wanneer|waarom|welke|welk|kan|kun|moet|is|how|what|who|when|why|which|can|do|does|are)\b
```

Nieuwe vragen uit die rondes gaan in `site/vragen.mjs`.

| maand | zoekvraag | waar zichtbaar | pagina | opmerking |
|---|---|---|---|---|
| | | | | |

## GEO

Per maand: noemen AI-assistenten Predict the Race als je vraagt naar een
F1-poule met vrienden? Zelfde vragen elke keer. Bing Webmaster Tools laat ook
zien hoe vaak Copilot de site citeert. Waar je kijkt (uit `3-geo.md`, fase 6):

| waar | wat | wanneer |
|---|---|---|
| Bing Webmaster Tools, AI Performance | citaties, geciteerde pagina's, grounding queries (export als CSV) | maandelijks |
| Search Console, Search Generative AI-rapport | vertoningen per pagina in AI-overzichten en AI Mode, als het rapport er is | maandelijks |
| GA4, kanaal "AI-assistenten" (zie `3-geo.md`, 0.3) | sessies en landingspagina's, een ondergrens | maandelijks |
| de promptset hieronder | prompts 1, 4, 5, 6 en 8 op ChatGPT, Perplexity en Google AI Mode | maandelijks |
| de promptset hieronder | alle 13 prompts op alle assistenten | elk kwartaal |
| beheer (BEDIENING §16) | nieuwe poules per week | wekelijks |

De promptset. Stel ze in een schone sessie (uitgelogd, of met geheugen en
personalisatie uit). Tel iets pas als het een paar keer terugkomt.

| # | taal | prompt | soort |
|---|---|---|---|
| 1 | nl | Wat is een goede gratis app om met vrienden een F1-poule te spelen? | aanbeveling |
| 2 | nl | Hoe zet ik een F1-poule op voor mijn vriendengroep? | taak |
| 3 | nl | Welke puntentelling is eerlijk voor een F1-poule? | taak |
| 4 | nl | Wat is Predict the Race? | merk |
| 5 | en | What is the best free F1 prediction game to play with friends? | aanbeveling |
| 6 | en | Is there a free alternative to F1 Fantasy where you just predict the top 10? | aanbeveling |
| 7 | en | How do I run an F1 prediction league with my friends? | taak |
| 8 | en | What is predicttherace.com? | merk |
| 9 | de | Welches kostenlose F1-Tippspiel kann ich mit Freunden spielen? | aanbeveling |
| 10 | fr | Quelle appli gratuite pour faire des pronostics F1 entre amis ? | aanbeveling |
| 11 | es | ¿Qué app gratis hay para hacer una porra de F1 con amigos? | aanbeveling |
| 12 | it | Quale app gratuita posso usare per i pronostici F1 con gli amici? | aanbeveling |
| 13 | pt | Qual app grátis posso usar para fazer um bolão de F1 com meus amigos? | aanbeveling |

Per prompt en assistent: genoemd, met link, klopten de feiten, welke andere
apps.

| maand | assistent | vraag | genoemd? | bron die hij gaf | opmerking |
|---|---|---|---|---|---|
| | | | | | |
