/* Widget: yield-calculator — "Dies per Wafer and Yield" (Module 13) */
(function () {
  'use strict';
  const WAFER_D = 300, R = WAFER_D / 2;            // mm
  const WAFER_CM2 = Math.PI * (R / 10) ** 2;        // 706.9 cm²
  const RETICLE = { w: 26, h: 33 };                 // mm, largest field one exposure can print
  const PRESETS = [
    { name: 'H100 (814 mm²)', w: 26, h: 31.3 },
    { name: 'B200 die (~800 mm²)', w: 26, h: 30.8 },
    { name: 'Apple A17 (~104 mm²)', w: 10.2, h: 10.2 },
    { name: '50 mm² chiplet', w: 7.1, h: 7.1 },
  ];
  const MODELS = {
    poisson: { name: 'Poisson', fn: (A, D0) => Math.exp(-A * D0),
      note: 'Poisson: killer defects land independently and evenly at D0 per cm², so yield is the chance a die collects none, e^(−A·D0). Pessimistic for big dies, because real defects arrive in showers.' },
    murphy: { name: 'Murphy', fn: (A, D0) => { const x = A * D0; return x === 0 ? 1 : Math.pow((1 - Math.exp(-x)) / x, 2); },
      note: 'Murphy (Bell Labs, 1964): the local defect density varies from patch to patch with a triangular spread around D0, so some patches are cleaner than average and more large dies survive than Poisson predicts.' },
    negbin: { name: 'Negative binomial', fn: (A, D0, a) => Math.pow(1 + A * D0 / a, -a),
      note: 'Negative binomial (Stapper, IBM): the local density follows a gamma spread whose width is set by the clustering parameter α. α ≈ 1–3 is typical of modern fabs; α → ∞ recovers Poisson; smaller α = showerier defects = more clean big dies.' },
  };
  const COLORS = { poisson: 'accent', murphy: 'accent2', negbin: 'si' };
  const CELLS = 14, POOL = 4000;
  let mountCount = 0;

  // ---------- seeded randomness: the defect field only changes when the user re-rolls ----------
  function mulberry32(a) {
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function invNorm(p) { // Acklam's rational approximation of the normal quantile
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    p = Math.min(1 - 1e-9, Math.max(1e-9, p));
    if (p < 0.02425 || p > 0.97575) {
      const q = Math.sqrt(-2 * Math.log(p < 0.5 ? p : 1 - p));
      const v = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
      return p < 0.5 ? v : -v;
    }
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  // Poisson quantile for a fixed uniform u: monotone in lambda, so raising D0 only adds defects.
  function poissonQuantile(lambda, u) {
    if (lambda <= 0) return 0;
    if (lambda > 200) return Math.max(0, Math.round(lambda + invNorm(u) * Math.sqrt(lambda)));
    let k = 0, p = Math.exp(-lambda), cdf = p;
    while (u > cdf && k < 5000) { k++; p *= lambda / k; cdf += p; }
    return k;
  }
  // Gamma(shape a, mean m) quantile via Wilson–Hilferty, continuous in a so dragging α reshapes the field smoothly.
  function gammaQuantile(a, m, z) { const t = 1 - 1 / (9 * a) + z / (3 * Math.sqrt(a)); return m * Math.max(0, t) ** 3; }

  window.registerWidget('yield-calculator', {
    title: 'Dies per Wafer and Yield',
    caption: 'Lay a die grid on a 300 mm wafer, pick a defect model, and compare the simulated defect field with the model’s prediction. Drag D0 to watch the same field fill in; Re-roll draws a fresh wafer.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const uid = 'yc' + (++mountCount);
      const st = { w: 26, h: 31.3, edge: 3, scribe: 0.1, D0: 0.1, alpha: 2, model: 'poisson', price: 17000, unrep: 30, seed: 1 };
      let W = 700, layout = null, field = null, defects = [], hits = new Set(), calloutDie = null, dead = false, roRaf = 0;

      // ---------- controls ----------
      const num = (val, min, max, step) => h('input', { type: 'range', min, max, step, value: val });
      const wIn = num(st.w, 3, 33, 0.1), hIn = num(st.h, 3, 33, 0.1), edgeIn = num(st.edge, 0, 10, 0.5), scribeIn = num(st.scribe, 0, 0.5, 0.02);
      const d0In = num(st.D0, 0.01, 1, 0.01), alphaIn = num(st.alpha, 0.5, 5, 0.1), priceIn = num(st.price, 3000, 40000, 500), unrepIn = num(st.unrep, 0, 100, 5);
      const o = {}; ['w', 'h', 'edge', 'scribe', 'D0', 'alpha', 'price', 'unrep'].forEach(k => { o[k] = h('output'); });
      const modelSel = h('select', null, ...Object.keys(MODELS).map(k => h('option', { value: k, selected: k === st.model || null }, MODELS[k].name)));
      const presetBtns = h('div', { class: 'w-controls' }, ...PRESETS.map(p => h('button', { class: 'w-btn', on: { click: () => { wIn.value = p.w; hIn.value = p.h; update(); } } }, p.name)));
      const reroll = h('button', { class: 'w-btn primary', on: { click: () => { st.seed++; update(); } } }, 'Re-roll defects');
      const alphaCtl = h('label', { class: 'w-ctl' }, h('span', null, 'Clustering α (NB only)'), alphaIn, o.alpha);
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Die width'), wIn, o.w),
        h('label', { class: 'w-ctl' }, h('span', null, 'Die height'), hIn, o.h),
        h('label', { class: 'w-ctl' }, h('span', null, 'Edge exclusion'), edgeIn, o.edge),
        h('label', { class: 'w-ctl' }, h('span', null, 'Scribe width'), scribeIn, o.scribe),
        h('label', { class: 'w-ctl' }, h('span', null, 'D0'), d0In, o.D0),
        alphaCtl,
        h('label', { class: 'w-ctl' }, h('span', null, 'Model'), modelSel, h('output')),
        h('label', { class: 'w-ctl' }, h('span', null, 'Wafer price'), priceIn, o.price),
        h('label', { class: 'w-ctl' }, h('span', null, 'Unrepairable area'), unrepIn, o.unrep));
      const modelNote = h('div', { class: 'w-note' });
      const warnNote = h('div', { class: 'w-note', style: { color: 'var(--warn)', fontWeight: 600 } });
      const readout = h('div', { class: 'w-readout' });
      const formula = h('div', { class: 'w-formula' });
      const map = svg('svg', { class: 'w-svg', viewBox: '0 0 700 500', role: 'img', 'aria-label': 'Wafer map: 300 mm wafer with die grid, edge exclusion ring and simulated defects' });
      const mapCount = h('div', { class: 'w-note' });
      const mapNote = h('div', { class: 'w-note' });
      const chart = svg('svg', { class: 'w-svg', viewBox: '0 0 700 270', role: 'img', 'aria-label': 'Yield versus die area for the Poisson, Murphy and negative binomial models' });

      // ---------- die grid ----------
      function computeLayout() {
        const exclR = Math.max(1, R - st.edge), pitchX = st.w + st.scribe, pitchY = st.h + st.scribe;
        const cols = Math.ceil(R / pitchX) + 1, rows = Math.ceil(R / pitchY) + 1;
        const full = [], clipped = [];
        for (let i = -cols; i <= cols; i++) for (let j = -rows; j <= rows; j++) {
          const x0 = i * pitchX - st.w / 2, y0 = j * pitchY - st.h / 2, x1 = x0 + st.w, y1 = y0 + st.h;
          const far = Math.max(Math.hypot(x0, y0), Math.hypot(x1, y0), Math.hypot(x0, y1), Math.hypot(x1, y1));
          const near = Math.hypot(Math.max(0, x0, -x1), Math.max(0, y0, -y1)); // distance from centre to the nearest point of the rect
          if (near >= R) continue;                                              // entirely off the wafer
          const die = { i, j, x: x0, y: y0 };
          if (far <= exclR) full.push(die); else clipped.push(die);
        }
        return { exclR, pitchX, pitchY, full, clipped };
      }
      function grossFormula() {
        const d = WAFER_D - 2 * st.edge, A = st.w * st.h;
        return Math.max(0, Math.PI * (d / 2) ** 2 / A - Math.PI * d / Math.sqrt(2 * A));
      }

      // ---------- defect field ----------
      // A seeded pool of candidate positions is split into CELLS irregular patches (nearest of CELLS seeded centres).
      // Each patch gets a local density: D0 everywhere (Poisson), triangular spread (Murphy) or gamma spread with
      // shape α (negative binomial) — the same assumption each model makes — and drops Poisson(D_local × area) of its
      // candidates. Fixed per-patch uniforms make the field grow monotonically with D0 and change only on Re-roll.
      function buildField() {
        const rng = mulberry32(st.seed * 7919 + 17);
        const centres = [], cells = [];
        for (let c = 0; c < CELLS; c++) {
          const rr = R * Math.sqrt(rng()), a = rng() * 2 * Math.PI;
          centres.push([rr * Math.cos(a), rr * Math.sin(a)]);
          cells.push({ pts: [], u: rng(), z: invNorm(rng()), t: rng() + rng() });
        }
        for (let n = 0; n < POOL; n++) {
          const rr = R * Math.sqrt(rng()), a = rng() * 2 * Math.PI, x = rr * Math.cos(a), y = rr * Math.sin(a);
          let best = 0, bd = Infinity;
          for (let c = 0; c < CELLS; c++) { const d = Math.hypot(x - centres[c][0], y - centres[c][1]); if (d < bd) { bd = d; best = c; } }
          cells[best].pts.push([x, y]);
        }
        cells.forEach(c => { c.area = c.pts.length / POOL * WAFER_CM2; });
        return { seed: st.seed, cells };
      }
      function simulate() {
        if (!field || field.seed !== st.seed) field = buildField();
        const dens = field.cells.map(c => st.model === 'murphy' ? st.D0 * c.t : st.model === 'negbin' ? gammaQuantile(st.alpha, st.D0, c.z) : st.D0);
        const mean = dens.reduce((s, d, i) => s + d * field.cells[i].area, 0) / WAFER_CM2; // renormalise so the wafer average is exactly D0
        defects = [];
        field.cells.forEach((c, i) => {
          const n = Math.min(c.pts.length, poissonQuantile(dens[i] * (mean > 0 ? st.D0 / mean : 1) * c.area, c.u));
          for (let k = 0; k < n; k++) defects.push(c.pts[k]);
        });
        hits = new Set(); // bin each defect into the die grid once; die lookup is then O(1)
        defects.forEach(([px, py]) => {
          const i = Math.round(px / layout.pitchX), j = Math.round(py / layout.pitchY);
          if (Math.abs(px - i * layout.pitchX) <= st.w / 2 && Math.abs(py - j * layout.pitchY) <= st.h / 2) hits.add(i + ',' + j);
        });
      }
      const dieHit = d => hits.has(d.i + ',' + d.j);

      // ---------- formatting ----------
      const areaStr = a => (a >= 100 ? fmt(a, 0) : fmt(a, 1)) + ' mm²';
      const pct = y => { const p = y * 100; if (p >= 1) return fmt(p, 1) + ' %'; if (p < 1e-4) return '<0.0001 %'; return String(Number(p.toPrecision(2))) + ' %'; };
      const T = (x, y, txt, attrs) => svg('text', Object.assign({ x, y, 'font-size': 11.5, 'font-family': 'var(--sans)', fill: 'var(--ink)' }, attrs || {}), txt);
      const M = (x, y, txt, attrs) => T(x, y, txt, Object.assign({ 'font-family': 'var(--mono)', 'font-size': 11, fill: 'var(--muted)' }, attrs || {}));

      // ---------- wafer map ----------
      function drawMap() {
        map.innerHTML = '';
        const side = W >= 660;                                  // callouts beside the wafer, or in a row under it
        const r = Math.min(215, Math.floor((W - (side ? 300 : 24)) / 2));
        const cx = Math.round(W / 2), cy = 36 + r, s = r / R, H = cy + r + 26;
        map.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const P = (x, y) => [cx + x * s, cy + y * s];
        const nw = 7, ny = Math.sqrt(r * r - nw * nw);            // notch: 7 px half-width, exaggerated for visibility
        const disc = `M ${cx + nw} ${cy + ny} A ${r} ${r} 0 1 0 ${cx - nw} ${cy + ny} A ${nw} ${nw} 0 0 1 ${cx + nw} ${cy + ny} Z`;
        map.append(svg('defs', null, svg('clipPath', { id: uid + '-clip' }, svg('path', { d: disc }))));
        map.append(svg('path', { d: disc, fill: 'var(--panel2)', stroke: 'var(--line2)', 'stroke-width': 2 }));
        const g = svg('g', { 'clip-path': `url(#${uid}-clip)` });
        const withTitles = layout.full.length <= 1500;
        layout.clipped.forEach(d => {
          const [x, y] = P(d.x, d.y), [x2, y2] = P(d.x + st.w, d.y + st.h);
          g.append(svg('rect', { x, y, width: x2 - x, height: y2 - y, fill: 'var(--muted)', 'fill-opacity': 0.22, stroke: 'var(--muted)', 'stroke-width': 0.6, 'stroke-dasharray': '2 2' }));
        });
        layout.full.forEach(d => {
          const [x, y] = P(d.x, d.y), [x2, y2] = P(d.x + st.w, d.y + st.h), bad = dieHit(d);
          const rect = svg('rect', { x, y, width: x2 - x, height: y2 - y, fill: bad ? 'var(--bad)' : 'var(--ok)', stroke: 'var(--panel)', 'stroke-width': 0.6, 'fill-opacity': bad ? 0.85 : 0.6 });
          if (withTitles) rect.append(svg('title', null, bad ? 'hit by a defect: scrapped (or harvested)' : 'clean die'));
          g.append(rect);
        });
        map.append(g);
        const e = layout.exclR * s;
        map.append(svg('circle', { cx, cy, r: e, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.2, 'stroke-dasharray': '5 3', opacity: 0.75 }));
        defects.forEach(([dx, dy]) => { const [x, y] = P(dx, dy); map.append(svg('circle', { cx: x, cy: y, r: 1.8, fill: 'var(--ink)', opacity: Math.hypot(dx, dy) <= layout.exclR ? 1 : 0.4 })); });

        // dimension line across the wafer
        const dy0 = 24;
        map.append(svg('line', { x1: cx - r, y1: dy0, x2: cx + r, y2: dy0, stroke: 'var(--muted)', 'stroke-width': 1 }));
        [cx - r, cx + r].forEach(x => map.append(svg('line', { x1: x, y1: dy0 - 5, x2: x, y2: dy0 + 5, stroke: 'var(--muted)', 'stroke-width': 1 })));
        map.append(T(cx, dy0 - 8, '300 mm wafer', { 'text-anchor': 'middle', fill: 'var(--muted)' }));
        // notch
        map.append(T(cx, cy + r + 15, 'notch', { 'text-anchor': 'middle', fill: 'var(--muted)' }));

        // callouts: edge-exclusion ring and one die, with leaders
        const lead = (pts) => svg('polyline', { points: pts.map(p => p.join(',')).join(' '), fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1 });
        const edgeTxt = `edge exclusion ${fmt(st.edge, 1)} mm`, dieTxt = `one die: ${fmt(st.w, 1)} × ${fmt(st.h, 1)} mm`;
        if (side) {
          const yr = cy - e * 0.707, xr = cx + e * 0.707;
          map.append(lead([[xr, yr], [cx + r + 10, yr]]), T(cx + r + 14, yr + 4, edgeTxt));
          if (calloutDie) {
            const [x, y] = P(calloutDie.x, calloutDie.y + st.h / 2), [x2, y2] = P(calloutDie.x + st.w, calloutDie.y + st.h);
            map.append(svg('rect', { x, y: y2 - (y2 - y) * 1, width: x2 - x, height: y2 - (y - (y2 - y) * 0), fill: 'none' }));
            map.append(lead([[x, y], [cx - r - 10, y]]), T(cx - r - 14, y + 4, dieTxt, { 'text-anchor': 'end' }));
          }
        } else {
          const by = cy + r + 15;
          map.append(lead([[cx - e * 0.707, cy + e * 0.707], [cx - r + 40, by - 10]]), T(cx - r, by, edgeTxt));
          if (calloutDie) {
            const [x2, y2] = P(calloutDie.x + st.w, calloutDie.y + st.h);
            map.append(lead([[x2, y2], [cx + r - 44, by - 10]]), T(cx + r, by, dieTxt, { 'text-anchor': 'end' }));
          }
        }
        if (calloutDie) {
          const [x, y] = P(calloutDie.x, calloutDie.y), [x2, y2] = P(calloutDie.x + st.w, calloutDie.y + st.h);
          map.append(svg('rect', { x, y, width: x2 - x, height: y2 - y, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.5 }));
        }
      }

      // ---------- yield-vs-area chart ----------
      function drawChart() {
        chart.innerHTML = '';
        const H = 270, PL = 58, PR = 66, PT = 14, PB = 40, A0 = 8, A1 = 1300;
        chart.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const xLog = a => PL + (Math.log10(a) - Math.log10(A0)) / (Math.log10(A1) - Math.log10(A0)) * (W - PL - PR);
        const yOf = y => PT + (1 - y) * (H - PT - PB);
        [0, 25, 50, 75, 100].forEach(p => {
          const y = yOf(p / 100);
          chart.append(svg('line', { x1: PL, y1: y, x2: W - PR, y2: y, stroke: 'var(--line)', 'stroke-width': 1 }));
          chart.append(M(PL - 8, y + 4, p + '%', { 'text-anchor': 'end' }));
        });
        [10, 30, 100, 300, 1000].forEach(a => {
          const x = xLog(a);
          chart.append(svg('line', { x1: x, y1: H - PB, x2: x, y2: H - PB + 5, stroke: 'var(--line2)', 'stroke-width': 1 }));
          chart.append(M(x, H - PB + 17, String(a), { 'text-anchor': 'middle' }));
        });
        chart.append(T(12, (PT + H - PB) / 2, 'yield', { 'text-anchor': 'middle', transform: `rotate(-90 12 ${(PT + H - PB) / 2})` }));
        chart.append(T((PL + W - PR) / 2, H - 5, 'die area (mm², log scale)', { 'text-anchor': 'middle' }));
        const areas = []; for (let a = A0; a <= A1 * 1.001; a *= 1.05) areas.push(Math.min(a, A1));
        const ends = [];
        Object.keys(MODELS).forEach(k => {
          const pts = areas.map(a => [xLog(a), yOf(MODELS[k].fn(a / 100, st.D0, st.alpha))]);
          chart.append(svg('polyline', { points: pts.map(p => p.join(',')).join(' '), fill: 'none', stroke: `var(--${COLORS[k]})`, 'stroke-width': k === st.model ? 3 : 1.5, opacity: k === st.model ? 1 : 0.7 }));
          ends.push({ k, y: pts[pts.length - 1][1] + 4, label: k === 'negbin' ? `NB α=${fmt(st.alpha, 1)}` : MODELS[k].name });
        });
        // curve end-labels, pushed apart so they never overlap
        ends.sort((a, b) => a.y - b.y);
        for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
        const over = ends[ends.length - 1].y - (H - PB - 2); if (over > 0) ends.forEach(e => { e.y -= over; });
        ends.forEach(e => chart.append(T(W - PR + 6, e.y, e.label, { fill: `var(--${COLORS[e.k]})`, 'font-weight': e.k === st.model ? 700 : 400 })));
        // marker for the current die
        const A = st.w * st.h, y = MODELS[st.model].fn(A / 100, st.D0, st.alpha), mx = xLog(A), my = yOf(y);
        const label = `${areaStr(A)} → ${pct(y).replace(' %', '%')}`, lw = label.length * 6.6 + 10;
        let lx, ly, anchor;
        if (mx + 9 + lw <= W - PR - 4) { lx = mx + 9; ly = my - 8; anchor = 'start'; }
        else { lx = mx - 9; ly = my + 17 > H - PB - 3 ? my - 8 : my + 17; anchor = 'end'; }
        chart.append(svg('rect', { x: anchor === 'start' ? lx - 4 : lx - lw + 4, y: ly - 11, width: lw, height: 15, rx: 3, fill: 'var(--panel)', opacity: 0.88 }));
        chart.append(svg('circle', { cx: mx, cy: my, r: 5.5, fill: `var(--${COLORS[st.model]})`, stroke: 'var(--panel)', 'stroke-width': 1.5 }));
        chart.append(M(lx, ly, label, { 'text-anchor': anchor, fill: 'var(--ink)', 'font-weight': 600 }));
      }

      // ---------- update ----------
      function update() {
        if (dead) return;
        st.w = +wIn.value; st.h = +hIn.value; st.edge = +edgeIn.value; st.scribe = +scribeIn.value;
        st.D0 = +d0In.value; st.alpha = +alphaIn.value; st.model = modelSel.value; st.price = +priceIn.value; st.unrep = +unrepIn.value;
        o.w.textContent = fmt(st.w, 1) + ' mm'; o.h.textContent = fmt(st.h, 1) + ' mm';
        o.edge.textContent = fmt(st.edge, 1) + ' mm'; o.scribe.textContent = fmt(st.scribe, 2) + ' mm';
        o.D0.textContent = fmt(st.D0, 2) + ' /cm²'; o.alpha.textContent = fmt(st.alpha, 1);
        o.price.textContent = '$' + fmt(st.price, 0); o.unrep.textContent = fmt(st.unrep, 0) + ' %';
        alphaIn.disabled = st.model !== 'negbin'; alphaCtl.style.opacity = st.model === 'negbin' ? '' : '0.5';
        modelNote.textContent = MODELS[st.model].note;
        const fits = (st.w <= RETICLE.w && st.h <= RETICLE.h) || (st.w <= RETICLE.h && st.h <= RETICLE.w);
        warnNote.textContent = fits ? '' : `Warning: ${fmt(st.w, 1)} × ${fmt(st.h, 1)} mm does not fit the ${RETICLE.w} × ${RETICLE.h} mm reticle field (the largest area one exposure can print) in either orientation, so this die could not be made as a single chip.`;
        warnNote.hidden = fits;

        layout = computeLayout();
        simulate();
        const full = layout.full;
        calloutDie = full.length ? full.reduce((b, d) => {
          const score = W >= 660 ? -d.x + Math.abs(d.y + st.h / 2) * 0.05 : d.x + st.w + d.y + st.h; // leftmost (side layout) or bottom-right-most (row layout)
          return score > b.s ? { s: score, d } : b;
        }, { s: -Infinity, d: null }).d : null;

        const areaMm2 = st.w * st.h, A = areaMm2 / 100;
        const Y = MODELS[st.model].fn(A, st.D0, st.alpha), Yeff = MODELS[st.model].fn(A * st.unrep / 100, st.D0, st.alpha);
        const grossF = grossFormula(), grossG = full.length;
        const perfect = grossG * Y, sellable = grossG * Yeff;
        const simGood = full.filter(d => !dieHit(d)).length, simYield = grossG ? simGood / grossG : 0;

        readout.innerHTML = '';
        const stat = (v, l) => h('div', { class: 'w-stat' }, h('b', null, v), h('span', null, l));
        readout.append(
          stat(areaStr(areaMm2), 'die area'),
          stat(fmt(grossF, 0), 'DPW formula (approx.)'),
          stat(fmt(grossG, 0), 'full dies on the grid (exact)'),
          stat(pct(Y), MODELS[st.model].name + ' yield'),
          stat(perfect >= 1 ? fmt(perfect, 0) : fmt(perfect, 2), 'perfect dies / wafer'),
          stat(perfect >= 1 ? '$' + fmt(st.price / perfect, 0) : '—', 'cost per perfect die (no harvesting)'),
          stat(pct(Yeff), 'yield with harvesting'),
          stat(sellable >= 1 ? fmt(sellable, 0) : fmt(sellable, 2), 'sellable dies / wafer'),
          stat(sellable >= 1 ? '$' + fmt(st.price / sellable, 0) : '—', 'cost per sellable die'));
        formula.innerHTML = 'DPW ≈ π(d/2)²/A − πd/√(2A), d = 300 − 2·edge = ' + fmt(WAFER_D - 2 * st.edge, 0) + ' mm (an estimate of how many whole dies fit; the grid count is the exact number for this placement). '
          + 'Y<sub>Poisson</sub> = e<sup>−A·D0</sup>, Y<sub>Murphy</sub> = [(1−e<sup>−A·D0</sup>)/(A·D0)]², Y<sub>NB</sub> = (1 + A·D0/α)<sup>−α</sup>, A in cm². '
          + 'Harvesting: only the unrepairable ' + fmt(st.unrep, 0) + ' % of the die must be clean (the rest is spare blocks that can be fused off), so Y<sub>harvest</sub> = Y(' + fmt(st.unrep / 100, 2) + '·A).';
        mapCount.textContent = `${fmt(grossG)} full dies (solid) · ${fmt(layout.clipped.length)} edge-clipped (dashed, not sellable) · ${fmt(defects.length)} simulated defects on the wafer (D0 × 707 cm² ≈ ${fmt(st.D0 * WAFER_CM2, 0)}). Gaps between dies are the ${fmt(st.scribe, 2)} mm scribe lines.`;
        const how = st.model === 'poisson' ? 'Defects were dropped evenly (one density everywhere).'
          : st.model === 'murphy' ? 'Defects were dropped with a local density that varies patch to patch (Murphy’s triangular spread): some patches are showery, others nearly clean.'
          : `Defects were dropped with a gamma-spread local density (α = ${fmt(st.alpha, 1)}): showery patches and clean patches, which is why more big dies survive than Poisson predicts.`;
        mapNote.textContent = `Simulated: ${fmt(simGood)} / ${fmt(grossG)} full dies clean this roll ≈ ${pct(simYield)} yield, vs. the ${MODELS[st.model].name} prediction of ${pct(Y)} at this D0 and area. ${how} Same seed until you Re-roll, so dragging D0 or die size keeps the field in place.`;
        drawMap(); drawChart();
      }
      [wIn, hIn, edgeIn, scribeIn, d0In, alphaIn, priceIn, unrepIn].forEach(inp => inp.addEventListener('input', update));
      modelSel.addEventListener('change', update);

      const legend = h('div', { class: 'w-legend' },
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--ok)', opacity: 0.75 } }), 'clean die'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--bad)', opacity: 0.9 } }), 'die hit by a defect'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--muted)', opacity: 0.45, border: '1px dashed var(--ink)' } }), 'edge-clipped (dashed, not sellable)'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--ink)', borderRadius: '50%', width: '8px', height: '8px' } }), 'simulated defect'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'none', border: '1px dashed var(--ink)', borderRadius: '50%' } }), 'edge-exclusion ring'));
      const chartLegend = h('div', { class: 'w-legend' },
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent)' } }), 'Poisson'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent2)' } }), 'Murphy'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--si)' } }), 'Negative binomial (NB)'),
        h('span', { class: 'w-legend-item' }, '● marker = this die on the selected model'));

      const sh = () => ({ margin: '18px 0 4px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' });
      el.append(
        h('h5', { style: sh() }, 'Presets'), presetBtns,
        h('h5', { style: sh() }, 'Wafer, die and defect inputs'), controls, modelNote, warnNote,
        readout, formula,
        h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', margin: '10px 0' } }, reroll),
        map, mapCount, legend, mapNote,
        h('h5', { style: sh() }, 'Yield vs. die area at this D0 and ', h('span', { style: { textTransform: 'none' } }, 'α')), chart, chartLegend);

      // responsive: viewBox width == CSS pixel width, so 11–12 px labels stay 11–12 px at every width
      function relayout(w) { if (dead || !w || w < 200 || Math.abs(w - W) < 2) return; W = w; drawMap(); drawChart(); }
      W = Math.round(map.getBoundingClientRect().width) || 700;
      update();
      const ro = new ResizeObserver(entries => {
        const w = Math.round(entries[0].contentRect.width);
        if (roRaf) cancelAnimationFrame(roRaf);
        roRaf = requestAnimationFrame(() => { roRaf = 0; relayout(w); });
      });
      ro.observe(el);
      ctx.onTheme(() => { if (!dead) { drawMap(); drawChart(); } });
      return () => { dead = true; if (roRaf) cancelAnimationFrame(roRaf); ro.disconnect(); };
    }
  });
})();
