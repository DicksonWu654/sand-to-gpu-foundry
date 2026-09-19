/* Widget: nvlink-topology — "The NVL72 as a Network" (Module 19) */
(function () {
  'use strict';
  // Every number below is from Module 19. Bandwidths are bidirectional totals (the way NVIDIA quotes them).
  // Each GPU has `ports` NVLink ports; `links` is how many of them land on each switch chip (a number, or one entry
  // per chip). A link is 2 lanes each way, i.e. 4 twinax pairs — that is what "a copper cable" means in the NVL72 spine.
  const PRESETS = [
    { id: 'hgx-h100', name: 'HGX H100 · 8 GPUs · 4 NVSwitch 3', short: 'HGX H100', gen: 'NVLink 4', type: 'board',
      groups: 2, perGroup: 4, groupLabel: 'row', swGroups: 4, chipsPer: 1, swName: 'NVSwitch 3',
      ports: 18, portGB: 50, laneGb: 100, chipPorts: 64, links: [5, 4, 4, 5], medium: 'trace',
      gpuLabel: '8 × H100 SXM5 modules', swLabel: '4 × NVSwitch 3 (64 ports each)',
      note: 'Eight H100 SXM5 modules and four third-generation NVSwitch chips (64 ports × 50 GB/s each) on one HGX baseboard. Each GPU spreads its 18 NVLink 4 ports over the four chips (5/4/4/5), so every GPU reaches every other at its full 900 GB/s in one hop, with no CPU involved. The 144 links are copper traces inside a 20–30-layer PCB, not cables.' },
    { id: 'hgx-b200', name: 'HGX B200 · 8 GPUs · 2 switches', short: 'HGX B200', gen: 'NVLink 5', type: 'board',
      groups: 2, perGroup: 4, groupLabel: 'row', swGroups: 2, chipsPer: 1, swName: 'NVLink 5 switch',
      ports: 18, portGB: 100, laneGb: 200, chipPorts: 72, links: 9, medium: 'trace',
      gpuLabel: '8 × Blackwell modules', swLabel: '2 × NVLink 5 switch (72 ports each)',
      note: 'Eight Blackwell modules and two fifth-generation NVLink switch chips (72 ports × 100 GB/s = 7.2 TB/s each). Each GPU puts 9 of its 18 ports on each chip for 1.8 TB/s per GPU, and the two chips are exactly full: 2 × 72 = 144 = 8 × 18. Still an 8-GPU domain; the next step up is a rack.' },
    { id: 'nvl72', name: 'GB200 NVL72 · 72 GPUs · 18 switches', short: 'GB200 NVL72', gen: 'NVLink 5', type: 'rack',
      groups: 18, perGroup: 4, groupLabel: 'tray', swGroups: 9, chipsPer: 2, swName: 'NVLink 5 switch',
      ports: 18, portGB: 100, laneGb: 200, chipPorts: 72, links: 1, medium: 'cable',
      note: '72 Blackwell GPUs in 18 compute trays (4 each, plus 2 Grace CPUs) and 18 NVLink 5 switch chips in 9 switch trays. Each GPU has exactly one 100 GB/s link to every switch chip, so any GPU reaches any other in one hop with all 18 links working in parallel. The 1 296 links run as ~5 000 passive copper twinax cables (about 2 miles) through the spine at the back of the rack. At 200 Gb/s per lane copper reaches ~1–1.5 m: enough to span one rack, not two, which is why the domain is exactly one rack and why it has no optics inside.' },
    { id: 'vr72', name: 'Vera Rubin NVL72 · roadmap', short: 'Vera Rubin NVL72', gen: 'NVLink 6', type: 'rack', roadmap: true,
      groups: 18, perGroup: 4, groupLabel: 'tray', swGroups: 9, chipsPer: 2, swName: 'NVLink 6 switch',
      ports: 18, portGB: 200, laneGb: 400, chipPorts: 72, links: 1, medium: 'cable',
      note: 'Roadmap, announced for the second half of 2026 and not yet shipped: the same 72-package, 18-switch shape with NVLink 6 at 3.6 TB/s per GPU, doubling every bandwidth figure. GTC 2025 called it "NVL144" by counting the 144 Rubin dies (two per package); CES 2026 renamed it NVL72 by packages. It is still one rack of copper NVLink: passive copper reaches only ~1–1.5 m, and reach does not grow with lane rate. The next step is the Kyber rack for Rubin Ultra (announced for 2027, reported slipping to 2028); a back-to-back "NVL72×2" stopgap for it was dropped after customer pushback. Only the 3.6 TB/s per GPU is announced; port count, lane rate and cable count (*) are assumed unchanged.' },
  ];
  const linksTo = (P, m) => Array.isArray(P.links) ? P.links[Math.floor(m / P.chipsPer)] : P.links;
  // "1 link" / "9 links" / "5/4/4/5 links": how many of one GPU's ports land on each switch chip
  function perText(P) {
    const S = P.swGroups * P.chipsPer, per = []; for (let m = 0; m < S; m++) per.push(linksTo(P, m));
    const u = [...new Set(per)]; return u.length === 1 ? `${u[0]} link${u[0] > 1 ? 's' : ''}` : `${per.join('/')} links`;
  }
  function derive(P) {
    const N = P.groups * P.perGroup, S = P.swGroups * P.chipsPer, links = N * P.ports, perGPU = P.ports * P.portGB;
    return { N, S, links, perGPU, agg: N * perGPU, bis: N / 2 * perGPU, used: links, avail: S * P.chipPorts, cables: P.medium === 'cable' ? links * 4 : 0 };
  }

  window.registerWidget('nvlink-topology', {
    title: 'The NVL72 as a Network',
    caption: 'Every GPU has an NVLink to every switch chip, so any two GPUs are one hop apart. Hover or click a GPU to light its ports, pick a second GPU to see the path, and switch systems to compare an 8-GPU board with the 72-GPU rack.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const st = { p: 2, from: 0, to: 71, hover: -1, cut: false, playing: !reduced };
      let W = 480, EW = 760, L = null, dead = false, raf = 0, visible = true, roRaf = 0, overlay = [], gpuRects = [], chipRects = [], ov = null; // W: graph width, EW: widget-body width
      const tb = gb => gb >= 1000 ? fmt(gb / 1000, 1) + ' TB/s' : fmt(gb, 0) + ' GB/s';
      const T = (x, y, s, a) => svg('text', Object.assign({ x, y, 'font-family': 'var(--sans)', 'font-size': 11.5, fill: 'var(--ink)' }, a || {}), s);
      const M = (x, y, s, a) => T(x, y, s, Object.assign({ 'font-family': 'var(--mono)', 'font-size': 11, fill: 'var(--muted)' }, a || {}));

      // ---------- controls ----------
      const selStyle = { minWidth: 0, width: '100%' };
      const presetSel = h('select', { style: selStyle }, ...PRESETS.map((p, i) => h('option', { value: i, selected: i === st.p || null }, p.name)));
      const fromSel = h('select', { style: selStyle }), toSel = h('select', { style: selStyle });
      const swapBtn = h('button', { class: 'w-btn', type: 'button', on: { click: () => { const t = st.from; st.from = st.to; st.to = t; syncSel(); drawOverlay(); } } }, 'Swap');
      const cutChk = h('input', { type: 'checkbox' });
      const cutOut = h('output', null, 'off');
      const playBtn = h('button', { class: 'w-btn', type: 'button', 'aria-pressed': String(st.playing), on: { click: () => { st.playing = !st.playing; playBtn.textContent = st.playing ? 'Pause traffic' : 'Play traffic'; playBtn.setAttribute('aria-pressed', String(st.playing)); drawOverlay(); start(); } } }, st.playing ? 'Pause traffic' : 'Play traffic');
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'System'), presetSel, h('output', { style: { minWidth: 0 } })),
        h('label', { class: 'w-ctl' }, h('span', null, 'From GPU'), fromSel, h('output', { style: { minWidth: 0 } })),
        h('label', { class: 'w-ctl' }, h('span', null, 'To GPU'), toSel, h('output', { style: { minWidth: 0 } })),
        h('label', { class: 'w-ctl' }, h('span', null, 'Bisection cut'), cutChk, cutOut),
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, swapBtn, playBtn));
      const readout = h('div', { class: 'w-readout' }), formula = h('div', { class: 'w-formula' });
      const sysNote = h('div', { class: 'w-note' }), pathNote = h('div', { class: 'w-note', style: { color: 'var(--ink)' } });
      const graph = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Graph of GPUs (left) linked to NVLink switch chips (right); every GPU is joined to every chip' });
      const inset = svg('svg', { role: 'img', 'aria-label': 'Where the parts physically sit', style: { display: 'block', width: '250px', height: 'auto', flex: '0 0 250px' } });
      const gwrap = h('div', { style: { flex: '1 1 300px', minWidth: 0 } }, graph);
      const row = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px 14px', alignItems: 'flex-start', justifyContent: 'center', margin: '8px 0' } }, gwrap, inset);
      const legFrom = h('span', null, 'from-GPU ports'), legOther = h('span', null, 'all other links');
      const legend = h('div', { class: 'w-legend' },
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--si)' } }), 'GPU'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent2)' } }), 'NVLink switch chip'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent)', height: '3px' } }), legFrom),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--ok)', height: '3px' } }), 'to-GPU ports'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--muted)', opacity: 0.7, height: '3px' } }), legOther));
      const cmp = h('div', { class: 'cmp', style: { display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '5px 10px', alignItems: 'center', fontSize: '12px', margin: '6px 0 2px' } });

      function syncSel() {
        const P = PRESETS[st.p], N = P.groups * P.perGroup;
        [fromSel, toSel].forEach((sel, i) => {
          sel.innerHTML = '';
          for (let k = 0; k < N; k++) sel.append(h('option', { value: k }, `GPU ${k + 1} · ${P.groupLabel} ${Math.floor(k / P.perGroup) + 1}`));
          sel.value = i ? st.to : st.from;
        });
      }

      // ---------- geometry (pixel units; viewBox width == CSS width so 11 px text stays 11 px) ----------
      function layout(P) {
        const rows = P.groups, narrow = W < 400, big = rows < 6;
        const pitch = big ? 76 : 24, g = big ? (W < 520 ? 26 : 32) : 18, gap = big ? 6 : 2, pad = big ? 6 : 3;
        const labW = narrow ? 26 : 54, top = 40, bot = st.cut ? 40 : 24; // 2nd bottom line holds the bisection caption
        const trayW = P.perGroup * g + (P.perGroup - 1) * gap + 2 * pad, gx0 = labW + 4, gx1 = gx0 + trayW;
        const chipH = big ? 30 : 18, chipW = big ? 40 : 28, cgap = 3;
        const swW = P.chipsPer * chipW + (P.chipsPer - 1) * cgap + 2 * pad, sx1 = W - labW - 4, sx0 = sx1 - swW;
        const Hrows = rows * pitch, spitch = Hrows / P.swGroups, H = top + Hrows + bot;
        const gpuPos = k => { const i = Math.floor(k / P.perGroup), c = k % P.perGroup, cy = top + (i + 0.5) * pitch;
          return { i, c, x: gx0 + pad + c * (g + gap), y: cy - g / 2, cy, ex: gx1, ey: cy + (c - (P.perGroup - 1) / 2) * (big ? 8 : 4) }; };
        const chipPos = m => { const j = Math.floor(m / P.chipsPer), c = m % P.chipsPer, cy = top + (j + 0.5) * spitch;
          return { j, c, x: sx0 + pad + c * (chipW + cgap), y: cy - chipH / 2, cy, ex: sx0, ey: cy + (c - (P.chipsPer - 1) / 2) * 4 }; };
        return { rows, narrow, big, pitch, g, gap, pad, labW, top, bot, trayW, gx0, gx1, chipH, chipW, swW, sx0, sx1, Hrows, spitch, H, gpuPos, chipPos };
      }

      // ---------- main graph: GPUs left, switch chips right, one faint line per link ----------
      function drawGraph() {
        graph.innerHTML = ''; gpuRects = []; chipRects = []; st.hover = -1; // the hovered rect is gone with the redraw
        const P = PRESETS[st.p], D = derive(P); L = layout(P);
        graph.setAttribute('viewBox', `0 0 ${W} ${L.H}`);
        const bold = { 'font-weight': 700 }, mut = { fill: 'var(--muted)' }, end = { 'text-anchor': 'end' };
        graph.append(T(2, 14, `${D.N} GPUs`, bold), T(2, 28, P.type === 'rack' ? `${P.groups} compute trays × ${P.perGroup}${P.roadmap ? ' (roadmap)' : ''}` : `HGX baseboard, ${P.groups} rows × ${P.perGroup}`, mut));
        graph.append(T(W - 2, 14, `${D.S} ${P.swName} chip${D.S > 1 ? 's' : ''}`, Object.assign({}, bold, end)),
          T(W - 2, 28, P.type === 'rack' ? `${P.swGroups} switch trays × ${P.chipsPer}` : 'on the same baseboard', Object.assign({}, mut, end)));
        // Base mesh. Board presets: one line per link (8 × 4 or 8 × 2). Rack presets: 1 296 individual lines turn into a grey
        // wash, so draw one bundle per (compute tray, switch tray) pair — 18 × 9 = 162 lines, each standing for 4 GPUs × 2 chips
        // = 8 links — which still reads as "every tray is wired to every switch tray". The highlighted GPUs get their real fan-out.
        let d = '';
        if (L.big) for (let k = 0; k < D.N; k++) { const a = L.gpuPos(k); for (let m = 0; m < D.S; m++) { const b = L.chipPos(m); d += `M${a.ex} ${a.ey}L${b.ex} ${b.ey}`; } }
        else for (let i = 0; i < P.groups; i++) { const ay = L.top + (i + 0.5) * L.pitch; for (let j = 0; j < P.swGroups; j++) d += `M${L.gx1} ${ay}L${L.sx0} ${L.top + (j + 0.5) * L.spitch}`; }
        graph.append(svg('path', { d, fill: 'none', stroke: 'var(--muted)', 'stroke-opacity': L.big ? 0.35 : 0.3, 'stroke-width': L.big ? 1.2 : 0.9 }));
        for (let i = 0; i < P.groups; i++) {
          const y = L.top + i * L.pitch;
          graph.append(svg('rect', { x: L.gx0, y: y + 1, width: L.trayW, height: L.pitch - 2, rx: 3, fill: 'var(--panel2)', stroke: 'var(--line)' }));
          graph.append(M(L.gx0 - 4, y + L.pitch / 2 + 4, L.narrow ? (P.groupLabel[0].toUpperCase() + (i + 1)) : `${P.groupLabel} ${i + 1}`, end));
        }
        for (let k = 0; k < D.N; k++) {
          const p = L.gpuPos(k);
          const r = svg('rect', { x: p.x, y: p.y, width: L.g, height: L.g, rx: 2, fill: 'var(--si)', style: { cursor: 'pointer' } });
          r.append(svg('title', null, `GPU ${k + 1} (${P.groupLabel} ${p.i + 1}): ${P.ports} ${P.gen} ports × ${P.portGB} GB/s = ${tb(D.perGPU)}. Click to set as “from”.`));
          r.addEventListener('mouseenter', () => { st.hover = k; drawOverlay(); });
          r.addEventListener('mouseleave', () => { st.hover = -1; drawOverlay(); });
          r.addEventListener('click', () => { st.from = k; fromSel.value = k; drawOverlay(); });
          graph.append(r, M(p.x + L.g / 2, p.y + L.g / 2 + (L.big ? 5 : 4), String(k + 1), { 'text-anchor': 'middle', fill: 'var(--panel)', 'pointer-events': 'none', 'font-size': L.big ? 13 : 11 }));
          gpuRects.push(r);
        }
        for (let j = 0; j < P.swGroups; j++) {
          const cy = L.top + (j + 0.5) * L.spitch, th = L.chipH + 6;
          graph.append(svg('rect', { x: L.sx0, y: cy - th / 2, width: L.swW, height: th, rx: 3, fill: 'var(--panel2)', stroke: 'var(--line)' }));
          graph.append(M(L.sx1 + 4, cy + 4, L.narrow ? 'S' + (j + 1) : (P.type === 'rack' ? `switch ${j + 1}` : `chip ${j + 1}`)));
        }
        for (let m = 0; m < D.S; m++) {
          const c = L.chipPos(m);
          const r = svg('rect', { x: c.x, y: c.y, width: L.chipW, height: L.chipH, rx: 2, fill: 'var(--accent2)' });
          r.append(svg('title', null, `${P.swName} chip ${m + 1}: ${P.chipPorts} ports × ${P.portGB} GB/s = ${tb(P.chipPorts * P.portGB)}; ${linksTo(P, m)} link${linksTo(P, m) > 1 ? 's' : ''} to each GPU`));
          graph.append(r, M(c.x + L.chipW / 2, c.y + L.chipH / 2 + (L.big ? 5 : 4), String(m + 1), { 'text-anchor': 'middle', fill: 'var(--panel)', 'pointer-events': 'none', 'font-size': L.big ? 13 : 11 }));
          chipRects.push(r);
        }
        const gapW = L.sx0 - L.gx1;
        graph.append(M((L.gx1 + L.sx0) / 2, L.top + L.Hrows + 16, gapW < 200 ? `${fmt(D.links, 0)} links` : `${fmt(D.links, 0)} links, all-to-all, 1 hop`, { 'text-anchor': 'middle' }));
        ov = svg('g'); graph.append(ov);
        drawOverlay();
      }
      // Centred text that is nudged back inside [2, W-2] if it would poke out of the SVG.
      function fitText(x, y, s, a) {
        const t = T(x, y, s, Object.assign({ 'text-anchor': 'middle' }, a || {})); ov.append(t);
        const len = (t.getComputedTextLength && t.getComputedTextLength()) || s.length * 6.4;
        t.setAttribute('x', Math.min(Math.max(x, len / 2 + 2), W - 2 - len / 2));
        return t;
      }

      // ---------- highlighted path: from-GPU → every chip → to-GPU ----------
      function drawOverlay() {
        if (!ov) return;
        ov.innerHTML = ''; overlay = [];
        const P = PRESETS[st.p], D = derive(P);
        const src = st.hover >= 0 ? st.hover : st.from, dst = st.to;
        gpuRects.forEach((r, k) => { r.setAttribute('stroke', k === src ? 'var(--accent)' : k === dst ? 'var(--ok)' : 'none'); r.setAttribute('stroke-width', 2.5); });
        chipRects.forEach(r => { r.setAttribute('stroke', src !== dst ? 'var(--ink)' : 'none'); r.setAttribute('stroke-width', 1.5); });
        const mk = (a, b, color) => { const l = svg('line', { x1: a.ex, y1: a.ey, x2: b.ex, y2: b.ey, stroke: color, 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-dasharray': st.playing ? '5 8' : null }); ov.append(l); overlay.push(l); };
        for (let m = 0; m < D.S; m++) { mk(L.gpuPos(src), L.chipPos(m), 'var(--accent)'); if (dst !== src) mk(L.chipPos(m), L.gpuPos(dst), 'var(--ok)'); }
        if (st.cut) { // dashed line between the two GPU halves; its caption lives on the reserved 2nd bottom line, never in the graph
          const y = L.top + (L.rows / 2) * L.pitch, half = `${D.N / 2} ↔ ${D.N / 2} GPUs`;
          ov.append(svg('line', { x1: 2, y1: y, x2: L.sx0 - 6, y2: y, stroke: 'var(--bad)', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }));
          fitText((L.gx1 + L.sx0) / 2, L.H - 8, W < 480 ? `bisection cut (dashed): ${half}, ${tb(D.bis)}` : `bisection cut (dashed): ${half}, ${tb(D.bis)} can cross it`,
            { fill: 'var(--bad)', 'font-weight': 600 });
        }
        const gi = Math.floor(src / P.perGroup) + 1, gj = Math.floor(dst / P.perGroup) + 1, perTxt = perText(P);
        pathNote.textContent = src === dst
          ? `GPU ${src + 1} (${P.groupLabel} ${gi}): its ${P.ports} ${P.gen} ports are lit, ${perTxt} to each of the ${D.S} switch chips. Pick a different “to” GPU to see a path.`
          : `GPU ${src + 1} (${P.groupLabel} ${gi}) → GPU ${dst + 1} (${P.groupLabel} ${gj}): one switch hop, through any of the ${D.S} chips. ${D.S} parallel path${D.S > 1 ? 's' : ''} with ${perTxt} × ${P.portGB} GB/s on each side, so this pair alone can move ${tb(D.perGPU)} — a single GPU's whole NVLink budget, and the same for every other pair at the same time.`;
        overlay.forEach(l => l.setAttribute('stroke-dashoffset', 0));
        start();
      }

      // ---------- inset: where the parts physically sit ----------
      function drawInset() {
        inset.innerHTML = '';
        const P = PRESETS[st.p], D = derive(P), mid = { 'text-anchor': 'middle' }, end = { 'text-anchor': 'end' }, mut = { fill: 'var(--muted)' };
        if (P.type === 'rack') {
          inset.setAttribute('viewBox', '0 0 250 386');
          inset.append(T(125, 12, `${P.short} rack${P.roadmap ? ' (roadmap)' : ', front'}`, Object.assign({ 'font-weight': 700 }, mid)));
          const rx = 70, rw = 100, ry = 22, rh = 314;
          inset.append(svg('rect', { x: rx, y: ry, width: rw, height: rh, rx: 4, fill: 'var(--ground)', stroke: 'var(--line2)' }));
          const blocks = [{ n: 3, h: 6, fill: 'var(--line2)', lab: ['power'] }, { n: 10, h: 8, fill: 'var(--si)', lab: ['compute', 'trays 1–10'] },
            { n: 9, h: 8, fill: 'var(--accent2)', lab: ['switch', 'trays 1–9'] }, { n: 8, h: 8, fill: 'var(--si)', lab: ['compute', 'trays 11–18'] }, { n: 3, h: 6, fill: 'var(--line2)', lab: ['power'] }];
          let y = ry + 4, yTop = 0, yMid = 0, yBot = 0;
          blocks.forEach((b, bi) => {
            const y0 = y;
            for (let t = 0; t < b.n; t++) { inset.append(svg('rect', { x: rx + 4, y, width: rw - 8, height: b.h, rx: 1, fill: b.fill, opacity: bi === 0 || bi === 4 ? 1 : 0.8 })); y += b.h + 1.5; }
            const yc = (y0 + y - 1.5) / 2;
            if (bi === 1) yTop = y0; if (bi === 2) yMid = yc; if (bi === 3) yBot = y - 1.5;
            b.lab.forEach((s, li) => inset.append(T(rx - 6, yc + (b.lab.length === 1 ? 4 : li ? 11 : -2), s, Object.assign({}, end, li ? mut : {}))));
            y += 2;
          });
          inset.append(svg('rect', { x: rx + rw + 3, y: yTop, width: 5, height: yBot - yTop, fill: 'var(--cu)' }));
          inset.append(T(192, yMid, 'NVLink spine (rear)', Object.assign({ transform: `rotate(-90 192 ${yMid})`, fill: 'var(--cu)', 'font-weight': 600 }, mid)));
          const bx = 204;
          inset.append(svg('path', { d: `M${bx - 4} ${yTop}H${bx}V${yMid}H${bx - 4}`, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1 }));
          inset.append(M(bx + 4, (yTop + yMid) / 2 + 4, '≈1 m', { fill: 'var(--ink)' }));
          inset.append(T(125, 350, `spine (bar): ${D.cables ? '~' + fmt(Math.round(D.cables / 1000) * 1000, 0) : ''} copper cables${P.roadmap ? '*' : ''}`, mid),
            T(125, 364, 'copper reach ≈ 1–1.5 m: one rack', mid), T(125, 378, 'a 2nd rack would need optics', Object.assign({}, mid, mut)));
        } else {
          inset.setAttribute('viewBox', '0 0 250 258');
          inset.append(T(125, 12, `${P.short} baseboard, top`, Object.assign({ 'font-weight': 700 }, mid)));
          inset.append(svg('rect', { x: 30, y: 24, width: 190, height: 180, rx: 4, fill: 'var(--ground)', stroke: 'var(--line2)' }));
          inset.append(T(125, 38, P.swLabel, Object.assign({}, mid, mut)));
          const n = D.S, cs = 26, cg = 14, cx0 = 125 - (n * cs + (n - 1) * cg) / 2, chips = [];
          for (let m = 0; m < n; m++) { const x = cx0 + m * (cs + cg); chips.push(x + cs / 2); inset.append(svg('rect', { x, y: 44, width: cs, height: cs, rx: 2, fill: 'var(--accent2)' }), M(x + cs / 2, 61, String(m + 1), Object.assign({ fill: 'var(--panel)' }, mid))); }
          const mw = 36, mh = 40, mx0 = 41;
          for (let k = 0; k < 8; k++) {
            const x = mx0 + (k % 4) * (mw + 8), y = k < 4 ? 96 : 146;
            for (let m = 0; m < n; m++) inset.append(svg('line', { x1: x + mw / 2, y1: y, x2: chips[m], y2: 70, stroke: 'var(--cu)', 'stroke-width': linksTo(P, m) / 4, 'stroke-opacity': 0.55 }));
          }
          for (let k = 0; k < 8; k++) {
            const x = mx0 + (k % 4) * (mw + 8), y = k < 4 ? 96 : 146;
            inset.append(svg('rect', { x, y, width: mw, height: mh, rx: 3, fill: 'var(--si)' }), M(x + mw / 2, y + mh / 2 + 4, String(k + 1), Object.assign({ fill: 'var(--panel)' }, mid)));
          }
          inset.append(T(125, 198, P.gpuLabel, Object.assign({}, mid, mut)));
          inset.append(T(125, 222, `${fmt(D.links, 0)} NVLink links are PCB traces`, mid), T(125, 236, 'in a 20–30-layer, ~60 × 40 cm board', mid), T(125, 250, 'no cables; an 8-GPU domain', Object.assign({}, mid, mut)));
        }
      }

      // ---------- readouts, formula, comparison ----------
      function update() {
        const P = PRESETS[st.p], D = derive(P), a = P.roadmap ? '*' : '';
        const stat = (v, l) => h('div', { class: 'w-stat' }, h('b', null, v), h('span', null, l));
        readout.innerHTML = '';
        readout.append(
          stat(tb(D.perGPU), `per GPU (${P.ports}${a} ports × ${P.portGB}${a} GB/s)`),
          stat(tb(D.agg), `aggregate, ${D.N} GPUs${P.id === 'nvl72' ? ' (“130 TB/s”)' : ''}`),
          stat(tb(D.bis), `bisection (${D.N / 2} GPUs ↔ ${D.N / 2} GPUs)`),
          stat(fmt(D.links, 0), `NVLink links (${D.N} × ${P.ports}${a})`),
          stat(D.cables ? fmt(D.cables, 0) + a : '0', D.cables ? `copper cables (4 pairs per link)${P.id === 'nvl72' ? ', “~5 000, ~2 miles”' : ''}` : 'cables — the links are PCB traces'),
          stat(`${fmt(D.used, 0)} / ${fmt(D.avail, 0)}`, `switch ports used / available (${D.S} × ${P.chipPorts})`),
          stat('1', 'switch hop between any two GPUs'));
        formula.innerHTML = `B<sub>GPU</sub> = ports × B<sub>port</sub> = ${P.ports}${a} × ${P.portGB}${a} GB/s = ${tb(D.perGPU)} · `
          + `B<sub>aggregate</sub> = N<sub>GPU</sub> × B<sub>GPU</sub> = ${D.N} × ${tb(D.perGPU)} = ${tb(D.agg)}${D.used === D.avail ? ` (= ${D.S} chips × ${P.chipPorts} ports × ${P.portGB}${a} GB/s)` : ''} · `
          + `B<sub>bisection</sub> = ½ N<sub>GPU</sub> × B<sub>GPU</sub> = ${D.N / 2} × ${tb(D.perGPU)} = ${tb(D.bis)} · `
          + (D.cables ? `cables = links × 4 pairs = ${fmt(D.links, 0)} × 4 = ${fmt(D.cables, 0)}${a} (each link: 2 lanes each way at ${P.laneGb}${a} Gb/s PAM4)` : `links = ${D.N} × ${P.ports} = ${fmt(D.links, 0)}, all on the PCB`)
          + '. All bandwidths are bidirectional totals. Bisection: cut the domain into two equal halves; it is the most traffic that can cross the cut. With every GPU wired to every chip, either half can talk to the other at full rate (non-blocking).'
          + (P.roadmap ? ' * assumed, not announced.' : '');
        sysNote.textContent = P.note;
        legFrom.textContent = `from-GPU ports (${perText(P)} per chip)`;
        legOther.textContent = P.type === 'rack' ? 'all other links (one line per tray pair = 8 links)' : 'all other links';
        drawCmp();
      }
      // Bar chart of aggregate bandwidth. Wide: label | bar | value on one row. Narrow (< 420 px): label + value on one
      // row and a full-width bar under it, so the bars keep a track of >= 120 px instead of being squeezed by the labels.
      function drawCmp() {
        cmp.innerHTML = '';
        const stack = EW < 420, max = Math.max(...PRESETS.map(p => derive(p).agg));
        cmp.style.gridTemplateColumns = stack ? '1fr auto' : 'auto 1fr auto';
        cmp.style.rowGap = stack ? '3px' : '5px';
        PRESETS.forEach((p, i) => {
          const agg = derive(p).agg, cur = i === st.p, col = cur ? 'var(--ink)' : 'var(--muted)';
          const lab = h('span', { style: { color: col, fontWeight: cur ? 600 : 400, whiteSpace: 'nowrap' } }, p.short + (p.roadmap ? ' (roadmap)' : ''));
          const bar = h('div', { style: { height: '12px', background: 'var(--line)', borderRadius: '3px', overflow: 'hidden', gridColumn: stack ? '1 / -1' : null, marginBottom: stack && i < PRESETS.length - 1 ? '5px' : null } },
            h('div', { style: { height: '100%', width: (agg / max * 100).toFixed(1) + '%', background: cur ? 'var(--accent)' : 'var(--si)', opacity: cur ? 1 : 0.55, minWidth: '2px' } }));
          const val = h('b', { style: { fontFamily: 'var(--mono)', fontSize: '12px', whiteSpace: 'nowrap', color: col } }, tb(agg));
          if (stack) cmp.append(lab, val, bar); else cmp.append(lab, bar, val);
        });
      }

      // ---------- animation: dashes travel from → chip → to ----------
      function tick(now) {
        raf = 0; if (dead || !st.playing || !visible) return;
        const off = -((now / 1000) * 40 % 13);
        overlay.forEach(l => l.setAttribute('stroke-dashoffset', off));
        raf = requestAnimationFrame(tick);
      }
      function start() { if (!raf && st.playing && visible && !dead && overlay.length) raf = requestAnimationFrame(tick); }

      function setPreset(i) {
        st.p = i; const N = PRESETS[i].groups * PRESETS[i].perGroup;
        st.from = 0; st.to = N - 1; st.hover = -1;
        syncSel(); update(); drawGraph(); drawInset();
      }
      presetSel.addEventListener('change', () => setPreset(+presetSel.value));
      fromSel.addEventListener('change', () => { st.from = +fromSel.value; drawOverlay(); });
      toSel.addEventListener('change', () => { st.to = +toSel.value; drawOverlay(); });
      cutChk.addEventListener('change', () => { st.cut = cutChk.checked; cutOut.textContent = st.cut ? 'on' : 'off'; drawGraph(); /* height changes with the caption line */ });

      const sh = () => ({ margin: '14px 0 4px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' });
      el.append(controls, row, legend, pathNote, sysNote, readout, formula,
        h('h5', { style: sh() }, 'Aggregate NVLink bandwidth of one domain, compared'), cmp);

      W = Math.round(gwrap.getBoundingClientRect().width) || 480;
      EW = Math.round(el.getBoundingClientRect().width) || 760;
      setPreset(st.p);
      let nextW = W, nextEW = EW;
      const ro = new ResizeObserver(entries => {
        entries.forEach(e => { const w = Math.round(e.contentRect.width); if (e.target === gwrap) nextW = w; else nextEW = w; });
        if (roRaf) cancelAnimationFrame(roRaf);
        roRaf = requestAnimationFrame(() => {
          roRaf = 0; if (dead) return;
          const cmpFlip = nextEW > 0 && (nextEW < 420) !== (EW < 420); EW = nextEW || EW;
          if (nextW >= 200 && Math.abs(nextW - W) >= 2) { W = nextW; drawGraph(); }
          if (cmpFlip) drawCmp();
        });
      });
      ro.observe(gwrap); ro.observe(el);
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); });
      io.observe(el);
      ctx.onTheme(() => { /* every color is a var(--token) reference, so the SVG follows the theme by itself */ });
      return () => { dead = true; if (raf) cancelAnimationFrame(raf); if (roRaf) cancelAnimationFrame(roRaf); ro.disconnect(); io.disconnect(); };
    }
  });
})();
