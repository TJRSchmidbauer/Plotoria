// Plotoria 3.1 – Graph-Generator (Oberfläche): Funktionstyp wählen, markante Punkte vorgeben,
// Plotoria bestimmt den Term („Kurvendiskussion rückwärts“) und prüft, ob alles passt.
(() => {
  const P = window.Plotoria;
  const G = GraphGen;
  const $ = id => document.getElementById(id);
  const { esc, fmtDE } = P;

  const TYPES = [
    ['line', 'Gerade'], ['parabola', 'Parabel'], ['poly', 'Ganzrational'],
    ['rational', 'Gebrochen-rational'], ['exp', 'Exponential'], ['sine', 'Sinus'],
  ];
  // erlaubte Vorgaben je Typ
  const KINDS = {
    line: ['point', 'zero', 'slope'],
    parabola: ['vertex', 'zero', 'point', 'slope'],
    poly: ['zero', 'max', 'min', 'inflect', 'terrace', 'point', 'slope'],
    rational: ['pole', 'hole', 'zero', 'point', 'max', 'min'],
    exp: ['point', 'slope'],
    expoly: ['zero', 'max', 'min', 'inflect', 'point', 'slope'],
    sine: ['max', 'min'],
  };
  const KIND_LABEL = {
    zero: 'Nullstelle', max: 'Hochpunkt', min: 'Tiefpunkt', vertex: 'Scheitel', inflect: 'Wendepunkt', terrace: 'Terrassenpunkt',
    point: 'Punkt', slope: 'Steigung', pole: 'Polstelle', hole: 'Definitionslücke',
  };
  const KIND_HINT = {
    zero: 'f(x) = 0 – doppelt: Graph berührt die x-Achse', max: 'f′(x) = 0, Vorzeichenwechsel von + nach −', min: 'f′(x) = 0, Vorzeichenwechsel von − nach +',
    vertex: 'Scheitel der Parabel', inflect: 'f″(x) = 0 mit Vorzeichenwechsel', terrace: 'Wendepunkt mit waagrechter Tangente',
    point: 'Der Graph geht durch diesen Punkt', slope: 'f′(x) = m', pole: 'Nenner 0 – senkrechte Asymptote', hole: 'hebbare Definitionslücke (Zähler und Nenner 0)',
  };
  const DEFAULTS = {
    line: { conds: [{ kind: 'point', x: '0', y: '1' }, { kind: 'point', x: '2', y: '2' }] },
    parabola: { conds: [{ kind: 'zero', x: '-1', m: 1 }, { kind: 'zero', x: '3', m: 1 }, { kind: 'vertex', x: '1', y: '-2' }] },
    poly: { degree: 'auto', sym: 'none', conds: [{ kind: 'max', x: '-1', y: '2' }, { kind: 'min', x: '1', y: '-2' }] },
    rational: { asym: { kind: 'h', c: '2', m: '1', t: '0' }, conds: [{ kind: 'pole', x: '1', m: 1 }, { kind: 'zero', x: '-1', m: 1 }] },
    exp: { expForm: 'base', asymC: '1', k: '-1', conds: [{ kind: 'point', x: '0', y: '3' }, { kind: 'point', x: '1', y: '5' }] },
    expoly: { k: '-1', conds: [{ kind: 'zero', x: '1', m: 1 }, { kind: 'max', x: '2', y: '' }, { kind: 'point', x: '0', y: '-1' }] },
    sine: { trig: 'sin', period: '', conds: [{ kind: 'max', x: '1', y: '3' }, { kind: 'min', x: '3', y: '-1' }] },
  };
  const POINT_NAME = { zero: 'N', max: 'H', min: 'T', vertex: 'S', inflect: 'W', terrace: 'TP', point: 'P' };

  const clone = (o) => JSON.parse(JSON.stringify(o));

  Object.assign(P, {
    initGenerator() {
      this.gen = { type: 'poly', byType: {}, out: { name: 'f', label: 'name', points: 'conds', coords: true, asym: true, karo: false, target: 'tab' } };
      Object.keys(DEFAULTS).forEach(k => { this.gen.byType[k] = clone(DEFAULTS[k]); });
      $('gen-open').addEventListener('click', () => this.openGenerator());
      $('gen-back').addEventListener('click', () => { $('gen-sheet').close(); this.openTemplates(); });
      $('gen-apply').addEventListener('click', () => this.applyGenerated());
      $('gen-apply-2').addEventListener('click', () => this.applyGenerated());
      $('gen-dice').addEventListener('click', () => this.diceGenerator());
      $('gen-reset-free').addEventListener('click', () => { this._genSpec().free = null; this._genFree = null; this._genRun(); });
      const tg = $('gen-types');
      TYPES.forEach(([v, l]) => { const b = document.createElement('button'); b.dataset.value = v; b.textContent = l; tg.appendChild(b); });
      this.segmented(tg, (v) => { this.gen.type = v; this._genFree = null; this._genRender(); });
      // Ausgabe-Optionen
      const o = this.gen.out;
      $('gen-name').addEventListener('change', (e) => { const v = e.target.value.trim(); if (/^[a-zA-Z]$/.test(v) && !/[xye]/.test(v)) o.name = v; else { e.target.value = o.name; this._toast('Ein Buchstabe außer x, y, e'); } this._genRun(); });
      $('gen-label').addEventListener('change', (e) => { o.label = e.target.value; });
      $('gen-points').addEventListener('change', (e) => { o.points = e.target.value; });
      [['gen-coords', 'coords'], ['gen-asym-show', 'asym'], ['gen-karo', 'karo']].forEach(([id, k]) => $(id).addEventListener('change', (e) => { o[k] = e.target.checked; }));
      this.segmented($('gen-target'), (v) => { o.target = v; });
    },

    openGenerator() {
      const ts = $('templates-sheet');
      if (ts.open) ts.close();
      this.gen.out.target = this.currentDocEmpty() ? 'here' : 'tab';
      this.setSegmented($('gen-target'), this.gen.out.target);
      this._genRender();
      this.openSheet('gen-sheet');
    },

    // aktuelle Einstellungen des gewählten Typs (Exponential: Unterform „Polynom · e^(kx)“ eigener Typ)
    _genKey() {
      if (this.gen.type === 'exp' && this.gen.byType.exp.expForm === 'poly') return 'expoly';
      return this.gen.type;
    },
    _genSpec() { return this.gen.byType[this._genKey()]; },

    _genRender() {
      const g = this.gen, key = this._genKey(), sp = this._genSpec();
      this.setSegmented($('gen-types'), g.type);
      // Typ-Optionen
      const box = $('gen-opts');
      box.innerHTML = '';
      const row = (label, ...els) => { const r = document.createElement('div'); r.className = 'row'; const l = document.createElement('label'); l.textContent = label; r.append(l, ...els); box.appendChild(r); return r; };
      const field = (val, ph, onChange, w) => {
        const i = document.createElement('input'); i.type = 'text'; i.className = 'field field-mono'; i.value = val ?? ''; i.placeholder = ph || '';
        if (w) i.style.width = w + 'px';
        i.addEventListener('input', () => { onChange(i.value); this._genSchedule(); });
        return i;
      };
      const seg = (opts, value, cb) => {
        const s = document.createElement('div'); s.className = 'segmented segmented-sm';
        opts.forEach(([v, l, t]) => { const b = document.createElement('button'); b.dataset.value = v; b.textContent = l; if (t) b.title = t; s.appendChild(b); });
        this.setSegmented(s, value);
        this.segmented(s, (v) => { cb(v); this._genFree = null; this._genRender(); });
        return s;
      };
      if (g.type === 'poly') {
        const sel = document.createElement('select'); sel.className = 'field';
        [['auto', 'automatisch'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']].forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; sel.appendChild(o); });
        sel.value = String(sp.degree || 'auto');
        sel.addEventListener('change', () => { sp.degree = sel.value; this._genFree = null; this._genRun(); });
        row('Grad', sel).title = 'Automatisch: der kleinste Grad, bei dem alle Vorgaben erfüllt sind';
        row('Symmetrie', seg([['none', 'keine'], ['even', 'zur y-Achse', 'nur gerade Exponenten'], ['odd', 'zum Ursprung', 'nur ungerade Exponenten']], sp.sym || 'none', (v) => { sp.sym = v; }));
      } else if (g.type === 'rational') {
        const a = sp.asym || (sp.asym = { kind: 'auto' });
        row('Asymptote', seg([['auto', 'beliebig'], ['zero', 'y = 0'], ['h', 'y = c'], ['o', 'schief']], a.kind, (v) => { a.kind = v; }));
        if (a.kind === 'h') row('waagrecht: y =', field(a.c, 'z. B. 2', (v) => { a.c = v; }, 80));
        if (a.kind === 'o') {
          const pr = document.createElement('div'); pr.className = 'pair';
          const s1 = document.createElement('span'); s1.textContent = 'y ='; const s2 = document.createElement('span'); s2.textContent = 'x +';
          pr.append(s1, field(a.m, 'm', (v) => { a.m = v; }, 54), s2, field(a.t, 't', (v) => { a.t = v; }, 54));
          row('schief', pr);
        }
      } else if (g.type === 'exp') {
        const e = g.byType.exp;
        row('Form', seg([['base', 'a · bˣ + c', 'Jgst. 10'], ['e', 'a · eᵏˣ + c', 'Jgst. 12'], ['poly', 'Polynom · eᵏˣ', 'z. B. (x − 1)·e⁻ˣ']], e.expForm, (v) => { e.expForm = v; }));
        if (key === 'expoly') row('k im Exponenten', field(sp.k, 'z. B. -1', (v) => { sp.k = v; }, 80));
        else row('Asymptote: y =', field(e.asymC, 'z. B. 0', (v) => { e.asymC = v; }, 80));
      } else if (g.type === 'sine') {
        row('Funktion', seg([['sin', 'sin'], ['cos', 'cos']], sp.trig || 'sin', (v) => { sp.trig = v; }));
        row('Periode (optional)', field(sp.period, 'z. B. 2pi oder 4', (v) => { sp.period = v; }, 110)).title = 'Ohne Angabe: doppelter Abstand von Hoch- und Tiefpunkt';
      }
      box.hidden = !box.childElementCount;
      this._genRenderConds();
      this._genRun();
    },

    _genRenderConds() {
      const key = this._genKey(), sp = this._genSpec();
      const list = $('gen-conds');
      list.innerHTML = '';
      sp.conds.forEach((c, i) => {
        const r = document.createElement('div'); r.className = 'gen-cond'; r.dataset.kind = c.kind;
        const tag = document.createElement('span'); tag.className = 'gen-tag'; tag.textContent = KIND_LABEL[c.kind]; tag.title = KIND_HINT[c.kind] || '';
        const inp = (prop, ph, w) => {
          const el = document.createElement('input'); el.type = 'text'; el.className = 'field field-mono'; el.value = c[prop] ?? ''; el.placeholder = ph;
          el.style.width = (w || 58) + 'px'; el.setAttribute('aria-label', KIND_LABEL[c.kind] + ' ' + ph);
          el.addEventListener('input', () => { c[prop] = el.value; this._genFree = null; this._genSchedule(); });
          return el;
        };
        const fields = document.createElement('span'); fields.className = 'gen-fields';
        const lbl = (t) => { const s = document.createElement('span'); s.className = 'gen-l'; s.textContent = t; return s; };
        if (c.kind === 'slope') fields.append(lbl('x ='), inp('x', 'x'), lbl('m ='), inp('y', 'm'));
        else if (c.kind === 'zero' || c.kind === 'pole') {
          fields.append(lbl('x ='), inp('x', 'x'));
          const sel = document.createElement('select'); sel.className = 'field gen-mult';
          const opts = c.kind === 'zero' ? [[1, 'einfach'], [2, 'doppelt'], [3, 'dreifach']] : [[1, 'mit VZW'], [2, 'ohne VZW']];
          opts.forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; sel.appendChild(o); });
          sel.value = String(c.m || 1);
          sel.title = c.kind === 'zero' ? 'Vielfachheit: doppelt = Berührpunkt, dreifach = Terrassenpunkt auf der x-Achse' : 'Vorzeichenwechsel an der Polstelle';
          sel.addEventListener('change', () => { c.m = +sel.value; this._genFree = null; this._genRun(); });
          if (key !== 'line') fields.append(sel);
        } else if (c.kind === 'hole') fields.append(lbl('x ='), inp('x', 'x'));
        else {
          const opt = c.kind !== 'point';
          fields.append(lbl('('), inp('x', 'x'), lbl('|'), inp('y', opt ? 'y?' : 'y'), lbl(')'));
        }
        const del = document.createElement('button'); del.className = 'icon-btn danger'; del.innerHTML = Icons.svg('close'); del.title = 'Vorgabe entfernen';
        del.addEventListener('click', () => { sp.conds.splice(i, 1); this._genFree = null; this._genRenderConds(); this._genRun(); });
        r.append(tag, fields, del);
        list.appendChild(r);
      });
      // Knöpfe zum Hinzufügen
      const add = $('gen-add');
      add.innerHTML = '';
      KINDS[key].forEach(k => {
        const b = document.createElement('button'); b.className = 'gen-add-btn'; b.dataset.kind = k; b.innerHTML = '+ ' + KIND_LABEL[k]; b.title = KIND_HINT[k] || '';
        b.addEventListener('click', () => {
          sp.conds.push({ kind: k, x: '', y: k === 'zero' || k === 'pole' || k === 'hole' ? undefined : '', m: 1 });
          this._genFree = null;
          this._genRenderConds();
          const ins = list.querySelectorAll('.gen-cond:last-child input');
          if (ins[0]) ins[0].focus();
          this._genRun();
        });
        add.appendChild(b);
      });
    },

    _genSchedule() { clearTimeout(this._genT); this._genT = setTimeout(() => this._genRun(), 220); },

    // Vorgaben → Ergebnis
    _genRun() {
      const key = this._genKey(), sp = this._genSpec(), g = this.gen;
      const spec = { ...clone(sp), type: key };
      if (key === 'exp') { spec.expForm = g.byType.exp.expForm; spec.asymC = g.byType.exp.asymC; }
      if (this._genFree) spec.free = this._genFree;
      spec.conds = spec.conds.filter(c => String(c.x ?? '').trim() !== '');
      const t0 = performance.now();
      const r = G.generate(spec);
      this._genResult = r.error ? null : r;
      this._genRenderResult(r, spec);
      $('gen-time').textContent = r.error ? '' : Math.round(performance.now() - t0) + ' ms';
    },

    diceGenerator() {
      const key = this._genKey(), sp = this._genSpec(), g = this.gen;
      const opts = { degree: sp.degree, sym: sp.sym, expForm: g.byType.exp.expForm === 'poly' ? 'e' : g.byType.exp.expForm };
      const s = G.randomSpec(key === 'exp' ? 'exp' : key, opts, (Math.random() * 2147483647) | 0);
      if (!s) { this._toast('Keine schöne Variante gefunden – andere Einstellungen probieren'); return; }
      sp.conds = s.conds.map(c => ({ ...c }));
      if (s.asym) sp.asym = { ...sp.asym, ...s.asym };
      if (key === 'exp') g.byType.exp.asymC = s.asymC;
      if (s.k !== undefined) sp.k = s.k;
      if (s.trig) sp.trig = s.trig;
      if (key === 'sine') sp.period = '';
      this._genFree = null;
      this._genRender();
    },

    _genRenderResult(r, spec) {
      const term = $('gen-term'), chk = $('gen-checks'), free = $('gen-free'), prev = $('gen-preview');
      const name = this.gen.out.name;
      $('gen-apply').disabled = $('gen-apply-2').disabled = !!r.error;
      if (r.error) {
        term.innerHTML = '<p class="gen-error">' + esc(r.error) + '</p>';
        chk.innerHTML = ''; free.hidden = true;
        prev.innerHTML = this._genSvg(null, spec);
        return;
      }
      // Term (KaTeX über Plotorias Parser)
      term.innerHTML = '';
      const t = document.createElement('div'); t.className = 'gen-term-main';
      try {
        const d = MathParser.parseDefinition(name + '(x) = ' + r.term);
        const ast = MathParser.parseFunction(d, {});
        this._renderTeX(t, P.letterTeX(name) + '(x) = ' + MathParser.toTeX(ast), name + '(x) = ' + r.term);
      } catch (e) { t.textContent = name + '(x) = ' + r.term; }
      term.appendChild(t);
      if (r.termFactored) {
        const f = document.createElement('div'); f.className = 'gen-term-alt';
        try {
          const d = MathParser.parseDefinition('f(x) = ' + r.termFactored);
          this._renderTeX(f, '= ' + MathParser.toTeX(MathParser.parseFunction(d, {})), '= ' + r.termFactored);
        } catch (e) { f.textContent = '= ' + r.termFactored; }
        term.appendChild(f);
      }
      const info = [];
      if (r.degree !== undefined && (spec.type === 'poly' || spec.type === 'line' || spec.type === 'parabola')) info.push('Grad ' + r.degree + (r.degreeAuto && spec.type === 'poly' ? ' (automatisch)' : ''));
      if (spec.type === 'rational' && r.asymptotes[0]) info.push(this._asymText(r.asymptotes[0]));
      if ((spec.type === 'exp' || spec.type === 'expoly') && r.asymptotes[0]) info.push('waagrechte Asymptote y = ' + fmtDE(r.asymptotes[0].y) + ' für x → ' + r.asymptotes[0].side);
      if (spec.type === 'sine' && r.params) info.push('Amplitude ' + fmtDE(r.params.a) + ' · Periode ' + this._piText(r.params.period));
      if (info.length) { const i = document.createElement('div'); i.className = 'gen-info'; i.textContent = info.join(' · '); term.appendChild(i); }

      // freie Koeffizienten mit Regler
      free.hidden = !r.free.length;
      const fl = $('gen-free-list');
      fl.innerHTML = '';
      r.free.forEach((p, i) => {
        const w = document.createElement('div'); w.className = 'gen-free-row';
        const l = document.createElement('span'); l.textContent = p.label;
        const sl = document.createElement('input'); sl.type = 'range'; sl.min = -5; sl.max = 5; sl.step = 0.05; sl.value = p.value;
        const vf = document.createElement('input'); vf.type = 'text'; vf.className = 'field field-mono'; vf.value = this._frac(p.value); vf.style.width = '64px';
        const set = (v) => {
          this._genFree = r.free.map((q, k) => (k === i ? v : q.value));
          this._genRun();
        };
        sl.addEventListener('input', () => { vf.value = this._frac(+sl.value); clearTimeout(this._genSl); this._genSl = setTimeout(() => set(+sl.value), 60); });
        vf.addEventListener('change', () => { const v = G.num(vf.value); if (isFinite(v)) { sl.value = v; set(v); } else vf.value = this._frac(p.value); });
        w.append(l, sl, vf);
        fl.appendChild(w);
      });
      $('gen-free-hint').textContent = r.free.length === 1 ? 'Die Vorgaben legen die Funktion nicht ganz fest. Plotoria hat die Wahl mit den schönsten Kennpunkten getroffen – mit dem Regler anpassen.' : 'Die Vorgaben legen die Funktion nicht ganz fest – Plotoria hat schöne Werte gewählt.';

      // Prüfliste
      chk.innerHTML = '';
      const ul = document.createElement('ul');
      r.checks.forEach(it => {
        const li = document.createElement('li'); li.className = it.ok ? (it.msg ? 'note' : 'ok') : 'warn';
        li.innerHTML = '<span class="gen-mark">' + (it.ok ? '✓' : '⚠') + '</span><span>' + esc(this._condText(it.c, r)) + (it.msg ? ' – ' + esc(it.msg) : '') + '</span>';
        ul.appendChild(li);
      });
      chk.appendChild(ul);
      const extra = this._genExtras(r, spec);
      if (extra.length) {
        const h = document.createElement('h4'); h.textContent = 'Weitere Kennpunkte im Bild';
        const ul2 = document.createElement('ul'); ul2.className = 'gen-extra';
        extra.forEach(p => { const li = document.createElement('li'); li.textContent = this._featText(p); ul2.appendChild(li); });
        chk.append(h, ul2);
      }
      prev.innerHTML = this._genSvg(r, spec);
    },

    _frac(v) { const r = Numerics.rational(v, 12); return r ? (r.q === 1 ? String(r.p) : r.p + '/' + r.q).replace('-', '−') : fmtDE(v, 3); },
    _piText(v) { const e = Numerics.exact(v); return e || fmtDE(v); },
    _pt(v) { const e = Numerics.exact(v); return e && e.length <= 8 ? e : fmtDE(v, 3); },
    _asymText(a) {
      if (a.kind === 'h') return 'waagrechte Asymptote y = ' + fmtDE(a.y);
      const t = a.t ? (a.t < 0 ? ' − ' : ' + ') + fmtDE(Math.abs(a.t)) : '';
      return 'schiefe Asymptote y = ' + (a.m === 1 ? '' : a.m === -1 ? '−' : fmtDE(a.m)) + 'x' + t;
    },
    _condText(c, r) {
      const x = G.num(c.x);
      const y = c.y === '' || c.y == null ? (r && r.model ? r.model.f(x) : NaN) : G.num(c.y);
      const X = this._pt(x), Y = isFinite(y) ? this._pt(y) : '?';
      switch (c.kind) {
        case 'zero': return 'Nullstelle x = ' + X + ((c.m || 1) > 1 ? ' (' + (c.m === 2 ? 'doppelt' : 'dreifach') + ')' : '');
        case 'pole': return 'Polstelle x = ' + X + ((c.m || 1) > 1 ? ' ohne VZW' : ' mit VZW');
        case 'hole': return 'Definitionslücke x = ' + X;
        case 'slope': return 'Steigung ' + fmtDE(G.num(c.y)) + ' bei x = ' + X;
        default: return KIND_LABEL[c.kind] + ' (' + X + ' | ' + Y + ')';
      }
    },
    _featText(p) {
      const n = { zero: 'Nullstelle', max: 'Hochpunkt', min: 'Tiefpunkt', inflect: 'Wendepunkt', terrace: 'Terrassenpunkt', pole: 'Polstelle' }[p.type];
      if (p.type === 'zero') return n + ' x = ' + this._pt(p.x);
      if (p.type === 'pole') return n + ' x = ' + this._pt(p.x);
      return n + ' (' + this._pt(p.x) + ' | ' + this._pt(p.y) + ')';
    },
    // Kennpunkte, die nicht vorgegeben wurden
    _genExtras(r, spec) {
      const xs = spec.conds.map(c => ({ x: G.num(c.x), kind: c.kind }));
      const same = (p) => xs.some(c => Math.abs(c.x - p.x) < 1e-6 && (c.kind === p.type || (c.kind === 'vertex' && /max|min/.test(p.type)) || (c.kind === 'zero' && p.type === 'zero') || c.kind === 'point' && p.type === 'zero'));
      const list = r.features.filter(p => !same(p));
      return spec.type === 'sine' ? list.slice(0, 6) : list;
    },

    // ── Vorschau als SVG ──
    _genSvg(r, spec) {
      const W = 560, H = 360, pad = { l: 34, r: 14, t: 12, b: 24 };
      let view = r ? r.view : [-5, 5, -4, 4];
      const [x0, x1, y0, y1] = view;
      const sx = (x) => pad.l + (x - x0) / (x1 - x0) * (W - pad.l - pad.r);
      const sy = (y) => H - pad.b - (y - y0) / (y1 - y0) * (H - pad.t - pad.b);
      const step = (span, px) => { const raw = span / (px / 46); const m = Math.pow(10, Math.floor(Math.log10(raw))); const n = raw / m; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * m; };
      const isPi = r && r.piAxis && spec.type === 'sine';
      const xs = isPi ? Math.PI / 2 : step(x1 - x0, W - pad.l - pad.r), ys = step(y1 - y0, H - pad.t - pad.b);
      const dark = this._theme().dark;
      const C = { grid: dark ? '#3A3A3C' : '#E5E5EA', axis: dark ? '#E5E5EA' : '#1C1C1E', text: dark ? '#AEAEB2' : '#636366', curve: '#007AFF', ok: '#34C759', warn: '#FF9500', extra: dark ? '#8E8E93' : '#8E8E93' };
      let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, -apple-system, sans-serif" font-size="11">`;
      s += `<defs><clipPath id="gen-clip"><rect x="${pad.l}" y="${pad.t}" width="${W - pad.l - pad.r}" height="${H - pad.t - pad.b}"/></clipPath></defs>`;
      const ax = Math.min(Math.max(sx(0), pad.l), W - pad.r), ay = Math.min(Math.max(sy(0), pad.t), H - pad.b);
      for (let x = Math.ceil(x0 / xs) * xs; x <= x1 + 1e-9; x += xs) {
        s += `<line x1="${sx(x)}" y1="${pad.t}" x2="${sx(x)}" y2="${H - pad.b}" stroke="${C.grid}"/>`;
        if (Math.abs(x) > 1e-9) s += `<text x="${sx(x)}" y="${Math.min(ay + 13, H - 6)}" text-anchor="middle" fill="${C.text}">${isPi ? esc(this._piText(x)) : fmtDE(x)}</text>`;
      }
      for (let y = Math.ceil(y0 / ys) * ys; y <= y1 + 1e-9; y += ys) {
        s += `<line x1="${pad.l}" y1="${sy(y)}" x2="${W - pad.r}" y2="${sy(y)}" stroke="${C.grid}"/>`;
        if (Math.abs(y) > 1e-9) s += `<text x="${Math.max(ax - 5, 26)}" y="${sy(y) + 4}" text-anchor="end" fill="${C.text}">${fmtDE(y)}</text>`;
      }
      s += `<line x1="${pad.l}" y1="${ay}" x2="${W - pad.r}" y2="${ay}" stroke="${C.axis}" stroke-width="1.3"/><line x1="${ax}" y1="${pad.t}" x2="${ax}" y2="${H - pad.b}" stroke="${C.axis}" stroke-width="1.3"/>`;
      if (!r) return s + `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="${C.text}" font-size="13">Noch kein Graph</text></svg>`;
      s += '<g clip-path="url(#gen-clip)">';
      // Asymptoten
      const dash = `stroke="${C.extra}" stroke-width="1.2" stroke-dasharray="5,4" fill="none"`;
      (r.model.poles || []).forEach(p => { s += `<line x1="${sx(p)}" y1="${pad.t}" x2="${sx(p)}" y2="${H - pad.b}" ${dash}/>`; });
      r.asymptotes.forEach(a => {
        if (a.kind === 'h') s += `<line x1="${pad.l}" y1="${sy(a.y)}" x2="${W - pad.r}" y2="${sy(a.y)}" ${dash}/>`;
        else s += `<line x1="${sx(x0)}" y1="${sy(a.m * x0 + a.t)}" x2="${sx(x1)}" y2="${sy(a.m * x1 + a.t)}" ${dash}/>`;
      });
      // Graph
      const N = 700, yr = y1 - y0;
      let d = '', pen = false, last = null;
      for (let i = 0; i <= N; i++) {
        const x = x0 + (x1 - x0) * i / N, y = r.model.f(x);
        const brk = !isFinite(y) || Math.abs(y - y0 - yr / 2) > yr * 4 || (last !== null && Math.abs(y - last) > yr * 1.5) || (r.model.poles || []).some(p => Math.abs(p - x) < (x1 - x0) / N);
        if (brk) { pen = false; last = isFinite(y) ? y : null; continue; }
        d += (pen ? 'L' : 'M') + sx(x).toFixed(1) + ',' + sy(y).toFixed(1);
        pen = true; last = y;
      }
      s += `<path d="${d}" fill="none" stroke="${C.curve}" stroke-width="2.6" stroke-linejoin="round"/>`;
      s += '</g>';
      // weitere Kennpunkte (hohl, grau)
      this._genExtras(r, spec).forEach(p => {
        if (p.type === 'pole' || !isFinite(p.y)) return;
        s += `<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="4" fill="none" stroke="${C.extra}" stroke-width="1.6"/>`;
      });
      // Vorgaben (gefüllt; Orange bei Warnung)
      r.checks.forEach(it => {
        const c = it.c;
        if (c.kind === 'pole' || c.kind === 'hole' || c.kind === 'slope') return;
        const x = G.num(c.x), y = c.kind === 'zero' ? 0 : c.y === '' || c.y == null ? r.model.f(x) : G.num(c.y);
        if (!isFinite(x) || !isFinite(y) || x < x0 || x > x1 || y < y0 || y > y1) return;
        const col = it.ok ? C.curve : C.warn;
        s += `<circle cx="${sx(x)}" cy="${sy(y)}" r="5" fill="${col}" stroke="${dark ? '#1C1C1E' : '#fff'}" stroke-width="1.6"/>`;
        const lab = { max: 'H', min: 'T', vertex: 'S', inflect: 'W', terrace: 'TP', zero: '', point: '' }[c.kind];
        if (lab) s += `<text x="${sx(x) + 7}" y="${sy(y) - 7}" fill="${col}" font-weight="700" font-size="12">${lab}</text>`;
      });
      r.checks.filter(it => it.c.kind === 'hole').forEach(it => {
        const x = G.num(it.c.x), y = this._holeY(r, x);
        if (isFinite(y)) s += `<circle cx="${sx(x)}" cy="${sy(y)}" r="4.5" fill="${dark ? '#1C1C1E' : '#fff'}" stroke="${C.curve}" stroke-width="2"/>`;
      });
      return s + '</svg>';
    },
    _holeY(r, x) { const h = 1e-6; return (r.model.f(x - h) + r.model.f(x + h)) / 2; },

    // ── In Plotoria übernehmen ──
    applyGenerated() {
      const r = this._genResult;
      if (!r) return;
      const o = this.gen.out, key = this._genKey(), sp = this._genSpec();
      const def = o.name + '(x) = ' + r.term;
      const objs = [];
      const used = {};
      const conds = sp.conds.filter(c => String(c.x ?? '').trim() !== '');
      if (o.points === 'conds') {
        conds.forEach(c => {
          if (!POINT_NAME[c.kind]) return;
          const x = G.num(c.x);
          let y = c.kind === 'zero' ? 0 : c.y === '' || c.y == null ? r.model.f(x) : G.num(c.y);
          if (!isFinite(x) || !isFinite(y)) return;
          const base = POINT_NAME[c.kind];
          used[base] = (used[base] || 0) + 1;
          objs.push({ base, x, y });
        });
        // Namen: einzelne Punkte ohne Index, mehrere mit N_1, N_2 …; Punkte P, Q, R
        const count = {};
        objs.forEach(p => { count[p.base] = (count[p.base] || 0) + 1; p.i = count[p.base]; });
        const names = 'PQRUVZ';
        objs.forEach(p => {
          if (p.base === 'P') p.name = names[p.i - 1] || 'P_' + p.i;
          else p.name = used[p.base] > 1 ? p.base + '_' + p.i : p.base;
        });
      }
      const xStr = (v) => { const q = Numerics.rational(v, 24); if (q) return q.q === 1 ? String(q.p) : q.p + '/' + q.q; const e = Numerics.rational(v / Math.PI, 12); if (e) return (e.p === 1 ? '' : e.p === -1 ? '-' : e.p + '*') + 'pi' + (e.q === 1 ? '' : '/' + e.q); return String(+v.toPrecision(10)); };
      const pts = objs.map(p => ({ type: 'point', name: p.name, x: xStr(p.x), y: xStr(p.y), showCoords: o.coords, showName: true, off: [8, -10], col: '#FF3B30', vis: true }));
      const fnObj = { s: def, lm: o.label };
      if (o.asym && (key === 'rational' || key === 'exp' || key === 'expoly')) fnObj.as = 1;
      const style = { exact: true };   // Koordinaten als 1/2, √3, π/2
      if (o.karo && r.prop) Object.assign(style, { gridMode: 'karo', karo: 2 });
      if (key === 'sine' && r.piAxis) Object.assign(style, { xFmt: 'pi', xStep: 'pi/2' });
      if (o.target === 'add') {
        const res = this._addDef(def);
        if (res.error) { this._toast(res.error); return; }
        const f = this.fns[this.fns.length - 1];
        if (f) { f.labelMode = o.label; if (fnObj.as) f.asym = true; }
        pts.forEach(p => { const ex = this.objs.find(q => q.type === 'point' && q.name === p.name); if (ex) p.name = p.name + "'"; this.objs.push({ ...p, id: this.nextId++ }); });
        this._afterObjChange && this._afterObjChange();
        this.sync(); this.repaint(); this.commit();
      } else {
        const t = { title: '', view: r.view, prop: r.prop, smart: o.points === 'smart', style, fns: [fnObj], objs: pts };
        const st = this._templateState(t);
        st.fns[0].l = o.name;
        if (o.target === 'tab') this.newDoc(st);
        else { this.load(st); this.commit(); this.renderTabs(); }
        if (r.prop && this._fitTemplateView) { this._fitTemplateView(r.view); this.commit(); }
      }
      $('gen-sheet').close();
      this._toast(o.name + '(x) = ' + r.term.replace(/\*/g, '·') + (o.target === 'tab' ? ' – in neuem Tab' : ''));
    },
  });
})();
