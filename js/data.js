// Plotoria 2.0 – Wertetabelle (mit Lücken für Arbeitsblätter) und Messreihen mit Regression
(() => {
  const P = window.Plotoria;
  const { esc, fmtDE } = P;
  const $ = id => document.getElementById(id);

  const REG_TYPES = [
    ['linear', 'Linear  y = mx + b'],
    ['quadratic', 'Quadratisch'],
    ['cubic', 'Kubisch'],
    ['exponential', 'Exponentiell  y = a·eᵇˣ'],
    ['power', 'Potenz  y = a·xᵇ'],
  ];

  Object.assign(P, {
    initData() {
      this.table = { start: -3, end: 3, step: 1, orient: 'h', blanks: {} };
      this.datasets = [];
      const E = this.els;
      Object.assign(E, {
        tblStart: $('tbl-start'), tblEnd: $('tbl-end'), tblStep: $('tbl-step'), tblOrient: $('tbl-orient'), tbl: $('value-table'),
        dataInput: $('data-input'), dataName: $('data-name'), dataGroup: $('data-group'), dataList: $('data-list'),
      });
      const upd = () => { this._readTableInputs(); this.renderTable(); this.commit(); };
      [E.tblStart, E.tblEnd, E.tblStep].forEach(el => el.addEventListener('change', upd));
      this.segmented(E.tblOrient, (v) => { this.table.orient = v; this.renderTable(); this.commit(); });
      $('tbl-blank-all').addEventListener('click', () => this._blank('all'));
      $('tbl-blank-rand').addEventListener('click', () => this._blank('rand'));
      $('tbl-blank-none').addEventListener('click', () => this._blank('none'));
      $('tbl-word').addEventListener('click', () => this.copyTableWord());
      $('tbl-latex').addEventListener('click', () => this.copyTableLatex());
      $('tbl-csv').addEventListener('click', () => this.exportCSV());
      $('tbl-print').addEventListener('click', () => this.tableToPrint());
      $('data-add').addEventListener('click', () => this.addDatasetFromInput());
      E.tbl.addEventListener('click', (e) => {
        const td = e.target.closest('td.cell');
        if (!td) return;
        const k = td.dataset.key;
        if (this.table.blanks[k]) delete this.table.blanks[k]; else this.table.blanks[k] = 1;
        this.renderTable();
        this.commit();
      });
    },

    _readTableInputs() {
      const num = (el, d) => { const v = parseFloat(el.value); return isFinite(v) ? v : d; };
      this.table.start = num(this.els.tblStart, -3);
      this.table.end = num(this.els.tblEnd, 3);
      this.table.step = Math.abs(num(this.els.tblStep, 1));
    },

    _syncTableInputs() {
      const E = this.els;
      E.tblStart.value = this.table.start; E.tblEnd.value = this.table.end; E.tblStep.value = this.table.step;
      this.setSegmented(E.tblOrient, this.table.orient);
    },

    _tableRows() {
      const { start: a, end: b, step } = this.table;
      if (!(step > 0) || b < a) return { error: 'Bitte Start ≤ Ende und Schrittweite > 0 wählen' };
      const n = Math.floor((b - a) / step + 1e-9) + 1;
      if (n > 200) return { error: 'Höchstens 200 Werte – Schrittweite vergrößern' };
      const fns = this.fns.filter(f => f.vis && f.f);
      const xs = [];
      for (let i = 0; i < n; i++) xs.push(+(a + i * step).toFixed(10));
      return { fns, xs, val: (f, x) => f.f(x) };
    },

    _cellKey(f, x) { return f.letter + ':' + x; },
    _fmtCell(v) {
      if (!isFinite(v)) return '–';
      if (this.style.exact) { const e = Numerics.exact(v); if (e) return e; }
      return fmtDE(v, 4);
    },

    // Tabelle als Matrix: [[Kopf, Wert, …], …] in der gewählten Ausrichtung, mit Lücken
    _tableMatrix(blankMark) {
      const t = this._tableRows();
      if (t.error) return t;
      const head = ['x', ...t.fns.map(f => f.letter + '(x)')];
      const cols = t.xs.map(x => [this._fmtCell(x), ...t.fns.map(f => this.table.blanks[this._cellKey(f, x)] ? blankMark : this._fmtCell(t.val(f, x)))]);
      const keys = t.xs.map(x => [null, ...t.fns.map(f => this._cellKey(f, x))]);
      if (this.table.orient === 'h') {
        return { rows: head.map((h, r) => [h, ...cols.map(c => c[r])]), keys: head.map((h, r) => [null, ...keys.map(k => k[r])]), fns: t.fns };
      }
      return { rows: [head, ...cols], keys: [head.map(() => null), ...keys], fns: t.fns, vertical: true };
    },

    renderTable() {
      const el = this.els.tbl;
      if (!el) return;
      this._syncTableInputs();
      const m = this._tableMatrix(null);
      if (m.error) { el.innerHTML = '<p class="hint" style="padding:10px">' + esc(m.error) + '</p>'; return; }
      if (!m.fns.length) { el.innerHTML = '<p class="hint" style="padding:10px">Keine sichtbaren Funktionen</p>'; return; }
      let h = '<table>';
      m.rows.forEach((row, r) => {
        h += '<tr>';
        row.forEach((v, c) => {
          const key = m.keys[r][c];
          const isHead = m.vertical ? r === 0 : c === 0;
          if (isHead) h += '<th>' + esc(v) + '</th>';
          else if (key) {
            const blank = v === null;
            const real = blank ? this._fmtCell(this._valueForKey(key)) : v;
            h += '<td class="cell' + (blank ? ' blank' : '') + '" data-key="' + esc(key) + '" title="Klicken: Lücke ein/aus">' + esc(real) + '</td>';
          } else h += '<td>' + esc(v) + '</td>';
        });
        h += '</tr>';
      });
      el.innerHTML = h + '</table>';
    },

    _valueForKey(key) {
      const i = key.indexOf(':');
      const f = this.fns.find(fn => fn.letter === key.slice(0, i));
      return f && f.f ? f.f(+key.slice(i + 1)) : NaN;
    },

    _blank(mode) {
      const t = this._tableRows();
      if (t.error) return;
      this.table.blanks = {};
      if (mode !== 'none') {
        t.xs.forEach(x => t.fns.forEach(f => {
          if (mode === 'all' || Math.random() < 0.5) this.table.blanks[this._cellKey(f, x)] = 1;
        }));
      }
      this.renderTable();
      this.commit();
    },

    // ── Tabellen-Export ──
    _tableHTML(forPrint) {
      const m = this._tableMatrix('');
      if (m.error || !m.fns.length) { this._toast(m.error || 'Keine sichtbaren Funktionen'); return null; }
      const cell = 'border:1px solid #000;padding:4px 10px;text-align:center;min-width:1.4cm;height:0.8cm;font-family:Calibri,Arial,sans-serif;font-size:11pt';
      let h = '<table style="border-collapse:collapse">';
      m.rows.forEach((row, r) => {
        h += '<tr>';
        row.forEach((v, c) => {
          const head = m.vertical ? r === 0 : c === 0;
          h += head ? `<th style="${forPrint ? '' : cell + ';font-weight:bold;background:#f2f2f2'}">${esc(v)}</th>` : `<td style="${forPrint ? '' : cell}">${esc(v)}</td>`;
        });
        h += '</tr>';
      });
      return h + '</table>';
    },

    copyTableWord() {
      const html = this._tableHTML(false);
      if (!html) return;
      const m = this._tableMatrix('');
      const text = m.rows.map(r => r.join('\t')).join('\n');
      if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        })]).then(() => this._toast('Tabelle kopiert – in Word mit Strg+V einfügen'))
          .catch(() => this._copy(text, 'Tabelle als Text kopiert'));
      } else this._copy(text, 'Tabelle als Text kopiert');
    },

    copyTableLatex() {
      const m = this._tableMatrix(null);
      if (m.error || !m.fns.length) { this._toast(m.error || 'Keine sichtbaren Funktionen'); return; }
      const tex = (v, head) => {
        if (v === null) return '\\hspace{1.2cm}';
        if (v === '–') return '\\text{--}';
        const s = String(v).replace(/−/g, '-').replace(/π/g, '\\pi').replace(/√(\d+)/g, '\\sqrt{$1}');
        return head ? '$' + s + '$' : '$' + s + '$';
      };
      const n = m.rows[0].length;
      const L = ['\\begin{tabular}{|' + 'c|'.repeat(n) + '}', '\\hline'];
      m.rows.forEach((row, r) => {
        L.push(row.map((v, c) => tex(v, m.vertical ? r === 0 : c === 0)).join(' & ') + ' \\\\ \\hline');
      });
      L.push('\\end{tabular}');
      this._copy(L.join('\n'), 'LaTeX-Tabelle kopiert');
    },

    exportCSV() {
      const m = this._tableMatrix('');
      if (m.error || !m.fns.length) { this._toast(m.error || 'Keine sichtbaren Funktionen'); return; }
      const cell = (v) => String(v).replace(/−/g, '-');
      const lines = m.rows.map(r => r.map(cell).join(';'));
      this._download(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), this._fileBase() + '-wertetabelle.csv');
    },

    tableToPrint() {
      const html = this._tableHTML(true);
      if (!html || !this.addPrintItem) return;
      this.addPrintItem({ kind: 'table', html, caption: 'Wertetabelle' });
    },

    // ── Messreihen ──
    addDatasetFromInput() {
      const pts = Numerics.parseData(this.els.dataInput.value);
      if (!pts.length) { this._toast('Keine Wertepaare erkannt – je Zeile „x;y“ eingeben'); return; }
      const name = this.els.dataName.value.trim() || 'Messreihe ' + (this.datasets.length + 1);
      const ds = { id: this.nextId++, name, pts, col: this.COLORS[(this.datasets.length + 3) % this.COLORS.length], vis: true, reg: 'linear' };
      this.datasets.push(ds);
      this.els.dataInput.value = ''; this.els.dataName.value = '';
      this._fitToData(pts);
      this.syncData();
      this.switchTab('algebra');
      this.repaint();
      this.commit();
      this._toast(pts.length + ' Messwerte übernommen');
    },

    _fitToData(pts) {
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(0, ...ys), y1 = Math.max(0, ...ys);
      const px = (x1 - x0 || 1) * 0.12, py = (y1 - y0 || 1) * 0.12;
      x0 = Math.min(x0 - px, 0 - px * 0.5); x1 += px; y0 -= py; y1 += py;
      const prop = this.proportional;
      this.proportional = false;
      this.setView({ xMin: x0, xMax: x1, yMin: y0, yMax: y1 }, { home: true });
      this._syncControls();
      if (prop) this._toast('Ansicht an die Messwerte angepasst (ungleiche Einheiten)');
    },

    paintData() {
      const vis = this.datasets.filter(d => d.vis);
      if (!vis.length) return;
      const g = this.root.append('g').attr('clip-path', this._clipUrl());
      const bw = this.rc ? this.rc.bw : this.style.bw;
      vis.forEach(ds => {
        const col = bw ? '#000' : ds.col, s = 5;
        const path = ds.pts.map(([x, y]) => { const px = this.xs(x), py = this.ys(y); return `M${px - s},${py - s}L${px + s},${py + s}M${px - s},${py + s}L${px + s},${py - s}`; }).join('');
        g.append('path').attr('d', path).attr('stroke', col).attr('stroke-width', 2.2).attr('stroke-linecap', 'round');
      });
    },

    addRegression(ds) {
      const r = Numerics.regression(ds.pts, ds.reg || 'linear');
      if (r.error) { this._toast(r.error); return; }
      const res = this._addDef(r.term);
      if (res.error) { this._toast(res.error); return; }
      const fn = this.fns[this.fns.length - 1];
      fn.col = ds.col; fn.labelMode = 'term';
      this.sync();
      this.repaint();
      this.commit();
      this._toast('Ausgleichskurve ' + fn.letter + ' · R² = ' + fmtDE(r.r2, 4));
    },

    syncData() {
      const list = this.els.dataList;
      if (!list) return;
      list.innerHTML = '';
      this.els.dataGroup.hidden = !this.datasets.length;
      this.datasets.forEach(ds => {
        const item = document.createElement('div'); item.className = 'item';
        const row = document.createElement('div'); row.className = 'item-row';
        const dot = document.createElement('label'); dot.className = 'color-dot' + (ds.vis ? '' : ' off'); dot.style.background = ds.col;
        const cp = document.createElement('input'); cp.type = 'color'; cp.value = ds.col;
        cp.addEventListener('input', () => { ds.col = cp.value; dot.style.background = ds.col; this.repaint(); });
        cp.addEventListener('change', () => this.commit());
        dot.appendChild(cp);
        const main = document.createElement('div'); main.className = 'item-main';
        main.innerHTML = '<div class="item-title">' + esc(ds.name) + '</div><div class="item-sub">' + ds.pts.length + ' Messwerte</div>';
        main.addEventListener('click', () => this._inlineEdit(main, ds.name, (v) => { ds.name = v; this.syncData(); this.commit(); return true; }));
        const acts = document.createElement('div'); acts.className = 'item-actions';
        const eye = document.createElement('button'); eye.className = 'icon-btn'; eye.innerHTML = Icons.svg(ds.vis ? 'eye' : 'eyeOff');
        eye.title = ds.vis ? 'Ausblenden' : 'Einblenden';
        eye.addEventListener('click', () => { ds.vis = !ds.vis; this.syncData(); this.repaint(); this.commit(); });
        const dis = document.createElement('button'); dis.className = 'icon-btn disclose'; dis.innerHTML = Icons.svg('chevron'); dis.title = 'Regression & Werte';
        dis.addEventListener('click', () => item.classList.toggle('open'));
        acts.append(eye, dis);
        row.append(dot, main, acts);

        const det = document.createElement('div'); det.className = 'item-detail';
        const sel = document.createElement('select'); sel.className = 'field';
        REG_TYPES.forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; sel.appendChild(o); });
        sel.value = ds.reg || 'linear';
        sel.addEventListener('change', () => { ds.reg = sel.value; this.commit(); });
        this._detailRow(det, 'Regression', sel);
        const ta = document.createElement('textarea'); ta.className = 'field field-mono'; ta.rows = 4;
        ta.value = ds.pts.map(p => String(p[0]).replace('.', ',') + ';' + String(p[1]).replace('.', ',')).join('\n');
        ta.addEventListener('change', () => {
          const pts = Numerics.parseData(ta.value);
          if (!pts.length) { this._toast('Keine Wertepaare erkannt'); return; }
          ds.pts = pts; this.syncData(); this.repaint(); this.commit();
        });
        det.appendChild(ta);
        const acts2 = document.createElement('div'); acts2.className = 'detail-actions';
        const reg = document.createElement('button'); reg.className = 'btn btn-tinted btn-sm'; reg.innerHTML = Icons.svg('derive') + 'Ausgleichskurve';
        reg.addEventListener('click', () => this.addRegression(ds));
        const fit = document.createElement('button'); fit.className = 'btn btn-gray btn-sm'; fit.textContent = 'Ansicht anpassen';
        fit.addEventListener('click', () => this._fitToData(ds.pts));
        const del = document.createElement('button'); del.className = 'btn btn-gray btn-sm'; del.style.color = 'var(--red)'; del.innerHTML = Icons.svg('trash') + 'Löschen';
        del.addEventListener('click', () => { this.datasets = this.datasets.filter(d => d !== ds); this.syncData(); this.repaint(); this.commit(); });
        acts2.append(reg, fit, del);
        det.appendChild(acts2);
        item.append(row, det);
        list.appendChild(item);
      });
    },
  });
})();
