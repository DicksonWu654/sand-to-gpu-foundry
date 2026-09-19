// Commissioning missions: the teaching sequence you play through to build a station or a fab bay.
// brief: cards (h, p, fig?) shown first. build: {scene, fig, why, decoys} (place the numbered parts) or
// {fig, mode:'stack'|'order'} (layers or components from an authored figure). commission: course widgets
// with live targets (see challenges.js). certify: quiz modules. Figure keys are "mNN/<section>" from figures.js.
window.SG = window.SG || {};

SG.MISSIONS = {
  mine: {
    title: 'Open the quartz mine', brief: [
      { h: 'Silicon is not scarce; purity is', p: 'Silicon is 28% of the Earth\'s crust, bound to oxygen as quartz (SiO₂). The whole chain from here to a GPU is one long purification and shaping of that one element. The mine supplies lump quartz for the arc furnace and, from a handful of deposits such as Spruce Pine, the ultra-pure quartz that becomes the crucibles in the crystal puller.', fig: 'm01/2-the-rock-quartz-and-quartzite' },
      { h: 'Why the furnace wants rock, not sand', p: 'The charge in a submerged-arc furnace must stay porous so that carbon monoxide can escape upward through it. Lump quartz and lump carbon leave open paths; loose beach sand would pack solid and choke the furnace. That is why the industry says "sand to chips" but actually mines quartzite.' },
      { h: 'The chain in one map', p: 'Before digging, look at the whole road: material purification, wafer fabrication, packaging with a separate memory line joining late, and systems. Every station you build is one stop on this map.' }
    ],
    build: { scene: 'charge-bed', fig: 'm01/2-the-rock-quartz-and-quartzite', why: ['Lump quartz supplies the silicon oxide; its chemistry and strength decide whether it survives the furnace heat without crumbling.', 'Carbon (coal, charcoal, wood chips) is the reductant that strips oxygen from the quartz.', 'Reaction gas must rise between the solids; a packed bed with open paths is the difference between a furnace and a plug.'], decoys: ['Vacuum pump'] },
    commission: [{ widget: 'chain-map' }], certify: { modules: [1], n: 1 }
  },
  furnace: {
    title: 'Build the arc furnace', brief: [
      { h: 'Break the strongest bond in geochemistry', p: 'The Si–O bond is worth ~450 kJ/mol. Carbon takes the oxygen away at ~2,000 °C: SiO₂ + 2C → Si + 2CO. The reaction needs ~8 MWh per tonne of silicon in theory; real furnaces use 11–13 MWh/t, which is why they sit next to cheap hydro power in Norway, Brazil and China.', fig: 'm01/3-carbothermic-reduction-the-submerged-arc-furnace' },
      { h: 'What comes out', p: 'Metallurgical-grade silicon, 98–99% pure, tapped as a liquid and cast into lumps, at roughly $2–3 per kg. That is seven orders of magnitude short of what a fab needs, but it is the feedstock for every purification route that follows. About 2 tonnes of carbon monoxide leave per tonne of silicon.' }
    ],
    build: { scene: 'arc-furnace', fig: 'm01/3-carbothermic-reduction-the-submerged-arc-furnace', why: ['Three graphite electrodes carry the arc current into the bed; the heat is generated inside the charge, not around it, which is what "submerged" means.', 'The charge of lump quartz and carbon is fed from the top and slowly sinks as it reacts.', 'Carbon monoxide rises through the open bed and burns at the top; it is the oxygen leaving.', 'Molten silicon pools at the bottom and is tapped through a separate hole into ladles.'], decoys: ['Quartz crucible', 'Photomask'] },
    commission: [], certify: { modules: [1], n: 2 }
  },
  siemens: {
    title: 'Build the Siemens plant', brief: [
      { h: 'You cannot purify a solid, so make a liquid', p: 'Silicon is turned into trichlorosilane (SiHCl₃, TCS), a liquid that boils at 32 °C, by reacting MG-Si with HCl in a fluidized bed. Liquids can be distilled. Multi-stage fractional distillation removes metal chlorides to parts-per-trillion levels.', fig: 'm01/4-the-siemens-process' },
      { h: 'Boron is the hard one', p: 'Boron trichloride boils only ~19 °C from TCS, and crystal growth cannot reject boron later (segregation coefficient ~0.8), so it must be chased chemically with guard beds and complexing agents. Metals like iron segregate strongly to the melt (k ~10⁻⁵) and their chlorides stay in the column bottoms anyway.' },
      { h: 'Then rebuild the solid', p: 'Purified TCS and hydrogen decompose on silicon rods heated to ~1,100 °C inside a water-cooled bell jar for 3–5 days, growing 9N–11N polysilicon. Most of the electricity (40–60 kWh/kg in a modern reactor) is lost as radiation from the hot rods to the cold wall, which is why the FBR route exists as an alternative.', fig: 'm01/5-fbr-granular-polysilicon-the-silane-route' }
    ],
    build: { scene: 'siemens', fig: 'm01/4-the-siemens-process', why: ['Metallurgical silicon reacts with HCl in a fluidized bed to make crude chlorosilanes: the solid becomes a liquid that can be purified.', 'Fractional distillation separates the volatile feed from its impurities by boiling point, stage after stage.', 'The purified feed decomposes on heated silicon rods, rebuilding a solid that is now nine-nines pure.', 'Hydrogen, HCl and silicon tetrachloride streams are recovered and sent back; the plant is a closed chlorine loop.', 'The crude feed that leaves the hydrochlorination reactor still carries every impurity from the MG-Si.', 'The reactor off-gas carries unreacted TCS and by-products to recovery; nothing is vented.'], decoys: ['Diamond wire saw'] },
    commission: [{ widget: 'purity' }], certify: { modules: [1], n: 2 }
  },
  cz: {
    title: 'Build the crystal puller', brief: [
      { h: 'One crystal, two metres long', p: 'About 300–450 kg of polysilicon and a pinch of dopant melt in a quartz crucible at ~1,420 °C under argon. A seed crystal is dipped, then pulled upward while both seed and crucible rotate. The crystal that grows is a single lattice; every wafer inherits its orientation.', fig: 'm02/anatomy-of-a-300-mm-cz-puller' },
      { h: 'The Dash neck', p: 'The seed\'s thermal shock creates dislocations. Pulling a ~3 mm neck fast makes every inclined dislocation glide out to the free surface before the crystal widens. After the neck comes the shoulder, then a body grown at 0.5–1.5 mm/min for 30–50 hours.' },
      { h: 'The crucible dissolves into the melt', p: 'Quartz is SiO₂, so the melt picks up oxygen from its own container; crucible rotation stirs more in. Some oxygen is useful (it strengthens the wafer and getters metals), too much makes precipitates. The v/G ratio of pull rate to thermal gradient decides whether the crystal is vacancy-rich (voids called COPs) or interstitial-rich (dislocation loops).', fig: 'm02/oxygen-and-carbon' }
    ],
    build: { scene: 'cz-puller', fig: 'm02/anatomy-of-a-300-mm-cz-puller', why: ['The pull shaft lifts the seed slowly upward while rotating it; pull rate is the fast actuator of diameter control.', 'Argon flows down over the crystal and sweeps silicon monoxide and carbon monoxide away from the melt surface.', 'The heater surrounds the crucible; its power is the slow actuator that sets melt temperature.', 'The crystal grows from the meniscus at the melt surface; a camera watches that bright ring to measure diameter.', 'The melt is what is left of the charge; as it is consumed the crucible is lifted to keep the surface at the same height.', 'The quartz crucible holds the melt, sits in a graphite susceptor, and is discarded after every run because it devitrifies.'], decoys: ['Electron beam column'] },
    commission: [{ widget: 'cz-puller' }], certify: { modules: [2], n: 2 }
  },
  wafering: {
    title: 'Build the wafering plant', brief: [
      { h: 'From cylinder to disc', p: 'Crown and tail are cropped, the body is ground to exact diameter with a notch along the <110> direction, then a multi-wire saw with diamond-coated wire slices the whole section at once. Each cut turns ~150 µm of crystal into dust (the kerf), so slice pitch decides how many wafers an ingot gives.', fig: 'm03/multi-wire-slicing' },
      { h: 'Every step removes the damage of the one before', p: 'Sawing leaves subsurface cracks; lapping or double-disk grinding removes them and leaves finer damage; etching removes that; double-side polishing brings global flatness; a final CMP brings the front surface below 0.1 nm roughness; RCA cleaning removes particles, oxide and metals. Then inspection: flatness per exposure site, particles by laser scattering, metals by TXRF.', fig: 'm03/lapping-and-double-disk-grinding' },
      { h: 'The spec the fab assumes', p: '775 µm thick, ~127 g, flat to ~20 nm over each exposure site. A prime wafer costs on the order of $100–200; the fab will add $16–30k of value to it. Suppliers: Shin-Etsu, SUMCO, GlobalWafers, Siltronic, SK Siltron.' }
    ],
    build: { fig: 'm03/multi-wire-slicing', mode: 'order' },
    commission: [{ widget: 'wafer-slicing' }], certify: { modules: [3], n: 2 }
  },
  design: {
    title: 'Design the chip and tape out', brief: [
      { h: 'The chip is text before it is silicon', p: 'Architecture becomes RTL (register-transfer level code), RTL is synthesized to standard cells from the foundry\'s PDK, cells are placed and routed, and then the design is checked: timing, IR drop, electromigration, DRC, LVS, antenna rules. Verification dominates because a bug found after tape-out costs a new mask set.', fig: 'm19/verification-why-nvidia-runs-more-emulators-than-anyone' },
      { h: 'The reticle limit', p: 'A scanner exposes a field of 26 × 33 mm = 858 mm². No single die can be larger. H100 is 814 mm²; Blackwell uses two ~800 mm² dies joined on the package. High-NA EUV halves the field to 26 × 16.5 mm, which is why chiplets matter more each node.' },
      { h: 'Masks', p: 'A leading-node mask set is 70–100+ photomasks at ~$20–30M. EUV blanks are fused silica with 40 Mo/Si bilayers, written by multi-beam electron beam, inspected with 13.5 nm light and protected by a pellicle.' }
    ],
    build: { fig: 'm19/verification-why-nvidia-runs-more-emulators-than-anyone', mode: 'order' },
    commission: [{ widget: 'gpu-bom' }], certify: { modules: [19, 4], n: 2 }
  },
  fab: {
    title: 'Break ground on the fab', brief: [
      { h: 'A vertical sandwich', p: 'A 300 mm fab is three floors: clean air pushed down from a plenum on top, the cleanroom with tools and overhead transport in the middle, and everything dirty (pumps, chemicals, exhaust) in the sub-fab underneath. The building costs $20–30B and runs ~100,000 wafer starts a month.', fig: 'm05/the-building-why-a-fab-is-a-vertical-sandwich' },
      { h: 'One thousand steps, ninety days', p: 'A leading-edge wafer sees 1,000–1,500 steps over ~90 days, of which ~80 are lithography layers, each a litho-etch loop. Little\'s law: 100k starts a month × 3 months ≈ 300,000 wafers on the floor at any moment.', fig: 'm05/the-process-flow-1-000-1-500-steps-revisited-dozens-of-times' },
      { h: 'The fab is eight bays', p: 'Cleanroom and transport; oxidation and deposition; lithography; etch; implant and anneal; the transistor module (FEOL and MOL); interconnect (BEOL); metrology and yield. Each bay is its own commissioning mission. The fab will not run until the six process bays are commissioned.' }
    ],
    build: { fig: 'm05/the-building-why-a-fab-is-a-vertical-sandwich', mode: 'stack' },
    commission: [{ widget: 'fab-flow' }], certify: { modules: [5], n: 2 }
  },
  'bay-clean': {
    title: 'Cleanroom & AMHS bay', bay: true, optional: true, cost: 10000000, brief: [
      { h: 'Clean air', p: 'ISO class 5 allows 3,520 particles of 0.5 µm per m³, about 10,000× cleaner than city air. Filtered air comes down through the ceiling at ~0.3–0.5 m/s and crosses the room in seconds. Wafers spend most of their life inside sealed FOUPs anyway.', fig: 'm05/cleanroom-classes-and-airflow' },
      { h: 'Wafers in motion', p: 'Overhead hoist transport carries 25-wafer FOUPs between bays; the queue at each tool, not the tool time, sets the cycle time. Raise utilization toward 100% and queues explode (the X-factor), which is why fabs run below full load on purpose.' }
    ],
    build: { fig: 'm05/cleanroom-classes-and-airflow', mode: 'order' },
    commission: [{ widget: 'fab-anatomy' }, { widget: 'amhs-sim' }], certify: { modules: [5], n: 1 }
  },
  'bay-oxdep': {
    title: 'Oxidation & deposition bay', bay: true, cost: 12000000, brief: [
      { h: 'Growing a film from the wafer itself', p: 'Heat silicon in oxygen (dry) or steam (wet) and SiO₂ grows into and out of the surface, consuming 0.44 nm of silicon per nm of oxide. Deal–Grove: thin oxide grows linearly (reaction-limited), thick oxide as √t (diffusion-limited), so doubling the thickness takes four times as long.', fig: 'm06/1-thermal-oxidation-growing-sio2-from-the-wafer-itself' },
      { h: 'Depositing films one atom layer at a time', p: 'CVD reacts gases on the wafer; PVD sputters atoms from a target; ALD alternates two self-limiting half-reactions (precursor pulse, purge, water pulse, purge) so each cycle adds about one monolayer, which is how a 1.8 nm hafnium oxide gate dielectric can be made uniform across 300 mm.', fig: 'm06/5-atomic-layer-deposition' }
    ],
    build: { fig: 'm06/5-atomic-layer-deposition', mode: 'order' },
    commission: [{ widget: 'deal-grove' }, { widget: 'ald-cycle' }], certify: { modules: [6], n: 2 }
  },
  'bay-litho': {
    title: 'Lithography bay', bay: true, cost: 30000000, brief: [
      { h: 'Resolution is wavelength over aperture', p: 'Half-pitch = k1·λ/NA. For 193 nm immersion (NA 1.35, k1 ≈ 0.28) that is ~40 nm half-pitch, ~80 nm pitch. Depth of focus falls as 1/NA², which is why the wafer must be flat to tens of nanometres.', fig: 'm07/anatomy-of-a-193-nm-immersion-scanner' },
      { h: 'Stretching DUV: multi-patterning', p: 'Below 80 nm pitch, one layer becomes two exposures (LELE) or a spacer trick: pattern a mandrel, coat it with a conformal film, etch back, pull the mandrel and the spacers remain at half the pitch (SADP); do it twice for a quarter (SAQP). Each trick adds steps, overlay error and cost.' },
      { h: 'EUV: 13.5 nm light in a vacuum', p: 'A CO₂ laser hits 50,000 tin droplets a second to make plasma that emits 13.5 nm light. Nothing is transparent at that wavelength, so the optics are Mo/Si multilayer mirrors, the mask is reflective, and the whole path is vacuum. One NXE:3800E costs ~$200M and exposes ~220 wafers an hour; a 250–600 W source decides throughput and shot noise.', fig: 'm08/the-laser-produced-plasma-source' },
      { h: 'The resist and the track', p: 'A chemically amplified resist turns each photon into an acid that, during the post-exposure bake, deprotects hundreds of polymer sites. The bake sets the acid diffusion blur; the track (coat, bake, develop) wraps around the scanner and must keep pace with it.' }
    ],
    build: { fig: 'm08/the-laser-produced-plasma-source', mode: 'order' },
    commission: [{ widget: 'rayleigh' }, { widget: 'sadp' }, { widget: 'euv-source' }, { widget: 'resist-chemistry' }], certify: { modules: [7, 8], n: 2 }
  },
  'bay-etch': {
    title: 'Etch bay', bay: true, cost: 15000000, brief: [
      { h: 'Carving with a plasma', p: 'A plasma splits gas into ions and radicals. Radicals etch chemically in every direction; ions arrive vertically and etch by impact. Balance them, add a sidewall passivation film, and the trench walls stay vertical (anisotropy) while the mask survives (selectivity).', fig: 'm09/plasma-physics-for-engineers' },
      { h: 'Pressure decides whether ions fly straight', p: 'Ions cross the sheath above the wafer; at high pressure they collide with neutrals on the way and arrive at an angle, rounding the profile. Low pressure and high bias give straight, energetic ions; that is the recipe for deep, narrow holes such as 3D NAND channels with 100:1 aspect ratios.' }
    ],
    build: { fig: 'm09/plasma-physics-for-engineers', mode: 'order' },
    commission: [{ widget: 'plasma-reactor' }, { widget: 'etch-profile' }], certify: { modules: [9], n: 2 }
  },
  'bay-implant': {
    title: 'Implant & anneal bay', bay: true, cost: 15000000, brief: [
      { h: 'Shooting dopants into the crystal', p: 'Ions are extracted from a plasma source, sorted by mass in an analyser magnet (so a boron beam contains only boron), accelerated to the chosen energy and scanned across the wafer. Energy sets the depth (projected range), dose sets how many.', fig: 'm10/3-inside-an-ion-implanter' },
      { h: 'Then repair the damage', p: 'Every implanted ion knocks silicon atoms out of place. An anneal (furnace, rapid thermal, spike, laser) repairs the lattice and moves dopants onto lattice sites where they are electrically active, but heat also lets them diffuse, so shallow junctions need the shortest, hottest anneals.' }
    ],
    build: { fig: 'm10/3-inside-an-ion-implanter', mode: 'order' },
    commission: [{ widget: 'implanter-beamline' }, { widget: 'implant-profile' }], certify: { modules: [10], n: 2 }
  },
  'bay-feol': {
    title: 'Transistor bay (FEOL & MOL)', bay: true, cost: 30000000, brief: [
      { h: 'A switch controlled by a field', p: 'A MOSFET conducts when the gate voltage inverts the channel. Current rises ten-fold for every ~60–70 mV of gate swing below threshold (the subthreshold swing), so a logic transistor needs about six decades of Ion/Ioff and the gate must control the channel completely.' },
      { h: 'Planar → FinFET → nanosheet → CFET', p: 'As gates shrank, the drain started to control the channel too (short-channel effects). The fix was geometry: wrap the gate around a fin (three sides), then around stacked sheets (four sides), and eventually stack n and p devices vertically. The real gate is built last, after the 1,000 °C anneals, in place of a dummy.' },
      { h: 'Contacts', p: 'Middle-of-line contacts are the narrowest conductors on the chip; a titanium silicide and a tungsten, cobalt or ruthenium plug connect each source, drain and gate to the first wiring level.' }
    ],
    build: { fig: 'm00/what-a-chip-is-physically', mode: 'stack' },
    commission: [{ widget: 'mosfet-iv' }, { widget: 'transistor-evolution' }], certify: { modules: [11], n: 2 }
  },
  'bay-beol': {
    title: 'Interconnect bay (BEOL)', bay: true, cost: 20000000, brief: [
      { h: 'Copper cannot be etched', p: 'So the wiring is inlaid: etch a trench and a via into the dielectric, line them with a TaN barrier and a cobalt or ruthenium liner, seed and electroplate copper with superfill additives, then polish the excess away (CMP). Fifteen to eighteen levels, narrowest at the bottom, thick power grid on top.', fig: 'm12/anatomy-of-the-metal-stack' },
      { h: 'The wire is now the slow part', p: 'In a 20 nm line the barrier and liner take a third of the width and electrons scatter off every wall, so resistivity is several times bulk copper; RC delay of the tightest wires, not the transistor, limits most paths. Hence low-k dielectrics, air gaps, and backside power delivery.' }
    ],
    build: { scene: 'interconnect-section', fig: 'm12/anatomy-of-the-metal-stack', why: ['The widest, thickest metal at the top carries power and the longest signals over millimetres with low resistance.', 'Vias are the vertical links between metal levels; a void in a via is the classic BEOL failure.', 'Fine local wiring at ~23–30 nm pitch connects neighbouring cells and needs EUV, often with two exposures.', 'Contacts terminate on the source, drain and gate of each transistor.'], decoys: ['Solder ball'] },
    commission: [{ widget: 'damascene' }, { widget: 'cmp-planarize' }], certify: { modules: [12], n: 2 }
  },
  'bay-metro': {
    title: 'Metrology & yield bay', bay: true, optional: true, cost: 12000000, brief: [
      { h: 'Measure without touching', p: 'Ellipsometry reads film thickness from polarized light; scatterometry reads line width and profile from diffraction; CD-SEM images the pattern; overlay tools read alignment targets. Inspection finds defects, and every excursion is traced back through the tool data.', fig: 'm13/1-film-metrology-measuring-thickness-without-touching' },
      { h: 'Yield is area times defect density', p: 'Poisson: Y = e^(−A·D0). An 800 mm² die at D0 = 0.1/cm² yields ~45%; a 100 mm² die ~90%. D0 starts several times higher on a new node and falls only as wafers are run and each defect mechanism is removed, one at a time.', fig: 'm13/8-spc-apc-fdc-and-the-excursion' }
    ],
    build: { fig: 'm13/8-spc-apc-fdc-and-the-excursion', mode: 'order' },
    commission: [{ widget: 'yield-calculator' }], certify: { modules: [13], n: 1 }
  },
  sort: {
    title: 'Build wafer sort', brief: [
      { h: 'The last cheap place to find a bad die', p: 'A probe card with thousands of needles touches every die; automatic test equipment runs patterns at hot and cold; e-fuses record trims and disable bad blocks so that a die with a few broken streaming multiprocessors becomes a lower SKU instead of scrap. The rule of ten: a defect that escapes costs 10× more at every later stage.', fig: 'm14/wafer-sort-the-prober' },
      { h: 'Test time is money', p: 'A sort cell costs cents per second; test time per touchdown, sites per touchdown and yield set the cost per good die. Fault coverage sets the defect level that escapes to the customer.', fig: 'm14/the-ate' }
    ],
    build: { fig: 'm14/wafer-sort-the-prober', mode: 'order' },
    commission: [{ widget: 'wafer-sort-sim' }, { widget: 'test-cost' }], certify: { modules: [13, 14], n: 2 }
  },
  hbm: {
    title: 'Build the HBM line', brief: [
      { h: 'A DRAM bit is a capacitor', p: 'One transistor, one capacitor: write a charge, read it by sharing it with the bit line, and refresh it before it leaks away. The capacitor is a tall cylinder with a dielectric under a nanometre of equivalent oxide; DRAM nodes are named 1α, 1β, 1γ.', fig: 'm15/4-the-storage-capacitor' },
      { h: 'Stack it', p: 'HBM stacks 8, 12 or 16 DRAM dies on a base logic die, connected by through-silicon vias (~5 µm wide, ~50 µm deep) and microbumps at ~40 µm pitch. Dies are thinned to ~30 µm so the stack fits the 720 µm JEDEC height; 16-high needs ~20 µm dies or hybrid bonding without bumps.', fig: 'm15/15-anatomy-of-an-hbm-stack' },
      { h: 'Compound yield', p: 'Every one of the 13 or 17 dies must be good: stack yield = (1 − escape)^(n+1) × bond^n. That is why every die is probed for known-good-die status before stacking, and why an HBM bit costs ~3× the wafer area of a DDR5 bit.' }
    ],
    build: { scene: 'hbm-section', fig: 'm15/15-anatomy-of-an-hbm-stack', why: ['Each DRAM die is a full memory chip thinned to ~30 µm; twelve of them give 36 GB.', 'Bonded interfaces between dies: microbumps with solder (TC-NCF or MR-MUF) or copper-to-copper hybrid bonds.', 'Through-silicon vias carry signals and power vertically through every die to the base.', 'The base die is a logic chip made at a foundry; it is the stack\'s interface to the GPU across the interposer.'], decoys: ['Heat spreader lid'] },
    commission: [{ widget: 'dram-cell' }, { widget: 'hbm-stack' }], certify: { modules: [15], n: 2 }
  },
  cowos: {
    title: 'Build the CoWoS line', brief: [
      { h: 'Chip on wafer, then wafer on substrate', p: 'Bumped GPU dies and tested HBM stacks are placed on an interposer wafer (chip-on-wafer), underfilled, molded and ground; the interposer is thinned to reveal its TSVs and gets C4 bumps; the unit is then mounted on an organic build-up substrate (wafer-on-substrate), lidded and balled.', fig: 'm17/anatomy-of-a-cowos-package-top-to-bottom' },
      { h: 'Why an interposer', p: 'Thousands of wires must run between the GPU and each HBM stack at a pitch no organic substrate can hold. A silicon interposer (CoWoS-S) or silicon bridge dies in a molded body (CoWoS-L) provide them. The interposer is 3.3 reticles across, so its wiring is stitched from several exposures.' },
      { h: 'Warpage', p: 'Silicon, mold and substrate expand at different rates; at reflow the corners of a large package can lift before the solder wets (a non-wet). Underfill, stiffener rings and thermocompression bonding fight it. From 2023 to 2026 this step and HBM were the tightest constraint on AI accelerators.', fig: 'm16/the-substrate-in-depth' }
    ],
    build: { scene: 'package-section', fig: 'm17/anatomy-of-a-cowos-package-top-to-bottom', why: ['The logic die (or two, for Blackwell) sits face-down on microbumps at ~40 µm pitch.', 'HBM stacks sit beside it: repeated memory dies with vertical TSVs on a base die.', 'Fine microbumps and the interposer\'s redistribution wiring connect GPU to HBM with thousands of lines.', 'The organic build-up substrate fans the connections out to BGA balls that meet the circuit board.'], decoys: ['Crucible'] },
    commission: [{ widget: 'cowos-flow' }, { widget: 'hybrid-bond' }, { widget: 'package-xsection' }], certify: { modules: [16, 17], n: 2 }
  },
  test: {
    title: 'Build final test and burn-in', brief: [
      { h: 'The bathtub curve', p: 'Failure rate over time is high at first (infant mortality from latent defects), flat for years, then rises with wear-out. Burn-in at 125 °C and elevated voltage accelerates the infant-mortality mechanisms by the Arrhenius factor, ≈78× versus 55 °C for Ea = 0.7 eV, so 10 hours in the oven equals about a month in the field.', fig: 'm18/the-test-cell-handlers-sockets-and-thermal-control' },
      { h: 'Every stage multiplies', p: 'Line yield × die yield × assembly yield × final test yield: 0.95 × 0.6 × 0.98 × 0.97 ≈ 0.54. Die yield dominates. System-level test runs real workloads to catch what ATE patterns cannot model.' }
    ],
    build: { fig: 'm18/the-test-cell-handlers-sockets-and-thermal-control', mode: 'order' },
    commission: [{ widget: 'yield-cascade' }], certify: { modules: [18], n: 2 }
  },
  systems: {
    title: 'Build the systems line', brief: [
      { h: 'From package to rack', p: 'The package goes onto an SXM module with its voltage regulators, eight modules onto an HGX baseboard (or four GPUs and two Grace CPUs on a GB200 compute tray), 18 trays plus 9 NVSwitch trays into a rack with ~5,000 copper NVLink cables and liquid-cooling manifolds. The rack draws ~120–130 kW and weighs ~1.4 t.' },
      { h: 'Where 1,000 W go', p: 'Heat crosses the die, the thermal interface, the cold plate and the coolant; each layer adds a temperature rise. The junction must stay below ~85 °C, which sets coolant flow, inlet temperature and the size of the CDU that couples the rack to the building water.' },
      { h: 'One network', p: 'Each GPU has 18 NVLink ports; every GPU connects to every switch chip, so any two of the 72 GPUs are one hop apart and the domain behaves like one memory.' }
    ],
    build: { scene: 'generic-package-section', fig: 'm17/anatomy-of-a-cowos-package-top-to-bottom', why: ['The die is the silicon you spent the whole chain making.', 'Die-side joints (microbumps or C4 bumps) carry every signal off the die.', 'The substrate routes signals and power out to a coarser pitch.', 'External terminals (BGA balls) meet the SXM module\'s circuit board.'], decoys: ['Argon inlet'] },
    commission: [{ widget: 'heat-path' }, { widget: 'nvlink-topology' }, { widget: 'rack-explorer' }], certify: { modules: [19, 20], n: 2 }
  },
  'node-n3': {
    title: 'Migrate the fab to N3', node: true, cost: 2000000000, brief: [
      { h: 'What a node name means', p: '"3 nm" is a label, not a measurement. The real numbers are contacted poly pitch (~45–50 nm), metal pitch (~23–30 nm), cell height in tracks and the resulting transistor density (~200–215 MTr/mm² at N3E, of which real chips use 50–70%). Density gain per node has fallen to ~1.15–1.3×.', fig: 'm11/8-node-timeline-sram-and-design-co-optimization' },
      { h: 'A new node resets the learning curve', p: 'D0 starts several times higher than on the mature node and comes down only with wafers run. The wafer sells for more (~$18–20k at N3, ~$30k at N2) and takes more EUV layers (20+ at N3, 25+ at N2), so opex rises too. Whether the migration pays depends on your yield learning rate.' }
    ],
    build: { fig: 'm11/8-node-timeline-sram-and-design-co-optimization', mode: 'order' },
    commission: [{ widget: 'node-table' }, { widget: 'moores-law' }], certify: { modules: [11, 20], n: 2 },
    effect: { node: 'N3', waferPrice: 19000, opex: 10000, density: 1.35 }
  },
  'node-n2': {
    title: 'Migrate the fab to N2', node: true, cost: 5000000000, brief: [
      { h: 'Nanosheets and backside power', p: 'N2 replaces fins with stacked nanosheets so the gate wraps the channel on all four sides; A16 adds backside power delivery so the crowded front-side metal carries only signals. Wafer price ~$30k; a good 800 mm² die costs ~$1,000 at 45% yield.', fig: 'm11/8-node-timeline-sram-and-design-co-optimization' },
      { h: 'High-NA on the horizon', p: 'The EXE:5000/5200 raises NA to 0.55 with anamorphic optics and half the field size, ~16 nm pitch in a single exposure, at ~$380M a tool. Depth of focus shrinks with NA², so wafers must be flatter still.' }
    ],
    build: { fig: 'm08/the-wafer-side', mode: 'order' },
    commission: [{ widget: 'euv-stochastics' }, { widget: 'wafer-price' }], certify: { modules: [8, 11, 20], n: 2 },
    effect: { node: 'N2', waferPrice: 30000, opex: 14000, density: 1.7 }
  }
};

// Optional exploration: widgets and figures a built station can open at any time.
SG.EXPLORE = {
  mine: { widgets: ['chain-map', 'scale-ladder'], modules: [1] },
  furnace: { widgets: ['purity'], modules: [1] },
  siemens: { widgets: ['purity'], modules: [1] },
  cz: { widgets: ['cz-puller'], modules: [2] },
  wafering: { widgets: ['wafer-slicing'], modules: [3] },
  design: { widgets: ['gpu-bom', 'upw-mask-cost', 'moores-law', 'node-table'], modules: [19, 4] },
  fab: { widgets: ['fab-flow', 'fab-anatomy', 'amhs-sim', 'deal-grove', 'ald-cycle', 'rayleigh', 'sadp', 'euv-source', 'euv-stochastics', 'bragg-mirror', 'resist-chemistry', 'litho-track', 'plasma-reactor', 'etch-profile', 'implanter-beamline', 'implant-profile', 'mosfet-iv', 'transistor-evolution', 'damascene', 'cmp-planarize', 'yield-calculator', 'wafer-price'], modules: [5, 6, 7, 8, 9, 10, 11, 12, 13] },
  sort: { widgets: ['wafer-sort-sim', 'test-cost', 'yield-calculator'], modules: [13, 14] },
  hbm: { widgets: ['dram-cell', 'hbm-stack', 'nand-3d-build'], modules: [15] },
  cowos: { widgets: ['cowos-flow', 'hybrid-bond', 'package-xsection'], modules: [16, 17] },
  test: { widgets: ['yield-cascade', 'test-cost'], modules: [18] },
  systems: { widgets: ['heat-path', 'nvlink-topology', 'rack-explorer', 'geo-share', 'export-timeline'], modules: [19, 20] }
};

// Which widget explains each event.
SG.EVENT_WIDGETS = { neon: 'litho-track', quake: 'fab-anatomy', collector: 'euv-source', abf: 'package-xsection', aiboom: 'wafer-price', hbmspike: 'hbm-stack', export: 'export-timeline', resist: 'resist-chemistry' };
