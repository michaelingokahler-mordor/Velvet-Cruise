# 02 · Coral Bluffs

**23. Oktober 2026 · Theme-ID `coral-bluffs` · Spalte 2 von 5 · Priorität P2 · relativer Umfang S.**

Gelände und akzeptierte Fernberge bewahren; Felsübergänge verfeinern.

## Zielbild und belegter Aufbau

Trockene Küstenhügel und kleine Dörfer; massive Berge bleiben in der Ferne, kurze Sandsteineinschnitte rücken innen in Linkskurven heran.

Eigener Geländequerschnitt; Felsnase wird gezielt aus negativer Kurve abgeleitet. Gebäude und Leuchtturm haben ebene Grundstücke. Nahfelsen besitzen unregelmäßigen Kamm, größere Flächen, mineralische Einsprengsel und kurze Klüfte. Die Fernberge wurden auf Wunsch wieder auf die ruhigere vorherige Polygonkulisse zurückgestellt. Das ist ein gewollter Stand, kein offener Fehler.

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 1 → 6 → 7 → 13`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Nahe Sandsteineinschnitte rahmen die Linkskurven; dazwischen bleiben niedrige trockene Hügel, Siedlungen und Meer sichtbar.
- Die neuen kantigen Einsprengsel lesen sich deutlich als Felsmaterial. Die ruhigere, wiederhergestellte Fernkulisse trennt sich davon gut.
- Lange trockene Flächen sind teilweise groß und wenig untergliedert. Ihr ruhiger Charakter ist sinnvoll; abwechslungsreichere Gruppen helfen mehr als zusätzliche Textur überall.

![Fahransichten Coral Bluffs](<bilder/coral-bluffs.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

Rechtes Surfside-Icon fehlt. Fünf S-Gegenschwung-Vorwarnungen verdienen eine bessere Symbolik; die Warnpfeile sind nicht zufällig.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Kein Regen-, Schnee-, Hitze- oder Windmodell in dieser Stage. Die warme Farbpalette ist kein eigener Hitzeeffekt. Zusätzliche Böen in den nahen Einschnitten würden unnötig Kurve und Randgefahr stapeln.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Die vom Nutzer wiederhergestellte Bergkulisse als verbindliche Referenz sichern. Strukturänderungen auf nahe Felsflächen begrenzen.
2. Anfang und Ende der langen Einschnitte bewusst ausformen: einzelne Felsschollen, Geröllfuß und niedriger Busch statt abrupt beginnender gleich hoher Wand.
3. Zwei bis drei Felsvarianten mit unterschiedlichen großen Bruchflächen einsetzen. Kleine Einsprengsel erst zeigen, wenn genügend Bildpixel vorhanden sind; in der Ferne ruhig ausblenden.
4. Dorf- und Leuchtturmstellen als getrennte Blickpunkte stärken, ohne die ebenen Grundstücke zu verbreitern oder wieder sandfarbene Dauerstreifen zu zeichnen. Kurvenschilder im Straßenraum freistellen.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Die Fernberge stimmen mit dem akzeptierten Stand überein.
- Felsnase erscheint gezielt in Linkskurven; Gerade und Rechtskurve bleiben offen.
- Felsfuß, 21 Haus-/Leuchtturmgrundstücke und freie Auslaufzone behalten einen nachvollziehbaren Bodenkontakt.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L121), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)
