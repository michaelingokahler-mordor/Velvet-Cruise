# Unabhängige Prüfung und Korrekturen

Geprüfter Softwarestand: `a5f9377..e49084c`. Ein unabhängiger Reviewer prüfte
Quellcode, Schnittstellen, Tests, Grafikgeneratoren und ausgewählte echte
Renderbilder. Er änderte weder Dateien noch den laufenden Messaufbau.

Keine kritische Schwachstelle wurde bestätigt. Zwei wichtige Befunde wurden
reproduziert und in einem Korrekturdurchgang behandelt:

1. Ein dekodierbares Atlas-PNG mit falschen Abmessungen wurde trotz ungültiger
   Framegrenzen angenommen. Dadurch konnte Plus mit unsichtbaren Wagen
   gespeichert werden. Der Laufzeitloader prüft jetzt ganzzahlige Grenzen,
   Dichte, logische Maße, doppelte Namen, leere Sprites und Hintergrundmaße.
   `check-plus-loading.mjs` scheiterte zuerst beim 1×1-PNG und besteht jetzt
   zehn gültige/ungültige Lieferfälle. Die echte Browserprüfung weist zusätzlich
   nach, dass ein dekodierbares, widersprüchliches PNG Classic und die
   gespeicherte Auswahl erhält.
2. Die iPhone-Hilfe konnte zehn Minuten Titelseiten-RAF als bestandene Leistung
   melden. Dieser Fall wurde mit einer perfekten Titelseiten-Stichprobe
   reproduziert. Version 2 trennt nun `frameCadencePassed` von der Spielprüfung,
   protokolliert fortschreitende Fahrzeit und Regenfahrzeit und lässt die
   Geräteabnahme ausdrücklich unbewertet. Die Mindestabdeckung beträgt acht
   Minuten Fahrt und 30 Sekunden Regen. Eine Titelseitenmessung erfüllt sie
   nicht. Geräteidentität und Bedienprüfung bleiben menschliche Angaben.

Der Reviewer wies außerdem auf die hohen Kosten neu erzeugter Rücklicht-Glows
hin. Die gemeldete Regenverlangsamung wurde daraufhin gesondert profiliert.
Die Optimierung verwendet einen exakten linearen Abstandstransform, direkte
native Hintergrundkopien und das Überspringen von Lichtberechnungen für
Segmente ohne sichtbare Pixelzeile. Die neue Glow- und Hintergrundausgabe
stimmt mit den eingefrorenen alten Verfahren überein. Alle 264 vollständigen
Streckenbilder bleiben byteidentisch. Diese Nachweise ersetzen den erneuten
Test auf dem betroffenen iPhone nicht.

## Zurückgestellter kleiner Befund

Der portable Erhaltungsvertrag enthält noch nicht `s.tunnel`, `s.stage` und
`track.goalSeg`. Diese Quelldaten sind in diesem Zweig unverändert. Die Lücke
betrifft zukünftige Regressionserkennung; sie ist kein nachgewiesener Fehler
dieser Fassung. Die Ergänzung bleibt eine Folgeaufgabe.

## Vom Reviewer nicht abschließend beurteilt

- Neuer iPhone-Steuerungsentwurf: im Entwurf bewusst später vorgesehen.
  Die bestehende Bedienprüfung bleibt offen; der Nutzer meldet Änderungsbedarf.
- Genaue Ursache der iPhone-Regenverlangsamung: erst die Profilierung und der
  erneute Gerätetest können das eingrenzen. Der Nutzerbefund blockiert eine
  Behauptung vollständiger Gerätereife.
- Durchgehende audiovisuelle Qualität und echte Gamepads: durch Quellprüfung
  und Bildstichproben nicht belegt; diese Grenze bleibt dokumentiert.
- Änderungen nach `e49084c`: außerhalb des unveränderlichen Reviewbereichs.
  Die Korrekturen wurden durch fehlgeschlagene und anschließend bestandene
  Regressionen, exakte Bildvergleiche und erneute relevante Suiten geprüft.

Es wurde kein zweiter Reviewdurchgang beauftragt. Die endgültige Freigabe bleibt
von den ausstehenden Leistungs- und Geräteergebnissen abhängig.
