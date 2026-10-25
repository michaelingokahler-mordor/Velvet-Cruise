# Hupe und Lichthupe unter Windows

23. Oktober 2026 · Build `signal-fix-33f46efab517`

Der bisherige Build nahm im isolierten Windows-Test H und die simulierte Y-Taste an. Der vom Nutzer gemeldete vollständige Ausfall ließ sich damit nicht reproduzieren. Die bisherigen Effekte waren allerdings schwach: Der Hupton klang sofort exponentiell ab, die Lichthupe verstärkte nur den kurzen vorhandenen Lichtkegel, und es gab keine Kontrollanzeige.

Die Spielerhupe hält jetzt einen kräftigen Zweiklang und senkt das Radio kurz ab. Die Lichthupe erzeugt zwei längere, hellere Impulse mit größerer Reichweite. Ein kleines H-Symbol unter der Stimmungsanzeige zeigt die Bereitschaft und bestätigt die Auslösung gelb beziehungsweise blau. Diese Rückmeldung erscheint auch, wenn kein vorausfahrendes Fahrzeug eine freie Nachbarspur findet.

Die Belegung bleibt **H** beziehungsweise **Y/Dreieck**. Zusätzlich funktioniert **L3**, also das Drücken des linken Sticks. Fehlende native Tastencodes erhalten einen H-Ersatz anhand des Tastenzeichens. Nach einem getrennten oder ersetzten Gamepad werden alte gedrückte Tasten zurückgesetzt. Nameingabe, Abklingzeit und die Prüfung sicherer Nachbarspuren bleiben erhalten.

## Prüfung

- `npm run check` und `npm run build`: bestanden.
- `node tools/qa/check-signal-input.mjs`: Tastendruck, Loslassen, Halten, Ersatzcodes, Nameingabe, Y, L3, Wiederverbinden, Austausch, sichere Spurwechsel, beide Lichtimpulse und Kontrollanzeige bestanden.
- `npm run qa:depth`: alle 16 Routen und die fünf vollständigen Zielfahrten bestanden; identische Zeiten und Punkte bei Fahrten ohne Signalbetätigung.
- Ein separater Windows-Test verwendet dieselbe Electron-Laufzeit, den originalen Wrapper und die aktuellen Spieldateien mit einem isolierten Testprofil und unsichtbarem Fenster. Echte native H-Tastaturereignisse und simulierte Standard-Gamepad-Tasten erreichen die Hupe beziehungsweise Lichthupe. Die Hupe erzeugt einen gehaltenen Ton; der Flash-Kegel ist stärker und weiter als das normale Abblendlicht. Aufnahmen und Messwerte stehen unter `output/signal-fix/native-after.json` und `native-after-on.png` / `native-after-off.png`.
- Ein physisches Gamepad, die konkrete Hardware des Nutzers und eine menschliche Hörprobe sind nicht durch diese Tests abgedeckt.

Das vollständige Windows-Paket liegt separat unter `output/windows/Velvet-Cruise-Windows-2026-10-23-Signalfix`. Der vorherige Build bleibt erhalten. Speicherformat, App-Kennung, Fahrphysik und Schwierigkeitswerte ändern sich nicht.

## Schwierigkeit

Die Faktoren beziehen sich auf die jeweilige Stage und den normalen Schwierigkeitsgrad. Zeitwerte werden auf ganze Sekunden gerundet.

| Einstellung | Leicht | Normal | Schwer |
| --- | ---: | ---: | ---: |
| Startzeit und Checkpoint-Zeitbonus | 130 % | 100 % | 85 % |
| Verkehrsdichte | 55 % | 100 % | 150 % |
| Zufällige Spurwechsel der anderen Fahrer | 50 % | 100 % | 170 % |
| Punktefaktor | ×0,5 | ×1 | ×1,5 |

Fahrzeugleistung, Steuerung und Wetterphysik bleiben gleich. Ranglisten, Bestzeiten und Schwierigkeitsabzeichen werden getrennt geführt.
