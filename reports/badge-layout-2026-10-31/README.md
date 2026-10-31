# Badges: Abstände vor dem ersten itch.io-Upload

Die Badges-Ansicht ist in der gemeinsamen Spielquelle korrigiert.
Quelle: `da23919b0837020fe350c632bf161b97849bb3ff`.

Die Web-Demo ist mit Website-Commit `c711dcf0b32316eb3406458f7f669245323c196f` veröffentlicht.
Release: `2026-10-31-demo-e-badges-Cps_mrO3`.
Der Live-Aufruf zeigte die korrigierte Ansicht nach dem Alters-/Inhaltshinweis.
Die Demo bleibt die Küstenroute bis Ending E mit lokalen Rekorden.

## Ursache und Korrektur

Die erste Medaillenreihe lag direkt unter den Zählertexten.
Unter jeder Badge-Beschreibung war außerdem eine feste Zeile für die Zielbuchstaben A–E reserviert.
Diese zusätzliche Zeile wird nur beim Badge für alle fünf Ziele benötigt.

Das Raster beginnt jetzt fünf logische Pixel tiefer; der Reihenabstand beträgt 18 statt 17 Pixel.
Der Detailbereich folgt dem Raster. Status und Fortschritt folgen der tatsächlichen Beschreibungslänge.
Nur der entsprechende Badge erhält die zusätzliche A–E-Zeile.
Trennlinie, Bedienhinweis und Panelhöhe sind auf die neue Verteilung abgestimmt.

## Prüfung

- Die Ansicht wurde vor der Änderung im echten Browser reproduziert.
- Alle 51 Beschreibungen wurden mit der tatsächlichen Bitmap-Schrift vermessen; maximal zwei Zeilen sind nötig.
- Classic und Plus wurden mit kurzen und zweizeiligen Beschreibungen geprüft.
- Gesperrte, verdiente und gezählte Badges sowie A–E mit Fortschrittsbalken wurden sichtbar geprüft.
- Rechts/Abwärts und Zurück führten in beiden Grafikmodi zu den erwarteten Auswahlpositionen und zum Records-Menü.
- Ein Touch-Klick auf die versetzte Zielreihe wählte den richtigen Badge; der Back-Button funktionierte.
- TypeScript und der Windows-Build bestanden.
- Die vollständige portable Testsuite bestand im sauberen Quell-Snapshot.
- Beide nativen Mac-Jobs für den exakten Quell-Commit bestanden TypeScript, vollständige Testsuite, Paketierung, ZIP-/Signaturprüfung und Funktionstests.
- Der native Windows-Test bestand Offline-Spiel, Neustart, lokale Bestenliste und automatischen Ranglisten-Upload über einen lokalen Testdienst.
- Butler akzeptierte den Windows-Start-Eintrag; die Mac-Start-Einträge wurden auf den nativen Runnern geprüft.
- Die unabhängige Prüfung fand keine wichtigen Regressionen. Der Bedienhinweis sitzt nah am unteren Rahmen, bleibt aber lesbar.
- Die Live-Demo zeigte den Altershinweis und anschließend die korrigierten Badges, ohne JavaScript-Fehler und ohne Ranglisten-/Statistikaufrufe.
- 127 Veröffentlichungsdateien stimmen mit den Git-Blobs überein; der Live-JavaScript-Hash stimmt mit dem geprüften Release überein.

Native CI: https://github.com/michaelingokahler-mordor/Velvet-Cruise/actions/runs/41237123982

Der vorhandene lokale Distributionsscan beanstandet weiterhin einen Plattformnamen in einem unversionierten Altersdokument.
Die beiden Altersdokumente blieben unverändert; die Tests wurden nicht abgeschwächt.
Browser- und native Tests nutzten getrennte Testprofile. Es wurden keine produktiven Test-Highscores erzeugt.

## Lieferpakete

Die drei Vollversionen behalten vor dem ersten Verkauf die Versionsnummer 1.0.0.
Die Pakete liegen nach der nativen Prüfung in `D:/Velvet Cruise/Itch/1.0.0`.
Der bisherige Satz ist als `1.0.0-before-badges` gesichert.
Die drei Pakete enthalten denselben kompilierten Spielcode; dessen SHA-256 ist in `delivery-verification.json` vermerkt.
Auch die gleichnamigen ZIPs im Windows- und Mac-Ordner wurden aktualisiert.
Die endgültigen Prüfsummen stehen in `release.json` und `SHA256SUMS.txt` dieses Berichts.
Ein itch.io-Upload wurde durch diese Korrektur nicht ausgeführt.
