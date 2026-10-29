// Tests für die Aufgabenbibliothek (js/library.js):  npm test
const test = require('node:test');
const assert = require('node:assert');

global.nerdamer = require('../vendor/nerdamer/nerdamer.core.js');
require('../vendor/nerdamer/Algebra.js'); require('../vendor/nerdamer/Calculus.js');
const MP = require('../js/math-parser.js');
const N = require('../js/numerics.js');
const L = require('../js/library.js');

test('Jede Vorlage hat Stufe, Thema, Titel und Text', () => {
  const ids = new Set(L.GRADES.map(g => g.id));
  L.TEMPLATES.forEach(t => {
    assert.ok(ids.has(t.grade), t.title + ': unbekannte Stufe ' + t.grade);
    assert.ok(t.topic && t.title && t.text, t.title);
    assert.ok(Array.isArray(t.fns), t.title);
    if (!t.dists) assert.ok(Array.isArray(t.view) && t.view.length === 4 && t.view[0] < t.view[1] && t.view[2] < t.view[3], t.title + ': Fenster');
  });
  [8, 9, 10, 11, 12, 13].forEach(g => assert.ok(L.TEMPLATES.filter(t => t.grade === g).length >= 4, 'Jgst. ' + g));
  assert.strictEqual(new Set(L.TEMPLATES.map(t => t.title)).size, L.TEMPLATES.length, 'Titel doppelt');
});

test('Alle Funktionsterme der Vorlagen sind gültig und im Fenster auswertbar', () => {
  L.TEMPLATES.forEach(t => {
    const P = {};
    Object.entries(t.params || {}).forEach(([k, p]) => { P[k] = p.v; });
    t.fns.forEach((f, i) => {
      if (!f.s) {
        const ref = f.d ? f.d[0] : f.i !== undefined ? f.i : f.a[0];
        assert.ok(ref < i && t.fns[ref].s, t.title + ': Verweis auf Funktion ' + ref);
        return;
      }
      const d = MP.parseDefinition(f.s);
      const ast = MP.parseFunction(d, { variable: d.variable });
      if (d.family) P[d.family.p] = d.family.vals[0];
      const g = MP.compile(ast, P, { deg: !!t.deg });
      let ok = 0;
      for (let k = 0; k <= 100; k++) {
        const x = t.view[0] + (t.view[1] - t.view[0]) * k / 100, y = g(x);
        if (isFinite(y) && y >= t.view[2] && y <= t.view[3]) ok++;
      }
      assert.ok(ok > 10, t.title + ': ' + f.s + ' kaum sichtbar (' + ok + ')');
    });
    (t.objs || []).filter(o => o.type === 'point').forEach(o => {
      assert.ok(+o.x >= t.view[0] && +o.x <= t.view[1] && +o.y >= t.view[2] && +o.y <= t.view[3], t.title + ': Punkt ' + o.name + ' außerhalb');
    });
  });
});

test('Punkte liegen auf den Graphen, wo sie es sollen', () => {
  const on = (title, src, x, y) => {
    const t = L.TEMPLATES.find(v => v.title === title);
    assert.ok(t, title);
    const d = MP.parseDefinition(src);
    const g = MP.compile(MP.parseFunction(d, { variable: d.variable }), {});
    assert.ok(Math.abs(g(x) - y) < 1e-9, title + ': ' + src + ' bei ' + x);
  };
  on('Direkte Proportionalität', 'p(x) = 1.5x', 4, 6);
  on('Indirekte Proportionalität', 'd(x) = 12/x', 3, 4);
  on('Gleichungssystem graphisch lösen', 'f(x) = 0.5x + 1', 2, 2);
  on('Gleichungssystem graphisch lösen', 'g(x) = -x + 4', 2, 2);
  on('Wurfparabel (Sachaufgabe)', 'h(t) = -5t^2 + 10t + 1.5', 1, 6.5);
  on('Halbwertszeit', 'N(t) = 100*0.5^(t/5)', 10, 25);
  on('Sekante und Tangente', 'f(x) = 0.5x^2', 3, 4.5);
  on('Sekante und Tangente', 's(x) = 2x - 1.5', 3, 4.5);
  on('Sekante und Tangente', 's(x) = 2x - 1.5', 1, 0.5);
  // Wurfparabel: Ende des Definitionsbereichs nahe der Nullstelle
  const h = MP.compile(MP.parseFunction(MP.parseDefinition('h(t) = -5t^2 + 10t + 1.5'), { variable: 't' }), {});
  assert.ok(Math.abs(h(2.14)) < 0.05);
});

test('Stochastik-Vorlagen: Kennwerte und Ablehnungsbereich', () => {
  const t = L.TEMPLATES.find(v => v.title === 'Hypothesentest: Ablehnungsbereich');
  const d = t.dists[0];
  // kleinster Ablehnungsbereich {k; …; n} mit P(X ≥ k) ≤ 5 %
  assert.ok(N.binomProb(d.n, d.p, d.a, null) <= 0.05);
  assert.ok(N.binomProb(d.n, d.p, d.a - 1, null) > 0.05);
  const s = L.TEMPLATES.find(v => v.title === 'Erwartungswert und Standardabweichung').dists[0];
  const mu = s.n * s.p, sg = Math.sqrt(s.n * s.p * (1 - s.p));
  assert.strictEqual(s.a, Math.ceil(mu - sg)); assert.strictEqual(s.b, Math.floor(mu + sg));
  const nv = L.TEMPLATES.find(v => v.title === 'Normalverteilung: σ-Regeln').dists[0];
  assert.ok(Math.abs(N.normCdf(nv.b, nv.mu, nv.sigma) - N.normCdf(nv.a, nv.mu, nv.sigma) - 0.6827) < 1e-4);
});

test('Suche und Filter', () => {
  const find = (q, g) => L.TEMPLATES.filter(t => L.matches(t, q, g)).map(t => t.title);
  assert.ok(find('tangente').includes('Sekante und Tangente'));
  assert.ok(find('Hypothesentest').length >= 1);
  assert.ok(find('wurzel', 9).includes('Wurzelfunktion als Umkehrfunktion'));
  assert.strictEqual(find('', 8).length, L.TEMPLATES.filter(t => t.grade === 8).length);
  assert.ok(find('ableitung skizzieren').includes('Ableitungsgraph skizzieren'));
  assert.ok(find('Gebrochen').length >= 2);
  assert.deepStrictEqual(find('xyzxyz'), []);
});
