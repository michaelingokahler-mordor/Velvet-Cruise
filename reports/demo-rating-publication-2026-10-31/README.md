# Demo-Hinweis und Veröffentlichung — 2026-10-31

Die veröffentlichte Webfassung ist jetzt die Küsten-Demo bis Ending E.

- [Spielinformation](https://sabnockworks.com/games/velvet-cruise/)
- [Demo direkt starten](https://sabnockworks.com/games/more-projects/velvet-cruise/)
- Spielcode: `bcf1e5baa3f6ee2e04a696d425d3c4c710936afa`.
- Website-Veröffentlichung: `ef1f52e98d831c8e1631e45fa8fcbfb5669732da`.
- Weiterleitungen älterer Startseiten: `e41a21bfb010facff1d443e7b570983bc42709f5`.
- Release: `2026-10-31-demo-e-rating-DR5aNprM`.

## Verhalten

Vor dem Spielstart erscheint der vom Nutzer vorgegebene Hinweis:

**Ages 6 and up — classification by SabnockWorks**

Mild language · Cartoon crashes · Time pressure

Der Button heißt `Play the Demo`.
Maus, Touch, Enter, Leertaste und die übliche Gamepad-Bestätigung sind verfügbar.
Der Start wartet auch bei gemischten Eingaben auf das Loslassen aller erfassten Bestätigungstasten.
Der Dialog erscheint bei jedem neuen Seitenaufruf, auch bei Direktlinks und Routenparametern.
Innerhalb derselben Spielsitzung wiederholt er sich nicht.
Spiel, Dienste und Ton starten erst nach Bestätigung.
Die Demo verwendet lokale Rekorde und keine gemeinsamen Online-Ranglisten.

Die Homepage, Spielinformation und ältere Sammelseite unterscheiden Demo und Vollversion.
Die Vollversion für Windows und Mac trägt `Soon available`.
Such- und Vorschaubeschreibungen sowie `llms.txt` verwenden dieselbe Aufteilung.
Die Verfügbarkeit der anderen Spiele bleibt unverändert.

Sieben ältere Full-Startseiten leiten auf die aktuelle Demo weiter.
Ihre Grafik-, Audio- und Skriptdateien bleiben für bereits geladene Sitzungen erhalten.
Die lokale Demo unter `D:/Velvet Cruise/Web-Demo-Ending-E` wurde ebenfalls aktualisiert.

## Prüfung

- TypeScript und Demo-Build bestanden.
- 22 Testsuiten im sauberen Quell-Snapshot bestanden, auch nach der Eingabekorrektur.
- Live-Startdialog: zehn Prüfungen bestanden, einschließlich gemischter Eingaben, Neuladen und kleiner Ansichten.
- Live-Demo: sieben Routen-, Karten-, Endsequenz-, Grafik- und Speicherprüfungen bestanden.
- Live-Information/Homepage: vier Text- und Linkprüfungen bestanden.
- Website-Prüfung: Galerie, Tastaturfahrt und Touchfahrt ohne JavaScript- oder Assetfehler bestanden.
- Alle 125 Release-Dateien stimmten vor dem Push mit den Git-Blobs überein.
- Die live geladenen JavaScript- und CSS-Dateien stimmen mit ihren SHA-256-Prüfsummen überein.
- Die Browserprüfungen sendeten keine Test-Highscores oder Spielstatistiken an den produktiven Dienst.

Der vorhandene lokale Distributionsscan liest auch unversionierte Dokumente.
Ein Plattformname in `docs/ALTERSEINSTUFUNG_2026-10-31.md` löst weiterhin seine Namensprüfung aus.
Die beiden lokalen Altersdokumente blieben unverändert.
Der saubere Snapshot prüft die gleichen Spiel- und Testdateien ohne diese Entwürfe.

## Unabhängige Prüfung und Grenzen

Die unabhängige Prüfung fand zwei wichtige Punkte vor der Veröffentlichung.
Gemischte Eingaben konnten noch eine gehaltene Bestätigung an das Spiel weitergeben.
Ein Regressionstest zeigte den Fehler und besteht nach der Korrektur.
Die versehentlich geänderte Emerald-Hollows-Verfügbarkeit wurde wiederhergestellt.
Ein Vergleich bestätigt, dass dessen Homepage-Karte unverändert blieb.
Die Veröffentlichungsanleitung nennt jetzt die Demo und warnt vor dem historischen Full-Updater.

Gamepad-Eingaben und mobile Ansichten wurden im Browser simuliert.
Ein physisches Gamepad und ein Screenreader wurden nicht praktisch geprüft.
Die Einstufung selbst stammt vom Nutzer.

Für den Verkaufsstart fehlen noch die Shop-Links und die Preisangabe auf den Angeboten.
