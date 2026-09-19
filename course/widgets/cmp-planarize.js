/* Widget: cmp-planarize — "Chemical Mechanical Planarization" (Module 12) */
(function () {
  'use strict';

  // ---- physics constants (Module 12 §10, Copper CMP) ----
  const PSI = 6894.76;            // Pa per psi
  const R_OFF = 0.20;             // m: wafer-centre offset from the platen axis (300 mm wafer on a ~750 mm platen)
  const KP = 4.8e-13;             // Pa⁻¹: Preston coefficient, calibrated to ≈500 nm/min at 1.5 psi / 80 rpm
  const OB = 600;                 // nm: as-plated copper overburden over the field
  const HUMP = 50, RIP = 10;      // nm: plating hump over the dense array (dip over the wide line) and ripple between lines
  const TOPO = HUMP + RIP;        // nm: highest as-plated point above OB
  const LINE_H = 150;             // nm: trench (line) depth
  const SEL = 15;                 // effective Cu : dielectric removal selectivity while clearing (bulk slurry ≫ 1, barrier slurry ≈ 1)
  const PITCH = 1.0;              // µm: dense-array pitch
  const OVER = 0.25;              // over-polish as a fraction of the endpoint time
  const BOT = -300;               // nm: bottom of the drawn stack (previous level)
  const ANIM_BULK = 6.5, ANIM_OVER = 3.5;   // real seconds the animation spends on each phase

  const velocity = rpm => 2 * Math.PI * rpm / 60 * R_OFF;                       // m/s, uniform when head and platen match rpm
  const removalRate = (psi, rpm) => KP * psi * PSI * velocity(rpm) * 60e9;      // nm/min (Preston)
  const clearTime = rr => (OB + TOPO) / rr * 60;                                // s
  const dishSat = (psi, w) => 80 * Math.sqrt(psi / 1.5) * w / (w + 6);          // nm: pad-flexure limit for a w µm line
  const dishing = (psi, w, rr, tOver) => { const D = dishSat(psi, w); return tOver <= 0 ? 0 : D * (1 - Math.exp(-(rr / 60) * tOver / D)); };
  const erosion = (rr, rho, tOver) => tOver <= 0 ? 0 : (rr / SEL) * (tOver / 60) * rho / (1 - rho);   // nm relative to the field
  const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  const plateau = (x, a, b, r) => x < a ? smooth(1 - (a - x) / r) : x > b ? smooth(1 - (x - b) / r) : 1;   // 1 in [a,b], 0 beyond r
  const fmtTime = s => s < 100 ? s.toFixed(0) + ' s' : (s / 60).toFixed(1) + ' min';
  const D2R = Math.PI / 180;
  let mountCount = 0;

  window.registerWidget('cmp-planarize', {
    title: 'Chemical Mechanical Planarization',
    caption: 'Press Play: the head spins the wafer face-down on a slurry-wet pad while the cross-section below is shaved flat. Watch the removal rate follow Preston’s law, the eddy-current endpoint fire when the barrier appears, then the wide line dish and the dense array erode during over-polish.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const st = { psi: 1.5, rpm: 80, rho: 0.5, w: 5, t: 0, playing: !reduced, phase: 0 };
      let raf = 0, last = 0, visible = true, W = 0, narrow = false;

      // ---------- controls ----------
      const playBtn = h('button', { class: 'w-btn primary', on: { click: () => { if (!st.playing && st.t >= tEnd() - 1e-6) st.t = 0; st.playing = !st.playing; syncPlay(); start(); } } }, 'Play');
      const resetBtn = h('button', { class: 'w-btn', on: { click: () => { st.t = 0; st.playing = false; syncPlay(); render(); } } }, 'Reset');
      const rng = (v, min, max, step) => h('input', { type: 'range', min, max, step, value: v });
      const pIn = rng(st.psi, 0.5, 5, 0.1), rpmIn = rng(st.rpm, 30, 120, 5), rhoIn = rng(50, 10, 90, 5), wIn = rng(st.w, 0.2, 10, 0.1), tIn = rng(0, 0, 100, 0.5);
      const pOut = h('output'), rpmOut = h('output'), rhoOut = h('output'), wOut = h('output'), tOut = h('output');
      const controls = h('div', { class: 'w-controls' },
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, playBtn, resetBtn),
        h('label', { class: 'w-ctl' }, h('span', null, 'Down-force P'), pIn, pOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Platen / head speed'), rpmIn, rpmOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Array pattern density ρ'), rhoIn, rhoOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Wide line width w'), wIn, wOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Polish time'), tIn, tOut));
      const tEnd = () => clearTime(removalRate(st.psi, st.rpm)) * (1 + OVER);
      function syncPlay() { playBtn.textContent = st.playing ? 'Pause' : (st.t >= tEnd() - 1e-6 ? 'Replay' : 'Play'); }
      function readInputs() {
        st.psi = +pIn.value; st.rpm = +rpmIn.value; st.rho = +rhoIn.value / 100; st.w = +wIn.value;
        const te = tEnd(); tIn.max = te.toFixed(1); st.t = Math.min(st.t, te);
      }
      [pIn, rpmIn, rhoIn, wIn].forEach(i => i.addEventListener('input', () => { readInputs(); render(); }));
      tIn.addEventListener('input', () => { st.t = +tIn.value; render(); });

      // ---------- shared SVG helpers ----------
      const SANS = 'var(--sans)', MONO = 'var(--mono)';
      const T = (x, y, s, o = {}) => svg('text', Object.assign({ x, y, 'font-family': o.mono ? MONO : SANS, 'font-size': o.size || 12, fill: o.fill || 'var(--ink)', 'text-anchor': o.anchor || 'start', 'font-weight': o.bold ? 600 : null }, o.attrs || {}), s);
      const L = (x1, y1, x2, y2, o = {}) => svg('line', Object.assign({ x1, y1, x2, y2, stroke: o.stroke || 'var(--muted)', 'stroke-width': o.w || 1 }, o.attrs || {}));
      const R = (x, y, w, hh, fill, o = {}) => svg('rect', Object.assign({ x, y, width: Math.max(0, w), height: Math.max(0, hh), fill }, o));
      const C = (cx, cy, r, fill, o = {}) => svg('circle', Object.assign({ cx, cy, r, fill }, o));
      const arrow = (x, y1, y2, color) => { // vertical arrow with its head at y2
        const d = y2 > y1 ? 1 : -1;
        return svg('g', null, L(x, y1, x, y2, { stroke: color, w: 1.6 }), svg('path', { d: `M${x - 4},${y2 - 5 * d} L${x},${y2} L${x + 4},${y2 - 5 * d}`, fill: 'none', stroke: color, 'stroke-width': 1.6 }));
      };
      const dimArrow = (x, y1, y2, color) => svg('g', null, L(x, y1, x, y2, { stroke: color, w: 1.2 }), L(x - 4, y1, x + 4, y1, { stroke: color, w: 1.2 }), L(x - 4, y2, x + 4, y2, { stroke: color, w: 1.2 }));
      function chip(g, x, y, s, o = {}) { // label on a translucent panel-coloured chip so it stays legible over copper / dielectric
        const t = T(x, y, s, Object.assign({ fill: o.fill || 'var(--ink)' }, o));
        const wEst = s.length * (o.mono ? 7.3 : 6.8) + 8, x0 = o.anchor === 'middle' ? x - wEst / 2 : o.anchor === 'end' ? x - wEst + 4 : x - 4;
        g.append(svg('rect', { x: x0, y: y - 11, width: wEst, height: 15, rx: 3, fill: 'var(--panel)', 'fill-opacity': .88 }), t);
        return t;
      }

      // ---------- tool schematic: side elevation + top view of a rotary polisher ----------
      const uid = 'cmp' + (++mountCount);
      const tool = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Rotary CMP polisher in side and top view: carrier head pressing the wafer face-down on a grooved pad, slurry dispense, diamond conditioner sweeping the pad, eddy-current endpoint sensor in the platen' });
      let TG = null;
      function buildTool() {
        tool.innerHTML = ''; TG = {};
        const split = W >= 920, SW = split ? Math.round(W * 0.6) : W, HS = 228, TH = 232;
        const HT = split ? Math.max(HS, TH) : HS + TH;
        tool.setAttribute('viewBox', `0 0 ${W} ${HT}`);
        buildSide(SW);
        buildTop(split ? SW : 0, split ? 0 : HS, split ? W - SW : W, TH);
        if (split) tool.append(L(SW, 10, SW, HT - 10, { stroke: 'var(--line)' }));
      }
      function buildSide(SW) {
        const g = tool, px0 = 14, px1 = SW - 14, pw = px1 - px0;
        const padTop = 148, padH = 18, platH = 22, platBot = padTop + padH + platH;
        const headW = Math.round(Math.min(150, pw * 0.42)), headCx = Math.round(px0 + pw * 0.3), hx0 = headCx - headW / 2, hx1 = headCx + headW / 2, headTop = 30;
        const slX = px1 - 22;
        g.append(svg('defs', null, svg('clipPath', { id: uid + '-pad' }, R(px0, padTop, pw, padH, 'none'))));
        g.append(T(px0, 14, 'side view', { fill: 'var(--muted)', bold: true }));
        // platen with the eddy-current sensor coil embedded under the pad
        g.append(R(px0, padTop + padH, pw, platH, 'var(--panel2)', { stroke: 'var(--line2)' }));
        g.append(T(hx1 + 8, padTop + padH + 15, narrow ? 'platen' : 'platen, ~750 mm diameter', { fill: 'var(--muted)' }));
        g.append(R(headCx - 14, platBot - 17, 28, 11, 'var(--accent2)', { rx: 2 }));
        // pad: grooved polyurethane; the grooves scroll to show the platen turning; slurry film on top
        g.append(R(px0, padTop, pw, padH, 'var(--muted)', { 'fill-opacity': .55 }));
        TG.grooves = svg('g', { 'clip-path': `url(#${uid}-pad)` });
        for (let x = px0 - 14; x <= px1 + 14; x += 14) TG.grooves.append(R(x, padTop, 3, 5, 'var(--panel)'));
        g.append(TG.grooves);
        chip(g, px0 + 6, padTop + 13, narrow ? 'pad (polyurethane)' : 'pad: grooved polyurethane, 1–2 mm thick');
        TG.vel = chip(g, px1 - 6, padTop + 13, 'v = 0.00 m/s →', { mono: true, anchor: 'end' });   // same length as the live text
        g.append(R(px0, padTop - 3, pw, 3, 'var(--si)', { 'fill-opacity': .7 }));
        // slurry dispense
        g.append(R(slX - 3, 0, 6, 84, 'var(--muted)'), svg('path', { d: `M${slX - 6},84 L${slX + 6},84 L${slX + 3},90 L${slX - 3},90 Z`, fill: 'var(--muted)' }));
        TG.drops = [0, 1, 2].map(() => { const c = C(slX, 100, 3, 'var(--si)'); g.append(c); return c; });
        g.append(T(slX - 9, 44, 'slurry', { fill: 'var(--si)', bold: true, anchor: 'end' }));
        // carrier head: spindle, body, retaining rings, membrane, wafer (Cu face down), zone pressures
        g.append(R(headCx - 7, 0, 14, headTop, 'var(--muted)'));
        g.append(R(hx0, headTop, headW, padTop - 20 - headTop, 'var(--panel2)', { stroke: 'var(--line2)', rx: 3 }));
        g.append(R(hx0, padTop - 48, 9, 48, 'var(--muted)'), R(hx1 - 9, padTop - 48, 9, 48, 'var(--muted)'));
        g.append(svg('path', { d: `M${hx0 + 9},${padTop - 17} Q${headCx},${padTop - 12} ${hx1 - 9},${padTop - 17}`, fill: 'none', stroke: 'var(--accent2)', 'stroke-width': 2.5 }));
        g.append(R(hx0 + 11, padTop - 13, headW - 22, 10, 'var(--si)'), R(hx0 + 11, padTop - 5, headW - 22, 2, 'var(--cu)'));
        const nZ = narrow ? 3 : 5;
        for (let i = 0; i < nZ; i++) g.append(arrow(hx0 + 20 + i * (headW - 40) / (nZ - 1), headTop + 56, padTop - 26, 'var(--accent)'));
        g.append(T(headCx, headTop + 16, 'carrier head', { anchor: 'middle', bold: true }));
        TG.force = T(headCx, headTop + 31, '', { anchor: 'middle', fill: 'var(--accent)', bold: true }); g.append(TG.force);
        TG.headRpm = T(headCx, headTop + 46, '', { anchor: 'middle', mono: true, fill: 'var(--muted)' }); g.append(TG.headRpm);
        const lab = (y, s, yPart, xPart) => g.append(T(hx1 + 8, y, s, { fill: 'var(--muted)' }), L(hx1 + 5, y - 4, xPart, yPart));
        lab(padTop - 36, narrow ? 'retaining ring' : 'retaining ring (holds the wafer)', padTop - 40, hx1 - 4);
        lab(padTop - 20, narrow ? 'membrane' : 'membrane, 5 pressure zones', padTop - 17, hx1 - 12);
        lab(padTop - 4, narrow ? 'wafer, face-down' : 'wafer, 300 mm, face-down', padTop - 8, hx1 - 12);
        // eddy-current readout under the platen
        const sy = platBot + 14;
        g.append(L(headCx, platBot - 6, headCx, sy - 8, { stroke: 'var(--accent2)', w: 1.2 }));
        g.append(T(px0, sy + 4, narrow ? 'eddy sensor: Cu left' : 'eddy-current endpoint sensor: Cu left', { fill: 'var(--accent2)' }));
        const bx0 = px0 + (narrow ? 124 : 216), bw = Math.max(0, px1 - 80 - bx0);
        g.append(R(bx0, sy - 4, bw, 10, 'var(--line2)', { rx: 2 }));
        TG.sigBar = R(bx0, sy - 4, 0, 10, 'var(--accent2)', { rx: 2 }); TG.sigW = bw; g.append(TG.sigBar);
        TG.sigTxt = T(px1, sy + 4, '', { mono: true, anchor: 'end', fill: 'var(--accent2)' }); g.append(TG.sigTxt);
        g.append(T(px0, sy + 18, narrow ? 'signal ∝ Cu thickness; stops above TaN' : 'signal ∝ remaining Cu; bulk removal stops tens of nm above TaN', { fill: 'var(--muted)' }));
      }
      function buildTop(x0, y0, TW, TH) {
        const g = tool, cx = x0 + TW / 2 - 6, cy = y0 + TH / 2 - 4, Rp = 86;
        const off = Rp * 0.533, Rw = Rp * 0.4, wa = 190 * D2R, wx = cx + off * Math.cos(wa), wy = cy + off * Math.sin(wa);
        g.append(T(x0 + 4, y0 + 14, 'top view', { fill: 'var(--muted)', bold: true }));
        g.append(C(cx, cy, Rp, 'var(--muted)', { 'fill-opacity': .35, stroke: 'var(--line2)' }));
        const platG = svg('g');                                   // groove pattern that turns with the platen
        for (let i = 0; i < 12; i++) { const a = i * 30 * D2R; platG.append(L(cx + Rp * .12 * Math.cos(a), cy + Rp * .12 * Math.sin(a), cx + Rp * .97 * Math.cos(a), cy + Rp * .97 * Math.sin(a), { stroke: 'var(--panel)', w: 1.2, attrs: { 'stroke-opacity': .8 } })); }
        [.35, .6, .85].forEach(f => platG.append(C(cx, cy, Rp * f, 'none', { stroke: 'var(--panel)', 'stroke-opacity': .6 })));
        g.append(platG);
        // rotation arrow on the rim (bottom-left, clear of the wafer)
        const ra = Rp + 7, a0 = 95 * D2R, a1 = 130 * D2R, ex = cx + ra * Math.cos(a1), ey = cy + ra * Math.sin(a1);
        g.append(svg('path', { d: `M${(cx + ra * Math.cos(a0)).toFixed(1)},${(cy + ra * Math.sin(a0)).toFixed(1)} A${ra},${ra} 0 0 1 ${ex.toFixed(1)},${ey.toFixed(1)}`, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }));
        const tx = -Math.sin(a1), ty = Math.cos(a1), nx = Math.cos(a1), ny = Math.sin(a1);
        g.append(svg('path', { d: `M${ex + 7 * tx},${ey + 7 * ty} L${ex + 4 * nx},${ey + 4 * ny} L${ex - 4 * nx},${ey - 4 * ny} Z`, fill: 'var(--accent)' }));
        // sensor track and the sensor itself (it passes under the wafer once per turn)
        g.append(C(cx, cy, off, 'none', { stroke: 'var(--accent2)', 'stroke-dasharray': '3 4', 'stroke-opacity': .7 }));
        g.append(T(cx, cy - off - 6, 'sensor track', { anchor: 'middle', fill: 'var(--accent2)' }));
        const sensor = C(cx + off, cy, 3, 'var(--accent2)'); g.append(sensor);
        // wafer in its carrier head, spinning and oscillating radially
        const wafer = svg('g');
        wafer.append(C(0, 0, Rw + Rp * .035, 'var(--panel2)', { stroke: 'var(--line2)' }), C(0, 0, Rw, 'var(--si)', { 'fill-opacity': .9 }));
        const spin = L(0, 0, Rw * .92, 0, { stroke: 'var(--panel)', w: 2, attrs: { 'stroke-opacity': .8 } }); wafer.append(spin, C(0, 0, 3, 'var(--panel)'));
        g.append(wafer);
        const rpmT = T(Math.max(x0 + 66, cx - Rp - 5), wy + 20, '', { anchor: 'end', mono: true, fill: 'var(--muted)' });
        g.append(T(Math.max(x0 + 66, cx - Rp - 5), wy - 8, 'wafer', { anchor: 'end', bold: true }), T(Math.max(x0 + 66, cx - Rp - 5), wy + 6, '300 mm', { anchor: 'end', fill: 'var(--muted)' }), rpmT);
        // conditioner: diamond disk on an arm that sweeps the pad radius
        const pvx = cx + Rp * .6, pvy = cy + Rp + 14, Larm = Rp * 1.05;
        const arm = L(pvx, pvy, pvx, pvy - Larm, { stroke: 'var(--muted)', w: 4 }); g.append(arm);
        const disk = svg('g'); disk.append(C(0, 0, Rp * .14, 'var(--line2)', { stroke: 'var(--muted)' }));
        for (let i = 0; i < 6; i++) { const a = i * 60 * D2R; disk.append(C(Rp * .07 * Math.cos(a), Rp * .07 * Math.sin(a), 1.2, 'var(--ink)')); }
        g.append(disk, C(pvx, pvy, 5, 'var(--muted)'));
        g.append(T(x0 + TW - 8, y0 + TH - 22, 'conditioner', { anchor: 'end', fill: 'var(--muted)' }));
        // slurry arm from the top right to the platen centre
        const sx0 = cx + Rp * .75, sy0 = cy - Rp - 4, sx1 = cx + Rp * .3, sy1 = cy - Rp * .3;
        g.append(L(sx0, sy0, sx1, sy1, { stroke: 'var(--muted)', w: 4 }));
        const drop = C(sx1, sy1 + 4, 3, 'var(--si)'); g.append(drop);
        g.append(T(x0 + TW - 8, y0 + 18, 'slurry', { anchor: 'end', fill: 'var(--si)', bold: true }));
        const platLab = T(x0 + 4, y0 + TH - 6, '', { fill: 'var(--muted)' }); g.append(platLab);
        TG.top = { cx, cy, Rp, off, Rw, wa, wx, wy, platG, sensor, wafer, spin, rpmT, pvx, pvy, Larm, arm, disk, drop, platLab };
      }
      function animateTool() {
        if (!TG) return;
        const ph = st.phase, deg = (ph * 60) % 360;                  // 80 rpm shown at 1/8 speed so the turn is visible
        TG.grooves.setAttribute('transform', `translate(${(ph * 60 % 14 - 14).toFixed(1)},0)`);   // pad moves in the +x direction of the v arrow
        TG.drops.forEach((c, i) => c.setAttribute('cy', (96 + ((ph * 90 + i * 20) % 50)).toFixed(1)));
        const t = TG.top; if (!t) return;
        t.platG.setAttribute('transform', `rotate(${deg.toFixed(1)} ${t.cx} ${t.cy})`);
        const a = deg * D2R, under = Math.cos(a - t.wa) > Math.cos(t.Rw / t.off);
        t.sensor.setAttribute('cx', (t.cx + t.off * Math.cos(a)).toFixed(1)); t.sensor.setAttribute('cy', (t.cy + t.off * Math.sin(a)).toFixed(1));
        t.sensor.setAttribute('r', under ? 5 : 3); t.sensor.setAttribute('fill-opacity', under ? 1 : .55);
        t.wafer.setAttribute('transform', `translate(${(t.wx + t.Rp * .05 * Math.sin(ph * .7)).toFixed(1)},${t.wy.toFixed(1)})`);
        t.spin.setAttribute('transform', `rotate(${deg.toFixed(1)})`);
        const th = (-95 + 21 * Math.sin(ph * .9)) * D2R, dx = t.pvx + t.Larm * Math.cos(th), dy = t.pvy + t.Larm * Math.sin(th);
        t.arm.setAttribute('x2', dx.toFixed(1)); t.arm.setAttribute('y2', dy.toFixed(1));
        t.disk.setAttribute('transform', `translate(${dx.toFixed(1)},${dy.toFixed(1)}) rotate(${(deg * 3).toFixed(1)})`);
        t.drop.setAttribute('r', (2.5 + 1.5 * Math.sin(ph * 6)).toFixed(2));
      }

      // ---------- wafer cross-section under the pad (zooms in as the copper comes off) ----------
      const xs = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Cross-section of the wafer surface under the pad: copper overburden over a dense array of narrow lines and one wide line, planarized over time, then dishing and erosion' });
      let XG = null;
      function buildXS() {
        xs.innerHTML = '';
        const mx = 10, H = narrow ? 300 : 350, yTop = 4, yBot = H - 24;
        const nArr = narrow ? 6 : 8, gapL = 1.2, gapM = 1.6, wideR = 10.6, gapR = 1.2;
        const span = gapL + nArr * PITCH + gapM + wideR + gapR, sc = (W - 2 * mx) / span;
        const X = u => mx + u * sc;
        const xa0 = gapL, xa1 = gapL + nArr * PITCH, xw = xa1 + gapM + wideR / 2;
        xs.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const dyn = svg('g'), stat = svg('g');
        xs.append(svg('defs', null, svg('pattern', { id: uid + '-hatch', width: 9, height: 9, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
          svg('line', { x1: 0, y1: 0, x2: 0, y2: 9, stroke: 'var(--ink)', 'stroke-opacity': .13, 'stroke-width': 1.5 }))), dyn, stat);
        const arrLab = T(X((xa0 + xa1) / 2), H - 6, '', { anchor: 'middle', fill: 'var(--muted)' });
        const wideLab = T(X(xw), H - 6, '', { anchor: 'middle', fill: 'var(--muted)' });
        stat.append(arrLab, wideLab);
        if (!narrow) stat.append(T(X(xa1 + gapM / 2), H - 6, 'field', { anchor: 'middle', fill: 'var(--muted)' }));
        XG = { X, sc, xa0, xa1, xw, nArr, span, dyn, arrLab, wideLab, mx, yTop, yBot };
      }
      function drawXS(m) {
        const { X, sc, xa0, xa1, xw, nArr, span, dyn, mx, yTop, yBot } = XG;
        dyn.innerHTML = '';
        const pl = m.plane, zf = Math.pow(Math.max(0, Math.min(1, (pl - 100) / 500)), 2);
        const topNm = pl + 60 + (OB + TOPO + (narrow ? 240 : 200) - pl - 60) * zf;   // full stack at first, then zoom in as the copper comes off
        const ys = (yBot - yTop) / (topNm - BOT), vx = (ys * 1000 / sc).toFixed(0);
        const Y = nm => yBot - (nm - BOT) * ys;
        const w = st.w, wa = st.rho * PITCH, bulk = m.tOver <= 0;
        const trenches = [];
        for (let i = 0; i < nArr; i++) { const c = xa0 + (i + .5) * PITCH; trenches.push({ x0: c - wa / 2, x1: c + wa / 2, wide: false }); }
        trenches.push({ x0: xw - w / 2, x1: xw + w / 2, wide: true });
        const para = (x, tr) => 1 - Math.pow((2 * x - tr.x0 - tr.x1) / (tr.x1 - tr.x0), 2);
        const inTr = x => { for (const tr of trenches) if (x >= tr.x0 && x <= tr.x1) return tr; return null; };
        const h0 = x => OB + HUMP * plateau(x, xa0, xa1, 1.0) - HUMP * plateau(x, xw - w / 2, xw + w / 2, 0.8) + RIP * Math.sin(2 * Math.PI * x / PITCH) * plateau(x, xa0, xa1, 0.5);
        const e = x => m.E * plateau(x, xa0, xa1, 0.3);
        const xsArr = [], N = narrow ? 200 : 320;
        for (let i = 0; i <= N; i++) xsArr.push(span * i / N);
        trenches.forEach(tr => xsArr.push(tr.x0 - 1e-4, tr.x0 + 1e-4, tr.x1 - 1e-4, tr.x1 + 1e-4));
        xsArr.sort((a, b) => a - b);
        const top = [], flo = [], die = [], pad = [], waf = [], ghost = [];
        for (const x of xsArr) {
          const tr = inTr(x), d = -e(x);
          let s, f = tr ? -LINE_H : d, p;
          if (bulk) { s = Math.min(h0(x), pl); p = pl; }                                             // rigid pad shaves only the high points
          else if (tr) { s = tr.wide ? -m.Dw * para(x, tr) : d - m.Da * para(x, tr); p = tr.wide ? -0.9 * m.Dw * para(x, tr) : d; }
          else { s = d; p = d; }
          const px = X(x).toFixed(1);
          top.push(px + ',' + Y(s).toFixed(1)); flo.push(px + ',' + Y(f).toFixed(1)); die.push(px + ',' + Y(d).toFixed(1));
          pad.push(px + ',' + Y(p).toFixed(1)); waf.push(px + ',' + Y(Math.max(s, d)).toFixed(1)); ghost.push(px + ',' + Y(h0(x)).toFixed(1));
        }
        const poly = (a, b) => 'M' + a.join(' L') + ' L' + b.slice().reverse().join(' L') + ' Z';
        const x0s = X(0).toFixed(1), x1s = X(span).toFixed(1), full = W - 2 * mx;
        // stack below the field: low-k with its (possibly eroded) top, SiCN cap, previous polished level
        dyn.append(svg('path', { d: 'M' + die.join(' L') + ' L' + x1s + ',' + Y(-230) + ' L' + x0s + ',' + Y(-230) + ' Z', fill: 'var(--si)', 'fill-opacity': .32 }));
        dyn.append(R(X(0), Y(-230), full, Y(-240) - Y(-230), 'var(--line2)'));
        dyn.append(R(X(0), Y(-240), full, yBot - Y(-240), 'var(--si)', { 'fill-opacity': .18 }));
        [.36, .5, .64, .78].forEach(u => dyn.append(R(X(u * span), Y(-250), 0.05 * span * sc, Y(-290) - Y(-250), 'var(--cu)', { 'fill-opacity': .55 })));
        // trench cavities lined with the TaN barrier
        trenches.forEach(tr => {
          const yt = Y(-e(tr.x0));
          dyn.append(R(X(tr.x0), yt, (tr.x1 - tr.x0) * sc, Y(-LINE_H) - yt, 'var(--ground)'));
          dyn.append(svg('path', { d: `M${X(tr.x0)},${yt} L${X(tr.x0)},${Y(-LINE_H)} L${X(tr.x1)},${Y(-LINE_H)} L${X(tr.x1)},${yt}`, fill: 'none', stroke: 'var(--warn)', 'stroke-width': 1.6 }));
        });
        if (bulk) { let prev = 0; trenches.forEach(tr => { dyn.append(L(X(prev), Y(0), X(tr.x0), Y(0), { stroke: 'var(--warn)', w: 1.6 })); prev = tr.x1; }); dyn.append(L(X(prev), Y(0), X(span), Y(0), { stroke: 'var(--warn)', w: 1.6 })); }
        // copper, then the pad (hatched) with the slurry film between pad and wafer
        dyn.append(svg('path', { d: poly(top, flo), fill: 'var(--cu)', 'fill-opacity': .92 }));
        const padD = 'M' + pad.join(' L') + ' L' + x1s + ',' + yTop + ' L' + x0s + ',' + yTop + ' Z';
        dyn.append(svg('path', { d: padD, fill: 'var(--line2)', 'fill-opacity': .5 }), svg('path', { d: padD, fill: `url(#${uid}-hatch)` }));
        dyn.append(svg('path', { d: poly(pad.map(s => { const q = s.split(','); return q[0] + ',' + (+q[1] - 2.5).toFixed(1); }), waf), fill: 'var(--si)', 'fill-opacity': .45 }));
        if (bulk && Y(OB + TOPO) > yTop + 2) {
          dyn.append(svg('polyline', { points: ghost.join(' '), fill: 'none', stroke: 'var(--cu)', 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }));
          if (Y(OB + TOPO) > yTop + 52) chip(dyn, W - mx - 6, Y(OB + TOPO) - 5, narrow ? 'as-plated surface' : 'as-plated Cu surface: 600 nm + plating topography', { anchor: 'end', fill: 'var(--cu)' });
        }
        // reference line and labels
        dyn.append(L(X(0), Y(0), X(span), Y(0), { stroke: 'var(--ink)', w: 1, attrs: { 'stroke-dasharray': '4 3', 'stroke-opacity': .7 } }));
        chip(dyn, W - mx - 6, Y(0) + 14, narrow ? 'field level' : 'field level = top of dielectric', { anchor: 'end', fill: 'var(--muted)' });
        chip(dyn, mx + 6, yTop + 14, narrow ? 'pad, P = ' + st.psi.toFixed(1) + ' psi' : 'polishing pad pressed down at P = ' + st.psi.toFixed(1) + ' psi', { bold: true });
        chip(dyn, mx + 6, yTop + 30, narrow ? 'slurry: H₂O₂ + glycine + BTA' : 'slurry film: H₂O₂ oxidizer + glycine + BTA inhibitor + silica abrasive', { fill: 'var(--si)' });
        chip(dyn, W - mx - 6, yTop + 14, 'v = ' + m.v.toFixed(2) + ' m/s →', { mono: true, anchor: 'end' });
        chip(dyn, W - mx - 6, yTop + 30, narrow ? 'vertical ×' + vx : 'vertical ×' + vx + ', lines ' + LINE_H + ' nm deep', { mono: true, anchor: 'end', fill: 'var(--muted)' });
        chip(dyn, mx + 6, Y(-230) - 5, narrow ? 'low-k dielectric' : 'low-k dielectric (SiOC:H)');
        chip(dyn, X(xw) - (narrow ? 24 : 0), Y(-LINE_H) + 14, narrow ? 'TaN barrier' : 'TaN barrier (~2 nm, not to scale)', { anchor: 'middle', fill: 'var(--warn)' });
        chip(dyn, W - mx - 6, Y(-230) - 4, 'SiCN cap', { anchor: 'end', fill: 'var(--muted)' });
        dyn.append(T(mx + 6, yBot - 3, narrow ? 'previous level' : 'previous metal level (polished, capped)', { fill: 'var(--muted)' }));
        if (bulk) {
          const removed = OB + TOPO - pl;
          if (pl > 95) chip(dyn, X(xa0) + 2, (Y(pl) + Y(0)) / 2 + 4, narrow ? 'Cu ' + pl.toFixed(0) + ' nm left (' + removed.toFixed(0) + ' removed)' : 'Cu overburden: ' + pl.toFixed(0) + ' nm left over the field, ' + removed.toFixed(0) + ' nm removed in ' + st.t.toFixed(0) + ' s', { mono: true });
          else chip(dyn, X(xa0) + 2, Y(0) + 32, 'soft landing: ' + pl.toFixed(0) + ' nm Cu left' + (narrow ? '' : ', endpoint near'), { mono: true });
        } else {
          const xd = X(xw);
          if (m.Dw > 1.5) dyn.append(dimArrow(xd, Y(0), Y(-m.Dw), 'var(--bad)'));
          chip(dyn, xd, Math.max(Y(-m.Dw) + 17, Y(0) + 32), 'dishing ' + m.Dw.toFixed(0) + ' nm', { anchor: 'middle', fill: 'var(--bad)', bold: true });
          if (m.E > 1.5) dyn.append(dimArrow(X(xa1 + 0.5), Y(0), Y(-m.E), 'var(--bad)'));
          chip(dyn, X((xa0 + xa1) / 2), Y(-m.E) + 17, 'erosion ' + m.E.toFixed(0) + ' nm', { anchor: 'middle', fill: 'var(--bad)', bold: true });
          const why = m.E > m.Dw + 5 ? (narrow ? 'dense array sinks as a block' : 'at high density the whole array sinks as a block: erosion beats dishing')
            : w < 1 ? (narrow ? 'pad bridges all narrow lines' : 'the pad bridges every narrow line, so dishing stays small everywhere')
            : (narrow ? 'pad bridges narrow lines' : 'the pad bridges the narrow lines but sinks into the wide one');
          chip(dyn, X(xa0) + 2, Y(-LINE_H) - 8, why, { fill: 'var(--muted)' });
        }
        XG.arrLab.textContent = narrow ? 'dense array, ρ = ' + (st.rho * 100).toFixed(0) + ' %' : 'dense array: ρ = ' + (st.rho * 100).toFixed(0) + ' % copper at 1 µm pitch';
        XG.wideLab.textContent = (narrow ? 'wide, w = ' : 'wide line, w = ') + st.w.toFixed(1) + ' µm';
      }

      // ---------- status line, readouts, formula ----------
      const phaseDot = h('i', { style: { width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block', flex: 'none', marginTop: '4px' } });
      const phaseTxt = h('span');
      const status = h('div', { style: { display: 'flex', gap: '8px', alignItems: 'flex-start', border: '1px solid var(--line)', borderRadius: '6px', padding: '8px 12px', margin: '8px 0 10px', fontSize: '13px', minHeight: '40px' } }, phaseDot, phaseTxt);
      const stRR = h('b'), stClear = h('b'), stDish = h('b'), stEro = h('b'), stRes = h('b'), stResA = h('b');
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, stRR, h('span', null, 'removal rate (Preston)')),
        h('div', { class: 'w-stat' }, stClear, h('span', null, 'time to clear ' + (OB + TOPO) + ' nm (endpoint)')),
        h('div', { class: 'w-stat' }, stDish, h('span', null, 'dishing, wide line')),
        h('div', { class: 'w-stat' }, stEro, h('span', null, 'erosion, dense array')),
        h('div', { class: 'w-stat' }, stRes, h('span', null, 'wide-line resistance rise')),
        h('div', { class: 'w-stat' }, stResA, h('span', null, 'array-line resistance rise')));
      const formula = h('div', { class: 'w-formula' });
      const note = h('div', { class: 'w-note' }, 'Endpoint detection: a coil under the pad induces eddy currents in the copper film; the thinner the film, the weaker the response, so the tool reads the remaining thickness in situ and stops bulk removal tens of nanometres above the barrier. When TaN appears, the optical reflectance and the platen motor torque change, and that signal, not a timer, ends the clearing step. Real copper CMP uses three platens (bulk, soft landing, barrier removal); one rate is used here. Dishing and erosion follow simplified empirical models: dishing saturates at the depth where the flexing pad loses contact with the recessed, BTA-passivated copper (deeper for wider lines and higher pressure); erosion grows with over-polish time because once the copper recedes the pad load is carried by only the (1 − ρ) fraction of dielectric between the lines, which therefore wears faster than the open field.');

      function model() {
        const rr = removalRate(st.psi, st.rpm), v = velocity(st.rpm), tc = clearTime(rr);
        const tOver = Math.max(0, st.t - tc), plane = Math.max(0, OB + TOPO - rr * st.t / 60);
        return { rr, v, tc, tOver, plane, Dw: dishing(st.psi, st.w, rr, tOver), Da: dishing(st.psi, st.rho * PITCH, rr, tOver), E: erosion(rr, st.rho, tOver) };
      }
      function render() {
        const m = model(), te = tEnd();
        tIn.max = te.toFixed(1); if (Math.abs(+tIn.value - st.t) > 0.25) tIn.value = st.t.toFixed(1);
        pOut.textContent = st.psi.toFixed(1) + ' psi'; rpmOut.textContent = st.rpm + ' rpm'; rhoOut.textContent = (st.rho * 100).toFixed(0) + ' %';
        wOut.textContent = st.w.toFixed(1) + ' µm'; tOut.textContent = st.t.toFixed(0) + ' s';
        if (TG) {
          TG.vel.textContent = 'v = ' + m.v.toFixed(2) + ' m/s →';
          TG.force.textContent = 'down-force ' + st.psi.toFixed(1) + ' psi';
          TG.headRpm.textContent = '↻ ' + st.rpm + ' rpm';
          TG.sigBar.setAttribute('width', (TG.sigW * m.plane / (OB + TOPO)).toFixed(1));
          TG.sigTxt.textContent = m.tOver > 0 ? 'TaN exposed' : 'Cu ' + m.plane.toFixed(0) + ' nm';
          if (TG.top) { TG.top.rpmT.textContent = '↻ ' + st.rpm + ' rpm'; TG.top.platLab.textContent = 'platen ~750 mm, ↻ ' + st.rpm + ' rpm'; }
          animateTool();
        }
        if (XG) drawXS(m);
        stRR.textContent = fmt(m.rr, 0) + ' nm/min';
        stClear.textContent = fmtTime(m.tc);
        stDish.textContent = m.Dw.toFixed(0) + ' nm';
        stEro.textContent = m.E.toFixed(0) + ' nm';
        stRes.textContent = '+' + ((LINE_H / Math.max(1, LINE_H - m.Dw) - 1) * 100).toFixed(0) + ' %';
        stResA.textContent = '+' + ((LINE_H / Math.max(1, LINE_H - m.E - m.Da) - 1) * 100).toFixed(0) + ' %';
        const kPa = st.psi * PSI / 1000;
        formula.innerHTML = 'RR = K<sub>p</sub> · P · v = 4.8×10<sup>−13</sup> Pa<sup>−1</sup> × ' + kPa.toFixed(1) + ' kPa × ' + m.v.toFixed(2) + ' m/s = ' + fmt(m.rr, 0) + ' nm/min &nbsp;(1 psi = 6.9 kPa; v = ω·r = 2π·' + st.rpm + '/60 s<sup>−1</sup> × 0.20 m offset, the same everywhere on the wafer when head and platen turn at equal rpm)<br>' +
          't<sub>clear</sub> = (' + OB + ' + ' + TOPO + ') nm / RR = ' + fmtTime(m.tc) + ' &nbsp;·&nbsp; dishing → D<sub>sat</sub> = 80 nm · √(P / 1.5 psi) · w / (w + 6 µm) = ' + dishSat(st.psi, st.w).toFixed(0) + ' nm &nbsp;·&nbsp; erosion E = (RR / S) · t<sub>over</sub> · ρ / (1 − ρ) with S ≈ ' + SEL + ', t<sub>over</sub> = ' + (OVER * 100).toFixed(0) + ' % of t<sub>clear</sub> = ' + (m.tc * OVER).toFixed(0) + ' s';
        if (m.tOver <= 0) {
          const soft = m.plane < 95;
          phaseDot.style.background = soft ? 'var(--warn)' : 'var(--accent)';
          phaseTxt.innerHTML = '<b>' + (soft ? 'Soft landing' : 'Bulk copper removal') + '</b> at t = ' + st.t.toFixed(0) + ' s: the eddy-current sensor reads <b>' + m.plane.toFixed(0) + ' nm</b> of copper over the field. ' +
            (soft ? 'Rate and pressure are lowered so the barrier is exposed gently; reflectance and motor torque will change when TaN appears.' : 'The rigid pad shaves only the high points, where the abrasive strips the Cu-BTA film; recessed copper stays passivated and wet with slurry, so the surface planarizes instead of merely thinning.');
        } else {
          phaseDot.style.background = 'var(--bad)';
          phaseTxt.innerHTML = '<b>Endpoint fired at ' + fmtTime(m.tc) + '</b>: barrier exposed everywhere. Over-polish +' + m.tOver.toFixed(0) + ' s to clear residual metal: the wide line dishes <b>' + m.Dw.toFixed(0) + ' nm</b>, the dense array erodes <b>' + m.E.toFixed(0) + ' nm</b> (tight-level spec ≈ 10–30 nm). Both thin the copper and raise line resistance, which is why design rules cap metal density at ~70–80 %.';
        }
      }

      // ---------- layout / animation / lifecycle ----------
      let lastW = 0;
      function relayout() {
        const style = getComputedStyle(el);
        const cw = Math.floor(el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)) || 700;
        if (cw === lastW) return;
        lastW = cw; W = Math.max(300, cw); narrow = W < 520;
        buildTool(); buildXS(); render();
      }
      function frame(ts) {
        raf = 0; if (!visible || !st.playing) return;
        if (!last) last = ts;
        const dt = Math.min(0.1, (ts - last) / 1000); last = ts;
        st.phase += dt * st.rpm / 80;
        const tc = clearTime(removalRate(st.psi, st.rpm)), te = tc * (1 + OVER);
        st.t += dt * (st.t < tc ? tc / ANIM_BULK : (te - tc) / ANIM_OVER);   // over-polish runs in slow motion
        if (st.t >= te) { st.t = te; st.playing = false; syncPlay(); }
        render();
        if (st.playing) raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && st.playing && visible) { last = 0; raf = requestAnimationFrame(frame); } }
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); });
      io.observe(el);
      const ro = new ResizeObserver(() => relayout());
      ro.observe(el);

      el.append(controls, tool, xs, status, readout, formula, note);
      st.t = reduced ? 0.06 * clearTime(removalRate(st.psi, st.rpm)) : 0;   // reduced motion: start paused with the plating humps half-shaved
      syncPlay();
      relayout();
      start();
      return () => { if (raf) cancelAnimationFrame(raf); raf = 0; st.playing = false; io.disconnect(); ro.disconnect(); };
    }
  });
})();
