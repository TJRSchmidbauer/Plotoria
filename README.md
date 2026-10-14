# 📈 Plotoria 2.0

**Graphen für Arbeitsblätter und Prüfungen – maßstabsgetreu, druckfertig, auch offline.** ✨

Plotoria ist ein webbasierter Funktionsplotter für Schule und Unterricht. Lehrkräfte erstellen damit Graphen, bearbeiten sie (Beschriftungen, Punkte, Pfeile, Definitionsbereiche, Lückentabellen) und exportieren sie in exakter Größe für Word, LaTeX oder den Druck.

### 🌐 [Plotoria direkt im Browser öffnen](https://tjrschmidbauer.github.io/Plotoria/)

---

## 📚 Dokumentation

* 📘 **[Bedienungsanleitung & Tipps für den Unterricht (ANLEITUNG.md)](ANLEITUNG.md)**
* 📝 **[Änderungsprotokoll (CHANGELOG.md)](CHANGELOG.md)** – was in Version 2.0 neu ist
* 🤖 **[KI-Entwicklung (AI_DEVELOPMENT.md)](AI_DEVELOPMENT.md)**

---

## ✨ Hauptfunktionen

### Für Prüfungen und Arbeitsblätter
* 📏 **Maßstabsgetreuer Export:** „1 Einheit = 1 cm“ oder feste Größe in cm – als PNG (300 dpi, Word übernimmt die Größe), SVG, TikZ oder PDF.
* 🖨️ **Druckbogen DIN A4:** Grafiken und Tabellen sammeln, mit Kopfzeile „Name / Klasse / Datum“ drucken oder als PDF sichern.
* ⚫ **Schwarz-Weiß-Modus:** Strichmuster statt Farben, schraffierte Flächen – kopiertauglich.
* 🟦 **Karopapier:** 5-mm-Kästchen mit festem Maßstab wie im Schulheft.
* 🏷️ **Beschriftungen je Graph:** G_f, Funktionsterm, eigener Text (A, B, C …) oder keine.
* 📍 **Punkte, Texte, Pfeile, senkrechte Geraden** – per Werkzeug oder Eingabe `A(2|3)`, `x = 2`.
* ✂️ **Definitionsbereiche** (`f(x) = x² für 0 ≤ x < 3`) mit offenen/geschlossenen Randpunkten.
* ↗️ **Asymptoten** senkrecht, waagrecht und schief.
* 🔢 **Achsen frei skalieren:** Schritte wie `pi/2`, Vielfache von π, Brüche, Achsentitel mit Einheit.
* 📊 **Messwerte & Regression** (linear, quadratisch, kubisch, exponentiell, Potenz) mit R².
* 🧩 **Lückenhafte Wertetabelle** für Word, LaTeX, CSV und Druckbogen.
* 🗂️ **Projektdateien (.plotoria)** und **13 Aufgabenvorlagen**.
* √ **Exakte Werte** wie √2, π/2, 1/3 in der Kurvendiskussion.

### Mathematik
* 📐 **Kurvendiskussion:** Nullstellen, y-Abschnitt, Hoch-/Tiefpunkte, Wendepunkte, Schnittpunkte.
* ✏️ **Ableitungen** `f'`, `f''` (symbolisch, werden mitgeführt) und Funktionsverweise `g(x) = f(x − 2) + 1`.
* 📈 **Tangente & Normale** mit Steigungsdreieck, **Integral** und Flächeninhalt.
* 🎛️ **Parameter** mit Schiebereglern und Animation; **RAD/DEG**.

### Bedienung
* 🍏 Gestaltung nach Apples Human Interface Guidelines, Hell- und Dunkelmodus automatisch.
* ✈️ **Offline-fähig** und als App installierbar (PWA).
* ↩️ Rückgängig/Wiederholen, Autospeichern, Teilen per Link.

---

## 🚀 Starten & Entwickeln

Plotoria ist eine statische Webseite ohne Build-Schritt. Alle Bibliotheken liegen im Ordner `vendor/`. `index.html` im Browser öffnen oder einen Webserver im Projektordner starten, z. B. `python3 -m http.server 8080` (der Offline-Modus funktioniert nur über http/https).

Tests (Node.js ≥ 18):

```bash
npm install   # installiert nerdamer für die Ableitungstests
npm test
```

Projektaufbau:

| Datei | Inhalt |
|---|---|
| `js/math-parser.js` | Ausdrucks-Parser und -Compiler, Definitionen, TeX-/pgf-/Unicode-Ausgabe |
| `js/numerics.js` | Exakte Werte, Regression, Messwerte, Asymptoten, PNG-Auflösung |
| `js/plotoria.js` | Kern: Zustand, Funktionen, Zeichnen, Werkzeuge |
| `js/objects.js` | Punkte, Texte, Pfeile, senkrechte Geraden |
| `js/data.js` | Wertetabelle mit Lücken, Messreihen |
| `js/export.js` | Export in cm, Druckbogen, Projektdateien |
| `js/templates.js` | Aufgabenvorlagen |
| `js/tikz.js` | TikZ-Export und -Import |
| `sw.js`, `manifest.webmanifest` | Offline-Betrieb und App-Installation |

Version 1.0 ist im Branch [`version/1.0`](https://github.com/TJRSchmidbauer/Plotoria/tree/version/1.0) gesichert.

---

## 📄 Lizenz & Rechtliche Hinweise (CC BY-NC 4.0)

Dieses Werk ist unter der **[Creative Commons Namensnennung - Nicht-kommerziell 4.0 International Lizenz (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/deed.de)** lizenziert.

Die Lizenzbestimmungen sind in der Datei **[LICENSE](LICENSE)** hinterlegt.

### 📜 Lizenz-Statuten im Überblick:
* **Namensnennung (BY):** Sie müssen angemessene Urheber- und Rechteangaben machen (Urheber: **Tobias Schmidbauer**), einen Link zur Lizenz beifügen und angeben, ob Änderungen vorgenommen wurden.
* **Nicht-kommerziell (NC):** Sie dürfen das Material nicht für kommerzielle Zwecke nutzen.
* **Freiheit zum Teilen & Bearbeiten:** Das Werk darf für nicht-kommerzielle Zwecke frei kopiert, verbreitet, verändert und darauf aufgebaut werden.

* Lizenz-Zusammenfassung: [https://creativecommons.org/licenses/by-nc/4.0/deed.de](https://creativecommons.org/licenses/by-nc/4.0/deed.de)
* Vollständiger Gesetzestext: [https://creativecommons.org/licenses/by-nc/4.0/legalcode](https://creativecommons.org/licenses/by-nc/4.0/legalcode)

---

## 👨‍💻 Entwickelt von
* **Tobias Schmidbauer** (Idee, Architektur, didaktische Ausrichtung & Projektleitung)
* In gemeinsamer Entwicklung mit **Google Antigravity AI** (Advanced Agentic Coding Team, Google DeepMind)
