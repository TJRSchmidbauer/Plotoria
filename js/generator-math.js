// Plotoria 3.1 – Graph-Generator: Kurvendiskussion rückwärts (Steckbriefaufgaben)
// Reine Mathematik ohne DOM – in Node testbar (tests/generator.test.js).
//
// Ansatz für Ganzrational, Gebrochen-rational und Polynom·e^(kx): f(x) = P(x) · w(x) mit
// w = 1, w = 1/D(x) bzw. w = e^(kx). Jede Vorgabe (Nullstelle, Hochpunkt, Wendepunkt, Punkt …)
// ist eine lineare Gleichung in den Koeffizienten von P. Gelöst wird exakt mit Brüchen;
// bleiben Koeffizienten frei, wird die „schönste“ gültige Wahl gesucht.
const GraphGen = (() => {
  const MINUS = '−';

  // ══════════════ Brüche mit BigInt ══════════════
  const babs = (a) => (a < 0n ? -a : a);
  const bgcd = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };

  class Fr {
    constructor(n, d = 1n) {
      if (d === 0n) throw new Error('Division durch 0');
      if (d < 0n) { n = -n; d = -d; }
      const g = bgcd(n, d) || 1n;
      this.n = n / g; this.d = d / g;
    }
    static of(p, q = 1) { return new Fr(BigInt(p), BigInt(q)); }
    add(b) { return new Fr(this.n * b.d + b.n * this.d, this.d * b.d); }
    sub(b) { return new Fr(this.n * b.d - b.n * this.d, this.d * b.d); }
    mul(b) { return new Fr(this.n * b.n, this.d * b.d); }
    div(b) { return new Fr(this.n * b.d, this.d * b.n); }
    neg() { return new Fr(-this.n, this.d); }
    isZero() { return this.n === 0n; }
    toNumber() { return Number(this.n) / Number(this.d); }
    toString() { return this.d === 1n ? String(this.n) : this.n + '/' + this.d; }
  }

  // „1,5“, „-3/4“, „−2“, „0.25“ → Bruch; sonst null
  function parseFr(s) {
    if (s instanceof Fr) return s;
    if (typeof s === 'number') {
      if (!isFinite(s)) return null;
      return parseFr(String(+s.toPrecision(12)));
    }
    const t = String(s == null ? '' : s).trim().replace(/[−–]/g, '-').replace(/,/g, '.').replace(/\s+/g, '');
    if (!t) return null;
    const parts = t.split('/');
    if (parts.length > 2) return null;
    const dec = (u) => {
      const m = u.match(/^([+-]?)(\d*)(?:\.(\d*))?$/);
      if (!m || (!m[2] && !m[3])) return null;
      const frac = m[3] || '';
      const n = BigInt((m[2] || '0') + frac) * (m[1] === '-' ? -1n : 1n);
      return new Fr(n, 10n ** BigInt(frac.length));
    };
    const a = dec(parts[0]);
    if (!a) return null;
    if (parts.length === 1) return a;
    const b = dec(parts[1]);
    return b && !b.isZero() ? a.div(b) : null;
  }

  // Körper für das Gleichungssystem: exakt (Brüche) oder Gleitkomma (für e^(kx))
  const QF = {
    exact: true, zero: Fr.of(0), one: Fr.of(1),
    add: (a, b) => a.add(b), sub: (a, b) => a.sub(b), mul: (a, b) => a.mul(b), div: (a, b) => a.div(b),
    isZero: (a) => a.isZero(), from: (x) => (x instanceof Fr ? x : parseFr(x)), num: (a) => a.toNumber(),
  };
  const RF = {
    exact: false, zero: 0, one: 1,
    add: (a, b) => a + b, sub: (a, b) => a - b, mul: (a, b) => a * b, div: (a, b) => a / b,
    isZero: (a) => Math.abs(a) < 1e-11, from: (x) => (x instanceof Fr ? x.toNumber() : +x), num: (a) => a,
  };

  // ══════════════ Lineares Gleichungssystem (Gauß, reduzierte Stufenform) ══════════════
  function solve(F, A, b, ncols) {
    const M = A.map((r, i) => r.slice().concat([b[i]]));
    const pivots = [];
    let row = 0;
    for (let c = 0; c < ncols && row < M.length; c++) {
      let p = -1;
      if (F.exact) { for (let r = row; r < M.length; r++) if (!F.isZero(M[r][c])) { p = r; break; } }
      else {
        let best = 1e-12;
        for (let r = row; r < M.length; r++) if (Math.abs(M[r][c]) > best) { best = Math.abs(M[r][c]); p = r; }
      }
      if (p < 0) continue;
      [M[row], M[p]] = [M[p], M[row]];
      const pv = M[row][c];
      for (let k = c; k <= ncols; k++) M[row][k] = F.div(M[row][k], pv);
      for (let r = 0; r < M.length; r++) {
        if (r === row || F.isZero(M[r][c])) continue;
        const fct = M[r][c];
        for (let k = c; k <= ncols; k++) M[r][k] = F.sub(M[r][k], F.mul(fct, M[row][k]));
      }
      pivots.push(c);
      row++;
    }
    for (let r = row; r < M.length; r++) {
      const rhs = M[r][ncols];
      if (F.exact ? !F.isZero(rhs) : Math.abs(rhs) > 1e-7 * (1 + Math.max(...b.map(v => Math.abs(F.num(v)))))) return { consistent: false };
    }
    const free = [];
    for (let c = 0; c < ncols; c++) if (!pivots.includes(c)) free.push(c);
    // Lösung für gegebene Werte der freien Variablen
    const at = (vals) => {
      const x = new Array(ncols).fill(F.zero);
      free.forEach((c, i) => { x[c] = F.from(vals[i] ?? 0); });
      pivots.forEach((c, r) => {
        let v = M[r][ncols];
        free.forEach((fc) => { v = F.sub(v, F.mul(M[r][fc], x[fc])); });
        x[c] = v;
      });
      return x;
    };
    return { consistent: true, free, at };
  }

  // ══════════════ Polynome (Koeffizienten aufsteigend) ══════════════
  const fall = (j, i) => { let p = 1; for (let k = 0; k < i; k++) p *= j - k; return p; };
  const binom = (n, k) => fall(n, k) / fall(k, k);

  function polyEval(c, x, k = 0) {   // k-te Ableitung, Gleitkomma
    let s = 0;
    for (let j = c.length - 1; j >= k; j--) s = s * x + c[j] * fall(j, k);
    return s;
  }
  function polyEvalF(F, c, x, k = 0) {   // im Körper F
    let s = F.zero;
    for (let j = c.length - 1; j >= k; j--) s = F.add(F.mul(s, x), F.mul(c[j], F.from(fall(j, k))));
    return s;
  }
  function polyMul(F, a, b) {
    const r = new Array(a.length + b.length - 1).fill(F.zero);
    a.forEach((x, i) => b.forEach((y, j) => { r[i + j] = F.add(r[i + j], F.mul(x, y)); }));
    return r;
  }
  // ∏ (x − r)^m
  function polyFromRoots(F, roots) {
    let p = [F.one];
    roots.forEach(({ x, m }) => { for (let k = 0; k < (m || 1); k++) p = polyMul(F, p, [F.sub(F.zero, F.from(x)), F.one]); });
    return p;
  }
  const trimPoly = (F, c) => { const r = c.slice(); while (r.length > 1 && F.isZero(r[r.length - 1])) r.pop(); return r; };

  // ══════════════ Gewicht w(x) und seine Ableitungen ══════════════
  // Liefert w^(0..3)(x0) im Körper F bzw. als Gleitkommafunktion
  function weight(spec) {
    if (spec.w === 'rat') {
      const D = spec.D;   // Brüche
      const Df = D.map(v => v.toNumber());
      const exact = (x0) => {
        const d = [0, 1, 2, 3].map(k => polyEvalF(QF, D, x0, k));
        if (d[0].isZero()) return null;
        const g0 = QF.one.div(d[0]);
        const g1 = d[1].neg().div(d[0].mul(d[0]));
        const g2 = Fr.of(2).mul(d[1]).mul(d[1]).sub(d[0].mul(d[2])).div(d[0].mul(d[0]).mul(d[0]));
        const g3 = Fr.of(-6).mul(d[1]).mul(d[1]).mul(d[1]).add(Fr.of(6).mul(d[0]).mul(d[1]).mul(d[2])).sub(d[0].mul(d[0]).mul(d[3]))
          .div(d[0].mul(d[0]).mul(d[0]).mul(d[0]));
        return [g0, g1, g2, g3];
      };
      const float = (x, k) => {
        const d0 = polyEval(Df, x), d1 = polyEval(Df, x, 1), d2 = polyEval(Df, x, 2), d3 = polyEval(Df, x, 3);
        if (k === 0) return 1 / d0;
        if (k === 1) return -d1 / (d0 * d0);
        if (k === 2) return (2 * d1 * d1 - d0 * d2) / (d0 * d0 * d0);
        return (-6 * d1 * d1 * d1 + 6 * d0 * d1 * d2 - d0 * d0 * d3) / (d0 ** 4);
      };
      return { F: QF, at: exact, float };
    }
    if (spec.w === 'exp') {
      const k = spec.k;
      return { F: RF, at: (x0) => [0, 1, 2, 3].map(j => k ** j * Math.exp(k * x0)), float: (x, j) => k ** j * Math.exp(k * x) };
    }
    return { F: QF, at: () => [QF.one, QF.zero, QF.zero, QF.zero], float: (x, j) => (j === 0 ? 1 : 0) };
  }

  // f^(k)(x0) als Zeile über den Koeffizienten-Spalten cols
  function condRow(F, W, cols, k, x0) {
    return cols.map(j => {
      let s = F.zero;
      for (let i = 0; i <= Math.min(k, j); i++) {
        const term = F.mul(F.from(binom(k, i) * fall(j, i)), F.mul(W[k - i], pow(F, x0, j - i)));
        s = F.add(s, term);
      }
      return s;
    });
  }
  function pow(F, x, n) { let r = F.one; for (let i = 0; i < n; i++) r = F.mul(r, x); return r; }

  // ══════════════ Vorgaben → Gleichungen ══════════════
  // Vorgabe: { kind, x, y, m } – kind: point, zero (m = Vielfachheit), max, min, vertex, inflect, terrace, slope
  function expand(c) {
    const out = [];
    const has = (v) => v !== null && v !== undefined && v !== '';
    switch (c.kind) {
      case 'point': out.push([0, c.x, c.y]); break;
      case 'zero': for (let k = 0; k < (c.m || 1); k++) out.push([k, c.x, 0]); break;
      case 'max': case 'min': case 'vertex': if (has(c.y)) out.push([0, c.x, c.y]); out.push([1, c.x, 0]); break;
      case 'inflect': if (has(c.y)) out.push([0, c.x, c.y]); out.push([2, c.x, 0]); break;
      case 'terrace': if (has(c.y)) out.push([0, c.x, c.y]); out.push([1, c.x, 0]); out.push([2, c.x, 0]); break;
      case 'slope': out.push([1, c.x, c.y]); break;
      default: break;
    }
    return out;
  }

  // ══════════════ Modelle: Funktion und Ableitungen ══════════════
  function linModel(spec, coef) {
    const W = weight(spec);
    const c = coef.map(v => (v instanceof Fr ? v.toNumber() : v));
    const d = (k, x) => {
      let s = 0;
      for (let i = 0; i <= k; i++) s += binom(k, i) * polyEval(c, x, i) * W.float(x, k - i);
      return s;
    };
    const poles = spec.w === 'rat' ? (spec.poleList || []).map(p => p.x) : [];
    return { f: (x) => d(0, x), d, poles, coef, spec };
  }

  // ══════════════ Kennpunkte numerisch bestimmen ══════════════
  function bisect(g, a, b) {
    let fa = g(a);
    for (let i = 0; i < 80; i++) {
      const m = (a + b) / 2, fm = g(m);
      if (!isFinite(fm)) return null;
      if (fm === 0) return m;
      if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
    }
    return (a + b) / 2;
  }

  function features(model, x0, x1, N = 1600) {
    const { f, d, poles } = model;
    const dx = (x1 - x0) / N;
    const out = [];
    const nearPole = (a, b) => poles.some(p => p >= a - 1e-12 && p <= b + 1e-12);
    const add = (type, x) => {
      const y = f(x);
      if (!isFinite(y)) return;
      if (out.some(p => p.type === type && Math.abs(p.x - x) < dx)) return;
      out.push({ type, x: snap(x), y: snap(y) });
    };
    const scan = (g, cb) => {
      let la = x0, lg = g(x0);
      for (let i = 1; i <= N; i++) {
        const b = x0 + i * dx, gb = g(b);
        if (isFinite(lg) && isFinite(gb) && !nearPole(la, b)) {
          if (gb === 0) { if (lg !== 0) cb(b); }   // g ≡ 0 (z. B. f″ einer Geraden) liefert keine Punkte
          else if (lg !== 0 && Math.sign(gb) !== Math.sign(lg)) { const r = bisect(g, la, b); if (r !== null) cb(r); }
        }
        la = b; lg = gb;
      }
    };
    const scale = Math.max(1e-9, ...Array.from({ length: 41 }, (_, i) => Math.abs(f(x0 + (x1 - x0) * i / 40))).filter(isFinite));
    scan((x) => f(x), (r) => add('zero', r));
    scan((x) => d(1, x), (r) => {
      const t = classify(model, r);
      if (t === 'max' || t === 'min') {
        add(t, r);
        if (Math.abs(f(r)) < 1e-9 * scale) add('zero', r);   // Berührpunkt mit der x-Achse
      }
    });
    scan((x) => d(2, x), (r) => {
      const t = classify(model, r);
      if (t !== 'terrace' && t !== 'inflect') return;
      add(t, r);
      if (t === 'terrace' && Math.abs(f(r)) < 1e-9 * scale) add('zero', r);
    });
    poles.filter(p => p > x0 && p < x1).forEach(p => out.push({ type: 'pole', x: p, y: NaN }));
    return out.sort((a, b) => a.x - b.x);
  }

  // Art eines Punktes über Vorzeichenwechsel von f′ und f″
  function classify(model, x) {
    const h = 1e-4 * Math.max(1, Math.abs(x));
    const a1 = model.d(1, x - h), b1 = model.d(1, x + h), a2 = model.d(2, x - h), b2 = model.d(2, x + h);
    const s = (v) => (Math.abs(v) < 1e-14 ? 0 : Math.sign(v));
    const f1 = Math.abs(model.d(1, x)) < 1e-7 * (1 + Math.abs(a1) + Math.abs(b1)) || s(a1) !== s(b1);
    if (f1 && s(a1) > 0 && s(b1) < 0) return 'max';
    if (f1 && s(a1) < 0 && s(b1) > 0) return 'min';
    if (s(a2) !== s(b2) && s(a2) !== 0 && s(b2) !== 0) return f1 && Math.abs(model.d(1, x)) < 1e-7 ? 'terrace' : 'inflect';
    return 'none';
  }

  // nahe an einfachen Brüchen runden (für Anzeige und Vergleich)
  function snap(v) {
    const r = ratOf(v, 24);
    return r ? r.p / r.q : v;
  }
  function ratOf(v, maxDen) {
    if (!isFinite(v)) return null;
    for (let q = 1; q <= maxDen; q++) {
      const p = Math.round(v * q);
      if (Math.abs(p / q - v) <= 1e-9 * Math.max(1, Math.abs(v))) return { p, q };
    }
    return null;
  }

  // Wie „schön“ ist eine Zahl? 0 = ganzzahlig, höher = unhandlicher
  function niceness(v) {
    if (!isFinite(v)) return 3;
    const r = ratOf(v, 12);
    const big = Math.max(0, Math.abs(v) - 8) * 0.15;
    if (!r) return 4 + big;
    return ({ 1: 0, 2: 0.6, 3: 1.1, 4: 1.1 })[r.q] ?? (r.q <= 6 ? 1.8 : 2.6) + big;
  }

  // ══════════════ Prüfen der Vorgaben ══════════════
  const KIND_NAMES = { zero: 'Nullstelle', max: 'Hochpunkt', min: 'Tiefpunkt', vertex: 'Scheitel', inflect: 'Wendepunkt', terrace: 'Terrassenpunkt', point: 'Punkt', slope: 'Steigung', pole: 'Polstelle', hole: 'Definitionslücke', asym: 'Asymptote' };

  function check(model, conds) {
    const res = [];
    let ok = true;
    const num = (v) => (v instanceof Fr ? v.toNumber() : +v);
    conds.forEach(c => {
      const x = num(c.x);
      let good = true, msg = '';
      const t = (c.kind === 'max' || c.kind === 'min' || c.kind === 'vertex' || c.kind === 'inflect' || c.kind === 'terrace') ? classify(model, x) : null;
      if (c.kind === 'max' || c.kind === 'min') {
        if (t !== c.kind) { good = false; msg = 'ist ' + (t === 'none' ? 'kein Extrempunkt' : 'ein ' + KIND_NAMES[t]); }
      } else if (c.kind === 'vertex') {
        if (t !== 'max' && t !== 'min') { good = false; msg = 'ist kein Scheitel'; }
      } else if (c.kind === 'inflect') {
        if (t !== 'inflect' && t !== 'terrace') { good = false; msg = 'kein Vorzeichenwechsel von f″ – kein Wendepunkt'; }
        else if (t === 'terrace') msg = 'waagrechte Tangente – Terrassenpunkt';
      } else if (c.kind === 'terrace') {
        if (t !== 'terrace') { good = false; msg = t === 'max' || t === 'min' ? 'ist ein ' + KIND_NAMES[t] : 'kein Terrassenpunkt'; }
      } else if (c.kind === 'zero') {
        // Vielfachheit: Vorzeichenwechsel bei ungerader, Berührung bei gerader Vielfachheit
        const h = 1e-4 * Math.max(1, Math.abs(x)), l = model.f(x - h), r = model.f(x + h);
        const vzw = Math.sign(l) !== Math.sign(r);
        if ((c.m || 1) % 2 === 1 && !vzw) { good = false; msg = 'ohne Vorzeichenwechsel – doppelte Nullstelle'; }
        if ((c.m || 1) % 2 === 0 && vzw) { good = false; msg = 'mit Vorzeichenwechsel'; }
      } else if (c.kind === 'pole') {
        if (model.spec.P && Math.abs(polyEval(model.coef.map(num), x)) < 1e-12) { good = false; msg = 'Zähler ist dort auch 0 – keine Polstelle'; }
      }
      if (!good) ok = false;
      res.push({ c, ok: good, msg });
    });
    return { ok, items: res };
  }

  // ══════════════ Lösen: Ganzrational, Gebrochen-rational, Polynom·e^(kx) ══════════════
  const NICE_VALUES = [0, 1, -1, 2, -2, 0.5, -0.5, 3, -3, 0.25, -0.25, 1.5, -1.5, 4, -4, 1 / 3, -1 / 3, 2 / 3, -2 / 3, 0.75, -0.75, 5, -5, 2.5, -2.5];

  function solveLinear(spec) {
    const { conds } = spec;
    const exp = spec.type === 'expoly', rat = spec.type === 'rational';
    const F = exp ? RF : QF;
    const parsed = [];
    for (const c of conds) {
      const x = F.exact ? parseFr(c.x) : num(c.x);
      if (x === null || (typeof x === 'number' && !isFinite(x))) return { error: (KIND_NAMES[c.kind] || 'Vorgabe') + ': x fehlt oder ist keine Zahl' };
      const needY = c.kind === 'point' || c.kind === 'slope';
      let y = c.y === '' || c.y === null || c.y === undefined ? null : (F.exact ? parseFr(c.y) : num(c.y));
      if (y !== null && (typeof y === 'number' ? !isFinite(y) : false)) y = null;
      if (y === null && c.y !== '' && c.y !== null && c.y !== undefined) return { error: (KIND_NAMES[c.kind] || 'Vorgabe') + ': y ist keine Zahl' };
      if (needY && y === null) return { error: (KIND_NAMES[c.kind] || 'Vorgabe') + ' bei x = ' + c.x + ': Wert fehlt' };
      parsed.push({ ...c, x, y, m: c.m || 1 });
    }
    // Gebrochen-rational: Nenner aus Polstellen und Lücken
    let wspec = { w: 'poly' };
    const poleList = [], holes = [];
    if (rat) {
      parsed.filter(c => c.kind === 'pole').forEach(c => poleList.push({ x: c.x, m: c.m }));
      parsed.filter(c => c.kind === 'hole').forEach(c => holes.push({ x: c.x, m: 1 }));
      if (!poleList.length && !holes.length) return { error: 'Mindestens eine Polstelle oder Definitionslücke angeben' };
      const D = polyFromRoots(QF, poleList.concat(holes));
      wspec = { w: 'rat', D, poleList: poleList.map(p => ({ x: p.x.toNumber(), m: p.m })), P: true };
      const bad = parsed.find(c => !['pole', 'hole'].includes(c.kind) && poleList.concat(holes).some(p => p.x.sub(c.x).isZero()));
      if (bad) return { error: KIND_NAMES[bad.kind] + ' bei x = ' + bad.x + ' liegt auf einer Polstelle oder Lücke' };
    } else if (exp) {
      const k = num(spec.k);
      if (!isFinite(k) || k === 0) return { error: 'k im Exponenten muss eine Zahl ≠ 0 sein' };
      wspec = { w: 'exp', k };
    }
    const W = weight(wspec);
    const eqs = [];
    parsed.forEach(c => {
      if (c.kind === 'hole') eqs.push({ k: 0, x: c.x, v: F.zero, P: true });   // Zähler hat dort eine Nullstelle
      else if (c.kind !== 'pole') expand(c).forEach(([k, x, v]) => eqs.push({ k, x, v: F.from(v) }));
    });
    const dD = rat ? wspec.D.length - 1 : 0;
    // mögliche Grade des Zählers bzw. des Polynoms
    const has = (k) => parsed.some(c => c.kind === k);
    let nMin = has('inflect') || has('terrace') ? 3 : (has('max') || has('min') || has('vertex')) ? 2 : 1;
    parsed.filter(c => c.kind === 'zero').forEach(c => { nMin = Math.max(nMin, c.m); });
    let degrees;
    if (spec.degree && spec.degree !== 'auto') degrees = [+spec.degree];
    else if (rat) {
      const a = spec.asym || { kind: 'auto' };
      if (a.kind === 'zero') degrees = Array.from({ length: dD }, (_, i) => i);
      else if (a.kind === 'h') degrees = [dD];
      else if (a.kind === 'o') degrees = [dD + 1];
      else degrees = Array.from({ length: dD + 3 }, (_, i) => i);
    } else degrees = Array.from({ length: 8 - Math.min(nMin, 7) }, (_, i) => Math.min(nMin, 7) + i).filter(n => n <= 7);
    if (rat) degrees = degrees.filter(n => n >= parsed.filter(c => c.kind === 'zero').reduce((s, c) => s + c.m, 0) + holes.length);

    let fallback = null;
    for (const n of degrees) {
      let cols = Array.from({ length: n + 1 }, (_, j) => j);
      if (spec.sym === 'even') cols = cols.filter(j => j % 2 === 0);
      if (spec.sym === 'odd') cols = cols.filter(j => j % 2 === 1);
      const A = [], b = [];
      let bad = false;
      eqs.forEach(e => {
        if (e.P) { A.push(cols.map(j => pow(F, e.x, j))); b.push(e.v); return; }
        const Wx = W.at(e.x);
        if (!Wx) { bad = true; return; }
        A.push(condRow(F, Wx, cols, e.k, e.x)); b.push(e.v);
      });
      if (bad) continue;
      // Asymptoten des gebrochen-rationalen Terms als Bedingungen an den Zähler
      if (rat && spec.asym) {
        const a = spec.asym, D = wspec.D;
        if (a.kind === 'h' && a.c !== undefined && a.c !== '') {
          const c = parseFr(a.c); if (!c) return { error: 'Asymptote: y = … ist keine Zahl' };
          A.push(cols.map(j => (j === n ? QF.one : QF.zero))); b.push(c);
        }
        if (a.kind === 'o') {
          const m = parseFr(a.m), t = parseFr(a.t);
          if (!m || !t) return { error: 'Schiefe Asymptote: m und t angeben' };
          if (m.isZero()) return { error: 'Schiefe Asymptote braucht m ≠ 0 – sonst waagrechte Asymptote wählen' };
          // P = (m x + t)·D + R mit Grad R < Grad D
          A.push(cols.map(j => (j === dD + 1 ? QF.one : QF.zero))); b.push(m);
          A.push(cols.map(j => (j === dD ? QF.one : QF.zero))); b.push(m.mul(D[dD - 1] || QF.zero).add(t));
        }
      }
      const sol = solve(F, A, b, cols.length);
      if (!sol.consistent) continue;
      const build = (vals) => {
        const x = sol.at(vals);
        const coef = new Array(n + 1).fill(F.zero);
        cols.forEach((j, i) => { coef[j] = x[i]; });
        return coef;
      };
      const evaluate = (vals) => {
        const coef = build(vals);
        if (coef.every(v => F.isZero(v))) return null;
        const model = linModel({ ...wspec, type: spec.type }, coef);
        const chk = check(model, parsed);
        return { coef, model, chk };
      };
      const freeCols = sol.free.map(i => cols[i]);
      let best = null;
      if (spec.free && spec.free.length === freeCols.length) {
        best = evaluate(spec.free);
        if (best) best.vals = spec.free.slice();
      } else {
        // schönste gültige Wahl der freien Koeffizienten suchen
        const k = Math.min(freeCols.length, 2);
        const grid = k === 0 ? [[]] : k === 1 ? NICE_VALUES.map(v => [v]) : NICE_VALUES.slice(0, 17).flatMap(u => NICE_VALUES.slice(0, 17).map(v => [u, v]));
        for (const g of grid) {
          const vals = g.concat(new Array(freeCols.length - k).fill(0));
          const r = evaluate(vals);
          if (!r) continue;
          r.vals = vals;
          r.score = score(r, parsed, F) + g.reduce((s, v) => s + niceness(v) * 0.5 + (v === 0 ? 0 : 0.05), 0);
          if (r.chk.ok && (!best || !best.chk.ok || r.score < best.score)) best = r;
          else if (!best) best = r;
        }
      }
      if (!best) continue;
      const result = { ...best, n, freeCols, wspec, F, cols, degreeAuto: !spec.degree || spec.degree === 'auto' };
      if (best.chk.ok) return finish(result, spec);
      if (!fallback) fallback = result;
    }
    if (fallback) return finish(fallback, spec);
    return { error: 'Die Vorgaben passen nicht zusammen – eine Vorgabe entfernen oder ändern' + (spec.degree && spec.degree !== 'auto' ? ' bzw. den Grad erhöhen' : '') };
  }

  function score(r, parsed, F) {
    const win = autoWindow(r.model, parsed);
    const feats = features(r.model, win[0], win[1]);
    let s = 0;
    feats.forEach(p => { if (p.type !== 'pole') s += niceness(p.x) + niceness(p.y) * 0.8; });
    // unverlangte Extrem- und Wendepunkte leicht bestrafen
    const extra = feats.filter(p => !parsed.some(c => Math.abs(num(c.x) - p.x) < 1e-6));
    s += extra.length * 0.4;
    if (F.exact) r.coef.forEach(c => { s += Math.log2(Number(c.d)) * 0.35 + Math.log10(Math.abs(Number(c.n)) + 1) * 0.15; });
    else r.coef.forEach(c => { s += niceness(c) * 0.5; });
    return s;
  }

  function num(v) {
    if (v instanceof Fr) return v.toNumber();
    if (typeof v === 'number') return v;
    const fr = parseFr(v);
    if (fr) return fr.toNumber();
    const t = String(v == null ? '' : v).trim().replace(/[−–]/g, '-').replace(/,/g, '.').replace(/π/g, 'pi');
    if (!t) return NaN;
    // einfache Ausdrücke mit pi, z. B. „pi/2“, „3pi/4“, „-pi“
    const m = t.match(/^([+-]?\d*\.?\d*)\s*\*?\s*pi(?:\s*\/\s*(\d+\.?\d*))?$/);
    if (m) { const a = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : +m[1]; return a * Math.PI / (m[2] ? +m[2] : 1); }
    return NaN;
  }

  // ══════════════ Fenster ══════════════
  function autoWindow(model, parsed, extraX) {
    const xs = parsed.map(c => num(c.x)).filter(isFinite).concat(model.poles || [], extraX || []);
    let a = xs.length ? Math.min(...xs) : -3, b = xs.length ? Math.max(...xs) : 3;
    if (b - a < 4) { const m = (a + b) / 2; a = m - 2; b = m + 2; }
    const pad = Math.max(1.5, (b - a) * 0.35);
    return [a - pad, b + pad];
  }

  function niceRound(v, up) {
    const s = Math.abs(v) <= 2 ? 0.5 : Math.abs(v) <= 12 ? 1 : Math.pow(10, Math.floor(Math.log10(Math.abs(v)))) / 2;
    return (up ? Math.ceil(v / s) : Math.floor(v / s)) * s;
  }

  // Ansicht so, dass alle Kennpunkte und Vorgaben gut sichtbar sind
  function viewFor(model, feats, parsed, asymY) {
    const pts = feats.filter(p => p.type !== 'pole').concat(parsed.filter(c => c.kind === 'point' || c.y !== undefined && c.y !== null && c.y !== '' && c.kind !== 'slope')
      .map(c => ({ x: num(c.x), y: num(c.y) })).filter(p => isFinite(p.x) && isFinite(p.y)));
    const xs = pts.map(p => p.x).concat(model.poles || [], parsed.map(c => num(c.x)).filter(isFinite));
    let x0 = xs.length ? Math.min(...xs) : -4, x1 = xs.length ? Math.max(...xs) : 4;
    if (x1 - x0 < 3) { const m = (x0 + x1) / 2; x0 = m - 1.5; x1 = m + 1.5; }
    const px = Math.max(1, (x1 - x0) * 0.25);
    x0 = niceRound(x0 - px, false); x1 = niceRound(x1 + px, true);
    const ys = pts.map(p => p.y).filter(isFinite).concat([0]);
    if (asymY !== undefined && isFinite(asymY)) ys.push(asymY);
    // wenige Kennpunkte oder Polstellen: typische Funktionswerte im Fenster (ohne Pol-Ausreißer)
    if (ys.length < 3 || (model.poles && model.poles.length)) {
      for (let i = 0; i <= 40; i++) {
        const x = x0 + (x1 - x0) * i / 40;
        if ((model.poles || []).some(p => Math.abs(p - x) < (x1 - x0) / 12)) continue;
        const y = model.f(x);
        if (isFinite(y)) ys.push(y);
      }
      const keep = ys.slice(0, pts.length + 1);
      const smp = ys.slice(pts.length + 1).sort((a, b) => a - b);
      if (smp.length) {
        const lo = smp[Math.floor(smp.length * 0.08)], hi = smp[Math.ceil(smp.length * 0.92) - 1];
        ys.length = 0; ys.push(...keep, lo, hi);
      }
    }
    let y0 = Math.min(...ys), y1 = Math.max(...ys);
    if (y1 - y0 < 2) { const m = (y0 + y1) / 2; y0 = m - 1; y1 = m + 1; }
    const py = Math.max(1, (y1 - y0) * 0.3);
    if (model.poles && model.poles.length) {
      // beide Äste jeder Polstelle sichtbar: etwas Platz links und rechts
      const pl = Math.min(...model.poles), pr = Math.max(...model.poles);
      x0 = Math.min(x0, niceRound(pl - 3, false)); x1 = Math.max(x1, niceRound(pr + 3, true));
    }
    y0 = niceRound(y0 - py, false); y1 = niceRound(y1 + py, true);
    const r = (y1 - y0) / (x1 - x0);
    return { view: [x0, x1, y0, y1], prop: r > 0.45 && r < 2.2 };
  }

  // ══════════════ Terme als Text ══════════════
  // Zahl für den Plotoria-Parser (Brüche als a/b, Dezimalzahlen gerundet)
  function numStr(v) {
    if (v instanceof Fr) return v.toString();
    const r = ratOf(v, 64);
    if (r) return r.q === 1 ? String(r.p) : r.p + '/' + r.q;
    return String(+v.toPrecision(6));
  }
  const isNeg = (v) => (v instanceof Fr ? v.n < 0n : v < 0);
  const absV = (v) => (v instanceof Fr ? (v.n < 0n ? v.neg() : v) : Math.abs(v));
  const isOne = (v) => (v instanceof Fr ? v.n === v.d : Math.abs(v - 1) < 1e-12);
  const isZ = (v) => (v instanceof Fr ? v.isZero() : Math.abs(v) < 1e-12);

  // Polynom absteigend: „1/4*x^3 - 3/2*x + 2“
  function polyStr(c, v = 'x') {
    const parts = [];
    for (let j = c.length - 1; j >= 0; j--) {
      if (isZ(c[j])) continue;
      const a = absV(c[j]);
      const pw = j === 0 ? '' : j === 1 ? v : v + '^' + j;
      let t;
      if (j === 0) t = numStr(a);
      else t = isOne(a) ? pw : numStr(a) + '*' + pw;
      parts.push({ neg: isNeg(c[j]), t });
    }
    if (!parts.length) return '0';
    return parts.map((p, i) => (i === 0 ? (p.neg ? '-' : '') + p.t : (p.neg ? ' - ' : ' + ') + p.t)).join('');
  }
  const linFactor = (x, v = 'x') => (isZ(x) ? v : '(' + v + (isNeg(x) ? ' + ' + numStr(absV(x)) : ' - ' + numStr(x)) + ')');

  // Rationale Nullstellen (exakt) abspalten: a·(x − r)^m … · Rest
  function factorQ(c) {
    let p = trimPoly(QF, c);
    if (p.length <= 1) return null;
    const roots = [];
    const lcmOf = (q) => q.reduce((l, v) => l / bgcd(l, v.d) * v.d, 1n);
    const tryRoot = (r) => {
      // Horner-Division, wenn r Nullstelle ist
      if (!polyEvalF(QF, p, r).isZero()) return false;
      const q = new Array(p.length - 1);
      let acc = QF.zero;
      for (let j = p.length - 1; j >= 1; j--) { acc = acc.mul(r).add(p[j]); q[j - 1] = acc; }
      p = q;
      const e = roots.find(o => o.x.sub(r).isZero());
      if (e) e.m++; else roots.push({ x: r, m: 1 });
      return true;
    };
    while (p.length > 1 && p[0].isZero()) { p = p.slice(1); const e = roots.find(o => o.x.isZero()); if (e) e.m++; else roots.push({ x: QF.zero, m: 1 }); }
    const divs = (n) => { n = babs(n); const out = []; if (n > 100000n) return [1n]; for (let i = 1n; i * i <= n; i++) if (n % i === 0n) { out.push(i); if (i * i !== n) out.push(n / i); } return out; };
    let guard = 0;
    let found = true;
    while (found && p.length > 1 && guard++ < 20) {
      found = false;
      const L = new Fr(lcmOf(p));
      const a0 = p[0].mul(L).n, an = p[p.length - 1].mul(L).n;
      if (a0 === 0n) break;
      outer: for (const q of divs(an)) for (const pp of divs(a0)) for (const s of [1n, -1n]) {
        if (tryRoot(new Fr(s * pp, q))) { found = true; break outer; }
      }
    }
    return { lead: p[p.length - 1], roots, rest: p.length > 1 ? p.map(v => v.div(p[p.length - 1])) : null };
  }

  function factorStr(c, v = 'x') {
    const fz = factorQ(c);
    if (!fz || !fz.roots.length) return null;
    const ps = fz.roots.sort((a, b) => a.x.toNumber() - b.x.toNumber()).map(r => {
      const b = linFactor(r.x, v);
      return r.m > 1 ? (b === v ? v + '^' + r.m : b + '^' + r.m) : b;
    });
    if (fz.rest) ps.push('(' + polyStr(fz.rest, v) + ')');
    const lead = fz.lead;
    const pre = isOne(lead) ? '' : isOne(lead.neg()) ? '-' : numStr(lead) + '*';
    return pre + ps.join('*');
  }

  // ══════════════ Ergebnis zusammenstellen ══════════════
  function finish(r, spec) {
    const { model, wspec } = r;
    let term, termFactored = null, asymptotes = [];
    const v = 'x';
    if (spec.type === 'rational') {
      const D = wspec.D;
      const P = trimPoly(QF, r.coef);
      const Dstr = factorStr(D, v) || polyStr(D, v);
      const Pf = factorStr(P, v);
      const Pstr = P.length === 1 ? numStr(P[0]) : (Pf || polyStr(P, v));
      term = (P.length === 1 ? Pstr : '(' + Pstr + ')') + '/(' + Dstr + ')';
      // Asymptote aus dem Gradvergleich
      const dP = P.length - 1, dD = D.length - 1;
      if (dP < dD) asymptotes.push({ kind: 'h', y: 0 });
      else if (dP === dD) asymptotes.push({ kind: 'h', y: P[dP].div(D[dD]).toNumber() });
      else if (dP === dD + 1) {
        const m = P[dP].div(D[dD]);
        const t = P[dP - 1].sub(m.mul(D[dD - 1])).div(D[dD]);
        asymptotes.push({ kind: 'o', m: m.toNumber(), t: t.toNumber() });
      }
    } else if (spec.type === 'expoly') {
      const P = trimPoly(RF, r.coef.map(c => +c.toPrecision(12)));
      const k = num(spec.k);
      const Pstr = polyStr(P, v);
      term = (P.length === 1 ? Pstr : '(' + Pstr + ')') + '*e^(' + (k === 1 ? '' : k === -1 ? '-' : numStr(k) + '*') + 'x)';
      if (k < 0) asymptotes.push({ kind: 'h', y: 0, side: '+∞' });
      else asymptotes.push({ kind: 'h', y: 0, side: '−∞' });
    } else {
      const P = trimPoly(QF, r.coef);
      term = polyStr(P, v);
      termFactored = factorStr(P, v);
      if (termFactored && (termFactored === term || termFactored.replace(/[()]/g, '') === term.replace(/[()]/g, ''))) termFactored = null;
    }
    const win = autoWindow(model, r.parsed || spec.conds);
    let feats = features(model, win[0], win[1]);
    const vw = viewFor(model, feats, spec.conds, asymptotes[0] && asymptotes[0].kind === 'h' ? asymptotes[0].y : undefined);
    feats = features(model, vw.view[0], vw.view[1]);
    const freeLabel = (j) => (spec.type === 'rational' ? 'Zähler: Koeffizient von ' : 'Koeffizient von ') + (j === 0 ? 'x⁰ (Konstante)' : j === 1 ? 'x' : 'x' + sup(j));
    return {
      ok: r.chk.ok, term, termFactored, degree: r.n, model, features: feats, view: vw.view, prop: vw.prop, asymptotes,
      checks: r.chk.items, free: r.freeCols.map((j, i) => ({ label: freeLabel(j), value: r.vals ? r.vals[i] : 0 })),
      degreeAuto: r.degreeAuto,
    };
  }
  const sup = (n) => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join('');

  // ══════════════ Exponentialfunktion a·b^x + c bzw. a·e^(kx) + c ══════════════
  function solveExp(spec) {
    const c = num(spec.asymC ?? 0);
    if (!isFinite(c)) return { error: 'Asymptote: y = … ist keine Zahl' };
    const pts = spec.conds.filter(q => q.kind === 'point').map(q => ({ x: num(q.x), y: num(q.y) }));
    const slopes = spec.conds.filter(q => q.kind === 'slope').map(q => ({ x: num(q.x), m: num(q.y) }));
    if (pts.some(p => !isFinite(p.x) || !isFinite(p.y)) || slopes.some(p => !isFinite(p.x) || !isFinite(p.m))) return { error: 'Bitte Zahlen eingeben' };
    let a, k;
    if (pts.length >= 2) {
      const [p, q] = pts;
      if (p.x === q.x) return { error: 'Die beiden Punkte brauchen verschiedene x-Werte' };
      const u = p.y - c, w = q.y - c;
      if (u === 0 || w === 0 || Math.sign(u) !== Math.sign(w)) return { error: 'Beide Punkte müssen auf derselben Seite der Asymptote y = ' + numStr(c) + ' liegen' };
      k = Math.log(w / u) / (q.x - p.x);
      a = u / Math.exp(k * p.x);
    } else if (pts.length === 1 && slopes.length) {
      const p = pts[0], s = slopes[0];
      const u = p.y - c;
      if (u === 0) return { error: 'Der Punkt darf nicht auf der Asymptote liegen' };
      // f'(x) = k (f(x) − c): bei gleichem x direkt, sonst über ln
      if (s.x !== p.x) return { error: 'Steigung bitte an derselben Stelle wie der Punkt angeben' };
      k = s.m / u; a = u / Math.exp(k * p.x);
      if (k === 0) return { error: 'Steigung 0 ergibt keine Exponentialfunktion' };
    } else return { error: 'Asymptote und zwei Punkte (oder Punkt und Steigung) angeben' };
    if (pts.length > 2) {
      const bad = pts.slice(2).find(p => Math.abs(a * Math.exp(k * p.x) + c - p.y) > 1e-9 * Math.max(1, Math.abs(p.y)));
      if (bad) return { error: 'Der dritte Punkt passt nicht zu den ersten beiden' };
    }
    const model = { f: (x) => a * Math.exp(k * x) + c, d: (j, x) => (j === 0 ? a * Math.exp(k * x) + c : a * k ** j * Math.exp(k * x)), poles: [], spec };
    let term;
    if (spec.expForm === 'base') {
      const b = Math.exp(k);
      term = (isOne(a) ? '' : a === -1 ? '-' : numStr(a) + '*') + paren(numStr(b)) + '^x' + addConst(c);
    } else {
      // k exakt: als Bruch oder – wenn e^k ein Bruch ist – als ln(…)
      let ks = Math.abs(k - 1) < 1e-12 ? '' : Math.abs(k + 1) < 1e-12 ? '-' : numStr(k) + '*';
      if (!ratOf(k, 64) && ratOf(Math.exp(k), 64)) ks = 'ln(' + numStr(Math.exp(k)) + ')*';
      term = (isOne(a) ? '' : a === -1 ? '-' : numStr(a) + '*') + 'e^(' + ks + 'x)' + addConst(c);
    }
    const asym = [{ kind: 'h', y: c, side: k > 0 ? '−∞' : '+∞' }];
    const xs = pts.map(p => p.x);
    let x0 = Math.min(...xs, 0) - 3, x1 = Math.max(...xs, 0) + 3;
    const ys = [c].concat(pts.map(p => p.y));
    for (let i = 0; i <= 20; i++) { const y = model.f(x0 + (x1 - x0) * i / 20); if (isFinite(y) && Math.abs(y - c) < 3 * Math.max(...pts.map(p => Math.abs(p.y - c)))) ys.push(y); }
    let y0 = Math.min(...ys, 0), y1 = Math.max(...ys, 0);
    const py = Math.max(1, (y1 - y0) * 0.15);
    const view = [niceRound(x0, false), niceRound(x1, true), niceRound(y0 - py, false), niceRound(y1 + py, true)];
    const r = (view[3] - view[2]) / (view[1] - view[0]);
    return {
      ok: true, term, model, features: features(model, view[0], view[1]), view, prop: r > 0.45 && r < 2.2, asymptotes: asym,
      checks: spec.conds.map(q => ({ c: q, ok: true, msg: '' })), free: [], params: { a, k, b: Math.exp(k), c },
    };
  }
  const paren = (s) => (/^[\d.]+$/.test(s) ? s : '(' + s + ')');
  const addConst = (c) => (Math.abs(c) < 1e-12 ? '' : (c < 0 ? ' - ' : ' + ') + numStr(Math.abs(c)));

  // ══════════════ Sinusfunktion a·sin(b(x − c)) + d ══════════════
  function piStr(v) {
    const r = ratOf(v / Math.PI, 24);
    if (r && r.p !== 0) {
      const n = Math.abs(r.p) === 1 ? '' : Math.abs(r.p) + '*';
      return (r.p < 0 ? '-' : '') + n + 'pi' + (r.q === 1 ? '' : '/' + r.q);
    }
    return numStr(v);
  }

  function solveSine(spec) {
    const get = (k) => spec.conds.filter(q => q.kind === k).map(q => ({ x: num(q.x), y: num(q.y) }));
    const mx = get('max'), mn = get('min');
    const per = spec.period !== undefined && spec.period !== '' ? num(spec.period) : NaN;
    if ([...mx, ...mn].some(p => !isFinite(p.x) || !isFinite(p.y))) return { error: 'Bitte Zahlen eingeben (auch pi/2 möglich)' };
    let a, b, c, d;
    if (mx.length && mn.length) {
      const H = mx[0], T = mn[0];
      if (H.y <= T.y) return { error: 'Der Hochpunkt muss höher liegen als der Tiefpunkt' };
      if (H.x === T.x) return { error: 'Hoch- und Tiefpunkt brauchen verschiedene x-Werte' };
      a = (H.y - T.y) / 2; d = (H.y + T.y) / 2;
      const half = isFinite(per) ? per / 2 : Math.abs(T.x - H.x);
      if (isFinite(per)) {
        // Abstand muss ein ungerades Vielfaches der halben Periode sein
        const q = Math.abs(T.x - H.x) / half;
        if (Math.abs(q - Math.round(q)) > 1e-9 || Math.round(q) % 2 === 0) return { error: 'Hoch- und Tiefpunkt passen nicht zur Periode ' + numStr(per) };
      }
      b = Math.PI / half;
      c = H.x - half / 2;
    } else if (mx.length && isFinite(per)) {
      const H = mx[0];
      const amp = spec.amp !== undefined && spec.amp !== '' ? num(spec.amp) : 1;
      a = amp; d = H.y - a; b = 2 * Math.PI / per; c = H.x - per / 4;
    } else return { error: 'Hoch- und Tiefpunkt angeben (oder Hochpunkt und Periode)' };
    if (per <= 0) return { error: 'Periode muss positiv sein' };
    // Verschiebung c möglichst klein wählen
    const P = 2 * Math.PI / b;
    c = ((c % P) + P) % P; if (c > P / 2) c -= P;
    if (Math.abs(c) < 1e-12) c = 0;
    const cosForm = spec.trig === 'cos';
    let shift = c, fname = 'sin';
    if (cosForm) { fname = 'cos'; shift = c + P / 4; shift = ((shift % P) + P) % P; if (shift > P / 2) shift -= P; if (Math.abs(shift) < 1e-12) shift = 0; }
    const arg = (Math.abs(b - 1) < 1e-12 ? '' : piOr(b) + '*') + (shift === 0 ? 'x' : '(x' + (shift < 0 ? ' + ' + piOr(-shift) : ' - ' + piOr(shift)) + ')');
    const term = (Math.abs(a - 1) < 1e-12 ? '' : numStr(a) + '*') + fname + '(' + arg + ')' + addConst(d);
    const model = {
      f: (x) => a * Math.sin(b * (x - c)) + d,
      d: (j, x) => { const ph = b * (x - c) + j * Math.PI / 2; return j === 0 ? a * Math.sin(ph) + d : a * b ** j * Math.sin(ph); },
      poles: [], spec,
    };
    const xs = [...mx, ...mn].map(p => p.x);
    let x0 = Math.min(0, ...xs) - P / 4, x1 = Math.max(...xs, x0 + P) + P / 4;
    if (x1 - x0 < 1.5 * P) x1 = x0 + 1.5 * P;
    const view = [niceRound(x0, false), niceRound(x1, true), niceRound(Math.min(0, d - a) - 0.5, false), niceRound(Math.max(0, d + a) + 0.5, true)];
    return {
      ok: true, term, model, features: features(model, view[0], view[1]), view, prop: false, asymptotes: [],
      checks: spec.conds.map(q => ({ c: q, ok: true, msg: '' })), free: [], params: { a, b, c, d, period: P }, piAxis: ratOf(P / Math.PI, 12) !== null,
    };
  }
  const piOr = (v) => { const s = piStr(v); return /[+\-*/ ]/.test(s.replace(/^-/, '')) ? '(' + s + ')' : s; };

  // ══════════════ Hauptfunktion ══════════════
  // spec: { type: 'line'|'parabola'|'poly'|'rational'|'exp'|'expoly'|'sine', conds: [...], degree, sym, asym, k, expForm, asymC, period, trig, free }
  function generate(spec) {
    try {
      if (!spec.conds || !spec.conds.length) return { error: 'Vorgaben hinzufügen – z. B. Nullstellen, einen Hochpunkt oder Punkte' };
      if (spec.type === 'exp') return solveExp(spec);
      if (spec.type === 'sine') return solveSine(spec);
      const s = { ...spec };
      if (spec.type === 'line') { s.type = 'poly'; s.degree = 1; }
      if (spec.type === 'parabola') { s.type = 'poly'; s.degree = 2; }
      const r = solveLinear(s);
      if (r.error && (spec.type === 'line' || spec.type === 'parabola') && /passen nicht/.test(r.error)) {
        return { error: (spec.type === 'line' ? 'Keine Gerade' : 'Keine Parabel') + ' erfüllt alle Vorgaben – eine Vorgabe entfernen oder „Ganzrational“ wählen' };
      }
      if (r.error) return r;
      if ((spec.type === 'line' || spec.type === 'parabola') && !r.ok) r.error = spec.type === 'line' ? 'Keine Gerade erfüllt alle Vorgaben' : 'Keine Parabel erfüllt alle Vorgaben';
      return r;
    } catch (e) {
      return { error: 'Berechnung nicht möglich: ' + e.message };
    }
  }

  // ══════════════ Zufällige schöne Vorgaben ══════════════
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const fmt = (v) => { const q = ratOf(v, 12); return q ? (q.q === 1 ? String(q.p) : q.p + '/' + q.q) : String(+v.toFixed(4)); };

  // Kennpunkte eines Modells als Vorgaben (ohne Polstellen)
  function featsToConds(feats) {
    const out = [];
    feats.forEach(p => {
      if (p.type === 'zero') {
        const other = feats.find(q => q !== p && Math.abs(q.x - p.x) < 1e-9);
        const m = other && other.type === 'terrace' ? 3 : other && (other.type === 'max' || other.type === 'min') ? 2 : 1;
        out.push({ kind: 'zero', x: fmt(p.x), m });
      } else if (p.type === 'max' || p.type === 'min' || p.type === 'inflect' || p.type === 'terrace') {
        if (p.type !== 'inflect' && out.some(o => o.kind === 'zero' && Math.abs(num(o.x) - p.x) < 1e-9)) return;   // steckt in der Vielfachheit
        if (p.type === 'terrace' && out.some(o => o.kind === 'zero' && o.m === 3 && Math.abs(num(o.x) - p.x) < 1e-9)) return;
        out.push({ kind: p.type, x: fmt(p.x), y: fmt(p.y) });
      }
    });
    return out;
  }

  function allNice(feats, maxScore) {
    return feats.every(p => p.type === 'pole' || (niceness(p.x) <= maxScore && niceness(p.y) <= maxScore && Math.abs(p.y) <= 9 && Math.abs(p.x) <= 7));
  }

  function randomSpec(type, opts, seed) {
    const r = rng(seed || (Date.now() % 2147483647));
    opts = opts || {};
    for (let tries = 0; tries < 6000; tries++) {
      let spec = null;
      if (type === 'line') {
        const m = pick(r, [0.5, -0.5, 1, -1, 2, -2, 1.5, -1.5, 1 / 3, -1 / 3, 3, -3, 0.25]);
        const t = Math.round(r() * 8 - 4);
        const x1 = Math.round(r() * 6 - 3), x2 = x1 + pick(r, [2, 3, 4]);
        const y1 = m * x1 + t, y2 = m * x2 + t;
        if (niceness(y1) > 0 || niceness(y2) > 0) continue;
        spec = { type, conds: [{ kind: 'point', x: fmt(x1), y: fmt(y1) }, { kind: 'point', x: fmt(x2), y: fmt(y2) }] };
        return spec;
      }
      if (type === 'parabola') {
        const p = Math.round(r() * 8 - 5), q = p + pick(r, [2, 4, 6]);
        const a = pick(r, [0.5, -0.5, 1, -1, 0.25, -0.25, 2, -2]);
        const xs = (p + q) / 2, ys = -a * ((q - p) / 2) ** 2;
        if (Math.abs(ys) > 8 || niceness(ys) > 0.6) continue;
        return { type, conds: [{ kind: 'zero', x: fmt(p), m: 1 }, { kind: 'zero', x: fmt(q), m: 1 }, { kind: 'vertex', x: fmt(xs), y: fmt(ys) }] };
      }
      if (type === 'poly' && tries < 4500) {
        const deg = opts.degree && opts.degree !== 'auto' ? +opts.degree : pick(r, [3, 3, 4]);
        const sym = opts.sym || 'none';
        // zwei Wege: schöne Nullstellen (Linearfaktoren) oder schöne Extremstellen (f′ in Linearfaktoren, dann aufleiten)
        const crit = sym === 'odd' || r() < 0.4;
        if (crit) {
          const cr = [];
          if (sym === 'odd') { if (deg % 2 === 0) continue; for (let i = 0; i < (deg - 1) / 2; i++) { const z = pick(r, [1, 2, 3]); cr.push(z, -z); } }
          else if (sym === 'even') { if (deg % 2) continue; cr.push(0); for (let i = 0; i < (deg - 2) / 2; i++) { const z = pick(r, [1, 2, 3]); cr.push(z, -z); } }
          else for (let i = 0; i < deg - 1; i++) cr.push(Math.round(r() * 6 - 3));
          const a = pick(r, [1, -1, 0.5, -0.5, 0.25, -0.25, 1.5, -1.5, 3, -3]);
          const d1 = polyFromRoots(RF, cr.map(x => ({ x, m: 1 }))).map(v => v * a);
          const c = [sym === 'odd' ? 0 : Math.round(r() * 6 - 3)].concat(d1.map((v, j) => v / (j + 1)));
          const model = linModel({ w: 'poly' }, c);
          // schnelle Vorprüfung: Funktionswerte an den kritischen Stellen
          if (cr.some(x => niceness(model.f(x)) > 1.1 || Math.abs(model.f(x)) > 9)) continue;
          const feats = features(model, -7, 7, 500);
          // zuerst alles schön; später dürfen Wendepunkte irrational sein (sie werden dann keine Vorgabe)
          const strict = tries < 2500;
          const key = feats.filter(p => p.type !== 'zero' && (strict || p.type !== 'inflect'));
          if (!key.some(p => p.type === 'max' || p.type === 'min' || p.type === 'terrace')) continue;
          if (!allNice(key, strict ? 0.6 : 1.1)) continue;
          // Nullstellen und Wendepunkte nur übernehmen, wenn sie schön sind
          const nice = feats.filter(p => (p.type !== 'zero' && p.type !== 'inflect') || (niceness(p.x) <= 1.1 && niceness(p.y) <= 1.1));
          spec = { type, degree: opts.degree || 'auto', sym, conds: featsToConds(nice) };
          const chk = generate(spec);
          if (chk.error || !chk.ok || chk.free.length || chk.degree !== deg) continue;
          return spec;
        }
        // Nullstellen mit Vielfachheiten, ganzzahlig
        let roots = [];
        if (sym === 'even') {
          const k = deg / 2;
          if (deg % 2) continue;
          for (let i = 0; i < Math.floor(k); i++) { const z = pick(r, [1, 2, 3]); roots.push(z, -z); }
          if (k % 1) continue;
        } else if (sym === 'odd') {
          if (deg % 2 === 0) continue;
          roots.push(0);
          for (let i = 0; i < (deg - 1) / 2; i++) { const z = pick(r, [1, 2, 3]); roots.push(z, -z); }
        } else {
          let left = deg;
          while (left > 0) {
            const m = Math.min(left, pick(r, [1, 1, 1, 2, 2, 3]));
            roots.push(...new Array(m).fill(Math.round(r() * 8 - 4)));
            left -= m;
          }
        }
        const a = pick(r, deg >= 4 ? [0.25, -0.25, 0.5, -0.5, 1 / 8, -1 / 8, 1, -1] : [0.25, -0.25, 0.5, -0.5, 1, -1, 1 / 3, -1 / 3]);
        let c = polyFromRoots(RF, roots.map(x => ({ x, m: 1 }))).map(v => v * a);
        if (opts.shift !== false && r() < 0.25) c[0] += Math.round(r() * 4 - 2);
        const model = linModel({ w: 'poly' }, c);
        const feats = features(model, -7, 7, 500);
        const ex = feats.filter(p => p.type === 'max' || p.type === 'min').length;
        if (deg >= 3 && ex + feats.filter(p => p.type === 'terrace').length === 0) continue;
        const strict = tries < 2500;
        if (!allNice(feats.filter(p => strict || p.type !== 'inflect'), strict ? 0.6 : 1.1)) continue;
        if (feats.length < 3) continue;
        spec = { type, degree: opts.degree || 'auto', sym, conds: featsToConds(feats.filter(p => p.type !== 'inflect' || (niceness(p.x) <= 1.1 && niceness(p.y) <= 1.1))) };
        const chk = generate(spec);
        if (chk.error || !chk.ok || chk.free.length || chk.degree !== deg) continue;
        return spec;
      }
      if (type === 'poly' && tries >= 4500) {
        // Notlösung (z. B. Grad 5): schöne Nullstellen und ein Punkt; Extrema dürfen „krumm“ sein
        const deg = opts.degree && opts.degree !== 'auto' ? +opts.degree : 3;
        const sym = opts.sym || 'none';
        const roots = sym === 'odd' ? [0] : [];
        while (roots.length < deg) {
          const z = Math.round(r() * 8 - 4);
          if (sym === 'odd' || sym === 'even') { if (z > 0 && !roots.includes(z)) roots.push(z, -z); }
          else if (!roots.includes(z)) roots.push(z);
        }
        if (roots.length !== deg) continue;
        const a = pick(r, [0.25, -0.25, 0.5, -0.5, 1 / 8, -1 / 8, 0.1, -0.1]);
        const c = polyFromRoots(RF, roots.map(x => ({ x, m: 1 }))).map(v => v * a);
        const x0 = [-1, 1, 2, -2, 3].find(x => !roots.includes(x) && niceness(polyEval(c, x)) <= 0.6 && Math.abs(polyEval(c, x)) <= 9);
        if (x0 === undefined) continue;
        spec = { type, degree: opts.degree || 'auto', sym, conds: roots.map(x => ({ kind: 'zero', x: fmt(x), m: 1 })).concat([{ kind: 'point', x: fmt(x0), y: fmt(polyEval(c, x0)) }]) };
        const chk = generate(spec);
        if (chk.error || !chk.ok || chk.free.length) continue;
        return spec;
      }
      if (type === 'rational') {
        const np = pick(r, [1, 1, 2]);
        const poles = [];
        while (poles.length < np) { const x = Math.round(r() * 6 - 3); if (!poles.includes(x)) poles.push(x); }
        const asymKind = pick(r, ['zero', 'h', 'h', 'o']);
        const nz = asymKind === 'zero' ? np - 1 : asymKind === 'h' ? np : np + 1;
        const zeros = [];
        let guard = 0;
        while (zeros.length < Math.min(nz, 2) && guard++ < 30) { const x = Math.round(r() * 8 - 4); if (!poles.includes(x) && !zeros.includes(x)) zeros.push(x); }
        const conds = poles.map(x => ({ kind: 'pole', x: fmt(x), m: pick(r, [1, 1, 2]) })).concat(zeros.map(x => ({ kind: 'zero', x: fmt(x), m: 1 })));
        const asym = { kind: asymKind };
        if (asymKind === 'h') asym.c = fmt(pick(r, [1, 2, -1, 0.5, -2]));
        if (asymKind === 'o') { asym.m = fmt(pick(r, [0.5, 1, -1, 2])); asym.t = fmt(Math.round(r() * 4 - 2)); }
        spec = { type, conds, asym };
        let g = generate(spec);
        if (g.error || !g.ok) continue;
        if (g.free.length) {
          // Streckfaktor über einen schönen Punkt festlegen
          const x = Math.round(r() * 6 - 3);
          if (poles.includes(x) || zeros.includes(x)) continue;
          const y = g.model.f(x);
          if (niceness(y) > 0.6 || Math.abs(y) > 6 || y === 0) continue;
          spec.conds.push({ kind: 'point', x: fmt(x), y: fmt(y) });
          g = generate(spec);
          if (g.error || !g.ok || g.free.length) continue;
        }
        return spec;
      }
      if (type === 'exp') {
        const form = opts.expForm || 'base';
        const c = Math.round(r() * 4 - 2);
        const a = pick(r, [1, 2, 3, -1, -2, 0.5]);
        if (form === 'base') {
          const b = pick(r, [2, 3, 0.5, 1.5, 1 / 3]);
          return { type, expForm: form, asymC: fmt(c), conds: [{ kind: 'point', x: '0', y: fmt(a + c) }, { kind: 'point', x: '1', y: fmt(a * b + c) }] };
        }
        const k = pick(r, [1, -1, 0.5, -0.5, 2]);
        return { type, expForm: form, asymC: fmt(c), conds: [{ kind: 'point', x: '0', y: fmt(a + c) }, { kind: 'slope', x: '0', y: fmt(a * k) }] };
      }
      if (type === 'expoly') {
        const k = pick(r, [-1, -1, -0.5, 1]);
        const deg = pick(r, [1, 1, 2]);
        const roots = [];
        for (let i = 0; i < deg; i++) roots.push(Math.round(r() * 6 - 2));
        const a = pick(r, [1, -1, 2, 0.5]);
        const c = polyFromRoots(RF, roots.map(x => ({ x, m: 1 }))).map(v => v * a);
        const model = linModel({ w: 'exp', k }, c);
        const feats = features(model, -6, 8);
        const ext = feats.filter(p => p.type === 'max' || p.type === 'min');
        if (!ext.length || ext.some(p => niceness(p.x) > 0.6)) continue;
        const conds = featsToConds(feats.filter(p => p.type === 'zero')).concat(ext.map(p => ({ kind: p.type, x: fmt(p.x), y: '' })));
        if (Math.abs(polyEval(c, 0)) > 0) conds.push({ kind: 'point', x: '0', y: fmt(polyEval(c, 0)) });
        else conds.push({ kind: 'point', x: '1', y: String(+(model.f(1)).toPrecision(6)) });
        spec = { type, k: fmt(k), conds };
        const g = generate(spec);
        if (g.error || !g.ok || g.free.length) continue;
        return spec;
      }
      if (type === 'sine') {
        const a = pick(r, [1, 2, 3, 0.5, 1.5]);
        const per = pick(r, ['2pi', 'pi', '4pi', '2', '4', '6', '8']);
        const P = num(per.replace(/^(\d*)pi$/, (m, k) => (k || '1') + '*pi'));
        const d = pick(r, [0, 0, 1, -1, 2]);
        const xH = pick(r, [P / 4, 0, P / 2]);
        const fx = (v) => (/pi/.test(per) ? piStr(v).replace(/\*/g, '') : fmt(v));
        return { type, trig: 'sin', conds: [{ kind: 'max', x: fx(xH), y: fmt(d + a) }, { kind: 'min', x: fx(xH + P / 2), y: fmt(d - a) }] };
      }
    }
    return null;
  }

  return { Fr, parseFr, solve, generate, randomSpec, features, niceness, polyStr, factorStr, num, KIND_NAMES, QF, RF };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = GraphGen;
