# Velvet Cruise: Blinker, Wasser, Wind und Fahrgeräusche

Stand: 26.10.2026. Lokal implementiert und technisch geprüft, nicht veröffentlicht.

## Änderungen

- Alle absichtlichen NPC-Spurwechsel blinken in Classic und Plus. Vorlauf ca. 0,18 s; normale Wechsel, wetterbedingtes Rechtsfahren und Platzmachen nach Hupe/Lichthupe verwenden denselben Zustand. Wetterdrift allein blinkt nicht.
- Unterbrochene Wellenkämme, bewegte Brandung und ein kleines Segelboot mit Kielwasser. Das Boot läuft durch die vorhandene Tiefensortierung; höchstens eines gleichzeitig. Der See bleibt ruhig, Binnenland erhält kein Boot.
- Rot-weißer Windsack am rechten Rand, mit Pfeilen für Gegen-/Rückenwind. Sandpartikel entfernt, leichte Sandtrübung erhalten. Böen dauern 4–6 s mit unveränderter Spitze und bisherigen Pausen/Schwierigkeitsfaktoren.
- Reifenquietschen zusätzlich nach mindestens 0,5 s starkem Einlenken ab etwa 103 km/h. Randstreifen: rhythmisches Rattern; Sand: körniges Scharren. Eintrittsgeräusche haben getrennte kurze Sperrzeiten.
- Credits: Programming / OpenAI ChatGPT; Game Prototype / Tesana mit Link. Classic und Plus visuell geprüft, Back bedienbar.
- Keine Änderungen an Speicherformaten, Highscores, Freischaltungen oder externen APIs.

## Prüfung

`npm run qa:road-effects` führt 17 Prüfungen einschließlich TypeScript, neuer Regressionstests, Hupe/Steigung, Wetter, Windrichtungen, Signaleingabe, Grafikprofilen, Wasser, Gelände, Plus-Assets, allen 15 Landschaften und Standalone-Web-Build aus. Alle bestanden. Die Streckenprüfung rendert 132 Classic/Plus-Bildpaare; die Routenläufe erreichen auf allen fünf geprüften Hauptrouten das Ziel.

Die bisherige Referenz für Straßengeometrie, Landschaft, Kollisionsdaten und Zeitvorgaben bleibt unverändert. Der exakte Autopilot-Fahrverlauf hat eine eigene neue Referenz: Die beauftragte Blinker-Vorlaufzeit verändert das NPC-Verhalten und damit Fahrzeit/Punkte. Die historische pre-Plus-Referenz bleibt erhalten.

Chromium mit wegwerfbaren Browserprofilen: beide Credits-Seiten, sichtbare Links und Rückkehr ins Menü bestanden; keine Seitenfehler. Aktives Reifenquietschen verstummt im tatsächlichen Spiel bei Pause und Unfall. Die echte Web-Audio-Engine erzeugte drei WAV-Dateien ohne Clipping. Dies ist keine menschliche Hörabnahme.

Eine unabhängige Codeprüfung fand keine Sicherheits- oder Integrationsblocker. Zwei Darstellungsdetails wurden danach durch zuerst fehlschlagende Regressionstests abgesichert und korrigiert: Das Boot bleibt bis zum Ende seines Ausblendens sichtbar; der Blinker bleibt während des tatsächlichen Einordnens aktiv und endet auch bei bleibender Winddrift zuverlässig.

## Aufnahmen und Hörproben

Alle Pfade beziehen sich auf das Projektverzeichnis; `output/` ist bewusst nicht versioniert.

- `output/road-effects/gallery/`: Classic/Plus, Küste zu drei Zeitpunkten, See, Binnenland und sechs Windrichtungen.
- `output/playwright/road-effects/classic-credits.png` und `plus-credits.png`: tatsächliche Browseraufnahmen.
- `output/playwright/road-effects/strip.wav`: Randstreifen.
- `output/playwright/road-effects/sand.wav`: Sand.
- `output/playwright/road-effects/driving.wav`: 12 s mit Motor und Musik; ab 2 s Reifenquietschen, bei 4,5 s Randstreifen, bei 6 s Sand, ab 10 s gedämpfte Fahrgeräusche.
- `output/road-effects/suite.json`, `validation.json`, `gallery/report.json`: technische Ergebnisse.

Browserprüfung wiederholen: lokalen Vite-Server mit `VITE_LOCAL_SERVICES=true` auf Port 4189 starten; `node tools/qa/road-effects-browser.cjs` ausführen. Playwright/Chromium müssen lokal verfügbar sein.

## Renderzeit

Vergleich mit unverändertem Ausgangscode auf demselben Rechner und abwechselnd im selben Prozess: je Version und Szene 600 reine Renderer-Aufrufe, davon 240 Aufwärmframes. Keine Aussage über Bildausgabe, Dauerlast oder physische Geräte.

| Profil / Szene | Median vorher → nachher | p95 vorher → nachher |
| --- | --- | --- |
| Classic / Küste | 0,812 → 0,823 ms | 1,334 → 1,343 ms |
| Classic / Sand | 1,324 → 1,324 ms | 1,984 → 2,057 ms |
| Plus / Küste | 1,336 → 1,364 ms | 2,285 → 2,382 ms |
| Plus / Sand | 3,664 → 3,684 ms | 4,648 → 4,580 ms |

Der Unterschied der Mediane bleibt in diesem Vergleich unter 0,03 ms. Trotz entfernter Partikelsimulation lässt sich aus den vollständigen Sandszenen kein eindeutiger Geschwindigkeitsgewinn ableiten.

## Offene Abnahme

Menschliches Anhören mit Motor/Musik, subjektives Fahrgefühl der längeren Böen und physische Geräteprüfung bleiben offen. iPhone-Optimierung und Veröffentlichung waren nicht Teil dieses Pakets.
