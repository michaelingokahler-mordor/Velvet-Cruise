# Übernahme von Plus in das Hauptprojekt

Nutzerauftrag vom 25.10.2026: Plus in das Hauptprojekt übernehmen, committen
und pushen. Weitere iPhone-Optimierungen bleiben für später.

## Zusammengeführte Stände

- Bestehender Hauptstand: `7aaafabfa11ba9e65d838a0ced9620e2a750fa42` (`origin/main`).
- Abgeschlossener Plus-Stand: `d9f61b1c831868191793b013ea206ee628e282b7`.
- Hauptprojekt: `D:\Velvet Cruise\Code`, Zielbranch `main`.

Alle 409 zunächst lokal geänderten oder unversionierten Dateien des
Hauptprojekts stimmen inhaltlich mit dem bereits veröffentlichten `main`
überein. Vor dem Branchwechsel wurden ihre Originaldateien, Prüfsummen und
Git-Differenzen zusätzlich unter `output/plus-integration-20261025/` gesichert.
Ein benannter Git-Stash bleibt als weitere Sicherung erhalten.

Die Menü- und Dachänderungen des Hauptstands sind enthalten. Die Konflikte
betrafen zusätzliche Plus-Zeilen bei Grafiktexten, Menüauswahl und Grafik-QA.
Die vorhandenen Plus-Erweiterungen bleiben erhalten. Die aktualisierte
Navigationsfolge des Hauptstands in `tools/art/capture-web.cjs` wird übernommen.

## Neue Integrationsprüfung

Der frisch gebaute Stand wurde auf einem eigenen lokalen Testserver geprüft.
`integration-verification.txt` enthält den vollständigen bestandenen Lauf.
Die Profil-, Ziel-, Asset-, Dach-, Eingabe-, Menü-, Balance-, Karten-, Signal-,
Demo-, Strecken- und Browserprüfungen bestehen.

Der ältere Menü-Browsertest verwendete noch die Touch-Position des Menüs mit
sechs Zeilen. Er scheiterte reproduzierbar beim Öffnen der Tastenbelegung.
Die Koordinate entspricht jetzt dem Menü mit sieben Zeilen. Der Test prüft
zusätzlich Grafik als sechstes Untermenü und besteht danach. Der Spielcode
und die eigentliche Touch-Steuerung wurden dabei nicht geändert.
`integration-menu-before.json` und `integration-menu-after.json` dokumentieren
beide Testzustände.

Das neu gebaute Spielmodul stimmt bytegenau mit der zuvor geprüften Plus-Fassung
überein: `index-BgK9JsxI.js`, SHA-256
`b16af8663e3487272bbc9d514d5e64fc459d8e580243371996a33163a4367f58`.
Die bestehenden Desktop-Dauermessungen gehören damit weiterhin zu diesem
Spielcode; sie wurden für die Integration nicht erneut ausgeführt.

Die iPhone-Rückmeldung bleibt unverändert: im Regen verbessert, aber langsamer
als der PC. Weitere Leistungsoptimierungen, der Steuerungsentwurf und die
vollständige physische Geräteabnahme sind vertagt. Die Git-Übernahme ersetzt
keinen Website-Release oder Austausch einer bestehenden Windows-Installation.
