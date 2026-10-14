// Plotoria 2.0 – Start: Module verknüpfen, App starten, Offline-Betrieb aktivieren
(() => {
  const P = window.Plotoria;

  // Zusätzliche Zustände der Module in Undo, Autospeichern, Links und Projektdateien
  P._serializeExtra = function (o) {
    if (this.objs.length) o.objs = this._serializeObjs();
    if (this.datasets.length) o.data = this.datasets.map(({ id, ...d }) => d);
    if (this.table) o.table = { ...this.table, blanks: Object.keys(this.table.blanks) };
  };

  P._loadExtra = function (st) {
    this.objs = (st.objs || []).map(o => ({ vis: true, ...o, id: this.nextId++ }));
    this.datasets = (st.data || []).map(d => ({ vis: true, ...d, id: this.nextId++ }));
    if (st.table) {
      const blanks = {};
      (st.table.blanks || []).forEach(k => { blanks[k] = 1; });
      this.table = { start: -3, end: 3, step: 1, orient: 'h', ...st.table, blanks };
    }
    if (this._tableOn) this.renderTable();
  };

  const boot = () => {
    P.init();
    // Offline-Betrieb (nur über http/https, nicht bei file://)
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* ohne Offline-Modus weiter */ });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
