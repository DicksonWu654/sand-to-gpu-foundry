/* Widget: implanter-beamline — "Ion Implanter Beamline" (Module 10) */
(function () {
  'use strict';
  const AMU = 1.66054e-27, Q_E = 1.602177e-19;
  const R_MAG = 0.35;                       // analyser bend radius, m (module: 0.3–0.5 m)
  const L_DRIFT = 0.25;                     // magnet exit → resolving slit, m
  const DISP = R_MAG + L_DRIFT;             // dispersion length of a 90° sector + drift: x ≈ D·Δm/(2m)
  const RES = 80;                           // mass resolution m/Δm (module: 60–100)
  const SLIT_MM = DISP / (2 * RES) * 1000;  // slit half-width, mm (3.75)
  const SLIT_PX = 6, PX_PER_MM = SLIT_PX / SLIT_MM;
  const WAFER_CM2 = Math.PI * 15 * 15;      // 300 mm wafer, 707 cm²
  const OVERSCAN = 1.3, HANDLING_S = 8;

  const PLASMA = {
    BF3: [[10, .09, '¹⁰B⁺'], [11, .36, '¹¹B⁺'], [19, .3, 'F⁺'], [29, .04, '¹⁰BF⁺'], [30, .18, '¹¹BF⁺'], [48, .25, '⁴⁸BF₂⁺'], [49, 1, '⁴⁹BF₂⁺'], [68, .06, 'BF₃⁺']],
    PH3: [[1, .1, 'H⁺'], [2, .15, 'H₂⁺'], [31, 1, '³¹P⁺'], [32, .3, 'PH⁺'], [33, .18, 'PH₂⁺'], [34, .08, 'PH₃⁺'], [62, .05, 'P₂⁺']],
    AsH3: [[2, .15, 'H₂⁺'], [74, .06, '⁷⁴Ge⁺', 1], [75, 1, '⁷⁵As⁺'], [76, .3, 'AsH⁺'], [77, .15, 'AsH₂⁺'], [150, .05, 'As₂⁺']],
    GeH4: [[2, .2, 'H₂⁺'], [70, .56, '⁷⁰Ge⁺'], [72, .75, '⁷²Ge⁺'], [73, .21, '⁷³Ge⁺'], [74, 1, '⁷⁴Ge⁺'], [75, .2, 'GeH⁺'], [76, .21, '⁷⁶Ge⁺']],
  };
  const SPECIES = [
    { id: 'B', ion: '¹¹B⁺', m: 11, gas: 'BF₃', plasma: 'BF3', atom: 1, note: '¹¹B⁺ from BF₃ gas is the light p-type workhorse. Its isotope ¹⁰B⁺ lands 27 mm away at the slit and is trivially rejected; the heavier BF⁺ and BF₂⁺ fragments never make it out of the magnet.' },
    { id: 'BF2', ion: '⁴⁹BF₂⁺', m: 49, gas: 'BF₃', plasma: 'BF3', atom: 11 / 49, note: '⁴⁹BF₂⁺ carries its boron atom at only 11/49 of the beam energy, so a 30 keV beam implants boron as if at 6.7 keV: the classic shallow p⁺ trick. ⁴⁸BF₂⁺ (with ¹⁰B) sits just 6 mm away at the slit.' },
    { id: 'P', ion: '³¹P⁺', m: 31, gas: 'PH₃', plasma: 'PH3', atom: 1, note: '³¹P⁺ from phosphine (PH₃), the n-type dopant for wells and extensions. ³⁰SiH⁺ would also have mass 31 and cannot be separated by the magnet, so silicon compounds are simply kept out of the source.' },
    { id: 'As', ion: '⁷⁵As⁺', m: 75, gas: 'AsH₃', plasma: 'AsH3', atom: 1, note: '⁷⁵As⁺ from arsine, the heavy n-type dopant for source/drain. ⁷⁴Ge⁺ is only 4 mm away at the slit, so a source that has run germane can cross-contaminate; that is why tools are often dedicated to n- or p-type.' },
    { id: 'Ge', ion: '⁷⁴Ge⁺', m: 74, gas: 'GeH₄', plasma: 'GeH4', atom: 1, note: '⁷⁴Ge⁺ (36.5 % of natural germanium) is not a dopant: it is implanted to pre-amorphise the top 20–40 nm of silicon so later boron cannot channel. The other four isotopes are thrown away at the slit.' },
  ];
  const PARTS = {
    source: ['Ion source (arc chamber)', 'A tungsten arc chamber about 5 × 5 × 10 cm. Feed gas (BF₃, PH₃, AsH₃, GeH₄) enters at a few sccm; electrons from a ~2 500 K cathode ionise it at a 50–120 V arc voltage. The plasma contains every fragment and every isotope of the gas.', 'arc 1–5 A · source life 100–300 h'],
    extraction: ['Extraction electrodes', 'The chamber sits at +V_ext (30–80 kV). A suppression electrode a few kV negative stops electrons from the beam streaming back into the source; the ground electrode completes the gap. The 3 × 50 mm slit makes a ribbon beam, and Child-Langmuir space charge (J ∝ V^3/2 / (d²·√m)) caps the current.', 'V_ext 30–80 kV'],
    magnet: ['Analyser magnet', 'A dipole bends the beam through 90°. An ion of mass m, charge q and energy qV follows a circle of radius r = (1/B)·√(2mV/q); B is tuned so only the wanted ion follows the 0.35 m radius. Lighter ions curl inside it, heavier ones outside.', 'B up to ~1 T · r 0.3–0.5 m'],
    slit: ['Mass-resolving slit', 'Only ions whose radius matches the geometry pass the aperture; everything else hits the plate. Mass resolution m/Δm is 60–100 in production tools; here a 7.5 mm slit 0.6 m of dispersion from the bend gives m/Δm ≈ 80.', 'm/Δm ≈ 80'],
    column: ['Acceleration / deceleration column', 'A stack of ring electrodes with graded voltages adds or subtracts energy after mass analysis: E = n·q·(V_ext + V_col). Deceleration is how sub-keV implants are made; an energy filter after it removes ions that neutralised on residual gas before slowing down.', '5 keV to 600+ keV (DC); RF linac above ~1 MeV'],
    scanner: ['Scanner', 'The beam is a few cm wide and the wafer is 300 mm. Electrostatic plates sweep the beam at kHz rates in one axis while the wafer is moved slowly through it in the other (hybrid scan); the wafer speed is servoed to the measured beam current.', '< 1 % dose uniformity'],
    corrector: ['Corrector (parallelising) magnet', 'A scanned beam would arrive at a different angle at every point on the wafer. The corrector bends every ray back parallel to within ~±0.5°; a 1° error on a 7° fin implant changes the shadowed length of the fin by ~15 %.', '±0.5° parallelism'],
    wafer: ['End station: wafer on a tilted platen', 'An electrostatic chuck with backside gas cooling holds the wafer at a tilt (7° is classic; up to 45–60° for halo and fin implants) and ~22° twist so the beam does not line up with a crystal channel. A plasma flood gun bathes the surface in low-energy electrons so the positive beam cannot charge up the gate oxide.', '20 mA × 40 kV = 800 W into the wafer'],
    faraday: ['Faraday cup', 'A deep, biased cup captures the beam and suppresses secondary electrons; the integrated charge sets the dose, Q = ∫I·dt / (n·q·A). Absolute accuracy is ~1–2 % and tool-to-tool repeatability a few tenths of a percent, which is why implant is the fab’s reference process for dose.', 'dose = ∫I·dt / (q·A)'],
  };

  // ---- canonical geometry (wide viewBox 760 × 366; narrow mode swaps x/y) ----
  const AX = 112, AY0 = 96, MY = 152, R = 90, CX = AX + R, MAIN_Y = MY + R;
  const X_SLIT = 254, X_COL0 = 290, X_COL1 = 404, X_SC0 = 434, X_SC1 = 486, X_CORR0 = 528, X_CORR1 = 548;
  const ES = [560, 154, 750, 336], WX = 650, WAF_HALF = 62, FAN = 64, X_DUMP = 744;
  const sci = n => { const e = Math.floor(Math.log10(n)); const m = n / Math.pow(10, e); return (Math.abs(m - 1) < 0.05 ? '' : m.toFixed(1) + '×') + '10<sup>' + e + '</sup>'; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  window.registerWidget('implanter-beamline', {
    title: 'Ion Implanter Beamline',
    caption: 'Follow ions from the gas bottle to the wafer: pick a species and voltages, watch the analyser magnet throw the wrong masses at the slit, and read off the field, energy and dose time.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const st = { sp: SPECIES[1], vext: 30, vcol: 0, tilt: 7, iFrac: 95, dFrac: 75, playing: !reduced, slow: false };
      let raf = 0, visible = true, last = 0, scene = null, mode = '', fsCur = 0, spawnAcc = 0, clock = 0;
      const particles = [], flashes = [];

      // ================= controls =================
      const spSel = h('select', null, ...SPECIES.map(s => h('option', { value: s.id, selected: s === st.sp || null }, s.ion + ' from ' + s.gas)));
      const vextIn = h('input', { type: 'range', min: 5, max: 80, step: 1, value: st.vext }), vextOut = h('output');
      const vcolIn = h('input', { type: 'range', min: -29, max: 200, step: 1, value: st.vcol }), vcolOut = h('output');
      const tiltIn = h('input', { type: 'range', min: 0, max: 45, step: 1, value: st.tilt }), tiltOut = h('output');
      const iIn = h('input', { type: 'range', min: 0, max: 100, step: 1, value: st.iFrac }), iOut = h('output');
      const dIn = h('input', { type: 'range', min: 0, max: 100, step: 1, value: st.dFrac }), dOut = h('output');
      const playBtn = h('button', { class: 'w-btn primary', on: { click: () => { st.playing = !st.playing; syncPlay(); start(); } } });
      const slowBtn = h('button', { class: 'w-btn', on: { click: () => { st.slow = !st.slow; slowBtn.textContent = st.slow ? 'Slow motion: on' : 'Slow motion: off'; } } }, 'Slow motion: off');
      const syncPlay = () => { playBtn.textContent = st.playing ? 'Pause ions' : 'Play ions'; playBtn.setAttribute('aria-pressed', st.playing); };
      syncPlay();
      const controls = h('div', { class: 'w-controls' },
        h('div', null, playBtn, ' ', slowBtn),
        h('label', { class: 'w-ctl' }, h('span', null, 'Species'), spSel, h('output')),
        h('label', { class: 'w-ctl' }, h('span', null, 'Extraction V_ext'), vextIn, vextOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Column V_col'), vcolIn, vcolOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Wafer tilt'), tiltIn, tiltOut));
      const doseControls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Beam current'), iIn, iOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Dose'), dIn, dOut));

      // ================= info panel =================
      const infoName = h('b'), infoBody = h('span');
      const info = h('div', { style: { border: '1px solid var(--line)', borderRadius: '6px', padding: '8px 12px', margin: '10px 0', minHeight: '58px', fontSize: '13px' } },
        h('div', null, infoName), h('div', { style: { color: 'var(--muted)', marginTop: '2px' } }, infoBody));
      const setInfo = key => { const d = PARTS[key]; infoName.textContent = d[0] + '  —  ' + d[2]; infoBody.textContent = d[1]; };
      const defaultInfo = () => { infoName.textContent = st.sp.ion + ' from ' + st.sp.gas + '  —  hover, focus or tap any part of the beamline for what it does'; infoBody.textContent = st.sp.note; };

      // ================= readouts =================
      const stB = h('b'), stNb = h('b'), stE = h('b'), stV = h('b'), stT = h('b'), stWph = h('b');
      const nbLabel = h('span'), eLabel = h('span'), wphLabel = h('span'), bLabel = h('span');
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, stB, bLabel),
        h('div', { class: 'w-stat' }, stNb, nbLabel),
        h('div', { class: 'w-stat' }, stE, eLabel),
        h('div', { class: 'w-stat' }, stV, h('span', null, 'ion speed at the wafer')),
        h('div', { class: 'w-stat' }, stT, h('span', null, 'beam time per 300 mm wafer (707 cm²)')),
        h('div', { class: 'w-stat' }, stWph, wphLabel));
      const formula = h('div', { class: 'w-formula', html: 'r = (1/B)·√(2mV<sub>ext</sub>/q) → B = √(2mV<sub>ext</sub>/q) / r &nbsp;·&nbsp; x<sub>slit</sub> ≈ (r + L)·Δm / 2m &nbsp;·&nbsp; E = q·(V<sub>ext</sub> + V<sub>col</sub>) &nbsp;·&nbsp; Q = ∫I·dt / (q·A) → t = Q·q·A / I' });

      // ================= physics =================
      let phys = null;
      function compute() {
        const sp = st.sp, m = sp.m * AMU;
        const B = Math.sqrt(2 * m * st.vext * 1e3 / Q_E) / R_MAG;
        const E = st.vext + st.vcol;                                   // keV, singly charged
        const v = Math.sqrt(2 * E * 1e3 * Q_E / m);
        const I0 = 0.01e-3 * Math.pow(3000, st.iFrac / 100), I = +I0.toPrecision(2);  // A: 10 µA … 30 mA, 2 significant figures
        const dose = 1e12 * Math.pow(1e4, st.dFrac / 100);             // cm⁻²
        const tBeam = dose * Q_E * WAFER_CM2 / I;
        const wph = 3600 / (tBeam * OVERSCAN + HANDLING_S);
        const list = PLASMA[sp.plasma].map(([mi, rel, name, contam]) => ({ m: mi, rel, name, contam: !!contam, mm: DISP * (mi - sp.m) / (2 * sp.m) * 1000 }));
        const nb = list.filter(x => x.m !== sp.m).sort((a, b) => Math.abs(a.mm) - Math.abs(b.mm))[0];
        phys = { B, E, v, I, dose, tBeam, wph, power: I * E * 1e3, list, nb, kE: clamp(Math.sqrt(E / st.vext), 0.45, 2.2) };
      }
      const fmtTime = s => s < 60 ? fmt(s, s < 10 ? 1 : 0) + ' s' : s < 3600 ? fmt(s / 60, 1) + ' min' : fmt(s / 3600, 1) + ' h';
      function updateReadouts() {
        const p = phys, sp = st.sp;
        vextOut.textContent = st.vext + ' kV'; vcolOut.textContent = (st.vcol > 0 ? '+' : st.vcol < 0 ? '−' : '') + Math.abs(st.vcol) + ' kV'; tiltOut.textContent = st.tilt + '°';
        iOut.textContent = p.I < 1e-3 ? fmt(p.I * 1e6, 0) + ' µA' : fmt(p.I * 1e3, p.I < 1e-2 ? 1 : 0) + ' mA';
        dOut.innerHTML = sci(p.dose) + ' cm⁻²';
        stB.textContent = p.B.toFixed(p.B < 0.2 ? 3 : 2) + ' T'; stB.style.color = p.B > 1 ? 'var(--warn)' : ''; bLabel.textContent = p.B > 1 ? 'analyser field for r = 0.35 m: above ~1 T, more than a typical magnet gives' : 'analyser field for r = 0.35 m';
        stNb.textContent = p.nb.name + ' ' + (p.nb.mm > 0 ? '+' : '−') + (Math.abs(p.nb.mm) < 20 ? Math.abs(p.nb.mm).toFixed(1) : fmt(Math.abs(p.nb.mm), 0)) + ' mm';
        nbLabel.textContent = Math.abs(p.nb.mm) > SLIT_MM ? 'nearest wrong mass at the slit → blocked (slit ±' + fmt(SLIT_MM, 1) + ' mm)' : 'nearest wrong mass at the slit → PASSES';
        stE.textContent = fmt(p.E, p.E < 10 ? 1 : 0) + ' keV';
        eLabel.textContent = sp.atom < 1 ? 'final ion energy (boron atom gets 11/49: ' + fmt(p.E * sp.atom, 1) + ' keV)' : 'final ion energy = q·(V_ext + V_col)';
        stV.textContent = fmt(p.v / 1000, 0) + ' km/s';
        stT.textContent = fmtTime(p.tBeam);
        stWph.textContent = '≈ ' + fmt(+p.wph.toPrecision(2), p.wph < 10 ? 1 : 0) + ' wph';
        wphLabel.textContent = 'wafers/hour with 30 % overscan + 8 s handling · beam power ' + (p.power >= 1000 ? fmt(p.power / 1000, 1) + ' kW' : fmt(p.power, p.power < 10 ? 1 : 0) + ' W');
      }

      // ================= scene =================
      function build(m, fs) {
        const wide = m === 'wide', fsm = fs - 0.5;
        const M = wide ? (x, y) => [x, y] : (x, y) => [y + 30, x + 30];
        const W = wide ? 760 : 380, H = wide ? 358 : 1010;
        const D = svg('svg', { class: 'w-svg', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Top-down schematic of an ion implanter: source, extraction, analyser magnet, resolving slit, acceleration column, scanner, corrector magnet and end station with a tilted wafer' });
        const P = (x, y) => M(x, y).map(v => +v.toFixed(1));
        const rc = (x0, y0, x1, y1, a) => { const [p, q] = M(x0, y0), [r, s] = M(x1, y1); return svg('rect', Object.assign({ x: Math.min(p, r), y: Math.min(q, s), width: Math.abs(r - p), height: Math.abs(s - q) }, a)); };
        const ln = (x0, y0, x1, y1, a) => { const [p, q] = M(x0, y0), [r, s] = M(x1, y1); return svg('line', Object.assign({ x1: p, y1: q, x2: r, y2: s }, a)); };
        const dOf = (pts, close) => pts.map((p, i) => (i ? 'L' : 'M') + P(p[0], p[1]).join(',')).join(' ') + (close ? ' Z' : '');
        const pl = (pts, a, close) => svg('path', Object.assign({ d: dOf(pts, close) }, a));
        const arc = (cx, cy, r, a0, a1, n = 18) => { const o = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; };
        const T = (txt, w, n, o = {}) => { const [x, y, an] = wide ? w : n; return svg('text', { x, y, 'text-anchor': an || 'start', 'font-family': o.mono ? 'var(--mono)' : 'var(--sans)', 'font-size': o.size || (o.mono ? fsm : fs), fill: o.fill || 'var(--muted)', 'font-weight': o.bold ? 600 : null }, txt); };
        const S = { D, M, P, wide, fs, fsm };

        // ---- ion source ----
        D.append(rc(76, 34, 150, 96, { fill: 'var(--panel2)', stroke: 'var(--ink)', 'stroke-opacity': .6, 'stroke-width': 1.5 }));
        D.append(rc(106, 93, 118, 99, { fill: 'var(--panel)' }));                                 // extraction slit in the chamber wall
        D.append(svg('ellipse', Object.assign({ rx: wide ? 22 : 16, ry: wide ? 16 : 22, fill: 'var(--accent2)', 'fill-opacity': .35 }, (() => { const [cx, cy] = P(118, 62); return { cx, cy }; })())));
        D.append(pl([[86, 44], [92, 50], [86, 56], [92, 62], [86, 68], [92, 74], [86, 80]], { fill: 'none', stroke: 'var(--warn)', 'stroke-width': 2 }));  // hot cathode
        if (wide) { D.append(ln(14, 62, 74, 62, { stroke: 'var(--ok)', 'stroke-width': 2 }), pl([[66, 57], [74, 62], [66, 67]], { fill: 'none', stroke: 'var(--ok)', 'stroke-width': 2 })); }
        else { D.append(svg('line', { x1: 14, y1: 143, x2: 62, y2: 143, stroke: 'var(--ok)', 'stroke-width': 2 }), svg('path', { d: 'M54,138 L62,143 L54,148', fill: 'none', stroke: 'var(--ok)', 'stroke-width': 2 })); }
        S.gasT = T(st.sp.gas + ' in', [14, 53, 'start'], [14, 132, 'start'], { fill: 'var(--ok)', mono: true });
        D.append(S.gasT, T('Ion source', [76, 25, 'start'], [64, 76, 'start'], { fill: 'var(--ink)', bold: true }));
        if (wide) D.append(T('arc plasma', [156, 66, 'start'], null), T('cathode', [72, 84, 'end'], null), ln(74, 81, 86, 78, { stroke: 'var(--muted)', 'stroke-width': 1 }));
        S.srcV = T('', [113, 91, 'middle'], [64, 97, 'start'], { mono: true, fill: 'var(--ink)' }); D.append(S.srcV);
        // ---- extraction ----
        [[108, 113, 'suppression electrode'], [124, 129, 'ground electrode']].forEach(([y0, y1, name], i) => {
          D.append(rc(80, y0, 102, y1, { fill: 'var(--ink)', 'fill-opacity': .7 }), rc(122, y0, 144, y1, { fill: 'var(--ink)', 'fill-opacity': .7 }));
          if (wide) D.append(T(name, [150, y1, 'start'], null));
        });
        if (!wide) D.append(T('extraction', [148, 200, 'middle'], [148, 200, 'middle']), T('electrodes', [148, 218, 'middle'], [148, 218, 'middle']));
        // ---- analyser magnet ----
        const sector = (r0, r1, a) => pl(arc(CX, MY, r1, 180, 90).concat(arc(CX, MY, r0, 90, 180)), a, true);
        D.append(sector(124, 138, { fill: 'var(--cu)', 'fill-opacity': .55 }), sector(42, 56, { fill: 'var(--cu)', 'fill-opacity': .55 }), sector(56, 124, { fill: 'var(--si)', 'fill-opacity': .45, stroke: 'var(--si)' }));
        for (let a = 100; a < 180; a += 20) D.append(pl([[CX + 126 * Math.cos(a * Math.PI / 180), MY + 126 * Math.sin(a * Math.PI / 180)], [CX + 136 * Math.cos(a * Math.PI / 180), MY + 136 * Math.sin(a * Math.PI / 180)]], { stroke: 'var(--cu)', 'stroke-width': 1 }));
        D.append(T('Analyser magnet', [16, 300, 'start'], [376, 40, 'end'], { fill: 'var(--ink)', bold: true }), T('90° sector, r = 0.35 m', [16, 316, 'start'], [376, 58, 'end']));
        S.magB = T('', [16, 333, 'start'], [376, 77, 'end'], { mono: true, fill: 'var(--accent)', bold: true }); D.append(S.magB);
        // ---- resolving slit ----
        D.append(rc(250, 198, 258, MAIN_Y - SLIT_PX, { fill: 'var(--ink)', 'fill-opacity': .75 }), rc(250, MAIN_Y + SLIT_PX, 258, 286, { fill: 'var(--ink)', 'fill-opacity': .75 }));
        D.append(T('resolving slit', [254, 190, 'middle'], [218, 290, 'end'], { fill: 'var(--ink)' }), T('m/Δm ≈ 80', [254, 302, 'middle'], [218, 308, 'end'], { mono: true }));
        // ---- acceleration column ----
        D.append(rc(X_COL0, 214, X_COL1, 270, { fill: 'var(--panel2)', 'fill-opacity': .6, stroke: 'var(--line2)', 'stroke-dasharray': '4 3' }));
        for (let i = 0; i < 8; i++) { const x = X_COL0 + 8 + i * 14; D.append(rc(x, 222, x + 4, 262, { fill: 'var(--si)' })); }
        D.append(T('acceleration column', [347, 206, 'middle'], [236, 372, 'end'], { fill: 'var(--ink)' }));
        S.colV = T('', [347, 287, 'middle'], [236, 392, 'end'], { mono: true, fill: 'var(--ink)' }); D.append(S.colV);
        // ---- scanner ----
        D.append(rc(X_SC0, 214, X_SC1, 219, { fill: 'var(--ink)', 'fill-opacity': .7 }), rc(X_SC0, 265, X_SC1, 270, { fill: 'var(--ink)', 'fill-opacity': .7 }));
        D.append(T('scanner', [460, 287, 'middle'], [236, 496, 'end'], { fill: 'var(--ink)' }));
        // ---- corrector magnet ----
        D.append(rc(X_CORR0, 160, X_CORR1, 324, { fill: 'var(--si)', 'fill-opacity': .55, stroke: 'var(--si)' }));
        D.append(T('corrector magnet', [556, 350, 'end'], [182, 574, 'end'], { fill: 'var(--ink)' }));
        // ---- end station ----
        D.append(rc(ES[0], ES[1], ES[2], ES[3], { fill: 'var(--panel2)', 'fill-opacity': .5, stroke: 'var(--line2)', rx: 8 }));
        D.append(T('End station · ~10⁻⁶ torr', [566, 168, 'start'], [178, 604, 'end']));
        D.append(rc(738, 226, 744, 258, { fill: 'var(--ink)', 'fill-opacity': .7 }), rc(720, 226, 744, 231, { fill: 'var(--ink)', 'fill-opacity': .7 }), rc(720, 253, 744, 258, { fill: 'var(--ink)', 'fill-opacity': .7 }));
        D.append(T('Faraday cup', [746, 278, 'end'], [272, 800, 'middle']));
        S.beamG = svg('g'); S.nbG = svg('g'); S.wafG = svg('g'); D.append(S.beamG, S.nbG, S.wafG);
        S.wafT = T('', [WX + 4, 350, 'middle'], [178, 692, 'end'], { fill: 'var(--ink)' }); D.append(S.wafT);
        S.tiltT = T('', [WX - 40, 232, 'end'], [178, 712, 'end'], { mono: true, fill: 'var(--accent)' }); D.append(S.tiltT);
        // ---- mass panel ----
        S.panel = svg('g', { transform: wide ? 'translate(300 10)' : 'translate(12 814)' }); S.panelW = wide ? 446 : 356; D.append(S.panel);
        // ---- particles + flashes ----
        S.pG = svg('g'); S.fG = svg('g'); D.append(S.pG, S.fG);
        S.pool = []; for (let i = 0; i < 90; i++) { const c = svg('circle', { r: 0 }); S.pG.append(c); S.pool.push(c); }
        S.fpool = []; for (let i = 0; i < 14; i++) { const c = svg('circle', { r: 0, fill: 'none', 'stroke-width': 1.5 }); S.fG.append(c); S.fpool.push(c); }
        // ---- hotspots ----
        const hs = svg('g');
        const hot = (x0, y0, x1, y1, key) => {
          const r = rc(x0, y0, x1, y1, { rx: 4, fill: 'var(--accent)', 'fill-opacity': 0, stroke: 'transparent', 'stroke-width': 1.5, 'pointer-events': 'all', tabindex: 0, role: 'button', 'aria-label': PARTS[key][0], style: { cursor: 'pointer', outline: 'none', transition: 'fill-opacity .12s' } });
          const on = f => { r.setAttribute('fill-opacity', f ? .14 : 0); r.setAttribute('stroke', f ? 'var(--accent)' : 'transparent'); if (f) setInfo(key); else defaultInfo(); };
          r.addEventListener('pointerenter', () => on(true)); r.addEventListener('pointerleave', () => on(false));
          r.addEventListener('focus', () => on(true)); r.addEventListener('blur', () => on(false)); r.addEventListener('click', () => setInfo(key));
          hs.append(r);
        };
        hot(72, 30, 154, 100, 'source'); hot(76, 104, 148, 133, 'extraction'); hot(60, 140, 204, 292, 'magnet'); hot(244, 194, 264, 292, 'slit');
        hot(X_COL0 - 4, 210, X_COL1 + 4, 274, 'column'); hot(X_SC0 - 4, 210, X_SC1 + 4, 274, 'scanner'); hot(X_CORR0 - 4, 156, X_CORR1 + 4, 328, 'corrector');
        hot(580, 170, 714, 330, 'wafer'); hot(716, 220, 748, 264, 'faraday');
        D.append(hs);
        return S;
      }

      // ---- dynamic drawing (tilt / species dependent) ----
      const arcPts = (r, ax, n = 16) => { const o = []; for (let i = 0; i <= n; i++) { const a = Math.PI - (Math.PI / 2) * i / n; o.push([ax + r + r * Math.cos(a), MY + r * Math.sin(a)]); } return o; };
      function drawWafer() {
        const S = scene, g = S.wafG; g.innerHTML = '';
        const t = st.tilt * Math.PI / 180, sx = Math.sin(t), cy = Math.cos(t);
        const pt = (u, back) => [WX - u * sx + back * cy, MAIN_Y + u * cy + back * sx];
        const dOf = pts => pts.map((p, i) => (i ? 'L' : 'M') + S.P(p[0], p[1]).join(',')).join(' ');
        g.append(svg('path', { d: dOf([pt(-WAF_HALF - 6, 7), pt(WAF_HALF + 6, 7)]), stroke: 'var(--line2)', 'stroke-width': 9, 'stroke-linecap': 'round' }));       // platen
        g.append(svg('path', { d: dOf([pt(0, 10), [WX - 10 * Math.sin(t) + 7 * cy, ES[3] - 2]]), stroke: 'var(--line2)', 'stroke-width': 6 }));                        // chuck arm from the side wall
        g.append(svg('path', { d: dOf([pt(-WAF_HALF, 0), pt(WAF_HALF, 0)]), stroke: 'var(--si)', 'stroke-width': 4.5, 'stroke-linecap': 'round' }));                   // wafer, edge-on
        g.append(svg('path', { d: dOf([pt(0, 0), pt(0, -34)]), stroke: 'var(--accent)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));                            // wafer normal
        g.append(svg('path', { d: dOf([[WX, MAIN_Y], [WX - 34, MAIN_Y]]), stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));                  // beam axis
        if (st.tilt > 0) g.append(svg('path', { d: dOf(Array.from({ length: 9 }, (_, i) => { const a = Math.PI + t * i / 8; return [WX + 26 * Math.cos(a), MAIN_Y + 26 * Math.sin(a)]; })), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.5 }));
        S.wafT.textContent = '300 mm wafer on platen'; S.tiltT.textContent = 'tilt ' + st.tilt + '°';
        // beam envelope: arm → arc → main line, fan, parallel band to the wafer
        const b = S.beamG; b.innerHTML = '';
        b.append(svg('path', { d: dOf([[AX, AY0], [AX, MY]].concat(arcPts(R, AX), [[X_SC1, MAIN_Y]])), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 7, 'stroke-opacity': .16 }));
        const ve = WAF_HALF * cy;   // rays beyond the wafer's projected edge overscan to the back wall
        b.append(svg('path', { d: dOf([[X_SC1, MAIN_Y - 2], [X_CORR0, MAIN_Y - FAN], [X_CORR1, MAIN_Y - FAN], [X_DUMP, MAIN_Y - FAN], [X_DUMP, MAIN_Y - ve], pt(-WAF_HALF, 0), pt(WAF_HALF, 0), [X_DUMP, MAIN_Y + ve], [X_DUMP, MAIN_Y + FAN], [X_CORR1, MAIN_Y + FAN], [X_CORR0, MAIN_Y + FAN], [X_SC1, MAIN_Y + 2]]) + ' Z', fill: 'var(--accent)', 'fill-opacity': .12, stroke: 'var(--accent)', 'stroke-opacity': .35, 'stroke-width': 1 }));
        // neighbouring masses: dashed paths that end on the slit plate (or the magnet wall)
        const n = S.nbG; n.innerHTML = '';
        phys.list.filter(x => x.m !== st.sp.m).sort((a, c) => Math.abs(a.mm) - Math.abs(c.mm)).slice(0, 2).forEach(x => {
          const off = clamp(x.mm * PX_PER_MM, -40, 40), r = R + off, pts = [[AX, AY0], [AX, MY]].concat(arcPts(r, AX));
          if (Math.abs(x.mm) <= 40) pts.push([X_SLIT - 4, MAIN_Y + off]);
          n.append(svg('path', { d: dOf(pts), fill: 'none', stroke: 'var(--bad)', 'stroke-width': 1.2, 'stroke-dasharray': '4 3', 'stroke-opacity': .8 }));
        });
      }
      function drawPanel() {
        const S = scene, g = S.panel, pw = S.panelW, fs = S.fs, fsm = S.fsm, lh = fs + 2; g.innerHTML = '';
        const x0 = pw / 2, k = (pw - 44) / 80, wOf = s => s.length * fsm * 0.62;
        const tx = (x, y, s, o = {}) => svg('text', { x, y, 'text-anchor': o.an || 'middle', 'font-family': o.mono ? 'var(--mono)' : 'var(--sans)', 'font-size': o.mono ? fsm : fs, fill: o.fill || 'var(--muted)', 'font-weight': o.bold ? 600 : null }, s);
        g.append(tx(0, 12, 'Where each ion in the ' + st.sp.gas + ' plasma lands at the slit', { an: 'start', fill: 'var(--ink)', bold: true }));
        // off-scale ions (they never leave the magnet)
        const list = phys.list, offL = list.filter(x => x.mm < -40), offR = list.filter(x => x.mm > 40);
        const names = l => l.slice(0, 3).map(x => x.name).join(', ') + (l.length > 3 ? ', …' : '');
        const tL = offL.length ? '← ' + names(offL) + ' hit the wall' : '', tR = offR.length ? names(offR) + ' hit the wall →' : '';
        let y = 30;
        if (tL) g.append(tx(22, y, tL, { an: 'start', mono: true, fill: 'var(--bad)' }));
        if (tR) { if (tL && wOf(tL) + wOf(tR) + 12 > pw - 44) y += lh; g.append(tx(pw - 22, y, tR, { an: 'end', mono: true, fill: 'var(--bad)' })); }
        // in-range ions: labels stacked into rows so they never overlap, then a stem down to each bar
        const inR = list.filter(x => Math.abs(x.mm) <= 40).sort((a, b) => a.mm - b.mm), rowsRight = [], rowOf = [];
        inR.forEach(x => { const px = x0 + x.mm * k, w = wOf(x.name), left = px - w / 2; let r = rowsRight.findIndex(rt => left > rt + 6); if (r < 0) { r = rowsRight.length; rowsRight.push(-1e9); } rowsRight[r] = px + w / 2; rowOf.push(r); });
        const yLab0 = y + lh + 4, nRows = Math.max(1, rowsRight.length), barTop = yLab0 + (nRows - 1) * lh + 8, y0 = barTop + 34;
        g.append(svg('rect', { x: x0 - SLIT_MM * k, y: barTop - 6, width: 2 * SLIT_MM * k, height: y0 - barTop + 6, fill: 'var(--accent)', 'fill-opacity': .14, stroke: 'var(--accent)', 'stroke-dasharray': '3 2' }));
        g.append(svg('line', { x1: 22, y1: y0, x2: pw - 22, y2: y0, stroke: 'var(--line2)', 'stroke-width': 1.5 }));
        [-40, -20, 20, 40].forEach(mm => g.append(svg('line', { x1: x0 + mm * k, y1: y0, x2: x0 + mm * k, y2: y0 + 4, stroke: 'var(--line2)' }), tx(x0 + mm * k, y0 + fs + 4, (mm > 0 ? '+' : '−') + Math.abs(mm) + ' mm', { mono: true })));
        g.append(tx(x0, y0 + fs + 4, 'slit ±' + fmt(SLIT_MM, 1) + ' mm', { fill: 'var(--accent)', bold: true }));
        const colOf = x => x.m === st.sp.m ? 'var(--accent)' : x.contam ? 'var(--muted)' : 'var(--bad)', relMax = Math.max(...inR.map(x => x.rel), 0.01);
        inR.forEach((x, i) => {   // stems and bars first, labels (with an opaque backing) on top
          const px = x0 + x.mm * k, hgt = 5 + 29 * x.rel / relMax, col = colOf(x), yl = yLab0 + rowOf[i] * lh;
          g.append(svg('line', { x1: px, y1: yl + 3, x2: px, y2: y0 - hgt, stroke: col, 'stroke-width': 1, 'stroke-opacity': .5, 'stroke-dasharray': '2 2' }));
          g.append(svg('rect', { x: px - 3, y: y0 - hgt, width: 6, height: hgt, fill: col, 'fill-opacity': x.m === st.sp.m ? 1 : .85 }));
        });
        inR.forEach((x, i) => {
          const px = x0 + x.mm * k, w = wOf(x.name), yl = yLab0 + rowOf[i] * lh, sel = x.m === st.sp.m;
          g.append(svg('rect', { x: px - w / 2 - 2, y: yl - fs + 2, width: w + 4, height: fs + 2, fill: 'var(--panel)' }));
          g.append(tx(px, yl, x.name, { mono: true, fill: colOf(x), bold: sel }));
        });
        S.panelH = y0 + fs + 8;
        if (!S.wide) S.D.setAttribute('viewBox', '0 0 380 ' + Math.round(814 + S.panelH));
      }
      function updateTexts() {
        const S = scene; if (!S) return;
        S.gasT.textContent = st.sp.gas + ' in'; S.srcV.textContent = '+' + st.vext + ' kV';
        S.magB.textContent = 'B = ' + phys.B.toFixed(2) + ' T for ' + st.sp.ion; S.magB.setAttribute('fill', phys.B > 1 ? 'var(--warn)' : 'var(--accent)');
        S.colV.textContent = (st.vcol >= 0 ? '+' : '−') + Math.abs(st.vcol) + ' kV → ' + fmt(phys.E, phys.E < 10 ? 1 : 0) + ' keV';
      }

      // ================= particles =================
      const rnd = (a, b) => a + Math.random() * (b - a);
      function spawn() {
        const sel = Math.random() < .55; let d = phys.list.find(x => x.m === st.sp.m);
        if (!sel) { const others = phys.list.filter(x => x.m !== st.sp.m); let tot = others.reduce((s, x) => s + x.rel + .05, 0), r = Math.random() * tot; for (const x of others) { r -= x.rel + .05; if (r <= 0) { d = x; break; } } }
        const p = { sel: d.m === st.sp.m, j: rnd(-1.5, 1.5), off: clamp(d.mm * PX_PER_MM, -40, 40), offscale: Math.abs(d.mm) > 40, u: rnd(-1, 1), s: 0 };
        makePath(p); particles.push(p);
      }
      function makePath(p) {
        const r = R + p.off, ax = AX + p.j, pts = [[ax, AY0], [ax, MY]].concat(arcPts(r, ax)), yl = MAIN_Y + p.off + p.j;
        if (p.offscale) p.stop = 'wall';
        else if (!p.sel) { pts.push([X_SLIT - 4, yl]); p.stop = 'slit'; }
        else {
          const v = FAN * p.u, t = st.tilt * Math.PI / 180;
          pts.push([X_SC1, yl], [X_CORR0, MAIN_Y + v], [X_CORR1, MAIN_Y + v]);
          if (Math.abs(v) <= WAF_HALF * Math.cos(t)) { pts.push([WX - v * Math.tan(t), MAIN_Y + v]); p.stop = 'wafer'; } else { pts.push([X_DUMP, MAIN_Y + v]); p.stop = 'dump'; }
        }
        p.pts = pts; p.cum = [0]; for (let i = 1; i < pts.length; i++) p.cum.push(p.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        p.len = p.cum[p.cum.length - 1];
      }
      function posOf(p) {
        const s = Math.min(p.s, p.len); let i = 1; while (i < p.cum.length - 1 && p.cum[i] < s) i++;
        const a = p.pts[i - 1], b = p.pts[i], u = (s - p.cum[i - 1]) / Math.max(1e-6, p.cum[i] - p.cum[i - 1]);
        return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
      }
      function step(dt) {
        clock += dt; spawnAcc += dt;
        while (spawnAcc > 0.07) { spawnAcc -= 0.07; if (particles.length < 88) spawn(); }
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i], [x] = posOf(p);
          p.s += 150 * dt * (x > X_COL1 ? phys.kE : 1);
          if (p.s >= p.len) { const q = posOf(p); flashes.push({ x: q[0], y: q[1], t: 0, kind: p.stop, sel: p.sel }); particles.splice(i, 1); }
        }
        for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].t += dt; if (flashes[i].t > .45) flashes.splice(i, 1); }
      }
      function paint() {
        const S = scene; if (!S) return;
        S.pool.forEach((c, i) => {
          const p = particles[i]; if (!p) { c.setAttribute('r', 0); return; }
          const [x, y] = S.M(...posOf(p));
          c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', p.sel ? 2.6 : 2.2);
          c.setAttribute('fill', p.sel ? 'var(--accent)' : 'var(--bad)'); c.setAttribute('fill-opacity', p.sel ? 1 : .8);
        });
        S.fpool.forEach((c, i) => {
          const f = flashes[i]; if (!f) { c.setAttribute('r', 0); return; }
          const [x, y] = S.M(f.x, f.y), k = f.t / .45;
          c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', (2 + k * (f.kind === 'wafer' ? 12 : 6)).toFixed(1));
          c.setAttribute('stroke', f.kind === 'wafer' ? 'var(--accent)' : f.kind === 'dump' ? 'var(--muted)' : 'var(--bad)'); c.setAttribute('stroke-opacity', (1 - k).toFixed(2));
        });
      }
      function frame(ts) {
        raf = 0; if (!st.playing || !visible) return;
        if (last) step(Math.min(0.05, (ts - last) / 1000) * (st.slow ? 0.3 : 1)); last = ts;
        paint(); raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && st.playing && visible) { last = 0; raf = requestAnimationFrame(frame); } }
      function warm() { particles.length = 0; flashes.length = 0; for (let i = 0; i < 260; i++) step(1 / 40); paint(); }

      // ================= wiring =================
      function updateAll(re) {
        st.sp = SPECIES.find(s => s.id === spSel.value) || SPECIES[0];
        st.vext = +vextIn.value; vcolIn.min = 1 - st.vext; if (+vcolIn.value < 1 - st.vext) vcolIn.value = 1 - st.vext; st.vcol = +vcolIn.value;
        st.tilt = +tiltIn.value; st.iFrac = +iIn.value; st.dFrac = +dIn.value;
        compute(); updateReadouts(); updateTexts();
        if (scene) { drawWafer(); drawPanel(); }
        if (re === 'species') { defaultInfo(); warm(); } else { particles.forEach(makePath); paint(); }
      }
      spSel.addEventListener('change', () => updateAll('species'));
      [vextIn, vcolIn, tiltIn, iIn, dIn].forEach(i => i.addEventListener('input', () => updateAll()));

      const stage = h('div');
      function relayout() {
        const style = getComputedStyle(el);
        const cw = Math.floor(el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)) || 700;
        const m = cw >= 600 ? 'wide' : 'narrow';
        const fs = m === 'wide' ? Math.min(14, Math.max(12, Math.round(11.2 * 760 / cw * 2) / 2)) : Math.min(16, Math.max(12, Math.round(11.2 * 380 / cw * 2) / 2));
        if (m === mode && fs === fsCur) return;
        mode = m; fsCur = fs;
        if (scene) scene.D.remove();
        scene = build(m, fs); stage.append(scene.D);
        updateTexts(); drawWafer(); drawPanel(); paint();
      }

      el.append(controls, stage, info,
        h('div', { class: 'w-note', style: { marginTop: '0' } }, 'Amber dots are the wanted ion; red dots are other masses from the same plasma, drawn with their true offset at the slit (1 px ≈ 0.6 mm). After the scanner the beam fans out, the corrector magnet makes it parallel again, and the platen holds the wafer at the tilt you set (seen from above).'),
        h('div', { style: { fontFamily: 'var(--sans)', fontWeight: 600, fontSize: '13px', marginTop: '14px' } }, 'Dose and throughput'),
        doseControls, readout, formula,
        h('div', { class: 'w-note' }, 'Slit offsets use the small-Δm dispersion of a 90° sector plus a 0.25 m drift; real tools tune B from a lookup table and peak the current through the slit. Beam time is the module’s worked example (1×10¹⁵ As⁺ at 20 mA → 5.7 s); low-dose implants are limited by wafer handling and mechanical scan to ~200–500 wph, not by the beam.'));
      compute(); updateReadouts(); defaultInfo();
      const ro = new ResizeObserver(() => relayout()); ro.observe(el);
      relayout(); warm();
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); }); io.observe(el);
      start();
      return () => { if (raf) cancelAnimationFrame(raf); raf = 0; st.playing = false; io.disconnect(); ro.disconnect(); };
    }
  });
})();
