// Tests für den TikZ-Export und -Import:  npm test
const test = require('node:test');
const assert = require('node:assert');
global.MathParser = require('../js/math-parser.js');
const TikZ = require('../js/tikz.js');
const MP = global.MathParser;

const bounds = { xMin: -2, xMax: 4, yMin: -1, yMax: 9 };

test('Maßstab, Bogenmaß, Parameter', () => {
  const t = TikZ.generate([{ letter: 'f', ast: MP.parse('a*sin(x)'), col: '#007AFF', strokeWidth: 3 }], bounds, { ux: 1, uy: 0.5, params: { a: 2 } });
  assert.match(t, /x=1cm, y=0\.5cm/);
  assert.match(t, /trig format plots=rad/);
  assert.match(t, /\{\(2\)\*sin\(x\)\};/);
  assert.match(t, /\\definecolor\{plotoria0\}\{HTML\}\{007AFF\}/);
});

test('Gradmaß, Definitionsbereich, Schwarz-Weiß', () => {
  const t = TikZ.generate([{ letter: 'f', ast: MP.parse('x^2'), col: '#f00', lo: 0, hi: 3, loOpen: false, hiOpen: true, f0: x => x * x }], bounds, { deg: true, bw: true });
  assert.doesNotMatch(t, /trig format/);
  assert.doesNotMatch(t, /definecolor/);
  assert.match(t, /domain=0:3/);
  assert.match(t, /fill=white\] \(axis cs:3,9\)/);   // offener Randpunkt
  assert.match(t, /fill=black\] \(axis cs:0,0\)/);   // geschlossener Randpunkt
});

test('Objekte und Messwerte', () => {
  const t = TikZ.generate([], bounds, {
    objects: [
      { type: 'point', px: 1, py: 2, text: 'A(1 | 2)', col: '#000' },
      { type: 'vline', px: 2, col: '#888', dash: 'dash' },
      { type: 'text', x: 0, y: 5, text: 'G_1 & Co', col: '#000' },
      { type: 'arrow', x1: 0, y1: 0, x2: 1, y2: 1, col: '#000', double: true },
    ],
    datasets: [{ pts: [[0, 1], [1, 2]], col: '#FF9500' }],
  });
  assert.match(t, /circle \(2\.2pt\) node.*\{A\(1 \$\|\$ 2\)\}/);
  assert.match(t, /dashed, line width=0\.8pt\] \(axis cs:2,-1\) -- \(axis cs:2,9\)/);
  assert.match(t, /\{\$G_\{1\}\\ \\&\\ Co\$\}|\{\$G_\{1\}\\ &\\ Co\$\}/);
  assert.match(t, /stealth-stealth/);
  assert.match(t, /coordinates \{\(0,1\) \(1,2\)\}/);
});

test('Import', () => {
  const r = TikZ.parse('\\begin{axis}[xmin=-2, xmax=2, ymin=-1, ymax=4] \\addplot[red] {x^{2}}; \\addplot+ {sin(deg(x))}; \\end{axis}');
  assert.deepStrictEqual(r.functions, ['x^{2}', 'sin((x))']);
  assert.deepStrictEqual(r.bounds, { xMin: -2, xMax: 2, yMin: -1, yMax: 4 });
  assert.strictEqual(r.degMode, false);
  assert.strictEqual(TikZ.parse('\\addplot {sin(x)};').degMode, true);   // pgfplots-Standard: Grad
});
