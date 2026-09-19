/* Widget: damascene — "Dual Damascene, Step by Step" (Module 12) */
(function () {
  'use strict';

  const STEPS = [
    { t: 'Cap the previous level', d: 'The freshly polished copper below is sealed with a thin PECVD SiCN cap (or an AlN/AlOx bilayer). It stops copper diffusion, acts as the etch stop for the via etch above it, and is the main path along which electromigration atoms move.', tool: 'Applied Producer (PECVD)' },
    { t: 'Low-k deposition', d: 'Porous carbon-doped oxide (SiOC:H, k ≈ 2.4–2.7) is deposited as the inter-level dielectric, ≈ 80–150 nm thick, by PECVD with a sacrificial porogen later cured out by UV.', tool: 'Applied Producer (Black Diamond)' },
    { t: 'Hard masks', d: 'A thin TEOS oxide plus a TiN metal hard mask go on top. Low-k is too fragile to pattern with resist alone over a long etch, so the trench pattern is "stored" in the hard mask.', tool: 'PVD chamber' },
    { t: 'Via litho + etch (via-first)', d: 'EUV (tight layers) or 193i litho defines the via; a fluorocarbon plasma etches down through the low-k and stops on the SiCN cap below, leaving the cap intact for now. (Drawn via-first for clarity; modern flows are trench-first: the trench is cut into the TiN first, so a via can only land inside a trench opening — a self-aligned via.)', tool: 'Lam Flex / TEL Vigus' },
    { t: 'Trench litho + etch', d: 'A second litho step opens the trench pattern in the hard mask; the trench is etched into the upper part of the low-k, self-aligned to the via already below it.', tool: 'Lam Flex / TEL Vigus' },
    { t: 'Cap open + clean', d: 'The SiCN cap at the via bottom is opened to expose the copper below. A wet or plasma clean removes fluorocarbon residue and copper oxide without over-etching the plasma-damaged low-k sidewalls.', tool: 'SCREEN / TEL single-wafer clean' },
    { t: 'TaN barrier + Co/Ru liner', d: 'In one vacuum cluster tool: a degas and pre-clean, then ≈ 1.5–2 nm TaN barrier (stops Cu diffusion) and ≈ 1–2 nm Co or Ru liner (lets copper wet and fill) coat every sidewall and the via bottom.', tool: 'Applied Endura' },
    { t: 'PVD Cu seed', d: 'A thin sputtered copper seed coats the liner so the wafer is conductive everywhere the plating bath will touch; a brief reflow lets the seed diffuse into the bottom of the via.', tool: 'Applied Endura' },
    { t: 'ECD superfill', d: 'Suppressor, accelerator and leveler additives in the acid-copper bath make the via and trench fill from the bottom up rather than pinching off at the top — the only reason damascene copper works at all.', tool: 'Lam SABRE Extreme / Max (Applied Raider alt.)' },
    { t: 'Anneal', d: 'A furnace or hotplate anneal (150–400 °C, N₂/H₂) forces the fine as-plated grains to recrystallize into larger, lower-resistance grains before CMP, and relaxes plating stress.', tool: 'Furnace / hotplate' },
    { t: 'CMP + new cap', d: 'A three-platen polish removes the copper overburden, then the barrier, leaving copper only in the trench and via; a new SiCN cap seals this level and the cycle repeats for the level above.', tool: 'Applied Reflexion LK Prime' },
  ];
  // physics (Module 12 worked example): 2 nm TaN + 1.5 nm Co per sidewall and on the bottom, p = 0, R = 0.32
  const TAN = 2, CO = 1.5, LAMBDA = 39, RHO0 = 1.68, R_GB = 0.32, C_PER_UM = 0.2;
  const MS = a => 1 / (1 - 1.5 * a + 3 * a * a - 3 * a * a * a * Math.log(1 + 1 / a));

  // ---------- cross-section geometry (viewBox units) ----------
  const VB_W = 360, VB_H = 300, DX0 = 8, DX1 = 190, LX = 199;
  const Y_SURF = 44, Y_TEOS = 51, Y_LK = 58, Y_TR = 112, Y_CAP = 178, Y_CAP1 = 186, Y_BOT = 238;
  const TR_X0 = 56, TR_X1 = 168, VIA_X0 = 100, VIA_X1 = 124, MN_CX = [46, 112, 178], MN_W = 28, MN_H = 38;
  const BAR = 3, LIN = 2, FILM = BAR + LIN, SEED = 3, OB = 14;

  window.registerWidget('damascene', {
    title: 'Dual Damascene, Step by Step',
    caption: 'Copper is difficult to pattern by conventional subtractive plasma etch, so advanced BEOL wiring is inlaid: etch the dielectric, line it, plate it full, then polish the excess back off. Step through one metal level; the cross-section runs along the new line, across the lines below.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const uid = 'dm' + Math.random().toString(36).slice(2, 7);
      let step = 0, fill = 0, raf = 0, visible = true, playing = false, last = 0;

      // ---------- step-through chrome ----------
      const counter = h('span', { class: 'count' });
      const prevBtn = h('button', { class: 'w-btn', type: 'button', on: { click: () => go(step - 1) } }, '← Prev');
      const nextBtn = h('button', { class: 'w-btn primary', type: 'button', on: { click: () => go(step + 1) } }, 'Next →');
      const dots = STEPS.map((s, i) => h('button', { class: 'w-step-dot', type: 'button', 'aria-label': 'Step ' + (i + 1) + ': ' + s.t, title: 'Step ' + (i + 1) + ': ' + s.t, on: { click: () => go(i), pointerenter: e => hoverDot(e.target, true), pointerleave: e => hoverDot(e.target, false) } }));
      const hoverDot = (d, on) => { d.style.outline = on ? '2px solid var(--accent)' : ''; d.style.outlineOffset = on ? '2px' : ''; };
      const nav = h('div', { class: 'w-step-nav' }, prevBtn, ...dots, nextBtn, counter);
      const title = h('div', { class: 'w-step-title' });
      const desc = h('div', { class: 'w-step-desc' });
      const toolLine = h('div', { class: 'w-note' });
      const stage = svg('svg', { class: 'w-svg', viewBox: `0 0 ${VB_W} ${VB_H}`, role: 'img', 'aria-label': 'Dual damascene cross-section' });
      const playBtn = h('button', { class: 'w-btn', type: 'button', 'data-act': 'play', on: { click: () => { if (fill >= 1) startFill(true); else setPlaying(!playing); } } }, 'Pause');
      const replayBtn = h('button', { class: 'w-btn', type: 'button', 'data-act': 'replay', on: { click: () => startFill(true) } }, 'Replay');
      const animRow = h('div', { style: { display: 'none', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, playBtn, replayBtn, h('span', { class: 'w-note', style: { marginTop: 0 } }, 'plating animation: via first, then trench, then overburden'));
      const chip = (c, op) => h('i', { style: { background: `var(--${c})`, opacity: op == null ? 1 : op } });
      const legend = h('div', { class: 'w-legend' },
        h('span', { class: 'w-legend-item' }, chip('cu'), 'copper'),
        h('span', { class: 'w-legend-item' }, chip('muted', 0.75), 'SiCN cap'),
        h('span', { class: 'w-legend-item' }, chip('si', 0.3), 'low-k SiOC:H (dots = pores)'),
        h('span', { class: 'w-legend-item' }, chip('accent2', 0.9), 'TiN (dark) / TEOS (light) hard mask'),
        h('span', { class: 'w-legend-item' }, chip('warn'), 'TaN barrier'),
        h('span', { class: 'w-legend-item' }, chip('bad'), 'Co / Ru liner'));

      // ---------- drawing helpers ----------
      const R = (g, x, y, w, hh, fillC, extra) => g.append(svg('rect', Object.assign({ x, y, width: w, height: hh, fill: fillC }, extra || {})));
      const T = (g, x, y, s, o) => g.append(svg('text', Object.assign({ x, y, 'font-family': (o && o.mono) ? 'var(--mono)' : 'var(--sans)', 'font-size': (o && o.size) || 13.5, fill: (o && o.fill) || 'var(--ink)', 'text-anchor': (o && o.anchor) || 'start' }, o && o.attrs || {}), s));
      const P = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' ');
      // outline of the open-top T cavity plus (optionally) the field surface, offset inward/upward by t
      function profile(t, ySurf, yVB, field) {
        const yTop = field ? ySurf - t : ySurf, pts = [];
        if (field) pts.push([DX0, yTop]);
        pts.push([TR_X0 + t, yTop], [TR_X0 + t, Y_TR - t], [VIA_X0 + t, Y_TR - t], [VIA_X0 + t, yVB - t], [VIA_X1 - t, yVB - t], [VIA_X1 - t, Y_TR - t], [TR_X1 - t, Y_TR - t], [TR_X1 - t, yTop]);
        if (field) pts.push([DX1, yTop]);
        return pts;
      }
      const ringPath = (outer, inner) => P(outer) + ' ' + P(inner.slice().reverse()).replace(/^M/, 'L') + ' Z';
      const film = (g, t0, t1, ySurf, yVB, field, color) => g.append(svg('path', { d: ringPath(profile(t0, ySurf, yVB, field), profile(t1, ySurf, yVB, field)), fill: color }));
      function lowk(g, y0, y1) { R(g, DX0, y0, DX1 - DX0, y1 - y0, 'var(--si)', { 'fill-opacity': 0.3 }); R(g, DX0, y0, DX1 - DX0, y1 - y0, `url(#${uid}p)`); }
      function cap(g, x0, x1, y0) { R(g, x0, y0, x1 - x0, 8, 'var(--muted)', { 'fill-opacity': 0.75 }); R(g, x0, y0, x1 - x0, 8, `url(#${uid}h)`); }
      // deterministic "fine grain" texture for as-plated copper
      const GRAINS = (() => { let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; const out = [];
        const scatter = (x0, x1, y0, y1, n) => { for (let i = 0; i < n; i++) { const x = x0 + 2 + rnd() * (x1 - x0 - 4), y = y0 + 2 + rnd() * (y1 - y0 - 4), a = rnd() * Math.PI, l = 2 + rnd() * 2.5; out.push([Math.max(x0, x - Math.cos(a) * l), Math.max(y0, y - Math.sin(a) * l), Math.min(x1, x + Math.cos(a) * l), Math.min(y1, y + Math.sin(a) * l)]); } };
        scatter(VIA_X0 + FILM, VIA_X1 - FILM, Y_TR - FILM, Y_CAP1 - FILM, 12); scatter(TR_X0 + FILM, TR_X1 - FILM, Y_SURF - FILM, Y_TR - FILM, 60); scatter(DX0, DX1, Y_SURF - FILM - OB, Y_SURF - FILM, 30); return out; })();

      function draw() {
        stage.innerHTML = '';
        const g = stage, s = step + 1;
        const defs = svg('defs');
        defs.append(svg('pattern', { id: uid + 'p', width: 10, height: 10, patternUnits: 'userSpaceOnUse' }, svg('circle', { cx: 2.5, cy: 2.5, r: 1, fill: 'var(--si)', 'fill-opacity': 0.55 }), svg('circle', { cx: 7.5, cy: 7.5, r: 1, fill: 'var(--si)', 'fill-opacity': 0.55 })));
        defs.append(svg('pattern', { id: uid + 'h', width: 6, height: 6, patternUnits: 'userSpaceOnUse' }, svg('path', { d: 'M0,6 L6,0', stroke: 'var(--ink)', 'stroke-opacity': 0.3, 'stroke-width': 1 })));
        g.append(defs);
        const cmp = s === 11, ySurf = cmp ? Y_LK : Y_SURF, yVB = s >= 6 ? Y_CAP1 : Y_CAP, field = !cmp;
        const labels = [];
        const L = (lines, ax, ay, py) => labels.push({ l: lines, ax, ay, y: py == null ? ay + 4 : py });

        // --- previous level M(n): low-k with three Cu lines (U-shaped TaN barrier), old SiCN cap on top ---
        lowk(g, Y_CAP1, Y_BOT);
        MN_CX.forEach(cx => { R(g, cx - MN_W / 2, Y_CAP1, MN_W, MN_H, 'var(--cu)'); g.append(svg('path', { d: `M${cx - MN_W / 2 + 1},${Y_CAP1} V${Y_CAP1 + MN_H - 1} H${cx + MN_W / 2 - 1} V${Y_CAP1}`, fill: 'none', stroke: 'var(--warn)', 'stroke-width': 2 })); });
        if (s >= 6) { cap(g, DX0, VIA_X0, Y_CAP); cap(g, VIA_X1, DX1, Y_CAP); } else cap(g, DX0, DX1, Y_CAP);
        L(['M(n) Cu lines', 'previous level'], DX1 - 2, Y_CAP1 + 22);
        L(cmp ? ['old SiCN cap', 'stays in place'] : ['SiCN cap', 'etch stop, 10–25 nm'], DX1 - 2, Y_CAP + 4);

        // --- this level: low-k ILD, TEOS + TiN hard mask ---
        if (s >= 2) { lowk(g, Y_LK, Y_CAP); L(['low-k SiOC:H', 'k ≈ 2.5, 80–150 nm'], DX1 - 2, s <= 3 ? 118 : 146); }
        if (s >= 3 && s <= 10) { R(g, DX0, Y_SURF, DX1 - DX0, Y_TEOS - Y_SURF, 'var(--accent2)', { 'fill-opacity': 0.9 }); R(g, DX0, Y_TEOS, DX1 - DX0, Y_LK - Y_TEOS, 'var(--accent2)', { 'fill-opacity': 0.45 }); L(['TiN + TEOS', 'hard mask'], DX1 - 2, Y_TEOS); }

        // --- cavity: via only (step 4), then the open-top T (step 5+); via stops ON the cap until step 6 ---
        if (s === 4) { R(g, VIA_X0, Y_SURF, VIA_X1 - VIA_X0, Y_CAP - Y_SURF, 'var(--panel)'); L(['via ≈ 20 nm', 'stops on the cap'], VIA_X1, 150); }
        if (s >= 5) g.append(svg('path', { d: P(profile(0, Y_SURF, yVB, false)) + ' Z', fill: 'var(--panel)' }));
        if (s === 5 || s === 6) L(['trench → the line', 'w 20 × h 40 nm'], TR_X1, 78);
        if (s === 5) L(['via ≈ 20 nm', 'stops on the cap'], VIA_X1, 150);
        if (s === 6) L(['Cu exposed', 'cap opened'], VIA_X1, Y_CAP1 - 1);
        if (s === 1) { g.append(svg('path', { d: P(profile(0, Y_SURF, Y_CAP1, false)), fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-dasharray': '3 3' })); L(['next: trench + via', 'steps 2–11'], TR_X1, 74); }

        // --- barrier + liner: one continuous open-top film on every surface (field, walls, floors, via bottom on Cu) ---
        if (s >= 7) {
          film(g, 0, BAR, ySurf, yVB, field, 'var(--warn)');
          film(g, BAR, FILM, ySurf, yVB, field, 'var(--bad)');
          if (s === 7) { L(['TaN barrier', '1.5–2 nm, PVD/ALD'], TR_X1 + BAR / 2, 72); L(['Co or Ru liner', '1–2 nm, CVD'], 150, Y_TR - BAR - LIN / 2, 100); }
        }
        // --- PVD seed: thin film, overhang lobes at the trench mouth, thinner low on the via walls, reflow puddle ---
        if (s === 8) {
          const yF = Y_SURF - FILM, xL = TR_X0 + FILM, xR = TR_X1 - FILM, yFl = Y_TR - FILM, vL = VIA_X0 + FILM, vR = VIA_X1 - FILM, vB = yVB - FILM;
          const inner = [[DX0, yF - SEED], [xL + SEED, yF - SEED], [xL + SEED, yFl - SEED], [vL + SEED, yFl - SEED], [vL + 1, vB - 1], [vR - 1, vB - 1], [vR - SEED, yFl - SEED], [xR - SEED, yFl - SEED], [xR - SEED, yF - SEED], [DX1, yF - SEED]];
          g.append(svg('path', { d: ringPath(profile(FILM, Y_SURF, yVB, true), inner), fill: 'var(--cu)' }));
          g.append(svg('ellipse', { cx: xL + 1, cy: Y_SURF, rx: 5.5, ry: 7, fill: 'var(--cu)' }));
          g.append(svg('ellipse', { cx: xR - 1, cy: Y_SURF, rx: 5.5, ry: 7, fill: 'var(--cu)' }));
          g.append(svg('path', { d: `M${vL},${vB - 11} Q${(vL + vR) / 2},${vB - 2} ${vR},${vB - 11} V${vB} H${vL} Z`, fill: 'var(--cu)' }));
          L(['Cu seed (PVD)', 'overhang at mouth'], xR - 2, Y_SURF - 4, 40);
          L(['thin on via walls'], vR - 1, 150);
          L(['reflow puddle'], vR, vB - 5);
        }
        // --- copper: piston fill (step 9), full + overburden (10), polished flush (11) ---
        if (s >= 9) {
          const vL = VIA_X0 + FILM, vR = VIA_X1 - FILM, tL = TR_X0 + FILM, tR = TR_X1 - FILM, yFl = Y_TR - FILM, vB = yVB - FILM, yF = Y_SURF - FILM, yOB = yF - OB;
          const lvl = cmp ? Y_LK : s === 10 ? yOB : vB - fill * (vB - yOB);
          if (lvl < vB) R(g, vL, Math.max(lvl, yFl), vR - vL, vB - Math.max(lvl, yFl), 'var(--cu)');
          if (lvl < yFl) R(g, tL, Math.max(lvl, yF), tR - tL, yFl + 0.6 - Math.max(lvl, yF), 'var(--cu)');
          if (lvl < yF && !cmp) R(g, DX0, lvl, DX1 - DX0, yF + 0.6 - lvl, 'var(--cu)');
          if (s === 9) {
            const pct = Math.min(1, (vB - lvl) / (vB - yF));
            T(g, DX0, 16, 'bottom-up fill: ' + Math.round(pct * 100) + ' %' + (lvl < yF - 0.5 ? ' + overburden' : ''), { mono: true, size: 13 });
            GRAINS.forEach(([x1, y1, x2, y2]) => { if (Math.min(y1, y2) >= lvl) g.append(svg('line', { x1, y1, x2, y2, stroke: 'var(--ink)', 'stroke-opacity': 0.3, 'stroke-width': 0.8 })); });
            if (lvl <= yF + 0.01) L(['fine grains', 'as plated'], 140, 84);
          }
          if (s === 10) {
            const gb = (x1, y1, x2, y2) => g.append(svg('line', { x1, y1, x2, y2, stroke: 'var(--ink)', 'stroke-opacity': 0.4, 'stroke-width': 1 }));
            [76, 96, 128, 148].forEach(x => gb(x, yOB, x + 3, yFl));
            [22, 40, 176].forEach(x => gb(x, yOB, x + 2, yF));
            [132, 152, 170].forEach(y => gb(vL, y, vR, y + 2));
            L(['bamboo grains', 'R drops ≈ 20 %'], 140, 84);
          }
          if ((s === 9 && lvl < yF - 0.5) || s === 10) L(['overburden', '200–800 nm'], DX1 - 2, (lvl + yF) / 2, 34);
          if (cmp) { R(g, DX0, Y_LK - 8, DX1 - DX0, 8, 'var(--muted)', { 'fill-opacity': 0.75 }); R(g, DX0, Y_LK - 8, DX1 - DX0, 8, `url(#${uid}h)`); L(['new SiCN cap'], DX1 - 2, Y_LK - 4, 56); L(['M(n+1) Cu line', 'flush with the low-k'], 150, 84); L(['via V(n)'], vR - 1, 150); }
        }
        placeLabels(g, labels);
      }

      // right-hand label column: spread so nothing overlaps, leader line back to the part
      function placeLabels(g, items) {
        const LH = 18, GAP = 7, TOP = 14, BOT = VB_H - 8;
        items.sort((a, b) => a.y - b.y);
        let minY = TOP;
        for (const it of items) { it.y = Math.max(it.y, minY); minY = it.y + it.l.length * LH + GAP; }
        let maxLast = BOT;
        for (let i = items.length - 1; i >= 0; i--) { const it = items[i], lastY = it.y + (it.l.length - 1) * LH; if (lastY > maxLast) it.y -= lastY - maxLast; maxLast = it.y - LH - GAP; }
        for (const it of items) {
          g.append(svg('line', { x1: LX - 3, y1: it.y - 4.5, x2: it.ax, y2: it.ay, stroke: 'var(--muted)', 'stroke-width': 1 }));
          g.append(svg('circle', { cx: it.ax, cy: it.ay, r: 1.8, fill: 'var(--muted)' }));
          it.l.forEach((s, i) => T(g, LX, it.y + i * LH, s, { size: i ? 13 : 13.5, fill: i ? 'var(--muted)' : 'var(--ink)' }));
        }
      }

      // ---------- superfill animation ----------
      function setPlaying(p) { playing = p; playBtn.textContent = playing ? 'Pause' : 'Play'; if (playing) loop(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } }
      function loop() { if (raf || !visible || !playing) return; last = 0; raf = requestAnimationFrame(frame); }
      function frame(ts) {
        raf = 0;
        if (!visible || !playing || step !== 8) return;
        if (last) fill = Math.min(1, fill + (ts - last) / 2600);
        last = ts; draw();
        if (fill >= 1) { setPlaying(false); return; }
        raf = requestAnimationFrame(frame);
      }
      function startFill(force) {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        fill = 0;
        if (reduced && !force) { fill = 1; setPlaying(false); draw(); return; }
        setPlaying(true); draw();
      }
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) loop(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } });
      io.observe(el);

      function go(i) {
        step = Math.max(0, Math.min(STEPS.length - 1, i));
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        playing = false;
        title.textContent = 'Step ' + (step + 1) + ' — ' + STEPS[step].t;
        desc.textContent = STEPS[step].d;
        toolLine.textContent = 'Tool: ' + STEPS[step].tool;
        counter.textContent = `Step ${step + 1} / ${STEPS.length}`;
        dots.forEach((d, i2) => { d.classList.toggle('active', i2 === step); d.classList.toggle('done', i2 < step); });
        prevBtn.disabled = step === 0; nextBtn.disabled = step === STEPS.length - 1;
        animRow.style.display = step === 8 ? 'flex' : 'none';
        if (step === 8) startFill(false); else { fill = step > 8 ? 1 : 0; draw(); }
      }

      // ---------- line-width physics panel ----------
      const wIn = h('input', { type: 'range', min: 12, max: 100, step: 1, value: 20 });
      const wOut = h('output');
      const preset = (label, v) => h('button', { class: 'w-btn', type: 'button', 'data-preset': v, on: { click: () => { wIn.value = v; updatePhysics(); } } }, label);
      const bar = svg('svg', { class: 'w-svg', viewBox: '0 0 330 76', role: 'img', 'aria-label': 'Width split: barrier, liner, copper', style: { maxWidth: '520px' } });
      const stats = h('div', { class: 'w-readout' });
      const formula = h('div', { class: 'w-formula', style: { display: 'block', whiteSpace: 'normal', lineHeight: 1.6 } });
      const fmtR = ohm => ohm >= 1e6 ? fmt(ohm / 1e6, 2) + ' MΩ' : ohm >= 1e3 ? fmt(ohm / 1e3, ohm >= 1e4 ? 0 : 1) + ' kΩ' : fmt(ohm, 0) + ' Ω';
      function updatePhysics() {
        const w = +wIn.value; wOut.textContent = w + ' nm';
        const wCu = w - 2 * (TAN + CO), hCu = 2 * w - (TAN + CO), area = wCu * hCu; // nm, nm, nm²
        const alpha = (LAMBDA / wCu) * R_GB / (1 - R_GB);
        const rho = RHO0 * (1 + 0.4 * LAMBDA / wCu + (MS(alpha) - 1)); // µΩ·cm, p = 0
        const Rmm = rho * 1e-8 * 1e-3 / (area * 1e-18); // Ω for 1 mm
        const Cmm = C_PER_UM * 1000 * 1e-15; // F for 1 mm
        const tns = 0.38 * Rmm * Cmm * 1e9;
        stats.innerHTML = '';
        const stat = (v, l) => h('div', { class: 'w-stat' }, h('b', null, v), h('span', null, l));
        stats.append(
          stat(fmt(100 * (1 - wCu / w), 0) + ' %', 'of the width is TaN + Co'),
          stat(fmt(wCu, 1) + ' × ' + fmt(hCu, 1) + ' nm', 'Cu core, w × h (h = 2w)'),
          stat(fmt(area, 0) + ' nm²', 'Cu cross-section'),
          stat(fmt(rho, 1) + ' µΩ·cm', 'ρ_eff (bulk Cu 1.68)'),
          stat(fmtR(Rmm), 'R of a 1 mm line'),
          stat(tns >= 1 ? fmt(tns, 1) + ' ns' : fmt(tns * 1000, 0) + ' ps', 'RC delay, 1 mm (C = 200 fF)'));
        // width-split bar
        bar.innerHTML = '';
        const X0 = 8, W = 314, y0 = 6, hb = 20, sc = W / w;
        const segs = [[TAN, 'var(--warn)', 'TaN'], [CO, 'var(--bad)', 'Co'], [wCu, 'var(--cu)', 'Cu ' + fmt(wCu, 1) + ' nm'], [CO, 'var(--bad)', ''], [TAN, 'var(--warn)', '']];
        let x = X0;
        segs.forEach(([ww, c, lbl]) => { const sw = ww * sc; R(bar, x, y0, sw, hb, c); if (lbl && sw > (lbl.length > 3 ? 70 : lbl.length * 9)) T(bar, x + sw / 2, y0 + 14.5, lbl, { size: 13, anchor: 'middle', fill: 'var(--panel)' }); x += sw; });
        bar.append(svg('path', { d: `M${X0},${y0 + hb + 4} V${y0 + hb + 12} M${X0 + W},${y0 + hb + 4} V${y0 + hb + 12} M${X0},${y0 + hb + 8} H${X0 + W}`, stroke: 'var(--muted)', 'stroke-width': 1, fill: 'none' }));
        T(bar, X0 + W / 2, y0 + hb + 22, 'w = ' + w + ' nm · h = 2w = ' + 2 * w + ' nm', { size: 13, anchor: 'middle', fill: 'var(--muted)', mono: true });
        T(bar, X0 + W / 2, y0 + hb + 42, 'Each side: TaN 2 nm + Co 1.5 nm', { size: 13, anchor: 'middle', fill: 'var(--muted)', mono: true });
        formula.innerHTML = 'ρ<sub>eff</sub> = ρ₀ · [1 + 0.4·λ/w<sub>Cu</sub> + (MS(α) − 1)], surfaces fully diffuse (p = 0); grain boundaries MS(α) = 1 / [1 − 3α/2 + 3α² − 3α³·ln(1 + 1/α)], α = (λ/w<sub>Cu</sub>)·R/(1 − R), R = 0.32, grain size ≈ w<sub>Cu</sub>. ρ₀ = 1.68 µΩ·cm, λ = 39 nm. w<sub>Cu</sub> = w − 2·(2 + 1.5) nm, h<sub>Cu</sub> = 2w − 3.5 nm. R = ρL/A; t<sub>50</sub> ≈ 0.38·R·C, C = 0.2 fF/µm.';
      }
      wIn.addEventListener('input', updatePhysics);

      // ---------- assemble ----------
      el.append(
        h('div', { class: 'w-steps' }, nav, title, desc, toolLine, stage, animRow),
        legend,
        h('div', { class: 'w-note' }, 'One dual-damascene metal level of ~15–18 in the full BEOL stack (Module 12). Not to scale: the via and the new line are ~20 nm wide, the ILD ~100 nm thick.'),
        h('h5', { style: { margin: '18px 0 4px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' } }, 'Line width vs. barrier tax and RC delay'),
        h('div', { class: 'w-controls' }, h('label', { class: 'w-ctl' }, h('span', null, 'Drawn line width'), wIn, wOut), h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, h('span', { style: { color: 'var(--muted)', fontSize: '13px' } }, 'Presets:'), preset('M2: 20 nm', 20), preset('M8: 80 nm', 80))),
        bar, stats, formula,
        h('div', { class: 'w-note' }, 'Presets reproduce the module’s worked example: a 20 nm M2 line ≈ 147 kΩ/mm and ≈ 11 ns unbuffered; an 80 nm M8 line ≈ 2.2 kΩ and ≈ 0.17 ns.'));

      go(6); // Representative first frame: lined trench and via; Prev returns to the first step.
      updatePhysics();
      return () => { playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; io.disconnect(); };
    }
  });
})();
