/* Widget: node-table — "What a Node Name Actually Means" (Module 11 / 21) */
(function () {
  'use strict';

  // Data compiled from Module 11 §2.2 and Module 21 "Node Table". Values marked "~" in the
  // source are approximate/disputed; gate length is not tabulated per-node in the course text,
  // so it is estimated from Module 11's "physical gate length by node class" figures and marked ~.
  const ROWS = [
    { node: 'Intel 14 nm', fdry: 'Intel', year: '2014', yearN: 2014, tx: 'FinFET', cpp: '70', cppN: 70, mp: '52', mpN: 52, fs: '42', dens: '~37.5', densN: 37.5, euv: '0 (DUV only)', gl: '~24 nm', glN: 24, price: '~$4–5k est. (internal)', priceN: 4.5 },
    { node: 'Intel 10 / Intel 7', fdry: 'Intel', year: '2018 / 2021', yearN: 2018, tx: 'FinFET', cpp: '54 (60 relaxed)', cppN: 54, mp: '40 (M0)', mpN: 40, fs: '34', dens: '~100', densN: 100, euv: '0 (DUV only)', gl: '~18 nm', glN: 18, price: 'internal; foundry-equiv. est. ~$8k', priceN: 8 },
    { node: 'Intel 4', fdry: 'Intel', year: '2023', yearN: 2023, tx: 'FinFET, EUV', cpp: '50', cppN: 50, mp: '30', mpN: 30, fs: '30', dens: '~120–160', densN: 140, euv: '~10+ (first Intel EUV)', gl: '~17 nm', glN: 17, price: 'internal; foundry-equiv. est. ~$16k', priceN: 16 },
    { node: 'Intel 3', fdry: 'Intel', year: '2024', yearN: 2024, tx: 'FinFET', cpp: '50', cppN: 50, mp: '30', mpN: 30, fs: '30', dens: '~1.1× Intel 4 (~154)', densN: 154, euv: 'EUV', gl: '~16 nm', glN: 16, price: '~$15–18k est. (foundry)', priceN: 16.5 },
    { node: 'Intel 18A', fdry: 'Intel', year: '2025', yearN: 2025, tx: 'RibbonFET GAA + PowerVia', cpp: '~50', cppN: 50, mp: '32', mpN: 32, fs: 'sheet', dens: '~238 (200–240 est.)', densN: 220, euv: '0.33 NA EUV; High-NA in dev.', gl: '~13 nm', glN: 13, price: '~$20–25k est.', priceN: 22.5 },
    { node: 'TSMC N16', fdry: 'TSMC', year: '2015', yearN: 2015, tx: 'FinFET', cpp: '90', cppN: 90, mp: '64', mpN: 64, fs: '48', dens: '~29', densN: 29, euv: '0 (DUV ArFi, LELE)', gl: '~20 nm', glN: 20, price: '~$4–5k', priceN: 4.5 },
    { node: 'TSMC N10', fdry: 'TSMC', year: '2017', yearN: 2017, tx: 'FinFET', cpp: '66', cppN: 66, mp: '44', mpN: 44, fs: '36', dens: '~52', densN: 52, euv: '0 (DUV SAQP)', gl: '~18 nm', glN: 18, price: '~$6k', priceN: 6 },
    { node: 'TSMC N7', fdry: 'TSMC', year: '2018', yearN: 2018, tx: 'FinFET', cpp: '57', cppN: 57, mp: '40', mpN: 40, fs: '30', dens: '~91', densN: 91, euv: '0 (N7+: ~4)', gl: '~16 nm', glN: 16, price: '~$9–10k', priceN: 9.5 },
    { node: 'TSMC N5', fdry: 'TSMC', year: '2020', yearN: 2020, tx: 'FinFET, EUV', cpp: '51', cppN: 51, mp: '30 (M0 28)', mpN: 30, fs: '28', dens: '~138–171', densN: 154, euv: '~14', gl: '~16 nm', glN: 16, price: '~$16–17k', priceN: 16.5 },
    { node: 'TSMC N3E', fdry: 'TSMC', year: '2023', yearN: 2023, tx: 'FinFET, FinFlex', cpp: '48', cppN: 48, mp: '23', mpN: 23, fs: '26', dens: '~200–215', densN: 207, euv: '~20+', gl: '~15 nm', glN: 15, price: '~$18–20k', priceN: 19 },
    { node: 'TSMC N2', fdry: 'TSMC', year: 'H2 2025', yearN: 2025, tx: 'Nanosheet GAA, NanoFlex', cpp: '~45', cppN: 45, mp: '~23–25', mpN: 24, fs: 'sheet', dens: '~230–250 (claims to 313)', densN: 240, euv: '~25+', gl: '~13 nm', glN: 13, price: '~$30k', priceN: 30 },
    { node: 'TSMC A16', fdry: 'TSMC', year: 'late 2026 / 2027', yearN: 2026.5, tx: 'Nanosheet + Super Power Rail', cpp: '~45', cppN: 45, mp: '~23', mpN: 23, fs: 'sheet', dens: '~250–270 est.', densN: 260, euv: '0.33 NA EUV; backside litho', gl: '~12 nm', glN: 12, price: '~$30–35k est.', priceN: 32.5 },
    { node: 'Samsung 7LPP', fdry: 'Samsung', year: '2018', yearN: 2018, tx: 'FinFET', cpp: '54', cppN: 54, mp: '36', mpN: 36, fs: '27', dens: '~95', densN: 95, euv: 'first EUV (~few layers)', gl: '~18 nm', glN: 18, price: '~$8–9k', priceN: 8.5 },
    { node: 'Samsung 5LPE', fdry: 'Samsung', year: '2020', yearN: 2020, tx: 'FinFET', cpp: '54', cppN: 54, mp: '36', mpN: 36, fs: '27', dens: '~127', densN: 127, euv: 'EUV (~10 est.)', gl: '~16 nm', glN: 16, price: '~$12–14k', priceN: 13 },
    { node: 'Samsung 3GAE / SF3', fdry: 'Samsung', year: '2022', yearN: 2022, tx: 'MBCFET nanosheet', cpp: '~45–48', cppN: 46.5, mp: '~28', mpN: 28, fs: 'sheet', dens: '~150 (1.19× 5LPE)', densN: 150, euv: 'EUV (~15 est.)', gl: '~14 nm', glN: 14, price: '~$15–18k', priceN: 16.5 },
    { node: 'Samsung SF2', fdry: 'Samsung', year: '2025–26', yearN: 2025.5, tx: 'MBCFET 2nd gen', cpp: '~45', cppN: 45, mp: '~28', mpN: 28, fs: 'sheet', dens: '~231 (claimed)', densN: 231, euv: 'EUV (~20 est.)', gl: '~13 nm', glN: 13, price: '~$25k est.', priceN: 25 },
  ];

  const AXES = {
    year: { label: 'HVM year', get: r => r.yearN, fmt: v => v.toFixed(v % 1 ? 1 : 0) },
    cpp: { label: 'CPP (nm)', get: r => r.cppN, fmt: v => v.toFixed(0) + ' nm' },
    mp: { label: 'Min metal pitch (nm)', get: r => r.mpN, fmt: v => v.toFixed(0) + ' nm' },
    dens: { label: 'HD density (MTr/mm²)', get: r => r.densN, fmt: v => v.toFixed(0) },
    price: { label: 'Wafer price ($k)', get: r => r.priceN, fmt: v => '$' + v.toFixed(0) + 'k' },
  };
  const FDRY_TOKEN = { TSMC: 'accent2', Intel: 'accent', Samsung: 'si' };

  window.registerWidget('node-table', {
    title: 'What a Node Name Actually Means',
    caption: '"7 nm" and "2 nm" are marketing labels, not measurements. CPP, metal pitch and transistor density are the real yardsticks — explore selected Intel, TSMC and Samsung processes below. This comparison is not an exhaustive foundry roster.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      let ax = 'year', ay = 'dens', trueScale = false;
      let calc = { cpp: 51, mp: 30, tracks: 6 };
      let hover = null;

      // ---------- table ----------
      const thead = h('tr', null, ...['Node', 'Foundry', 'HVM year', 'Transistor', 'CPP (nm)', 'Min MP (nm)', 'Fin/sheet pitch', 'HD density (MTr/mm²)', 'EUV layers', 'Gate length', 'Wafer price'].map(t => h('th', null, t)));
      const tbody = h('tbody');
      ROWS.forEach(r => {
        const tr = h('tr', { on: { mouseenter: () => setHover(r), mouseleave: () => setHover(null) } },
          h('td', null, r.node), h('td', null, r.fdry), h('td', null, r.year), h('td', null, r.tx),
          h('td', null, r.cpp), h('td', null, r.mp), h('td', null, r.fs), h('td', null, r.dens),
          h('td', null, r.euv), h('td', null, r.gl), h('td', null, r.price));
        r._tr = tr;
        tbody.append(tr);
      });
      const table = h('table', null, h('thead', null, thead), tbody);
      const tableWrap = h('div', { class: 'table-scroll' }, table);

      // ---------- scatter plot ----------
      const W = 680, H = 340, PL = 56, PR = 16, PT = 16, PB = 40;
      const xSel = h('select', null, ...Object.keys(AXES).map(k => h('option', { value: k, selected: k === ax || null }, AXES[k].label)));
      const ySel = h('select', null, ...Object.keys(AXES).map(k => h('option', { value: k, selected: k === ay || null }, AXES[k].label)));
      const chart = svg('svg', { class: 'w-svg', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Scatter plot of node metrics' });
      const detail = h('div', { class: 'w-note' }, 'Hover or tap a point (or a table row) for details.');
      const legend = h('div', { class: 'w-legend' }, ...Object.keys(FDRY_TOKEN).map(f => h('span', { class: 'w-legend-item' }, h('i', { style: { background: `var(--${FDRY_TOKEN[f]})` } }), f)));

      function scale(vals, p0, p1) {
        let lo = Math.min(...vals), hi = Math.max(...vals);
        if (lo === hi) { lo -= 1; hi += 1; }
        const pad = (hi - lo) * 0.08;
        lo -= pad; hi += pad;
        return v => p0 + (v - lo) / (hi - lo) * (p1 - p0);
      }
      function drawChart() {
        chart.innerHTML = '';
        const A = AXES[ax], B = AXES[ay];
        const xs = scale(ROWS.map(A.get), PL, W - PR);
        const ys = scale(ROWS.map(B.get), H - PB, PT);
        // gridlines + ticks
        const ticks = n => { const vals = ROWS.map(A.get); const lo = Math.min(...vals), hi = Math.max(...vals); const out = []; for (let i = 0; i <= n; i++) out.push(lo + (hi - lo) * i / n); return out; };
        ticks(4).forEach(v => {
          const x = xs(v);
          chart.append(svg('line', { x1: x, y1: PT, x2: x, y2: H - PB, stroke: 'var(--line)', 'stroke-width': 1 }));
          chart.append(svg('text', { x, y: H - PB + 16, 'text-anchor': 'middle', 'font-size': 11, 'font-family': 'var(--mono)', fill: 'var(--muted)' }, A.fmt(v)));
        });
        const ytv = (() => { const vals = ROWS.map(B.get); const lo = Math.min(...vals), hi = Math.max(...vals); const out = []; for (let i = 0; i <= 4; i++) out.push(lo + (hi - lo) * i / 4); return out; })();
        ytv.forEach(v => {
          const y = ys(v);
          chart.append(svg('line', { x1: PL, y1: y, x2: W - PR, y2: y, stroke: 'var(--line)', 'stroke-width': 1 }));
          chart.append(svg('text', { x: PL - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 11, 'font-family': 'var(--mono)', fill: 'var(--muted)' }, B.fmt(v)));
        });
        chart.append(svg('text', { x: (PL + W - PR) / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': 12, 'font-family': 'var(--sans)', fill: 'var(--ink)' }, A.label));
        chart.append(svg('text', { x: 14, y: (PT + H - PB) / 2, 'text-anchor': 'middle', 'font-size': 12, 'font-family': 'var(--sans)', fill: 'var(--ink)', transform: `rotate(-90 14 ${(PT + H - PB) / 2})` }, B.label));
        ROWS.forEach(r => {
          const cx = xs(A.get(r)), cy = ys(B.get(r));
          const c = svg('circle', { cx, cy, r: r === hover ? 7 : 5, fill: `var(--${FDRY_TOKEN[r.fdry]})`, stroke: 'var(--panel)', 'stroke-width': 1, style: { cursor: 'pointer' }, tabindex: 0 },
            svg('title', null, `${r.node} — ${A.label}: ${A.fmt(A.get(r))}, ${B.label}: ${B.fmt(B.get(r))}`));
          c.addEventListener('mouseenter', () => setHover(r));
          c.addEventListener('focus', () => setHover(r));
          c.addEventListener('mouseleave', () => setHover(null));
          c.addEventListener('click', () => setHover(r));
          chart.append(c);
        });
      }
      function setHover(r) {
        hover = r;
        ROWS.forEach(row => row._tr.style.background = row === r ? 'var(--panel2)' : '');
        detail.textContent = r ? `${r.node} (${r.fdry}, ${r.year}) — CPP ${r.cpp} nm, min MP ${r.mp} nm, fin/sheet pitch ${r.fs}, density ${r.dens} MTr/mm², gate length ${r.gl}, ${r.euv} EUV layers, wafer price ${r.price}.` : 'Hover or tap a point (or a table row) for details.';
        drawChart();
      }
      xSel.addEventListener('change', () => { ax = xSel.value; drawChart(); });
      ySel.addEventListener('change', () => { ay = ySel.value; drawChart(); });

      // ---------- "3 nm at true scale" ----------
      const scaleBox = h('div');
      const scaleChk = h('input', { type: 'checkbox', on: { change: () => { trueScale = scaleChk.checked; renderScaleBox(); } } });
      function renderScaleBox() {
        scaleBox.innerHTML = '';
        scaleBox.hidden = !trueScale;
        if (!trueScale) return;
        const bars = [
          { label: '"3 nm" (the marketing name)', v: 3, tone: 'bad' },
          { label: 'actual gate length, ≈ 13 nm', v: 13, tone: 'accent' },
          { label: 'actual min. metal pitch, ≈ 23 nm', v: 23, tone: 'si' },
        ];
        const px = 12; // px per nm
        const bw = 680, bh = 26, gap = 14, left = 200;
        const bh_total = bars.length * (bh + gap);
        const s = svg('svg', { class: 'w-svg', viewBox: `0 0 ${bw} ${bh_total}`, role: 'img', 'aria-label': '3 nm marketing name vs actual dimensions, drawn to scale' });
        bars.forEach((b, i) => {
          const y = i * (bh + gap);
          s.append(svg('text', { x: left - 10, y: y + bh * 0.68, 'text-anchor': 'end', 'font-size': 11.5, 'font-family': 'var(--sans)', fill: 'var(--ink)' }, b.label));
          s.append(svg('rect', { x: left, y, width: Math.max(1.5, b.v * px), height: bh, fill: `var(--${b.tone})`, rx: 2 }));
          s.append(svg('text', { x: left + b.v * px + 6, y: y + bh * 0.68, 'font-size': 11.5, 'font-family': 'var(--mono)', fill: 'var(--muted)' }, b.v + ' nm'));
        });
        scaleBox.append(s, h('div', { class: 'w-note' }, 'Drawn at the same scale (12 px/nm). Node names label process generations, not literal printed dimensions. The illustrated gates and metal pitches are larger; deposited dielectric films can be 2 nm or thinner.'));
      }

      // ---------- density calculator ----------
      const cppIn = h('input', { type: 'range', min: 20, max: 100, step: 1, value: calc.cpp });
      const mpIn = h('input', { type: 'range', min: 15, max: 70, step: 1, value: calc.mp });
      const trIn = h('input', { type: 'range', min: 4, max: 9, step: 1, value: calc.tracks });
      const cppOut = h('output'), mpOut = h('output'), trOut = h('output');
      const calcStats = h('div', { class: 'w-readout' });
      const calcFormula = h('div', { class: 'w-formula' });
      function updateCalc() {
        calc.cpp = +cppIn.value; calc.mp = +mpIn.value; calc.tracks = +trIn.value;
        cppOut.textContent = calc.cpp + ' nm'; mpOut.textContent = calc.mp + ' nm'; trOut.textContent = calc.tracks + 'T';
        const cellH = calc.tracks * calc.mp;           // nm
        const nandW = 3 * calc.cpp;                    // nm, NAND2 ≈ 3 CPP wide
        const areaNm2 = cellH * nandW;                  // nm²
        const cellsPerMm2 = 1e12 / areaNm2;              // 1 mm² = 1e12 nm²
        const mtrPerMm2 = cellsPerMm2 * 4 / 1e6;         // NAND2 = 4 transistors
        calcStats.innerHTML = '';
        const stat = (v, l) => h('div', { class: 'w-stat' }, h('b', null, v), h('span', null, l));
        calcStats.append(
          stat(fmt(cellH, 0) + ' nm', 'cell height = tracks × MP'),
          stat(fmt(nandW, 0) + ' nm', 'NAND2 width = 3 × CPP'),
          stat(fmt(areaNm2 / 1e6, 4) + ' µm²', 'NAND2 cell area'),
          stat(fmt(cellsPerMm2 / 1e6, 1) + ' M', 'NAND2 cells / mm²'),
          stat(fmt(mtrPerMm2, 1), 'MTr/mm² (4 Tr per NAND2)'));
        calcFormula.innerHTML = `MTr/mm² = (4 / (3·CPP × tracks·MP)) × 10<sup>6</sup> = (4 / (${nandW}×${cellH} nm²)) × 10<sup>6</sup> ≈ ${fmt(mtrPerMm2, 1)}`;
      }
      [cppIn, mpIn, trIn].forEach(inp => inp.addEventListener('input', updateCalc));

      // ---------- assemble ----------
      el.append(
        h('h5', { style: hStyle() }, 'Full node table'),
        tableWrap,
        h('h5', { style: hStyle() }, 'Node metrics, plotted'),
        h('div', { class: 'w-controls' },
          h('label', { class: 'w-ctl' }, h('span', null, 'X axis'), xSel, h('output')),
          h('label', { class: 'w-ctl' }, h('span', null, 'Y axis'), ySel, h('output'))),
        chart, legend, detail,
        h('label', { class: 'w-ctl', style: { maxWidth: '320px', margin: '10px 0' } }, h('span', null, 'Show "3 nm" at true scale'), scaleChk, h('output')),
        scaleBox,
        h('h5', { style: hStyle() }, 'Density calculator: NAND2 from CPP and cell height'),
        h('div', { class: 'w-controls' },
          h('label', { class: 'w-ctl' }, h('span', null, 'CPP'), cppIn, cppOut),
          h('label', { class: 'w-ctl' }, h('span', null, 'Metal pitch'), mpIn, mpOut),
          h('label', { class: 'w-ctl' }, h('span', null, 'Tracks'), trIn, trOut)),
        calcStats, calcFormula,
        h('div', { class: 'w-note' }, 'Formula from Module 11: a NAND2 standard cell is ≈ 3 CPP wide and one cell-height tall (height = tracks × minimum metal pitch); it contains 4 transistors. Try CPP 57 / MP 40 / 6T for TSMC N7 (should read ≈ 97.5 MTr/mm², matching the module’s worked example) or CPP 51 / MP 30 / 6T for N5 (≈ 145 MTr/mm²).'));

      function hStyle() { return { margin: '18px 0 4px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }; }

      drawChart();
      renderScaleBox();
      updateCalc();
      ctx.onTheme(drawChart);
      return () => {};
    }
  });
})();
