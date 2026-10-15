// Plotoria 2.0 – Kern: Zustand, Funktionen, Zeichnen, Werkzeuge
// Module (objects.js, data.js, export.js, templates.js) erweitern dieses Objekt per Object.assign.
(() => {
  const $ = id => document.getElementById(id);
  const MP = MathParser;

  const VERSION = '2.0';
  const COLORS = ['#007AFF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE', '#5AC8FA', '#FF2D55', '#5856D6'];
  const STORAGE_KEY = 'plotoria-state-v1';
  const DEFAULT_VIEW = { xMin: -4, xMax: 5, yMin: -10, yMax: 10 };
  const DEFAULT_STYLE = {
    gridWidth: 1, gridColor: '#D1D1D6', axisWidth: 2, axisColor: '#1C1C1E', fontSize: 14, labelSize: 18,
    xLabel: 'x', yLabel: 'y', xStep: '', yStep: '', xFmt: 'dec', yFmt: 'dec', sub: 'auto',
    gridMode: 'grid', karo: 2, bw: false, exact: false,
  };
  const BW_DASHES = ['solid', 'dash', 'dot', 'dashdot'];
  const CM = 96 / 2.54;   // Pixel pro Zentimeter (CSS-Pixel)

  // ── Hilfsfunktionen ──
  const fmtDE = (v, digits = 3) => {
    if (!isFinite(v)) return '–';
    if (Math.abs(v) < 1e-10) return '0';
    const a = Math.abs(v);
    if (a >= 1e6 || a < 1e-3) return v.toExponential(2).replace('.', ',').replace('-', '−');
    return String(parseFloat(v.toFixed(digits))).replace('.', ',').replace('-', '−');
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
  const letterTeX = (l) => l.replace(/⁻¹$/, '^{-1}').replace(/^([a-zA-Z])(\d+)/, '$1_{$2}').replace(/^([a-zA-Z])_([a-zA-Z])/, '$1_{$2}');

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

  // Achsenbeschriftung als Vielfaches von π oder als Bruch
  function fmtAxis(v, fmt, dec) {
    if (fmt === 'pi') {
      const r = Numerics.rational(v / Math.PI, 24);
      if (r) {
        if (r.p === 0) return '0';
        const num = (Math.abs(r.p) === 1 ? '' : Math.abs(r.p)) + 'π';
        return (r.p < 0 ? '−' : '') + num + (r.q === 1 ? '' : '/' + r.q);
      }
    } else if (fmt === 'frac') {
      const r = Numerics.rational(v, 64);
      if (r) return (r.p < 0 ? '−' : '') + Math.abs(r.p) + (r.q === 1 ? '' : '/' + r.q);
    }
    return fmtDE(v, Math.min(6, dec));
  }

  window.Plotoria = {
    VERSION, COLORS, CM, STORAGE_KEY, storageOK: false, fmtDE, esc, clamp, niceStep, letterTeX, decimalsOf, bisect,
    fns: [], objs: [], datasets: [], ci: 0, nextId: 1,
    ...DEFAULT_VIEW,
    home: { ...DEFAULT_VIEW },
    pad: { l: 55, r: 35, t: 35, b: 55 },
    style: { ...DEFAULT_STYLE },
    params: {}, paramMeta: {},
    integral: null, smartLabels: false, selectionRect: null,
    proportional: true, graphTitle: '', tangent: null, tool: 'move',
    deg: false, theme: 'auto', labelOffsets: {}, selected: null,
    hist: [], histPos: -1,
    // Render-Kontext: was gezeichnet wird (Bildschirm oder Export)
    rc: null,

    get selectionMode() { return this.tool === 'select'; },
    get tangentMode() { return this.tool === 'tangent'; },

    init() {
      this.svg = d3.select('#graph-container');
      this._initSvg(this.svg);
      this.curT = d3.zoomIdentity;

      this.zoom = d3.zoom().scaleExtent([1e-4, 1e5])
        .filter((e) => {
          if (e.type === 'wheel') return true;
          if (e.button) return false;
          if (e.type === 'dblclick') return this.tool === 'move';
          return this.tool === 'move' || this.tool === 'tangent';
        })
        .on('zoom', (e) => {
          this.curT = e.transform;
          this.xs = this.curT.rescaleX(this.baseX);
          this.ys = this.curT.rescaleY(this.baseY);
          this.repaint();
        })
        .on('end', () => { this._syncControls(); this._scheduleSave(); });
      this.svg.call(this.zoom);

      this.els = {
        inp: $('func-input'), err: $('input-error'), prev: $('input-preview'), add: $('btn-add'),
        lst: $('func-list'), emp: $('empty-state'), crd: $('coord-display'),
        hint: $('tool-hint'), hintText: $('tool-hint-text'), hintClose: $('tool-hint-close'),
        toolSeg: $('tool-seg'), tabSeg: $('tab-seg'), angleSeg: $('angle-seg'),
        rst: $('reset-view'), zin: $('zoom-in'), zout: $('zoom-out'),
        cpy: $('copy-image'), shr: $('share-link'),
        xminI: $('set-xmin'), xmaxI: $('set-xmax'), yminI: $('set-ymin'), ymaxI: $('set-ymax'),
        prop: $('set-proportional'), xlabI: $('set-xlabel'), ylabI: $('set-ylabel'),
        xstep: $('set-xstep'), ystep: $('set-ystep'), xfmt: $('set-xfmt'), yfmt: $('set-yfmt'), sub: $('set-sub'),
        gridMode: $('grid-mode'), karo: $('set-karo'), karoRow: $('karo-row'), karoHint: $('karo-hint'),
        theme: $('theme-select'), bw: $('set-bw'), fontS: $('set-font-size'),
        axisW: $('set-axis-width'), gridW: $('set-grid-width'), axisC: $('set-axis-color'), gridC: $('set-grid-color'),
        exact: $('set-exact'), smart: $('smart-labels'),
        pGroup: $('param-group'), pList: $('param-list'), pAdd: $('add-param'), pName: $('param-name-input'), pVal: $('param-value-input'),
        pToggle: $('param-add-toggle'), pAddRow: $('param-add-row'),
        hTitle: $('header-title'), undo: $('undo-btn'), redo: $('redo-btn'), help: $('help-btn'), modal: $('help-modal'),
      };
      const E = this.els;
      Icons.hydrate();

      // Eingabe
      E.add.addEventListener('click', () => this.addFunc());
      E.inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); this.addFunc(); }
        if (e.key === 'Escape') { E.inp.value = ''; this._showInputState(); }
      });
      E.inp.addEventListener('input', () => { clearTimeout(this._pt); this._pt = setTimeout(() => this._showInputState(), 120); });

      // Werkzeuge
      this.segmented(E.toolSeg, (v) => this.setTool(v), 'tool');
      E.hintClose.addEventListener('click', () => this._escape());
      // Integral: Fläche oder Riemann-Summe mit n Rechtecken
      this.segmented($('int-mode'), (v) => { if (this.integral) { this.integral.mode = v; this._syncIntegralCtl(); this.repaint(); } });
      const setN = (n) => { if (!this.integral) return; this.integral.n = clamp(Math.round(n) || 1, 1, 200); this._syncIntegralCtl(); this.repaint(); };
      $('int-n').addEventListener('change', (e) => setN(+e.target.value));
      $('int-n-minus').addEventListener('click', () => this.integral && setN(this.integral.n > 10 ? this.integral.n - (this.integral.n > 40 ? 10 : 2) : this.integral.n - 1));
      $('int-n-plus').addEventListener('click', () => this.integral && setN(this.integral.n >= 10 ? this.integral.n + (this.integral.n >= 40 ? 10 : 2) : this.integral.n + 1));
      E.rst.addEventListener('click', () => this.resetView());
      E.zin.addEventListener('click', () => this.zoomBy(1.4));
      E.zout.addEventListener('click', () => this.zoomBy(1 / 1.4));
      E.cpy.addEventListener('click', () => this.copyImage());
      E.shr.addEventListener('click', () => this.shareLink());

      // Seitenleiste
      this.segmented(E.tabSeg, (v) => this.switchTab(v), 'tab');
      this.segmented(E.angleSeg, (v) => this.setAngleMode(v === 'deg'));
      E.smart.addEventListener('change', () => { this.smartLabels = E.smart.checked; this.repaint(); this.commit(); });
      E.pAdd.addEventListener('click', () => this.addParam());
      E.pName.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.addParam(); } });
      E.pToggle.addEventListener('click', () => { E.pAddRow.hidden = !E.pAddRow.hidden; if (!E.pAddRow.hidden) E.pName.focus(); this._syncParamGroup(); });
      E.hTitle.addEventListener('input', () => { this.graphTitle = E.hTitle.value.trim(); this.repaint(); });
      E.hTitle.addEventListener('change', () => this.commit());
      E.undo.addEventListener('click', () => this.undo());
      E.redo.addEventListener('click', () => this.redo());
      E.help.addEventListener('click', () => this.openSheet('help-modal'));
      $('empty-templates').addEventListener('click', () => this.openTemplates && this.openTemplates());

      // Darstellung: Änderungen wirken sofort
      [E.xminI, E.xmaxI, E.yminI, E.ymaxI].forEach(el => el.addEventListener('change', () => this.applyWindow()));
      E.prop.addEventListener('change', () => {
        this.proportional = E.prop.checked;
        if (this.proportional) { this._takeCurrentView(); this._applyProportional(); this._rebuildView(); }
        this.commit();
      });
      const styleInput = (el, key, parse, ev = 'change') => el.addEventListener(ev, () => {
        this.style[key] = parse(el.value);
        this._ticksCache = null;
        this.repaint();
        if (ev === 'change') this.commit(); else { clearTimeout(this._sc); this._sc = setTimeout(() => this.commit(), 500); }
      });
      styleInput(E.xlabI, 'xLabel', v => v || 'x', 'input');
      styleInput(E.ylabI, 'yLabel', v => v || 'y', 'input');
      [[E.xstep, 'xStep'], [E.ystep, 'yStep']].forEach(([el, key]) => el.addEventListener('change', () => {
        const v = el.value.trim();
        if (v && !(MP.evalConst(v) > 0)) { this._toast('Schritt muss eine positive Zahl sein, z. B. 2 oder pi/2'); el.value = this.style[key]; return; }
        this.style[key] = v;
        this.repaint(); this.commit();
      }));
      styleInput(E.xfmt, 'xFmt', v => v);
      styleInput(E.yfmt, 'yFmt', v => v);
      styleInput(E.sub, 'sub', v => v === 'auto' ? 'auto' : +v);
      styleInput(E.fontS, 'fontSize', v => +v, 'input');
      styleInput(E.axisW, 'axisWidth', v => +v, 'input');
      styleInput(E.gridW, 'gridWidth', v => +v, 'input');
      styleInput(E.axisC, 'axisColor', v => v, 'input');
      styleInput(E.gridC, 'gridColor', v => v, 'input');
      E.bw.addEventListener('change', () => { this.style.bw = E.bw.checked; this.sync(); this.repaint(); this.commit(); });
      E.exact.addEventListener('change', () => { this.style.exact = E.exact.checked; this.repaint(); this.commit(); });
      this.segmented(E.gridMode, (v) => this.setGridMode(v), 'value');
      E.karo.addEventListener('change', () => { this.style.karo = +E.karo.value; this.setGridMode('karo'); });
      $('karo-actual').addEventListener('click', () => this.showPrintSize());
      E.theme.addEventListener('change', () => { this.applyTheme(E.theme.value); this.commit(); });

      // Zeichenfläche: Zeiger-Ereignisse
      const svgNode = this.svg.node();
      svgNode.addEventListener('pointermove', (e) => {
        this._lastPointer = this._localPoint(e);
        if (this.tool === 'select') this._selMove(e);
        else if (this._toolMove) this._toolMove(e);
        this._refreshHover();
      });
      svgNode.addEventListener('pointerdown', (e) => {
        // Klick in den Graphen: Fokus aus Textfeldern nehmen, damit Tastenkürzel wirken
        const ae = document.activeElement;
        if (ae && ae !== document.body && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) ae.blur();
        if (e.button !== 0) return;
        if (this.tool === 'tangent') { this._tangentClick(e); return; }
        if (this.tool === 'select') { svgNode.setPointerCapture(e.pointerId); this._selDown(e); return; }
        if (this._toolDown && this._toolDown(e)) svgNode.setPointerCapture(e.pointerId);
      });
      svgNode.addEventListener('pointerup', (e) => {
        if (this.tool === 'select') this._selUp();
        else if (this._toolUp) this._toolUp(e);
      });
      svgNode.addEventListener('pointerleave', () => {
        this._lastPointer = null;
        this.overlay.selectAll('*').remove();
        this.els.crd.classList.remove('visible');
      });
      svgNode.addEventListener('dblclick', (e) => {
        if (this.tool === 'select' && this.selectionRect) { e.preventDefault(); this.zoomToSelection(); }
      });

      document.addEventListener('keydown', (e) => this._onKey(e));
      document.querySelectorAll('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
      document.querySelectorAll('dialog.sheet:not([data-no-dismiss])').forEach(d => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));
      window.addEventListener('resize', () => { clearTimeout(this._rt); this._rt = setTimeout(() => this.resize(), 80); });
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (this.theme === 'auto') this.applyTheme('auto', { keepColors: true }); });
      }

      // Module
      ['initObjects', 'initData', 'initExport', 'initTemplates', 'initDiscussion'].forEach(n => this[n] && this[n]());

      const st = this._loadStartupState();
      requestAnimationFrame(() => {
        this._measure();
        if (st) this.load(st);
        else {
          this.applyTheme('auto', { keepColors: true });
          this._applyProportional(); this.home = this._viewObj(); this.buildScales();
          this.rebuild(); this.sync(); this.syncParams();
        }
        this._syncControls();
        this.repaint();
        this.commit();
        if (this.askConsent) this.askConsent();
        else if (window.matchMedia && !window.matchMedia('(pointer: coarse)').matches) E.inp.focus();
      });
    },

    // Eindeutige IDs je SVG, damit Vorschau und Hauptgraph sich nicht in die Quere kommen
    _clipUrl() { return 'url(#' + (this._ids ? this._ids.clip : 'plot-clip') + ')'; },
    _hatchUrl() { return 'url(#' + (this._ids ? this._ids.hatch : 'hatch') + ')'; },

    _initSvg(svg, suffix) {
      const ids = { clip: 'plot-clip' + (suffix || ''), hatch: 'hatch' + (suffix || '') };
      const defs = svg.append('defs');
      const clip = defs.append('clipPath').attr('id', ids.clip).append('rect');
      // Schraffur für Flächen im Schwarz-Weiß-Druck
      defs.append('pattern').attr('id', ids.hatch).attr('patternUnits', 'userSpaceOnUse').attr('width', 7).attr('height', 7)
        .attr('patternTransform', 'rotate(45)')
        .append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 7).attr('stroke', '#000').attr('stroke-width', 1.2);
      const root = svg.append('g');
      const overlay = svg.append('g').attr('class', 'hover-overlay').attr('pointer-events', 'none');
      if (svg === this.svg) { this.clipRect = clip; this.root = root; this.overlay = overlay; this._ids = ids; }
      return { clip, root, overlay, ids };
    },

    // Segmented Control verdrahten
    segmented(el, onChange, attr) {
      const key = attr || 'value';
      el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        this.setSegmented(el, b.dataset[key]);
        onChange(b.dataset[key]);
      }));
    },
    setSegmented(el, value) {
      el.querySelectorAll('button').forEach(b => {
        const on = (b.dataset.value || b.dataset.tool || b.dataset.tab) === String(value);
        b.classList.toggle('active', on);
        b.setAttribute('aria-checked', on);
        if (b.getAttribute('role') === 'tab') b.setAttribute('aria-selected', on);
      });
    },

    switchTab(name) {
      document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + name));
      this.setSegmented(this.els.tabSeg, name);
      if (name === 'data' && this.renderTable) { this._tableOn = true; this.renderTable(); }
    },

    openSheet(id) {
      const d = $(id);
      if (!d.open) d.showModal();
    },

    // ══════════════════ Zustand, Undo/Redo, Speichern ══════════════════

    serialize() {
      const idx = new Map(this.fns.map((f, i) => [f.id, i]));
      const v = this._viewObj(true);
      const o = {
        v: 2, app: 'plotoria', title: this.graphTitle, deg: this.deg, theme: this.theme, smart: this.smartLabels,
        prop: this.proportional, style: { ...this.style },
        view: [v.xMin, v.xMax, v.yMin, v.yMax].map(n => +n.toPrecision(8)),
        home: [this.home.xMin, this.home.xMax, this.home.yMin, this.home.yMax],
        params: Object.fromEntries(Object.keys(this.params).map(k => [k, { v: this.params[k], ...this.paramMeta[k] }])),
        fns: this.fns.map(f => {
          const o = { l: f.letter, c: f.col, w: f.strokeWidth };
          if (f.deriv) o.d = [idx.get(f.deriv.of), f.deriv.order];
          else if (f.anti) o.a = [idx.get(f.anti.of), f.anti.c || [0]];
          else if (f.inv) { o.i = idx.get(f.inv.of); if (f.diag === false) o.dg = 0; }
          else o.s = f.def;
          if (!f.vis) o.h = 1;
          if (f.dash && f.dash !== 'solid') o.ds = f.dash;
          if (f.labelMode && f.labelMode !== 'name') o.lm = f.labelMode;
          if (f.labelText) o.lt = f.labelText;
          if (f.asym) o.as = 1;
          if (f.labelX != null) o.lp = [+f.labelX.toPrecision(6), +f.labelY.toPrecision(6)];
          return o;
        }),
      };
      if (this._serializeExtra) this._serializeExtra(o);
      return o;
    },

    load(st, opts) {
      opts = opts || {};
      this.graphTitle = st.title || '';
      this.deg = !!st.deg;
      this.smartLabels = !!st.smart;
      this.proportional = st.prop !== undefined ? !!st.prop : true;
      const style = { ...(st.style || {}) };
      // Version 1: einheitlicher Rasterschritt
      if (style.gridStep !== undefined && style.xStep === undefined) {
        style.xStep = style.yStep = style.gridStep > 0 ? String(style.gridStep) : '';
        delete style.gridStep;
      }
      this.theme = this.themes[st.theme] ? st.theme : 'auto';
      this.style = { ...DEFAULT_STYLE, ...style };
      this._applyThemeColors(this.theme);
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
          anti: o.a ? { of: o.a[0], c: o.a[1] } : null, inv: o.i !== undefined ? { of: o.i } : null, diag: o.dg !== 0,
          col: o.c || COLORS[i % COLORS.length], strokeWidth: o.w || 3, vis: !o.h,
          dash: o.ds === 1 ? 'dash' : (o.ds || 'solid'), labelMode: o.lm || 'name', labelText: o.lt || '', asym: !!o.as,
          labelX: o.lp ? o.lp[0] : null, labelY: o.lp ? o.lp[1] : null,
        };
      });
      this.fns.forEach(f => { [f.deriv, f.anti, f.inv].forEach(r => { if (r) r.of = ids[r.of]; }); });
      this.ci = this.fns.length;
      this.integral = null; this.tangent = null; this.labelOffsets = {}; this.selected = null;
      if (this.els.hint) this._syncIntegralCtl();
      if (this.els.hint && this.tool === 'move') this.els.hint.hidden = true;
      if (this._loadExtra) this._loadExtra(st);
      if (Array.isArray(st.home)) [this.home.xMin, this.home.xMax, this.home.yMin, this.home.yMax] = st.home;
      this.rebuild();
      if (!opts.keepView) {
        if (Array.isArray(st.view)) [this.xMin, this.xMax, this.yMin, this.yMax] = st.view;
        if (this.proportional) this._applyProportional();
        this._rebuildView();
      }
      this._syncControls();
      this.sync();
      this.syncParams();
      if (this.syncObjects) this.syncObjects();
      if (this.syncData) this.syncData();
      this.repaint();
    },

    _loadStartupState() {
      try {
        const m = location.hash.match(/^#s=(.+)$/);
        if (m) {
          const json = new TextDecoder().decode(Uint8Array.from(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));
          history.replaceState(null, '', location.pathname + location.search);
          this._fromLink = true;
          return JSON.parse(json);
        }
      } catch (e) { setTimeout(() => this._toast('Link konnte nicht gelesen werden'), 500); }
      // Gespeicherter Stand wird erst nach Zustimmung gelesen (siehe main.js)
      return null;
    },

    // Gespeicherten Arbeitsstand lesen – nur nach Zustimmung aufrufen
    _readStoredState() {
      try {
        const s = localStorage.getItem(STORAGE_KEY);
        return s ? JSON.parse(s) : null;
      } catch (e) { return null; }
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
      if (!this.storageOK) return;   // ohne Zustimmung nichts auf dem Gerät speichern
      clearTimeout(this._st);
      this._st = setTimeout(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.serialize())); } catch (e) { /* voll oder gesperrt */ }
      }, 400);
    },

    shareLink() {
      const st = this.serialize();
      delete st.print;   // Druckbogen ist zu groß für einen Link
      const bytes = new TextEncoder().encode(JSON.stringify(st));
      let bin = '';
      bytes.forEach(b => { bin += String.fromCharCode(b); });
      const enc = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      this._copy(location.origin + location.pathname + '#s=' + enc, 'Link in die Zwischenablage kopiert');
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

    _check(raw, self) {
      let d;
      try { d = MP.parseDefinition(raw); } catch (e) { return { error: e.message }; }
      if (d.kind === 'point' || d.kind === 'vline') {
        if (!this.checkObjectDef) return { error: 'Nicht unterstützt' };
        return this.checkObjectDef(d);
      }
      if (d.kind === 'derivative') {
        const parent = this.fns.find(f => f.letter === d.of);
        if (!parent) return { error: 'Funktion ' + d.of + ' existiert nicht' };
        return { d, parent };
      }
      if (d.letter && /^[xye]$/.test(d.letter)) return { error: d.letter + ' kann kein Funktionsname sein' };
      let letter = d.letter || (self && !self.deriv && !self.anti && !self.inv ? self.letter.replace(/_[a-zA-Z]$/, '') : MP.nextLetter(this._usedLetters(self).map(l => l.replace(/_[a-zA-Z]$/, ''))));
      if (d.family && !d.letter) letter += '_' + d.family.p;
      try {
        if (d.family && !d.family.vals) return { error: 'Werte für ' + d.family.p + ' angeben, z. B. „für ' + d.family.p + ' = 1, 2, 3“' };
        const ast = MP.parseFunction(d, { variable: d.variable, functions: this._fnContext(letter), self: letter });
        if (d.domain) {
          for (const b of [d.domain.min, d.domain.max]) {
            if (b !== null && !isFinite(MP.evalConst(b, this.params))) return { error: 'Grenze des Definitionsbereichs „' + b + '“ ist keine Zahl' };
          }
        }
        return { d, ast, letter };
      } catch (e) {
        return { error: e instanceof MP.ParseError ? e.message : 'Ungültiger Ausdruck' };
      }
    },

    _addDef(raw) {
      const c = this._check(raw);
      if (c.error) return c;
      if (c.obj) return this.addObjectDef(c);
      if (c.d.kind === 'derivative') {
        const letter = c.d.of + "'".repeat(c.d.order);
        if (this.fns.some(f => f.letter === letter)) return { error: letter + ' ist bereits vorhanden' };
        this._pushFn({ letter, deriv: { of: c.parent.id, order: c.d.order } });
        return {};
      }
      const existing = c.d.letter && this.fns.find(f => f.letter === c.letter);
      if (existing) {
        existing.def = raw; existing.deriv = null; existing.anti = null; existing.inv = null; existing.labelX = existing.labelY = null;
        this._afterFnChange();
        this._toast(c.letter + ' wurde neu definiert');
        return {};
      }
      this._pushFn({ letter: c.letter, def: raw });
      return {};
    },

    _pushFn(o) {
      this.fns.push({
        id: this.nextId++, vis: true, strokeWidth: 3, dash: 'solid', labelMode: 'name', labelText: '', asym: false,
        labelX: null, labelY: null, col: COLORS[this.ci++ % COLORS.length], def: null, deriv: null, anti: null, inv: null, diag: true, ...o,
      });
      this._afterFnChange();
    },

    _afterFnChange() {
      this.rebuild();
      this.sync();
      if (this.syncObjects) this.syncObjects();
      this.repaint();
      if (this._tableOn && this.renderTable) this.renderTable();
    },

    _fnContext(exceptLetter) {
      const ctx = {};
      this.fns.forEach(f => { if (!f.deriv && !f.anti && !f.inv && f.letter !== exceptLetter && /^[a-zA-Z]$/.test(f.letter)) ctx[f.letter] = { ast: f.ast || null }; });
      if (exceptLetter) ctx[exceptLetter] = { ast: null };
      return ctx;
    },

    _editFunc(fn, raw) {
      const c = this._check(raw, fn);
      if (c.error) { this._toast(c.error); return false; }
      if (c.obj) { this._toast('Hier bitte einen Funktionsterm eingeben'); return false; }
      if (c.d.kind === 'derivative') {
        if (c.parent === fn) { this._toast('Eine Funktion kann nicht ihre eigene Ableitung sein'); return false; }
        fn.deriv = { of: c.parent.id, order: c.d.order };
        fn.letter = c.d.of + "'".repeat(c.d.order);
        fn.def = null; fn.anti = null; fn.inv = null;
      } else {
        if (c.d.letter && c.letter !== fn.letter && this.fns.some(f => f !== fn && f.letter === c.letter)) {
          this._toast(c.letter + ' ist bereits vergeben'); return false;
        }
        fn.letter = c.letter; fn.def = raw; fn.deriv = null; fn.anti = null; fn.inv = null;
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

    rebuild() {
      this.fns.forEach(f => { f.ast = null; f.f = null; f.error = null; f._d = null; f.numeric = false; f.domain = null; });
      let pending = this.fns.slice();
      for (let pass = 0; pass <= this.fns.length && pending.length; pass++) {
        const still = [];
        pending.forEach(fn => { if (!this._build(fn)) still.push(fn); });
        if (still.length === pending.length) break;
        pending = still;
      }
      pending.forEach(fn => { if (!fn.error) fn.error = 'Nicht auswertbar'; });
      if (this._buildObj) this.objs.forEach(o => this._buildObj(o));
      this._syncAutoParams();
      this._anaCache = null;
    },

    // Ausgangsfunktion einer abgeleiteten Funktion (Ableitung, Stammfunktion, Umkehrung)
    _parentOf(fn) {
      const ref = fn.deriv || fn.anti || fn.inv;
      return ref ? this.fns.find(f => f.id === ref.of) : null;
    },

    _build(fn) {
      fn.version = (fn.version || 0) + 1;
      fn.rad = false;
      fn.family = null; fn.members = null; fn.pieces = null; fn.param = null; fn.bounds = null;
      try {
        const ref = fn.deriv || fn.anti || fn.inv;
        const parent = ref ? this._parentOf(fn) : null;
        if (ref) {
          if (!parent) { fn.error = 'Ausgangsfunktion wurde gelöscht'; return false; }
          if (!parent.f) { fn.error = 'Ausgangsfunktion ist fehlerhaft'; return false; }
          fn.domain = parent.domain;
          fn.family = parent.family;
        }
        if (fn.deriv) {
          let ast = parent.ast;
          if (ast && this.deg && !parent.rad) { ast = MP.radianize(ast); fn.rad = true; }
          else fn.rad = !!parent.rad;
          for (let k = 0; k < fn.deriv.order && ast; k++) ast = MP.derivative(ast);
          if (ast) {
            fn.ast = ast;
            fn.f0 = MP.compile(ast, this.params, { deg: this.deg && !fn.rad });
          } else {
            fn.ast = null; fn.numeric = true;
            let f = parent.f0;
            for (let k = 0; k < fn.deriv.order; k++) f = numDeriv(f, 1);
            fn.f0 = f;
          }
        } else if (fn.anti) {
          this._buildAnti(fn, parent);
        } else if (fn.inv) {
          this._buildInverse(fn, parent);
          fn.error = null;
          return true;
        } else {
          const d = MP.parseDefinition(fn.def);
          const ctx = { variable: d.variable, functions: this._fnContext(fn.letter), self: fn.letter };
          fn.ast = MP.parseFunction(d, ctx);
          fn.f0 = MP.compile(fn.ast, this.params, { deg: this.deg });
          fn.domain = d.domain || null;
          if (d.family) {
            if (!d.family.vals) throw new MP.ParseError('Werte für ' + d.family.p + ' angeben, z. B. „für ' + d.family.p + ' = 1, 2, 3“');
            fn.family = d.family;
          }
        }
        fn.f = this._withDomain(fn, fn.f0);
        fn.pieces = fn.ast ? MP.pieces(fn.ast, this.params) : null;
        // Funktionsschar: eine Kurve je Parameterwert
        if (fn.family && (fn.ast || fn.anti)) {
          fn.members = fn.family.vals.map(v => {
            const P = Object.create(this.params);
            P[fn.family.p] = v;
            if (fn.anti && fn.family.p !== 'C') P.C = (fn.anti.c && fn.anti.c[0]) || 0;
            const f0 = fn.anti ? this._antiFn(fn, P) : MP.compile(fn.ast, P, { deg: this.deg && !fn.rad });
            return { v, P, f0, f: this._withDomain(fn, f0), pieces: fn.ast ? MP.pieces(fn.ast, P) : null };
          });
          fn.f0 = fn.members[0].f0; fn.f = fn.members[0].f;
        }
        fn.error = null;
        return true;
      } catch (e) {
        fn.error = e instanceof MP.ParseError ? e.message : 'Ungültiger Ausdruck';
        fn.ast = null; fn.f = null; fn.f0 = null;
        return false;
      }
    },

    // Funktion mit Definitionsbereich: außerhalb NaN
    _withDomain(fn, f0) {
      const dom = fn.domain;
      if (!dom) return f0;
      const P = this.params;
      const lo = () => (dom.min === null ? -Infinity : MP.evalConst(dom.min, P));
      const hi = () => (dom.max === null ? Infinity : MP.evalConst(dom.max, P));
      fn.bounds = () => ({ lo: lo(), hi: hi(), loOpen: dom.minOpen, hiOpen: dom.maxOpen });
      return (x) => {
        const a = lo(), b = hi();
        if (x < a || x > b || (dom.minOpen && x === a) || (dom.maxOpen && x === b)) return NaN;
        return f0(x);
      };
    },

    // ── Stammfunktion F(x) = ∫f + C ──
    _buildAnti(fn, parent) {
      const c = fn.anti.c && fn.anti.c.length ? fn.anti.c : [0];
      if (parent.family && c.length > 1) throw new MP.ParseError('Bei einer Funktionsschar nur eine Konstante C möglich');
      if (c.length > 1) fn.family = { p: 'C', vals: c };
      let base = parent.ast, rad = !!parent.rad;
      if (base && this.deg && !rad) { base = MP.radianize(base); rad = true; }
      const F = base ? MP.antiderivative(base) : null;
      fn.rad = rad;
      fn.numeric = !F;
      fn.antiAst = F;
      fn.ast = F ? { t: 'bin', op: '+', a: F, b: { t: 'var', n: 'C' } } : null;
      const P = Object.create(this.params);
      P.C = c[0];
      fn.f0 = this._antiFn(fn, P, parent);
    },

    _antiFn(fn, P, parent) {
      parent = parent || this._parentOf(fn);
      const pf = parent.family && P[parent.family.p] !== undefined && parent.members
        ? (parent.members.find(m => m.v === P[parent.family.p]) || parent.members[0]).f : parent.f;
      if (fn.antiAst) {
        const F = MP.compile(fn.antiAst, P, { deg: this.deg && !fn.rad });
        // nur dort, wo f selbst definiert ist (z. B. ln|x| nicht über die Polstelle hinweg)
        return (x) => (isFinite(pf(x)) ? F(x) + P.C : NaN);
      }
      // numerisch: Startpunkt x0 = 0 bzw. nächste Stelle, an der f definiert ist
      let x0 = 0;
      for (const c of [0, 0.5, -0.5, 1, -1, 2, -2, 0.1, -0.1]) if (isFinite(pf(c))) { x0 = c; break; }
      const bd = fn.bounds ? fn.bounds() : parent.bounds && parent.bounds();
      if (bd && isFinite(bd.lo) && x0 < bd.lo) x0 = bd.lo + (bd.loOpen ? 1e-9 : 0);
      const F = Numerics.antiderivative(pf, x0);
      return (x) => { const v = F(x); return isFinite(v) ? v + P.C : NaN; };
    },

    // ── Umkehrfunktion: Spiegelung des Graphen an y = x ──
    _buildInverse(fn, parent) {
      fn.ast = null; fn.numeric = true; fn.domain = null; fn.family = null;
      const src = parent.f;
      fn.param = src;
      // f⁻¹(x): Lösung von f(t) = x, nur wenn sie im betrachteten Bereich eindeutig ist
      let cache = null;
      const table = () => {
        const [y0, y1] = this.ys ? this.ys.domain() : [-10, 10];
        const [x0, x1] = this.xs ? this.xs.domain() : [-10, 10];
        const lo = Math.min(y0, y1, x0) - 2 * Math.abs(y1 - y0), hi = Math.max(y0, y1, x1) + 2 * Math.abs(y1 - y0);
        const key = lo + '|' + hi + '|' + fn.version + '|' + JSON.stringify(this.params);
        if (cache && cache.key === key) return cache;
        const N = 1200, ts = [], vs = [];
        for (let i = 0; i <= N; i++) { const t = lo + (hi - lo) * i / N; ts.push(t); vs.push(src(t)); }
        cache = { key, ts, vs };
        return cache;
      };
      fn.f0 = fn.f = (x) => {
        const { ts, vs } = table();
        let root = NaN, n = 0;
        for (let i = 0; i < ts.length - 1; i++) {
          const a = vs[i] - x, b = vs[i + 1] - x;
          if (!isFinite(a) || !isFinite(b)) continue;
          if (a === 0 || a * b < 0 || (b === 0 && i === ts.length - 2)) {
            if (++n > 1) return NaN;   // nicht eindeutig umkehrbar
            root = a === 0 ? ts[i] : b === 0 ? ts[i + 1] : bisect(t => src(t) - x, ts[i], ts[i + 1]) ?? NaN;
            if (a === 0) i++;
          }
        }
        return root;
      };
    },

    _derivs(fn) {
      if (fn._d) return fn._d;
      let d1 = null, d2 = null;
      const parent = fn.anti && this._parentOf(fn);
      if (parent && parent.f) {
        // F' = f, F'' = f'
        fn._d = { d1: parent.f, d2: this._derivs(parent).d1 };
        return fn._d;
      }
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

    _usedVars() {
      const used = new Set();
      this.fns.forEach(f => {
        if (!f.ast) return;
        const v = MP.freeVars(f.ast);
        if (f.family) v.delete(f.family.p);   // Scharparameter bekommt keinen Schieberegler
        if (f.anti) v.delete('C');
        v.forEach(n => used.add(n));
      });
      if (this._objVars) this._objVars(used);
      return used;
    },

    _syncAutoParams() {
      const used = this._usedVars();
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
      if (c.preview) { this.els.prev.textContent = c.preview; return; }
      if (c.ast) {
        let tex = letterTeX(c.letter) + '(x) = ' + MP.toTeX(c.ast);
        if (c.d.domain) tex += ',\\; ' + this._domainTeX(c.d.domain);
        this._renderTeX(this.els.prev, tex);
      }
    },

    _domainTeX(d) {
      const b = (s) => { try { return MP.toTeX(MP.parse(s)); } catch (e) { return s; } };
      if (d.min !== null && d.max !== null) return b(d.min) + (d.minOpen ? ' < ' : ' \\le ') + 'x' + (d.maxOpen ? ' < ' : ' \\le ') + b(d.max);
      if (d.min !== null) return 'x' + (d.minOpen ? ' > ' : ' \\ge ') + b(d.min);
      return 'x' + (d.maxOpen ? ' < ' : ' \\le ') + b(d.max);
    },

    // Definitionsbereich ändern: Eingabetext neu zusammensetzen
    setDomain(fn, min, max, minOpen, maxOpen) {
      if (fn.deriv) return;
      const d = MP.parseDefinition(fn.def);
      const head = d.letter ? d.letter + '(' + d.variable + ') = ' : '';
      let cond = '';
      if (min !== '' && max !== '') cond = min + (minOpen ? ' < ' : ' ≤ ') + d.variable + (maxOpen ? ' < ' : ' ≤ ') + max;
      else if (min !== '') cond = d.variable + (minOpen ? ' > ' : ' ≥ ') + min;
      else if (max !== '') cond = d.variable + (maxOpen ? ' < ' : ' ≤ ') + max;
      const def = head + d.body + (cond ? ' für ' + cond : '');
      if (def !== fn.def) this._editFunc(fn, def);
    },

    _renderTeX(el, tex, fallback) {
      if (window.katex) {
        try { katex.render(tex, el, { throwOnError: false, displayMode: false }); return; } catch (e) { /* Fallback */ }
      }
      el.textContent = fallback || tex;
    },

    // ── Funktionsliste ──
    sync() {
      const lst = this.els.lst;
      const open = new Set([...lst.querySelectorAll('.item.open')].map(e => +e.dataset.id));
      lst.innerHTML = '';
      this.els.emp.hidden = this.fns.length > 0;
      this.fns.forEach(f => lst.appendChild(this._fnItem(f, open.has(f.id))));
    },

    _fnItem(f, open) {
      const item = document.createElement('div');
      item.className = 'item' + (f.error ? ' has-error' : '') + (open ? ' open' : '');
      item.dataset.id = f.id;
      const row = document.createElement('div'); row.className = 'item-row';
      const dot = document.createElement('label'); dot.className = 'color-dot' + (f.vis ? '' : ' off');
      dot.style.background = this._col(f);
      dot.title = 'Farbe';
      const cp = document.createElement('input'); cp.type = 'color'; cp.value = f.col;
      cp.addEventListener('input', () => { f.col = cp.value; dot.style.background = f.col; this.repaint(); });
      cp.addEventListener('change', () => this.commit());
      dot.appendChild(cp);

      const main = document.createElement('div'); main.className = 'item-main';
      const t = document.createElement('div'); t.className = 'item-title';
      const name = letterTeX(f.letter) + '(x) = ';
      const parent = this._parentOf(f);
      let sub = f.family ? f.family.p + ' ∈ {' + f.family.vals.map(v => fmtDE(v, 6)).join('; ') + '}' : '';
      if (f.inv && parent) {
        this._renderTeX(t, letterTeX(f.letter) + '(x)', f.letter);
        sub = 'Graph von ' + parent.letter + ' an y = x gespiegelt' + (this._monotone(parent) ? '' : ' – ' + parent.letter + ' ist hier nicht umkehrbar');
      } else if (f.anti && parent && !f.error) {
        const c = f.family ? ' + C' : (f.anti.c && f.anti.c[0] ? (f.anti.c[0] < 0 ? ' - ' : ' + ') + fmtDE(Math.abs(f.anti.c[0]), 6).replace(',', '{,}') : '');
        const body = f.antiAst ? MP.toTeX(f.antiAst) + c : '\\int ' + letterTeX(parent.letter) + '(t)\\,dt' + c;
        this._renderTeX(t, name + body, f.letter + '(x) = Stammfunktion von ' + parent.letter);
        sub = 'Stammfunktion von ' + parent.letter + (f.numeric ? ' (numerisch)' : '') + (sub ? ', ' + sub : '');
      } else if (f.ast) {
        let tex = name + MP.toTeX(f.ast);
        if (f.domain && !f.deriv) tex += ',\\; ' + this._domainTeX(f.domain);
        this._renderTeX(t, tex, f.letter + '(x) = ' + MP.toPlain(f.ast));
      } else if (f.numeric) this._renderTeX(t, name + '\\text{numerisch}', f.letter + '(x) (numerisch)');
      else t.textContent = f.letter + ': ' + (f.def || '');
      main.appendChild(t);
      if (sub && !f.error) { const sd = document.createElement('div'); sd.className = 'item-sub'; sd.textContent = sub; main.appendChild(sd); }
      if (f.error) { const er = document.createElement('div'); er.className = 'item-error'; er.textContent = f.error; main.appendChild(er); }
      main.title = f.deriv ? 'Ableitung – wird automatisch aktualisiert. Klicken zum Bearbeiten'
        : f.anti || f.inv ? 'Wird automatisch aktualisiert. Klicken für Einstellungen' : 'Klicken zum Bearbeiten';
      main.addEventListener('click', () => {
        if (f.anti || f.inv) { item.classList.toggle('open'); return; }
        this._inlineEdit(main, f.deriv ? f.letter : (f.def || ''), (v) => this._editFunc(f, v));
      });

      const acts = document.createElement('div'); acts.className = 'item-actions';
      const btn = (icon, title, cb, cls, text) => {
        const b = document.createElement('button'); b.className = 'icon-btn' + (cls ? ' ' + cls : '');
        b.innerHTML = text ? text : Icons.svg(icon); b.title = title;
        b.addEventListener('click', (e) => { e.stopPropagation(); cb(); });
        acts.appendChild(b); return b;
      };
      btn(f.vis ? 'eye' : 'eyeOff', f.vis ? 'Ausblenden' : 'Einblenden', () => this.tgFn(f.id));
      btn(null, 'Ableitung hinzufügen', () => this._addDerivative(f), 'txt-btn', 'f′');
      btn('integral', 'Integral / Fläche', () => this._showIntegral(f));
      btn('chevron', 'Einstellungen', () => item.classList.toggle('open'), 'disclose');
      row.append(dot, main, acts);
      item.append(row, this._fnDetail(f));
      return item;
    },

    // Kleines Segmented Control für Detailzeilen
    _miniSeg(opts, value, cb) {
      const s = document.createElement('div'); s.className = 'segmented segmented-sm';
      opts.forEach(([v, label, title]) => {
        const b = document.createElement('button'); b.dataset.value = v; b.innerHTML = label; if (title) b.title = title;
        s.appendChild(b);
      });
      this.setSegmented(s, value);
      this.segmented(s, cb);
      return s;
    },

    _detailRow(det, label, ...els) {
      const r = document.createElement('div'); r.className = 'detail-row';
      const s = document.createElement('span'); s.textContent = label;
      r.append(s, ...els); det.appendChild(r); return r;
    },

    // Ausklappbare Einstellungen einer Funktion
    _fnDetail(f) {
      const det = document.createElement('div'); det.className = 'item-detail';

      // Beschriftung
      const lt = document.createElement('input'); lt.type = 'text'; lt.className = 'field'; lt.placeholder = 'z. B. A oder G_1';
      lt.value = f.labelText || ''; lt.hidden = f.labelMode !== 'custom'; lt.style.width = '84px';
      lt.addEventListener('input', () => { f.labelText = lt.value; this.repaint(); });
      lt.addEventListener('change', () => this.commit());
      const lseg = this._miniSeg([['name', 'G<sub>' + esc(f.letter) + '</sub>', 'Name des Graphen'], ['term', 'Term', 'Funktionsterm'], ['custom', 'Text', 'Eigener Text, z. B. für Zuordnungsaufgaben'], ['none', 'Aus', 'Keine Beschriftung']], f.labelMode || 'name', (v) => {
        f.labelMode = v; lt.hidden = v !== 'custom';
        if (v === 'custom' && !f.labelText) { f.labelText = f.letter.toUpperCase(); lt.value = f.labelText; }
        this.repaint(); this.commit();
      });
      const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;gap:6px;align-items:center';
      wrap.append(lt, lseg);
      this._detailRow(det, 'Beschriftung', wrap);

      // Linie
      const sw = document.createElement('input'); sw.type = 'range'; sw.min = 0.5; sw.max = 8; sw.step = 0.5; sw.value = f.strokeWidth || 3;
      sw.title = 'Linienstärke';
      sw.addEventListener('input', () => { f.strokeWidth = +sw.value; this.repaint(); });
      sw.addEventListener('change', () => this.commit());
      const dseg = this._miniSeg([['solid', '—', 'Durchgezogen'], ['dash', '– –', 'Gestrichelt'], ['dot', '···', 'Gepunktet']], f.dash || 'solid', (v) => { f.dash = v; this.repaint(); this.commit(); });
      const lw = document.createElement('div'); lw.style.cssText = 'display:flex;gap:8px;align-items:center';
      lw.append(sw, dseg);
      this._detailRow(det, 'Linie', lw);

      // Stammfunktion: Konstante C
      if (f.anti) {
        const ci = document.createElement('input'); ci.type = 'text'; ci.className = 'field field-mono';
        ci.style.width = '120px'; ci.placeholder = 'z. B. 0 oder −1, 0, 1';
        ci.value = (f.anti.c || [0]).map(v => fmtDE(v, 6)).join('; ');
        ci.title = 'Eine Zahl oder mehrere (durch ; getrennt) für eine Schar von Stammfunktionen';
        ci.addEventListener('change', () => {
          const vals = MP.familyValues(ci.value || '0');
          if (!vals) { this._toast('Bitte Zahlen eingeben, z. B. 0 oder −1; 0; 1'); return; }
          f.anti.c = vals; f.labelX = f.labelY = null;
          this._afterFnChange(); this.commit();
        });
        this._detailRow(det, 'Konstante C', ci);
      }
      // Umkehrfunktion: Winkelhalbierende
      if (f.inv) {
        const dg = document.createElement('input'); dg.type = 'checkbox'; dg.className = 'switch'; dg.checked = f.diag !== false;
        dg.addEventListener('change', () => { f.diag = dg.checked; this.repaint(); this.commit(); });
        this._detailRow(det, 'Gerade y = x zeigen', dg);
      }

      // Definitionsbereich
      if (!f.deriv && !f.anti && !f.inv && !(f.ast && f.ast.t === 'pw')) {
        const d = f.domain || { min: null, max: null, minOpen: false, maxOpen: false };
        const pair = document.createElement('div'); pair.className = 'pair';
        const mk = (v, ph) => { const i = document.createElement('input'); i.type = 'text'; i.className = 'field field-mono'; i.value = v ?? ''; i.placeholder = ph; return i; };
        const a = mk(d.min, '−∞'), b = mk(d.max, '+∞');
        const ck = (v, title) => { const l = document.createElement('label'); l.className = 'check'; l.title = title; const c = document.createElement('input'); c.type = 'checkbox'; c.checked = v; l.append(c, '○'); return [l, c]; };
        const [al, ao] = ck(d.minOpen, 'Linke Grenze ausgeschlossen (offener Kreis)');
        const [bl, bo] = ck(d.maxOpen, 'Rechte Grenze ausgeschlossen (offener Kreis)');
        const apply = () => this.setDomain(f, a.value.trim(), b.value.trim(), ao.checked, bo.checked);
        [a, b, ao, bo].forEach(el => el.addEventListener('change', apply));
        const s = document.createElement('span'); s.textContent = 'bis';
        pair.append(al, a, s, b, bl);
        this._detailRow(det, 'Definiert', pair);
      }

      // Asymptoten
      const as = document.createElement('input'); as.type = 'checkbox'; as.className = 'switch'; as.checked = !!f.asym;
      as.addEventListener('change', () => { f.asym = as.checked; this.repaint(); this.commit(); });
      this._detailRow(det, 'Asymptoten anzeigen', as);

      const acts = document.createElement('div'); acts.className = 'detail-actions';
      const act = (label, title, cb) => {
        const b = document.createElement('button'); b.className = 'btn btn-gray btn-sm'; b.innerHTML = label; b.title = title;
        b.addEventListener('click', cb); acts.append(b); return b;
      };
      if (!f.inv && f.f) {
        act('Stammfunktion', 'Stammfunktion F mit wählbarer Konstante C zeichnen', () => this.addAntiderivative(f));
        act('Umkehrfunktion', 'Graph an der Geraden y = x spiegeln', () => this.addInverse(f));
      }
      if (f.f && this.openDiscussion) act('Kurvendiskussion', 'Kurvendiskussion als Text (Word, LaTeX, Druckbogen)', () => this.openDiscussion(f));
      const del = document.createElement('button'); del.className = 'btn btn-gray btn-sm'; del.style.color = 'var(--red)';
      del.innerHTML = Icons.svg('trash') + 'Löschen';
      del.addEventListener('click', () => this.rmFn(f.id));
      acts.append(del);
      det.appendChild(acts);
      return det;
    },

    // Text in der Liste direkt bearbeiten
    _inlineEdit(host, value, commit) {
      if (host.querySelector('input')) return;
      const saved = [...host.childNodes];
      const inp = document.createElement('input'); inp.type = 'text'; inp.value = value;
      inp.className = 'field field-mono item-edit';
      host.replaceChildren(inp); inp.focus(); inp.select();
      let cancelled = false;
      const done = () => {
        if (!inp.isConnected) return;
        const v = inp.value.trim();
        if (cancelled || !v || v === value || !commit(v)) host.replaceChildren(...saved);
      };
      inp.addEventListener('click', e => e.stopPropagation());
      inp.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); }
        if (ev.key === 'Escape') { cancelled = true; inp.blur(); }
      });
      inp.addEventListener('blur', done);
    },

    _addDerivative(f) {
      const base = f.deriv ? this.fns.find(p => p.id === f.deriv.of) : f;
      const order = f.deriv ? f.deriv.order + 1 : 1;
      if (!base) return;
      const res = this._addDef(base.letter + "'".repeat(order));
      if (res.error) this._toast(res.error); else this.commit();
    },

    addAntiderivative(f) {
      if (f.anti) { this._toast('Bitte die Ausgangsfunktion wählen'); return; }
      const base = f.letter.replace(/_[a-zA-Z]$/, '').replace(/['⁻¹]/g, '');
      let letter = /^[a-z]$/.test(base) ? base.toUpperCase() : 'F';
      const used = this._usedLetters();
      if (f.family) letter += '_' + f.family.p;
      for (let i = 1; used.includes(letter); i++) letter = (/^[a-z]$/.test(base) ? base.toUpperCase() : 'F') + i + (f.family ? '_' + f.family.p : '');
      this._pushFn({ letter, anti: { of: f.id, c: [0] }, col: f.col, dash: 'dash' });
      const nf = this.fns[this.fns.length - 1];
      if (nf.numeric && !nf.error) this._toast('Stammfunktion numerisch berechnet (kein geschlossener Term)');
      this.commit();
    },

    // Ist f im sichtbaren Bereich streng monoton (also umkehrbar)?
    _monotone(fn) {
      if (!fn.f || !this.xs) return true;
      const [a, b] = this.xs.domain();
      let dir = 0, prev = NaN;
      for (let i = 0; i <= 400; i++) {
        const y = fn.f(a + (b - a) * i / 400);
        if (isFinite(y) && isFinite(prev) && y !== prev) {
          const d = Math.sign(y - prev);
          if (dir && d !== dir) return false;
          dir = d;
        }
        prev = y;
      }
      return true;
    },

    addInverse(f) {
      if (this.fns.some(g => g.inv && g.inv.of === f.id)) { this._toast('Umkehrfunktion ist bereits vorhanden'); return; }
      const base = f.letter.replace(/_[a-zA-Z]$/, '');
      this._pushFn({ letter: base + '⁻¹', inv: { of: f.id }, col: f.col, dash: 'dash' });
      this.commit();
    },

    // ══════════════════ Parameter ══════════════════

    addParam() {
      const name = this.els.pName.value.trim();
      if (!/^[a-zA-Z]$/.test(name)) { this._toast('Bitte einen Buchstaben (a–z) eingeben'); return; }
      if (name === 'x' || name === 'e') { this._toast(name + ' ist reserviert'); return; }
      const val = parseFloat(this.els.pVal.value) || 0;
      if (name in this.params) { this.params[name] = val; this.paramMeta[name].auto = false; }
      else {
        this.params[name] = val;
        this.paramMeta[name] = { min: Math.min(-10, val), max: Math.max(10, val), auto: false };
      }
      this.els.pName.value = '';
      this.els.pAddRow.hidden = true;
      this.syncParams();
      this.repaint();
      this.commit();
    },

    removeParam(name) {
      if (this._usedVars().has(name)) { this._toast(name + ' wird noch verwendet'); return; }
      delete this.params[name];
      delete this.paramMeta[name];
      this.syncParams();
      this.repaint();
      this.commit();
    },

    _paramChanged() {
      this._anaCache = null;
      this.repaint();
      if (this._tableOn && this.renderTable) this.renderTable();
      if (this.syncObjects && this.objs.length) this.syncObjects();
    },

    _syncParamGroup() {
      const has = Object.keys(this.params).length > 0;
      this.els.pList.parentElement.hidden = !has && this.els.pAddRow.hidden;
    },

    syncParams() {
      const list = this.els.pList;
      list.innerHTML = '';
      this._paramEls = {};
      Object.keys(this.params).sort().forEach(name => {
        const meta = this.paramMeta[name] || (this.paramMeta[name] = { min: -10, max: 10 });
        const d = document.createElement('div'); d.className = 'param-item';
        const lbl = document.createElement('span'); lbl.className = 'param-name'; lbl.textContent = name;
        const range = document.createElement('input'); range.type = 'range';
        const setStep = () => { range.min = meta.min; range.max = meta.max; range.step = niceStep((meta.max - meta.min) / 400) || 0.01; };
        setStep();
        range.value = this.params[name];
        const num = document.createElement('input'); num.type = 'number'; num.className = 'field';
        num.value = +this.params[name].toFixed(4); num.step = 0.1;
        range.addEventListener('input', () => { this.params[name] = parseFloat(range.value); num.value = +this.params[name].toFixed(4); this._paramChanged(); });
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
        const play = document.createElement('button'); play.className = 'icon-btn accent';
        play.innerHTML = Icons.svg(this._anim && this._anim[name] ? 'pause' : 'play');
        play.title = 'Animieren';
        play.addEventListener('click', () => this.toggleAnim(name));
        const del = document.createElement('button'); del.className = 'icon-btn danger';
        del.innerHTML = Icons.svg('close'); del.title = 'Entfernen';
        del.addEventListener('click', () => this.removeParam(name));

        const rr = document.createElement('div'); rr.className = 'param-range';
        const mk = (key, title) => {
          const i = document.createElement('input'); i.type = 'number'; i.className = 'field'; i.value = meta[key]; i.title = title;
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
      this._syncParamGroup();
    },

    toggleAnim(name) {
      this._anim = this._anim || {};
      if (this._anim[name]) delete this._anim[name];
      else this._anim[name] = { dir: 1 };
      const el = this._paramEls && this._paramEls[name];
      if (el) el.play.innerHTML = Icons.svg(this._anim[name] ? 'pause' : 'play');
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
            let v = this.params[n] + a.dir * (meta.max - meta.min) * dt / 4;
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

    setAngleMode(deg, silent) {
      this.deg = deg;
      this.setSegmented(this.els.angleSeg, deg ? 'deg' : 'rad');
      this.tangent = null;
      this.rebuild();
      this.sync();
      this.repaint();
      if (this._tableOn && this.renderTable) this.renderTable();
      if (!silent) { this._toast(deg ? 'Gradmaß: sin(90) = 1' : 'Bogenmaß: sin(π/2) = 1'); this.commit(); }
    },

    // ══════════════════ Ansicht ══════════════════

    _viewObj(current) {
      if (current && this._screen) {
        const [x0, x1] = this._screen.xs.domain(), [y0, y1] = this._screen.ys.domain();
        return { xMin: x0, xMax: x1, yMin: y0, yMax: y1 };
      }
      if (current && this.xs) {
        const [x0, x1] = this.xs.domain(), [y0, y1] = this.ys.domain();
        return { xMin: x0, xMax: x1, yMin: y0, yMax: y1 };
      }
      return { xMin: this.xMin, xMax: this.xMax, yMin: this.yMin, yMax: this.yMax };
    },

    _takeCurrentView() { if (this.xs) Object.assign(this, this._viewObj(true)); },

    _rebuildView() {
      this.curT = d3.zoomIdentity;
      this.svg.property('__zoom', d3.zoomIdentity);
      this.buildScales();
      this._syncControls();
      this.repaint();
    },

    setView(v, opts) {
      Object.assign(this, v);
      if (this.proportional && !(opts && opts.exact)) this._applyProportional();
      if (opts && opts.home) this.home = this._viewObj();
      this._rebuildView();
    },

    applyWindow() {
      const E = this.els, num = (el, d) => { const v = parseFloat(el.value); return isFinite(v) ? v : d; };
      const cur = this._viewObj(true);
      const v = { xMin: num(E.xminI, cur.xMin), xMax: num(E.xmaxI, cur.xMax), yMin: num(E.yminI, cur.yMin), yMax: num(E.ymaxI, cur.yMax) };
      if (v.xMin >= v.xMax || v.yMin >= v.yMax) { this._toast('Minimum muss kleiner als Maximum sein'); this._syncControls(); return; }
      // Bei gleichen Einheiten und geänderter y-Achse: x anpassen statt y zu überschreiben
      const changedY = Math.abs(v.yMin - cur.yMin) > 1e-9 || Math.abs(v.yMax - cur.yMax) > 1e-9;
      const changedX = Math.abs(v.xMin - cur.xMin) > 1e-9 || Math.abs(v.xMax - cur.xMax) > 1e-9;
      if (this.proportional && changedY && !changedX) {
        const pw = this.W - this.pad.l - this.pad.r, ph = this.H - this.pad.t - this.pad.b;
        const xr = (v.yMax - v.yMin) * pw / ph, xm = (v.xMin + v.xMax) / 2;
        v.xMin = xm - xr / 2; v.xMax = xm + xr / 2;
        this.setView(v, { home: true, exact: true });
      } else this.setView(v, { home: true });
      this.commit();
    },

    _syncControls() {
      const E = this.els, v = this._viewObj(true), s = this.style;
      const r = (n) => { const v = +n.toPrecision(4); return Math.abs(v) < 1e-9 ? 0 : v; };
      const active = document.activeElement;
      const set = (el, val) => { if (el !== active) el.value = val; };
      set(E.xminI, r(v.xMin)); set(E.xmaxI, r(v.xMax)); set(E.yminI, r(v.yMin)); set(E.ymaxI, r(v.yMax));
      set(E.xlabI, s.xLabel); set(E.ylabI, s.yLabel); set(E.xstep, s.xStep); set(E.ystep, s.yStep);
      E.xfmt.value = s.xFmt; E.yfmt.value = s.yFmt; E.sub.value = String(s.sub);
      E.fontS.value = s.fontSize; E.axisW.value = s.axisWidth; E.gridW.value = s.gridWidth;
      E.axisC.value = s.axisColor; E.gridC.value = s.gridColor;
      E.bw.checked = s.bw; E.exact.checked = s.exact;
      E.prop.checked = this.proportional; E.smart.checked = this.smartLabels;
      E.theme.value = this.theme; set(E.hTitle, this.graphTitle);
      E.karo.value = String(s.karo);
      this.setSegmented(E.gridMode, s.gridMode);
      E.karoRow.hidden = E.karoHint.hidden = s.gridMode !== 'karo';
      if (s.gridMode === 'karo') this._karoSketch();
      E.prop.disabled = s.gridMode === 'karo';
      this.setSegmented(E.angleSeg, this.deg ? 'deg' : 'rad');
    },

    setGridMode(mode) {
      this.style.gridMode = mode;
      if (mode === 'karo') {
        // Karopapier: gleiche Einheiten, Ansicht in Druckgröße (Kästchen ≈ 5 mm)
        this.proportional = true;
        this.showPrintSize(true);
      }
      this._syncControls();
      this.repaint();
      this.commit();
    },

    // Skizze in der Einstellung: wie viele 5-mm-Kästchen von 0 bis 1 reichen
    _karoSketch() {
      const el = document.getElementById('karo-sketch');
      if (!el) return;
      const k = this.style.karo, box = 14, n = 16, W = n * box + 24, y0 = 34;
      const cm = String(k * 0.5).replace('.', ',');
      let g = '';
      for (let i = 0; i <= n; i++) g += `<line x1="${12 + i * box}" y1="6" x2="${12 + i * box}" y2="${6 + 3 * box}" stroke="#A9C1DA" stroke-width="1"/>`;
      for (let j = 0; j <= 3; j++) g += `<line x1="12" y1="${6 + j * box}" x2="${12 + n * box}" y2="${6 + j * box}" stroke="#A9C1DA" stroke-width="1"/>`;
      g += `<line x1="12" y1="${y0}" x2="${12 + n * box}" y2="${y0}" stroke="currentColor" stroke-width="1.6"/>`;
      for (let u = 0; u * k <= n; u++) {
        const x = 12 + u * k * box;
        g += `<line x1="${x}" y1="${y0 - 4}" x2="${x}" y2="${y0 + 4}" stroke="currentColor" stroke-width="1.6"/>`;
        if (k > 1 || u % 2 === 0) g += `<text x="${x}" y="${y0 + 16}" text-anchor="middle" font-size="11" fill="currentColor">${u}</text>`;
      }
      // Klammer über der ersten Einheit
      const x1 = 12, x2 = 12 + k * box;
      g += `<path d="M${x1},${y0 + 24}V${y0 + 28}H${x2}V${y0 + 24}" fill="none" stroke="#007AFF" stroke-width="1.5"/>`;
      g += `<text x="${12}" y="${y0 + 42}" font-size="11.5" fill="#007AFF">von 0 bis 1: ${k} ${k === 1 ? 'Kästchen' : 'Kästchen'} = ${cm} cm</text>`;
      el.innerHTML = `<svg viewBox="0 0 ${W} ${y0 + 48}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">${g}</svg>`;
    },

    // Ansicht so zoomen, dass 1 Einheit am Bildschirm ungefähr so groß ist wie auf Papier
    // (Karopapier: 1 Einheit = karo · 5 mm). Die Bildschirmgröße ist nur näherungsweise exakt.
    showPrintSize(silent) {
      const unitCm = this.style.gridMode === 'karo' ? this.style.karo * 0.5 : (this.exp ? this.exp.ux : 1);
      const ppu = unitCm * CM;
      const v = this._viewObj(true);
      const cx = (v.xMin + v.xMax) / 2, cy = (v.yMin + v.yMax) / 2;
      const hw = (this.W - this.pad.l - this.pad.r) / ppu / 2, hh = (this.H - this.pad.t - this.pad.b) / ppu / 2;
      this.setView({ xMin: cx - hw, xMax: cx + hw, yMin: cy - hh, yMax: cy + hh }, { exact: true });
      if (!silent) this._toast('Druckgröße: 1 Einheit ≈ ' + String(unitCm).replace('.', ',') + ' cm');
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
      this._setFrame();
    },

    _setFrame() {
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

    zoomBy(k) { this.svg.transition().duration(220).ease(d3.easeCubicOut).call(this.zoom.scaleBy, k); },

    zoomToSelection() {
      const b = this._getSelectionBounds();
      if (!b) return;
      this.selectionRect = null;
      this.setTool('move');
      this.setView(b);
      this._scheduleSave();
    },

    // ══════════════════ Zeichnen ══════════════════

    // Farben und Optionen für die aktuelle Ausgabe (Bildschirm oder Export)
    _ctx() {
      if (this.rc) return this.rc;
      return { labels: true, smart: this.smartLabels, title: true, mark: true, bg: this._theme().plotBg, bw: this.style.bw, screen: true };
    },

    _col(fn) { return (this.rc ? this.rc.bw : this.style.bw) ? '#000000' : fn.col; },

    // Strichmuster einer Funktion als sichtbare Längen in Pixeln (Strich, Lücke, …) oder null
    _dash(fn, sw) {
      let kind = fn.dash || 'solid';
      const bw = this.rc ? this.rc.bw : this.style.bw;
      if (bw && kind === 'solid') {
        const vis = this.fns.filter(f => f.vis && f.f);
        kind = BW_DASHES[Math.max(0, vis.indexOf(fn)) % BW_DASHES.length];
      }
      const dash = 4.5 * sw + 4, gap = 2.5 * sw + 3;
      return {
        dash: [dash, gap],
        dot: [0, 2 * sw + 3],
        dashdot: [dash, gap, 0, gap],
      }[kind] || null;
    },

    // Striche selbst entlang der Kurvenlänge berechnen statt stroke-dasharray:
    // Der Browser verschiebt das Muster an den vielen kleinen Teilstücken einer Kurve,
    // so entstanden unterschiedlich lange Striche und Lücken. Hier ist jeder Strich gleich lang.
    // pat: sichtbare Längen; runde Enden verlängern jeden Strich um sw, daher hier abziehen.
    _dashPath(segs, pat, sw) {
      const P = pat.map((v, i) => (i % 2 === 0 ? Math.max(0, v - sw) : v + sw));
      const out = [];
      let k = 0, rem = P[0], cur = [];
      const r = (v) => Math.round(v * 100) / 100;
      const next = (x, y, dx, dy) => {
        // Intervall beenden und das nächste beginnen
        if (k % 2 === 0) { cur.push([x, y]); if (cur.length === 1 || (cur.length === 2 && cur[0][0] === x && cur[0][1] === y)) cur = [[x, y], [x + dx * 0.01, y + dy * 0.01]]; out.push(cur); cur = []; }
        k = (k + 1) % P.length; rem = P[k];
        if (k % 2 === 0) cur = [[x, y]];
      };
      segs.forEach(seg => {
        if (k % 2 === 0) cur = [seg[0]];
        for (let i = 1; i < seg.length; i++) {
          const [ax, ay] = seg[i - 1], [bx, by] = seg[i];
          const len = Math.hypot(bx - ax, by - ay);
          if (!(len > 0)) continue;
          const dx = (bx - ax) / len, dy = (by - ay) / len;
          let t = 0;
          while (len - t >= rem) {
            t += rem;
            next(ax + dx * t, ay + dy * t, dx, dy);
            if (out.length > 20000) return;   // Sicherheitsgrenze
          }
          rem -= len - t;
          if (k % 2 === 0) cur.push([bx, by]);
        }
        if (k % 2 === 0 && cur.length > 1) out.push(cur);
        cur = [];
      });
      return out.map(pts => 'M' + pts.map(p => r(p[0]) + ',' + r(p[1])).join('L')).join('');
    },

    repaint() {
      if (!this.W || !this.H || !this.xs) return;
      this.root.selectAll('*').remove();
      this.root.attr('font-family', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif');
      this._ticksCache = null;
      const c = this._ctx();
      this.paintGrid();
      this.paintAxes();
      this.paintLabels();
      this.paintIntegral();
      if (this.paintData) this.paintData();
      this.paintAsymptotes();
      this.paintFuncs();
      if (this.paintObjects) this.paintObjects();
      if (!this.rc) this.paintSelectionRect();
      if (c.smart) this.paintSmartLabels();
      if (this.tangent) {
        const fn = this.fns.find(f => f.id === this.tangent.fnId);
        if (fn && fn.f && fn.vis) this.paintTangent(this.root, this._tangentAt(fn, this.tangent.x));
      }
      if (c.title) this.paintTitle();
      if (c.mark) this.paintWatermark();
      if (!this.rc) this._refreshHover();
    },

    // Raster- und Beschriftungswerte
    ticks() {
      if (this._ticksCache) return this._ticksCache;
      const s = this.style, fs = s.fontSize;
      const make = (scale, minLabelPx, stepStr, fmt) => {
        const [d0, d1] = scale.domain().slice().sort((a, b) => a - b);
        const ppu = Math.abs(scale(1) - scale(0));
        const user = stepStr ? MP.evalConst(stepStr) : NaN;
        let step;
        if (s.gridMode === 'karo') step = 1;
        else if (user > 0 && user * ppu >= 8) step = user;
        else if (fmt === 'pi') {
          const cands = [1 / 12, 1 / 6, 1 / 4, 1 / 2, 1, 2, 4, 8, 16, 32].map(k => k * Math.PI);
          step = cands.find(c => c * ppu >= minLabelPx) || niceStep(minLabelPx / ppu);
        } else step = niceStep(36 / ppu);
        // Beschriftungen nur so dicht, dass sie lesbar bleiben
        const mult = fmt === 'pi' && !(user > 0) ? [1, 2, 4, 8] : [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
        let k = 1;
        // Karopapier: Zahlen so dicht wie möglich (jede Einheit, wenn Platz ist)
        const need = s.gridMode === 'karo' ? Math.min(minLabelPx, fs * (scale === this.xs ? 2.2 : 1.6)) : minLabelPx;
        for (const m of mult) { k = m; if (step * m * ppu >= need) break; }
        const ls = step * k;
        let gridStep;
        if (s.gridMode === 'karo') gridStep = 1 / s.karo;
        else if (s.sub === 'auto') gridStep = step;
        else gridStep = ls / +s.sub;
        if (gridStep * ppu < 4) gridStep = ls;
        const grid = [], labels = [];
        const g0 = Math.ceil(d0 / gridStep - 1e-9), g1 = Math.floor(d1 / gridStep + 1e-9);
        for (let i = g0; i <= g1 && grid.length < 3000; i++) if (i !== 0) grid.push(i * gridStep);
        const l0 = Math.ceil(d0 / ls - 1e-9), l1 = Math.floor(d1 / ls + 1e-9);
        for (let i = l0; i <= l1 && labels.length < 500; i++) if (i !== 0) labels.push(i * ls);
        // Striche an jeder Einheit (Karopapier), auch wenn nicht jede beschriftet ist
        const marks = [];
        if (s.gridMode === 'karo' && step * ppu >= 6) {
          for (let i = Math.ceil(d0 / step - 1e-9); i <= Math.floor(d1 / step + 1e-9) && marks.length < 1000; i++) if (i !== 0) marks.push(i * step);
        }
        return { grid, labels, marks: marks.length ? marks : labels, step: ls, gridStep, dec: decimalsOf(ls), fmt };
      };
      this._ticksCache = {
        // Export: Beschriftung jeder Einheit auch bei 1 cm Abstand; Bildschirm: luftiger
        x: make(this.xs, this.rc ? fs * 2.5 : fs * 4.4, s.xStep, s.xFmt),
        y: make(this.ys, this.rc ? fs * 1.5 : fs * 3.4, s.yStep, s.yFmt),
      };
      return this._ticksCache;
    },

    _axisPos() {
      return { ax: clamp(this.xs(0), this.PL, this.PR), ay: clamp(this.ys(0), this.PT, this.PB) };
    },

    _styleColors() {
      const s = this.style, c = this._ctx();
      const karoDefault = s.gridMode === 'karo' && s.gridColor === this._theme().style.gridColor;
      if (c.bw) return { axis: '#000000', grid: s.gridMode === 'karo' ? '#9DB0C4' : '#BDBDBD' };
      // Export mit weißem Hintergrund im dunklen Thema: helle Achsenfarben wären unsichtbar
      if (this.rc && this.rc.lightOverride) return { axis: '#1C1C1E', grid: s.gridMode === 'karo' ? '#A9C1DA' : '#D1D1D6' };
      if (karoDefault) return { axis: s.axisColor, grid: this._theme().dark ? '#33475E' : '#A9C1DA' };
      return { axis: s.axisColor, grid: s.gridColor };
    },

    paintGrid() {
      const xs = this.xs, ys = this.ys, l = this.PL, r = this.PR, t = this.PT, b = this.PB;
      const c = this._ctx(), col = this._styleColors();
      const g = this.root.append('g');
      if (c.bg) g.append('rect').attr('x', 0).attr('y', 0).attr('width', this.W).attr('height', this.H).attr('fill', c.bg);
      if (this.style.gridMode === 'none') return;
      const tk = this.ticks();
      const path = [];
      if (this.style.gridMode === 'karo') {
        // Karopapier über die ganze Fläche
        const gx = tk.x.gridStep, gy = tk.y.gridStep;
        const ux0 = xs.invert(0), ux1 = xs.invert(this.W), uy0 = ys.invert(this.H), uy1 = ys.invert(0);
        for (let i = Math.ceil(ux0 / gx); i <= Math.floor(ux1 / gx) && path.length < 4000; i++) path.push(`M${xs(i * gx)},0V${this.H}`);
        for (let i = Math.ceil(uy0 / gy); i <= Math.floor(uy1 / gy) && path.length < 8000; i++) path.push(`M0,${ys(i * gy)}H${this.W}`);
        g.append('path').attr('d', path.join('')).attr('stroke', col.grid).attr('stroke-width', Math.max(0.5, this.style.gridWidth * 0.75)).attr('fill', 'none');
        return;
      }
      tk.x.grid.forEach(v => { path.push(`M${xs(v)},${t}V${b}`); });
      tk.y.grid.forEach(v => { path.push(`M${l},${ys(v)}H${r}`); });
      g.append('path').attr('d', path.join('')).attr('stroke', col.grid).attr('stroke-width', this.style.gridWidth).attr('fill', 'none');
    },

    paintAxes() {
      const l = this.PL, r = this.PR, t = this.PT, b = this.PB;
      const { ax, ay } = this._axisPos();
      const g = this.root.append('g');
      const hl = 9, tk = 5;
      const aw = this.style.axisWidth, ac = this._styleColors().axis;
      g.append('line').attr('x1', l).attr('y1', ay).attr('x2', r - hl - 2).attr('y2', ay).attr('stroke', ac).attr('stroke-width', aw);
      g.append('polygon').attr('points', `${r - 1},${ay} ${r - 1 - hl},${ay - 5} ${r - 1 - hl},${ay + 5}`).attr('fill', ac);
      g.append('line').attr('x1', ax).attr('y1', b).attr('x2', ax).attr('y2', t + hl + 2).attr('stroke', ac).attr('stroke-width', aw);
      g.append('polygon').attr('points', `${ax},${t + 1} ${ax - 5},${t + 1 + hl} ${ax + 5},${t + 1 + hl}`).attr('fill', ac);
      const x0 = this.xs(0), y0 = this.ys(0);
      if (x0 >= l && x0 <= r && y0 >= t && y0 <= b) {
        this._halo(g.append('text').attr('x', ax - 7).attr('y', ay + this.style.fontSize + 4)
          .attr('text-anchor', 'end').attr('font-size', this.style.fontSize).attr('font-weight', '500').attr('fill', ac)).text('0');
      }
      const ticks = this.ticks();
      const tw = Math.max(1, Math.min(aw - 0.5, 2));
      const path = [];
      ticks.x.marks.forEach(v => { const px = this.xs(v); path.push(`M${px},${ay - tk}V${ay + tk}`); });
      ticks.y.marks.forEach(v => { const py = this.ys(v); path.push(`M${ax - tk},${py}H${ax + tk}`); });
      g.append('path').attr('d', path.join('')).attr('stroke', ac).attr('stroke-width', tw);
    },

    _halo(sel) {
      const bg = this._ctx().bg || '#fff';
      return sel.attr('stroke', bg).attr('stroke-width', 3).attr('stroke-linejoin', 'round').attr('paint-order', 'stroke');
    },

    paintLabels() {
      const r = this.PR, t = this.PT;
      const { ax, ay } = this._axisPos();
      const g = this.root.append('g');
      const fs = this.style.fontSize, ac = this._styleColors().axis;
      const ls = Math.max(fs + 2, this.style.labelSize || 18);
      const tk = this.ticks();
      const lbl = (sel) => this._halo(sel.attr('font-size', fs).attr('font-weight', '500').attr('fill', ac));
      const below = ay + fs + 6 < this.H - 4;
      tk.x.labels.forEach(v => {
        lbl(g.append('text').attr('x', this.xs(v)).attr('y', below ? ay + fs + 4 : ay - 8).attr('text-anchor', 'middle'))
          .text(fmtAxis(v, tk.x.fmt, tk.x.dec));
      });
      const left = ax - 40 > 0;
      tk.y.labels.forEach(v => {
        lbl(g.append('text').attr('x', left ? ax - 9 : ax + 9).attr('y', this.ys(v) + fs * 0.35).attr('text-anchor', left ? 'end' : 'start'))
          .text(fmtAxis(v, tk.y.fmt, tk.y.dec));
      });
      // Achsentitel: einzelne Buchstaben kursiv, längere Texte (z. B. „t in s“) aufrecht
      const title = (txt, x, y, anchor) => {
        const el = this._halo(g.append('text').attr('x', x).attr('y', y).attr('text-anchor', anchor)
          .attr('font-size', ls).attr('font-weight', '600').attr('fill', ac));
        this._richText(el, txt, ls, /^[a-zA-Z]$/.test(txt));
      };
      title(this.style.xLabel, r - 2, ay - 10, 'end');
      title(this.style.yLabel, ax + 14, t + 6, 'start');
    },

    // Text mit einfachem Tiefstellen: "G_1", "v_{max}"
    _richText(el, txt, fs, italic) {
      const parts = String(txt).split(/_(\{[^}]*\}|\S)/);
      parts.forEach((p, i) => {
        if (!p) return;
        if (i % 2 === 1) {
          el.append('tspan').attr('dy', fs * 0.28).attr('font-size', fs * 0.72).text(p.replace(/^\{|\}$/g, ''));
          el.append('tspan').attr('dy', -fs * 0.28).text('​');
        } else {
          const ts = el.append('tspan').text(p);
          if (italic) ts.attr('font-style', 'italic');
        }
      });
      return el;
    },

    paintWatermark() {
      this.root.append('text').attr('x', this.PR - 2).attr('y', this.H - 6).attr('text-anchor', 'end')
        .attr('font-size', 10).attr('fill', '#AEAEB2').text('Plotoria · Tobias Schmidbauer');
    },

    // Sprungstellen abschnittsweiser Funktionen im sichtbaren Bereich
    _breaks(pieces, x0, x1) {
      if (!pieces) return [];
      const b = new Set();
      pieces.forEach(q => [q.lo, q.hi].forEach(v => { if (isFinite(v) && v > x0 && v < x1) b.add(v); }));
      return [...b].sort((p, q) => p - q);
    },

    // Kurve in Segmente zerlegen (Polstellen, Definitionslücken und Abschnittsgrenzen unterbrechen die Linie)
    _segments(fn, m) {
      if (fn.param) return this._paramSegments(fn);
      const f = m ? m.f : fn.f;
      const xs = this.xs;
      let [x0, x1] = xs.domain();
      const bd = fn.bounds && fn.bounds();
      if (bd) { x0 = Math.max(x0, bd.lo); x1 = Math.min(x1, bd.hi); }
      if (!(x1 > x0)) return [];
      // Randpunkte genau treffen (bei offenen Grenzen und Sprungstellen minimal nach innen)
      const eps = (x1 - x0) * 1e-9;
      const cuts = [x0, ...this._breaks(m ? m.pieces : fn.pieces, x0, x1), x1];
      const segs = [];
      const total = Math.max(50, Math.ceil((xs(x1) - xs(x0)) * 1.5));
      for (let k = 0; k < cuts.length - 1; k++) {
        const inner = cuts.length > 2;
        let a = cuts[k], b = cuts[k + 1];
        if ((k > 0) || (bd && a === bd.lo && bd.loOpen)) a += eps;
        if ((k < cuts.length - 2) || (bd && b === bd.hi && bd.hiOpen)) b -= eps;
        const N = inner ? Math.max(20, Math.ceil(total * (b - a) / (x1 - x0))) : total;
        segs.push(...this._sample(f, a, b, N));
      }
      return segs;
    },

    _sample(f, a, b, N) {
      const xs = this.xs, ys = this.ys;
      const H = this.PB - this.PT;
      const lo = this.PT - 3 * H, hi = this.PB + 3 * H;
      const segs = [];
      let cur = [], prev = null;
      for (let i = 0; i <= N; i++) {
        const x = a + (b - a) * i / N;
        const y = f(x);
        if (!isFinite(y)) { if (cur.length > 1) segs.push(cur); cur = []; prev = null; continue; }
        const py = ys(y);
        if (prev && Math.abs(py - prev.py) > H) {
          const ym = f((x + prev.x) / 2);
          const loY = Math.min(y, prev.y), hiY = Math.max(y, prev.y), tol = (hiY - loY) * 0.05;
          if (!isFinite(ym) || ym < loY - tol || ym > hiY + tol) { if (cur.length > 1) segs.push(cur); cur = []; }
        }
        cur.push([xs(x), clamp(py, lo, hi)]);
        prev = { x, y, py };
      }
      if (cur.length > 1) segs.push(cur);
      return segs;
    },

    // Spiegelbild an y = x: Punkte (f(t) | t) mit t im sichtbaren y-Bereich
    _paramSegments(fn) {
      const src = fn.param, xs = this.xs, ys = this.ys;
      const [y0, y1] = ys.domain();
      const lo = Math.min(y0, y1), hi = Math.max(y0, y1);
      const W = this.PR - this.PL, H = this.PB - this.PT;
      const N = Math.max(400, Math.ceil(H * 3));
      const segs = [];
      let cur = [], prev = null;
      for (let i = 0; i <= N; i++) {
        const t = lo + (hi - lo) * i / N, x = src(t);
        if (!isFinite(x)) { if (cur.length > 1) segs.push(cur); cur = []; prev = null; continue; }
        const px = xs(x);
        if (prev !== null && Math.abs(px - prev) > W) { if (cur.length > 1) segs.push(cur); cur = []; }
        cur.push([clamp(px, this.PL - 3 * W, this.PR + 3 * W), ys(t)]);
        prev = px;
      }
      if (cur.length > 1) segs.push(cur);
      return segs;
    },

    paintFuncs() {
      const vis = this.fns.filter(f => f.vis && f.f);
      if (!vis.length) return;
      const g = this.root.append('g').attr('clip-path', this._clipUrl());
      const lg = this.root.append('g');
      const ln = d3.line();
      // Winkelhalbierende y = x für Umkehrfunktionen
      if (vis.some(f => f.inv && f.diag !== false)) {
        const [x0, x1] = this.xs.domain();
        const [y0, y1] = this.ys.domain();
        const a = Math.max(x0, Math.min(y0, y1)), b = Math.min(x1, Math.max(y0, y1));
        if (b > a) {
          const col = this._ctx().bw ? '#000' : '#8E8E93';
          g.append('line').attr('x1', this.xs(a)).attr('y1', this.ys(a)).attr('x2', this.xs(b)).attr('y2', this.ys(b))
            .attr('stroke', col).attr('stroke-width', 1.5).attr('stroke-dasharray', '6,5');
          const m = a + (b - a) * 0.88, lx = this.xs(m) + 6, ly = this.ys(m) + 6;
          if (lx > this.PL + 40 && ly < this.PB - 10) {
            this._halo(lg.append('text').attr('x', lx).attr('y', ly + this.style.fontSize * 0.8).attr('text-anchor', 'start')
              .attr('font-size', this.style.fontSize * 0.9).attr('fill', col).attr('font-style', 'italic')).text('y = x');
          }
        }
      }
      vis.forEach(fn => {
        const sw = fn.strokeWidth || 3, col = this._col(fn);
        const pat = this._dash(fn, sw);
        const path = (segs) => g.append('path').attr('d', pat ? this._dashPath(segs, pat, sw) : segs.map(s => ln(s)).join('')).attr('fill', 'none')
          .attr('stroke', col).attr('stroke-width', sw).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
        if (fn.members) {
          const placed = [];
          fn.members.forEach((m, i) => {
            const segs = this._segments(fn, m);
            // Scharkurven in Abstufungen der Grundfarbe
            const mc = this._memberColor(fn, i);
            path(segs).attr('stroke', mc);
            this._endpoints(g, fn, mc, sw, m);
            if (this._ctx().labels && fn.labelMode !== 'none') this._memberLabel(lg, fn, m, segs, mc, placed);
          });
          return;
        }
        const segs = this._segments(fn);
        path(segs);
        this._endpoints(g, fn, col, sw);
        if (this._ctx().labels && fn.labelMode !== 'none') this._graphLabel(lg, fn, segs);
      });
    },

    // Randpunkte [x, y, offen] im Bereich x0…x1: am Definitionsbereich und an Sprungstellen
    _endpointList(fn, m, x0, x1) {
      const out = [];
      if (fn.param) return out;
      const f = m ? m.f : fn.f, f0 = m ? m.f0 : fn.f0;
      const bd = fn.bounds && fn.bounds();
      if (bd) {
        [[bd.lo, bd.loOpen], [bd.hi, bd.hiOpen]].forEach(([x, open]) => {
          if (!isFinite(x) || x < x0 || x > x1) return;
          const y = f0(x);
          if (isFinite(y)) out.push([x, y, open]);
        });
      }
      // Sprungstellen: Grenzwerte links/rechts mit dem Funktionswert vergleichen
      const same = (u, v) => isFinite(u) && isFinite(v) && Math.abs(u - v) <= 1e-6 * Math.max(1, Math.abs(u), Math.abs(v));
      this._breaks(m ? m.pieces : fn.pieces, x0, x1).forEach(b => {
        const e = Math.max(1e-9, Math.abs(b) * 1e-9);
        const yl = f(b - e), yr = f(b + e), yb = f(b);
        if (same(yl, yr) && same(yl, yb)) return;          // stetiger Übergang
        if (isFinite(yb)) out.push([b, yb, false]);
        if (isFinite(yl) && !same(yl, yb)) out.push([b, yl, true]);
        if (isFinite(yr) && !same(yr, yb) && !same(yr, yl)) out.push([b, yr, true]);
      });
      return out;
    },

    _endpoints(g, fn, col, sw, m) {
      const [x0, x1] = this.xs.domain();
      const r = Math.max(3.5, sw * 1.3);
      this._endpointList(fn, m, x0, x1).forEach(([x, y, open]) => {
        g.append('circle').attr('cx', this.xs(x)).attr('cy', this.ys(y)).attr('r', r)
          .attr('fill', open ? (this._ctx().bg || '#fff') : col).attr('stroke', col).attr('stroke-width', Math.max(1.5, sw * 0.6));
      });
    },

    // Farbe einer Scharkurve: Abstufung der Grundfarbe
    _memberColor(fn, i) {
      const col = this._col(fn), n = fn.members ? fn.members.length : 1;
      return this._ctx().bw || n < 2 ? col : d3.color(d3.interpolateRgb(col, '#000')(0.45 * i / (n - 1))).formatHex();
    },

    // Beschriftung einer Scharkurve („a = 2“) an einer freien Stelle nahe dem Kurvenende
    _memberLabel(g, fn, m, segs, col, placed) {
      const fs = this.style.fontSize * 0.95;
      const txt = fn.labelMode === 'term' && fn.ast
        ? fn.letter.replace(/_[a-zA-Z]$/, '') + '(x) = ' + MP.toNice(MP.substitute(fn.ast, fn.family.p, { t: 'num', v: m.v }))
        : (fn.labelMode === 'custom' && fn.labelText ? fn.labelText + ': ' : '') + fn.family.p + ' = ' + fmtDE(m.v, 4);
      const w = txt.length * fs * 0.55 + 4, h = fs + 2;
      const pts = [];
      segs.forEach(s => s.forEach(p => { if (p[1] >= this.PT + h && p[1] <= this.PB - 4 && p[0] >= this.PL + w && p[0] <= this.PR - 4) pts.push(p); }));
      const free = (x, y) => !placed.some(b => x - w < b.x && x > b.x - b.w && y - h < b.y && y > b.y - b.h);
      for (let k = pts.length - 1; k >= 0; k -= 3) {
        const [px, py] = pts[k];
        for (const [lx, ly] of [[px - 6, py - 6], [px - 6, py + h], [px + w + 6, py + h / 2]]) {
          if (lx > this.PR - 2 || ly < this.PT + h || ly > this.PB - 2 || !free(lx, ly)) continue;
          placed.push({ x: lx, y: ly, w, h });
          this._halo(g.append('text').attr('x', lx).attr('y', ly).attr('text-anchor', 'end')
            .attr('font-size', fs).attr('font-weight', '600').attr('fill', col)).text(txt);
          return;
        }
      }
    },

    _labelText(fn) {
      if (fn.labelMode === 'term') return fn.ast ? fn.letter + '(x) = ' + MP.toNice(fn.ast) : fn.letter;
      if (fn.labelMode === 'custom') return fn.labelText || '';
      return null;   // Name G_f
    },

    _graphLabel(g, fn, segs) {
      if (fn.labelX == null) {
        let last = null;
        segs.forEach(s => s.forEach(p => { if (p[1] >= this.PT + 12 && p[1] <= this.PB - 4 && p[0] <= this.PR - 40) last = p; }));
        if (!last) return;
        const px = clamp(last[0] - 18, this.PL + 8, this.PR - 30);
        const py = clamp(last[1] - 10, this.PT + 16, this.PB - 6);
        fn.labelX = this.xs.invert(px);
        fn.labelY = this.ys.invert(py);
      }
      const lx = this.xs(fn.labelX), ly = this.ys(fn.labelY);
      if (lx < this.PL - 20 || lx > this.PR + 20 || ly < this.PT - 20 || ly > this.PB + 20) return;
      const fs = this.style.fontSize * 1.1;
      const txt = this._halo(g.append('text').attr('x', lx).attr('y', ly)
        .attr('font-size', fs).attr('font-weight', '600').attr('fill', this._col(fn)).attr('cursor', 'move'));
      const custom = this._labelText(fn);
      // Lange Texte in der rechten Hälfte rechtsbündig, damit sie nicht abgeschnitten werden
      if (custom && custom.length > 3 && lx > (this.PL + this.PR) / 2) txt.attr('text-anchor', 'end');
      if (custom === null) {
        txt.append('tspan').text('G');
        txt.append('tspan').attr('dy', fs * 0.28).attr('font-size', fs * 0.75).text(fn.letter);
      } else this._richText(txt, custom, fs, false);
      if (this.rc) return;
      this._dragLabel(txt, (px, py) => { fn.labelX = this.xs.invert(px); fn.labelY = this.ys.invert(py); });
    },

    // Beschriftung 1:1 ziehen (Griffpunkt bleibt unter dem Zeiger)
    _dragLabel(txt, onMove, onEnd) {
      let ox = 0, oy = 0;
      txt.call(d3.drag().container(this.svg.node())
        .on('start', (ev) => {
          if (ev.sourceEvent) ev.sourceEvent.stopPropagation();
          ox = ev.x - parseFloat(txt.attr('x')); oy = ev.y - parseFloat(txt.attr('y'));
        })
        .on('drag', (ev) => {
          const px = clamp(ev.x - ox, this.PL + 4, this.PR - 10);
          const py = clamp(ev.y - oy, this.PT + 12, this.PB - 4);
          txt.attr('x', px).attr('y', py);
          onMove(px, py);
        })
        .on('end', () => { if (onEnd) onEnd(); this.commit(); }));
    },

    // ── Kurvendiskussion ──
    _analyze(fn, range) {
      const [x0, x1] = range || this.xs.domain();
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
      const scan = (g, cb) => {
        let lastX = x0, lastS = 0;
        for (let i = 0; i <= N; i++) {
          const b = x0 + i * dx, gb = g(b);
          if (!isFinite(gb) || !isFinite(f(b))) { lastS = 0; continue; }
          const s = Math.sign(gb);
          if (s === 0) continue;
          if (lastS && s !== lastS) { const r = bisect(g, lastX, b); if (r !== null) cb(r); }
          lastS = s; lastX = b;
        }
      };
      const small = (v) => Math.abs(v) < 1e-6 * Math.max(1, yr);
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
        if (small(y)) add('N', r, 0);
      });
      scan(d2, (r) => {
        const y = f(r), h = dx * 0.25;
        if (isFinite(y) && isFinite(d1(r)) && isRoot(d2, r, h)) add('W', r, y);
      });
      const y0 = f(0);
      // S_y nur, wenn dort nicht schon ein anderer Kennpunkt liegt
      if (x0 <= 0 && x1 >= 0 && isFinite(y0) && !pts.some(p => Math.abs(p.x) < dx * 0.5)) add('Sy', 0, y0);
      this._anaCache.set(key, pts);
      return pts;
    },

    fmtPt(v) {
      if (this.style.exact) { const e = Numerics.exact(v); if (e) return e; }
      return fmtDE(v);
    },

    paintSmartLabels() {
      const vis = this.fns.filter(f => f.vis && f.f && !f.members);   // Scharen: zu viele Punkte
      if (!vis.length) return;
      const g = this.root.append('g').attr('class', 'smart-labels');
      const fs = Math.max(11, this.style.fontSize * 0.8);
      const inside = (px, py) => px >= this.PL && px <= this.PR && py >= this.PT && py <= this.PB;
      const bw = this._ctx().bw;
      const W_COLOR = bw ? '#000' : '#AF52DE';
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
          .attr('stroke', this._ctx().bg || '#fff').attr('stroke-width', 1.5);
        const txt = this._halo(g.append('text').attr('x', lx).attr('y', ly).attr('font-size', fs)
          .attr('fill', col).attr('font-weight', '600').attr('cursor', 'move'));
        let wasSub = false;
        parts.forEach(([s, sub]) => {
          const ts = txt.append('tspan').text(s);
          if (sub) ts.attr('font-size', fs * 0.75).attr('dy', fs * 0.25);
          else if (wasSub) ts.attr('dy', -fs * 0.25);
          wasSub = !!sub;
        });
        if (this.rc) return;
        let ox = 0, oy = 0;
        txt.call(d3.drag().container(this.svg.node())
          .on('start', (ev) => { if (ev.sourceEvent) ev.sourceEvent.stopPropagation(); ox = ev.x - parseFloat(txt.attr('x')); oy = ev.y - parseFloat(txt.attr('y')); })
          .on('drag', (ev) => {
            const nx = ev.x - ox, ny = ev.y - oy;
            const o = this.labelOffsets[key] = [nx - px, ny - py];
            txt.attr('x', nx).attr('y', ny);
            line.attr('x2', nx).attr('y2', ny).attr('display', Math.hypot(o[0], o[1]) > fs + 12 ? null : 'none');
          }));
      };
      const coord = (x, y) => '(' + this.fmtPt(x) + ' | ' + this.fmtPt(y) + ')';
      const names = { N: 'N', Max: 'H', Min: 'T', W: 'W' };

      vis.forEach(fn => {
        const pts = this._analyze(fn);
        const counts = {};
        const col = this._col(fn);
        pts.forEach(p => {
          counts[p.type] = (counts[p.type] || 0) + 1;
          if (counts[p.type] > 25) return;
          const key = fn.id + ':' + p.type + ':' + p.x.toPrecision(4);
          const c = p.type === 'W' ? W_COLOR : col;
          if (p.type === 'Sy') draw(key, p.x, p.y, c, [['S'], ['y', true], [coord(p.x, p.y)]], p.type);
          else draw(key, p.x, p.y, c, [[names[p.type]], [fn.letter, true], [coord(p.x, p.y)]], p.type);
        });
      });

      const [x0, x1] = this.xs.domain();
      const N = 600, dx = (x1 - x0) / N;
      const sc = bw ? '#000' : '#8E8E93';
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
                draw('S:' + vis[i].id + ':' + vis[j].id + ':' + r.toPrecision(4), r, y, sc, [['S'], [vis[i].letter + vis[j].letter, true], [coord(r, y)]]);
              }
            }
            a = b; da = db;
          }
        }
      }
    },

    // ── Asymptoten ──
    _asymptotes(fn) {
      const [x0, x1] = this.xs.domain();
      const key = ['A', fn.id, fn.version, x0.toPrecision(6), x1.toPrecision(6), this.deg, JSON.stringify(this.params)].join('|');
      this._anaCache = this._anaCache || new Map();
      if (this._anaCache.has(key)) return this._anaCache.get(key);
      const res = { v: Numerics.verticalAsymptotes(fn.f, x0, x1), o: [] };
      const bd = fn.bounds && fn.bounds();
      [1, -1].forEach(side => {
        if (bd && (side > 0 ? isFinite(bd.hi) : isFinite(bd.lo))) return;
        const a = Numerics.obliqueAsymptote(fn.f, side);
        if (a && !res.o.some(o => o.m === a.m && o.b === a.b)) res.o.push(a);
      });
      this._anaCache.set(key, res);
      return res;
    },

    paintAsymptotes() {
      const vis = this.fns.filter(f => f.vis && f.f && f.asym);
      if (!vis.length) return;
      const g = this.root.append('g').attr('clip-path', this._clipUrl());
      const fs = Math.max(11, this.style.fontSize * 0.8);
      const [x0, x1] = this.xs.domain();
      vis.forEach(fn => {
        const col = this._col(fn), a = this._asymptotes(fn);
        const line = (x1p, y1p, x2p, y2p) => g.append('line').attr('x1', x1p).attr('y1', y1p).attr('x2', x2p).attr('y2', y2p)
          .attr('stroke', col).attr('stroke-width', 1.6).attr('stroke-dasharray', '7,5').attr('opacity', 0.85);
        const label = (x, y, s, anchor) => this._halo(g.append('text').attr('x', x).attr('y', y).attr('text-anchor', anchor || 'start')
          .attr('font-size', fs).attr('font-weight', '600').attr('fill', col)).text(s);
        a.v.forEach(xv => {
          const px = this.xs(xv);
          if (px < this.PL || px > this.PR) return;
          line(px, this.PT, px, this.PB);
          label(px + 5, this.PT + fs + 4, 'x = ' + this.fmtPt(xv));
        });
        a.o.forEach(({ m, b }) => {
          const k = 1 + Math.abs(m), sx = Math.abs(this.xs(1) - this.xs(0)), sy = Math.abs(this.ys(0) - this.ys(1));
          const xm = (x0 + x1) / 2;
          const cl = this._clipLine(this.xs(xm), this.ys(m * xm + b), sx / k, -m * sy / k);
          if (!cl) return;
          line(...cl);
          const eq = m === 0 ? 'y = ' + this.fmtPt(b) : 'y = ' + (m === 1 ? '' : m === -1 ? '−' : this.fmtPt(m)) + 'x' + (b === 0 ? '' : (b > 0 ? ' + ' : ' − ') + this.fmtPt(Math.abs(b)));
          const ly = this.ys(m * x1 + b);
          label(this.xs(x1) - 6, clamp(ly + (m > 0 ? fs + 4 : -6), this.PT + fs, this.PB - 4), eq, 'end');
        });
      });
    },

    paintSelectionRect() {
      if (!this.selectionRect) return;
      const s = this.selectionRect;
      const x = Math.min(s.x0, s.x1), y = Math.min(s.y0, s.y1);
      const w = Math.abs(s.x1 - s.x0), h = Math.abs(s.y1 - s.y0);
      if (w < 1 || h < 1) return;
      this.root.append('rect').attr('x', x).attr('y', y).attr('width', w).attr('height', h).attr('rx', 4)
        .attr('fill', '#007AFF').attr('fill-opacity', 0.08).attr('stroke', '#007AFF').attr('stroke-width', 1.5).attr('stroke-dasharray', '6,4');
    },

    paintTitle() {
      if (!this.graphTitle) return;
      this.root.append('text').attr('x', this.W / 2).attr('y', Math.max(16, Math.min(24, this.PT - 8)))
        .attr('text-anchor', 'middle').attr('font-size', 16).attr('font-weight', '650').attr('letter-spacing', '-0.01em')
        .attr('fill', this._ctx().bw || (this.rc && this.rc.lightOverride) ? '#000' : this._theme().title).text(this.graphTitle);
    },

    // ══════════════════ Werkzeuge & Zeiger ══════════════════

    TOOL_HINTS: {
      point: 'Punkt setzen: klicken – rastet am Raster und an Graphen ein (Alt: frei)',
      text: 'Text einfügen: an die gewünschte Stelle klicken',
      arrow: 'Pfeil zeichnen: von Start nach Ziel ziehen',
      select: 'Bereich aufziehen – Export nutzt ihn, Doppelklick zoomt hinein',
      tangent: 'Über einen Graphen fahren – Klick hält die Tangente fest',
    },

    setTool(tool) {
      if (this.tool === tool && tool !== 'move') tool = 'move';
      if (this.tool === 'tangent' && tool !== 'tangent') this.tangent = null;
      if (this.tool === 'select' && tool !== 'select') this.selectionRect = null;
      if (this._toolCancel) this._toolCancel();
      this.tool = tool;
      this.setSegmented(this.els.toolSeg, tool);
      this.svg.classed('mode-cross', ['point', 'arrow', 'select', 'tangent'].includes(tool));
      this.svg.classed('mode-text', tool === 'text');
      const hint = this.TOOL_HINTS[tool];
      this.els.hint.hidden = !hint;
      if (hint) this.els.hintText.textContent = hint;
      this.repaint();
    },

    _escape() {
      if (this.integral) { this._hideIntegral(); if (this.tool === 'move') return; }
      if (this.tool !== 'move') this.setTool('move');
      else if (this.selected && this.deselect) this.deselect();
    },

    _localPoint(e) {
      const r = this.svg.node().getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    },

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

    _refreshHover() {
      this.overlay.selectAll('*').remove();
      const p = this._lastPointer;
      if (!p || this.tool === 'select' || this.rc) return;
      const [mx, my] = p;
      if (mx < this.PL || mx > this.PR || my < this.PT || my > this.PB) { this.els.crd.classList.remove('visible'); return; }
      const near = this._nearest(mx, my, this.tool === 'tangent' ? 60 : 10);
      let text;
      if (near && this.tool !== 'text' && this.tool !== 'arrow') {
        text = near.fn.letter + '(' + fmtDE(near.x) + ') = ' + fmtDE(near.y);
        if (this.tool === 'tangent') this.paintTangent(this.overlay, this._tangentAt(near.fn, near.x), true);
        else if (this.tool === 'move') this.overlay.append('circle').attr('cx', this.xs(near.x)).attr('cy', this.ys(near.y)).attr('r', 5)
          .attr('fill', this._col(near.fn)).attr('stroke', 'white').attr('stroke-width', 1.5);
      } else {
        text = 'x = ' + fmtDE(this.xs.invert(mx)) + '   y = ' + fmtDE(this.ys.invert(my));
      }
      if (this._hoverExtra) { const t = this._hoverExtra(mx, my); if (t) text = t; }
      this.els.crd.textContent = text;
      this.els.crd.classList.add('visible');
    },

    // ── Auswahlrechteck ──
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
      }
      this.repaint();
    },
    _getSelectionBounds() {
      if (!this.selectionRect) return null;
      const s = this.selectionRect, xs = this._screen ? this._screen.xs : this.xs, ys = this._screen ? this._screen.ys : this.ys;
      const x0 = Math.min(s.x0, s.x1), x1 = Math.max(s.x0, s.x1);
      const y0 = Math.min(s.y0, s.y1), y1 = Math.max(s.y0, s.y1);
      return { xMin: xs.invert(x0), xMax: xs.invert(x1), yMin: ys.invert(y1), yMax: ys.invert(y0) };
    },

    // ── Tangente & Normale ──
    toggleTangent() { this.setTool(this.tool === 'tangent' ? 'move' : 'tangent'); },

    _tangentAt(fn, x) {
      const y = fn.f(x);
      const m = this._derivs(fn).d1(x);
      return { fnId: fn.id, x, y, m: isFinite(m) ? m : NaN, col: this._col(fn) };
    },

    _tangentClick(e) {
      const [mx, my] = this._localPoint(e);
      const near = this._nearest(mx, my, 60);
      if (!near) return;
      this.tangent = this._tangentAt(near.fn, near.x);
      this.repaint();
    },

    // Gerade durch (px, py) mit Richtung (dx, dy) auf den sichtbaren Bereich zuschneiden.
    // Verhindert riesige Pixelkoordinaten, an denen Browser abstürzen (z. B. Tangente an einer Polstelle).
    _clipLine(px, py, dx, dy) {
      const len = Math.hypot(dx, dy);
      if (!isFinite(px) || !isFinite(py) || !(len > 0) || !isFinite(len)) return null;
      dx /= len; dy /= len;
      let t0 = -Infinity, t1 = Infinity;
      const edge = (p, q) => {          // Liang-Barsky: p·t ≤ q
        if (Math.abs(p) < 1e-15) return q >= 0;
        const r = q / p;
        if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
        return true;
      };
      if (!edge(-dx, px - this.PL) || !edge(dx, this.PR - px) || !edge(-dy, py - this.PT) || !edge(dy, this.PB - py)) return null;
      if (!(t0 <= t1) || !isFinite(t0) || !isFinite(t1)) return null;
      return [px + t0 * dx, py + t0 * dy, px + t1 * dx, py + t1 * dy];
    },

    // Strecke auf den sichtbaren Bereich (plus Rand) zuschneiden; null, wenn sie außerhalb liegt
    _clipSeg(x1, y1, x2, y2, margin = 20) {
      if (![x1, y1, x2, y2].every(isFinite)) return null;
      const dx = x2 - x1, dy = y2 - y1;
      let t0 = 0, t1 = 1;
      const L = this.PL - margin, R = this.PR + margin, T = this.PT - margin, B = this.PB + margin;
      for (const [p, q] of [[-dx, x1 - L], [dx, R - x1], [-dy, y1 - T], [dy, B - y1]]) {
        if (p === 0) { if (q < 0) return null; continue; }
        const r = q / p;
        if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
        if (t0 > t1) return null;
      }
      return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
    },

    paintTangent(g0, tg, preview) {
      if (!tg || !isFinite(tg.x) || !isFinite(tg.y) || !isFinite(tg.m)) return;
      const { x, y, m, col } = tg;
      const g = g0.append('g').attr('opacity', preview ? 0.75 : 1);
      const clip = g.append('g').attr('clip-path', this._clipUrl());
      const px = this.xs(x), py = this.ys(y);
      const W = this.PR - this.PL, H = this.PB - this.PT;
      // Nur zeichnen, solange der Berührpunkt in der Nähe des sichtbaren Bereichs liegt
      if (!(px > this.PL - 2 * W && px < this.PR + 2 * W && py > this.PT - 2 * H && py < this.PB + 2 * H)) return;
      // Richtungen in Pixeln (y-Achse zeigt nach unten); durch (1 + |m|) teilen, damit nichts überläuft
      const sx = Math.abs(this.xs(1) - this.xs(0)), sy = Math.abs(this.ys(0) - this.ys(1));
      const k = 1 + Math.abs(m);
      const tl = this._clipLine(px, py, sx / k, -m * sy / k);
      if (tl) clip.append('line').attr('x1', tl[0]).attr('y1', tl[1]).attr('x2', tl[2]).attr('y2', tl[3])
        .attr('stroke', col).attr('stroke-width', 2).attr('stroke-dasharray', '8,4');
      const flat = Math.abs(m) < 1e-12;
      const nl = this._clipLine(px, py, -m * sx / k, -sy / k);    // Normale: Richtung (−m, 1)
      if (nl) clip.append('line').attr('x1', nl[0]).attr('y1', nl[1]).attr('x2', nl[2]).attr('y2', nl[3])
        .attr('stroke', col).attr('stroke-width', 1.5).attr('stroke-dasharray', '2,4').attr('opacity', 0.8);

      const ppu = sx;
      const dxu = ppu >= 30 && ppu <= 300 ? 1 : niceStep(80 / ppu);
      const tx = x + dxu, ty = y + m * dxu;
      const ink = this._styleColors().axis;
      const bw = this._ctx().bw;
      const fs = Math.max(11, this.style.fontSize * 0.8);
      const qx = this.xs(tx), qy = this.ys(ty);
      // Steigungsdreieck nur, wenn es nicht absurd groß wird
      if (Math.abs(qy - py) <= 3 * H && Math.abs(qx - px) <= 3 * W) {
        clip.append('polygon').attr('points', `${px},${py} ${qx},${py} ${qx},${qy}`)
          .attr('fill', bw ? this._hatchUrl() : col).attr('fill-opacity', bw ? 0.5 : 0.12).attr('stroke', ink).attr('stroke-width', 1.2);
        this._halo(clip.append('text').attr('x', (px + qx) / 2).attr('y', py + (m > 0 ? fs + 2 : -6))
          .attr('text-anchor', 'middle').attr('font-size', fs).attr('fill', ink).attr('font-weight', '500')).text('Δx = ' + fmtDE(dxu));
        this._halo(clip.append('text').attr('x', qx + 6).attr('y', (py + qy) / 2 + 4)
          .attr('font-size', fs).attr('fill', ink).attr('font-weight', '500')).text('Δy = ' + this.fmtPt(m * dxu));
      }
      if (px >= this.PL && px <= this.PR && py >= this.PT && py <= this.PB) {
        g.append('circle').attr('cx', px).attr('cy', py).attr('r', 5).attr('fill', col).attr('stroke', 'white').attr('stroke-width', 1.5);
      }
      const lin = (kk, d) => {
        const ks = Math.abs(kk - 1) < 1e-12 ? '' : Math.abs(kk + 1) < 1e-12 ? '−' : this.fmtPt(kk);
        const xs = Math.abs(kk) < 1e-12 ? '' : ks + 'x';
        if (!xs) return 'y = ' + this.fmtPt(d);
        if (Math.abs(d) < 1e-12) return 'y = ' + xs;
        return 'y = ' + xs + (d > 0 ? ' + ' : ' − ') + this.fmtPt(Math.abs(d));
      };
      const lines = ['m = ' + this.fmtPt(m), 't: ' + lin(m, y - m * x), 'n: ' + (flat ? 'x = ' + this.fmtPt(x) : lin(-1 / m, y + x / m))];
      // Gleichungen immer innerhalb der Zeichenfläche
      const lx = clamp(px, this.PL + 8, this.PR - 8), ly = clamp(py, this.PT + fs * 3.6, this.PB - 8);
      const right = lx < (this.PL + this.PR) / 2;
      const tbox = this._halo(g.append('text').attr('x', lx + (right ? 12 : -12)).attr('y', ly - 12 - (lines.length - 1) * fs * 1.2)
        .attr('text-anchor', right ? 'start' : 'end').attr('font-size', fs).attr('fill', col).attr('font-weight', '650'));
      lines.forEach((t, i) => tbox.append('tspan').attr('x', lx + (right ? 12 : -12)).attr('dy', i ? fs * 1.2 : 0).text(t));
    },

    // ── Integral ──
    _showIntegral(f) {
      if (this.tool !== 'move') this.setTool('move');
      if (!f.f) { this._toast('Funktion ist fehlerhaft'); return; }
      const [d0, d1] = this.xs.domain();
      const span = (d1 - d0) / 4, mid = (d0 + d1) / 2, s = niceStep(span / 2);
      const prev = this.integral || {};
      this.integral = { fnId: f.id, a: Math.round((mid - span / 2) / s) * s, b: Math.round((mid + span / 2) / s) * s, mode: prev.mode || 'area', n: prev.n || 4 };
      if (this.integral.a === this.integral.b) this.integral.b += s;
      this.els.hint.hidden = false;
      this.els.hintText.textContent = 'Grenzen a, b ziehen';
      this._syncIntegralCtl();
      this.repaint();
    },

    _syncIntegralCtl() {
      const on = !!this.integral;
      $('integral-ctl').hidden = !on;
      if (!on) return;
      this.setSegmented($('int-mode'), this.integral.mode || 'area');
      $('int-n-wrap').hidden = (this.integral.mode || 'area') === 'area';
      $('int-n').value = this.integral.n || 4;
    },

    // Riemann-Summe: Rechtecke [x0, x1, Höhe] und Summe der orientierten Flächen
    _riemann(f, a, b, n, mode) {
      const h = (b - a) / n, rects = [];
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const x0 = a + i * h, x1 = x0 + h;
        let y;
        if (mode === 'mid') y = f((x0 + x1) / 2);
        else {
          // kleinster bzw. größter Funktionswert im Streifen (Ränder exakt, dazwischen abgetastet)
          let lo = Infinity, hi = -Infinity;
          for (let k = 0; k <= 32; k++) {
            const v = f(x0 + h * k / 32);
            if (!isFinite(v)) { lo = hi = NaN; break; }
            lo = Math.min(lo, v); hi = Math.max(hi, v);
          }
          y = mode === 'lower' ? lo : hi;
        }
        if (!isFinite(y)) return { rects: [], sum: NaN };
        rects.push([x0, x1, y]);
        sum += h * y;
      }
      return { rects, sum };
    },

    _hideIntegral() {
      this.integral = null;
      this._syncIntegralCtl();
      if (this.tool === 'move') this.els.hint.hidden = true;
      this.repaint();
    },

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
      if (!fn || !fn.f) { this.integral = null; return; }
      const { a, b } = this.integral;
      const xs = this.xs, ys = this.ys, bw = this._ctx().bw, col = this._col(fn);
      const g = this.root.append('g').attr('class', 'integral-group');
      const clip = g.append('g').attr('clip-path', this._clipUrl());
      const N = 400, H = this.PB - this.PT;
      const y0 = clamp(ys(0), this.PT - 2 * H, this.PB + 2 * H);
      // Fläche nur im sichtbaren Teil zeichnen (keine riesigen Koordinaten beim Zoomen)
      const [d0, d1] = xs.domain();
      const va = Math.max(a, d0 - (d1 - d0)), vb = Math.min(b, d1 + (d1 - d0));
      const mode = this.integral.mode || 'area';
      const rs = mode !== 'area' ? this._riemann(fn.f, a, b, this.integral.n || 4, mode) : null;
      if (rs) {
        // Rechtecke der Riemann-Summe
        const lim = (py) => clamp(py, this.PT - 2 * H, this.PB + 2 * H);
        rs.rects.forEach(([x0, x1, y]) => {
          if (x1 < d0 || x0 > d1) return;
          const px0 = xs(Math.max(x0, d0 - 1e-9 * (d1 - d0))), px1 = xs(Math.min(x1, d1)), py = lim(ys(y));
          clip.append('rect').attr('x', Math.min(px0, px1)).attr('y', Math.min(py, y0)).attr('width', Math.abs(px1 - px0)).attr('height', Math.abs(y0 - py))
            .attr('fill', bw ? this._hatchUrl() : col).attr('fill-opacity', bw ? 0.5 : 0.2)
            .attr('stroke', col).attr('stroke-width', 1.3).attr('stroke-linejoin', 'round');
        });
      } else if (vb > va) {
        const pts = [[xs(va), y0]];
        for (let i = 0; i <= N; i++) {
          const x = va + (vb - va) * i / N, y = fn.f(x);
          pts.push([xs(x), isFinite(y) ? clamp(ys(y), this.PT - 2 * H, this.PB + 2 * H) : y0]);
        }
        pts.push([xs(vb), y0]);
        clip.append('path').attr('d', d3.line()(pts) + 'Z')
          .attr('fill', bw ? this._hatchUrl() : col).attr('fill-opacity', bw ? 0.6 : 0.22).attr('stroke', 'none');
      }
      const { value, area } = this._computeIntegral(fn.f, a, b);
      const pxA = xs(a), pxB = xs(b);
      const visA = pxA >= this.PL - 8 && pxA <= this.PR + 8, visB = pxB >= this.PL - 8 && pxB <= this.PR + 8;
      [[pxA, visA], [pxB, visB]].forEach(([px, vis]) => { if (vis) clip.append('line').attr('x1', px).attr('y1', this.PT).attr('x2', px).attr('y2', this.PB)
        .attr('stroke', col).attr('stroke-width', 1.5).attr('stroke-dasharray', '6,4'); });
      const fs = Math.max(12, this.style.fontSize);
      const midX = clamp((clamp(pxA, this.PL, this.PR) + clamp(pxB, this.PL, this.PR)) / 2, this.PL + 90, this.PR - 90);
      const txt = this._halo(g.append('text').attr('x', midX).attr('y', this.PT + fs + 30)
        .attr('text-anchor', 'middle').attr('fill', col).attr('font-size', fs).attr('font-weight', '650'));
      if (rs) {
        const n = this.integral.n || 4, name = { lower: 'U', upper: 'O', mid: 'M' }[mode];
        const t1 = txt.append('tspan').attr('x', midX);
        t1.append('tspan').text(name);
        t1.append('tspan').attr('dy', fs * 0.25).attr('font-size', fs * 0.72).text(n);
        t1.append('tspan').attr('dy', -fs * 0.25).text(' = ' + (isFinite(rs.sum) ? fmtDE(rs.sum, 4) : '–'));
        if (isFinite(value)) txt.append('tspan').attr('x', midX).attr('dy', fs * 1.25).attr('font-weight', '500').text('∫ ' + fn.letter + '(x) dx = ' + this.fmtPt(+value.toPrecision(10)));
      } else if (isFinite(value)) {
        txt.append('tspan').attr('x', midX).text('∫ ' + fn.letter + '(x) dx = ' + this.fmtPt(+value.toPrecision(10)));
        txt.append('tspan').attr('x', midX).attr('dy', fs * 1.25).attr('font-weight', '500').text('Fläche A = ' + this.fmtPt(+area.toPrecision(10)));
      } else txt.text('Integral existiert nicht (Definitionslücke)');
      const lbl = (px, s) => this._halo(g.append('text').attr('x', px).attr('y', this.PB - 6).attr('text-anchor', 'middle')
        .attr('font-size', fs * 0.85).attr('font-weight', '600').attr('fill', col)).text(s);
      if (visA) lbl(pxA, 'a = ' + this.fmtPt(a));
      if (visB) lbl(pxB, 'b = ' + this.fmtPt(b));
      if (this.rc) return;
      const snap = (x) => { const s = this.ticks().x.step / 20; return Math.round(x / s) * s; };
      const handle = (px, key) => g.append('rect').attr('x', px - 8).attr('y', this.PT).attr('width', 16).attr('height', this.PB - this.PT)
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
      if (visA) handle(pxA, 'a');
      if (visB) handle(pxB, 'b');
    },

    // ══════════════════ Farbthemen ══════════════════
    themes: {
      auto: {},
      standard: {
        colors: ['#007AFF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE', '#5AC8FA', '#FF2D55', '#5856D6'],
        plotBg: '#FFFFFF', title: '#1C1C1E',
        style: { axisColor: '#1C1C1E', gridColor: '#D1D1D6', axisWidth: 2, gridWidth: 1 },
      },
      projektor: {
        colors: ['#0040DD', '#D70015', '#248A3D', '#C93400', '#8944AB', '#0071A4', '#D30F45', '#3634A3'],
        plotBg: '#FFFFFF', title: '#000000',
        style: { axisColor: '#000000', gridColor: '#AEAEB2', axisWidth: 3, gridWidth: 1.5 },
      },
      dunkel: {
        colors: ['#0A84FF', '#FF453A', '#30D158', '#FF9F0A', '#BF5AF2', '#64D2FF', '#FF375F', '#5E5CE6'],
        plotBg: '#1C1C1E', title: '#F2F2F7', dark: true,
        style: { axisColor: '#E5E5EA', gridColor: '#3A3A3C', axisWidth: 2, gridWidth: 1 },
      },
    },

    _systemDark() { return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); },
    _themeKey(name) { return name === 'auto' ? (this._systemDark() ? 'dunkel' : 'standard') : name; },
    _theme() { return this.themes[this._themeKey(this.theme)] || this.themes.standard; },

    _applyThemeColors(name) {
      const t = this.themes[this._themeKey(name)];
      COLORS.length = 0; COLORS.push(...t.colors);
      document.documentElement.dataset.theme = t.dark ? 'dark' : 'light';
    },

    applyTheme(name, opts) {
      if (!this.themes[name]) return;
      const before = this._theme();
      this.theme = name;
      this._applyThemeColors(name);
      const t = this._theme();
      // Funktionsfarben nur tauschen, wenn sie zur bisherigen Palette gehören (eigene Farben bleiben)
      this.fns.forEach((fn, i) => {
        const k = before.colors ? before.colors.indexOf(fn.col) : -1;
        if (k >= 0 || !(opts && opts.keepColors)) fn.col = t.colors[(k >= 0 ? k : i) % t.colors.length];
      });
      Object.assign(this.style, t.style);
      this._syncControls();
      this.sync();
      if (this.syncObjects) this.syncObjects();
      this.repaint();
    },

    // ══════════════════ Tastatur ══════════════════

    toggleHelp(show) {
      const d = this.els.modal;
      if (show && !d.open) d.showModal();
      else if (!show && d.open) d.close();
    },

    _onKey(e) {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      const anyDialog = document.querySelector('dialog[open]');
      if (e.key === 'Escape') {
        if (anyDialog || typing) return;   // Dialoge schließt der Browser selbst
        this._escape();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 's') { e.preventDefault(); if (this.saveProject) this.saveProject(); return; }
        if (k === 'o') { e.preventDefault(); if (this.openProject) this.openProject(); return; }
        if (k === 'e') { e.preventDefault(); if (this.openExport) this.openExport(); return; }
        if (k === 'p') { e.preventDefault(); if (this.openPrint) this.openPrint(); return; }
        if (typing || anyDialog) return;
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); this.undo(); }
        else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); this.redo(); }
        return;
      }
      if (typing || e.altKey || anyDialog) return;
      const tools = { v: 'move', p: 'point', t: 'text', a: 'arrow', b: 'select', n: 'tangent' };
      const k = e.key.toLowerCase();
      if (tools[k] && !e.shiftKey) { e.preventDefault(); this.setTool(tools[k]); }
      else if (e.key === 'Home') { e.preventDefault(); this.resetView(); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); this.zoomBy(1.25); }
      else if (e.key === '-') { e.preventDefault(); this.zoomBy(0.8); }
      else if (e.key === '?') { e.preventDefault(); this.toggleHelp(true); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && this.selected && this.deleteSelected) { e.preventDefault(); this.deleteSelected(); }
    },

    // ══════════════════ Hilfsfunktionen ══════════════════

    _copy(t, msg) {
      const ok = () => this._toast(msg || 'In die Zwischenablage kopiert');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok).catch(() => this._fcopy(t, msg));
      else this._fcopy(t, msg);
    },
    _fcopy(t, msg) {
      const ta = document.createElement('textarea');
      ta.value = t; ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); this._toast(msg || 'In die Zwischenablage kopiert'); } catch (e) { this._toast('Kopieren fehlgeschlagen'); }
      document.body.removeChild(ta);
    },

    _download(blob, name) {
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = u; a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(u), 1000);
    },

    _fileBase() {
      return (this.graphTitle || 'plotoria-graph').replace(/[^a-zA-Z0-9äöüÄÖÜß \-]/g, '').trim().replace(/\s+/g, '-') || 'plotoria-graph';
    },

    _toast(msg) {
      const old = document.querySelector('.toast'); if (old) old.remove();
      const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
      document.body.appendChild(t);
      requestAnimationFrame(() => t.classList.add('visible'));
      setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 400); }, 2600);
    },

    _shake(el) {
      el.style.animation = 'shake 0.3s ease';
      setTimeout(() => { el.style.animation = ''; }, 320);
    },
  };
})();
