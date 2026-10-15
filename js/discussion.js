// Plotoria 3.0 – Kurvendiskussion als Text (Lösungsblatt für Word, LaTeX und den Druckbogen)
(() => {
  const P = window.Plotoria;
  const MP = MathParser;
  const $ = id => document.getElementById(id);
  const { esc, fmtDE, letterTeX, bisect } = P;

  // Zahl als Unicode-Text und als TeX, exakt (√2, π/2, 1/3) oder auf zwei Dezimalen gerundet
  function numFmt(v, exact, note) {
    if (Math.abs(v) < 1e-10) v = 0;
    let s = exact ? Numerics.exact(v) : null;
    if (!s) {
      s = fmtDE(v, 2);
      if (Math.abs(v - Math.round(v * 100) / 100) > 1e-9) note.rounded = true;
    }
    const tex = s.replace(/−/g, '-').replace(/π/g, '\\pi ').replace(/√(\d+)/g, '\\sqrt{$1}').replace(/,/g, '{,}');
    return { uni: s, tex };
  }

  const SUB = (n) => String(n).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);

  Object.assign(P, {
    disc: { fnId: null, a: '', b: '', exact: true, inf: true, derivs: true, mono: true, curv: true, limits: true },

    initDiscussion() {
      const E = this.els;
      Object.assign(E, { discSheet: $('disc-sheet'), discOut: $('disc-out'), discA: $('disc-a'), discB: $('disc-b') });
      const re = () => this.renderDiscussion();
      [E.discA, E.discB].forEach(el => el.addEventListener('change', () => { this.disc.a = E.discA.value.trim(); this.disc.b = E.discB.value.trim(); re(); }));
      ['exact', 'inf', 'derivs', 'mono', 'curv', 'limits'].forEach(k => {
        const c = $('disc-' + k);
        c.checked = this.disc[k];
        c.addEventListener('change', () => { this.disc[k] = c.checked; re(); });
      });
      $('disc-word').addEventListener('click', () => this.copyDiscussionWord());
      $('disc-latex').addEventListener('click', () => this.copyDiscussionLatex());
      $('disc-print').addEventListener('click', () => this.discussionToPrint());
    },

    openDiscussion(fn) {
      if (!fn || !fn.f) return;
      this.disc.fnId = fn.id;
      const [x0, x1] = this.xs.domain();
      const r = (v) => String(+v.toPrecision(3)).replace('.', ',');
      this.disc.a = r(x0); this.disc.b = r(x1);
      this.els.discA.value = this.disc.a; this.els.discB.value = this.disc.b;
      $('disc-title').textContent = 'Kurvendiskussion von ' + fn.letter;
      this.openSheet('disc-sheet');
      this.renderDiscussion();
    },

    _discRange() {
      const v = (s, d) => { const n = MP.evalConst(String(s).replace(',', '.')); return isFinite(n) ? n : d; };
      const [x0, x1] = this.xs.domain();
      let a = v(this.disc.a, x0), b = v(this.disc.b, x1);
      if (b <= a) [a, b] = [x0, x1];
      return [a, b];
    },

    // ── Berechnung: Abschnitte mit { title, lines: [{ uni, tex }] } ──
    _discussion(fn) {
      const o = this.disc, note = {};
      const [a, b] = this._discRange();
      const N = (v) => numFmt(v, o.exact, note);
      const f = fn.f, { d1, d2 } = this._derivs(fn);
      const L = letterTeX(fn.letter), name = fn.letter;
      const sections = [];
      const sec = (title, lines) => { if (lines.length) sections.push({ title, lines }); };
      const line = (uni, tex) => ({ uni, tex });
      const pt = (letter, idx, x, y) => {
        const X = N(x), Y = N(y);
        const sub = idx ? idx : '';
        return line(letter + (sub ? '<sub>' + sub + '</sub>' : '') + '(' + X.uni + ' | ' + Y.uni + ')',
          letter + (sub ? '_{' + sub + '}' : '') + '\\left(' + X.tex + ' \\mid ' + Y.tex + '\\right)');
      };
      const join = (items) => line(items.map(i => i.uni).join(';  '), items.map(i => i.tex).join(';\\quad '));

      // Funktionsterm
      const head = [];
      if (fn.ast) head.push(line(esc(name) + '(x) = ' + esc(MP.toNice(fn.ast)), L + '(x) = ' + MP.toTeX(fn.ast)));
      sections.push({ title: null, lines: head });

      // Abtastung des Bereichs: definierte Teilintervalle und Polstellen
      const S = 3000, h = (b - a) / S;
      const finite = [];
      let cur = null;
      for (let i = 0; i <= S; i++) {
        const x = a + i * h, ok = isFinite(f(x));
        if (ok && !cur) cur = [x, x];
        if (ok) cur[1] = x;
        if (!ok && cur) { finite.push(cur); cur = null; }
      }
      if (cur) finite.push(cur);
      // Ränder der Teilintervalle genauer bestimmen
      const edge = (lo, hi, inside) => {
        for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (isFinite(f(m)) === inside) lo = m; else hi = m; }
        return lo;
      };
      finite.forEach(iv => {
        if (iv[0] > a) iv[0] = edge(iv[0], iv[0] - h, true);
        if (iv[1] < b) iv[1] = edge(iv[1], iv[1] + h, true);
      });
      const poles = Numerics.verticalAsymptotes(f, a, b);
      const bd = fn.bounds && fn.bounds();
      const loInf = o.inf && !(bd && isFinite(bd.lo)), hiInf = o.inf && !(bd && isFinite(bd.hi));
      const snapNum = (v) => { const r = Math.round(v * 1e6) / 1e6; return Math.abs(r - v) < 1e-6 ? r : v; };
      const defined = (x) => isFinite(f(x));

      // Intervall als Text: ]−∞; 1], [0; 3[
      const ivText = (u, v) => {
        const lInf = u <= a + 1e-12 && loInf, rInf = v >= b - 1e-12 && hiInf;
        const lOpen = lInf || !defined(u), rOpen = rInf || !defined(v);
        const U = lInf ? { uni: '−∞', tex: '-\\infty' } : N(u), V = rInf ? { uni: '+∞', tex: '+\\infty' } : N(v);
        return line((lOpen ? ']' : '[') + U.uni + '; ' + V.uni + (rOpen ? '[' : ']'),
          '\\left' + (lOpen ? ']' : '[') + U.tex + ';\\, ' + V.tex + '\\right' + (rOpen ? '[' : ']'));
      };

      // Definitionsbereich
      const dl = [];
      if (fn.domain) {
        dl.push(line('D = ' + esc(this._domainUni(fn.domain)), 'D = ' + this._domainTeX(fn.domain).replace(/^/, '\\{x \\mid ') + '\\}'));
      } else if (finite.length && finite.every((iv, i) => i === 0 || iv[0] - finite[i - 1][1] < 2 * h) && finite[0][0] <= a + h && finite[finite.length - 1][1] >= b - h) {
        // nur einzelne Stellen fehlen (Polstellen, Lücken)
        const gaps = [...finite.slice(1).map((iv, i) => snapNum((iv[0] + finite[i][1]) / 2))];
        poles.forEach(p => { if (!gaps.some(g => Math.abs(g - p) < 1e-6) && !defined(p)) gaps.push(p); });
        gaps.sort((p, q) => p - q);
        if (!gaps.length) dl.push(line('D = ℝ', 'D = \\mathbb{R}'));
        else {
          const G = gaps.map(N);
          dl.push(line('D = ℝ \\ {' + G.map(g => g.uni).join('; ') + '}', 'D = \\mathbb{R} \\setminus \\{' + G.map(g => g.tex).join(';\\, ') + '\\}'));
        }
      } else if (finite.length) {
        const parts = finite.map(([u, v]) => ivText(u, v));
        dl.push(line('D = ' + parts.map(p => p.uni).join(' ∪ '), 'D = ' + parts.map(p => p.tex).join(' \\cup ')));
      }
      if (dl.length && !(loInf && hiInf) && !fn.domain) dl.push(line('(untersucht für ' + N(a).uni + ' ≤ x ≤ ' + N(b).uni + ')', '\\text{(untersucht für } ' + N(a).tex + ' \\le x \\le ' + N(b).tex + '\\text{)}'));
      sec('Definitionsbereich', dl);

      // Symmetrie
      const tests = [0.31, 0.77, 1.13, 1.91, 2.57, 3.29, 4.7];
      let axis = true, origin = true, cnt = 0;
      tests.forEach(x => {
        const p = f(x), q = f(-x);
        if (!isFinite(p) || !isFinite(q)) { if (isFinite(p) !== isFinite(q)) axis = origin = false; return; }
        cnt++;
        const tol = 1e-9 * Math.max(1, Math.abs(p));
        if (Math.abs(p - q) > tol) axis = false;
        if (Math.abs(p + q) > tol) origin = false;
      });
      if (!cnt) axis = origin = false;
      sec('Symmetrie', [axis && !origin ? line('G<sub>' + esc(name) + '</sub> ist achsensymmetrisch zur y-Achse, denn ' + esc(name) + '(−x) = ' + esc(name) + '(x).', 'G_{' + L + '} \\text{ ist achsensymmetrisch zur } y\\text{-Achse: } ' + L + '(-x) = ' + L + '(x)')
        : origin && !axis ? line('G<sub>' + esc(name) + '</sub> ist punktsymmetrisch zum Ursprung, denn ' + esc(name) + '(−x) = −' + esc(name) + '(x).', 'G_{' + L + '} \\text{ ist punktsymmetrisch zum Ursprung: } ' + L + '(-x) = -' + L + '(x)')
          : line('Keine Symmetrie zur y-Achse oder zum Ursprung.', '\\text{Keine Symmetrie zur } y\\text{-Achse oder zum Ursprung}')]);

      // Kennpunkte
      const pts = this._analyze(fn, [a, b]);
      const by = (t) => pts.filter(p => p.type === t).sort((p, q) => p.x - q.x);
      const roots = by('N');
      // Nullstellen am Rand des Definitionsbereichs (z. B. √x bei x = 0)
      finite.flat().forEach(u => {
        const y = f(u), r = Math.abs(u) < 1e-9 ? 0 : u;
        if (u > a && u < b && isFinite(y) && Math.abs(y) < 1e-7 && !roots.some(p => Math.abs(p.x - r) < 1e-6)) roots.push({ type: 'N', x: r, y: 0 });
      });
      roots.sort((p, q) => p.x - q.x);
      sec('Nullstellen', [roots.length ? join(roots.map((p, i) => pt('N', roots.length > 1 ? i + 1 : '', p.x, 0)))
        : line('Keine Nullstellen.', '\\text{Keine Nullstellen}')]);
      const y0 = f(0);
      if (isFinite(y0) && a <= 0 && b >= 0) sec('Schnittpunkt mit der y-Achse', [pt('S', 'y', 0, y0)]);

      if (o.derivs && fn.ast) {
        let base = fn.ast;
        if (this.deg && !fn.rad) base = MP.radianize(base);
        const a1 = MP.derivative(base), a2 = a1 && MP.derivative(a1);
        const dlines = [];
        if (a1) dlines.push(line(esc(name) + '′(x) = ' + esc(MP.toNice(a1)), L + "'(x) = " + MP.toTeX(a1)));
        if (a2) dlines.push(line(esc(name) + '″(x) = ' + esc(MP.toNice(a2)), L + "''(x) = " + MP.toTeX(a2)));
        sec('Ableitungen', dlines);
      }

      const max = by('Max'), min = by('Min'), w = by('W');
      const ex = [];
      max.forEach((p, i) => ex.push(pt('H', max.length > 1 ? i + 1 : '', p.x, p.y)));
      min.forEach((p, i) => ex.push(pt('T', min.length > 1 ? i + 1 : '', p.x, p.y)));
      sec('Extrempunkte', [ex.length ? join(ex) : line('Keine Extrempunkte.', '\\text{Keine Extrempunkte}')]);
      const wl = w.map((p, i) => {
        const t = pt('W', w.length > 1 ? i + 1 : '', p.x, p.y);
        if (Math.abs(d1(p.x)) < 1e-7 * Math.max(1, Math.abs(p.y))) { t.uni += ' (Terrassenpunkt)'; t.tex += '\\ \\text{(Terrassenpunkt)}'; }
        return t;
      });
      sec('Wendepunkte', [wl.length ? join(wl) : line('Keine Wendepunkte.', '\\text{Keine Wendepunkte}')]);

      // Monotonie und Krümmung: Vorzeichen von f′ bzw. f″ zwischen kritischen Stellen
      const intervals = (g, crit, plusText, minusText) => {
        const cuts = [...new Set([a, ...crit.filter(x => x > a && x < b), ...poles, ...finite.flatMap(iv => iv), b])].sort((p, q) => p - q);
        const runs = [];
        for (let i = 0; i < cuts.length - 1; i++) {
          const u = cuts[i], v = cuts[i + 1];
          if (v - u < 1e-9) continue;
          let sp = 0, sm = 0;
          for (let k = 1; k < 8; k++) {
            const x = u + (v - u) * k / 8, gv = g(x);
            if (!isFinite(gv) || !isFinite(f(x))) continue;
            if (gv > 1e-12) sp++; else if (gv < -1e-12) sm++;
          }
          if (!sp && !sm) continue;
          const sgn = sp >= sm ? 1 : -1;
          const last = runs[runs.length - 1];
          // zusammenfassen, wenn dazwischen keine Lücke liegt (z. B. Terrassenpunkt)
          if (last && last.s === sgn && Math.abs(last.v - u) < 1e-9 && defined(u) && !poles.some(p => Math.abs(p - u) < 1e-6)) last.v = v;
          else runs.push({ u, v, s: sgn });
        }
        const out = [];
        [1, -1].forEach(s => {
          const r = runs.filter(q => q.s === s);
          if (!r.length) return;
          const ivs = r.map(q => ivText(q.u, q.v));
          const word = s > 0 ? plusText : minusText;
          out.push(line(esc(word) + ' für x ∈ ' + ivs.map(i => i.uni).join(' und '), '\\text{' + word + ' für } x \\in ' + ivs.map(i => i.tex).join('\\text{ und }')));
        });
        return out;
      };
      const crit1 = [...max, ...min, ...w.filter(p => Math.abs(d1(p.x)) < 1e-7 * Math.max(1, Math.abs(p.y)))].map(p => p.x);
      if (o.mono) sec('Monotonie', intervals(d1, crit1, 'G' + name + ' ist streng monoton steigend', 'G' + name + ' ist streng monoton fallend')
        .map(l => ({ uni: l.uni.replace('G' + name, 'G<sub>' + esc(name) + '</sub>'), tex: l.tex.replace('\\text{G' + name, 'G_{' + L + '}\\text{') })));
      if (o.curv) sec('Krümmung', intervals(d2, w.map(p => p.x), 'G' + name + ' ist linksgekrümmt', 'G' + name + ' ist rechtsgekrümmt')
        .map(l => ({ uni: l.uni.replace('G' + name, 'G<sub>' + esc(name) + '</sub>'), tex: l.tex.replace('\\text{G' + name, 'G_{' + L + '}\\text{') })));

      // Grenzverhalten und Asymptoten
      if (o.limits) {
        const ll = [];
        const lim = (side) => {
          const v1 = f(side * 1e3), v2 = f(side * 1e5), v3 = f(side * 1e7);
          if (!isFinite(v2) && !isFinite(v3)) return null;
          if (isFinite(v2) && isFinite(v3) && Math.abs(v2 - v3) < 1e-3 * Math.max(1, Math.abs(v3))) {
            const r = Math.abs(v3) < 1e-6 ? 0 : v3;
            return { v: r, ...N(Math.round(r * 1e4) / 1e4) };
          }
          if (Math.abs(v3) > Math.abs(v2) && Math.abs(v2) > Math.abs(v1) && Math.sign(v2) === Math.sign(v3) && Math.abs(v3) > 1e3) {
            return v3 > 0 ? { v: Infinity, uni: '+∞', tex: '+\\infty' } : { v: -Infinity, uni: '−∞', tex: '-\\infty' };
          }
          return { v: NaN, uni: 'existiert nicht', tex: '\\text{existiert nicht}' };
        };
        [[-1, !(bd && isFinite(bd.lo))], [1, !(bd && isFinite(bd.hi))]].forEach(([side, ok]) => {
          if (!ok) return;
          const r = lim(side);
          if (!r) return;
          const arrow = side < 0 ? '−∞' : '+∞', at = side < 0 ? '-\\infty' : '+\\infty';
          ll.push(line(esc(name) + '(x) → ' + r.uni + ' für x → ' + arrow, '\\lim\\limits_{x \\to ' + at + '} ' + L + '(x) = ' + r.tex));
        });
        const asy = [];
        poles.forEach(p => { const X = N(snapNum(p)); asy.push(line('x = ' + X.uni + ' (senkrecht)', 'x = ' + X.tex + '\\ \\text{(senkrecht)}')); });
        const seen = new Set();
        [1, -1].forEach(side => {
          if (bd && (side > 0 ? isFinite(bd.hi) : isFinite(bd.lo))) return;
          const s = Numerics.obliqueAsymptote(f, side);
          if (!s) return;
          const key = s.m + '|' + s.b;
          if (seen.has(key)) return;
          seen.add(key);
          const M = N(s.m), B = N(Math.abs(s.b));
          const mU = s.m === 1 ? '' : s.m === -1 ? '−' : M.uni, mT = s.m === 1 ? '' : s.m === -1 ? '-' : M.tex;
          if (s.m === 0) asy.push(line('y = ' + N(s.b).uni + ' (waagrecht)', 'y = ' + N(s.b).tex + '\\ \\text{(waagrecht)}'));
          else asy.push(line('y = ' + mU + 'x' + (s.b ? (s.b > 0 ? ' + ' : ' − ') + B.uni : '') + ' (schief)', 'y = ' + mT + 'x' + (s.b ? (s.b > 0 ? ' + ' : ' - ') + B.tex : '') + '\\ \\text{(schief)}'));
        });
        sec('Grenzverhalten', ll);
        sec('Asymptoten', asy);
      }
      if (note.rounded) sections.push({ title: null, lines: [line('<i>Nicht exakte Werte sind auf zwei Dezimalen gerundet.</i>', '\\textit{Nicht exakte Werte sind auf zwei Dezimalen gerundet.}')], note: true });
      return sections;
    },

    _domainUni(d) {
      const n = (s) => { try { return MP.toNice(MP.parse(s)); } catch (e) { return s; } };
      if (d.min !== null && d.max !== null) return (d.minOpen ? ']' : '[') + n(d.min) + '; ' + n(d.max) + (d.maxOpen ? '[' : ']');
      if (d.min !== null) return (d.minOpen ? ']' : '[') + n(d.min) + '; +∞[';
      return ']−∞; ' + n(d.max) + (d.maxOpen ? '[' : ']');
    },

    _discFn() { return this.fns.find(f => f.id === this.disc.fnId); },

    renderDiscussion() {
      const fn = this._discFn(), out = this.els.discOut;
      out.innerHTML = '';
      if (!fn || !fn.f) { out.textContent = 'Funktion nicht verfügbar.'; return; }
      this._discSections = this._discussion(fn);
      this._discSections.forEach(s => {
        const sec = document.createElement('div'); sec.className = 'disc-sec';
        if (s.title) { const h = document.createElement('h4'); h.textContent = s.title; sec.appendChild(h); }
        s.lines.forEach(l => {
          const p = document.createElement('div'); p.className = 'disc-line';
          if (s.note) p.innerHTML = l.uni; else this._renderTeX(p, l.tex, l.uni.replace(/<[^>]+>/g, ''));
          sec.appendChild(p);
        });
        out.appendChild(sec);
      });
    },

    // HTML für Word und den Druckbogen (Text mit Unicode, keine Formelobjekte)
    _discHTML(forPrint) {
      const fn = this._discFn();
      if (!fn || !this._discSections) return '';
      const font = forPrint ? '' : 'font-family:Calibri,Arial,sans-serif;font-size:11pt;';
      let h = '<div class="disc-text" style="' + font + '">';
      this._discSections.forEach(s => {
        if (s.title) h += '<p style="margin:6pt 0 2pt"><b>' + esc(s.title) + '</b></p>';
        s.lines.forEach(l => { h += '<p style="margin:0 0 2pt ' + (s.title ? '12pt' : '0') + '">' + l.uni + '</p>'; });
      });
      return h + '</div>';
    },

    copyDiscussionWord() {
      const html = this._discHTML(false);
      if (!html) return;
      const text = this._discSections.map(s => (s.title ? s.title + '\n' : '') + s.lines.map(l => '  ' + l.uni.replace(/<sub>(.*?)<\/sub>/g, '$1').replace(/<[^>]+>/g, '')).join('\n')).join('\n');
      if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        })]).then(() => this._toast('Kurvendiskussion kopiert – in Word mit Strg+V einfügen'))
          .catch(() => this._copy(text, 'Kurvendiskussion als Text kopiert'));
      } else this._copy(text, 'Kurvendiskussion als Text kopiert');
    },

    discussionLatex() {
      const fn = this._discFn();
      if (!fn || !this._discSections) return '';
      const out = ['% Plotoria ' + this.VERSION + ' – Kurvendiskussion von ' + fn.letter + ' (benötigt amsmath, amssymb)'];
      this._discSections.forEach(s => {
        if (!s.title) { s.lines.forEach(l => out.push(s.note ? l.tex + '\n' : '\\[ ' + l.tex + ' \\]')); return; }
        out.push('\\paragraph{' + s.title + '}');
        out.push('\\begin{itemize}');
        s.lines.forEach(l => out.push('  \\item $' + l.tex + '$'));
        out.push('\\end{itemize}');
      });
      return out.join('\n');
    },

    copyDiscussionLatex() { this._copy(this.discussionLatex(), 'LaTeX-Code kopiert'); },

    discussionToPrint() {
      const fn = this._discFn();
      const html = this._discHTML(true);
      if (!html || !this.addPrintItem) return;
      const lines = this._discSections.reduce((n, s) => n + s.lines.length + (s.title ? 1 : 0), 0);
      this.addPrintItem({ kind: 'text', html, lines, caption: 'Kurvendiskussion von ' + fn.letter });
    },
  });
})();
