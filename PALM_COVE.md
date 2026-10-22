# Palm Cove – Landschaft und Vegetation, 22. Oktober 2026

## Dritter Durchgang: Sonnenreflexe und natürliche Hausgrundstücke

Die hellen, über die volle Grundstückslänge laufenden Stützkanten und Vorplätze sind durch begrünte Böschungen ersetzt. Nur unmittelbar am Haus liegt eine kleine, unregelmäßig auslaufende Eingangsfläche. Grasformen setzen sich jetzt auch über die Grundstücke fort. Die Geländeform, die ebenen Hausstandflächen, sämtliche Pflanzen, Felsen und Kollisionsobjekte sind unverändert.

Die bestehende Wasseroberfläche erhält wieder deutlichere kurze Sonnenreflexe. Die Lichtstriche bleiben räumlich zusammenhängend und wechseln in ihrer Helligkeit. Ihre Verteilung und das Abschneiden am Ufer sind korrigiert: Ein verdeckter Reflex wird nicht mehr an die Uferkante verschoben. Die Hintergrundzeichnung schreibt die Reflexe nun in den angeforderten Bildpuffer, auch beim Stage-Wechsel; Binnenland bekommt keine Wasserreflexe. Diese Korrekturen gelten für den gemeinsamen Wasserzeichner, die Farben der jeweiligen Stage bleiben erhalten.

- Vergleich mit abspielbarer Reflexanimation: `output/palm-cove/Wasser-und-Gaerten.html`. Der vorherige Stand liegt unter `output/palm-cove/water-gardens-before`.
- `npm run check`, `npm run qa:palm-cove` und `npm run build:desktop` erfolgreich. Weiterhin alle 16 Routen, 304 Grundstücke, freie Abstände und identischer vollständiger Küstenlauf geprüft. Zusätzlich 36 Abschneidefälle und 24 Animationsbilder; Reflexe sind in jeder geprüften Phase sichtbar und schreiben weder auf Land noch in den falschen Bildpuffer.
- Software-Zeichner: Median 1,14 ms, 95. Perzentil 1,26 ms in 130 Node-Messungen. Keine Messung der Windows-Bildrate.
- Build `palm-cove-e82d255c86a2`: Desktop-Spielinhalt im Browser gestartet; 79 Paketdateien nach Installation in `WinExe/resources/game` anhand Größe und SHA-256 geprüft. Die native Windows-Hülle wurde nicht separat getestet.
- Sicherungen: `output/palm-cove/source-before-water-gardens-2026-10-22.zip` und `output/palm-cove/desktop-before-water-gardens-2026-10-22.zip`, Integrität geprüft. Die Desktop-Sicherung enthält den Ordner `game`.

Aktuelle Prüfprotokolle: `output/palm-cove/after/validation.json`, `water-validation.json`, `water-reflections.json` und `installation.json`.

## Zweiter Durchgang: Büsche, Felsen und Gras

Auf der breiten Geländestufe stehen jetzt unregelmäßige Gruppen aus größeren Büschen und einzelnen groben Felsen. Niedrige, breite Silhouetten und freie Zwischenräume erhalten den offenen Blick. Die Graszeichnung verwendet kräftigere kantige Farbflächen mit kühlen Schatten und warmen Lichtkanten. Die vorhandenen Sprites werden weiterverwendet; es wurden keine Bilddateien geändert.

443 zusätzliche dekorative Objekte verteilen sich über Palm Cove. Ihre vollständige Bildbreite hält mindestens 550 Welteinheiten Abstand zur äußeren Grenze des Auslaufs. Es gibt keine neuen Kollisionsobjekte. Der Geländequerschnitt, die Hügelhöhe, Grundstücke und alle zuvor vorhandenen Objekte sind unverändert. Grundstücke, Tore und Abzweigungen werden bei der neuen Platzierung ausgespart.

- Neuer Vergleich: `output/palm-cove/Vegetation.html`, mit sieben Positionen einschließlich des linken Fahrbahnrandes.
- Referenz vor diesem Durchgang: `output/palm-cove/vegetation-before`. Nicht durch neue Renderer-Bundles ersetzen.
- Prüfungen: TypeScript und Build erfolgreich; alle 16 Routen, 304 Grundstücke, alle neuen Sprite-Abstände und die unveränderte offene Geländeform geprüft. Der automatische Lauf über fünf Stages erreicht exakt das bisherige Ergebnis.
- Software-Zeichner nach dieser Änderung: Median 1,01 ms, 95. Perzentil 1,29 ms in 130 Node-Messungen. Keine Messung der Windows-Bildrate.
- Desktop-Spielinhalt `palm-cove-3d322263d004` im Browser bis zur Fahrt gestartet und visuell geprüft; native Windows-Hülle weiterhin nicht separat getestet. 79 Paketdateien nach der Übernahme nach `WinExe/resources/game` anhand ihrer Größe und SHA-256 geprüft.
- Neue Sicherungen: `output/palm-cove/source-before-vegetation-2026-10-22.zip` und `output/palm-cove/desktop-before-vegetation-2026-10-22.zip`; beide Archive auf Integrität geprüft. Die Desktop-Sicherung enthält den Ordner `game`.

Prüfprotokolle: `output/palm-cove/after/validation.json` und `installation.json`.

## Erster Durchgang: Gelände und Grundstücke

Die linke Landschaft besitzt jetzt einen geschlossenen Querschnitt: niedrige Böschung, breite ebene Stufe, zurückgesetzte Hügel und deren Rückseite. Auch die 40 Segmente vor dem Streckenbeginn gehören dazu. Häuser stehen auf Grundstücken mit konstanter Welthöhe, niedrigen Stützkanten und kleinen Gärten. Weniger verstreute Details und eine ruhigere Grünpalette verbinden Gelände und vorhandene Sprites. Die interne Auflösung bleibt 320 × 180.

Die vorhandenen Bilddateien, das Ladebild und das Menü sind unverändert. Die Überarbeitung steckt in der Geländezeichnung und der Platzierung. Originale Streckengeometrie, Kollisionswände, solide Hindernisse, Zufallsfolgen, Fahrphysik und Speicherformate bleiben erhalten.

## Ansehen und spielen

- `output/palm-cove/Vergleich.html`: lokaler Vergleich mit fünf auswählbaren Streckenpositionen; funktioniert auch ohne Server.
- `D:\Velvet Cruise\WinExe\Velvet Cruise.exe`: vorhandener Windows-Launcher, dessen Spielinhalt unter `resources/game` aktualisiert wurde.
- `output/palm-cove/desktop-game`: separat erstellter Spielinhalt des Desktop-Builds.

## Prüfungen

- `npm run check`: TypeScript-Prüfung erfolgreich.
- `npm run qa:palm-cove`: 19 reproduzierbare Szenenbilder; Vergleich aller 16 Routen, einschließlich Straßen, Kollisionsobjekten und unveränderter Dekoration der anderen Stages. 304 Grundstückprüfungen, einschließlich gleicher Welthöhe von Haus und Boden, bestanden. Der Startbereich ist geschlossen; der Neuaufbau nach einer Abzweigung verändert Palm Cove nicht.
- Vollständiger automatischer Küstenlauf: fünf Stages, Ziel erreicht; Zeiten, Punktestand und Route stimmen exakt mit dem Ausgangsstand überein.
- Software-Zeichner im Node-Test, 130 gemessene Bilder nach Aufwärmung: Median vorher 1,49 ms, nachher 0,96 ms. Dies ist keine Messung der Windows-Bildrate.
- Fertiger Desktop-Spielinhalt im Browser gestartet und visuell geprüft. Die native Windows-Hülle wurde nicht separat bedient oder getestet.
- `npm run build:desktop`: vollständige Assets werden jetzt mitkopiert; die ursprünglichen Desktop-Plattformskripte und Spielidentität bleiben erhalten. Der Build meldet weiterhin die übliche Größenwarnung für das JavaScript-Paket, aber keinen Fehler.

Ergebnisse: `output/palm-cove/after/validation.json`, `autopilot.json`, `timing.json`. Der Vergleich nutzt den vor der Änderung gesicherten Renderer unter `output/palm-cove/before/renderer.cjs`; diesen Referenzstand nicht mit neuem Quellcode überschreiben.

## Sicherungen

- `output/palm-cove-before-2026-10-22.zip`: ursprünglicher Quellcode, Assets und Build-Einstiegsdateien.
- `output/palm-cove/desktop-before-2026-10-22.zip`: vollständiger vorheriger Inhalt von `WinExe/resources/game`.

Zum Zurücksetzen des Desktop-Spiels bei geschlossenem Spiel die zweite Sicherung nach `WinExe/resources/game` entpacken und vorhandene Dateien ersetzen. Neuere, dann nicht mehr referenzierte JavaScript-Dateien stören nicht. Spielstände liegen außerhalb dieses Paketordners und wurden nicht geöffnet oder verändert.

## Technische Ansatzpunkte

- `src/game/cove.ts`: geschlossene Geländequerschnitte, ebene Grundstücke und unabhängige dekorative Platzierung.
- `src/game/render.ts`: Flächen, Stützkanten, ruhigere Gras- und Felsformen.
- `src/game/track.ts`: Einbindung nach der bisherigen Platzierung; deren Zufallsfolge und Kollisionen bleiben damit erhalten.
- `src/game/themes.ts`: ausschließlich die Bodenpalette von Palm Cove.
- `tools/build-desktop.mjs`, `vite.config.ts`: vollständiges lokal reproduzierbares Paket.

Der ältere Terrassenpfad in `terrain.ts` überträgt seine Plot-Daten derzeit nicht an den Renderer. Palm Cove benutzt jetzt eigene gemeinsam genutzte Grundstückskoordinaten für Haus und Boden. Die anderen Stages wurden in diesem Schritt bewusst nicht auf das neue Verfahren umgestellt.
