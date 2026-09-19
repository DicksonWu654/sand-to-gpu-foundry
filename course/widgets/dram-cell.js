/* Widget: dram-cell — "A DRAM Bit: Store, Read, Refresh" (Module 15) */
(function () {
  'use strict';

  const VDD = 1.1, VH = VDD / 2;                    // DDR5 supply; plate and precharge sit at VDD/2
  const SENSE_MIN = 0.06;                           // practical sense-amp floor: ~20–40 mV offset + noise ⇒ ΔV ≳ 60 mV
  const T_REF = 64;                                 // ms, JEDEC refresh interval
  const Q_E = 1.602e-19, EOT = 0.55e-9, D_MEAN = 30e-9, D_OUT = 35e-9, EPS_OX = 8.854e-12 * 3.9;
  const HOLD_RATE = 20;                             // cell-time compression while holding: 20 cell-ms per real second (64 ms ⇒ 3.2 s)
  const DUR = { pre: 700, write: 1200, share: 1100, sense: 900, restore: 700 };

  const dvFull = (cs, cbl) => VH * cs / (cs + cbl);                       // V, signal from a fully charged cell
  const vsnMin = (cs, cbl) => VH + SENSE_MIN * (cs + cbl) / cs;           // storage-node voltage at which ΔV hits the floor
  const tRet = (cs, cbl, I) => { const vm = vsnMin(cs, cbl); return vm >= VDD ? 0 : cs * (VDD - vm) / I; }; // s (fF·V/fA)
  const heightUm = cs => cs * 1e-15 * EOT / (EPS_OX * 2 * Math.PI * D_MEAN) * 1e6;  // C = ε0·3.9·A/EOT with A = 2π·d·H (inside + outside)
  const leak = (v, I, cs, ms) => Math.max(VH, v - I * ms * 1e-3 / cs);     // constant-current drain toward the plate voltage
  const clamp01 = t => Math.max(0, Math.min(1, t));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const f2 = n => (+n).toFixed(2), f1 = n => (+n).toFixed(1);
  const fmtT = s => s <= 0 ? '0' : s >= 10 ? Math.round(s) + ' s' : s >= 1 ? f1(s) + ' s' : s >= 1e-3 ? (s < 1e-2 ? f1(s * 1e3) : Math.round(s * 1e3)) + ' ms' : Math.round(s * 1e6) + ' µs';
  const fmtI = I => I >= 10 ? Math.round(I) + ' fA' : I >= 1 ? f1(I) + ' fA' : Math.round(I * 1000) + ' aA';
  const mV = v => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v) * 1000) + ' mV';

  const PHASES = {
    pre: ['Precharge', 'Both bit lines are driven to VDD/2 = 0.55 V, then disconnected from every driver (left floating): their voltage is now set only by the charge sitting on them. The word line stays at 0 V, so the cell is sealed.'],
    write: ['Write', 'The word line rises to VPP, a voltage boosted above VDD + Vt by an on-chip charge pump, so the n-type access transistor passes a full VDD with no threshold drop. The bit line is driven to VDD (a 1) or 0 V (a 0) and the capacitor fills or empties.'],
    hold: ['Hold (leaking)', 'Word line back at 0 V: the bit is ~40,000 electrons on a 12 fF capacitor. Leakage through the off transistor and the ZAZ dielectric drains a stored 1 toward the plate voltage. A typical cell lasts seconds; the leakiest tail cells among 17 billion set the 64 ms refresh.'],
    share: ['Read: charge sharing', 'The word line opens the transistor and the small cell shares its charge with the much larger bit line. Charge is conserved, so the bit line moves by only ΔV = (VDD/2)·Cs/(Cs + C_BL), toward VDD for a 1 or toward 0 for a 0, and the cell is emptied to the same level: a destructive read.'],
    sense: ['Sense amplify', 'The sense amplifier, two inverters wired output-to-input between BL and the reference /BL, is switched on. Positive feedback pulls whichever line is a few tens of mV higher all the way to VDD and the other to 0 V within nanoseconds. Below ~60 mV the amplifier’s own offset can win and the bit is misread.'],
    restore: ['Write back', 'With the word line still open, the full-rail bit line refills (or fully empties) the capacitor, undoing the destructive read; then the word line closes. A refresh is exactly this read-and-write-back, done for every row every 64 ms without sending data out.'],
  };
  const ORDER = ['pre', 'write', 'hold', 'share', 'sense', 'restore'];

  window.registerWidget('dram-cell', {
    title: 'A DRAM Bit: Store, Read, Refresh',
    caption: 'One transistor, one capacitor, one bit. Write it, read it, and watch the tiny capacitor share its charge with a bit line several times bigger; the sense amplifier turns the ~140 mV lean into a full 1 or 0. Play runs write → 64 ms hold → refresh; drag the leakage up to a tail cell and the bit dies before its refresh.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const st = { cs: 12, cbl: 35, I: 1, playing: !reduced, timeline: !reduced,
        data: 1, vsn: VDD, vsnAtOpen: VDD, dvsn: 0, bl: VH, blb: VH, wl: 0, sa: 0, cellT: T_REF, out: '', lost: false, readVal: 1, senseFrom: [VH, VH], dvSensed: 0,
        phase: 'share', u: 1, t0: 0, queue: [], writeVal: 1, op: 'refresh' };
      let raf = 0, visible = true, curPhase = '', lastTs = 0;

      const txt = (x, y, s, o) => { o = o || {}; return svg('text', { x, y, 'font-family': o.mono ? 'var(--mono)' : 'var(--sans)', 'font-size': o.size || 13, 'font-weight': o.bold ? 600 : 400, fill: o.fill || 'var(--muted)', 'text-anchor': o.anchor || 'start' }, s); };
      const line = (x1, y1, x2, y2, o) => svg('line', Object.assign({ x1, y1, x2, y2, stroke: 'var(--muted)', 'stroke-width': 2 }, o || {}));

      // ================= Panel A: the 1T1C cell, bit-line pair and sense amplifier (viewBox 340×350) =================
      const A = svg('svg', { class: 'w-svg', viewBox: '0 0 360 355', role: 'img', 'aria-label': 'Schematic of a DRAM 1T1C cell: word line, access transistor, storage capacitor to the VDD/2 plate, bit line with its parasitic capacitance, reference bit line, precharge circuit and cross-coupled sense amplifier' });
      A.append(txt(2, 13, '1T1C cell on its bit line', { bold: true, fill: 'var(--ink)' }));
      const BLX = 112, BLBX = 64, SAY = 280, GX = 156;
      const outLbl = txt(336, 13, '', { anchor: 'end', size: 13, bold: true, fill: 'var(--ok)' });
      const clk = txt(336, 52, '', { anchor: 'end', mono: true, size: 12.5, fill: 'var(--ink)' });
      A.append(outLbl, clk);
      // precharge / equalize block across both bit lines
      A.append(svg('rect', { x: 46, y: 24, width: 84, height: 20, rx: 3, fill: 'var(--panel2)', stroke: 'var(--line2)' }));
      A.append(txt(88, 38, 'precharge', { anchor: 'middle', size: 12.5, fill: 'var(--ink)' }));
      A.append(txt(136, 32, 'equalize BL, /BL → VDD/2,', { size: 12.5 }), txt(136, 47, 'then float', { size: 12.5 }));
      // bit lines
      const blLine = line(BLX, 44, BLX, 340, { 'stroke-width': 2.5 }), blbLine = line(BLBX, 44, BLBX, 340, { 'stroke-width': 2.5 });
      A.append(blbLine, blLine);
      A.append(txt(62, 62, '/BL', { anchor: 'end', bold: true, fill: 'var(--ink)' }), txt(62, 79, 'reference', { anchor: 'end', size: 12.5 }), txt(62, 96, 'bit line', { anchor: 'end', size: 12.5 }));
      A.append(txt(118, 65, 'BL bit line', { bold: true, fill: 'var(--ink)' }));
      // word line
      const wlLine = line(122, 96, 336, 96, { 'stroke-width': 2.5 });
      A.append(wlLine, txt(122, 86, 'word line (WL)', { bold: true, fill: 'var(--ink)' }));
      const wlV = txt(226, 86, '0 V', { mono: true, fill: 'var(--ink)' });
      A.append(wlV);
      // access transistor: gate from the WL, channel between the BL (drain) and the storage node (source)
      const gateWire = line(GX, 96, GX, 130, { 'stroke-width': 2 });
      const gate = line(138, 130, 174, 130, { 'stroke-width': 3.5, 'stroke-linecap': 'round' });
      const chan = line(138, 138, 174, 138, { 'stroke-width': 3.5, stroke: 'var(--si)', 'stroke-linecap': 'round' });
      A.append(gateWire, gate, chan, line(BLX, 138, 138, 138), line(174, 138, 196, 138), line(196, 138, 196, 162), line(196, 162, 204, 162));
      A.append(svg('circle', { cx: BLX, cy: 138, r: 3, fill: 'var(--muted)' }));
      A.append(txt(GX, 157, 'access', { anchor: 'middle', size: 12.5 }), txt(GX, 174, 'transistor', { anchor: 'middle', size: 12.5 }), txt(GX, 191, '(buried gate)', { anchor: 'middle', size: 12.5 }));
      const tState = txt(150, 118, 'OFF', { anchor: 'end', mono: true, size: 12.5, bold: true });
      A.append(tState);
      // storage capacitor drawn as a tank: level = storage-node voltage (full = 1, empty = 0); plate at VDD/2
      const CX0 = 204, CX1 = 226, CY0 = 132, CY1 = 192, CH = CY1 - CY0;
      const snDot = svg('circle', { cx: 196, cy: 138, r: 3.5, fill: 'var(--accent)' });
      const capFill = svg('rect', { x: CX0 + 1.5, y: CY1, width: CX1 - CX0 - 3, height: 0, fill: 'var(--accent)', opacity: .8 });
      A.append(snDot, capFill);
      A.append(line(CX0, CY0, CX0, CY1, { 'stroke-width': 3.5, stroke: 'var(--ink)' }), line(CX1, CY0, CX1, CY1, { 'stroke-width': 3.5, stroke: 'var(--si)' }));
      A.append(line(CX0 - 6, CY0 + CH / 2, CX1 + 6, CY0 + CH / 2, { 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
      const floorTick = line(CX0 - 6, CY0, CX1 + 6, CY0, { 'stroke-width': 1.2, stroke: 'var(--bad)', 'stroke-dasharray': '2 2' });
      A.append(floorTick, line(CX1, 162, 250, 162), line(250, 133, 250, 202, { 'stroke-width': 5, stroke: 'var(--si)', 'stroke-linecap': 'round' }));
      const csLbl = txt(215, 126, '', { anchor: 'middle', mono: true, size: 12.5, fill: 'var(--ink)' });
      A.append(txt(215, 110, 'storage capacitor', { anchor: 'middle', size: 12.5, fill: 'var(--ink)' }), csLbl);
      A.append(txt(256, 148, 'plate', { size: 12.5, fill: 'var(--ink)' }), txt(256, 164, 'VDD/2', { size: 12.5, mono: true }), txt(256, 180, '0.55 V', { size: 12.5, mono: true }));
      A.append(txt(274, 114, 'dashed = ½', { size: 12 }), txt(274, 128, 'red = floor', { size: 12, fill: 'var(--bad)' }));
      const vsnLbl = txt(170, 210, '', { mono: true, size: 12.5, fill: 'var(--accent)', bold: true });
      const eLbl = txt(170, 226, '', { size: 12 });
      A.append(vsnLbl, eLbl);
      // bit-line voltages
      const blbV = txt(62, 224, '', { anchor: 'end', mono: true, size: 12.5, fill: 'var(--ink)' }), blV = txt(118, 224, '', { mono: true, size: 12.5, fill: 'var(--ink)', bold: true });
      A.append(txt(62, 206, '/BL', { anchor: 'end', size: 12 }), txt(118, 206, 'BL', { size: 12 }), blbV, blV);
      // bit-line parasitic capacitance (plate width grows with C_BL)
      const cblTop = line(0, 242, 0, 242, { 'stroke-width': 3, 'stroke-linecap': 'round' }), cblBot = line(0, 250, 0, 250, { 'stroke-width': 3, 'stroke-linecap': 'round' });
      A.append(line(BLX, 242, 148, 242), cblTop, cblBot, line(148, 250, 148, 260), line(138, 260, 158, 260, { 'stroke-width': 1.5 }), line(142, 264, 154, 264, { 'stroke-width': 1.5 }), line(146, 268, 150, 268, { 'stroke-width': 1.5 }));
      A.append(svg('circle', { cx: BLX, cy: 242, r: 3, fill: 'var(--muted)' }));
      const cblLbl = txt(176, 246, '', { mono: true, size: 12.5, fill: 'var(--ink)' }), cblLbl2 = txt(176, 260, '', { size: 12 });
      A.append(cblLbl, cblLbl2, txt(176, 274, '~1,000 cells + SA input', { size: 12 }));
      // charge packets moving between the bit line and the storage node
      const L1 = 78, L2 = 196 - BLX;
      const dots = [0, 1, 2, 3, 4].map(() => svg('circle', { r: 3.5, fill: 'var(--accent)', opacity: 0 }));
      A.append(...dots);
      // sense amplifier: cross-coupled inverters between /BL and BL
      const saBox = svg('rect', { x: 50, y: SAY, width: 76, height: 56, rx: 4, fill: 'var(--panel2)', 'fill-opacity': .6, stroke: 'var(--line2)', 'stroke-width': 1.5 });
      const inv1 = svg('polygon', { points: '72,288 72,308 94,298', fill: 'var(--panel)', stroke: 'var(--ink)', 'stroke-width': 1.5 });
      const inv2 = svg('polygon', { points: '104,314 104,334 82,324', fill: 'var(--panel)', stroke: 'var(--ink)', 'stroke-width': 1.5 });
      A.append(saBox, line(BLBX, 298, 72, 298, { 'stroke-width': 1.5 }), inv1, svg('circle', { cx: 97, cy: 298, r: 2.5, fill: 'var(--panel)', stroke: 'var(--ink)', 'stroke-width': 1.5 }), line(100, 298, BLX, 298, { 'stroke-width': 1.5 }));
      A.append(line(BLX, 324, 104, 324, { 'stroke-width': 1.5 }), inv2, svg('circle', { cx: 79, cy: 324, r: 2.5, fill: 'var(--panel)', stroke: 'var(--ink)', 'stroke-width': 1.5 }), line(76, 324, BLBX, 324, { 'stroke-width': 1.5 }));
      const dvLbl = txt(134, 290, '', { mono: true, size: 12.5, bold: true, fill: 'var(--accent)' });
      const saState = txt(336, 343, 'SA off', { anchor: 'end', mono: true, size: 12.5, fill: 'var(--ink)' });
      A.append(dvLbl, txt(134, 308, 'sense amplifier', { fill: 'var(--ink)', bold: true, size: 12.5 }), txt(134, 325, 'two cross-coupled inverters', { size: 12 }), saState);

      // ================= Panel B: retention chart (log time) + the capacitor drawn to scale (viewBox 340×350) =================
      const B = svg('svg', { class: 'w-svg', viewBox: '0 0 340 350', role: 'img', 'aria-label': 'Chart of the storage-node voltage of a stored 1 versus time on a log axis, with the sense floor and the 64 ms refresh line; beside it the storage capacitor drawn to scale' });
      const PX0 = 48, PX1 = 226, PY0 = 30, PY1 = 246, LOGMAX = 4, VMAX = 1.3;   // 1 ms … 10 s; headroom above 1.1 V for the label band
      const xOfMs = ms => PX0 + (PX1 - PX0) * clamp01(Math.log10(Math.max(ms, 1)) / LOGMAX);
      const yOfV = v => PY1 - (PY1 - PY0) * v / VMAX;
      B.append(txt(2, 13, 'Stored 1 leaking: V_SN vs time', { bold: true, fill: 'var(--ink)' }));
      [[0, '0 V'], [VH, '0.55 V'], [VDD, '1.10 V']].forEach(([v, s]) => { B.append(line(PX0, f1(yOfV(v)), PX1, f1(yOfV(v)), { stroke: 'var(--line)', 'stroke-width': 1 })); B.append(txt(PX0 - 4, f1(yOfV(v) + (v ? 4 : -1)), s, { anchor: 'end', mono: true, size: 12 })); });
      [[1, '1 ms'], [10, '10 ms'], [100, '100 ms'], [1000, '1 s'], [10000, '10 s']].forEach(([ms, s]) => { B.append(line(f1(xOfMs(ms)), PY0, f1(xOfMs(ms)), PY1, { stroke: 'var(--line)', 'stroke-width': 1 })); B.append(txt(f1(xOfMs(ms)), PY1 + 16, s, { anchor: 'middle', size: 12 })); });
      B.append(txt(PX1, PY1 + 32, 'time since the write (log scale)', { anchor: 'end', size: 12 }));
      B.append(line(f1(xOfMs(T_REF)), f1(yOfV(VDD) + 3), f1(xOfMs(T_REF)), PY1, { stroke: 'var(--warn)', 'stroke-width': 1.5, 'stroke-dasharray': '5 3' }));
      B.append(txt(f1(xOfMs(T_REF) + 4), PY1 - 6, '64 ms refresh', { size: 12, fill: 'var(--warn)' }));
      B.append(txt(PX0 + 4, f1(yOfV(VH) + 14), 'plate level VDD/2 = fully leaked', { size: 11.5 }));
      const floorLine = line(PX0, 0, PX1, 0, { stroke: 'var(--bad)', 'stroke-width': 1.2, 'stroke-dasharray': '3 3' });
      const floorLbl = txt(PX0 + 4, 59, '', { size: 11.5, fill: 'var(--bad)' });
      const curve = svg('polyline', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2 });
      const retDot = svg('circle', { r: 4, fill: 'var(--panel)', stroke: 'var(--bad)', 'stroke-width': 2 });
      const retLbl = txt(PX0 + 4, 45, '', { mono: true, size: 12, bold: true });
      const nowDot = svg('circle', { r: 4.5, fill: 'var(--accent)', opacity: 0 });
      B.append(floorLine, floorLbl, curve, retDot, retLbl, nowDot);
      // capacitor to scale: 35 nm wide, height from Cs
      const SX = 300, SBOT = 316, PXPERUM = 96;
      B.append(txt(SX, 13, 'capacitor,', { anchor: 'middle', size: 12.5, fill: 'var(--ink)', bold: true }), txt(SX, 31, 'to scale', { anchor: 'middle', size: 12.5, fill: 'var(--ink)', bold: true }), txt(SX, 49, '35 nm wide', { anchor: 'middle', size: 11.5 }));
      B.append(line(SX - 34, SBOT, SX + 34, SBOT, { stroke: 'var(--si)', 'stroke-width': 3 }));
      const pillar = svg('rect', { x: SX - 2, y: SBOT, width: 4, height: 0, fill: 'var(--si)' });
      const pillarLbl1 = txt(SX, 330, '', { anchor: 'middle', mono: true, size: 12.5, fill: 'var(--ink)' }), pillarLbl2 = txt(SX, 346, 'cell 25×38 nm', { anchor: 'middle', size: 11.5 });
      const hBr = line(SX - 8, SBOT, SX - 8, SBOT, { stroke: 'var(--muted)', 'stroke-width': 1 });
      const hLbl = txt(SX - 12, 0, '', { anchor: 'end', mono: true, size: 12, fill: 'var(--ink)' }), hLbl2 = txt(SX - 12, 0, '', { anchor: 'end', size: 11.5 });
      B.append(pillar, pillarLbl1, pillarLbl2, hBr, hLbl, hLbl2);

      // ================= phase chips + explanation =================
      const chips = ORDER.map(k => h('span', { style: { padding: '2px 9px', borderRadius: '12px', border: '1px solid var(--line)', color: 'var(--muted)', fontSize: '12.5px', whiteSpace: 'nowrap' } }, PHASES[k][0]));
      const notes = ORDER.map(k => h('div', { style: { gridArea: '1 / 1', visibility: 'hidden' } }, h('b', { style: { color: 'var(--ink)' } }, PHASES[k][0] + '. '), PHASES[k][1]));
      const phaseRow = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '10px 0 6px' } }, ...chips);
      const phaseNote = h('div', { class: 'w-note', style: { display: 'grid', marginTop: '0' } }, ...notes);
      function showPhase(p) {
        if (p === curPhase) return; curPhase = p;
        ORDER.forEach((k, i) => { const on = k === p; chips[i].style.borderColor = on ? 'var(--accent)' : 'var(--line)'; chips[i].style.color = on ? 'var(--ink)' : 'var(--muted)'; chips[i].style.fontWeight = on ? 600 : 400; notes[i].style.visibility = on ? 'visible' : 'hidden'; });
      }

      // ================= controls =================
      const playBtn = h('button', { class: 'w-btn primary', on: { click: () => { st.timeline = !st.timeline; st.playing = st.timeline; syncPlay(); if (st.playing) { if (st.phase === 'hold' && st.cellT >= T_REF) startOp('refresh'); else start(); } } } }, '');
      const btn = (label, fn) => h('button', { class: 'w-btn', on: { click: fn } }, label);
      const w1Btn = btn('Write 1', () => startOp('write', 1)), w0Btn = btn('Write 0', () => startOp('write', 0));
      const rdBtn = btn('Read', () => startOp('read')), rfBtn = btn('Refresh', () => startOp('refresh'));
      const csIn = h('input', { type: 'range', min: 10, max: 30, step: 1, value: st.cs });
      const cblIn = h('input', { type: 'range', min: 30, max: 150, step: 5, value: st.cbl });
      const leakIn = h('input', { type: 'range', min: -1, max: 3, step: 0.05, value: 0 });
      const csOut = h('output'), cblOut = h('output'), leakOut = h('output');
      const controls = h('div', { class: 'w-controls' },
        h('div', { style: { flexBasis: '100%', display: 'flex', gap: '8px', flexWrap: 'wrap' } }, playBtn, w1Btn, w0Btn, rdBtn, rfBtn),
        h('label', { class: 'w-ctl' }, h('span', null, 'Cell capacitance Cs'), csIn, csOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Bit-line capacitance C_BL'), cblIn, cblOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Leakage current (log)'), leakIn, leakOut));
      function syncPlay() { playBtn.textContent = st.timeline ? 'Pause' : 'Play timeline'; }

      // ================= readouts + formula =================
      const rDv = h('b'), rQ = h('b'), rRet = h('b'), rH = h('b'), rDvL = h('span'), rRetL = h('span'), rHL = h('span');
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, rDv, rDvL),
        h('div', { class: 'w-stat' }, rQ, h('span', null, 'electrons in a stored 1 (Q = Cs · VDD/2)')),
        h('div', { class: 'w-stat' }, rRet, rRetL),
        h('div', { class: 'w-stat' }, rH, rHL));
      const formula = h('div', { class: 'w-formula' });

      // ================= sequencing =================
      function startOp(op, val) {
        st.op = op; st.writeVal = val == null ? 1 : val; st.out = ''; st.lost = false;
        st.queue = op === 'write' ? ['pre', 'write', 'hold'] : ['pre', 'share', 'sense', 'restore', 'hold'];
        setPhase(st.queue.shift());
        st.playing = true; start();
      }
      function setPhase(p) {
        st.phase = p; st.u = 0; st.t0 = 0;
        if (p === 'pre') { st.wl = 0; st.sa = 0; }
        if (p === 'share') st.vsnAtOpen = st.vsn;
        if (p === 'hold') { st.cellT = 0; st.wl = 0; st.sa = 0; if (!st.timeline) st.playing = false; }   // manual action done: freeze in hold
      }
      function nextPhase() {
        if (st.queue.length) { setPhase(st.queue.shift()); return; }
        if (st.phase !== 'hold') { setPhase('hold'); return; }
        // timeline: at 64 ms refresh the row; if the cell holds a 0 (written, or lost), write a fresh 1 instead
        st.out = ''; st.lost = false;
        if (st.data === 0) { st.op = 'write'; st.writeVal = 1; st.queue = ['pre', 'write', 'hold']; }
        else { st.op = 'refresh'; st.queue = ['pre', 'share', 'sense', 'restore', 'hold']; }
        setPhase(st.queue.shift());
      }
      function step(dt) { const v0 = st.vsn; stepInner(dt); st.dvsn = st.vsn - v0; }
      function stepInner(dt) {                                            // dt in real ms
        const p = st.phase;
        if (p === 'hold') {
          const cms = dt * HOLD_RATE / 1000;
          st.cellT += cms;
          if (st.data === 1) st.vsn = leak(st.vsn, st.I, st.cs, cms);
          st.bl = VH; st.blb = VH;
          if (st.timeline && st.cellT >= T_REF) { st.cellT = T_REF; nextPhase(); }
          return;
        }
        st.t0 += dt; st.u = clamp01(st.t0 / DUR[p]);
        const u = st.u;
        if (p === 'pre') { st.bl = lerp(st.bl, VH, ease(u)); st.blb = lerp(st.blb, VH, ease(u)); if (u >= 1) { st.bl = VH; st.blb = VH; nextPhase(); } }
        else if (p === 'write') {
          const target = st.writeVal ? VDD : 0;
          st.wl = clamp01(u / .25); st.bl = lerp(VH, target, ease(clamp01((u - .1) / .3)));
          if (u > .3) st.vsn = lerp(st.vsn, target, 1 - Math.pow(.02, dt / 300));
          if (u > .8) { st.vsn = target; st.wl = 1 - clamp01((u - .8) / .2); }
          if (u >= 1) { st.data = st.writeVal; st.wl = 0; nextPhase(); }
        }
        else if (p === 'share') {
          st.wl = clamp01(u / .3);
          const vf = (st.cs * st.vsnAtOpen + st.cbl * VH) / (st.cs + st.cbl), k = ease(clamp01((u - .3) / .5));
          st.bl = lerp(VH, vf, k); st.vsn = lerp(st.vsnAtOpen, vf, k);
          if (u >= 1) nextPhase();
        }
        else if (p === 'sense') {
          const dv = st.bl - st.blb;
          if (!st.sa) { st.sa = 1; st.readVal = Math.abs(dv) >= SENSE_MIN ? (dv > 0 ? 1 : 0) : 0; st.lost = st.readVal !== st.data || Math.abs(dv) < SENSE_MIN; st.senseFrom = [st.bl, st.blb]; st.dvSensed = dv; }
          const k = ease(clamp01((u - .15) / .7)), hi = st.readVal ? VDD : 0;
          st.bl = lerp(st.senseFrom[0], hi, k); st.blb = lerp(st.senseFrom[1], VDD - hi, k); st.vsn = lerp(st.vsn, st.bl, k);
          if (u >= 1) { st.out = String(st.readVal); nextPhase(); }
        }
        else if (p === 'restore') {
          st.vsn = lerp(st.vsn, st.bl, 1 - Math.pow(.02, dt / 200));
          if (u > .6) { st.wl = 1 - clamp01((u - .6) / .3); st.vsn = st.bl; }
          if (u >= 1) { st.data = st.readVal; st.wl = 0; nextPhase(); }
        }
      }

      // ================= render =================
      function render() {
        const { cs, cbl, I } = st;
        const on = st.wl > .5, vcol = v => v > VH + .08 ? 'var(--accent)' : v < VH - .08 ? 'var(--si)' : 'var(--muted)';
        wlLine.setAttribute('stroke', on ? 'var(--accent2)' : 'var(--muted)'); wlLine.setAttribute('stroke-width', on ? 3.5 : 2.5);
        gateWire.setAttribute('stroke', on ? 'var(--accent2)' : 'var(--muted)'); gate.setAttribute('stroke', on ? 'var(--accent2)' : 'var(--muted)');
        chan.setAttribute('stroke', on ? 'var(--accent)' : 'var(--si)'); chan.setAttribute('opacity', on ? 1 : .55);
        wlV.textContent = on ? 'VPP (boosted)' : '0 V'; wlV.setAttribute('fill', on ? 'var(--accent2)' : 'var(--ink)');
        tState.textContent = on ? 'ON' : 'OFF'; tState.setAttribute('fill', on ? 'var(--accent)' : 'var(--muted)');
        const lvl = clamp01(st.vsn / VDD);
        capFill.setAttribute('height', f1(CH * lvl)); capFill.setAttribute('y', f1(CY1 - CH * lvl));
        capFill.setAttribute('fill', st.vsn > VH + .02 ? 'var(--accent)' : 'var(--si)');
        const vm = vsnMin(cs, cbl), fy = CY1 - CH * clamp01(vm / VDD);
        floorTick.setAttribute('y1', f1(fy)); floorTick.setAttribute('y2', f1(fy)); floorTick.setAttribute('opacity', vm >= VDD ? 0 : 1);
        csLbl.textContent = 'Cs = ' + cs + ' fF';
        vsnLbl.textContent = 'V_SN ' + f2(st.vsn) + ' V'; vsnLbl.setAttribute('fill', vcol(st.vsn));
        const ne = Math.round(cs * 1e-15 * Math.abs(st.vsn - VH) / Q_E / 100) * 100;
        eLbl.textContent = fmt(ne, 0) + ' e⁻ ' + (st.vsn > VH + .02 ? 'above plate (a 1)' : st.vsn < VH - .02 ? 'below plate (a 0)' : 'of signal: none');
        const w = 24 + cbl * .2; [cblTop, cblBot].forEach(c => { c.setAttribute('x1', f1(148 - w / 2)); c.setAttribute('x2', f1(148 + w / 2)); });
        cblLbl.textContent = 'C_BL = ' + cbl + ' fF'; cblLbl2.textContent = '≈ ' + f1(cbl / cs) + '× Cs: the wire past';
        blLine.setAttribute('stroke', vcol(st.bl)); blbLine.setAttribute('stroke', vcol(st.blb));
        blV.textContent = f2(st.bl) + ' V'; blbV.textContent = f2(st.blb) + ' V';
        const live = st.phase === 'share' && st.u > .3, dv = live ? st.bl - st.blb : st.dvSensed, showDv = live || st.phase === 'sense' || st.phase === 'restore';
        if (showDv) { const weak = Math.abs(dv) < SENSE_MIN; dvLbl.textContent = (live ? 'ΔV = ' : 'sensed ') + mV(dv) + (weak ? ' ✗ (< 60 mV)' : ' ✓ (≥ 60 mV)'); dvLbl.setAttribute('fill', weak ? 'var(--bad)' : 'var(--accent)'); }
        else dvLbl.textContent = '';
        saBox.setAttribute('stroke', st.sa ? 'var(--accent)' : 'var(--line2)'); [inv1, inv2].forEach(g => g.setAttribute('fill', st.sa ? 'var(--accent)' : 'var(--panel)'));
        saState.textContent = st.sa ? 'SA on → full rail' : 'SA off';
        clk.textContent = st.phase === 'hold' ? 'held ' + f1(st.cellT) + ' / 64 ms' : 'ns in reality';
        if (st.out) { outLbl.textContent = st.lost ? 'bit lost → read 0' : (st.op === 'refresh' ? 'refreshed: ' : 'data out: ') + st.out; outLbl.setAttribute('fill', st.lost ? 'var(--bad)' : 'var(--ok)'); }
        else { outLbl.textContent = st.phase === 'hold' ? 'holding a ' + st.data : st.phase === 'write' ? 'writing a ' + st.writeVal : ''; outLbl.setAttribute('fill', 'var(--ok)'); }
        // charge packets: flow while the transistor is open and the storage node is changing
        const flowing = on && Math.abs(st.dvsn) > 2e-4 && st.playing, dir = st.dvsn > 0 ? 1 : -1, tt = performance.now() / 900;
        dots.forEach((d, i) => {
          if (!flowing) { d.setAttribute('opacity', 0); return; }
          let s = (tt + i / 5) % 1; if (dir < 0) s = 1 - s; const dd = s * (L1 + L2);
          const [x, y] = dd < L1 ? [BLX, 60 + dd] : [BLX + (dd - L1), 138];
          d.setAttribute('cx', f1(x)); d.setAttribute('cy', f1(y)); d.setAttribute('opacity', .85);
        });
        showPhase(st.phase);
        // retention chart
        const pts = []; for (let i = 0; i <= 60; i++) { const ms = Math.pow(10, LOGMAX * i / 60); pts.push(f1(xOfMs(ms)) + ',' + f1(yOfV(leak(VDD, I, cs, ms)))); }
        curve.setAttribute('points', pts.join(' '));
        const tr = tRet(cs, cbl, I), trMs = tr * 1000, safe = tr >= T_REF / 1000, fyB = yOfV(Math.min(vm, VDD));
        floorLine.setAttribute('y1', f1(fyB)); floorLine.setAttribute('y2', f1(fyB));
        floorLbl.textContent = vm >= VDD ? 'red dashes: read floor is above VDD' : 'red dashes: read floor, ΔV = 60 mV';
        if (tr > 0 && trMs >= 1 && trMs <= 1e4) { retDot.setAttribute('cx', f1(xOfMs(trMs))); retDot.setAttribute('cy', f1(fyB)); retDot.setAttribute('opacity', 1); retDot.setAttribute('stroke', safe ? 'var(--ok)' : 'var(--bad)'); }
        else retDot.setAttribute('opacity', 0);
        retLbl.setAttribute('fill', safe ? 'var(--ok)' : 'var(--bad)');
        if (tr > 0) retLbl.textContent = 'retention ' + fmtT(tr) + (safe ? ' ✓' : ' ✗') + (trMs > 1e4 ? ' off chart' : '');
        else retLbl.textContent = 'no retention: unreadable';
        if (st.phase === 'hold' && st.cellT >= 1 && st.data === 1) { nowDot.setAttribute('cx', f1(xOfMs(st.cellT))); nowDot.setAttribute('cy', f1(yOfV(st.vsn))); nowDot.setAttribute('opacity', 1); } else nowDot.setAttribute('opacity', 0);
        // capacitor to scale
        const Hum = heightUm(cs), ph = Hum * PXPERUM, ar = Math.round(Hum / (D_OUT * 1e6));
        pillar.setAttribute('height', f1(ph)); pillar.setAttribute('y', f1(SBOT - ph));
        hBr.setAttribute('y1', f1(SBOT - ph)); hLbl.setAttribute('y', f1(SBOT - ph / 2 + 4)); hLbl2.setAttribute('y', f1(SBOT - ph / 2 + 18));
        hLbl.textContent = f2(Hum) + ' µm'; hLbl2.textContent = 'AR ' + ar + ':1'; pillarLbl1.textContent = cs + ' fF';
        // readouts + formula
        const dvf = dvFull(cs, cbl);
        rDv.textContent = Math.round(dvf * 1000) + ' mV'; rDv.style.color = dvf < SENSE_MIN ? 'var(--bad)' : '';
        rDvL.textContent = 'read signal ΔV from a full cell' + (dvf < SENSE_MIN ? ' — below the ~60 mV floor: the array fails' : ' (floor ~60 mV: offset + noise)');
        rQ.textContent = fmt(Math.round(cs * 1e-15 * VH / Q_E / 1000) * 1000, 0) + ' e⁻';
        rRet.textContent = tr > 0 ? fmtT(tr) : '0'; rRet.style.color = safe ? '' : 'var(--bad)';
        rRetL.textContent = tr > 0 ? 'retention at ' + fmtI(I) + ' (until ΔV < 60 mV): ' + (safe ? f1(trMs / T_REF) + '× the 64 ms refresh interval' : 'shorter than 64 ms — this bit dies before its refresh') : 'retention: unreadable at any time';
        rH.textContent = f2(Hum) + ' µm'; rHL.textContent = 'capacitor height for ' + cs + ' fF (35 nm cylinder, ZAZ EOT 0.55 nm): aspect ratio ' + ar + ':1';
        formula.innerHTML = 'ΔV = (V<sub>DD</sub>/2) · C<sub>s</sub> / (C<sub>s</sub> + C<sub>BL</sub>) = 0.55 V × ' + cs + ' / (' + cs + ' + ' + cbl + ') = ' + Math.round(dvf * 1000) + ' mV<br>' +
          't<sub>ret</sub> = C<sub>s</sub> · (V<sub>DD</sub> − V<sub>SN,min</sub>) / I<sub>leak</sub> = ' + cs + ' fF × ' + f2(Math.max(0, VDD - vm)) + ' V / ' + fmtI(I) + ' = ' + (tr > 0 ? fmtT(tr) : '0') + '<br>' +
          'C = ε<sub>0</sub> · 3.9 · A / EOT with A = 2π · 30 nm · H (inside + outside) → H = ' + f2(Hum) + ' µm';
      }

      // ================= loop =================
      function frame(ts) {
        raf = 0;
        if (!visible) return;
        const dt = lastTs ? Math.min(ts - lastTs, 100) : 16; lastTs = ts;
        if (st.playing) step(dt);
        render();
        if (st.playing) raf = requestAnimationFrame(frame); else lastTs = 0;
      }
      function start() { if (!raf && visible) { lastTs = 0; raf = requestAnimationFrame(frame); } }
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); });
      io.observe(el);
      function onInput() {
        st.cs = +csIn.value; st.cbl = +cblIn.value; st.I = Math.pow(10, +leakIn.value);
        csOut.textContent = st.cs + ' fF'; cblOut.textContent = st.cbl + ' fF'; leakOut.textContent = fmtI(st.I);
        if (!st.playing) render();
      }
      [csIn, cblIn, leakIn].forEach(i => i.addEventListener('input', onInput));

      // Each schematic needs a readable line length; two cramped columns clipped the labels.
      A.style.maxWidth = B.style.maxWidth = '460px';
      A.style.margin = B.style.margin = '0 auto';
      const figures = h('div', { class: 'w-grid2', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '24px' } }, A, B);
      el.append(controls, figures, phaseRow, phaseNote, readout, formula,
        h('div', { class: 'w-note' }, 'Model: VDD = 1.1 V (DDR5), plate and precharge at VDD/2, a constant leakage current draining a stored 1 toward the plate level (a stored 0 is drawn as stable: its leakage mostly pulls it further down, which is harmless), and a 60 mV sense floor. Holding runs at 20 ms of cell time per second; the nanosecond-scale precharge, sharing and sensing are each drawn over about a second. The Cs and C_BL symbols are not to scale with each other; the pillar on the right is to scale.'));
      // first frame: a read caught at the end of charge sharing, so the ΔV lean is visible before the amplifier fires
      st.vsn = (st.cs * VDD + st.cbl * VH) / (st.cs + st.cbl); st.bl = st.vsn; st.wl = 1; st.t0 = DUR.share; st.queue = ['sense', 'restore', 'hold'];
      syncPlay(); onInput(); render(); start();
      return () => { if (raf) cancelAnimationFrame(raf); raf = 0; st.playing = false; io.disconnect(); };
    }
  });
})();
