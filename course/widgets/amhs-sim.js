/* Widget: amhs-sim — "Wafers in Motion: the AMHS" (Module 05) */
(function () {
  'use strict';
  const T_E = 1;             // h, mean process time per lot at one tool (module worked example)
  const RPT_DAYS = 18;       // raw process time of the whole flow (~20% of a 90-day cycle time)
  const STEPS = 1200;        // tool visits per lot
  const LOT = 25;            // wafers per FOUP
  const DPM = 30.4;          // days per month
  const DELIVERY_MIN = 5;    // minutes per OHT delivery cycle (pickup, transport, drop, reposition)
  const HOT_V = 1.5;         // variability term with hot lots on: c_a² = 2 → (2 + 1)/2 (illustrative)
  const HOIST_S = 1.1;       // s, hoist animation
  const LAP_S = 16;          // s per lap of the loop
  const MIN_GAP = 20;        // px, minimum spacing between vehicles on the rail (no overtaking)
  const SHELF_MAX = 30;      // FOUP slots per STB shelf: the Kingman queue overflows it above u ≈ 96–97 %
  const PITCH = 12;          // px, shelf slot pitch (9 px FOUP squares)
  const BAYS = [
    { name: 'Litho', sub: 'EUV + DUV scanners, tracks', short: 'scanners, tracks' },
    { name: 'Etch', sub: 'plasma etch cluster tools', short: 'plasma etchers' },
    { name: 'Deposition', sub: 'CVD / ALD / PVD clusters', short: 'CVD / ALD / PVD' },
    { name: 'CMP', sub: 'polishers + post-CMP clean', short: 'polishers' },
    { name: 'Implant', sub: 'ion implanters + anneal', short: 'implanters' },
    { name: 'Metrology', sub: 'CD-SEM, overlay, inspection', short: 'CD-SEM, inspect' },
  ];
  const ease = t => t * t * (3 - 2 * t);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Closed OHT loop = rounded rectangle; distances along it are measured clockwise from the top-left corner.
  function makeLoop(x0, y0, x1, y1, r) {
    const Lw = x1 - x0 - 2 * r, Lh = y1 - y0 - 2 * r, q = Math.PI * r / 2;
    const arc = (cx, cy, deg) => { const a = deg * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    const segs = [
      { len: Lw, at: t => [x0 + r + t * Lw, y0] }, { len: q, at: t => arc(x1 - r, y0 + r, -90 + 90 * t) },
      { len: Lh, at: t => [x1, y0 + r + t * Lh] }, { len: q, at: t => arc(x1 - r, y1 - r, 90 * t) },
      { len: Lw, at: t => [x1 - r - t * Lw, y1] }, { len: q, at: t => arc(x0 + r, y1 - r, 90 + 90 * t) },
      { len: Lh, at: t => [x0, y1 - r - t * Lh] }, { len: q, at: t => arc(x0 + r, y0 + r, 180 + 90 * t) },
    ];
    const total = 2 * Lw + 2 * Lh + 4 * q;
    function pointAt(d) {
      d = ((d % total) + total) % total;
      for (const s of segs) { if (d <= s.len) return s.at(s.len ? d / s.len : 0); d -= s.len; }
      return segs[0].at(0);
    }
    const path = `M${x0 + r},${y0} H${x1 - r} A${r},${r} 0 0 1 ${x1},${y0 + r} V${y1 - r} A${r},${r} 0 0 1 ${x1 - r},${y1} H${x0 + r} A${r},${r} 0 0 1 ${x0},${y1 - r} V${y0 + r} A${r},${r} 0 0 1 ${x0 + r},${y0} Z`;
    return {
      total, pointAt, path,
      dTop: cx => cx - (x0 + r), dRight: cy => Lw + q + (cy - (y0 + r)),
      dBottom: cx => Lw + 2 * q + Lh + ((x1 - r) - cx), dLeft: cy => 2 * Lw + 3 * q + Lh + ((y1 - r) - cy),
    };
  }

  // Bay geometry, in CSS pixels. dir = direction from the bay toward the rail; tools line the rail-facing
  // edge and the side-track-buffer (STB) shelf sits between tools and rail. Every tool gets its own rail
  // stop (t.d = distance along the loop) directly in front of its load port, so a hoist is always
  // perpendicular to the rail; bay.d (bay centre) is only used to order the bays around the loop.
  // The shelf always holds SHELF_MAX slots (15x2, 10x3, 5x6 or 3x10 depending on the room), so the
  // overflow badge fires at the same utilization at every width.
  function bayBox(b, x, y, w, h, dir, loop, cols) {
    const bay = Object.assign({}, b, { x, y, w, h, dir, tools: [] });
    const rows = SHELF_MAX / cols, shelfH = rows * PITCH + 10;
    if (dir === 'down' || dir === 'up') {
      const GAP = 12, TW = clamp(Math.floor((w - 20 - 2 * GAP) / 3), 36, 64), TH = 48, down = dir === 'down';
      const tx0 = x + (w - 3 * TW - 2 * GAP) / 2, ty = down ? y + 52 : y + 26 + shelfH;
      for (let k = 0; k < 3; k++) {
        const tx = tx0 + k * (TW + GAP), px = tx + TW / 2;
        bay.tools.push({ x: tx, y: ty, w: TW, h: TH, port: { x: px, y: down ? ty + TH : ty }, d: down ? loop.dTop(px) : loop.dBottom(px) });
      }
      bay.shelf = { x: x + 8, y: down ? y + 114 : y + 12, w: w - 16, h: shelfH, cols, rows };
      bay.badge = [x + w / 2 + (TW + GAP) / 2 - 18, bay.shelf.y + (shelfH - 16) / 2];   // between ports 2 and 3, clear of any hoist belt
      const ty0 = down ? y : ty + TH - 2;
      bay.textY = [ty0 + 16, ty0 + 31, ty0 + 46]; bay.textX = x + 8;
      bay.label = w >= 190 ? b.sub : b.short; bay.qLabel = 'STB queue ';
      bay.d = down ? loop.dTop(x + w / 2) : loop.dBottom(x + w / 2);
    } else {
      const GAP = 8, TH = 42, sw = cols * PITCH + 6, TW = clamp(w - 22 - sw, 40, 72), right = dir === 'right';
      const tx = right ? x + 8 : x + w - 8 - TW;
      for (let k = 0; k < 3; k++) {
        const ty = y + 54 + k * (TH + GAP), py = ty + TH / 2;
        bay.tools.push({ x: tx, y: ty, w: TW, h: TH, port: { x: right ? tx + TW : tx, y: py }, d: right ? loop.dLeft(py) : loop.dRight(py) });
      }
      bay.shelf = { x: right ? tx + TW + 8 : tx - 8 - sw, y: y + 54 + (142 - shelfH) / 2, w: sw, h: shelfH, cols, rows };
      bay.badge = [bay.shelf.x + (sw - 36) / 2, y + 142];   // between ports 2 and 3, clear of any hoist belt
      bay.textY = [y + 16, y + 31, y + 46]; bay.textX = x + 8;
      bay.label = b.short; bay.qLabel = w >= 150 ? 'STB queue ' : 'queue ';
      bay.d = right ? loop.dLeft(bay.tools[1].y + TH / 2) : loop.dRight(bay.tools[1].y + TH / 2);
    }
    return bay;
  }
  // Layout is computed for the rendered pixel width w (viewBox width == CSS width), so 11 px text renders at 11 px.
  function layout(w) {
    const narrow = w < 460, L = { narrow, vw: w, bays: [] };
    if (!narrow) {
      const M = 6, G = 10, bw = (w - 2 * M - 2 * G) / 3;
      const cols = (bw - 20) / PITCH >= 15 ? 15 : 10, bh = 136 + (SHELF_MAX / cols) * PITCH;   // 160 for 2 shelf rows, 172 for 3
      const ly0 = 12 + bh + 18, ly1 = ly0 + 62, by = ly1 + 18;
      L.vh = by + bh + 12; L.loop = makeLoop(M, ly0, w - M, ly1, 18);
      const sw = Math.min(180, Math.round(w * 0.27)), sx = Math.round((w - sw) / 2);
      L.stocker = { x: sx, y: ly0 + 16, w: sw, h: 30, label: sw >= 165 ? 'Stocker (central WIP store)' : 'Stocker (WIP store)' };
      L.notes = [[M + 30, ly0 + 28, 'OHT rail loop (ceiling-hung):'], [M + 30, ly0 + 44, 'vehicles run clockwise, ≤5 m/s'],
        [sx + sw + 14, ly0 + 28, 'a belt hoist lowers each FOUP'], [sx + sw + 14, ly0 + 44, 'onto the tool’s load port']];
      L.noteRoom = [sx - (M + 30) - 8, (w - M - 30) - (sx + sw + 14)];
      BAYS.forEach((b, i) => L.bays.push(bayBox(b, M + (i % 3) * (bw + G), i < 3 ? 12 : by, bw, bh, i < 3 ? 'down' : 'up', L.loop, cols)));
    } else {
      const M = 4, G = 8, LW = 32, bw = (w - 2 * M - 2 * G - LW) / 2, lx = M + bw + G, cols = bw >= 160 ? 5 : 3;
      L.vh = 672; L.loop = makeLoop(lx, 12, lx + LW, 660, 16);
      L.stocker = { x: lx + 8, y: 246, w: 16, h: 180, vertical: true, label: 'Stocker (WIP store)' };
      L.notes = []; L.noteRoom = [0, 0];
      BAYS.forEach((b, i) => L.bays.push(bayBox(b, i < 3 ? M : lx + LW + G, 20 + (i % 3) * 214, bw, 204, i < 3 ? 'right' : 'left', L.loop, cols)));
    }
    L.order = L.bays.map((b, i) => i).sort((a, b) => L.bays[a].d - L.bays[b].d);
    return L;
  }

  window.registerWidget('amhs-sim', {
    title: 'Wafers in Motion: the AMHS',
    caption: 'Overhead-transport vehicles carry FOUPs between bays; raise tool utilization and watch the side-track-buffer queues grow, then explode, exactly as Kingman’s formula predicts.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const st = { playing: !reduced, wspm: 100000, u: 0.80, hot: false };
      let L = null, raf = 0, visible = true, last = 0, simT = 0, veh = [], cw = 330, dead = false;
      const toolState = BAYS.map(() => [0, 1, 2].map(() => ({ period: 5 + Math.random() * 5, phase: Math.random() })));
      const TXT = (x, y, size, fill, extra) => Object.assign({ x, y, 'font-size': size, 'font-family': 'var(--sans)', fill }, extra || {});

      // ---------- model ----------
      function model() {
        const u = st.u, V = st.hot ? HOT_V : 1;
        const W = u / (1 - u) * V * T_E, X = (T_E + W) / T_E, Lq = u * W / T_E;
        const ct = X * RPT_DAYS, perDay = st.wspm / DPM, wip = perDay * ct;
        const del = (st.wspm / LOT) * STEPS / (DPM * 24);
        return { u, V, W, X, Lq, ct, perDay, wip, del, busyVeh: del * DELIVERY_MIN / 60 };
      }

      // ---------- drawing (static parts rebuilt on layout change) ----------
      const D = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Top-down schematic of six fab bays around an OHT rail loop with FOUPs queueing at tools' });
      let gQueues = [], gVeh, gFoup;
      function drawStatic() {
        D.innerHTML = ''; D.setAttribute('viewBox', `0 0 ${L.vw} ${L.vh}`);
        L.bays.forEach((bay, i) => {
          D.append(svg('rect', { x: bay.x, y: bay.y, width: bay.w, height: bay.h, rx: 6, fill: 'var(--panel2)', 'fill-opacity': .55, stroke: 'var(--line2)' }));
          D.append(svg('text', TXT(bay.textX, bay.textY[0], 12, 'var(--ink)', { 'font-weight': 700 }), bay.name + ' bay'));
          D.append(svg('text', TXT(bay.textX, bay.textY[1], 11, 'var(--muted)'), bay.label));
          bay.qText = svg('text', TXT(bay.textX, bay.textY[2], 11, 'var(--accent)', { 'font-family': 'var(--mono)' }), '');
          D.append(bay.qText);
          bay.tools.forEach(t => {
            t.el = svg('rect', { x: t.x, y: t.y, width: t.w, height: t.h, rx: 3, fill: 'var(--panel)', stroke: 'var(--si)', 'stroke-width': 1.2 });
            const pw = (bay.dir === 'down' || bay.dir === 'up') ? [14, 5] : [5, 14];
            const port = svg('rect', { x: t.port.x - pw[0] / 2, y: t.port.y - pw[1] / 2, width: pw[0], height: pw[1], fill: 'var(--si)' });
            t.pf = svg('rect', { x: t.port.x - 4.5, y: t.port.y - 4.5, width: 9, height: 9, rx: 1.5, fill: 'var(--accent)', stroke: 'var(--ink)', 'stroke-width': .5, opacity: 0 });
            D.append(t.el, port, t.pf);
          });
          const s = bay.shelf;
          D.append(svg('rect', { x: s.x, y: s.y, width: s.w, height: s.h, rx: 3, fill: 'var(--ground)', stroke: 'var(--line2)', 'stroke-dasharray': '3 3' }));
          gQueues[i] = svg('g'); D.append(gQueues[i]);
        });
        D.append(svg('path', { d: L.loop.path, fill: 'none', stroke: 'var(--line2)', 'stroke-width': 7 }));
        D.append(svg('path', { d: L.loop.path, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.2, 'stroke-dasharray': '7 5' }));
        const sk = L.stocker;
        D.append(svg('rect', { x: sk.x, y: sk.y, width: sk.w, height: sk.h, rx: 3, fill: 'var(--si)', 'fill-opacity': .28, stroke: 'var(--si)' }));
        if (sk.vertical) D.append(svg('text', TXT(sk.x + sk.w / 2 + 4, sk.y + sk.h / 2, 11, 'var(--ink)', { 'text-anchor': 'middle', transform: `rotate(-90 ${sk.x + sk.w / 2 + 4} ${sk.y + sk.h / 2})` }), sk.label));
        else D.append(svg('text', TXT(sk.x + sk.w / 2, sk.y + sk.h / 2 + 4, 11, 'var(--ink)', { 'text-anchor': 'middle' }), sk.label));
        // rail notes only when they fit between the loop corner and the stocker (measured, not estimated)
        const notes = L.notes.map(([x, y, t]) => svg('text', TXT(x, y, 11, 'var(--muted)'), t));
        notes.forEach(n => D.append(n));
        if (notes.some((n, i) => n.getComputedTextLength() > L.noteRoom[i < 2 ? 0 : 1])) notes.forEach(n => n.remove());
        gVeh = svg('g'); gFoup = svg('g'); D.append(gVeh, gFoup);
        veh.forEach(v => attachVehicle(v));
        drawQueues(model()); renderVeh(); renderTools();
      }
      function attachVehicle(v) {
        v.el = svg('rect', { x: -7, y: -7, width: 14, height: 14, rx: 3, fill: 'var(--si)', stroke: v.hot ? 'var(--accent2)' : 'var(--ink)', 'stroke-width': v.hot ? 2 : .6 });
        v.fel = svg('rect', { width: 9, height: 9, rx: 1.5, fill: v.hot ? 'var(--accent2)' : 'var(--accent)', stroke: 'var(--ink)', 'stroke-width': .5 });
        v.bel = svg('line', { stroke: 'var(--si)', 'stroke-width': 1.5, 'stroke-dasharray': '2 2', opacity: 0 });
        gVeh.append(v.el); gFoup.append(v.bel, v.fel);
      }
      function drawQueues(m) {
        L.bays.forEach((bay, i) => {
          const g = gQueues[i], s = bay.shelf; g.innerHTML = '';
          const cap = s.cols * s.rows, full = Math.floor(m.Lq), frac = m.Lq - full;
          const ox = s.x + (s.w - s.cols * PITCH) / 2 + 1.5, oy = s.y + (s.h - s.rows * PITCH) / 2 + 1.5;
          const cell = n => [ox + (n % s.cols) * PITCH, oy + Math.floor(n / s.cols) * PITCH];
          for (let n = 0; n < Math.min(full, cap); n++) { const [x, y] = cell(n); g.append(svg('rect', { x, y, width: 9, height: 9, rx: 1.5, fill: 'var(--accent)', 'fill-opacity': .85 })); }
          if (full < cap && frac > 0.08) { const [x, y] = cell(full); g.append(svg('rect', { x, y, width: 9, height: 9, rx: 1.5, fill: 'var(--accent)', 'fill-opacity': .85 * frac })); }
          if (full > cap) {   // shelf full: the excess backs up into the stocker; the badge counts lots beyond the shelf
            const bw = 36, bh = 16, [bx, by] = bay.badge;
            g.append(svg('rect', { x: bx, y: by, width: bw, height: bh, rx: 3, fill: 'var(--panel)', stroke: 'var(--bad)', 'stroke-width': 1.2 }));
            g.append(svg('text', { x: bx + bw / 2, y: by + 12, 'font-size': 11, 'font-family': 'var(--mono)', 'font-weight': 700, fill: 'var(--bad)', 'text-anchor': 'middle' }, '+' + fmt(full - cap, 0)));
          }
          bay.qText.textContent = bay.qLabel + fmt(m.Lq, 1) + ' lots';
        });
      }
      function renderTools() {
        L.bays.forEach((bay, i) => bay.tools.forEach((t, k) => {
          const ts = toolState[i][k], busy = ((simT / ts.period + ts.phase) % 1) < st.u;
          t.el.setAttribute('fill', busy ? 'var(--ok)' : 'var(--panel)'); t.el.setAttribute('fill-opacity', busy ? .5 : 1);
          t.pf.setAttribute('opacity', busy ? 1 : 0);
        }));
      }
      function renderVeh() {
        veh.forEach(v => {
          const [x, y] = L.loop.pointAt(v.s * L.loop.total);
          v.el.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
          let fx = x, fy = y, show = v.carrying, hoisting = v.state === 'hoist';
          if (hoisting) {   // the vehicle sits at the tool's own rail stop, so the belt runs straight to the port
            const p = L.bays[v.target].tools[v.tool].port, k = ease(Math.min(1, v.t / HOIST_S)), u = v.carrying ? k : 1 - k;
            fx = x + (p.x - x) * u; fy = y + (p.y - y) * u; show = true;
            v.bel.setAttribute('x1', x.toFixed(1)); v.bel.setAttribute('y1', y.toFixed(1)); v.bel.setAttribute('x2', fx.toFixed(1)); v.bel.setAttribute('y2', fy.toFixed(1));
          }
          v.bel.setAttribute('opacity', hoisting ? 1 : 0);
          v.fel.setAttribute('opacity', show ? 1 : 0); v.fel.setAttribute('x', (fx - 4.5).toFixed(1)); v.fel.setAttribute('y', (fy - 4.5).toFixed(1));
        });
      }

      // ---------- vehicle simulation ----------
      const stopOf = v => L.bays[v.target].tools[v.tool].d;
      function nextBay(from) { const o = L.order, i = o.indexOf(from); return o[(i + 1 + Math.floor(Math.random() * 3)) % o.length]; }
      function initVehicles() {
        const n = Math.max(2, Math.min(12, Math.round(st.wspm / 12500)));
        if (gVeh) { gVeh.innerHTML = ''; gFoup.innerHTML = ''; }
        veh = [];
        for (let i = 0; i < n; i++) {
          const v = { s: i / n, carrying: i % 2 === 0, hot: st.hot && i === 0, state: 'move', t: 0, tool: Math.floor(Math.random() * 3), target: 0 };
          v.target = nextBay(L.order[Math.floor(v.s * 6) % 6]);
          veh.push(v); if (gVeh) attachVehicle(v);
        }
        for (let i = 0; i < 90; i++) { simT += 0.1; step(0.1); }
        renderVeh(); renderTools();
      }
      function step(dt) {
        const tot = L.loop.total, ds = dt / LAP_S, gap = MIN_GAP / tot;
        for (const v of veh) {
          if (v.state === 'move') {
            const s0 = v.s, pd = stopOf(v) / tot, ahead = ((pd - s0) % 1 + 1) % 1;
            let nearest = 1;   // distance to the vehicle in front: no overtaking, queue behind a hoisting vehicle
            for (const o of veh) { if (o !== v) { const g = ((o.s - s0) % 1 + 1) % 1; if (g > 0 && g < nearest) nearest = g; } }
            const move = Math.min(ds, Math.max(0, nearest - gap));
            if (ahead <= move) { v.s = pd; v.state = 'hoist'; v.t = 0; }
            else v.s = (s0 + move) % 1;
          } else {
            v.t += dt;
            if (v.t >= HOIST_S) { v.carrying = !v.carrying; v.state = 'move'; v.s = (v.s + 0.002) % 1; v.target = nextBay(v.target); v.tool = Math.floor(Math.random() * 3); }
          }
        }
      }
      function frame(ts) {
        raf = 0;
        if (!st.playing || !visible) return;
        const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts;
        simT += dt; step(dt); renderVeh(); renderTools();
        raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && st.playing && visible) { last = 0; raf = requestAnimationFrame(frame); } }

      // ---------- controls ----------
      const playBtn = h('button', { class: 'w-btn', 'aria-pressed': String(st.playing), on: { click: () => { st.playing = !st.playing; playBtn.textContent = st.playing ? 'Pause' : 'Play'; playBtn.setAttribute('aria-pressed', String(st.playing)); if (st.playing) start(); } } }, st.playing ? 'Pause' : 'Play');
      const hotBtn = h('button', { class: 'w-btn', 'aria-pressed': 'false', on: { click: () => { st.hot = !st.hot; hotBtn.textContent = 'Hot lots: ' + (st.hot ? 'on' : 'off'); hotBtn.classList.toggle('primary', st.hot); hotBtn.setAttribute('aria-pressed', String(st.hot)); initVehicles(); update(); } } }, 'Hot lots: off');
      const wspmIn = h('input', { type: 'range', min: 20000, max: 150000, step: 5000, value: st.wspm }), wspmOut = h('output');
      const uIn = h('input', { type: 'range', min: 60, max: 98, step: 1, value: 80 }), uOut = h('output');
      const controls = h('div', { class: 'w-controls' },
        h('div', null, playBtn, ' ', hotBtn),
        h('label', { class: 'w-ctl' }, h('span', null, 'Wafer starts'), wspmIn, wspmOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Tool utilization'), uIn, uOut));
      const legend = h('div', { class: 'w-legend' },
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--si)' } }), 'OHT vehicle'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent)' } }), 'FOUP (one lot, 25 wafers)'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent2)' } }), 'hot lot'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--ok)', opacity: .6 } }), 'tool processing a lot'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--panel)', border: '1px solid var(--si)' } }), 'tool idle'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--ground)', border: '1px dashed var(--line2)' } }), 'STB shelf (queue, ' + SHELF_MAX + ' slots)'));

      // ---------- readouts, chart, formula ----------
      const S = {}; ['W', 'Lq', 'X', 'ct', 'wip', 'del'].forEach(k => S[k] = h('b'));
      const ctLabel = h('span', null, 'cycle time (X × 18 d raw process time)');
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, S.W, h('span', null, 'mean wait per tool visit')),
        h('div', { class: 'w-stat' }, S.Lq, h('span', null, 'average queue per tool (lots on the STB shelf)')),
        h('div', { class: 'w-stat' }, S.X, h('span', null, 'X-factor = cycle time ÷ raw process time')),
        h('div', { class: 'w-stat' }, S.ct, ctLabel),
        h('div', { class: 'w-stat' }, S.wip, h('span', null, 'WIP in the fab (Little’s law)')),
        h('div', { class: 'w-stat' }, S.del, h('span', null, 'lot deliveries per hour → OHT vehicles busy')));
      const CH = svg('svg', { class: 'w-svg', viewBox: '0 0 330 200', role: 'img', 'aria-label': 'Operating curve: X-factor versus tool utilization' });
      function drawChart(m) {
        CH.innerHTML = ''; CH.setAttribute('viewBox', `0 0 ${cw} 200`);
        const X0 = 40, X1 = cw - 12, Y0 = 22, Y1 = 160, UMIN = 0.5, XMAX = 60;
        const xOf = u => X0 + (u - UMIN) / (1 - UMIN) * (X1 - X0), yOf = X => Y1 - Math.min(X, XMAX) / XMAX * (Y1 - Y0);
        [0, 20, 40, 60].forEach(v => { const y = yOf(v); CH.append(svg('line', { x1: X0, y1: y, x2: X1, y2: y, stroke: 'var(--line)' })); CH.append(svg('text', TXT(X0 - 6, y + 4, 11, 'var(--muted)', { 'text-anchor': 'end', 'font-family': 'var(--mono)' }), v)); });
        [50, 60, 70, 80, 90, 100].forEach(p => CH.append(svg('text', TXT(xOf(p / 100), Y1 + 15, 11, 'var(--muted)', { 'text-anchor': 'middle', 'font-family': 'var(--mono)' }), p)));
        CH.append(svg('text', TXT(11, (Y0 + Y1) / 2, 11, 'var(--muted)', { 'text-anchor': 'middle', transform: `rotate(-90 11 ${(Y0 + Y1) / 2})` }), 'X-factor'));
        CH.append(svg('line', { x1: xOf(1), y1: Y0, x2: xOf(1), y2: Y1, stroke: 'var(--bad)', 'stroke-dasharray': '3 3' }));
        const ax = xOf(1) - 7, ay = (Y0 + Y1) / 2;
        CH.append(svg('text', TXT(ax, ay, 11, 'var(--bad)', { 'text-anchor': 'middle', transform: `rotate(-90 ${ax} ${ay})` }), 'u → 100%: queue → ∞'));
        const curve = (V, color, width, op) => {
          const pts = [];
          for (let u = UMIN; u < 0.999; u += 0.004) { const X = 1 + u / (1 - u) * V; if (X > XMAX) break; pts.push(xOf(u).toFixed(1) + ',' + yOf(X).toFixed(1)); }
          CH.append(svg('polyline', { points: pts.join(' '), fill: 'none', stroke: color, 'stroke-width': width, opacity: op }));
        };
        curve(1, 'var(--si)', st.hot ? 1.5 : 2.5, st.hot ? .45 : 1);
        if (st.hot) curve(HOT_V, 'var(--accent2)', 2.5, 1);
        const px = xOf(m.u), py = yOf(m.X), label = `X = ${fmt(m.X, 1)} at u = ${Math.round(m.u * 100)}%${m.X > XMAX ? ' (off scale)' : ''}`;
        const lw = 6.6 * label.length, lx = clamp(px, X0 + lw / 2 + 2, X1 - 22 - lw / 2), ly = py < Y0 + 24 ? py + 18 : py - 10;
        CH.append(svg('circle', { cx: px, cy: py, r: 5, fill: st.hot ? 'var(--accent2)' : 'var(--accent)', stroke: 'var(--panel)', 'stroke-width': 1.5 }));
        CH.append(svg('text', TXT(lx, ly, 11, 'var(--ink)', { 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-weight': 600 }), label));
        CH.append(svg('text', TXT(X0, 12, 11, 'var(--ink)'), 'Operating curve: X = 1 + u/(1−u)·V'));
        CH.append(svg('text', TXT((X0 + X1) / 2, 193, 11, 'var(--ink)', { 'text-anchor': 'middle' }), 'tool utilization u (%)'));
      }
      const verdict = h('div', { class: 'w-note', style: { marginTop: '4px' } });
      const chartCol = h('div', null, CH, verdict);
      const formula = h('div', { class: 'w-formula' });
      const hotNote = h('div', { class: 'w-note', style: { color: 'var(--accent2)' } });

      function update() {
        st.wspm = +wspmIn.value; st.u = +uIn.value / 100;
        wspmOut.textContent = fmt(st.wspm, 0) + ' wspm'; uOut.textContent = Math.round(st.u * 100) + ' %';
        const m = model();
        S.W.textContent = fmt(m.W, 1) + ' h'; S.Lq.textContent = fmt(m.Lq, 1) + ' lots'; S.X.textContent = fmt(m.X, 1) + '×';
        S.ct.textContent = fmt(m.ct, 0) + ' days'; S.wip.textContent = fmt(m.wip, 0) + ' wafers';
        S.del.textContent = fmt(m.del, 0) + ' /h → ' + fmt(m.busyVeh, 0);
        ctLabel.textContent = st.hot ? 'cycle time of a normal lot (hot lot ≈ 40–60% of it)' : 'cycle time (X × 18 d raw process time)';
        S.Lq.style.color = S.X.style.color = st.u >= 0.94 ? 'var(--bad)' : st.u >= 0.88 ? 'var(--warn)' : '';
        formula.innerHTML = `Kingman (approx., one tool): W ≈ [u/(1−u)]·[(c<sub>a</sub>² + c<sub>e</sub>²)/2]·t<sub>e</sub> = ${fmt(m.u / (1 - m.u), 1)} × ${fmt(m.V, 1)} × 1 h = <b>${fmt(m.W, 1)} h</b> &nbsp;·&nbsp; X = (t<sub>e</sub> + W)/t<sub>e</sub> = <b>${fmt(m.X, 1)}</b> &nbsp;·&nbsp; queue L<sub>q</sub> = u·W/t<sub>e</sub> = <b>${fmt(m.Lq, 1)} lots</b><br>Fab: cycle time ≈ X × RPT = ${fmt(m.X, 1)} × 18 d = <b>${fmt(m.ct, 0)} d</b> &nbsp;·&nbsp; Little’s law: WIP = starts/day × cycle time = ${fmt(m.perDay, 0)} × ${fmt(m.ct, 0)} = <b>${fmt(m.wip, 0)} wafers</b> (${fmt(m.wip / LOT, 0)} FOUPs)<br>AMHS: deliveries/h = (wspm/25) × ${fmt(STEPS, 0)} steps / (30.4 × 24 h) = <b>${fmt(m.del, 0)}</b>; vehicles busy = deliveries/h × 5 min / 60 = <b>${fmt(m.busyVeh, 0)}</b>`;
        const u = st.u;
        verdict.textContent = u < 0.66 ? `u = ${Math.round(u * 100)}%: the wait is only ~${fmt(u / (1 - u), 1)} process times and lots flow freely, but a $200 M scanner idle ${Math.round((1 - u) * 100)}% of the time is depreciation nobody recovers.`
          : u < 0.78 ? `u = ${Math.round(u * 100)}%: comfortable for non-bottleneck tools; a burst of arrivals clears in a few process times.`
          : u < 0.88 ? `u = ${Math.round(u * 100)}%: the typical target for expensive non-bottleneck tools — u/(1−u) ≈ ${fmt(u / (1 - u), 1)}, so each lot waits ~${fmt(m.W, 0)} h for 1 h of processing.`
          : u < 0.94 ? `u = ${Math.round(u * 100)}%: bottleneck territory — u/(1−u) ≈ ${fmt(u / (1 - u), 0)}. Only the scanner fleet is run here, to amortize its price.`
          : `u = ${Math.round(u * 100)}%: queues explode — u/(1−u) = ${fmt(u / (1 - u), 0)}. With ${Math.round((1 - u) * 100)}% slack a burst drains ${Math.round(1 / (1 - u))}× slower than it formed, and the next burst arrives first${m.Lq > SHELF_MAX ? '; the ' + SHELF_MAX + '-slot STB shelves overflow (+N) and the excess backs up into the stocker' : ''}. No fab can run its whole line here — which is the point.`;
        hotNote.textContent = st.hot ? 'Hot lots on: the violet lot jumps every queue (its own cycle time ≈ 40–60% of normal) but its preemptions make arrivals burstier for everyone else — modelled here as cₐ² = 2, so V = 1.5 and every other lot waits 1.5× longer.' : '';
        hotNote.hidden = !st.hot;
        if (L) { drawQueues(m); renderTools(); }   // the tools' busy fraction tracks the slider even while paused
        drawChart(m);
      }
      wspmIn.addEventListener('input', () => { update(); initVehicles(); });
      uIn.addEventListener('input', update);

      el.append(controls, D, legend,
        h('div', { class: 'w-note' }, 'Top view of six bays. In each bay three tools (green = processing a lot, outlined = idle) face the rail through their load ports; lots waiting for a tool sit on the side-track-buffer (STB) shelf beside the rail. The drawn queue is the Kingman average for this utilization; an amber square is one FOUP of 25 wafers. Vehicles run clockwise, stop in line with a load port and lower or lift the FOUP with a belt hoist, and queue behind a vehicle that is hoisting (in the drawing the rail runs beside the STB shelf; in the fab it runs directly over the load ports, so the hoist is a vertical drop of several metres). A GigaFab fleet is 1,000–3,000 vehicles on tens of kilometres of rail; only a handful are drawn.'),
        h('div', { class: 'w-grid2' }, readout, chartCol),
        formula, hotNote,
        h('div', { class: 'w-note' }, 'Assumptions, as in the module’s worked example: every tool family runs at the same utilization with tₑ = 1 h per lot and fully random arrivals and processing (cₐ = cₑ = 1, so V = 1); raw process time 18 days for ~1,200 tool visits (~20% of a 90-day cycle time); 5 minutes per delivery cycle. Kingman’s formula is a single-server approximation: real fabs pull the whole curve down by pooling matched chambers behind one queue and by driving variability well below 1, which is how they reach X ≈ 2–4 at 85–90% on the scanners.'));

      // ---------- responsive layout: viewBox width == rendered CSS width, so 11 px labels render at 11 px ----------
      function relayout(w) {
        w = Math.round(w);
        if (dead || !w || w < 240 || (L && Math.abs(w - L.vw) < 2)) return;
        L = layout(w);
        veh.forEach(v => { if (v.state === 'hoist') v.s = stopOf(v) / L.loop.total; });   // keep a hoisting vehicle at its stop
        drawStatic();
        if (!veh.length) initVehicles();
      }
      function resizeChart(w) { w = Math.round(w); if (dead || !w || w < 200 || Math.abs(w - cw) < 2) return; cw = w; drawChart(model()); }
      relayout(D.getBoundingClientRect().width || 700);
      resizeChart(CH.getBoundingClientRect().width || 330);
      update();
      let roRaf = 0, pendW = 0, pendC = 0;
      const ro = new ResizeObserver(es => {
        for (const e of es) { if (e.target === el) pendW = e.contentRect.width; else pendC = e.contentRect.width; }
        if (!roRaf) roRaf = requestAnimationFrame(() => { roRaf = 0; if (pendW) relayout(pendW); if (pendC) resizeChart(pendC); pendW = pendC = 0; });
      });
      ro.observe(el); ro.observe(chartCol);
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); });
      io.observe(el);
      start();
      return () => { dead = true; if (raf) cancelAnimationFrame(raf); raf = 0; if (roRaf) cancelAnimationFrame(roRaf); st.playing = false; io.disconnect(); ro.disconnect(); };
    }
  });
})();
