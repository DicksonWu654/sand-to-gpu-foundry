/* Widget: implant-profile — "Ion Implant Range Calculator" (Module 10) */
(function () {
  'use strict';
  const K_EV = 8.617333e-5; // Boltzmann constant, eV/K
  const Q_E = 1.602e-19;    // C

  // Rp / ΔRp (nm) versus energy (keV): 8-point LSS/SRIM-typical tables per ion, log-log interpolated, anchored to the
  // module's table (B 10 keV ≈ 37/17, 30 keV ≈ 100/35, 100 keV ≈ 300/65; P 30 ≈ 40/18, 100 ≈ 125/45; As 10 ≈ 10/4,
  // 50 ≈ 32/12, 100 ≈ 58/20; Ge 20 ≈ 17/7). BF₂⁺ is boron delivered at 11/49 of the molecular energy (30 keV → 6.7 keV ≈ 25/12).
  const TABLES = {
    B: [[0.5, 3, 2], [1, 5, 3], [3, 12, 7], [10, 37, 17], [30, 100, 35], [100, 300, 65], [300, 870, 130], [500, 1430, 180]],
    P: [[0.5, 1.2, 0.6], [1, 2.2, 1], [3, 5, 2.4], [10, 14, 6.5], [30, 40, 18], [100, 125, 45], [300, 340, 110], [500, 540, 165]],
    As: [[0.5, 1.2, 0.5], [1, 1.8, 0.8], [3, 3.8, 1.5], [10, 10, 4], [30, 22, 8], [100, 58, 20], [300, 141, 52], [500, 214, 81]],
    Ge: [[0.5, 1.1, 0.4], [1, 1.5, 0.7], [3, 3.7, 1.4], [10, 9.7, 3.9], [30, 23.8, 9.1], [100, 62.6, 26], [300, 152, 68], [500, 231, 105]],
    Sb: [[0.5, 1, 0.3], [1, 1.3, 0.5], [3, 2.6, 0.9], [10, 6.8, 2.4], [30, 16.5, 5.6], [100, 43.5, 16], [300, 106, 42], [500, 161, 65]],
  };
  // Intrinsic diffusivity D = D₀·exp(−Ea/kT), cm²/s (Fair 1981 / Plummer): B 0.76/3.46 (→ 1.5×10⁻¹⁴ at 1 000 °C, the
  // module's ~2×10⁻¹⁴), P 3.85/3.66, As 0.066/3.44, Sb 0.214/3.65; Ge ≈ Si self-diffusion 560/4.76 (Bracht), approximate.
  // sol = solid solubility near 1 000 °C (cm⁻³); amorph = room-temperature amorphisation threshold dose (cm⁻², module §6).
  const SPECIES = {
    B: { label: '¹¹B⁺ boron', ion: '¹¹B⁺', name: 'boron', type: 'p', D0: 0.76, Ea: 3.46, sol: 2e20, amorph: 2e16 },
    BF2: { label: '⁴⁹BF₂⁺ (B at 11/49 E)', ion: '⁴⁹BF₂⁺', name: 'boron', type: 'p', base: 'B', eff: 11 / 49, D0: 0.76, Ea: 3.46, sol: 2e20, amorph: 3e14 },
    P: { label: '³¹P⁺ phosphorus', ion: '³¹P⁺', name: 'phosphorus', type: 'n', D0: 3.85, Ea: 3.66, sol: 1e21, amorph: 7e14 },
    As: { label: '⁷⁵As⁺ arsenic', ion: '⁷⁵As⁺', name: 'arsenic', type: 'n', D0: 0.066, Ea: 3.44, sol: 2e21, amorph: 2e14 },
    Ge: { label: '⁷⁴Ge⁺ (PAI, not a dopant)', ion: '⁷⁴Ge⁺', name: 'germanium', type: 'none', D0: 560, Ea: 4.76, sol: Infinity, amorph: 2e14 },
    Sb: { label: '¹²¹Sb⁺ antimony', ion: '¹²¹Sb⁺', name: 'antimony', type: 'n', D0: 0.214, Ea: 3.65, sol: 5e19, amorph: 2e14 },
  };
  const MOB_N = [[1e15, 1350], [1e16, 1200], [1e17, 800], [1e18, 300], [1e19, 120], [1e20, 90], [1e21, 60]];
  const MOB_P = [[1e15, 480], [1e16, 420], [1e17, 300], [1e18, 150], [1e19, 80], [1e20, 55], [1e21, 40]];
  const TIMES = [1, 2, 5, 10, 20, 30, 60, 120, 300, 600, 1200, 1800, 3600]; // anneal time slider stops (s)
  const PRESETS = [['Spike 1 050 °C · 1 s', 1050, 0, 'spike'], ['RTA 1 000 °C · 10 s', 1000, 3, 'rta'], ['Furnace 900 °C · 30 min', 900, 11, 'furnace']];
  const NICE = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

  function loglogInterp(tbl, x, xi, yi) {
    if (x <= tbl[0][xi]) return tbl[0][yi];
    if (x >= tbl[tbl.length - 1][xi]) return tbl[tbl.length - 1][yi];
    for (let i = 0; i < tbl.length - 1; i++) {
      const a = tbl[i], b = tbl[i + 1];
      if (x >= a[xi] && x <= b[xi]) {
        const t = (Math.log(x) - Math.log(a[xi])) / (Math.log(b[xi]) - Math.log(a[xi]));
        return Math.exp(Math.log(a[yi]) + t * (Math.log(b[yi]) - Math.log(a[yi])));
      }
    }
    return tbl[tbl.length - 1][yi];
  }
  const lookupRange = (tbl, E) => ({ rp: loglogInterp(tbl, E, 0, 1), drp: loglogInterp(tbl, E, 0, 2) });
  const mobility = (tbl, N) => loglogInterp(tbl, N, 0, 1);
  const diffusivity = (meta, T) => meta.D0 * Math.exp(-meta.Ea / (K_EV * (T + 273.15)));
  // slider value is log10(x); snap 10^v onto a 1-1.2-1.5-2-2.5-3-4-5-6-8 series so round numbers (10 keV, 10¹⁵) are reachable
  const snapLog = v => { const e = Math.floor(v + 1e-9); const m = Math.pow(10, v - e); let best = 1; for (const n of NICE) if (Math.abs(n - m) < Math.abs(best - m)) best = n; return best * Math.pow(10, e); };
  const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
  const sup = e => String(e).replace(/[-0-9]/g, c => SUP[c]);
  const sci = (n, d = 1) => { if (!isFinite(n) || n <= 0) return '0'; let e = Math.floor(Math.log10(n)); let m = n / Math.pow(10, e); if (+m.toFixed(d) >= 10) { m /= 10; e++; } const ms = +m.toFixed(d); return (ms === 1 ? '' : ms + '×') + '10' + sup(e); };
  const fmtT = s => s < 60 ? s + ' s' : (s / 60) + ' min';

  window.registerWidget('implant-profile', {
    title: 'Ion Implant Range Calculator',
    caption: 'Pick an ion, energy, dose and anneal. Notice where the dopant stops (Rp ± ΔRp), where its bell curve crosses the background doping to make a p-n junction, and how little a hot, short anneal moves it.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const fmtNm = x => x < 100 ? fmt(x, 1) + ' nm' : x < 1000 ? fmt(x, 0) + ' nm' : fmt(x / 1000, 2) + ' µm';
      const st = { species: 'B', eLog: 1, dLog: 15, bLog: 18, T: 1050, tIdx: 0 }; // the module's worked example
      const uid = 'ipf' + Math.floor(Math.random() * 1e6);

      const speciesSel = h('select', { 'data-k': 'species', style: { minWidth: 0, width: '100%' } }, ...Object.keys(SPECIES).map(k => h('option', { value: k }, SPECIES[k].label)));
      speciesSel.value = st.species;
      const eIn = h('input', { type: 'range', 'data-k': 'energy', min: -0.3, max: 2.7, step: 0.1, value: st.eLog });
      const dIn = h('input', { type: 'range', 'data-k': 'dose', min: 11, max: 16, step: 0.1, value: st.dLog });
      const bIn = h('input', { type: 'range', 'data-k': 'background', min: 15, max: 18, step: 0.1, value: st.bLog });
      const tempIn = h('input', { type: 'range', 'data-k': 'temp', min: 800, max: 1100, step: 10, value: st.T });
      const timeIn = h('input', { type: 'range', 'data-k': 'time', min: 0, max: TIMES.length - 1, step: 1, value: st.tIdx });
      const eOut = h('output'), dOut = h('output'), bOut = h('output'), tempOut = h('output'), timeOut = h('output');
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Ion species'), speciesSel),
        h('label', { class: 'w-ctl' }, h('span', null, 'Energy'), eIn, eOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Dose'), dIn, dOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Background doping'), bIn, bOut));
      const presetBtns = PRESETS.map(p => h('button', { class: 'w-btn', type: 'button', 'data-preset': p[3], on: { click: () => { st.T = p[1]; st.tIdx = p[2]; tempIn.value = st.T; timeIn.value = st.tIdx; render(); } } }, p[0]));
      const presetRow = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', margin: '8px 0 2px' } }, h('span', { style: { color: 'var(--muted)', fontSize: '12.5px' } }, 'Anneal presets:'), ...presetBtns);
      const annealCtl = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Anneal temperature'), tempIn, tempOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Anneal time'), timeIn, timeOut));

      const formula = h('div', { class: 'w-formula', html:
        'N(x) = Φ/(√2π·ΔR<sub>p</sub>) · exp[−(x−R<sub>p</sub>)²/2ΔR<sub>p</sub>²] &nbsp;·&nbsp; x<sub>j</sub> = R<sub>p</sub> + ΔR<sub>p</sub>·√(2·ln(N<sub>p</sub>/N<sub>B</sub>)) &nbsp;·&nbsp; ΔR<sub>p</sub>′ = √(ΔR<sub>p</sub>² + 2Dt) &nbsp;·&nbsp; D = D₀·exp(−E<sub>a</sub>/kT) &nbsp;·&nbsp; R<sub>s</sub> = 1/(q·∫N<sub>active</sub>·μ·dx)' });

      const stat = (b, sub) => h('div', { class: 'w-stat' }, b, sub);
      const stRp = h('b'), stDrp = h('b'), stPeak0 = h('b'), stXj0 = h('b'), stD = h('b'), stLd = h('b'), stDrp2 = h('b'), stPeak1 = h('b'), stXj1 = h('b'), stRs = h('b');
      const subPeak0 = h('span'), subXj0 = h('span'), subXj1 = h('span'), subD = h('span'), subRs = h('span');
      const readout = h('div', { class: 'w-readout' },
        stat(stRp, h('span', { html: 'projected range R<sub>p</sub> (mean depth)' })),
        stat(stDrp, h('span', { html: 'straggle ΔR<sub>p</sub> (std. deviation)' })),
        stat(stPeak0, subPeak0),
        stat(stXj0, subXj0));
      const readout2 = h('div', { class: 'w-readout' },
        stat(stD, subD), stat(stLd, h('span', null, '√(Dt) diffusion length')),
        stat(stDrp2, h('span', { html: 'ΔR<sub>p</sub>′ after anneal' })),
        stat(stPeak1, h('span', null, 'peak after anneal')),
        stat(stXj1, subXj1), stat(stRs, subRs));

      const D = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Wafer cross-section and dopant concentration versus depth', style: { cursor: 'crosshair', touchAction: 'pan-y' } });
      const legend = h('div', { class: 'w-legend' },
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent2)' } }), 'as implanted'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent)' } }), 'after anneal (dashed = unchanged)'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--muted)' } }), 'background doping / solid solubility'));
      const hoverOut = h('div', { style: { fontSize: '12.5px', color: 'var(--muted)', margin: '2px 0 6px', fontVariantNumeric: 'tabular-nums' } });
      const explain = h('div', { style: { fontSize: '13.5px', lineHeight: '1.5', margin: '4px 0 6px' } });
      const note = h('div', { class: 'w-note', html: 'Approximations: R<sub>p</sub>/ΔR<sub>p</sub> are log-log interpolated from 8-point LSS/SRIM-typical tables; the profile is a symmetric Gaussian (real boron has a tail toward the surface, heavy ions a tail into the bulk, and channeling adds a deep tail this model ignores). The anneal adds only equilibrium Gaussian broadening: transient enhanced diffusion (TED), which can add tens of nm at 700–950 °C, is not modeled. Sheet resistance counts the dose up to the solid-solubility ceiling as active, with a simple mobility-vs-concentration table.' });

      let W = 660, last = null;
      const hoverG = svg('g', { 'pointer-events': 'none' });

      function render() {
        const meta = SPECIES[st.species];
        const E = snapLog(st.eLog), dose = snapLog(st.dLog), Nb = snapLog(st.bLog);
        const T = st.T, tSec = TIMES[st.tIdx];
        const Es = (E < 10 ? fmt(E, 1) : fmt(E, 0)) + ' keV';
        eOut.textContent = Es; dOut.textContent = sci(dose) + ' cm⁻²'; bOut.textContent = sci(Nb) + ' cm⁻³';
        tempOut.textContent = fmt(T, 0) + ' °C'; timeOut.textContent = fmtT(tSec);
        presetBtns.forEach((b, i) => b.classList.toggle('primary', PRESETS[i][1] === T && PRESETS[i][2] === st.tIdx));

        // ---- physics ----
        const tbl = TABLES[meta.base || st.species];
        const { rp, drp } = lookupRange(tbl, meta.eff ? E * meta.eff : E);
        const gauss = (sig, pk) => x => pk * Math.exp(-((x - rp) ** 2) / (2 * sig * sig));
        const peak0 = dose / (Math.sqrt(2 * Math.PI) * drp * 1e-7);
        const Dc = diffusivity(meta, T);                       // cm²/s
        const Ld = Math.sqrt(Dc * tSec) * 1e7;                 // √(Dt), nm
        const drp2 = Math.sqrt(drp * drp + 2 * Dc * tSec * 1e14);
        const peak1 = dose / (Math.sqrt(2 * Math.PI) * drp2 * 1e-7);
        const N0 = gauss(drp, peak0), N1 = gauss(drp2, peak1);
        const isDopant = meta.type !== 'none';
        const xjOf = (sig, pk) => isDopant && pk > Nb ? rp + sig * Math.sqrt(2 * Math.log(pk / Nb)) : null;
        const xj0 = xjOf(drp, peak0), xj1 = xjOf(drp2, peak1);
        const broadened = drp2 / drp > 1.02;
        const amorph = dose >= meta.amorph, aDepth = rp + 2 * drp;
        const overSol = peak0 > meta.sol;
        let Rs = null, activeFrac = 1;
        if (isDopant) { // sheet conductance of the annealed profile, concentration capped at solid solubility
          const mobT = meta.type === 'n' ? MOB_N : MOB_P, n = 400, x0 = rp - 6 * drp2, dx = 12 * drp2 / n;
          let G = 0, Qa = 0;
          for (let i = 0; i <= n; i++) { const c = Math.min(N1(x0 + i * dx), meta.sol); const w = (i === 0 || i === n ? 0.5 : 1) * dx * 1e-7; G += w * c * mobility(mobT, c); Qa += w * c; }
          Rs = 1 / (Q_E * G); activeFrac = Math.min(1, Qa / dose);
        }

        // ---- readouts ----
        stRp.textContent = fmtNm(rp); stDrp.textContent = fmtNm(drp);
        stPeak0.textContent = sci(peak0) + ' cm⁻³';
        subPeak0.innerHTML = overSol ? 'peak N<sub>p</sub> — above ' + meta.name + ' solubility ' + sci(meta.sol) : 'peak concentration N<sub>p</sub>, as implanted';
        subPeak0.style.color = overSol ? 'var(--warn)' : '';
        stXj0.textContent = !isDopant ? 'n/a' : xj0 ? fmtNm(xj0) : 'none';
        subXj0.innerHTML = !isDopant ? 'no junction: Ge is not a dopant' : xj0 ? 'junction depth x<sub>j</sub>, as implanted' : 'no junction: peak below background';
        stD.textContent = sci(Dc) + ' cm²/s'; subD.textContent = 'diffusivity D at ' + fmt(T, 0) + ' °C';
        stLd.textContent = fmtNm(Ld); stDrp2.textContent = fmtNm(drp2); stPeak1.textContent = sci(peak1) + ' cm⁻³';
        stXj1.textContent = !isDopant ? 'n/a' : xj1 ? fmtNm(xj1) : 'none';
        subXj1.innerHTML = !isDopant ? 'no junction: Ge is not a dopant' : xj1 ? 'junction depth x<sub>j</sub>′ after anneal' : 'no junction: peak below background';
        stRs.textContent = !isDopant ? 'n/a' : Rs > 1e4 ? sci(Rs) + ' Ω/sq' : fmt(Rs, 0) + ' Ω/sq';
        subRs.innerHTML = !isDopant ? 'sheet resistance: not a dopant' : 'sheet resistance R<sub>s</sub>' + (activeFrac < 0.995 ? ' (' + Math.round(activeFrac * 100) + ' % active, capped at solubility)' : ' (fully active)');

        // ---- explanation ----
        const bgName = !isDopant ? 'substrate' : meta.type === 'p' ? 'n-type well' : 'p-type well';
        let ex = `${meta.ion} at ${Es} stops ${fmtNm(rp)} deep on average (R<sub>p</sub>) with a ±${fmtNm(drp)} spread (ΔR<sub>p</sub>), so the ${sci(dose)} cm⁻² dose peaks at ${sci(peak0)} cm⁻³. `;
        if (!isDopant) ex += 'Germanium has four valence electrons like silicon, so it neither donates nor accepts an electron and no junction forms. ' + (amorph ? `At this dose the collision damage turns the top ${fmtNm(aDepth)} (≈ R<sub>p</sub> + 2ΔR<sub>p</sub>) amorphous, which is the point of a pre-amorphisation implant (PAI): the anneal regrows that layer as crystal and any dopant in it lands on lattice sites.` : `Below ~${sci(meta.amorph)} cm⁻² the damage does not overlap enough to amorphise the surface, so this dose is too low to serve as a PAI.`);
        else if (xj0) ex += `That is above the ${sci(Nb)} cm⁻³ ${bgName}, so the silicon flips type where the curve meets the background: a p-n junction ${fmtNm(xj0)} down. ` + (broadened ? `${fmt(T, 0)} °C for ${fmtT(tSec)} (√(Dt) = ${fmtNm(Ld)}) widens ΔR<sub>p</sub> to ${fmtNm(drp2)} and ${xj1 ? `moves the junction to ${fmtNm(xj1)}` : 'spreads the dose so thin that the peak drops below the background and the junction disappears'}.` : `${fmt(T, 0)} °C for ${fmtT(tSec)} gives √(Dt) = ${fmtNm(Ld)}, too small to move it: this anneal only repairs damage and activates the dopant.`);
        else ex += `That is below the ${sci(Nb)} cm⁻³ ${bgName}, so the wafer never changes type and no junction forms; a dose this light only trims the doping level (a threshold-voltage adjust, not a source/drain).`;
        if (overSol) ex += ` The peak is above ${meta.name}'s solid solubility (~${sci(meta.sol)} cm⁻³ near 1 000 °C), so only about ${Math.round(activeFrac * 100)} % of the dose can be electrically active after this anneal.`;
        explain.innerHTML = ex;

        // ---- drawing: 1 viewBox unit = 1 CSS px, so text is exactly FS px at any width ----
        const narrow = W < 480, FS = narrow ? 12 : 13, MONO = 'var(--mono)', SANS = 'var(--sans)';
        const H = narrow ? 340 : 368;
        const PX0 = narrow ? 58 : 68, PX1 = W - (narrow ? 16 : 20);
        const SY0 = narrow ? 24 : 26, SY1 = SY0 + (narrow ? 28 : 32), TOPY = SY0 - 8;
        const PY0 = SY1 + 22, PY1 = H - (narrow ? 54 : 58);
        D.setAttribute('viewBox', `0 0 ${W} ${H}`);
        D.innerHTML = '';
        const lp0 = Math.log10(peak0), lp1 = Math.log10(peak1), lNb = Math.log10(Nb), lSol = Math.log10(meta.sol);
        const yMin = Math.max(13, Math.floor(Math.min(lp0, lNb)) - 1);
        const yMax = Math.max(Math.max(lp0, lNb) + 0.4, yMin + 2);
        const floorX = sig => rp + sig * Math.sqrt(2 * Math.LN10 * Math.max(0.2, (sig === drp ? lp0 : lp1) - yMin));
        const xMax = Math.max(floorX(drp), floorX(drp2), (xj1 || xj0 || 0) * 1.15, amorph ? aDepth * 1.2 : 0) * 1.04;
        const xOf = x => PX0 + (PX1 - PX0) * x / xMax;
        const yOf = l => PY1 - (PY1 - PY0) * (l - yMin) / (yMax - yMin);
        const text = (x, y, s, anchor, o = {}) => svg('text', Object.assign({ x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': anchor || 'start', 'font-family': o.mono ? MONO : SANS, 'font-size': FS, fill: o.fill || 'var(--ink)' },
          o.halo === false ? {} : { stroke: 'var(--panel)', 'stroke-width': 3, 'paint-order': 'stroke', 'stroke-linejoin': 'round' }, o.rot ? { transform: `rotate(-90 ${x.toFixed(1)} ${y.toFixed(1)})` } : {}), s);
        // collision-checked label placement: try candidates in order, skip a label that fits nowhere
        const placed = [], curvePts = [];
        const estW = (s, mono) => Array.from(s).length * FS * (mono ? 0.64 : 0.6);
        const rectOf = (x, y, w, a) => { const x0 = a === 'end' ? x - w : a === 'middle' ? x - w / 2 : x; return [x0, y - FS * 0.95, x0 + w, y + FS * 0.25]; };
        const hits = (r, z) => {
          if (r[0] < z[0] || r[2] > z[2] || r[1] < z[1] || r[3] > z[3]) return true;
          for (const p of placed) if (r[0] < p[2] && r[2] > p[0] && r[1] < p[3] && r[3] > p[1]) return true;
          for (const c of curvePts) if (c[0] > r[0] - 1 && c[0] < r[2] + 1 && c[1] > r[1] - 1 && c[1] < r[3] + 1) return true;
          return false;
        };
        const ZTOP = [2, 2, W - 2, SY0 - 2], ZSTRIP = [PX0 + 1, SY0 + 1, PX1 - 1, SY1 - 1], ZPLOT = [PX0 - 4, SY1 + 3, PX1 + 4, PY1 - 1];
        const label = (texts, cands, zone, o = {}) => { // texts: string or [long, shorter, ...]; a candidate may carry its own zone as 4th item
          for (const s of [].concat(texts)) { const w = estW(s, o.mono); for (const c of cands) { const r = rectOf(c[0], c[1], w, c[2]); if (!hits(r, c[3] || zone)) { placed.push(r); D.append(text(c[0], c[1], s, c[2], o)); return true; } } }
          return false;
        };
        const block = (x0, y0, x1, y1) => placed.push([Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)]);

        // -- wafer cross-section strip --
        D.append(svg('rect', { x: PX0, y: SY0, width: PX1 - PX0, height: SY1 - SY0, fill: 'var(--panel2)', stroke: 'var(--line2)', 'stroke-width': 1 }));
        const NB = narrow ? 50 : 100, bw = (PX1 - PX0) / NB;
        for (let i = 0; i < NB; i++) { const a = N0(xMax * (i + 0.5) / NB) / peak0; if (a < 0.012) continue; D.append(svg('rect', { x: (PX0 + i * bw).toFixed(1), y: SY0 + 1, width: (bw + 0.6).toFixed(1), height: SY1 - SY0 - 2, fill: 'var(--accent2)', opacity: (0.06 + 0.74 * a).toFixed(2) })); }
        if (amorph) {
          const xa = xOf(aDepth);
          D.append(svg('pattern', { id: uid, width: 6, height: 6, patternUnits: 'userSpaceOnUse' }, svg('path', { d: 'M0 6L6 0M-1 1L1 -1M5 7L7 5', stroke: 'var(--si)', 'stroke-width': 1.2 })));
          D.append(svg('rect', { x: PX0, y: SY0 + 1, width: xa - PX0, height: SY1 - SY0 - 2, fill: `url(#${uid})` }));
          D.append(svg('line', { x1: xa, y1: SY0, x2: xa, y2: SY1, stroke: 'var(--si)', 'stroke-width': 2 }));
        }
        D.append(svg('line', { x1: PX0, y1: SY0 - 3, x2: PX0, y2: SY1 + 3, stroke: 'var(--ink)', 'stroke-width': 2.5 })); // wafer surface
        [SY0 + 6, (SY0 + SY1) / 2, SY1 - 6].forEach(y => { // incoming ions
          D.append(svg('line', { x1: PX0 - 40, y1: y, x2: PX0 - 11, y2: y, stroke: 'var(--accent2)', 'stroke-width': 2 }));
          D.append(svg('polygon', { points: `${PX0 - 5},${y} ${PX0 - 12},${y - 4} ${PX0 - 12},${y + 4}`, fill: 'var(--accent2)' }));
        });
        label(narrow ? `${meta.ion} ${Es}` : `${meta.ion} ions, ${Es}`, [[4, TOPY, 'start']], ZTOP, { halo: false });
        label(narrow ? `${bgName.split('-')[0]}-type ${sci(Nb)}` : `${bgName} ${sci(Nb)} cm⁻³`, [[PX1, TOPY, 'end']], ZTOP, { halo: false });
        const ySt = (SY0 + SY1) / 2 + FS * 0.35;
        const impTxt = narrow ? 'implanted' : 'implanted layer';
        const impTop = label(impTxt, [[xOf(rp), TOPY, 'middle'], [xOf(rp) + 4, TOPY, 'start'], [xOf(rp) - 4, TOPY, 'end']], ZTOP, { halo: false });
        const xjS = xj1 || xj0;
        if (xjS) {
          const xs = xOf(xjS), ym = ySt;
          D.append(svg('line', { x1: xs, y1: SY0, x2: xs, y2: SY1, stroke: 'var(--accent)', 'stroke-width': 2.5 }));
          block(xs - 2, SY0, xs + 2, SY1);
          label(narrow ? 'junction' : 'p-n junction', [[xs + 6, ym, 'start'], [xs - 6, ym, 'end']], ZSTRIP);
        }
        if (amorph) label([`amorphous 0–${fmt(aDepth, 0)} nm`, 'amorphous'], [[(PX0 + xOf(aDepth)) / 2, ySt, 'middle']], ZSTRIP);
        if (!impTop) label(impTxt, [[xOf(rp), ySt, 'middle'], [PX0 + 6, ySt, 'start']], ZSTRIP);

        // -- axes, grid, ticks --
        D.append(svg('line', { x1: PX0, y1: PY0, x2: PX0, y2: PY1, stroke: 'var(--line2)', 'stroke-width': 1 }));
        D.append(svg('line', { x1: PX0, y1: PY1, x2: PX1, y2: PY1, stroke: 'var(--line2)', 'stroke-width': 1 }));
        const decades = Math.floor(yMax) - Math.ceil(yMin) + 1, yStep = decades > (narrow ? 4 : 7) ? 2 : 1;
        for (let e = Math.ceil(yMin); e <= yMax; e++) {
          const y = yOf(e);
          D.append(svg('line', { x1: PX0, y1: y.toFixed(1), x2: PX1, y2: y.toFixed(1), stroke: 'var(--line)', 'stroke-width': 1 }));
          if (e % yStep === 0) { D.append(svg('line', { x1: PX0 - 4, y1: y.toFixed(1), x2: PX0, y2: y.toFixed(1), stroke: 'var(--line2)', 'stroke-width': 1 })); D.append(text(PX0 - 7, y + FS * 0.35, '10' + sup(e), 'end', { mono: true, fill: 'var(--muted)', halo: false })); }
        }
        const raw = xMax / (narrow ? 3.5 : 6.5), p10 = Math.pow(10, Math.floor(Math.log10(raw)));
        const xStep = [1, 2, 2.5, 5, 10].map(m => m * p10).find(s => s >= raw);
        for (let x = 0; x <= xMax + 1e-9; x += xStep) {
          const px = xOf(x);
          D.append(svg('line', { x1: px.toFixed(1), y1: PY1, x2: px.toFixed(1), y2: PY1 + 4, stroke: 'var(--line2)', 'stroke-width': 1 }));
          D.append(text(px, PY1 + FS + 6, fmt(x, xStep % 1 ? 1 : 0), 'middle', { mono: true, fill: 'var(--muted)', halo: false }));
        }
        D.append(text(PX0, PY1 + 2 * FS + 10, 'surface', 'middle', { fill: 'var(--muted)', halo: false }));
        D.append(text((PX0 + PX1) / 2, PY1 + 2 * FS + 10, 'depth below surface (nm)', 'middle', { fill: 'var(--muted)', halo: false }));
        D.append(text(narrow ? 13 : 15, (PY0 + PY1) / 2, 'concentration (cm⁻³)', 'middle', { fill: 'var(--muted)', halo: false, rot: true }));

        // -- reference lines --
        const ybg = yOf(lNb), showSol = isFinite(lSol) && lSol < yMax && lSol > yMin, ysol = showSol ? yOf(lSol) : null;
        D.append(svg('line', { x1: PX0, y1: ybg.toFixed(1), x2: PX1, y2: ybg.toFixed(1), stroke: 'var(--muted)', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }));
        block(PX0, ybg - 1, PX1, ybg + 1);
        if (showSol) { D.append(svg('line', { x1: PX0, y1: ysol.toFixed(1), x2: PX1, y2: ysol.toFixed(1), stroke: 'var(--warn)', 'stroke-width': 1.2, 'stroke-dasharray': '2 4' })); block(PX0, ysol - 1, PX1, ysol + 1); }

        // -- curves (clipped where N < floor) --
        const curve = (N, color, dashed, width) => {
          let d = '', pen = false;
          for (let i = 0; i <= 400; i++) {
            const x = xMax * i / 400, l = Math.log10(Math.max(N(x), 1e-300));
            if (l <= yMin + 0.005) { pen = false; continue; }
            const px = xOf(x), py = yOf(Math.min(l, yMax));
            d += (pen ? 'L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1); pen = true; curvePts.push([px, py]);
          }
          if (d) D.append(svg('path', Object.assign({ d, fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, dashed ? { 'stroke-dasharray': '7 4' } : {})));
        };
        curve(N1, 'var(--accent)', !broadened, 2.2);
        curve(N0, 'var(--accent2)', false, 2.4);

        // -- markers: Rp drop line, ΔRp bracket, peaks, junctions --
        const xRp = xOf(rp), yPk = yOf(lp0), yPk1 = yOf(lp1), yBr = yOf(lp0 - 0.2171); // bracket at Np/√e, i.e. Rp ± ΔRp
        D.append(svg('line', { x1: xRp.toFixed(1), y1: yPk.toFixed(1), x2: xRp.toFixed(1), y2: PY1, stroke: 'var(--accent2)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
        const xb0 = Math.max(PX0, xOf(rp - drp)), xb1 = xOf(rp + drp);
        D.append(svg('path', { d: `M${xb0.toFixed(1)} ${(yBr - 5).toFixed(1)}v10m0 -5H${xb1.toFixed(1)}m0 -5v10`, fill: 'none', stroke: 'var(--accent2)', 'stroke-width': 1.5 })); block(xb0, yBr - 6, xb1, yBr + 6);
        const dot = (x, y, c, r) => { D.append(svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r, fill: c, stroke: 'var(--panel)', 'stroke-width': 1.5 })); block(x - r - 1, y - r - 1, x + r + 1, y + r + 1); };
        const jx = [];
        [[xj0, 'var(--accent2)'], [xj1, 'var(--accent)']].forEach(([xj, c], k) => {
          if (!xj) return; const x = xOf(xj); jx[k] = x;
          D.append(svg('line', { x1: x.toFixed(1), y1: ybg.toFixed(1), x2: x.toFixed(1), y2: PY1, stroke: c, 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: .8 }));
        });
        if (broadened) dot(xRp, yPk1, 'var(--accent)', 4);
        dot(xRp, yPk, 'var(--accent2)', 4.5);
        if (xj1) dot(jx[1], ybg, 'var(--accent)', 4);
        if (xj0) dot(jx[0], ybg, 'var(--accent2)', 4);

        // -- in-place labels (most important first; each tries several spots and a shorter text before giving up) --
        label(`Rp = ${fmtNm(rp)}`, [[xRp + 6, PY1 - 6, 'start'], [xRp - 6, PY1 - 6, 'end'], [xRp + 6, PY1 - FS - 8, 'start']], ZPLOT, { fill: 'var(--accent2)' });
        label(`ΔRp = ${fmtNm(drp)}`, [[xRp + 5, yBr + FS + 6, 'start'], [xRp - 5, yBr + FS + 6, 'end'], [xb1 + 8, yBr + FS * 0.35, 'start'], [xb0 - 8, yBr + FS * 0.35, 'end'], [xRp, yPk - 9, 'middle']], ZPLOT, { fill: 'var(--accent2)' });
        if (xj0) label(`xj ${fmtNm(xj0)}`, [[jx[0] - 8, ybg + FS + 4, 'end'], [jx[0] + 8, ybg - 6, 'start'], [jx[0] + 8, ybg + FS + 4, 'start'], [jx[0] - 8, ybg - 6, 'end']], ZPLOT, { fill: 'var(--accent2)' });
        if (xj1 && (!xj0 || Math.abs(xj1 - xj0) >= 0.5)) label([`xj′ ${fmtNm(xj1)} after anneal`, `xj′ ${fmtNm(xj1)}`], [[jx[1] + 8, ybg - 6, 'start'], [jx[1] - 8, ybg + FS + 4, 'end'], [jx[1] + 8, ybg + FS + 4, 'start'], [jx[1] - 8, ybg - 6, 'end']], ZPLOT, { fill: 'var(--accent)' });
        label([`peak ${sci(peak0)} cm⁻³`, `peak ${sci(peak0)}`, 'peak'], [[xRp + 9, yPk - 6, 'start'], [xRp - 9, yPk - 6, 'end'], [xRp + 9, yPk + FS + 2, 'start']], ZPLOT, { fill: 'var(--accent2)' });
        const bgTxt = narrow ? [`background ${sci(Nb)}`, `bkg ${sci(Nb)}`] : [`background doping ${sci(Nb)} cm⁻³`, `background ${sci(Nb)}`];
        label(bgTxt, [[PX0 + 6, ybg - 5, 'start'], [PX1 - 4, ybg - 5, 'end'], [PX0 + 6, ybg + FS + 3, 'start'], [PX1 - 4, ybg + FS + 3, 'end']], ZPLOT, { fill: 'var(--muted)' });
        if (showSol) label([(narrow ? 'solubility ' : 'solid solubility ') + sci(meta.sol), 'solubility', 'sol.'], [[PX1 - 4, ysol - 5, 'end'], [PX0 + 6, ysol - 5, 'start'], [PX1 - 4, ysol + FS + 3, 'end'], [PX0 + 6, ysol + FS + 3, 'start']], ZPLOT, { fill: 'var(--warn)' });
        if (broadened && yPk1 - yPk > 8) label('after anneal', [[xRp + 8, yPk1 + FS + 3, 'start'], [xRp - 8, yPk1 + FS + 3, 'end'], [xRp + 8, yPk1 - 5, 'start']], ZPLOT, { fill: 'var(--accent)' });
        D.append(hoverG); hoverG.innerHTML = '';
        hoverOut.textContent = 'Hover or tap the chart to read the concentration at any depth.';
        last = { W, PX0, PX1, PY0, PY1, xMax, yMin, yOf, N0, N1 };
      }

      function onMove(ev) {
        if (!last) return;
        const r = D.getBoundingClientRect(); if (!r.width) return;
        const x = (ev.clientX - r.left) * last.W / r.width;
        if (x < last.PX0 || x > last.PX1) { onLeave(); return; }
        const xnm = (x - last.PX0) / (last.PX1 - last.PX0) * last.xMax, n0 = last.N0(xnm), n1 = last.N1(xnm);
        hoverG.innerHTML = '';
        hoverG.append(svg('line', { x1: x.toFixed(1), y1: last.PY0, x2: x.toFixed(1), y2: last.PY1, stroke: 'var(--ink)', 'stroke-width': 1, opacity: .45, 'stroke-dasharray': '2 3' }));
        [[n0, 'var(--accent2)'], [n1, 'var(--accent)']].forEach(([n, c]) => { const l = Math.log10(Math.max(n, 1)); if (l > last.yMin) hoverG.append(svg('circle', { cx: x.toFixed(1), cy: last.yOf(l).toFixed(1), r: 5, fill: 'none', stroke: c, 'stroke-width': 2 })); });
        hoverOut.textContent = `At ${fmtNm(xnm)} depth: ${sci(n0)} cm⁻³ as implanted, ${sci(n1)} cm⁻³ after anneal.`;
      }
      function onLeave() { hoverG.innerHTML = ''; hoverOut.textContent = 'Hover or tap the chart to read the concentration at any depth.'; }
      D.addEventListener('pointermove', onMove); D.addEventListener('pointerleave', onLeave);

      [speciesSel, eIn, dIn, bIn, tempIn, timeIn].forEach(inp => inp.addEventListener('input', () => {
        st.species = speciesSel.value; st.eLog = +eIn.value; st.dLog = +dIn.value; st.bLog = +bIn.value; st.T = +tempIn.value; st.tIdx = +timeIn.value;
        render();
      }));

      el.append(controls, D, legend, hoverOut, explain, readout,
        h('h5', { style: { margin: '14px 0 0', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' } }, 'Anneal — equilibrium broadening only (TED not modeled)'),
        presetRow, annealCtl, readout2, formula, note);

      let roRaf = 0;
      const ro = new ResizeObserver(es => {
        const w = Math.round(es[0].contentRect.width);
        if (w > 0 && Math.abs(w - W) > 2) { W = w; cancelAnimationFrame(roRaf); roRaf = requestAnimationFrame(() => { if (W === w) render(); }); }
      });
      ro.observe(el);
      const cs = getComputedStyle(el);
      W = Math.round(el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)) || 660;
      render();
      return () => { ro.disconnect(); cancelAnimationFrame(roRaf); D.removeEventListener('pointermove', onMove); D.removeEventListener('pointerleave', onLeave); };
    }
  });
})();
