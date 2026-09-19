/* Widget: wafer-slicing — "Ingot to Wafers Calculator" (Module 03) */
(function () {
  'use strict';
  const RHO = 2.33;             // g/cm3 solid silicon
  const DIA_MM = 300;           // ingot diameter assumed throughout
  const FINAL_UM = 775;         // SEMI M1 target thickness, 300 mm
  const SHIP_YIELD = 0.97;      // module: ~3% broken / out-of-spec slices discarded
  const EG_PRICE_PER_KG = 30;   // midpoint of Module 01's $20-40/kg electronic-grade range
  const ETCH = 25, DSP = 18, CMP = 1.5;   // Module 03 stack-up: downstream removals held fixed (µm)
  const DDG_LO = 60, DDG_HI = 80;         // module table: double-disk grind removes 60–80 µm total
  const BLOCK_MM = 330;         // ~330 mm blocks (module: six per 2 m body)
  const FEED = 0.75;            // block feed rate, mm/min (module: ~0.5–1)
  const CUT0 = 0.55, CUT_MIN = 0.4, CUT_MAX = 0.8;   // fraction of the block already below the wire
  const PX_PER_MM = 30;         // front view: exaggerated pitch scale (viewBox units per mm of pitch)
  let uid = 0;
  // fixed-decimal formatter with thin-space thousands (ctx.fmt trims trailing zeros, which mixes precisions)
  const fx = (n, d) => { const s = Math.abs(n).toFixed(d), p = s.split('.'); return (n < 0 ? '−' : '') + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (p[1] ? '.' + p[1] : ''); };

  window.registerWidget('wafer-slicing', {
    title: 'Ingot to Wafers Calculator',
    caption: 'Set the as-cut slice thickness and the kerf (the slot each wire cuts, ≈ wire core + 2 × grit) and watch the wire web, wafer count and kerf loss respond; then see how 890 µm of as-cut silicon becomes a 775 µm polished wafer.',
    mount(el, ctx) {
      const { h, svg } = ctx;
      const id = 'ws' + (++uid);
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const st = { body: 1965, raw: 890, kerf: 160, cut: CUT0, playing: !reduced, dir: 1, pil: 0, phase: 0 };
      let mode = '', FS = 12, LH = 15, lastMM = -1, sideView = null, frontView = null;

      // ---------- controls / readouts ----------
      const bodyS = h('input', { type: 'range', min: 1000, max: 2500, step: 5, value: st.body });
      const rawS = h('input', { type: 'range', min: 870, max: 950, step: 5, value: st.raw });
      const kerfS = h('input', { type: 'range', min: 120, max: 200, step: 5, value: st.kerf });
      const bodyO = h('output'), rawO = h('output'), kerfO = h('output');
      const ctl = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Sliceable length (after sectioning)'), bodyS, bodyO),
        h('label', { class: 'w-ctl' }, h('span', null, 'As-cut slice thickness'), rawS, rawO),
        h('label', { class: 'w-ctl' }, h('span', null, 'Diamond-wire kerf'), kerfS, kerfO));
      const stPitch = h('b'), stCount = h('b'), stKerfPct = h('b'), stKerfMass = h('b');
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, stPitch, h('span', null, 'pitch = slice + kerf')),
        h('div', { class: 'w-stat' }, stCount, h('span', null, 'wafers shipped (gross)')),
        h('div', { class: 'w-stat' }, stKerfPct, h('span', null, 'ingot length lost to kerf')),
        h('div', { class: 'w-stat' }, stKerfMass, h('span', null, 'kerf sludge (silicon value)')));
      const formula = h('div', { class: 'w-formula', html:
        'pitch = as-cut slice + kerf &nbsp;·&nbsp; kerf = slot the wire cuts ≈ wire core + 2 × grit &nbsp;·&nbsp; gross slices = sliceable length / pitch (rounded down) &nbsp;·&nbsp; shipped ≈ gross × 0.97 &nbsp;·&nbsp; final = 775 µm (SEMI M1, 300 mm)' });

      const H5 = t => h('h5', { style: { margin: 0, fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' } }, t);
      const head = (t, ...extra) => h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', margin: '16px 0 6px' } }, H5(t), ...extra);
      const playBtn = h('button', { class: 'w-btn', type: 'button' }, 'Play');
      const prog = h('span', { style: { fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--muted)' } });

      const sawSvg = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Multi-wire saw work zone: side view with grooved wire-guide rollers, the wire loop and the block on its sacrificial beam fed downward; front view along the wire strands showing as-cut slabs separated by red kerf slots; diamond-wire cross-section' });
      const sawNote = h('div', { class: 'w-note' });
      const ingotSvg = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Whole ingot body drawn to the chosen sliceable length, divided into blocks with test slugs, one block highlighted as the one in the saw' });
      const stackSvg = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Removal stack-up from as-cut slice to finished 775 µm wafer' });
      const warn = h('div', { class: 'w-note', style: { color: 'var(--warn)', fontWeight: 600 } });
      const note = h('div', { class: 'w-note' },
        'Assumes a 300 mm ingot (ρ = 2.33 g/cm³) and $30/kg for the electronic-grade polysilicon consumed to make the kerf, the midpoint of Module 01’s $20–40/kg range. Kerf sludge is not recoverable for semiconductor use (it carries nickel, iron and coolant from the wire), so the value shown is silicon consumed, not silicon sold. A 2.0 m body loses ~35 mm to five band-saw block cuts and their test slugs, which is where the 1 965 mm default comes from; the crown and tail are cropped and remelted. Removal stack-up: Module 03’s worked example holds the etch (25 µm), double-side polish (18 µm) and final CMP (1.5 µm) fixed, so the double-disk grind absorbs whatever the saw leaves; the as-cut target is the number a wafer maker tunes.');

      const insight = h('div', { class: 'w-insight' });
      el.append(h('div', { class: 'w-studio' }, h('div', { class: 'w-lab-kicker' }, 'From a solid cylinder to hundreds of slices'),
          head('Multi-wire saw: the work zone', playBtn, prog), sawSvg),
        insight, h('div', { class: 'w-console' }, h('div', { class: 'w-lab-kicker' }, 'Change the cut'), ctl, readout),
        h('section', { class: 'w-lab-section' }, head('The whole ingot: which block is in the saw'), ingotSvg),
        h('section', { class: 'w-lab-section' }, head('Removal stack-up: as-cut slice to finished wafer'), stackSvg, h('div', { class: 'w-note' }, 'Bars begin at 700 µm, not zero, to show the removal steps clearly. Etch, polish and CMP removals are held fixed; grinding absorbs the remaining difference.'), warn),
        h('div', { class: 'w-note' }, 'Schematic apparatus; the slice-to-kerf ratio is exact but pitch is exaggerated so each cut remains visible.'),
        h('details', { class: 'w-details' }, h('summary', null, 'Cutting geometry, material balance and assumptions'), formula, sawNote, note));

      // ---------- SVG helpers ----------
      function clear(s) { while (s.firstChild) s.removeChild(s.firstChild); }
      const T = (x, y, txt, a) => svg('text', Object.assign({ x, y, 'font-family': 'var(--sans)', 'font-size': FS, fill: 'var(--ink)' }, a || {}), txt);
      const LN = (x1, y1, x2, y2, a) => svg('line', Object.assign({ x1, y1, x2, y2, stroke: 'var(--muted)', 'stroke-width': 1 }, a || {}));
      const head3 = (x, y, dx, dy, c) => { const a = Math.atan2(dy, dx), s = 6.5; return svg('polygon', { points: `${x},${y} ${x - s * Math.cos(a - 0.45)},${y - s * Math.sin(a - 0.45)} ${x - s * Math.cos(a + 0.45)},${y - s * Math.sin(a + 0.45)}`, fill: c || 'var(--accent)' }); };
      function arrow(g, x1, y1, x2, y2, c, both) { c = c || 'var(--accent)'; g.append(LN(x1, y1, x2, y2, { stroke: c, 'stroke-width': 1.5 }), head3(x2, y2, x2 - x1, y2 - y1, c)); if (both) g.append(head3(x1, y1, x1 - x2, y1 - y2, c)); }
      function leader(g, x1, y1, x2, y2) { g.append(LN(x1, y1, x2, y2), svg('circle', { cx: x2, cy: y2, r: 2, fill: 'var(--muted)' })); }
      function movLeader(g, x1, y1) { const l = LN(x1, y1, x1, y1), d = svg('circle', { cx: x1, cy: y1, r: 2, fill: 'var(--muted)' }); g.append(l, d); return { set(x, y) { l.setAttribute('x2', x); l.setAttribute('y2', y); d.setAttribute('cx', x); d.setAttribute('cy', y); } }; }

      // ---------- side view: along the roller axis (the machine) ----------
      function buildSide(g) {
        const wy = 190, ry = 216, r = 26, cx1 = 36, cx2 = 194, bx = 115, R = 44, W = 230;
        g.append(T(0, 12, 'Side view: along the roller axis', { fill: 'var(--muted)' }));
        g.append(T(bx, 32, 'block fed down ~0.5–1 mm/min', { 'text-anchor': 'middle' }));
        arrow(g, bx, 38, bx, 54);
        const feedArm = svg('rect', { x: bx - 7, y: 56, width: 14, height: 60, fill: 'var(--line2)', stroke: 'var(--muted)' });
        g.append(feedArm);
        // coolant nozzle
        g.append(T(51, 122, 'water coolant', { 'text-anchor': 'middle', fill: 'var(--muted)' }));
        g.append(svg('polygon', { points: '45,132 57,132 51,146', fill: 'var(--muted)' }));
        [[50, 150, 62, 186], [54, 152, 67, 188]].forEach(p => g.append(LN(p[0], p[1], p[2], p[3], { stroke: 'var(--accent2)', 'stroke-width': 1.5, 'stroke-dasharray': '2 3' })));
        // grooved wire-guide rollers with rotation arrows (cw for forward, ccw for the pilgrim reverse)
        const rot = [];
        [cx1, cx2].forEach(cx => {
          g.append(svg('circle', { cx, cy: ry, r, fill: 'var(--ground)', stroke: 'var(--line2)', 'stroke-width': 1.5 }));
          for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; g.append(LN(cx + (r - 5) * Math.cos(a), ry + (r - 5) * Math.sin(a), cx + r * Math.cos(a), ry + r * Math.sin(a), { stroke: 'var(--line2)' })); }
          g.append(svg('circle', { cx, cy: ry, r: 3, fill: 'var(--muted)' }));
          const ar = 12, a0 = -150 * Math.PI / 180, a1 = -30 * Math.PI / 180, P = a => [cx + ar * Math.cos(a), ry + ar * Math.sin(a)];
          const cw = svg('g'), ccw = svg('g');
          cw.append(svg('path', { d: `M${P(a0)} A${ar},${ar} 0 0 1 ${P(a1)}`, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.5 }), head3(P(a1)[0], P(a1)[1], -Math.sin(a1), Math.cos(a1)));
          ccw.append(svg('path', { d: `M${P(a1)} A${ar},${ar} 0 0 0 ${P(a0)}`, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.5 }), head3(P(a0)[0], P(a0)[1], Math.sin(a0), -Math.cos(a0)));
          g.append(cw, ccw); rot.push([cw, ccw]);
        });
        g.append(T(cx2 + 2, 183, 'wire', { fill: 'var(--muted)', 'text-anchor': 'end' }));
        const y1 = 274, y2 = y1 + LH + 2, y3 = y2 + LH + 2;
        g.append(T(16, y1, 'wire guide (grooved roller)', { fill: 'var(--muted)' }));
        g.append(T(16, y2, 'supply spool', { fill: 'var(--muted)' }), T(cx2 + r - 6, y2, 'take-up spool', { fill: 'var(--muted)', 'text-anchor': 'end' }));
        g.append(T(bx, y3, 'wire 10–25 m/s, pilgrim mode ↔', { 'text-anchor': 'middle', fill: 'var(--muted)' }));
        // block (end-on) glued to its beam; the part below the wire is already cut
        const blockG = svg('g');
        blockG.append(svg('rect', { x: bx - 52, y: -R - 9, width: 104, height: 9, fill: 'var(--line2)', stroke: 'var(--muted)' }));
        blockG.append(svg('circle', { cx: bx, cy: 0, r: R, fill: 'var(--si)', opacity: 0.55, stroke: 'var(--si)' }));
        blockG.append(LN(bx - 40, -R, bx + 40, -R, { stroke: 'var(--accent)', 'stroke-width': 2 }));
        const blockLabel = T(bx, -R + 19, '300 mm block', { 'text-anchor': 'middle', 'font-weight': 600 });
        blockG.append(blockLabel);
        const clip = svg('clipPath', { id: id + '-cut' }, svg('rect', { x: 0, y: wy, width: W, height: 140 }));
        const cutG = svg('g', { 'clip-path': `url(#${id}-cut)` });
        const cutCircle = svg('circle', { cx: bx, cy: 0, r: R, fill: 'var(--ground)', opacity: 0.5 });
        cutG.append(cutCircle);
        const cutLabel = T(bx, 0, 'cut so far', { 'text-anchor': 'middle', fill: 'var(--muted)' });
        const wireBase = svg('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.2 });
        const wireDash = svg('path', { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.8, 'stroke-dasharray': '6 5' });
        const endL = head3(cx1 - r, 298, 0, 1, 'var(--ink)'), endR = head3(cx2 + r, 298, 0, 1, 'var(--ink)');
        g.append(clip, blockG, cutG, cutLabel, wireBase, wireDash, endL, endR);
        function apply() {
          const by = wy + st.cut * 2 * R - R, dy = wy - by, c = Math.abs(dy) < R ? Math.sqrt(R * R - dy * dy) : 0;
          blockG.setAttribute('transform', `translate(0,${by.toFixed(2)})`);
          cutCircle.setAttribute('cy', by.toFixed(2));
          feedArm.setAttribute('height', Math.max(4, by - R - 9 - 56).toFixed(2));
          const web = c > 1 ? `L${(bx - c).toFixed(2)},${wy} Q${bx},${wy + 5} ${(bx + c).toFixed(2)},${wy} ` : '';
          const d = `M${cx1 - r},298 L${cx1 - r},${ry} A${r},${r} 0 0 1 ${cx1},${wy} ${web}L${cx2},${wy} A${r},${r} 0 0 1 ${cx2 + r},${ry} L${cx2 + r},298`;
          wireBase.setAttribute('d', d); wireDash.setAttribute('d', d);
          wireDash.setAttribute('stroke-dashoffset', (-st.phase).toFixed(1));
          cutLabel.setAttribute('y', ((wy + by + R) / 2 + 4).toFixed(1));
          cutLabel.setAttribute('opacity', by + R - wy > 26 ? 1 : 0);
          blockLabel.setAttribute('opacity', wy - (by - R) > 27 ? 1 : 0);   // hide once the uncut top is too short to hold it
          rot.forEach(p => { p[0].setAttribute('opacity', st.dir > 0 ? 1 : 0); p[1].setAttribute('opacity', st.dir > 0 ? 0 : 1); });
          endR.setAttribute('opacity', st.dir > 0 ? 1 : 0); endL.setAttribute('opacity', st.dir > 0 ? 0 : 1);
        }
        apply();
        return { apply, height: y3 + 8 };
      }

      // ---------- diamond-wire cross-section ----------
      function buildXS(g, cx, cy) {
        const r = 26;
        g.append(svg('circle', { cx, cy, r: 20, fill: 'none', stroke: 'var(--cu)', 'stroke-width': 4, opacity: 0.85 }));
        g.append(svg('circle', { cx, cy, r: 18, fill: 'var(--muted)', opacity: 0.55 }));
        for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + 0.2; g.append(svg('circle', { cx: cx + 23 * Math.cos(a), cy: cy + 23 * Math.sin(a), r: 3, fill: 'var(--accent2)' })); }
        g.append(T(cx + r, cy - r - 18, 'diamond wire, cross-section', { 'text-anchor': 'end', 'font-weight': 600 }));
        g.append(T(cx - r - 8, cy - 4, 'steel core 120 µm', { 'text-anchor': 'end' })); leader(g, cx - r - 4, cy - 8, cx - 8, cy - 2);
        g.append(T(cx - r - 8, cy + 12, 'Ni plating', { 'text-anchor': 'end' })); leader(g, cx - r - 4, cy + 8, cx + 20 * Math.cos(2.6), cy + 20 * Math.sin(2.6));
        g.append(T(cx + r + 4, cy + r + 16, 'diamond grit 8–25 µm', { 'text-anchor': 'end' })); leader(g, cx + r - 6, cy + r + 4, cx + 23 * Math.cos(1.25), cy + 23 * Math.sin(1.25));
        g.append(T(cx + r + 4, cy + r + 16 + LH, 'kerf ≈ core + 2 × grit', { 'text-anchor': 'end', fill: 'var(--muted)' }));
      }

      // ---------- front view: along the wire strands (pitch, slabs, kerf) ----------
      function buildFront(g, W, d) {
        const wy = 190, H = 150, x0 = 12, bw = W >= 380 ? 200 : 168, x1 = x0 + bw, lx = x1 + 16;
        const pitchPx = d.pitchMM * PX_PER_MM, slabPx = st.raw / 1000 * PX_PER_MM, kerfPx = st.kerf / 1000 * PX_PER_MM;
        g.append(T(0, 12, 'Front view: along the wire strands', { fill: 'var(--muted)' }));
        const slots = []; for (let x = x0 + slabPx; x + kerfPx <= x1 - 3; x += pitchPx) slots.push(x);
        const centers = slots.map(x => x + kerfPx / 2);
        // block on its beam, moving with the cut; slot rects grow from the bottom edge up to the wire
        const blockG = svg('g');
        blockG.append(svg('rect', { x: x0 - 6, y: -H - 9, width: bw + 12, height: 9, fill: 'var(--line2)', stroke: 'var(--muted)' }));
        blockG.append(svg('rect', { x: x0, y: -H, width: bw, height: H, fill: 'var(--si)', opacity: 0.55, stroke: 'var(--si)' }));
        blockG.append(LN(x0, -H, x1, -H, { stroke: 'var(--accent)', 'stroke-width': 2 }));
        arrow(blockG, x0 + bw / 2, -H - 34, x0 + bw / 2, -H - 14);
        blockG.append(T(x0 + bw / 2 - 8, -H - 18, 'feed', { fill: 'var(--muted)', 'text-anchor': 'end' }));
        const slotR = slots.map(x => { const rc = svg('rect', { x, y: 0, width: kerfPx, height: 1, fill: 'var(--bad)' }); blockG.append(rc); return rc; });
        g.append(blockG);
        // front wire-guide roller, drawn see-through, grooves at the pitch with the wire (end-on) in each
        const rx0 = x0 - 12, rx1 = x1 + 12;
        g.append(svg('rect', { x: rx0, y: wy, width: rx1 - rx0, height: 40, rx: 8, fill: 'var(--ground)', opacity: 0.55, stroke: 'var(--line2)', 'stroke-dasharray': '4 3' }));
        const gx = []; for (let x = centers[0] - Math.ceil((centers[0] - rx0 - 6) / pitchPx) * pitchPx; x <= rx1 - 6; x += pitchPx) if (x >= rx0 + 6) gx.push(x);
        gx.forEach(x => g.append(svg('path', { d: `M${x - 3.5},${wy} L${x},${wy + 5} L${x + 3.5},${wy}`, fill: 'none', stroke: 'var(--muted)' })));
        const dotR = Math.max(1.8, kerfPx / 2 - 0.3);
        gx.forEach(x => g.append(svg('circle', { cx: x, cy: wy + 0.5, r: dotR, fill: 'var(--ink)' })));
        // pitch dimension across two adjacent strands
        const a = centers[centers.length - 2], b = centers[centers.length - 1], py = wy + 28;
        g.append(LN(a, py - 6, a, py + 6, { stroke: 'var(--accent)' }), LN(b, py - 6, b, py + 6, { stroke: 'var(--accent)' }));
        arrow(g, a + 1, py, b - 1, py, 'var(--accent)', true);
        // labels in place (right column), leaders to the parts
        let y = 164; const row = () => { const v = y; y += LH; return v; };
        const yb = row(); g.append(T(lx, yb, 'sacrificial beam'), T(lx, row(), '(glass, epoxy-glued)', { fill: 'var(--muted)' }));
        const beamLead = movLeader(g, lx - 4, yb - 4);
        y += 6; const yw = row(); g.append(T(lx, yw, 'wire, end-on')); leader(g, lx - 4, yw - 4, b + 3, wy + 1);
        y += 8; const yp = row(); g.append(T(lx, yp, `pitch ${st.raw} + ${st.kerf} µm`), T(lx, row(), `= ${fx(d.pitchMM, 2)} mm`, { 'font-family': 'var(--mono)', 'font-weight': 600 }));
        leader(g, lx - 4, yp + 2, b + 4, py);
        y += 8; const ys = row(); g.append(T(lx, ys, `as-cut slice ${st.raw} µm`)); leader(g, lx - 4, ys - 4, (a + b) / 2, wy + 46);
        y += 8; const yk = row(); g.append(T(lx, yk, `kerf ${st.kerf} µm: sludge,`, { fill: 'var(--bad)', 'font-weight': 600 }), T(lx, row(), 'not recoverable', { fill: 'var(--muted)' })); leader(g, lx - 4, yk - 4, b, wy + 52);
        const yr = wy + 136; g.append(T(x0, yr, 'front roller drawn see-through;'), T(x0, yr + LH, 'its grooves set the pitch', { fill: 'var(--muted)' }));
        leader(g, 6, yr - 12, 4, wy + 32);
        buildXS(g, W - (W >= 380 ? 36 : 32), 74);
        function apply() {
          const bottom = wy + st.cut * H, depth = st.cut * H;
          blockG.setAttribute('transform', `translate(0,${bottom.toFixed(2)})`);
          slotR.forEach(rc => { rc.setAttribute('y', (-depth).toFixed(2)); rc.setAttribute('height', depth.toFixed(2)); });
          beamLead.set(x1 + 6, (bottom - H - 4.5).toFixed(2));
        }
        apply();
        return { apply, n: slots.length, exag: PX_PER_MM / (bw / BLOCK_MM), height: yr + LH + 8 };
      }

      function buildSaw(d) {
        clear(sawSvg);
        if (mode === 'wide') {
          const g1 = svg('g'), g2 = svg('g', { transform: 'translate(240,0)' });
          sawSvg.append(g1, g2);
          sideView = buildSide(g1); frontView = buildFront(g2, 380, d);
          const hgt = Math.max(sideView.height, frontView.height);
          sawSvg.append(LN(234, 6, 234, hgt - 6, { stroke: 'var(--line)' }));
          sawSvg.setAttribute('viewBox', `0 0 620 ${hgt}`);
        } else {
          const g1 = svg('g', { transform: 'translate(55,0)' });
          sawSvg.append(g1); sideView = buildSide(g1);
          const hs = sideView.height + 6;
          const g2 = svg('g', { transform: `translate(0,${hs})` }); sawSvg.append(g2); frontView = buildFront(g2, 340, d);
          sawSvg.append(LN(0, hs - 3, 340, hs - 3, { stroke: 'var(--line)' }));
          sawSvg.setAttribute('viewBox', `0 0 340 ${hs + frontView.height}`);
        }
      }

      // ---------- whole ingot strip ----------
      function drawIngot(d) {
        clear(ingotSvg);
        const wide = mode === 'wide', W = wide ? 620 : 340;
        const left = 46, right = 46, bodyH = wide ? 40 : 34, top = 40;
        const pxmm = (W - left - right) / 2500, L = st.body * pxmm, x0 = left, x1 = left + L, yc = top + bodyH / 2, bot = top + bodyH;
        const n = Math.max(1, Math.round(st.body / BLOCK_MM)), bmm = st.body / n, bpx = bmm * pxmm;
        ingotSvg.append(svg('path', { d: `M${x0},${top} Q${x0 - 36},${top} ${x0 - 36},${yc} Q${x0 - 36},${bot} ${x0},${bot} Z`, fill: 'var(--si)', opacity: 0.2, stroke: 'var(--line2)', 'stroke-dasharray': '3 2' }));
        ingotSvg.append(svg('path', { d: `M${x1},${top} L${x1 + 36},${yc} L${x1},${bot} Z`, fill: 'var(--si)', opacity: 0.2, stroke: 'var(--line2)', 'stroke-dasharray': '3 2' }));
        ingotSvg.append(T(x0 - 18, top - 6, 'crown', { 'text-anchor': 'middle', fill: 'var(--muted)' }), T(x1 + 18, top - 6, 'tail', { 'text-anchor': 'middle', fill: 'var(--muted)' }));
        ingotSvg.append(svg('rect', { x: x0, y: top, width: L, height: bodyH, fill: 'var(--si)', opacity: 0.5, stroke: 'var(--si)' }));
        for (let i = 1; i < n; i++) {
          const x = x0 + i * bpx;
          ingotSvg.append(svg('rect', { x: x - 4.5, y: top, width: 9, height: bodyH, fill: 'var(--ground)' }),
            svg('rect', { x: x - 4.5, y: top, width: 2.5, height: bodyH, fill: 'var(--accent2)' }), svg('rect', { x: x + 2, y: top, width: 2.5, height: bodyH, fill: 'var(--accent2)' }));
        }
        const hi = Math.min(1, n - 1), hx0 = x0 + hi * bpx + (hi ? 4.5 : 0), hx1 = x0 + (hi + 1) * bpx - (hi < n - 1 ? 4.5 : 0);
        ingotSvg.append(svg('rect', { x: hx0, y: top, width: hx1 - hx0, height: bodyH, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5 }));
        // sliceable-length dimension above the body, outside the bar
        const dy = top - 9;
        ingotSvg.append(LN(x0 + 2, dy, x1 - 2, dy, { stroke: 'var(--accent)' }), LN(x0 + 2, dy - 4, x0 + 2, dy + 4, { stroke: 'var(--accent)' }), LN(x1 - 2, dy - 4, x1 - 2, dy + 4, { stroke: 'var(--accent)' }));
        ingotSvg.append(T((x0 + x1) / 2, 12, `sliceable length ${fx(st.body, 0)} mm`, { 'text-anchor': 'middle', 'font-weight': 600 }));
        const ly1 = bot + LH + 2, ly2 = ly1 + LH, ly3 = ly2 + LH, tx = wide ? x0 : 6;
        ingotSvg.append(T(hx0 + 2, ly1, '↑ this block is in the saw above', { fill: 'var(--accent)', 'font-weight': 600 }));
        ingotSvg.append(T(tx, ly2, wide ? `${n} blocks of ~${Math.round(bmm)} mm; a test slug (violet) is cut at every block face` : `${n} blocks × ~${Math.round(bmm)} mm · slugs (violet) at cuts`, { fill: 'var(--muted)' }));
        ingotSvg.append(T(tx, ly3, wide ? `${fx(d.gross, 0)} gross slices → ${fx(d.shipped, 0)} shipped (−3 % breakage) · ${fx(d.kerfKg, 1)} kg of kerf sludge` : `${fx(d.gross, 0)} gross → ${fx(d.shipped, 0)} shipped (−3 %)`, { fill: 'var(--muted)' }));
        ingotSvg.setAttribute('viewBox', `0 0 ${W} ${ly3 + 6}`);
      }

      // ---------- removal stack-up ----------
      function drawStack(d) {
        clear(stackSvg);
        const wide = mode === 'wide', W = wide ? 660 : 340;
        const v1 = st.raw - d.ddg, v2 = v1 - ETCH, v3 = v2 - DSP;
        const rows = [
          { name: 'As-cut slice (diamond wire)', val: st.raw },
          { name: 'Double-disk grind', val: v1, delta: d.ddg, warn: d.ddgWarn },
          { name: 'Alkaline etch', val: v2, delta: ETCH },
          { name: 'Double-side polish', val: v3, delta: DSP },
          { name: 'Final CMP + RCA clean', val: FINAL_UM, delta: CMP }];
        const base = 700, BX0 = wide ? 220 : 8, BX1 = wide ? 530 : 236, rowH = wide ? 34 : 2 * LH + 12, barH = wide ? 20 : 16;
        const xOf = v => BX0 + Math.max(0, v - base) / (st.raw - base) * (BX1 - BX0);
        rows.forEach((r, i) => {
          const y = 10 + i * rowH, last = i === rows.length - 1;
          const ty = wide ? y + 14 : y + LH - 3, by = wide ? y : y + LH + 2;
          stackSvg.append(T(wide ? BX0 - 10 : BX0, ty, r.name, { 'text-anchor': wide ? 'end' : 'start' }));
          stackSvg.append(svg('rect', { x: BX0, y: by, width: Math.max(2, xOf(r.val) - BX0), height: barH, rx: 3, fill: last ? 'var(--accent)' : 'var(--si)', opacity: last ? 0.95 : 0.55 }));
          stackSvg.append(T(xOf(r.val) + 8, by + barH / 2 + 4, fx(r.val, Number.isInteger(r.val) ? 0 : 1) + ' µm', { 'font-family': 'var(--mono)' }));
          if (r.delta != null) stackSvg.append(T(W - 8, ty, '−' + fx(r.delta, Number.isInteger(r.delta) ? 0 : 1) + ' µm', { 'text-anchor': 'end', 'font-family': 'var(--mono)', fill: r.warn ? 'var(--warn)' : 'var(--muted)', 'font-weight': r.warn ? 700 : 400 }));
        });
        const fy = 10 + rows.length * rowH + (wide ? 6 : 12), fxo = wide ? 15 : 8;
        stackSvg.setAttribute('viewBox', `0 0 ${W} ${fy}`);
      }

      // ---------- numbers ----------
      function derive() {
        const pitchMM = (st.raw + st.kerf) / 1000;
        const gross = Math.floor(st.body / pitchMM), shipped = Math.floor(gross * SHIP_YIELD);
        const kerfPct = st.kerf / (st.raw + st.kerf) * 100;
        const kerfKg = Math.PI * Math.pow(DIA_MM / 20, 2) * (st.kerf / 10000) * RHO * gross / 1000; // r in cm, kerf µm -> cm
        const ddg = st.raw - FINAL_UM - (ETCH + DSP + CMP);
        return { pitchMM, gross, shipped, kerfPct, kerfKg, kerfValue: kerfKg * EG_PRICE_PER_KG, ddg, ddgWarn: ddg < DDG_LO - 0.5 || ddg > DDG_HI + 0.5 };
      }
      function update() {
        st.body = +bodyS.value; st.raw = +rawS.value; st.kerf = +kerfS.value;
        bodyO.textContent = fx(st.body, 0) + ' mm'; rawO.textContent = fx(st.raw, 0) + ' µm'; kerfO.textContent = fx(st.kerf, 0) + ' µm';
        const d = derive();
        stPitch.textContent = fx(d.pitchMM, 2) + ' mm';
        insight.textContent = 'Every wire makes a wafer and a waste slot. At this pitch, ' + fx(d.gross, 0) + ' gross slices become about ' + fx(d.shipped, 0) + ' shipped wafers after the model’s 3% discard allowance.';
        stCount.textContent = fx(d.shipped, 0) + ' (' + fx(d.gross, 0) + ')';
        stKerfPct.textContent = fx(d.kerfPct, 1) + ' %';
        stKerfMass.textContent = fx(d.kerfKg, 1) + ' kg (~$' + fx(d.kerfValue, 0) + ')';
        buildSaw(d); drawIngot(d); drawStack(d); lastMM = -1; applyFrame();
        const perBlock = Math.round(BLOCK_MM / d.pitchMM);
        sawNote.textContent = `Schematic: ${frontView.n} of the ~${perBlock} wire strands that span one 330 mm block are drawn, with the pitch exaggerated ~${Math.round(frontView.exag / 5) * 5}× (slab : kerf width ratio exact), and the front roller is drawn see-through so the cut is visible. The wire runs forward several hundred metres, back slightly less, forward again (pilgrim mode) so each length cuts many times; one pass through the 300 mm block takes ~${fx(DIA_MM / FEED / 60, 1)} h at ${FEED} mm/min and frees ~${perBlock} slices at once.`;
        warn.hidden = !d.ddgWarn;
        warn.textContent = d.ddgWarn ? `As-cut ${st.raw} µm leaves ${fx(d.ddg, 1)} µm for the double-disk grind, outside its 60–80 µm recipe window: ${d.ddg < DDG_LO ? 'too thin to take off 5–30 µm of saw damage plus 10–20 µm of TTV from both faces with margin' : 'too thick, so grinding time and wheel wear rise and the extra silicon was paid for as ingot'}. A wafer maker would move the as-cut target, not the grind recipe.` : '';
      }
      function syncPlay() { playBtn.textContent = st.playing ? 'Pause' : 'Play'; playBtn.setAttribute('aria-pressed', st.playing ? 'true' : 'false'); }
      function applyFrame() {
        sideView.apply(); frontView.apply();
        const mm = Math.round(st.cut * DIA_MM);
        if (mm !== lastMM) { lastMM = mm; prog.textContent = `cut depth ${mm} of 300 mm · ~${fx(mm / FEED / 60, 1)} h into the pass at ${FEED} mm/min`; }
      }

      // ---------- layout ----------
      function relayout() {
        const cw = sawSvg.getBoundingClientRect().width || (el.clientWidth - 36) || 724;
        const m = cw >= 600 ? 'wide' : 'narrow';
        const fs = m === 'wide' ? 12 : Math.min(14, Math.max(12, Math.round(11.5 * 340 / cw * 2) / 2));
        if (m === mode && fs === FS) return;
        mode = m; FS = fs; LH = fs + 3; update();
      }

      // ---------- animation ----------
      let raf = 0, last = 0, visible = true, pendingRO = 0;
      function tick(now) {
        raf = 0; if (!st.playing || !visible) return;
        if (!last) last = now;
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        st.cut += dt * 0.02; if (st.cut > CUT_MAX) st.cut = CUT_MIN;
        st.pil += dt; if (st.pil >= 4.5) st.pil -= 4.5; st.dir = st.pil < 2.7 ? 1 : -1;
        st.phase += dt * 70 * st.dir;
        applyFrame();
        raf = requestAnimationFrame(tick);
      }
      function ensureLoop() { if (!raf && st.playing && visible) { last = 0; raf = requestAnimationFrame(tick); } }

      [bodyS, rawS, kerfS].forEach(s => s.addEventListener('input', update));
      playBtn.addEventListener('click', () => { st.playing = !st.playing; syncPlay(); ensureLoop(); });
      const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) ensureLoop(); });
      io.observe(el);
      const ro = new ResizeObserver(() => { if (!pendingRO) pendingRO = requestAnimationFrame(() => { pendingRO = 0; relayout(); }); });
      ro.observe(el);
      relayout(); syncPlay(); ensureLoop();
      return () => { cancelAnimationFrame(raf); cancelAnimationFrame(pendingRO); raf = 0; st.playing = false; io.disconnect(); ro.disconnect(); };
    }
  });
})();
