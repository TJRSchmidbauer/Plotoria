// Plotoria 3.1 – Aufgabenbibliothek (Daten in library.js) und eigene Vorlagen
(() => {
  const P = window.Plotoria;
  const $ = id => document.getElementById(id);

  const { TEMPLATES, GRADES } = PlotoriaLibrary;

  const TEMPLATE_KEY = 'plotoria-templates-v1';

  Object.assign(P, {
    TEMPLATES, TEMPLATE_KEY,
    ownTemplates: [],

    initTemplates() {
      $('templates-btn').addEventListener('click', () => this.openTemplates());
      $('tpl-save').addEventListener('click', () => this.saveOwnTemplate());
      $('tpl-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.saveOwnTemplate(); } });
      $('tpl-export').addEventListener('click', () => this.exportOwnTemplates());
      $('tpl-import').addEventListener('click', () => $('tpl-file').click());
      $('tpl-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) this.importOwnTemplates(f); e.target.value = ''; });
    },

    // ── Eigene Vorlagen: im Browser nur mit Zustimmung, sonst bis zum Schließen ──
    _readOwnTemplates() {
      try {
        const s = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || 'null');
        if (Array.isArray(s)) this.ownTemplates = s.concat(this.ownTemplates.filter(t => !s.some(o => o.id === t.id)));
      } catch (e) { /* leer */ }
      this._saveOwnTemplates();
    },

    _saveOwnTemplates() {
      if (!this.storageOK) return;
      try { localStorage.setItem(TEMPLATE_KEY, JSON.stringify(this.ownTemplates)); }
      catch (e) { this._toast('Speicher voll – Vorlagen bitte als Datei sichern'); }
    },

    saveOwnTemplate() {
      const inp = $('tpl-name');
      const title = inp.value.trim() || this.graphTitle || 'Eigene Vorlage ' + (this.ownTemplates.length + 1);
      if (this.currentDocEmpty ? this.currentDocEmpty() : !this.fns.length) { this._toast('Noch nichts gezeichnet'); return; }
      const st = this.serialize();
      delete st.print;
      // kleine Vorschau
      const r = this.renderExport(this.exp, { format: 'svg', sizeMode: 'fixed', w: 8, h: 5, labels: false, smart: false, title: false, mark: false, white: true, empty: false, range: 'view' });
      const thumb = r.error ? '' : r.svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/<title>.*?<\/title>/, '');
      const fnText = this.fns.filter(f => f.def).map(f => f.def).slice(0, 2).join('; ');
      this.ownTemplates.unshift({ id: Date.now().toString(36), title, text: fnText, state: st, thumb, created: new Date().toISOString().slice(0, 10) });
      inp.value = '';
      this._saveOwnTemplates();
      this._renderOwnTemplates();
      this._toast('Vorlage „' + title + '“ gesichert' + (this.storageOK ? '' : ' – ohne Speicher-Zustimmung nur bis zum Schließen'));
    },

    applyOwnTemplate(t) {
      const tab = this._openTemplateState(JSON.parse(JSON.stringify(t.state)));
      this.commit();
      if (this.renderTabs) this.renderTabs();
      $('templates-sheet').close();
      this._toast('Vorlage „' + t.title + '“ ' + (tab ? 'in neuem Tab geöffnet' : 'geladen – Strg+Z macht das rückgängig'));
    },

    removeOwnTemplate(id) {
      this.ownTemplates = this.ownTemplates.filter(t => t.id !== id);
      this._saveOwnTemplates();
      this._renderOwnTemplates();
    },

    _renderOwnTemplates() {
      const grid = $('own-template-grid');
      grid.innerHTML = '';
      $('tpl-storage-hint').textContent = this.storageOK
        ? 'Eigene Vorlagen werden in diesem Browser gespeichert. Mit „Als Datei sichern“ lassen sie sich weitergeben oder auf einem anderen Gerät öffnen.'
        : 'Speichern ist abgelehnt: Eigene Vorlagen bleiben nur bis zum Schließen erhalten – bitte „Als Datei sichern“.';
      $('tpl-export').disabled = !this.ownTemplates.length;
      $('own-count').textContent = this.ownTemplates.length ? String(this.ownTemplates.length) : 'sichern & weitergeben';
      if (this.ownTemplates.length && !this._ownOpened) { $('own-templates').open = true; this._ownOpened = true; }
      this.ownTemplates.forEach((t) => {
        const c = document.createElement('div');
        c.className = 'template-card own'; c.tabIndex = 0; c.setAttribute('role', 'button');
        // Vorschau als Bild: SVG in <img> führt keine Skripte aus (auch nicht aus fremden Vorlagendateien)
        const thumb = t.thumb ? '<img alt="" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(t.thumb) + '">' : '<div class="thumb-empty"></div>';
        c.innerHTML = thumb + '<strong>' + P.esc(t.title) + '</strong><span>' + P.esc(t.text || '') + '</span>';
        const del = document.createElement('button'); del.className = 'icon-btn'; del.title = 'Vorlage löschen'; del.innerHTML = Icons.svg('trash');
        del.addEventListener('click', (e) => { e.stopPropagation(); this.removeOwnTemplate(t.id); });
        c.appendChild(del);
        c.addEventListener('click', () => this.applyOwnTemplate(t));
        c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.applyOwnTemplate(t); } });
        grid.appendChild(c);
      });
    },

    exportOwnTemplates() {
      if (!this.ownTemplates.length) return;
      const data = { app: 'plotoria', kind: 'templates', version: this.VERSION, templates: this.ownTemplates };
      this._download(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'plotoria-vorlagen.json');
    },

    importOwnTemplates(file) {
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const d = JSON.parse(rd.result);
          const list = d && d.kind === 'templates' && Array.isArray(d.templates) ? d.templates : null;
          if (!list) throw new Error();
          let n = 0;
          list.forEach(t => {
            if (!t || !t.state || !Array.isArray(t.state.fns) || this.ownTemplates.some(o => o.id === t.id)) return;
            this.ownTemplates.push({ id: String(t.id || Date.now().toString(36) + n), title: String(t.title || 'Vorlage'), text: String(t.text || ''), state: t.state, thumb: typeof t.thumb === 'string' ? t.thumb : '', created: t.created || '' });
            n++;
          });
          this._saveOwnTemplates();
          this._renderOwnTemplates();
          this._toast(n + ' Vorlage(n) geladen');
        } catch (e) { this._toast('Keine Plotoria-Vorlagendatei'); }
      };
      rd.readAsText(file);
    },

    openTemplates() {
      this._renderOwnTemplates();
      $('tpl-newtab').checked = !this.currentDocEmpty();
      if (!this._libInit) {
        this._libInit = true;
        this._libGrade = null;
        const chips = $('lib-grades');
        [{ id: null, label: 'Alle' }].concat(GRADES).forEach(g => {
          const b = document.createElement('button');
          b.dataset.value = g.id === null ? 'all' : String(g.id);
          b.textContent = g.id > 0 ? g.label : g.label;
          b.title = g.id > 0 ? 'Jahrgangsstufe ' + g.label : g.id === 0 ? 'Für alle Jahrgangsstufen' : 'Alle Vorlagen';
          chips.appendChild(b);
        });
        this.setSegmented(chips, 'all');
        this.segmented(chips, (v) => { this._libGrade = v === 'all' ? null : +v; this._renderLibrary(); });
        $('lib-search').addEventListener('input', () => { clearTimeout(this._libT); this._libT = setTimeout(() => this._renderLibrary(), 80); });
        $('lib-search').addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { const c = $('template-grid').querySelector('.template-card'); if (c) { e.preventDefault(); c.click(); } }
        });
      }
      this._renderLibrary();
      this.openSheet('templates-sheet');
      if (window.matchMedia && !window.matchMedia('(pointer: coarse)').matches) setTimeout(() => $('lib-search').focus(), 50);
    },

    // Bibliothek nach Jahrgangsstufe und Thema gruppiert, gefiltert nach Suche und Stufe
    _renderLibrary() {
      const host = $('template-grid');
      host.innerHTML = '';
      const q = $('lib-search').value;
      const list = TEMPLATES.map((t, i) => ({ t, i })).filter(({ t }) => PlotoriaLibrary.matches(t, q, this._libGrade));
      $('lib-empty').hidden = list.length > 0;
      $('lib-count').textContent = list.length === TEMPLATES.length ? TEMPLATES.length + ' Vorlagen' : list.length + ' von ' + TEMPLATES.length;
      GRADES.forEach(g => {
        const inGrade = list.filter(({ t }) => t.grade === g.id);
        if (!inGrade.length) return;
        const sec = document.createElement('section'); sec.className = 'lib-grade';
        const h = document.createElement('h3'); h.className = 'lib-grade-title';
        h.innerHTML = g.id > 0 ? '<span class="grade-badge">' + g.label + '</span>Jahrgangsstufe ' + g.label : '<span class="grade-badge all">∗</span>Allgemein';
        sec.appendChild(h);
        const topics = [...new Set(inGrade.map(({ t }) => t.topic))];
        topics.forEach(topic => {
          const th = document.createElement('h4'); th.className = 'lib-topic'; th.textContent = topic;
          const grid = document.createElement('div'); grid.className = 'template-grid';
          inGrade.filter(({ t }) => t.topic === topic).forEach(({ t, i }) => {
            const b = document.createElement('button');
            b.className = 'template-card';
            const tags = (t.fns || []).some(f => f.sol) ? '<em class="tpl-tag">mit Lösung</em>' : '';
            b.innerHTML = this._templateThumb(t) + '<strong>' + P.esc(t.title) + '</strong><span>' + P.esc(t.text) + '</span>' + tags;
            b.addEventListener('click', () => this.applyTemplate(i));
            grid.appendChild(b);
          });
          sec.append(th, grid);
        });
        host.appendChild(sec);
      });
    },

    // Vorlage laden: in neuem Tab (Schalter) oder im aktuellen
    _openTemplateState(st) {
      if ($('tpl-newtab').checked && this.newDoc && !this.currentDocEmpty()) { this.newDoc(st); return true; }
      this.load(st);
      return false;
    },

    _templateState(t) {
      const cols = this._theme().colors;
      return {
        v: 2, title: t.title, deg: !!t.deg, theme: this.theme, smart: !!t.smart, prop: t.prop !== false,
        style: { ...this._theme().style, fontSize: this.style.fontSize, xLabel: 'x', yLabel: 'y', xStep: '', yStep: '', xFmt: 'dec', yFmt: 'dec', sub: 'auto', gridMode: 'grid', karo: 2, bw: false, exact: false, ...(t.style || {}) },
        view: t.view, home: t.view,
        params: t.params || {},
        fns: t.fns.map((f, i) => ({ l: f.d ? null : undefined, c: f.i !== undefined || f.a ? cols[(f.i ?? f.a[0]) % cols.length] : cols[i % cols.length], w: 3, ...f })),
        objs: (t.objs || []).map(o => ({ ...o })),
        data: (t.data || []).map(d => ({ ...d, pts: d.pts.map(p => p.slice()) })),
        dists: (t.dists || []).map((d, i) => ({ col: cols[i % cols.length], ...d })),
      };
    },

    applyTemplate(i) {
      const t = TEMPLATES[i];
      const st = this._templateState(t);
      // Buchstaben der Funktionen aus der Definition übernehmen
      st.fns.forEach(f => {
        if (f.s) { const d = MathParser.parseDefinition(f.s); f.l = d.letter || 'f'; }
      });
      st.fns.forEach(f => {
        if (f.d) f.l = st.fns[f.d[0]].l + "'".repeat(f.d[1]);
        if (f.i !== undefined) f.l = st.fns[f.i].l + '⁻¹';
        if (f.a) f.l = st.fns[f.a[0]].l.replace(/_[a-z]$/, '').toUpperCase();
      });
      if (!st.view) {   // Verteilungen: Fenster wird passend gewählt
        st.view = [-1, 1, -1, 1]; st.home = st.view; st.prop = false;
      }
      const tab = this._openTemplateState(st);
      if (!t.view && this.dists.length) this.fitDist(this.dists[this.dists.length - 1], true);
      else if (t.view && st.prop) this._fitTemplateView(t.view);
      if (t.after) t.after(this);
      if (this.toggleReveal) this.toggleReveal(false); else this.repaint();
      this.commit();
      if (this.renderTabs) this.renderTabs();
      $('templates-sheet').close();
      const sol = t.fns.some(f => f.sol) ? ' – Lösung mit „Lösung zeigen“ (L) einblenden' : ' – Strg+Z macht das rückgängig';
      this._toast('„' + t.title + '“ ' + (tab ? 'in neuem Tab geöffnet' : 'geladen') + sol);
    },

    // Gleiche Einheiten: ganzen y-Bereich der Vorlage zeigen und dafür den x-Bereich verbreitern
    _fitTemplateView(v) {
      const pw = this.W - this.pad.l - this.pad.r, ph = this.H - this.pad.t - this.pad.b;
      if (!(pw > 0 && ph > 0)) return;
      let [x0, x1] = v;
      const [, , y0, y1] = v;
      const need = (y1 - y0) * pw / ph;
      if (need <= x1 - x0) return;
      const m = (x0 + x1) / 2;
      x0 = m - need / 2; x1 = m + need / 2;
      this.setView({ xMin: x0, xMax: x1, yMin: y0, yMax: y1 }, { home: true });
    },

    // Kleine Vorschau als SVG (160 × 100); als Lösung verborgene Graphen werden nicht gezeigt
    _templateThumb(t) {
      const W = 160, H = 100;
      const cols = this.themes.standard.colors;
      let [x0, x1, y0, y1] = t.view || [-1, 1, 0, 1];
      // Verteilungen: Bereich aus μ und σ
      const dists = (t.dists || []).map(d => {
        const mu = d.type === 'binom' ? d.n * d.p : d.mu, sg = d.type === 'binom' ? Math.sqrt(d.n * d.p * (1 - d.p)) : d.sigma;
        return { ...d, mu, sg, pmf: d.type === 'binom' ? Numerics.binomPmf(d.n, d.p) : null };
      });
      if (!t.view && dists.length) {
        x0 = Math.min(...dists.map(d => d.mu - 4 * d.sg)); x1 = Math.max(...dists.map(d => d.mu + 4 * d.sg));
        y1 = Math.max(...dists.map(d => d.pmf ? Math.max(...d.pmf) : Numerics.normPdf(d.mu, d.mu, d.sg))) * 1.25; y0 = -y1 * 0.06;
      }
      const sx = (x) => (x - x0) / (x1 - x0) * W, sy = (y) => H - (y - y0) / (y1 - y0) * H;
      const r1 = (v) => Math.round(v * 10) / 10;
      let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
      if (t.style && t.style.gridMode === 'karo') {
        for (let i = 0; i <= W; i += 8) s += `<line x1="${i}" y1="0" x2="${i}" y2="${H}" stroke="#C9D8E8" stroke-width="0.6"/>`;
        for (let i = 0; i <= H; i += 8) s += `<line x1="0" y1="${i}" x2="${W}" y2="${i}" stroke="#C9D8E8" stroke-width="0.6"/>`;
      }
      const ax = Math.min(W, Math.max(0, sx(0))), ay = Math.min(H, Math.max(0, sy(0)));
      s += `<line x1="0" y1="${r1(ay)}" x2="${W}" y2="${r1(ay)}" stroke="#1C1C1E" stroke-width="1"/><line x1="${r1(ax)}" y1="0" x2="${r1(ax)}" y2="${H}" stroke="#1C1C1E" stroke-width="1"/>`;
      dists.forEach((d, i) => {
        const col = cols[i % cols.length];
        const on = (k) => (d.a != null || d.b != null) && (d.a == null || k >= d.a) && (d.b == null || k <= d.b);
        if (d.pmf) {
          const w = sx(1) - sx(0);
          d.pmf.forEach((p, k) => {
            if (k < x0 - 1 || k > x1 + 1) return;
            s += `<rect x="${r1(sx(k - 0.5))}" y="${r1(sy(p))}" width="${r1(w)}" height="${r1(sy(0) - sy(p))}" fill="${col}" fill-opacity="${on(k) ? 0.75 : 0.22}"/>`;
          });
        } else {
          let path = '';
          for (let k = 0; k <= 80; k++) { const x = x0 + (x1 - x0) * k / 80; path += (k ? 'L' : 'M') + r1(sx(x)) + ',' + r1(sy(Numerics.normPdf(x, d.mu, d.sg))); }
          if (d.a != null || d.b != null) {
            const a = Math.max(x0, d.a == null ? -Infinity : d.a), b = Math.min(x1, d.b == null ? Infinity : d.b);
            let area = `M${r1(sx(a))},${r1(sy(0))}`;
            for (let k = 0; k <= 40; k++) { const x = a + (b - a) * k / 40; area += 'L' + r1(sx(x)) + ',' + r1(sy(Numerics.normPdf(x, d.mu, d.sg))); }
            s += `<path d="${area}L${r1(sx(b))},${r1(sy(0))}Z" fill="${col}" fill-opacity="0.3"/>`;
          }
          s += `<path d="${path}" fill="none" stroke="${col}" stroke-width="2"/>`;
        }
      });
      // Funktionen (auch Ableitungen und Spiegelungen), ohne verborgene Lösungen
      const P0 = {};
      Object.entries(t.params || {}).forEach(([k, p]) => { P0[k] = p.v; });
      const asts = [];
      const draw = (g, col, dash, swap) => {
        let path = '', pen = false;
        const lo = swap ? y0 : x0, hi = swap ? y1 : x1;
        for (let k = 0; k <= 160; k++) {
          const u = lo + (hi - lo) * k / 160, v = g(u);
          const x = swap ? v : u, y = swap ? u : v;
          if (!isFinite(v) || y < y0 - (y1 - y0) || y > y1 + (y1 - y0)) { pen = false; continue; }
          path += (pen ? 'L' : 'M') + r1(sx(x)) + ',' + r1(sy(y));
          pen = true;
        }
        s += `<path d="${path}" fill="none" stroke="${col}" stroke-width="2"${dash ? ' stroke-dasharray="4,3"' : ''}/>`;
      };
      t.fns.forEach((f, i) => {
        try {
          if (f.s) {
            const d = MathParser.parseDefinition(f.s);
            const ast = MathParser.parseFunction(d, { variable: d.variable });
            asts[i] = { ast, d };
            if (f.sol || f.h) return;
            const vals = d.family ? d.family.vals : [null];
            vals.forEach(v => {
              const P1 = { ...P0 };
              if (d.family) P1[d.family.p] = v;
              const g0 = MathParser.compile(ast, P1, { deg: !!t.deg });
              const lo = d.domain && d.domain.min !== null ? MathParser.evalConst(d.domain.min) : -Infinity;
              const hi = d.domain && d.domain.max !== null ? MathParser.evalConst(d.domain.max) : Infinity;
              draw((x) => (x < lo || x > hi ? NaN : g0(x)), cols[i % cols.length], !!f.ds);
            });
          } else if (!f.sol && !f.h && f.d && asts[f.d[0]]) {
            let a = asts[f.d[0]].ast;
            for (let k = 0; k < f.d[1] && a; k++) a = MathParser.derivative(a);
            if (a) draw(MathParser.compile(a, P0, { deg: !!t.deg }), cols[i % cols.length], !!f.ds);
          } else if (!f.sol && !f.h && f.i !== undefined && asts[f.i]) {
            const { ast, d } = asts[f.i];
            const g0 = MathParser.compile(ast, P0, { deg: !!t.deg });
            const lo = d.domain && d.domain.min !== null ? MathParser.evalConst(d.domain.min) : -Infinity;
            // Spiegelbild an y = x: Punkte (f(u) | u)
            const N = 400, a0 = Math.max(lo, Math.min(x0, y0) - (x1 - x0)), a1 = Math.max(x1, y1) + (x1 - x0);
            let path = '', pen = false;
            for (let k = 0; k <= N; k++) {
              const u = a0 + (a1 - a0) * k / N, X = g0(u), Y = u;
              if (!isFinite(X) || X < x0 - 1 || X > x1 + 1 || Y < y0 - 1 || Y > y1 + 1) { pen = false; continue; }
              path += (pen ? 'L' : 'M') + r1(sx(X)) + ',' + r1(sy(Y)); pen = true;
            }
            s += `<path d="${path}" fill="none" stroke="${cols[f.i % cols.length]}" stroke-width="2" stroke-dasharray="4,3"/>`;
          }
        } catch (e) { /* Vorschau überspringen */ }
      });
      (t.data || []).forEach(ds => ds.pts.forEach(([x, y]) => { s += `<circle cx="${r1(sx(x))}" cy="${r1(sy(y))}" r="2" fill="${ds.col}"/>`; }));
      (t.objs || []).filter(o => o.type === 'point').forEach(o => { s += `<circle cx="${r1(sx(+o.x))}" cy="${r1(sy(+o.y))}" r="2.5" fill="#FF3B30"/>`; });
      return s + '</svg>';
    },
  });
})();
