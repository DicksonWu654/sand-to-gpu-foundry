/* Widget: hybrid-bond — "Hybrid Bonding, Step by Step" (Module 17) */
(function () {
  'use strict';

  const STEPS = [
    { t: 'CMP: pads polished flat, slightly recessed',
      d: 'Both dies end with copper pads inlaid in SiO₂ (or SiCN, a harder dielectric). Chemical-mechanical polishing (CMP) makes the face flat to a fraction of a nanometre and deliberately leaves each pad "dished" 2–5 nm below the dielectric, so the glass-like oxide, not the metal, makes first contact.',
      tool: 'Damascene copper pads + CMP (Module 12); dishing measured by AFM' },
    { t: 'Plasma activation',
      d: 'A brief nitrogen, argon or oxygen plasma breaks Si–O bonds at the surface; a deionised-water rinse then leaves it covered in silanol (Si–OH) groups, the reactive hydroxyls that will form the first bonds. From here on everything happens in an ISO Class 1 mini-environment.',
      tool: 'Plasma + DI rinse inside the bonder cluster (EVG, SUSS, Applied/Besi Kinex)' },
    { t: 'Alignment',
      d: 'The top die is flipped face-down and its pads are aligned optically to the bottom ones, to about ±pitch/20. Temperatures must match too: a 300 mm wafer grows ~0.8 µm across its diameter per °C, a whole budget at 4.5 µm pitch.',
      tool: 'Wafer-to-wafer: EV Group GEMINI, SUSS XBC300 (±50–100 nm) · die-to-wafer: Besi 8800 Chameo, ASMPT (±100–200 nm)' },
    { t: 'Room-temperature pre-bond',
      d: 'The faces are touched at one point; hydrogen bonds between facing OH groups pull them together and a bond wave sweeps across the interface at centimetres per second with no force applied. The recessed copper is not touching yet, so the bond can still be inspected and, for wafers, undone.',
      tool: 'Inline infrared / acoustic void inspection (Onto, Camtek, EVG, SUSS) before the anneal makes any void permanent' },
    { t: 'Anneal at 200–300 °C',
      d: 'About an hour at ~250 °C turns Si–OH pairs into covalent Si–O–Si bridges (the water diffuses away), and copper, expanding ~17 ppm/°C against the oxide\'s ~0.5, grows out of its recess, meets its partner and interdiffuses until the two pads are one piece of metal: no solder, no intermetallic, no gap.',
      tool: 'Batch furnace or hotplate, ~1 h; ~150 °C is enough with SiCN' },
  ];
  const A_CU = 17e-6, PAD_T = 1000, DT = 250;           // Cu CTE per °C; pad thickness nm; anneal rise °C
  const E_PRIME = 1.41e11, GAMMA = 0.2;                  // Si E/(1−ν²) Pa; room-temperature bond energy J/m²
  const UB_PITCH = 40, UB_DENS = 1e6 / UB_PITCH / UB_PITCH; // µm microbump pitch for the comparison → 625 /mm²
  const WAFER_GROWTH = 2.6e-6 * 300e3;                   // µm per °C across a 300 mm wafer (0.78)
  const STACKS = {
    wow: { name: 'wafer-on-wafer', abbr: 'WoW', top: 775, thin: 775e-6, topLbl: 'Top wafer, face down · 775 µm Si', vLbl: 'top wafer 775 µm' },
    cow: { name: 'chip-on-wafer', abbr: 'CoW', top: 50, thin: 50e-6, topLbl: 'Top die, face down · 50 µm Si', vLbl: 'top die 50 µm' },
  };
  const voidR = (t, hp) => Math.pow(2 * E_PRIME * t * t * t / (3 * GAMMA), 0.25) * Math.sqrt(hp);   // m (Tong–Gösele plate model)
  const cuRise = dT => A_CU * dT * PAD_T;   // nm, free vertical expansion of a 1 µm pad
  const clamp01 = t => Math.max(0, Math.min(1, t));
  const f1 = n => (+n).toFixed(1);
  const roadmap = p => p >= 9 ? '9 µm: SoIC as shipped in AMD 3D V-Cache (2022) and MI300 (2023); Intel Foveros Direct.'
    : p >= 6 ? '6 µm: SoIC-X in production since ~2025, about 28 000 connections per mm².'
    : p >= 4.5 ? '4.5–5 µm: TSMC roadmap ~2029 (needs ±0.2 µm bonder alignment); ~5 µm asked of HBM suppliers for HBM4E/HBM5.'
    : p >= 2 ? '2–3 µm: 2030+ roadmap (SoIC, UCIe-3D), approaching upper-BEOL wiring density.'
    : 'Below 2 µm: beyond the published roadmap; alignment would need ±50 nm or better.';

  window.registerWidget('hybrid-bond', {
    title: 'Hybrid Bonding, Step by Step',
    caption: 'Step through how two dies are fused copper-to-copper with no solder. Drag the pitch to watch connection density climb, and switch on the particle to see why cleanliness decides everything.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const uid = 'hb' + Math.random().toString(36).slice(2, 7);
      const st = { step: 0, pitch: 6, err: 150, dish: 3, stack: 'wow', particle: false, hPart: 1, playing: false, phase: 0 };
      let raf = 0, visible = true, last = 0, dead = false, WX = 688, WT = 336, roRaf = 0;

      const txt = (x, y, s, o) => { o = o || {}; return svg('text', { x: f1(x), y: f1(y), 'font-family': o.mono ? 'var(--mono)' : 'var(--sans)', 'font-size': o.size || 12.5, 'font-weight': o.bold ? 600 : 400, fill: o.fill || 'var(--muted)', 'text-anchor': o.anchor || 'start', opacity: o.op == null ? 1 : o.op }, s); };
      const rect = (x, y, w, hh, fill, extra) => svg('rect', Object.assign({ x: f1(x), y: f1(y), width: f1(Math.max(0, w)), height: f1(Math.max(0, hh)), fill }, extra || {}));
      const line = (x1, y1, x2, y2, stroke, extra) => svg('line', Object.assign({ x1: f1(x1), y1: f1(y1), x2: f1(x2), y2: f1(y2), stroke }, extra || {}));
      const marker = (id, color) => svg('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' }, svg('path', { d: 'M0,0 L10,5 L0,10 z', fill: color }));
      const dimH = (g, x1, x2, y, id) => g.append(line(x1, y, x2, y, 'var(--muted)', { 'stroke-width': 1, 'marker-start': `url(#${id})`, 'marker-end': `url(#${id})` }));

      // ================= cross-section: full width, viewBox width == CSS pixels so text is true-size =================
      const XH = 356, SI = 62, PL = 36, ANN = 56, K = 2;          // px: silicon band, pad layer, annotation strip; K px per nm of dishing
      const EXAG = Math.round(K * PAD_T / (PL - 6) / 5) * 5;       // how much the dishing is exaggerated vs the 1 µm pad (~×65)
      const X = svg('svg', { class: 'w-svg', style: { marginTop: '10px' }, viewBox: `0 0 ${WX} ${XH}`, role: 'img', 'aria-label': 'Cross-section of two dies being hybrid bonded: silicon, dielectric with recessed copper pads, bond interface' });

      function drawX() {
        X.innerHTML = '';
        const W = WX, narrow = W < 600, s = st.step, ph = st.phase, part = st.particle, S = STACKS[st.stack];
        X.setAttribute('viewBox', `0 0 ${W} ${XH}`);
        X.append(svg('defs', null, marker(uid + '-ax', 'var(--muted)')));
        const crect = (x, y, w, hh, fill) => { const a = Math.max(0, x), b = Math.min(W, x + w); return b > a ? rect(a, y, b - a, hh, fill) : null; };   // pad rect clamped to the field
        const FIELD = narrow ? 20 : 30, sx = W / FIELD, LZ = narrow ? 84 : 96;   // µm across; pad-free zone at the left carries the dielectric label
        const yBS = XH - ANN - SI, yIF = yBS - PL;                                   // bottom silicon top; bond plane (bottom dielectric face)
        const gap = s <= 1 ? 74 : s === 2 ? 44 : (part ? Math.max(2, st.hPart * sx) : 0);
        const yT = yIF - gap, yTS = yT - PL - SI;                                    // top dielectric face; top silicon top
        const pp = st.pitch * sx, pw = pp / 2, dd = st.dish * K, ex = st.err / 1000 * sx;
        const T = s === 4 ? 25 + DT * Math.min(1, ph / 0.6) : 25;
        const rise = cuRise(T - 25), risePx = Math.min(rise * K, dd), contact = s === 4 && !part && rise >= st.dish;
        const fuse = s === 4 && !part ? clamp01((ph - 0.7) / 0.3) : 0;
        const wave = s === 3 && !part ? Math.min(1, ph / 0.7) : 0, xw = W * wave;
        const sL1 = yBS + SI + 16, sL2 = sL1 + 17, sL3 = sL2 + 17;                  // annotation strip lines
        const fL1 = 36, fL2 = 54, fL3 = 72;                                          // free-zone lines above the top die (steps 4–5)

        X.append(txt(0, 13, narrow ? FIELD + ' µm cross-section · heights exaggerated' : 'Cross-section · ' + FIELD + ' µm wide · vertical scale exaggerated', { size: 12 }));
        // silicon bodies, dielectric layers, heat tint
        X.append(rect(0, yTS, W, SI, 'var(--si)', { 'fill-opacity': .35 }), rect(0, yBS, W, SI, 'var(--si)', { 'fill-opacity': .35 }));
        X.append(rect(0, yT - PL, W, PL, 'var(--muted)', { 'fill-opacity': .18 }), rect(0, yIF, W, PL, 'var(--muted)', { 'fill-opacity': .18 }));
        // copper pads with via stubs into the die, top row offset by the alignment error; clamped to the field.
        // The recess above each pad (dishing) is drawn as a real notch in the dielectric face.
        const pads = svg('g'), notches = svg('g'), padXs = [], vw = Math.max(3, pw / 3);
        for (let x0 = LZ + pp / 4; x0 < W; x0 += pp) {
          padXs.push(x0);
          notches.append(crect(x0, yIF, pw, dd - risePx, 'var(--panel)'), crect(x0 + ex, yT - (dd - risePx), pw, dd - risePx, 'var(--panel)'));
          pads.append(crect(x0, yIF + dd - risePx, pw, PL - 6 - dd + risePx, 'var(--cu)'), crect(x0 + pw / 2 - vw / 2, yIF + PL - 6, vw, 10, 'var(--cu)'));
          pads.append(crect(x0 + ex, yT - PL + 6, pw, PL - 6 - dd + risePx, 'var(--cu)'), crect(x0 + ex + pw / 2 - vw / 2, yT - PL - 4, vw, 10, 'var(--cu)'));
          if (contact) pads.append(line(Math.max(0, x0 + Math.max(0, ex)), yIF, Math.min(W, x0 + pw + Math.min(0, ex)), yIF, 'var(--panel)', { 'stroke-width': 1.2, opacity: f1(.9 * (1 - fuse)) }));
        }
        X.append(notches);
        if (s === 4) X.append(rect(0, yTS, W, yBS + SI - yTS, 'var(--warn)', { 'fill-opacity': f1(.14 * (T - 25) / DT) }));
        X.append(pads);
        const x0c = padXs[0] + pw / 2, x1c = x0c + pp;
        const onPad = x => padXs.some(x0 => x > x0 - 2 && x < x0 + pw + 2);
        const bondLine = (xEnd, op) => {   // green dielectric-to-dielectric bond, skipping the copper (union of the misaligned pad footprints)
          let x = 0;
          padXs.concat([W]).forEach(x0 => { const a = x0 === W ? W : Math.min(x0, x0 + ex), b = x0 === W ? W : Math.max(x0 + pw, x0 + pw + ex); const e = Math.min(a, xEnd); if (e > x) X.append(line(x, yIF, e, yIF, 'var(--ok)', { 'stroke-width': 2.5, opacity: op == null ? 1 : op })); x = Math.max(x, b); });
        };
        // silanol (Si–OH) groups: appear after activation, stay until the bond wave / anneal consumes them
        if (s >= 1 && s <= 3) for (let x = LZ + 4; x < W; x += 9) {
          if (s === 3 && !part && x < xw) continue;
          if (!onPad(x)) X.append(svg('circle', { cx: x, cy: f1(yIF - 2), r: 1.8, fill: 'var(--accent2)' }));
          if (!onPad(x - ex)) X.append(svg('circle', { cx: x, cy: f1(yT + 2), r: 1.8, fill: 'var(--accent2)' }));
        }
        // labels in place
        X.append(txt(W / 2, yTS + 17, S.topLbl, { anchor: 'middle', bold: true, fill: 'var(--ink)', size: 13 }));
        X.append(txt(4, yBS + SI - 9, 'Bottom wafer · 775 µm Si', { bold: true, fill: 'var(--ink)', size: 13 }));
        X.append(txt(4, yT - PL / 2 + 4, 'SiO₂ / SiCN', { fill: 'var(--ink)', size: 12 }), txt(4, yIF + PL / 2 + 4, 'SiO₂ / SiCN', { fill: 'var(--ink)', size: 12 }));
        X.append(txt(x0c, yBS + 17, 'Cu pad', { anchor: 'middle', fill: 'var(--ink)', size: 12 }));
        // pitch dimension between two pad centres: in the gap (step 1) or above the top die (steps 4–5 without particle)
        if (s === 0 || (s >= 3 && !part && !narrow)) {
          const yD = s === 0 ? yT + 18 : yTS - 8, one = 'pitch ' + st.pitch + ' µm · pad ' + f1(st.pitch / 2) + ' µm';
          dimH(X, x0c, x1c, yD, uid + '-ax');
          if (pp >= 130) X.append(txt((x0c + x1c) / 2, yD - 5, one, { anchor: 'middle', fill: 'var(--ink)' }));
          else if (s !== 0) X.append(txt(x1c + 150 <= W ? x1c + 6 : x0c - 6, yD + 4, one, { anchor: x1c + 150 <= W ? 'start' : 'end', fill: 'var(--ink)' }));
          else if (x1c + 76 <= W) X.append(txt(x1c + 6, yD - 3, 'pitch ' + st.pitch + ' µm', { fill: 'var(--ink)' }), txt(x1c + 6, yD + 11, 'pad ' + f1(st.pitch / 2) + ' µm', { fill: 'var(--ink)' }));
          else X.append(txt(x0c - 6, yD - 3, 'pitch ' + st.pitch + ' µm', { anchor: 'end', fill: 'var(--ink)' }), txt(x0c - 6, yD + 11, 'pad ' + f1(st.pitch / 2) + ' µm', { anchor: 'end', fill: 'var(--ink)' }));
        }
        // particle (to scale) sitting on the bottom face; the top die rides on it once the faces meet
        const px = LZ + (W - LZ) * 0.72, pr = Math.max(1.5, st.hPart * sx / 2), pLbl = st.hPart + ' µm particle';
        if (part) {
          X.append(svg('circle', { cx: f1(px), cy: f1(yIF - pr), r: f1(pr), fill: 'var(--bad)' }));
          if (s <= 2) X.append(txt(px, yIF - 2 * pr - 6, pLbl, { anchor: 'middle', fill: 'var(--bad)', bold: true }));
          else X.append(rect(0, yT, W, gap, 'var(--bad)', { 'fill-opacity': .12 }), line(px, yIF - 2 * pr - 2, px, yBS + SI + 4, 'var(--bad)', { 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
        }
        const strip = (y, t, o) => X.append(txt(0, y, t, o));
        const free = (y, t, o) => X.append(txt(0, y, t, o));
        if (s === 0) {
          const xb = padXs[0] + pw + 3;   // dishing bracket at the first pad's right edge, in the recess
          X.append(line(xb, yIF, xb, yIF + dd, 'var(--bad)', { 'stroke-width': 1.5 }), line(xb - 3, yIF, xb + 3, yIF, 'var(--bad)', { 'stroke-width': 1 }), line(xb - 3, yIF + dd, xb + 3, yIF + dd, 'var(--bad)', { 'stroke-width': 1 }));
          if (pp - pw >= 44) X.append(txt(xb + 5, yIF + Math.max(dd, 8) / 2 + 4, st.dish + ' nm', { fill: 'var(--bad)', mono: true, size: 11.5 }));
          X.append(txt(LZ, yT + 48, 'CMP: both faces flat to < 1 nm', { fill: 'var(--ink)' }));
          strip(sL1, (narrow ? 'Cu dished ' : 'Cu pads dished ') + st.dish + ' nm below the oxide (' + (narrow ? '~×' : 'drawn ~×') + EXAG + (narrow ? ' here)' : ')'), { fill: 'var(--bad)' });
          strip(sL2, narrow ? 'stub under each pad = via to the die\'s wiring' : 'the stub under each pad is the via down to the die\'s copper wiring (BEOL)');
        } else if (s === 1) {
          X.append(rect(0, yT, W, 12, 'var(--accent2)', { 'fill-opacity': .28 }), rect(0, yIF - 12, W, 12, 'var(--accent2)', { 'fill-opacity': .28 }));
          for (let x = 5; x < W; x += 10) X.append(svg('circle', { cx: x, cy: f1(yT + 7), r: 1.4, fill: 'var(--accent2)', opacity: .8 }), svg('circle', { cx: x, cy: f1(yIF - 7), r: 1.4, fill: 'var(--accent2)', opacity: .8 }));
          X.append(txt(W / 2, yT + 33, 'N₂ / Ar / O₂ plasma, then DI-water rinse', { anchor: 'middle', fill: 'var(--accent2)', bold: true }));
          X.append(txt(W / 2, yT + 50, '→ Si–OH (silanol) groups cover both faces', { anchor: 'middle', fill: 'var(--ink)' }));
          strip(sL1, narrow ? 'ISO Class 1 mini-environment from here on:' : 'activated faces stay in an ISO Class 1 mini-environment from here on:');
          strip(sL2, '≤ 10 particles ≥ 0.1 µm per m³' + (narrow ? '' : ' (fab bays: Class 3–5)'));
        } else if (s === 2) {
          const mx = LZ - 10;   // alignment marks: a cross on each bonding face in the pad-free zone; the top one carries the error
          [[mx + ex, yT - PL / 2], [mx, yIF + PL / 2]].forEach(([cx, cy]) => X.append(line(cx - 6, cy, cx + 6, cy, 'var(--accent)', { 'stroke-width': 1.5 }), line(cx, cy - 6, cx, cy + 6, 'var(--accent)', { 'stroke-width': 1.5 })));
          X.append(line(mx, yT - PL / 2 + 7, mx, yIF + PL / 2 - 7, 'var(--accent)', { 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: .7 }));
          const budget = st.pitch / 20 * 1000, frac = Math.min(1, st.err / budget), ok = st.err <= budget;
          X.append(txt(LZ + 6, yT + 27, 'Δx = ' + st.err + ' nm (drawn to scale)', { fill: ok ? 'var(--ok)' : 'var(--bad)', mono: true }));
          X.append(rect(0, sL1 - 9, W, 8, 'var(--line)'), rect(0, sL1 - 9, W * frac, 8, ok ? 'var(--ok)' : 'var(--bad)'));
          strip(sL2, (narrow ? '' : 'alignment error ') + st.err + ' nm of the ±' + fmt(budget, 0) + ' nm budget' + (narrow ? ': ' : ' (pitch/20): ') + (ok ? 'OK' : 'over budget'), { fill: ok ? 'var(--ok)' : 'var(--bad)' });
          if (!ok) strip(sL3, narrow ? 'pads misregister: overlap shrinks' : 'pads misregister: the overlap shrinks and the joint resistance rises', { fill: 'var(--bad)' });
        } else if (s === 3) {
          if (narrow) free(fL1, 'touched at one point → a bond wave', { fill: 'var(--ink)' }), free(fL2, 'sweeps across at ~cm/s, no force applied', { fill: 'var(--ink)' });
          else free(fL1, 'touched at one point → a bond wave sweeps across the interface at ~cm/s, no force applied', { fill: 'var(--ink)' }), free(fL2, 'purple dots: Si–OH groups waiting · green: hydrogen-bonded O–H···O pairs');
          if (!part) {
            bondLine(xw);
            for (let x = 7; x < xw; x += 14) if (!onPad(x)) X.append(svg('circle', { cx: x, cy: f1(yIF), r: 2, fill: 'var(--ok)' }));
            if (wave < 1) X.append(line(xw, yT - PL - 4, xw, yIF + 12, 'var(--ok)', { 'stroke-width': 2 }), txt(xw < W - 90 ? xw + 6 : xw - 6, yT - PL - 8, 'bond wave →', { anchor: xw < W - 90 ? 'start' : 'end', fill: 'var(--ok)', bold: true }));
            strip(sL1, narrow ? 'green: H-bonds between the faces (reversible)' : 'green: hydrogen bonds O–H···O between the dielectric faces, still reversible', { fill: 'var(--ok)' });
            strip(sL2, narrow ? 'Cu pads still ' + st.dish * 2 + ' nm apart: not touching' : 'Cu pads still 2 × ' + st.dish + ' = ' + st.dish * 2 + ' nm apart: not touching yet', { fill: 'var(--cu)' });
          }
        } else if (s === 4) {
          free(fL1, 'T = ' + fmt(T, 0) + ' °C', { mono: true, bold: true, fill: 'var(--warn)', size: 14 });
          X.append(txt(narrow ? 0 : 100, narrow ? fL2 : fL1, 'Si–OH + HO–Si → Si–O–Si + H₂O', { mono: true, fill: 'var(--ink)', size: 12 }));
          free(narrow ? fL3 : fL2, narrow ? 'covalent bridges, as strong as bulk oxide' : 'covalent Si–O–Si bridges: the dielectric bond is now as strong as bulk oxide');
          free(narrow ? fL3 + 18 : fL3, narrow ? 'Cu (17 ppm/°C) outgrows SiO₂ (0.5) → rises' : 'Cu (17 ppm/°C) outgrows the oxide (0.5 ppm/°C) and rises out of its recess', { fill: 'var(--cu)' });
          if (!part) {
            bondLine(W, f1(1 - fuse));
            const margin = rise - st.dish;
            strip(sL1, narrow ? 'Cu rise ' + f1(rise) + ' nm/pad vs ' + st.dish + ' nm dishing' : 'Cu rises ' + f1(rise) + ' nm per pad (α·ΔT·t) vs ' + st.dish + ' nm dishing', { fill: 'var(--cu)' });
            strip(sL2, margin >= 0 ? 'pads meet, pressed ' + f1(margin) + ' nm; grains grow across' : margin > -rise ? (narrow ? 'marginal: needs constraint boost (≤ ~2×)' : 'marginal: needs the sideways-constraint boost (≤ ~2×)') : 'gap stays open: too much dishing', { fill: margin >= 0 ? 'var(--ok)' : margin > -rise ? 'var(--warn)' : 'var(--bad)' });
            if (!contact && T > 100) padXs.forEach(x0 => { const r = crect(Math.min(x0, x0 + ex), yIF - (dd - risePx), pw + Math.abs(ex), 2 * (dd - risePx), 'var(--bad)'); if (r) { r.setAttribute('fill-opacity', .5); X.append(r); } });
          }
        }
        if (part && s >= 3) {
          strip(sL1, pLbl + ': the top die rides on it', { fill: 'var(--bad)', bold: true });
          strip(sL2, s === 3 ? (narrow ? 'no bonds across the gap → void (panel below)' : 'no bonds form across the gap → an unbonded void (void panel below)') : f1(cuRise(DT)) + ' nm of Cu rise cannot bridge ' + fmt(st.hPart * 1000, 0) + ' nm' + (narrow ? '' : ': every pad in the void is open'), { fill: 'var(--bad)' });
        }
      }

      // ================= right panel: density (top view) or the void one particle makes =================
      let TH = 300;
      const Tp = svg('svg', { class: 'w-svg', viewBox: `0 0 ${WT} ${TH}`, role: 'img', 'aria-label': 'Top view comparing one microbump footprint with hybrid-bond pads, or the void made by one particle' });
      function drawTop() {
        Tp.innerHTML = '';
        const W = WT;
        Tp.setAttribute('viewBox', `0 0 ${W} ${TH}`);
        Tp.append(svg('defs', null, marker(uid + '-at', 'var(--muted)')));
        if (st.particle) { TH = 300; Tp.setAttribute('viewBox', `0 0 ${W} ${TH}`); return drawVoid(W); }
        const S = Math.min(5, (W - 134) / UB_PITCH), side = UB_PITCH * S, x0 = 62, y0 = 46, pp = st.pitch * S, pw = pp / 2;
        TH = y0 + side + 58; Tp.setAttribute('viewBox', `0 0 ${W} ${TH}`);
        Tp.append(svg('defs', null, svg('pattern', { id: uid + '-pads', width: f1(pp), height: f1(pp), patternUnits: 'userSpaceOnUse' }, rect((pp - pw) / 2, (pp - pw) / 2, pw, pw, 'var(--cu)'))));
        Tp.append(txt(0, 13, 'Top view: one ' + UB_PITCH + ' µm microbump footprint', { fill: 'var(--ink)', bold: true, size: 13 }));
        Tp.append(txt(0, 29, (W < 320 ? 'vs Cu pads at ' : 'vs hybrid-bond Cu pads at ') + st.pitch + ' µm pitch (pad = p/2)'));
        Tp.append(rect(x0, y0, side, side, 'var(--muted)', { 'fill-opacity': .15, stroke: 'var(--line2)' }), rect(x0, y0, side, side, `url(#${uid}-pads)`));
        Tp.append(svg('circle', { cx: f1(x0 + side / 2), cy: f1(y0 + side / 2), r: f1(12.5 * S), fill: 'var(--accent)', 'fill-opacity': .22, stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-dasharray': '5 3' }));
        Tp.append(line(x0 - 8, y0, x0 - 8, y0 + pp, 'var(--muted)', { 'stroke-width': 1, 'marker-start': `url(#${uid}-at)`, 'marker-end': `url(#${uid}-at)` }));
        Tp.append(txt(x0 - 14, y0 + 4, 'p', { anchor: 'end', mono: true, fill: 'var(--ink)' }), txt(x0 - 14, y0 + 22, st.pitch + ' µm', { anchor: 'end', mono: true }));
        dimH(Tp, x0, x0 + side, y0 + side + 10, uid + '-at');
        Tp.append(txt(x0 + side / 2, y0 + side + 26, UB_PITCH + ' µm = one microbump pitch', { anchor: 'middle' }));
        const rx = x0 + side + 6, ry = y0 + side / 2;
        Tp.append(txt(rx, ry - 8, 'one', { fill: 'var(--accent)' }), txt(rx, ry + 7, 'µbump', { fill: 'var(--accent)' }), txt(rx, ry + 22, 'Ø 25 µm', { fill: 'var(--accent)', mono: true }));
        Tp.append(txt(W / 2, TH - 8, '(' + UB_PITCH + '/' + st.pitch + ')² ≈ ' + fmt(Math.pow(UB_PITCH / st.pitch, 2), 0) + ' pads per bump footprint', { anchor: 'middle', fill: 'var(--ink)', bold: true }));
      }
      function drawVoid(W) {
        const S = STACKS[st.stack], R = voidR(S.thin, st.hPart * 1e-6), Dmm = 2 * R * 1e3;
        const M = 28, fov = Dmm * 1.45, pxmm = (W - 2 * M) / fov, xc = W / 2, Rpx = R * 1e3 * pxmm, yS = 186;
        const ht = Math.max(8, Math.min(40, S.top / 1000 * pxmm)), hb = Math.max(8, Math.min(40, 0.775 * pxmm)), cut = 0.775 * pxmm > 40;
        Tp.append(txt(0, 13, 'Zoomed out: the void one particle makes', { fill: 'var(--ink)', bold: true, size: 13 }));
        Tp.append(txt(0, 29, (W < 320 ? S.abbr : S.name) + ' · ' + st.hPart + ' µm particle · heights exaggerated'));
        Tp.append(txt(0, 52, W < 320 ? 'stiff plates cannot drape over the particle:' : 'the stiff plates cannot drape closely over the particle:'));
        Tp.append(txt(0, 68, W < 320 ? 'every pad between the dashed lines is open' : 'everything between the dashed lines stays unbonded'));
        Tp.append(rect(M, yS, W - 2 * M, hb, 'var(--si)', { 'fill-opacity': .35 }));
        if (cut) for (let x = M; x < W - M; x += 8) Tp.append(line(x, yS + hb, x + 4, yS + hb, 'var(--si)', { 'stroke-width': 1.2 }));
        const A = 18, pts = [];
        for (let i = 0; i <= 60; i++) { const x = M + (W - 2 * M) * i / 60, u = (x - xc) / Rpx; pts.push([x, yS - (Math.abs(u) < 1 ? A * Math.pow(1 - u * u, 2) : 0)]); }
        const lower = pts.map(p => f1(p[0]) + ',' + f1(p[1])).join(' L'), upper = pts.slice().reverse().map(p => f1(p[0]) + ',' + f1(p[1] - ht)).join(' L');
        Tp.append(svg('path', { d: 'M' + lower + ' L' + upper + ' Z', fill: 'var(--si)', 'fill-opacity': .35 }));
        Tp.append(svg('path', { d: 'M' + lower + ' Z', fill: 'var(--bad)', 'fill-opacity': .18, stroke: 'var(--bad)', 'stroke-width': 1 }));
        Tp.append(svg('circle', { cx: xc, cy: f1(yS - 2.5), r: 2.5, fill: 'var(--bad)' }));
        Tp.append(line(xc, yS - 4, xc + 26, yS - A - ht - 30, 'var(--bad)', { 'stroke-width': 1 }));
        Tp.append(txt(xc + 30, yS - A - ht - 30, st.hPart + ' µm particle', { fill: 'var(--bad)', bold: true }));
        Tp.append(txt(M + 6, yS - ht - 5, S.vLbl, { fill: 'var(--ink)', size: 12 }));
        Tp.append(txt(M + 6, yS + hb / 2 + 4, 'bottom wafer 775 µm' + (cut ? ' (cut)' : ''), { fill: 'var(--ink)', size: 12 }));
        [xc - Rpx, xc + Rpx].forEach(x => Tp.append(line(x, yS - 2, x, yS + hb + 20, 'var(--line2)', { 'stroke-width': 1, 'stroke-dasharray': '3 3' })));
        dimH(Tp, xc - Rpx, xc + Rpx, yS + hb + 14, uid + '-at');
        Tp.append(txt(xc, yS + hb + 32, 'void Ø ' + fmt(Dmm, Dmm >= 1 ? 1 : 2) + ' mm', { anchor: 'middle', mono: true, bold: true, fill: 'var(--bad)', size: 13.5 }));
        const bar = [5, 2, 1, 0.5, 0.2, 0.1, 0.05].find(b => b * pxmm <= 0.36 * (W - 2 * M)) || 0.05, bl = bar * pxmm;
        Tp.append(line(W - M - bl, 150, W - M, 150, 'var(--ink)', { 'stroke-width': 2 }), txt(W - M, 144, bar + ' mm', { anchor: 'end', mono: true }));
        const dead = 1e6 / (st.pitch * st.pitch) * Math.PI * Math.pow(R * 1e3, 2);
        Tp.append(txt(W / 2, TH - 26, 'R ∝ √h · t^(3/4)  (Tong–Gösele plate model)', { anchor: 'middle' }));
        Tp.append(txt(W / 2, TH - 8, '≈ ' + (dead >= 1e6 ? fmt(dead / 1e6, 2) + ' million' : fmt(dead, 0)) + ' pads inside at ' + st.pitch + ' µm: all open', { anchor: 'middle', fill: 'var(--ink)', bold: true }));
      }

      // ================= step chrome =================
      const count = h('span', { class: 'count' });
      const prevBtn = h('button', { class: 'w-btn', on: { click: () => go(st.step - 1) } }, '← Prev');
      const nextBtn = h('button', { class: 'w-btn primary', on: { click: () => go(st.step + 1) } }, 'Next →');
      const playBtn = h('button', { class: 'w-btn', on: { click: () => { if (st.step === 4 && st.phase >= 1) st.phase = 0; st.playing = !st.playing; last = 0; syncPlay(); if (st.playing) start(); else drawX(); } } }, 'Play');
      const dots = h('div', { class: 'w-step-nav', role: 'tablist' }, ...STEPS.map((s, i) => h('button', { class: 'w-step-dot', 'aria-label': 'Step ' + (i + 1) + ': ' + s.t, title: 'Step ' + (i + 1) + ': ' + s.t, on: { click: () => go(i), mouseenter: e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'scale(1.35)'; }, mouseleave: e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.transform = ''; } } })));
      const nav = h('div', { class: 'w-step-nav' }, prevBtn, nextBtn, count, playBtn);
      const stepTitle = h('div', { class: 'w-step-title' }), stepDesc = h('div', { class: 'w-step-desc' }), stepTool = h('div', { class: 'w-note' });
      function syncPlay() { playBtn.textContent = st.playing ? 'Pause' : (st.step === 4 && st.phase >= 1 ? 'Replay anneal' : st.step === 3 ? 'Play bond wave' : 'Play anneal'); }
      function go(i) {
        st.step = Math.max(0, Math.min(STEPS.length - 1, i));
        stepTitle.textContent = 'Step ' + (st.step + 1) + ': ' + STEPS[st.step].t; stepDesc.textContent = STEPS[st.step].d; stepTool.textContent = 'Where / with what: ' + STEPS[st.step].tool;
        count.textContent = 'Step ' + (st.step + 1) + ' / ' + STEPS.length;
        Array.from(dots.children).forEach((d, k) => { d.classList.toggle('active', k === st.step); d.classList.toggle('done', k < st.step); });
        prevBtn.disabled = st.step === 0; nextBtn.disabled = st.step === STEPS.length - 1;
        const anim = st.step >= 3;
        playBtn.hidden = !anim || (st.step === 3 && st.particle);
        st.phase = st.step === 3 ? (reduced ? 0.45 : 0) : st.step === 4 ? (reduced ? 1 : 0) : 0;
        st.playing = anim && !reduced; last = 0;
        syncPlay(); drawX(); if (st.playing) start();
      }

      // ================= controls, readouts, formula =================
      const pitchIn = h('input', { type: 'range', min: 1, max: 10, step: 0.5, value: st.pitch }), pitchOut = h('output');
      const errIn = h('input', { type: 'range', min: 0, max: 600, step: 10, value: st.err }), errOut = h('output');
      const dishIn = h('input', { type: 'range', min: 1, max: 10, step: 0.5, value: st.dish }), dishOut = h('output');
      const selStyle = { gridColumn: '2 / span 2', minWidth: 0, width: '100%' };
      const stackSel = h('select', { style: selStyle }, h('option', { value: 'wow' }, 'wafer-on-wafer, 2 × 775 µm'), h('option', { value: 'cow' }, 'chip-on-wafer, 50 µm die'));
      const partIn = h('input', { type: 'checkbox' }), partOut = h('output');
      const hpSel = h('select', { style: selStyle }, ...[0.1, 0.3, 1].map(v => h('option', { value: v, selected: v === st.hPart || null }, v + ' µm' + (v === 0.1 ? ' (ISO 1 limit size)' : v === 1 ? ' (module example)' : ''))));
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Pad pitch'), pitchIn, pitchOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Alignment error'), errIn, errOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'CMP dishing'), dishIn, dishOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Stack'), stackSel),
        h('label', { class: 'w-ctl' }, h('span', null, 'Particle at the interface'), partIn, partOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Particle height'), hpSel));
      const rDens = h('b'), rRatio = h('b'), rBudget = h('b'), rErr = h('b'), rTemp = h('b'), rCu = h('b'), rVoid = h('b'), rDead = h('b');
      const rErrLbl = h('span'), rCuLbl = h('span'), rVoidLbl = h('span'), rDeadLbl = h('span'), rDensLbl = h('span');
      const voidStats = [h('div', { class: 'w-stat' }, rVoid, rVoidLbl), h('div', { class: 'w-stat' }, rDead, rDeadLbl)];
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, rDens, rDensLbl),
        h('div', { class: 'w-stat' }, rRatio, h('span', null, 'vs a ' + UB_PITCH + ' µm microbump array (' + fmt(UB_DENS, 0) + ' /mm²)')),
        h('div', { class: 'w-stat' }, rBudget, h('span', null, 'alignment budget, ±pitch/20')),
        h('div', { class: 'w-stat' }, rErr, rErrLbl),
        h('div', { class: 'w-stat' }, rTemp, h('span', null, 'wafer temperature match (300 mm × 2.6 ppm/°C = 0.78 µm/°C)')),
        h('div', { class: 'w-stat' }, rCu, rCuLbl),
        ...voidStats);
      const roadNote = h('div', { class: 'w-note' });
      const formula = h('div', { class: 'w-formula', html: 'connections/mm² = 1 / p² (p in mm) &nbsp;·&nbsp; alignment budget ≈ ±p / 20 &nbsp;·&nbsp; Cu rise ≈ α<sub>Cu</sub>·ΔT·t = 17×10⁻⁶ × 250 °C × 1 µm ≈ 4.3 nm<br>void radius R = [2E′t³ / (3γ)]<sup>¼</sup> · √h &nbsp;(E′ = 141 GPa, γ = 0.2 J/m², t = thinner plate, h = particle height; Tong–Gösele elastic-plate model)' });

      function update() {
        st.pitch = +pitchIn.value; st.err = +errIn.value; st.dish = +dishIn.value; st.stack = stackSel.value; st.particle = partIn.checked; st.hPart = +hpSel.value;
        pitchOut.textContent = st.pitch + ' µm'; errOut.textContent = st.err + ' nm'; dishOut.textContent = st.dish + ' nm'; partOut.textContent = st.particle ? 'on' : 'off';
        hpSel.disabled = !st.particle; hpSel.style.opacity = st.particle ? '' : '0.5';
        const dens = 1e6 / (st.pitch * st.pitch), budget = st.pitch / 20 * 1000, ok = st.err <= budget, rise = cuRise(DT), margin = rise - st.dish;
        rDens.textContent = fmt(dens, 0) + ' /mm²'; rDensLbl.textContent = 'connections per mm² at ' + st.pitch + ' µm pitch';
        rRatio.textContent = '×' + fmt(dens / UB_DENS, dens / UB_DENS < 10 ? 1 : 0);
        rBudget.textContent = '±' + fmt(budget, 0) + ' nm';
        rErr.textContent = st.err + ' nm'; rErr.style.color = ok ? 'var(--ok)' : 'var(--bad)';
        rErrLbl.textContent = 'your alignment error: ' + (ok ? 'OK, ' + fmt(100 * st.err / budget, 0) + '% of budget' : 'over budget by ' + fmt(st.err - budget, 0) + ' nm');
        rTemp.textContent = '±' + fmt(budget / 1000 / WAFER_GROWTH, 2) + ' °C';
        rCu.textContent = f1(rise) + ' nm'; rCu.style.color = margin >= 0 ? 'var(--ok)' : margin > -rise ? 'var(--warn)' : 'var(--bad)';
        rCuLbl.textContent = 'free Cu rise per pad at ΔT = 250 °C vs ' + st.dish + ' nm dishing → ' + (margin >= 0 ? 'pads meet, pressed by ' + f1(margin) + ' nm' : margin > -rise ? 'marginal: needs constraint amplification' : 'gap stays open');
        voidStats.forEach(v => v.hidden = !st.particle);
        playBtn.hidden = st.step < 3 || (st.step === 3 && st.particle);
        if (st.particle) {
          const Sk = STACKS[st.stack], R = voidR(Sk.thin, st.hPart * 1e-6), Dmm = 2 * R * 1e3, dead = dens * Math.PI * Math.pow(R * 1e3, 2);
          rVoid.textContent = (Dmm >= 1 ? fmt(Dmm, 1) + ' mm' : fmt(Dmm * 1000, 0) + ' µm'); rVoidLbl.textContent = 'void diameter from a ' + st.hPart + ' µm particle, ' + Sk.name;
          rDead.textContent = dead >= 1e6 ? fmt(dead / 1e6, 2) + ' M' : fmt(dead, 0); rDeadLbl.textContent = 'pads inside that void: all open (no solder to absorb it)';
        }
        roadNote.textContent = 'Roadmap · ' + roadmap(st.pitch);
        drawX(); drawTop();
      }
      [pitchIn, errIn, dishIn].forEach(i => i.addEventListener('input', update));
      [stackSel, partIn, hpSel].forEach(i => i.addEventListener('change', update));

      // ================= animation (bond wave loops; anneal runs once) =================
      function frame(ts) {
        raf = 0;
        if (!st.playing || !visible || dead) return;
        if (last) {
          if (st.step === 3) st.phase = (st.phase + (ts - last) / 3600) % 1;
          else if (st.step === 4) { st.phase = Math.min(1, st.phase + (ts - last) / 4200); if (st.phase >= 1) { st.playing = false; syncPlay(); } }
          else st.playing = false;
        }
        last = ts; drawX();
        if (st.playing) raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && st.playing && visible && !dead) { last = 0; raf = requestAnimationFrame(frame); } }
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); });
      io.observe(el);

      const legend = h('div', { class: 'w-legend' }, ...[['si', 'silicon die / wafer'], ['muted', 'SiO₂ / SiCN dielectric'], ['cu', 'copper pad + via'], ['accent2', 'plasma / Si–OH silanol'], ['ok', 'bonded dielectric interface'], ['bad', 'particle / void / open joint']]
        .map(([c, t]) => h('span', { class: 'w-legend-item' }, h('i', { style: { background: `var(--${c})`, opacity: c === 'muted' ? .5 : c === 'si' ? .6 : 1 } }), t)));
      el.append(
        h('div', { class: 'w-steps' }, nav, dots, stepTitle, stepDesc, stepTool),
        X, legend, controls,
        h('div', { class: 'w-grid2', style: { marginTop: '6px', alignItems: 'start' } }, Tp, h('div', null, readout, roadNote)),
        formula,
        h('div', { class: 'w-note' }, 'Dishing, copper rise and the void\'s height are drawn exaggerated; pitch, pad width, the alignment offset and the particle in the cross-section are to scale. Pad width is taken as half the pitch. The void size is set at the room-temperature pre-bond (γ ≈ 0.2 J/m²) and the thinner plate sets the stiffness; module 17 quotes mm-scale voids from a ~100 nm particle between full wafers and ~1 mm or less for a 1 µm particle under a thinned die.'));

      // responsive: viewBox width == CSS pixel width, so 12–13 px labels stay 12–13 px at every width
      function measure() {
        const wx = Math.round(X.getBoundingClientRect().width), wt = Math.round(Tp.getBoundingClientRect().width);
        let changed = false;
        if (wx >= 200 && Math.abs(wx - WX) >= 2) { WX = wx; changed = true; }
        if (wt >= 160 && Math.abs(wt - WT) >= 2) { WT = wt; changed = true; }
        return changed;
      }
      measure();
      go(0);
      update();
      const ro = new ResizeObserver(() => {
        if (roRaf) cancelAnimationFrame(roRaf);
        roRaf = requestAnimationFrame(() => { roRaf = 0; if (!dead && measure()) { drawX(); drawTop(); } });
      });
      ro.observe(el);
      ctx.onTheme(() => { if (!dead) { drawX(); drawTop(); } });
      return () => { dead = true; st.playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; if (roRaf) cancelAnimationFrame(roRaf); ro.disconnect(); io.disconnect(); };
    }
  });
})();
