/* chain-map — "The Supply Chain in One Map" (Module 00) */
(function () {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  const CAT = {
    mat: { label: 'Materials', v: 'var(--si)' },
    fab: { label: 'Wafer fab & sort', v: 'var(--accent)' },
    mem: { label: 'Memory (HBM, parallel branch)', v: 'var(--accent2)' },
    pkg: { label: 'Packaging & test', v: 'var(--cu)' },
    sys: { label: 'Boards, racks, data centers', v: 'var(--ok)' },
  };

  // The 16 stages of the main chain, in order, following Module 00's "Chain in One Table" (the fab
  // row is split into FEOL / MOL / BEOL as the module text does). name lines are split on '|'.
  const NODES = [
    { id: 'quartz', name: 'Quartz mining', cat: 'mat', mod: 1, glyph: 'rock', out1: '$50–150 / t',
      why: 'Silicon is 28 % of the Earth’s crust, so the ore is not scarce; quartz pure enough to smelt (>98 % SiO₂, low in iron, boron and phosphorus) is, and the ultra-pure quartz for crystal-growth crucibles comes from a handful of deposits such as Spruce Pine.',
      in: 'Quartzite / vein quartz ore', out: 'Lump quartz (>98 % SiO₂), 10–100 mm pieces',
      who: 'Sibelco, The Quartz Corp, Chinese and Brazilian miners',
      cost: '~$50–150 per tonne (metallurgical); ~$5 000–10 000/t for high-purity crucible quartz', time: 'Days',
      where: 'Norway, Brazil, China, Spruce Pine NC' },
    { id: 'mgsi', name: 'Carbothermic|reduction', cat: 'mat', mod: 1, glyph: 'furnace', out1: 'MG-Si $2–3/kg',
      why: 'Lump quartz and carbon (coal, charcoal, wood chips) are melted in a submerged arc furnace at ~2 000 °C: SiO₂ + 2C → Si + 2CO. The product is 98–99 % “metallurgical-grade” silicon (MG-Si); each tonne eats ~11–13 MWh, so smelters sit next to cheap hydro or coal power.',
      in: 'Quartz + coal / charcoal / wood chips', out: 'Metallurgical-grade silicon (MG-Si, 98–99 %)',
      who: 'Examples: Ferroglobe, Elkem, Hoshine and other smelters',
      cost: '~$2–3/kg', time: 'Hours per tap; continuous', where: 'China, Norway, Brazil, USA' },
    { id: 'poly', name: 'Polysilicon', cat: 'mat', mod: 1, glyph: 'siemens', out1: '9N–11N $30/kg',
      why: 'MG-Si is converted to the liquid trichlorosilane (SiHCl₃), distilled until impurities are parts-per-trillion, then decomposed onto electrically heated silicon U-rods in a bell-jar (Siemens) reactor. That is a billion-fold purity gain to 9N–11N (99.9999999 %+), which is what “electronic grade” means.',
      in: 'MG-Si + HCl → trichlorosilane → CVD', out: 'Electronic-grade polysilicon (9N–11N)',
      who: 'Wacker, Hemlock, Tokuyama, OCI; solar-grade: GCL, Tongwei, Daqo',
      cost: '~$20–40/kg electronic grade (solar-grade fell to ~$5/kg in 2024–25)', time: '~1 week per batch incl. distillation',
      where: 'Germany, USA, Japan, Korea, Malaysia, China' },
    { id: 'ingot', name: 'Crystal|growth', cat: 'mat', mod: 2, glyph: 'cz', out1: 'ingot ~$150k',
      why: 'Polysilicon is melted at ~1 420 °C in a quartz crucible and a small seed crystal is slowly pulled out while rotating (the Czochralski, or CZ, process); the melt freezes onto it as one continuous single crystal, because a transistor needs a defect-free lattice with a known orientation.',
      in: 'Polysilicon chunks + dopant', out: 'Single-crystal ingot, 300 mm dia., ~2 m long, ~300–450 kg',
      who: 'Examples: Shin-Etsu, SUMCO, GlobalWafers, Siltronic, SK Siltron, NSIG / Shanghai Xinsheng',
      cost: 'Ingot value ~$100–200k', time: '~2.5–3.5 days per crystal (melt, seed, pull, cool)', where: 'Japan, Taiwan, Germany, Korea, USA, China' },
    { id: 'wafer', name: 'Wafering', cat: 'mat', mod: 3, glyph: 'wafering', out1: '$100–150 each',
      why: 'The ingot is ground to exactly 300 mm, sliced by a diamond-wire saw into ~1 500–2 000 slices, then ground, etched and polished to sub-nanometre roughness: a 775 µm-thick mirror that is flat to a few tens of nanometres, because EUV lithography has a depth of focus that small.',
      in: 'Ingot', out: 'Polished prime wafer, 300 mm, 775 µm thick',
      who: 'Examples: Shin-Etsu, SUMCO, GlobalWafers, Siltronic, SK Siltron, NSIG / Shanghai Xinsheng',
      cost: '~$100–150 polished; ~$200–300 with an epitaxial (extra grown) silicon layer', time: '~2–3 weeks', where: 'Japan, Taiwan, Germany, Korea, USA, China' },
    { id: 'feol', name: 'Fab: FEOL', cat: 'fab', mod: 11, glyph: 'feol', out1: 'transistors',
      why: 'FEOL = front end of line: the fab steps that build the transistors themselves (isolation, wells, the gate stack, source/drain epitaxy) through hundreds of deposition, lithography, etch and implant steps. This is where the ~2 nm alignment tolerances and the ~20–25 EUV mask layers live.',
      in: 'Bare wafers + ~70–100+ masks + gases, chemicals, resists', out: 'Transistors: gate stack, source/drain epitaxy',
      who: 'TSMC, Samsung, Intel Foundry (leading edge)',
      cost: 'Part of the wafer price: N4 ~$16–17k; N3 ~$18–20k; N2 ~$30k', time: '~6–7 of the fab’s ~12–14 weeks',
      where: 'Taiwan (~90 % of leading edge), Korea, USA, Japan' },
    { id: 'mol', name: 'Fab: MOL', cat: 'fab', mod: 11, glyph: 'mol', out1: 'contact plugs',
      why: 'MOL = middle of line: the tiny metal plugs (tungsten, cobalt or ruthenium) that connect each transistor up to the wiring above, at the tightest pitch on the whole chip (~25–30 nm).',
      in: 'FEOL wafer', out: 'Contacts to every transistor (W, Co or Ru)',
      who: 'Same fabs', cost: 'Part of the wafer price above', time: '~1 week', where: 'Same fab' },
    { id: 'beol', name: 'Fab: BEOL', cat: 'fab', mod: 12, glyph: 'beol', out1: '$17k N4 wafer',
      why: 'BEOL = back end of line: ~15–18 levels of copper wiring built by dual damascene (etch trenches and holes into the insulator, line them, fill with electroplated copper, polish flat), from ~24–28 nm pitch at the bottom to microns at the top. The whole fab pass takes ~3 months and turns a $150 wafer into a ~$17 000 one.',
      in: 'MOL wafer', out: 'Patterned wafer with ~15–18 copper metal layers',
      who: 'Same fabs', cost: 'Wafer now worth N4 ~$16–17k; N3 ~$18–20k; N2 ~$30k', time: '~5 weeks; whole fab pass ~3 months (12–14 weeks)', where: 'Same fab' },
    { id: 'sort', name: 'Wafer sort', cat: 'fab', mod: 14, glyph: 'sort', out1: '$1–5 per die',
      why: 'Every die on the finished wafer is tested electrically through a probe card (thousands of needles pressed onto its pads) by an automatic tester; the result is a wafer map of good, bad and speed-binned die. For a big GPU, harvesting partly-good die (e.g. 132 of 144 blocks enabled) is what makes yield workable.',
      in: 'Finished wafer', out: 'Wafer map of good/bad die, bins',
      who: 'Fab or test OSAT (KYEC), on Advantest / Teradyne testers',
      cost: '~$1–5 per die for large logic', time: 'Hours per wafer', where: 'Co-located with the fab' },
    { id: 'dice', name: 'Bump, thin|& dice', cat: 'pkg', mod: 16, glyph: 'dice', out1: '$50–200/wafer',
      why: 'Before packaging the wafer gets its solder micro-bumps or copper pillars, is ground from 775 µm down to a few hundred µm, and is cut (blade, laser or plasma dicing) into individual known-good die. This is the moment a wafer becomes chips.',
      in: 'Sorted wafer', out: 'Singulated, bumped known-good die',
      who: 'Fab (TSMC) or OSAT (ASE, Amkor); DISCO tools', cost: '~$50–200 per wafer', time: 'Days', where: 'Taiwan, Korea, China, Malaysia' },
    { id: 'cowos', name: 'Advanced|packaging', cat: 'pkg', mod: 17, glyph: 'cowos', out1: 'CoWoS $500–1k',
      why: 'CoWoS = chip-on-wafer-on-substrate, TSMC’s 2.5D packaging: the GPU die and its HBM stacks are bonded side by side onto a silicon interposer (a slab of silicon carrying thousands of fine wires between them), which is then mounted on an organic substrate. CoWoS capacity has been the tightest constraint on AI-accelerator supply since 2023.',
      in: 'GPU die + HBM + interposer/bridges + substrate', out: '2.5D package (CoWoS)',
      who: 'TSMC (~90 %+ of CoWoS-class), ASE/SPIL, Amkor; substrates from Ibiden, Unimicron',
      cost: '~$500–1 000 per package incl. substrate', time: '~2–4 weeks', where: 'Taiwan; Arizona (Amkor) from ~2028' },
    { id: 'test', name: 'Final test +|burn-in', cat: 'pkg', mod: 18, glyph: 'test', out1: '$20–100/part',
      why: 'The packaged part is tested on an automatic tester, often “burned in” at high temperature and voltage to weed out early failures, and increasingly run in a socket with real workloads (system-level test). Fallout is a few percent, but each unit is worth tens of thousands of dollars.',
      in: 'Packaged part', out: 'Binned, speed-graded GPU',
      who: 'Fab/OSAT/test house (KYEC, ASE), Advantest V93000', cost: '~$20–100+ per high-end part', time: 'Hours to days', where: 'Taiwan' },
    { id: 'sxm', name: 'SXM module', cat: 'sys', mod: 19, glyph: 'sxm', out1: 'up to 1 400 W',
      why: 'SXM is NVIDIA’s mezzanine-card format: the tested package is soldered to a PCB with its voltage regulators (VRMs), which turn rack power into the ~1 V, ~1 000 A the GPU needs. An H100 draws up to 700 W, a B200 up to 1 000 W, a GB300 up to 1 400 W.',
      in: 'GPU package + VRMs + PCB', out: 'SXM module (700–1 400 W)',
      who: 'Foxconn, Quanta, Wistron, Inventec',
      cost: 'BOM of a finished H100 module ~$3 300 (die ~$350, HBM ~40–50 %); sold at ~$25–30k', time: '~1–2 weeks', where: 'Taiwan, Mexico, USA, China' },
    { id: 'board', name: 'HGX / GB200|board', cat: 'sys', mod: 19, glyph: 'board', out1: '8 GPUs ~$250k',
      why: 'Eight SXM modules plus NVSwitch chips make an HGX baseboard; in the Grace-Blackwell era a “Bianca” compute board carries two Grace CPUs and four Blackwell GPUs. The multilayer PCB itself comes from Unimicron, TTM or WUS.',
      in: 'SXM modules + baseboard + NVSwitch', out: 'HGX 8-GPU baseboard or GB200 “Bianca” compute board',
      who: 'Foxconn, Quanta, Wistron, Inventec; PCBs from Unimicron, TTM, WUS',
      cost: 'HGX 8-GPU baseboard ~$200–300k at list', time: '~1–2 weeks', where: 'Taiwan, Mexico, USA, China' },
    { id: 'rack', name: 'Server / rack', cat: 'sys', mod: 19, glyph: 'rack', out1: 'NVL72 ~$3–4M',
      why: 'Boards go into a server or a compute tray with CPUs, DRAM, network cards and storage; 18 compute trays + 9 NVSwitch trays + a copper NVLink spine of ~5 000 cables make a GB200 NVL72 rack: 72 GPUs, ~120–140 kW, liquid-cooled through cold plates.',
      in: 'Boards + CPUs + DRAM + NICs + storage; 18 compute + 9 switch trays per rack', out: 'DGX/HGX server or GB200 NVL72 rack, ~120–140 kW',
      who: 'Same ODMs; Dell, HPE, Supermicro as OEMs',
      cost: 'DGX H100 ~$300–400k; GB200 tray >$500k; NVL72 rack ~$3–4M', time: 'Weeks incl. burn-in', where: 'Taiwan, Mexico, USA' },
    { id: 'dc', name: 'Data center', cat: 'sys', mod: 19, glyph: 'dc', out1: '$30–50M / MW',
      why: 'Racks are installed with power, cooling and an InfiniBand or Ethernet network to form an AI cluster. 100 000 GPUs is ~1 400 NVL72 racks, ~150–200 MW of IT load and on the order of $10 billion of hardware, 12–24 months after ground-breaking.',
      in: 'Racks + power + cooling + network', out: 'AI cluster (10k–1M+ GPUs)',
      who: 'Hyperscalers, neoclouds, xAI/OpenAI-class builders',
      cost: '~$30–50M per MW all-in; ~$10B+ per 100k-GPU cluster', time: '12–24 months to build', where: 'USA (Texas, Virginia, Arizona), Gulf, Nordics, everywhere' },
  ];
  const HBM = { id: 'hbm', name: 'HBM|manufacturing', cat: 'mem', mod: 15, glyph: 'hbm', out1: '$15–20 per GB',
    why: 'HBM = high-bandwidth memory: 8, 12 or 16 DRAM dies, each thinned to ~30 µm, stacked on a logic base die and wired vertically through ~1 000–2 000 TSVs (through-silicon vias: copper-filled holes through the die). It is made in a separate DRAM fab and meets the GPU die at packaging.',
    in: 'DRAM wafers with TSVs', out: '8-, 12- or 16-high stacks, 24–48 GB each',
    who: 'SK hynix (~50 %), Samsung (~33 %), Micron (~18 %)',
    cost: '~$200–700 per stack; ~$15–20/GB (estimates vary)', time: 'DRAM fab ~2–3 months + ~1 week stacking/test',
    where: 'Korea; Taiwan and Japan (Micron); Singapore/USA (Micron, ramping)' };
  const ALL = NODES.concat([HBM]);

  // Value of the material from ONE 300 mm wafer (Module 00 table + H100 worked example:
  // ~$16 500 wafer, ~45–50 sellable die, BOM ~$3 300/module, sold ~$25–30k/module).
  const VALUE = [
    { v: 7, txt: '~$5–10', cap: 'poly-Si per wafer', mult: null },
    { v: 150, txt: '$150', cap: 'bare polished wafer', mult: '×20' },
    { v: 17000, txt: '$17 000', cap: 'processed N4 wafer', mult: '×113' },
    { v: 150000, txt: '~$150 000', cap: '45–50 modules, BOM', mult: '×9' },
    { v: 1300000, txt: '~$1.3 M', cap: '45–50 modules, sold', mult: '×8.5' },
  ];

  // ---------- mini schematics, drawn in a 44 x 44 box ----------
  function glyph(svg, kind) {
    const R = (x, y, w, h, fill, o) => svg('rect', Object.assign({ x, y, width: w, height: h, fill }, o || {}));
    const P = (d, o) => svg('path', Object.assign({ d, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, o || {}));
    const C = (cx, cy, r, o) => svg('circle', Object.assign({ cx, cy, r }, o || {}));
    const ink = 'var(--ink)', mu = 'var(--muted)', si = 'var(--si)', cu = 'var(--cu)', ac = 'var(--accent)', a2 = 'var(--accent2)',
      ok = 'var(--ok)', pn = 'var(--panel)', cc = 'currentColor', n4 = [0, 1, 2, 3], n5 = [0, 1, 2, 3, 4];
    switch (kind) {
      case 'rock': return [P('M6 30 L12 14 L20 6 L30 10 L38 22 L34 36 L16 40 Z', { fill: si, 'fill-opacity': .35, stroke: si, 'stroke-width': 1.5 }),
        P('M12 14 L22 24 L38 22 M22 24 L16 40 M22 24 L34 36', { stroke: si, 'stroke-width': 1 })];
      case 'furnace': return [P('M7 14 L11 41 L33 41 L37 14', { fill: pn, stroke: ink, 'stroke-width': 1.5 }),
        P('M9 18 L35 18 L34 32 L10 32 Z', { fill: mu, 'fill-opacity': .4 }), P('M10 32 L34 32 L33 40 L11 40 Z', { fill: ac }),
        R(12, 0, 4, 23, mu), R(20, 0, 4, 23, mu), R(28, 0, 4, 23, mu),
        P('M14 23 L15 27 M22 23 V27 M30 23 L29 27', { stroke: ac, 'stroke-width': 1.5 }), P('M33 38 L42 43', { stroke: ac, 'stroke-width': 2.5 })];
      case 'siemens': return [R(3, 40, 38, 3, mu), P('M8 40 V16 A14 14 0 0 1 36 16 V40', { fill: pn, stroke: ink, 'stroke-width': 1.5 }),
        P('M12 40 V20 a4 4 0 0 1 8 0 V40 M24 40 V20 a4 4 0 0 1 8 0 V40', { stroke: cc, 'stroke-width': 3.5 })];
      case 'cz': return [P('M8 30 L10 43 L34 43 L36 30', { fill: pn, stroke: ink, 'stroke-width': 1.5 }), P('M9.5 34 L34.5 34 L34 43 L10 43 Z', { fill: ac }),
        P('M22 0 V5', { stroke: ink, 'stroke-width': 1.2 }), P('M22 5 L16 11 V27 L22 34 L28 27 V11 Z', { fill: si, stroke: si, 'stroke-width': 1 })];
      case 'wafering': return [R(1, 6, 12, 32, si, { 'fill-opacity': .45, stroke: si, 'stroke-width': 1.2 }), R(16, 6, 3, 32, si),
        P('M14.5 2 V42', { stroke: ink, 'stroke-width': 1, 'stroke-dasharray': '2 2' }),
        P('M35.3 31.4 A9.5 9.5 0 1 0 30.7 31.4 L33 28.5 Z', { fill: si, 'fill-opacity': .3, stroke: si, 'stroke-width': 1.5 })];
      case 'feol': return [R(2, 30, 40, 12, si, { 'fill-opacity': .3, stroke: si, 'stroke-width': 1 }), R(7, 22, 8, 8, ok, { 'fill-opacity': .8 }),
        R(29, 22, 8, 8, ok, { 'fill-opacity': .8 }), R(15, 22, 14, 8, si), R(15, 19, 14, 3, 'var(--warn)'), R(15, 6, 14, 13, cc)];
      case 'mol': return [R(0, 2, 44, 32, mu, { 'fill-opacity': .15 }), R(2, 34, 40, 8, si, { 'fill-opacity': .3, stroke: si, 'stroke-width': 1 }),
        R(7, 26, 8, 8, ok, { 'fill-opacity': .8 }), R(29, 26, 8, 8, ok, { 'fill-opacity': .8 }), R(15, 26, 14, 8, si), R(15, 16, 14, 10, ac),
        R(9, 2, 4, 24, ink, { 'fill-opacity': .75 }), R(20, 2, 4, 14, ink, { 'fill-opacity': .75 }), R(31, 2, 4, 24, ink, { 'fill-opacity': .75 })];
      case 'beol': return [R(0, 0, 44, 44, mu, { 'fill-opacity': .12 }), R(2, 3, 40, 6, cu), R(19, 9, 6, 5, cu), R(8, 14, 28, 5, cu), R(19, 19, 6, 5, cu),
        R(12, 24, 20, 4, cu), R(19, 28, 6, 5, cu), R(15, 33, 14, 3.5, cu), R(19, 36.5, 6, 6, cu)];
      case 'sort': return [R(6, 2, 32, 7, mu), P('M11 9 L15 18 M17 9 L19 18 M22 9 V18 M27 9 L25 18 M33 9 L29 18', { stroke: ink, 'stroke-width': 1.2 }),
        C(22, 30, 12, { fill: si, 'fill-opacity': .3, stroke: si, 'stroke-width': 1.5 }),
        P('M14 21 V39 M22 18 V42 M30 21 V39 M11 26 H33 M10 30 H34 M11 34 H33', { stroke: si, 'stroke-width': .8 })];
      case 'dice': return [C(19, 26, 15, { fill: si, 'fill-opacity': .3, stroke: si, 'stroke-width': 1.5 }),
        P('M11 13.3 V38.7 M19 11 V41 M27 13.3 V38.7 M6.3 18 H31.7 M4 26 H34 M6.3 34 H31.7', { stroke: si, 'stroke-width': .9 }),
        R(31, 3, 10, 10, cc), C(33, 15, 1.3, { fill: cu }), C(36, 15, 1.3, { fill: cu }), C(39, 15, 1.3, { fill: cu })];
      case 'cowos': return [R(2, 33, 40, 8, ok, { 'fill-opacity': .55 }), R(5, 27, 34, 6, si), R(15, 11, 14, 16, ac),
        ...n4.map(i => R(6, 12 + i * 3.8, 7, 3, a2)), ...n4.map(i => R(31, 12 + i * 3.8, 7, 3, a2)), ...n5.map(i => C(8 + i * 7, 42.5, 1.5, { fill: mu }))];
      case 'test': return [R(4, 24, 36, 11, pn, { rx: 2, stroke: ink, 'stroke-width': 1.3 }),
        P('M8 35 V40 M14 35 V40 M20 35 V40 M26 35 V40 M32 35 V40 M38 35 V40', { stroke: mu, 'stroke-width': 1.2 }),
        R(13, 15, 18, 9, cc), P('M28 8 L33 13 L42 2', { stroke: ok, 'stroke-width': 3 })];
      case 'sxm': return [R(2, 6, 40, 30, pn, { rx: 2, stroke: cc, 'stroke-width': 1.5 }), R(8, 12, 16, 16, cc), R(29, 10, 9, 8, mu), R(29, 22, 9, 8, mu), R(6, 36, 32, 5, cu)];
      case 'board': return [R(2, 3, 40, 38, pn, { rx: 2, stroke: cc, 'stroke-width': 1.5 }),
        ...n4.map(i => R(6 + i * 9, 7, 7, 7, cc)), ...n4.map(i => R(6 + i * 9, 30, 7, 7, cc)), ...n4.map(i => R(7 + i * 9, 19, 5, 6, ink, { 'fill-opacity': .6 }))];
      case 'rack': return [R(11, 1, 22, 42, pn, { rx: 1.5, stroke: cc, 'stroke-width': 1.5 }),
        ...[0, 1, 2, 3, 4, 5].map(i => R(13.5, 4 + i * 6.4, 17, 4.6, cc, { 'fill-opacity': .2 + (i % 2) * .2, stroke: cc, 'stroke-width': .6 }))];
      case 'dc': return [P('M2 12 L22 3 L42 12 V41 H2 Z', { fill: pn, stroke: cc, 'stroke-width': 1.5 }),
        ...n5.map(i => R(6 + i * 7, 16, 4.5, 9, cc)), ...n5.map(i => R(6 + i * 7, 28, 4.5, 9, cc))];
      case 'hbm': return [R(5, 36, 34, 6, ink, { 'fill-opacity': .6 }), ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => R(9, 32.5 - i * 3.6, 26, 2.9, a2)),
        P('M14 7 V36 M20 7 V36 M26 7 V36 M32 7 V36', { stroke: pn, 'stroke-width': .9 }), ...n5.map(i => C(9 + i * 6.5, 43, 1.2, { fill: cu }))];
      default: return [];
    }
  }

  window.registerWidget('chain-map', {
    title: 'The Supply Chain in One Map',
    caption: 'Follow the material, then explore where chip design and a separate memory line meet it. Select a phase or stage to inspect the transformation. Suppliers are selected examples; downstream packaging and systems follow the high-end GPU case, not every chip supply chain.',
    mount(el, ctx) {
      const { h, svg } = ctx;
      let current = NODES.find(n => n.id === 'cowos');
      const icon = (name, size = 64) => {
        const d = svg('svg', { viewBox: '0 0 44 44', width: size, height: size, 'aria-hidden': 'true', style: { flexShrink: '0' } });
        glyph(svg, name).forEach(x => d.append(x)); return d;
      };
      const phases = [
        { name: '01 · Material', label: 'Purify & shape', id: 'ingot', glyph: 'cz', cat: 'mat' },
        { name: '02 · Wafer fab', label: 'Build the circuit', id: 'feol', glyph: 'feol', cat: 'fab' },
        { name: '03 · Packaging', label: 'Bring chips together', id: 'cowos', glyph: 'cowos', cat: 'pkg' },
        { name: '04 · Systems', label: 'Power & connect', id: 'rack', glyph: 'rack', cat: 'sys' }
      ];
      const overview = h('div', { class: 'w-studio' });
      overview.append(h('div', { class: 'w-figure-title' }, 'One material journey. Two essential branches.'));
      const strip = h('div', { class: 'w-stage-strip', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 145px), 1fr))', gap: '10px' } });
      const phaseBtns = phases.map((phase, i) => {
        const b = h('button', { class: 'w-btn', 'data-phase': phase.cat, style: { display: 'grid', justifyItems: 'start', gap: '7px', whiteSpace: 'normal', textAlign: 'left', padding: '14px', borderTop: '3px solid ' + CAT[phase.cat].v }, on: { click: () => choose(phase.id) } },
          h('span', { style: { fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)' } }, phase.name), icon(phase.glyph, 56), h('strong', null, phase.label), h('span', { style: { color: CAT[phase.cat].v } }, i < 3 ? 'Continues →' : 'Compute at scale'));
        strip.append(b); return b;
      });
      const branches = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '12px', marginTop: '14px' } },
        h('div', { style: { padding: '12px', borderLeft: '2px solid var(--accent)', background: 'var(--panel)' } }, h('b', null, 'Circuit design → wafer fab'), h('div', { class: 'w-note', style: { margin: '4px 0 0' } }, 'The design becomes the masks that tell the fab where to build each layer.')),
        h('button', { class: 'w-btn', 'data-id': 'hbm', style: { display: 'flex', alignItems: 'center', gap: '12px', whiteSpace: 'normal', textAlign: 'left', borderLeft: '2px dashed var(--accent2)' }, on: { click: () => choose('hbm') } }, icon('hbm', 44), h('span', null, h('b', null, 'HBM memory → packaging'), h('span', { style: { display: 'block', fontWeight: '400', marginTop: '4px' } }, 'A separate DRAM line joins the GPU die here.'))));
      overview.append(strip, branches);
      const select = h('select', { 'aria-label': 'Manufacturing stage', style: { width: '100%' } });
      ALL.forEach(n => select.append(h('option', { value: n.id }, (NODES.indexOf(n) >= 0 ? (NODES.indexOf(n) + 1) + '. ' : 'Parallel · ') + n.name.replace('|', ' '))));
      const prev = h('button', { class: 'w-btn', on: { click: () => advance(-1) } }, '← Previous');
      const next = h('button', { class: 'w-btn', on: { click: () => advance(1) } }, 'Next →');
      const nav = h('div', { class: 'w-console' }, h('label', { class: 'w-ctl' }, h('span', null, 'Inspect a stage'), select), h('div', { class: 'w-step-nav' }, prev, next));
      const mechanism = h('div', { class: 'w-studio' });
      const explanation = h('div', { class: 'w-insight', 'aria-live': 'polite' });
      const extra = h('div', { class: 'w-grid2' });
      const reference = h('details', { class: 'w-reference' }, h('summary', null, 'Suppliers, timing & estimated economics'), extra);
      const value = h('details', { class: 'w-reference' }, h('summary', null, 'Follow the value of one wafer’s material'),
        h('div', { class: 'w-note' }, 'Illustrative H100 worked example from Module 00. These are estimates at different stages, including additional components and finally selling price; they are not interchangeable measures of cost.'),
        h('div', { style: { display: 'grid', gap: '10px', padding: '12px 0' } }, ...VALUE.map(p => h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(105px, 1fr) 2fr', gap: '16px', alignItems: 'baseline', borderBottom: '1px solid var(--line)', paddingBottom: '8px' } }, h('b', { style: { fontFamily: 'var(--mono)', color: 'var(--accent)' } }, p.txt), h('span', null, p.cap)))),
        h('div', { class: 'w-formula' }, 'Per-wafer sales ≈ 45–50 sellable modules × $25–30k. Module BOM ≈ 45–50 × $3,300.'));
      const field = (title, text) => h('div', null, h('div', { class: 'w-figure-title' }, title), h('div', null, text));
      function choose(id) { current = ALL.find(n => n.id === id); render(); }
      function advance(delta) { const i = ALL.indexOf(current); choose(ALL[Math.max(0, Math.min(ALL.length - 1, i + delta))].id); }
      function render() {
        const n = current, i = ALL.indexOf(n); select.value = n.id;
        prev.disabled = i === 0; next.disabled = i === ALL.length - 1;
        phaseBtns.forEach((b, j) => { const active = phases[j].cat === n.cat || (n.cat === 'mem' && phases[j].cat === 'pkg'); b.classList.toggle('primary', active); b.setAttribute('aria-pressed', active); });
        mechanism.replaceChildren(h('div', { class: 'w-figure-title' }, 'The transformation · ' + CAT[n.cat].label),
          h('div', { style: { display: 'flex', gap: '18px', alignItems: 'center', margin: '12px 0 20px' } }, icon(n.glyph, 100), h('div', null, h('h3', { style: { margin: '0 0 6px', fontSize: '22px' } }, n.name.replace('|', ' ')), h('a', { href: '#/m/' + pad(n.mod) }, 'Read module ' + pad(n.mod) + ' →'))),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px' } }, field('IN →', n.in), field('OUT →', n.out)));
        explanation.textContent = n.why;
        extra.replaceChildren(field('Suppliers', n.who), field('Estimated cost / value', n.cost), field('Elapsed time', n.time), field('Where', n.where));
      }
      select.addEventListener('change', () => choose(select.value));
      el.classList.add('chain-map-lab');
      el.append(h('style', null, '@container(max-width:480px){.chain-map-lab .w-stage-strip .w-btn{grid-template-columns:48px minmax(0,1fr);gap:3px 12px!important;padding:10px 12px!important;border-top-width:1px!important;border-left:3px solid var(--line2)}.chain-map-lab .w-stage-strip .w-btn>svg{grid-column:1;grid-row:1/3;width:44px;height:44px}.chain-map-lab .w-stage-strip .w-btn>span:first-child{grid-column:2}.chain-map-lab .w-stage-strip .w-btn>strong{grid-column:2;font-size:13px;line-height:1.4}.chain-map-lab .w-stage-strip .w-btn>span:last-child{display:none}.chain-map-lab .w-stage-strip .w-btn.primary{border-left-color:var(--accent)}}'), overview, nav, mechanism, explanation, h('div', { class: 'w-note' }, 'Schematics show the sequence and convergence of processes, not physical scale. Supplier shares, timelines and prices are course estimates; see the module’s sources and review notes.'), reference, value);
      render();
    }
  });
})();
