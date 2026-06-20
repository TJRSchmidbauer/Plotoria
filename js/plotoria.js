const Plotoria = {
  functions: [],
  colors: ['#1976D2', '#D32F2F', '#388E3C', '#F57C00', '#7B1FA2', '#00796B', '#5D4037', '#C2185B'],
  nextColor: 0,
  xMin: -10, xMax: 10, yMin: -10, yMax: 10,
  coordTimeout: null,
  pad: { l: 50, r: 30, t: 30, b: 50 },

  init() {
    this.svg = d3.select('#graph-container');
    this.g = this.svg.append('g');
    this.baseXScale = d3.scaleLinear();
    this.baseYScale = d3.scaleLinear();
    this.curXScale = d3.scaleLinear();
    this.curYScale = d3.scaleLinear();

    this.el = {
      funcInput: $('#func-input'),
      funcList: $('#func-list'),
      emptyState: $('#empty-state'),
      coordDisplay: $('#coord-display'),
      tikzArea: $('#tikz-area'),
      tikzToggle: $('#tikz-toggle'),
      tikzImportBtn: $('#tikz-import'),
      tikzExportBtn: $('#tikz-export'),
      svgExportBtn: $('#svg-export'),
      resetViewBtn: $('#reset-view'),
      addBtn: $('#btn-add'),
      addBtnTop: $('#btn-add-top'),
      svgExportTop: $('#svg-export-top'),
    };

    this.el.addBtn.addEventListener('click', () => this.addFunction());
    this.el.addBtnTop.addEventListener('click', () => this.addFunction());
    this.el.funcInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.addFunction(); }
    });
    this.el.tikzToggle.addEventListener('click', () => {
      this.el.tikzToggle.parentElement.nextElementSibling.classList.toggle('open');
    });
    this.el.tikzImportBtn.addEventListener('click', () => this.importTikZ());
    this.el.tikzExportBtn.addEventListener('click', () => this.exportTikZ());
    this.el.svgExportBtn.addEventListener('click', () => this.exportSVG());
    this.el.svgExportTop.addEventListener('click', () => this.exportSVG());
    this.el.resetViewBtn.addEventListener('click', () => this.resetView());

    this.setupZoom();
    this.resize();
    this.renderList();
    this.draw();

    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.resize(), 100);
    });

    this.svg.on('mousemove', (e) => this.onMouseMove(e));
  },

  setupZoom() {
    this.currentT = d3.zoomIdentity;

    this.zoom = d3.zoom()
      .scaleExtent([0.1, 100])
      .on('zoom', (e) => {
        this.currentT = e.transform;
        this.curXScale = this.currentT.rescaleX(this.baseXScale);
        this.curYScale = this.currentT.rescaleY(this.baseYScale);
        this.draw();
      });

    this.svg.call(this.zoom);
  },

  updateScales() {
    const w = this.getPlotW();
    const h = this.getPlotH();

    this.baseXScale
      .domain([this.xMin, this.xMax])
      .range([this.pad.l, this.pad.l + w]);

    this.baseYScale
      .domain([this.yMin, this.yMax])
      .range([this.pad.t + h, this.pad.t]);

    this.curXScale = (this.currentT || d3.zoomIdentity).rescaleX(this.baseXScale);
    this.curYScale = (this.currentT || d3.zoomIdentity).rescaleY(this.baseYScale);
  },

  getPlotW() { return this.width - this.pad.l - this.pad.r; },
  getPlotH() { return this.height - this.pad.t - this.pad.b; },
  pltL() { return this.pad.l; },
  pltR() { return this.width - this.pad.r; },
  pltT() { return this.pad.t; },
  pltB() { return this.height - this.pad.b; },

  resize() {
    const parent = this.svg.node().parentElement;
    const rect = parent.getBoundingClientRect();
    this.width = rect.width || 600;
    this.height = rect.height || 400;
    this.svg.attr('width', this.width).attr('height', this.height);
    this.updateScales();
    this.draw();
  },

  draw() {
    this.g.selectAll('*').remove();
    this.updateScales();
    const xs = this.curXScale, ys = this.curYScale;
    const l = this.pltL(), r = this.pltR(), t = this.pltT(), b = this.pltB();

    this.drawGrid(xs, ys, l, r, t, b);
    this.drawAxes(xs, ys, l, r, t, b);
    this.drawLabels(xs, ys, l, r, t, b);
    this.drawFunctions(xs, ys, l, r);
  },

  niceStep(domain) {
    const range = domain[1] - domain[0];
    const rough = range / 7;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let step;
    if (norm < 1.5) step = 1;
    else if (norm < 3.5) step = 2;
    else if (norm < 7.5) step = 5;
    else step = 10;
    return step * mag;
  },

  drawGrid(xs, ys, l, r, t, b) {
    const xStep = this.niceStep(xs.domain());
    const yStep = this.niceStep(ys.domain());
    const xStart = Math.ceil(xs.domain()[0] / xStep) * xStep;
    const yStart = Math.ceil(ys.domain()[0] / yStep) * yStep;

    const clip = this.g.append('clipPath').attr('id', 'plot-clip');
    clip.append('rect').attr('x', l).attr('y', t).attr('width', r - l).attr('height', b - t);

    const gridG = this.g.append('g').attr('clip-path', 'url(#plot-clip)');

    gridG.append('rect')
      .attr('x', l).attr('y', t).attr('width', r - l).attr('height', b - t)
      .attr('fill', '#fafafa');

    for (let x = xStart; x <= xs.domain()[1]; x += xStep) {
      if (Math.abs(x) < 1e-10) continue;
      const px = xs(x);
      gridG.append('line')
        .attr('x1', px).attr('x2', px).attr('y1', t).attr('y2', b)
        .attr('stroke', '#ccc').attr('stroke-width', 0.8);
    }

    for (let y = yStart; y <= ys.domain()[1]; y += yStep) {
      if (Math.abs(y) < 1e-10) continue;
      const py = ys(y);
      gridG.append('line')
        .attr('x1', l).attr('x2', r).attr('y1', py).attr('y2', py)
        .attr('stroke', '#ccc').attr('stroke-width', 0.8);
    }

    gridG.append('rect')
      .attr('x', l).attr('y', t).attr('width', r - l).attr('height', b - t)
      .attr('fill', 'none').attr('stroke', '#888').attr('stroke-width', 1);
  },

  drawAxes(xs, ys, l, r, t, b) {
    const x0 = xs(0), y0 = ys(0);
    const ax = Math.max(l, Math.min(r, x0));
    const ay = Math.max(t, Math.min(b, y0));
    const aSize = 10, hLen = 8;

    const axisG = this.g.append('g').attr('clip-path', 'url(#plot-clip)');

    axisG.append('line')
      .attr('x1', l).attr('y1', ay).attr('x2', r - aSize).attr('y2', ay)
      .attr('stroke', '#222').attr('stroke-width', 2.2);

    axisG.append('polygon')
      .attr('points', `${r},${ay} ${r - hLen},${ay - 5} ${r - hLen},${ay + 5}`)
      .attr('fill', '#222');

    axisG.append('line')
      .attr('x1', ax).attr('y1', b).attr('x2', ax).attr('y2', t + aSize)
      .attr('stroke', '#222').attr('stroke-width', 2.2);

    axisG.append('polygon')
      .attr('points', `${ax},${t} ${ax - 5},${t + hLen} ${ax + 5},${t + hLen}`)
      .attr('fill', '#222');

    if (ax >= l && ax <= r && ay >= t && ay <= b) {
      axisG.append('text')
        .attr('x', ax + 7).attr('y', ay - 7)
        .attr('font-size', '16').attr('font-weight', '600')
        .attr('fill', '#222').attr('font-family', 'serif')
        .text('O');
    }
  },

  drawLabels(xs, ys, l, r, t, b) {
    const xStep = this.niceStep(xs.domain());
    const yStep = this.niceStep(ys.domain());
    const xStart = Math.ceil(xs.domain()[0] / xStep) * xStep;
    const yStart = Math.ceil(ys.domain()[0] / yStep) * yStep;
    const x0 = Math.max(l, Math.min(r, xs(0)));
    const y0 = Math.max(t, Math.min(b, ys(0)));

    const labelG = this.g.append('g');

    for (let x = xStart; x <= xs.domain()[1]; x += xStep) {
      if (Math.abs(x) < 1e-10) continue;
      const px = xs(x);
      if (px < l || px > r) continue;
      labelG.append('text')
        .attr('x', px).attr('y', b + 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '15').attr('font-weight', '500')
        .attr('fill', '#222').text(this.fmtNum(x));
    }

    for (let y = yStart; y <= ys.domain()[1]; y += yStep) {
      if (Math.abs(y) < 1e-10) continue;
      const py = ys(y);
      if (py < t || py > b) continue;
      labelG.append('text')
        .attr('x', l - 12).attr('y', py + 5)
        .attr('text-anchor', 'end')
        .attr('font-size', '15').attr('font-weight', '500')
        .attr('fill', '#222').text(this.fmtNum(y));
    }

    const ay = Math.max(t, Math.min(b, ys(0)));
    labelG.append('text')
      .attr('x', r + 2).attr('y', ay + 5)
      .attr('font-size', '18').attr('font-weight', '600')
      .attr('font-style', 'italic').attr('fill', '#222')
      .text('x');

    const ax = Math.max(l, Math.min(r, xs(0)));
    labelG.append('text')
      .attr('x', ax + 8).attr('y', t - 6)
      .attr('font-size', '18').attr('font-weight', '600')
      .attr('font-style', 'italic').attr('fill', '#222')
      .text('y');
  },

  fmtNum(v) {
    if (Number.isInteger(v)) return String(v);
    const a = Math.abs(v);
    if (a < 0.01 || a >= 10000) return v.toExponential(1);
    return parseFloat(v.toFixed(4)).toString();
  },

  drawFunctions(xs, ys, l, r) {
    const visible = this.functions.filter(f => f.visible);
    if (visible.length === 0) return;

    const fnG = this.g.append('g').attr('clip-path', 'url(#plot-clip)');

    visible.forEach(fn => {
      const expr = fn.expression.replace(/\bpi\b/g, '(' + Math.PI + ')');
      const samples = 400;
      const xMin = xs.domain()[0], xMax = xs.domain()[1];
      const step = (xMax - xMin) / samples;
      const points = [];

      for (let i = 0; i <= samples; i++) {
        const x = xMin + i * step;
        const px = xs(x);
        if (px < l - 10 || px > r + 10) {
          if (points.length > 1) this.drawFnLine(fnG, points, fn.color);
          points.length = 0;
          continue;
        }
        try {
          const y = this.evalFn(expr, x);
          if (y === null || !isFinite(y)) {
            if (points.length > 1) this.drawFnLine(fnG, points, fn.color);
            points.length = 0;
            continue;
          }
          const py = ys(y);
          if (!isFinite(py) || py < -1000 || py > this.height + 1000) {
            if (points.length > 1) this.drawFnLine(fnG, points, fn.color);
            points.length = 0;
            continue;
          }
          points.push([px, py]);
        } catch (e) {
          if (points.length > 1) this.drawFnLine(fnG, points, fn.color);
          points.length = 0;
        }
      }
      if (points.length > 1) this.drawFnLine(fnG, points, fn.color);
    });
  },

  drawFnLine(g, pts, color) {
    const line = d3.line().x(d => d[0]).y(d => d[1]).curve(d3.curveLinear);
    g.append('path')
      .attr('d', line(pts))
      .attr('fill', 'none').attr('stroke', color)
      .attr('stroke-width', 2.8)
      .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
  },

  evalFn(expr, x) {
    try {
      const result = nerdamer(expr, { x: x }).evaluate();
      const text = result.text();
      if (text === 'infinity' || text === '-infinity' || text === 'nan' || text === 'NaN') return null;
      return parseFloat(text);
    } catch (e) {
      return null;
    }
  },

  onMouseMove(event) {
    const xs = this.curXScale, ys = this.curYScale;
    const rect = this.svg.node().getBoundingClientRect();
    const mx = event.clientX - rect.left, my = event.clientY - rect.top;
    const l = this.pltL(), r = this.pltR(), t = this.pltT(), b = this.pltB();

    if (mx < l || mx > r || my < t || my > b) {
      this.el.coordDisplay.classList.remove('visible');
      return;
    }

    const xVal = xs.invert(mx), yVal = ys.invert(my);
    const fmt = (v) => Math.abs(v - Math.round(v)) < 1e-10 ? String(Math.round(v)) : v.toFixed(3);
    this.el.coordDisplay.textContent = 'x = ' + fmt(xVal) + '  |  y = ' + fmt(yVal);
    this.el.coordDisplay.classList.add('visible');

    clearTimeout(this.coordTimeout);
    this.coordTimeout = setTimeout(() => this.el.coordDisplay.classList.remove('visible'), 2500);
  },

  addFunction(fromTikZ) {
    let input = fromTikZ || this.el.funcInput.value.trim();
    if (!input) return;

    if (MathParser.isDerivativeNotation(input)) {
      const lastFn = this.functions[this.functions.length - 1];
      if (lastFn) {
        const deriv = MathParser.derivativeOf(lastFn.originalInput);
        if (deriv) { this.el.funcInput.value = ''; this.addInternal(deriv, lastFn.originalInput); return; }
      }
      this.el.funcInput.value = '';
      return;
    }
    this.el.funcInput.value = '';
    this.addInternal(input);
  },

  addInternal(input, parentExpr) {
    let expr = input, displayExpr = parentExpr || input;
    const m = input.match(/^([a-zA-Z])\s*\(([^)]*)\)\s*=\s*(.*)/);
    if (m) { expr = m[3].trim(); displayExpr = input; }
    const plain = MathParser.latexToPlain(expr);
    const cleaned = MathParser.validate(plain);
    if (!cleaned) { this.shake(this.el.funcInput); return; }

    const color = this.colors[this.nextColor % this.colors.length];
    this.nextColor++;
    this.functions.push({ id: this.functions.length, expression: cleaned, displayExpr, originalInput: input, color, visible: true });
    this.renderList();
    this.draw();
  },

  removeFunction(id) { this.functions = this.functions.filter(f => f.id !== id); this.renderList(); this.draw(); },
  toggleFunction(id) { const f = this.functions.find(f => f.id === id); if (f) { f.visible = !f.visible; this.renderList(); this.draw(); } },

  renderList() {
    const list = this.el.funcList, empty = this.el.emptyState;
    list.innerHTML = '';
    if (this.functions.length === 0) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';

    this.functions.forEach(fn => {
      const item = document.createElement('div');
      item.className = 'func-item';
      const dot = document.createElement('span'); dot.className = 'func-color'; dot.style.background = fn.color; dot.style.opacity = fn.visible ? '1' : '0.3';
      const text = document.createElement('span'); text.className = 'func-text'; text.textContent = fn.displayExpr;
      const actions = document.createElement('span'); actions.className = 'func-actions';
      const tBtn = document.createElement('button'); tBtn.innerHTML = fn.visible ? '&#9673;' : '&#9675;'; tBtn.title = fn.visible ? 'Ausblenden' : 'Einblenden'; tBtn.addEventListener('click', () => this.toggleFunction(fn.id));
      const dBtn = document.createElement('button'); dBtn.innerHTML = '&#10005;'; dBtn.className = 'danger'; dBtn.title = 'Entfernen'; dBtn.addEventListener('click', () => this.removeFunction(fn.id));
      actions.appendChild(tBtn); actions.appendChild(dBtn);
      item.appendChild(dot); item.appendChild(text); item.appendChild(actions);
      list.appendChild(item);
    });
  },

  resetView() {
    this.currentT = d3.zoomIdentity;
    this.svg.call(this.zoom.transform, d3.zoomIdentity);
    this.updateScales();
    this.draw();
  },

  exportTikZ() {
    const xs = this.curXScale, ys = this.curYScale;
    const domX = xs.domain(), domY = ys.domain();
    const tikz = TikZ.generate(this.functions.filter(f => f.visible), domX[0], domX[1], domY[0], domY[1]);
    this.copyToClipboard(tikz);
  },

  importTikZ() {
    const code = this.el.tikzArea.value.trim();
    if (!code) return;
    const result = TikZ.parse(code);
    if (result.functions.length === 0) { this.showToast('Keine \\addplot-Befehle gefunden'); return; }
    this.functions = []; this.nextColor = 0;
    if (result.bounds) { this.xMin = result.bounds.xMin; this.xMax = result.bounds.xMax; this.yMin = result.bounds.yMin; this.yMax = result.bounds.yMax; }
    result.functions.forEach(f => { this.functions.push({ id: this.functions.length, expression: f, displayExpr: f, originalInput: f, color: this.colors[this.nextColor % this.colors.length], visible: true }); this.nextColor++; });
    this.el.tikzArea.value = '';
    this.updateScales();
    this.renderList();
    this.draw();
  },

  exportSVG() {
    const el = this.svg.node();
    if (!el) return;
    const clone = el.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    let src = new XMLSerializer().serializeToString(clone);
    src = '<?xml version="1.0" standalone="no"?>\n' + src;
    const blob = new Blob([src], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'plotoria-graph.svg';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  copyToClipboard(text) {
    const fn = () => this.showToast('In Zwischenablage kopiert');
    const ef = () => this.fallbackCopy(text);
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(fn).catch(ef); } else { ef(); }
  },
  fallbackCopy(text) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); this.showToast('In Zwischenablage kopiert'); } catch (e) { this.showToast('Kopieren fehlgeschlagen'); }
    document.body.removeChild(ta);
  },

  showToast(msg) {
    const e = document.querySelector('.toast'); if (e) e.remove();
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('visible'));
    setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 300); }, 2000);
  },

  shake(el) {
    el.style.borderColor = '#D32F2F'; el.style.animation = 'shake 0.3s ease';
    setTimeout(() => { el.style.borderColor = ''; el.style.animation = ''; }, 300);
  },
};

function $(id) { return document.getElementById(id); }

document.addEventListener('DOMContentLoaded', () => Plotoria.init());
