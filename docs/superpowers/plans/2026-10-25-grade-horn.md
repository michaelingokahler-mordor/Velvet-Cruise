# Steigung und Hupe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Steigungen beeinflussen beide Fahrzeugarten; NPCs reagieren erkennbar und sicher auf Hupe/Lichthupe.
**Architecture:** Gemeinsame begrenzte Steigungskennlinie in einer kleinen Physikdatei, lokale Abfrage in Race. Bestehende NPC-Signalanfrage erhält Wartefenster und schnellere sichere Bewegung; Renderer zeigt Fahrtrichtungsanzeiger.
**Tech Stack:** TypeScript, Vite, Node/esbuild-Simulation, Software-Renderer, bestehender Electron-Wrapper.
**Spec:** `docs/superpowers/specs/2026-10-25-grade-horn-design.md`.

## Global Constraints
- Aktuellen Checkout und alle vorhandenen Änderungen erhalten; keine Commits/Pushs beauftragt.
- Keine Änderung an Speicherformat, Freischaltungen, Ranglistenschlüsseln oder Streckengeometrie.
- NPCs müssen ihre Sicherheitsprüfungen auch während angeforderter Wechsel behalten.
- Originales WinExe-Verzeichnis unverändert lassen, separat paketieren.

## Review Focus
- Steigungswechsel an Kuppen und Ebenen dürfen keine unbeschränkten Geschwindigkeiten erzeugen.
- NPCs lesen ihre eigene Höhe, nicht die Position des Spielers.
- Wind und Steigung müssen gemeinsam funktionieren.
- Eine blockierte Anfrage darf keinen anderen Wagen auf eine belegte Spur zwingen.
- Wiederholtes Hupen und Verzweigungen dürfen laufende Wechsel nicht zurücksetzen oder unsicher machen.

## Task 1: Gemeinsame Steigungswirkung
- [x] Regressionsfälle für flach/bergauf/bergab, Wind, NPC-Ort und alle Schwierigkeiten zuerst rot ausführen.
- [x] `src/game/grade.ts` erstellen, in `src/game/race.ts` für Spieler und NPCs anwenden.
- [x] Tests grün ausführen, Messwerte dokumentieren.

## Task 2: Sichere und erkennbare Signalreaktion
- [x] Tests für zeitnahe Reaktion, später freie und dauerhaft blockierte Lücke, Wiederholung und Fork zuerst ausführen.
- [x] Anfragefenster, Bewegung und Blinker in Race/Renderer ergänzen.
- [x] Tatsächliche Bewegung und gerenderte Pixel prüfen.

## Task 3: Integration und Auslieferung
- [x] Typecheck, vorhandene relevante Regressionen und alle 48 Routen ausführen.
- [x] Frischen Produktionsbuild im isolierten Windows-Wrapper prüfen; Originalprofil erhalten.
- [x] Unabhängige Prüfung gemäß requesting-code-review durchführen und wichtige Befunde beheben.
- [x] Bericht und separates Windows-Paket erstellen, Manifest/ZIP prüfen.

## Ledger

- Ruling: Bestehenden Checkout mit seinen Wetter-, Garagen- und Kartenänderungen weiterverwenden; keine Branch-/Commit-/Push-Integration ausführen — der Auftrag betrifft Fahrverhalten und einen prüfbaren Build, bestehende Arbeit bleibt erhalten.
- Ruling: 2,5 % Tempolimit je 1 % tatsächlicher Steigung, maximal ±20 %, als abstimmbare Arcade-Vorgabe verwenden — der Nutzer hat die Kopplung autorisiert, aber noch keine Stärke genannt. Acht Segmente glätten die Ableitung; keine neue Streckengeometrie.
- Ruling: Alte Wind-Cap-Proben flachen nur ihre lokale Testfahrbahn ab — ihre bisherigen Erwartungen beziehen sich auf Wind allein; neue echte Race-Tests prüfen Steigung plus Wind separat.
- TDD: Baseline zehn rote Fälle dokumentiert, anschließend 14 grün; zusätzlicher Spielerbahnfall zunächst rot, dann grün (15 insgesamt).
- Review: Ein Important-Befund zur Spielerbahn bei wartender Anfrage reproduziert. Endpunktprüfung reichte nicht bei Spieler x=0 zwischen beiden Spuren; nun wird die Kreuzung berücksichtigt. Regression für x=.25/0/-.1 grün. Unabhängige Nachprüfung bestätigt Auflösung und korrektes Ausweichen auch mit ±.04 Spawn-Streuung. Keine offenen Critical/Important-Befunde.
- Finale Prüfungen: Typecheck; 15 Steigung/Signal-, 22 Richtungswetter/NPC-, acht Input-, fünf Garage/Dach-, 40 Höhenprofil- und elf Map-Fälle grün. Alle 48 Routen erreichen das Ziel: Leicht mindestens 51,13 s, Normal 6,88 s, Schwer 13,00 s Restzeit. Keine Uhr-/Bonusänderung vorgenommen.
- Windows: Build `grade-horn-20261025-3984c1824f6c`; echter nativer H-Tastendruck, Produktions-Steigungswerte und fünf Normal-Zielfahrten PASS mit isoliertem Profil. Native Normal-Routen enthalten zweimal eine Kollision des Testfahrers; keine Behauptung unfallfreier Spielerfahrten.
- Paket: `output/windows/Velvet-Cruise-Windows-2026-10-25-Steigung-Hupe.zip`, 168 Einträge, 84 unveränderte Laufzeitdateien, 80 geprüfte Spieldateien; ZIP-CRC und Größen/Hashes PASS. SHA256 `04f7222d075d5b6ca5b6678187b27f5f1c98390d595242ef5871c2114c612d1d`. Originales WinExe und ältere Pakete erhalten. Keine Website-Veröffentlichung.
- Grenze: Messungen und Bildkontrolle ersetzen keine menschliche Fahrprobe, Hörprobe oder ein physisches Gamepad.
