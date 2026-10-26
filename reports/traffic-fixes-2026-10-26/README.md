# Hupe entfernt und Review-Befunde behoben

Anforderung vom 26.10.2026: Hupe vollständig entfernen und die drei bestätigten Review-Befunde korrigieren.

## Änderungen

- Spieler-Hupe und Lichthupe einschließlich Tastatur-/Gamepad-Aktion, Touch-Schaltfläche, HUD-Hinweis, Einstellungszeile und Hilfetext entfernt. Auch NPC-Huptöne entfallen. Automatische Fahrbeleuchtung und NPC-Blinker bleiben bestehen.
- Alte Tastatur-/Gamepad-Konfigurationen mit sechs Aktionen werden mit den fünf verbleibenden Aktionen eingelesen. Individuelle Belegungen bleiben erhalten; entfernte Signalbelegungen werden nicht übernommen. Andere Speicherbereiche, Highscores und Freischaltungen bleiben unverändert.
- Nachfolgende NPCs halten Abstand zum Spieler, auch beim Bremsen und auf verschneiter Straße. Die Prüfung berücksichtigt die Reihenfolge der Simulationsschritte, damit ein vorausfahrendes Auto nicht versehentlich als nachfolgend eingestuft wird.
- Kontakte mit schnelleren Fahrzeugen erhalten eine Kollisionsreaktion. Nach einem Kontakt werden die Fahrzeuge aus dem gemeinsamen Kollisionsbereich getrennt; ein Zusammenstoß wird nicht zu einer Folge von Treffern in direkt aufeinanderfolgenden Frames.
- Alte Render-Segmentzuordnungen werden vor dem Einsortieren aktueller Fahrzeuge bereinigt. Aktive NPCs verschwinden dadurch nicht mehr beim Erreichen des Cache-Limits.
- Der Windsack ist im vollständigen Touch-HUD frei sichtbar, da die überlagernde Hupenfläche entfällt.
- Der automatische Demo-/Testfahrer plant Überholmanöver früher, da er keine Hupe mehr zum Freimachen einer Spur einsetzen kann. Spielersteuerung, Strecken und Zeitvorgaben werden dadurch nicht verändert.

## Verifikation

Ergebnis des finalen Quellstands: **11/11 gezielte Regressionen, 19/19 Schritte der Gesamtsuite und 48/48 Routen-/Schwierigkeitsläufe bestanden**. Beide Chromium-Prüfungen melden `PASS` ohne Browserfehler.

- `node tools/qa/check-traffic-fixes.mjs`: gezielte Regressionstests für Abstand, beidseitige Kontakte, saubere Trennung, Simulationsreihenfolge, Render-Zuordnung, entfernte Hupe, vollständiges Classic-/Plus-Touch-HUD, alte Belegungen und frühe Überholplanung.
- `npm run qa:road-effects`: TypeScript, Fahrverhalten, Eingabe, Menüs, Wetter, Wasser, Gelände, alle 15 Themen, Plus-Assets und Standalone-Web-Build.
- `node tools/qa/check-all-routes.mjs`: alle 16 Routen auf Easy/Normal/Hard, Zielerreichung und durchgängige NPC-Renderzuordnung.
- Echte Chromium-Prüfung: Belegung mit fünf Aktionen, Tastatur/Gamepad und gespeicherte Einstellungen, Touch-Bedienung, sichtbarer Windsack, Credits, Pause/Unfall und bestehende Audioeffekte.
- Neue Fehlerfälle wurden zunächst gegen den defekten Stand ausgeführt und schlugen fehl. Unabhängige Codeprüfung bestätigte die Kontaktprobleme und die anschließenden Ursachenbehebungen.

Die exakte Autopilot-Fahrreferenz wurde für das geänderte Verkehrsverhalten aktualisiert. Die historische Referenz für Straße, Landschaft, Kollisionsgeometrie und Zeitvorgaben bleibt unverändert.

## Artefakte

- `output/traffic-fixes/validation.json`: gezielte Regressionen.
- `output/traffic-fixes/all-routes.json`: vollständige Routenläufe.
- `output/road-effects/suite.json`: technische Gesamtsuite.
- `output/playwright/road-effects/`: Browserbericht und Classic-/Plus-Aufnahmen des Touch-Windsacks.
- `output/menu-completion/browser/`: Bedienungsprüfung der Menüs und Belegungen.

Die technischen Prüfungen ersetzen keine menschliche Fahr-/Hörabnahme oder physische Geräteprüfung. Veröffentlichung ist nicht Teil dieser Änderung.
