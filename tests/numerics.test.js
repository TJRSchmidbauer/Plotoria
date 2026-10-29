// Tests für js/numerics.js:  npm test
const test = require('node:test');
const assert = require('node:assert');
const N = require('../js/numerics.js');

test('Exakte Werte erkennen', () => {
  const cases = [
    [0.5, '1/2'], [-1 / 3, '−1/3'], [3, '3'], [0, '0'], [-2, '−2'],
    [Math.SQRT2, '√2'], [-Math.sqrt(3) / 2, '−√3/2'], [2 * Math.sqrt(5), '2√5'],
    [Math.PI / 2, 'π/2'], [-3 * Math.PI / 4, '−3π/4'], [2 * Math.PI, '2π'],
    [1 + Math.SQRT2, '1 + √2'], [(1 - Math.sqrt(5)) / 2, '(1 − √5)/2'],
  ];
  for (const [v, s] of cases) assert.strictEqual(N.exact(v), s, String(v));
  assert.strictEqual(N.exact(0.1234567), null);
  assert.strictEqual(N.exact(Math.E), null);
});

test('Regression', () => {
  const lin = N.regression([[0, 1], [1, 3], [2, 5], [3, 7]], 'linear');
  assert.strictEqual(lin.term, '2*x + 1');
  assert.ok(Math.abs(lin.r2 - 1) < 1e-12);
  const quad = N.regression([[-1, 2], [0, 1], [1, 2], [2, 5]], 'quadratic');
  assert.strictEqual(quad.term, 'x^2 + 1');
  const ex = N.regression([[0, 2], [1, 2 * Math.E], [2, 2 * Math.E ** 2]], 'exponential');
  assert.strictEqual(ex.term, '2*e^(1*x)');
  assert.ok(N.regression([[1, 1]], 'linear').error);
  assert.ok(N.regression([[0, -1], [1, 2]], 'exponential').error);
});

test('Messwerte einlesen', () => {
  assert.deepStrictEqual(N.parseData('x;y\n0;1\n0,5;2,25\n1;4'), [[0, 1], [0.5, 2.25], [1, 4]]);
  assert.deepStrictEqual(N.parseData('1\t2\n3\t4'), [[1, 2], [3, 4]]);
  // Tabelle „quer“: erste Zeile x, zweite Zeile y
  assert.deepStrictEqual(N.parseData('x 0 1 2 3\ny 1 2 4 8'), [[0, 1], [1, 2], [2, 4], [3, 8]]);
});

test('Asymptoten', () => {
  assert.deepStrictEqual(N.obliqueAsymptote(x => 1 / x, 1), { m: 0, b: 0 });
  assert.deepStrictEqual(N.obliqueAsymptote(x => (2 * x * x + 1) / (x * x - 1), -1), { m: 0, b: 2 });
  assert.deepStrictEqual(N.obliqueAsymptote(x => (x * x + 1) / (x - 2), 1), { m: 1, b: 2 });
  assert.strictEqual(N.obliqueAsymptote(x => x * x, 1), null);
  assert.strictEqual(N.obliqueAsymptote(x => Math.sin(x), 1), null);
  assert.strictEqual(N.obliqueAsymptote(x => 2 * x + 1, 1), null);   // Gerade selbst
  const v = N.verticalAsymptotes(x => 1 / ((x - 2) * (x + 1)), -4, 5);
  assert.deepStrictEqual(v, [-1, 2]);
  assert.deepStrictEqual(N.verticalAsymptotes(x => 1 / (x * x), -3, 3), [0]);   // Pol gerader Ordnung
  assert.deepStrictEqual(N.verticalAsymptotes(x => Math.exp(1 / x), -2, 2), [0]);
  assert.deepStrictEqual(N.verticalAsymptotes(x => Math.sin(x) / x, -5, 5), []);
  assert.deepStrictEqual(N.verticalAsymptotes(x => Math.log(x), -2, 3), [0]);
  assert.deepStrictEqual(N.verticalAsymptotes(x => (x * x - 1) / (x - 1), -3, 3), []);   // hebbare Lücke
  assert.deepStrictEqual(N.verticalAsymptotes(x => x * x, -3, 3), []);
  assert.deepStrictEqual(N.verticalAsymptotes(x => Math.sqrt(x), -3, 3), []);
  const t = N.verticalAsymptotes(Math.tan, 0, 4);
  assert.strictEqual(t.length, 1); assert.ok(Math.abs(t[0] - Math.PI / 2) < 1e-12);
});

test('PNG-Auflösung (pHYs)', () => {
  // minimales PNG: Signatur + IHDR + IEND
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  const chunk = (type, data) => {
    const b = Buffer.alloc(12 + data.length);
    b.writeUInt32BE(data.length, 0); b.write(type, 4, 'latin1'); Buffer.from(data).copy(b, 8);
    b.writeUInt32BE(N.crc32(b.subarray(4, 8 + data.length)), 8 + data.length);
    return b;
  };
  const png = Buffer.concat([Buffer.from(sig), chunk('IHDR', new Array(13).fill(1)), chunk('IEND', [])]);
  const out = Buffer.from(N.pngWithDpi(png, 300));
  assert.strictEqual(out.subarray(37, 41).toString('latin1'), 'pHYs');
  assert.strictEqual(out.readUInt32BE(41), 11811);
  assert.strictEqual(out.readUInt32BE(50), N.crc32(out.subarray(37, 50)));
  // erneutes Setzen ersetzt statt zu verdoppeln
  assert.strictEqual(Buffer.from(N.pngWithDpi(out, 150)).length, out.length);
  assert.strictEqual(N.crc32(Buffer.from('IEND')), 0xAE426082);
});

test('Normalverteilung: Φ und Dichte', () => {
  const c = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} ≉ ${b}`);
  c(N.normCdf(0), 0.5);
  c(N.normCdf(1) - N.normCdf(-1), 0.6826894921370859);
  c(N.normCdf(2) - N.normCdf(-2), 0.9544997361036416);
  c(N.normCdf(1.96), 0.9750021048517795);
  c(N.normCdf(115, 100, 15), N.normCdf(1));
  c(N.normCdf(-12), 0); c(N.normCdf(12), 1);
  c(N.normPdf(0), 0.3989422804014327);
  c(N.normPdf(100, 100, 15), 0.3989422804014327 / 15);
});

test('Binomialverteilung: Wahrscheinlichkeiten', () => {
  const c = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} ≉ ${b}`);
  const pmf = N.binomPmf(10, 0.5);
  c(pmf[5], 0.24609375);
  c(pmf.reduce((s, v) => s + v, 0), 1);
  c(N.binomProb(20, 0.3, null, 4), 0.2375077788776);
  c(N.binomProb(20, 0.3, 4, 4), N.binomPmf(20, 0.3)[4]);
  c(N.binomProb(100, 0.5, 40, 60), 0.9647997997822952, 1e-9);
  c(N.binomProb(5, 0, 0, 0), 1); c(N.binomProb(5, 1, 5, null), 1);
  c(N.binomPmf(1000, 0.3).reduce((s, v) => s + v, 0), 1, 1e-9);
});
