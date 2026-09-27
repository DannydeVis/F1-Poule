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
F1-poule met vrienden? Zelfde vragen elke keer, in NL en EN. Bing Webmaster
Tools laat ook zien hoe vaak Copilot de site citeert.

| maand | assistent | vraag | genoemd? | bron die hij gaf | opmerking |
|---|---|---|---|---|---|
| | | | | | |
