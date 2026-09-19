/* Widget: test-cost — "Test Economics" (Module 14) */
(function () {
  'use strict';
  const RULE_OF_TEN = [
    { label: 'Wafer sort', mult: 1, tone: 'ok' },
    { label: 'Package (final) test', mult: 10, tone: 'si' },
    { label: 'Board test', mult: 100, tone: 'warn' },
    { label: 'System / field', mult: 1000, tone: 'bad' },
  ];

  window.registerWidget('test-cost', {
    title: 'Test Economics',
    caption: 'What a sort cell costs per second, how that turns into dollars per good die, and why a defect caught later can become more expensive downstream.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const st = { cap: 5, years: 5, util: 85, tTime: 60, sites: 1, dpw: 60, yield: 85, dieCost: 300, cov: 99, dppmYield: 85 };

      // ---------- panel 1: cost per die ----------
      const num = (v, min, max, step) => h('input', { type: 'range', min, max, step, value: v });
      const capIn = num(st.cap, 0.5, 15, 0.1), yrIn = num(st.years, 1, 10, 1), utilIn = num(st.util, 30, 100, 1);
      const tIn = num(st.tTime, 1, 300, 1), sitesIn = num(st.sites, 1, 16, 1), dpwIn = num(st.dpw, 4, 200, 1);
      const yieldIn = num(st.yield, 20, 100, 1), costIn = num(st.dieCost, 5, 1000, 5);
      const outs = {}; ['cap', 'yr', 'util', 't', 'sites', 'dpw', 'yield', 'cost'].forEach(k => outs[k] = h('output'));
      const controls1 = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Tester + prober'), capIn, outs.cap),
        h('label', { class: 'w-ctl' }, h('span', null, 'Depreciation'), yrIn, outs.yr),
        h('label', { class: 'w-ctl' }, h('span', null, 'Utilization'), utilIn, outs.util),
        h('label', { class: 'w-ctl' }, h('span', null, 'Test time / die'), tIn, outs.t),
        h('label', { class: 'w-ctl' }, h('span', null, 'Parallel sites'), sitesIn, outs.sites),
        h('label', { class: 'w-ctl' }, h('span', null, 'Dies / wafer'), dpwIn, outs.dpw),
        h('label', { class: 'w-ctl' }, h('span', null, 'Sort yield'), yieldIn, outs.yield),
        h('label', { class: 'w-ctl' }, h('span', null, 'Die cost'), costIn, outs.cost));
      const readout1 = h('div', { class: 'w-readout' });
      const formula1 = h('div', { class: 'w-formula' });
      let lastTestCostPerDie = 0;

      function updatePanel1() {
        st.cap = +capIn.value; st.years = +yrIn.value; st.util = +utilIn.value; st.tTime = +tIn.value;
        st.sites = +sitesIn.value; st.dpw = +dpwIn.value; st.yield = +yieldIn.value; st.dieCost = +costIn.value;
        outs.cap.textContent = '$' + fmt(st.cap, 1) + 'M'; outs.yr.textContent = st.years + ' yr'; outs.util.textContent = st.util + ' %';
        outs.t.textContent = st.tTime + ' s'; outs.sites.textContent = st.sites; outs.dpw.textContent = st.dpw;
        outs.yield.textContent = st.yield + ' %'; outs.cost.textContent = '$' + fmt(st.dieCost, 0);

        const annualCost = st.cap * 1e6 / st.years;
        const prodHours = (st.util / 100) * 8760;
        const costPerHr = annualCost / prodHours;
        const costPerSec = costPerHr / 3600;
        const testCostPerDie = costPerSec * st.tTime / st.sites;
        const testCostPerGood = testCostPerDie / (st.yield / 100);
        const pctOfDie = testCostPerDie / st.dieCost * 100;
        const hoursPerWafer = (st.dpw * st.tTime / st.sites) / 3600;
        lastTestCostPerDie = testCostPerDie;

        readout1.innerHTML = '';
        const stat = (v, l) => h('div', { class: 'w-stat' }, h('b', null, v), h('span', null, l));
        readout1.append(
          stat('$' + fmt(costPerSec, 4), 'cost per tester-second'),
          stat('$' + fmt(testCostPerDie, 3), 'test cost per die'),
          stat('$' + fmt(testCostPerGood, 3), 'test cost per good die'),
          stat(fmt(pctOfDie, 1) + ' %', 'test cost as % of die cost'),
          stat(fmt(hoursPerWafer, 2) + ' h', 'to sort one wafer'));
        formula1.innerHTML = 'cost/s = (capital / years) / (utilization × 8760 h) / 3600. Test $/die = cost/s × time / sites. $/good die = ($/die) / yield. This is a depreciation-only model — Module 14’s fuller worked example also folds in probe-card spend, maintenance (~8%/yr) and floor/labor, which is why its GPU cell lands near $0.108/tester-second and ~$26/die at 240 s single-site, versus the bare-depreciation figure here.';
        drawRuleChart();
      }
      [capIn, yrIn, utilIn, tIn, sitesIn, dpwIn, yieldIn, costIn].forEach(inp => inp.addEventListener('input', updatePanel1));

      // ---------- panel 2: DPPM escapes (Williams–Brown) ----------
      const covIn = num(st.cov, 90, 99.999, 0.001);
      const dyIn = num(st.dppmYield, 20, 100, 1);
      const covOut = h('output'), dyOut = h('output');
      const readout2 = h('div', { class: 'w-readout' });
      const formula2 = h('div', { class: 'w-formula' });
      const dppmChart = svg('svg', { class: 'w-svg', viewBox: '0 0 640 260', role: 'img', 'aria-label': 'DPPM vs fault coverage' });
      function dl(Y, T) { return 1 - Math.pow(Y, 1 - T); }
      function updatePanel2() {
        st.cov = +covIn.value; st.dppmYield = +dyIn.value;
        covOut.textContent = fmt(st.cov, 3) + ' %'; dyOut.textContent = st.dppmYield + ' %';
        const Y = st.dppmYield / 100, T = st.cov / 100;
        const DPPM = dl(Y, T) * 1e6;
        readout2.innerHTML = '';
        const stat = (v, l) => h('div', { class: 'w-stat' }, h('b', null, v), h('span', null, l));
        readout2.append(stat(fmt(DPPM, DPPM < 10 ? 2 : 0), 'defective parts per million'), stat(fmt(dl(Y, T) * 100, 4) + ' %', 'defect level DL'));
        formula2.innerHTML = 'DL = 1 − Y<sup>(1−T)</sup> (Williams–Brown), DPPM = DL × 10⁶. At Y = ' + fmt(Y * 100, 0) + '% and T = ' + fmt(T * 100, 3) + '%: DL = 1 − ' + fmt(Y, 2) + '<sup>' + fmt(1 - T, 4) + '</sup> ≈ ' + fmt(DPPM, 0) + ' DPPM.';
        drawDppmChart(Y);
      }
      function drawDppmChart(Y) {
        dppmChart.innerHTML = '';
        const PL = 82, PR = 42, PT = 22, PB = 46, W = 640, H = 260;
        const covs = []; for (let c = 90; c <= 99.999; c += (99.999 - 90) / 200) covs.push(c);
        const xOf = c => PL + (c - 90) / (99.999 - 90) * (W - PL - PR);
        const dppmVals = covs.map(c => Math.max(1e-3, dl(Y, c / 100) * 1e6));
        const logMax = Math.ceil(Math.log10(Math.max(...dppmVals, 10))), logMin = -3;
        const yOf = v => PT + (1 - (Math.log10(Math.max(v, 1e-3)) - logMin) / (logMax - logMin)) * (H - PT - PB);
        for (let e = logMin; e <= logMax; e++) {
          const v = Math.pow(10, e), y = yOf(v);
          dppmChart.append(svg('line', { x1: PL, y1: y, x2: W - PR, y2: y, stroke: 'var(--line)', 'stroke-width': 1 }));
          dppmChart.append(svg('text', { x: PL - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 11, 'font-family': 'var(--mono)', fill: 'var(--muted)' }, fmt(v, e < 0 ? -e : 0)));
        }
        [90, 92, 94, 96, 98, 99.999].forEach(c => {
          const x = xOf(c);
          dppmChart.append(svg('text', { x, y: H - PB + 16, 'text-anchor': 'middle', 'font-size': 12, 'font-family': 'var(--mono)', fill: 'var(--muted)' }, fmt(c, c >= 99 ? 3 : 0)));
        });
        const pts = covs.map((c, i) => [xOf(c), yOf(dppmVals[i])]);
        dppmChart.append(svg('polyline', { points: pts.map(p => p.join(',')).join(' '), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5 }));
        const cx = xOf(st.cov), cy = yOf(dl(Y, st.cov / 100) * 1e6);
        dppmChart.append(svg('circle', { cx, cy, r: 5, fill: 'var(--accent)', stroke: 'var(--panel)', 'stroke-width': 1.5 }));
        dppmChart.append(svg('text', { x: (PL + W - PR) / 2, y: H - 4, 'text-anchor': 'middle', 'font-size': 12, 'font-family': 'var(--sans)', fill: 'var(--ink)' }, 'stuck-at fault coverage T (%)'));
        dppmChart.append(svg('text', { x: 16, y: (PT + H - PB) / 2, 'text-anchor': 'middle', 'font-size': 12, 'font-family': 'var(--sans)', fill: 'var(--ink)', transform: `rotate(-90 16 ${(PT + H - PB) / 2})` }, 'DPPM (log; zero shown at floor)'));
      }
      covIn.addEventListener('input', updatePanel2); dyIn.addEventListener('input', updatePanel2);

      // ---------- panel 3: rule of ten ----------
      const ruleChart = svg('svg', { class: 'w-svg', viewBox: '0 0 640 240', role: 'img', 'aria-label': 'Cost of a bad die by the stage it is caught' });
      const ruleNote = h('div', { class: 'w-note' });
      function drawRuleChart() {
        ruleChart.innerHTML = '';
        const dieCost = st.dieCost || 300;
        const vals = RULE_OF_TEN.map(r => dieCost * r.mult);
        const PL = 16, PR = 16, PT = 16, PB = 46, W = 640, H = 240;
        const n = RULE_OF_TEN.length, gap = 30, barW = (W - PL - PR - gap * (n - 1)) / n;
        const logMax = Math.log10(Math.max(...vals)) + 0.15, logMin = Math.log10(Math.min(...vals)) - 0.3;
        const hOf = v => (Math.log10(v) - logMin) / (logMax - logMin) * (H - PT - PB);
        RULE_OF_TEN.forEach((r, i) => {
          const x = PL + i * (barW + gap), bh = hOf(vals[i]), y = H - PB - bh;
          ruleChart.append(svg('rect', { x, y, width: barW, height: bh, fill: `var(--${r.tone})`, rx: 3 }));
          ruleChart.append(svg('text', { x: x + barW / 2, y: y - 10, 'text-anchor': 'middle', 'font-size': 13, 'font-family': 'var(--mono)', 'font-weight': 600, fill: 'var(--ink)' }, '$' + fmt(vals[i], 0)));
          ruleChart.append(svg('text', { x: x + barW / 2, y: H - PB + 18, 'text-anchor': 'middle', 'font-size': 11.5, 'font-family': 'var(--sans)', fill: 'var(--muted)' }, r.label));
          ruleChart.append(svg('text', { x: x + barW / 2, y: H - PB + 32, 'text-anchor': 'middle', 'font-size': 12, 'font-family': 'var(--mono)', fill: 'var(--muted)' }, '×' + fmt(r.mult, 0)));
        });
        ruleNote.textContent = `Bars scaled logarithmically from a $${fmt(dieCost, 0)} die (from panel 1): the "rule of ten" is an illustrative escalation heuristic, not a measured law or a universal multiplier.`;
      }

      // ---------- assemble ----------
      function sh(t) { return h('h5', { style: { margin: '22px 0 4px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' } }, t); }
      el.append(
        sh('Panel 1 — cost per die at sort'), controls1, readout1, formula1,
        sh('Panel 2 — DPPM escapes (Williams–Brown)'),
        h('div', { class: 'w-controls' },
          h('label', { class: 'w-ctl' }, h('span', null, 'Fault coverage T'), covIn, covOut),
          h('label', { class: 'w-ctl' }, h('span', null, 'Yield Y'), dyIn, dyOut)),
        readout2, dppmChart, formula2,
        sh('Panel 3 — the rule of ten'), ruleChart, ruleNote);

      updatePanel1();
      updatePanel2();
      ctx.onTheme(() => { drawDppmChart(st.dppmYield / 100); drawRuleChart(); });
      return () => {};
    }
  });
})();
