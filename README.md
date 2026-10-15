# 📈 Plotoria 3.0

**Graphen für Arbeitsblätter und Prüfungen – maßstabsgetreu, druckfertig, auch offline.** ✨

Plotoria ist ein webbasierter Funktionsplotter für Schule und Unterricht. Lehrkräfte erstellen damit Graphen, bearbeiten sie (Beschriftungen, Punkte, Pfeile, Definitionsbereiche, Lückentabellen) und exportieren sie in exakter Größe für Word, LaTeX oder den Druck.

### 🌐 [Plotoria direkt im Browser öffnen](https://tjrschmidbauer.github.io/Plotoria/)

---

## 📚 Dokumentation

* 📘 **[Bedienungsanleitung & Tipps für den Unterricht (ANLEITUNG.md)](ANLEITUNG.md)**
* 📝 **[Änderungsprotokoll (CHANGELOG.md)](CHANGELOG.md)** – was in Version 3.0 neu ist
* 🤖 **[KI-Entwicklung (AI_DEVELOPMENT.md)](AI_DEVELOPMENT.md)**

---

## ✨ Hauptfunktionen

### Neu in Version 3.0
* 🧱 **Abschnittsweise definierte Funktionen:** `f(x) = x² für x < 1; 2x − 1 für x ≥ 1` – Sprungstellen mit gefülltem ● und offenem ○ Randpunkt.
* 🌈 **Funktionsscharen:** `f_a(x) = a·x² für a = 1, 2, 3` – jede Kurve automatisch beschriftet.
* 🪞 **Umkehrfunktion** per Klick: Spiegelung an y = x mit Winkelhalbierender.
* ∫ **Stammfunktion** F mit wählbarer Konstante C (auch mehrere C als Schar), exakt oder numerisch.
* 📏 **Hilfslinien** zum Ablesen: gestrichelte Lote von Punkten auf beide Achsen.
* ▥ **Riemann-Summen:** Unter-, Ober- und Mittelsumme mit einstellbarer Rechteckzahl.
* 📝 **Kurvendiskussion als Text:** Definitionsbereich, Symmetrie, Nullstellen, Extrema, Wendepunkte, Monotonie, Krümmung, Grenzverhalten – für Word, LaTeX oder den Druckbogen.
* 🗺️ **Mehrere Koordinatensysteme auf einem Blatt:** leeres Raster („Skizziere f′“) neben dem Graphen.
* ⭐ **Eigene Vorlagen:** aktuellen Stand als Vorlage sichern und als Datei mit Kolleginnen und Kollegen tauschen.

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
* 🗂️ **Projektdateien (.plotoria)**, **18 Aufgabenvorlagen** und eigene Vorlagen.
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
npm test      # verwendet die mitgelieferten Bibliotheken aus vendor/, keine Installation nötig
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
| `js/templates.js` | Aufgabenvorlagen und eigene Vorlagen |
| `js/discussion.js` | Kurvendiskussion als Text (Word, LaTeX, Druckbogen) |
| `js/tikz.js` | TikZ-Export und -Import |
| `sw.js`, `manifest.webmanifest` | Offline-Betrieb und App-Installation |

Frühere Versionen sind in den Branches [`version/1.0`](https://github.com/TJRSchmidbauer/Plotoria/tree/version/1.0) und [`version/2.0`](https://github.com/TJRSchmidbauer/Plotoria/tree/version/2.0) gesichert.

---

## 🔒 Datenschutz

* **Keine Cookies**, kein Tracking, keine Analyse- oder Werbedienste, keine Anmeldung.
* **Keine Daten an Dritte:** Alle Bibliotheken und Schriften liegen im Projekt; es werden keine externen Server (CDNs, Google Fonts o. Ä.) aufgerufen.
* **Speichern nur mit Zustimmung:** Bei jedem Start fragt Plotoria in einem eigenen Hinweis, ob der Arbeitsstand, der Druckbogen, eigene Vorlagen (`localStorage`) und die App-Dateien für den Offline-Betrieb (Service-Worker-Cache) lokal im Browser gespeichert werden dürfen. Vor der Entscheidung wird nichts gelesen oder gespeichert. Bei „Ablehnen“ werden vorhandene Plotoria-Daten gelöscht und Plotoria arbeitet nur im Arbeitsspeicher; Sichern als Datei und Teilen per Link funktionieren weiterhin.
* Die gespeicherten Daten verlassen das Gerät nicht und lassen sich jederzeit über „Ablehnen“ beim nächsten Start oder die Browser-Einstellungen („Websitedaten löschen“) entfernen.
* Beim Aufruf über GitHub Pages gelten für den Server die [Datenschutzbestimmungen von GitHub](https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement).

---

## 📄 Lizenz & Rechtliche Hinweise (CC BY-NC 4.0)

Dieses Werk ist unter der **[Creative Commons Namensnennung - Nicht-kommerziell 4.0 International Lizenz (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/deed.de)** lizenziert.

Die Lizenzbestimmungen sind in der Datei **[LICENSE](LICENSE)** hinterlegt. Mitgelieferte Bibliotheken im Ordner `vendor/` (d3, KaTeX, nerdamer mit big.js und BigInteger.js) stehen unter ihren eigenen Lizenzen (ISC, MIT, Unlicense) – siehe [vendor/README.md](vendor/README.md).

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
