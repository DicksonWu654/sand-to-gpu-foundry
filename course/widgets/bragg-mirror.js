/* Widget: bragg-mirror — "Why Mo/Si Mirrors Reflect EUV" (Module 08) */
(function () {
  'use strict';
  // Optical constants at 13.5 nm (CXRO tables), written ñ = n + ik and held constant over the sweep.
  const MO = { n: 0.9238, k: 0.00643 }, SI = { n: 0.999, k: 0.0018 };
  // The reflectance is computed on 11–16 nm (so the peak and its half-max points are always found, even
  // when the sliders push the peak past the plotted window) and plotted on 12–15 nm.
  const LAM0 = 11, LAM1 = 16, NL = 1001, DL = (LAM1 - LAM0) / (NL - 1);   // sweep grid: 0.005 nm
  const PL0 = 12, PL1 = 15, IP0 = Math.round((PL0 - LAM0) / DL), IP1 = Math.round((PL1 - LAM0) / DL);
  const PRESETS = [
    ['Tuned to 13.5 nm', { N: 40, d: 6.91, G: 0.40, th: 0 }],
    ['Module estimate, d = 6.97 nm', { N: 40, d: 6.97, G: 0.40, th: 0 }],
    ['Period +1 %', { N: 40, d: 6.98, G: 0.40, th: 0 }],
    ['Collector rim, 20°', { N: 40, d: 6.91, G: 0.40, th: 20 }],
    ['Thin stack, 15 pairs', { N: 15, d: 6.91, G: 0.40, th: 0 }],
    ['80 pairs', { N: 80, d: 6.91, G: 0.40, th: 0 }],
  ];

  // ---------- complex helpers on [re, im] pairs ----------
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const cdiv = (a, b) => { const D = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / D, (a[1] * b[0] - a[0] * b[1]) / D]; };
  const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]], csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const nsq = m => [m.n * m.n - m.k * m.k, 2 * m.n * m.k];                       // ñ²
  function qOf(m, s2) {                                                           // q = √(ñ² − sin²θ), Im q ≥ 0
    const a = m.n * m.n - m.k * m.k - s2, b = 2 * m.n * m.k, r = Math.hypot(a, b);
    return [Math.sqrt((r + a) / 2), Math.sqrt(Math.max(0, (r - a) / 2))];
  }
  const expI = (k0, q, z) => { const g = Math.exp(-k0 * q[1] * z), p = k0 * q[0] * z; return [g * Math.cos(p), g * Math.sin(p)]; }; // e^{i·k0·q·z}
  function fresnel(q1, q2, n1, n2, pol) {                                        // amplitude r for light going from 1 into 2
    if (pol === 's') return cdiv(csub(q1, q2), cadd(q1, q2));
    const A = cmul(n2, q1), B = cmul(n1, q2); return cdiv(csub(A, B), cadd(A, B));
  }
  // Parratt (transfer-matrix) recursion for N × [Si over Mo] bilayers on a Si substrate.
  // Returns R = |r|² and, if keep, the up/down amplitude ratio at the top of every layer (bottom-up).
  function stack(lam, th, N, tMo, tSi, pol, keep) {
    const s2 = Math.sin(th) ** 2, k0 = 2 * Math.PI / lam;
    const q0 = [Math.cos(th), 0], qM = qOf(MO, s2), qS = qOf(SI, s2), nM = nsq(MO), nS = nsq(SI);
    const rVS = fresnel(q0, qS, [1, 0], nS, pol), rSM = fresnel(qS, qM, nS, nM, pol), rMS = [-rSM[0], -rSM[1]];
    const pM = expI(2 * k0, qM, tMo), pS = expI(2 * k0, qS, tSi);               // round-trip phase e^{2iβ}, |·| < 1
    let yr = 0, yi = 0; const tops = keep ? [] : null;
    const up = (rr, ri, pr, pi) => {                                              // Y ← (r + Y)/(1 + rY) · e^{2iβ}
      const nr = rr + yr, ni = ri + yi, dr = 1 + rr * yr - ri * yi, di = rr * yi + ri * yr, D = dr * dr + di * di;
      const br = (nr * dr + ni * di) / D, bi = (ni * dr - nr * di) / D;
      yr = br * pr - bi * pi; yi = br * pi + bi * pr;
      if (tops) tops.push([yr, yi]);
    };
    for (let i = 0; i < N; i++) { up(rMS[0], rMS[1], pM[0], pM[1]); up(rSM[0], rSM[1], pS[0], pS[1]); }
    const Y0 = cdiv(cadd(rVS, [yr, yi]), cadd([1, 0], cmul(rVS, [yr, yi])));
    return { R: Y0[0] * Y0[0] + Y0[1] * Y0[1], Y0, tops, qM, qS, k0 };
  }
  // Peak (parabolic refinement) and FWHM of a curve sampled on the λ grid; 'clipped' if a half-max point is off-grid.
  function peakOf(R) {
    let ip = 0; for (let i = 1; i < NL; i++) if (R[i] > R[ip]) ip = i;
    let lamPk = LAM0 + ip * DL, Rpk = R[ip];
    if (ip > 0 && ip < NL - 1) { const den = R[ip - 1] - 2 * R[ip] + R[ip + 1]; if (den < 0) { const dl = 0.5 * (R[ip - 1] - R[ip + 1]) / den; lamPk += dl * DL; Rpk = R[ip] - 0.25 * (R[ip - 1] - R[ip + 1]) * dl; } }
    const half = Rpk / 2; let lo = NaN, hi = NaN;
    for (let i = ip; i > 0; i--) if (R[i - 1] < half) { lo = LAM0 + (i - 1 + (half - R[i - 1]) / (R[i] - R[i - 1])) * DL; break; }
    for (let i = ip; i < NL - 1; i++) if (R[i + 1] < half) { hi = LAM0 + (i + (R[i] - half) / (R[i] - R[i + 1])) * DL; break; }
    const clipped = isNaN(lo) || isNaN(hi) || ip === 0 || ip === NL - 1;
    return { lamPk, Rpk, lo, hi, clipped, fwhm: (isNaN(hi) ? LAM1 : hi) - (isNaN(lo) ? LAM0 : lo), offPlot: lamPk < PL0 ? -1 : lamPk > PL1 ? 1 : 0 };
  }
  // Unpolarized R(λ) over the sweep grid with its peak statistics and an interpolating accessor.
  function sweep(N, d, G, thDeg) {
    const th = thDeg * Math.PI / 180, tMo = G * d, tSi = (1 - G) * d, R = new Float64Array(NL);
    for (let i = 0; i < NL; i++) { const lam = LAM0 + i * DL; R[i] = 0.5 * (stack(lam, th, N, tMo, tSi, 's').R + stack(lam, th, N, tMo, tSi, 'p').R); }
    const at = lam => { const x = Math.min(NL - 1.0001, Math.max(0, (lam - LAM0) / DL)), i = Math.floor(x); return R[i] + (R[i + 1] - R[i]) * (x - i); };
    return Object.assign({ R, at }, peakOf(R));
  }
  // Standing-wave intensity |E(z)|² inside the stack (s-polarization), incident amplitude = 1.
  function field(lam, thDeg, N, d, G) {
    const th = thDeg * Math.PI / 180, tMo = G * d, tSi = (1 - G) * d, s = stack(lam, th, N, tMo, tSi, 's', true);
    const layers = []; let E = [1 + s.Y0[0], s.Y0[1]], z = 0;                     // field at the surface = 1 + r
    for (let j = 0; j < 2 * N; j++) {
      const si = j % 2 === 0, q = si ? s.qS : s.qM, t = si ? tSi : tMo, Yt = s.tops[2 * N - 1 - j];
      const a = cdiv(E, [1 + Yt[0], Yt[1]]), b = cmul(a, Yt);
      layers.push({ q, t, a, b, z0: z });
      E = cadd(cmul(a, expI(s.k0, q, t)), cmul(b, expI(s.k0, q, -t))); z += t;
    }
    layers.push({ q: s.qS, t: Infinity, a: E, b: [0, 0], z0: z });               // substrate: transmitted wave only
    return zz => {
      let L = layers[layers.length - 1]; for (const l of layers) if (zz < l.z0 + l.t) { L = l; break; }
      const u = zz - L.z0, e = cadd(cmul(L.a, expI(s.k0, L.q, u)), cmul(L.b, expI(s.k0, L.q, -u)));
      return e[0] * e[0] + e[1] * e[1];
    };
  }

  window.registerWidget('bragg-mirror', {
    title: 'Why Mo/Si Mirrors Reflect EUV',
    caption: 'Drag the bilayer count, period, Mo fraction and angle: the reflectance peak moves and sharpens while the standing wave sinks into the stack. Hover the curve to probe any wavelength.',
    mount(el, ctx) {
      const { h, svg } = ctx;
      // The λ sweep is opt-in (paused on mount for everyone, so reduced-motion users never see it auto-start).
      const st = { N: 40, d: 6.91, G: 0.40, th: 0, probe: 13.5, sys: false, playing: false };
      let sw = null, hoverLam = null, raf = 0, visible = true, t0 = 0;

      // ---------- controls ----------
      const ctl = {};
      const slider = (key, label, min, max, step, show) => {
        const input = h('input', { type: 'range', min, max, step, value: st[key], 'data-ctl': key }), out = h('output');
        ctl[key] = { input, out, show };
        input.addEventListener('input', () => update(key !== 'probe'));
        return h('label', { class: 'w-ctl' }, h('span', null, label), input, out);
      };
      const sysChk = h('input', { type: 'checkbox', 'data-ctl': 'sys' }), sysOut = h('output');
      sysChk.addEventListener('change', () => { st.sys = sysChk.checked; sysOut.textContent = st.sys ? 'on' : 'off'; drawChart(); });
      const playBtn = h('button', { class: 'w-btn', 'data-ctl': 'play', on: { click: () => { st.playing = !st.playing; playBtn.textContent = st.playing ? 'Pause sweep' : 'Sweep λ'; t0 = 0; if (st.playing) start(); } } }, 'Sweep λ');
      const presets = h('div', { class: 'w-controls' }, ...PRESETS.map(([name, v]) => h('button', { class: 'w-btn', 'data-preset': name, on: { click: () => { Object.assign(st, v); for (const k in v) ctl[k].input.value = v[k]; update(true); } } }, name)));
      const controls = h('div', { class: 'w-controls' },
        slider('N', 'Bilayers N', 10, 80, 1, v => v.toFixed(0) + ' pairs'),
        slider('d', 'Period d', 6.5, 7.5, 0.01, v => v.toFixed(2) + ' nm'),
        slider('G', 'Mo fraction Γ', 0.3, 0.5, 0.01, v => v.toFixed(2)),
        slider('th', 'Angle of incidence θ', 0, 20, 0.5, v => v.toFixed(1) + '°'),
        slider('probe', 'Probe λ (standing wave)', PL0, PL1, 0.01, v => v.toFixed(2) + ' nm'),
        h('label', { class: 'w-ctl' }, h('span', null, 'System passband R¹¹'), sysChk, sysOut),
        h('div', null, playBtn));
      sysOut.textContent = 'off';

      // ---------- readouts, formula, drawings ----------
      const stat = () => h('b'); const sPk = stat(), sLam = stat(), sFw = stat(), sBragg = stat(), s135 = stat(), sT = stat();
      const sLamLbl = h('span', null, 'peak wavelength');
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, sPk, h('span', null, 'peak reflectance')),
        h('div', { class: 'w-stat' }, sLam, sLamLbl),
        h('div', { class: 'w-stat' }, sFw, h('span', null, 'FWHM (ideal stack; real ≈ 0.5 nm)')),
        h('div', { class: 'w-stat' }, sBragg, h('span', null, 'Bragg estimate 2d·√(n̄² − sin²θ)')),
        h('div', { class: 'w-stat' }, s135, h('span', null, 'R at 13.5 nm')),
        h('div', { class: 'w-stat' }, sT, h('span', null, 'Mo / Si layer thickness')));
      const formula = h('div', { class: 'w-formula' });
      const S = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Cross-section of the Mo/Si multilayer with the standing-wave intensity' });
      const C = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Reflectance versus wavelength', style: { cursor: 'crosshair' } });
      const stackWrap = h('div', null, S), chartWrap = h('div', null, C);
      const legend = h('div', { class: 'w-legend' },
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--muted)', opacity: .9 } }), 'Mo, the dense absorber'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--si)', opacity: .4 } }), 'Si, the transparent spacer'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent2)' } }), 'R(λ), one mirror, unpolarized'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent)' } }), 'probe λ (slider, hover or sweep)'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent)', opacity: .3 } }), '13.5 nm ± 1 % in-band'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { border: '1.5px dashed var(--muted)', boxSizing: 'border-box' } }), 'R¹¹: 11 mirrors in series, scaled to the same peak'));

      const fx = (v, d) => Number(v).toFixed(d);
      const txt = (P, x, y, t, o) => P.append(svg('text', Object.assign({ x, y, 'font-family': 'var(--sans)', 'font-size': 11.5, fill: 'var(--ink)' }, o || {}), t));
      const HALO = { stroke: 'var(--panel)', 'stroke-width': 3, 'paint-order': 'stroke', 'stroke-linejoin': 'round' };   // keeps labels legible over lines
      function arrow(x1, y1, x2, y2, color) {
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, hx = x2 - ux * 7, hy = y2 - uy * 7;
        return svg('g', null, svg('line', { x1, y1, x2: hx, y2: hy, stroke: color, 'stroke-width': 2 }),
          svg('polygon', { points: `${x2},${y2} ${hx - uy * 3.5},${hy + ux * 3.5} ${hx + uy * 3.5},${hy - ux * 3.5}`, fill: color }));
      }

      function drawStack() {
        if (!sw) return;
        const W = Math.max(280, stackWrap.clientWidth || 340), H = 372;
        S.setAttribute('viewBox', `0 0 ${W} ${H}`); S.innerHTML = '';
        const ySurf = 84, hStack = 220, ySub = ySurf + hStack, hSub = 32, xE = W - 96, xIn = 78, xOut = 90, xF0 = 100, xF1 = xE - 8;
        const scale = hStack / (st.N * st.d), tMo = st.G * st.d, tSi = (1 - st.G) * st.d, lam = hoverLam ?? st.probe;
        const T = (x, y, t, o) => txt(S, x, y, t, o);
        // stack: Si everywhere (blue tint), Mo stripes (mid grey in both themes); Si on top, substrate below
        S.append(svg('rect', { x: 0, y: ySurf, width: xE, height: hStack, fill: 'var(--si)', 'fill-opacity': .3 }));
        for (let j = 0; j < st.N; j++) S.append(svg('rect', { x: 0, y: ySurf + (j * st.d + tSi) * scale, width: xE, height: tMo * scale, fill: 'var(--muted)', 'fill-opacity': .9 }));
        S.append(svg('rect', { x: 0, y: ySub, width: xE, height: hSub, fill: 'var(--si)', 'fill-opacity': .5 }));
        S.append(svg('line', { x1: 0, y1: ySurf, x2: xE, y2: ySurf, stroke: 'var(--ink)', 'stroke-width': 1, opacity: .7 }));
        // standing wave |E|² (x = intensity), sampled every pixel of depth
        const F = field(lam, st.th, st.N, st.d, st.G), pts = []; let Imax = 0;
        for (let y = ySurf; y <= ySub + hSub; y += 1) { const I = F((y - ySurf) / scale); pts.push([y, I]); if (I > Imax) Imax = I; }
        const px = I => xF0 + (xF1 - xF0) * I / (Imax || 1);
        const dPath = pts.map(([y, I], i) => (i ? 'L' : 'M') + px(I).toFixed(1) + ',' + y).join(' ');
        S.append(svg('path', { d: dPath + ` L${xF0},${ySub + hSub} L${xF0},${ySurf} Z`, fill: 'var(--accent2)', 'fill-opacity': .18 }));
        S.append(svg('path', { d: dPath, fill: 'none', stroke: 'var(--accent2)', 'stroke-width': 1.8 }));
        S.append(svg('line', { x1: xF0, y1: ySurf, x2: xF0, y2: ySub + hSub, stroke: 'var(--accent2)', 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: .7 }));
        T(xF1, ySurf - 8, '|E|² at ' + fx(lam, 2) + ' nm', { 'text-anchor': 'end', fill: 'var(--accent2)', 'font-family': 'var(--mono)', 'font-size': 11 });
        // beams: incident from upper-left down onto x = xIn, reflected up-right from x = xOut; the dashed surface
        // normal passes through the incident hit point so the θ arc sits exactly between the normal and the beam
        const th = st.th * Math.PI / 180, L = 48, sn = Math.sin(th), cs = Math.cos(th);
        S.append(svg('line', { x1: xIn, y1: ySurf - 60, x2: xIn, y2: ySurf, stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
        S.append(arrow(xIn - L * sn, ySurf - L * cs, xIn, ySurf, 'var(--accent2)'));
        S.append(arrow(xOut, ySurf, xOut + L * sn, ySurf - L * cs, 'var(--accent2)'));
        T(xIn - L * sn, ySurf - L * cs - 6, 'in', { 'text-anchor': 'end', fill: 'var(--accent2)' });
        T(xOut + L * sn, ySurf - L * cs - 6, 'out, R = ' + fx(sw.at(lam) * 100, 0) + ' %', Object.assign({ fill: 'var(--accent2)' }, HALO));
        if (st.th >= 2) {
          const r = 40;
          S.append(svg('path', { d: `M${xIn},${ySurf - r} A${r},${r} 0 0 0 ${(xIn - r * sn).toFixed(1)},${(ySurf - r * cs).toFixed(1)}`, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.2 }));
          T(xIn - 22 * Math.tan(th) - 8, ySurf - 18, 'θ = ' + fx(st.th, 1) + '°', { 'text-anchor': 'end', fill: 'var(--muted)' });
        }
        // labels in place (right margin) with leaders to the top two layers
        const xl = xE + 6, leader = (y, yl) => S.append(svg('line', { x1: xl - 2, y1: y - 4, x2: xE, y2: yl, stroke: 'var(--muted)', 'stroke-width': 1 }));
        T(xl, ySurf - 22, 'vacuum', { fill: 'var(--muted)' });
        T(xl, ySurf + 11, 'Si ' + fx(tSi, 2) + ' nm'); leader(ySurf + 11, ySurf + tSi * scale / 2);
        T(xl, ySurf + 25, 'Mo ' + fx(tMo, 2) + ' nm'); leader(ySurf + 25, ySurf + (tSi + tMo / 2) * scale);
        T(xl, ySurf + 41, 'd = ' + fx(st.d, 2) + ' nm', { fill: 'var(--muted)' });
        T(xl, ySurf + 100, fx(st.N, 0) + ' bilayers'); T(xl, ySurf + 114, fx(st.N * st.d, 0) + ' nm thick', { fill: 'var(--muted)' });
        T(xl, ySub + 20, 'Si substrate');
        let bar = 5; for (const v of [5, 10, 20, 50, 100, 200]) if (v * scale <= 70) bar = v;
        const bl = bar * scale, yb = ySub - 8, xb = xl + 4;
        S.append(svg('path', { d: `M${xb - 3},${yb} h6 M${xb},${yb} v${-bl} M${xb - 3},${yb - bl} h6`, stroke: 'var(--ink)', 'stroke-width': 1.2, fill: 'none' }));
        T(xb + 7, yb - bl / 2 + 4, bar + ' nm', { 'font-family': 'var(--mono)', 'font-size': 11 });
        T(0, 12, 'Cross-section and standing wave', { 'font-size': 12.5, 'font-weight': 600 });
      }

      function drawChart() {
        if (!sw) return;
        const W = Math.max(280, chartWrap.clientWidth || 340), H = 316;
        C.setAttribute('viewBox', `0 0 ${W} ${H}`); C.innerHTML = '';
        const x0 = 46, x1 = W - 18, y0 = 20, y1 = H - 42;
        const X = lam => x0 + (lam - PL0) / (PL1 - PL0) * (x1 - x0), Y = r => y1 - r * (y1 - y0);
        const T = (x, y, t, o) => txt(C, x, y, t, o);
        for (let p = 0; p <= 1; p += 0.25) {
          C.append(svg('line', { x1: x0, y1: Y(p), x2: x1, y2: Y(p), stroke: 'var(--line)', 'stroke-width': 1 }));
          T(x0 - 6, Y(p) + 4, Math.round(p * 100) + ' %', { 'text-anchor': 'end', 'font-family': 'var(--mono)', 'font-size': 11, fill: 'var(--muted)' });
        }
        for (let lam = PL0; lam <= PL1 + 0.001; lam += 0.5) {
          C.append(svg('line', { x1: X(lam), y1: y1, x2: X(lam), y2: y1 + 4, stroke: 'var(--muted)', 'stroke-width': 1 }));
          T(X(lam), y1 + 16, lam.toFixed(1), { 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 11, fill: 'var(--muted)' });
        }
        C.append(svg('line', { x1: x0, y1: y1, x2: x1, y2: y1, stroke: 'var(--muted)', 'stroke-width': 1 }));
        T((x0 + x1) / 2, H - 6, 'wavelength λ (nm)', { 'text-anchor': 'middle' });
        // 13.5 nm ± 1 % in-band
        C.append(svg('rect', { x: X(13.365), y: y0, width: X(13.635) - X(13.365), height: y1 - y0, fill: 'var(--accent)', 'fill-opacity': .12 }));
        C.append(svg('line', { x1: X(13.5), y1: y0, x2: X(13.5), y2: y1, stroke: 'var(--accent)', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: .8 }));
        T(X(13.635) + 4, y0 + 26, '13.5 nm ± 1 %', { 'font-size': 11, fill: 'var(--muted)' });
        // reflectance curve (plotted window only)
        const P = (arr, f) => { const o = []; for (let i = IP0; i <= IP1; i++) o.push(X(LAM0 + i * DL).toFixed(1) + ',' + Y(f(arr[i])).toFixed(1)); return o.join(' L'); };
        const curve = P(sw.R, r => r);
        C.append(svg('path', { d: 'M' + curve + ` L${x1},${y1} L${x0},${y1} Z`, fill: 'var(--accent2)', 'fill-opacity': .12 }));
        C.append(svg('path', { d: 'M' + curve, fill: 'none', stroke: 'var(--accent2)', 'stroke-width': 2 }));
        if (st.sys) {   // 11 reflections in series: R¹¹, scaled to the single-mirror peak so the narrowing is visible
          const p11 = Float64Array.from(sw.R, r => Math.pow(r, 11)), pk = peakOf(p11), m = pk.Rpk || 1;
          C.append(svg('path', { d: 'M' + P(p11, r => r / m * sw.Rpk), fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.5, 'stroke-dasharray': '5 3' }));
          T(x0 + 6, y0 + 40, 'R¹¹ FWHM ' + fx(pk.fwhm, 2) + ' nm (' + fx(pk.fwhm / pk.lamPk * 100, 1) + ' %)', Object.assign({ 'font-size': 11, fill: 'var(--muted)' }, HALO));   // own row, below '13.5 nm ± 1 %'
        }
        if (sw.offPlot) {   // the peak has left the plotted window: say so at the edge it went past, no marker or FWHM bar
          const left = sw.offPlot < 0, iE = left ? IP0 : IP1, yE = Math.max(y0 + 56, Y(sw.R[iE]) - 10);
          const t = (left ? '← peak ' : 'peak ') + fx(sw.Rpk * 100, 1) + ' % at ' + fx(sw.lamPk, 2) + ' nm, off-plot' + (left ? '' : ' →');
          T(left ? x0 + 6 : x1 - 6, yE, t, Object.assign({ 'text-anchor': left ? 'start' : 'end' }, HALO));
        } else {
          // FWHM bar (its ends clamped to the plotted window)
          const half = sw.Rpk / 2, lo = Math.max(PL0, isNaN(sw.lo) ? LAM0 : sw.lo), hi = Math.min(PL1, isNaN(sw.hi) ? LAM1 : sw.hi), yh = Y(half);
          C.append(svg('path', { d: `M${X(lo)},${yh - 5} v10 M${X(lo)},${yh} H${X(hi)} M${X(hi)},${yh - 5} v10`, stroke: 'var(--ink)', 'stroke-width': 1.2, fill: 'none' }));
          const fwTxt = 'FWHM ' + (sw.clipped ? '≥ ' : '') + fx(sw.fwhm, 2) + ' nm', fwW = fwTxt.length * 6.4;
          if (X(hi) + 6 + fwW <= x1) T(X(hi) + 6, yh + 4, fwTxt, HALO);
          else if (X(lo) - 6 - fwW >= x0) T(X(lo) - 6, yh + 4, fwTxt, Object.assign({ 'text-anchor': 'end' }, HALO));
          else T((X(lo) + X(hi)) / 2, yh + 15, fwTxt, Object.assign({ 'text-anchor': 'middle' }, HALO));
          // peak marker
          const xp = X(sw.lamPk), yp = Y(sw.Rpk), pkTxt = 'peak ' + fx(sw.Rpk * 100, 1) + ' % at ' + fx(sw.lamPk, 2) + ' nm';
          C.append(svg('circle', { cx: xp, cy: yp, r: 4, fill: 'var(--accent2)', stroke: 'var(--panel)', 'stroke-width': 1.5 }));
          const pkW = pkTxt.length * 6.4;
          if (xp + 8 + pkW <= x1) T(xp + 8, yp - 6, pkTxt, HALO);
          else if (xp - 8 - pkW >= x0) T(xp - 8, yp - 6, pkTxt, Object.assign({ 'text-anchor': 'end' }, HALO));
          else T(Math.min(x1 - pkW / 2, Math.max(x0 + pkW / 2, xp)), yp - 10, pkTxt, Object.assign({ 'text-anchor': 'middle' }, HALO));
        }
        // probe / hover marker
        const lam = hoverLam ?? st.probe, r = sw.at(lam), xq = X(lam), prTxt = (hoverLam == null ? 'probe ' : 'λ ') + fx(lam, 2) + ' nm → R ' + fx(r * 100, 1) + ' %';
        C.append(svg('line', { x1: xq, y1: y1, x2: xq, y2: Y(r), stroke: 'var(--accent)', 'stroke-width': 1.5 }));
        C.append(svg('circle', { cx: xq, cy: Y(r), r: 4, fill: 'var(--accent)', stroke: 'var(--panel)', 'stroke-width': 1.5 }));
        const pw = prTxt.length * 6.4 / 2;
        T(Math.min(x1 - pw, Math.max(x0 + pw, xq)), y0 + 11, prTxt, Object.assign({ 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 11, fill: 'var(--accent)' }, HALO));
        T(0, 12, 'Reflectance vs wavelength', { 'font-size': 12.5, 'font-weight': 600 });
      }

      function update(resweep) {
        for (const k in ctl) { st[k] = +ctl[k].input.value; ctl[k].out.textContent = ctl[k].show(st[k]); }
        if (resweep || !sw) sw = sweep(st.N, st.d, st.G, st.th);
        const nbar = st.G * MO.n + (1 - st.G) * SI.n, thr = st.th * Math.PI / 180;
        const lamB = 2 * st.d * Math.sqrt(nbar * nbar - Math.sin(thr) ** 2), lamVac = 2 * st.d * Math.cos(thr), shift = (sw.lamPk / lamB - 1) * 100;
        const dNeed = st.d * 13.5 / sw.lamPk;   // the period that would put this stack's peak on 13.5 nm (Bragg scaling)
        sPk.textContent = fx(sw.Rpk * 100, 1) + ' %';
        sLam.textContent = fx(sw.lamPk, 2) + ' nm';
        sLamLbl.textContent = sw.offPlot ? 'peak wavelength (off-plot, ' + (sw.offPlot < 0 ? '< 12' : '> 15') + ' nm)' : 'peak wavelength';
        sFw.textContent = (sw.clipped ? '≥ ' : '') + fx(sw.fwhm, 2) + ' nm (' + fx(sw.fwhm / sw.lamPk * 100, 1) + ' %)';
        sBragg.textContent = fx(lamB, 2) + ' nm';
        s135.textContent = fx(sw.at(13.5) * 100, 1) + ' %';
        sT.textContent = fx(st.G * st.d, 2) + ' / ' + fx((1 - st.G) * st.d, 2) + ' nm';
        formula.innerHTML = `Bragg: 2d·cos θ = λ → ${fx(lamVac, 2)} nm in vacuum; inside the stack λ<sub>B</sub> = 2d·√(n̄² − sin²θ) = ${fx(lamB, 2)} nm with n̄ = Γ·n<sub>Mo</sub> + (1−Γ)·n<sub>Si</sub> = ${fx(nbar, 4)}. ` +
          `Curve: transfer matrix (Parratt), r<sub>j</sub> = (q<sub>j</sub> − q<sub>j+1</sub>)/(q<sub>j</sub> + q<sub>j+1</sub>), q = √(ñ² − sin²θ), R<sub>j</sub> = (r<sub>j</sub> + R<sub>j+1</sub>e<sup>2iβ</sup>)/(1 + r<sub>j</sub>R<sub>j+1</sub>e<sup>2iβ</sup>), β = 2π·q·t/λ; ` +
          `ñ<sub>Mo</sub> = 0.9238 + 0.00643i, ñ<sub>Si</sub> = 0.999 + 0.0018i (constant, CXRO at 13.5 nm); R = (R<sub>s</sub> + R<sub>p</sub>)/2. ` +
          (shift > 0.15 ? `The computed peak sits ${fx(shift, 1)} % above the Bragg estimate: absorption favours the long-λ edge of the stop band, where the nodes fall in the Mo, so 13.5 nm needs d ≈ ${fx(dNeed, 2)} nm rather than the ${fx(13.5 / (2 * nbar), 2)} nm of the simple estimate.`
            : `With this weak a reflection the computed peak matches the Bragg estimate to ${fx(Math.abs(shift), 1)} %.`) +
          (st.th > 5 ? (Math.abs(sw.lamPk - 13.5) > 0.05
            ? ` At θ = ${fx(st.th, 1)}° the peak moves to ${fx(sw.lamPk, 2)} nm and R at 13.5 nm drops to ${fx(sw.at(13.5) * 100, 1)} %; a real collector grades its period across the surface (d ≈ ${fx(dNeed, 2)} nm would be needed here) so every zone, centre to rim, still reflects 13.5 nm.`
            : ` At θ = ${fx(st.th, 1)}° this period (${fx(st.d, 2)} nm) re-centres the peak on 13.5 nm: exactly the lateral period grading a real collector uses toward its rim.`) : '');
        drawStack(); drawChart();
      }

      // ---------- hover on the chart probes any wavelength ----------
      C.addEventListener('pointermove', e => {
        const b = C.getBoundingClientRect(), W = Math.max(280, chartWrap.clientWidth || 340), x = (e.clientX - b.left) * W / (b.width || W);
        const lam = PL0 + (x - 46) / (W - 18 - 46) * (PL1 - PL0);   // same plot margins as drawChart
        if (lam < PL0 || lam > PL1) { if (hoverLam != null) { hoverLam = null; drawStack(); drawChart(); } return; }
        hoverLam = Math.round(lam * 100) / 100; drawStack(); drawChart();
      });
      C.addEventListener('pointerleave', () => { if (hoverLam != null) { hoverLam = null; drawStack(); drawChart(); } });

      // ---------- λ sweep animation (paused by default; respects reduced motion) ----------
      function frame(ts) {
        raf = 0; if (!st.playing || !visible) return;
        if (!t0) t0 = ts;
        st.probe = Math.round((13.5 + 0.75 * Math.sin((ts - t0) / 5000 * 2 * Math.PI)) * 100) / 100;
        ctl.probe.input.value = st.probe; ctl.probe.out.textContent = ctl.probe.show(st.probe);
        if (hoverLam == null) { drawStack(); drawChart(); }
        raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && st.playing && visible) raf = requestAnimationFrame(frame); }
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); });
      io.observe(el);
      let lastW = 0, layoutFrame = 0;
      const ro = new ResizeObserver(() => {
        cancelAnimationFrame(layoutFrame);
        layoutFrame = requestAnimationFrame(() => {
          layoutFrame = 0;
          const w = stackWrap.clientWidth;
          if (w && w !== lastW) { lastW = w; drawStack(); drawChart(); }
        });
      });
      ro.observe(el);

      el.append(presets, controls, readout, formula,
        h('div', { class: 'w-grid2', style: { marginTop: '10px' } }, stackWrap, chartWrap), legend,
        h('div', { class: 'w-note' }, 'Each Mo/Si interface reflects only ~0.1–0.2 % because every index is ≈ 1 at EUV; a Bragg mirror spaces ~80 interfaces so those reflections add in phase. The standing wave (|E|², s-polarization) shows its antinodes in the transparent Si, its nodes in the absorbing Mo, and fades out after ~20 bilayers, which is why more than ~50 pairs adds nothing and the peak saturates near 74 %. Detune the wavelength, period or angle and the wave leaks through to the substrate. Ideal model: sharp interfaces, no roughness, no Ru cap, constant optical constants. Real stacks interdiffuse into molybdenum-silicide ramps at each interface, softening the index step, so production mirrors reach ~67–70 % with a ~0.5 nm wide peak.'));
      update(true);
      return () => { cancelAnimationFrame(layoutFrame); st.playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; io.disconnect(); ro.disconnect(); };
    }
  });
})();
