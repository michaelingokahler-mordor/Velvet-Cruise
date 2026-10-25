# 08 · Redwood Pass

**23. Oktober 2026 · Theme-ID `redwood-pass` · Spalte 4 von 5 · Priorität P1 · relativer Umfang L.**

Waldtiefe stärken und den geschlossenen Wandkorridor öffnen.

## Zielbild und belegter Aufbau

Hohe alte Bäume, kühler Nebel und geschützter Waldpass; Baumstämme geben Tiefe, Lichtungen schaffen Orientierung.

Alte Forest-Wände auf beiden Seiten. Redwood, Pine, Farn, Stamm und einzelne beleuchtete Hütten aus gleichartigen Zufallspools. Bäume stehen zusätzlich auf zufälligen Höhenfraktionen des Hangs. Nebel und erhöhte Dunkelheit sind konfiguriert; Fernhintergrund enthält mehrere weichere Waldkämme. Starke Kurven (`twist: 3.2`). Generischer Kontaktschatten fehlt bei `redwood`, Farn und Baumstamm, nicht aber bei `pine`; ein Assetschatten kann trotzdem im PNG enthalten sein.

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 1 → 6 → 7 → 13`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Die Nebelstaffelung erzeugt bereits glaubwürdige Entfernung. Große Stämme vor blassen Baumgruppen sind ein gutes Grundmotiv.
- Beidseitige grünbraune Wände laufen nahezu ständig parallel zur Straße; ihre gezackten Kronen sind trotz Nebel sichtbar.
- Die Baumformen und Größen wiederholen sich stark. Unterschiedliche Ebenen sind vorhanden, aber eine dichte Waldwand verdrängt Lichtungen und Durchblicke.

![Fahransichten Redwood Pass](<bilder/redwood-pass.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

47 Kurventafeln, acht vor S-Gegenschwung. Nebelkontrast und Erkennbarkeit wichtiger als noch mehr Tafeln; Warnungen vor Kuppen und dichter Stammkulisse prüfen.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Nebel senkt Sicht und Kontrast, ändert aber keine direkte Fahrkraft. Das ist für diesen Waldpass sinnvoll. Keine zusätzliche Gripstrafe nötig; Sichtvorlauf und Leitsignale sind die eigentliche Aufgabe.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Waldboden und niedrige bewachsene Böschung an die Stelle der meisten hohen Bandwände setzen. An wenigen Stellen einen bewachsenen Einschnitt als bewusstes Motiv behalten.
2. Drei Ebenen planen: wenige große dunkle Redwood-Stämme mit Wurzelansatz, mittlere Baumgruppen/Farnlichtungen, hinten ruhige Nebelsilhouetten.
3. Vor engen Kurven Sichtschneisen und reflektierende Orientierungspunkte schaffen. Nebel in Bänken und Lücken staffeln, statt überall dieselbe Kontrastdecke aufzulegen.
4. Ein oder zwei Hütten auf kleinen ebenen Lichtungen mit warmem, örtlich begrenztem Licht einsetzen. Kontaktregeln für Redwood, Farne und liegende Stämme ergänzen.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Mehrere klar geplante Lichtungen und wechselnde Waldtiefen sind ohne Suchen sichtbar.
- Rücklichter, Außenkante und mindestens eine kommende Kurveninformation bleiben gleichzeitig erkennbar.
- Große Stämme haben Bodenkontakt und stehen außerhalb der vorgesehenen Rückkehr-/Auslaufzone.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L267), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)
