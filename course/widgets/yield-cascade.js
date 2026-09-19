/* Widget: yield-cascade — "Compounded Yield Through the Chain" (Modules 13, 18) */
(function () {
  'use strict';
  // Cumulative $ invested per unit once it ENTERS each stage's test (Module 18 §"Yield Fallout Along the Chain").
  const STAGES = [
    { key: 'sort', label: 'Wafer sort', short: 'Sort', def: 65, min: 30, max: 95, value: 300 },
    { key: 'assembly', label: 'Assembly (CoWoS)', short: 'Assembly', def: 98, min: 85, max: 100, value: 2800 },
    { key: 'ft', label: 'Final test', short: 'FT', def: 95, min: 80, max: 100, value: 2800 },
    { key: 'burnin', label: 'Burn-in', short: 'BI', def: 99, min: 90, max: 100, value: 2800 },
    { key: 'slt', label: 'SLT', short: 'SLT', def: 98, min: 90, max: 100, value: 2800 },
    { key: 'module', label: 'Module test', short: 'Module', def: 99, min: 90, max: 100, value: 4300 },
    { key: 'rack', label: 'Rack test', short: 'Rack', def: 99.5, min: 90, max: 100, value: 9300 },
  ];
  const VALUE_CHAIN = [
    ['Die (post-sort)', 300],
    ['+ HBM / CoWoS assembly', 2500],
    ['+ Module (SXM)', 1500],
    ['+ Board share', 5000],
    ['+ Rack share', 30000],
  ];
  const kB = 8.617333e-5; // eV/K

  window.registerWidget('yield-cascade', {
    title: 'Compounded Yield Through the Chain',
    caption: 'Slide each stage\'s yield and watch how few starts survive to become a shipped rack unit — and how the cost of failure grows the further downstream it happens.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const st = {};
      STAGES.forEach(s => st[s.key] = s.def);

      // ---------- yield sliders ----------
      const outs = {}, inputs = {};
      const ctl = h('div', { class: 'w-controls' });
      STAGES.forEach(s => {
        const inp = h('input', { type: 'range', min: s.min, max: s.max, step: 0.1, value: s.def });
        const out = h('output');
        inputs[s.key] = inp; outs[s.key] = out;
        ctl.append(h('label', { class: 'w-ctl' }, h('span', null, s.label), inp, out));
      });

      const rCum = h('b'), rSurv = h('b');
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, rCum, h('span', null, 'compounded yield, sort → rack')),
        h('div', { class: 'w-stat' }, rSurv, h('span', null, 'survivors per 1,000 wafer-sort starts')));
      const formula = h('div', { class: 'w-formula' }, 'Y_total = Y_sort × Y_assembly × Y_FT × Y_burn-in × Y_SLT × Y_module × Y_rack');

      // ---------- Sankey-style funnel ----------
      const funnel = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Yield funnel from wafer sort to rack' });

      // ---------- cost of fallout ----------
      const chainTable = h('table');
      chainTable.append(h('tr', null, h('th', null, 'Value chain checkpoint'), h('th', null, 'Cumulative $ / unit')));
      VALUE_CHAIN.forEach(([label, add], i) => {
        const cum = VALUE_CHAIN.slice(0, i + 1).reduce((a, r) => a + r[1], 0);
        chainTable.append(h('tr', null, h('td', null, label), h('td', null, '$' + fmt(cum, 0) + ' (+$' + fmt(add, 0) + ')')));
      });
      const falloutTable = h('table', { style: { minWidth: '560px' } });
      falloutTable.append(h('tr', null, ...['Stage', 'Yield', 'Lost / 1,000 starts', '$ / unit at risk', '$ scrapped / 1,000 starts'].map(x => h('th', null, x))));
      const falloutRows = {};
      STAGES.forEach(s => { const tr = h('tr', null, h('td', null, s.label), h('td'), h('td'), h('td', null, '$' + fmt(s.value, 0)), h('td')); [...tr.children].slice(1).forEach(cell => cell.style.whiteSpace = 'nowrap'); falloutTable.append(tr); falloutRows[s.key] = tr; });
      const rTotalScrap = h('b');

      // ---------- Arrhenius calculator ----------
      const inEa = h('input', { type: 'range', min: 0.3, max: 1.0, step: 0.01, value: 0.7 });
      const outEa = h('output');
      const inTs = h('input', { type: 'range', min: 85, max: 150, step: 1, value: 125 });
      const outTs = h('output');
      const inTu = h('input', { type: 'range', min: 40, max: 70, step: 1, value: 55 });
      const outTu = h('output');
      const inBI = h('input', { type: 'range', min: 4, max: 48, step: 1, value: 24 });
      const outBI = h('output');
      const arCtl = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Activation energy Ea'), inEa, outEa),
        h('label', { class: 'w-ctl' }, h('span', null, 'Burn-in temp T_stress'), inTs, outTs),
        h('label', { class: 'w-ctl' }, h('span', null, 'Field-use temp T_use'), inTu, outTu),
        h('label', { class: 'w-ctl' }, h('span', null, 'Burn-in duration'), inBI, outBI));
      const rAF = h('b'), rField = h('b');
      const arReadout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, rAF, h('span', null, 'acceleration factor (field-h per burn-in h)')),
        h('div', { class: 'w-stat' }, rField, h('span', null, 'equivalent field time for this burn-in')));
      const arFormula = h('div', { class: 'w-formula', html: 'AF = exp[ (E<sub>a</sub>/k) · (1/T<sub>use</sub> − 1/T<sub>stress</sub>) ] &nbsp;, k = 8.617×10⁻⁵ eV/K (temperatures in kelvin)' });

      function updateArrhenius() {
        const ea = +inEa.value, ts = +inTs.value + 273.15, tu = +inTu.value + 273.15, bi = +inBI.value;
        outEa.textContent = fmt(ea, 2) + ' eV'; outTs.textContent = fmt(+inTs.value, 0) + ' °C'; outTu.textContent = fmt(+inTu.value, 0) + ' °C'; outBI.textContent = fmt(bi, 0) + ' h';
        const af = Math.exp((ea / kB) * (1 / tu - 1 / ts));
        rAF.textContent = '×' + fmt(af, af < 10 ? 1 : 0);
        const fieldH = af * bi, months = fieldH / (24 * 30);
        rField.textContent = fmt(bi, 0) + ' h → ' + fmt(fieldH, 0) + ' field-h (≈ ' + (months < 1 ? fmt(months * 30, 1) + ' days' : fmt(months, 1) + ' months') + ')';
      }
      [inEa, inTs, inTu, inBI].forEach(i => i.addEventListener('input', updateArrhenius));

      // ---------- drawing + compute ----------
      function drawFunnel(counts) {
        const W = 720, H = 240, x0 = 50, x1 = 655, midY = 90, maxHalf = 55;
        funnel.setAttribute('viewBox', `0 0 ${W} ${H}`);
        funnel.innerHTML = '';
        const n = STAGES.length, segW = (x1 - x0) / n;
        const xs = counts.map((_, i) => x0 + i * segW);
        const halfH = c => Math.max(1, (c / 1000) * maxHalf);
        // main funnel band
        let top = xs.map((x, i) => `${x.toFixed(1)},${(midY - halfH(counts[i])).toFixed(1)}`);
        let bot = xs.map((x, i) => `${x.toFixed(1)},${(midY + halfH(counts[i])).toFixed(1)}`).reverse();
        funnel.append(svg('polygon', { points: top.concat(bot).join(' '), fill: 'var(--accent)', 'fill-opacity': 0.75, stroke: 'var(--panel)', 'stroke-width': 0.8 }));
        // stage boundary fallout wedges + labels
        STAGES.forEach((s, i) => {
          const xIn = xs[i], xOut = xs[i + 1];
          const before = counts[i], after = counts[i + 1], lost = before - after;
          const hb = halfH(before);
          const wedgeH = 8 + Math.min(60, (lost / 1000) * 400);
          if (lost > 0.5) {
            funnel.append(svg('polygon', {
              points: `${xOut.toFixed(1)},${(midY + halfH(after)).toFixed(1)} ${xOut.toFixed(1)},${(midY + hb).toFixed(1)} ${xOut.toFixed(1)},${(midY + hb + wedgeH).toFixed(1)}`,
              fill: 'var(--bad)', 'fill-opacity': 0.55,
            }));
          }
          const scrap = (lost / 1000) * s.value;
          funnel.append(svg('text', { x: (xIn + xOut) / 2, y: midY + hb + wedgeH + 13, 'text-anchor': 'middle', 'font-size': 10, 'font-family': 'var(--mono)', fill: 'var(--bad)' }, '−' + fmt(lost, lost < 10 ? 1 : 0)));
          funnel.append(svg('text', { x: (xIn + xOut) / 2, y: 16, 'text-anchor': 'middle', 'font-size': 10, 'font-family': 'var(--sans)', fill: 'var(--muted)' }, s.short));
          if (falloutRows[s.key]) {
            falloutRows[s.key].children[1].textContent = fmt(st[s.key], 1) + '%';
            falloutRows[s.key].children[2].textContent = fmt(lost, lost < 10 ? 2 : 0);
            falloutRows[s.key].children[4].textContent = '$' + fmt(scrap, 0);
          }
        });
        // start/end counts, drawn INSIDE the band (never above it, where the per-stage names live)
        funnel.append(svg('text', { x: xs[0] + 10, y: midY + 4, 'text-anchor': 'start', 'font-size': 11.5, 'font-family': 'var(--mono)', 'font-weight': 600, fill: 'var(--panel)' }, '1,000'));
        funnel.append(svg('text', { x: xs[n] - 10, y: midY + 4, 'text-anchor': 'end', 'font-size': 11.5, 'font-family': 'var(--mono)', 'font-weight': 600, fill: 'var(--panel)' }, fmt(counts[n], 1)));
        funnel.append(svg('text', { x: xs[n] + 10, y: midY + 4, 'text-anchor': 'start', 'font-size': 11, 'font-family': 'var(--sans)', fill: 'var(--ok)', 'font-weight': 600 }, 'shipped'));
        return H;
      }

      function update() {
        let cum = 1;
        const counts = [1000];
        STAGES.forEach(s => { st[s.key] = +inputs[s.key].value; outs[s.key].textContent = fmt(st[s.key], 1) + '%'; cum *= st[s.key] / 100; counts.push(1000 * cum); });
        rCum.textContent = fmt(cum * 100, 2) + '%';
        rSurv.textContent = fmt(counts[counts.length - 1], 1);
        drawFunnel(counts);
        let totalScrap = 0;
        for (let i = 0; i < STAGES.length; i++) totalScrap += (counts[i] - counts[i + 1]) / 1000 * STAGES[i].value;
        rTotalScrap.textContent = '$' + fmt(totalScrap, 0);
      }
      STAGES.forEach(s => inputs[s.key].addEventListener('input', update));

      el.append(ctl, readout, formula, funnel,
        h('h5', { style: { margin: '18px 0 4px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' } }, 'Value added along the chain'),
        h('div', { class: 'table-scroll' }, chainTable),
        h('h5', { style: { margin: '18px 0 4px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' } }, 'Cost of fallout (the "rule of tens": the same failure costs an order of magnitude more the later it is caught)'),
        h('div', { class: 'table-scroll' }, falloutTable),
        h('div', { class: 'w-readout' }, h('div', { class: 'w-stat' }, rTotalScrap, h('span', null, 'total $ scrapped per 1,000 wafer-sort starts'))),
        h('h5', { style: { margin: '18px 0 4px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' } }, 'Arrhenius acceleration: how many field-hours does one burn-in hour buy?'),
        arCtl, arReadout, arFormula,
        h('div', { class: 'w-note' }, 'Defaults: 0.7 eV is JEDEC\'s generic infant-mortality activation energy (JESD47/AEC-Q100); 125 °C burn-in vs. 55 °C field use gives AF ≈ 78, so a 24 h burn-in screens roughly 5 months of field operation (Module 18).'));
      update();
      updateArrhenius();
    }
  });
})();
