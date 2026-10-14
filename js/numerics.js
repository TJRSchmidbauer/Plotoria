// Plotoria Numerik: exakte Werte, Regression, Messwerte, Asymptoten, PNG-Auflösung.
// Reine Funktionen ohne DOM – in Node testbar (tests/numerics.test.js).
const Numerics = (() => {
  const MINUS = '−';

  // ── Exakte Werte erkennen: 0,3333 → 1/3, 1,4142 → √2, 1,5708 → π/2, 2,4142 → 1 + √2 ──
  const SQUAREFREE = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23, 26, 29, 30];

  function near(a, b, v) { return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(v)); }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }

  function rational(v, maxDen = 12) {
    for (let q = 1; q <= maxDen; q++) {
      const p = Math.round(v * q);
      if (near(p / q, v, v) && Math.abs(p) <= 1e6) {
        const g = gcd(p, q) || 1;
        return { p: p / g, q: q / g };
      }
    }
    return null;
  }

  const sgn = (n) => (n < 0 ? MINUS : '');
  function frac(num, q, neg) {
    // num ist bereits ein formatierter Zähler (ohne Vorzeichen)
    if (q === 1) return (neg ? MINUS : '') + num;
    return (neg ? MINUS : '') + num + '/' + q;
  }
  function coefRoot(a, n) { return (a === 1 ? '' : String(a)) + '√' + n; }

  function exact(v) {
    if (!isFinite(v)) return null;
    if (Math.abs(v) < 1e-12) return '0';
    const r = rational(v);
    if (r) return r.q === 1 ? sgn(r.p) + Math.abs(r.p) : frac(Math.abs(r.p), r.q, r.p < 0);

    // Vielfache von π
    const rp = rational(v / Math.PI);
    if (rp && Math.abs(rp.p) <= 24) {
      const num = (Math.abs(rp.p) === 1 ? '' : Math.abs(rp.p)) + 'π';
      return frac(num, rp.q, rp.p < 0);
    }

    // a·√n / q
    for (const n of SQUAREFREE) {
      const rs = rational(v / Math.sqrt(n), 6);
      if (rs && Math.abs(rs.p) <= 12) return frac(coefRoot(Math.abs(rs.p), n), rs.q, rs.p < 0);
    }

    // (a + b·√n) / q, z. B. Nullstellen quadratischer Gleichungen
    for (const n of SQUAREFREE) {
      const s = Math.sqrt(n);
      for (let q = 1; q <= 4; q++) {
        for (let b = -8; b <= 8; b++) {
          if (!b) continue;
          const a = v * q - b * s;
          const ai = Math.round(a);
          if (ai === 0 || Math.abs(ai) > 50 || !near(ai, a, v * q)) continue;
          const g = gcd(gcd(ai, b), q);
          const A = ai / g, B = b / g, Q = q / g;
          const body = A + (B < 0 ? ' ' + MINUS + ' ' : ' + ') + coefRoot(Math.abs(B), n);
          const s0 = String(body).replace(/^-/, MINUS);
          return Q === 1 ? s0 : '(' + s0 + ')/' + Q;
        }
      }
    }
    return null;
  }

  // ── Lineares Gleichungssystem (Gauß mit Pivotsuche) ──
  function solve(A, y) {
    const n = y.length;
    const M = A.map((row, i) => [...row, y[i]]);
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      if (Math.abs(M[piv][c]) < 1e-14) return null;
      [M[c], M[piv]] = [M[piv], M[c]];
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const k = M[r][c] / M[c][c];
        for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
      }
    }
    return M.map((row, i) => row[n] / row[i]);
  }

  // Polynom-Regression: Koeffizienten [a0, a1, …] für a0 + a1·x + …
  function polyfit(pts, deg) {
    if (pts.length <= deg) return null;
    const A = [], y = [];
    for (let i = 0; i <= deg; i++) {
      A.push([]);
      for (let j = 0; j <= deg; j++) A[i].push(pts.reduce((s, p) => s + Math.pow(p[0], i + j), 0));
      y.push(pts.reduce((s, p) => s + p[1] * Math.pow(p[0], i), 0));
    }
    return solve(A, y);
  }

  function rSquared(pts, f) {
    const mean = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    let ssTot = 0, ssRes = 0;
    pts.forEach(([x, y]) => { ssTot += (y - mean) ** 2; ssRes += (y - f(x)) ** 2; });
    return ssTot === 0 ? (ssRes === 0 ? 1 : 0) : 1 - ssRes / ssTot;
  }

  // Koeffizient für die Termdarstellung runden (4 gültige Stellen)
  const round4 = (v) => (Math.abs(v) < 1e-12 ? 0 : +v.toPrecision(4));
  function numStr(v) { return String(round4(v)); }

  function polyTerm(c) {
    const parts = [];
    for (let i = c.length - 1; i >= 0; i--) {
      const a = round4(c[i]);
      if (a === 0) continue;
      const abs = Math.abs(a);
      const coef = i > 0 && abs === 1 ? '' : String(abs);
      const xp = i === 0 ? '' : i === 1 ? 'x' : 'x^' + i;
      const mul = coef && xp ? '*' : '';
      parts.push({ neg: a < 0, s: coef + mul + xp });
    }
    if (!parts.length) return '0';
    return parts.map((p, k) => (k === 0 ? (p.neg ? '-' : '') + p.s : (p.neg ? ' - ' : ' + ') + p.s)).join('');
  }

  // type: 'linear' | 'quadratic' | 'cubic' | 'exponential' | 'power'
  function regression(pts, type) {
    pts = pts.filter(p => isFinite(p[0]) && isFinite(p[1]));
    const deg = { linear: 1, quadratic: 2, cubic: 3 }[type];
    if (deg) {
      const c = polyfit(pts, deg);
      if (!c) return { error: 'Zu wenige Messwerte für diese Regression' };
      const f = (x) => c.reduce((s, a, i) => s + a * Math.pow(x, i), 0);
      return { term: polyTerm(c), r2: rSquared(pts, f), f };
    }
    if (type === 'exponential') {
      if (pts.some(p => p[1] <= 0)) return { error: 'Exponentielle Regression braucht y > 0' };
      const c = polyfit(pts.map(([x, y]) => [x, Math.log(y)]), 1);
      if (!c) return { error: 'Zu wenige Messwerte für diese Regression' };
      const a = Math.exp(c[0]), b = c[1];
      const f = (x) => a * Math.exp(b * x);
      return { term: numStr(a) + '*e^(' + numStr(b) + '*x)', r2: rSquared(pts, f), f };
    }
    if (type === 'power') {
      if (pts.some(p => p[0] <= 0 || p[1] <= 0)) return { error: 'Potenz-Regression braucht x > 0 und y > 0' };
      const c = polyfit(pts.map(([x, y]) => [Math.log(x), Math.log(y)]), 1);
      if (!c) return { error: 'Zu wenige Messwerte für diese Regression' };
      const a = Math.exp(c[0]), b = c[1];
      const f = (x) => a * Math.pow(x, b);
      return { term: numStr(a) + '*x^(' + numStr(b) + ')', r2: rSquared(pts, f), f };
    }
    return { error: 'Unbekannter Regressionstyp' };
  }

  // ── Messwerte aus Text (Excel, LibreOffice, Hand) ──
  // Spalten durch Tab, Semikolon oder Leerzeichen; Dezimalkomma erlaubt.
  // Zwei Zeilen mit vielen Werten (Tabelle „quer“) werden automatisch erkannt.
  function parseData(text) {
    const rows = String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(line => {
      const cells = /[\t;]/.test(line) ? line.split(/[\t;]/) : line.split(/\s+/);
      return cells.map(c => c.trim()).filter(c => c !== '').map(c => {
        const t = c.replace(/\s/g, '');
        // 1.234,5 → 1234.5 ; 0,5 → 0.5
        const norm = /,\d*$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t;
        return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(norm) ? parseFloat(norm) : NaN;
      });
    });
    const numeric = rows.map(r => r.filter(v => isFinite(v)));
    let pts = [];
    const wide = numeric.filter(r => r.length > 2);
    if (wide.length >= 2 && numeric.filter(r => r.length).length === 2) {
      const [xs, ys] = numeric.filter(r => r.length);
      for (let i = 0; i < Math.min(xs.length, ys.length); i++) pts.push([xs[i], ys[i]]);
    } else {
      rows.forEach(r => { if (r.length >= 2 && isFinite(r[0]) && isFinite(r[1])) pts.push([r[0], r[1]]); });
    }
    return pts;
  }

  // ── Asymptoten ──
  // Waagrechte bzw. schiefe Asymptote für x → +∞ (side = 1) oder −∞ (side = -1)
  function obliqueAsymptote(f, side) {
    const est = (X) => {
      const a = f(side * X), b = f(side * 2 * X);
      if (!isFinite(a) || !isFinite(b)) return null;
      const m = (b - a) / (side * X);
      return { m, b: a - m * side * X };
    };
    const e1 = est(1e4), e2 = est(1e5), e3 = est(1e6);
    if (!e1 || !e2 || !e3) return null;
    const close = (u, v, tol) => Math.abs(u - v) <= tol * Math.max(1, Math.abs(v));
    if (!close(e2.m, e3.m, 1e-3) || !close(e2.b, e3.b, 1e-2) || !close(e1.b, e3.b, 0.2)) return null;
    let m = e3.m, b = e3.b;
    if (Math.abs(m) < 1e-6) m = 0;
    // Werte glätten (z. B. 0,99999 → 1)
    const r = (v) => { const q = snap(v, 1e-4); return q !== null ? q : +v.toPrecision(4); };
    m = r(m); b = r(b);
    // Ist der Graph selbst eine Gerade, ist das keine Asymptote
    const g = (x) => f(x) - (m * x + b);
    if ([0.5, 1.5, 3].every(x => { const d = g(x); return isFinite(d) && Math.abs(d) < 1e-9; })) return null;
    return { m, b };
  }

  // Näherungsweise rationaler Wert (für gerundete Grenzwerte wie 0,99999 → 1)
  function snap(v, tol) {
    for (let q = 1; q <= 12; q++) {
      const p = Math.round(v * q);
      if (Math.abs(v - p / q) <= tol * Math.max(1, Math.abs(v))) return p / q;
    }
    for (let q = 1; q <= 12; q++) {
      const p = Math.round(v / Math.PI * q);
      if (p && Math.abs(v - p / q * Math.PI) <= tol * Math.max(1, Math.abs(v))) return p / q * Math.PI;
    }
    return null;
  }

  // Strebt |f| bei Annäherung an x0 (von einer Seite) gegen ∞? Erkennt auch ln-Wachstum.
  function diverges(f, x0) {
    for (const s of [-1, 1]) {
      const [a, b, c] = [1e-3, 1e-6, 1e-9].map(h => Math.abs(f(x0 + s * h * Math.max(1, Math.abs(x0)))));
      if ([a, b, c].some(Number.isNaN)) continue;
      if (c === Infinity) { if (b === Infinity || b > a) return true; continue; }   // Überlauf, z. B. e^(1/x)
      if (b > a && c > b && c - b >= 0.5 * (b - a) && c > 3) return true;
    }
    return false;
  }

  // Senkrechte Asymptoten (Polstellen) im Intervall [a, b]
  function verticalAsymptotes(f, a, b, samples = 800) {
    const dx = (b - a) / samples;
    const X = [], Y = [];
    for (let i = 0; i <= samples; i++) { X.push(a + i * dx); Y.push(f(X[i])); }
    const fin = (y) => isFinite(y);
    const cands = [];
    for (let i = 1; i <= samples; i++) {
      const y0 = Y[i - 1], y1 = Y[i];
      if (fin(y0) !== fin(y1)) cands.push(['edge', X[i - 1], X[i]]);
      else if (fin(y0) && y0 * y1 < 0) cands.push(['sign', X[i - 1], X[i]]);
      if (i < samples && [Y[i - 1], Y[i], Y[i + 1]].every(fin)) {
        const m = Math.abs(Y[i]);
        if (m > 1 && m > 20 * Math.abs(Y[i - 1]) && m > 20 * Math.abs(Y[i + 1])) cands.push(['peak', X[i - 1], X[i + 1]]);
      }
    }
    const out = [];
    cands.forEach(([type, L0, H0]) => {
      let L = L0, H = H0;
      if (type === 'sign') {
        let fl = f(L);
        for (let k = 0; k < 80; k++) {
          const m = (L + H) / 2, fm = f(m);
          if (!fin(fm)) { L = H = m; break; }
          if (fl * fm < 0) H = m; else { L = m; fl = fm; }
        }
      } else if (type === 'edge') {
        const fL = fin(f(L));
        for (let k = 0; k < 80; k++) {
          const m = (L + H) / 2;
          if (fin(f(m)) === fL) L = m; else H = m;
        }
      } else {
        // Goldener Schnitt: Maximum von |f| suchen
        const g = (x) => { const y = Math.abs(f(x)); return fin(y) ? y : Infinity; };
        const r = (Math.sqrt(5) - 1) / 2;
        let c = H - r * (H - L), d = L + r * (H - L);
        for (let k = 0; k < 100; k++) {
          if (g(c) > g(d)) { H = d; d = c; c = H - r * (H - L); }
          else { L = c; c = d; d = L + r * (H - L); }
        }
      }
      let x0 = (L + H) / 2;
      // glatten Wert in der Nähe bevorzugen (auch bei Überlauf wie e^(1/x) bei x ≈ 0,0014)
      const sn = snap(x0, 1e-7);
      if (sn !== null) x0 = sn;
      else {
        for (let q = 1; q <= 12; q++) {
          const c = Math.round(x0 * q) / q;
          if (Math.abs(c - x0) < dx && diverges(f, c)) { x0 = c; break; }
        }
      }
      x0 += 0;   // −0 → 0
      if (!out.some(v => Math.abs(v - x0) < dx) && diverges(f, x0)) out.push(x0);
    });
    return out.sort((u, v) => u - v);
  }

  // ── PNG: Auflösung (pHYs-Chunk) setzen, damit Word die Druckgröße kennt ──
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function pngWithDpi(buf, dpi) {
    const src = new Uint8Array(buf);
    const ppm = Math.round(dpi / 0.0254);
    const chunk = new Uint8Array(21);
    const dv = new DataView(chunk.buffer);
    dv.setUint32(0, 9);
    chunk.set([0x70, 0x48, 0x59, 0x73], 4);   // "pHYs"
    dv.setUint32(8, ppm); dv.setUint32(12, ppm); chunk[16] = 1;
    dv.setUint32(17, crc32(chunk.subarray(4, 17)));
    // Signatur (8) + IHDR (25); vorhandenen pHYs-Chunk entfernen
    const out = [src.subarray(0, 33), chunk];
    let p = 33;
    while (p < src.length) {
      const len = new DataView(src.buffer, src.byteOffset + p).getUint32(0);
      const type = String.fromCharCode(...src.subarray(p + 4, p + 8));
      if (type !== 'pHYs') out.push(src.subarray(p, p + 12 + len));
      p += 12 + len;
    }
    const total = out.reduce((s, a) => s + a.length, 0);
    const res = new Uint8Array(total);
    let o = 0;
    out.forEach(a => { res.set(a, o); o += a.length; });
    return res;
  }

  return { exact, rational, polyfit, regression, parseData, obliqueAsymptote, verticalAsymptotes, pngWithDpi, crc32 };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Numerics;
