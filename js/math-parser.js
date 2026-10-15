// Plotoria Ausdrucks-Parser
// Wandelt Eingaben (Klartext oder einfaches LaTeX) in einen Syntaxbaum um und
// kompiliert ihn zu einer schnellen JavaScript-Funktion. nerdamer wird nur noch
// für symbolische Ableitungen verwendet.
const MathParser = (() => {
  // ── Funktionstabelle ──
  // nd: Schreibweise für nerdamer, pgf: Schreibweise für pgfplots, tex: LaTeX-Befehl
  const FUNCS = {
    sin:   { n: 1, tex: '\\sin' },  cos: { n: 1, tex: '\\cos' },  tan: { n: 1, tex: '\\tan' },
    cot:   { n: 1, tex: '\\cot' },  sec: { n: 1, tex: '\\sec' },  csc: { n: 1, tex: '\\csc', pgf: 'cosec' },
    asin:  { n: 1, tex: '\\arcsin' }, acos: { n: 1, tex: '\\arccos' }, atan: { n: 1, tex: '\\arctan' },
    sinh:  { n: 1, tex: '\\sinh' }, cosh: { n: 1, tex: '\\cosh' }, tanh: { n: 1, tex: '\\tanh' },
    coth:  { n: 1, tex: '\\coth' }, asinh: { n: 1, tex: '\\operatorname{arsinh}' },
    acosh: { n: 1, tex: '\\operatorname{arcosh}' }, atanh: { n: 1, tex: '\\operatorname{artanh}' },
    sqrt:  { n: 1 }, cbrt: { n: 1 }, root: { n: 2 },
    abs:   { n: 1 }, exp: { n: 1, tex: '\\exp' },
    ln:    { n: 1, tex: '\\ln' }, log: { n: [1, 2], tex: '\\log' },
    lg:    { n: 1, tex: '\\lg' }, log2: { n: 1, tex: '\\log_2' },
    sign:  { n: 1, tex: '\\operatorname{sgn}' },
    floor: { n: 1 }, ceil: { n: 1 }, round: { n: 1, tex: '\\operatorname{round}' },
    min:   { n: 2, tex: '\\min' }, max: { n: 2, tex: '\\max' },
  };
  const ALIASES = {
    arcsin: 'asin', arccos: 'acos', arctan: 'atan', cosec: 'csc',
    arsinh: 'asinh', arcosh: 'acosh', artanh: 'atanh',
    log10: 'lg', sgn: 'sign', nthroot: 'root', wurzel: 'sqrt', betrag: 'abs',
  };
  // deg = π/180 (Grad-Faktor): sin(30deg) bzw. sin(30°) im Bogenmaß
  const CONSTS = { pi: 'pi', 'π': 'pi', e: 'e', deg: 'deg' };
  const GREEK = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
    'kappa', 'lambda', 'mu', 'nu', 'xi', 'rho', 'sigma', 'tau', 'phi', 'chi', 'psi', 'omega'];
  const TRIG_IN = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc']);
  const TRIG_OUT = new Set(['asin', 'acos', 'atan']);

  // Bekannte Namen, längste zuerst – damit wird "sinx" zu sin·x und "cosh" nicht zu cos·h
  const NAMES = [...Object.keys(FUNCS), ...Object.keys(ALIASES), ...Object.keys(CONSTS), ...GREEK]
    .sort((a, b) => b.length - a.length);

  class ParseError extends Error {}

  // ── Vorverarbeitung: LaTeX, Unicode, deutsches Dezimalkomma ──
  function matchBrace(s, open) {
    let depth = 0;
    for (let i = open; i < s.length; i++) {
      if (s[i] === '{') depth++;
      else if (s[i] === '}' && --depth === 0) return i;
    }
    return -1;
  }

  // Ersetzt \cmd{A}{B} (auch verschachtelt) über eine Callback-Funktion
  function replaceBraced(s, cmd, nArgs, build) {
    let idx;
    while ((idx = s.indexOf(cmd)) !== -1) {
      let p = idx + cmd.length;
      let opt = null;
      if (s[p] === '[') {
        const e = s.indexOf(']', p);
        if (e === -1) break;
        opt = s.slice(p + 1, e); p = e + 1;
      }
      const args = [];
      for (let k = 0; k < nArgs; k++) {
        while (s[p] === ' ') p++;
        if (s[p] !== '{') {
          // \frac12 oder \sqrt x: einzelnes Zeichen als Argument
          if (p < s.length) { args.push(s[p]); p++; continue; }
          break;
        }
        const e = matchBrace(s, p);
        if (e === -1) break;
        args.push(s.slice(p + 1, e)); p = e + 1;
      }
      if (args.length !== nArgs) break;
      s = s.slice(0, idx) + build(args, opt) + s.slice(p);
    }
    return s;
  }

  function normalize(expr) {
    let s = String(expr).trim();
    if (!s) return '';

    s = s.replace(/\\left|\\right|\\big[lr]?|\\Big[lr]?|\\bigg[lr]?|\\Bigg[lr]?/g, '');
    s = replaceBraced(s, '\\dfrac', 2, a => `((${a[0]})/(${a[1]}))`);
    s = replaceBraced(s, '\\tfrac', 2, a => `((${a[0]})/(${a[1]}))`);
    s = replaceBraced(s, '\\frac', 2, a => `((${a[0]})/(${a[1]}))`);
    s = replaceBraced(s, '\\sqrt', 1, (a, n) => n ? `root(${a[0]},${n})` : `sqrt(${a[0]})`);
    s = replaceBraced(s, '\\operatorname', 1, a => a[0]);
    s = s.replace(/\\cdot|\\times|\\ast/g, '*').replace(/\\div/g, '/');
    s = s.replace(/\\[,;:! ]/g, ' ');
    s = s.replace(/\\(?=[a-zA-Z])/g, '');        // \sin → sin, \pi → pi
    s = s.replace(/[{]/g, '(').replace(/[}]/g, ')');

    s = s.replace(/[·×∙⋅]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-');
    s = s.replace(/²/g, '^2').replace(/³/g, '^3').replace(/√/g, 'sqrt').replace(/°/g, 'deg');
    // Deutsches Dezimalkomma: 0,5 → 0.5 (nur zwischen Ziffern ohne Leerzeichen)
    s = s.replace(/(\d),(\d)/g, '$1.$2');
    return s.trim();
  }

  // ── Tokenizer ──
  function tokenize(s) {
    const toks = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)/);
        if (!m) throw new ParseError('Ungültige Zahl');
        toks.push({ t: 'num', v: parseFloat(m[1]), pos: i });
        i += m[1].length;
        continue;
      }
      if (/[a-zA-Zα-ωΑ-Ωπ]/.test(c)) {
        let run = s.slice(i).match(/^[a-zA-Zα-ωΑ-Ωπ]+/)[0];
        // log10, log2 als ein Name
        const dm = s.slice(i + run.length).match(/^\d+/);
        if (dm && /log$/.test(run) && (dm[0] === '10' || dm[0] === '2')) run += dm[0];
        let j = 0;
        while (j < run.length) {
          const rest = run.slice(j);
          const name = NAMES.find(n => rest.startsWith(n));
          if (name) { toks.push({ t: 'id', v: name, pos: i + j }); j += name.length; }
          else { toks.push({ t: 'id', v: rest[0], pos: i + j }); j += 1; }
        }
        i += run.length;
        continue;
      }
      if ('+-*/^(),|!\'[]'.includes(c)) {
        const v = c === '[' ? '(' : c === ']' ? ')' : c;
        toks.push({ t: 'op', v, pos: i }); i++;
        continue;
      }
      throw new ParseError('Unerwartetes Zeichen „' + c + '“');
    }
    return toks;
  }

  // ── Parser (rekursiver Abstieg) ──
  // AST-Knoten: num, var, const, neg, bin(op,a,b), call(f,args), fact(a)
  function parse(input, ctx) {
    ctx = ctx || {};
    const ufns = ctx.functions || {};   // benutzerdefinierte Funktionen zum Einsetzen
    const variable = ctx.variable || 'x';
    const toks = tokenize(normalize(input));
    if (!toks.length) throw new ParseError('Leerer Ausdruck');
    let p = 0, absDepth = 0;
    const peek = () => toks[p];
    const isOp = (v) => toks[p] && toks[p].t === 'op' && toks[p].v === v;
    const expect = (v) => {
      if (!isOp(v)) throw new ParseError(v === ')' ? 'Schließende Klammer fehlt' : '„' + v + '“ erwartet');
      p++;
    };

    function parseExpr() {
      let a = parseTerm();
      while (isOp('+') || isOp('-')) {
        const op = toks[p++].v;
        a = { t: 'bin', op, a, b: parseTerm() };
      }
      return a;
    }

    function startsPrimary() {
      const t = peek();
      if (!t) return false;
      if (t.t === 'num' || t.t === 'id') return true;
      if (t.t === 'op' && t.v === '(') return true;
      if (t.t === 'op' && t.v === '|' && absDepth === 0) return true;
      return false;
    }

    function parseTerm() {
      let a = parseUnary();
      for (;;) {
        if (isOp('*') || isOp('/')) {
          const op = toks[p++].v;
          a = { t: 'bin', op, a, b: parseUnary() };
        } else if (startsPrimary()) {
          a = { t: 'bin', op: '*', a, b: parsePower() };   // implizite Multiplikation: 2x, 3(x+1)
        } else break;
      }
      return a;
    }

    function parseUnary() {
      if (isOp('-')) { p++; return { t: 'neg', a: parseUnary() }; }
      if (isOp('+')) { p++; return parseUnary(); }
      return parsePower();
    }

    function parsePower() {
      const base = parsePostfix();
      if (isOp('^')) { p++; return { t: 'bin', op: '^', a: base, b: parseUnary() }; }
      return base;
    }

    function parsePostfix() {
      let a = parsePrimary();
      while (isOp('!')) { p++; a = { t: 'fact', a }; }
      return a;
    }

    function parseArgs() {
      expect('(');
      const args = [parseExpr()];
      while (isOp(',')) { p++; args.push(parseExpr()); }
      expect(')');
      return args;
    }

    function parsePrimary() {
      const t = peek();
      if (!t) throw new ParseError('Ausdruck unvollständig');
      if (t.t === 'num') { p++; return { t: 'num', v: t.v }; }
      if (t.t === 'op' && t.v === '(') {
        p++; const e = parseExpr(); expect(')'); return e;
      }
      if (t.t === 'op' && t.v === '|') {
        p++; absDepth++;
        const e = parseExpr();
        absDepth--;
        expect('|');
        return { t: 'call', f: 'abs', args: [e] };
      }
      if (t.t === 'id') {
        p++;
        const name = ALIASES[t.v] || t.v;
        if (FUNCS[name]) {
          const spec = FUNCS[name];
          let args;
          if (isOp('(')) args = parseArgs();
          else args = [parsePower()];          // sin x
          const ok = Array.isArray(spec.n) ? spec.n.includes(args.length) : spec.n === args.length;
          if (!ok) throw new ParseError(name + ' erwartet ' + (Array.isArray(spec.n) ? spec.n.join(' oder ') : spec.n) + ' Argument(e)');
          return { t: 'call', f: name, args };
        }
        if (CONSTS[name]) return { t: 'const', n: CONSTS[name] };
        // Benutzerfunktion f(…), f'(…)
        if (ufns[name] && name !== variable) {
          if (!ufns[name].ast) throw new ParseError(name === ctx.self ? 'Funktion ' + name + ' darf sich nicht selbst verwenden' : 'Funktion ' + name + ' ist fehlerhaft oder nicht definiert');
          let order = 0;
          while (isOp('\'')) { p++; order++; }
          if (isOp('(')) {
            const args = parseArgs();
            if (args.length !== 1) throw new ParseError(name + ' erwartet ein Argument');
            let body = ufns[name].ast;
            for (let k = 0; k < order; k++) {
              body = derivative(body);
              if (!body) throw new ParseError('Ableitung von ' + name + ' nicht möglich');
            }
            return substitute(body, 'x', args[0]);
          }
          if (order) throw new ParseError('„(“ nach ' + name + "' erwartet");
        }
        if (isOp('\'')) throw new ParseError('Unbekannte Funktion ' + name);
        return { t: 'var', n: name === variable ? 'x' : name };
      }
      if (t.t === 'op' && t.v === ')') throw new ParseError('Klammer zu viel');
      throw new ParseError('Unerwartetes „' + t.v + '“');
    }

    const ast = parseExpr();
    if (p < toks.length) {
      const t = toks[p];
      throw new ParseError(t.v === ')' ? 'Klammer zu viel' : 'Unerwartetes „' + t.v + '“');
    }
    return ast;
  }

  function substitute(ast, name, repl) {
    const walk = (n) => {
      switch (n.t) {
        case 'var': return n.n === name ? repl : n;
        case 'neg': case 'fact': return { ...n, a: walk(n.a) };
        case 'bin': return { ...n, a: walk(n.a), b: walk(n.b) };
        case 'call': return { ...n, args: n.args.map(walk) };
        case 'pw': return { ...n, v: walk(n.v), parts: n.parts.map(q => ({ ...q, e: walk(q.e) })) };
        default: return n;
      }
    };
    return walk(ast);
  }

  function freeVars(ast, out) {
    out = out || new Set();
    switch (ast.t) {
      case 'var': if (ast.n !== 'x') out.add(ast.n); break;
      case 'neg': case 'fact': freeVars(ast.a, out); break;
      case 'bin': freeVars(ast.a, out); freeVars(ast.b, out); break;
      case 'call': ast.args.forEach(a => freeVars(a, out)); break;
      case 'pw':
        freeVars(ast.v, out);
        ast.parts.forEach(q => { freeVars(q.e, out); if (q.lo) freeVars(q.lo, out); if (q.hi) freeVars(q.hi, out); });
        break;
    }
    return out;
  }

  // ── Laufzeitfunktionen ──
  function realPow(b, e) {
    if (b >= 0 || Number.isInteger(e)) return Math.pow(b, e);
    // negative Basis mit gebrochenem Exponenten: reelle ungerade Wurzel, z. B. (-8)^(1/3) = -2
    for (let q = 3; q < 100; q += 2) {
      const pq = e * q;
      if (Math.abs(pq - Math.round(pq)) < 1e-9) {
        const r = Math.pow(-b, e);
        return Math.round(pq) % 2 === 0 ? r : -r;
      }
    }
    return NaN;
  }
  function fact(n) {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n > 170) return Infinity;
    let r = 1; for (let i = 2; i <= n; i++) r *= i;
    return r;
  }
  const D2R = Math.PI / 180;
  function makeRuntime(deg) {
    const a = deg ? (x) => x * D2R : (x) => x;
    const o = deg ? (x) => x / D2R : (x) => x;
    return {
      sin: x => Math.sin(a(x)), cos: x => Math.cos(a(x)), tan: x => Math.tan(a(x)),
      cot: x => 1 / Math.tan(a(x)), sec: x => 1 / Math.cos(a(x)), csc: x => 1 / Math.sin(a(x)),
      asin: x => o(Math.asin(x)), acos: x => o(Math.acos(x)), atan: x => o(Math.atan(x)),
      sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, coth: x => 1 / Math.tanh(x),
      asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
      sqrt: Math.sqrt, cbrt: Math.cbrt, root: (x, n) => realPow(x, 1 / n),
      abs: Math.abs, exp: Math.exp, ln: Math.log,
      log: (x, y) => y === undefined ? Math.log(x) : Math.log(y) / Math.log(x),
      lg: Math.log10, log2: Math.log2, sign: Math.sign,
      floor: Math.floor, ceil: Math.ceil, round: Math.round, min: Math.min, max: Math.max,
      pow: realPow, fact,
    };
  }
  const RT_RAD = makeRuntime(false), RT_DEG = makeRuntime(true);

  function toJS(n) {
    switch (n.t) {
      case 'num': return '(' + n.v + ')';
      case 'var': return n.n === 'x' ? 'x' : 'P[' + JSON.stringify(n.n) + ']';
      case 'const': return n.n === 'pi' ? 'Math.PI' : n.n === 'deg' ? '(Math.PI/180)' : 'Math.E';
      case 'neg': return '(-' + toJS(n.a) + ')';
      case 'fact': return 'F.fact(' + toJS(n.a) + ')';
      case 'bin':
        if (n.op === '^') return 'F.pow(' + toJS(n.a) + ',' + toJS(n.b) + ')';
        return '(' + toJS(n.a) + n.op + toJS(n.b) + ')';
      case 'call': return 'F.' + n.f + '(' + n.args.map(toJS).join(',') + ')';
      case 'pw': {
        // erster passender Abschnitt gewinnt; außerhalb aller Abschnitte NaN
        const v = toJS(n.v);
        return n.parts.reduceRight((rest, q) => {
          const c = [];
          if (q.lo) c.push(toJS(q.lo) + (q.loOpen ? '<' : '<=') + v);
          if (q.hi) c.push(v + (q.hiOpen ? '<' : '<=') + toJS(q.hi));
          return c.length ? '((' + c.join('&&') + ')?' + toJS(q.e) + ':' + rest + ')' : toJS(q.e);
        }, 'NaN');
      }
    }
    throw new ParseError('Interner Fehler');
  }

  // Liefert f(x) – Parameterwerte werden live aus dem übergebenen Objekt gelesen
  function compile(ast, params, opts) {
    const F = opts && opts.deg ? RT_DEG : RT_RAD;
    const raw = new Function('x', 'P', 'F', '"use strict"; return ' + toJS(ast) + ';');
    const P = params || {};
    return (x) => {
      const y = raw(x, P, F);
      return typeof y === 'number' && isFinite(y) ? y : NaN;
    };
  }

  // ── Ausgabe ──
  const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, neg: 3, '^': 4 };
  function prec(n) {
    if (n.t === 'bin') return PREC[n.op];
    if (n.t === 'neg') return PREC.neg;
    if (n.t === 'num' && n.v < 0) return PREC.neg;
    return 5;
  }
  function fmtNum(v) {
    if (Number.isInteger(v)) return String(v);
    return String(parseFloat(v.toPrecision(12)));
  }

  // Generischer Klartext-Drucker (für Anzeige, nerdamer und pgfplots)
  function printer(map) {
    const pr = (n) => {
      switch (n.t) {
        case 'num': return fmtNum(n.v);
        case 'var': return map.var ? map.var(n.n) : n.n;
        case 'const': return map.const ? map.const(n.n) : n.n;
        case 'neg': return '-' + wrap(n.a, PREC.neg + (n.a.t === 'bin' && n.a.op === '^' ? -1 : 0));
        case 'fact': return map.fact ? map.fact(pr(n.a)) : wrap(n.a, 5) + '!';
        case 'call': return map.call(n.f, n.args.map(pr), n.args);
        case 'pw':
          if (!map.pw) throw new ParseError('Abschnittsweise Funktion hier nicht möglich');
          return map.pw(n, pr);
        case 'bin': {
          const p0 = PREC[n.op];
          if (n.op === '^') return wrap(n.a, 5) + '^' + wrap(n.b, 5);
          let op = n.op, b = n.b;
          if (op === '+' && b.t === 'neg') { op = '-'; b = b.a; }
          const right = (op === '-' || op === '/') ? p0 + 1 : p0;
          // a*(-b), a/(-b) immer klammern
          const rb = (op === '*' || op === '/') && b.t === 'neg' ? '(' + pr(b) + ')' : wrap(b, right);
          return wrap(n.a, p0) + (map.mulSpaced && (op === '+' || op === '-') ? ' ' + op + ' ' : op) + rb;
        }
      }
    };
    const wrap = (n, minPrec) => prec(n) < minPrec ? '(' + pr(n) + ')' : pr(n);
    return pr;
  }

  // Bedingung eines Abschnitts als Text: "0 ≤ x < 1", "x ≥ 1"
  function condText(q, v, pr, sym) {
    sym = sym || { lt: ' < ', le: ' ≤ ', gt: ' > ', ge: ' ≥ ' };
    if (q.lo && q.hi) return pr(q.lo) + (q.loOpen ? sym.lt : sym.le) + v + (q.hiOpen ? sym.lt : sym.le) + pr(q.hi);
    if (q.lo) return v + (q.loOpen ? sym.gt : sym.ge) + pr(q.lo);
    if (q.hi) return v + (q.hiOpen ? sym.lt : sym.le) + pr(q.hi);
    return null;
  }

  const toPlain = printer({
    mulSpaced: true,
    call: (f, a) => f + '(' + a.join(', ') + ')',
    pw: (n, pr) => n.parts.map(q => { const c = condText(q, pr(n.v), pr); return pr(q.e) + (c ? ' für ' + c : ' sonst'); }).join('; '),
  });

  const toNerdamer = printer({
    call: (f, a) => {
      switch (f) {
        case 'ln': return 'log(' + a[0] + ')';
        case 'log': return a.length === 2 ? '(log(' + a[1] + ')/log(' + a[0] + '))' : 'log(' + a[0] + ')';
        case 'lg': return '(log(' + a[0] + ')/log(10))';
        case 'log2': return '(log(' + a[0] + ')/log(2))';
        case 'cbrt': return '((' + a[0] + ')^(1/3))';
        case 'root': return '((' + a[0] + ')^(1/(' + a[1] + ')))';
        default: return f + '(' + a.join(',') + ')';
      }
    },
    fact: (s) => 'factorial(' + s + ')',
  });

  function toPgf(ast, params) {
    const sub = { ...params };
    return printer({
      var: (v) => v === 'x' ? 'x' : (v in sub ? '(' + fmtNum(sub[v]) + ')' : v),
      const: (c) => c === 'deg' ? '(pi/180)' : c,
      call: (f, a) => {
        switch (f) {
          case 'ln': return 'ln(' + a[0] + ')';
          case 'log': return a.length === 2 ? '(ln(' + a[1] + ')/ln(' + a[0] + '))' : 'ln(' + a[0] + ')';
          case 'lg': return 'log10(' + a[0] + ')';
          case 'cbrt': return '(sign(' + a[0] + ')*abs(' + a[0] + ')^(1/3))';
          case 'root': return '((' + a[0] + ')^(1/(' + a[1] + ')))';
          case 'csc': return 'cosec(' + a[0] + ')';
          default: return f + '(' + a.join(',') + ')';
        }
      },
      fact: (s) => 'factorial(' + s + ')',
      // außerhalb aller Abschnitte ein großer Wert, den „restrict y to domain“ ausblendet
      pw: (n, pr) => n.parts.reduceRight((rest, q) => {
        const v = '(' + pr(n.v) + ')', c = [];
        if (q.lo) c.push('(' + pr(q.lo) + ')' + (q.loOpen ? '<' : '<=') + v);
        if (q.hi) c.push(v + (q.hiOpen ? '<' : '<=') + '(' + pr(q.hi) + ')');
        return c.length ? 'ifthenelse(' + c.join(' && ') + ', ' + pr(q.e) + ', ' + rest + ')' : pr(q.e);
      }, '1e10'),
    })(ast);
  }

  function toTeX(ast) {
    const greek = (v) => GREEK.includes(v) ? '\\' + v : v;
    const tex = (n) => {
      switch (n.t) {
        case 'num': return fmtNum(n.v).replace('.', '{,}');
        case 'var': return greek(n.n);
        case 'const': return n.n === 'pi' ? '\\pi ' : n.n === 'deg' ? '\\frac{\\pi}{180}' : 'e';
        case 'neg': return '-' + wrap(n.a, n.a.t === 'bin' && (n.a.op === '*' || n.a.op === '/') ? 2 : PREC.neg);
        case 'fact': return wrap(n.a, 5) + '!';
        case 'call': {
          const a = n.args.map(tex);
          switch (n.f) {
            case 'sqrt': return '\\sqrt{' + a[0] + '}';
            case 'cbrt': return '\\sqrt[3]{' + a[0] + '}';
            case 'root': return '\\sqrt[' + a[1] + ']{' + a[0] + '}';
            case 'abs': return '\\left|' + a[0] + '\\right|';
            case 'floor': return '\\lfloor ' + a[0] + '\\rfloor ';
            case 'ceil': return '\\lceil ' + a[0] + '\\rceil ';
            case 'exp': return 'e^{' + a[0] + '}';
            case 'log': if (a.length === 2) return '\\log_{' + a[0] + '}\\left(' + a[1] + '\\right)';
          }
          return FUNCS[n.f].tex + '\\left(' + a.join(', ') + '\\right)';
        }
        case 'pw': {
          const sym = { lt: ' < ', le: ' \\le ', gt: ' > ', ge: ' \\ge ' };
          const rows = n.parts.map(q => {
            const c = condText(q, tex(n.v), tex, sym);
            return tex(q.e) + ' & ' + (c ? '\\text{für } ' + c : '\\text{sonst}');
          });
          return '\\begin{cases} ' + rows.join(' \\\\ ') + ' \\end{cases}';
        }
        case 'bin': {
          if (n.op === '/') return '\\frac{' + tex(n.a) + '}{' + tex(n.b) + '}';
          if (n.op === '^') {
            const paren = (n.a.t === 'call' && n.a.f !== 'abs' && n.a.f !== 'sqrt') || (n.a.t === 'const' && n.a.n === 'deg');
            const base = paren ? '\\left(' + tex(n.a) + '\\right)' : wrap(n.a, 5);
            return base + '^{' + tex(n.b) + '}';
          }
          if (n.op === '*') {
            const l = wrap(n.a, 2), r = wrap(n.b, 2);
            // 2x, 3\sin(x), a x – aber 2 · 3 ausschreiben
            const implicit = n.b.t !== 'num' && !(n.b.t === 'bin' && n.b.op === '^' && n.b.a.t === 'num') && n.b.t !== 'neg';
            return l + (implicit ? ' ' : ' \\cdot ') + r;
          }
          let op = n.op, b = n.b;
          if (op === '+' && b.t === 'neg') { op = '-'; b = b.a; }
          return wrap(n.a, 1) + ' ' + op + ' ' + wrap(b, op === '-' ? 2 : 1);
        }
      }
    };
    const wrap = (n, minPrec) => prec(n) < minPrec ? '\\left(' + tex(n) + '\\right)' : tex(n);
    return tex(liftPw(ast) || ast);
  }

  // Gradmaß explizit machen: sin(u) → sin(u·deg), asin(u) → asin(u)/deg (deg = π/180).
  // Das Ergebnis wird im Bogenmaß ausgewertet (für korrekte Ableitungen im DEG-Modus).
  function radianize(ast) {
    const walk = (n) => {
      switch (n.t) {
        case 'neg': case 'fact': return { ...n, a: walk(n.a) };
        case 'bin': return { ...n, a: walk(n.a), b: walk(n.b) };
        case 'call': {
          const c = { ...n, args: n.args.map(walk) };
          const DEG = { t: 'const', n: 'deg' };
          if (TRIG_IN.has(n.f)) c.args = [{ t: 'bin', op: '*', a: c.args[0], b: DEG }];
          if (TRIG_OUT.has(n.f)) return { t: 'bin', op: '/', a: c, b: DEG };
          return c;
        }
        case 'pw': return { ...n, v: walk(n.v), parts: n.parts.map(q => ({ ...q, e: walk(q.e), lo: q.lo && walk(q.lo), hi: q.hi && walk(q.hi) })) };
        default: return n;
      }
    };
    return walk(ast);
  }

  // ── Symbolische Ableitung über nerdamer ──
  // nerdamers simplify() liefert teils falsche Ergebnisse (tan → tan²) und wird daher nicht verwendet.
  // Zahlen als Basis (2^x) durch Platzhalter ersetzen, sonst rundet nerdamer ln 2 zu einem Bruch
  function shieldBases(ast) {
    const used = freeVars(ast), map = {};
    const free = GREEK.filter(g => !used.has(g) && !['beta', 'gamma', 'zeta', 'eta', 'delta', 'psi'].includes(g));   // keine nerdamer-Funktionsnamen
    const walk = (n) => {
      switch (n.t) {
        case 'neg': case 'fact': return { ...n, a: walk(n.a) };
        case 'call': return { ...n, args: n.args.map(walk) };
        case 'bin': {
          const a = walk(n.a), b = walk(n.b);
          if (n.op === '^' && a.t === 'num' && a.v > 0 && !isConstNode(b) && free.length) {
            const key = String(a.v);
            if (!map[key]) map[key] = free.shift();
            return { ...n, a: { t: 'var', n: map[key] }, b };
          }
          return { ...n, a, b };
        }
        default: return n;
      }
    };
    const out = walk(ast);
    const restore = (r) => Object.entries(map).reduce((acc, [v, name]) => substitute(acc, name, { t: 'num', v: +v }), r);
    return { ast: out, restore };
  }

  function derivative(ast) {
    if (typeof nerdamer === 'undefined' || !nerdamer.diff) return null;
    // abschnittsweise: jeden Abschnitt einzeln ableiten
    const lifted = liftPw(ast);
    if (lifted) {
      const parts = [];
      for (const q of lifted.parts) {
        const e = derivative(q.e);
        if (!e) return null;
        parts.push({ ...q, e });
      }
      return { ...lifted, parts };
    }
    try {
      const sh = shieldBases(ast);
      const out = nerdamer.diff(toNerdamer(sh.ast), 'x').toString();
      if (/factorial|Si\(|Ci\(|erf|Ei\(|undefined|\b(asec|acsc|acot|sech|csch|acoth|asech|acsch|Shi|Chi|dirac|heaviside)\(/i.test(out)) return null;
      const d = sh.restore(parse(out));
      return agreesNumerically(ast, d) ? nicer(d) : null;
    } catch (e) {
      return null;
    }
  }

  // ── Terme aufräumen (für Ableitungen und Stammfunktionen) ──
  // Polynome absteigend ordnen, negative Exponenten als Bruch, x^(1/2) als Wurzel, Faktor x nach vorn
  const isConstNode = (n) => n.t === 'num' || n.t === 'const' || (n.t === 'neg' && isConstNode(n.a)) ||
    (n.t === 'bin' && isConstNode(n.a) && isConstNode(n.b));
  const constVal = (n) => { try { return compile(n, {})(0); } catch (e) { return NaN; } };
  const num = (v) => (v < 0 ? { t: 'neg', a: { t: 'num', v: -v } } : { t: 'num', v });
  // −e für einen konstanten Exponenten, ohne Rundung (−2/3 → 2/3)
  function negConst(n) {
    if (n.t === 'neg') return n.a;
    if (n.t === 'num') return num(-n.v);
    if (n.t === 'bin' && (n.op === '/' || n.op === '*')) return { ...n, a: negConst(n.a) };
    return { t: 'neg', a: n };
  }
  // Summe mit führendem Minus? Dann −(…) herausziehen
  const leadNeg = (t) => (t.t === 'bin' && (t.op === '+' || t.op === '-') ? leadNeg(t.a) : t.t === 'neg');
  const negSum = (t) => tidy({ t: 'neg', a: t });

  function polyDeg(n) {
    switch (n.t) {
      case 'num': case 'const': return 0;
      case 'var': return n.n === 'x' ? 1 : 0;
      case 'neg': return polyDeg(n.a);
      case 'bin':
        if (n.op === '*') { const a = polyDeg(n.a), b = polyDeg(n.b); return a === null || b === null ? null : a + b; }
        if (n.op === '/') { const b = polyDeg(n.b); return b === 0 ? polyDeg(n.a) : null; }
        if (n.op === '^' && n.a.t === 'var' && n.a.n === 'x' && isConstNode(n.b)) { const e = constVal(n.b); return Number.isInteger(e) && e >= 0 ? e : null; }
        if (n.op === '^') return polyDeg(n.a) === 0 && polyDeg(n.b) === 0 ? 0 : null;
        return null;
      case 'call': return n.args.every(a => polyDeg(a) === 0) ? 0 : null;
      default: return null;
    }
  }
  function tidy(n) {
    switch (n.t) {
      case 'neg': { const a = tidy(n.a); return a.t === 'neg' ? a.a : a.t === 'num' ? num(-a.v) : { t: 'neg', a }; }
      case 'fact': return { ...n, a: tidy(n.a) };
      case 'call': return n.f === 'log' && n.args.length === 1 ? { t: 'call', f: 'ln', args: [tidy(n.args[0])] } : { ...n, args: n.args.map(tidy) };
      case 'pw': return { ...n, parts: n.parts.map(q => ({ ...q, e: tidy(q.e) })) };
      case 'bin': break;
      default: return n;
    }
    if (n.op === '+' || n.op === '-') {
      const terms = [];
      const flat = (m, sg) => {
        if (m.t === 'bin' && (m.op === '+' || m.op === '-')) { flat(m.a, sg); flat(m.b, m.op === '-' ? -sg : sg); return; }
        const t = tidy(m);
        if (t.t === 'neg') terms.push({ sg: -sg, e: t.a });
        else if (t.t === 'num' && t.v < 0) terms.push({ sg: -sg, e: { t: 'num', v: -t.v } });
        else terms.push({ sg, e: t });
      };
      flat(n, 1);
      const degs = terms.map(t => polyDeg(t.e));
      const order = terms.map((t, i) => i);
      if (degs.every(d => d !== null)) order.sort((i, j) => degs[j] - degs[i] || i - j);
      else {
        order.sort((i, j) => (degs[i] === 0) - (degs[j] === 0) || i - j);   // Konstanten ans Ende
        const k = order.findIndex(i => terms[i].sg > 0);                     // mit positivem Term beginnen
        if (k > 0) order.unshift(order.splice(k, 1)[0]);
      }
      let out = null;
      order.forEach(i => {
        const { sg, e } = terms[i];
        if (!out) out = sg < 0 ? { t: 'neg', a: e } : e;
        else out = { t: 'bin', op: sg < 0 ? '-' : '+', a: out, b: e };
      });
      return out;
    }
    if (n.op === '*' || n.op === '/') {
      let p = 1, q = 1;
      const top = [], bot = [];
      const flat = (m, den) => {
        if (m.t === 'bin' && m.op === '*') { flat(m.a, den); flat(m.b, den); return; }
        if (m.t === 'bin' && m.op === '/') { flat(m.a, den); flat(m.b, !den); return; }
        if (m.t === 'neg') { p = -p; flat(m.a, den); return; }
        const t = tidy(m);
        if (t.t === 'neg') { p = -p; flat(t.a, den); return; }
        if (t.t === 'num') { if (den) q *= t.v; else p *= t.v; return; }
        if (t.t === 'bin' && (t.op === '*' || t.op === '/')) { flat(t, den); return; }
        if (t.t === 'bin' && t.op === '^' && isConstNode(t.b)) {
          const e = constVal(t.b);
          if (e < 0) {
            const f = e === -1 ? t.a : e === -0.5 ? { t: 'call', f: 'sqrt', args: [t.a] } : { t: 'bin', op: '^', a: t.a, b: negConst(t.b) };
            (den ? top : bot).push(f); return;
          }
          if (e === 0.5) { (den ? bot : top).push({ t: 'call', f: 'sqrt', args: [t.a] }); return; }
        }
        if (leadNeg(t)) { p = -p; (den ? bot : top).push(negSum(t)); return; }
        (den ? bot : top).push(t);
      };
      flat(n, false);
      const isX = (f) => (f.t === 'var' && f.n === 'x') || (f.t === 'bin' && f.op === '^' && f.a.t === 'var' && f.a.n === 'x');
      const isPar = (f) => f.t === 'var' && f.n !== 'x';
      const sortF = (arr) => arr.map((f, i) => [f, i]).sort((a, b) => (isPar(b[0]) - isPar(a[0])) || (isX(b[0]) - isX(a[0])) || a[1] - b[1]).map(a => a[0]);
      const prod = (arr) => arr.reduce((acc, f) => (acc ? { t: 'bin', op: '*', a: acc, b: f } : f), null);
      const neg = p < 0;
      p = Math.abs(p);
      // ganzzahlige Brüche kürzen
      if (Number.isInteger(p) && Number.isInteger(q) && q !== 0) { let a = p, b = q; while (b) [a, b] = [b, a % b]; if (a > 1) { p /= a; q /= a; } }
      else if (q !== 1) { p /= q; q = 1; }
      const T = sortF(top), B = sortF(bot);
      if (p !== 1 || !T.length) T.unshift({ t: 'num', v: p });
      const numer = prod(T);
      if (q !== 1) B.unshift({ t: 'num', v: q });
      let res = B.length ? { t: 'bin', op: '/', a: numer, b: prod(B) } : numer;
      // 1/2·x statt x/2 bei einfachem Zähler bleibt lesbar: x/2
      return neg ? { t: 'neg', a: res } : res;
    }
    if (n.op === '^') {
      const a = tidy(n.a), b = tidy(n.b);
      if (isConstNode(b)) {
        const e = constVal(b);
        if (e === 1) return a;
        if (e === 0.5) return { t: 'call', f: 'sqrt', args: [a] };
        if (e < 0) return tidy({ t: 'bin', op: '/', a: { t: 'num', v: 1 }, b: { t: 'bin', op: '^', a, b: negConst(b) } });
      }
      return { t: 'bin', op: '^', a, b };
    }
    return n;
  }

  // gleiche Funktion (auch gleiche Definitionslücken)?
  function sameFunction(u, v) {
    const P = {};
    [...freeVars(u), ...freeVars(v)].forEach((n, i) => { P[n] = 0.7 + 0.13 * i; });
    const f = compile(u, P), g = compile(v, P);
    for (const x of [0.37, 1.23, -0.81, 2.17, -1.9, 0.05, 3.3, -2.6, 0.9, 5.1]) {
      const a = f(x), b = g(x);
      if (isFinite(a) !== isFinite(b)) return false;
      if (isFinite(a) && Math.abs(a - b) > 1e-8 * Math.max(1, Math.abs(a))) return false;
    }
    return true;
  }

  // Lesbarste gleichwertige Form: nerdamers simplify/expand/factor als Kandidaten, jeweils geprüft
  function nicer(ast) {
    if (typeof nerdamer === 'undefined' || findPw(ast)) return tidy(ast);
    const cands = [tidy(ast)];
    const src = toNerdamer(ast);
    if (src.length < 400) {
      // factor kann sich aufhängen; simplify nur bei rationalen Termen (dort entsteht der Hauptnenner)
      const rational = !/[a-z]{2,}\(/i.test(src);
      (rational ? ['expand', 'simplify'] : ['expand']).forEach(fn => {
        try {
          const out = nerdamer(fn + '(' + src + ')').toString();
          if (/[a-z]+\(/i.test(out) && /\b(Si|Ci|Ei|erf|dirac|heaviside)\(/i.test(out)) return;
          if (/\d{7,}/.test(out) && !/\d{7,}/.test(src)) return;   // gerundete Konstanten (z. B. ln 2)
          const c = tidy(parse(out));
          if (sameFunction(ast, c)) cands.push(c);
        } catch (e) { /* Kandidat verwerfen */ }
      });
    }
    let best = cands[0], bl = toNice(best).length;
    cands.slice(1).forEach(c => { const l = toNice(c).length; if (l < bl) { best = c; bl = l; } });
    return best;
  }

  // ── Stammfunktion über nerdamer (ohne Konstante) ──
  // ln(u) wird zu ln|u|; das Ergebnis wird numerisch gegen f geprüft. Abschnittsweise
  // Funktionen und nicht elementare Integrale (erf, Si …) liefern null → numerisch.
  function antiderivative(ast) {
    if (typeof nerdamer === 'undefined' || !nerdamer.integrate || findPw(ast)) return null;
    try {
      const sh = shieldBases(ast);
      const out = nerdamer.integrate(toNerdamer(sh.ast), 'x').toString();
      if (/integrate|erf|Si\(|Ci\(|Ei\(|Shi|Chi|gamma|\bi\b|undefined|factorial|\b(asec|acsc|acot|sech|csch|acoth|asech|acsch)\(/i.test(out)) return null;
      const lnAbs = (n) => {
        switch (n.t) {
          case 'neg': case 'fact': return { ...n, a: lnAbs(n.a) };
          case 'bin': return { ...n, a: lnAbs(n.a), b: lnAbs(n.b) };
          case 'call': {
            const args = n.args.map(lnAbs);
            if ((n.f === 'ln' || (n.f === 'log' && args.length === 1)) && !(args[0].t === 'call' && args[0].f === 'abs')) {
              return { t: 'call', f: 'ln', args: [{ t: 'call', f: 'abs', args }] };
            }
            return { ...n, args };
          }
          default: return n;
        }
      };
      const F = lnAbs(sh.restore(parse(out)));
      return agreesNumerically(F, ast) ? nicer(F) : null;
    } catch (e) {
      return null;
    }
  }

  // Abschnittsweise Funktion nach außen ziehen: 2·f(x) + 1 → { 2·x² + 1 für x < 1; … }
  function findPw(n) {
    switch (n.t) {
      case 'pw': return n;
      case 'neg': case 'fact': return findPw(n.a);
      case 'bin': return findPw(n.a) || findPw(n.b);
      case 'call': for (const a of n.args) { const r = findPw(a); if (r) return r; } return null;
      default: return null;
    }
  }
  function liftPw(ast) {
    const pw = findPw(ast);
    if (!pw) return null;
    if (pw === ast) return ast;
    const repl = (n, by) => {
      if (n === pw) return by;
      switch (n.t) {
        case 'neg': case 'fact': return { ...n, a: repl(n.a, by) };
        case 'bin': return { ...n, a: repl(n.a, by), b: repl(n.b, by) };
        case 'call': return { ...n, args: n.args.map(a => repl(a, by)) };
        default: return n;
      }
    };
    return { ...pw, parts: pw.parts.map(q => ({ ...q, e: repl(ast, q.e) })) };
  }

  // Abschnitte mit Zahlengrenzen (nur wenn die Bedingung direkt von x abhängt)
  // Bedingung über u = αx + β (z. B. f(x − 1)) wird nach x umgerechnet; sonst null
  function pieces(ast, params) {
    const pw = ast && liftPw(ast);
    if (!pw) return null;
    const u = compile(pw.v, params);
    const b0 = u(0), al = u(1) - b0;
    if (!isFinite(b0) || !isFinite(al) || al === 0 || [2, -3, 7.5].some(x => Math.abs(u(x) - (al * x + b0)) > 1e-9 * Math.max(1, Math.abs(u(x))))) return null;
    const val = (b) => (b ? (compile(b, params)(0) - b0) / al : NaN);
    return pw.parts.map(q => {
      let lo = q.lo ? val(q.lo) : -Infinity, hi = q.hi ? val(q.hi) : Infinity, loOpen = !!q.loOpen, hiOpen = !!q.hiOpen;
      if (al < 0) { [lo, hi] = [hi === Infinity ? -Infinity : hi, lo === -Infinity ? Infinity : lo]; [loOpen, hiOpen] = [hiOpen, loOpen]; }
      return { e: q.e, lo, hi, loOpen, hiOpen, other: !q.lo && !q.hi };
    });
  }

  // Sicherheitsnetz: symbolische Ableitung an einigen Stellen mit dem Differenzenquotienten vergleichen
  function agreesNumerically(ast, dAst) {
    const P = {};
    freeVars(ast).forEach((v, i) => { P[v] = 0.7 + 0.13 * i; });
    freeVars(dAst).forEach((v) => { if (!(v in P)) P[v] = 0.7; });
    const f = compile(ast, P), d = compile(dAst, P);
    for (const x of [0.37, 1.23, -0.81, 2.17, -1.9, 0.05, 3.3]) {
      const h = 1e-5 * Math.max(1, Math.abs(x));
      const num = (f(x + h) - f(x - h)) / (2 * h), sym = d(x);
      if (!isFinite(num) || !isFinite(sym) || !isFinite(f(x))) continue;
      if (Math.abs(num - sym) > 1e-4 * Math.max(1, Math.abs(num), Math.abs(sym))) return false;
    }
    return true;
  }

  // ── Definitionsbereich: "x^2 für 0 ≤ x ≤ 3", "x^2, x > 1", "sqrt(x); x ∈ [0; 4[" ──
  // Liefert { min, max, minOpen, maxOpen } mit Grenzen als Text (oder null = unbeschränkt)
  function parseDomain(cond, variable) {
    let c = String(cond).trim();
    if (variable && variable !== 'x') c = c.replace(new RegExp('\\b' + variable + '\\b', 'g'), 'x');
    c = c
      .replace(/≤|=</g, '<=').replace(/≥|=>/g, '>=').replace(/∈/g, ' in ').replace(/[−–]/g, '-')
      .replace(/^D\s*=\s*/i, 'x in ');
    const iv = c.match(/^x\s+in\s+([\[\]])\s*(.+?)\s*(?:;|,\s)\s*(.+?)\s*([\[\]])$/i);
    if (iv) {
      const lo = iv[2].trim(), hi = iv[3].trim();
      return {
        min: /^-\s*(inf|∞|infinity)$/i.test(lo) ? null : lo,
        max: /^\+?\s*(inf|∞|infinity)$/i.test(hi) ? null : hi,
        minOpen: iv[1] === ']', maxOpen: iv[4] === '[',
      };
    }
    const OP = '(<=|>=|<|>)';
    const two = c.match(new RegExp('^(.+?)\\s*' + OP + '\\s*x\\s*' + OP + '\\s*(.+)$'));
    if (two) {
      const [, a, o1, o2, b] = two;
      if (o1[0] === '<' && o2[0] === '<') return { min: a.trim(), max: b.trim(), minOpen: o1 === '<', maxOpen: o2 === '<' };
      if (o1[0] === '>' && o2[0] === '>') return { min: b.trim(), max: a.trim(), minOpen: o2 === '>', maxOpen: o1 === '>' };
      return null;
    }
    const right = c.match(new RegExp('^x\\s*' + OP + '\\s*(.+)$'));
    if (right) {
      const [, o, v] = right;
      return o[0] === '<' ? { min: null, max: v.trim(), minOpen: false, maxOpen: o === '<' }
        : { min: v.trim(), max: null, minOpen: o === '>', maxOpen: false };
    }
    const left = c.match(new RegExp('^(.+?)\\s*' + OP + '\\s*x$'));
    if (left) {
      const [, v, o] = left;
      return o[0] === '<' ? { min: v.trim(), max: null, minOpen: o === '<', maxOpen: false }
        : { min: null, max: v.trim(), minOpen: false, maxOpen: o === '>' };
    }
    return null;
  }

  // Trennt eine Bedingung (Definitionsbereich) vom Term ab, nur auf oberster Klammerebene
  function splitDomain(body, variable) {
    let depth = 0;
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (ch === '(' || ch === '[') depth++;
      else if (ch === ')' || ch === ']') depth--;
      if (depth !== 0) continue;
      let sepLen = 0;
      if (ch === ';' || (ch === ',' && /\s/.test(body[i + 1] || ''))) sepLen = 1;
      else {
        const w = body.slice(i).match(/^\s+(für|fuer|for|mit|wobei)\s+/i);
        if (w) sepLen = w[0].length;
      }
      if (!sepLen) continue;
      const rest = body.slice(i + sepLen).trim();
      if (!/[<>≤≥∈]|\bin\b|^D\s*=/i.test(rest)) continue;
      const dom = parseDomain(rest, variable);
      if (dom) return { body: body.slice(0, i).trim(), domain: dom };
    }
    return { body, domain: null };
  }

  // Punktkoordinaten "2|3", "2; 3" oder "2, 3" (Komma mit Leerzeichen)
  function splitPair(inner) {
    const parts = [];
    let depth = 0, last = 0;
    const seps = [];
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (depth === 0 && (ch === '|' || ch === ';' || (ch === ',' && /\s/.test(inner[i + 1] || '')))) seps.push([i, ch]);
    }
    const pick = seps.find(s => s[1] === ';') || (seps.filter(s => s[1] === '|').length === 1 && seps.find(s => s[1] === '|')) ||
      (seps.length === 1 && seps[0][1] === ',' && seps[0]);
    if (!pick) return null;
    parts.push(inner.slice(last, pick[0]).trim(), inner.slice(pick[0] + 1).trim());
    return parts[0] && parts[1] ? parts : null;
  }

  // ── Eingabezeile zerlegen ──
  // "f(x) = …", "y = …", "f'" / "f''", "A(2|3)", "x = 2", oder nur ein Term
  function parseDefinition(raw) {
    const s = String(raw).trim();
    const d = s.match(/^([a-zA-Z](?:_[a-zA-Z])?)\s*('+)\s*(?:\(\s*x\s*\))?$/);
    if (d) return { kind: 'derivative', of: d[1], order: d[2].length };
    const pt = s.match(/^([A-Z](?:_?\d+|'*))\s*=?\s*\((.+)\)$/);
    if (pt) {
      const pair = splitPair(pt[2]);
      if (pair) return { kind: 'point', name: pt[1].replace('_', ''), x: pair[0], y: pair[1] };
    }
    const vl = s.match(/^x\s*=\s*(.+)$/);
    if (vl) return { kind: 'vline', x: vl[1].trim() };
    let res;
    const m = s.match(/^([a-zA-Z])(?:_\{?([a-zA-Z])\}?|_?\{?([0-9]+)\}?)?\s*\(\s*([a-zA-Z])\s*\)\s*=\s*(.+)$/);
    const y = s.match(/^y\s*=\s*(.+)$/);
    if (m && (m[1] !== 'x' || m[3]) && m[2] !== m[4]) {
      res = { kind: 'function', letter: m[1] + (m[3] ? m[3] : ''), variable: m[4], body: m[5].trim() };
      if (m[2]) res.famVar = m[2];
    } else if (y) res = { kind: 'function', letter: null, variable: 'x', body: y[1].trim() };
    else res = { kind: 'function', letter: null, variable: 'x', body: s };
    // Funktionsschar: "… für a = 1, 2, 3", "…; a ∈ {−1; 0; 1}", "… mit k = −2 … 2"
    const fam = splitFamily(res.body, res.variable);
    if (fam) {
      if (res.famVar && res.famVar !== fam.p) throw new ParseError('Index ' + res.famVar + ' passt nicht zum Scharparameter ' + fam.p);
      res.body = fam.body;
      res.family = { p: fam.p, vals: fam.vals };
    } else if (res.famVar) {
      res.family = { p: res.famVar, vals: null };   // Werte fehlen noch
    }
    if (res.family && res.letter) res.letter = res.letter + '_' + res.family.p;
    const pcs = splitPieces(res.body, res.variable);
    if (pcs) { res.pieces = pcs; res.domain = null; return res; }
    const sd = splitDomain(res.body, res.variable);
    res.body = sd.body;
    res.domain = sd.domain;
    return res;
  }

  // Werte eines Scharparameters: "1, 2, 3", "1; 2; 3", "{1; 2}", "-2 … 2", "-2..2"
  function familyValues(txt) {
    let t = txt.trim().replace(/^\{\s*|\s*\}$/g, '').replace(/[−–]/g, '-');
    const rg = t.match(/^(.+?)\s*(?:\.\.\.?|…|bis)\s*(.+)$/);
    if (rg) {
      const a = evalConst(rg[1]), b = evalConst(rg[2]);
      if (!isFinite(a) || !isFinite(b) || b < a) return null;
      const step = b - a > 12 ? Math.ceil((b - a) / 12) : 1;
      const out = [];
      for (let v = a; v <= b + 1e-9; v += step) out.push(+v.toPrecision(12));
      return out;
    }
    let parts = t.split(/\s*;\s*|,\s+/);
    if (parts.length === 1 && (t.match(/,/g) || []).length > 1) parts = t.split(',');
    const vals = parts.map(v => v.trim()).filter(Boolean).map(v => evalConst(v));
    return vals.length && vals.length <= 12 && vals.every(isFinite) ? vals : null;
  }

  function splitFamily(body, variable) {
    const m = body.match(/^(.+?)(?:\s+(?:für|fuer|for|mit)\s+|\s*[;,]\s*)([a-zA-Z])\s*(?:=|∈|\s+in\s+)\s*([^<>≤≥\[\]=]+)$/i);
    if (!m || m[2] === variable || m[2] === 'x' || m[2] === 'e') return null;
    const vals = familyValues(m[3]);
    return vals ? { body: m[1].trim(), p: m[2], vals } : null;
  }

  // Abschnittsweise Definition: "x^2 für x < 1; 2x - 1 für x ≥ 1" (auch "…, 2x - 1 sonst")
  // Liefert [{ body, domain }] (domain null = „sonst“) oder null
  const KW = /^\s+(für|fuer|for|wenn|falls|if)\s+/i;
  function splitPieces(body, variable) {
    const kws = [], seps = [];
    let depth = 0;
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (ch === '(' || ch === '{') depth++;
      else if (ch === ')' || ch === '}') depth--;
      if (depth !== 0) continue;
      if (ch === ';' || ch === '\n' || (ch === ',' && /\s/.test(body[i + 1] || ''))) seps.push(i);
      const w = body.slice(i).match(KW);
      if (w && /\S/.test(body[i - 1] || '')) kws.push([i, w[0].length]);
    }
    if (!kws.length) return null;
    // „sonst“-Abschnitt am Ende
    let other = null, end = body.length;
    const o = body.match(/[;,\n]\s*(?:sonst|andernfalls|otherwise|else)\s+(.+)$/i) || body.match(/[;,\n]\s*([^;,\n]+?)\s+(?:sonst|andernfalls|otherwise|else)\s*$/i);
    if (o && o.index > kws[kws.length - 1][0]) { other = o[1].trim(); end = o.index; }
    if (kws.length < 2 && !other) return null;
    const out = [];
    let start = 0;
    for (let k = 0; k < kws.length; k++) {
      const [pos, len] = kws[k];
      const next = k + 1 < kws.length ? kws[k + 1][0] : end;
      // Ende der Bedingung: letztes Trennzeichen vor dem nächsten Schlüsselwort
      let stop = end;
      if (k + 1 < kws.length) {
        const cand = seps.filter(s => s > pos + len && s < next);
        if (!cand.length) return null;
        stop = cand[cand.length - 1];
      }
      const term = body.slice(start, pos).trim();
      const dom = parseDomain(body.slice(pos + len, stop).trim(), variable);
      if (!term || !dom) return null;
      out.push({ body: term, domain: dom });
      start = stop + 1;
    }
    if (other) out.push({ body: other, domain: null });
    return out;
  }

  // Syntaxbaum einer Funktionsdefinition (mit Abschnitten)
  function parseFunction(d, ctx) {
    if (!d.pieces) return parse(d.body, ctx);
    const bound = (b) => (b === null ? null : parse(b, { ...ctx, variable: '\u0000' }));
    return {
      t: 'pw', v: { t: 'var', n: 'x' },
      parts: d.pieces.map(q => ({
        e: parse(q.body, ctx),
        lo: q.domain ? bound(q.domain.min) : null, hi: q.domain ? bound(q.domain.max) : null,
        loOpen: !!(q.domain && q.domain.minOpen), hiOpen: !!(q.domain && q.domain.maxOpen),
      })),
    };
  }

  // Wert eines konstanten Ausdrucks (z. B. Grenze "pi/2"); NaN bei Fehler
  function evalConst(expr, params) {
    try {
      return compile(parse(String(expr)), params || {})(0);
    } catch (e) {
      return NaN;
    }
  }

  // ── Unicode-Darstellung für Beschriftungen im Graphen: x² − 2·x + 0,5 ──
  const GREEK_CHARS = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ',
    kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω' };
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  function toNice(ast) {
    const num = (v) => fmtNum(v).replace('.', ',');
    const atomic = (n) => n.t === 'num' && n.v >= 0 || n.t === 'var' || n.t === 'const' || n.t === 'call';
    const pr = (n) => {
      switch (n.t) {
        case 'num': return n.v < 0 ? '−' + num(-n.v) : num(n.v);
        case 'var': return GREEK_CHARS[n.n] || n.n;
        case 'const': return n.n === 'pi' ? 'π' : n.n === 'deg' ? '°' : 'e';
        case 'neg': return '−' + wrap(n.a, n.a.t === 'bin' && (n.a.op === '*' || n.a.op === '/') ? 2 : PREC.neg);
        case 'fact': return wrap(n.a, 5) + '!';
        case 'call': {
          const a = n.args.map(pr);
          if (n.f === 'abs') return '|' + a[0] + '|';
          if (n.f === 'sqrt') return '√' + (atomic(n.args[0]) && n.args[0].t !== 'call' ? a[0] : '(' + a[0] + ')');
          if (n.f === 'cbrt') return '∛(' + a[0] + ')';
          return n.f + '(' + a.join('; ') + ')';
        }
        case 'pw': return n.parts.map(q => { const c = condText(q, pr(n.v), pr); return pr(q.e) + (c ? ' für ' + c : ' sonst'); }).join('; ');
        case 'bin': {
          if (n.op === '^') {
            const base = wrap(n.a, 5);
            if (n.b.t === 'num' && Number.isInteger(n.b.v) && Math.abs(n.b.v) < 100) return base + String(n.b.v).replace(/./g, ch => SUP[ch]);
            if (n.b.t === 'neg' && n.b.a.t === 'num' && Number.isInteger(n.b.a.v)) return base + ('-' + n.b.a.v).replace(/./g, ch => SUP[ch]);
            return base + (n.b.t === 'var' || n.b.t === 'const' ? '^' + pr(n.b) : '^(' + pr(n.b) + ')');
          }
          if (n.op === '*') {
            const l = wrap(n.a, 2), r = wrap(n.b, 2);
            const implicit = n.a.t === 'num' && n.a.v >= 0 && n.b.t !== 'num' && !(n.b.t === 'bin' && n.b.op !== '^' && prec(n.b) >= 2) && n.b.t !== 'neg';
            return l + (implicit && !/^[0-9]/.test(r) ? '' : '·') + r;
          }
          if (n.op === '/') return wrap(n.a, 2) + '/' + wrap(n.b, 3);
          let op = n.op, b = n.b;
          if (op === '+' && b.t === 'neg') { op = '-'; b = b.a; }
          if (op === '+' && b.t === 'num' && b.v < 0) { op = '-'; b = { t: 'num', v: -b.v }; }
          return wrap(n.a, 1) + (op === '-' ? ' − ' : ' + ') + wrap(b, op === '-' ? 2 : 1);
        }
      }
    };
    const wrap = (n, minPrec) => prec(n) < minPrec ? '(' + pr(n) + ')' : pr(n);
    return pr(liftPw(ast) || ast);
  }

  const LETTERS = ['f', 'g', 'h', 'k', 'p', 'q', 'r', 's', 'u', 'v', 'w'];
  function nextLetter(used) {
    for (const l of LETTERS) if (!used.includes(l)) return l;
    for (let i = 1; ; i++) if (!used.includes('f' + i)) return 'f' + i;
  }

  return {
    ParseError, FUNCS, familyValues, normalize, tokenize, parse, compile, freeVars, substitute,
    derivative, antiderivative, nicer, tidy, radianize, liftPw, pieces, parseFunction, toPlain: (a) => toPlain(liftPw(a) || a), toNerdamer, toPgf, toTeX, toNice, parseDefinition, parseDomain, evalConst, nextLetter, realPow,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = MathParser;
