/* Widget: ald-cycle — "ALD: One Cycle at a Time" (Module 06, sec. 5) */
(function () {
  'use strict';
  // GPC values from Module 06: Al2O3 "~0.1 nm (1.0–1.2 Å)" at 150–300 °C; HfO2 "0.05–0.1 nm", ~20–30 cycles for 1.5–2 nm.
  const FILMS = {
    Al2O3: { html: 'Al₂O₃', pre: 'TMA', formula: 'Al(CH3)3', metal: 'Al', lig: 'CH3', ligHtml: '–CH₃ (methyl)', nLig: 3, by: 'CH4', gpc: 0.10, temp: '150–300 °C' },
    HfO2: { html: 'HfO₂', pre: 'TEMAH', formula: 'Hf[N(Et)Me]4', metal: 'Hf', lig: 'L', ligHtml: 'L = –N(Et)Me (ethylmethylamido)', nLig: 4, by: 'HNEtMe', gpc: 0.08, temp: '250–300 °C' },
  };
  const ORDER = { 7: [0, 4, 2, 6, 1, 5, 3], 5: [0, 3, 1, 4, 2] };   // which sites react first (scattered, deterministic)
  const STEP_MS = 1800, ANIM_MS = 1300;
  const COL = { pre: 'var(--accent2)', metal: 'var(--cu)', oh: 'var(--ok)', h2o: 'var(--si)', by: 'var(--muted)', n2: 'var(--line2)' };
  let uid = 0;

  // Geometry in viewBox units. W is chosen so the drawing is never scaled below 0.95 (text stays >= 11 px on screen).
  function layout(W) {
    const full = W >= 470, N = full ? 7 : 5;
    const ch = { x0: full ? 40 : 16, x1: W - 40, y0: 46, y1: 178 }, cx = (ch.x0 + ch.x1) / 2;
    const ph = full ? 100 : Math.min(60, (ch.x1 - ch.x0) / 2 - 80);
    // full: wafer ends 135 units before the wall so the film readout sits clear of the exhaust column to the pump port
    const wafer = { x0: ch.x0 + (full ? 45 : 44), x1: ch.x1 - (full ? 135 : 62), y: 132, h: 6 };
    const inset = { x0: ch.x0, x1: full ? W - 40 : W - 16, y0: 210, y1: 402 };
    const insW = inset.x1 - inset.x0;
    return {
      W, H: 406, N, full, fs: full ? 12 : 13, af: full ? 12 : 12.5, ar: full ? 11 : 11.5, lo: full ? 14 : 13, nDots: full ? 16 : 10,
      valves: full ? [{ x: 40, w: 52 }, { x: 100, w: 40 }, { x: 148, w: 62 }] : [{ x: 16, w: 52 }, { x: 76, w: 40 }, { x: 124, w: 62 }],
      vy: 6, vh: 18, manY: 34, manEnd: cx, ch, plate: { x0: cx - ph, x1: cx + ph }, wafer,
      chuck: { x0: wafer.x0 - 10, x1: wafer.x1 + 10, y0: 138, y1: 162 }, ex: ch.x1 - 20, chuckLabel: wafer.x0 + (wafer.x1 - wafer.x0) / 2,
      inset, siteC: (inset.x0 + inset.x1) / 2, pitch: Math.min(60, Math.floor((insW - 60) / (N - 1))),
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function alongPath(pts, u) {   // constant-speed point along a polyline, u in [0,1]
    const segs = []; let tot = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); tot += d; }
    let rem = clamp(u, 0, 1) * tot;
    for (let i = 0; i < segs.length; i++) {
      if (rem <= segs[i] || i === segs.length - 1) { const t = segs[i] ? rem / segs[i] : 1; return [lerp(pts[i][0], pts[i + 1][0], t), lerp(pts[i][1], pts[i + 1][1], t)]; }
      rem -= segs[i];
    }
    return pts[pts.length - 1];
  }

  window.registerWidget('ald-cycle', {
    title: 'ALD: One Cycle at a Time',
    caption: 'Step or play through precursor pulse → purge → H₂O pulse → purge in a single-wafer reactor and watch the film build up one self-limiting ~0.1 nm step (about a third of a monolayer) per cycle.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const id = 'ald' + (++uid);
      const contentW = () => { const cs = getComputedStyle(el); return Math.max(200, (el.clientWidth || 700) - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)); };
      let L = layout(clamp(Math.round(contentW() / 0.95), 300, 520)), chartW = contentW();
      const st = { film: 'Al2O3', step: 0, incs: [], playing: !reduced, dose: 1, target: 2, t: [0.3, 3, 0.2, 4] };
      let raf = 0, timer = 0, roRaf = 0, visible = true, animStart = 0, lastP = 0.5;
      const F = () => FILMS[st.film];
      const gpcAt = d => F().gpc * (1 - Math.exp(-6 * d));
      const cov = () => gpcAt(st.dose) / F().gpc;
      const reacted = () => ORDER[L.N].slice(0, Math.round(cov() * L.N));
      const nExtra = () => clamp(Math.round((st.dose - 1) * L.N), 0, L.N);
      const stackH = () => { const n = st.incs.length; return n ? n * Math.min(3, 24 / n) : 0; };
      const filmTop = () => L.wafer.y - stackH();
      const siteX = i => L.siteC + (i - (L.N - 1) / 2) * L.pitch;
      // reduced motion: a mid-step snapshot; with excess dose show the saturated surface with the extra molecules bouncing off
      const staticP = () => (st.step % 2 ? 0.45 : (nExtra() > 0 ? 0.8 : 0.5));

      function steps(f) {
        const n = f.nLig - 1, L3 = f.lig === 'L' ? ' (L = the –N(Et)Me ligand)' : '';
        return [
          { name: `${f.pre} pulse`, short: `${f.pre} pulse`, color: COL.pre,
            cap: `${f.pre} (${f.formula}) flows in through the showerhead. Each molecule that meets a surface –OH bonds to its oxygen as –O–${f.metal}(${f.lig})${n}${L3} and kicks out one ${f.by}. Once every –OH is used up, extra ${f.pre} finds nothing to react with and bounces off: the half-reaction is self-limiting.` },
          { name: `Purge (after ${f.pre})`, short: 'N2 purge', color: COL.n2,
            cap: `Inert N2 sweeps the unreacted ${f.pre} and the ${f.by} byproduct out to the pump. If any ${f.pre} were still in the chamber when H2O arrived, the two would react in the gas (ordinary CVD) and rain particles onto the wafer.` },
          { name: 'H2O pulse', short: 'H2O pulse', color: COL.h2o,
            cap: `Each H2O molecule swaps one ${f.lig} ligand (a group hanging off the ${f.metal} atom) for –OH and releases another ${f.by}. The surface is hydroxylated again: one ${f.metal}–O layer, ~${f.gpc.toFixed(2)} nm or about a third of a monolayer, has been added.` },
          { name: 'Purge (after H2O)', short: 'N2 purge', color: COL.n2,
            cap: `N2 removes the excess H2O and ${f.by}. One cycle is complete: a stripe is added to the film and the fresh –OH surface is ready for the next ${f.pre} pulse. Thickness ≈ cycles × calibrated GPC once growth is steady and both half-reactions saturate. Deep features can need longer exposure.` },
        ];
      }

      // ---------- drawing ----------
      const chamber = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Single-wafer ALD reactor cross-section with a zoomed view of the surface chemistry' });
      const T = (x, y, s, o = {}) => svg('text', Object.assign({ x: (+x).toFixed(1), y: (+y).toFixed(1), 'font-family': o.mono ? 'var(--mono)' : 'var(--sans)', 'font-size': o.size || L.fs, fill: o.fill || 'var(--muted)', 'text-anchor': o.anchor || 'start', 'font-weight': o.bold ? 600 : 400, opacity: o.op == null ? 1 : o.op }, o.attrs || {}), s);
      const Cc = (cx, cy, r, fill, o = {}) => svg('circle', Object.assign({ cx: cx.toFixed(1), cy: cy.toFixed(1), r, fill, opacity: o.op == null ? 1 : o.op.toFixed(2) }, o.attrs || {}));
      const Ln = (g, x1, y1, x2, y2, stroke, w) => g.append(svg('line', { x1: (+x1).toFixed(1), y1: (+y1).toFixed(1), x2: (+x2).toFixed(1), y2: (+y2).toFixed(1), stroke: stroke || 'var(--muted)', 'stroke-width': w || 2 }));
      // tinted atom / group circle with a label inside (ink text works in both themes)
      const atom = (g, x, y, r, col, label, op, size) => {
        g.append(svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r, fill: col, 'fill-opacity': 0.32, stroke: col, 'stroke-width': 1.6, opacity: op == null ? 1 : op }));
        if (label) g.append(T(x, y + (size || L.af) * 0.36, label, { mono: true, fill: 'var(--ink)', anchor: 'middle', op, size: size || L.af }));
      };
      // precursor cluster: metal centre with nLig ligand dots around it. side = +1 label right, -1 label left
      const cluster = (g, x, y, f, op, side) => {
        for (let k = 0; k < f.nLig; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / f.nLig; g.append(Cc(x + 10 * Math.cos(a), y + 10 * Math.sin(a), 4.5, COL.pre, { op })); }
        g.append(Cc(x, y, 6, COL.metal, { op }));
        if (side) g.append(T(x + side * 17, y + 4, f.pre, { fill: COL.pre, op, bold: true, anchor: side > 0 ? 'start' : 'end' }));
      };
      const water = (g, x, y, op, side) => { g.append(Cc(x, y, 6.5, COL.h2o, { op })); if (side) g.append(T(x + side * 12, y + 4, 'H2O', { fill: COL.h2o, op, bold: true, anchor: side > 0 ? 'start' : 'end' })); };
      const puff = (g, x, y, r, op, label) => { g.append(Cc(x, y, r, COL.by, { op })); if (label) g.append(T(x, y - r - 3, label, { fill: COL.by, anchor: 'middle', op, mono: true })); };

      function paint(p) {
        lastP = p;
        const f = F(), s = st.step, pulse = s % 2 === 0, isTMA = s === 0, S = steps(f)[s];
        const act = pulse ? (isTMA ? 0 : 1) : 2, actCol = [COL.pre, COL.h2o, COL.n2][act];
        const ch = L.ch, ins = L.inset, fTop = filmTop(), react = reacted(), k = react.length, nl = f.nLig - 1, AR = L.ar;
        chamber.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
        chamber.innerHTML = '';
        const defs = svg('defs');
        defs.append(svg('clipPath', { id: id + 'c' }, svg('rect', { x: ch.x0, y: ch.y0, width: ch.x1 - ch.x0, height: ch.y1 - ch.y0 })));
        defs.append(svg('clipPath', { id: id + 'i' }, svg('rect', { x: ins.x0, y: ins.y0, width: ins.x1 - ins.x0, height: ins.y1 - ins.y0 })));
        chamber.append(defs);

        // --- inlet valves + manifold (top-left) ---
        const vNames = [f.pre, 'H2O', 'N2 purge'];
        L.valves.forEach((v, i) => {
          const cx = v.x + v.w / 2, on = i === act, c = [COL.pre, COL.h2o, COL.n2][i];
          chamber.append(svg('rect', { x: v.x, y: L.vy, width: v.w, height: L.vh, rx: 3, fill: on ? c : 'var(--panel)', 'fill-opacity': on ? 0.28 : 1, stroke: on ? c : 'var(--line2)', 'stroke-width': on ? 2 : 1.2 }));
          chamber.append(T(cx, L.vy + 13.5, vNames[i], { anchor: 'middle', fill: on ? 'var(--ink)' : 'var(--muted)', bold: on }));
          Ln(chamber, cx, L.vy + L.vh, cx, L.manY, 'var(--line2)', 2);
        });
        const v0 = L.valves[0].x + L.valves[0].w / 2;
        chamber.append(svg('path', { d: `M${v0},${L.manY} H${L.manEnd} V${ch.y0 + 8}`, fill: 'none', stroke: 'var(--line2)', 'stroke-width': 2 }));
        const av = L.valves[act], acx = av.x + av.w / 2;
        chamber.append(svg('path', { d: `M${acx},${L.vy + L.vh} V${L.manY} H${L.manEnd} V${ch.y0 + 8}`, fill: 'none', stroke: actCol, 'stroke-width': 2.5, 'stroke-dasharray': '6 5', 'stroke-dashoffset': (-p * 55).toFixed(1) }));
        chamber.append(T(L.W - 8, 20, L.full ? `Step ${s + 1} · ${S.name}` : S.short, { anchor: 'end', fill: pulse ? actCol : 'var(--muted)', bold: true, size: L.fs + 1 }));

        // --- chamber body, showerhead, chuck, wafer, film, pump ---
        chamber.append(svg('rect', { x: ch.x0, y: ch.y0, width: ch.x1 - ch.x0, height: ch.y1 - ch.y0, fill: 'var(--ground)', stroke: 'var(--line2)', 'stroke-width': 2, rx: 3 }));
        chamber.append(svg('rect', { x: L.plate.x0, y: ch.y0, width: L.plate.x1 - L.plate.x0, height: 8, fill: 'var(--panel2)' }));
        chamber.append(svg('rect', { x: L.plate.x0, y: ch.y0 + 8, width: L.plate.x1 - L.plate.x0, height: 6, fill: 'var(--line2)' }));
        for (let x = L.plate.x0 + 7; x < L.plate.x1; x += 14) Ln(chamber, x, ch.y0 + 14, x, ch.y0 + 19, 'var(--line2)', 2);
        if (L.full) chamber.append(T(L.plate.x0 - 6, ch.y0 + 17, 'showerhead', { anchor: 'end' }));
        else chamber.append(T(L.plate.x1 + 6, ch.y0 + 17, 'showerhead'));
        const ck = L.chuck;
        chamber.append(svg('rect', { x: ck.x0, y: ck.y0, width: ck.x1 - ck.x0, height: ck.y1 - ck.y0, fill: 'var(--panel2)', stroke: 'var(--line2)', 'stroke-width': 1.5 }));
        let zz = `M${ck.x0 + 8},${ck.y0 + 12}`;
        for (let x = ck.x0 + 8, up = true; x < ck.x1 - 8; x += 8, up = !up) zz += ` L${x + 8},${ck.y0 + (up ? 6 : 18)}`;
        chamber.append(svg('path', { d: zz, fill: 'none', stroke: 'var(--warn)', 'stroke-width': 1.5, opacity: 0.85 }));
        const w = L.wafer;
        chamber.append(svg('rect', { x: w.x0, y: w.y, width: w.x1 - w.x0, height: w.h, fill: 'var(--si)' }));
        const n = st.incs.length, sh = n ? stackH() / n : 0;
        for (let i = 0; i < n; i++) chamber.append(svg('rect', { x: w.x0, y: (w.y - (i + 1) * sh).toFixed(2), width: w.x1 - w.x0, height: sh.toFixed(2), fill: i % 2 ? 'var(--si)' : 'var(--accent2)', 'fill-opacity': 0.6 }));
        chamber.append(T(w.x0 - 5, w.y + 6, 'wafer', { anchor: 'end' }));
        const bx = w.x1 + 6, mid = (fTop + w.y) / 2;
        chamber.append(svg('path', { d: `M${bx - 3},${fTop} h6 M${bx},${fTop} V${w.y} M${bx - 3},${w.y} h6`, stroke: 'var(--muted)', 'stroke-width': 1.2, fill: 'none' }));
        const thick = st.incs.reduce((a, b) => a + b, 0), perCycle = (n ? thick / n : f.gpc).toFixed(2);   // actual mean increment (dose < 1 gives less than the saturation GPC)
        if (L.full) {   // compact: the thickness readout moves to the inset bar, keeping the pump column clear
          chamber.append(T(bx + 6, mid - 3, `film ${thick.toFixed(2)} nm`, { fill: 'var(--ink)' }));
          chamber.append(T(bx + 6, mid + 14, `${n} × ${perCycle} nm`, { mono: true }));
        }
        chamber.append(T(L.chuckLabel, ch.y1 + 14, `heated chuck · ${f.temp}`, { anchor: 'middle' }));
        // exhaust duct in the floor, right of the chuck
        chamber.append(svg('rect', { x: L.ex - 10, y: ch.y1 - 1, width: 20, height: 14, fill: 'var(--ground)', stroke: 'var(--line2)', 'stroke-width': 2 }));
        Ln(chamber, L.ex - 10, ch.y1, L.ex + 10, ch.y1, 'var(--ground)', 3);
        chamber.append(svg('path', { d: `M${L.ex},${ch.y1 + 3} V${ch.y1 + 20} M${L.ex - 4},${ch.y1 + 16} L${L.ex},${ch.y1 + 21} L${L.ex + 4},${ch.y1 + 16}`, stroke: 'var(--muted)', 'stroke-width': 1.6, fill: 'none' }));
        chamber.append(T(L.W - 4, ch.y1 + 16, 'to pump', { anchor: 'end' }));

        // --- gas inside the chamber (clipped) ---
        const gc = svg('g', { 'clip-path': `url(#${id}c)` });
        chamber.append(gc);
        const exitPath = x => [[x, ch.y0 + 20], [lerp(x, L.ex - 5, 0.5), 92], [L.ex - 5, 104], [L.ex, ch.y1 + 6]];
        const floatPos = [[0.3, 0.45], [0.52, 0.6], [0.7, 0.4], [0.42, 0.75], [0.62, 0.78]].map(([a, b]) => [lerp(ch.x0, ch.x1, a), lerp(ch.y0 + 22, fTop - 8, b)]);
        if (pulse) {
          const nd = Math.round(L.nDots * st.dose), c = isTMA ? COL.pre : COL.h2o;
          for (let i = 0; i < nd; i++) {
            const x = L.plate.x0 + 10 + ((i * 43) % (L.plate.x1 - L.plate.x0 - 20));
            const u = (p * 1.4 + ((i * 0.31) % 1)) % 1;
            gc.append(Cc(x, lerp(ch.y0 + 20, fTop - 6, u), 3.5, c));
          }
          const q = clamp((p - 0.6) / 0.4, 0, 1);
          floatPos.forEach(([x, y], i) => { if (i < 3) gc.append(Cc(x, lerp(fTop - 8, y, q), 3.5, COL.by, { op: q })); else if (st.dose > 0) gc.append(Cc(x, y, 3.5, isTMA ? COL.pre : COL.h2o, { op: q })); });
        } else {
          floatPos.forEach(([x, y], i) => {
            if (i >= 3 && st.dose <= 0) return;
            const u = clamp(p * 1.3 - i * 0.04, 0, 1); if (u >= 1) return;
            const [px, py] = alongPath([[x, y], [L.ex - 5, 104], [L.ex, ch.y1 + 6]], u);
            gc.append(Cc(px, py, 3.5, i < 3 ? COL.by : (s === 1 ? COL.pre : COL.h2o)));
          });
          for (let i = 0; i < 14; i++) {
            const x = L.plate.x0 + 10 + ((i * 37) % (L.plate.x1 - L.plate.x0 - 20));
            const [px, py] = alongPath(exitPath(x), (p * 1.6 + ((i * 0.21) % 1)) % 1);
            gc.append(svg('circle', { cx: px.toFixed(1), cy: py.toFixed(1), r: 3.2, fill: COL.n2, stroke: 'var(--muted)', 'stroke-width': 0.8 }));
          }
        }

        // --- callout to the zoomed surface ---
        const cxw = (w.x0 + w.x1) / 2;
        chamber.append(svg('rect', { x: cxw - 10, y: fTop - 5, width: 20, height: 8, fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '3 2' }));
        // callout lines skip the label band under the chamber floor so they never cross 'heated chuck' / 'to pump'
        const callout = (xa, ya, xb, yb) => { const at = y => lerp(xa, xb, (y - ya) / (yb - ya)); return `M${xa},${ya} L${at(ch.y1 + 1).toFixed(1)},${ch.y1 + 1} M${at(ch.y1 + 21).toFixed(1)},${ch.y1 + 21} L${xb},${yb}`; };
        chamber.append(svg('path', { d: callout(cxw - 10, fTop + 3, ins.x0, ins.y0) + ' ' + callout(cxw + 10, fTop + 3, ins.x1, ins.y0), stroke: 'var(--muted)', 'stroke-dasharray': '3 3', fill: 'none' }));
        chamber.append(svg('rect', { x: ins.x0, y: ins.y0, width: ins.x1 - ins.x0, height: ins.y1 - ins.y0, fill: 'var(--panel2)', stroke: 'var(--muted)', 'stroke-dasharray': '4 3', rx: 4 }));
        chamber.append(T(ins.x0 + 8, ins.y0 + 15, L.full ? 'surface, zoomed in' : 'zoomed surface', { fill: 'var(--ink)', bold: true }));
        const barY = ins.y1 - 20;
        chamber.append(svg('rect', { x: ins.x0, y: barY, width: ins.x1 - ins.x0, height: 20, fill: 'var(--si)', 'fill-opacity': 0.3 }));
        chamber.append(T(ins.x0 + 8, barY + 14, L.full ? (n ? `film after ${n} cycle${n > 1 ? 's' : ''}` : 'substrate') + ' · 1 cycle ≈ 1/3 monolayer (0.3 nm)'
          : (n ? `film: ${n} × ${perCycle} nm = ${thick.toFixed(2)} nm` : 'substrate · 1/3 monolayer per cycle')));

        const gi = svg('g', { 'clip-path': `url(#${id}i)` });
        chamber.append(gi);
        const oy = barY - 13, gy = oy - 22, ly = gy - 25, ly3 = ly - 23, y0f = ins.y0 + 34, yEnd = ins.y0 + 44, insW = ins.x1 - ins.x0, xMax = ins.x1 + 24;
        const ligPos = (x, j) => (nl === 3 && j === 2) ? [x, ly3] : [x + (j === 0 ? -L.lo : L.lo), ly];
        const topLig = nl === 3 ? ly3 : ly;
        const landTMA = gy - 9 - 14.5, landH2O = j => ligPos(0, j)[1] - AR - 8;
        const arrive = (m, M) => 0.30 + 0.40 * (M > 1 ? m / (M - 1) : 0);
        const M = isTMA ? k : k * nl;
        // purge: N2 sweep behind everything
        if (!pulse) {
          for (let i = 0; i < 12; i++) {
            const y = y0f + 6 + ((i * 41) % 100), x = ins.x0 + ((p * 1.3 + i * 0.09) % 1) * insW;
            gi.append(svg('circle', { cx: x.toFixed(1), cy: y, r: 3.5, fill: COL.n2, stroke: 'var(--muted)', 'stroke-width': 0.8 }));
          }
          gi.append(T(ins.x1 - 8, ins.y0 + 15, L.full ? 'N2 sweeps the leftovers → to pump' : 'N2 → to pump', { anchor: 'end', fill: 'var(--ink)' }));
        }
        // surface sites: ‖–O–H  →  ‖–O–M(lig)n  →  ‖–O–M(OH)n
        for (let i = 0; i < L.N; i++) {
          const x = siteX(i), ri = react.indexOf(i), isR = ri >= 0;
          Ln(gi, x, barY, x, gy);
          let state = 'OH';
          if (isR) { if (s === 1) state = 'capped'; else if (s === 3) state = 'hydrox'; else if (isTMA) state = p >= arrive(ri, M) ? 'capped' : 'OH'; else state = 'mixed'; }
          if (state === 'OH') atom(gi, x, gy, 9, COL.oh, 'H');
          else {
            for (let j = 0; j < nl; j++) {
              const [lx, lyy] = ligPos(x, j);
              Ln(gi, x, gy, lx, lyy);
              const done = state === 'hydrox' || (state === 'mixed' && p >= arrive(ri * nl + j, M));
              atom(gi, lx, lyy, AR, done ? COL.oh : COL.pre, done ? 'OH' : f.lig);
            }
            atom(gi, x, gy, AR, COL.metal, f.metal);
          }
          atom(gi, x, oy, 8, COL.oh, 'O');
        }
        // pulse: molecules descending, sites flipping on arrival, byproduct rising
        // byproduct puffs rise in the gap beside the site so they never sit on a molecule path; only two are labelled
        const puffFrom = (xL, yL, pa, label) => {
          const q = clamp((p - pa) / 0.35, 0, 1);
          if (p >= pa) puff(gi, xL + 12 * q, lerp(yL, yEnd, q), (isTMA ? 6 : 5) + 2 * q, 1 - (isTMA ? 0.45 : 0.6) * q, q >= 0.3 ? label : '');
        };
        const E = nExtra();
        if (pulse) {
          // label one in-flight molecule, on its right (its own puff only appears after it lands); avoid the last site so the label stays inside the inset
          const tOf = m => (p - (arrive(m, M) - 0.30)) / 0.30, inFlight = m => tOf(m) >= 0 && tOf(m) < 1, siteOf = m => react[isTMA ? m : Math.floor(m / nl)];
          let lab = -1;   // prefer a molecule still high up (label clear of the ligands) that is not over the last site
          for (let m = 0; m < M && lab < 0; m++) if (inFlight(m) && tOf(m) <= 0.6 && siteOf(m) !== L.N - 1) lab = m;
          for (let m = 0; m < M && lab < 0; m++) if (inFlight(m) && siteOf(m) !== L.N - 1) lab = m;
          for (let m = 0; m < M && lab < 0; m++) if (inFlight(m)) lab = m;
          for (let m = 0; m < M; m++) {
            const ri = isTMA ? m : Math.floor(m / nl), site = react[ri], x = siteX(site), pa = arrive(m, M), ps = pa - 0.30;
            const j = m % nl, xL = isTMA ? x : ligPos(x, j)[0], yL = isTMA ? landTMA : landH2O(j);
            if (p >= ps && p < pa) {
              const t = (p - ps) / 0.30, y = lerp(y0f, yL, t * t), x2 = xL + (1 - t) * 8 * Math.sin(m * 2.1);
              const side = m !== lab ? 0 : (site === L.N - 1 ? -1 : 1);
              if (isTMA) cluster(gi, x2, y, f, 1, side); else water(gi, x2, y, 1, side);
            }
            const yP = isTMA ? topLig - AR - 4 : ligPos(x, j)[1] - AR - 4;
            puffFrom(isTMA ? x + 20 : xL + 6, yP, pa, (ri === 0 || ri === 3) && j === 0 ? f.by : '');
          }
          for (let e = 0; e < E; e++) {
            const site = ORDER[L.N][e], x = siteX(site), ps = 0.44 + 0.02 * e, yB = isTMA ? topLig - AR - 14.5 : landH2O(0) + 2;
            const xL = isTMA ? x : ligPos(x, 0)[0], t1 = (p - ps) / 0.28, t2 = (p - ps - 0.28) / 0.25;
            if (t1 >= 0 && t1 < 1) { if (isTMA) cluster(gi, xL, lerp(y0f, yB, t1 * t1), f, 1, 0); else water(gi, xL, lerp(y0f, yB, t1 * t1), 1, 0); }
            else if (t2 >= 0 && t2 < 1) { const y = lerp(yB, y0f + 4, t2), op = 1 - t2 * t2; if (isTMA) cluster(gi, xL, y, f, op, 0); else water(gi, xL, y, op, 0); }
          }
          if (E > 0 && p >= 0.66 && p < 0.98) gi.append(T(ins.x1 - 8, ins.y0 + 15, (L.full ? `extra ${isTMA ? f.pre : 'H2O'}: ` : '') + `no ${isTMA ? '–OH' : '–' + f.lig} left → bounces` + (L.full ? ' off' : ''), { anchor: 'end', fill: 'var(--accent)', bold: true }));
        }
        // leftovers: excess precursor floating after a pulse (with excess dose the bounced molecules play that role), swept out during the purge
        const left = [[siteX(0) + L.pitch / 2 + 4, gy - 78], [siteX(L.N - 3) + L.pitch / 2 + 4, gy - 72]];
        if (st.dose > 0 && !(pulse && E > 0)) {
          const q = pulse ? clamp((p - 0.8) / 0.2, 0, 1) : 1, prevTMA = s <= 1;
          left.forEach(([x, y], i) => {
            const x2 = pulse ? x : x + p * 1.1 * insW;
            if (x2 > xMax) return;
            if (prevTMA) cluster(gi, x2, y, f, q, i === 0 ? 1 : 0); else water(gi, x2, y, q, i === 0 ? 1 : 0);
          });
        }
        if (!pulse) react.forEach((site, ri) => {
          const x = siteX(site), dx = 28 + p * 1.1 * insW;
          if (s === 1) { if (x + dx <= xMax) puff(gi, x + dx, yEnd, 8, 0.55, ri === 0 ? f.by : ''); }
          else for (let j = 0; j < nl; j++) { const [lx] = ligPos(x, j); if (lx + dx <= xMax) puff(gi, lx + dx, yEnd, 8, 0.55, ri === 0 && j === 0 ? f.by : ''); }
        });
      }

      function stopAnim() { if (raf) cancelAnimationFrame(raf); raf = 0; }
      function playAnim(p0) {
        stopAnim();
        if (reduced) { paint(staticP()); return; }
        if (!visible) { paint(1); return; }
        animStart = 0;
        const frame = ts => {
          if (!animStart) animStart = ts - (p0 || 0) * ANIM_MS;
          const p = Math.min(1, (ts - animStart) / ANIM_MS);
          paint(visible ? p : 1);
          raf = (p < 1 && visible) ? requestAnimationFrame(frame) : 0;
        };
        raf = requestAnimationFrame(frame);
      }
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (!visible) { clearTimeout(timer); stopAnim(); paint(reduced ? staticP() : 1); } else schedule(); });
      io.observe(el);

      // ---------- step-through controls ----------
      const dots = h('div', { class: 'w-step-nav' });
      const phaseRail = h('div', { class: 'w-lab-progress', 'aria-label': 'ALD half-reactions and purges' });
      const phaseButtons = [0, 1, 2, 3].map(i => h('button', { type: 'button', on: { click: () => goto(i) } }, h('span', null, String(i + 1).padStart(2, '0')), h('b')));
      phaseRail.append(...phaseButtons);
      const counter = h('span', { class: 'count' });
      const prevBtn = h('button', { class: 'w-btn', title: 'Previous step' }, 'Prev');
      const nextBtn = h('button', { class: 'w-btn', title: 'Next step' }, 'Next');
      const playBtn = h('button', { class: 'w-btn' + (st.playing ? ' primary' : ''), title: 'Auto-advance through the four steps' }, st.playing ? 'Pause' : 'Play');
      const stepTitle = h('div', { class: 'w-step-title' });
      const stepDesc = h('div', { class: 'w-step-desc' });
      dots.append(counter, prevBtn, nextBtn, playBtn);
      function goto(idx) {
        if (st.step === 3 && idx === 0) st.incs.push(gpcAt(st.dose));
        else if (st.step === 0 && idx === 3) st.incs.pop();
        st.step = idx; renderAll(); playAnim(0);
      }
      prevBtn.addEventListener('click', () => goto((st.step + 3) % 4));
      nextBtn.addEventListener('click', () => goto((st.step + 1) % 4));
      function schedule() { clearTimeout(timer); if (!st.playing || !visible) return; timer = setTimeout(() => { goto((st.step + 1) % 4); schedule(); }, STEP_MS); }
      playBtn.addEventListener('click', () => { st.playing = !st.playing; playBtn.textContent = st.playing ? 'Pause' : 'Play'; playBtn.classList.toggle('primary', st.playing); schedule(); });

      // ---------- process controls ----------
      const filmSel = h('select', null, h('option', { value: 'Al2O3' }, 'Al₂O₃ (TMA + H₂O)'), h('option', { value: 'HfO2' }, 'HfO₂ (TEMAH + H₂O)'));
      const targetIn = h('input', { type: 'number', min: 0.2, max: 50, step: 0.1, value: st.target, style: { width: '70px' } });
      const tLabels = () => [`${F().pre} pulse`, 'Purge 1', 'H₂O pulse', 'Purge 2'];
      const tSliders = st.t.map((v, i) => h('input', { type: 'range', 'aria-label': 'Timing step ' + (i + 1), min: i % 2 ? 0.5 : 0.05, max: i % 2 ? 5 : 1, step: i % 2 ? 0.1 : 0.05, value: v }));
      const tOuts = st.t.map(() => h('output'));
      const tSpans = st.t.map(() => h('span'));
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Film'), filmSel, h('output')),
        h('label', { class: 'w-ctl' }, h('span', null, 'Target thickness (nm)'), targetIn, h('output')));
      const timing = h('div', { class: 'w-controls' }, ...tSliders.map((sl, i) => h('label', { class: 'w-ctl' }, tSpans[i], sl, tOuts[i])));
      const stCycles = h('b'), stThick = h('b'), stReqCycles = h('b'), stCycleT = h('b'), stReqTime = h('b'), stReqTimeLbl = h('span', null, 'time for target');
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, stCycles, h('span', null, 'cycles completed (this demo)')),
        h('div', { class: 'w-stat' }, stThick, h('span', null, 'film thickness so far')),
        h('div', { class: 'w-stat' }, stReqCycles, h('span', null, 'cycles for target')),
        h('div', { class: 'w-stat' }, stCycleT, h('span', null, 'per cycle (sum of 4 steps)')),
        h('div', { class: 'w-stat' }, stReqTime, stReqTimeLbl));
      const formula = h('div', { class: 'w-formula' });
      const legend = h('div', { class: 'w-legend' });

      // ---------- self-limiting dose chart ----------
      const doseSlider = h('input', { type: 'range', 'aria-label': 'Precursor dose', min: 0, max: 2, step: 0.05, value: st.dose });
      const doseOut = h('output');
      const chart = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Growth per cycle versus precursor dose' });
      function paintChart() {
        const cw = chartW, f = F(), gmax = f.gpc, X0 = 44, X1 = cw - 12, Y0 = 128, Y1 = 30, fs = 12;
        chart.setAttribute('viewBox', `0 0 ${cw} 170`);
        chart.innerHTML = '';
        const xOf = d => X0 + d / 2 * (X1 - X0), yOf = g => Y0 - g / 0.125 * (Y0 - Y1);
        [0, 0.05, 0.10].forEach(g => {
          chart.append(svg('line', { x1: X0, y1: yOf(g), x2: X1, y2: yOf(g), stroke: g ? 'var(--line)' : 'var(--line2)' }));
          chart.append(T(X0 - 6, yOf(g) + 4, g.toFixed(2).replace(/^0\.00$/, '0'), { mono: true, anchor: 'end', size: fs }));
        });
        chart.append(svg('line', { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: 'var(--line2)' }));
        [0, 0.5, 1, 1.5, 2].forEach(d => chart.append(T(xOf(d), Y0 + 16, d + '×', { mono: true, anchor: 'middle', size: fs })));
        chart.append(T((X0 + X1) / 2, Y0 + 34, 'precursor dose (× saturation dose)', { anchor: 'middle', size: fs }));
        chart.append(T(X0, 16, cw >= 420 ? 'GPC (nm/cycle)' : 'GPC (nm)', { fill: 'var(--ink)', bold: true, size: fs }));
        chart.append(svg('line', { x1: xOf(1), y1: Y0, x2: xOf(1), y2: Y1, stroke: 'var(--muted)', 'stroke-dasharray': '3 3' }));
        chart.append(T(xOf(1), Y0 - 6, 'saturation', { anchor: 'middle', size: fs }));
        let d = '';
        for (let i = 0; i <= 80; i++) { const x = i / 40; d += (i ? 'L' : 'M') + xOf(x).toFixed(1) + ',' + yOf(gpcAt(x)).toFixed(1) + ' '; }
        chart.append(svg('path', { d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2 }));
        const ty = yOf(gmax), wide = cw >= 420;
        chart.append(T(X1, 16, `GPC = ${gpcAt(st.dose).toFixed(2)} nm at ${st.dose.toFixed(2)}×`, { anchor: 'end', mono: true, fill: 'var(--ink)', bold: true, size: fs }));
        chart.append(T(X1, ty + 20, wide ? `${f.html} (${f.pre} + H2O)` : f.html, { anchor: 'end', fill: 'var(--accent)', bold: true, size: fs }));
        chart.append(T(X1, ty + 34, 'flat = self-limiting', { anchor: 'end', fill: 'var(--ok)', size: fs }));
        chart.append(Cc(xOf(st.dose), yOf(gpcAt(st.dose)), 5, 'var(--accent)'));
      }
      const doseCtl = h('div', { class: 'w-controls' }, h('label', { class: 'w-ctl' }, h('span', null, 'Dose'), doseSlider, doseOut));

      function renderAll() {
        const f = F(), S = steps(f), gpc = f.gpc, n = st.incs.length;
        phaseButtons.forEach((button, i) => { button.setAttribute('aria-label', `Step ${i + 1}: ${S[i].name}`); button.querySelector('b').textContent = S[i].short; button.setAttribute('aria-pressed', String(i === st.step)); });
        counter.textContent = `Step ${st.step + 1} / 4 · cycle ${n + 1}`;
        stepTitle.textContent = `${st.step + 1}. ${S[st.step].name}`;
        stepDesc.textContent = S[st.step].cap;
        const tv = +targetIn.value; if (tv >= 0.2 && tv <= 50) st.target = tv;
        const thickness = st.incs.reduce((a, b) => a + b, 0);
        const cycleT = st.t.reduce((a, b) => a + b, 0), reqCycles = Math.ceil(st.target / gpc - 1e-9), reqSec = reqCycles * cycleT;
        stCycles.textContent = fmt(n, 0);
        stThick.textContent = thickness.toFixed(2) + ' nm';
        stReqCycles.textContent = fmt(reqCycles, 0);
        stCycleT.textContent = cycleT.toFixed(1) + ' s';
        stReqTime.textContent = reqSec < 600 ? fmt(reqSec, 1) + ' s' : fmt(reqSec / 60, 1) + ' min';
        stReqTimeLbl.textContent = `time for ${st.target} nm` + (reqSec >= 60 && reqSec < 600 ? ` (${(reqSec / 60).toFixed(1)} min)` : '');
        tLabels().forEach((s, i) => { tSpans[i].textContent = s; tOuts[i].textContent = st.t[i].toFixed(2) + ' s'; });
        formula.innerHTML = `thickness = N<sub>cycles</sub> × GPC (${gpc.toFixed(2)} nm at saturation) &nbsp;·&nbsp; N = ⌈${st.target} / ${gpc.toFixed(2)}⌉ = ${reqCycles} &nbsp;·&nbsp; time = N × (${st.t.map(v => v.toFixed(2)).join(' + ')} s) = ${fmt(reqSec, 1)} s`;
        legend.innerHTML = '';
        [[COL.pre, `${f.pre} = ${f.formula} (precursor)`, 1], [COL.pre, `${f.lig} ligand${f.lig === 'L' ? ' (' + f.ligHtml + ')' : ''}`, 0], [COL.metal, `${f.metal} atom`, 1], [COL.oh, '–OH site (O + H)', 1], [COL.h2o, 'H₂O', 1], [COL.by, `${f.by} byproduct`, 1], [COL.n2, 'N₂ purge gas', 1]]
          .forEach(([c, t, solid]) => legend.append(h('span', { class: 'w-legend-item' }, h('i', { style: { background: c, opacity: solid ? 1 : 0.45, border: solid ? 'none' : '1.5px solid ' + c } }), t)));
        doseOut.textContent = st.dose.toFixed(2) + '×';
        paintChart();
        paint(lastP);
      }
      filmSel.value = st.film;
      filmSel.addEventListener('change', () => { st.film = filmSel.value; st.incs = []; renderAll(); fitDesc(); });
      targetIn.addEventListener('input', renderAll);
      tSliders.forEach((sl, i) => sl.addEventListener('input', () => { st.t[i] = +sl.value; renderAll(); }));
      doseSlider.addEventListener('input', () => { st.dose = +doseSlider.value; renderAll(); });

      el.classList.add(id);
      el.append(h('style', null, `.${id} .w-step-dot:hover{outline:2px solid var(--accent);outline-offset:2px}`),
        h('div', { class: 'w-lab-kicker' }, 'A surface reaction, one half-cycle at a time'), phaseRail,
        h('div', { class: 'w-studio' }, chamber), h('div', { class: 'w-steps' }, dots, h('div', null, stepTitle, stepDesc)),
        h('div', { class: 'w-console' }, controls, readout),
        h('details', { class: 'w-details' }, h('summary', null, 'Pulse timing, molecular key and target calculation'), timing, legend, formula),
        h('h5', { style: { margin: '16px 0 4px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' } }, 'Self-limitation: growth per cycle vs. precursor dose'),
        doseCtl, chart,
        h('div', { class: 'w-note' }, 'Schematic atoms and film layers. The dose curve illustrates saturation; growth per cycle depends on chemistry and process conditions. Pulse timings and calibrated growth values are explained in the model notes.'),
        h('details', { class: 'w-details' }, h('summary', null, 'Growth calibration, timing example and model notes'),
        h('div', { class: 'w-note' }, 'GPC ≈ 0.10 nm/cycle for Al₂O₃ (TMA + H₂O, 150–300 °C; Module 06 quotes ~0.1 nm, 1.0–1.2 Å) and ≈ 0.08 nm/cycle for HfO₂ (TEMAH + H₂O, 250–300 °C; the module\'s range is 0.05–0.1 nm, ~20–30 cycles for 1.5–2 nm). A cycle is only ~⅓ of a 0.3 nm monolayer because the bulky ligands sterically block neighbouring –OH sites. The default timings are the module\'s worked example (0.3 s pulse + 3 s purge + 0.2 s pulse + 4 s purge = 7.5 s/cycle), so the default 2 nm target reproduces its 20 cycles × 7.5 s = 150 s; the example takes 0.1 nm/cycle, the upper end for TEMAH near 300 °C, while at 0.08 nm the same film needs 25 cycles. Above the saturation dose the curve is flat: extra precursor bounces off the capped surface (drag Dose past 1× and watch the zoomed surface). Changing the film resets the demo counter.' + (reduced ? ' Reduced motion is on: each step shows a mid-step snapshot; Play advances the steps.' : ''))));

      // Keep the step caption box tall enough for the longest caption so the drawing never jumps between steps.
      function fitDesc() {
        const cur = stepDesc.textContent; let mx = 0;
        stepDesc.style.minHeight = '0px';
        steps(F()).forEach(s => { stepDesc.textContent = s.cap; mx = Math.max(mx, stepDesc.offsetHeight); });
        stepDesc.textContent = cur; stepDesc.style.minHeight = mx + 'px';
      }
      // Layout switch (compact drawing with 5 sites below ~470 viewBox units) and chart width, deferred a frame to avoid ResizeObserver loops.
      function onResize() {
        const cwPx = contentW(), W = clamp(Math.round(cwPx / 0.95), 300, 520);
        chartW = Math.round(cwPx);
        if (W !== L.W) L = layout(W);
        fitDesc(); renderAll();
      }
      const ro = new ResizeObserver(() => { cancelAnimationFrame(roRaf); roRaf = requestAnimationFrame(onResize); });
      ro.observe(el);
      ctx.onTheme(() => paint(lastP));
      fitDesc(); renderAll();
      playAnim(0.25);   // first frame: mid-pulse, molecules already in flight (reduced motion: static mid-step snapshot)
      schedule();
      return () => { stopAnim(); clearTimeout(timer); cancelAnimationFrame(roRaf); io.disconnect(); ro.disconnect(); };
    }
  });
})();
