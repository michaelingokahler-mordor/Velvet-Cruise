# Mittelgrund, Pässe, Beleuchtung und Signale

23. Oktober 2026 · Build `stage-depth-e52edbe66801`

Diese Fassung setzt die Rückmeldungen zur ersten Stage-Überarbeitung um. Die Straßenführung, vorhandene aktive Hindernisse und Wetterphysik bleiben erhalten. Neue Landschaftsobjekte sind passierbare Dekoration. Spielstände, Freischaltungen, Streckenkennungen und das Speicherformat ändern sich nicht.

## Landschaft

| Stage | Änderung |
| --- | --- |
| Cypress Point | In einzelnen Abschnitten rücken bewachsene Hügel näher an die Straße. Höhere, leicht gewellte Kuppen und zusätzliche Baum-, Busch- und Felsgruppen beleben den Mittelgrund, besonders die späten Ansichten 7 und 8. |
| Twilight Bay | Höhere Hügel und Siedlungen auf drei Geländeebenen: nahe Plätze, mittlere Terrassen und höhere Hügelstandorte. Die Zahl der neu angelegten Standflächen steigt von 9 auf 84 auf der Küstenroute. Häuser stehen vollständig auf ebenen Flächen. |
| Vineyard Valley | Zusätzliche Weingüter und mediterrane Häuser zwischen den bestehenden Feldern. 47 statt 5 angelegte Standflächen auf der geprüften Route, auf beiden Seiten und mehreren Höhen. Der Mittelgrund enthält außerdem Baumgruppen, Büsche und Felsen. |
| Redwood Pass | Drei längere Passabschnitte mit straßennahen Felsflanken wechseln sich mit offenen Waldtälern ab. Die Redwood-Kronen reichen deutlich weiter nach unten; ihre grünen Bildflächen wachsen von 2.968 auf 4.850 Pixel. Stämme und Standpunkte behalten ihre Abmessungen. |
| Death Valley | Zusätzliche trockene Gehölz-, Busch- und Felsgruppen auf den mittleren Hängen. Die offene rechte Salzfläche und der bereits beruhigte Felsumriss bleiben erhalten. |
| Neon City | Die Arme der linken und rechten Straßenlampen zeigen jeweils über die Fahrbahn. Die Lichtkegel liegen auf dem Boden und werden von Fahrzeugen und Gebäuden verdeckt. |
| Snowcap Pass | Drei örtliche Gebirgseinschnitte mit Fels- und Schneeflanken bis an die Straße. Dazwischen offene Abschnitte mit zusätzlichen Nadelbäumen, Schneewehen und Steinen auf mittleren Hängen. |
| Gold Rush Town | Unterschiedlich breite und hohe Sandstein-Buttes mit steilen Oberteilen und Schuttfüßen ersetzen die gleichförmigen Fernberge. Der letzte Streckenabschnitt führt durch eine beidseitig bebaute Western-Hauptstraße vor dem Ziel. Gaslaternen beleuchten kreisförmige Bodenflächen. |
| Crystal Lake | Deutlich höhere und gewellte mittlere Hügel mit zusätzlichen Fichten, Birken, Farnen und Seefelsen. Das freie Seeufer und die ruhige Wasserzeichnung bleiben erhalten. |
| Starlight Summit | Höhere gestaffelte Hänge, dichter verteilte nächtliche Baumgruppen, Büsche und Felsgruppen. Die Observatorien bleiben als markante Orte sichtbar. |

Die Sichtkontrolle verwendet die ursprüngliche Fassung, die erste Überarbeitung und die neue Fassung. Die Galerie erlaubt den Wechsel der Vergleichsbasis. Zusätzliche Detailpaare zeigen Siedlungen und die letzte Ortsdurchfahrt an identischen Kamerapositionen.

## Lampen und Scheinwerfer

Die ursprüngliche einfache Straßenlampe zeigt im Bild nach links. Sie wird links gespiegelt und rechts unverändert gezeichnet. Highway- und Stadtlampen haben einen nach rechts zeigenden Arm und verwenden die umgekehrte Spiegelung. Die einfache Straßenlampe erscheint 30 Prozent größer; ihre bisherigen Kollisionsdaten bleiben gleich.

Lampen beleuchten kreisförmige Flächen in der Spielebene. Die Perspektive stellt diese Flächen als Ellipsen dar. Mehrere abgestufte Helligkeitsringe ergeben den Pixelstil. Das Licht wird mit dem Boden gezeichnet, bevor Bäume, Geländer, Autos und Häuser es verdecken.

Autoscheinwerfer verwenden die gerade Tangente am Standort des Autos. Spätere Straßenkrümmungen lenken den Lichtkegel nicht um. Wo die Fahrbahn aus dem Kegel herausläuft, endet ihre Beleuchtung entsprechend.

## Hupe und Lichthupe

- Tastatur: **H**.
- Standard-Gamepad: **Y**, bei PlayStation-Belegung Dreieck.
- Touch: **H** am Tag, **L** in der Nacht.
- Tagsüber erklingt eine kurze Zweiklanghupe. Regen oder Nebel allein wechseln nicht zur Lichthupe.
- Nachts gibt das Auto zwei kurze Lichtimpulse ab. Die Pause zwischen den Impulsen ist sichtbar.
- Das nächste Fahrzeug voraus in der eigenen Spur reagiert nach einer kurzen Verzögerung. Es wechselt sanft in eine freie Nachbarspur.
- Die Prüfung berücksichtigt auch schnell aufholenden Verkehr auf der Zielspur. Wird die Lücke während der Reaktion blockiert, unterbleibt der Wechsel.
- Im Bereich von Abzweigen gibt es keinen erzwungenen Spurwechsel. Während Unfällen und nach dem Ziel ist die Funktion gesperrt. Eine kurze Abklingzeit verhindert Dauerbetätigung.

Die Funktion beeinflusst Verkehr gezielt nach einer Eingabe. Ohne Betätigung bleiben die bisherigen vollständigen Testfahrten zeit- und punktgleich. Die Steuerung des Spielerautos sowie Regen-, Schnee-, Eis- und Windwirkung sind unverändert.

## Prüfung und Auslieferung

- TypeScript-Prüfung und Produktionsbuild bestanden.
- `npm run qa:depth`: alle 16 Routen geprüft; Straßen, vorhandene aktive Hindernisse, Zeitvorgaben und Flächen entsprechen der vorherigen Fassung.
- Fünf vollständige automatisierte Fahrten erreichen alle fünf Ziele mit identischen Zeiten und Punkten zur vorherigen Fassung.
- 770 vollständige Gebäudestandflächen und 28.897 Bodenkontakte neuer beziehungsweise neu platzierter Dekoration über die Routen geprüft.
- 170 Streckenbilder, 19 zusätzliche Detailpaare und vier Lichtphasen aufgenommen.
- Zusätzliche Tests prüfen sichere und blockierte Spurwechsel, schnell aufholende Fahrzeuge, Verzögerung, Abklingzeit, Abzweige und die Trennung von Tag und Nacht.
- Ein Renderertest verändert die zukünftige Straßenkrümmung: Die Achse des Scheinwerferlichts bleibt unverändert.
- Im Sprite-Atlas ändern sich nur die Pixel der Redwood-Grafik. Andere Sprites, ihre Positionen im Atlas und ihre Abmessungen bleiben identisch.

Zusätzliche Browserfahrten mit Stage-Startpunkten erreichen alle fünf Ziele in der gebauten Desktop-Webfassung. Die Tastatureingabe H und der Nacht-Lichtimpuls wurden darin geprüft. Ein Test der nativen EXE, ein physisches Gamepad und eine menschliche Hörprobe sind dadurch nicht ersetzt. Die lokalen Vergleichsprüfungen benötigen die gesicherte Ausgangsfassung unter `output/stage-depth/before`.

Die Windows-Installation erhält ausschließlich die 79 Spieldateien des neuen Pakets. Der Vergleich der installierten Dateien liegt in `output/stage-depth/after/installation.json`. EXE und `app.asar` bleiben unverändert. Sicherungen der vorherigen Quellen und der zuvor installierten Spieldateien liegen in `output/stage-depth/source-before.zip` und `output/stage-depth/desktop-before.zip`.

[Vergleichsgalerie](output/stage-depth/Vergleich.html) · [Grundprüfungen](output/stage-depth/after/validation.json) · [Mittelgrund- und Funktionstests](output/stage-depth/after/depth-validation.json) · [Browserfahrten](output/stage-depth/after/browser-validation.json)

Die Änderungen sind lokal und noch nicht committed oder gepusht.
