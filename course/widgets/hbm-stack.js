/* Widget: hbm-stack — "Build an HBM Stack" (Module 15) */
(function () {
  'use strict';
  // Per-generation constraints (Module 15 §4.2, table + worked examples).
  const GEN = {
    HBM2E: { year: '2020', width: 1024, heights: [4, 8], dies: [8, 16], rate: { min: 3.2, max: 3.6, step: 0.1, def: 3.6 }, ceiling: 720 },
    HBM3: { year: '2022', width: 1024, heights: [8, 12], dies: [16, 24], rate: { min: 5.6, max: 6.4, step: 0.1, def: 6.4 }, ceiling: 720 },
    HBM3E: { year: '2024', width: 1024, heights: [8, 12], dies: [16, 24, 32], rate: { min: 8.0, max: 9.2, step: 0.1, def: 9.2 }, ceiling: 720 },
    HBM4: { year: '2026', width: 2048, heights: [12, 16], dies: [24, 32], rate: { min: 8, max: 11, step: 0.5, def: 8 }, ceiling: 775 },
  };
  // Full JEDEC generation table (Module 15 §4.2) for the reference table, incl. rows the controls can't reach.
  const TABLE = [
    ['HBM1', '2015', '4', '1,024-bit', '1.0', '128 GB/s', '1 GB'],
    ['HBM2', '2016–18', '4–8', '1,024-bit', '2.0–2.4', '256–307 GB/s', '8 GB'],
    ['HBM2E', '2020', '8', '1,024-bit', '3.2–3.6', '410–460 GB/s', '16 GB'],
    ['HBM3', '2022', '8–12', '1,024-bit', '6.4', '819 GB/s', '24 GB'],
    ['HBM3E', '2024', '8–12', '1,024-bit', '8.0–9.2', '1.0–1.2 TB/s', '24–36 GB'],
    ['HBM4', '2026', '12–16', '2,048-bit', '8–11+', '2.0–2.8 TB/s', '36–48 GB (64 w/ 32Gb dies)'],
    ['HBM4E', '~2027–28', '16', '2,048-bit', '10–16', '2.5–4 TB/s', '48–64 GB'],
  ];
  const dieThk = h => (h <= 4 ? 60 : h === 8 ? 50 : h === 12 ? 45 : 30);
  const gapThk = (hybrid, bond, h) => (hybrid ? 2 : bond === 'tcncf' ? 15 : h >= 12 ? 10 : 13);
  const BASE_DIE = 40; // µm, thinned base/logic die

  window.registerWidget('hbm-stack', {
    title: 'Build an HBM Stack',
    caption: 'Pick a generation, stack height, die capacity and bonding method; watch the cross-section and the JEDEC height budget respond.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const st = { gen: 'HBM3E', height: 12, dieGb: 24, rate: GEN.HBM3E.rate.def, bond: 'mrmuf', hybrid: false, nStacks: 8 };

      // ---------- controls ----------
      const selGen = h('select', { 'aria-label': 'HBM generation' });
      Object.keys(GEN).forEach(g => selGen.append(h('option', { value: g }, g)));
      const selHeight = h('select', { 'aria-label': 'Stack height' });
      const selDie = h('select', { 'aria-label': 'Per-die capacity' });
      const inRate = h('input', { type: 'range', 'aria-label': 'Pin data rate' });
      const outRate = h('output');
      const inN = h('input', { type: 'range', min: 4, max: 12, step: 1, value: st.nStacks, 'aria-label': 'Stacks per GPU' });
      const outN = h('output');
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Generation'), selGen, h('output')),
        h('label', { class: 'w-ctl' }, h('span', null, 'Stack height'), selHeight, h('output')),
        h('label', { class: 'w-ctl' }, h('span', null, 'Per-die capacity'), selDie, h('output')),
        h('label', { class: 'w-ctl' }, h('span', null, 'Pin data rate'), inRate, outRate),
        h('label', { class: 'w-ctl' }, h('span', null, 'Stacks on GPU'), inN, outN));

      const bondName = 'hbm-bond-' + Math.random().toString(36).slice(2);
      const bondTC = h('input', { type: 'radio', name: bondName, value: 'tcncf' });
      const bondMR = h('input', { type: 'radio', name: bondName, value: 'mrmuf', checked: true });
      const hybridBox = h('input', { type: 'checkbox', 'aria-label': 'Hybrid bonding' });
      const bondRow = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl', style: { minWidth: '140px', flex: '0 0 auto' } }, h('span', null, 'TC-NCF'), bondTC, h('output')),
        h('label', { class: 'w-ctl', style: { minWidth: '140px', flex: '0 0 auto' } }, h('span', null, 'MR-MUF'), bondMR, h('output')),
        h('label', { class: 'w-ctl', style: { minWidth: '180px', flex: '0 0 auto' } }, h('span', null, 'Hybrid bond (no bumps)'), hybridBox, h('output')));
      const bondNote = h('div', { class: 'w-note' });

      // ---------- readouts ----------
      const rBw = h('b'), rCap = h('b'), rTotBw = h('b'), rTotCap = h('b'), rThk = h('b'), rHeight = h('b');
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, rBw, h('span', null, 'bandwidth / stack')),
        h('div', { class: 'w-stat' }, rCap, h('span', null, 'capacity / stack')),
        h('div', { class: 'w-stat' }, rTotBw, h('span', null, 'total GPU bandwidth')),
        h('div', { class: 'w-stat' }, rTotCap, h('span', null, 'total GPU HBM capacity')),
        h('div', { class: 'w-stat' }, rThk, h('span', null, 'fixed die thickness in this model')),
        h('div', { class: 'w-stat' }, rHeight, h('span', null, 'stack height vs. JEDEC ceiling')));
      const formula = h('div', { class: 'w-formula', html: 'BW/stack = width × rate ÷ 8 &nbsp;·&nbsp; capacity/stack = height × die_Gb ÷ 8 &nbsp;·&nbsp; height_stack = N·(t<sub>die</sub> + t<sub>gap</sub>) + t<sub>base</sub>' });

      // ---------- cross-section SVG ----------
      const VBW = 300, VBH = 310;
      const takeaway = h('div', { class: 'w-insight', 'aria-live': 'polite' });
      const xsec = svg('svg', { class: 'w-svg', viewBox: `0 0 ${VBW} ${VBH}`, role: 'img', 'aria-label': 'HBM stack cross-section' });
      const legend = h('div', { class: 'w-legend' },
        ...[['var(--si)', 'core DRAM die'], ['var(--accent2)', 'base / logic die'], ['var(--cu)', 'TSV'], ['var(--warn)', 'microbump + underfill'], ['var(--ok)', 'hybrid Cu-Cu bond'], ['var(--line2)', 'Si interposer']]
          .map(([c, t]) => h('span', { class: 'w-legend-item' }, h('i', { style: { background: c } }), t)));

      function drawStack(g) {
        const dt = dieThk(st.height), gap = gapThk(st.hybrid, st.bond, st.height);
        const totalUm = st.height * (dt + gap) + BASE_DIE, ceiling = GEN[st.gen].ceiling;
        const px = um => um * 230 / 900, baseY = 270, x = 104, width = 92;
        const over = totalUm > ceiling;
        const label = (lx, ly, text, color = 'var(--muted)', anchor = 'start') => svg('text', { x: lx, y: ly, 'font-size': 14, 'font-family': 'var(--sans)', fill: color, 'text-anchor': anchor }, text);
        const line = (x1, y1, x2, y2, color = 'var(--muted)') => svg('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': 1 });
        const ceilY = baseY - px(ceiling);
        const top = Math.min(ceilY, baseY - px(totalUm)) - 42;
        xsec.setAttribute('viewBox', `0 ${top} 300 ${316 - top}`);
        g.append(label(8, ceilY - 22, `${ceiling} µm height budget`));
        g.append(svg('rect', { x: x - 14, y: baseY, width: width + 28, height: 14, fill: 'var(--line2)' }), label(150, 303, 'Silicon interposer', 'var(--muted)', 'middle'));
        let y = baseY - px(BASE_DIE);
        g.append(svg('rect', { x, y, width, height: px(BASE_DIE), fill: 'var(--accent2)' }),
          line(50, baseY - 3, x - 3, baseY - 5), label(8, baseY - 9, 'Base die'));
        let middle = 0;
        for (let i = 0; i < st.height; i++) {
          y -= px(gap);
          g.append(svg('rect', { x, y, width, height: px(gap), fill: st.hybrid ? 'var(--ok)' : 'var(--warn)' }));
          y -= px(dt);
          g.append(svg('rect', { x, y, width, height: px(dt), fill: 'var(--si)' }));
          for (let k = 1; k <= 4; k++) g.append(line(x + width * k / 5, y + 1, x + width * k / 5, y + px(dt) - 1, 'var(--cu)'));
          if (i === Math.floor(st.height / 2)) middle = y + px(dt) / 2;
        }
        g.append(svg('line', { x1: x - 18, y1: ceilY, x2: x + width + 18, y2: ceilY, stroke: 'var(--bad)', 'stroke-dasharray': '4 3', 'stroke-width': 1.4 }),
          svg('line', { x1: x - 6, y1: y, x2: x + width + 6, y2: y, stroke: over ? 'var(--bad)' : 'var(--ok)', 'stroke-width': 2 }),
          label(208, y + 12, `${fmt(totalUm, 0)} µm`, over ? 'var(--bad)' : 'var(--ok)'));
        g.append(line(92, middle - 20, x, middle), label(90, middle - 24, `Die ${fmt(dt, 0)} µm`, 'var(--muted)', 'end'),
          line(92, middle + 14, x, middle + px(dt) / 2), label(90, middle + 29, `${st.hybrid ? 'Bond' : 'Gap'} ${fmt(gap, 0)} µm`, 'var(--muted)', 'end'));
        const viaY = Math.min(baseY - 60, y + 60);
        g.append(line(x + width * .8, viaY, 220, viaY + 15, 'var(--cu)'), label(210, viaY + 34, 'Copper vias', 'var(--ink)'), label(210, viaY + 51, '(TSVs)'));
        return { totalUm, ceiling, over };
      }

      // ---------- generation table ----------
      const tableWrap = h('div', { class: 'table-scroll', style: { margin: '0' } });
      function buildTable() {
        tableWrap.innerHTML = '';
        const t = h('table');
        t.append(h('tr', null, ...['Gen', 'Year', 'Height', 'Interface', 'Rate (Gbps)', 'BW/stack', 'Max capacity'].map(x => h('th', null, x))));
        TABLE.forEach(row => {
          const on = row[0] === st.gen;
          t.append(h('tr', { style: on ? { background: 'var(--accent-soft)', fontWeight: '600' } : null }, ...row.map(c => h('td', null, c))));
        });
        tableWrap.append(t);
      }

      const bondCaptions = {
        tcncf: 'TC-NCF (Samsung): a pre-laminated epoxy film covers each die\'s bumps; a thermo-compression bonder presses and cures one die at a time (5–15 s at 250–300 °C). Underfill is in place before the joint forms, but it is serial and heat/warpage on thin dies made 12-high qualification hard.',
        mrmuf: 'MR-MUF (SK hynix): all dies are placed with flux, then the whole stack passes through one mass-reflow oven and an epoxy molding compound is injection-filled around every gap afterward. Parallel joint formation (2–3× TC-NCF throughput) and ~2× the thermal conductivity of NCF, at the cost of void-free mold flow into a shrinking gap.',
      };
      function bondText() {
        if (st.hybrid) return 'Hybrid bonding: dies are planarized to a dielectric with recessed Cu pads and fused Cu-Cu at room temperature plus a 200–300 °C anneal — no solder, no underfill, no gap. Frees up ~190 µm of height budget versus microbumps, enough for 20-high stacks or much thicker dies, but demands sub-nm surface roughness and ±0.1–0.2 µm placement. Not yet used in production HBM (expected HBM4E/HBM5, ~2027–2029).';
        return bondCaptions[st.bond];
      }

      // ---------- wiring ----------
      function refreshOptions() {
        const g = GEN[st.gen];
        selHeight.innerHTML = ''; g.heights.forEach(hh => selHeight.append(h('option', { value: hh }, hh + '-high')));
        if (!g.heights.includes(st.height)) st.height = g.heights[g.heights.length - 1];
        selHeight.value = st.height;
        selDie.innerHTML = ''; g.dies.forEach(d => selDie.append(h('option', { value: d }, d + ' Gb')));
        if (!g.dies.includes(st.dieGb)) st.dieGb = g.dies[0];
        selDie.value = st.dieGb;
        inRate.min = g.rate.min; inRate.max = g.rate.max; inRate.step = g.rate.step;
        if (st.rate < g.rate.min || st.rate > g.rate.max) st.rate = g.rate.def;
        inRate.value = st.rate;
      }

      function update() {
        st.gen = selGen.value; st.height = +selHeight.value; st.dieGb = +selDie.value;
        st.rate = +inRate.value; st.nStacks = +inN.value;
        st.bond = bondTC.checked ? 'tcncf' : 'mrmuf'; st.hybrid = hybridBox.checked;
        bondTC.disabled = st.hybrid; bondMR.disabled = st.hybrid;

        const g = GEN[st.gen];
        const bwPerStack = g.width * st.rate / 8; // GB/s
        const capPerStack = st.height * st.dieGb / 8; // GB
        outRate.textContent = fmt(st.rate, GEN[st.gen].rate.step < 1 ? 1 : 0) + ' Gbps';
        outN.textContent = st.nStacks;

        rBw.textContent = bwPerStack >= 1000 ? fmt(bwPerStack / 1000, 2) + ' TB/s' : fmt(bwPerStack, 0) + ' GB/s';
        rCap.textContent = fmt(capPerStack, 0) + ' GB';
        const totBw = bwPerStack * st.nStacks, totCap = capPerStack * st.nStacks;
        rTotBw.textContent = totBw >= 1000 ? fmt(totBw / 1000, 2) + ' TB/s' : fmt(totBw, 0) + ' GB/s';
        rTotCap.textContent = totCap >= 1000 ? fmt(totCap / 1000, 2) + ' TB' : fmt(totCap, 0) + ' GB';

        xsec.innerHTML = '';
        const info = drawStack(xsec);
        rThk.textContent = fmt(dieThk(st.height), 0) + ' µm/die';
        rHeight.innerHTML = `${fmt(info.totalUm, 0)} / ${info.ceiling} µm` + (info.over ? ' <span style="color:var(--bad)">over</span>' : '');
        bondNote.textContent = bondText();
        takeaway.replaceChildren(h('b', null, rCap.textContent + ' per stack. '),
          `${st.height} memory dies share vertical copper connections. `,
          h('span', { style: { color: info.over ? 'var(--bad)' : 'var(--ink)' } }, info.over ? `This bonding choice exceeds the height budget by ${fmt(info.totalUm - info.ceiling, 0)} µm.` : `${fmt(info.ceiling - info.totalUm, 0)} µm remains inside the ${info.ceiling} µm height budget.`));
        buildTable();
      }
      [selGen].forEach(i => i.addEventListener('change', () => { st.gen = selGen.value; refreshOptions(); update(); }));
      [selHeight, selDie, inRate, inN, bondTC, bondMR, hybridBox].forEach(i => i.addEventListener('input', update));

      const figure = h('div', { class: 'w-studio', style: { maxWidth: '470px', margin: '0 auto', width: '100%' } }, h('div', { class: 'w-figure-title' }, 'A vertical memory system'), xsec,
        h('div', { class: 'w-note' }, 'Copper vias run through each DRAM die. Bonded interfaces connect those vias down to the base die and the interposer. Thin interfaces leave room for more memory.'));
      el.append(h('div', { class: 'w-workbench' }, figure, h('div', { class: 'w-console' }, h('div', { class: 'w-figure-title' }, 'Configure the stack'), controls, bondRow)),
        takeaway, readout,
        h('div', { class: 'w-note' }, 'Illustrative height-budget model. Die and bond thicknesses are fixed by the selected process; some capacity combinations are theoretical. Hybrid bonding is a forward-looking option, not production HBM in this course’s baseline.'),
        h('details', { class: 'w-reference' }, h('summary', null, 'Bonding method & material key'), bondNote, legend),
        h('details', { class: 'w-reference' }, h('summary', null, 'Generation reference & calculation'), tableWrap, formula));
      selGen.value = st.gen;
      refreshOptions();
      update();
    }
  });
})();
