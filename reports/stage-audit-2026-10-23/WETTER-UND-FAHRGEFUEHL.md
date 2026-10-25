# Wetter, Fahrphysik und faire Wahrnehmbarkeit – Teilanalyse aller 15 Stages

Stand: 23. Oktober 2026. Diese Analyse beschreibt den aktuellen Quellcode. Es wurden keine Spieldateien verändert. Die zusätzlichen Inventuren und Ein-Tick-Proben liegen ausschließlich in `output/stage-audit/`. Die Empfehlungen sind neue Entwurfsentscheidungen für das gewünschte Arcadegefühl; sie sind keine Behauptung über eine historisch exakte Out-Run-Physik.

## Ergebnis

Regen, Schnee/Eis und Sandsturm beeinflussen das Auto bereits. Nebel, Hitze und Nacht verändern Sicht und Darstellung, aber nicht unmittelbar die Fahrphysik. Das ist grundsätzlich ein passender Ansatz: Wenige merkbare Regeln statt eines Fahrsimulators. Der größte Bedarf liegt in der Ankündigung und Abstimmung bereits vorhandener Wirkungen, besonders der Eisflächen und Sandböen. Zusätzliche Strafen für Hitze oder Dunkelheit würden dem Spiel derzeit wenig helfen.

Wichtig ist die sprachliche Genauigkeit: Regen senkt nicht pauschal den Grip um 16 Prozent. Der Code verstärkt ausschließlich den äußeren Zug einer Kurve um 16 Prozent. Die direkte Lenkstärke, Beschleunigung und normale Bremskraft bleiben bei Regen gleich. Bei Schnee sind es zunächst 10 Prozent mehr Kurvenzug; örtliche Eisflächen greifen deutlich stärker ein.

## Beleggrundlage und Prüfgrenzen

- Physik: [race.ts](<D:/Velvet Cruise/Code/src/game/race.ts:511>), [Konstanten](<D:/Velvet Cruise/Code/src/game/config.ts:19>), [Eisplatzierung](<D:/Velvet Cruise/Code/src/game/track.ts:433>), [Wetterstärken](<D:/Velvet Cruise/Code/src/game/race.ts:315>).
- Sicht und Wettereffekte: [render.ts](<D:/Velvet Cruise/Code/src/game/render.ts:401>) und [Wetterzeichnung](<D:/Velvet Cruise/Code/src/game/render.ts:494>).
- Stagekonfiguration: [themes.ts](<D:/Velvet Cruise/Code/src/game/themes.ts:86>).
- Ankündigungen: [Routenpanel](<D:/Velvet Cruise/Code/src/game/ui.ts:11>), [Beifahrerin und Eiswarnung](<D:/Velvet Cruise/Code/src/main.ts:990>).
- Zusätzliche Daten: [weather-probe.json](<nachweise/wetterproben.json>), erzeugt durch [weather-probe.mjs](<D:/Velvet Cruise/Code/output/stage-audit/weather-probe.mjs>). Alle 16 legalen kompletten Routen wurden gebaut und auf Eisflächen inventarisiert. Ein-Tick-Proben mit gezielt im Arbeitsspeicher vereinheitlichter Straße prüfen die einzelnen Kräfte. Diese Proben messen keine menschliche Beherrschbarkeit, native Windows-Bildrate oder Tastatur-/Gamepad-Ergonomie.

Die Quellanalyse belegt, dass Warnungen und Effekte existieren. Ob ein konkretes Schild im Fahren früh genug lesbar ist, muss mit der endgültigen Kamerasicht geprüft werden. Eine bestandene automatische Fahrt allein beweist diese Lesbarkeit nicht.

## Was das Fahrmodell tatsächlich macht

### Grundmodell

`playerX` wird in Fahrbahnhalbbreiten gemessen. Die Fahrbahn reicht ungefähr von −1 bis +1. Die vier Fahrstreifen haben somit je ungefähr 0,5 dieser Einheiten. Maximaltempo sind 293 km/h; intern 92 Streckensegmente pro Sekunde. Die folgenden Formeln verwenden den Tempoanteil `sp = speed / MAX_SPEED`.

Auf trockener Straße beträgt der seitliche Grundimpuls pro Sekunde:

`Lenkeingabe × 2,3 × min(1; sp × 2,2) − sp² × Kurvenwert × 0,48`.

Die direkte Lenkung erreicht ihre volle Stärke ab etwa 45,5 Prozent Maximaltempo, also ungefähr 133 km/h. Der Kurvenzug wächst dagegen quadratisch mit dem Tempo. Das entspricht einem gut verständlichen Arcadeprinzip: Gas lupfen oder kurz bremsen hilft erheblich in einer engen Kurve. Die Straße enthält Kurven bis zum Wert 4,6; der Wert ist eine Spielkonstante, kein Radius in Metern. Quelle: [config.ts:19](<D:/Velvet Cruise/Code/src/game/config.ts:19>), [race.ts:511](<D:/Velvet Cruise/Code/src/game/race.ts:511>), [track.ts:251](<D:/Velvet Cruise/Code/src/game/track.ts:251>).

Die sichtbaren Steigungen ändern die Höhenposition des Autos, lösen in der Geschwindigkeit aber keinen eigenen Hangabtrieb, Sprung oder wetterabhängigen Bergab-Effekt aus. Die Wetterthemen ändern ebenso wenig die Höchstgeschwindigkeit. Alle vier wählbaren Autos haben dieselbe Physik; die Auswahl ist grafisch. Quelle: [race.ts:526](<D:/Velvet Cruise/Code/src/game/race.ts:526>), [race.ts:583](<D:/Velvet Cruise/Code/src/game/race.ts:583>), [cars.ts:1](<D:/Velvet Cruise/Code/src/game/cars.ts:1>).

### Regen – Thunder Highway

Bei voller Regenstärke wird der Kurvenzug mit **1,16** multipliziert. Bei gleichem Tempo und gleicher Kurve benötigt der Fahrer etwas mehr Gegenlenken. Beispiel einer Ein-Tick-Probe bei Maximaltempo, Kurvenwert 1 und neutralem Lenkrad: trocken −0,480 Fahrbahnhalbbreiten/s, Regen −0,5568. Die Beschleunigung und Verzögerung waren dabei gleich. Bremsweg, direkte Lenkstärke und Top-Speed ändern sich durch Regen allein nicht.

Die Wirkung ist klein genug für das Arcadeprofil, kann aber in den schärfsten Kurven bereits eine kurze Tempokorrektur erfordern: Bei Kurvenwert 4,6 wäre für stationäres Halten bei Maximaltempo rechnerisch eine Lenkeingabe größer als 1 erforderlich. Rund 95 Prozent des Maximaltempos reichen im vereinfachten stationären Modell. Das ist eine Rechnung aus den Kräften, kein vorgeschriebenes Ideallinientempo.

Der Regen wird mit schrägen Tropfen, Spritzern, Reifengischt, vereinzelten Blitzen, Donner, dunklerer Palette und dichterem Fernhorizont vermittelt. Die Tropfenrichtung reagiert auf die Lenkung. Sie belegt keinen eigenständigen Seitenwind: Auf Thunder Highway gibt es aktuell **keinen Windstoß auf das Auto**. Blitze ändern keine Kraft. Quellen: [race.ts:516](<D:/Velvet Cruise/Code/src/game/race.ts:516>), [render.ts:595](<D:/Velvet Cruise/Code/src/game/render.ts:595>), [race.ts:807](<D:/Velvet Cruise/Code/src/game/race.ts:807>).

Grafischer Prüfpunkt: Die Regenspritzer werden in einem Bildkegel um die Bildschirmmitte erzeugt, nicht anhand der tatsächlich projizierten Asphaltfläche. In starken Kurven können sie daher auf unpassenden Bildflächen liegen. Die nahen Reifengischtformen bestehen aus großen halbtransparenten Rechtecken. Beides sind konkrete Kandidaten für eine glaubwürdigere, ruhigere Pixelzeichnung: auf sichtbaren Asphalt begrenzte Spritzer und gestufte kleine Gischtcluster.

### Schnee und örtliches Eis – Snowcap Pass

Schneefall allein erhöht den Kurvenzug um **10 Prozent**. Er senkt die direkte Lenkstärke und normale Bremskraft noch nicht. Zusätzlich erzeugt die Strecke echte Eisfelder, deren laterale Grenzen ausweichbar sein können.

Auf Eis kommen drei Wirkungen zusammen:

1. Der Kurvenmultiplikator steigt zusätzlich um `1,1 × iceAmt`. Bei voller Schnee- und Eisstärke ergibt sich **2,2 statt 1,0**. Das ist 120 Prozent mehr äußere Kurvenkraft als bei trockener Straße.
2. Die Reaktion geht in eine gespeicherte Seitenbewegung über. Deren Annäherung sinkt von 16/s auf 1,4/s. Bei vollem Eis folgt das Auto dem aktuellen Impuls damit deutlich verzögert. Geradeausfahrt ohne seitliche Vorgeschichte erzeugt nicht automatisch zufälliges Rutschen; vorheriges Lenken oder Kurvenzug wirken nach.
3. Bremsen ohne gleichzeitiges Gas wirkt bei vollem Eis nur mit **45 Prozent** der normalen Bremskraft. Eine konstante Vollvereisung würde den idealisierten Bremsweg etwa auf das 2,22-Fache erhöhen. Tatsächlich sind die Flächen kurz, die Eisstärke ist geglättet, und das Auto kann die Fläche verlassen; daher ist das kein gemessener realer Bremsweg durch eine Stage.

Das Auto nimmt Eis zügig an (`9/s`) und verliert die Eiswirkung etwas langsamer (`5/s`). Der Kollisions-/Kontaktbereich ist jeweils um 0,08 Fahrbahnhalbbreiten über die gezeichneten seitlichen Feldgrenzen erweitert. Ab `iceAmt > 0,3` erscheint die kurze HUD-Meldung „Icy patch!“; die Beifahrerin kann zusätzlich reagieren. Diese Meldung kommt **nach Beginn des Rutschens** und ersetzt keine Vorwarnung. Quellen: [race.ts:513](<D:/Velvet Cruise/Code/src/game/race.ts:513>), [race.ts:530](<D:/Velvet Cruise/Code/src/game/race.ts:530>), [main.ts:1005](<D:/Velvet Cruise/Code/src/main.ts:1005>).

Die Flächen sind deterministisch erzeugt. Vorgesehen sind 70–119 Segmente pro Feld. Typen: volle Breite −1,15…+1,15 (30 Prozent Ziehungswahrscheinlichkeit), linke Teilfläche (22 Prozent), rechte Teilfläche (22 Prozent), mittlere Fläche −0,55…+0,55 (26 Prozent). Die Wahrscheinlichkeiten sind Entwurfswerte des Generators, keine Behauptung über die Verteilung einer einzelnen Fahrt. Die Intensität steigt und fällt über rund zehn Segmente. Gabelungen, Tore und Tunnel werden gemieden; die Kurvenstärke wird bei der Platzierung hingegen nicht geprüft. Quelle: [track.ts:433](<D:/Velvet Cruise/Code/src/game/track.ts:433>).

Die aktuelle Inventur aller 16 Routen bestätigt: Snowcap wird auf sechs Routen erreicht. Jede dieser Routen enthält **12 Eisfelder mit insgesamt 1019 vereisten Segmenten**, davon vier über die ganze Fahrbahn. Die konkreten Felder sind 70–104 Segmente lang. Die Ortsindizes verschieben sich mit der Vorgeschichte, die Feldfolge und Kurvenüberlagerung sind in dieser Inventur gleich. Keine Eisfläche lag in einer Gabelung, einem Tunnel oder auf einem Tor.

Ein links teilvereistes Feld (−1,15…+0,2) erreicht eine Kurvenstärke von 4,6; rechts bleibt eine griffige Teilspur. Die vollbreiten Felder erreichen maximal Kurvenwert 3,1. Im ungünstigsten inventarisierten Punkt erfordert das stationäre Halten bei Maximaltempo rechnerisch ungefähr 1,97-faches maximales Gegenlenken. Im entsprechenden vereinfachten Modell liegt die Temposchwelle bei rund **71 Prozent = 209 km/h**. Wegen Nachlauf, Vorpositionierung und begrenzter Feldlänge kann eine echte Fahrt anders verlaufen. Dieser Befund rechtfertigt eine gezielte Spielprobe und eine Kombination aus Kurven- und Eiswarnung; er rechtfertigt keine weitere pauschale Gripabsenkung.

Die Vorwarnung ist bereits konkreter als bei den anderen Wetterarten: je ein Eisschild links/rechts **110 Segmente vorher**, dazu rechts **55 Segmente vorher**. Bei Maximaltempo liegen zwischen dem Passieren dieser Schilder und dem Feld ungefähr **1,20 bzw. 0,60 Sekunden**. Die Schilder können vorher schon sichtbar werden; die Lesbarkeit und Hügelverdeckung bestimmen die tatsächlich nutzbare Reaktionszeit. Eine Zeitanforderung sollte deshalb vom ersten klar erkennbaren Schild aus gemessen werden.

Zusätzlich ist die linke Schildposition zu prüfen: Die Eisplatzierung begrenzt sie an der Wand und kann dabei die normale Hindernisfreihaltung von 0,22 Fahrbahnhalbbreiten aufheben. Für die Route `0,5,8,11,13` bestätigt eine Inventur 36 Eisschilder und am engsten linken Schild die innere Kollisionskante bei 1,17843; die für Platzierung verwendete Randkante liegt bei 1,18. Der kleine Überstand ist weniger wesentlich als die fehlende Auslauflücke. Ein Warnschild vor Glätte sollte die Rückkehr aus einer Rutschbewegung nicht zusätzlich erschweren. Quellen: [track.ts:460](<D:/Velvet Cruise/Code/src/game/track.ts:460>), [clearance](<D:/Velvet Cruise/Code/src/game/track.ts:422>).

Kleine technische Inkonsistenz: Gleichzeitiges Gas und Bremse verwendet eine eigene pauschale Bremsstrafe ohne den Eisfaktor. Ein-Tick-Proben bestätigen identische Verzögerung beider Pedale auf trockener Straße und vollem Eis; reines Bremsen hat dagegen korrekt nur 45 Prozent Wirkung. Bei einer späteren Physikabstimmung sollte dieser Sonderfall geklärt werden, damit bewusstes Bremsen nicht unbeabsichtigt schlechter als die Pedalkombination ist. Quelle: [race.ts:529](<D:/Velvet Cruise/Code/src/game/race.ts:529>).

### Sandsturm und echter Seitenwind – Painted Desert

Nur `weather: sand` speist die Böenkraft. Windmühlen, Haare, schräger Regen oder seitlich wandernde Schneeflocken sind keine weiteren physikalischen Windquellen.

Die Böe hat eine Sinushüllkurve, eine zufällig gewählte Richtung und dauert **1,2–2,0 Sekunden**; zwischen Böen liegen **2,4–5,6 Sekunden**. Der maximale seitliche Zusatz ist **0,46 Fahrbahnhalbbreiten/s** bei voller Wetterstärke. Unter 40 Prozent Maximaltempo wird die Wirkung proportional schwächer; ab etwa 117 km/h gilt schon die volle Kraft. Eine vollständige unkorrigierte Böe verschiebt das Auto bei ausreichendem Tempo rechnerisch um **0,35–0,59 Fahrbahnhalbbreiten**, also ungefähr **0,70–1,17 Fahrstreifen**. Zum Gegenhalten auf gerader Straße genügt theoretisch etwa 20 Prozent der vollen Lenkung. Die größte Gefahr ist die Addition mit einer engen Kurve, einem Spurwechsel oder Verkehr neben dem Auto. Quellen: [race.ts:522](<D:/Velvet Cruise/Code/src/game/race.ts:522>), [race.ts:797](<D:/Velvet Cruise/Code/src/game/race.ts:797>).

Sandpartikel übernehmen die tatsächliche Böenrichtung, -geschwindigkeit und -dichte. Der Sturmton wird mit der Böe lauter. Das ist gutes gleichzeitig wirkendes Feedback, aber **keine definierte Vorwarnphase**: Partikel und Kraft nutzen denselben aktuellen `gust`-Wert. Eine vorhandene Sandfahne ist daher nicht automatisch ein garantierter Vorlauf. Quelle: [render.ts:538](<D:/Velvet Cruise/Code/src/game/render.ts:538>), [audio.ts:294](<D:/Velvet Cruise/Code/src/audio/audio.ts:294>).

Der Böentakt läuft auch außerhalb der Sandstage weiter und wird nur mit der örtlichen Sandstärke multipliziert. Er ist deshalb keine rein ortsfeste, vorher lernbare Streckengefahr. Die Richtung nutzt denselben Rennzufallsgenerator wie andere Ereignisse. Ein identischer Straßenverlauf allein garantiert nicht dieselbe Windgeschichte. Für rekordorientierte Fairness wäre eine je Strecke stabil gesetzte Böenfolge oder eine klar angekündigte, begrenzte Reaktion leichter zu lernen.

### Nebel – Redwood Pass

Nebel hat **keinen direkten Grip-, Brems- oder Lenkeffekt**. Er reduziert die Fernsicht deutlich: maximale atmosphärische Dichte `thick = 1`, im Vergleich zu 0,85 für Sand, 0,30 für Regen und 0,26 für Schnee. Hintergrund und entfernte Straße/Objekte werden an die Nebelfarbe angenähert. Darüber bewegen sich weiche Nebelbänke in 8×2-Pixel-Feldern. Quelle: [render.ts:401](<D:/Velvet Cruise/Code/src/game/render.ts:401>), [render.ts:525](<D:/Velvet Cruise/Code/src/game/render.ts:525>).

Diese indirekte Wirkung reicht spielerisch aus: Kurven und Verkehr werden später erkannt. Zusätzlicher heimlicher Gripverlust würde eine zweite Gefahr schaffen, ohne dass ein erkennbarer nasser Belag vorhanden wäre. Stärker sollte stattdessen die Zeichnung der nahen Straße, Außenkante, Rücklichter und tatsächlichen Kurvenwarnungen werden.

### Hitze – Death Valley und Gold Rush Town

Hitze verschiebt ausschließlich Bildzeilen um den Horizont: ungefähr Zeile 68–107, bis zu rund zwei logische Pixel. Sie beeinflusst kein Drehmoment, keine Motortemperatur, Reifen, Bremsen oder Geschwindigkeit. Das gesamte bereits gezeichnete Bild in diesen Zeilen kann mitwackeln, also auch entfernte Autos, Schilder und Kulissen. Quelle: [render.ts:512](<D:/Velvet Cruise/Code/src/game/render.ts:512>).

Das ist als atmosphärischer Effekt angemessen. Für eine spätere Feinzeichnung sollten klare Pixelcluster der nahen Orientierungselemente erhalten bleiben und der stärkste Flimmerbereich knapp am Horizont liegen. Eine Motorkühlung, Überhitzungsstrafe, zufällige Minderleistung oder Reifenabnutzung würde hier neue Ressourcenverwaltung statt freier Arcadefahrt erzeugen. Sie wird nicht empfohlen.

### Nacht und Dämmerung

Nacht ist ein Lichtzustand. Er interpoliert aus `dark` der Stages. Spielerlicht schaltet ab 0,3 ein; andere Fahrzeuge haben individuelle Schaltschwellen zwischen 0,12 und 0,62. Lampen, Lichtkegel und Rücklichter verbessern die Lesbarkeit. Es gibt keinen Nacht-Gripfaktor. Twilight Bay ist technisch `clear` beziehungsweise ohne Wetterfeld, hat aber `dark: 1`; Crystal Lake ist ebenfalls `clear` mit `dark: 0,85`. Das Wettericon allein beschreibt deren tatsächliche Lichtstimmung daher nicht vollständig. Quellen: [race.ts:1043](<D:/Velvet Cruise/Code/src/game/race.ts:1043>), [race.ts:387](<D:/Velvet Cruise/Code/src/game/race.ts:387>), [themes.ts:219](<D:/Velvet Cruise/Code/src/game/themes.ts:219>), [themes.ts:427](<D:/Velvet Cruise/Code/src/game/themes.ts:427>).

## Übergänge, Tunnel, Randstreifen und Gegner

**Stageübergänge:** Wetterstärke, Licht und Hintergrund werden über 230 Segmente mit einer S-Kurve überblendet, bei Maximaltempo ungefähr 2,5 Sekunden. Regen-/Schneekurvenzug und Sandkraft folgen derselben Wetterstärke. Beim Wechsel von Thunder Highway in eine klare Stage verschwindet der Regenzug also graduell; nicht sämtliche Effekte enden am Checkpoint. Quelle: [race.ts:758](<D:/Velvet Cruise/Code/src/game/race.ts:758>).

**Ankündigung vor einer Stage:** Das Gabelungspanel zeigt das Wettericon beider Ziele und deren Namen. Es beginnt 240 Segmente vor dem eigentlichen Gabelungsanfang und bleibt bis kurz nach der Wahl sichtbar. Bei Wahl von Regen, Sand, Nebel oder Schnee sagt die Beifahrerin allgemein „Are you sure about this road?“. Das kündigt Unwetter als Stimmung an, erklärt aber weder Regenkurvenzug noch Böen oder Eis. Eine kurze verständliche Einführung beim ersten Auftreten ist hilfreicher als zusätzliche Meldungen in jeder Kurve. Quelle: [ui.ts:11](<D:/Velvet Cruise/Code/src/game/ui.ts:11>), [main.ts:990](<D:/Velvet Cruise/Code/src/main.ts:990>).

**Tunnel:** Wetterpartikel und Wetterton werden mit dem geglätteten Tunnelanteil ausgeblendet; Motorhall und Deckenlicht reagieren zusätzlich. Die grundlegende atmosphärische Fernvernebelung sowie Regen-/Schneekräfte und Sandkraft fragen den Tunnelanteil hingegen nicht ab. In den aktuellen 15 Stages erzeugt nur Neon City Tunnel und diese Stage hat klares Nachtwetter: Daraus folgt aktuell kein nachgewiesener Regen-/Windfehler in Tunneln. Falls später Sturmtunnel hinzukommen, braucht es getrennte Regeln für trockenen Untergrund, Luftwind und verbleibende Nässe. Quelle: [render.ts:498](<D:/Velvet Cruise/Code/src/game/render.ts:498>), [render.ts:401](<D:/Velvet Cruise/Code/src/game/render.ts:401>), [main.ts:1141](<D:/Velvet Cruise/Code/src/main.ts:1141>), [themes.ts:351](<D:/Velvet Cruise/Code/src/game/themes.ts:351>).

**Randstreifen:** Ab Distanz 0,9 vom nächsten Straßenzentrum beginnt die Randwirkung, oberhalb 1,12 gilt das Auto als abseits. Je weiter hinaus, desto stärker werden Verzögerung und Tempobegrenzung. Diese Regel ist für Sand, Erde, Gras und Schnee physikalisch gleich; lediglich Staubfarbe und Umgebung variieren. Das ist eine konsistente, bereits spürbare Auslaufstrafe. Nicht jede optisch verschneite oder sandige Schulter besitzt einen besonderen Gripfaktor. Quelle: [race.ts:534](<D:/Velvet Cruise/Code/src/game/race.ts:534>).

**Verkehr:** Gegner haben einfache Spurziele und eine seitliche Annäherung von maximal 0,28 Fahrbahnhalbbreiten/s. Sie folgen vorausfahrenden Autos, wechseln stochastisch die Spur und übernehmen Stagewerte für Dichte, Tempo und Wechselrate. Ihre Position wird nicht durch den Spieler-Kurvenzug, Eis oder Böen integriert. Die geringeren Verkehrswerte in Snowcap/Redwood sind feste Gestaltungswerte, keine dynamische Reaktion der Gegner auf Wetter. Quelle: [race.ts:373](<D:/Velvet Cruise/Code/src/game/race.ts:373>), [race.ts:407](<D:/Velvet Cruise/Code/src/game/race.ts:407>).

**Autopilot:** Der Test-/Demofahrer reagiert auf Spurabweichungen und Verkehr und hat eine feste Kurvenvoraussteuerung mit Faktor 1,1. Er liest weder kommende Eisflächen noch Böen oder Nebelsichtweite voraus. In der Demo wird die Sandböe nicht auf `playerX` angewendet; die Böenkraft gilt ausdrücklich nur im Zustand `race`. Ein attraktiver Demoloop ist deshalb kein vollständiger Test der Sandsturmsteuerung. Quellen: [race.ts:458](<D:/Velvet Cruise/Code/src/game/race.ts:458>), [race.ts:522](<D:/Velvet Cruise/Code/src/game/race.ts:522>).

**Schwierigkeit:** Easy/Normal/Hard verändern Zeit, Verkehr, Spurwechsel und Punkte; die Wetterkräfte bleiben gleich. Easy hat zum Beispiel 55 Prozent Verkehr und 50 Prozent Spurwechselhäufigkeit, aber dieselben Eis- und Böenwerte. Ein eigener Easy-Wetterfaktor ist eine mögliche spätere Zugänglichkeitseinstellung, kein aktuelles Merkmal. Quelle: [difficulty.ts:27](<D:/Velvet Cruise/Code/src/game/difficulty.ts:27>).

## Stageweise Zustandsbewertung und Wetterplan

Die Nummern hier sind stabile Stage-/Assetnummern 1–15, nicht die fünf nacheinander gefahrenen Spalten einer einzelnen Route.

| Stage | Aktueller Zustand: Wetter, Licht und Fahrwirkung | Konkreter Plan für die Stage |
|---|---|---|
| 1 Palm Cove | Klar, Tageslicht, Basisphysik. Wasserreflexionen und Vegetation sind grafisch; kein Küstenwind. | Ruhe und freie Sicht als Einstieg bewahren. Wind höchstens in Palmen/Gischt/Gras zeichnen; im ersten Abschnitt keine neue Seitenkraft. Regeln an klarer trockener Straße lernen lassen. |
| 2 Coral Bluffs | Klar, warme Palette, kein separater Wind-/Hitzeeffekt, Basisphysik. Nahe Felswände folgen den Kurven. | Der nahe Felsschnitt soll Kurvenrichtung und Geschwindigkeit sichtbar machen; echte Warnzeichen dazu abstimmen. Starke Böen an den engen Felsabschnitten würden die bewusst erhaltene Auslaufzone entwerten. Allenfalls optische warme Luft über fernen Felsen, ohne Straßenflimmern. |
| 3 Surfside | Klarer Sonnenuntergang, Basisphysik. Keine Wellengischt-Kraft oder Sandverwehung auf der Straße. | Wasser/Licht/Strandbetrieb ausarbeiten, Fahrbahn klar halten. Wind über Stoffe, Fahnen und Palmen andeuten; Strandobjekte und Reflexe dürfen keine falschen Fahrhindernisse vortäuschen. |
| 4 Cypress Point | Klarer später Sonnenuntergang, `dark` derzeit 0 trotz dunkler Farbwelt; Basisphysik. | Prüfen, ob Autos an der gewünschten Dämmerungsstufe erkennbar werden. Baumgruppen und Schatten als Rhythmus nutzen; keine überraschende Haftungsänderung durch Schatten oder Laub. Nächtliche Lichtgrenzen bei Übergang zu Summit deutlich zeigen. |
| 5 Twilight Bay | Voller Nacht-/Dämmerungslichtwert 1, technisch klares Wetter. Höchste Küsten-Verkehrsdichte 3,2; keine zusätzliche Wetterphysik. | Nachticon beziehungsweise klare Dämmerungsbezeichnung mit sichtbarer Nachtstimmung abgleichen. Reflektierende Straßenkante, gut abgestufte Rücklichter, seltene markante Lichtgruppen; dunkle Straße nicht durch neue Gripstrafe erschweren. |
| 6 Thunder Highway | Regen, Gewitter, `dark` 0,62; +16 Prozent Kurvenzug. Kein physikalischer Seitenwind. Verkehrsdichte 3,0 und häufige Spurwechsel. | Priorität auf richtige Highway-Wegweisung, nassen Asphalt, konsequente Regenrichtung und besser geformte Spritzwassercluster. Eine kurze erste Regen-Ankündigung „Wet road – ease off in bends“ kann das Verhalten vermitteln. Zunächst keine stärkere Brems-/Gripstrafe. Ein optionaler späterer Bremsfaktor von 0,95–0,98 wäre nur nach Fahrprobe vertretbar; er ist nicht für die erste Grafiküberarbeitung nötig. |
| 7 Vineyard Valley | Klarer Sunset, `dark` 0, Basisphysik. Windmühlen sind Dekoration. | Reihen, Höfe und Windmühlen als Orientierung nutzen, keine pauschalen Windstöße. Allenfalls langsame gemeinsame Blatt-/Flügelbewegung zur Atmosphäre. Wechsel in Snowcap klar räumlich und farblich vorbereiten. |
| 8 Redwood Pass | Dichter Nebel, `dark` 0,5; keine zusätzliche direkte Fahrwirkung. Relativ wenig Verkehr und Spurwechsel. | Sichtweite und Lesbarkeit an die tatsächliche Vorwarnzeit enger Kurven anpassen. Nebellücken, dunkle Nahstämme und helle Fahrbahnaußenkante geben Tiefe; Rücklichter/Reflektoren müssen vor dem Auto lesbar werden. Keine zusätzliche Gripabsenkung, solange kein nasser Belag sichtbar ist. |
| 9 Painted Desert | Sandsturm, `dark` 0,38; echte Seitenböen, sehr dichte Fernverschleierung. | Erste Priorität: definierter Vorlauf der Böe durch Sandfahne/Windsack/Audioanstieg, dann weicher Kraftanstieg. Windrichtung der gesamten Umgebung vereinheitlichen. Böen in Gabelungen, unmittelbar neben schwerem Verkehr und zusammen mit härtester Kurve begrenzen; eine Maximalverschiebung je Böe festlegen. Keine zusätzliche Motorschwäche oder zufälliges Ausbrechen. |
| 10 Death Valley | Hitze, `dark` 0,22; Horizontflimmern, Basisphysik. | Hitze bleibt optisch. Flimmern auf Ferne und tief liegende Luftschichten begrenzen, Fahrbahn-/Autokanten nahe dem Fahrer stabil halten. Salzflächen, dunkle Felsen und dünne Staubfahnen geben Materialkontrast. Keine Überhitzungsanzeige oder Motorstrafe. |
| 11 Neon City | Nacht, `dark` 1; drei Tunnel werden erzeugt. Basisphysik; Verkehrsdichte 3,4. | Orientierung durch klare Fahrbahnpfeile, konsistente Tunnelleisten und getrennte Luminanz von Lichtquellen/Rücklichtern. Die hohe Verkehrsdichte ist bereits eine Herausforderung. Eine glänzende Oberfläche darf dekorativ sein; echten Regen nur mit bewusst konsistenter Einführung und Abstimmung hinzufügen. |
| 12 Snowcap Pass | Schneefall, `dark` 0,35; +10 Prozent Kurvenzug plus zwölf örtliche Eisflächen auf jeder inventarisierten Route durch die Stage. | Eisfelder, ihre seitlichen Grenzen und verbleibende griffige Linie besser zeichnen. Warnvorlauf anhand tatsächlicher Sicht messen. Das teilbreite Eisfeld in Kurve 4,6 und die vollbreiten Felder bis Kurvenwert 3,1 besonders spielen und gegebenenfalls abschwächen/verlegen; Seitenkräfte und Bremsabschwächung nicht noch erhöhen. Beide-Pedale-Sonderfall klären. Schneefall in gröberen ruhigen Tiefenclustern ordnen, statt Orientierungselemente mit weißen Punkten zu überlagern. |
| 13 Gold Rush Town | Hitze bei Dämmerungswert 0,6; Basisphysik. Kein physikalischer Sandwind trotz Staub-/Windmühlenmotiven. | Warme Luft, Staub und Lampenlicht visuell unterscheiden. Hitzeflimmern schwächer als im offenen Death Valley, besonders vor wichtigen Gebäuden und Schildern. Staubwirbel abseits der Straße als kurze Szenen, ohne zufällige Kollisionen oder Kraftimpulse. |
| 14 Crystal Lake | Klar, `dark` 0,85; Basisphysik, breiteres Seeufer ohne Leitplanke. | Nach Schneeroute sollte die trockene Fahrbahn wieder eindeutig erscheinen. See-/Nachticon sinnvoll benennen. Ruhige Wasserreflexe, Schilf und Laternen geben Stimmung. Leichter Morgen-/Abenddunst wäre rein optisch möglich, solange Weg und Uferkante klar bleiben. |
| 15 Starlight Summit | Klare Nacht, `dark` 1; Basisphysik trotz großer Berge und Höhenwechsel. | Mond-/Sternlicht, dunkle Bergstaffelung, klare Außenkante und markante Observatoriumslichter nutzen. Kein unsichtbarer Höhenwind und keine heimliche Vereisung. Falls später ein einzelner Windabschnitt gewünscht wird, muss er ebenso früh angekündigt und separat begrenzt sein wie der Wüstenwind. |

## Empfohlenes Arcadeprofil

**Trocken:** Referenzgefühl unverändert. **Nass:** etwas mehr Kurvenzug, saubere Nässezeichnung. **Schnee:** mild veränderte Grundstraße, seltene lesbare Eisfelder als besondere Linienwahl. **Sandsturm:** angekündigtes Gegenlenken, kein plötzliches Lenkradwegnehmen. **Nebel/Nacht:** Sichtaufgabe mit verlässlichen Leitsignalen. **Hitze:** Atmosphäre.

Eine physikalische Wirkung braucht nicht jede Wetterart. Der Unterschied zwischen Nebel und Schnee wird deutlicher, wenn Nebel eine Sichtaufgabe und Schnee eine Oberflächenaufgabe bleibt. Sämtliche Einflüsse sollten addiert in engen Kurven geprüft werden, statt Einzelkräfte isoliert für harmlos zu erklären.

### Reihenfolge

1. **P1: Lesbarkeit vor weiterer Physik.** Straßenkurven und Schilder korrigieren; dann Eisgrenzen, Windsignale, Rücklichter und Wettervorlauf ausarbeiten. Regen-/Schnee-/Sandvisuals an dieselben Zustandsgrößen koppeln, die die Kräfte steuern.
2. **P1: Snowcap-Fairness.** Teilbreites Eis in Kurve 4,6 und vollbreite Felder bis Kurvenwert 3,1 überprüfen, reines Bremsen versus beide Pedale vereinheitlichen, erste erkennbare Warnung auf ausreichend Zeit auslegen. Zielwert für einen Entwurf: etwa 2–3 Sekunden lesbarer Vorlauf vor einer neuen gefährlichen Oberfläche bei erwarteter Anfahrtgeschwindigkeit; dies ist ein Vorschlag, kein bisher erfüllter Standard.
3. **P1: Painted-Desert-Fairness.** Etwa 0,5–0,8 Sekunden vor der Kraft eine erkennbare Windfahne und Audioanstieg; den Beginn aus kritischen Wegwahlen fernhalten. Stärke zunächst auf aktuellen Werten belassen, danach maximale Abdrift aus Volltempo und Außenkurve messen.
4. **P2: Regenzeichnung.** Weltbezogene Asphalt-Spritzer, weniger flächige Gischt, nasse Reflexgruppen; aktuelle Kurvendrift als Ausgangspunkt behalten.
5. **P2: Sichtstages.** Nebel/Nacht/Hitze pro Stage abstufen und wichtige Wegweiser/Autos vor dem Erkennungsfenster schützen. Keine zusätzliche zufällige Fahrstrafe.
6. **P3: Gegner und Zugänglichkeit.** Falls nötig geringere spontane Spurwechsel bei lokalem Eis/starker Böe. Gegner müssen dafür keinen aufwendigen Reifensimulator erhalten. Optionale mildere Wind-/Eisstufe für Easy wäre möglich, muss aber mit Rankings und Schwierigkeitsbeschreibung abgestimmt werden.

### Abnahmefälle für spätere Änderungen

- Gleiche Kurve/gleiche Geschwindigkeit trocken, Regen, Schnee, Eis: Wirkung messbar und sichtbar verschieden; Geradeausfahrt im Regen bleibt stabil.
- Vor erstem Eis: Warnung klar erkennbar, Feldbeginn/Ende und freie Teilspur lesbar; wieder griffiges Auto nach Feldende verständlich. Vollbreites Eis in stärkster Kurve mit Gaslupfen und kurzer Bremse beherrschbar.
- Beide Pedale, reines Gas und reine Bremse auf Eis: bewusste, konsistente Regeln; keine unbeabsichtigte Abkürzung.
- Volltempo in Painted Desert mit Böe nach links/rechts, Innen-/Außenkurve, dichtem Verkehr und Gabelung: sichtbare Richtung, Vorlauf und sichere Gegenreaktion. Kein Beginn eines starken Stoßes genau im Entscheidungsmoment.
- Redwood/Nacht: Ein Hindernis wird früh genug erkannt, um ohne Ratespiel eine freie Spur zu wählen. Wettereffekte verdecken nicht Warnzeichen, Rücklichter und Außenkante gleichzeitig.
- Übergang Schnee → Lake/Town sowie Rain → Desert/Vineyard: Oberflächen-/Sichtwechsel kommen zusammen an und ändern sich weich; keine unsichtbare Reststrafe über die angekündigte Übergangszone hinaus.
- Repräsentative Tastatur-, Analogstick- und Touchfahrt zusätzlich zum Autopilot. Tests dokumentieren, welche Eingaben tatsächlich geprüft wurden.

## Technische Grenzen dieses Reports

Die Eis-/Windrechnung erläutert bestehende Kräfte, nicht die ideale Fahrweise. Eine stationäre Grenze berücksichtigt weder Einfahrtlinie noch Trägheit, zeitlich begrenztes Eis oder erlaubtes kurzfristiges Abdriften. Der Report macht deshalb keine Aussage, dass jede der zwölf Eisflächen in jeder Spur bei einem bestimmten Tempo zwingend zu einem Unfall führt. Er benennt die Stellen, an denen gezielte Fahrtests und bessere Ankündigungen den größten Nutzen haben.
