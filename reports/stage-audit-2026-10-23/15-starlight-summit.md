# 15 · Starlight Summit · Ziel D

**23. Oktober 2026 · Theme-ID `starlight-summit` · Spalte 5 von 5 · Priorität P1 für Zielmotiv, P2 für Gelände · relativer Umfang M.**

Gute nächtliche Tiefe; eigenes Gipfelziel und klare Lichtführung fehlen.

## Zielbild und belegter Aufbau

Nächtliche Auffahrt zum Observatorium mit kühlen Felsrippen, hochgelegenen Sichtfenstern, dunklen Nadelbäumen und einem eindeutigen Ziel unter Sternen.

Neuer Hang-Painter auf beiden Seiten, eigene kühle Rockvarianten und fünf Nachtkiefernsilhouetten; gruppierte Vegetation, keine Hausmodule. Hohe Straßenhügel und viele Kurven. Lampen alle 16 Segmente rechts; dunkel 1. Assets für Sternwarte, Radioteleskop, Antenne, Zelt, Kristall und kleines Teleskop existieren in `PROP_INFO` und als PNGs. **Keines davon wird von der Stagekonfiguration oder einem Sonderplatzierer am Straßenrand eingesetzt.** Das vorhandene Straßenbild ist damit primär ein nächtlicher Wald-/Felsberg. Ein fern eingezeichnetes Bauwerk wäre davon getrennt zu bewerten.

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 1 → 2 → 7 → 14`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Kühle Felsflächen, mehrere Bergstaffeln und dunkle Nadelbäume ergeben bereits eine räumlich überzeugende Nachtfahrt.
- Einige große Vorderhänge sind noch sehr glatt und dreieckig. Einzelne grüne Buschflecken wirken im blauen Nachtbild auffällig hell.
- Die Straßenansichten liefern überwiegend Wald-/Felslandschaft. Eine erkennbare Anfahrt auf ein besonderes Gipfelziel entsteht daraus noch nicht.

![Fahransichten Starlight Summit](<bilder/starlight-summit.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

Keine Routenwahl mehr, Ziel D. Kurvenwarnungen und Gipfel-/Observatoriumswegweisung sauber unterscheiden; nicht aus dem Vorhandensein einer Antenne eine Straßenabzweigung ableiten.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Klare Nacht, normales Fahrmodell trotz großer Höhenwechsel. Kein versteckter Höhenwind und keine heimliche Vereisung. Dunkelheit bleibt eine visuelle Aufgabe; ein besonderer Windabschnitt wäre ein späteres, gesondert angekündigtes Design.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Vorhandene Observatoriums-, Antennen- und Teleskopassets gezielt einsetzen: ein früher Aussichtspunkt mit Antenne, später sichtbare Kuppel, abschließend kleines Ankunftsplateau vor Ziel D.
2. Zwei bis drei Sichtfenster zum Sternenhimmel und Ferngebirge schaffen. Große Vorderhänge örtlich brechen; breite Felsrippen und ruhige dunkle Flächen kombinieren.
3. Büsche und Felskontakt auf die Nachtpalette abstimmen. Emissionsmaske vor der Verwendung heller Sternwartengebäude klären.
4. Lampen auf Zufahrt und Ankunft beschränken. Scheinwerferlicht weich und niedrig im Kontrast führen, damit es keine zusätzlichen Fahrbahnstreifen suggeriert.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Antenne/Kuppel/Ankunft ergeben eine verständliche Steigerung bis Ziel D.
- Helle Buschflecken und Gebäude passen in die kühle Nachtbeleuchtung; nur echte Lichtquellen leuchten.
- Kurvenkante und Verkehr bleiben auch in den dunklen Zwischenstücken klar erkennbar.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L433), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)
