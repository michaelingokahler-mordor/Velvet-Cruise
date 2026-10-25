# 09 · Painted Desert

**23. Oktober 2026 · Theme-ID `painted-desert` · Spalte 3 von 5 · Priorität P1 für Böenvorlauf, P2 für Grafik · relativer Umfang M.**

Gute offene Grundlandschaft; Sandzeichnung und Seitenwind fairer vermitteln.

## Zielbild und belegter Aufbau

Offene warme Wüste, weite Mesa-Silhouetten, niedrige Sand-/Schotterwellen und große Luftperspektive.

Keine linke oder rechte Wand. Sandfarbener Boden und mäßig hügelige Straße mit vielen Geraden. Saguaro, Kaktus, große Mesa-Felsen, Tumbleweed, Tankstelle und Wüstenbusch stehen in Zufallspools beidseits. Eigene Mesas/Buttes/Spitzen in der Fernkulisse. Sandwetter dämpft Distanzkontrast. Mehrere dieser Namen sind nicht im generischen Schattenfilter (`mesa_rock`, `saguaro`, `cactus`, `gas_station`, `desert_bush`).

Geprüfte Bildserie: **12 Ansichten** auf Route `0 → 5 → 8 → 9 → 10`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Die Stage ist tatsächlich offen und hat eigenständige Mesa-/Kaktussilhouetten. Hier fehlt keine neue große Wand.
- Orangebrauner Schleier und helle Sandstriche überziehen fast das ganze Bild, einschließlich Straße. Unterschiede zwischen naher Erde und fernem Fels werden schwach.
- Große Kakteen und Mesas funktionieren als Blickpunkte, sind aber recht gleichmäßig beidseits verteilt. Die kleinen Nutzungsorte wirken daraus zufällig eingestreut.

![Fahransichten Painted Desert](<bilder/painted-desert.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

Gelbe Warnungen brauchen dunklen Rand gegen den warmen Sand. Sechs S-Gegenschwung-Fälle; reale Ziele Death Valley/Snowcap verwenden, keine Highway-Zufallspfeile übernehmen.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Echte Seitenböen bis 0,46 Fahrbahnhalbbreiten pro Sekunde. Eine unkorrigierte volle Böe kann rechnerisch etwa 0,70–1,17 Fahrstreifen versetzen. Richtung und Stärke werden gleichzeitig sichtbar, bisher ohne garantierten Vorlauf. Stärke zunächst als Prüfbaseline behalten; keine zusätzliche Motorschwäche hinzufügen.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Offene Weite bewahren. Drei Mesa-Gruppen in unterschiedlicher Ferne, ein Tankstellenplatz und längere leere Abschnitte als Streckenrhythmus komponieren.
2. Niedrige Schotter-/Sandformen und dunkle Steingruppen für den Vordergrund einführen; Schatten unter Kakteen und großen Mesas an den Boden koppeln.
3. Sandpartikel stärker in wenige erkennbare Fahnen und Tiefenlagen aufteilen. Den Fahrbahnkorridor ausreichend ruhig halten und die Böenrichtung in Partikeln, Fahne/Windsack und Audio gemeinsam zeigen.
4. Eine definierte Vorwarnphase vor der Seitenkraft vorsehen. Böenbeginn an Abzweigungen und ungünstige Überlagerungen mit Außenkurve/Verkehr begrenzen; erst danach entscheiden, ob die heutige Stärke reduziert werden muss.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Eine neue Böe ist vor der Kraft durch Richtung und Anstieg erkennbar; Entwurfsziel 0,5–0,8 Sekunden Vorlauf.
- Volle Böe in linker/rechter Kurve und neben Verkehr mit kurzer, verständlicher Gegenreaktion beherrschbar.
- Kakteen/Mesas haben einen tragenden Boden; Distanzstaffelung ist auch während Sand sichtbar.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L289), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)
