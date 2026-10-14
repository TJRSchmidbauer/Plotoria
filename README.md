# 📈 Plotoria

**Dein moderner, webbasierter Funktionsplotter für Schule, Studium und Wissenschaft!** ✨

Plotoria ist ein interaktiver, hochperformanter Funktionsplotter mit integrierter Kurvendiskussion, KaTeX-Formelsatz, interaktiver Wertetabelle, Parameter-Animationen und TikZ/SVG/PNG-Export.

### 🌐 [Plotoria direkt im Browser öffnen](https://tjrschmidbauer.github.io/Plotoria/)

---

## 📚 Dokumentation & Anleitungen

* 📘 **[Vollständige Bedienungsanleitung & Tipps (ANLEITUNG.md)](ANLEITUNG.md)**: Detaillierte Schritt-für-Schritt-Anleitung für alle Funktionen, didaktische Tipps & Tricks, Tastaturkürzel und Exporte.
* 🤖 **[KI-Entwicklung & Antigravity Collaboration (AI_DEVELOPMENT.md)](AI_DEVELOPMENT.md)**: Dokumentation der gemeinsamen Mensch-KI-Entwicklung mit Google Antigravity AI.

---

## ✨ Hauptfunktionen

* ⚡ **Schnelle Auswertung:** Eigener Ausdrucks-Compiler übersetzt Terme in JavaScript – flüssiges Zoomen und Verschieben.
* 📐 **Kurvendiskussion:** Automatische Berechnung & Beschriftung von Nullstellen ($N$), $y$-Abschnitt ($S_y$), Hoch-/Tiefpunkten ($H$/$T$), Wendepunkten ($W$) und Schnittpunkten ($S$).
* 🖱️ **Verschiebbare Beschriftungen:** Punkt- und Graphbeschriftungen per Drag & Drop, mit gestrichelter Verbindungslinie.
* ✏️ **Ableitungen & Verknüpfungen:** `f'` / `f''` werden symbolisch berechnet und automatisch mitgeführt; `g(x) = f(x-2) + 1` greift auf andere Funktionen zu.
* 📈 **Tangente, Normale, Integral:** Live-Tangente mit Steigungsdreieck, Normale, orientiertes Integral und Flächeninhalt (Simpson-Regel).
* 📊 **Wertetabelle & CSV-Export:** Tabellen mit frei wählbarem Bereich, CSV mit Semikolon und Dezimalkomma (für deutsches Excel/LibreOffice).
* 🎛️ **Parameter-Schieberegler & Animation:** Unbekannte Buchstaben ($a, b, c$) werden automatisch zu Parametern; per Play-Button schwingen sie.
* 🎨 **KaTeX-Formelsatz:** Formeldarstellung im Algebra-Panel und Live-Vorschau beim Tippen.
* 🔄 **RAD / DEG Modus:** Umschaltung zwischen Bogen- und Gradmaß per Klick.
* ↩️ **Rückgängig / Wiederholen & Autospeichern:** Der Arbeitsstand bleibt nach einem Neuladen erhalten.
* 📤 **Exporte:** PNG, Bild in die Zwischenablage, SVG, TikZ/pgfplots (inkl. Import) und Teilen per Link.

---

## 🚀 Starten & Entwickeln

Plotoria ist eine statische Webseite ohne Build-Schritt: `index.html` im Browser öffnen oder einen beliebigen Webserver im Projektordner starten, z. B. `python3 -m http.server 8080`.

Tests für den Ausdrucks-Parser (Node.js ≥ 18):

```bash
npm install   # installiert nerdamer für die Ableitungstests
npm test
```

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
