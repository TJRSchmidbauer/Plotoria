const MathParser = {
  latexToPlain(expr) {
    let s = expr.trim();
    if (!s) return '';

    s = s.replace(/\\,/g, ' ');
    s = s.replace(/\\;/g, ';');
    s = s.replace(/\\:/g, ':');
    s = s.replace(/\\!/g, '!');
    s = s.replace(/\\(?!\w)/g, '');

    const greek = {
      '\\pi': 'pi', '\\Pi': 'pi',
      '\\alpha': 'alpha', '\\beta': 'beta',
      '\\gamma': 'gamma', '\\delta': 'delta',
      '\\theta': 'theta', '\\lambda': 'lambda',
      '\\mu': 'mu', '\\nu': 'nu',
      '\\omega': 'omega', '\\phi': 'phi',
      '\\psi': 'psi', '\\rho': 'rho',
      '\\sigma': 'sigma', '\\tau': 'tau',
      '\\epsilon': 'epsilon', '\\varepsilon': 'epsilon',
      '\\zeta': 'zeta', '\\eta': 'eta',
      '\\xi': 'xi',
    };
    for (const [latex, plain] of Object.entries(greek)) {
      while (s.includes(latex)) s = s.replace(latex, plain);
    }

    const funcs = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc',
      'sinh', 'cosh', 'tanh', 'coth',
      'arcsin', 'arccos', 'arctan',
      'ln', 'log', 'lg', 'exp', 'sqrt', 'frac'];
    for (const f of funcs) {
      while (s.includes('\\' + f)) s = s.replace('\\' + f, f);
    }

    s = s.replace(/\^\{([^}]+)\}/g, '^($1)');
    s = s.replace(/\^([a-zA-Z0-9π])/g, '^($1)');
    s = s.replace(/_{([^}]+)}/g, '_($1)');
    s = s.replace(/_([a-zA-Z0-9])/g, '_($1)');

    while (s.includes('\\frac')) {
      s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/, '($1)/($2)');
    }
    while (s.includes('\\sqrt')) {
      s = s.replace(/\\sqrt(?:\[([^\]]+)\])?\{([^}]+)\}/, (_, n, v) =>
        n ? `(${v})^(1/(${n}))` : `sqrt(${v})`);
    }

    s = s.replace(/\\cdot/g, '*');
    s = s.replace(/\\times/g, '*');
    s = s.replace(/\\div/g, '/');
    s = s.replace(/\\pm/g, '+');
    s = s.replace(/\\mp/g, '-');
    s = s.replace(/\\infty/g, 'infinity');
    s = s.replace(/\\abs\{([^}]+)\}/g, 'abs($1)');

    s = s.replace(/\\left|\\right|\\big[lr]?|\\Big[lr]?|\\Bigg[lr]?/g, '');
    s = s.replace(/\\([a-zA-Z]+)/g, '');
    s = s.replace(/\s+/g, ' ').trim();

    return s;
  },

  parseFunction(fnStr) {
    let s = fnStr.trim();

    let name = 'f';
    let expr = s;

    const fnMatch = s.match(/^([a-zA-Z])\s*\(([^)]*)\)\s*=\s*(.*)/);
    if (fnMatch) {
      name = fnMatch[1];
      expr = fnMatch[3].trim();
    }

    const plain = this.latexToPlain(expr);
    const cleaned = this.validate(plain);

    return { name, param: 'x', original: expr, cleaned, valid: cleaned !== null };
  },

  validate(expr) {
    if (!expr || expr.length === 0) return null;

    let s = expr.trim();
    s = s.replace(/\s+/g, '');

    if (s.length === 0) return null;

    const openP = (s.match(/\(/g) || []).length;
    const closeP = (s.match(/\)/g) || []).length;
    if (openP !== closeP) return null;

    const allowed = /^[a-zA-Z0-9π+\-*/^().,%!|]+$/;
    if (!allowed.test(s)) return null;

    try {
      nerdamer(s.replace(/\bpi\b/g, '1'));
      return s;
    } catch (e) {
      return null;
    }
  },

  isDerivativeNotation(input) {
    const t = input.trim();
    return /^([a-zA-Z])\s*'+$/.test(t);
  },

  derivativeOf(fn) {
    const fMatch = fn.orig.match(/^([a-zA-Z])\s*\(([^)]*)\)\s*=\s*(.*)/);
    if (fMatch) {
      const param = fMatch[2].trim();
      const expr = fMatch[3].trim();
      try {
        const plain = this.latexToPlain(expr);
        return nerdamer.diff(plain, param).toString();
      } catch (e) {
        return null;
      }
    }
    try {
      const plain = this.latexToPlain(fn.expr);
      return nerdamer.diff(plain, 'x').toString();
    } catch (e) {
      return null;
    }
  },

  extractName(raw) {
    const m = raw.match(/^([a-zA-Z])\s*\(/);
    return m ? m[1] : null;
  },

  nextLetter(used) {
    const letters = ['f','g','h','i','k','l','m','o','p','q','r','s','t','u','w','x','z'];
    for (const l of letters) {
      if (!used.includes(l)) return l;
    }
    return 'f';
  }
};
