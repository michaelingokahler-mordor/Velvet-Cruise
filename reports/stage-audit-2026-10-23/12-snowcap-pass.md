# 12 · Snowcap Pass

**23. Oktober 2026 · Theme-ID `snowcap-pass` · Spalte 4 von 5 · Priorität P1 · relativer Umfang L.**

Größter kombinierter Bedarf bei Gelände, Eislesbarkeit und Fairness.

## Zielbild und belegter Aufbau

Kalter Alpenpass mit bläulichen Schneeformen, warmem fernem Alpenglühen, verschneiten Nadelbäumen und klar erkennbaren Eisstellen.

Beidseits alte hohe Cliff-Wand, vier horizontale Farbzonen inklusive heller Oberkante. Schneekiefern, Fir, Felsen, Verwehungen, Hütten, tote Bäume und seltene Schneemänner als Zufallspools; Bäume zusätzlich am Hang. Schneepfähle alle 12 Segmente auf beiden Seiten. Hohe Straßenhügel (`hills: 1.8`) und starke Kurven. Eigene ferne Gipfel-/Schneefeldkulisse, Schneepartikel und lokalisierte Eisflächen sind vorhanden.

Geprüfte Bildserie: **12 Ansichten** auf Route `0 → 5 → 6 → 11 → 12`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Schneepalette, Nadelbäume und Eisflächen sind als Winterpass sofort erkennbar. Die ferne Gipfelkulisse besitzt viel Potenzial.
- Beidseitig ragen fast ununterbrochen graue Wände mit gleich breitem weißem Abschluss auf. Die vielen spitzen Kammzähne wirken schematisch.
- Eis ist sichtbar hellblau, kann aber zusammen mit weißem Schnee, Markierung und Partikeln große Teile der Straße optisch vereinheitlichen.

![Fahransichten Snowcap Pass](<bilder/snowcap-pass.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

31 Kurventafeln und 36 an echte Eisflächen gebundene Eiswarnungen. Die Schilderpassage liegt 110 bzw. 55 Segmente vor dem Eis (bei Volltempo 1,20/0,60 s); sichtbar können sie früher sein. Linke Schilder können die normale Auslauflücke verletzen.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Schneefall verstärkt Kurvenzug um 10%. Volles örtliches Eis ergibt zusammen 2,2-fachen Kurvenzug, Lenk-Nachlauf und nur 45% normale Bremskraft. Inventur: zwölf Felder, 1019 vereiste Segmente, vier vollbreite Felder je Snowcap-Fahrt. Der heutige Einfluss ist bereits stark; Lesbarkeit und Kombinationen zuerst verbessern.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Nahwände auf kurze echte Einschnitte reduzieren; dazwischen Schneehänge, Talöffnungen und freie Sicht auf ferne Gipfel. Aufliegende Wechten mit unregelmäßigem Rand statt weißer Dauerbänder zeichnen.
2. Eis klar von trockenem Asphalt und Schneerand unterscheiden. Beginn, Ende und seitliche Grenzen der Fläche sowie eine verbleibende griffige Linie früh sichtbar machen.
3. Eiswarnungen an der tatsächlich erkennbaren Reaktionszeit auslegen: Entwurfsziel 2–3 Sekunden bei erwarteter Anfahrtgeschwindigkeit. Linke Warnschilder aus dem normalen Rückkehrraum versetzen.
4. Das links teilvereiste Feld bei Kurvenwert 4,6 und die vollbreiten Felder bis Kurvenwert 3,1 gezielt fahren. Falls Warnung und Linienwahl nicht genügen, Feld abschwächen/verlegen oder eine trockene Teilspur vorsehen. Beide-Pedale-Sonderfall vor einer Balanceänderung korrigieren.
5. Hütten auf ebenen geschützten Plätzen, Schneemänner nur dort; Pfähle in Schneeränder verankern und nahe Partikel nicht über Warnzeichen verdichten.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Alle zwölf Eisfelder sind vor Wirkung verständlich angekündigt; alle 36 Warnzeichen halten den vorgesehenen Auslaufabstand.
- Das linke 4,6-Kurvenfeld lässt seine griffige rechte Teilspur früh erkennen. Vollbreite Felder bis Kurvenwert 3,1 sind mit nachvollziehbarem Gaslupfen/Bremsen prüfbar beherrschbar.
- Reine Bremse und gleichzeitiges Gas/Bremse haben bewusst konsistente Eisregeln.
- Gipfel bleiben an mehreren Passagen sichtbar; keine endlose beidseitige Sägezahnwand.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L364), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)
