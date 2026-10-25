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
