/* Widget: euv-source — "Inside an EUV Scanner" (Module 08, flagship) */
(function () {
  'use strict';

  const R_MIRROR = 0.67, R_RETICLE = 0.65;        // Mo/Si mirror reflectance; patterned reticle (absorber + cap)
  const N_ILLUM = 4, N_POB = 6;                   // reflections after the IF: 4 illuminator + reticle + 6 projection
  const DROPLET_HZ = 50000, DROPLET_NG = 72;      // 27 µm tin droplets, ~72 ng each
  const WAFER_J = 707 * 0.030;                    // 707 cm² × 30 mJ/cm² = 21.2 J per wafer
  const pWafer = pIF => pIF * Math.pow(R_MIRROR, N_ILLUM + N_POB) * R_RETICLE;   // ≈ 1.2% of P_IF

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = t => Math.max(0, Math.min(1, t));
  const f1 = n => (+n).toFixed(1);
  const norm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
  const ptsAttr = arr => arr.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ');

  // ---------- Panel A geometry (viewBox 360×316): ellipsoidal collector with plasma at focus 1, IF at focus 2 ----------
  const P = { x: 150, y: 172 }, IFA = { x: 356, y: 172 };
  const RIM_X = 134, RIM_H = 100;                 // mirror rim sits 16 units behind the plasma (5 sr ⇒ plasma just in front of the mouth)
  const EC = (P.x + IFA.x) / 2;
  const EA = (Math.hypot(RIM_X - P.x, RIM_H) + Math.hypot(RIM_X - IFA.x, RIM_H)) / 2;
  const EB = Math.sqrt(EA * EA - Math.pow((IFA.x - P.x) / 2, 2));
  const ellPt = (deg, inset) => { const t = deg * Math.PI / 180; return [EC + (EA - (inset || 0)) * Math.cos(t), P.y + (EB - (inset || 0)) * Math.sin(t)]; };
  const T_RIM = Math.atan2(RIM_H / EB, (RIM_X - EC) / EA) * 180 / Math.PI;   // ≈134° (lower rim); upper rim at 360−T_RIM
  const HOLE = Math.asin(8 / EB) * 180 / Math.PI;                             // laser hole half-angle at the vertex
  const sample = (t0, t1, inset, n) => { const a = []; for (let i = 0; i <= (n || 24); i++) a.push(ellPt(lerp(t0, t1, i / (n || 24)), inset)); return a; };
  function hitMirror(deg) {                        // ray from focus 1 to the ellipse
    const th = deg * Math.PI / 180, u = (P.x - EC) / EA, p = Math.cos(th) / EA, q = Math.sin(th) / EB;
    const A = p * p + q * q, B = 2 * u * p, C = u * u - 1;
    const t = (-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A);
    return [P.x + t * Math.cos(th), P.y + t * Math.sin(th)];
  }
  const RAY_DEG = [104, 124, 144, 162, 198, 216, 236, 256];

  // ---------- Panel B geometry (viewBox 360×316): IF → FF → PF → 2 grazing folds → reticle → M1..M6 → wafer ----------
  const PATHB = [[12, 172], [60, 120], [100, 250], [84, 146], [110, 104], [150, 44], [214, 140], [332, 112], [212, 176], [334, 200], [214, 226], [300, 232], [270, 274]];
  const SEGB = []; let LENB = 0;
  for (let i = 1; i < PATHB.length; i++) { const d = Math.hypot(PATHB[i][0] - PATHB[i - 1][0], PATHB[i][1] - PATHB[i - 1][1]); SEGB.push(d); LENB += d; }
  function alongB(t) {
    let d = clamp01(t) * LENB;
    for (let i = 0; i < SEGB.length; i++) {
      if (d <= SEGB[i] || i === SEGB.length - 1) { const u = Math.min(1, d / SEGB[i]); return { x: lerp(PATHB[i][0], PATHB[i + 1][0], u), y: lerp(PATHB[i][1], PATHB[i + 1][1], u), seg: i }; }
      d -= SEGB[i];
    }
  }
  function mirrorDir(i) { const a = PATHB[i - 1], b = PATHB[i], c = PATHB[i + 1]; const di = norm([b[0] - a[0], b[1] - a[1]]), dout = norm([c[0] - b[0], c[1] - b[1]]); return norm([di[0] + dout[0], di[1] + dout[1]]); }

  const STAGES = ['IF', 'FF', 'PF', 'fold', 'fold', 'ret', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'];
  const FACTOR = [1, R_MIRROR, R_MIRROR, R_MIRROR, R_MIRROR, R_RETICLE, R_MIRROR, R_MIRROR, R_MIRROR, R_MIRROR, R_MIRROR, R_MIRROR];

  const PHASES = [
    ['Droplet falls', 'A piezo-driven nozzle pinches off a 27 µm sphere of molten tin every 20 µs; it falls at 70–80 m/s through the hydrogen toward the point where the laser is focused.'],
    ['Pre-pulse flattens it', 'A weak laser pulse vaporises one face of the sphere; the recoil flattens the drop into a pancake a few hundred µm wide — a far better target than a bead smaller than the laser spot.'],
    ['Main pulse: plasma', 'A ~300 mJ, 10.6 µm pulse heats the pancake to 30–40 eV; Sn⁸⁺–Sn¹⁴⁺ ions radiate a broad band centred at 13.5 nm for ~100 ns, in every direction.'],
    ['Collector focuses to IF', 'The ellipsoidal Mo/Si mirror behind the plasma catches ~40% of those directions (5 sr) and refocuses the light at the intermediate focus, over a metre away.'],
    ['Scanner: 11 mirrors', 'From the IF the light bounces off 4 illuminator mirrors, the reticle and 6 projection mirrors; each keeps only ~65–67%, so about 1.2% of the IF power reaches the wafer.'],
  ];

  const COMPONENTS = {
    collector: { name: 'Collector', key: '~650 mm, ~5 sr, ×0.62 when new', info: 'An ellipsoidal Mo/Si mirror: every ray leaving one focus of an ellipse reflects to the other, so the plasma sits at the near focus and the IF at the far one. Tin slowly dulls it; swapped every few months.' },
    nozzle: { name: 'Droplet generator', key: '27 µm droplets, 50 kHz, 70–80 m/s', info: 'Molten tin at ~250 °C is forced through a micrometre nozzle; a piezo crystal squeezes it once per cycle so the jet breaks into one identical droplet per squeeze. A consumable, swapped every few weeks.' },
    plasma: { name: 'Tin droplet → plasma', key: '30–40 eV, Sn⁸⁺–Sn¹⁴⁺, CE ~5.5%', info: 'The main pulse heats the pre-shaped droplet to ~400,000 K; the ions radiate an unresolved transition array (UTA: many overlapping ion lines merging into one broad band) at 13.5 nm. ~5.5% of the laser energy comes out in-band.' },
    laser: { name: 'CO₂ drive laser (Trumpf)', key: '10.6 µm, ~25–40 kW average', info: 'An oscillator–amplifier chain fires a weak pre-pulse then a ~300 mJ main pulse, 50,000 times a second, through the hole in the collector. Its long wavelength stops at low plasma density, which is why conversion efficiency reaches 5–6%.' },
    h2: { name: 'Hydrogen buffer gas', key: '~1 mbar; Sn + 4H → SnH₄', info: 'Flowing H₂ slows tin ions and atoms before they hit the mirror, and hydrogen radicals turn deposited tin into stannane gas that the pumps remove — so the collector partly cleans itself.' },
    catcher: { name: 'Tin catcher', key: '~0.3 kg of tin per day', info: 'Droplets that are not hit, and tin that survives the pulse, land in a heated cup. The droplet train runs continuously whether or not a wafer is being exposed.' },
    if: { name: 'Intermediate focus (IF)', key: '250–600 W in-band (1 kW demonstrated)', info: 'A pinhead-sized focus at the wall between source and scanner, where ASML quotes source power. A fast hydrogen jet (dynamic gas lock) lets light through but keeps tin out; an energy sensor here logs every pulse.' },
    if2: { name: 'Intermediate focus (IF)', key: 'entrance to the illuminator', info: 'The same pinhead-sized focus seen from the scanner side: everything downstream is a mirror, and each one taxes the light by about a third.' },
    facet1: { name: 'Field facet mirror', key: 'hundreds of tiles, ×0.67', info: 'A segmented "fly\'s eye" mirror: each tile projects its own image of the plasma onto the same arc-shaped slit on the reticle, so hundreds of overlapping images average out the plasma\'s uneven brightness.' },
    facet2: { name: 'Pupil facet mirror', key: 'sets the illumination pupil, ×0.67', info: 'Sets the angles from which light reaches the reticle (annular, dipole, quasar or freeform pupils) by routing field facets to pupil facets — with no absorbing apertures to waste light.' },
    fold: { name: 'Grazing-incidence fold mirrors', key: '2 folds, >80% each (counted as ×0.67)', info: 'At a glancing angle of a few degrees EUV reflects almost totally (total external reflection, like a stone skipping on water), so the illuminator uses grazing mirrors wherever the geometry allows.' },
    reticle: { name: 'Reflective reticle', key: '152×152×6.35 mm, 6° chief ray, ×0.65', info: 'A Mo/Si mirror patterned with a ~60 nm tantalum absorber. Light must arrive off-axis (6°, drawn much wider here) or it would go straight back into the illuminator; the absorber then casts small shadows (mask 3D effects).' },
    wafer: { name: 'Wafer on scanning stage', key: '~1.2% of IF power, 21 J per wafer', info: 'A 300 mm wafer on a magnetically levitated stage, scanned through the arc-shaped image field in step with the reticle (4× reduction). At 30 mJ/cm² the whole wafer needs 21 J; the rest of the ~16 s per wafer is stage and handling overhead.' },
  };
  for (let i = 1; i <= 6; i++) COMPONENTS['m' + i] = { name: 'Projection mirror M' + i, key: 'figure ~50 pm RMS, ×0.67', info: 'One of six aspheric/freeform Zeiss mirrors that image the reticle onto the wafer at 4× reduction, 0.33 NA. Its shape is held to a quarter of a silicon atom; each reflection loses a third of the light.' };

  window.registerWidget('euv-source', {
    title: 'Inside an EUV Scanner',
    caption: 'Turn a tin droplet into a patterned beam of light. Explore the source, follow the scanner’s mirrors, then inspect how much power survives the journey.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const st = { playing: false, slow: false, P0: 500, wph: 220 };
      let raf = 0, visible = true, last = 0, phase = 0.47, curPhase = -1, curStage = -2;
      const uid = 'euvs' + Math.random().toString(36).slice(2, 7);

      const txt = (x, y, s, o) => { o = o || {}; return svg('text', { x, y, 'font-family': o.mono ? 'var(--mono)' : 'var(--sans)', 'font-size': o.size || 12.5, 'font-weight': o.bold ? 600 : 400, fill: o.fill || 'var(--muted)', 'text-anchor': o.anchor || 'start' }, s); };
      const marker = (id, color) => svg('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, svg('path', { d: 'M0,0 L10,5 L0,10 z', fill: color }));
      const defs = (scope = 'source') => svg('defs', null, marker(uid + '-' + scope + '-warn', 'var(--warn)'), marker(uid + '-' + scope + '-ok', 'var(--ok)'), marker(uid + '-' + scope + '-mu', 'var(--muted)'));
      const mk = (c, scope = 'source') => `url(#${uid}-${scope}-${c})`;

      // ================= Panel A: source vessel =================
      const A = svg('svg', { class: 'w-svg', viewBox: '0 0 360 316', role: 'img', 'aria-label': 'Source vessel: droplet generator, CO2 laser through the collector hole, tin plasma, ellipsoidal collector, intermediate focus' });
      A.append(defs());
      A.append(txt(2, 13, 'Source vessel (LPP)', { bold: true, fill: 'var(--ink)' }));
      A.append(svg('rect', { x: 2, y: 20, width: 356, height: 288, rx: 10, fill: 'var(--panel2)', 'fill-opacity': .5, stroke: 'var(--line2)' }));
      // collector: substrate + Mo/Si face, with the laser hole at the vertex
      const upper = sample(180 + HOLE, 360 - T_RIM), lower = sample(T_RIM, 180 - HOLE);
      [upper, lower].forEach(arc => {
        A.append(svg('polyline', { points: ptsAttr(arc), fill: 'none', stroke: 'var(--line2)', 'stroke-width': 11, 'stroke-linecap': 'round' }));
        A.append(svg('polyline', { points: ptsAttr(arc), fill: 'none', stroke: 'var(--si)', 'stroke-width': 6, 'stroke-linecap': 'round' }));
      });
      // H2 flow along the mirror face → rim → pumps
      A.append(svg('polyline', { points: ptsAttr(sample(184, 218, 12)), fill: 'none', stroke: 'var(--ok)', 'stroke-width': 1.6, 'marker-end': mk('ok') }));
      A.append(svg('polyline', { points: ptsAttr(sample(176, 142, 12)), fill: 'none', stroke: 'var(--ok)', 'stroke-width': 1.6, 'marker-end': mk('ok') }));
      A.append(svg('path', { d: 'M 136 279 Q 130 292 124 303', fill: 'none', stroke: 'var(--ok)', 'stroke-width': 1.6, 'marker-end': mk('ok') }));
      // CO2 laser along the axis through the hole
      const laser = svg('line', { x1: 2, y1: P.y, x2: P.x - 7, y2: P.y, stroke: 'var(--warn)', 'stroke-width': 2.5, 'stroke-dasharray': '7 4', opacity: .75, 'marker-end': mk('warn') });
      A.append(laser);
      // EUV rays: plasma → mirror → IF (exact for an ellipse with the plasma and IF at its foci)
      const rays = svg('g', { opacity: .5 });
      RAY_DEG.forEach(d => rays.append(svg('polyline', { points: ptsAttr([[P.x, P.y], hitMirror(d), [IFA.x, IFA.y]]), fill: 'none', stroke: 'var(--accent2)', 'stroke-width': 1.3 })));
      A.append(rays);
      // plasma glow (persistent) + target droplet/pancake
      const GLOW_R = [16, 10, 5], GLOW_O = [.15, .35, .9];
      const glow = GLOW_R.map((r, i) => svg('circle', { cx: P.x, cy: P.y, r, fill: 'var(--accent2)', opacity: GLOW_O[i] }));
      A.append(...glow);
      const target = svg('ellipse', { cx: P.x, cy: P.y, rx: 3.5, ry: 3.5, fill: 'var(--accent)', opacity: 0 });
      A.append(target);
      // droplet generator, droplet train, catcher
      A.append(svg('rect', { x: 139, y: 26, width: 22, height: 18, rx: 2, fill: 'var(--si)' }), svg('polygon', { points: '143,44 157,44 150,54', fill: 'var(--si)' }));
      A.append(svg('line', { x1: P.x, y1: P.y + 18, x2: P.x, y2: 290, stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-dasharray': '2 4', opacity: .6 }));
      const drops = [0, 1, 2, 3, 4].map(() => svg('circle', { cx: P.x, cy: 60, r: 3.5, fill: 'var(--accent)' }));
      A.append(...drops);
      A.append(svg('path', { d: 'M 142 291 v 9 q 0 4 4 4 h 8 q 4 0 4 -4 v -9', fill: 'var(--panel2)', stroke: 'var(--si)', 'stroke-width': 1.5 }));
      // IF aperture + ring
      A.append(svg('rect', { x: 353, y: 160, width: 9, height: 24, fill: 'var(--panel)' }));
      A.append(svg('circle', { cx: IFA.x, cy: IFA.y, r: 4.5, fill: 'none', stroke: 'var(--accent2)', 'stroke-width': 1.8 }));
      A.append(svg('line', { x1: 350, y1: 102, x2: 355, y2: 165, stroke: 'var(--muted)', 'stroke-width': 1 }));
      const packetA = svg('circle', { cx: P.x, cy: P.y, r: 5.5, fill: 'var(--accent2)', opacity: 0 });
      A.append(packetA);
      // labels (in place)
      A.append(txt(166, 36, 'Droplet generator: 27 µm Sn,'), txt(166, 50, '50 kHz, 70–80 m/s'));
      A.append(txt(6, 82, 'Collector', { bold: true, fill: 'var(--ink)' }), txt(6, 96, '650 mm Mo/Si'), txt(6, 110, 'ellipsoid'), txt(6, 124, '~5 sr'), txt(6, 138, 'R ≈ 0.62'));
      A.append(txt(6, 160, 'CO₂ laser', { bold: true, fill: 'var(--ink)' }), txt(6, 188, '10.6 µm'), txt(6, 202, '25–40 kW'));
      A.append(txt(6, 256, 'H₂ ~1 mbar', { fill: 'var(--ok)' }), txt(6, 270, 'slows debris;'), txt(6, 284, 'Sn + 4H → SnH₄'), txt(6, 298, '→ pumps'));
      A.append(txt(346, 84, 'Intermediate focus (IF)', { anchor: 'end', bold: true, fill: 'var(--ink)' }));
      const ifPowerA = txt(346, 98, '', { anchor: 'end', mono: true, fill: 'var(--accent2)' });
      A.append(ifPowerA);
      A.append(txt(188, 270, 'Sn plasma 30–40 eV,', { fill: 'var(--accent2)' }), txt(188, 284, 'radiates 13.5 nm'), txt(162, 303, 'tin catcher'));

      // ================= Panel B: scanner =================
      const Bs = svg('svg', { class: 'w-svg', viewBox: '0 0 360 316', role: 'img', 'aria-label': 'Scanner: illuminator facet mirrors, grazing folds, reflective reticle, six projection mirrors, wafer stage' });
      Bs.append(defs('scanner'));
      Bs.append(txt(2, 13, 'Scanner (vacuum, few Pa H₂)', { bold: true, fill: 'var(--ink)' }));
      Bs.append(svg('rect', { x: 2, y: 90, width: 168, height: 216, rx: 8, fill: 'var(--panel2)', 'fill-opacity': .5, stroke: 'var(--line2)' }));
      Bs.append(svg('rect', { x: 178, y: 62, width: 180, height: 182, rx: 8, fill: 'var(--panel2)', 'fill-opacity': .5, stroke: 'var(--line2)' }));
      // beam legs: width and opacity fall at every mirror
      for (let i = 0; i < PATHB.length - 1; i++) {
        const a = PATHB[i], b = PATHB[i + 1];
        Bs.append(svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'var(--accent2)', 'stroke-width': f1(lerp(2.6, 1.1, i / 11)), opacity: f1(lerp(.9, .45, i / 11)) }));
      }
      // mirrors: facet mirrors segmented, folds thin, projection mirrors solid
      function bar(i, len, segs, w) {
        const [x, y] = PATHB[i], d = mirrorDir(i), g = svg('g');
        g.append(svg('line', { x1: f1(x - d[0] * len / 2), y1: f1(y - d[1] * len / 2), x2: f1(x + d[0] * len / 2), y2: f1(y + d[1] * len / 2), stroke: 'var(--line2)', 'stroke-width': w + 4, 'stroke-linecap': 'round' }));
        for (let s = 0; s < segs; s++) {
          const t0 = -len / 2 + s * len / segs + 1, t1 = -len / 2 + (s + 1) * len / segs - 1;
          g.append(svg('line', { x1: f1(x + d[0] * t0), y1: f1(y + d[1] * t0), x2: f1(x + d[0] * t1), y2: f1(y + d[1] * t1), stroke: 'var(--si)', 'stroke-width': w, 'stroke-linecap': segs > 1 ? 'butt' : 'round' }));
        }
        Bs.append(g);
      }
      bar(1, 40, 6, 5); bar(2, 40, 6, 5); bar(3, 26, 1, 3); bar(4, 22, 1, 3);
      for (let i = 6; i <= 11; i++) bar(i, 24, 1, 5);
      // reticle: Mo/Si stripe with absorber ticks on the lit (lower) face
      Bs.append(svg('rect', { x: 96, y: 34, width: 108, height: 8, rx: 1.5, fill: 'var(--si)' }));
      for (let x = 101; x < 200; x += 8) Bs.append(svg('rect', { x, y: 39, width: 4, height: 4, fill: 'var(--ink)', opacity: .75 }));
      Bs.append(svg('line', { x1: 100, y1: 52, x2: 130, y2: 52, stroke: 'var(--muted)', 'stroke-width': 1.2, 'marker-start': mk('mu', 'scanner'), 'marker-end': mk('mu', 'scanner') }));
      Bs.append(svg('circle', { cx: 12, cy: 172, r: 4.5, fill: 'none', stroke: 'var(--accent2)', 'stroke-width': 1.8 }));
      // wafer + stage + scan arrow
      Bs.append(svg('rect', { x: 236, y: 280, width: 68, height: 10, rx: 2, fill: 'var(--line2)' }));
      Bs.append(svg('ellipse', { cx: 270, cy: 274, rx: 40, ry: 6, fill: 'var(--si)', 'fill-opacity': .6, stroke: 'var(--si)' }));
      Bs.append(svg('line', { x1: 196, y1: 274, x2: 226, y2: 274, stroke: 'var(--muted)', 'stroke-width': 1.2, 'marker-start': mk('mu', 'scanner'), 'marker-end': mk('mu', 'scanner') }));
      const waferFlash = svg('circle', { cx: 270, cy: 272, r: 4, fill: 'var(--accent2)', opacity: 0 });
      const packetHalo = svg('circle', { cx: 12, cy: 172, r: 12, fill: 'var(--accent2)', opacity: 0 });
      const packetB = svg('circle', { cx: 12, cy: 172, r: 5.5, fill: 'var(--accent2)', opacity: 0 });
      Bs.append(waferFlash, packetHalo, packetB);
      // labels
      Bs.append(txt(2, 29, 'Reflective reticle (Mo/Si + Ta absorber)'));
      Bs.append(txt(92, 46, '4× scan', { anchor: 'end' }));
      Bs.append(txt(212, 44, '6° chief-ray angle'));
      const retPowerB = txt(212, 58, '', { mono: true, fill: 'var(--accent2)' });
      Bs.append(retPowerB);
      Bs.append(txt(60, 108, 'field facet', { anchor: 'middle' }), txt(100, 270, 'pupil facet', { anchor: 'middle' }), txt(96, 152, 'grazing'), txt(96, 166, 'folds'));
      Bs.append(txt(6, 300, 'Illuminator', { bold: true, fill: 'var(--ink)' }));
      const ifPowerB = txt(20, 190, '', { mono: true, fill: 'var(--accent2)' });
      const wafPowerB = txt(316, 278, '', { mono: true, bold: true, fill: 'var(--accent2)' });
      Bs.append(ifPowerB, wafPowerB);
      Bs.append(txt(354, 78, 'Projection optics', { anchor: 'end', bold: true, fill: 'var(--ink)' }), txt(354, 92, '6 mirrors, 4×, NA 0.33', { anchor: 'end' }));
      for (let i = 0; i < 6; i++) { const [x, y] = PATHB[6 + i], left = i % 2 === 0; Bs.append(txt(left ? x - 18 : x + 11, y + 4, 'M' + (i + 1), { mono: true, anchor: left ? 'end' : 'start' })); }
      Bs.append(txt(196, 266, 'scan'), txt(270, 306, 'Wafer on mag-lev stage', { anchor: 'middle' }));

      // ================= hotspots (shaped to their parts) =================
      const infoStack = h('div');
      const infoViews = {};
      function addInfo(key, name, keyNum, body) {
        const v = h('div', { hidden: true }, h('div', null, h('b', null, name + '  —  ' + keyNum)), h('div', { style: { color: 'var(--muted)', marginTop: '2px' } }, body));
        infoStack.append(v); infoViews[key] = v; return v;
      }
      const idleView = addInfo('_idle', 'Hover, focus or tap a part of either drawing', '', 'Each labelled component reveals what it does and a key number.');
      Object.keys(COMPONENTS).forEach(k => addInfo(k, COMPONENTS[k].name, COMPONENTS[k].key, COMPONENTS[k].info));
      let shown = infoViews.collector; shown.hidden = false;
      const setInfo = key => { const v = infoViews[key] || idleView; if (v === shown) return; shown.hidden = true; v.hidden = false; shown = v; };
      const info = h('div', { style: { border: '1px solid var(--line)', borderRadius: '6px', padding: '8px 12px', margin: '10px 0', fontSize: '13px' } }, infoStack);

      function hotspot(parent, key, shapes) {
        const data = COMPONENTS[key];
        shapes.forEach(sh => {
          const stroked = sh.getAttribute('data-kind') === 'stroke';
          sh.setAttribute('fill', stroked ? 'none' : 'var(--accent)'); sh.setAttribute('fill-opacity', 0);
          sh.setAttribute('stroke', 'var(--accent)'); sh.setAttribute('stroke-opacity', 0); sh.setAttribute('stroke-width', stroked ? 20 : 1.5);
          sh.setAttribute('pointer-events', stroked ? 'stroke' : 'all'); sh.setAttribute('tabindex', 0); sh.setAttribute('role', 'button'); sh.setAttribute('aria-label', data.name);
          Object.assign(sh.style, { cursor: 'pointer', outline: 'none', transition: 'fill-opacity .12s, stroke-opacity .12s' });
          const on = () => { setInfo(key); shapes.forEach(s => { s.setAttribute('fill-opacity', s.getAttribute('data-kind') === 'stroke' ? 0 : .16); s.setAttribute('stroke-opacity', s.getAttribute('data-kind') === 'stroke' ? .35 : 1); }); };
          const off = () => shapes.forEach(s => { s.setAttribute('fill-opacity', 0); s.setAttribute('stroke-opacity', 0); });
          sh.addEventListener('pointerenter', on); sh.addEventListener('focus', on); sh.addEventListener('click', on);
          sh.addEventListener('pointerleave', off); sh.addEventListener('blur', off);
          parent.append(sh);
        });
      }
      const rect = (x, y, w, hh) => svg('rect', { x, y, width: w, height: hh, rx: 4 });
      const circ = (x, y, r) => svg('circle', { cx: x, cy: y, r });
      hotspot(A, 'collector', [rect(3, 72, 70, 70), svg('polyline', { points: ptsAttr(sample(T_RIM, 360 - T_RIM, 0, 40)), 'data-kind': 'stroke' })]);
      hotspot(A, 'nozzle', [rect(136, 22, 210, 34)]);
      hotspot(A, 'plasma', [circ(P.x, P.y, 24)]);
      hotspot(A, 'laser', [rect(2, 148, 78, 60)]);
      hotspot(A, 'h2', [rect(2, 244, 118, 62)]);
      hotspot(A, 'if', [rect(196, 73, 152, 28), circ(IFA.x, IFA.y, 14)]);
      hotspot(A, 'catcher', [rect(140, 288, 94, 20)]);
      hotspot(Bs, 'if2', [rect(4, 160, 72, 36)]);
      hotspot(Bs, 'facet1', [rect(22, 96, 56, 32)]);
      hotspot(Bs, 'facet2', [rect(62, 240, 78, 36)]);
      hotspot(Bs, 'fold', [rect(80, 92, 64, 78)]);
      hotspot(Bs, 'reticle', [rect(94, 31, 112, 14)]);
      for (let i = 0; i < 6; i++) hotspot(Bs, 'm' + (i + 1), [circ(PATHB[6 + i][0], PATHB[6 + i][1], 15)]);
      hotspot(Bs, 'wafer', [rect(226, 262, 90, 30)]);

      // ================= phase status =================
      const chips = PHASES.map((p, i) => h('button', { class: 'w-btn', on: { click: () => { st.playing = false; playBtn.textContent = 'Play'; phase = [.15, .35, .43, .58, .8][i]; render(phase); selectView(i === 4 ? 1 : 0); } }, style: { padding: '2px 9px', borderRadius: '12px', border: '1px solid var(--line)', color: 'var(--muted)', fontSize: '12.5px', whiteSpace: 'nowrap' } }, (i + 1) + '  ' + p[0]));
      const notes = PHASES.map(p => h('div', { hidden: true }, p[1]));
      const phaseRow = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '10px 0 6px' } }, ...chips);
      const phaseNote = h('div', { class: 'w-note', style: { display: 'grid', marginTop: '0' } }, ...notes);
      function setPhase(i) {
        if (i === curPhase) return;
        chips.forEach((c, k) => { c.style.borderColor = k === i ? 'var(--accent)' : 'var(--line)'; c.style.color = k === i ? 'var(--ink)' : 'var(--muted)'; c.style.fontWeight = k === i ? 600 : 400; });
        notes.forEach((n, k) => n.hidden = k !== i);
        curPhase = i;
      }

      // ================= controls =================
      const playBtn = h('button', { class: 'w-btn primary', 'aria-label': 'Play or pause EUV cycle', on: { click: () => { st.playing = !st.playing; playBtn.textContent = st.playing ? 'Pause' : 'Play'; if (st.playing) start(); } } }, st.playing ? 'Pause' : 'Play');
      const slowBtn = h('button', { class: 'w-btn', 'aria-label': 'Toggle slow motion', on: { click: () => { st.slow = !st.slow; slowBtn.textContent = st.slow ? 'Slow motion: on' : 'Slow motion: off'; } } }, 'Slow motion: off');
      const p0In = h('input', { type: 'range', 'aria-label': 'Power at intermediate focus', min: 250, max: 600, step: 10, value: st.P0, style: { minWidth: '0' } });
      const wphIn = h('input', { type: 'range', 'aria-label': 'Wafer throughput', min: 150, max: 350, step: 5, value: st.wph, style: { minWidth: '0' } });
      const p0Out = h('output'), wphOut = h('output');
      const controls = h('div', { class: 'w-controls' },
        h('div', { style: { flexBasis: '100%', display: 'flex', gap: '8px', flexWrap: 'wrap' } }, playBtn, slowBtn),
        h('label', { class: 'w-ctl' }, h('span', null, 'Power at IF'), p0In, p0Out),
        h('label', { class: 'w-ctl' }, h('span', null, 'Throughput'), wphIn, wphOut));

      // ================= photon budget chart =================
      const PB = svg('svg', { class: 'w-svg', viewBox: '0 0 340 176', role: 'img', 'aria-label': 'Photon budget: in-band power after each reflection from the IF to the wafer' });
      const PX0 = 50, PX1 = 324, PY0 = 20, PY1 = 122, LOGMAX = Math.log10(700);
      const xOf = i => PX0 + (PX1 - PX0) * i / (STAGES.length - 1);
      const yOf = w => PY1 - (PY1 - PY0) * Math.log10(Math.max(w, 1)) / LOGMAX;
      [1, 10, 100, 500].forEach(v => {
        PB.append(svg('line', { x1: PX0, y1: f1(yOf(v)), x2: PX1, y2: f1(yOf(v)), stroke: 'var(--line)', 'stroke-width': 1 }));
        PB.append(txt(PX0 - 5, f1(yOf(v) + 4), v + ' W', { anchor: 'end', mono: true, size: 12 }));
      });
      STAGES.forEach((s, i) => PB.append(txt(f1(xOf(i)), 140, s, { anchor: 'middle', size: 12, fill: i === 5 ? 'var(--ink)' : 'var(--muted)' })));
      PB.append(txt(PX1, 12, 'in-band power, W (log)', { anchor: 'end', size: 12 }));
      PB.append(txt(f1((PX0 + PX1) / 2), 166, 'stage after the IF (11 reflections; ret = reticle ×0.65)', { anchor: 'middle', size: 12 }));
      const chartLine = svg('polyline', { fill: 'none', stroke: 'var(--accent2)', 'stroke-width': 2 });
      const dots = STAGES.map(() => svg('circle', { r: 2.5, fill: 'var(--accent2)' }));
      const ifLbl = txt(0, 0, '', { mono: true, size: 12, fill: 'var(--accent2)' });
      const wafBox = svg('rect', { width: 48, height: 16, rx: 3, fill: 'var(--panel)', stroke: 'var(--accent2)', 'stroke-width': 1 });
      const wafLbl = txt(0, 0, '', { mono: true, size: 12, bold: true, anchor: 'end', fill: 'var(--accent2)' });
      PB.append(chartLine, ...dots, ifLbl, wafBox, wafLbl);
      function lightStages(n) {
        if (n === curStage) return; curStage = n;
        dots.forEach((d, i) => { const lit = i <= n; d.setAttribute('r', lit ? 4 : 2.5); d.setAttribute('fill', lit ? 'var(--accent)' : 'var(--accent2)'); });
      }

      // ================= readouts + formula =================
      const stDrops = h('b'), stPerWafer = h('b'), stTin = h('b'), stWaferP = h('b'), stExp = h('b'), stPerW = h('b');
      const stWaferLbl = h('span'), stPerWLbl = h('span');
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, stDrops, h('span', null, 'droplets fired per second')),
        h('div', { class: 'w-stat' }, stPerWafer, h('span', null, 'droplets per wafer')),
        h('div', { class: 'w-stat' }, stTin, h('span', null, 'tin consumed per day (continuous)')),
        h('div', { class: 'w-stat' }, stWaferP, stWaferLbl),
        h('div', { class: 'w-stat' }, stExp, h('span', null, 'pure exposure time per wafer at 30 mJ/cm²')),
        h('div', { class: 'w-stat' }, stPerW, stPerWLbl));
      const formula = h('div', { class: 'w-formula', html: 'P<sub>wafer</sub> = P<sub>IF</sub> · 0.67⁴ (illuminator) · 0.65 (reticle) · 0.67⁶ (M1–M6) ≈ 0.012 · P<sub>IF</sub><br>t<sub>exposure</sub> = 707 cm² · 30 mJ/cm² ÷ P<sub>wafer</sub> = 21 J ÷ P<sub>wafer</sub>' });

      const energySummary = h('div', { class: 'w-insight', 'aria-live': 'polite' });
      function update() {
        st.P0 = +p0In.value; p0Out.textContent = st.P0 + ' W';
        st.wph = +wphIn.value; wphOut.textContent = st.wph + ' wph';
        const pW = pWafer(st.P0), pRet = st.P0 * Math.pow(R_MIRROR, N_ILLUM) * R_RETICLE;
        const tExp = WAFER_J / pW, tWafer = 3600 / st.wph;
        energySummary.replaceChildren(h('b', null, `${st.P0} W at the intermediate focus → ${f1(pW)} W at the wafer. `), 'Eleven reflections pass about 1.2% of the incoming in-band power in this illustrative model.');
        stDrops.textContent = fmt(DROPLET_HZ, 0);
        stPerWafer.textContent = fmt(DROPLET_HZ * tWafer, 0);
        stTin.textContent = fmt(DROPLET_HZ * DROPLET_NG * 1e-9 * 86400 / 1000, 2) + ' kg';
        stWaferP.textContent = f1(pW) + ' W';
        stWaferLbl.textContent = 'reaches the wafer (' + fmt(100 * pW / st.P0, 1) + '% of IF)';
        stExp.textContent = f1(tExp) + ' s';
        stPerW.textContent = f1(tWafer) + ' s';
        stPerWLbl.textContent = 'per wafer at ' + st.wph + ' wph → ~' + f1(tWafer - tExp) + ' s is stage & handling overhead';
        ifPowerA.textContent = st.P0 + ' W in-band'; ifPowerB.textContent = 'IF ' + st.P0 + ' W';
        retPowerB.textContent = fmt(pRet / R_RETICLE, 0) + ' W in → ' + fmt(pRet, 0) + ' W out'; wafPowerB.textContent = f1(pW) + ' W';
        const pts = []; let p = st.P0;
        STAGES.forEach((s, i) => { p *= FACTOR[i]; pts.push([xOf(i), yOf(p)]); });
        chartLine.setAttribute('points', ptsAttr(pts));
        dots.forEach((d, i) => { d.setAttribute('cx', f1(pts[i][0])); d.setAttribute('cy', f1(pts[i][1])); });
        ifLbl.setAttribute('x', f1(pts[0][0] + 7)); ifLbl.setAttribute('y', f1(pts[0][1] - 6)); ifLbl.textContent = st.P0 + ' W';
        const lx = pts[11][0] - 6, ly = pts[11][1] - 18;
        wafLbl.setAttribute('x', f1(lx)); wafLbl.setAttribute('y', f1(ly)); wafLbl.textContent = f1(pW) + ' W';
        wafBox.setAttribute('x', f1(lx - 44)); wafBox.setAttribute('y', f1(ly - 12));
      }
      [p0In, wphIn].forEach(inp => inp.addEventListener('input', update));

      // ================= animation =================
      const NORMAL_MS = 4200;
      function render(ph) {
        const off = (ph + 0.70) % 1;                                        // train advances one spacing per cycle; bottom droplet reaches the focus at ph = 0.30
        drops.forEach((d, k) => { const y = 56 + 29 * (k - 1) + 29 * off; d.setAttribute('cy', f1(y)); d.setAttribute('opacity', y >= 54 ? 1 : 0); });
        if (ph >= 0.30 && ph < 0.40) { const t = (ph - 0.30) / 0.10; target.setAttribute('opacity', 1); target.setAttribute('rx', f1(lerp(3.5, 2.6, t))); target.setAttribute('ry', f1(lerp(3.5, 16, clamp01(t * 1.6)))); }
        else target.setAttribute('opacity', 0);
        let lo = .75, lw = 2.5;
        if (ph >= 0.30 && ph < 0.335) { lo = 1; lw = 3.2; }                 // pre-pulse
        if (ph >= 0.40 && ph < 0.46) { lo = 1; lw = 4.5; }                  // main pulse
        laser.setAttribute('opacity', lo); laser.setAttribute('stroke-width', lw);
        let g = 0;
        if (ph >= 0.40 && ph < 0.64) g = ph < 0.46 ? (ph - 0.40) / 0.06 : 1 - (ph - 0.46) / 0.18;
        glow.forEach((c, i) => { c.setAttribute('r', f1(GLOW_R[i] * (1 + 1.1 * g))); c.setAttribute('opacity', f1(GLOW_O[i] + (1 - GLOW_O[i]) * g * .8)); });
        rays.setAttribute('opacity', f1(.5 + .5 * g));
        if (ph >= 0.50 && ph < 0.64) { packetA.setAttribute('cx', f1(lerp(P.x, IFA.x, (ph - 0.50) / 0.14))); packetA.setAttribute('opacity', 1); } else packetA.setAttribute('opacity', 0);
        let stage = -1;
        if (ph >= 0.64 && ph < 0.955) {
          const q = alongB((ph - 0.64) / 0.315), r = 3 + 3.5 * Math.pow(R_MIRROR, q.seg); stage = q.seg;
          [packetB, packetHalo].forEach(c => { c.setAttribute('cx', f1(q.x)); c.setAttribute('cy', f1(q.y)); });
          packetB.setAttribute('r', f1(r)); packetB.setAttribute('opacity', 1);
          packetHalo.setAttribute('r', f1(r * 2.2)); packetHalo.setAttribute('opacity', .25);
        } else { packetB.setAttribute('opacity', 0); packetHalo.setAttribute('opacity', 0); if (ph >= 0.955) stage = 11; else if (ph >= 0.62) stage = 0; }
        if (ph >= 0.94) { const t = clamp01((ph - 0.94) / 0.06); waferFlash.setAttribute('opacity', f1(1 - t * .9)); waferFlash.setAttribute('r', f1(4 + 16 * t)); } else waferFlash.setAttribute('opacity', 0);
        lightStages(stage);
        setPhase(ph < 0.30 ? 0 : ph < 0.40 ? 1 : ph < 0.52 ? 2 : ph < 0.64 ? 3 : 4);
      }
      function frame(ts) {
        raf = 0;
        if (!st.playing || !visible) return;
        if (last) phase = (phase + (ts - last) / (NORMAL_MS * (st.slow ? 4 : 1))) % 1;
        last = ts;
        render(phase);
        raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && st.playing && visible) { last = 0; raf = requestAnimationFrame(frame); } }
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); });
      io.observe(el);

      const viewNames = ['01 · Create EUV light', '02 · Pattern & focus', '03 · Count the losses'];
      const viewDescriptions = [
        'A laser hits tin droplets. The resulting plasma emits EUV light; a curved collector gathers part of that light at the intermediate focus.',
        'The same light enters the scanner. Mirrors shape it, a reflective mask supplies the pattern, and six projection mirrors image that pattern on the wafer.',
        'Every reflection costs photons. This logarithmic chart follows the in-band power from the intermediate focus through eleven reflections to the wafer.'
      ];
      const viewNav = h('div', { class: 'w-stage-strip', style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '0' } });
      const viewDescription = h('div', { class: 'w-note', style: { margin: '0' } });
      const views = [A, Bs, PB].map(d => h('div', { hidden: true, style: { maxWidth: '600px', margin: '0 auto' } }, d));
      const viewButtons = viewNames.map((name, i) => h('button', { class: 'w-btn', 'data-view': i, on: { click: () => selectView(i) } }, name));
      viewNav.append(...viewButtons);
      function selectView(i) {
        views.forEach((v, k) => v.hidden = i !== k);
        viewButtons.forEach((v, k) => { v.classList.toggle('primary', i === k); v.setAttribute('aria-pressed', i === k); });
        viewDescription.textContent = viewDescriptions[i];
        info.hidden = i === 2; phaseRow.hidden = i === 2; phaseNote.hidden = i === 2;
        if (i < 2) setInfo(i === 0 ? 'collector' : 'wafer');
      }
      el.append(energySummary,
        h('div', { class: 'w-studio', style: { gap: '12px' } }, viewNav, viewDescription, ...views, info),
        h('div', { class: 'w-console' }, controls, phaseRow, phaseNote),
        h('div', { class: 'w-note' }, 'Simplified photon budget: pellicle losses and hydrogen absorption are omitted; grazing mirrors use a conservative common reflectivity. The slowed animation shows one cycle; the source repeats 50,000 cycles per second.'),
        h('details', { class: 'w-reference' }, h('summary', null, 'Exposure, tin consumption & calculation'), readout, formula,
          h('div', { class: 'w-note' }, 'Each Mo/Si mirror keeps approximately 67% of in-band power; the patterned reticle keeps approximately 65%. The exposure calculation assumes a 300 mm wafer and 30 mJ/cm². These idealized values do not include all scanner losses or overheads.')));
      // Keep the optical geometry on a phone, but move recipe detail into the live component description.
      const sourceTexts = [...A.querySelectorAll('text')], scannerTexts = [...Bs.querySelectorAll('text')];
      const compactLabels = (drawing, labels) => {
        const group = svg('g', { 'aria-hidden': 'true', style: { display: 'none' } });
        labels.forEach(([x, y, label, anchor]) => group.append(txt(x, y, label, { size: 15, bold: true, fill: 'var(--ink)', anchor: anchor || 'start' })));
        drawing.append(group); return group;
      };
      const compactA = compactLabels(A, [[10, 72, 'Collector'], [170, 35, 'Tin droplets'], [8, 156, 'Laser'], [125, 229, 'Plasma'], [274, 156, 'Focus']]);
      const compactB = compactLabels(Bs, [[12, 24, 'Illumination'], [157, 29, 'Mask'], [212, 94, 'Projection'], [270, 306, 'Wafer', 'middle'], [12, 196, 'Focus']]);
      const budgetTexts = [...PB.querySelectorAll('text')];
      const originalFonts = budgetTexts.map(t => t.getAttribute('font-size'));
      let compact = null;
      const fitDiagrams = () => {
        const next = el.clientWidth < 460;
        if (compact === next) return; compact = next;
        [...sourceTexts, ...scannerTexts].forEach(t => t.style.display = compact ? 'none' : '');
        compactA.style.display = compact ? '' : 'none'; compactB.style.display = compact ? '' : 'none';
        budgetTexts.forEach((t, i) => {
          const keep = /^(1|10|100|500) W$|^(IF|ret|M6)$/.test(t.textContent);
          t.style.display = compact && !keep ? 'none' : '';
          t.setAttribute('font-size', compact ? 14 : originalFonts[i]);
        });
        wafBox.style.display = compact ? 'none' : '';
      };
      const responsive = new ResizeObserver(fitDiagrams); responsive.observe(el); fitDiagrams();
      selectView(0);
      update();
      render(phase);
      start();
      return () => { if (raf) cancelAnimationFrame(raf); raf = 0; st.playing = false; io.disconnect(); responsive.disconnect(); };
    }
  });
})();
