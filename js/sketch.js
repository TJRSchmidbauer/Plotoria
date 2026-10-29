// Plotoria 3.1 – Skizzen- und Prüfmodus
// Freihand skizzieren (Maus, Stift, Finger); als Lösung markierte Graphen bleiben verborgen,
// bis „Lösung zeigen“ sie einblendet – dann zeigt ein Toleranzschlauch, wie gut die Skizze passt.
(() => {
  const P = window.Plotoria;
  const $ = id => document.getElementById(id);
  const OK = '#34C759', BAD = '#FF3B30';

  Object.assign(P, {
    sketches: [], reveal: false,

    initSketch() {
      this.sketches = [];
      this.liveLayer = this.svg.append('g').attr('class', 'sketch-live').attr('pointer-events', 'none');
      const E = this.els;
      Object.assign(E, { sketchCtl: $('sketch-ctl'), solBtn: $('sol-toggle'), solText: $('sol-toggle-text'), checkRes: $('check-result') });
      this.penCol = null;   // null = Stiftfarbe des Farbthemas
      E.sketchCtl.querySelectorAll('[data-pen]').forEach(b => b.addEventListener('click', () => {
        this.penCol = b.dataset.pen === 'auto' ? null : b.dataset.pen;
        this._syncSketchCtl();
      }));
      $('sketch-undo').addEventListener('click', () => this.undoStroke());
      $('sketch-clear').addEventListener('click', () => this.clearSketches());
      E.solBtn.addEventListener('click', () => this.toggleReveal());
      document.addEventListener('keydown', (e) => {
        const tag = (e.target.tagName || '').toLowerCase();
        if (e.ctrlKey || e.metaKey || e.altKey || /^(input|textarea|select)$/.test(tag) || e.target.isContentEditable || document.querySelector('dialog[open]')) return;
        if (e.key.toLowerCase() === 'l' && this.fns.some(f => f.sol)) { e.preventDefault(); this.toggleReveal(); }
      });
      this._syncSketchCtl();
      this._syncSolution();
    },

    _penColor() { return this.penCol || (this._theme().dark ? '#F2F2F7' : '#1C1C1E'); },

    _syncSketchCtl() {
      const E = this.els;
      if (!E.sketchCtl) return;
      E.sketchCtl.hidden = this.tool !== 'sketch';
      E.sketchCtl.querySelectorAll('[data-pen]').forEach(b => b.classList.toggle('active', (b.dataset.pen === 'auto' ? null : b.dataset.pen) === this.penCol));
      $('sketch-undo').disabled = $('sketch-clear').disabled = !this.sketches.length;
    },

    // ── Zeichnen mit dem Stift ──
    _sketchDown(e) {
      const [mx, my] = this._localPoint(e);
      if (mx < this.PL || mx > this.PR || my < this.PT || my > this.PB) return false;
      this._stroke = { c: this._penColor(), w: 3, px: [[mx, my]] };
      this._drawLive();
      return true;
    },

    _sketchMove(e) {
      const s = this._stroke;
      if (!s) return;
      // gebündelte Ereignisse (Stift mit hoher Abtastrate) mitnehmen
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (evs.length ? evs : [e]).forEach(ev => {
        const [mx, my] = this._localPoint(ev);
        const last = s.px[s.px.length - 1];
        if (Math.hypot(mx - last[0], my - last[1]) >= 1.5) s.px.push([mx, my]);
      });
      this._drawLive();
    },

    _sketchUp() {
      const s = this._stroke;
      this._stroke = null;
      this.liveLayer.selectAll('*').remove();
      if (!s || s.px.length < 2) return;
      const p = [];
      s.px.forEach(([mx, my]) => p.push(+this.xs.invert(mx).toPrecision(6), +this.ys.invert(my).toPrecision(6)));
      this.sketches.push({ c: s.c, w: s.w, p });
      this._syncSketchCtl();
      this._syncSolution();
      this.repaint();
      this.commit();
    },

    _sketchCancel() {
      this._stroke = null;
      if (this.liveLayer) this.liveLayer.selectAll('*').remove();
    },

    _drawLive() {
      const s = this._stroke;
      this.liveLayer.selectAll('*').remove();
      if (!s) return;
      const d = s.px.length === 1 ? `M${s.px[0][0]},${s.px[0][1]}l0.01,0` : 'M' + s.px.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
      this.liveLayer.append('path').attr('d', d).attr('fill', 'none').attr('stroke', s.c).attr('stroke-width', s.w)
        .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
    },

    undoStroke() {
      if (!this.sketches.length) return;
      this.sketches.pop();
      this._syncSketchCtl(); this._syncSolution(); this.repaint(); this.commit();
    },

    clearSketches() {
      if (!this.sketches.length) return;
      this.sketches = [];
      this._syncSketchCtl(); this._syncSolution(); this.repaint(); this.commit();
      this._toast('Skizzen gelöscht – Strg+Z holt sie zurück');
    },

    // ── Lösung zeigen / verbergen ──
    toggleReveal(on) {
      this.reveal = on === undefined ? !this.reveal : !!on;
      this.sync();
      if (this.syncObjects) this.syncObjects();
      this._syncSolution();
      this.repaint();
      if (this._tableOn && this.renderTable) this.renderTable();
    },

    _syncSolution() {
      const E = this.els;
      if (!E.solBtn) return;
      const has = this.fns.some(f => f.sol);
      E.solBtn.hidden = !has;
      E.solBtn.classList.toggle('on', this.reveal);
      E.solBtn.setAttribute('aria-pressed', this.reveal);
      E.solText.textContent = this.reveal ? 'Lösung verbergen' : 'Lösung zeigen';
      E.solBtn.querySelector('.icon') && (E.solBtn.querySelector('.icon').outerHTML = Icons.svg(this.reveal ? 'eyeOff' : 'eye'));
      this._syncSketchCtl();
    },

    // Auswertung der Skizze gegen die eingeblendeten Lösungsgraphen
    _renderCheck(r) {
      const E = this.els;
      if (!E.checkRes) return;
      E.checkRes.hidden = !r;
      if (!r) return;
      const q = (v) => Math.round(v * 100) + ' %';
      E.checkRes.innerHTML = '<span class="check-dot" style="background:' + (r.hit >= 0.75 && r.cover >= 0.6 ? OK : r.hit >= 0.5 ? '#FF9500' : BAD) + '"></span>'
        + '<span><strong>' + q(r.hit) + '</strong> der Skizze im Toleranzbereich · <strong>' + q(r.cover) + '</strong> von ' + P.esc(r.names) + ' nachgezeichnet</span>';
      E.checkRes.title = 'Toleranz ± ' + Math.round(r.tol) + ' Pixel (grüner Schlauch). Grün gezeichnete Teile der Skizze liegen im Schlauch, rote außerhalb.';
    },

    // Lösungsgraphen als Polylinien in Bildschirmkoordinaten (je Pixelspalte)
    _solutionCurves() {
      const out = [];
      this.fns.filter(f => f.sol && this._isShown(f) && f.f).forEach(fn => {
        const fs = fn.members ? fn.members.map(m => m.f) : [fn.f];
        fs.forEach(f => {
          const cols = [];
          for (let cx = Math.floor(this.PL); cx <= Math.ceil(this.PR); cx++) {
            const y = f(this.xs.invert(cx));
            const py = isFinite(y) ? this.ys(y) : NaN;
            cols.push(isFinite(py) && py > this.PT - 400 && py < this.PB + 400 ? py : NaN);
          }
          out.push({ fn, x0: Math.floor(this.PL), cols });
        });
      });
      return out;
    },

    _tolerance() { return Math.max(10, 0.045 * (this.PB - this.PT)); },

    _evaluateSketch() {
      const curves = this._solutionCurves();
      if (!curves.length) return null;
      const tol = this._tolerance();
      // Abstand eines Punktes zur Kurve (über die Strecken zwischen benachbarten Pixelspalten)
      const dist = (c, sx, sy, mark) => {
        let best = Infinity;
        const i0 = Math.max(0, Math.floor(sx - tol) - c.x0), i1 = Math.min(c.cols.length - 2, Math.ceil(sx + tol) - c.x0);
        for (let i = i0; i <= i1; i++) {
          const ya = c.cols[i], yb = c.cols[i + 1];
          if (!isFinite(ya) || !isFinite(yb)) continue;
          const ax = c.x0 + i, dx = 1, dy = yb - ya;
          const t = Math.max(0, Math.min(1, ((sx - ax) * dx + (sy - ya) * dy) / (dx * dx + dy * dy)));
          const d = Math.hypot(sx - ax - t * dx, sy - ya - t * dy);
          if (d < best) best = d;
          if (mark && d <= tol) { mark[i] = 1; mark[i + 1] = 1; }
        }
        return best;
      };
      const marks = curves.map(() => []);
      let len = 0, hitLen = 0;
      const segs = [];
      this.sketches.forEach(sk => {
        const pts = [];
        for (let k = 0; k + 1 < sk.p.length; k += 2) pts.push([this.xs(sk.p[k]), this.ys(sk.p[k + 1])]);
        const ok = pts.map(([sx, sy]) => {
          let best = Infinity;
          curves.forEach((c, ci) => { best = Math.min(best, dist(c, sx, sy, marks[ci])); });
          return best <= tol;
        });
        for (let k = 1; k < pts.length; k++) {
          const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
          const inPlot = pts[k][0] >= this.PL && pts[k][0] <= this.PR && pts[k][1] >= this.PT && pts[k][1] <= this.PB;
          if (!inPlot) continue;
          const good = ok[k] && ok[k - 1];
          len += l; if (good) hitLen += l;
          segs.push({ a: pts[k - 1], b: pts[k], good });
        }
      });
      // Abdeckung: Anteil der sichtbaren Lösungskurve, der nachgezeichnet wurde
      let vis = 0, cov = 0;
      curves.forEach((c, ci) => c.cols.forEach((py, i) => {
        if (!isFinite(py) || py < this.PT || py > this.PB) return;
        vis++; if (marks[ci][i]) cov++;
      }));
      const names = [...new Set(curves.map(c => c.fn.letter))].map(l => l.replace(/'/g, '′')).join(', ');
      return { hit: len ? hitLen / len : 0, cover: vis ? cov / vis : 0, tol, segs, curves, names };
    },

    // Toleranzschlauch unter den Graphen (nur Bildschirm, mit eingeblendeter Lösung)
    paintSketchBand() {
      this._ev = null;
      if (this.rc) return;
      this._ev = this.reveal && this.sketches.length ? this._evaluateSketch() : null;
      this._renderCheck(this._ev);
      const ev = this._ev;
      if (!ev) return;
      const g = this.root.append('g').attr('class', 'sketch-band').attr('clip-path', this._clipUrl());
      ev.curves.forEach(c => {
        let d = '', pen = false;
        c.cols.forEach((py, i) => {
          if (!isFinite(py)) { pen = false; return; }
          d += (pen ? 'L' : 'M') + (c.x0 + i) + ',' + py.toFixed(1); pen = true;
        });
        g.append('path').attr('d', d).attr('fill', 'none').attr('stroke', OK).attr('stroke-opacity', 0.16)
          .attr('stroke-width', 2 * ev.tol).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
      });
    },

    paintSketch() {
      const rc = this.rc;
      if (!this.sketches.length || (rc && rc.sketch === false)) return;
      const g = this.root.append('g').attr('class', 'sketches').attr('clip-path', this._clipUrl());
      const bw = rc ? rc.bw : this.style.bw;
      // Auf dem Bildschirm mit eingeblendeter Lösung: Skizze grün (im Schlauch) bzw. rot
      const ev = !rc ? this._ev : null;
      if (ev) {
        ev.segs.forEach(s => {
          g.append('line').attr('x1', s.a[0]).attr('y1', s.a[1]).attr('x2', s.b[0]).attr('y2', s.b[1])
            .attr('stroke', s.good ? OK : BAD).attr('stroke-width', 3.2).attr('stroke-linecap', 'round');
        });
        return;
      }
      this.sketches.forEach(sk => {
        const pts = [];
        for (let k = 0; k + 1 < sk.p.length; k += 2) pts.push(this.xs(sk.p[k]).toFixed(1) + ',' + this.ys(sk.p[k + 1]).toFixed(1));
        if (pts.length < 2) return;
        g.append('path').attr('d', 'M' + pts.join('L')).attr('fill', 'none')
          .attr('stroke', bw ? '#000000' : (rc && rc.lightOverride && /^#F2F2F7$/i.test(sk.c) ? '#1C1C1E' : sk.c))
          .attr('stroke-width', sk.w || 3).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
      });
    },

    _tikzSketches() {
      return this.sketches.map(s => ({ c: /^#F2F2F7$/i.test(s.c) ? '#1C1C1E' : s.c, w: s.w, p: s.p }));
    },
  });
})();
