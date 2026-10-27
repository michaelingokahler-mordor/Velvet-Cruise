# Tonregler und Reifengeräusche

Die Musik und Effekte sind unter **Settings > Audio** getrennt von 0 bis 100 % einstellbar. **0 % = Aus**. Links/rechts verändert den gewählten Regler in 10-%-Schritten; oben/unten wählt Musik, Effekte oder Back. Touch unterstützt die Regler und die Minus-/Plus-Schaltflächen. Änderungen gelten sofort und werden gespeichert. Vorgaben für Profile ohne Audioeinstellung: Musik 60 %, Effekte 80 %.

Musik 0 % stoppt das laufende Lied. Öffnen des Players, Senderwechsel, nachgeladene Dateien und Rennstart schalten sie nicht wieder ein. Der Player zeigt den ausgeschalteten Zustand mit Verweis auf Audio an. Effekte umfasst Motor, Reifen, Wetter, Sprachsignale, Menütöne und Jingles. Ein stummer Jingle senkt die Musik nicht ab. Wird während eines Jingles dessen Effektlautstärke auf 0 gesetzt, erhält die Musik ihre eingestellte Lautstärke zurück.

Der neue Schlüssel `sunset-coast-run.audio` bzw. `sunset-coast-run.demo-a.audio` hält die Ausgaben getrennt. Senderwahl, Rekorde, Freischaltungen und andere Einstellungen werden nicht überschrieben. Bei beschädigtem oder blockiertem Speicher bleibt die Bedienung in der Sitzung möglich.

## Reifengeräusche

Der bisherige Auslöser konnte bei vollem Einlenken aus der Fahrbahnmitte überhaupt nicht greifen: Nach etwa 0,5 s war das Auto bereits im Sand. Der hörbare Vorlauf beginnt jetzt abhängig von der Lenkstärke nach etwa 0,28–0,5 s. Mindestgeschwindigkeit, kurze Lenkimpulse und die Unterdrückung bei Pause/Unfall/Stillstand bleiben bestehen.

Das Quietschen erhält einen zusätzlichen leisen Gummiton, ein breiteres Rauschband und einen stärkeren Pegel. Die zusätzliche Totzone im Audiokanal entfällt. Randstreifen-Rattern und Sand-Eintritt sind angehoben. Die Musikvorgabe sinkt auf 60 %. Die frühere visuelle Rutschintensität und ihr Zufallsverbrauch bleiben erhalten; der neue Wert `tyreSqueal` beeinflusst ausschließlich den Ton.

## Verifikation

- 11 gezielte Prüfungen für frühes Quietschen, kurze/langsame Lenkimpulse, getrennte gespeicherte Pegel, Demo-Isolation, fehlerhaften Speicher sowie Tastatur-/Touch-Bedienung.
- 20 Schritte der vollständigen `npm run qa:road-effects`-Suite einschließlich TypeScript, Verkehr, Wetter, Grafik, allen Themen und Web-Build. Die bisherigen exakten Routenreferenzen bleiben unverändert.
- Reale Chromium-Prüfung in Classic und Plus: späte Lied-Downloads, Neuladen, Player, Rennstart, Tastatur, Touch und Rückkehr ins Menü. Zusätzlich bestehen die bisherigen Menü- und Road-Effects-Browserprüfungen.
- Reale Web-Audio-Ausgabe: getrennte Stummschaltung, Änderungen während Jingles und laufender Effekte. Achtsekündige Mischungen aller sechs Songs bei beiden Reglern auf 100 % bleiben ohne Clipping (höchster gemessener Peak ca. 0,905).
- Die Regressionen wurden zunächst gegen den alten Stand reproduziert. Eine unabhängige Codeprüfung fand das Absenken der Musik durch stumme Jingles; zwei zusätzliche Audiotests reproduzierten den Fehler und bestehen nach der Korrektur.

Die Gesamtprüfung deckte zusätzlich auf, dass früheres visuelles Rutschen über den gemeinsamen Zufallsgenerator den Verkehr verändert hätte. Die Trennung des Audiowerts behebt die Ursache; die Routenreferenz wurde nicht angepasst.

## Hörproben und Grenzen

`output/audio-controls/browser/driving-before.wav`, `driving-after.wav` und `driving-effects-only.wav` enthalten denselben achtsekündigen Ablauf: Motor, Quietschen ab 1 s, Randstreifen ab 3 s und Sand ab 4,5 s. Die letzte Aufnahme enthält keine Musik. Berichte und Classic-/Plus-Aufnahmen liegen im selben Ordner; die gezielten Prüfungen stehen in `output/audio-controls/validation.json`.

Die technischen Pegel- und Funktionsprüfungen ersetzen keine menschliche Hör-/Fahrabnahme. Physische Geräteabnahme und Veröffentlichung sind nicht erfolgt. Ein nativer automatisierter Start war beim vorherigen Windows-Build durch die Ausführungsrichtlinie blockiert; für dieses Paket wird deshalb keine native Startfreigabe behauptet.
