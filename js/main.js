// Plotoria 3.1 – Start: Module verknüpfen, App starten, Offline-Betrieb aktivieren
(() => {
  const P = window.Plotoria;

  // Zusätzliche Zustände der Module in Undo, Autospeichern, Links und Projektdateien
  P._serializeExtra = function (o) {
    if (this.objs.length) o.objs = this._serializeObjs();
    if (this.datasets.length) o.data = this.datasets.map(({ id, ...d }) => d);
    if (this.table) o.table = { ...this.table, blanks: Object.keys(this.table.blanks) };
    if (this.dists && this.dists.length) o.dists = this.dists.map(({ id, _pmf, _pmfKey, ...d }) => d);
    if (this.sketches && this.sketches.length) o.sk = this.sketches.map(s => ({ c: s.c, w: s.w, p: s.p }));
  };

  P._loadExtra = function (st) {
    this.objs = (st.objs || []).map(o => ({ vis: true, ...o, id: this.nextId++ }));
    this.datasets = (st.data || []).map(d => ({ vis: true, ...d, id: this.nextId++ }));
    this.dists = (st.dists || []).map(d => ({ ...this._distDefaults(d), id: this.nextId++ }));
    this.sketches = (st.sk || []).filter(s => Array.isArray(s.p)).map(s => ({ c: s.c || '#FF2D55', w: s.w || 3, p: s.p.slice() }));
    if (st.table) {
      const blanks = {};
      (st.table.blanks || []).forEach(k => { blanks[k] = 1; });
      this.table = { start: -3, end: 3, step: 1, orient: 'h', ...st.table, blanks };
    }
    if (this._tableOn) this.renderTable();
  };

  // ── Hinweis zur Speicherung: bei jedem Start, von der Seite selbst angezeigt ──
  // Vor der Entscheidung wird nichts auf dem Gerät gelesen oder gespeichert.
  P.askConsent = function () {
    const d = document.getElementById('consent-sheet');
    let decided = false;
    const decide = (ok) => {
      if (decided) return;
      decided = true;
      if (d.open) d.close();
      if (ok) this._allowStorage(); else this._denyStorage();
      const st = document.getElementById('consent-status');
      if (st) st.textContent = ok ? 'Speichern ist erlaubt.' : 'Speichern ist abgelehnt.';
      if (window.matchMedia && !window.matchMedia('(pointer: coarse)').matches) this.els.inp.focus();
    };
    document.getElementById('consent-allow').onclick = () => decide(true);
    document.getElementById('consent-deny').onclick = () => decide(false);
    d.addEventListener('cancel', (e) => e.preventDefault());   // Esc schließt nicht ohne Entscheidung
    d.addEventListener('close', () => decide(false));            // falls der Browser doch schließt
    d.showModal();
  };

  P._allowStorage = function () {
    this.storageOK = true;
    const tabs = this._readStoredTabs && this._readStoredTabs();
    if (tabs) {
      // Tabs wiederherstellen; ein geöffneter Link kommt als zusätzlicher Tab dazu
      if (this.restoreTabs(tabs, this._fromLink) && !this._fromLink) {
        this._toast(tabs.docs.length > 1 ? 'Letzter Arbeitsstand wiederhergestellt (' + tabs.docs.length + ' Tabs)' : 'Letzter Arbeitsstand wiederhergestellt');
      }
    } else if (!this._fromLink) {
      const st = this._readStoredState();
      if (st) {
        this.load(st);
        this.hist = []; this.histPos = -1;
        this.commit();
        if (this.renderTabs) this.renderTabs();
        this._toast('Letzter Arbeitsstand wiederhergestellt');
      }
    }
    this._readStoredPrint();
    if (this._readOwnTemplates) this._readOwnTemplates();
    this._scheduleSave();
    // Offline-Betrieb (nur über http/https, nicht bei file://)
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* ohne Offline-Modus weiter */ });
    }
  };

  P._denyStorage = function () {
    this.storageOK = false;
    clearTimeout(this._st);
    // Bereits gespeicherte Plotoria-Daten entfernen
    try { [this.STORAGE_KEY, this.PRINT_KEY, this.TEMPLATE_KEY, this.TABS_KEY].forEach(k => localStorage.removeItem(k)); } catch (e) { /* nicht verfügbar */ }
    if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
      navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
    }
    if (window.caches) caches.keys().then(ks => ks.filter(k => k.startsWith('plotoria')).forEach(k => caches.delete(k))).catch(() => {});
    this._toast('Es wird nichts gespeichert – Projekt bei Bedarf mit Strg+S als Datei sichern');
  };

  const boot = () => P.init();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
