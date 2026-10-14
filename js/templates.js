// Plotoria 2.0 – Aufgabenvorlagen für Arbeitsblätter und Prüfungen
(() => {
  const P = window.Plotoria;
  const $ = id => document.getElementById(id);

  // fn(def, extra): Kurzschreibweise für Funktionen in Vorlagen
  const fn = (s, extra) => ({ s, ...(extra || {}) });

  const TEMPLATES = [
    {
      title: 'Graph ablesen',
      text: 'Parabel auf Karopapier – Werte ablesen, Scheitel bestimmen.',
      view: [-4, 4, -3, 5], style: { gridMode: 'karo', karo: 2 },
      fns: [fn('f(x) = 0.5x^2 - 2')],
    },
    {
      title: 'Graphen zuordnen',
      text: 'Vier Graphen mit den Buchstaben A–D, ohne Funktionsterme.',
      view: [-4, 4, -4, 4],
      fns: [fn('f(x) = 0.5x + 1', { lm: 'custom', lt: 'A' }), fn('g(x) = -x^2 + 3', { lm: 'custom', lt: 'B' }),
        fn('h(x) = 2^x - 3', { lm: 'custom', lt: 'C' }), fn('k(x) = 1/(x + 2)', { lm: 'custom', lt: 'D' })],
    },
    {
      title: 'Ableitungsgraph skizzieren',
      text: 'Graph von f gegeben; f′ ist als Lösung ausgeblendet hinterlegt.',
      view: [-3, 3, -3, 3],
      fns: [fn('f(x) = x^3/3 - x'), { d: [0, 1], h: 1, ds: 'dash' }],
    },
    {
      title: 'Steigungsdreieck',
      text: 'Gerade mit Steigungsdreieck zwischen zwei Gitterpunkten.',
      view: [-2, 5, -1, 4], style: { gridMode: 'karo', karo: 2 },
      fns: [fn('f(x) = 0.5x + 1')],
      objs: [
        { type: 'point', name: 'P', x: '0', y: '1', showCoords: true, showName: true, off: [-60, -10], col: '#FF3B30', vis: true },
        { type: 'point', name: 'Q', x: '2', y: '2', showCoords: true, showName: true, off: [8, -10], col: '#FF3B30', vis: true },
        { type: 'arrow', x1: 0, y1: 1, x2: 2, y2: 1, col: '#1C1C1E', vis: true, width: 1.5 },
        { type: 'arrow', x1: 2, y1: 1, x2: 2, y2: 2, col: '#1C1C1E', vis: true, width: 1.5 },
        { type: 'text', x: 0.7, y: 0.6, text: 'Δx = 2', col: '#1C1C1E', vis: true },
        { type: 'text', x: 2.15, y: 1.4, text: 'Δy = 1', col: '#1C1C1E', vis: true },
      ],
    },
    {
      title: 'Kurvendiskussion',
      text: 'Polynom 3. Grades mit Nullstellen, Extrema und Wendepunkt (exakt).',
      view: [-3, 3, -3, 3], smart: true, style: { exact: true },
      fns: [fn('f(x) = x^3 - 3x')],
    },
    {
      title: 'Gebrochen-rationale Funktion',
      text: 'Polstelle und schiefe Asymptote eingezeichnet.',
      view: [-5, 7, -6, 10], smart: false,
      fns: [fn('f(x) = (x^2 + 1)/(x - 1)', { as: 1 })],
    },
    {
      title: 'Fläche unter dem Graphen',
      text: 'Integral von 0 bis 2 als schraffierte Fläche.',
      view: [-1, 3, -1, 5],
      fns: [fn('f(x) = -x^2 + 4')],
      after: (P) => { P._showIntegral(P.fns[0]); P.integral.a = 0; P.integral.b = 2; P.repaint(); },
    },
    {
      title: 'Sinus im Gradmaß',
      text: 'sin(x) von 0° bis 360°, x-Achse in 90°-Schritten.',
      view: [-20, 380, -1.5, 1.5], deg: true, prop: false, style: { xStep: '90', yStep: '0.5' },
      fns: [fn('f(x) = sin(x)')],
    },
    {
      title: 'Trigonometrie im Bogenmaß',
      text: 'sin und cos mit Achsenbeschriftung in Vielfachen von π.',
      view: [-0.5, 7, -1.6, 1.6], prop: false, style: { xFmt: 'pi', xStep: 'pi/2', yStep: '0.5' },
      fns: [fn('f(x) = sin(x)'), fn('g(x) = cos(x)', { ds: 'dash' })],
    },
    {
      title: 'Wachstum (Sachaufgabe)',
      text: 'Exponentielles Wachstum mit Einheiten an den Achsen und Definitionsbereich.',
      view: [-0.8, 8.5, -5, 55], prop: false, style: { xLabel: 't in h', yLabel: 'N in Tausend', xStep: '1', yStep: '10' },
      fns: [fn('N(t) = 2*1.5^t für 0 ≤ t ≤ 8', { lm: 'term' })],
    },
    {
      title: 'Leeres Koordinatensystem',
      text: 'Karopapier von −6 bis 6 – zum Selbstzeichnen.',
      view: [-6, 6, -4, 4], style: { gridMode: 'karo', karo: 2 },
      fns: [],
    },
    {
      title: 'Messwerte & Ausgleichsgerade',
      text: 'Messreihe mit linearer Regression – Werte im Daten-Tab ändern.',
      view: [-0.5, 6.5, -1, 14], prop: false,
      fns: [],
      data: [{ name: 'Messreihe 1', pts: [[0, 1.1], [1, 3.2], [2, 4.8], [3, 7.1], [4, 8.9], [5, 11.2], [6, 12.8]], col: '#FF9500', vis: true, reg: 'linear' }],
      after: (P) => { P.addRegression(P.datasets[0]); },
    },
    {
      title: 'Parabel mit Parametern',
      text: 'Scheitelpunktform mit Schiebereglern für a, b, c.',
      view: [-5, 5, -4, 6],
      fns: [fn('f(x) = a*(x - b)^2 + c', { lm: 'term' })],
      params: { a: { v: 1, min: -3, max: 3 }, b: { v: 1, min: -4, max: 4 }, c: { v: -2, min: -4, max: 4 } },
    },
  ];

  Object.assign(P, {
    TEMPLATES,

    initTemplates() {
      $('templates-btn').addEventListener('click', () => this.openTemplates());
    },

    openTemplates() {
      const grid = $('template-grid');
      if (!grid.childElementCount) {
        TEMPLATES.forEach((t, i) => {
          const b = document.createElement('button');
          b.className = 'template-card';
          b.innerHTML = this._templateThumb(t) + '<strong>' + P.esc(t.title) + '</strong><span>' + P.esc(t.text) + '</span>';
          b.addEventListener('click', () => this.applyTemplate(i));
          grid.appendChild(b);
        });
      }
      this.openSheet('templates-sheet');
    },

    _templateState(t) {
      const cols = this._theme().colors;
      return {
        v: 2, title: t.title, deg: !!t.deg, theme: this.theme, smart: !!t.smart, prop: t.prop !== false,
        style: { ...this._theme().style, fontSize: this.style.fontSize, xLabel: 'x', yLabel: 'y', xStep: '', yStep: '', xFmt: 'dec', yFmt: 'dec', sub: 'auto', gridMode: 'grid', karo: 2, bw: false, exact: false, ...(t.style || {}) },
        view: t.view, home: t.view,
        params: t.params || {},
        fns: t.fns.map((f, i) => ({ l: f.d ? null : undefined, c: cols[i % cols.length], w: 3, ...f })),
        objs: (t.objs || []).map(o => ({ ...o })),
        data: (t.data || []).map(d => ({ ...d, pts: d.pts.map(p => p.slice()) })),
      };
    },

    applyTemplate(i) {
      const t = TEMPLATES[i];
      const st = this._templateState(t);
      // Buchstaben der Funktionen aus der Definition übernehmen
      st.fns.forEach(f => {
        if (f.s) { const d = MathParser.parseDefinition(f.s); f.l = d.letter || 'f'; }
      });
      st.fns.forEach(f => { if (f.d) f.l = st.fns[f.d[0]].l + "'".repeat(f.d[1]); });
      this.load(st);
      if (t.after) t.after(this);
      this.commit();
      $('templates-sheet').close();
      this._toast('Vorlage „' + t.title + '“ geladen – Strg+Z macht das rückgängig');
    },

    // Kleine Vorschau als SVG (160 × 100)
    _templateThumb(t) {
      const W = 160, H = 100, [x0, x1, y0, y1] = t.view;
      const sx = (x) => (x - x0) / (x1 - x0) * W, sy = (y) => H - (y - y0) / (y1 - y0) * H;
      const cols = this.themes.standard.colors;
      let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
      if (t.style && t.style.gridMode === 'karo') {
        for (let i = 0; i <= W; i += 8) s += `<line x1="${i}" y1="0" x2="${i}" y2="${H}" stroke="#C9D8E8" stroke-width="0.6"/>`;
        for (let i = 0; i <= H; i += 8) s += `<line x1="0" y1="${i}" x2="${W}" y2="${i}" stroke="#C9D8E8" stroke-width="0.6"/>`;
      }
      s += `<line x1="0" y1="${sy(0)}" x2="${W}" y2="${sy(0)}" stroke="#1C1C1E" stroke-width="1"/><line x1="${sx(0)}" y1="0" x2="${sx(0)}" y2="${H}" stroke="#1C1C1E" stroke-width="1"/>`;
      t.fns.forEach((f, i) => {
        if (!f.s) return;
        try {
          const d = MathParser.parseDefinition(f.s);
          const P0 = {};
          Object.entries(t.params || {}).forEach(([k, p]) => { P0[k] = p.v; });
          const g = MathParser.compile(MathParser.parse(d.body, { variable: d.variable }), P0, { deg: !!t.deg });
          const lo = d.domain && d.domain.min !== null ? MathParser.evalConst(d.domain.min) : -Infinity;
          const hi = d.domain && d.domain.max !== null ? MathParser.evalConst(d.domain.max) : Infinity;
          let path = '', pen = false;
          for (let k = 0; k <= 160; k++) {
            const x = x0 + (x1 - x0) * k / 160, y = g(x);
            if (!isFinite(y) || x < lo || x > hi || y < y0 - (y1 - y0) || y > y1 + (y1 - y0)) { pen = false; continue; }
            path += (pen ? 'L' : 'M') + sx(x).toFixed(1) + ',' + sy(y).toFixed(1);
            pen = true;
          }
          s += `<path d="${path}" fill="none" stroke="${cols[i % cols.length]}" stroke-width="2"${f.ds ? ' stroke-dasharray="4,3"' : ''}/>`;
        } catch (e) { /* Vorschau überspringen */ }
      });
      (t.data || []).forEach(ds => ds.pts.forEach(([x, y]) => { s += `<circle cx="${sx(x)}" cy="${sy(y)}" r="2" fill="${ds.col}"/>`; }));
      (t.objs || []).filter(o => o.type === 'point').forEach(o => { s += `<circle cx="${sx(+o.x)}" cy="${sy(+o.y)}" r="2.5" fill="#FF3B30"/>`; });
      return s + '</svg>';
    },
  });
})();
