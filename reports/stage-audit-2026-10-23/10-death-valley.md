# 10 · Death Valley

**23. Oktober 2026 · Theme-ID `death-valley` · Spalte 4 von 5 · Priorität P1 · relativer Umfang L.**

Canyoncharakter erhalten, endlose Streifenwand und Hitzewackeln ersetzen.

## Zielbild und belegter Aufbau

Erschöpfend weites, heißes Tal bei tiefem Sonnenstand: blasser Salz-/Mineralboden, dunkle ferne Berge und sparsame trockene Landmarken.

Sehr hohe alte Cliff-Wand links, rechts offenes Land. Nur geringe Hügel- und Kurvenstärke; 50 % Geradenchance. Tote Bäume, dunkle Felsen, Totenkopfpfosten, Wracks und Pumpwindräder zufällig beidseits, Telefonmasten in festem 18-Segment-Takt rechts. Hitzedarstellung; eigene ferne Berge und Salzpfanne im Hintergrund.

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 5 → 8 → 9 → 10`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Helle Salz-/Wüstenfläche, dunkle Felsen und karger Bewuchs unterscheiden diese Stage gut von Painted Desert.
- Links steht fast durchgehend eine hohe, senkrecht geriffelte und gebänderte Wand. Der Kamm hat viele gleichartige spitze Zähne.
- Hitzeflimmern macht feine tote Zweige und technische Objekte auffällig unruhig. Große Felsflächen besitzen mehr algorithmischen Rhythmus als bewusst gesetzte Brüche.

![Fahransichten Death Valley](<bilder/death-valley.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

13 Kurventafeln genügen für die vielen Geraden. Zeichen aus dem Hitzeflimmern ausnehmen; Ziele Neon/Gold nur an ihrem echten Fork ankündigen.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Hitze verzerrt das Bild, ändert aber weder Beschleunigung, Grip noch Höchstgeschwindigkeit. Das sollte so bleiben. Kein Überhitzungs-/Verschleißsystem für diese Überarbeitung vorsehen.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Canyon in wenige Felsgruppen mit Öffnungen zerlegen: nahe Felsrippen in ausgewählten Kurven, zurückgesetzte Massive und dazwischen breite Salzpfannen.
2. Kontur aus zusammenhängenden unregelmäßigen Formen erzeugen. Große Bruchflächen, einzelne dunkle Spalten, örtliche Geröllfüße und helle Einschlüsse einsetzen; keine durchgängigen Strata-Streifen.
3. Tote Büsche als breitere lesbare Silhouetten vereinfachen. Telefon-/Windradmotive als einzelne Nutzungsinseln platzieren statt überall gleichrangig zu streuen.
4. Hitzeschimmer auf entfernte Luft-/Bodenlagen maskieren. Verkehrszeichen, Fahrzeugkanten und nahen Straßenverlauf stabil halten; die Stage bleibt eine trockene Arcadefahrt.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Canyonfelsen bleiben markant, aber mehrere lange Sichtfenster lassen Ferne und Salzfläche sichtbar werden.
- Gleiche Strecke ohne und mit Hitze zeigt denselben klar lesbaren nahen Fahrbahnrand.
- Kurvenwarnungen behalten während des Flimmerzyklus eine stabile Pfeilform.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L311), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)
