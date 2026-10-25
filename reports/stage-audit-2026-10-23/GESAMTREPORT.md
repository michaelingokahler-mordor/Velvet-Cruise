# Velvet Cruise – Analyse und Verbesserungsplan aller 15 Stages

**Stand: 23. Oktober 2026 · Quellstand: `48bb6cca567f3632d3aec8b4a7ba148d5f8faac8` · Windows-Spielinhalt: `coral-bluffs-8c6492ab21cd`.**

Das größte Potenzial liegt in Raumaufbau, Objektzuordnung und Bildlesbarkeit. Mehr Textur allein löst die verbliebenen hohen Bandwände, aufgeklebten Häuser und zufälligen Richtungspfeile nicht. Palm Cove und Coral Bluffs zeigen bereits den richtigen Weg: ruhige Ferne, sinnvoller Mittelgrund und sorgfältiger Nahbereich. Die auf Wunsch wiederhergestellten fernen Berge von Coral bleiben dabei verbindliche Referenz.

## Umfang und Belegstärke

- Alle **15 Stages** einzeln anhand Quellcode, Paletten, Platzierung, Grafikpfaden und tatsächlicher Ausgabe untersucht.
- **170 Ansichten** aus dem realen Software-Zeichner erzeugt; die 15 Bildtafeln wurden gesichtet. Je Stage sind mehrere Streckenpositionen, beide starken Kurvenrichtungen soweit vorhanden sowie besondere Situationen erfasst.
- **Fünf vollständige automatische Fahrten** decken zusammen alle 15 Stages ab und erreichen das Ziel. Simulation mit 60 Schritten/s, zeitweise gerenderte Szenenbilder. Dies ist keine manuelle Testfahrt und kein Echtzeitvideo.
- **Alle 16 legalen Routen** zusätzlich für Schilder und Eis inventarisiert. Wetterkräfte durch isolierte Rechen-/Ein-Tick-Proben überprüft.
- Die Bilder zeigen die Spielwelt einschließlich Auto, ohne HUD. Aussagen zur HUD-Konkurrenz, flüssigen Animation, Eingabeergonomie und nativen Windows-Bildrate bleiben gezielte spätere Abnahmen. Die Windows-Hülle wurde für diese Analyse nicht bedient. Einzelne temporale Risiken sind deshalb ausdrücklich Vorschläge zur Prüfung.
- Die jeweils erste mit `fork` bezeichnete Aufnahme zeigt teils noch die Vorgängerstage. Das dokumentiert den echten Übergang nach dem Tor; es ist keine falsche Stagezuordnung. Himmel/Tint und Weltgeometrie wechseln nicht exakt am selben Bild.

Die Reportnummer 01–15 folgt den stabilen Themes/Assets. Ein Lauf fährt fünf Spalten; Report 12 Snowcap ist beispielsweise eine Stage der vierten Spalte, keine zwölfte Etappe eines Laufs. Befunde beschreiben den geprüften Stand, Pläne beschreiben noch umzusetzende Änderungen. Spielcode und Installation wurden im Rahmen der Analyse nicht verändert.

## Berichte und Bilder

Die Einzelberichte sind unabhängig lesbar und enthalten Zustandsanalyse, Bildbelege, Schilder, aktuelle Wetterwirkung, Umsetzungsreihenfolge und Abnahmekriterien. **P1** bedeutet vorrangig; **P2** gezielter Ausbau. S/M/L beschreibt nur den relativen Arbeitsumfang, keine Terminzusage.

| Report / Stage | Spalte | Urteil und Schwerpunkt | Priorität / Umfang |
|---|---:|---|---|
| [01 Palm Cove](01-palm-cove.md) | 1 | Referenz erhalten; Komposition örtlich verfeinern. | P2 / S |
| [02 Coral Bluffs](02-coral-bluffs.md) | 2 | Gelände und akzeptierte Fernberge bewahren; Felsübergänge verfeinern. | P2 / S |
| [03 Surfside](03-surfside.md) | 3 | Starke Sonnenuntergangsszene; Strand und Ort als zusammenhängende Plätze bauen. | P2 / M |
| [04 Cypress Point](04-cypress-point.md) | 4 | Gute Baumformen; übergroße Vorderhänge und Lichtabstimmung bearbeiten. | P2 / M |
| [05 Twilight Bay](05-twilight-bay.md) | 5 | Vollwertiger Landschafts- und Siedlungsumbau nötig. | P1 / L |
| [06 Thunder Highway](06-thunder-highway.md) | 2 | Schilderlogik zuerst; technische Umgebung und Regen anschließend beruhigen. | P1 / M |
| [07 Vineyard Valley](07-vineyard-valley.md) | 3 | Weinberge räumlich neu ordnen; Weingüter auf echte Höfe setzen. | P1 / L |
| [08 Redwood Pass](08-redwood-pass.md) | 4 | Waldtiefe stärken und den geschlossenen Wandkorridor öffnen. | P1 / L |
| [09 Painted Desert](09-painted-desert.md) | 3 | Gute offene Grundlandschaft; Sandzeichnung und Seitenwind fairer vermitteln. | P1 für Böenvorlauf, P2 für Grafik / M |
| [10 Death Valley](10-death-valley.md) | 4 | Canyoncharakter erhalten, endlose Streifenwand und Hitzewackeln ersetzen. | P1 / L |
| [11 Neon City](11-neon-city.md) | 5 | Bereits starke Stadtidentität; Licht und Gebäuderhythmus gezielt ordnen. | P2 / M |
| [12 Snowcap Pass](12-snowcap-pass.md) | 4 | Größter kombinierter Bedarf bei Gelände, Eislesbarkeit und Fairness. | P1 / L |
| [13 Gold Rush Town](13-gold-rush-town.md) | 5 | Aus verstreuten Westernobjekten einen Ort bauen; Hitzeflimmern deutlich begrenzen. | P1 / M bis L |
| [14 Crystal Lake](14-crystal-lake.md) | 5 | Schöne Mondstimmung; Seeufer von der Meereslogik trennen. | P1 / M bis L |
| [15 Starlight Summit](15-starlight-summit.md) | 5 | Gute nächtliche Tiefe; eigenes Gipfelziel und klare Lichtführung fehlen. | P1 für Zielmotiv, P2 für Gelände / M |

Weitere Zugänge: [Gesamtreport als eine Datei](GESAMTREPORT.md), [Bildübersicht](Bilduebersicht.html), [Schilder im Detail](SCHILDER.md), [Wetter und Fahrphysik im Detail](WETTER-UND-FAHRGEFUEHL.md), [Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md).

## Zielniveau für die Grafik

Der Maßstab ist eine sorgfältig komponierte Amiga-Anmutung bei der vereinbarten internen Auflösung **320 × 180**. Das ist eine Stilvorgabe, keine Behauptung, dass der heutige Renderer historische Amiga-Hardwaregrenzen emuliert. Eine pauschale Beschränkung aller Bilder auf eine historische Farbzahl würde die aktuellen Probleme nicht lösen.

1. **Räumliche Ursache vor Oberfläche:** Gelände hat Vorderseite, tragenden Boden und Rückseite. Häuser stehen auf ebenen Plätzen; Wald steht auf Waldboden. Hohe Bergformen gehören überwiegend in die Ferne. Kurze nahe Einschnitte dürfen eine Stage bewusst rahmen.
2. **Große Formen vor kleinen Pixeln:** nahe Felsen mit Bruchflächen und wenigen Einsprengseln, Vegetation mit breiten Silhouetten und klaren Schatten. Kleine Details verschwinden in der Ferne. Bestehende Mip-Stufen nutzen; kein feines Bildschirmrauschen hinzufügen.
3. **Drei lesbare Tiefen:** Ferne ruhig und zum Dunst hin gefärbt, Mittelgrund mit Nutzungsräumen und Landmarken, Nahbereich kontrastreicher. Eine weitere gemalte Wand im Mittelgrund ersetzt keine echte Staffelung.
4. **Objekte gehören zusammen:** Felder, Höfe, Strandplätze, Waldlichtungen, Westernblöcke und technische Korridore planen. Zufall darf innerhalb solcher Module variieren, aber keine Ziele, Pfeile oder Gebäudefundamente erfinden.
5. **Licht folgt Material und Quelle:** Fenster leuchten; weißer Putz reagiert auf Nachtlicht. Schattierung von Terrain und Sprites muss dieselbe Tageszeit vermitteln. Reflexe sind an Sonne, Mond, Lampen oder Neonquellen gebunden.
6. **Die Straße führt das Auge:** Fahrbahnkante, vorausfahrende Autos, Warnzeichen und Gabelung sind wichtiger als Landschaftsdetail. Nebel, Regen, Sand, Schnee und Neon dürfen nicht alle Leitsignale zugleich verschlucken.

Die Ausgabe verwendet bereits ein gemeinsames Pixelraster, scharfe Skalierung und Mip-Versionen. Ein globales Hochsetzen der Auflösung ist daher kein erster Arbeitsschritt. Zusätzlich empfiehlt sich später eine Anzeigeoption mit ganzzahliger Vergrößerung und Randflächen: Der aktuelle FIT-Modus kann je Fenstergröße einen nicht ganzzahligen Maßstab wählen. Ob das auf dem tatsächlich benutzten Bildschirm stört, wurde hier nicht gemessen.

## Die wichtigsten gemeinsamen Ursachen

### 1. Alte Geländezeichnung ist noch weit verbreitet

Nur Palm Cove, Coral Bluffs, Cypress Point und Starlight Summit haben die neue Terrainkonfiguration; Palm/Coral zusätzlich eigene geschlossene Geländevolumen. Surfside hat gruppierte Platzierung, verwendet aber noch die niedrige alte Town-Wand. Sieben weitere Stages haben alte Naturwände, Thunder eine alte technische Sound-Wand. Neon City verwendet einen eigenen Stadt-/Tunnelzeichner; Painted Desert besitzt keine Wand. Diese Fälle brauchen unterschiedliche Lösungen.

Der alte Wandpfad wechselt Farbsegmente und variiert den Kamm abschnittsweise. Das erklärt die gebänderten Flächen und Sägezähne. Bei Twilight/Vineyard stehen Gebäude zusätzlich auf einer Höhenfraktion des Hangs, ohne geplante ebene Standfläche. Die größte Wirkung bringen deshalb **Twilight Bay und Vineyard Valley zuerst**, dann Snowcap/Death/Redwood. Eine bessere Textur auf denselben steilen Flächen genügt nicht.

### 2. Nachtfassaden werden teilweise selbstleuchtend

Die Assetpipeline kennzeichnet `*_lit`-Grafiken als emissiv. Beim Laden werden anschließend alle ausreichend hellen Pixel dieser Grafik als selbstleuchtend behandelt. Das kann helle Putzflächen ebenso treffen wie Fenster. Im Bild von Twilight bleiben deshalb Häuser fast weiß, während die Umgebung Nacht zeigt.

**Plan:** explizite Lichtmaske oder getrennte Materialbereiche pro Sprite. Fassaden erhalten den Stage-Tint, Fenster/Lampen behalten gezielt ihre Lichtfarbe. Das ist eine gemeinsame P1-Korrektur, bevor neue Nachtgebäude oder das Observatorium eingesetzt werden. Siehe `tools/pack_assets.py:60`, `src/core/assets.ts:58`, `src/core/fb.ts:255`.

### 3. Bodenkontakt und Licht werden nach Namen erraten

Der Kontaktschattenfilter deckt viele Küstenassets ab, unter anderem Redwood-/Oliven-/Western-/Wüstenfamilien aber nicht vollständig. Ein PNG kann einen eigenen Schatten besitzen; fehlender generischer Schatten ist deshalb nicht automatisch ein schwebendes Objekt. Gleichwohl fehlt eine verlässliche materialbezogene Regel.

**Plan:** Metadaten für Kontaktpunkt, Sockel/Deck, Schatten und Lichtfläche. Gebäude brauchen zuerst eine volle Standfläche, erst danach Schatten und etwas Vegetationsüberlappung. Eine dunkle Ellipse allein heilt keinen in den Hang gesetzten Sockel. Zufälliges horizontales Spiegeln darf bei Architektur die gezeichnete Lichtrichtung und bei Schildern den Inhalt nicht verändern.

### 4. See, Bucht und Meer teilen zu viele Regeln

Crystal Lake bekommt durch die allgemeine Küstenbedingung echte Meeresfelsnadeln; sie sind in den Bildern sichtbar. Brandung, Schaum, Leuchtspur und Pflanzenverteilung brauchen Gewässertypen. **Plan:** `sea`, `bay`, `lake` als gestalterische Konfiguration; der Bergsee erhält ruhige Uferfelsen/kleine Inseln, wenig Schaum und örtliche Schilfbuchten. Die offene Straßenseite allein beschreibt keinen Gewässercharakter.

### 5. Wetter und Licht überzeichnen teilweise die Fahrbahn

Hitze verschiebt komplette Bildzeilen um den Horizont. Bei Gold Rush und Death Valley erfasst das auch Laternen, Kakteen und andere Vorder-/Mittelgrundobjekte. Nacht-Scheinwerfer wirken in mehreren Bildern wie zwei lange helle Asphaltbänder. Regen-/Sandpartikel liegen teilweise über Bildflächen statt gezielt im Straßen-/Raumkontext.

**Plan:** Effekte nach Tiefe und Material begrenzen. Hitze auf entfernte Luftlagen, Reflexe in kurze flache Gruppen, Spritzer auf sichtbaren Asphalt. Bei Scheinwerfern weiche Helligkeitsabstufung ohne falsche zusätzliche Fahrstreifen. Ob etwas im Fahren flimmert, muss mit kurzen Echtzeitsequenzen abgenommen werden; Standbilder belegen nur Form und Komposition.

## Schilder: Was stimmt, was nicht?

**Highway-Wegweiser sind tatsächlich fehlerhaft an die Welt gebunden.** `hwy_sign` ist ein fest gezeichneter Linkspfeil im Zufallspool; rechts wird das Objekt teilweise zufällig gespiegelt. Pro Highway-Fahrt entstehen 208 solche Tafeln, 169 links- und 39 rechtsweisend. Bei 195 liegt in den nächsten 270 Segmenten keine Gabelung. Zehn Brücken tragen unabhängig vom Ort dieselbe rechte Ausfahrt. Die Richtung eines echten Ausfahrtschilds muss nicht der aktuellen Kurve folgen; hier ist der Fehler die fehlende zugehörige Ausfahrt.

Beispiele auf `[0,5,8,9,10]`: Bei Segment 6735 zeigt eine Tafel links, während die Straße deutlich rechts verläuft. Bei 7360 zeigt eine Brücke eine rechte Ausfahrt, obwohl eine Linkskurve und kein Abzweig folgt. Rohdaten und genaue Quellen stehen im [Schilderreport](SCHILDER.md).

**Gelbe Kurven-Chevrons sind dagegen an echte kommende Kurven gebunden.** Jede vorhandene Tafel ließ sich einem Kurventrigger 20/60/100 Segmente voraus zuordnen. Einige stehen noch im entgegengesetzten ersten Teil einer S-Kurve. Das ist kein zufälliger Richtungsgenerator, aber eine missverständliche Bildsprache: Ein Chevron wird als Führung hier und jetzt gelesen.

**Die Routenwahl selbst ist korrekt verdrahtet.** `NEXT`, Fork-Ziele und Zielbanner stimmen zusammen. An den vier Küsten-Abzweigen fehlt jedoch das rechte Zielsymbol, weil `forkSign()` keinen `icon_coast`-Fallback hat.

Empfohlene Regeln:

1. Grüne Ziele/Fahrstreifeninformationen ausschließlich aus Routendaten erzeugen; semantische Tafeln niemals als zufällig gespiegelte Dekoration behandeln.
2. Brückentragwerk und Inhalt trennen. Ohne Abzweig gerade Fahrstreifenpfeile, vor echtem Fork getrennte linke/rechte Zielpanels.
3. Vor einer Einzelkurve ein Warnschild; Chevrons am äußeren Kurvenverlauf. Vor engem Richtungswechsel ein S-Kurven-Symbol, danach richtungsrichtige Führung im jeweiligen Schwung.
4. Gabelungsziele früh genug vor der Entscheidung zeigen, an der Nase wiederholen. Küstenfallback sofort ergänzen, individuelle Icons später.
5. Lesbarkeit in echten Bildpixeln und Sekunden messen. Ein heutiger Chevron ist 100 Segmente vor der Kamera nur etwa 2,9 Pixel breit. Geometrischer Vorabstand ist noch keine lesbare Vorwarnzeit.

## Wetter: heutige Wirkung und passender Ausbau

| Zustand | Heutiger physikalischer Einfluss | Empfehlung |
|---|---|---|
| Klar / normale Nacht | Basisfahrmodell; Nacht verändert Licht/Sicht | Verlässliche trockene Referenz behalten; keine Dunkelheits-Gripstrafe |
| Regen · Thunder Highway | Äußerer Kurvenzug ×1,16; keine pauschale Brems-/Top-Speed-Änderung | Bestehende milde Wirkung zunächst behalten, Nässe und erste Warnung verständlich machen |
| Schneefall · Snowcap | Kurvenzug ×1,10 | Schneefall und besondere Eisfläche sichtbar unterscheiden |
| Volles Eis unter Schnee | Kurvenzug insgesamt bis ×2,2, Lenk-Nachlauf, reine Bremskraft auf 45% | Starke Wirkung bereits vorhanden: Vorwarnung, freie Linie, Kurvenüberlagerung und Brems-Sonderfall priorisieren |
| Sandsturm · Painted Desert | Seitenböen bis 0,46 Fahrbahnhalbbreiten/s | Garantierten sicht-/hörbaren Vorlauf vor Kraftbeginn schaffen; kritische Kombinationen begrenzen |
| Nebel · Redwood | Keine direkte Fahrkraft, reduzierte Sicht | Sichtfenster, Straßenrand und Rücklichter verbessern |
| Hitze · Death Valley / Gold Rush | Bildverzerrung, keine direkte Fahrkraft | Auf Ferne begrenzen; keine Motorüberhitzung oder Reifenabnutzung hinzufügen |

Das sind Spielkoeffizienten, keine realen Reibwerte. Insbesondere **16% mehr Kurvenzug bedeutet nicht 16% weniger Grip**. Wetter wird im Stageübergang eingeblendet. Easy/Normal/Hard ändern derzeit Verkehr, Zeit und Punkte, aber nicht die Wetterkräfte; alle vier Autos fahren physikalisch gleich.

### Snowcap braucht Lesbarkeit und abgestimmte Kombinationen

Inventarisiert wurden je Snowcap-Fahrt zwölf Eisfelder mit insgesamt 1019 vereisten Segmenten, davon vier vollbreit. Ein links teilvereistes Feld überlagert Kurvenwert 4,6 und lässt rechts eine griffige Teilspur; die vollbreiten Felder erreichen maximal Kurvenwert 3,1. Bei voller Wirkung wäre stationäres Halten bei Volltempo rechnerisch nicht möglich; ein vereinfachter Grenzwert liegt bei etwa 209 km/h. Das ist **kein gemessenes Pflicht- oder Unfalltempo**, weil Einfahrtlinie, Nachlauf und endliche Feldlänge entscheidend sind.

Eiswarnschilder stehen 110 bzw. 55 Segmente vorher: Zwischen Schildpassage und Feld bleiben bei Volltempo 1,20/0,60 Sekunden, zusätzlich zur vorher möglichen Sichtbarkeit. Einige linke Warnschilder verletzen außerdem die normalerweise freigehaltene Auslauflücke. Gleichzeitiges Gas und Bremse umgeht die Eisabschwächung der reinen Bremse. Diese Punkte gehören in die P1-Liste.

**Plan:** gut erkennbare Feldgrenzen und griffige Teilspur, ungefähr 2–3 Sekunden tatsächlich lesbarer Vorlauf als Entwurfsziel, keine gefährliche Schildkante im Rückkehrraum. Das teilbreite 4,6-Feld und die vollbreiten Felder bis 3,1 gezielt spielen und nötigenfalls verlegen/abschwächen. Kräfte nicht vorsorglich weiter erhöhen.

### Painted Desert braucht eine Böe mit Ankündigung

Die vorhandene Böe wächst weich, aber Partikel/Audio und Kraft benutzen denselben aktuellen Zustand. Es gibt keinen garantierten Vorlauf. Eine unkorrigierte volle Böe kann rechnerisch rund 0,70–1,17 Fahrstreifen verschieben. Der Takt ist zudem nicht rein ortsfest, sondern hängt an laufendem Rennzufall.

**Plan:** 0,5–0,8 Sekunden vorher erkennbare Sandfahne/Windsackrichtung und Audioanstieg, danach Kraft. Den starken Beginn von Gabelungsentscheidungen fernhalten; Außenkurve plus Verkehr plus Böe gemeinsam testen. Erst nach solchen Proben entscheiden, ob die maximale Stärke oder Abdrift sinken soll. Eine lernbare, je Stage stabil gesetzte Folge ist eine sinnvolle Option für Rekordfairness.

### Das Arcadegefühl als klare Regel

Trocken bleibt die Referenz. Nass fordert etwas mehr Rücksicht in Kurven. Eis ist eine seltene angekündigte Linienwahl, Sandwind eine angekündigte Gegenlenkaufgabe. Nebel/Nacht sind Sichtaufgaben, Hitze bleibt Atmosphäre. Kein Reifenverschleiß, keine Motorüberhitzung, keine zufälligen ungesehenen Haftungsverluste und keine zusätzliche Simulation nur zur Vollständigkeit.

Grafikverbesserungen und spätere Physikabstimmung erhalten getrennte Abnahmen. Wenn Kräfte, Eisfelder oder Böentakt geändert werden, ändern sich möglicherweise Zeiten/Punkte: Zeitbudget, KI, Reproduzierbarkeit, Rankings und bestehende Spielstände müssen dann bewusst geprüft beziehungsweise versioniert werden. Ein rein grafischer Durchgang soll diese Spielregeln zunächst erhalten.

## Empfohlene Reihenfolge

| Paket | Ergebnis | Stages / Voraussetzung |
|---|---|---|
| A · verlässliche Signale | Highway-Pfeile/Gantries datenbinden; Küsten-Icons; S-Warnlogik; Eiswarn-Abstand | Alle, besonders Thunder/Snowcap. Kleine gemeinsame Grundlage vor neuer Dekoration |
| B · Material und Licht | Emissionsmasken, Bodenkontaktmetadaten, Fern-Hitze, ruhigere Scheinwerferflächen | Twilight, Gold Rush, Death Valley und alle Nachtstrecken |
| C · tragende Landschaft | Niedrige Vorder-/Mittelgründe, echte Höfe, zurückgesetzte Bergkulisse | Zuerst Twilight und Vineyard, danach Snowcap/Death/Redwood |
| D · eigene Orte | Seeufer, Westernblöcke, technische Highway-Abschnitte, Observatoriumsankunft | Crystal Lake, Gold Rush, Thunder, Starlight |
| E · gezielter Feinschliff | Strandmodule, Cypress-Sichtfenster, Neon-Bezirke; lokale Palm-/Coral-Details | Bestehende starke Motive bewahren, akzeptierte Coral-Fernberge nicht erneut ersetzen |
| F · Wetterabstimmung | Erst Vorlauf/Lesbarkeit, dann bei Bedarf begrenzte Kraft-/Feldänderung | Snowcap und Painted; zusätzliche Tastatur-/Analog-/Touch-Abnahme |

**Sinnvoller erster zusammenhängender Stage-Umbau: Twilight Bay**, nach den kleinen gemeinsamen Schilder-/Lichtkorrekturen. Hier wiederholen sich die alten Küstenprobleme besonders deutlich, und eine überzeugende Zielbucht verbessert den Abschluss der bereits bearbeiteten rechten Route. Danach bietet Vineyard einen guten zweiten Anwendungsfall für echte Höfe und zurückgesetzte Hügel. Snowcap kann parallel als eigener Fairness-/Grafikschwerpunkt geplant werden.

## Abnahmeplan für die Umsetzung

1. Pro Stage feste Kamerapositionen aus den Nachweisen für Eingang, beide Kurvenrichtungen, Mitte, Landmarke und Ende übernehmen. Zusätzliche Randansicht von links/rechts und beide möglichen Vorgängerrouten prüfen. Gleiche Kamera vor/nach Änderungen.
2. Mindestens eine kurze flüssige Sequenz bei normalem Spieltempo und eine langsame Randfahrt aufnehmen. Konturen, Partikel, kleine Spritewechsel und Pixelraster in Bewegung beurteilen; Screenshots allein ersetzen das nicht.
3. Vollständige Spritebreite gegen freie Auslaufzone prüfen. Jedes Gebäude über Breite und Länge auf derselben Welt-Höhen-Standfläche. Sichtbare Landschaft mit bestehenden Kollisionsgrenzen vergleichen: keine scheinbar freie Wiese vor einer unsichtbaren Wand.
4. Schilder automatisch auf zugehöriges Ereignis, Richtung, entfernte/neu aufgebaute Routen und Spiegelung prüfen. Danach tatsächliche Erkennbarkeit in Regen, Schnee, Nebel und Nacht messen.
5. Wetter getrennt trocken/nass/schneebedeckt/vereist und mit links/rechts gerichteter Böe testen. Kritische Kurve plus Verkehr plus Wetter prüfen, ebenso Feldende, beide Pedale und Gabelung. Rückmeldung muss vor einer neuen Gefahr kommen.
6. Reale Ausgabe im Windows-Spiel messen: Softwarezeichner und Gesamtbildzeit getrennt, inklusive schwierigster Stadt-/Wetterbilder. Als Arbeitsziel flüssige 60 Bilder/s; konkretes Zeichnerbudget aus der nativen Messung ableiten. Die hier erzeugten Node-Bilder sind kein Windows-Leistungsnachweis.
7. Nach rein grafischen Änderungen bestehende Geometrie-/Kollisions-/Speichertests und vollständige Fahrten aller 16 legalen Routen ausführen. Bei bewusst geänderter Wetterphysik neue erwartete Werte dokumentieren; alte Bestzeiten nicht stillschweigend als gleichwertig behandeln.

## Assets und technische Ansatzpunkte

Vorhandene Palmen-, Busch-, Fels-, Haus-, Western- und Winterassets reichen für die ersten Layoutversuche. Am Summit sind Sternwarte/Teleskop/Antennen sogar schon vorhanden, werden aber im aktuellen Straßenbild nicht gezielt platziert. Neue Assets erst für konkret benannte Lücken anfertigen: passende Fundamentmodule, zusätzliche echte Gebäudesilhouetten, grobe Schneewechten, lesbare Vorwarn-/S-Kurven-/Zielzeichen. Die Freigabe für Runway ist bekannt; für die Analyse war keine Bildgenerierung nötig.

Wichtige Quellen am geprüften Commit: [Themes](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts), [Track/Platzierung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts), [Renderer](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts), [Fahrmodell](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts), [bisherige Look-Regeln](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/tools/art/STAGE_LOOK.md). Genaue Zeilen und Rohdatenverweise stehen in den Fachreports.

Nachweise im Paket: [Kamera-/Fahrdaten](nachweise/fahransichten.json), [Schilderinventur aller Routen](nachweise/schilderinventur.json), [Wetter-/Eisproben](nachweise/wetterproben.json). Die vollständige 170-Bild-Rohserie und die kleinen Erzeugungsskripte liegen zusätzlich lokal unter `output/stage-audit/`. Die Bildtafeln bündeln sämtliche erzeugten Ansichten; die Lesbarkeitstests werden nicht als bestandene menschliche Fahrtests ausgegeben.


---

# 01 · Palm Cove

**23. Oktober 2026 · Theme-ID `palm-cove` · Spalte 1 von 5 · Priorität P2 · relativer Umfang S.**

Referenz erhalten; Komposition örtlich verfeinern.

## Zielbild und belegter Aufbau

Heller Küstenauftakt mit warmer Sonne, blauem Wasser, lockeren Palmen, durchlüfteten grünen Hügeln und kleinen Siedlungen. Referenz für Tiefe und Bodenanschluss, nicht eine Vorlage, die allen anderen Stages dieselbe Vegetation gibt.

Eigenes geschlossenes Geländevolumen mit niedrigem Straßenbankett, breiter Terrasse und weiter hinten liegenden Hügeln. Gebäude werden auf Welt-Höhe eingeebnet; Bäume und Büsche folgen der tatsächlich gezeichneten Oberfläche. Große Auswahl an Palmen, Büschen, Felsgruppen, Grasbüscheln, Villen und Kapelle. Separate Anfangsbepflanzung; rechts Meer und Leitplanke. Sonnenglanz wird sowohl am Horizont als auch im sichtbaren Wasser gezeichnet.

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 5 → 8 → 9 → 10`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Die Tiefe aus Fernhügeln, niedrigerem Mittelgrund und Büschen/Felsen nahe der Straße funktioniert. Der Auftakt wirkt offen und das Wasser ist klar ablesbar.
- Größere Wiesenstücke bleiben sehr glatt und bilden längliche diagonale Farbflächen. Zusätzliche Einzelpixel würden diese Flächigkeit nicht sinnvoll lösen.
- Wasserfelsentürme kehren als starkes Motiv oft wieder. Die Siedlungen sind deutlich kleiner und zurückhaltender; das ist im Einstieg angenehm.

![Fahransichten Palm Cove](<bilder/palm-cove.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

Küsten-Zielsymbol an der ersten rechten Abzweigung fehlt. Zwei Warnungen für den zweiten S-Kurvenschwung stehen noch im anders gerichteten ersten Teil; echte Kurven liegen zugrunde.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Klares Tageslicht, Basisfahrmodell. Kein physikalischer Küstenwind. Der Einstieg sollte die trockene Referenz bleiben. Wind kann an Palmen, Gras oder Fahnen sichtbar werden; eine neue Seitenkraft wäre hier kein sinnvoller erster Schritt.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Bestehende Geländevolumen und Grundstücke als feste Referenz behalten. Zwei bis drei besonders kahle Abschnitte auswählen und dort größere Grasinseln, ein Buschpaar und einzelne grobe Steine komponieren.
2. Küstenfelsentürme in wenige räumlich unterschiedliche Gruppen verteilen; ruhige Wasserstrecken dazwischen lassen. Keine dichtere Hinderniskette am Auslauf.
3. Sonnenreflex und sichtbare Sonne in beiden Kurvenrichtungen gemeinsam abnehmen. Feste Wasserbänder und animierte Glanzstriche in ihrer Helligkeit aufeinander abstimmen.
4. Erste Abzweigung als verständliche Einführung ausarbeiten: beide Ziele früh zeigen, Küsten-Icon ergänzen, S-Kurven-Zeichen eindeutig unterscheiden.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Start samt linkem Geländerücken bleibt geschlossen; niemand sieht hinter eine offene Kulisse.
- Bestehende 550-Welteinheiten-Freilücke der zusätzlichen Vegetation und ebene Hausgrundstücke bleiben nachweisbar.
- Sonnenreflex bleibt in Links- und Rechtskurven auf Wasser; die Fernhügel behalten ihren akzeptierten Charakter.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L87), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)


---

# 02 · Coral Bluffs

**23. Oktober 2026 · Theme-ID `coral-bluffs` · Spalte 2 von 5 · Priorität P2 · relativer Umfang S.**

Gelände und akzeptierte Fernberge bewahren; Felsübergänge verfeinern.

## Zielbild und belegter Aufbau

Trockene Küstenhügel und kleine Dörfer; massive Berge bleiben in der Ferne, kurze Sandsteineinschnitte rücken innen in Linkskurven heran.

Eigener Geländequerschnitt; Felsnase wird gezielt aus negativer Kurve abgeleitet. Gebäude und Leuchtturm haben ebene Grundstücke. Nahfelsen besitzen unregelmäßigen Kamm, größere Flächen, mineralische Einsprengsel und kurze Klüfte. Die Fernberge wurden auf Wunsch wieder auf die ruhigere vorherige Polygonkulisse zurückgestellt. Das ist ein gewollter Stand, kein offener Fehler.

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 1 → 6 → 7 → 13`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Nahe Sandsteineinschnitte rahmen die Linkskurven; dazwischen bleiben niedrige trockene Hügel, Siedlungen und Meer sichtbar.
- Die neuen kantigen Einsprengsel lesen sich deutlich als Felsmaterial. Die ruhigere, wiederhergestellte Fernkulisse trennt sich davon gut.
- Lange trockene Flächen sind teilweise groß und wenig untergliedert. Ihr ruhiger Charakter ist sinnvoll; abwechslungsreichere Gruppen helfen mehr als zusätzliche Textur überall.

![Fahransichten Coral Bluffs](<bilder/coral-bluffs.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

Rechtes Surfside-Icon fehlt. Fünf S-Gegenschwung-Vorwarnungen verdienen eine bessere Symbolik; die Warnpfeile sind nicht zufällig.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Kein Regen-, Schnee-, Hitze- oder Windmodell in dieser Stage. Die warme Farbpalette ist kein eigener Hitzeeffekt. Zusätzliche Böen in den nahen Einschnitten würden unnötig Kurve und Randgefahr stapeln.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Die vom Nutzer wiederhergestellte Bergkulisse als verbindliche Referenz sichern. Strukturänderungen auf nahe Felsflächen begrenzen.
2. Anfang und Ende der langen Einschnitte bewusst ausformen: einzelne Felsschollen, Geröllfuß und niedriger Busch statt abrupt beginnender gleich hoher Wand.
3. Zwei bis drei Felsvarianten mit unterschiedlichen großen Bruchflächen einsetzen. Kleine Einsprengsel erst zeigen, wenn genügend Bildpixel vorhanden sind; in der Ferne ruhig ausblenden.
4. Dorf- und Leuchtturmstellen als getrennte Blickpunkte stärken, ohne die ebenen Grundstücke zu verbreitern oder wieder sandfarbene Dauerstreifen zu zeichnen. Kurvenschilder im Straßenraum freistellen.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Die Fernberge stimmen mit dem akzeptierten Stand überein.
- Felsnase erscheint gezielt in Linkskurven; Gerade und Rechtskurve bleiben offen.
- Felsfuß, 21 Haus-/Leuchtturmgrundstücke und freie Auslaufzone behalten einen nachvollziehbaren Bodenkontakt.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L121), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)


---

# 03 · Surfside

**23. Oktober 2026 · Theme-ID `surfside` · Spalte 3 von 5 · Priorität P2 · relativer Umfang M.**

Starke Sonnenuntergangsszene; Strand und Ort als zusammenhängende Plätze bauen.

## Zielbild und belegter Aufbau

Lebendiger Strandort im kräftigen Sonnenuntergang; Strand, Hütten, Rettungstürme und Sonnenschirme bilden kleine Aufenthaltsbereiche.

Kein neues Terrainprofil; niedrige `town`-Wand mit Lücken. Gebäude und Palmen werden über `groups: true` in Häufungen verteilt. Hütten und Rettungstürme erhalten bereits eine überlappende Holzplattform. Häuser, Palmen, Büsche, Werbetafeln und Surfboards links; Schirme, Rettungstürme und Palmen rechts. Die Leitplanke verschwindet abhängig von der Küstenform abschnittsweise; Strand ist deutlich breiter als in den anderen Küstenstages. Kräftigste Sonnenreflexion (`sunGlow: 1`).

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 1 → 2 → 7 → 14`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Die kräftige warme Sonne, violette Ferne und kleinen Strandhäuser ergeben eine eigenständige, gut erkennbare Stage.
- Gruppierte Gebäude und Palmen sind bereits deutlich interessanter als eine gleichmäßige Objektzeile. Rechts wirken einzelne Hütten und Schirme aber eher verstreut als einem Strandplatz zugehörig.
- Die niedrige braune Wand hinter dem Ort hat einen regelmäßigen gezackten Kamm und glatte Farbbänder. Das fällt neben den sorgfältiger gezeichneten Häusern auf.

![Fahransichten Surfside](<bilder/surfside.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

Rechtes Cypress-Icon fehlt. Sechs S-Gegenschwung-Vorwarnungen; Reklame braucht eine klar andere Form und Farbe als Kurvenwarnungen.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Klarer Sonnenuntergang mit normaler trockener Physik. Wasserreflexe, Gischt und Strandwind sind atmosphärisch. Keine neue Haftungsstrafe durch bloß gezeichneten Sand auf der Straße einführen.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Drei Strandmodule aus vorhandenen Assets bauen: Rettungsturm mit Zugang, Schirmgruppe mit freiem Sand, Hütten-/Surfclubplatz. Zwischen den Modulen bewusste freie Strandstücke lassen.
2. Town-Wand abschnittsweise durch niedrige Dünen, Gärten, Hofmauern und Ortsgrund ersetzen. Straßenrand und Häuserstandfläche räumlich verbinden.
3. Beginn und Ende der Leitplanke durch Uferform und Zugang erklären. Holzplattformen unter Hütten behalten und in einen gemeinsamen Boden einbinden.
4. Ein prägnanter Surfclub oder Steg als Landmarke genügt. Werbetafeln, Surfboards und Kurvenzeichen so verteilen, dass die Verkehrszeichen sofort erkennbar bleiben.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Mindestens drei verständliche Strandplätze sind in einer Fahrt wiedererkennbar.
- Haus-/Hüttenunterseiten treffen Boden oder Deck; die Wandkrone hat keinen regelmäßigen Sägezahn.
- Badebetrieb, Schirme und dekorative Boote beanspruchen den Auslauf nicht als geschlossene Hindernisreihe.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L152), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)


---

# 04 · Cypress Point

**23. Oktober 2026 · Theme-ID `cypress-point` · Spalte 4 von 5 · Priorität P2 · relativer Umfang M.**

Gute Baumformen; übergroße Vorderhänge und Lichtabstimmung bearbeiten.

## Zielbild und belegter Aufbau

Felsige, dunkler werdende Küstenstraße mit Zypressenhainen und einzelnen Schirmkiefern, sichtbar andere Silhouetten als Palm Cove.

Neuer Hang-Painter mit Wiesen, Senken und Ausläufern; sechs gewichtete Baumvarianten, Buschgruppen und eigene `point_rock_*`-Varianten. Keine Häuser-/Dorfmodule. Linke Seite `forest`, rechts weiterhin Küste mit Leitplanke und einzelnen Zypressen, Steinen und Wasserfelsentürmen. Warme violette Dämmerung; jedoch kein `dark`-Wert gesetzt.

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 1 → 2 → 3 → 4`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Zypressen und Schirmkiefern unterscheiden die Stage klar vom Palmenauftakt. Die Küstenferne bietet schöne warme Blickfenster.
- Mehrere grüne Vorderhänge steigen als sehr große dreieckige Masse über den oberen Bildrand und nehmen den Mittelgrund fast vollständig ein.
- Helles Grün am Nahhang konkurriert mit dem bereits dunklen violetten Himmel. Die Landschaft wirkt dadurch teilweise später am Tag als ihre Beleuchtung.

![Fahransichten Cypress Point](<bilder/cypress-point.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

47 Kurventafeln, davon 16 vor einem noch anders gerichteten S-Schwung: besonders hoher Bedarf an gestaffelter Vorwarnung. Rechtes Twilight-Icon fehlt.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Technisch klar; kein eigener Wetter-Kraftfaktor. Ein expliziter dark-Wert fehlt, trotz der dunklen Bildpalette. Das ist eine zu prüfende Lichtabstimmung, kein Beweis für einen Physikfehler. Keine zusätzliche Laub-/Schatten-Haftung einführen.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Zwei bis drei Vorderhänge gezielt absenken und Haine auf vorgelagerten Geländeabsätzen verteilen. Hohe Form nur in wenigen Kurven als Rahmung einsetzen.
2. Baumgruppen in Größe und Abstand staffeln: einzelne große Kiefern nahe, schmale Zypressen im Mittelgrund, ruhigere Silhouetten hinten.
3. Nadeldecke, niedrige Büsche und grobe Felsfüße ergänzen; helle große Grasfacetten auf die Dämmerung abstimmen.
4. Fahrzeugbeleuchtung und Dunkelheitsverlauf zwischen Surfside, Cypress und den möglichen Nachfolgern prüfen. Den hohen Anteil von S-Kurven vor allem über verständlichere Schilder vermitteln.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Meer und ferner Höhenzug bleiben an mehreren vorher festgelegten Stellen durch Sichtfenster erkennbar.
- Nahterrain und Bäume teilen dieselbe erkennbare Abendbeleuchtung.
- S-Kurvenwarnungen verwechseln den aktuellen Schwung nicht mit dem nächsten; Verkehr hebt sich vom dunklen Hintergrund ab.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L170), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)


---

# 05 · Twilight Bay · Ziel E

**23. Oktober 2026 · Theme-ID `twilight-bay` · Spalte 5 von 5 · Priorität P1 · relativer Umfang L.**

Vollwertiger Landschafts- und Siedlungsumbau nötig.

## Zielbild und belegter Aufbau

Ruhige beleuchtete Küstenbucht am Ende der rechten Route; vereinzelte Häuser und Promenadenlichter, dunkles Wasser und warmes Ziel.

Alte `hill`-Wand mit drei Farbbändern. `house_lit` liegt im normalen Straßenobjektpool und zusätzlich stark gewichtet auf dem Hang; Hanghäuser erhalten keine geplanten ebenen Grundstücke. Wiederkehrende Lampen werden zufällig aus dem Objektpool gewählt, nicht entlang einer Promenade geplant. Dunkelheit 1; warme Lichtflächen für `*_lit` existieren. Meerreflexion schwächer als bei Surfside. Allgemeine Meeres-Felstürme bleiben aktiviert.

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 1 → 2 → 3 → 4`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Viele helle Häuser stehen mitten an einer riesigen violetten Bandwand. Grundstücke, Zufahrten und tragender Boden sind nicht verständlich.
- Die Hausfassaden bleiben beinahe weiß, während Gelände und Himmel Nacht zeigen. Das sieht stärker nach Leuchten als nach beleuchtetem Putz aus.
- Die Küstenbucht und der Horizont tragen die Stimmung; die fast durchgehende Hangbebauung verhindert aber einen ruhigen, glaubwürdigen Zieleinlauf.

![Fahransichten Twilight Bay](<bilder/twilight-bay.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

Keine weitere Routenwahl: Ende der Küstenroute, Ziel E. Kurvenzeichen sollen gegenüber heller Bebauung und Scheinwerferflächen vorrangig lesbar sein.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Klares Wetter bei dark=1. Nacht beeinflusst die Sicht und Fahrzeuglichter, nicht Grip oder Bremsen. Verkehr ist bereits dicht; eine zusätzliche Nachtstrafe wäre unnötig.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Zuerst die pauschale Emissions-Erkennung korrigieren: Fenster und Lampen erhalten Lichtmasken, heller Putz bleibt vom Nachttint abhängig.
2. Berge und hohe Hügel hinter den Ort verschieben. Vorne niedrige Küstenböschung, dahinter drei kleine beleuchtete Siedlungen auf konstanten Welt-Höhen-Grundstücken anlegen.
3. Promenade und Zufahrten als wenige zusammenhängende Bodenflächen zeichnen. Lampen stehen an Wegen und Plätzen; freie Buchtstrecken bleiben dunkel.
4. Vor Ziel E einen erkennbaren Hafen-/Buchtplatz komponieren. Seltene warme Lichtgruppen spiegeln sich örtlich im Wasser; keine flächige Aufhellung des Meeres.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Jedes Haus hat über seine gesamte Breite eine ebene tragende Fläche; kein Sockel schneidet scheinbar in eine Steilwand.
- Helle Fassaden dunkeln nachts ab, Fenster dürfen gezielt leuchten.
- Mindestens zwei ruhige Wasserfenster und ein eindeutiger Ankunftsbereich vor Ziel E sind sichtbar.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L200), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)


---

# 06 · Thunder Highway

**23. Oktober 2026 · Theme-ID `thunder-highway` · Spalte 2 von 5 · Priorität P1 · relativer Umfang M.**

Schilderlogik zuerst; technische Umgebung und Regen anschließend beruhigen.

## Zielbild und belegter Aufbau

Breite, schnelle Interstate im Gewitter, nasser Asphalt, kontrollierter Rhythmus aus Beleuchtung und Lärmschutz; im Hintergrund Regenvorhänge und ferne Stadt.

Boden auf beiden Seiten; niedrige `sound`-Wände links und rechts. Lampen alle 14 Segmente beidseitig; Brücken alle 640 Segmente. Pylonen, Tafeln, Büsche und Barrieren aus Zufallspools. Weniger Höhenwechsel und Kurven als die Wald-/Bergstages. Eigene Regen-/Blitzdarstellung und feuchter Straßenlook sind vorhanden. Keine Terrainkonfiguration; die Sound-Wand verwendet alte wechselnde Farbbänder.

Geprüfte Bildserie: **12 Ansichten** auf Route `0 → 5 → 8 → 9 → 10`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Highway, Gewitter und Strommasten sind unmittelbar erkennbar. Regen, nasse Straße und Blitze schaffen bereits Atmosphäre.
- Lärmschutzwände bilden beidseits eine stark gezackte graue Kante. Im Zusammenspiel mit den geschichteten Wolken entstehen viele konkurrierende horizontale Strukturen.
- Sehr viele grüne Pfeilschilder und gleichförmige technische Objekte erzeugen Reizdichte ohne verlässliche Orientierung. Die Lichtfläche auf dem Asphalt sieht teilweise wie ein zusätzliches helles Band aus.

![Fahransichten Thunder Highway](<bilder/thunder-highway.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

208 zufällige grüne Wegweiser und 10 Brücken mit immer gleicher rechter Ausfahrt pro Highway-Fahrt. 195 der 208 Tafeln haben innerhalb der nächsten 270 Segmente keinen Fork. Höchste Schilderpriorität.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Regen verstärkt ausschließlich den äußeren Kurvenzug um 16%. Direkte Lenkstärke, normale Bremskraft und Höchsttempo ändern sich nicht. Kein physikalischer Seitenwind. Diesen milden Unterschied zunächst behalten; Nässe und Hinweis müssen ihn erklären.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. hwy_sign aus den Zufallspools entfernen und Brückentragwerk von Schildinhalt trennen. Fahrstreifenzeichen aus LANES, Zielpfeile ausschließlich aus echten Forks ableiten.
2. Lärmschutz als konstruierte Plattenwand mit Pfosten, geraden Oberkanten und längeren Unterbrechungen bauen. Dieser technische Rhythmus darf regelmäßig sein; zufällige Zacken passen hier nicht.
3. Randgrün, Masten und Überführungen in wenige verständliche Infrastrukturabschnitte gliedern. Dazwischen Fernstadt oder tiefe Grünstreifen sichtbar machen.
4. Nasse Reflexe in kurzen flachen Tonflächen darstellen. Spritzer auf projizierten Asphalt begrenzen, Gischt in wenige gestufte Pixelcluster aufteilen; Schilder und Rücklichter vor Blitz/Regenschleier schützen.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Kein Richtungspfeil existiert ohne tatsächliches zugehöriges Fahrbahn-/Routenereignis.
- Normale Schilderbrücken behaupten keine Ausfahrt. Ein S-Schwung bleibt eindeutig angekündigt.
- Bei Regen und Blitz bleiben nächste Kurve, freie Spur und vorausfahrendes Auto lesbar; gerade Straße fährt trotz Regen stabil.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L220), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)


---

# 07 · Vineyard Valley

**23. Oktober 2026 · Theme-ID `vineyard-valley` · Spalte 3 von 5 · Priorität P1 · relativer Umfang L.**

Weinberge räumlich neu ordnen; Weingüter auf echte Höfe setzen.

## Zielbild und belegter Aufbau

Weite Weinlandschaft mit warmen Hängen, geordneten Rebflächen, Zypressen und kleinen Weingütern.

Alte Hill-Wand links, rechts keine Wand. Weinreben alle 3 Segmente an fünf festen Querpositionen, mit nur 0,04 Querjitter und einer ausgedünnten Dichte. Zypressen, Oliven, Weingüter, Fässer, Heuballen und Windmühlen zufällig daneben. `winery` wird zusätzlich auf den Hang gesetzt; keine Grundstücksplanung. Hügelmultiplikator 1,5; landschaftlicher Fernhintergrund mit Weinbergen und Dorf vorhanden.

Geprüfte Bildserie: **12 Ansichten** auf Route `0 → 5 → 6 → 11 → 12`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Weinreben, Zypressen, Oliven und Windmühlen vermitteln die Region überzeugend. Der warme Fernhintergrund funktioniert bereits.
- Vorne steigen grelle grün gebänderte Hänge fast senkrecht auf; Gebäude wirken auf diese Flächen geklebt.
- Reben bilden lange gleichmäßige Bänder entlang der Straße. Die Idee von Feldern ist erkennbar, die Parzellen und Hofzugänge fehlen.

![Fahransichten Vineyard Valley](<bilder/vineyard-valley.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

Kurvenwarnungen von Reben und Stämmen freistellen. Abzweigziele Snowcap/Redwood kommen korrekt aus dem Routennetz; vier S-Gegenschwung-Fälle verständlicher ankündigen.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Klarer Sunset, normale trockene Physik. Windmühlen erzeugen keine Seitenkraft. Eine leichte gemeinsame Blatt-/Flügelbewegung kann Atmosphäre vermitteln; neue Böen sind für die Stage nicht nötig.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Links niedrige Rebterrassen und Höfe bauen, hohe Hügel in den Hintergrund setzen. Weingüter nur auf ebenen Welt-Höhen-Grundstücken platzieren.
2. Reben zu großen klar begrenzten Feldern zusammenfassen. Reihen pro Feld gemeinsam orientieren; Feldwege, Trockenmauern und freie Blickachsen trennen die Parzellen.
3. Fässer, Heu und Arbeitsobjekte bei den passenden Höfen gruppieren. Zwei Landmarken mit längerer Anfahrt statt vieler gleichrangiger Winery-/Windmühleninstanzen einsetzen.
4. Farbflächen am Nahhang breiter und weniger streifig komponieren. Oliven und Weingüter mit passendem Bodenschatten versehen; gespiegelt gezeichnete Lichtrichtungen bei Architektur vermeiden.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Alle Weingüter stehen mit voller Breite auf einem sichtbaren Hof, einschließlich Kurve und Steigung.
- Mehrere Rebparzellen sind als getrennte Flächen mit unterschiedlichen gemeinsamen Reihenrichtungen erkennbar.
- Warnzeichen und Fahrbahnränder bleiben vor Reben/Zypressen frei.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L244), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)


---

# 08 · Redwood Pass

**23. Oktober 2026 · Theme-ID `redwood-pass` · Spalte 4 von 5 · Priorität P1 · relativer Umfang L.**

Waldtiefe stärken und den geschlossenen Wandkorridor öffnen.

## Zielbild und belegter Aufbau

Hohe alte Bäume, kühler Nebel und geschützter Waldpass; Baumstämme geben Tiefe, Lichtungen schaffen Orientierung.

Alte Forest-Wände auf beiden Seiten. Redwood, Pine, Farn, Stamm und einzelne beleuchtete Hütten aus gleichartigen Zufallspools. Bäume stehen zusätzlich auf zufälligen Höhenfraktionen des Hangs. Nebel und erhöhte Dunkelheit sind konfiguriert; Fernhintergrund enthält mehrere weichere Waldkämme. Starke Kurven (`twist: 3.2`). Generischer Kontaktschatten fehlt bei `redwood`, Farn und Baumstamm, nicht aber bei `pine`; ein Assetschatten kann trotzdem im PNG enthalten sein.

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 1 → 6 → 7 → 13`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Die Nebelstaffelung erzeugt bereits glaubwürdige Entfernung. Große Stämme vor blassen Baumgruppen sind ein gutes Grundmotiv.
- Beidseitige grünbraune Wände laufen nahezu ständig parallel zur Straße; ihre gezackten Kronen sind trotz Nebel sichtbar.
- Die Baumformen und Größen wiederholen sich stark. Unterschiedliche Ebenen sind vorhanden, aber eine dichte Waldwand verdrängt Lichtungen und Durchblicke.

![Fahransichten Redwood Pass](<bilder/redwood-pass.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

47 Kurventafeln, acht vor S-Gegenschwung. Nebelkontrast und Erkennbarkeit wichtiger als noch mehr Tafeln; Warnungen vor Kuppen und dichter Stammkulisse prüfen.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Nebel senkt Sicht und Kontrast, ändert aber keine direkte Fahrkraft. Das ist für diesen Waldpass sinnvoll. Keine zusätzliche Gripstrafe nötig; Sichtvorlauf und Leitsignale sind die eigentliche Aufgabe.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Waldboden und niedrige bewachsene Böschung an die Stelle der meisten hohen Bandwände setzen. An wenigen Stellen einen bewachsenen Einschnitt als bewusstes Motiv behalten.
2. Drei Ebenen planen: wenige große dunkle Redwood-Stämme mit Wurzelansatz, mittlere Baumgruppen/Farnlichtungen, hinten ruhige Nebelsilhouetten.
3. Vor engen Kurven Sichtschneisen und reflektierende Orientierungspunkte schaffen. Nebel in Bänken und Lücken staffeln, statt überall dieselbe Kontrastdecke aufzulegen.
4. Ein oder zwei Hütten auf kleinen ebenen Lichtungen mit warmem, örtlich begrenztem Licht einsetzen. Kontaktregeln für Redwood, Farne und liegende Stämme ergänzen.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Mehrere klar geplante Lichtungen und wechselnde Waldtiefen sind ohne Suchen sichtbar.
- Rücklichter, Außenkante und mindestens eine kommende Kurveninformation bleiben gleichzeitig erkennbar.
- Große Stämme haben Bodenkontakt und stehen außerhalb der vorgesehenen Rückkehr-/Auslaufzone.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L267), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)


---

# 09 · Painted Desert

**23. Oktober 2026 · Theme-ID `painted-desert` · Spalte 3 von 5 · Priorität P1 für Böenvorlauf, P2 für Grafik · relativer Umfang M.**

Gute offene Grundlandschaft; Sandzeichnung und Seitenwind fairer vermitteln.

## Zielbild und belegter Aufbau

Offene warme Wüste, weite Mesa-Silhouetten, niedrige Sand-/Schotterwellen und große Luftperspektive.

Keine linke oder rechte Wand. Sandfarbener Boden und mäßig hügelige Straße mit vielen Geraden. Saguaro, Kaktus, große Mesa-Felsen, Tumbleweed, Tankstelle und Wüstenbusch stehen in Zufallspools beidseits. Eigene Mesas/Buttes/Spitzen in der Fernkulisse. Sandwetter dämpft Distanzkontrast. Mehrere dieser Namen sind nicht im generischen Schattenfilter (`mesa_rock`, `saguaro`, `cactus`, `gas_station`, `desert_bush`).

Geprüfte Bildserie: **12 Ansichten** auf Route `0 → 5 → 8 → 9 → 10`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Die Stage ist tatsächlich offen und hat eigenständige Mesa-/Kaktussilhouetten. Hier fehlt keine neue große Wand.
- Orangebrauner Schleier und helle Sandstriche überziehen fast das ganze Bild, einschließlich Straße. Unterschiede zwischen naher Erde und fernem Fels werden schwach.
- Große Kakteen und Mesas funktionieren als Blickpunkte, sind aber recht gleichmäßig beidseits verteilt. Die kleinen Nutzungsorte wirken daraus zufällig eingestreut.

![Fahransichten Painted Desert](<bilder/painted-desert.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

Gelbe Warnungen brauchen dunklen Rand gegen den warmen Sand. Sechs S-Gegenschwung-Fälle; reale Ziele Death Valley/Snowcap verwenden, keine Highway-Zufallspfeile übernehmen.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Echte Seitenböen bis 0,46 Fahrbahnhalbbreiten pro Sekunde. Eine unkorrigierte volle Böe kann rechnerisch etwa 0,70–1,17 Fahrstreifen versetzen. Richtung und Stärke werden gleichzeitig sichtbar, bisher ohne garantierten Vorlauf. Stärke zunächst als Prüfbaseline behalten; keine zusätzliche Motorschwäche hinzufügen.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Offene Weite bewahren. Drei Mesa-Gruppen in unterschiedlicher Ferne, ein Tankstellenplatz und längere leere Abschnitte als Streckenrhythmus komponieren.
2. Niedrige Schotter-/Sandformen und dunkle Steingruppen für den Vordergrund einführen; Schatten unter Kakteen und großen Mesas an den Boden koppeln.
3. Sandpartikel stärker in wenige erkennbare Fahnen und Tiefenlagen aufteilen. Den Fahrbahnkorridor ausreichend ruhig halten und die Böenrichtung in Partikeln, Fahne/Windsack und Audio gemeinsam zeigen.
4. Eine definierte Vorwarnphase vor der Seitenkraft vorsehen. Böenbeginn an Abzweigungen und ungünstige Überlagerungen mit Außenkurve/Verkehr begrenzen; erst danach entscheiden, ob die heutige Stärke reduziert werden muss.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Eine neue Böe ist vor der Kraft durch Richtung und Anstieg erkennbar; Entwurfsziel 0,5–0,8 Sekunden Vorlauf.
- Volle Böe in linker/rechter Kurve und neben Verkehr mit kurzer, verständlicher Gegenreaktion beherrschbar.
- Kakteen/Mesas haben einen tragenden Boden; Distanzstaffelung ist auch während Sand sichtbar.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L289), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)


---

# 10 · Death Valley

**23. Oktober 2026 · Theme-ID `death-valley` · Spalte 4 von 5 · Priorität P1 · relativer Umfang L.**

Canyoncharakter erhalten, endlose Streifenwand und Hitzewackeln ersetzen.

## Zielbild und belegter Aufbau

Erschöpfend weites, heißes Tal bei tiefem Sonnenstand: blasser Salz-/Mineralboden, dunkle ferne Berge und sparsame trockene Landmarken.

Sehr hohe alte Cliff-Wand links, rechts offenes Land. Nur geringe Hügel- und Kurvenstärke; 50 % Geradenchance. Tote Bäume, dunkle Felsen, Totenkopfpfosten, Wracks und Pumpwindräder zufällig beidseits, Telefonmasten in festem 18-Segment-Takt rechts. Hitzedarstellung; eigene ferne Berge und Salzpfanne im Hintergrund.

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 5 → 8 → 9 → 10`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Helle Salz-/Wüstenfläche, dunkle Felsen und karger Bewuchs unterscheiden diese Stage gut von Painted Desert.
- Links steht fast durchgehend eine hohe, senkrecht geriffelte und gebänderte Wand. Der Kamm hat viele gleichartige spitze Zähne.
- Hitzeflimmern macht feine tote Zweige und technische Objekte auffällig unruhig. Große Felsflächen besitzen mehr algorithmischen Rhythmus als bewusst gesetzte Brüche.

![Fahransichten Death Valley](<bilder/death-valley.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

13 Kurventafeln genügen für die vielen Geraden. Zeichen aus dem Hitzeflimmern ausnehmen; Ziele Neon/Gold nur an ihrem echten Fork ankündigen.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Hitze verzerrt das Bild, ändert aber weder Beschleunigung, Grip noch Höchstgeschwindigkeit. Das sollte so bleiben. Kein Überhitzungs-/Verschleißsystem für diese Überarbeitung vorsehen.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Canyon in wenige Felsgruppen mit Öffnungen zerlegen: nahe Felsrippen in ausgewählten Kurven, zurückgesetzte Massive und dazwischen breite Salzpfannen.
2. Kontur aus zusammenhängenden unregelmäßigen Formen erzeugen. Große Bruchflächen, einzelne dunkle Spalten, örtliche Geröllfüße und helle Einschlüsse einsetzen; keine durchgängigen Strata-Streifen.
3. Tote Büsche als breitere lesbare Silhouetten vereinfachen. Telefon-/Windradmotive als einzelne Nutzungsinseln platzieren statt überall gleichrangig zu streuen.
4. Hitzeschimmer auf entfernte Luft-/Bodenlagen maskieren. Verkehrszeichen, Fahrzeugkanten und nahen Straßenverlauf stabil halten; die Stage bleibt eine trockene Arcadefahrt.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Canyonfelsen bleiben markant, aber mehrere lange Sichtfenster lassen Ferne und Salzfläche sichtbar werden.
- Gleiche Strecke ohne und mit Hitze zeigt denselben klar lesbaren nahen Fahrbahnrand.
- Kurvenwarnungen behalten während des Flimmerzyklus eine stabile Pfeilform.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L311), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)


---

# 11 · Neon City · Ziel A

**23. Oktober 2026 · Theme-ID `neon-city` · Spalte 5 von 5 · Priorität P2 · relativer Umfang M.**

Bereits starke Stadtidentität; Licht und Gebäuderhythmus gezielt ordnen.

## Zielbild und belegter Aufbau

Schnelles Nachtfinale im Gebäudecanyon, lesbare Straßenkante, Neonakzente und drei abwechslungsreiche Tunnel.

Eigener City-Painter auf beiden Seiten, Gebäudeabschnitte 14–43 Segmente lang mit gelegentlichen 2–4 Segmenten Gasse, unterschiedliche Höhen, fünf Fensterfarben und vier Neonfarben. Drei Tunnel, je 130–229 Segmente. Laternen alle 12 Segmente, Neonbögen alle 460. Neonpalmen, Hydranten, Imbisswagen, Busstopps, Reklamen und Ampeln als Zufallspools; seitliche Neonblades an Gebäuden. Lichtflächen von Neon-/Signal-/Billboardnamen werden bewusst übersprungen, Lampen und Imbiss/Haltestelle erhalten generischen Lichtschein.

Geprüfte Bildserie: **12 Ansichten** auf Route `0 → 5 → 8 → 9 → 10`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Häusercanyon, Leuchtreklame, Palmen und Tunnel wirken zusammenhängend und klar anders als alle Naturstrecken.
- Viele fast gleich helle Fenster und Neonstreifen konkurrieren in der Ferne. Die Detaildichte nähert sich einem Rasterrauschen.
- Die Tunnel bieten eine gute räumliche Abwechslung. Auf offenen Abschnitten sind die Scheinwerferflächen teilweise sehr hell und bandförmig.

![Fahransichten Neon City](<bilder/neon-city.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

Neonbögen sind keine Highway-Ausfahrtsschilder. 40 Kurventafeln, zehn S-Gegenschwung-Fälle. Verkehrszeichen müssen sich von Neonwerbung unterscheiden.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Nacht und Tunnel, normale Basisphysik. Die Stage hat bereits die höchste konfigurierte Verkehrsdichte (3,4). Eine zusätzliche Nacht-Gripstrafe oder neue Ampel-Stoppregel wäre für den gewünschten Fluss ungeeignet.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Drei Bezirke komponieren: niedrige Geschäftsfronten, hoher Canyon, Öffnung zur finalen Skyline. Vorhandene Gebäudegeometrie dafür variieren, keine beliebige Objektverdichtung.
2. Fenster in größere Gruppen und ausgewählte beleuchtete Stockwerke gliedern. Helle Reklamen begrenzen; Fahrbahn, Verkehr und Kurvenzeichen erhalten Vorrang vor Fassadenlicht.
3. Die drei Tunnel durch Portal, Leistenfarbe und Umfeld unterscheidbar machen. Weiche Ein-/Ausfahrthelligkeit und freie Portalsicht prüfen.
4. Kleine Lichtreflexe an konkrete Neonquellen binden. Scheinwerferflächen weniger wie Fahrstreifen markieren; Fußgänger-/Ampelmotive nur bei tatsächlich dargestellten Orten nutzen.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Bei voller Werbe-/Fensterdichte sind freie Fahrspur und Rücklichter zuerst erkennbar.
- Alle drei Tunnel haben lesbare Ein- und Ausfahrt; Lichtwechsel blendet keine Gefahr aus.
- Ziel A erhält eine erkennbare finale Skylineöffnung statt nur weiterer gleicher Häuserblöcke.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L334), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)


---

# 12 · Snowcap Pass

**23. Oktober 2026 · Theme-ID `snowcap-pass` · Spalte 4 von 5 · Priorität P1 · relativer Umfang L.**

Größter kombinierter Bedarf bei Gelände, Eislesbarkeit und Fairness.

## Zielbild und belegter Aufbau

Kalter Alpenpass mit bläulichen Schneeformen, warmem fernem Alpenglühen, verschneiten Nadelbäumen und klar erkennbaren Eisstellen.

Beidseits alte hohe Cliff-Wand, vier horizontale Farbzonen inklusive heller Oberkante. Schneekiefern, Fir, Felsen, Verwehungen, Hütten, tote Bäume und seltene Schneemänner als Zufallspools; Bäume zusätzlich am Hang. Schneepfähle alle 12 Segmente auf beiden Seiten. Hohe Straßenhügel (`hills: 1.8`) und starke Kurven. Eigene ferne Gipfel-/Schneefeldkulisse, Schneepartikel und lokalisierte Eisflächen sind vorhanden.

Geprüfte Bildserie: **12 Ansichten** auf Route `0 → 5 → 6 → 11 → 12`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Schneepalette, Nadelbäume und Eisflächen sind als Winterpass sofort erkennbar. Die ferne Gipfelkulisse besitzt viel Potenzial.
- Beidseitig ragen fast ununterbrochen graue Wände mit gleich breitem weißem Abschluss auf. Die vielen spitzen Kammzähne wirken schematisch.
- Eis ist sichtbar hellblau, kann aber zusammen mit weißem Schnee, Markierung und Partikeln große Teile der Straße optisch vereinheitlichen.

![Fahransichten Snowcap Pass](<bilder/snowcap-pass.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

31 Kurventafeln und 36 an echte Eisflächen gebundene Eiswarnungen. Die Schilderpassage liegt 110 bzw. 55 Segmente vor dem Eis (bei Volltempo 1,20/0,60 s); sichtbar können sie früher sein. Linke Schilder können die normale Auslauflücke verletzen.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Schneefall verstärkt Kurvenzug um 10%. Volles örtliches Eis ergibt zusammen 2,2-fachen Kurvenzug, Lenk-Nachlauf und nur 45% normale Bremskraft. Inventur: zwölf Felder, 1019 vereiste Segmente, vier vollbreite Felder je Snowcap-Fahrt. Der heutige Einfluss ist bereits stark; Lesbarkeit und Kombinationen zuerst verbessern.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Nahwände auf kurze echte Einschnitte reduzieren; dazwischen Schneehänge, Talöffnungen und freie Sicht auf ferne Gipfel. Aufliegende Wechten mit unregelmäßigem Rand statt weißer Dauerbänder zeichnen.
2. Eis klar von trockenem Asphalt und Schneerand unterscheiden. Beginn, Ende und seitliche Grenzen der Fläche sowie eine verbleibende griffige Linie früh sichtbar machen.
3. Eiswarnungen an der tatsächlich erkennbaren Reaktionszeit auslegen: Entwurfsziel 2–3 Sekunden bei erwarteter Anfahrtgeschwindigkeit. Linke Warnschilder aus dem normalen Rückkehrraum versetzen.
4. Das links teilvereiste Feld bei Kurvenwert 4,6 und die vollbreiten Felder bis Kurvenwert 3,1 gezielt fahren. Falls Warnung und Linienwahl nicht genügen, Feld abschwächen/verlegen oder eine trockene Teilspur vorsehen. Beide-Pedale-Sonderfall vor einer Balanceänderung korrigieren.
5. Hütten auf ebenen geschützten Plätzen, Schneemänner nur dort; Pfähle in Schneeränder verankern und nahe Partikel nicht über Warnzeichen verdichten.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Alle zwölf Eisfelder sind vor Wirkung verständlich angekündigt; alle 36 Warnzeichen halten den vorgesehenen Auslaufabstand.
- Das linke 4,6-Kurvenfeld lässt seine griffige rechte Teilspur früh erkennen. Vollbreite Felder bis Kurvenwert 3,1 sind mit nachvollziehbarem Gaslupfen/Bremsen prüfbar beherrschbar.
- Reine Bremse und gleichzeitiges Gas/Bremse haben bewusst konsistente Eisregeln.
- Gipfel bleiben an mehreren Passagen sichtbar; keine endlose beidseitige Sägezahnwand.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L364), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)


---

# 13 · Gold Rush Town · Ziel B

**23. Oktober 2026 · Theme-ID `gold-rush-town` · Spalte 5 von 5 · Priorität P1 · relativer Umfang M bis L.**

Aus verstreuten Westernobjekten einen Ort bauen; Hitzeflimmern deutlich begrenzen.

## Zielbild und belegter Aufbau

Staubiger kleiner Westernort bei Abendlicht, nicht eine Wüste mit zufällig verteilten Saloon-Sprites.

Alte Hill-Wand links, rechts offen. Saloon, Store, Wasserturm, Wagen, Minenkarren, Anbindebalken, rote Felsen, Kakteen, Fässer, Heuballen, Tumbleweed, Wrack und Pumpwindrad stark durchmischt beidseits. Gaslampen alle 14 Segmente. Keine `groups`, keine Grundstücke, keine Zuordnung der Wirtschaftsobjekte zu einem Laden-/Minenhof. Hohe Dämmerungsdunkelheit 0,6 und Hitze. Haus-/Storegrund wird vom generischen Schattenfilter nicht abgedeckt, Lichtschein ist vorhanden.

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 5 → 6 → 11 → 12`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Warme Felsen, Veranden, Gaslampen, Kakteen und Westernobjekte ergeben eine deutliche Themenwelt.
- Gebäude und Arbeitsobjekte stehen stark verstreut; durchgehende Höfe, Holzgehwege und Ortsblöcke sind kaum lesbar.
- Das Hitzeflimmern verbiegt Laternen, Kakteen und Gebäudedetails in sichtbare Zickzacklinien. Es beeinträchtigt das Motiv stärker als es trockene Luft vermittelt.

![Fahransichten Gold Rush Town](<bilder/gold-rush-town.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

18 Kurventafeln, nur ein S-Gegenschwung-Fall. Geschäftsschilder als Kulisse eindeutig von gelben Verkehrszeichen unterscheiden; kein weiterer Routenabzweig.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Hitze bei Dämmerung (dark=0,6), Basisfahrmodell. Staub-/Windmühlenmotive erzeugen keine Seitenkraft. Atmosphäre über warme Luft und lokale Staubwirbel entwickeln; kein zufälliges Rutschen oder Motorleistungsverlust.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Zuerst Hitzemaskierung mit Death Valley gemeinsam lösen: entferntes Flimmern, stabile nahe Silhouetten. Für den Ort weniger Stärke als in der offenen Wüste verwenden.
2. Zwei bis drei zusammenhängende Ortsblöcke auf ebenem Grund planen, mit Holzgehwegen, Vorplätzen und niedrigen Hügeln im Hintergrund.
3. Objekte funktional zuordnen: Wagen/Hitchrail am Saloon, Fässer am Store, Minenkarren beim Minenhof, Wasserturm am Ortsrand. Große freie Zwischenstücke behalten.
4. Lampen nur an Ladenfronten, Wegen und Zielplatz einsetzen. Vor Ziel B einen eigenen beleuchteten Ankunftsbereich bauen; neue Hausvarianten erst nach dem Layouttest ergänzen.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Stabile gerade Lampen-/Kaktuskanten im Nahbereich während des gesamten Hitzezyklus.
- Mindestens zwei Ortsblöcke besitzen verbundene Standflächen und nachvollziehbare Objektzuordnung.
- Ziel B ist als eigener Ankunftsort erkennbar; Geschäftsschilder überdecken keine Kurvenwarnungen.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L387), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)


---

# 14 · Crystal Lake · Ziel C

**23. Oktober 2026 · Theme-ID `crystal-lake` · Spalte 5 von 5 · Priorität P1 · relativer Umfang M bis L.**

Schöne Mondstimmung; Seeufer von der Meereslogik trennen.

## Zielbild und belegter Aufbau

Stiller Bergsee im Mondlicht, dunkle Wälder, ferne Schneegipfel, einzelne Hüttenlichter und kleine Seeuferplätze.

Alte Forest-Wand links, rechts Wasser nach Küstenregel, aber `noRail: true` und breiteres Ufer. Seefichten, Birken, Felsen, Hütten und Farn links; Schilf, Ruderboot, Lagerfeuer und Gras rechts. Seerosen/Schilf zusätzlich auf dem Wasser; Laternen alle 16 Segmente rechts. Starke Mondreflexion (`sunGlow: .95`) und eigener Berg-/Seehintergrund. Weil die allgemeine `sea_stack`-Bedingung Küstenmodus statt Gewässertyp prüft, werden auch im Bergsee Meeresfelsentürme platziert. Foam wird weiter nach derselben gemeinsamen Küstenregel gezeichnet.

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 1 → 6 → 7 → 13`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Mond, Schneegipfel und dunkles Wasser ergeben ein starkes ruhiges Zielmotiv. Uferplätze und einzelne Feuer sind bereits vorhanden.
- Im See stehen tatsächlich spitze Küstenfelsentürme; auch die sehr helle Glitzerspur wirkt eher wie Meeresschimmer als ein ruhiger Bergsee.
- Links dominiert eine hohe Waldwand; rechts läuft eine regelmäßige Straßenlaternenreihe durch relativ ungestalteten Grasrand. Diese Infrastruktur erklärt keinen Uferweg.

![Fahransichten Crystal Lake](<bilder/crystal-lake.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

Keine weitere Verzweigung, Ziel C. Kurvenpfeile gegen dunkle Bäume absetzen; Uferweg-/Campingzeichen dürfen keine Fahrbahnabzweige vortäuschen.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Klar bei dark=0,85. Kein Grip-/Bremsfaktor, auch wenn die Vorgängerstage Schnee zeigte. Ein optionaler leichter Uferdunst wäre rein optisch; keine verdeckte Restvereisung ergänzen.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Eigenen Gewässertyp lake einführen: wenige flache Insel-/Uferfelsen statt Meeresnadeln, sehr wenig Schaum, feinere ruhigere Lichtstriche.
2. Linke Waldwand auflockern und ein flaches natürliches Ufer mit Schilfbuchten und Landzungen aufbauen. Fichten/Birken in Gruppen staffeln.
3. Zwei kleine Hütten-/Lagerplätze mit ebenem Boden, Steg, Boot und örtlichem Feuerlicht gestalten. Laternen nur an Wegen oder Plätzen belassen.
4. Mondreflex des Fernbilds und dynamischen Wassers bei Kurven gemeinsam prüfen. Nach Snowcap die wieder trockene Fahrbahn klar zeigen; Ziel C als ruhige Seeankunft komponieren.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Keine generischen Meeresfelsnadeln und keine starke Brandung im See.
- Mond und Reflex bleiben in beiden Kurvenrichtungen plausibel ausgerichtet.
- Boot, Steg, Feuer und Hütte besitzen nachvollziehbare Ufer-/Bodenkontakte; freies Seeufer bleibt befahrbar lesbar.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L410), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)


---

# 15 · Starlight Summit · Ziel D

**23. Oktober 2026 · Theme-ID `starlight-summit` · Spalte 5 von 5 · Priorität P1 für Zielmotiv, P2 für Gelände · relativer Umfang M.**

Gute nächtliche Tiefe; eigenes Gipfelziel und klare Lichtführung fehlen.

## Zielbild und belegter Aufbau

Nächtliche Auffahrt zum Observatorium mit kühlen Felsrippen, hochgelegenen Sichtfenstern, dunklen Nadelbäumen und einem eindeutigen Ziel unter Sternen.

Neuer Hang-Painter auf beiden Seiten, eigene kühle Rockvarianten und fünf Nachtkiefernsilhouetten; gruppierte Vegetation, keine Hausmodule. Hohe Straßenhügel und viele Kurven. Lampen alle 16 Segmente rechts; dunkel 1. Assets für Sternwarte, Radioteleskop, Antenne, Zelt, Kristall und kleines Teleskop existieren in `PROP_INFO` und als PNGs. **Keines davon wird von der Stagekonfiguration oder einem Sonderplatzierer am Straßenrand eingesetzt.** Das vorhandene Straßenbild ist damit primär ein nächtlicher Wald-/Felsberg. Ein fern eingezeichnetes Bauwerk wäre davon getrennt zu bewerten.

Geprüfte Bildserie: **11 Ansichten** auf Route `0 → 1 → 2 → 7 → 14`. Themenwechsel am Gate können am Anfang der Tafel noch die Vorgängerkulisse zeigen. Die Route ist eine Belegroute; weitere zulässige Vorgänger wurden für diese Stage nicht alle zusätzlich bildlich gefahren. Schilder-/Eisinventuren decken dagegen das gesamte Routennetz ab.

## Zustandsanalyse der tatsächlichen Ausgabe

- Kühle Felsflächen, mehrere Bergstaffeln und dunkle Nadelbäume ergeben bereits eine räumlich überzeugende Nachtfahrt.
- Einige große Vorderhänge sind noch sehr glatt und dreieckig. Einzelne grüne Buschflecken wirken im blauen Nachtbild auffällig hell.
- Die Straßenansichten liefern überwiegend Wald-/Felslandschaft. Eine erkennbare Anfahrt auf ein besonderes Gipfelziel entsteht daraus noch nicht.

![Fahransichten Starlight Summit](<bilder/starlight-summit.png>)

Die Tafel zeigt die Spielwelt in 320 × 180 ohne HUD. Unter jedem Bild stehen Kamerasegment und Zeit. Beispiele lassen sich damit für einen späteren direkten Vergleich wiederfinden. Die statischen Bilder beweisen keine flimmerfreie Echtzeitdarstellung.

## Schilder und Streckenführung

Keine Routenwahl mehr, Ziel D. Kurvenwarnungen und Gipfel-/Observatoriumswegweisung sauber unterscheiden; nicht aus dem Vorhandensein einer Antenne eine Straßenabzweigung ableiten.

Gelbe Kurvenzeichen sind an reale kommende Kurven gebunden. Eine momentan andere Kurvenrichtung kann die Vorwarnung eines S-Gegenschwungs sein. Das bleibt von den tatsächlich zufälligen grünen Highway-Wegweisern zu unterscheiden. Die konkreten Korrekturregeln und Pixel-/Zeitbetrachtung stehen im [Schilderreport](SCHILDER.md).

## Wetter und Fahrgefühl

Klare Nacht, normales Fahrmodell trotz großer Höhenwechsel. Kein versteckter Höhenwind und keine heimliche Vereisung. Dunkelheit bleibt eine visuelle Aufgabe; ein besonderer Windabschnitt wäre ein späteres, gesondert angekündigtes Design.

Die gewünschte Wirkung ist ein lesbares Arcadeereignis mit sofort verständlicher Gegenreaktion. Zusätzliche Physik ist nur dann sinnvoll, wenn sie sichtbar angekündigt ist und diese Stage spielerisch unterscheidet. Die Zahlen und Grenzen der bereits vorhandenen Kräfte stehen im [Wetterreport](WETTER-UND-FAHRGEFUEHL.md).

## Umsetzungsplan in sinnvoller Reihenfolge

1. Vorhandene Observatoriums-, Antennen- und Teleskopassets gezielt einsetzen: ein früher Aussichtspunkt mit Antenne, später sichtbare Kuppel, abschließend kleines Ankunftsplateau vor Ziel D.
2. Zwei bis drei Sichtfenster zum Sternenhimmel und Ferngebirge schaffen. Große Vorderhänge örtlich brechen; breite Felsrippen und ruhige dunkle Flächen kombinieren.
3. Büsche und Felskontakt auf die Nachtpalette abstimmen. Emissionsmaske vor der Verwendung heller Sternwartengebäude klären.
4. Lampen auf Zufahrt und Ankunft beschränken. Scheinwerferlicht weich und niedrig im Kontrast führen, damit es keine zusätzlichen Fahrbahnstreifen suggeriert.

Layout und Bodenanschluss zuerst mit vorhandenen Assets abnehmen. Neue Spritevarianten erst für die danach sichtbaren Lücken erstellen; ein detailreicheres Bild auf derselben unpassenden Fläche wäre kein ausreichendes Ergebnis.

## Stagebezogene Abnahme

- Antenne/Kuppel/Ankunft ergeben eine verständliche Steigerung bis Ziel D.
- Helle Buschflecken und Gebäude passen in die kühle Nachtbeleuchtung; nur echte Lichtquellen leuchten.
- Kurvenkante und Verkehr bleiben auch in den dunklen Zwischenstücken klar erkennbar.
- Eingang und Ausgang einschließlich Stageblend, eine normale Fahrt und beide erreichbaren Straßenränder prüfen. Kollisionen und Auslauf mit der sichtbar gezeichneten Landschaft abgleichen.
- Nachbarbilder bei Fahrtgeschwindigkeit auf wandernde Texturen, sprunghafte Konturen, verdeckte Pfeile und starke Helligkeitssprünge prüfen. Aktuelle Standbilder sind dafür die Kamerareferenz.

## Quellen und Weiterarbeit

Quellstand `48bb6cc`: [Stagekonfiguration](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/themes.ts#L433), [Platzierung und Bodenkontakt](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/track.ts#L637), [Zeichnung](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/render.ts#L806), [Physik](https://github.com/michaelingokahler-mordor/Velvet-Cruise/blob/48bb6cca567f3632d3aec8b4a7ba148d5f8faac8/src/game/race.ts#L511).

[Zur Gesamtübersicht](README.md) · [Alle Bildtafeln](Bilduebersicht.html) · [Vollständige Quell-/Bildteilanalyse](QUELL-UND-BILDBEFUNDE.md)


---

# Schilder und Streckenführung — Teilanalyse aller 15 Stages

Stand: 23.10.2026. Ausschließlich lesende Analyse des Spielcodes; eigene Messhilfen und Ergebnisse liegen unter `D:/Velvet Cruise/Code/output/stage-audit/`. Keine Spielcodeänderungen, keine Commits.

## Methode und belastbare Grenzen

- Aktuelle Quelldateien frisch mit esbuild gebündelt, daraus **alle 16 legalen vollständigen Routen** mit dem tatsächlichen `Track` erzeugt. Damit wurden alle 15 Themes und alle möglichen Stage-Vorgänger geprüft. Keine Spielstände oder Leaderboards geladen.
- Messhilfe: [sign-census.mjs](<D:/Velvet Cruise/Code/output/stage-audit/sign-census.mjs>); vollständige Instanzen, Richtungen, Kurvenwerte und Abzweige: [sign-census.json](<nachweise/schilderinventur.json>).
- Originale Sprite-Dateien `sign_left.png`, `hwy_sign.png`, `gantry.png`, `fork_sign.png` visuell betrachtet. Sie stimmen mit den beschriebenen Generatoren überein.
- **Verifiziert** bedeutet unten Quelltext, Sprite oder erzeugte Trackdaten. Angaben zur Verständlichkeit für einen Menschen und empfohlene Zeiten sind **Gestaltungsbewertung**, kein neuer menschlicher Fahrtest. Größen- und Zeitwerte sind analytische Näherungen für ebene Fahrbahn und maximale Geschwindigkeit.

## Zentrales Ergebnis

Der Verdacht des Nutzers trifft für **Thunder Highway** eindeutig zu: Seine grünen Wegweiser werden ohne Bedeutung für den Streckenverlauf als Dekoration verteilt und teils zufällig gespiegelt. Die gelben Kurven-Chevrons aller Stages sind hingegen tatsächlich aus Kurvendaten abgeleitet. Allerdings warnen sie teils vor dem Gegenschwung einer S-Kurve, während die Straße noch in die andere Richtung läuft; die gleiche Bildsprache wird dadurch als unmittelbare Lenkaufforderung missverstanden.

Es gibt zusätzlich einen konkreten Fehler bei Abzweigschildern: Auf der Küstenroute fehlen auf jedem rechten Zielpanel die Küsten-Icons.

## 1. Thunder Highway: grüne Wegweiser als Zufallsdekoration — Priorität P1

**Verifizierte Ursache:**

1. `hwy_sign` ist fest als weißer, nach oben links abbiegender Pfeil gezeichnet. [make_routes_a.py:407](<D:/Velvet Cruise/Code/tools/art/scenery/make_routes_a.py:407>), besonders Zeile 419.
2. Thunder Highway führt diese Grafik in den gewichteten Dekolisten links (`0,8`) und rechts (`0,4`). [themes.ts:231](<D:/Velvet Cruise/Code/src/game/themes.ts:231>), [themes.ts:234](<D:/Velvet Cruise/Code/src/game/themes.ts:234>).
3. Dekoration links wird aus der Liste zufällig ausgewählt; Pfeile werden weder mit `curve` noch mit `Fork` verbunden. [track.ts:700](<D:/Velvet Cruise/Code/src/game/track.ts:700>).
4. Rechts erhält **jedes** ausgewählte Prop zusätzlich `flip: r() < 0.5`. Damit kehrt sich auch die semantische Pfeilrichtung zufällig um. [track.ts:729](<D:/Velvet Cruise/Code/src/game/track.ts:729>), konkret Zeile 736.
5. Der Renderer reicht `inst.flip` unverändert an die horizontale Spiegelung weiter. [render.ts:327](<D:/Velvet Cruise/Code/src/game/render.ts:327>), [fb.ts:224](<D:/Velvet Cruise/Code/src/core/fb.ts:224>).

**Messung je Highway-Fahrt, bei allen acht vollständigen Highway-Routen identisch:**

| Eigenschaft | Anzahl |
|---|---:|
| Grüne `hwy_sign` am Stage-eigenen Straßenabschnitt | 208 |
| Pfeil links / Pfeil rechts | 169 / 39 |
| Ohne irgendeinen Fork innerhalb der nächsten 270 Segmente | 195 |
| Vor mindestens 120 Segmenten nahezu gerader Straße (`abs(curve) < 0,2`) | 63 |
| Pfeil entgegengesetzt zu einer bereits starken örtlichen Kurve (`abs(curve) > 2,8`) | 37 |

Konkretes Beispiel auf `[0,5,8,9,10]`: bei Segment **6735**, relativ **405** ab Highway-Beginn, zeigt `hwy_sign` nach links, während `curve = +3,5732` eine Rechtskurve beschreibt. Bei Segment **6502**, relativ **172**, wird rechts ein gespiegelter Rechtspfeil auf eine gerade Straße ohne nahen Abzweig gestellt. Das ist keine Aussage, dass jedes an einer Kurve stehende Richtungsschild die Kurve anzeigen müsste: Ein echtes Ziel-/Ausfahrtschild darf von der Kurve abweichen. Hier fehlt jedoch gerade das zugehörige Ziel bzw. die Ausfahrt.

**Plan:** `hwy_sign` aus Zufallslisten entfernen. Grüne Richtungszeichen ausschließlich als Streckenobjekte aus echten Forks erzeugen. Zwei separate Ebenen vorsehen: grüne Ziel-/Fahrstreifenhinweise aus `NEXT` und `Fork`, gelbe Kurvenwarnungen aus dem Kurvenprofil. Auf normalen Highway-Abschnitten neutrale Entfernungs-/Routenmarken ohne Abbiegepfeile verwenden. Semantische Sprite-Instanzen nie durch die allgemeine Deko-Spiegelung schicken.

## 2. Highway-Schilderbrücken zeigen eine nichtexistente rechte Ausfahrt — Priorität P1

**Verifiziert:** Der `gantry`-Generator malt drei Panels: zwei Pfeile nach unten links, einen Pfeil nach unten mittig und einen fest nach rechts oben knickenden Pfeil rechts. [make_routes_a.py:291](<D:/Velvet Cruise/Code/tools/art/scenery/make_routes_a.py:291>), insbesondere Zeile 303. Die Brücke wird alle 640 Segmente erzeugt, sofern sie gerade **nicht** im Fork, Gate oder Tunnelumfeld steht. [themes.ts:236](<D:/Velvet Cruise/Code/src/game/themes.ts:236>), [track.ts:787](<D:/Velvet Cruise/Code/src/game/track.ts:787>). Die Grafik erhält dabei keine Routendaten.

Gemessen: **10** solche Brücken pro Highway-Fahrt. Beispiel Segment **7360**, relativ **1030**: deutliche Linkskurve `−4,6`, kein Straßenabzweig, fest gemalter rechter Ausfahrtpfeil. Andere Brücken stehen auf Geraden, z. B. Segment 8000. Die nach unten gerichteten Pfeile können Fahrstreifen markieren und sind an sich plausibel; der rechte Abbiegepfeil behauptet dagegen einen abgehenden Fahrweg.

**Plan:** Tragwerk vom dynamisch gerenderten Schildinhalt trennen. Standardbrücken zeigen vier gerade Fahrstreifenpfeile bzw. Pfeile nach unten passend zu `LANES = 4`. Nur vor einem tatsächlichen Fork erscheinen getrennte Zielpanels links/rechts; Icons und kurze Namen kommen aus denselben Daten wie die Streckenwahl. Alle 640 Segmente darf weiterhin ein Tragwerk stehen, seine Beschriftung muss aber zum konkreten Straßenereignis passen.

## 3. Kurven-Chevrons: Richtung korrekt, Zeitpunkt und Bildsprache verbesserbar — Priorität P2

**Verifiziert:** Sobald `abs(curve)` von höchstens 2,8 auf mehr als 2,8 steigt, werden drei Tafeln **20, 60 und 100 Segmente vor diesem Schwellwert** gesetzt. Linksabbiegende Kurven erhalten `sign_left` auf der rechten Straßenseite; rechtsabbiegende Kurven `sign_right` links. Das ist die Außenseite der jeweiligen Kurve und grundsätzlich richtig. Diese Tafeln werden nicht zufällig gespiegelt. [track.ts:791](<D:/Velvet Cruise/Code/src/game/track.ts:791>). Die Originalgrafiken zeigen die richtige Richtung. [make_scenery.py:2403](<D:/Velvet Cruise/Code/tools/art/scenery/make_scenery.py:2403>).

Über alle 16 Routen ließ sich **jede** vorhandene Kurventafel einem passenden echten Schwellwert genau 20/60/100 Segmente voraus zuordnen: keine frei erfundene Pfeilrichtung, keine solche Tafel im Fork. Einige Dreiergruppen haben nur ein oder zwei verbliebene Tafeln, weil Gates/Tunnel oder spätere lokale Dekobereinigungen Instanzen entfernen. Das ist kein Richtungsfehler.

**Verifiziertes Wahrnehmungsproblem:** Vorwarnung für den zweiten Teil einer S-Kurve erscheint noch im ersten Kurventeil. Beispiel Palm Cove Segment **5266**, relativ **5226**: Rechtspfeil bei örtlicher Linkskurve `−4,5216`, zugehörige Rechtskurven-Schwelle erst bei 5366. Das Schild kündigt also tatsächlich eine spätere Rechtskurve an. Als einfacher Chevron ohne zusätzliche Information liest es sich jedoch wie „hier rechts entlang“.

Die Stage-Auswertung unten nennt solche Fälle; ihre Anzahl ist **keine Zahl falscher Kurvenwarnungen**, sondern markiert die Stellen für visuelle Nachprüfung.

**Plan:** Ereignisse aus zusammenhängenden Kurvenabschnitten statt nur einem Stärkeschwellwert ableiten. Für eine Einzelkurve früh ein klar erkennbares Warnschild, Chevrons dann entlang ihres äußeren Scheitelbereichs. Bei kurzem Richtungswechsel einmaliges S-Kurven-Symbol vor dem gesamten Wechsel; die Richtungs-Chevrons erst im jeweiligen Kurventeil. Die drei Tafeln nicht blind 100/60/20 Segmente vor dieselbe Stelle setzen. Sicht hinter Kuppen/Tunneln und Abstand zu Gates mitprüfen.

## 4. Abzweige und Zielnamen: Datenbindung stimmt, Küsten-Icons fehlen — P1/P2

**Verifiziert und positiv:** `NEXT` definiert links/rechts konsistent zur Out-Run-Dreiecksstruktur. [routes.ts:16](<D:/Velvet Cruise/Code/src/game/routes.ts:16>). Das Schild steht bei `f.nose − 2`, zeigt immer links/rechts und erhält seine beiden Icons aus `f.left` und `f.right`. [track.ts:815](<D:/Velvet Cruise/Code/src/game/track.ts:815>), [render.ts:258](<D:/Velvet Cruise/Code/src/game/render.ts:258>). Die beiden späteren Checkpoint-Banner bekommen ebenfalls die korrekten Zielnamen und werden ihrer Straße zugeordnet. [track.ts:884](<D:/Velvet Cruise/Code/src/game/track.ts:884>). Die Fahrbahn wird an der Nase nach dem Vorzeichen der Fahrzeugposition gewählt. [race.ts:776](<D:/Velvet Cruise/Code/src/game/race.ts:776>).

**Fehler:** Themes 0–4 haben kein `icon`. `forkSign()` versucht nur `bank.get(icon)`, wenn dieses Feld vorhanden ist; der sonst im HUD und der Kurskarte verwendete `icon_coast`-Fallback fehlt. [render.ts:266](<D:/Velvet Cruise/Code/src/game/render.ts:266>) gegenüber [ui.ts:33](<D:/Velvet Cruise/Code/src/game/ui.ts:33>) und [coursemap.ts:99](<D:/Velvet Cruise/Code/src/game/coursemap.ts:99>).

Damit ergeben sich auf `[0,1,2,3,4]` vier rechte Panels ohne Icon: Palm Cove → Coral Bluffs, Coral Bluffs → Surfside, Surfside → Cypress Point, Cypress Point → Twilight Bay. Links ist jeweils Highway/Vineyard/Forest/Star vorhanden.

**Plan:** sofort einheitlicher `icon_coast`-Fallback, mittelfristig individuelle Küsten-Icons. Zusätzlich eine Vorankündigung vor dem beginnenden Split mit beiden großen Ziel-Icons und kurzem Namen. Wiederholung am eigentlichen Split. Die Zielbanner stehen 60 Segmente **nach** dem Entscheidungspunkt; als lesbare Erstinformation sind sie spät. Das Frontschild direkt an der Nase ist ein bewusster, solider Median-Gegenstand (`hit = 0,55`); das kann bleiben, wenn die Aufteilung rechtzeitig angekündigt wird und klar erkennbar ist.

## 5. Lesbarkeit bei 320×180

**Analytisch abgeleitet:** `FOCAL = 140`, `SPR_S = 1522/140`, `SEG_LEN = 300`, `MAX_SPEED = 92 Segmente/s`. [config.ts:2](<D:/Velvet Cruise/Code/src/game/config.ts:2>). Die Skalierung folgt `sprite.width × inst.scale × SPR_S × FOCAL / Entfernung`. [render.ts:296](<D:/Velvet Cruise/Code/src/game/render.ts:296>).

Ein Chevron ist 32 Pixel breit mit Skala 1,8; bei 100 Segmenten Entfernung bleiben rund **2,9 Bildpixel**, bei 60 etwa **4,9**, bei 30 etwa **9,7**. Acht Bildpixel Breite erreicht es erst rund 36,5 Segmente vor der Kamera, also **0,40 s** bei Volltempo. Vier Pixel werden etwa 0,79 s vorher erreicht. Reale Reaktion hängt zusätzlich von Kuppe, Seitenposition, Nebel und Wagenüberdeckung ab. „100 Segmente Vorwarnung“ sind somit keine Garantie für eine volle Sekunde lesbare Richtungsinformation.

Die 18×18-Icons auf dem Forkschild schrumpfen zu wenigen Pixeln. Durch die fehlende Frühankündigung sind die beiden Ziele im Fahrbild schwerer zu vergleichen als die bloßen Links-/Rechtspfeile. Lange Zielnamen auf den späteren Bannern werden schon in der Sprite-Erzeugung heruntergestuft und dann zusätzlich perspektivisch verkleinert. [render.ts:242](<D:/Velvet Cruise/Code/src/game/render.ts:242>).

**Gestaltungsregeln:** Pfeile als große, klare Form priorisieren; keine zusätzlichen feinen Texturen im Piktogramm. Bei mittlerer Entfernung eigene vereinfachte Schildstufe mit dickerem Pfeil statt nur kleinerem Original. Zielnamen kurz halten; Icons, Farben und Seitenausrichtung zwischen Straßenzeichen, Karte und HUD konsistent halten. In Regen/Nebel/Nacht die wichtigen Zeichen gegenüber der restlichen Landschaft weniger abdunkeln bzw. bewusst reflektierend ausführen, ohne flächiges Neonleuchten. Neue Mip-/Distanzstufen im bewegten 320×180-Bild prüfen, nicht nur im vergrößerten Screenshot.

## 6. Stage-spezifischer Bestand und Plan

Die Anzahlen beziehen sich auf `startSeg <= i < endSeg` der Stage. Der weiter hinten liegende Übergang kann optisch noch das vorherige Theme tragen. Die Werte sind auf allen jeweils vorkommenden legalen Routen identisch.

| Stage | Kurventafeln | Davon vor Gegenschwung, örtlich noch andere Richtung | Weitere Schilder / konkreter Plan |
|---|---:|---:|---|
| Palm Cove | 18 | 2 | Erstes Forkschild rechts ohne Coral-Icon. Fallback ergänzen; die zwei S-Kurven-Vorwarnungen in das neue S-System übernehmen; freie Auslaufzone beibehalten. |
| Coral Bluffs | 30 | 5 | Forkschild rechts ohne Surfside-Icon. Kurventafeln von den jetzt nahen Felskulissen optisch freihalten; Schildergrundfläche erkennbar auf Straßenhöhe, nicht im Fels. |
| Surfside | 34 | 6 | Forkschild rechts ohne Cypress-Icon. Weniger gleichzeitige Konkurrenz zwischen Reklame, touristischer Deko und Warnpfeilen; sichtbare Abstände zu Palmen/Gebäuden. |
| Cypress Point | 47 | 16 | Besonders viele S-Kurven-Überlagerungen. Vorwarnlogik priorisieren; Schilder gegen dunkle Baumkulissen absetzen. Rechtes Twilight-Zielsymbol fehlt. |
| Twilight Bay | 44 | 5 | Keine weitere Verzweigung; lesbarer Zieleinlauf und Kurvenwarnung im Dunkel priorisieren. Keine Richtungszeichen für eine ausgedachte Ausfahrt ergänzen. |
| Thunder Highway | 24 | 5 | 208 zufällige grüne Wegweiser und 10 Brücken mit fester rechter Ausfahrt: **höchste Schilder-Priorität**. Auf echte Routen-/Fahrstreifeninformation umstellen, Deko-Pfeile entfernen. |
| Vineyard Valley | 32 | 4 | Keine grünen Zufallspfeile; einzelne Kurvenwarnungen von rhythmischen Weinreben/Bäumen freihalten. Zielpanels für Snowcap/Redwood sind datenmäßig korrekt. |
| Redwood Pass | 47 | 8 | Nebel verringert frühe Erkennbarkeit. Lesbare Einzelwarnung vor Kurven, S-Symbolik und Kontrast vor Baumstämmen; keine beliebige Nebel-bedingte Lenkaufforderung. |
| Painted Desert | 32 | 6 | Gelbe Tafeln gegen warme Sandfarben stärker umranden; S-Warnungen und echte Ziele behalten. Grüne Highway-Assets nicht als Wüstendeko übernehmen. |
| Death Valley | 13 | 2 | Wenige Kurventafeln reichen bei langen Geraden. Richtungsinformationen vom Hitzeflimmern fernhalten bzw. dessen Stärke auf Verkehrszeichen begrenzen; Wegweiser nur für Neon/Gold-Fork. |
| Neon City | 40 | 10 | Gantry-Ersatz ist `neon_arch_lit`, also kein gemalter Highway-Ausfahrtpfeil. Kurventafeln gegen Neonwerbung visuell priorisieren; keine neue Ampel-Stoppmechanik für Out-Run-Fahrt erzwingen. |
| Snowcap Pass | 31 | 5 | Zusätzlich **36 Eiswarnschilder**. Echte Eispatches statt Zufallssymbolik, aber Vorlauf/Lesbarkeit und linke Randlücke verbessern. Schneefall darf Eiswarnung nicht verschlucken. |
| Gold Rush Town | 18 | 1 | Geschäftsschilder sind Kulisse, Fahrpfeile sind Führung. Klare Silhouetten/Abstände schaffen; ruhiger Zieleinlauf, keine Ausfahrt ankündigen. |
| Crystal Lake | 33 | 4 | Uferlaternen und dunkle Vegetation können Warnpfeile verdecken. S-System, reflektierende Warnflächen und eindeutiger Zieleinlauf. |
| Starlight Summit | 51 | 15 | Zusammen mit Cypress größte S-Kurven-Semantikaufgabe. Kurvenhinweise an Kuppen rechtzeitig sichtbar, scharfe Trennung von kleinen Stern-/Lichtpunkten. |

## 7. Eiswarnungen und freie Randflächen

Die Eiswarnungen sind anders als Highway-Wegweiser an ein tatsächliches Ereignis gebunden. Je Patch ein Paar 110 Segmente vorher sowie rechts ein weiteres Schild 55 Segmente vorher. Das sind bei Maximaltempo rund **1,20 / 0,60 s bis Patchbeginn**, nicht notwendigerweise bereits lesbare Vorwarnzeit. [track.ts:429](<D:/Velvet Cruise/Code/src/game/track.ts:429>) und [track.ts:457](<D:/Velvet Cruise/Code/src/game/track.ts:457>).

Links wird die Position durch `wallOff − 0,3` begrenzt, obwohl dadurch die normale Freiflächenregel unterschritten werden kann. Ein erzeugter Snowcap-Abschnitt hat minimale Schild-Innenkante `abs(x) − hit = 1,17843`; die nominelle Randkante ist 1,18, die normale Mindestkante für Prop-Kollisionen wäre 1,40. Die Überschneidung der Randkante ist winzig, der eigentlich zugesagte Zwischenraum von 0,22 fehlt aber vollständig. **P1:** Schild nur dort setzen, wo normale Freifläche und Wandabstand gemeinsam möglich sind, sonst längs versetzen oder an geeigneter Stelle ersetzen; niemals still in die Randfläche drücken.

Normale Kurventafeln liegen dagegen bei `abs(x) = 1,75`, `hit = 0,35`, also Innenkante **1,40**: Sie respektieren die Freiflächenregel. [track.ts:422](<D:/Velvet Cruise/Code/src/game/track.ts:422>), [themes.ts:500](<D:/Velvet Cruise/Code/src/game/themes.ts:500>).

## 8. Empfohlene Reihenfolge und Abnahme

1. **P1:** Zufällige Highway-Pfeile und die nichtexistente Gantry-Ausfahrt beseitigen; Schildtyp, Richtung, Ziel und Zugehörigkeit als explizite Bedeutung verwalten. Küsten-Icon-Fallback korrigieren.
2. **P2:** Frühankündigungen für echte Abzweige, dann Richtungswarnung/S-Kurve/Leitchevron voneinander trennen. Eiswarnungen mit freier Randfläche und konsistenter Vorwarnzeit.
3. **P2:** Sichtbarkeit in 320×180, Nacht, Nebel, Regen, Schnee, Hitze und hinter Kuppen anhand deterministischer Fahrsequenzen abstimmen.

**Maschinell prüfbare Abnahme:**

- Alle 16 legalen Routen erzeugen; jedes Richtungsobjekt besitzt einen Typ und eine reale Referenz auf Kurvenereignis oder Fork. Kein Richtungsobjekt aus einer dekorativen gewichteten Zufallsliste.
- Kein semantisches Schild wird zufällig gespiegelt; Links/Rechts-Inhalt entspricht immer dem referenzierten Ereignis. Kurvenwarnung und Zielwegweiser getrennt prüfen.
- Jeder grüne Abbiegepfeil gehört zu einem tatsächlich abgehenden Straßenast. Standard-Gantries dürfen Fahrstreifenpfeile ohne Ausfahrt zeigen.
- Jeder Fork besitzt zwei nichtleere Ziel-Icons; angezeigte Icons/Namen stimmen vor und nach einer dynamischen Routenwahl mit `NEXT` und dem späteren Gate überein.
- Schilder-Innenkanten respektieren normale Freifläche; Ausnahmen wie das bewusst im Median stehende Forkschild werden explizit ausgewiesen.
- Gleichbleibende Entscheidungspunkte, Kollisionen, Routing, Bestzeiten und Save-/Replay-Verträge; die Grafikänderung darf keine unsichtbare Regeländerung bewirken.

**Visuell/fahrerisch zu bestätigen:**

- Bei hoher Geschwindigkeit kann eine Person einen angekündigten Ast vor der Verzweigung erkennen und auswählen, ohne auf die Kurskarte zu wechseln. Startziel: 1,5–2,0 Sekunden klar erkennbare Vorinformation; tatsächliche Umsetzbarkeit mit Weltgeometrie und unverändertem 320×180-Bild prüfen.
- Ein Kurvenschild fordert während des ersten S-Schwungs nicht scheinbar zum Gegenlenken auf; entweder erkennbares S-Vorzeichen oder Chevron im richtigen Kurventeil.
- Relevante Pfeile bleiben trotz Wetter, Nacht und Hintergrund erkennbar. Im bewegten Originalraster keine flimmernden Einpixel-Pfeilspitzen und kein unlesbarer Kleinsttext als alleinige Information.



---

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
