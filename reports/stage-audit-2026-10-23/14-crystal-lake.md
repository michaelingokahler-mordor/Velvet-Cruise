# 14 · Crystal Lake · Ziel C

**23. Oktober 2026 · Theme-ID `crystal-lake` · Spalte 5 von 5 · Priorität P1 · relativer Umfang M bis L.**

Schöne Mondstimmung; Seeufer von der Meereslogik trennen.

## Zielbild und belegter Aufbau

Stiller Bergsee im Mondlicht, dunkle Wälder, ferne Schneegipfel, einzelne Hüttenlichter und kleine Seeuferplätze.

Alte Forest-Wand links, rechts Wasser nach Küstenregel, aber `noRail: true` und breiteres Ufer. Seefichten, Birken, Felsen, Hütten und Farn links; Schilf, Ruderboot, Lagerfeuer und Gras rechts. Seerosen/Schilf zusätzlich auf dem Wasser; Laternen alle 16 Segmente rechts. Starke Mondreflexion (`sunGlow: .95`) und eigener Berg-/Seehintergrund. Weil die allgemeine `sea_stack`-Bedingung Küstenmodus statt Gewässertyp prüft, werden auch im Bergsee Meeresfelsentürme platziert. Foam wird weiter nach derselben gemeinsamen Küstenregel gezeichnet.

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 1 → 6 → 7 → 13`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Mond, Schneegipfel und dunkles Wasser ergeben ein starkes ruhiges Zielmotiv. Uferplätze und einzelne Feuer sind bereits vorhanden.
- Im See stehen tatsächlich spitze Küstenfelsentürme; auch die sehr helle Glitzerspur wirkt eher wie Meeresschimmer als ein ruhiger Bergsee.
- Links dominiert eine hohe Waldwand; rechts läuft eine regelmäßige Straßenlaternenreihe durch relativ ungestalteten Grasrand. Diese Infrastruktur erklärt keinen Uferweg.

![Fahransichten Crystal Lake](<bilder/crystal-lake.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

Keine weitere Verzweigung, Ziel C. Kurvenpfeile gegen dunkle Bäume absetzen; Uferweg-/Campingzeichen dürfen keine Fahrbahnabzweige vortäuschen.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Klar bei dark=0,85. Kein Grip-/Bremsfaktor, auch wenn die Vorgängerstage Schnee zeigte. Ein optionaler leichter Uferdunst wäre rein optisch; keine verdeckte Restvereisung ergänzen.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Eigenen Gewässertyp lake einführen: wenige flache Insel-/Uferfelsen statt Meeresnadeln, sehr wenig Schaum, feinere ruhigere Lichtstriche.
2. Linke Waldwand auflockern und ein flaches natürliches Ufer mit Schilfbuchten und Landzungen aufbauen. Fichten/Birken in Gruppen staffeln.
3. Zwei kleine Hütten-/Lagerplätze mit ebenem Boden, Steg, Boot und örtlichem Feuerlicht gestalten. Laternen nur an Wegen oder Plätzen belassen.
4. Mondreflex des Fernbilds und dynamischen Wassers bei Kurven gemeinsam prüfen. Nach Snowcap die wieder trockene Fahrbahn klar zeigen; Ziel C als ruhige Seeankunft komponieren.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Keine generischen Meeresfelsnadeln und keine starke Brandung im See.
- Mond und Reflex bleiben in beiden Kurvenrichtungen plausibel ausgerichtet.
- Boot, Steg, Feuer und Hütte besitzen nachvollziehbare Ufer-/Bodenkontakte; freies Seeufer bleibt befahrbar lesbar.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L410), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)
