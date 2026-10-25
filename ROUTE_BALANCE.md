# Extended Tour: Strecken und Schwierigkeit

23. Oktober 2026 · Build `extended-tour-944ab5db3022`

Alle 15 Stages erhalten eine zusätzliche Kurve und Gerade. Die bisherigen Straßenstücke einschließlich ihrer Höhen und Tunnel bleiben in gleicher Reihenfolge erhalten. Die Ergänzungen führen mit weichen Übergängen zum bisherigen Höhenstand zurück. Die anschließende Gerade hält die Abzweige und Zielbereiche lesbar.

## Zeit und Schwierigkeit

**Normal behält jede bisherige Startzeit und jeden Checkpoint-Zeitbonus.** Die Erweiterungen erhöhen die Zeitgutschriften nicht. Die theoretische zusätzliche Fahrzeit beträgt je Stage rund fünf bis sechs Sekunden bei Höchstgeschwindigkeit, mit Kurven und Verkehr entsprechend mehr.

| Einstellung | Leicht | Normal | Schwer |
| --- | ---: | ---: | ---: |
| Zeitfaktor gegenüber der bisherigen Normal-Uhr | 1,18 | 1,00 | 1,00 |
| Verkehrsdichte gegenüber bisherigem Normal | 0,65 | 1,00 | 1,10 |
| Häufigkeit zufälliger Spurwechsel | 0,60 | 1,00 | 1,15 |
| Kurvendruck auf trockener Straße | 1,00 | 1,04 | 1,08 |
| Vorhandener Regen-, Schnee- und Windeinfluss | 0,85 | 1,20 | 1,45 |
| Zusätzlicher Faktor für vorhandene Eiseffekte | 0,925 | 1,10 | 1,225 |
| Punktefaktor | 0,5 | 1,0 | 1,5 |

Die Faktoren für Wetter betreffen den vorhandenen Mehranteil der Effekte, nicht die gesamte Lenkung. Eis beeinflusst weiterhin die verzögerte Haftung und die Bremswirkung. Höchstgeschwindigkeit, Gasannahme und Bremsen auf trockener Straße bleiben gleich. Hitze und Nebel bleiben bei ihren bisherigen Sicht- und Darstellungswirkungen.

Schwer verwendet bewusst dieselbe Uhr wie Normal. Der erhöhte Kurvendruck, die stärkeren Wettereinflüsse und etwas mehr Verkehr erzeugen die zusätzliche Schwierigkeit. Die frühere Kombination aus stark verkürzter Uhr und stark erhöhtem Zufallsverkehr wird ersetzt.

## Ergänzungen je Stage

| Stage | Abschnitt | Zusätzliche Segmente | Mindestfahrzeit bei Höchstgeschwindigkeit |
| --- | --- | ---: | ---: |
| Palm Cove | open coastal sweep and palm-lined straight | 520 | 5.65 s |
| Coral Bluffs | rock-side bend and open settlement approach | 500 | 5.43 s |
| Surfside | broad beach bend and sea-view straight | 520 | 5.65 s |
| Cypress Point | wooded hillside bend and coastal outlook | 500 | 5.43 s |
| Twilight Bay | lit hillside sweep and village approach | 520 | 5.65 s |
| Thunder Highway | wide wet bend and long highway straight | 560 | 6.09 s |
| Vineyard Valley | vineyard bend and estate-lined straight | 500 | 5.43 s |
| Redwood Pass | climbing forest bend and open pass straight | 480 | 5.22 s |
| Painted Desert | broad sandstone sweep and desert straight | 540 | 5.87 s |
| Death Valley | fast open bend and salt-flat straight | 560 | 6.09 s |
| Neon City | urban bend and illuminated avenue | 500 | 5.43 s |
| Snowcap Pass | snowy pass bend and mountain outlook | 480 | 5.22 s |
| Gold Rush Town | sandstone bend and western main street | 520 | 5.65 s |
| Crystal Lake | lakeside bend and forest shore straight | 500 | 5.43 s |
| Starlight Summit | summit bend and observatory approach | 480 | 5.22 s |

## Alle 16 Routen

48 vollständige automatisierte Fahrten mit identischem zügigem Fahrprofil erreichen das Ziel. Der automatische Fahrer berücksichtigt die stärkeren Wettereinflüsse, bremst vor schwierigen Kurven und prüft Verkehrslücken. Die manuelle Steuerung erhält keine Fahrhilfe.

Die folgende Restzeit ist eine Messung dieses Testfahrers, kein Versprechen für menschliche Fahrten. Tastatur-, Gamepad- und persönliches Fahrgefühl benötigen die anschließenden Spieltests. L/R bezeichnet die vier Entscheidungen an den Abzweigen.

| Abzweige | Leicht: Restzeit | Normal: Restzeit | Schwer: Restzeit |
| --- | ---: | ---: | ---: |
| L-L-L-L | 45.2 s | 27.8 s | 5.8 s |
| L-L-L-R | 53.4 s | 30.4 s | 13.6 s |
| L-L-R-L | 52.6 s | 18.9 s | 12.2 s |
| L-L-R-R | 52.7 s | 14.8 s | 6.6 s |
| L-R-L-L | 53.1 s | 25.1 s | 21.7 s |
| L-R-L-R | 53.6 s | 22.9 s | 12.1 s |
| L-R-R-L | 52.6 s | 30.9 s | 17.2 s |
| L-R-R-R | 53.7 s | 30.7 s | 16.6 s |
| R-L-L-L | 53.4 s | 35.5 s | 21.1 s |
| R-L-L-R | 53.2 s | 25.6 s | 7.9 s |
| R-L-R-L | 52.3 s | 32.0 s | 14.1 s |
| R-L-R-R | 53.1 s | 21.9 s | 11.1 s |
| R-R-L-L | 53.2 s | 35.8 s | 18.9 s |
| R-R-L-R | 53.8 s | 34.9 s | 17.1 s |
| R-R-R-L | 54.0 s | 37.9 s | 20.0 s |
| R-R-R-R | 52.0 s | 35.1 s | 8.5 s |

## Speichern und Rekorde

App-Kennung, Steuerungspräferenzen, Fahrzeugwahl, eingegebener Name und erreichte Abzeichen/Freischaltungen bleiben erhalten. Die längeren Strecken und andere Physik erhalten eigene Rekordkennungen (`tour2`), einschließlich lokaler Arcade-Tabelle und Stage-Bestzeiten. Alte Tabellen werden nicht überschrieben oder gelöscht. Die neuen Online-Kennungen sind in der lokalen Board-Konfiguration deklariert; eine Veröffentlichung oder Einrichtung beim Online-Dienst ist nicht Teil dieses Windows-Builds.

## Prüfung und Paket

- `npm run check` und `npm run build` bestehen.
- `npm run qa:balance`: 16 Routen auf drei Stufen, unveränderte Normal-Zeitgutschriften, ursprüngliche Geometrie nach Herausnehmen der neuen Abschnitte, verzweigtes Nachladen, monotone geschlossene Landschaft und vollständige Gebäudestandflächen.
- `check-handling.mjs`: gestaffelte Kurven-, Regen-, Schnee-, Eis- und Windwirkung, unveränderte trockene Beschleunigung/Bremsen sowie Erhalt alter Speicherdaten mit getrennten Rekorden.
- `check-signal-input.mjs`: H, Y/Dreieck, L3, Wiederverbinden, sichere Spurwechsel und sichtbare Signalbestätigung.
- 45 Bilder zeigen Anfahrt, neue Kurve und Ausfahrt jeder Stage; die Galerie liegt unter `output/route-balance/Streckenergänzungen.html`.
- Acht zusätzliche beschleunigte Fahrten in der Windows-Laufzeit erreichen alle fünf Ziele auf Normal sowie eine Route auf Leicht und zwei auf Schwer, darunter Regen und Schnee. Sie verwenden den originalen Wrapper mit einem isolierten Testprofil. Alle acht Fahrten bestehen ohne Konsolenfehler; ihr Ergebnis steht in `output/route-balance/native-validation.json`.
- Ein physisches Gamepad und ein menschlicher Fahrgefühltest sind durch diese Prüfungen nicht abgedeckt.

Die früheren Grafikprüfungen `qa:depth` vergleichen absichtlich mit einer unveränderten historischen Straße. Für diese autorisierte Änderung von Strecke und Physik gilt `qa:balance` als neue Gesamtprüfung. Ihre lokale Ausgangsfassung liegt unter `output/route-balance/before.cjs`; die zugehörigen Quellen sind in `source-before.zip` gesichert.

Der vollständige neue Windows-Build liegt separat unter `output/windows/Velvet-Cruise-Windows-2026-10-23-Extended-Tour`. Die vorherigen Builds bleiben erhalten. Das Paket wird anhand aller Dateihashes und des ZIP-Inhalts geprüft. Es wird nichts committed oder gepusht.
