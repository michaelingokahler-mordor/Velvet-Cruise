# 01 · Palm Cove

**23. Oktober 2026 · Theme-ID `palm-cove` · Spalte 1 von 5 · Priorität P2 · relativer Umfang S.**

Referenz erhalten; Komposition örtlich verfeinern.

## Zielbild und belegter Aufbau

Heller Küstenauftakt mit warmer Sonne, blauem Wasser, lockeren Palmen, durchlüfteten grünen Hügeln und kleinen Siedlungen. Referenz für Tiefe und Bodenanschluss, nicht eine Vorlage, die allen anderen Stages dieselbe Vegetation gibt.

Eigenes geschlossenes Geländevolumen mit niedrigem Straßenbankett, breiter Terrasse und weiter hinten liegenden Hügeln. Gebäude werden auf Welt-Höhe eingeebnet; Bäume und Büsche folgen der tatsächlich gezeichneten Oberfläche. Große Auswahl an Palmen, Büschen, Felsgruppen, Grasbüscheln, Villen und Kapelle. Separate Anfangsbepflanzung; rechts Meer und Leitplanke. Sonnenglanz wird sowohl am Horizont als auch im sichtbaren Wasser gezeichnet.

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 5 → 8 → 9 → 10`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Die Tiefe aus Fernhügeln, niedrigerem Mittelgrund und Büschen/Felsen nahe der Straße funktioniert. Der Auftakt wirkt offen und das Wasser ist klar ablesbar.
- Größere Wiesenstücke bleiben sehr glatt und bilden längliche diagonale Farbflächen. Zusätzliche Einzelpixel würden diese Flächigkeit nicht sinnvoll lösen.
- Wasserfelsentürme kehren als starkes Motiv oft wieder. Die Siedlungen sind deutlich kleiner und zurückhaltender; das ist im Einstieg angenehm.

![Fahransichten Palm Cove](<bilder/palm-cove.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

Küsten-Zielsymbol an der ersten rechten Abzweigung fehlt. Zwei Warnungen für den zweiten S-Kurvenschwung stehen noch im anders gerichteten ersten Teil; echte Kurven liegen zugrunde.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Klares Tageslicht, Basisfahrmodell. Kein physikalischer Küstenwind. Der Einstieg sollte die trockene Referenz bleiben. Wind kann an Palmen, Gras oder Fahnen sichtbar werden; eine neue Seitenkraft wäre hier kein sinnvoller erster Schritt.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Bestehende Geländevolumen und Grundstücke als feste Referenz behalten. Zwei bis drei besonders kahle Abschnitte auswählen und dort größere Grasinseln, ein Buschpaar und einzelne grobe Steine komponieren.
2. Küstenfelsentürme in wenige räumlich unterschiedliche Gruppen verteilen; ruhige Wasserstrecken dazwischen lassen. Keine dichtere Hinderniskette am Auslauf.
3. Sonnenreflex und sichtbare Sonne in beiden Kurvenrichtungen gemeinsam abnehmen. Feste Wasserbänder und animierte Glanzstriche in ihrer Helligkeit aufeinander abstimmen.
4. Erste Abzweigung als verständliche Einführung ausarbeiten: beide Ziele früh zeigen, Küsten-Icon ergänzen, S-Kurven-Zeichen eindeutig unterscheiden.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Start samt linkem Geländerücken bleibt geschlossen; niemand sieht hinter eine offene Kulisse.
- Bestehende 550-Welteinheiten-Freilücke der zusätzlichen Vegetation und ebene Hausgrundstücke bleiben nachweisbar.
- Sonnenreflex bleibt in Links- und Rechtskurven auf Wasser; die Fernhügel behalten ihren akzeptierten Charakter.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L87), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)
