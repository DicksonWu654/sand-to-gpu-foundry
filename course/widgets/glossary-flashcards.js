/* Widget: glossary-flashcards — "Glossary Flashcards" (Module 21) */
(function () {
  'use strict';
  const KEY = 's2g:flash';
  const GLOSSARY_MODULE = 21;
  // Built-in starter deck (50 terms, verbatim from Module 21) used only when the page has no glossary to read.
  const FALLBACK = [
    ["1T1C", [15], "The DRAM cell: one access transistor and one storage capacitor. The capacitor holds ~10–20 fF and must be refreshed every ~64 ms because charge leaks."],
    ["2.5D packaging", [17], "Placing multiple dies side by side on a silicon or organic interposer that carries fine wiring between them; CoWoS is the canonical example. Contrast with 3D (dies stacked vertically)."],
    ["3D NAND", [9,15], "Flash memory built as vertical strings of charge-trap cells through a stack of 200–300+ alternating layers; the channel hole etch through the stack is the defining high-aspect-ratio process."],
    ["ALD (Atomic Layer Deposition)", [6], "Film growth by alternating, self-limiting half-reactions (precursor pulse, purge, reactant pulse, purge), depositing ~0.1 nm per cycle with perfect conformality. Used for high-k gate dielectrics, liners, spacers."],
    ["AMHS (Automated Material Handling System)", [5], "The overhead-hoist-transport (OHT) rail network and stockers that move FOUPs between tools in a 300 mm fab; a GigaFab has tens of kilometers of rail and thousands of vehicles."],
    ["Aspect ratio", [9,15], "Depth divided by width of a feature. DRAM capacitors exceed 50:1; 3D NAND channel holes exceed 60:1."],
    ["ATE (Automatic Test Equipment)", [14], "The tester (Advantest V93000, Teradyne UltraFLEX) that drives and measures a device under test through a probe card or socket."],
    ["BEOL (Back End of Line)", [12], "All process steps after the first contact level: the 15–18 copper/low-k interconnect levels, pads, and passivation."],
    ["Burn-in", [18], "Operating packaged parts at elevated temperature and voltage (e.g. 125 °C, 1.1–1.3× Vdd) for hours to precipitate infant-mortality failures."],
    ["CAR (Chemically Amplified Resist)", [7,8], "Photoresist in which a photo-generated acid catalytically deprotects many polymer sites during post-exposure bake, giving high sensitivity; the standard for KrF, ArF, and most EUV layers."],
    ["Chiplet", [17,19], "A die designed to be one of several in a package, connected by a die-to-die interface (UCIe, NV-HBI, Infinity Fabric)."],
    ["CMP (Chemical Mechanical Planarization/Polishing)", [3,12], "Flattening a wafer by pressing it against a rotating polyurethane pad flooded with abrasive slurry; used after STI fill, ILD deposition, and every copper level."],
    ["CoWoS (Chip on Wafer on Substrate)", [17], "TSMC's 2.5D packaging family. -S: silicon interposer with TSVs. -R: organic RDL interposer. -L: organic interposer with embedded local silicon interconnect (LSI) bridges; used by Blackwell."],
    ["CPP (Contacted Poly Pitch)", [11], "Center-to-center distance between adjacent gates; ~45–48 nm at N3/N2. Also called contacted gate pitch. Sets standard-cell width."],
    ["CZ (Czochralski) growth", [2], "Pulling a single crystal from a silicon melt in a quartz crucible using a seed crystal; produces essentially all 300 mm wafers. MCZ adds a magnetic field to suppress melt convection."],
    ["D0", [13], "Defect density in killer defects per cm², the parameter of every yield model; ~0.05–0.1 /cm² for a mature leading node, ~0.5+ /cm² early in a ramp."],
    ["Damascene", [12], "Forming metal lines by etching trenches into dielectric, filling with metal, and polishing back, rather than etching the metal. Dual damascene fills via and trench in one plating step."],
    ["Deal-Grove model", [6], "Thermal oxidation kinetics: x² + A·x = B(t + τ); linear (reaction-limited) growth for thin oxide, parabolic (diffusion-limited) for thick."],
    ["DRAM (Dynamic Random-Access Memory)", [15], "1T1C volatile memory. Nodes are labelled 1α, 1β, 1γ (roughly 14, 12–13, 11 nm half-pitch class)."],
    ["EUV (Extreme Ultraviolet)", [8], "Lithography at 13.5 nm using a laser-produced tin plasma source and all-reflective Mo/Si multilayer optics in vacuum. NA 0.33 (NXE:3600D, 3800E) and NA 0.55 High-NA (EXE:5000, 5200)."],
    ["Fab", [5], "A wafer fabrication plant. A leading-edge 300 mm fab costs $20–30 billion and runs ~100,000 wafer starts per month at full build-out."],
    ["FinFET", [11], "Transistor whose channel is a vertical silicon fin (~6 nm wide, ~50 nm tall) wrapped on three sides by the gate. Intel 22 nm (2012) to TSMC N3."],
    ["Flip-chip", [16], "Die mounted face-down on the substrate with bumps rather than face-up with wire bonds."],
    ["FOUP (Front-Opening Unified Pod)", [5], "Sealed 25-wafer carrier for 300 mm wafers, docked to tools through a load port; the wafers' clean mini-environment."],
    ["GAA (Gate-All-Around)", [11], "Transistor whose gate fully surrounds the channel; the nanosheet (ribbon) implementation is used at TSMC N2, Samsung SF3/SF2, Intel 18A."],
    ["HBM (High Bandwidth Memory)", [15], "DRAM dies (8, 12, 16 high) stacked with TSVs on a base logic die, delivering ~1–2 TB/s per stack. HBM3E and HBM4 are current."],
    ["Hybrid bonding", [17], "Direct Cu-Cu plus oxide-oxide bonding of two dies or wafers at room temperature followed by anneal, with no solder; sub-10 µm pitch. Used in SoIC, Foveros Direct, and (from HBM4E-class parts) HBM."],
    ["Implant (ion implantation)", [10], "Introducing dopants by accelerating ions to keV–MeV energies into the wafer; dose in atoms/cm², energy in keV."],
    ["Interposer", [17], "A passive silicon or organic layer with fine wiring that sits between chiplets and the package substrate."],
    ["k1", [7], "Dimensionless process factor in the Rayleigh resolution equation; the physical limit for a single exposure is 0.25, practical production ~0.28–0.35."],
    ["KGD (Known Good Die)", [14,18], "A bare die that has been tested sufficiently to be sold or stacked with confidence; essential for HBM and chiplets, where one bad die scraps the whole stack."],
    ["Little's law", [5], "WIP = throughput × cycle time. A fab running 100,000 wafer starts/month with a 90-day cycle time carries ~300,000 wafers in process."],
    ["Mask / photomask / reticle", [4], "6-inch fused-silica plate carrying one layer's pattern at 4× scale; chrome or MoSi absorber on glass for DUV, Ta-based absorber on a Mo/Si multilayer for EUV. A leading-node mask set is 70–100+ masks and costs ~$20–30M."],
    ["Moore's law", [20], "Observation (1965, revised 1975) that transistor count per chip doubles about every two years; density scaling continues at ~1.15–1.3× per node, cost per transistor has flattened."],
    ["NA (Numerical Aperture)", [7,8], "n·sin θ of the projection lens; 1.35 for ArF immersion, 0.33 and 0.55 for EUV."],
    ["OPC (Optical Proximity Correction)", [4,7], "Computationally pre-distorting mask shapes (serifs, assist features, edge biases) so the printed image matches design intent. Inverse lithography (ILT) is the full-optimization variant."],
    ["Pellicle", [4,8], "Thin membrane held a few mm above the mask so particles land out of focus; EUV pellicles are ~50 nm polysilicon-, metal-silicide- or carbon-nanotube-based films with ~85–92% transmission depending on generation."],
    ["PDK (Process Design Kit)", [19], "The foundry's package of device models, design rules, layout libraries, and extraction decks that lets a customer design for a node."],
    ["Quencher", [7], "Base added to a CAR to neutralize stray acid and sharpen the chemical edge."],
    ["Rayleigh criterion", [7], "Resolution = k1·λ/NA; depth of focus = k2·λ/NA²."],
    ["RTA (Rapid Thermal Anneal)", [10], "Lamp or laser heating to 1,000–1,300 °C for seconds (spike), milliseconds (flash/laser), to activate dopants with minimal diffusion."],
    ["Siemens process", [1], "Polysilicon production by decomposing trichlorosilane (TCS) with hydrogen on heated (~1,100 °C) silicon rods in a bell-jar reactor."],
    ["Stochastics", [8], "Random pattern failures at EUV (missing contacts, bridged lines) arising from photon shot noise and resist chemistry at production doses of ~20–40 mJ/cm², and worse at lower doses."],
    ["Substrate (package)", [16], "The multilayer organic (or ceramic) board that fans out die connections to the BGA."],
    ["TSV (Through-Silicon Via)", [15,17], "Vertical Cu-filled via through a thinned die or interposer, ~5–10 µm diameter for HBM and ~10 µm for CoWoS-S interposers."],
    ["UPW (Ultrapure Water)", [4], "18.2 MΩ·cm resistivity water with < 1 ppb TOC and essentially zero particles; a fab uses ~10 million liters per day."],
    ["Voronkov v/G criterion", [2], "Ratio of pull rate to axial temperature gradient at the CZ interface; above ~0.13–0.20 mm²/(K·min) the crystal is vacancy-rich (COPs form), below it interstitial-rich (dislocation loops)."],
    ["Wafer", [3], "The single-crystal silicon disc; 300 mm diameter, 775 µm thick, ~127 g."],
    ["WFE (Wafer Fab Equipment)", [20], "The equipment market for front-end tools, ~$100–120 billion per year as of ~2025."],
    ["Yield", [13], "Fraction of good output. Line yield: wafers surviving the flow. Die yield: good dies per wafer. Assembly/test yield: good packages. Compound yield is their product."],
  ];

  // ---------- read the glossary from the course content ----------
  // Module 21's HTML has <h2 id="glossary"> followed by one <ul>; each <li> is "<strong>term</strong> — definition (Module NN)".
  function readGlossary() {
    try {
      const C = window.COURSE;
      const m = C && Array.isArray(C.modules) ? C.modules.find(x => x && x.n === GLOSSARY_MODULE && typeof x.html === 'string') : null;
      if (!m) return null;
      const tpl = document.createElement('template'); tpl.innerHTML = m.html;
      const root = tpl.content;
      const h2 = root.querySelector('#glossary') || [...root.querySelectorAll('h2')].find(x => /glossary/i.test(x.textContent));
      if (!h2) return null;
      const items = [];
      for (let n = h2.nextElementSibling; n && n.tagName !== 'H2'; n = n.nextElementSibling) if (/^[UO]L$/.test(n.tagName)) items.push(...n.querySelectorAll(':scope > li'));
      const out = [];
      items.forEach(li => {
        const first = li.firstElementChild;
        if (!first || first.tagName !== 'STRONG') return;
        if (li.firstChild !== first && (li.firstChild.nodeType !== 3 || li.firstChild.nodeValue.trim())) return; // text before the <strong>: not a glossary entry
        const term = first.textContent.trim();
        const nodes = []; for (let n = first.nextSibling; n; n = n.nextSibling) nodes.push(n.cloneNode(true));
        if (nodes.length && nodes[0].nodeType === 3) nodes[0].nodeValue = nodes[0].nodeValue.replace(/^[\s—–:-]+/, '');
        let mods = [];
        const last = nodes.length ? nodes[nodes.length - 1] : null;
        if (last && last.nodeType === 3) {
          const mm = last.nodeValue.match(/\s*\((?:Modules?)\s+([\d\s,]+)\)\s*$/);
          if (mm) { mods = mm[1].split(/\s*,\s*/).map(Number).filter(x => !isNaN(x)); last.nodeValue = last.nodeValue.slice(0, mm.index); }
        }
        if (term) out.push({ term, mods, nodes, text: nodes.map(n => n.textContent).join('').trim() });
      });
      return out.length >= 10 ? out : null;
    } catch (e) { return null; }
  }
  const fallbackDeck = () => FALLBACK.map(([term, mods, text]) => ({ term, mods, nodes: [document.createTextNode(text)], text }));

  // ---------- helpers ----------
  const letterOf = t => { const c = t.trim()[0].toUpperCase(); return /[0-9]/.test(c) ? '0–9' : c; };
  const pad2 = n => (n < 10 ? '0' : '') + n;
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffled(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // Words of the term that would give the answer away in quiz mode: the whole head, its acronym / proper-noun tokens, any parenthetical expansion.
  function maskWords(term) {
    const head = term.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();
    const words = [head, ...(term.match(/\(([^)]+)\)/g) || []).map(s => s.slice(1, -1))];
    head.split(/\s*\/\s*|\s+/).forEach(w => { if ((w.length >= 2 && /^[A-Z0-9]/.test(w) && !/^(The|A|An|Of|On)$/i.test(w)) || w.length >= 4) words.push(w); });
    words.slice().forEach(w => { if (w.includes('/')) words.push(...w.split(/\s*\/\s*/)); });
    return [...new Set(words.map(w => w.trim()).filter(w => w.length >= 2))].sort((a, b) => b.length - a.length);
  }
  function maskNode(root, term) {
    const re = new RegExp('(^|[^A-Za-z0-9])(' + maskWords(term).map(esc).join('|') + ')(?![A-Za-z0-9])', 'gi');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n; while ((n = walker.nextNode())) n.nodeValue = n.nodeValue.replace(re, '$1____');
  }
  function loadProgress() { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v === 'object' && v.terms ? v : { v: 1, terms: {} }; } catch (e) { return { v: 1, terms: {} }; } }
  function saveProgress(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* storage blocked: progress lives for this page view only */ } }

  window.registerWidget('glossary-flashcards', {
    title: 'Glossary Flashcards',
    caption: 'Read the term, say its meaning to yourself, then Reveal and mark whether you knew it — or switch to Quiz me and pick the term that matches a definition. Filter by letter or module; the deck map and module chart show what you have mastered.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const uid = 'fc' + Math.random().toString(36).slice(2, 7);
      const live = readGlossary();
      const all = live || fallbackDeck();
      const fromCourse = !!live;
      const moduleTitle = n => { const C = window.COURSE, m = C && Array.isArray(C.modules) ? C.modules.find(x => x && x.n === n) : null; return m && m.title ? m.title : ''; };
      const modules = [...new Set(all.flatMap(t => t.mods))].sort((a, b) => a - b);
      const letters = [...new Set(all.map(t => letterOf(t.term)))].sort((a, b) => (a === '0–9' ? -1 : b === '0–9' ? 1 : a.localeCompare(b)));
      let prog = loadProgress();
      const st = { mode: 'flash', letter: 'all', mod: 'all', order: 'shuffle', seed: 1, idx: 0, revealed: false, answered: null, options: [], right: 0, wrong: 0 };
      let deck = [], W = 700, dead = false, roRaf = 0;
      const mark = t => { const p = prog.terms[t.term]; return p && p.last ? p.last : ''; };
      const opts = list => list.map(([v, l]) => h('option', { value: v }, l));

      // ---------- controls ----------
      const modeSel = h('select', null, ...opts([['flash', 'Flashcards'], ['quiz', 'Quiz me']]));
      const letterSel = h('select', null, ...opts([['all', 'All letters'], ...letters.map(l => [l, l])]));
      const modSel = h('select', null, ...opts([['all', 'All modules'], ...modules.map(m => [String(m), 'Module ' + pad2(m) + (moduleTitle(m) ? ' · ' + moduleTitle(m) : '')])]));
      const orderSel = h('select', null, ...opts([['shuffle', 'Shuffled'], ['alpha', 'A → Z'], ['missed', 'Missed first']]));
      const o = { mode: h('output'), letter: h('output'), mod: h('output'), order: h('output') };
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Mode'), modeSel, o.mode),
        h('label', { class: 'w-ctl' }, h('span', null, 'Letter'), letterSel, o.letter),
        h('label', { class: 'w-ctl' }, h('span', null, 'Module'), modSel, o.mod),
        h('label', { class: 'w-ctl' }, h('span', null, 'Order'), orderSel, o.order));

      // ---------- card ----------
      const style = h('style', null, `
        .${uid} .w-ctl select { width: 100%; min-width: 0; }
        .${uid} .fc-card { border: 1px solid var(--line2); border-radius: 10px; background: var(--panel2); padding: 14px 18px 16px; min-height: 168px; margin: 4px 0 10px; display: grid; align-content: start; gap: 10px; }
        .${uid} .fc-card.flip { animation: ${uid}-in .28s ease-out; }
        @keyframes ${uid}-in { from { opacity: .35; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .${uid} .fc-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; font-family: var(--mono); font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
        .${uid} .fc-term { font-family: var(--sans); font-weight: 600; font-size: 28px; line-height: 1.15; color: var(--ink); overflow-wrap: anywhere; }
        .${uid} .fc-term.small { font-size: 19px; }
        .${uid} .fc-def { font-family: var(--serif); font-size: 15.5px; line-height: 1.5; color: var(--ink); overflow-wrap: anywhere; }
        .${uid} .fc-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .${uid} .fc-chip { font-family: var(--mono); font-size: 11.5px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--line2); color: var(--muted); background: var(--panel); }
        .${uid} .fc-chip.k { color: var(--ok); border-color: var(--ok); } .${uid} .fc-chip.m { color: var(--bad); border-color: var(--bad); }
        .${uid} .fc-hint { color: var(--muted); font-size: 13px; }
        .${uid} .fc-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        @media (max-width: 560px) { .${uid} .fc-opts { grid-template-columns: 1fr; } .${uid} .fc-term { font-size: 23px; } }
        .${uid} .fc-opt { text-align: left; padding: 8px 10px; white-space: normal; line-height: 1.3; display: flex; gap: 8px; align-items: baseline; color: var(--ink); }
        .${uid} .fc-opt b { font-family: var(--mono); font-weight: 600; color: var(--muted); flex: none; }
        .${uid} .fc-opt.right { border-color: var(--ok); box-shadow: inset 0 0 0 1.5px var(--ok); } .${uid} .fc-opt.right b { color: var(--ok); }
        .${uid} .fc-opt.wrong { border-color: var(--bad); box-shadow: inset 0 0 0 1.5px var(--bad); } .${uid} .fc-opt.wrong b { color: var(--bad); }
        .${uid} .fc-opt:disabled { opacity: 1; cursor: default; color: var(--muted); } .${uid} .fc-opt.right:disabled, .${uid} .fc-opt.wrong:disabled { color: var(--ink); }
        .${uid} .fc-verdict { font-weight: 600; } .${uid} .fc-verdict.ok { color: var(--ok); } .${uid} .fc-verdict.bad { color: var(--bad); }
        .${uid} .fc-map rect.cell { cursor: pointer; } .${uid} .fc-map rect.cell:hover { stroke: var(--accent); stroke-width: 2; }
        .${uid} .fc-bars rect.bar { cursor: pointer; }`);
      const card = h('div', { class: 'fc-card', 'aria-live': 'polite' });
      const prevBtn = h('button', { class: 'w-btn', 'data-act': 'prev', on: { click: () => go(-1) } }, '◀ Prev');
      const nextBtn = h('button', { class: 'w-btn', 'data-act': 'next', on: { click: () => go(1) } }, 'Next ▶');
      const revealBtn = h('button', { class: 'w-btn primary', 'data-act': 'reveal', on: { click: () => { st.revealed = !st.revealed; render(); } } }, 'Reveal definition');
      const knewBtn = h('button', { class: 'w-btn', 'data-act': 'knew', style: { borderColor: 'var(--ok)', color: 'var(--ok)' }, on: { click: () => rate('k') } }, '✓ Knew it');
      const missBtn = h('button', { class: 'w-btn', 'data-act': 'miss', style: { borderColor: 'var(--bad)', color: 'var(--bad)' }, on: { click: () => rate('m') } }, '✗ Didn’t know');
      const counter = h('span', { class: 'count' });
      const markGroup = h('span', { style: { display: 'inline-flex', gap: '8px', marginLeft: 'auto' } }, knewBtn, missBtn);
      const nav = h('div', { class: 'w-step-nav' }, prevBtn, revealBtn, nextBtn, counter, markGroup);
      const reshuffleBtn = h('button', { class: 'w-btn', 'data-act': 'reshuffle', on: { click: () => { st.seed++; build(); } } }, 'Reshuffle');
      const resetBtn = h('button', { class: 'w-btn', 'data-act': 'reset', on: { click: () => { prog = { v: 1, terms: {} }; saveProgress(prog); st.right = st.wrong = 0; build(); } } }, 'Reset progress');

      // ---------- visuals ----------
      const map = svg('svg', { class: 'w-svg fc-map', style: { marginTop: '16px' }, role: 'img', 'aria-label': 'Deck map: one square per card, coloured by whether you knew it' });
      const bars = svg('svg', { class: 'w-svg fc-bars', style: { marginTop: '14px' }, role: 'img', 'aria-label': 'Terms per module, split into known, missed and unseen' });
      const readout = h('div', { class: 'w-readout' });
      const formula = h('div', { class: 'w-formula' });
      const legend = h('div', { class: 'w-legend' },
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--ok)' } }), 'knew it (last mark)'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--bad)' } }), 'didn’t know / wrong'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--panel2)', border: '1px solid var(--line2)' } }), 'not seen yet'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'none', border: '2px solid var(--accent)' } }), 'current card'));
      const srcNote = h('div', { class: 'w-note' });
      const T = (x, y, s, a) => svg('text', Object.assign({ x, y, 'font-family': 'var(--sans)', 'font-size': 12, fill: 'var(--muted)' }, a || {}), s);
      const M = (x, y, s, a) => T(x, y, s, Object.assign({ 'font-family': 'var(--mono)', 'font-size': 11 }, a || {}));

      function build() {
        let list = all.filter(t => (st.letter === 'all' || letterOf(t.term) === st.letter) && (st.mod === 'all' || t.mods.includes(+st.mod)));
        const rank = { m: 0, '': 1, k: 2 };
        if (st.order === 'alpha') list.sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
        else if (st.order === 'missed') list.sort((a, b) => rank[mark(a)] - rank[mark(b)] || a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
        else { const rng = mulberry32(Math.imul(st.seed, 0x9E3779B1) ^ Math.imul(list.length, 0x85EBCA6B)); rng(); rng(); list = shuffled(list, rng); }
        deck = list; st.idx = 0; st.revealed = false; st.answered = null; st.options = [];
        render();
      }
      function go(d) { if (!deck.length) return; st.idx = (st.idx + d + deck.length) % deck.length; st.revealed = false; st.answered = null; render(true); }
      function rate(k) {
        const t = deck[st.idx]; if (!t) return;
        const p = prog.terms[t.term] || { k: 0, m: 0 };
        p[k] = (p[k] || 0) + 1; p.last = k; p.t = Date.now(); prog.terms[t.term] = p; saveProgress(prog);
        if (st.mode === 'flash') go(1); else render();
      }
      function quizOptions(t) {
        const rng = mulberry32(st.seed * 97 + st.idx * 7 + t.term.length);
        const same = shuffled(all.filter(x => x !== t && x.mods.some(m => t.mods.includes(m))), rng);
        const rest = shuffled(all.filter(x => x !== t && !same.includes(x)), rng);
        return shuffled([t, ...same.concat(rest).slice(0, 3)], rng);
      }
      const chips = t => h('div', { class: 'fc-chips' }, ...t.mods.map(m => h('span', { class: 'fc-chip', title: moduleTitle(m) || null }, 'Module ' + pad2(m))),
        mark(t) ? h('span', { class: 'fc-chip ' + mark(t) }, mark(t) === 'k' ? 'knew it ✓' : 'missed ✗') : null);
      const defNode = (t, masked) => { const d = h('div', { class: 'fc-def' }, ...t.nodes.map(n => n.cloneNode(true))); if (masked) maskNode(d, t.term); return d; };

      function render(flip) {
        if (dead) return;
        const n = deck.length, t = deck[st.idx];
        const quiz = st.mode === 'quiz';
        card.innerHTML = '';
        card.classList.remove('flip'); if (flip && !reduced) { void card.offsetWidth; card.classList.add('flip'); }
        counter.textContent = n ? `Card ${st.idx + 1} / ${n}` : 'Card 0 / 0';
        revealBtn.hidden = quiz; markGroup.style.display = quiz ? 'none' : 'inline-flex';
        prevBtn.disabled = nextBtn.disabled = !n; revealBtn.disabled = knewBtn.disabled = missBtn.disabled = !n;
        nextBtn.className = 'w-btn' + (quiz && st.answered ? ' primary' : '');
        nextBtn.textContent = quiz && !st.answered ? 'Skip ▶' : 'Next ▶';
        revealBtn.textContent = st.revealed ? 'Hide definition' : 'Reveal definition';
        if (!t) {
          card.append(h('div', { class: 'fc-head' }, h('span', null, 'empty deck')), h('div', { class: 'fc-term small' }, 'No terms match this letter and module.'), h('div', { class: 'fc-hint' }, 'Pick another letter or module above.'));
        } else if (!quiz) {
          card.append(h('div', { class: 'fc-head' }, h('span', null, st.revealed ? 'term · definition' : 'term'), h('span', null, `${st.idx + 1} of ${n}`)));
          card.append(h('div', { class: 'fc-term' + (st.revealed ? ' small' : '') }, t.term));
          if (st.revealed) card.append(defNode(t, false), chips(t), h('div', { class: 'fc-hint' }, 'Did you know it? Mark it below; the next card follows automatically.'));
          else card.append(chips(t), h('div', { class: 'fc-hint' }, 'Say the definition to yourself, then press Reveal to check.'));
        } else {
          if (!st.options.length || st.options.t !== t) { st.options = quizOptions(t); st.options.t = t; }
          card.append(h('div', { class: 'fc-head' }, h('span', null, 'definition · which term is this?'), h('span', null, `${st.idx + 1} of ${n}`)));
          card.append(defNode(t, !st.answered));
          const grid = h('div', { class: 'fc-opts' });
          st.options.forEach((opt, i) => {
            const cls = st.answered ? (opt === t ? ' right' : opt === st.answered ? ' wrong' : '') : '';
            const b = h('button', { class: 'w-btn fc-opt' + cls, on: { click: () => { if (st.answered) return; st.answered = opt; if (opt === t) st.right++; else st.wrong++; rate(opt === t ? 'k' : 'm'); } } }, h('b', null, 'ABCD'[i]), opt.term);
            b.disabled = !!st.answered;
            grid.append(b);
          });
          card.append(grid);
          if (st.answered) card.append(h('div', { class: 'fc-verdict ' + (st.answered === t ? 'ok' : 'bad') }, st.answered === t ? `Correct: ${t.term}.` : `Not quite: the answer is ${t.term}.`), chips(t));
          else card.append(h('div', { class: 'fc-hint' }, 'The term and its expansion are blanked out as ____ in the definition. Wrong options come from the same module where possible.'));
        }
        // outputs and readouts
        const cnt = f => all.filter(f).length;
        o.mode.textContent = quiz ? `${st.right} / ${st.right + st.wrong} right` : plural(n, 'card');
        o.letter.textContent = plural(st.letter === 'all' ? all.length : cnt(x => letterOf(x.term) === st.letter), 'term');
        o.mod.textContent = st.mod === 'all' ? plural(modules.length, 'module') : plural(cnt(x => x.mods.includes(+st.mod)), 'term');
        o.order.textContent = st.order === 'shuffle' ? `seed ${st.seed}` : '';
        const known = deck.filter(x => mark(x) === 'k').length, missed = deck.filter(x => mark(x) === 'm').length, unseen = n - known - missed;
        const mastery = known + missed ? known / (known + missed) : NaN;
        readout.innerHTML = '';
        const stat = (v, l) => h('div', { class: 'w-stat' }, h('b', null, v), h('span', null, l));
        readout.append(stat(fmt(n, 0), 'cards in this deck'), stat(fmt(known, 0), 'knew it'), stat(fmt(missed, 0), 'didn’t know'), stat(fmt(unseen, 0), 'not seen yet'),
          stat(isNaN(mastery) ? '—' : fmt(mastery * 100, 0) + ' %', 'mastery of seen cards'),
          stat(`${fmt(st.right, 0)} / ${fmt(st.right + st.wrong, 0)}`, 'quiz answers right this session'));
        formula.innerHTML = 'mastery = knew it ÷ (knew it + didn’t know) = ' + fmt(known, 0) + ' ÷ ' + fmt(known + missed, 0) + (isNaN(mastery) ? '' : ' = ' + fmt(mastery * 100, 0) + ' %') + ' · a card counts by its <em>last</em> mark · quiz chance level = 1 ÷ 4 = 25 %';
        drawMap(); drawBars();
      }

      // ---------- deck map: one square per card ----------
      function drawMap() {
        map.innerHTML = '';
        const n = deck.length, cell = 12, gap = 3, pitch = cell + gap, alpha = st.order === 'alpha', narrow = W < 520;
        const strip = alpha ? 14 : 0, rowPitch = pitch + strip, top = (narrow ? 32 : 18) + strip;
        const cols = Math.max(1, Math.floor((W + gap) / pitch)), rows = Math.max(1, Math.ceil(n / cols));
        const H = top + rows * rowPitch - strip + 2;
        map.setAttribute('viewBox', `0 0 ${W} ${H}`);
        map.append(T(0, 11, `Deck map — ${plural(n, 'card')} in play order` + (narrow ? '' : ' (click a square to jump to it)'), { fill: 'var(--ink)', 'font-weight': 600 }));
        if (narrow) map.append(T(0, 25, 'click a square to jump to it'));
        let lastLetter = '';
        deck.forEach((t, i) => {
          const x = (i % cols) * pitch, y = top + Math.floor(i / cols) * rowPitch, k = mark(t);
          const fill = k === 'k' ? 'var(--ok)' : k === 'm' ? 'var(--bad)' : 'var(--panel2)';
          const r = svg('rect', { class: 'cell', x: x + 1, y: y + 1, width: cell - 2, height: cell - 2, rx: 2, fill, stroke: i === st.idx ? 'var(--accent)' : 'var(--line2)', 'stroke-width': i === st.idx ? 2 : 1, on: { click: () => { st.idx = i; st.revealed = false; st.answered = null; render(true); } } });
          r.append(svg('title', null, `${i + 1}. ${t.term}${k ? (k === 'k' ? ' — knew it' : ' — didn’t know') : ''}`));
          map.append(r);
          if (alpha) { const L = letterOf(t.term); if (L !== lastLetter) map.append(M(x + cell / 2, y - 4, L === '0–9' ? '#' : L, { 'text-anchor': 'middle', fill: 'var(--ink)' })); lastLetter = L; }
        });
        if (n === 0) map.append(T(0, top + 12, 'no cards in this deck', { 'font-style': 'italic' }));
      }

      // ---------- terms per module, stacked known / missed / unseen ----------
      function drawBars() {
        bars.innerHTML = '';
        const narrow = W < 520, pitch0 = (W - 40) / Math.max(1, modules.length), stagger = pitch0 < 19;
        const PL = 34, PR = 6, PT = (narrow ? 48 : 34) + (stagger ? 8 : 0), PB = stagger ? 48 : 36, H = PT + 120 + PB;
        bars.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const groups = modules.map(m => { const ts = all.filter(t => t.mods.includes(m)); return { m, n: ts.length, k: ts.filter(t => mark(t) === 'k').length, x: ts.filter(t => mark(t) === 'm').length }; });
        const maxN = Math.max(1, ...groups.map(g => g.n)), pitch = (W - PL - PR) / Math.max(1, groups.length), bw = Math.max(4, Math.min(28, pitch * 0.72));
        const y0 = H - PB, yOf = v => y0 - v / maxN * (y0 - PT);
        bars.append(T(0, 11, `Terms per module (${all.length} in the glossary)` + (narrow ? '' : ' — colour shows your marks; click a bar to filter the deck'), { fill: 'var(--ink)', 'font-weight': 600 }));
        if (narrow) bars.append(T(0, 25, 'colour = your marks; click a bar to filter the deck'));
        [0, Math.round(maxN / 2), maxN].forEach(v => { const y = yOf(v); bars.append(svg('line', { x1: PL, y1: y, x2: W - PR, y2: y, stroke: 'var(--line)' }), M(PL - 5, y + 4, String(v), { 'text-anchor': 'end' })); });
        bars.append(T(0, PT - 8, 'terms', { 'font-size': 11 }));
        groups.forEach((g, i) => {
          const x = PL + i * pitch + (pitch - bw) / 2, sel = st.mod === String(g.m);
          const pick = () => { modSel.value = sel ? 'all' : String(g.m); modSel.dispatchEvent(new Event('change')); };
          const seg = (from, to, fill, stroke) => svg('rect', { class: 'bar', x, y: yOf(to), width: bw, height: Math.max(0, yOf(from) - yOf(to)), fill, stroke: stroke || 'none', 'stroke-width': 1, on: { click: pick } });
          const grp = svg('g', null, seg(0, g.n, 'var(--panel2)', sel ? 'var(--accent)' : 'var(--line2)'), seg(0, g.k, 'var(--ok)'), seg(g.k, g.k + g.x, 'var(--bad)'));
          grp.append(svg('title', null, `Module ${pad2(g.m)}${moduleTitle(g.m) ? ' · ' + moduleTitle(g.m) : ''}: ${g.n} terms, ${g.k} known, ${g.x} missed`));
          bars.append(grp);
          bars.append(M(x + bw / 2, yOf(g.n) - 3 - (stagger && i % 2 ? 11 : 0), String(g.n), { 'text-anchor': 'middle', fill: sel ? 'var(--accent)' : 'var(--muted)' }));
          bars.append(M(x + bw / 2, y0 + 13 + (stagger && i % 2 ? 12 : 0), pad2(g.m), { 'text-anchor': 'middle', fill: sel ? 'var(--accent)' : 'var(--ink)', 'font-weight': sel ? 700 : 400 }));
        });
        bars.append(T(W - PR, H - 3, 'module number', { 'text-anchor': 'end', 'font-size': 11 }));
      }

      // ---------- wiring ----------
      modeSel.addEventListener('change', () => { st.mode = modeSel.value; st.revealed = false; st.answered = null; st.options = []; render(true); });
      letterSel.addEventListener('change', () => { st.letter = letterSel.value; build(); });
      modSel.addEventListener('change', () => { st.mod = modSel.value; build(); });
      orderSel.addEventListener('change', () => { st.order = orderSel.value; build(); });
      srcNote.textContent = fromCourse
        ? `${all.length} terms read live from the Module 21 glossary on this page. Progress is saved in this browser (localStorage key "s2g:flash") and survives reloads; Reset progress clears it.`
        : `The Module 21 glossary is not available on this page, so this is the built-in starter deck of ${all.length} terms (verbatim from the course). On the Module 21 page the trainer reads the full glossary of ~240 terms. Progress is saved in this browser (localStorage key "s2g:flash").`;
      el.classList.add(uid);
      el.append(style, controls, card, nav, h('div', { class: 'w-step-nav', style: { marginTop: '8px' } }, reshuffleBtn, resetBtn),
        readout, formula, map, legend, bars, srcNote);

      function relayout(w) { if (dead || !w || w < 200 || Math.abs(w - W) < 2) return; W = w; drawMap(); drawBars(); }
      W = Math.round(el.getBoundingClientRect().width) || 700;
      build();
      const ro = new ResizeObserver(entries => { const w = Math.round(entries[0].contentRect.width); if (roRaf) cancelAnimationFrame(roRaf); roRaf = requestAnimationFrame(() => { roRaf = 0; relayout(w); }); });
      ro.observe(el);
      ctx.onTheme(() => { if (!dead) { drawMap(); drawBars(); } });
      return () => { dead = true; if (roRaf) cancelAnimationFrame(roRaf); ro.disconnect(); el.classList.remove(uid); };
    }
  });
})();
