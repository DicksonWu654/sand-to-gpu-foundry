/* Widget: export-timeline — "Export Controls, 2018 to 2026" (Module 20) */
(function () {
  'use strict';
  let mountCount = 0;
  const ACTORS = {
    us:   { name: 'United States', sub: 'Policy / industry', color: 'var(--accent)', lane: 0, short: 'US' },
    ally: { name: 'NL · JP · TW', sub: 'Policy / industry', color: 'var(--accent2)', lane: 1, short: 'NL / JP / TW' },
    cn:   { name: 'China', sub: 'Policy / industry', color: 'var(--si)', lane: 2, short: 'China' },
  };
  const KINDS = { chips: 'Chips', tools: 'Tools', firms: 'Firms & people', materials: 'Materials' };
  const RANGES = { all: [2018, 2027, '2018 – 2026 (all)'], early: [2019, 2023, '2019 – 2022'], y2023: [2023, 2024, '2023'], y2024: [2024, 2025, '2024'], y2025: [2025, 2026, '2025'], y2026: [2026, 2027, '2026'] };
  const AS_OF = 2026.5;                                     // the module's knowledge ends "as of mid-2026"
  const dec = (y, m, d) => y + (m - 1) / 12 + ((d || 15) - 1) / 365;
  // Text and numbers from Module 20 only. kinds[0] sets the marker shape; relaxed = hollow marker.
  const EVENTS = [
    { id: 'huawei-el', actor: 'us', kinds: ['firms'], t: dec(2019, 8), date: 'Aug 2019 – 2020', short: 'Huawei Entity List', title: 'Huawei added to the Entity List',
      what: 'Almost everything: Entity List status means Huawei needs a US licence for nearly any US-origin item, including US EDA software.',
      who: 'Huawei and its chip designer HiSilicon.',
      how: 'Interrupted access to manufacturing for new Kirin designs; the Kirin line only returned in Aug 2023 on SMIC’s 7 nm-class N+2 process (see the Mate 60 marker).',
      nums: [['3 yr', 'Kirin roadmap gap']] },
    { id: 'nl-euv', actor: 'ally', kinds: ['tools'], t: dec(2019, 7), date: '2019', short: 'EUV licence withheld', title: 'Dutch government withholds ASML’s EUV licence',
      what: 'EUV lithography: ASML has never shipped an EUV scanner to China; the Dutch government withheld the export licence under US pressure.',
      who: 'Any Chinese fab.',
      how: 'Without access to EUV, smaller features require DUV multiple patterning: additional exposures, process steps and alignment control. Those requirements affect cost and yield; the result depends on the particular manufacturing process.',
      nums: [['0', 'EUV scanners shipped to China']] },
    { id: 'fdpr', actor: 'us', kinds: ['chips'], t: dec(2020, 5), date: 'May 2020', short: 'FDPR expansion', title: 'Foreign Direct Product Rule extended to Huawei',
      what: 'Chips made anywhere with US tools, technology or software, if destined for Huawei: the FDPR extends US jurisdiction to foreign-made items.',
      who: 'Huawei’s foundry supply, chiefly TSMC.',
      how: 'TSMC stopped shipping to Huawei in Sept 2020; Huawei was cut off from leading-edge foundry and from US EDA.',
      nums: [['Sept 2020', 'TSMC stops shipping to Huawei']] },
    { id: 'oct7', actor: 'us', kinds: ['chips', 'tools', 'firms'], t: dec(2022, 10, 7), date: 'Oct 7, 2022', short: 'Oct 7 rule', title: 'Advanced computing and semiconductor manufacturing rule',
      what: 'Chips: new ECCNs 3A090/4A090 for accelerators with total processing performance TPP ≥ 4800 and interconnect bandwidth ≥ 600 GB/s, capturing the A100 and H100. Tools: licences for equipment for logic at ≤16/14 nm with non-planar transistors, DRAM at ≤18 nm half-pitch and NAND at ≥128 layers. People: the US persons rule (§744.6) bars US citizens and residents from supporting advanced Chinese fabs without a licence.',
      who: 'China as a destination; advanced fabs at YMTC, CXMT and SMIC; supercomputer end uses; an expanded Entity List.',
      how: 'NVIDIA shipped the A800 and H800: identical dies with interconnect capped at 400 GB/s, under the 600 GB/s test.',
      nums: [['≥ 4800', 'TPP chip threshold'], ['≥ 600 GB/s', 'interconnect threshold'], ['≤ 16/14 nm', 'logic tool limit (non-planar)'], ['≤ 18 nm', 'DRAM half-pitch limit'], ['≥ 128', 'NAND layers'], ['400 GB/s', 'A800/H800 interconnect cap']] },
    { id: 'ymtc', actor: 'us', kinds: ['firms'], t: dec(2022, 12), date: 'Dec 2022', short: 'YMTC listed', title: 'YMTC added to the Entity List',
      what: 'Nearly all US-origin items and tools for YMTC, China’s 3D NAND maker.',
      who: 'YMTC.',
      how: 'YMTC kept shipping: 232-layer NAND in 2022, then a ~270-layer generation in 2024 using string stacking and domestic tools where possible. Public layer counts do not establish comparable manufacturing yields or costs.',
      nums: [['~270', 'YMTC NAND layers, 2024']] },
    { id: 'jp-2023', actor: 'ally', kinds: ['tools'], t: dec(2023, 7, 23), date: 'Jul 23, 2023', short: 'Japan: 23 tool types', title: 'Japan requires licences for 23 equipment categories',
      what: '23 categories of chipmaking equipment, including EUV-related items, advanced etch and deposition, and cleaning.',
      who: 'Exports to China from TEL, Screen, Kokusai and Nikon.',
      how: 'Japan has been slower than the US to restrict servicing of installed tools, and mature-node (28 nm and above) tools stay open, which is where Chinese fabs have been buying at record rates.',
      nums: [['23', 'equipment categories']] },
    { id: 'cn-gage', actor: 'cn', kinds: ['materials'], t: dec(2023, 7), date: 'Jul 2023', short: 'Ga/Ge curbs', title: 'China restricts gallium and germanium exports',
      what: 'Export licences for gallium (~98% of world supply is Chinese) and germanium (~60%).',
      who: 'Foreign buyers subject to the licensing requirements.',
      how: 'Neither stops a silicon fab: gallium matters for GaN and GaAs, germanium for SiGe and infrared optics, so the cost lands on the compound-semiconductor and defence sub-tiers.',
      nums: [['~98 %', 'of world gallium supply'], ['~60 %', 'of world germanium supply']] },
    { id: 'mate60', actor: 'cn', kinds: ['chips'], t: dec(2023, 8), date: 'Aug 2023', short: 'Mate 60 (7 nm)', title: 'Huawei Mate 60 Pro ships a 7 nm-class Kirin 9000S',
      what: 'An industry development: the phone shipped with a Kirin 9000S made on SMIC’s 7 nm-class N+2 process. TechInsights identified the process in its teardown.',
      who: 'Huawei and its chip-design and manufacturing supply chain.',
      how: 'A shipped chip establishes that a process can produce functioning devices. It does not by itself establish production capacity, yield or cost. DUV multiple patterning adds manufacturing steps and tighter alignment requirements as features shrink.',
      nums: [['7 nm-class', 'SMIC N+2 process']] },
    { id: 'nl-2023', actor: 'ally', kinds: ['tools'], t: dec(2023, 9), date: 'Sept 2023', short: 'NXT:2000i licences', title: 'Dutch licences required for ASML’s most capable immersion DUV',
      what: 'TWINSCAN NXT:2000i and above, the most capable immersion DUV scanners.',
      who: 'Chinese customers of ASML.',
      how: 'ASML may still ship older immersion tools (NXT:1980i-class) to non-Entity-List Chinese fabs: China was ~41% of ASML’s system sales in 2024, peaking near 49% in individual quarters.',
      nums: [['~41 %', 'China share of ASML system sales, 2024']] },
    { id: 'oct17', actor: 'us', kinds: ['chips', 'tools'], t: dec(2023, 10, 17), date: 'Oct 17, 2023', short: 'Oct 17 update', title: 'October 2023 update: the performance-density test',
      what: 'Chips: the interconnect test is replaced by performance density. Controlled if TPP ≥ 4800, or TPP ≥ 1600 with density ≥ 5.92 TPP/mm²; a gray zone (TPP 2400–4800) needs notification. Tools: more lithography and deposition items.',
      who: 'China plus ~40 countries, and Chinese-headquartered firms anywhere in the world. Changes the eligibility of A800/H800-class products under the earlier criteria.',
      how: 'NVIDIA designed the H20 (TPP ~2,400: a cut-down Hopper with full HBM3 but ~15% of H100’s compute), L20 and L2 to fit under the line.',
      nums: [['5.92 TPP/mm²', 'performance-density threshold'], ['≥ 1600', 'TPP with the density test'], ['2400–4800', 'gray zone (notification)'], ['~2,400', 'H20 TPP'], ['~15 %', 'H20 compute vs H100']] },
    { id: 'cn-graphite', actor: 'cn', kinds: ['materials'], t: dec(2023, 12), date: 'Dec 2023', short: 'Graphite', title: 'China restricts graphite exports',
      what: 'Export licences for graphite.',
      who: 'Foreign buyers subject to the licensing requirements.',
      how: 'Part of a widening set of materials controls: gallium and germanium (Jul 2023), graphite (Dec 2023), antimony (Aug 2024), then an outright ban to the US (Dec 2024).',
      nums: [] },
    { id: 'cn-antimony', actor: 'cn', kinds: ['materials'], t: dec(2024, 8), date: 'Aug 2024', short: 'Antimony', title: 'China restricts antimony exports',
      what: 'Export licences for antimony.',
      who: 'Foreign buyers.',
      how: 'Followed in Dec 2024 by an outright ban of gallium, germanium and antimony to the US.',
      nums: [] },
    { id: 'nl-2024', actor: 'ally', kinds: ['tools'], t: dec(2024, 9), date: 'Sept 2024', short: 'NXT:1970/80i', title: 'Dutch take over licensing of the NXT:1970i and 1980i',
      what: 'Licensing of ASML’s NXT:1970i and NXT:1980i immersion scanners moves from US to Dutch control.',
      who: 'Chinese customers of ASML.',
      how: 'US-person servicing rules already keep ASML’s US-citizen engineers away from SMIC’s and Huawei-linked advanced fabs; Dutch nationals can service tools under Dutch licences that have been progressively tightened.',
      nums: [] },
    { id: 'dec2', actor: 'us', kinds: ['chips', 'tools', 'firms'], t: dec(2024, 12, 2), date: 'Dec 2, 2024', short: 'HBM + tools rule', title: 'HBM and tools rule',
      what: 'HBM with memory bandwidth density above 2 GB/s/mm² (all HBM2E and later); 24 more tool types and 3 software categories; the FDPR extended to tools.',
      who: 'China; 140 entities added, including Naura subsidiaries, Piotech, SiCarrier and Wingtech. Japan and the Netherlands were exempted from some FDPR provisions in exchange for their own controls.',
      how: 'Cut off Samsung’s HBM2E exports to China, leaving Huawei’s Ascend line constrained by HBM: China has no volume HBM producer (CXMT’s HBM3 was in sampling as of 2025).',
      nums: [['> 2 GB/s/mm²', 'HBM bandwidth density'], ['24', 'tool types added'], ['140', 'entities added']] },
    { id: 'cn-ban', actor: 'cn', kinds: ['materials'], t: dec(2024, 12, 20), date: 'Dec 2024', short: 'Ga/Ge/Sb ban', title: 'China bans gallium, germanium and antimony exports to the US',
      what: 'Outright ban on gallium, germanium and antimony to the US (previously licence-controlled).',
      who: 'US buyers, in reply to the Dec 2 HBM and tools rule.',
      how: 'Raises costs for GaN/GaAs, SiGe and infrared optics; none of it stops a silicon fab.',
      nums: [] },
    { id: 'diffusion', actor: 'us', kinds: ['chips'], t: dec(2025, 1, 13), date: 'Jan 13–15, 2025', short: 'AI Diffusion Rule', title: 'AI Diffusion Rule and foundry due-diligence rule',
      what: 'Diffusion Rule: three country tiers, compute caps for tier 2 (most of the world) and controls on model weights. Foundry rule: TSMC and others must verify end users for ≤16/14 nm logic with ≥30 billion transistors.',
      who: 'Tier-2 countries, and any route by which Chinese designers reach TSMC. Trigger: a TSMC-made die found in a Huawei Ascend 910B (TechInsights, Oct 2024).',
      how: 'TSMC cut off Sophgo and other intermediaries; a ~$1 billion penalty was proposed. The tiers were rescinded on May 13, 2025, days before they took effect.',
      nums: [['3', 'country tiers'], ['≥ 30 B', 'transistors (foundry rule)'], ['~$1 B', 'proposed TSMC penalty']] },
    { id: 'nl-2025', actor: 'ally', kinds: ['tools'], t: dec(2025, 1, 25), date: 'Jan 2025', short: 'Metrology tools', title: 'Dutch controls extended to metrology and more immersion tools',
      what: 'Metrology equipment and some further immersion lithography tools.',
      who: 'Chinese customers of ASML.',
      how: 'China fell to ~33% of ASML’s system sales in 2025 and was guided to ~20% for 2026 (as of early 2026), still from mature-node fabs that the rules leave open.',
      nums: [['~33 %', 'China share of ASML sales, 2025'], ['~20 %', 'guided for 2026']] },
    { id: 'h20-ban', actor: 'us', kinds: ['chips'], t: dec(2025, 4, 10), date: 'Apr 2025', short: 'H20 ban', title: 'H20 and MI308 need licences',
      what: 'NVIDIA’s H20 and AMD’s MI308, the chips designed to fit under the Oct 2023 line.',
      who: 'China.',
      how: 'NVIDIA took a $4.5 billion inventory charge and ~$8 billion of quarterly China revenue stopped; the Financial Times reported on the order of $1 billion of NVIDIA product reaching China in the following three months anyway (smuggling via Singapore and Malaysia has been prosecuted).',
      nums: [['$4.5 B', 'NVIDIA inventory charge'], ['~$8 B', 'quarterly China revenue stopped'], ['~$1 B', 'product reaching China in 3 months (FT)']] },
    { id: 'cn-rare7', actor: 'cn', kinds: ['materials'], t: dec(2025, 4, 10), date: 'Apr 2025', short: '7 rare earths', title: 'China controls seven medium and heavy rare earths',
      what: 'Export licences for seven medium and heavy rare earths.',
      who: 'Foreign buyers.',
      how: 'Expanded on Oct 9, 2025 into sweeping controls with an extraterritorial clause, then suspended under the Nov 2025 truce.',
      nums: [['7', 'rare earths controlled']] },
    { id: 'diff-rescind', actor: 'us', kinds: ['chips'], t: dec(2025, 5, 13), date: 'May 13, 2025', short: 'Diffusion rescinded', title: 'AI Diffusion Rule rescinded', relaxed: true,
      what: 'Relaxed: BIS withdrew the three country tiers days before they took effect. Replaced by guidance that using Huawei Ascend chips “anywhere in the world” risks violating US controls, plus stronger diversion warnings.',
      who: 'Tier-2 countries came off the compute cap; Huawei Ascend users anywhere were warned.',
      how: 'A replacement framework of bilateral deals (UAE, Saudi Arabia) followed.',
      nums: [] },
    { id: 'tw-2025', actor: 'ally', kinds: ['firms'], t: dec(2025, 6), date: 'Jun 2025', short: 'Taiwan: Huawei/SMIC', title: 'Taiwan imposes export controls on Huawei and SMIC',
      what: 'Taiwanese exports to Huawei and SMIC now need licences.',
      who: 'Huawei and SMIC.',
      how: 'Taiwan also runs an “N-1” rule keeping overseas fabs one generation behind Taiwan, which TSMC’s plan for N2 in Arizona by ~2028–29 tests.',
      nums: [] },
    { id: 'h20-deal', actor: 'us', kinds: ['chips'], t: dec(2025, 8, 10), date: 'Aug 2025', short: 'H20 deal (15%)', title: 'H20 licences in exchange for a 15% revenue share', relaxed: true,
      what: 'Relaxed: NVIDIA and AMD may sell the H20 and MI308 to China if they remit 15% of those sales to the US government, a legally novel arrangement (export taxes are constitutionally contested).',
      who: 'NVIDIA’s and AMD’s China sales.',
      how: 'Beijing then discouraged Chinese firms from buying the H20, and Chinese purchases largely stopped.',
      nums: [['15 %', 'of China sales remitted to the US']] },
    { id: 'cn-probes', actor: 'cn', kinds: ['firms'], t: dec(2025, 9, 10), date: 'Sept 2025', short: 'Probes; Ascend 950', title: 'Antitrust probes and the Ascend roadmap',
      what: 'Antitrust probes into NVIDIA and Qualcomm and an anti-dumping probe into US analog chips.',
      who: 'US chip firms selling in China.',
      how: 'Huawei’s Sept 2025 roadmap announced Ascend 950/960/970 accelerators with in-house HBM through 2028; its 910B/910C had shipped on the order of a few hundred thousand units in 2024–25, constrained by HBM supply and interconnect.',
      nums: [['~few 100k', 'Ascend 910B/C units, 2024–25']] },
    { id: 'affiliates', actor: 'us', kinds: ['firms'], t: dec(2025, 9, 29), date: 'Sept 29, 2025', short: '50% affiliates rule', title: 'Affiliates rule: Entity List extends to majority-owned affiliates',
      what: 'Any company at least 50% owned by Entity-Listed firms is treated as listed.',
      who: 'Subsidiaries and affiliates of listed Chinese firms.',
      how: 'Suspended for a year in Nov 2025 as part of the US–China truce.',
      nums: [['≥ 50 %', 'ownership threshold']] },
    { id: 'cn-rare-oct', actor: 'cn', kinds: ['materials'], t: dec(2025, 10, 9), date: 'Oct 9, 2025', short: 'Rare-earth controls', title: 'Sweeping rare-earth export controls',
      what: 'Rare earths and, via an extraterritorial clause, foreign products containing Chinese rare-earth content.',
      who: 'Worldwide, mirroring the reach of the US FDPR.',
      how: 'Suspended for one year in Nov 2025 under the trade truce, with general licences issued for US end users (as of late 2025).',
      nums: [] },
    { id: 'truce', actor: 'both', kinds: ['firms'], t: dec(2025, 11, 12), date: 'Nov 2025', short: 'Truce', title: 'US–China trade truce', relaxed: true,
      what: 'Relaxed on both sides: BIS suspended the 50% affiliates rule for a year; China suspended its October rare-earth controls for a year and issued general licences for US end users.',
      who: 'Each side’s newest measures. The core chip and tool controls stayed in place.',
      how: 'The Oct 2022 – Dec 2024 thresholds were untouched: the truce paused the escalation, not the regime.',
      nums: [['1 yr', 'suspension on both sides']] },
    { id: 'h200', actor: 'us', kinds: ['chips'], t: dec(2026, 1, 15), date: 'Dec 2025 – Feb 2026', short: 'H200 deal (25%)', title: 'H200 licences with a 25% share', relaxed: true, asOf: 'mid-2026',
      what: 'Relaxed: H200 and MI325X-class chips move to case-by-case review with third-party testing, a volume cap relative to US sales, and a 25% levy collected via a Section 232 tariff mechanism (announced Dec 2025, BIS rule Jan 2026, licences from Feb 2026).',
      who: 'Approved Chinese customers.',
      how: 'As of mid-2026 only token volumes had shipped: Chinese customs and procurement guidance blocked most sales, shipments were under 1% of NVIDIA’s data-center revenue, and NVIDIA halted China-configured H200 production in March 2026.',
      nums: [['25 %', 'levy on H200 China sales'], ['< 1 %', 'of NVIDIA data-center revenue']] },
    { id: 'cn-h200', actor: 'cn', kinds: ['chips'], t: dec(2026, 3, 10), date: 'Early 2026', short: 'H200 blocked', title: 'Chinese customs and procurement guidance block H200 purchases', asOf: 'mid-2026',
      what: 'Chinese customs and procurement guidance blocked most H200 sales, as Beijing had discouraged H20 purchases in 2025.',
      who: 'Chinese buyers of NVIDIA’s China-configured parts.',
      how: 'NVIDIA halted China-configured H200 production in March 2026 (as of mid-2026).',
      nums: [] },
  ];
  const lanesOf = ev => ev.actor === 'both' ? ['us', 'cn'] : [ev.actor];
  // the rules a reader must be able to find at a glance: their labels are placed before the minor events'
  const MAJOR = new Set(['huawei-el', 'nl-euv', 'oct7', 'jp-2023', 'nl-2023', 'cn-gage', 'mate60', 'oct17', 'dec2', 'diffusion', 'h20-ban', 'h20-deal', 'cn-rare-oct', 'truce', 'h200']);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  window.registerWidget('export-timeline', {
    title: 'Export Controls, 2018 to 2026',
    caption: 'Click a marker (or use Prev / Next) to explore selected policy and industry events: what changed, which firms or users were affected, and what followed. Lanes identify jurisdictions rather than assuming a shared policy viewpoint.',
    mount(el, ctx) {
      const { h, svg } = ctx;
      const uid = 'et' + (++mountCount);
      const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const st = { sel: 'oct7', filter: 'all', range: 'all', playing: false };
      let W = 700, dead = false, roRaf = 0, raf = 0, lastTick = 0, visible = true, hoverId = null, lastInst = [], lastML = 128;
      const TOP = 16, BAND = 88, AXIS_Y = TOP + 3 * BAND + 22, DATE_Y = AXIS_Y - 12, H = AXIS_Y + 22, MR = 10;
      const byId = id => EVENTS.find(e => e.id === id);
      const inRange = ev => { const r = RANGES[st.range]; return ev.t >= r[0] && ev.t < r[1]; };
      const passes = ev => st.filter === 'all' || ev.actor === st.filter || (ev.actor === 'both' && st.filter !== 'ally');
      const shown = () => EVENTS.filter(ev => inRange(ev) && passes(ev));

      // ---------- SVG helpers ----------
      const T = (x, y, txt, a) => svg('text', Object.assign({ x, y, 'font-size': 11.5, 'font-family': 'var(--sans)', fill: 'var(--ink)' }, a || {}), txt);
      const M = (x, y, txt, a) => T(x, y, txt, Object.assign({ 'font-family': 'var(--mono)', 'font-size': 11, fill: 'var(--muted)' }, a || {}));
      function glyph(kind, x, y, color, hollow, s) {
        s = s || 1;
        const a = { fill: hollow ? 'var(--panel)' : color, stroke: hollow ? color : 'var(--panel)', 'stroke-width': hollow ? 2.2 : 1.2 };
        if (kind === 'tools') return svg('rect', Object.assign({ x: x - 6 * s, y: y - 6 * s, width: 12 * s, height: 12 * s, rx: 2 }, a));
        if (kind === 'firms') return svg('path', Object.assign({ d: `M${x},${y - 8 * s} L${x + 8 * s},${y} L${x},${y + 8 * s} L${x - 8 * s},${y} Z` }, a));
        if (kind === 'materials') return svg('path', Object.assign({ d: `M${x},${y - 8 * s} L${x + 7.5 * s},${y + 6 * s} L${x - 7.5 * s},${y + 6 * s} Z` }, a));
        return svg('circle', Object.assign({ cx: x, cy: y, r: 6.5 * s }, a));
      }
      const legendGlyph = (kind, color, hollow) => svg('svg', { width: 18, height: 18, viewBox: '0 0 18 18', style: { flex: 'none' } }, glyph(kind, 9, 9, color, hollow));

      // ---------- controls ----------
      const prevBtn = h('button', { class: 'w-btn', on: { click: () => step(-1) } }, '‹ Prev');
      const nextBtn = h('button', { class: 'w-btn', on: { click: () => step(1) } }, 'Next ›');
      const playBtn = h('button', { class: 'w-btn primary', on: { click: () => setPlaying(!st.playing) } }, 'Play walkthrough');
      const count = h('span', { class: 'count' });
      const selStyle = { minWidth: 0, maxWidth: '100%', width: '100%' };
      const jumpSel = h('select', { 'aria-label': 'Jump to event', style: selStyle }, ...EVENTS.map(ev => h('option', { value: ev.id }, ev.date + ' · ' + ev.short)));
      const filterSel = h('select', { style: selStyle }, h('option', { value: 'all' }, 'All jurisdictions'), h('option', { value: 'us' }, 'United States only'), h('option', { value: 'ally' }, 'NL / JP / TW only'), h('option', { value: 'cn' }, 'China only'));
      const rangeSel = h('select', { style: selStyle }, ...Object.keys(RANGES).map(k => h('option', { value: k }, RANGES[k][2])));
      jumpSel.addEventListener('change', () => {
        const ev = byId(jumpSel.value); if (!ev) return;
        if (!passes(ev)) { st.filter = 'all'; filterSel.value = 'all'; }
        if (!inRange(ev)) { st.range = 'all'; rangeSel.value = 'all'; }
        select(ev.id);
      });
      filterSel.addEventListener('change', () => { st.filter = filterSel.value; ensureSel(); render(); });
      rangeSel.addEventListener('change', () => { st.range = rangeSel.value; ensureSel(); render(); });
      const nav = h('div', { class: 'w-step-nav' }, prevBtn, nextBtn, count, playBtn);
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Jump to'), jumpSel, h('output')),
        h('label', { class: 'w-ctl' }, h('span', null, 'Show'), filterSel, h('output')),
        h('label', { class: 'w-ctl' }, h('span', null, 'Zoom'), rangeSel, h('output')));

      // ---------- drawing ----------
      const svgEl = svg('svg', { class: 'w-svg', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Timeline of policy and industry events in the United States, Netherlands, Japan, Taiwan and China, 2018 to 2026, in three lanes' });
      // Crowded markers have overlapping generous hit circles. Resolve a pointer
      // against visible marker centres, not whichever SVG group was painted last.
      function pointerEventId(event) {
        const matrix = svgEl.getScreenCTM();
        if (!matrix) return null;
        const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
        let nearest = null, distance = 14 * 14;
        lastInst.forEach(item => {
          const d = (point.x - item.x) ** 2 + (point.y - item.y) ** 2;
          if (d < distance) { nearest = item.ev.id; distance = d; }
        });
        return nearest;
      }
      svgEl.addEventListener('pointermove', event => setHover(pointerEventId(event)));
      svgEl.addEventListener('pointerleave', () => setHover(null));
      svgEl.addEventListener('click', event => {
        if (!event.detail) return; // keyboard/assistive clicks use the focused group
        const id = pointerEventId(event);
        if (id) select(id);
      });

      const hoverLayer = svg('g');
      const detail = h('div', { style: { border: '1px solid var(--line)', borderRadius: '6px', padding: '10px 14px', margin: '8px 0 6px' } });
      const nums = h('div', { class: 'w-readout' });

      function render() {
        if (dead) return;
        svgEl.innerHTML = '';
        svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const wide = W >= 600, ML = wide ? 128 : 58; lastML = ML;
        const [t0, t1] = RANGES[st.range], span = t1 - t0;
        const X = t => ML + (t - t0) / span * (W - ML - MR);
        const pxPerYear = (W - ML - MR) / span;
        svgEl.append(svg('defs', null, svg('pattern', { id: uid + '-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
          svg('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'var(--line2)', 'stroke-width': 1.5 }))));
        // lanes
        Object.keys(ACTORS).forEach(k => {
          const a = ACTORS[k], y0 = TOP + a.lane * BAND, yc = y0 + BAND / 2;
          const dim = st.filter !== 'all' && st.filter !== k;
          if (a.lane === 1) svgEl.append(svg('rect', { x: 0, y: y0, width: W, height: BAND, fill: 'var(--panel2)', opacity: 0.55 }));
          svgEl.append(svg('rect', { x: 4, y: y0 + 6, width: 4, height: BAND - 12, rx: 2, fill: a.color, opacity: dim ? 0.3 : 1 }));
          svgEl.append(svg('line', { x1: ML - 6, y1: yc, x2: W - MR, y2: yc, stroke: 'var(--line2)', 'stroke-width': 1 }));
          if (wide) { svgEl.append(T(14, yc - 5, a.name, { 'font-weight': 600, 'font-size': 12.5, opacity: dim ? 0.45 : 1 })); svgEl.append(T(14, yc + 14, a.sub, { fill: 'var(--muted)', 'font-size': 11 })); }
          else svgEl.append(T(14, yc + 4, a.short, { 'font-weight': 600, 'font-size': 12, opacity: dim ? 0.45 : 1 }));
        });
        // year / month grid and axis
        svgEl.append(svg('line', { x1: ML - 6, y1: AXIS_Y, x2: W - MR, y2: AXIS_Y, stroke: 'var(--ink)', 'stroke-width': 1.2 }));
        const monthly = span <= 1.01, quarters = span <= 4.01;
        for (let y = Math.ceil(t0); y <= t1; y++) {
          for (let m = 0; m < 12; m++) {
            const t = y + m / 12; if (t < t0 || t > t1 + 1e-9) continue;
            const x = X(t), major = m === 0, q = m % 3 === 0;
            if (!major && !(monthly || (quarters && q))) continue;
            if (major || monthly) svgEl.append(svg('line', { x1: x, y1: TOP, x2: x, y2: AXIS_Y, stroke: 'var(--line)', 'stroke-width': 1, 'stroke-dasharray': major ? null : '2 3' }));
            svgEl.append(svg('line', { x1: x, y1: AXIS_Y, x2: x, y2: AXIS_Y + (major ? 6 : 4), stroke: 'var(--ink)', 'stroke-width': 1 }));
            let lbl = null;
            if (monthly) { if (q && t < t1) lbl = MONTHS[m]; }
            else if (major && t < t1) lbl = pxPerYear >= 34 ? String(y) : '’' + String(y).slice(2);
            if (lbl) svgEl.append(M(x + 3, AXIS_Y + 17, lbl, { fill: 'var(--ink)' }));
          }
        }
        svgEl.append(T(14, AXIS_Y + 17, monthly ? String(t0) + ' →' : 'year', { fill: 'var(--muted)', 'font-size': 11, 'font-family': monthly ? 'var(--mono)' : 'var(--sans)' }));
        // beyond the module's knowledge
        if (AS_OF < t1) {
          const xa = X(Math.max(AS_OF, t0));
          svgEl.append(svg('rect', { x: xa, y: TOP, width: W - MR - xa, height: AXIS_Y - TOP, fill: `url(#${uid}-hatch)`, opacity: 0.6 }));
          svgEl.append(svg('line', { x1: xa, y1: TOP - 2, x2: xa, y2: AXIS_Y, stroke: 'var(--warn)', 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }));
          svgEl.append(T(Math.min(xa, W - MR), TOP - 5, 'as of mid-2026 ▸', { 'text-anchor': 'end', fill: 'var(--ink)', 'font-size': 11, 'font-weight': 600 }));
        }
        // marker instances, staggered into 3 rows per lane when crowded
        const inst = [];
        shown().forEach(ev => lanesOf(ev).forEach(lane => inst.push({ ev, lane, x: X(ev.t), y: 0, row: 0 })));
        const OFF = { 0: 0, '-1': -18, 1: 18 };
        ['us', 'ally', 'cn'].forEach(lane => {
          const last = { 0: -Infinity, '-1': -Infinity, 1: -Infinity };
          inst.filter(i => i.lane === lane).sort((a, b) => a.x - b.x).forEach(i => {
            let row = ['0', '-1', '1'].find(r => i.x - last[r] >= 17);
            if (row == null) row = ['0', '-1', '1'].reduce((b, r) => last[r] < last[b] ? r : b, '0');
            last[row] = i.x; i.row = +row; i.y = TOP + ACTORS[lane].lane * BAND + BAND / 2 + OFF[row];
          });
        });
        lastInst = inst;
        if (!inst.length) svgEl.append(T((ML + W - MR) / 2, TOP + 1.5 * BAND + 4, 'No events for this actor in this range: widen the zoom.', { 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 12.5 }));
        // truce connector between its two lanes
        const truce = inst.filter(i => i.ev.actor === 'both');
        if (truce.length === 2) svgEl.append(svg('line', { x1: truce[0].x, y1: truce[0].y, x2: truce[1].x, y2: truce[1].y, stroke: 'var(--muted)', 'stroke-width': 1.2, 'stroke-dasharray': '3 3' }));
        // selected: guide line to the axis + date pill
        const selInst = inst.filter(i => i.ev.id === st.sel);
        let guide = null, selTop = null;
        if (selInst.length) {
          const s = selInst[selInst.length - 1], ev = s.ev, col = ACTORS[s.lane].color;
          selTop = selInst.reduce((b, i) => i.y < b.y ? i : b, selInst[0]);
          guide = svg('line', { x1: s.x, y1: selTop.y, x2: s.x, y2: AXIS_Y, stroke: col, 'stroke-width': 1.2, 'stroke-dasharray': '3 3', opacity: 0.9 });
          svgEl.append(guide);
          const tw = ev.date.length * 6.8 + 12, px = Math.max(ML - 6 + tw / 2, Math.min(W - MR - tw / 2, s.x));
          svgEl.append(svg('rect', { x: px - tw / 2, y: DATE_Y - 9, width: tw, height: 18, rx: 4, fill: 'var(--panel)', stroke: col, 'stroke-width': 1.5 }));
          svgEl.append(M(px, DATE_Y + 4, ev.date, { 'text-anchor': 'middle', fill: 'var(--ink)', 'font-weight': 600 }));
        }
        // glyphs
        const gl = svg('g');
        inst.forEach(i => {
          const ev = i.ev, a = ACTORS[i.lane], isSel = ev.id === st.sel;
          const dim = st.filter !== 'all' && st.filter !== i.lane && ev.actor !== 'both';
          const g = svg('g', { tabindex: 0, role: 'button', 'aria-label': ev.date + ': ' + ev.title, 'data-ev': ev.id, 'aria-pressed': String(isSel), style: { cursor: 'pointer', outline: 'none' }, opacity: dim ? 0.35 : 1 });
          g.append(svg('circle', { cx: i.x, cy: i.y, r: 12, fill: 'var(--panel)', 'fill-opacity': 0.01 }));
          if (isSel) g.append(svg('circle', { cx: i.x, cy: i.y, r: 12, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.5 }));
          g.append(glyph(ev.kinds[0], i.x, i.y, a.color, !!ev.relaxed, (isSel ? 1.25 : 1) * (wide ? 1 : 0.88)));
          g.append(svg('title', null, ev.date + ' · ' + ev.title));
          g.addEventListener('focus', () => setHover(ev.id));
          g.addEventListener('blur', () => setHover(null));
          g.addEventListener('click', event => { if (!event.detail) select(ev.id); });
          g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(ev.id); } });
          gl.append(g);
        });
        svgEl.append(gl);
        // in-place labels: selected first, then left to right; a label is kept only where it clears every glyph and accepted label in its lane
        const boxes = inst.map(i => ({ lane: i.lane, x0: i.x - 9, x1: i.x + 9, y0: i.y - 9, y1: i.y + 9 }));
        if (AS_OF < t1 && AS_OF > t0) ['us', 'ally', 'cn'].forEach(k => boxes.push({ lane: k, x0: X(AS_OF) - 1, x1: X(AS_OF) + 1, y0: TOP + ACTORS[k].lane * BAND, y1: TOP + ACTORS[k].lane * BAND + BAND }));   // labels stay clear of the "as of" line
        const hit = (b, c) => b.lane === c.lane && b.x0 < c.x1 + 3 && b.x1 > c.x0 - 3 && b.y0 < c.y1 + 2 && b.y1 > c.y0 - 2;
        const rank = i => i.ev.id === st.sel ? 0 : MAJOR.has(i.ev.id) ? 1 : 2;
        const order = inst.slice().sort((a, b) => rank(a) - rank(b) || a.x - b.x);
        const lbls = svg('g'); svgEl.append(lbls);          // in the DOM before measuring, so getComputedTextLength() is real
        order.forEach(i => {
          if (i.ev.actor === 'both' && i.lane === 'cn') return;
          if (st.filter !== 'all' && st.filter !== i.lane && i.ev.actor !== 'both') return;
          const isSel = i.ev.id === st.sel, my = inst.indexOf(i), gap = isSel ? 15 : 11;
          const txt = T(i.x + gap, i.y + 4, i.ev.short, { 'font-size': 11, 'font-weight': isSel ? 700 : 500, fill: isSel ? 'var(--ink)' : 'var(--muted)' });
          lbls.append(txt);
          let w = 0; try { w = txt.getComputedTextLength(); } catch (e) { w = 0; }
          if (!w) w = i.ev.short.length * 5.6;
          const bt = TOP + ACTORS[i.lane].lane * BAND, bb = bt + BAND, L = i.lane, gy = isSel ? 12 : 9;
          // right of the marker first; then above / below it (left-, centre- or right-aligned); the left side only for the selected event, whose ring makes it unambiguous
          const side = (x, anchor, y0) => ({ x, y: y0 + 11, anchor, lane: L, x0: anchor === 'start' ? x - 2 : anchor === 'end' ? x - w - 2 : x - w / 2 - 2, x1: anchor === 'start' ? x + w + 2 : anchor === 'end' ? x + 2 : x + w / 2 + 2, y0, y1: y0 + 14 });
          const cands = [side(i.x + gap, 'start', i.y - 7)];
          [i.y - gy - 16, i.y + gy + 2].forEach(y0 => { cands.push(side(i.x - 6, 'start', y0), side(i.x, 'middle', y0), side(i.x + 6, 'end', y0)); });
          if (isSel) cands.push(side(i.x - gap, 'end', i.y - 7));
          cands.forEach(c => { const dx = c.x1 > W - MR ? W - MR - c.x1 : c.x0 < ML - 4 ? ML - 4 - c.x0 : 0; c.x += dx; c.x0 += dx; c.x1 += dx; });   // keep every candidate inside the drawing
          const own = { lane: i.lane, x0: i.x - 6, x1: i.x + 6, y0: i.y - 6, y1: i.y + 6 };   // a clamped label must not land on its own marker
          const hits = (c, soft) => boxes.reduce((n, b, j) => n + (j !== my && !(soft && b.guide) && hit(c, b) ? 1 : 0), hit(c, own) ? 1 : 0);
          let ok = cands.find(c => c.y0 >= bt && c.y1 <= bb && !hits(c)), halo = false;
          if (!ok) { ok = cands.find(c => c.y0 >= bt && c.y1 <= bb && !hits(c, true)); halo = !!ok; }   // crossing the guide line is allowed as a last resort
          if (!ok && !isSel) { txt.remove(); return; }
          // the selected event always gets its label: the least-crowded spot, with a halo so it stays readable over neighbours
          const c = ok || cands.filter(c => c.y0 >= bt && c.y1 <= bb).sort((a, b) => hits(a) - hits(b))[0] || cands[0];
          txt.setAttribute('x', c.x); txt.setAttribute('y', c.y); txt.setAttribute('text-anchor', c.anchor);
          if (!ok || halo) { txt.setAttribute('paint-order', 'stroke'); txt.setAttribute('stroke', 'var(--panel)'); txt.setAttribute('stroke-width', 3.5); txt.setAttribute('stroke-linejoin', 'round'); }
          boxes.push(c);
          if (isSel && guide) {                       // keep other labels off the guide line; start it below a label placed under the marker
            if (c.y0 > i.y) guide.setAttribute('y1', c.y1 + 1);
            ['us', 'ally', 'cn'].forEach(k => { const li = ACTORS[k].lane; if (li < ACTORS[selTop.lane].lane) return;
              boxes.push({ guide: true, lane: k, x0: i.x - 1, x1: i.x + 1, y0: li === ACTORS[selTop.lane].lane ? Math.max(selTop.y + 9, c.y1) : TOP + li * BAND, y1: TOP + li * BAND + BAND }); });
          }
        });
        hoverLayer.innerHTML = '';
        svgEl.append(hoverLayer);
        drawDetail();
      }

      // hover ring + tooltip live in their own layer so hovering never rebuilds the markers under the pointer
      function setHover(id) {
        if (dead) return;
        hoverId = id; hoverLayer.innerHTML = '';
        if (!id || id === st.sel) return;
        const hv = lastInst.find(i => i.ev.id === id && !(i.ev.actor === 'both' && i.lane === 'cn')); if (!hv) return;
        lastInst.filter(i => i.ev.id === id).forEach(i => hoverLayer.append(svg('circle', { cx: i.x, cy: i.y, r: 11, fill: 'none', stroke: ACTORS[i.lane].color, 'stroke-width': 1.5, opacity: 0.85, 'pointer-events': 'none' })));
        const l1 = hv.ev.short, l2 = hv.ev.date + ' · ' + (hv.ev.actor === 'both' ? 'US + China' : ACTORS[hv.lane].name);
        const tw = Math.max(l1.length * 6.8, l2.length * 6.4) + 16;
        const tx = Math.max(lastML - 6, Math.min(W - MR - tw, hv.x - tw / 2));
        let ty = hv.y - 14 - 36; if (ty < TOP - 4) ty = hv.y + 14;
        const g = svg('g', { 'pointer-events': 'none' });
        g.append(svg('rect', { x: tx, y: ty, width: tw, height: 36, rx: 4, fill: 'var(--panel)', stroke: ACTORS[hv.lane].color, 'stroke-width': 1.2 }));
        g.append(T(tx + 8, ty + 15, l1, { 'font-weight': 600, 'font-size': 11.5 }));
        g.append(M(tx + 8, ty + 29, l2, { 'font-size': 11 }));
        hoverLayer.append(g);
      }

      function drawDetail() {
        const ev = byId(st.sel), list = shown(), idx = list.indexOf(ev);
        count.textContent = idx < 0 ? `no events shown (last viewed below)` : `Event ${idx + 1} / ${list.length}`;
        prevBtn.disabled = idx <= 0; nextBtn.disabled = idx < 0 || idx >= list.length - 1;
        jumpSel.value = ev.id;
        const lanes = lanesOf(ev), col = ACTORS[lanes[0]].color;
        detail.style.borderLeft = '4px solid ' + col;
        detail.innerHTML = '';
        const badge = (txt, c) => h('span', { style: { border: '1px solid ' + c, color: 'var(--ink)', background: 'color-mix(in srgb, ' + c + ' 16%, transparent)', borderRadius: '10px', padding: '1px 8px', fontSize: '11px', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' } }, txt);
        const head = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px 10px', alignItems: 'center', marginBottom: '4px' } },
          ...lanes.map(l => badge(ACTORS[l].name, ACTORS[l].color)),
          h('span', { style: { fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--muted)' } }, ev.date),
          h('span', { style: { fontSize: '12px', color: 'var(--muted)' } }, ev.kinds.map(k => KINDS[k]).join(' · ') + (ev.relaxed ? ' · relaxed' : '')),
          ev.asOf ? badge('as of ' + ev.asOf, 'var(--warn)') : null);
        const wide = W >= 560;
        const row = (k, v) => [h('span', { style: { color: 'var(--muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', paddingTop: wide ? '2px' : '4px' } }, k), h('div', { style: { lineHeight: 1.45 } }, v)];
        const grid = h('div', { style: { display: 'grid', gridTemplateColumns: wide ? '148px 1fr' : '1fr', gap: wide ? '6px 12px' : '0 0', marginTop: '6px' } },
          ...row('What changed', ev.what), ...row('Who was affected', ev.who), ...row('Industry effect / follow-up', ev.how));
        detail.append(head, h('div', { style: { fontWeight: 600, fontSize: '14.5px' } }, ev.title), grid);
        nums.innerHTML = '';
        ev.nums.forEach(([v, l]) => nums.append(h('div', { class: 'w-stat' }, h('b', null, v), h('span', null, l))));
        nums.hidden = !ev.nums.length;
      }

      // ---------- state ----------
      function ensureSel() { const list = shown(); if (!list.some(e => e.id === st.sel) && list.length) st.sel = list[0].id; }
      function select(id) {
        const ae = document.activeElement, keep = ae && ae.getAttribute && ae.getAttribute('data-ev') === id;
        st.sel = id; hoverId = null; render();
        if (keep) { const g = svgEl.querySelector('[data-ev="' + id + '"]'); if (g) g.focus({ preventScroll: true }); }
      }
      function step(d) { const list = shown(), i = list.findIndex(e => e.id === st.sel), j = i + d; if (j >= 0 && j < list.length) select(list[j].id); }
      function setPlaying(p) {
        st.playing = p; playBtn.textContent = p ? 'Pause' : 'Play walkthrough';
        if (p) { const list = shown(); if (list.length && list[list.length - 1].id === st.sel) select(list[0].id); lastTick = 0; start(); }
        else if (raf) { cancelAnimationFrame(raf); raf = 0; }
      }
      function frame(ts) {
        raf = 0; if (dead || !st.playing || !visible) return;
        if (!lastTick) lastTick = ts;
        if (ts - lastTick >= (reduced ? 4500 : 3200)) {
          lastTick = ts; const list = shown(), i = list.findIndex(e => e.id === st.sel);
          if (i >= list.length - 1) { setPlaying(false); return; }
          select(list[i + 1].id);
        }
        raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && st.playing && visible && !dead) raf = requestAnimationFrame(frame); }
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); });
      io.observe(el);

      // ---------- static explanation ----------
      const legend = h('div', { class: 'w-legend' },
        ...Object.keys(ACTORS).map(k => h('span', { class: 'w-legend-item' }, h('i', { style: { background: ACTORS[k].color, borderRadius: '50%' } }), ACTORS[k].name + ' (' + ACTORS[k].sub + ')')),
        h('span', { class: 'w-legend-item' }, legendGlyph('chips', 'var(--muted)'), 'chips'),
        h('span', { class: 'w-legend-item' }, legendGlyph('tools', 'var(--muted)'), 'tools'),
        h('span', { class: 'w-legend-item' }, legendGlyph('firms', 'var(--muted)'), 'firms & people'),
        h('span', { class: 'w-legend-item' }, legendGlyph('materials', 'var(--muted)'), 'materials'),
        h('span', { class: 'w-legend-item' }, legendGlyph('chips', 'var(--muted)', true), 'hollow = a rule relaxed or suspended'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'repeating-linear-gradient(45deg, var(--line2) 0 2px, transparent 2px 5px)' } }), 'hatched = after the module’s “as of mid-2026” knowledge'));
      const formula = h('div', { class: 'w-formula', html: 'Chip test (Oct 2022): TPP ≥ 4800 <b>and</b> interconnect ≥ 600 GB/s &nbsp;→&nbsp; (Oct 2023): TPP ≥ 4800, <b>or</b> TPP ≥ 1600 with density ≥ 5.92 TPP/mm²; gray zone TPP 2400–4800<br>Tool test (Oct 2022): logic ≤ 16/14 nm non-planar · DRAM ≤ 18 nm half-pitch · NAND ≥ 128 layers &nbsp;·&nbsp; HBM (Dec 2024): bandwidth density > 2 GB/s/mm²' });
      const note = h('div', { class: 'w-note', html: '<b>How the machinery works.</b> BIS (the Bureau of Industry and Security, US Commerce Department) writes the rules under the Export Administration Regulations (EAR); every controlled item gets an ECCN (Export Control Classification Number) and needs a licence for listed destinations or end users; the Entity List names firms that need a licence for almost everything; and the Foreign Direct Product Rule (FDPR) reaches foreign-made items built with US tools, technology or software. TPP is total processing performance, the chip metric the thresholds use. '
        + '<b>Why equipment matters:</b> manufacturing systems depend on installation, maintenance, replacement parts and process expertise as well as delivery. A licence requirement is not automatically a blanket ban: the outcome depends on the equipment, jurisdiction, destination and end user. Use the dated events as examples, not as a current guide to whether a shipment is permitted.' });

      el.append(h('div', { class: 'w-steps' }, nav, controls), svgEl, legend, detail, nums, formula, note);

      // responsive: viewBox width == CSS pixel width, so 11–12 px labels stay legible at every width
      function relayout(w) { if (dead || !w || w < 200 || Math.abs(w - W) < 2) return; W = w; render(); }
      W = Math.round(el.getBoundingClientRect().width - 36) || 700;
      render();
      const ro = new ResizeObserver(entries => {
        const w = Math.round(entries[0].contentRect.width);
        if (roRaf) cancelAnimationFrame(roRaf);
        roRaf = requestAnimationFrame(() => { roRaf = 0; relayout(w); });
      });
      ro.observe(el);
      ctx.onTheme(() => { if (!dead) render(); });
      return () => { dead = true; st.playing = false; if (raf) cancelAnimationFrame(raf); if (roRaf) cancelAnimationFrame(roRaf); ro.disconnect(); io.disconnect(); };
    }
  });
})();
