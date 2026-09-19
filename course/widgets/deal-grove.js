/* Widget: deal-grove — "Deal–Grove Oxidation Calculator" (Module 06) */
(function () {
  'use strict';
  const KB = 8.617333262e-5; // eV/K
  const X0_DRY = 0.025;      // µm, empirical initial-oxide offset used to derive tau for dry O2
  const LOG_MAX = Math.log10(600); // time slider / log axis: 1 min .. 600 min (10 h)
  const SANS = 'var(--sans)', MONO = 'var(--mono)';

  // Rate-constant prefactors are the textbook Arrhenius fits for (111) silicon;
  // (100) divides the linear constant B/A by 1.68 (Module 06, sec. 1.2–1.3).
  function B_of(ambient, TK) {
    return ambient === 'dry' ? 772 * Math.exp(-1.23 / (KB * TK)) : 386 * Math.exp(-0.78 / (KB * TK));
  }
  function BA111_of(ambient, TK) {
    return ambient === 'dry' ? 6.23e6 * Math.exp(-2.0 / (KB * TK)) : 1.63e8 * Math.exp(-2.05 / (KB * TK));
  }
  function params(ambient, Tc, orient) {
    const TK = Tc + 273.15;
    const B = B_of(ambient, TK);
    const BA111 = BA111_of(ambient, TK);
    const BA = orient === '111' ? BA111 : BA111 / 1.68;
    const A = B / BA;
    const tau = ambient === 'dry' ? (X0_DRY * X0_DRY + A * X0_DRY) / B : 0;
    return { B, BA, A, tau };
  }
  function xOfT(t, p) { // t in hours -> thickness in µm
    return (p.A / 2) * (Math.sqrt(1 + 4 * p.B * (t + p.tau) / (p.A * p.A)) - 1);
  }
  function fmtTime(h) {
    if (h < 1 / 60) return (h * 3600).toFixed(0) + ' s';
    if (h < 1) return (h * 60).toFixed(1) + ' min';
    if (h < 10) return h.toFixed(2) + ' h';
    return h.toFixed(1) + ' h';
  }
  function groupInt(s) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function fmtFixed(n, d) { // fixed decimals + thin-space thousands grouping
    if (!isFinite(n)) return '–';
    const parts = Math.abs(n).toFixed(d).split('.');
    return (n < 0 ? '−' : '') + groupInt(parts[0]) + (parts[1] ? '.' + parts[1] : '');
  }
  function fmtSig(n, s) { const parts = n.toPrecision(s).split('.'); return groupInt(parts[0]) + (parts[1] ? '.' + parts[1] : ''); }
  function fmtThick(nm) { // same rule for every thickness readout
    if (!isFinite(nm)) return '–';
    if (nm >= 1000) return fmtFixed(nm / 1000, 2) + ' µm';
    if (nm >= 10) return fmtFixed(nm, 1) + ' nm';
    return fmtFixed(nm, 2) + ' nm';
  }
  function fmtShort(nm) { // compact form for the drawing's dimension labels
    if (nm >= 1000) return fmtFixed(nm / 1000, 2) + ' µm';
    if (nm >= 10) return fmtFixed(nm, 0) + ' nm';
    return fmtFixed(nm, 1) + ' nm';
  }
  function niceScale(target) { // 1-2-5 steps, 4..7 intervals
    const raw = target / 5, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const m of [1, 2, 5, 10]) { const step = m * mag, n = Math.ceil(target / step); if (n <= 7) return { step, max: n * step, n }; }
    return { step: mag * 10, max: mag * 50, n: 5 };
  }
  function estW(s, size, mono) { return s.length * size * (mono ? 0.62 : 0.58); }
  function hit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function ptsHit(pts, r, pad) { return pts.some(q => q.x >= r.x - pad && q.x <= r.x + r.w + pad && q.y >= r.y - pad && q.y <= r.y + r.h + pad); }

  window.registerWidget('deal-grove', {
    title: 'Deal–Grove Oxidation Calculator',
    caption: 'Set ambient, temperature and time. Watch the SiO₂ layer grow in the wafer cross-section (and eat into the silicon), and see where the thickness-vs-time curve bends from reaction-limited (linear) to diffusion-limited (parabolic).',
    mount(el, ctx) {
      const { h, svg } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const st = { ambient: 'dry', Tc: 1000, orient: '100', logMin: Math.log10(60), axis: 'linear' };

      // ---- controls ----
      const ambientSel = h('select', null, h('option', { value: 'dry' }, 'Dry O₂'), h('option', { value: 'wet' }, 'Wet H₂O (steam)'));
      const tSlider = h('input', { type: 'range', min: 800, max: 1200, step: 10, value: st.Tc });
      const tOut = h('output');
      const timeSlider = h('input', { type: 'range', min: 0, max: LOG_MAX, step: 0.01, value: st.logMin });
      const timeOut = h('output');
      const orientSel = h('select', null, h('option', { value: '100' }, '(100)'), h('option', { value: '111' }, '(111)'));
      const axisSel = h('select', null, h('option', { value: 'linear' }, 'linear, 0–10 h'), h('option', { value: 'log' }, 'log, 1 min–10 h'));
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Ambient'), ambientSel, h('output')),
        h('label', { class: 'w-ctl' }, h('span', null, 'Temperature'), tSlider, tOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Time'), timeSlider, timeOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Orientation'), orientSel, h('output')),
        h('label', { class: 'w-ctl' }, h('span', null, 'Time axis'), axisSel, h('output')));

      // ---- readouts ----
      const stThick = h('b'), stSi = h('b'), stRegime = h('b'), stA = h('b'), stB = h('b'), stBA = h('b'), stTau = h('b');
      const stat = (b, label) => h('div', { class: 'w-stat', style: { flex: '1 1 124px' } }, b, h('span', null, label));
      const readout = h('div', { class: 'w-readout' },
        stat(stThick, 'oxide thickness x'), stat(stSi, 'silicon consumed (0.44 x)'), stat(stRegime, 'growth regime'),
        stat(stA, 'A (crossover thickness)'), stat(stB, 'B (parabolic rate)'), stat(stBA, 'B/A (linear rate)'), stat(stTau, 'τ (time offset)'));
      const stateLine = h('div', { class: 'w-note', style: { color: 'var(--ink)', marginTop: '2px' } });
      const warnLine = h('div', { class: 'w-note', style: { color: 'var(--warn)', marginTop: '4px' } });
      const formula = h('div', { class: 'w-formula', html: 'x² + A·x = B (t + τ)  →  x(t) = (A/2)·[√(1 + 4B(t+τ)/A²) − 1]   ·   thin (x ≪ A): x ≈ (B/A)(t+τ)   ·   thick (x ≫ A): x² ≈ B·t' });
      const gfx = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Wafer cross-section with the oxide layer drawn to scale, and oxide thickness versus time' });
      const note = h('div', { class: 'w-note' }, 'τ (tau) is the time the model pretends it took to grow the oxide already present at t = 0. For dry O₂ it is derived here from the ~25 nm that forms anomalously fast, so even a 1-minute dry run reports ~25 nm; for wet oxidation τ ≈ 0. Rate constants are the textbook Arrhenius fits for (111) silicon, with B/A ÷ 1.68 for (100). Wet H₂O is 20–25× faster in the parabolic regime because water is ~600× more soluble in SiO₂ than O₂, so it is used for thick field/isolation oxides. Silicon consumed = 0.44 × oxide thickness because amorphous SiO₂ packs fewer Si atoms per volume than the crystal, which is why the oxide sits partly below the original wafer surface.');
      el.append(controls, readout, stateLine, warnLine, formula, gfx, note);

      // ---- drawing helpers ----
      function txt(parent, x, y, s, o) {
        o = o || {};
        const t = svg('text', { x, y, 'font-family': o.mono ? MONO : SANS, 'font-size': o.size || 12, fill: o.fill || 'var(--ink)', 'text-anchor': o.anchor || 'start', 'font-weight': o.weight || null, opacity: o.opacity || null,
          'paint-order': o.halo ? 'stroke' : null, stroke: o.halo ? 'var(--panel)' : null, 'stroke-width': o.halo ? 3 : null, 'stroke-linejoin': o.halo ? 'round' : null, 'stroke-opacity': o.halo ? 0.9 : null }, s);
        parent.append(t); return t;
      }
      function block(parent, x, c, lines, anchor, o) { // n lines of 12 px text vertically centred on c
        lines.forEach((s, i) => txt(parent, x, c + (i - (lines.length - 1) / 2) * 13 + 4, s, Object.assign({ anchor, mono: /\d/.test(s) && i > 0 }, o || {})));
      }
      function arrow(parent, x, y1, y2, color, w) { // vertical, pointing down, tip at y2
        parent.append(svg('line', { x1: x, y1, x2: x, y2: y2 - 7, stroke: color, 'stroke-width': w }));
        parent.append(svg('polygon', { points: `${x - 4.5},${y2 - 8} ${x + 4.5},${y2 - 8} ${x},${y2}`, fill: color }));
      }
      function star(parent, cx, cy, r, color) {
        let pts = '';
        for (let i = 0; i < 16; i++) { const a = Math.PI * i / 8, rr = i % 2 ? r * 0.42 : r; pts += (cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1) + ' '; }
        parent.append(svg('polygon', { points: pts, fill: color }));
      }
      function labelBox(parent, r, s, o) { // panel-filled label so it stays readable over lines
        parent.append(svg('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 3, fill: 'var(--panel)', stroke: o.stroke || 'var(--line)' }));
        txt(parent, r.x + r.w / 2, r.y + r.h - 6, s, { anchor: 'middle', mono: o.mono, fill: o.fill, weight: o.weight });
      }

      // ---- state shared between build() and the animation / hover handlers ----
      let W = 0;                 // viewBox width == rendered CSS px, so 12-unit text renders at 12 px
      let molEls = [], molGeom = { y0: 0, y1: 0 };
      const mols = [0.06, 0.13, 0.9, 0.96].map((fx, i) => ({ fx, ph: (i * 0.27 + 0.12) % 1 }));
      const molY = m => molGeom.y0 + m.ph * (molGeom.y1 - molGeom.y0);
      const molOp = m => m.ph > 0.82 ? Math.max(0, (1 - m.ph) / 0.18) * 0.9 : 0.9;
      let chart = null, hoverG = null, hoverLineG = null;

      // ---- left panel: wafer cross-section, oxide drawn to the chart's vertical scale ----
      function drawXS(g, P, p, xNm, yMax, regime) {
        const LC = 66, RC = 84;
        const wx0 = P.x + LC, wx1 = P.x + P.w - RC, ww = wx1 - wx0;
        const gasTop = P.y + 24, yI = P.y + P.h - 120, ySi = P.y + P.h - 38;
        const maxH = yI - gasTop - 46;
        const hOx = Math.max(6, Math.min(maxH, xNm / yMax * maxH));
        const yTop = yI - hOx, yOrig = yI - 0.44 * hOx;
        const xb = wx0 - 9, xr = wx1 + 8;
        txt(g, P.x + 2, P.y + 13, 'Wafer cross-section (oxide to scale)', { fill: 'var(--muted)' });
        // gas ambient, wafer frame, silicon, oxide
        g.append(svg('rect', { x: wx0, y: gasTop, width: ww, height: yTop - gasTop, fill: 'var(--accent2)', opacity: 0.06 }));
        g.append(svg('rect', { x: wx0, y: gasTop, width: ww, height: ySi - gasTop, fill: 'none', stroke: 'var(--line)' }));
        txt(g, wx0 + 6, gasTop + 14, st.ambient === 'dry' ? 'O₂ gas' : 'H₂O steam', { fill: 'var(--accent2)', weight: 600 });
        g.append(svg('rect', { x: wx0, y: yI, width: ww, height: ySi - yI, fill: 'var(--si)', opacity: 0.25 }));
        txt(g, wx0 + 6, ySi - 8, 'Si (' + st.orient + ') wafer', { weight: 600 });
        g.append(svg('rect', { x: wx0, y: yTop, width: ww, height: hOx, fill: 'var(--accent-soft)', stroke: 'var(--accent)', 'stroke-width': 1.2 }));
        if (hOx >= 30) txt(g, wx0 + 6, yTop + 14, 'SiO₂', { weight: 600 });
        // original surface (dashed, inside the oxide) and the reacting interface
        g.append(svg('line', { x1: xb, y1: yOrig, x2: wx1 + 5, y2: yOrig, stroke: 'var(--ink)', 'stroke-dasharray': '5 3', opacity: 0.75 }));
        g.append(svg('line', { x1: wx0, y1: yI, x2: wx1 + 5, y2: yI, stroke: 'var(--ink)', 'stroke-width': 1.5 }));
        // oxidant molecules drifting down through the gas to the surface
        molGeom = { y0: gasTop + 22, y1: yTop - 4 };
        molEls = mols.map(m => { const c = svg('circle', { cx: (wx0 + ww * m.fx).toFixed(1), cy: molY(m).toFixed(1), r: 3.2, fill: 'var(--accent2)', opacity: molOp(m).toFixed(2) }); g.append(c); return c; });
        // the three fluxes in series; the rate-limiting one is highlighted
        const xF = wx0 + ww * 0.8;
        const lim = regime === 'linear' ? ['F3'] : regime === 'parabolic' ? ['F2'] : ['F2', 'F3'];
        const on = f => lim.includes(f);
        const col = f => on(f) ? 'var(--accent)' : 'var(--muted)';
        const sw = f => on(f) ? (lim.length === 2 ? 2 : 2.6) : 1.4;
        const wt = f => on(f) ? 700 : 400;
        const thin = hOx < 41;
        const f1a = thin ? yTop - 64 : yTop - 36, f1b = thin ? yTop - 30 : yTop - 2;
        arrow(g, xF, f1a, f1b, col('F1'), sw('F1'));
        txt(g, xF - 8, (f1a + f1b) / 2 + 4, 'F1 transport', { anchor: 'end', fill: col('F1'), weight: wt('F1') });
        arrow(g, xF, thin ? yTop - 26 : yTop + 3, yI - 3, col('F2'), sw('F2'));
        txt(g, xF - 8, thin ? yTop - 12 : yI - 7, 'F2 diffusion', { anchor: 'end', fill: col('F2'), weight: wt('F2') });
        star(g, xF, yI, 8, col('F3'));
        txt(g, xF - 11, yI + 17, 'F3 reaction', { anchor: 'end', fill: col('F3'), weight: wt('F3') });
        // dimension brackets: 0.56 x above the old surface, 0.44 x of silicon consumed
        g.append(svg('line', { x1: xb, y1: yTop, x2: xb, y2: yI, stroke: 'var(--muted)' }));
        [yTop, yOrig, yI].forEach(y => g.append(svg('line', { x1: xb - 4, y1: y, x2: xb + 4, y2: y, stroke: 'var(--muted)' })));
        const c1 = Math.min((yTop + yOrig) / 2, yOrig - 20), c2 = Math.max((yOrig + yI) / 2, yOrig + 25);
        block(g, xb - 7, c1, ['0.56x', 'above', fmtShort(0.56 * xNm)], 'end', { fill: 'var(--muted)' });
        block(g, xb - 7, c2, ['0.44x', 'Si used', fmtShort(0.44 * xNm)], 'end', { fill: 'var(--muted)' });
        // call-outs on the right (pushed apart when the oxide is thin, with leader lines)
        const items = [
          { lines: ['SiO₂ layer', fmtThick(xNm)], at: yTop, c: yTop - 3, n: 2 },
          { lines: ['original', 'Si surface'], at: yOrig, c: yOrig, n: 2 },
          { lines: ['Si/SiO₂', 'interface', '(reaction)'], at: yI, c: yI + 12, n: 3 }];
        const top = it => it.c - (it.n - 1) / 2 * 13 - 9, bot = it => it.c + (it.n - 1) / 2 * 13 + 4;
        items[1].c = Math.min(items[1].c, top(items[2]) - 4 - (bot(items[1]) - items[1].c));
        items[0].c = Math.min(items[0].c, top(items[1]) - 4 - (bot(items[0]) - items[0].c));
        items.forEach((it, i) => {
          if (Math.abs(it.c - it.at) > 4 && i < 2) g.append(svg('line', { x1: wx1 + 5, y1: it.at, x2: xr - 3, y2: it.c, stroke: 'var(--muted)' }));
          block(g, xr, it.c, it.lines, 'start', { fill: i === 0 ? 'var(--ink)' : 'var(--muted)' });
        });
        // scale bar
        let bar = 10; [10, 20, 50, 100, 200, 500, 1000, 2000, 5000].forEach(c => { if (c / yMax * maxH <= 90) bar = c; });
        const len = bar / yMax * maxH, yb = ySi + 18;
        g.append(svg('line', { x1: P.x + 4, y1: yb, x2: P.x + 4 + len, y2: yb, stroke: 'var(--ink)', 'stroke-width': 1.5 }));
        [P.x + 4, P.x + 4 + len].forEach(x => g.append(svg('line', { x1: x, y1: yb - 4, x2: x, y2: yb + 4, stroke: 'var(--ink)' })));
        txt(g, P.x + 4 + len + 7, yb + 4, (bar >= 1000 ? bar / 1000 + ' µm' : bar + ' nm') + ' (oxide scale)', { fill: 'var(--muted)' });
      }

      // ---- right panel: thickness versus time ----
      function drawChart(g, C, p, tCur, xCur, sc, narrow) {
        const L = C.x + 54, R = C.x + C.w - 20, T = C.y + 26, Bt = C.y + C.h - 40;
        const logAxis = st.axis === 'log', tmin = logAxis ? 1 / 60 : 0, yMax = sc.max, um = yMax >= 1000;
        const px = t => logAxis ? L + Math.log10(Math.max(t, 1 / 60) * 60) / LOG_MAX * (R - L) : L + t / 10 * (R - L);
        const tOf = X => { const f = Math.max(0, Math.min(1, (X - L) / (R - L))); return logAxis ? Math.pow(10, f * LOG_MAX) / 60 : f * 10; };
        const py = nm => Bt - Math.min(nm, yMax) / yMax * (Bt - T);
        const nmAt = y => (Bt - y) / (Bt - T) * yMax;
        const LAB = T + 44; // the top 44 px of the plot are reserved for the regime / crossover labels
        const placed = [], gl = svg('g'); // labels drawn above the curves
        txt(g, C.x, C.y + 13, 'oxide thickness (' + (um ? 'µm' : 'nm') + ')', { fill: 'var(--muted)' });
        // regime bands, split where x = A
        const tA = 2 * p.A * p.A / p.B - p.tau;
        const xA = px(Math.max(tmin, Math.min(10, tA)));
        function band(x0, x1, color, full, short) {
          if (x1 - x0 < 1) return;
          g.append(svg('rect', { x: x0, y: T, width: x1 - x0, height: Bt - T, fill: color, opacity: 0.14 }));
          g.append(svg('rect', { x: x0, y: T, width: x1 - x0, height: 4, fill: color, opacity: 0.75 }));
          const wF = estW(full, 12), wS = estW(short, 12);
          const label = x1 - x0 >= wF + 12 ? full : x1 - x0 >= wS + 12 ? short : null;
          if (label) { const w = label === full ? wF : wS; txt(gl, (x0 + x1) / 2, T + 18, label, { anchor: 'middle', fill: color, weight: 600, halo: true }); placed.push({ x: (x0 + x1) / 2 - w / 2, y: T + 7, w, h: 14 }); }
        }
        if (tA > tmin) band(L, Math.min(xA, R), 'var(--si)', 'linear regime (x < A)', 'linear');
        if (tA < 10) band(Math.max(xA, L), R, 'var(--accent)', 'parabolic regime (x > A)', 'parabolic');
        const cross = tA > tmin && tA < 10 && xA > L + 3 && xA < R - 3;
        if (cross) g.append(svg('line', { x1: xA, y1: T, x2: xA, y2: Bt, stroke: 'var(--muted)', 'stroke-dasharray': '4 3' }));
        // axes, gridlines, ticks
        const dec = um ? (sc.step % 1000 === 0 ? 0 : sc.step % 100 === 0 ? 1 : 2) : 0;
        for (let i = 0; i <= sc.n; i++) {
          const v = i * sc.step, y = py(v);
          if (i > 0) g.append(svg('line', { x1: L, y1: y, x2: R, y2: y, stroke: 'var(--line)', 'stroke-dasharray': '2 3' }));
          g.append(svg('line', { x1: L - 5, y1: y, x2: L, y2: y, stroke: 'var(--line2)' }));
          txt(g, L - 8, y + 4, fmtFixed(um ? v / 1000 : v, dec), { anchor: 'end', mono: true, fill: 'var(--muted)' });
        }
        g.append(svg('line', { x1: L, y1: Bt, x2: R, y2: Bt, stroke: 'var(--line2)' }));
        g.append(svg('line', { x1: L, y1: Bt, x2: L, y2: T, stroke: 'var(--line2)' }));
        const xt = logAxis ? [[1 / 60, '1 min'], [10 / 60, '10 min'], [1, '1 h'], [10, '10 h']] : (narrow ? [0, 5, 10] : [0, 2, 4, 6, 8, 10]).map(t => [t, String(t)]);
        xt.forEach(([t, lbl]) => {
          const x = px(t);
          g.append(svg('line', { x1: x, y1: Bt, x2: x, y2: Bt + 5, stroke: 'var(--line2)' }));
          txt(g, x, Bt + 18, lbl, { anchor: 'middle', mono: true, fill: 'var(--muted)' });
        });
        txt(g, (L + R) / 2, Bt + 34, logAxis ? 'time (log scale)' : 'time (h)', { anchor: 'middle', fill: 'var(--muted)' });
        // the pure linear law, so the curve can be seen peeling away from it (stops below the label band)
        const BAnm = p.BA * 1000, tExit = Math.min(10, nmAt(LAB) / BAnm - p.tau), refPts = [];
        if (tExit > tmin + 0.02) {
          let d = '';
          for (let i = 0; i <= 60; i++) {
            const t = logAxis ? Math.pow(10, Math.log10(tmin * 60) + (Math.log10(tExit * 60) - Math.log10(tmin * 60)) * i / 60) / 60 : tmin + (tExit - tmin) * i / 60;
            const X = px(t), Y = py(BAnm * (t + p.tau)); refPts.push({ x: X, y: Y }); d += (i ? 'L' : 'M') + X.toFixed(1) + ',' + Y.toFixed(1) + ' ';
          }
          g.append(svg('path', { d, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.2, 'stroke-dasharray': '2 3' }));
        }
        // Deal–Grove curve
        const N = 140, pts = []; let d = '';
        for (let i = 0; i <= N; i++) {
          const t = logAxis ? Math.pow(10, LOG_MAX * i / N) / 60 : 10 * i / N;
          const X = px(t), Y = py(xOfT(t, p) * 1000); pts.push({ x: X, y: Y }); d += (i ? 'L' : 'M') + X.toFixed(1) + ',' + Y.toFixed(1) + ' ';
        }
        g.append(svg('path', { d, fill: 'none', stroke: 'var(--si)', 'stroke-width': 2.4 }), gl);
        const inPlot = r => r.x >= L + 2 && r.x + r.w <= R - 2 && r.y >= T + 2 && r.y + r.h <= Bt - 2;
        const free = r => inPlot(r) && !placed.some(o => hit(r, o)) && !ptsHit(pts, r, 3);
        // crossover label: beside the x = A line, on whichever side (and height) is clear of the curve
        if (cross) {
          const s = 'x = A (crossover)', w = estW(s, 12), rt = xA + 6 + w <= R;
          const opts = [];
          for (const y of [T + 23, Bt - 20]) for (const right of rt ? [true, false] : [false, true]) opts.push({ x: right ? xA + 6 : xA - 6 - w, y, w, h: 14, right });
          const r = opts.find(free) || opts.find(o => inPlot(o) && !placed.some(q => hit(o, q))) || opts[0];
          txt(gl, r.right ? xA + 6 : xA - 6, r.y + 11, s, { anchor: r.right ? 'start' : 'end', fill: 'var(--muted)', halo: true });
          placed.push(r);
        }
        // hover cursor line sits under the labels; its read-out goes on top of everything
        hoverLineG = svg('g', { 'pointer-events': 'none' }); g.append(hoverLineG);
        // current setting
        const cx = px(Math.max(tCur, tmin)), cy = py(xCur);
        g.append(svg('line', { x1: cx, y1: cy, x2: cx, y2: Bt, stroke: 'var(--accent)', 'stroke-dasharray': '2 2' }));
        g.append(svg('line', { x1: L, y1: cy, x2: cx, y2: cy, stroke: 'var(--accent)', 'stroke-dasharray': '2 2' }));
        g.append(svg('circle', { cx, cy, r: 5.5, fill: 'var(--accent)', stroke: 'var(--panel)', 'stroke-width': 2 }));
        const s = fmtThick(xCur) + ' @ ' + fmtTime(tCur), w = estW(s, 12, true) + 10, hh = 20;
        // candidate boxes around the point, nearest first; prefer spots clear of the curve and the x = A line
        const cands = [], near = [];
        for (const dd of [10, 22, 36, 52, 70]) for (const [sx, sy] of [[-1, -1], [1, 1], [-1, 0], [1, 0], [1, -1], [-1, 1], [0, -1], [0, 1]]) {
          const r = { x: cx + (sx < 0 ? -dd - w : sx > 0 ? dd : -w / 2), y: cy + (sy < 0 ? -dd - hh : sy > 0 ? dd : -hh / 2 - dd / 2), w, h: hh };
          cands.push(r); if (dd <= 36) near.push(r);
        }
        const clearOfA = r => !cross || r.x > xA + 2 || r.x + r.w < xA - 2;
        const noLabels = r => inPlot(r) && !placed.some(o => hit(r, o));
        const box = near.find(r => free(r) && clearOfA(r)) || near.find(free) || cands.find(r => free(r) && clearOfA(r)) || cands.find(free) || near.find(noLabels) || cands.find(inPlot) || cands[0];
        // leader from the point to the box when the label had to move away from it
        const nx = Math.max(box.x, Math.min(box.x + box.w, cx)), ny = Math.max(box.y, Math.min(box.y + box.h, cy));
        if (Math.hypot(nx - cx, ny - cy) > 16) g.append(svg('line', { x1: cx, y1: cy, x2: nx, y2: ny, stroke: 'var(--accent)', 'stroke-width': 1 }));
        labelBox(g, box, s, { mono: true, fill: 'var(--accent)', weight: 700, stroke: 'var(--accent)' });
        placed.push(box);
        if (refPts.length) {
          let r2 = null, s2 = '';
          for (const text of ['linear law (B/A)(t+τ)', 'linear law']) {
            const w2 = estW(text, 12) + 8;
            for (const f of [0.55, 0.4, 0.7, 0.3, 0.85, 0.15]) {
              const q = refPts[Math.round(f * (refPts.length - 1))];
              r2 = [{ x: q.x - w2 - 5, y: q.y - 22, w: w2, h: 19 }, { x: q.x + 6, y: q.y + 4, w: w2, h: 19 }].find(r => free(r) && !ptsHit(refPts, r, 3));
              if (r2) { s2 = text; break; }
            }
            if (r2) break;
          }
          if (r2) { labelBox(g, r2, s2, { fill: 'var(--muted)' }); placed.push(r2); }
        }
        // hover capture + overlay
        g.append(svg('rect', { class: 'dg-plot', x: L, y: T, width: R - L, height: Bt - T, fill: 'var(--panel)', opacity: 0, 'pointer-events': 'all', style: 'cursor: crosshair' }));
        hoverG = svg('g', { 'pointer-events': 'none' }); g.append(hoverG);
        chart = { L, R, T, Bt, LAB, px, py, tOf, p };
      }

      function clearHover() { if (hoverG) hoverG.innerHTML = ''; if (hoverLineG) hoverLineG.innerHTML = ''; }
      function onMove(e) {
        if (!chart || !hoverG || !hoverLineG) return;
        const r = gfx.getBoundingClientRect(); if (!r.width) return;
        const k = W / r.width, ux = (e.clientX - r.left) * k, uy = (e.clientY - r.top) * k, c = chart;
        clearHover();
        if (ux < c.L || ux > c.R || uy < c.T || uy > c.Bt) return;
        const t = c.tOf(ux), nm = xOfT(t, c.p) * 1000, X = c.px(t), Y = c.py(nm);
        hoverLineG.append(svg('line', { x1: X, y1: c.LAB, x2: X, y2: c.Bt, stroke: 'var(--accent2)', 'stroke-dasharray': '3 3' }));
        hoverG.append(svg('circle', { cx: X, cy: Y, r: 4, fill: 'var(--accent2)' }));
        const s = fmtTime(t) + ' → ' + fmtThick(nm), w = estW(s, 12, true) + 10;
        labelBox(hoverG, { x: X + 10 + w <= c.R ? X + 10 : X - 10 - w, y: Math.max(c.LAB, Math.min(c.Bt - 26, Y - 30)), w, h: 20 }, s, { mono: true, fill: 'var(--accent2)', stroke: 'var(--accent2)' });
      }
      gfx.addEventListener('pointermove', onMove);
      gfx.addEventListener('pointerleave', clearHover);

      // ---- build everything for the current state and width ----
      function build() {
        gfx.innerHTML = ''; hoverG = null; hoverLineG = null;
        const narrow = W < 540;
        let P, C, H;
        if (narrow) { P = { x: 0, y: 0, w: W, h: 280 }; C = { x: 0, y: 296, w: W, h: 310 }; H = 606; }
        else { const pw = Math.max(260, Math.min(300, Math.round(W * 0.42))); P = { x: 0, y: 0, w: pw, h: 330 }; C = { x: pw + 16, y: 0, w: W - pw - 16, h: 330 }; H = 330; }
        gfx.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const p = params(st.ambient, st.Tc, st.orient);
        const tCur = Math.pow(10, st.logMin) / 60; // hours
        const xCur = xOfT(tCur, p) * 1000;         // nm
        const Anm = p.A * 1000;
        const sc = niceScale(Math.max(1.15 * xOfT(10, p) * 1000, 5));
        const regime = xCur < 0.3 * Anm ? 'linear' : xCur > 3 * Anm ? 'parabolic' : 'mixed';
        const gx = svg('g'), gc = svg('g');
        gfx.append(gx, gc);
        drawXS(gx, P, p, xCur, sc.max, regime);
        drawChart(gc, C, p, tCur, xCur, sc, narrow);

        stThick.textContent = fmtThick(xCur);
        stSi.textContent = fmtThick(0.44 * xCur);
        stRegime.textContent = regime;
        stA.textContent = fmtThick(Anm);
        stB.textContent = fmtSig(p.B, 3) + ' µm²/h';
        stBA.textContent = p.BA >= 0.01 ? fmtSig(p.BA, 3) + ' µm/h' : fmtSig(p.BA * 1000, 3) + ' nm/h';
        stTau.textContent = p.tau > 0 ? fmtTime(p.tau) : '0 (wet)';
        if (regime === 'linear') stateLine.textContent = `Reaction-limited (linear regime): the oxide is thin (x = ${fmtThick(xCur)}, below 0.3 A), so oxidant reaches the Si/SiO₂ interface faster than the silicon can react. The interface reaction F3 sets the rate and x ≈ (B/A)(t + τ); gas supply F1 is never the bottleneck at 1 atm.`;
        else if (regime === 'parabolic') stateLine.textContent = `Diffusion-limited (parabolic regime): every oxidant molecule must diffuse through ${fmtThick(xCur)} of oxide (more than 3 A) before it can react, so diffusion F2 sets the rate and growth keeps slowing as x² ≈ B·t.`;
        else stateLine.textContent = `Mixed regime near the crossover (x ≈ A = ${fmtThick(Anm)}): diffusion through the oxide (F2) and the interface reaction (F3) take comparable shares of the total resistance, so both the A·x and x² terms matter.`;
        warnLine.textContent = xCur < 30 ? `Below ~30 nm the Deal–Grove law is unreliable (real thin dry oxides grow faster; τ is only an empirical patch). Production gate oxides this thin are grown by RTP/ISSG or plasma oxidation and calibrated empirically.` : '';
        warnLine.hidden = xCur >= 30;
      }

      function update() {
        st.ambient = ambientSel.value; st.Tc = +tSlider.value; st.orient = orientSel.value; st.axis = axisSel.value;
        tOut.textContent = st.Tc + ' °C';
        timeOut.textContent = fmtTime(Math.pow(10, st.logMin) / 60);
        build();
      }
      ambientSel.value = st.ambient; orientSel.value = st.orient; axisSel.value = st.axis;
      ambientSel.addEventListener('change', update);
      orientSel.addEventListener('change', update);
      axisSel.addEventListener('change', update);
      tSlider.addEventListener('input', update);
      timeSlider.addEventListener('input', () => { st.logMin = +timeSlider.value; update(); });

      // ---- ambient animation (gas molecules), paused under reduced motion / off-screen ----
      let raf = 0, running = false, visible = true, lastTs = 0;
      const PERIOD = 4200;
      function frame(ts) {
        raf = 0; if (!running) return;
        const dt = lastTs ? Math.min(100, ts - lastTs) : 16; lastTs = ts;
        mols.forEach((m, i) => {
          m.ph = (m.ph + dt / PERIOD * (1 + i * 0.07)) % 1;
          const c = molEls[i]; if (c) { c.setAttribute('cy', molY(m).toFixed(1)); c.setAttribute('opacity', molOp(m).toFixed(2)); }
        });
        raf = requestAnimationFrame(frame);
      }
      function startAnim() { if (reduced || running || !visible) return; running = true; lastTs = 0; raf = requestAnimationFrame(frame); }
      function stopAnim() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) startAnim(); else stopAnim(); });
      io.observe(el);
      const ro = new ResizeObserver(es => {
        const w = Math.round(es[0].contentRect.width);
        if (w > 0 && Math.abs(w - W) > 2) { W = w; requestAnimationFrame(() => { if (W === w) build(); }); }
      });
      ro.observe(el);

      W = Math.round(gfx.getBoundingClientRect().width) || 720;
      update();
      startAnim();
      return () => { stopAnim(); io.disconnect(); ro.disconnect(); gfx.removeEventListener('pointermove', onMove); gfx.removeEventListener('pointerleave', clearHover); };
    }
  });
})();
