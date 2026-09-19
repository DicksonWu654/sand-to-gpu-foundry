/* transistor-evolution — Planar → FinFET → Nanosheet → CFET (Module 11) */
(function () {
  'use strict';
  let uid = 0;
  const ARCH = [
    { id: 'planar', name: 'Planar', sides: 1, sidesTxt: '1 side (top only)',
      plain: 'The channel is a flat strip at the silicon surface and the gate sits on top of it, so the gate controls the channel from one side only; the drain’s field can creep in underneath.',
      hvm: 'Every node down to 28/22 nm; last leading-edge planar: Intel 32 nm (2010), TSMC 28 nm high-k / metal gate (2011)',
      dims: 'Gate length L_g ≈ 30 nm at the 28 nm node; equivalent oxide thickness (EOT) ≈ 1 nm; depletion depth t_dep ≈ 30–50 nm',
      why: 'Bulk body: λ ≈ √(3·t_ox·t_dep) ≈ 8–10 nm, so L_g cannot drop below ≈ 5λ ≈ 45 nm without runaway drain-induced barrier lowering (DIBL, the drain switching the channel on by itself) and off-state leakage I_off. Production planar squeezed to L_g ≈ 30 nm only by accepting DIBL ≈ 100 mV/V, propped up with halo implants; then it stalled.',
      levers: 'Strained silicon (2003), high-k / metal gate (2007), then nothing left but a new shape' },
    { id: 'finfet', name: 'FinFET', sides: 3, sidesTxt: '3 sides (both sidewalls + top, “tri-gate”)',
      plain: 'The channel is turned on its side into a thin fin standing out of the oxide, so the gate can grip it from three sides (both sidewalls and the top).',
      hvm: 'Intel 22 nm tri-gate, 2011 (Ivy Bridge); TSMC N16 / Samsung 14 nm, 2015',
      dims: 'Fin ≈ 6–8 nm wide × 34–55 nm tall; fin pitch 60 → 26 nm; L_g ≈ 16–20 nm',
      why: 'Fin width replaces the depletion depth in the scale length: λ ≈ √(1.5·t_Si·t_ox) ≈ 3 nm, so L_g ≈ 16 nm is safe. The fin is fully depleted and undoped, so there is no random-dopant scatter in the threshold voltage V_T.',
      levers: 'Taller fins (effective width W_eff = 2H + W per footprint); fin depopulation 4 → 2 → 1.5 fins per device; then the 1-fin floor' },
    { id: 'gaa', name: 'Nanosheet (GAA)', sides: 4, sidesTxt: '4 sides (gate wraps every sheet)',
      plain: 'The fin is sliced into a stack of thin horizontal ribbons and the gate metal flows all the way around each one: four-sided control, and the ribbon width is set by lithography instead of by a whole number of fins.',
      hvm: 'Samsung 3GAE, June 2022; TSMC N2, Q4 2025; Intel 18A RibbonFET + PowerVia, 2025',
      dims: '3 sheets (Intel: 4) ≈ 5–7 nm thick × 15–50 nm wide, spaced ≈ 10–13 nm; L_g ≈ 12–14 nm',
      why: 'Four-sided gating: λ ≈ √(0.75·t_Si·t_ox) < 2 nm, subthreshold swing ≈ 65 mV/dec at L_g ≈ 12 nm. Width is set by lithography again, not by an integer number of fins.',
      levers: 'Sheet width per cell (NanoFlex / MBCFET), dipole V_T tuning, backside power (18A, A16)' },
    { id: 'cfet', name: 'CFET', sides: 4, sidesTxt: '4 sides, nFET stacked on pFET under one gate',
      plain: 'An nFET ribbon stack is built on top of a pFET stack under one shared gate, so the two halves of every logic cell share one footprint instead of sitting side by side. One gate voltage turns one tier on and the other off.',
      hvm: 'Research: Intel and TSMC inverters at IEDM 2023–24; imec roadmap ≈ A7 node, 2030–2032',
      dims: 'n sheets over p sheets with a middle isolation; superlattice ≈ 150–250 nm tall; 3–4 track cells',
      why: 'Contacted poly pitch (CPP, the gate-to-gate spacing) has hit its floor (≈ 45 nm) and metal pitch is stuck near 23 nm, so the last geometric density lever is cell height: stacking n over p collapses it ≈ 1.5–2×.',
      levers: 'Monolithic (one tall stack, 15–20:1 fin etch) vs sequential (bonded top tier, < 500 °C); needs backside power' },
  ];
  const EPS = 11.7 / 3.9, T_OX = 0.9, T_SHEET = 5.5, FIN_W = 7, FIN_H = 50, T_DEP = 30;
  const lambda = a => a.id === 'planar' ? Math.sqrt(EPS * T_OX * T_DEP) : a.id === 'finfet' ? Math.sqrt(EPS / 2 * FIN_W * T_OX) : Math.sqrt(EPS / 4 * T_SHEET * T_OX);
  const VW = 420, VH = 330, FS = 14, LH = 16;
  const SI = 'var(--si)', G = 'var(--accent2)', HK = 'var(--accent)', NSD = 'var(--ok)', PSD = 'var(--warn)', DIEL = 'var(--line2)', CU = 'var(--cu)', INK = 'var(--ink)';

  window.registerWidget('transistor-evolution', {
    title: 'Planar → FinFET → Nanosheet → CFET',
    caption: 'Pick an architecture, then switch between its cross-section and 3D cutaway. Follow how the gate wraps the channel; the bright inversion layer appears when the gate is on.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const st = { arch: ARCH[1], bspr: false, w: 30, playing: !reduced };
      const id = 'te' + (++uid);
      const anim = { n: [], p: [], dots: [], bar: null, txt: null, state: null, state2: null, cur: 1 };
      let raf = 0, visible = true, last = 0, phase = 0.25, dotN = 0, dotP = 0.5;

      // ---------- text helpers ----------
      const text = (g, x, y, s, o) => {
        o = o || {};
        const t = svg('text', { x, y, 'font-size': o.fs || FS, 'font-family': o.mono ? 'var(--mono)' : 'var(--sans)', fill: o.fill || INK,
          'text-anchor': o.anchor || 'start', 'font-weight': o.w || 500, transform: o.rot ? `rotate(${o.rot} ${x} ${y})` : null,
          'paint-order': 'stroke', stroke: 'var(--panel)', 'stroke-width': o.halo === false ? 0 : 3, 'stroke-linejoin': 'round' }, s);
        g.append(t); return t;
      };
      function wrap(t, max) {
        const out = []; let cur = '';
        t.split(' ').forEach(wd => { if (cur && (cur + ' ' + wd).length > max) { out.push(cur); cur = wd; } else cur = cur ? cur + ' ' + wd : wd; });
        if (cur) out.push(cur); return out;
      }
      const leader = (g, ax, ay, bx, by) => {
        g.append(svg('line', { x1: ax, y1: ay, x2: bx, y2: by, stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-dasharray': '3 2' }));
        g.append(svg('circle', { cx: ax, cy: ay, r: 2.2, fill: 'var(--muted)' }));
      };
      // label placed at (tx, ty) with a leader to (ax, ay); anchor: start|end|middle
      function place(g, ax, ay, tx, ty, s, o) {
        o = o || {}; const lines = wrap(s, o.max || 40), anchor = o.anchor || 'start';
        const ex = anchor === 'end' ? tx + 3 : anchor === 'middle' ? tx : tx - 3;
        leader(g, ax, ay, ex, o.leadY == null ? ty - 4 : o.leadY);
        lines.forEach((l, i) => text(g, tx, ty + i * LH, l, { anchor, fill: o.fill }));
      }
      // right-hand column of leadered labels (sorted, non-overlapping)
      function column(g, items, colX, max, top, bottom) {
        const s = items.filter(Boolean).map(it => Object.assign({ lines: wrap(it.t, max) }, it)).sort((a, b) => a.y - b.y);
        let y = top;
        s.forEach(it => { it.ly = Math.max(y, it.y); y = it.ly + LH * it.lines.length + 6; });
        const over = s.length ? s[s.length - 1].ly + LH * (s[s.length - 1].lines.length - 1) - bottom : 0;
        if (over > 0) { let prev = -1e9; s.forEach(it => { it.ly = Math.max(prev, it.ly - over); prev = it.ly + LH * it.lines.length + 6; }); }
        s.forEach(it => {
          leader(g, it.x, it.y, colX - 4, it.ly);
          it.lines.forEach((l, i) => text(g, colX, it.ly + 4 + i * LH, l, { fill: it.fill }));
        });
      }
      const hatchDefs = (g, name) => g.append(svg('defs', null, svg('pattern', { id: `${id}-${name}`, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
        svg('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-opacity': .55 }))));

      // ---------- isometric engine ----------
      const XL = 120, ZD = 70, ZC = 36, T = 28, GX0 = 44, XCUT = 60, GX1 = 76, GZ0 = 10, GZ1 = 62, SX1 = 22, DX0 = 98;
      let S = 1, OX = 0, OY = 0;
      const P = (x, y, z) => [OX + (x - z) * 0.866 * S, OY + ((x + z) * 0.5 - y) * S];
      const pstr = a => a.map(p => { const q = P(p[0], p[1], p[2]); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ');
      function fit(ymin, ymax, rx, ry, rw, rh) {
        const bw = (XL + ZD) * 0.866, bh = (XL + ZD) * 0.5 + (ymax - ymin);
        S = Math.min(rw / bw, rh / bh);
        OX = rx + ZD * 0.866 * S + (rw - bw * S) / 2;
        OY = ry + ymax * S + (rh - bh * S) / 2;
      }
      // prism along x between x0..x1 with a convex (y,z) ring; draws the visible faces, shaded
      function prism(g, x0, x1, ring, fill, o) {
        o = o || {};
        const cy = ring.reduce((s, p) => s + p[0], 0) / ring.length, cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
        const face = (pts, shade) => {
          const pl = svg('polygon', { points: pstr(pts), fill, 'fill-opacity': o.op == null ? 1 : o.op, stroke: o.stroke || 'var(--panel)', 'stroke-width': 0.7, 'stroke-linejoin': 'round' }); g.append(pl);
          if (o.hatch) g.append(svg('polygon', { points: pstr(pts), fill: `url(#${id}-hatch)` }));
          if (shade > 0) g.append(svg('polygon', { points: pstr(pts), fill: 'var(--ground)', 'fill-opacity': shade }));
          return pl;
        };
        const n = ring.length;
        for (let i = 0; i < n; i++) {
          const a = ring[i], b = ring[(i + 1) % n];
          let ny = -(b[1] - a[1]), nz = b[0] - a[0];
          if (ny * ((a[0] + b[0]) / 2 - cy) + nz * ((a[1] + b[1]) / 2 - cz) < 0) { ny = -ny; nz = -nz; }
          const len = Math.hypot(ny, nz) || 1; ny /= len; nz /= len;
          if (ny + nz <= 0.02) continue;
          face([[x0, a[0], a[1]], [x1, a[0], a[1]], [x1, b[0], b[1]], [x0, b[0], b[1]]], 0.3 * (1 - ny));
        }
        return face(ring.map(p => [x1, p[0], p[1]]), 0.42);
      }
      const box = (g, x0, x1, y0, y1, z0, z1, fill, o) => prism(g, x0, x1, [[y0, z0], [y0, z1], [y1, z1], [y1, z0]], fill, o);
      const hex = (yb, yt, hw) => [[yb, ZC - 4], [yb, ZC + 4], [yb + 6, ZC + hw], [yt - 5, ZC + hw], [yt, ZC], [yt - 5, ZC - hw], [yb + 6, ZC - hw]];
      const poly = (g, pts, attrs) => { const p = svg('polygon', Object.assign({ points: pstr(pts) }, attrs)); g.append(p); return p; };
      const pline = (g, pts, attrs) => { const p = svg('polyline', Object.assign({ points: pstr(pts), fill: 'none', 'stroke-linejoin': 'round' }, attrs)); g.append(p); return p; };
      // a channel segment (fin or sheet) with an animated highlight on its top face
      function channelSeg(g, x0, x1, y0, y1, hw, tier) {
        box(g, x0, x1, y0, y1, ZC - hw, ZC + hw, SI);
        const hl = poly(g, [[x0, y1, ZC - hw], [x1, y1, ZC - hw], [x1, y1, ZC + hw], [x0, y1, ZC + hw]], { fill: INK, 'fill-opacity': .55 });
        (tier === 'p' ? anim.p : anim.n).push(hl);
      }
      // section of a channel through the cut face at x = XCUT: high-k ring, silicon, inversion band
      function section(g, y0, y1, hw, wrapBottom, tier) {
        const o = 1.6, ring = [[XCUT, y0 - (wrapBottom ? o : 0), ZC - hw - o], [XCUT, y1 + o, ZC - hw - o], [XCUT, y1 + o, ZC + hw + o], [XCUT, y0 - (wrapBottom ? o : 0), ZC + hw + o]];
        if (wrapBottom) poly(g, ring, { fill: 'none', stroke: HK, 'stroke-width': 1.6 }); else pline(g, ring, { stroke: HK, 'stroke-width': 1.6 });
        poly(g, [[XCUT, y0, ZC - hw], [XCUT, y0, ZC + hw], [XCUT, y1, ZC + hw], [XCUT, y1, ZC - hw]], { fill: SI });
        const i = 1.3, inv = [[XCUT, y0 + (wrapBottom ? i : 0), ZC - hw + i], [XCUT, y1 - i, ZC - hw + i], [XCUT, y1 - i, ZC + hw - i], [XCUT, y0 + (wrapBottom ? i : 0), ZC + hw - i]];
        const e = wrapBottom ? poly(g, inv, { fill: 'none', stroke: INK, 'stroke-width': 2.4 }) : pline(g, inv, { stroke: INK, 'stroke-width': 2.6 });
        (tier === 'p' ? anim.p : anim.n).push(e);
      }
      function addDots(g, n, y, hw, x0, x1, hide, tier) {
        for (let k = 0; k < n; k++) {
          const c = svg('circle', { r: 2.4, fill: INK, stroke: 'var(--panel)', 'stroke-width': 0.8 }); g.append(c);
          anim.dots.push({ el: c, x0, x1, y, z: ZC + (k % 2 ? -hw * .45 : hw * .45), hide, off: k / n, tier });
        }
      }
      function placeDots() {
        const v = anim.cur;
        anim.dots.forEach(d => {
          const t = ((d.tier === 'p' ? dotP : dotN) + d.off) % 1, x = d.x0 + t * (d.x1 - d.x0);
          const hidden = x > d.hide[0] && x < d.hide[1];
          const [px, py] = P(x, d.y, d.z);
          d.el.setAttribute('cx', px.toFixed(1)); d.el.setAttribute('cy', py.toFixed(1));
          d.el.setAttribute('opacity', hidden ? 0 : (d.tier === 'p' ? 1 - v : v).toFixed(2));
        });
      }

      function isoView() {
        const a = st.arch, g = svg('svg', { class: 'w-svg', viewBox: `0 0 ${VW} ${VH}`, role: 'img', 'aria-label': 'Cut-away 3D sketch of the transistor' });
        hatchDefs(g, 'hatch');
        anim.dots = [];
        const bspr = st.bspr && a.id !== 'planar';
        const sub0 = bspr ? 11 : 0, ymin = bspr ? 2 : 0;
        const col = [], colX = 258, max = 12;
        const rot = 30;
        // --- base (same in every view) ---
        const base = ymax => {
          fit(ymin, ymax, 4, 12, 246, 258);
          if (bspr) box(g, 0, XL, 2, sub0, 0, ZD, CU);
          box(g, 0, XL, sub0, 16, 0, ZD, SI);
          box(g, 0, XL, 16, T, 0, ZD, DIEL, { hatch: true });
          // labels written along the front faces
          const f = (y, s) => { const [x, yy] = P(6, y, ZD); text(g, x, yy, s, { rot }); };
          const sti = P(18, 20.5, ZD); place(g, sti[0], sti[1], 10, 282, 'STI: shallow-trench isolation oxide');
          if (bspr) { f(5, 'backside Cu power rail'); text(g, P(6, 12.5, ZD)[0], P(6, 12.5, ZD)[1], 'thinned Si', { rot, fs: 12.5 }); }
          else { const sub = P(60, 6, ZD); place(g, sub[0], sub[1], 10, 303, a.id === 'planar' ? 'p-type Si substrate' : 'Si substrate'); }
          if (bspr) {
            // nano-TSV pillar shown in section on the front face, plus a strap to the source epi
            poly(g, [[4, 11, ZD], [14, 11, ZD], [14, T + 3, ZD], [4, T + 3, ZD]], { fill: CU, stroke: 'var(--panel)', 'stroke-width': .7 });
            poly(g, [[4, T + 3, ZD - 10], [14, T + 3, ZD - 10], [14, T + 3, ZD], [4, T + 3, ZD]], { fill: CU, stroke: 'var(--panel)', 'stroke-width': .7 });
          }
        };
        const strap = () => { if (bspr) box(g, 6, 12, T, T + 3, ZC + 6, ZD - 8, CU); };
        const cutMark = () => poly(g, [[XCUT, T, GZ0], [GX1, T, GZ0], [GX1, T, GZ1], [XCUT, T, GZ1]], { fill: 'none', stroke: G, 'stroke-width': 1, 'stroke-dasharray': '3 2' });
        const tsvLabel = () => { if (bspr) { const q = P(9, 20, ZD); place(g, q[0], q[1], q[0] - 6, q[1] + 48, 'nano-TSV', { anchor: 'start', max: 12 }); } };

        if (a.id === 'planar') {
          base(T + 24);
          const aw = 18;
          poly(g, [[8, T, ZC - aw], [112, T, ZC - aw], [112, T, ZC + aw], [8, T, ZC + aw]], { fill: SI, stroke: 'var(--panel)', 'stroke-width': .7 });
          poly(g, [[8, T, ZC - aw], [GX0, T, ZC - aw], [GX0, T, ZC + aw], [8, T, ZC + aw]], { fill: NSD, stroke: 'var(--panel)', 'stroke-width': .7 });
          poly(g, [[GX1, T, ZC - aw], [112, T, ZC - aw], [112, T, ZC + aw], [GX1, T, ZC + aw]], { fill: NSD, stroke: 'var(--panel)', 'stroke-width': .7 });
          // exposed channel strip under the cut-away half of the gate
          const ch = poly(g, [[XCUT, T + .2, ZC - aw], [GX1, T + .2, ZC - aw], [GX1, T + .2, ZC + aw], [XCUT, T + .2, ZC + aw]], { fill: INK, 'fill-opacity': .6, stroke: INK, 'stroke-width': 1, 'stroke-dasharray': '3 2' });
          anim.n.push(ch);
          box(g, GX0, XCUT, T, T + 1.6, ZC - 24, ZC + 24, HK);
          box(g, GX0, XCUT, T + 1.6, T + 24, ZC - 24, ZC + 24, G);
          cutMark();
          addDots(g, 6, T + 1.2, aw, 10, 110, [GX0 - 1, XCUT], 'n');
          const gt = P(52, T + 24, ZC); text(g, gt[0], gt[1] + 5, 'gate', { anchor: 'middle' });
          const sp = P(26, T, ZC - aw); place(g, sp[0], sp[1], sp[0] - 8, sp[1] - 34, 'source (n+)', { anchor: 'middle' });
          col.push({ x: P(XCUT, T + .8, ZC + 24)[0], y: P(XCUT, T + .8, ZC + 24)[1], t: 'gate oxide, ≈ 1 nm' });
          col.push({ x: P(68, T, ZC + aw)[0], y: P(68, T, ZC + aw)[1], t: 'channel: gated from the top only' });
          col.push({ x: P(112, T, ZC)[0], y: P(112, T, ZC)[1], t: 'drain (n+)' });
        } else {
          const fin = a.id === 'finfet', cf = a.id === 'cfet', FH = 32;
          const hw = fin ? 5 : Math.max(4, st.w * 0.5) / 1;
          const sheets = fin ? [] : cf ? [[T + 6, T + 11, 'p'], [T + 19, T + 24, 'p'], [T + 44, T + 49, 'n'], [T + 57, T + 62, 'n']] : [[T + 5, T + 10, 'n'], [T + 18, T + 23, 'n'], [T + 31, T + 36, 'n']];
          const GT = fin ? T + FH + 12 : cf ? T + 70 : T + 46;
          base(GT);
          // source epi
          if (cf) { prism(g, 0, SX1, hex(T + 2, T + 28, hw + 6), PSD); prism(g, 0, SX1, hex(T + 40, T + 66, hw + 6), NSD); }
          else prism(g, 0, SX1, hex(T + 1, fin ? T + FH + 4 : T + 40, hw + 7), NSD);
          strap();
          // stack, source side of the gate
          if (fin) channelSeg(g, SX1, GX0 - 4, T, T + FH, hw, 'n');
          else {
            box(g, SX1, DX0, T, T + 3, ZC - hw - 3, ZC + hw + 3, DIEL, { hatch: true });
            sheets.forEach(s => channelSeg(g, SX1, GX0 - 4, s[0], s[1], hw, s[2]));
            if (cf) box(g, SX1, GX0 - 4, T + 30, T + 38, ZC - hw - 3, ZC + hw + 3, DIEL, { hatch: true });
          }
          box(g, GX0 - 4, GX0, T, GT, GZ0, GZ1, DIEL, { hatch: true });   // gate spacer
          box(g, GX0, XCUT, T, GT, GZ0, GZ1, G);                          // gate (source half; +x face = cut)
          if (fin) section(g, T, T + FH, hw, false, 'n');
          else sheets.forEach(s => section(g, s[0], s[1], hw, true, s[2]));
          if (cf) poly(g, [[XCUT, T + 30, ZC - hw - 3], [XCUT, T + 30, ZC + hw + 3], [XCUT, T + 38, ZC + hw + 3], [XCUT, T + 38, ZC - hw - 3]], { fill: DIEL });
          cutMark();
          // stack, drain side (gate cut away)
          if (fin) channelSeg(g, XCUT, DX0, T, T + FH, hw, 'n');
          else {
            sheets.forEach(s => channelSeg(g, XCUT, DX0, s[0], s[1], hw, s[2]));
            if (cf) box(g, XCUT, DX0, T + 30, T + 38, ZC - hw - 3, ZC + hw + 3, DIEL, { hatch: true });
            // inner spacers plug the gaps between sheets at the gate edge
            const gaps = cf ? [[T + 3, T + 6], [T + 11, T + 19], [T + 24, T + 30], [T + 38, T + 44], [T + 49, T + 57]] : [[T + 3, T + 5], [T + 10, T + 18], [T + 23, T + 31]];
            gaps.forEach(gp => box(g, GX1, GX1 + 6, gp[0], gp[1], ZC - hw, ZC + hw, DIEL, { hatch: true }));
          }
          // drain epi
          if (cf) { prism(g, DX0, XL, hex(T + 2, T + 28, hw + 6), PSD); prism(g, DX0, XL, hex(T + 40, T + 66, hw + 6), NSD); }
          else prism(g, DX0, XL, hex(T + 1, fin ? T + FH + 4 : T + 40, hw + 7), NSD);
          // carriers
          if (fin) addDots(g, 6, T + FH + 1.5, hw, SX1, DX0, [GX0 - 4, XCUT], 'n');
          else sheets.forEach(s => addDots(g, 2, s[1] + 1.5, hw, SX1, DX0, [GX0 - 4, XCUT], s[2]));
          // labels
          const gt = P(52, GT, 36); text(g, gt[0], gt[1] + 5, cf ? 'shared gate' : 'gate', { anchor: 'middle' });
          const sp = P(GX0 - 2, GT, GZ0 + 4); place(g, sp[0], sp[1], 12, 34, 'gate spacer', { anchor: 'start' });
          const se = fin ? P(11, T + FH + 4, ZC) : P(11, cf ? T + 66 : T + 40, ZC);
          place(g, se[0], se[1], 12, 58, cf ? 'nFET source' : 'source epi', { anchor: 'start' });
          if (cf) { const pe = P(6, T + 15, ZC + hw + 6); place(g, pe[0], pe[1], pe[0] - 14, pe[1] + 42, 'pFET source', { anchor: 'middle' }); }
          const yTop = fin ? T + FH : sheets[sheets.length - 1][1];
          col.push({ x: P(XCUT, yTop - 4, ZC + hw)[0], y: P(XCUT, yTop - 4, ZC + hw)[1], t: fin ? 'gate wraps 3 sides' : 'gate wraps all 4 sides' });
          col.push({ x: P(86, yTop, ZC + hw)[0], y: P(86, yTop, ZC + hw)[1], t: fin ? 'fin 7 × 50 nm' : (cf ? '2 + 2 sheets, 5 × ' : '3 sheets, 5 × ') + st.w + ' nm' });
          if (!fin) col.push({ x: P(GX1 + 6, cf ? T + 15 : T + 14, ZC + hw)[0], y: P(GX1 + 6, cf ? T + 15 : T + 14, ZC + hw)[1], t: 'inner spacer' });
          if (cf) {
            col.push({ x: P(DX0 - 8, T + 34, ZC + hw + 3)[0], y: P(DX0 - 8, T + 34, ZC + hw + 3)[1], t: 'middle isolation' });
            col.push({ x: P(XL, T + 53, ZC)[0], y: P(XL, T + 53, ZC)[1], t: 'nFET drain (Si:P)' });
            col.push({ x: P(XL, T + 15, ZC)[0], y: P(XL, T + 15, ZC)[1], t: 'pFET drain (SiGe:B)' });
          } else col.push({ x: P(XL, fin ? T + 18 : T + 20, ZC)[0], y: P(XL, fin ? T + 18 : T + 20, ZC)[1], t: 'drain epi' });
          if (!fin) col.push({ x: P(DX0 - 10, T + 1.5, ZC + hw + 3)[0], y: P(DX0 - 10, T + 1.5, ZC + hw + 3)[1], t: 'bottom isolation' });
        }
        tsvLabel();
        column(g, col, colX, max, 14, VH - 30);
        text(g, 6, VH - 6, 'Dashed: removed gate half. Not to scale.', { fill: 'var(--muted)' });
        return g;
      }

      // ---------- cross-section perpendicular to the channel ----------
      function xsView() {
        const a = st.arch, W = st.w, bspr = st.bspr && a.id !== 'planar';
        const g = svg('svg', { class: 'w-svg', viewBox: `0 0 ${VW} ${VH}`, role: 'img', 'aria-label': 'Cross-section perpendicular to the channel' });
        hatchDefs(g, 'hatch2');
        const col = [], colX = 238, max = 14;
        const R = (x, y, w, hh, fill, extra) => { const r = svg('rect', Object.assign({ x, y, width: w, height: hh, fill }, extra || {})); g.append(r); return r; };
        const diel = (x, y, w, hh) => { R(x, y, w, hh, DIEL, { stroke: 'var(--muted)', 'stroke-width': 1 }); R(x, y, w, hh, `url(#${id}-hatch2)`); };
        // V_G meter
        g.append(svg('rect', { x: 14, y: 70, width: 16, height: 100, fill: 'none', stroke: 'var(--muted)' }));
        anim.bar = R(15, 169, 14, 0, HK);
        text(g, 22, 60, 'V_G', { anchor: 'middle', mono: true, fill: 'var(--muted)', halo: false });
        anim.txt = text(g, 4, 188, '0.70 V', { anchor: 'start', mono: true, halo: false });
        anim.state = text(g, 22, 206, 'ON', { anchor: 'middle', w: 700, fill: NSD, halo: false });
        anim.state2 = a.id === 'cfet' ? text(g, 22, 224, 'pFET OFF', { anchor: 'middle', w: 700, fill: 'var(--bad)', halo: false }) : null;
        const X0 = 48, X1 = 226, xc = 137;
        const subY = 205;
        const substrate = (y0, y1, label) => { R(X0, y0, X1 - X0, y1 - y0, SI, { 'fill-opacity': .65, stroke: 'var(--muted)', 'stroke-width': 1 }); if (label) text(g, X0 + 8, y0 + 18, label); };
        if (a.id === 'planar') {
          substrate(151, 262, null); text(g, X0 + 8, 250, 'p-type Si substrate');
          diel(X0, 151, 84 - X0, 34); diel(190, 151, X1 - 190, 34);
          text(g, X0 + 6, 172, 'STI', { fs: 13 }); text(g, 196, 172, 'STI', { fs: 13 });
          R(86, 151, 102, 40, 'none', { stroke: 'var(--muted)', 'stroke-dasharray': '3 3' });
          col.push({ x: 188, y: 180, t: 'depletion region, t_dep ≈ 30 nm: the drain’s field spreads here' });
          R(84, 146, 106, 5, HK); col.push({ x: 190, y: 148.5, t: 'gate oxide, ≈ 1 nm EOT' });
          R(84, 96, 106, 50, G); text(g, xc, 126, 'gate', { anchor: 'middle' });
          anim.n.push(R(85, 151, 104, 4, INK)); col.push({ x: 189, y: 153, t: 'inversion layer (1 side only)' });
        } else {
          substrate(subY, bspr ? subY + 12 : 262, bspr ? null : 'Si substrate');
          if (bspr) { text(g, X0 + 8, subY + 10, 'thinned Si', { fs: 12.5 }); R(X0, subY + 16, X1 - X0, 20, CU); text(g, X0 + 8, subY + 30, 'backside Cu power rail'); }
          diel(X0, 170, X1 - X0, 35); text(g, X0 + 8, 191, 'STI oxide');
          if (bspr) { R(X0 + 12, 170, 12, subY + 16 - 170, CU, { 'fill-opacity': .55, stroke: 'var(--muted)', 'stroke-dasharray': '3 2' }); col.push({ x: X0 + 24, y: 176, t: 'nano-TSV (behind this plane)' }); }
          if (a.id === 'finfet') {
            R(xc - 64, 40, 128, 130, G); text(g, xc, 56, 'gate metal (W / TiN)', { anchor: 'middle' });
            R(xc - 8, 60, 16, 155, SI); col.push({ x: xc + 8, y: 125, t: 'fin, 7 × 50 nm' });
            g.append(svg('path', { d: `M${xc - 9.5},170 V58.5 H${xc + 9.5} V170`, fill: 'none', stroke: HK, 'stroke-width': 1.8 })); col.push({ x: xc + 9.5, y: 92, t: 'high-k HfO₂, ≈ 1.5 nm' });
            const p = svg('path', { d: `M${xc - 6.2},170 V62 H${xc + 6.2} V170`, fill: 'none', stroke: INK, 'stroke-width': 3.6, 'stroke-linejoin': 'round' }); g.append(p); anim.n.push(p);
            col.push({ x: xc + 3, y: 63, t: 'inversion layer on 3 sides' });
          } else {
            const cf = a.id === 'cfet', gTop = cf ? 34 : 54, gx = xc - W - 26, gw = 2 * W + 52;
            R(gx, gTop, gw, 170 - gTop, G); text(g, xc, gTop + 15, cf ? 'one shared gate' : 'gate metal fills the gaps', { anchor: 'middle', fs: cf ? FS : 13 });
            diel(xc - W - 4, 158, 2 * W + 8, 10); col.push({ x: xc + W + 4, y: 163, t: 'bottom isolation' });
            const ys = cf ? [[145, 'p'], [124, 'p'], [79, 'n'], [58, 'n']] : [[142, 'n'], [112, 'n'], [82, 'n']], sh = cf ? 9 : 10;
            if (cf) { diel(xc - W - 4, 100, 2 * W + 8, 16); col.push({ x: xc + W + 4, y: 108, t: 'middle isolation' }); }
            ys.forEach(([y, tier], i) => {
              R(xc - W, y, 2 * W, sh, SI);
              R(xc - W - 1.5, y - 1.5, 2 * W + 3, sh + 3, 'none', { stroke: HK, 'stroke-width': 1.6 });
              const e = R(xc - W + 1.6, y + 1.6, 2 * W - 3.2, sh - 3.2, 'none', { stroke: INK, 'stroke-width': 2.6 });
              (tier === 'p' ? anim.p : anim.n).push(e);
            });
            if (cf) {
              col.push({ x: xc + W, y: 62, t: 'nFET sheets (top): ON when V_G is high' });
              col.push({ x: xc + W, y: 149, t: 'pFET sheets (bottom): ON when V_G is low' });
              col.push({ x: xc + W + 1.5, y: 128, t: 'high-k + inversion on 4 sides' });
            } else {
              col.push({ x: xc + W, y: 87, t: 'Si sheet, 5 × ' + W + ' nm' });
              col.push({ x: xc + W + 1.5, y: 117, t: 'high-k around all 4 sides' });
              col.push({ x: xc + W - 2, y: 144, t: 'inversion layer on 4 sides' });
              col.push({ x: xc + W + 8, y: 102, t: 'gap ≈ 10 nm: gate metal + HfO₂' });
            }
          }
        }
        column(g, col, colX, max, 14, VH - 30);
        text(g, 6, VH - 22, 'Section perpendicular to channel.', { fill: 'var(--muted)' });
        text(g, 6, VH - 6, 'Source and drain are in front of / behind this plane.', { fill: 'var(--muted)' });
        return g;
      }

      // ---------- animation ----------
      function applyV(v) {
        anim.cur = v;
        anim.n.forEach(e => e.setAttribute('opacity', v.toFixed(3)));
        anim.p.forEach(e => e.setAttribute('opacity', (1 - v).toFixed(3)));
        if (!anim.bar) return;
        anim.bar.setAttribute('height', (100 * v).toFixed(1)); anim.bar.setAttribute('y', (169 - 100 * v).toFixed(1));
        anim.txt.textContent = (0.7 * v).toFixed(2) + ' V';
        const on = v > 0.5;
        if (anim.state2) {
          anim.state.textContent = on ? 'nFET ON' : 'nFET OFF'; anim.state.setAttribute('fill', on ? NSD : 'var(--bad)');
          anim.state2.textContent = on ? 'pFET OFF' : 'pFET ON'; anim.state2.setAttribute('fill', on ? 'var(--bad)' : NSD);
        } else { anim.state.textContent = on ? 'ON' : 'OFF'; anim.state.setAttribute('fill', on ? NSD : 'var(--bad)'); }
      }
      function frame(ts) {
        raf = 0;
        if (!st.playing || !visible) return;
        const dt = last ? Math.min(ts - last, 100) : 0; last = ts;
        phase += dt / 3200;
        const v = 1 / (1 + Math.exp(-10 * Math.sin(phase * 2 * Math.PI)));
        dotN = (dotN + dt / 1800 * v) % 1; dotP = (dotP + dt / 1800 * (1 - v)) % 1;
        applyV(v); placeDots();
        raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && st.playing && visible) { last = 0; raf = requestAnimationFrame(frame); } }
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); });
      io.observe(el);

      // ---------- DOM ----------
      const seg = h('div', { class: 'w-step-nav', role: 'tablist' });
      const plain = h('div', { class: 'w-note', style: { margin: '8px 0 2px', color: 'var(--ink)', fontSize: '13px' } });
      const bsprIn = h('input', { type: 'checkbox', on: { change: () => { st.bspr = bsprIn.checked; render(); } } });
      const bsprOut = h('output');
      const setPlay = () => { playBtn.textContent = st.playing ? 'Pause' : 'Animate gate'; playBtn.setAttribute('aria-pressed', st.playing); };
      const playBtn = h('button', { class: 'w-btn', on: { click: () => { st.playing = !st.playing; setPlay(); if (st.playing) start(); } } }, 'Animate gate');
      const flipBtn = h('button', { class: 'w-btn', on: { click: () => { st.playing = false; setPlay(); applyV(anim.cur > 0.5 ? 0 : 1); placeDots(); } } }, 'Flip gate ON/OFF');
      const wIn = h('input', { type: 'range', min: 15, max: 50, step: 1, value: st.w, on: { input: () => { st.w = +wIn.value; render(); } } });
      const wOut = h('output');
      const wCtl = h('label', { class: 'w-ctl' }, h('span', null, 'Sheet width'), wIn, wOut);
      const bsprCtl = h('label', { class: 'w-ctl', style: { minWidth: '200px', flex: '0 0 auto' } }, h('span', null, 'Backside power rail'), bsprIn, bsprOut);
      const controls = h('div', { class: 'w-controls' }, bsprCtl, wCtl, h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, playBtn, flipBtn));
      const grid = h('div', { class: 'w-grid2 w-studio', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 310px), 1fr))' } });
      let selectedView = 'section';
      const viewButtons = h('div', { class: 'w-step-nav', 'aria-label': 'Transistor drawing view' });
      const showView = () => {
        [...grid.children].forEach((p, i) => p.hidden = selectedView === 'section' ? i === 0 : i === 1);
        [...viewButtons.children].forEach(b => { const on = b.dataset.view === selectedView; b.classList.toggle('primary', on); b.setAttribute('aria-pressed', on); });
      };
      for (const [id, label] of [['section', 'Cross-section'], ['three-d', '3D cutaway']]) viewButtons.append(h('button', { class: 'w-btn', 'data-view': id, on: { click: () => { selectedView = id; showView(); } } }, label));
      grid.style.gridTemplateColumns = 'minmax(0, 1fr)'; grid.style.maxWidth = '580px'; grid.style.margin = '0 auto'; grid.style.width = '100%';
      const readout = h('div', { class: 'w-readout' });
      const table = h('table');
      const legend = h('div', { class: 'w-legend' }, ...[[SI, 'silicon channel / body'], [G, 'gate metal'], [HK, 'high-k gate oxide'], [INK, 'inversion layer, carriers'], [NSD, 'nFET S/D epi (Si:P)'], [PSD, 'pFET S/D epi (SiGe:B)'], [DIEL, 'STI / isolation / spacers'], [CU, 'backside Cu rail, nano-TSV']]
        .map(([c, t]) => h('span', { class: 'w-legend-item' }, h('i', { style: { background: c, border: '1px solid var(--muted)' } }), t)));
      const formula = h('div', { class: 'w-formula' });
      plain.classList.add('w-insight');
      el.append(seg, viewButtons, grid, plain, h('div', { class: 'w-console' }, controls), readout,
        h('div', { class: 'w-note' }, 'Cutaway schematics emphasize how the gate surrounds the channel; dimensions are illustrative. The scale-length calculation uses the assumptions in the reference below.'),
        h('details', { class: 'w-reference' }, h('summary', null, 'Architecture reference, materials & model'), legend, table, formula, h('div', { class: 'w-note' }, 'Scale lengths follow Frank–Taur–Wong: λ_planar ≈ √(ε_Si/ε_ox · t_ox · t_dep), λ_DG ≈ √(ε_Si/2ε_ox · t_Si · t_ox), λ_GAA ≈ √(ε_Si/4ε_ox · d · t_ox), with t_ox = 0.9 nm EOT and L_g ≥ 5–6 λ. Effective width W_eff is the gated perimeter: 2H + W = 107 nm per fin, 2(w + t) per sheet; the GAA drive comparison is against a two-fin FinFET (214 nm). Epi = epitaxial crystal regrown on the channel ends; STI = shallow-trench isolation oxide between devices.')));

      function render() {
        seg.innerHTML = '';
        ARCH.forEach(a => seg.append(h('button', { class: 'w-btn' + (a === st.arch ? ' primary' : ''), role: 'tab', 'aria-selected': a === st.arch, on: { click: () => { st.arch = a; render(); } } }, a.name)));
        const a = st.arch, gaa = a.id === 'gaa' || a.id === 'cfet', planar = a.id === 'planar';
        plain.innerHTML = ''; plain.append(h('b', null, a.name + ': '), a.plain);
        wCtl.hidden = !gaa; wOut.textContent = st.w + ' nm';
        bsprIn.disabled = planar; bsprCtl.style.opacity = planar ? .6 : 1;
        bsprOut.textContent = planar ? 'n/a: arrived with 18A / A16' : (st.bspr ? 'on' : 'off');
        bsprCtl.title = planar ? 'Backside power delivery (Intel PowerVia on 18A, TSMC Super Power Rail on A16) arrived in 2025–26, long after the planar era.' : '';
        anim.n = []; anim.p = [];
        grid.innerHTML = '';
        grid.append(h('div', null, h('div', { class: 'w-step-title' }, '3D sketch (gate cut open)'), isoView()), h('div', null, h('div', { class: 'w-step-title' }, 'Cross-section through the gate'), xsView()));
        showView();
        const lam = lambda(a);
        const stat = (v, l) => h('div', { class: 'w-stat' }, h('b', null, v), h('span', null, l));
        readout.innerHTML = '';
        readout.append(stat(a.sides, 'gated sides'), stat(fmt(lam, 1) + ' nm', 'scale length λ'), stat('≈ ' + fmt(5 * lam, 0) + '–' + fmt(6 * lam, 0) + ' nm', 'minimum L_g (5–6 λ)'));
        if (a.id === 'finfet') readout.append(stat('107 nm', 'W_eff per fin = 2H + W = 2·50 + 7'));
        if (gaa) {
          const n = a.id === 'cfet' ? 2 : 3, weff = n * 2 * (st.w + T_SHEET);
          readout.append(stat(fmt(weff, 0) + ' nm', `W_eff per ${n}-sheet stack = ${n}·2(w + t)`), stat('×' + (weff / 214).toFixed(2), 'drive vs 2-fin FinFET (214 nm)'), stat((weff / 107).toFixed(2) + ' fins', 'fin-equivalent (fins only come in integers)'));
        }
        table.innerHTML = '';
        [['First HVM', a.hvm], ['Gate control', a.sidesTxt], ['Typical dimensions', a.dims], ['Why it was needed', a.why], ['Scaling levers', a.levers]].forEach(([k, v]) => table.append(h('tr', null, h('th', { style: { width: '28%', minWidth: '84px' } }, k), h('td', null, v))));
        formula.innerHTML = planar ? 'λ ≈ √(ε<sub>Si</sub>/ε<sub>ox</sub> · t<sub>ox</sub> · t<sub>dep</sub>) = √(3.0 × 0.9 × 30) ≈ 9.0 nm' : a.id === 'finfet' ? 'λ ≈ √(ε<sub>Si</sub>/2ε<sub>ox</sub> · t<sub>Si</sub> · t<sub>ox</sub>) = √(1.5 × 7 × 0.9) ≈ 3.1 nm' : 'λ ≈ √(ε<sub>Si</sub>/4ε<sub>ox</sub> · d · t<sub>ox</sub>) = √(0.75 × 5.5 × 0.9) ≈ 1.9 nm';
        applyV(anim.cur); placeDots();
        setPlay(); start();
      }
      render();
      return () => { if (raf) cancelAnimationFrame(raf); raf = 0; st.playing = false; io.disconnect(); };
    }
  });
})();
