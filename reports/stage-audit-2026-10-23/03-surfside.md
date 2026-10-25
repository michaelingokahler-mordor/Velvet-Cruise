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
