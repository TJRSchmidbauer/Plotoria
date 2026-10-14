# 📘 Plotoria – Ausführliche Bedienungsanleitung & Praxis-Tipps

Willkommen zur offiziellen Benutzeranleitung von **Plotoria**, dem modernen, browserbasierten Funktionsplotter für Schule, Studium, Lehre und Mathematikbegeisterte.

---

## 🚀 Quick-Start

1. Öffne Plotoria im Browser unter [tjrschmidbauer.github.io/Plotoria](https://tjrschmidbauer.github.io/Plotoria/) oder lokal (z. B. `python3 -m http.server 8080` im Projektordner, dann [http://localhost:8080](http://localhost:8080)).
2. Gib in der Algebra-Spalte oben im Eingabefeld eine Funktion ein, z. B. `x^2 - 4` oder `f(x) = sin(x)`.
3. Drücke **Enter** oder klicke auf das **+ (Hinzufügen)**.
4. Der Graph wird sofort in flüssigen 60 FPS gezeichnet.

---

## 🧮 1. Funktionen eingeben & verwalten

### Unterstützte Schreibweisen
* **Standard-Ausdrücke:** `x^3 - 2*x`, `1/x`, `exp(-x^2)` – der Malpunkt darf fehlen: `2x(x+1)`, `3sin(x)`
* **Mit Funktionsnamen:** `f(x) = sin(x)`, `g(x) = 2*x + 1` (ein vorhandenes `f` wird neu definiert), `y = 2x + 1`
* **Ableitungen:** `f'` bzw. `f''` fügt die 1. bzw. 2. Ableitung von `f` hinzu; sie wird bei Änderungen an `f` automatisch aktualisiert
* **Andere Funktionen verwenden:** `g(x) = f(x - 2) + 1`, `h(x) = f'(x)`
* **Mathematische Funktionen:** `sin`, `cos`, `tan`, `cot`, `arcsin`, `arccos`, `arctan`, `sinh`, `cosh`, `tanh`, `sqrt`, `root(x, n)`, `abs(x)` bzw. `|x|`, `exp`, `ln` (= `log`), `lg` (Zehnerlogarithmus), `log(b, x)`, `sign`, `floor`, `ceil`, `round`, `min`, `max`, `n!`
* **Konstanten:** `pi` bzw. `π`, `e`, sowie `°` bzw. `deg` für Winkel im Bogenmaß: `sin(30°)`
* **Parameter-Terme:** `a*x^2 + b*x + c` – unbekannte Buchstaben werden automatisch zu Parametern
* **Deutsche Schreibweise & LaTeX:** `0,5x`, `x²`, `2·x`, `\frac{1}{x}`, `\sqrt[3]{x}`

> ⚠️ Das Komma zwischen zwei Ziffern ist immer ein Dezimalkomma. Argumente daher mit Komma **und Leerzeichen** trennen: `log(2, 8)`, `max(x, 1)`.

Fehlerhafte Eingaben werden direkt unter dem Eingabefeld erklärt (z. B. „Schließende Klammer fehlt“); der Text bleibt zum Korrigieren stehen. Beim Tippen erscheint eine Formelvorschau.

### Beispiele-Dropdown
In der oberen Kopfzeile befindet sich ein **Beispiele-Dropdown** mit vorbereiteten Funktionen:
* **Polynom 3. Grades:** `x^3 - 2*x`
* **Sinuskurve:** `sin(x)`
* **Gaußsche Glockenkurve:** `exp(-x^2)`
* **Gebrochen-Rational:** `1/x`
* **Parabel mit Parametern:** `a*x^2 + b*x + c` (legt Parameter $a, b, c$ automatisch an)

---

## 🔍 2. Automatische Kurvendiskussion (Smart Labels)

Wenn der Schalter **Kurvendiskussion** in der Algebra-Spalte aktiviert ist, berechnet Plotoria automatisch alle wichtigen Kennpunkte und zeichnet sie farbig ein:

* **N (Nullstellen):** Schnittpunkte der Funktion mit der $x$-Achse $N(x|0)$.
* **S_y (Y-Achsenabschnitt):** Schnittpunkt mit der $y$-Achse $S_y(0|y_0)$.
* **H / T (Extrema):** Hochpunkte und Tiefpunkte der Funktion.
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
1. Plotoria erkennt die Parameter $a, b, c$ automatisch und legt Schieberegler an (Startwert 1).
2. Mit den Reglern kannst du Werte in Echtzeit verändern und die Wirkung auf den Graphen beobachten. Unter jedem Regler lässt sich der Bereich („von … bis …“) einstellen.
3. Klicke auf den **Play-Button** neben dem Regler, um den Parameter automatisch zwischen Minimum und Maximum schwingen zu lassen.
4. Automatisch angelegte Parameter verschwinden wieder, sobald keine Funktion sie mehr verwendet.

---

## 💡 Tipps & Tricks für Unterricht & Praxis

### 💡 Tipp 1: Wertsprung & Asymptoten erkennen
Bei gebrochen-rationalen Funktionen wie $f(x) = \frac{1}{x}$ kannst du den Zoom mit dem Mausrad feinfühlig anpassen, um Polstellen und Asymptoten genau zu analysieren.

### 💡 Tipp 2: Tangenten & Normalen zeichnen
Klicke in der Werkzeugleiste des Graphen auf das **Tangenten-Icon (Chart-Line)** und bewege den Mauszeiger über einen Graphen. Plotoria berechnet Tangente, Normale und Steigungsdreieck an dieser Stelle live und zeigt die Geradengleichungen an. Ein Klick hält die Tangente fest; sie folgt dann auch Parameteränderungen. `Esc` beendet das Werkzeug.

### 💡 Tipp 3: Flächeninhalte (Integrale) berechnen
Klicke bei einer Funktion auf **∫**, um das Integral über ein Intervall $[a, b]$ numerisch per Simpson-Verfahren zu berechnen und farbig hervorzuheben. Die Grenzen lassen sich mit der Maus verschieben. Angezeigt werden das orientierte Integral und der Flächeninhalt $A$ (Flächen unterhalb der $x$-Achse positiv gezählt).

### 💡 Tipp 4: Grafik in Word / PowerPoint einfügen
Klicke in der Werkzeugleiste auf das **Zwischenablage-Icon (Copy)**. Der Graph wird direkt als hochauflösendes Bild kopiert und kann mit `Strg + V` sofort in Word, PowerPoint oder ein Arbeitsblatt eingefügt werden.

### 💡 Tipp 5: Arbeitsstände per Link teilen
Klicke auf das **Teilen-Icon (Share-Alt)**. Es wird ein kompakter Link generiert, der alle eingegebenen Funktionen, Parameter und Ansichtseinstellungen enthält. Ideal zum Versenden an Schüler oder Kollegen!

### 💡 Tipp 6: Ausschnitt exportieren & hineinzoomen
Mit dem **Auswahl-Werkzeug (Crop)** ziehst du ein Rechteck auf. Solange es aktiv ist, exportieren SVG, PNG und TikZ nur diesen Ausschnitt. Ein Doppelklick in die Auswahl zoomt hinein.

### 💡 Tipp 7: TikZ für LaTeX-Dokumente
Der TikZ-Export erzeugt pgfplots-Code mit den aktuellen Farben, Parameterwerten und dem richtigen Winkelmaß (`trig format plots=rad`). Im Präambel wird `\usepackage{pgfplots}` benötigt. Vorhandener pgfplots-Code kann im Export-Tab wieder importiert werden.

### 💡 Tipp 8: Gradmaß
Mit dem Schalter **RAD/DEG** in der Kopfzeile rechnen alle Winkelfunktionen im Gradmaß (`sin(90) = 1`). Ableitungen bleiben dabei mathematisch korrekt (Faktor $\frac{\pi}{180}$).

---

## 💾 Speichern

Plotoria speichert den Arbeitsstand automatisch im Browser und stellt ihn beim nächsten Öffnen wieder her. Über **Rückgängig / Wiederholen** in der Kopfzeile (oder `Strg + Z` / `Strg + Y`) lassen sich Änderungen zurücknehmen.

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
