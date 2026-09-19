/* Widget: euv-stochastics — "Photon Shot Noise" (Module 08) */
(function () {
  'use strict';
  const E_PHOTON_J = 1.474e-17;                       // 13.5 nm photon = 91.8 eV
  const INC_PER_MJ = 1e-3 / (E_PHOTON_J * 1e14);      // incident photons per nm² per mJ/cm² ≈ 0.6785
  const G = 60;                                       // patch side, nm (1 nm per cell)
  const RING = 3;                                     // edge-ring width, nm (254 nm² at CD 30 ≈ the module's 16×16 nm edge pixel)
  const BLUR = 3;                                     // secondary-electron + acid blur, nm (σ)
  const BG = 0.04;                                    // stray light outside the hole
  const N_SAMPLES = 6, CONTACTS = 1e10, EXPOSURE_MS = 4500, LN2 = Math.LN2;
  const WPH_MAX = 230, REF_WPH = 160, REF_DOSE = 30;  // 1/wph = 1/wph_max + k·dose, calibrated to 160 wph @ 30 mJ/cm²
  const K_WPH = (1 / REF_WPH - 1 / WPH_MAX) / REF_DOSE;
  const wphOf = d => 1 / (1 / WPH_MAX + K_WPH * d);

  // Numerical-Recipes erfc: relative error < 1.2e-7 even for tiny values.
  function erfc(x) {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const ans = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
      t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? ans : 2 - ans;
  }
  const Qz = z => 0.5 * erfc(z / Math.SQRT2);
  function poisson(lambda) {
    if (lambda <= 0) return 0;
    if (lambda > 30) { let s = 0; for (let i = 0; i < 6; i++) s += Math.random(); return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * (s - 3) / Math.sqrt(0.5))); }
    const L = Math.exp(-lambda); let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  }
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sup = n => String(n).replace(/-/g, '⁻').replace(/\d/g, d => SUP[d]);
  function sci(x, d) { const e = Math.floor(Math.log10(x)); return (x / 10 ** e).toFixed(d == null ? 1 : d) + '×10' + sup(e); }
  function fmtP(p) { if (p < 1e-12) return '< 10⁻¹²'; if (p < 1e-4) return sci(p); const v = p * 100; return (v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toPrecision(2)) + ' %'; }
  const pct = (x, d) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(d == null ? 1 : d) + ' %';
  function lum(c) { if (!/^#[0-9a-f]{6}$/i.test(c)) return 0.5; const n = parseInt(c.slice(1), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; }

  // ---------- geometry per CD: aerial image (soft blob, 50 % at the target edge), edge ring, clearing level ----------
  const maskCache = {};
  function masksFor(cd) {
    if (maskCache[cd]) return maskCache[cd];
    const R = cd / 2, I = new Float32Array(G * G), ring = [], hole = [];
    let ringSum = 0;
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      const r = Math.hypot(x + 0.5 - G / 2, y + 0.5 - G / 2), idx = y * G + x;
      I[idx] = BG + (1 - BG) * Math.exp(-LN2 * (r / R) ** 2);
      if (r < R) { hole.push(idx); if (r >= R - RING) { ring.push(idx); ringSum += I[idx]; } }
    }
    const k = ring.length / ringSum;                  // normalise so the edge ring receives the nominal dose (module: ~3 photons/nm²)
    let holeI = 0; for (let i = 0; i < I.length; i++) I[i] *= k;
    for (const idx of hole) holeI += I[idx];
    const T = k * (BG + (1 - BG) * 0.5);              // clearing level (× μ): the noise-free edge prints exactly at r = CD/2
    return (maskCache[cd] = { R, I, ring, hole, nRing: ring.length, holeI, T });
  }
  const KR = 7, KER = (() => { const k = []; let s = 0; for (let i = -KR; i <= KR; i++) { const v = Math.exp(-i * i / (2 * BLUR * BLUR)); k.push(v); s += v; } return k.map(v => v / s); })();
  const tmpA = new Float32Array(G * G), tmpB = new Float32Array(G * G);
  function blur(src) {
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) { let s = 0; for (let t = -KR; t <= KR; t++) s += src[y * G + Math.min(G - 1, Math.max(0, x + t))] * KER[t + KR]; tmpA[y * G + x] = s; }
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) { let s = 0; for (let t = -KR; t <= KR; t++) s += tmpA[Math.min(G - 1, Math.max(0, y + t)) * G + x] * KER[t + KR]; tmpB[y * G + x] = s; }
    return tmpB;
  }
  // marching squares: edges 0=top 1=right 2=bottom 3=left
  const MS = [[], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [[3, 0], [1, 2]], [[0, 2]], [[0, 3]], [[0, 3]], [[0, 2]], [[0, 1], [2, 3]], [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []];
  function develop(counts, L) {
    const F = blur(counts), dev = new Uint8Array(G * G), segs = []; let area = 0;
    for (let i = 0; i < G * G; i++) if (F[i] >= L) { dev[i] = 1; area++; }
    for (let y = 0; y < G - 1; y++) for (let x = 0; x < G - 1; x++) {
      const a = F[y * G + x], b = F[y * G + x + 1], c = F[(y + 1) * G + x + 1], d = F[(y + 1) * G + x];
      const code = (a >= L ? 8 : 0) | (b >= L ? 4 : 0) | (c >= L ? 2 : 0) | (d >= L ? 1 : 0);
      if (!code || code === 15) continue;
      const cx = x + 0.5, cy = y + 0.5, lp = (p, q) => (L - p) / (q - p);
      const pt = e => e === 0 ? [cx + lp(a, b), cy] : e === 1 ? [cx + 1, cy + lp(b, c)] : e === 2 ? [cx + lp(d, c), cy + 1] : [cx, cy + lp(a, d)];
      for (const [e1, e2] of MS[code]) segs.push(pt(e1), pt(e2));
    }
    return { dev, area, segs };
  }
  function drawSample(mu, m, deficit) {
    const scale = 1 - (deficit || 0), counts = new Uint16Array(G * G), pts = [];
    for (let idx = 0; idx < G * G; idx++) {
      const c = poisson(mu * m.I[idx] * scale); counts[idx] = c;
      const x0 = idx % G, y0 = (idx - x0) / G;
      for (let j = 0; j < c; j++) pts.push(x0 + Math.random(), y0 + Math.random());
    }
    for (let i = pts.length / 2 - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)), a = 2 * i, b = 2 * j; const tx = pts[a], ty = pts[a + 1]; pts[a] = pts[b]; pts[a + 1] = pts[b + 1]; pts[b] = tx; pts[b + 1] = ty; }
    let ringN = 0; for (const idx of m.ring) ringN += counts[idx];
    return { counts, pts, total: pts.length / 2, ringN };
  }

  window.registerWidget('euv-stochastics', {
    title: 'Photon Shot Noise',
    caption: 'Drag dose, CD and absorption; watch how few photons decide the hole edge and how fast the failure curve climbs when dose drops.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const st = { dose: 30, cd: 30, absorb: 14, thresh: 20 };
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const cssRoot = getComputedStyle(document.documentElement);
      const SANS = cssRoot.getPropertyValue('--sans').trim() || 'sans-serif', MONO = cssRoot.getPropertyValue('--mono').trim() || 'monospace';
      let M = null, big = null, forced = false, strip = [], raf = 0, visible = true, chartW = 0;
      const anim = { p: 1, playing: false, t0: 0 };

      // ---------- controls ----------
      const mkRange = (min, max, step, v) => h('input', { type: 'range', min, max, step, value: v });
      const doseIn = mkRange(10, 80, 1, st.dose), cdIn = mkRange(15, 40, 1, st.cd), absIn = mkRange(5, 40, 1, st.absorb), thrIn = mkRange(5, 30, 1, st.thresh);
      const doseOut = h('output'), cdOut = h('output'), absOut = h('output'), thrOut = h('output');
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Dose'), doseIn, doseOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Contact-hole CD'), cdIn, cdOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Resist absorption'), absIn, absOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Failure threshold f'), thrIn, thrOut));
      const formula = h('div', { class: 'w-formula', html:
        'N<sub>inc</sub> = 0.6785 × dose /nm² &nbsp;·&nbsp; N<sub>abs</sub>/nm² = N<sub>inc</sub> × A &nbsp;·&nbsp; N<sub>edge</sub> = N<sub>abs</sub>/nm² × ring area &nbsp;·&nbsp; σ = √N<sub>edge</sub> &nbsp;·&nbsp; ' +
        'P(fail) ≈ Φ(−f·√N<sub>edge</sub>), f = failure threshold &nbsp;·&nbsp; wph = 1 / (1/230 + k·dose)' });
      const stInc = h('b'), stAbs = h('b'), stHole = h('b'), stEdge = h('b'), stSig = h('b'), stFail = h('b'), stDead = h('b'), stWph = h('b');
      const stat = (b, label) => h('div', { class: 'w-stat' }, b, h('span', null, label));
      const readout = h('div', { class: 'w-readout' },
        stat(stInc, 'incident photons / nm²'), stat(stAbs, 'absorbed photons / nm²'), stat(stHole, 'N absorbed in the hole'),
        stat(stEdge, 'N in the 3 nm edge ring'), stat(stSig, 'σ = √N_edge (relative)'), stat(stFail, 'P(fail) per hole'),
        stat(stDead, 'dead contacts among 10¹⁰'), stat(stWph, 'throughput (overhead-limited)'));

      // ---------- left panel: cross-section ----------
      const DX0 = 135, DX1 = 355, U = (DX1 - DX0) / G, CX = (DX0 + DX1) / 2, IY = 105, IH = 66, FT = 165, FB = 205, YTH = IY - IH * (BG + (1 - BG) * 0.5);
      const xs = svg('svg', { class: 'w-svg', viewBox: '0 0 360 322', role: 'img', 'aria-label': 'Cross-section of an EUV contact-hole exposure' });
      const tx = (x, y, s, attrs) => svg('text', Object.assign({ x, y, 'font-family': 'var(--sans)', 'font-size': 13, fill: 'var(--muted)' }, attrs || {}), s);
      const imgFill = svg('path', { fill: 'var(--accent2)', opacity: 0.16 }), imgLine = svg('path', { fill: 'none', stroke: 'var(--accent2)', 'stroke-width': 2 });
      const imgLeader = svg('line', { stroke: 'var(--accent2)', 'stroke-width': 1, opacity: 0.8 });
      const arrows = svg('g'), edgeL = svg('line', { stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: 0.8 }), edgeR = svg('line', { stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: 0.8 });
      const filmL = svg('polygon', { fill: 'var(--accent)', opacity: 0.45 }), filmR = svg('polygon', { fill: 'var(--accent)', opacity: 0.45 });
      const ringL = svg('polygon', { fill: 'var(--warn)', opacity: 0.85 }), ringR = svg('polygon', { fill: 'var(--warn)', opacity: 0.85 });
      const dimLine = svg('line', { stroke: 'var(--ink)', 'stroke-width': 1 }), dimT1 = svg('line', { stroke: 'var(--ink)', 'stroke-width': 1 }), dimT2 = svg('line', { stroke: 'var(--ink)', 'stroke-width': 1 });
      const dimText = tx(CX, 247, '', { 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 13, fill: 'var(--ink)', 'font-weight': 600 });
      const incText = tx(128, 152, '', { 'text-anchor': 'end' }), absText = tx(128, 195, '', { 'text-anchor': 'end' });
      const note1 = tx(24, 272, '', { fill: 'var(--ink)', 'font-family': 'var(--mono)', 'font-size': 12.5 }), note2 = tx(8, 290, '', { fill: 'var(--ink)', 'font-family': 'var(--mono)', 'font-size': 12.5 }), note3 = tx(8, 308, '', { fill: 'var(--ink)', 'font-family': 'var(--mono)', 'font-size': 12.5 });
      xs.append(
        svg('rect', { x: 0, y: 0, width: 360, height: 322, rx: 6, fill: 'var(--ground)' }),
        tx(8, 17, 'side view — not to scale', { 'font-size': 13 }),
        imgFill, imgLine, imgLeader,
        svg('line', { x1: DX0, y1: YTH, x2: DX1, y2: YTH, stroke: 'var(--muted)', 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }),
        tx(128, 42, 'aerial image', { 'text-anchor': 'end', fill: 'var(--accent2)', 'font-size': 14, 'font-weight': 600 }),
        tx(128, 74, 'clearing threshold', { 'text-anchor': 'end' }),
        arrows, edgeL, edgeR,
        tx(128, 124, '13.5 nm photons', { 'text-anchor': 'end', fill: 'var(--accent2)', 'font-weight': 600 }), tx(128, 138, '92 eV each', { 'text-anchor': 'end' }), incText,
        svg('rect', { x: DX0, y: FB, width: DX1 - DX0, height: 15, fill: 'var(--muted)', opacity: 0.5 }),
        svg('rect', { x: DX0, y: FB + 15, width: DX1 - DX0, height: 34, fill: 'var(--si)', opacity: 0.85 }),
        filmL, filmR, ringL, ringR, dimLine, dimT1, dimT2, dimText,
        tx(128, 181, 'resist film, 30 nm', { 'text-anchor': 'end', fill: 'var(--ink)', 'font-weight': 600 }), absText,
        tx(128, 216, 'underlayer', { 'text-anchor': 'end' }), tx(128, 240, 'silicon wafer', { 'text-anchor': 'end' }),
        svg('rect', { x: 8, y: 263, width: 10, height: 10, fill: 'var(--warn)', opacity: 0.85 }), note1, note2, note3);

      function updateXS() {
        const m = masksFor(st.cd), R = m.R, hw = R * U, xl = CX - hw, xr = CX + hw;
        let d = `M${DX0},${IY}`, dl = '';
        for (let x = DX0; x <= DX1; x += 2) { const r = (x - CX) / U, I = BG + (1 - BG) * Math.exp(-LN2 * (r / R) ** 2), y = (IY - IH * I).toFixed(1); d += ` L${x},${y}`; dl += (dl ? ' L' : 'M') + `${x},${y}`; }
        imgFill.setAttribute('d', d + ` L${DX1},${IY} Z`); imgLine.setAttribute('d', dl);
        const lx = CX - 0.7 * hw, lI = BG + (1 - BG) * Math.exp(-LN2 * 0.49);
        imgLeader.setAttribute('x1', 131); imgLeader.setAttribute('y1', 40); imgLeader.setAttribute('x2', lx); imgLeader.setAttribute('y2', IY - IH * lI);
        arrows.replaceChildren();
        [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9, 1.5, -1.5].forEach(f => {
          const x = CX + f * hw, out = Math.abs(f) > 1;
          arrows.append(svg('line', { x1: x, y1: 116, x2: x, y2: 146, stroke: 'var(--accent2)', 'stroke-width': 2, opacity: out ? 0.3 : 1 }),
            svg('polygon', { points: `${x - 4},${144} ${x + 4},${144} ${x},${152}`, fill: 'var(--accent2)', opacity: out ? 0.3 : 1 }));
        });
        [[edgeL, xl], [edgeR, xr]].forEach(([e, x]) => { e.setAttribute('x1', x); e.setAttribute('x2', x); e.setAttribute('y1', YTH); e.setAttribute('y2', 232); });
        const slope = 5, rw = RING * U;
        filmL.setAttribute('points', `${DX0},${FT} ${xl},${FT} ${xl - slope},${FB} ${DX0},${FB}`);
        filmR.setAttribute('points', `${xr},${FT} ${DX1},${FT} ${DX1},${FB} ${xr + slope},${FB}`);
        ringL.setAttribute('points', `${xl - rw},${FT} ${xl},${FT} ${xl - slope},${FB} ${xl - rw - slope},${FB}`);
        ringR.setAttribute('points', `${xr},${FT} ${xr + rw},${FT} ${xr + rw + slope},${FB} ${xr + slope},${FB}`);
        [dimLine, dimT1, dimT2].forEach(l => { l.setAttribute('y1', 228); l.setAttribute('y2', 228); });
        dimLine.setAttribute('x1', xl); dimLine.setAttribute('x2', xr);
        dimT1.setAttribute('x1', xl); dimT1.setAttribute('x2', xl); dimT1.setAttribute('y1', 224); dimT1.setAttribute('y2', 232);
        dimT2.setAttribute('x1', xr); dimT2.setAttribute('x2', xr); dimT2.setAttribute('y1', 224); dimT2.setAttribute('y2', 232);
        dimText.textContent = `contact hole, CD = ${st.cd} nm`;
        incText.textContent = `≈ ${fmt(M.inc, 0)} per nm²`; absText.textContent = `absorbs ${st.absorb} %`;
        note1.textContent = `edge ring, 3 nm (${m.nRing} nm²): N ≈ ${fmt(M.nEdge, 0)}`;
        note2.textContent = `σ = √N = ${fmt(M.sigma, 0)} (${fmt(100 / M.sigma, 1)} %) — the shot noise`;
        note3.textContent = `${st.thresh} % short = ${fmt(M.f * M.nEdge, 0)} = ${fmt(M.f * M.sigma, 1)} σ → P ${M.pfail < 1e-12 ? '' : '≈ '}${fmtP(M.pfail)}`;
      }

      // ---------- right panel: plan view canvas ----------
      const bigCv = h('canvas', { style: { width: '100%', aspectRatio: '1 / 1', display: 'block', borderRadius: '6px' } });
      function palette() {
        const t = ctx.tokens(), dark = lum(t.ground) < 0.5;
        return { t, ground: dark ? t.ground : t.ink, ink: dark ? t.ink : t.ground, muted: dark ? t.muted : (t.line2 || t.muted), photon: t.accent2, ok: t.ok, bad: t.bad, warn: t.warn };
      }
      function paintPatch(cv, S, n, m, mu, status, pal, bigMode) {
        const W = cv.clientWidth || 100, dpr = window.devicePixelRatio || 1, px = Math.round(W * dpr);
        if (cv.width !== px) { cv.width = px; cv.height = px; }
        const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const s = W / G, c = W / 2;
        g.fillStyle = pal.ground; g.fillRect(0, 0, W, W);
        let counts = S.counts;
        if (n < S.total) { counts = new Uint16Array(G * G); for (let i = 0; i < n; i++) counts[Math.floor(S.pts[2 * i + 1]) * G + Math.floor(S.pts[2 * i])]++; }
        const D = develop(counts, m.T * mu);
        const col = status === 'fail' ? pal.bad : status === 'open' ? pal.ok : pal.warn;
        g.fillStyle = col; g.globalAlpha = 0.22;
        for (let i = 0; i < G * G; i++) if (D.dev[i]) g.fillRect((i % G) * s, Math.floor(i / G) * s, s + 0.3, s + 0.3);
        g.globalAlpha = 0.14; g.fillStyle = pal.ink; g.beginPath(); g.arc(c, c, m.R * s, 0, 2 * Math.PI); g.arc(c, c, (m.R - RING) * s, 0, 2 * Math.PI, true); g.fill();
        const dens = Math.min(1, Math.sqrt(3 / Math.max(mu, 0.01)));   // keep texture visible when photons are dense
        g.globalAlpha = Math.max(0.4, 0.9 * dens); g.fillStyle = pal.photon; const rad = Math.max(0.7, 0.28 * s * dens); g.beginPath();
        // Rasterizing tens of thousands of overlapping arcs blocked normal slider input.
        // Only the decorative photon markers are sampled; counts, dose and development remain exact.
        const markerStride = Math.max(1, Math.ceil(n / (bigMode ? 1400 : 220)));
        for (let i = 0; i < n; i += markerStride) { const x = S.pts[2 * i] * s, y = S.pts[2 * i + 1] * s; g.moveTo(x + rad, y); g.arc(x, y, rad, 0, 2 * Math.PI); }
        g.fill(); g.globalAlpha = 1;
        g.setLineDash([5, 4]); g.lineWidth = bigMode ? 1.5 : 1; g.strokeStyle = pal.ink; g.beginPath(); g.arc(c, c, m.R * s, 0, 2 * Math.PI); g.stroke(); g.setLineDash([]);
        const path = () => { g.beginPath(); for (let i = 0; i < D.segs.length; i += 2) { g.moveTo(D.segs[i][0] * s, D.segs[i][1] * s); g.lineTo(D.segs[i + 1][0] * s, D.segs[i + 1][1] * s); } };
        g.lineCap = 'round'; path(); g.lineWidth = bigMode ? 5 : 3; g.strokeStyle = pal.ground; g.stroke(); path(); g.lineWidth = bigMode ? 2.5 : 1.5; g.strokeStyle = col; g.stroke();
        return D;
      }
      const bigStatus = h('div', { class: 'w-note', style: { marginTop: '6px', minHeight: '2.6em' } });
      function paintBig() {
        const pal = palette(), m = masksFor(st.cd), n = Math.round(anim.p * big.total);
        const ringMean = M.nEdge, dev = (big.ringN - ringMean) / ringMean, fail = dev < -M.f;
        const status = anim.p < 1 ? 'exposing' : fail ? 'fail' : 'open';
        const D = paintPatch(bigCv, big, n, m, M.mu, status, pal, true);
        const g = bigCv.getContext('2d'), W = bigCv.clientWidth || 100, s = W / G, c = W / 2, Rs = m.R * s;
        const line = (x1, y1, x2, y2) => { g.strokeStyle = pal.ink; g.lineWidth = 1; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.globalAlpha = 1; };
        const plate = (x, y, w, hh) => { g.fillStyle = pal.ground; g.globalAlpha = 0.8; g.fillRect(x, y, w, hh); g.globalAlpha = 1; };
        g.textBaseline = 'alphabetic'; g.textAlign = 'left';
        g.font = `600 12px ${MONO}`;
        const l1 = `N ≈ ${fmt(M.nHole, 0)} photons in hole`, l2 = `edge ring, 3 nm: ${fmt(M.nEdge, 0)} ± ${fmt(M.sigma, 0)}`, l1w = g.measureText(l1).width, l2w = g.measureText(l2).width;
        plate(4, 6, Math.max(l1w, l2w, 104) + 8, 48);
        g.fillStyle = pal.ink; g.fillText(l1, 8, 18); g.fillText(l2, 8, 34);
        g.font = `12px ${SANS}`; g.fillStyle = pal.muted; g.fillText('undissolved resist', 8, 50);
        g.textAlign = 'right'; const tl = `target CD ${st.cd} nm`, tw = g.measureText(tl).width, ty = (8 + Math.max(l1w, l2w) + 14 > W - 8 - tw) ? 70 : 18;
        plate(W - 12 - tw, ty - 12, tw + 8, 16); g.fillStyle = pal.ink; g.fillText(tl, W - 8, ty);
        line(W - 8 - tw / 2, ty + 5, c + 0.5 * Rs, c - 0.866 * Rs);
        g.textAlign = 'left'; const dl = D.segs.length ? 'developed edge' : 'no opening yet', dw = g.measureText(dl).width;
        plate(4, W - 22, dw + 8, 16); g.fillStyle = pal.ink; g.fillText(dl, 8, W - 10);
        if (D.segs.length) line(8 + dw + 5, W - 14, c - 0.707 * Rs, c + 0.707 * Rs);
        const badge = status === 'exposing' ? `EXPOSING: ${Math.round(anim.p * 100)} % of dose` : fail ? `FAILED: ring ${pct(dev * 100, 0)} < −${st.thresh} %` : `OPEN: ring ${pct(dev * 100)}`;
        g.font = `600 12px ${SANS}`; const bw = g.measureText(badge).width + 16, fill = status === 'fail' ? pal.bad : status === 'open' ? pal.ok : pal.warn;
        g.fillStyle = fill; g.beginPath(); if (g.roundRect) g.roundRect(W - 8 - bw, W - 32, bw, 22, 4); else g.rect(W - 8 - bw, W - 32, bw, 22); g.fill();
        g.fillStyle = lum(fill) > 0.5 ? pal.ground : pal.ink; g.fillText(badge, W - 8 - bw + 8, W - 17);
        const cdP = 2 * Math.sqrt(D.area / Math.PI);
        bigStatus.textContent = status === 'exposing'
          ? `Exposing: ${fmt(n, 0)} of ${fmt(big.total, 0)} photons have arrived (${Math.round(anim.p * 100)} % of dose). The hole opens only where the blurred count passes the clearing threshold, so it appears late and grows to size.`
          : fail ? `Developed: FAILED. The edge ring got ${fmt(big.ringN, 0)} photons, ${pct(dev * 100)} versus the ${fmt(ringMean, 0)} expected — beyond the −${st.thresh} % limit, so the resist at the edge did not clear: printed ≈ ${fmt(cdP, 0)} nm instead of ${st.cd}.`
            : `Developed: OPEN. The edge ring got ${fmt(big.ringN, 0)} photons (${pct(dev * 100)} versus ${fmt(ringMean, 0)} expected); printed CD ≈ ${fmt(cdP, 1)} nm. The jagged contour is the shot noise after ~${BLUR} nm of blur.`;
      }

      // ---------- buttons, sample strip ----------
      const playBtn = h('button', { class: 'w-btn primary', on: { click: () => anim.playing ? pause() : play() } }, 'Play exposure');
      const resampleBtn = h('button', { class: 'w-btn', on: { click: () => { forced = false; failBtn.textContent = 'Show a failing hole'; resample(); paintAll(); } } }, 'Resample');
      const failBtn = h('button', { class: 'w-btn', on: { click: () => { forced = !forced; failBtn.textContent = forced ? 'Back to a random hole' : 'Show a failing hole'; resample(); paintAll(); } } }, 'Show a failing hole');
      const btnRow = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', margin: '10px 0 4px' } }, playBtn, resampleBtn, failBtn);
      const stripGrid = h('div', { 'data-strip': '1', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: '8px', marginTop: '6px' } });
      const stripCvs = [], stripLbls = [];
      const hoverLine = h('div', { class: 'w-note', style: { marginTop: '4px' } }, 'Hover a sample for its numbers.');
      for (let i = 0; i < N_SAMPLES; i++) {
        const cv = h('canvas', { style: { width: '100%', aspectRatio: '1 / 1', display: 'block', borderRadius: '4px', outline: '2px solid transparent', outlineOffset: '1px' } });
        const lbl = h('div', { style: { fontSize: '12px', fontFamily: 'var(--mono)', textAlign: 'center', marginTop: '3px', whiteSpace: 'nowrap', color: 'var(--muted)' } }, `${i + 1} · open`);
        cv.addEventListener('mouseenter', () => { cv.style.outlineColor = 'var(--accent)'; const S = strip[i]; if (!S) return; const dv = (S.ringN - M.nEdge) / M.nEdge; hoverLine.textContent = `Sample ${i + 1}: edge ring ${fmt(S.ringN, 0)} photons (${pct(dv * 100)} versus ${fmt(M.nEdge, 0)} expected) → ${dv < -M.f ? 'FAILED' : 'open'}; printed CD ≈ ${fmt(S.cdP, 1)} nm.`; });
        cv.addEventListener('mouseleave', () => { cv.style.outlineColor = 'transparent'; hoverLine.textContent = 'Hover a sample for its numbers.'; });
        stripCvs.push(cv); stripLbls.push(lbl); stripGrid.append(h('div', null, cv, lbl));
      }
      const stFailed = h('b'), stExpect = h('b');
      const stripHead = h('div', { class: 'w-readout', style: { margin: '14px 0 0' } }, stat(stFailed, `failed in this batch of ${N_SAMPLES}`), stat(stExpect, `expected failures in ${N_SAMPLES} draws`));

      function resample() {
        const m = masksFor(st.cd);
        if (forced) { const def = M.f + 2 / M.sigma; for (let k = 0; k < 8; k++) { big = drawSample(M.mu, m, def); if (big.ringN < (1 - M.f) * M.nEdge) break; } }
        else big = drawSample(M.mu, m, 0);
        strip = []; for (let i = 0; i < N_SAMPLES; i++) strip.push(drawSample(M.mu, m, 0));
        stopAnim(); anim.p = 1;
      }
      function paintStrip() {
        const pal = palette(), m = masksFor(st.cd); let failed = 0;
        strip.forEach((S, i) => {
          const dv = (S.ringN - M.nEdge) / M.nEdge, fail = dv < -M.f; if (fail) failed++;
          const D = paintPatch(stripCvs[i], S, S.total, m, M.mu, fail ? 'fail' : 'open', pal, false);
          S.cdP = 2 * Math.sqrt(D.area / Math.PI);
          stripLbls[i].textContent = `${i + 1} · ${fail ? 'FAILED' : 'open'}`; stripLbls[i].style.color = fail ? 'var(--bad)' : 'var(--muted)';
        });
        stFailed.textContent = `${failed} / ${N_SAMPLES}`;
        const ex = N_SAMPLES * M.pfail; stExpect.textContent = ex < 1e-12 ? '< 10⁻¹¹' : ex < 0.01 ? sci(ex) : fmt(ex, 2);
      }
      function paintAll() { paintBig(); paintStrip(); }

      // ---------- animation ----------
      function play() { if (anim.p >= 1) anim.p = 0; anim.playing = true; anim.t0 = performance.now() - anim.p * EXPOSURE_MS; playBtn.textContent = 'Pause'; loop(); }
      function pause() { anim.playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; playBtn.textContent = anim.p >= 1 ? 'Replay exposure' : 'Play exposure'; }
      function stopAnim() { anim.playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; playBtn.textContent = 'Play exposure'; }
      function loop() { if (!raf && visible) raf = requestAnimationFrame(frame); }
      function frame(now) {
        raf = 0; if (!anim.playing) return;
        anim.p = Math.min(1, (now - anim.t0) / EXPOSURE_MS); paintBig();
        if (anim.p >= 1) { pause(); return; }
        loop();
      }

      // ---------- chart: P(fail) and throughput versus dose ----------
      const chart = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Failure probability and throughput versus dose', style: { cursor: 'crosshair' } });
      let PX0 = 0, PX1 = 0, PY0 = 0, PY1 = 0, probLine, wphLine, curDot, curDot2, curVLine, hovG, hovLine, hovDot, hovT1, hovT2;
      const xOf = d => PX0 + (PX1 - PX0) * (d - 10) / 70, yProb = p => PY0 + (PY1 - PY0) * (-Math.log10(Math.max(p, 1e-12)) / 12), yWph = w => PY1 - (PY1 - PY0) * (w / 250);
      function buildChart(W) {
        chartW = W; const H = Math.round(Math.min(290, Math.max(220, W * 0.42)));
        chart.setAttribute('viewBox', `0 0 ${W} ${H}`); chart.replaceChildren();
        PX0 = 64; PX1 = W - 62; PY0 = 30; PY1 = H - 46;
        const ct = (x, y, s, attrs) => svg('text', Object.assign({ x, y, 'font-family': 'var(--mono)', 'font-size': 13, fill: 'var(--muted)' }, attrs || {}), s);
        [1, 1e-3, 1e-6, 1e-9, 1e-12].forEach(p => {
          const y = yProb(p);
          chart.append(svg('line', { x1: PX0, y1: y, x2: PX1, y2: y, stroke: 'var(--line)', 'stroke-width': 1 }), ct(PX0 - 8, y + 4, p >= 1 ? '1' : '10' + sup(Math.round(Math.log10(p))), { 'text-anchor': 'end' }));
        });
        [0, 50, 100, 150, 200, 250].forEach(w => chart.append(ct(PX1 + 8, yWph(w) + 4, w)));
        (PX1 - PX0 >= 300 ? [10, 20, 30, 40, 50, 60, 70, 80] : [10, 30, 50, 80]).forEach(d => chart.append(ct(xOf(d), PY1 + 18, d, { 'text-anchor': 'middle' })));
        chart.append(svg('line', { x1: PX0, y1: PY1, x2: PX1, y2: PY1, stroke: 'var(--line)', 'stroke-width': 1 }),
          ct(4, 16, 'P(fail) per hole', { 'font-family': 'var(--sans)', fill: 'var(--bad)', 'font-weight': 600 }),
          ct(W - 4, 16, 'wafers / hour', { 'font-family': 'var(--sans)', 'text-anchor': 'end', fill: 'var(--si)', 'font-weight': 600 }),
          ct((PX0 + PX1) / 2, H - 10, 'dose (mJ/cm²)', { 'font-family': 'var(--sans)', 'text-anchor': 'middle', fill: 'var(--ink)' }));
        probLine = svg('polyline', { fill: 'none', stroke: 'var(--bad)', 'stroke-width': 2.2 });
        wphLine = svg('polyline', { fill: 'none', stroke: 'var(--si)', 'stroke-width': 2, 'stroke-dasharray': '5 4' });
        curVLine = svg('line', { y1: PY0, y2: PY1, stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.7 });
        curDot = svg('circle', { r: 4.5, fill: 'var(--bad)', stroke: 'var(--ground)', 'stroke-width': 1.5 }); curDot2 = svg('circle', { r: 4.5, fill: 'var(--si)', stroke: 'var(--ground)', 'stroke-width': 1.5 });
        hovLine = svg('line', { y1: PY0, y2: PY1, stroke: 'var(--muted)', 'stroke-width': 1 }); hovDot = svg('circle', { r: 3.5, fill: 'var(--ink)' });
        hovT1 = ct(0, PY0 + 16, '', { 'text-anchor': 'middle', fill: 'var(--ink)', 'font-weight': 600 }); hovT2 = ct(0, PY0 + 32, '', { 'text-anchor': 'middle', fill: 'var(--ink)' });
        hovG = svg('g', { style: { display: 'none' } }, hovLine, hovDot, hovT1, hovT2);
        chart.append(svg('circle', { cx: xOf(REF_DOSE), cy: yWph(REF_WPH), r: 4, fill: 'var(--si)', opacity: 0.8 }), probLine, wphLine, curVLine, curDot, curDot2, hovG);
      }
      function pAt(d) { const N = d * INC_PER_MJ * st.absorb / 100 * masksFor(st.cd).nRing; return Qz(M.f * Math.sqrt(N)); }
      function updateChart() {
        const pp = [], wp = [];
        for (let d = 10; d <= 80; d += 1) { pp.push(xOf(d) + ',' + yProb(pAt(d))); wp.push(xOf(d) + ',' + yWph(wphOf(d))); }
        probLine.setAttribute('points', pp.join(' ')); wphLine.setAttribute('points', wp.join(' '));
        const x = xOf(st.dose); curVLine.setAttribute('x1', x); curVLine.setAttribute('x2', x);
        curDot.setAttribute('cx', x); curDot.setAttribute('cy', yProb(M.pfail)); curDot2.setAttribute('cx', x); curDot2.setAttribute('cy', yWph(M.wph));
      }
      chart.addEventListener('mousemove', e => {
        const r = chart.getBoundingClientRect(); if (!r.width) return;
        const x = (e.clientX - r.left) * chartW / r.width, d = Math.round(Math.min(80, Math.max(10, 10 + 70 * (x - PX0) / (PX1 - PX0))));
        const xd = xOf(d), p = pAt(d), lx = Math.min(PX1 - 90, Math.max(PX0 + 90, xd));
        hovLine.setAttribute('x1', xd); hovLine.setAttribute('x2', xd); hovDot.setAttribute('cx', xd); hovDot.setAttribute('cy', yProb(p));
        hovT1.setAttribute('x', lx); hovT2.setAttribute('x', lx); hovT1.textContent = `${d} mJ/cm²`; hovT2.textContent = `P ${fmtP(p)} · ${fmt(wphOf(d), 0)} wph`;
        hovG.style.display = '';
      });
      chart.addEventListener('mouseleave', () => { hovG.style.display = 'none'; });
      const legend = h('div', { class: 'w-legend' },
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--bad)', flex: '0 0 12px', alignSelf: 'center' } }), 'P(fail) per hole = Φ(−f·√N_edge) at this CD, absorption and threshold; dots = current dose'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--si)', flex: '0 0 12px', alignSelf: 'center' } }), 'wph = 1/(1/230 + k·dose): exposure time + fixed per-wafer overhead; ref. 160 wph @ 30 mJ/cm²'));

      // ---------- update ----------
      function update() {
        st.dose = +doseIn.value; doseOut.textContent = st.dose + ' mJ/cm²';
        st.cd = +cdIn.value; cdOut.textContent = st.cd + ' nm';
        st.absorb = +absIn.value; absOut.textContent = st.absorb + ' %';
        st.thresh = +thrIn.value; thrOut.textContent = '−' + st.thresh + ' %';
        const m = masksFor(st.cd), inc = st.dose * INC_PER_MJ, mu = inc * st.absorb / 100, nEdge = mu * m.nRing, sigma = Math.sqrt(nEdge), f = st.thresh / 100;
        M = { inc, mu, nEdge, nHole: mu * m.holeI, sigma, f, pfail: Qz(f * sigma), wph: wphOf(st.dose) };
        stInc.textContent = fmt(inc, 1); stAbs.textContent = fmt(mu, 2); stHole.textContent = fmt(M.nHole, 0); stEdge.textContent = fmt(nEdge, 0);
        stSig.textContent = `${fmt(sigma, 0)} (${fmt(100 / sigma, 1)} %)`; stFail.textContent = fmtP(M.pfail);
        const dead = M.pfail * CONTACTS; stDead.textContent = M.pfail < 1e-12 ? '< 0.01' : dead < 1 ? dead.toPrecision(2) : dead < 1e5 ? fmt(dead, dead < 10 ? 1 : 0) : sci(dead);
        stWph.textContent = fmt(M.wph, 0) + ' wph';
        resample(); updateXS(); paintAll(); updateChart();
      }
      [doseIn, cdIn, absIn, thrIn].forEach(inp => inp.addEventListener('input', update));

      // ---------- assemble ----------
      const head = s => h('h5', { style: { margin: '0 0 6px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' } }, s);
      const grid = h('div', { class: 'w-grid2', style: { marginTop: '12px' } },
        h('div', null, head('① What the light does'), xs),
        h('div', null, head('② What the developer sees (60 × 60 nm)'), bigCv, bigStatus, h('p', { class: 'w-note' }, 'Photon dots are sampled for visual clarity. Dose, photon counts and the developed contour use the complete simulated sample.')));
      const chartHost = h('div', { style: { marginTop: '4px' } }, chart);
      el.append(controls, formula, readout, grid, btnRow, stripHead, stripGrid, hoverLine,
        h('h5', { style: { margin: '18px 0 4px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' } }, 'The stochastic cliff: push dose down and failures rise exponentially'),
        chartHost, legend,
        h('div', { class: 'w-note' }, 'Terms: "stochastic" means governed by chance — here the random arrival of photons, which fluctuates by √N around a mean of N. The "aerial image" is the light pattern the mirrors project onto the resist: a soft blob for a contact hole, brightest at the centre, at half intensity at the target edge, and the resist dissolves wherever the absorbed dose exceeds its clearing threshold. "Secondary-electron blur" is the ~2–4 nm radius over which the electrons kicked out by each 92 eV photon spread its chemical effect; the plan view blurs the photon map by 3 nm before applying the threshold. Simplifications: the model counts only photon shot noise in a 3 nm ring just inside the hole edge (268 nm² at CD 30, about the module\'s 16 × 16 nm = 256 nm² edge pixel) and calls the hole failed when that ring falls f short of its mean, the Gaussian tail Φ(−f·√N); the plan view normalises the image so the ring receives the nominal dose. Real resist chemistry (acid and quencher statistics, resist blur) adds variance, so real failure rates can differ from this estimate by orders of magnitude — but the shape of the cliff is right. Six random draws almost never show a 10⁻⁸ event; fabs find these defects by e-beam scanning billions of contacts.'));

      const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && anim.playing) { anim.t0 = performance.now() - anim.p * EXPOSURE_MS; loop(); } });
      io.observe(el);
      let lastW = 0;
      const ro = new ResizeObserver(() => { const W = el.clientWidth; if (!W || W === lastW) return; lastW = W; buildChart(chartHost.clientWidth || W); updateChart(); paintAll(); });
      ro.observe(el);
      ctx.onTheme(() => { paintAll(); });

      buildChart(el.clientWidth || 640); lastW = el.clientWidth;
      update();
      if (!reduced) { anim.p = 0.6; play(); }
      return () => { stopAnim(); io.disconnect(); ro.disconnect(); };
    }
  });
})();
