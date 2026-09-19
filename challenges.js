// Commissioning targets for the course widgets. Each check reads the widget's own readouts
// (the .w-stat rows and .w-ctl controls) inside widget-frame.html and returns true when the
// player has reached the target. Goals are written so that reaching them teaches the point.
(function () {
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  function num(s) {
    if (s == null) return NaN;
    s = String(s).replace(/[   ]/g, '').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, c => SUP[c]).replace(/−/g, '-');
    const sci = s.match(/(-?[\d.]+)\s*[×x]\s*10\^?(-?\d+)/); if (sci) return Number(sci[1]) * Math.pow(10, Number(sci[2]));
    const pow = s.match(/^\s*10\^?(-?\d+)/); if (pow) return Math.pow(10, Number(pow[1]));
    const m = s.replace(/(\d)\s+(?=\d{3}\b)/g, '$1').match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : NaN;
  }
  function stat(box, re) { for (const s of box.querySelectorAll('.w-stat')) { const sp = s.querySelector('span'); if (sp && re.test(sp.textContent)) { const b = s.querySelector('b'); return b ? b.textContent.trim() : ''; } } return null; }
  function statNum(box, re) { return num(stat(box, re)); }
  function ctl(box, re) { for (const l of box.querySelectorAll('.w-ctl')) { const sp = l.querySelector('span'); if (sp && re.test(sp.textContent)) return l.querySelector('input,select'); } return null; }
  function ctlVal(box, re) { const i = ctl(box, re); if (!i) return null; if (i.type === 'checkbox' || i.type === 'radio') return i.checked; return i.value; }
  function activeStep(box) { const dots = [...box.querySelectorAll('.w-step-dot')]; return { i: dots.findIndex(d => d.classList.contains('active')), n: dots.length }; }
  window.SG_CHALLENGE_UTILS = { num, stat, statNum, ctl, ctlVal, activeStep };
  const between = (v, a, b) => isFinite(v) && v >= a && v <= b;

  window.SG_CHALLENGES = {
    'chain-map': { goal: 'Inspect at least four stages of the chain (use the stage selector or the Next button).', check(box, u) { return u.clicks >= 4; } },
    'purity': { goal: 'Raise the purity to the electronic grade: 9N or better, which leaves at most 5 × 10¹³ foreign atoms per cm³.', check(box, u) { return Number(u.ctlVal(box, /purity/i)) >= 9; } },
    'cz-puller': { goal: 'Slow the crucible rotation until the interstitial oxygen is 11 ppma or less, and keep the body pull rate at 1.0 mm/min or below.', check(box, u) { const o = u.statNum(box, /oxygen/i); const v = Number(u.ctlVal(box, /pull rate/i)); return { done: o <= 11 && v <= 1.0, detail: `oxygen ${o} ppma, pull ${v} mm/min` }; } },
    'wafer-slicing': { goal: 'Ship at least 1,850 wafers from this ingot by thinning the slice and the kerf.', check(box, u) { const w = u.statNum(box, /wafers shipped/i); return { done: w >= 1850, detail: `${w} wafers` }; } },
    'deal-grove': { goal: 'Grow a 500 nm field oxide (475–525 nm) in steam, and notice how much silicon it eats.', check(box, u) { const x = u.statNum(box, /oxide thickness/i); const wet = String(u.ctlVal(box, /ambient/i)) === 'wet'; return { done: wet && between(x, 475, 525), detail: `${x} nm ${wet ? 'wet' : 'dry'}` }; } },
    'ald-cycle': { goal: 'Plan a high-k gate dielectric: select HfO₂ and a 1.8 nm target, then read how many self-limiting cycles it takes.', check(box, u) { return String(u.ctlVal(box, /film/i)) === 'HfO2' && Math.abs(Number(u.ctlVal(box, /target/i)) - 1.8) < 0.05; } },
    'rayleigh': { goal: 'Print a 26 nm pitch in a single exposure. Find the source and k1 that get there.', check(box, u) { const p = u.statNum(box, /pitch = 2/i); return { done: p <= 26, detail: `${p} nm pitch` }; } },
    'sadp': { goal: 'Step through the whole spacer sequence (mandrel litho → spacer ALD → etch-back → mandrel pull) to the last step and read the final pitch.', check(box, u) { const s = u.activeStep(box); return { done: s.n > 0 && s.i === s.n - 1, detail: `step ${s.i + 1}/${s.n}` }; } },
    'euv-source': { goal: 'Reach the NXE:3800E point: 220 wafers per hour at 30 mJ/cm² with 500 W or more at the intermediate focus. Then push the source higher and notice that past ~500 W the ~12 s of stage overhead per wafer, not the source, is the limit.', check(box, u) { return Number(u.ctlVal(box, /throughput/i)) >= 220 && Number(u.ctlVal(box, /power/i)) >= 500; } },
    'resist-chemistry': { goal: 'Keep the acid diffusion blur (edge blur) at 6 nm or less by adjusting the post-exposure bake.', check(box, u) { const L = u.statNum(box, /diffusion length/i); return { done: L <= 6, detail: `${L} nm blur` }; } },
    'litho-track': { goal: 'Coat a 90–110 nm ArF resist while holding the takt time at 13 s or less, the pace of a 275–300 wph scanner.', check(box, u) { const t = u.statNum(box, /resist thickness/i); const k = u.statNum(box, /takt/i); return { done: between(t, 90, 110) && k <= 13, detail: `${t} nm, ${k} s` }; } },
    'etch-profile': { goal: 'Carve a fin: anisotropy of 0.97 or better with a film-to-mask selectivity of at least 15:1.', check(box, u) { const a = u.statNum(box, /anisotropy/i); const s = u.statNum(box, /selectivity/i); return { done: a >= 0.97 && s >= 15, detail: `A ${a}, ${s}:1` }; } },
    'plasma-reactor': { goal: 'Get at least half of the ions to the wafer without a collision in the sheath.', check(box, u) { const p = u.statNum(box, /unscattered/i); return { done: p >= 50, detail: `${p}% unscattered` }; } },
    'implant-profile': { goal: 'Make a shallow source/drain extension: junction depth after anneal of 30 nm or less.', check(box, u) { const x = u.statNum(box, /xj.*after anneal/i); return { done: x <= 30, detail: `xj′ ${x} nm` }; } },
    'implanter-beamline': { goal: 'Set up a low-energy boron implant: species B with a final ion energy of 10 keV or less.', check(box, u) { const e = u.statNum(box, /final ion energy/i); const sp = String(u.ctlVal(box, /species/i)); return { done: sp === 'B' && e <= 10, detail: `${sp} at ${e} keV` }; } },
    'mosfet-iv': { goal: 'Reach an Ion/Ioff ratio of at least 10⁶ at VDD = 0.7 V.', check(box, u) { const r = u.statNum(box, /Ion \/ Ioff/i); return { done: r >= 1e6, detail: `Ion/Ioff ${r.toExponential(1)}` }; } },
    'transistor-evolution': { goal: 'Pick the architecture in which the gate wraps all four sides of the channel.', check(box, u) { return u.statNum(box, /gated sides/i) >= 4; } },
    'damascene': { goal: 'Find the drawn line width at which the barrier and liner take up half or more of the wire.', check(box, u) { const p = u.statNum(box, /TaN/i); return { done: p >= 50, detail: `${p}% barrier+liner` }; } },
    'cmp-planarize': { goal: 'Clear the copper in 40 seconds or less (Preston: rate scales with pressure × speed).', check(box, u) { const t = u.statNum(box, /time to clear/i); return { done: t <= 40, detail: `${t} s to clear` }; } },
    'yield-calculator': { goal: 'Get at least 40 perfect H100-size dies per wafer. Only one input can do it.', check(box, u) { const d = u.statNum(box, /perfect dies/i); return { done: d >= 40, detail: `${d} perfect dies` }; } },
    'wafer-sort-sim': { goal: 'Bring the sort cost per good die down to $20 or less.', check(box, u) { const c = u.statNum(box, /sort cost per good die/i); return { done: c <= 20, detail: `$${c} per good die` }; } },
    'fab-anatomy': { goal: 'Set the ISO class explorer to the class that allows at most 3,520 particles of 0.5 µm per m³.', check(box, u) { const p = u.statNum(box, /0\.5 µm per m³/i); return { done: p <= 3520 && p > 0, detail: `${p} per m³` }; } },
    'amhs-sim': { goal: 'Bring the fab cycle time down to 60 days or less.', check(box, u) { const c = u.statNum(box, /cycle time \(/i); return { done: c <= 60, detail: `${c} days` }; } },
    'fab-flow': { goal: 'Scrub the flow until the first metal level exists (the BEOL has started).', check(box, u) { return u.statNum(box, /metal levels/i) >= 1; } },
    'hbm-stack': { goal: 'Build a 12-high stack that fits under the 720 µm JEDEC ceiling.', check(box, u) { const h = String(u.ctlVal(box, /stack height/i)); const s = u.statNum(box, /JEDEC/i); return { done: h === '12' && s <= 720, detail: `${h}-high, ${s} µm` }; } },
    'dram-cell': { goal: 'Raise the read signal to 140 mV or more (the course\'s worked value), comfortably above the sense amplifier\'s ~20–40 mV offset, and note whether you did it with the cell capacitor or with a shorter bit line.', check(box, u) { const v = u.statNum(box, /read signal/i); return { done: v >= 140, detail: `${v} mV` }; } },
    'nand-3d-build': { goal: 'Build a stack with at least 300 active word lines.', check(box, u) { const w = u.statNum(box, /active word lines/i); return { done: w >= 300, detail: `${w} word lines` }; } },
    'cowos-flow': { goal: 'Push the probability that a package is good to 97% or higher.', check(box, u) { const p = u.statNum(box, /P\(package good\)/i); return { done: p >= 97, detail: `${p}%` }; } },
    'hybrid-bond': { goal: 'Reach 100,000 connections per mm² or more by shrinking the pad pitch (that is the ~3 µm, 2030+ roadmap pitch; today\'s ~6 µm gives ~28,000).', check(box, u) { const c = u.statNum(box, /connections per mm²/i); return { done: c >= 100000, detail: `${c} /mm²` }; } },
    'package-xsection': { goal: 'Keep the corner bump strain at 30% or less for the CoWoS-S package at ΔT = 190 °C.', check(box, u) { const s = u.statNum(box, /strain/i); return { done: s <= 30, detail: `${s}% strain` }; } },
    'test-cost': { goal: 'Bring the defect level below 0.05% (500 DPPM).', check(box, u) { const d = u.statNum(box, /defect level/i); return { done: d < 0.05, detail: `${d}%` }; } },
    'yield-cascade': { goal: 'Reproduce the course\'s 0.95 × 0.6 × 0.98 × 0.97 ≈ 0.54, then find the one term that moves the product most (die yield).', check(box, u) { const y = u.statNum(box, /compounded yield/i); const sort = Number(u.ctlVal(box, /wafer sort/i)); return { done: between(y, 52, 56), detail: `${y}% at sort ${sort}%` }; } },
    'heat-path': { goal: 'Hold the junction at 75 °C or less while the GPU draws 1,200 W or more.', check(box, u) { const t = u.statNum(box, /junction temperature/i); const p = Number(u.ctlVal(box, /GPU power/i)); return { done: t <= 75 && p >= 1200, detail: `${t} °C at ${p} W` }; } },
    'nvlink-topology': { goal: 'Enable the bisection cut and read the bandwidth between the two halves of the rack.', check(box, u) { return u.ctlVal(box, /bisection/i) === true; } },
    'rack-explorer': { goal: 'Step through all six levels, from one package to a 100 MW hall.', check(box, u) { const s = u.activeStep(box); return { done: s.n > 0 && s.i === s.n - 1, detail: `step ${s.i + 1}/${s.n}` }; } },
    'gpu-bom': { goal: 'On the H100 preset, find the line that is 40–50% of the bill (HBM) and the line that is only ~10% (the die), then get the modeled total under $3,000.', check(box, u) { const c = u.statNum(box, /modeled component cost/i); return { done: c <= 3000, detail: `$${c}` }; } },
    'wafer-price': { goal: 'Set utilization to 50% or less and read what price the fab now needs per wafer.', check(box, u) { return Number(u.ctlVal(box, /utilization/i)) <= 50; } },
    'node-table': { goal: 'Set an N2-class cell: CPP 45 nm or less and metal pitch 25 nm or less.', check(box, u) { return Number(u.ctlVal(box, /^CPP/i)) <= 45 && Number(u.ctlVal(box, /metal pitch/i)) <= 25; } },
    'moores-law': { goal: 'Set the doubling period to the best-fit value (about 2 years; the fit here lands at 2.1).', check(box, u) { return Math.abs(Number(u.ctlVal(box, /doubling/i)) - 2.1) <= 0.1; } },
    'euv-stochastics': { goal: 'Bring the expected dead contacts per die (10¹⁰ contacts) below 0.1, a failure rate of 10⁻¹¹ per contact. Ten dead contacts is a dead die; watch what it costs in dose.', check(box, u) { const d = u.statNum(box, /dead contacts/i); return { done: d < 0.1, detail: `${d} dead per die` }; } },
    'bragg-mirror': { goal: 'Find a stack of 30 bilayers or fewer that still reflects 60% or more at 13.5 nm.', check(box, u) { const n = Number(u.ctlVal(box, /bilayers/i)); const r = u.statNum(box, /R at 13\.5/i); return { done: n <= 30 && r >= 60, detail: `${n} pairs, ${r}%` }; } },
    'upw-mask-cost': { goal: 'Cut the fresh-water intake below 5,000 m³ per day by raising reclaim and cutting the water used per wafer.', check(box, u) { const f = u.statNum(box, /fresh-water intake/i); return { done: f < 5000, detail: `${f} m³/day` }; } },
    'scale-ladder': { goal: 'Compare two objects at least nine decades apart.', check(box, u) { return u.statNum(box, /decades apart/i) >= 9; } },
    'export-timeline': { goal: 'Visit at least four events on the timeline.', check(box, u) { return u.clicks >= 4; } },
    'geo-share': { goal: 'Look at three countries or regions.', check(box, u) { return u.clicks >= 3; } },
    'glossary-flashcards': { goal: 'Work through five cards.', check(box, u) { return u.clicks >= 10; } }
  };
})();
