/* Widget: rayleigh — "Resolution Explorer" (Module 07) */
(function () {
  'use strict';
  const K2 = 0.6;      // depth-of-focus process factor (the module's worked example; typical 0.5–1)
  const THR = 0.5;     // resist threshold = the mean of the aerial image (dose-to-size)
  const DELTA = 0.1;   // half-width of the resist's switching band around the threshold (its chemical contrast)
  const POLE = 0.25;   // illustrative source-pole radius (fraction of NA) used for the contrast model
  const SOURCES = [
    { id: 'g',    name: 'g-line 436 nm',        lambda: 436,   naMin: 0.30, naMax: 0.45, naDefault: 0.40, medium: 'air, n = 1.00' },
    { id: 'i',    name: 'i-line 365 nm',        lambda: 365,   naMin: 0.30, naMax: 0.65, naDefault: 0.60, medium: 'air, n = 1.00' },
    { id: 'krf',  name: 'KrF 248 nm',           lambda: 248,   naMin: 0.30, naMax: 0.93, naDefault: 0.85, medium: 'air, n = 1.00' },
    { id: 'arf',  name: 'ArF dry 193 nm',       lambda: 193.4, naMin: 0.30, naMax: 0.93, naDefault: 0.90, medium: 'air, n = 1.00' },
    { id: 'arfi', name: 'ArF immersion',        lambda: 193.4, naMin: 0.90, naMax: 1.35, naDefault: 1.35, medium: 'water, n = 1.44', water: true },
    { id: 'euv',  name: 'EUV 13.5 nm',          lambda: 13.5,  naMin: 0.33, naMax: 0.55, naDefault: 0.33, medium: 'vacuum', euv: true, step: 0.22 },
  ];
  const GEN_BARS = [
    { name: 'g-line',   short: ['g'],           lambda: 436,   na: 0.45, src: 'g' },
    { name: 'i-line',   short: ['i'],           lambda: 365,   na: 0.65, src: 'i' },
    { name: 'KrF',      short: ['KrF'],         lambda: 248,   na: 0.93, src: 'krf' },
    { name: 'ArF dry',  short: ['ArF'],         lambda: 193.4, na: 0.93, src: 'arf' },
    { name: 'ArF imm.', short: ['193i'],        lambda: 193.4, na: 1.35, src: 'arfi' },
    { name: 'EUV 0.33', short: ['EUV', '0.33'], lambda: 13.5,  na: 0.33, src: 'euv' },
    { name: 'EUV 0.55', short: ['EUV', '0.55'], lambda: 13.5,  na: 0.55, src: 'euv' },
  ];
  const NEEDS = [
    { hp: 40, what: '193i, single exposure' },
    { hp: 20, what: '193i SAQP, or EUV single exposure' },
    { hp: 13, what: 'EUV (single or double patterning)' },
  ];
  const SANS = 'var(--sans)', MONO = 'var(--mono)';
  const nm = v => v >= 1000 ? (v / 1000).toFixed(2) + ' µm' : v.toFixed(1) + ' nm';
  const f2 = v => v.toFixed(2);
  const tw = (s, size = 12, mono = false) => s.length * size * (mono ? 0.62 : 0.56);           // rough text width
  const fit = (avail, opts, size, mono) => opts.find(o => tw(o, size, mono) <= avail) || opts[opts.length - 1];

  window.registerWidget('rayleigh', {
    title: 'Resolution Explorer',
    caption: 'Pick a light source, then drag NA and k1: the half-pitch shrinks as 1/NA but the depth of focus collapses as 1/NA², and below k1 = 0.5 the illumination has to tilt to squeeze two diffraction orders into the lens.',
    mount(el, ctx) {
      const { h, svg } = ctx;
      const st = { src: SOURCES[4], na: 1.35, k1: 0.28 };
      const measure = () => { const cs = getComputedStyle(el); const w = el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0); return Math.max(280, Math.round(w || 700)); };  // content-box width in px
      let W = measure(), narrow = W < 560, roRaf = 0;

      // ---------- controls / readout ----------
      const srcSel = h('select', { style: { minWidth: 0, maxWidth: '100%' } }, ...SOURCES.map(s => h('option', { value: s.id }, s.name)));
      const lamOut = h('output'), naOut = h('output'), k1Out = h('output');
      const naSlider = h('input', { type: 'range' });
      const k1Slider = h('input', { type: 'range', min: 0.25, max: 0.8, step: 0.01, value: st.k1 });
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Source'), srcSel, lamOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'NA'), naSlider, naOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'k1'), k1Slider, k1Out));
      const stCD = h('b'), stPitch = h('b'), stDOF = h('b'), stDOFl = h('span'), stBeams = h('b'), stCon = h('b');
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, stCD, h('span', null, 'half-pitch CD (1 exposure)')),
        h('div', { class: 'w-stat' }, stPitch, h('span', null, 'pitch = 2 × CD')),
        h('div', { class: 'w-stat' }, stDOF, stDOFl),
        h('div', { class: 'w-stat' }, stBeams, h('span', null, 'beams inside the lens')),
        h('div', { class: 'w-stat' }, stCon, h('span', null, 'contrast (illustrative)')));
      const formula = h('div', { class: 'w-formula', html: 'CD = k<sub>1</sub> · λ / NA &nbsp;&nbsp;·&nbsp;&nbsp; DOF = k<sub>2</sub> · λ / NA² &nbsp; (k<sub>2</sub> = 0.6, typical 0.5–1) &nbsp;&nbsp;·&nbsp;&nbsp; NA&nbsp;=&nbsp;n&nbsp;·&nbsp;sin&nbsp;θ' });
      const head5 = txt => h('h5', { style: { margin: '18px 0 6px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' } }, txt);
      const chartHead = head5('');
      const chartInfo = h('div', { class: 'w-note', style: { marginTop: '4px', minHeight: '2.6em' } });
      const optics = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Cross-section of a projection scanner: illumination, reticle grating, diffraction orders, lens pupil, immersion medium, aerial image, resist lines and depth of focus' });
      const chart = svg('svg', { class: 'w-svg rayleigh-chart', role: 'img', 'aria-label': 'Half-pitch each lithography generation reaches at the current k1' });
      const tbody = h('tbody');
      const table = h('table', null, h('thead', null, h('tr', null, h('th', null, 'half-pitch'), h('th', null, 'what it takes'), h('th', null, 'with your setting'))), tbody);

      // ---------- drawing helpers ----------
      const T = (root, x, y, str, o = {}) => { const t = svg('text', Object.assign({ x, y, 'font-family': o.mono ? MONO : SANS, 'font-size': o.size || (o.mono ? 11 : 12), fill: o.fill || 'var(--muted)', 'text-anchor': o.anchor || 'start', 'font-weight': o.bold ? 600 : null }, o.attrs || {}), str); root.append(t); return t; };
      const L = (root, x1, y1, x2, y2, a) => root.append(svg('line', Object.assign({ x1, y1, x2, y2, stroke: 'var(--line2)', 'stroke-width': 1 }, a)));
      const R = (root, x, y, w, hh, a) => root.append(svg('rect', Object.assign({ x, y, width: Math.max(0, w), height: Math.max(0, hh) }, a)));
      const head = (root, x, y, dx, dy, color, size = 7) => { const l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, bx = x - ux * size, by = y - uy * size; root.append(svg('polygon', { points: `${x},${y} ${bx - uy * size * 0.45},${by + ux * size * 0.45} ${bx + uy * size * 0.45},${by - ux * size * 0.45}`, fill: color })); };

      // ---------- physics ----------
      const curCD = () => st.k1 * st.src.lambda / st.na;
      const curDOF = () => K2 * st.src.lambda / (st.na * st.na);
      const spacing = () => st.na / (2 * st.k1);                       // sin θ between neighbouring orders = λ / pitch
      const tilt = () => st.k1 < 0.5 ? spacing() - st.na : 0;          // illumination tilt (sin θ) that puts the +1 order just inside the pupil
      const contrast = () => st.k1 >= 0.5 ? 1 : Math.max(0, Math.min(1, (st.na - tilt()) / (POLE * st.na))); // part of the source pole still inside the pupil
      const orders = () => [-1, 0, 1].map(m => { const s = -tilt() + m * spacing(); return { m, s, pass: Math.abs(s) <= st.na + 1e-9 }; });

      // ---------- optics cross-section ----------
      function paintOptics() {
        optics.replaceChildren();
        const cx = W / 2, S = 0.148 * W;                                   // px per unit of sin θ (NA 1.35 spans 40 % of the width)
        const na = st.na, k1 = st.k1, src = st.src, mod = contrast(), cd = curCD(), dof = curDOF();
        const imgW = Math.max(120, Math.min(270, 0.42 * W)), X0 = cx - imgW / 2, X1 = cx + imgW / 2;
        const N = Math.max(3, Math.min(5, Math.round(3 * Math.pow(80 / (2 * cd), 0.25)))), p = imgW / N;   // fringes drawn: more of them as the pitch shrinks
        const dofRight = (W - 8) - (X1 + 26) >= 140;                       // room for the DOF labels beside the bracket? else they go under the wafer
        const dimRows = narrow ? 2 : 1;                                    // dimension labels on one row (side by side) or two
        const Y = { illTop: 6, illBot: 46, retTop: 48, retBot: 63, ordLbl: 160, houseTop: 164, lensTop: 170, pupil: 187, lensBot: 204, houseBot: 210, imgTop: 256, imgBot: 290, dimLbl: 302 };
        Y.dim = Y.dimLbl + 14 * (dimRows - 1) + 7; Y.resTop = Y.dim + 5; Y.resBot = Y.resTop + 30; Y.wafBot = Y.resBot + 22;   // resist drawn 30 px = 100 nm
        const H = Y.wafBot + (dofRight ? 0 : 34); optics.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const gw = (narrow ? 0.30 : 0.34) * W, hl = 0.04 * W, hr = 0.96 * W;
        const pHW = na * S, lensL = cx - pHW, lensR = cx + pHW;
        const ords = orders(), tl = tilt(), run = Y.pupil - Y.retBot;
        const g = svg('g'); optics.append(g);

        // medium between lens and wafer (water for immersion) and the focus band
        if (src.water) R(g, hl, Y.lensBot - 4, hr - hl, Y.resTop - Y.lensBot + 4, { fill: 'var(--si)', opacity: 0.16 });
        T(g, hl + 6, 236, src.medium, { fill: src.water ? 'var(--ink)' : 'var(--muted)' });
        const xb = X1 + 18, mid = (Y.resTop + Y.resBot) / 2, hpx = dof / 100 * (Y.resBot - Y.resTop), capT = Y.houseBot + 4, capB = Y.wafBot - 4;
        let top = mid - hpx / 2, bot = mid + hpx / 2; const clipT = top < capT, clipB = bot > capB;
        top = Math.max(top, capT); bot = Math.min(bot, capB);
        R(g, X0 - 4, top, imgW + 8, bot - top, { fill: 'var(--ok)', opacity: 0.1 });

        // lens housing, aperture stop (the pupil gap scales with NA), glass
        R(g, hl, Y.houseTop, hr - hl, Y.houseBot - Y.houseTop, { fill: 'none', stroke: 'var(--line2)', rx: 6 });
        R(g, hl + 1, Y.pupil - 4, lensL - 3 - hl - 1, 8, { fill: 'var(--muted)', opacity: 0.75 });
        R(g, lensR + 3, Y.pupil - 4, hr - 1 - lensR - 3, 8, { fill: 'var(--muted)', opacity: 0.75 });
        g.append(svg('path', { d: `M${lensL},${Y.pupil} Q${cx},${Y.lensTop - 12} ${lensR},${Y.pupil} Q${cx},${Y.lensBot + 12} ${lensL},${Y.pupil} Z`, fill: src.euv ? 'var(--accent2)' : 'var(--si)', opacity: 0.35, stroke: src.euv ? 'var(--accent2)' : 'var(--si)', 'stroke-width': 1.2 }));
        const availR = hr - 8 - (lensR + 6), availL = lensL - 6 - (hl + 8);
        T(g, hr - 8, Y.houseTop + 14, fit(availR, src.euv ? ['mirrors (drawn as a lens)', 'mirrors'] : ['projection lens', 'lens']), { anchor: 'end', fill: 'var(--ink)' });
        T(g, hr - 8, Y.houseBot - 6, fit(availR, ['NA = n·sin θ = ' + f2(na), 'NA = ' + f2(na), 'NA ' + f2(na)], 11, true), { anchor: 'end', mono: true, fill: 'var(--ink)' });
        T(g, hl + 8, Y.houseBot - 6, fit(availL, ['aperture stop, opening ∝ NA', 'aperture stop ∝ NA', 'pupil ∝ NA', 'pupil']));

        // reticle: quartz plate with a chrome grating on its underside
        R(g, cx - gw / 2, Y.retTop, gw, 10, { fill: 'var(--panel2)', stroke: 'var(--line2)' });
        const per = narrow ? 10 : 14;
        for (let x = cx - gw / 2 + per / 2; x + per / 2 <= cx + gw / 2; x += per) R(g, x, Y.retTop + 10, per / 2, 5, { fill: 'var(--ink)', opacity: 0.85 });
        const rx = cx + gw / 2 + 10, availRet = W - 8 - rx;
        T(g, rx, Y.retTop + 6, fit(availRet, ['reticle (photomask)', 'reticle (mask)', 'reticle']), { fill: 'var(--ink)' });
        T(g, rx, Y.retTop + 20, fit(availRet, ['chrome grating, 4× wafer pitch', 'chrome lines, 4× pitch', '4× wafer pitch', '4× pitch']));

        // illumination: a parallel beam, vertical for on-axis, tilted (dipole pole) below k1 = 0.5
        const d = narrow ? 16 : 22, drift = tl * S * (Y.illBot - Y.illTop) / run;
        [-d, 0, d].forEach(off => { const x = cx + off; L(g, x + drift, Y.illTop, x, Y.illBot, { stroke: 'var(--accent)', 'stroke-width': 1.6 }); head(g, x, Y.illBot, -drift, Y.illBot - Y.illTop, 'var(--accent)'); });
        const availIll = cx - d - 18;
        T(g, 8, 16, 'illumination', { fill: 'var(--ink)' });
        if (tl > 0) {
          T(g, 8, 30, fit(availIll, ['off-axis dipole (k1 < 0.5):', 'off-axis dipole']));
          T(g, 8, 44, fit(availIll, ['0th order pushed toward the pupil edge', 'tilted so 0 and +1 fit', '(k1 < 0.5)']));
        } else {
          T(g, 8, 30, fit(availIll, ['on-axis (k1 ≥ 0.5):', 'on-axis']));
          T(g, 8, 44, fit(availIll, ['−1, 0 and +1 all fit inside the pupil', 'all three orders fit', '(k1 ≥ 0.5)']));
        }

        // diffraction orders from the grating to the pupil plane, then converging on the wafer
        const xAt = (xp, y) => cx + (xp - cx) * (y - Y.retBot) / run;
        ords.forEach(o => {
          const xp = cx + o.s * S;
          if (o.pass) {
            L(g, cx, Y.retBot, xp, Y.pupil, { stroke: 'var(--accent)', 'stroke-width': 1.6 });
            L(g, xp, Y.pupil, cx, Y.imgTop, { stroke: 'var(--accent)', 'stroke-width': 1.6 });
          } else {
            let xe, ye;
            if (xp < 12 || xp > W - 12) { xe = xp < cx ? 12 : W - 12; ye = Y.retBot + run * (xe - cx) / (xp - cx); }
            else { ye = Y.pupil - 4; xe = xAt(xp, ye); }
            L(g, cx, Y.retBot, xe, ye, { stroke: 'var(--bad)', 'stroke-width': 1.4, 'stroke-dasharray': '5 4' });
            const xm = cx + 0.6 * (xe - cx), ym = Y.retBot + 0.6 * (ye - Y.retBot);
            T(g, xm + (o.m < 0 ? -6 : 6), ym + 4, (o.m < 0 ? '−1' : '+1') + ' lost', { mono: true, fill: 'var(--bad)', anchor: o.m < 0 ? 'end' : 'start' });
          }
        });
        const pass = ords.filter(o => o.pass), sp = spacing() * S * (Y.ordLbl - Y.retBot) / run;
        if (sp >= 18) pass.forEach(o => T(g, xAt(cx + o.s * S, Y.ordLbl) + (o.m < 0 ? -5 : 5), Y.ordLbl, o.m < 0 ? '−1' : o.m > 0 ? '+1' : '0', { bold: true, fill: 'var(--ink)', anchor: o.m < 0 ? 'end' : 'start' }));
        else T(g, Math.max(...pass.map(o => xAt(cx + o.s * S, Y.ordLbl))) + 6, Y.ordLbl, 'orders ' + pass.map(o => o.m > 0 ? '+1' : String(o.m)).join(', '), { bold: true, fill: 'var(--ink)' });

        // acceptance cone and its half-angle θ
        L(g, cx, Y.imgTop, lensL, Y.pupil, { stroke: 'var(--muted)', 'stroke-dasharray': '3 3' });
        L(g, cx, Y.imgTop, lensR, Y.pupil, { stroke: 'var(--muted)', 'stroke-dasharray': '3 3' });
        const alpha = Math.atan2(pHW, Y.imgTop - Y.pupil), ra = 24;
        L(g, cx, Y.imgTop, cx, Y.imgTop - ra - 8, { stroke: 'var(--ink)', 'stroke-dasharray': '2 2', opacity: 0.6 });
        g.append(svg('path', { d: `M${cx},${Y.imgTop - ra} A${ra},${ra} 0 0 1 ${(cx + ra * Math.sin(alpha)).toFixed(1)},${(Y.imgTop - ra * Math.cos(alpha)).toFixed(1)}`, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1 }));
        const b = alpha + 0.2;
        T(g, cx + (ra + 6) * Math.sin(b), Y.imgTop - (ra + 6) * Math.cos(b) + 4, 'θ', { fill: 'var(--ink)', size: 13 });

        // aerial image I(x) above the resist, with the threshold and the resist's switching band
        const yI = I => Y.imgTop + (1 - I) * (Y.imgBot - Y.imgTop);
        R(g, X0, yI(THR + DELTA), imgW, yI(THR - DELTA) - yI(THR + DELTA), { fill: 'var(--muted)', opacity: 0.14 });
        L(g, X0, yI(THR), X1, yI(THR), { stroke: 'var(--ink)', 'stroke-dasharray': '4 3', opacity: 0.8 });
        const pts = [];
        for (let x = X0; x <= X1 + 0.01; x += 2) pts.push(`${x.toFixed(1)},${yI(0.5 + 0.5 * mod * Math.cos(2 * Math.PI * (x - X0) / p)).toFixed(1)}`);
        g.append(svg('polyline', { points: pts.join(' '), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }));
        const availA = X0 - 8 - 6;
        T(g, X0 - 8, Y.imgTop + 2, fit(availA, ['aerial image: intensity I(x)', 'aerial image I(x)', 'intensity']), { anchor: 'end' });
        T(g, X0 - 8, yI(THR) + 4, 'threshold', { anchor: 'end' });
        T(g, X0 - 8, Y.dim + 3, fit(availA, ['← position across wafer', '← position']), { anchor: 'end' });

        // wafer, resist film (positive tone: resist survives where the image is dark)
        R(g, 0, Y.resBot, W, Y.wafBot - Y.resBot, { fill: 'var(--si)' });
        T(g, 8, Y.wafBot - 7, fit(X0 - 16, ['silicon wafer', 'wafer (Si)']), { fill: 'var(--ground)' });
        R(g, 0, Y.resTop, X0, Y.resBot - Y.resTop, { fill: 'var(--cu)', opacity: 0.22 });
        R(g, X1, Y.resTop, W - X1, Y.resBot - Y.resTop, { fill: 'var(--cu)', opacity: 0.22 });
        const resLbl = fit(X0 - 16, ['photoresist film, ~100 nm', 'resist ~100 nm', 'resist']);
        T(g, 8, Y.resTop + (resLbl === 'resist' ? 12 : 19), resLbl);
        if (resLbl === 'resist') T(g, 8, Y.resTop + 26, '~100 nm', { mono: true });
        if (mod > 2 * DELTA) {
          const inner = (Math.PI - Math.acos(-2 * DELTA / mod)) / (2 * Math.PI) * p;   // half-width of solid resist (I < threshold − δ)
          const outer = (Math.PI - Math.acos(2 * DELTA / mod)) / (2 * Math.PI) * p;    // half-width incl. the partly-switched edge zone (I < threshold + δ)
          for (let i = 0; i < N; i++) {
            const c = X0 + (i + 0.5) * p;
            R(g, c - outer, Y.resTop, outer - inner, Y.resBot - Y.resTop, { fill: 'var(--cu)', opacity: 0.45 });
            R(g, c + inner, Y.resTop, outer - inner, Y.resBot - Y.resTop, { fill: 'var(--cu)', opacity: 0.45 });
            R(g, c - inner, Y.resTop, 2 * inner, Y.resBot - Y.resTop, { fill: 'var(--cu)' });
          }
          // dimensions: CD on the first line, pitch between the last two line centres
          const c0 = X0 + 0.5 * p, cA = X1 - 1.5 * p, cB = X1 - 0.5 * p, y = Y.dim;
          const dim = (xa, xc) => { L(g, xa, y, xc, y, { stroke: 'var(--ink)' }); head(g, xa, y, -1, 0, 'var(--ink)', 6); head(g, xc, y, 1, 0, 'var(--ink)', 6); L(g, xa, y - 5, xa, y + 5, { stroke: 'var(--ink)' }); L(g, xc, y - 5, xc, y + 5, { stroke: 'var(--ink)' }); };
          dim(c0 - p / 4, c0 + p / 4); dim(cA, cB);
          T(g, X0, Y.dimLbl, 'CD = ' + nm(cd), { mono: true, fill: 'var(--ink)' });
          T(g, X1, Y.dimLbl + 14 * (dimRows - 1), 'pitch = ' + nm(2 * cd), { mono: true, fill: 'var(--ink)', anchor: 'end' });
        } else {
          R(g, X0, Y.resTop, imgW, Y.resBot - Y.resTop, { fill: 'var(--cu)', opacity: 0.3 });
          const msg = fit(imgW - 4, ['no pattern: image swing smaller than the resist band', 'no pattern: contrast too low', 'no pattern:']);
          T(g, cx, Y.dimLbl + 2, msg, { fill: 'var(--bad)', anchor: 'middle', bold: true });
          if (msg === 'no pattern:' && dimRows === 2) T(g, cx, Y.dimLbl + 16, 'contrast too low', { fill: 'var(--bad)', anchor: 'middle', bold: true });
        }

        // depth of focus bracket, drawn to the same scale as the 100 nm resist
        L(g, xb, top, xb, bot, { stroke: 'var(--ok)', 'stroke-width': 2 });
        if (clipT) head(g, xb, top, 0, -1, 'var(--ok)', 8); else L(g, xb - 5, top, xb + 5, top, { stroke: 'var(--ok)', 'stroke-width': 2 });
        if (clipB) head(g, xb, bot, 0, 1, 'var(--ok)', 8); else L(g, xb - 5, bot, xb + 5, bot, { stroke: 'var(--ok)', 'stroke-width': 2 });
        if (dofRight) ['depth of focus', 'DOF = k2·λ/NA²', '= ' + nm(dof) + ' (±' + nm(dof / 2) + ')'].forEach((s, i) => T(g, xb + 8, Y.dimLbl + 14 * i, s, i ? { mono: true, fill: i === 2 ? 'var(--ink)' : null } : { fill: 'var(--ink)' }));
        else {
          T(g, 8, Y.wafBot + 14, fit(W - 16, ['depth of focus (green bracket, same scale as the resist)', 'depth of focus (green bracket)']), { fill: 'var(--ink)' });
          T(g, 8, Y.wafBot + 28, 'DOF = k2·λ/NA² = ' + nm(dof) + ' (±' + nm(dof / 2) + ')', { mono: true, fill: 'var(--ink)' });
        }
      }

      // ---------- generations bar chart ----------
      const barEls = [];
      const infoDefault = () => `Half-pitch in nm (log scale) at k1 = ${f2(st.k1)}, each generation at its max production NA. Hover a bar for its numbers; click it to load that generation into the sliders.`;
      function paintChart() {
        chart.replaceChildren(); barEls.length = 0;
        const CH = 184; chart.setAttribute('viewBox', `0 0 ${W} ${CH}`);
        const PL = 56, PR = W - 10, PT = 30, PB = 148;
        const lg0 = Math.log10(2.5), lg1 = Math.log10(1200);
        const yOf = v => PB - (PB - PT) * (Math.log10(Math.max(2.5, Math.min(1200, v))) - lg0) / (lg1 - lg0);
        const g = svg('g'); chart.append(g);
        [3, 10, 30, 100, 300, 1000].forEach(v => { const y = yOf(v); L(g, PL, y, PR, y, { stroke: 'var(--line)' }); T(g, PL - 6, y + 4, v + ' nm', { mono: true, anchor: 'end' }); });
        L(g, PL, PT, PL, PB, { stroke: 'var(--line2)' }); L(g, PL, PB, PR, PB, { stroke: 'var(--line2)' });
        const n = GEN_BARS.length, slot = (PR - PL) / n, bw = Math.min(slot * 0.62, 64), boxes = [], grps = [];
        GEN_BARS.forEach((bar, i) => {
          const v = st.k1 * bar.lambda / bar.na, y = yOf(v), x = PL + slot * i + (slot - bw) / 2, xc = x + bw / 2;
          const cur = bar.src === st.src.id && Math.abs(bar.na - st.na) < 0.006;
          const grp = svg('g', { 'data-bar': i, style: 'cursor:pointer', on: { mouseenter: () => hoverBar(i), mouseleave: () => hoverBar(-1), click: () => selectBar(i) } });
          grp.append(svg('title', null, `${bar.name}: λ = ${bar.lambda} nm, NA = ${f2(bar.na)}, k1 = ${f2(st.k1)} → ${nm(v)} half-pitch. Click to select.`));
          const rect = svg('rect', { x, y, width: bw, height: PB - y, rx: 2, fill: cur ? 'var(--accent)' : 'var(--si)', opacity: cur ? 1 : 0.7, stroke: 'none', 'stroke-width': 2 });
          grp.append(rect);
          if (narrow) bar.short.forEach((s, j) => T(grp, xc, PB + 16 + 13 * j, s, { anchor: 'middle', size: 11, fill: cur ? 'var(--ink)' : null }));
          else { T(grp, xc, PB + 16, bar.name, { anchor: 'middle', fill: cur ? 'var(--ink)' : null, bold: cur }); T(grp, xc, PB + 30, 'NA ' + f2(bar.na), { anchor: 'middle', mono: true }); }
          g.append(grp); barEls.push({ rect, cur, bar, v }); grps.push({ xc, y, v, cur });
          boxes.push({ x0: xc - 18, x1: xc + 18, y: y - 5 });
        });
        // "your setting" marker line sits between the bars and their value labels, so it never strikes through a number
        const cd = curCD(), ym = yOf(cd), lab = (narrow ? 'you: ' : 'your setting: ') + nm(cd), lw = tw(lab, 11, true) + 8;
        L(g, PL, ym, PR, ym, { stroke: 'var(--ink)', 'stroke-dasharray': '6 4', 'stroke-width': 1.2 });
        const lbls = svg('g', { style: 'pointer-events:none' }); g.append(lbls);
        grps.forEach(b => {
          const s = narrow && b.v >= 10 ? String(Math.round(b.v)) : b.v.toFixed(1), w = tw(s, 11, true) + 4;   // narrow slots are too tight for decimals
          R(lbls, b.xc - w / 2, b.y - 15, w, 13, { fill: 'var(--panel)', opacity: 0.9, rx: 2 });
          T(lbls, b.xc, b.y - 5, s, { mono: true, anchor: 'middle', fill: b.cur ? 'var(--ink)' : null });
        });
        const hit = (x0, x1, yy) => boxes.some(bx => bx.x1 > x0 && bx.x0 < x1 && Math.abs(bx.y - yy) < 12) || yy < 12;
        const cands = [[PR - 2 - lw, ym - 5], [PL + 6, ym - 5], [PR - 2 - lw, ym + 14], [PL + 6, ym + 14]];
        const [lx0, ly] = cands.find(c => !hit(c[0], c[0] + lw, c[1])) || cands[0];
        R(g, lx0, ly - 10, lw, 13, { fill: 'var(--panel)', opacity: 0.92, rx: 2 });
        T(g, lx0 + lw - 4, ly, lab, { mono: true, anchor: 'end', fill: 'var(--ink)' });
      }
      function hoverBar(i) {
        barEls.forEach((b, j) => { b.rect.setAttribute('stroke', j === i ? 'var(--ink)' : 'none'); b.rect.setAttribute('opacity', j === i || b.cur ? 1 : 0.7); });
        if (i < 0) { chartInfo.textContent = infoDefault(); return; }
        const b = barEls[i];
        chartInfo.textContent = `${b.bar.name} · λ = ${b.bar.lambda} nm · NA = ${f2(b.bar.na)} · k1 = ${f2(st.k1)} → ${nm(b.v)} half-pitch (${nm(2 * b.v)} pitch). Click to load it into the sliders.`;
      }
      function selectBar(i) {
        const bar = GEN_BARS[i]; st.src = SOURCES.find(s => s.id === bar.src); st.na = bar.na; srcSel.value = st.src.id; setupNa(); update();
      }

      // ---------- "what needs what" table ----------
      function paintTable() {
        tbody.replaceChildren(); const cd = curCD();
        NEEDS.forEach(r => {
          const ratio = cd / r.hp, ok = ratio <= 1.02;
          tbody.append(h('tr', { style: ok ? { background: 'var(--panel2)' } : null },
            h('td', null, r.hp + ' nm'), h('td', null, r.what),
            h('td', { style: { color: ok ? 'var(--ok)' : 'var(--muted)' } }, ok ? '✓ single exposure' : '✗ ' + ratio.toFixed(1) + '× too coarse for one exposure')));
        });
        tbody.append(h('tr', null, h('td', { colspan: 3, style: { color: 'var(--ink)' } }, `your setting: ${nm(cd)} half-pitch in one exposure (${st.src.name}, NA ${f2(st.na)}, k1 ${f2(st.k1)})`)));
      }

      // ---------- state / events ----------
      function setupNa() { const s = st.src; srcSel.value = s.id; naSlider.min = s.naMin; naSlider.max = s.naMax; naSlider.step = s.step || 0.01; naSlider.value = st.na; }
      function update() {
        const cd = curCD(), dof = curDOF(), beams = orders().filter(o => o.pass).length;
        lamOut.textContent = 'λ = ' + st.src.lambda + ' nm'; naOut.textContent = f2(st.na); k1Out.textContent = f2(st.k1);
        stCD.textContent = nm(cd); stPitch.textContent = nm(2 * cd);
        stDOF.textContent = nm(dof); stDOFl.textContent = 'DOF, total (±' + nm(dof / 2) + ')';
        stBeams.textContent = beams === 3 ? '3 (−1, 0, +1)' : '2 (0, +1)';
        stCon.textContent = Math.round(contrast() * 100) + ' %';
        chartHead.textContent = 'CD across generations at k1 = ' + f2(st.k1);
        chartInfo.textContent = infoDefault();
        paintOptics(); paintChart(); paintTable();
      }
      srcSel.addEventListener('change', () => { st.src = SOURCES.find(s => s.id === srcSel.value) || SOURCES[4]; st.na = st.src.naDefault; setupNa(); update(); });
      naSlider.addEventListener('input', () => { st.na = parseFloat(naSlider.value); update(); });
      k1Slider.addEventListener('input', () => { st.k1 = parseFloat(k1Slider.value); update(); });

      el.append(controls, readout, formula,
        head5('Inside the scanner: from illumination to printed lines'), optics,
        h('div', { class: 'w-note' }, 'Reading the drawing: the illuminator lights the reticle\'s chrome grating, which diffracts the light into numbered beams (orders). Only beams that land inside the lens pupil, the gap that widens with NA, reach the wafer; there they overlap and interfere, and that interference pattern is the aerial image. The resist switches where the intensity crosses its threshold, so lines of resist survive where the image is dark; if the image swing is smaller than the resist\'s switching band (grey), no edge forms and the pattern is lost. Below k1 = 0.5 the illumination is tilted (dipole) so the 0th and +1 orders both fit while the −1 is thrown away; at k1 = 0.25 both sit on the pupil edges and the contrast collapses. The green band is the depth of focus, drawn to the same scale as the ~100 nm resist.'),
        chartHead, chart, chartInfo,
        head5('What needs what'), h('div', { style: { overflowX: 'auto' } }, table),
        h('div', { class: 'w-note' }, 'k1 = 0.25 is the hard physical floor for single-exposure two-beam imaging; production 193i runs k1 ≈ 0.28–0.30. k2 = 0.6 follows the module\'s worked example (0.6 × 193.4 / 1.35² ≈ 64 nm). EUV NA is a hardware choice, so its slider snaps between 0.33 and 0.55 (High-NA). The image contrast is illustrative (a source pole of radius 0.25 NA spilling over the pupil edge), not a partially coherent image simulation.'));

      setupNa(); update();
      // width-aware SVGs: the viewBox width tracks the container so 1 unit = 1 px and text sizes are real pixels
      function onResize() { const w = measure(); if (w === W) return; W = w; narrow = W < 560; paintOptics(); paintChart(); }
      const ro = new ResizeObserver(() => { cancelAnimationFrame(roRaf); roRaf = requestAnimationFrame(onResize); });
      ro.observe(el);
      ctx.onTheme(() => { paintOptics(); paintChart(); });
      return () => { ro.disconnect(); cancelAnimationFrame(roRaf); };
    }
  });
})();
