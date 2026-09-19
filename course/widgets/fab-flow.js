/* fab-flow — "The Master Process Flow, Step by Step" (Module 00) */
(function () {
  'use strict';
  const pad = n => String(n).padStart(2, '0');

  // The 60-step master flow from Module 00, grouped by the module's stages. [name, explanation, module]
  const GROUPS = [
    ['design', 'Design', [
      ['Architecture & RTL design', 'GPU architecture and register-transfer-level (RTL) design: the chip described as logic in Verilog, then verified in simulation over roughly 2–4 years before any wafer starts.', 19],
      ['Synthesis & place-and-route', 'RTL is synthesized into gates, placed and routed on the die, and timing-closed against the foundry’s process design kit (PDK) with DRC/LVS signoff.', 19],
      ['Tape-out', 'The finished layout is frozen as a GDSII/OASIS file; optical proximity correction (pre-distorting shapes so they print right) and mask data prep take weeks of compute.', 19],
      ['Mask making', 'E-beam writers pattern each 6-inch quartz reticle over 10–20 hours; a pellicle keeps particles out of focus. A full N3/N2 set of 70–100+ masks costs $20–30M or more.', 4]] ],
    ['materials', 'Materials', [
      ['Quartz mining', 'Quartzite ore is mined and beneficiated to lump quartz above 98% SiO₂, low in iron, aluminium, boron and phosphorus.', 1],
      ['Carbothermic reduction', 'Quartz and carbon are charged into a submerged-arc furnace at ~2,000 °C at the electrode tips (SiO₂ + 2C → Si + 2CO), giving metallurgical-grade silicon at 98–99%.', 1],
      ['Hydrochlorination', 'MG-Si powder reacts with HCl at ~300 °C in a fluidized bed to form trichlorosilane (TCS, SiHCl₃), a liquid that boils at 32 °C, so it can be distilled.', 1],
      ['TCS distillation', 'Multi-column fractional distillation purifies TCS to parts-per-trillion metal and dopant levels: 9N–11N, a billion-fold improvement over MG-Si.', 1],
      ['Siemens CVD deposition', 'Purified TCS decomposes with hydrogen onto electrically heated silicon U-rods at ~1,100 °C, growing polysilicon rods over 3–5 days to ~150–200 mm diameter.', 1],
      ['Rod harvest & packaging', 'Polysilicon rods are harvested, crushed, etch-cleaned and packaged; electronic grade sells for ~$20–40/kg and a 300 mm ingot needs ~350–450 kg of it.', 1]] ],
    ['crystal', 'Crystal', [
      ['Crucible charge & melt-down', '~400 kg of polysilicon plus milligrams of dopant melt in a quartz crucible inside a graphite susceptor, under argon at ~1,420 °C (silicon melts at 1,414 °C).', 2],
      ['Seed, neck, body growth', 'A seed crystal is dipped and slowly withdrawn while rotating; a thin Dash neck sheds dislocations before the crystal flares to a 300 mm body pulled at ~0.5–1 mm/min.', 2],
      ['Ingot crop & test', 'The finished ~2 m ingot is cropped, ground to exactly 300 mm, given an orientation notch, and tested for resistivity and crystal orientation.', 2]] ],
    ['wafer', 'Wafer', [
      ['Wire sawing', 'A diamond-wire multi-wire saw (one ~100 km wire looped thousands of times) slices the ingot into 1,500–2,000 wafers, each cut losing ~150 µm of kerf.', 3],
      ['Lapping & edge rounding', 'Wafers are ground flat, edge-profiled to a rounded bevel (so edges do not chip), and etched to remove saw damage.', 3],
      ['Double-side polish & CMP', 'Both faces are polished between two pads; a final chemical-mechanical polish (CMP) gives the front side sub-nanometre roughness.', 3],
      ['Clean, mark & epitaxy', 'RCA cleaning, laser marking and flatness inspection finish the wafer; logic wafers also get a few µm of epitaxial silicon (defect-free crystal grown by CVD).', 3],
      ['Ship to fab', 'Finished 300 mm prime wafers (~$100–150 each, 775 µm thick) travel in 25-wafer FOUPs (front-opening pods) to the wafer fab.', 3]] ],
    ['feol', 'FEOL', [
      ['Incoming clean', 'Front end of line begins: wafers are cleaned and a zero-layer alignment mark is etched as the reference grid every later mask aligns to.', 5],
      ['Channel material prep', 'For gate-all-around (GAA) nanosheet transistors, an epitaxial Si/SiGe superlattice of 3–4 pairs is grown; a FinFET flow skips this.', 11],
      ['Fin / nanosheet patterning', 'A hard mask plus EUV or self-aligned multi-patterning defines the fins or sheet stacks; a high-aspect-ratio etch cuts them into the silicon.', 9],
      ['STI formation', 'Shallow trench isolation: trenches are lined, filled with flowable oxide, polished flat, then recessed to reveal the fins.', 6],
      ['Well & Vₜ implants', 'Ion implantation sets the n-well, p-well and threshold-voltage (Vₜ) doping under each transistor, followed by an anneal.', 10],
      ['Dummy gate stack', 'A sacrificial oxide and amorphous-silicon gate is patterned with EUV — a placeholder that holds the gate’s footprint until the real metal gate replaces it.', 8],
      ['Gate spacer', 'A thin ALD low-k spacer is deposited and etched anisotropically so it survives only on the dummy gate’s sidewalls.', 6],
      ['S/D recess & inner spacer', 'Source/drain regions are etched away beside the spacers; GAA parts also get inner spacers from a lateral SiGe etch-and-fill.', 9],
      ['Embedded S/D epitaxy', 'Selective epitaxy regrows the source/drain as SiGe:B for PMOS or Si:P for NMOS at ~600–700 °C, touching the channel on both sides.', 6],
      ['Contact liner & ILD0', 'A SiN etch-stop liner and flowable ILD0 oxide bury the structures, then CMP polishes back to expose the dummy-gate top.', 6],
      ['Replacement metal gate', 'The dummy gate is removed (GAA: the SiGe is etched out to release the sheets) and replaced by interfacial oxide, ALD HfO₂ high-k, work-function metals and a W fill.', 11],
      ['Gate cut & cap', 'The continuous gate line is cut where devices end, then recessed under a self-aligned SiN cap so contacts can land next to it without shorting.', 11]] ],
    ['mol', 'MOL', [
      ['Trench-silicide contact etch', 'Middle of line: EUV patterning and etch open contact trenches through the ILD0 down to the source/drain epitaxy.', 12],
      ['Contact metallization', 'A Ti/TiN liner forms TiSiₓ on the epi, then the trench fills with Co, W or Ru and is polished flat: the source/drain contacts.', 12],
      ['Gate contact & V0 via', 'The gate contact and the first via level (V0) are patterned, etched, filled and polished — the last step before real wiring.', 12]] ],
    ['beol', 'BEOL', [
      ['M0/M1 formation', 'Back end of line: low-k dielectric is deposited and patterned by EUV or SALELE, then lined and filled with copper (or ruthenium) and polished — the first wiring level.', 8],
      ['Mx dual damascene', 'Via and trench are etched and filled in one copper plating step, repeated ~15–18 times as the pitch loosens from ~24–28 nm at M1 to microns at the top.', 8],
      ['Top metals & RDL', 'Thick aluminium or copper redistribution layers and MIM capacitors finish the top of the stack.', 12],
      ['Passivation', 'A SiN/SiO₂ passivation stack and polyimide seal the chip; bond-pad openings are etched through them.', 12],
      ['Backside power delivery', 'Only on A16/PowerVia-class nodes: the wafer is bonded to a carrier, flipped, thinned to under a micron over the devices, and nano-TSVs feed power from a backside rail.', 11]] ],
    ['sort', 'Sort', [
      ['Inline metrology', 'CD-SEM, overlay and defect inspection ran after nearly every critical layer; parametric test on scribe-line structures closes out the fab.', 13],
      ['Wafer sort', 'A probe card’s needles touch each die’s pads while ATE testers map every die good, bad or speed-binned, repairing redundant blocks where they can.', 14],
      ['Bumping', 'Under-bump metal is sputtered, patterned and electroplated into copper pillars or microbumps (~40 µm pitch) in the pad openings.', 16],
      ['Backgrind', 'The wafer is ground from 775 µm down to ~100 µm (or tens of µm for stacked dies) and stress-relieved.', 16],
      ['Dicing', 'Blade sawing, stealth laser or plasma dicing cuts along the scribe lanes, singulating the wafer into known-good die.', 16]] ],
    ['hbm', 'HBM', [
      ['DRAM wafer fab', 'In parallel at the memory maker: a DRAM fab flow of its own ~1,000 steps builds the memory die with through-silicon vias (TSVs, ~1,024 per die).', 15],
      ['Base logic die fab', 'The HBM base die — the logic that talks to the GPU — is made on a DRAM process for HBM3/3E or a foundry logic node (TSMC N12/N5) for HBM4.', 15],
      ['TSV reveal', 'The DRAM wafer is thinned on a carrier to ~30 µm to expose the TSVs, then backside-bumped.', 15],
      ['Die-to-wafer stacking', '8-, 12- or 16-high DRAM stacks are bonded by thermo-compression with non-conductive film (TC-NCF), mass-reflow molded underfill (MR-MUF), or hybrid bonding.', 15],
      ['Stack test & KGSD', 'Each HBM stack is tested and burned in, shipping only as known-good stacked die (KGSD).', 15]] ],
    ['pack', 'Packaging', [
      ['Substrate fabrication', 'In parallel, a 10–20 layer ABF build-up substrate (Ajinomoto Build-up Film) is drilled, plated and patterned to carry the package’s wiring out to solder balls.', 16],
      ['Interposer fabrication', 'A silicon interposer with TSVs and 3–4 copper layers (CoWoS-S) — or an RDL interposer with embedded bridges (CoWoS-L) — is built to wire the dies together.', 17],
      ['Chip-on-wafer bonding', 'The GPU die and HBM stacks are flip-chip bonded at ~40 µm bump pitch onto the interposer wafer, underfilled and molded.', 17],
      ['Interposer thinning & bump', 'The interposer wafer is thinned to expose its TSVs, given C4 bumps for the substrate, and diced into modules.', 17],
      ['Wafer-on-substrate', 'Each chip-on-wafer module is reflowed onto its ABF substrate at ~130–150 µm C4 pitch and underfilled.', 16],
      ['Lid & ball attach', 'A lid or stiffener is attached over thermal interface material (TIM), then BGA solder balls are placed and the package is laser-marked.', 16]] ],
    ['system', 'System', [
      ['Package final test', 'ATE tests the finished package in a socket, burns it in at elevated voltage and temperature to weed out infant mortality, and speed-bins it.', 18],
      ['System-level test', 'The part runs real workloads for hours in a system socket to catch failures that structural test misses.', 18],
      ['SXM module assembly', 'The package is reflow-soldered onto an SXM module PCB with its voltage regulators (700–1,400 W per GPU) and tested again.', 19],
      ['Board integration', 'SXM modules join an HGX 8-GPU baseboard with NVSwitch chips, or a GB200 compute tray (2 Grace CPUs + 4 GPUs), with cold plates for liquid cooling.', 19],
      ['Rack integration', '18 compute trays and 9 NVSwitch trays are joined by a copper NVLink spine into a GB200 NVL72 rack: 72 GPUs, ~120–140 kW, then burned in.', 19],
      ['Data center deployment', 'Racks are installed with power, liquid cooling and an InfiniBand or Ethernet fabric; ~1,400 racks make a 100k-GPU cluster of ~150–200 MW.', 19]] ],
  ];
  const STEPS = [];
  GROUPS.forEach(([key, label, steps]) => steps.forEach(([name, desc, mod]) => STEPS.push({ n: STEPS.length + 1, group: key, glabel: label, name, desc, mod })));
  const TOTAL = STEPS.length; // 60

  const FAB0 = 19, FAB1 = 39, FAB_DAYS = 95; // wafer-fab span: FEOL start → inline metrology closes the fab
  function fabClock(n) {
    if (n < FAB0) return 'pre-fab';
    if (n <= FAB1) return 'day ' + Math.round((n - FAB0) / (FAB1 - FAB0) * FAB_DAYS) + ' / ~95';
    if (n <= 43) return 'post-fab prep';
    return 'fab done';
  }
  function metalLevels(n) { return n < 34 ? '0' : n === 34 ? '1' : n === 35 ? '~15–18' : '15–18 + RDL'; }

  const SANS = 'var(--sans)', MONO = 'var(--mono)';
  const INK = 'var(--ink)', MUTED = 'var(--muted)', PANEL = 'var(--panel)', GROUND = 'var(--ground)', LINE2 = 'var(--line2)';
  const SI = 'var(--si)', CU = 'var(--cu)', OK = 'var(--ok)', WARN = 'var(--warn)', ACC = 'var(--accent)', ACC2 = 'var(--accent2)';

  window.registerWidget('fab-flow', {
    title: 'The Master Process Flow, Step by Step',
    caption: 'Scrub through the 60 steps from RTL to a rack; the drawing redraws at every step and outlines what that step adds.',
    mount(el, ctx) {
      const { h, svg } = ctx;
      let cur = 29; // start on the replacement metal gate: the transistor is complete and every part is labelled
      const uid = 'ff' + Math.random().toString(36).slice(2, 7);
      const HATCH = `url(#${uid}-ox)`;

      // ---------- controls ----------
      const slider = h('input', { type: 'range', min: 1, max: TOTAL, step: 1, value: cur, 'aria-label': 'Process step' });
      const prevBtn = h('button', { class: 'w-btn', type: 'button', 'aria-label': 'Previous step' }, '← Prev');
      const nextBtn = h('button', { class: 'w-btn', type: 'button', 'aria-label': 'Next step' }, 'Next →');
      const count = h('span', { class: 'count' });
      const nav = h('div', { class: 'w-step-nav' }, prevBtn, slider, nextBtn, count);

      const HINT0 = 'Hover a dot for the step name; click it to jump there.';
      const hint = h('div', { style: { fontSize: '12px', color: 'var(--muted)', minHeight: '16px' } }, HINT0);
      const ribbon = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px 14px', margin: '2px 0 0' } });
      const dots = new Map();
      GROUPS.forEach(([key, label, steps]) => {
        const row = h('div', { style: { display: 'flex', gap: '2px', flexWrap: 'wrap', maxWidth: '176px' } });
        steps.forEach(([name]) => {
          const n = STEPS.find(st => st.group === key && st.name === name).n;
          const dot = h('button', { class: 'w-step-dot', type: 'button', title: 'Step ' + n + ': ' + name, 'aria-label': 'Step ' + n + ': ' + name,
            style: { width: '14px', height: '14px', boxSizing: 'border-box' },
            on: { click: () => { cur = n; render(); },
              mouseenter: () => { dot.style.outline = '2px solid var(--accent)'; dot.style.outlineOffset = '1px'; hint.textContent = 'Preview: step ' + n + ' · ' + name + (n === cur ? ' (current)' : ''); },
              mouseleave: () => { dot.style.outline = ''; dot.style.outlineOffset = ''; hint.textContent = HINT0; } } });
          row.append(dot); dots.set(n, dot);
        });
        ribbon.append(h('div', null, h('div', { style: { fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--muted)', marginBottom: '3px' } }, label), row));
      });

      // ---------- text column ----------
      const title = h('div', { class: 'w-step-title' });
      const desc = h('div', { class: 'w-step-desc', style: { fontSize: '13px', lineHeight: '1.45' } });
      const modLink = h('a', { style: { fontSize: '12.5px', fontFamily: 'var(--sans)' } });
      const stDay = h('b'), stGroup = h('b'), stLayers = h('b');
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, stDay, h('span', null, 'fab clock')),
        h('div', { class: 'w-stat' }, stGroup, h('span', null, 'process stage')),
        h('div', { class: 'w-stat' }, stLayers, h('span', null, 'metal levels')));
      const formula = h('div', { class: 'w-formula' }, 'fab day ≈ (step − 19) ⁄ (39 − 19) × 95', h('br'),
        h('span', { style: { fontFamily: 'var(--sans)' } }, 'a linear stand-in for the ~3-month (12–14 week) wafer-fab cycle; steps 40–43 are post-fab prep'));
      const legend = h('div', { class: 'w-legend' });
      [[SI, 'silicon'], [LINE2, 'sacrificial: SiGe, dummy gate'], ['hatch', 'oxide / low-k'], [MUTED, 'SiN spacer & cap'], [ACC2, 'HKMG gate'], [OK, 'S/D epi'], [CU, 'W/Co/Ru & Cu'], [WARN, 'passivation / solder']]
        .forEach(([c, t]) => legend.append(h('span', { class: 'w-legend-item' }, h('i', { style: c === 'hatch' ? { background: 'repeating-linear-gradient(135deg, var(--ground) 0 2px, var(--line2) 2px 3px)' } : { background: c } }), t)));

      const xsSvg = svg('svg', { class: 'w-svg', viewBox: '0 0 420 250', role: 'img', 'aria-label': 'Schematic of the current process step' });
      const left = h('div', { style: { minWidth: 0 } }, xsSvg, legend);
      const right = h('div', { style: { minWidth: 0, display: 'grid', gap: '6px', alignContent: 'start' } }, title, desc, modLink, readout, formula);
      const main = h('div', { style: { display: 'grid', gap: '14px', alignItems: 'start' } }, left, right);
      el.append(h('div', { class: 'w-steps' }, nav, ribbon, hint, main));

      // two columns with the drawing at 1:1 scale when there is room, one column (drawing first) otherwise
      let wide = null;
      function layout() {
        const isWide = (el.clientWidth || 0) >= 600;
        if (isWide === wide) return;
        wide = isWide;
        main.style.gridTemplateColumns = isWide ? 'minmax(0, 420px) minmax(0, 1fr)' : 'minmax(0, 1fr)';
      }

      // ---------- drawing kit (all coordinates in the 420 × 250 viewBox) ----------
      function kit(root) {
        const add = e => { root.append(e); return e; };
        const A = (base, o) => { for (const k in o) if (o[k] != null) base[k] = o[k]; return base; };
        const R = (x, y, w, h_, fill, o) => add(svg('rect', A({ x, y, width: w, height: h_, fill }, o || {})));
        const C = (cx, cy, r, fill, o) => add(svg('circle', A({ cx, cy, r, fill }, o || {})));
        const P = (d, fill, o) => add(svg('path', A({ d, fill }, o || {})));
        const L = (x1, y1, x2, y2, o) => add(svg('line', A({ x1, y1, x2, y2, stroke: MUTED, 'stroke-width': 1 }, o || {})));
        const T = (x, y, s, o) => { // labels get a panel-coloured halo unless drawn in panel colour on a solid part
          o = o || {};
          const fill = o.fill || INK, halo = o.halo != null ? o.halo : fill !== PANEL;
          return add(svg('text', { x, y, 'font-size': o.size || 12, 'font-family': o.mono ? MONO : SANS, fill, 'text-anchor': o.anchor || 'start', 'font-weight': o.bold ? 600 : null,
            'paint-order': halo ? 'stroke' : null, stroke: halo ? PANEL : null, 'stroke-width': halo ? 3 : null, 'stroke-linejoin': 'round' }, s));
        };
        const lead = (x1, y1, x2, y2) => { L(x1, y1, x2, y2, { 'stroke-width': .9 }); C(x2, y2, 1.7, MUTED); };
        const hi = e => { e.setAttribute('stroke', ACC); e.setAttribute('stroke-width', 2); e.removeAttribute('stroke-dasharray'); return e; };
        const hiBox = (x, y, w, h_) => R(x - 1.5, y - 1.5, w + 3, h_ + 3, 'none', { stroke: ACC, 'stroke-width': 2, rx: 2 });
        const tag = (x, y, anchor) => { // "this step" pill; x is its left edge (or right edge / centre for anchor end / middle)
          const w = 64, x0 = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
          R(x0, y, w, 15, ACC, { rx: 3 });
          T(x0 + w / 2, y + 11, 'this step', { size: 11, bold: true, fill: PANEL, anchor: 'middle' });
        };
        const arrow = (x1, y1, x2, y2, o) => { const a = Math.atan2(y2 - y1, x2 - x1), s = 5; L(x1, y1, x2, y2, o);
          P(`M${x2},${y2} L${x2 - s * Math.cos(a - .5)},${y2 - s * Math.sin(a - .5)} L${x2 - s * Math.cos(a + .5)},${y2 - s * Math.sin(a + .5)}Z`, (o && o.stroke) || MUTED, { opacity: o && o.opacity }); };
        return { add, R, C, P, L, T, lead, hi, hiBox, tag, arrow };
      }

      // ---------- scene 1: design and masks (1–4) ----------
      function sceneDesign(n, k) {
        const die = k.R(18, 36, 160, 150, GROUND, { stroke: LINE2, rx: 2 });
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) k.R(24 + c * 38, 42 + r * 30, 34, 26, SI, { opacity: .55, stroke: PANEL });
        k.R(24, 134, 148, 18, ACC2, { opacity: .5 }); k.R(24, 156, 70, 24, CU, { opacity: .6 }); k.R(102, 156, 70, 24, CU, { opacity: .6 });
        if (n >= 2) { // placed-and-routed wiring (under the labels)
          const g = svg('g', { stroke: CU, 'stroke-width': 1.2, fill: 'none' });
          [[30, 60, 170, 60], [30, 90, 170, 90], [30, 120, 170, 120], [60, 44, 60, 180], [98, 44, 98, 180], [136, 44, 136, 180]].forEach(([a, b, c, d]) => g.append(svg('line', { x1: a, y1: b, x2: c, y2: d })));
          k.add(g); if (n === 2) k.hi(g);
        }
        k.T(98, 92, 'SM compute tiles', { anchor: 'middle' }); k.T(98, 147, 'L2 cache', { anchor: 'middle' });
        k.T(59, 171, 'HBM PHY', { anchor: 'middle' }); k.T(137, 171, 'NVLink PHY', { anchor: 'middle' });
        k.T(98, 202, 'GPU die floorplan', { anchor: 'middle' });
        k.T(98, 217, '~800 mm², 80 B transistors', { anchor: 'middle', mono: true, size: 11.5, fill: MUTED });
        if (n === 1) k.hi(die);
        k.arrow(180, 110, 194, 110);
        const panel = k.R(196, 40, 112, 106, PANEL, { stroke: LINE2, rx: 3 });
        if (n === 1) {
          k.T(252, 56, 'RTL (Verilog)', { anchor: 'middle', bold: true });
          ['module sm(', ' input clk,', ' output y);', 'always @(', ' posedge clk)', ' y <= a * b;'].forEach((s, i) => k.T(204, 72 + i * 14, s, { mono: true, size: 11.5, fill: MUTED }));
          k.hi(panel); k.tag(196, 152);
        } else {
          k.T(252, 56, 'Synthesis, P&R', { anchor: 'middle', bold: true });
          ['gates placed on die', 'wires routed', 'timing closed', 'DRC / LVS clean'].forEach((s, i) => k.T(204, 76 + i * 15, s, { size: 11.5, fill: MUTED }));
          if (n === 2) { k.hi(panel); k.tag(196, 152); }
        }
        if (n >= 3) { // GDSII layout file
          k.arrow(310, 90, 322, 90);
          const sheet = k.P('M326,40 H392 L404,52 V140 H326 Z', GROUND, { stroke: LINE2 });
          k.P('M392,40 V52 H404', 'none', { stroke: LINE2 });
          for (let i = 0; i < 5; i++) k.R(334 + (i % 2) * 6, 66 + i * 12, 44 - (i % 3) * 8, 6, i % 2 ? ACC2 : CU, { opacity: .7 });
          k.T(365, 56, 'GDSII', { anchor: 'middle', bold: true, size: 11.5 });
          k.T(365, 152, 'tape-out (frozen)', { anchor: 'middle', size: 11.5, fill: MUTED });
          if (n === 3) { k.hi(sheet); k.tag(326, 22); }
        }
        if (n >= 4) { // photomask, side view, with pellicle
          k.arrow(362, 157, 346, 170);
          const plate = k.R(210, 172, 140, 12, GROUND, { stroke: LINE2 });
          for (let i = 0; i < 11; i++) k.R(216 + i * 12, 184, i % 3 ? 7 : 4, 4, INK, { opacity: .8 });
          k.L(216, 188, 216, 200); k.L(344, 188, 344, 200); k.L(216, 200, 344, 200, { stroke: ACC2, 'stroke-width': 1.5 });
          k.T(356, 181, 'quartz', { size: 11.5 }); k.T(356, 193, 'absorber', { size: 11.5 }); k.T(356, 205, 'pellicle', { size: 11.5 });
          k.T(290, 219, '6-inch mask, one of 70–100+ layers', { anchor: 'middle', size: 11.5 });
          k.T(290, 233, 'mask set ~$20–30M+', { anchor: 'middle', mono: true, size: 11.5, fill: MUTED });
          if (n === 4) { k.hi(plate); k.tag(240, 156, 'middle'); }
        }
        return 'Stage 0 · design: die floorplan → layout file → photomask';
      }

      // ---------- scene 2: materials chain (5–10) ----------
      function sceneMaterials(n, k) {
        const lit = n - 4; // how many plants have run so far
        const NODES = [
          ['quartz lump', '>98% SiO₂', '10–100 mm', (cx, q) => { q.P(`M${cx - 24},140 L${cx - 28},100 L${cx - 12},62 L${cx + 10},58 L${cx + 26},92 L${cx + 22},138 Z`, LINE2, { stroke: MUTED }); q.L(cx - 12, 62, cx - 4, 138, { opacity: .5 }); q.L(cx + 10, 58, cx + 2, 100, { opacity: .5 }); }],
          ['arc furnace', 'MG-Si, 98%', '~2,000 °C', (cx, q) => { q.P(`M${cx - 26},80 L${cx - 22},146 H${cx + 22} L${cx + 26},80 Z`, PANEL, { stroke: MUTED, 'stroke-width': 1.5 }); q.R(cx - 22, 98, 44, 48, LINE2, { opacity: .8 }); q.R(cx - 20, 130, 40, 14, WARN);
            [-18, -4, 10].forEach(x => { q.R(cx + x, 44, 8, 66, MUTED); q.L(cx + x + 4, 110, cx + x + 4, 128, { stroke: ACC, 'stroke-width': 2, 'stroke-dasharray': '2 2' }); }); }],
          ['HCl reactor', 'HCl 300 °C', '→ SiHCl₃', (cx, q) => { q.R(cx - 16, 50, 32, 100, PANEL, { stroke: MUTED, rx: 6 }); for (let i = 0; i < 14; i++) q.C(cx - 10 + (i * 7) % 21, 70 + (i * 11) % 66, 2, SI); q.arrow(cx, 160, cx, 151); q.arrow(cx + 16, 60, cx + 28, 60); }],
          ['distillation', '→ 9N–11N', 'ppt metals', (cx, q) => { q.R(cx - 12, 50, 24, 100, PANEL, { stroke: MUTED, rx: 4 }); for (let i = 1; i < 9; i++) q.L(cx - 12, 50 + i * 11, cx + 12, 50 + i * 11, { opacity: .7 }); q.R(cx + 14, 54, 12, 8, LINE2, { stroke: MUTED }); q.R(cx - 8, 150, 16, 6, WARN); }],
          ['Siemens CVD', '1,100 °C', '3–5 days', (cx, q) => { q.P(`M${cx - 26},150 V70 A26,26 0 0 1 ${cx + 26},70 V150 Z`, PANEL, { stroke: MUTED, 'stroke-width': 1.5 }); q.P(`M${cx - 18},150 V96 A8,8 0 0 1 ${cx - 2},96 V150`, 'none', { stroke: WARN, 'stroke-width': 5 }); q.P(`M${cx + 2},150 V96 A8,8 0 0 1 ${cx + 18},96 V150`, 'none', { stroke: WARN, 'stroke-width': 5 }); }],
          ['polysilicon', '9N–11N', '$20–40/kg', (cx, q) => { q.P(`M${cx - 24},80 H${cx + 24} L${cx + 28},148 H${cx - 28} Z`, LINE2, { opacity: .6, stroke: MUTED }); [[-16, 92], [4, 88], [-8, 112], [12, 116], [-18, 130], [6, 134]].forEach(([dx, dy]) => q.P(`M${cx + dx},${dy} l12,-4 l6,10 l-8,8 l-12,-2 Z`, SI, { stroke: PANEL })); }],
        ];
        NODES.forEach((nd, i) => {
          const cx = 34 + i * 70, on = i < lit;
          const g = svg('g', on ? {} : { opacity: .3 }); nd[3](cx, kit(g)); k.add(g);
          const op = on ? null : .45;
          const tt = [k.T(cx, 170, nd[0], { anchor: 'middle', size: 11.5 }),
          k.T(cx, 185, nd[1], { anchor: 'middle', mono: true, size: 11, fill: MUTED }),
          k.T(cx, 199, nd[2], { anchor: 'middle', mono: true, size: 11, fill: MUTED })]; if (op != null) tt.forEach(t => t.setAttribute('opacity', op));
          if (i < 5) k.arrow(cx + 30, 104, cx + 40, 104, { opacity: i < lit - 1 ? 1 : .3 });
          if (i === lit - 1) { k.hiBox(cx - 30, 40, 60, 116); k.tag(cx, 22, 'middle'); }
        });
        k.T(210, 222, 'purity: 98% SiO₂ → 98–99% Si → 99.9999999%+ (9N–11N)', { anchor: 'middle', size: 11.5, fill: MUTED });
        return 'Stage 1 · quartz → polysilicon: each box is a separate plant';
      }

      // ---------- scene 3: Czochralski crystal growth (11–13) ----------
      function sceneCrystal(n, k) {
        if (n === 13) {
          k.P('M40,110 L70,100 V160 L40,150 Z', SI, { opacity: .3, stroke: MUTED, 'stroke-dasharray': '3 2' });
          k.P('M350,100 L380,112 V148 L350,160 Z', SI, { opacity: .3, stroke: MUTED, 'stroke-dasharray': '3 2' });
          const body = k.R(70, 100, 280, 60, SI, { rx: 4 });
          k.P('M204,100 L210,108 L216,100 Z', PANEL);
          k.T(210, 135, 'single-crystal ingot: ~2 m, ~300–450 kg', { anchor: 'middle', fill: PANEL, size: 11.5 });
          k.T(55, 88, 'crown', { anchor: 'middle', size: 11.5, fill: MUTED }); k.T(365, 88, 'tail', { anchor: 'middle', size: 11.5, fill: MUTED });
          k.T(210, 84, 'notch (orientation)', { anchor: 'middle', size: 11.5 }); k.lead(210, 88, 210, 100);
          k.T(60, 182, 'cropped ends', { size: 11.5, fill: MUTED }); k.T(60, 196, 'ground to Ø 300 mm', { size: 11.5, fill: MUTED });
          [-9, -3, 3, 9].forEach(dx => k.L(300 + dx, 168, 300 + dx, 160, { 'stroke-width': 1.5 }));
          k.R(280, 168, 40, 14, PANEL, { stroke: MUTED, rx: 2 }); k.T(300, 178, '4-pt', { anchor: 'middle', size: 11, mono: true });
          k.T(300, 198, 'resistivity + orientation test', { anchor: 'middle', size: 11.5 });
          k.hi(body); k.tag(24, 214);
          k.T(210, 226, '→ 1,500–2,000 wafers per ingot', { anchor: 'middle', mono: true, size: 11.5, fill: MUTED });
          return 'Stage 1 · finished 300 mm ingot, side view';
        }
        k.R(118, 26, 184, 206, GROUND, { stroke: LINE2, rx: 4 });
        k.T(296, 42, 'Ar, ~20 mbar', { anchor: 'end', mono: true, size: 11.5, fill: MUTED });
        k.R(140, 120, 10, 100, CU, { opacity: .75 }); k.R(270, 120, 10, 100, CU, { opacity: .75 });
        k.P('M154,126 V222 H266 V126 Z', MUTED, { opacity: .75 });
        k.P('M162,132 V216 H258 V132 Z', GROUND, { stroke: LINE2, 'stroke-width': 1.5 });
        const melt = k.R(166, 150, 88, 64, WARN, { opacity: .8 });
        k.T(112, 140, 'graphite heater', { anchor: 'end', size: 11.5 }); k.lead(112, 140, 140, 140);
        k.T(112, 158, 'graphite susceptor', { anchor: 'end', size: 11.5 }); k.lead(112, 158, 156, 158);
        k.T(112, 176, 'quartz crucible', { anchor: 'end', size: 11.5 }); k.lead(112, 176, 163, 176);
        k.T(308, 168, 'Si melt, ~400 kg', { size: 11.5 }); k.T(308, 182, '1,420 °C', { mono: true, size: 11.5, fill: MUTED }); k.T(308, 196, '+ mg of dopant', { size: 11.5, fill: MUTED }); k.lead(308, 170, 252, 170);
        k.T(112, 220, 'chamber', { anchor: 'end', size: 11.5, fill: MUTED });
        if (n === 11) { k.hi(melt); k.tag(308, 208); }
        if (n >= 12) {
          k.R(208, 26, 4, 34, MUTED); k.R(206, 60, 8, 14, SI); k.R(208, 74, 4, 18, SI);
          const cryst = k.P('M208,92 H212 L240,112 V166 H180 V112 Z', SI);
          k.T(112, 68, 'seed crystal', { anchor: 'end', size: 11.5 }); k.lead(112, 68, 206, 68);
          k.T(112, 86, 'Dash neck', { anchor: 'end', size: 11.5 }); k.lead(112, 86, 208, 86);
          k.T(112, 106, 'shoulder', { anchor: 'end', size: 11.5 }); k.lead(112, 106, 192, 104);
          k.T(112, 124, '300 mm body', { anchor: 'end', size: 11.5 }); k.lead(112, 124, 180, 124);
          k.arrow(226, 70, 226, 50, { stroke: ACC, 'stroke-width': 1.5 }); k.T(308, 60, 'pull 0.5–1 mm/min', { size: 11.5 }); k.T(308, 74, 'rotate; MCZ field', { size: 11.5, fill: MUTED });
          k.T(308, 100, 'body ~40–60 h,', { size: 11.5, fill: MUTED }); k.T(308, 114, '~2.5–3.5 d per pull', { size: 11.5, fill: MUTED });
          k.hi(cryst); k.tag(308, 208);
        }
        return 'Stage 1 · Czochralski puller, section — melt freezes onto the seed';
      }

      // ---------- scene 4: wafering (14–18) ----------
      function sceneWafer(n, k) {
        if (n === 14) {
          k.C(44, 56, 12, 'none', { stroke: MUTED, 'stroke-width': 2 }); k.C(376, 56, 12, 'none', { stroke: MUTED, 'stroke-width': 2 });
          k.L(44, 44, 376, 44); k.L(44, 68, 376, 68);
          const ingot = k.R(50, 80, 320, 80, SI, { rx: 4 });
          const web = svg('g', { stroke: MUTED, 'stroke-width': .7 });
          for (let x = 60; x <= 360; x += 4) web.append(svg('line', { x1: x, y1: 68, x2: x, y2: 172 }));
          k.add(web); k.hi(ingot);
          k.T(210, 124, '300 mm ingot', { anchor: 'middle', fill: PANEL });
          k.T(210, 32, 'diamond wire, one ~100 km loop over guide rollers', { anchor: 'middle', size: 11.5 });
          k.T(210, 190, '1,500–2,000 wafers per ingot · ~150 µm kerf lost per cut', { anchor: 'middle', size: 11.5 });
          k.T(210, 206, 'wafer 775 µm | kerf 150 µm | wafer 775 µm …', { anchor: 'middle', mono: true, size: 11.5, fill: MUTED });
          k.tag(24, 220);
          return 'Stage 1 · multi-wire saw, side view — one wire, ~2,000 cuts';
        }
        if (n === 15) {
          const slab = k.R(40, 96, 300, 26, SI, { rx: 13 });
          k.T(190, 113, 'wafer, 775 µm thick, ground flat', { anchor: 'middle', fill: PANEL, size: 11.5 });
          k.C(330, 176, 44, PANEL, { stroke: LINE2, 'stroke-dasharray': '4 3' }); k.L(340, 118, 330, 132, { 'stroke-dasharray': '3 2' });
          k.P('M290,156 H318 A22,20 0 0 1 318,196 H290 Z', SI);
          k.T(300, 232, 'rounded edge bevel (no chipping)', { anchor: 'middle', size: 11.5 });
          k.T(40, 150, 'lapping / grinding: flat to µm', { size: 11.5 }); k.T(40, 166, 'edge profiling: bevel', { size: 11.5 });
          k.T(40, 182, 'damage etch: saw stress removed', { size: 11.5 });
          k.hi(slab); k.tag(40, 60);
          return 'Stage 1 · one wafer, section, with a zoom on its bevelled edge';
        }
        if (n === 16) {
          const top = k.R(40, 66, 340, 26, LINE2); const bot = k.R(40, 130, 340, 26, LINE2);
          k.R(60, 98, 300, 26, SI, { rx: 13 }); k.T(210, 115, 'wafer between two rotating pads', { anchor: 'middle', fill: PANEL, size: 11.5 });
          k.T(210, 82, 'top polishing pad', { anchor: 'middle', size: 11.5 }); k.T(210, 146, 'bottom pad', { anchor: 'middle', size: 11.5 });
          k.arrow(50, 50, 90, 50); k.T(96, 54, 'rotation', { size: 11.5, fill: MUTED });
          [140, 220, 300].forEach(x => k.C(x, 60, 3, ACC2)); k.T(330, 54, 'slurry (silica + chemistry)', { size: 11.5, fill: MUTED, anchor: 'middle' });
          k.T(210, 180, 'double-side polish, then front-side CMP', { anchor: 'middle', size: 11.5 });
          k.T(210, 196, 'roughness < 0.1 nm · flatness SFQR < 20–30 nm', { anchor: 'middle', mono: true, size: 11.5, fill: MUTED });
          k.hi(top); k.hi(bot); k.tag(24, 220);
          return 'Stage 1 · polishing, section — chemistry softens, the pad removes';
        }
        if (n === 17) {
          k.C(110, 128, 84, SI, { opacity: .85 }); k.P('M104,212 L110,204 L116,212 Z', PANEL);
          k.T(110, 124, 'front side', { anchor: 'middle', fill: PANEL }); k.T(110, 140, 'RCA clean: SC-1, SC-2', { anchor: 'middle', fill: PANEL, size: 11.5 });
          k.T(110, 190, 'T2A-0417-B', { anchor: 'middle', fill: PANEL, mono: true, size: 11.5 }); k.T(110, 232, 'laser mark near the notch', { anchor: 'middle', size: 11.5, fill: MUTED });
          k.R(236, 126, 160, 26, SI, { rx: 2 }); const epi = k.R(236, 116, 160, 10, SI, { opacity: .55, stroke: SI });
          k.T(316, 143, 'substrate 775 µm', { anchor: 'middle', fill: PANEL, size: 11.5 });
          k.T(316, 104, 'epitaxial Si, a few µm (logic)', { anchor: 'middle', size: 11.5 }); k.lead(316, 108, 316, 116);
          k.T(316, 176, 'flatness + particle inspection', { anchor: 'middle', size: 11.5 }); k.T(316, 192, 'SFQR < 20–30 nm per site', { anchor: 'middle', mono: true, size: 11.5, fill: MUTED });
          k.hi(epi); k.tag(236, 60);
          return 'Stage 1 · finished wafer: plan view, and section with epi layer';
        }
        // 18: FOUP to fab
        const foup = k.R(120, 50, 180, 160, GROUND, { stroke: LINE2, rx: 8, 'stroke-width': 1.5 });
        for (let i = 0; i < 25; i++) k.R(136, 60 + i * 5.8, 148, 3, SI);
        k.R(110, 36, 200, 14, LINE2, { rx: 3 }); k.T(210, 30, 'OHT handle (overhead transport)', { anchor: 'middle', size: 11.5, fill: MUTED });
        k.T(210, 226, 'FOUP: 25 wafers, sealed, ~$100–150 per prime wafer', { anchor: 'middle', size: 11.5 });
        k.arrow(306, 130, 328, 130, { 'stroke-width': 1.5 });
        k.P('M336,130 L352,114 L368,130 L384,114 L400,130 V210 H336 Z', PANEL, { stroke: LINE2 }); k.T(368, 176, 'fab', { anchor: 'middle', bold: true });
        k.T(50, 120, 'front-opening', { anchor: 'middle', size: 11.5 }); k.T(50, 134, 'door', { anchor: 'middle', size: 11.5 }); k.lead(78, 128, 120, 128);
        k.hi(foup); k.tag(24, 60);
        return 'Stage 1 · shipping — five suppliers make ~90% of 300 mm wafers';
      }

      // ---------- scene 5: transistor + wiring cross-section along the fin (19–43) ----------
      // Camera: steps 19–33 zoom in on one transistor (FEOL/MOL) and show the tool's action above it;
      // from step 34 the view zooms out so the whole wiring stack fits.
      function sceneDevice(n, k) {
        const Z = n <= 33, S = 11.5;
        const X0 = 30, X1 = 390, FX0 = 110, FX1 = 310;
        const G = Z ? { BOT: 236, OT: 210, FB: 198, ST: 9, CH0: 172, CH1: 248, GX0: 180, GX1: 240, GT: 88, CAP: 8, ET: 134, FH: 32, CW: 40, V0T: 74 }
          : { BOT: n >= 42 ? 214 : n === 38 ? 208 : 230, OT: 204, FB: 192, ST: 6, CH0: 182, CH1: 238, GX0: 188, GX1: 232, GT: 116, CAP: 7, ET: 150, FH: 16, CW: 44, V0T: 104 };
        const SY0 = G.FB - 6 * G.ST, C0 = G.CH0 - 10 - G.CW, C1 = G.CH1 + 10, GC = (G.GX0 + G.GX1) / 2, SPW = G.GX0 - G.CH0;
        const outerTop = n >= 21 ? G.OT : G.FB;
        const detail = s => k.T(210, Z ? 50 : 108, s, { anchor: 'middle', size: S });
        const tagZ = () => k.tag(36, 58);
        const rain = (x0, x1, y0, y1, color, gap) => { for (let x = x0; x <= x1 + .1; x += gap || 22) k.arrow(x, y0, x, y1, { stroke: color || ACC, 'stroke-width': 1.2, opacity: .8 }); };
        const lbl = (y, s, tx, ty) => { k.T(104, y, s, { anchor: 'end', size: S }); k.lead(104, y - 4, tx, ty); };
        const CAPTION = Z ? 'Stages 2–3 · one transistor, section along the fin (zoomed in) — not to scale' : 'Stages 4–5 · zoomed out: transistor + wiring stack, section along the fin';

        if (n === 19) { // the whole 775 µm slab; later steps zoom into its top skin
          const slab = k.R(X0, 126, X1 - X0, 110, SI); k.hi(slab);
          k.R(56, 126, 6, 5, PANEL); k.R(66, 126, 6, 5, PANEL);
          k.T(36, 114, 'zero-layer alignment mark, etched in the scribe line', { size: S }); k.lead(62, 118, 62, 126);
          k.R(X0, 126, X1 - X0, 8, 'none', { stroke: ACC2, 'stroke-dasharray': '3 2' });
          k.T(384, 150, 'top ~1 µm = device layer; steps 20+ zoom in here', { anchor: 'end', size: S, fill: PANEL });
          k.T(210, 182, 'Si substrate: single crystal, 300 mm across, 775 µm thick', { anchor: 'middle', size: S, fill: PANEL });
          k.T(210, 198, '~$100–150 per prime wafer · 25 per FOUP', { anchor: 'middle', size: S, fill: PANEL, mono: true });
          [150, 210, 270].forEach(x => { k.R(x - 8, 60, 16, 8, MUTED, { rx: 2 }); for (let i = 0; i < 3; i++) k.C(x - 6 + i * 6, 78 + (i % 2) * 8, 1.6, ACC2); k.arrow(x, 94, x, 120, { stroke: ACC2, opacity: .85, 'stroke-width': 1.2 }); });
          k.T(296, 68, 'spray nozzles', { size: S, fill: MUTED });
          detail('wet clean (RCA SC-1 / SC-2, dilute HF) before the first layer');
          tagZ();
          return CAPTION;
        }

        // substrate (with the fin base) and the zero-layer mark notch
        const sub = k.P(`M${X0},${outerTop} H56 V${outerTop + 5} H64 V${outerTop} H${FX0} V${G.FB} H${FX1} V${outerTop} H${X1} V${G.BOT} H${X0} Z`, SI);
        if (n >= 23 && n !== 38) for (let x = 42; x <= 378; x += 12) k.C(x, G.OT + 4, 1.4, n === 23 ? ACC : ACC2);
        if (n === 42) k.T(36, 228, 'Si substrate thinned 775 → ~100 µm', { size: S });
        else if (n === 43) { k.T(104, 228, 'saw kerf', { anchor: 'middle', size: S }); k.T(316, 228, 'saw kerf', { anchor: 'middle', size: S }); k.T(210, 228, 'known-good die, ~100 µm', { anchor: 'middle', size: S }); }
        else if (n === 38) k.T(384, 201, 'Si <1 µm (flipped)', { size: S, anchor: 'end' });
        else {
          const ly = Z ? 230 : 222;
          k.T(36, ly, 'Si substrate', { fill: PANEL, size: S }); k.T(384, ly, '300 mm · 775 µm', { fill: PANEL, mono: true, size: S, anchor: 'end' });
          if (n >= 23) k.T(210, ly, 'n-/p-well + Vₜ implants', { fill: PANEL, size: S, anchor: 'middle' });
          if (n === 20) { k.T(36, ly - 14, 'zero-layer mark', { fill: PANEL, size: S }); }
        }
        // dielectric bands first so the parts sit on them: ILD0 (28+), V0 level (33+), M0/M1 (34+), Mx (35+)
        if (n >= 28) k.R(X0, G.GT, X1 - X0, G.FB - G.GT, HATCH);
        if (n >= 33) k.R(X0, G.V0T, X1 - X0, G.GT - G.V0T, HATCH);
        if (n >= 34) k.R(X0, 88, X1 - X0, 16, HATCH);
        if (n >= 35) k.R(X0, 52, X1 - X0, 36, HATCH);
        if (n >= 22) { // STI
          const a = k.R(X0, G.FB, FX0 - X0, G.OT - G.FB, HATCH, { stroke: LINE2, 'stroke-width': .6 }), b = k.R(FX1, G.FB, X1 - FX1, G.OT - G.FB, HATCH, { stroke: LINE2, 'stroke-width': .6 });
          k.T(70, G.OT - 3, 'STI oxide', { anchor: 'middle', size: S });
          if (n === 22) { k.hi(a); k.hi(b); tagZ(); detail('liner + flowable oxide fill, CMP flat, then recess to reveal the fin'); rain(50, 94, 80, G.FB - 4); rain(326, 370, 80, G.FB - 4); }
        }
        if (n === 23) { tagZ(); detail('ion implant: B (p-well), P / As (n-well), Vₜ adjust, then anneal'); rain(122, 298, 60, SY0 - 8); rain(50, 94, 80, G.FB - 4); rain(326, 370, 80, G.FB - 4); }
        // sheet stack: whole wafer at 20, the fin at 21–25, only the channel from 26
        if (n >= 20) {
          const sx0 = n === 20 ? X0 : n >= 26 ? G.CH0 : FX0, sx1 = n === 20 ? X1 : n >= 26 ? G.CH1 : FX1;
          for (let i = 0; i < 6; i++) {
            const y = SY0 + i * G.ST, isSi = i % 2 === 0;
            if (n >= 29 && !isSi) { k.R(G.GX0, y, G.GX1 - G.GX0, G.ST, ACC2); k.R(sx0, y, G.GX0 - sx0, G.ST, MUTED); k.R(G.GX1, y, sx1 - G.GX1, G.ST, MUTED); }
            else if (n >= 26 && !isSi) { k.R(sx0, y, G.GX0 - sx0, G.ST, MUTED); k.R(G.GX0, y, G.GX1 - G.GX0, G.ST, LINE2); k.R(G.GX1, y, sx1 - G.GX1, G.ST, MUTED); }
            else k.R(sx0, y, sx1 - sx0, G.ST, isSi ? SI : LINE2, { stroke: PANEL, 'stroke-width': .5 });
          }
          const mid = SY0 + 3 * G.ST + 4;
          if (n === 20) { k.hiBox(sx0, SY0, sx1 - sx0, 6 * G.ST); k.T(210, mid, 'Si / SiGe superlattice: 3–4 pairs, ~5–10 nm each (GAA only)', { anchor: 'middle', size: S }); tagZ();
            detail('epitaxial CVD grows alternating Si and SiGe layers, ~600–700 °C'); rain(122, 298, 60, SY0 - 6); }
          if (n === 21) { k.R(FX0, SY0 - 8, FX1 - FX0, 8, MUTED); k.hiBox(FX0, SY0 - 8, FX1 - FX0, 6 * G.ST + 8); lbl(SY0 - 2, 'hard mask', FX0, SY0 - 4);
            detail('hard mask + EUV / SAQP pattern, then a deep anisotropic Si etch'); tagZ();
            rain(122, 298, 60, SY0 - 14, ACC2); rain(50, 94, 150, G.OT - 4); rain(326, 370, 150, G.OT - 4); }
          if (n >= 21 && n <= 25) k.T(210, mid, 'Si / SiGe sheets', { anchor: 'middle', size: S });
          if (n >= 26) k.T(210, mid, 'channel', { anchor: 'middle', size: S });
        }
        if (n === 26) { k.T(147, G.FB - 12, 'recess', { anchor: 'middle', size: S, fill: MUTED }); k.T(273, G.FB - 12, 'recess', { anchor: 'middle', size: S, fill: MUTED });
          lbl(SY0 + 14, 'inner spacers', G.CH0 + 2, SY0 + 13); tagZ(); rain(126, 166, 60, G.FB - 28, null, 20); rain(254, 294, 60, G.FB - 28, null, 20);
          detail('S/D recess etch; SiGe notched and refilled as inner spacers'); }
        if (n >= 27) { // raised source/drain epi touching the channel
          const s = k.P(`M112,${G.FB} V${G.ET + G.FH} L128,${G.ET} H${G.CH0} V${G.FB} Z`, OK), d = k.P(`M308,${G.FB} V${G.ET + G.FH} L292,${G.ET} H${G.CH1} V${G.FB} Z`, OK);
          const lx = (112 + G.CH0) / 2, rx = (308 + G.CH1) / 2, ty = G.ET + (Z ? 26 : 20);
          k.T(lx, ty, 'source', { anchor: 'middle', fill: PANEL, size: S }); k.T(lx, ty + 14, 'epi', { anchor: 'middle', fill: PANEL, size: S });
          k.T(rx, ty, 'drain', { anchor: 'middle', fill: PANEL, size: S }); k.T(rx, ty + 14, 'epi', { anchor: 'middle', fill: PANEL, size: S });
          if (n === 27) { k.hi(s); k.hi(d); tagZ(); rain(126, 166, 60, G.ET - 6, null, 20); rain(254, 294, 60, G.ET - 6, null, 20); detail('selective epi: SiGe:B for PMOS, Si:P for NMOS, ~600–700 °C'); }
        }
        if (n >= 24) { // dummy gate (24–28) or HKMG (29+), spacers (25+), cap (30+)
          const gTop = n >= 30 ? G.GT + G.CAP : G.GT, gm = gTop + (SY0 - gTop) / 2;
          const gate = k.R(G.GX0, gTop, G.GX1 - G.GX0, SY0 - gTop, n >= 29 ? ACC2 : LINE2, n >= 29 ? {} : { stroke: MUTED, 'stroke-dasharray': '3 2' });
          k.T(GC, gm - 2, n >= 29 ? 'HKMG' : 'dummy', { anchor: 'middle', size: S, fill: n >= 29 ? PANEL : INK });
          k.T(GC, gm + 12, 'gate', { anchor: 'middle', size: S, fill: n >= 29 ? PANEL : INK });
          if (n === 24) { k.hi(gate); tagZ(); rain(G.GX0 + 6, G.GX1 - 6, 60, G.GT - 4, ACC2, 12); detail('a-Si + oxide deposited, EUV-patterned and etched: a placeholder gate'); }
          if (n === 29) { k.hi(gate); tagZ(); rain(G.GX0 + 6, G.GX1 - 6, 60, G.GT - 4, null, 12); detail('dummy out, SiGe released; SiO₂ IL + HfO₂ high-k + TiN/TiAlC + W fill'); }
          if (n >= 25) { const a = k.R(G.CH0, G.GT, SPW, SY0 - G.GT, MUTED), b = k.R(G.GX1, G.GT, SPW, SY0 - G.GT, MUTED);
            if (n <= 29) lbl(G.GT + 8, 'low-k spacer', G.CH0, G.GT + 6);
            if (n === 25) { k.hi(a); k.hi(b); tagZ(); rain(126, 166, 60, SY0 - 6, null, 20); rain(254, 294, 60, SY0 - 6, null, 20); rain(G.GX0 + 6, G.GX1 - 6, 60, G.GT - 4, null, 12);
              detail('ALD SiOCN everywhere, then an anisotropic etch leaves only the sidewalls'); } }
          if (n >= 30) { const cap = k.R(G.GX0, G.GT, G.GX1 - G.GX0, G.CAP, MUTED);
            if (n === 30) { k.hi(cap); tagZ(); lbl(G.GT + 6, 'SiN cap', G.GX0, G.GT + 4); rain(G.GX0 + 6, G.GX1 - 6, 60, G.GT - 4, null, 12); detail('gate recessed under a SiN cap; gate line cut between devices'); } }
        }
        if (n >= 28) { k.T(70, G.GT + (G.FB - G.GT) / 2 + 4, 'ILD0 oxide', { anchor: 'middle', size: S });
          if (n === 28) { tagZ(); rain(122, 298, 60, G.GT - 4); detail('SiN liner + flowable ILD0 oxide, CMP back to the dummy-gate top'); } }
        if (n >= 31) { // contact trenches (31), filled contacts (32+)
          const fill = n >= 32 ? CU : GROUND, o = n >= 32 ? {} : { stroke: MUTED, 'stroke-dasharray': '3 2' };
          const a = k.R(C0, G.GT, G.CW, G.ET - G.GT, fill, o), b = k.R(C1, G.GT, G.CW, G.ET - G.GT, fill, o);
          if (n >= 32) [C0 + G.CW / 2, C1 + G.CW / 2].forEach(x => { k.T(x, G.GT + 15, 'S/D', { anchor: 'middle', size: S, fill: PANEL }); k.T(x, G.GT + 29, 'contact', { anchor: 'middle', size: S, fill: PANEL }); });
          if (n === 31) { k.hi(a); k.hi(b); tagZ(); lbl(G.GT + 22, 'contact trench', C0, G.GT + 20); rain(C0 + 4, C0 + G.CW - 4, 60, G.GT - 4, null, 16); rain(C1 + 4, C1 + G.CW - 4, 60, G.GT - 4, null, 16); detail('EUV contact pattern, etched through ILD0 down to the S/D epi'); }
          if (n === 32) { k.hi(a); k.hi(b); tagZ(); rain(C0 + 4, C0 + G.CW - 4, 60, G.GT - 4, null, 16); rain(C1 + 4, C1 + G.CW - 4, 60, G.GT - 4, null, 16); detail('Ti/TiN liner forms TiSiₓ on the epi; Co, W or Ru fill; CMP'); }
        }
        if (n >= 33) { // gate contact through the cap, V0 vias on the S/D contacts
          const gc = k.R(GC - 6, G.V0T, 12, G.GT + G.CAP - G.V0T, CU), v1 = k.R(C0 + G.CW / 2 - 7, G.V0T, 14, G.GT - G.V0T, CU), v2 = k.R(C1 + G.CW / 2 - 7, G.V0T, 14, G.GT - G.V0T, CU);
          if (n === 33) { [gc, v1, v2].forEach(k.hi); tagZ(); lbl(G.V0T + 11, 'V0 via', C0 + G.CW / 2 - 8, G.V0T + 7);
            k.T(210, 68, 'gate contact', { anchor: 'middle', size: S }); k.lead(210, 70, 210, G.V0T);
            detail('gate contact through the cap + V0 vias (W/Co/Ru), CMP: wiring can start'); }
        }
        if (n >= 34) { // M0/M1 lines
          k.R(124, 90, 52, 12, CU, { stroke: PANEL, 'stroke-width': .8 }); k.R(196, 90, 28, 12, CU, { stroke: PANEL, 'stroke-width': .8 }); k.R(244, 90, 52, 12, CU, { stroke: PANEL, 'stroke-width': .8 });
          k.T(150, 100, 'M0/M1', { anchor: 'middle', size: S, fill: PANEL }); k.T(323, 100, 'M0/M1: Cu or Ru', { size: S });
          if (n === 34) { k.hiBox(124, 90, 172, 12); k.tag(36, 89); k.T(210, 80, 'low-k ILD, EUV/SALELE pattern, TaN barrier, Cu fill, CMP', { anchor: 'middle', size: S }); k.T(210, 62, 'view zoomed out: the transistor is now the small block at the bottom', { anchor: 'middle', size: S, fill: MUTED }); }
        }
        if (n >= 35) { // Mx bundle: 4 levels drawn to stand for 15–18
          for (let j = 0; j < 4; j++) {
            const ly = 79 - j * 9, vy = 85 - j * 9;
            [150, 270].forEach(x => k.R(x - 4, vy, 8, 5, CU)); if (j < 2) k.R(206, vy, 8, 5, CU);
            const lines = j === 0 ? [[124, 52], [196, 28], [244, 52]] : j < 3 ? [[124, 96], [244, 52]] : [[124, 172]];
            lines.forEach(([x, w]) => k.R(x, ly, w, 6, CU, { stroke: PANEL, 'stroke-width': .8 }));
          }
          k.P('M318,52 H322 V88 H318', 'none', { stroke: MUTED }); k.T(325, 66, 'Mx × 15–18', { bold: true, size: S }); k.T(325, 80, 'pitch 24 nm→µm', { size: S, fill: MUTED });
          k.T(70, 78, 'low-k ILD', { anchor: 'middle', size: S });
          if (n === 35) { k.hiBox(124, 52, 172, 36); k.tag(36, 52); k.T(210, 44, 'via + trench filled in one Cu plating step, repeated per level', { anchor: 'middle', size: S }); }
        }
        if (n >= 36) { // top metal / RDL
          const tm = k.R(104, 36, 212, 14, CU, { stroke: PANEL, 'stroke-width': .8 }); k.R(204, 50, 12, 2, CU);
          k.T(210, 46.5, 'top metal / RDL (thick Al or Cu)', { anchor: 'middle', size: S, fill: PANEL });
          if (n === 36) { k.hi(tm); k.tag(36, 36); k.T(210, 28, 'thick global wiring, MIM capacitors, pads', { anchor: 'middle', size: S }); }
        }
        if (n >= 37) { // passivation with a pad opening
          const a = k.R(X0, 26, 164, 10, WARN, { opacity: .45, stroke: WARN, 'stroke-width': .8 }), b = k.R(226, 26, X1 - 226, 10, WARN, { opacity: .45, stroke: WARN, 'stroke-width': .8 });
          k.T(386, 34, n === 43 ? 'passivation' : 'passivation (SiN/SiO₂)', { anchor: 'end', size: S });
          if (n === 37) { k.hi(a); k.hi(b); k.tag(36, 6); k.T(236, 16, 'pad opening through polyimide', { size: S }); k.lead(232, 18, 212, 30); }
          else if (n === 38) { k.T(236, 16, 'pad opening', { size: S }); k.lead(232, 18, 212, 30); }
        }
        if (n === 38) { // optional backside power delivery
          [k.R(FX0, 208, FX1 - FX0, 8, CU), k.R(126, 192, 6, 16, CU), k.R(288, 192, 6, 16, CU)].forEach(k.hi); k.tag(36, 6);
          k.T(210, 232, 'A16-class only: flip, thin to <1 µm, nano-TSVs + backside rail', { anchor: 'middle', size: S });
        }
        if (n === 39) { k.R(60, 0, 20, 20, MUTED, { rx: 2 }); k.L(70, 20, 70, 26, { stroke: ACC2, 'stroke-width': 1.5 }); k.P('M64,20 L70,26 L76,20', 'none', { stroke: ACC2, 'stroke-dasharray': '2 1' });
          k.T(86, 12, 'CD-SEM / overlay / defect scan', { size: S }); k.tag(330, 4); }
        if (n === 40) { k.R(280, 0, 80, 8, LINE2); k.hi(k.L(300, 8, 212, 35, { 'stroke-width': 2 })); k.T(300, 20, 'probe needle', { size: S });
          k.tag(36, 6); k.T(110, 16, 'ATE → wafer map, bins', { size: S }); }
        if (n >= 41) { const p = k.R(198, 8, 24, 28, CU); k.add(svg('ellipse', { cx: 210, cy: 8, rx: 13, ry: 6, fill: WARN }));
          k.T(232, 12, 'Cu pillar µbump, ~40 µm pitch', { size: S }); if (n === 41) { k.hi(p); k.tag(36, 6); } }
        if (n === 42) { k.hi(sub); k.tag(250, 217); }
        if (n === 43) { [104, 316].forEach(x => k.L(x, 22, x, G.BOT + 4, { stroke: ACC, 'stroke-width': 2, 'stroke-dasharray': '5 3' })); k.tag(36, 6); }
        return CAPTION;
      }

      // ---------- scene 6: HBM stack (44–48) ----------
      function sceneHBM(n, k) {
        k.C(62, 120, 48, GROUND, { stroke: LINE2 });
        for (let i = -4; i <= 4; i++) { k.L(62 + i * 10, 76, 62 + i * 10, 164, { opacity: .35 }); k.L(16, 120 + i * 10, 108, 120 + i * 10, { opacity: .35 }); }
        k.R(62, 110, 10, 10, SI); k.T(62, 184, 'DRAM wafer', { anchor: 'middle', size: 11.5 }); k.T(62, 198, '~1,000 steps', { anchor: 'middle', mono: true, size: 11.5, fill: MUTED });
        k.arrow(114, 120, 138, 120);
        const die = (y, hgt) => { k.R(150, y, 140, hgt, SI); for (let i = 0; i < 10; i++) k.R(157 + i * 14, y, 3, hgt, CU); };
        if (n === 44) { die(100, 24); k.hiBox(150, 100, 140, 24); k.T(300, 106, 'DRAM die, 775 µm', { size: 11.5 }); k.T(300, 120, 'TSVs: ~1,024 per die', { size: 11.5 }); k.T(300, 134, '(2,048 for HBM4)', { mono: true, size: 11.5, fill: MUTED }); k.tag(300, 82); }
        if (n >= 45) { const b = k.R(150, 180, 140, 20, ACC2); k.T(220, 194, 'base logic die', { anchor: 'middle', size: 11.5, fill: PANEL });
          if (n === 45) { k.hi(b); k.tag(300, 166); k.T(300, 194, 'DRAM node (HBM3E)', { size: 11.5 }); k.T(300, 208, 'or TSMC N12/N5', { size: 11.5, fill: MUTED }); die(100, 24); k.T(300, 116, 'DRAM die', { size: 11.5 }); } }
        if (n === 46) { die(112, 8); k.hiBox(150, 112, 140, 8); for (let i = 0; i < 10; i++) k.C(158.5 + i * 14, 123, 2, WARN);
          k.T(300, 106, 'thinned to ~30 µm', { size: 11.5 }); k.T(300, 120, 'TSVs revealed', { size: 11.5 }); k.T(300, 134, 'backside µbumps', { size: 11.5 }); k.tag(300, 76); }
        if (n >= 47) {
          for (let i = 0; i < 8; i++) { const yb = 180 - i * 11; k.R(150, yb - 3, 140, 3, WARN, { opacity: .8 }); die(yb - 11, 8); }
          k.P('M294,92 H298 V180 H294', 'none', { stroke: MUTED });
          k.T(304, 104, '8-high (12/16 for', { size: 11.5 }); k.T(304, 118, 'HBM3E / HBM4)', { size: 11.5 }); k.T(304, 136, 'bond: TC-NCF,', { size: 11.5, fill: MUTED }); k.T(304, 150, 'MR-MUF or hybrid', { size: 11.5, fill: MUTED });
          k.T(304, 168, 'each die ~30 µm', { mono: true, size: 11.5, fill: MUTED });
          if (n === 47) { k.hiBox(150, 92, 140, 88); k.tag(304, 76); }
        }
        if (n === 48) { k.R(150, 40, 140, 30, PANEL, { stroke: LINE2, rx: 3 }); k.T(220, 52, 'ATE + burn-in', { anchor: 'middle', size: 11.5 });
          k.hi(k.P('M200,62 L208,68 L222,56', 'none', { 'stroke-width': 2.5 })); k.T(236, 66, 'KGSD', { bold: true, size: 11.5 });
          k.tag(304, 44); k.T(304, 68, 'known-good', { size: 11.5 }); k.T(304, 82, 'stacked die ships', { size: 11.5 }); }
        k.T(20, 222, 'stack: 24–36 GB, ~3–5× the $/bit of DDR5, sold out 2025–26', { size: 11.5, fill: MUTED });
        return 'Stage 6 · HBM, side view — DRAM dies stacked on a logic base die';
      }

      // ---------- scene 7: CoWoS packaging (49–54) ----------
      function scenePack(n, k) {
        const ST = 176, SB = 214;
        const subst = k.R(60, ST, 300, SB - ST, GROUND, { stroke: LINE2 });
        k.R(60, 190, 300, 10, LINE2); for (let i = 0; i < 3; i++) { k.L(64, 180 + i * 3.5, 356, 180 + i * 3.5, { stroke: CU, 'stroke-width': 1.2 }); k.L(64, 204 + i * 3.5, 356, 204 + i * 3.5, { stroke: CU, 'stroke-width': 1.2 }); }
        k.T(210, 198, 'core', { anchor: 'middle', size: 11.5, halo: false });
        k.T(210, n >= 54 ? 233 : 228, 'ABF substrate, 10–20 Cu layers', { anchor: 'middle', size: 11.5 });
        if (n === 49) {
          k.hi(subst); k.tag(36, 216);
          k.R(250, 30, 150, 120, PANEL, { stroke: LINE2, 'stroke-dasharray': '4 3', rx: 3 }); k.L(250, 150, 300, 176, { 'stroke-dasharray': '3 2' }); k.L(400, 150, 356, 176, { 'stroke-dasharray': '3 2' });
          for (let i = 0; i < 4; i++) { k.R(260, 40 + i * 24, 130, 12, HATCH); k.R(260, 52 + i * 24, 130, 12, CU, { opacity: .85 }); }
          k.P('M286,100 L282,88 H298 L294,100 Z', CU, { opacity: .85 }); k.P('M356,100 L352,88 H368 L364,100 Z', CU, { opacity: .85 });
          k.T(325, 50, 'ABF dielectric', { anchor: 'middle', size: 11.5 }); k.T(325, 85, 'Cu (SAP plating)', { anchor: 'middle', size: 11.5, fill: PANEL }); k.T(325, 98, 'laser via', { anchor: 'middle', size: 11.5 });
          k.T(325, 146, 'zoom: build-up layers', { anchor: 'middle', size: 11.5, fill: MUTED });
          k.T(60, 60, 'core drilled + plated,', { size: 11.5 }); k.T(60, 74, 'then ~10–20 layers built', { size: 11.5 }); k.T(60, 88, 'up on both faces', { size: 11.5 });
        }
        if (n >= 50) {
          const MB = n >= 53 ? 170 : 120, IH = n >= 52 ? 10 : 22, IT = MB - IH; // interposer bottom/height/top
          k.R(110, IT, 200, IH, SI); for (let i = 0; i < 8; i++) k.R(122 + i * 25, IT, 3, IH, CU); k.L(112, IT + 2, 308, IT + 2, { stroke: CU, 'stroke-width': 1.5 }); k.L(112, IT + 5, 308, IT + 5, { stroke: CU, 'stroke-width': 1.5 });
          k.T(316, IT + 8, n >= 52 ? 'interposer, thinned' : 'Si interposer', { size: 11.5 }); if (n < 53) k.T(316, IT + 22, 'TSVs + 3–4 Cu RDL', { size: 11.5, fill: MUTED });
          if (n === 50) { k.hiBox(110, IT, 200, IH); k.tag(316, IT - 20); k.T(60, 60, 'CoWoS-S: silicon interposer;', { size: 11.5 }); k.T(60, 74, 'CoWoS-L: RDL + Si bridges', { size: 11.5 }); k.T(210, IT + 40, 'built on its own 300 mm wafer, in parallel', { anchor: 'middle', size: 11.5, fill: MUTED }); }
          if (n >= 51) { // GPU die + two HBM stacks on microbumps, molded
            const DT = IT - 44;
            k.R(110, DT, 200, 44, LINE2, { opacity: .5 });
            for (let x = 116; x < 306; x += 6) k.C(x, IT - 2, 1.6, WARN);
            k.R(170, DT, 80, 40, ACC2); k.T(210, DT + 24, 'GPU die', { anchor: 'middle', size: 11.5, fill: PANEL });
            [118, 262].forEach(x => { k.R(x, DT + 34, 40, 6, ACC2); for (let i = 0; i < 8; i++) k.R(x, DT + i * 4.2, 40, 3, SI); k.T(x + 20, DT + 22, 'HBM', { anchor: 'middle', size: 11.5 }); });
            if (n === 51 || n === 52) k.T(210, 152, 'substrate from step 49 waits below; joined at step 53 (WoS)', { anchor: 'middle', size: 11.5, fill: MUTED });
            if (n === 51) { k.hiBox(110, DT, 200, 44); k.tag(36, DT + 10); k.T(60, DT - 12, 'µbumps ~40 µm pitch, underfill, mold', { size: 11.5 }); k.lead(116, DT - 8, 116, IT - 4); }
          }
          if (n >= 52) { // C4 bumps under the thinned interposer
            for (let x = 118; x <= 302; x += 12) k.C(x, MB + 3, 3, WARN);
            if (n === 52) { k.hiBox(112, MB - 1, 196, 8); k.tag(36, MB - 2); k.T(60, 30, 'thin from the back, reveal TSVs,', { size: 11.5 }); k.T(60, 44, 'C4 bumps, dice into modules', { size: 11.5 }); }
            if (n >= 53) { k.R(110, MB, 200, 6, WARN, { opacity: .35 }); k.T(316, 186, 'C4 + underfill', { size: 11.5 }); if (n === 53) { k.hiBox(108, MB - 2, 204, 10); k.tag(36, MB - 8); } }
          }
          if (n >= 54) { // lid over TIM, BGA balls
            const DT = IT - 44;
            k.R(118, DT - 4, 184, 4, WARN); const lid = k.R(70, DT - 14, 280, 10, LINE2); k.R(70, DT - 14, 10, 14 + ST - DT, LINE2); k.R(340, DT - 14, 10, 14 + ST - DT, LINE2);
            for (let x = 70; x <= 350; x += 20) k.C(x, SB + 5, 4, WARN);
            k.T(64, DT - 6, 'lid', { anchor: 'end', size: 11.5 }); k.T(64, DT + 8, 'TIM', { anchor: 'end', size: 11.5 }); k.lead(66, DT + 4, 118, DT - 2);
            k.T(364, SB + 9, 'BGA balls', { size: 11.5 });
            if (n === 54) { k.hi(lid); k.tag(210, DT - 34, 'middle'); }
          }
        }
        return 'Stage 7 · CoWoS package, side view — CoW first, then WoS';
      }

      // ---------- scene 8: test and system (55–60) ----------
      function sceneSystem(n, k) {
        const pkg = (x, y) => { // package icon: substrate, die, lid, balls; base line at y
          k.R(x - 60, y - 10, 120, 10, GROUND, { stroke: LINE2 }); k.R(x - 30, y - 36, 60, 26, ACC2); k.R(x - 50, y - 46, 100, 10, LINE2);
          for (let i = -5; i <= 5; i++) k.C(x + i * 10, y + 3, 3, WARN);
        };
        if (n === 55 || n === 56) {
          k.R(60, 170, 300, 14, OK, { opacity: .35, stroke: OK }); k.T(210, 196, n === 55 ? 'ATE load board' : 'system board (SLT)', { anchor: 'middle', size: 11.5 });
          k.R(120, 140, 180, 30, GROUND, { stroke: MUTED }); k.T(64, 160, 'test socket', { anchor: 'end', size: 11.5 }); k.lead(66, 156, 120, 156);
          pkg(210, 150); k.hiBox(148, 102, 124, 56); k.R(190, 84, 40, 20, MUTED); k.T(316, 104, 'thermal head', { size: 11.5 }); k.lead(314, 100, 230, 96);
          k.R(316, 120, 84, 44, PANEL, { stroke: LINE2, rx: 3 }); k.L(300, 156, 316, 156);
          if (n === 55) { k.T(358, 134, 'ATE', { anchor: 'middle', bold: true, size: 11.5 }); k.T(358, 150, 'V93000 class', { anchor: 'middle', size: 11.5, fill: MUTED });
            k.T(60, 60, 'package final test: structural + functional patterns', { size: 11.5 }); k.T(60, 76, 'burn-in at high voltage + temperature; speed / power bins', { size: 11.5 }); }
          else { k.T(358, 134, 'host CPU', { anchor: 'middle', bold: true, size: 11.5 }); k.T(358, 150, 'real workloads', { anchor: 'middle', size: 11.5, fill: MUTED });
            k.P('M60,50 L80,50 L90,30 L100,70 L110,40 L120,60 L130,50 L200,50 L210,30 L220,70 L230,50 L300,50', 'none', { stroke: OK, 'stroke-width': 1.5 });
            k.T(60, 76, 'hours of real workloads catch what structural test misses', { size: 11.5 }); }
          k.tag(24, 214);
          return 'Stage 8 · package in a test socket, side view';
        }
        if (n === 57) {
          k.R(50, 150, 320, 16, OK, { opacity: .35, stroke: OK }); k.T(56, 162, 'SXM module PCB', { size: 11.5 });
          pkg(210, 150); k.hiBox(148, 102, 124, 56); [60, 88, 116].forEach(x => { k.R(x, 132, 22, 18, CU, { opacity: .8 }); k.R(x + 260, 132, 22, 18, CU, { opacity: .8 }); });
          k.T(80, 122, 'VRMs', { anchor: 'middle', size: 11.5 }); k.T(340, 122, 'VRMs', { anchor: 'middle', size: 11.5 });
          k.R(180, 166, 60, 12, MUTED); k.T(210, 194, 'mezzanine connector', { anchor: 'middle', size: 11.5, fill: MUTED });
          k.T(60, 60, 'reflow-soldered; VRMs feed 700 W (H100) to 1,400 W (GB300)', { size: 11.5 });
          k.tag(24, 214);
          return 'Stage 8 · SXM module, side view — the package on its power board';
        }
        if (n === 58) {
          k.R(40, 40, 340, 172, OK, { opacity: .25, stroke: OK });
          for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { const x = 56 + c * 82, y = 50 + r * 92; k.R(x, y, 60, 50, ACC2); k.R(x + 4, y + 4, 52, 42, LINE2, { opacity: .75 }); k.T(x + 30, y + 29, 'GPU', { anchor: 'middle', size: 11.5, halo: false }); }
          k.hiBox(52, 46, 316, 148);
          [105, 197].forEach(y => k.L(44, y, 376, y, { stroke: SI, 'stroke-width': 3, opacity: .7 })); k.T(376, 109, 'coolant', { size: 11.5, anchor: 'end' });
          [96, 186, 276].forEach(x => k.R(x, 114, 24, 14, MUTED)); k.T(310, 125, '4× NVSwitch', { size: 11.5 });
          k.T(210, 226, 'HGX baseboard: 8 SXM GPUs, cold plates + coolant manifolds', { anchor: 'middle', size: 11.5 });
          k.T(60, 30, 'cold plate on each GPU', { size: 11.5 }); k.lead(120, 34, 100, 54);
          k.tag(300, 20);
          return 'Stage 8 · HGX baseboard, plan view (GB200 tray: 2 CPUs + 4 GPUs)';
        }
        if (n === 59) {
          const rack = k.R(140, 24, 140, 208, GROUND, { stroke: LINE2 });
          for (let i = 0; i < 27; i++) { const sw = i >= 9 && i < 18; k.R(146, 30 + i * 7.3, 128, 6, sw ? ACC2 : SI, { opacity: .85 }); }
          k.hi(rack); k.R(284, 30, 6, 196, CU); k.R(130, 30, 6, 196, WARN);
          k.T(134, 66, '18 compute trays', { anchor: 'end', size: 11.5 }); k.T(134, 80, '(2 CPU + 4 GPU each)', { anchor: 'end', size: 11.5, fill: MUTED });
          k.T(134, 130, '9 NVSwitch trays', { anchor: 'end', size: 11.5 }); k.T(124, 190, 'busbar', { anchor: 'end', size: 11.5 }); k.lead(126, 187, 132, 180);
          k.T(296, 66, 'NVLink Cu spine', { size: 11.5 }); k.T(296, 80, '~5,000 cables', { size: 11.5, fill: MUTED }); k.lead(296, 90, 290, 100);
          k.T(296, 150, '72 GPUs · 36 CPUs', { mono: true, size: 11.5 }); k.T(296, 164, '~120–140 kW', { mono: true, size: 11.5 }); k.T(296, 178, '~$3–4M per rack', { mono: true, size: 11.5 });
          k.T(296, 206, 'CDU + cold plates', { size: 11.5, fill: MUTED }); k.T(296, 220, 'liquid-cooled', { size: 11.5, fill: MUTED });
          k.tag(296, 30);
          return 'Stage 8 · GB200 NVL72 rack, front view';
        }
        // 60: a row of racks
        for (let i = 0; i < 6; i++) { const x = 50 + i * 56; k.R(x, 100, 36, 90, GROUND, { stroke: LINE2 }); for (let j = 0; j < 9; j++) k.R(x + 4, 106 + j * 9, 28, 6, j >= 3 && j < 6 ? ACC2 : SI, { opacity: .8 }); k.L(x + 18, 100, x + 18, 70, { stroke: CU }); }
        k.hiBox(46, 96, 330, 98);
        k.R(40, 56, 340, 14, MUTED, { rx: 2 }); k.T(210, 66, 'InfiniBand / Ethernet fabric + optics', { anchor: 'middle', size: 11.5, fill: PANEL });
        k.L(40, 200, 380, 200, { stroke: SI, 'stroke-width': 3 }); k.R(386, 150, 24, 50, LINE2, { stroke: MUTED }); k.T(398, 140, 'CDU', { anchor: 'middle', size: 11.5 });
        k.T(210, 214, 'coolant loop', { anchor: 'middle', size: 11.5, fill: MUTED });
        k.T(210, 34, '~1,400 NVL72 racks ≈ 100k GPUs · 150–200 MW · ~$10B+ hardware', { anchor: 'middle', size: 11.5 });
        k.tag(24, 206);
        return 'Stage 8 · a row of racks with cooling and network fabric';
      }

      function draw(n) {
        xsSvg.innerHTML = '';
        const pat = svg('pattern', { id: uid + '-ox', patternUnits: 'userSpaceOnUse', width: 6, height: 6 });
        pat.append(svg('rect', { width: 6, height: 6, fill: GROUND }), svg('path', { d: 'M0,6 L6,0', stroke: LINE2, 'stroke-width': 1 }));
        xsSvg.append(svg('defs', null, pat));
        const g = svg('g', n <= 2 ? { transform: 'translate(48,0)' } : null); const k = kit(g);
        const cap = n <= 4 ? sceneDesign(n, k) : n <= 10 ? sceneMaterials(n, k) : n <= 13 ? sceneCrystal(n, k) : n <= 18 ? sceneWafer(n, k) : n <= 43 ? sceneDevice(n, k) : n <= 48 ? sceneHBM(n, k) : n <= 54 ? scenePack(n, k) : sceneSystem(n, k);
        xsSvg.append(g);
        kit(xsSvg).T(210, 245, cap, { anchor: 'middle', size: 11, fill: MUTED });
        xsSvg.setAttribute('aria-label', 'Step ' + n + ' schematic: ' + cap);
        legend.style.display = n >= 19 && n <= 43 ? '' : 'none';
      }

      function render() {
        cur = Math.max(1, Math.min(TOTAL, cur));
        const s = STEPS[cur - 1];
        hint.textContent = HINT0;
        slider.value = cur;
        count.textContent = `Step ${cur} / ${TOTAL}`;
        prevBtn.disabled = cur === 1; nextBtn.disabled = cur === TOTAL;
        title.textContent = `${cur}. ${s.name}`;
        desc.textContent = s.desc;
        modLink.textContent = 'Go to module ' + pad(s.mod) + ' →';
        modLink.setAttribute('href', '#/m/' + pad(s.mod));
        dots.forEach((d, n) => { d.classList.toggle('active', n === cur); d.classList.toggle('done', n < cur); });
        stDay.textContent = fabClock(cur);
        stGroup.textContent = s.glabel;
        stLayers.textContent = metalLevels(cur);
        draw(cur);
      }
      slider.addEventListener('input', () => { cur = +slider.value; render(); });
      prevBtn.addEventListener('click', () => { cur--; render(); });
      nextBtn.addEventListener('click', () => { cur++; render(); });

      let raf = 0;
      const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(layout); });
      ro.observe(el);
      layout();
      render();
      return () => { ro.disconnect(); cancelAnimationFrame(raf); };
    }
  });
})();
