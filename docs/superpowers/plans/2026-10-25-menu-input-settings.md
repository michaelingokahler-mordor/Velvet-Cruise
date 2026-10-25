# Hauptmenü und konfigurierbare Steuerung

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Der vom Nutzer vollständig bestätigte Plan ist die Spezifikation.

**Goal:** Drive → Schwierigkeit → Rennen; Einstellungen und Rankings-Untermenüs; getrennte Fahrbelegung mit Gamepad-Achsen; natives Exit; separater Windows-Testbuild.
**Architecture:** Bestehende Pixelansichten und feste Menütasten behalten. Fahrbelegungen in einer eigenen typisierten Zustandsklasse, Roh-Eingabeerfassung in Input, neue Menüzustände im Hauptbildschirm. Native Exit-Fähigkeit über den vorhandenen Wrapper erkennen.
**Constraints:** Auto als Vorgabe, gespeicherte explizite Auswahl erhalten; sechs Fahraktionen, mehrere Belegungen und mindestens eine pro Aktion/Gerät; keine Änderungen an Fahrphysik, Speicherständen und Rekordschlüsseln. Web hat kein Exit. Kein ungefragter Commit/Push.

## Aufgaben
- [x] 1. Rote Tests für freie Tastatur-/Gamepad-Belegung, Persistenz, Konflikte, Achsen und Erfassung; dann Modell und Input anbinden und grün prüfen.
- [x] 2. Rote Tests für Menüzustände, Rückwege, frischen Direktstart und Exit; dann Einstellungen, Belegungsansicht, Rankings-Hub und Musikvorschau ergänzen.
- [x] 3. Relevante Regressionen, alle Buildvarianten, echte Rendererbilder und Windows-Integration einschließlich Exit prüfen.
- [ ] 4. Unabhängige Schlussprüfung, wichtige Befunde korrigieren; getrenntes Windows-Paket erstellen und ZIP/Dateihashes prüfen.

## Entscheidungen und Nachweise
- Ruling: Aktuellen sauberen Checkout wiederverwenden und Branch `codex/menu-input-settings` anlegen — isoliert die neue Entwicklung vom veröffentlichten main ohne zusätzliches Arbeitsverzeichnis.
- Ruling: Beschriftungen gehen in die vorhandenen übersetzbaren String-IDs (englische Quelltexte); Menüstruktur und Funktion entsprechen dem deutschen Nutzerplan.
- Ruling: Fahrbelegungen werden unabhängig von festen Menütasten ausgewertet. Keyboard-Capture reserviert Escape für Abbruch; während Textnameneingabe oder Capture werden Fahraktionen unterdrückt.
- Ruling: Native Exit-Erkennung verwendet eingebettete Wrapper-Fähigkeit, keine Plattformnamen — der vorhandene Wrapper meldet `desktop`/`steam`, nicht Windows/macOS. Browser-Exporte ohne nativen Wrapper dürfen keinen Exit zeigen.

## Übernahme am 25.10.2026
- Ruling: Vorhandenen Release-Worktree auf `b5fdd7a` mit Branch `codex/menu-completion` wiederverwenden. Die fertige Garage bleibt enthalten, die parallel laufende Plus-Planung im ursprünglichen Checkout bleibt erhalten.
- Ruling: Commit und Push sind durch die aktuelle direkte Nutzeranweisung autorisiert.
- Task 1: complete — 14 Eingabetests PASS, einschließlich Capture-Abbruch, Analogeingaben, Persistenz, festen Menütasten und separatem Escape-Pause-Ereignis.
- Task 2: complete — 14 Menüzustandstests PASS; sechs Browser-Bedienfolgen mit echten Rendererbildern und Touch PASS. Nach Review wird die Browserfolge erneut gegen den finalen Build geprüft.
- Regressionen: Signal/Hupe, Kurskarte und sechs Dach-/Wetter-/Freischaltungsfälle PASS. TypeScript PASS.
- Ruling: Ein als Fahraktion belegtes Gamepad-B oder Backspace darf während der Fahrt keinen Menü-Back auslösen. Escape bleibt als reservierte Pause-Taste verfügbar. Rot-grün belegt.
- Task 3: in progress — Windows-Exit, finaler Web-/Demo-/Desktop-Build und Paketprüfung offen.
- Task 4: in progress — unabhängige Schlussprüfung läuft; wichtige Befunde werden vor Commit korrigiert.

- Task 3: complete — TypeScript, Full-/Standalone-/Demo-Build PASS. 16 Eingabe-, 15 Menütests und sechs Browser-Bedienfolgen PASS. Native Windows-Menüwege, Eingabeerfassung, Musikvorschau, Direktstart, Pause und echtes `app.quit` über Exit PASS. Keine JavaScript-/Native-Fehler.
- Schlussprüfung: keine offenen wichtigen oder kritischen Befunde. Drei Befunde (Back/Fahraktion, Touch-Add/Cancel, Neutralstellung generischer Gamepads) mit beobachtetem Rot-grün-Test korrigiert.
- Paket wird aus diesem geprüften Code-Commit erstellt; Paket-/ZIP- und Auslieferungsnachweise liegen getrennt unter `output/menu-completion/`. Physisches Gamepad und subjektive Audio-/Spielgefühl-Abnahme sind nicht durch Automatisierung abgedeckt.
