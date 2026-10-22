# Coral Bluffs – Hügel, Siedlungen und Felskurven

Stand: 22. Oktober 2026. Installierter Build: `coral-bluffs-8c6492ab21cd`.

## Zweiter Durchgang: Felsstruktur

Die nahe Sandsteinwand trägt jetzt kleine kantige helle und dunkle Einsprengsel, kurze Risse und aufgebrochene Lichtkanten. Kleine Flecken werden innerhalb der Geländesegmente abgeschnitten, damit sie beim Annähern nicht zu langen spitzen Streifen werden. Ihre Position ist an die Weltkoordinaten gebunden und unabhängig von der Zeit.

Nur die obere Kante exponierter Felsvorsprünge ist leicht unregelmäßiger geworden: maximal 75 Welteinheiten seitlich und 200 in der Höhe. Der Fuß der Wand, die offenen Hügel und alle 777 Grundstücksegmente bleiben gegenüber dem ersten Durchgang exakt gleich.

Auf Wunsch wurde die entfernte Bergkulisse wieder auf den Stand des ersten Geländeumbaus zurückgesetzt. Die vorherigen Sandsteinmassive werden unverändert gezeichnet; das zwischenzeitliche Pixelpanorama wurde entfernt. Die neue Struktur und die unregelmäßigen Kanten der nahen Felswand bleiben erhalten. Keine neuen externen Assets.

- Neuer Vergleich: `output/coral-bluffs/Felsstruktur.html`, fünf auswählbare Ansichten. Referenz des ersten Durchgangs: `output/coral-bluffs/structure-before`.
- TypeScript, Coral-Bluffs-Prüfungen, Palm-Cove-/Wasserprüfungen und Desktop-Build erfolgreich. Vollständiger automatischer Küstenlauf weiterhin mit identischen Zeiten und Punkten.
- `node tools/qa/check-bluff-structure.mjs`: unveränderte Grundstücke, Hügel und Wandfüße; begrenzte Konturänderung; korrektes Zeichenziel beim Stage-Wechsel; zeitlich stabile, nahtlos wiederholte Bergkulisse und pixelgenaue Übereinstimmung mit der früheren Zeichnung an sechs Kameraversätzen geprüft. Die nahe Felszeichnung ist gegenüber dem Struktur-Durchgang unverändert. Ergebnis: `after/structure-validation.json`.
- Software-Zeichner: Median 1,17 ms, 95. Perzentil 2,78 ms über 166 Stichproben. Keine Messung der Windows-Bildrate.
- Sicherungen vor diesem Durchgang: `source-before-structure-2026-10-22.zip` und `desktop-before-structure-2026-10-22.zip` unter `output/coral-bluffs`, beide auf Integrität geprüft.
- Fertiges Paket im Browser per Autopilot von Coral Bluffs bis Surfside geprüft, ohne JavaScript-Fehler. 79 Dateien in der Windows-Installation nach Größe und SHA-256 abgeglichen; EXE, native Hülle und Spielstände unverändert. Die native Windows-Hülle wurde nicht separat bedient. Browserbelege: `after/structure-browser-*.png`; Installationsprotokoll: `after/installation.json`.

Nach dem Zurücksetzen der entfernten Berge erneut geprüft: TypeScript, Coral-Bluffs-Prüfungen, vollständiger automatischer Küstenlauf und Strukturvergleich erfolgreich. Zwei neu gerenderte Ansichten visuell geprüft. Desktop-Paket neu gebaut und alle 79 Dateien nach Größe und SHA-256 in der Windows-Installation verifiziert. Die oben dokumentierte Browser-Testfahrt stammt vom vorherigen Struktur-Build; für diese begrenzte Rücknahme wurde die native Windows-Hülle nicht erneut gestartet.

Die folgenden Abschnitte dokumentieren den ersten Geländeumbau (`coral-bluffs-21fe9eb36f0c`).

## Gestaltung

Die frühere durchgehende hohe Felswand ist durch einen geschlossenen Geländequerschnitt ersetzt: niedrige Böschung, trockene Hügel im Mittelgrund und zurückgesetzte Höhenzüge. Am Horizont stehen getrennte, gedämpft gefärbte Sandsteinmassive mit sichtbaren Lücken. Die Hintergrundzeichnung berücksichtigt die Kameradrehung und den Übergang zwischen Stages.

In stärkeren Linkskurven steigt unmittelbar hinter dem vorhandenen Auslauf ein niedriger Sandsteinvorsprung auf. Sein Abstand und seine Höhe gehen mit der Kurvenstärke über. Auf Geraden, in Rechtskurven und an der Abzweigung öffnet sich die Landschaft. Breite unregelmäßige Felsflächen ersetzen die langen hellen Hangstreifen.

20 Häuser verteilen sich auf sechs Siedlungsbereiche. Grundstücke und Gebäude verwenden dieselbe konstante Welthöhe, auch entlang einer geneigten Straße. Die vollständige Hausbreite liegt innerhalb der ebenen Standfläche. Der Leuchtturm hat ein eigenes ebenes Grundstück hinter der ersten längeren Felskurve. Gruppen aus Büschen und groben Felsen lassen größere trockene Grasflächen frei.

Die vorhandenen Sprites werden weiterverwendet; keine neuen oder extern generierten Bilddateien. Die interne Auflösung bleibt 320 × 180.

## Umsetzung und Grenzen

- `src/game/bluffs.ts`: Geländequerschnitte, ebene Grundstücke, Leuchtturm und unabhängige dekorative Platzierung.
- `src/game/track.ts`: Einbindung nach der bisherigen Dekoration, ohne deren Zufallsfolge zu verändern.
- `src/game/render.ts`: gemeinsame Geländezeichnung mit Palm Cove; spezielle Felsflächen und entfernte Sandsteinmassive für Coral Bluffs.
- `src/game/themes.ts`: ausschließlich die Bodenfarben von Coral Bluffs angepasst.

Straßenverlauf, Höhenprofil, Fahrphysik, Zeitvorgaben, Speicherformate und sämtliche wirksamen Kollisionsobjekte sind unverändert. Der alte hochgesetzte Leuchtturm besaß zwar ein `hit`-Feld, war durch `y > 50` jedoch bereits aus der Kollisionsprüfung ausgeschlossen. Er wurde durch einen dekorativen, korrekt aufgesetzten Leuchtturm ersetzt. Es gibt genau einen sichtbaren Leuchtturm.

Die bestehende Zufallsfolge der Dekoration auf der Abzweigungsinsel unterscheidet sich beim verzögerten Neuaufbau bereits im Ausgangsstand. Der Test vergleicht deshalb auch einen identisch neu aufgebauten Ausgangsstand. Neue Geländeformen und Siedlungen bleiben beim Wechsel der Route und Zurückwechseln gleich.

## Prüfung

- `npm run check`: erfolgreich.
- `npm run qa:coral-bluffs`: 16 Routen, 168 Grundstückprüfungen, 2.264 neu platzierte Objekte geprüft. Mindestabstand ihrer vollständigen Bildbreite zum äußeren Auslaufrand: 682 Welteinheiten. Geschlossene Querschnitte, Hausbreiten, Bodenkontakt, Linkskurven und Neuaufbau geprüft.
- Vollständiger automatischer Küstenlauf erreicht das Ziel über fünf Stages. Zeiten, Punkte und Route sind identisch zum Ausgangsstand.
- `npm run qa:palm-cove`: bestehende Palm-Cove-Prüfungen und Wasserreflexprüfungen erfolgreich; Palm Cove und die übrigen Stages behalten ihre Geometrie und Dekoration.
- 16 gleichmäßig verteilte Fahransichten, sieben Siedlungs-/Leuchtturmansichten und sechs Randansichten erzeugt. Die relevanten Landschafts-, Siedlungs- und Randansichten visuell geprüft.
- Software-Zeichner unter Node: Median 1,17 ms, 95. Perzentil 2,49 ms, 166 Stichproben über Coral Bluffs. Keine Messung der Windows-Bildrate.
- Fertiges Desktop-Spielpaket im Browser per Autopilot durch Coral Bluffs bis Surfside gefahren. Keine JavaScript-Fehler im Browserprotokoll. Die native Windows-Hülle wurde nicht separat bedient.
- Build erfolgreich. 79 Paketdateien nach der Übernahme nach `D:\Velvet Cruise\WinExe\resources\game` anhand Größe und SHA-256 geprüft. EXE und `app.asar` unverändert; Spielstanddaten nicht geöffnet oder verändert.

## Ansehen und Wiederherstellen

- `output/coral-bluffs/Vergleich.html`: neun auswählbare Vorher-nachher-Ansichten mit identischen Kamerapositionen; auch ohne Server verwendbar.
- `output/coral-bluffs/after/validation.json`, `review.json`, `autopilot.json`, `installation.json`: Prüfprotokolle.
- `output/coral-bluffs/after/browser-start.png`, `browser-fahrt.png`, `browser-surfside.png`: Browser-Testfahrt.
- `output/coral-bluffs/desktop-game`: gebauter Spielinhalt.
- `output/coral-bluffs/source-before-2026-10-22.zip`: Quellsicherung vor diesem Durchgang.
- `output/coral-bluffs/desktop-before-2026-10-22.zip`: vorheriger Desktop-Spielinhalt, enthält den Ordner `game`. Beide ZIPs wurden auf Integrität geprüft.

Zum Zurücksetzen bei geschlossenem Spiel den gesicherten Ordner `game` unter `WinExe/resources` entpacken und vorhandene Dateien ersetzen. Neuere, nicht mehr referenzierte JavaScript-Dateien können liegenbleiben. Spielstände liegen außerhalb des Paketordners.
