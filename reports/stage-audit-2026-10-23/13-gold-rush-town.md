# 13 · Gold Rush Town · Ziel B

**23. Oktober 2026 · Theme-ID `gold-rush-town` · Spalte 5 von 5 · Priorität P1 · relativer Umfang M bis L.**

Aus verstreuten Westernobjekten einen Ort bauen; Hitzeflimmern deutlich begrenzen.

## Zielbild und belegter Aufbau

Staubiger kleiner Westernort bei Abendlicht, nicht eine Wüste mit zufällig verteilten Saloon-Sprites.

Alte Hill-Wand links, rechts offen. Saloon, Store, Wasserturm, Wagen, Minenkarren, Anbindebalken, rote Felsen, Kakteen, Fässer, Heuballen, Tumbleweed, Wrack und Pumpwindrad stark durchmischt beidseits. Gaslampen alle 14 Segmente. Keine `groups`, keine Grundstücke, keine Zuordnung der Wirtschaftsobjekte zu einem Laden-/Minenhof. Hohe Dämmerungsdunkelheit 0,6 und Hitze. Haus-/Storegrund wird vom generischen Schattenfilter nicht abgedeckt, Lichtschein ist vorhanden.

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 5 → 6 → 11 → 12`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Warme Felsen, Veranden, Gaslampen, Kakteen und Westernobjekte ergeben eine deutliche Themenwelt.
- Gebäude und Arbeitsobjekte stehen stark verstreut; durchgehende Höfe, Holzgehwege und Ortsblöcke sind kaum lesbar.
- Das Hitzeflimmern verbiegt Laternen, Kakteen und Gebäudedetails in sichtbare Zickzacklinien. Es beeinträchtigt das Motiv stärker als es trockene Luft vermittelt.

![Fahransichten Gold Rush Town](<bilder/gold-rush-town.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

18 Kurventafeln, nur ein S-Gegenschwung-Fall. Geschäftsschilder als Kulisse eindeutig von gelben Verkehrszeichen unterscheiden; kein weiterer Routenabzweig.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Hitze bei Dämmerung (dark=0,6), Basisfahrmodell. Staub-/Windmühlenmotive erzeugen keine Seitenkraft. Atmosphäre über warme Luft und lokale Staubwirbel entwickeln; kein zufälliges Rutschen oder Motorleistungsverlust.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Zuerst Hitzemaskierung mit Death Valley gemeinsam lösen: entferntes Flimmern, stabile nahe Silhouetten. Für den Ort weniger Stärke als in der offenen Wüste verwenden.
2. Zwei bis drei zusammenhängende Ortsblöcke auf ebenem Grund planen, mit Holzgehwegen, Vorplätzen und niedrigen Hügeln im Hintergrund.
3. Objekte funktional zuordnen: Wagen/Hitchrail am Saloon, Fässer am Store, Minenkarren beim Minenhof, Wasserturm am Ortsrand. Große freie Zwischenstücke behalten.
4. Lampen nur an Ladenfronten, Wegen und Zielplatz einsetzen. Vor Ziel B einen eigenen beleuchteten Ankunftsbereich bauen; neue Hausvarianten erst nach dem Layouttest ergänzen.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Stabile gerade Lampen-/Kaktuskanten im Nahbereich während des gesamten Hitzezyklus.
- Mindestens zwei Ortsblöcke besitzen verbundene Standflächen und nachvollziehbare Objektzuordnung.
- Ziel B ist als eigener Ankunftsort erkennbar; Geschäftsschilder überdecken keine Kurvenwarnungen.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L387), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)
