// Plotoria 2.0 – Zeichenobjekte: Punkte, Texte, Pfeile, senkrechte Geraden
(() => {
  const MP = MathParser;
  const P = window.Plotoria;
  const { esc, clamp, fmtDE } = P;
  const $ = id => document.getElementById(id);

  const TYPE_NAMES = { point: 'Punkt', text: 'Text', arrow: 'Pfeil', vline: 'Senkrechte' };

  Object.assign(P, {
    initObjects() {
      this.objs = [];
      this.els.objGroup = $('obj-group');
      this.els.objList = $('obj-list');
    },

    _nextPointName() {
      const used = new Set(this.objs.filter(o => o.type === 'point').map(o => o.name));
      for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') if (!used.has(c)) return c;
      for (let i = 1; ; i++) if (!used.has('P' + i)) return 'P' + i;
    },

    // Koordinaten-Ausdruck übersetzen (darf f(2), Parameter und π enthalten)
    _compileExpr(src) {
      const ast = MP.parse(String(src), { functions: this._fnContext(null) });
      if (MP.freeVars(ast).has('x')) throw new MP.ParseError('x ist hier nicht erlaubt');
      return { ast, f: MP.compile(ast, this.params, { deg: this.deg }) };
    },

    _buildObj(o) {
      o.err = null;
      try {
        if (o.type === 'point') { o.cx = this._compileExpr(o.x); o.cy = this._compileExpr(o.y); }
        if (o.type === 'vline') o.cx = this._compileExpr(o.x);
      } catch (e) {
        o.err = e.message || 'Ungültiger Ausdruck';
      }
    },

    _objPos(o) {
      if (o.err || ((o.type === 'point' || o.type === 'vline') && !o.cx)) return null;
      if (o.type === 'point') { const x = o.cx.f(0), y = o.cy.f(0); return isFinite(x) && isFinite(y) ? { x, y } : null; }
      if (o.type === 'vline') { const x = o.cx.f(0); return isFinite(x) ? { x } : null; }
      return o;
    },

    _objVars(set) {
      this.objs.forEach(o => {
        if (o.cx && o.cx.ast) MP.freeVars(o.cx.ast, set);
        if (o.cy && o.cy.ast) MP.freeVars(o.cy.ast, set);
      });
    },

    // Eingabezeile: "A(2|3)" oder "x = 2"
    checkObjectDef(d) {
      try {
        if (d.kind === 'point') {
          this._compileExpr(d.x); this._compileExpr(d.y);
          return { obj: { type: 'point', name: d.name, x: d.x, y: d.y }, preview: 'Punkt ' + d.name + '(' + d.x + ' | ' + d.y + ')' };
        }
        this._compileExpr(d.x);
        return { obj: { type: 'vline', x: d.x }, preview: 'Senkrechte Gerade x = ' + d.x };
      } catch (e) {
        return { error: e.message || 'Ungültiger Ausdruck' };
      }
    },

    addObjectDef(c) {
      const o = c.obj;
      if (o.type === 'point') {
        const ex = this.objs.find(p => p.type === 'point' && p.name === o.name);
        if (ex) { ex.x = o.x; ex.y = o.y; this._afterObjChange(); this._toast(o.name + ' wurde verschoben'); return {}; }
      }
      this.addObj(o);
      return {};
    },

    addObj(o) {
      const base = { id: this.nextId++, vis: true, col: this._theme().dark ? '#E5E5EA' : '#1C1C1E' };
      if (o.type === 'point') Object.assign(base, { showCoords: true, showName: true, off: [8, -10], col: '#FF3B30' });
      if (o.type === 'text') Object.assign(base, { size: Math.round(this.style.fontSize * 1.15) });
      if (o.type === 'vline') Object.assign(base, { dash: 'dash', showEq: true, col: '#8E8E93' });
      const obj = Object.assign(base, o);
      if (obj.type === 'point' && !obj.name) obj.name = this._nextPointName();
      this.objs.push(obj);
      this._afterObjChange();
      this.commit();
      return obj;
    },

    _afterObjChange() {
      this.objs.forEach(o => this._buildObj(o));
      this._syncAutoParams();
      this.syncObjects();
      this.repaint();
    },

    removeObj(id) {
      this.objs = this.objs.filter(o => o.id !== id);
      if (this.selected && this.selected.id === id) this.selected = null;
      this._afterObjChange();
      this.commit();
    },

    deleteSelected() { if (this.selected) this.removeObj(this.selected.id); },
    deselect() { this.selected = null; this.syncObjects(); this.repaint(); },
    _select(o) { this.selected = o ? { id: o.id } : null; this.syncObjects(); },

    _serializeObjs() {
      return this.objs.map(o => {
        const { id, err, cx, cy, ...rest } = o;   // Laufzeitdaten weglassen
        return rest;
      });
    },

    // ── Fang: Raster (Alt = frei) und Graphen ──
    _snap(mx, my, free) {
      let x = this.xs.invert(mx), y = this.ys.invert(my);
      if (free) return { x, y };
      const near = this._nearest(mx, my, 9);
      const tk = this.ticks();
      const sx = tk.x.gridStep / (this.style.gridMode === 'karo' ? 1 : 2), sy = tk.y.gridStep / (this.style.gridMode === 'karo' ? 1 : 2);
      const gx = Math.round(x / sx) * sx;
      if (near) {
        // auf dem Graphen: x am Raster, wenn der Graph dort definiert ist
        const yg = near.fn.f(gx);
        if (Math.abs(this.xs(gx) - mx) < 8 && isFinite(yg)) return { x: +gx.toPrecision(12), y: +yg.toPrecision(12), fn: near.fn };
        return { x: near.x, y: near.y, fn: near.fn };
      }
      const gy = Math.round(y / sy) * sy;
      if (Math.abs(this.xs(gx) - mx) < 8) x = +gx.toPrecision(12);
      if (Math.abs(this.ys(gy) - my) < 8) y = +gy.toPrecision(12);
      return { x, y };
    },

    _numStr(v) { return String(+v.toPrecision(10)); },

    // ── Werkzeug-Ereignisse ──
    _toolDown(e) {
      const [mx, my] = this._localPoint(e);
      if (mx < this.PL || mx > this.PR || my < this.PT || my > this.PB) return false;
      if (this.tool === 'point') {
        const s = this._snap(mx, my, e.altKey);
        const o = this.addObj({ type: 'point', x: this._numStr(s.x), y: this._numStr(s.y) });
        this._select(o);
        return false;
      }
      if (this.tool === 'text') { this._textEditor(mx, my); return false; }
      if (this.tool === 'arrow') {
        const s = this._snap(mx, my, e.altKey);
        this._arrowDraft = { x1: s.x, y1: s.y, x2: s.x, y2: s.y };
        return true;
      }
      return false;
    },

    _toolMove(e) {
      if (this._arrowDraft) {
        const [mx, my] = this._localPoint(e);
        const s = this._snap(mx, my, e.altKey);
        this._arrowDraft.x2 = s.x; this._arrowDraft.y2 = s.y;
      }
    },

    _toolUp() {
      const d = this._arrowDraft;
      if (!d) return;
      this._arrowDraft = null;
      if (Math.hypot(this.xs(d.x2) - this.xs(d.x1), this.ys(d.y2) - this.ys(d.y1)) > 10) {
        const o = this.addObj({ type: 'arrow', ...d });
        this._select(o);
      }
      this.repaint();
    },

    _toolCancel() {
      this._arrowDraft = null;
      const ed = document.querySelector('.svg-text-editor');
      if (ed) ed.remove();
    },

    _hoverExtra(mx, my) {
      if (this._arrowDraft) this._drawArrow(this.overlay, this._arrowDraft, '#007AFF', 2.2, false, true);
      if (this.tool === 'point') {
        const s = this._snap(mx, my, false);
        this.overlay.append('circle').attr('cx', this.xs(s.x)).attr('cy', this.ys(s.y)).attr('r', 5)
          .attr('fill', 'none').attr('stroke', '#FF3B30').attr('stroke-width', 2);
        return '(' + fmtDE(s.x) + ' | ' + fmtDE(s.y) + ')';
      }
      return null;
    },

    // Text direkt im Graphen eingeben
    _textEditor(mx, my, obj) {
      this._toolCancel();
      const panel = $('graph-panel');
      const inp = document.createElement('input');
      inp.className = 'svg-text-editor';
      inp.placeholder = 'Text – z. B. G_1 oder „Hochpunkt“';
      inp.value = obj ? obj.text : '';
      inp.style.left = mx + 'px';
      inp.style.top = (my - 18) + 'px';
      panel.appendChild(inp);
      setTimeout(() => inp.focus(), 0);
      let done = false;
      const finish = (ok) => {
        if (done) return; done = true;
        const v = inp.value.trim();
        inp.remove();
        if (!ok) return;
        if (obj) {
          if (!v) { this.removeObj(obj.id); return; }
          obj.text = v; this._afterObjChange(); this.commit();
        } else if (v) {
          const o = this.addObj({ type: 'text', x: this.xs.invert(mx), y: this.ys.invert(my), text: v });
          this._select(o);
        }
      };
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
      });
      inp.addEventListener('blur', () => finish(true));
    },

    // ── Zeichnen ──
    _objCol(o) { return (this.rc ? this.rc.bw : this.style.bw) ? '#000000' : o.col; },

    _drawArrow(g, a, col, w, dbl, preview) {
      const x1 = this.xs(a.x1), y1 = this.ys(a.y1), x2 = this.xs(a.x2), y2 = this.ys(a.y2);
      const ang = Math.atan2(y2 - y1, x2 - x1), hl = 8 + w * 2.2, hw = 4 + w * 1.2;
      const head = (x, y, an) => `${x},${y} ${x - hl * Math.cos(an) + hw * Math.sin(an)},${y - hl * Math.sin(an) - hw * Math.cos(an)} ${x - hl * Math.cos(an) - hw * Math.sin(an)},${y - hl * Math.sin(an) + hw * Math.cos(an)}`;
      const sx = dbl ? x1 + (hl - 1) * Math.cos(ang) : x1, sy = dbl ? y1 + (hl - 1) * Math.sin(ang) : y1;
      // Nur den sichtbaren Teil zeichnen (riesige Koordinaten bringen Browser zum Absturz)
      const shaft = this._clipSeg(sx, sy, x2 - (hl - 1) * Math.cos(ang), y2 - (hl - 1) * Math.sin(ang));
      if (!shaft) return null;
      const grp = g.append('g').attr('opacity', preview ? 0.7 : 1);
      grp.append('line').attr('x1', shaft[0]).attr('y1', shaft[1]).attr('x2', shaft[2]).attr('y2', shaft[3])
        .attr('stroke', col).attr('stroke-width', w).attr('stroke-linecap', 'round');
      const near = (x, y) => x > this.PL - 40 && x < this.PR + 40 && y > this.PT - 40 && y < this.PB + 40;
      if (near(x2, y2)) grp.append('polygon').attr('points', head(x2, y2, ang)).attr('fill', col);
      if (dbl && near(x1, y1)) grp.append('polygon').attr('points', head(x1, y1, ang + Math.PI)).attr('fill', col);
      return grp;
    },

    paintObjects() {
      if (!this.objs.length) return;
      const g = this.root.append('g').attr('class', 'objects');
      const clip = g.append('g').attr('clip-path', this._clipUrl());
      const fs = this.style.fontSize;
      const interactive = !this.rc && this.tool === 'move';
      const sel = this.selected && this.selected.id;
      this.objs.forEach(o => {
        if (!o.vis) return;
        const pos = this._objPos(o);
        if (!pos) return;
        const col = this._objCol(o);
        let el = null;
        if (o.type === 'vline') {
          const px = this.xs(pos.x);
          if (px < this.PL - 10 || px > this.PR + 10) return;
          el = clip.append('g');
          el.append('line').attr('x1', px).attr('y1', this.PT).attr('x2', px).attr('y2', this.PB)
            .attr('stroke', col).attr('stroke-width', 2).attr('stroke-dasharray', o.dash === 'solid' ? null : '8,5');
          el.append('line').attr('x1', px).attr('y1', this.PT).attr('x2', px).attr('y2', this.PB).attr('stroke', 'transparent').attr('stroke-width', 14);
          if (o.showEq) this._halo(el.append('text').attr('x', px + 6).attr('y', this.PT + fs + 26).attr('font-size', fs * 0.9)
            .attr('font-weight', '600').attr('fill', col)).text('x = ' + this.fmtPt(pos.x));
        } else if (o.type === 'point') {
          const px = this.xs(pos.x), py = this.ys(pos.y);
          if (px < this.PL - 5 || px > this.PR + 5 || py < this.PT - 5 || py > this.PB + 5) return;
          if (o.guides) {
            // Hilfslinien: Lote auf beide Achsen zum Ablesen
            const { ax, ay } = this._axisPos();
            clip.append('path').attr('d', `M${px},${ay}L${px},${py}L${ax},${py}`).attr('fill', 'none')
              .attr('stroke', col).attr('stroke-width', 1.4).attr('stroke-dasharray', '5,4').attr('opacity', 0.9);
          }
          el = g.append('g');
          el.append('circle').attr('cx', px).attr('cy', py).attr('r', 12).attr('fill', 'transparent');
          el.append('circle').attr('cx', px).attr('cy', py).attr('r', 4.5).attr('fill', col)
            .attr('stroke', this._ctx().bg || '#fff').attr('stroke-width', 1.5);
          const parts = [];
          if (o.showName) parts.push(o.name);
          if (o.showCoords) parts.push('(' + this.fmtPt(pos.x) + ' | ' + this.fmtPt(pos.y) + ')');
          if (parts.length) {
            const txt = this._halo(g.append('text').attr('x', px + o.off[0]).attr('y', py + o.off[1])
              .attr('font-size', fs).attr('font-weight', '600').attr('fill', col).attr('cursor', interactive ? 'move' : null));
            this._richText(txt, parts.join(''), fs, false);
            if (interactive) this._dragLabel(txt, (lx, ly) => { o.off = [lx - px, ly - py]; });
          }
        } else if (o.type === 'text') {
          const tx = this.xs(o.x), ty = this.ys(o.y);
          if (tx < this.PL - this.W || tx > this.PR + this.W || ty < this.PT - this.H || ty > this.PB + this.H) return;
          el = this._halo(g.append('text').attr('x', this.xs(o.x)).attr('y', this.ys(o.y))
            .attr('font-size', o.size || fs).attr('font-weight', o.bold ? '650' : '500').attr('fill', col));
          this._richText(el, o.text, o.size || fs, false);
          if (interactive) el.on('dblclick', (ev) => { ev.stopPropagation(); this._textEditor(this.xs(o.x), this.ys(o.y), o); });
        } else if (o.type === 'arrow') {
          el = this._drawArrow(g, o, col, o.width || 2, o.double);
          if (!el) return;
          const cs = this._clipSeg(this.xs(o.x1), this.ys(o.y1), this.xs(o.x2), this.ys(o.y2));
          if (cs) el.append('line').attr('x1', cs[0]).attr('y1', cs[1]).attr('x2', cs[2]).attr('y2', cs[3])
            .attr('stroke', 'transparent').attr('stroke-width', 14);
        }
        if (!el || !interactive) return;
        el.attr('cursor', 'move');
        if (sel === o.id) this._selectionHalo(g, o, pos);
        this._makeDraggable(el, o);
      });
    },

    _selectionHalo(g, o, pos) {
      const s = (sel) => sel.attr('fill', 'none').attr('stroke', '#007AFF').attr('stroke-width', 1.5).attr('stroke-dasharray', '4,3').attr('pointer-events', 'none');
      if (o.type === 'point') s(g.append('circle').attr('cx', this.xs(pos.x)).attr('cy', this.ys(pos.y)).attr('r', 10));
      if (o.type === 'arrow') {
        [['x1', 'y1'], ['x2', 'y2']].forEach(([kx, ky]) => {
          const hx = this.xs(o[kx]), hy = this.ys(o[ky]);
          if (hx < this.PL - 20 || hx > this.PR + 20 || hy < this.PT - 20 || hy > this.PB + 20) return;
          const h = g.append('circle').attr('cx', this.xs(o[kx])).attr('cy', this.ys(o[ky])).attr('r', 6)
            .attr('fill', '#fff').attr('stroke', '#007AFF').attr('stroke-width', 2).attr('cursor', 'grab');
          h.call(d3.drag().container(this.svg.node())
            .on('start', (ev) => ev.sourceEvent && ev.sourceEvent.stopPropagation())
            .on('drag', (ev) => { const sn = this._snap(ev.x, ev.y, ev.sourceEvent && ev.sourceEvent.altKey); o[kx] = sn.x; o[ky] = sn.y; this.repaint(); })
            .on('end', () => this.commit()));
        });
      }
    },

    // Objekte 1:1 ziehen; Punkte rasten ein (Alt: frei)
    _makeDraggable(el, o) {
      let start = null, moved = false;
      el.call(d3.drag().container(this.svg.node())
        .on('start', (ev) => {
          if (ev.sourceEvent) ev.sourceEvent.stopPropagation();
          moved = false;
          const pos = this._objPos(o);
          start = { mx: ev.x, my: ev.y, ...(o.type === 'arrow' ? { x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2 } : o.type === 'text' ? { x: o.x, y: o.y } : pos) };
        })
        .on('drag', (ev) => {
          const dx = ev.x - start.mx, dy = ev.y - start.my;
          if (!moved && Math.hypot(dx, dy) < 3) return;   // kleine Bewegung = Klick
          moved = true;
          const free = ev.sourceEvent && ev.sourceEvent.altKey;
          if (o.type === 'point') {
            const s = this._snap(this.xs(start.x) + dx, this.ys(start.y) + dy, free);
            o.x = this._numStr(s.x); o.y = this._numStr(s.y); this._buildObj(o);
          } else if (o.type === 'vline') {
            const s = this._snap(this.xs(start.x) + dx, this.PT + 1, free);
            o.x = this._numStr(s.x); this._buildObj(o);
          } else if (o.type === 'text') {
            o.x = this.xs.invert(this.xs(start.x) + dx); o.y = this.ys.invert(this.ys(start.y) + dy);
          } else if (o.type === 'arrow') {
            const ux = this.xs.invert(this.xs(0) + dx), uy = this.ys.invert(this.ys(0) + dy);
            o.x1 = start.x1 + ux; o.x2 = start.x2 + ux; o.y1 = start.y1 + uy; o.y2 = start.y2 + uy;
          }
          this.repaint();
        })
        .on('end', () => {
          this._select(o);
          this.repaint();
          if (moved) { this.syncObjects(); this.commit(); }
        }));
    },

    // ── Liste in der Seitenleiste ──
    _objTitle(o) {
      if (o.type === 'point') {
        const pos = this._objPos(o);
        return o.name + (pos ? '(' + this.fmtPt(pos.x) + ' | ' + this.fmtPt(pos.y) + ')' : '');
      }
      if (o.type === 'vline') { const pos = this._objPos(o); return 'x = ' + (pos ? this.fmtPt(pos.x) : o.x); }
      if (o.type === 'text') return '„' + o.text + '“';
      return o.double ? 'Doppelpfeil' : 'Pfeil';
    },

    syncObjects() {
      const list = this.els.objList;
      if (!list) return;
      const open = new Set([...list.querySelectorAll('.item.open')].map(e => +e.dataset.id));
      list.innerHTML = '';
      this.els.objGroup.hidden = !this.objs.length;
      this.objs.forEach(o => list.appendChild(this._objItem(o, open.has(o.id))));
    },

    _objItem(o, open) {
      const item = document.createElement('div');
      item.className = 'item' + (o.err ? ' has-error' : '') + (open ? ' open' : '') + (this.selected && this.selected.id === o.id ? ' selected' : '');
      item.dataset.id = o.id;
      const row = document.createElement('div'); row.className = 'item-row';
      const dot = document.createElement('label'); dot.className = 'color-dot' + (o.vis ? '' : ' off'); dot.style.background = this._objCol(o);
      const cp = document.createElement('input'); cp.type = 'color'; cp.value = o.col;
      cp.addEventListener('input', () => { o.col = cp.value; dot.style.background = o.col; this.repaint(); });
      cp.addEventListener('change', () => this.commit());
      dot.appendChild(cp);
      const main = document.createElement('div'); main.className = 'item-main';
      main.innerHTML = '<div class="item-title">' + esc(this._objTitle(o)) + '</div><div class="item-sub">' + TYPE_NAMES[o.type] + (o.err ? '' : '') + '</div>';
      if (o.err) { const er = document.createElement('div'); er.className = 'item-error'; er.textContent = o.err; main.appendChild(er); }
      if (o.type === 'point' || o.type === 'vline') {
        main.title = 'Klicken zum Bearbeiten';
        const src = o.type === 'point' ? o.name + '(' + o.x + ' | ' + o.y + ')' : 'x = ' + o.x;
        main.addEventListener('click', () => this._inlineEdit(main, src, (v) => this._editObj(o, v)));
      } else if (o.type === 'text') {
        main.addEventListener('click', () => this._inlineEdit(main, o.text, (v) => { o.text = v; this._afterObjChange(); this.commit(); return true; }));
      } else main.addEventListener('click', () => { this._select(o); this.repaint(); });
      const acts = document.createElement('div'); acts.className = 'item-actions';
      const btn = (icon, title, cb, cls) => {
        const b = document.createElement('button'); b.className = 'icon-btn' + (cls ? ' ' + cls : '');
        b.innerHTML = Icons.svg(icon); b.title = title;
        b.addEventListener('click', (e) => { e.stopPropagation(); cb(); }); acts.appendChild(b);
      };
      btn(o.vis ? 'eye' : 'eyeOff', o.vis ? 'Ausblenden' : 'Einblenden', () => { o.vis = !o.vis; this.syncObjects(); this.repaint(); this.commit(); });
      btn('chevron', 'Einstellungen', () => item.classList.toggle('open'), 'disclose');
      row.append(dot, main, acts);

      const det = document.createElement('div'); det.className = 'item-detail';
      const sw = (label, key) => {
        const c = document.createElement('input'); c.type = 'checkbox'; c.className = 'switch'; c.checked = !!o[key];
        c.addEventListener('change', () => { o[key] = c.checked; this.syncObjects(); this.repaint(); this.commit(); });
        this._detailRow(det, label, c);
      };
      if (o.type === 'point') { sw('Name anzeigen', 'showName'); sw('Koordinaten anzeigen', 'showCoords'); sw('Hilfslinien zu den Achsen', 'guides'); }
      if (o.type === 'vline') {
        sw('Gleichung anzeigen', 'showEq');
        this._detailRow(det, 'Linie', this._miniSeg([['solid', '—'], ['dash', '– –']], o.dash || 'dash', (v) => { o.dash = v; this.repaint(); this.commit(); }));
      }
      if (o.type === 'text') {
        const r = document.createElement('input'); r.type = 'range'; r.min = 9; r.max = 40; r.step = 1; r.value = o.size || this.style.fontSize;
        r.addEventListener('input', () => { o.size = +r.value; this.repaint(); });
        r.addEventListener('change', () => this.commit());
        this._detailRow(det, 'Größe', r);
        sw('Fett', 'bold');
      }
      if (o.type === 'arrow') {
        sw('Doppelpfeil', 'double');
        const r = document.createElement('input'); r.type = 'range'; r.min = 1; r.max = 6; r.step = 0.5; r.value = o.width || 2;
        r.addEventListener('input', () => { o.width = +r.value; this.repaint(); });
        r.addEventListener('change', () => this.commit());
        this._detailRow(det, 'Stärke', r);
      }
      const acts2 = document.createElement('div'); acts2.className = 'detail-actions';
      const del = document.createElement('button'); del.className = 'btn btn-gray btn-sm'; del.style.color = 'var(--red)';
      del.innerHTML = Icons.svg('trash') + 'Löschen';
      del.addEventListener('click', () => this.removeObj(o.id));
      acts2.appendChild(del);
      det.appendChild(acts2);
      item.append(row, det);
      return item;
    },

    _editObj(o, raw) {
      const d = MP.parseDefinition(raw);
      if (o.type === 'point' && d.kind === 'point') {
        const c = this.checkObjectDef(d);
        if (c.error) { this._toast(c.error); return false; }
        if (d.name !== o.name && this.objs.some(p => p !== o && p.type === 'point' && p.name === d.name)) { this._toast(d.name + ' gibt es schon'); return false; }
        Object.assign(o, { name: d.name, x: d.x, y: d.y });
      } else if (o.type === 'vline' && d.kind === 'vline') {
        const c = this.checkObjectDef(d);
        if (c.error) { this._toast(c.error); return false; }
        o.x = d.x;
      } else { this._toast(o.type === 'point' ? 'Format: A(2|3)' : 'Format: x = 2'); return false; }
      this._afterObjChange();
      this.commit();
      return true;
    },
  });
})();
