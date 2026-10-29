// Eigene, frei gezeichnete Linien-Icons (24×24) – keine SF Symbols oder fremden Icon-Sätze.
// Verwendung im HTML: <i data-icon="home"></i> – wird beim Start durch SVG ersetzt.
const Icons = (() => {
  const P = {
    home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h5v-5.5h3V20h5V9.5"/>',
    select: '<path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/>',
    move: '<path d="M12 3v18M3 12h18M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5"/>',
    tangent: '<path d="M3 19c4-1 6-9 9-9s5 4 9 5"/><path d="M4 6l16 8" stroke-dasharray="2.5 2.5"/>',
    point: '<circle cx="12" cy="12" r="3.2" fill="currentColor"/><circle cx="12" cy="12" r="7.5"/>',
    text: '<path d="M5 6.5V5h14v1.5M12 5v14M9 19h6"/>',
    arrow: '<path d="M5 19 19 5M10 5h9v9"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
    share: '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M8.5 10.5H7A1.5 1.5 0 0 0 5.5 12v7A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5h-1.5"/>',
    export: '<path d="M12 14.5V3.5M8 10.5l4 4 4-4"/><path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15"/>',
    undo: '<path d="M9 14 4.5 9.5 9 5"/><path d="M4.5 9.5H15a4.5 4.5 0 0 1 0 9h-3"/>',
    redo: '<path d="m15 14 4.5-4.5L15 5"/><path d="M19.5 9.5H9a4.5 4.5 0 0 0 0 9h3"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.9-1.1 1.6v.6"/><circle cx="12" cy="16.8" r=".6" fill="currentColor"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
    pause: '<path d="M8 5.5v13M16 5.5v13" stroke-width="3"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M2.5 12S6 5.5 12 5.5c1.6 0 3 .4 4.2 1M21.5 12S18 18.5 12 18.5c-1.6 0-3-.4-4.2-1"/><path d="M4 20 20 4"/>',
    trash: '<path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l1 13h9l1-13M10 10v6M14 10v6"/>',
    more: '<circle cx="6" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18" cy="12" r="1.3" fill="currentColor"/>',
    table: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 10h17M3.5 14.5h17M9.5 10v9"/>',
    folder: '<path d="M3.5 7V18a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5V9.5A1.5 1.5 0 0 0 19 8h-7l-2-2.5H5A1.5 1.5 0 0 0 3.5 7z"/>',
    save: '<path d="M5 3.5h11l3.5 3.5v12A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5z"/><path d="M8 3.5v5h7v-5M7.5 20.5v-6h9v6"/>',
    templates: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    print: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    chart: '<path d="M4 20h16"/><rect x="5" y="13" width="3" height="7"/><rect x="9" y="7" width="3" height="13"/><rect x="13" y="10" width="3" height="10"/><rect x="17" y="15" width="3" height="5"/>',
    pen: '<path d="M14.5 5.5l4 4L8.5 19.5 3.5 20.5l1-5z"/><path d="M12.5 7.5l4 4"/>',
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    wand: '<path d="M4 20 15 9"/><path d="M14.5 4.5v2M18.5 8.5h2M17.3 5.7l1.4-1.4M13 9l2 2"/><path d="M8.5 4l.6 1.4L10.5 6l-1.4.6L8.5 8l-.6-1.4L6.5 6l1.4-.6zM19 13l.5 1.2 1.2.5-1.2.5L19 16.4l-.5-1.2-1.2-.5 1.2-.5z" fill="currentColor" stroke="none"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.3" fill="currentColor"/><circle cx="15" cy="15" r="1.3" fill="currentColor"/><circle cx="15" cy="9" r="1.3" fill="currentColor"/><circle cx="9" cy="15" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
    integral: '<path d="M15.5 4.5c-1.5-1.5-4-.5-4 2v11c0 2.5-2.5 3.5-4 2"/>',
    derive: '<path d="M4 18c3 0 4-12 8-12s5 12 8 12"/><path d="M15 4l2 2 3-3" />',
    data: '<path d="M4 4v16h16"/><circle cx="8.5" cy="14.5" r="1.4" fill="currentColor"/><circle cx="12" cy="11" r="1.4" fill="currentColor"/><circle cx="16" cy="9.5" r="1.4" fill="currentColor"/><circle cx="18.5" cy="6" r="1.4" fill="currentColor"/>',
    grid: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    doc: '<path d="M6.5 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M13.5 3.5V7.5h4M8.5 12h7M8.5 15.5h7"/>',
    line: '<path d="M4 20 20 4"/><circle cx="4" cy="20" r="1.5" fill="currentColor"/>',
    vline: '<path d="M12 3v18" stroke-dasharray="3 2.5"/><path d="M4 20h16"/>',
  };

  function svg(name, cls) {
    const body = P[name] || P.help;
    return `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  }

  function hydrate(root) {
    (root || document).querySelectorAll('i[data-icon]').forEach(el => {
      el.outerHTML = svg(el.dataset.icon, el.className);
    });
  }

  return { svg, hydrate, names: Object.keys(P) };
})();
