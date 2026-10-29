// Plotoria 3.1 – Aufgabenbibliothek: Vorlagen nach Jahrgangsstufe (Gymnasium Bayern, Jgst. 8–13)
// Reine Daten (ohne DOM) – in Node testbar (tests/library.test.js).
// Die Zuordnung zu Jahrgangsstufen und Themen orientiert sich am LehrplanPLUS Mathematik (G9).
const PlotoriaLibrary = (() => {
  // Kurzschreibweisen: fn(Definition, Zusätze), pt(Name, x, y, Zusätze)
  const fn = (s, extra) => ({ s, ...(extra || {}) });
  const pt = (name, x, y, extra) => ({ type: 'point', name, x: String(x), y: String(y), showCoords: true, showName: true, off: [8, -10], col: '#FF3B30', vis: true, ...(extra || {}) });
  const txt = (x, y, text, extra) => ({ type: 'text', x, y, text, col: '#1C1C1E', vis: true, ...(extra || {}) });

  const GRADES = [
    { id: 8, label: '8' }, { id: 9, label: '9' }, { id: 10, label: '10' },
    { id: 11, label: '11' }, { id: 12, label: '12' }, { id: 13, label: '13' },
    { id: 0, label: 'Allgemein' },
  ];

  const TEMPLATES = [
    // ═════════════ Jahrgangsstufe 8 ═════════════
    {
      grade: 8, topic: 'Proportionalität',
      title: 'Direkte Proportionalität',
      text: 'Ursprungsgerade im Sachkontext: Preis in Abhängigkeit von der Menge, Wert ablesen.',
      view: [-0.6, 6.6, -1, 10.5], prop: false, style: { xLabel: 'Menge in kg', yLabel: 'Preis in €', xStep: '1', yStep: '1' },
      fns: [fn('p(x) = 1.5x für x ≥ 0', { lm: 'term' })],
      objs: [pt('A', 4, 6, { guides: true })],
    },
    {
      grade: 8, topic: 'Proportionalität',
      title: 'Indirekte Proportionalität',
      text: 'Hyperbelast y = 12/x: Anzahl der Personen und Dauer einer Arbeit, Produktgleichheit.',
      view: [-0.6, 12.6, -1, 13], prop: false, style: { xLabel: 'Anzahl der Personen', yLabel: 'Dauer in Tagen', xStep: '1', yStep: '1' },
      fns: [fn('d(x) = 12/x für x > 0', { lm: 'term' })],
      objs: [pt('A', 2, 6, { guides: true, showName: false }), pt('B', 3, 4, { guides: true, showName: false }), pt('C', 4, 3, { guides: true, showName: false }), pt('D', 6, 2, { guides: true, showName: false })],
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
      grade: 8, topic: 'Lineare Funktionen',
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
      grade: 8, topic: 'Gebrochen-rationale Funktionen',
      title: 'Verschobene Hyperbel',
      text: 'f(x) = 1/(x − 2) + 1 mit senkrechter und waagrechter Asymptote.',
      view: [-3, 7, -4, 6],
      fns: [fn('f(x) = 1/(x - 2) + 1', { as: 1, lm: 'term' })],
    },

    // ═════════════ Jahrgangsstufe 9 ═════════════
    {
      grade: 9, topic: 'Quadratische Funktionen',
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
      title: 'Scheitelform mit Schiebereglern',
      text: 'f(x) = a·(x − b)² + c: Streckung und Verschiebung mit Schiebereglern.',
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
      grade: 9, topic: 'Quadratische Funktionen',
      title: 'Wurfparabel (Sachaufgabe)',
      text: 'Höhe eines Balls h(t) = −5t² + 10t + 1,5 mit Scheitel S(1 | 6,5).',
      view: [-0.3, 2.6, -0.8, 7.6], prop: false, style: { xLabel: 't in s', yLabel: 'h in m', xStep: '0.5', yStep: '1' },
      fns: [fn('h(t) = -5t^2 + 10t + 1.5 für 0 ≤ t ≤ 2.14', { lm: 'term' })],
      objs: [pt('S', 1, 6.5, { guides: true })],
    },
    {
      grade: 9, topic: 'Wurzeln',
      title: 'Wurzelfunktion als Umkehrfunktion',
      text: 'f(x) = x² für x ≥ 0 an y = x gespiegelt ergibt y = √x.',
      view: [-1, 5, -1, 5],
      fns: [fn('f(x) = x^2 für x ≥ 0'), { i: 0, ds: 'dash' }],
    },

    // ═════════════ Jahrgangsstufe 10 ═════════════
    {
      grade: 10, topic: 'Potenzfunktionen',
      title: 'Potenzfunktionen x^n',
      text: 'Schar f_n(x) = xⁿ für n = 1; 2; 3; 4 – Symmetrie und Verlauf vergleichen.',
      view: [-2, 2, -3, 3],
      fns: [fn('f_n(x) = x^n für n = 1; 2; 3; 4')],
    },
    {
      grade: 10, topic: 'Potenzfunktionen',
      title: 'Negative Exponenten',
      text: 'f(x) = x⁻¹ und g(x) = x⁻² mit Asymptoten.',
      view: [-4, 4, -4, 4],
      fns: [fn('f(x) = x^(-1)', { as: 1, lm: 'term' }), fn('g(x) = x^(-2)', { as: 1, lm: 'term' })],
    },
    {
      grade: 10, topic: 'Exponential- und Logarithmusfunktionen',
      title: 'Exponentialfunktionen b^x',
      text: 'Schar f_b(x) = bˣ für b = 0,5; 2; 3 – alle durch (0 | 1).',
      view: [-3, 3, -1, 6],
      fns: [fn('f_b(x) = b^x für b = 0.5; 2; 3')],
      objs: [pt('P', 0, 1, { off: [10, 18] })],
    },
    {
      grade: 10, topic: 'Exponential- und Logarithmusfunktionen',
      title: 'Wachstum (Sachaufgabe)',
      text: 'Exponentielles Wachstum mit Einheiten an den Achsen und Definitionsbereich.',
      view: [-0.8, 8.5, -5, 55], prop: false, style: { xLabel: 't in h', yLabel: 'N in Tausend', xStep: '1', yStep: '10' },
      fns: [fn('N(t) = 2*1.5^t für 0 ≤ t ≤ 8', { lm: 'term' })],
    },
    {
      grade: 10, topic: 'Exponential- und Logarithmusfunktionen',
      title: 'Halbwertszeit',
      text: 'Radioaktiver Zerfall N(t) = 100 · 0,5^(t/5) – Halbwertszeit ablesen.',
      view: [-1.5, 26, -8, 112], prop: false, style: { xLabel: 't in Jahren', yLabel: 'N in %', xStep: '5', yStep: '10' },
      fns: [fn('N(t) = 100*0.5^(t/5) für t ≥ 0', { lm: 'term' })],
      objs: [pt('A', 5, 50, { guides: true }), pt('B', 10, 25, { guides: true })],
    },
    {
      grade: 10, topic: 'Exponential- und Logarithmusfunktionen',
      title: 'Logarithmus als Umkehrfunktion',
      text: 'f(x) = 2ˣ an y = x gespiegelt ergibt y = log₂(x).',
      view: [-3, 5, -3, 5],
      fns: [fn('f(x) = 2^x'), { i: 0, ds: 'dash' }],
    },
    {
      grade: 10, topic: 'Trigonometrische Funktionen',
      title: 'Sinus im Gradmaß',
      text: 'sin(x) von 0° bis 360°, x-Achse in 90°-Schritten.',
      view: [-20, 380, -1.5, 1.5], deg: true, prop: false, style: { xStep: '90', yStep: '0.5' },
      fns: [fn('f(x) = sin(x)')],
    },
    {
      grade: 10, topic: 'Trigonometrische Funktionen',
      title: 'Sinus und Kosinus im Bogenmaß',
      text: 'sin und cos mit Achsenbeschriftung in Vielfachen von π.',
      view: [-0.5, 7, -1.6, 1.6], prop: false, style: { xFmt: 'pi', xStep: 'pi/2', yStep: '0.5' },
      fns: [fn('f(x) = sin(x)'), fn('g(x) = cos(x)', { ds: 'dash' })],
    },
    {
      grade: 10, topic: 'Trigonometrische Funktionen',
      title: 'Allgemeine Sinusfunktion',
      text: 'f(x) = a·sin(b·(x − c)) + d: Amplitude, Periode und Verschiebung mit Schiebereglern.',
      view: [-0.8, 7, -4, 4], prop: false, style: { xFmt: 'pi', xStep: 'pi/2', yStep: '1' },
      fns: [fn('f(x) = a*sin(b*(x - c)) + d', { lm: 'term' }), fn('g(x) = sin(x)', { ds: 'dash' })],
      params: { a: { v: 2, min: -3, max: 3 }, b: { v: 1, min: 0.5, max: 4 }, c: { v: 0, min: -3.2, max: 3.2 }, d: { v: 0, min: -2, max: 2 } },
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
      grade: 10, topic: 'Funktionen vergleichen',
      title: 'Graphen zuordnen',
      text: 'Vier Graphen mit den Buchstaben A–D, ohne Funktionsterme.',
      view: [-4, 4, -4, 4],
      fns: [fn('f(x) = 0.5x + 1', { lm: 'custom', lt: 'A' }), fn('g(x) = -x^2 + 3', { lm: 'custom', lt: 'B' }),
        fn('h(x) = 2^x - 3', { lm: 'custom', lt: 'C' }), fn('k(x) = 1/(x + 2)', { lm: 'custom', lt: 'D' })],
    },

    // ═════════════ Jahrgangsstufe 11 ═════════════
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
      grade: 11, topic: 'Differentialrechnung',
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
      title: 'Monotonie und Ableitung',
      text: 'f und f′ gemeinsam: Wo f′ > 0 ist, steigt f; Nullstellen von f′ sind Extremstellen.',
      view: [-3, 3, -4, 4],
      fns: [fn('f(x) = x^3 - 3x'), { d: [0, 1], ds: 'dash' }],
    },
    {
      grade: 11, topic: 'Differentialrechnung',
      title: 'Ableitung von Sinus',
      text: 'f(x) = sin(x) und f′(x) = cos(x) im Bogenmaß.',
      view: [-0.5, 7, -1.6, 1.6], prop: false, style: { xFmt: 'pi', xStep: 'pi/2', yStep: '0.5' },
      fns: [fn('f(x) = sin(x)'), { d: [0, 1], ds: 'dash' }],
    },
    {
      grade: 11, topic: 'Kurvendiskussion',
      title: 'Kurvendiskussion',
      text: 'Polynom 3. Grades mit Nullstellen, Extrema und Wendepunkt (exakt).',
      view: [-3, 3, -3, 3], smart: true, style: { exact: true },
      fns: [fn('f(x) = x^3 - 3x')],
    },
    {
      grade: 11, topic: 'Gebrochen-rationale Funktionen',
      title: 'Polstelle und schiefe Asymptote',
      text: 'f(x) = (x² + 1)/(x − 1) mit Polstelle und schiefer Asymptote.',
      view: [-5, 7, -6, 10],
      fns: [fn('f(x) = (x^2 + 1)/(x - 1)', { as: 1 })],
    },
    {
      grade: 11, topic: 'Abschnittsweise definierte Funktionen',
      title: 'Abschnittsweise definiert',
      text: 'Funktion mit Sprungstelle – Randpunkte gefüllt bzw. offen.',
      view: [-3, 4, -3, 4], style: { gridMode: 'karo', karo: 2 },
      fns: [fn('f(x) = 0.5x^2 + 1 für x < 1; x - 2 für x ≥ 1')],
    },

    // ═════════════ Jahrgangsstufe 12 ═════════════
    {
      grade: 12, topic: 'Natürliche Exponential- und Logarithmusfunktion',
      title: 'e-Funktion und ln',
      text: 'f(x) = eˣ und die Umkehrfunktion ln(x), gespiegelt an y = x.',
      view: [-3, 4, -3, 4],
      fns: [fn('f(x) = e^x'), { i: 0, ds: 'dash' }],
    },
    {
      grade: 12, topic: 'Natürliche Exponential- und Logarithmusfunktion',
      title: 'Zusammengesetzte Funktion',
      text: 'f(x) = x·e^(−x): Hochpunkt, Wendepunkt und waagrechte Asymptote.',
      view: [-1, 7, -0.6, 0.6], prop: false, smart: true, style: { yStep: '0.1' },
      fns: [fn('f(x) = x*e^(-x)', { as: 1, lm: 'term' })],
    },
    {
      grade: 12, topic: 'Natürliche Exponential- und Logarithmusfunktion',
      title: 'Abkühlung (Sachaufgabe)',
      text: 'T(t) = 20 + 60·e^(−0,1t): Kaffee kühlt auf Raumtemperatur ab.',
      view: [-2.5, 46, -9, 92], prop: false, style: { xLabel: 't in min', yLabel: 'T in °C', xStep: '5', yStep: '10' },
      fns: [fn('T(t) = 20 + 60e^(-0.1t) für t ≥ 0', { lm: 'term', as: 1 })],
    },
    {
      grade: 12, topic: 'Integralrechnung',
      title: 'Fläche unter dem Graphen',
      text: 'Integral von 0 bis 2 als schraffierte Fläche.',
      view: [-1, 3, -1, 5],
      fns: [fn('f(x) = -x^2 + 4')],
      after: (P) => { P._showIntegral(P.fns[0]); P.integral.a = 0; P.integral.b = 2; P.repaint(); },
    },
    {
      grade: 12, topic: 'Integralrechnung',
      title: 'Ober- und Untersumme',
      text: 'Fläche mit Rechtecken annähern – Anzahl einstellbar.',
      view: [-1, 5, -1, 6],
      fns: [fn('f(x) = 0.25x^2 + 1')],
      after: (P) => { P._showIntegral(P.fns[0]); Object.assign(P.integral, { a: 0, b: 4, mode: 'lower', n: 8 }); P._syncIntegralCtl(); P.repaint(); },
    },
    {
      grade: 12, topic: 'Integralrechnung',
      title: 'Stammfunktionen',
      text: 'Schar von Stammfunktionen F mit C = −1, 0, 1.',
      view: [-3, 3, -3, 3],
      fns: [fn('f(x) = x^2 - 1'), { a: [0, [-1, 0, 1]], ds: 'dash' }],
    },
    {
      grade: 12, topic: 'Integralrechnung',
      title: 'Änderungsrate und Bestand',
      text: 'Zuflussrate r(t) = −0,5t² + 2t; die Fläche von 0 bis 4 ist die zugeflossene Wassermenge.',
      view: [-0.5, 5, -0.6, 2.8], prop: false, style: { xLabel: 't in h', yLabel: 'r in m³/h', xStep: '1', yStep: '0.5' },
      fns: [fn('r(t) = -0.5t^2 + 2t', { lm: 'term' })],
      after: (P) => { P._showIntegral(P.fns[0]); P.integral.a = 0; P.integral.b = 4; P.repaint(); },
    },
    {
      grade: 12, topic: 'Funktionsscharen',
      title: 'Funktionsschar',
      text: 'f_a(x) = a·x² − 2 für mehrere a, jede Kurve beschriftet.',
      view: [-3, 3, -3, 5],
      fns: [fn('f_a(x) = a*x^2 - 2 für a = 0.5; 1; 2')],
    },
    {
      grade: 12, topic: 'Stochastik',
      title: 'Binomialverteilung: P(X ≤ k)',
      text: 'Histogramm von B(20; 0,3) mit markiertem Bereich P(X ≤ 4).',
      dists: [{ type: 'binom', n: 20, p: 0.3, a: null, b: 4 }],
      fns: [],
    },
    {
      grade: 12, topic: 'Stochastik',
      title: 'Erwartungswert und Standardabweichung',
      text: 'B(50; 0,4) mit μ = 20 und μ ± σ – Werte in der σ-Umgebung markiert.',
      dists: [{ type: 'binom', n: 50, p: 0.4, a: 17, b: 23, sigmaLines: true }],
      fns: [],
    },

    // ═════════════ Jahrgangsstufe 13 ═════════════
    {
      grade: 13, topic: 'Stochastik',
      title: 'Hypothesentest: Ablehnungsbereich',
      text: 'Rechtsseitiger Test mit B(50; 0,5): Ablehnungsbereich {32; …; 50}, Signifikanzniveau 5 %.',
      dists: [{ type: 'binom', n: 50, p: 0.5, a: 32, b: null }],
      fns: [],
    },
    {
      grade: 13, topic: 'Stochastik',
      title: 'Normalverteilung: σ-Regeln',
      text: 'N(100; 15) mit μ ± σ: Etwa 68,3 % der Werte liegen zwischen 85 und 115.',
      dists: [{ type: 'normal', mu: 100, sigma: 15, a: 85, b: 115, sigmaLines: true }],
      fns: [],
    },
    {
      grade: 13, topic: 'Stochastik',
      title: 'Normalverteilung als Näherung',
      text: 'B(100; 0,5) mit darübergelegter Glockenkurve (μ = 50, σ = 5).',
      dists: [{ type: 'binom', n: 100, p: 0.5, a: 45, b: 55, approx: true }],
      fns: [],
    },
    {
      grade: 13, topic: 'Stochastik',
      title: 'Einfluss von σ',
      text: 'Drei Normalverteilungen mit μ = 0 und σ = 0,5; 1; 2.',
      dists: [{ type: 'normal', mu: 0, sigma: 0.5 }, { type: 'normal', mu: 0, sigma: 1 }, { type: 'normal', mu: 0, sigma: 2 }],
      fns: [],
    },
    {
      grade: 13, topic: 'Analysis',
      title: 'Gaußsche Glockenkurve untersuchen',
      text: 'φ(x) = e^(−x²/2)/√(2π): Hochpunkt, Wendepunkte bei x = ±1, Asymptote y = 0.',
      view: [-4, 4, -0.08, 0.5], prop: false, smart: true, style: { yStep: '0.1' },
      fns: [fn('f(x) = e^(-x^2/2)/sqrt(2pi)', { as: 1, lm: 'term' })],
    },

    // ═════════════ Allgemein ═════════════
    {
      grade: 0, topic: 'Arbeitsblatt',
      title: 'Leeres Koordinatensystem',
      text: 'Karopapier von −6 bis 6 – zum Selbstzeichnen oder Skizzieren mit dem Stift.',
      view: [-6, 6, -4, 4], style: { gridMode: 'karo', karo: 2 },
      fns: [],
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

  // Suchtext einer Vorlage (Titel, Beschreibung, Thema, Terme)
  function searchText(t) {
    return [t.title, t.text, t.topic, ...(t.fns || []).map(f => f.s || '')].join(' ').toLowerCase()
      .replace(/[äöüß]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c]);
  }

  function matches(t, query, grade) {
    if (grade !== null && grade !== undefined && t.grade !== grade) return false;
    const q = String(query || '').trim().toLowerCase().replace(/[äöüß]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c]);
    if (!q) return true;
    const s = searchText(t);
    return q.split(/\s+/).every(w => s.includes(w));
  }

  return { GRADES, TEMPLATES, matches };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PlotoriaLibrary;
