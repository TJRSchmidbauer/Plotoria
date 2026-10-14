# 🤖 KI-Entwicklung & Antigravity Collaboration

Dieses Projekt **Plotoria** wurde in enger partnerschaftlicher Zusammenarbei zwischen **Tobias Schmidbauer** (Projektleiter, Konzept & Entwickler) und **Google Antigravity AI** (Advanced Agentic Coding Team bei Google DeepMind) entwickelt.

---

## 🏛️ Architektur & Entwicklungsansatz

Plotoria kombiniert moderne Webtechnologien mit agentischer KI-Unterstützung:

* **Mensch-KI Pair Programming:** Konzept, Anforderungen, Benutzeroberfläche und didaktische Design-Entscheidungen stammen von Tobias Schmidbauer. Die technische Implementierung, Refactorings, Performance-Optimierungen und mathematischen Bibliotheks-Integrationen wurden agentisch durch Google Antigravity umgesetzt.
* **Agentische Workflows:** Einsatz von spezialisierten Subagenten, automatisiertem Refactoring, Fast-Compilation-Engines, hardware-beschleunigtem Drag & Drop und interaktiver Git-Branch-Verwaltung.

---

## 🚀 Meilensteine der KI-gestützten Entwicklung

### 📌 Basis-Plotter (Version 1.0)
* Aufbau eines maßgeschneiderten SVG-Rendering-Core mit D3.js.
* Grundlegende Plot-Funktionalität für mathematische Funktionen.
* Deutsches Koordinatensystem mit Pfeilachsen und Achsenbeschriftung.

### 📌 AI-Enhanced Release (Version 2.0)
* **Mathematische Präzision & Fast Compilation:** Fast JS Compilation über `nerdamer.buildFunction()`, welche die Auswertung beschleunigt und 60 FPS Zoomen/Verschieben ermöglicht.
* **KaTeX Formelsatz:** Wunderschöne mathematische Formeldarstellung im Algebra-Panel.
* **Erweiterte Kurvendiskussion:** Automatische Berechnung von Nullstellen $N$, Y-Achsenabschnitten $S_y$, Extrema $Max/Min$, Wendepunkten $W$ ($f''(x)=0$) und Schnittpunkten $S$.
* **Hardware-beschleunigtes Drag & Drop:** Frei verschiebbare Smart Labels mit dynamischen Verbindungslinien.
* **Interaktive Wertetabelle & CSV-Export:** Tabellenansicht mit anpassbarem Bereich und CSV-Download.
* **RAD / DEG Umschaltung:** Unterstützung für Bogen- und Gradmaß bei trigonometrischen Funktionen.
* **Exporte:** PNG, Zwischenablage, SVG, TikZ/LaTeX und URL-State-Sharing.

### 📌 Überarbeitung (Version 2.1)
* **Eigener Ausdrucks-Parser:** Terme werden in einen Syntaxbaum zerlegt und zu JavaScript kompiliert; nerdamer dient nur noch für symbolische Ableitungen (mit numerischer Gegenprobe). Behoben u. a.: `ln(x)` wurde als `ln·x` gelesen, `\frac{…}{…}` und `\sqrt{…}` funktionierten nicht, `x^23` wurde zu `x^2·3`, `|x|` war ungültig.
* **Fehlerbehebungen:** Max/Min wurde nach dem Vorzeichen von $y$ statt der Ableitung bestimmt; doppelte Funktions-IDs nach dem Löschen; $x_{min}=0$ wurde in den Einstellungen ignoriert; TikZ-Export enthielt `f(x) = …` und rechnete Winkelfunktionen im Gradmaß; Polstellen wurden als senkrechte Linien gezeichnet; SVG-Export ohne Dateiendung.
* **Neue bzw. vervollständigte Funktionen:** Wertetabelle mit CSV-Export, Wendepunkte, Parameter-Erkennung und -Animation, Ableitungen `f'`/`f''`, Funktionsverweise, RAD/DEG, Undo/Redo, Autospeichern, Teilen-Link, PNG-Export und Bild kopieren, Beispiele, Hilfe-Dialog, Tastenkürzel, KaTeX-Formelsatz, Touch-Bedienung.
* **Tests:** `npm test` prüft den Parser (Node.js-Testrunner).

### 📌 Version 2.0 – für Lehrkräfte und Prüfungen
* Neue Oberfläche nach Apples Human Interface Guidelines (Systemschrift, Materialien, Segmented Controls, Sheets, Hell/Dunkel, Barrierefreiheit).
* Maßstabsgetreuer Export (cm, PNG mit 300 dpi, SVG, TikZ), Druckbogen DIN A4 mit PDF, Schwarz-Weiß-Modus, Karopapier.
* Punkte, Texte, Pfeile, senkrechte Geraden, Definitionsbereiche, Asymptoten, Beschriftungsmodi, freie Achsenskalierung.
* Messwerte mit Regression, Wertetabelle mit Lücken, Projektdateien, Aufgabenvorlagen, exakte Werte, Offline-Betrieb (PWA).
* Details: [CHANGELOG.md](CHANGELOG.md).

---

## 👨‍💻 Mitwirkende & Credits

* **Tobias Schmidbauer** – Idee, Architektur, didaktische Ausrichtung & Projektleitung
* **Google Antigravity AI** – Autonomous Coding Agent & Performance Optimization (Google DeepMind)
