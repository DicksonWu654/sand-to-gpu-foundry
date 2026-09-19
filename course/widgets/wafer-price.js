/* Widget: wafer-price — "Fab Economics" (Module 20, Module 05) */
(function () {
  'use strict';
  const NODES = [
    { n: '28 nm', price: 3000, density: 15 },
    { n: '16/12 nm', price: 4000, density: 28 },
    { n: '7 nm', price: 9500, density: 91 },
    { n: '5 nm', price: 16000, density: 138 },
    { n: '3 nm', price: 19000, density: 200 },
    { n: '2 nm', price: 30000, density: 260 },
  ];
  const USABLE_AREA = 60000; // mm^2, illustrative usable wafer area per Module 20

  // AI capex supercycle: hyperscaler figures 2020-23 are the widget's own approximations,
  // 2024-26 and all TSMC figures follow Module 20's text over the task's rounder estimates.
  const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const HYPER = [100, 125, 150, 160, 230, 400, 675];
  const HYPER_NOTE = ['approx', 'approx', 'approx', 'approx', 'actual (Mod. 20)', 'actual, ~$390–410B', 'guided, ~$630–725B'];
  const TSMC_CAPEX = [17, 30, 36, 30, 30, 41, 54];
  const TSMC_NOTE = ['approx', 'approx', 'approx', 'approx', 'approx', 'actual (Mod. 20)', 'guided, ~$52–56B'];

  function niceStep(raw) { const p = Math.pow(10, Math.floor(Math.log10(raw))); const m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
  function ticks(max, n) { const s = niceStep(max / n) || 1; const out = []; for (let v = 0; v <= max + 1e-9; v += s) out.push(v); return out; }

  window.registerWidget('wafer-price', {
    title: 'Fab Economics',
    caption: 'Wafer prices by node, what breaks even a leading-edge fab, and the hyperscaler capex boom that is filling it.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const usd = (n, d) => '$' + fmt(n, d == null ? 0 : d);
      const usdB = n => '$' + fmt(n, n < 10 ? 1 : 0) + 'B';

      // ============ Panel A: wafer price by node ============
      const secA = h('div');
      const toggleBtn = h('button', { class: 'w-btn' }, 'Show cost per billion transistors');
      let showDensity = false;
      const svgA = svg('svg', { class: 'w-svg', viewBox: '0 0 700 260', role: 'img', 'aria-label': 'Wafer price by node' });
      const noteA = h('div', { class: 'w-note' });

      function drawA() {
        svgA.innerHTML = '';
        const W = 700, Hh = 260, L = 66, R = 16, T = 20, B = 34;
        const pw = W - L - R, ph = Hh - T - B;
        const vals = NODES.map(nd => showDensity ? (nd.price * 1000) / (nd.density * USABLE_AREA) : nd.price);
        const maxV = Math.max(...vals) * 1.15;
        const bw = pw / NODES.length;
        const txt = (x, y, s, o) => svg('text', Object.assign({ x, y, 'font-family': 'var(--sans)', 'font-size': 12, fill: 'var(--muted)' }, o || {}), s);
        // axes + gridlines
        ticks(maxV, 5).forEach(v => {
          const y = T + ph - (v / maxV) * ph;
          svgA.append(svg('line', { x1: L, y1: y, x2: L + pw, y2: y, stroke: 'var(--line)' }));
          svgA.append(txt(L - 8, y + 4, showDensity ? fmt(v, 2) : fmt(v, 0), { 'text-anchor': 'end', 'font-family': 'var(--mono)' }));
        });
        svgA.append(svg('line', { x1: L, y1: T + ph, x2: L + pw, y2: T + ph, stroke: 'var(--line2)' }));
        svgA.append(txt(16, T + ph / 2, showDensity ? '$ / billion transistors' : '$ / 300 mm wafer', { 'text-anchor': 'middle', transform: `rotate(-90 16 ${T + ph / 2})` }));
        NODES.forEach((nd, i) => {
          const v = vals[i];
          const bh = (v / maxV) * ph;
          const x = L + i * bw + bw * 0.18, w = bw * 0.64;
          const y = T + ph - bh;
          const bar = svg('rect', { x, y, width: w, height: bh, fill: 'var(--accent)', rx: 3 });
          bar.append(svg('title', null, `${nd.n}: ${showDensity ? usd(v, 2) : usd(v)} · ${fmt(nd.density, 0)} MTr/mm²`));
          svgA.append(bar);
          svgA.append(txt(x + w / 2, y - 8, showDensity ? usd(v, 2) : usd(v), { 'text-anchor': 'middle', 'font-family': 'var(--mono)', fill: 'var(--ink)', 'font-size': 12 }));
          svgA.append(txt(x + w / 2, T + ph + 18, nd.n, { 'text-anchor': 'middle' }));
        });
      }
      toggleBtn.addEventListener('click', () => {
        showDensity = !showDensity;
        toggleBtn.textContent = showDensity ? 'Show $ per wafer' : 'Show cost per billion transistors';
        noteA.textContent = showDensity
          ? 'Cost per transistor has flattened since ~7 nm: wafer price rises almost as fast as density, and SRAM/analog areas barely shrink at all (Module 20).'
          : 'Wafer prices roughly follow foundry list-price estimates as of ~2025 (Module 20). Density assumes usable area ≈ 60,000 mm² per 300 mm wafer.';
        drawA();
      });
      noteA.textContent = 'Wafer prices roughly follow foundry list-price estimates as of ~2025 (Module 20). Density assumes usable area ≈ 60,000 mm² per 300 mm wafer.';
      secA.append(h('div', { class: 'w-step-nav' }, toggleBtn), svgA, noteA);

      // ============ Panel B: fab break-even ============
      const secB = h('div');
      const bst = { capex: 20, dep: 5, wspm: 100000, util: 90, other: 4000, margin: 58 };
      const inCapex = h('input', { type: 'range', min: 5, max: 40, step: 1, value: bst.capex });
      const inDep = h('input', { type: 'range', min: 3, max: 10, step: 1, value: bst.dep });
      const inWspm = h('input', { type: 'range', min: 20000, max: 200000, step: 5000, value: bst.wspm });
      const inUtil = h('input', { type: 'range', min: 50, max: 100, step: 1, value: bst.util });
      const inOther = h('input', { type: 'range', min: 2000, max: 8000, step: 100, value: bst.other });
      const inMargin = h('input', { type: 'range', min: 30, max: 70, step: 1, value: bst.margin });
      const outUpd = [];
      function bctl(label, inp, getter, f) { const o = h('output'); outUpd.push(() => o.textContent = f(getter())); return h('label', { class: 'w-ctl' }, h('span', null, label), inp, o); }
      const bGrid = h('div', { class: 'w-grid2' },
        h('div', { class: 'w-controls' },
          bctl('Fab capex', inCapex, () => bst.capex, v => usdB(v)),
          bctl('Equipment depreciation', inDep, () => bst.dep, v => v + ' yr'),
          bctl('Wafer starts / month', inWspm, () => bst.wspm, v => fmt(v, 0)),
        ),
        h('div', { class: 'w-controls' },
          bctl('Utilization', inUtil, () => bst.util, v => v + '%'),
          bctl('Other cost / wafer', inOther, () => bst.other, v => usd(v)),
          bctl('Target gross margin', inMargin, () => bst.margin, v => v + '%'),
        ));
      const rDep = h('b'), rTot = h('b'), rPrice = h('b');
      const bReadout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, rDep, h('span', null, 'depreciation / wafer')),
        h('div', { class: 'w-stat' }, rTot, h('span', null, 'total mfg cost / wafer')),
        h('div', { class: 'w-stat' }, rPrice, h('span', null, 'required price / wafer')));
      const bFormula = h('div', { class: 'w-formula', html: 'annual depreciation = capex·(0.8/dep_yrs + 0.2/20) &nbsp;·&nbsp; cost/wafer = depreciation/(wspm·12·util) + other &nbsp;·&nbsp; price = cost / (1 − margin)' });
      const svgB = svg('svg', { class: 'w-svg', viewBox: '0 0 700 240', role: 'img', 'aria-label': 'Required price versus utilization' });

      function breakEven(capexB, depYrs, wspm, utilPct, other, marginPct) {
        const annualDep = capexB * 1e9 * (0.8 / depYrs + 0.2 / 20);
        const wafersPerYear = wspm * 12 * (utilPct / 100);
        const depPerWafer = annualDep / Math.max(1, wafersPerYear);
        const totalCost = depPerWafer + other;
        const price = totalCost / (1 - marginPct / 100);
        return { depPerWafer, totalCost, price };
      }
      function drawB() {
        const cur = breakEven(bst.capex, bst.dep, bst.wspm, bst.util, bst.other, bst.margin);
        rDep.textContent = usd(cur.depPerWafer);
        rTot.textContent = usd(cur.totalCost);
        rPrice.textContent = usd(cur.price);
        svgB.innerHTML = '';
        const W = 700, Hh = 240, L = 70, R = 20, T = 16, B = 36, pw = W - L - R, ph = Hh - T - B;
        const us = []; for (let u = 50; u <= 100; u += 1) us.push(u);
        const prices = us.map(u => breakEven(bst.capex, bst.dep, bst.wspm, u, bst.other, bst.margin).price);
        const maxP = Math.max(...prices) * 1.08, minP = Math.min(...prices) * 0.92;
        const X = u => L + ((u - 50) / 50) * pw, Y = p => T + ph - ((p - minP) / (maxP - minP)) * ph;
        const txt = (x, y, s, o) => svg('text', Object.assign({ x, y, 'font-family': 'var(--sans)', 'font-size': 12, fill: 'var(--muted)' }, o || {}), s);
        const yticks = ticks(maxP, 5).filter(v => v >= minP);
        yticks.forEach(v => { const y = Y(v); svgB.append(svg('line', { x1: L, y1: y, x2: L + pw, y2: y, stroke: 'var(--line)' })); svgB.append(txt(L - 8, y + 4, usd(v), { 'text-anchor': 'end', 'font-family': 'var(--mono)', 'font-size': 12 })); });
        [50, 60, 70, 80, 90, 100].forEach(u => { const x = X(u); svgB.append(svg('line', { x1: x, y1: T + ph, x2: x, y2: T + ph + 5, stroke: 'var(--line2)' })); svgB.append(txt(x, T + ph + 18, u + '%', { 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 12 })); });
        svgB.append(svg('line', { x1: L, y1: T + ph, x2: L + pw, y2: T + ph, stroke: 'var(--line2)' }));
        svgB.append(txt(L + pw / 2, Hh - 4, 'fab utilization', { 'text-anchor': 'middle' }));
        const pts = us.map((u, i) => `${X(u).toFixed(1)},${Y(prices[i]).toFixed(1)}`).join(' ');
        svgB.append(svg('polyline', { points: pts, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }));
        const cx = X(bst.util), cy = Y(cur.price);
        svgB.append(svg('line', { x1: cx, y1: cy, x2: cx, y2: T + ph, stroke: 'var(--accent)', 'stroke-dasharray': '3 3' }));
        svgB.append(svg('circle', { cx, cy, r: 5, fill: 'var(--accent)', stroke: 'var(--panel)', 'stroke-width': 2 }));
        const lbl = `${bst.util}% → ${usd(cur.price)}`;
        const lw = lbl.length * 6.4 + 10, lx = Math.min(L + pw - lw, cx + 10);
        svgB.append(svg('rect', { x: lx, y: cy - 24, width: lw, height: 18, rx: 3, fill: 'var(--panel)', stroke: 'var(--accent)' }));
        svgB.append(txt(lx + 5, cy - 11, lbl, { fill: 'var(--ink)', 'font-family': 'var(--mono)', 'font-size': 12 }));
      }
      function bUpdate() {
        bst.capex = +inCapex.value; bst.dep = +inDep.value; bst.wspm = +inWspm.value;
        bst.util = +inUtil.value; bst.other = +inOther.value; bst.margin = +inMargin.value;
        outUpd.forEach(f => f()); drawB();
      }
      [inCapex, inDep, inWspm, inUtil, inOther, inMargin].forEach(i => i.addEventListener('input', bUpdate));
      secB.append(bGrid, bReadout, bFormula, svgB,
        h('div', { class: 'w-note' }, 'Curve holds capex, depreciation years, wafer starts, other cost and target margin fixed at their current slider values and sweeps utilization from 50–100%; the dot marks the price needed at the current utilization.'));

      // ============ Panel C: AI capex supercycle ============
      const secC = h('div');
      const svgC = svg('svg', { class: 'w-svg', viewBox: '0 0 700 300', role: 'img', 'aria-label': 'Hyperscaler versus TSMC capex, 2020-2026' });
      const readYear = h('b', null, '—'), readHyper = h('b'), readTsmc = h('b'), readShare = h('b');
      const readC = h('div', { class: 'w-readout' });
      readC.append(
        h('div', { class: 'w-stat' }, readYear, h('span', null, 'year (hover a bar)')),
        h('div', { class: 'w-stat' }, readHyper, h('span', null, 'top-4 hyperscaler capex')),
        h('div', { class: 'w-stat' }, readTsmc, h('span', null, "TSMC capex")),
        h('div', { class: 'w-stat' }, readShare, h('span', null, 'TSMC as % of hyperscaler capex')));
      const legC = h('div', { class: 'w-legend' },
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent)' } }), 'Top-4 US hyperscaler capex (Amazon, Microsoft, Alphabet, Meta)'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--si)' } }), 'TSMC capex'));

      function setReadout(i) {
        readYear.textContent = YEARS[i];
        readHyper.textContent = usdB(HYPER[i]) + ' (' + HYPER_NOTE[i] + ')';
        readTsmc.textContent = usdB(TSMC_CAPEX[i]) + ' (' + TSMC_NOTE[i] + ')';
        readShare.textContent = fmt(TSMC_CAPEX[i] / HYPER[i] * 100, 1) + '%';
      }
      function drawC() {
        svgC.innerHTML = '';
        const W = 700, Hh = 300, L = 56, R = 12, T = 16, B = 40, pw = W - L - R, ph = Hh - T - B;
        const totals = YEARS.map((_, i) => HYPER[i] + TSMC_CAPEX[i]);
        const maxV = Math.max(...totals) * 1.1;
        const bw = pw / YEARS.length;
        const txt = (x, y, s, o) => svg('text', Object.assign({ x, y, 'font-family': 'var(--sans)', 'font-size': 12, fill: 'var(--muted)' }, o || {}), s);
        ticks(maxV, 5).forEach(v => {
          const y = T + ph - (v / maxV) * ph;
          svgC.append(svg('line', { x1: L, y1: y, x2: L + pw, y2: y, stroke: 'var(--line)' }));
          svgC.append(txt(L - 8, y + 4, fmt(v, 0), { 'text-anchor': 'end', 'font-family': 'var(--mono)' }));
        });
        svgC.append(txt(16, T + ph / 2, '$ billion / year', { 'text-anchor': 'middle', transform: `rotate(-90 16 ${T + ph / 2})` }));
        svgC.append(svg('line', { x1: L, y1: T + ph, x2: L + pw, y2: T + ph, stroke: 'var(--line2)' }));
        YEARS.forEach((yr, i) => {
          const x = L + i * bw + bw * 0.16, w = bw * 0.68;
          const hHyper = (HYPER[i] / maxV) * ph, hTsmc = (TSMC_CAPEX[i] / maxV) * ph;
          const yHyperTop = T + ph - hHyper;
          const yTsmcTop = yHyperTop - hTsmc;
          const g = svg('g', { style: { cursor: 'pointer' } });
          const rHyper = svg('rect', { x, y: yHyperTop, width: w, height: hHyper, fill: 'var(--accent)' });
          const rTsmc = svg('rect', { x, y: yTsmcTop, width: w, height: hTsmc, fill: 'var(--si)' });
          [rHyper, rTsmc].forEach(r => { r.append(svg('title', null, `${yr}: hyperscaler ${usdB(HYPER[i])}, TSMC ${usdB(TSMC_CAPEX[i])}`)); g.append(r); });
          g.addEventListener('mouseenter', () => setReadout(i));
          g.addEventListener('focus', () => setReadout(i));
          g.setAttribute('tabindex', '0');
          svgC.append(g);
          svgC.append(txt(x + w / 2, T + ph + 16, String(yr), { 'text-anchor': 'middle', 'font-family': 'var(--mono)' }));
        });
      }
      svgC.addEventListener('mouseleave', () => setReadout(YEARS.length - 1));
      secC.append(svgC, legC, readC,
        h('div', { class: 'w-note' }, 'Hyperscaler figures for 2020–2023 are this widget’s own round approximations; 2024–2026 and all TSMC figures follow Module 20’s text (2025/2026 are recent actuals or guidance as of mid-2026, marked accordingly). Note the two series share one $ billion axis, so the TSMC segment is a thin sliver against hyperscaler spending — the point Module 20 makes about TSMC capturing a small fraction of the value it enables.'));

      el.append(
        sectionHead('Wafer price by node'), secA,
        sectionHead('Fab break-even'), secB,
        sectionHead('The AI capex supercycle'), secC);

      function sectionHead(t) { return h('div', { style: { fontWeight: 600, fontSize: '12.5px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '16px 0 6px' } }, t); }

      drawA(); bUpdate(); drawC(); setReadout(YEARS.length - 1);
    }
  });
})();
