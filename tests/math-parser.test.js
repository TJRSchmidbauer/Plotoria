// Tests für den Ausdrucks-Parser:  node --test tests/*.test.js
// Ableitungen verwenden die mitgelieferte nerdamer-Version aus vendor/.
const test = require('node:test');
const assert = require('node:assert');

let hasNerdamer = false;
try {
  global.nerdamer = require('../vendor/nerdamer/nerdamer.core.js');
  require('../vendor/nerdamer/Algebra.js'); require('../vendor/nerdamer/Calculus.js');
  hasNerdamer = true;
} catch (e) { /* ohne nerdamer */ }

const MP = require('../js/math-parser.js');
const ev = (s, x, params, opts) => MP.compile(MP.parse(s), params || {}, opts)(x);
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('Grundrechenarten und Präzedenz', () => {
  close(ev('1+2*3', 0), 7);
  close(ev('-x^2', 3), -9);
  close(ev('2^3^2', 0), 512);
  close(ev('2^-1', 0), 0.5);
  close(ev('x^23', 1.1), Math.pow(1.1, 23));
  close(ev('(x+1)(x-1)', 3), 8);
  close(ev('2x', 4), 8);
  close(ev('3!', 0), 6);
});

test('Funktionen und Konstanten', () => {
  close(ev('sin(pi/2)', 0), 1);
  close(ev('sinx', Math.PI / 2), 1);
  close(ev('ln(e)', 0), 1);
  close(ev('lg(1000)', 0), 3);
  close(ev('log(2, 8)', 0), 3);
  close(ev('|x-3|', 1), 2);
  close(ev('2|x|', -2), 4);
  close(ev('sqrt(x)', 9), 3);
  close(ev('x^(1/3)', -8), -2);
  close(ev('root(x, 3)', -27), -3);
  close(ev('cosh(0)', 0), 1);
  close(ev('e^x', 1), Math.E);
  assert.ok(Number.isNaN(ev('sqrt(x)', -1)));
  assert.ok(Number.isNaN(ev('1/x', 0)));
});

test('LaTeX und deutsche Schreibweise', () => {
  close(ev('\\frac{1}{x}', 4), 0.25);
  close(ev('\\frac{\\sqrt{x}}{2}', 16), 2);
  close(ev('\\sqrt[3]{x}', 27), 3);
  close(ev('x^{2}+\\pi', 2), 4 + Math.PI);
  close(ev('2\\cdot\\sin(x)', Math.PI / 2), 2);
  close(ev('\\left|x\\right|', -5), 5);
  close(ev('0,5x', 4), 2);
  close(ev('x²', 3), 9);
  close(ev('2·x', 3), 6);
  close(ev('sin(30°)', 0), 0.5);
  close(ev('cos(60deg)', 0), 0.5);
});

test('Parameter und Gradmaß', () => {
  const P = { a: 2, b: 1 };
  const f = MP.compile(MP.parse('a*x^2+b'), P);
  close(f(3), 19);
  P.a = 0;
  close(f(3), 1);
  assert.deepStrictEqual([...MP.freeVars(MP.parse('a x^2 + b x + c'))].sort(), ['a', 'b', 'c']);
  close(ev('sin(x)', 90, {}, { deg: true }), 1);
  close(ev('asin(1)', 0, {}, { deg: true }), 90);
});

test('Fehlerhafte Eingaben', () => {
  for (const s of ['', '(x+1', 'x+1)', 'x+*2', 'sin()', 'x#2', 'log(x, 2, 3)']) {
    assert.throws(() => MP.parse(s), MP.ParseError, s);
  }
});

test('Definitionen', () => {
  assert.deepStrictEqual(MP.parseDefinition("f''"), { kind: 'derivative', of: 'f', order: 2 });
  const d = MP.parseDefinition('g(t) = t^2');
  assert.strictEqual(d.letter, 'g'); assert.strictEqual(d.variable, 't');
  close(MP.compile(MP.parse(d.body, { variable: d.variable }))(3), 9);
  assert.strictEqual(MP.parseDefinition('y = 2x').body, '2x');
  assert.strictEqual(MP.nextLetter(['f', 'g']), 'h');
});

test('Punkte, senkrechte Geraden, Definitionsbereiche', () => {
  assert.deepStrictEqual(MP.parseDefinition('A(2|3)'), { kind: 'point', name: 'A', x: '2', y: '3' });
  assert.deepStrictEqual(MP.parseDefinition('P_1 = (1,5; f(2))'), { kind: 'point', name: 'P1', x: '1,5', y: 'f(2)' });
  assert.deepStrictEqual(MP.parseDefinition('B(-1, 2)'), { kind: 'point', name: 'B', x: '-1', y: '2' });
  assert.deepStrictEqual(MP.parseDefinition('x = 2'), { kind: 'vline', x: '2' });
  const d = MP.parseDefinition('f(x) = x^2 für 0 ≤ x < 3');
  assert.strictEqual(d.body, 'x^2');
  assert.deepStrictEqual(d.domain, { min: '0', max: '3', minOpen: false, maxOpen: true });
  assert.deepStrictEqual(MP.parseDefinition('sqrt(x), x > 1').domain, { min: '1', max: null, minOpen: true, maxOpen: false });
  assert.deepStrictEqual(MP.parseDefinition('x^2; x ∈ ]-1; pi]').domain, { min: '-1', max: 'pi', minOpen: true, maxOpen: false });
  assert.deepStrictEqual(MP.parseDefinition('2x; x ∈ [0; ∞[').domain, { min: '0', max: null, minOpen: false, maxOpen: true });
  assert.deepStrictEqual(MP.parseDefinition('N(t) = 2*1.5^t für 0 ≤ t ≤ 8').domain, { min: '0', max: '8', minOpen: false, maxOpen: false });
  // Komma in Funktionsargumenten ist keine Bedingung
  assert.strictEqual(MP.parseDefinition('log(2, x)').domain, null);
  assert.strictEqual(MP.parseDefinition('max(x, 1)').body, 'max(x, 1)');
  close(MP.evalConst('pi/2'), Math.PI / 2);
  assert.ok(Number.isNaN(MP.evalConst('2+')));
});

test('Unicode-Darstellung', () => {
  const n = (s) => MP.toNice(MP.parse(s));
  assert.strictEqual(n('x^2 - 2x + 0.5'), 'x² − 2x + 0,5');
  assert.strictEqual(n('a*x^(-1)'), 'a·x⁻¹');
  assert.strictEqual(n('sqrt(x)/(x+1)'), '√x/(x + 1)');
  assert.strictEqual(n('|x-1| + pi'), '|x − 1| + π');
  assert.strictEqual(n('e^(2x)'), 'e^(2x)');
  assert.strictEqual(n('alpha*x'), 'α·x');
});

test('Ausgabe: Klartext, TeX, pgfplots', () => {
  assert.strictEqual(MP.toPlain(MP.parse('x^2+-3')), 'x^2 - 3');
  assert.strictEqual(MP.toPlain(MP.parse('a-(b-c)')), 'a - (b - c)');
  assert.strictEqual(MP.toPlain(MP.parse('(-2)^x')), '(-2)^x');
  assert.strictEqual(MP.toTeX(MP.parse('1/x')), '\\frac{1}{x}');
  assert.strictEqual(MP.toTeX(MP.parse('2x^2')), '2 x^{2}');
  assert.strictEqual(MP.toPgf(MP.parse('a*ln(x)+lg(x)'), { a: 2 }), '(2)*ln(x)+log10(x)');
  // Rundlauf: Klartext muss wieder dasselbe ergeben
  for (const s of ['x^2-3x+2', 'sin(x)/(x+1)', '-(x-1)^3', 'e^(-x^2/2)', '2^(-x)', 'a/(-b)']) {
    const P = { a: 1.5, b: -0.7 };
    const a = MP.compile(MP.parse(s), P)(0.37);
    const b = MP.compile(MP.parse(MP.toPlain(MP.parse(s))), P)(0.37);
    close(a, b);
  }
});

test('Benutzerfunktionen einsetzen', () => {
  const ctx = { functions: { f: { ast: MP.parse('x^2') } } };
  close(MP.compile(MP.parse('f(x+1)', ctx))(2), 9);
  close(MP.compile(MP.parse('2f(x)', ctx))(3), 18);
});

test('Ableitungen', { skip: !hasNerdamer && 'nerdamer nicht installiert' }, () => {
  const d = (s, x, P) => MP.compile(MP.derivative(MP.parse(s)), P || {})(x);
  close(d('x^3-2x', 2), 10);
  close(d('ln(x)', 4), 0.25);
  close(d('lg(x)', 2), 1 / (2 * Math.LN10));
  close(d('sin(x)', 0), 1);
  close(d('a*x^2', 3, { a: 2 }), 12);
  close(d('e^(-x^2)', 1), -2 * Math.exp(-1), 1e-9);
  const ctx = { functions: { f: { ast: MP.parse('x^3') } } };
  close(MP.compile(MP.parse("f'(x)", ctx))(2), 12);
  // Gradmaß: d/dx sin(x°) = π/180 · cos(x°)
  close(MP.compile(MP.derivative(MP.radianize(MP.parse('sin(x)'))))(60), Math.PI / 180 * 0.5);
  close(MP.compile(MP.derivative(MP.radianize(MP.parse('x*tan(2x)'))))(10), Math.tan(20 * Math.PI / 180) + 10 * 2 * Math.PI / 180 / Math.cos(20 * Math.PI / 180) ** 2);
  // π/180 bleibt symbolisch statt als gekürzter Bruch
  assert.ok(!/\d{5,}/.test(MP.toPlain(MP.derivative(MP.radianize(MP.parse('sin(x)'))))));
  assert.strictEqual(MP.toPgf(MP.radianize(MP.parse('sin(x)')), {}), 'sin(x*(pi/180))');
});
