const TikZ = {
  // Sonderzeichen für Text in LaTeX maskieren
  escape(s) {
    return String(s).replace(/[\\{}&%$#_^~]/g, (c) => ({
      '\\': '\\textbackslash{}', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
    })[c] || '\\' + c);
  },

  num(v) {
    return String(parseFloat(Number(v).toPrecision(6)));
  },

  hex(c) {
    let h = String(c || '#000000').replace('#', '').toUpperCase();
    if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
    return /^[0-9A-F]{6}$/.test(h.slice(0, 6)) ? h.slice(0, 6) : '000000';
  },

  // Text für \node: Tiefstellung G_1 → $G_{1}$, sonst maskiert
  label(s) {
    const t = String(s);
    if (/_/.test(t)) return '$' + t.replace(/_(\{[^}]*\}|\S)/g, (m, g) => '_{' + g.replace(/^\{|\}$/g, '') + '}').replace(/ /g, '\\ ') + '$';
    return this.escape(t).replace(/−/g, '$-$').replace(/π/g, '$\\pi$').replace(/√/g, '$\\surd$').replace(/\|/g, '$|$');
  },

  // functions: [{ letter, ast, col, strokeWidth, dash, lo, hi, labelText, labelMode }]
  // opts: { title, xLabel, yLabel, params, deg, ux, uy (cm) | width, height (cm), bw, karo, grid, objects, datasets, legend }
  generate(functions, b, opts) {
    opts = opts || {};
    const yPad = (b.yMax - b.yMin) * 2;
    const L = [];
    const DASH = { dash: 'dashed', dot: 'dotted', dashdot: 'dashdotted' };
    const BW = ['solid', 'dashed', 'dotted', 'dashdotted'];
    L.push('% Plotoria ' + (opts.version || '') + ' – benötigt: \\usepackage{pgfplots} \\pgfplotsset{compat=1.18}');
    if (!opts.bw) functions.forEach((fn, i) => L.push(`\\definecolor{plotoria${i}}{HTML}{${this.hex(fn.col)}}`));
    L.push('\\begin{tikzpicture}');
    L.push('  \\begin{axis}[');
    if (opts.title) L.push(`    title={${this.escape(opts.title)}},`);
    L.push(`    xmin=${this.num(b.xMin)}, xmax=${this.num(b.xMax)},`);
    L.push(`    ymin=${this.num(b.yMin)}, ymax=${this.num(b.yMax)},`);
    if (opts.ux && opts.uy) L.push(`    x=${this.num(opts.ux)}cm, y=${this.num(opts.uy)}cm,   % Maßstab: 1 Einheit = ${this.num(opts.ux)} cm`);
    else L.push(`    width=${this.num(opts.width || 12)}cm, height=${this.num(opts.height || 8)}cm, scale only axis,`);
    L.push('    axis lines=middle,');
    L.push('    axis line style={-stealth, line width=0.9pt},');
    if (opts.xStep) L.push(`    xtick distance=${this.num(opts.xStep)},`);
    if (opts.yStep) L.push(`    ytick distance=${this.num(opts.yStep)},`);
    if (opts.karo) {
      L.push(`    minor tick num=${opts.karo - 1}, grid=both,`);
      L.push('    major grid style={line width=0.3pt, color=cyan!40!gray!50},');
      L.push('    minor grid style={line width=0.3pt, color=cyan!40!gray!50},');
    } else if (opts.grid !== false) {
      L.push('    grid=major,');
      L.push('    grid style={line width=0.4pt, color=gray!35},');
    }
    L.push(`    xlabel={${this.axisLabel(opts.xLabel || 'x')}},`);
    L.push(`    ylabel={${this.axisLabel(opts.yLabel || 'y')}},`);
    L.push('    xlabel style={anchor=north east},');
    L.push('    ylabel style={anchor=north east},');
    L.push('    tick label style={font=\\small},');
    // pgfplots rechnet Winkelfunktionen standardmäßig im Gradmaß
    if (!opts.deg) L.push('    trig format plots=rad,');
    L.push('    unbounded coords=jump,');
    L.push('    clip=true,');
    if (opts.legend) L.push('    legend pos=outer north east, legend cell align=left,');
    L.push('  ]');

    functions.forEach((fn, i) => {
      const expr = MathParser.toPgf(fn.ast, opts.params || {});
      const color = opts.bw ? 'black' : `plotoria${i}`;
      const style = [`color=${color}`, `line width=${this.num((fn.strokeWidth || 3) * 0.35)}pt`];
      const dash = opts.bw && (!fn.dash || fn.dash === 'solid') ? BW[i % BW.length] : DASH[fn.dash];
      if (dash && dash !== 'solid') style.push(dash);
      const lo = Math.max(b.xMin, isFinite(fn.lo) ? fn.lo : -Infinity), hi = Math.min(b.xMax, isFinite(fn.hi) ? fn.hi : Infinity);
      style.push(`domain=${this.num(lo)}:${this.num(hi)}`, 'samples=400', 'smooth');
      style.push(`restrict y to domain=${this.num(b.yMin - yPad)}:${this.num(b.yMax + yPad)}`);
      if (!opts.legend) style.push('forget plot');
      L.push(`    \\addplot[${style.join(', ')}] {${expr}};`);
      if (opts.legend) L.push(`    \\addlegendentry{${fn.legend || '$' + (fn.letterTeX || fn.letter) + '(x)=' + MathParser.toTeX(fn.ast) + '$'}}`);
      // Randpunkte des Definitionsbereichs
      [[fn.lo, fn.loOpen], [fn.hi, fn.hiOpen]].forEach(([x, open]) => {
        if (!isFinite(x) || x < b.xMin || x > b.xMax || !isFinite(fn.f0 ? fn.f0(x) : NaN)) return;
        L.push(`    \\draw[${color}, ${open ? 'fill=white' : 'fill=' + color}] (axis cs:${this.num(x)},${this.num(fn.f0(x))}) circle (2.2pt);`);
      });
      if (fn.inlineLabel && isFinite(fn.lx)) L.push(`    \\node[${color}, anchor=south west, font=\\bfseries] at (axis cs:${this.num(fn.lx)},${this.num(fn.ly)}) {${fn.inlineLabel}};`);
    });

    (opts.datasets || []).forEach(ds => {
      const coords = ds.pts.map(([x, y]) => `(${this.num(x)},${this.num(y)})`).join(' ');
      L.push(`    \\addplot[only marks, mark=x, mark size=3pt, ${opts.bw ? 'black' : 'color={rgb,255:red,' + parseInt(this.hex(ds.col).slice(0, 2), 16) + ';green,' + parseInt(this.hex(ds.col).slice(2, 4), 16) + ';blue,' + parseInt(this.hex(ds.col).slice(4, 6), 16) + '}'}, forget plot] coordinates {${coords}};`);
    });

    (opts.objects || []).forEach(o => {
      const col = opts.bw ? 'black' : `{rgb,255:red,${parseInt(this.hex(o.col).slice(0, 2), 16)};green,${parseInt(this.hex(o.col).slice(2, 4), 16)};blue,${parseInt(this.hex(o.col).slice(4, 6), 16)}}`;
      if (o.type === 'point') {
        L.push(`    \\fill[color=${col}] (axis cs:${this.num(o.px)},${this.num(o.py)}) circle (2.2pt)` + (o.text ? ` node[anchor=south west, color=${col}] {${this.label(o.text)}}` : '') + ';');
      } else if (o.type === 'vline') {
        L.push(`    \\draw[color=${col}, ${o.dash === 'solid' ? '' : 'dashed, '}line width=0.8pt] (axis cs:${this.num(o.px)},${this.num(b.yMin)}) -- (axis cs:${this.num(o.px)},${this.num(b.yMax)});`);
      } else if (o.type === 'text') {
        L.push(`    \\node[anchor=base west, color=${col}${o.bold ? ', font=\\bfseries' : ''}] at (axis cs:${this.num(o.x)},${this.num(o.y)}) {${this.label(o.text)}};`);
      } else if (o.type === 'arrow') {
        L.push(`    \\draw[${o.double ? 'stealth-stealth' : '-stealth'}, color=${col}, line width=${this.num((o.width || 2) * 0.4)}pt] (axis cs:${this.num(o.x1)},${this.num(o.y1)}) -- (axis cs:${this.num(o.x2)},${this.num(o.y2)});`);
      }
    });

    L.push('  \\end{axis}');
    L.push('\\end{tikzpicture}');
    return L.join('\n');
  },

  // Achsentitel: einzelner Buchstabe kursiv in Mathe, sonst Text („t in s“)
  axisLabel(s) {
    return /^[a-zA-Z]$/.test(s) ? '$' + s + '$' : this.label(s);
  },

  // Entfernt deg(…) inklusive passender Klammer: sin(deg(x)) → sin((x))
  _stripDeg(s) {
    let i;
    while ((i = s.search(/\bdeg\s*\(/)) !== -1) {
      const open = s.indexOf('(', i);
      let depth = 0, close = -1;
      for (let k = open; k < s.length; k++) {
        if (s[k] === '(') depth++;
        else if (s[k] === ')' && --depth === 0) { close = k; break; }
      }
      if (close === -1) break;
      s = s.slice(0, i) + '(' + s.slice(open + 1, close) + ')' + s.slice(close + 1);
    }
    return s;
  },

  parse(tikzCode) {
    const results = [];
    const re = /\\addplot\s*\+?\s*(?:\[[^\]]*\])?\s*\{/g;
    let m;
    while ((m = re.exec(tikzCode)) !== null) {
      // geschweifte Klammern zählen, damit {x^{2}} vollständig übernommen wird
      let depth = 1, k = re.lastIndex;
      for (; k < tikzCode.length && depth; k++) {
        if (tikzCode[k] === '{') depth++;
        else if (tikzCode[k] === '}') depth--;
      }
      if (depth === 0) results.push(tikzCode.slice(re.lastIndex, k - 1).trim());
      re.lastIndex = k;
    }

    const hasRad = /trig format(?: plots)?\s*=\s*rad/.test(tikzCode);
    const usesDeg = /\bdeg\s*\(/.test(tikzCode);
    const functions = results.map(r => this._stripDeg(r));
    // Ohne deg(…) und ohne trig format=rad rechnet pgfplots im Gradmaß
    const degMode = !hasRad && !usesDeg && functions.some(f => /\b(sin|cos|tan|cot|sec|cosec)\s*\(/.test(f));

    const num = '(-?\\d*\\.?\\d+(?:e-?\\d+)?)';
    const get = (key) => {
      const r = tikzCode.match(new RegExp('\\b' + key + '\\s*=\\s*' + num));
      return r ? parseFloat(r[1]) : null;
    };
    const bounds = { xMin: get('xmin'), xMax: get('xmax'), yMin: get('ymin'), yMax: get('ymax') };
    const complete = Object.values(bounds).every(v => v !== null && isFinite(v));

    return { functions, bounds: complete ? bounds : null, degMode };
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = TikZ;
