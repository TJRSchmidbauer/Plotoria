// Tests für den Graph-Generator (js/generator-math.js):  npm test
const test = require('node:test');
const assert = require('node:assert');

global.nerdamer = require('../vendor/nerdamer/nerdamer.core.js');
require('../vendor/nerdamer/Algebra.js'); require('../vendor/nerdamer/Calculus.js');
const MP = require('../js/math-parser.js');
const G = require('../js/generator-math.js');

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);
// Term aus dem Generator mit Plotorias Parser auswerten (prüft auch die Schreibweise)
const fnOf = (term) => MP.compile(MP.parseFunction(MP.parseDefinition('f(x) = ' + term), {}), {});
const gen = (spec) => { const r = G.generate(spec); assert.ok(!r.error, r.error); return r; };

test('Brüche: Einlesen und Rechnen', () => {
  assert.strictEqual(G.parseFr('1,5').toString(), '3/2');
  assert.strictEqual(G.parseFr('−3/4').toString(), '-3/4');
  assert.strictEqual(G.parseFr('0.25').toString(), '1/4');
  assert.strictEqual(G.parseFr('abc'), null);
  assert.strictEqual(G.parseFr('1/0'), null);
  assert.strictEqual(G.Fr.of(1, 3).add(G.Fr.of(1, 6)).toString(), '1/2');
});

test('Ganzrational: Hoch- und Tiefpunkt ergeben x³ − 3x', () => {
  const r = gen({ type: 'poly', conds: [{ kind: 'max', x: '-1', y: '2' }, { kind: 'min', x: '1', y: '-2' }] });
  assert.ok(r.ok); assert.strictEqual(r.degree, 3);
  assert.strictEqual(r.term, 'x^3 - 3*x');
  const f = fnOf(r.term); close(f(2), 2);
  assert.ok(r.features.some(p => p.type === 'inflect' && p.x === 0));
});

test('Ganzrational: Terrassenpunkt', () => {
  const r = gen({ type: 'poly', conds: [{ kind: 'terrace', x: '0', y: '0' }, { kind: 'point', x: '1', y: '1' }] });
  assert.strictEqual(r.term, 'x^3');
  assert.ok(r.checks.every(c => c.ok));
});

test('Ganzrational: Hochpunkt, den eine Parabel nicht schafft → Grad 3 mit schöner freier Wahl', () => {
  const r = gen({ type: 'poly', conds: [{ kind: 'max', x: '0', y: '0' }, { kind: 'point', x: '1', y: '1' }] });
  assert.ok(r.ok, r.checks.map(c => c.msg).join());
  assert.strictEqual(r.degree, 3);
  assert.strictEqual(r.free.length, 1);
  const f = fnOf(r.term); close(f(0), 0); close(f(1), 1);
  assert.ok(f(0.01) < 0 && f(-0.01) < 0, 'Hochpunkt bei 0');
  // mit Regler gewählter Wert
  const r2 = gen({ type: 'poly', conds: [{ kind: 'max', x: '0', y: '0' }, { kind: 'point', x: '1', y: '1' }], free: [2] });
  assert.match(r2.term, /^2\*x\^3/);
  // Parabel geht nicht: Warnung
  const p = G.generate({ type: 'parabola', conds: [{ kind: 'max', x: '0', y: '0' }, { kind: 'point', x: '1', y: '1' }] });
  assert.ok(p.error && /Parabel/.test(p.error));
});

test('Ganzrational: Symmetrie und Vielfachheit', () => {
  const r = gen({ type: 'poly', sym: 'even', conds: [{ kind: 'min', x: '1', y: '-1' }, { kind: 'point', x: '0', y: '0' }] });
  assert.strictEqual(r.term, 'x^4 - 2*x^2');
  const d = gen({ type: 'poly', conds: [{ kind: 'zero', x: '2', m: 2 }, { kind: 'zero', x: '-1', m: 1 }, { kind: 'point', x: '0', y: '4' }] });
  assert.strictEqual(d.degree, 3);
  assert.strictEqual(d.termFactored, '(x + 1)*(x - 2)^2');
  assert.ok(d.checks.every(c => c.ok));
  const f = fnOf(d.term); close(f(3), 4);
});

test('Ganzrational: Wendepunkt, Steigung, Widerspruch', () => {
  const r = gen({ type: 'poly', conds: [{ kind: 'inflect', x: '1', y: '2' }, { kind: 'slope', x: '1', y: '-3' }, { kind: 'zero', x: '0' }] });
  assert.ok(r.ok);
  const f = fnOf(r.term); close(f(1), 2); close(f(0), 0);
  const h = 1e-5; close((f(1 + h) - f(1 - h)) / (2 * h), -3, 1e-6);
  const bad = G.generate({ type: 'line', conds: [{ kind: 'point', x: '0', y: '0' }, { kind: 'point', x: '1', y: '1' }, { kind: 'point', x: '2', y: '5' }] });
  assert.ok(bad.error);
  const fr = gen({ type: 'line', conds: [{ kind: 'point', x: '0', y: '1/2' }, { kind: 'slope', x: '0', y: '-3/4' }] });
  assert.strictEqual(fr.term, '-3/4*x + 1/2');
  close(fnOf(fr.term)(2), -1);
});

test('Gebrochen-rational: Polstelle, Nullstelle, Asymptote, Lücke', () => {
  const r = gen({ type: 'rational', conds: [{ kind: 'pole', x: '1', m: 1 }, { kind: 'zero', x: '-1' }], asym: { kind: 'h', c: '2' } });
  const f = fnOf(r.term); close(f(3), 4); close(f(-1), 0);
  assert.deepStrictEqual(r.asymptotes[0], { kind: 'h', y: 2 });
  assert.ok(r.features.some(p => p.type === 'pole' && p.x === 1));
  // hebbare Lücke bei 2: f(2) nicht definiert, sonst wie oben
  const h = gen({ type: 'rational', conds: [{ kind: 'pole', x: '1' }, { kind: 'hole', x: '2' }, { kind: 'zero', x: '-1' }], asym: { kind: 'h', c: '2' } });
  const g = fnOf(h.term); assert.ok(!isFinite(g(2))); close(g(3), 4);
  // Polstelle ohne Vorzeichenwechsel, waagrechte Asymptote y = 0, durch (0|2)
  const z = gen({ type: 'rational', conds: [{ kind: 'pole', x: '1', m: 2 }, { kind: 'point', x: '0', y: '2' }], asym: { kind: 'zero' } });
  close(fnOf(z.term)(2), 2); close(fnOf(z.term)(-1), 0.5);
  // schiefe Asymptote y = x + 1
  const o = gen({ type: 'rational', conds: [{ kind: 'pole', x: '0' }, { kind: 'point', x: '1', y: '3' }], asym: { kind: 'o', m: '1', t: '1' } });
  const fo = fnOf(o.term); close(fo(1), 3); close(fo(1000) - 1001, 0, 0.01);
  assert.strictEqual(o.asymptotes[0].kind, 'o');
  // Hochpunkt einer gebrochen-rationalen Funktion
  const e = gen({ type: 'rational', conds: [{ kind: 'pole', x: '2' }, { kind: 'pole', x: '-2' }, { kind: 'max', x: '0', y: '-1' }], asym: { kind: 'zero' } });
  assert.ok(e.ok); close(fnOf(e.term)(1), -4 / 3);
  // doppelte Polstellen um 0: dort entsteht ein Tiefpunkt – die Prüfung meldet das
  const t = gen({ type: 'rational', conds: [{ kind: 'pole', x: '2', m: 2 }, { kind: 'pole', x: '-2', m: 2 }, { kind: 'max', x: '0', y: '1' }], asym: { kind: 'zero' } });
  assert.ok(!t.ok && /Tiefpunkt/.test(t.checks[2].msg));
});

test('Polynom · e^(kx): Nullstelle und Extremstelle', () => {
  const r = gen({ type: 'expoly', k: '-1', conds: [{ kind: 'zero', x: '1' }, { kind: 'max', x: '2', y: '' }] });
  assert.ok(r.ok, JSON.stringify(r.checks.map(c => c.msg)));
  const f = fnOf(r.term); close(f(1), 0);
  const h = 1e-5; close((f(2 + h) - f(2 - h)) / (2 * h), 0, 1e-6);
});

test('Exponentialfunktion a·b^x + c und a·e^(kx) + c', () => {
  const r = gen({ type: 'exp', expForm: 'base', asymC: '1', conds: [{ kind: 'point', x: '0', y: '3' }, { kind: 'point', x: '1', y: '5' }] });
  assert.strictEqual(r.term, '2*2^x + 1');
  const e = gen({ type: 'exp', expForm: 'e', asymC: '0', conds: [{ kind: 'point', x: '0', y: '2' }, { kind: 'slope', x: '0', y: '-1' }] });
  assert.strictEqual(e.term, '2*e^(-1/2*x)');
  close(fnOf(e.term)(2), 2 * Math.exp(-1));
  assert.ok(G.generate({ type: 'exp', expForm: 'base', asymC: '4', conds: [{ kind: 'point', x: '0', y: '3' }, { kind: 'point', x: '1', y: '5' }] }).error);
});

test('Sinusfunktion aus Hoch- und Tiefpunkt', () => {
  const r = gen({ type: 'sine', conds: [{ kind: 'max', x: '1', y: '3' }, { kind: 'min', x: '3', y: '-1' }] });
  const f = fnOf(r.term); close(f(1), 3); close(f(3), -1); close(f(5), 3);
  assert.strictEqual(r.term, '2*sin((pi/2)*x) + 1');
  const p = gen({ type: 'sine', conds: [{ kind: 'max', x: 'pi/2', y: '1' }, { kind: 'min', x: '3pi/2', y: '-1' }] });
  assert.strictEqual(p.term, 'sin(x)');
  const c = gen({ type: 'sine', trig: 'cos', conds: [{ kind: 'max', x: '0', y: '2' }, { kind: 'min', x: 'pi', y: '-2' }] });
  assert.strictEqual(c.term, '2*cos(x)');
});

test('Würfeln für Grad 4 und 5 mit und ohne Symmetrie', () => {
  [[4, 'none'], [4, 'even'], [5, 'none'], [5, 'odd'], [3, 'odd']].forEach(([degree, sym], i) => {
    const spec = G.randomSpec('poly', { degree, sym }, 77 + i);
    assert.ok(spec, degree + ' ' + sym);
    const r = G.generate(spec);
    assert.ok(r.ok && r.degree === degree && !r.free.length, degree + ' ' + sym + ' ' + (r.error || r.term));
  });
});

test('Zufällige schöne Vorgaben sind lösbar und haben schöne Kennpunkte', () => {
  ['line', 'parabola', 'poly', 'rational', 'exp', 'expoly', 'sine'].forEach((type, i) => {
    for (let s = 1; s <= 6; s++) {
      const spec = G.randomSpec(type, { expForm: s % 2 ? 'base' : 'e' }, 1000 * (i + 1) + s);
      assert.ok(spec, type + ': keine Vorgaben gefunden');
      const r = G.generate(spec);
      assert.ok(!r.error && r.ok, type + ' ' + JSON.stringify(spec) + ' → ' + (r.error || r.checks.map(c => c.msg).join()));
      fnOf(r.term);   // Term ist für Plotoria lesbar
      // Vorgaben sind schöne Zahlen; Hoch-, Tief- und Terrassenpunkte ebenfalls (Nullstellen, Wendepunkte dürfen krumm sein)
      spec.conds.forEach(c => ['x', 'y'].forEach(k => { if (c[k] !== undefined && c[k] !== '' && type !== 'sine' && type !== 'expoly') assert.ok(G.niceness(G.num(c[k])) <= 1.1, type + ' Vorgabe ' + JSON.stringify(c)); }));
      if (type === 'poly' || type === 'parabola') r.features.filter(p => /max|min|terrace/.test(p.type)).forEach(p => assert.ok(G.niceness(p.x) <= 1.1 && G.niceness(p.y) <= 1.1, type + ' ' + r.term + ' ' + JSON.stringify(p)));
    }
  });
});
