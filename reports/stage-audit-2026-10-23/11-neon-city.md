# 11 · Neon City · Ziel A

**23. Oktober 2026 · Theme-ID `neon-city` · Spalte 5 von 5 · Priorität P2 · relativer Umfang M.**

Bereits starke Stadtidentität; Licht und Gebäuderhythmus gezielt ordnen.

## Zielbild und belegter Aufbau

Schnelles Nachtfinale im Gebäudecanyon, lesbare Straßenkante, Neonakzente und drei abwechslungsreiche Tunnel.

Eigener City-Painter auf beiden Seiten, Gebäudeabschnitte 14–43 Segmente lang mit gelegentlichen 2–4 Segmenten Gasse, unterschiedliche Höhen, fünf Fensterfarben und vier Neonfarben. Drei Tunnel, je 130–229 Segmente. Laternen alle 12 Segmente, Neonbögen alle 460. Neonpalmen, Hydranten, Imbisswagen, Busstopps, Reklamen und Ampeln als Zufallspools; seitliche Neonblades an Gebäuden. Lichtflächen von Neon-/Signal-/Billboardnamen werden bewusst übersprungen, Lampen und Imbiss/Haltestelle erhalten generischen Lichtschein.

Geprüfte Bildserie: **12 Ansichten** auf Route `0 → 5 → 8 → 9 → 10`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Häusercanyon, Leuchtreklame, Palmen und Tunnel wirken zusammenhängend und klar anders als alle Naturstrecken.
- Viele fast gleich helle Fenster und Neonstreifen konkurrieren in der Ferne. Die Detaildichte nähert sich einem Rasterrauschen.
- Die Tunnel bieten eine gute räumliche Abwechslung. Auf offenen Abschnitten sind die Scheinwerferflächen teilweise sehr hell und bandförmig.

![Fahransichten Neon City](<bilder/neon-city.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

Neonbögen sind keine Highway-Ausfahrtsschilder. 40 Kurventafeln, zehn S-Gegenschwung-Fälle. Verkehrszeichen müssen sich von Neonwerbung unterscheiden.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Nacht und Tunnel, normale Basisphysik. Die Stage hat bereits die höchste konfigurierte Verkehrsdichte (3,4). Eine zusätzliche Nacht-Gripstrafe oder neue Ampel-Stoppregel wäre für den gewünschten Fluss ungeeignet.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Drei Bezirke komponieren: niedrige Geschäftsfronten, hoher Canyon, Öffnung zur finalen Skyline. Vorhandene Gebäudegeometrie dafür variieren, keine beliebige Objektverdichtung.
2. Fenster in größere Gruppen und ausgewählte beleuchtete Stockwerke gliedern. Helle Reklamen begrenzen; Fahrbahn, Verkehr und Kurvenzeichen erhalten Vorrang vor Fassadenlicht.
3. Die drei Tunnel durch Portal, Leistenfarbe und Umfeld unterscheidbar machen. Weiche Ein-/Ausfahrthelligkeit und freie Portalsicht prüfen.
4. Kleine Lichtreflexe an konkrete Neonquellen binden. Scheinwerferflächen weniger wie Fahrstreifen markieren; Fußgänger-/Ampelmotive nur bei tatsächlich dargestellten Orten nutzen.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Bei voller Werbe-/Fensterdichte sind freie Fahrspur und Rücklichter zuerst erkennbar.
- Alle drei Tunnel haben lesbare Ein- und Ausfahrt; Lichtwechsel blendet keine Gefahr aus.
- Ziel A erhält eine erkennbare finale Skylineöffnung statt nur weiterer gleicher Häuserblöcke.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L334), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)
