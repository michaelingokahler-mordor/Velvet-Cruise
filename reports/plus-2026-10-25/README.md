# Velvet Cruise Plus – Prüfstand

Stand: Pakete 1–5 sind umgesetzt. Paket 6 ist in Prüfung. Diese Fassung ist ein
lokaler Prüfkandidat; sie wurde weder veröffentlicht noch in bestehende
Windows-Installationen kopiert.

## Darstellung und Freischaltung

| Eigenschaft | Classic | Plus |
| --- | --- | --- |
| Natives Framebuffer, Textur und Backbuffer | 320×180 | 640×360 |
| Bildausschnitt und Weltmaße | gemeinsam | gemeinsam |
| UI- und Touchkoordinaten | logisch 320×180 | logisch 320×180 |
| Auswahl | Optionen → Grafik | nach Normal A–E, dauerhaft |

Easy, Normal und Hard zählen unterschiedliche Ziele getrennt, jeweils 0/5 bis
5/5. Die neuen Sammelbadges übernehmen bestätigte vollständige Kontoerfolge.
Unvollständige Zielmengen bleiben vorerst gerätebezogen. Alte Zielbadges,
Fahrzeug-IDs, Fahrzeugfreischaltungen, Rekordschlüssel und `tour2` bleiben gültig.
Test-URLs vergeben keine echten Zielerfolge. Die Demo behält eigene Schlüssel
und bleibt auch mit vollständigem Hauptspiel-Spielstand im Classic-Profil.

Die Grafik umfasst 679 native Sprites, 36 Hintergründe und Zielbilder sowie
vier Atlas-Seiten. Genau 18 kleine HUD-/Wettersymbole werden bewusst geteilt.
Alle sechs Fahrzeuge behalten ihre logischen Maße und acht Dachpositionen.
Die neuen Quellen verwenden die vorhandenen Formen als Maß- und
Materialvorlagen und ergänzen Details im nativen Plus-Raster. Straßen, Tunnel,
Leitplanken, Geländeformen und Beleuchtung zeichnet der vorhandene Renderer.
Es gibt keine neue Physik oder zusätzlichen Hindernisse.

## Technische Nachweise

- 18 Ziel-/Migrationsprüfungen, 11 Zeichenflächenprüfungen und 14 Profilprüfungen.
- Native 640×360 bis zum echten Canvas-/WebGL-Backbuffer und sichtbare einzelne
  native Pixel; Ausrichtungswechsel, Touch- und Linkflächen, Neustart,
  gesperrte Auswahl und Rückkehr nach einem Ladefehler.
- 132 Classic-/Plus-Vergleichspaare für alle 15 Themen, einschließlich Wetter,
  Gabelungen und Tunnel. Sechs kurze Palm-Cove-Fahrclips mit voller Spielzeit.
- Sechs Browser-Wettertouren mit allen Dachphasen, sechs geschlossene
  Überschläge und alle fünf Zielbilder für jedes Fahrzeug. Das Dach öffnet
  vor dem Aussteigen.
- Unveränderte Straßen-, Szenerie-, Kollisions- und Zeitdaten auf allen 16
  Routen gegenüber dem bestätigten Stand vor Plus. Fünf vollständige
  Schauläufe sowie die bestehenden Signal-, Licht-, Eingabe-, Dach- und
  Menüprüfungen bestehen.
- Das tatsächliche Windows-Paket wurde über sein natives Spielprotokoll
  gestartet. Plus-Backbuffer, Tastatur/Menüs, Pause/Fortsetzen, Garage und
  Beenden wurden geprüft. Ein getrenntes Testprofil schützt vorhandene Daten.
- Web- und Windows-Pakete enthalten alle 45 benötigten Plus-Dateien. ZIP-CRC
  und SHA-256 wurden geprüft. Die native EXE entspricht der gelieferten Vorlage.

Die Standardbefehle `qa:palm-cove` und `qa:depth` verwenden einen portablen,
aus Commit `a5f9377` erzeugten Vertrag für die gültige Strecke. Die früheren
Vergleichsdateien beschreiben ältere Strecken- und Gabelungslängen. Ihre
relativen Landschaftsumbau-Prüfungen bleiben als `qa:palm-cove:legacy` und
`qa:depth:legacy` erhalten. Bestehende absolute Gelände-, Haus-, Signal- und
Lichtprüfungen bleiben aktiv. Es wurden keine Spieldaten angepasst, um diese
Prüfungen zu bestehen.

## Leistung und iPhone

Der Desktop-Dauertest misst nacheinander je Profil zehn Minuten nach 30 Sekunden
Aufwärmen. Ziel sind 60 fps und p95-Frameabstände bis 20 ms. Die Messung erfasst
Browser-RAF-Zeitstempel, native Größe, Szenenwechsel und verfügbaren
JavaScript-Heap. Sie misst keinen vollständigen Prozess- oder Gerätespeicher.
Der Bericht unter `output/plus/benchmark/report.json` ist während des Laufs
vorläufig; abgeschlossene Ergebnisse werden hier abgelegt.

Der Nutzer bestätigt auf einem **iPhone 14 mit iOS 27.0.1**: Das Spiel läuft
mit „Plus aktiv“. Das ist eine menschlich bestätigte Funktionsprüfung. Die
Steuerung benötigt aus Nutzersicht einen eigenen Umbau. Ein Messbericht über
zehn Minuten pro Profil sowie eine vollständige Rückmeldung zu Gas, Bremse,
Lenkung, Signal, Pause/Fortsetzen, Menüs und Ausrichtungswechsel stehen noch aus.
Desktop-Emulation zählt nicht als Nachweis für dieses Gerät.

Die lokale Seite `http://192.168.178.66:4191/plus-check.html` erfasst die
Geräteangaben, Frameabstände, Szenen und Bedienprüfungen. Sie speichert das
Ergebnis auf Wunsch als JSON und veröffentlicht keine Daten. Die Identität des
physischen Geräts und die Bedienprüfungen sind menschliche Angaben.

## Artefakte und Grenzen

Die Dateien liegen im isolierten Checkout unter `output/plus/`:

- `palm-cove/`: gleiche Szenenpositionen, Fahrclips und Bewegungsstichproben.
- `stages/`: 132 Vergleichspaare, Streckenübersicht und Fahrzeug-/Dachübersicht.
- `weather-browser/coverage.json`: erfolgreiche Wetter-, Überschlag- und
  Zielabdeckung. Die erfolgreichen Wetter- und Schlussläufe liefen getrennt.
- `native-desktop/report.json`: Nachweis aus dem gestarteten Windows-Paket.
- `packages-20261025/`: erster Web-/Windows-Prüfkandidat mit Prüfsummen.
- `benchmark/`: laufende Desktop-Messung.

Die Sichtprüfung umfasst statische Szenen, Bewegungsstichproben und native
Windows-Ausgaben. Durchgehendes menschliches Ansehen aller Fahrclips, physische
Gamepads und der vollständige iPhone-Test sind dadurch nicht ersetzt.
Die Website und ausgelieferte Pakete wurden nicht verändert. Die umfassende
Steuerungsüberarbeitung bleibt ein eigenes Folgevorhaben.
