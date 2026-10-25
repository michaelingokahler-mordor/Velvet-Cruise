# Velvet Cruise Plus — technischer Entwurf

Stand: 25.10.2026. Die Grafikrichtung und die unten genannten Produktentscheidungen sind im Chat bestätigt.
Der Palm-Cove-Stilentwurf gefällt dem Nutzer. Die beigefügten Lotus-Bilder ergänzen diese Referenz.
Technische Vorgaben in diesem Dokument sind Vorschläge für die Umsetzung, soweit nicht ausdrücklich als Nutzerentscheidung bezeichnet.

## 1. Ziel und bestätigte Entscheidungen

Plus erweitert Velvet Cruise um eine freischaltbare Grafikdarstellung in **640×360 bei 16:9**.
Classic behält **320×180**. Beide Darstellungen verwenden dieselbe Simulation und denselben Bildausschnitt.
Der Wechsel erfolgt im **Hauptmenü unter Optionen → Grafik → Classic / Plus**.
Die Auswahl bleibt auf diesem Gerät gespeichert. Während einer Fahrt gibt es keinen Wechsel.

- Das Gefühl klassischer Sprite-Rennspiele ist entscheidend. Eine AGA-Emulation gehört nicht zum Ziel.
- Der bestätigte Palm-Cove-Entwurf ist das wichtigste gestalterische Vorbild.
- Die Lotus-Screenshots zeigen zusätzlich die gewünschte Lesbarkeit, klaren Silhouetten und gestuften Landschaftsfarben.
- Sprites und Materialien erhalten bewusst kleine Paletten. Licht, Wetter und Übergänge dürfen zusätzliche Farben erzeugen.
- Es gibt keine harte Grenze von 256 Farben im fertigen Bild und keinen HAM8-Modus.
- Plus verbessert Landschaften, Autos und Sprites. Zusätzliche Ereignisse und Spielfiguren folgen später.
- Smartphones gehören zum Ziel. Insbesondere muss die Darstellung auf einem echten iPhone geprüft werden.
- Drei Sammelbadges zählen je Schwierigkeit die unterschiedlichen Ziele A–E von 0/5 bis 5/5.
- **Normal mit 5/5 schaltet Plus dauerhaft frei.** Easy und Hard haben eigene Zähler.

Die folgenden Darstellungen werden vorläufig als Stilreferenz gespeichert:

- `assets/velvet-cruise-plus/palm-cove-classic.png`: tatsächliche Spielaufnahme, intern 320×180, hier dreifach vergrößert.
- `assets/velvet-cruise-plus/palm-cove-plus-style-v1.png`: bestätigter KI-Stilentwurf, 1672×941 Vorschaupixel.
- `assets/velvet-cruise-plus/generation-brief.json`: Herkunft, Eingabebilder und vollständiger Bildprompt.

Der Stilentwurf belegt keine native 640×360-Darstellung, Spielbarkeit oder Laufzeitgeschwindigkeit.
Das erste technische Ergebnis muss diese drei Punkte im echten Renderer belegen.

## 2. Ansätze und gewählte Grundlage

| Ansatz | Nutzen und Aufwand | Entscheidung |
|---|---|---|
| Classic auf 640×360 vergrößern | Kleiner Eingriff, aber keine zusätzlichen Bilddetails | Nur Vergleichsbasis während der Entwicklung |
| Bestehenden Software-Renderer erweitern und eigene Plus-Grafiken verwenden | Zusätzliche Details bei gleicher Pseudo-3D-Komposition; nutzt bestehende Landschaften und Abläufe | Gewählte Grundlage dieser Planung |
| Neue 3D-Darstellung oder genaue AGA-Emulation entwickeln | Andere Grafikpipeline und erheblich größerer Umbau | Passt nicht zur bestätigten Richtung |

Die Aufwertung entsteht durch neu ausgearbeitete Formen und Pixelcluster.
Ein Filter oder eine vergrößerte Classic-Grafik erfüllt das Grafikziel nicht.
Lotus und Out Run dienen als Referenzen für die Bildwirkung. Fremde Sprites und Marken werden nicht übernommen.

## 3. Darstellung und Schnittstellen

### Grafikprofil und Bildschirmkoordinaten

Neue interne Typen trennen das Grafikprofil von Weltmaßen und Bedienkoordinaten:

```ts
type GraphicsMode = 'classic' | 'plus';
interface GraphicsProfile {
  readonly id: GraphicsMode;
  readonly width: 320 | 640;
  readonly height: 180 | 360;
  readonly scale: 1 | 2;
}
```

Die zwei erlaubten Profile sind Classic `{320, 180, 1}` und Plus `{640, 360, 2}`.
`FB(width = 320, height = 180)` hält seine tatsächlichen Abmessungen, Zeilenbreiten und Hilfspuffer pro Instanz.
Der bisherige parameterlose Aufruf bleibt gültig.

Ein `RenderContext` verbindet das native Framebuffer, das Grafikprofil und eine logische Zeichenfläche mit 320×180 Einheiten.
Die logische Zeichenfläche schreibt direkt in das native Framebuffer.
Bei Plus bildet ein logischer Punkt einen 2×2-Block. Transparente Flächen mischen mit den vorhandenen nativen Hintergrundpixeln.
Es gibt keine nachträgliche Vergrößerung des gesamten Plus-Spielbildes.

Menüs, HUD, Texte, Passagierblasen und Ergebnisbildschirme behalten zunächst ihre logischen Layoutmaße und Pixel-Schriftformen.
Ihre Zeichenfunktionen verwenden eine gemeinsame `DrawSurface`-Schnittstelle mit Zeichenprimitiven und logischen Abmessungen.
Direkte Array-Zugriffe in der Schriftfunktion werden durch diese Schnittstelle ersetzt.
Weltflächen, Hintergründe und Wetter zeichnen dagegen im nativen 640×360-Raster.

Die Projektion verwendet `HORIZON * scale`, `FOCAL * scale` und die native Bildschirmmitte.
Alle Bildschirmgrenzen, Verdeckungsgrenzen und Bildpuffer verwenden die native Größe.
Weltkonstanten wie `SPR_S`, `CAR_W`, `ROAD_W`, `PLAYER_Z` und Streckenlängen bleiben unverändert.
Darstellungsmethoden des Rennens verwenden die logische Zeichenfläche für bestehende Fahrzeug- und Crash-Anker.
Native Spritegrößen dürfen nicht in Weltmaße oder physikalische Kollisionsgrenzen eingehen.
`Race.drawPlayer()` verwendet derzeit denselben Zufallsstrom wie die Verkehrssimulation.
Bestehende Zufallsaufrufe bei Bodenunruhe und Shake behalten ihre Anzahl und Reihenfolge.
Neue Plus-Details erhalten getrennte kosmetische Zufallswerte.

### Sprites, Hintergründe und Caches

`Spr` und Atlas-Metadaten erhalten optional `density: 1 | 2`. Fehlende Werte bedeuten Classic-Dichte 1.
Die logische Spritegröße ist `native Größe / density`.
Ein bisheriges Fahrzeug mit 88×48 Pixeln erhält in Plus eine Ausarbeitung mit 176×96 Pixeln bei gleichem logischen Fußabdruck.
Projektion und logische Zeichenfläche berücksichtigen die Dichte genau einmal.
Rotation, Spiegelung, Mip-Stufen, Lichtmasken und additive Glows verwenden dieselben Anker und Dichtewerte.
Spritebasierte Lageberechnungen verwenden logische Höhen und Breiten, insbesondere bei Überschlägen und beim Aussteigen.

Plus verwendet eigene Dateien unter `assets/plus/`, mit denselben logischen Sprite- und Hintergrundnamen.
Der neue Plus-Packer schreibt ausschließlich in dieses Verzeichnis.
Classic-Grafiken, gespeicherte Fahrzeug-IDs und bestehende Atlas-Dateien werden nicht durch Plus ersetzt.
Während der Entwicklung sind Classic-Ersatzgrafiken erlaubt. Ein Prüfmanifest listet diese ausdrücklich auf.
Für die reguläre Plus-Freigabe müssen alle benötigten Grafiken und Hintergründe vollständig vorliegen.

Atlas-Pixel bleiben an der Quelle transparent oder deckend: Alpha 0 oder 255.
Der interne Emissionsmarker 254 bleibt erhalten.
Neue Fahrzeuglampen verwenden die vier bestehenden erkannten Linsenfarben als Quellen ihrer Lichtmasken.
Materialprüfungen erhalten logische Koordinaten, wenn ihre Regeln bisher auf Classic-Pixelmaßen beruhen.
Licht-, Tor-, Schild- und Mip-Caches gehören zum Grafikprofil beziehungsweise zur jeweiligen SpriteBank.
Ein Profilwechsel verwirft diese Caches und den alten Rendererzustand.

### Optionen, Laden und Eingaben

Die gespeicherte Auswahl verwendet `${SAVE_PREFIX}.graphics-mode.v1`; Standard ist Classic.
Ein freigeschalteter Spieler kann Plus auswählen und später wieder zu Classic wechseln.
Ein gesperrter Eintrag zeigt die Bedingung und den Normal-Zähler an.
Unbekannte Einstellungen oder ein unzulässiges Plus-Profil führen zu Classic.

Die Phaser-Präsentation verwendet eine native Game-Size und einen gleich großen Canvas-/WebGL-Backbuffer für das aktive Profil.
Classic verwendet durchgehend 320×180; Plus verwendet durchgehend 640×360.
Die Bildschirmtextur wird bei Kamerazoom 1 ohne Zwischenverkleinerung auf diesen Backbuffer gezeichnet.
Nur die äußere CSS-Darstellung skaliert das Bild mit dem bestehenden 16:9-Fit-Verhalten.
Die Prüfung kontrolliert Framebuffer, Textur und tatsächliche DrawingBuffer-Abmessungen sowie ein natives Ein-Pixel-Muster.
Zeiger- und Touchkoordinaten bleiben in 320×180-Layout-Einheiten.
Damit bleiben vorhandene Touchflächen und Browser-Linkrechtecke relativ zum sichtbaren Bild gleich groß.
Die logische UI-Zeichenfläche bleibt unabhängig von der nativen Phaser-Game-Size bei 320×180.
Grafikgröße und Gerätepixeldichte werden nicht miteinander multipliziert.

Ein Profilwechsel lädt zunächst die erforderlichen Bilder und validiert das Manifest.
Erst danach werden Framebuffer, Textur, SpriteBank und Renderer gemeinsam ausgetauscht.
Bei fehlenden Dateien oder Speicherfehlern bleibt Classic benutzbar; die Oberfläche erklärt den fehlgeschlagenen Wechsel.
Die gewählte Plus-Einstellung wird erst nach erfolgreichem Wechsel gespeichert.
Plus lädt seine große Atlas-Bilddatei erst bei Bedarf. Ein kleiner Release-Status macht den neuen Eintrag vorher verfügbar.
Während einer Fahrt ändern weder eine eingehende Badge-Antwort noch die Geräteausrichtung das aktive Grafikprofil.

## 4. Grafikarbeit

### Musterstrecke Palm Cove

Der erste Abschnitt enthält den roten Starterwagen, die vorhandenen Palm-Cove-Landschaftsformen und alle dort sichtbaren Grafikfamilien.
Die Prüfung erfolgt an identischen Positionen: Start, offene Küste, Links- und Rechtskurve, Terrasse und Gabelung.
Aufnahmen zeigen native 320×180- und 640×360-Bilder sowie gleiche Darstellungsgrößen.

- Fahrzeuge: bessere Karosserieformen, Lichtbänder, Sitze und Insassen bei unveränderter Außenwirkung.
- Vegetation: lesbare Palmwedel, verschiedene Kronen, Schatten und Übergänge zum Boden.
- Gelände: abgestufte Wiesenflächen, Felsfacetten, Wege und sauber verankerte Terrassen.
- Küste: Sandkanten, ruhige Wellenbänder, gerichtete Reflexe und besser ausgearbeitete Leitplanken.
- Ferne: eigene Silhouetten und ruhigere Kontraste statt zusätzlichem Bildrauschen.

Geländedetails folgen Weltpositionen und stabilen kosmetischen Hashwerten.
Sie verwenden weder Bildschirmrauschen noch den Zufallsstrom der Streckenerzeugung oder Simulation.
Zusätzliche Formen und Dekoration bleiben außerhalb der aktiven Kollisions- und Streckendaten.
Bei kleinen projizierten Größen entfallen feine Details; passende Mip-Stufen verhindern Flimmern.

Die ersten Grafikquellen werden auf dem nativen Plus-Raster ausgearbeitet.
Der bestätigte KI-Entwurf bleibt eine Vorlage; er wird nicht als flaches Hintergrundbild in die Strecke eingesetzt.
Wiederholbare Fahrzeug- und Animationsvarianten entstehen aus gemeinsamen Grundformen und Masken.
So bleiben Karosserie, Reifenaufstand und Dachpositionen über alle Bilder konsistent.

### Übertragung auf das vollständige Spiel

Nach der Musterstrecke folgen alle sechs Fahrzeuge und ihre vorhandenen Lenk-, Brems-, Insassen-, Dach- und Crashzustände.
Die aktuelle Dachanimation besitzt acht Positionen; Plus muss den bei Implementierungsbeginn vorhandenen Stand übernehmen.
Verkehr, Warnschilder, Tunnel, Nachtlampen und streckenspezifische Objekte gehören ebenfalls zur vollständigen Abdeckung.
Danach folgen alle 15 Streckenthemen einschließlich Regen, Nebel, Sand, Schnee und Nacht.
Garage, Zielanimationen, Karte und Ergebnisbildschirm müssen im Plus-Modus vollständig bedienbar bleiben.
Kleine HUD-Grafiken können ihre bestehenden Pixelmotive behalten; das Manifest kennzeichnet diese bewusste Wiederverwendung.

Ein Asset-Inventar zählt Motive, Animationsvarianten und tatsächlich zu ersetzende Dateien getrennt.
Die aktuelle Anzahl von Atlas-Einträgen ist keine belastbare Schätzung neu zu zeichnender Motive.

## 5. Zielzähler, Spielstände und Rekorde

Die Zielidentität wird je Schwierigkeit gespeichert. Ein bloßer Aufruf eines inkrementierenden Zählers reicht dafür nicht.
Eine gespeicherte Bitmaske verhindert, dass Ziel A mehrfach zum Fortschritt beiträgt.
Die Zielknoten sind A=10, B=12, C=13, D=14 und E=4.

Der neue Speicher `${SAVE_PREFIX}.goal-progress.v1` enthält Version 1 und je Schwierigkeit eine Fünf-Bit-Maske.
Zusätzlich bleibt eine bereits bestätigte Plus-Freischaltung dauerhaft gespeichert.
Ein Ziel wird nur nach einem echten Zieleinlauf für die aktive Schwierigkeit verbucht.
Ein gescheiterter Lauf, die Karte, eine Vorschau und Test-Hooks erzeugen keinen echten Fortschritt.

Neue Sammelbadges verwenden die IDs `all-goals-easy`, `all-goals` und `all-goals-hard`.
Der sichtbare Zähler zeigt die Anzahl unterschiedlicher Ziele an.
Die bisher auf `stat` und `target` begrenzte Anzeige in `Badges.progressOf()` erhält dafür einen eigenen Zielmengen-Pfad.
Der Badge-Bildschirm zeigt diesen Fortschritt auch bei einem Sammelbadge ohne serverseitigen Inkrement-Zähler.
Vollständige Sammelbadges werden über die vorhandene idempotente Badge-Freischaltung gemeldet.
Der Zähler wird aus den Zielidentitäten berechnet, nicht durch wiederholte Netzwerk-Inkremente.
Ein bestätigtes neues Sammelbadge bedeutet 5/5 für seine Schwierigkeit.
Unvollständige Zähler bleiben in dieser ersten Version gerätebezogen, entsprechend den bisherigen Etappenabschlüssen.
Geräteübergreifende Zusammenführung unvollständiger Zielmengen benötigt eine spätere eigene Synchronisierung.

Eine einmalige, wiederholbar sichere Migration übernimmt Zielknoten aus `${SAVE_PREFIX}.stages-cleared` je Schwierigkeit.
Alte Zielabzeichen ohne Schwierigkeit sind kein Beleg für einen Normal-Abschluss.
Die bisherigen IDs `goal-a` bis `goal-e` sowie `goal-all` bleiben für alte Belohnungen gültig.
Vorhandene Fahrzeugfreischaltungen gehen nicht verloren.
Bei blockiertem Speicher bleiben neue Freischaltungen in der Sitzung nutzbar; vorhandene Speicherwerte werden nicht überschrieben.
Ein später bestätigtes Konto-Badge ergänzt den gespeicherten Fortschritt. Ein Netzwerkfehler sperrt vorhandenes Plus nicht erneut.

Normal 5/5 erfüllt die Freischaltbedingung. Die Hard-Maske wird nicht stillschweigend als Normal gewertet.
Nach der Freischaltung ist Plus bei jeder Schwierigkeit auswählbar.
Demo und Vollversion behalten ihre bestehenden getrennten Speicherpräfixe.
Die eingeschränkte Demo stellt Plus nicht als auswählbare Darstellung bereit.

Grafikprofile verändern keine Punkte, Fahrphysik, Hindernisse, Gegner, Zeiten oder Schwierigkeitswerte.
`RULESET = 'tour2'`, Board-IDs und vorhandene Rekordschlüssel bleiben erhalten.
Grafikmodus und Fahrzeugzustand können als Diagnosefelder erscheinen, ändern aber keine Ranglisten-Zuordnung.

## 6. Abnahme und Veröffentlichung

### Automatische Prüfungen

- Classic-Grundbilder bleiben bei festgehaltener Szene unverändert, abgesehen von den ausdrücklich ergänzten Optionen und Sammelbadges.
- Plus zeichnet ein natives 640×360-Framebuffer. Dieselbe Projektion ergibt doppelte Pixelkoordinaten bei gleichem Bildausschnitt.
- Identische Eingaben, Simulationsschritte und Renderaufrufe ergeben gleiche relevante Simulationszustände in beiden Profilen, auch bei Bodenunruhe, Shake und Crash.
- Spritegrößen, Anker, Mip-Stufen, Verdeckung und Rotation stimmen bei beiden Dichten.
- Alpha, Emission, Rücklichter und sämtliche Dachbilder bleiben korrekt.
- Ein doppelter Zieleinlauf, eine wiederholte Migration und ein wiederholter Kontoabruf erhöhen den Zielzähler nicht erneut.
- Alte und beschädigte Spielstände, fehlender Speicher und eine unterbrochene Netzwerkverbindung sind abgedeckt.
- Demo-Fortschritt und Testläufe schalten Plus in der Vollversion nicht frei.
- Profilwechsel, fehlende Dateien, Laden nach Neustart, Touchflächen und übersetzte Menüs funktionieren.
- Alle 15 Themen, fünf Ziele und sechs Fahrzeuge sind durch das Asset-Manifest und passende Szenenaufnahmen abgedeckt.

### Sichtprüfung und Leistung

Ziel sind 60 Bilder pro Sekunde auf Desktop und dem geprüften iPhone.
Die Messung erfasst auch Frameabstände, Texturübertragung und UI; reine Rendererzeiten reichen nicht aus.
Die 95. Perzentile der Frameabstände bleibt im warmen Zustand höchstens 20 ms auf den tatsächlich protokollierten Prüfgeräten.
Je Profil folgen mindestens zehn Minuten Fahrt mit Wetter, Verkehr und einem Wechsel zwischen mehreren Streckenthemen.
Gerät, Betriebssystem, Browser, Fenstergröße und Hochskalierung werden im Bericht genannt.
Wird das Ziel verfehlt, werden kosmetische Detaildichte, Mip-Auswahl, Lichtpuffer und Allokationen optimiert.
Physik, Gegnerzahl und Auflösung werden nicht automatisch herabgesetzt.
Das öffentlich auswählbare Classic bleibt die manuelle Alternative.

Abnahmebilder und kurze echte Fahrclips müssen fehlende Details, Flimmern, schwebende Objekte und Verdeckung sichtbar machen.
Eine Browser-Geräteemulation ersetzt weder die Leistungsprüfung noch die Steuerungsprüfung auf einem echten iPhone.
Eine nicht verfügbare Geräteprüfung bleibt ausdrücklich offen; ein generierter Entwurf ist kein Ersatz.

### Reihenfolge und Grenze der ersten Veröffentlichung

1. Zielmengen und Migration getrennt prüfen; vorhandene Belohnungen und Rekorde schützen.
2. Grafikprofile, native Framebuffer und logische Bedienung mit Ersatzgrafiken technisch nachweisen.
3. Palm Cove mit dem Starterwagen im bestätigten Stil fertigstellen und vergleichen.
4. Fahrzeuge und alle Streckenthemen ergänzen; das Manifest vervollständigen.
5. Desktop, Standalone-Web und iPhone prüfen; vollständige Plus-Auswahl freigeben.

Die unfertige Musterstrecke erscheint nur in einer Entwicklungsversion mit deaktivierten echten Rekord- und Badge-Meldungen.
Eine normale Spielversion bietet Plus erst an, wenn das vollständige Grafikpaket verfügbar und geprüft ist.
Veröffentlichung auf der Website oder ein Austausch ausgelieferter Pakete gehört erst zum späteren Release-Schritt.

## 7. Spätere Erweiterungen

- Radfahrer.
- Zuschauer am Straßenrand.
- Surfer auf dem Wasser.
- Polizei mit einem Blitzergerät.
- Eigener Entwurf zur iPhone-Steuerung über die unveränderte Größe vorhandener Touchflächen hinaus.
- Geräteübergreifender Abgleich unvollständiger Zielmengen.

Diese Erweiterungen sind für die erste Plus-Grafikfassung nicht erforderlich.

## Umfangsänderung nach dem iPhone-Test am 25.10.2026

Der Nutzer bestätigt die Verbesserung im Regen, meldet weiterhin geringere
Geschwindigkeit als auf dem PC und vertagt weitere iPhone-Optimierungen.
Die erste Plus-Fassung wird deshalb mit offener numerischer iPhone-Abnahme
und offener vollständiger Bedienprüfung abgeschlossen. Die Verbesserung ist
keine 60-fps-Gerätefreigabe. iPhone-Steuerung und Leistungsarbeit bleiben
Folgeaufgaben; Desktop- und Browserprüfungen werden gesondert ausgewiesen.
