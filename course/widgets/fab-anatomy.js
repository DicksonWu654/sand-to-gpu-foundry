/* Widget: fab-anatomy — "Anatomy of a Fab Building" (Module 05) */
(function () {
  'use strict';

  const CEIL_M = 4;                 // ballroom ceiling height used for the crossing-time readout (module: 3.5–4.5 m)
  const SETTLE_MS = 8e-6;           // Stokes settling velocity of a 0.5 µm unit-density particle, m/s
  const WAFER_M2 = Math.PI * 0.15 * 0.15; // 300 mm wafer area
  const SPEEDUP = 4;                // animation runs 4× faster than the real 0.45 m/s downflow
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // ISO 14644-1: max particles ≥ D µm per m³; the standard rounds to 3 significant figures (ISO 5 at 0.5 µm → 3 520)
  const conc = (N, D) => { const c = Math.pow(10, N) * Math.pow(0.1 / D, 2.08); const m = Math.pow(10, Math.floor(Math.log10(c)) - 2); const r = Math.round(c / m) * m; return r >= 1 ? Math.round(r) : r; };
  const ISO_WHERE = {
    1: ['Wafer-handling mini-environments: the cleanest air in the fab', '(none)'],
    2: ['EFEM (the tool front end) / mini-environments', '(none)'],
    3: ['Mini-environments, litho tracks', 'Class 1'],
    4: ['Litho-bay ballroom in some fabs', 'Class 10'],
    5: ['Ballroom of a FOUP-based fab', 'Class 100'],
    6: ['Ballroom / less critical areas', 'Class 1 000'],
    7: ['Sub-fab, gowning rooms', 'Class 10 000'],
    8: ['Sub-fab, utility areas', 'Class 100 000'],
  };
  // name, key number, plain-language role
  const PARTS = {
    mau: ['Make-up air unit (MAU)', 'only 10–20% of the air is fresh', 'Takes in outside air and filters, cools or heats, dries or humidifies and chemically scrubs it. Make-up air only replaces what the exhaust stacks remove; the rest recirculates, because conditioning outside air to cleanroom spec is expensive.'],
    chem: ['Chemical (AMC) filter', 'ppb–ppt molecular control', 'Activated carbon and ion-exchange media remove airborne molecular contamination (AMC): ammonia, acids, organics. Fibre filters cannot stop molecules, and one ppb of ammonia in the litho bay shifts the printed line width.'],
    fans: ['Recirculation fans → supply plenum', '~400 air changes per hour', 'Fans push the air into the supply plenum, a sealed space that acts as a manifold: one duct fills it and it feeds hundreds of ceiling filters at equal pressure.'],
    plenum: ['Interstitial (ceiling) plenum', 'services + OHT rail hangers', '"Interstitial" means in between: a service space above the cleanroom ceiling for ducting, sprinkler mains, cable trays and the hangers that carry the overhead rails.'],
    ffu: ['Fan-filter unit (FFU) ceiling', 'ULPA ≥ 99.9995% at 0.1–0.2 µm', 'Each 1.2 × 0.6 m module holds a brushless EC fan and a ULPA filter. Air leaves the ceiling as a unidirectional downflow at 0.3–0.5 m/s; a GigaFab has tens of thousands of FFUs at 100–300 W each.'],
    ballroom: ['Cleanroom ballroom', 'ISO 5: ≤ 3 520 particles ≥ 0.5 µm per m³', 'One large open cleanroom (40 000–50 000 m² per GigaFab phase) where tools stand in rows. Wafers never see this air: they ride in sealed FOUPs, so the room only has to protect tools, cables and people.'],
    oht: ['Overhead hoist transport (OHT)', 'up to ~5 m/s; 1 000–3 000+ vehicles', 'Ceiling-rail vehicles powered by contactless induction carry one FOUP each and lower it onto a load port with a belt hoist: ~6 600 deliveries an hour. No human carries a wafer.'],
    foup: ['FOUP', '25 wafers; ~15 000–20 000 boxes per GigaFab', 'Front-opening unified pod: a sealed, nitrogen-purged polycarbonate box holding 25 wafers. The cleanroom is inside the box; the ballroom never touches a wafer.'],
    efem: ['Load port + EFEM (mini-environment)', 'ISO 1–3', 'The equipment front-end module docks the FOUP, unlatches its door from inside and moves wafers with a robot under its own ULPA filter. Only this small volume has to be extremely clean.'],
    scanner: ['EUV scanner', '$180–220 M; 1–1.4 MW; ~1–2 nm overlay', 'The bottleneck tool, ~30–40 per fab. It positions the wafer to ~1 nm, so it stands on active pneumatic isolators on a floor built to VC-D/VC-E (6.25 / 3.1 µm/s).'],
    track: ['Coat / develop track', 'litho cell partner', 'Spins resist onto the wafer, bakes it, hands it to the scanner and develops it afterwards; linked to the scanner so wafers never wait in the open.'],
    etch: ['Plasma etch cluster', 'RF plasma in vacuum', 'Several vacuum chambers around one robot. Its RF generators, match networks, pumps and abatement live directly below in the sub-fab, connected through the slab.'],
    cvd: ['Deposition (CVD / ALD)', 'toxic and pyrophoric gases', 'Grows thin films from gases such as SiH₄ and WF₆ that arrive from sub-fab gas cabinets through double-walled lines; the exhaust goes to point-of-use abatement.'],
    floor: ['Perforated raised floor', '~15–25% open area', 'Steel or aluminium tiles on pedestals. Air falls through before particles can drift sideways to a neighbouring tool, then drops through the waffle-slab openings into the sub-fab.'],
    slab: ['Waffle slab', '1–1.5 m thick; VC-D / VC-E floor', 'A grid of concrete ribs with square openings, structurally isolated from the building shell. Mass, stiffness and isolation keep floor vibration below 6.25 µm/s; the openings pass return air, pipes and cables.'],
    subfab: ['Sub-fab (return plenum)', 'ISO 7–8: 100–1 000× dirtier than the ballroom', 'The dirty, noisy half of every tool lives here, and the space doubles as the return plenum: air collects here and is pulled back up the shafts to the fan deck.'],
    pumps: ['Vacuum pumps', 'Edwards, Ebara', 'Dry pumps for every process chamber upstairs, on isolated pads so their vibration stays out of the slab; often integrated with abatement.'],
    rf: ['RF generators + match networks', 'plasma power', 'Plasma tools sustain an ionized gas with RF power; the match network retunes continuously so the power goes into the plasma instead of reflecting back.'],
    gas: ['Gas and chemical cabinets / VMBs', 'NF₃, WF₆, SiH₄, Cl₂, PH₃ …', 'Specialty-gas cylinders and liquid chemicals in monitored cabinets with excess-flow valves; a valve manifold box (VMB) splits one line to several tools with leak detection on every branch.'],
    abate: ['Point-of-use abatement', 'PFCs: thousands × the potency of CO₂', 'Burn-wet, plasma or catalytic units destroy toxic and greenhouse exhaust gases right at the tool, before any shared duct.'],
    chiller: ['Process chillers', 'chamber and chuck temperature', 'Chillers hold chamber walls and wafer chucks at set temperature; process temperature drifts of a fraction of a degree change etch and deposition rates.'],
    chemd: ['Chemical distribution', 'H₂SO₄, HF, IPA, slurries …', 'Liquid chemicals arrive in double-contained lines from a central chemical distribution room to the sub-fab cabinets; a leak is caught in the outer jacket.'],
    shaft: ['Return air shaft', 'sub-fab → fan deck', 'Return air is pulled from the sub-fab up these shafts to the fan deck, mixed with 10–20% fresh make-up air and sent down again.'],
    upw: ['Ultrapure water (UPW) plant', '18.2 MΩ·cm; ~9 m³ of water per wafer', 'Filtration, reverse osmosis, UV, electrodeionization and ion exchange turn city water into water with almost nothing but H₂O in it; 85–90% of process water is recycled.'],
    asu: ['Bulk gases / air separation unit', 'tens of thousands of Nm³/h of N₂', 'An on-site ASU (Linde, Air Liquide, Air Products) makes nitrogen, oxygen and argon; N₂ purges every tool, FOUP and pipeline.'],
    power: ['Substation, UPS and generators', 'several hundred MW; ~3 600 kWh per wafer', 'Dedicated redundant grid feeds; batteries carry the load for the seconds until generators start. A sag of a few cycles can scrap thousands of wafers in process.'],
    scrub: ['Central scrubbers → stack', 'segregated exhaust', 'Acid, alkaline, solvent and toxic exhaust streams are treated separately by wet scrubbers before the stack.'],
    waste: ['Waste treatment and central chillers', 'reclaim 85–90% of process water', 'Wastewater is neutralized and reclaimed; central chiller plants feed chilled water to the sub-fab and to the HVAC.'],
  };

  window.registerWidget('fab-anatomy', {
    title: 'Anatomy of a Fab Building',
    caption: 'A 300 mm fab is a vertical sandwich: clean air on top, wafers in the middle, everything dirty underneath. Hover or tap any part for its role; slide the ISO class to see how clean "clean" is.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const uid = 'fab' + Math.random().toString(36).slice(2, 7);
      const st = { playing: !reduced, v: 0.45, N: 5, compact: false, builtW: 0 };
      let raf = 0, visible = true, last = 0, streams = [], dyn = null, zone = null, hotRects = [];
      const contentW = () => { const cs = getComputedStyle(el); const w = el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0); return w > 0 ? w : 700; };

      // ================= info panel =================
      const infoName = h('b'), infoKey = h('span', { style: { fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--accent)' } }), infoBody = h('span');
      const info = h('div', { style: { border: '1px solid var(--line)', borderRadius: '6px', padding: '8px 12px', margin: '8px 0 10px', minHeight: '88px', fontSize: '13px' } },
        h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'baseline' } }, infoName, infoKey), h('div', { style: { color: 'var(--muted)', marginTop: '2px' } }, infoBody));
      function setInfo(k) { const p = PARTS[k]; infoName.textContent = p[0]; infoKey.textContent = p[1]; infoBody.textContent = p[2]; }
      function clearInfo() { infoName.textContent = 'Hover, focus or tap a part of the building'; infoKey.textContent = ''; infoBody.textContent = 'Every level, machine and utility shows what it does and a key number from the module.'; }
      // desktop: size the panel to its tallest content so hovering never reflows the widget (phones tap, and the panel may grow)
      function fitInfo() { info.style.minHeight = '0'; if (st.compact) return; let m = 0; for (const k in PARTS) { setInfo(k); m = Math.max(m, info.offsetHeight); } clearInfo(); info.style.minHeight = (m || 88) + 'px'; }
      clearInfo();

      // ================= building cross-section =================
      // Font sizes are chosen for the RENDERED scale (viewBox units × px/unit ≥ 11.3 px at the widths each layout serves).
      function build(compact, wPx) {
        const W = compact ? 330 : 720, G = compact ? 0 : 102, RG = compact ? 0 : 116;
        const fk = compact ? clamp(11.6 * W / wPx / 13, 0.8, 1) : clamp(11.6 * W / wPx / 12.5, 1, 1.06);
        const FS = (compact ? 14 : 13.5) * fk, FSS = (compact ? 13 : 12.5) * fk, LH = FSS + 2.5;
        const BX0 = G + 4, BX1 = W - RG - 2, SH = compact ? 28 : 34, IX0 = BX0 + SH, IX1 = BX1 - SH;
        const Y = { roof: 18, fanB: 74, plenB: 104, ffuB: 118, floorT: 274, slabT: 290, slabB: 338, subB: 446, utilB: 522, H: 548 };
        const D = svg('svg', { class: 'w-svg', viewBox: `0 0 ${W} ${Y.H}`, role: 'img', 'aria-label': 'Cross-section of a 300 mm fab: fan deck, plenum, cleanroom ballroom, waffle slab, sub-fab and utility level' });
        const defs = svg('defs', null,
          svg('marker', { id: uid + 'a', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, svg('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'var(--muted)' })),
          svg('marker', { id: uid + 'b', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, svg('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'var(--si)' })));
        D.append(defs);
        const HS = svg('g');   // hotspot layer, appended last so it sits on top
        const tAttrs = o => ({ 'font-family': o.mono ? 'var(--mono)' : 'var(--sans)', fill: o.fill || 'var(--muted)', 'font-weight': o.bold ? 600 : 400, 'letter-spacing': o.ls ? '.06em' : (o.ls === false ? 'normal' : null) });
        // s: string, or [[string, opts], ...] rendered as tspans (mixed bold/regular in one line)
        const T = (x, y, s, o = {}) => {
          const t = svg('text', Object.assign({ x, y, 'font-size': o.size || FS, 'text-anchor': o.anchor || 'start', transform: o.rot ? `rotate(-90 ${x} ${y})` : null, stroke: o.halo || null, 'stroke-width': o.halo ? 3.5 : null, 'paint-order': o.halo ? 'stroke' : null, 'stroke-linejoin': o.halo ? 'round' : null, 'data-fit': o.fit || null }, tAttrs(o)));
          if (Array.isArray(s)) s.forEach(([str, so]) => t.append(svg('tspan', tAttrs(Object.assign({}, o, so)), str))); else t.append(s);
          D.append(t); return t;
        };
        const R = (x, y, w, hh, o = {}) => { const r = svg('rect', { x, y, width: w, height: hh, rx: o.rx == null ? 2 : o.rx, fill: o.fill || 'var(--panel)', 'fill-opacity': o.fo == null ? 1 : o.fo, stroke: o.stroke || 'var(--line2)', 'stroke-width': o.sw == null ? 1 : o.sw, 'stroke-dasharray': o.dash || null }); D.append(r); return r; };
        const L = (x1, y1, x2, y2, o = {}) => { const l = svg('line', { x1, y1, x2, y2, stroke: o.stroke || 'var(--muted)', 'stroke-width': o.sw || 1, 'stroke-dasharray': o.dash || null, 'marker-end': o.arrow ? `url(#${uid}${o.arrow})` : null, opacity: o.op == null ? 1 : o.op }); D.append(l); return l; };
        const box = (x, y, w, hh, lines, o = {}) => { R(x, y, w, hh, o); const n = lines.length, y0 = y + hh / 2 - (n - 1) * LH / 2 + FSS * 0.35; lines.forEach((s, i) => T(x + w / 2, y0 + i * LH, s, { anchor: 'middle', size: FSS, fill: i === 0 ? 'var(--ink)' : 'var(--muted)', bold: i === 0, fit: w - 6 })); };
        function hot(x, y, w, hh, key, band) {
          const r = svg('rect', { x, y, width: w, height: hh, rx: 3, fill: 'var(--accent)', 'fill-opacity': 0, stroke: 'transparent', 'stroke-width': 1.5, 'pointer-events': 'all', tabindex: 0, role: 'button', 'aria-label': PARTS[key][0], style: { cursor: 'pointer', outline: 'none', transition: 'fill-opacity .12s' }, on: { pointerenter: () => on(true), pointerleave: () => on(false), focus: () => on(true), blur: () => on(false), click: () => setInfo(key) } });
          function on(f) { r.setAttribute('fill-opacity', f ? (band ? .06 : .16) : 0); r.setAttribute('stroke', f ? 'var(--accent)' : 'transparent'); if (f) setInfo(key); }
          if (band) HS.prepend(r); else HS.append(r);   // band hotspots sit under the part hotspots
          hotRects.push(r);
        }
        const lvlIn = (x, y, s, o = {}) => T(x, y, s, Object.assign({ size: FSS, bold: true, ls: true, fill: 'var(--ink)', halo: 'var(--panel2)' }, o));   // compact: level name drawn inside its band

        // ---- bands ----
        const bands = {};
        bands.fan = R(BX0, Y.roof, BX1 - BX0, Y.fanB - Y.roof, { fill: 'var(--panel2)', rx: 0 });
        bands.plen = R(BX0, Y.fanB, BX1 - BX0, Y.plenB - Y.fanB, { fill: 'var(--panel2)', fo: .55, rx: 0 });
        bands.ball = R(IX0, Y.ffuB, IX1 - IX0, Y.slabT - Y.ffuB, { fill: 'var(--ground)', stroke: 'var(--line)', rx: 0 });
        bands.slab = R(BX0, Y.slabT, BX1 - BX0, Y.slabB - Y.slabT, { fill: 'var(--line2)', fo: .55, stroke: 'var(--line2)', rx: 0 });
        bands.sub = R(IX0, Y.slabB, IX1 - IX0, Y.subB - Y.slabB, { fill: 'var(--panel2)', fo: .6, stroke: 'var(--line)', rx: 0 });
        bands.util = R(BX0, Y.subB, BX1 - BX0, Y.utilB - Y.subB, { fill: 'var(--panel2)', rx: 0 });
        // return-air shafts (chases) from the sub-fab up into the fan deck: dots run up the left part, label on the right part
        const dotOff = compact ? 8 : 9;
        [BX0, BX1 - SH].forEach(sx => {
          R(sx, Y.fanB, SH, Y.subB - Y.fanB, { fill: 'var(--panel)', stroke: 'var(--line2)', rx: 0 });
          [Y.subB - 40, 250, 150].forEach(yy => L(sx + dotOff, yy + 14, sx + dotOff, yy - 14, { stroke: 'var(--si)', sw: 1.5, arrow: 'b', op: .8 }));
          T(sx + SH - 4, 330, 'return air ↑', { rot: true, size: FSS, fill: 'var(--si)' });
        });
        R(BX0, Y.roof, BX1 - BX0, Y.utilB - Y.roof, { fill: 'none', stroke: 'var(--ink)', sw: 1.2, rx: 0 });
        L(BX0 - 2, Y.subB, BX1 + 3, Y.subB, { stroke: 'var(--ink)', sw: 1, dash: '4 3' });

        // ---- ballroom geometry (tools, EFEMs, load-port shelves, aisles) ----
        // Full-height air columns run only through aisles and margins that hold no vehicle, FOUP or caption; stubs sit over tool tops.
        const railY = 142, toolH0 = 204, toolB = Y.floorT, efemT = 214, shelfY = 236;
        const pairs = compact
          ? [{ a: ['scanner', IX0 + 16, 70, ['EUV', 'scanner']], b: ['etch', IX0 + 162, 74, ['etch', 'cluster']], eL: IX0 + 86, eR: IX0 + 142, ew: 20, deliver: 'R' }]
          : [{ a: ['scanner', IX0 + 10, 74, ['EUV', 'scanner']], b: ['track', IX0 + 166, 50, ['track']], eL: IX0 + 84, eR: IX0 + 144, ew: 22, deliver: 'R' },
             { a: ['etch', IX0 + 226, 50, ['etch', 'cluster']], b: ['cvd', IX0 + 358, 60, ['CVD', 'ALD']], eL: IX0 + 276, eR: IX0 + 336, ew: 22, deliver: null }];
        const cols = compact ? [IX0 + 6, IX1 - 12] : [IX0 + 5, IX0 + 221, IX0 + 317, IX1 - 5];   // loop all the way round
        const toolCols = compact ? [IX0 + 206] : [IX0 + 191, IX0 + 251];                          // short stubs over tool tops (between etch chambers)
        const yRet = Y.slabB + 26, yFan = 70;
        const shaftDot = x => (x < (IX0 + IX1) / 2 ? BX0 : BX1 - SH) + dotOff;
        const P = svg('g');
        const newStreams = [];
        cols.forEach(cx => newStreams.push({ pts: [[cx, yFan], [cx, yRet], [shaftDot(cx), yRet], [shaftDot(cx), yFan], [cx, yFan]], dots: [] }));
        toolCols.forEach(cx => newStreams.push({ pts: [[cx, Y.fanB + 4], [cx, 194]], dots: [] }));
        newStreams.forEach(s => {
          s.seg = []; s.len = 0;
          for (let i = 1; i < s.pts.length; i++) { const d = Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]); s.seg.push(d); s.len += d; }
          const n = Math.max(2, Math.round(s.len / 30));
          for (let i = 0; i < n; i++) { const c = svg('circle', { r: 2.2, fill: 'var(--si)', opacity: .9 }); P.append(c); s.dots.push({ el: c, t: i / n }); }
        });
        D.append(P);
        cols.forEach(cx => L(cx, Y.ffuB + 2, cx, Y.ffuB + 22, { stroke: 'var(--si)', sw: 1.5, arrow: 'b', op: .8 }));
        L((IX0 + IX1) / 2 - 4, yRet, IX0 + 8, yRet, { stroke: 'var(--si)', sw: 1.2, arrow: 'b', op: .5 });
        L((IX0 + IX1) / 2 + 4, yRet, IX1 - 8, yRet, { stroke: 'var(--si)', sw: 1.2, arrow: 'b', op: .5 });

        // ---- fan deck ----
        const mauW = compact ? 70 : 90, mauX = compact ? 84 : IX0 + 8;
        if (compact) lvlIn(10, 50, 'FAN DECK');
        box(mauX, 26, mauW, 40, ['MAU', compact ? 'fresh air' : 'make-up air']);
        L(mauX + mauW / 2, 2, mauX + mauW / 2, 24, { stroke: 'var(--muted)', sw: 1.4, arrow: 'a' });
        T(mauX + mauW / 2 + 8, 12, compact ? 'outside air in' : 'outside air in (10–20%)', { size: FSS });
        let fx = mauX + mauW + 8;
        if (!compact) { box(fx, 26, 74, 40, ['chemical', 'AMC filter']); fx += 82; }
        const fansX = compact ? [fx + 22, fx + 52, fx + 82] : [fx + 20, fx + 56, fx + 92];
        fansX.forEach(x => { const cy = compact ? 56 : 46; D.append(svg('circle', { cx: x, cy, r: compact ? 9 : 12, fill: 'var(--panel)', stroke: 'var(--si)', 'stroke-width': 1.5 })); L(x - 6, cy - 6, x + 6, cy + 6, { stroke: 'var(--si)', sw: 1.5 }); L(x - 6, cy + 6, x + 6, cy - 6, { stroke: 'var(--si)', sw: 1.5 }); });
        if (compact) { T(fx + 10, 36, 'recirculation fans', { size: FSS, fill: 'var(--ink)', bold: true, halo: 'var(--panel2)' }); }
        else { T(fx + 116, 42, 'recirculation fans', { size: FSS, fill: 'var(--ink)', bold: true, halo: 'var(--panel2)' }); T(fx + 116, 56, '→ supply plenum', { size: FSS, halo: 'var(--panel2)' }); }
        // plenum: two caption lines (the FFU caption lives here so it never crosses the ceiling arrows below)
        const tx = IX0 + (compact ? 14 : 10), bold = { bold: true, fill: 'var(--ink)' };
        if (compact) { lvlIn(tx, 86, [['PLENUM', {}], [' · ducts · rail hangers', { bold: false, ls: false, fill: 'var(--muted)' }]]); }
        else T(tx, 86, [['supply plenum', bold], [': ducts · cable trays · OHT rail hangers', {}]], { size: FSS, halo: 'var(--panel2)' });
        T(tx, 100, [['↓ FFU ceiling', bold], [compact ? ': fan + ULPA filter' : ': an EC fan + ULPA filter in every 1.2 × 0.6 m module', {}]], { size: FSS, halo: 'var(--panel2)' });
        // FFU ceiling
        const ffuN = Math.floor((IX1 - IX0 - 4) / 22), ffuW = (IX1 - IX0 - 4) / ffuN;
        for (let i = 0; i < ffuN; i++) { const x = IX0 + 2 + i * ffuW; R(x, Y.plenB, ffuW - 1, Y.ffuB - Y.plenB, { fill: 'var(--panel)', stroke: 'var(--si)', rx: 0, sw: .8 }); L(x + 3, Y.plenB + 4, x + ffuW / 2, Y.plenB + 10, { stroke: 'var(--si)', sw: .8 }); L(x + ffuW / 2, Y.plenB + 10, x + ffuW - 4, Y.plenB + 4, { stroke: 'var(--si)', sw: .8 }); }

        // ---- ballroom: rail, vehicles, tools ----
        (compact ? [] : [IX0 + 12, IX1 - 74]).forEach(x => L(x, Y.ffuB, x, railY, { stroke: 'var(--line2)', sw: 1 }));
        L(IX0 + 6, railY, IX1 - 6, railY, { stroke: 'var(--ink)', sw: 2 });
        if (compact) { lvlIn(tx, 133, 'BALLROOM', { halo: 'var(--ground)' }); dyn.tagBall = T(tx + 84, 133, 'ISO 5', { mono: true, size: FSS, fill: 'var(--accent)', halo: 'var(--ground)' }); T(tx + 130, 138, 'OHT rail', { size: FSS, fill: 'var(--ink)', bold: true, halo: 'var(--ground)' }); }
        else T(IX1 - 14, 138, 'OHT rail', { size: FSS, fill: 'var(--ink)', bold: true, anchor: 'end', halo: 'var(--ground)' });
        const foup = (x, y, w = 18, hh = 14) => { R(x, y, w, hh, { fill: 'var(--accent)', fo: .85, stroke: 'var(--accent)', rx: 2 }); L(x + 3, y + 3, x + w - 3, y + 3, { stroke: 'var(--panel)', sw: 1 }); L(x + 3, y + 7, x + w - 3, y + 7, { stroke: 'var(--panel)', sw: 1 }); L(x + 3, y + 11, x + w - 3, y + 11, { stroke: 'var(--panel)', sw: 1 }); };
        const efemRects = [];
        const vehicle = (c, lowering) => {   // c: centre x on the rail
          R(c - 23, railY + 2, 46, 12, { fill: 'var(--ink)', stroke: 'none', rx: 3 });
          if (lowering) { L(c - 8, railY + 14, c - 8, 200, { stroke: 'var(--muted)', sw: .8 }); L(c + 8, railY + 14, c + 8, 200, { stroke: 'var(--muted)', sw: .8 }); foup(c - 9, 200); hot(c - 12, 196, 24, 20, 'foup'); }
          else { foup(c - 9, railY + 16); hot(c - 11, railY + 14, 22, 18, 'foup'); }
          hot(c - 25, railY - 6, 50, 24, 'oht');
        };
        let capX = 0;
        pairs.forEach(p => {
          [p.a, p.b].forEach(([key, x, w, lines]) => {
            const hh = key === 'scanner' ? toolB - toolH0 - 6 : toolB - toolH0;
            box(x, toolH0, w, hh, lines, { fill: 'var(--panel)', stroke: 'var(--si)', sw: 1.2 });
            if (key === 'scanner') { [x + 10, x + w - 16].forEach(fx2 => R(fx2, toolB - 6, 6, 6, { fill: 'var(--si)', stroke: 'none', rx: 1 })); }
            if (key === 'etch') { [x + 8, x + w - 20].forEach(cx2 => R(cx2, toolH0 - 8, 12, 8, { fill: 'var(--si)', fo: .5, stroke: 'var(--si)', rx: 3 })); }
            L(x + w / 2, toolB, x + w / 2, Y.slabB, { stroke: 'var(--muted)', sw: 1, dash: '3 2', op: .7 });
            hot(x, toolH0 - 8, w, toolB - toolH0 + 8, key);
          });
          [[p.eL, 1, 'L'], [p.eR, -1, 'R']].forEach(([ex, dir, side]) => {
            const er = R(ex, efemT, p.ew, toolB - efemT, { fill: 'var(--panel)', stroke: 'var(--ok)', sw: 1.2 }); efemRects.push(er);
            T(ex + p.ew / 2 + FSS * 0.38, (efemT + toolB) / 2 + 20, 'EFEM', { rot: true, size: FSS, fill: 'var(--ok)', bold: true });
            L(ex + p.ew / 2, efemT + 3, ex + p.ew / 2, efemT + 12, { stroke: 'var(--ok)', sw: 1.2, arrow: 'a' });
            const sx = dir > 0 ? ex + p.ew : ex - 12;        // load-port shelf in front of the EFEM
            R(sx, shelfY, 12, 4, { fill: 'var(--line2)', stroke: 'none', rx: 0 });
            if (p.deliver === side) { vehicle(sx + 6, true); capX = sx + 6 - 16; } else foup(sx - 2, shelfY - 12, 16, 12);
            hot(ex, efemT, p.ew, toolB - efemT, 'efem');
          });
        });
        if (!compact) vehicle(IX0 + 388, false);          // a second vehicle travelling over the CVD tool
        // caption to the left of the hoist belts, three short lines so it stays clear of every air column
        ['OHT vehicle', 'lowering a FOUP', 'onto a load port'].forEach((s, i) => T(capX, 166 + i * 14, s, { size: FSS, anchor: 'end', halo: 'var(--ground)' }));
        // raised floor
        for (let x = IX0 + 2; x < IX1 - 2; x += 8) L(x, Y.floorT + 3, x + 4, Y.floorT + 3, { stroke: 'var(--si)', sw: 1.6 });
        L(IX0, Y.floorT, IX1, Y.floorT, { stroke: 'var(--line2)', sw: 1 }); L(IX0, Y.floorT + 6, IX1, Y.floorT + 6, { stroke: 'var(--line2)', sw: 1 });
        for (let x = IX0 + 12; x < IX1; x += 40) L(x, Y.floorT + 6, x, Y.slabT, { stroke: 'var(--line2)', sw: 2 });
        // waffle slab openings
        [...cols, ...toolCols].forEach(cx => R(cx - 7, Y.slabT + 4, 14, Y.slabB - Y.slabT - 8, { fill: 'var(--ground)', stroke: 'none', rx: 0 }));
        if (compact) lvlIn(IX0 + 64, 318, 'WAFFLE SLAB', { halo: null });
        // ---- sub-fab racks ----
        const racks = compact ? [['pumps', IX0 + 6, 80, ['vacuum', 'pumps']], ['gas', IX0 + 94, 80, ['gas cab.', '+ VMB']], ['abate', IX0 + 182, 80, ['RF gen. +', 'abatement']]]
          : [['pumps', IX0 + 2, 80, ['vacuum', 'pumps']], ['chiller', IX0 + 88, 80, ['chillers']], ['gas', IX0 + 174, 80, ['gas & VMB', 'cabinets']], ['rf', IX0 + 260, 80, ['RF gen. +', 'match']], ['abate', IX0 + 346, 80, ['abatement', '(exhaust)']]];
        racks.forEach(([key, x, w, lines]) => { box(x, Y.slabB + 42, w, 52, lines, { fill: 'var(--panel)', stroke: 'var(--cu)', sw: 1 }); hot(x, Y.slabB + 42, w, 52, key); });
        if (compact) { lvlIn(tx, 350, 'SUB-FAB'); dyn.tagSub = T(tx + 68, 350, 'ISO 7–8', { mono: true, size: FSS, fill: 'var(--accent)', halo: 'var(--panel2)' }); T(tx + 124, 350, '· tools’ dirty half', { size: FSS, halo: 'var(--panel2)' }); }
        else T(tx, 350, [['sub-fab', bold], [': the noisy, dirty half of every tool; also the return plenum', {}]], { size: FSS, halo: 'var(--panel2)' });
        // ---- utility level ----
        const uy = compact ? Y.subB + 16 : Y.subB + 10, uh = compact ? 44 : 50;
        const utils = compact ? [['upw', 6, 77, ['UPW', '18.2 MΩ·cm'], 'water'], ['asu', 87, 77, ['bulk N₂', '(ASU)'], 'air'], ['power', 168, 77, ['power', '+ UPS'], 'grid'], ['scrub', 249, 77, ['scrubbers', '→ stack'], null]]
          : [['upw', BX0 + 2, 78, ['UPW plant', '18.2 MΩ·cm'], 'city water'], ['asu', BX0 + 85, 78, ['bulk gases', 'ASU: N₂, O₂'], 'air'], ['power', BX0 + 168, 78, ['substation', '+ UPS'], 'grid power'], ['waste', BX0 + 251, 78, ['waste', 'treatment'], null], ['chemd', BX0 + 334, 78, ['chemical', 'supply'], 'chemicals'], ['scrub', BX0 + 417, 78, ['scrubbers', '→ stack'], null]];
        utils.forEach(([key, x, w, lines, feed]) => {
          box(x, uy, w, uh, lines, { fill: 'var(--panel)', stroke: 'var(--cu)', sw: 1 }); hot(x, uy, w, uh, key);
          if (feed) { L(x + w / 2, Y.H - 16, x + w / 2, uy + uh + 2, { stroke: 'var(--cu)', sw: 1.4, arrow: 'a' }); T(x + w / 2, Y.H - 4, feed, { size: FSS, anchor: 'middle', fill: 'var(--cu)' }); }
          if (key === 'upw' || key === 'asu' || key === 'power' || (key === 'scrub' && !compact)) L(x + w / 2, uy - 2, x + w / 2, Y.subB - 8, { stroke: 'var(--cu)', sw: 1.4, arrow: 'a' });
        });
        if (compact) lvlIn(BX1 - 6, 458, 'UTILITIES', { anchor: 'end' }); else T(BX1 + 7, Y.subB + 4, 'grade', { size: FSS });

        // ---- gutter labels (wide layout only; the compact layout draws level names inside the bands) ----
        if (!compact) {
          const gx = G - 4, LG = FS + 5;
          const lvl = (y, lines) => lines.map(([s, o], i) => T(gx, y + i * LG, s, Object.assign({ anchor: 'end' }, o)));
          const tag = { mono: true, fill: 'var(--accent)' }, hd = { fill: 'var(--ink)', bold: true };
          lvl(41, [['1 · Fan deck', hd], ['MAUs + fans', { size: FSS }]]);
          lvl(83, [['2 · Interstitial', hd], ['plenum', { size: FSS }]]);
          dyn.tagBall = lvl(190, [['3 · Ballroom', hd], ['cleanroom', { size: FSS }], ['ISO 5', tag]])[2];
          lvl(309, [['4 · Waffle', hd], ['slab', { size: FSS }]]);
          dyn.tagSub = lvl(384, [['5 · Sub-fab', hd], ['ISO 7–8', tag]])[1];
          lvl(477, [['6 · Utility', hd], ['level', { size: FSS }]]);
          // right gutter callouts
          const rx = BX1 + 6, cx = rx + 8;
          L(rx, Y.ffuB, rx, Y.slabT, { stroke: 'var(--muted)', sw: 1 }); L(rx - 3, Y.ffuB, rx + 3, Y.ffuB); L(rx - 3, Y.slabT, rx + 3, Y.slabT);
          T(cx, 196, '≈ 4 m', { mono: true, fill: 'var(--ink)' }); T(cx, 212, 'downflow', { size: FSS });
          dyn.vLbl = T(cx, 228, '0.45 m/s', { mono: true, fill: 'var(--si)' });
          T(cx, 270, 'perforated', { size: FSS }); T(cx, 285, 'raised floor', { size: FSS });
          T(cx, 310, 'waffle slab', { size: FSS }); T(cx, 325, '1–1.5 m thick', { size: FSS });
          T(cx, 386, 'return plenum', { size: FSS }); T(cx, 401, '→ shafts', { size: FSS });
        }

        // ---- remaining hotspots (band-level ones go underneath the part hotspots) ----
        hot(IX0, Y.ffuB, IX1 - IX0, Y.floorT - Y.ffuB - 2, 'ballroom', true);
        hot(IX0, Y.slabB, IX1 - IX0, Y.subB - Y.slabB, 'subfab', true);
        hot(mauX, 26, mauW, 40, 'mau'); if (!compact) hot(mauX + mauW + 8, 26, 74, 40, 'chem');
        hot(fansX[0] - 16, 28, (compact ? 0 : 130) + fansX[2] - fansX[0] + 32, 38, 'fans');
        hot(IX0, Y.fanB + 1, IX1 - IX0, Y.plenB - Y.fanB - 2, 'plenum');
        hot(IX0, Y.plenB, IX1 - IX0, Y.ffuB - Y.plenB, 'ffu');
        hot(IX0, Y.floorT - 2, IX1 - IX0, Y.slabT - Y.floorT + 2, 'floor');
        hot(BX0, Y.slabT, BX1 - BX0, Y.slabB - Y.slabT, 'slab');
        hot(BX0, Y.fanB, SH, Y.subB - Y.fanB, 'shaft'); hot(BX1 - SH, Y.fanB, SH, Y.subB - Y.fanB, 'shaft');
        D.append(HS);
        return { svg: D, streams: newStreams, zones: { mini: efemRects, ball: bands.ball, sub: bands.sub } };
      }

      // ================= ISO ladder chart =================
      function buildLadder(compact) {
        const W = compact ? 300 : 640, H = 138, FS = compact ? 12.5 : 12, FN = compact ? 12 : 11.5;
        const X0 = compact ? 20 : 40, X1 = W - (compact ? 14 : 20), AX = 94;
        const S = svg('svg', { class: 'w-svg', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Cleanliness ladder: ISO classes on a log scale of particles per cubic metre' });
        const T = (x, y, s, o = {}) => { const t = svg('text', { x, y, 'font-family': o.mono ? 'var(--mono)' : 'var(--sans)', 'font-size': o.size || FS, fill: o.fill || 'var(--muted)', 'text-anchor': o.anchor || 'middle', 'font-weight': o.bold ? 600 : 400 }, s); S.append(t); return t; };
        const xOf = c => X0 + (Math.log10(c) + 1) / 9 * (X1 - X0);
        S.append(svg('line', { x1: X0, y1: AX, x2: X1, y2: AX, stroke: 'var(--line2)', 'stroke-width': 1.5 }));
        [[1, '1'], [100, '100'], [1e4, '10⁴'], [1e6, '10⁶'], [1e8, '10⁸']].forEach(([c, s]) => { S.append(svg('line', { x1: xOf(c), y1: AX, x2: xOf(c), y2: AX + 5, stroke: 'var(--line2)' })); T(xOf(c), AX + 18, s, { mono: true, size: FN }); });
        T((X0 + X1) / 2, AX + 34, 'particles ≥ 0.5 µm per m³ (log scale)', { fill: 'var(--ink)' });
        // zone brackets on two rows so neighbouring labels never collide
        const zones = [[1, 3, 'mini-environment (ISO 1–3)', 'var(--ok)'], [4, 6, 'ballroom (ISO 4–6)', 'var(--accent)'], [7, 8, 'sub-fab (ISO 7–8)', 'var(--cu)'], [9, 9, 'office / city air (ISO 9)', 'var(--bad)']];
        zones.forEach(([a, b, s, col], i) => {
          const xa = xOf(conc(a, 0.5)) - 10, xb = Math.min(X1, xOf(conc(b, 0.5)) + 10), yb = 20 + (i % 2) * 24;
          S.append(svg('path', { d: `M${xa},${yb + 6} v-6 H${xb} v6`, fill: 'none', stroke: col, 'stroke-width': 1.2 }));
          const last = i === zones.length - 1;
          T(last ? X1 : (xa + xb) / 2, yb - 4, compact ? s.replace(' (ISO ', ' (').replace('office / city air', 'city air').replace('mini-environment', 'mini-env.') : s, { fill: col, anchor: last ? 'end' : 'middle' });
        });
        const marks = [];
        for (let k = 1; k <= 9; k++) { const x = xOf(conc(k, 0.5)); const c = svg('circle', { cx: x, cy: AX, r: 3.5, fill: 'var(--panel)', stroke: 'var(--muted)', 'stroke-width': 1.5 }); S.append(c); T(x, AX - 11, compact ? String(k) : 'ISO ' + k, { mono: true, size: FN }); marks.push(c); }
        const sel = svg('circle', { cy: AX, r: 7, fill: 'var(--accent)', stroke: 'var(--panel)', 'stroke-width': 2 }); S.append(sel);
        const selLbl = T(0, AX - 28, '', { mono: true, bold: true, fill: 'var(--accent)', size: FS });
        return { svg: S, xOf, sel, selLbl, marks, lo: X0 + 74, hi: X1 - 74 };
      }

      // ================= controls / readouts / formula =================
      const playBtn = h('button', { class: 'w-btn primary', type: 'button', on: { click: () => { st.playing = !st.playing; playBtn.textContent = st.playing ? 'Pause airflow' : 'Play airflow'; if (st.playing) start(); } } }, st.playing ? 'Pause airflow' : 'Play airflow');
      const vIn = h('input', { type: 'range', min: 0.3, max: 0.5, step: 0.05, value: st.v }), vOut = h('output');
      const nIn = h('input', { type: 'range', min: 1, max: 8, step: 1, value: st.N }), nOut = h('output');
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl', style: { minWidth: '0', flex: '0 0 auto' } }, playBtn),
        h('label', { class: 'w-ctl' }, h('span', null, 'Downflow velocity'), vIn, vOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'ISO class explorer'), nIn, nOut));
      const B = () => h('b');
      const s01 = B(), s05 = B(), sClean = B(), sLand = B(), sCross = B(), sAch = B();
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, s01, h('span', null, 'max particles ≥ 0.1 µm per m³')),
        h('div', { class: 'w-stat' }, s05, h('span', null, 'max particles ≥ 0.5 µm per m³')),
        h('div', { class: 'w-stat' }, sClean, h('span', null, 'times cleaner than city air (ISO 9)')),
        h('div', { class: 'w-stat' }, sLand, h('span', null, 'particles ≥ 0.5 µm landing per hour on an exposed 300 mm wafer')),
        h('div', { class: 'w-stat' }, sCross, h('span', null, 'ceiling-to-floor crossing time (4 m room)')),
        h('div', { class: 'w-stat' }, sAch, h('span', null, 'air changes per hour (an office: ~10)')));
      const whereLbl = h('div', { class: 'w-note', style: { marginTop: '4px' } });
      const formulaIso = h('div', { class: 'w-formula' });
      const formulaAir = h('div', { class: 'w-formula' });
      const stage = h('div'), ladderWrap = h('div');
      const ladderTitle = h('div', { style: { fontWeight: 600, fontSize: '13px', margin: '10px 0 2px' } }, 'The cleanliness ladder: each ISO class is 10× the particles of the one before');

      let ladder = null;
      function rebuild() {
        hotRects = []; dyn = {};
        const w = st.builtW = contentW();
        const b = build(st.compact, w); streams = b.streams; zone = b.zones;
        stage.innerHTML = ''; stage.append(b.svg);
        ladder = buildLadder(st.compact); ladderWrap.innerHTML = ''; ladderWrap.append(ladder.svg);
        place(0); update(); fitInfo();
      }

      function update() {
        st.v = +vIn.value; st.N = +nIn.value;
        vOut.textContent = st.v.toFixed(2) + ' m/s'; nOut.textContent = 'ISO ' + st.N;
        const c01 = conc(st.N, 0.1), c05 = conc(st.N, 0.5);
        s01.textContent = fmt(c01, 0) + (st.N >= 7 ? ' ‡' : '');
        s05.textContent = (c05 < 10 ? fmt(c05, 2) + ' ‡' : fmt(c05, 0));
        sClean.textContent = fmt(Math.pow(10, 9 - st.N), 0) + '×';
        const land = c05 * SETTLE_MS * WAFER_M2 * 3600;
        sLand.textContent = land >= 10 ? fmt(land, 0) : land >= 1 ? fmt(land, 1) : fmt(land, 3);
        const tCross = CEIL_M / st.v, ach = 3600 / tCross;
        sCross.textContent = tCross.toFixed(1) + ' s'; sAch.textContent = fmt(ach, 0);
        const w = ISO_WHERE[st.N];
        const note = c05 < 10 ? ' ‡ ISO 14644-1:2015 no longer tabulates limits under 10 particles (older editions listed 4 for ISO 2 at 0.5 µm); the value shown is the formula.'
          : st.N >= 7 ? ' ‡ ISO 14644-1 does not tabulate the ≥ 0.1 µm limit above ISO 6 (too many particles to count reliably); the value shown is the formula.' : '';
        whereLbl.textContent = `ISO ${st.N} in the fab: ${w[0]}. Old FED-STD-209E name: ${w[1]}.` + note;
        formulaIso.innerHTML = `C(D) = 10<sup>N</sup> × (0.1 µm / D)<sup>2.08</sup> per m³ &nbsp;→&nbsp; ISO ${st.N} at 0.5 µm: 10<sup>${st.N}</sup> × 0.2<sup>2.08</sup> ≈ ${c05 < 10 ? fmt(c05, 2) : fmt(c05, 0)}`;
        formulaAir.innerHTML = `t = H / v = 4 m / ${st.v.toFixed(2)} m/s ≈ ${tCross.toFixed(1)} s &nbsp;→&nbsp; air changes/h = 3 600 / t ≈ ${fmt(ach, 0)}`;
        if (dyn && dyn.vLbl) dyn.vLbl.textContent = st.v.toFixed(2) + ' m/s';
        if (ladder) { const x = ladder.xOf(c05); ladder.sel.setAttribute('cx', x); ladder.selLbl.setAttribute('x', Math.max(ladder.lo, Math.min(ladder.hi, x))); ladder.selLbl.textContent = 'ISO ' + st.N + ': ' + (c05 < 10 ? fmt(c05, 2) : fmt(c05, 0)) + ' /m³'; }
        if (zone) {
          const z = st.N <= 3 ? 'mini' : st.N <= 6 ? 'ball' : 'sub';
          zone.mini.forEach(r => { r.setAttribute('stroke-width', z === 'mini' ? 2.5 : 1.2); r.setAttribute('fill', z === 'mini' ? 'var(--ok)' : 'var(--panel)'); r.setAttribute('fill-opacity', z === 'mini' ? .3 : 1); });
          zone.ball.setAttribute('stroke', z === 'ball' ? 'var(--accent)' : 'var(--line)'); zone.ball.setAttribute('stroke-width', z === 'ball' ? 2.5 : 1);
          zone.sub.setAttribute('stroke', z === 'sub' ? 'var(--accent)' : 'var(--line)'); zone.sub.setAttribute('stroke-width', z === 'sub' ? 2.5 : 1);
          if (dyn && dyn.tagBall) {   // the in-drawing ISO tags follow the explorer while their zone is selected
            dyn.tagBall.textContent = z === 'ball' ? 'ISO ' + st.N : 'ISO 5'; dyn.tagSub.textContent = z === 'sub' ? 'ISO ' + st.N : 'ISO 7–8';
            dyn.tagBall.setAttribute('font-weight', z === 'ball' ? 700 : 400); dyn.tagSub.setAttribute('font-weight', z === 'sub' ? 700 : 400);
            dyn.tagBall.setAttribute('fill', z === 'ball' ? 'var(--accent)' : 'var(--muted)'); dyn.tagSub.setAttribute('fill', z === 'sub' ? 'var(--accent)' : 'var(--muted)');
          }
        }
      }
      [vIn, nIn].forEach(i => i.addEventListener('input', update));

      // ================= airflow animation =================
      function place(dt) {
        const speed = st.v * 42 * SPEEDUP;           // viewBox units per second (168 units ≈ 4 m)
        streams.forEach(s => {
          s.dots.forEach(d => {
            d.t = (d.t + dt * speed / s.len) % 1;
            let dist = d.t * s.len, i = 0;
            while (i < s.seg.length - 1 && dist > s.seg[i]) { dist -= s.seg[i]; i++; }
            const u = s.seg[i] ? Math.min(1, dist / s.seg[i]) : 0, a = s.pts[i], b = s.pts[i + 1];
            d.el.setAttribute('cx', (a[0] + (b[0] - a[0]) * u).toFixed(1)); d.el.setAttribute('cy', (a[1] + (b[1] - a[1]) * u).toFixed(1));
          });
        });
      }
      function frame(ts) {
        raf = 0;
        if (!st.playing || !visible) return;
        const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts;
        place(dt);
        raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && st.playing && visible) { last = 0; raf = requestAnimationFrame(frame); } }
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); });
      io.observe(el);
      // rebuild when the layout flips or the width moves enough to change the rendered font scale
      const ro = new ResizeObserver(es => { const w = es[0].contentRect.width; if (!(w > 0)) return; const c = w < 520; if (c !== st.compact || Math.abs(w - st.builtW) >= 24) { st.compact = c; rebuild(); } });
      ro.observe(el);

      el.append(controls, stage, info, readout, whereLbl, ladderTitle, ladderWrap, formulaIso, formulaAir,
        h('div', { class: 'w-note' }, 'Blue dots are the recirculating air: down through the ceiling filters at 0.3–0.5 m/s (shown 4× faster than life), through the perforated floor and the slab openings into the sub-fab, then up the return shafts to the fan deck. Amber boxes are FOUPs; the black bar under the rail is an OHT vehicle; green outlines are the ISO 1–3 mini-environments where wafers are actually exposed.'));
      st.compact = contentW() < 520;
      rebuild();
      start();
      return () => { if (raf) cancelAnimationFrame(raf); raf = 0; st.playing = false; io.disconnect(); ro.disconnect(); };
    }
  });
})();
