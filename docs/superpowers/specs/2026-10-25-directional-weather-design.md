# Richtungswind und wetterabhängiger Verkehr

## Auftrag und bestätigte Werte

Der Nutzer möchte spürbareres Wetter, umlaufende zufällige Böen und NPCs, die bei schlechtem Wetter vorsichtiger fahren und auf die Kräfte reagieren. Die Höchstgeschwindigkeitsänderung von ±10 % wurde ausdrücklich ausgewählt.

- Regen bleibt bei +15 / +21 / +25 %, Schnee bei +10 / +15 / +20 % Kurvenzug.
- Eis multipliziert den Schneezustand mit 2 / 2,1 / 2,2. Auf vollem Eis ergibt das gegenüber trocken 2,20 / 2,415 / 2,64.
- Eine reine Seitenböe von 1,70774 Sekunden erzeugt bei 234 km/h ohne Gegenlenken ungefähr 1 / 1,45 / 1,85 Spuren Versatz. Andere Winkel und Dauern ergeben proportional andere Werte.
- Böenrichtungen werden über 360 Grad zufällig gewählt. Ein weicher Kraftverlauf blendet zwischen Böen aus; sichtbarer Sand verwendet denselben Windvektor.
- Gegenwind senkt, Rückenwind hebt das Maximaltempo um bis zu 10 %. Rückenwind verstärkt zusätzlich den Kurvenkraftfaktor um bis zu 25 %, entsprechend der momentanen Böenstärke.
- Wind gilt zunächst in der Sandsturm-Stage. Wetter- und Tunnelübergänge werden berücksichtigt.
- NPCs verwenden in jeder Schwierigkeit Easy-Wetterkräfte. Sie bleiben auf der Straße und halten Abstand. Wetter wird an ihrer eigenen Position gelesen.

## Gewählter Ansatz und Alternativen

Gewählt wird der Ausbau des vorhandenen Arcade-Fahrmodells mit einem gemeinsamen Windvektor, einer lokalen Wetterabfrage und einem begrenzten NPC-Spurregler. Eine vollständige Fahrzeug-/Unfallsimulation wäre für den gewünschten vorsichtigen Verkehr unnötig. Nur das NPC-Tempo abzusenken würde die ausdrücklich gewünschten Wind- und Eiseinflüsse nicht abdecken.

## Ausgestaltung durch den Implementierer

- Böen behalten den bisherigen Dauerbereich 1,2–2,0 Sekunden und Pausen von 2,4–5,6 Sekunden. Ein eigener Zufallsstrom verhindert, dass Partikel oder Verkehr den Böenverlauf verändern.
- NPC-Tempoabschläge: Regen 8 %, Schnee 12 %, Eis 25 %, Nebel 20 %, Sand 15 %, Dunkelheit 10 %. Es gilt der stärkste örtliche Abschlag. Wind-Tempoänderung kommt als gerichteter Effekt dazu.
- Größere Folgeabstände und weniger/langsamere Spurwechsel bei schlechten Bedingungen. Bei starkem Kurvenzug zusätzlich vor der Kurve bremsen.
- Bei schlechtem Wetter/Dunkelheit bevorzugt langsamer Verkehr die rechten drei Spuren und räumt die linke Überholspur bei sicherer Gelegenheit. Diese im Gesamttest ergänzte Spurdisziplin verhindert rollende Blockaden bei unveränderter Rennuhr.
- Licht an für NPCs bei Regen, Schnee, Nebel und Sand; individuelle Schaltschwellen gelten weiterhin bei gewöhnlicher Dämmerung.
- Die bestehenden Speicherkennungen, Freischaltungen, Fahrzeug-/Verdeckfunktionen, Routengeometrie und Zeitboni bleiben erhalten. Kein automatischer Commit, Push oder Veröffentlichen.

## Abnahme

Bewegungstests für Schnee×Eis, Seitenwind bei mehreren Geschwindigkeiten, Gegen-/Rückenwind und Kurvenkraft; Tests der tatsächlichen Sandzeichnung in allen Hauptrichtungen und bei Windstille; NPC-Tests für eigene Wetterposition, Easy-Wirkung auf allen Schwierigkeiten, weniger Tempo, Abstand und Verbleib auf der Straße. Danach 48 Routenfahrten, Typprüfung, Build und Windows-Laufzeitprüfung mit isoliertem Profil. Menschliches Fahrgefühl und physischer Controller bleiben gesonderte Prüfungen.
