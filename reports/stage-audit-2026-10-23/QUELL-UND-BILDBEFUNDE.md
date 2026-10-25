# Grafikprüfung aller 15 Stages – Quellbefunde und Arbeitsplan

Stand: 23. Oktober 2026. Teilanalyse für den Gesamtbericht. Nur gelesen; kein Spielcode geändert. Diese Fassung trennt belegte Konfiguration von vermuteten Bildproblemen. Nach dem Quellstudium wurden alle 15 echten Kontakttafeln des Hauptaudits gesichtet; bestätigte Bildbefunde stehen im folgenden Abschnitt. Schilderlogik und Wetterphysik werden gesondert untersucht.

## Sichtprüfung der echten Renderbilder

Grundlage sind `contact-<theme-id>.png` mit mehreren echten Fahrpositionen je Stage, keine entworfenen Zielbilder. Die Tafeln zeigen Szenen ohne HUD. Sie erlauben eine Aussage über Gestaltung und Raum; Flimmern, Mensch-am-Steuer-Fahrgefühl und natives EXE-Verhalten bleiben dadurch ungetestet. Die als `fork`/`sign` beschrifteten frühen Bilder zeigen teils noch die Vorgängerstage und wurden nicht versehentlich als Zielgestaltung bewertet.

| Stage | Visuell bestätigt | Konsequenz für den Plan |
|---|---|---|
| Palm Cove | Weite, niedriger Mittelgrund und kleine Siedlungen funktionieren. Es gibt bewusst große ruhige grüne Flächen. Sonnenpfad auf dem Wasser sichtbar. | Bestehenden Aufbau bewahren. Details nur als Inseln, nicht flächendeckend aufladen. |
| Coral Bluffs | Ferne liegt ruhig hinter niedrigen trockenen Hügeln; linke Kurve zeigt grobe strukturierte Schnittwand. Dörfer stehen tief. | Erfolgreiche Raumtrennung erhalten. Nur Nahtstellen/Felshäufigkeit abnehmen. |
| Surfside | Strandhäuser und Palmen ergeben lesbaren Ort, sehr breite ruhige Sandflächen. Niedrige braune Wand hat eine auffallend regelmäßige Zackenkrone. Ferne große violette Berge bilden längere geschlossene Flächen. | Orts-/Strandmodule vor neuen Einzelassets; Dünenkante natürlicher. Ferne farblich erhalten, einzelne Öffnungen prüfen. |
| Cypress Point | Gute Hain- und Felsstaffelung, aber große leuchtend grüne steile Flächen bei orangeviolettem Abendhimmel. Bäume wirken warm, Gelände teilweise eher taghell. | Materialhelligkeit auf Dämmerung abstimmen und Vorderhangabschnitte öffnen; nicht zuerst mehr Textur. |
| Twilight Bay | In `view-02 seg 28111`, `view-03 seg 29069` und weiteren Bildern dominieren riesige violett gebänderte Nahwände. Weiße Häuser sitzen direkt auf den steilen Flächen und sind fast tagsüber hell. | Höchste Priorität für Grundstücke, Raumumbau und echte Emissionsmasken. Nachtvilla ist nicht nur eine Frage subjektiven Palettengeschmacks. |
| Thunder Highway | Weißgraue Wände besitzen eine stark gezackte obere Linie; große Mastenreihen und Lampen wiederholen sich deutlich. Regen, Gewitterhimmel und nasse Fahrbahn sind als eigenes Motiv erkennbar. | Technische Plattenwand mit klaren geraden Pfostenachsen statt zufälligem Naturzackenprofil. Regenmotiv behalten. |
| Vineyard Valley | `view-04 seg 15669`, `view-06 seg 17685`, `view-07 seg 18624` zeigen schräg gebänderte grüne Wand mit hinein-/daraufgeklebten Weingütern. Regelmäßige Rebreihen sind sehr dominant am Straßenrand. | Weit nach hinten versetzte Hügel, bebaubare Höfe und echte Rebparzellen sind eine große Verbesserung. |
| Redwood Pass | Nebel und gestaffelte Waldferne funktionieren. Nahe Forest-Wände sehen wie hohe grüne/braune Zackenflächen aus; riesige Redwoodstämme geben dagegen bereits ein gutes Maßstabsgefühl. | Redwood-Größe bewahren, Wände brechen/absenken, Wurzeln und Gruppen statt mehr Baumzahl. |
| Painted Desert | Eigenständige offene Mesawüste ist klar erkennbar. Flächiger Sandfilter plus viele kurze helle Striche überziehen auch die Fahrbahn. Nahmesas und Kakteen stehen sehr gleichrangig in weitgehend ebenem Raum. | Lesbarkeit/Teilchenruhe zuerst; Geländevariation breit und sparsam, Kakteen als Inseln. Keine Wand nötig. |
| Death Valley | In praktisch allen Hauptansichten geschlossene hohe braunviolette Bandwand links. Rechts ruhige helle Weite, aber gebogene/gezackte Masten und Kleinstobjekte. | Linke Wand als entfernte Gebirgskette auflösen. Hitzeflimmern nicht mehr über jeden nahen Stamm legen. |
| Neon City | Eigenständige, sofort lesbare Neonstadt; gute dunkle Fahrbahn, aber sehr gleichmäßig dichter Fensterraster und permanent bunte Dach-/Straßenkanten. Tunnel wirkt als geometrisch ruhige Passage. | Kein Landschaftsumbau. Fenster-/Leuchtdichte gewichten, Bezirke und Straßenfunktionen komponieren. |
| Snowcap Pass | `view-01 seg 20070`, `view-02 seg 20842` und fast alle folgenden Positionen sind beidseits durch riesige graue Wände mit sägezahnförmigem, gleichmäßig weißem Schneerand eingeschlossen. Eis ist als bläuliche Fahrbahnfläche erkennbar. | Sehr hohe Priorität für Schnee-/Felsformen und Gipfelaussichten. Vorhandene Eislesbarkeit ausbauen statt verschleiern. |
| Gold Rush Town | Einzelne attraktive Westernfassaden, aber der Ort bleibt locker zerstreut zwischen fast gleichartigen Kakteen/Felsen. Das Hitzeflimmern macht Laternen und Kakteen deutlich zickzackförmig. | Ortsblöcke, Gehsteige und Höfe bauen; Hitze nur in der Ferne, stark reduzierte Verzerrung. |
| Crystal Lake | Schöne klare Berg-/Mondkulisse und heller Spiegelpfad. Tatsächlich mehrfach Meeresfelsnadeln im See. Straßenlaternen stehen wie eine gleichmäßige Reihe am grünen Rand, ohne erkennbaren Weg. | See-/Meerregeln trennen, Uferplätze und Laternenwege bilden, Waldwand auflockern. |
| Starlight Summit | Kühle nachtblaue Hänge und Kiefern sind vorhanden; Hänge bleiben groß und geometrisch, einzelne kleine grüne Buschflecken heben sich sehr hell ab. Kein sichtbares Sternwartenmotiv in den gesichteten Straßenpositionen. | Echte Zielkomposition mit existierenden Sternwartenassets, Buschpalette beruhigen, wenige große Felsformen mit Aussichtslücken. |

### Belegte gemeinsame Ursache: Fassaden werden als Lampen behandelt

Die hellen Nachtvillen von Twilight Bay haben einen konkreten technischen Grund: `tools/pack_assets.py:60` markiert das ganze Sprite `house_lit` als emissiv. `src/core/assets.ts:58–63` erklärt anschließend jeden Spritepixel mit Helligkeit über 200 zur Lichtquelle (Alpha 254). `src/core/fb.ts:255` nimmt solche Pixel vom Stage-Tint aus. Dadurch bleiben auch helle verputzte Fassaden hell, unabhängig davon, ob sie selbst leuchten sollen. Das betrifft potentiell jedes helle `*_lit`-Gebäude.

**P1:** separate Lichtmaske oder explizit markierte Materialfarben für Fenster, Birnen und Feuer. Putz, Dach, Schnee und Sockel müssen weiter auf Abend-/Nachtlicht reagieren. Nicht als Gegenmaßnahme sämtliche hellen Pixel im Asset dunkler färben; das verdeckt die falsche Materialzuordnung und schränkt Tagesvarianten unnötig ein.

### Belegte gemeinsame Ursache: Hitze verbiegt auch nahe Objekte

`render.ts:513–525` verschiebt nach der eigentlichen Szenenzeichnung komplette Bildzeilen zwischen `HORIZON - 12` und `HORIZON + 28`. Die Verschiebung kennt keine Tiefenmaske. Alles, was in dieser Höhe auf dem Bildschirm liegt, wird gleich mitgenommen, auch nahe Kakteen und Lampen. Das erklärt die im Gold-Rush- und Death-Valley-Kontaktbild sichtbaren Zickzacklinien. **P1/P2:** eine ferne Szenenebene vor dem Nahobjektpass verzerren oder eine Tiefenmaske verwenden, Amplitude reduzieren und zwei bis vier zusammenhängende Pixelzeilen ruhig bewegen statt jede Zeile anders. Die Spieler-/Fahrbahnlesbarkeit hat Vorrang vor meteorologischer Auffälligkeit.

## Maßstab und Grenzen

Das vereinbarte Ziel ist sorgfältig komponierte Pixelgrafik mit Amiga-Anmutung bei 320 × 180. Das bedeutet absichtliche Farbgruppen, ruhige Fernkulissen, lesbare Silhouetten, räumlich nachvollziehbare Landschaft und klare Fahrbahn. Eine starre historische Amiga-Farbzahl ist daraus nicht abzuleiten. `STYLE.md` spricht teilweise noch von System-16-Arcadegrafik; dieser ältere Text sollte auf das vereinbarte Ziel abgestimmt werden.

`STAGE_LOOK.md` enthält die richtigen Grundsätze – breite unregelmäßige Formen, kein Pixelrauschen, Gebäude auf echten Grundstücken, Gruppen mit Lücken, feste Lichtseite, einheitliches Pixelraster. Seine Statusliste ist eine Arbeitsnotiz und kein Qualitätsnachweis. Palm Cove und Coral Bluffs besitzen inzwischen eigene räumliche Geländequerschnitte (`cove.ts`, `bluffs.ts`), die über den dort beschriebenen normalen Hang-Painter hinausgehen.

**Belegt aus Code:** Palm Cove, Coral Bluffs, Cypress Point und Starlight Summit haben `terrain`; Surfside hat als zusätzliche Verbesserung `groups: true`. Von den übrigen Stages verwendet Neon City eigene Gebäudewände und Tunnel, Painted Desert überhaupt keine Wand. Sieben weitere Stages verwenden noch die alte Naturwand, Surfside die alte niedrige Town-Wand, Thunder Highway die alte Sound-Wand. Der alte Painter alterniert Farben abschnittsweise und sein Kamm erhält segmentweises Jitter. Streifen und unruhige Kanten sind daher strukturell zu erwarten, ihre genaue Sichtbarkeit muss das Fahrbild zeigen.

**Wichtiger gemeinsamer Unterschied:** Bei normalen alten Hängen werden `topProps` auf einer Höhenfraktion platziert, nicht auf einer ebenen Baufläche. Häuser in Twilight Bay und Weingüter in Vineyard Valley sind deshalb echte Kandidaten für schwebende oder in den Hang geklebte Sockel. Ein Gebäudesprite mit eingezeichnetem Sockel allein löst den Hangkontakt nicht.

## 01 · Palm Cove · `palm-cove`

**Zielidentität:** heller Küstenauftakt mit warmer Sonne, blauem Wasser, lockeren Palmen, durchlüfteten grünen Hügeln und kleinen Siedlungen. Referenz für Tiefe und Bodenanschluss, nicht eine Vorlage, die allen anderen Stages dieselbe Vegetation gibt.

**Ist, belegt:** Eigenes geschlossenes Geländevolumen mit niedrigem Straßenbankett, breiter Terrasse und weiter hinten liegenden Hügeln. Gebäude werden auf Welt-Höhe eingeebnet; Bäume und Büsche folgen der tatsächlich gezeichneten Oberfläche. Große Auswahl an Palmen, Büschen, Felsgruppen, Grasbüscheln, Villen und Kapelle. Separate Anfangsbepflanzung; rechts Meer und Leitplanke. Sonnenglanz wird sowohl am Horizont als auch im sichtbaren Wasser gezeichnet.

**Risiken / visuell zu prüfen:** Die inzwischen zahlreichen Einzelheiten können bei Geschwindigkeit zu einer gleichmäßigen grünen Textur werden. Küstenfelsentürme werden über die gemeinsame Wasserregel wiederholt erzeugt. Die sichtbare Geländeform und die aus Kompatibilitätsgründen beibehaltene Kollisionswand sind nicht dieselbe Geometrie; freie Wiesen müssen an den erreichbaren Rändern zur tatsächlichen Grenze passen.

**Plan:** P1 bestehende Tiefe bewahren und die Oberfläche nur lokal nachbessern: größere Gras- und Buschgruppen, einzelne grobe Felsen, freie Abschnitte. P1 Sonnenreflex mit der sichtbaren Sonnenposition in Links- und Rechtskurven abnehmen. P2 Siedlungstaschen mit wenigen wiedererkennbaren Kompositionen abwechslungsreicher gestalten, ohne die gesamte Hügelkontur neu zu zeichnen. P2 erreichbaren Außenrand der Wiese gegen die Kollisionsgrenze fahren und bei Bedarf optisch erklären. Abnahme: Start, zwei Siedlungen, beide Kurvenrichtungen, volle Fahrt und langsame Randfahrt.

## 02 · Coral Bluffs · `coral-bluffs`

**Zielidentität:** trockene Küstenhügel und kleine Dörfer; massive Berge bleiben in der Ferne, kurze Sandsteineinschnitte rücken innen in Linkskurven heran.

**Ist, belegt:** Eigener Geländequerschnitt; Felsnase wird gezielt aus negativer Kurve abgeleitet. Gebäude und Leuchtturm haben ebene Grundstücke. Nahfelsen besitzen unregelmäßigen Kamm, größere Flächen, mineralische Einsprengsel und kurze Klüfte. Die Fernberge wurden auf Wunsch wieder auf die ruhigere vorherige Polygonkulisse zurückgestellt. Das ist ein gewollter Stand, kein offener Fehler.

**Risiken / visuell zu prüfen:** In langen Linkskurven darf die strukturierte Schnittwand nicht wieder als endlose hohe Fläche erscheinen. Stark kontrastierende Einsprengsel müssen in der Nähe bleiben und in der Ferne wegfallen. Hügel, neue Felsgruppen und ältere solide Felsen können sich an einzelnen Stellen überlagern. Die wiederhergestellte Fernkulisse bewusst respektieren.

**Plan:** P1 nur noch Übergänge zwischen offener Landschaft und Einschnitt sowie die Einfahrt in Grundstücke glätten. P1 Nahtextur über Bewegung beurteilen, keine weitere Detailaufladung der Berge. P2 zwei oder drei bewusst verschiedene Felsabschnitte statt überall derselben Einsprengselverteilung. P2 Dorf- und Leuchtturmkompositionen als feste Blickpunkte erhalten. Abnahme: längste Linkskurve, Felsanfang/-ende, Leuchtturm, zwei Dörfer und sonnenseitige Meerblicke.

## 03 · Surfside · `surfside`

**Zielidentität:** lebendiger Strandort im kräftigen Sonnenuntergang; Strand, Hütten, Rettungstürme und Sonnenschirme bilden kleine Aufenthaltsbereiche.

**Ist, belegt:** Kein neues Terrainprofil; niedrige `town`-Wand mit Lücken. Gebäude und Palmen werden über `groups: true` in Häufungen verteilt. Hütten und Rettungstürme erhalten bereits eine überlappende Holzplattform. Häuser, Palmen, Büsche, Werbetafeln und Surfboards links; Schirme, Rettungstürme und Palmen rechts. Die Leitplanke verschwindet abhängig von der Küstenform abschnittsweise; Strand ist deutlich breiter als in den anderen Küstenstages. Kräftigste Sonnenreflexion (`sunGlow: 1`).

**Risiken / visuell zu prüfen:** Zufällig zusammen gewählte Objekte sind noch keine verständliche Strandkomposition. Hütten, Schilder und Boards können gleichrangig nebeneinander stehen. Niedrige, segmentweise gezackte Town-Wand kann hinter Häusern wie eine gemalte Platte wirken. Solide Strandobjekte dürfen den vereinbarten Auslauf nicht scheinbar völlig schließen.

**Plan:** P1 Strand in erkennbare Module gliedern: ein Rettungsbereich, ein Schirmfeld mit freier Lücke, ein kleiner Hüttenplatz. P1 Haus- und Hüttenuntergrund durchgehend an Strand-/Ortsgrund anschließen. P2 Town-Wand durch niedrige Dünen, Mauern, Gärten und Gehwege ersetzen. P2 Strandzugänge und Beginn/Ende der Leitplanken plausibel gestalten. P2 ein eigener Holzsteg oder Surfclub als Orientierungspunkt. Die starke Sonnenuntergangspalette und das offene Meer bleiben der Hauptreiz.

## 04 · Cypress Point · `cypress-point`

**Zielidentität:** felsige, dunkler werdende Küstenstraße mit Zypressenhainen und einzelnen Schirmkiefern, sichtbar andere Silhouetten als Palm Cove.

**Ist, belegt:** Neuer Hang-Painter mit Wiesen, Senken und Ausläufern; sechs gewichtete Baumvarianten, Buschgruppen und eigene `point_rock_*`-Varianten. Keine Häuser-/Dorfmodule. Linke Seite `forest`, rechts weiterhin Küste mit Leitplanke und einzelnen Zypressen, Steinen und Wasserfelsentürmen. Warme violette Dämmerung; jedoch kein `dark`-Wert gesetzt.

**Risiken / visuell zu prüfen:** Obwohl besser bemalt, bleibt es geometrisch ein zusammenhängender vergleichsweise steiler Forest-Hang. Baumfüße auf diesem Hang können wieder die geschlossene grüne Wand verstärken. Tageshelle Geländefarben werden direkt gezeichnet und Sprites separat warm gedämpft; ihre Helligkeit muss zusammenpassen. Der fehlende Dunkelwert heißt nicht automatisch falsch, aber die Dämmerungsbeleuchtung und Fahrzeuglichter sollten im Vergleich zum Himmel geprüft werden.

**Plan:** P1 zwei bis drei Küstenfenster mit abgesenktem Vordergrund zwischen den Hainen. P1 Pinien und schmale Zypressen in verschieden großen Gruppen statt gleich dichter Kante. P2 Felsvorsprünge unten ansetzen, Boden mit Nadeldecke und niedrigem Gestrüpp erklären. P2 Lichtabstimmung für den Übergang Surfside → Cypress → Twilight. Abnahme in Kurven gegen den dunklen Baumgrund: Fahrbahn und Gegenverkehr müssen zuerst lesbar bleiben.

## 05 · Twilight Bay · `twilight-bay` · Ziel E

**Zielidentität:** ruhige beleuchtete Küstenbucht am Ende der rechten Route; vereinzelte Häuser und Promenadenlichter, dunkles Wasser und warmes Ziel.

**Ist, belegt:** Alte `hill`-Wand mit drei Farbbändern. `house_lit` liegt im normalen Straßenobjektpool und zusätzlich stark gewichtet auf dem Hang; Hanghäuser erhalten keine geplanten ebenen Grundstücke. Wiederkehrende Lampen werden zufällig aus dem Objektpool gewählt, nicht entlang einer Promenade geplant. Dunkelheit 1; warme Lichtflächen für `*_lit` existieren. Meerreflexion schwächer als bei Surfside. Allgemeine Meeres-Felstürme bleiben aktiviert.

**Risiken / visuell zu prüfen:** Hohe Priorität für unsichere Hausfüße, dunkel gestreifte Hügel und fehlenden Ortszusammenhang. Im vollen Nacht-Tint können Häuser-/Baumflächen zu dunklen Klumpen verschmelzen, während Lampen grell bleiben. Ein Zielort braucht eine räumlich erkennbare Ankunft und darf nicht nur eine umgefärbte Küstenstraße sein.

**Plan:** P1 Hügel hinter eine niedrige Küstenbebauung rücken; Hausgruppen auf echte Welt-Höhen-Grundstücke setzen. P1 kleiner Fußweg/Promenade mit begründeten Lampenabständen. P1 dunkle mittlere Tonstufe zwischen nahen Silhouetten und Himmel erhalten. P2 ruhige Bucht mit wenigen nahen Reflexen, keine neue Glitzerfläche. P2 vor Ziel E ein eigener warmer Ankunftsbereich: niedrige Häuser, Platz, Hafenlichter oder Steg, mit freiem Auslauf. Die Zielinszenierung als bewusste Komposition planen.

## 06 · Thunder Highway · `thunder-highway`

**Zielidentität:** breite, schnelle Interstate im Gewitter, nasser Asphalt, kontrollierter Rhythmus aus Beleuchtung und Lärmschutz; im Hintergrund Regenvorhänge und ferne Stadt.

**Ist, belegt:** Boden auf beiden Seiten; niedrige `sound`-Wände links und rechts. Lampen alle 14 Segmente beidseitig; Brücken alle 640 Segmente. Pylonen, Tafeln, Büsche und Barrieren aus Zufallspools. Weniger Höhenwechsel und Kurven als die Wald-/Bergstages. Eigene Regen-/Blitzdarstellung und feuchter Straßenlook sind vorhanden. Keine Terrainkonfiguration; die Sound-Wand verwendet alte wechselnde Farbbänder.

**Risiken / visuell zu prüfen:** Die Bandwand eignet sich nicht als natürliche Hügellandschaft, könnte aber als technische Lärmschutzwand bewusst neu gerastert werden. Gleichmäßige Lampen plus gleichmäßige Wand erzeugen leicht einen Tunnel ohne Dach. Kleine Büsche und zufällige Pylonen erklären keinen realen Autobahnkorridor. Harte Kontraste durch Regen, Reflektoren, Blitze und Schilder können konkurrieren.

**Plan:** P1 Schilder zuerst mit der separaten Richtungsprüfung reparieren. P1 Lärmschutz als klare horizontale Platten mit Pfosten und längeren Unterbrechungen statt segmentweiser Farbwechsel. P1 Spiegelungen an konkreten Lichtquellen orientieren; Markierungen und Verkehr bleiben vorrangig. P2 seitlich freie Stellen mit tieferem Grünstreifen und fernem Hügel-/Stadthorizont. P2 Bauwerke in wenige feste Motive gliedern: Beschilderungsgruppe, Überführung/Versorgungszone, freier Korridor. Infrastrukturrhythmus bewusst behalten; natürliche Objekte unregelmäßig gruppieren.

## 07 · Vineyard Valley · `vineyard-valley`

**Zielidentität:** weite Weinlandschaft mit warmen Hängen, geordneten Rebflächen, Zypressen und kleinen Weingütern.

**Ist, belegt:** Alte Hill-Wand links, rechts keine Wand. Weinreben alle 3 Segmente an fünf festen Querpositionen, mit nur 0,04 Querjitter und einer ausgedünnten Dichte. Zypressen, Oliven, Weingüter, Fässer, Heuballen und Windmühlen zufällig daneben. `winery` wird zusätzlich auf den Hang gesetzt; keine Grundstücksplanung. Hügelmultiplikator 1,5; landschaftlicher Fernhintergrund mit Weinbergen und Dorf vorhanden.

**Risiken / visuell zu prüfen:** Rebreihen sind grundsätzlich passend, verlaufen aber straßenparallel statt in plausiblen Parzellen. Eine regelmäßige Reihe nah an der Fahrbahn kann zu einem Gartenzaun werden. Alte grüne Bandwand und zufällig aufgesetzte Winery können den jüngst beseitigten Küstenfehler wiederholen. Bei rechts gespiegelten Objekten dreht sich auch die eingezeichnete Lichtrichtung.

**Plan:** P1 flachere Rebterrassen vor weiter hinten liegenden Hügeln; Weingüter auf ebenen, zugänglich wirkenden Höfen. P1 Reben in wenigen größeren Feldern mit natürlichen Grenzen, Wegen und Blicklücken. P2 Reihenrichtungen pro Feld unterscheiden und an Gelände anpassen; nicht einzelne Reben zufällig versetzen. P2 Fässer/Heuballen ausschließlich bei Höfen bzw. Arbeitsbereichen gruppieren. P2 zwei Landmarken, etwa Weingut und Windmühle, mit längeren ruhigen Anfahrten. Drei Baumformen pro Obstart statt bloßer Farbwechsel priorisieren.

## 08 · Redwood Pass · `redwood-pass`

**Zielidentität:** hohe alte Bäume, kühler Nebel und geschützter Waldpass; Baumstämme geben Tiefe, Lichtungen schaffen Orientierung.

**Ist, belegt:** Alte Forest-Wände auf beiden Seiten. Redwood, Pine, Farn, Stamm und einzelne beleuchtete Hütten aus gleichartigen Zufallspools. Bäume stehen zusätzlich auf zufälligen Höhenfraktionen des Hangs. Nebel und erhöhte Dunkelheit sind konfiguriert; Fernhintergrund enthält mehrere weichere Waldkämme. Starke Kurven (`twist: 3.2`). Generischer Kontaktschatten fehlt bei `redwood`, Farn und Baumstamm, nicht aber bei `pine`; ein Assetschatten kann trotzdem im PNG enthalten sein.

**Risiken / visuell zu prüfen:** Beidseitige Bandhänge plus Bäume können die Strecke vollständig einklemmen. Gleichförmige Baumgrößen entwerten die Idee riesiger Redwoods. Nebel kann dieses Problem kaschieren, gibt aber allein keine Raumstaffelung. Straßenrand darf nicht durch zufällige Stämme und Hütten unlesbar werden.

**Plan:** P1 den Wald in drei Tiefen aufteilen: wenige dunkle große Stämme nah, Baumgruppen im Mittelgrund, ruhige Nebelsilhouetten hinten. P1 Naturwand stark absenken oder an wenigen Stellen als bewachsene Böschung lesen lassen. P1 längere kurvennahe Sichtlücken. P2 große Redwood-Silhouetten mit Wurzelansatz und ungleichen Kronen; Farnbeete und liegende Stämme als begründete Gruppen. P2 ein oder zwei Hüttenlichtungen auf ebenem Grund, mit Lichtweg zum Boden. In Bewegung abnehmen: Nebelschichten dürfen die nächste Kurve nicht plötzlich verschlucken.

## 09 · Painted Desert · `painted-desert`

**Zielidentität:** offene warme Wüste, weite Mesa-Silhouetten, niedrige Sand-/Schotterwellen und große Luftperspektive.

**Ist, belegt:** Keine linke oder rechte Wand. Sandfarbener Boden und mäßig hügelige Straße mit vielen Geraden. Saguaro, Kaktus, große Mesa-Felsen, Tumbleweed, Tankstelle und Wüstenbusch stehen in Zufallspools beidseits. Eigene Mesas/Buttes/Spitzen in der Fernkulisse. Sandwetter dämpft Distanzkontrast. Mehrere dieser Namen sind nicht im generischen Schattenfilter (`mesa_rock`, `saguaro`, `cactus`, `gas_station`, `desert_bush`).

**Risiken / visuell zu prüfen:** Hier ist nicht die Wand das Hauptproblem, sondern potentiell leere, einfarbige Bodenfläche mit darauf verteilten Einzelassets. Zufällige große Mesa-Felsen direkt am Rand können mit den viel weiter entfernten Mesas konkurrieren. Tankstellen wirken ohne Vorplatz/Zufahrt dekorativ angeklebt. Staub kann Details stark überdecken; zusätzliche Körnung wäre kontraproduktiv.

**Plan:** P1 niedrige, breite Wüstenformen im Mittelgrund und wenige zusammenhängende Geröllfelder statt Vollflächentextur. P1 Tankstelle auf bewusstem festen Platz; freier Vorlauf und anschließender leerer Wüstenabschnitt. P1 Größenhierarchie der Mesa-Felsen korrigieren: große Silhouetten weit hinten, kleinere gebrochene Felsen vorne. P2 Kakteen in kleine Vegetationsinseln mit passendem Boden-/Kontaktton. P2 Staubbänder dürfen Objekte nicht überall denselben Kontrast geben. Weite bewahren, nicht als Ersatz eine neue Felswand bauen.

## 10 · Death Valley · `death-valley`

**Zielidentität:** erschöpfend weites, heißes Tal bei tiefem Sonnenstand: blasser Salz-/Mineralboden, dunkle ferne Berge und sparsame trockene Landmarken.

**Ist, belegt:** Sehr hohe alte Cliff-Wand links, rechts offenes Land. Nur geringe Hügel- und Kurvenstärke; 50 % Geradenchance. Tote Bäume, dunkle Felsen, Totenkopfpfosten, Wracks und Pumpwindräder zufällig beidseits, Telefonmasten in festem 18-Segment-Takt rechts. Hitzedarstellung; eigene ferne Berge und Salzpfanne im Hintergrund.

**Risiken / visuell zu prüfen:** Hohe geschlossene linke Cliff-Wand widerspricht der Talweite und besitzt die problematische Bandstruktur. Gleichmäßig wiederkehrende Masten erzeugen bei überwiegend gerader Strecke starkes Fließbandgefühl. Zu viele Totenkopfpfosten können wie Fantasydekoration wirken. Im hellen Talboden konkurrieren Straßenrand, Salzfläche und Hitzeflimmern.

**Plan:** P1 die linke Gebirgskette weit zurückstellen; nur kurze Felseinschnitte oder niedrige Schuttfächer im Vordergrund. P1 Salzpfanne als großflächiges ruhiges Motiv mit zwei bis drei Materialflächen aufbauen, keine feine Rissnoise. P2 Masten mit sichtbarer Linienführung/Leitungen und vereinzelten Versorgungsstellen begründen. P2 Wrack, Windrad und dürre Bäume als wenige komponierte Inseln, nicht gleichverteilte Sammlerstücke. P2 Fahrbahn vor dem heißesten Horizont klar lesbar halten. Dies ist nach Twilight/Vineyard einer der größten Gewinne durch dieselbe Raumtrennung wie Coral.

## 11 · Neon City · `neon-city` · Ziel A

**Zielidentität:** schnelles Nachtfinale im Gebäudecanyon, lesbare Straßenkante, Neonakzente und drei abwechslungsreiche Tunnel.

**Ist, belegt:** Eigener City-Painter auf beiden Seiten, Gebäudeabschnitte 14–43 Segmente lang mit gelegentlichen 2–4 Segmenten Gasse, unterschiedliche Höhen, fünf Fensterfarben und vier Neonfarben. Drei Tunnel, je 130–229 Segmente. Laternen alle 12 Segmente, Neonbögen alle 460. Neonpalmen, Hydranten, Imbisswagen, Busstopps, Reklamen und Ampeln als Zufallspools; seitliche Neonblades an Gebäuden. Lichtflächen von Neon-/Signal-/Billboardnamen werden bewusst übersprungen, Lampen und Imbiss/Haltestelle erhalten generischen Lichtschein.

**Risiken / visuell zu prüfen:** Die Stadt braucht keine Naturhangumstellung, sondern unterschiedliche erkennbare Bautypen und Straßennutzung. Viele Fenster, Neonstreifen, bunte Randstreifen und Bögen können zu gleichmäßiger Leuchttextur werden. Ampeln ohne Kreuzung und Bushaltestellen ohne Haltebereich sind semantisch verdächtig. Gleiche Tunnelmaße und Beleuchtungsabstände können drei identische Passagen ergeben. Gebäudehöhen fallen am Stageanfang/-ende ab, die Ankunft ins Stadtgefüge muss trotzdem räumlich glaubwürdig sein.

**Plan:** P1 zuerst Fahrbahnkontrast und Licht-Hierarchie: große dunkle Gebäudemassen, begrenzte helle Leuchtschriften. P1 Straßenobjekte in nachvollziehbare Module (Haltestelle, Imbissplatz, Seitenstraße), Ampeln nur an dargestellten Knoten oder als klarer Arcade-Leitgeber. P2 drei Bezirksmotive: niedrige Geschäftsfront, hoher Canyon, finale Skylineöffnung. P2 Tunnel durch Farbe, Portalarchitektur und Längenwirkung unterscheiden, Ein-/Ausfahrthelligkeit weich führen. P2 Reflexe aus konkreten Neonquellen zulassen, ohne globalen Glüheffekt. Nachtpixel müssen scharf bleiben.

## 12 · Snowcap Pass · `snowcap-pass`

**Zielidentität:** kalter Alpenpass mit bläulichen Schneeformen, warmem fernem Alpenglühen, verschneiten Nadelbäumen und klar erkennbaren Eisstellen.

**Ist, belegt:** Beidseits alte hohe Cliff-Wand, vier horizontale Farbzonen inklusive heller Oberkante. Schneekiefern, Fir, Felsen, Verwehungen, Hütten, tote Bäume und seltene Schneemänner als Zufallspools; Bäume zusätzlich am Hang. Schneepfähle alle 12 Segmente auf beiden Seiten. Hohe Straßenhügel (`hills: 1.8`) und starke Kurven. Eigene ferne Gipfel-/Schneefeldkulisse, Schneepartikel und lokalisierte Eisflächen sind vorhanden.

**Risiken / visuell zu prüfen:** Beidseitige helle Bergwände können die eigentlich starke Bergferne verdecken. Gleichmäßige Weißbänder lesen eher als Schichten einer Torte als als aufliegender Schnee. Schnee, Schneepfähle, Fahrbahnweiß und Eisglanz konkurrieren; Eis muss ohne lange Betrachtung erkennbar sein. Schneemänner direkt auf dem schnellen Pass können unmotiviert wirken.

**Plan:** P1 echte kleine Schneewechten und Felsrippen mit unregelmäßiger Schneelinie statt überall gleich breiter Weißschicht. P1 Ausblicke auf die Gipfel schaffen, nahe Wand nur in kurzen Einschnitten. P1 Eis deutlich von trockenem Asphalt und bloßem Schneerand unterscheiden; vorhandene Warnung im separaten Schilderaudit berücksichtigen. P2 Hütten in geschützte ebene Lichtungen, Schneemänner nur dort. P2 Pfähle sichtbar in Schneerand verankern, Pflanzengruppen mit Bodenkontakt. Abnahme einschließlich Eis bei Schnee, Kurvenkuppe und Einfahrt aus der Vorgängerstage.

## 13 · Gold Rush Town · `gold-rush-town` · Ziel B

**Zielidentität:** staubiger kleiner Westernort bei Abendlicht, nicht eine Wüste mit zufällig verteilten Saloon-Sprites.

**Ist, belegt:** Alte Hill-Wand links, rechts offen. Saloon, Store, Wasserturm, Wagen, Minenkarren, Anbindebalken, rote Felsen, Kakteen, Fässer, Heuballen, Tumbleweed, Wrack und Pumpwindrad stark durchmischt beidseits. Gaslampen alle 14 Segmente. Keine `groups`, keine Grundstücke, keine Zuordnung der Wirtschaftsobjekte zu einem Laden-/Minenhof. Hohe Dämmerungsdunkelheit 0,6 und Hitze. Haus-/Storegrund wird vom generischen Schattenfilter nicht abgedeckt, Lichtschein ist vorhanden.

**Risiken / visuell zu prüfen:** Zufallsplatzierung kann Gebäudefronten, Wagen und Mineralobjekte zu einer Objektparade machen. Ortsskala und Grundstücke fehlen. Saloon/Store rechts können horizontal gespiegelt werden; dadurch drehen auch die gezeichnete Lichtseite und asymmetrische Details um. Hill-Wand hinter der Bebauung kann die gleiche Bildkollision wie alte Küstendörfer erzeugen.

**Plan:** P1 zwei bis drei Ortsblöcke mit freiem zentralen Straßenraum, Holzgehweg und verbundenen Hausfundamenten; niedrige Hügel dahinter. P1 Wirtschaftsobjekte ihren Orten zuordnen: Fässer beim Store, Wagen/Hitchrail vorm Saloon, Minenkarren beim Minenrand, Wasserturm am Ortsende. P2 unbebaute staubige Zwischenstücke als Rhythmus. P2 zusätzliche zwei Gebäudemodule mit anderen Dach-/Verandasilhouetten; vorhandene Assets reichen zunächst für Layouttests. P2 ein klarer Ankunftsplatz vor Ziel B mit Gaslicht statt überall gleichem Lampentakt.

## 14 · Crystal Lake · `crystal-lake` · Ziel C

**Zielidentität:** stiller Bergsee im Mondlicht, dunkle Wälder, ferne Schneegipfel, einzelne Hüttenlichter und kleine Seeuferplätze.

**Ist, belegt:** Alte Forest-Wand links, rechts Wasser nach Küstenregel, aber `noRail: true` und breiteres Ufer. Seefichten, Birken, Felsen, Hütten und Farn links; Schilf, Ruderboot, Lagerfeuer und Gras rechts. Seerosen/Schilf zusätzlich auf dem Wasser; Laternen alle 16 Segmente rechts. Starke Mondreflexion (`sunGlow: .95`) und eigener Berg-/Seehintergrund. Weil die allgemeine `sea_stack`-Bedingung Küstenmodus statt Gewässertyp prüft, werden auch im Bergsee Meeresfelsentürme platziert. Foam wird weiter nach derselben gemeinsamen Küstenregel gezeichnet.

**Risiken / visuell zu prüfen:** Meerartige Felsnadeln und dauerhaft deutlicher Schaum können die Bergseeidentität verwischen. Alte Waldwand kann Aussicht aufs Wasser ungleich gewichten. Die große Bildreflexion im Fernasset und die dynamischen Lichtstriche der Wasserfläche müssen bei Parallaxe denselben Mondbezug behalten. Ruderboot braucht einen Uferplatz oder Steg. Seerosen sollten in Ufernähe liegen, nicht wahllos über offener Tiefe.

**Plan:** P1 Gewässertyp `lake` semantisch trennen: Seeinseln/Uferfelsen statt Meeresnadeln, geringe Wellen- und Schaumamplitude. P1 flaches natürliches Ufer mit Schilfbuchten, Landzungen und unregelmäßigem Uferkontakt. P1 Mondreflex gegen sichtbaren Mond bei Kurvenbewegung prüfen. P2 zwei Lager-/Hüttentaschen mit Steg und Boot auf klarer Kontaktlinie. P2 Laternen nur an Wegen/Plätzen, weite Dunkelabschnitte erhalten. P2 Fichten und Birken in Ufergruppen statt gleichmäßigem Stammvorhang.

## 15 · Starlight Summit · `starlight-summit` · Ziel D

**Zielidentität:** nächtliche Auffahrt zum Observatorium mit kühlen Felsrippen, hochgelegenen Sichtfenstern, dunklen Nadelbäumen und einem eindeutigen Ziel unter Sternen.

**Ist, belegt:** Neuer Hang-Painter auf beiden Seiten, eigene kühle Rockvarianten und fünf Nachtkiefernsilhouetten; gruppierte Vegetation, keine Hausmodule. Hohe Straßenhügel und viele Kurven. Lampen alle 16 Segmente rechts; dunkel 1. Assets für Sternwarte, Radioteleskop, Antenne, Zelt, Kristall und kleines Teleskop existieren in `PROP_INFO` und als PNGs. **Keines davon wird von der Stagekonfiguration oder einem Sonderplatzierer am Straßenrand eingesetzt.** Das vorhandene Straßenbild ist damit primär ein nächtlicher Wald-/Felsberg. Ein fern eingezeichnetes Bauwerk wäre davon getrennt zu bewerten.

**Risiken / visuell zu prüfen:** Nahhänge können trotz besserer Oberfläche den Sternenhimmel und vermeintliche Höhe verdecken. Die Identität „Summit“/Sternwarte bleibt ohne Ankunftsmotiv zu schwach. Sowohl Spritetint als auch bereits nachtdunkle Nachtkiefern können Details doppelt abdunkeln; in Bewegung auf reine Silhouettenverschmelzung prüfen. Dauerbeleuchtung rechts schwächt den abgelegenen Sternwartencharakter.

**Plan:** P1 vorhandene Sternwartenassets gezielt in zwei bis drei Welt-Höhen-Plateaus einbauen: erste ferne Antenne, sichtbare Kuppel später, kleiner klarer Ankunftsbereich vor dem Ziel. P1 an Aussichtskurven Vorderhang absenken, Felsrippen als vereinzelte Rahmung. P2 Lampen nur an Zufahrt-/Ankunftsabschnitten, dunkle Zwischenpassagen mit ausreichend Fahrbahnkontrast. P2 sichtbare Lichtquelle für jedes Lichtfeld; keine neue Vollflächenaufhellung der Nacht. P2 Kristalle nur einsetzen, wenn sie zur Spielwelt gehören; Existenz eines Assets ist kein Grund für beliebige Dekoration.

## Gemeinsame Maßnahmen mit hohem Nutzen

1. **Vom Zufallsobjektpool zum Landschaftsabschnitt:** je Stage vier bis sechs erkennbare Streckenmodule (offen, Hain, Siedlung/Hof, Felszone, Aussicht, Ankunft). Keine größere Objektdichte als Ersatz für Komposition. Rhythmus nur bei Infrastruktur/Rebreihen absichtlich einsetzen.
2. **Grundkontakt vereinheitlichen:** explizite Material-/Sockelmetadaten statt einer unvollständigen Namens-RegEx. Kontaktlinie, Grundstück/Deck, Schattenton und Vegetationsüberlappung gemeinsam planen. Schattenform von Baum, Felsen und Gebäude unterscheiden. Nicht alle kleinen Props brauchen einen eigenen Schatten.
3. **Farbe und Beleuchtung auseinanderhalten:** Stagehimmel und Terrain haben fertige Farben, Sprites erhalten zusätzlich `tint`. Prüfen, dass Helligkeit und Schattenrichtung zusammenpassen. Rechts zufällig gespiegelte Architektur dreht keine Sonne um; bessere Varianten oder getrennte Geometrie-/Lichtdarstellung.
4. **Nur tiefe Räume erhalten echte Fernkulisse:** Fernberge ruhiger und geringerer Kontrast; der Mittelgrund darf ihre Aufgabe nicht als zweite Wand übernehmen. In Palm/Coral ist diese Trennung bereits viel besser und sollte nicht pauschal zurückgebaut werden.
5. **Ufer unterscheiden:** Meer, ruhige Bucht und Bergsee brauchen eigene Fels-/Schaum-/Pflanzenregeln. `side !== land` beschreibt lediglich die Straßenseite, nicht das Gewässer.
6. **Abnahmen bei Bewegung:** Standbilder prüfen Komposition, mehrere Nachbarframes prüfen Flimmern, Konturkanten und Spritewechsel. Bestehende Mips verhindern bereits einen Teil des Detailrauschens; neue Assets müssen bei Viertelgröße funktionieren. Partikel-/Lichteffekte dürfen die nächste Kurve nicht überdecken.
7. **Übergänge als Landschaft bauen:** Himmel und Tint werden weich übergeblendet, aber die Segmentgeometrie/Objektliste wechselt nach Stage. Vor/nach dem Tor und an beiden möglichen Vorgängerrouten überprüfen; Crossfade allein ergibt keine geografische Verbindung. Schnee, See, Stadt und Wüste benötigen vorgelagerte Hinweise und ruhige Randbereiche.
8. **Spielbarkeit getrennt prüfen:** Bildarbeit verändert zunächst keine Physik, Routen, Zeiten oder Kollisionen. Sichtbare Landschaft und beibehaltene Kollisionsgrenzen beim Randfahren vergleichen. Soll Wetterphysik später gezielt verändert werden, bekommt das eine eigene Umsetzung und Fahrgefühl-Abnahme.

## Prioritätsvorschlag aus der Strukturprüfung

- **Erster gemeinsamer Durchgang:** semantische Schildfehler, aufgeklebte Gebäudegrundstücke, Gewässerfehlzuordnungen, eindeutig fehlende Zielmotive. Diese Probleme sind durch zusätzliche Textur nicht zu reparieren.
- **Große Stagearbeiten danach:** Twilight Bay, Vineyard Valley, Snowcap Pass, Death Valley und Redwood Pass. Dort bleibt besonders viel alte Bandwand-/Platzierungslogik stehen.
- **Komposition und Identität:** Gold Rush Town, Crystal Lake, Thunder Highway und Neon City. Vorhandene Einzelassets zuerst verständlich anordnen, neue erst für klar benannte Lücken produzieren.
- **Gezielter Feinschliff:** Surfside, Cypress Point, Starlight Summit; bei Summit ist das fehlende Sternwartenmotiv allerdings eine hohe Einzelpriorität.
- **Bewahren und lokal verfeinern:** Palm Cove und Coral Bluffs. Bereits akzeptierte Ferne, Weite und strukturierte Nahfelsen nicht noch einmal pauschal ersetzen.

## Quellenanker im aktuellen Arbeitsbaum

- `src/game/themes.ts:87–470`: alle 15 Paletten, Pools, Wandtypen, Rhythmen und Terrainkonfigurationen.
- `src/game/track.ts:470–610`: Gruppen-/Hang-/Grundstücksplanung für neues Terrain.
- `src/game/track.ts:637–646`: alter Kammjitter versus glatter Terrainkamm.
- `src/game/track.ts:695–787`: alte Zufallspools, Hangobjekte, Rhythmus und generische Meeresfelsentürme.
- `src/game/track.ts:847–872`: City-Abschnitte und Gassen.
- `src/game/render.ts:21–23,311–347`: Kontaktschattenfilter, Plattformen, Mips und Lichtfelder.
- `src/game/render.ts:88–145,392–430`: Hintergrund, Coral-Sonderkulisse, Parallaxe und Übergänge.
- `src/game/render.ts:806–811,832–1024`: Wandwahl, Stadtgebäude und Tunnel.
- `src/game/render.ts:1026–1170`: Geländevolumen Palm/Coral.
- `src/game/render.ts:1354–1378`: alter Bandwand-Painter.
- `src/game/cove.ts`, `src/game/bluffs.ts`: besondere offene Geländemodelle und Welt-Höhen-Grundstücke.
- `tools/art/STYLE.md`, `tools/art/STAGE_LOOK.md`: bestehende Gestaltungsregeln; Statusangaben nicht als aktuelle visuelle Abnahme behandeln.
- `tools/art/backdrops/make_route_backdrops.py`, `make_snow_lake_backdrops.py`, `make_cove_backdrops.py`, `make_city_backdrop.py`: tatsächlich verfügbare Fernkulissen und ihre Bildabsicht.
- `tools/art/scenery/out/*.png` / `src/game/themes.ts:532–535`: vorhandene, aber im Summit-Straßenbild nicht verwendete Sternwartenassets.
