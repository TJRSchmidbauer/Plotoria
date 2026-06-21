const TikZ = {
  generate(functions, xMin, xMax, yMin, yMax, title) {
    let tikz = '\\begin{tikzpicture}\n';
    tikz += '  \\begin{axis}[\n';
    tikz += `    title={${title || 'Plotoria'}},\n`;
    tikz += `    xmin=${xMin}, xmax=${xMax},\n`;
    tikz += `    ymin=${yMin}, ymax=${yMax},\n`;
    tikz += '    grid=both,\n';
    tikz += '    grid style={line width=0.6pt, color=gray!50},\n';
    tikz += '    axis lines=middle,\n';
    tikz += '    axis line style={-stealth, line width=1.2pt},\n';
    tikz += '    width=12cm,\n';
    tikz += '    height=8cm,\n';
    tikz += '    enlargelimits,\n';
    tikz += '    xlabel={$x$},\n';
    tikz += '    ylabel={$y$},\n';
    tikz += '    label style={font=\\Large},\n';
    tikz += '    tick label style={font=\\large},\n';
    tikz += '  ]\n';

    const COLORS = ['blue', 'red', 'green!60!black', 'orange', 'purple', 'teal', 'brown', 'magenta'];

    functions.forEach((fn, i) => {
      const color = COLORS[i % COLORS.length];
      const domain = `${xMin}:${xMax}`;
      const samples = 300;

      let texFn = fn.disp || fn.expr;
      texFn = texFn.replace(/\^/g, '^');
      texFn = texFn.replace(/\bpi\b/g, '\\pi');

      tikz += `    \\addplot[color=${color}, domain=${domain}, samples=${samples}, line width=1.2pt] {${texFn}};\n`;
    });

    tikz += '  \\node[anchor=south east, font=\\tiny, gray!70] at (rel axis cs:1,0) {Plotoria von Tobias Schmidbauer};\n';
    tikz += '  \\end{axis}\n';
    tikz += '\\end{tikzpicture}';
    return tikz;
  },

  parse(tikzCode) {
    const results = [];
    const regex = /\\addplot(?:\[[^\]]*\])?\s*\{([^}]+)\}/g;
    let match;
    while ((match = regex.exec(tikzCode)) !== null) {
      results.push(match[1].trim());
    }

    const axisMatch = tikzCode.match(/\\begin\{axis\}\[([^\]]*)\]/);
    let bounds = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

    if (axisMatch) {
      const opts = axisMatch[1];
      const xMinM = opts.match(/xmin=\s*(-?\d+\.?\d*)/);
      const xMaxM = opts.match(/xmax=\s*(-?\d+\.?\d*)/);
      const yMinM = opts.match(/ymin=\s*(-?\d+\.?\d*)/);
      const yMaxM = opts.match(/ymax=\s*(-?\d+\.?\d*)/);
      if (xMinM) bounds.xMin = parseFloat(xMinM[1]);
      if (xMaxM) bounds.xMax = parseFloat(xMaxM[1]);
      if (yMinM) bounds.yMin = parseFloat(yMinM[1]);
      if (yMaxM) bounds.yMax = parseFloat(yMaxM[1]);
    }

    return { functions: results, bounds };
  }
};
