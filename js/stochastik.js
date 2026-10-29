// Plotoria 3.1 – Stochastik: Binomialverteilung (Histogramm) und Normalverteilung (Dichte)
// mit markiertem Bereich und Wahrscheinlichkeit, z. B. P(X ≤ 4) oder P(85 ≤ X ≤ 115).
(() => {
  const MP = MathParser;
  const P = window.Plotoria;
  const { esc, fmtDE, niceStep } = P;
  const $ = id => document.getElementById(id);
  const N = Numerics;

  const MAX_N = 1000;
  // Wahrscheinlichkeit mit vier Nachkommastellen: 0,2375
  const fmtP = (v) => {
    if (!isFinite(v)) return '–';
    const r = Math.round(v * 1e4) / 1e4;
    return r.toFixed(4).replace('.', ',');
  };
  const relP = (v) => (v === 0 || v === 1 ? ' = ' : ' ≈ ') + fmtP(v);
  const num = (s) => {
    const t = String(s).trim().replace(/[−–]/g, '-').replace(/(\d),(\d)/g, '$1.$2');
    if (!t) return NaN;
    try { return MP.evalConst(t); } catch (e) { return NaN; }
  };
  const fmtNum = (v) => fmtDE(v, 6);

  // Argumente in B(…) / N(…): „20; 0,3“ oder „20, 0.3“, auch „n = 20; p = 0,3“
  function splitArgs(s) {
    let parts = s.includes(';') ? s.split(';') : s.split(/,\s+|,(?=\s*[a-zA-Zμσ])/);
    if (parts.length === 1 && (s.match(/,/g) || []).length === 1) parts = s.split(',');
    return parts.map(p => p.trim().replace(/^(?:n|p|μ|mu|σ|sigma|s)\s*=\s*/i, ''));
  }

  // „P(X ≤ 4)“, „P(2 ≤ X ≤ 5)“, „P(X > 3)“, „P(X = 2)“ → { a, b } (null = offen)
  function parseInterval(s, discrete) {
    const t = s.replace(/<=/g, '≤').replace(/>=/g, '≥').replace(/\s+/g, '');
    const m = t.match(/^P\((?:([^≤<]+)(≤|<))?[A-Z](?:(≤|<|≥|>|=)(.+))?\)$/);
    if (!m) return null;
    let a = null, b = null;
    const step = discrete ? 1 : 0;
    if (m[1] !== undefined) { a = num(m[1]); if (!isFinite(a)) return null; if (m[2] === '<') a += step; }
    if (m[3]) {
      const v = num(m[4]);
      if (!isFinite(v)) return null;
      if (m[3] === '=') { if (a !== null) return null; a = b = v; }
      else if (m[3] === '≤') b = v;
      else if (m[3] === '<') b = v - step;
      else { if (a !== null) return null; a = m[3] === '≥' ? v : v + step; }
    }
    return { a, b };
  }

  Object.assign(P, {
    dists: [],

    initDists() {
      this.dists = [];
      const E = this.els;
      Object.assign(E, { distGroup: $('dist-group'), distList: $('dist-list'), dnType: $('dn-type') });
      this._dnType = 'binom';
      this.segmented(E.dnType, (v) => { this._dnType = v; this._syncDistForm(); });
      $('dn-add').addEventListener('click', () => this.addDistFromForm());
      ['dn-n', 'dn-p', 'dn-mu', 'dn-sigma'].forEach(id => $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.addDistFromForm(); } }));
      this._syncDistForm();
    },

    _syncDistForm() {
      document.querySelectorAll('[data-dist]').forEach(r => { r.hidden = r.dataset.dist !== this._dnType; });
    },

    addDistFromForm() {
      const o = this._dnType === 'binom'
        ? { type: 'binom', n: num($('dn-n').value), p: num($('dn-p').value) }
        : { type: 'normal', mu: num($('dn-mu').value), sigma: num($('dn-sigma').value) };
      const err = this._distError(o);
      if (err) { this._toast(err); return; }
      this.addDist(o);
      this.switchTab('algebra');
    },

    _distError(o) {
      if (o.type === 'binom') {
        if (!(o.n >= 1 && o.n <= MAX_N && Math.abs(o.n - Math.round(o.n)) < 1e-9)) return 'n muss eine natürliche Zahl von 1 bis ' + MAX_N + ' sein';
        if (!(o.p >= 0 && o.p <= 1)) return 'p muss zwischen 0 und 1 liegen';
      } else {
        if (!isFinite(o.mu)) return 'μ muss eine Zahl sein';
        if (!(o.sigma > 0)) return 'σ muss größer als 0 sein';
      }
      return null;
    },

    // Eingabezeile: „X ~ B(20; 0,3)“, „X ~ N(100; 15)“, optional „; P(X ≤ 4)“
    checkDistDef(raw) {
      const s = String(raw).trim();
      const m = s.match(/^([A-Z])\s*[~∼]\s*(B|N)\s*\(([^()]*)\)\s*(?:[;,]?\s*(P\s*\(.*\)))?$/);
      if (!m) return null;
      const args = splitArgs(m[3]);
      if (args.length !== 2) return { error: m[2] === 'B' ? 'Schreibweise: X ~ B(n; p), z. B. X ~ B(20; 0,3)' : 'Schreibweise: X ~ N(μ; σ), z. B. X ~ N(100; 15)' };
      const o = m[2] === 'B' ? { type: 'binom', n: num(args[0]), p: num(args[1]) } : { type: 'normal', mu: num(args[0]), sigma: num(args[1]) };
      o.name = m[1];
      const err = this._distError(o);
      if (err) return { error: err };
      if (m[4]) {
        const iv = parseInterval(m[4], o.type === 'binom');
        if (!iv) return { error: 'Bereich nicht erkannt – z. B. P(X ≤ 4) oder P(2 ≤ X ≤ 5)' };
        o.a = iv.a; o.b = iv.b;
      }
      const d = this._distDefaults(o);
      const pv = this._distPLabel(d);
      return {
        dist: o,
        preview: (o.type === 'binom' ? 'Binomialverteilung: n = ' + fmtNum(o.n) + ', p = ' + fmtNum(o.p) : 'Normalverteilung: μ = ' + fmtNum(o.mu) + ', σ = ' + fmtNum(o.sigma)) + (pv ? ' · ' + pv : ''),
      };
    },

    addDistDef(c) { this.addDist(c.dist); return {}; },

    _distDefaults(o) {
      return { name: 'X', a: null, b: null, showP: true, sigmaLines: false, approx: false, vis: true, col: '#007AFF', n: 10, p: 0.5, mu: 0, sigma: 1, ...o };
    },

    addDist(o) {
      const cols = this._theme().colors || this.COLORS;
      const d = this._distDefaults({ col: cols[this.dists.length % cols.length], ...o });
      d.id = this.nextId++;
      this.dists.push(d);
      this.fitDist(d, true);
      this.syncDists();
      this.repaint();
      this.commit();
      return d;
    },

    removeDist(id) {
      this.dists = this.dists.filter(d => d.id !== id);
      this.syncDists(); this.repaint(); this.commit();
    },

    // Kennwerte μ, σ
    _distStats(d) {
      if (d.type === 'binom') return { mu: d.n * d.p, sigma: Math.sqrt(d.n * d.p * (1 - d.p)) };
      return { mu: d.mu, sigma: d.sigma };
    },

    _pmf(d) {
      const key = d.n + '|' + d.p;
      if (!d._pmf || d._pmfKey !== key) { d._pmf = N.binomPmf(d.n, d.p); d._pmfKey = key; }
      return d._pmf;
    },

    _distProb(d) {
      if (d.a == null && d.b == null) return null;
      if (d.type === 'binom') return N.binomProb(d.n, d.p, d.a, d.b);
      const lo = d.a == null ? 0 : N.normCdf(d.a, d.mu, d.sigma), hi = d.b == null ? 1 : N.normCdf(d.b, d.mu, d.sigma);
      return Math.max(0, hi - lo);
    },

    // „P(X ≤ 4) ≈ 0,2375“
    _distPLabel(d) {
      const p = this._distProb(d);
      if (p === null) return '';
      const X = d.name || 'X', f = (v) => fmtNum(v);
      let s;
      if (d.a != null && d.b != null) s = d.a === d.b ? X + ' = ' + f(d.a) : f(d.a) + ' ≤ ' + X + ' ≤ ' + f(d.b);
      else if (d.a != null) s = X + ' ≥ ' + f(d.a);
      else s = X + ' ≤ ' + f(d.b);
      return 'P(' + s + ')' + relP(p);
    },

    _distTeX(d) {
      const n = (v) => fmtNum(v).replace(',', '{,}').replace('−', '-');
      return (d.name || 'X') + ' \\sim ' + (d.type === 'binom' ? 'B(' + n(d.n) + ';\\,' + n(d.p) + ')' : '\\mathcal{N}(' + n(d.mu) + ';\\,' + n(d.sigma) + ')');
    },

    // Fenster passend zur Verteilung wählen; Achsentitel nur ändern, wenn sie noch auf x/y stehen
    fitDist(d, labels) {
      const { mu, sigma } = this._distStats(d);
      let x0, x1, top;
      if (d.type === 'binom') {
        const pmf = this._pmf(d);
        const s = Math.max(sigma, 0.5);
        x0 = Math.max(-1, Math.floor(mu - 4.5 * s) - 1); x1 = Math.min(d.n + 1, Math.ceil(mu + 4.5 * s) + 1);
        top = Math.max(...pmf);
      } else {
        x0 = mu - 4 * sigma; x1 = mu + 4 * sigma;
        top = N.normPdf(mu, mu, sigma);
      }
      const others = this.dists.filter(o => o !== d && o.vis);
      others.forEach(o => {
        const st = this._distStats(o);
        x0 = Math.min(x0, st.mu - 4 * st.sigma); x1 = Math.max(x1, st.mu + 4 * st.sigma);
        top = Math.max(top, o.type === 'binom' ? Math.max(...this._pmf(o)) : N.normPdf(st.mu, st.mu, st.sigma));
      });
      const yMax = Math.ceil(top * 1.3 / niceStep(top / 4)) * niceStep(top / 4);
      this.proportional = false;
      if (labels && this.style.xLabel === 'x' && this.style.yLabel === 'y') {
        if (d.type === 'binom') { this.style.xLabel = 'k'; this.style.yLabel = 'P(' + (d.name || 'X') + ' = k)'; }
        else this.style.yLabel = 'φ(x)';
      }
      this.setView({ xMin: x0, xMax: x1, yMin: -yMax * 0.1, yMax }, { home: true });
      this._syncControls();
    },

    // ── Zeichnen ──
    paintDists() {
      const list = this.dists.filter(d => d.vis);
      if (!list.length) return;
      const g = this.root.append('g').attr('class', 'dists');
      const clip = g.append('g').attr('clip-path', this._clipUrl());
      const bw = this._ctx().bw;
      const fs = this.style.fontSize;
      const xs = this.xs, ys = this.ys;
      const [d0, d1] = xs.domain();
      const y0 = ys(0);
      const inside = (d, k) => (d.a == null || k >= d.a - 1e-9) && (d.b == null || k <= d.b + 1e-9) && (d.a != null || d.b != null);
      const curve = (mu, sigma, lo, hi) => {
        const a = Math.max(lo, d0), b = Math.min(hi, d1);
        if (!(b > a)) return null;
        const n = Math.max(2, Math.ceil(xs(b) - xs(a)));
        const pts = [];
        for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; pts.push([xs(x), ys(N.normPdf(x, mu, sigma))]); }
        return pts;
      };
      const path = (pts) => 'M' + pts.map(p => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join('L');
      list.forEach(d => {
        const col = bw ? '#000000' : d.col;
        const { mu, sigma } = this._distStats(d);
        let peak = 0, regionTop = 0, regionX = null;
        if (d.type === 'binom') {
          const pmf = this._pmf(d);
          const k0 = Math.max(0, Math.floor(d0 - 1)), k1 = Math.min(d.n, Math.ceil(d1 + 1));
          const w = Math.abs(xs(1) - xs(0));
          const reg = [];
          for (let k = k0; k <= k1; k++) {
            const p = pmf[k], on = inside(d, k);
            peak = Math.max(peak, p);
            if (on) { reg.push(k); regionTop = Math.max(regionTop, p); }
            const x = xs(k - 0.5), y = ys(p);
            const r = clip.append('rect').attr('x', x).attr('y', Math.min(y, y0)).attr('width', w).attr('height', Math.abs(y0 - y));
            if (bw) r.attr('fill', on ? this._hatchUrl() : '#FFFFFF');
            else r.attr('fill', col).attr('fill-opacity', on ? 0.62 : (d.a == null && d.b == null ? 0.38 : 0.13));
            if (w > 3) r.attr('stroke', col).attr('stroke-width', 1).attr('stroke-opacity', on || bw ? 1 : 0.55);
          }
          if (reg.length) regionX = (reg[0] + reg[reg.length - 1]) / 2;
          if (d.approx && sigma > 0) {
            const pts = curve(mu, sigma, -Infinity, Infinity);
            if (pts) clip.append('path').attr('d', path(pts)).attr('fill', 'none').attr('stroke', bw ? '#000' : (d.col.toUpperCase() === '#FF3B30' ? '#007AFF' : '#FF3B30'))
              .attr('stroke-width', 2.2).attr('stroke-dasharray', '7,5');
          }
        } else {
          peak = N.normPdf(mu, mu, sigma);
          if (d.a != null || d.b != null) {
            const lo = d.a == null ? -Infinity : d.a, hi = d.b == null ? Infinity : d.b;
            const pts = curve(mu, sigma, lo, hi);
            if (pts) {
              const area = path(pts) + `L${pts[pts.length - 1][0].toFixed(2)},${y0.toFixed(2)}L${pts[0][0].toFixed(2)},${y0.toFixed(2)}Z`;
              clip.append('path').attr('d', area).attr('fill', bw ? this._hatchUrl() : col).attr('fill-opacity', bw ? 1 : 0.28).attr('stroke', 'none');
              const a = Math.max(lo, mu - 5 * sigma), b = Math.min(hi, mu + 5 * sigma);
              regionX = (a + b) / 2;
              regionTop = N.normPdf(Math.min(Math.max(mu, a), b), mu, sigma);
              // Ränder des Bereichs
              [d.a, d.b].forEach(v => {
                if (v == null) return;
                clip.append('line').attr('x1', xs(v)).attr('x2', xs(v)).attr('y1', y0).attr('y2', ys(N.normPdf(v, mu, sigma)))
                  .attr('stroke', col).attr('stroke-width', 1.4);
              });
            }
          }
          const pts = curve(mu, sigma, -Infinity, Infinity);
          if (pts) clip.append('path').attr('d', path(pts)).attr('fill', 'none').attr('stroke', col).attr('stroke-width', 2.6).attr('stroke-linejoin', 'round');
        }
        // Erwartungswert und Standardabweichung
        if (d.sigmaLines && sigma > 0) {
          const h = d.type === 'normal' ? null : peak * 1.08;
          [[mu, 'μ', null], [mu - sigma, 'μ − σ', '5,4'], [mu + sigma, 'μ + σ', '5,4']].forEach(([x, lab, dash]) => {
            const yt = ys(h === null ? N.normPdf(x, mu, sigma) : h);
            clip.append('line').attr('x1', xs(x)).attr('x2', xs(x)).attr('y1', y0).attr('y2', yt)
              .attr('stroke', bw ? '#000' : '#8E8E93').attr('stroke-width', 1.3).attr('stroke-dasharray', dash);
            if (xs(x) > this.PL && xs(x) < this.PR) this._halo(g.append('text').attr('x', xs(x)).attr('y', Math.max(this.PT + fs, yt - 6))
              .attr('text-anchor', 'middle').attr('font-size', fs * 0.85).attr('font-style', 'italic').attr('fill', bw ? '#000' : '#636366')).text(lab);
          });
        }
        // Wahrscheinlichkeit über dem markierten Bereich
        const lab = d.showP && this._distPLabel(d);
        if (lab && regionX !== null) {
          const lx = Math.min(Math.max(xs(regionX), this.PL + 80), this.PR - 80);
          const yTop = d.type === 'binom' ? regionTop : regionTop;
          const ly = Math.max(this.PT + fs + 4, Math.min(ys(yTop) - 10, ys(peak) - 10 - (d.sigmaLines ? fs : 0)));
          this._halo(g.append('text').attr('x', lx).attr('y', ly).attr('text-anchor', 'middle')
            .attr('font-size', fs * 1.05).attr('font-weight', '650').attr('fill', col)).text(lab);
        }
      });
    },

    // Wert unter dem Zeiger: P(X = k) bzw. φ(x)
    _hoverDist(mx, my) {
      const x = this.xs.invert(mx);
      for (const d of this.dists) {
        if (!d.vis) continue;
        if (d.type === 'binom') {
          const k = Math.round(x);
          if (k < 0 || k > d.n) continue;
          const p = this._pmf(d)[k];
          if (my >= this.ys(p) - 12 && my <= this.ys(0) + 4) return 'P(' + (d.name || 'X') + ' = ' + k + ')' + relP(p) + '   P(' + (d.name || 'X') + ' ≤ ' + k + ')' + relP(N.binomProb(d.n, d.p, null, k));
        } else {
          const y = N.normPdf(x, d.mu, d.sigma);
          if (Math.abs(this.ys(y) - my) < 12) return 'φ(' + fmtDE(x) + ') ≈ ' + fmtDE(y, 5) + '   P(' + (d.name || 'X') + ' ≤ ' + fmtDE(x) + ')' + relP(N.normCdf(x, d.mu, d.sigma));
        }
      }
      return null;
    },

    // ── TikZ ──
    _tikzDists(b) {
      return this.dists.filter(d => d.vis).map(d => {
        const st = this._distStats(d);
        const o = { type: d.type, col: d.col, mu: st.mu, sigma: st.sigma, a: d.a, b: d.b, approx: d.approx, sigmaLines: d.sigmaLines };
        const lab = d.showP ? this._distPLabel(d) : '';
        if (d.type === 'binom') {
          const pmf = this._pmf(d);
          o.bars = [];
          for (let k = Math.max(0, Math.floor(b.xMin)); k <= Math.min(d.n, Math.ceil(b.xMax)); k++) {
            const on = (d.a != null || d.b != null) && (d.a == null || k >= d.a) && (d.b == null || k <= d.b);
            o.bars.push({ k, p: pmf[k], on });
          }
          o.peak = Math.max(...pmf);
          const reg = o.bars.filter(r => r.on);
          if (lab && reg.length) o.label = { x: (reg[0].k + reg[reg.length - 1].k) / 2, y: Math.min(Math.max(...reg.map(r => r.p)) + o.peak * 0.06, b.yMax - (b.yMax - b.yMin) * 0.06), text: lab };
        } else {
          o.peak = N.normPdf(st.mu, st.mu, st.sigma);
          if (lab) {
            const a = Math.max(d.a == null ? -Infinity : d.a, st.mu - 4 * st.sigma), c = Math.min(d.b == null ? Infinity : d.b, st.mu + 4 * st.sigma);
            o.label = { x: (a + c) / 2, y: Math.min(N.normPdf(Math.min(Math.max(st.mu, a), c), st.mu, st.sigma) + o.peak * 0.06, b.yMax - (b.yMax - b.yMin) * 0.06), text: lab };
          }
        }
        return o;
      });
    },

    // ── Tabelle P(X = k), P(X ≤ k) ──
    _distTable(d) {
      const pmf = this._pmf(d);
      const { mu, sigma } = this._distStats(d);
      let k0 = 0, k1 = d.n;
      if (d.n > 40) { k0 = Math.max(0, Math.floor(mu - 4 * sigma)); k1 = Math.min(d.n, Math.ceil(mu + 4 * sigma)); }
      const X = d.name || 'X', rows = [];
      let cum = 0;
      for (let k = 0; k < k0; k++) cum += pmf[k];
      for (let k = k0; k <= k1; k++) { cum += pmf[k]; rows.push([k, fmtP(pmf[k]), fmtP(Math.min(1, cum))]); }
      const cell = 'border:1px solid #000;padding:3px 10px;text-align:center;font-family:Calibri,Arial,sans-serif;font-size:11pt';
      const head = ['k', 'P(' + X + ' = k)', 'P(' + X + ' ≤ k)'];
      const html = (forPrint) => '<table style="border-collapse:collapse"><tr>' + head.map(h => `<th style="${forPrint ? '' : cell + ';font-weight:bold;background:#f2f2f2'}">${esc(h)}</th>`).join('') + '</tr>'
        + rows.map(r => '<tr>' + r.map(v => `<td style="${forPrint ? '' : cell}">${esc(v)}</td>`).join('') + '</tr>').join('') + '</table>';
      const text = [head.join('\t')].concat(rows.map(r => r.join('\t'))).join('\n');
      return { html, text, caption: 'Binomialverteilung n = ' + fmtNum(d.n) + ', p = ' + fmtNum(d.p) };
    },

    copyDistTable(d) {
      const t = this._distTable(d), html = t.html(false);
      if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([t.text], { type: 'text/plain' }),
        })]).then(() => this._toast('Tabelle kopiert – in Word mit Strg+V einfügen'))
          .catch(() => this._copy(t.text, 'Tabelle als Text kopiert'));
      } else this._copy(t.text, 'Tabelle als Text kopiert');
    },

    distTableToPrint(d) {
      const t = this._distTable(d);
      if (this.addPrintItem) this.addPrintItem({ kind: 'table', html: t.html(true), caption: t.caption });
    },

    // ── Liste in der Seitenleiste ──
    syncDists() {
      const list = this.els.distList;
      if (!list) return;
      const open = new Set([...list.querySelectorAll('.item.open')].map(e => +e.dataset.id));
      list.innerHTML = '';
      this.els.distGroup.hidden = !this.dists.length;
      this.dists.forEach(d => list.appendChild(this._distItem(d, open.has(d.id))));
    },

    _distItem(d, open) {
      const item = document.createElement('div'); item.className = 'item' + (open ? ' open' : ''); item.dataset.id = d.id;
      const row = document.createElement('div'); row.className = 'item-row';
      const dot = document.createElement('label'); dot.className = 'color-dot' + (d.vis ? '' : ' off'); dot.style.background = d.col; dot.title = 'Farbe';
      const cp = document.createElement('input'); cp.type = 'color'; cp.value = d.col;
      cp.addEventListener('input', () => { d.col = cp.value; dot.style.background = d.col; this.repaint(); });
      cp.addEventListener('change', () => this.commit());
      dot.appendChild(cp);
      const main = document.createElement('div'); main.className = 'item-main';
      const t = document.createElement('div'); t.className = 'item-title';
      this._renderTeX(t, this._distTeX(d), (d.name || 'X') + ' ~ ' + (d.type === 'binom' ? 'B(' + d.n + '; ' + d.p + ')' : 'N(' + d.mu + '; ' + d.sigma + ')'));
      const { mu, sigma } = this._distStats(d);
      const sub = document.createElement('div'); sub.className = 'item-sub';
      const pl = this._distPLabel(d);
      sub.textContent = 'μ = ' + fmtDE(mu, 4) + ', σ ' + (Math.abs(sigma - +sigma.toFixed(4)) < 1e-12 ? '= ' : '≈ ') + fmtDE(sigma, 4) + (pl ? '\n' + pl : '');
      main.append(t, sub);
      main.title = 'Klicken für Einstellungen';
      main.addEventListener('click', () => item.classList.toggle('open'));
      const acts = document.createElement('div'); acts.className = 'item-actions';
      const eye = document.createElement('button'); eye.className = 'icon-btn'; eye.innerHTML = Icons.svg(d.vis ? 'eye' : 'eyeOff');
      eye.title = d.vis ? 'Ausblenden' : 'Einblenden';
      eye.addEventListener('click', () => { d.vis = !d.vis; this.syncDists(); this.repaint(); this.commit(); });
      const dis = document.createElement('button'); dis.className = 'icon-btn disclose'; dis.innerHTML = Icons.svg('chevron'); dis.title = 'Einstellungen';
      dis.addEventListener('click', () => item.classList.toggle('open'));
      acts.append(eye, dis);
      row.append(dot, main, acts);
      item.append(row, this._distDetail(d));
      return item;
    },

    _distDetail(d) {
      const det = document.createElement('div'); det.className = 'item-detail';
      const changed = () => { this.syncDists(); this.repaint(); this.commit(); };
      const field = (val, ph, w) => { const i = document.createElement('input'); i.type = 'text'; i.className = 'field field-mono'; i.value = val == null ? '' : fmtNum(val); i.placeholder = ph; i.style.width = (w || 70) + 'px'; return i; };
      const typ = this._miniSeg([['binom', 'Binomial', 'Binomialverteilung B(n; p)'], ['normal', 'Normal', 'Normalverteilung N(μ; σ)']], d.type, (v) => {
        if (v === d.type) return;
        const st = this._distStats(d);
        if (v === 'normal') Object.assign(d, { type: 'normal', mu: +st.mu.toPrecision(6), sigma: +Math.max(st.sigma, 0.1).toPrecision(4), approx: false });
        else Object.assign(d, { type: 'binom', n: 20, p: 0.5 });
        d.a = d.b = null;
        this.fitDist(d); changed();
      });
      this._detailRow(det, 'Verteilung', typ);
      const param = (label, key, check) => {
        const i = field(d[key], '', 80);
        i.addEventListener('change', () => {
          const v = num(i.value), o = { ...d, [key]: v };
          const err = check(o);
          if (err) { this._toast(err); i.value = fmtNum(d[key]); return; }
          d[key] = key === 'n' ? Math.round(v) : v;
          changed();
        });
        this._detailRow(det, label, i);
      };
      if (d.type === 'binom') {
        param('n (Anzahl der Versuche)', 'n', (o) => this._distError(o));
        param('p (Trefferwahrscheinlichkeit)', 'p', (o) => this._distError(o));
      } else {
        param('μ (Erwartungswert)', 'mu', (o) => this._distError(o));
        param('σ (Standardabweichung)', 'sigma', (o) => this._distError(o));
      }
      // markierter Bereich
      const pair = document.createElement('div'); pair.className = 'pair';
      const a = field(d.a, '−∞', 62), b = field(d.b, '+∞', 62);
      const s = document.createElement('span'); s.textContent = '≤ ' + (d.name || 'X') + ' ≤';
      pair.append(a, s, b);
      const apply = () => {
        const va = a.value.trim() === '' ? null : num(a.value), vb = b.value.trim() === '' ? null : num(b.value);
        if ((va !== null && !isFinite(va)) || (vb !== null && !isFinite(vb))) { this._toast('Bitte Zahlen eingeben oder leer lassen'); return; }
        if (va !== null && vb !== null && vb < va) { this._toast('Die untere Grenze muss kleiner sein als die obere'); return; }
        d.a = va; d.b = vb; changed();
      };
      [a, b].forEach(el => el.addEventListener('change', apply));
      this._detailRow(det, 'Bereich markieren', pair).title = 'Leer lassen für −∞ bzw. +∞, z. B. nur „bis 4“ für P(X ≤ 4)';
      const sw = (label, key, title) => {
        const c = document.createElement('input'); c.type = 'checkbox'; c.className = 'switch'; c.checked = !!d[key];
        c.addEventListener('change', () => { d[key] = c.checked; changed(); });
        this._detailRow(det, label, c).title = title || '';
      };
      sw('Wahrscheinlichkeit anzeigen', 'showP');
      sw('μ und μ ± σ markieren', 'sigmaLines', 'Erwartungswert und Standardabweichung als Linien');
      if (d.type === 'binom') sw('Normalverteilung darüberlegen', 'approx', 'Näherung mit μ = n·p und σ = √(n·p·(1 − p))');
      const nm = field(d.name || 'X', 'X', 40); nm.maxLength = 1;
      nm.addEventListener('change', () => { const v = nm.value.trim(); if (!/^[A-Z]$/.test(v)) { this._toast('Ein Großbuchstabe, z. B. X oder Y'); nm.value = d.name || 'X'; return; } d.name = v; changed(); });
      this._detailRow(det, 'Name der Zufallsgröße', nm);

      const acts = document.createElement('div'); acts.className = 'detail-actions';
      const act = (html, title, cb, cls) => { const bt = document.createElement('button'); bt.className = 'btn btn-sm ' + (cls || 'btn-gray'); bt.innerHTML = html; bt.title = title; bt.addEventListener('click', cb); acts.appendChild(bt); return bt; };
      act('Fenster anpassen', 'Ausschnitt passend zur Verteilung wählen', () => { this.fitDist(d); this.repaint(); this.commit(); });
      if (d.type === 'binom') {
        act(Icons.svg('copy') + 'Tabelle für Word', 'Tabelle mit P(X = k) und P(X ≤ k) kopieren', () => this.copyDistTable(d));
        act(Icons.svg('print') + 'Tabelle zum Druckbogen', 'Tabelle mit P(X = k) und P(X ≤ k) auf den Druckbogen', () => this.distTableToPrint(d));
      }
      const del = act(Icons.svg('trash') + 'Löschen', 'Verteilung löschen', () => this.removeDist(d.id));
      del.style.color = 'var(--red)';
      det.appendChild(acts);
      return det;
    },
  });

  // für Tests
  P._parseInterval = parseInterval;
})();
