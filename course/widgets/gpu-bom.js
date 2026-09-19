/* Widget: gpu-bom — "What an H100 / B200 Costs to Make" (Module 19 Part D, Module 00 worked example) */
(function () {
  'use strict';
  const WAFER_D = 297; // mm, usable 300 mm wafer diameter after edge exclusion

  const PRESETS = {
    h100: { label: 'H100 SXM (TSMC 4N)', waferPrice: 17000, dieArea: 814, diesPerPkg: 1, d0: 0.10, model: 'poisson', harvest: 60,
             hbmGBperGB: 18, hbmStacks: 5, hbmGB: 16, cowos: 700, substrate: 150, testPkg: 150, price: 27000 },
    b200: { label: 'B200 (TSMC 4NP, CoWoS-L)', waferPrice: 17000, dieArea: 800, diesPerPkg: 2, d0: 0.10, model: 'poisson', harvest: 60,
             hbmGBperGB: 17, hbmStacks: 8, hbmGB: 24, cowos: 1500, substrate: 280, testPkg: 280, price: 37000 },
  };

  function grossDiesPerWafer(areaMM2) {
    const r = WAFER_D / 2;
    return Math.max(0, (Math.PI * r * r) / areaMM2 - (Math.PI * WAFER_D) / Math.sqrt(2 * areaMM2));
  }
  function yieldFor(model, areaMM2, d0) {
    const ad = (areaMM2 / 100) * d0; // AD, A in cm^2
    if (model === 'murphy') return ad < 1e-9 ? 1 : Math.pow((1 - Math.exp(-ad)) / ad, 2);
    return Math.exp(-ad);
  }

  window.registerWidget('gpu-bom', {
    title: 'Illustrative H100 / B200 Cost Model',
    caption: 'Explore assumed component costs and manufacturing scale. Defaults are estimates, not a disclosed NVIDIA bill of materials or measured product profitability.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const usd = n => '$' + fmt(Math.round(n), 0);
      const fmtM = n => fmt(n / 1e6, n >= 1e7 ? 1 : 2) + ' M';

      const st = Object.assign({ presetLabel: PRESETS.h100.label, dirty: false, cowosCap: 75000 }, PRESETS.h100);

      // ---------- controls ----------
      function range(min, max, step, val) { return { type: 'range', min, max, step, value: val }; }
      const inWafer = h('input', range(15000, 25000, 500, st.waferPrice));
      const inArea = h('input', range(200, 900, 2, st.dieArea));
      const selDies = h('select', null, h('option', { value: 1 }, '1 (monolithic)'), h('option', { value: 2 }, '2 (dual-die)'));
      const inD0 = h('input', range(0.05, 0.2, 0.005, st.d0));
      const selModel = h('select', null, h('option', { value: 'poisson' }, 'Poisson'), h('option', { value: 'murphy' }, 'Murphy'));
      const inHarvest = h('input', range(0, 100, 5, st.harvest));
      const inHbmPrice = h('input', range(10, 25, 0.5, st.hbmGBperGB));
      const inHbmStacks = h('input', range(1, 8, 1, st.hbmStacks));
      const inHbmGB = h('input', range(8, 36, 4, st.hbmGB));
      const inCowos = h('input', range(500, 1500, 25, st.cowos));
      const inSub = h('input', range(100, 300, 10, st.substrate));
      const inTest = h('input', range(100, 300, 10, st.testPkg));
      const inPrice = h('input', range(20000, 45000, 500, st.price));
      const inCap = h('input', range(15000, 130000, 5000, st.cowosCap));
      const outUpdaters = [];
      function ctl(label, inp, getter, unitFmt) {
        const o = h('output');
        outUpdaters.push(() => { o.textContent = unitFmt(getter()); });
        return h('label', { class: 'w-ctl' }, h('span', null, label), inp, o);
      }
      const colA = h('div', { class: 'w-controls' },
        ctl('Wafer price', inWafer, () => st.waferPrice, v => usd(v)),
        ctl('Die area (per die)', inArea, () => st.dieArea, v => fmt(v, 0) + ' mm²'),
        ctl('Dies per package', selDies, () => st.diesPerPkg, v => v === 1 ? '1 (monolithic)' : '2 (dual-die)'),
        ctl('Defect density D0', inD0, () => st.d0, v => fmt(v, 3) + ' /cm²'),
        ctl('Yield model', selModel, () => st.model, v => v === 'murphy' ? 'Murphy' : 'Poisson'),
        ctl('Partial-good harvesting', inHarvest, () => st.harvest, v => fmt(v, 0) + '%'));
      const colB = h('div', { class: 'w-controls' },
        ctl('HBM price', inHbmPrice, () => st.hbmGBperGB, v => usd(v) + '/GB'),
        ctl('HBM stacks / package', inHbmStacks, () => st.hbmStacks, v => v),
        ctl('HBM capacity / stack', inHbmGB, () => st.hbmGB, v => fmt(v, 0) + ' GB'),
        ctl('CoWoS assembly + interposer', inCowos, () => st.cowos, v => usd(v)),
        ctl('Substrate', inSub, () => st.substrate, v => usd(v)),
        ctl('Test + packaging', inTest, () => st.testPkg, v => usd(v)),
        ctl('Selling price', inPrice, () => st.price, v => usd(v)));
      const grid = h('div', { class: 'w-grid2' }, colA, colB);

      const btnH = h('button', { class: 'w-btn primary' }, 'H100 SXM');
      const btnB = h('button', { class: 'w-btn' }, 'B200');
      const presetLbl = h('span', { class: 'count' });
      const presetRow = h('div', { class: 'w-step-nav' }, btnH, btnB, presetLbl);

      // ---------- readouts ----------
      const rGross = h('b'), rYield = h('b'), rGood = h('b'), rDieCost = h('b'), rHbmCost = h('b'), rPack = h('b'), rCogs = h('b'), rMargin = h('b');
      const readout1 = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, rGross, h('span', null, 'gross dies / wafer')),
        h('div', { class: 'w-stat' }, rYield, h('span', null, 'sellable yield')),
        h('div', { class: 'w-stat' }, rGood, h('span', null, 'good dies / wafer')),
        h('div', { class: 'w-stat' }, rDieCost, h('span', null, 'logic die cost / GPU')));
      const readout2 = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, rHbmCost, h('span', null, 'HBM cost / GPU')),
        h('div', { class: 'w-stat' }, rPack, h('span', null, 'CoWoS+substrate+test / GPU')),
        h('div', { class: 'w-stat' }, rCogs, h('span', null, 'modeled component cost / GPU')),
        h('div', { class: 'w-stat' }, rMargin, h('span', null, 'price minus modeled cost (%)')));
      const formula = h('div', { class: 'w-formula' });

      // ---------- bar charts ----------
      const BW = 700, BH1 = 46, BH2 = 46;
      const svg1 = svg('svg', { class: 'w-svg', viewBox: `0 0 ${BW} 70`, role: 'img', 'aria-label': 'Modeled component cost versus price' });
      const svg2 = svg('svg', { class: 'w-svg', viewBox: `0 0 ${BW} 70`, role: 'img', 'aria-label': 'Illustrative price allocation' });
      const leg1 = h('div', { class: 'w-legend' });
      const leg2 = h('div', { class: 'w-legend' });

      function drawBar(svgEl, legEl, segs, total, barH) {
        svgEl.innerHTML = ''; legEl.innerHTML = '';
        const W = BW - 4;
        let x = 2;
        const bg = svg('rect', { x: 2, y: 10, width: W, height: barH, fill: 'var(--panel2)', rx: 4 });
        svgEl.append(bg);
        segs.forEach(s => {
          const w = Math.max(0, (s.v / total) * W);
          if (w > 0.5) {
            const r = svg('rect', { x, y: 10, width: w, height: barH, fill: s.c });
            r.append(svg('title', null, `${s.k}: ${usd(s.v)} (${fmt(s.v / total * 100, 1)}%)`));
            svgEl.append(r);
          }
          x += w;
          const item = h('span', { class: 'w-legend-item' }, h('i', { style: { background: s.c } }), `${s.k}: ${usd(s.v)} (${fmt(s.v / total * 100, 1)}%)`);
          legEl.append(item);
        });
      }

      // ---------- scaler ----------
      const rLogicW = h('b'), rHbmStacksTot = h('b'), rHbmW = h('b'), rCowosW = h('b'), rMonths = h('b');
      const scalerReadout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, rLogicW, h('span', null, 'logic wafers')),
        h('div', { class: 'w-stat' }, rHbmStacksTot, h('span', null, 'HBM stacks')),
        h('div', { class: 'w-stat' }, rHbmW, h('span', null, 'HBM DRAM wafers')),
        h('div', { class: 'w-stat' }, rCowosW, h('span', null, 'CoWoS wafers')),
        h('div', { class: 'w-stat' }, rMonths, h('span', null, 'months of CoWoS capacity')));
      const outCap = h('output');
      const capCtl = h('label', { class: 'w-ctl' }, h('span', null, 'CoWoS capacity'), inCap, outCap);

      function readVals() {
        st.waferPrice = +inWafer.value; st.dieArea = +inArea.value; st.diesPerPkg = +selDies.value;
        st.d0 = +inD0.value; st.model = selModel.value; st.harvest = +inHarvest.value;
        st.hbmGBperGB = +inHbmPrice.value; st.hbmStacks = +inHbmStacks.value; st.hbmGB = +inHbmGB.value;
        st.cowos = +inCowos.value; st.substrate = +inSub.value; st.testPkg = +inTest.value; st.price = +inPrice.value;
        st.cowosCap = +inCap.value;
      }
      function writeVals() {
        inWafer.value = st.waferPrice; inArea.value = st.dieArea; selDies.value = st.diesPerPkg;
        inD0.value = st.d0; selModel.value = st.model; inHarvest.value = st.harvest;
        inHbmPrice.value = st.hbmGBperGB; inHbmStacks.value = st.hbmStacks; inHbmGB.value = st.hbmGB;
        inCowos.value = st.cowos; inSub.value = st.substrate; inTest.value = st.testPkg; inPrice.value = st.price;
        inCap.value = st.cowosCap;
      }

      function update() {
        readVals();
        outUpdaters.forEach(fn => fn());
        outCap.textContent = fmt(st.cowosCap, 0) + ' wafers/mo';

        const gross = grossDiesPerWafer(st.dieArea);
        const y0 = yieldFor(st.model, st.dieArea, st.d0);
        const sellable = y0 + (st.harvest / 100) * (1 - y0);
        const good = gross * sellable;
        const dieCostEach = st.waferPrice / Math.max(1e-6, good);
        const logicCost = dieCostEach * st.diesPerPkg;
        const hbmCost = st.hbmGBperGB * st.hbmStacks * st.hbmGB;
        const packCost = st.cowos + st.substrate + st.testPkg;
        const cogs = logicCost + hbmCost + packCost;
        const margin = (st.price - cogs) / st.price * 100;

        rGross.textContent = fmt(gross, 1);
        rYield.textContent = fmt(sellable * 100, 0) + '% (perfect-die ' + fmt(y0 * 100, 0) + '%)';
        rGood.textContent = fmt(good, 1);
        rDieCost.textContent = usd(logicCost);
        rHbmCost.textContent = usd(hbmCost);
        rPack.textContent = usd(packCost);
        rCogs.textContent = usd(cogs);
        rMargin.textContent = fmt(margin, 1) + '%';

        formula.innerHTML = `N = π(d/2)²/A − πd/√(2A), d = 297 mm &nbsp;·&nbsp; Y<sub>perfect</sub> = ${st.model === 'murphy' ? '((1−e<sup>−AD₀</sup>)/AD₀)²' : 'e<sup>−A·D₀</sup>'} &nbsp;·&nbsp; Y<sub>sellable</sub> = Y<sub>perfect</sub> + harvest·(1−Y<sub>perfect</sub>)`;

        const tsmc = logicCost + st.cowos;
        const hbmVendor = hbmCost;
        const osat = st.substrate + st.testPkg;
        const nvProfit = Math.max(0, st.price - cogs);
        drawBar(svg1, leg1, [
          { k: 'Logic die', v: logicCost, c: 'var(--si)' },
          { k: 'HBM', v: hbmCost, c: 'var(--accent2)' },
          { k: 'CoWoS + interposer', v: st.cowos, c: 'var(--cu)' },
          { k: 'Substrate', v: st.substrate, c: 'var(--warn)' },
          { k: 'Test + packaging', v: st.testPkg, c: 'var(--muted)' },
          { k: 'Unallocated price–cost spread', v: nvProfit, c: 'var(--ok)' },
        ], st.price, BH1);
        drawBar(svg2, leg2, [
          { k: 'TSMC (wafer + CoWoS)', v: tsmc, c: 'var(--si)' },
          { k: 'HBM vendor', v: hbmVendor, c: 'var(--accent2)' },
          { k: 'Substrate / OSAT', v: osat, c: 'var(--cu)' },
          { k: 'Unallocated price–cost spread', v: nvProfit, c: 'var(--ok)' },
        ], st.price, BH2);

        // ---- 1,000,000 GPU scaler ----
        const totalDies = 1e6 * st.diesPerPkg;
        const logicWafers = totalDies / Math.max(1e-6, good);
        const hbmStacksTotal = 1e6 * st.hbmStacks;
        const dramGross = grossDiesPerWafer(120);
        const dramGood = dramGross * 0.65;
        const hbmDramDies = hbmStacksTotal * 12;
        const hbmWafers = hbmDramDies / Math.max(1e-6, dramGood);
        const pkgsPerCowosWafer = st.diesPerPkg === 1 ? 30 : 16;
        const cowosWafers = 1e6 / pkgsPerCowosWafer;
        const months = cowosWafers / st.cowosCap;

        rLogicW.textContent = fmt(Math.round(logicWafers), 0);
        rHbmStacksTot.textContent = fmtM(hbmStacksTotal);
        rHbmW.textContent = fmt(Math.round(hbmWafers), 0);
        rCowosW.textContent = fmt(Math.round(cowosWafers), 0);
        rMonths.textContent = fmt(months, 1) + ' mo';

        presetLbl.textContent = 'Preset: ' + st.presetLabel + (st.dirty ? ' (edited)' : '');
        btnH.classList.toggle('primary', st.presetLabel === PRESETS.h100.label && !st.dirty);
        btnB.classList.toggle('primary', st.presetLabel === PRESETS.b200.label && !st.dirty);
      }

      function applyPreset(key) {
        Object.assign(st, PRESETS[key]);
        st.presetLabel = PRESETS[key].label; st.dirty = false;
        writeVals(); update();
      }
      btnH.addEventListener('click', () => applyPreset('h100'));
      btnB.addEventListener('click', () => applyPreset('b200'));
      [inWafer, inArea, selDies, inD0, selModel, inHarvest, inHbmPrice, inHbmStacks, inHbmGB, inCowos, inSub, inTest, inPrice]
        .forEach(i => i.addEventListener('input', () => { st.dirty = true; update(); }));
      inCap.addEventListener('input', update);

      el.append(
        presetRow, grid, readout1, readout2, formula,
        h('div', { style: { fontWeight: 600, fontSize: '12.5px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '14px 0 4px' } }, 'Bill of materials vs. selling price'),
        svg1, leg1,
        h('div', { style: { fontWeight: 600, fontSize: '12.5px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '14px 0 4px' } }, 'Illustrative price allocation'),
        svg2, leg2,
        h('div', { class: 'w-note' }, 'The unallocated spread is not gross profit. Gross profit uses realized revenue minus full cost of revenue, which also includes yield fallout, warranty/inventory provisions, logistics, manufacturing overhead and other costs. R&D is a separate operating expense. Inputs are illustrative estimates.'),
        h('div', { style: { fontWeight: 600, fontSize: '12.5px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '18px 0 4px' } }, 'Scaling to 1,000,000 GPUs'),
        h('div', { class: 'w-note' }, 'Assumptions for this scaler: every HBM stack is modeled as 12-high/24 GB (12 DRAM dies ≈120 mm² each, ~65% wafer yield) regardless of the per-stack capacity set above; CoWoS interposer wafers yield ~30 H100-class (1-die) packages or ~16 B200-class (2-die) packages, per Module 19.'),
        scalerReadout, h('div', { class: 'w-controls' }, capCtl));
      update();
    }
  });
})();
