# Windows Full und Web-Demo E — 2026-10-31

## Gelieferte Fassungen

- Windows Full: `D:/Velvet Cruise/Windows/Velvet-Cruise-Windows-Full-2026-10-31.zip`.
- Windows-Quellstand: `1c19906ec435a2f3ffb5b55c630e11ba09847c34`.
- Web-Demo: `D:/Velvet Cruise/Web-Demo-Ending-E`.
- Demo-Quellstand: `740f01c` auf `codex/web-demo-ending-e`.

Die Windows-ZIP enthält den aktuellen Full-Build und die eigene Electron-Laufzeit.
Alle ZIP-Einträge stimmen mit den geprüften Paketdateien überein.
Die beiden Laufzeit-Lizenztexte sind enthalten.
`windows-package.json` enthält die SHA-256-Prüfsummen.
Alle 202 Dateien der installierten Windows-Fassung blieben unverändert.

Die Web-Demo enthält ausschließlich die Küstenroute `[0,1,2,3,4]` bis Ending E.
Karte, Streckenrekorde, Menüfahrten und Endsequenz verwenden diese Route.
Die Demo verwendet den eigenen Speicherpräfix `sunset-coast-run.demo-e`.
Full und die frühere Route-A-Demo behalten ihre Daten.
Full behält alle 16 Routen und seine bisherigen Speicherkennungen.

Der Web-Ordner enthält 123 geprüfte Spieldateien und eine zusätzliche `build-info.json`.
Die Dateien stimmen mit dem im Browser geprüften Build überein.
Die Demo verwendet Classic-Grafik und lokale Rekorde.
Gemeinsame Online-Ranglisten und produktive Statistiken bleiben deaktiviert.
Es entstand keine Windows- oder Mac-Demo zum Download.
Die öffentliche Website blieb unverändert.

## Prüfungen

- TypeScript: bestanden.
- Route-E-Test: erwarteter Fehler mit Route A, danach bestanden.
- Simulationsfahrten: Ending E auf Easy, Normal und Hard erreicht.
- Küstengeometrie, Streckenlänge und Zeitboni: gegenüber Full unverändert.
- Full: alle 16 Routen und bisherige Speicherkennungen geprüft.
- Browser: Routenparameter, Kartenbegrenzung, Endsequenz, Plus-Sperre und getrennte Speicherwerte geprüft.
- Browser: keine JavaScript-Fehler und keine externen API-Anfragen.
- Windows-Laufzeit: Offline-Start, gespeicherte Upload-Warteschlange und automatischer Upload nach Neustart bestanden.
- Windows-Laufzeit: gemeinsame Web-/Desktop-Rangliste und getrennte lokale Bestenliste bestanden.
- Vollständiger Testbefehl: 22 Testsuiten im sauberen Quell-Snapshot bestanden.
- Zusätzlich: 18 Freischaltungsprüfungen und 11 Audioprüfungen bestanden.
- Artefaktscan: Windows Full und Web-Demo bestanden.

Der lokale Distributionsscan liest auch unversionierte Dokumente.
`docs/ALTERSEINSTUFUNG_2026-10-31.md` löst dort eine bestehende Namensprüfung aus.
Dieses Dokument und `docs/velvet-cruise-altershinweis.html` blieben unverändert.
Der saubere Snapshot enthält die gleichen Quell- und Testdateien ohne diese beiden lokalen Entwürfe.
Eine Git-Vertrauensausnahme galt ausschließlich für den Test-Unterprozess.
Globale Git-Einstellungen blieben unverändert.

## Unabhängige Prüfung

Die Prüfung fand keinen wichtigen Fehler im Spielverhalten.
Ein Audiotest las noch die alte Demo-Kennung.
Der Fehler wurde reproduziert und korrigiert.
Der Test prüft jetzt zusätzlich, dass alte Demo-Audiowerte erhalten bleiben.
Der vollständige Testbefehl bestand auch nach dieser Korrektur.

Manuelles Fahrgefühl und ein physisches Gamepad wurden nicht geprüft.
Die Windows-ZIP-Integrität wurde separat geprüft.
Eine Live-Veröffentlichung gehörte nicht zum Auftrag.

## Repository-Abgleich

Nach `git fetch origin` stimmten lokaler Mac-Release-Branch und sein Remote-Branch exakt überein.
`main` stand weiterhin auf `410eb9b` und enthielt die jüngeren Release-Commits noch nicht.
Der Demo-Umbau verwendet den neuen Branch `codex/web-demo-ending-e`.
Dieser Branch wird einschließlich der Nachweise auf GitHub gesichert und danach erneut mit dem lokalen Stand verglichen.
`main` bleibt unverändert.
