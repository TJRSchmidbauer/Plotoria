# Änderungsprotokoll

## Version 3.1 – für die Unterrichtsplanung

### Neu
- **Tabs:** Mehrere Graphen gleichzeitig bearbeiten. Die Tab-Leiste steht zwischen Titel und Vorlagen: **+** für einen neuen Tab, **×** oder Mittelklick zum Schließen (mit „Wiederherstellen“), Umsortieren per Ziehen, Pfeiltasten zum Wechseln. Jeder Tab hat seinen eigenen Rückgängig-Verlauf; Integral und Tangente bleiben beim Wechsel erhalten. Mit Zustimmung zum Speichern werden alle Tabs gespeichert. Geteilte Links und geöffnete Projektdateien kommen als zusätzlicher Tab dazu, statt die Arbeit zu ersetzen.
- **Aufgabenbibliothek Jgst. 8–13:** 77 Vorlagen (alle 18 aus Version 3.0 und 59 neue), geordnet nach Jahrgangsstufe und Lernbereich des LehrplanPLUS Gymnasium Bayern – z. B. M9 5 Potenzfunktionen, M12 3 Einseitiger Signifikanztest, M13 1 Flächeninhalt und bestimmtes Integral, M13 2 Normalverteilung. Mit Suche, Stufenfilter und Schalter „In neuem Tab öffnen“. Universelle Aufgabenformate (Graphen zuordnen, Graph ablesen, Steigungsdreieck, Ableitungsgraph skizzieren, Punkte ablesen, Wertetabelle ausfüllen, Graph skizzieren und prüfen, leeres Koordinatensystem, Messwerte) stehen zusätzlich unter **Allgemein**.
- Neue Vorlagen u. a.: Geradengleichung aufstellen, lineare Ungleichung, Hyperbel a/(x + b) + c, Parabel durch drei Punkte, Wurfparabel, gerade und ungerade Exponenten, a · bˣ, Zinseszins, Exponentialgleichung graphisch lösen, Periode bestimmen, Verhalten im Unendlichen, Graph verschieben und strecken, waagrechte Asymptote, Graph und Ableitungsgraph zuordnen, Krümmung und Wendepunkt, Funktion mit ln, Einfluss von p, links- und rechtsseitiger Test, orientierter Flächeninhalt, Integralfunktion, Änderungsrate und Bestand, P(X ≤ a) bei der Normalverteilung.
- **Stochastik:** Binomialverteilung als Histogramm und Normalverteilung als Glockenkurve, mit markiertem Bereich und Wahrscheinlichkeit (z. B. „P(X ≤ 4) ≈ 0,2375“), μ ± σ, Normalverteilung als Näherung, Werte beim Überfahren und Tabelle P(X = k) / P(X ≤ k) für Word und Druckbogen. Eingabe auch als `X ~ B(20; 0,3); P(X ≤ 4)` oder `X ~ N(100; 15)`. TikZ-Export mit Histogramm, Fläche und Beschriftung.
- **Skizzen- und Prüfmodus:** Stift-Werkzeug (`S`) für Freihandskizzen mit Maus, Stift oder Finger. Beim ersten Skizzieren erklärt eine Karte die drei Schritte (mit „Beispiel ausprobieren“); der ?-Knopf öffnet die Hilfe. Funktionen lassen sich **als Lösung verbergen**; **Lösung zeigen** (`L`) blendet sie mit einem Toleranzschlauch ein, färbt die Skizze grün bzw. rot und zeigt, wie gut sie passt. Im Export: „Lösungen einblenden“ (Aufgaben- und Lösungsblatt aus einem Graphen) und „Skizzen“.
- **Stammfunktion als Schalter:** „Stammfunktion anzeigen“ in den Einstellungen jeder Funktion blendet F ein und aus.

### Fehlerbehebungen
- **Projekt sichern:** Der Offline-Speicher (Service Worker) fing den Download ab; im neuen Tab erschien dann ein Fehler. Downloads werden jetzt nicht mehr abgefangen.
- Bei „Gleichen Einheiten“ schnitten Vorlagen je nach Bildschirmformat oben und unten ab (z. B. „Fläche unter dem Graphen“). Jetzt wird der ganze y-Bereich gezeigt und dafür der x-Bereich verbreitert.
- Termbeschriftungen verwenden die Variable der Definition: `h(t) = −5t² + …` statt `h(x) = …`.

## Version 3.0 – mehr Mathematik für Arbeitsblätter

### Funktionen
- **Abschnittsweise definierte Funktionen:** `f(x) = x² für x < 1; 2x − 1 für x ≥ 1`, auch mit `sonst` oder Intervallen `x ∈ [0; 1[`. An Sprungstellen zeigt Plotoria gefüllte ● und offene ○ Randpunkte, an stetigen Übergängen keine. Ableitung je Abschnitt; im Export als `cases` (LaTeX) bzw. je Abschnitt ein eigenes `\addplot` (TikZ).
- **Funktionsscharen:** `f_a(x) = a·x² für a = 1, 2, 3` (auch `a ∈ {−1; 0; 1}` oder `a = −2 … 2`). Jede Kurve wird in einer Abstufung der Grundfarbe gezeichnet und mit „a = 2“ bzw. dem Term beschriftet. Ableitungen einer Schar sind wieder Scharen.
- **Umkehrfunktion:** Funktion › *Umkehrfunktion* spiegelt den Graphen an y = x; die Winkelhalbierende wird gestrichelt eingeblendet. Ist f im Bereich nicht umkehrbar, weist Plotoria darauf hin.
- **Stammfunktion:** Funktion › *Stammfunktion* zeichnet F mit wählbarer Konstante C – mehrere Werte (z. B. `−1; 0; 1`) ergeben eine Schar von Stammfunktionen. Der Term wird exakt bestimmt (ln|x| statt ln x) oder, wenn es keinen geschlossenen Term gibt, numerisch berechnet.

### Aufgaben gestalten
- **Hilfslinien zum Ablesen:** Bei Punkten zeichnet die Option „Hilfslinien zu den Achsen“ gestrichelte Lote auf beide Achsen (auch im TikZ-Export).
- **Riemann-Summen:** Im Integral-Werkzeug zwischen Fläche, Untersumme, Obersumme und Mittelsumme wählen; die Anzahl der Rechtecke ist einstellbar (1–200). Angezeigt werden z. B. U₈ und der Wert des Integrals.
- **Kurvendiskussion als Text:** Funktion › *Kurvendiskussion* erstellt ein Lösungsblatt mit Definitionsbereich, Symmetrie, Nullstellen, y-Achsenabschnitt, Ableitungen, Extrem- und Wendepunkten, Monotonie- und Krümmungsintervallen, Grenzverhalten und Asymptoten – exakt (√3, 1 − √2) oder gerundet. Ausgabe für Word, als LaTeX oder auf den Druckbogen.
- **Mehrere Koordinatensysteme auf einem Blatt:** Im Export „Leeres Koordinatensystem“ wählen oder im Druckbogen „Leeres Koordinatensystem daneben“ – z. B. links der Graph von f, rechts das Raster für „Skizziere f′“. Mit „⇥“ stehen Grafiken nebeneinander, wenn sie zusammen auf die Seitenbreite passen. Abbildungen und Tabellen werden getrennt nummeriert.
- **Eigene Vorlagen:** Im Vorlagen-Fenster den aktuellen Stand unter einem Namen sichern, später mit einem Klick laden, löschen oder alle als Datei weitergeben und wieder einlesen. Gespeichert wird im Browser nur mit Zustimmung.
- **Fünf neue Vorlagen:** Abschnittsweise definiert, Funktionsschar, Ober- und Untersumme, Umkehrfunktion, Stammfunktionen.

### Verbesserungen
- **Lesbarere Ableitungen:** `x² − 1` statt `−1 + x²`, `(x² − 2x − 1)/(x − 1)²`, `1/(2√x)`, `2^x·ln(2)` statt gerundeter Brüche. Jede Umformung wird numerisch geprüft.
- Tests verwenden die mitgelieferte nerdamer-Version; `npm test` braucht keine Installation mehr.
- Version 2.0.5 ist im Branch `version/2.0` gesichert.

## Version 2.0.5
- **Gleichmäßige Strichlinien:** Gestrichelte, gepunktete und strichpunktierte Graphen werden entlang der Kurvenlänge berechnet. Alle Striche, Punkte und Lücken sind gleich lang – auch an Hoch- und Tiefpunkten, am Bildschirm wie in PNG, SVG und Druck.

## Version 2.0.4
- **Karopapier-Maßstab eindeutig:** Auswahl „1 Einheit = 2 Kästchen (1 cm)“ usw. mit einer Skizze, die zeigt, wie viele 5-mm-Kästchen von 0 bis 1 reichen. Auf den Achsen hat jede Einheit einen Strich; die Zahlen stehen so dicht wie lesbar.

## Version 2.0.3
- **Karopapier verständlicher:** Die Auswahl heißt jetzt „1 Einheit auf Papier“ und nennt zuerst die gedruckte Länge (z. B. „2 cm = 4 Kästchen“). Beim Wechsel auf Karopapier zeigt Plotoria die Kästchen am Bildschirm ungefähr in Druckgröße (5 mm); der Knopf „In Druckgröße anzeigen“ stellt das wieder her.
- Auswahl „Rasterlinien“ zeigte bei „automatisch“ ein leeres Feld – behoben.

## Version 2.0.2
- **Absturz beim Tangenten-Werkzeug behoben:** Nahe Polstellen und an Hoch-/Tiefpunkten entstanden Linien mit Koordinaten von bis zu 10¹⁴ Pixeln, an denen Browser abstürzten bzw. die Seite neu luden. Tangente und Normale werden jetzt auf den sichtbaren Bereich zugeschnitten.
- Gleiche Absicherung für Integralgrenzen, schiefe Asymptoten, Pfeile und senkrechte Geraden beim starken Zoomen.

## Version 2.0.1
- **Speichern nur mit Zustimmung:** Bei jedem Start fragt ein Hinweis der Seite, ob Arbeitsstand, Druckbogen und Offline-Dateien lokal gespeichert werden dürfen. Vor der Entscheidung wird nichts gelesen oder gespeichert; „Ablehnen“ löscht vorhandene Plotoria-Daten.
- Lizenzhinweise der mitgelieferten Bibliotheken ergänzt.

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
