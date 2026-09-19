/* Widget: wafer-sort-sim — "Wafer Sort: Probing Every Die" (Module 14) */
(function () {
  'use strict';
  const WAFER_D = 300, EDGE = 3, SCRIBE = 0.1;        // mm: wafer diameter, edge exclusion, scribe line between dies
  const T_INDEX = 0.4, T_LOAD = 90;                   // s: index + touchdown per step (0.3–0.6); load, pre-align, align per wafer (1–2 min)
  const SITES = [1, 4, 8, 16], CARD = { 1: [1, 1], 4: [2, 2], 8: [4, 2], 16: [4, 4] };   // sites → dies per touchdown, columns × rows
  const PH = { up: 0.2, test: 0.7, down: 0.85 };      // one touchdown cycle: chuck up | in contact (test) | chuck down | index
  const Z_UP = -18;                                   // px the chuck rises in the side view
  const HP = 372;                                     // px height of each drawing panel
  const BINS = [
    { id: 1, name: 'Bin 1 · pass, fast (low V_min)', short: 'pass, fast', color: 'ok', op: 0.9, pass: true },
    { id: 2, name: 'Bin 2 · pass, nominal', short: 'pass, nominal', color: 'si', op: 0.9, pass: true },
    { id: 3, name: 'Bin 3 · pass, slow (high V_min)', short: 'pass, slow', color: 'accent2', op: 0.9, pass: true },
    { id: 4, name: 'Fail · continuity (open pad)', short: 'fail, continuity', color: 'bad', op: 0.95 },
    { id: 5, name: 'Fail · scan (logic defect)', short: 'fail, scan', color: 'bad', op: 0.62 },
    { id: 6, name: 'Fail · MBIST (unrepairable SRAM)', short: 'fail, MBIST', color: 'bad', op: 0.36 },
  ];
  const PRESETS = [
    { name: 'GPU die · 1 site', A: 800, D0: 0.10, t: 240, sites: 1, cps: 0.108 },
    { name: 'Mobile SoC · 16 sites', A: 100, D0: 0.10, t: 25, sites: 16, cps: 0.05 },
    { name: 'Chiplet · 8 sites', A: 50, D0: 0.10, t: 10, sites: 8, cps: 0.03 },
  ];
  const PARTS = {
    head: { label: 'ATE test head', info: 'the tester’s pin electronics and power supplies, docked on top of the prober; every probe is driven and measured from here through the probe card.' },
    headplate: { label: 'head plate', info: 'the rigid ring at the top of the probing chamber that holds the probe card; its stiffness keeps the tips planar while hundreds of newtons of contact force push up.' },
    pcb: { label: 'probe card + stiffener', info: 'a circuit board that routes thousands of tester channels down to the space transformer, with a metal stiffener so the card bows less than the ~10 µm planarity budget. Advanced MEMS cards cost $100k–$1M+ and last ~0.5–1 M touchdowns.' },
    st: { label: 'space transformer', info: 'a ceramic with fine wiring that fans the tester’s coarse pitch down to the die’s 40–60 µm pads.' },
    camera: { label: 'alignment cameras', info: 'a downward-looking camera finds the pad pattern; an upward-looking one on the chuck images the probe tips; together they place pads under tips to ±1–2 µm, redone hot because a 100 K rise grows the wafer ~78 µm edge to edge.' },
    tips: { label: 'probe tips, 2–8 gf each', info: 'thousands of spring contacts (~12 000 on a GPU card). The chuck overtravels 50–75 µm past first touch so each spring pushes 2–8 gf and scrubs through the pad’s insulating native oxide.' },
    wafer: { label: 'wafer, 775 µm thick', info: '300 mm across, pulled flat by vacuum. The strip on top is the row of dies under the card, coloured by bin as they are tested.' },
    chuck: { label: 'chuck, −40 to +150 °C', info: 'a vacuum platen with heaters and a chiller loop; for a GPU it also sinks the hundreds of watts the die dissipates under test.' },
    z: { label: 'Z stage (overtravel)', info: 'raises the chuck to first contact, then a programmed 50–75 µm overtravel that loads the probe springs; a wrong Z height crashes the card and breaks probes.' },
    xy: { label: 'X-Y-θ stage', info: 'linear motors on air bearings with ±1 µm repeatability; one index step from die to die takes 0.3–0.6 s.' },
    granite: { label: 'granite base', info: 'a heavy, thermally stable slab that damps vibration so the stage holds ±1 µm under ~350 N of probe force.' },
  };
  const INFO_DEFAULT = 'Hover or focus any part of the sort cell to read what it does.';
  const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
  const f1 = n => (+n).toFixed(1);
  const hms = s => s >= 3600 ? Math.floor(s / 3600) + ' h ' + String(Math.round((s % 3600) / 60)).padStart(2, '0') + ' min' : s >= 60 ? Math.floor(s / 60) + ' min ' + String(Math.round(s % 60)).padStart(2, '0') + ' s' : Math.round(s) + ' s';

  window.registerWidget('wafer-sort-sim', {
    title: 'Wafer Sort: Probing Every Die',
    caption: 'Left: the wafer map fills in bin by bin as the probe card steps across it. Right: the sort cell that does it. Press Play, then change die area, sites, test time and D0 and watch touchdowns, hours in the cell and dollars per good die follow.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const st = { D0: 0.10, A: 800, tTest: 240, sites: 1, cps: 0.108, playing: !reduced, wafer: 1 };
      const sim = { dies: [], tds: [], s: 0, pos: 0, revealed: 0, done: false, hold: 0, cyc: 0.45, rowJ: null };
      const G = {};                                     // geometry and element refs, rebuilt on resize
      let W = 700, raf = 0, roRaf = 0, visible = true, last = 0, dead = false;
      const txt = (x, y, s, o) => { o = o || {}; return svg('text', { x: f1(x), y: f1(y), 'font-family': o.mono ? 'var(--mono)' : 'var(--sans)', 'font-size': o.size || 12, 'font-weight': o.bold ? 600 : 400, fill: o.fill || 'var(--muted)', 'text-anchor': o.anchor || 'start' }, s); };

      // ---------- controls ----------
      const num = (v, min, max, step) => h('input', { type: 'range', min, max, step, value: v, style: { minWidth: 0 } });
      const d0In = num(st.D0, 0.02, 0.5, 0.01), aIn = num(st.A, 20, 850, 5), tIn = num(st.tTest, 1, 300, 1), cIn = num(st.cps, 0.01, 0.12, 0.002);
      const sSel = h('select', { style: { minWidth: 0, width: '100%' } }, ...SITES.map(n => h('option', { value: n }, n === 1 ? '1 site' : `${n} sites (${CARD[n][0]}×${CARD[n][1]} dies)`)));
      const d0Out = h('output'), aOut = h('output'), tOut = h('output'), cOut = h('output');
      const playBtn = h('button', { class: 'w-btn primary', on: { click: () => { st.playing = !st.playing; playBtn.textContent = st.playing ? 'Pause' : 'Play'; if (st.playing) start(); else paint(); } } }, st.playing ? 'Pause' : 'Play');
      const newBtn = h('button', { class: 'w-btn', on: { click: () => { newWafer(); paint(); } } }, 'New wafer');
      const presetRow = h('div', { class: 'w-controls' }, ...PRESETS.map(p => h('button', { class: 'w-btn', on: { click: () => { d0In.value = p.D0; aIn.value = p.A; tIn.value = p.t; sSel.value = p.sites; cIn.value = p.cps; onInput(); } } }, p.name)));
      const controls = h('div', { class: 'w-controls' },
        h('div', { style: { flexBasis: '100%', display: 'flex', gap: '8px', flexWrap: 'wrap' } }, playBtn, newBtn),
        h('label', { class: 'w-ctl' }, h('span', null, 'Defect density D0'), d0In, d0Out),
        h('label', { class: 'w-ctl' }, h('span', null, 'Die area'), aIn, aOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Sites on the card'), sSel),
        h('label', { class: 'w-ctl' }, h('span', null, 'Test time / touchdown'), tIn, tOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Tester cost'), cIn, cOut));

      // ---------- DOM around the drawing ----------
      const M = svg('svg', { class: 'w-svg', viewBox: '0 0 700 372', role: 'img', 'aria-label': 'Wafer map coloured by bin as the probe card steps across, and a side view of the sort cell: test head, probe card, tips, wafer on the chuck, stages' });
      const progBar = h('div', { style: { height: '100%', width: '0%', background: 'var(--accent)' } });
      const progWrap = h('div', { style: { margin: '8px 0 2px', height: '8px', background: 'var(--panel2)', borderRadius: '4px', overflow: 'hidden' } }, progBar);
      const progText = h('div', { class: 'w-note', style: { marginTop: '4px' } });
      const info = h('div', { class: 'w-note', style: { minHeight: '2.6em' } }, INFO_DEFAULT);
      const stat = l => { const b = h('b', null, '–'); return { el: h('div', { class: 'w-stat' }, b, h('span', null, l)), b }; };
      const R = { n: stat('candidate dies on the wafer'), td: stat('touchdowns per wafer'), util: stat('avg. dies per touchdown'), time: stat('wafer time in the sort cell'), cost: stat('tester cost per wafer'), y: stat('predicted yield (Poisson)'), good: stat('good dies expected'), cpg: stat('sort cost per good die'), sofar: stat('dies tested · yield so far') };
      const readout = h('div', { class: 'w-readout' }, ...Object.values(R).map(r => r.el));
      const formula = h('div', { class: 'w-formula' });
      const hist = h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, auto) minmax(70px, 1fr) auto', gap: '5px 10px', alignItems: 'center', fontSize: '12.5px', margin: '8px 0 4px' } });
      const rows = BINS.concat([{ id: 0, name: 'Not yet probed', color: 'muted', op: 0.35 }]).map(b => {
        const fill = h('div', { style: { height: '100%', width: '0%', background: `var(--${b.color})`, opacity: b.op } });
        const bar = h('div', { style: { height: '12px', background: 'var(--panel2)', borderRadius: '3px', overflow: 'hidden' } }, fill);
        const n = h('span', { style: { fontFamily: 'var(--mono)', fontSize: '12px', textAlign: 'right', whiteSpace: 'nowrap' } }, '0');
        hist.append(h('span', { style: { color: 'var(--ink)' } }, b.name), bar, n);
        return { b, fill, n };
      });
      const ruleNote = h('div', { class: 'w-note' });
      const legend = h('div', { class: 'w-legend' },
        ...BINS.map(b => h('span', { class: 'w-legend-item' }, h('i', { style: { background: `var(--${b.color})`, opacity: b.op } }), b.short)),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--panel2)', border: '1px solid var(--line2)' } }), 'not yet probed'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent)', opacity: 0.5, border: '1px solid var(--accent)' } }), 'probe card footprint'));

      // ---------- die grid (mm) and touchdown order ----------
      function layoutDies() {
        const s = Math.sqrt(st.A), p = s + SCRIBE, exclR = WAFER_D / 2 - EDGE, n = Math.ceil(exclR / p) + 1;
        const dies = [], byKey = new Map();
        for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
          const x0 = i * p - s / 2, y0 = j * p - s / 2;
          const far = Math.max(Math.hypot(x0, y0), Math.hypot(x0 + s, y0), Math.hypot(x0, y0 + s), Math.hypot(x0 + s, y0 + s));
          if (far <= exclR) { byKey.set(i + ',' + j, dies.length); dies.push({ i, j, x: x0, y: y0, bin: 0, vmin: 0, tested: false, el: null, tEl: null, seg: null }); }
        }
        const [cw, ch] = CARD[st.sites], tds = [];
        let jMin = Infinity, jMax = -Infinity, iMin = Infinity, iMax = -Infinity;
        dies.forEach(d => { jMin = Math.min(jMin, d.j); jMax = Math.max(jMax, d.j); iMin = Math.min(iMin, d.i); iMax = Math.max(iMax, d.i); });
        for (let cj = 0, row = 0; jMin + cj * ch <= jMax; cj++, row++) {
          const rowTds = [];
          for (let ci = 0; iMin + ci * cw <= iMax; ci++) {
            const list = [];
            for (let a = 0; a < cw; a++) for (let b = 0; b < ch; b++) { const k = byKey.get((iMin + ci * cw + a) + ',' + (jMin + cj * ch + b)); if (k != null) list.push(k); }
            if (list.length) rowTds.push({ dies: list, x: (iMin + ci * cw) * p - s / 2, y: (jMin + cj * ch) * p - s / 2, w: cw * p - SCRIBE, hgt: ch * p - SCRIBE, rowJ: jMin + cj * ch });
          }
          if (row % 2) rowTds.reverse();                  // serpentine: the stage reverses direction on every card row
          tds.push(...rowTds);
        }
        sim.dies = dies; sim.tds = tds; sim.s = s;
      }
      function assignBins() {
        const Y = Math.exp(-st.A / 100 * st.D0);
        sim.dies.forEach(d => {
          if (Math.random() > Y) { const r = Math.random(); d.bin = r < 0.10 ? 4 : r < 0.70 ? 5 : 6; d.vmin = 0; }
          else { d.vmin = 0.75 + 0.02 * gauss(); d.bin = d.vmin < 0.735 ? 1 : d.vmin > 0.775 ? 3 : 2; }   // V_min search: 0.75 V ± 20 mV (illustrative)
        });
      }
      function paintDie(d, revealed) {
        const b = BINS[d.bin - 1];
        d.tested = revealed;
        d.el.setAttribute('fill', revealed ? `var(--${b.color})` : 'var(--panel2)');
        d.el.setAttribute('fill-opacity', revealed ? b.op : 1);
        if (d.tEl) d.tEl.textContent = revealed ? b.name + (b.pass ? ` · V_min ${d.vmin.toFixed(3)} V` : '') : 'not yet probed';
      }
      function resetColors() { sim.dies.forEach(d => { if (d.el) paintDie(d, false); }); sim.revealed = 0; sim.rowJ = null; }
      function newWafer() { assignBins(); resetColors(); sim.pos = 0; sim.done = false; st.wafer++; }
      const rate = () => Math.min(400, Math.max(1.2, sim.tds.length / 30));   // touchdowns per animated second: one wafer in ~30 s

      // ---------- panel A: wafer map, top view ----------
      function buildA(ox, Wa) {
        const r = Math.min(150, (Wa - 20) / 2), cx = ox + Wa / 2, cy = Math.max(24 + r, (HP - 26 + 24) / 2), k = r / (WAFER_D / 2), ny = cy + r;
        const g = svg('g');
        g.append(txt(ox + 2, 14, '300 mm wafer, top view', { fill: 'var(--ink)', bold: true, size: 12.5 }));
        g.append(svg('circle', { cx: f1(cx), cy: f1(cy), r: f1(r), fill: 'var(--ground)', stroke: 'var(--line2)', 'stroke-width': 1.5 }));
        g.append(svg('circle', { cx: f1(cx), cy: f1(cy), r: f1((WAFER_D / 2 - EDGE) * k), fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
        const dieG = svg('g'), withTitles = sim.dies.length <= 1500;
        sim.dies.forEach(d => {
          d.tested = false;
          d.el = svg('rect', { x: f1(cx + d.x * k), y: f1(cy + d.y * k), width: f1(sim.s * k), height: f1(sim.s * k), fill: 'var(--panel2)', stroke: 'var(--line2)', 'stroke-width': 0.5 });
          d.tEl = withTitles ? svg('title', null, 'not yet probed') : null;
          if (d.tEl) d.el.append(d.tEl);
          dieG.append(d.el);
        });
        const cardRect = svg('rect', { fill: 'var(--accent)', 'fill-opacity': 0.2, stroke: 'var(--accent)', 'stroke-width': 2 });
        const leader = svg('line', { stroke: 'var(--accent)', 'stroke-width': 1, 'stroke-dasharray': '3 2' });
        const cardLbl = txt(ox + Wa - 2, 14, '', { fill: 'var(--accent)', bold: true, size: 12.5, anchor: 'end' });
        g.append(dieG, cardRect, leader, svg('path', { d: `M${f1(cx - 6)},${f1(ny + 1)} L${f1(cx)},${f1(ny - 6)} L${f1(cx + 6)},${f1(ny + 1)}`, fill: 'var(--panel)', stroke: 'var(--line2)', 'stroke-width': 1.5 }));
        g.append(txt(cx + 8, ny + 20, 'notch'), txt(ox + 2, ny + 20, 'edge exclusion 3 mm'), cardLbl);
        G.A = { cx, cy, k, cardRect, leader, cardLbl, lx: ox + Wa - 30, ly: 18 };
        return g;
      }

      // ---------- panel B: sort cell, side view ----------
      function buildB(ox, oy, Wb) {
        const LBL = 140, mx0 = ox + 6, mx1 = ox + Wb - LBL - 4, mcx = (mx0 + mx1) / 2, mhw = (mx1 - mx0) / 2, labelX = ox + Wb - LBL + 8;
        const X = f => mcx + f * mhw, Y = v => oy + v, WY = 132, WT = 7, CH_H = 30, XY_TOP = 190;
        const g = svg('g'), parts = {};
        g.append(txt(ox + 2, Y(14), 'Sort cell, side view', { fill: 'var(--ink)', bold: true, size: 12.5 }));
        function part(id, box, parent, ...shapes) {
          const hl = svg('rect', { x: f1(box.x), y: f1(box.y), width: f1(box.w), height: f1(box.h), rx: 2, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2, opacity: 0, 'pointer-events': 'none' });
          const pg = svg('g', { tabindex: 0, role: 'img', 'aria-label': PARTS[id].label, style: { cursor: 'help', outline: 'none' } }, ...shapes, hl);
          const on = () => { hl.setAttribute('opacity', 1); info.innerHTML = ''; info.append(h('b', null, PARTS[id].label.replace(/^./, c => c.toUpperCase()) + ': '), PARTS[id].info); };
          const off = () => { hl.setAttribute('opacity', 0); info.textContent = INFO_DEFAULT; };
          pg.addEventListener('mouseenter', on); pg.addEventListener('focus', on); pg.addEventListener('mouseleave', off); pg.addEventListener('blur', off);
          parent.append(pg); parts[id] = pg;
        }
        const rect = (x, y, w, hh, fill, extra) => svg('rect', Object.assign({ x: f1(x), y: f1(y), width: f1(w), height: f1(hh), fill }, extra || {}));
        // fixed frame, bottom to top
        part('granite', { x: X(-0.98), y: Y(214), w: 1.96 * mhw, h: 18 }, g, rect(X(-0.98), Y(214), 1.96 * mhw, 18, 'var(--panel2)', { stroke: 'var(--line2)' }), txt(mcx, Y(226.5), 'granite base', { anchor: 'middle' }));
        const moverX = svg('g'), moverZ = svg('g');
        part('xy', { x: X(-0.55), y: Y(XY_TOP), w: 1.1 * mhw, h: 18 }, moverX, rect(X(-0.55), Y(XY_TOP), 1.1 * mhw, 18, 'var(--line2)'), txt(mcx, Y(XY_TOP + 12.5), 'X-Y-θ stage', { anchor: 'middle', fill: 'var(--ink)' }));
        const zTop = WY + WT + CH_H, zCol = rect(X(-0.12), Y(zTop), 0.24 * mhw, XY_TOP - zTop, 'var(--line2)');
        part('z', { x: X(-0.12), y: Y(zTop), w: 0.24 * mhw, h: XY_TOP - zTop }, g, zCol);
        g.append(moverX);
        const stripG = svg('g');
        part('chuck', { x: X(-0.52), y: Y(WY + WT), w: 1.04 * mhw, h: CH_H }, moverZ,
          rect(X(-0.52), Y(WY + WT), 1.04 * mhw, CH_H, 'var(--panel2)', { rx: 2, stroke: 'var(--ink)', 'stroke-width': 1 }),
          rect(X(0.52) + 2, Y(WY + WT + 2), 13, 10, 'var(--ink)', { rx: 1.5, 'fill-opacity': 0.7 }), svg('circle', { cx: f1(X(0.52) + 8.5), cy: f1(Y(WY + WT)), r: 3, fill: 'var(--accent)' }));   // upward-looking camera on the chuck
        part('wafer', { x: X(-0.5), y: Y(WY), w: mhw, h: WT }, moverZ, rect(X(-0.5), Y(WY), mhw, WT, 'var(--si)'), stripG);
        g.append(moverZ);
        part('head', { x: X(-0.98), y: Y(24), w: 1.96 * mhw, h: 36 }, g, rect(X(-0.98), Y(24), 1.96 * mhw, 36, 'var(--panel2)', { rx: 3, stroke: 'var(--line2)' }),
          txt(mcx, Y(39), 'ATE test head', { fill: 'var(--ink)', bold: true, anchor: 'middle' }), txt(mcx, Y(53), mhw >= 100 ? 'pin electronics + power supplies' : 'pin electronics', { anchor: 'middle' }));
        part('pcb', { x: X(-0.6), y: Y(63), w: 1.2 * mhw, h: 19 }, g, rect(X(-0.6), Y(63), 1.2 * mhw, 5, 'var(--ink)', { 'fill-opacity': 0.55 }), rect(X(-0.6), Y(68), 1.2 * mhw, 14, 'var(--cu)', { 'fill-opacity': 0.5, stroke: 'var(--cu)' }));
        part('headplate', { x: X(-1), y: Y(68), w: 2 * mhw, h: 14 }, g, rect(X(-1), Y(68), 0.45 * mhw, 14, 'var(--line2)'), rect(X(0.55), Y(68), 0.45 * mhw, 14, 'var(--line2)'));
        part('st', { x: X(-0.32), y: Y(82), w: 0.64 * mhw, h: 12 }, g, rect(X(-0.32), Y(82), 0.64 * mhw, 12, 'var(--panel2)', { stroke: 'var(--line2)' }));
        const tipsG = svg('g', { stroke: 'var(--ink)', 'stroke-width': 1.2, 'stroke-linecap': 'round' });
        const glow = rect(X(-0.28), Y(110), 0.56 * mhw, 5, 'var(--accent)', { rx: 2, opacity: 0 });
        part('tips', { x: X(-0.3), y: Y(94), w: 0.6 * mhw, h: 20 }, g, glow, tipsG);
        const camX = X(0.8);
        part('camera', { x: camX - 8, y: Y(82), w: 16, h: 16 }, g, rect(camX - 7, Y(82), 14, 11, 'var(--ink)', { rx: 1.5, 'fill-opacity': 0.7 }), svg('circle', { cx: f1(camX), cy: f1(Y(95)), r: 3, fill: 'var(--accent)' }));   // downward-looking camera on the bridge
        // call-out labels in a column on the right, pushed apart so they never overlap
        const items = [['headplate', X(1), 75], ['pcb', X(0.45), 82], ['st', X(0.32), 88], ['camera', camX + 7, 88], ['tips', X(0.26), 104], ['wafer', X(0.5), WY + WT / 2, 'z'], ['chuck', X(0.52), WY + WT + CH_H / 2, 'z'], ['z', X(0.12), zTop + (XY_TOP - zTop) / 2, 'x']]
          .map(([id, ax, ay, mv]) => ({ id, ax, ay, mv, ly: ay })).sort((a, b) => a.ay - b.ay);
        for (let i = 1; i < items.length; i++) if (items[i].ly < items[i - 1].ly + 15) items[i].ly = items[i - 1].ly + 15;
        if (items[items.length - 1].ly > 206) { items[items.length - 1].ly = 206; for (let i = items.length - 2; i >= 0; i--) items[i].ly = Math.min(items[i].ly, items[i + 1].ly - 15); }
        const movers = [];
        items.forEach(it => {
          const line = svg('line', { x1: f1(it.ax), y1: f1(Y(it.ay)), x2: f1(labelX - 5), y2: f1(Y(it.ly)), stroke: 'var(--muted)', 'stroke-width': 1 });
          g.append(line, txt(labelX, Y(it.ly) + 4, PARTS[it.id].label, { fill: 'var(--ink)' }));
          if (it.mv) movers.push({ line, ax: it.ax, ay: Y(it.ay), mv: it.mv });
        });
        // touchdown-cycle strip and status lines
        const sx0 = ox + 6, sw = Wb - 12, sy = Y(262), sh = 22;
        g.append(txt(sx0, Y(252), 'One touchdown cycle', { fill: 'var(--ink)', bold: true }));
        const segs = [[0, PH.up, sw >= 330 ? 'chuck up' : 'up'], [PH.up, PH.test, ''], [PH.test, PH.down, 'down'], [PH.down, 1, 'index']];
        const segEls = segs.map(([a, b, name]) => { const rr = rect(sx0 + a * sw, sy, (b - a) * sw - 1, sh, 'var(--panel2)'); const t = txt(sx0 + (a + b) / 2 * sw, sy + 15, name, { anchor: 'middle', fill: 'var(--ink)' }); g.append(rr, t); return { rr, t }; });
        const marker = svg('path', { d: 'M-6,8 L0,0 L6,8 Z', fill: 'var(--accent)' });
        const nowT = txt(sx0, Y(306), '', { fill: 'var(--ink)' }), rateT = txt(sx0, Y(322), '');
        g.append(marker, nowT, rateT, txt(sx0, Y(346), 'overtravel 50–75 µm · force 2–8 gf per probe'), txt(sx0, Y(362), 'scrub 10–25 µm · index 0.3–0.6 s · stage ±1 µm'));
        G.B = { X, Y, mcx, mhw, pxmm: mhw / WAFER_D, WY, WT, moverX, moverZ, zCol, zx: X(-0.12), zy: Y(zTop), zh: XY_TOP - zTop, glow, tipsG, stripG, movers, segEls, marker, sx0, sw, sy: sy + sh + 1, nowT, rateT, parts };
        buildTips();
        return g;
      }
      function buildTips() {
        const B = G.B, ns = st.sites, per = ns === 1 ? 9 : ns === 4 ? 4 : ns === 8 ? 2 : 1, tw = 0.52 * B.mhw, gw = tw / ns;
        B.tipsG.innerHTML = '';
        for (let s = 0; s < ns; s++) for (let t = 0; t < per; t++) { const x = B.X(-0.26) + gw * s + gw * (t + 1) / (per + 1); B.tipsG.append(svg('line', { x1: f1(x), y1: f1(B.Y(94)), x2: f1(x), y2: f1(B.Y(112)) })); }
      }
      function build() {
        M.innerHTML = '';
        const wide = W >= 640, Wa = wide ? 300 : W, Wb = wide ? W - Wa - 12 : W;
        M.setAttribute('viewBox', `0 0 ${W} ${wide ? HP : 2 * HP + 12}`);
        M.append(buildA(0, Wa), buildB(wide ? Wa + 12 : 0, wide ? 0 : HP + 12, Wb));
        sim.revealed = 0; sim.rowJ = null;
      }

      // ---------- one frame ----------
      function paint() {
        if (dead || !G.A) return;
        const TD = sim.tds.length, N = sim.dies.length, Y = Math.exp(-st.A / 100 * st.D0), ns = st.sites;
        if (!TD) return;
        const k = Math.min(TD, Math.floor(sim.pos));
        const cur = sim.tds[Math.min(k, TD - 1)], nxt = sim.tds[Math.min(k + 1, TD - 1)];
        const synced = rate() <= 3.5;
        const ph = !st.playing ? 0.45 : sim.done ? 0.8 : synced ? sim.pos - Math.floor(sim.pos) : sim.cyc - Math.floor(sim.cyc);
        const contact = ph >= PH.up && ph < PH.test && !sim.done;
        const kRev = Math.min(TD, k + (synced && ph >= 0.62 ? 1 : 0));   // dies under the card turn coloured at the end of the test
        if (kRev < sim.revealed) resetColors();
        for (let t = sim.revealed; t < kRev; t++) sim.tds[t].dies.forEach(i => paintDie(sim.dies[i], true));
        sim.revealed = kRev;
        // panel A
        const A = G.A;
        A.cardRect.setAttribute('x', f1(A.cx + cur.x * A.k)); A.cardRect.setAttribute('y', f1(A.cy + cur.y * A.k));
        A.cardRect.setAttribute('width', f1(cur.w * A.k)); A.cardRect.setAttribute('height', f1(cur.hgt * A.k));
        A.cardRect.setAttribute('stroke-width', contact ? 3 : 2);
        A.leader.setAttribute('x1', f1(A.lx)); A.leader.setAttribute('y1', f1(A.ly)); A.leader.setAttribute('x2', f1(A.cx + (cur.x + cur.w) * A.k)); A.leader.setAttribute('y2', f1(A.cy + cur.y * A.k));
        A.cardLbl.textContent = `probe card, ${ns} site${ns > 1 ? 's' : ''}`;
        // panel B: the wafer moves under fixed tips (X follows the card position, Z follows the touchdown cycle)
        const B = G.B;
        const z = ph < PH.up ? Z_UP * ph / PH.up : ph < PH.test ? Z_UP : ph < PH.down ? Z_UP * (1 - (ph - PH.test) / (PH.down - PH.test)) : 0;
        const xc = cur.x + cur.w / 2, xn = nxt.x + nxt.w / 2, xmm = ph >= PH.down && !sim.done ? xc + (xn - xc) * (ph - PH.down) / (1 - PH.down) : xc;
        const shift = -xmm * B.pxmm;
        B.moverZ.setAttribute('transform', `translate(${f1(shift)} ${f1(z)})`); B.moverX.setAttribute('transform', `translate(${f1(shift)} 0)`);
        B.zCol.setAttribute('x', f1(B.zx + shift)); B.zCol.setAttribute('y', f1(B.zy + z)); B.zCol.setAttribute('height', f1(B.zh - z));
        B.glow.setAttribute('opacity', contact ? 0.75 : 0);
        B.movers.forEach(m => { m.line.setAttribute('x1', f1(m.ax + shift)); m.line.setAttribute('y1', f1(m.ay + (m.mv === 'z' ? z : 0))); });
        if (cur.rowJ !== sim.rowJ) {                                     // cross-section through the card's row of dies
          sim.rowJ = cur.rowJ; B.stripG.innerHTML = '';
          sim.dies.forEach(d => { d.seg = null; if (d.j === cur.rowJ) B.stripG.append(d.seg = svg('rect', { x: f1(B.X(0) + d.x * B.pxmm), y: f1(B.Y(B.WY)), width: f1(Math.max(0.6, sim.s * B.pxmm - 0.2)), height: B.WT, fill: 'var(--panel2)', stroke: 'var(--panel)', 'stroke-width': 0.5 })); });
        }
        sim.dies.forEach(d => { if (d.seg) { d.seg.setAttribute('fill', d.tested ? `var(--${BINS[d.bin - 1].color})` : 'var(--panel2)'); d.seg.setAttribute('fill-opacity', d.tested ? BINS[d.bin - 1].op : 1); } });
        const phase = sim.done ? 3 : ph < PH.up ? 0 : ph < PH.test ? 1 : ph < PH.down ? 2 : 3;
        B.segEls.forEach((s, i) => { s.rr.setAttribute('fill', i === phase ? 'var(--accent)' : 'var(--panel2)'); s.rr.setAttribute('fill-opacity', i === phase ? 0.3 : 1); });
        B.segEls[1].t.textContent = (B.sw >= 330 ? 'in contact · test ' : 'test ') + fmt(st.tTest, 0) + ' s';
        B.marker.setAttribute('transform', `translate(${f1(B.sx0 + ph * B.sw)} ${f1(B.sy)})`);
        const nDies = cur.dies.length;
        B.nowT.textContent = 'Now: ' + (sim.done ? 'wafer finished, unloading to its FOUP' : phase === 0 ? 'chuck rising to first contact + overtravel' : phase === 1 ? `in contact, testing ${nDies} die${nDies > 1 ? 's' : ''} for ${fmt(st.tTest, 0)} s` : phase === 2 ? 'chuck lowering, tips leave the pads' : 'X-Y index to the next touchdown');
        B.rateT.textContent = `Animation: ~${fmt(rate(), 1)} touchdowns/s, not real time.`;
        // progress, readouts, histogram
        const wTime = TD * (st.tTest + T_INDEX) + T_LOAD, wCost = wTime * st.cps, elapsed = Math.min(wTime, T_LOAD + Math.min(TD, sim.pos) * (st.tTest + T_INDEX));
        progBar.style.width = (100 * k / TD).toFixed(1) + '%';
        progText.textContent = `Wafer #${st.wafer}: touchdown ${fmt(Math.min(TD, k + 1))} of ${fmt(TD)} (${fmt(100 * k / TD, 0)} %) · ${fmt(nDies)} die${nDies > 1 ? 's' : ''} under the card · ${hms(elapsed)} of ${hms(wTime)} elapsed`;
        const shown = [0, 0, 0, 0, 0, 0, 0];
        let tested = 0, goodSoFar = 0;
        sim.dies.forEach(d => { if (d.tested) { tested++; shown[d.bin]++; if (d.bin <= 3) goodSoFar++; } });
        shown[0] = N - tested;
        R.n.b.textContent = fmt(N); R.td.b.textContent = fmt(TD); R.util.b.textContent = `${fmt(N / TD, 1)} of ${ns}`;
        R.time.b.textContent = hms(wTime); R.cost.b.textContent = '$' + fmt(wCost, 0);
        R.y.b.textContent = fmt(100 * Y, 1) + ' %'; R.good.b.textContent = N * Y >= 10 ? fmt(N * Y, 0) : fmt(N * Y, 1);
        R.cpg.b.textContent = N * Y >= 0.5 ? '$' + fmt(wCost / (N * Y), wCost / (N * Y) < 10 ? 2 : 0) : '–';
        R.sofar.b.textContent = `${fmt(tested)} / ${fmt(N)} · ${tested ? fmt(100 * goodSoFar / tested, 1) : '–'} %`;
        rows.forEach(r => { r.fill.style.width = (100 * shown[r.b.id] / N).toFixed(1) + '%'; r.n.textContent = `${fmt(shown[r.b.id])} (${fmt(100 * shown[r.b.id] / N, 0)} %)`; });
        const perDie = st.tTest * st.cps / ns, cpg = wCost / (N * Y);
        formula.innerHTML = `Y = e<sup>−A·D0</sup> = e<sup>−${fmt(st.A / 100, 2)} cm² × ${fmt(st.D0, 2)} /cm²</sup> = ${fmt(100 * Y, 1)} %  ·  touchdowns = card positions covering ≥ 1 die = ${fmt(TD)} (at least ⌈${fmt(N)} / ${ns}⌉ = ${fmt(Math.ceil(N / ns))})  ·  wafer time = ${fmt(TD)} × (${fmt(st.tTest, 0)} s test + ${T_INDEX} s index) + ${T_LOAD} s load & align = ${hms(wTime)}  ·  cost = time × $${st.cps.toFixed(3)}/s = $${fmt(wCost, 0)}  ·  per die = ${fmt(st.tTest, 0)} s × $${st.cps.toFixed(3)}/s ÷ ${ns} site${ns > 1 ? 's' : ''} = $${fmt(perDie, 2)}  ·  per good die = $${fmt(wCost, 0)} / (${fmt(N)} × ${fmt(Y, 3)}) ${N * Y >= 0.5 ? '= $' + fmt(cpg, cpg < 10 ? 2 : 0) : '(fewer than one good die expected)'}`;
        ruleNote.innerHTML = `<b>Rule of ten.</b> A bad die caught here costs its share of tester time, about <b>$${fmt(perDie, 2)}</b>, plus the die. Let it escape and each later catch costs roughly ten times more: final test (a package, substrate and assembly slot) ~$${fmt(perDie * 10, 0)}, board test ~$${fmt(perDie * 100, 0)}, system test ~$${fmt(perDie * 1000, 0)}, the field ~$${fmt(perDie * 10000, 0)}. For a CoWoS GPU the first step is hundreds of times, not ten: a die found bad after bonding scraps the >$10 000 of good HBM and interposer beside it. The multipliers are folklore; the shape is right.`;
      }

      // ---------- animation ----------
      function advance(dt) {
        if (sim.done) { sim.hold -= dt; if (sim.hold <= 0) newWafer(); return; }
        sim.pos += rate() * dt; sim.cyc += Math.min(rate(), 3.5) * dt;
        if (sim.pos >= sim.tds.length) { sim.pos = sim.tds.length; sim.done = true; sim.hold = 2.5; }
      }
      function frame(ts) {
        raf = 0;
        if (dead || !st.playing || !visible) return;
        const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts;
        advance(dt); paint();
        raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && st.playing && visible && !dead) { last = 0; raf = requestAnimationFrame(frame); } }
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); });
      io.observe(el);

      // ---------- inputs ----------
      function readInputs() {
        st.D0 = +d0In.value; st.A = +aIn.value; st.tTest = +tIn.value; st.sites = +sSel.value; st.cps = +cIn.value;
        d0Out.textContent = fmt(st.D0, 2) + ' /cm²'; aOut.textContent = fmt(st.A, 0) + ' mm²'; tOut.textContent = fmt(st.tTest, 0) + ' s'; cOut.textContent = '$' + st.cps.toFixed(3) + '/s';
      }
      function onInput() {
        const prevA = st.A, prevS = st.sites, prevD = st.D0; readInputs();
        if (st.A !== prevA || st.sites !== prevS) {
          const frac = sim.tds.length ? sim.pos / sim.tds.length : 0.45;
          layoutDies(); assignBins(); build(); sim.pos = Math.min(frac, 0.999) * sim.tds.length; sim.done = false;
        } else if (st.D0 !== prevD) { assignBins(); resetColors(); }
        paint();
      }
      [d0In, aIn, tIn, cIn].forEach(inp => inp.addEventListener('input', onInput));
      sSel.addEventListener('change', onInput); sSel.addEventListener('input', onInput);

      const sh = t => h('h5', { style: { margin: '16px 0 4px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' } }, t);
      el.append(sh('Presets'), presetRow, controls, M, progWrap, progText, legend, info, readout, formula,
        sh('Bin histogram for this wafer'), hist,
        h('div', { class: 'w-note' }, 'Hard bins are the coarse pass/fail categories (continuity = the tips did not make contact or a pad is open; scan = a structural logic fault; MBIST = built-in memory self-test found an SRAM defect that repair could not fix). Passing dies are speed-binned by a V_min search, the lowest supply voltage at which the die still runs at target clock: a lower V_min means less power for the same speed and a better SKU.'),
        ruleNote,
        h('div', { class: 'w-note' }, 'Model: killer defects land independently and evenly (Poisson), so each die passes with probability e⁻ᴬ·ᴰ⁰; the card tests one die per site and skips positions with no candidate die, so touchdowns at the wafer edge use fewer than all their sites (the "avg. dies per touchdown" readout). Speed bins use an illustrative V_min spread of 0.75 V ± 20 mV and the 10/60/30 % split among fails is illustrative. Not modelled: the ~10 cleaning touchdowns per wafer, and the 90–95 % multi-site efficiency of shared tester instruments, which lengthens a multi-site test time slightly beyond a single-site one. The GPU preset’s 240 s is the module’s hot + room-temperature total for a single-site sort; real GPU cards run 1–2 sites because the tester has no room for more GPU-class supplies.'));

      readInputs(); layoutDies(); assignBins();
      W = Math.round(M.getBoundingClientRect().width) || 700;
      build();
      sim.pos = 0.45 * sim.tds.length; paint();
      start();
      const ro = new ResizeObserver(entries => {
        const w = Math.round(entries[0].contentRect.width);
        if (roRaf) cancelAnimationFrame(roRaf);
        roRaf = requestAnimationFrame(() => { roRaf = 0; if (dead || !w || w < 200 || Math.abs(w - W) < 2) return; W = w; build(); paint(); });
      });
      ro.observe(el);
      ctx.onTheme(() => paint());
      return () => { dead = true; if (raf) cancelAnimationFrame(raf); raf = 0; if (roRaf) cancelAnimationFrame(roRaf); st.playing = false; io.disconnect(); ro.disconnect(); };
    }
  });
})();
