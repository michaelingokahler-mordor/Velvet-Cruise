# Browser-Demo: Küstenroute bis Ending E

Die Demo enthält die fünf Küstenetappen bis Twilight Bay (Ending E).
Abzweigungen sind gesperrt. Die Karte und die Streckenrekorde zeigen nur diese fünf Etappen.
Alle drei Schwierigkeitsstufen bleiben verfügbar.

Straßengeometrie, Streckenlänge und Zeitboni entsprechen der Küstenroute der Vollversion.
Die Demo verwendet Classic-Grafik. Plus-Grafik und gemeinsame Online-Ranglisten bleiben gesperrt.
Lokale Rekorde sind verfügbar.

## Bauen und prüfen

```powershell
npm run check
npm test
npm run qa:demo
npm run build:demo
```

`build:demo` erzeugt die Browser-Dateien unter `output/web-demo-e/game`.
Dieser Ordner enthält die `index.html` und alle benötigten Assets.
Der Build erzeugt keine Windows- oder Mac-Demo.
Ein normaler Full-Build behält alle 16 Routen.

Vite setzt die Edition `demo-e` beim Übersetzen.
Routenparameter, Kartenbefehle und Endsequenz-Vorschauen können die Demo nicht auf eine andere Route umstellen.

## Gespeicherte Daten

Die Demo verwendet den Präfix `sunset-coast-run.demo-e`.
Ihre Rekorde und Einstellungen bleiben von der Vollversion und der früheren Route-A-Demo getrennt.
Bestehende Daten beider Fassungen bleiben erhalten.

## Testnachweise

`output/web-demo-e/tests/demo-validation.json` enthält die Ergebnisse der Routenprüfung und der Simulationsfahrten auf allen drei Schwierigkeitsstufen.
Die Prüfung deckt auch Geometrie, Zeitboni, Kartenbegrenzung und unveränderte Full-Routen ab.

`output/playwright/demo-e` enthält die Browser-Prüfung und Bildschirmfotos.
Diese Prüfung verwendet lokale Daten und sendet keine produktiven Highscores oder Statistiken.

Der Build allein ersetzt die veröffentlichte Web-Vollversion nicht.
Manuelle Fahrgefühl- und Gamepad-Tests stehen noch aus.
