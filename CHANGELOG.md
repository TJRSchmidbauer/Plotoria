# Änderungsprotokoll

## Version 2.0 – Graphen für Arbeitsblätter und Prüfungen

Plotoria 2.0 richtet sich an Lehrkräfte, die Graphen für Prüfungen erstellen, bearbeiten und druckfertig exportieren. Die Oberfläche folgt Apples Gestaltungsrichtlinien (Human Interface Guidelines).

### Export und Druck
- **Maßstabsgetreuer Export:** „1 Einheit = 1 cm“ (oder frei wählbar, getrennt für x und y) bzw. feste Breite × Höhe in cm. Die Vorschau zeigt die Größe.
- **PNG mit 300 dpi und Größenangabe:** Word und LibreOffice fügen das Bild sofort in der richtigen Größe ein.
- **SVG in Zentimetern**, **TikZ mit `x=1cm, y=1cm`**, **PDF über den Druckbogen**.
- **Sauberer Export:** Wasserzeichen, Titel, Graph-Beschriftungen und Kurvendiskussion einzeln abschaltbar; weißer Hintergrund auch im dunklen Thema.
- **Druckbogen DIN A4:** Grafiken und Tabellen sammeln, ordnen, beschriften; Kopfzeile „Name / Klasse / Datum“, Überschrift, nummerierte Abbildungen; Drucken oder „Als PDF sichern“.
- **Schwarz-Weiß-Modus:** Graphen werden durch Strichart (durchgezogen, gestrichelt, gepunktet, strichpunktiert) unterschieden, Flächen schraffiert.
- **Karopapier:** 5-mm-Kästchen mit festem Maßstab (1 Einheit = 1, 2 oder 4 Kästchen).

### Aufgaben gestalten
- **Beschriftung je Graph:** Name (G_f), Funktionsterm, eigener Text (z. B. A–D für Zuordnungsaufgaben) oder keine.
- **Punkte, Texte, Pfeile:** per Werkzeug oder Eingabe `A(2|3)`, `P(1|f(1))`; Einrasten am Raster und an Graphen; ziehen, löschen, rückgängig.
- **Senkrechte Geraden:** `x = 2`.
- **Definitionsbereiche:** `f(x) = x^2 für 0 ≤ x < 3` mit gefüllten/offenen Randpunkten.
- **Asymptoten:** senkrecht, waagrecht und schief, automatisch erkannt und beschriftet.
- **Achsen frei skalieren:** Schritt je Achse (auch `pi/2`), Beschriftung dezimal, als Bruch oder in Vielfachen von π, Achsentitel mit Einheit („t in s“), Rasterunterteilung.
- **Messwerte & Regression:** Werte aus Excel einfügen (auch quer), Ausgleichskurve linear, quadratisch, kubisch, exponentiell oder als Potenz mit R².
- **Lückenhafte Wertetabelle:** Zellen per Klick leeren, quer oder hoch, Export für Word, LaTeX, CSV und Druckbogen.

### Arbeitsablauf
- **Projektdateien (.plotoria):** sichern, öffnen, per Drag & Drop laden – für ein Aufgabenarchiv.
- **13 Aufgabenvorlagen**, z. B. „Graph ablesen“, „Graphen zuordnen“, „Steigungsdreieck“, „Sinus im Gradmaß“, „Messwerte & Ausgleichsgerade“.
- **Exakte Werte:** √2, π/2, 1/3, (1 + √5)/2 in Kurvendiskussion, Tangente, Integral und Tabelle.
- **Offline-fähig (PWA):** Alle Bibliotheken liegen im Projekt; nach dem ersten Öffnen läuft Plotoria ohne Internet und lässt sich als App installieren.

### Gestaltung
- Systemschrift, Systemfarben, durchscheinende Leisten, Segmented Controls, gruppierte Listen, Sheets mit abgedunkeltem Hintergrund, schwebende Werkzeugleiste.
- Hell- und Dunkelmodus folgen automatisch dem System.
- Berücksichtigt „Bewegung reduzieren“, „Transparenz reduzieren“ und „Kontrast erhöhen“.
- Einstellungen wirken sofort; Werkzeughinweis zeigt, wie man ein Werkzeug wieder verlässt.

### Technik
- Aufteilung in Module (`plotoria.js`, `objects.js`, `data.js`, `export.js`, `templates.js`, `numerics.js`).
- Tests für Parser, Numerik und TikZ (`npm test`).
- Projekte und Links aus Version 1 lassen sich weiter öffnen.

## Version 1.0

Erste veröffentlichte Fassung: Funktionsplotter mit eigenem Ausdrucks-Parser, Kurvendiskussion, Tangente, Integral, Parametern mit Animation, Wertetabelle, RAD/DEG, Undo/Redo, PNG/SVG/TikZ-Export und Teilen-Link. Der Stand ist im Branch `version/1.0` gesichert.
