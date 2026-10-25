# Optische Überarbeitung aller Stages

Stand: 23. Oktober 2026. Build: `stage-refresh-c10113422055`.

Die Überarbeitung erhält Farbwelt, Tageszeit, Wetter und markante Motive jeder Stage. Die Ausgabe bleibt bei 320 × 180 Pixeln. Fahrphysik und Wetterwirkung auf das Auto sind unverändert; das Fahrgefühl wird später abgestimmt.

## Änderungen pro Stage

| Stage | Umsetzung |
| --- | --- |
| Palm Cove | Abgestimmte offene Hügellandschaft, Felsgruppen, Vegetation und Sonnenreflexe beibehalten. Frühere Zielankündigung vor dem Abzweig ergänzt. |
| Coral Bluffs | Akzeptierte Nahfelsstruktur und ursprüngliche entfernte Berge erhalten. Zielankündigung ergänzt. |
| Surfside | Niedriges, geschlossenes Strandgelände; kleine Strandhausgruppen auf ebenen Plätzen, Palmen und Buschgruppen. |
| Cypress Point | Gestaffelte grüne Hügel, freie Sicht zwischen Baumgruppen, Steine und Büsche mit Bodenkontakt. |
| Twilight Bay | Kleine Siedlungsgruppen auf flachen Standflächen. Fassaden folgen der Nachtbeleuchtung; Fenster bleiben warm beleuchtet. |
| Thunder Highway | Durchgehende Schallschutzpaneele statt gezackter Wandkrone. Zufällige Abbiegepfeile durch Streckentafeln oder Reflektoren ersetzt; die Schilderbrücke zeigt vier durchgehende Fahrspuren. Regen verdeckt weniger Fahrbahn. |
| Vineyard Valley | Sanfte Hügel, Weingüter mit Höfen, getrennte Rebparzellen im Mittelgrund und kleine Gehölzgruppen. |
| Redwood Pass | Geschlossener Waldboden mit niedrigen Erhebungen, Farnen, Steinen und vereinzelten Hüttenlichtungen. Nebel und hohe Redwoods bleiben prägend. |
| Painted Desert | Niedrige trockene Bodenformen, Kaktus- und Buschgruppen, zwei Tankstellenplätze. Sandpartikel zurückgenommen; Hitze verzerrt nur noch die Ferne. |
| Death Valley | Gestaffelte Salzflächen und trockene Hügel; einzelne strukturierte Felsvorsprünge links. Rechte Seite bleibt offen. |
| Neon City | Dunklere, zusammenhängende Fassadenflächen und gruppierte beleuchtete Fenster. Neonfarben, Skyline und Tunnel bleiben erhalten. |
| Snowcap Pass | Offene Schneelandschaft, örtliche Felseinschnitte, unregelmäßige Schneeauflagen, Hüttenplätze. Weniger Schneeflocken verdecken die Fahrbahn. |
| Gold Rush Town | Niedrige trockene Hügel und zusammengehörige Saloon-/Ladengruppen mit Wagen und Wassertürmen. Fenster leuchten gezielt; Fassaden bleiben Material. |
| Crystal Lake | Ruhigerer See mit schmalem Uferschaum und zurückhaltenden Mondreflexen. Seefelsen ersetzen Meeresnadeln; Hütten stehen auf Uferlichtungen. |
| Starlight Summit | Blaue gestaffelte Berghänge, nächtliche Baum- und Felsgruppen, drei Plätze mit Observatorien beziehungsweise Radioteleskop. |

Neue Dekoration ist passierbar und berücksichtigt die volle Bildbreite der Objekte. Bestehende aktive Hindernisse bleiben an ihren bisherigen Positionen. Kleine gelbe Kurvenschilder zeigen bei einer unmittelbar folgenden Gegenkurve ein S-Kurvensymbol. Abzweigtafeln verwenden die tatsächlichen Ziele der Route.

## Prüfung

- `npm run check`: bestanden.
- `npm run build`: bestanden; Desktop-Webpaket mit 79 Manifestdateien gebaut.
- `npm run qa:palm-cove`: bestanden, einschließlich Wasser-Clipping und Sonnenreflexen.
- `npm run qa:coral-bluffs`: bestanden.
- `node tools/qa/check-bluff-structure.mjs`: bestanden; entfernte Coral-Berge an sechs Panoramaoffsets pixelgleich zur akzeptierten Fassung.
- `npm run qa:stages`: vollständig bestanden.
- Alle 16 Routen: Fahrbahn, Kurven, Kollisionswände, Eisflächen, Tunnel, aktive Hindernisse und Zeitvorgaben unverändert.
- Fünf vollständige automatisierte Fahrten: alle fünf Ziele erreicht, identische Zeiten und Punkte zur Ausgangsfassung.
- 170 Streckenbilder und 39 gezielte Ansichten der Siedlungen visuell kontrolliert.
- 167 vollständige Gebäudestandflächen, 16.999 Dekorationskontakte und 64 Abzweigankündigungen über die 16 Routen geprüft.

Zusätzliche Browserfahrten prüfen die tatsächlich gebaute Desktop-Webfassung: Highway bis Neon City, Vineyard bis Gold Rush Town, Redwood bis Crystal Lake, Starlight Summit sowie die gesamte Küstenroute. Die Fahrten verwenden den vorhandenen Testautopiloten mit beschleunigter Simulation. Die EXE selbst und physische Eingabegeräte wurden nicht bedient. Fahrgefühl, Audio und die spätere Abstimmung der Wetterphysik sind keine Abnahmekriterien dieser optischen Änderung.

## Vergleich und Sicherungen

- [Vorher/Nachher-Galerie](output/stage-refresh/Vergleich.html)
- [Prüfergebnis](output/stage-refresh/after/validation.json)
- [Browserfahrten und Zielnachweise](output/stage-refresh/after/browser-validation.json)
- [Installationsvergleich](output/stage-refresh/after/installation.json)
- [Streckenbilder, Laufdaten und Renderzeiten](output/stage-refresh/after/audit-data.json)
- [Ausgangsquellen](output/stage-refresh/source-before-2026-10-23.zip)
- [Vorher installierte Spieldateien](output/stage-refresh/desktop-before-2026-10-23.zip)
- [Geschützte native Datei-Hashes](output/stage-refresh/native-before.json)

Der Desktop-Export liegt unter `output/stage-refresh/desktop-game`. Die Installation aktualisiert ausschließlich die Spieldateien unter `D:\Velvet Cruise\WinExe\resources\game`. EXE, `app.asar`, Speicherkennungen und Spielstände bleiben erhalten. Der Installationsvergleich wird unter `output/stage-refresh/after/installation.json` abgelegt.

Die früheren [Stage-Analysen](reports/stage-audit-2026-10-23/README.md) dokumentieren den Ausgangszustand. Dort genannte Physikvorschläge bleiben für die spätere Abstimmung offen. Änderungen dieses Durchgangs sind lokal; ein neuer Commit oder Push ist noch nicht erfolgt.
