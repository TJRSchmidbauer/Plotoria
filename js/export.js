// Plotoria 2.0 – Export (maßstabsgetreu), Druckbogen DIN A4, Projektdateien
(() => {
  const P = window.Plotoria;
  const { esc, fmtDE, CM } = P;
  const $ = id => document.getElementById(id);
  const PRINT_KEY = 'plotoria-print-v1';
  const MAX_CM = 60;
  const fmtCm = (v) => fmtDE(v, 1);

  Object.assign(P, {
    initExport() {
      this.exp = { format: 'png', sizeMode: 'scale', ux: 1, uy: 1, w: 12, h: 8, range: 'view', dpi: 300, title: false, labels: true, smart: false, bw: false, white: true, mark: false };
      this.printItems = [];
      this.printOpts = { header: true, heading: '', numbers: true };
      try { const s = JSON.parse(localStorage.getItem(PRINT_KEY) || 'null'); if (s) { this.printItems = s.items || []; Object.assign(this.printOpts, s.opts || {}); } } catch (e) { /* leer */ }

      const E = this.els;
      Object.assign(E, {
        expSheet: $('export-sheet'), expPreview: $('exp-preview'), expSize: $('exp-size'), expFormat: $('exp-format'), expSizeMode: $('exp-size-mode'),
        expUx: $('exp-ux'), expUy: $('exp-uy'), expW: $('exp-w'), expH: $('exp-h'), expRange: $('exp-range'), expDpi: $('exp-dpi'),
        expTitle: $('exp-title'), expLabels: $('exp-labels'), expSmart: $('exp-smart'), expBw: $('exp-bw'), expWhite: $('exp-white'), expMark: $('exp-mark'),
        printSheet: $('print-sheet'), printItems: $('print-items'), printPreview: $('print-preview'), printEmpty: $('print-empty'), printCount: $('print-count'),
        prHeader: $('pr-header'), prHeading: $('pr-heading'), prNumbers: $('pr-numbers'),
        tza: $('tikz-area'), fileInput: $('file-input'),
      });

      $('export-open').addEventListener('click', () => this.openExport());
      $('exp-go').addEventListener('click', () => this.doExport());
      $('exp-copy').addEventListener('click', () => this.copyExport());
      $('exp-to-print').addEventListener('click', () => this.exportToPrint());
      $('print-open').addEventListener('click', () => { E.expSheet.close(); this.openPrint(); });
      $('print-go').addEventListener('click', () => this.printNow());
      $('print-clear').addEventListener('click', () => { this.printItems = []; this._savePrint(); this.renderPrint(); });
      $('tikz-import').addEventListener('click', () => this.importTikZ());
      $('open-btn').addEventListener('click', () => this.openProject());
      $('save-btn').addEventListener('click', () => this.saveProject());
      E.fileInput.addEventListener('change', () => { const f = E.fileInput.files[0]; if (f) this._readProjectFile(f); E.fileInput.value = ''; });

      this.segmented(E.expFormat, (v) => { this.exp.format = v; this._expUI(); });
      this.segmented(E.expSizeMode, (v) => { this.exp.sizeMode = v; this._expUI(); });
      const bind = (el, key, parse) => el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
        this.exp[key] = el.type === 'checkbox' ? el.checked : parse(el.value);
        this._expUI();
      });
      bind(E.expUx, 'ux', v => Math.max(0.05, +v || 1));
      bind(E.expUy, 'uy', v => Math.max(0.05, +v || 1));
      bind(E.expW, 'w', v => Math.max(2, +v || 12));
      bind(E.expH, 'h', v => Math.max(2, +v || 8));
      bind(E.expRange, 'range', v => v);
      bind(E.expDpi, 'dpi', v => +v);
      ['Title', 'Labels', 'Smart', 'Bw', 'White', 'Mark'].forEach(k => bind(E['exp' + k], k.toLowerCase(), v => v));

      const optBind = (el, key) => el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
        this.printOpts[key] = el.type === 'checkbox' ? el.checked : el.value; this._savePrint(); this.renderPrintPreview();
      });
      optBind(E.prHeader, 'header'); optBind(E.prHeading, 'heading'); optBind(E.prNumbers, 'numbers');
      this._updatePrintCount();

      // Projektdatei per Drag & Drop öffnen
      let overlay = null;
      window.addEventListener('dragover', (e) => {
        if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        if (!overlay) { overlay = document.createElement('div'); overlay.className = 'drop-overlay'; overlay.textContent = 'Plotoria-Projekt hier ablegen'; document.body.appendChild(overlay); }
      });
      const hide = () => { if (overlay) { overlay.remove(); overlay = null; } };
      window.addEventListener('dragleave', (e) => { if (!e.relatedTarget) hide(); });
      window.addEventListener('drop', (e) => {
        hide();
        const f = e.dataTransfer && e.dataTransfer.files[0];
        if (!f) return;
        e.preventDefault();
        this._readProjectFile(f);
      });
    },

    // ══════════════════ Export-Dialog ══════════════════

    openExport() {
      const E = this.els, x = this.exp;
      x.smart = this.smartLabels;
      x.bw = this.style.bw;
      x.title = !!this.graphTitle;
      x.range = this.selectionRect ? 'selection' : 'view';
      if (this.style.gridMode === 'karo') { x.sizeMode = 'scale'; x.ux = x.uy = this.style.karo * 0.5; }
      E.expUx.value = x.ux; E.expUy.value = x.uy; E.expW.value = x.w; E.expH.value = x.h;
      E.expRange.value = x.range; E.expRange.querySelector('[value="selection"]').disabled = !this.selectionRect;
      E.expDpi.value = String(x.dpi);
      E.expTitle.checked = x.title; E.expLabels.checked = x.labels; E.expSmart.checked = x.smart;
      E.expBw.checked = x.bw; E.expWhite.checked = x.white; E.expMark.checked = x.mark;
      this.setSegmented(E.expFormat, x.format);
      this.setSegmented(E.expSizeMode, x.sizeMode);
      this.openSheet('export-sheet');
      this._expUI();
    },

    _expUI() {
      const E = this.els, x = this.exp, karo = this.style.gridMode === 'karo';
      E.expSheet.querySelectorAll('[data-mode]').forEach(r => { r.hidden = r.dataset.mode !== x.sizeMode; });
      E.expSheet.querySelectorAll('[data-fmt]').forEach(r => { r.hidden = r.dataset.fmt !== x.format; });
      E.expUx.disabled = E.expUy.disabled = karo;
      E.expSizeMode.querySelector('[data-value="fixed"]').disabled = karo;
      $('exp-go').textContent = x.format === 'pdf' ? 'Zum Druckbogen' : x.format === 'tikz' ? 'Kopieren' : 'Sichern';
      clearTimeout(this._expT);
      this._expT = setTimeout(() => this._renderPreview(), 60);
    },

    _renderPreview() {
      const E = this.els;
      const r = this.renderExport(this.exp);
      if (r.error) { E.expPreview.innerHTML = ''; E.expSize.textContent = r.error; return; }
      const unit = this.exp.sizeMode === 'scale' ? ' · 1 Einheit = ' + fmtCm(r.ux) + ' cm' + (Math.abs(r.ux - r.uy) > 1e-9 ? ' (x) / ' + fmtCm(r.uy) + ' cm (y)' : '') : '';
      E.expSize.textContent = fmtCm(r.wcm) + ' × ' + fmtCm(r.hcm) + ' cm' + unit + (r.wcm > 17.4 ? ' · breiter als eine A4-Seite mit Rand' : '');
      if (this.exp.format === 'tikz') {
        E.expPreview.innerHTML = '<pre>' + esc(this._tikz(r)) + '</pre>';
      } else {
        E.expPreview.innerHTML = r.svg.replace(/^<\?xml[^>]*>\s*/, '');
        const s = E.expPreview.querySelector('svg');
        s.removeAttribute('width'); s.removeAttribute('height');
        s.style.width = Math.min(560, r.wcm * CM) + 'px';
      }
    },

    // ══════════════════ Offscreen-Darstellung in Zentimetern ══════════════════

    _exportBounds(x) {
      if (x.range === 'selection' && this.selectionRect) return this._getSelectionBounds();
      return this._viewObj(true);
    },

    // Zeichnet die Grafik in ein eigenes SVG mit exakter Größe in cm
    renderExport(x, override) {
      x = { ...x, ...(override || {}) };
      const b = this._exportBounds(x);
      const fs = this.style.fontSize;
      const pad = { l: Math.round(fs * 2.6), r: Math.round(fs * 1.4), t: Math.round(fs * 1.4 + (x.title && this.graphTitle ? fs * 1.8 : 0)), b: Math.round(fs * 2.1) };
      let ux = x.ux, uy = x.uy, wcm, hcm;
      if (this.style.gridMode === 'karo' && x.sizeMode !== 'screen') { ux = uy = this.style.karo * 0.5; x.sizeMode = 'scale'; }
      if (x.sizeMode === 'scale') {
        wcm = (b.xMax - b.xMin) * ux + (pad.l + pad.r) / CM;
        hcm = (b.yMax - b.yMin) * uy + (pad.t + pad.b) / CM;
      } else if (x.sizeMode === 'screen') {
        wcm = this.W / CM; hcm = this.H / CM;
      } else {
        wcm = x.w; hcm = x.h;
        ux = ((wcm * CM - pad.l - pad.r) / CM) / (b.xMax - b.xMin);
        uy = ((hcm * CM - pad.t - pad.b) / CM) / (b.yMax - b.yMin);
      }
      if (!(wcm > 0 && hcm > 0)) return { error: 'Ungültige Größe' };
      if (wcm > MAX_CM || hcm > MAX_CM) return { error: 'Zu groß (' + fmtCm(wcm) + ' × ' + fmtCm(hcm) + ' cm) – Maßstab verkleinern oder Ausschnitt wählen' };
      const W = wcm * CM, H = hcm * CM;
      const usePad = x.sizeMode === 'screen' ? this.pad : pad;

      const svg = d3.create('svg').attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr('width', fmtNum(wcm) + 'cm').attr('height', fmtNum(hcm) + 'cm').attr('viewBox', `0 0 ${fmtNum(W)} ${fmtNum(H)}`);
      const suffix = '-x' + Math.random().toString(36).slice(2, 7);
      const t = this._initSvgDetached(svg, suffix);

      const dark = this._theme().dark;
      const saved = {};
      ['root', 'overlay', 'clipRect', 'W', 'H', 'pad', 'xs', 'ys', 'PL', 'PR', 'PT', 'PB', 'rc', '_ids', '_ticksCache', 'selectionRect'].forEach(k => { saved[k] = this[k]; });
      this._screen = { xs: this.xs, ys: this.ys };
      try {
        Object.assign(this, { root: t.root, overlay: t.overlay, clipRect: t.clip, _ids: t.ids, W, H, pad: usePad, selectionRect: null });
        this.xs = d3.scaleLinear().domain([b.xMin, b.xMax]).range([usePad.l, W - usePad.r]);
        this.ys = d3.scaleLinear().domain([b.yMin, b.yMax]).range([H - usePad.b, usePad.t]);
        this._setFrame();
        this.rc = {
          labels: x.labels, smart: x.smart, title: x.title, mark: x.mark, bw: x.bw,
          bg: x.white ? '#FFFFFF' : this._theme().plotBg, lightOverride: x.white && dark,
        };
        this.repaint();
      } finally {
        Object.assign(this, saved);
        this._screen = null;
      }
      let s = new XMLSerializer().serializeToString(svg.node());
      s = s.replace(/(<svg[^>]*>)/, '$1<title>' + esc(this.graphTitle || 'Plotoria') + '</title>');
      return { svg: '<?xml version="1.0" encoding="UTF-8"?>\n' + s, wcm, hcm, W, H, ux, uy, bounds: b };
    },

    _initSvgDetached(svg, suffix) {
      const keep = { clipRect: this.clipRect, root: this.root, overlay: this.overlay, _ids: this._ids };
      const r = this._initSvg(svg, suffix);
      Object.assign(this, keep);
      return r;
    },

    // ══════════════════ Formate ══════════════════

    _pngFromSvg(r, dpi) {
      const scale = dpi / 96;
      return new Promise((resolve, reject) => {
        const img = new Image();
        const u = URL.createObjectURL(new Blob([r.svg], { type: 'image/svg+xml' }));
        img.onload = () => {
          const cv = document.createElement('canvas');
          cv.width = Math.round(r.W * scale); cv.height = Math.round(r.H * scale);
          const ctx = cv.getContext('2d');
          ctx.drawImage(img, 0, 0, cv.width, cv.height);
          URL.revokeObjectURL(u);
          cv.toBlob(async (blob) => {
            if (!blob) { reject(new Error('PNG konnte nicht erzeugt werden')); return; }
            // Auflösung eintragen, damit Word/LibreOffice die Größe in cm übernehmen
            const buf = await blob.arrayBuffer();
            resolve(new Blob([Numerics.pngWithDpi(buf, dpi)], { type: 'image/png' }));
          }, 'image/png');
        };
        img.onerror = () => { URL.revokeObjectURL(u); reject(new Error('Bild konnte nicht erzeugt werden')); };
        img.src = u;
      });
    },

    _tikz(r) {
      const x = this.exp;
      const fns = this.fns.filter(f => f.vis && f.ast).map(f => {
        const bd = f.bounds ? f.bounds() : null;
        const o = { ...f, letterTeX: P.letterTeX(f.letter), lo: bd ? bd.lo : NaN, hi: bd ? bd.hi : NaN, loOpen: bd && bd.loOpen, hiOpen: bd && bd.hiOpen };
        if (x.labels && f.labelMode !== 'none' && f.labelX != null) {
          o.inlineLabel = f.labelMode === 'name' ? '$G_{' + f.letter + '}$' : TikZ.label(this._labelText(f) || '');
          o.lx = f.labelX; o.ly = f.labelY;
        }
        return o;
      });
      const deg = this.deg && !fns.some(f => f.rad);
      const list = deg || !this.deg ? fns : fns.map(f => (f.rad ? f : { ...f, ast: MathParser.radianize(f.ast) }));
      const objects = this.objs.filter(o => o.vis).map(o => {
        const pos = this._objPos(o);
        if (!pos) return null;
        if (o.type === 'point') return { ...o, px: pos.x, py: pos.y, text: (o.showName ? o.name : '') + (o.showCoords ? '(' + this.fmtPt(pos.x) + ' | ' + this.fmtPt(pos.y) + ')' : '') };
        if (o.type === 'vline') return { ...o, px: pos.x };
        return o;
      }).filter(Boolean);
      const sc = r && this.exp.sizeMode !== 'fixed';
      return TikZ.generate(list, r ? r.bounds : this._exportBounds(x), {
        version: this.VERSION, title: x.title ? this.graphTitle : '', xLabel: this.style.xLabel, yLabel: this.style.yLabel,
        params: this.params, deg, bw: x.bw, ux: sc ? r.ux : null, uy: sc ? r.uy : null,
        width: r ? r.wcm : 12, height: r ? r.hcm : 8,
        karo: this.style.gridMode === 'karo' ? this.style.karo : 0, grid: this.style.gridMode !== 'none',
        xStep: this.style.xStep ? MathParser.evalConst(this.style.xStep) : 0, yStep: this.style.yStep ? MathParser.evalConst(this.style.yStep) : 0,
        objects, datasets: this.datasets.filter(d => d.vis), legend: false,
      });
    },

    doExport() {
      const x = this.exp;
      if (x.format === 'pdf') { this.exportToPrint(); this.els.expSheet.close(); this.openPrint(); return; }
      if (x.format === 'tikz') { this.copyExport(); return; }
      const r = this.renderExport(x);
      if (r.error) { this._toast(r.error); return; }
      if (x.format === 'svg') {
        this._download(new Blob([r.svg], { type: 'image/svg+xml' }), this._fileBase() + '.svg');
        this._toast('SVG gesichert · ' + fmtCm(r.wcm) + ' × ' + fmtCm(r.hcm) + ' cm');
      } else {
        this._pngFromSvg(r, x.dpi).then(b => {
          this._download(b, this._fileBase() + '.png');
          this._toast('PNG gesichert · ' + fmtCm(r.wcm) + ' × ' + fmtCm(r.hcm) + ' cm bei ' + x.dpi + ' dpi');
        }).catch(e => this._toast(e.message));
      }
    },

    copyExport() {
      const x = this.exp;
      const r = this.renderExport(x);
      if (r.error) { this._toast(r.error); return; }
      if (x.format === 'tikz') { this._copy(this._tikz(r), 'TikZ-Code kopiert'); return; }
      if (x.format === 'svg') { this._copy(r.svg, 'SVG-Code kopiert'); return; }
      this._copyPng(r, x.dpi);
    },

    _copyPng(r, dpi) {
      if (!navigator.clipboard || !window.ClipboardItem) { this._toast('Bild kopieren wird hier nicht unterstützt – bitte als PNG sichern'); return; }
      navigator.clipboard.write([new ClipboardItem({ 'image/png': this._pngFromSvg(r, dpi) })])
        .then(() => this._toast('Bild kopiert – in Word mit Strg+V einfügen'))
        .catch(() => this._toast('Kopieren nicht erlaubt – bitte als PNG sichern'));
    },

    // Schnellkopie aus der Werkzeugleiste: wie am Bildschirm, ohne Wasserzeichen
    copyImage() {
      const r = this.renderExport(this.exp, { sizeMode: 'screen', range: this.selectionRect ? 'selection' : 'view', smart: this.smartLabels, bw: this.style.bw, title: !!this.graphTitle });
      if (r.error) { this._toast(r.error); return; }
      this._copyPng(r, 192);
    },

    // ══════════════════ Druckbogen ══════════════════

    exportToPrint() {
      const r = this.renderExport(this.exp, { format: 'svg' });
      if (r.error) { this._toast(r.error); return; }
      this.addPrintItem({ kind: 'svg', svg: r.svg.replace(/^<\?xml[^>]*>\s*/, ''), wcm: r.wcm, hcm: r.hcm, caption: this.graphTitle || '' });
    },

    addPrintItem(item) {
      this.printItems.push({ id: Date.now() + Math.random(), ...item });
      this._savePrint();
      this._toast('Zum Druckbogen hinzugefügt (' + this.printItems.length + ')');
      if (this.els.printSheet.open) this.renderPrint();
    },

    _savePrint() {
      this._updatePrintCount();
      try { localStorage.setItem(PRINT_KEY, JSON.stringify({ items: this.printItems, opts: this.printOpts })); }
      catch (e) { this._toast('Druckbogen zu groß zum Zwischenspeichern – bitte bald drucken'); }
    },

    _updatePrintCount() { if (this.els.printCount) this.els.printCount.textContent = this.printItems.length || ''; },

    openPrint() {
      const E = this.els;
      E.prHeader.checked = this.printOpts.header; E.prHeading.value = this.printOpts.heading; E.prNumbers.checked = this.printOpts.numbers;
      this.openSheet('print-sheet');
      this.renderPrint();
    },

    renderPrint() {
      const E = this.els;
      E.printItems.innerHTML = '';
      E.printEmpty.hidden = this.printItems.length > 0;
      this.printItems.forEach((it, i) => {
        const item = document.createElement('div'); item.className = 'item';
        const row = document.createElement('div'); row.className = 'item-row';
        const th = document.createElement('div'); th.className = 'print-thumb';
        if (it.kind === 'svg') { th.innerHTML = it.svg; const s = th.querySelector('svg'); s.removeAttribute('width'); s.removeAttribute('height'); s.querySelectorAll('[id]').forEach(n => n.removeAttribute('id')); }
        else th.innerHTML = Icons.svg('table');
        const main = document.createElement('div'); main.className = 'item-main';
        const cap = document.createElement('input'); cap.className = 'field'; cap.placeholder = 'Bildunterschrift'; cap.value = it.caption || '';
        cap.addEventListener('input', () => { it.caption = cap.value; this._savePrint(); this.renderPrintPreview(); });
        const sub = document.createElement('div'); sub.className = 'item-sub';
        sub.textContent = it.kind === 'svg' ? fmtCm(it.wcm) + ' × ' + fmtCm(it.hcm) + ' cm' : 'Tabelle';
        main.append(cap, sub);
        const acts = document.createElement('div'); acts.className = 'item-actions';
        const btn = (label, title, cb, dis) => { const b = document.createElement('button'); b.className = 'icon-btn'; b.innerHTML = label; b.title = title; b.disabled = !!dis; b.addEventListener('click', cb); acts.appendChild(b); };
        btn('↑', 'Nach oben', () => { [this.printItems[i - 1], this.printItems[i]] = [this.printItems[i], this.printItems[i - 1]]; this._savePrint(); this.renderPrint(); }, i === 0);
        btn('↓', 'Nach unten', () => { [this.printItems[i + 1], this.printItems[i]] = [this.printItems[i], this.printItems[i + 1]]; this._savePrint(); this.renderPrint(); }, i === this.printItems.length - 1);
        btn(Icons.svg('trash'), 'Entfernen', () => { this.printItems.splice(i, 1); this._savePrint(); this.renderPrint(); });
        row.append(th, main, acts);
        item.appendChild(row);
        E.printItems.appendChild(item);
      });
      this.renderPrintPreview();
    },

    // Seiten zusammenstellen (Höhen in mm, A4 hoch mit 16 mm Rand oben/unten)
    _buildPages() {
      const o = this.printOpts;
      const pages = [];
      let cur = null, used = 0;
      const avail = 297 - 32;
      const newPage = () => {
        cur = []; pages.push(cur);
        used = pages.length === 1 ? (o.header ? 14 : 0) + (o.heading ? 12 : 0) : 0;
      };
      newPage();
      this.printItems.forEach((it, i) => {
        const h = it.kind === 'svg' ? Math.min(it.hcm * 10 * (it.wcm > 17.4 ? 17.4 / it.wcm : 1), avail - 10) + 13 : 8 * (it.html.match(/<tr/g) || []).length + 16;
        if (used + h > avail && cur.length) newPage();
        cur.push({ it, n: i + 1 });
        used += h;
      });
      return pages.map((items, p) => {
        let h = '<div class="page">';
        if (p === 0 && o.header) h += '<div class="page-header"><span>Name:</span><span>Klasse:</span><span>Datum:</span></div>';
        if (p === 0 && o.heading) h += '<h1>' + esc(o.heading) + '</h1>';
        items.forEach(({ it, n }) => {
          const cap = (o.numbers ? (it.kind === 'svg' ? 'Abbildung ' : 'Tabelle ') + n + (it.caption ? ': ' : '') : '') + (it.caption || '');
          let body = it.svg || it.html;
          if (it.kind === 'svg' && it.wcm > 17.4) body = body.replace(/width="[^"]*cm"/, 'width="174mm"').replace(/height="[^"]*cm"/, 'height="' + (it.hcm * 174 / it.wcm).toFixed(1) + 'mm"');
          h += '<div class="page-item"><figure>' + body + (cap ? '<figcaption>' + esc(cap) + '</figcaption>' : '') + '</figure></div>';
        });
        return h + '</div>';
      }).join('');
    },

    renderPrintPreview() {
      const E = this.els;
      E.printPreview.innerHTML = this.printItems.length || this.printOpts.header || this.printOpts.heading ? this._buildPages() : '';
      // IDs der Vorschau eindeutig machen
      E.printPreview.querySelectorAll('svg').forEach((s, i) => this._uniqueIds(s, '-pv' + i));
      const wrap = E.printPreview.parentElement;
      const scale = Math.min(1, (wrap.clientWidth - 40) / (210 * 96 / 25.4));
      E.printPreview.style.transform = 'scale(' + scale + ')';
      E.printPreview.style.transformOrigin = 'top left';
      E.printPreview.style.marginBottom = -(1 - scale) * E.printPreview.scrollHeight + 'px';
    },

    _uniqueIds(svg, suffix) {
      svg.querySelectorAll('[id]').forEach(n => {
        const old = n.id, neu = old + suffix;
        n.id = neu;
        svg.querySelectorAll('[clip-path="url(#' + old + ')"]').forEach(m => m.setAttribute('clip-path', 'url(#' + neu + ')'));
        svg.querySelectorAll('[fill="url(#' + old + ')"]').forEach(m => m.setAttribute('fill', 'url(#' + neu + ')'));
      });
    },

    printNow() {
      if (!this.printItems.length) { this._toast('Der Druckbogen ist noch leer'); return; }
      const root = $('print-root');
      root.innerHTML = this._buildPages();
      root.querySelectorAll('svg').forEach((s, i) => this._uniqueIds(s, '-pr' + i));
      this.els.printSheet.close();
      setTimeout(() => { window.print(); setTimeout(() => { root.innerHTML = ''; }, 500); }, 100);
    },

    // ══════════════════ Projektdateien ══════════════════

    saveProject() {
      const st = this.serialize();
      st.print = { items: this.printItems, opts: this.printOpts };
      st.savedAt = new Date().toISOString();
      this._download(new Blob([JSON.stringify(st, null, 1)], { type: 'application/json' }), this._fileBase() + '.plotoria');
      this._toast('Projekt gesichert – mit „Öffnen“ oder per Drag & Drop wieder laden');
    },

    openProject() { this.els.fileInput.click(); },

    _readProjectFile(file) {
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const st = JSON.parse(rd.result);
          if (!st || !Array.isArray(st.fns)) throw new Error();
          if (st.print && Array.isArray(st.print.items)) { this.printItems = st.print.items; Object.assign(this.printOpts, st.print.opts || {}); this._savePrint(); }
          this.load(st);
          this.commit();
          this._toast('„' + file.name + '“ geöffnet');
        } catch (e) {
          this._toast('Keine gültige Plotoria-Datei');
        }
      };
      rd.readAsText(file);
    },

    // ══════════════════ TikZ importieren ══════════════════

    importTikZ() {
      const c = this.els.tza.value.trim();
      if (!c) return;
      const r = TikZ.parse(c);
      if (!r.functions.length) { this._toast('Keine \\addplot-Befehle gefunden'); return; }
      const errors = [];
      this.fns = []; this.ci = 0; this.integral = null; this.tangent = null;
      this.deg = r.degMode;
      r.functions.forEach(expr => { const res = this._addDef(expr); if (res.error) errors.push(expr); });
      if (r.bounds) { this.proportional = false; this.setView(r.bounds, { home: true }); }
      this.els.tza.value = '';
      this.rebuild();
      this.sync();
      this.repaint();
      this.commit();
      this.els.expSheet.close();
      this._toast(errors.length ? errors.length + ' Ausdruck/Ausdrücke nicht erkannt' : 'TikZ importiert' + (r.degMode ? ' (Gradmaß)' : ''));
    },
  });

  function fmtNum(v) { return String(+v.toFixed(3)); }
})();
