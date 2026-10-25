# Steigung und NPC-Reaktion auf Hupe/Lichthupe

25. Oktober 2026. Ergänzung zur Wetter-/NPC-Überarbeitung.

## Steigung

Spieler und NPCs lesen die wirkliche Steigung an ihrer jeweiligen Position: Höhenunterschied geteilt durch Fahrstrecke, über acht Segmente geglättet. Eine Steigung von +4 % bedeutet 4 Höheneinheiten pro 100 Streckeneinheiten. Es gibt keine pauschalen Berg-Stage-Abzüge.

Je Prozent Steigung sinkt die zulässige Höchstgeschwindigkeit um 2,5 %. Gefälle erhöht sie entsprechend. Die Wirkung ist auf ±20 % begrenzt. Eine zusätzliche Hangkraft vermindert bergauf die Beschleunigung und verstärkt das Abbremsen beim Ausrollen; bergab wirkt sie umgekehrt. Bremsen bleiben wirksam, im Stillstand gibt es kein Rückwärtsrollen. NPCs verwenden dieselbe Kennlinie und Hangkraft auf jeder Schwierigkeit, mit ihrem eigenen Temporegler, Kurvenlimit und Sicherheitsabstand.

| Fahrbahn | Höchstgeschwindigkeit ohne Wind | Spieler bei Dauervollgas |
| --- | ---: | ---: |
| +8 % und steiler | 80 % | 234,4 km/h |
| +4 % | 90 % | 263,7 km/h |
| +2 % | 95 % | 278,4 km/h |
| Eben | 100 % | 293,0 km/h |
| −2 % | 105 % | 307,7 km/h |
| −4 % | 110 % | 322,3 km/h |
| −8 % und steiler | 120 % | 351,6 km/h |

Die Werte sind erreichbare Grenzen auf einer konstanten, geraden Testfahrbahn; kurze echte Hügel erlauben nicht immer das Erreichen der Grenze. Wind multipliziert diesen Faktor: +4 % Steigung und volle Rückenwindböe ergeben 0,90 × 1,10 = 99 % des flachen Grundlimits. 8 % Gefälle und volle Rückenwindböe erlauben maximal 132 %. Regen, Schnee/Eis und Kurvenkräfte bleiben zusätzlich aktiv.

## Warum die Hupe wenig Wirkung zeigte

H beziehungsweise Y/Dreieck oder L3 erreichte die Spiellogik bereits. Tagsüber wird gehupt, bei Nacht die Lichthupe verwendet. Bei freier Spur dauerte der bisherige Wechsel rund 2,5 Sekunden, bei Schnee rund vier Sekunden. War die Nachbarspur im Moment des Signals belegt, wurde die Anfrage verworfen; eine kurz danach entstehende Lücke blieb ungenutzt.

Der nächstgelegene passende vorausfahrende NPC merkt sich eine Anfrage jetzt sechs Sekunden. Er beginnt frühestens nach 0,18 Sekunden, nutzt eine sichere Nachbarspur und prüft den Weg erneut. Bei zunächst belegter Spur wartet er auf eine Lücke. Ein angenommener Wechsel blinkt gelb am Fahrzeug und erfolgt zügiger als ein gewöhnlicher Spurwechsel. Im trockenen geraden Test ist die ursprüngliche Spur nach etwa 1,5 Sekunden frei, bei Schnee nach etwa zwei bis zweieinhalb Sekunden. Eis und Seitenwind können die Bewegung weiter verzögern. Wiederholtes Hupen startet den Wechsel nicht neu.

Die gesamte Spurwechselbahn und andere reservierte Wechsel bleiben berücksichtigt. Eine inzwischen vom Spieler belegte beziehungsweise gekreuzte Spur wird bei geringem oder sich schließendem Längsabstand nicht gewählt. Nahe Verzweigungen erfolgt weiterhin kein angeforderter Wechsel. Ohne sichere Lücke bleibt der Wagen in seiner Spur; Hupe/Lichthupe garantiert kein freies Überholen.

## Prüfung

- `npm run qa:grade-horn`: 15 Tests mit echten Race-Updates. Zunächst rote Nachweise für fehlende Steigungswirkung, langsame/verlorene Signalreaktion und später belegte Spielerbahn; danach grün. Misst Beschleunigung, Ausrollen, Bremsen, Grenzen, Windkombinationen, lokale NPC-Steigung auf allen drei Schwierigkeiten, freie/später freie/dauerhaft blockierte Spuren, Wiederholung, Fork-Sperre und tatsächlich gerenderte Blinker-Pixel.
- Typecheck, 22 bestehende Wind-/Wetter-/NPC-Tests, acht Signal-/Inputfälle, fünf Garagen-/Dachfälle sowie 40 Höhenprofil- und elf Course-Map-Fälle geprüft.
- Alle 16 Routen auf Leicht, Normal und Schwer automatisch bis zum Ziel gefahren. Startzeit, Checkpoint-Boni, Weglängen und Hindernisse bleiben erhalten; Fahrzeiten ändern sich durch die neue Physik.
- Der frische Produktionsbuild wird mit originaler Electron-Laufzeit, isoliertem Testprofil und echten kompilierten Race-/Renderer-Klassen geprüft. Ein nativer H-Tastendruck erreicht die NPC-Anfrage; Steigungs- und Windkombinationen sowie fünf vollständige Normal-Routen werden dort separat gemessen. Der finale Nachweis steht in `output/grade-horn-2026-10-25/native-validation.json`.
- Unabhängige Codeprüfung: Spielerbahn bei wartender Anfrage als wichtiger Befund reproduziert und korrigiert. Zusätzlich 1.800 simulierte NPC-Merge-Situationen auf 8 % Gefälle mit vollem Eis ohne physische NPC-Überlappung geprüft.

Messdaten und rote/grüne Nachweise: `output/grade-horn-2026-10-25/`. Automatisierte Fahrten sind keine menschliche Fahrgefühl-, Hör- oder physische Gamepad-Prüfung. Einzelne automatisierte Zielfahrten können weiterhin Kollisionen des Testfahrers enthalten.

## Paket und Kompatibilität

Separates vollständiges Windows-Paket: `output/windows/Velvet-Cruise-Windows-2026-10-25-Steigung-Hupe.zip`. Den ganzen Ordner entpacken und dessen `Velvet Cruise.exe` starten. Der alte Ordner `D:\Velvet Cruise\WinExe` und frühere Pakete werden nicht ersetzt.

Vorhandene Garage, Freischaltungen, Dächer, Wetteränderungen und Speicherkennungen sind enthalten. Spielstände und Rekorde werden nicht gelöscht; ältere Rekorde entstanden mit anderer Fahrphysik. Keine Änderungen an Speicherschema oder Ranglistenschlüsseln. Website unverändert; kein Commit/Push.
