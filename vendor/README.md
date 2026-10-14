# Mitgelieferte Bibliotheken

Damit Plotoria ohne Internet (offline, als App) funktioniert, liegen die Bibliotheken hier lokal.

| Bibliothek | Version | Lizenz | Quelle |
|---|---|---|---|
| d3 | 7.9.0 | ISC (`LICENSE-d3.txt`) | https://d3js.org |
| KaTeX inkl. Schriften (nur woff2) | 0.16.9 | MIT (`katex/LICENSE.txt`) | https://katex.org |
| nerdamer (core, Algebra, Calculus) | 1.1.13 | MIT (`nerdamer/LICENSE-nerdamer.txt`) | https://nerdamer.com |
| – darin enthalten: big.js | 5.2.2 | MIT (`nerdamer/LICENSE-big.js.txt`) | https://github.com/MikeMcl/big.js |
| – darin enthalten: BigInteger.js | 1.6.40 | Unlicense, gemeinfrei (`nerdamer/LICENSE-BigInteger.js.txt`) | https://github.com/peterolson/BigInteger.js |

Aktualisieren: Version per npm installieren und die Dateien aus `node_modules/<paket>/dist` hierher kopieren.

Diese Bibliotheken stehen unter ihren eigenen Lizenzen; die CC-BY-NC-4.0-Lizenz von Plotoria gilt für sie nicht. Die Lizenzhinweise müssen beim Weitergeben mitgeliefert werden.

Nicht verwendet werden: Apple SF Symbols, Apple-Schriften (es wird nur die Systemschrift des Geräts angesprochen), Google Fonts, Font Awesome. Die Icons in `js/icons.js` und das App-Icon sind eigene Zeichnungen.
