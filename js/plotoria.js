(() => {
  const $ = id => document.getElementById(id);
  const MP = MathParser;

  const COLORS = ['#0066DD', '#DD2200', '#1EA84C', '#E68A00', '#8B3FAD', '#3399CC', '#CC0044', '#4444AA'];
  const STORAGE_KEY = 'plotoria-state-v1';
  const DEFAULT_VIEW = { xMin: -4, xMax: 5, yMin: -10, yMax: 10 };
  const DEFAULT_STYLE = { gridWidth: 1, gridColor: '#D2D2D2', axisWidth: 2, axisColor: '#222222', fontSize: 14, labelSize: 18, xLabel: 'x', yLabel: 'y', gridStep: 1 };

  // Zahlen deutsch formatieren: 1,25 statt 1.25
  const fmtDE = (v, digits = 3) => {
    if (!isFinite(v)) return '–';
    if (Math.abs(v) < 1e-10) return '0';
    const a = Math.abs(v);
    if (a >= 1e6 || a < 1e-3) return v.toExponential(2).replace('.', ',');
    return String(parseFloat(v.toFixed(digits))).replace('.', ',');
  };
  const decimalsOf = (step) => {
    for (let d = 0; d < 10; d++) if (Math.abs(step * Math.pow(10, d) - Math.round(step * Math.pow(10, d))) < 1e-9) return d;
    return 10;
  };
  const niceStep = (raw) => {
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const letterTeX = (l) => l.replace(/^([a-zA-Z])(\d+)/, '$1_{$2}');

  function bisect(f, a, b) {
    let fa = f(a), fb = f(b);
    if (!isFinite(fa) || !isFinite(fb) || fa * fb > 0) return null;
    if (fa === 0) return a;
    if (fb === 0) return b;
    for (let i = 0; i < 60; i++) {
      const m = (a + b) / 2, fm = f(m);
      if (!isFinite(fm)) return null;
      if (fm === 0 || (b - a) < 1e-12 * Math.max(1, Math.abs(m))) return m;
      if (fa * fm < 0) { b = m; fb = fm; } else { a = m; fa = fm; }
    }
    return (a + b) / 2;
  }

  const numDeriv = (f, order) => {
    if (order === 1) return (x) => { const h = 1e-6 * Math.max(1, Math.abs(x)); return (f(x + h) - f(x - h)) / (2 * h); };
    return (x) => { const h = 1e-4 * Math.max(1, Math.abs(x)); return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h); };
  };

  window.Plotoria = {
    fns: [], ci: 0, nextId: 1,
    ...DEFAULT_VIEW,
    home: { ...DEFAULT_VIEW },
    pad: { l: 55, r: 35, t: 35, b: 55 },
    style: { ...DEFAULT_STYLE },
    params: {}, paramMeta: {},
    integral: null, smartLabels: false, selectionMode: false, selectionRect: null,
    proportional: true, graphTitle: '', tangent: null, tangentMode: false,
    deg: false, theme: 'standard', labelOffsets: {},
    hist: [], histPos: -1,

    init() {
      this.svg = d3.select('#graph-container');
      this.defs = this.svg.append('defs');
      this.clipRect = this.defs.append('clipPath').attr('id', 'plot-clip').append('rect');
      this.root = this.svg.append('g');
      this.overlay = this.svg.append('g').attr('class', 'hover-overlay').attr('pointer-events', 'none');
      this.curT = d3.zoomIdentity;

      this.zoom = d3.zoom().scaleExtent([1e-4, 1e5])
        .filter((e) => !this.selectionMode && (!e.button || e.type === 'wheel') && !(this.tangentMode && e.type === 'dblclick'))
        .on('zoom', (e) => {
          this.curT = e.transform;
          this.xs = this.curT.rescaleX(this.baseX);
          this.ys = this.curT.rescaleY(this.baseY);
          this.repaint();
        })
        .on('end', () => this._scheduleSave());
      this.svg.call(this.zoom);

      this.els = {
        inp: $('func-input'), err: $('input-error'), prev: $('input-preview'),
        lst: $('func-list'), emp: $('empty-state'),
        crd: $('coord-display'), tza: $('tikz-area'), tim: $('tikz-import'),
        tex: $('tikz-export'), sex: $('svg-export'), rst: $('reset-view'),
        cib: $('close-integral'), sel: $('select-rect'), tan: $('tangent-btn'),
        atp: $('btn-add-top'), stp: $('svg-export-top'), apply: $('apply-view'),
        png: $('png-export'), cpy: $('copy-image'), cpyTop: $('copy-image-top'),
        shr: $('share-link'), shrTop: $('share-link-top'),
        gridW: $('set-grid-width'), gridC: $('set-grid-color'),
        axisW: $('set-axis-width'), axisC: $('set-axis-color'),
        fontS: $('set-font-size'), gridStep: $('set-grid-step'),
        xminI: $('set-xmin'), xmaxI: $('set-xmax'),
        yminI: $('set-ymin'), ymaxI: $('set-ymax'),
        xlabI: $('set-xlabel'), ylabI: $('set-ylabel'),
        prop: $('set-proportional'), theme: $('theme-select'),
        smart: $('smart-labels'),
        pList: $('param-list'), pAdd: $('add-param'), pName: $('param-name-input'), pVal: $('param-value-input'),
        hTitle: $('header-title'), examples: $('examples'), angle: $('angle-mode'),
        undo: $('undo-btn'), redo: $('redo-btn'), help: $('help-btn'),
        modal: $('help-modal'), modalClose: $('help-close'),
        tblStart: $('tbl-start'), tblEnd: $('tbl-end'), tblStep: $('tbl-step'),
        tblGen: $('tbl-generate'), tblCsv: $('tbl-csv'), tbl: $('value-table'),
      };
      const E = this.els;

      E.atp.addEventListener('click', () => this.addFunc());
      E.inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); this.addFunc(); }
        if (e.key === 'Escape') { E.inp.value = ''; this._showInputState(); }
      });
      E.inp.addEventListener('input', () => {
        clearTimeout(this._pt);
        this._pt = setTimeout(() => this._showInputState(), 150);
      });
      E.tim.addEventListener('click', () => this.importTikZ());
      E.tex.addEventListener('click', () => this.exportTikZ());
      E.sex.addEventListener('click', () => this.exportSVG());
      E.stp.addEventListener('click', () => this.exportSVG());
      E.png.addEventListener('click', () => this.exportPNG());
      E.cpy.addEventListener('click', () => this.copyImage());
      E.cpyTop.addEventListener('click', () => this.copyImage());
      E.shr.addEventListener('click', () => this.shareLink());
      E.shrTop.addEventListener('click', () => this.shareLink());
      E.rst.addEventListener('click', () => this.resetView());
      E.sel.addEventListener('click', () => this.toggleSelection());
      E.tan.addEventListener('click', () => this.toggleTangent());
      E.cib.addEventListener('click', () => this._hideIntegral());
      E.apply.addEventListener('click', () => this.applyView());
      E.prop.addEventListener('change', () => {
        this.proportional = E.prop.checked;
        if (this.proportional) { this._takeCurrentView(); this._applyProportional(); this._rebuildView(); }
        this.commit();
      });
      E.smart.addEventListener('change', () => { this.smartLabels = E.smart.checked; this.repaint(); this.commit(); });
      E.theme.addEventListener('change', () => { this.applyTheme(E.theme.value); this.commit(); });
      E.pAdd.addEventListener('click', () => this.addParam());
      E.pName.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.addParam(); } });
      E.hTitle.addEventListener('input', () => { this.graphTitle = E.hTitle.value.trim(); this.repaint(); });
      E.hTitle.addEventListener('change', () => this.commit());
      E.examples.addEventListener('change', () => {
        const v = E.examples.value;
        E.examples.value = '';
        if (v) this.addFunc(v);
      });
      E.angle.addEventListener('click', () => this.setAngleMode(!this.deg));
      E.undo.addEventListener('click', () => this.undo());
      E.redo.addEventListener('click', () => this.redo());
      E.help.addEventListener('click', () => this.toggleHelp(true));
      E.modalClose.addEventListener('click', () => this.toggleHelp(false));
      E.modal.addEventListener('click', (e) => { if (e.target === E.modal) this.toggleHelp(false); });
      E.tblGen.addEventListener('click', () => { this._tableOn = true; this.renderTable(); });
      E.tblCsv.addEventListener('click', () => this.exportCSV());

      const svgNode = this.svg.node();
      svgNode.addEventListener('pointermove', (e) => {
        if (this.selectionMode) this._selMove(e);
        else this.pointerMove(e);
      });
      svgNode.addEventListener('pointerdown', (e) => {
        if (this.tangentMode && e.button === 0) { this._tangentClick(e); return; }
        if (this.selectionMode && e.button === 0) { svgNode.setPointerCapture(e.pointerId); this._selDown(e); }
      });
      svgNode.addEventListener('pointerup', () => { if (this.selectionMode) this._selUp(); });
      svgNode.addEventListener('pointerleave', () => {
        this.overlay.selectAll('*').remove();
        this.els.crd.classList.remove('visible');
      });
      svgNode.addEventListener('dblclick', (e) => {
        if (this.selectionMode && this.selectionRect) { e.preventDefault(); this.zoomToSelection(); }
      });

      document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => this.switchTab(tab)));
      document.addEventListener('keydown', (e) => this._onKey(e));

      window.addEventListener('resize', () => {
        clearTimeout(this._rt);
        this._rt = setTimeout(() => this.resize(), 80);
      });

      const st = this._loadStartupState();
      setTimeout(() => {
        this._measure();
        if (st) this.load(st);
        else { this._applyProportional(); this.home = this._viewObj(); this.buildScales(); this.rebuild(); this.sync(); this.syncParams(); }
        this._syncControls();
        this.repaint();
        this.commit();
        E.inp.focus();
      }, 50);
    },

    switchTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const pane = document.getElementById('tab-' + tab.dataset.tab);
      if (pane) pane.classList.add('active');
      if (tab.dataset.tab === 'table') this.renderTable();
    },

    // ══════════════════ Zustand, Undo/Redo, Speichern ══════════════════

    serialize() {
      const idx = new Map(this.fns.map((f, i) => [f.id, i]));
      const v = this._viewObj(true);
      return {
        v: 1, title: this.graphTitle, deg: this.deg, theme: this.theme, smart: this.smartLabels,
        prop: this.proportional, style: { ...this.style },
        view: [v.xMin, v.xMax, v.yMin, v.yMax].map(n => +n.toPrecision(8)),
        home: [this.home.xMin, this.home.xMax, this.home.yMin, this.home.yMax],
        params: Object.fromEntries(Object.keys(this.params).map(k => [k, { v: this.params[k], ...this.paramMeta[k] }])),
        fns: this.fns.map(f => {
          const o = { l: f.letter, c: f.col, w: f.strokeWidth };
          if (f.deriv) o.d = [idx.get(f.deriv.of), f.deriv.order];
          else o.s = f.def;
          if (!f.vis) o.h = 1;
          if (f.dash) o.ds = 1;
          if (f.labelX != null) o.lp = [+f.labelX.toPrecision(6), +f.labelY.toPrecision(6)];
          return o;
        }),
      };
    },

    load(st, opts) {
      opts = opts || {};
      this.graphTitle = st.title || '';
      this.deg = !!st.deg;
      this.smartLabels = !!st.smart;
      this.proportional = st.prop !== undefined ? !!st.prop : true;
      this.theme = this.themes[st.theme] ? st.theme : 'standard';
      this._applyThemeColors(this.theme);
      this.style = { ...DEFAULT_STYLE, ...(st.style || {}) };
      // params-Objekt nicht ersetzen – kompilierte Funktionen lesen live daraus
      Object.keys(this.params).forEach(k => delete this.params[k]);
      this.paramMeta = {};
      this._stopAnim();
      Object.entries(st.params || {}).forEach(([k, p]) => {
        this.params[k] = +p.v || 0;
        this.paramMeta[k] = { min: p.min ?? -10, max: p.max ?? 10, auto: !!p.auto };
      });
      const ids = [];
      this.fns = (st.fns || []).map((o, i) => {
        const id = this.nextId++;
        ids[i] = id;
        return {
          id, letter: o.l, def: o.s, deriv: o.d ? { of: o.d[0], order: o.d[1] } : null,
          col: o.c || COLORS[i % COLORS.length], strokeWidth: o.w || 4, vis: !o.h, dash: !!o.ds,
          labelX: o.lp ? o.lp[0] : null, labelY: o.lp ? o.lp[1] : null,
        };
      });
      this.fns.forEach(f => { if (f.deriv) f.deriv.of = ids[f.deriv.of]; });
      this.ci = this.fns.length;
      this.integral = null; this.tangent = null; this.labelOffsets = {};
      this.els.cib.style.display = 'none';
      if (Array.isArray(st.home)) [this.home.xMin, this.home.xMax, this.home.yMin, this.home.yMax] = st.home;
      if (!opts.keepView) {
        if (Array.isArray(st.view)) [this.xMin, this.xMax, this.yMin, this.yMax] = st.view;
        if (this.proportional) this._applyProportional();
        this._rebuildView();
      }
      this.rebuild();
      this._syncControls();
      this.sync();
      this.syncParams();
      this.repaint();
    },

    _loadStartupState() {
      try {
        const m = location.hash.match(/^#s=(.+)$/);
        if (m) {
          const json = new TextDecoder().decode(Uint8Array.from(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));
          history.replaceState(null, '', location.pathname + location.search);
          return JSON.parse(json);
        }
      } catch (e) { this._toast('Link konnte nicht gelesen werden'); }
      try {
        const s = localStorage.getItem(STORAGE_KEY);
        if (s) return JSON.parse(s);
      } catch (e) { /* kein Speicher verfügbar */ }
      return null;
    },

    commit() {
      const s = JSON.stringify(this.serialize());
      const cmp = (j) => j && j.replace(/"view":\[[^\]]*\],/, '');
      if (cmp(this.hist[this.histPos]) === cmp(s)) { this._scheduleSave(); return; }
      this.hist = this.hist.slice(0, this.histPos + 1);
      this.hist.push(s);
      if (this.hist.length > 100) this.hist.shift();
      this.histPos = this.hist.length - 1;
      this._updateUndoButtons();
      this._scheduleSave();
    },

    undo() {
      if (this.histPos <= 0) return;
      this.histPos--;
      this.load(JSON.parse(this.hist[this.histPos]), { keepView: true });
      this._updateUndoButtons();
      this._scheduleSave();
    },

    redo() {
      if (this.histPos >= this.hist.length - 1) return;
      this.histPos++;
      this.load(JSON.parse(this.hist[this.histPos]), { keepView: true });
      this._updateUndoButtons();
      this._scheduleSave();
    },

    _updateUndoButtons() {
      this.els.undo.disabled = this.histPos <= 0;
      this.els.redo.disabled = this.histPos >= this.hist.length - 1;
    },

    _scheduleSave() {
      clearTimeout(this._st);
      this._st = setTimeout(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.serialize())); } catch (e) { /* voll oder gesperrt */ }
      }, 400);
    },

    shareLink() {
      const bytes = new TextEncoder().encode(JSON.stringify(this.serialize()));
      let bin = '';
      bytes.forEach(b => { bin += String.fromCharCode(b); });
      const enc = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const url = location.origin + location.pathname + '#s=' + enc;
      this._copy(url, 'Link in die Zwischenablage kopiert');
    },

    // ══════════════════ Funktionen ══════════════════

    addFunc(src) {
      const fromInput = src === undefined;
      const raw = (fromInput ? this.els.inp.value : src).trim();
      if (!raw) return;
      const res = this._addDef(raw);
      if (res.error) {
        if (fromInput) { this._shake(this.els.inp); this.els.err.textContent = res.error; }
        else this._toast(res.error);
        return;
      }
      if (fromInput) { this.els.inp.value = ''; this._showInputState(); }
      this.commit();
    },

    _usedLetters(except) { return this.fns.filter(f => f !== except).map(f => f.letter); },

    // Prüft eine Eingabe, ohne sie zu übernehmen
    _check(raw, self) {
      const d = MP.parseDefinition(raw);
      if (d.kind === 'derivative') {
        const parent = this.fns.find(f => f.letter === d.of);
        if (!parent) return { error: 'Funktion ' + d.of + ' existiert nicht' };
        return { d, parent };
      }
      if (d.letter && /^[xye]$/.test(d.letter)) return { error: d.letter + ' kann kein Funktionsname sein' };
      const letter = d.letter || (self && !self.deriv ? self.letter : MP.nextLetter(this._usedLetters(self)));
      try {
        const ast = MP.parse(d.body, { variable: d.variable, functions: this._fnContext(letter), self: letter });
        return { d, ast, letter };
      } catch (e) {
        return { error: e instanceof MP.ParseError ? e.message : 'Ungültiger Ausdruck' };
      }
    },

    _addDef(raw) {
      const c = this._check(raw);
      if (c.error) return c;
      if (c.d.kind === 'derivative') {
        const letter = c.d.of + "'".repeat(c.d.order);
        if (this.fns.some(f => f.letter === letter)) return { error: letter + ' ist bereits vorhanden' };
        this._pushFn({ letter, deriv: { of: c.parent.id, order: c.d.order } });
        return {};
      }
      const existing = c.d.letter && this.fns.find(f => f.letter === c.letter);
      if (existing) {
        // f(x) = … definiert eine vorhandene Funktion neu
        existing.def = raw; existing.deriv = null; existing.labelX = existing.labelY = null;
        this._afterFnChange();
        this._toast(c.letter + ' wurde neu definiert');
        return {};
      }
      this._pushFn({ letter: c.letter, def: raw });
      return {};
    },

    _pushFn(o) {
      this.fns.push({
        id: this.nextId++, vis: true, strokeWidth: 4, dash: false, labelX: null, labelY: null,
        col: COLORS[this.ci++ % COLORS.length], def: null, deriv: null, ...o,
      });
      this._afterFnChange();
    },

    _afterFnChange() {
      this.rebuild();
      this.sync();
      this.repaint();
      if (this._tableOn) this.renderTable();
    },

    _fnContext(exceptLetter) {
      const ctx = {};
      this.fns.forEach(f => { if (!f.deriv && f.letter !== exceptLetter && /^[a-zA-Z]$/.test(f.letter)) ctx[f.letter] = { ast: f.ast || null }; });
      if (exceptLetter) ctx[exceptLetter] = { ast: null };
      return ctx;
    },

    _editFunc(fn, raw) {
      const c = this._check(raw, fn);
      if (c.error) { this._toast(c.error); return false; }
      if (c.d.kind === 'derivative') {
        if (c.parent === fn) { this._toast('Eine Funktion kann nicht ihre eigene Ableitung sein'); return false; }
        fn.deriv = { of: c.parent.id, order: c.d.order };
        fn.letter = c.d.of + "'".repeat(c.d.order);
        fn.def = null;
      } else {
        if (c.d.letter && c.letter !== fn.letter && this.fns.some(f => f !== fn && f.letter === c.letter)) {
          this._toast(c.letter + ' ist bereits vergeben'); return false;
        }
        fn.letter = c.letter; fn.def = raw; fn.deriv = null;
      }
      fn.labelX = null; fn.labelY = null;
      this._afterFnChange();
      this.commit();
      return true;
    },

    rmFn(id) {
      this.fns = this.fns.filter(f => f.id !== id);
      if (this.integral && this.integral.fnId === id) this._hideIntegral();
      if (this.tangent && this.tangent.fnId === id) this.tangent = null;
      this._afterFnChange();
      this.commit();
    },

    tgFn(id) {
      const f = this.fns.find(f => f.id === id);
      if (f) { f.vis = !f.vis; this.sync(); this.repaint(); this.commit(); }
    },

    // Alle Funktionen neu übersetzen (nach Änderungen, Winkelmodus, Laden)
    rebuild() {
      this.fns.forEach(f => { f.ast = null; f.f = null; f.error = null; f._d = null; f.numeric = false; });
      let pending = this.fns.slice();
      for (let pass = 0; pass <= this.fns.length && pending.length; pass++) {
        const still = [];
        pending.forEach(fn => { if (!this._build(fn)) still.push(fn); });
        if (still.length === pending.length) break;
        pending = still;
      }
      pending.forEach(fn => { if (!fn.error) fn.error = 'Nicht auswertbar'; });
      this._syncAutoParams();
    },

    _build(fn) {
      fn.version = (fn.version || 0) + 1;
      fn.rad = false;
      try {
        if (fn.deriv) {
          const parent = this.fns.find(f => f.id === fn.deriv.of);
          if (!parent) { fn.error = 'Ausgangsfunktion wurde gelöscht'; return false; }
          if (!parent.f) { fn.error = 'Ausgangsfunktion ist fehlerhaft'; return false; }
          let ast = parent.ast;
          if (ast && this.deg && !parent.rad) { ast = MP.radianize(ast); fn.rad = true; }
          else fn.rad = !!parent.rad;
          for (let k = 0; k < fn.deriv.order && ast; k++) ast = MP.derivative(ast);
          if (ast) {
            fn.ast = ast;
            fn.f = MP.compile(ast, this.params, { deg: this.deg && !fn.rad });
          } else {
            // Kein symbolisches Ergebnis: numerisch ableiten
            fn.ast = null; fn.numeric = true;
            let f = parent.f;
            for (let k = 0; k < fn.deriv.order; k++) f = numDeriv(f, 1);
            fn.f = f;
          }
        } else {
          const d = MP.parseDefinition(fn.def);
          fn.ast = MP.parse(d.body, { variable: d.variable, functions: this._fnContext(fn.letter), self: fn.letter });
          fn.f = MP.compile(fn.ast, this.params, { deg: this.deg });
        }
        fn.error = null;
        return true;
      } catch (e) {
        fn.error = e instanceof MP.ParseError ? e.message : 'Ungültiger Ausdruck';
        fn.ast = null; fn.f = null;
        return false;
      }
    },

    // Erste und zweite Ableitung für Kurvendiskussion und Tangente (lazy)
    _derivs(fn) {
      if (fn._d) return fn._d;
      let d1 = null, d2 = null;
      if (fn.ast) {
        let base = fn.ast, rad = fn.rad;
        if (this.deg && !rad) { base = MP.radianize(base); rad = true; }
        const a1 = MP.derivative(base);
        const a2 = a1 && MP.derivative(a1);
        const o = { deg: this.deg && !rad };
        if (a1) d1 = MP.compile(a1, this.params, o);
        if (a2) d2 = MP.compile(a2, this.params, o);
      }
      fn._d = { d1: d1 || numDeriv(fn.f, 1), d2: d2 || numDeriv(fn.f, 2) };
      return fn._d;
    },

    _syncAutoParams() {
      const used = new Set();
      this.fns.forEach(f => { if (f.ast) MP.freeVars(f.ast, used); });
      // auch fehlerhafte Definitionen nicht blockieren: Variablen nur aus gültigen ASTs
      let changed = false;
      used.forEach(n => {
        if (!(n in this.params)) {
          this.params[n] = 1;
          this.paramMeta[n] = { min: -10, max: 10, auto: true };
          changed = true;
        }
      });
      Object.keys(this.params).forEach(n => {
        if (this.paramMeta[n] && this.paramMeta[n].auto && !used.has(n)) {
          delete this.params[n]; delete this.paramMeta[n];
          changed = true;
        }
      });
      if (changed) this.syncParams();
    },

    _showInputState() {
      const raw = this.els.inp.value.trim();
      this.els.err.textContent = '';
      this.els.prev.innerHTML = '';
      if (!raw) return;
      const c = this._check(raw);
      if (c.error) { this.els.err.textContent = c.error; return; }
      if (c.ast) this._renderTeX(this.els.prev, letterTeX(c.letter) + '(x) = ' + MP.toTeX(c.ast));
    },

    _renderTeX(el, tex, fallback) {
      if (window.katex) {
        try { katex.render(tex, el, { throwOnError: false, displayMode: false }); return; } catch (e) { /* Fallback */ }
      }
      el.textContent = fallback || tex;
    },

    // ── Funktionsliste ──
    sync() {
      const lst = this.els.lst, emp = this.els.emp;
      lst.innerHTML = '';
      if (!this.fns.length) { emp.style.display = 'block'; return; }
      emp.style.display = 'none';
      this.fns.forEach(f => {
        const d = document.createElement('div'); d.className = 'func-item' + (f.error ? ' has-error' : '');
        const dot = document.createElement('span'); dot.className = 'func-color';
        dot.style.background = f.col; dot.style.opacity = f.vis ? '1' : '.3';

        const t = document.createElement('span'); t.className = 'func-text';
        const name = letterTeX(f.letter) + '(x) = ';
        if (f.ast) this._renderTeX(t, name + MP.toTeX(f.ast), f.letter + '(x) = ' + MP.toPlain(f.ast));
        else if (f.numeric) this._renderTeX(t, name + '\\text{numerisch}', f.letter + '(x) (numerisch)');
        else t.textContent = f.letter + ': ' + (f.def || '');
        t.title = f.deriv ? 'Ableitung – wird automatisch aktualisiert. Klicken zum Bearbeiten' : 'Klicken zum Bearbeiten';
        t.addEventListener('click', () => {
          const inp = document.createElement('input'); inp.type = 'text';
          inp.value = f.deriv ? f.letter : (f.def || '');
          inp.className = 'func-edit-input';
          t.replaceWith(inp); inp.focus(); inp.select();
          let cancelled = false;
          const done = () => {
            if (!inp.isConnected) return;
            const v = inp.value.trim();
            const orig = f.deriv ? f.letter : f.def;
            if (cancelled || !v || v === orig || !this._editFunc(f, v)) inp.replaceWith(t);
          };
          inp.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); }
            if (ev.key === 'Escape') { cancelled = true; inp.blur(); }
          });
          inp.addEventListener('blur', done);
        });

        const a = document.createElement('span'); a.className = 'func-actions';
        const btn = (html, title, cb, cls) => {
          const b = document.createElement('button'); b.innerHTML = html; b.title = title;
          if (cls) b.className = cls;
          b.addEventListener('click', cb); a.appendChild(b); return b;
        };
        btn(f.vis ? '◉' : '○', f.vis ? 'Ausblenden' : 'Einblenden', () => this.tgFn(f.id));
        btn('f′', 'Ableitung hinzufügen', () => this._addDerivative(f), 'derive-btn');
        btn('∫', 'Integral', () => this._showIntegral(f));
        btn('✕', 'Entfernen', () => this.rmFn(f.id), 'danger');

        const ca = document.createElement('div'); ca.className = 'func-controls';
        const cp = document.createElement('input'); cp.type = 'color'; cp.value = f.col; cp.title = 'Farbe';
        cp.addEventListener('input', () => { f.col = cp.value; dot.style.background = f.col; this.repaint(); });
        cp.addEventListener('change', () => this.commit());
        const sw = document.createElement('input'); sw.type = 'range'; sw.min = 0.5; sw.max = 10; sw.step = 0.5;
        sw.value = f.strokeWidth || 4; sw.title = 'Linienstärke';
        const swv = document.createElement('span'); swv.className = 'func-stroke-val';
        swv.textContent = (f.strokeWidth || 4).toFixed(1);
        sw.addEventListener('input', () => { f.strokeWidth = parseFloat(sw.value); swv.textContent = f.strokeWidth.toFixed(1); this.repaint(); });
        sw.addEventListener('change', () => this.commit());
        const dash = document.createElement('button'); dash.className = 'func-dash' + (f.dash ? ' active' : '');
        dash.textContent = '- -'; dash.title = 'Gestrichelt';
        dash.addEventListener('click', () => { f.dash = !f.dash; dash.classList.toggle('active', f.dash); this.repaint(); this.commit(); });
        ca.append(cp, sw, swv, dash);
        if (f.error) {
          const er = document.createElement('span'); er.className = 'func-error'; er.textContent = f.error;
          ca.appendChild(er);
        }
        d.append(dot, t, a, ca);
        lst.appendChild(d);
      });
    },

    _addDerivative(f) {
      const base = f.deriv ? this.fns.find(p => p.id === f.deriv.of) : f;
      const order = f.deriv ? f.deriv.order + 1 : 1;
      if (!base) return;
      const res = this._addDef(base.letter + "'".repeat(order));
      if (res.error) this._toast(res.error); else this.commit();
    },

    // ══════════════════ Parameter ══════════════════

    addParam() {
      const name = this.els.pName.value.trim();
      if (!/^[a-zA-Z]$/.test(name)) { this._toast('Bitte einen Buchstaben (a-z) eingeben'); return; }
      if (name === 'x' || name === 'e') { this._toast(name + ' ist reserviert'); return; }
      const val = parseFloat(this.els.pVal.value) || 0;
      if (name in this.params) {
        this.params[name] = val;
        this.paramMeta[name].auto = false;
      } else {
        this.params[name] = val;
        this.paramMeta[name] = { min: Math.min(-10, val), max: Math.max(10, val), auto: false };
      }
      this.els.pName.value = '';
      this.syncParams();
      this.repaint();
      this.commit();
    },

    removeParam(name) {
      const used = new Set();
      this.fns.forEach(f => { if (f.ast) MP.freeVars(f.ast, used); });
      if (used.has(name)) { this._toast(name + ' wird noch in einer Funktion verwendet'); return; }
      delete this.params[name];
      delete this.paramMeta[name];
      this.syncParams();
      this.repaint();
      this.commit();
    },

    _paramChanged() {
      this.repaint();
      if (this._tableOn) this.renderTable();
    },

    syncParams() {
      const list = this.els.pList;
      list.innerHTML = '';
      this._paramEls = {};
      Object.keys(this.params).sort().forEach(name => {
        const meta = this.paramMeta[name] || (this.paramMeta[name] = { min: -10, max: 10 });
        const d = document.createElement('div'); d.className = 'param-item';
        const lbl = document.createElement('span'); lbl.className = 'param-name'; lbl.textContent = name + ' =';
        const range = document.createElement('input'); range.type = 'range';
        const setStep = () => { range.min = meta.min; range.max = meta.max; range.step = niceStep((meta.max - meta.min) / 400) || 0.01; };
        setStep();
        range.value = this.params[name];
        const num = document.createElement('input'); num.type = 'number';
        num.value = +this.params[name].toFixed(4); num.step = 0.1;
        range.addEventListener('input', () => {
          this.params[name] = parseFloat(range.value);
          num.value = +this.params[name].toFixed(4);
          this._paramChanged();
        });
        range.addEventListener('change', () => this.commit());
        num.addEventListener('change', () => {
          const v = parseFloat(num.value);
          if (!isFinite(v)) { num.value = this.params[name]; return; }
          this.params[name] = v;
          if (v < meta.min) meta.min = v;
          if (v > meta.max) meta.max = v;
          setStep(); range.value = v;
          this._paramChanged();
          this.commit();
        });

        const play = document.createElement('button'); play.className = 'param-play';
        const anim = this._anim && this._anim[name];
        play.innerHTML = anim ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        play.title = 'Animieren';
        play.addEventListener('click', () => this.toggleAnim(name));

        const del = document.createElement('button'); del.className = 'param-del';
        del.innerHTML = '✕'; del.title = 'Entfernen';
        del.addEventListener('click', () => this.removeParam(name));

        const rr = document.createElement('div'); rr.className = 'param-range';
        const mk = (key, title) => {
          const i = document.createElement('input'); i.type = 'number'; i.value = meta[key]; i.title = title;
          i.addEventListener('change', () => {
            const v = parseFloat(i.value);
            const other = key === 'min' ? meta.max : meta.min;
            if (!isFinite(v) || (key === 'min' ? v >= other : v <= other)) { i.value = meta[key]; return; }
            meta[key] = v; setStep();
            this.params[name] = clamp(this.params[name], meta.min, meta.max);
            range.value = this.params[name]; num.value = +this.params[name].toFixed(4);
            this._paramChanged();
            this.commit();
          });
          return i;
        };
        const sp = (t) => { const s = document.createElement('span'); s.textContent = t; return s; };
        rr.append(sp('von'), mk('min', 'Minimum'), sp('bis'), mk('max', 'Maximum'));

        d.append(lbl, range, num, play, del, rr);
        list.appendChild(d);
        this._paramEls[name] = { range, num, play };
      });
    },

    toggleAnim(name) {
      this._anim = this._anim || {};
      if (this._anim[name]) delete this._anim[name];
      else this._anim[name] = { dir: 1 };
      const el = this._paramEls && this._paramEls[name];
      if (el) el.play.innerHTML = this._anim[name] ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
      if (!this._anim[name]) this.commit();
      if (Object.keys(this._anim).length && !this._animRaf) {
        let last = performance.now();
        const tick = (now) => {
          const dt = Math.min(0.1, (now - last) / 1000); last = now;
          const names = Object.keys(this._anim || {});
          if (!names.length) { this._animRaf = null; return; }
          names.forEach(n => {
            const meta = this.paramMeta[n];
            if (!meta || !(n in this.params)) { delete this._anim[n]; return; }
            const a = this._anim[n];
            let v = this.params[n] + a.dir * (meta.max - meta.min) * dt / 4;   // 4 s pro Durchlauf
            if (v >= meta.max) { v = meta.max; a.dir = -1; }
            if (v <= meta.min) { v = meta.min; a.dir = 1; }
            this.params[n] = v;
            const el = this._paramEls[n];
            if (el) { el.range.value = v; el.num.value = +v.toFixed(2); }
          });
          this._paramChanged();
          this._animRaf = requestAnimationFrame(tick);
        };
        this._animRaf = requestAnimationFrame(tick);
      }
    },

    _stopAnim() {
      this._anim = {};
      if (this._animRaf) cancelAnimationFrame(this._animRaf);
      this._animRaf = null;
    },

    setAngleMode(deg) {
      this.deg = deg;
      this.els.angle.textContent = deg ? 'DEG' : 'RAD';
      this.els.angle.classList.toggle('active', deg);
      this.tangent = null;
      this.rebuild();
      this.sync();
      this.repaint();
      if (this._tableOn) this.renderTable();
      this._toast(deg ? 'Gradmaß: sin(90) = 1' : 'Bogenmaß: sin(π/2) = 1');
      this.commit();
    },

    // ══════════════════ Ansicht ══════════════════

    _viewObj(current) {
      if (current && this.xs) {
        const [x0, x1] = this.xs.domain(), [y0, y1] = this.ys.domain();
        return { xMin: x0, xMax: x1, yMin: y0, yMax: y1 };
      }
      return { xMin: this.xMin, xMax: this.xMax, yMin: this.yMin, yMax: this.yMax };
    },

    _takeCurrentView() {
      if (!this.xs) return;
      Object.assign(this, this._viewObj(true));
    },

    _rebuildView() {
      this.curT = d3.zoomIdentity;
      this.svg.property('__zoom', d3.zoomIdentity);
      this.buildScales();
      this._syncControls();
      this.repaint();
    },

    applyView() {
      const E = this.els, num = (el, d) => { const v = parseFloat(el.value); return isFinite(v) ? v : d; };
      const xMin = num(E.xminI, DEFAULT_VIEW.xMin), xMax = num(E.xmaxI, DEFAULT_VIEW.xMax);
      const yMin = num(E.yminI, DEFAULT_VIEW.yMin), yMax = num(E.ymaxI, DEFAULT_VIEW.yMax);
      if (xMin >= xMax || yMin >= yMax) { this._toast('Minimum muss kleiner als Maximum sein'); return; }
      this.style.gridWidth = num(E.gridW, 1);
      this.style.gridColor = E.gridC.value;
      this.style.axisWidth = num(E.axisW, 2);
      this.style.axisColor = E.axisC.value;
      this.style.fontSize = num(E.fontS, 14);
      this.style.gridStep = Math.max(0, num(E.gridStep, 1));
      this.style.xLabel = E.xlabI.value || 'x';
      this.style.yLabel = E.ylabI.value || 'y';
      Object.assign(this, { xMin, xMax, yMin, yMax });
      if (this.proportional) this._applyProportional();
      this.home = this._viewObj();
      this._rebuildView();
      this.commit();
      this._toast('Einstellungen übernommen');
    },

    _syncControls() {
      const E = this.els, v = this._viewObj(true);
      const r = (n) => +n.toPrecision(6);
      E.xminI.value = r(v.xMin); E.xmaxI.value = r(v.xMax);
      E.yminI.value = r(v.yMin); E.ymaxI.value = r(v.yMax);
      E.gridW.value = this.style.gridWidth; E.gridC.value = this.style.gridColor;
      E.axisW.value = this.style.axisWidth; E.axisC.value = this.style.axisColor;
      E.fontS.value = this.style.fontSize; E.gridStep.value = this.style.gridStep;
      E.xlabI.value = this.style.xLabel; E.ylabI.value = this.style.yLabel;
      E.prop.checked = this.proportional; E.smart.checked = this.smartLabels;
      E.theme.value = this.theme; E.hTitle.value = this.graphTitle;
      E.angle.textContent = this.deg ? 'DEG' : 'RAD';
      E.angle.classList.toggle('active', this.deg);
    },

    _applyProportional() {
      const pw = this.W - this.pad.l - this.pad.r;
      const ph = this.H - this.pad.t - this.pad.b;
      if (!(pw > 0 && ph > 0)) return;
      const yRange = (this.xMax - this.xMin) * ph / pw;
      const yMid = (this.yMin + this.yMax) / 2;
      this.yMin = yMid - yRange / 2;
      this.yMax = yMid + yRange / 2;
    },

    _measure() {
      const r = this.svg.node().parentElement.getBoundingClientRect();
      this.W = r.width || 800;
      this.H = r.height || 500;
      this.svg.attr('width', this.W).attr('height', this.H);
    },

    resize() {
      // sichtbaren Ausschnitt beibehalten
      this._takeCurrentView();
      this._measure();
      if (this.proportional) this._applyProportional();
      this._rebuildView();
    },

    buildScales() {
      const pw = this.W - this.pad.l - this.pad.r;
      const ph = this.H - this.pad.t - this.pad.b;
      this.baseX = d3.scaleLinear().domain([this.xMin, this.xMax]).range([this.pad.l, this.pad.l + pw]);
      this.baseY = d3.scaleLinear().domain([this.yMin, this.yMax]).range([this.pad.t + ph, this.pad.t]);
      this.xs = this.curT.rescaleX(this.baseX);
      this.ys = this.curT.rescaleY(this.baseY);
      this.PL = this.pad.l; this.PR = this.W - this.pad.r;
      this.PT = this.pad.t; this.PB = this.H - this.pad.b;
      this.clipRect.attr('x', this.PL).attr('y', this.PT).attr('width', Math.max(0, this.PR - this.PL)).attr('height', Math.max(0, this.PB - this.PT));
    },

    resetView() {
      Object.assign(this, this.home);
      if (this.proportional) this._applyProportional();
      this._rebuildView();
      this._scheduleSave();
    },

    zoomBy(k) {
      this.svg.transition().duration(150).call(this.zoom.scaleBy, k);
    },

    zoomToSelection() {
      const b = this._getSelectionBounds();
      if (!b) return;
      Object.assign(this, b);
      if (this.proportional) this._applyProportional();
      this.toggleSelection();
      this._rebuildView();
      this._scheduleSave();
    },

    // ══════════════════ Zeichnen ══════════════════

    repaint() {
      if (!this.W || !this.H || !this.xs) return;
      this.root.selectAll('*').remove();
      this.root.attr('font-family', 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif');
      this._ticksCache = null;
      this.paintGrid();
      this.paintAxes();
      this.paintLabels();
      this.paintIntegral();
      this.paintFuncs();
      this.paintSelectionRect();
      if (this.smartLabels) this.paintSmartLabels();
      if (this.tangent) {
        const fn = this.fns.find(f => f.id === this.tangent.fnId);
        if (fn && fn.f && fn.vis) this.paintTangent(this.root, this._tangentAt(fn, this.tangent.x));
      }
      this.paintTitle();
      this._refreshHover();
    },

    // Raster- und Beschriftungswerte; passt sich dem Zoom an
    ticks() {
      if (this._ticksCache) return this._ticksCache;
      const fs = this.style.fontSize;
      const make = (scale, minLabelPx) => {
        const [d0, d1] = scale.domain().slice().sort((a, b) => a - b);
        const ppu = Math.abs(scale(1) - scale(0));
        const user = this.style.gridStep;
        let step = user > 0 && user * ppu >= 12 ? user : niceStep(30 / ppu);
        let k = 1;
        const mult = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
        for (const m of mult) { k = m; if (step * m * ppu >= minLabelPx) break; }
        const grid = [], labels = [];
        const i0 = Math.ceil(d0 / step - 1e-9), i1 = Math.floor(d1 / step + 1e-9);
        for (let i = i0; i <= i1 && grid.length < 2000; i++) {
          const v = i * step;
          if (i === 0) continue;
          grid.push(v);
          if (i % k === 0) labels.push(v);
        }
        return { grid, labels, step, dec: decimalsOf(step * k) };
      };
      this._ticksCache = { x: make(this.xs, fs * 3.2), y: make(this.ys, fs * 1.8) };
      return this._ticksCache;
    },

    _axisPos() {
      return {
        ax: clamp(this.xs(0), this.PL, this.PR),
        ay: clamp(this.ys(0), this.PT, this.PB),
      };
    },

    paintGrid() {
      const xs = this.xs, ys = this.ys, l = this.PL, r = this.PR, t = this.PT, b = this.PB;
      const g = this.root.append('g');
      const gw = this.style.gridWidth, gc = this.style.gridColor;
      g.append('rect').attr('x', 0).attr('y', 0).attr('width', this.W).attr('height', this.H)
        .attr('fill', this._theme().plotBg).attr('stroke', 'none');
      const tk = this.ticks();
      const path = [];
      tk.x.grid.forEach(v => { const px = xs(v); path.push(`M${px},${t}V${b}`); });
      tk.y.grid.forEach(v => { const py = ys(v); path.push(`M${l},${py}H${r}`); });
      g.append('path').attr('d', path.join('')).attr('stroke', gc).attr('stroke-width', gw).attr('fill', 'none');
    },

    paintAxes() {
      const l = this.PL, r = this.PR, t = this.PT, b = this.PB;
      const { ax, ay } = this._axisPos();
      const g = this.root.append('g');
      const hl = 9, tk = 5;
      const aw = this.style.axisWidth, ac = this.style.axisColor;

      g.append('line').attr('x1', l).attr('y1', ay).attr('x2', r - hl - 2).attr('y2', ay)
        .attr('stroke', ac).attr('stroke-width', aw);
      g.append('polygon').attr('points', `${r - 1},${ay} ${r - 1 - hl},${ay - 5} ${r - 1 - hl},${ay + 5}`).attr('fill', ac);
      g.append('line').attr('x1', ax).attr('y1', b).attr('x2', ax).attr('y2', t + hl + 2)
        .attr('stroke', ac).attr('stroke-width', aw);
      g.append('polygon').attr('points', `${ax},${t + 1} ${ax - 5},${t + 1 + hl} ${ax + 5},${t + 1 + hl}`).attr('fill', ac);

      // Ursprung nur beschriften, wenn er wirklich sichtbar ist
      const x0 = this.xs(0), y0 = this.ys(0);
      if (x0 >= l && x0 <= r && y0 >= t && y0 <= b) {
        g.append('text').attr('x', ax - 8).attr('y', ay + this.style.fontSize + 4)
          .attr('text-anchor', 'end').attr('font-size', this.style.fontSize + 2).attr('font-weight', 'bold')
          .attr('fill', ac).text('O');
      }

      const ticks = this.ticks();
      const tw = Math.max(1, Math.min(aw - 0.5, 2));
      const path = [];
      ticks.x.labels.forEach(v => { const px = this.xs(v); path.push(`M${px},${ay - tk}V${ay + tk}`); });
      ticks.y.labels.forEach(v => { const py = this.ys(v); path.push(`M${ax - tk},${py}H${ax + tk}`); });
      g.append('path').attr('d', path.join('')).attr('stroke', ac).attr('stroke-width', tw);
    },

    paintLabels() {
      const r = this.PR, t = this.PT, b = this.PB;
      const { ax, ay } = this._axisPos();
      const g = this.root.append('g');
      const fs = this.style.fontSize, ac = this.style.axisColor;
      const ls = this.style.labelSize || 18;
      const tk = this.ticks();
      const halo = this._theme().plotBg;
      const lbl = (sel) => sel.attr('font-size', fs).attr('font-weight', '500').attr('fill', ac)
        .attr('stroke', halo).attr('stroke-width', 3).attr('paint-order', 'stroke');

      // Beschriftung an den Rand verlegen, wenn die Achse dort klebt
      const below = ay + fs + 6 < this.H - 4;
      tk.x.labels.forEach(v => {
        lbl(g.append('text').attr('x', this.xs(v)).attr('y', below ? ay + fs + 4 : ay - 8)
          .attr('text-anchor', 'middle')).text(fmtDE(v, tk.x.dec));
      });
      const left = ax - 40 > 0;
      tk.y.labels.forEach(v => {
        lbl(g.append('text').attr('x', left ? ax - 10 : ax + 10).attr('y', this.ys(v) + fs * 0.35)
          .attr('text-anchor', left ? 'end' : 'start')).text(fmtDE(v, tk.y.dec));
      });
      g.append('text').attr('x', r - 1).attr('y', ay - 10)
        .attr('text-anchor', 'end').attr('font-size', ls).attr('font-weight', 'bold')
        .attr('font-style', 'italic').attr('fill', ac).text(this.style.xLabel);
      g.append('text').attr('x', ax + 14).attr('y', t + 6)
        .attr('text-anchor', 'start').attr('font-size', ls).attr('font-weight', 'bold')
        .attr('font-style', 'italic').attr('fill', ac).text(this.style.yLabel);
      g.append('text').attr('x', r - 4).attr('y', b + this.pad.b - 6)
        .attr('text-anchor', 'end').attr('font-size', 10)
        .attr('fill', '#bbb').text('Plotoria von Tobias Schmidbauer');
    },

    // Kurve in Segmente zerlegen (Polstellen und Definitionslücken unterbrechen die Linie)
    _segments(f) {
      const xs = this.xs, ys = this.ys;
      const [x0, x1] = xs.domain();
      const N = Math.ceil((this.PR - this.PL) * 1.5);
      const H = this.PB - this.PT;
      const lo = this.PT - 3 * H, hi = this.PB + 3 * H;
      const segs = [];
      let cur = [], prev = null;
      for (let i = 0; i <= N; i++) {
        const x = x0 + (x1 - x0) * i / N;
        const y = f(x);
        if (!isFinite(y)) { if (cur.length > 1) segs.push(cur); cur = []; prev = null; continue; }
        const py = ys(y);
        if (prev && Math.abs(py - prev.py) > H) {
          const ym = f((x + prev.x) / 2);
          const loY = Math.min(y, prev.y), hiY = Math.max(y, prev.y), tol = (hiY - loY) * 0.05;
          if (!isFinite(ym) || ym < loY - tol || ym > hiY + tol) {
            if (cur.length > 1) segs.push(cur);
            cur = [];
          }
        }
        cur.push([xs(x), clamp(py, lo, hi)]);
        prev = { x, y, py };
      }
      if (cur.length > 1) segs.push(cur);
      return segs;
    },

    paintFuncs() {
      const vis = this.fns.filter(f => f.vis && f.f);
      if (!vis.length) return;
      const g = this.root.append('g').attr('clip-path', 'url(#plot-clip)');
      const lg = this.root.append('g');
      const ln = d3.line();
      vis.forEach(fn => {
        const segs = this._segments(fn.f);
        const p = g.append('path').attr('d', segs.map(s => ln(s)).join('')).attr('fill', 'none')
          .attr('stroke', fn.col).attr('stroke-width', fn.strokeWidth || 4)
          .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
        if (fn.dash) p.attr('stroke-dasharray', `${(fn.strokeWidth || 4) * 3},${(fn.strokeWidth || 4) * 2}`);
        this._graphLabel(lg, fn, segs);
      });
    },

    // Beschriftung G_f – frei verschiebbar
    _graphLabel(g, fn, segs) {
      if (fn.labelX == null) {
        let last = null;
        segs.forEach(s => s.forEach(p => { if (p[1] >= this.PT + 12 && p[1] <= this.PB - 4) last = p; }));
        if (!last) return;
        const px = clamp(last[0] - 18, this.PL + 8, this.PR - 30);
        const py = clamp(last[1] - 10, this.PT + 16, this.PB - 6);
        fn.labelX = this.xs.invert(px);
        fn.labelY = this.ys.invert(py);
      }
      const lx = this.xs(fn.labelX), ly = this.ys(fn.labelY);
      if (lx < this.PL - 20 || lx > this.PR + 20 || ly < this.PT - 20 || ly > this.PB + 20) return;
      const fs = this.style.fontSize * 1.1;
      const txt = g.append('text').attr('x', lx).attr('y', ly)
        .attr('font-size', fs).attr('font-weight', 'bold').attr('fill', fn.col).attr('cursor', 'move')
        .attr('stroke', this._theme().plotBg).attr('stroke-width', 3).attr('paint-order', 'stroke');
      txt.append('tspan').text('G');
      txt.append('tspan').attr('dy', fs * 0.28).attr('font-size', fs * 0.75).text(fn.letter);
      txt.call(d3.drag().container(this.svg.node())
        .on('start', (ev) => { if (ev.sourceEvent) ev.sourceEvent.stopPropagation(); })
        .on('drag', (ev) => {
          const px = clamp(ev.x, this.PL + 4, this.PR - 10);
          const py = clamp(ev.y, this.PT + 12, this.PB - 4);
          fn.labelX = this.xs.invert(px);
          fn.labelY = this.ys.invert(py);
          txt.attr('x', px).attr('y', py);
        })
        .on('end', () => this.commit()));
    },

    // ── Kurvendiskussion ──
    _analyze(fn) {
      const [x0, x1] = this.xs.domain();
      const key = [fn.id, fn.version, x0, x1, this.deg, JSON.stringify(this.params)].join('|');
      this._anaCache = this._anaCache || new Map();
      if (this._anaCache.has(key)) return this._anaCache.get(key);
      if (this._anaCache.size > 200) this._anaCache.clear();

      const f = fn.f, { d1, d2 } = this._derivs(fn);
      const N = 600, dx = (x1 - x0) / N;
      const yr = Math.abs(this.ys.domain()[1] - this.ys.domain()[0]);
      const pts = [];
      const add = (type, x, y) => {
        if (pts.some(p => p.type === type && Math.abs(p.x - x) < dx * 0.5)) return;
        pts.push({ type, x, y });
      };
      // Vorzeichenwechsel von g suchen; exakte Nullen an Stützstellen werden übersprungen,
      // damit konstante Abschnitte (z. B. f' = 0 bei Geraden) keine Scheinpunkte liefern
      const scan = (g, cb) => {
        let lastX = x0, lastS = 0;
        for (let i = 0; i <= N; i++) {
          const b = x0 + i * dx, gb = g(b);
          if (!isFinite(gb)) { lastS = 0; continue; }
          const s = Math.sign(gb);
          if (s === 0) continue;
          if (lastS && s !== lastS) {
            const r = bisect(g, lastX, b);
            if (r !== null) cb(r);
          }
          lastS = s; lastX = b;
        }
      };
      const small = (v) => Math.abs(v) < 1e-6 * Math.max(1, yr);
      // echte Nullstelle von g bei r (keine Polstelle mit Vorzeichenwechsel)
      const isRoot = (g, r, h) => Math.abs(g(r)) <= 1e-3 * (Math.abs(g(r - h)) + Math.abs(g(r + h))) + 1e-12;

      scan(f, (r) => { if (small(f(r))) add('N', r, 0); });
      scan(d1, (r) => {
        const y = f(r), h = dx * 0.25;
        if (!isFinite(y) || !isRoot(d1, r, h)) return;
        const yl = f(r - h), yh = f(r + h);
        if (!isFinite(yl) || !isFinite(yh)) return;
        if (y >= yl && y >= yh) add('Max', r, y);
        else if (y <= yl && y <= yh) add('Min', r, y);
        else return;
        if (small(y)) add('N', r, 0);    // doppelte Nullstelle (Berührpunkt)
      });
      scan(d2, (r) => {
        const y = f(r), h = dx * 0.25;
        if (isFinite(y) && isFinite(d1(r)) && isRoot(d2, r, h)) add('W', r, y);
      });
      const y0 = f(0);
      if (x0 <= 0 && x1 >= 0 && isFinite(y0) && !pts.some(p => p.type === 'N' && Math.abs(p.x) < dx * 0.5)) add('Sy', 0, y0);
      this._anaCache.set(key, pts);
      return pts;
    },

    paintSmartLabels() {
      const vis = this.fns.filter(f => f.vis && f.f);
      if (!vis.length) return;
      const g = this.root.append('g').attr('class', 'smart-labels');
      const fs = Math.max(11, this.style.fontSize * 0.8);
      const inside = (px, py) => px >= this.PL && px <= this.PR && py >= this.PT && py <= this.PB;
      const W_COLOR = '#8B3FAD';

      // Standardlage: Tiefpunkte und Wendepunkte unterhalb, damit z. B. N und W an derselben Stelle lesbar bleiben
      const below = { Min: 1, W: 1 };
      const draw = (key, x, y, col, parts, type) => {
        const px = this.xs(x), py = this.ys(y);
        if (!inside(px, py)) return;
        const off = this.labelOffsets[key] || (below[type] ? [6, fs + 6] : [6, -8]);
        const lx = px + off[0], ly = py + off[1];
        const line = g.append('line').attr('x1', px).attr('y1', py).attr('x2', lx).attr('y2', ly)
          .attr('stroke', col).attr('stroke-width', 1).attr('stroke-dasharray', '3,3')
          .attr('display', Math.hypot(off[0], off[1]) > fs + 12 ? null : 'none');
        g.append('circle').attr('cx', px).attr('cy', py).attr('r', 4).attr('fill', col)
          .attr('stroke', this._theme().plotBg).attr('stroke-width', 1.5);
        const txt = g.append('text').attr('x', lx).attr('y', ly).attr('font-size', fs)
          .attr('fill', col).attr('font-weight', '600').attr('cursor', 'move')
          .attr('stroke', this._theme().plotBg).attr('stroke-width', 3).attr('paint-order', 'stroke');
        let wasSub = false;
        parts.forEach(([s, sub]) => {
          const ts = txt.append('tspan').text(s);
          if (sub) ts.attr('font-size', fs * 0.75).attr('dy', fs * 0.25);
          else if (wasSub) ts.attr('dy', -fs * 0.25);
          wasSub = !!sub;
        });
        txt.call(d3.drag().container(this.svg.node())
          .on('start', (ev) => { if (ev.sourceEvent) ev.sourceEvent.stopPropagation(); })
          .on('drag', (ev) => {
            const o = this.labelOffsets[key] = [ev.x - px, ev.y - py];
            txt.attr('x', ev.x).attr('y', ev.y);
            line.attr('x2', ev.x).attr('y2', ev.y).attr('display', Math.hypot(o[0], o[1]) > fs + 12 ? null : 'none');
          }));
      };
      const coord = (x, y) => '(' + fmtDE(x) + ' | ' + fmtDE(y) + ')';
      const names = { N: 'N', Max: 'H', Min: 'T', W: 'W' };

      vis.forEach(fn => {
        const pts = this._analyze(fn);
        const counts = {};
        pts.forEach(p => {
          counts[p.type] = (counts[p.type] || 0) + 1;
          if (counts[p.type] > 25) return;      // nicht zuschütten, z. B. sin(x) weit herausgezoomt
          const key = fn.id + ':' + p.type + ':' + p.x.toPrecision(4);
          const col = p.type === 'W' ? W_COLOR : fn.col;
          if (p.type === 'Sy') draw(key, p.x, p.y, col, [['S'], ['y', true], [coord(p.x, p.y)]], p.type);
          else draw(key, p.x, p.y, col, [[names[p.type]], [fn.letter, true], [coord(p.x, p.y)]], p.type);
        });
      });

      // Schnittpunkte zwischen Graphen
      const [x0, x1] = this.xs.domain();
      const N = 600, dx = (x1 - x0) / N;
      for (let i = 0; i < vis.length; i++) {
        for (let j = i + 1; j < vis.length; j++) {
          const fi = vis[i].f, fj = vis[j].f;
          const diff = (x) => fi(x) - fj(x);
          let a = x0, da = diff(a), n = 0;
          for (let k = 1; k <= N && n < 25; k++) {
            const b = x0 + k * dx, db = diff(b);
            if (isFinite(da) && isFinite(db) && da * db < 0) {
              const r = bisect(diff, a, b);
              const y = r !== null ? fi(r) : NaN;
              if (r !== null && isFinite(y) && Math.abs(diff(r)) < 1e-6 * Math.max(1, Math.abs(y))) {
                n++;
                draw('S:' + vis[i].id + ':' + vis[j].id + ':' + r.toPrecision(4), r, y, '#777', [['S'], [vis[i].letter + vis[j].letter, true], [coord(r, y)]]);
              }
            }
            a = b; da = db;
          }
        }
      }
    },

    paintSelectionRect() {
      if (!this.selectionRect) return;
      const s = this.selectionRect;
      const x = Math.min(s.x0, s.x1), y = Math.min(s.y0, s.y1);
      const w = Math.abs(s.x1 - s.x0), h = Math.abs(s.y1 - s.y0);
      if (w < 1 || h < 1) return;
      this.root.append('rect').attr('class', 'selection-rect').attr('x', x).attr('y', y).attr('width', w).attr('height', h)
        .attr('fill', '#34C759').attr('fill-opacity', 0.15)
        .attr('stroke', '#34C759').attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '6,3');
    },

    paintTitle() {
      if (!this.graphTitle) return;
      this.root.append('text').attr('x', this.W / 2).attr('y', 22)
        .attr('text-anchor', 'middle').attr('font-size', 16).attr('font-weight', '700')
        .attr('fill', this._theme().title).text(this.graphTitle);
    },

    // ══════════════════ Maus / Touch ══════════════════

    _localPoint(e) {
      const r = this.svg.node().getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    },

    // Nächstgelegener Graph zur Mausposition (in Pixeln)
    _nearest(mx, my, maxDist) {
      const x = this.xs.invert(mx);
      let best = null;
      this.fns.forEach(fn => {
        if (!fn.vis || !fn.f) return;
        const y = fn.f(x);
        if (!isFinite(y)) return;
        const d = Math.abs(this.ys(y) - my);
        if (d <= maxDist && (!best || d < best.d)) best = { fn, x, y, d };
      });
      return best;
    },

    pointerMove(e) {
      this._lastPointer = this._localPoint(e);
      this._refreshHover();
    },

    _refreshHover() {
      this.overlay.selectAll('*').remove();
      const p = this._lastPointer;
      if (!p || this.selectionMode || this._exporting) return;
      const [mx, my] = p;
      if (mx < this.PL || mx > this.PR || my < this.PT || my > this.PB) {
        this.els.crd.classList.remove('visible');
        return;
      }
      const near = this._nearest(mx, my, this.tangentMode ? 60 : 10);
      let text;
      if (near) {
        text = near.fn.letter + '(' + fmtDE(near.x) + ') = ' + fmtDE(near.y);
        if (this.tangentMode) {
          this.paintTangent(this.overlay, this._tangentAt(near.fn, near.x), true);
        } else {
          this.overlay.append('circle').attr('cx', this.xs(near.x)).attr('cy', this.ys(near.y)).attr('r', 5)
            .attr('fill', near.fn.col).attr('stroke', 'white').attr('stroke-width', 1.5);
        }
      } else {
        text = 'x = ' + fmtDE(this.xs.invert(mx)) + '  |  y = ' + fmtDE(this.ys.invert(my));
      }
      this.els.crd.textContent = text;
      this.els.crd.classList.add('visible');
    },

    // ── Auswahlrechteck ──
    toggleSelection() {
      if (this.integral) this._hideIntegral();
      if (this.tangentMode) this.toggleTangent();
      this.selectionMode = !this.selectionMode;
      this.els.sel.classList.toggle('active', this.selectionMode);
      this.svg.classed('mode-cross', this.selectionMode);
      if (!this.selectionMode) this.selectionRect = null;
      this.repaint();
    },

    _selDown(e) {
      const [mx, my] = this._localPoint(e);
      this._selActive = true;
      this.selectionRect = { x0: mx, y0: my, x1: mx, y1: my };
    },

    _selMove(e) {
      if (!this._selActive || !this.selectionRect) return;
      const [mx, my] = this._localPoint(e);
      this.selectionRect.x1 = clamp(mx, this.PL, this.PR);
      this.selectionRect.y1 = clamp(my, this.PT, this.PB);
      this.repaint();
    },

    _selUp() {
      if (!this._selActive) return;
      this._selActive = false;
      if (this.selectionRect) {
        const dx = Math.abs(this.selectionRect.x1 - this.selectionRect.x0);
        const dy = Math.abs(this.selectionRect.y1 - this.selectionRect.y0);
        if (dx < 5 || dy < 5) this.selectionRect = null;
        else this._toast('Export nutzt jetzt die Auswahl – Doppelklick zoomt hinein');
      }
      this.repaint();
    },

    _getSelectionBounds() {
      if (!this.selectionRect) return null;
      const s = this.selectionRect;
      const x0 = Math.min(s.x0, s.x1), x1 = Math.max(s.x0, s.x1);
      const y0 = Math.min(s.y0, s.y1), y1 = Math.max(s.y0, s.y1);
      return { xMin: this.xs.invert(x0), xMax: this.xs.invert(x1), yMin: this.ys.invert(y1), yMax: this.ys.invert(y0) };
    },

    // ── Tangente & Normale ──
    toggleTangent() {
      if (this.selectionMode) this.toggleSelection();
      this.tangentMode = !this.tangentMode;
      this.els.tan.classList.toggle('active', this.tangentMode);
      this.svg.classed('mode-cross', this.tangentMode);
      if (!this.tangentMode) this.tangent = null;
      else this._toast('Über einen Graphen fahren – Klick hält die Tangente fest');
      this.repaint();
    },

    _tangentAt(fn, x) {
      const y = fn.f(x);
      const m = this._derivs(fn).d1(x);
      return { fnId: fn.id, x, y, m: isFinite(m) ? m : NaN, col: fn.col };
    },

    _tangentClick(e) {
      const [mx, my] = this._localPoint(e);
      const near = this._nearest(mx, my, 60);
      if (!near) return;
      this.tangent = this._tangentAt(near.fn, near.x);
      this.repaint();
    },

    paintTangent(g0, tg, preview) {
      if (!tg || !isFinite(tg.y) || !isFinite(tg.m)) return;
      const { x, y, m, col } = tg;
      const g = g0.append('g').attr('opacity', preview ? 0.75 : 1);
      const clip = g.append('g').attr('clip-path', 'url(#plot-clip)');
      const [x0, x1] = this.xs.domain();
      const line = (slope, isVertical) => {
        if (isVertical) return [this.xs(x), this.PT, this.xs(x), this.PB];
        return [this.xs(x0), this.ys(y + slope * (x0 - x)), this.xs(x1), this.ys(y + slope * (x1 - x))];
      };
      const [a1, b1, a2, b2] = line(m);
      clip.append('line').attr('x1', a1).attr('y1', b1).attr('x2', a2).attr('y2', b2)
        .attr('stroke', col).attr('stroke-width', 2).attr('stroke-dasharray', '8,4');
      const flat = Math.abs(m) < 1e-12;
      const [c1, d1, c2, d2] = line(flat ? 0 : -1 / m, flat);
      clip.append('line').attr('x1', c1).attr('y1', d1).attr('x2', c2).attr('y2', d2)
        .attr('stroke', col).attr('stroke-width', 1.5).attr('stroke-dasharray', '2,4').attr('opacity', 0.8);

      // Steigungsdreieck mit Δx = 1 (oder passender Einheit bei starkem Zoom)
      const ppu = Math.abs(this.xs(1) - this.xs(0));
      const dxu = ppu >= 30 && ppu <= 300 ? 1 : niceStep(80 / ppu);
      const tx = x + dxu, ty = y + m * dxu;
      const ink = this.style.axisColor;
      clip.append('polygon').attr('points', `${this.xs(x)},${this.ys(y)} ${this.xs(tx)},${this.ys(y)} ${this.xs(tx)},${this.ys(ty)}`)
        .attr('fill', col).attr('fill-opacity', 0.12).attr('stroke', ink).attr('stroke-width', 1.2);
      const fs = Math.max(11, this.style.fontSize * 0.8);
      const halo = (s) => s.attr('stroke', this._theme().plotBg).attr('stroke-width', 3).attr('paint-order', 'stroke');
      halo(clip.append('text').attr('x', this.xs(x + dxu / 2)).attr('y', this.ys(y) + (m > 0 ? fs + 2 : -6))
        .attr('text-anchor', 'middle').attr('font-size', fs).attr('fill', ink).attr('font-weight', '500'))
        .text('Δx = ' + fmtDE(dxu));
      halo(clip.append('text').attr('x', this.xs(tx) + 6).attr('y', this.ys((y + ty) / 2) + 4)
        .attr('font-size', fs).attr('fill', ink).attr('font-weight', '500'))
        .text('Δy = ' + fmtDE(m * dxu));

      g.append('circle').attr('cx', this.xs(x)).attr('cy', this.ys(y))
        .attr('r', 5).attr('fill', col).attr('stroke', 'white').attr('stroke-width', 1.5);
      const lin = (k, d) => {
        const ks = Math.abs(k - 1) < 1e-12 ? '' : Math.abs(k + 1) < 1e-12 ? '-' : fmtDE(k);
        const xs = Math.abs(k) < 1e-12 ? '' : ks + 'x';
        if (!xs) return 'y = ' + fmtDE(d);
        if (Math.abs(d) < 1e-12) return 'y = ' + xs;
        return 'y = ' + xs + (d > 0 ? ' + ' : ' − ') + fmtDE(Math.abs(d));
      };
      const lines = ['m = ' + fmtDE(m), 't: ' + lin(m, y - m * x), 'n: ' + (flat ? 'x = ' + fmtDE(x) : lin(-1 / m, y + x / m))];
      const px = this.xs(x), py = this.ys(y);
      const right = px < (this.PL + this.PR) / 2;
      const tbox = halo(g.append('text').attr('x', px + (right ? 12 : -12)).attr('y', py - 12 - (lines.length - 1) * fs * 1.2)
        .attr('text-anchor', right ? 'start' : 'end').attr('font-size', fs).attr('fill', col).attr('font-weight', '700'));
      lines.forEach((s, i) => tbox.append('tspan').attr('x', px + (right ? 12 : -12)).attr('dy', i ? fs * 1.2 : 0).text(s));
    },

    // ── Integral ──
    _showIntegral(f) {
      if (this.tangentMode) this.toggleTangent();
      if (this.selectionMode) this.toggleSelection();
      if (!f.f) { this._toast('Funktion ist fehlerhaft'); return; }
      const [d0, d1] = this.xs.domain();
      const span = (d1 - d0) / 4;
      const mid = (d0 + d1) / 2;
      const s = niceStep(span / 2);
      this.integral = { fnId: f.id, a: Math.round((mid - span / 2) / s) * s, b: Math.round((mid + span / 2) / s) * s };
      if (this.integral.a === this.integral.b) this.integral.b += s;
      this.els.cib.style.display = '';
      this.repaint();
    },

    _hideIntegral() {
      this.integral = null;
      this.els.cib.style.display = 'none';
      this.repaint();
    },

    // Simpson-Regel; liefert orientierten Wert und Flächeninhalt
    _computeIntegral(f, a, b) {
      const N = 2000, h = (b - a) / N;
      let s = 0, sa = 0;
      for (let i = 0; i <= N; i++) {
        const y = f(a + i * h);
        if (!isFinite(y)) return { value: NaN, area: NaN };
        const w = i === 0 || i === N ? 1 : i % 2 ? 4 : 2;
        s += w * y; sa += w * Math.abs(y);
      }
      return { value: s * h / 3, area: sa * h / 3 };
    },

    paintIntegral() {
      if (!this.integral) return;
      const fn = this.fns.find(f => f.id === this.integral.fnId);
      if (!fn || !fn.f) { this.integral = null; this.els.cib.style.display = 'none'; return; }
      const { a, b } = this.integral;
      const xs = this.xs, ys = this.ys;
      const g = this.root.append('g').attr('class', 'integral-group');
      const clip = g.append('g').attr('clip-path', 'url(#plot-clip)');
      const N = 400, y0 = ys(0), H = this.PB - this.PT;
      const pts = [[xs(a), y0]];
      for (let i = 0; i <= N; i++) {
        const x = a + (b - a) * i / N;
        const y = fn.f(x);
        pts.push([xs(x), isFinite(y) ? clamp(ys(y), this.PT - 2 * H, this.PB + 2 * H) : y0]);
      }
      pts.push([xs(b), y0]);
      clip.append('path').attr('d', d3.line()(pts) + 'Z')
        .attr('fill', fn.col).attr('fill-opacity', 0.22).attr('stroke', 'none');

      const { value, area } = this._computeIntegral(fn.f, a, b);
      const pxA = xs(a), pxB = xs(b);
      [pxA, pxB].forEach(px => clip.append('line').attr('x1', px).attr('y1', this.PT).attr('x2', px).attr('y2', this.PB)
        .attr('stroke', fn.col).attr('stroke-width', 2).attr('stroke-dasharray', '6,4'));

      const fs = Math.max(12, this.style.fontSize);
      const midX = clamp((pxA + pxB) / 2, this.PL + 90, this.PR - 90);
      const txt = g.append('text').attr('x', midX).attr('y', this.PT + fs + 4)
        .attr('text-anchor', 'middle').attr('fill', fn.col).attr('font-size', fs).attr('font-weight', 'bold')
        .attr('stroke', this._theme().plotBg).attr('stroke-width', 3).attr('paint-order', 'stroke')
        .attr('class', 'integral-label');
      if (isFinite(value)) {
        txt.append('tspan').attr('x', midX).text('∫ ' + fn.letter + '(x) dx = ' + fmtDE(value, 4));
        txt.append('tspan').attr('x', midX).attr('dy', fs * 1.25).attr('font-weight', '500').text('Fläche A = ' + fmtDE(area, 4));
      } else {
        txt.text('Integral existiert nicht (Definitionslücke)');
      }
      const lbl = (px, s) => g.append('text').attr('x', px).attr('y', this.PB - 6).attr('text-anchor', 'middle')
        .attr('font-size', fs * 0.85).attr('font-weight', '600').attr('fill', fn.col)
        .attr('stroke', this._theme().plotBg).attr('stroke-width', 3).attr('paint-order', 'stroke').text(s);
      lbl(pxA, 'a = ' + fmtDE(a));
      lbl(pxB, 'b = ' + fmtDE(b));

      const snap = (x) => { const s = this.ticks().x.step / 20; return Math.round(x / s) * s; };
      const handle = (px, key) => g.append('rect').attr('x', px - 7).attr('y', this.PT).attr('width', 14).attr('height', this.PB - this.PT)
        .attr('fill', 'transparent').attr('cursor', 'ew-resize')
        .call(d3.drag().container(this.svg.node())
          .on('start', (ev) => { if (ev.sourceEvent) ev.sourceEvent.stopPropagation(); })
          .on('drag', (ev) => {
            if (!this.integral) return;
            const [d0, d1] = this.xs.domain();
            const x = snap(clamp(this.xs.invert(ev.x), d0, d1));
            if (key === 'a') this.integral.a = Math.min(x, this.integral.b - 1e-9);
            else this.integral.b = Math.max(x, this.integral.a + 1e-9);
            this.repaint();
          }));
      handle(pxA, 'a');
      handle(pxB, 'b');
    },

    // ══════════════════ Farbthemen ══════════════════
    themes: {
      standard: {
        colors: ['#0066DD', '#DD2200', '#1EA84C', '#E68A00', '#8B3FAD', '#3399CC', '#CC0044', '#4444AA'],
        plotBg: '#FFFFFF', title: '#444444',
        style: { axisColor: '#222222', gridColor: '#D2D2D2', axisWidth: 2, gridWidth: 1 },
      },
      projektor: {
        colors: ['#0044CC', '#CC0000', '#007A33', '#CC7A00', '#660099', '#006699', '#990033', '#333399'],
        plotBg: '#FFFFFF', title: '#111111',
        style: { axisColor: '#000000', gridColor: '#B4B4B4', axisWidth: 3, gridWidth: 1.5 },
      },
      dunkel: {
        colors: ['#66B2FF', '#FF6666', '#66CC88', '#FFBB55', '#BB88EE', '#55CCEE', '#FF7799', '#9999EE'],
        plotBg: '#1C1C1E', title: '#E5E5EA', dark: true,
        style: { axisColor: '#CCCCCC', gridColor: '#444444', axisWidth: 2, gridWidth: 1 },
      },
    },

    _theme() { return this.themes[this.theme] || this.themes.standard; },

    _applyThemeColors(name) {
      const t = this.themes[name];
      COLORS.length = 0; COLORS.push(...t.colors);
      document.documentElement.dataset.theme = t.dark ? 'dark' : 'light';
    },

    applyTheme(name) {
      const t = this.themes[name];
      if (!t) return;
      this.theme = name;
      this._applyThemeColors(name);
      this.fns.forEach((fn, i) => { fn.col = COLORS[i % COLORS.length]; });
      Object.assign(this.style, t.style);
      this._syncControls();
      this.sync();
      this.repaint();
    },

    // ══════════════════ Wertetabelle ══════════════════

    _tableRows() {
      const num = (el, d) => { const v = parseFloat(el.value); return isFinite(v) ? v : d; };
      const a = num(this.els.tblStart, -5), b = num(this.els.tblEnd, 5);
      const step = Math.abs(num(this.els.tblStep, 1));
      if (!(step > 0) || b < a) return { error: 'Bitte Start ≤ Ende und Schrittweite > 0 wählen' };
      const n = Math.floor((b - a) / step + 1e-9) + 1;
      if (n > 1000) return { error: 'Höchstens 1000 Zeilen – Schrittweite vergrößern' };
      const fns = this.fns.filter(f => f.vis && f.f);
      const rows = [];
      for (let i = 0; i < n; i++) {
        const x = +(a + i * step).toFixed(10);
        rows.push([x, ...fns.map(f => f.f(x))]);
      }
      return { fns, rows };
    },

    renderTable() {
      const el = this.els.tbl;
      if (!this._tableOn) return;
      const t = this._tableRows();
      if (t.error) { el.innerHTML = '<div class="input-error">' + esc(t.error) + '</div>'; return; }
      if (!t.fns.length) { el.innerHTML = '<div class="setting-hint">Keine sichtbaren Funktionen</div>'; return; }
      let h = '<table><thead><tr><th>x</th>' + t.fns.map(f => `<th style="color:${esc(f.col)}">${esc(f.letter)}(x)</th>`).join('') + '</tr></thead><tbody>';
      t.rows.forEach(r => { h += '<tr>' + r.map(v => '<td>' + fmtDE(v, 4) + '</td>').join('') + '</tr>'; });
      el.innerHTML = h + '</tbody></table>';
    },

    exportCSV() {
      const t = this._tableRows();
      if (t.error) { this._toast(t.error); return; }
      if (!t.fns.length) { this._toast('Keine sichtbaren Funktionen'); return; }
      // Semikolon und Dezimalkomma: öffnet sich in deutschem Excel/LibreOffice direkt richtig
      const cell = (v) => isFinite(v) ? String(+v.toPrecision(12)).replace('.', ',') : '';
      const lines = [['x', ...t.fns.map(f => f.letter + '(x)')].join(';')];
      t.rows.forEach(r => lines.push(r.map(cell).join(';')));
      this._download(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), this._fileBase() + '-wertetabelle.csv');
    },

    // ══════════════════ Export / Import ══════════════════

    _fileBase() {
      return (this.graphTitle || 'plotoria-graph').replace(/[^a-zA-Z0-9äöüÄÖÜß \-]/g, '').trim().replace(/\s+/g, '-') || 'plotoria-graph';
    },

    _download(blob, name) {
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = u; a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(u), 1000);
    },

    // SVG-Quelltext erzeugen; bei aktiver Auswahl nur diesen Bereich
    _svgString() {
      const sel = this._getSelectionBounds();
      const saved = { xs: this.xs, ys: this.ys, sel: this.selectionRect };
      this._exporting = true;
      if (sel) {
        this.xs = d3.scaleLinear().domain([sel.xMin, sel.xMax]).range([this.PL, this.PR]);
        this.ys = d3.scaleLinear().domain([sel.yMin, sel.yMax]).range([this.PB, this.PT]);
        this.selectionRect = null;
      }
      this.repaint();
      const c = this.svg.node().cloneNode(true);
      c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      c.setAttribute('viewBox', `0 0 ${this.W} ${this.H}`);
      c.removeAttribute('class');
      let s = new XMLSerializer().serializeToString(c);
      s = s.replace(/(<svg[^>]*>)/, '$1\n  <title>' + esc(this.graphTitle || 'Plotoria') + '</title>');
      s = '<?xml version="1.0" standalone="no"?>\n' + s;
      if (sel) { this.xs = saved.xs; this.ys = saved.ys; this.selectionRect = saved.sel; }
      this._exporting = false;
      this.repaint();
      return { svg: s, partial: !!sel };
    },

    exportSVG() {
      const { svg, partial } = this._svgString();
      this._download(new Blob([svg], { type: 'image/svg+xml' }), this._fileBase() + (partial ? '-auswahl' : '') + '.svg');
      this._toast(partial ? 'SVG der Auswahl exportiert' : 'SVG exportiert');
    },

    _pngBlob(scale = 2) {
      const { svg } = this._svgString();
      return new Promise((resolve, reject) => {
        const img = new Image();
        const u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        img.onload = () => {
          const cv = document.createElement('canvas');
          cv.width = this.W * scale; cv.height = this.H * scale;
          const ctx = cv.getContext('2d');
          ctx.fillStyle = this._theme().plotBg;
          ctx.fillRect(0, 0, cv.width, cv.height);
          ctx.drawImage(img, 0, 0, cv.width, cv.height);
          URL.revokeObjectURL(u);
          cv.toBlob(b => b ? resolve(b) : reject(new Error('PNG fehlgeschlagen')), 'image/png');
        };
        img.onerror = () => { URL.revokeObjectURL(u); reject(new Error('Bild konnte nicht erzeugt werden')); };
        img.src = u;
      });
    },

    exportPNG() {
      this._pngBlob().then(b => {
        this._download(b, this._fileBase() + '.png');
        this._toast('PNG exportiert');
      }).catch(e => this._toast(e.message));
    },

    copyImage() {
      if (!navigator.clipboard || !window.ClipboardItem) {
        this._toast('Bild kopieren wird von diesem Browser nicht unterstützt – bitte PNG exportieren');
        return;
      }
      // Promise direkt übergeben, damit Safari die Nutzeraktion akzeptiert
      navigator.clipboard.write([new ClipboardItem({ 'image/png': this._pngBlob() })])
        .then(() => this._toast('Bild in die Zwischenablage kopiert'))
        .catch(() => this._toast('Kopieren nicht erlaubt – bitte PNG exportieren'));
    },

    exportTikZ() {
      const b = this._getSelectionBounds() || this._viewObj(true);
      const fns = this.fns.filter(f => f.vis && f.ast).map(f => ({ ...f, letterTeX: letterTeX(f.letter) }));
      const skipped = this.fns.filter(f => f.vis && f.f && !f.ast).length;
      // Im DEG-Modus rechnet pgfplots direkt im Gradmaß – außer es gibt Ableitungen,
      // die bereits ins Bogenmaß umgerechnet sind. Dann alles einheitlich im Bogenmaß.
      const deg = this.deg && !fns.some(f => f.rad);
      const list = deg || !this.deg ? fns : fns.map(f => (f.rad ? f : { ...f, ast: MP.radianize(f.ast) }));
      const c = TikZ.generate(list, b, {
        title: this.graphTitle, xLabel: this.style.xLabel, yLabel: this.style.yLabel,
        params: this.params, deg,
      });
      this._copy(c, 'TikZ-Code kopiert' + (this.selectionRect ? ' (Auswahl)' : '') + (skipped ? ' – numerische Ableitungen ausgelassen' : ''));
    },

    importTikZ() {
      const c = this.els.tza.value.trim();
      if (!c) return;
      const r = TikZ.parse(c);
      if (!r.functions.length) { this._toast('Keine \\addplot-Befehle gefunden'); return; }
      const errors = [];
      this.fns = []; this.ci = 0; this.integral = null; this.tangent = null;
      this.els.cib.style.display = 'none';
      if (r.degMode !== this.deg) { this.deg = r.degMode; }
      r.functions.forEach(expr => { const res = this._addDef(expr); if (res.error) errors.push(expr); });
      if (r.bounds) {
        Object.assign(this, r.bounds);
        this.home = this._viewObj();
        this.proportional = false;
      }
      this.els.tza.value = '';
      this.rebuild();
      this._rebuildView();
      this.sync();
      this.commit();
      this._toast(errors.length ? errors.length + ' Ausdruck/Ausdrücke nicht erkannt' : 'TikZ importiert' + (r.degMode ? ' (Gradmaß)' : ''));
    },

    // ══════════════════ Tastatur & Hilfe ══════════════════

    toggleHelp(show) {
      this.els.modal.hidden = !show;
      if (show) this.els.modalClose.focus();
    },

    _onKey(e) {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      if (e.key === 'Escape') {
        if (!this.els.modal.hidden) { this.toggleHelp(false); return; }
        if (typing) return;
        if (this.tangentMode) this.toggleTangent();
        else if (this.selectionMode) this.toggleSelection();
        else if (this.integral) this._hideIntegral();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase();
        if (typing && tag !== 'select') return;   // Undo im Textfeld bleibt Sache des Browsers
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); this.undo(); }
        else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); this.redo(); }
        return;
      }
      if (typing || e.altKey) return;
      if (e.key === 'Home') { e.preventDefault(); this.resetView(); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); this.zoomBy(1.25); }
      else if (e.key === '-') { e.preventDefault(); this.zoomBy(0.8); }
      else if (e.key === '?') { e.preventDefault(); this.toggleHelp(this.els.modal.hidden); }
    },

    // ══════════════════ Hilfsfunktionen ══════════════════

    _copy(t, msg) {
      const ok = () => this._toast(msg || 'In Zwischenablage kopiert');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(ok).catch(() => this._fcopy(t, msg));
      } else { this._fcopy(t, msg); }
    },
    _fcopy(t, msg) {
      const ta = document.createElement('textarea');
      ta.value = t; ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); this._toast(msg || 'In Zwischenablage kopiert'); }
      catch (e) { this._toast('Kopieren fehlgeschlagen'); }
      document.body.removeChild(ta);
    },

    _toast(msg) {
      const e = document.querySelector('.toast'); if (e) e.remove();
      const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
      document.body.appendChild(t);
      requestAnimationFrame(() => t.classList.add('visible'));
      setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 300); }, 2400);
    },

    _shake(el) {
      el.style.borderColor = '#FF3B30';
      el.style.animation = 'shake 0.3s ease';
      setTimeout(() => { el.style.borderColor = ''; el.style.animation = ''; }, 300);
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Plotoria.init());
  } else {
    Plotoria.init();
  }
})();
