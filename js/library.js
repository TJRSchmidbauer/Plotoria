// Plotoria 3.1 – Aufgabenbibliothek: Vorlagen nach Jahrgangsstufe (Gymnasium Bayern, Jgst. 8–13)
// Reine Daten (ohne DOM) – in Node testbar (tests/library.test.js).
// Jahrgangsstufen und Themen nach den Lernbereichen des LehrplanPLUS Mathematik (G9), z. B. M9 5 Potenzfunktionen,
// M12 3 Einseitiger Signifikanztest, M13 1 Flächeninhalt und bestimmtes Integral, M13 2 Normalverteilung.
const PlotoriaLibrary = (() => {
  // Kurzschreibweisen: fn(Definition, Zusätze), pt(Name, x, y, Zusätze)
  const fn = (s, extra) => ({ s, ...(extra || {}) });
  const pt = (name, x, y, extra) => ({ type: 'point', name, x: String(x), y: String(y), showCoords: true, showName: true, off: [8, -10], col: '#FF3B30', vis: true, ...(extra || {}) });
  const txt = (x, y, text, extra) => ({ type: 'text', x, y, text, col: '#1C1C1E', vis: true, ...(extra || {}) });

  const GRADES = [
    { id: 0, label: 'Allgemein' },
    { id: 8, label: '8' }, { id: 9, label: '9' }, { id: 10, label: '10' },
    { id: 11, label: '11' }, { id: 12, label: '12' }, { id: 13, label: '13' },
  ];

  // grade: Jahrgangsstufe (0 = allgemein); also: weitere Stufen, in denen die Vorlage ebenfalls erscheint
  const TEMPLATES = [
    // ═════════════ Jahrgangsstufe 8 ═════════════
    {
      grade: 8, topic: 'Lineare Funktionen',
      title: 'Direkte Proportionalität',
      text: 'Ursprungsgerade im Sachkontext: Preis in Abhängigkeit von der Menge, Wert ablesen.',
      view: [-0.6, 6.6, -1, 10.5], prop: false, style: { xLabel: 'Menge in kg', yLabel: 'Preis in €', xStep: '1', yStep: '1' },
      fns: [fn('p(x) = 1.5x für x ≥ 0', { lm: 'term' })],
      objs: [pt('A', 4, 6, { guides: true })],
    },
    {
      grade: 8, topic: 'Lineare Funktionen',
      title: 'Gerade y = mx + t',
      text: 'Steigung m und y-Achsenabschnitt t mit Schiebereglern erkunden.',
      view: [-5, 5, -4, 4], style: { gridMode: 'karo', karo: 2 },
      fns: [fn('f(x) = m*x + t', { lm: 'term' })],
      params: { m: { v: 0.5, min: -3, max: 3 }, t: { v: 1, min: -4, max: 4 } },
    },
    {
      grade: 8, topic: 'Lineare Funktionen',
      title: 'Geraden zuordnen',
      text: 'Drei Geraden auf Karopapier mit A, B, C – Funktionsterme bestimmen lassen.',
      view: [-4, 4, -3, 4], style: { gridMode: 'karo', karo: 2 },
      fns: [fn('f(x) = 2x - 1', { lm: 'custom', lt: 'A' }), fn('g(x) = -0.5x + 2', { lm: 'custom', lt: 'B' }), fn('h(x) = -1.5', { lm: 'custom', lt: 'C' })],
    },
    {
      grade: 8, topic: 'Lineare Funktionen', also: [0],
      title: 'Steigungsdreieck',
      text: 'Gerade mit Steigungsdreieck zwischen zwei Gitterpunkten.',
      view: [-2, 5, -1, 4], style: { gridMode: 'karo', karo: 2 },
      fns: [fn('f(x) = 0.5x + 1')],
      objs: [
        pt('P', 0, 1, { off: [-60, -10] }), pt('Q', 2, 2),
        { type: 'arrow', x1: 0, y1: 1, x2: 2, y2: 1, col: '#1C1C1E', vis: true, width: 1.5 },
        { type: 'arrow', x1: 2, y1: 1, x2: 2, y2: 2, col: '#1C1C1E', vis: true, width: 1.5 },
        txt(0.7, 0.6, 'Δx = 2'), txt(2.15, 1.4, 'Δy = 1'),
      ],
    },
    {
      grade: 8, topic: 'Lineare Funktionen',
      title: 'Geradengleichung aufstellen',
      text: 'Gerade durch A(−1 | −1) und B(3 | 1) – die Gerade ist als Lösung verborgen.',
      view: [-3, 5, -3, 3], style: { gridMode: 'karo', karo: 2 },
      fns: [fn('f(x) = 0.5x - 0.5', { sol: 1, lm: 'term' })],
      objs: [pt('A', -1, -1, { off: [-72, -8] }), pt('B', 3, 1)],
    },
    {
      grade: 8, topic: 'Lineare Funktionen',
      title: 'Nullstelle einer Geraden',
      text: 'f(x) = −0,5x + 2 schneidet die x-Achse in N(4 | 0).',
      view: [-2, 6, -2, 4], style: { gridMode: 'karo', karo: 2 },
      fns: [fn('f(x) = -0.5x + 2', { lm: 'term' })],
      objs: [pt('N', 4, 0, { off: [6, -10] })],
    },
    {
      grade: 8, topic: 'Lineare Funktionen',
      title: 'Lineare Ungleichung graphisch lösen',
      text: '0,5x + 1 > −x + 4 gilt rechts vom Schnittpunkt, also für x > 2.',
      view: [-2, 6, -2, 5], style: { gridMode: 'karo', karo: 2 },
      fns: [fn('f(x) = 0.5x + 1', { lm: 'term' }), fn('g(x) = -x + 4', { lm: 'term' })],
      objs: [pt('S', 2, 2, { off: [10, -8] }), { type: 'vline', x: '2', dash: 'dash', showEq: true, col: '#8E8E93', vis: true }],
    },
    {
      grade: 8, topic: 'Lineare Gleichungssysteme',
      title: 'Gleichungssystem graphisch lösen',
      text: 'Zwei Geraden mit Schnittpunkt S(2 | 2) – die Lösung des Gleichungssystems ablesen.',
      view: [-2, 6, -2, 5], style: { gridMode: 'karo', karo: 2 },
      fns: [fn('f(x) = 0.5x + 1', { lm: 'term' }), fn('g(x) = -x + 4', { lm: 'term' })],
      objs: [pt('S', 2, 2, { guides: true, off: [10, -8] })],
    },
    {
      grade: 8, topic: 'Lineare Gleichungssysteme',
      title: 'Parallele Geraden',
      text: 'Gleiche Steigung, verschiedener y-Achsenabschnitt: Gleichungssystem ohne Lösung.',
      view: [-4, 4, -3, 4], style: { gridMode: 'karo', karo: 2 },
      fns: [fn('f(x) = 0.5x + 2', { lm: 'term' }), fn('g(x) = 0.5x - 1', { lm: 'term' })],
    },
    {
      grade: 8, topic: 'Elementare gebrochen-rationale Funktionen',
      title: 'Indirekte Proportionalität',
      text: 'Hyperbelast y = 12/x: Anzahl der Personen und Dauer einer Arbeit, Produktgleichheit.',
      view: [-0.6, 12.6, -1, 13], prop: false, style: { xLabel: 'Anzahl der Personen', yLabel: 'Dauer in Tagen', xStep: '1', yStep: '1' },
      fns: [fn('d(x) = 12/x für x > 0', { lm: 'term' })],
      objs: [pt('A', 2, 6, { guides: true, showName: false }), pt('B', 3, 4, { guides: true, showName: false }), pt('C', 4, 3, { guides: true, showName: false }), pt('D', 6, 2, { guides: true, showName: false })],
    },
    {
      grade: 8, topic: 'Elementare gebrochen-rationale Funktionen',
      title: 'Verschobene Hyperbel',
      text: 'f(x) = 1/(x − 2) + 1 mit senkrechter und waagrechter Asymptote.',
      view: [-3, 7, -4, 6],
      fns: [fn('f(x) = 1/(x - 2) + 1', { as: 1, lm: 'term' })],
    },
    {
      grade: 8, topic: 'Elementare gebrochen-rationale Funktionen',
      title: 'Hyperbel a/(x + b) + c',
      text: 'Einfluss der Parameter a, b und c mit Schiebereglern – Asymptoten wandern mit.',
      view: [-6, 6, -5, 5],
      fns: [fn('f(x) = a/(x + b) + c', { as: 1, lm: 'term' })],
      params: { a: { v: 2, min: -4, max: 4 }, b: { v: 1, min: -4, max: 4 }, c: { v: -1, min: -3, max: 3 } },
    },

    // ═════════════ Jahrgangsstufe 9 ═════════════
    {
      grade: 9, topic: 'Quadratische Funktionen', also: [0],
      title: 'Graph ablesen',
      text: 'Parabel auf Karopapier – Werte ablesen, Scheitel bestimmen.',
      view: [-4, 4, -3, 5], style: { gridMode: 'karo', karo: 2 },
      fns: [fn('f(x) = 0.5x^2 - 2')],
    },
    {
      grade: 9, topic: 'Quadratische Funktionen',
      title: 'Verschobene Normalparabeln',
      text: 'Normalparabel und drei Verschiebungen – Scheitel und Funktionsterm zuordnen.',
      view: [-4.5, 4.5, -4, 6],
      fns: [fn('f(x) = x^2', { lm: 'custom', lt: 'A' }), fn('g(x) = (x - 2)^2', { lm: 'custom', lt: 'B' }),
        fn('h(x) = x^2 - 3', { lm: 'custom', lt: 'C' }), fn('k(x) = (x + 2)^2 + 1', { lm: 'custom', lt: 'D' })],
    },
    {
      grade: 9, topic: 'Quadratische Funktionen',
      title: 'Parabel mit Parametern',
      text: 'Scheitelform f(x) = a·(x − b)² + c: Streckung und Verschiebung mit Schiebereglern.',
      view: [-5, 5, -4, 6],
      fns: [fn('f(x) = a*(x - b)^2 + c', { lm: 'term' })],
      params: { a: { v: 1, min: -3, max: 3 }, b: { v: 1, min: -4, max: 4 }, c: { v: -2, min: -4, max: 4 } },
    },
    {
      grade: 9, topic: 'Quadratische Funktionen',
      title: 'Gestreckt, gestaucht, gespiegelt',
      text: 'Schar f_a(x) = a·x² für a = −1; 0,5; 1; 2.',
      view: [-3, 3, -4, 5],
      fns: [fn('f_a(x) = a*x^2 für a = -1; 0.5; 1; 2')],
    },
    {
      grade: 9, topic: 'Quadratische Funktionen',
      title: 'Parabel durch drei Punkte',
      text: 'A(0 | −1), B(2 | −1), C(3 | 2) – die Parabel f(x) = x² − 2x − 1 ist als Lösung verborgen.',
      view: [-2, 4, -3, 4], style: { gridMode: 'karo', karo: 2 },
      fns: [fn('f(x) = x^2 - 2x - 1', { sol: 1, lm: 'term' })],
      objs: [pt('A', 0, -1, { off: [-66, -8] }), pt('B', 2, -1), pt('C', 3, 2, { off: [-62, -6] })],
    },
    {
      grade: 9, topic: 'Quadratische Funktionen',
      title: 'Wurfparabel (Sachaufgabe)',
      text: 'Höhe eines Balls h(t) = −5t² + 10t + 1,5 mit Scheitel S(1 | 6,5).',
      view: [-0.3, 2.6, -0.8, 7.6], prop: false, style: { xLabel: 't in s', yLabel: 'h in m', xStep: '0.5', yStep: '1' },
      fns: [fn('h(t) = -5t^2 + 10t + 1.5 für 0 ≤ t ≤ 2.14', { lm: 'term' })],
      objs: [pt('S', 1, 6.5, { guides: true })],
    },
    {
      grade: 9, topic: 'Quadratische Gleichungen',
      title: 'Anzahl der Nullstellen',
      text: 'Drei Parabeln mit zwei, einer und keiner Nullstelle – Zusammenhang mit der Diskriminante.',
      view: [-3, 5, -5, 7], smart: true,
      fns: [fn('f(x) = x^2 - 2x - 3'), fn('g(x) = x^2 - 2x + 1'), fn('h(x) = x^2 - 2x + 3')],
    },
    {
      grade: 9, topic: 'Quadratische Gleichungen',
      title: 'Parabel und Gerade',
      text: 'Schnittpunkte von Parabel und Gerade – x² − 2 = x graphisch lösen.',
      view: [-4, 4, -3, 5], smart: true, style: { exact: true },
      fns: [fn('f(x) = x^2 - 2', { lm: 'term' }), fn('g(x) = x', { lm: 'term' })],
    },
    {
      grade: 9, topic: 'Quadratwurzeln',
      title: 'Umkehrfunktion',
      text: 'Quadratwurzel als Umkehrfunktion: f(x) = x² für x ≥ 0 an y = x gespiegelt ergibt y = √x.',
      view: [-1, 5, -1, 5],
      fns: [fn('f(x) = x^2 für x ≥ 0'), { i: 0, ds: 'dash' }],
    },
    {
      grade: 9, topic: 'Potenzfunktionen',
      title: 'Potenzfunktionen x^n',
      text: 'Schar f_n(x) = xⁿ für n = 1; 2; 3; 4 – Symmetrie und Verlauf vergleichen.',
      view: [-2, 2, -3, 3],
      fns: [fn('f_n(x) = x^n für n = 1; 2; 3; 4')],
    },
    {
      grade: 9, topic: 'Potenzfunktionen',
      title: 'Negative Exponenten',
      text: 'f(x) = x⁻¹ und g(x) = x⁻² mit Asymptoten.',
      view: [-4, 4, -4, 4],
      fns: [fn('f(x) = x^(-1)', { as: 1, lm: 'term' }), fn('g(x) = x^(-2)', { as: 1, lm: 'term' })],
    },
    {
      grade: 9, topic: 'Potenzfunktionen',
      title: 'Gerade und ungerade Exponenten',
      text: 'x², x⁴ (achsensymmetrisch) und x³, x⁵ (punktsymmetrisch) – alle durch (1 | 1).',
      view: [-1.8, 1.8, -2, 2],
      fns: [fn('f(x) = x^2'), fn('g(x) = x^4', { ds: 'dash' }), fn('h(x) = x^3'), fn('k(x) = x^5', { ds: 'dash' })],
      objs: [pt('P', 1, 1, { showCoords: false, off: [8, 16] })],
    },

    // ═════════════ Jahrgangsstufe 10 ═════════════
    {
      grade: 10, topic: 'Exponentielles Wachstum und Logarithmus',
      title: 'Exponentialfunktionen b^x',
      text: 'Schar f_b(x) = bˣ für b = 0,5; 2; 3 – alle durch (0 | 1).',
      view: [-3, 3, -1, 6],
      fns: [fn('f_b(x) = b^x für b = 0.5; 2; 3')],
      objs: [pt('P', 0, 1, { off: [10, 18] })],
    },
    {
      grade: 10, topic: 'Exponentielles Wachstum und Logarithmus',
      title: 'Exponentialfunktion a · b^x',
      text: 'Anfangswert a und Wachstumsfaktor b mit Schiebereglern.',
      view: [-3, 4, -1, 8],
      fns: [fn('f(x) = a*b^x', { lm: 'term', as: 1 })],
      params: { a: { v: 1, min: -3, max: 4 }, b: { v: 2, min: 0.1, max: 4 } },
    },
    {
      grade: 10, topic: 'Exponentielles Wachstum und Logarithmus',
      title: 'Wachstum (Sachaufgabe)',
      text: 'Exponentielles Wachstum mit Einheiten an den Achsen und Definitionsbereich.',
      view: [-0.8, 8.5, -5, 55], prop: false, style: { xLabel: 't in h', yLabel: 'N in Tausend', xStep: '1', yStep: '10' },
      fns: [fn('N(t) = 2*1.5^t für 0 ≤ t ≤ 8', { lm: 'term' })],
    },
    {
      grade: 10, topic: 'Exponentielles Wachstum und Logarithmus',
      title: 'Zinseszins',
      text: 'Kapital K(t) = 1000 · 1,03^t: Verdopplungszeit ablesen.',
      view: [-2, 32, -150, 2700], prop: false, style: { xLabel: 't in Jahren', yLabel: 'K in €', xStep: '5', yStep: '500' },
      fns: [fn('K(t) = 1000*1.03^t für t ≥ 0', { lm: 'term' })],
      objs: [pt('V', 23.45, 2000, { guides: true, showCoords: false, off: [-24, -12] })],
    },
    {
      grade: 10, topic: 'Exponentielles Wachstum und Logarithmus',
      title: 'Halbwertszeit',
      text: 'Radioaktiver Zerfall N(t) = 100 · 0,5^(t/5) – Halbwertszeit ablesen.',
      view: [-1.5, 26, -8, 112], prop: false, style: { xLabel: 't in Jahren', yLabel: 'N in %', xStep: '5', yStep: '10' },
      fns: [fn('N(t) = 100*0.5^(t/5) für t ≥ 0', { lm: 'term' })],
      objs: [pt('A', 5, 50, { guides: true }), pt('B', 10, 25, { guides: true })],
    },
    {
      grade: 10, topic: 'Exponentielles Wachstum und Logarithmus',
      title: 'Exponentialgleichung graphisch lösen',
      text: '2ˣ = 5 ablesen: x = log₂(5) ≈ 2,32.',
      view: [-2, 4, -1, 7],
      fns: [fn('f(x) = 2^x', { lm: 'term' }), fn('g(x) = 5', { ds: 'dash', lm: 'term' })],
      objs: [pt('P', 'log(2, 5)', 5, { guides: true, off: [10, 18] })],
    },
    {
      grade: 10, topic: 'Exponentielles Wachstum und Logarithmus',
      title: 'Logarithmus als Umkehrfunktion',
      text: 'f(x) = 2ˣ an y = x gespiegelt ergibt y = log₂(x).',
      view: [-3, 5, -3, 5],
      fns: [fn('f(x) = 2^x'), { i: 0, ds: 'dash' }],
    },
    {
      grade: 10, topic: 'Sinus- und Kosinusfunktion',
      title: 'Sinus im Gradmaß',
      text: 'sin(x) von 0° bis 360°, x-Achse in 90°-Schritten.',
      view: [-20, 380, -1.5, 1.5], deg: true, prop: false, style: { xStep: '90', yStep: '0.5' },
      fns: [fn('f(x) = sin(x)')],
    },
    {
      grade: 10, topic: 'Sinus- und Kosinusfunktion',
      title: 'Trigonometrie im Bogenmaß',
      text: 'sin und cos mit Achsenbeschriftung in Vielfachen von π.',
      view: [-0.5, 7, -1.6, 1.6], prop: false, style: { xFmt: 'pi', xStep: 'pi/2', yStep: '0.5' },
      fns: [fn('f(x) = sin(x)'), fn('g(x) = cos(x)', { ds: 'dash' })],
    },
    {
      grade: 10, topic: 'Sinus- und Kosinusfunktion',
      title: 'Allgemeine Sinusfunktion',
      text: 'f(x) = a·sin(b·(x − c)) + d: Amplitude, Periode und Verschiebung mit Schiebereglern.',
      view: [-0.8, 7, -4, 4], prop: false, style: { xFmt: 'pi', xStep: 'pi/2', yStep: '1' },
      fns: [fn('f(x) = a*sin(b*(x - c)) + d', { lm: 'term' }), fn('g(x) = sin(x)', { ds: 'dash' })],
      params: { a: { v: 2, min: -3, max: 3 }, b: { v: 1, min: 0.5, max: 4 }, c: { v: 0, min: -3.2, max: 3.2 }, d: { v: 0, min: -2, max: 2 } },
    },
    {
      grade: 10, topic: 'Sinus- und Kosinusfunktion',
      title: 'Periode bestimmen',
      text: 'f(x) = 2·sin(πx/2): Amplitude 2, Periode 4 – Term als Lösung verborgen.',
      view: [-0.5, 8.5, -2.6, 2.6], prop: false, style: { xStep: '1', yStep: '1', gridMode: 'karo', karo: 2 },
      fns: [fn('f(x) = 2sin(pi*x/2)', { lm: 'none' }), fn('g(x) = 2sin(pi*x/2)', { sol: 1, lm: 'term', ds: 'dash' })],
    },
    {
      grade: 10, topic: 'Ganzrationale Funktionen',
      title: 'Nullstellen aus Linearfaktoren',
      text: 'f(x) = 0,5(x + 2)(x − 1)(x − 3) – Nullstellen und Vorzeichenwechsel.',
      view: [-3, 4, -3, 4.5], smart: true,
      fns: [fn('f(x) = 0.5(x + 2)(x - 1)(x - 3)', { lm: 'term' })],
    },
    {
      grade: 10, topic: 'Ganzrationale Funktionen',
      title: 'Symmetrie',
      text: 'Achsensymmetrisch (gerade Exponenten) und punktsymmetrisch (ungerade Exponenten).',
      view: [-3, 3, -3, 3],
      fns: [fn('f(x) = 0.5x^4 - 2x^2 + 1'), fn('g(x) = x^3 - 2x')],
    },
    {
      grade: 10, topic: 'Ganzrationale Funktionen',
      title: 'Verhalten im Unendlichen',
      text: 'Vier ganzrationale Funktionen – der Term höchster Potenz entscheidet. Zuordnen A–D.',
      view: [-3, 3, -4, 4],
      fns: [fn('f(x) = 0.5x^3 - x', { lm: 'custom', lt: 'A' }), fn('g(x) = -0.5x^3 + 2x', { lm: 'custom', lt: 'B' }),
        fn('h(x) = 0.25x^4 - x^2', { lm: 'custom', lt: 'C' }), fn('k(x) = -0.25x^4 + x^2 + 1', { lm: 'custom', lt: 'D' })],
    },
    {
      grade: 10, topic: 'Ganzrationale Funktionen', also: [0],
      title: 'Graphen zuordnen',
      text: 'Vier Graphen verschiedener Funktionstypen mit A–D, ohne Funktionsterme.',
      view: [-4, 4, -4, 4],
      fns: [fn('f(x) = 0.5x + 1', { lm: 'custom', lt: 'A' }), fn('g(x) = -x^2 + 3', { lm: 'custom', lt: 'B' }),
        fn('h(x) = 2^x - 3', { lm: 'custom', lt: 'C' }), fn('k(x) = 1/(x + 2)', { lm: 'custom', lt: 'D' })],
    },

    // ═════════════ Jahrgangsstufe 11 ═════════════
    {
      grade: 11, topic: 'Spezielle Eigenschaften von Funktionen',
      title: 'Graph verschieben und strecken',
      text: 'g(x) = a·f(x − b) + c: Einfluss der Parameter auf den Graphen von f.',
      view: [-4, 4, -3, 4],
      fns: [fn('f(x) = x^3 - 2x', { ds: 'dash' }), fn('g(x) = a*f(x - b) + c')],
      params: { a: { v: 1, min: -2, max: 2 }, b: { v: 1, min: -3, max: 3 }, c: { v: 1, min: -3, max: 3 } },
    },
    {
      grade: 11, topic: 'Spezielle Eigenschaften von Funktionen',
      title: 'Funktionsschar',
      text: 'f_a(x) = a·x² − 2 für mehrere a, jede Kurve beschriftet.',
      view: [-3, 3, -3, 5],
      fns: [fn('f_a(x) = a*x^2 - 2 für a = 0.5; 1; 2')],
    },
    {
      grade: 11, topic: 'Spezielle Eigenschaften von Funktionen',
      title: 'Abschnittsweise definiert',
      text: 'Funktion mit Sprungstelle – Randpunkte gefüllt bzw. offen.',
      view: [-3, 4, -3, 4], style: { gridMode: 'karo', karo: 2 },
      fns: [fn('f(x) = 0.5x^2 + 1 für x < 1; x - 2 für x ≥ 1')],
    },
    {
      grade: 11, topic: 'Gebrochen-rationale Funktionen',
      title: 'Polstelle und waagrechte Asymptote',
      text: 'f(x) = (2x + 1)/(x − 1): Polstelle x = 1, Grenzverhalten y → 2.',
      view: [-5, 7, -5, 8],
      fns: [fn('f(x) = (2x + 1)/(x - 1)', { as: 1, lm: 'term' })],
    },
    {
      grade: 11, topic: 'Gebrochen-rationale Funktionen',
      title: 'Gebrochen-rationale Funktion',
      text: 'f(x) = (x² + 1)/(x − 1) mit Polstelle und schiefer Asymptote.',
      view: [-5, 7, -6, 10],
      fns: [fn('f(x) = (x^2 + 1)/(x - 1)', { as: 1 })],
    },
    {
      grade: 11, topic: 'Differentialrechnung',
      title: 'Sekante und Tangente',
      text: 'Sekante durch P und Q, Tangente in P – vom Differenzen- zum Differentialquotienten.',
      view: [-1, 4, -1, 5],
      fns: [fn('f(x) = 0.5x^2'), fn('s(x) = 2x - 1.5', { ds: 'dash', lm: 'custom', lt: 's' })],
      objs: [pt('P', 1, 0.5, { off: [10, 16] }), pt('Q', 3, 4.5, { off: [-74, -6] })],
      after: (P) => { P.tangent = P._tangentAt(P.fns[0], 1); P.repaint(); },
    },
    {
      grade: 11, topic: 'Differentialrechnung', also: [0],
      title: 'Ableitungsgraph skizzieren',
      text: 'Graph von f gegeben; f′ ist als Lösung verborgen – skizzieren, dann „Lösung zeigen“.',
      view: [-3, 3, -3, 3],
      fns: [fn('f(x) = x^3/3 - x'), { d: [0, 1], sol: 1, ds: 'dash' }],
    },
    {
      grade: 11, topic: 'Differentialrechnung',
      title: 'Graph von f aus f′ skizzieren',
      text: 'Der Graph von f′ ist gegeben; eine passende Funktion f ist als Lösung verborgen.',
      view: [-3, 3, -3, 3],
      fns: [fn('f(x) = x^2 - 1', { lm: 'custom', lt: 'f′' }), { a: [0, [0]], sol: 1, ds: 'dash', lm: 'custom', lt: 'f' }],
    },
    {
      grade: 11, topic: 'Differentialrechnung',
      title: 'Graph und Ableitungsgraph zuordnen',
      text: 'Drei Graphen A–C und drei Ableitungsgraphen 1–3 – welche gehören zusammen?',
      view: [-3, 3, -3, 3],
      fns: [fn('f(x) = x^2 - 1', { lm: 'custom', lt: 'A' }), fn('g(x) = 0.5x^3 - 1.5x', { lm: 'custom', lt: 'B' }), fn('h(x) = -0.5x + 1', { lm: 'custom', lt: 'C' }),
        { d: [0, 1], ds: 'dash', lm: 'custom', lt: '3' }, { d: [1, 1], ds: 'dash', lm: 'custom', lt: '1' }, { d: [2, 1], ds: 'dash', lm: 'custom', lt: '2' }],
    },
    {
      grade: 11, topic: 'Differentialrechnung',
      title: 'Monotonie und Ableitung',
      text: 'f und f′ gemeinsam: Wo f′ > 0 ist, steigt f; Nullstellen von f′ sind Extremstellen.',
      view: [-3, 3, -4, 4],
      fns: [fn('f(x) = x^3 - 3x'), { d: [0, 1], ds: 'dash' }],
    },
    {
      grade: 11, topic: 'Differentialrechnung',
      title: 'Krümmung und Wendepunkt',
      text: 'f, f′ und f″: Am Wendepunkt hat f′ ein Extremum und f″ eine Nullstelle.',
      view: [-2, 4, -4, 4],
      fns: [fn('f(x) = x^3 - 3x^2 + 2'), { d: [0, 1], ds: 'dash' }, { d: [0, 2], ds: 'dot' }],
    },
    {
      grade: 11, topic: 'Differentialrechnung',
      title: 'Kurvendiskussion',
      text: 'Polynom 3. Grades mit Nullstellen, Extrema und Wendepunkt (exakt).',
      view: [-3, 3, -3, 3], smart: true, style: { exact: true },
      fns: [fn('f(x) = x^3 - 3x')],
    },

    // ═════════════ Jahrgangsstufe 12 ═════════════
    {
      grade: 12, topic: 'Untersuchung von Funktionen',
      title: 'e-Funktion und ln',
      text: 'f(x) = eˣ und die Umkehrfunktion ln(x), gespiegelt an y = x.',
      view: [-3, 4, -3, 4],
      fns: [fn('f(x) = e^x'), { i: 0, ds: 'dash' }],
    },
    {
      grade: 12, topic: 'Untersuchung von Funktionen',
      title: 'Zusammengesetzte Funktion',
      text: 'f(x) = x·e^(−x): Hochpunkt, Wendepunkt und waagrechte Asymptote.',
      view: [-1, 7, -0.6, 0.6], prop: false, smart: true, style: { yStep: '0.1' },
      fns: [fn('f(x) = x*e^(-x)', { as: 1, lm: 'term' })],
    },
    {
      grade: 12, topic: 'Untersuchung von Funktionen',
      title: 'Funktion mit ln',
      text: 'f(x) = ln(x)/x: Hochpunkt bei x = e, Asymptote y = 0.',
      view: [-0.5, 12, -1.2, 0.6], prop: false, smart: true, style: { yStep: '0.2' },
      fns: [fn('f(x) = ln(x)/x', { lm: 'term', as: 1 })],
    },
    {
      grade: 12, topic: 'Untersuchung von Funktionen',
      title: 'Abkühlung (Sachaufgabe)',
      text: 'T(t) = 20 + 60·e^(−0,1t): Kaffee kühlt auf Raumtemperatur ab.',
      view: [-2.5, 46, -9, 92], prop: false, style: { xLabel: 't in min', yLabel: 'T in °C', xStep: '5', yStep: '10' },
      fns: [fn('T(t) = 20 + 60e^(-0.1t) für t ≥ 0', { lm: 'term', as: 1 })],
    },
    {
      grade: 12, topic: 'Untersuchung von Funktionen',
      title: 'Ableitung von Sinus',
      text: 'f(x) = sin(x) und f′(x) = cos(x) im Bogenmaß.',
      view: [-0.5, 7, -1.6, 1.6], prop: false, style: { xFmt: 'pi', xStep: 'pi/2', yStep: '0.5' },
      fns: [fn('f(x) = sin(x)'), { d: [0, 1], ds: 'dash' }],
    },
    {
      grade: 12, topic: 'Untersuchung von Funktionen',
      title: 'Stammfunktionen',
      text: 'Schar von Stammfunktionen F mit C = −1, 0, 1.',
      view: [-3, 3, -3, 3],
      fns: [fn('f(x) = x^2 - 1'), { a: [0, [-1, 0, 1]], ds: 'dash' }],
    },
    {
      grade: 12, topic: 'Zufallsgrößen und Binomialverteilung',
      title: 'Binomialverteilung: P(X ≤ k)',
      text: 'Histogramm von B(20; 0,3) mit markiertem Bereich P(X ≤ 4).',
      dists: [{ type: 'binom', n: 20, p: 0.3, a: null, b: 4 }],
      fns: [],
    },
    {
      grade: 12, topic: 'Zufallsgrößen und Binomialverteilung',
      title: 'Erwartungswert und Standardabweichung',
      text: 'B(50; 0,4) mit μ = 20 und μ ± σ – Werte in der σ-Umgebung markiert.',
      dists: [{ type: 'binom', n: 50, p: 0.4, a: 17, b: 23, sigmaLines: true }],
      fns: [],
    },
    {
      grade: 12, topic: 'Zufallsgrößen und Binomialverteilung',
      title: 'Einfluss von p',
      text: 'B(20; 0,2) und B(20; 0,7): Je größer p, desto weiter rechts liegt das Maximum.',
      dists: [{ type: 'binom', n: 20, p: 0.2 }, { type: 'binom', n: 20, p: 0.7 }],
      fns: [],
    },
    {
      grade: 12, topic: 'Einseitiger Signifikanztest',
      title: 'Hypothesentest: Ablehnungsbereich',
      text: 'Rechtsseitiger Test mit B(50; 0,5): Ablehnungsbereich {32; …; 50}, Signifikanzniveau 5 %.',
      dists: [{ type: 'binom', n: 50, p: 0.5, a: 32, b: null }],
      fns: [],
    },
    {
      grade: 12, topic: 'Einseitiger Signifikanztest',
      title: 'Linksseitiger Test',
      text: 'H₀: p ≥ 0,6 mit n = 50: Ablehnungsbereich {0; …; 23}, Signifikanzniveau 5 %.',
      dists: [{ type: 'binom', n: 50, p: 0.6, a: null, b: 23 }],
      fns: [],
    },

    // ═════════════ Jahrgangsstufe 13 ═════════════
    {
      grade: 13, topic: 'Flächeninhalt und bestimmtes Integral',
      title: 'Ober- und Untersumme',
      text: 'Fläche mit Rechtecken annähern – Anzahl einstellbar.',
      view: [-1, 5, -1, 6],
      fns: [fn('f(x) = 0.25x^2 + 1')],
      after: (P) => { P._showIntegral(P.fns[0]); Object.assign(P.integral, { a: 0, b: 4, mode: 'lower', n: 8 }); P._syncIntegralCtl(); P.repaint(); },
    },
    {
      grade: 13, topic: 'Flächeninhalt und bestimmtes Integral',
      title: 'Fläche unter dem Graphen',
      text: 'Integral von 0 bis 2 als schraffierte Fläche.',
      view: [-1, 3, -1, 5],
      fns: [fn('f(x) = -x^2 + 4')],
      after: (P) => { P._showIntegral(P.fns[0]); P.integral.a = 0; P.integral.b = 2; P.repaint(); },
    },
    {
      grade: 13, topic: 'Flächeninhalt und bestimmtes Integral',
      title: 'Orientierter Flächeninhalt',
      text: 'Integral von −1 bis 2 über f(x) = x² − 1: Flächen unterhalb der x-Achse zählen negativ.',
      view: [-2, 3, -2, 4],
      fns: [fn('f(x) = x^2 - 1')],
      after: (P) => { P._showIntegral(P.fns[0]); P.integral.a = -1; P.integral.b = 2; P.repaint(); },
    },
    {
      grade: 13, topic: 'Flächeninhalt und bestimmtes Integral',
      title: 'Integralfunktion',
      text: 'f(x) = x − 1 und die Integralfunktion I(x) = ∫₀ˣ f(t) dt = ½x² − x.',
      view: [-2, 4, -2, 3],
      fns: [fn('f(x) = x - 1'), { a: [0, [0]], ds: 'dash', lm: 'custom', lt: 'I_0' }],
    },
    {
      grade: 13, topic: 'Flächeninhalt und bestimmtes Integral',
      title: 'Änderungsrate und Bestand',
      text: 'Zuflussrate r(t) = −0,5t² + 2t; die Fläche von 0 bis 4 ist die zugeflossene Wassermenge.',
      view: [-0.5, 5, -0.6, 2.8], prop: false, style: { xLabel: 't in h', yLabel: 'r in m³/h', xStep: '1', yStep: '0.5' },
      fns: [fn('r(t) = -0.5t^2 + 2t', { lm: 'term' })],
      after: (P) => { P._showIntegral(P.fns[0]); P.integral.a = 0; P.integral.b = 4; P.repaint(); },
    },
    {
      grade: 13, topic: 'Normalverteilung',
      title: 'Normalverteilung: σ-Regeln',
      text: 'N(100; 15) mit μ ± σ: Etwa 68,3 % der Werte liegen zwischen 85 und 115.',
      dists: [{ type: 'normal', mu: 100, sigma: 15, a: 85, b: 115, sigmaLines: true }],
      fns: [],
    },
    {
      grade: 13, topic: 'Normalverteilung',
      title: 'Normalverteilung: P(X ≤ a)',
      text: 'Körpergröße N(170; 8): P(X ≤ 180) als Fläche unter der Glockenkurve.',
      dists: [{ type: 'normal', mu: 170, sigma: 8, a: null, b: 180 }],
      fns: [],
    },
    {
      grade: 13, topic: 'Normalverteilung',
      title: 'Normalverteilung als Näherung',
      text: 'B(100; 0,5) mit darübergelegter Glockenkurve (μ = 50, σ = 5).',
      dists: [{ type: 'binom', n: 100, p: 0.5, a: 45, b: 55, approx: true }],
      fns: [],
    },
    {
      grade: 13, topic: 'Normalverteilung',
      title: 'Einfluss von σ',
      text: 'Drei Normalverteilungen mit μ = 0 und σ = 0,5; 1; 2.',
      dists: [{ type: 'normal', mu: 0, sigma: 0.5 }, { type: 'normal', mu: 0, sigma: 1 }, { type: 'normal', mu: 0, sigma: 2 }],
      fns: [],
    },
    {
      grade: 13, topic: 'Normalverteilung',
      title: 'Gaußsche Glockenkurve untersuchen',
      text: 'φ(x) = e^(−x²/2)/√(2π): Hochpunkt, Wendepunkte bei x = ±1, Asymptote y = 0.',
      view: [-4, 4, -0.08, 0.5], prop: false, smart: true, style: { yStep: '0.1' },
      fns: [fn('f(x) = e^(-x^2/2)/sqrt(2pi)', { as: 1, lm: 'term' })],
    },

    // ═════════════ Allgemein (für jede Jahrgangsstufe) ═════════════
    {
      grade: 0, topic: 'Arbeitsblatt',
      title: 'Leeres Koordinatensystem',
      text: 'Karopapier von −6 bis 6 – zum Selbstzeichnen oder Skizzieren mit dem Stift.',
      view: [-6, 6, -4, 4], style: { gridMode: 'karo', karo: 2 },
      fns: [],
    },
    {
      grade: 0, topic: 'Arbeitsblatt',
      title: 'Punkte ablesen',
      text: 'Fünf Punkte auf Karopapier ohne Koordinaten – Koordinaten ablesen und notieren.',
      view: [-5, 5, -4, 4], style: { gridMode: 'karo', karo: 2 },
      fns: [],
      objs: [pt('A', 2, 3, { showCoords: false }), pt('B', -3, 1, { showCoords: false }), pt('C', -2, -2.5, { showCoords: false }), pt('D', 3.5, -1, { showCoords: false }), pt('E', 0, -3, { showCoords: false })],
    },
    {
      grade: 0, topic: 'Arbeitsblatt',
      title: 'Wertetabelle ausfüllen',
      text: 'f(x) = x² − 2x mit lückenhafter Wertetabelle (Reiter Daten) – danach den Graphen zeichnen.',
      view: [-2, 4, -2, 4], style: { gridMode: 'karo', karo: 2 },
      fns: [fn('f(x) = x^2 - 2x', { sol: 1, lm: 'term' })],
      table: { start: -1, end: 3, step: 1, orient: 'h', blanks: ['f:-1', 'f:0', 'f:2', 'f:3'] },
      after: (P) => { P.switchTab('data'); },
    },
    {
      grade: 0, topic: 'Skizzieren & prüfen',
      title: 'Graph skizzieren und prüfen',
      text: 'Aufgabe als Text, der Graph ist als Lösung verborgen: skizzieren, dann L drücken.',
      view: [-4, 4, -3, 4], style: { gridMode: 'karo', karo: 2 },
      fns: [fn('f(x) = x^2 - 2', { sol: 1 })],
      objs: [txt(-3.8, 3.4, 'Skizziere den Graphen von f(x) = x² − 2.', { bold: true })],
    },
    {
      grade: 0, topic: 'Physik & Messwerte',
      title: 'Messwerte & Ausgleichsgerade',
      text: 'Messreihe mit linearer Regression – Werte im Daten-Tab ändern.',
      view: [-0.5, 6.5, -1, 14], prop: false,
      fns: [],
      data: [{ name: 'Messreihe 1', pts: [[0, 1.1], [1, 3.2], [2, 4.8], [3, 7.1], [4, 8.9], [5, 11.2], [6, 12.8]], col: '#FF9500', vis: true, reg: 'linear' }],
      after: (P) => { P.addRegression(P.datasets[0]); },
    },
  ];

  const inGrade = (t, g) => t.grade === g || (t.also || []).includes(g);

  // Suchtext einer Vorlage (Titel, Beschreibung, Thema, Terme)
  function searchText(t) {
    return [t.title, t.text, t.topic, ...(t.fns || []).map(f => f.s || '')].join(' ').toLowerCase()
      .replace(/[äöüß]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c]);
  }

  function matches(t, query, grade) {
    if (grade !== null && grade !== undefined && !inGrade(t, grade)) return false;
    const q = String(query || '').trim().toLowerCase().replace(/[äöüß]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c]);
    if (!q) return true;
    const s = searchText(t);
    return q.split(/\s+/).every(w => s.includes(w));
  }

  return { GRADES, TEMPLATES, matches, inGrade };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PlotoriaLibrary;
