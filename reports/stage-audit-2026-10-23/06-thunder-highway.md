# 06 · Thunder Highway

**23. Oktober 2026 · Theme-ID `thunder-highway` · Spalte 2 von 5 · Priorität P1 · relativer Umfang M.**

Schilderlogik zuerst; technische Umgebung und Regen anschließend beruhigen.

## Zielbild und belegter Aufbau

Breite, schnelle Interstate im Gewitter, nasser Asphalt, kontrollierter Rhythmus aus Beleuchtung und Lärmschutz; im Hintergrund Regenvorhänge und ferne Stadt.

Boden auf beiden Seiten; niedrige `sound`-Wände links und rechts. Lampen alle 14 Segmente beidseitig; Brücken alle 640 Segmente. Pylonen, Tafeln, Büsche und Barrieren aus Zufallspools. Weniger Höhenwechsel und Kurven als die Wald-/Bergstages. Eigene Regen-/Blitzdarstellung und feuchter Straßenlook sind vorhanden. Keine Terrainkonfiguration; die Sound-Wand verwendet alte wechselnde Farbbänder.

Geprüfte Bildserie: **12 Ansichten** auf Route `0 → 5 → 8 → 9 → 10`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Highway, Gewitter und Strommasten sind unmittelbar erkennbar. Regen, nasse Straße und Blitze schaffen bereits Atmosphäre.
- Lärmschutzwände bilden beidseits eine stark gezackte graue Kante. Im Zusammenspiel mit den geschichteten Wolken entstehen viele konkurrierende horizontale Strukturen.
- Sehr viele grüne Pfeilschilder und gleichförmige technische Objekte erzeugen Reizdichte ohne verlässliche Orientierung. Die Lichtfläche auf dem Asphalt sieht teilweise wie ein zusätzliches helles Band aus.

![Fahransichten Thunder Highway](<bilder/thunder-highway.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

208 zufällige grüne Wegweiser und 10 Brücken mit immer gleicher rechter Ausfahrt pro Highway-Fahrt. 195 der 208 Tafeln haben innerhalb der nächsten 270 Segmente keinen Fork. Höchste Schilderpriorität.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Regen verstärkt ausschließlich den äußeren Kurvenzug um 16%. Direkte Lenkstärke, normale Bremskraft und Höchsttempo ändern sich nicht. Kein physikalischer Seitenwind. Diesen milden Unterschied zunächst behalten; Nässe und Hinweis müssen ihn erklären.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. hwy_sign aus den Zufallspools entfernen und Brückentragwerk von Schildinhalt trennen. Fahrstreifenzeichen aus LANES, Zielpfeile ausschließlich aus echten Forks ableiten.
2. Lärmschutz als konstruierte Plattenwand mit Pfosten, geraden Oberkanten und längeren Unterbrechungen bauen. Dieser technische Rhythmus darf regelmäßig sein; zufällige Zacken passen hier nicht.
3. Randgrün, Masten und Überführungen in wenige verständliche Infrastrukturabschnitte gliedern. Dazwischen Fernstadt oder tiefe Grünstreifen sichtbar machen.
4. Nasse Reflexe in kurzen flachen Tonflächen darstellen. Spritzer auf projizierten Asphalt begrenzen, Gischt in wenige gestufte Pixelcluster aufteilen; Schilder und Rücklichter vor Blitz/Regenschleier schützen.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Kein Richtungspfeil existiert ohne tatsächliches zugehöriges Fahrbahn-/Routenereignis.
- Normale Schilderbrücken behaupten keine Ausfahrt. Ein S-Schwung bleibt eindeutig angekündigt.
- Bei Regen und Blitz bleiben nächste Kurve, freie Spur und vorausfahrendes Auto lesbar; gerade Straße fährt trotz Regen stabil.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L220), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)
