# 📘 Plotoria – Ausführliche Bedienungsanleitung & Praxis-Tipps

Willkommen zur offiziellen Benutzeranleitung von **Plotoria**, dem modernen, browserbasierten Funktionsplotter für Schule, Studium, Lehre und Mathematikbegeisterte.

---

## 🚀 Quick-Start

1. Öffne Plotoria im Browser (z. B. unter [http://localhost:8080](http://localhost:8080) oder auf GitHub Pages).
2. Gib in der Algebra-Spalte oben im Eingabefeld eine Funktion ein, z. B. `x^2 - 4` oder `f(x) = sin(x)`.
3. Drücke **Enter** oder klicke auf das **+ (Hinzufügen)**.
4. Der Graph wird sofort in flüssigen 60 FPS gezeichnet.

---

## 🧮 1. Funktionen eingeben & verwalten

### Unterstützte Schreibweisen
* **Standard-Ausdrücke:** `x^3 - 2*x`, `1/x`, `exp(-x^2)`
* **Mit Funktionsnamen:** `f(x) = sin(x)`, `g(x) = 2*x + 1`
* **Mathematische Funktionen:** `sin(x)`, `cos(x)`, `tan(x)`, `sqrt(x)`, `abs(x)`, `log(x)`, `exp(x)`
* **Parameter-Terme:** `a*x^2 + b*x + c`

### Beispiele-Dropdown
In der oberen Kopfzeile befindet sich ein **Beispiele-Dropdown** mit vorbereiteten Funktionen:
* **Polynom 3. Grades:** `x^3 - 2*x`
* **Sinuskurve:** `sin(x)`
* **Gaußsche Glockenkurve:** `exp(-x^2)`
* **Gebrochen-Rational:** `1/x`
* **Parabel mit Parametern:** `a*x^2 + b*x + c` (legt Parameter $a, b, c$ automatisch an)

---

## 🔍 2. Automatische Kurvendiskussion (Smart Labels)

Wenn die Option **Kurvendiskussion (Smart Labels)** aktiviert ist, berechnet Plotoria automatisch alle wichtigen Kennpunkte und zeichnet sie farbig ein:

* **N (Nullstellen):** Schnittpunkte der Funktion mit der $x$-Achse $N(x|0)$.
* **S_y (Y-Achsenabschnitt):** Schnittpunkt mit der $y$-Achse $S_y(0|y_0)$.
* **Max / Min (Extrema):** Hochpunkte und Tiefpunkte der Funktion.
* **W (Wendepunkte):** Punkte, an denen $f''(x) = 0$ gilt (in Lila hervorgehoben).
* **S (Schnittpunkte):** Schnittpunkte zwischen verschiedenen Funktionsgraphen.

> 💡 **Tipp:** Alle Smart Labels lassen sich per Drag & Drop **frei im Koordinatensystem verschieben**. Beim Ziehen bleibt eine gestrichelte Verbindungslinie zum Punkt auf der Kurve bestehen.

---

## 📊 3. Wertetabelle

Im Tab **Tabelle** kannst du für alle aktiven Funktionen exakte Wertetabellen erzeugen:

1. Klicke oben auf den Tab **Tabelle**.
2. Wähle den Startwert ($x_{\text{Start}}$), Endwert ($x_{\text{Ende}}$) und die Schrittweite ($\Delta x$).
3. Klicke auf **Tabelle generieren**.
4. Über den Button **CSV Export** kannst du die Tabelle direkt für Excel oder LibreOffice Calc herunterladen.

---

## 🎛️ 4. Parameter & Animationen

Sobald du eine Funktion mit Variablen wie `a*x^2 + b*x + c` eingibst:
1. Plotoria erkennt die Parameter $a, b, c$ automatisch und legt Schieberegler an.
2. Mit den Reglern kannst du Werte in Echtzeit verändern und die Wirkung auf den Graphen beobachten.
3. Klicke auf **Animieren (Play-Button)**, um die Parameter automatisch in einer Schleife schwingen zu lassen.

---

## 💡 Tipps & Tricks für Unterricht & Praxis

### 💡 Tipp 1: Wertsprung & Asymptoten erkennen
Bei gebrochen-rationalen Funktionen wie $f(x) = \frac{1}{x}$ kannst du den Zoom mit dem Mausrad feinfühlig anpassen, um Polstellen und Asymptoten genau zu analysieren.

### 💡 Tipp 2: Tangenten & Normalen zeichnen
Klicke in der Werkzeugleiste des Graphen auf das **Tangenten-Icon (Chart-Line)** und bewege den Mauszeiger über einen Graphen. Plotoria berechnet die Tangente und Normale an dieser Stelle live und zeigt die Geradengleichung an!

### 💡 Tipp 3: Flächeninhalte (Integrale) berechnen
Nutze das Integral-Feature, um die Fläche zwischen einem Graphen und der $x$-Achse in einem wählbaren Intervall $[a, b]$ numerisch per Simpson-Verfahren zu berechnen und farbig hervorzuheben.

### 💡 Tipp 4: Grafik in Word / PowerPoint einfügen
Klicke in der Werkzeugleiste auf das **Zwischenablage-Icon (Copy)**. Der Graph wird direkt als hochauflösendes Bild kopiert und kann mit `Strg + V` sofort in Word, PowerPoint oder ein Arbeitsblatt eingefügt werden.

### 💡 Tipp 5: Arbeitsstände per Link teilen
Klicke auf das **Teilen-Icon (Share-Alt)**. Es wird ein kompakter Link generiert, der alle eingegebenen Funktionen, Parameter und Ansichtseinstellungen enthält. Ideal zum Versenden an Schüler oder Kollegen!

---

## ⌨️ Tastatur-Kürzel

| Kürzel | Funktion |
|---|---|
| `Strg + Z` | Rückgängig (Undo) |
| `Strg + Y` | Wiederholen (Redo) |
| `Home` | Ansicht auf Standard zurücksetzen |
| `+` / `-` | Hinein- / Herauszoomen |
| `?` | Hilfe & Kürzel-Modal öffnen |
| `Esc` | Aktionsmodus abbrechen |
