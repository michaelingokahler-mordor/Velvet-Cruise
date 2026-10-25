# Velvet Cruise Plus – Prüfstand

Stand: Alle sechs Softwarepakete sind umgesetzt und technisch geprüft.
Weitere iPhone-Optimierungen und die vollständige Geräteabnahme wurden auf
ausdrücklichen Nutzerwunsch vom 25.10.2026 vertagt. Diese Fassung ist ein
lokaler Prüfkandidat. Web und Windows sind zur Prüfung paketiert.

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
Der abgeschlossene Bericht liegt in `desktop-after-rain-fix.json`.

| Profil | Messdauer | fps | p95 | Fortschreitende Fahrt | Fahrt im Regen |
| --- | --- | --- | --- | --- | --- |
| Classic | 600,01 s | 59,99 | 17,0 ms | 559,62 s | 120,14 s |
| Plus | 600,02 s | 59,99 | 16,9 ms | 564,68 s | 120,29 s |

Gemessen wurde mit Chrome 155 im Headless-Modus auf Windows 11 mit einem
Intel Core i9-14900HX. Die Ergebnisse gelten für diesen Desktop. Einzelne
Frameabstände erreichten rund 116 ms; ein p95 unter 20 ms bedeutet keine
vollständig ruckelfreie Fahrt. Beide Profile zeigten echte Fahrt, Regen,
Streckenwechsel und Menü-/Zielübergänge. Das geladene Laufzeitmodul war
`index-BgK9JsxI.js`.

Der Nutzer bestätigt auf einem **iPhone 14 mit iOS 27.0.1**: Das Spiel läuft
mit „Plus aktiv“. Das ist eine menschlich bestätigte Funktionsprüfung. Die
Steuerung benötigt aus Nutzersicht einen eigenen Umbau. Ein Messbericht über
zehn Minuten pro Profil sowie eine vollständige Rückmeldung zu Gas, Bremse,
Lenkung, Signal, Pause/Fortsetzen, Menüs und Ausrichtungswechsel stehen noch aus.
Desktop-Emulation zählt nicht als Nachweis für dieses Gerät.

Zunächst meldete der Nutzer deutliche Verlangsamung bei Regen; auf dem
iPhone wurde nur Plus getestet. Die erste Desktopmessung beider Profile
liegt separat unter `desktop-before-rain-fix.json`.

Die Profilierung fand hohe Kosten bei kalten Rücklicht-Glows und nativen
Hintergrundkopien sowie unnötige Lichtberechnungen ohne sichtbare Pixelzeile.
Die Korrekturen behalten alle 264 Streckenbilder bytegenau bei. Der Nutzer
bestätigte nach dem Regentest zunächst „Deutlich flüssiger“ und anschließend:

> Auf dem Iphone ist es nun etwas schneller aber immer noch langsamer als auf
> dem PC. Ich denke wir optimieren das später, mit weiteren Iphone optimierungen.

Damit sind weitere iPhone-Optimierungen, die numerische Zehn-Minuten-Messung
je Profil und die vollständige Bedien-/Ausrichtungsprüfung Folgeaufgaben.
Das ersetzt keine bestandene iPhone-Leistungsabnahme. Der zuvor offene
Geräteblocker blockiert auf diese ausdrückliche Umfangsänderung hin den
Abschluss der ersten Plus-Fassung nicht mehr. Der Bericht
`iphone-status.json` hält Bestätigung und Grenzen getrennt fest.
Die beiden wichtigen Befunde der unabhängigen Softwareprüfung und ihre
Regressionen sind in `code-review.md` festgehalten.

Die lokale Seite `http://192.168.178.66:4191/plus-check.html` erfasst die
Geräteangaben, Frameabstände, Szenen und Bedienprüfungen. Sie speichert das
Ergebnis auf Wunsch als JSON und veröffentlicht keine Daten. Die Identität des
physischen Geräts und die Bedienprüfungen sind menschliche Angaben.
Version 2 trennt die gemessene Browser-Framekadenz von der Geräteabnahme und
prüft mindestens acht Minuten fortschreitende Fahrt mit 30 Sekunden Regen.
Ein Titelseiten-Dauertest genügt nicht.

## Artefakte und Grenzen

Die Dateien liegen im isolierten Checkout unter `output/plus/`:

- `palm-cove/`: gleiche Szenenpositionen, Fahrclips und Bewegungsstichproben.
- `stages/`: 132 Vergleichspaare, Streckenübersicht und Fahrzeug-/Dachübersicht.
- `weather-browser/coverage.json`: erfolgreiche Wetter-, Überschlag- und
  Zielabdeckung. Die erfolgreichen Wetter- und Schlussläufe liefen getrennt.
- `native-desktop/report.json`: Nachweis aus dem gestarteten Windows-Paket.
- `packages-rainfix-20261025/`: abschließende Web-/Windows-Prüfkandidaten mit
  Prüfsummen; die älteren Pakete wurden dadurch abgelöst.
- `benchmark/`: abgeschlossene Desktop-Messung des optimierten Stands.

Die finalen ZIP-Dateien heißen `Velvet-Cruise-Plus-Web.zip` und
`Velvet-Cruise-Plus-Windows.zip`. `package-report.json` enthält ihre SHA-256-
Werte und Größen. `native-windows.json` enthält den Start- und Bediennachweis
aus dem optimierten Windows-Paket. Die einfache Testadresse
`http://192.168.178.66:4191/regen-v2.html` setzt die Regenflags vor dem
Spielstart; „Drive“ startet Plus auf Thunder Highway. Die Testseite vergibt
keine echten Erfolge.

Die Sichtprüfung umfasst statische Szenen, Bewegungsstichproben und native
Windows-Ausgaben. Durchgehendes menschliches Ansehen aller Fahrclips, physische
Gamepads und der vollständige iPhone-Test sind dadurch nicht ersetzt.
Die Website und ausgelieferte Pakete wurden nicht verändert. Die umfassende
Steuerungsüberarbeitung bleibt ein eigenes Folgevorhaben. Die Entscheidungen
zur Ausführung und ihre möglichen Kosten stehen vollständig in
`decisions.md`. Eine kleine offene Prüflücke betrifft zusätzliche
Tunnel-/Stufen-/Zielsegmentfelder im Erhaltungsvertrag; siehe `code-review.md`.

## Abschließender Prüflauf

`verification.txt` enthält den vollständigen bestandenen letzten Prüflauf.
Er umfasst TypeScript, Ziele und Migration, Zeichenflächen, Grafikprofile,
Lieferdateien, Licht-/Kopierverfahren, Eingaben, Menüs, Dächer, Streckenverträge,
Balance, Karte, Signal, Demo sowie die realen lokalen Browserfassungen.
Die archivierten Dauer-/Native-Nachweise und finalen Paketprüfsummen werden
zusätzlich auf Vollständigkeit geprüft.

Lokale Wiederholung mit laufenden Prüffassungen auf Port 4191/4192:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File reports/plus-2026-10-25/verify.ps1 -PythonExe D:\Python314\python.exe
```

Die bereits bestandenen Web-/Demo-/Windows-Builds und der 20-minütige
Desktop-Dauertest werden durch diesen Regressionseintritt nicht neu erzeugt.
Der Ausführungsverlauf ist in `execution-ledger.md` archiviert. Der Stand
bleibt auf dem Zweig `codex/velvet-cruise-plus` im isolierten Checkout erhalten.
