/* Widget: mosfet-iv — "How a Transistor Switches" (Module 11) */
(function () {
  'use strict';
  const SS_FLOOR = 59.6;                       // (kT/q)·ln10 at 300 K in mV/dec: the thermal limit (module 11)
  const PHI_T = SS_FLOOR / 1e3 / Math.LN10;    // kT/q ≈ 25.9 mV
  const VD_REF = 0.05;                         // V_T is quoted at V_D = 50 mV
  const V_C = 0.25;                            // velocity-saturation voltage E_c·L (V)
  const I_MIN = 1e-12, I_MAX = 1e-2;           // A per µm of width (log-plot range)
  const ARCH = [
    { id: 'planar', name: 'Planar bulk (28 nm class)', ss: 90, dibl: 110, sides: 1, why: 'Gate on 1 side only. The bulk body under the channel (depletion depth 30–50 nm) lets the drain field reach the source barrier: scale length λ ≈ 8–10 nm.' },
    { id: 'finfet', name: 'FinFET (5 nm class)', ss: 70, dibl: 45, sides: 3, why: 'Gate wraps a 6–7 nm wide fin on 3 sides. The thin, fully depleted body shrinks the scale length to λ ≈ 3 nm, so the drain has far less say over the channel.' },
    { id: 'gaa', name: 'GAA nanosheet (2 nm class)', ss: 66, dibl: 30, sides: 4, why: 'Gate surrounds each 5–7 nm sheet on all 4 sides: λ < 2 nm, the best electrostatics of the three, which is why the industry moved to it at L<sub>g</sub> ≈ 12–14 nm.' },
  ];
  const softplus = x => x > 30 ? x : Math.log1p(Math.exp(x));
  // EKV-style unified model: exact SS slope below threshold, square law above, smooth in between.
  function rawI(vg, vd, vt, ss, dibl) {
    const n = ss / SS_FLOOR, vtEff = vt - dibl * 1e-3 * (vd - VD_REF), a = 2 * n * PHI_T;
    const lf = softplus((vg - vtEff) / a), lr = softplus((vg - vtEff - n * vd) / a);
    return { n, vtEff, lf, lr, i: 2 * n * PHI_T * PHI_T * (lf * lf - lr * lr) / (1 + a * lf / V_C) };
  }
  const K = 1e-3 / rawI(0.7, 0.7, 0.35, 70, 45).i;   // calibration: 1 mA/µm at the FinFET default
  const cur = (vg, vd, p) => { const r = rawI(vg, vd, p.vt, p.ss, p.dibl); r.i *= K; return r; };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const supNum = e => (e < 0 ? '⁻' : '') + String(Math.abs(e)).split('').map(c => SUP[+c]).join('');

  window.registerWidget('mosfet-iv', {
    title: 'How a Transistor Switches',
    caption: 'Drag the gate voltage: the channel inverts, electrons flow, and the log plot shows current climbing 10× for every SS (subthreshold swing) millivolts of gate voltage below threshold. Switch architecture to see why wrapping the gate around the channel lowers SS and DIBL (drain-induced barrier lowering: the drain stealing control of the channel).',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const st = { vg: 0.7, vd: 0.7, vt: 0.35, ss: 70, dibl: 45, shape: 'finfet', playing: !reduced, sweep: false };
      let raf = 0, visible = true, last = 0, tAnim = 0, sweepT = 0.35, nElec = 0;
      const fmtI = a => !isFinite(a) ? '–' : a >= 1e-3 ? fmt(a * 1e3, 2) + ' mA' : a >= 1e-6 ? fmt(a * 1e6, 1) + ' µA' : a >= 1e-9 ? fmt(a * 1e9, 1) + ' nA' : a >= 1e-12 ? fmt(a * 1e12, 1) + ' pA' : fmt(a * 1e15, 1) + ' fA';
      const fmtPow = r => { const e = Math.floor(Math.log10(r)); return fmt(r / 10 ** e, 1) + ' × 10' + supNum(e); };
      const T = (x, y, txt, o) => svg('text', Object.assign({ x, y, 'font-family': 'var(--sans)', 'font-size': 12, fill: 'var(--ink)' }, o || {}), txt);
      const M = (x, y, txt, o) => T(x, y, txt, Object.assign({ 'font-family': 'var(--mono)', fill: 'var(--muted)' }, o || {}));
      const HALO = { 'paint-order': 'stroke', stroke: 'var(--panel)', 'stroke-width': 3.5, 'stroke-linejoin': 'round' };
      // text with subscripts: odd-indexed parts are rendered as subscripts
      const rich = (x, y, parts, o) => { const t = T(x, y, parts[0], o); for (let k = 1; k < parts.length; k++) t.append(svg('tspan', k % 2 ? { dy: 3, 'font-size': 10.5 } : { dy: -3 }, parts[k])); return t; };
      const vsub = (x, y, sub, rest, o) => rich(x, y, ['V', sub, rest], Object.assign({ 'font-family': 'var(--mono)' }, o || {}));

      // ================= controls =================
      const archSel = h('select', { style: { minWidth: 0, width: '100%' } }, ...ARCH.map(a => h('option', { value: a.id, selected: a.id === st.shape || null }, a.name)), h('option', { value: 'custom' }, 'Custom (from sliders)'));
      const range = (v, min, max, step) => h('input', { type: 'range', min, max, step, value: v });
      const vgIn = range(st.vg, 0, 1, 0.01), vdIn = range(st.vd, 0.05, 1, 0.01), vtIn = range(st.vt, 0.2, 0.6, 0.01), ssIn = range(st.ss, 60, 100, 1), diblIn = range(st.dibl, 0, 150, 5);
      const O = { vg: h('output'), vd: h('output'), vt: h('output'), ss: h('output'), dibl: h('output') };
      const playBtn = h('button', { class: 'w-btn', on: { click: () => { st.playing = !st.playing; if (!st.playing) st.sweep = false; syncBtns(); start(); } } });
      const sweepBtn = h('button', { class: 'w-btn', on: { click: () => { st.sweep = !st.sweep; if (st.sweep) st.playing = true; syncBtns(); start(); } } });
      function syncBtns() { playBtn.textContent = st.playing ? 'Pause electrons' : 'Play electrons'; sweepBtn.innerHTML = st.sweep ? 'Stop sweep' : 'Sweep V<sub>G</sub> 0 → 1 V'; }
      const ctl = (label, inp, out) => h('label', { class: 'w-ctl' }, h('span', { html: label }), inp, out);
      const controls1 = h('div', { class: 'w-controls' }, h('label', { class: 'w-ctl' }, h('span', null, 'Architecture'), archSel), h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, playBtn, sweepBtn));
      const controls2 = h('div', { class: 'w-controls' },
        ctl('Gate V<sub>G</sub>', vgIn, O.vg), ctl('Drain V<sub>D</sub> (= V<sub>DD</sub>)', vdIn, O.vd), ctl('Threshold V<sub>T</sub>', vtIn, O.vt),
        ctl('Swing SS<span style="display:block;font-size:11px">subthreshold swing</span>', ssIn, O.ss),
        ctl('DIBL<span style="display:block;font-size:11px">drain-induced barrier lowering</span>', diblIn, O.dibl));

      // ================= cross-section (viewBox 340×306) =================
      const G = { L: 20, R: 320, top: 118, bot: 282, sR: 112, dL: 228, sdBot: 162, gTop: 84, oxTop: 110, wS: 30, wG: 170, wD: 296 };
      const XS = svg('svg', { class: 'w-svg', viewBox: '0 0 340 306', role: 'img', 'aria-label': 'MOSFET cross-section along the channel: source, gate, oxide, drain, inversion layer, depletion region and p-type body' });
      XS.append(svg('rect', { x: G.L, y: G.top, width: G.R - G.L, height: G.bot - G.top, fill: 'var(--si)', 'fill-opacity': .22, stroke: 'var(--si)', 'stroke-width': 1 }));
      const depFill = svg('path', { fill: 'var(--panel)', 'fill-opacity': .8 });
      const depLine = svg('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.2, 'stroke-dasharray': '4 3' });
      XS.append(depFill);
      const nplus = d => svg('path', { d, fill: 'var(--accent)', 'fill-opacity': .5, stroke: 'var(--accent)', 'stroke-width': 1 });
      XS.append(nplus(`M${G.L},${G.top} H${G.sR} V${G.sdBot - 10} Q${G.sR},${G.sdBot} ${G.sR - 10},${G.sdBot} H${G.L} Z`));
      XS.append(nplus(`M${G.dL},${G.top} H${G.R} V${G.sdBot} H${G.dL + 10} Q${G.dL},${G.sdBot} ${G.dL},${G.sdBot - 10} Z`));
      XS.append(depLine);
      const inv = svg('polygon', { fill: 'var(--accent)' });
      XS.append(inv);
      const eg = svg('g'); XS.append(eg);
      const ELEC = [];
      for (let i = 0; i < 14; i++) { const c = svg('circle', { r: 3.2, cy: G.top + 4, fill: 'var(--ink)', display: 'none' }); ELEC.push({ c, o: (i / 14 + 0.013 * ((i * 7) % 5)) % 1 }); eg.append(c); }
      XS.append(svg('rect', { x: G.sR, y: G.oxTop, width: G.dL - G.sR, height: G.top - G.oxTop, fill: 'var(--accent2)', 'fill-opacity': .9 }));
      XS.append(svg('rect', { x: G.sR, y: G.gTop, width: G.dL - G.sR, height: G.oxTop - G.gTop, fill: 'var(--cu)', 'fill-opacity': .95 }));
      XS.append(T(170, 101, 'metal gate', { 'text-anchor': 'middle', fill: 'var(--panel)', 'font-weight': 600 }));
      // wires and terminal labels
      [[G.wS, G.top], [G.wG, G.gTop], [G.wD, G.top]].forEach(([x, y]) => XS.append(svg('line', { x1: x, y1: 34, x2: x, y2: y, stroke: 'var(--ink)', 'stroke-width': 1.5 })));
      XS.append(T(G.wS, 14, 'Source', { 'text-anchor': 'middle' }), M(G.wS, 30, '0 V', { 'text-anchor': 'middle', fill: 'var(--ink)' }));
      XS.append(T(G.wG, 14, 'Gate', { 'text-anchor': 'middle' }), T(336, 14, 'Drain', { 'text-anchor': 'end' }));
      const vgLbl = vsub(G.wG, 30, 'G', ' = 0.70 V', { 'text-anchor': 'middle', fill: 'var(--ink)' });
      const vdLbl = vsub(336, 30, 'D', ' = 0.70 V', { 'text-anchor': 'end', fill: 'var(--ink)' });
      XS.append(vgLbl, vdLbl);
      // in-place labels
      XS.append(T(66, 142, 'n+', { 'text-anchor': 'middle', 'font-weight': 600 }), T(274, 142, 'n+', { 'text-anchor': 'middle', 'font-weight': 600 }));
      XS.append(T(106, 66, 'gate oxide', { 'text-anchor': 'end' }), T(106, 79, '≈ 1 nm EOT', { 'text-anchor': 'end', fill: 'var(--muted)' }));
      XS.append(svg('line', { x1: 100, y1: 82, x2: 111, y2: 113, stroke: 'var(--muted)', 'stroke-width': 1 }));
      const chLbl = T(150, 216, 'channel: inversion layer (electrons)', { 'text-anchor': 'middle' });
      const depLbl = T(190, 236, 'depletion region: no free carriers', { 'text-anchor': 'middle', fill: 'var(--muted)' });
      const chLead = svg('line', { x1: 150, y1: 205, x2: 150, y2: G.top + 5, stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-dasharray': '2 2' });
      const depLead = svg('line', { x1: 190, y1: 225, x2: 190, y2: 150, stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-dasharray': '2 2' });
      XS.append(chLead, depLead, chLbl, depLbl);
      XS.append(T(170, 268, 'p-type silicon body (substrate)', { 'text-anchor': 'middle' }));
      XS.append(svg('rect', { x: G.L, y: G.bot, width: G.R - G.L, height: 6, fill: 'var(--ink)', 'fill-opacity': .7 }));
      XS.append(T(170, 302, 'body contact · 0 V', { 'text-anchor': 'middle', fill: 'var(--muted)' }));

      function drawXS(r) {
        const wS = 9, wD = 9 + 16 * Math.sqrt(st.vd), eD = Math.min(wD * (0.7 + st.dibl / 120), 60);
        const dd = 10 + 32 * Math.sqrt(clamp(st.vg, 0, r.vtEff) / Math.max(r.vtEff, 0.05));
        const yS = G.sdBot + wS, yD = G.sdBot + wD, xS = G.sR + wS, xD = G.dL - eD, yC = G.top + dd, q = 8;
        const lower = `M${G.L},${yS} H${xS - q} Q${xS},${yS} ${xS},${yS - q} V${yC} H${xD} V${yD - q} Q${xD},${yD} ${xD + q},${yD} H${G.R}`;
        depLine.setAttribute('d', lower);
        depFill.setAttribute('d', lower + ` V${G.top} H${G.L} Z`);
        const li = Math.log10(Math.max(r.i, 1e-15));
        const t = 2 + 4 * clamp((st.vg - r.vtEff) / 0.35, 0, 1), qr = r.lf > 0 ? (r.lr * r.lr) / (r.lf * r.lf) : 0;
        inv.setAttribute('points', `${G.sR},${G.top} ${G.dL},${G.top} ${G.dL},${(G.top + t * qr).toFixed(1)} ${G.sR},${G.top + t}`);
        // the inversion sheet fades in with gate overdrive: invisible more than 2·SS below V_T, half-strength at V_T, solid 0.2 V above
        const u = (st.vg - r.vtEff) / (st.ss / 1000);
        inv.setAttribute('fill-opacity', (u < -2 ? 0 : u < 0 ? 0.25 * (u + 2) : Math.min(1, 0.5 + 2.5 * (st.vg - r.vtEff))).toFixed(2));
        chLbl.textContent = st.vg < r.vtEff ? 'channel (no inversion yet: leakage only)' : 'channel: inversion layer (electrons)';
        nElec = Math.round(14 * Math.pow(clamp((li + 11) / 8, 0, 1), 1.6));
        depLead.setAttribute('y2', G.top + dd / 2 + 4);
        vgLbl.lastChild.textContent = ' = ' + st.vg.toFixed(2) + ' V'; vdLbl.lastChild.textContent = ' = ' + st.vd.toFixed(2) + ' V';
        placeElectrons();
      }
      function placeElectrons() {
        ELEC.forEach((e, i) => {
          if (i >= nElec) { e.c.setAttribute('display', 'none'); return; }
          e.c.removeAttribute('display');
          const u = (tAnim * (0.22 + 0.5 * st.vd) + e.o) % 1;
          e.c.setAttribute('cx', (94 + u * 152).toFixed(1));
        });
      }

      // ================= end-view inset + state text =================
      const INS = svg('svg', { viewBox: '0 0 120 100', width: 120, height: 100, style: { flex: '0 0 120px' }, role: 'img', 'aria-label': 'End view of the channel showing how many sides the gate covers' });
      const insG = svg('g'); INS.append(insG);
      function drawInset() {
        insG.innerHTML = '';
        const a = ARCH.find(x => x.id === st.shape) || ARCH[1];
        insG.append(T(60, 11, 'end view', { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)' }));
        const si = { fill: 'var(--si)', 'fill-opacity': .5, stroke: 'var(--si)', 'stroke-width': 1 };
        const gate = { fill: 'var(--cu)', 'fill-opacity': .95 }, ox = { fill: 'none', stroke: 'var(--accent2)', 'stroke-width': 2.5 };
        if (a.id === 'planar') {
          insG.append(svg('rect', Object.assign({ x: 10, y: 48, width: 100, height: 30 }, si)));
          insG.append(svg('line', Object.assign({ x1: 25, y1: 47, x2: 95, y2: 47 }, ox)));
          insG.append(svg('rect', Object.assign({ x: 25, y: 30, width: 70, height: 15 }, gate)));
        } else if (a.id === 'finfet') {
          insG.append(svg('rect', Object.assign({ x: 10, y: 66, width: 100, height: 12 }, si)));
          insG.append(svg('path', Object.assign({ d: 'M26,18 H94 V66 H76 V28 H44 V66 H26 Z' }, gate)));
          insG.append(svg('path', Object.assign({ d: 'M46,66 V30 H74 V66' }, ox)));
          insG.append(svg('rect', Object.assign({ x: 50, y: 33, width: 20, height: 33 }, si)));
        } else {
          insG.append(svg('rect', Object.assign({ x: 10, y: 66, width: 100, height: 12 }, si)));
          insG.append(svg('rect', Object.assign({ x: 30, y: 16, width: 60, height: 50 }, gate)));
          [0, 1, 2].forEach(i => { insG.append(svg('rect', Object.assign({ x: 44, y: 22 + i * 14, width: 32, height: 7 }, ox))); insG.append(svg('rect', Object.assign({ x: 44, y: 22 + i * 14, width: 32, height: 7 }, si))); });
        }
        insG.append(T(60, 94, `gate on ${a.sides} side${a.sides > 1 ? 's' : ''}`, { 'text-anchor': 'middle', 'font-weight': 600 }));
      }
      const stateName = h('b', { style: { fontSize: '13.5px' } }), stateText = h('span'), archText = h('span', { style: { color: 'var(--muted)' } });
      const stateCol = h('div', { style: { display: 'grid', gap: '6px', alignContent: 'start', fontSize: '12.5px', lineHeight: '1.45' } },
        stateName, stateText,
        h('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start', marginTop: '2px' } }, INS, archText));
      const STATES = {
        off: ['OFF — subthreshold', 'V<sub>G</sub> is below threshold, so no inversion layer has formed. Only electrons in the hot tail of the source’s Boltzmann distribution climb the barrier into the channel: a leakage current that shrinks 10× for every SS millivolts the gate drops. Raising V<sub>G</sub> pushes holes away, so the depletion region (dashed) deepens.'],
        lin: ['ON — linear (triode) region', 'The surface has inverted: a sheet of electrons about 1–2 nm thick now joins source to drain and behaves like a resistor whose conductance the gate sets. I<sub>D</sub> rises almost linearly with V<sub>D</sub>.'],
        sat: ['ON — saturation (pinched off)', 'Near the drain the local gate-to-channel voltage has dropped below V<sub>T</sub>, so the inversion layer thins to nothing there: pinch-off. Extra V<sub>D</sub> adds almost no current (only through DIBL, which keeps lowering V<sub>T</sub>); electrons are swept across the pinched stretch by the strong drain field.'],
      };

      // ================= plots (viewBox 340×230 each) =================
      const LOG = svg('svg', { class: 'w-svg', viewBox: '0 0 340 234', role: 'img', 'aria-label': 'Transfer curve: drain current versus gate voltage on a log scale' });
      const OUT = svg('svg', { class: 'w-svg', viewBox: '0 0 340 234', role: 'img', 'aria-label': 'Output curves: drain current versus drain voltage for several gate voltages' });
      const P1 = { L: 58, R: 22, T: 24, B: 36, W: 340, H: 234 }, P2 = { L: 58, R: 50, T: 24, B: 36, W: 340, H: 234 };
      const x1 = v => P1.L + v * (P1.W - P1.L - P1.R), x2 = v => P2.L + v * (P2.W - P2.L - P2.R);
      const y1 = i => P1.T + (Math.log10(I_MAX) - Math.log10(clamp(i, I_MIN, I_MAX))) / 10 * (P1.H - P1.T - P1.B);
      const Y1B = P1.H - P1.B, Y2B = P2.H - P2.B;
      LOG.append(rich(P1.L, 13, ['Transfer curve: I', 'D', ' (per µm width) vs V', 'G', ', log scale']));
      OUT.append(rich(P2.L, 13, ['Output curves: I', 'D', ' vs V', 'D', ', one per V', 'G']));
      [[LOG, P1, x1], [OUT, P2, x2]].forEach(([S, P, xf]) => {
        [0, 0.2, 0.4, 0.6, 0.8, 1].forEach(v => {
          S.append(svg('line', { x1: xf(v), y1: P.T, x2: xf(v), y2: P.H - P.B, stroke: 'var(--line)', 'stroke-width': 1 }));
          S.append(M(xf(v), P.H - P.B + 15, v === 1 ? '1.0 V' : fmt(v, 1), { 'text-anchor': 'middle' }));
        });
        S.append(rich(P.W - P.R, P.H - 7, [S === LOG ? 'gate voltage V' : 'drain voltage V', S === LOG ? 'G' : 'D', ' (V) →'], { 'text-anchor': 'end', fill: 'var(--muted)' }));
      });
      [['1 pA', 1e-12], ['100 pA', 1e-10], ['10 nA', 1e-8], ['1 µA', 1e-6], ['100 µA', 1e-4], ['10 mA', 1e-2]].forEach(([l, v]) => {
        LOG.append(svg('line', { x1: P1.L, y1: y1(v), x2: P1.W - P1.R, y2: y1(v), stroke: 'var(--line)', 'stroke-width': 1 }));
        LOG.append(M(P1.L - 5, y1(v) + 4, l, { 'text-anchor': 'end' }));
      });
      const g1 = svg('g'), g2 = svg('g'); LOG.append(g1); OUT.append(g2);
      const poly = (pts, o) => svg('polyline', Object.assign({ points: pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '), fill: 'none', 'stroke-width': 1.5 }, o));
      // Collision-aware label placer, one per plot. reserve() registers fixed obstacles (markers); put() tries every
      // candidate spot (× vertical offsets) in order and takes the first that is inside the plot bounds B, passes the
      // optional side test o.ok and touches nothing placed so far. If no spot is clean it takes the least overlapping
      // one; the soft cost o.cost (e.g. number of curve points the box covers) only ranks the clean spots.
      const hits = (b, pts) => pts.reduce((n, p) => n + (p[0] >= b.x0 && p[0] <= b.x1 && p[1] >= b.y0 && p[1] <= b.y1 ? 1 : 0), 0);
      function placer(g, B) {
        const placed = [];
        const overlap = b => placed.reduce((s, p) => s + Math.max(0, Math.min(b.x1, p.x1) - Math.max(b.x0, p.x0)) * Math.max(0, Math.min(b.y1, p.y1) - Math.max(b.y0, p.y0)), 0);
        return {
          reserve: (x0, y0, x1, y1) => placed.push({ x0, y0, x1, y1 }),
          put(cands, w, mk, o) {
            o = o || {};
            // build the text first and measure it (w is only the estimate for when the SVG is not rendered)
            const el = mk(0, -100, 'start'); g.append(el);
            let top = -11, hgt = 16;
            try { const bb = el.getBBox(); if (bb.width > 0) { w = bb.width + 2; top = bb.y + 100 - 1; hgt = bb.height + 2; } } catch (e) { /* not rendered */ }
            const mkBox = (c, dy) => { const x0 = c.a === 'end' ? c.x - w : c.a === 'middle' ? c.x - w / 2 : c.x; return { x0, y0: c.y + dy + top, x1: x0 + w, y1: c.y + dy + top + hgt, x: c.x, y: c.y + dy, a: c.a || 'start' }; };
            let best = null, bestCost = Infinity;
            outer: for (const dy of o.dys || [0, 14, -14, 28, -28, 42]) for (const c of cands) {
              const b = mkBox(c, dy);
              if (b.x0 < B.x0 || b.x1 > B.x1 || b.y0 < B.y0 || b.y1 > B.y1 || (o.ok && !o.ok(b))) continue;
              const ov = overlap(b), cost = ov > 0 ? 1e4 + ov : (o.cost ? o.cost(b) : 0);
              if (cost < bestCost) { best = b; bestCost = cost; if (cost === 0) break outer; }
            }
            if (!best) {   // nothing fits at all: take the first spot, pushed inside the bounds
              best = mkBox(cands[0], 0);
              const dx = clamp(best.x0, B.x0, B.x1 - w) - best.x0, dy = clamp(best.y0, B.y0, B.y1 - hgt) - best.y0;
              best.x += dx; best.x0 += dx; best.x1 += dx; best.y += dy; best.y0 += dy; best.y1 += dy;
            }
            placed.push(best);
            el.setAttribute('x', best.x); el.setAttribute('y', best.y); el.setAttribute('text-anchor', best.a);
          },
        };
      }

      function drawLog(r, ion, ioff) {
        g1.innerHTML = '';
        const N = 100, solA = [], lowA = [];
        for (let k = 0; k <= N; k++) { const vg = k / N; solA.push([vg, cur(vg, st.vd, st).i]); lowA.push([vg, cur(vg, VD_REF, st).i]); }
        // clip a curve at the 1 pA axis floor so it enters the plot from the x-axis instead of running along it
        const clipLow = arr => {
          const k0 = arr.findIndex(p => p[1] >= I_MIN); if (k0 < 0) return [];
          const out = [];
          if (k0 > 0) { const a = arr[k0 - 1], b = arr[k0], la = Math.log10(Math.max(a[1], 1e-30)), f = (Math.log10(I_MIN) - la) / (Math.log10(b[1]) - la); out.push([x1(a[0] + f * (b[0] - a[0])), Y1B]); }
          for (let k = k0; k <= N; k++) out.push([x1(arr[k][0]), y1(arr[k][1])]);
          return out;
        };
        const sol = clipLow(solA), low = clipLow(lowA);
        // the 60 mV/dec floor: a line through the threshold point with the steepest slope physics allows
        const iT = cur(r.vtEff, st.vd, st).i, floor = [];
        for (let k = 0; k <= 80; k++) { const vg = r.vtEff - k * 0.01; const i = iT * 10 ** ((vg - r.vtEff) / (SS_FLOOR / 1000)); if (vg < 0 || i < I_MIN) break; floor.push([x1(vg), y1(i)]); }
        g1.append(poly(low, { stroke: 'var(--muted)', 'stroke-dasharray': '5 3' }));
        if (floor.length > 1) g1.append(poly(floor, { stroke: 'var(--ok)', 'stroke-dasharray': '2 3', 'stroke-width': 1.5 }));
        g1.append(poly(sol, { stroke: 'var(--accent2)', 'stroke-width': 2.5 }));
        const xt = x1(clamp(r.vtEff, 0, 1)), xo = x1(st.vd), yOn = y1(ion), yOff = y1(ioff), xg = x1(st.vg), yg = y1(r.i);
        g1.append(svg('line', { x1: xt, y1: P1.T, x2: xt, y2: Y1B, stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: .7 }));
        // below the 1 pA floor a marker ring would sit on the axis: hide it and say so in its label
        const offOn = ioff >= I_MIN, onOn = ion >= I_MIN;
        if (offOn) g1.append(svg('circle', { cx: x1(0), cy: yOff, r: 3, fill: 'var(--panel)', stroke: 'var(--accent2)', 'stroke-width': 1.5 }));
        if (onOn) g1.append(svg('circle', { cx: xo, cy: yOn, r: 3, fill: 'var(--panel)', stroke: 'var(--accent2)', 'stroke-width': 1.5 }));
        const pl = placer(g1, { x0: P1.L - 4, x1: P1.W - 2, y0: 20, y1: Y1B + 2 });
        if (offOn) pl.reserve(x1(0) - 5, yOff - 5, x1(0) + 5, yOff + 5);
        if (onOn) pl.reserve(xo - 5, yOn - 5, xo + 5, yOn + 5);
        pl.reserve(xg - 7, yg - 7, xg + 7, yg + 7);
        const cost = b => hits(b, sol) + hits(b, low);
        const vtTxt = ' = ' + r.vtEff.toFixed(2) + ' V';
        pl.put([{ x: xt + 4, y: P1.T + 11 }, { x: xt - 4, y: P1.T + 11, a: 'end' }, { x: xt + 4, y: Y1B - 4 }, { x: xt - 4, y: Y1B - 4, a: 'end' }], 92,
          (x, y, a) => vsub(x, y, 'T', vtTxt, Object.assign({ 'text-anchor': a, fill: 'var(--ink)' }, HALO)), { cost });
        const onTxt = onOn ? fmtI(ion) : '< 1 pA (' + fmtI(ion) + ')', onW = 26 + onTxt.length * 7;
        const onC = onOn ? [{ x: xo + 6, y: yOn + 14 }, { x: xo - 6, y: yOn - 6, a: 'end' }, { x: xo - 6, y: yOn + 14, a: 'end' }, { x: xo + 6, y: yOn - 6 }] : [{ x: xo + 6, y: Y1B - 6 }, { x: xo + 6, y: Y1B - 20 }];
        if (onOn && st.vd >= 0.6) onC.unshift(onC.splice(1, 1)[0]);   // at high V_D prefer above-left, clear of the dashed 50 mV curve just below
        pl.put(onC, onW, (x, y, a) => rich(x, y, ['I', 'on', ' ' + onTxt], Object.assign({ 'text-anchor': a, fill: 'var(--ink)' }, HALO)), { cost });
        const offTxt = offOn ? fmtI(ioff) : '< 1 pA (' + fmtI(ioff) + ')', offW = 30 + offTxt.length * 7;
        pl.put(offOn ? [{ x: x1(0) + 6, y: yOff + 14 }, { x: x1(0) + 6, y: yOff - 6 }, { x: x1(0) + 6, y: yOff + 27 }] : [{ x: x1(0) + 6, y: Y1B - 6 }, { x: x1(0) + 6, y: Y1B - 20 }], offW,
          (x, y, a) => rich(x, y, ['I', 'off', ' ' + offTxt], Object.assign({ 'text-anchor': a, fill: 'var(--ink)' }, HALO)), { cost });
        if (floor.length > 1) {
          const p = floor[floor.length - 1], q = floor[Math.round((floor.length - 1) * 0.6)], q2 = floor[Math.round((floor.length - 1) * 0.35)];
          pl.put([{ x: p[0] + 5, y: p[1] + 4 }, { x: p[0] + 5, y: p[1] + 17 }, { x: q[0] + 7, y: q[1] + 4 }, { x: q2[0] + 7, y: q2[1] + 4 }, { x: p[0] + 5, y: p[1] - 8 }, { x: p[0] + 5, y: p[1] + 30 }], 90,
            (x, y, a) => T(x, y, '60 mV/dec floor', Object.assign({ 'text-anchor': a, fill: 'var(--ok)' }, HALO)), { cost });
        }
        // SS annotation beside the subthreshold slope, 1.5 decades below threshold, offset to clear the floor line
        const vgS = r.vtEff - 1.5 * st.ss / 1000;
        if (vgS > 0) {
          const xs = x1(vgS), ys = y1(cur(vgS, st.vd, st).i) + 4;
          pl.put([{ x: xs + 30, y: ys }, { x: xs - 8, y: ys, a: 'end' }, { x: xs + 30, y: ys + 14 }, { x: xs + 30, y: ys - 12 }], 90,
            (x, y, a) => T(x, y, 'SS = ' + st.ss + ' mV/dec', Object.assign({ 'text-anchor': a, fill: 'var(--accent2)' }, HALO)), { cost });
        }
        // the dashed 50 mV curve is labelled below itself, ideally where it has visibly parted from the solid curve
        const lp = k => [x1(k / N), y1(lowA[k][1])], lx = P1.W - P1.R;
        let kd = lowA.findIndex((p, k) => p[1] >= I_MIN && y1(p[1]) - y1(solA[k][1]) > 14); if (kd < 0) kd = 62;
        const dC = [kd, 62, 75, 50, 40, 88].map(k => ({ x: lp(k)[0] + 4, y: lp(k)[1] + 15 }));
        dC.splice(1, 0, { x: lx, y: lp(N)[1] + 15, a: 'end' });
        pl.put(dC, 76, (x, y, a) => vsub(x, y, 'D', ' = 50 mV', Object.assign({ 'text-anchor': a, fill: 'var(--muted)' }, HALO)), { dys: [0, 14, 28, 42], cost });
        g1.append(svg('circle', { cx: xg, cy: yg, r: 4.5, fill: 'var(--accent)', stroke: 'var(--panel)', 'stroke-width': 1.5 }));
      }
      function drawOut(r) {
        g2.innerHTML = '';
        // the fixed family 0.4/0.6/0.8/1.0 V plus the live V_G (which replaces a family member it coincides with)
        const N = 60, fam = [0.4, 0.6, 0.8, 1.0], liveFam = fam.find(v => Math.abs(v - st.vg) < 0.005);
        const curves = fam.map(vg => ({ vg, live: vg === liveFam, pts: [] }));
        if (liveFam === undefined) curves.push({ vg: st.vg, live: true, pts: [] });
        let imax = 0;
        curves.forEach(c => { for (let k = 0; k <= N; k++) { const vd = k / N; const i = cur(c.vg, vd, st).i; c.pts.push([vd, i]); imax = Math.max(imax, i); } });
        const e = 10 ** Math.floor(Math.log10(imax)), ymax = e * [1, 2, 4, 5, 10].find(c => c * e >= imax);
        const y2 = i => P2.T + (1 - i / ymax) * (Y2B - P2.T);
        const unit = ymax >= 1e-3 ? [1e3, 'mA'] : ymax >= 1e-6 ? [1e6, 'µA'] : [1e9, 'nA'];
        [0, 0.25, 0.5, 0.75, 1].forEach(f => {
          g2.append(svg('line', { x1: P2.L, y1: y2(f * ymax), x2: P2.W - P2.R, y2: y2(f * ymax), stroke: 'var(--line)', 'stroke-width': 1 }));
          if (f !== 0.25 && f !== 0.75) g2.append(M(P2.L - 5, y2(f * ymax) + 4, f === 0 ? '0' : fmt(f * ymax * unit[0], 2) + ' ' + unit[1], { 'text-anchor': 'end' }));
        });
        // pinch-off locus V_D = (V_G − V_T)/n: the boundary between the linear region (left of it) and saturation (right of it)
        const locus = [];
        for (let k = 0; k <= N; k++) {
          const vd = k / N, vt = st.vt - st.dibl * 1e-3 * (vd - VD_REF), i = cur(vt + r.n * vd, vd, st).i;
          if (i > ymax) { const p = locus[locus.length - 1]; if (p) locus.push({ x: x2(p.vd + (ymax - p.i) / (i - p.i) / N), y: P2.T }); break; }
          locus.push({ x: x2(vd), y: y2(i), vd, i });
        }
        curves.forEach(c => { c.xy = c.pts.map(p => [x2(p[0]), y2(p[1])]); });
        if (locus.length > 1) g2.append(poly(locus.map(p => [p.x, p.y]), { stroke: 'var(--muted)', 'stroke-dasharray': '4 3' }));
        curves.forEach(c => { if (!c.live) g2.append(poly(c.xy, { stroke: 'var(--si)', 'stroke-width': 1.2 })); });
        curves.forEach(c => { if (c.live) g2.append(poly(c.xy, { stroke: 'var(--accent2)', 'stroke-width': 2.5 })); });
        const xo = x2(st.vd), yo = y2(r.i);
        const pl = placer(g2, { x0: P2.L - 4, x1: P2.W - P2.R - 3, y0: 20, y1: Y2B + 2 });
        pl.reserve(xo - 7, yo - 7, xo + 7, yo + 7);
        if (locus.length > 1) {
          const L = locus[locus.length - 1], allXY = curves.reduce((a, c) => a.concat(c.xy), []);
          // x of the locus at height y (+∞ above its end when it leaves through the right edge): the side tests keep
          // 'linear' wholly left of the locus and 'saturation' wholly right of it
          const xLocus = y => {
            if (y >= locus[0].y) return locus[0].x;
            if (y <= L.y) return L.y <= P2.T + 0.5 ? L.x : Infinity;
            for (let j = 1; j < locus.length; j++) if (locus[j].y <= y) { const a = locus[j - 1], b = locus[j]; return a.x + (b.x - a.x) * (a.y - y) / (a.y - b.y); }
            return L.x;
          };
          const at = f => locus[Math.round((locus.length - 1) * f)], cost = b => hits(b, allXY), sw = 124;
          pl.put([0.55, 0.4, 0.7, 0.3, 0.85, 0.2].map(f => ({ x: Math.min(at(f).x + 8, P2.W - P2.R - 3 - sw), y: at(f).y + 14 })), sw,
            (x, y, a) => T(x, y, 'saturation (pinch-off)', Object.assign({ 'text-anchor': a, fill: 'var(--muted)' }, HALO)),
            { dys: [0, 14, 28, -14], ok: b => b.x0 - 3 >= xLocus(b.y0) && b.x0 - 3 >= xLocus(b.y1), cost });
          pl.put([0.7, 0.55, 0.85, 0.4, 0.95].map(f => ({ x: at(f).x - 7, y: at(f).y - 4, a: 'end' })), 36,
            (x, y, a) => T(x, y, 'linear', Object.assign({ 'text-anchor': a, fill: 'var(--muted)' }, HALO)),
            { dys: [0, -14, 14, -28], ok: b => b.x1 + 3 <= xLocus(b.y0) && b.x1 + 3 <= xLocus(b.y1), cost });
        }
        // right-hand column: one label per curve at its right end (the live one highlighted), stacked 15 px apart under the 'V_G =' header
        const cx = P2.W - P2.R + 4, hy = P2.T - 4;
        const labels = curves.map(c => ({ y: y2(c.pts[N][1]) + 4, t: (c.live ? st.vg.toFixed(2) : c.vg.toFixed(1)) + ' V', live: c.live })).sort((a, b) => a.y - b.y);
        // de-collide the stack: push down from the header, then push back up from the axis (5 labels always fit)
        const n = labels.length;
        labels[0].y = Math.max(labels[0].y, hy + 15);
        for (let k = 1; k < n; k++) labels[k].y = Math.max(labels[k].y, labels[k - 1].y + 15);
        labels[n - 1].y = Math.min(labels[n - 1].y, Y2B - 3);
        for (let k = n - 2; k >= 0; k--) labels[k].y = Math.min(labels[k].y, labels[k + 1].y - 15);
        labels.forEach(l => g2.append(M(cx, l.y, l.t, l.live ? { fill: 'var(--accent2)', 'font-weight': 700 } : null)));
        g2.append(vsub(cx, hy, 'G', ' =', { fill: 'var(--muted)' }));
        g2.append(svg('line', { x1: xo, y1: P2.T, x2: xo, y2: Y2B, stroke: 'var(--accent)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
        g2.append(svg('circle', { cx: xo, cy: yo, r: 4.5, fill: 'var(--accent)', stroke: 'var(--panel)', 'stroke-width': 1.5 }));
      }

      // ================= readouts, formula, notes =================
      const readout = h('div', { class: 'w-readout' });
      const vddNote = h('div', { class: 'w-note', style: { marginTop: '0' } });
      const stat = (v, l, color) => h('div', { class: 'w-stat' }, h('b', { style: color ? { color } : null }, v), h('span', { html: l }));
      const formula = h('div', { class: 'w-formula', html:
        'SS = (kT/q)·ln 10 · m = 59.6 mV/dec × m at 300 K (k Boltzmann’s constant, T = 300 K, q electron charge: kT/q = 25.9 mV), with m = 1 + C<sub>dep</sub>/C<sub>ox</sub> ≥ 1 → no MOSFET switches faster than ≈ 60 mV per decade at room temperature<br>' +
        'V<sub>T</sub>(V<sub>D</sub>) = V<sub>T</sub> − DIBL · (V<sub>D</sub> − 0.05 V) &nbsp;·&nbsp; below V<sub>T</sub>: I<sub>D</sub> ∝ 10<sup>(V<sub>G</sub> − V<sub>T</sub>)/SS</sup> &nbsp;·&nbsp; above V<sub>T</sub>: I<sub>D</sub> ≈ ½ μC<sub>ox</sub>(W/L)(V<sub>G</sub> − V<sub>T</sub>)², velocity-saturated to ≈ W C<sub>ox</sub> v<sub>sat</sub>(V<sub>G</sub> − V<sub>T</sub>)' });
      const legend = h('div', { class: 'w-legend' },
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent)' } }), 'n+ silicon and inversion layer (electron-rich)'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--si)', opacity: .5 } }), 'p-type body'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--panel)', border: '1px dashed var(--muted)' } }), 'depletion region'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent2)' } }), 'gate oxide'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--cu)' } }), 'metal gate'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--ink)', borderRadius: '50%' } }), 'electron'));
      const note = h('div', { class: 'w-note', html: 'Model: an EKV-style unified curve, I<sub>D</sub> = I<sub>S</sub>[ln²(1 + e<sup>(V<sub>G</sub>−V<sub>T</sub>)/2nφ<sub>t</sub></sup>) − ln²(1 + e<sup>(V<sub>G</sub>−V<sub>T</sub>−nV<sub>D</sub>)/2nφ<sub>t</sub></sup>)] with n = SS/59.6 and a velocity-saturation roll-off, calibrated to 1 mA/µm at V<sub>G</sub> = V<sub>D</sub> = 0.7 V for the FinFET preset (module 11: a 2 nm-class NMOS delivers ≈ 1.0–1.3 mA/µm at V<sub>DD</sub> ≈ 0.7 V and must leak < 1 nA/µm). Presets: planar ≈ 90 mV/dec and 110 mV/V; FinFET ≈ 70 and 45; nanosheet ≈ 66 and 30. The cross-section is the classic bulk picture along the channel; the end-view inset shows how fin and sheet gates wrap it.' });

      function update() {
        st.vg = +vgIn.value; st.vd = +vdIn.value; st.vt = +vtIn.value; st.ss = +ssIn.value; st.dibl = +diblIn.value;
        O.vg.textContent = st.vg.toFixed(2) + ' V'; O.vd.textContent = st.vd.toFixed(2) + ' V'; O.vt.textContent = st.vt.toFixed(2) + ' V';
        O.ss.textContent = st.ss + ' mV/dec'; O.dibl.textContent = st.dibl + ' mV/V';
        const preset = ARCH.find(a => a.ss === st.ss && a.dibl === st.dibl);
        if (preset) st.shape = preset.id;
        if (archSel.value !== (preset ? preset.id : 'custom')) archSel.value = preset ? preset.id : 'custom';
        const r = cur(st.vg, st.vd, st), ion = cur(st.vd, st.vd, st).i, ioff = cur(0, st.vd, st).i, ratio = ion / ioff;
        const state = st.vg < r.vtEff ? 'off' : st.vd >= (st.vg - r.vtEff) / r.n ? 'sat' : 'lin';
        stateName.textContent = STATES[state][0]; stateText.innerHTML = STATES[state][1];
        const a = ARCH.find(x => x.id === st.shape) || ARCH[1];
        archText.innerHTML = '<b>' + a.name + ':</b> ' + a.why + (preset ? '' : ' (SS and DIBL now set by the sliders.)');
        readout.innerHTML = '';
        readout.append(
          stat(fmtI(r.i), 'I<sub>D</sub> at this V<sub>G</sub>, V<sub>D</sub> (per µm width)'),
          stat(fmtI(ioff), 'I<sub>off</sub> (V<sub>G</sub> = 0, V<sub>D</sub> = V<sub>DD</sub>)'),
          stat(fmtI(ion), 'I<sub>on</sub> (V<sub>G</sub> = V<sub>D</sub> = V<sub>DD</sub>)'),
          stat(fmtPow(ratio), 'I<sub>on</sub> / I<sub>off</sub> (logic needs ≈ 10⁵–10⁶)', ratio < 1e4 ? 'var(--bad)' : ratio < 1e5 ? 'var(--warn)' : 'var(--ok)'),
          stat(r.vtEff.toFixed(3) + ' V', 'V<sub>T</sub> at this V<sub>D</sub> (DIBL-shifted)'),
          stat(fmt(st.ss / SS_FLOOR, 2), 'body factor m = SS ÷ 59.6 mV/dec'),
          stat((6 * st.ss / 1000).toFixed(2) + ' V', 'gate swing for 6 decades (6 × SS)'));
        // V_D doubles as the supply V_DD for the I_on/I_off readouts; say so, and explain the collapse when it is too low to turn the device on
        const od = st.vd - cur(st.vd, st.vd, st).vtEff, vddTxt = 'V<sub>G</sub> = V<sub>D</sub> = V<sub>DD</sub> = ' + st.vd.toFixed(2) + ' V';
        vddNote.innerHTML = od < 0.15
          ? 'I<sub>on</sub> and I<sub>off</sub> are quoted at the supply, ' + vddTxt + '. With only ' + od.toFixed(2) + ' V of gate overdrive (V<sub>DD</sub> − V<sub>T</sub>) this supply cannot turn the device on, so the on/off ratio collapses: the drain voltage has not broken the transistor, the supply is simply too low. That is why V<sub>DD</sub> cannot fall much below 0.6–0.7 V.'
          : 'I<sub>on</sub> and I<sub>off</sub> are quoted at the supply, ' + vddTxt + ': the two states a logic gate actually sees (gate overdrive V<sub>DD</sub> − V<sub>T</sub> = ' + od.toFixed(2) + ' V).';
        drawXS(r); drawInset(); drawLog(r, ion, ioff); drawOut(r);
      }
      [vgIn, vdIn, vtIn, ssIn, diblIn].forEach(i => i.addEventListener('input', update));
      archSel.addEventListener('change', () => { const a = ARCH.find(x => x.id === archSel.value); if (a) { ssIn.value = a.ss; diblIn.value = a.dibl; st.shape = a.id; } update(); });

      // ================= animation =================
      function frame(ts) {
        raf = 0;
        if (!st.playing || !visible) return;
        const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts;
        tAnim += dt;
        if (st.sweep) { sweepT = (sweepT + dt / 8) % 1; vgIn.value = (sweepT < 0.5 ? 2 * sweepT : 2 - 2 * sweepT).toFixed(2); update(); }
        else placeElectrons();
        raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && st.playing && visible) { last = 0; raf = requestAnimationFrame(frame); } }
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); });
      io.observe(el);

      el.append(controls1, controls2,
        h('div', { class: 'w-grid2' }, XS, stateCol), h('div', { class: 'w-grid2', style: { marginTop: '10px' } }, LOG, OUT),
        legend, readout, vddNote, formula, note);
      syncBtns(); update(); start();
      ctx.onTheme(update);
      return () => { if (raf) cancelAnimationFrame(raf); raf = 0; st.playing = false; io.disconnect(); };
    }
  });
})();
