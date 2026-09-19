/* Widget: purity — "What Nine Nines Means" (Module 01) */
(function () {
  'use strict';
  const SI_ATOMS = 5.0e22;          // atoms per cm³ of crystalline silicon (Module 01 §1)
  const GRID = 100;                 // 100 × 100 = 10 000 dots
  const CELLS = GRID * GRID;
  const EDGE = 4;                   // the first 10 impurity cells stay this many rows/cols from the edge so their halo rings are never clipped

  // Deterministic order in which cells become impurities (seeded LCG), so that
  // going from 3N to 2N adds dots instead of reshuffling them.
  const IMPURITY_ORDER = (() => {
    let s = 20240913; const seen = new Set(); const out = [];
    while (out.length < 100) {
      s = (s * 1664525 + 1013904223) >>> 0; const c = s % CELLS;
      if (seen.has(c)) continue;
      const r = Math.floor(c / GRID), q = c % GRID;
      if (out.length < 10 && (r < EDGE || r >= GRID - EDGE || q < EDGE || q >= GRID - EDGE)) continue;
      seen.add(c); out.push(c);
    }
    return out;
  })();

  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = n => String(n).split('').map(c => SUP[c] || c).join('');
  const sci = (n, d) => { const e = Math.floor(Math.log10(n)); const m = n / Math.pow(10, e); return (Math.abs(m - 1) < 1e-9 ? '' : m.toFixed(d == null ? 1 : d) + ' × ') + '10' + sup(e); };
  const purityStr = N => (N <= 2 ? '99' : '99.' + '9'.repeat(N - 2)) + ' %';
  function fractionStr(N) {
    if (N <= 3) return [1, 0.1][N - 2] + ' %';
    const unit = ['ppm', 'ppb', 'ppt'][Math.floor((N - 4) / 3)];
    return [100, 10, 1][(N - 4) % 3] + ' ' + unit;
  }
  const bigName = v => v >= 1e18 ? [v / 1e18, 'quintillion'] : v >= 1e15 ? [v / 1e15, 'quadrillion'] : v >= 1e12 ? [v / 1e12, 'trillion'] : v >= 1e9 ? [v / 1e9, 'billion'] : [v, ''];

  // Grades as a range on the "nines" axis (Module 01 §3.3, §6, §9.1)
  const NMAX = 11;
  const GRADES = [
    { name: 'Metallurgical (MG-Si)', lo: 1.7, hi: 2.3, purity: '98.5–99.5 %', price: '$1.5–2.5 / kg', match: N => N <= 2 },
    { name: 'Solar grade', lo: 6, hi: 8, purity: '6N–8N', price: '$5–8 / kg (China) · $19–22 / kg (non-Xinjiang)', match: N => N >= 6 && N <= 8 },
    { name: 'Electronic grade', lo: 9, hi: 11, purity: '9N–11N', price: '$20–40 / kg (contract)', match: N => N >= 9 },
  ];
  const STATUS = N => N <= 2 ? `${N}N: metallurgical silicon straight from the arc furnace (98.5–99.5 % Si) — fine for aluminium alloys and silicones, hopeless for a wafer.`
    : N <= 5 ? `${N}N: no commercial polysilicon grade lives here — the chemical route (distil trichlorosilane, then redeposit silicon) jumps from ~99 % straight to 6N and beyond.`
    : N === 6 ? '6N: solar grade, SEMI PV17 Grade III–IV (boron ≤ 1–3 ppba). With 1 ppma of boron a 6N feedstock would already be ~0.3–0.5 Ω·cm before the grower adds anything.'
    : N === 7 ? '7N: solar grade at the SEMI PV17 Grade II / III boundary — good enough for p-type PERC cells, marginal for n-type.'
    : N === 8 ? '8N: n-type solar grade (boron ≤ ~0.1 ppba, phosphorus ≤ ~0.3 ppba) — close to what counted as electronic grade in the 1990s.'
    : `${N}N: electronic grade (boron ≤ 0.02–0.05 ppba, bulk metals ≤ ~0.1–1 ppbw), sold on multi-year contracts by six producers to five wafer makers.`;

  // Reference concentrations on the log axis (atoms per cm³). `full` is two lines for wide layouts, `short` one line for phones.
  const MARKS = [
    { v: 2.5e12, full: ['electronic-grade boron', 'limit ≤ 2.5×10¹²'], short: 'EG B limit' },
    { v: 5e13, full: ['9N total impurity', '5×10¹³'], short: '9N total' },
    { v: 1.3e15, full: ['wafer boron doping', '1.3×10¹⁵ (10 Ω·cm)'], short: 'wafer B' },
    { v: 5e16, full: ['solar-grade boron', '5×10¹⁶ (1 ppma)'], short: 'solar B' },
    { v: 1e20, full: ['source/drain contact', 'doping 10²⁰'], short: 'contacts' },
    { v: 5e22, full: ['all Si atoms', '5×10²²'], short: 'Si atoms', end: true },
  ];

  window.registerWidget('purity', {
    title: 'What Nine Nines Means',
    caption: 'Drag the slider from 2N to 11N and watch the red foreign atoms vanish — then see on the log scale how far below the deliberate dopants the leftovers must sit.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      let N = 9;
      const num = (n, d) => fmt(n, d).replace(/[  ]/g, ' ');   // thousands groups that never wrap mid-number in prose
      const pow10 = n => n <= 6 ? num(Math.pow(10, n)) : '10' + sup(n);
      const slider = h('input', { type: 'range', min: 2, max: NMAX, step: 1, value: N, 'aria-label': 'Purity in nines' });
      const sliderOut = h('output');
      const ctl = h('div', { class: 'w-controls' }, h('label', { class: 'w-ctl' }, h('span', null, 'Purity'), slider, sliderOut));

      // readouts
      const stPur = h('b'), stFrac = h('b'), stAtoms = h('b'), stCube = h('b');
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, stPur, h('span', null, 'silicon purity')),
        h('div', { class: 'w-stat' }, stFrac, h('span', null, 'impurity fraction')),
        h('div', { class: 'w-stat' }, stAtoms, h('span', null, 'impurity atoms per cm³')),
        h('div', { class: 'w-stat' }, stCube, h('span', null, 'foreign atoms in a sugar cube (1 cm³)')));
      const formula = h('div', { class: 'w-formula', html: 'impurity atoms / cm³ = 5.0 × 10²² × 10<sup>−N</sup>  (N = number of nines)' });

      // ---- dot grid (canvas) ----
      const canvas = h('canvas', { style: { display: 'block', width: '100%', maxWidth: '320px', borderRadius: '4px' }, 'aria-label': 'Grid of 10 000 dots representing silicon atoms' });
      const gridNote = h('div', { class: 'w-note' });
      const gridWrap = h('div', { class: 'purity-specimen' }, canvas, gridNote);
      const specimenCount = h('b', { class: 'purity-denominator' });
      const specimenScale = h('span', { class: 'w-lab-kicker' });
      const insight = h('div', { class: 'w-insight' });
      const presets = [2, 6, 9, 11].map(value => h('button', { type: 'button', class: 'w-btn', 'data-purity': value, on: { click: () => { slider.value = value; update(); } } }, value + 'N'));
      const gctx = canvas.getContext('2d');
      const fontFam = getComputedStyle(el).fontFamily || 'sans-serif';
      let cssSize = 300;
      function rr(x, y, w, hh, r) { gctx.beginPath(); gctx.moveTo(x + r, y); gctx.arcTo(x + w, y, x + w, y + hh, r); gctx.arcTo(x + w, y + hh, x, y + hh, r); gctx.arcTo(x, y + hh, x, y, r); gctx.arcTo(x, y, x + w, y, r); gctx.closePath(); }
      function paintGrid() {
        const t = ctx.tokens();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(cssSize * dpr); canvas.height = canvas.width; canvas.style.height = cssSize + 'px';
        gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        gctx.fillStyle = t.ground; gctx.fillRect(0, 0, cssSize, cssSize);
        const level = N <= 4 ? 0 : N <= 8 ? 1 : 2;
        if (level === 0) {
          const cell = cssSize / GRID, dot = Math.max(1, cell * 0.55), off = (cell - dot) / 2;
          gctx.fillStyle = t.si; gctx.globalAlpha = 0.55;
          for (let i = 0; i < CELLS; i++) gctx.fillRect((i % GRID) * cell + off, Math.floor(i / GRID) * cell + off, dot, dot);
          gctx.globalAlpha = 1;
          const k = Math.round(CELLS * Math.pow(10, -N)), big = k <= 10;
          for (let j = 0; j < k; j++) {
            const c = IMPURITY_ORDER[j], cx = (c % GRID) * cell + cell / 2, cy = Math.floor(c / GRID) * cell + cell / 2;
            gctx.fillStyle = t.bad; gctx.beginPath(); gctx.arc(cx, cy, big ? cell * 1.6 : cell * 0.9, 0, Math.PI * 2); gctx.fill();
            if (big) { gctx.strokeStyle = t.bad; gctx.lineWidth = 1.5; gctx.beginPath(); gctx.arc(cx, cy, cell * 3.2, 0, Math.PI * 2); gctx.stroke(); }
          }
          return;
        }
        // Zoomed out: each tile is a whole 10 000-atom grid (level 1) or a wall of 10 000 such grids (level 2).
        // The tiling always holds exactly `count` tiles and fills the whole canvas: cols × rows is the
        // factor pair of count closest to square (10 → 5×2, 100 → 10×10, 1000 → 40×25, 10 000 → 100×100).
        const count = Math.pow(10, level === 1 ? N - 4 : N - 8);
        let cols = Math.ceil(Math.sqrt(count)); while (count % cols) cols++;
        const rows = count / cols, TW = cssSize / cols, TH = cssSize / rows, T = Math.min(TW, TH);
        for (let i = 0; i < count; i++) {
          const x = (i % cols) * TW, y = Math.floor(i / cols) * TH;
          gctx.globalAlpha = level === 1 ? 0.16 : 0.1; gctx.fillStyle = t.si; gctx.fillRect(x, y, TW, TH);
          gctx.globalAlpha = level === 1 ? 0.9 : 0.7; gctx.strokeStyle = level === 1 ? t.line2 : t.si; gctx.lineWidth = level === 1 ? 1 : 1.5;
          gctx.strokeRect(x + 0.5, y + 0.5, TW - 1, TH - 1);
          if (T >= 24 && level === 1) {           // dotted texture: this tile is the atom grid
            gctx.globalAlpha = 0.5; gctx.fillStyle = t.si;
            for (let yy = y + 4; yy < y + TH - 3; yy += 4) for (let xx = x + 4; xx < x + TW - 3; xx += 4) gctx.fillRect(xx, yy, 1.5, 1.5);
          } else if (T >= 24) {                    // mesh texture: this tile is a wall of grids
            const nx = Math.max(2, Math.round(5 * TW / T)), ny = Math.max(2, Math.round(5 * TH / T));
            gctx.globalAlpha = 0.35; gctx.lineWidth = 1; gctx.beginPath();
            for (let q = 1; q < nx; q++) { gctx.moveTo(x + q * TW / nx, y + 1); gctx.lineTo(x + q * TW / nx, y + TH - 1); }
            for (let q = 1; q < ny; q++) { gctx.moveTo(x + 1, y + q * TH / ny); gctx.lineTo(x + TW - 1, y + q * TH / ny); }
            gctx.stroke();
          }
        }
        gctx.globalAlpha = 1;
        // exactly one foreign atom somewhere in the picture
        const ri = Math.floor(rows / 3) * cols + Math.floor(cols / 3);
        const cx = (ri % cols) * TW + TW / 2, cy = Math.floor(ri / cols) * TH + TH / 2, r = Math.min(9, Math.max(4, T * 0.18));
        gctx.fillStyle = t.bad; gctx.beginPath(); gctx.arc(cx, cy, r, 0, Math.PI * 2); gctx.fill();
        gctx.strokeStyle = t.bad; gctx.lineWidth = 1.5; gctx.beginPath(); gctx.arc(cx, cy, r + 5, 0, Math.PI * 2); gctx.stroke();
        // caption pill inside the canvas
        const lines = level === 1 ? ['each tile = one 10 000-atom grid', `1 foreign atom in ${fmt(count)} such grids`]
          : ['each tile = 10 000 grids = 10⁸ atoms', `1 foreign atom in ${fmt(count)} such walls`];
        gctx.font = `11.5px ${fontFam}`;
        const pad = 7, lh = 14, pw = Math.ceil(Math.max(...lines.map(s => gctx.measureText(s).width)) + pad * 2), ph = lines.length * lh + 9;
        const px = cssSize - pw - 6, py = cssSize - ph - 6;
        gctx.globalAlpha = 0.94; gctx.fillStyle = t.panel; rr(px, py, pw, ph, 4); gctx.fill(); gctx.globalAlpha = 1;
        gctx.strokeStyle = t.line2; gctx.lineWidth = 1; rr(px + 0.5, py + 0.5, pw - 1, ph - 1, 4); gctx.stroke();
        gctx.fillStyle = t.ink; lines.forEach((s, i) => gctx.fillText(s, px + pad, py + 15 + i * lh));
      }
      function updateGridNote() {
        const k = Math.round(CELLS * Math.pow(10, -N));
        if (N <= 4) gridNote.textContent = `${num(k)} of these ${num(CELLS)} dots ${k === 1 ? 'is a foreign atom' : 'are foreign atoms'} (1 in ${pow10(N)}).`;
        else if (N <= 8) gridNote.textContent = `Zoomed out: no single grid holds a foreign atom any more, so each tile is now a whole ${num(CELLS)}-atom grid — it takes ${num(Math.pow(10, N - 4))} of them to hold one (1 in ${pow10(N)}).`;
        else gridNote.textContent = `Zoomed out again: each tile is now a wall of ${num(CELLS)} grids (10⁸ atoms) — it takes ${num(Math.pow(10, N - 8))} walls to hold one foreign atom (1 in ${pow10(N)}).`;
      }

      // ---- dopant log-scale (SVG laid out in real pixels, so every label is 11 px at any width) ----
      const LOG0 = 10, LOG1 = 23, AY = 44, AX0 = 30;
      const scale = svg('svg', { class: 'w-svg', viewBox: '0 0 686 150', role: 'img', 'aria-label': 'Log scale of impurity and dopant concentrations in atoms per cm³' });
      const scaleWrap = h('div', null, scale);
      const abbrKey = h('span', null, ' (EG = electronic grade, B = boron.)');
      let scaleW = 686, compact = false, xOf = () => AX0;
      const curLine = svg('line', { y1: AY - 22, y2: AY + 6, stroke: 'var(--bad)', 'stroke-width': 2 });
      const curDot = svg('circle', { cy: AY, r: 5, fill: 'var(--bad)' });
      // The label usually sits on the translucent doping band; a panel-coloured backing keeps red text at > 4.5:1 in both themes.
      const curBg = svg('rect', { y: AY - 20, height: 15, rx: 3, fill: 'var(--panel)', opacity: 0.9 });
      const curTxt = svg('text', { y: AY - 9, 'font-family': 'var(--sans)', 'font-size': 11.5, 'font-weight': 600, fill: 'var(--bad)' });
      const textW = (t, chars) => { const w = t.getComputedTextLength ? t.getComputedTextLength() : 0; return w > 0 ? w : chars * 6.1; };
      function layoutScale() {
        const W = scaleW, AX1 = W - 22, ppd = (AX1 - AX0) / (LOG1 - LOG0);
        compact = ppd < 34;
        xOf = v => AX0 + (Math.log10(v) - LOG0) * ppd;
        abbrKey.hidden = !compact;
        while (scale.firstChild) scale.removeChild(scale.firstChild);
        const F = { 'font-family': 'var(--sans)', 'font-size': 11 };
        const bx0 = xOf(1e14), bx1 = xOf(1e20);
        scale.append(svg('rect', { x: bx0, y: AY - 24, width: bx1 - bx0, height: 24, fill: 'var(--accent)', opacity: 0.18 }));
        scale.append(svg('text', Object.assign({ x: (bx0 + bx1) / 2, y: 13, 'text-anchor': 'middle', fill: 'var(--ink)' }, F),
          compact ? 'intentional doping 10¹⁴–10²⁰ cm⁻³' : 'intentional doping range 10¹⁴–10²⁰ cm⁻³ — what a wafer maker adds on purpose'));
        scale.append(svg('line', { x1: AX0, y1: AY, x2: AX1, y2: AY, stroke: 'var(--line2)', 'stroke-width': 1.5 }));
        const step = ppd >= 30 ? 1 : 2;
        for (let e = LOG0; e <= LOG1; e++) {
          const x = xOf(Math.pow(10, e));
          scale.append(svg('line', { x1: x, y1: AY, x2: x, y2: AY + 5, stroke: 'var(--line2)' }));
          if ((e - LOG0) % step === 0) scale.append(svg('text', Object.assign({ x, y: AY + 17, 'text-anchor': 'middle', fill: 'var(--muted)' }, F), '10' + sup(e)));
        }
        // Reference markers: labels are measured and packed into rows so that neither labels nor leader lines collide at any width.
        const GAP = 8, bands = [];
        const items = MARKS.map(m => ({ x: xOf(m.v), lines: compact ? [m.short] : m.full, end: m.end }));
        items.forEach((it, i) => {
          it.el = svg('text', Object.assign({ fill: 'var(--ink)' }, F));
          it.lines.forEach((ln, k) => it.el.append(svg('tspan', { x: 0, dy: k ? 13.5 : 0 }, ln)));
          scale.append(it.el);
          it.w = Math.max(...[...it.el.children].map((ts, k) => textW(ts, it.lines[k].length)));
          if (it.end) { it.anchor = 'end'; it.ax = Math.min(W - 2, it.x + 4); it.l = it.ax - it.w; it.r = it.ax; return; }
          // centre the label on its marker, but slide it so it stays clear of the neighbouring markers' leader lines when it can
          const lo = i ? items[i - 1].x + 5 : 2, hi = i < items.length - 1 ? items[i + 1].x - 5 : W - 2;
          let c = it.x;
          if (hi - lo >= it.w) c = Math.min(Math.max(c, lo + it.w / 2), hi - it.w / 2);
          c = Math.min(Math.max(c, 2 + it.w / 2), W - 2 - it.w / 2);
          it.anchor = 'middle'; it.ax = c; it.l = c - it.w / 2; it.r = c + it.w / 2;
        });
        items.forEach(it => {
          let b = 0;
          for (; b < 8; b++) {
            const row = bands[b] || [];
            const free = row.every(o => o.r + GAP <= it.l || it.r + GAP <= o.l);
            const leaderClear = bands.slice(0, b).every(rw => rw.every(o => it.x < o.l - 4 || it.x > o.r + 4));
            const underClear = bands.slice(b + 1).every(rw => rw.every(o => o.x < it.l - 4 || o.x > it.r + 4));
            if (free && leaderClear && underClear) break;
          }
          (bands[b] = bands[b] || []).push(it);
        });
        let top = AY + 26;
        bands.forEach(row => {
          row.forEach(o => {
            o.el.setAttribute('x', o.ax); o.el.setAttribute('y', top + 10); o.el.setAttribute('text-anchor', o.anchor);
            [...o.el.children].forEach(ts => ts.setAttribute('x', o.ax));
            scale.append(svg('circle', { cx: o.x, cy: AY, r: 3.5, fill: 'var(--si)' }));
            scale.append(svg('line', { x1: o.x, y1: AY, x2: o.x, y2: AY + 7, stroke: 'var(--line2)', 'stroke-dasharray': '2 2' }));
            if (top - 3 > AY + 27) scale.append(svg('line', { x1: o.x, y1: AY + 24, x2: o.x, y2: top - 3, stroke: 'var(--line2)', 'stroke-dasharray': '2 2' }));
          });
          top += Math.max(...row.map(o => o.lines.length)) * 13.5 + 9;
        });
        const H = top + 10;
        scale.append(svg('text', Object.assign({ x: (AX0 + AX1) / 2, y: H - 4, 'text-anchor': 'middle', fill: 'var(--muted)' }, F), 'concentration, atoms per cm³ (log scale)'));
        scale.setAttribute('viewBox', `0 0 ${W} ${H}`);
        scale.append(curLine, curDot, curBg, curTxt);
        updateScale();
      }
      function updateScale() {
        const v = SI_ATOMS * Math.pow(10, -N), x = xOf(v);
        curLine.setAttribute('x1', x); curLine.setAttribute('x2', x); curDot.setAttribute('cx', x);
        curTxt.textContent = compact ? `${N}N: ${sci(v)} cm⁻³` : `${N}N total impurity: ${sci(v)} cm⁻³`;
        const w = textW(curTxt, curTxt.textContent.length), right = x + 8 + w <= scaleW - 2;
        curTxt.setAttribute('x', right ? x + 8 : x - 8); curTxt.setAttribute('text-anchor', right ? 'start' : 'end');
        curBg.setAttribute('x', right ? x + 4 : x - 12 - w); curBg.setAttribute('width', w + 8);
      }
      const scaleNote = h('div', { class: 'w-note' },
        'A 10 Ω·cm p-type wafer carries 1.3 × 10¹⁵ boron atoms/cm³ on purpose — 27 ppba (parts per billion, atomic). The electronic-grade boron limit is ≤ 0.02–0.05 ppba, a thousand times lower, because boron (segregation coefficient 0.8) goes straight into the crystal and can never be removed downstream. A 6N solar feedstock with 1 ppma (part per million, atomic) of boron would already be ~0.3–0.5 Ω·cm before the grower added anything.', abbrKey);

      // ---- grades ladder (HTML rows, so the text stays 12 px and wraps on a phone) ----
      const pct = n => (n / NMAX * 100) + '%';
      const COLS = '150px minmax(120px, 1fr) minmax(0, 1.1fr)';
      const gradeRows = GRADES.map(g => {
        const fill = h('div', { style: { position: 'absolute', top: 0, bottom: 0, left: pct(g.lo), width: pct(g.hi - g.lo), borderRadius: '3px', background: 'var(--si)', opacity: 0.3 } });
        const mark = h('div', { style: { position: 'absolute', top: '-4px', bottom: '-4px', width: '2px', marginLeft: '-1px', background: 'var(--bad)' } });
        const track = h('div', { style: { position: 'relative', height: '20px', background: 'var(--ground)', borderRadius: '4px', border: '1px solid var(--line)' } }, fill, mark);
        const nameTxt = h('span', { style: { fontSize: '12.5px', color: 'var(--ink)' } }, g.name);
        const name = h('div', { style: { lineHeight: '1.3', whiteSpace: 'nowrap' } }, nameTxt, h('br'), h('b', { style: { fontFamily: 'var(--mono)', fontWeight: 600, fontSize: '11.5px', color: 'var(--ink)' } }, g.purity));
        const price = h('span', { style: { fontSize: '12px', color: 'var(--muted)' } }, g.price);
        const row = h('div', { style: { display: 'grid', alignItems: 'center', gap: '4px 14px', margin: '8px 0' } }, name, track, price);
        return { g, row, fill, mark, name: nameTxt, nameBox: name, track, price };
      });
      const axisTicks = h('div', { style: { position: 'relative', height: '16px', fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' } });
      const axisRow = h('div', { style: { display: 'grid', gap: '0 14px' } }, axisTicks);
      const gradeStatus = h('div', { class: 'w-note' });
      const grades = h('div', null, ...gradeRows.map(r => r.row), axisRow, gradeStatus);
      function layoutGrades(narrow) {
        gradeRows.forEach(r => {
          r.row.style.gridTemplateColumns = narrow ? 'max-content 1fr' : COLS;
          r.nameBox.style.gridColumn = narrow ? '1' : 'auto'; r.price.style.gridColumn = narrow ? '2' : 'auto'; r.price.style.textAlign = narrow ? 'right' : 'left';
          r.track.style.gridColumn = narrow ? '1 / -1' : 'auto'; r.track.style.gridRow = narrow ? '2' : 'auto';
        });
        axisRow.style.gridTemplateColumns = narrow ? '1fr' : COLS;
        axisTicks.style.gridColumn = narrow ? '1' : '2';
      }
      function updateBars() {
        gradeRows.forEach(r => {
          const on = r.g.match(N);
          r.fill.style.background = on ? 'var(--accent)' : 'var(--si)'; r.fill.style.opacity = on ? 0.5 : 0.3;
          r.track.style.borderColor = on ? 'var(--accent)' : 'var(--line)'; r.track.style.boxShadow = on ? '0 0 0 1px var(--accent)' : 'none';
          r.name.style.fontWeight = on ? 700 : 400;
          r.mark.style.left = pct(N);
        });
        axisTicks.innerHTML = '';
        const tick = (n, extra) => h('span', { style: Object.assign({ position: 'absolute', left: pct(n), transform: 'translateX(-50%)', top: 0, lineHeight: '16px', whiteSpace: 'nowrap' }, extra) }, n ? n + 'N' : '0');
        for (let n = 0; n <= 10; n += 2) if (Math.abs(n - N) >= 1.5) axisTicks.append(tick(n, {}));
        axisTicks.append(tick(N, { color: 'var(--bad)', fontWeight: 700 }));
        gradeStatus.textContent = STATUS(N);
      }

      function update() {
        N = +slider.value;
        sliderOut.textContent = N + 'N';
        stPur.textContent = purityStr(N);
        specimenCount.textContent = '1 in ' + pow10(N);
        specimenScale.textContent = N <= 4 ? 'Atom view · 10 000 dots' : N <= 8 ? 'Grid view · 10 000 atoms per tile' : 'Wall view · 10⁸ atoms per tile';
        insight.textContent = N >= 9 ? 'Electronic purity still leaves ' + sci(SI_ATOMS * Math.pow(10, -N)) + ' foreign atoms in every cubic centimetre. What matters is which atoms remain.' : N >= 5 ? 'The foreign atoms have not vanished. The view expands to show enough silicon to find one.' : 'Each highlighted dot is a foreign atom. Add one nine and the impurity fraction falls tenfold.';
        presets.forEach(button => button.setAttribute('aria-pressed', String(+button.dataset.purity === N)));
        stFrac.innerHTML = fractionStr(N) + ' <span style="color:var(--muted);font-weight:400">(10' + sup(-N) + ')</span>';
        const atoms = SI_ATOMS * Math.pow(10, -N);
        stAtoms.textContent = sci(atoms);
        const [val, nm] = bigName(atoms);
        stCube.textContent = fmt(val, 0) + (nm ? ' ' + nm : '');
        paintGrid(); updateGridNote(); updateScale(); updateBars();
      }
      slider.addEventListener('input', update);

      // assemble
      const h5 = txt => h('h5', { style: { margin: '18px 0 6px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' } }, txt);
      const figure = h('div', { class: 'w-studio' },
        h('div', { class: 'w-lab-kicker' }, 'The impurity budget'), specimenCount,
        h('div', { class: 'w-note' }, 'foreign atoms at the selected purity'), gridWrap, specimenScale);
      const reference = h('details', { class: 'w-details' }, h('summary', null, 'Material grades, prices and concentration references'),
        h5('The three grades — bar = purity range in nines'), grades,
        h('div', { class: 'w-note' }, 'Prices from Module 01: chemical-grade MG-Si ~$1,500–2,500/tonne; solar polysilicon ~$5–8/kg in China (2025–26) or ~$19–22/kg for documented non-Xinjiang material; electronic grade ~$20–40/kg on multi-year contracts. At 0.23 kg per 300 mm wafer, the polysilicon in a $150 wafer is worth ~$5–10.'), scaleNote);
      el.classList.add('purity-lab');
      el.append(h('style', null, '.purity-lab .purity-denominator{display:block;font:600 clamp(30px,5vw,46px)/1.1 var(--sans);letter-spacing:-.05em;color:var(--ink);margin:8px 0}.purity-lab .purity-specimen canvas{margin:22px auto 12px;border:1px solid var(--line)}.purity-lab .w-studio{gap:6px}.purity-lab .w-studio>.w-note{margin:4px 0}.purity-lab .w-console .w-readout{display:grid;gap:20px 12px}.purity-lab .w-console .w-stat{min-width:0}.purity-lab .w-console .w-ctl{grid-template-columns:1fr auto}.purity-lab .w-console .w-ctl>span{grid-column:1/-1}.purity-lab .w-console .w-step-nav{margin:14px 0}@container(min-width:600px){.purity-lab .w-workbench{grid-template-columns:minmax(0,1fr) minmax(260px,.9fr)}}.purity-lab .w-console .w-readout{grid-template-columns:repeat(2,minmax(0,1fr))}.purity-lab .w-stat b{overflow-wrap:anywhere}'),
        h('div', { class: 'w-workbench' }, figure, h('div', { class: 'w-console' }, h('div', { class: 'w-lab-kicker' }, 'Add another nine'), ctl,
          h('div', { class: 'w-step-nav', 'aria-label': 'Common purity levels' }, presets), readout, formula)), insight,
        h('section', { class: 'w-lab-section' }, h5('Unwanted impurities vs. intentional doping'), scaleWrap,
          h('div', { class: 'w-note' }, 'The same fraction, expressed as atoms per cm³. Intentional dopants set electrical behaviour; unwanted impurities need their own much tighter limits. The scale is logarithmic.')), reference);

      // Resize is deferred to the next frame: reacting synchronously inside the
      // observer callback resizes the very elements being observed (canvas height
      // follows its width, SVG height follows its label rows) and triggers the
      // browser's benign-but-noisy "ResizeObserver loop" warning.
      let rafId = 0;
      function measure() {
        const w = Math.min(320, Math.max(200, gridWrap.clientWidth || 300));
        const sw = Math.max(240, scaleWrap.clientWidth || 686);
        const changed = Math.abs(w - cssSize) > 1 || Math.abs(sw - scaleW) > 1;
        cssSize = w; scaleW = sw;
        return changed;
      }
      const ro = new ResizeObserver(() => {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => { if (measure()) { paintGrid(); layoutScale(); layoutGrades(scaleW < 520); } });
      });
      ro.observe(gridWrap); ro.observe(scaleWrap);
      ctx.onTheme(paintGrid);
      measure(); layoutGrades(scaleW < 520); layoutScale(); update();
      return () => { ro.disconnect(); cancelAnimationFrame(rafId); };
    }
  });
})();
