# Windows-Demo: Route A

Die Demo verwendet die aktuelle Extended-Tour-Fassung und erlaubt genau eine
Route: Palm Cove → Thunder Highway → Painted Desert → Death Valley → Neon City.
Sie endet regulär bei Ziel A, einschließlich der Neon-City-Zielsequenz.

Die Straße verzweigt sich nicht. Die Kurven, Höhen, Tunnel, zusätzliche Kurve
und Gerade pro Stage, Streckenlänge und Zeitboni der vollständigen Route A
bleiben erhalten. Alle drei Schwierigkeitsstufen, Fahrzeuge und Radiosender
sind verfügbar. Karte, Streckenrekorde und automatische Menüfahrten zeigen
ausschließlich die fünf Demo-Stages.

## Bauen und prüfen

```powershell
npm run check
npm run qa:demo
npm run build:demo
```

`build:demo` erzeugt den Spielinhalt unter `output/demo-a/desktop-game`.
Vite setzt die Edition beim Übersetzen mit `--mode demo`. Ein normaler Build
bleibt die Vollversion mit 16 Routen. URL-Parameter und Abzweigbefehle können
die Demo nicht auf eine andere Route umstellen.

Die Desktop-Kennung lautet `game-20261009-93986676-demo-a`. Zusätzlich verwenden
alle lokalen Speicherwerte den Präfix `sunset-coast-run.demo-a`. Einstellungen,
Bestzeiten, Highscores und Abzeichen der Vollversion bleiben erhalten.
Die Demo speichert ihre Rekorde lokal und nutzt keine Online-Ranglisten.

## Windows-Paket und Testnachweise

Paket: `output/windows/Velvet-Cruise-Demo-A-Windows-2026-10-23`.
Startdatei: `Velvet Cruise Demo.exe`. Das gesamte Verzeichnis wird benötigt.
Das ZIP enthält den vollständigen Windows-Laufzeitordner und den neuen
Spielinhalt. Die vorhandene Vollversion wird nicht ersetzt.

- `output/demo-a/demo-validation.json`: Routensperre, keine Abzweigschilder,
  unveränderte Straßengeometrie und Zeitboni, getrennte Rekorde, 16 weiterhin
  erreichbare Vollversionsrouten sowie komplette Simulationsfahrten auf allen
  drei Schwierigkeitsstufen.
- `output/demo-a/native-validation.json`: drei vollständige Fahrten durch die
  Windows-Laufzeit mit echtem Tastatur-Menüinput, einschließlich Versuchen mit
  drei abweichenden Routenparametern. Alle enden bei Ziel A. Karte und
  Zielsequenz wurden zusätzlich als Bilder geprüft.
- `output/windows/windows-demo-a-verification.json`: Spielmanifest, native
  Laufzeitdateien, Paketprüfsummen und Integrität sämtlicher ZIP-Einträge.

Die automatisierten Fahrten ersetzen keinen manuellen Fahrgefühltest und
keinen Test mit einem physischen Gamepad.
