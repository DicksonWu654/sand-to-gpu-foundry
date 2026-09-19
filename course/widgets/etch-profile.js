/* Widget: etch-profile — "Plasma Etch Profile Simulator" (Module 09) */
(function () {
  'use strict';
  // vertical layout of the cross-section (viewBox units): plasma band, sheath line, then mask + film + stop scaled into MASK_TOP..BAND_BOT
  const H = 420, PLASMA_BOT = 66, SHEATH_Y = 70, MASK_TOP = 100, BAND_BOT = 370;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const bump = u => u < 0.8 ? Math.pow(Math.sin(Math.PI * u / 0.8), 2) : 0;                 // bowing: bulge peaking 40 % down the wall
  const fillet = u => { const v = clamp01((u - 0.82) / 0.18); return 1 - Math.sqrt(1 - v * v); }; // footing: quarter-circle fillet at the base
  const RAD = [[.08, .25, 40], [.3, .7, 200], [.55, .2, 120], [.8, .6, 300], [.2, .9, 80], [.5, .5, 250], [.85, .85, 10], [.95, .3, 160]];

  // Geometry per preset: opening widths, film / mask / stop thickness (nm), base rate R (nm/min), mask & stop selectivity factors, ARDE strength
  const GENERIC = { key: 'generic', wN: 30, wW: 80, film: 150, mask: 40, stop: 6, R: 370, selK: 1, selStop: 30, kPre: 0.5, sx: 0, tUnit: 1,
    filmName: 'SiO2 or Si', maskName: 'hardmask', stopName: 'SiN', subName: 'Si wafer', stopKind: 'layer' };
  const PRESETS = [
    { name: 'Generic film (150 nm)', ion: 50, chem: 50, pass: 50, time: 45, g: GENERIC, note: '' },
    { name: 'Oxide contact (C4F6/Ar/O2 CCP)', ion: 78, chem: 28, pass: 68, time: 100,
      g: { key: 'oxide', wN: 22, wW: 60, film: 200, mask: 90, stop: 8, R: 480, selK: 0.5, selStop: 20, kPre: 0.5, sx: 1.8, tUnit: 1, filmName: 'SiO2', maskName: 'carbon mask', stopName: 'SiN (CESL)', subName: 'S/D silicide', stopKind: 'layer' },
      note: 'Dual-frequency CCP with ~1.5 keV ions: fluorocarbon polymer protects the sidewall while ions clear the floor, so A ≈ 0.99 through 200 nm of oxide. A 22 nm hole in 200 nm is a 9:1 contact, and two things bite at that ratio — ARDE (the narrow hole lags the wide one by tens of nm) and mask erosion (oxide:carbon selectivity is only ~5:1, so most of the 90 nm carbon mask is gone by the time the wide hole lands on the SiN etch stop).' },
    { name: 'Silicon fin etch (HBr/O2 ICP)', ion: 30, chem: 68, pass: 80, time: 40,
      g: { key: 'fin', wN: 30, wW: 80, film: 160, mask: 40, stop: 0, R: 370, selK: 6, selStop: 1e9, kPre: 0.25, sx: 0, tUnit: 1, filmName: 'Si', maskName: 'SiN mask', stopName: '', subName: 'bulk Si (continues down)', stopKind: 'line' },
      note: 'ICP with ion flux and ion energy set separately (~100 eV ions, low damage): bromine barely attacks silicon on its own, so a thin SiOxBry film from a few percent O2 is enough for a near-vertical wall (A ≈ 0.99, ~88° taper) with >100:1 selectivity to the nitride mask. There is no stop layer — the fin height is set by time, so the etch is stopped once the wide space reaches ~100 nm.' },
    { name: 'Bosch DRIE (SF6/C4F8 cycles)', ion: 25, chem: 85, pass: 80, time: 25,
      g: { key: 'bosch', wN: 150, wW: 600, film: 5000, mask: 400, stop: 200, R: 19000, selK: 6, selStop: 100, kPre: 0.06, sx: 28 / 150, tUnit: 1, cycle: 3, scallopPx: 5, filmName: 'Si', maskName: 'SiO2 mask', stopName: 'buried oxide (SOI)', subName: 'Si handle wafer', stopKind: 'layer' },
      note: 'Alternating SF6 (isotropic bite at low bias) and C4F8 (conformal polymer) steps carve the trench one bite at a time: ~10 µm/min into a 0.15 µm × 5 µm trench (33:1 at the buried-oxide stop), at the cost of periodic sidewall scallops — one per 3 s cycle, a few hundred nm apart, and shallower in the narrow trench because ARDE slows each bite. Vertical scale: 1 µm bar at right.' },
    { name: 'Wet HF (BOE, isotropic)', ion: 0, chem: 100, pass: 0, time: 30,
      g: Object.assign({}, GENERIC, { key: 'wet', R: 285, selK: 3, selStop: 100, kPre: 0.2, filmName: 'SiO2', maskName: 'resist mask', stopName: 'SiN', wet: true }),
      note: 'No ions at all: buffered HF attacks SiO2 wherever the liquid touches (~100 nm/min), so the etch is isotropic (A = 0) and undercuts the mask by about the etched depth on every side — the cavity is a bowl centred on the mask edge. Selectivity is superb (~100:1 to resist and to a SiN stop), which is fine for a blanket strip and fatal for patterning anything narrower than about twice the film thickness.' },
    { name: '3D NAND channel hole (cryogenic)', ion: 92, chem: 60, pass: 75, time: 100,
      g: { key: 'nand', wN: 100, wW: 250, film: 6000, mask: 1200, stop: 30, R: 260, selK: 0.5, selStop: 25, kPre: 0.03, sx: 0.26, tUnit: 20, filmName: 'ONON stack', maskName: 'carbon mask', stopName: 'poly source plate', subName: 'CMOS under the array', stopKind: 'layer' },
      note: 'Multi-keV ions and a condensed HF-based reactive layer at −60 °C etch a 100 nm hole through one 6 µm deck of the oxide/nitride stack — 60:1 — in about 33 min, consuming most of a 1.2 µm boron-doped carbon mask on the way (~10:1 selectivity). Even at ~250 nm/min the narrow hole starves for radicals and slows to under half its starting rate near the bottom (ARDE), so it is still a micron short when the wider slit lands. Horizontal scale ×7; 1 µm bar at right.' },
  ];

  const fmtNm = v => v >= 1000 ? (v / 1000).toFixed(v < 9950 ? 1 : 0) + ' µm' : v < 10 ? (Math.round(v * 10) / 10) + ' nm' : Math.round(v) + ' nm';
  const fmtRate = v => v >= 1000 ? (v / 1000).toFixed(1) + ' µm/min' : Math.round(v) + ' nm/min';
  const fmtEV = v => v < 1000 ? Math.round(v) + ' eV' : (v / 1000).toFixed(1) + ' keV';
  const fmtT = s => s <= 120 ? s + ' s' : s < 600 ? (s / 60).toFixed(1) + ' min' : Math.round(s / 60) + ' min';

  // ---- physics (qualitative, tuned to Module 09 ranges) ----
  function model(st) {
    const g = st.g, i = st.ion / 100, c = st.chem / 100, p = st.pass / 100;
    const rv = g.R * (0.35 * c + 0.12 * i + 1.6 * c * i) * (1 - 0.3 * p);          // vertical rate: chemical + sputter + ion-enhanced synergy, slowed by polymer
    const rl = g.R * 0.35 * c * Math.pow(1 - p, 3);                                   // lateral rate: spontaneous chemical attack through the passivation
    const rm = g.R * (0.01 * c + 0.10 * i * i) * (1 - 0.6 * p) / g.selK;             // mask erosion: mostly sputtering
    const k = g.kPre * (0.4 + 0.6 * (p + c) / 2);                                     // ARDE strength (radical starvation + polymer clogging)
    const footOn = p > 0.75 ? (p - 0.75) / 0.25 : 0;
    const notchOn = (i > 0.5 && p < 0.35) ? Math.sqrt(((i - 0.5) / 0.5) * ((0.35 - p) / 0.35)) : 0;
    return { i, c, p, rv, rl, rm, k, eV: 20 * Math.pow(250, i), T: st.time * g.tUnit,
      bowFrac: 0.45 * i * i * (1 - p), taperFrac: 0.35 * p * p, footFrac: 0.35 * footOn, notchOn, facetPx: 2 + 14 * i * i };
  }
  function etch(g, M, w0) {              // integrate depth with ARDE; stop at the etch stop, then erode the stop during over-etch
    const T = M.T, n = 80, dt = T / n; let d = 0, tLand = -1, dip = 0;
    for (let s = 0; s < n; s++) {
      if (tLand < 0) { d += M.rv * dt / 60 / (1 + M.k * d / w0); if (d >= g.film) { d = g.film; tLand = (s + 1) * dt; } }
      else if (g.stopKind === 'layer') dip += M.rv / g.selStop * dt / 60;
    }
    const over = tLand > 0 ? (T - tLand) / tLand * 100 : 0;
    return { depth: d, landed: tLand > 0, tLand, over, dip: Math.min(dip, g.stop), through: g.stopKind === 'layer' && dip >= g.stop };
  }
  function profile(w, D, L, M, cycles, scallopNm, notchNm, Lmax) {   // wall offset (nm, + = wider than the opening) vs depth fraction u
    const us = []; for (let i = 0; i <= 40; i++) us.push(0.8 * i / 40); for (let i = 1; i <= 24; i++) us.push(0.8 + 0.2 * i / 24);
    return us.map(u => {
      let off = L * Math.sqrt(Math.max(0, 1 - u * u));                  // undercut: ellipse (circle when isotropic) centred on the mask edge
      off += M.bowFrac * w * bump(u);                                   // bowing
      off -= M.taperFrac * w * u + M.footFrac * w * fillet(u);          // taper + footing narrow the base
      if (notchNm > 0) { const dy = D * (1 - u); if (dy < notchNm) off += Math.sqrt(notchNm * notchNm - dy * dy); }   // notch: rounded gouge at the floor corner
      if (cycles) off += scallopNm * Math.sin(Math.PI * ((u * cycles) % 1));   // Bosch scallops, one per cycle
      return [Math.max(-0.85 * w, Math.min(Lmax, off)), D * u];
    });
  }

  window.registerWidget('etch-profile', {
    title: 'Plasma Etch Profile Simulator',
    caption: 'Balance ion energy, chemistry and passivation to carve a trench — then push any one of them too far and watch undercut, bowing, tapering, a notch or an etch stop show up in the cross-section.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const uid = 'etch' + Math.random().toString(36).slice(2, 7);
      const st = { ion: 50, chem: 50, pass: 50, time: 45, g: GENERIC };
      let Lay = layoutFor(700);

      const presetRow = h('div', { class: 'w-step-nav' });
      PRESETS.forEach(p => presetRow.append(h('button', { class: 'w-btn', on: { click: () => { st.ion = p.ion; st.chem = p.chem; st.pass = p.pass; st.time = p.time; st.g = p.g; render(); } } }, p.name)));

      const ionIn = h('input', { type: 'range', min: 0, max: 100, step: 2, value: st.ion });
      const chemIn = h('input', { type: 'range', min: 0, max: 100, step: 2, value: st.chem });
      const passIn = h('input', { type: 'range', min: 0, max: 100, step: 2, value: st.pass });
      const timeIn = h('input', { type: 'range', min: 5, max: 120, step: 5, value: st.time });
      const ionOut = h('output'), chemOut = h('output'), passOut = h('output'), timeOut = h('output');
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Ion energy / bias'), ionIn, ionOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Radical (chemical)'), chemIn, chemOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Sidewall passivation'), passIn, passOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Etch time'), timeIn, timeOut));
      [ionIn, chemIn, passIn, timeIn].forEach(inp => inp.addEventListener('input', () => { st.ion = +ionIn.value; st.chem = +chemIn.value; st.pass = +passIn.value; st.time = +timeIn.value; render(); }));

      const mechNote = h('div', { style: { border: '1px solid var(--line)', borderRadius: '6px', padding: '8px 12px', margin: '8px 0', fontSize: '13px', color: 'var(--muted)' } });
      const D = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Cross-section of a plasma etch: plasma, sheath, mask, film with two etched openings, etch stop and substrate' });

      const stRate = h('b'), stA = h('b'), stSel = h('b'), stDepth = h('b'), stAR = h('b'), stARl = h('span'), stOver = h('b'), stOverl = h('span'), stEV = h('b'), stMask = h('b');
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, stRate, h('span', null, 'vertical etch rate')),
        h('div', { class: 'w-stat' }, stA, h('span', null, 'anisotropy A = 1 − r_lat / r_vert')),
        h('div', { class: 'w-stat' }, stSel, h('span', null, 'selectivity film : mask')),
        h('div', { class: 'w-stat' }, stMask, h('span', null, 'mask remaining')),
        h('div', { class: 'w-stat' }, stDepth, h('span', null, 'depth, narrow | wide opening')),
        h('div', { class: 'w-stat' }, stAR, stARl),
        h('div', { class: 'w-stat' }, stOver, stOverl),
        h('div', { class: 'w-stat' }, stEV, h('span', null, 'approx. ion energy')));
      const formula = h('div', { class: 'w-formula' }, 'A = 1 − r_lateral / r_vertical  ·  aspect ratio = depth / opening width  ·  ARDE: local rate = r_vertical / (1 + k · depth / width)  ·  selectivity = r_film / r_mask');
      const legend = h('div', { class: 'w-legend' },
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--si)' } }), 'film being etched'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--line2)' } }), 'mask'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--ground)', border: '1px solid var(--muted)' } }), 'etched away'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--ok)' } }), 'sidewall passivation (thickness follows the slider)'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent)' } }), 'etch front / ions'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent2)' } }), 'radicals'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--cu)', opacity: .8 } }), 'etch-stop layer'));
      const note = h('div', { class: 'w-note' });

      function layoutFor(cw) {
        if (cw >= 600) return { W: 640, fs: 12, k: 1, mode: 'wide', nF: 0.27, wF: 0.72 };
        if (cw >= 430) return { W: 480, fs: 13, k: 0.9, mode: 'mid', nF: 0.27, wF: 0.72 };
        return { W: 360, fs: Math.max(14, Math.ceil(11.5 * 360 / Math.max(180, cw))), k: 0.75, mode: 'narrow', nF: 0.27, wF: 0.70 };
      }
      const tx = (x, y, s, o = {}) => svg('text', { x, y, 'font-family': o.mono ? 'var(--mono)' : 'var(--sans)', 'font-size': Lay.fs, fill: o.fill || 'var(--muted)', 'text-anchor': o.anchor || 'start', 'font-weight': o.bold ? 600 : 400 }, s);
      const ln = (x1, y1, x2, y2, o = {}) => svg('line', Object.assign({ x1, y1, x2, y2, stroke: o.stroke || 'var(--muted)', 'stroke-width': o.w || 1 }, o.dash ? { 'stroke-dasharray': o.dash } : {}));
      const arrowDown = (x, y0, y1, color) => svg('g', null, ln(x, y0, x, y1 - 4, { stroke: color, w: 1.5 }), svg('polygon', { points: `${x - 3.2},${y1 - 6} ${x + 3.2},${y1 - 6} ${x},${y1}`, fill: color }));
      function arrowDir(x, y, ang, len, color) {
        const a = ang * Math.PI / 180, hx = Math.cos(a), hy = Math.sin(a), x2 = x + hx * len, y2 = y + hy * len;
        const pts = `${x2},${y2} ${x2 - hx * 5 - hy * 2.5},${y2 - hy * 5 + hx * 2.5} ${x2 - hx * 5 + hy * 2.5},${y2 - hy * 5 - hx * 2.5}`;
        return svg('g', null, ln(x, y, x2 - hx * 3, y2 - hy * 3, { stroke: color, w: 1.5 }), svg('polygon', { points: pts, fill: color }));
      }
      const presetActive = () => PRESETS.find(p => p.ion === st.ion && p.chem === st.chem && p.pass === st.pass && p.time === st.time && p.g === st.g) || null;
      function regime(M) {
        if (M.rv === 0) return 'Nothing is etching: with no ions and no radicals there is neither chemistry nor sputtering — the wafer just sits in the chamber.';
        if (M.c > .7 && M.i < .2 && M.p < .2) return 'Chemical-only regime: fast and isotropic — the etch undercuts the mask by roughly the depth it has cut, on every exposed side (A ≈ 0).';
        if (M.i > .6 && M.c < .1) return 'Ion-dominated (sputtering) regime: vertical but slow, with almost no selectivity — the mask erodes about as fast as the film and its corners facet.';
        if (M.p > .75) return 'Over-passivated regime: polymer builds up faster than ions can clear it, tapering the sidewall, leaving a foot at the base and — in the narrow opening — stalling toward an etch stop.';
        if (M.i > .55 && M.p < .25) return 'Under-passivated, ion-rich regime: scattered ions erode an unprotected mid-wall bulge (bowing), the mask facets and erodes fast, and once the floor reaches the insulating stop, charge build-up deflects ions sideways into a notch at the corner.';
        return 'Ion-enhanced anisotropic regime: passivation blocks lateral chemical attack while ions keep clearing the floor, so the trench tracks the mask opening closely (A ≈ 0.9–0.99).';
      }

      function drawTrench(P, cx, w0, tr, Lmax, clipId) {
        const w = w0 / 2, { M, sx, sy, surfY } = P;
        const Dv = Math.max(0, tr.depth - P.rec) + tr.dip;
        const notchNm = (tr.landed && P.g.stopKind === 'layer') ? M.notchOn * 0.6 * w * Math.min(1, 0.4 + tr.over / 40) : 0;
        const grp = svg('g', { 'clip-path': `url(#${clipId})` });
        const info = { Dv, floorY: surfY + Dv * sy, offTop: 0, offFloor: 0, right: null, offs: [], notchPx: notchNm * sx,
          // widest wall offset (px) within `band` px above the floor — used to keep labels clear of bulges and bowls
          bandMax(band) { return this.offs.reduce((m, o) => o[1] >= this.floorY - band ? Math.max(m, o[0]) : m, -w * sx * 0.5); } };
        if (Dv < 0.3) return { grp, info };
        const pts = profile(w, Dv, P.L, M, P.cycles, P.scallopNm, notchNm, Lmax);
        const left = pts.map(([o, y]) => [cx - (w + o) * sx, surfY + y * sy]), right = pts.map(([o, y]) => [cx + (w + o) * sx, surfY + y * sy]);
        const pl = a => 'M' + a.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L');
        grp.append(svg('path', { d: pl(left) + ' L' + pl(right.slice().reverse()).slice(1) + ' Z', fill: 'var(--ground)', stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-linejoin': 'round' }));
        if (M.p > 0.03) { const sw = 0.8 + 3.2 * M.p; [left, right].forEach(a => grp.append(svg('path', { d: pl(a), fill: 'none', stroke: 'var(--ok)', 'stroke-width': sw, 'stroke-linejoin': 'round', 'stroke-opacity': .9 }))); }
        const fl = left[left.length - 1], fr = right[right.length - 1];
        grp.append(ln(fl[0], fl[1], fr[0], fr[1], { stroke: 'var(--accent)', w: 2.5 }));
        Object.assign(info, { right, offs: pts.map(([o, y]) => [o * sx, surfY + y * sy]), offTop: pts[0][0] * sx, offFloor: pts[pts.length - 1][0] * sx });
        return { grp, info };
      }

      function render() {
        ionIn.value = st.ion; chemIn.value = st.chem; passIn.value = st.pass; timeIn.value = st.time;
        const M = model(st), g = st.g, W = Lay.W, long = Lay.mode === 'wide', narrow = Lay.mode === 'narrow';
        ionOut.textContent = st.ion; chemOut.textContent = st.chem + ' %'; passOut.textContent = st.pass + ' %'; timeOut.textContent = fmtT(M.T);
        const active = presetActive();
        Array.from(presetRow.children).forEach((btn, i) => btn.classList.toggle('primary', PRESETS[i] === active));

        // ---- scales & derived state ----
        const sy = (BAND_BOT - MASK_TOP) / (g.mask + g.film + g.stop), sx = (g.sx || sy) * Lay.k;
        const filmTop0 = MASK_TOP + g.mask * sy, filmBot = filmTop0 + g.film * sy, stopBot = filmBot + g.stop * sy;
        const maskRem = Math.max(0, g.mask - M.rm * M.T / 60), tGone = M.rm > 0 ? g.mask / M.rm * 60 : Infinity;
        const rec = Math.min(g.film * 0.3, M.T > tGone ? M.rv * (M.T - tGone) / 60 : 0);      // surface recession once the mask is consumed (capped so the drawing stays readable)
        const surfY = filmTop0 + rec * sy, maskTop = surfY - maskRem * sy, maskH = maskRem * sy;
        const trN = etch(g, M, g.wN), trW = etch(g, M, g.wW);
        const L = M.rl * M.T / 60, cycles = g.cycle ? Math.max(1, Math.round(M.T / g.cycle)) : 0;
        const nC = Math.round(W * Lay.nF), wC = Math.round(W * Lay.wF);
        const nL = nC - g.wN * sx / 2, nR = nC + g.wN * sx / 2, wL = wC - g.wW * sx / 2, wR = wC + g.wW * sx / 2, gapMid = (nR + wL) / 2;
        const LmaxN = (Math.min(gapMid - nR, nL - 8) - 2) / sx, LmaxW = (Math.min(wL - gapMid, W - wR - 8) - 2) / sx;
        const P = { M, g, sx, sy, surfY, rec, L, cycles, scallopNm: g.cycle ? g.scallopPx / sx : 0 };
        const wet = !!g.wet && M.i === 0, ink = 'var(--ink)', mut = 'var(--muted)', gnd = 'var(--ground)';

        D.innerHTML = '';
        D.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const defs = svg('defs');
        defs.append(svg('clipPath', { id: uid + '-n' }, svg('rect', { x: 0, y: surfY - 3, width: gapMid, height: BAND_BOT + 3 - surfY })),
          svg('clipPath', { id: uid + '-w' }, svg('rect', { x: gapMid, y: surfY - 3, width: W - gapMid, height: BAND_BOT + 3 - surfY })));
        D.append(defs);

        // ---- plasma band, ions, radicals, sheath ----
        D.append(svg('rect', { x: 0, y: 0, width: W, height: PLASMA_BOT, fill: 'var(--accent2)', 'fill-opacity': .1 }));
        D.append(tx(6, 14, wet ? (long ? 'liquid HF bath: molecules arrive from every direction — no plasma, no ions' : 'HF bath: no plasma, no ions')
          : M.rv === 0 ? (long ? 'plasma off: no ions and no radicals, so nothing can etch' : 'plasma off: nothing etches')
          : long ? 'plasma: radicals (neutral, isotropic) + ions (accelerated straight down across the sheath)' : narrow ? 'plasma: radicals + ions' : 'plasma: radicals (isotropic) + ions (directional)'));
        const nIonN = M.i > 0 ? 1 + Math.round(3 * M.i) : 0, nIonW = M.i > 0 ? 2 + Math.round(4 * M.i) : 0, ionLen = 28 + 34 * M.i;
        [[nL, nR, nIonN], [wL, wR, nIonW]].forEach(([x0, x1, n]) => { for (let j = 0; j < n; j++) D.append(arrowDown(x0 + (x1 - x0) * (j + 0.5) / n, 86 - ionLen, 86, 'var(--accent)')); });
        const zoneA = [nR + 8, wL - 8, 20, narrow ? 34 : 52], zoneB = [wR + 8, W - 8, 22, narrow ? 60 : 52];
        const nRad = Math.round(8 * M.c);
        for (let j = 0; j < nRad; j++) { const [fx, fy, a] = RAD[j], z = j < 5 ? zoneA : zoneB; D.append(arrowDir(z[0] + fx * (z[1] - z[0] - 12) + 2, z[2] + fy * (z[3] - z[2] - 10), a, 11, 'var(--accent2)')); }
        const ionLbl = M.i === 0 ? (wet ? 'no ions' : 'no ions (zero bias)') : long ? `ions, ~${fmtEV(M.eV)}` : `ions ${fmtEV(M.eV)}`;
        const radLbl = M.c === 0 ? 'no radicals' : wet ? (long ? 'HF molecules' : 'HF (liquid)') : long ? 'F / Cl radicals' : 'radicals';
        if (narrow) { D.append(tx(nR + 6, 48, ionLbl, { fill: 'var(--accent)' }), tx(nR + 6, 65, radLbl, { fill: 'var(--accent2)' })); }
        else { D.append(tx(nR + 6, 64, ionLbl, { fill: 'var(--accent)' }), tx(wR + 6, 64, radLbl, { fill: 'var(--accent2)' })); }
        if (!wet) { D.append(ln(0, SHEATH_Y, W, SHEATH_Y, { dash: '4 3' }), tx(6, 84, long ? 'sheath (dark space)' : 'sheath')); }
        else D.append(tx(6, 84, long ? 'no plasma, so no sheath' : 'no sheath'));

        // ---- film, stop, substrate ----
        D.append(svg('rect', { x: 0, y: surfY, width: W, height: Math.max(0, filmBot - surfY), fill: 'var(--si)' }));
        if (g.stopKind === 'layer') D.append(svg('rect', { x: 0, y: filmBot, width: W, height: stopBot - filmBot, fill: 'var(--cu)', 'fill-opacity': .75 }));
        D.append(svg('rect', { x: 0, y: stopBot, width: W, height: H - stopBot, fill: 'var(--si)', 'fill-opacity': .45 }));
        if (g.stopKind === 'line') D.append(ln(0, filmBot, W, filmBot, { dash: '6 4', stroke: ink, w: 1.2 }));
        D.append(tx(6, stopBot + 13, g.stopKind === 'layer' ? (long ? `etch stop: ${g.stopName}, ${fmtNm(g.stop)}` : 'etch stop') : (long ? 'target depth (timed etch, no stop layer)' : 'target depth'), { fill: ink }));
        D.append(tx(6, H - 8, long ? `substrate: ${g.subName}` : 'substrate', { fill: ink }));

        // ---- trenches (clipped to their own half) ----
        const tN = drawTrench(P, nC, g.wN, trN, LmaxN, uid + '-n'), tW = drawTrench(P, wC, g.wW, trW, LmaxW, uid + '-w');
        D.append(tN.grp, tW.grp);

        // ---- mask: one layer with two openings, faceted corners ----
        const f = maskH > 0.5 ? Math.min(M.facetPx, maskH * 0.8) : 0;
        if (maskH > 0.5) {
          const poly = pts => svg('polygon', { points: pts.map(p => p.join(',')).join(' '), fill: 'var(--line2)', stroke: mut, 'stroke-width': 1, 'stroke-opacity': .6 });
          D.append(poly([[0, maskTop], [nL - f, maskTop], [nL, maskTop + f], [nL, surfY], [0, surfY]]),
            poly([[nR, surfY], [nR, maskTop + f], [nR + f, maskTop], [wL - f, maskTop], [wL, maskTop + f], [wL, surfY]]),
            poly([[wR, surfY], [wR, maskTop + f], [wR + f, maskTop], [W, maskTop], [W, surfY]]));
          const lbl = long ? `${g.maskName}: ${fmtNm(maskRem)}` : narrow ? 'mask' : `mask: ${fmtNm(maskRem)}`;
          D.append(maskH >= 16 ? tx(6, maskTop + maskH / 2 + 4, lbl, { fill: ink }) : tx(6, maskTop - 4, lbl, { fill: ink }));
        } else D.append(tx(6, surfY - 4, long ? 'mask consumed — whole surface now eroding, pattern lost' : 'mask consumed', { fill: 'var(--bad)', bold: true }));
        // ghost outlines of what erosion removed: the mask's original top, and the film's original surface once the mask is gone
        if (maskTop - MASK_TOP >= 3) {
          D.append(ln(0, MASK_TOP, W, MASK_TOP, { dash: '5 4', stroke: 'var(--warn)', w: 1 }));
          if (maskTop - MASK_TOP >= 16) D.append(tx(6, MASK_TOP + 12, long ? `mask before etch: ${fmtNm(g.mask)}` : narrow ? 'mask before' : `mask before: ${fmtNm(g.mask)}`, { fill: 'var(--warn)' }));
        }
        if (rec * sy >= 3) { D.append(ln(0, filmTop0, W, filmTop0, { dash: '5 4', stroke: 'var(--bad)', w: 1 })); if (rec * sy >= 28) D.append(tx(6, filmTop0 + 12, long ? 'original film surface' : 'orig. surface', { fill: 'var(--bad)' })); }
        // opening-width dimension brackets (in the sheath band, just above the mask)
        [[nL, nR, g.wN, 'narrow'], [wL, wR, g.wW, 'wide']].forEach(([x0, x1, wnm, nm]) => {
          D.append(ln(x0, 94, x1, 94), ln(x0, 91, x0, 97), ln(x1, 91, x1, 97), tx(x1 + 5, 97, long ? `${nm}, ${fmtNm(wnm)}` : fmtNm(wnm), { mono: true }));
        });

        // ---- film label (adaptive so it never meets the narrow depth label, hidden if the cavity has eaten its corner) ----
        const filmH = filmBot - surfY, ew = Lay.fs * 0.6;   // ew ≈ average glyph width for fit checks
        if (filmH >= 36 && nL - Math.max(0, tN.info.offTop) > 24 * ew * 0.55)
          D.append(tx(6, tN.info.floorY < surfY + filmH / 2 ? filmBot - 8 : surfY + 14, long ? `film: ${g.filmName}, ${fmtNm(g.film)}` : narrow ? 'film' : `film ${fmtNm(g.film)}`, { fill: gnd }));

        // ---- depth labels: beside the floor corner, clear of any bulge; inside the cavity when there is no room outside ----
        const overTxt = (tr, short) => tr.through ? 'stop punched!' : g.stopKind === 'line' ? (short ? `+${Math.round(tr.over)}% past` : `${Math.round(tr.over)} % past target`) : (short ? `+${Math.round(Math.min(999, tr.over))}% over` : `over-etch ${Math.round(Math.min(999, tr.over))} %`);
        const depthTxt = (t, tr) => long ? `depth ${fmtNm(t.info.Dv - tr.dip)}` : fmtNm(t.info.Dv - tr.dip);
        let depthInsideW = false;
        if (tN.info.Dv > 0.3) {
          const l1 = depthTxt(tN, trN), l2 = trN.landed && !narrow ? overTxt(trN, !long) : '', band = l2 ? 32 : 16, tw = Math.max(l1.length, l2.length) * ew;
          const edge = nL - tN.info.bandMax(band), y = tN.info.floorY;
          if (edge - 8 - tw >= 4) {
            D.append(ln(edge - 6, y, edge, y), tx(edge - 8, y - 3, l1, { mono: true, anchor: 'end', fill: gnd }));
            if (l2) D.append(tx(edge - 8, y - 6 - Lay.fs, l2, { anchor: 'end', fill: trN.through ? 'var(--bad)' : gnd, bold: trN.through }));
          } else { D.append(tx(nC, y - 5, l1, { mono: true, anchor: 'middle', fill: ink })); if (l2) D.append(tx(nC, y - 8 - Lay.fs, l2, { anchor: 'middle', fill: trN.through ? 'var(--bad)' : ink, bold: trN.through })); }
        }
        if (tW.info.Dv > 0.3) {
          const l1 = depthTxt(tW, trW), l2 = trW.landed && !narrow ? overTxt(trW, !long) : '', band = l2 ? 32 : 16, tw = Math.max(l1.length, l2.length) * ew;
          const edge = wR + tW.info.bandMax(band), y = tW.info.floorY;
          if (edge + 8 + tw <= W - 4) {
            D.append(ln(edge, y, edge + 6, y), tx(edge + 8, y - 3, l1, { mono: true, fill: gnd }));
            if (l2) D.append(tx(edge + 8, y - 6 - Lay.fs, l2, { fill: trW.through ? 'var(--bad)' : gnd, bold: trW.through }));
          } else { depthInsideW = true; D.append(tx(wC, y - 5, l1, { mono: true, anchor: 'middle', fill: ink })); if (l2) D.append(tx(wC, y - 8 - Lay.fs, l2, { anchor: 'middle', fill: trW.through ? 'var(--bad)' : ink, bold: trW.through })); }
          if (long) {
            const cavH = tW.info.floorY - surfY, floorW = (tW.info.right[tW.info.right.length - 1][0] - wC) * 2;
            if (!depthInsideW && cavH >= 26 && floorW >= 74) D.append(tx(wC, tW.info.floorY - 5, 'etch front', { anchor: 'middle', fill: ink }));
            if (M.p > 0.05 && cavH >= 64 && g.wW * sx >= 84) { const mid = tW.info.right[32]; D.append(tx(mid[0] - 5, mid[1] + 4, 'passivation', { anchor: 'end', fill: ink })); }
          }
        }

        // ---- callouts (appear only when the defect is active); on the narrow trench, notch on whichever trench has landed ----
        const callouts = [], R = tN.info.right;
        const merged = tN.info.Dv > 0.3 && tW.info.Dv > 0.3 && tN.info.offTop + tW.info.offTop >= (wL - nR) - 6;
        if (maskH >= 14 && M.i > 0.6 && f >= 6) callouts.push({ px: nR + f * 0.5, py: maskTop + f * 0.5, text: 'facet', y: maskTop + 12, fill: ink });
        if (R) {
          if (merged) D.append(tx(gapMid, surfY + 15, long ? 'undercut: the two openings have merged under the mask' : 'undercut: merged', { anchor: 'middle', fill: ink }));
          else if (tN.info.offTop >= 4) callouts.push({ px: R[0][0], py: surfY + 3, text: 'undercut', y: surfY + 14 });
          if (cycles && tN.info.Dv * sy > 20) callouts.push({ px: R[16][0], py: R[16][1], text: 'scallops', y: R[16][1] + 4 });
          if (M.bowFrac * g.wN / 2 * sx >= 3) callouts.push({ px: R[20][0], py: R[20][1], text: 'bowing', y: R[20][1] + 4 });
          if (M.taperFrac * g.wN / 2 * sx >= 4) callouts.push({ px: R[32][0], py: R[32][1], text: 'taper', y: R[32][1] + 4 });
          if (M.footFrac * g.wN / 2 * sx >= 3) callouts.push({ px: R[58][0], py: R[58][1], text: 'footing', y: R[58][1] });
          if (tN.info.notchPx >= 3) callouts.push({ px: nR + tN.info.notchPx * 0.8, py: tN.info.floorY - tN.info.notchPx * 0.4, text: 'notch', y: tN.info.floorY - 4 });
          else if (tW.info.notchPx >= 3 && !merged) callouts.push({ px: wL - tW.info.notchPx * 0.8, py: tW.info.floorY - tW.info.notchPx * 0.4, text: 'notch', y: tW.info.floorY - 4, left: true });
        }
        callouts.sort((a, b) => a.y - b.y);
        let lastY = -1e9;
        callouts.forEach(c => {
          c.y = Math.max(c.y, lastY + 14); lastY = c.y;
          let xText = c.left ? c.px - 8 : Math.max(c.px + 8, nR + tN.info.offTop + 8), fill = c.fill || gnd;
          if (merged) fill = ink;                                                    // everything right of the opening is cavity now
          else if (!c.left && xText + c.text.length * ew > wL - tW.info.offTop - 2) { c.left = true; xText = c.px - 8; fill = ink; }   // no room in the gap: write it inside the (widened) cavity
          D.append(svg('circle', { cx: c.px, cy: c.py, r: 2.2, fill: 'var(--warn)' }), ln(c.px, c.py, c.left ? xText + 3 : xText - 3, c.y - 4, { stroke: 'var(--warn)', w: 1 }), tx(xText, c.y, c.text, { fill, bold: true, anchor: c.left ? 'end' : 'start' }));
        });

        // ---- ARDE bracket between the two floors ----
        if (tN.info.Dv > 0.3 && tW.info.Dv > 0.3) {
          const yN = tN.info.floorY, yW = tW.info.floorY, lag = (tW.info.Dv - trW.dip) - (tN.info.Dv - trN.dip);
          D.append(ln(nR + tN.info.offFloor, yN, gapMid, yN, { dash: '3 3' }), ln(wL - tW.info.offFloor, yW, gapMid, yW, { dash: '3 3' }));
          if (Math.abs(yW - yN) >= 6) D.append(ln(gapMid, yN, gapMid, yW, { stroke: ink, w: 1.2 }), svg('polygon', { points: `${gapMid - 3},${yW - 6} ${gapMid + 3},${yW - 6} ${gapMid},${yW}`, fill: ink }));
          const s1 = lag * sy >= 1 ? (long ? 'ARDE: narrow lags by' : 'ARDE lag') : trN.landed && trW.landed ? (long ? 'ARDE: narrow landed' : 'ARDE: both') : (long ? 'ARDE: no lag yet' : 'no lag');
          const s2 = lag * sy >= 1 ? fmtNm(lag) : trN.landed && trW.landed ? (long ? `${fmtT(Math.round(trN.tLand - trW.tLand))} later` : 'landed') : '';
          let ay = Math.max(yN, yW) + 16; ay = Math.max(ay, lastY + 14);
          if (ay > filmBot) ay = Math.max(stopBot + 13, lastY + 14);       // deeper floor is on the stop: put the text in the substrate band
          const fill = ay - 6 > filmBot ? ink : gnd;
          if (narrow) { D.append(tx(gapMid, ay, s1, { anchor: 'middle', fill, bold: true })); if (s2) D.append(tx(gapMid, ay + Lay.fs + 3, s2, { anchor: 'middle', fill, mono: true })); }
          else D.append(tx(gapMid + 12, ay, s2 ? `${s1} ${s2}` : s1, { anchor: 'middle', fill, bold: true }));
        }

        // ---- vertical scale bar (right edge, inside the film) ----
        if (!narrow) {
          const cand = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000]; let bar = 10; cand.forEach(v => { if (v * sy <= 72) bar = v; });
          const len = bar * sy, top = (tW.info.floorY - surfY) > len + 26 ? surfY + 8 : filmBot - 8 - len, bx = W - 10;
          if (filmH >= len + 16 && wR + tW.info.bandMax(1e9) + 48 < W) D.append(ln(bx, top, bx, top + len, { stroke: gnd, w: 2 }), ln(bx - 3, top, bx + 3, top, { stroke: gnd, w: 1.5 }), ln(bx - 3, top + len, bx + 3, top + len, { stroke: gnd, w: 1.5 }), tx(bx - 6, top + len / 2 + 4, fmtNm(bar), { mono: true, anchor: 'end', fill: gnd }));
        }

        // ---- readouts & text ----
        stRate.textContent = fmtRate(M.rv);
        const A = M.rv > 0 ? Math.max(0, 1 - M.rl / M.rv) : null;
        stA.textContent = A === null ? '–' : A >= 0.995 && A < 1 ? A.toFixed(3) : A.toFixed(2);
        stSel.textContent = M.rv > 0 && M.rm > 0 ? fmt(M.rv / M.rm, 0) + ':1' : '–';
        stMask.textContent = maskRem > 0 ? fmtNm(maskRem) : 'consumed'; stMask.style.color = maskRem > 0 ? '' : 'var(--bad)';
        const dN = Math.max(0, tN.info.Dv - trN.dip), dW = Math.max(0, tW.info.Dv - trW.dip);
        stDepth.textContent = `${fmtNm(dN)} | ${fmtNm(dW)}`;
        stAR.textContent = (dN / g.wN).toFixed(1) + ':1'; stARl.textContent = `aspect ratio, narrow (${Math.round(g.film / g.wN)}:1 at full depth)`;
        stOver.textContent = trW.landed ? (trW.through ? 'punched through' : `${Math.round(Math.min(999, trW.over))} %`) : (g.stopKind === 'line' ? 'not yet' : 'not at the stop');
        stOver.style.color = trW.through ? 'var(--bad)' : '';
        stOverl.textContent = g.stopKind === 'line' ? 'past target depth (wide opening)' : 'over-etch on the stop (wide opening)';
        stEV.textContent = wet ? 'none (wet)' : M.i === 0 ? '~20 eV (no bias)' : fmtEV(M.eV);
        mechNote.innerHTML = '';
        if (active && active.note) mechNote.append(h('b', { style: { color: 'var(--ink)' } }, active.name + '. '), active.note);
        else { mechNote.append(regime(M)); if (g !== GENERIC) mechNote.append(h('span', null, ` Geometry (openings, film, mask, scales) is still that of the ${PRESETS.find(p => p.g === g).name} preset.`)); }
        const ratio = sx / sy;
        const scaleTxt = Math.abs(ratio - 1) < 0.05 ? 'The drawing is to scale (same nm-per-pixel horizontally and vertically), which is why an isotropic etch draws a circle.'
          : `Horizontal scale is ${ratio > 1 ? 'exaggerated' : 'compressed'} ×${ratio > 1 ? ratio.toFixed(1) : (1 / ratio).toFixed(1)} relative to depth so the openings stay visible.`;
        note.textContent = `Qualitative model tuned to the ranges Module 09 quotes, not a predictive simulator. ${scaleTxt} Both openings see the same plasma for the same time; only their width differs — which is exactly what makes ARDE show up.`;
      }

      mechNote.classList.add('w-insight');
      el.append(h('div', { class: 'w-studio' }, h('div', { class: 'w-figure-title' }, 'Same plasma. Different opening widths.'), D),
        mechNote, h('div', { class: 'w-console' }, presetRow, controls), readout, note,
        h('details', { class: 'w-reference' }, h('summary', null, 'Model equations & material key'), formula, legend));
      Lay = layoutFor(el.clientWidth || 700);
      render();
      const ro = new ResizeObserver(() => { const l = layoutFor(el.clientWidth || 700); if (l.W !== Lay.W || l.fs !== Lay.fs) { Lay = l; render(); } });
      ro.observe(el);
      return () => ro.disconnect();
    }
  });
})();
