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
