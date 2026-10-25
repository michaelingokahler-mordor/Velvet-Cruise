# 07 · Vineyard Valley

**23. Oktober 2026 · Theme-ID `vineyard-valley` · Spalte 3 von 5 · Priorität P1 · relativer Umfang L.**

Weinberge räumlich neu ordnen; Weingüter auf echte Höfe setzen.

## Zielbild und belegter Aufbau

Weite Weinlandschaft mit warmen Hängen, geordneten Rebflächen, Zypressen und kleinen Weingütern.

Alte Hill-Wand links, rechts keine Wand. Weinreben alle 3 Segmente an fünf festen Querpositionen, mit nur 0,04 Querjitter und einer ausgedünnten Dichte. Zypressen, Oliven, Weingüter, Fässer, Heuballen und Windmühlen zufällig daneben. `winery` wird zusätzlich auf den Hang gesetzt; keine Grundstücksplanung. Hügelmultiplikator 1,5; landschaftlicher Fernhintergrund mit Weinbergen und Dorf vorhanden.

Geprüfte Bildserie: **12 Ansichten** auf Route `0 → 5 → 6 → 11 → 12`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Weinreben, Zypressen, Oliven und Windmühlen vermitteln die Region überzeugend. Der warme Fernhintergrund funktioniert bereits.
- Vorne steigen grelle grün gebänderte Hänge fast senkrecht auf; Gebäude wirken auf diese Flächen geklebt.
- Reben bilden lange gleichmäßige Bänder entlang der Straße. Die Idee von Feldern ist erkennbar, die Parzellen und Hofzugänge fehlen.

![Fahransichten Vineyard Valley](<bilder/vineyard-valley.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

Kurvenwarnungen von Reben und Stämmen freistellen. Abzweigziele Snowcap/Redwood kommen korrekt aus dem Routennetz; vier S-Gegenschwung-Fälle verständlicher ankündigen.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Klarer Sunset, normale trockene Physik. Windmühlen erzeugen keine Seitenkraft. Eine leichte gemeinsame Blatt-/Flügelbewegung kann Atmosphäre vermitteln; neue Böen sind für die Stage nicht nötig.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Links niedrige Rebterrassen und Höfe bauen, hohe Hügel in den Hintergrund setzen. Weingüter nur auf ebenen Welt-Höhen-Grundstücken platzieren.
2. Reben zu großen klar begrenzten Feldern zusammenfassen. Reihen pro Feld gemeinsam orientieren; Feldwege, Trockenmauern und freie Blickachsen trennen die Parzellen.
3. Fässer, Heu und Arbeitsobjekte bei den passenden Höfen gruppieren. Zwei Landmarken mit längerer Anfahrt statt vieler gleichrangiger Winery-/Windmühleninstanzen einsetzen.
4. Farbflächen am Nahhang breiter und weniger streifig komponieren. Oliven und Weingüter mit passendem Bodenschatten versehen; gespiegelt gezeichnete Lichtrichtungen bei Architektur vermeiden.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Alle Weingüter stehen mit voller Breite auf einem sichtbaren Hof, einschließlich Kurve und Steigung.
- Mehrere Rebparzellen sind als getrennte Flächen mit unterschiedlichen gemeinsamen Reihenrichtungen erkennbar.
- Warnzeichen und Fahrbahnränder bleiben vor Reben/Zypressen frei.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L244), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)
