# Velvet Cruise Plus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ergänze eine freischaltbare Plus-Darstellung in 640×360 im bestätigten Palm-Cove- und Lotus-Stil.

**Architecture:** Ein gemeinsames Rennmodell verwendet zwei Grafikprofile und getrennte Grafikquellen. Native Weltgrafik und eine skalierte logische Zeichenfläche teilen dasselbe Framebuffer. Zielidentitäten bestimmen Fortschritt, Sammelbadges und Freischaltung.

**Tech Stack:** TypeScript, vorhandener Software-Renderer, Phaser 3, Vite, bestehende Python-Grafikwerkzeuge, Node-QA und Playwright.

**Spec:** `../specs/2026-10-25-velvet-cruise-plus-design.md`

## Global Constraints

- Classic: 320×180. Plus: 640×360. Beide Darstellungen verwenden 16:9 und denselben Bildausschnitt.
- Framebuffer, Bildschirmtextur und tatsächlicher Phaser-Backbuffer verwenden die native Profilgröße. Eine 640×360-Textur auf einem 320×180-Backbuffer ist unzulässig.
- UI und Eingaben verwenden logische 320×180-Einheiten. Keine Verkleinerung der Touchflächen auf dem sichtbaren Bildschirm.
- Keine AGA-Emulation, kein HAM8 und keine harte Grenze von 256 Farben.
- Kleine Sprite- und Materialpaletten; zusätzliche Effektfarben sind erlaubt.
- Keine Änderung an Weltmaßen, Fahrphysik, Hindernissen, Gegnerzahl, Regeln, Rekordschlüsseln oder `RULESET = 'tour2'`.
- Plus bleibt eine reine Grafikoption. Keine zusätzlichen Spielfiguren oder Ereignisse in dieser Fassung.
- Plus-Dateien liegen getrennt unter `assets/plus/`. Bestehende Classic-Grafiken bleiben erhalten.
- Normal 5/5 schaltet Plus dauerhaft frei. Easy und Hard zählen getrennt.
- Alte Zielabzeichen, Fahrzeug-IDs und Fahrzeugfreischaltungen bleiben gültig.
- Test-Hooks und Entwicklungsprofile verändern keine echten Erfolge oder Ranglisten.
- Keine neue Engine oder neue Laufzeitabhängigkeit für diesen Umbau.
- Die teilweise überarbeiteten Eingaben und Dachbilder im aktuellen Arbeitsverzeichnis gehören zu anderen Arbeiten. Vor Beginn deren finalen Stand übernehmen.
- Vor der Umsetzung einen passenden sauberen Checkout beziehungsweise eine geeignete isolierte Worktree prüfen. Diese Planung erzeugt keine Implementierungs-Worktree.

## Review Focus

1. Ein höher aufgelöstes Sprite darf weder den Wagen vergrößern noch seine Anker, Überschläge oder Lichteffekte verschieben.
2. Eine geänderte Rendergröße darf weder den Simulationszufall verbrauchen noch Aufrufe der bisherigen Fahrzeugdarstellung anders zählen.
3. Alte beliebige Zielabzeichen dürfen keine Normal-Ziele vortäuschen. Wiederholung und Kontoabruf dürfen den Zähler nicht erhöhen.
4. Ein unvollständig geladenes Plus-Paket darf weder einen schwarzen Bildschirm noch eine gespeicherte unbenutzbare Auswahl erzeugen.
5. Eine korrekte Desktop-Aufnahme darf weder als iPhone-Nachweis noch als Beleg für natives 640×360 im Phaser-Backbuffer gelten.

## Task 1: Zielmengen, Migration und Sammelbadges

**Files:** Create `src/game/goal-progress.ts` and `tools/qa/check-goal-progress.mjs`. Modify `src/main.ts`, `src/game/badges.ts`, `assets/ui/achievements.json` and `assets/ui/strings.json`.

**Interfaces:**

```ts
type GoalLetter = 'A' | 'B' | 'C' | 'D' | 'E';
interface GoalProgress {
  version: 1;
  masks: Record<DiffId, number>;
  plusUnlocked: boolean;
}
normalizeGoalProgress(raw: unknown): GoalProgress;
mergeCompletedGoals(state: GoalProgress,
  cleared: Partial<Record<DiffId, readonly number[]>>,
  completedTiers: ReadonlySet<DiffId>): GoalProgress;
recordGoal(state: GoalProgress, tier: DiffId, goal: GoalLetter): GoalProgress;
goalCount(state: GoalProgress, tier: DiffId): number;
```

Die Funktionen sind rein und ändern ihre Eingaben nicht. Speichern und Kontomeldungen erfolgen an den bestehenden Spielgrenzen.
Alle Masken werden auf fünf zulässige Bits begrenzt; beschädigte Einzelwerte werden nicht als Abschluss behandelt.
`plusUnlocked` bleibt nach bestätigter Freischaltung wahr.

- [x] **Step 1:** Schreibe die Prüfungen `distinctGoals`, `tiersStaySeparate`, `legacyFinalNodes`, `legacyGoalBadgesDoNotQualify`, `accountCompletion`, `storageBlocked` und `testHooksDoNotPersist`.
- [x] **Step 2:** Führe `node tools/qa/check-goal-progress.mjs` aus. Neue Schnittstellen fehlen; die Prüfungen müssen zunächst fehlschlagen.
- [x] **Step 3:** Implementiere die Zielmengen und die Migration. A=10, B=12, C=13, D=14, E=4. Verwende `${SAVE_PREFIX}.goal-progress.v1`.
- [x] **Step 4:** Ergänze `all-goals-easy`, `all-goals` und `all-goals-hard` in allen Badge-Definitionen. Ergänze `Badges.progressOf()` und die Badge-Anzeige um den Zielmengen-Pfad ohne serverseitigen `stat`-Zähler. Zeige je Schwierigkeit den berechneten Zähler und die erreichten Buchstaben. Prüfe Anzeige und Navigation mit der zusätzlichen Badge-Spalte.
- [x] **Step 5:** Melde vollständige Sammelbadges idempotent über `unlockBadge`. Verwende keine inkrementierenden Netzwerkstatistiken für unterschiedliche Ziele. Ergänze später eintreffende vollständige Konto-Badges.
- [x] **Step 6:** Prüfe echte Zieleinläufe, Wiederholungen, 4/5→5/5, Neustart, beschädigte Daten und Offline-Betrieb. `node tools/qa/check-goal-progress.mjs`, `npm run qa:local-services` und `npm run check` müssen bestehen.
- [x] **Step 7:** Committe ausschließlich die geprüften Dateien dieses Schritts.

**Acceptance:** Easy 5/5 und Hard 5/5 lassen Normal unverändert. Normal 5/5 setzt die dauerhafte Freischaltung. Alte Fahrzeuge und Rekorde bleiben verfügbar.

## Task 2: Native Framebuffer, Sprite-Dichte und logische Zeichenfläche

**Files:** Create `src/core/draw-surface.ts`, `src/game/graphics.ts` and `tools/qa/check-graphics-surfaces.mjs`. Modify `src/core/fb.ts`, `src/core/font.ts`, `src/core/assets.ts` and die Zeichenparameter der UI-Helfer.

**Interfaces:**

- `GraphicsMode` und `GraphicsProfile` entsprechen dem technischen Entwurf; `GRAPHICS_PROFILES` enthält genau die beiden gültigen Kombinationen.
- `FB(width = 320, height = 180)` bleibt mit allen bisherigen Zeichenprimitiven kompatibel. Nur `FB` besitzt native Pixelarrays.
- `DrawSurface` bietet logische `w`/`h` und die bestehenden Zeichenprimitiven, ohne direkten Arrayzugriff.
- `ScaledSurface(target: FB, scale: 1 | 2)` implementiert `DrawSurface` mit logischen 320×180-Einheiten.
- `Spr.density?: 1 | 2` sowie dieselbe optionale Atlas-Metadatenangabe beschreiben die Bilddichte; Standard 1.
- `RenderContext` verbindet `profile`, natives `fb` und `logical: DrawSurface`.

Die bestehenden Exporte `W=320` und `H=180` bleiben vorerst logische Layoutkonstanten. Native Routinen lesen `fb.w` und `fb.h`.
Die niedrigstufigen FB-Blits verwenden native Pixelmaße. Ihre Aufrufer berücksichtigen die Sprite-Dichte genau einmal.

- [x] **Step 1:** Prüfe beide Größen, Rand-Clipping, Polygonspannen, additive Blits, Drehung und transparente Rechtecke über einem detaillierten Hintergrund.
- [x] **Step 2:** Ergänze einen Test mit density-1- und density-2-Sprites gleicher logischer Größe. Beide müssen denselben Anker und Fußabdruck besitzen.
- [x] **Step 3:** Führe `node tools/qa/check-graphics-surfaces.mjs` aus. Die neuen Größen und Schnittstellen müssen zunächst fehlschlagen.
- [x] **Step 4:** Stelle FB-Zeilenbreiten, Puffer, Clipping und Defaultgrenzen auf Instanzgrößen um. Ergänze `ScaledSurface` und die Dichtemetadaten.
- [x] **Step 5:** Stelle Schrift, HUD, Passagierblasen, Badges, Karte und Menüs auf `DrawSurface` um. Erhalte die vorhandenen Pixelmotive und Textmaße.
- [x] **Step 6:** Halte Rotation, Spiegelung, Quellbildhöhe und Leuchtmasken logisch konsistent. Prüfe interne Alpha-254-Pixel und normale Alpha-0/255-Quellen.
- [x] **Step 7:** Führe die neue Prüfung und `npm run check` aus. Vergleiche festgehaltene Classic-Bilder vor und nach dem Umbau; die bestehenden Motive müssen identisch bleiben.
- [x] **Step 8:** Committe ausschließlich die geprüften Dateien dieses Schritts.

**Acceptance:** Plus-UI schreibt in ein natives 640×360-Bild und mischt direkt mit diesem Hintergrund. Keine separate Vergrößerung eines fertigen Classic-Bildes.

## Task 3: Projektion, Präsentation und sichere Profilwechsel

**Files:** Modify `src/game/render.ts`, die Darstellungsmethoden in `src/game/race.ts`, `src/game/lights.ts`, `src/main.ts` und `src/game/graphics.ts`. Create `tools/qa/check-graphics-profiles.mjs` and `tools/qa/graphics-profiles-browser.cjs`.

**Interfaces:**

- `Renderer` erhält den `RenderContext` und eine profilgebundene SpriteBank.
- Der native Horizont ist `80 * scale`; die native Brennweite ist `140 * scale`.
- Weltprojektion und UI-Anker bleiben getrennt. Bestehende logische Koordinaten aus `Race` behalten ihre Bedeutung.
- Welt-Spriteprojektion mit bereits skalierter Brennweite dividiert die native Sprite-Skalierung durch `density`; kein zweiter Profilfaktor.
- Profilwechsel verwenden `${SAVE_PREFIX}.graphics-mode.v1` und die vorhandene Freischaltung aus Task 1.

- [ ] **Step 1:** Schreibe Projektions- und Paritätsprüfungen für Classic und Plus. Vergleiche Straße, Wagen, Verdeckung, Wetter, holprigen Untergrund, Shake, Crash, Überschlag und Zielanimation.
- [ ] **Step 2:** Führe `node tools/qa/check-graphics-profiles.mjs` aus. Native Projektion und Profilwechsel müssen zunächst fehlschlagen.
- [ ] **Step 3:** Parametrisiere native Puffer, Hintergrundhöhen, Projektion, Pixelabstände, Clip-Grenzen und Wetterdarstellung. Erhalte `SPR_S`, `CAR_W` und alle übrigen Weltkonstanten.
- [ ] **Step 4:** Verwende logische Spritehöhen bei Crash-Zentren und Passagierpositionen. Skaliere Glow-Radien und Materialkoordinaten passend zur Sprite-Dichte.
- [ ] **Step 5:** Vergleiche identische Eingaben und Simulationsschritte bei identischer Renderanzahl. Zusätzliche Plus-Details verwenden ausschließlich kosmetische Hashwerte. Verändere keine bestehenden Aufrufe des Simulationszufalls.
- [ ] **Step 6:** Passe Phaser Game-Size mit dem vorhandenen ScaleManager an die native Profilgröße an. Textur, Image und Kamera zeichnen 1:1; FIT betrifft nur die äußere Darstellung.
- [ ] **Step 7:** Ergänze Optionen → Grafik → Classic / Plus. Koordiniere die Ergänzung mit dem dann aktuellen Optionenmenü; ersetze keine parallel entstandenen Eingabeeinstellungen.
- [ ] **Step 8:** Lade und prüfe die Plus-Bilder vor dem gemeinsamen Austausch von Framebuffer, Textur, Bank und Renderer. Speichere Plus erst nach Erfolg; erhalte Classic bei jedem Ladefehler.
- [ ] **Step 9:** Prüfe die realen Canvas-/WebGL-DrawingBuffer-Größen und ein natives Ein-Pixel-Schachbrett. Prüfe dieselben logischen Klick-, Touch- und Linkziele in beiden Profilen.
- [ ] **Step 10:** Führe `node tools/qa/check-graphics-profiles.mjs`, die Browserprüfung gegen die lokale Standalone-Fassung und `npm run check` aus. Prüfe Start, gesperrtes Plus, Freischaltung, mehrere Wechsel, Neustart, Ladefehler und Ausrichtungswechsel.
- [ ] **Step 11:** Committe ausschließlich die geprüften Dateien dieses Schritts.

**Acceptance:** 640×360 bleibt bis zum tatsächlichen Backbuffer erhalten. Standard, Demo-Trennung und Rückkehr zu Classic funktionieren. Die unvollständige Plus-Grafik bleibt in der Entwicklungsversion.

## Task 4: Plus-Grafikpipeline und echte Palm-Cove-Musterstrecke

**Files:** Create `tools/art/plus/`, `tools/pack_plus_assets.py`, `assets/plus/manifest.json`, `tools/qa/check-plus-assets.mjs` und `tools/qa/plus-palm-cove.mjs`. Modify nur die kosmetischen Plus-Pfade im Renderer und den bestehenden Landschaftsstilen.

**Interfaces:**

- Das Manifest nennt `version: 1`, `complete: boolean`, benötigte logische Namen, Dichten und ausdrücklich verwendete Classic-Ersatzgrafiken.
- `--pilot` erlaubt nur gekennzeichnete Ersatzgrafiken. `--release` verlangt alle benötigten Namen und keine unbeabsichtigten Ersatzgrafiken.
- `python tools/pack_plus_assets.py` schreibt ausschließlich nach `assets/plus/`. Classic-Quellen und Classic-Packer bleiben getrennt.
- Grafikquellen verwenden gemeinsame Karosserie-, Dach- und Materialmasken. Die Vorlage liegt unter `docs/superpowers/specs/assets/velvet-cruise-plus/`.

- [ ] **Step 1:** Erfasse alle tatsächlich benötigten Motive aus Atlas, Referenzen, Fahrzeugdefinitionen und dynamisch erzeugten Sprite-Namen. Trenne Motive von Varianten und Animationsbildern.
- [ ] **Step 2:** Schreibe Manifest-, Alpha-, Dichte-, Anker- und Materialprüfungen. Führe `node tools/qa/check-plus-assets.mjs --pilot` aus; fehlende Plus-Quellen müssen zunächst sichtbar fehlschlagen.
- [ ] **Step 3:** Implementiere den getrennten Packer. Zeichne den Starterwagen samt vorhandenen Zuständen im nativen Plus-Raster aus.
- [ ] **Step 4:** Ergänze Palm-Cove-Palmen, Sträucher, Felsen, Gebäude-/Terrassenmodule, Küste und Hintergründe. Kleine Paletten und klare Pixelcluster folgen dem bestätigten Entwurf.
- [ ] **Step 5:** Ergänze nur kosmetische Landschaftsformen und weltgebundene Materialdetails. Erhalte Kollisionsdaten, Straßengeometrie, Zufallsstrom und Platzierung aller aktiven Hindernisse.
- [ ] **Step 6:** Erzeuge echte native Aufnahmen an Start, offener Küste, Links- und Rechtskurve, Terrasse und Gabelung. Ergänze kurze Fahrclips mit voller Bewegungsgeschwindigkeit.
- [ ] **Step 7:** Prüfe Mip-Wechsel, Verdeckung und Flimmern in Bewegung. Vergleiche Classic/Plus bei identischer Szene und gleicher sichtbarer Bildgröße.
- [ ] **Step 8:** Führe `node tools/qa/check-plus-assets.mjs --pilot`, die neue Palm-Cove-Aufnahme, `npm run qa:palm-cove` und die Profil-Paritätsprüfung aus.
- [ ] **Step 9:** Committe ausschließlich die geprüften Dateien dieses Schritts.

**Acceptance:** Der echte 640×360-Renderer zeigt zusätzliche Auto- und Landschaftsdetails im bestätigten Stil. Der Bildentwurf allein erfüllt diesen Schritt nicht.

## Task 5: Vollständige Fahrzeuge, Strecken und Zielbilder

**Files:** Extend `tools/art/plus/`, `assets/plus/manifest.json` und die passenden kosmetischen Rendererpfade. Create `tools/qa/plus-stage-audit.mjs` für alle Themen; die Palm-Cove-Prüfung bleibt separat.

- [ ] **Step 1:** Erweitere die Manifestprüfung auf alle sechs Fahrzeuge, Verkehrsfamilien, Dachpositionen, Lenkbilder, Bremsbilder, Insassen- und Crashbilder. Fehlende Familien müssen fehlschlagen.
- [ ] **Step 2:** Übertrage die gemeinsame Grafikpipeline auf alle Fahrzeuge. Verwende den bei Implementierungsbeginn finalen Dachstand; derzeit sind acht Positionen vorhanden.
- [ ] **Step 3:** Ergänze die restlichen 14 Themen in Gruppen: Küste, Wälder/Nebel, Wüste/Sand, Schnee sowie Nacht/Stadt.
- [ ] **Step 4:** Ergänze streckenspezifische Schilder, Tunnel, Lampen, Torbilder und alle fünf Zielanimationen. Prüfe Garage und Karte mit denselben logischen Namen.
- [ ] **Step 5:** Erzeuge pro Thema mindestens acht Fortschrittsansichten. Ergänze vorhandene Sonderfälle für Kurven, Tunnel, Gabelungen und Wetterwechsel.
- [ ] **Step 6:** Führe `node tools/qa/check-plus-assets.mjs --release`, die vollständige Plus-Streckenprüfung, `npm run qa:depth` und die Profil-Paritätsprüfung aus.
- [ ] **Step 7:** Überprüfe tatsächliche Dachbewegungen, geschlossenes Dach beim Überschlag, Rücklichter und Aussteigen im Finale in echten Browseraufnahmen.
- [ ] **Step 8:** Committe die geprüften Grafikgruppen getrennt. Markiere das Paket erst nach vollständiger Abdeckung als `complete: true`.

**Acceptance:** Kein benötigtes Motiv fällt unbemerkt auf Classic zurück. Alle 15 Themen und alle fünf Ziele sind belegt.

## Task 6: Smartphone-Prüfung, Regressionen und Release-Vorbereitung

**Files:** Extend die bestehenden Browser-QA-Werkzeuge. Create `reports/plus-2026-10-25/README.md` und den zugehörigen Messbericht bei Durchführung. Modify Build- oder Paketwerkzeuge nur bei fehlender Plus-Dateiübernahme.

- [ ] **Step 1:** Prüfe, dass Standalone-Web und Windows-Pakete alle erforderlichen Plus-Dateien enthalten. Demo-Speicher und Demo-Auswahl bleiben getrennt.
- [ ] **Step 2:** Führe `npm run check`, `npm run build:web`, `npm run qa:local-services`, `npm run qa:balance`, `npm run qa:course-map`, `npm run qa:grade-horn` und `npm run qa:demo` aus.
- [ ] **Step 3:** Führe neue Ziel-, Grafikprofil-, Asset- und Browserprüfungen aus. Ergänze die bei Implementierungsbeginn aktuellen Eingabe- und Dachprüfungen.
- [ ] **Step 4:** Messe je Profil mindestens zehn Minuten auf Desktop und einem echten iPhone. Protokolliere Gerät, System, Browser, Auflösung, Frameabstände, Speicher und Szenenwechsel.
- [ ] **Step 5:** Prüfe 60-fps-Ziel und p95-Frameabstand höchstens 20 ms im warmen Zustand. Optimiere bei Verfehlung nur kosmetische Details, Mips, Caches und Allokationen.
- [ ] **Step 6:** Prüfe Bedienelemente auf dem iPhone im Querformat, nach Ausrichtungswechsel und nach Pause/Fortsetzen. Prüfe Gas, Bremse, Lenken, Signal und erreichbare Menüs. Ein umfassender Steuerungsneuentwurf bleibt ein separates Vorhaben.
- [ ] **Step 7:** Dokumentiere die manuelle Sichtprüfung, fehlende Geräteprüfungen und die tatsächlich geprüften Grenzen. Desktop-Emulation zählt nicht als physischer iPhone-Nachweis.
- [ ] **Step 8:** Setze den Release-Status erst nach vollständiger Abdeckung auf verfügbar. Zeige Plus regulär nur bei vollständigem Paket und bestehender Freischaltung.
- [ ] **Step 9:** Erstelle prüfbare Web-/Windows-Pakete. Committe geprüfte eigene Dateien; halte Änderungen aus anderen Arbeiten getrennt. Website-Veröffentlichung und Austausch ausgelieferter Pakete erfolgen im späteren Release-Auftrag.

**Acceptance:** Beide Profile bestehen die relevanten Regressionen. Die Plus-Freischaltung und alte Spielstände bleiben stabil. Offene manuelle oder Geräteprüfungen sind benannt.

## Spätere Aufgaben

- Radfahrer, Zuschauer, Surfer und Polizei mit Blitzer.
- Eigenständiger Entwurf zur iPhone-Steuerung.
- Geräteübergreifende Zusammenführung unvollständiger Zielmengen.

Diese Aufgaben blockieren die erste Plus-Grafikfassung nicht.
