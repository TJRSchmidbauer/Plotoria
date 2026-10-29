// Plotoria 3.1 – Tabs: mehrere Graphen gleichzeitig bearbeiten
// Jeder Tab hat seinen eigenen Stand und eigenen Rückgängig-Verlauf. Der Druckbogen gilt für alle Tabs gemeinsam.
(() => {
  const P = window.Plotoria;
  const $ = id => document.getElementById(id);
  const TABS_KEY = 'plotoria-tabs-v1';
  P.TABS_KEY = TABS_KEY;

  Object.assign(P, {
    docs: [], docId: null, _docNo: 0,

    initTabs() {
      this.els.tabList = $('doc-tab-list');
      $('doc-tab-add').addEventListener('click', () => this.newDoc());
      this.docs = [this._makeDoc(null)];
      this.docId = this.docs[0].id;
      this.els.hTitle.addEventListener('input', () => this.renderTabs());
      this.renderTabs();
    },

    _makeDoc(state) {
      this._docNo++;
      return { id: 'd' + Date.now().toString(36) + this._docNo, no: this._docNo, state, hist: [], histPos: -1, rt: null };
    },

    _doc(id) { return this.docs.find(d => d.id === (id || this.docId)); },

    // Leerer Stand für einen neuen Tab: Standardfenster, aktuelles Farbthema
    _blankState() {
      const v = this.DEFAULT_VIEW;
      return {
        v: 2, app: 'plotoria', title: '', deg: false, theme: this.theme, smart: false, prop: true,
        style: { ...this.DEFAULT_STYLE, ...this._theme().style, fontSize: this.style.fontSize },
        view: [v.xMin, v.xMax, v.yMin, v.yMax], home: [v.xMin, v.xMax, v.yMin, v.yMax], params: {}, fns: [],
      };
    },

    _docEmpty(st) {
      if (!st) return true;
      return !(st.fns || []).length && !(st.objs || []).length && !(st.data || []).length && !(st.dists || []).length && !(st.sk || []).length && !st.title;
    },

    currentDocEmpty() { return this._docEmpty(this.serialize()); },

    // Stand des aktiven Tabs festhalten (vor dem Wechsel)
    _stashDoc() {
      const d = this._doc();
      if (!d) return;
      if (this._toolCancel) this._toolCancel();
      if (this._sketchCancel) this._sketchCancel();
      d.state = this.serialize();
      d.hist = this.hist; d.histPos = this.histPos;
      // Funktionen bekommen beim Laden neue IDs – daher über die Position merken
      const at = (id) => this.fns.findIndex(f => f.id === id);
      d.rt = {
        integral: this.integral ? { ...this.integral, fnAt: at(this.integral.fnId) } : null,
        tangent: this.tangent ? { ...this.tangent, fnAt: at(this.tangent.fnId) } : null,
        reveal: this.reveal, selectionRect: this.selectionRect,
      };
    },

    _activate(d) {
      this.docId = d.id;
      this.load(d.state || this._blankState());
      this.hist = d.hist || []; this.histPos = d.histPos ?? -1;
      if (!this.hist.length) this.commit();
      else this._updateUndoButtons();
      // Laufzeitzustand, der nicht gespeichert wird (Integral, Tangente, Lösung)
      const rt = d.rt || {};
      this.reveal = !!rt.reveal;
      const fnAt = (o) => (o && o.fnAt >= 0 ? this.fns[o.fnAt] : null);
      if (fnAt(rt.tangent) && fnAt(rt.tangent).f) this.tangent = this._tangentAt(fnAt(rt.tangent), rt.tangent.x);
      this.selectionRect = rt.selectionRect || null;
      if (fnAt(rt.integral)) {
        const { fnAt: i, ...ig } = rt.integral;
        this.integral = { ...ig, fnId: this.fns[i].id };
        this.els.hint.hidden = false;
        this.els.hintText.textContent = 'Grenzen a, b ziehen';
        this._syncIntegralCtl();
      }
      if (this._syncSolution) this._syncSolution();
      this.sync();
      this.repaint();
      this.renderTabs();
      this._scheduleSave();
    },

    switchDoc(id) {
      if (id === this.docId) return;
      const d = this._doc(id);
      if (!d) return;
      this._stashDoc();
      this._activate(d);
    },

    // Neuer Tab, leer oder mit einem Stand (Vorlage, Projektdatei, Link)
    newDoc(state) {
      this._stashDoc();
      const d = this._makeDoc(state ? JSON.parse(JSON.stringify(state)) : null);
      const i = this.docs.findIndex(x => x.id === this.docId);
      this.docs.splice(i + 1, 0, d);
      this._activate(d);
      requestAnimationFrame(() => {
        const el = this.els.tabList.querySelector('.doc-tab.active');
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
      if (!state && window.matchMedia && !window.matchMedia('(pointer: coarse)').matches) this.els.inp.focus();
      return d;
    },

    // Stand öffnen: im aktuellen Tab, wenn er leer ist, sonst in einem neuen
    openState(st) {
      if (this.currentDocEmpty()) { this.load(st); this.commit(); this.renderTabs(); return false; }
      this.newDoc(st);
      return true;
    },

    closeDoc(id) {
      const i = this.docs.findIndex(d => d.id === id);
      if (i < 0) return;
      const active = id === this.docId;
      if (active) this._stashDoc();
      const d = this.docs[i];
      const title = this._docTitle(d);
      this.docs.splice(i, 1);
      if (!this.docs.length) this.docs.push(this._makeDoc(null));
      if (active) this._activate(this.docs[Math.min(i, this.docs.length - 1)]);
      else { this.renderTabs(); this._scheduleSave(); }
      if (!this._docEmpty(d.state)) {
        this._toast('„' + title + '“ geschlossen', { label: 'Wiederherstellen', run: () => this._restoreDoc(d, i) });
      }
    },

    _restoreDoc(d, i) {
      if (this.docs.some(x => x.id === d.id)) return;
      this._stashDoc();
      // einen leeren, unberührten Tab ersetzen statt daneben zu legen
      const cur = this._doc();
      if (this.docs.length === 1 && cur && this._docEmpty(cur.state) && cur.hist.length <= 1) this.docs = [];
      this.docs.splice(Math.min(i, this.docs.length), 0, d);
      this._activate(d);
    },

    _docTitle(d) {
      const t = d.id === this.docId ? this.graphTitle : (d.state && d.state.title);
      return (t && t.trim()) || 'Graph ' + d.no;
    },

    renderTabs() {
      const list = this.els.tabList;
      if (!list) return;
      list.innerHTML = '';
      this.docs.forEach((d, i) => {
        const on = d.id === this.docId;
        const tab = document.createElement('div');
        tab.className = 'doc-tab' + (on ? ' active' : '');
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', on);
        tab.tabIndex = on ? 0 : -1;
        tab.draggable = true;
        const title = this._docTitle(d);
        tab.title = title + (on ? ' – Doppelklick: umbenennen' : '');
        const s = document.createElement('span'); s.className = 'doc-tab-title'; s.textContent = title;
        const x = document.createElement('button'); x.className = 'doc-tab-close'; x.innerHTML = Icons.svg('close');
        x.title = 'Tab schließen'; x.setAttribute('aria-label', '„' + title + '“ schließen');
        x.addEventListener('click', (e) => { e.stopPropagation(); this.closeDoc(d.id); });
        tab.append(s, x);
        tab.addEventListener('click', () => this.switchDoc(d.id));
        tab.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); this.closeDoc(d.id); } });
        tab.addEventListener('dblclick', () => { if (on) { this.els.hTitle.focus(); this.els.hTitle.select(); } });
        tab.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const n = this.docs[(i + (e.key === 'ArrowRight' ? 1 : -1) + this.docs.length) % this.docs.length];
            this.switchDoc(n.id);
            const el = list.querySelector('.doc-tab.active'); if (el) el.focus();
          } else if (e.key === 'Delete') { e.preventDefault(); this.closeDoc(d.id); }
        });
        // Reihenfolge per Ziehen ändern
        tab.addEventListener('dragstart', (e) => { this._dragDoc = d.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', title); tab.classList.add('dragging'); });
        tab.addEventListener('dragend', () => { this._dragDoc = null; tab.classList.remove('dragging'); });
        tab.addEventListener('dragover', (e) => { if (this._dragDoc) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } });
        tab.addEventListener('drop', (e) => {
          if (!this._dragDoc) return;
          e.preventDefault(); e.stopPropagation();
          const from = this.docs.findIndex(x => x.id === this._dragDoc);
          if (from < 0 || from === i) return;
          const [m] = this.docs.splice(from, 1);
          this.docs.splice(i, 0, m);
          this.renderTabs(); this._scheduleSave();
        });
        list.appendChild(tab);
      });
      document.title = (this.graphTitle ? this.graphTitle + ' – ' : '') + 'Plotoria';
    },

    // ── Speichern im Browser (nur mit Zustimmung) ──
    _saveTabs() {
      if (!this.storageOK) return;
      const data = {
        active: this.docs.findIndex(d => d.id === this.docId),
        docs: this.docs.map(d => ({ no: d.no, state: d.id === this.docId ? this.serialize() : d.state })).filter(d => d.state),
      };
      try { localStorage.setItem(TABS_KEY, JSON.stringify(data)); } catch (e) { /* voll oder gesperrt */ }
    },

    _readStoredTabs() {
      try {
        const d = JSON.parse(localStorage.getItem(TABS_KEY) || 'null');
        return d && Array.isArray(d.docs) && d.docs.length ? d : null;
      } catch (e) { return null; }
    },

    // Gespeicherte Tabs wiederherstellen; keepCurrent: aktueller Tab (z. B. aus einem Link) bleibt aktiv
    restoreTabs(saved, keepCurrent) {
      const docs = saved.docs.filter(x => x.state && Array.isArray(x.state.fns)).map(x => {
        const d = this._makeDoc(x.state);
        if (x.no) { d.no = x.no; this._docNo = Math.max(this._docNo, x.no); }
        return d;
      });
      if (!docs.length) return false;
      if (keepCurrent) {
        this._stashDoc();
        const cur = this._doc();
        cur.no = ++this._docNo;
        this.docs = docs.concat(cur);
        this.renderTabs();
        this._scheduleSave();
        return true;
      }
      this.docs = docs;
      this._activate(docs[Math.max(0, Math.min(saved.active || 0, docs.length - 1))]);
      return true;
    },
  });
})();
