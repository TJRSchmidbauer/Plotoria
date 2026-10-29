# 📘 Plotoria 3.1 – Bedienungsanleitung

Plotoria erstellt Graphen für Arbeitsblätter, Schulaufgaben und Präsentationen – maßstabsgetreu und druckfertig.

**Öffnen:** [tjrschmidbauer.github.io/Plotoria](https://tjrschmidbauer.github.io/Plotoria/). Nach dem ersten Öffnen funktioniert Plotoria auch ohne Internet. In Chrome/Edge lässt es sich über das Installieren-Symbol in der Adressleiste als App einrichten, in Safari über „Teilen → Zum Home-Bildschirm“.

---

## 🚀 In drei Schritten zur Prüfungsgrafik

1. **Funktion eingeben:** rechts oben `f(x) = 0.5x^2 - 2` eintippen, Enter drücken – oder oben **Vorlagen** wählen (Aufgabenbibliothek nach Jahrgangsstufe 8–13).
2. **Gestalten:** Beschriftungen, Punkte, Raster, Achsen anpassen (siehe unten).
3. **Exportieren:** Oben rechts **Exportieren** → Maßstab „1 Einheit = 1 cm“ → **PNG** für Word oder **Zum Druckbogen** für ein fertiges Blatt.

---

## 🧮 1. Eingabe

| Eingabe | Bedeutung |
|---|---|
| `x^2 - 4`, `2x(x+1)`, `0,5x` | Terme; Malpunkt darf fehlen, Dezimalkomma geht |
| `f(x) = sin(x)` | Funktion mit Namen (überschreibt ein vorhandenes f) |
| `f(x) = x^2 für 0 ≤ x < 3` | Definitionsbereich (auch `x^2, x > 1` oder `x^2; x ∈ [0; 3[`) |
| `f(x) = x^2 für x < 1; 2x - 1 für x ≥ 1` | Abschnittsweise definiert (auch `…; 3 sonst` oder `1 für x ∈ [0; 1[; 2 für x ∈ [1; 2]`) |
| `f_a(x) = a*x^2 für a = 1, 2, 3` | Funktionsschar (auch `a ∈ {−1; 0; 1}` oder `a = −2 … 2`) |
| `f'`, `f''` | Ableitung von f – wird bei Änderungen an f mitgeführt |
| `g(x) = f(x - 2) + 1` | Andere Funktionen verwenden |
| `A(2|3)`, `P(1|f(1))`, `B = (−1; 2)` | Punkt |
| `x = 2` | Senkrechte Gerade |
| `a*x^2 + b` | Unbekannte Buchstaben werden Parameter mit Schieberegler |
| `X ~ B(20; 0,3)`, `X ~ N(100; 15)` | Binomial- bzw. Normalverteilung (siehe Abschnitt 5) |
| `X ~ B(20; 0,3); P(X ≤ 4)` | … mit markiertem Bereich und Wahrscheinlichkeit (auch `P(2 ≤ X ≤ 5)`, `P(X > 3)`, `P(X = 2)`) |
| `sqrt`, `|x|`, `ln`, `lg`, `log(b, x)`, `root(x, n)`, `pi`, `e`, `30°` | Funktionen und Konstanten |

Fehler werden unter dem Eingabefeld erklärt, darunter erscheint eine Formelvorschau.

> ⚠️ Ein Komma zwischen zwei Ziffern ist immer ein Dezimalkomma. Argumente daher mit Komma **und Leerzeichen** trennen: `log(2, 8)`.

### Abschnittsweise definierte Funktionen
Die Abschnitte werden mit `;` getrennt, jeder mit `für` und Bedingung: `f(x) = 0.5x^2 + 1 für x < 1; x - 2 für x ≥ 1`. Der letzte Abschnitt darf `sonst` heißen. An einer **Sprungstelle** zeichnet Plotoria den eingeschlossenen Randpunkt gefüllt (●) und den ausgeschlossenen offen (○); bei stetigen Übergängen entfallen die Punkte. Die Ableitung `f'` wird abschnittsweise gebildet.

### Funktionsscharen
`f_a(x) = a*x^2 - 2 für a = 0.5; 1; 2` zeichnet für jeden Wert eine Kurve in einer Abstufung der Farbe und schreibt „a = 1“ usw. daneben (Beschriftung **Term** zeigt den Term mit eingesetztem Wert). Der Scharparameter bekommt keinen Schieberegler.

### Einstellungen einer Funktion
Klick auf **›** neben einer Funktion:
* **Beschriftung:** `G_f` · **Term** (z. B. „f(x) = x² − 2“) · **Text** (eigener Text, z. B. „A“ für Zuordnungsaufgaben) · **Aus**
* **Linie:** Stärke und Strichart (durchgezogen, gestrichelt, gepunktet)
* **Definiert:** Grenzen des Definitionsbereichs; das Kästchen „○“ schließt die Grenze aus (offener Randpunkt)
* **Asymptoten anzeigen:** senkrechte, waagrechte und schiefe Asymptoten mit Gleichung
* **Stammfunktion anzeigen:** Schalter – zeichnet F gestrichelt (ausschalten entfernt F wieder). Unter „Konstante C“ eine Zahl eintragen – oder mehrere, z. B. `-1; 0; 1`, für eine Schar von Stammfunktionen. Gibt es keinen geschlossenen Term (z. B. bei e^(−x²)), rechnet Plotoria numerisch.
* **Als Lösung verbergen:** Der Graph bleibt unsichtbar, bis **Lösung zeigen** gewählt wird (siehe „Skizzieren und prüfen“). In der Liste trägt er das Etikett „Lösung“.
* **Umkehrfunktion:** spiegelt den Graphen an der Geraden y = x (die Gerade lässt sich ausblenden). Ist f im sichtbaren Bereich nicht streng monoton, weist Plotoria darauf hin – das Spiegelbild ist dann kein Funktionsgraph.
* **Kurvendiskussion:** öffnet das Lösungsblatt (siehe Abschnitt 4).
* Ein Klick auf den Term bearbeitet ihn direkt; der Farbpunkt ändert die Farbe.

---

## ✏️ 2. Werkzeuge (schwebende Leiste unten)

| Werkzeug | Taste | Funktion |
|---|---|---|
| Verschieben | `V` | Ansicht ziehen, mit Mausrad zoomen; Objekte und Beschriftungen ziehen |
| Punkt | `P` | Klick setzt einen Punkt – rastet am Raster und auf Graphen ein |
| Text | `T` | Klick öffnet ein Textfeld; `G_1` wird tiefgestellt. Doppelklick bearbeitet |
| Pfeil | `A` | Von Start nach Ziel ziehen |
| Bereich | `B` | Ausschnitt aufziehen: Export nutzt ihn, Doppelklick zoomt hinein |
| Tangente | `N` | Tangente, Normale und Steigungsdreieck; Klick hält fest |
| Skizze | `S` | Freihand zeichnen mit Maus, Stift oder Finger – drei Stiftfarben, letzten Strich entfernen, alles löschen |

Mit gedrückter **Alt**-Taste wird nicht eingerastet. Ausgewählte Objekte löscht **Entf**. **Esc** beendet jedes Werkzeug.

**Hilfslinien zum Ablesen:** Bei einem Punkt (Reiter Algebra, **›** neben dem Punkt) „Hilfslinien zu den Achsen“ einschalten – gestrichelte Lote führen zur x- und y-Achse.

### Skizzieren und prüfen
So entsteht eine Aufgabe wie „Skizziere den Graphen von f′“ – am Beamer, am Tablet oder am interaktiven Whiteboard:
1. f eingeben, `f'` anlegen und bei f′ unter **›** **Als Lösung verbergen** einschalten (oder Vorlage „Ableitungsgraph skizzieren“).
2. Mit dem Stift-Werkzeug (`S`) skizzieren lassen.
3. **Lösung zeigen** (Knopf oben rechts oder Taste `L`): Der Lösungsgraph erscheint mit einem grünen **Toleranzschlauch**. Teile der Skizze im Schlauch werden grün, außerhalb rot gezeichnet. Dazu zeigt Plotoria, wie viel Prozent der Skizze im Schlauch liegen und welcher Anteil des Lösungsgraphen nachgezeichnet wurde.

Skizzen werden mit dem Projekt gespeichert und mit `Strg + Z` rückgängig gemacht. Im Export lassen sie sich ein- oder ausschalten.

**Integral, Ober- und Untersumme:** Das ∫-Symbol neben einer Funktion zeigt die Fläche zwischen a und b (Grenzen mit der Maus ziehen). Oben lässt sich auf **Untersumme**, **Obersumme** oder **Mitte** umschalten und die Anzahl der Rechtecke mit − / + einstellen; angezeigt werden z. B. U₈ und der Integralwert.

---

## 🎨 3. Darstellung (Reiter „Darstellung“)

* **Fenster:** x- und y-Bereich; „Gleiche Einheiten“ hält das Seitenverhältnis 1:1.
* **Achsen:** Titel (z. B. „t in s“), **Schritt** (z. B. `2` oder `pi/2`), Zahlen als **Dezimal**, **Brüche** oder **Vielfache von π**, Anzahl der Rasterlinien je Schritt.
* **Raster:** Koordinaten · **Karopapier** · ohne. Karopapier ist wie im Schulheft: Ein Kästchen ist auf Papier immer 5 mm groß. Unter **Maßstab** wählst du, wie viele Kästchen von 0 bis 1 reichen – 1 Kästchen (0,5 cm), 2 Kästchen (1 cm, Standard) oder 4 Kästchen (2 cm). Je mehr Kästchen pro Einheit, desto größer wird der Graph; eine kleine Skizze zeigt die Wahl. Plotoria zeigt das Karopapier am Bildschirm ungefähr in Druckgröße; „In Druckgröße anzeigen“ stellt das nach dem Zoomen wieder her.
* **Stil:** Farbthema (Automatisch, Hell, Projektor, Dunkel), **Schwarz-Weiß**, Schriftgröße, Linienstärken, Farben.
* **Exakte Werte:** Kurvendiskussion, Tangente und Integral zeigen √2, π/2, 1/3 statt Dezimalzahlen.

---

## 📤 4. Exportieren

**Exportieren** oben rechts (oder `Strg + E`) öffnet den Export mit Vorschau.

* **Format:** PNG · SVG · TikZ · PDF (über den Druckbogen)
* **Größe:** *Maßstab* („1 Einheit x = 1 cm“, x und y getrennt) oder *Breite × Höhe* in cm. Bei Karopapier ist der Maßstab fest.
* **Bereich:** aktuelle Ansicht oder die mit dem Bereich-Werkzeug gewählte Auswahl.
* **Auflösung (PNG):** 300 dpi für den Druck. Die Größe ist im Bild gespeichert – Word und LibreOffice fügen es in der richtigen Größe ein.
* **Inhalt:** Titel, Graph-Beschriftungen, Kurvendiskussion, Schwarz-Weiß, weißer Hintergrund, Wasserzeichen – jeweils ein- oder ausschaltbar.
* **Lösungen einblenden:** Als Lösung verborgene Graphen mit exportieren – so entstehen Aufgaben- und Lösungsblatt aus demselben Graphen. **Skizzen:** Freihandskizzen mit exportieren.
* **Kopieren** legt das Bild (bzw. den TikZ-Code) in die Zwischenablage. Das Kopier-Symbol in der Werkzeugleiste kopiert schnell die aktuelle Ansicht.

### Mehrere Koordinatensysteme auf einem Blatt
* Im Export unter „Inhalt“ **Leeres Koordinatensystem** einschalten: nur Achsen und Raster der aktuellen Ansicht, ohne Graphen.
* Schneller im Druckbogen: **Leeres Koordinatensystem daneben** setzt ein leeres Raster in gleicher Größe neben die letzte Grafik – ideal für „Skizziere den Graphen von f′“.
* Mit **⇥** neben einer Grafik steht sie rechts neben der vorigen, wenn beide zusammen auf die Seitenbreite (17,4 cm) passen.

### Druckbogen (DIN A4) und PDF
1. Im Export **Zum Druckbogen** wählen (beliebig oft, auch Wertetabellen).
2. **Druckbogen öffnen** (oder `Strg + P`): Reihenfolge ändern, Bildunterschriften eingeben, Kopfzeile „Name / Klasse / Datum“ und Überschrift festlegen.
3. **Drucken / PDF** – im Druckdialog „Als PDF sichern“ wählen und die Skalierung auf 100 % lassen, dann stimmen die Zentimeter.

### TikZ für LaTeX
Der TikZ-Code übernimmt Maßstab (`x=1cm, y=1cm`), Farben, Parameterwerte, Definitionsbereiche, Punkte, Texte, Pfeile, Messwerte, Verteilungen (Histogramm, Glockenkurve mit Fläche, Wahrscheinlichkeit) und Skizzen. Benötigt wird `\usepackage{pgfplots}`. Vorhandener pgfplots-Code lässt sich im Export unter „TikZ-Code importieren“ einlesen.

---

### Kurvendiskussion als Text (Lösungsblatt)
Funktion › **Kurvendiskussion** öffnet ein Fenster mit Vorschau:
* **Bereich:** In welchem x-Bereich untersucht wird (Standard: sichtbarer Ausschnitt). **Ränder als ±∞** schreibt Intervalle wie ]−∞; −1] – sinnvoll, wenn der Graph über den Bereich hinaus gleich weiterläuft.
* **Inhalte:** Definitionsbereich, Symmetrie, Nullstellen, Schnittpunkt mit der y-Achse, Ableitungen, Extrem- und Wendepunkte (Terrassenpunkte werden markiert), Monotonie, Krümmung, Grenzverhalten und Asymptoten – einzeln abschaltbar.
* **Exakte Werte:** √3, 1 − √2, π/2; sonst auf zwei Dezimalen gerundet (mit Hinweis).
* **Für Word kopieren**, **LaTeX kopieren** (mit `itemize`, benötigt `amsmath` und `amssymb`) oder **Zum Druckbogen**.

> Die Werte werden numerisch im gewählten Bereich bestimmt. Bitte vor dem Austeilen kurz prüfen.

---

## 📊 5. Daten (Reiter „Daten“)

### Wertetabelle
* Bereich und Schrittweite wählen, Ausrichtung **quer** (wie im Schulbuch) oder **hoch**.
* **Lücken:** Klick auf eine Zelle leert sie; „Alle“, „Zufällig“, „Keine“ für alle Zellen. Ideal für „Fülle die Wertetabelle aus“.
* Export: **Für Word kopieren** (fertige Tabelle mit Rahmen), **LaTeX**, **CSV**, **Zum Druckbogen**.

### Wahrscheinlichkeitsverteilungen
* **Binomialverteilung B(n; p)** als Histogramm und **Normalverteilung N(μ; σ)** als Glockenkurve – im Reiter Daten unter „Wahrscheinlichkeitsverteilung“ oder in der Eingabezeile mit `X ~ B(20; 0,3)` bzw. `X ~ N(100; 15)`. Das Fenster passt sich an, die Achsen heißen k und P(X = k) bzw. φ(x).
* In der Algebra-Liste unter **Verteilungen** › lassen sich n, p bzw. μ, σ ändern und ein **Bereich markieren**: beide Grenzen für P(a ≤ X ≤ b), nur „bis“ für P(X ≤ b), nur „von“ für P(X ≥ a). Plotoria färbt die Säulen bzw. die Fläche ein und schreibt die Wahrscheinlichkeit darüber, z. B. „P(X ≤ 4) ≈ 0,2375“.
* **μ und μ ± σ markieren**, bei der Binomialverteilung **Normalverteilung darüberlegen** (Näherung mit μ = n·p und σ = √(n·p·(1 − p))).
* Fährt man mit der Maus über eine Säule, zeigt Plotoria P(X = k) und P(X ≤ k).
* **Tabelle für Word** bzw. **Tabelle zum Druckbogen**: k, P(X = k) und P(X ≤ k) – wie im Tafelwerk.
* Im Export wird bei Verteilungen „Breite × Höhe“ voreingestellt, weil die Achsen ganz verschiedene Größenordnungen haben.

### Messwerte & Regression
1. Wertepaare einfügen – je Zeile `x;y`, direkt aus Excel kopiert oder als zwei Zeilen „quer“.
2. **Als Messreihe übernehmen** – die Ansicht passt sich an.
3. In der Algebra-Liste bei der Messreihe **›** → Regressionsart wählen → **Ausgleichskurve**. Das Bestimmtheitsmaß R² wird angezeigt.

---

## 🗂️ 6. Vorlagen und Projekte

* **Aufgabenbibliothek** (oben **Vorlagen**): über 50 Aufgabenformate, geordnet nach **Jahrgangsstufe 8 bis 13** und Thema (orientiert am LehrplanPLUS Gymnasium Bayern) – z. B. „Gerade y = mx + t“, „Gleichungssystem graphisch lösen“, „Scheitelform mit Schiebereglern“, „Wurfparabel“, „Halbwertszeit“, „Allgemeine Sinusfunktion“, „Sekante und Tangente“, „Graph von f aus f′ skizzieren“, „Änderungsrate und Bestand“, „Binomialverteilung“, „Hypothesentest: Ablehnungsbereich“, „Normalverteilung: σ-Regeln“. Oben suchen oder nach Jahrgangsstufe filtern. Vorlagen mit dem Etikett **mit Lösung** enthalten einen verborgenen Lösungsgraphen.
* **In neuem Tab öffnen:** Ist der Schalter an, öffnet die Vorlage einen neuen Tab und der aktuelle Graph bleibt erhalten. Sonst ersetzt sie die Zeichnung – `Strg + Z` holt sie zurück.
* **Tabs:** Zwischen Titel und Vorlagen stehen die geöffneten Graphen. **+** legt einen neuen Tab an, ein Klick wechselt, **×** (oder Mittelklick) schließt – der Hinweis unten bietet **Wiederherstellen** an. Tabs lassen sich per Ziehen umsortieren; Doppelklick auf den aktiven Tab benennt ihn um (über das Titelfeld). Jeder Tab hat seinen eigenen Rückgängig-Verlauf, der Druckbogen gilt für alle Tabs – so entsteht ein Arbeitsblatt aus mehreren Graphen. Mit Zustimmung zum Speichern sind alle Tabs nach dem Neuladen wieder da; ein geteilter Link und eine geöffnete Projektdatei kommen als zusätzlicher Tab dazu.
* **Eigene Vorlagen:** Im Vorlagen-Fenster einen Namen eingeben und **Aktuellen Stand sichern**. Ein Klick auf die Karte lädt die Vorlage, das Papierkorb-Symbol löscht sie. **Als Datei sichern** schreibt alle eigenen Vorlagen in eine Datei, die Kolleginnen und Kollegen mit **Aus Datei laden** übernehmen können. Im Browser bleiben eigene Vorlagen nur gespeichert, wenn beim Start „Speichern erlauben“ gewählt wurde.
* **Sichern** (`Strg + S`) speichert den aktuellen Tab als `.plotoria`-Datei mit allem (auch dem Druckbogen) – ideal für ein Aufgabenarchiv. **Öffnen** (`Strg + O`) oder die Datei einfach ins Fenster ziehen.
* Wenn du beim Start „Speichern erlauben“ wählst, wird der aktuelle Stand außerdem automatisch im Browser gespeichert. Bei „Ablehnen“ wird nichts gespeichert – dann vor dem Schließen mit `Strg + S` als Datei sichern. **Teilen** (Symbol unten) kopiert einen Link mit der kompletten Zeichnung.

---

## 💡 Tipps für den Unterricht

* **Zuordnungsaufgaben:** Mehrere Graphen zeichnen, Beschriftung auf **Text** stellen (A, B, C …), Funktionsterme separat ins Arbeitsblatt schreiben.
* **Erwartungshorizont:** Ableitung `f'` anlegen und **Als Lösung verbergen**. Aufgabe exportieren, dann im Export **Lösungen einblenden** und erneut zum Druckbogen hinzufügen. Die **Kurvendiskussion als Text** liefert die Lösung gleich mit.
* **Skizze im Unterricht prüfen:** Vorlage „Ableitungsgraph skizzieren“ am Whiteboard öffnen, mit dem Stift skizzieren lassen, `L` drückt die Lösung auf – der Toleranzschlauch zeigt sofort, wo die Skizze passt.
* **Stochastik:** `X ~ B(50; 0,5)` eingeben, Bereich „von 32“ markieren – fertig ist die Grafik zum Ablehnungsbereich mit P(X ≥ 32).
* **„Skizziere f′“:** Graph von f zum Druckbogen, dann „Leeres Koordinatensystem daneben“.
* **Sprungstellen ablesen:** Abschnittsweise Funktion auf Karopapier, Punkte mit Hilfslinien.
* **Steigungsdreieck:** Tangenten-Werkzeug auf eine Gerade klicken – oder Vorlage „Steigungsdreieck“ mit Punkten und Pfeilen.
* **Kopiertauglich:** Vor dem Export **Schwarz-Weiß** einschalten – Graphen werden durch Strichart unterschieden.
* **Projektor:** Farbthema „Projektor“ und größere Schrift im Reiter Darstellung.

---

## ⌨️ Tastenkürzel

| Kürzel | Funktion |
|---|---|
| `Strg + Z` / `Strg + Y` | Rückgängig / Wiederholen |
| `Strg + S` / `Strg + O` | Projekt sichern / öffnen |
| `Strg + E` / `Strg + P` | Exportieren / Druckbogen |
| `V` `P` `T` `A` `B` `N` `S` | Werkzeuge (S = Skizze) |
| `L` | Lösung zeigen / verbergen |
| `Pos1`, `+` / `−` | Ansicht zurücksetzen, Zoomen |
| `Entf` | Ausgewähltes Objekt löschen |
| `?` | Hilfe |
| `Esc` | Werkzeug / Dialog beenden |
