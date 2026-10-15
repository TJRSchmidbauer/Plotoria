// Tests für die Neuerungen in Version 3.0:  node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert');

global.nerdamer = require('../vendor/nerdamer/nerdamer.core.js');
require('../vendor/nerdamer/Algebra.js'); require('../vendor/nerdamer/Calculus.js');
const MP = require('../js/math-parser.js');
const Numerics = require('../js/numerics.js');
global.MathParser = MP;
const TikZ = require('../js/tikz.js');

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);
const fnOf = (src, P) => { const d = MP.parseDefinition(src); return MP.compile(MP.parseFunction(d, {}), P || {}); };

test('Abschnittsweise Funktionen: Zerlegen und Auswerten', () => {
  const d = MP.parseDefinition('f(x) = x^2 für x < 1; 2x + 1 für x ≥ 1');
  assert.strictEqual(d.pieces.length, 2);
  const f = fnOf('f(x) = x^2 für x < 1; 2x + 1 für x ≥ 1');
  close(f(0.5), 0.25); close(f(1), 3); close(f(2), 5);
  const g = fnOf('f(x) = x für x < 0, x^2 für 0 <= x <= 2, 4 sonst');
  close(g(-1), -1); close(g(1), 1); close(g(3), 4);
  const h = fnOf('f(x) = 1 für x ∈ [0; 1[; 2 für x ∈ [1; 2]');
  assert.ok(Number.isNaN(h(-1))); close(h(0.5), 1); close(h(1), 2); assert.ok(Number.isNaN(h(3)));
  // ein einzelner Definitionsbereich bleibt ein Definitionsbereich
  assert.ok(!MP.parseDefinition('f(x) = x^2 für 0 ≤ x < 3').pieces);
  assert.ok(!MP.parseDefinition('f(x) = x^2; x ∈ [0; 3[').pieces);
});

test('Abschnittsweise Funktionen: Ableitung, Ausgabe, Abschnitte', () => {
  const ast = MP.parseFunction(MP.parseDefinition('f(x) = x^2 für x < 1; 2x - 1 für x ≥ 1'), {});
  assert.strictEqual(MP.toPlain(MP.derivative(ast)), '2*x für x < 1; 2 für x ≥ 1');
  assert.match(MP.toTeX(ast), /\\begin\{cases\}/);
  assert.strictEqual(MP.toNice(ast), 'x² für x < 1; 2x − 1 für x ≥ 1');
  const pcs = MP.pieces(ast, {});
  assert.deepStrictEqual(pcs.map(p => [p.lo, p.hi, p.hiOpen]), [[-Infinity, 1, true], [1, Infinity, false]]);
  // eingesetzt in eine andere Funktion
  const g = MP.parse('2f(x) + 1', { functions: { f: { ast } } });
  close(MP.compile(g, {})(0.5), 1.5);
  assert.ok(MP.liftPw(g));
});

test('Funktionsscharen', () => {
  let d = MP.parseDefinition('f_a(x) = a*x^2 für a = 1, 2, 3');
  assert.strictEqual(d.letter, 'f_a');
  assert.deepStrictEqual(d.family, { p: 'a', vals: [1, 2, 3] });
  d = MP.parseDefinition('f(x) = a x^2; a ∈ {-1; 0,5; 2}');
  assert.deepStrictEqual(d.family.vals, [-1, 0.5, 2]);
  d = MP.parseDefinition('f_k(x) = x^2 + k mit k = -2 … 2');
  assert.deepStrictEqual(d.family.vals, [-2, -1, 0, 1, 2]);
  d = MP.parseDefinition('f_a(x) = a x');
  assert.strictEqual(d.family.vals, null);
  assert.throws(() => MP.parseDefinition('f_b(x) = a x für a = 1, 2'));
  // Definitionsbereich ist keine Schar
  assert.ok(!MP.parseDefinition('f(x) = x^2 für x < 1; 2x sonst').family);
});

test('Lesbare Ableitungen', () => {
  const d = (s) => MP.toNice(MP.derivative(MP.parse(s)));
  assert.strictEqual(d('x^3/3 - x'), 'x² − 1');
  assert.strictEqual(d('(x^2+1)/(x-1)'), '(x² − 2x − 1)/(x − 1)²');
  assert.strictEqual(d('sqrt(x)'), '1/(2√x)');
  assert.strictEqual(d('e^(-x^2)'), '−2x·e^(−x²)');
  assert.strictEqual(d('2^x'), '2^x·ln(2)');
  assert.strictEqual(d('x^(1/3)'), '1/(3x^(2/3))');
});

test('Stammfunktionen', () => {
  const F = (s) => { const a = MP.antiderivative(MP.parse(s)); return a && MP.toNice(a); };
  assert.strictEqual(F('x^2 - 1'), 'x³/3 − x');
  assert.strictEqual(F('1/x'), 'ln(|x|)');
  assert.strictEqual(F('2^x'), '2^x/ln(2)');
  assert.strictEqual(F('e^(-x^2)'), null);                  // nicht elementar → numerisch
  // numerische Stammfunktion
  const G = Numerics.antiderivative(Math.cos, 0);
  close(G(1.3), Math.sin(1.3), 1e-9);
  close(G(-7.77), Math.sin(-7.77), 1e-8);
  close(Numerics.simpson(x => x * x, 0, 3), 9, 1e-9);
});

test('TikZ: Abschnitte, Koordinaten und Hilfslinien', () => {
  const ast = MP.parse('x^2');
  const code = TikZ.generate([
    { col: '#007AFF', parts: [{ ast, lo: -2, hi: 1 }, { ast: MP.parse('2*x+1'), lo: 1, hi: 3 }], dots: [[1, 3, false], [1, 1, true]], params: {} },
    { col: '#FF3B30', coords: [[[0, 0], [1, 1], [2, 4]]], params: {} },
  ], { xMin: -2, xMax: 3, yMin: -1, yMax: 5 }, { objects: [{ type: 'point', col: '#000000', px: 1, py: 2, guides: true }] });
  assert.match(code, /domain=-2:1[^\n]*\{x\^2\}/);
  assert.match(code, /domain=1:3[^\n]*\{2\*x\+1\}/);
  assert.match(code, /fill=white\] \(axis cs:1,1\)/);
  assert.match(code, /coordinates \{\(0,0\) \(1,1\) \(2,4\)\}/);
  assert.match(code, /dashed[^\n]*\(axis cs:1,0\) -- \(axis cs:1,2\) -- \(axis cs:0,2\)/);
  assert.match(MP.toPgf(MP.parseFunction(MP.parseDefinition('f(x)=x für x<0; 1 sonst'), {}), {}), /^ifthenelse\(\(x\)<\(0\), x, 1\)$/);
});
