(() => {
  const $ = id => document.getElementById(id);

  const COLORS = ['#0066DD', '#DD2200', '#1EA84C', '#E68A00', '#8B3FAD', '#3399CC', '#CC0044', '#4444AA'];

  window.Plotoria = {
    fns: [], ci: 0,
    xMin: -4, xMax: 5, yMin: -10, yMax: 10,
    pad: { l: 55, r: 35, t: 35, b: 55 },
    style: { gridWidth: 1, gridColor: '#D2D2D2', axisWidth: 2, axisColor: '#222', fontSize: 14, labelSize: 18, xLabel: 'x', yLabel: 'y', gridStep: 1 },
    integral: null, params: {}, paramRanges: {}, smartLabels: true, selectionMode: false, selectionRect: null, proportional: true, graphTitle: '', tangent: null, tangentMode: false,
    
    // New Feature States
    angleMode: 'RAD',
    historyStack: [],
    redoStack: [],
    paramAnimTimer: null,
    isParamAnimRunning: false,
    compiledCache: {},

    requestRepaint() {
      if (this._rafPending) return;
      this._rafPending = true;
      requestAnimationFrame(() => {
        this._rafPending = false;
        this.repaint();
      });
    },

    init() {
      this.svg = d3.select('#graph-container');
      this.root = this.svg.append('g');
      this.xs = d3.scaleLinear();
      this.ys = d3.scaleLinear();

      this.zoom = d3.zoom().scaleExtent([0.05, 200]).filter((e) => !this.selectionMode && !this.tangentMode).on('zoom', (e) => {
        this.curT = e.transform;
        this.xs = this.curT.rescaleX(this.baseX);
        this.ys = this.curT.rescaleY(this.baseY);
        this.isZooming = true;
        this.requestRepaint();
        clearTimeout(this._zoomTimer);
        this._zoomTimer = setTimeout(() => {
          this.isZooming = false;
          this.needsSmartPointsUpdate = true;
          this.requestRepaint();
        }, 100);
      });
      this.curT = d3.zoomIdentity;
      this.svg.call(this.zoom);

      this.els = {
        inp: $('func-input'), lst: $('func-list'), emp: $('empty-state'),
        crd: $('coord-display'), tza: $('tikz-area'), tim: $('tikz-import'),
        tex: $('tikz-export'), sex: $('svg-export'), rst: $('reset-view'),
        cib: $('close-integral'), sel: $('select-rect'), tan: $('tangent-btn'),
        atp: $('btn-add-top'), stp: $('svg-export-top'), apply: $('apply-view'),
        gridW: $('set-grid-width'), gridC: $('set-grid-color'),
        axisW: $('set-axis-width'), axisC: $('set-axis-color'),
        fontS: $('set-font-size'), gridStep: $('set-grid-step'),
        xminI: $('set-xmin'), xmaxI: $('set-xmax'),
        yminI: $('set-ymin'), ymaxI: $('set-ymax'),
        xlabI: $('set-xlabel'), ylabI: $('set-ylabel'),
        prop: $('set-proportional'),
        smart: $('smart-labels'),
        pList: $('param-list'), pAdd: $('add-param'), pName: $('param-name-input'), pVal: $('param-value-input'),
        hTitle: $('header-title'),
        
        // New UI Elements
        angleBtn: $('btn-angle-mode'),
        angleTxt: $('angle-mode-text'),
        btnUndo: $('btn-undo'),
        btnRedo: $('btn-redo'),
        btnShare: $('btn-share'),
        btnHelp: $('btn-help'),
        btnPlayParams: $('btn-play-params'),
        presetSelect: $('preset-select'),
        pngExportTop: $('png-export-top'),
        clipboardCopyTop: $('clipboard-copy-top'),
        copyClipboard: $('copy-clipboard'),
        tblStart: $('tbl-start'),
        tblEnd: $('tbl-end'),
        tblStep: $('tbl-step'),
        tblGenerate: $('tbl-generate'),
        tblExportCsv: $('tbl-export-csv'),
        tblContainer: $('table-container'),
        shortcutsModal: $('shortcuts-modal'),
        closeShortcuts: $('close-shortcuts'),
        shareModal: $('share-modal'),
        closeShare: $('close-share'),
        shareUrlInput: $('share-url-input'),
        copyShareUrl: $('copy-share-url'),
      };

      // Main Listeners
      this.els.atp.addEventListener('click', () => this.addFunc());
      this.els.inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.addFunc(); } });
      this.els.tim.addEventListener('click', () => this.importTikZ());
      this.els.tex.addEventListener('click', () => this.exportTikZ());
      this.els.sex.addEventListener('click', () => this.exportSVG());
      this.els.stp.addEventListener('click', () => this.exportSVG());
      this.els.rst.addEventListener('click', () => this.resetView());
      this.els.sel.addEventListener('click', () => this.toggleSelection());
      this.els.tan.addEventListener('click', () => this.toggleTangent());
      this.els.cib.addEventListener('click', () => this._hideIntegral());
      this.els.apply.addEventListener('click', () => this.applyView());
      this.els.prop.addEventListener('change', () => { this.proportional = this.els.prop.checked; if (this.proportional) this._applyProportional(); });
      this.els.smart.addEventListener('change', () => { this.smartLabels = this.els.smart.checked; this.repaint(); });
      $('theme-select').addEventListener('change', () => this.applyTheme($('theme-select').value));
      this.els.pAdd.addEventListener('click', () => this.addParam());
      this.els.pName.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.addParam(); } });
      this.els.hTitle.addEventListener('input', () => { this.graphTitle = this.els.hTitle.value.trim(); this.repaint(); });

      // New Feature Listeners
      if (this.els.angleBtn) this.els.angleBtn.addEventListener('click', () => this.toggleAngleMode());
      if (this.els.btnUndo) this.els.btnUndo.addEventListener('click', () => this.undo());
      if (this.els.btnRedo) this.els.btnRedo.addEventListener('click', () => this.redo());
      if (this.els.btnShare) this.els.btnShare.addEventListener('click', () => this.openShareModal());
      if (this.els.btnHelp) this.els.btnHelp.addEventListener('click', () => this.openShortcutsModal());
      if (this.els.btnPlayParams) this.els.btnPlayParams.addEventListener('click', () => this.toggleParamAnimation());
      if (this.els.presetSelect) this.els.presetSelect.addEventListener('change', (e) => { this.loadPreset(e.target.value); e.target.selectedIndex = 0; });
      if (this.els.pngExportTop) this.els.pngExportTop.addEventListener('click', () => this.exportPNG());
      if (this.els.clipboardCopyTop) this.els.clipboardCopyTop.addEventListener('click', () => this.copyGraphToClipboard());
      if (this.els.copyClipboard) this.els.copyClipboard.addEventListener('click', () => this.copyGraphToClipboard());
      if (this.els.tblGenerate) this.els.tblGenerate.addEventListener('click', () => this.generateTable());
      if (this.els.tblExportCsv) this.els.tblExportCsv.addEventListener('click', () => this.exportTableCSV());
      if (this.els.closeShortcuts) this.els.closeShortcuts.addEventListener('click', () => this.closeShortcutsModal());
      if (this.els.closeShare) this.els.closeShare.addEventListener('click', () => this.closeShareModal());
      if (this.els.copyShareUrl) this.els.copyShareUrl.addEventListener('click', () => { this._copy(this.els.shareUrlInput.value); });

      this.svg.on('mousemove', (e) => {
        this.selectionMode ? this._selMove(e) : this.mousemove(e);
      });
      this.svg.on('mousedown', (e) => {
        if (this.tangentMode) { this._tangentClick(e); return; }
        if (this.selectionMode) this._selDown(e);
      });
      this.svg.on('mouseup', (e) => {
        if (this.selectionMode) this._selUp(e);
      });
      this.svg.on('mouseleave', () => {
        if (this.selectionMode && this._selActive) this._selUp({});
      });

      document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => this.switchTab(tab)));

      // Keyboard Shortcuts
      window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undo(); }
        else if (e.ctrlKey && e.key === 'y') { e.preventDefault(); this.redo(); }
        else if (e.key === 'Escape') {
          if (this.selectionMode) this.toggleSelection();
          if (this.tangentMode) this.toggleTangent();
          if (this.integral) this._hideIntegral();
          this.closeShortcutsModal();
          this.closeShareModal();
        } else if (e.key === 'Home') {
          this.resetView();
        } else if (e.key === '?') {
          this.openShortcutsModal();
        }
      });

      window.addEventListener('resize', () => {
        clearTimeout(this._rt);
        this._rt = setTimeout(() => this.resize(), 80);
      });

      this.els.prop.checked = true;
      this.els.hTitle.value = this.graphTitle;
      
      // Load initial state from URL or LocalStorage
      setTimeout(() => {
        this.resize();
        if (!this.loadStateFromURL()) {
          this.loadStateFromLocalStorage();
        }
        if (!this.fns.length) {
          this.addFunc('x^2');
        }
        this.sync();
        this.syncParams();
        this.repaint();
        this.els.inp.focus();
      }, 50);
    },

    // ── UNDO / REDO HISTORY ──
    pushHistory() {
      if (this.isRestoringHistory) return;
      const snapshot = JSON.stringify({
        fns: this.fns,
        params: this.params,
        xMin: this.xMin, xMax: this.xMax, yMin: this.yMin, yMax: this.yMax,
        angleMode: this.angleMode,
      });
      this.historyStack.push(snapshot);
      if (this.historyStack.length > 30) this.historyStack.shift();
      this.redoStack = [];
      this.saveStateToLocalStorage();
    },

    undo() {
      if (!this.historyStack.length) return;
      const currentSnapshot = JSON.stringify({
        fns: this.fns,
        params: this.params,
        xMin: this.xMin, xMax: this.xMax, yMin: this.yMin, yMax: this.yMax,
        angleMode: this.angleMode,
      });
      this.redoStack.push(currentSnapshot);
      const prevSnapshot = JSON.parse(this.historyStack.pop());
      this._restoreSnapshot(prevSnapshot);
      this._toast('Rückgängig gemacht');
    },

    redo() {
      if (!this.redoStack.length) return;
      const currentSnapshot = JSON.stringify({
        fns: this.fns,
        params: this.params,
        xMin: this.xMin, xMax: this.xMax, yMin: this.yMin, yMax: this.yMax,
        angleMode: this.angleMode,
      });
      this.historyStack.push(currentSnapshot);
      const nextSnapshot = JSON.parse(this.redoStack.pop());
      this._restoreSnapshot(nextSnapshot);
      this._toast('Wiederholt');
    },

    _restoreSnapshot(s) {
      this.isRestoringHistory = true;
      this.fns = s.fns || [];
      this.params = s.params || {};
      this.xMin = s.xMin; this.xMax = s.xMax; this.yMin = s.yMin; this.yMax = s.yMax;
      this.angleMode = s.angleMode || 'RAD';
      MathParser.angleMode = this.angleMode;
      if (this.els.angleTxt) this.els.angleTxt.textContent = this.angleMode;
      this.compiledCache = {};
      this.buildScales();
      this.sync();
      this.syncParams();
      this.repaint();
      this.isRestoringHistory = false;
    },

    // ── ANGLE MODE (RAD / DEG) ──
    toggleAngleMode() {
      this.angleMode = this.angleMode === 'RAD' ? 'DEG' : 'RAD';
      MathParser.angleMode = this.angleMode;
      if (this.els.angleTxt) this.els.angleTxt.textContent = this.angleMode;
      this.compiledCache = {};
      this.repaint();
      this._toast('Winkelmodus: ' + this.angleMode);
    },

    // ── TAB SWITCHING ──
    switchTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const pane = document.getElementById('tab-' + tab.dataset.tab);
      if (pane) pane.classList.add('active');
      if (tab.dataset.tab === 'table') {
        this.generateTable();
      }
    },

    applyView() {
      this.pushHistory();
      this.style.gridWidth = parseFloat(this.els.gridW.value);
      this.style.gridColor = this.els.gridC.value;
      this.style.axisWidth = parseFloat(this.els.axisW.value);
      this.style.axisColor = this.els.axisC.value;
      this.style.fontSize = parseInt(this.els.fontS.value);
      this.style.gridStep = parseFloat(this.els.gridStep.value) || 1;
      this.style.xLabel = this.els.xlabI.value || 'x';
      this.style.yLabel = this.els.ylabI.value || 'y';
      this.xMin = parseFloat(this.els.xminI.value) || -4;
      this.xMax = parseFloat(this.els.xmaxI.value) || 5;
      this.yMin = parseFloat(this.els.yminI.value) || -10;
      this.yMax = parseFloat(this.els.ymaxI.value) || 10;
      if (this.proportional) this._applyProportional();
      this.buildScales();
      this.repaint();
      this._toast('Einstellungen übernommen');
    },

    _applyProportional() {
      const pw = this.W - this.pad.l - this.pad.r;
      const ph = this.H - this.pad.t - this.pad.b;
      if (pw <= 0 || ph <= 0) return;
      const aspect = ph / pw;
      const xRange = this.xMax - this.xMin;
      const yRange = xRange * aspect;
      const yMid = (this.yMin + this.yMax) / 2;
      this.yMin = yMid - yRange / 2;
      this.yMax = yMid + yRange / 2;
      this.els.yminI.value = this.yMin;
      this.els.ymaxI.value = this.yMax;
    },

    resize() {
      const p = this.svg.node().parentElement;
      const r = p.getBoundingClientRect();
      this.W = r.width || 800;
      this.H = r.height || 500;
      this.svg.attr('width', this.W).attr('height', this.H);
      if (this.proportional) this._applyProportional();
      this.buildScales();
      this.repaint();
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
    },

    repaint() {
      if (!this.W || !this.H) return;
      this.root.selectAll('*').remove();
      this.root.attr('font-family', 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif');
      this.paintGrid();
      this.paintAxes();
      this.paintLabels();
      this.paintFuncs();
      this.paintIntegral();
      this.paintSelectionRect();
      if (this.smartLabels) this.paintSmartLabels();
      this.paintTangent();
      this.paintTitle();
    },

    step(dom) {
      const gs = this.style.gridStep;
      if (gs > 0) return gs;
      const r = dom[1] - dom[0], rough = r / 7, mag = Math.pow(10, Math.floor(Math.log10(rough)));
      const n = rough / mag;
      let s = 1; if (n >= 1.5) s = 2; if (n >= 3.5) s = 5; if (n >= 7.5) s = 10;
      return s * mag;
    },

    fmt(v) {
      if (Number.isInteger(v)) return '' + v;
      const a = Math.abs(v);
      if (a < 0.01 || a >= 10000) return v.toExponential(1);
      return parseFloat(v.toFixed(4)).toString();
    },

    paintGrid() {
      const xs = this.xs, ys = this.ys, l = this.PL, r = this.PR, t = this.PT, b = this.PB;
      const g = this.root.append('g');
      const gw = this.style.gridWidth, gc = this.style.gridColor;

      g.append('rect').attr('x', l).attr('y', t).attr('width', r - l).attr('height', b - t)
        .attr('fill', '#fff').attr('stroke', 'none');

      const xStep = this.step(xs.domain()), yStep = this.step(ys.domain());
      const xS = Math.ceil(xs.domain()[0] / xStep) * xStep;
      const yS = Math.ceil(ys.domain()[0] / yStep) * yStep;

      for (let x = xS; x <= xs.domain()[1]; x += xStep) {
        if (Math.abs(x) < 1e-10) continue;
        const px = xs(x);
        if (px < l || px > r) continue;
        g.append('line').attr('x1', px).attr('x2', px).attr('y1', t).attr('y2', b)
          .attr('stroke', gc).attr('stroke-width', gw);
      }
      for (let y = yS; y <= ys.domain()[1]; y += yStep) {
        if (Math.abs(y) < 1e-10) continue;
        const py = ys(y);
        if (py < t || py > b) continue;
        g.append('line').attr('x1', l).attr('x2', r).attr('y1', py).attr('y2', py)
          .attr('stroke', gc).attr('stroke-width', gw);
      }
    },

    paintAxes() {
      const xs = this.xs, ys = this.ys, l = this.PL, r = this.PR, t = this.PT, b = this.PB;
      const x0 = xs(0), y0 = ys(0);
      const ax = Math.max(l, Math.min(r, x0));
      const ay = Math.max(t, Math.min(b, y0));
      const g = this.root.append('g');
      const hl = 9, tk = 5;
      const aw = this.style.axisWidth, ac = this.style.axisColor;

      g.append('line').attr('x1', l).attr('y1', ay).attr('x2', r - hl - 2).attr('y2', ay)
        .attr('stroke', ac).attr('stroke-width', aw);
      g.append('polygon').attr('points', `${r-1},${ay} ${r-1-hl},${ay-5} ${r-1-hl},${ay+5}`).attr('fill', ac);
      g.append('line').attr('x1', ax).attr('y1', b).attr('x2', ax).attr('y2', t + hl + 2)
        .attr('stroke', ac).attr('stroke-width', aw);
      g.append('polygon').attr('points', `${ax},${t+1} ${ax-5},${t+1+hl} ${ax+5},${t+1+hl}`).attr('fill', ac);

      if (ax >= l && ax <= r && ay >= t && ay <= b) {
        g.append('text').attr('x', ax + 8).attr('y', ay - 6)
          .attr('font-size', 17).attr('font-weight', 'bold')
          .attr('fill', ac).text('O');
      }

      const xStep = this.step(xs.domain()), yStep = this.step(ys.domain());
      const xS = Math.ceil(xs.domain()[0] / xStep) * xStep;
      const yS = Math.ceil(ys.domain()[0] / yStep) * yStep;

      for (let x = xS; x <= xs.domain()[1]; x += xStep) {
        if (Math.abs(x) < 1e-10) continue;
        const px = xs(x);
        if (px < l || px > r) continue;
        g.append('line').attr('x1', px).attr('x2', px).attr('y1', ay - tk).attr('y2', ay + tk)
          .attr('stroke', ac).attr('stroke-width', Math.min(aw - 0.5, 2));
      }
      for (let y = yS; y <= ys.domain()[1]; y += yStep) {
        if (Math.abs(y) < 1e-10) continue;
        const py = ys(y);
        if (py < t || py > b) continue;
        g.append('line').attr('x1', ax - tk).attr('x2', ax + tk).attr('y1', py).attr('y2', py)
          .attr('stroke', ac).attr('stroke-width', Math.min(aw - 0.5, 2));
      }
    },

    paintLabels() {
      const xs = this.xs, ys = this.ys, l = this.PL, r = this.PR, t = this.PT, b = this.PB;
      const xStep = this.step(xs.domain()), yStep = this.step(ys.domain());
      const xS = Math.ceil(xs.domain()[0] / xStep) * xStep;
      const yS = Math.ceil(ys.domain()[0] / yStep) * yStep;
      const ay = Math.max(t, Math.min(b, ys(0)));
      const ax = Math.max(l, Math.min(r, xs(0)));
      const g = this.root.append('g');
      const fs = this.style.fontSize, ac = this.style.axisColor;
      const ls = this.style.labelSize || 18;

      for (let x = xS; x <= xs.domain()[1]; x += xStep) {
        if (Math.abs(x) < 1e-10) continue;
        const px = xs(x);
        if (px < l || px > r) continue;
        g.append('text').attr('x', px).attr('y', ay + fs + 4)
          .attr('text-anchor', 'middle').attr('font-size', fs)
          .attr('font-weight', '500').attr('fill', ac).text(this.fmt(x));
      }
      for (let y = yS; y <= ys.domain()[1]; y += yStep) {
        if (Math.abs(y) < 1e-10) continue;
        const py = ys(y);
        if (py < t || py > b) continue;
        g.append('text').attr('x', ax - 10).attr('y', py + 5)
          .attr('text-anchor', 'end').attr('font-size', fs)
          .attr('font-weight', '500').attr('fill', ac).text(this.fmt(y));
      }
      g.append('text').attr('x', r - 1).attr('y', ay - 8)
        .attr('text-anchor', 'end').attr('font-size', ls).attr('font-weight', 'bold')
        .attr('font-style', 'italic').attr('fill', ac).text(this.style.xLabel);
      g.append('text').attr('x', ax + 14).attr('y', t + 5)
        .attr('text-anchor', 'start').attr('font-size', ls).attr('font-weight', 'bold')
        .attr('font-style', 'italic').attr('fill', ac).text(this.style.yLabel);
      g.append('text').attr('x', r - 4).attr('y', b - 4)
        .attr('text-anchor', 'end').attr('font-size', 10)
        .attr('fill', '#bbb').attr('font-family', 'Inter, sans-serif')
        .text('Plotoria von Tobias Schmidbauer');
    },

    // ── FAST COMPILED FUNCTION EVALUATION ──
    _prepareParamsCache() {
      this._paramKeys = Object.keys(this.params);
      this._paramValues = Object.values(this.params);
      this._paramKeyStr = this._paramKeys.join(',') + ':' + this._paramValues.join(',');
    },

    _evalExpr(expr, x, fn) {
      let evalX = x;
      if (this.angleMode === 'DEG') {
        evalX = x * Math.PI / 180;
      }
      if (!this._paramKeyStr) this._prepareParamsCache();

      let compiled = fn ? fn.compiledFunc : null;
      if (!compiled || (fn && (fn.compiledExpr !== expr || fn.compiledParamKeys !== this._paramKeyStr))) {
        try {
          const s = expr.replace(/\bpi\b/g, '(' + Math.PI + ')');
          compiled = nerdamer.buildFunction(s, ['x', ...this._paramKeys]);
          if (fn) {
            fn.compiledFunc = compiled;
            fn.compiledExpr = expr;
            fn.compiledParamKeys = this._paramKeyStr;
          }
        } catch (e) {
          compiled = null;
        }
      }

      if (compiled) {
        try {
          const y = compiled(evalX, ...this._paramValues);
          return isFinite(y) ? y : NaN;
        } catch (e) { return NaN; }
      }

      // Fallback
      try {
        const r = nerdamer(expr.replace(/\bpi\b/g, '(' + Math.PI + ')'), { x: evalX, ...this.params }).evaluate();
        const t = r.text();
        if (t === 'infinity' || t === '-infinity' || t === 'nan' || t === 'NaN') return NaN;
        const y = parseFloat(t);
        return isFinite(y) ? y : NaN;
      } catch (e) { return NaN; }
    },

    paintFuncs() {
      const vis = this.fns.filter(f => f.vis);
      if (!vis.length) return;
      const xs = this.xs, ys = this.ys;
      const g = this.root.append('g');

      vis.forEach(fn => {
        const N = this.isZooming ? 250 : 500;
        const x0 = xs.domain()[0], x1 = xs.domain()[1];
        const pts = [];

        for (let i = 0; i <= N; i++) {
          const x = x0 + (x1 - x0) * i / N;
          const px = xs(x);
          if (px < this.PL - 5 || px > this.PR + 5) { this._flush(pts, fn.col, g, fn); continue; }
          const y = this._evalExpr(fn.expr, x, fn);
          if (!isFinite(y)) { this._flush(pts, fn.col, g, fn); continue; }
          const py = ys(y);
          if (!isFinite(py) || py < -2000 || py > this.H + 2000) { this._flush(pts, fn.col, g, fn); continue; }
          pts.push([px, py]);
        }
        this._flush(pts, fn.col, g, fn);
      });
    },

    _flush(pts, col, g, fn) {
      if (pts.length < 2) { pts.length = 0; return; }
      const ln = d3.line().x(d => d[0]).y(d => d[1]);
      const path = g.append('path').attr('d', ln(pts)).attr('fill', 'none')
        .attr('stroke', col).attr('stroke-width', fn ? fn.strokeWidth || 3.5 : 3.5)
        .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
      
      if (fn && fn.lineStyle === 'dashed') path.attr('stroke-dasharray', '8,5');
      if (fn && fn.lineStyle === 'dotted') path.attr('stroke-dasharray', '2,4');

      if (fn) {
        const last = pts[pts.length - 1];
        if (fn.labelX == null) {
          const initPx = Math.min(this.PR - 24, Math.max(this.PL + 8, last[0] + 8));
          const initPy = Math.min(this.PB - 4, Math.max(this.PT + 12, last[1] - 4));
          fn.labelX = this.xs.invert(initPx);
          fn.labelY = this.ys.invert(initPy);
        }
        const lx = this.xs(fn.labelX), ly = this.ys(fn.labelY);
        const fs = this.style.fontSize * 1.1;
        const txt = g.append('text').attr('x', lx).attr('y', ly)
          .attr('font-size', fs).attr('font-weight', 'bold')
          .attr('fill', col).attr('cursor', 'move');
        txt.append('tspan').text('G');
        txt.append('tspan').attr('dy', fs * 0.28).attr('font-size', fs * 0.75).text(fn.letter);
        const tw = (fn.letter.length + 1) * fs * 0.6;
        const bh = fs * 1.6;
        const bg = g.append('rect').attr('x', lx - 4).attr('y', ly - bh * 0.85)
          .attr('width', tw + 8).attr('height', bh)
          .attr('fill', 'transparent').attr('stroke', 'none').attr('cursor', 'move');
        bg.call(d3.drag()
          .on('start', (ev) => { if (ev.sourceEvent) ev.sourceEvent.stopPropagation(); })
          .on('drag', (event) => {
            const cx = parseFloat(txt.attr('x')), cy = parseFloat(txt.attr('y'));
            const px = Math.max(this.PL + 4, Math.min(this.PR - 4, cx + event.dx));
            const py = Math.max(this.PT + 12, Math.min(this.PB - 4, cy + event.dy));
            fn.labelX = this.xs.invert(px);
            fn.labelY = this.ys.invert(py);
            txt.attr('x', px).attr('y', py);
            bg.attr('x', px - 4).attr('y', py - bh * 0.85);
          }));
      }
      pts.length = 0;
    },

    // ── PRESETS ──
    loadPreset(type) {
      if (!type) return;
      if (type === 'poly') {
        this.addFunc('x^3 - 2*x');
      } else if (type === 'sin') {
        this.addFunc('sin(x)');
      } else if (type === 'gauss') {
        this.addFunc('exp(-x^2)');
      } else if (type === 'rational') {
        this.addFunc('1/x');
      } else if (type === 'param') {
        this.params['a'] = 1;
        this.params['b'] = 0;
        this.params['c'] = -2;
        this.paramRanges['a'] = { min: -10, max: 10 };
        this.paramRanges['b'] = { min: -10, max: 10 };
        this.paramRanges['c'] = { min: -10, max: 10 };
        this.syncParams();
        this.addFunc('a*x^2 + b*x + c');
      }
    },

    // ── SMART LABELS & DRAGGABLE KURVENDISKUSSION ──
    _renderSmartLabel(g, px, py, textStr, color, labelId, defaultDx, defaultDy) {
      const fs = Math.max(9, Math.round(this.style.fontSize * 0.72));
      const circleRadius = Math.max(2.5, Math.round(this.style.fontSize * 0.22));

      this.smartLabelOffsets = this.smartLabelOffsets || {};
      if (!this.smartLabelOffsets[labelId]) {
        this.smartLabelOffsets[labelId] = { dx: defaultDx, dy: defaultDy };
      }
      const offset = this.smartLabelOffsets[labelId];

      const lx = px + offset.dx;
      const ly = py + offset.dy;

      // Circle marker on graph
      g.append('circle')
        .attr('cx', px).attr('cy', py)
        .attr('r', circleRadius)
        .attr('fill', color)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.2);

      let lineEl = null;
      if (Math.hypot(offset.dx - defaultDx, offset.dy - defaultDy) > 8 || Math.hypot(offset.dx, offset.dy) > 20) {
        lineEl = g.append('line')
          .attr('x1', px).attr('y1', py)
          .attr('x2', lx).attr('y2', ly)
          .attr('stroke', color)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3')
          .attr('opacity', 0.65);
      }

      const txt = g.append('text')
        .attr('x', lx).attr('y', ly)
        .attr('font-size', fs)
        .attr('font-weight', '600')
        .attr('fill', color)
        .text(textStr);

      const tw = textStr.length * fs * 0.58;
      const bh = fs * 1.3;
      const bgRect = g.append('rect')
        .attr('x', lx - 2).attr('y', ly - bh * 0.75)
        .attr('width', tw + 4).attr('height', bh)
        .attr('fill', 'transparent')
        .attr('cursor', 'move');

      bgRect.call(d3.drag()
        .on('start', (ev) => { if (ev.sourceEvent) ev.sourceEvent.stopPropagation(); })
        .on('drag', (event) => {
          offset.dx += event.dx;
          offset.dy += event.dy;
          const nlx = px + offset.dx;
          const nly = py + offset.dy;
          txt.attr('x', nlx).attr('y', nly);
          bgRect.attr('x', nlx - 2).attr('y', nly - bh * 0.75);
          if (lineEl) {
            lineEl.attr('x2', nlx).attr('y2', nly);
          }
        })
        .on('end', () => {
          this.requestRepaint();
        })
      );
    },

    computeSmartPoints() {
      const vis = this.fns.filter(f => f.vis);
      if (!vis.length) return;
      const tol = 1e-4;

      vis.forEach(fn => {
        fn.smartPoints = [];
        const f = (x) => this._evalExpr(fn.expr, x, fn);
        const xDom = this.xs.domain();
        const N = 250;
        const stepR = (xDom[1] - xDom[0]) / N;

        // 1. Zeros
        for (let i = 0; i < N; i++) {
          const a = xDom[0] + i * stepR;
          const b = a + stepR;
          const fa = f(a), fb = f(b);
          if (isFinite(fa) && isFinite(fb) && fa * fb < 0) {
            const root = this._bisect(f, a, b, tol);
            if (root !== null && root >= xDom[0] && root <= xDom[1]) {
              const labelId = `null_${fn.id}_${root.toFixed(3)}`;
              fn.smartPoints.push({ x: root, y: 0, text: 'N(' + this.fmt(root) + '|0)', color: fn.col, labelId, defaultDx: 0, defaultDy: 16 });
            }
          }
        }

        // 2. y-intercept
        const y0 = f(0);
        if (isFinite(y0) && Math.abs(y0) < 1e5) {
          const labelId = `sy_${fn.id}`;
          fn.smartPoints.push({ x: 0, y: y0, text: 'S_y(0|' + this.fmt(y0) + ')', color: fn.col, labelId, defaultDx: -28, defaultDy: -8 });
        }

        // 3. Extrema
        try {
          const derExpr = fn.derExpr || MathParser.derivativeOf(fn);
          fn.derExpr = derExpr;
          if (derExpr) {
            const der = (x) => this._evalExpr(derExpr, x, fn);
            for (let i = 0; i < N; i++) {
              const a = xDom[0] + i * stepR;
              const b = a + stepR;
              const da = der(a), db = der(b);
              if (isFinite(da) && isFinite(db) && da * db < 0) {
                const ex = this._bisect(der, a, b, tol);
                if (ex !== null && ex >= xDom[0] && ex <= xDom[1]) {
                  const ey = f(ex);
                  if (isFinite(ey)) {
                    const labelText = (der(ex - 0.01) > 0 ? 'Max' : 'Min') + '(' + this.fmt(ex) + '|' + this.fmt(ey) + ')';
                    const labelId = `ext_${fn.id}_${ex.toFixed(3)}`;
                    fn.smartPoints.push({ x: ex, y: ey, text: labelText, color: fn.col, labelId, defaultDx: 0, defaultDy: -14 });
                  }
                }
              }
            }
          }
        } catch (e) {}

        // 4. Inflection Points
        try {
          const secDerExpr = fn.secDerExpr || MathParser.secondDerivativeOf(fn);
          fn.secDerExpr = secDerExpr;
          if (secDerExpr) {
            const secDer = (x) => this._evalExpr(secDerExpr, x, fn);
            for (let i = 0; i < N; i++) {
              const a = xDom[0] + i * stepR;
              const b = a + stepR;
              const sda = secDer(a), sdb = secDer(b);
              if (isFinite(sda) && isFinite(sdb) && sda * sdb < 0) {
                const wx = this._bisect(secDer, a, b, tol);
                if (wx !== null && wx >= xDom[0] && wx <= xDom[1]) {
                  const wy = f(wx);
                  if (isFinite(wy)) {
                    const labelId = `wende_${fn.id}_${wx.toFixed(3)}`;
                    fn.smartPoints.push({ x: wx, y: wy, text: 'W(' + this.fmt(wx) + '|' + this.fmt(wy) + ')', color: '#9C27B0', labelId, defaultDx: 14, defaultDy: 14 });
                  }
                }
              }
            }
          }
        } catch (e) {}
      });

      // 5. Intersections
      this.intersectionPoints = [];
      for (let i = 0; i < vis.length; i++) {
        for (let j = i + 1; j < vis.length; j++) {
          const fi = (x) => this._evalExpr(vis[i].expr, x, vis[i]);
          const fj = (x) => this._evalExpr(vis[j].expr, x, vis[j]);
          const diff = (x) => fi(x) - fj(x);
          const xDom = this.xs.domain();
          const N2 = 250;
          const stepR = (xDom[1] - xDom[0]) / N2;
          for (let k = 0; k < N2; k++) {
            const a = xDom[0] + k * stepR;
            const b = a + stepR;
            const da = diff(a), db = diff(b);
            if (isFinite(da) && isFinite(db) && da * db < 0) {
              const ix = this._bisect(diff, a, b, 1e-4);
              if (ix !== null && ix >= xDom[0] && ix <= xDom[1]) {
                const iy = fi(ix);
                if (isFinite(iy)) {
                  const labelId = `isect_${vis[i].id}_${vis[j].id}_${ix.toFixed(3)}`;
                  this.intersectionPoints.push({ x: ix, y: iy, text: 'S(' + this.fmt(ix) + '|' + this.fmt(iy) + ')', color: '#444444', labelId, defaultDx: 14, defaultDy: -14 });
                }
              }
            }
          }
        }
      }
    },

    paintSmartLabels() {
      const vis = this.fns.filter(f => f.vis);
      if (!vis.length) return;
      
      if (this.needsSmartPointsUpdate) {
        this.computeSmartPoints();
        this.needsSmartPointsUpdate = false;
      }

      const g = this.root.append('g').attr('class', 'smart-labels');

      vis.forEach(fn => {
        if (!fn.smartPoints) return;
        fn.smartPoints.forEach(pt => {
          const px = this.xs(pt.x), py = this.ys(pt.y);
          if (px >= this.PL && px <= this.PR && py >= this.PT && py <= this.PB) {
            this._renderSmartLabel(g, px, py, pt.text, pt.color, pt.labelId, pt.defaultDx, pt.defaultDy);
          }
        });
      });

      if (this.intersectionPoints) {
        this.intersectionPoints.forEach(pt => {
          const px = this.xs(pt.x), py = this.ys(pt.y);
          if (px >= this.PL && px <= this.PR && py >= this.PT && py <= this.PB) {
            this._renderSmartLabel(g, px, py, pt.text, pt.color, pt.labelId, pt.defaultDx, pt.defaultDy);
          }
        });
      }
    },

    _bisect(f, a, b, tol) {
      let fa = f(a), fb = f(b);
      if (!isFinite(fa) || !isFinite(fb)) return null;
      if (fa * fb > 0) return null;
      for (let i = 0; i < 80; i++) {
        const m = (a + b) / 2;
        const fm = f(m);
        if (!isFinite(fm)) return null;
        if (Math.abs(fm) < tol || (b - a) / 2 < tol) return m;
        if (fa * fm <= 0) { b = m; fb = fm; } else { a = m; fa = fm; }
      }
      return (a + b) / 2;
    },

    // ── MOUSE INSPECTOR & HOVER ──
    mousemove(e) {
      const r = this.svg.node().getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      if (mx < this.PL || mx > this.PR || my < this.PT || my > this.PB) {
        this.els.crd.classList.remove('visible');
        return;
      }
      const x = this.xs.invert(mx), y = this.ys.invert(my);
      const f = v => Math.abs(v - Math.round(v)) < 1e-10 ? '' + Math.round(v) : v.toFixed(3);
      this.els.crd.textContent = 'x = ' + f(x) + '  |  y = ' + f(y);
      this.els.crd.classList.add('visible');
      clearTimeout(this._ct);
      this._ct = setTimeout(() => this.els.crd.classList.remove('visible'), 2500);
    },

    // ── SELECTION RECT (RECTANGLE ZOOM) ──
    toggleSelection() {
      if (this.integral) this._hideIntegral();
      if (this.tangentMode) this.toggleTangent();
      this.selectionMode = !this.selectionMode;
      this.els.sel.classList.toggle('active', this.selectionMode);
      if (!this.selectionMode) {
        this.selectionRect = null;
        this.repaint();
      }
    },

    _selDown(e) {
      const r = this.svg.node().getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      this._selActive = true;
      this.selectionRect = { x0: mx, y0: my, x1: mx, y1: my };
    },

    _selMove(e) {
      if (!this._selActive || !this.selectionRect) return;
      const r = this.svg.node().getBoundingClientRect();
      this.selectionRect.x1 = e.clientX - r.left;
      this.selectionRect.y1 = e.clientY - r.top;
      this.repaint();
    },

    _selUp(e) {
      if (!this._selActive) return;
      this._selActive = false;
      if (this.selectionRect) {
        const dx = Math.abs(this.selectionRect.x1 - this.selectionRect.x0);
        const dy = Math.abs(this.selectionRect.y1 - this.selectionRect.y0);
        if (dx > 10 && dy > 10) {
          const bounds = this._getSelectionBounds();
          if (bounds) {
            this.pushHistory();
            this.xMin = bounds.xMin; this.xMax = bounds.xMax;
            this.yMin = bounds.yMin; this.yMax = bounds.yMax;
            this.buildScales();
            this.toggleSelection();
            this._toast('Bereich herangezoomt');
            return;
          }
        }
        this.selectionRect = null;
      }
      this.repaint();
    },

    paintSelectionRect() {
      if (!this.selectionRect || this._selActive === undefined) return;
      const s = this.selectionRect;
      const x = Math.min(s.x0, s.x1), y = Math.min(s.y0, s.y1);
      const w = Math.abs(s.x1 - s.x0), h = Math.abs(s.y1 - s.y0);
      if (w < 1 || h < 1) return;
      this.root.append('rect').attr('x', x).attr('y', y).attr('width', w).attr('height', h)
        .attr('fill', '#34C759').attr('fill-opacity', 0.15)
        .attr('stroke', '#34C759').attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '6,3');
    },

    paintTitle() {
      if (!this.graphTitle) return;
      this.root.append('text').attr('x', this.W / 2).attr('y', 18)
        .attr('text-anchor', 'middle').attr('font-size', 15).attr('font-weight', '700')
        .attr('fill', '#444').text(this.graphTitle);
    },

    // ── TANGENTS & NORMALS ──
    toggleTangent() {
      if (this.integral) this._hideIntegral();
      if (this.selectionMode) this.toggleSelection();
      this.tangentMode = !this.tangentMode;
      this.els.tan.classList.toggle('active', this.tangentMode);
      if (!this.tangentMode) this.tangent = null;
      this.repaint();
    },

    _tangentClick(e) {
      if (!this.fns.length) return;
      const r = this.svg.node().getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      if (mx < this.PL || mx > this.PR || my < this.PT || my > this.PB) return;
      const x = this.xs.invert(mx);
      const vis = this.fns.filter(f => f.vis);
      if (!vis.length) return;
      let closest = null, minDy = Infinity;
      vis.forEach(fn => {
        const y = this._evalExpr(fn.expr, x, fn);
        if (!isFinite(y)) return;
        const py = this.ys(y);
        const dy = Math.abs(my - py);
        if (dy < minDy) { minDy = dy; closest = { fn, x, y }; }
      });
      if (!closest || minDy > 40) return;
      const eps = 1e-6;
      const y1 = this._evalExpr(closest.fn.expr, closest.x + eps, closest.fn);
      const y2 = this._evalExpr(closest.fn.expr, closest.x - eps, closest.fn);
      const m = isFinite(y1) && isFinite(y2) ? (y1 - y2) / (2 * eps) : 0;
      this.tangent = { x: closest.x, y: closest.y, m, col: closest.fn.col };
      this.repaint();
    },

    paintTangent() {
      if (!this.tangent) return;
      const { x, y, m, col } = this.tangent;
      const run = 2.0;
      const x1 = x - run, x2 = x + run;
      const y1 = y - m * run, y2 = y + m * run;
      const g = this.root.append('g');
      
      // Tangent line
      g.append('line').attr('x1', this.xs(x1)).attr('y1', this.ys(y1))
        .attr('x2', this.xs(x2)).attr('y2', this.ys(y2))
        .attr('stroke', col).attr('stroke-width', 2).attr('stroke-dasharray', '6,3');
      
      g.append('circle').attr('cx', this.xs(x)).attr('cy', this.ys(y))
        .attr('r', 5).attr('fill', col).attr('stroke', 'white').attr('stroke-width', 1.5);
      
      const constC = y - m * x;
      const signStr = constC >= 0 ? '+ ' : '- ';
      const lbl = 't(x) = ' + (m).toFixed(2) + 'x ' + signStr + Math.abs(constC).toFixed(2);
      g.append('text').attr('x', this.xs(x) + 10).attr('y', this.ys(y) - 8)
        .attr('font-size', 11).attr('fill', col).attr('font-weight', '700')
        .text(lbl);
    },

    // ── THEMES ──
    themes: {
      standard: {
        label: 'Standard',
        colors: ['#0066DD', '#DD2200', '#1EA84C', '#E68A00', '#8B3FAD', '#3399CC', '#CC0044', '#4444AA'],
        bg: '#F5F5F7', surface: '#FFFFFF', accent: '#007AFF',
        text: '#1D1D1F', textSecondary: '#86868B',
      },
      projektor: {
        label: 'Projektor',
        colors: ['#0044CC', '#CC0000', '#007A33', '#CC7A00', '#660099', '#006699', '#990033', '#333399'],
        bg: '#FFFFFF', surface: '#FFFFFF', accent: '#0055DD',
        text: '#1D1D1F', textSecondary: '#86868B',
        style: { axisWidth: 3, gridWidth: 1.5, fontSize: 16 }
      },
      dunkel: {
        label: 'Dunkel',
        colors: ['#66B2FF', '#FF6666', '#66CC88', '#FFBB55', '#BB88EE', '#55CCEE', '#FF7799', '#9999EE'],
        bg: '#1C1C1E', surface: '#2C2C2E', accent: '#0A84FF',
        text: '#F5F5F7', textSecondary: '#A0A0A5',
        style: { axisColor: '#ccc', gridColor: '#444', axisWidth: 2 },
      },
    },

    applyTheme(name) {
      const t = this.themes[name];
      if (!t) return;
      COLORS.length = 0; COLORS.push(...t.colors);
      this.fns.forEach((fn, i) => { fn.col = COLORS[i % COLORS.length]; });
      if (t.style) Object.assign(this.style, t.style);
      document.documentElement.style.setProperty('--bg', t.bg);
      document.documentElement.style.setProperty('--surface', t.surface);
      document.documentElement.style.setProperty('--accent', t.accent);
      if (t.text) document.documentElement.style.setProperty('--text', t.text);
      if (t.textSecondary) document.documentElement.style.setProperty('--text-secondary', t.textSecondary);
      this.els.axisC.value = this.style.axisColor;
      this.els.gridC.value = this.style.gridColor;
      this.els.axisW.value = this.style.axisWidth;
      this.sync();
      this.repaint();
    },

    _getSelectionBounds() {
      if (!this.selectionRect) return null;
      const s = this.selectionRect;
      const x0 = Math.min(s.x0, s.x1), x1 = Math.max(s.x0, s.x1);
      const y0 = Math.min(s.y0, s.y1), y1 = Math.max(s.y0, s.y1);
      return { xMin: this.xs.invert(x0), xMax: this.xs.invert(x1), yMin: this.ys.invert(y1), yMax: this.ys.invert(y0) };
    },

    // ── FUNCTION MANAGEMENT ──
    addFunc(src) {
      const raw = src || this.els.inp.value.trim();
      if (!raw) return;
      if (MathParser.isDerivativeNotation(raw)) {
        const last = this.fns[this.fns.length - 1];
        if (last) { const d = MathParser.derivativeOf(last); if (d) { this.els.inp.value = ''; this._add(d); return; } }
        this.els.inp.value = '';
        return;
      }
      this.els.inp.value = '';
      this._add(raw);
    },

    _nameIdx(n) {
      const letters = ['f','g','h','i','k','l','m','o','p','q','r','s','t','u','w','x','z'];
      return letters[n % letters.length];
    },

    _add(raw) {
      let expr = raw, disp = raw;
      let fnLetter = MathParser.extractName(raw);
      const m = raw.match(/^([a-zA-Z])\s*\(([^)]*)\)\s*=\s*(.*)/);
      if (m) { expr = m[3].trim(); disp = raw; fnLetter = m[1]; }
      const p = MathParser.latexToPlain(expr);
      const c = MathParser.validate(p);
      if (!c) { this._shake(this.els.inp); return; }
      if (!fnLetter) fnLetter = this._nameIdx(this.fns.length);
      this.pushHistory();
      this.fns.push({
        id: this.fns.length + '_' + Date.now(), expr: c, disp, orig: raw,
        col: COLORS[this.ci++ % COLORS.length], vis: true, letter: fnLetter, strokeWidth: 3.5,
        lineStyle: 'solid', labelX: null, labelY: null,
      });
      this.needsSmartPointsUpdate = true;
      this.sync();
      this.repaint();
    },

    _editFunc(id, raw, fail) {
      let expr = raw;
      let fnLetter = MathParser.extractName(raw);
      const m = raw.match(/^([a-zA-Z])\s*\(([^)]*)\)\s*=\s*(.*)/);
      if (m) { expr = m[3].trim(); fnLetter = m[1]; }
      const p = MathParser.latexToPlain(expr);
      const c = MathParser.validate(p);
      if (!c) { if (fail) fail(); this._toast('Ungültiger Ausdruck'); return; }
      const f = this.fns.find(f2 => f2.id === id);
      if (!f) return;
      this.pushHistory();
      f.expr = c; f.disp = raw; f.orig = raw;
      if (fnLetter) f.letter = fnLetter;
      f.labelX = null; f.labelY = null;
      this.needsSmartPointsUpdate = true;
      this.sync();
      this.repaint();
    },

    rmFn(id) { this.pushHistory(); this.fns = this.fns.filter(f => f.id !== id); this.needsSmartPointsUpdate = true; this.sync(); this.repaint(); },
    tgFn(id) { const f = this.fns.find(f => f.id === id); if (f) { f.vis = !f.vis; this.sync(); this.repaint(); } },

    sync() {
      const lst = this.els.lst, emp = this.els.emp;
      lst.innerHTML = '';
      if (!this.fns.length) { emp.style.display = 'block'; return; }
      emp.style.display = 'none';
      this.fns.forEach(f => {
        const d = document.createElement('div'); d.className = 'func-item';
        const dot = document.createElement('span'); dot.className = 'func-color';
        dot.style.background = f.col; dot.style.opacity = f.vis ? '1' : '.3';
        
        const label = document.createElement('span'); label.className = 'func-label';
        label.textContent = f.letter + ':';
        
        const t = document.createElement('span'); t.className = 'func-text';
        
        // Render KaTeX if available
        if (window.katex) {
          try {
            const katexHTML = katex.renderToString(f.disp.replace(/\*/g, '\\cdot '), { throwOnError: false });
            t.innerHTML = katexHTML;
          } catch (e) {
            t.textContent = f.disp;
          }
        } else {
          t.textContent = f.disp;
        }
        
        t.title = 'Klicken zum Bearbeiten';
        t.addEventListener('click', () => {
          const inp = document.createElement('input'); inp.type = 'text';
          inp.value = f.orig; inp.className = 'func-edit-input';
          inp.style.cssText = 'flex:1;padding:2px 4px;border:0.5px solid #007AFF;border-radius:4px;font-size:11px;font-family:JetBrains Mono,monospace;outline:none';
          t.replaceWith(inp); inp.focus(); inp.select();
          const done = () => {
            if (!inp.isConnected) return;
            const v = inp.value.trim();
            if (v && v !== f.orig) {
              this._editFunc(f.id, v, () => { inp.replaceWith(t); });
            } else {
              inp.replaceWith(t);
            }
          };
          inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); } });
          inp.addEventListener('blur', done);
        });

        const ca = document.createElement('div'); ca.className = 'func-controls';

        const cp = document.createElement('input'); cp.type = 'color'; cp.value = f.col;
        cp.title = 'Farbe wählen';
        cp.addEventListener('input', () => { f.col = cp.value; dot.style.background = f.col; this.repaint(); });

        const sw = document.createElement('input'); sw.type = 'range'; sw.min = 0.5; sw.max = 8; sw.step = 0.5;
        sw.value = f.strokeWidth || 3.5; sw.title = 'Linienstärke';
        sw.addEventListener('input', () => { f.strokeWidth = parseFloat(sw.value); this.repaint(); });

        const a = document.createElement('span'); a.className = 'func-actions';
        const tb = document.createElement('button'); tb.innerHTML = f.vis ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        tb.title = f.vis ? 'Ausblenden' : 'Einblenden'; tb.addEventListener('click', () => this.tgFn(f.id));
        
        const ab = document.createElement('button'); ab.innerHTML = "f'";
        ab.title = 'Ableitung erzeugen'; ab.addEventListener('click', () => this._addDerivative(f));
        
        const ib = document.createElement('button'); ib.innerHTML = '∫';
        ib.title = 'Integral berechnen'; ib.addEventListener('click', () => this._showIntegral(f));
        
        const db = document.createElement('button'); db.innerHTML = '<i class="fas fa-trash"></i>';
        db.className = 'danger'; db.title = 'Entfernen'; db.addEventListener('click', () => this.rmFn(f.id));
        
        ca.appendChild(cp); ca.appendChild(sw);
        a.appendChild(tb); a.appendChild(ab); a.appendChild(ib); a.appendChild(db);
        d.appendChild(dot); d.appendChild(label); d.appendChild(t); d.appendChild(ca); d.appendChild(a);
        lst.appendChild(d);
      });
    },

    _addDerivative(f) {
      const d = MathParser.derivativeOf(f);
      if (d) this._add(d);
    },

    // ── INTEGRAL (SIMPSON'S RULE) ──
    _showIntegral(f) {
      if (this.tangentMode) this.toggleTangent();
      if (this.selectionMode) this.toggleSelection();
      const dom = this.xs.domain();
      const mid = (dom[0] + dom[1]) / 2;
      this.integral = { fn: f, a: mid - 1.5, b: mid + 1.5 };
      this.els.cib.style.display = '';
      this.repaint();
    },

    _hideIntegral() {
      this.integral = null;
      this.els.cib.style.display = 'none';
      this.repaint();
    },

    _computeIntegral(fn, a, b) {
      // Simpson's Rule integration for precision
      const N = 200;
      const h = (b - a) / N;
      let sum = this._evalExpr(fn.expr, a, fn) + this._evalExpr(fn.expr, b, fn);
      for (let i = 1; i < N; i += 2) {
        sum += 4 * this._evalExpr(fn.expr, a + i * h, fn);
      }
      for (let i = 2; i < N - 1; i += 2) {
        sum += 2 * this._evalExpr(fn.expr, a + i * h, fn);
      }
      return (sum * h) / 3;
    },

    paintIntegral() {
      if (!this.integral) return;
      const { fn, a, b } = this.integral;
      const xs = this.xs, ys = this.ys;
      const N = 200;
      const g = this.root.append('g').attr('class', 'integral-group');
      const pxA = xs(a), pxB = xs(b);
      const x0 = Math.max(xs.domain()[0], a);
      const x1 = Math.min(xs.domain()[1], b);
      const step = (x1 - x0) / N;

      const areaPts = [[xs(x0), ys(0)]];
      for (let i = 0; i <= N; i++) {
        const x = x0 + i * step;
        const y = this._evalExpr(fn.expr, x, fn);
        if (isFinite(y)) areaPts.push([xs(x), ys(y)]);
      }
      areaPts.push([xs(x1), ys(0)]);
      if (areaPts.length > 2) {
        const areaGen = d3.line().x(d => d[0]).y(d => d[1]);
        g.append('path').attr('d', areaGen(areaPts))
          .attr('fill', fn.col).attr('fill-opacity', 0.22).attr('stroke', 'none');
      }

      const val = this._computeIntegral(fn, a, b);
      const valStr = Math.abs(val) < 1e-10 ? '0' : val.toFixed(4);

      g.append('line').attr('x1', pxA).attr('y1', this.PT).attr('x2', pxA).attr('y2', this.PB)
        .attr('stroke', fn.col).attr('stroke-width', 2).attr('stroke-dasharray', '6,4');
      g.append('line').attr('x1', pxB).attr('y1', this.PT).attr('x2', pxB).attr('y2', this.PB)
        .attr('stroke', fn.col).attr('stroke-width', 2).attr('stroke-dasharray', '6,4');

      const midX = (pxA + pxB) / 2;
      g.append('text').attr('x', midX).attr('y', this.PT + 18)
        .attr('text-anchor', 'middle').attr('fill', fn.col)
        .attr('font-size', 14).attr('font-weight', 'bold')
        .attr('class', 'integral-label').text('∫ = ' + valStr);

      g.append('rect').attr('x', pxA - 5).attr('y', this.PT).attr('width', 10).attr('height', this.PB - this.PT)
        .attr('fill', 'transparent').attr('cursor', 'ew-resize').attr('class', 'integral-handle-a');
      g.append('rect').attr('x', pxB - 5).attr('y', this.PT).attr('width', 10).attr('height', this.PB - this.PT)
        .attr('fill', 'transparent').attr('cursor', 'ew-resize').attr('class', 'integral-handle-b');

      requestAnimationFrame(() => {
        const selA = this.root.select('.integral-handle-a');
        const selB = this.root.select('.integral-handle-b');
        if (!selA.empty()) {
          selA.call(d3.drag().on('drag', (event) => {
            const dom = this.xs.domain();
            const x = this.xs.invert(event.x);
            this.integral.a = Math.max(dom[0], Math.min(this.integral.b - 0.1, x));
            this.repaint();
          }));
        }
        if (!selB.empty()) {
          selB.call(d3.drag().on('drag', (event) => {
            const dom = this.xs.domain();
            const x = this.xs.invert(event.x);
            this.integral.b = Math.min(dom[1], Math.max(this.integral.a + 0.1, x));
            this.repaint();
          }));
        }
      });
    },

    // ── PARAMETERS & ANIMATION LOOP ──
    addParam() {
      const name = this.els.pName.value.trim().toLowerCase();
      if (!name || name.length !== 1 || !/^[a-z]$/.test(name)) { this._toast('Bitte einen Buchstaben (a-z) eingeben'); return; }
      if (name === 'x') { this._toast('x ist bereits als Variable reserviert'); return; }
      if (this.params[name] !== undefined) { this._toast('Parameter ' + name + ' gibt es bereits'); return; }
      const val = parseFloat(this.els.pVal.value) || 0;
      this.pushHistory();
      this.params[name] = val;
      this.paramRanges[name] = { min: -10, max: 10 };
      this.els.pName.value = '';
      this.compiledCache = {};
      this.syncParams();
      this.repaint();
    },

    removeParam(name) {
      this.pushHistory();
      delete this.params[name];
      delete this.paramRanges[name];
      this.compiledCache = {};
      this.syncParams();
      this.repaint();
    },

    toggleParamAnimation() {
      if (this.isParamAnimRunning) {
        this.stopParamAnimation();
      } else {
        this.startParamAnimation();
      }
    },

    startParamAnimation() {
      const names = Object.keys(this.params);
      if (!names.length) { this._toast('Keine Parameter vorhanden'); return; }
      this.isParamAnimRunning = true;
      if (this.els.btnPlayParams) this.els.btnPlayParams.innerHTML = '<i class="fas fa-pause"></i> Stoppen';
      let angle = 0;
      this.paramAnimTimer = setInterval(() => {
        angle += 0.05;
        names.forEach(name => {
          this.params[name] = Math.round(Math.sin(angle) * 5 * 10) / 10;
        });
        this.syncParams();
        this.repaint();
      }, 50);
    },

    stopParamAnimation() {
      this.isParamAnimRunning = false;
      if (this.paramAnimTimer) clearInterval(this.paramAnimTimer);
      if (this.els.btnPlayParams) this.els.btnPlayParams.innerHTML = '<i class="fas fa-play"></i> Animieren';
    },

    syncParams() {
      const list = this.els.pList;
      list.innerHTML = '';
      const names = Object.keys(this.params);
      if (!names.length) return;
      names.forEach(name => {
        const d = document.createElement('div'); d.className = 'param-item';
        const lbl = document.createElement('span'); lbl.className = 'param-name'; lbl.textContent = name + ' =';
        const range = document.createElement('input'); range.type = 'range';
        const rng = this.paramRanges[name] || { min: -10, max: 10 };
        range.min = rng.min; range.max = rng.max; range.step = 0.1;
        range.value = this.params[name];
        range.addEventListener('input', () => {
          this.params[name] = parseFloat(range.value);
          num.value = range.value;
          this.repaint();
        });

        const num = document.createElement('input'); num.type = 'number';
        num.value = this.params[name]; num.step = 0.1;
        num.addEventListener('change', () => {
          const v = parseFloat(num.value) || 0;
          this.params[name] = v;
          range.value = v;
          this.repaint();
        });

        const del = document.createElement('button'); del.className = 'param-del';
        del.innerHTML = '✕'; del.title = 'Entfernen';
        del.addEventListener('click', () => this.removeParam(name));

        d.appendChild(lbl); d.appendChild(range); d.appendChild(num); d.appendChild(del);
        list.appendChild(d);
      });
    },

    // ── WERTETABELLE (TABLE OF VALUES) ──
    generateTable() {
      const container = this.els.tblContainer;
      if (!container) return;
      const vis = this.fns.filter(f => f.vis);
      if (!vis.length) {
        container.innerHTML = '<div class="empty-state">Keine aktiven Funktionen vorhanden.</div>';
        return;
      }
      const start = parseFloat(this.els.tblStart.value) || -5;
      const end = parseFloat(this.els.tblEnd.value) || 5;
      const step = parseFloat(this.els.tblStep.value) || 1;

      let html = '<table class="plotoria-table"><thead><tr><th>x</th>';
      vis.forEach(fn => { html += `<th>${fn.letter}(x)</th>`; });
      html += '</tr></thead><tbody>';

      for (let x = start; x <= end + 1e-9; x += step) {
        const xFixed = parseFloat(x.toFixed(4));
        html += `<tr><td>${xFixed}</td>`;
        vis.forEach(fn => {
          const y = this._evalExpr(fn.expr, xFixed, fn);
          html += `<td>${isFinite(y) ? this.fmt(y) : 'n.d.'}</td>`;
        });
        html += '</tr>';
      }
      html += 'tbody></table>';
      container.innerHTML = html;
    },

    exportTableCSV() {
      const vis = this.fns.filter(f => f.vis);
      if (!vis.length) { this._toast('Keine aktiven Funktionen'); return; }
      const start = parseFloat(this.els.tblStart.value) || -5;
      const end = parseFloat(this.els.tblEnd.value) || 5;
      const step = parseFloat(this.els.tblStep.value) || 1;

      let csv = 'x;' + vis.map(f => f.letter + '(x)').join(';') + '\n';
      for (let x = start; x <= end + 1e-9; x += step) {
        const xFixed = parseFloat(x.toFixed(4));
        const row = [xFixed];
        vis.forEach(fn => {
          const y = this._evalExpr(fn.expr, xFixed, fn);
          row.push(isFinite(y) ? y.toString().replace('.', ',') : '');
        });
        csv += row.join(';') + '\n';
      }
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'wertetabelle.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this._toast('Wertetabelle als CSV heruntergeladen');
    },

    // ── RASTER & PNG EXPORT / CLIPBOARD ──
    exportPNG() {
      const el = this.svg.node();
      if (!el) return;
      const c = el.cloneNode(true);
      c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const svgString = new XMLSerializer().serializeToString(c);
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = this.W * 2; // 2x scale for crisp export
        canvas.height = this.H * 2;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
          a.download = (this.graphTitle || 'plotoria-graph').replace(/\s+/g, '-') + '.png';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this._toast('PNG-Bild heruntergeladen');
        });
      };
      img.src = url;
    },

    copyGraphToClipboard() {
      const el = this.svg.node();
      if (!el) return;
      const c = el.cloneNode(true);
      c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const svgString = new XMLSerializer().serializeToString(c);
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = this.W * 2;
        canvas.height = this.H * 2;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (navigator.clipboard && window.ClipboardItem) {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).then(() => {
              this._toast('Graph als PNG in Zwischenablage kopiert');
            }).catch(() => this.exportPNG());
          } else {
            this.exportPNG();
          }
          URL.revokeObjectURL(url);
        });
      };
      img.src = url;
    },

    // ── URL SHARING & LOCALSTORAGE ──
    generateShareURL() {
      const state = {
        fns: this.fns.map(f => f.orig),
        params: this.params,
        xMin: this.xMin, xMax: this.xMax, yMin: this.yMin, yMax: this.yMax,
        angleMode: this.angleMode,
      };
      const json = JSON.stringify(state);
      const encoded = encodeURIComponent(btoa(json));
      return window.location.origin + window.location.pathname + '#state=' + encoded;
    },

    openShareModal() {
      const url = this.generateShareURL();
      if (this.els.shareUrlInput) this.els.shareUrlInput.value = url;
      if (this.els.shareModal) this.els.shareModal.style.display = 'flex';
    },

    closeShareModal() {
      if (this.els.shareModal) this.els.shareModal.style.display = 'none';
    },

    openShortcutsModal() {
      if (this.els.shortcutsModal) this.els.shortcutsModal.style.display = 'flex';
    },

    closeShortcutsModal() {
      if (this.els.shortcutsModal) this.els.shortcutsModal.style.display = 'none';
    },

    loadStateFromURL() {
      const hash = window.location.hash;
      if (!hash || !hash.includes('state=')) return false;
      try {
        const raw = hash.split('state=')[1];
        const json = atob(decodeURIComponent(raw));
        const s = JSON.parse(json);
        if (s.fns && Array.isArray(s.fns)) {
          this.fns = []; this.ci = 0;
          s.fns.forEach(f => this._add(f));
        }
        if (s.params) this.params = s.params;
        if (s.xMin) this.xMin = s.xMin;
        if (s.xMax) this.xMax = s.xMax;
        if (s.yMin) this.yMin = s.yMin;
        if (s.yMax) this.yMax = s.yMax;
        if (s.angleMode) { this.angleMode = s.angleMode; MathParser.angleMode = s.angleMode; }
        return true;
      } catch (e) {
        return false;
      }
    },

    saveStateToLocalStorage() {
      try {
        const state = {
          fns: this.fns.map(f => f.orig),
          params: this.params,
          xMin: this.xMin, xMax: this.xMax, yMin: this.yMin, yMax: this.yMax,
          angleMode: this.angleMode,
        };
        localStorage.setItem('plotoria_session', JSON.stringify(state));
      } catch (e) {}
    },

    loadStateFromLocalStorage() {
      try {
        const raw = localStorage.getItem('plotoria_session');
        if (!raw) return false;
        const s = JSON.parse(raw);
        if (s.fns && Array.isArray(s.fns) && s.fns.length > 0) {
          this.fns = []; this.ci = 0;
          s.fns.forEach(f => this._add(f));
        }
        if (s.params) this.params = s.params;
        if (s.angleMode) { this.angleMode = s.angleMode; MathParser.angleMode = s.angleMode; }
        return true;
      } catch (e) { return false; }
    },

    // ── TIKZ EXPORT & IMPORT ──
    _getExportBounds() {
      const sel = this._getSelectionBounds();
      if (sel) return sel;
      const d = this.xs.domain(), d2 = this.ys.domain();
      return { xMin: d[0], xMax: d[1], yMin: d2[0], yMax: d2[1] };
    },

    resetView() {
      this.curT = d3.zoomIdentity;
      this.svg.call(this.zoom.transform, d3.zoomIdentity);
      this.buildScales();
      this.repaint();
    },

    exportTikZ() {
      const b = this._getExportBounds();
      const c = TikZ.generate(this.fns.filter(f => f.vis), b.xMin, b.xMax, b.yMin, b.yMax, this.graphTitle);
      this._copy(c);
      const hint = this.selectionRect ? ' (Auswahl)' : this.integral ? ' (Integral)' : '';
      this._toast('TikZ-Code kopiert' + hint);
    },

    importTikZ() {
      const c = this.els.tza.value.trim();
      if (!c) return;
      const r = TikZ.parse(c);
      if (!r.functions.length) { this._toast('Keine \\addplot-Befehle gefunden'); return; }
      this.pushHistory();
      this.fns = []; this.ci = 0;
      if (r.bounds) { this.xMin = r.bounds.xMin; this.xMax = r.bounds.xMax; this.yMin = r.bounds.yMin; this.yMax = r.bounds.yMax; }
      r.functions.forEach(f => {
        this.fns.push({
          id: this.fns.length + '_' + Date.now(), expr: f, disp: f, orig: f,
          col: COLORS[this.ci++ % COLORS.length], vis: true, strokeWidth: 3.5, letter: this._nameIdx(this.fns.length), labelX: null, labelY: null,
        });
      });
      this.els.tza.value = '';
      this.buildScales();
      this.sync();
      this.repaint();
    },

    _exportSVGRange(x0, x1, y0, y1, suffix) {
      const xm = this.xMin, xM = this.xMax, ym = this.yMin, yM = this.yMax;
      const savedIntegral = this.integral;
      this.integral = null;
      this.xMin = x0; this.xMax = x1; this.yMin = y0; this.yMax = y1;
      this.buildScales();
      this.repaint();
      const el = this.svg.node();
      const c = el.cloneNode(true);
      c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      let s = new XMLSerializer().serializeToString(c);
      s = s.replace(/(<svg[^>]*>)/, '$1\n  <title>' + (this.graphTitle || 'Plotoria') + '</title>');
      s = '<?xml version="1.0" standalone="no"?>\n' + s;
      const b = new Blob([s], { type: 'image/svg+xml' });
      const u = URL.createObjectURL(b);
      const a = document.createElement('a'); a.href = u;
      const fn = (this.graphTitle || 'plotoria-graph').replace(/[^a-zA-Z0-9äöüß \-]/g, '').trim().replace(/\s+/g, '-') || 'plotoria-graph';
      a.download = fn + suffix + '.svg';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(u);
      this.xMin = xm; this.xMax = xM; this.yMin = ym; this.yMax = yM;
      this.integral = savedIntegral;
      this.buildScales();
      this.repaint();
    },

    exportSVG() {
      if (this.selectionRect) {
        const b = this._getSelectionBounds();
        this._exportSVGRange(b.xMin, b.xMax, b.yMin, b.yMax, '-auswahl');
        this._toast('SVG der Auswahl exportiert');
      } else if (this.integral) {
        this._exportSVGRange(this.integral.a, this.integral.b, this.yMin, this.yMax, '-integral');
        this._toast('SVG des Integrals exportiert');
      } else {
        const el = this.svg.node();
        if (!el) return;
        const c = el.cloneNode(true);
        c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        let s = new XMLSerializer().serializeToString(c);
        s = s.replace(/(<svg[^>]*>)/, '$1\n  <title>' + (this.graphTitle || 'Plotoria') + '</title>');
        s = '<?xml version="1.0" standalone="no"?>\n' + s;
        const b = new Blob([s], { type: 'image/svg+xml' });
        const u = URL.createObjectURL(b);
        const a = document.createElement('a'); a.href = u;
        a.download = (this.graphTitle || 'plotoria-graph').replace(/[^a-zA-Z0-9äöüß \-]/g, '').trim().replace(/\s+/g, '-') || 'plotoria-graph';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(u);
        this._toast('SVG exportiert');
      }
    },

    _copy(t) {
      const ok = () => this._toast('In Zwischenablage kopiert');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(ok).catch(() => this._fcopy(t));
      } else { this._fcopy(t); }
    },
    _fcopy(t) {
      const ta = document.createElement('textarea');
      ta.value = t; ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); this._toast('In Zwischenablage kopiert'); }
      catch (e) { this._toast('Kopieren fehlgeschlagen'); }
      document.body.removeChild(ta);
    },

    _toast(msg) {
      const e = document.querySelector('.toast'); if (e) e.remove();
      const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
      document.body.appendChild(t);
      requestAnimationFrame(() => t.classList.add('visible'));
      setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 300); }, 2200);
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

