# 04 · Cypress Point

**23. Oktober 2026 · Theme-ID `cypress-point` · Spalte 4 von 5 · Priorität P2 · relativer Umfang M.**

Gute Baumformen; übergroße Vorderhänge und Lichtabstimmung bearbeiten.

## Zielbild und belegter Aufbau

Felsige, dunkler werdende Küstenstraße mit Zypressenhainen und einzelnen Schirmkiefern, sichtbar andere Silhouetten als Palm Cove.

Neuer Hang-Painter mit Wiesen, Senken und Ausläufern; sechs gewichtete Baumvarianten, Buschgruppen und eigene `point_rock_*`-Varianten. Keine Häuser-/Dorfmodule. Linke Seite `forest`, rechts weiterhin Küste mit Leitplanke und einzelnen Zypressen, Steinen und Wasserfelsentürmen. Warme violette Dämmerung; jedoch kein `dark`-Wert gesetzt.

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 1 → 2 → 3 → 4`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Zypressen und Schirmkiefern unterscheiden die Stage klar vom Palmenauftakt. Die Küstenferne bietet schöne warme Blickfenster.
- Mehrere grüne Vorderhänge steigen als sehr große dreieckige Masse über den oberen Bildrand und nehmen den Mittelgrund fast vollständig ein.
- Helles Grün am Nahhang konkurriert mit dem bereits dunklen violetten Himmel. Die Landschaft wirkt dadurch teilweise später am Tag als ihre Beleuchtung.

![Fahransichten Cypress Point](<bilder/cypress-point.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

47 Kurventafeln, davon 16 vor einem noch anders gerichteten S-Schwung: besonders hoher Bedarf an gestaffelter Vorwarnung. Rechtes Twilight-Icon fehlt.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Technisch klar; kein eigener Wetter-Kraftfaktor. Ein expliziter dark-Wert fehlt, trotz der dunklen Bildpalette. Das ist eine zu prüfende Lichtabstimmung, kein Beweis für einen Physikfehler. Keine zusätzliche Laub-/Schatten-Haftung einführen.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Zwei bis drei Vorderhänge gezielt absenken und Haine auf vorgelagerten Geländeabsätzen verteilen. Hohe Form nur in wenigen Kurven als Rahmung einsetzen.
2. Baumgruppen in Größe und Abstand staffeln: einzelne große Kiefern nahe, schmale Zypressen im Mittelgrund, ruhigere Silhouetten hinten.
3. Nadeldecke, niedrige Büsche und grobe Felsfüße ergänzen; helle große Grasfacetten auf die Dämmerung abstimmen.
4. Fahrzeugbeleuchtung und Dunkelheitsverlauf zwischen Surfside, Cypress und den möglichen Nachfolgern prüfen. Den hohen Anteil von S-Kurven vor allem über verständlichere Schilder vermitteln.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Meer und ferner Höhenzug bleiben an mehreren vorher festgelegten Stellen durch Sichtfenster erkennbar.
- Nahterrain und Bäume teilen dieselbe erkennbare Abendbeleuchtung.
- S-Kurvenwarnungen verwechseln den aktuellen Schwung nicht mit dem nächsten; Verkehr hebt sich vom dunklen Hintergrund ab.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L170), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)
