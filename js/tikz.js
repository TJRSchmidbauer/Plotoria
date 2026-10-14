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

  // functions: [{ letter, ast, col, strokeWidth, dash }]
  generate(functions, b, opts) {
    opts = opts || {};
    const yPad = (b.yMax - b.yMin) * 2;
    const L = [];
    L.push('% Benötigt im Präambel: \\usepackage{pgfplots} \\pgfplotsset{compat=1.18}');
    functions.forEach((fn, i) => {
      L.push(`\\definecolor{plotoria${i}}{HTML}{${fn.col.replace('#', '').toUpperCase()}}`);
    });
    L.push('\\begin{tikzpicture}');
    L.push('  \\begin{axis}[');
    if (opts.title) L.push(`    title={${this.escape(opts.title)}},`);
    L.push(`    xmin=${this.num(b.xMin)}, xmax=${this.num(b.xMax)},`);
    L.push(`    ymin=${this.num(b.yMin)}, ymax=${this.num(b.yMax)},`);
    L.push('    axis lines=middle,');
    L.push('    axis line style={-stealth, line width=1pt},');
    L.push('    grid=major,');
    L.push('    grid style={line width=0.4pt, color=gray!35},');
    L.push(`    xlabel={$${this.escape(opts.xLabel || 'x')}$},`);
    L.push(`    ylabel={$${this.escape(opts.yLabel || 'y')}$},`);
    L.push('    xlabel style={anchor=north east},');
    L.push('    ylabel style={anchor=north east},');
    L.push('    width=12cm, height=8cm,');
    // pgfplots rechnet Winkelfunktionen standardmäßig im Gradmaß
    if (!opts.deg) L.push('    trig format plots=rad,');
    L.push('    unbounded coords=jump,');
    L.push('    legend pos=outer north east,');
    L.push('    legend cell align=left,');
    L.push('  ]');

    functions.forEach((fn, i) => {
      const expr = MathParser.toPgf(fn.ast, opts.params || {});
      const style = [`color=plotoria${i}`, `line width=${this.num((fn.strokeWidth || 4) * 0.3)}pt`];
      if (fn.dash) style.push('dashed');
      style.push(`domain=${this.num(b.xMin)}:${this.num(b.xMax)}`, 'samples=400', 'smooth');
      style.push(`restrict y to domain=${this.num(b.yMin - yPad)}:${this.num(b.yMax + yPad)}`);
      L.push(`    \\addplot[${style.join(', ')}] {${expr}};`);
      L.push(`    \\addlegendentry{$${fn.letterTeX || fn.letter}(x)=${MathParser.toTeX(fn.ast)}$}`);
    });

    L.push('  \\end{axis}');
    L.push('\\end{tikzpicture}');
    return L.join('\n');
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
