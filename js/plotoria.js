const Plotoria = {
  functions: [],
  colors: ['#1976D2', '#D32F2F', '#388E3C', '#F57C00', '#7B1FA2', '#00796B', '#5D4037', '#C2185B'],
  nextColor: 0,
  plotInstance: null,
  xMin: -10, xMax: 10, yMin: -10, yMax: 10,
  coordTimeout: null,

  init() {
    this.el = {
      container: document.getElementById('graph-container'),
      funcInput: document.getElementById('func-input'),
      funcList: document.getElementById('func-list'),
      emptyState: document.getElementById('empty-state'),
      coordDisplay: document.getElementById('coord-display'),
      tikzArea: document.getElementById('tikz-area'),
      tikzToggle: document.getElementById('tikz-toggle'),
      tikzImportBtn: document.getElementById('tikz-import'),
      tikzExportBtn: document.getElementById('tikz-export'),
      svgExportBtn: document.getElementById('svg-export'),
      resetViewBtn: document.getElementById('reset-view'),
    };

    this.el.addBtn = document.getElementById('btn-add');
    this.el.addBtnTop = document.getElementById('btn-add-top');
    this.el.svgExportTop = document.getElementById('svg-export-top');

    this.el.addBtn.addEventListener('click', () => this.addFunction());
    this.el.addBtnTop.addEventListener('click', () => this.addFunction());
    this.el.funcInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addFunction();
      }
    });

    this.el.tikzToggle.addEventListener('click', () => {
      const area = this.el.tikzToggle.parentElement.nextElementSibling;
      area.classList.toggle('open');
    });
    this.el.tikzImportBtn.addEventListener('click', () => this.importTikZ());
    this.el.tikzExportBtn.addEventListener('click', () => this.exportTikZ());
    this.el.svgExportBtn.addEventListener('click', () => this.exportSVG());
    this.el.svgExportTop.addEventListener('click', () => this.exportSVG());
    this.el.resetViewBtn.addEventListener('click', () => this.resetView());

    this.renderList();
    this.renderPlot();
    this.el.funcInput.focus();

    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.renderPlot(), 150);
    });
  },

  addFunction(fromTikZ) {
    let input = fromTikZ || this.el.funcInput.value.trim();
    if (!input) return;

    if (MathParser.isDerivativeNotation(input)) {
      const lastFn = this.functions[this.functions.length - 1];
      if (lastFn) {
        const deriv = MathParser.derivativeOf(lastFn.originalInput);
        if (deriv) {
          this.el.funcInput.value = '';
          this.addInternal(deriv, lastFn.originalInput);
          return;
        }
      }
      this.el.funcInput.value = '';
      return;
    }

    this.el.funcInput.value = '';
    this.addInternal(input);
  },

  addInternal(input, parentExpr) {
    let expr = input;
    let displayExpr = parentExpr || input;

    const fnMatch = input.match(/^([a-zA-Z])\s*\(([^)]*)\)\s*=\s*(.*)/);
    if (fnMatch) {
      expr = fnMatch[3].trim();
      displayExpr = input;
    }

    const plain = MathParser.latexToPlain(expr);
    const cleaned = MathParser.validate(plain);

    if (!cleaned) {
      this.shake(this.el.funcInput);
      return;
    }

    const idx = this.functions.length;
    const color = this.colors[this.nextColor % this.colors.length];
    this.nextColor++;

    this.functions.push({
      id: idx,
      expression: cleaned,
      displayExpr: displayExpr,
      originalInput: input,
      color: color,
      visible: true,
    });

    this.renderList();
    this.renderPlot();
  },

  removeFunction(id) {
    this.functions = this.functions.filter(f => f.id !== id);
    this.renderList();
    this.renderPlot();
  },

  toggleFunction(id) {
    const fn = this.functions.find(f => f.id === id);
    if (fn) {
      fn.visible = !fn.visible;
      this.renderList();
      this.renderPlot();
    }
  },

  renderList() {
    const list = this.el.funcList;
    const empty = this.el.emptyState;
    list.innerHTML = '';

    if (this.functions.length === 0) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    this.functions.forEach(fn => {
      const item = document.createElement('div');
      item.className = 'func-item';

      const dot = document.createElement('span');
      dot.className = 'func-color';
      dot.style.background = fn.color;
      dot.style.opacity = fn.visible ? '1' : '0.3';

      const text = document.createElement('span');
      text.className = 'func-text';
      text.textContent = fn.displayExpr;

      const actions = document.createElement('span');
      actions.className = 'func-actions';

      const toggleBtn = document.createElement('button');
      toggleBtn.innerHTML = fn.visible ? '&#9673;' : '&#9675;';
      toggleBtn.title = fn.visible ? 'Ausblenden' : 'Einblenden';
      toggleBtn.addEventListener('click', () => this.toggleFunction(fn.id));

      const delBtn = document.createElement('button');
      delBtn.innerHTML = '&#10005;';
      delBtn.className = 'danger';
      delBtn.title = 'Entfernen';
      delBtn.addEventListener('click', () => this.removeFunction(fn.id));

      actions.appendChild(toggleBtn);
      actions.appendChild(delBtn);

      item.appendChild(dot);
      item.appendChild(text);
      item.appendChild(actions);
      list.appendChild(item);
    });
  },

  renderPlot() {
    const container = this.el.container;
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width < 50 || height < 50) {
      setTimeout(() => this.renderPlot(), 100);
      return;
    }

    const visible = this.functions.filter(f => f.visible);

    const data = visible.map(fn => {
      let expr = fn.expression;
      expr = expr.replace(/\bpi\b/g, '(' + Math.PI + ')');
      return {
        fn: expr,
        color: fn.color,
        skipTip: false,
        nSamples: 500,
      };
    });

    const opts = {
      target: container,
      width: width,
      height: height,
      xAxis: {
        domain: [this.xMin, this.xMax],
        label: 'x',
        fontSize: 18,
        innerTicks: true,
      },
      yAxis: {
        domain: [this.yMin, this.yMax],
        label: 'y',
        fontSize: 18,
        innerTicks: true,
      },
      grid: true,
      data: data,
      disableZoom: false,
      annotations: [
        { x: 0, y: 0, text: 'O', fontSize: 16 },
      ],
      tip: {
        xLine: true,
        yLine: true,
        renderer: (x, y, i) => {
          this.showCoords(x, y);
          return '';
        },
      },
    };

    try {
      if (this.plotInstance) {
        this.plotInstance.destroy();
      }
      this.plotInstance = functionPlot(opts);
      this.postProcessAxes();
    } catch (e) {
      console.error('Render error:', e);
    }
  },

  postProcessAxes() {
    const container = this.el.container;
    const svg = container.querySelector('svg');
    if (!svg) return;

    const ns = 'http://www.w3.org/2000/svg';

    const defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS(ns, 'defs'), svg.firstChild);

    const markerId = 'arrowhead';
    if (!svg.querySelector('#' + markerId)) {
      const marker = document.createElementNS(ns, 'marker');
      marker.setAttribute('id', markerId);
      marker.setAttribute('markerWidth', '10');
      marker.setAttribute('markerHeight', '8');
      marker.setAttribute('refX', '9');
      marker.setAttribute('refY', '4');
      marker.setAttribute('orient', 'auto');
      marker.innerHTML = '<polygon points="0 0, 10 4, 0 8" fill="#333"/>';
      defs.appendChild(marker);
    }

    const bbox = svg.getBoundingClientRect();
    const w = bbox.width || svg.getAttribute('width') || container.clientWidth;
    const h = bbox.height || svg.getAttribute('height') || container.clientHeight;

    const xArrow = document.createElementNS(ns, 'line');
    xArrow.setAttribute('x1', '0');
    xArrow.setAttribute('y1', h / 2);
    xArrow.setAttribute('x2', w - 4);
    xArrow.setAttribute('y2', h / 2);
    xArrow.setAttribute('stroke', '#333');
    xArrow.setAttribute('stroke-width', '2.5');
    xArrow.setAttribute('marker-end', 'url(#' + markerId + ')');

    const yArrow = document.createElementNS(ns, 'line');
    yArrow.setAttribute('x1', w / 2);
    yArrow.setAttribute('y1', h - 4);
    yArrow.setAttribute('x2', w / 2);
    yArrow.setAttribute('y2', '0');
    yArrow.setAttribute('stroke', '#333');
    yArrow.setAttribute('stroke-width', '2.5');
    yArrow.setAttribute('marker-end', 'url(#' + markerId + ')');

    const existingArrows = svg.querySelectorAll('.axis-arrow');
    existingArrows.forEach(el => el.remove());

    xArrow.classList.add('axis-arrow');
    yArrow.classList.add('axis-arrow');
    svg.appendChild(xArrow);
    svg.appendChild(yArrow);

    const allLines = svg.querySelectorAll('line');
    allLines.forEach(line => {
      const s = line.getAttribute('stroke');
      if (s === '#ddd' || s === '#e0e0e0' || s === '#eee') {
        line.setAttribute('stroke', '#999');
        line.setAttribute('stroke-width', '1.2');
      }
    });

    const allTexts = svg.querySelectorAll('text');
    allTexts.forEach(t => {
      const fs = t.getAttribute('font-size') || '10';
      const size = parseFloat(fs);
      if (size < 16 && size > 0) {
        t.setAttribute('font-size', String(Math.max(size, 14)));
        t.setAttribute('font-weight', '500');
      }
      const fill = t.getAttribute('fill');
      if (fill && (fill === '#555' || fill === '#666' || fill === '#777')) {
        t.setAttribute('fill', '#222');
      }
    });
  },

  showCoords(x, y) {
    const el = this.el.coordDisplay;
    if (!el) return;
    const fmt = (v) => Number.isInteger(v) || Math.abs(v - Math.round(v)) < 1e-10
      ? String(Math.round(v)) : v.toFixed(3);
    el.textContent = 'x = ' + fmt(x) + '  |  y = ' + fmt(y);
    el.classList.add('visible');

    clearTimeout(this.coordTimeout);
    this.coordTimeout = setTimeout(() => {
      el.classList.remove('visible');
    }, 2500);
  },

  resetView() {
    this.xMin = -10;
    this.xMax = 10;
    this.yMin = -10;
    this.yMax = 10;
    this.renderPlot();
  },

  exportTikZ() {
    const tikz = TikZ.generate(
      this.functions.filter(f => f.visible),
      this.xMin, this.xMax, this.yMin, this.yMax
    );
    this.copyToClipboard(tikz);
  },

  importTikZ() {
    const code = this.el.tikzArea.value.trim();
    if (!code) return;

    const result = TikZ.parse(code);
    if (result.functions.length === 0) {
      this.showToast('Keine \\addplot-Befehle gefunden');
      return;
    }

    this.functions = [];
    this.nextColor = 0;

    if (result.bounds) {
      this.xMin = result.bounds.xMin;
      this.xMax = result.bounds.xMax;
      this.yMin = result.bounds.yMin;
      this.yMax = result.bounds.yMax;
    }

    result.functions.forEach(fnExpr => {
      this.functions.push({
        id: this.functions.length,
        expression: fnExpr,
        displayExpr: fnExpr,
        originalInput: fnExpr,
        color: this.colors[this.nextColor % this.colors.length],
        visible: true,
      });
      this.nextColor++;
    });

    this.el.tikzArea.value = '';
    this.renderList();
    this.renderPlot();
  },

  exportSVG() {
    const svg = this.el.container.querySelector('svg');
    if (!svg) return;

    const clone = svg.cloneNode(true);
    const rect = svg.getBoundingClientRect();
    const cw = rect.width || 600;
    const ch = rect.height || 400;

    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', cw);
    clone.setAttribute('height', ch);
    clone.setAttribute('viewBox', '0 0 ' + cw + ' ' + ch);

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(clone);
    source = '<?xml version="1.0" standalone="no"?>\n' + source;

    const blob = new Blob([source], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plotoria-graph.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('In Zwischenablage kopiert');
      }).catch(() => this.fallbackCopy(text));
    } else {
      this.fallbackCopy(text);
    }
  },

  fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      this.showToast('In Zwischenablage kopiert');
    } catch (e) {
      this.showToast('Kopieren fehlgeschlagen');
    }
    document.body.removeChild(ta);
  },

  showToast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  },

  shake(el) {
    el.style.borderColor = '#D32F2F';
    el.style.animation = 'shake 0.3s ease';
    setTimeout(() => {
      el.style.borderColor = '';
      el.style.animation = '';
    }, 300);
  },
};

document.addEventListener('DOMContentLoaded', () => Plotoria.init());
