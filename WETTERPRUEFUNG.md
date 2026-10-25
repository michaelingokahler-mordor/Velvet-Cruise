# Wetter, Richtungswind und NPC-Verkehr

25. Oktober 2026. Aktueller lokaler Spielstand einschließlich der vorhandenen Höhen-, Karten-, Garagen- und Verdeckfunktionen.

## Eis multipliziert den Schneeeffekt

| Kurvenkraft relativ zu trocken bei gleicher Geschwindigkeit und Schwierigkeit | Easy | Normal | Hard |
| --- | ---: | ---: | ---: |
| Regen | ×1,15 | ×1,21 | ×1,25 |
| Schnee ohne Eis | ×1,10 | ×1,15 | ×1,20 |
| Zusätzlicher Eismultiplikator | ×2,0 | ×2,1 | ×2,2 |
| Schnee und volles Eis zusammen | **×2,20** | **×2,415** | **×2,64** |

Normal ergibt beispielsweise `1,15 × 2,1 = 2,415`. Damit ist die gesamte Eis-Kurvenkraft stärker als vor der ersten Wetterabstimmung (×2,1025 / ×2,33 / ×2,4925). Der Zwischenstand hatte den Eismultiplikator fälschlich als Gesamtfaktor gegenüber trocken ausgelegt.

Örtliche Eisflächen, geglättete Ein-/Ausläufe, Eis-Bremswirkung und Lenknachlauf bleiben erhalten. Testfahrer und Spieler verwenden dieselbe Kraftberechnung. Manuelle Spielereingaben erhalten keine Fahrhilfe.

## Stärkere Böen aus allen Richtungen

| Kontrollböe: 1,70774 Sekunden, reiner Seitenwind, kein Gegenlenken | Easy | Normal | Hard |
| --- | ---: | ---: | ---: |
| Versatz bei 234 km/h | 1,0002 Spuren | 1,4503 Spuren | 1,8503 Spuren |
| Versatz bei 59 km/h | 0,5001 Spuren | 0,7251 Spuren | 0,9252 Spuren |

Die Straße hat vier Spuren. Die Tabelle beschreibt die reproduzierbare Referenzböe bei festgehaltener Messposition und Geschwindigkeit. Andere Dauer und Winkel ergeben proportional andere Werte.

- Zufällig gewählte Richtungen über 360 Grad. Ein eigener Zufallsstrom hält den Verlauf unabhängig von Verkehr und kosmetischen Partikeln.
- Dauer 1,2–2,0 Sekunden, Pausen 2,4–5,6 Sekunden; jede Böe klingt weich an und ab.
- Maximaler Gegenwind: Höchstgeschwindigkeit **−10 %**, ungefähr 264 statt 293 km/h.
- Maximaler Rückenwind: Höchstgeschwindigkeit **+10 %**, ungefähr 322 km/h. Das höhere Tempo ist tatsächlich erreichbar.
- Während Rückenwind steigt zusätzlich der Kurvenkraftfaktor um bis zu **25 %**. Die ohnehin geschwindigkeitsabhängige Kurvenkraft kommt dazu.
- Schräge Böen kombinieren Seiten- und Längswirkung mit entsprechend geringeren Einzelkomponenten.
- Wind gilt in der Sandsturm-Stage, endet mit Böe/Wetterübergang und wirkt nicht in Tunneln.

Sandzeichnung, Fahrkraft und Windton folgen demselben Vektor beziehungsweise derselben Stärke. Gegenwind spreizt die Sandbewegung vom Horizont zum Fahrer, Rückenwind zieht sie zum Horizont, Seitenwind bewegt sie quer. In Böenpausen gibt es keine künstliche Linksbewegung mehr. Sechs bewegte Beispiele des echten Spielzeichners: `output/directional-weather-2026-10-25/gallery/index.html`.

## Vorsichtige NPCs

NPCs verwenden auf allen Schwierigkeiten die Wetterkräfte von **Easy**: Regenfaktor 1,15, Schneefaktor 1,10, Schnee mit Eis 2,20 sowie Easy-Wind. Verkehrsdichte und Grundhäufigkeit der Spurwechsel bleiben an die gewählte Schwierigkeit gebunden. Wetter, Dunkelheit, Wind und Eis werden an der eigenen Position jedes NPCs gelesen.

| Bedingung | Maximaler Abschlag vom örtlichen NPC-Wunschtempo |
| --- | ---: |
| Regen | 8 % |
| Schnee | 12 % |
| Eis | 25 % |
| Nebel | 20 % |
| Sandsturm | 15 % |
| Dunkelheit | 10 %, entsprechend dem Dunkelheitswert |

Es gilt der stärkste Abschlag. Diese Werte sind erste Abstimmungsentscheidungen des Implementierers. Gerichteter Wind verändert das mögliche Tempo zusätzlich. NPCs bremsen vor schwierigen Kurven früher, halten bei schlechten Bedingungen mehr Abstand und wechseln seltener/langsamer die Spur.

Eine begrenzte Spurregelung reagiert auf Kurvenkraft, Wind und Eisnachlauf. Straßenbegrenzung, Folgeabstand und reservierte Wechselwege verhindern unbeabsichtigtes Verlassen der Fahrbahn und gleichzeitiges Einscheren zweier Fahrzeuge in denselben Raum. Die im Review reproduzierte Überlappung zweier LKW ist durch einen Bewegungstest abgesichert.

Langsamer Verkehr bevorzugt bei schlechtem Wetter und Dunkelheit die rechten drei Spuren. Fahrzeuge auf der linken Überholspur wechseln nach rechts, sobald dies sicher möglich ist. In Gabelungen bleibt die bestehende Straßenbindung erhalten.

Der automatische Demo-/Testfahrer berücksichtigt langsameren Verkehr beim Überholen und Bremsen, nutzt sichere Signalanfragen und vergleicht Fahrzeuge in Gabelungen in der richtigen Straßenkoordinate. Diese Regelung wird nicht auf menschliche Eingaben angewendet.

## NPC-Beleuchtung

Bei Regen, Schnee, Nebel und Sand schalten alle NPCs Scheinwerfer und Rücklichter ein. Gewöhnliche Dämmerung behält individuelle Einschaltschwellen. Der tatsächliche Zeichner wurde mit 200 gleichmäßig verteilten Schwellen je Bedingung geprüft: Tag 0 %, Nacht 100 %, dunkler Crystal Lake 100 %, Regen 100 %, Nebel 100 %, Schnee 100 %. Alle 13 NPC-Typen besitzen funktionierende Rücklichtmasken.

## Prüfung und Lieferung

- `node tools/qa/check-weather.mjs`: reale Bewegung für Wetter-/Eisfaktoren und Referenzböe, niedriges Tempo, tatsächliche NPC-Lichtzeichnung und Böenpause.
- `node tools/qa/check-directional-weather.mjs`: 22 Prüfungen für Richtungswind, Tempogrenzen, Partikel, lokale NPC-Kräfte, Easy-Niveau, Tempo, Abstand, Straßenbegrenzung, LKW-Spurwechsel und Testfahrerregressionen bestehen.
- `npm run qa:balance`: **48 von 48** Routenfahrten erreichen das Ziel. Straßen, Zeitboni und Speicherdaten bleiben erhalten. Der Testfahrer hat auf Normal 26,33–41,42 Sekunden und auf Hard 22,58–40,95 Sekunden Restzeit. Dies ist keine menschliche Fahrzeitmessung.
- Typprüfung, Garagen-/Verdeckprüfung, Eingabe-/Signalprüfungen und frischer Vite-Build bestehen.
- Windows-Electron-Prüfung des kompilierten Builds `directional-weather-20261025-0c9a4ecd046e`: Seitenwind 1,45027 Spuren auf Normal, Tempogrenzen 0,90 / 1,10, Rückenwind-Kurvenfaktor 1,25, NPC-Schneelicht und fünf vollständige Fahrten zu allen fünf Zielen bestehen ohne Konsolenfehler.
- Daten, rote/grüne Testläufe, Videos und Laufzeitnachweise: `output/directional-weather-2026-10-25`. Bewegungs-/Lichtdaten zusätzlich: `output/weather-2026-10-25/after.json`.

Der separate Windows-Spielbuild verwendet den ursprünglichen Laufzeitkern und den geprüften neuen Spielinhalt. Vorhandene Builds und Spielerprofile werden nicht ersetzt. Keine Veröffentlichung, kein Commit, kein Push. Menschliches Fahrgefühl, kontinuierliche audiovisuelle Abnahme und ein physischer Controller bleiben offen.
