/* Widget: moores-law — "Transistor Counts, 1971 to Now" (Module 11) */
(function () {
  'use strict';
  const N0 = 2300, Y0 = 1971;                       // Intel 4004 anchors the reference line
  const X_MIN = 1970, X_MAX = 2027, LOG_MIN = 3, LOG_MAX = 13;
  // y = year, t = transistors (vendor-stated; multi-die parts count every die), node = marketing node name,
  // a = die area mm² (all dies), clk = MHz (null = not meaningful), c = category, pri = label priority (1 = always try)
  const CHIPS = [
    { id: '4004', name: 'Intel 4004', full: 'Intel 4004', y: 1971, t: 2300, node: '10 µm', a: 12, clk: 0.74, c: 'cpu', pri: 1, lbl: 'r', note: 'The first commercial microprocessor: a 4-bit calculator chip with 2 300 transistors on a 12 mm² die.' },
    { id: '8080', name: '8080', full: 'Intel 8080', y: 1974, t: 6000, node: '6 µm', a: 20, clk: 2, c: 'cpu', pri: 2, lbl: 'rb', note: '8-bit CPU of the first hobbyist computers (Altair 8800).' },
    { id: '8086', name: '8086', full: 'Intel 8086', y: 1978, t: 29000, node: '3 µm', a: 33, clk: 5, c: 'cpu', pri: 1, lbl: 'r', note: '16-bit; the start of the x86 instruction set still used today.' },
    { id: '68000', name: 'MC68000', full: 'Motorola 68000', y: 1979, t: 68000, node: '3.5 µm', a: 44, clk: 8, c: 'cpu', pri: 2, lbl: 'la', note: '16/32-bit CPU of the original Macintosh, Amiga and Atari ST.' },
    { id: '286', name: '80286', full: 'Intel 80286', y: 1982, t: 134000, node: '1.5 µm', a: 49, clk: 6, c: 'cpu', pri: 2, lbl: 'rb', note: 'Added protected mode; the IBM PC/AT chip.' },
    { id: '386', name: '80386', full: 'Intel 80386', y: 1985, t: 275000, node: '1.5 µm', a: 104, clk: 16, c: 'cpu', pri: 1, lbl: 'r', note: 'First 32-bit x86. Die area doubled to 104 mm² to fit it.' },
    { id: '486', name: '80486', full: 'Intel 80486', y: 1989, t: 1200000, node: '1 µm', a: 173, clk: 25, c: 'cpu', pri: 2, lbl: 'la', note: 'Crossed one million transistors by putting the floating-point unit and a cache on the die.' },
    { id: 'pentium', name: 'Pentium', full: 'Intel Pentium', y: 1993, t: 3100000, node: '0.8 µm', a: 294, clk: 60, c: 'cpu', pri: 1, lbl: 'la', note: 'Superscalar (two instructions per clock); a huge 294 mm² die for its day.' },
    { id: 'ppro', name: 'Pentium Pro', full: 'Intel Pentium Pro', y: 1995, t: 5500000, node: '0.5 µm', a: 307, clk: 200, c: 'cpu', pri: 3, lbl: 'rb', note: 'Out-of-order execution; the L2 cache sat on a second die in the package.' },
    { id: 'pii', name: 'Pentium II', full: 'Intel Pentium II', y: 1997, t: 7500000, node: '0.35 µm', a: 203, clk: 300, c: 'cpu', pri: 3, lbl: 'rb', note: 'MMX multimedia instructions; slot cartridge package.' },
    { id: 'piii', name: 'Pentium III', full: 'Intel Pentium III (Katmai)', y: 1999, t: 9500000, node: '0.25 µm', a: 128, clk: 600, c: 'cpu', pri: 3, lbl: 'rb', note: 'SSE vector instructions; clocks passed 500 MHz.' },
    { id: 'p4', name: 'Pentium 4', full: 'Intel Pentium 4 (Willamette)', y: 2000, t: 42000000, node: '180 nm', a: 217, clk: 1500, c: 'cpu', pri: 1, lbl: 'la', note: 'A very deep pipeline built for clock speed: 1.5 GHz at launch.' },
    { id: 'k8', name: 'Athlon 64', full: 'AMD Athlon 64 (ClawHammer)', y: 2003, t: 105900000, node: '130 nm', a: 193, clk: 2200, c: 'cpu', pri: 3, lbl: 'lb', note: 'First 64-bit x86 (AMD64), with the memory controller on the die.' },
    { id: 'prescott', name: 'P4 Prescott', full: 'Intel Pentium 4 Prescott', y: 2004, t: 125000000, node: '90 nm', a: 112, clk: 3800, c: 'cpu', pri: 2, lbl: 'lb', note: 'Dennard scaling breaks: 100+ W, gate leakage eating tens of watts; the 4 GHz part was cancelled (Module 11 §1.4).' },
    { id: 'c2d', name: 'Core 2 Duo', full: 'Intel Core 2 Duo (Conroe)', y: 2006, t: 291000000, node: '65 nm', a: 143, clk: 2930, c: 'cpu', pri: 1, lbl: 'rb', note: 'The pivot to multi-core: two cores at a lower clock instead of one faster core.' },
    { id: 'nehalem', name: 'Nehalem', full: 'Intel Core i7 (Nehalem, Bloomfield)', y: 2008, t: 731000000, node: '45 nm', a: 263, clk: 3200, c: 'cpu', pri: 3, lbl: 'la', note: 'Intel 45 nm: the first high-k/metal-gate process (Module 11 §3.2).' },
    { id: 'sb', name: 'Sandy Bridge', full: 'Intel Core i7 (Sandy Bridge, 4 cores)', y: 2011, t: 1160000000, node: '32 nm', a: 216, clk: 3400, c: 'cpu', pri: 2, lbl: 'la', note: 'CPU, GPU and memory controller on one die; over a billion transistors.' },
    { id: 'a7', name: 'Apple A7', full: 'Apple A7 (iPhone 5s)', y: 2013, t: 1000000000, node: '28 nm', a: 102, clk: 1300, c: 'apple', pri: 1, lbl: 'rb', note: 'First 64-bit phone SoC; one billion transistors in 102 mm².' },
    { id: 'gv100', name: 'GV100', full: 'NVIDIA GV100 (Volta)', y: 2017, t: 21100000000, node: '12 nm', a: 815, clk: 1530, c: 'gpu', pri: 1, lbl: 'la', note: 'First tensor cores. 815 mm² is near the conventional single-exposure field limit; specialized wafer-scale circuits can span multiple fields.' },
    { id: 'a12', name: 'Apple A12', full: 'Apple A12 Bionic', y: 2018, t: 6900000000, node: '7 nm', a: 83, clk: 2490, c: 'apple', pri: 2, lbl: 'rb', note: 'First 7 nm phone chip (TSMC N7, Module 11 node table).' },
    { id: 'rome', name: 'Epyc Rome', full: 'AMD Epyc 7742 (Rome)', y: 2019, t: 39500000000, node: '7 nm + 14 nm', a: 1008, clk: 3400, c: 'cpu', pri: 2, lbl: 'la', note: 'Nine chiplets: eight 74 mm² 7 nm core dies plus a 416 mm² 14 nm I/O die. Count and area include all nine.' },
    { id: 'a100', name: 'A100', full: 'NVIDIA A100 (Ampere)', y: 2020, t: 54200000000, node: '7 nm', a: 826, clk: 1410, c: 'gpu', pri: 2, lbl: 'la', note: '826 mm² die on TSMC N7: the 40 GB A100 uses HBM2; the later 80 GB version uses HBM2e.' },
    { id: 'm1', name: 'Apple M1', full: 'Apple M1', y: 2020, t: 16000000000, node: '5 nm', a: 119, clk: 3200, c: 'apple', pri: 3, lbl: 'rb', note: 'First Apple Silicon Mac chip, TSMC N5.' },
    { id: 'a15', name: 'Apple A15', full: 'Apple A15 Bionic', y: 2021, t: 15000000000, node: '5 nm', a: 108, clk: 3230, c: 'apple', pri: 3, lbl: 'rb', note: 'A phone chip with 15 billion transistors, ~140 MTr/mm².' },
    { id: 'wse2', name: 'Cerebras WSE-2', full: 'Cerebras WSE-2 (wafer-scale)', y: 2021, t: 2600000000000, node: '7 nm', a: 46225, clk: null, c: 'wafer', pri: 0.5, lbl: 'l', note: 'Wafer-scale: one 215 × 215 mm "chip" is the whole usable area of a 300 mm wafer, so it is not comparable to a single die.' },
    { id: 'm1u', name: 'M1 Ultra', full: 'Apple M1 Ultra', y: 2022, t: 114000000000, node: '5 nm', a: 840, clk: 3200, c: 'apple', pri: 2, lbl: 'la', note: 'Two M1 Max dies (~420 mm² each) joined edge-to-edge on a silicon bridge.' },
    { id: 'h100', name: 'H100', full: 'NVIDIA H100 (Hopper)', y: 2022, t: 80000000000, node: '4 nm (N4)', a: 814, clk: 1980, c: 'gpu', pri: 0.5, lbl: 'rb', note: 'Module 11: 80 B / 814 mm² ≈ 98 MTr/mm², about 70% of the N5-class peak density because SRAM, I/O and analog blocks scale worse than logic.' },
    { id: '7950x', name: 'Ryzen 9 7950X', full: 'AMD Ryzen 9 7950X (Zen 4)', y: 2022, t: 13100000000, node: '5 nm + 6 nm', a: 264, clk: 5700, c: 'cpu', pri: 2, lbl: 'rb', note: 'Two 71 mm² 5 nm core chiplets plus a 122 mm² 6 nm I/O die; 5.7 GHz boost is about where desktop clocks have stalled.' },
    { id: 'mi300x', name: 'MI300X', full: 'AMD Instinct MI300X', y: 2023, t: 153000000000, node: '5 nm + 6 nm', a: 2400, clk: 2100, c: 'gpu', pri: 3, lbl: 'r', note: 'Twelve chiplets stacked in 3D: eight 5 nm compute dies on four 6 nm base dies (~2 400 mm² of silicon, approx.).' },
    { id: 'b200', name: 'B200', full: 'NVIDIA B200 (Blackwell)', y: 2024, t: 208000000000, node: '4 nm (4NP)', a: 1600, clk: null, c: 'gpu', pri: 0.5, lbl: 'a', note: 'Two reticle-sized dies (~800 mm² each) bonded on a CoWoS-L package (Module 20): 208 B transistors in one package, not one die.' },
  ];
  const CAT = { cpu: { color: 'var(--si)', label: 'CPU (Intel, AMD, Motorola)' }, apple: { color: 'var(--accent2)', label: 'Apple SoC' }, gpu: { color: 'var(--accent)', label: 'GPU / AI accelerator' }, wafer: { color: 'var(--cu)', label: 'wafer-scale (a whole 300 mm wafer)' } };
  // Cost per transistor, relative to the 28 nm node (Module 20 wafer-price table: $ per 100 M transistors 0.28 → 0.20 → 0.15 → 0.17 → 0.13 → 0.16)
  const COST_KNOTS = [[2011, 1, '28 nm'], [2015, 0.71, '16 nm'], [2018, 0.54, '7 nm'], [2020, 0.61, '5 nm'], [2023, 0.46, '3 nm'], [2025, 0.57, '2 nm']];
  const C2011 = Math.pow(0.7, 2011 - Y0);         // ~30 %/yr decline for four decades before 2011
  function costRel(year) {                          // relative to 1971 = 1 (approximate)
    if (year <= 2011) return Math.pow(0.7, year - Y0);
    for (let i = 0; i < COST_KNOTS.length - 1; i++) {
      const [y1, c1] = COST_KNOTS[i], [y2, c2] = COST_KNOTS[i + 1];
      if (year <= y2) { const f = (year - y1) / (y2 - y1); return C2011 * Math.exp(Math.log(c1) + f * (Math.log(c2) - Math.log(c1))); }
    }
    return C2011 * COST_KNOTS[COST_KNOTS.length - 1][1];
  }
  const trim = v => v >= 100 ? v.toFixed(0) : v >= 10 ? String(Math.round(v * 10) / 10) : String(Math.round(v * 100) / 100);
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹', sup = e => (e < 0 ? '⁻' : '') + String(Math.abs(e)).split('').map(d => SUP[+d]).join('');
  const sci = n => { const e = Math.floor(Math.log10(n)); return trim(n / Math.pow(10, e)) + ' × 10' + sup(e); };
  const fmtCount = n => n >= 1e15 ? sci(n) : n >= 1e12 ? trim(n / 1e12) + ' T' : n >= 1e9 ? trim(n / 1e9) + ' B' : n >= 1e6 ? trim(n / 1e6) + ' M' : n >= 1e3 ? trim(n / 1e3) + ' k' : String(n);
  const fmtClk = m => m == null ? 'n/a' : m >= 1000 ? trim(m / 1000) + ' GHz' : trim(m) + ' MHz';
  const NB = s => String(s).replace(/ /g, ' ');   // thousands groups joined with narrow no-break spaces so a number never wraps mid-way
  const refAt = (year, T) => N0 * Math.pow(2, (year - Y0) / T);
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const CAND = {                                    // label anchors around a dot: right, left, above, below and the four diagonals
    r: (x, y) => ({ x: x + 9, y: y + 4, an: 'start' }), l: (x, y) => ({ x: x - 9, y: y + 4, an: 'end' }),
    a: (x, y) => ({ x, y: y - 9, an: 'middle' }), b: (x, y) => ({ x, y: y + 15, an: 'middle' }),
    ra: (x, y) => ({ x: x + 7, y: y - 5, an: 'start' }), rb: (x, y) => ({ x: x + 7, y: y + 13, an: 'start' }),
    la: (x, y) => ({ x: x - 7, y: y - 5, an: 'end' }), lb: (x, y) => ({ x: x - 7, y: y + 13, an: 'end' }),
  };
  const FAR = {                                     // a further-out ring, tried before letting an important label cross the reference line
    r: (x, y) => ({ x: x + 14, y: y + 4, an: 'start' }), l: (x, y) => ({ x: x - 14, y: y + 4, an: 'end' }),
    a: (x, y) => ({ x, y: y - 18, an: 'middle' }), b: (x, y) => ({ x, y: y + 24, an: 'middle' }),
    ra: (x, y) => ({ x: x + 12, y: y - 14, an: 'start' }), rb: (x, y) => ({ x: x + 12, y: y + 22, an: 'start' }),
    la: (x, y) => ({ x: x - 12, y: y - 14, an: 'end' }), lb: (x, y) => ({ x: x - 12, y: y + 22, an: 'end' }),
  };
  const ORDER = ['r', 'l', 'ra', 'la', 'rb', 'lb', 'a', 'b'];
  const HALO = { 'paint-order': 'stroke', stroke: 'var(--panel)', 'stroke-width': 3, 'stroke-linejoin': 'round' };   // knockout halo: text stays legible over lines and curves
  // best-fit doubling time: least squares of log2(N) on year, wafer-scale excluded
  const FIT = (() => {
    const p = CHIPS.filter(c => c.c !== 'wafer'); const my = p.reduce((s, c) => s + c.y, 0) / p.length, ml = p.reduce((s, c) => s + Math.log2(c.t), 0) / p.length;
    let sxy = 0, sxx = 0; p.forEach(c => { sxy += (c.y - my) * (Math.log2(c.t) - ml); sxx += (c.y - my) ** 2; });
    return { T: sxx / sxy, n: p.length, y0: Math.min(...p.map(c => c.y)), y1: Math.max(...p.map(c => c.y)) };
  })();

  window.registerWidget('moores-law', {
    title: 'Transistor Counts, 1971 to Now',
    caption: 'Every dot is a real chip on a log scale; hover or tap one for its node and die area, drag the doubling period to fit the dashed line, and overlay clock speed or cost per transistor to see what stopped scaling.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const st = { T: 2, overlay: 'none', sel: CHIPS.find(c => c.id === 'h100'), tipOn: true, cursor: null, playing: false };
      let W = 0, H = 0, L = 58, R = 16, TOP = 22, B = 44, pw = 0, ph = 0, narrow = false;
      let dots = new Map(), labelRects = [], tip = null, refClip = null, cursorG = null, rlEl = null, rlYear = 0, raf = 0, visible = true, lastTs = 0, dead = false, roRaf = 0;
      const xOf = yr => L + (yr - X_MIN) / (X_MAX - X_MIN) * pw;
      const yOf = lg => TOP + (LOG_MAX - lg) / (LOG_MAX - LOG_MIN) * ph;
      const yClk = mhz => TOP + (9.5 - Math.log10(mhz)) / 10 * ph;       // right axis, clock: 10 decades, 1 MHz…10 GHz in the lower half
      const yCost = c => TOP + (0.5 - Math.log10(c)) / 10 * ph;         // right axis, cost: 1 at the top-left void, 10⁻⁶ in the lower-right void
      const txt = (x, y, s, o) => svg('text', Object.assign({ x, y, 'font-family': 'var(--sans)', 'font-size': 11, fill: 'var(--muted)' }, o || {}), s);

      // ---------- controls ----------
      const tIn = h('input', { type: 'range', min: 1, max: 4, step: 0.1, value: st.T }), tOut = h('output');
      const ovSel = h('select', { style: { width: '100%', minWidth: 0 } }, h('option', { value: 'none' }, 'none'), h('option', { value: 'clock' }, 'clock frequency'), h('option', { value: 'cost' }, 'cost per transistor'));
      const playBtn = h('button', { class: 'w-btn primary ml-play' }, 'Play 1971 → 2027');
      const fitBtn = h('button', { class: 'w-btn ml-fit', title: 'Set the doubling period to the least-squares fit of all single-die and multi-die chips' }, 'Snap T to best fit');
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Doubling period T'), tIn, tOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Overlay (right axis)'), ovSel),
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, playBtn, fitBtn));
      const legend = h('div', { class: 'w-legend' },
        ...Object.keys(CAT).map(k => h('span', { class: 'w-legend-item' }, h('i', { style: { background: CAT[k].color, borderRadius: k === 'wafer' ? '2px' : '50%' } }), CAT[k].label)),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'none', borderTop: '2px dashed var(--ink)', height: '0', width: '18px', borderRadius: 0 } }), 'reference: ×2 every T years from the 4004'));
      const chart = svg('svg', { class: 'w-svg', role: 'group', 'aria-label': 'Transistor count per chip versus year, log scale' });
      const infoName = h('b'), infoBody = h('span');
      const info = h('div', { style: { border: '1px solid var(--line)', borderRadius: '6px', padding: '8px 12px', margin: '8px 0', fontSize: '13px' } }, h('div', null, infoName), h('div', { style: { color: 'var(--muted)', marginTop: '2px' } }, infoBody));
      const stCount = h('b'), stDens = h('b'), stRatio = h('b'), stDbl = h('b'), stFit = h('b'), stCur = h('b');
      const lbCount = h('span'), lbRatio = h('span'), lbCur = h('span', null, 'reference line at 2027 (T = 2.0 yr)');
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, stCount, lbCount), h('div', { class: 'w-stat' }, stDens, h('span', null, 'density = N ÷ die area (Tr = transistors)')),
        h('div', { class: 'w-stat' }, stDbl, h('span', { html: 'doublings since the 4004 = log₂(N ÷ <span style="white-space:nowrap">2 300</span>)' })), h('div', { class: 'w-stat' }, stRatio, lbRatio),
        h('div', { class: 'w-stat' }, stCur, lbCur), h('div', { class: 'w-stat' }, stFit, h('span', null, `best-fit doubling time, ${FIT.n} chips ${FIT.y0}–${FIT.y1} (wafer-scale excluded)`)));
      const formula = h('div', { class: 'w-formula', html: 'N(t) = N₀ · <span style="white-space:nowrap">2<sup>(t − 1971) / T</sup></span>, N₀ = <span style="white-space:nowrap">2 300</span> (Intel 4004), T = doubling period &nbsp;·&nbsp; doublings = log₂(N / N₀) &nbsp;·&nbsp; density = N / A<sub>die</sub>' });
      const ovNote = h('div', { class: 'w-note', style: { color: 'var(--ink)' } });

      // ---------- chart ----------
      let lineCells = [];   // the reference line and any overlay curve, sampled into 4 px cells: labels avoid them when they can (soft), cross them if they must
      function place(t, cands, occ, bounds, pad, own, far) {   // greedy: first candidate inside bounds that hits nothing hard (own = this label's dot, ignored)
        const passes = [[lineCells, cands]]; if (far) passes.push([lineCells, far]); passes.push([[], cands]); if (far) passes.push([[], far]);
        for (const [soft, ring] of passes) for (const c of ring) {
          t.setAttribute('x', c.x); t.setAttribute('y', c.y); t.setAttribute('text-anchor', c.an);
          const b = t.getBBox(), r = { x: b.x - pad, y: b.y - pad, w: b.width + 2 * pad, h: b.height + 2 * pad };
          if (r.x < bounds.x0 || r.y < bounds.y0 || r.x + r.w > bounds.x1 || r.y + r.h > bounds.y1) continue;
          if (occ.some(o => o !== own && hit(o, r)) || soft.some(o => hit(o, r))) continue;
          occ.push(r); r.cand = c; return r;
        }
        t.remove(); return null;
      }
      function build() {
        narrow = W < 560; H = narrow ? 420 : 460; R = st.overlay === 'none' ? 16 : 76;
        pw = W - L - R; ph = H - TOP - B;
        chart.setAttribute('viewBox', `0 0 ${W} ${H}`); chart.replaceChildren();
        const occ = [], bounds = { x0: L + 1, y0: 3, x1: W - 2, y1: TOP + ph + 4 };
        // grid + axes
        for (let e = LOG_MIN; e <= LOG_MAX; e++) {
          const y = yOf(e); chart.append(svg('line', { x1: L, y1: y, x2: L + pw, y2: y, stroke: 'var(--line)', 'stroke-width': 1 }));
          chart.append(txt(L - 7, y + 4, fmtCount(Math.pow(10, e)), { 'text-anchor': 'end', 'font-family': 'var(--mono)' }));
        }
        const tickEvery = pw / 5.7 >= 36 ? 10 : 20;                    // decade labels need ~36 px each; else label 1980, 2000, 2020
        for (let yr = X_MIN; yr <= X_MAX; yr += 10) {
          const x = xOf(yr); chart.append(svg('line', { x1: x, y1: TOP, x2: x, y2: TOP + ph, stroke: 'var(--line)', 'stroke-width': 1 }));
          if ((yr - 1980) % tickEvery === 0) chart.append(txt(x, TOP + ph + 16, yr, { 'text-anchor': 'middle', 'font-family': 'var(--mono)' }));
        }
        chart.append(svg('line', { x1: L, y1: TOP, x2: L, y2: TOP + ph, stroke: 'var(--line2)' }), svg('line', { x1: L, y1: TOP + ph, x2: L + pw, y2: TOP + ph, stroke: 'var(--line2)' }));
        chart.append(txt(12, TOP + ph / 2, 'transistors per chip (log scale)', { 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--ink)', transform: `rotate(-90 12 ${TOP + ph / 2})` }));
        chart.append(txt(L + pw / 2, H - 6, 'year of introduction', { 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--ink)' }));
        labelRects = []; lineCells = [];
        // reference-line geometry first, so every label placed below (overlay knots, chips) can avoid it
        const yEnd = Math.min(X_MAX, Y0 + st.T * Math.log2(Math.pow(10, LOG_MAX) / N0));
        for (let k = 0; k <= 80; k++) { const yr = Y0 + (yEnd - Y0) * k / 80, lx = xOf(yr), ly = yOf(Math.log10(refAt(yr, st.T))); lineCells.push({ x: lx - 2, y: ly - 2, w: 4, h: 4 }); }
        // overlay (drawn under the reference line and the dots)
        if (st.overlay !== 'none') drawOverlay(occ, bounds);
        // reference line, clipped by the sweep cursor
        const clipId = 'mlclip-' + Math.random().toString(36).slice(2, 8);
        refClip = svg('rect', { x: L, y: 0, width: pw, height: H });
        chart.append(svg('defs', null, svg('clipPath', { id: clipId }, refClip)));
        chart.append(svg('line', { x1: xOf(Y0), y1: yOf(Math.log10(N0)), x2: xOf(yEnd), y2: yOf(Math.log10(refAt(yEnd, st.T))), stroke: 'var(--ink)', 'stroke-width': 1.5, 'stroke-dasharray': '6 4', 'clip-path': `url(#${clipId})` }));
        // dots
        dots = new Map();
        const dotsG = svg('g'); chart.append(dotsG);
        CHIPS.forEach(c => {
          const px = xOf(c.y), py = yOf(Math.log10(c.t)), col = CAT[c.c].color;
          const shape = c.c === 'wafer' ? svg('rect', { x: px - 5.5, y: py - 5.5, width: 11, height: 11, rx: 1.5 }) : svg('circle', { cx: px, cy: py, r: 5.5 });
          Object.entries({ fill: col, stroke: 'var(--panel)', 'stroke-width': 1.5, 'data-chip': c.id, tabindex: 0, role: 'button', 'aria-label': `${c.full}, ${c.y}, ${fmtCount(c.t)} transistors`, style: 'cursor:pointer;outline:none' }).forEach(([k, v]) => shape.setAttribute(k, v));
          ['pointerenter', 'focus', 'click'].forEach(ev => shape.addEventListener(ev, () => select(c)));
          shape.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(c); } });
          const r = { x: px - 6.5, y: py - 6.5, w: 13, h: 13 }; occ.push(r);
          dotsG.append(shape); dots.set(c.id, { el: shape, px, py, c, label: null, rect: r });
        });
        // labels in place, greedy collision-free placement (important labels get a further-out ring before they may cross a line)
        const wantPri = narrow ? 1 : 2;
        CHIPS.filter(c => c.pri <= wantPri).sort((a, b) => a.pri - b.pri).forEach(c => {
          const d = dots.get(c.id), t = txt(0, 0, narrow ? c.name : `${c.name} · ${fmtCount(c.t)}`, Object.assign({ fill: 'var(--ink)', 'font-size': 11 }, HALO));
          chart.append(t);
          const keys = [c.lbl, ...ORDER.filter(k => k !== c.lbl)];
          const r = place(t, keys.map(k => CAND[k](d.px, d.py)), occ, bounds, 1.5, d.rect, c.pri <= 1 ? keys.map(k => FAR[k](d.px, d.py)) : null);
          if (r) { labelRects.push(Object.assign(r, { el: t, pri: c.pri })); d.label = t; }
        });
        // reference-line label near its upper end; it remembers the year it sits at so the sweep can reveal it with the line
        const rl = txt(0, 0, `×2 every ${st.T.toFixed(1)} yr`, Object.assign({ fill: 'var(--ink)', 'font-size': 11, 'font-family': 'var(--mono)' }, HALO)); chart.append(rl);
        const rlc = [];                                                    // try beside the line's end first, then further back along it
        [1, 0.9, 0.8, 0.7, 0.6, 0.5].forEach(f => { const yr = Y0 + (yEnd - Y0) * f, ex = xOf(yr), ey = yOf(Math.log10(refAt(yr, st.T))); ['la', 'lb', 'rb', 'ra'].forEach(k => rlc.push(Object.assign(CAND[k](ex, ey), { yr }))); });
        const rr = place(rl, rlc, occ, bounds, 2); rlEl = null;
        if (rr) { labelRects.push(Object.assign(rr, { el: rl, pri: 1 })); rlEl = rl; rlYear = rr.cand.yr; }
        // sweep cursor + tooltip on top
        cursorG = svg('g', { opacity: 0 }, svg('line', { y1: TOP, y2: TOP + ph, stroke: 'var(--ink)', 'stroke-width': 1.5 }), svg('rect', { width: 40, height: 18, rx: 3, fill: 'var(--ink)' }), svg('text', { 'font-family': 'var(--mono)', 'font-size': 11.5, 'font-weight': 600, fill: 'var(--panel)', 'text-anchor': 'middle' }));
        chart.append(cursorG);
        tip = svg('g', { style: 'pointer-events:none' }, svg('line', { stroke: 'var(--muted)', 'stroke-width': 1 }), svg('rect', { rx: 4, fill: 'var(--panel)', stroke: 'var(--line2)' }), svg('text', { 'font-family': 'var(--sans)', 'font-size': 11.5, 'font-weight': 600, fill: 'var(--ink)' }), svg('text', { 'font-family': 'var(--mono)', 'font-size': 11, fill: 'var(--ink)' }), svg('text', { 'font-family': 'var(--mono)', 'font-size': 11, fill: 'var(--muted)' }));
        chart.append(tip);
        applyCursor();
      }
      function drawOverlay(occ, bounds) {
        const rx = L + pw; const ax = (ticks, yfn, title, color) => {
          chart.append(svg('line', { x1: rx, y1: yfn(ticks[0].v), x2: rx, y2: yfn(ticks[ticks.length - 1].v), stroke: color, 'stroke-width': 1.5 }));
          ticks.forEach(tk => { const y = yfn(tk.v); chart.append(svg('line', { x1: rx, y1: y, x2: rx + 5, y2: y, stroke: color })); const t = txt(rx + 8, y + 4, tk.s, { 'font-family': 'var(--mono)', fill: color }); chart.append(t); const b = t.getBBox(); occ.push({ x: b.x - 2, y: b.y - 2, w: b.width + 4, h: b.height + 4 }); });
          chart.append(txt(W - 14, TOP + ph / 2, title, { 'text-anchor': 'middle', 'font-size': 11.5, fill: color, transform: `rotate(90 ${W - 14} ${TOP + ph / 2})` }));   // baseline 14 px in: the rotated glyph box stays inside the viewBox
        };
        const cells = pts => {                                            // sample a polyline into 4 px cells so labels can avoid it
          for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3)); for (let k = 0; k <= n; k++) lineCells.push({ x: x0 + (x1 - x0) * k / n - 2, y: y0 + (y1 - y0) * k / n - 2, w: 4, h: 4 }); }
        };
        const seg = s => typeof s === 'string' ? s : svg('tspan', { 'baseline-shift': 'sub', 'font-size': 8.5 }, s.sub);   // {sub:'DD'} renders as a subscript
        const ann = (yr, lines, color, left, low) => {                   // dashed year marker + a short note beside it, in the empty lower band
          const x = xOf(yr), lh = low ? 13 : 14, y0 = low ? TOP + ph - 7 - lh * (lines.length - 1) : TOP + ph * 0.86 - (lines.length - 2) * lh / 2;
          chart.append(svg('line', { x1: x, y1: TOP, x2: x, y2: TOP + ph, stroke: color, 'stroke-width': 1, 'stroke-dasharray': '3 3' })); cells([[x, TOP], [x, TOP + ph]]);
          const mk = (tx, an) => svg('text', Object.assign({ x: tx, y: y0, 'text-anchor': an, 'font-family': 'var(--sans)', 'font-size': 11, fill: color }, HALO), ...lines.map((ln, i) => svg('tspan', { x: tx, dy: i ? lh : 0 }, ...[].concat(ln).map(seg))));
          let t = mk(left ? x - 6 : x + 6, left ? 'end' : 'start'); chart.append(t); let b = t.getBBox();
          if (!left && b.x + b.width > L + pw - 4) { t.remove(); t = mk(x - 6, 'end'); chart.append(t); b = t.getBBox(); }   // would run into the right axis: flip to the left of the marker
          const r = { x: b.x - 2, y: b.y - 2, w: b.width + 4, h: b.height + 4, el: t, pri: 1 }; occ.push(r); labelRects.push(r);
        };
        if (st.overlay === 'clock') {
          const col = 'var(--bad)';                                       // distinct from the amber GPU dots
          ax([{ v: 1, s: '1 MHz' }, { v: 10, s: '10 MHz' }, { v: 100, s: '100 MHz' }, { v: 1000, s: '1 GHz' }, { v: 10000, s: '10 GHz' }], yClk, 'clock frequency (approx.)', col);
          const cpus = CHIPS.filter(c => c.clk != null && c.c !== 'gpu').sort((a, b) => a.y - b.y); let mx = 0;
          const run = cpus.map(c => { mx = Math.max(mx, c.clk); return [xOf(c.y), yClk(mx)]; });
          chart.append(svg('polyline', { points: run.map(p => p.join(',')).join(' '), fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-dasharray': '2 3', opacity: 0.9 })); cells(run);
          CHIPS.filter(c => c.clk != null).forEach(c => { const x = xOf(c.y), y = yClk(c.clk); chart.append(svg('path', { d: `M${x},${y - 4.5} L${x + 4.5},${y} L${x},${y + 4.5} L${x - 4.5},${y} Z`, fill: 'var(--panel)', stroke: col, 'stroke-width': 1.5 })); occ.push({ x: x - 6, y: y - 6, w: 12, h: 12 }); });
          ann(2005, narrow ? ['Dennard', 'scaling', 'ends ~2005'] : ['Dennard scaling ends ~2005:', ['V', { sub: 'DD' }, ' stuck near 1 V,'], 'clocks stall at 3–5 GHz'], col, false, narrow);
        } else {
          const col = 'var(--ok)', pts = [];
          ax([{ v: 1, s: '1' }, { v: 1e-2, s: '10⁻²' }, { v: 1e-4, s: '10⁻⁴' }, { v: 1e-6, s: '10⁻⁶' }], yCost, 'cost per transistor, 1971 = 1 (approx.)', col);
          for (let yr = Y0; yr <= 2026; yr += 0.5) pts.push([xOf(yr), yCost(costRel(yr))]);
          chart.append(svg('polyline', { points: pts.map(p => p.join(',')).join(' '), fill: 'none', stroke: col, 'stroke-width': 2.5, opacity: 0.9 })); cells(pts);
          const kx = COST_KNOTS.map(([yr]) => xOf(yr)), crowded = Math.min(...kx.slice(1).map((x, i) => x - kx[i])) < 12;   // knots closer than 12 px: name only the first and last
          COST_KNOTS.forEach(([yr, , nm], i) => {
            const x = kx[i], y = yCost(costRel(yr)); chart.append(svg('circle', { cx: x, cy: y, r: 3.5, fill: 'var(--panel)', stroke: col, 'stroke-width': 1.5 })); occ.push({ x: x - 5, y: y - 5, w: 10, h: 10 });
            if (crowded && i !== 0 && i !== COST_KNOTS.length - 1) return;
            const t = txt(0, 0, nm, Object.assign({ fill: col, 'font-size': 11, 'font-family': 'var(--mono)' }, HALO)); chart.append(t);
            const up = { x, y: y - 11, an: 'middle' }, dn = { x, y: y + 17, an: 'middle' };   // alternate above / below the flat curve
            const kr = place(t, i % 2 ? [up, dn, CAND.rb(x, y), CAND.ra(x, y)] : [dn, up, CAND.rb(x, y), CAND.ra(x, y)], occ, bounds, 1); if (kr) labelRects.push(Object.assign(kr, { el: t, pri: 2 }));
          });
          ann(2012, narrow ? ['flat since', '28 nm (~2012)'] : ['cost per transistor flat since ~2012:', '28 → 20 nm double patterning raised wafer cost'], col, true);
        }
      }
      function showTip() {
        const d = st.sel && dots.get(st.sel.id); if (!d || !tip) return;
        dots.forEach(o => { o.el.setAttribute('stroke', o === d ? 'var(--ink)' : 'var(--panel)'); o.el.setAttribute('stroke-width', o === d ? 2.5 : 1.5); });
        labelRects.forEach(o => { o.el.style.display = ''; }); tip.style.display = st.tipOn ? '' : 'none'; if (!st.tipOn) return;
        const [lead, rect, l1, l2, l3] = tip.children; const c = d.c;
        l1.textContent = `${c.name} · ${c.y}`; l2.textContent = `${fmtCount(c.t)} transistors`; l3.textContent = `${c.node} · ${NB(fmt(c.a, 0))} mm²`;
        [l1, l2, l3].forEach(t => { t.setAttribute('x', 0); t.setAttribute('y', 0); });
        const bw = Math.max(l1.getBBox().width, l2.getBBox().width, l3.getBBox().width) + 14, bh = 52, xMax = L + pw + (st.overlay === 'none' ? R - 2 : 0);
        // the box is transient: it prefers a spot beside the dot that hides no label (the chip's own label is a duplicate and free)
        // and covers few other dots; a spot ~44 px out (with a leader line) costs 0.5, the corners are a last resort at 4
        const score = (x, y, base, loose) => {
          if (x < L + 1 || y < 2 || x + bw > (loose ? W - 2 : xMax) || y + bh > TOP + ph - 1) return null;
          const box = { x, y, w: bw, h: bh }, cov = labelRects.filter(o => hit(o, box)); let nd = 0; dots.forEach(o => { if (o !== d && hit(o.rect, box)) nd++; });
          return { x, y, cov, cost: base + cov.reduce((s, o) => s + (o.el === d.label ? 0 : 1 / o.pri), 0) + 0.2 * nd };
        };
        const ring = g => [[d.px + g, d.py - bh - 2], [d.px - bw - g, d.py - bh - 2], [d.px + g, d.py + 4], [d.px - bw - g, d.py + 4], [d.px - bw / 2, d.py - bh - g], [d.px - bw / 2, d.py + g], [d.px + g, d.py - bh / 2], [d.px - bw - g, d.py - bh / 2]];
        const corner = (x, y) => score(Math.max(L + 1, Math.min(x, W - bw - 2)), y, 4, true) || { x: L + 1, y, cov: [], cost: 9 };   // last resort, always valid: may cover the right axis on a very narrow chart
        const best = ring(10).map(([x, y]) => score(x, y, 0)).concat(ring(44).map(([x, y]) => score(x, y, 0.5)), [corner(L + 8, TOP + 4), corner(L + pw - bw - 4, TOP + ph - bh - 4)])
          .filter(Boolean).reduce((a, b) => (a.cost <= b.cost ? a : b));
        best.cov.forEach(o => { o.el.style.display = 'none'; });
        rect.setAttribute('x', best.x); rect.setAttribute('y', best.y); rect.setAttribute('width', bw); rect.setAttribute('height', bh);
        [l1, l2, l3].forEach((t, i) => { t.setAttribute('x', best.x + 7); t.setAttribute('y', best.y + 15 + i * 15); });
        // leader from the nearest box edge to the dot whenever the box had to move away from it
        const nx = Math.max(best.x, Math.min(d.px, best.x + bw)), ny = Math.max(best.y, Math.min(d.py, best.y + bh)), gap = Math.hypot(d.px - nx, d.py - ny);
        lead.style.display = gap > 40 ? '' : 'none';
        if (gap > 40) { const ux = (d.px - nx) / gap, uy = (d.py - ny) / gap; Object.entries({ x1: nx, y1: ny, x2: d.px - ux * 7, y2: d.py - uy * 7 }).forEach(([k, v]) => lead.setAttribute(k, v)); }
        chart.append(tip);
      }
      function select(c) { st.sel = c; st.tipOn = true; showTip(); paintReadout(); }
      function applyCursor() {
        const cur = st.cursor; if (refClip) refClip.setAttribute('width', cur == null ? pw : Math.max(0, xOf(cur) - L));
        dots.forEach(d => { const on = cur == null || d.c.y <= cur; d.el.setAttribute('opacity', on ? 1 : 0.15); d.el.style.pointerEvents = on ? 'auto' : 'none'; if (d.label) d.label.setAttribute('opacity', on ? 1 : 0.15); });
        if (rlEl) rlEl.setAttribute('opacity', cur == null || rlYear <= cur ? 1 : 0.15);   // the line's label appears when the sweep reaches it
        if (cursorG) { cursorG.setAttribute('opacity', cur == null ? 0 : 1); if (cur != null) { const x = xOf(cur); const [ln, rc, tx] = cursorG.children; ln.setAttribute('x1', x); ln.setAttribute('x2', x); rc.setAttribute('x', Math.min(x - 20, W - 42)); rc.setAttribute('y', TOP - 20); tx.setAttribute('x', Math.min(x, W - 22)); tx.setAttribute('y', TOP - 7); tx.textContent = Math.floor(cur); } }
        if (tip) { tip.setAttribute('opacity', cur == null ? 1 : 0); if (cur != null) labelRects.forEach(o => { o.el.style.display = ''; }); else showTip(); }
        const yr = cur == null ? X_MAX : Math.floor(cur); stCur.textContent = fmtCount(refAt(yr, st.T)); lbCur.textContent = `reference line at ${yr} (T = ${st.T.toFixed(1)} yr)`;
      }
      function paintReadout() {
        const c = st.sel; tOut.textContent = st.T.toFixed(1) + ' yr';
        stCount.textContent = fmtCount(c.t); lbCount.textContent = `${c.full}, ${c.y}: ${NB(fmt(c.t, 0))} transistors`;
        const d = c.t / c.a; stDens.textContent = d >= 1e6 ? fmt(d / 1e6, d >= 1e7 ? 0 : 1) + ' MTr/mm²' : d >= 1e3 ? fmt(d / 1e3, d >= 1e4 ? 0 : 1) + ' kTr/mm²' : fmt(d, 0) + ' Tr/mm²';
        stDbl.textContent = fmt(Math.log2(c.t / N0), 1);
        const ratio = c.t / refAt(c.y, st.T); stRatio.textContent = ratio >= 10 ? NB(fmt(ratio, 0)) + '×' : ratio >= 0.01 ? fmt(ratio, 2) + '×' : sci(ratio); lbRatio.textContent = `${c.name} ÷ reference line at ${c.y} (${fmtCount(refAt(c.y, st.T))})`;
        stFit.textContent = fmt(FIT.T, 2) + ' yr';
        infoName.textContent = `${c.full} (${c.y}) — ${fmtCount(c.t)} transistors · node ${c.node} · die ${NB(fmt(c.a, 0))} mm² · clock ${fmtClk(c.clk)}`;
        infoBody.textContent = c.note;
        ovNote.innerHTML = st.overlay === 'clock'
          ? 'Clock overlay (approximate launch clocks; dotted line = highest CPU clock so far). Dennard scaling (Module 11 §1.4) shrank every dimension and the voltage by 1/k, giving k² transistors and k× frequency at constant W/mm². Around 2004–05 V<sub>DD</sub> stopped falling because the 60 mV/dec subthreshold wall pins V<sub>T</sub>, so clocks froze at 3–5 GHz while transistor counts kept doubling: the extra transistors became cores, caches and GPUs.'
          : st.overlay === 'cost'
            ? 'Cost overlay (approximate, relative to 1971 = 1): ~30% cheaper per transistor every year for four decades, then flat from the 28 → 20 nm transition (~2012) when double patterning made wafer price rise ~1.5–1.8× per node while density rose only ~1.5–1.7× (Module 20 table, $ per 100 M transistors: $0.28 at 28 nm, $0.15 at 7 nm, $0.16 at 2 nm). Moore’s law is alive in its count clause and dead in its cost clause.'
            : 'Chip transistor counts are vendor-stated; multi-die parts (Epyc Rome, M1 Ultra, MI300X, B200) count every die in the package, and the wafer-scale WSE-2 is a whole wafer. The dashed line is a pure doubling law anchored on the 4004: modern chips keep close to it by adding silicon (reticle-limited dies, chiplets), not only by shrinking transistors.';
      }

      // ---------- sweep animation ----------
      const SWEEP_MS = 11000;
      function frame(ts) {
        raf = 0; if (!st.playing || !visible) return;
        if (lastTs) st.cursor += (ts - lastTs) / SWEEP_MS * (X_MAX - Y0); lastTs = ts;
        if (st.cursor >= X_MAX) { st.cursor = null; st.playing = false; playBtn.textContent = 'Replay 1971 → 2027'; }
        applyCursor(); if (st.playing) raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && st.playing && visible) { lastTs = 0; raf = requestAnimationFrame(frame); } }
      playBtn.addEventListener('click', () => {
        if (st.playing) { st.playing = false; playBtn.textContent = 'Resume'; if (raf) cancelAnimationFrame(raf); raf = 0; return; }
        if (st.cursor == null) st.cursor = Y0; st.playing = true; playBtn.textContent = 'Pause'; start();
      });
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); });
      io.observe(el);

      // ---------- wiring ----------
      tIn.addEventListener('input', () => { st.T = +tIn.value; build(); paintReadout(); });
      ovSel.addEventListener('change', () => { st.overlay = ovSel.value; st.tipOn = false; build(); paintReadout(); });   // the tooltip returns on the next hover
      fitBtn.addEventListener('click', () => { tIn.value = Math.round(FIT.T * 10) / 10; tIn.dispatchEvent(new Event('input')); });
      el.append(controls, legend, chart, info, readout, formula, ovNote,
        h('div', { class: 'w-note' }, 'Node names after ~2009 are marketing labels, not a dimension on the chip (Module 11 §2.2). Sources: vendor disclosures and public die measurements; overlays are schematic. Keyboard: Tab through the dots, Enter to select.'));

      // responsive: viewBox width == CSS width so 11 px text is real pixels at every width
      function relayout(w) { if (dead || !w || w < 200 || Math.abs(w - W) < 2) return; W = w; build(); paintReadout(); }
      relayout(Math.round(el.getBoundingClientRect().width) || 700);
      const ro = new ResizeObserver(entries => { const w = Math.round(entries[0].contentRect.width); if (roRaf) cancelAnimationFrame(roRaf); roRaf = requestAnimationFrame(() => { roRaf = 0; relayout(w); }); });
      ro.observe(el);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!dead && W) { build(); paintReadout(); } });
      return () => { dead = true; st.playing = false; if (raf) cancelAnimationFrame(raf); if (roRaf) cancelAnimationFrame(roRaf); ro.disconnect(); io.disconnect(); };
    }
  });
})();
