#!/usr/bin/env bash
# Eén ping naar healthchecks.io, vanuit een workflow. Zie BEDIENING.md,
# "Bewaking".
#
#     bash scripts/bewaking.sh <slug> ok|fail [bericht]
#
# De ping key staat alleen als secret HC_PING_KEY. Zonder die secret doet dit
# niets. De URL met de sleutel komt nooit in de log: curl schrijft hem niet,
# en GitHub maskeert de secret ook nog. Het bericht gaat als body mee (de
# reden van een /fail); daar hoort geen spelersdata in.
#
# Een ping die mislukt laat de job nooit falen: de bewaking mag nooit de
# reden zijn dat een sync of reservekopie rood wordt.
#
# ?create=1 laat healthchecks de check aanmaken bij de eerste ping, met de
# slug als naam. Periode en grace zet je daarna zelf (BEDIENING.md).

slug="${1:-}"
uitkomst="${2:-ok}"
bericht="${3:-}"

if [ -z "${HC_PING_KEY:-}" ]; then
  echo "Geen HC_PING_KEY: geen ping naar healthchecks.io"
  exit 0
fi
if ! [[ "$slug" =~ ^[a-z0-9-]+$ ]]; then
  echo "Ongeldige slug voor healthchecks.io: '$slug'"
  exit 0
fi

pad="$slug"
if [ "$uitkomst" != "ok" ]; then pad="$slug/fail"; fi

if curl -fsS -m 10 --retry 3 -o /dev/null --data-raw "${bericht:0:10000}" \
     "https://hc-ping.com/${HC_PING_KEY}/${pad}?create=1"; then
  echo "Ping naar healthchecks.io: $pad"
else
  echo "Ping naar healthchecks.io ($pad) lukte niet; de run gaat gewoon door"
fi
exit 0
