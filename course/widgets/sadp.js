/* Widget: sadp — "Self-Aligned Double (and Quadruple) Patterning" (Module 07) */
(function () {
  'use strict';
  const ROUTES = [
    { key: 'sadp', name: 'SADP', steps: '≈ 28–32', exposures: 2, cycle: '2–3 days' },
    { key: 'saqp', name: 'SAQP', steps: '≈ 40–45', exposures: 3, cycle: '3–5 days' },
    { key: 'euv', name: 'Single EUV exposure', steps: '≈ 15', exposures: 1, cycle: '~ 1 day' },
  ];
  const MH = 50, RH = 35;                                   // mandrel film / resist heights (nm)
  const HMH = 16, FILMH = 52, TOPBAND = 80, PADB = 6;       // px
  const MONO_W = 7.2, SANS_W = 6.8;                         // glyph width estimates at 12 px
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Every step's geometry (nm) is derived once from P; later steps reuse earlier positions in place.
  function geom(saqp, P, winNm) {
    const m1 = saqp ? 3 * P / 8 : P / 4, t1 = saqp ? P / 8 : P / 4, t2 = P / 8;
    const centers = [];
    for (let c = P / 2; c - (m1 / 2 + t1 + t2) < winNm; c += P) centers.push(c);   // only mandrels that reach into the window
    const sp1 = [], sp2 = [];
    centers.forEach(c => {                     // spacer 1: a fillet on each mandrel wall
      sp1.push({ c, wall: c - m1 / 2, dir: -1, x0: c - m1 / 2 - t1, x1: c - m1 / 2 });
      sp1.push({ c, wall: c + m1 / 2, dir: 1, x0: c + m1 / 2, x1: c + m1 / 2 + t1 });
    });
    sp1.forEach(l => {                         // spacer 2: fillet on the sharp side, remnant on the rounded side
      const d = -l.dir, xw = l.wall + l.dir * t1;
      sp2.push({ kind: 'fil', wall: l.wall, dir: d, x0: Math.min(l.wall, l.wall + d * t2), x1: Math.max(l.wall, l.wall + d * t2) });
      sp2.push({ kind: 'rem', wall: l.wall, dir: l.dir, x0: Math.min(xw, xw + l.dir * t2), x1: Math.max(xw, xw + l.dir * t2) });
    });
    const lines = (saqp ? sp2 : sp1).slice().sort((a, b) => a.x0 - b.x0);
    return { P, m1, t1, t2, centers, sp1, sp2, lines, finalPitch: saqp ? P / 4 : P / 2, lineW: saqp ? t2 : t1 };
  }

  function buildSteps(saqp, P, f) {
    const m1 = saqp ? 3 * P / 8 : P / 4, t1 = saqp ? P / 8 : P / 4, t2 = P / 8, S = [];
    S.push({ kind: 'litho', title: 'Mandrel lithography', desc: `Resist lines are printed at the relaxed litho pitch P = ${f(P)} nm (lines P/2 = ${f(P / 2)} nm wide) on a sacrificial amorphous-carbon film, the future mandrel. This is the only exposure that defines the pattern.` });
    S.push({ kind: 'mandrel', title: 'Mandrel etch + trim', desc: saqp
      ? `An anisotropic (straight-down) plasma etch copies the resist into the carbon film, then a trim etch narrows each mandrel to m₁ = 3P/8 = ${f(m1)} nm — the width that lands the four lines from each mandrel on one uniform pitch after two spacer cycles.`
      : `An anisotropic (straight-down) plasma etch copies the resist into the carbon film, then a trim etch narrows each mandrel to m = P/4 = ${f(m1)} nm — narrower than the scanner could print directly.` });
    S.push({ kind: 'ald1', title: 'Conformal spacer ALD', desc: `Atomic layer deposition coats every surface — floor, sidewalls and mandrel tops — with a SiN film of one thickness, t${saqp ? '₁' : ''} = P/${saqp ? 8 : 4} = ${f(t1)} nm${saqp ? ', the width of the intermediate lines (mandrel 2)' : ', the final SADP line width'}. Deposition, not lithography, sets this dimension.` });
    S.push({ kind: 'etch1', title: 'Spacer etch-back', desc: 'An anisotropic etch removes one film thickness from every horizontal surface (mandrel tops and the floor). On the sidewalls the film is only t thick sideways, so it survives as a spacer on each mandrel wall.' });
    S.push({ kind: 'pull1', title: saqp ? 'Mandrel 1 pull' : 'Mandrel pull', desc: saqp
      ? `The carbon mandrel is removed (O₂ ash), leaving two spacer-1 lines per mandrel: ${f(t1)} nm wide at P/2 = ${f(P / 2)} nm pitch. In SAQP these are not the final lines — they now serve as mandrel 2.`
      : `The carbon mandrel is removed (O₂ ash), leaving two spacers per mandrel: pitch halved to P/2 = ${f(P / 2)} nm. The spaces alternate — A = mandrel CD (litho-set) and B = P − m − 2t — both ${f(m1)} nm here; if m drifts, alternate spaces "walk" apart.` });
    if (saqp) {
      S.push({ kind: 'ald2', title: 'Spacer 2 ALD (SAQP)', desc: `A second conformal ALD film, t₂ = P/8 = ${f(t2)} nm, coats the spacer-1 lines; the ${f(P / 2 - t1)} nm gaps between them narrow to ${f(P / 2 - t1 - 2 * t2)} nm but stay open.` });
      S.push({ kind: 'etch2', title: 'Spacer 2 etch-back', desc: 'The straight-down etch again strips the horizontal film, leaving a spacer-2 fillet on both sides of every spacer-1 line — four lines per original mandrel.' });
      S.push({ kind: 'pull2', title: 'Mandrel 2 pull', desc: `Spacer 1 (SiN) is etched selectively against spacer 2 (SiO₂), leaving the spacer-2 lines exactly where they stood: ${f(t2)} nm lines at P/4 = ${f(P / 4)} nm pitch, a quarter of the litho pitch.` });
    }
    const fp = saqp ? P / 4 : P / 2, w = saqp ? t2 : t1;
    S.push({ kind: 'transfer', title: 'Pattern transfer etch', desc: `The spacers are now the etch mask: the TiN hard mask and the target film beneath it are etched wherever no spacer stands, printing ${f(w)} nm lines at ${f(fp)} nm pitch. Lithography never defined this CD.` });
    S.push({ kind: 'cut', title: 'Cut mask', desc: 'Seen from above, each spacer is a closed loop — it wrapped around both ends of its mandrel. A cut mask (a second litho exposure, counted in the table) removes the loop ends and any segment where the design needs a line-end.' });
    return S;
  }

  window.registerWidget('sadp', {
    title: 'Self-Aligned Double (and Quadruple) Patterning',
    caption: 'Step through mandrel litho → spacer ALD → etch-back → mandrel pull and watch the pitch halve by deposition, not by a second exposure. Drag P to change the litho pitch; toggle SAQP to halve it again.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const st = { P: 80, saqp: false, i: 0, W: 0 };
      const uid = 'sadp' + Math.random().toString(36).slice(2, 8);
      const f = n => fmt(n, Number.isInteger(n) ? 0 : 1);

      const pSlider = h('input', { type: 'range', min: 76, max: 160, step: 4, value: st.P });
      const pOut = h('output');
      const saqpBox = h('input', { type: 'checkbox' });
      const saqpOut = h('output');
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Litho pitch P'), pSlider, pOut),
        h('label', { class: 'w-ctl', style: { minWidth: '140px', flex: '0 0 auto' } }, h('span', null, 'SAQP (repeat once more)'), saqpBox, saqpOut));

      const dots = h('div', { class: 'w-step-nav', role: 'tablist' });
      const counter = h('span', { class: 'count' });
      const prevBtn = h('button', { class: 'w-btn' }, 'Prev');
      const nextBtn = h('button', { class: 'w-btn' }, 'Next');
      const navBtns = h('span', { style: { display: 'inline-flex', gap: '8px', whiteSpace: 'nowrap' } }, prevBtn, nextBtn);
      const stepTitle = h('div', { class: 'w-step-title' });
      const stepDesc = h('div', { class: 'w-step-desc', style: { minHeight: '2.8em' } });
      const cross = svg('svg', { class: 'w-svg', viewBox: '0 0 700 300', role: 'img', 'aria-label': 'Cross-section of the multi-patterning flow' });
      const legend = h('div', { class: 'w-legend' });

      const stLitho = h('b'), stSadp = h('b'), stSaqp = h('b'), stLine = h('b'), stLineLbl = h('span');
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, stLitho, h('span', null, 'litho pitch P')),
        h('div', { class: 'w-stat' }, stSadp, h('span', null, 'after SADP (P/2)')),
        h('div', { class: 'w-stat' }, stSaqp, h('span', null, 'after SAQP (P/4)')),
        h('div', { class: 'w-stat' }, stLine, stLineLbl));
      const formula = h('div', { class: 'w-formula' }, 'final pitch = P / 2ⁿ  (n = 1 SADP, n = 2 SAQP)   ·   line width = ALD thickness t = P / 2ⁿ⁺¹');
      const table = h('table');

      function layout() {
        const W = st.W || el.clientWidth || 700, compact = W < 480, LW = compact ? 80 : 150;
        const s = compact ? 0.95 : clamp((W - LW) / 340, 1.15, 2), XW = W - LW;
        const tMax = st.saqp ? st.P / 8 : st.P / 4;
        const H = Math.round(TOPBAND + (MH + Math.max(RH, tMax)) * s + HMH + FILMH + PADB);
        return { W, compact, LW, s, XW, H, B: H - PADB - FILMH - HMH, winNm: XW / s };
      }

      function arrow(g, x1, y1, x2, y2, color) {
        g.append(svg('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': 1.5, 'stroke-opacity': 0.85 }));
        const a = Math.atan2(y2 - y1, x2 - x1), hs = 6;
        const p = [[x2, y2], [x2 - hs * Math.cos(a - 0.5), y2 - hs * Math.sin(a - 0.5)], [x2 - hs * Math.cos(a + 0.5), y2 - hs * Math.sin(a + 0.5)]];
        g.append(svg('polygon', { points: p.map(q => q.map(v => v.toFixed(1)).join(',')).join(' '), fill: color, 'fill-opacity': 0.85 }));
      }
      const T = (x, y, text, o) => { o = o || {}; return svg('text', { x, y, 'font-family': o.mono ? 'var(--mono)' : 'var(--sans)', 'font-size': 12, fill: o.fill || 'var(--muted)', 'text-anchor': o.anchor || 'start', 'font-weight': o.weight || 400 }, text); };
      const R = (x, y, w, hh, fill, extra) => svg('rect', Object.assign({ x, y, width: w, height: hh, fill }, extra || {}));

      function draw(step, G, L) {
        cross.innerHTML = '';
        cross.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
        if (step.kind === 'cut') { drawPlan(G, L); return; }
        const { s, XW, B, compact, W } = L, k = step.kind, saqp = st.saqp, pick = (a, b) => compact ? b : a;
        const X = nm => nm * s, m1 = X(G.m1), t1 = X(G.t1), t2 = X(G.t2), mh = X(MH), rh = X(RH), stubH = mh * 0.55, depth = 34;
        const fillet = (xw, dir, t, hgt) => `M${xw},${B}V${B - hgt}A${t},${t},0,0,${dir > 0 ? 1 : 0},${xw + dir * t},${B - hgt + t}V${B}Z`;
        const remnant = (xr, dir, ta, tb, hgt) => { const xw = xr + dir * ta, cy = B - hgt + ta, Rr = ta + tb; return `M${xw + dir * tb},${B}V${cy + tb}A${Rr},${Rr},0,0,${dir > 0 ? 0 : 1},${xr},${B - hgt}A${ta},${ta},0,0,${dir > 0 ? 1 : 0},${xw},${cy}V${B}Z`; };
        const dilRect = (x0, x1, hgt, t) => `M${x0 - t},${B}V${B - hgt}A${t},${t},0,0,1,${x0},${B - hgt - t}H${x1}A${t},${t},0,0,1,${x1 + t},${B - hgt}V${B}Z`;
        const dilFillet = (xw, dir, ta, tb, hgt) => { const yT = B - hgt, Rr = ta + tb, fl = dir > 0 ? 1 : 0; return `M${xw - dir * tb},${B}V${yT}A${tb},${tb},0,0,${fl},${xw},${yT - tb}A${Rr},${Rr},0,0,${fl},${xw + dir * Rr},${yT + ta}V${B}Z`; };
        const SP1 = 'var(--accent2)', SP2 = 'var(--ok)', MAN = 'var(--si)', RES = 'var(--accent)', HM = 'var(--cu)';
        const RC = (x, y, w, hh, fill, extra) => { const x0 = Math.max(0, x), x1 = Math.min(XW, x + w); return x1 > x0 ? R(x0, y, x1 - x0, hh, fill, extra) : null; };
        const add = (g, ...nodes) => nodes.forEach(n => n && g.append(n));
        const cid = uid + '-clip';
        cross.append(svg('defs', null, svg('clipPath', { id: cid }, R(0, 0, XW, B, undefined))));
        const bands = svg('g'), feat = svg('g', { 'clip-path': `url(#${cid})` }), ann = svg('g'), lab = svg('g');
        cross.append(bands, feat, ann, lab);
        const dims = [], labels = [], leg = [];
        const filmOp = { 'fill-opacity': 0.14 };
        // fully visible reference features
        const c0 = G.centers.find(c => c > 0), c1 = c0 + G.P;
        const cL = G.centers.filter(c => X(c + G.m1 / 2 + G.t1 + (k === 'ald2' || k === 'etch2' || k === 'pull2' ? G.t2 : 0)) <= XW - 2).pop();
        const featTopNm = { litho: MH + RH, mandrel: MH, ald1: MH + G.t1, etch1: MH, pull1: MH, ald2: MH + G.t2, etch2: MH, pull2: MH, transfer: MH * 0.55 }[k];
        const featTop = B - X(featTopNm);

        // ---- bands: target film + hard mask
        if (k !== 'transfer') {
          bands.append(R(0, B + HMH, XW, FILMH, 'var(--ink)', filmOp), R(0, B, XW, HMH, HM));
          labels.push({ text: ['target film (low-k / Si)', 'target film'], ax: XW - 8, ay: B + HMH + FILMH / 2, color: 'var(--ink)' });
        } else {
          bands.append(R(0, B + HMH + depth, XW, FILMH - depth, 'var(--ink)', filmOp));
          G.lines.forEach(l => { const x0 = X(l.x0), w = X(l.x1 - l.x0); add(bands, RC(x0, B + HMH, w, depth, 'var(--ink)', filmOp), RC(x0, B, w, HMH, HM)); });
          labels.push({ text: ['target film (low-k / Si)', 'target film'], ax: XW - 8, ay: B + HMH + depth + (FILMH - depth) / 2, color: 'var(--ink)' });
        }
        labels.push({ text: ['hard mask (TiN)', 'hard mask'], ax: XW - 8, ay: B + HMH / 2, color: HM });
        leg.push(['hard mask (TiN)', HM], ['target film', 'var(--ink)', 0.35]);

        const mandrels = (ghost) => G.centers.forEach(c => add(feat, ghost
          ? RC(X(c) - m1 / 2, B - mh, m1, mh, 'none', { stroke: MAN, 'stroke-dasharray': '4 3', 'stroke-opacity': 0.7 })
          : RC(X(c) - m1 / 2, B - mh, m1, mh, MAN)));
        const sp1Fillets = (ghost) => G.sp1.forEach(l => feat.append(svg('path', { d: fillet(X(l.wall), l.dir, t1, mh), fill: ghost ? 'none' : SP1, stroke: ghost ? SP1 : 'none', 'stroke-dasharray': ghost ? '4 3' : null, 'stroke-opacity': 0.7 })));
        const sp2Shapes = () => G.sp2.forEach(l => feat.append(svg('path', { d: l.kind === 'fil' ? fillet(X(l.wall), l.dir, t2, mh) : remnant(X(l.wall), l.dir, t1, t2, mh), fill: SP2 })));
        const xr = X(cL + G.m1 / 2);                       // right wall of the last visible mandrel
        let capt = ['', ''], arrows = null, sub = '';

        if (k === 'litho') {
          feat.append(R(0, B - mh, XW, mh, MAN));
          G.centers.forEach(c => add(feat, RC(X(c - G.P / 4), B - mh - rh, X(G.P / 2), rh, RES)));
          labels.push({ text: ['resist (developed)', 'resist'], ax: X(cL), ay: B - mh - rh / 2, color: RES }, { text: ['mandrel film (a-C)', 'a-C film'], ax: XW - 8, ay: B - mh / 2, color: MAN });
          dims.push({ x1: X(c0), x2: X(c1), text: pick(`P = ${f(G.P)} nm (litho pitch)`, `P = ${f(G.P)} nm`) }, { x1: X(cL - G.P / 4), x2: X(cL + G.P / 4), text: `P/2 = ${f(G.P / 2)} nm` });
          capt = ['193i exposure through the photomask, then develop', '193i exposure + develop']; arrows = { color: RES, tilt: 0 };
          leg.push(['resist', RES], ['mandrel film (a-C)', MAN]);
        } else if (k === 'mandrel') {
          mandrels(false);
          labels.push({ text: ['mandrel (a-C)', 'mandrel'], ax: X(cL), ay: B - mh / 2, color: MAN });
          dims.push({ x1: X(c0), x2: X(c1), text: `P = ${f(G.P)} nm` }, { x1: X(cL) - m1 / 2, x2: X(cL) + m1 / 2, text: saqp ? `m₁ = 3P/8 = ${f(G.m1)} nm` : pick(`m = P/4 = ${f(G.m1)} nm (trimmed)`, `m = P/4 = ${f(G.m1)} nm`) });
          capt = ['anisotropic plasma etch copies the resist into the carbon, then a trim etch narrows it', 'anisotropic etch, then trim']; arrows = { color: 'var(--bad)', tilt: 0 };
          leg.push(['mandrel (a-C)', MAN]);
        } else if (k === 'ald1') {
          feat.append(R(0, B - t1, XW, t1, SP1));
          G.centers.forEach(c => feat.append(svg('path', { d: dilRect(X(c) - m1 / 2, X(c) + m1 / 2, mh, t1), fill: SP1 })));
          mandrels(false);
          labels.push({ text: ['spacer film (SiN, ALD)', 'SiN film'], ax: X(cL), ay: B - mh - t1 / 2, color: SP1 }, { text: ['mandrel (a-C)', 'mandrel'], ax: X(cL), ay: B - mh * 0.45, color: MAN });
          dims.push({ x1: xr, x2: xr + t1, text: `t${saqp ? '₁' : ''} = P/${saqp ? 8 : 4} = ${f(G.t1)} nm` });
          capt = ['ALD precursor pulses reach every surface: one thickness on floor, walls and tops', 'ALD: same thickness everywhere']; arrows = { color: SP1, tilt: 1 };
          leg.push(['mandrel (a-C)', MAN], [saqp ? 'spacer 1 (SiN, ALD)' : 'spacer (SiN, ALD)', SP1]);
        } else if (k === 'etch1' || k === 'pull1') {
          mandrels(k === 'pull1'); sp1Fillets(false);
          labels.push({ text: k === 'pull1' ? ['mandrel removed', 'removed'] : ['mandrel (a-C)', 'mandrel'], ax: X(cL), ay: B - mh * 0.7, color: MAN },
            { text: saqp ? ['spacer 1 (SiN)', 'spacer 1'] : ['spacer (SiN)', 'spacer'], ax: xr + t1 / 2, ay: B - mh * 0.35, color: SP1 });
          if (k === 'etch1') {
            dims.push({ x1: xr, x2: xr + t1, text: `t${saqp ? '₁' : ''} = ${f(G.t1)} nm` });
            capt = ['anisotropic etch-back: ions travel straight down, removing t from every horizontal surface', 'etch-back: ions straight down']; arrows = { color: 'var(--bad)', tilt: 0 };
          } else {
            dims.push({ x1: X(c0 + G.m1 / 2 + G.t1 / 2), x2: X(c1 - G.m1 / 2 - G.t1 / 2), text: pick(`P/2 = ${f(G.P / 2)} nm pitch`, `P/2 = ${f(G.P / 2)} nm`) });
            const gapX = [X(c0 + G.m1 / 2 + G.t1), X(c1 - G.m1 / 2 - G.t1)];
            if (saqp) { if (!compact) dims.push({ x1: gapX[0], x2: gapX[1], text: `gap = 3P/8 = ${f(G.P / 2 - G.t1)} nm` }); }
            else dims.push({ x1: X(c0 - G.m1 / 2), x2: X(c0 + G.m1 / 2), text: pick(`A = m = ${f(G.m1)} nm`, `A = ${f(G.m1)} nm`) }, { x1: gapX[0], x2: gapX[1], text: pick(`B = P − m − 2t = ${f(G.P - G.m1 - 2 * G.t1)} nm`, `B = ${f(G.P - G.m1 - 2 * G.t1)} nm`) });
            capt = ['mandrel pull: O₂ plasma ashes the carbon (it leaves as CO₂); the SiN spacers stay', 'O₂ ash removes the carbon']; arrows = { color: MAN, tilt: 0, up: true }; sub = 'selectivity: the O₂ plasma attacks carbon but not SiN, so the spacers keep their ALD-set width';
          }
          leg.push([k === 'pull1' ? 'mandrel (removed)' : 'mandrel (a-C)', MAN], [saqp ? 'spacer 1 (SiN)' : 'spacer (SiN)', SP1]);
        } else if (k === 'ald2') {
          feat.append(R(0, B - t2, XW, t2, SP2));
          G.sp1.forEach(l => feat.append(svg('path', { d: dilFillet(X(l.wall), l.dir, t1, t2, mh), fill: SP2 })));
          sp1Fillets(false);
          labels.push({ text: ['spacer-2 film (SiO₂)', 'SiO₂ film'], ax: xr + t1 / 2, ay: B - mh - t2 / 2, color: SP2 }, { text: ['spacer 1 = mandrel 2', 'mandrel 2'], ax: xr + t1 / 2, ay: B - mh * 0.45, color: SP1 });
          dims.push({ x1: xr + t1, x2: xr + t1 + t2, text: `t₂ = P/8 = ${f(G.t2)} nm` }, { x1: X(c0 + G.m1 / 2 + G.t1 + G.t2), x2: X(c1 - G.m1 / 2 - G.t1 - G.t2), text: `gap ${f(G.P / 2 - G.t1 - 2 * G.t2)} nm` });
          capt = ['second ALD film: the same thickness on every surface of the spacer-1 lines', 'ALD film 2, same thickness everywhere']; arrows = { color: SP2, tilt: 1 };
          leg.push(['spacer 1 = mandrel 2', SP1], ['spacer 2 (SiO₂, ALD)', SP2]);
        } else if (k === 'etch2' || k === 'pull2') {
          sp2Shapes(); sp1Fillets(k === 'pull2');
          labels.push({ text: k === 'pull2' ? ['spacer 1 removed', 'removed'] : ['spacer 1 = mandrel 2', 'mandrel 2'], ax: xr + t1 / 2, ay: B - mh * 0.7, color: SP1 },
            { text: k === 'pull2' ? ['spacer 2 — final lines', 'final lines'] : ['spacer 2 (SiO₂)', 'spacer 2'], ax: xr + t1 + t2 / 2, ay: B - mh * 0.3, color: SP2 });
          dims.push({ x1: X(c0 + G.m1 / 2 - G.t2 / 2), x2: X(c0 + G.m1 / 2 + G.t1 + G.t2 / 2), text: pick(`P/4 = ${f(G.P / 4)} nm pitch`, `P/4 = ${f(G.P / 4)} nm`) }, { x1: xr + t1, x2: xr + t1 + t2, text: `t₂ = ${f(G.t2)} nm` });
          if (k === 'etch2') { capt = ['anisotropic etch-back again: only the vertical parts of film 2 survive', 'etch-back 2: ions straight down']; arrows = { color: 'var(--bad)', tilt: 0 }; }
          else { capt = ['spacer-1 pull: SiN is etched selectively, the SiO₂ lines stay where they are', 'spacer 1 removed, lines stay']; arrows = { color: SP1, tilt: 0, up: true }; sub = 'selectivity: a SiN etch that barely touches SiO₂ — two different ALD materials make this possible'; }
          leg.push([k === 'pull2' ? 'spacer 1 (removed)' : 'spacer 1 = mandrel 2', SP1], ['spacer 2 (SiO₂)', SP2]);
        } else if (k === 'transfer') {
          const SPC = saqp ? SP2 : SP1;
          G.lines.forEach(l => add(feat, RC(X(l.x0), B - stubH, X(l.x1 - l.x0), stubH, SPC, { rx: 2 })));
          const vis = G.lines.filter(l => X(l.x1) <= XW - 2 && l.x0 >= 0), last = vis[vis.length - 1], prev = vis[vis.length - 2];
          labels.push({ text: ['spacer stub (eroded)', 'spacer stub'], ax: X((last.x0 + last.x1) / 2), ay: B - stubH / 2, color: SPC }, { text: ['etched trench', 'trench'], ax: X((prev.x1 + last.x0) / 2), ay: B + HMH + depth * 0.45, color: 'var(--line2)' });
          const l0 = vis[0], l1 = vis[1];
          dims.push({ x1: X((l0.x0 + l0.x1) / 2), x2: X((l1.x0 + l1.x1) / 2), text: pick(`final pitch = ${f(G.finalPitch)} nm`, `${f(G.finalPitch)} nm pitch`) }, { x1: X(last.x0), x2: X(last.x1), text: `line = t = ${f(G.lineW)} nm` });
          capt = ['anisotropic etch: the spacers mask the hard mask and the target film beneath', 'etch through hard mask + film']; arrows = { color: 'var(--bad)', tilt: 0 }; sub = 'the etch chemistry attacks TiN and the film but only slowly erodes the spacer (selectivity)';
          leg.push([saqp ? 'spacer 2 (SiO₂)' : 'spacer (SiN)', SPC]);
        }

        // ---- dimension bars, stacked upward in rows that never overlap
        const rows = [];
        dims.forEach(d => {
          const tw = d.text.length * MONO_W + 6, cx = clamp((d.x1 + d.x2) / 2, tw / 2 + 2, XW - tw / 2 - 2);
          const ext = [Math.min(d.x1, cx - tw / 2), Math.max(d.x2, cx + tw / 2)];
          let r = 0; while (rows[r] && rows[r].some(e => ext[0] < e[1] + 4 && ext[1] > e[0] - 4)) r++;
          (rows[r] = rows[r] || []).push(ext);
          const y = featTop - 12 - 22 * r;
          ann.append(svg('line', { x1: d.x1, y1: y, x2: d.x2, y2: y, stroke: 'var(--muted)' }), svg('line', { x1: d.x1, y1: y - 3, x2: d.x1, y2: y + 3, stroke: 'var(--muted)' }), svg('line', { x1: d.x2, y1: y - 3, x2: d.x2, y2: y + 3, stroke: 'var(--muted)' }), T(cx, y - 5, d.text, { mono: true, anchor: 'middle', fill: 'var(--ink)' }));
        });
        const dimTop = rows.length ? featTop - 12 - 22 * (rows.length - 1) - 18 : featTop - 8;
        // ---- process annotation: caption + arrows in the band above
        const cap = capt[0].length * SANS_W > W - 8 ? capt[1] : capt[0];
        ann.append(T(4, 14, cap, { fill: 'var(--ink)', weight: 600 }));
        const showSub = sub && dimTop >= 70 && sub.length * 5.6 < W - 8;
        if (showSub) ann.append(T(4, 31, sub, {}));
        if (arrows) {
          const yB = dimTop - 6, yA = Math.max(showSub ? 40 : 24, yB - 96), len = yB - yA;
          if (len >= 16) for (let i = 0, x = 22; x < XW - 14; i++, x += compact ? 46 : 58) {
            const dx = arrows.tilt ? ((i % 3) - 1) * len * 0.45 : 0;
            if (arrows.up) arrow(ann, x, yB, x, yA + 4, arrows.color); else arrow(ann, x - dx, yA, x, yB, arrows.color);
          }
        }
        // ---- in-place layer labels in the right-hand column with leader lines
        labels.sort((a, b) => a.ay - b.ay);
        let ly = 0;
        labels.forEach(l => { l.y = Math.max(l.ay, ly + 16); ly = l.y; });
        labels.forEach(l => {
          lab.append(svg('polyline', { points: `${l.ax.toFixed(1)},${l.ay.toFixed(1)} ${XW + 8},${l.y.toFixed(1)} ${XW + 12},${l.y.toFixed(1)}`, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1 }));
          lab.append(svg('circle', { cx: l.ax, cy: l.ay, r: 2.6, fill: l.color, stroke: 'var(--panel)', 'stroke-width': 1 }));
          lab.append(T(XW + 15, l.y + 4, l.text[compact ? 1 : 0], { fill: 'var(--ink)' }));
        });
        setLegend(leg);
      }

      function drawPlan(G, L) {
        const { W, H, compact } = L, saqp = st.saqp, P = G.P, nM = saqp ? 2 : 3;
        const y0 = 30, y1 = H - 40, s2 = Math.min(L.s, (y1 - y0) / (nM * P));
        const xm0 = 44, xm1 = W - 44, bmax = G.m1 / 2 + G.t1 + (saqp ? G.t2 : 0);
        const stadium = (yc, d) => { const hh = (G.m1 / 2 + d) * s2, x0 = xm0 - d * s2, x1 = xm1 + d * s2; return `M${x0 + hh},${yc - hh}H${x1 - hh}A${hh},${hh},0,0,1,${x1 - hh},${yc + hh}H${x0 + hh}A${hh},${hh},0,0,1,${x0 + hh},${yc - hh}Z`; };
        const ring = (yc, a, b, fill, extra) => svg('path', Object.assign({ d: stadium(yc, b - G.m1 / 2) + stadium(yc, a - G.m1 / 2), fill, 'fill-rule': 'evenodd' }, extra || {}));
        cross.append(T(4, 14, compact ? `Plan view: lines run left → right at ${f(G.finalPitch)} nm pitch` : `Plan view (looking down on the wafer): the lines run left → right at the final ${f(G.finalPitch)} nm pitch`, { fill: 'var(--ink)', weight: 600 }));
        const off = y0 + (y1 - y0 - nM * P * s2) / 2, ycs = [];
        for (let i = 0; i < nM; i++) {
          const yc = off + (i + 0.5) * P * s2; ycs.push(yc);
          cross.append(svg('path', { d: stadium(yc, 0), fill: 'var(--si)', 'fill-opacity': 0.12, stroke: 'var(--si)', 'stroke-dasharray': '4 3', 'stroke-opacity': 0.6 }));
          if (saqp) {
            cross.append(ring(yc, G.m1 / 2, G.m1 / 2 + G.t1, 'var(--accent2)', { 'fill-opacity': 0.15, stroke: 'var(--accent2)', 'stroke-dasharray': '4 3', 'stroke-opacity': 0.6 }));
            cross.append(ring(yc, G.m1 / 2 - G.t2, G.m1 / 2, 'var(--ok)'), ring(yc, G.m1 / 2 + G.t1, G.m1 / 2 + G.t1 + G.t2, 'var(--ok)'));
          } else cross.append(ring(yc, G.m1 / 2, G.m1 / 2 + G.t1, 'var(--accent2)'));
        }
        const boxTop = ycs[0] - bmax * s2 - 6, boxBot = ycs[nM - 1] + bmax * s2 + 6, cutW = bmax * s2 + 16;
        const box = (x, y, w, hh) => cross.append(R(x, y, w, hh, 'var(--bad)', { 'fill-opacity': 0.22, stroke: 'var(--bad)', 'stroke-dasharray': '4 3', 'stroke-width': 1.2 }));
        box(xm0 - bmax * s2 - 8, boxTop, cutW, boxBot - boxTop);
        box(xm1 - 8, boxTop, cutW, boxBot - boxTop);
        const ym = ycs[Math.min(1, nM - 1)], mw = Math.max(14, 3 * G.lineW * s2);
        box(xm0 + (xm1 - xm0) * 0.6, ym - bmax * s2 - 4, mw, G.lineW * s2 + 8);
        cross.append(T(xm0 + (xm1 - xm0) * 0.6 + mw / 2, ym - bmax * s2 - 9, 'line-end cut', { fill: 'var(--bad)', anchor: 'middle' }));
        cross.append(T(4, H - 22, compact ? 'each spacer is a loop around its mandrel (ghost)' : 'loop ends: each spacer wrapped around both ends of its mandrel (dashed ghost), so every line is a closed loop', {}));
        cross.append(T(4, H - 7, compact ? 'red = cut mask (2nd litho exposure) removes these' : 'red boxes = cut mask, a second litho exposure, removes the loop ends and any segment where the design needs a line-end', { fill: 'var(--bad)' }));
        setLegend(saqp ? [['mandrel 1 (removed)', 'var(--si)', 0.3], ['spacer 1 (removed)', 'var(--accent2)', 0.3], ['spacer 2 — final lines', 'var(--ok)'], ['cut mask opening', 'var(--bad)', 0.4]]
          : [['mandrel (removed)', 'var(--si)', 0.3], ['spacer — final lines', 'var(--accent2)'], ['cut mask opening', 'var(--bad)', 0.4]]);
      }

      function setLegend(items) {
        legend.innerHTML = '';
        items.forEach(([name, color, op]) => legend.append(h('span', { class: 'w-legend-item' }, h('i', { style: { background: color, opacity: op == null ? 1 : op } }), name)));
      }

      function renderAll() {
        const steps = buildSteps(st.saqp, st.P, f);
        st.i = Math.min(st.i, steps.length - 1);
        dots.innerHTML = '';
        steps.forEach((s, idx) => dots.append(h('button', { class: 'w-step-dot' + (idx === st.i ? ' active' : idx < st.i ? ' done' : ''), 'aria-label': `Step ${idx + 1}: ${s.title}`, title: `Step ${idx + 1}: ${s.title}`,
          on: { click: () => { st.i = idx; renderAll(); }, mouseenter: e => { e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)'; e.currentTarget.style.transform = 'scale(1.25)'; }, mouseleave: e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; } } })));
        dots.append(counter, navBtns);
        counter.textContent = `Step ${st.i + 1} / ${steps.length}`;
        prevBtn.disabled = st.i === 0; nextBtn.disabled = st.i === steps.length - 1;
        const step = steps[st.i];
        stepTitle.textContent = `${step.title}`;
        stepDesc.textContent = step.desc;
        const L = layout();
        draw(step, geom(st.saqp, st.P, L.winNm), L);
        pOut.textContent = st.P + ' nm';
        saqpOut.textContent = st.saqp ? 'on' : 'off';
        stLitho.textContent = st.P + ' nm';
        stSadp.textContent = f(st.P / 2) + ' nm';
        stSaqp.textContent = f(st.P / 4) + ' nm';
        stLine.textContent = f(st.saqp ? st.P / 8 : st.P / 4) + ' nm';
        stLineLbl.textContent = st.saqp ? 'final line width (t₂ = P/8)' : 'final line width (t = P/4)';
        table.innerHTML = '';
        table.append(h('tr', null, h('th', null, 'Route'), h('th', null, 'Steps'), h('th', null, 'Exposures'), h('th', null, 'Cycle time')));
        ROUTES.forEach(r => {
          const on = (r.key === 'sadp' && !st.saqp) || (r.key === 'saqp' && st.saqp);
          table.append(h('tr', { style: on ? { background: 'var(--accent-soft)' } : null }, h('td', null, r.name + (on ? ' (current)' : '')), h('td', null, r.steps), h('td', null, r.exposures), h('td', null, r.cycle)));
        });
      }
      pSlider.addEventListener('input', () => { st.P = +pSlider.value; renderAll(); });
      saqpBox.addEventListener('change', () => { st.saqp = saqpBox.checked; st.i = 0; renderAll(); });
      prevBtn.addEventListener('click', () => { st.i = Math.max(0, st.i - 1); renderAll(); });
      nextBtn.addEventListener('click', () => { st.i = st.i + 1; renderAll(); });

      el.append(controls, readout, formula,
        h('div', { class: 'w-steps' }, dots, h('div', null, stepTitle, stepDesc), cross, legend),
        h('h5', { style: { margin: '16px 0 4px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' } }, 'Process cost: litho + etch + deposition steps vs. a single EUV exposure'),
        table,
        h('div', { class: 'w-note' }, 'SAQP step/exposure counts follow Module 07\'s worked example for one ~40 nm-pitch metal layer (≈ 40–45 steps, 3 DUV exposures, 3–5 days) versus a single EUV pass (≈ 15 steps, 1 exposure, ~1 day); SADP figures are this widget\'s estimate, removing one spacer cycle and one cut-mask color from that same flow. The slider stops at 76 nm, the tightest pitch a single 193i exposure prints (k₁ ≈ 0.27, NA 1.35); below that even the mandrel would need multi-patterning. The module prices the SAQP route at roughly $200–250 per layer versus $120–170 for EUV — EUV wins on cost, cycle time, and yield for layers this tight, which is why it was inserted first at exactly this pitch.'));

      // Draw in CSS pixels: the viewBox follows the container width so text is never scaled down.
      let roRaf = 0;
      const onResize = () => { const w = el.clientWidth; if (w && w !== st.W) { st.W = w; renderAll(); } };
      const ro = new ResizeObserver(() => { cancelAnimationFrame(roRaf); roRaf = requestAnimationFrame(onResize); });
      ro.observe(el);
      st.W = el.clientWidth || 700;
      renderAll();
      return () => { ro.disconnect(); cancelAnimationFrame(roRaf); };
    }
  });
})();
