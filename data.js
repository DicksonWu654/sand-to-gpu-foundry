// Game content: resources, stations, field guides, events, puzzles, milestones.
// Numbers in guides come from the course modules; capex and rates are scaled for play
// (1 game second = 1 day; a "level" is one block of capacity).
window.SG = window.SG || {};

SG.RES = {
  quartz:  { name: 'Quartz',             unit: 't',      price: 100,     color: '#d9c58b' },
  mgsi:    { name: 'MG-Si (98–99%)',     unit: 't',      price: 2500,    color: '#9aa4b2' },
  poly:    { name: 'Polysilicon (9N+)',  unit: 'kg',     price: 40,      color: '#c7d3e3' },
  ingot:   { name: '300 mm ingot',       unit: 'ingot',  price: 180000,  color: '#8fb5d9' },
  wafer:   { name: 'Polished wafer',     unit: 'wafer',  price: 150,     color: '#7ec8e3' },
  fwafer:  { name: 'Finished wafer',     unit: 'wafer',  price: 16000,   color: '#5fa8d3' },
  die:     { name: 'Known-good die',     unit: 'die',    price: 1200,    color: '#62d4a0' },
  hbm:     { name: 'HBM stack',          unit: 'stack',  price: 648,     color: '#f2b880' },
  pkg:     { name: 'GPU package (untested)', unit: 'pkg', price: 20000,  color: '#e59a6b' },
  gpu:     { name: 'Tested GPU',         unit: 'gpu',    price: 25000,   color: '#e8875f' },
  rack:    { name: 'NVL72 rack',         unit: 'rack',   price: 3500000, color: '#f06c5f' }
};

// Each station: inputs/outputs per cycle, cycles per day per level, capex, opex per cycle.
SG.STATIONS = [
  {
    id: 'mine', name: 'Quartz Mine', stage: 'B', modules: [1], icon: '⛏',
    cost: 0, rate: 100, inputs: {}, outputs: { quartz: 1 }, opex: 0,
    short: 'Quartz rock, crushed and washed. Silicon is 28% of the crust; purity is the whole problem.',
    guide: {
      in: 'Quartz rock (SiO₂) from a quarry.', out: 'Beneficiated quartz lumps, plus crucible-grade high-purity quartz (HPQ) from a handful of deposits such as Spruce Pine, North Carolina.',
      constraint: 'Silicon is the second most abundant element in the crust, so the raw material is nearly free. Everything downstream is about removing the other elements, one part per billion at a time.',
      numbers: ['Si–O bond: ~450 kJ/mol, stronger than a C–C bond; quartz survives weathering for that reason', 'Crucible-grade HPQ: a few suppliers (Sibelco, The Quartz Corp) dominate', 'Ordinary quartz for MG-Si: abundant, ~$100/t in this game'],
      why: 'Every wafer starts here, but the crucible that holds the melt in the crystal puller also starts here, and HPQ for crucibles is one of the least-known chokepoints in the chain.'
    }
  },
  {
    id: 'furnace', name: 'Arc Furnace', stage: 'B', modules: [1], icon: '🔥',
    cost: 100000, rate: 30, inputs: { quartz: 3 }, outputs: { mgsi: 1 }, opex: 300,
    short: 'Carbothermic reduction at ~2,000 °C: SiO₂ + 2C → Si + 2CO. Output is 98–99% silicon.',
    guide: {
      in: 'Quartz plus carbon (coal, charcoal, wood chips).', out: 'Metallurgical-grade silicon (MG-Si), ~98–99% pure, tapped as a liquid and cast into lumps.',
      constraint: 'Carbon strips oxygen from SiO₂ at ~2,000 °C in a submerged-arc furnace. The reaction itself needs ~6.8 MWh per tonne of silicon; real furnaces consume 11–13 MWh/t, so this is an electricity business (Norway, Brazil, China).',
      numbers: ['SiO₂ + 2C → Si + 2CO', '~2 t of CO gas leaves per tonne of Si', '11–13 MWh per tonne; MG-Si sells for ~$2–3/kg', '98–99% purity: 7 orders of magnitude short of chip grade'],
      why: 'MG-Si is the feedstock for both solar and electronic polysilicon; most of it actually goes into aluminium alloys and silicones. Chips are a small, demanding customer.'
    }
  },
  {
    id: 'siemens', name: 'Siemens Plant', stage: 'B', modules: [1], icon: '⚗',
    cost: 1000000, rate: 20, inputs: { mgsi: 1 }, outputs: { poly: 700 }, opex: 8000,
    short: 'MG-Si → trichlorosilane (liquid) → distilled → CVD onto hot rods for 3–5 days → 9N–11N polysilicon.',
    guide: {
      in: 'MG-Si lumps, HCl, hydrogen.', out: 'Electronic-grade polysilicon chunks, 9N–11N (fewer than one foreign atom per billion).',
      constraint: 'Silicon cannot be purified directly, so it is converted to a liquid, trichlorosilane (SiHCl₃, TCS), that can be distilled, then converted back. Boron is the hard case: its chloride boils only ~19 °C from TCS and crystal growth cannot reject it (segregation coefficient ~0.8), so it is chased chemically. Metals like iron segregate to the melt (k ~10⁻⁵) and their chlorides stay in the column bottoms.',
      numbers: ['Fluidized-bed hydrochlorination: Si + 3HCl → SiHCl₃ + H₂', 'Multi-stage distillation to parts-per-trillion metals', 'Siemens CVD at ~1,100 °C for ~3–5 days; 40–60 kWh/kg in modern reactors, 100–150 in old ones', '9N = 1 ppb = ~5 × 10¹³ impurity atoms/cm³, ~25× below the boron a wafer maker adds on purpose'],
      why: 'Purity is what the fab buys. A 6N feedstock whose impurities were all boron would already have a resistivity of ~0.5 Ω·cm before any dopant is added, which is why 6N is a solar number and not an electronics number. Most polysilicon goes to solar; the game lets surplus sell on that market.'
    }
  },
  {
    id: 'cz', name: 'Crystal Puller', stage: 'C', modules: [2], icon: '🧊',
    cost: 5000000, rate: 6, inputs: { poly: 300 }, outputs: { ingot: 1 }, opex: 15000, lab: 'cz',
    short: 'Melt 300 kg of poly in a quartz crucible, dip a seed, Dash-neck, then pull a 300 mm, ~2 m single crystal over 30–40 h.',
    guide: {
      in: 'Polysilicon chunks and a pinch of dopant (boron for p-type).', out: 'A single crystal ~305–310 mm across and ~2 m long, one perfect lattice with no dislocations.',
      constraint: 'The melt is dissolving its own quartz crucible (which is where CZ silicon\'s oxygen comes from), and the whole ingot must grow as one dislocation-free crystal. Pull rate v and the axial temperature gradient G are balanced inside a narrow window: above a critical v/G (~0.13–0.20 mm²/(K·min)) the crystal is vacancy-rich and forms COPs (voids); below it, interstitial-rich and forms dislocation loops.',
      numbers: ['Charge: ~300–450 kg; melt at ~1,420 °C under argon', 'Dash neck: ~3–4 mm diameter, pulled fast so inherited dislocations glide out to the surface', 'Body: 0.5–1.5 mm/min with counter-rotation and a magnetic field (MCZ); ~30–50 h', 'Automatic diameter control: a camera watches the bright meniscus ring; pull rate corrects fast, heater power corrects slowly'],
      why: 'Hotter melt or faster pull both make the crystal thinner. A COP (void) under a gate oxide fails at burn-in, not at wafer sort, so wafer makers screen for them before the wafer ever ships. Play the Crystal Puller lab to feel the control loop.'
    }
  },
  {
    id: 'wafering', name: 'Wafering Plant', stage: 'D', modules: [3], icon: '💿',
    cost: 8000000, rate: 6, inputs: { ingot: 1 }, outputs: { wafer: 'WPI' }, opex: 40000,
    short: 'Crop, grind, notch, diamond-wire saw, lap, etch, double-side polish, CMP, RCA clean, inspect.',
    guide: {
      in: 'A rough single-crystal cylinder.', out: 'Polished 300 mm discs, 775 µm thick, flat to ~20 nm over each exposure site, with fewer than 10¹⁰ metal atoms per cm² on the surface, one foreign atom per ~70,000 surface atoms.',
      constraint: 'Every mechanical step leaves damage that the next step must remove, and every downstream lithography step assumes the resulting flatness. Sawing turns ~150 µm of crystal per cut into dust (kerf), so a 2 m body gives roughly 1,900 slices before cropping losses, ~1,500 in this game.',
      numbers: ['Slice ~900 µm + ~150 µm kerf; finished 775 µm', 'Final CMP to < 0.1 nm RMS roughness', 'RCA clean: SC-1 (particles), HF (oxide), SC-2 (metals)', 'Inspection: flatness (SFQR), particles by laser scattering, metals by TXRF down to ~10⁹ atoms/cm²', 'Suppliers: Shin-Etsu, SUMCO, GlobalWafers, Siltronic, SK Siltron (Japan ~55–60% of supply)'],
      why: 'A prime 300 mm wafer costs on the order of $100–200; the fab will add ~$16–30k of value to it. The wafer is cheap; its flatness is not.'
    }
  },
  {
    id: 'design', name: 'Design & Mask Shop', stage: 'A', modules: [19, 4], icon: '📐',
    cost: 25000000, rate: 0, inputs: {}, outputs: {}, opex: 0, lab: 'reticle', oneShot: true,
    short: 'RTL → synthesis → place & route → signoff → tape-out → 70–100+ photomasks. A mask set costs ~$20–30M; a respin costs another.',
    guide: {
      in: 'A product specification.', out: 'A set of 70–100+ photomasks (one per patterned layer) and a test program.',
      constraint: 'Nothing downstream can be changed cheaply. A mask set costs ~$20–30M and a bug found after tape-out means a new one, so almost all design effort is verification: timing, IR drop, electromigration, DRC, LVS, antenna checks.',
      numbers: ['Reticle field: 26 × 33 mm = 858 mm² at 0.33 NA; High-NA halves it to 26 × 16.5 mm', 'Blackwell: 2 × ~800 mm² dies, 208 B transistors, 8 × HBM3E, CoWoS-L', 'H100: TSMC 4N, 80 B transistors, 814 mm², 5 HBM3 on CoWoS-S', 'EUV mask blank: low-thermal-expansion glass (ULE) + 40 Mo/Si bilayers (Hoya, AGC); written by multi-beam e-beam'],
      why: 'Die size is the single most consequential design decision for cost: dies per wafer fall with area and yield falls exponentially with area. The Design Studio lets you feel that trade-off, and changing the design later costs a new mask set.'
    }
  },
  {
    id: 'fab', name: 'Wafer Fab', stage: 'E–G', modules: [5, 6, 7, 8, 9, 10, 11, 12], icon: '🏭',
    cost: 120000000, rate: 1000, inputs: { wafer: 1 }, outputs: { fwafer: 1 }, opex: 8000, lab: 'litho', lab2: 'oxide', needsDesign: true,
    short: '~1,000–1,500 steps, ~80 litho layers, ~90 days: transistors (FEOL), contacts (MOL), then 15–18 levels of copper wiring (BEOL).',
    guide: {
      in: 'A blank polished wafer and a mask set.', out: 'A wafer carrying billions of finished transistors under 15–18 levels of copper wiring, electrically complete.',
      constraint: 'Dimensional in the front end: a gate ~12–16 nm long with a dielectric under 2 nm, held to sub-nanometre control across a 300 mm wafer, while the wafer sees ~1,000 °C anneals (so the real metal gate is built last, in place of a dummy). Thermal in the back end: nothing above ~400 °C once copper and low-k are down. Every patterned layer is one litho-etch loop: clean → ARC → hard mask → resist → expose → PEB → develop → CD/overlay check → etch → strip → inspect, repeated ~70–100 times.',
      numbers: ['1,000–1,500 process steps; ~90-day cycle time; Little\'s law: 100k wafers/month × 3 months ≈ 300,000 wafers in process', 'Rayleigh: half-pitch = k1·λ/NA; ArFi ~76–80 nm pitch, 0.33 NA EUV ~26 nm, High-NA ~16 nm', 'EUV layers: N7+ ~4, N5 ~14, N3 20+, N2 25+; NXE:3800E ~$200M, ~220 wafers/h', 'Wafer price ~$10k (N7), ~$16–17k (N5), ~$18–20k (N3), ~$30k (N2)', 'A fab costs $20–30B; depreciation alone is ~$5,000 per wafer at full load, ~$10,000 at half load'],
      why: 'The fab is where most of the value and almost all of the physics live. The Litho Planner and Oxide Lab let you set two of the recipes yourself; the Process Flow puzzles test whether you know the order of the loop.'
    }
  },
  {
    id: 'sort', name: 'Wafer Sort', stage: 'H', modules: [13, 14], icon: '🔬',
    cost: 40000000, rate: 1000, inputs: { fwafer: 1 }, outputs: { die: 'DPW' }, opex: 300,
    short: 'Probe every die hot and cold on ATE; program e-fuses to disable bad blocks; build the wafer map of known-good dies.',
    guide: {
      in: 'A finished wafer.', out: 'A wafer map: which dies work, at what speed, which spare blocks to disable. Known-good dies (KGD) go on to packaging.',
      constraint: 'This is the last cheap place to find a bad die. A die that escapes here costs ~10× more to find at each later stage (the rule of ten). Yield itself is set by die area and killer-defect density D0: Poisson Y = e^(−A·D0), Murphy, or the negative binomial Y = (1 + A·D0/α)^(−α) with a clustering parameter α of about 1–3.',
      numbers: ['800 mm² die at D0 = 0.1/cm²: Poisson ≈ 45%, Murphy ≈ 47%', 'D0: ~0.5/cm² at ramp, ~0.05–0.1 mature; it falls only as wafers are run and each defect mechanism is traced and removed', 'Probe cards (FormFactor), ATE (Advantest V93000, Teradyne)', 'Repair: a die with a few bad streaming multiprocessors becomes a lower SKU instead of scrap'],
      why: 'Your D0 improves with every wafer the fab runs (watch the header). That learning curve is why the foundry with the most wafers pulls further ahead each generation.'
    }
  },
  {
    id: 'hbm', name: 'HBM Plant', stage: 'K', modules: [15], icon: '🧱',
    cost: 150000000, rate: 300, inputs: { wafer: 1 }, outputs: { hbm: 'HBMPW' }, opex: 300, lab: 'hbm', parallel: true,
    short: 'DRAM wafers → TSVs (Bosch etch, Cu fill) → thin to ~30 µm → probe for known-good dies → stack 8/12/16-high on a base die → test.',
    guide: {
      in: 'DRAM wafers on a 1β/1γ process, and a base logic die (made at TSMC for SK hynix and Micron HBM4).', out: 'A tested 8-, 12- or 16-high memory stack, 720 µm (HBM3E) or 775 µm (HBM4) tall, with ~1–2 TB/s through its bottom.',
      constraint: 'Compound yield. Every one of the 13 or 17 dies in a stack must be good, so the stack is only as good as the known-good-die test on each die: if each passed die is 98% likely to be truly good, a 12-high stack starts at 0.98¹³ ≈ 77% before any bonding loss; at 99% it is ≈ 88%.',
      numbers: ['TSV: ~5–6 µm diameter, ~50 µm deep, via-middle', 'Die thickness ~30 µm; HBM3E cap 720 µm, HBM4 cap 775 µm so 16-high still fits with microbumps', 'Microbump pitch ~40 µm; hybrid bonding expected at HBM4E/HBM5 for 20-high stacks', 'HBM takes ~2–3 wafers per DDR5 wafer-equivalent (larger dies, stack yield, a base die), which is why diverting wafers to HBM caused the 2025–26 DRAM shortage', 'HBM ~$15–20 per GB; shares (Q2 2026): SK hynix ~50%'],
      why: 'A GPU package needs 8 stacks, and stack yield decides whether your HBM plant feeds packaging or starves it. The HBM Stacker lab sets your stack height and test rigor.'
    }
  },
  {
    id: 'cowos', name: 'CoWoS Packaging', stage: 'I–N', modules: [16, 17], icon: '📦',
    cost: 250000000, rate: 1000, inputs: { die: 'NDIE', hbm: 'NHBM' }, outputs: { pkg: 1 }, opex: 3000,
    short: 'Bump, thin and dice the GPU dies; place dies and HBM on a 3.3-reticle interposer (chip-on-wafer); mount on an ABF substrate (wafer-on-substrate); lid, balls.',
    guide: {
      in: 'Bumped GPU dies, tested HBM stacks, an interposer wafer, a build-up substrate.', out: 'A finished GPU package: two dies and eight HBM stacks on one interposer on a ~90 × 90 mm substrate.',
      constraint: 'Size and warpage. The interposer is ~3.3 reticles across, larger than any single exposure, so its wiring is stitched; at reflow temperature the interposer, dies and mold expand at different rates (CTE mismatch) and corner microbumps can lift before the solder wets, a "non-wet" that passes at room temperature and fails hot.',
      numbers: ['Microbump pitch ~40 µm over ~800 mm² per die; C4 bumps to the substrate are larger', 'CoWoS-S: silicon interposer with TSVs and 4–5 Cu RDL levels; CoWoS-L: silicon bridge dies embedded in a molded organic interposer', 'Hybrid bonding (SoIC): ~6–9 µm pitch today, ~1 µm roadmap, no solder', 'CoWoS capacity: ~35k wafers/month end-2024 → ~120–140k target end-2026, still ~10–20% short of demand', 'ABF (Ajinomoto): well over 90% of build-up film supply from one company'],
      why: 'From 2023 through 2026 the tightest constraint on AI accelerators was neither EUV nor wafers but this step and HBM. Watch this station become your bottleneck.'
    }
  },
  {
    id: 'test', name: 'Final Test', stage: 'N', modules: [18], icon: '🌡',
    cost: 50000000, rate: 1000, inputs: { pkg: 1 }, outputs: { gpu: 0.97 }, opex: 500, lab: 'test',
    short: 'Package test on ATE at several temperatures, burn-in (hours at high temperature and voltage), system-level test on real workloads, binning.',
    guide: {
      in: 'A finished GPU package already worth thousands of dollars.', out: 'A binned, shippable GPU (B200 vs down-binned SKUs) in a tray.',
      constraint: 'Every step handles a part already worth thousands, so these are the most expensive test steps per unit in the flow and the ones with the least tolerance for escapes. Burn-in accelerates infant-mortality mechanisms by the Arrhenius factor: ≈78× at 125 °C versus 55 °C for Ea = 0.7 eV, so 10 h in the oven ≈ 780 h (about a month) of field use.',
      numbers: ['Bathtub curve: infant mortality → flat constant-rate region → wear-out', 'Rule of ten: a $1 escape at wafer sort becomes a $10,000 failure in the field', 'Compound yield example: 0.95 (line) × 0.6 (die) × 0.98 (assembly) × 0.97 (final test) ≈ 0.54', 'SLT runs real workloads to catch what ATE patterns cannot model'],
      why: 'A field failure in a training cluster can interrupt a 72-GPU job. The Test Strategy lab lets you trade test cost against escapes.'
    }
  },
  {
    id: 'systems', name: 'Systems (NVL72)', stage: 'O', modules: [19, 20], icon: '🗄',
    cost: 150000000, rate: 10, inputs: { gpu: 72 }, outputs: { rack: 1 }, opex: 600000,
    short: 'Package onto an SXM module, 8 per HGX baseboard or 4 per GB200 compute tray; 18 trays + 9 NVSwitch trays + ~5,000 NVLink cables + liquid cooling = one rack.',
    guide: {
      in: 'Finished GPU packages, Grace CPUs, NVSwitch chips, HDI PCBs, VRMs, cold plates.', out: 'A GB200 NVL72 rack: 72 GPUs in one NVLink domain, ~120–130 kW, ~1.4 t, liquid cooled, installed and validated in a data center.',
      constraint: 'The constraint shifts from nanometres to kilowatts. A rack draws ~120–130 kW and must be liquid cooled through a CDU; a failed GPU can interrupt a job using the whole 72-GPU domain.',
      numbers: ['H100 BOM ≈ $2,500–3,500 (die ~$350, HBM ~$1,200–1,600, CoWoS ~$500–800, test ~$100–200, module ~$200–300) against a ~$25–30k module price', 'NVL72: 18 compute trays, 9 NVSwitch trays, ~5,000 copper NVLink cables', 'ODMs: Foxconn, Quanta, Wistron build the boards and racks', 'A rack sells for roughly $3–4M'],
      why: 'This is where the margin sits: the wafer, HBM and packaging steps you built are a small fraction of the price the rack sells for. The course\'s money-flow table explains who captures what.'
    }
  }
];

SG.EVENTS = [
  { id: 'neon', title: 'Neon and specialty gas shortage', station: 'fab', mult: 0.7, days: 60, mitigatedBy: 'secondsource',
    text: 'Excimer lasers for DUV lithography burn neon; a supply disruption cuts fab throughput. Fabs that have qualified a second source ride it out. (Module 04: gases, resists and other consumables are cheap but protected by qualification lock-in, so nobody switches supplier unless forced.)' },
  { id: 'quake', title: 'Magnitude 7.4 earthquake near the fab', station: 'fab', mult: 0.0, days: 4, scrapFrac: 0.3, mitigatedBy: 'isolation',
    text: 'Every tool shuts down on a seismic trigger and wafers mid-process are scrapped. After the April 2024 Hualien earthquake TSMC reported most tools back within a day and full production within ~3 days, at a cost well under 1% of a quarter\'s revenue. Base isolation limits the scrap. (Module 00, Chokepoint 2.)' },
  { id: 'collector', title: 'EUV collector mirror contaminated', station: 'fab', mult: 0.8, days: 30,
    text: 'The tin plasma coats the collector that gathers the EUV light; when it degrades, a ~$200M scanner stops exposing. Because a wafer visits EUV 20–25 times, an outage anywhere in the fleet slows the whole fab. (Module 08.)' },
  { id: 'abf', title: 'ABF substrate shortage', station: 'cowos', mult: 0.6, days: 60, mitigatedBy: 'secondsource',
    text: 'Ajinomoto Build-up Film is well over 90% of the world\'s supply of the dielectric in every build-up substrate. When substrate makers (Ibiden, Unimicron) cannot get enough, packaging stalls even though wafers are ready. (Modules 04, 16.)' },
  { id: 'aiboom', title: 'AI capex boom: GPU prices spike', station: null, priceMult: { gpu: 1.5, pkg: 1.5, rack: 1.4 }, days: 90,
    text: 'Demand for accelerators outruns supply and the customer prepays years ahead. The fabless company\'s output is capped by whatever CoWoS and HBM capacity its suppliers allocate. (Module 00, money flow.)' },
  { id: 'hbmspike', title: 'HBM contract prices jump', station: null, priceMult: { hbm: 1.6 }, days: 90,
    text: 'Memory makers divert DRAM wafer capacity to HBM, which takes ~2–3 wafers per DDR5 wafer-equivalent; ordinary DRAM prices rise and HBM stays scarce. Your own HBM output is worth more if you sell it. (Modules 15, 20.)' },
  { id: 'export', title: 'New export-control rule', station: null, priceMult: { rack: 0.8, gpu: 0.85 }, days: 90,
    text: 'A rule restricts which markets can receive the top accelerator SKU, so part of the demand disappears until a compliant product is qualified. (Module 20: the October 2022, 2023 and 2024 rules.)' },
  { id: 'water', title: 'Drought restriction on fab water', station: 'fab', mult: 0.85, days: 30,
    text: 'A 300 mm wafer needs 6–9 m³ of ultrapure water (18.2 MΩ·cm, TOC below 1 ppb) and a fab draws millions of gallons a day. TSMC recycles ~90% in Taiwan and ~65% in Arizona; the reclaim rate is what a city permits a fab on. (Module 04)' },
  { id: 'emvoid', title: 'Copper via-void excursion', station: 'fab', mult: 0.9, days: 20,
    text: 'A copper via that plated with a small cavity passes sort, then current crowds around the void and electromigration grows it until the via opens months into service. Black\'s equation runs the qualification test hot: 110 → 300 °C is ~8,000× acceleration at Ea = 0.9 eV, so weeks stand in for years. The line slows while the plating bath is requalified. (Module 12)' },
  { id: 'resist', title: 'Photoresist batch out of spec', station: 'fab', mult: 0.85, days: 30, mitigatedBy: 'secondsource',
    text: 'Japan supplies ~90% of photoresist. A resist is not a commodity bought by specification; its batch behaviour is tuned into each layer\'s process window over months, so an off-spec batch means rework and a slower line. (Modules 04, 20.)' }
];

SG.MITIGATIONS = [
  { id: 'secondsource', name: 'Qualify second sources', cost: 30000000, text: 'Qualify a second resist, gas and substrate supplier on every affected layer. A multi-year program in reality; here it halves the impact of supply events.' },
  { id: 'isolation', name: 'Seismic base isolation', cost: 40000000, text: 'Put the fab on base isolators and add fast tool restart. Earthquake scrap falls from 30% to 5% of wafers in process.' },
  { id: 'stockpile', name: 'Strategic inventory (90 days)', cost: 50000000, text: 'Hold 90 days of wafers, HBM and substrates. Warehouse caps triple, so upstream surplus is stored instead of dumped on the spot market.' }
];

// Sequencing puzzles: click the steps in the correct order.
SG.PUZZLES = [
  { id: 'litho', title: 'The litho-etch loop', station: 'fab', modules: [7, 9],
    intro: 'Every patterned layer goes through this loop, ~70–100 times per wafer. Put the eleven steps in order.',
    steps: [
      ['Clean', 'A single particle under the next film prints as a defect in every layer above it.'],
      ['Anti-reflective coating', 'Light reflecting off the layer below would interfere with incoming light and print standing-wave ripples into the resist.'],
      ['Hard mask', 'Resist is too thin and soft to survive a deep etch; the pattern is first transferred into a tougher film.'],
      ['Resist coat', 'Spun on the track to a uniform film tens of nanometres thick.'],
      ['Expose (DUV or EUV)', 'The scanner projects the mask pattern as an aerial image into the resist.'],
      ['Post-exposure bake', 'In a chemically amplified resist exposure only creates acid; the bake drives the deprotection chemistry that turns exposure into solubility.'],
      ['Develop', 'Dissolves the exposed (positive) or unexposed (negative) resist to leave the stencil.'],
      ['CD / overlay metrology', 'A bad resist pattern can be stripped and reworked for the cost of a coat and an exposure; a bad etch scraps the wafer.'],
      ['Etch', 'Transfers the stencil into the hard mask and then the layer beneath.'],
      ['Strip and clean', 'Polymer left on the sidewalls would be buried by the next deposition.'],
      ['Post-etch inspection', 'Particles and bridges are easiest to find while the layer is still the top surface.']
    ] },
  { id: 'damascene', title: 'Dual damascene (one copper level)', station: 'fab', modules: [12],
    intro: 'Copper cannot be etched, so the wiring is built by filling trenches. Order the steps of one metal level.',
    steps: [
      ['Low-k dielectric deposition (PECVD SiOCH)', 'The insulator the wires will sit in; low k reduces the capacitance between neighbouring wires.'],
      ['Etch stop and hard mask', 'The etch stop defines the bottom of the via; the TiN hard mask survives the trench etch.'],
      ['Via litho and etch', 'The vertical hole down to the level below.'],
      ['Trench litho and etch', 'The horizontal wire; via and trench are filled together, which is what "dual" means.'],
      ['TaN barrier (PVD/ALD)', 'Stops copper diffusing into the dielectric, where it would poison transistors.'],
      ['Co or Ru liner', 'Makes the copper wet the wall so the fill has no seams.'],
      ['Cu seed (PVD)', 'A thin conductive layer the plating current can start from.'],
      ['Cu electroplating with superfill', 'Additives make the bottom of the feature plate faster than the top, so it fills without voids.'],
      ['Anneal and Cu CMP', 'Grain growth lowers resistance; polishing removes the overburden so only the inlaid wires remain.'],
      ['SiCN cap', 'Seals the copper top against oxidation and diffusion before the next level.']
    ] },
  { id: 'hbmflow', title: 'Building an HBM stack', station: 'hbm', modules: [15],
    intro: 'From DRAM wafer to a known-good stack. Order the steps.',
    steps: [
      ['DRAM wafer FEOL/BEOL', '1T1C arrays with high-aspect-ratio capacitors on a 1β/1γ process.'],
      ['TSV formation (via-middle)', 'Bosch etch ~5–6 µm wide, ~50 µm deep; oxide liner, TaN barrier, Cu fill, CMP. Made after transistors, before wiring.'],
      ['Front-side microbumps', 'The joints to the die above.'],
      ['Bond to carrier, thin to ~30 µm, reveal TSVs', 'A 30 µm wafer cannot support itself; grinding stops exactly where the TSVs end (TTV < 1 µm).'],
      ['Wafer probe for known-good dies', 'One bad die scraps the whole stack, so every die is tested (with a burn-in-like stress) before stacking.'],
      ['Dice DRAM and base dies', 'The base logic die sits at the bottom and is the interface to the GPU.'],
      ['Stack by thermocompression bonding', '8/12/16 dies on the base die; TC-NCF or MR-MUF; hybrid bonding expected at HBM4E/HBM5 for 20-high.'],
      ['Mold, grind to ~720 µm, test, burn-in', 'Known-good-stack test before the stack ships to packaging.']
    ] },
  { id: 'cowosflow', title: 'CoWoS: chip-on-wafer, then wafer-on-substrate', station: 'cowos', modules: [17],
    intro: 'Order the steps that turn dies and HBM into a package.',
    steps: [
      ['Interposer fabrication', 'Silicon interposer with TSVs and 4–5 Cu RDL levels (CoWoS-S), or bridge dies in a molded organic interposer (CoWoS-L).'],
      ['Chip-on-wafer: place GPU dies and HBM', 'Flux, place, TCB or mass reflow at ~40 µm pitch. This is where the HBM branch merges.'],
      ['Capillary underfill and cure', 'The epoxy carries the thermal-expansion mismatch instead of the microbumps alone.'],
      ['Overmold and grind to expose die backs', 'So the cold plate can touch silicon directly.'],
      ['Carrier bond, interposer backgrind, TSV reveal, C4 bumps', 'The larger bumps that connect the interposer to the substrate.'],
      ['CoW-level electrical test, debond, dice', 'Test before the expensive substrate is attached.'],
      ['Wafer-on-substrate: C4 reflow onto ABF substrate', 'Then underfill to absorb the silicon-to-organic CTE mismatch.'],
      ['Stiffener/lid with TIM, BGA balls, mark, X-ray', 'The ring holds the substrate flat; the lid spreads heat; X-ray finds non-wet joints.']
    ] }
];

SG.MILESTONES = [
  { id: 'm_mgsi', res: 'mgsi', title: 'First metallurgical silicon', text: '98–99% pure. Seven orders of magnitude to go before a fab will touch it.' },
  { id: 'm_poly', res: 'poly', title: 'First electronic-grade polysilicon', text: '9N–11N: fewer than one foreign atom per billion. Most of the world\'s polysilicon goes to solar panels, so your surplus has a market.' },
  { id: 'm_ingot', res: 'ingot', title: 'First 300 mm ingot', text: 'One crystal, ~2 m long, ~300 kg, dislocation-free. Its oxygen came from the crucible dissolving into the melt.' },
  { id: 'm_wafer', res: 'wafer', title: 'First polished wafer', text: '775 µm thick, flat to ~20 nm per exposure site, ~127 g. Every tool in the fab is built around this disc.' },
  { id: 'm_fwafer', res: 'fwafer', title: 'First finished wafer', text: '~90 days, ~1,000–1,500 steps, ~80 litho layers, 15–18 copper levels. Watch D0 in the header fall as the fab learns.' },
  { id: 'm_die', res: 'die', title: 'First known-good dies', text: 'Yield = f(area × D0). The rule of ten starts here: each stage later, a missed bad die costs ten times more.' },
  { id: 'm_hbm', res: 'hbm', title: 'First HBM stack', text: '13 or 17 dies that all had to be good. Stack yield is the product of per-die probabilities.' },
  { id: 'm_pkg', res: 'pkg', title: 'First GPU package', text: 'Dies and HBM on an interposer 3.3 reticles across. CoWoS is now your bottleneck, as it was the industry\'s.' },
  { id: 'm_gpu', res: 'gpu', title: 'First tested GPU', text: 'Burn-in at 125 °C aged it ~78× faster than the field would; the infant-mortality failures happened in the oven instead of in a cluster.' },
  { id: 'm_rack', res: 'rack', title: 'First NVL72 rack', text: '72 GPUs, one NVLink domain, ~120–130 kW, ~1.4 t. From quartz to this took every station on the board. Keep going: the chain never stops learning.' }
];

// Stage colours for the belt and cards.
SG.STAGE_COLORS = { mine: '#b9ab8c', furnace: '#e3a15a', siemens: '#c7d3e3', cz: '#8fb5d9', wafering: '#7ec8e3', design: '#b0a0cf', fab: '#5fa8d3', sort: '#62d4a0', hbm: '#f2b880', cowos: '#e59a6b', test: '#e8875f', systems: '#f06c5f' };

// Rush orders: the golden-cookie analogue. Click within the window to collect.
SG.RUSH = [
  { title: 'Hyperscaler prepayment', text: 'A cloud customer prepays for capacity two years out. Fabless companies prepay TSMC and the HBM makers the same way, because output is capped by whatever capacity suppliers allocate. (Module 00)', days: 3 },
  { title: 'Solar-grade poly spot spike', text: 'Polysilicon prices jump on the solar market; most polysilicon goes to solar, and the spot price swings several-fold across the cycle. (Module 01)', days: 2 },
  { title: 'Government subsidy tranche', text: 'A CHIPS Act-style grant lands. The US, EU, Japan and others subsidise fabs because a leading-edge fab costs $20–30B and depreciation alone is ~$5,000 per wafer at full load. (Module 20)', days: 4 },
  { title: 'Memory contract renegotiated', text: 'DRAM contract prices rose 2–3× from late 2025 into 2026 as AI demand outran supply; a renegotiation pays off now. (Module 20)', days: 3 },
  { title: 'Reclaim wafers sold', text: 'Test and monitor wafers are reclaimed, re-polished and sold; a fab burns 10–25% as many test wafers as product wafers, hundreds of thousands a month at a GigaFab. (Module 03)', days: 2 },
  { title: 'Customer hot lot', text: 'An EUV scanner depreciates at ~$4,500 an hour whether or not it exposes, and depreciation is 35–55% of wafer cost in a fab\'s early years. A lot that fills an idle scanner is nearly free money. (Module 05)', days: 3 },
  { title: 'Scrap silicon recovered', text: 'Crown, tail and reject ingots are etched clean and go back to the puller as remelt; kerf sludge, contaminated with nickel, iron and coolant, is lost to the chain. Roughly 15% of every ingot ends as dust. (Module 03)', days: 2 }
];

// Achievements with permanent bonuses. check(S, ctx) returns true once earned.
SG.ACHIEVEMENTS = [
  { id: 'first_million', title: 'First million', text: 'Hold $1M in cash.', check: S => S.cash >= 1e6, reward: { cash: 100000 } },
  { id: 'nine_nines', title: 'Nine nines', text: 'Commission the Siemens plant.', check: S => S.st.siemens.on, reward: { mult: 0.03 } },
  { id: 'one_crystal', title: 'One perfect crystal', text: 'Score 80+ in the Crystal Puller lab.', check: S => S.labs.cz && S.labs.cz.score >= 0.8, reward: { mult: 0.03 } },
  { id: 'clean_assembly', title: 'Zero-defect assembly', text: 'Finish three missions with no build mistakes.', check: S => Object.values(S.missions).filter(m => m.mistakes === 0).length >= 3, reward: { mult: 0.05 } },
  { id: 'target_practice', title: 'Target practice', text: 'Reach ten widget targets.', check: S => Object.values(S.missions).reduce((a, m) => a + (m.targets || 0), 0) >= 10, reward: { mult: 0.05 } },
  { id: 'scholar', title: 'Scholar', text: 'Answer 40 quiz questions correctly.', check: S => Object.keys(S.answered).length >= 40, reward: { mult: 0.05 } },
  { id: 'professor', title: 'Professor', text: 'Answer 120 quiz questions correctly.', check: S => Object.keys(S.answered).length >= 120, reward: { mult: 0.10 } },
  { id: 'six_bays', title: 'Lights on', text: 'Commission all six required fab bays.', check: S => ['bay-oxdep', 'bay-litho', 'bay-etch', 'bay-implant', 'bay-feol', 'bay-beol'].every(b => S.bays[b]), reward: { mult: 0.05 } },
  { id: 'yield_learner', title: 'Yield learner', text: 'Bring D0 below 0.1/cm².', check: (S, c) => c.d0() < 0.1, reward: { mult: 0.05 } },
  { id: 'bottleneck', title: 'Bottleneck buster', text: 'Upgrade CoWoS to level 5.', check: S => S.st.cowos.level >= 5, reward: { mult: 0.05 } },
  { id: 'tiers', title: 'Automation', text: 'Reach level 10 on any station.', check: S => Object.values(S.st).some(x => x.level >= 10), reward: { mult: 0.05 } },
  { id: 'clicker', title: 'Hands on', text: 'Run 100 manual shifts.', check: S => (S.stats.clicks || 0) >= 100, reward: { mult: 0.03 } },
  { id: 'rush', title: 'Rush hour', text: 'Collect five rush orders.', check: S => (S.stats.rush || 0) >= 5, reward: { mult: 0.03 } },
  { id: 'rack', title: 'Sand to GPU', text: 'Ship the first NVL72 rack.', check: S => (S.made.rack || 0) >= 1, reward: { mult: 0.10 } },
  { id: 'n2', title: 'Leading edge', text: 'Migrate the fab to N2.', check: S => S.node === 'N2', reward: { mult: 0.10 } },
  { id: 'billion', title: 'Unicorn', text: 'Hold $1B in cash.', check: S => S.cash >= 1e9, reward: { mult: 0.05 } }
];

// Short resource names for belts and stock bars.
SG.RES_SHORT = { quartz: 'Quartz', mgsi: 'MG-Si', poly: 'Poly', ingot: 'Ingots', wafer: 'Wafers', fwafer: 'Fin. wafers', die: 'Good dies', hbm: 'HBM', pkg: 'Packages', gpu: 'GPUs', rack: 'Racks' };

// Card illustrations: the course's apparatus scenes (cropped) or its glyph icons.
SG.STATION_ART = {
  mine: { scene: 'charge-bed', box: '90 50 520 280' },
  furnace: { scene: 'arc-furnace', box: '130 20 480 340' },
  siemens: { scene: 'siemens', box: '30 20 600 300' },
  cz: { scene: 'cz-puller', box: '150 10 400 360' },
  wafering: { scene: 'lapping-section', box: '60 30 580 270' },
  design: { glyph: 'design' },
  fab: { scene: 'die-section', box: '70 40 560 310' },
  sort: { glyph: 'test' },
  hbm: { scene: 'hbm-section', box: '130 40 440 330' },
  cowos: { scene: 'package-section', box: '60 60 580 280' },
  test: { glyph: 'heat' },
  systems: { glyph: 'rack' }
};

// Links into the course (the reader is a separate repo).
SG.COURSE_URL = 'https://github.com/DicksonWu654/sand-to-gpu';
SG.courseLink = m => { const q = window.SAND_QUIZ && window.SAND_QUIZ[m]; return SG.COURSE_URL + '/blob/main/course/modules/' + (q ? q.file : String(m).padStart(2, '0')) + '.md'; };
