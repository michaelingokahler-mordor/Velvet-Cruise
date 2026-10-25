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
