/* scale-ladder — "A Sense of Scale": an illustrated log₁₀ ladder from a 2 m rack down to a 0.22 nm Si atom
   (sizes from the Module 21 "Sense of scale" table). Layout is rebuilt on resize so text is always true pixels. */
(function () {
  'use strict';

  // Largest → smallest. m = characteristic size in metres; disp overrides the auto-formatted value string.
  const ITEMS = [
    { id: 'rack', label: 'NVL72 rack', m: 2, icon: 'rack', mod: 19, note: '~2 m tall, 0.6 m wide, ~1.4 t; 72 GPUs in 18 compute trays, liquid-cooled' },
    { id: 'hgx', label: 'HGX baseboard', m: 0.5, icon: 'board', mod: 19, note: '~0.5 × 0.4 m board carrying 8 SXM modules plus NVSwitches' },
    { id: 'dgx', label: 'DGX B200 server', m: 0.445, icon: 'server', mod: 19, note: '10U chassis height (1U = 44.45 mm); about 0.45 m deep' },
    { id: 'wafer', label: '300 mm wafer', m: 0.3, icon: 'wafer', mod: 3, note: 'diameter; the notch marks the <110> crystal direction' },
    { id: 'sxm', label: 'SXM module', m: 0.14, icon: 'sxm', mod: 19, note: '~140 × 80 mm: the GPU package plus its voltage regulators' },
    { id: 'pkg', label: 'GPU package', m: 0.09, icon: 'pkg', mod: 17, note: '~90 × 90 mm CoWoS-L substrate; two ~800 mm² dies and 8 HBM stacks' },
    { id: 'reticle', label: 'Reticle field', m: 0.033, icon: 'reticle', mod: 8, note: 'EUV maximum exposure field, 26 × 33 mm (858 mm²)' },
    { id: 'die', label: 'H100 die', m: 0.029, icon: 'die', mod: 19, note: '~26 × 31 mm, 814 mm² — close to the reticle limit' },
    { id: 'hbmfoot', label: 'HBM stack footprint', m: 0.011, icon: 'hbmtop', mod: 15, note: '~11 × 10 mm, 12-high HBM3E' },
    { id: 'waferthk', label: 'Wafer thickness', m: 775e-6, icon: 'slab', mod: 3, note: '775 µm as delivered; thinned to 50–200 µm in packaging' },
    { id: 'hbmh', label: 'HBM stack height', m: 720e-6, icon: 'hbmstack', mod: 15, note: '~720 µm: 12 DRAM dies plus the base die' },
    { id: 'c4', label: 'C4 bump pitch', m: 150e-6, icon: 'c4', mod: 16, note: '~100–150 µm solder bumps, die or interposer to substrate' },
    { id: 'hair', label: 'Human hair', m: 70e-6, icon: 'hair', mod: 0, note: '~70 µm diameter, for comparison' },
    { id: 'ubump', label: 'µbump pitch', m: 40e-6, icon: 'ubump', mod: 17, note: '~40 µm microbumps, die to interposer (CoWoS)' },
    { id: 'hbmthk', label: 'HBM die thickness', m: 30e-6, icon: 'thindie', mod: 15, note: '~30 µm HBM3E; 20–25 µm for HBM4 16-high' },
    { id: 'tsv', label: 'TSV diameter', m: 7e-6, icon: 'tsv', mod: 15, note: '~5–10 µm through-silicon via, aspect ratio 5–10:1' },
    { id: 'hybrid', label: 'Hybrid bond pitch', m: 6e-6, icon: 'hybrid', mod: 17, note: '~6–9 µm Cu–Cu (SoIC), no solder; roadmap to ~1 µm' },
    { id: 'rdl', label: 'RDL line/space (InFO)', m: 2e-6, icon: 'rdl', mod: 17, note: '~2 µm fan-out redistribution lines' },
    { id: 'topbeol', label: 'Top BEOL metal pitch', m: 1.5e-6, icon: 'beol', mod: 12, note: '~1–2 µm power-distribution wiring' },
    { id: 'rdlr', label: 'RDL line/space (CoWoS-R)', m: 0.4e-6, disp: '0.4 µm', icon: 'rdl', mod: 17, note: '~0.4 µm fine-line RDL on an organic interposer' },
    { id: 'cpp', label: 'Contacted poly pitch', m: 46e-9, icon: 'cpp', mod: 11, note: '~45–48 nm gate-to-gate at the 2 nm class' },
    { id: 'mfp', label: 'Cu mean free path', m: 39e-9, icon: 'mfp', mod: 12, note: 'electron scattering length; narrower lines get resistive' },
    { id: 'killer', label: 'Killer particle', m: 25e-9, icon: 'particle', mod: 13, note: '~20–30 nm: anything larger than ~half the metal pitch' },
    { id: 'mp', label: 'Metal pitch (M0/M1)', m: 24e-9, icon: 'mp', mod: 12, note: '~23–25 nm tightest pitch at N3/N2' },
    { id: 'lg', label: 'Physical gate length', m: 14e-9, icon: 'lg', mod: 11, note: '~12–16 nm at the 2 nm class' },
    { id: 'euv', label: 'EUV wavelength', m: 13.5e-9, icon: 'euv', mod: 8, note: '13.5 nm tin-plasma emission line' },
    { id: 'fin', label: 'Fin / nanosheet', m: 6e-9, icon: 'fin', mod: 11, note: '~6 nm fin width; nanosheets 5–8 nm thick' },
    { id: 'il', label: 'Gate oxide (EOT)', m: 1e-9, icon: 'oxide', mod: 11, note: '~0.8–1.0 nm equivalent; HfO₂ physically 1.5–2 nm' },
    { id: 'lattice', label: 'Si lattice constant', m: 0.543e-9, icon: 'lattice', mod: 2, note: 'diamond-cubic unit-cell edge' },
    { id: 'bond', label: 'Si–Si bond length', m: 0.235e-9, icon: 'bond', mod: 2, note: 'covalent bond' },
    { id: 'atom', label: 'Si atom', m: 0.22e-9, icon: 'atom', mod: 2, note: '~0.22 nm covalent diameter; two atoms per lattice constant along <100>' },
  ];
  ITEMS.forEach(it => { it.log = Math.log10(it.m); });
  const LOG_MAX = 1, LOG_MIN = -10;          // 10 m … 0.1 nm
  const GAP = 32;                            // minimum row pitch (px)
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sup = n => String(n).split('').map(c => SUP[+c]).join('');

  function fmtLen(m, fmt) {
    let v, u;
    if (m >= 1) { v = m; u = 'm'; } else if (m >= 1e-3) { v = m * 1e3; u = 'mm'; } else if (m >= 1e-6) { v = m * 1e6; u = 'µm'; } else { v = m * 1e9; u = 'nm'; }
    return fmt(v, v < 1 ? 3 : v < 10 ? 2 : v < 100 ? 1 : 0) + ' ' + u;
  }
  // ratio ≥ 1 → { text: '1.2 × 10⁶', words: '1.2 million' } with 2–3 significant figures, same rounding in both
  function ratioParts(r, fmt) {
    if (r < 1000) { const t = fmt(r, r < 10 ? 2 : r < 100 ? 1 : 0); return { text: t, words: t }; }
    let n = Math.floor(Math.log10(r)), mant = Math.round(r / Math.pow(10, n) * 10) / 10;
    if (mant >= 10) { mant = 1; n += 1; }
    const unit = n >= 9 ? [1e9, 'billion'] : n >= 6 ? [1e6, 'million'] : [1e3, 'thousand'];
    const w = mant * Math.pow(10, n) / unit[0];
    return { text: `${fmt(mant, 1)} × 10${sup(n)}`, words: `${fmt(w, w < 10 ? 1 : 0)} ${unit[1]}` };
  }
  const modStr = it => it.mod ? ` · Module ${String(it.mod).padStart(2, '0')}` : '';
  // Shorten a rendered <text>/<tspan> with an ellipsis until it fits maxW px (no-op when not laid out yet).
  function fit(t, maxW) {
    let w; try { w = t.getComputedTextLength(); } catch (e) { return; }
    if (!w || w <= maxW) return;
    let s = t.textContent;
    while (s.length > 2) { s = s.slice(0, -2).trimEnd(); t.textContent = s + '…'; if (t.getComputedTextLength() <= maxW) return; }
  }

  // 1-D label placement: rows sorted by true y; clusters are centred on the mean of their true positions.
  function declutter(rows, yMin, yMax, gap) {
    const place = c => { const k = c.rows.length; let s = c.sum / k - (k - 1) * gap / 2; s = Math.max(yMin, Math.min(s, yMax - (k - 1) * gap)); c.start = s; c.end = s + (k - 1) * gap; };
    let cl = rows.map(r => ({ rows: [r], sum: r.ty })); cl.forEach(place);
    for (let i = 0; i + 1 < cl.length;) {
      if (cl[i].end + gap > cl[i + 1].start + 0.01) { const c = { rows: cl[i].rows.concat(cl[i + 1].rows), sum: cl[i].sum + cl[i + 1].sum }; place(c); cl.splice(i, 2, c); i = Math.max(0, i - 1); }
      else i++;
    }
    cl.forEach(c => c.rows.forEach((r, j) => { r.y = c.start + j * gap; }));
  }

  // ---------- 24 × 24 pictograms (stroke = currentColor, fills from tokens) ----------
  const hdim = (a, x1, x2, y) => a('path', { d: `M${x1},${y} H${x2} M${x1 + 2.2},${y - 2} L${x1},${y} L${x1 + 2.2},${y + 2} M${x2 - 2.2},${y - 2} L${x2},${y} L${x2 - 2.2},${y + 2}`, 'stroke-width': 1 });
  const vdim = (a, x, y1, y2) => a('path', { d: `M${x},${y1} V${y2} M${x - 2},${y1 + 2.2} L${x},${y1} L${x + 2},${y1 + 2.2} M${x - 2},${y2 - 2.2} L${x},${y2} L${x + 2},${y2 - 2.2}`, 'stroke-width': 1 });
  const cu = { fill: 'var(--cu)', stroke: 'none' };
  const ICONS = {
    rack: a => { a('rect', { x: 6.5, y: 1.5, width: 11, height: 21, rx: 1 }); for (let i = 0; i < 6; i++) a('line', { x1: 8.5, y1: 4.5 + i * 3.2, x2: 15.5, y2: 4.5 + i * 3.2 }); },
    board: a => { a('rect', { x: 1.5, y: 4.5, width: 21, height: 15, rx: 1 }); for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) a('rect', { x: 3.6 + c * 4.6, y: 7 + r * 5.6, width: 3.4, height: 3.4, fill: 'var(--si)', stroke: 'none' }); },
    server: a => { a('rect', { x: 1.5, y: 8, width: 21, height: 8, rx: 1 }); a('circle', { cx: 5, cy: 12, r: 1.1, fill: 'currentColor', stroke: 'none' }); a('circle', { cx: 8.5, cy: 12, r: 1.1, fill: 'currentColor', stroke: 'none' }); for (let i = 0; i < 4; i++) a('line', { x1: 14 + i * 2, y1: 10, x2: 14 + i * 2, y2: 14 }); },
    wafer: a => a('path', { d: 'M14,22.1 A10.5,10.5 0 1 0 10,22.1 L12,19.6 Z', fill: 'var(--si)', 'fill-opacity': 0.25 }),
    sxm: a => { a('rect', { x: 1.5, y: 5, width: 21, height: 14, rx: 1 }); a('rect', { x: 4, y: 7.5, width: 9, height: 9 }); a('rect', { x: 6.5, y: 10, width: 4, height: 4, fill: 'var(--si)', stroke: 'none' }); for (let i = 0; i < 3; i++) a('rect', Object.assign({ x: 15.5, y: 7.6 + i * 3.2, width: 5, height: 2.2 }, cu)); },
    pkg: a => { a('rect', { x: 1.5, y: 1.5, width: 21, height: 21, rx: 1 }); a('rect', { x: 8.5, y: 8.5, width: 7, height: 7, fill: 'var(--si)', stroke: 'none' }); for (let i = 0; i < 4; i++) { a('rect', { x: 3.5, y: 3.5 + i * 4.4, width: 3.4, height: 3.4, fill: 'var(--muted)', stroke: 'none' }); a('rect', { x: 17.1, y: 3.5 + i * 4.4, width: 3.4, height: 3.4, fill: 'var(--muted)', stroke: 'none' }); } },
    reticle: a => { a('rect', { x: 5, y: 1.5, width: 14, height: 21, 'stroke-dasharray': '2 1.5' }); a('path', { d: 'M12,9 V15 M9,12 H15' }); },
    die: a => { a('rect', { x: 4, y: 4, width: 16, height: 16, fill: 'var(--si)', 'fill-opacity': 0.25 }); a('path', { d: 'M1.5,5.5 V1.5 H5.5 M18.5,1.5 H22.5 V5.5 M22.5,18.5 V22.5 H18.5 M5.5,22.5 H1.5 V18.5' }); },
    hbmtop: a => { a('rect', { x: 3.5, y: 4, width: 17, height: 16, rx: 1, fill: 'var(--muted)', 'fill-opacity': 0.35 }); for (let i = 0; i < 3; i++) a('line', { x1: 6.5, y1: 8 + i * 4, x2: 17.5, y2: 8 + i * 4 }); },
    slab: a => { a('rect', { x: 1.5, y: 9.5, width: 17, height: 5, fill: 'var(--si)', 'fill-opacity': 0.4 }); vdim(a, 21.5, 9.5, 14.5); },
    hbmstack: a => { for (let i = 0; i < 4; i++) a('rect', { x: 5, y: 3.5 + i * 3.9, width: 14, height: 2.6, fill: 'var(--muted)', 'fill-opacity': 0.5 }); a('rect', { x: 3, y: 19.5, width: 18, height: 3, fill: 'var(--si)', 'fill-opacity': 0.5 }); },
    c4: a => { a('rect', { x: 2, y: 3.5, width: 20, height: 6, fill: 'var(--si)', 'fill-opacity': 0.3 }); for (let i = 0; i < 3; i++) a('path', { d: `M${3 + i * 7},9.5 a3,3 0 0 0 6,0 Z`, fill: 'var(--cu)', 'fill-opacity': 0.7 }); a('rect', { x: 1.5, y: 15, width: 21, height: 5, fill: 'var(--ok)', 'fill-opacity': 0.25 }); },
    hair: a => a('path', { d: 'M1.5,15 C5,6 8,20 12,11 S18,6 22.5,13', 'stroke-width': 2.2 }),
    ubump: a => { a('rect', { x: 2, y: 3.5, width: 20, height: 6, fill: 'var(--si)', 'fill-opacity': 0.3 }); for (let i = 0; i < 6; i++) a('circle', Object.assign({ cx: 4 + i * 3.2, cy: 11.4, r: 1.5 }, cu)); a('rect', { x: 2, y: 13.5, width: 20, height: 6, fill: 'var(--si)', 'fill-opacity': 0.3 }); },
    thindie: a => { a('rect', { x: 1.5, y: 10.8, width: 17, height: 2.4, fill: 'var(--muted)', 'fill-opacity': 0.7 }); vdim(a, 21.5, 8, 16); },
    tsv: a => { a('rect', { x: 2, y: 6, width: 20, height: 12, fill: 'var(--si)', 'fill-opacity': 0.25 }); for (let i = 0; i < 3; i++) a('rect', Object.assign({ x: 5.5 + i * 5.5, y: 6, width: 2.6, height: 12 }, cu)); },
    hybrid: a => { a('rect', { x: 2, y: 3, width: 20, height: 8.5, fill: 'var(--si)', 'fill-opacity': 0.25 }); a('rect', { x: 2, y: 12.5, width: 20, height: 8.5, fill: 'var(--si)', 'fill-opacity': 0.25 }); for (let i = 0; i < 4; i++) a('rect', Object.assign({ x: 3.8 + i * 4.8, y: 9.3, width: 2.4, height: 5.4 }, cu)); },
    rdl: a => { for (let i = 0; i < 3; i++) a('rect', Object.assign({ x: 2, y: 4.5 + i * 5.5, width: 20, height: 3 }, cu)); },
    beol: a => { a('rect', Object.assign({ x: 2, y: 4, width: 20, height: 6 }, cu)); a('rect', Object.assign({ x: 2, y: 14, width: 20, height: 6 }, cu)); },
    mfp: a => { a('rect', { x: 2, y: 7, width: 20, height: 10, fill: 'var(--cu)', 'fill-opacity': 0.45, stroke: 'none' }); a('path', { d: 'M3,12 L7,9 L10,15 L14,9 L17,14.5 L21,11', 'stroke-width': 1 }); a('circle', { cx: 21, cy: 11, r: 1.4, fill: 'currentColor', stroke: 'none' }); },
    particle: a => { a('rect', Object.assign({ x: 2, y: 5, width: 20, height: 3.5 }, cu)); a('rect', Object.assign({ x: 2, y: 15.5, width: 20, height: 3.5 }, cu)); a('path', { d: 'M9,8 C7,10 8,15 11,16 C14,17 17,14 16,11 C15,8 11,6 9,8 Z', fill: 'var(--bad)', 'fill-opacity': 0.8 }); },
    mp: a => { for (let i = 0; i < 3; i++) a('rect', Object.assign({ x: 2.5 + i * 8, y: 8, width: 3, height: 14 }, cu)); hdim(a, 4, 12, 4); },
    cpp: a => { a('line', { x1: 1.5, y1: 21.5, x2: 22.5, y2: 21.5 }); a('rect', { x: 5, y: 7, width: 4, height: 14.5, fill: 'var(--muted)', 'fill-opacity': 0.7 }); a('rect', { x: 15, y: 7, width: 4, height: 14.5, fill: 'var(--muted)', 'fill-opacity': 0.7 }); hdim(a, 7, 17, 3.5); },
    lg: a => { a('line', { x1: 1.5, y1: 19, x2: 22.5, y2: 19 }); a('rect', { x: 8.5, y: 4, width: 7, height: 15, fill: 'var(--muted)', 'fill-opacity': 0.7 }); hdim(a, 8.5, 15.5, 22); },
    euv: a => { a('path', { d: 'M1.5,11 C4,2 4,2 6.5,11 S9,20 11.5,11 S14,2 16.5,11 S19,20 21.5,11', stroke: 'var(--accent2)', 'stroke-width': 1.6 }); hdim(a, 1.5, 11.5, 22.5); },
    fin: a => { a('rect', { x: 2, y: 18, width: 20, height: 4, fill: 'var(--si)', 'fill-opacity': 0.3 }); a('rect', { x: 10.5, y: 3, width: 3, height: 15, fill: 'var(--si)', 'fill-opacity': 0.7 }); },
    oxide: a => { a('rect', { x: 2, y: 2.5, width: 20, height: 8, fill: 'var(--muted)', 'fill-opacity': 0.5 }); a('rect', { x: 2, y: 13.5, width: 20, height: 8, fill: 'var(--si)', 'fill-opacity': 0.3 }); a('rect', { x: 2, y: 11, width: 20, height: 2, fill: 'var(--accent)', stroke: 'none' }); },
    lattice: a => { a('rect', { x: 3.5, y: 3.5, width: 17, height: 17 }); [[3.5, 3.5], [20.5, 3.5], [3.5, 20.5], [20.5, 20.5]].forEach(p => a('circle', { cx: p[0], cy: p[1], r: 2.2, fill: 'var(--si)' })); a('circle', { cx: 12, cy: 12, r: 2.4, fill: 'var(--si)' }); },
    bond: a => { a('line', { x1: 6, y1: 12, x2: 18, y2: 12, 'stroke-width': 1.8 }); a('circle', { cx: 6, cy: 12, r: 3.8, fill: 'var(--si)' }); a('circle', { cx: 18, cy: 12, r: 3.8, fill: 'var(--si)' }); },
    atom: a => { a('circle', { cx: 12, cy: 12, r: 6, fill: 'var(--si)', 'fill-opacity': 0.6 }); a('circle', { cx: 12, cy: 12, r: 1.5, fill: 'currentColor', stroke: 'none' }); },
  };

  window.registerWidget('scale-ladder', {
    title: 'A Sense of Scale',
    caption: 'Compare two physical dimensions, then see the powers of ten between them. Change either object or open the full scale atlas to explore the complete journey.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const size = it => it.disp || fmtLen(it.m, fmt);
      const byId = id => ITEMS.find(x => x.id === id);

      // ---------- controls ----------
      const selStyle = { minWidth: 0, width: '100%' };            // let the grid cell shrink below the widest option
      const selA = h('select', { 'aria-label': 'Item A', style: selStyle }), selB = h('select', { 'aria-label': 'Item B', style: selStyle });
      ITEMS.forEach(it => { selA.append(h('option', { value: it.id }, it.label)); selB.append(h('option', { value: it.id }, it.label)); });   // the <output> beside each menu shows the size
      selA.value = 'die'; selB.value = 'mp';
      const outA = h('output'), outB = h('output');
      const ctl = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Compare A'), selA, outA),
        h('label', { class: 'w-ctl' }, h('span', null, 'with B'), selB, outB));

      // ---------- static DOM ----------
      const ladder = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Logarithmic ladder from 10 metres to 0.1 nanometre with 31 objects from the chip-making chain' });
      const ratioSvg = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'How many of the smaller item fit in the larger' });
      const stBig = h('b'), stSmall = h('b'), stRatio = h('b'), stDec = h('b'), lbBig = h('span'), lbSmall = h('span');
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, stBig, lbBig),
        h('div', { class: 'w-stat' }, stSmall, lbSmall),
        h('div', { class: 'w-stat' }, stRatio, h('span', null, 'larger ÷ smaller')),
        h('div', { class: 'w-stat' }, stDec, h('span', null, 'decades apart = log₁₀(ratio)')));
      const sentence = h('div', { class: 'w-insight', 'aria-live': 'polite' });
      const pair = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' } });
      const context = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Selected dimensions on a logarithmic scale' });
      const noteA = h('div'), noteB = h('div');
      const formula = h('div', { class: 'w-formula' }, 'ratio = larger ÷ smaller = 10^(log₁₀ larger − log₁₀ smaller)', h('br'), 'decades apart = log₁₀(ratio)');
      const studio = h('div', { class: 'w-studio' }, h('div', { class: 'w-figure-title' }, 'From the familiar to the almost invisible'), pair, sentence, context);
      const reference = h('details', { class: 'w-reference', 'data-reference': 'atlas' }, h('summary', null, 'Open the complete scale atlas · all 31 dimensions'),
        h('div', { class: 'w-note' }, 'Each rung is ×10. Click a dimension to set A, then another to set B; shift-click sets B directly. Every marker uses its true logarithmic position.'), ladder);
      el.append(studio, h('div', { class: 'w-console' }, ctl), h('div', { class: 'w-note' }, noteA, noteB),
        h('details', { class: 'w-reference' }, h('summary', null, 'How the comparison is calculated'), readout, ratioSvg, formula),
        reference, h('div', { class: 'w-note' }, 'Dimensions are representative values from Module 21. Object illustrations identify the structure; they are not drawn to a shared physical scale.'));
      reference.addEventListener('toggle', () => { if (reference.open) { build(); update(); } });

      // ---------- ladder (rebuilt whenever the container width changes) ----------
      let W = 0, wide = false, AX = 64, rows = [], selLayer = null, bandEl = null, nextSlot = 'A';

      function build() {
        const n = ITEMS.length, H = n * GAP + 60, AY0 = 30, AY1 = H - 30;
        wide = W >= 520; AX = wide ? 150 : 60;
        const yOf = lg => AY0 + (LOG_MAX - lg) / (LOG_MAX - LOG_MIN) * (AY1 - AY0);
        ladder.replaceChildren();
        ladder.setAttribute('viewBox', `0 0 ${W} ${H}`);
        bandEl = svg('rect', { x: 0, y: 0, width: W, height: 0, fill: 'var(--accent)', 'fill-opacity': 0.12 });
        ladder.append(bandEl);
        for (let e = LOG_MAX; e >= LOG_MIN; e--) {                      // decade rungs on the left rail; the label sits above its rung
          const y = yOf(e);                                              // (rungs stop before the item column so no line ever crosses text)
          ladder.append(svg('line', { x1: 6, y1: y, x2: AX + 12, y2: y, stroke: 'var(--line)', 'stroke-width': 1 }));
          ladder.append(svg('text', { x: AX - 10, y: y - 4, 'text-anchor': 'end', 'font-family': 'var(--mono)', 'font-size': 11, fill: 'var(--muted)' }, fmtLen(Math.pow(10, e), fmt)));
        }
        ladder.append(svg('line', { x1: AX, y1: AY0, x2: AX, y2: AY1, stroke: 'var(--muted)', 'stroke-width': 1.5 }));

        rows = ITEMS.map(it => ({ it, ty: yOf(it.log), y: 0 }));
        declutter(rows, AY0 + 10, AY1 - 10, GAP);
        const rowsG = svg('g', { class: 'rows' }), dotsG = svg('g', { class: 'dots' });
        const tx = AX + 56, maxTextW = W - tx - 4, fits = [];
        rows.forEach(r => {
          const it = r.it, tip = `${it.label} — ${size(it)}. ${it.note}${it.mod ? ' (Module ' + String(it.mod).padStart(2, '0') + ')' : ''}`;
          const g = svg('g', { class: 'sl-item', style: { cursor: 'pointer' } });
          g.append(svg('title', null, tip));
          const hit = svg('rect', { x: AX + 14, y: r.y - GAP / 2, width: W - AX - 14, height: GAP, rx: 4, fill: 'var(--ink)', 'fill-opacity': 0 });
          g.append(hit);                                                 // hit area; tinted on hover
          g.append(svg('path', { d: `M${AX},${r.ty} H${AX + 8} L${AX + 18},${r.y} H${AX + 22}`, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 0.9, 'stroke-dasharray': '2 2', opacity: 0.7 }));
          const ig = svg('g', { transform: `translate(${AX + 24},${r.y - 12})`, stroke: 'currentColor', 'stroke-width': 1.2, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round', style: { color: 'var(--ink)' } });
          ICONS[it.icon]((tag, attrs) => ig.append(svg(tag, attrs)));
          g.append(ig);
          const nameSpan = svg('tspan', { 'font-family': 'var(--sans)', 'font-size': 12, 'font-weight': 600, fill: 'var(--ink)' }, it.label);
          const valSpan = svg('tspan', { 'font-family': 'var(--mono)', 'font-size': 11, fill: 'var(--muted)' }, size(it));
          const t1 = svg('text', { x: tx, y: r.y - 2 }, nameSpan);
          if (wide) { valSpan.setAttribute('dx', 8); t1.append(valSpan); }
          g.append(t1);
          if (wide) { const nt = svg('text', { x: tx, y: r.y + 11, 'font-family': 'var(--sans)', 'font-size': 11, fill: 'var(--muted)' }, it.note); g.append(nt); fits.push(nt); }
          else { valSpan.setAttribute('x', tx); valSpan.setAttribute('y', r.y + 11); g.append(svg('text', null, valSpan)); fits.push(nameSpan); }
          const dg = svg('g', { style: { cursor: 'pointer' } }, svg('title', null, tip),
            svg('circle', { cx: AX, cy: r.ty, r: 9, fill: 'var(--panel)', 'fill-opacity': 0 }));
          const dot = svg('circle', { cx: AX, cy: r.ty, r: 3.5, fill: 'var(--si)' });
          dg.append(dot);
          Object.assign(r, { g, ig, nameSpan, dot, hit });
          const enter = () => hover(r, true), leave = () => hover(r, false), click = ev => pick(it.id, ev.shiftKey);
          [g, dg].forEach(x => { x.addEventListener('mouseenter', enter); x.addEventListener('mouseleave', leave); x.addEventListener('click', click); });
          rowsG.append(g); dotsG.append(dg);
        });
        selLayer = svg('g', { class: 'sel', 'pointer-events': 'none' });
        ladder.append(rowsG, dotsG, selLayer);
        fits.forEach(t => fit(t, maxTextW));                             // measured after insertion: trim only what really overflows
      }

      function hover(r, on) {
        r.dot.setAttribute('r', on ? 5 : 3.5);
        r.nameSpan.setAttribute('text-decoration', on ? 'underline' : 'none');
        r.hit.setAttribute('fill-opacity', on ? 0.07 : 0);
      }
      function pick(id, toB) {
        if (toB || nextSlot === 'B') { selB.value = id; nextSlot = 'A'; } else { selA.value = id; nextSlot = 'B'; }
        update();
      }

      function paintSel() {
        const a = byId(selA.value), b = byId(selB.value), same = a === b;
        selLayer.replaceChildren();
        rows.forEach(r => {
          const tag = r.it === a ? (same ? 'AB' : 'A') : r.it === b ? 'B' : null;
          r.ig.style.color = tag ? 'var(--accent)' : 'var(--ink)';
          r.nameSpan.setAttribute('fill', tag ? 'var(--accent)' : 'var(--ink)');
          r.dot.setAttribute('fill', tag ? 'var(--accent)' : 'var(--si)');
          if (!tag) return;
          const bw = tag.length > 1 ? 20 : 16, bx = AX + 22 - bw;
          selLayer.append(svg('rect', { x: bx, y: r.y - 8, width: bw, height: 16, rx: 3, fill: 'var(--accent)' }));
          selLayer.append(svg('text', { x: bx + bw / 2, y: r.y + 4, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 11, 'font-weight': 700, fill: 'var(--panel)' }, tag));
        });
        const ra = rows.find(r => r.it === a), rb = rows.find(r => r.it === b);
        const y1 = Math.min(ra.ty, rb.ty), y2 = Math.max(ra.ty, rb.ty);
        const ring = (cy, ry) => svg('ellipse', { cx: AX, cy, rx: 7, ry, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.6 });
        if (same) { bandEl.setAttribute('height', 0); selLayer.append(ring(ra.ty, 7)); }
        else if (y2 - y1 < 8) {                                          // near pair: one ring around both + a bracket, no band
          bandEl.setAttribute('height', 0);
          selLayer.append(ring((y1 + y2) / 2, (y2 - y1) / 2 + 7));
          selLayer.append(svg('path', { d: `M${AX - 3},${y1 - 11} H${AX - 8} V${y2 + 11} H${AX - 3}`, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.6 }));
        } else {
          bandEl.setAttribute('y', y1); bandEl.setAttribute('height', y2 - y1);
          selLayer.append(ring(ra.ty, 7), ring(rb.ty, 7));
        }
      }

      function drawRatio(big, small, ratio, same) {
        const x0 = 8, x1 = W - 8, bw = x1 - x0, y = 28, bh = 22;
        ratioSvg.setAttribute('viewBox', `0 0 ${W} 90`);
        ratioSvg.replaceChildren();
        const T = (x, yy, s, o) => { const t = svg('text', Object.assign({ x, y: yy, 'font-family': 'var(--sans)', 'font-size': 11, fill: 'var(--muted)' }, o || {}), s); ratioSvg.append(t); if (x === x0) fit(t, bw); return t; };
        const M = { 'font-family': 'var(--mono)', fill: 'var(--ink)', 'text-anchor': 'middle' };
        T(x0, 14, `One ${big.label} (${size(big)})${same ? '' : ' ='}`, { 'font-size': 12, 'font-weight': 600, fill: 'var(--ink)' });
        if (same) {
          ratioSvg.append(svg('rect', { x: x0, y, width: bw, height: bh, fill: 'var(--si)', 'fill-opacity': 0.3, stroke: 'var(--ink)', 'stroke-width': 0.8 }));
          T(x0, 68, 'A and B are the same item — nothing to compare yet.');
          return;
        }
        const rp = ratioParts(ratio, fmt);
        if (ratio <= 40) {                                               // draw the smaller item laid end to end
          const k = Math.floor(ratio + 1e-9), seg = bw / ratio, remW = bw - k * seg;
          for (let i = 0; i < k; i++) ratioSvg.append(svg('rect', { x: x0 + i * seg, y, width: seg, height: bh, fill: 'var(--si)', 'fill-opacity': i % 2 ? 0.22 : 0.42, stroke: 'var(--ink)', 'stroke-width': 0.8 }));
          if (remW > 0.5) ratioSvg.append(svg('rect', { x: x0 + k * seg, y, width: remW, height: bh, fill: 'var(--accent)', 'fill-opacity': 0.4, stroke: 'var(--ink)', 'stroke-width': 0.8 }));
          T(x0, 68, `= ${rp.text} × ${small.label} (${size(small)})`);
          T(x0, 83, `laid end to end${remW > 0.5 ? '; amber = the leftover fraction' : ''}`);
        } else {                                                          // one box per decade on a log scale
          let n = Math.floor(Math.log10(ratio)), rem = ratio / Math.pow(10, n);
          if (rem >= 9.95) { n += 1; rem = 1; }
          const u = bw / Math.log10(ratio), rw = u * Math.log10(rem), remBox = rem >= 1.05;
          for (let i = 0; i < n; i++) {
            ratioSvg.append(svg('rect', { x: x0 + i * u, y, width: u, height: bh, fill: 'var(--si)', 'fill-opacity': i % 2 ? 0.22 : 0.42, stroke: 'var(--ink)', 'stroke-width': 0.8 }));
            if (u >= 26) T(x0 + (i + 0.5) * u, y + 15, '×10', M);
          }
          if (remBox) {
            ratioSvg.append(svg('rect', { x: x0 + n * u, y, width: rw, height: bh, fill: 'var(--accent)', 'fill-opacity': 0.4, stroke: 'var(--ink)', 'stroke-width': 0.8 }));
            if (rw >= 34) T(x0 + n * u + rw / 2, y + 15, '×' + fmt(rem, 1), M);
            else T(x1, y - 4, '×' + fmt(rem, 1), { 'font-family': 'var(--mono)', fill: 'var(--ink)', 'text-anchor': 'end' });
          }
          T(x0, 68, `= ${rp.text} × ${small.label} (${size(small)})`);
          T(x0, 83, wide ? `${n} boxes of ×10${remBox ? ' + a final ×' + fmt(rem, 1) : ''} — one box per decade of the ladder`
            : `${n} boxes of ×10${remBox ? ' + ×' + fmt(rem, 1) : ''}; each box = one decade`);
        }
      }

      function paintReadout() {
        const a = byId(selA.value), b = byId(selB.value), same = a === b;
        outA.textContent = size(a); outB.textContent = size(b);
        const big = a.m >= b.m ? a : b, small = big === a ? b : a, ratio = big.m / small.m;
        stBig.textContent = size(big); stSmall.textContent = size(small);
        lbBig.textContent = same ? `A: ${a.label}` : `larger (${big === a ? 'A' : 'B'}: ${big.label})`;
        lbSmall.textContent = same ? `B: ${b.label}` : `smaller (${small === a ? 'A' : 'B'}: ${small.label})`;
        if (same) { stRatio.textContent = '—'; stDec.textContent = '—'; sentence.textContent = 'Pick two different items to compare.'; }
        else {
          const rp = ratioParts(ratio, fmt), dec = Math.log10(ratio), decS = fmt(dec, dec < 1 ? 2 : 1);
          stRatio.textContent = rp.text; stDec.textContent = decS;
          sentence.textContent = `About ${rp.words} copies of "${small.label}" (${size(small)}) laid end to end span one "${big.label}" (${size(big)}) — ${decS} decades on the ladder.`;
        }
        noteA.replaceChildren(h('b', null, 'A — '), `${a.label} (${size(a)}): ${a.note}${modStr(a)}`);
        noteB.replaceChildren(h('b', null, 'B — '), `${b.label} (${size(b)}): ${b.note}${modStr(b)}`);
        pair.replaceChildren(...[a, b].map((it, index) => {
          const drawing = svg('svg', { viewBox: '0 0 28 28', width: '100%', height: '112', 'aria-hidden': 'true', style: { display: 'block', maxWidth: '160px', margin: '10px auto' } });
          const ig = svg('g', { transform: 'translate(2 2)', stroke: 'var(--ink)', 'stroke-width': .9, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
          ICONS[it.icon]((tag, attrs) => ig.append(svg(tag, attrs))); drawing.append(ig);
          return h('div', { style: { minWidth: '0', padding: '12px', border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: '8px' } },
            h('div', { class: 'w-figure-title' }, index ? 'B · Compare with' : 'A · Start here'), drawing,
            h('b', { style: { display: 'block', fontFamily: 'var(--mono)', fontSize: '23px', color: index ? 'var(--si)' : 'var(--accent)' } }, size(it)),
            h('span', { style: { display: 'block', marginTop: '5px' } }, it.label));
        }));
        // Uniform log axis preserves the actual distance between selected dimensions.
        const cw = Math.max(240, W - 36), x0 = 18, x1 = cw - 18, mapX = m => x0 + (Math.log10(m) + 10) / 11 * (x1 - x0);
        context.setAttribute('viewBox', `0 0 ${cw} 104`); context.replaceChildren();
        context.append(svg('line', { x1: x0, x2: x1, y1: 44, y2: 44, stroke: 'var(--line)', 'stroke-width': 2 }));
        for (let e = -10; e <= 1; e++) context.append(svg('line', { x1: mapX(10 ** e), x2: mapX(10 ** e), y1: 40, y2: 50, stroke: 'var(--muted)' }));
        for (const [value, text, anchor] of [[1e-10, '0.1 nm', 'start'], [1e-4, '100 µm', 'middle'], [10, '10 m', 'end']]) context.append(svg('text', { x: mapX(value), y: 72, 'font-size': 12, 'font-family': 'var(--mono)', fill: 'var(--muted)', 'text-anchor': anchor }, text));
        context.append(svg('line', { x1: mapX(a.m), x2: mapX(b.m), y1: 44, y2: 44, stroke: 'var(--accent)', 'stroke-width': 5 }));
        [a, b].forEach((it, index) => {
          const x = mapX(it.m), y = index ? 90 : 20;
          context.append(svg('circle', { cx: x, cy: 44, r: 5, fill: index ? 'var(--si)' : 'var(--accent)', stroke: 'var(--panel)', 'stroke-width': 2 }),
            svg('text', { x, y, 'font-family': 'var(--mono)', 'font-size': 13, 'font-weight': 700, 'text-anchor': 'middle', fill: index ? 'var(--si)' : 'var(--accent)' }, index ? 'B' : 'A'));
        });
        drawRatio(big, small, ratio, same);
      }
      function update() { paintSel(); paintReadout(); }
      selA.addEventListener('change', update); selB.addEventListener('change', update);

      // ---------- responsive: viewBox width == CSS width so 11–12 px text is real pixels ----------
      let rafId = 0;
      function relayout(w) { if (!w || w < 200 || Math.abs(w - W) < 2) return; W = w; build(); update(); }
      relayout(Math.round(ladder.getBoundingClientRect().width) || 700);
      const ro = new ResizeObserver(entries => {
        const w = Math.round(entries[0].contentRect.width);
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => { rafId = 0; relayout(w); });
      });
      ro.observe(el);
      return () => { ro.disconnect(); if (rafId) cancelAnimationFrame(rafId); };
    }
  });
})();
